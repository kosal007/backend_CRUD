import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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

type CreateProductBody = {
  id?: string;
  name?: unknown;
  price?: unknown;
};

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(products)
      .where(eq(products.deleted, false))
      .orderBy(desc(products.updatedAt));

    return NextResponse.json({ data: rows }, { status: 200 });
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
 * /api/products:
 *   post:
 *     tags:
 *       - Product
 *     summary: Create a product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *             required:
 *               - name
 *               - price
 *     responses:
 *       201:
 *         description: Created product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Validation error
 */

export async function POST(request: Request) {
  try {
    const payload = await readJsonBody<CreateProductBody>(request);

    const id = payload.id ? ensureUuid(payload.id) : uuidv4();
    const name = ensureNonEmptyString(payload.name, "name");
    const price = ensurePrice(payload.price);
    const updatedAt = Date.now();

    const [inserted] = await db
      .insert(products)
      .values({
        id,
        name,
        price,
        updatedAt,
        deleted: false,
      })
      .returning();

    if (!inserted) {
      throw new ApiError("Failed to create product.", 500);
    }

    return NextResponse.json({ data: inserted }, { status: 201 });
  } catch (error) {
    const apiError = toApiError(error);
    return NextResponse.json(
      { error: apiError.message, details: apiError.details },
      { status: apiError.status }
    );
  }
}
