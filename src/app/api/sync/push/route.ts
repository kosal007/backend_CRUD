import { and, eq, lt } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
import {
  ApiError,
  ensureNonEmptyString,
  ensureObject,
  ensurePrice,
  ensureTimestamp,
  ensureUuid,
  readJsonBody,
  toApiError,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IncomingProduct = {
  id: unknown;
  name: unknown;
  price: unknown;
  updated_at: unknown;
};

type SyncPushPayload = {
  changes?: {
    products?: {
      created?: unknown;
      updated?: unknown;
      deleted?: unknown;
    };
  };
};

type ProductDeleteChange =
  | string
  | {
      id: unknown;
      updated_at?: unknown;
    };

function normalizeUuidInput(value: unknown, fieldName = "id"): string {
  if (typeof value !== "string") {
    throw new ApiError(`${fieldName} must be a valid UUID.`, 400);
  }

  const trimmed = value.trim();
  const direct = trimmed.replace(/[{}]/g, "");

  if (direct.includes("#")) {
    const suffix = direct.split("#").pop() ?? "";
    return ensureUuid(suffix, fieldName);
  }

  const match = direct.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/
  );

  if (match) {
    return ensureUuid(match[0], fieldName);
  }

  return ensureUuid(direct, fieldName);
}

function normalizeProduct(input: unknown): {
  id: string;
  name: string;
  price: number;
  updatedAt: number;
} {
  const product = ensureObject(input, "product") as IncomingProduct;

  return {
    id: normalizeUuidInput(product.id),
    name: ensureNonEmptyString(product.name, "name"),
    price: ensurePrice(product.price),
    updatedAt: ensureTimestamp(product.updated_at),
  };
}

function normalizeDeleted(input: ProductDeleteChange): {
  id: string;
  updatedAt: number;
} {
  if (typeof input === "string") {
    return { id: normalizeUuidInput(input), updatedAt: Date.now() };
  }

  const payload = ensureObject(input, "deleted product");
  const id = normalizeUuidInput(payload.id);
  const updatedAt =
    payload.updated_at === undefined
      ? Date.now()
      : ensureTimestamp(payload.updated_at, "updated_at");

  return { id, updatedAt };
}

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<SyncPushPayload>(request);
    const changes = ensureObject(payload.changes ?? {}, "changes");
    const productChanges = ensureObject(changes.products ?? {}, "changes.products");

    const createdRaw = productChanges.created ?? [];
    const updatedRaw = productChanges.updated ?? [];
    const deletedRaw = productChanges.deleted ?? [];

    if (!Array.isArray(createdRaw) || !Array.isArray(updatedRaw) || !Array.isArray(deletedRaw)) {
      throw new ApiError("changes.products.created/updated/deleted must be arrays.", 400);
    }

    const created = createdRaw.map(normalizeProduct);
    const updated = updatedRaw.map(normalizeProduct);
    const deleted = deletedRaw.map((item) => normalizeDeleted(item as ProductDeleteChange));

    await db.transaction(async (tx) => {
      for (const incoming of created) {
        const now = Date.now();
        const [existing] = await tx
          .select({ updatedAt: products.updatedAt })
          .from(products)
          .where(eq(products.id, incoming.id))
          .limit(1);

        if (!existing) {
          await tx.insert(products).values({
            id: incoming.id,
            name: incoming.name,
            price: incoming.price,
            updatedAt: incoming.updatedAt,
            deleted: false,
          });
          continue;
        }

        if (incoming.updatedAt >= existing.updatedAt) {
          await tx
            .update(products)
            .set({
              name: incoming.name,
              price: incoming.price,
              updatedAt: now,
              deleted: false,
            })
            .where(eq(products.id, incoming.id));
        }
      }

      for (const incoming of updated) {
        const now = Date.now();
        const [result] = await tx
          .update(products)
          .set({
            name: incoming.name,
            price: incoming.price,
            updatedAt: now,
            deleted: false,
          })
          .where(and(eq(products.id, incoming.id), lt(products.updatedAt, incoming.updatedAt + 1)))
          .returning({ id: products.id });

        if (!result) {
          const [existing] = await tx
            .select({ id: products.id })
            .from(products)
            .where(eq(products.id, incoming.id))
            .limit(1);

          if (!existing) {
            await tx.insert(products).values({
              id: incoming.id,
              name: incoming.name,
              price: incoming.price,
              updatedAt: incoming.updatedAt,
              deleted: false,
            });
          }
        }
      }

      for (const incoming of deleted) {
        const now = Date.now();
        await tx
          .update(products)
          .set({
            deleted: true,
            updatedAt: now,
          })
          .where(and(eq(products.id, incoming.id), lt(products.updatedAt, incoming.updatedAt + 1)));
      }
    });

    return NextResponse.json({ success: true, timestamp: Date.now() }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
