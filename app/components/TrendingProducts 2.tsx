"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import type { Product } from "@/app/lib/products";
import ProductImage from "./ProductImage";

function TrendingCard({ product, duplicate = false }: { product: Product; duplicate?: boolean }) {
  return (
    <Link
      href={`/product/${product.id}`}
      tabIndex={duplicate ? -1 : undefined}
      className="group w-[calc((100vw-4.5rem)/2.2)] min-w-32 max-w-44 shrink-0 snap-start overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-white shadow-[0_5px_16px_rgba(0,0,0,0.05)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_22px_rgba(0,0,0,0.08)] md:w-44 md:max-w-none md:snap-none lg:w-48"
      aria-label={`Voir ${product.name}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100">
        <ProductImage
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 767px) 40vw, (max-width: 1279px) 176px, 192px"
          className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-2 sm:p-2.5">
        <h3 className="line-clamp-2 min-h-8 text-xs font-black leading-4 text-zinc-900 sm:text-sm">{product.name}</h3>
        <span className="mt-1 block text-[10px] font-black tracking-[0.1em] text-[#c9a227] transition group-hover:text-black sm:text-xs">VOIR &gt;</span>
      </div>
    </Link>
  );
}

export default function TrendingProducts({ products }: { products: Product[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const didDragRef = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const trendingProducts = useMemo(() => {
    const available = products.filter((product) => product.inStock);
    const unavailable = products.filter((product) => !product.inStock);
    return [...available, ...unavailable].slice(0, 8);
  }, [products]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || trendingProducts.length < 2 || isInteracting || isHovered) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame: number | null = null;
    let previousTime: number | null = null;

    const animate = (time: number) => {
      if (reducedMotionQuery.matches) {
        animationFrame = null;
        return;
      }

      const elapsed = previousTime === null ? 0 : Math.min(time - previousTime, 64);
      previousTime = time;
      container.scrollLeft += elapsed * 0.012;

      const loopPoint = container.scrollWidth / 2;
      if (loopPoint > 0 && container.scrollLeft >= loopPoint) {
        container.scrollLeft -= loopPoint;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    const syncAnimation = () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      animationFrame = null;
      previousTime = null;
      if (!reducedMotionQuery.matches) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    reducedMotionQuery.addEventListener("change", syncAnimation);
    syncAnimation();

    return () => {
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
      reducedMotionQuery.removeEventListener("change", syncAnimation);
    };
  }, [isHovered, isInteracting, trendingProducts.length]);

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
      setIsInteracting(false);
      interactionTimeoutRef.current = null;
    }, 1800);
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
      <div>
        <h2 id="trending-title" className="text-lg font-black tracking-[-0.02em] text-zinc-950 sm:text-xl">Tendances du moment</h2>
        <p className="mt-0.5 text-xs text-zinc-500">Les casquettes les plus regardées</p>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        aria-label="Produits tendances, faites défiler horizontalement"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onTouchStart={beginInteraction}
        onTouchMove={beginInteraction}
        onTouchEnd={beginInteraction}
        onWheel={beginInteraction}
        onKeyDown={beginInteraction}
        onFocusCapture={beginInteraction}
        onClickCapture={preventClickAfterDrag}
        className="mt-2.5 cursor-grab overflow-x-auto scroll-smooth rounded-[14px] snap-x snap-mandatory pb-0.5 outline-none [-ms-overflow-style:none] [scrollbar-width:none] active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-[#c9a227] [&::-webkit-scrollbar]:hidden md:snap-none"
      >
        <div className="flex w-max">
          <div className="flex shrink-0 gap-3 pr-3 md:gap-4 md:pr-4">
            {trendingProducts.map((product) => <TrendingCard key={`primary-${product.id}`} product={product} />)}
          </div>
          <div aria-hidden="true" className="flex shrink-0 gap-3 pr-3 md:gap-4 md:pr-4">
            {trendingProducts.map((product) => <TrendingCard key={`duplicate-${product.id}`} product={product} duplicate />)}
          </div>
        </div>
      </div>
    </section>
  );
}
