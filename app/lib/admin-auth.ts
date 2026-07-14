import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "king-of-caps-admin";
const ADMIN_PASSWORD = "king2026";

export function getAdminToken() {
  return createHmac("sha256", ADMIN_PASSWORD)
    .update("king-of-caps-admin-session")
    .digest("hex");
}

export function isCorrectPassword(password: unknown) {
  return typeof password === "string" && password === ADMIN_PASSWORD;
}

export function isAdminToken(value: string | undefined) {
  if (!value) return false;

  const expected = Buffer.from(getAdminToken());
  const received = Buffer.from(value);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
