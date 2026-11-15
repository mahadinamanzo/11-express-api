import * as productsService from "../services/products.service.js";

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
      return res.status(404).json({ error: { message: "Product not found" } });
    }

    res.json({ data: product });
  } catch (error) {
    next(error);
  }
}
