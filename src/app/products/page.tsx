"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  price: number;
};

type ProductsResponse = {
  data: Product[];
};

type ApiErrorResponse = {
  error?: string;
};

function getApiErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== "object") {
    return undefined;
  }

  const maybeError = (data as ApiErrorResponse).error;
  return typeof maybeError === "string" && maybeError.length > 0
    ? maybeError
    : undefined;
}

async function parseResponseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    return null;
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const fetchProducts = async () => {
    console.log("Fetching products...");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "GET",
        cache: "no-store",
      });

      const data = await parseResponseJson<ProductsResponse | ApiErrorResponse>(res);
      console.log("Fetch products response:", data);

      if (!res.ok) {
        const message = getApiErrorMessage(data) ?? "Failed to fetch products.";
        throw new Error(message);
      }

      const result = data as ProductsResponse | null;
      setProducts(result?.data ?? []);
    } catch (err) {
      console.error("Fetch products failed:", err);
      setError("Could not load products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const handleAddProduct = async () => {
    console.log("Creating product...");
    const parsedPrice = Number(price);

    if (!name.trim() || Number.isNaN(parsedPrice)) {
      setError("Please enter a valid name and price.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        price: parsedPrice,
      };

      console.log("Create product payload:", payload);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponseJson<Record<string, unknown> | ApiErrorResponse>(res);
      console.log("Create product response:", data);

      if (!res.ok) {
        const message = getApiErrorMessage(data) ?? "Failed to add product.";
        throw new Error(message);
      }

      setName("");
      setPrice("");
      await fetchProducts();
    } catch (err) {
      console.error("Create product failed:", err);
      setError("Could not add product.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(String(product.price));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditPrice("");
  };

  const handleUpdateProduct = async (id: string) => {
    console.log("Updating product...", id);
    const parsedPrice = Number(editPrice);

    if (!editName.trim() || Number.isNaN(parsedPrice)) {
      setError("Please enter a valid name and price.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name: editName.trim(),
        price: parsedPrice,
      };

      console.log("Update product payload:", payload);

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseResponseJson<Record<string, unknown> | ApiErrorResponse>(res);
      console.log("Update product response:", data);

      if (!res.ok) {
        const message = getApiErrorMessage(data) ?? "Failed to update product.";
        throw new Error(message);
      }

      cancelEdit();
      await fetchProducts();
    } catch (err) {
      console.error("Update product failed:", err);
      setError("Could not update product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    console.log("Deleting product...", id);
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      const data = await parseResponseJson<Record<string, unknown> | ApiErrorResponse>(res);
      console.log("Delete product response:", data);

      if (!res.ok) {
        const message = getApiErrorMessage(data) ?? "Failed to delete product.";
        throw new Error(message);
      }

      if (editingId === id) {
        cancelEdit();
      }

      await fetchProducts();
    } catch (err) {
      console.error("Delete product failed:", err);
      setError("Could not delete product.");
    } finally {
      setSubmitting(false);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10"
    >
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Product Management
        </h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Manage your product catalog with fast CRUD actions and a clean dashboard
          workflow.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Add Product
        </h2>

        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:gap-4">
          <input
            type="text"
            placeholder="Product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 px-4 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 px-4 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />

          <motion.button
            whileHover={{ scale: submitting ? 1 : 1.03 }}
            whileTap={{ scale: submitting ? 1 : 0.97 }}
            type="button"
            onClick={handleAddProduct}
            disabled={submitting}
            className="h-11 rounded-xl bg-blue-500 px-4 font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? "Saving..." : "Add Product"}
          </motion.button>
        </div>
      </section>

      <AnimatePresence>
        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-center gap-3 text-slate-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            <span className="text-sm font-medium">Loading products...</span>
          </div>
        </section>
      ) : products.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-800">No products yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Add your first product using the form above.
          </p>
        </section>
      ) : (
        <motion.section
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.07 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {products.map((product) => {
            const isEditing = editingId === product.id;

            return (
              <motion.article
                key={product.id}
                variants={cardVariants}
                transition={{ duration: 0.24, ease: "easeOut" }}
                whileHover={{ y: -3 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <AnimatePresence mode="wait">
                  {isEditing ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Product Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Price
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <motion.button
                          whileHover={{ scale: submitting ? 1 : 1.03 }}
                          whileTap={{ scale: submitting ? 1 : 0.97 }}
                          type="button"
                          onClick={() => handleUpdateProduct(product.id)}
                          disabled={submitting}
                          className="rounded-xl bg-blue-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Save
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: submitting ? 1 : 1.03 }}
                          whileTap={{ scale: submitting ? 1 : 0.97 }}
                          type="button"
                          onClick={cancelEdit}
                          disabled={submitting}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </motion.button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="view"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <p className="text-lg font-semibold text-slate-900">{product.name}</p>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        ${product.price.toFixed(2)}
                      </p>

                      <div className="mt-4 flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: submitting ? 1 : 1.03 }}
                          whileTap={{ scale: submitting ? 1 : 0.97 }}
                          type="button"
                          onClick={() => startEdit(product)}
                          disabled={submitting}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
                        >
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: submitting ? 1 : 1.03 }}
                          whileTap={{ scale: submitting ? 1 : 0.97 }}
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          disabled={submitting}
                          className="rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Delete
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </motion.section>
      )}
    </motion.main>
  );
}
