"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type TouchEvent } from "react";

export default function ProductImageGallery({
  productName,
  primaryImage,
  images,
}: {
  productName: string;
  primaryImage: string;
  images: string[];
}) {
  const galleryImages = useMemo(
    () => Array.from(new Set([primaryImage, ...images])).filter((image) => image.trim() !== ""),
    [images, primaryImage],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const activeImage = galleryImages[activeIndex] ?? primaryImage;

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
        <Image
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
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">
            {activeIndex + 1} / {galleryImages.length}
          </span>
        )}
      </div>

      {galleryImages.length > 1 && (
        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Photos du produit">
          {galleryImages.map((image, index) => (
            <button
              key={image}
              data-image-url={image}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Afficher la photo ${index + 1} sur ${galleryImages.length}`}
              aria-current={index === activeIndex ? "true" : undefined}
              className={`relative aspect-square w-[calc((100%-1.5rem)/4)] min-w-[72px] max-w-24 shrink-0 overflow-hidden rounded-xl border-2 bg-zinc-100 transition ${index === activeIndex ? "border-[#c9a227]" : "border-transparent hover:border-zinc-300"}`}
            >
              <Image src={image} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
