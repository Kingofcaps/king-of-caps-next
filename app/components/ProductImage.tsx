"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import {
  logProductImageLoadError,
  normalizeProductImageUrl,
  PRODUCT_IMAGE_FALLBACK,
  shouldBypassProductImageOptimization,
} from "@/app/lib/product-image-url";

type ProductImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: unknown;
};

export default function ProductImage({ src, alt, unoptimized, ...props }: ProductImageProps) {
  const normalizedSource = normalizeProductImageUrl(src);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const displayedSource = failedSource === normalizedSource ? PRODUCT_IMAGE_FALLBACK : normalizedSource;

  return (
    <Image
      {...props}
      src={displayedSource}
      alt={alt}
      unoptimized={unoptimized ?? shouldBypassProductImageOptimization(displayedSource)}
      onError={() => {
        if (displayedSource === PRODUCT_IMAGE_FALLBACK) return;
        logProductImageLoadError(displayedSource);
        setFailedSource(normalizedSource);
      }}
    />
  );
}
