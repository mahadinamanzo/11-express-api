import { readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import HttpError from "../errors/http-error.js";

const productsFile = new URL("../data/products.json", import.meta.url);
const productsFilePath = fileURLToPath(productsFile);
let pendingWrites = Promise.resolve();

async function readProducts() {
  const contents = await readFile(productsFilePath, "utf8");
  return JSON.parse(contents);
}

function serializeWrite(operation) {
  const result = pendingWrites.then(operation);
  pendingWrites = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function writeProducts(products) {
  const temporaryPath = `${productsFilePath}.${randomUUID()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(products, null, 2)}\n`, "utf8");
  await rename(temporaryPath, productsFilePath);
}

function assertUniqueSku(products, sku, excludedId) {
  if (products.some((product) => product.sku === sku && product.id !== excludedId)) {
    throw new HttpError(422, "Product validation failed", {
      sku: "SKU must be unique.",
    });
  }
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

export async function isSkuTaken(sku, excludedId) {
  const products = await readProducts();
  return products.some((product) => product.sku === sku && product.id !== excludedId);
}

export function createProduct(product) {
  return serializeWrite(async () => {
    const products = await readProducts();
    assertUniqueSku(products, product.sku);

    const createdProduct = {
      id: randomUUID(),
      ...product,
      createdAt: new Date().toISOString(),
    };

    products.push(createdProduct);
    await writeProducts(products);
    return createdProduct;
  });
}

export function replaceProduct(id, product) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    assertUniqueSku(products, product.sku, id);
    const replacedProduct = {
      id,
      ...product,
      createdAt: products[index].createdAt,
    };
    products[index] = replacedProduct;
    await writeProducts(products);
    return replacedProduct;
  });
}

export function patchProduct(id, updates) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      return null;
    }

    const updatedProduct = { ...products[index], ...updates };
    assertUniqueSku(products, updatedProduct.sku, id);
    products[index] = updatedProduct;
    await writeProducts(products);
    return updatedProduct;
  });
}

export function deleteProduct(id) {
  return serializeWrite(async () => {
    const products = await readProducts();
    const index = products.findIndex((item) => item.id === id);
    if (index === -1) {
      return false;
    }

    products.splice(index, 1);
    await writeProducts(products);
    return true;
  });
}
