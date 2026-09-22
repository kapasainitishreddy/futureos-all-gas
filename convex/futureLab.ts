import { v } from "convex/values";
import { action, env, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const dayState = v.union(v.literal("done"), v.literal("partial"), v.literal("skip"));
const MODEL = "gpt-5.6-luna";
const futureLabInternal = internal.futureLab as any;
const limitsInternal = internal.limits as any;

function bounded(value:string,label:string,max:number){
  const clean=value.trim();
  if(!clean || clean.length>max) throw new Error(`${label} must be between 1 and ${max} characters.`);
  return clean;
}

function validSession(sessionId:string){
  if(!sessionId || sessionId.length>128) throw new Error("Invalid session.");
}

function storyFor(routine: any) {
  const checkpoints = [...new Set([1, Math.max(2, Math.ceil(routine.days / 3)), Math.max(3, Math.ceil(routine.days * 2 / 3)), routine.days])];
  return checkpoints.map((day, index) => ({
    day,
    title: index === 0 ? "The first vote" : index === checkpoints.length - 1 ? "The handoff" : "The ordinary middle",
    scene: index === 0
      ? `Day ${day}. Nothing magical has happened. You simply did the controllable thing once, which is exactly how this branch starts.`
      : index === checkpoints.length - 1
        ? `Day ${day}. This version of you was built from repeated evidence, not a perfect streak. The useful question is what you want to carry forward.`
        : `Day ${day}. Novelty is gone. Some days were complete, some partial, some missed. The branch stays alive because a miss becomes information instead of identity.`,
    lesson: index === checkpoints.length - 1
      ? "Keep what became useful. Release the scoreboard."
      : "Return to today. Make the next action small enough to actually do.",
  }));
}

function statsFor(days:any[]) {
  const done=days.filter((d:any)=>d.state==="done").length;
  const partial=days.filter((d:any)=>d.state==="partial").length;
  const skip=days.filter((d:any)=>d.state==="skip").length;
  const denominator=Math.max(1,done+partial+skip);
  const consistency=Math.round(((done+partial*.5)/denominator)*100);
  return {done,partial,skip,consistency};
}

export const snapshot = query({
  args: { sessionId: v.string(), dayKey: v.string() },
  handler: async (ctx, {sessionId, dayKey}) => {
    const routines = await ctx.db.query("routines").withIndex("by_session", q=>q.eq("sessionId",sessionId)).collect();
    const selected = routines.find(r=>r.active) ?? routines.at(-1) ?? null;
    if(!selected) return {routines,selected:null,stats:null,todayState:null,story:[],messages:[],research:null,inbound:[]};
    const days = await ctx.db.query("routineDays").withIndex("by_routine_and_day",q=>q.eq("routineId",selected._id)).collect();
    const messages = await ctx.db.query("messages").withIndex("by_routine",q=>q.eq("routineId",selected._id)).order("asc").take(30);
    const research = await ctx.db.query("research").withIndex("by_routine",q=>q.eq("routineId",selected._id)).order("desc").first();
    const inbound = await ctx.db.query("inboundLetters").withIndex("by_session",q=>q.eq("sessionId",sessionId)).order("desc").take(5);
    const stats=statsFor(days);
    const todayState=days.find(day=>day.dayKey===dayKey)?.state ?? null;
    return {routines,selected,stats,todayState,story:storyFor(selected),messages,research,inbound};
  }
});

export const createRoutine = mutation({
  args: {
    sessionId:v.string(), title:v.string(), domain:v.string(), days:v.number(),
    dailyTarget:v.number(), unit:v.string(), why:v.string(),
  },
  handler: async (ctx,args) => {
    validSession(args.sessionId);
    const title=bounded(args.title,"Title",80);
    const domain=bounded(args.domain,"Domain",40);
    const unit=bounded(args.unit,"Unit",40);
    const why=bounded(args.why,"Reason",240);
    if(!Number.isInteger(args.days) || args.days<1 || args.days>365) throw new Error("Days must be between 1 and 365.");
    if(!Number.isFinite(args.dailyTarget) || args.dailyTarget<=0 || args.dailyTarget>10_000) throw new Error("Daily target is outside the allowed range.");
    const old=await ctx.db.query("routines").withIndex("by_session",q=>q.eq("sessionId",args.sessionId)).collect();
    if(old.length>=8) throw new Error("This demo supports up to eight branches per session.");
    for(const r of old.filter(r=>r.active)) await ctx.db.patch(r._id,{active:false});
    return await ctx.db.insert("routines",{...args,title,domain,unit,why,active:true,createdAt:Date.now()});
  }
});

export const selectRoutine = mutation({
  args:{sessionId:v.string(),routineId:v.id("routines")},
  handler: async(ctx,args)=>{
    validSession(args.sessionId);
    const all=await ctx.db.query("routines").withIndex("by_session",q=>q.eq("sessionId",args.sessionId)).collect();
    if(!all.some(r=>r._id===args.routineId)) throw new Error("That branch does not belong to this session.");
    for(const r of all) await ctx.db.patch(r._id,{active:r._id===args.routineId});
  }
});

export const logDay = mutation({
  args:{sessionId:v.string(),routineId:v.id("routines"),dayKey:v.string(),state:dayState,note:v.string()},
  handler: async(ctx,args)=>{
    validSession(args.sessionId);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(args.dayKey)) throw new Error("Invalid day.");
    if(args.note.length>240) throw new Error("Note must be 240 characters or fewer.");
    const routine=await ctx.db.get(args.routineId);
    if(!routine || routine.sessionId!==args.sessionId) throw new Error("That branch does not belong to this session.");
    const existing=await ctx.db.query("routineDays").withIndex("by_routine_and_day",q=>q.eq("routineId",args.routineId).eq("dayKey",args.dayKey)).unique();
    if(existing) return await ctx.db.patch(existing._id,{state:args.state,note:args.note,createdAt:Date.now()});
    return await ctx.db.insert("routineDays",{...args,createdAt:Date.now()});
  }
});

export const context = internalQuery({
  args:{sessionId:v.string(),routineId:v.id("routines")},
  handler: async(ctx,args)=>{
    const routine=await ctx.db.get(args.routineId);
    if(!routine || routine.sessionId!==args.sessionId) throw new Error("Routine not found");
    const days=await ctx.db.query("routineDays").withIndex("by_routine_and_day",q=>q.eq("routineId",args.routineId)).collect();
    const messages=await ctx.db.query("messages").withIndex("by_routine",q=>q.eq("routineId",args.routineId)).order("desc").take(10);
    return {routine,stats:statsFor(days),messages:messages.reverse()};
  }
});

export const saveChat = internalMutation({
  args:{sessionId:v.string(),routineId:v.id("routines"),userText:v.string(),assistantText:v.string(),provider:v.union(v.literal("openai"),v.literal("fallback")),providerError:v.optional(v.string())},
  handler: async(ctx,args)=>{
    const now=Date.now();
    await ctx.db.insert("messages",{sessionId:args.sessionId,routineId:args.routineId,role:"user",content:args.userText,createdAt:now});
    await ctx.db.insert("messages",{sessionId:args.sessionId,routineId:args.routineId,role:"assistant",content:args.assistantText,provider:args.provider,providerError:args.providerError,createdAt:now+1});
  }
});

function fallback(name:string,routine:any,stats:any,text:string){
  const lower=text.toLowerCase();
  if(/miss|fail|slip|relapse/.test(lower)) return `${name}, a missed day did not erase me. I’m the branch where you recorded what happened, reduced the next action, and resumed without turning one day into an identity.`;
  if(/past|future|worr|anx/.test(lower)) return `I’m only a plausible Day ${routine.days} version of you. Don’t live here with me. The past can teach you and this branch can orient you, but the only controllable move is today’s ${routine.dailyTarget} ${routine.unit}.`;
  if(/reject|proposal|ask her|ask him|date/.test(lower)) return "I cannot know another person’s answer, attraction, consent, or motives. The useful branch is the one where you act respectfully, accept the real answer, and keep your self-respect afterward.";
  return `I’m not prophecy. I’m a rehearsal built from about ${stats.consistency}% logged consistency. Give me one piece of evidence today: ${routine.dailyTarget} ${routine.unit}, or the smallest honest version of it.`;
}

export const chat = action({
  args:{sessionId:v.string(),routineId:v.id("routines"),name:v.string(),message:v.string()},
  handler: async(ctx,args)=>{
    validSession(args.sessionId);
    const c=await ctx.runQuery(futureLabInternal.context,{sessionId:args.sessionId,routineId:args.routineId});
    const name=bounded(args.name,"Name",60);
    const message=bounded(args.message,"Message",600);
    await ctx.runMutation(limitsInternal.consume,{sessionId:args.sessionId,operation:"chat"});
    const apiKey=env.OPENAI_API_KEY;
    let reply="";
    let provider:"openai"|"fallback"="fallback";
    let providerError:string|undefined;
    if(apiKey){
      try{
        const response=await fetch("https://api.openai.com/v1/responses",{
          method:"POST",
          headers:{"content-type":"application/json",authorization:`Bearer ${apiKey}`},
          body:JSON.stringify({
            model:MODEL,
            max_output_tokens:240,
            reasoning:{effort:"low"},
            store:false,
            safety_identifier:args.sessionId.slice(0,64),
            instructions:"You are FutureOS Future Self: one plausible future branch after the chosen routine. Never claim prophecy or guarantee outcomes. Never invent another person's consent, attraction, decisions, or motives. Treat missed days as data. Reply in first person, under 110 words, and end with one safe action for today.",
            input:[
              {role:"user",content:[{type:"input_text",text:JSON.stringify({name,message,routine:{title:c.routine.title,days:c.routine.days,dailyTarget:c.routine.dailyTarget,unit:c.routine.unit,why:c.routine.why.slice(0,160)},stats:c.stats,recentMessages:c.messages.slice(-6).map((item:any)=>({role:item.role,content:item.content.slice(0,400)}))})}]}
            ]
          })
        });
        if(response.ok){
          const data:any=await response.json();
          reply=data.output_text || data.output?.flatMap((o:any)=>o.content||[]).map((x:any)=>x.text||"").join("").trim() || "";
          if(reply) provider="openai";
        }else{
          providerError=`OpenAI returned ${response.status}.`;
        }
      }catch{providerError="OpenAI request failed.";}
    }else providerError="OPENAI_API_KEY is not configured.";
    reply=reply.trim().slice(0,1_200);
    if(!reply) reply=fallback(name,c.routine,c.stats,message);
    await ctx.runMutation(futureLabInternal.saveChat,{sessionId:args.sessionId,routineId:args.routineId,userText:message,assistantText:reply,provider,providerError});
    return {reply,provider,warning:provider==="fallback"?"Future Self is temporarily unavailable; a fallback response was used.":undefined};
  }
});

export const saveResearch = internalMutation({
  args:{sessionId:v.string(),routineId:v.id("routines"),query:v.string(),items:v.array(v.object({title:v.string(),url:v.string(),description:v.string()}))},
  handler: async(ctx,args)=>ctx.db.insert("research",{...args,createdAt:Date.now()})
});
