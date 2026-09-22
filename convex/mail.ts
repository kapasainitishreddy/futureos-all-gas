import { AgentMail, type OutboundId, vOutboundId } from "@agentmail/convex";
import { v } from "convex/values";
import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { components, internal } from "./_generated/api";

const agentmail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.mail.onMessageReceived,
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

export const deliveryStatus = query({
  args:{outboundId:vOutboundId},
  handler: async(ctx,{outboundId})=>agentmail.status(ctx,outboundId as OutboundId)
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

export const sendFutureLetter = action({
  args:{sessionId:v.string(),routineId:v.id("routines"),email:v.string(),name:v.string()},
  handler: async(ctx,args)=>{
    if(!/^\S+@\S+\.\S+$/.test(args.email)) throw new Error("Enter a valid email address.");
    const c=await ctx.runQuery(internal.futureLab.context,{sessionId:args.sessionId,routineId:args.routineId});
    const session=await ctx.runQuery(internal.mail.getSession,{sessionId:args.sessionId});
    let inboxId=session?.inboxId;
    if(!inboxId){
      const created:any=await agentmail.createInbox(ctx,{
        username:`futureos-${args.sessionId.replace(/[^a-z0-9]/gi,"").slice(0,12).toLowerCase()}`,
        displayName:"FutureOS — Future You"
      });
      inboxId=String(created?.inbox_id || created?.inboxId || created?.id || "");
      if(!inboxId) throw new Error("AgentMail inbox creation did not return an inbox id.");
      await ctx.runMutation(internal.mail.saveInbox,{sessionId:args.sessionId,inboxId,email:args.email});
    }
    const apiKey=process.env.OPENAI_API_KEY;
    let text=`${args.name},\n\nI’m the Day ${c.routine.days} branch of you. I’m not a prediction. I’m a reminder that today’s ${c.routine.dailyTarget} ${c.routine.unit} is the only part of this story you can control.\n\nYou do not need a perfect streak. Resume.\n\n— Future You, via FutureOS`;
    let generationProvider:"openai"|"fallback"="fallback";
    let generationError:string|undefined;
    if(apiKey){
      try{
        const response=await fetch("https://api.openai.com/v1/responses",{
          method:"POST",
          headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},
          body:JSON.stringify({
            model:process.env.OPENAI_FUTURE_MODEL || "gpt-5.6-luna",
            max_output_tokens:420,
            reasoning:{effort:"low"},
            store:false,
            safety_identifier:args.sessionId.slice(0,64),
            instructions:"Write a warm email of at most 180 words from a plausible future self after the user's chosen routine. Never claim certainty or guarantee medical, sexual, romantic, career, financial, appearance, or psychological outcomes. Never invent another person's decisions. End with one concrete action for today.",
            input:JSON.stringify({name:args.name,routine:c.routine,stats:c.stats})
          })
        });
        if(response.ok){const data:any=await response.json();if(data.output_text){text=data.output_text;generationProvider="openai";}}
        else generationError=`OpenAI returned ${response.status}.`;
      }catch(error){generationError=error instanceof Error?error.message:"OpenAI request failed.";}
    }else generationError="OPENAI_API_KEY is not configured.";
    const outboundId=await ctx.runMutation(internal.mail.enqueueLetter,{inboxId,to:args.email,subject:`A letter from Day ${c.routine.days} You`,text});
    await ctx.runMutation(internal.mail.saveOutbound,{sessionId:args.sessionId,outboundId:String(outboundId)});
    return {queued:true,outboundId:String(outboundId),inboxId,generationProvider,generationError};
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
      from:String(message.from || message.sender || "Email reply"),
      subject:String(message.subject || "Reply to FutureOS"),
      text:String(message.text || message.extracted_text || ""),
      createdAt:Date.now()
    });
  }
});
