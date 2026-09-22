import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const operation = v.union(
  v.literal("chat"),
  v.literal("research"),
  v.literal("email"),
);

const POLICY = {
  chat: { cooldownMs: 10_000, dailyMax: 20, globalDailyMax: 250 },
  research: { cooldownMs: 60_000, dailyMax: 5, globalDailyMax: 50 },
  email: { cooldownMs: 5 * 60_000, dailyMax: 3, globalDailyMax: 25 },
} as const;

export const consume = internalMutation({
  args: { sessionId: v.string(), operation },
  handler: async (ctx, { sessionId, operation }) => {
    if (!sessionId || sessionId.length > 128) throw new Error("Invalid session.");

    const now = Date.now();
    const windowKey = new Date(now).toISOString().slice(0, 10);
    const policy = POLICY[operation];
    const global = await ctx.db
      .query("usageLimits")
      .withIndex("by_session_and_operation", (q) =>
        q.eq("sessionId", "__global__").eq("operation", operation),
      )
      .unique();
    const existing = await ctx.db
      .query("usageLimits")
      .withIndex("by_session_and_operation", (q) =>
        q.eq("sessionId", sessionId).eq("operation", operation),
      )
      .unique();

    const globalCount = global?.windowKey === windowKey ? global.count : 0;
    if (globalCount >= policy.globalDailyMax) {
      throw new Error("This demo's sponsor budget is closed for today. Try again tomorrow.");
    }

    if (!existing) {
      await ctx.db.insert("usageLimits", {
        sessionId,
        operation,
        windowKey,
        count: 1,
        lastAt: now,
      });
      if (global) await ctx.db.patch(global._id, { windowKey, count: globalCount + 1, lastAt: now });
      else await ctx.db.insert("usageLimits", { sessionId: "__global__", operation, windowKey, count: 1, lastAt: now });
      return;
    }

    const count = existing.windowKey === windowKey ? existing.count : 0;
    if (now - existing.lastAt < policy.cooldownMs) {
      throw new Error("Please wait a moment before trying that again.");
    }
    if (count >= policy.dailyMax) {
      throw new Error("This demo's daily usage limit has been reached. Try again tomorrow.");
    }

    await ctx.db.patch(existing._id, {
      windowKey,
      count: count + 1,
      lastAt: now,
    });
    if (global) await ctx.db.patch(global._id, { windowKey, count: globalCount + 1, lastAt: now });
    else await ctx.db.insert("usageLimits", { sessionId: "__global__", operation, windowKey, count: 1, lastAt: now });
  },
});
