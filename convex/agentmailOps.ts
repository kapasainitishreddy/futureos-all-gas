import { AgentMail } from "@agentmail/convex";
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";

const agentmail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.mailStore.onMessageReceived,
});

export const enqueueLetter = internalMutation({
  args:{inboxId:v.string(),to:v.string(),subject:v.string(),text:v.string()},
  handler: async(ctx,args)=>agentmail.sendMessage(ctx,args.inboxId,{
    to:args.to,
    subject:args.subject,
    text:args.text,
    labels:["futureos","future-self-letter"]
  })
});
