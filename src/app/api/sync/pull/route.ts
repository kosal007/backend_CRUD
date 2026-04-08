import { gt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { products } from "@/db/schema";
import { parseLastPulledAt, toApiError } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductRecord = {
  id: string;
  name: string;
  price: number;
  updated_at: number;
};

export async function GET(request: NextRequest) {
  try {
    const lastPulledAt = parseLastPulledAt(
      request.nextUrl.searchParams.get("last_pulled_at")
    );

    const changedRows = await db
      .select()
      .from(products)
      .where(gt(products.updatedAt, lastPulledAt));

    const created: ProductRecord[] = [];
    const updated: ProductRecord[] = [];
    const deleted: string[] = [];

    for (const row of changedRows) {
      if (row.deleted) {
        deleted.push(row.id);
        continue;
      }
              
      const item = {
        id: row.id,
        name: row.name,
        price: row.price,
        updated_at: row.updatedAt,
      };

      if (lastPulledAt === 0) {
        created.push(item);
      } else {
        updated.push(item);
      }
    }

    return NextResponse.json(
      {
        changes: {
          products: {
            created,
            updated,
            deleted,
          },
        },
        timestamp: Date.now(),
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
