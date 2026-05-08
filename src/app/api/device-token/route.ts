/**
 * @openapi
 * /api/device-token:
 *   post:
 *     tags:
 *       - DeviceToken
 *     summary: Register a device push token for the current user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: "FCM device token (Firebase Cloud Messaging). This is NOT the user's auth JWT."
 *               platform:
 *                 type: string
 *                 description: 'ios or android'
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: Token registered (or already existed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: Bad request (missing token)
 *       401:
 *         description: Unauthorized (invalid or missing JWT)
 *
 *   get:
 *     tags:
 *       - DeviceToken
 *     summary: List device tokens for the current user (admin can list all)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: all
 *         schema:
 *           type: boolean
 *         description: If true and user is admin, return all tokens
 *     responses:
 *       200:
 *         description: List of device tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DeviceToken'
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     tags:
 *       - DeviceToken
 *     summary: Remove a device push token for the current user (logout)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: "FCM device token (Firebase Cloud Messaging). This is NOT the user's auth JWT."
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: Token deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
// import { verifyToken } from "@/lib/jwt"; // your JWT verify function
import { verifyToken } from "@/lib/auth"; // updated import for auth

export async function GET(req: NextRequest) {
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

    const url = new URL(req.url);
    const allParam = url.searchParams.get("all");

    let tokens;
    // If user has admin role (ROLE_A) and requested all, return all tokens
    if (allParam === "true" && currentUser.role === "ROLE_A") {
      tokens = await db.query.deviceTokens.findMany();
    } else {
      tokens = await db.query.deviceTokens.findMany({
        where: eq(deviceTokens.userId, currentUser.id),
      });
    }

    return NextResponse.json({ data: tokens }, { status: 200 });
  } catch (error) {
    console.error("Device token list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  try {
    // 1. Get token from header
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Verify JWT and get current user
    const jwt = authHeader.split(" ")[1];
    const currentUser = await verifyToken(jwt); // returns { id, email, role }
    if (!currentUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 3. Get FCM token from request body
    const { token, platform } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    // 4. Check if token already exists for this user
    const existing = await db.query.deviceTokens.findFirst({
      where: and(
        eq(deviceTokens.userId, currentUser.id),
        eq(deviceTokens.token, token)
      ),
    });

    // 5. Insert only if not duplicate
    if (!existing) {
      await db.insert(deviceTokens).values({
        userId: currentUser.id,
        token,
        platform, // 'ios' or 'android'
      });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Device token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — call this on logout
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jwt = authHeader.split(" ")[1];
    const currentUser = await verifyToken(jwt);
    if (!currentUser) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { token } = await req.json();

    // Delete specific device token on logout
    await db.delete(deviceTokens).where(
      and(
        eq(deviceTokens.userId, currentUser.id),
        eq(deviceTokens.token, token)
      )
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete token error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

