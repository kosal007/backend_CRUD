import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { withRole } from "../../../../lib/withRole";
import { ensureNonEmptyString } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthenticatedRequest = Request & {
  user?: {
    userId?: string;
    sub?: string;
  };
};

type PushTokenBody = {
  token?: unknown;
};

export const POST = withRole(["ROLE_A", "ROLE_B"], async (req: AuthenticatedRequest) => {
  const body = (await req.json()) as PushTokenBody;
  const token = ensureNonEmptyString(body.token, "token");

  const userId = req.user?.userId ?? req.user?.sub;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await db
    .update(users)
    .set({ pushToken: token })
    .where(eq(users.id, userId));

  return NextResponse.json({ success: true });
});
