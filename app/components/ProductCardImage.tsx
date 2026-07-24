"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import {
  logProductImageLoadError,
  normalizeProductImageUrl,
  productImageLoader,
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
  const [transformationFailedSource, setTransformationFailedSource] =
    useState<string | null>(null);
  const transformedSource = productImageLoader({
    src: normalizedSource,
    width: 640,
    quality: 90,
  });
  const displayedSource = transformationFailedSource === normalizedSource
    ? normalizedSource
    : transformedSource;
  const usesTransformation = displayedSource !== normalizedSource;
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
      src={displayedSource}
      srcSet={usesTransformation
        ? [256, 384, 640, 828]
            .map((width) => `${productImageLoader({
              src: normalizedSource,
              width,
              quality: 90,
            })} ${width}w`)
            .join(", ")
        : undefined}
      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 300px"
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 block h-full w-full ${className}`}
      onError={() => {
        if (usesTransformation) {
          setTransformationFailedSource(normalizedSource);
          return;
        }
        logProductImageLoadError(normalizedSource);
        setFailedSource(normalizedSource);
      }}
    />
  );
}
