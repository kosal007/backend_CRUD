import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
import {
  ApiError,
  ensureNonEmptyString,
  ensurePrice,
  ensureUuid,
  readJsonBody,
  toApiError,
} from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateProductBody = {
  name?: unknown;
  price?: unknown;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = ensureUuid(rawId);

    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.deleted, false)))
      .limit(1);

    if (!product) {
      throw new ApiError("Product not found.", 404);
    }

    return NextResponse.json({ data: product }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     tags:
 *       - Product
 *     summary: Get a product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Not found
 *
 *   put:
 *     tags:
 *       - Product
 *     summary: Update a product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 *
 *   delete:
 *     tags:
 *       - Product
 *     summary: Soft-delete a product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted (soft) product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     deleted:
 *                       type: boolean
 *                     updatedAt:
 *                       type: number
 */

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = ensureUuid(rawId);
    const payload = await readJsonBody<UpdateProductBody>(request);

    const updates: { name?: string; price?: number; updatedAt: number } = {
      updatedAt: Date.now(),
    };

    if (payload.name !== undefined) {
      updates.name = ensureNonEmptyString(payload.name, "name");
    }

    if (payload.price !== undefined) {
      updates.price = ensurePrice(payload.price);
    }

    if (updates.name === undefined && updates.price === undefined) {
      throw new ApiError("At least one field (name or price) is required.", 400);
    }

    const [updated] = await db
      .update(products)
      .set(updates)
      .where(and(eq(products.id, id), eq(products.deleted, false)))
      .returning();

    if (!updated) {
      throw new ApiError("Product not found.", 404);
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id: rawId } = await context.params;
    const id = ensureUuid(rawId);

    const [deletedRow] = await db
      .update(products)
      .set({
        deleted: true,
        updatedAt: Date.now(),
      })
      .where(and(eq(products.id, id), eq(products.deleted, false)))
      .returning();

    if (!deletedRow) {
      throw new ApiError("Product not found.", 404);
    }

    return NextResponse.json(
      {
        data: {
          id: deletedRow.id,
          deleted: deletedRow.deleted,
          updatedAt: deletedRow.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
