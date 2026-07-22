"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import ProductImage from "@/app/components/ProductImage";
import { normalizeProductImageUrl } from "@/app/lib/product-image-url";

export default function ProductImageGallery({
  productName,
  mainImage,
  additionalImages,
}: {
  productName: string;
  mainImage: string;
  additionalImages: string[];
}) {
  const normalizedMainImage = normalizeProductImageUrl(mainImage);
  const thumbnailImages = useMemo(
    () => Array.from(new Set(additionalImages.map(normalizeProductImageUrl)))
      .filter((image) => image !== normalizedMainImage),
    [additionalImages, normalizedMainImage],
  );
  const galleryImages = useMemo(
    () => [normalizedMainImage, ...thumbnailImages],
    [normalizedMainImage, thumbnailImages],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const activeImage = galleryImages[activeIndex] ?? normalizedMainImage;

  function showPreviousImage() {
    setActiveIndex((current) => Math.max(current - 1, 0));
  }

  function showNextImage() {
    setActiveIndex((current) => Math.min(current + 1, galleryImages.length - 1));
  }

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;
    if (startX === null || galleryImages.length < 2) return;

    const distance = (event.changedTouches[0]?.clientX ?? startX) - startX;
    if (Math.abs(distance) < 40) return;
    setActiveIndex((current) => distance < 0
      ? Math.min(current + 1, galleryImages.length - 1)
      : Math.max(current - 1, 0));
  }

  return (
    <div className="min-w-0">
      <div
        className="relative aspect-square touch-pan-y overflow-hidden rounded-[18px] border border-[#e5e5e5] bg-white shadow-[0_12px_30px_rgba(0,0,0,0.08)]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <ProductImage
          key={activeImage}
          src={activeImage}
          alt={`${productName} — photo ${activeIndex + 1}`}
          fill
          loading={activeIndex === 0 ? "eager" : "lazy"}
          fetchPriority={activeIndex === 0 ? "high" : "auto"}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
        {galleryImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={showPreviousImage}
              disabled={activeIndex === 0}
              aria-label="Afficher la photo précédente"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl font-bold text-white backdrop-blur-sm transition hover:bg-black/75 disabled:pointer-events-none disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={showNextImage}
              disabled={activeIndex === galleryImages.length - 1}
              aria-label="Afficher la photo suivante"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-xl font-bold text-white backdrop-blur-sm transition hover:bg-black/75 disabled:pointer-events-none disabled:opacity-30"
            >
              →
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {activeIndex + 1} / {galleryImages.length}
            </span>
          </>
        )}
      </div>

      {thumbnailImages.length > 0 && (
        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Photos du produit">
          {thumbnailImages.map((image, index) => (
            <button
              key={image}
              data-image-url={image}
              type="button"
              onClick={() => setActiveIndex(index + 1)}
              aria-label={`Afficher la photo ${index + 2} sur ${galleryImages.length}`}
              aria-current={index + 1 === activeIndex ? "true" : undefined}
              className={`relative aspect-square w-[calc((100%-1.5rem)/4)] min-w-[72px] max-w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-100 transition ${index + 1 === activeIndex ? "border-[#c9a227]" : "border-transparent hover:border-zinc-300"}`}
            >
              <ProductImage src={image} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
