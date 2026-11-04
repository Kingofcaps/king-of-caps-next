import assert from "node:assert/strict";
import test from "node:test";
import {
  createSupabaseServerClient,
  supabaseServerAuthHeaders,
} from "../app/lib/supabase-server.ts";

const secretKey = "sb_secret_test_only_not_a_real_key";

function makeJwt(role: string) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.test-signature`;
}

test("new Supabase secret key is sent only in apikey", () => {
  const headers = supabaseServerAuthHeaders(secretKey);

  assert.equal(headers.apikey, secretKey);
  assert.equal("Authorization" in headers, false);
});

test("legacy service_role JWT keeps Bearer compatibility", () => {
  const legacyKey = makeJwt("service_role");
  const headers = supabaseServerAuthHeaders(legacyKey);

  assert.equal(headers.apikey, legacyKey);
  assert.equal(headers.Authorization, `Bearer ${legacyKey}`);
});

test("a user JWT is rejected as a server service key", () => {
  const userJwt = makeJwt("authenticated");

  assert.throws(
    () => supabaseServerAuthHeaders(userJwt),
    /clé Supabase serveur doit être une clé secrète ou un JWT service_role legacy/,
  );
});

test("supabase-js does not re-add a Bearer header for new secret keys", async () => {
  let observedHeaders = new Headers();
  const client = createSupabaseServerClient(
    "https://test-project.supabase.co",
    secretKey,
    async (_input, init) => {
      observedHeaders = new Headers(init?.headers);
      return Response.json([]);
    },
  );

  const { error } = await client.from("orders").select("id");

  assert.equal(error, null);
  assert.equal(observedHeaders?.get("apikey"), secretKey);
  assert.equal(observedHeaders?.has("authorization"), false);
});

test("supabase-js retains Bearer for legacy service_role JWTs", async () => {
  const legacyKey = makeJwt("service_role");
  let observedHeaders = new Headers();
  const client = createSupabaseServerClient(
    "https://test-project.supabase.co",
    legacyKey,
    async (_input, init) => {
      observedHeaders = new Headers(init?.headers);
      return Response.json([]);
    },
  );

  const { error } = await client.from("orders").select("id");

  assert.equal(error, null);
  assert.equal(observedHeaders?.get("apikey"), legacyKey);
  assert.equal(observedHeaders?.get("authorization"), `Bearer ${legacyKey}`);
});