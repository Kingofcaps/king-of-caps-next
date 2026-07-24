"use client";

import Image from "next/image";
import { useState } from "react";
import {
  logProductImageLoadError,
  normalizeProductImageUrl,
  productImageLoader,
  PRODUCT_IMAGE_FALLBACK,
} from "@/app/lib/product-image-url";

const CARD_IMAGE_SIZES =
  "(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 260px";

type ProductCardImageProps = {
  src: unknown;
  alt: string;
  className?: string;
  priority?: boolean;
};

function ImageUnavailable({ alt }: { alt: string }) {
  return (
    <span
      role="img"
      aria-label={`${alt} — Image indisponible`}
      className="absolute inset-0 flex items-center justify-center bg-zinc-100 px-3 text-center text-xs font-semibold text-zinc-500"
    >
      Image indisponible
    </span>
  );
}

function ResolvedProductCardImage({
  src,
  alt,
  className,
  priority,
}: {
  src: string;
  alt: string;
  className: string;
  priority: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src === PRODUCT_IMAGE_FALLBACK ? "error" : "loading",
  );

  if (status === "error") {
    return <ImageUnavailable alt={alt} />;
  }

  return (
    <>
      {status === "loading" && (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-zinc-200"
        />
      )}
      <Image
        src={src}
        alt={alt}
        fill
        loader={productImageLoader}
        quality={90}
        sizes={CARD_IMAGE_SIZES}
        preload={priority}
        loading={priority ? undefined : "lazy"}
        className={`${className} transition-opacity duration-300 ${
          status === "loaded" ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setStatus("loaded")}
        onError={() => {
          logProductImageLoadError(src, alt);
          setStatus("error");
        }}
      />
    </>
  );
}

export default function ProductCardImage({
  src,
  alt,
  className = "",
  priority = false,
}: ProductCardImageProps) {
  const normalizedSource = normalizeProductImageUrl(src);

  return (
    <ResolvedProductCardImage
      key={normalizedSource}
      src={normalizedSource}
      alt={alt}
      className={className}
      priority={priority}
    />
  );
}
