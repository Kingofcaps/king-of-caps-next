"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setIsLoading(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Impossible de vous connecter.");
      return;
    }

    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl shadow-black/40"
      >
        <p className="text-sm font-bold tracking-[0.28em] text-amber-300">KING OF CAPS</p>
        <h1 className="mt-3 text-3xl font-black">Administration</h1>
        <p className="mt-3 text-zinc-400">Connectez-vous pour gérer la collection.</p>

        <label className="mt-8 block text-sm font-bold text-zinc-300" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none transition focus:border-amber-300"
          required
        />
        {error && <p className="mt-3 text-sm font-semibold text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-7 w-full rounded-xl bg-amber-400 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Connexion…" : "Accéder au tableau de bord"}
        </button>
      </form>
    </main>
  );
}
