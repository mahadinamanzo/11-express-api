import * as productsService from "../services/products.service.js";
import HttpError from "../errors/http-error.js";

const allowedFields = new Set(["name", "sku", "category", "price", "stock"]);
const allowedCategories = new Set(["Accessories", "Audio", "Displays", "Power", "Video"]);
const skuPattern = /^[A-Z]{3}-\d{4}$/;

export async function validateProduct(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return next(
      new HttpError(422, "Product validation failed", {
        body: "Request body must be a JSON object.",
      }),
    );
  }

  const fields = Object.create(null);
  const isPartial = req.method === "PATCH";
  const values = {};

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      fields[key] = "This field is not allowed.";
    } else {
      values[key] = body[key];
    }
  }

  if (isPartial && Object.keys(values).length === 0) {
    fields.body = "At least one product field is required.";
  }

  for (const field of allowedFields) {
    if (!isPartial && !Object.prototype.hasOwnProperty.call(values, field)) {
      fields[field] = "This field is required.";
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(values, field)) {
      continue;
    }

    const value = values[field];

    if (field === "name") {
      if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 100) {
        fields.name = "Name must be between 2 and 100 characters.";
      } else {
        values.name = value.trim();
      }
    } else if (field === "sku") {
      if (typeof value !== "string" || !skuPattern.test(value)) {
        fields.sku = "SKU must match the pattern ABC-1234.";
      }
    } else if (field === "category") {
      if (typeof value !== "string" || !allowedCategories.has(value)) {
        fields.category = `Category must be one of: ${[...allowedCategories].join(", ")}.`;
      }
    } else if (field === "price") {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        fields.price = "Price must be a number greater than 0.";
      }
    } else if (field === "stock") {
      if (!Number.isInteger(value) || value < 0) {
        fields.stock = "Stock must be an integer greater than or equal to 0.";
      }
    }
  }

  if (typeof values.sku === "string" && skuPattern.test(values.sku)) {
    try {
      if (await productsService.isSkuTaken(values.sku, req.params.id)) {
        fields.sku = "SKU must be unique.";
      }
    } catch (error) {
      return next(error);
    }
  }

  if (Object.keys(fields).length > 0) {
    return next(new HttpError(422, "Product validation failed", fields));
  }

  req.validatedProduct = values;
  next();
}
