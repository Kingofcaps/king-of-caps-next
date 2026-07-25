function fallbackRandomPart(cryptoApi: Crypto | undefined) {
  let securePart = "";

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    try {
      const values = new Uint32Array(1);
      cryptoApi.getRandomValues(values);
      securePart = values[0].toString(16).padStart(8, "0");
    } catch {
      // Continue with Math.random() for older or restricted browsers.
    }
  }

  const pseudoRandomPart = Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${securePart}${pseudoRandomPart}`.slice(0, 12);
}

export function generateClientId(prefix = "client") {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    try {
      return cryptoApi.randomUUID();
    } catch {
      // Fall back when randomUUID exists but is unavailable in the current context.
    }
  }

  return `${prefix}_${Date.now()}_${fallbackRandomPart(cryptoApi)}`;
}

export function generateCheckoutId() {
  return generateClientId("checkout");
}
