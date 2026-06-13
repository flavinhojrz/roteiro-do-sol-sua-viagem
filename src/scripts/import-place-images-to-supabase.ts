import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import { extname } from "node:path";
import { isAbsolute, relative, resolve } from "node:path";
import process from "node:process";
import { createAdminSupabaseClient } from "./supabase-admin";

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
const allowedLocalImageRoot = resolve("data/place-images");
const maxImageBytes = 10 * 1024 * 1024;
const maxRedirects = 3;
const requestTimeoutMs = 15_000;

const supabase = createAdminSupabaseClient();

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

  if (item.fileName.includes("..") || /[\\/]/.test(item.fileName)) {
    throw new Error(`fileName inválido para "${item.slug}": informe apenas o nome do arquivo.`);
  }

  if (item.localFile) {
    const resolvedLocalFile = resolve(item.localFile);
    const relativePath = relative(allowedLocalImageRoot, resolvedLocalFile);
    if (
      item.localFile.includes("\0") ||
      relativePath.startsWith("..") ||
      isAbsolute(relativePath)
    ) {
      throw new Error(`localFile inválido para "${item.slug}": use apenas data/place-images.`);
    }
  }
}

function validateUrl(url: string, fieldName: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
      throw new Error("unsafe URL");
    }
  } catch {
    throw new Error(`${fieldName} precisa ser uma URL HTTPS válida, sem credenciais.`);
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
  if (fileBody.byteLength > maxImageBytes) {
    throw new Error(`Arquivo local excede o limite de 10 MB: "${item.localFile}".`);
  }

  assertImageSignature(new Uint8Array(fileBody), contentType);

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
      const response = await fetchSafeRemoteUrl(item.remoteUrl);

      if (!response.ok) {
        throw new HttpDownloadError(
          `Download falhou para "${item.remoteUrl}": ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      const contentType = getRemoteContentType(item, response);
      const fileBody = await readResponseWithLimit(response);

      if (fileBody.byteLength === 0) {
        throw new Error(`Download retornou arquivo vazio para "${item.remoteUrl}".`);
      }
      assertImageSignature(new Uint8Array(fileBody), contentType);

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

async function fetchSafeRemoteUrl(urlValue: string, redirects = 0): Promise<Response> {
  const url = new URL(urlValue);
  await assertPublicRemoteHost(url);

  const response = await fetch(url, {
    headers: {
      Accept: "image/*",
      "User-Agent": remoteUserAgent,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(requestTimeoutMs),
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location || redirects >= maxRedirects) {
      throw new Error(`Redirecionamento remoto inválido para "${url.hostname}".`);
    }
    const nextUrl = new URL(location, url);
    validateUrl(nextUrl.toString(), "URL de redirecionamento");
    return fetchSafeRemoteUrl(nextUrl.toString(), redirects + 1);
  }

  return response;
}

async function assertPublicRemoteHost(url: URL) {
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname === "metadata.google.internal"
  ) {
    throw new Error("Host remoto privado não é permitido.");
  }

  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error("Endereço remoto privado não é permitido.");
  }
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();
  if (normalized.startsWith("::ffff:")) {
    return isPrivateAddress(normalized.slice("::ffff:".length));
  }

  if (isIP(normalized) === 6) {
    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("ff")
    );
  }

  const octets = normalized.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return true;
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

async function readResponseWithLimit(response: Response): Promise<ArrayBuffer> {
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredSize) && declaredSize > maxImageBytes) {
    throw new Error("Imagem remota excede o limite de 10 MB.");
  }
  if (!response.body) throw new Error("Resposta remota sem corpo.");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxImageBytes) {
      await reader.cancel();
      throw new Error("Imagem remota excede o limite de 10 MB.");
    }
    chunks.push(value);
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output.buffer;
}

function assertImageSignature(bytes: Uint8Array, contentType: string) {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  const matches =
    (contentType === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (contentType === "image/png" && bytes[0] === 0x89 && ascii(1, 4) === "PNG") ||
    (contentType === "image/gif" && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) ||
    (contentType === "image/webp" && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") ||
    (contentType === "image/avif" &&
      ascii(4, 8) === "ftyp" &&
      ["avif", "avis"].includes(ascii(8, 12)));

  if (!matches) {
    throw new Error(`Conteúdo do arquivo não corresponde ao tipo ${contentType}.`);
  }
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
