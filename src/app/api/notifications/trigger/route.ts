/**
 * @openapi
 * /api/notifications/trigger:
 *   post:
 *     tags:
 *       - Notifications
 *     summary: Send a push notification to a specific user (admin only)
 *     description: Sends a Firebase Cloud Messaging notification to all stored device tokens for the given user. Invalid or unregistered tokens will be removed.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Target user's UUID
 *               title:
 *                 type: string
 *                 description: Notification title
 *               body:
 *                 type: string
 *                 description: Notification body
 *               data:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 description: Optional key/value payload delivered to the app
 *             required:
 *               - userId
 *               - title
 *               - body
 *     responses:
 *       200:
 *         description: Notification send result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *       400:
 *         description: Bad request (invalid body)
 *       401:
 *         description: Unauthorized (invalid or missing JWT)
 *       403:
 *         description: Forbidden (user not admin)
 *       500:
 *         description: Internal server error
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { sendNotificationToUser } from "@/lib/notifications";
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

    // Only admin can trigger arbitrary notifications
    if (currentUser.role !== "ROLE_A") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const userId = ensureNonEmptyString(body.userId, "userId");
    const title = ensureNonEmptyString(body.title, "title");
    const message = ensureNonEmptyString(body.body, "body");
    const data = (body.data && typeof body.data === "object") ? body.data : undefined;

    const res = await sendNotificationToUser(userId, { title, body: message, data });

    return NextResponse.json({ result: res });
  } catch (err: any) {
    console.error("Notification trigger error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: err?.status || 500 });
  }
}
