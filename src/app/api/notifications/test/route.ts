/**
 * @openapi
 * /api/notifications/test:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Send a test push notification to a specific FCM token (admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: FCM device token
 *               title:
 *                 type: string
 *               body:
 *                 type: string
 *               data:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Send result
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { fcm } from "@/lib/firebaseAdmin";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensureNonEmptyString } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jwt = authHeader.split(" ")[1];
    const currentUser = await verifyToken(jwt);
    if (!currentUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (currentUser.role !== "ROLE_A") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const token = ensureNonEmptyString(body.token, "token");
    const title = ensureNonEmptyString(body.title, "title");
    const message = ensureNonEmptyString(body.body, "body");
    const data = (body.data && typeof body.data === "object") ? body.data : undefined;

    const msg = {
      token,
      notification: {
        title,
        body: message,
      },
      data: data || {},
    } as const;

    try {
      const result = await fcm.send(msg as any);
      return NextResponse.json({ success: true, result });
    } catch (err: any) {
      console.error("FCM test send error:", err);
      const code = err?.code || err?.errorInfo?.code;

      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        try {
          await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
        } catch (delErr) {
          console.error("Failed to remove invalid token:", delErr);
        }
      }

      return NextResponse.json({ success: false, error: err?.message || err }, { status: 500 });
    }

  } catch (err: any) {
    console.error("Notification test endpoint error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
