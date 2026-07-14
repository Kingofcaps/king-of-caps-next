import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { images } from "./images";

export type Product = {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  images: string[];
  brand: string;
  category: string;
  color: string;
  stockQuantity: number;
  featured: boolean;
  newArrival: boolean;
  available: boolean;
  inStock: boolean;
};

const productsFile = path.join(process.cwd(), "data", "products.json");
let productMutationQueue: Promise<void> = Promise.resolve();
const defaultDescription =
  "Une casquette pensée pour affirmer votre style. Sa silhouette soignée, son confort durable et la signature King of Caps en font une pièce essentielle au quotidien.";

function getDefaultProducts(): Product[] {
  return images.map((image, index) => ({
    id: String(index + 1),
    name: `Casquette #${index + 1}`,
    price: "5 000 FCFA",
    description: defaultDescription,
    image: `/images/${image}`,
    images: [`/images/${image}`],
    brand: "King Of Caps",
    category: "Casquette",
    color: "",
    stockQuantity: 1,
    featured: false,
    newArrival: false,
    available: true,
    inStock: true,
  }));
}

export class InsufficientStockError extends Error {
  constructor() {
    super("Stock insuffisant pour ce produit.");
  }
}

function normalizeProduct(value: unknown): Product | null {
  if (!value || typeof value !== "object") return null;

  const product = value as Partial<Product>;
  if (
    typeof product.id !== "string" ||
    typeof product.name !== "string" ||
    typeof product.price !== "string" ||
    typeof product.description !== "string" ||
    typeof product.image !== "string"
  ) {
    return null;
  }

  const stockQuantity = typeof product.stockQuantity === "number" && Number.isFinite(product.stockQuantity)
    ? Math.max(0, Math.floor(product.stockQuantity))
    : product.inStock === false ? 0 : 1;
  const available = stockQuantity > 0;
  const images = Array.isArray(product.images)
    ? product.images.filter((image): image is string => typeof image === "string" && image.startsWith("/"))
    : [];

  return {
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description,
    image: product.image,
    images: Array.from(new Set([product.image, ...images])).slice(0, 6),
    brand: typeof product.brand === "string" ? product.brand : "King Of Caps",
    category: typeof product.category === "string" ? product.category : "Casquette",
    color: typeof product.color === "string" ? product.color : "",
    stockQuantity,
    featured: product.featured === true,
    newArrival: product.newArrival === true,
    available,
    inStock: available,
  };
}

export async function getProducts(): Promise<Product[]> {
  try {
    const content = await readFile(productsFile, "utf8");
    const products: unknown = JSON.parse(content);

    if (Array.isArray(products) && products.length > 0) {
      const normalizedProducts = products.map(normalizeProduct);
      if (normalizedProducts.every((product): product is Product => product !== null)) {
        return normalizedProducts;
      }
    }
  } catch {
    // The catalogue is initialized below on its first use.
  }

  const products = getDefaultProducts();
  await saveProducts(products);
  return products;
}

export async function getProduct(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.id === id);
}

export async function saveProducts(products: Product[]) {
  await mkdir(path.dirname(productsFile), { recursive: true });
  await writeFile(productsFile, `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

async function mutateProducts<T>(mutation: (products: Product[]) => T | Promise<T>) {
  const previousMutation = productMutationQueue;
  let releaseMutation!: () => void;
  productMutationQueue = new Promise<void>((resolve) => { releaseMutation = resolve; });
  await previousMutation;

  try {
    const products = await getProducts();
    const result = await mutation(products);
    await saveProducts(products);
    return result;
  } finally {
    releaseMutation();
  }
}

function synchronizeStock(product: Product, stockQuantity: number): Product {
  const nextQuantity = Math.max(0, Math.floor(stockQuantity));
  return {
    ...product,
    stockQuantity: nextQuantity,
    available: nextQuantity > 0,
    inStock: nextQuantity > 0,
  };
}

export async function reserveProductStock(productId: string, quantity: number) {
  return mutateProducts((products) => {
    const index = products.findIndex((product) => product.id === productId);
    const product = products[index];
    if (index === -1 || !product.inStock || product.stockQuantity < quantity) {
      throw new InsufficientStockError();
    }

    const updatedProduct = synchronizeStock(product, product.stockQuantity - quantity);
    products[index] = updatedProduct;
    return updatedProduct;
  });
}

export async function restoreProductStock(productId: string, quantity: number) {
  return mutateProducts((products) => {
    const index = products.findIndex((product) => product.id === productId);
    if (index === -1) throw new Error("Produit introuvable pour restaurer le stock.");

    const updatedProduct = synchronizeStock(products[index], products[index].stockQuantity + quantity);
    products[index] = updatedProduct;
    return updatedProduct;
  });
}

export function nextProductId(products: Product[]) {
  const largestId = products.reduce((largest, product) => {
    const id = Number(product.id);
    return Number.isInteger(id) ? Math.max(largest, id) : largest;
  }, 0);

  return String(largestId + 1);
}
