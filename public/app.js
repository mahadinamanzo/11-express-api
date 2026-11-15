import { ApiError, request } from "./api.js";

const elements = {
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  sort: document.querySelector("#sortFilter"),
  table: document.querySelector("#productTable"),
  tableContainer: document.querySelector("#tableContainer"),
  rows: document.querySelector("#productRows"),
  loading: document.querySelector("#loadingState"),
  empty: document.querySelector("#emptyState"),
  emptyMessage: document.querySelector("#emptyMessage"),
  error: document.querySelector("#errorState"),
  loadErrorMessage: document.querySelector("#loadErrorMessage"),
  retry: document.querySelector("#retryButton"),
  resultCount: document.querySelector("#resultCount"),
  dialog: document.querySelector("#productDialog"),
  openDialog: document.querySelector("#openProductDialog"),
  closeDialog: document.querySelector("#closeProductDialog"),
  cancelDialog: document.querySelector("#cancelProductDialog"),
  form: document.querySelector("#productForm"),
  formFeedback: document.querySelector("#formFeedback"),
  submitProduct: document.querySelector("#submitProduct"),
  toast: document.querySelector("#toast"),
};

const priceFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const avatarColors = [
  ["#eef0ff", "#5265e8"],
  ["#e8f6f1", "#218261"],
  ["#fff3e8", "#bd7732"],
  ["#f8eefa", "#9a59ad"],
  ["#eaf4fb", "#397ba5"],
];

let products = [];
let searchTimer;
let latestLoad = 0;
let toastTimer;
const pendingStockChanges = new Set();
const pendingDeletes = new Set();

function showToast(message, type = "success") {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle("toast-error", type === "error");
  elements.toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 3500);
}

function setLoading(isLoading) {
  elements.loading.hidden = !isLoading;
  elements.tableContainer.hidden = isLoading;
  elements.empty.hidden = true;
  elements.error.hidden = true;
  elements.table.setAttribute("aria-busy", String(isLoading));
}

function updateResultCount() {
  const count = products.length;
  elements.resultCount.textContent = `${count} ${count === 1 ? "product" : "products"}`;
}

function createCell(className = "") {
  const cell = document.createElement("td");
  if (className) {
    cell.className = className;
  }
  return cell;
}

function renderRows() {
  elements.rows.replaceChildren();

  for (const product of products) {
    const row = document.createElement("tr");
    const productCell = createCell();
    const productInfo = document.createElement("div");
    productInfo.className = "product-cell";

    const avatar = document.createElement("span");
    avatar.className = "product-initial";
    avatar.textContent = product.name.trim().charAt(0).toUpperCase();
    const colors = avatarColors[product.name.length % avatarColors.length];
    avatar.style.setProperty("--initial-bg", colors[0]);
    avatar.style.setProperty("--initial-color", colors[1]);
    avatar.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    const name = document.createElement("span");
    name.className = "product-name";
    name.textContent = product.name;
    const sku = document.createElement("span");
    sku.className = "product-sku";
    sku.textContent = product.sku;
    text.append(name, sku);
    productInfo.append(avatar, text);
    productCell.append(productInfo);
    row.append(productCell);

    const categoryCell = createCell();
    const category = document.createElement("span");
    category.className = "category-pill";
    category.textContent = product.category;
    categoryCell.append(category);
    row.append(categoryCell);

    const priceCell = createCell("price-cell");
    priceCell.textContent = priceFormat.format(product.price);
    row.append(priceCell);

    const stockCell = createCell();
    const stockControl = document.createElement("div");
    stockControl.className = "stock-control";
    const decrement = document.createElement("button");
    decrement.className = "stock-button";
    decrement.type = "button";
    decrement.textContent = "−";
    decrement.dataset.action = "decrement";
    decrement.dataset.productId = product.id;
    decrement.disabled = product.stock === 0 || pendingStockChanges.has(product.id);
    decrement.setAttribute("aria-label", `Decrease stock for ${product.name}`);

    const stock = document.createElement("span");
    stock.className = "stock-value";
    stock.textContent = String(product.stock);
    stock.setAttribute("aria-label", `${product.stock} in stock`);

    const increment = document.createElement("button");
    increment.className = "stock-button";
    increment.type = "button";
    increment.textContent = "+";
    increment.dataset.action = "increment";
    increment.dataset.productId = product.id;
    increment.disabled = pendingStockChanges.has(product.id);
    increment.setAttribute("aria-label", `Increase stock for ${product.name}`);
    stockControl.append(decrement, stock, increment);
    stockCell.append(stockControl);
    row.append(stockCell);

    const actionCell = createCell();
    const actionGroup = document.createElement("div");
    actionGroup.className = "action-group";
    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.productId = product.id;
    deleteButton.disabled = pendingDeletes.has(product.id);
    deleteButton.setAttribute("aria-label", `Delete ${product.name}`);
    const deleteIcon = document.createElement("span");
    deleteIcon.className = "delete-icon";
    deleteIcon.setAttribute("aria-hidden", "true");
    deleteButton.append(deleteIcon);
    actionGroup.append(deleteButton);
    actionCell.append(actionGroup);
    row.append(actionCell);

    elements.rows.append(row);
  }

  updateResultCount();
}

function buildProductsUrl() {
  const params = new URLSearchParams();
  const query = elements.search.value.trim();

  if (query) {
    params.set("q", query);
  }
  if (elements.category.value) {
    params.set("category", elements.category.value);
  }
  if (elements.sort.value) {
    params.set("sort", elements.sort.value);
  }

  const search = params.toString();
  return search ? `/api/products?${search}` : "/api/products";
}

async function loadProducts() {
  const loadId = ++latestLoad;
  setLoading(true);

  try {
    const response = await request(buildProductsUrl());
    if (loadId !== latestLoad) {
      return;
    }

    products = response.data;
    elements.loading.hidden = true;
    elements.table.setAttribute("aria-busy", "false");

    if (products.length === 0) {
      elements.tableContainer.hidden = true;
      elements.emptyMessage.textContent =
        elements.search.value || elements.category.value
          ? "Try changing your search or filters."
          : "Add your first product to get started.";
      elements.empty.hidden = false;
      updateResultCount();
      return;
    }

    renderRows();
    elements.tableContainer.hidden = false;
  } catch (error) {
    if (loadId !== latestLoad) {
      return;
    }

    elements.loading.hidden = true;
    elements.tableContainer.hidden = true;
    elements.loadErrorMessage.textContent = error.message;
    elements.error.hidden = false;
    showToast(error.message, "error");
  }
}

function clearFieldErrors() {
  for (const fieldError of elements.form.querySelectorAll(".field-error")) {
    fieldError.textContent = "";
  }
  for (const control of elements.form.querySelectorAll("[aria-invalid]")) {
    control.removeAttribute("aria-invalid");
  }
  elements.formFeedback.hidden = true;
  elements.formFeedback.textContent = "";
}

function showFieldErrors(fields) {
  for (const [field, message] of Object.entries(fields)) {
    const input = elements.form.elements.namedItem(field);
    const messageElement = document.getElementById(`error-${field}`);

    if (input instanceof HTMLElement && messageElement) {
      input.setAttribute("aria-invalid", "true");
      messageElement.textContent = message;
    } else {
      elements.formFeedback.textContent = message;
      elements.formFeedback.hidden = false;
    }
  }
}

function resetProductForm() {
  elements.form.reset();
  clearFieldErrors();
  elements.submitProduct.disabled = false;
  elements.submitProduct.textContent = "Create product";
}

async function submitProduct(event) {
  event.preventDefault();
  clearFieldErrors();

  const formData = new FormData(elements.form);
  const product = {
    name: String(formData.get("name") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    category: formData.get("category"),
    price: Number(formData.get("price")),
    stock: Number(formData.get("stock")),
  };

  elements.submitProduct.disabled = true;
  elements.submitProduct.textContent = "Creating...";

  try {
    await request("/api/products", {
      method: "POST",
      body: JSON.stringify(product),
    });
    elements.dialog.close();
    resetProductForm();
    void loadProducts();
    showToast("Product added to your catalog.");
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      showFieldErrors(error.fields);
      if (!elements.formFeedback.textContent) {
        elements.formFeedback.textContent = error.message;
      }
      elements.formFeedback.hidden = false;
    } else {
      elements.formFeedback.textContent = error.message;
      elements.formFeedback.hidden = false;
    }
    showToast(error.message, "error");
  } finally {
    elements.submitProduct.disabled = false;
    elements.submitProduct.textContent = "Create product";
  }
}

async function changeStock(product, change) {
  if (pendingStockChanges.has(product.id)) {
    return;
  }

  const stock = product.stock + change;
  if (stock < 0) {
    return;
  }

  pendingStockChanges.add(product.id);
  renderRows();

  try {
    await request(`/api/products/${encodeURIComponent(product.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ stock }),
    });
    showToast("Stock level updated.");
    void loadProducts();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    pendingStockChanges.delete(product.id);
    renderRows();
  }
}

async function deleteProduct(product) {
  if (pendingDeletes.has(product.id)) {
    return;
  }
  if (!window.confirm(`Delete "${product.name}" from the catalog?`)) {
    return;
  }

  pendingDeletes.add(product.id);
  renderRows();

  try {
    await request(`/api/products/${encodeURIComponent(product.id)}`, {
      method: "DELETE",
    });
    showToast("Product deleted.");
    void loadProducts();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    pendingDeletes.delete(product.id);
    renderRows();
  }
}

elements.search.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    void loadProducts();
  }, 300);
});

for (const filter of [elements.category, elements.sort]) {
  filter.addEventListener("change", () => {
    window.clearTimeout(searchTimer);
    void loadProducts();
  });
}

elements.retry.addEventListener("click", () => {
  void loadProducts();
});

elements.openDialog.addEventListener("click", () => {
  resetProductForm();
  elements.dialog.showModal();
  elements.form.elements.namedItem("name").focus();
});

for (const button of [elements.closeDialog, elements.cancelDialog]) {
  button.addEventListener("click", () => {
    elements.dialog.close();
    resetProductForm();
  });
}

elements.dialog.addEventListener("close", resetProductForm);
elements.form.addEventListener("input", (event) => {
  const field = event.target.name;
  if (!field) {
    return;
  }
  const message = document.getElementById(`error-${field}`);
  if (message) {
    message.textContent = "";
    event.target.removeAttribute("aria-invalid");
  }
});
elements.form.addEventListener("submit", (event) => {
  void submitProduct(event);
});

elements.rows.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const product = products.find((item) => item.id === button.dataset.productId);
  if (!product) {
    return;
  }

  if (button.dataset.action === "increment") {
    void changeStock(product, 1);
  } else if (button.dataset.action === "decrement") {
    void changeStock(product, -1);
  } else if (button.dataset.action === "delete") {
    void deleteProduct(product);
  }
});

void loadProducts();
