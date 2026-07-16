"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { Product } from "@/app/lib/products";
import styles from "./TrendingProducts.module.css";

function TrendingCard({ product, duplicate = false }: { product: Product; duplicate?: boolean }) {
  return (
    <Link
      href={`/product/${product.id}`}
      tabIndex={duplicate ? -1 : undefined}
      className={`${styles.card} group w-[calc((100vw-4.5rem)/2.2)] min-w-32 max-w-44 shrink-0 border border-[#e5e5e5] bg-white shadow-[0_5px_16px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] md:w-44 md:max-w-none lg:w-48`}
      aria-label={`Voir ${product.name}`}
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 40vw, (max-width: 1279px) 176px, 192px"
          className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="px-2 py-1.5 text-center sm:py-2">
        <span className="block text-[10px] font-black tracking-[0.1em] text-[#c9a227] transition group-hover:text-black sm:text-xs">
          VOIR &gt;
        </span>
      </div>
    </Link>
  );
}

export default function TrendingProducts({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const didDragRef = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);

  const trendingProducts = useMemo(() => {
    const available = products.filter((product) => product.inStock);
    const unavailable = products.filter((product) => !product.inStock);
    return [...available, ...unavailable].slice(0, 8);
  }, [products]);

  useEffect(() => () => {
    if (interactionTimeoutRef.current !== null) {
      window.clearTimeout(interactionTimeoutRef.current);
    }
  }, []);

  function beginInteraction() {
    setIsInteracting(true);
    if (interactionTimeoutRef.current !== null) {
      window.clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = window.setTimeout(() => {
      if (containerRef.current) containerRef.current.scrollLeft = 0;
      setIsInteracting(false);
      interactionTimeoutRef.current = null;
    }, 1200);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    beginInteraction();
    didDragRef.current = false;
    if (event.pointerType !== "mouse" || event.button !== 0) return;

    const container = containerRef.current;
    if (!container) return;
    dragRef.current = { active: true, startX: event.clientX, startScrollLeft: container.scrollLeft };
    container.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;
    if (!container || !dragRef.current.active) return;
    const distance = event.clientX - dragRef.current.startX;
    if (Math.abs(distance) > 4) didDragRef.current = true;
    container.scrollLeft = dragRef.current.startScrollLeft - distance;
    beginInteraction();
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const container = containerRef.current;
    dragRef.current.active = false;
    if (container?.hasPointerCapture(event.pointerId)) container.releasePointerCapture(event.pointerId);
    beginInteraction();
  }

  function preventClickAfterDrag(event: MouseEvent<HTMLDivElement>) {
    if (!didDragRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  }

  if (trendingProducts.length === 0) return null;

  return (
    <section aria-labelledby="trending-title">
      <h2
        id="trending-title"
        className="text-center text-lg font-black tracking-[-0.02em] text-zinc-950 sm:text-xl"
      >
        Tendances du moment
      </h2>

      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Produits tendances, faites défiler horizontalement"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onTouchStart={beginInteraction}
        onTouchMove={beginInteraction}
        onTouchEnd={beginInteraction}
        onWheel={beginInteraction}
        onKeyDown={beginInteraction}
        onClickCapture={preventClickAfterDrag}
        className={`${styles.viewport} ${isInteracting ? styles.paused : ""} mt-2 cursor-grab overflow-x-auto rounded-[14px] outline-none [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#c9a227] [&::-webkit-scrollbar]:hidden`}
      >
        <div className={styles.track}>
          <div className={styles.productGroup}>
            {trendingProducts.map((product) => (
              <TrendingCard key={`primary-${product.id}`} product={product} />
            ))}
          </div>
          <div aria-hidden="true" className={styles.productGroup}>
            {trendingProducts.map((product) => (
              <TrendingCard key={`duplicate-${product.id}`} product={product} duplicate />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
