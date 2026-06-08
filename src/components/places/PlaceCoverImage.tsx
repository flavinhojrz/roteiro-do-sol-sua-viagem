import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PlaceCoverImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imageClassName?: string;
  loading?: "eager" | "lazy";
  fallbackLabel?: string;
};

export function PlaceCoverImage({
  src,
  alt,
  className,
  imageClassName,
  loading = "lazy",
  fallbackLabel = "Imagem em revisão",
}: PlaceCoverImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const showImage = Boolean(src) && failedSrc !== src;
  const isLoaded = Boolean(src) && loadedSrc === src;

  useEffect(() => {
    setFailedSrc(null);
    setLoadedSrc(null);
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-sea-soft via-aqua/35 to-sun/30",
        className,
      )}
    >
      {showImage ? (
        <>
          {!isLoaded ? <PlaceCoverSkeleton className="absolute inset-0" /> : null}
          <img
            src={src ?? undefined}
            alt={alt}
            loading={loading}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-500",
              isLoaded ? "opacity-100" : "opacity-0",
              imageClassName,
            )}
            onLoad={() => setLoadedSrc(src ?? null)}
            onError={() => setFailedSrc(src ?? null)}
          />
        </>
      ) : (
        <PlaceImageFallback label={fallbackLabel} />
      )}
    </div>
  );
}

export function PlaceCoverSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-sea-soft via-white/60 to-sun/25",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-pulse bg-white/35" />
    </div>
  );
}

function PlaceImageFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-end justify-center p-3">
      <span className="rounded-full bg-white/75 px-3 py-1 text-[0.68rem] font-extrabold text-ink/65 shadow-soft backdrop-blur">
        {label}
      </span>
    </div>
  );
}
