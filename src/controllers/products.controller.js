import * as productsService from "../services/products.service.js";
import HttpError from "../errors/http-error.js";

export async function getProducts(req, res, next) {
  try {
    const products = await productsService.getProducts({
      category: req.query.category,
      q: req.query.q,
      sort: req.query.sort,
    });

    res.json({ data: products });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await productsService.getProductById(req.params.id);

    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    res.json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function createProduct(req, res, next) {
  try {
    const product = await productsService.createProduct(req.validatedProduct);
    res
      .status(201)
      .location(`/api/products/${encodeURIComponent(product.id)}`)
      .json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function replaceProduct(req, res, next) {
  try {
    const product = await productsService.replaceProduct(
      req.params.id,
      req.validatedProduct,
    );
    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    res.json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function patchProduct(req, res, next) {
  try {
    const product = await productsService.patchProduct(
      req.params.id,
      req.validatedProduct,
    );
    if (!product) {
      throw new HttpError(404, "Product not found");
    }

    res.json({ data: product });
  } catch (error) {
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const deleted = await productsService.deleteProduct(req.params.id);
    if (!deleted) {
      throw new HttpError(404, "Product not found");
    }

    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
