import { AgentMail, type OutboundId, vOutboundId } from "@agentmail/convex";
import { v } from "convex/values";
import { action, env, query } from "./_generated/server";
import { components, internal } from "./_generated/api";

const agentmail = new AgentMail(components.agentmail, {
  onMessageReceived: internal.mailStore.onMessageReceived,
});
// Keep generated letters on the same low-cost, broadly available API model as chat.
const MODEL = "gpt-4.1-nano";
const mailStore = internal.mailStore as any;
const agentmailOps = internal.agentmailOps as any;
const limitsInternal = internal.limits as any;

export const deliveryStatus = query({
  args:{outboundId:vOutboundId},
  handler: async(ctx,{outboundId})=>agentmail.status(ctx,outboundId as OutboundId)
});

export const sendFutureLetter = action({
  args:{sessionId:v.string(),routineId:v.id("routines"),email:v.string(),name:v.string()},
  handler: async(ctx,args)=>{
    const email=args.email.trim().toLowerCase();
    const name=args.name.trim();
    if(email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    if(!name || name.length>60) throw new Error("Name must be between 1 and 60 characters.");
    if(!args.sessionId || args.sessionId.length>128) throw new Error("Invalid session.");
    const c:any=await ctx.runQuery(mailStore.getRoutineContext,{sessionId:args.sessionId,routineId:args.routineId});
    await ctx.runMutation(limitsInternal.consume,{sessionId:args.sessionId,operation:"email"});
    const session:any=await ctx.runQuery(mailStore.getSession,{sessionId:args.sessionId});
    let inboxId:string|undefined=session?.inboxId;
    if(!inboxId){
      const created:any=await agentmail.createInbox(ctx,{
        username:`futureos-${args.sessionId.replace(/[^a-z0-9]/gi,"").slice(0,12).toLowerCase()}`,
        displayName:"FutureOS — Future You"
      });
      inboxId=String(created?.inbox_id || created?.inboxId || created?.id || "");
      if(!inboxId) throw new Error("AgentMail inbox creation did not return an inbox id.");
      await ctx.runMutation(mailStore.saveInbox,{sessionId:args.sessionId,inboxId,email});
    }
    let text=`${name},\n\nI’m the Day ${c.routine.days} branch of you. I’m not a prediction. I’m a reminder that today’s ${c.routine.dailyTarget} ${c.routine.unit} is the only part of this story you can control.\n\nYou do not need a perfect streak. Resume.\n\n— Future You, via FutureOS`;
    let generationProvider:"openai"|"fallback"="fallback";
    let generationError:string|undefined;
    try{
      const response=await fetch("https://api.openai.com/v1/responses",{
        method:"POST",
        headers:{"content-type":"application/json",authorization:`Bearer ${env.OPENAI_API_KEY}`},
        body:JSON.stringify({
          model:MODEL,
          max_output_tokens:280,
          store:false,
          safety_identifier:args.sessionId.slice(0,64),
          instructions:"Write a warm email under 130 words from a plausible future self after the chosen routine. Never claim certainty or guarantee outcomes. Never invent another person's decisions. End with one safe, concrete action for today.",
          input:JSON.stringify({name,routine:{title:c.routine.title,days:c.routine.days,dailyTarget:c.routine.dailyTarget,unit:c.routine.unit,why:c.routine.why.slice(0,160)},stats:c.stats})
        })
      });
      if(response.ok){const data:any=await response.json();if(data.output_text){text=data.output_text;generationProvider="openai";}}
      else generationError=`OpenAI returned ${response.status}.`;
    }catch{generationError="OpenAI request failed.";}
    text=text.trim().slice(0,2_000);
    const outboundId:any=await ctx.runMutation(agentmailOps.enqueueLetter,{inboxId,to:email,subject:`A letter from Day ${c.routine.days} You`,text});
    await ctx.runMutation(mailStore.saveOutbound,{sessionId:args.sessionId,outboundId:String(outboundId)});
    return {queued:true,outboundId:String(outboundId),inboxId,generationProvider,generationError};
  }
});
