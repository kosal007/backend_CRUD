import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fcm } from "./firebaseAdmin";

type NotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

export async function getTokensForUser(userId: string): Promise<string[]> {
  const rows = await db.query.deviceTokens.findMany({
    where: eq(deviceTokens.userId, userId),
  });
  return rows.map((r) => r.token);
}

export async function removeToken(token: string) {
  try {
    await db.delete(deviceTokens).where(eq(deviceTokens.token, token));
  } catch (err) {
    console.error("Error removing token", token, err);
  }
}

export async function sendNotificationToUser(userId: string, payload: NotificationPayload) {
  const tokens = await getTokensForUser(userId);
  if (!tokens || tokens.length === 0) {
    return { success: false, reason: "no_tokens" };
  }

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
  } as const;

  try {
    const response = await fcm.sendMulticast(message as any);

    const failedTokens: string[] = [];

    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const err = res.error as any;
        const code = err?.code || err?.errorInfo?.code || "";
        // Remove tokens that are invalid or not registered anymore
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/mismatched-credential"
        ) {
          failedTokens.push(tokens[idx]);
        }
      }
    });

    if (failedTokens.length > 0) {
      await Promise.all(failedTokens.map((t) => removeToken(t)));
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      removedTokens: failedTokens,
    };
  } catch (err) {
    // Log full error details (including non-enumerable props) to aid debugging
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const util = require("util");
      console.error("FCM send error (detailed):", util.inspect(err, { depth: null }));
    } catch (e) {
      console.error("FCM send error:", err);
    }

    return { success: false, reason: "fcm_error", error: err };
  }
}
