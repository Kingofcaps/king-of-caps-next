"use client";

import Image from "next/image";
import { images } from "./lib/images";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">

      <header className="relative h-screen bg-cover bg-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
          <h1 className="text-3xl font-bold tracking-widest">
            KING OF CAPS
          </h1>

          <a
            href="https://wa.me/229XXXXXXXX"
            className="bg-white text-black px-5 py-2 rounded-full font-semibold"
          >
            WhatsApp
          </a>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-14">
        <h2 className="text-5xl font-bold text-center mb-4">
          Nos Casquettes
        </h2>

        <p className="text-center text-gray-400 mb-12">
          Découvrez toute la collection King Of Caps.
        </p>
<div className="mb-8 flex justify-center">
  <input
    type="text"
    placeholder="Rechercher une casquette..."
    className="w-full max-w-md rounded-xl border border-gray-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-white"
  />
</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {images.map((image, index) => (
            <div
              key={index}
              className="bg-zinc-900 rounded-2xl overflow-hidden hover:scale-105 transition duration-300"
            >
              <div className="relative aspect-square">
                <Image
                  src={`/images/${image}`}
                  alt={`Casquette ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg">
                  Casquette #{index + 1}
                </h3>

                <p className="text-yellow-400 text-lg font-bold mt-2">
  5 000 FCFA
</p>

                <a
  href={`https://wa.me/22950687515?text=${encodeURIComponent(
    `Bonjour KING OF CAPS, je souhaite commander la Casquette #${index + 1}.`
  )}`}
  target="_blank"
  className="mt-4 w-full bg-white text-black py-2 rounded-xl font-semibold text-center block"
>
  Commander
</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
