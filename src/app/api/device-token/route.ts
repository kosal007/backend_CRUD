import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq, and } from "drizzle-orm";
// import { verifyToken } from "@/lib/jwt"; // your JWT verify function
import { verifyToken } from "@/lib/auth"; // updated import for auth
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