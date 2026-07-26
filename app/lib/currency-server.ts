import { cookies, headers } from "next/headers";
import { CURRENCY_COOKIE_NAME, currencyForCountry, normalizeCurrency, type Currency } from "./currency";

export async function getRequestCurrency(): Promise<Currency> {
  const cookieValue = (await cookies()).get(CURRENCY_COOKIE_NAME)?.value;
  if (cookieValue) return normalizeCurrency(cookieValue);

  const country = (await headers()).get("x-vercel-ip-country");
  return currencyForCountry(country);
}
