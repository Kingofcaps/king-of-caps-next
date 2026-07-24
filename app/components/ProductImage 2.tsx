"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import {
  logProductImageLoadError,
  normalizeProductImageUrl,
  productImageLoader,
  PRODUCT_IMAGE_FALLBACK,
} from "@/app/lib/product-image-url";

type ProductImageProps = Omit<ImageProps, "src" | "onError" | "onLoad"> & {
  src: unknown;
};

function ImageUnavailable({ alt }: { alt: string }) {
  return (
    <span
      role="img"
      aria-label={alt ? `${alt} — Image indisponible` : "Image indisponible"}
      className="absolute inset-0 flex items-center justify-center bg-zinc-100 px-3 text-center text-xs font-semibold text-zinc-500"
    >
      Image indisponible
    </span>
  );
}

function ResolvedProductImage({
  src,
  alt,
  className = "",
  loader = productImageLoader,
  quality = 90,
  ...props
}: Omit<ProductImageProps, "src"> & { src: string }) {
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
        {...props}
        src={src}
        alt={alt}
        loader={loader}
        quality={quality}
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

export default function ProductImage({ src, alt, ...props }: ProductImageProps) {
  const normalizedSource = normalizeProductImageUrl(src);

  return (
    <ResolvedProductImage
      key={normalizedSource}
      src={normalizedSource}
      alt={alt}
      {...props}
    />
  );
}
