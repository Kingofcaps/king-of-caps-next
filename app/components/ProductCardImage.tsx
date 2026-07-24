"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  logProductImageLoadError,
  normalizeProductImageUrl,
  PRODUCT_IMAGE_FALLBACK,
} from "@/app/lib/product-image-url";

type ProductCardImageProps = {
  src: unknown;
  alt: string;
  className?: string;
};

export default function ProductCardImage({
  src,
  alt,
  className = "",
}: ProductCardImageProps) {
  const normalizedSource = normalizeProductImageUrl(src);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const isUnavailable =
    normalizedSource === PRODUCT_IMAGE_FALLBACK
    || failedSource === normalizedSource;

  if (isUnavailable) {
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

  return (
    <img
      src={normalizedSource}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 block h-full w-full ${className}`}
      onError={() => {
        logProductImageLoadError(normalizedSource);
        setFailedSource(normalizedSource);
      }}
    />
  );
}
