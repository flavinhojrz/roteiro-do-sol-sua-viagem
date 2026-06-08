import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import process from "node:process";

type PlaceImageManifestItem = {
  slug: string;
  remoteUrl?: string;
  localFile?: string;
  fileName: string;
  altText: string;
  creditText: string;
  license: string;
  sourceUrl: string;
};

type PlaceRow = {
  id: string;
  slug: string;
  name: string;
};

const bucketName = "places";
const downloadAttempts = 4;
const imageDelayMs = 1_500;
const remoteUserAgent = "RoteiroDoSol/0.1 (development image importer)";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function assertStringField(item: Record<string, unknown>, field: keyof PlaceImageManifestItem) {
  const value = item[field];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest item precisa ter "${field}" preenchido.`);
  }

  return value.trim();
}

function getOptionalStringField(
  item: Record<string, unknown>,
  field: keyof PlaceImageManifestItem,
) {
  const value = item[field];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Manifest item precisa ter "${field}" preenchido quando informado.`);
  }

  return value.trim();
}

function parseManifest(fileContent: string) {
  const rawManifest = JSON.parse(fileContent) as unknown;

  if (!Array.isArray(rawManifest)) {
    throw new Error("O arquivo JSON precisa ser um array de imagens.");
  }

  return rawManifest.map((rawItem, index): PlaceImageManifestItem => {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      throw new Error(`Item ${index + 1} do manifesto precisa ser um objeto.`);
    }

    const item = rawItem as Record<string, unknown>;
    const parsedItem = {
      slug: assertStringField(item, "slug"),
      remoteUrl: getOptionalStringField(item, "remoteUrl"),
      localFile: getOptionalStringField(item, "localFile"),
      fileName: assertStringField(item, "fileName"),
      altText: assertStringField(item, "altText"),
      creditText: assertStringField(item, "creditText"),
      license: assertStringField(item, "license"),
      sourceUrl: assertStringField(item, "sourceUrl"),
    };

    validateManifestItem(parsedItem);

    return parsedItem;
  });
}

function validateManifestItem(item: PlaceImageManifestItem) {
  if (!item.remoteUrl && !item.localFile) {
    throw new Error(`Item "${item.slug}" precisa ter remoteUrl ou localFile.`);
  }

  if (item.remoteUrl) {
    validateUrl(item.remoteUrl, `remoteUrl de "${item.slug}"`);
  }

  validateUrl(item.sourceUrl, `sourceUrl de "${item.slug}"`);

  if (item.fileName.includes("..") || item.fileName.startsWith("/")) {
    throw new Error(`fileName inválido para "${item.slug}": não use caminhos absolutos ou "..".`);
  }

  if (item.localFile?.includes("\0")) {
    throw new Error(`localFile inválido para "${item.slug}".`);
  }
}

function validateUrl(url: string, fieldName: string) {
  try {
    new URL(url);
  } catch {
    throw new Error(`${fieldName} precisa ser uma URL válida.`);
  }
}

async function ensurePublicBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Erro ao listar buckets: ${listError.message}`);
  }

  const bucketExists = (buckets ?? []).some((bucket) => bucket.name === bucketName);

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
    });

    if (createError) {
      throw new Error(`Erro ao criar bucket "${bucketName}": ${createError.message}`);
    }

    console.log(`Bucket "${bucketName}" criado como público.`);
    return;
  }

  const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
    public: true,
  });

  if (updateError) {
    console.warn(
      `Não foi possível atualizar o bucket "${bucketName}" para público: ${updateError.message}`,
    );
    return;
  }

  console.log(`Bucket "${bucketName}" confirmado como público.`);
}

async function findPlaceBySlug(slug: string): Promise<PlaceRow> {
  const { data, error } = await supabase
    .from("places")
    .select("id, slug, name")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar lugar "${slug}": ${error.message}`);
  }

  if (!data) {
    throw new Error(`Lugar com slug "${slug}" não encontrado na tabela places.`);
  }

  return data;
}

class HttpDownloadError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function loadImage(item: PlaceImageManifestItem) {
  let localError: unknown;

  if (item.localFile) {
    try {
      return await loadLocalImage(item);
    } catch (error) {
      localError = error;

      if (!item.remoteUrl) {
        throw new Error(`Falha ao ler localFile "${item.localFile}": ${getErrorMessage(error)}`);
      }

      console.warn(
        `localFile falhou para "${item.slug}" (${getErrorMessage(error)}); tentando remoteUrl.`,
      );
    }
  }

  if (!item.remoteUrl) {
    throw new Error(`Item "${item.slug}" não possui remoteUrl para fallback.`);
  }

  try {
    return await downloadRemoteImage(item);
  } catch (error) {
    if (localError) {
      throw new Error(
        [
          `localFile falhou (${getErrorMessage(localError)})`,
          `remoteUrl falhou (${getErrorMessage(error)})`,
        ].join("; "),
      );
    }

    throw error;
  }
}

async function loadLocalImage(item: PlaceImageManifestItem) {
  if (!item.localFile) {
    throw new Error(`Item "${item.slug}" não possui localFile.`);
  }

  const contentType =
    getContentTypeFromExtension(item.localFile) ?? getContentTypeFromExtension(item.fileName);

  if (!contentType) {
    throw new Error(`Não foi possível detectar contentType para "${item.localFile}".`);
  }

  const fileBody = await readFile(item.localFile);

  if (fileBody.byteLength === 0) {
    throw new Error(`Arquivo local vazio: "${item.localFile}".`);
  }

  return {
    contentType,
    fileBody,
  };
}

async function downloadRemoteImage(item: PlaceImageManifestItem) {
  if (!item.remoteUrl) {
    throw new Error(`Item "${item.slug}" não possui remoteUrl.`);
  }

  for (let attempt = 1; attempt <= downloadAttempts; attempt += 1) {
    try {
      const response = await fetch(item.remoteUrl, {
        headers: {
          Accept: "image/*",
          "User-Agent": remoteUserAgent,
        },
      });

      if (!response.ok) {
        throw new HttpDownloadError(
          `Download falhou para "${item.remoteUrl}": ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      const contentType = getRemoteContentType(item, response);
      const fileBody = await response.arrayBuffer();

      if (fileBody.byteLength === 0) {
        throw new Error(`Download retornou arquivo vazio para "${item.remoteUrl}".`);
      }

      return {
        contentType,
        fileBody,
      };
    } catch (error) {
      const shouldRetry =
        attempt < downloadAttempts &&
        (!(error instanceof HttpDownloadError) || isTemporaryHttpStatus(error.status));

      if (!shouldRetry) {
        throw error;
      }

      const retryDelayMs = getRetryDelayMs(attempt);

      console.warn(
        `Tentativa ${attempt}/${downloadAttempts} falhou para "${item.slug}": ${getErrorMessage(
          error,
        )}. Nova tentativa em ${retryDelayMs}ms.`,
      );

      await delay(retryDelayMs);
    }
  }

  throw new Error(`Download remoto falhou para "${item.remoteUrl}".`);
}

function getRemoteContentType(item: PlaceImageManifestItem, response: Response) {
  const headerContentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    ?.trim()
    .toLowerCase();

  if (headerContentType?.startsWith("image/")) {
    return headerContentType;
  }

  const inferredContentType =
    (item.remoteUrl ? getContentTypeFromExtension(item.remoteUrl) : null) ??
    getContentTypeFromExtension(item.fileName);

  if (!inferredContentType) {
    throw new Error(`Não foi possível detectar contentType para "${item.remoteUrl}".`);
  }

  return inferredContentType;
}

function getContentTypeFromExtension(pathOrUrl: string) {
  const pathname = getPathname(pathOrUrl);
  const extension = extname(pathname).toLowerCase();

  const contentTypes: Record<string, string> = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };

  return contentTypes[extension] ?? null;
}

function getPathname(pathOrUrl: string) {
  try {
    return new URL(pathOrUrl).pathname;
  } catch {
    return pathOrUrl;
  }
}

function isTemporaryHttpStatus(status: number) {
  return status === 429 || status >= 500;
}

function getRetryDelayMs(attempt: number) {
  return attempt * 1_500;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function uploadImage(
  storagePath: string,
  fileBody: ArrayBuffer | Uint8Array,
  contentType: string,
) {
  const { error } = await supabase.storage.from(bucketName).upload(storagePath, fileBody, {
    cacheControl: "3600",
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Erro ao subir imagem "${storagePath}": ${error.message}`);
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);

  return data.publicUrl;
}

async function upsertPlaceImage(
  placeId: string,
  item: PlaceImageManifestItem,
  storagePath: string,
  publicUrl: string,
) {
  const payload = {
    place_id: placeId,
    image_url: publicUrl,
    storage_path: storagePath,
    alt_text: item.altText,
    credit_text: item.creditText,
    license: item.license,
    source_url: item.sourceUrl,
    is_cover: true,
    sort_order: 0,
  };

  const { data: existingRows, error: existingError } = await supabase
    .from("place_images")
    .select("id")
    .eq("place_id", placeId)
    .eq("storage_path", storagePath)
    .limit(1);

  if (existingError) {
    throw new Error(`Erro ao buscar imagem existente de "${item.slug}": ${existingError.message}`);
  }

  const existingImageId = existingRows?.[0]?.id as string | undefined;
  let coverImageId: string;

  if (existingImageId) {
    const { error: updateError } = await supabase
      .from("place_images")
      .update(payload)
      .eq("id", existingImageId);

    if (updateError) {
      throw new Error(`Erro ao atualizar place_images para "${item.slug}": ${updateError.message}`);
    }

    coverImageId = existingImageId;
  } else {
    const { data: insertedImage, error: insertError } = await supabase
      .from("place_images")
      .insert(payload)
      .select("id")
      .single();

    if (insertError) {
      throw new Error(`Erro ao inserir place_images para "${item.slug}": ${insertError.message}`);
    }

    coverImageId = insertedImage.id;
  }

  const { error: unsetCoverError } = await supabase
    .from("place_images")
    .update({ is_cover: false })
    .eq("place_id", placeId)
    .eq("is_cover", true)
    .neq("id", coverImageId);

  if (unsetCoverError) {
    throw new Error(`Erro ao remover covers antigos de "${item.slug}": ${unsetCoverError.message}`);
  }
}

async function importPlaceImage(item: PlaceImageManifestItem) {
  console.log(`\n→ ${item.slug}`);

  const place = await findPlaceBySlug(item.slug);
  const storagePath = `${item.slug}/${item.fileName}`;
  const { contentType, fileBody } = await loadImage(item);
  const publicUrl = await uploadImage(storagePath, fileBody, contentType);

  await upsertPlaceImage(place.id, item, storagePath, publicUrl);

  console.log(`✓ ${place.name} importado/atualizado (${storagePath})`);
}

async function main() {
  const filePath = process.argv[2] ?? "data/place-images/manifest.json";
  const fileContent = await readFile(filePath, "utf-8");
  const manifest = parseManifest(fileContent);

  if (manifest.length === 0) {
    throw new Error("O manifesto não possui imagens para importar.");
  }

  console.log(`Importando ${manifest.length} imagens para o Supabase...`);

  await ensurePublicBucket();

  const failures: Array<{ slug: string; reason: string }> = [];
  let successCount = 0;

  for (const [index, item] of manifest.entries()) {
    try {
      await importPlaceImage(item);
      successCount += 1;
    } catch (error) {
      const message = getErrorMessage(error);
      failures.push({ slug: item.slug, reason: message });
      console.error(`✗ ${item.slug}: ${message}`);
    } finally {
      if (index < manifest.length - 1) {
        await delay(imageDelayMs);
      }
    }
  }

  console.log("\nResumo da importação de imagens:");
  console.log(`Total de itens: ${manifest.length}`);
  console.log(`Importadas com sucesso: ${successCount}`);
  console.log(`Falhas: ${failures.length}`);

  if (failures.length > 0) {
    console.log("\nItens com falha:");
    failures.forEach((failure) => {
      console.log(`- ${failure.slug}: ${failure.reason}`);
    });

    process.exitCode = 1;
    return;
  }

  console.log("\nImportação de imagens finalizada com sucesso.");
}

main().catch((error) => {
  console.error("\nFalha na importação de imagens:");
  console.error(getErrorMessage(error));
  process.exit(1);
});
