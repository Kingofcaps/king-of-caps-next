import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminToken } from "@/app/lib/admin-auth";

export const runtime = "nodejs";

const MAX_ANALYSIS_IMAGE_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type RateLimitEntry = { count: number; resetAt: number };
type ProductImageAnalysis = {
  suggestedName: string;
  brand: string;
  category: string;
  color: string;
  description: string;
  confidence: number;
};

const globalRateLimit = globalThis as typeof globalThis & {
  kingOfCapsImageAnalysisRateLimits?: Map<string, RateLimitEntry>;
};
const rateLimits = globalRateLimit.kingOfCapsImageAnalysisRateLimits ?? new Map<string, RateLimitEntry>();
globalRateLimit.kingOfCapsImageAnalysisRateLimits = rateLimits;

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["suggestedName", "brand", "category", "color", "description", "confidence"],
  properties: {
    suggestedName: { type: "string" },
    brand: { type: "string" },
    category: { type: "string" },
    color: { type: "string" },
    description: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
} as const;

function requestIdentifier(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "admin-local";
}

function isRateLimited(identifier: string) {
  const now = Date.now();
  const current = rateLimits.get(identifier);
  if (!current || current.resetAt <= now) {
    rateLimits.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  current.count += 1;
  return false;
}

function hasValidImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
      && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

function cleanAnalysis(value: unknown): ProductImageAnalysis {
  const result = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const text = (key: string, fallback = "") => typeof result[key] === "string"
    ? result[key].trim().slice(0, key === "description" ? 600 : 100)
    : fallback;
  const confidence = typeof result.confidence === "number" && Number.isFinite(result.confidence)
    ? Math.min(1, Math.max(0, result.confidence))
    : 0;

  return {
    suggestedName: text("suggestedName"),
    brand: text("brand", "Inconnue") || "Inconnue",
    category: text("category", "Casquette") || "Casquette",
    color: text("color"),
    description: text("description"),
    confidence,
  };
}

export async function POST(request: Request) {
  if (!isAdminToken((await cookies()).get(ADMIN_COOKIE)?.value)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "La requête d’analyse est invalide." }, { status: 400 });
  }
  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "Sélectionnez une image à analyser." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
    return NextResponse.json({ error: "Seules les images JPEG, PNG et WebP sont autorisées." }, { status: 400 });
  }
  if (image.size > MAX_ANALYSIS_IMAGE_BYTES) {
    return NextResponse.json({ error: "L’image à analyser doit peser au maximum 5 Mo." }, { status: 413 });
  }

  const bytes = new Uint8Array(await image.arrayBuffer());
  if (!hasValidImageSignature(bytes, image.type)) {
    return NextResponse.json({ error: "Le contenu du fichier ne correspond pas à un format d’image accepté." }, { status: 400 });
  }
  if (isRateLimited(requestIdentifier(request))) {
    return NextResponse.json(
      { error: "Limite d’analyse atteinte. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "L’analyse IA n’est pas configurée. Ajoutez OPENAI_API_KEY côté serveur." },
      { status: 503 },
    );
  }

  const imageDataUrl = `data:${image.type};base64,${Buffer.from(bytes).toString("base64")}`;
  const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_ANALYSIS_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: "Tu analyses des photos de casquettes pour préparer une fiche produit en français. Réponds uniquement selon le schéma JSON demandé. N’affirme jamais qu’un article est authentique. N’invente jamais une marque ou une équipe : si le logo ou le texte n’est pas clairement lisible, utilise exactement « Inconnue ». Le nom doit être court, commercial et factuel, par exemple « LA Flames Ajustable », « NY Yankees Fitted noire », « Bulls 1966 blanc-bleu » ou « Oakland brodée noire ». N’utilise pas le nom du fichier. Si plusieurs casquettes sont visibles, décris l’ensemble et réduis la confiance. La description doit rester concise et ne contenir aucune affirmation non visible.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyse cette photo. Identifie uniquement les éléments réellement visibles : logo ou texte, forme, couleurs dominantes, style et détails. Retourne une suggestion de fiche produit.",
            },
            { type: "image_url", image_url: { url: imageDataUrl, detail: "low" } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "king_of_caps_product_analysis",
          strict: true,
          schema: responseSchema,
        },
      },
    }),
  });

  if (!openAIResponse.ok) {
    const errorBody = await openAIResponse.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    console.error("OpenAI image analysis failed:", {
      status: openAIResponse.status,
      code: errorBody?.error?.code ?? null,
      message: errorBody?.error?.message ?? null,
    });
    return NextResponse.json({ error: "L’analyse de l’image a échoué. Réessayez." }, { status: 502 });
  }

  const completion = await openAIResponse.json() as {
    choices?: Array<{ message?: { content?: string; refusal?: string | null } }>;
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "L’IA n’a pas pu analyser cette image." }, { status: 422 });
  }

  try {
    return NextResponse.json(cleanAnalysis(JSON.parse(content)));
  } catch {
    console.error("OpenAI image analysis returned invalid JSON.");
    return NextResponse.json({ error: "La réponse de l’analyse est invalide. Réessayez." }, { status: 502 });
  }
}
