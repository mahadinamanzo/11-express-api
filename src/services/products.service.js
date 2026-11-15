import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const productsFile = new URL("../data/products.json", import.meta.url);

async function readProducts() {
  const contents = await readFile(fileURLToPath(productsFile), "utf8");
  return JSON.parse(contents);
}

export async function getProducts({ category, q, sort } = {}) {
  let products = await readProducts();

  if (typeof category === "string" && category.trim()) {
    const normalizedCategory = category.trim().toLowerCase();
    products = products.filter(
      (product) => product.category.toLowerCase() === normalizedCategory,
    );
  }

  if (typeof q === "string" && q.trim()) {
    const query = q.trim().toLowerCase();
    products = products.filter((product) =>
      [product.name, product.sku, product.category].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }

  if (sort === "price" || sort === "-price") {
    const direction = sort === "price" ? 1 : -1;
    products.sort((a, b) => direction * (a.price - b.price));
  }

  return products;
}

export async function getProductById(id) {
  const products = await readProducts();
  return products.find((product) => product.id === id) ?? null;
}
