import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const getRoutineContext = internalQuery({
  args:{sessionId:v.string(),routineId:v.id("routines")},
  handler: async(ctx,args)=>{
    const routine=await ctx.db.get(args.routineId);
    if(!routine || routine.sessionId!==args.sessionId) throw new Error("Routine not found");
    const days=await ctx.db.query("routineDays").withIndex("by_routine_and_day",q=>q.eq("routineId",args.routineId)).take(366);
    const messages=await ctx.db.query("messages").withIndex("by_routine",q=>q.eq("routineId",args.routineId)).order("desc").take(10);
    const done=days.filter(day=>day.state==="done").length;
    const partial=days.filter(day=>day.state==="partial").length;
    const skip=days.filter(day=>day.state==="skip").length;
    const consistency=Math.round(((done+partial*.5)/Math.max(1,done+partial+skip))*100);
    return {routine,stats:{done,partial,skip,consistency},messages:messages.reverse()};
  }
});

export const getSession = internalQuery({
  args:{sessionId:v.string()},
  handler: async(ctx,{sessionId})=>ctx.db.query("sessions").withIndex("by_session",q=>q.eq("sessionId",sessionId)).unique()
});

export const saveInbox = internalMutation({
  args:{sessionId:v.string(),inboxId:v.string(),email:v.string()},
  handler: async(ctx,args)=>{
    const existing=await ctx.db.query("sessions").withIndex("by_session",q=>q.eq("sessionId",args.sessionId)).unique();
    if(existing) return ctx.db.patch(existing._id,{inboxId:args.inboxId,email:args.email});
    return ctx.db.insert("sessions",{...args,createdAt:Date.now()});
  }
});

export const saveOutbound = internalMutation({
  args:{sessionId:v.string(),outboundId:v.string()},
  handler: async(ctx,args)=>{
    const existing=await ctx.db.query("sessions").withIndex("by_session",q=>q.eq("sessionId",args.sessionId)).unique();
    if(!existing) throw new Error("Email session was not created.");
    await ctx.db.patch(existing._id,{outboundId:args.outboundId});
  }
});

export const onMessageReceived = internalMutation({
  args:{message:v.any(),thread:v.any(),eventId:v.string()},
  handler: async(ctx,args)=>{
    const message:any=args.message||{};
    const inboxId=String(message.inbox_id || message.inboxId || "");
    if(!inboxId) return;
    const session=await ctx.db.query("sessions").withIndex("by_inbox",q=>q.eq("inboxId",inboxId)).unique();
    if(!session) return;
    await ctx.db.insert("inboundLetters",{
      sessionId:session.sessionId,
      inboxId,
      from:String(message.from || message.sender || "Email reply").slice(0,254),
      subject:String(message.subject || "Reply to FutureOS").slice(0,200),
      text:String(message.text || message.extracted_text || "").slice(0,5_000),
      createdAt:Date.now()
    });
  }
});
