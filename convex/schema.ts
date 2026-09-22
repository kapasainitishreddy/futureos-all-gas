import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    sessionId: v.string(),
    inboxId: v.optional(v.string()),
    email: v.optional(v.string()),
    outboundId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId"])
    .index("by_inbox", ["inboxId"]),

  routines: defineTable({
    sessionId: v.string(),
    title: v.string(),
    domain: v.string(),
    days: v.number(),
    dailyTarget: v.number(),
    unit: v.string(),
    why: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  routineDays: defineTable({
    sessionId: v.string(),
    routineId: v.id("routines"),
    dayKey: v.string(),
    state: v.union(v.literal("done"), v.literal("partial"), v.literal("skip")),
    note: v.string(),
    createdAt: v.number(),
  })
    .index("by_routine_and_day", ["routineId", "dayKey"])
    .index("by_session", ["sessionId"]),

  messages: defineTable({
    sessionId: v.string(),
    routineId: v.id("routines"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    provider: v.optional(v.union(v.literal("openai"), v.literal("fallback"))),
    providerError: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_routine", ["routineId", "createdAt"]),

  research: defineTable({
    sessionId: v.string(),
    routineId: v.id("routines"),
    query: v.string(),
    items: v.array(v.object({
      title: v.string(),
      url: v.string(),
      description: v.string(),
    })),
    createdAt: v.number(),
  }).index("by_routine", ["routineId", "createdAt"]),

  inboundLetters: defineTable({
    sessionId: v.string(),
    inboxId: v.string(),
    from: v.string(),
    subject: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_session", ["sessionId", "createdAt"]),
});
