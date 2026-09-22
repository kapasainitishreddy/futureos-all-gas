import { FirecrawlClient } from "@firecrawl/firecrawl-convex";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { components, internal } from "./_generated/api";

const firecrawl = new FirecrawlClient(components.firecrawl);

export const realityCheck = action({
  args:{sessionId:v.string(),routineId:v.id("routines")},
  handler: async(ctx,args)=>{
    const c=await ctx.runQuery(internal.futureLab.context,args);
    const query=`${c.routine.title} ${c.routine.dailyTarget} ${c.routine.unit} practical evidence-based guidance current research habits behavior`;
    let raw:any;
    try{
      raw=await firecrawl.search(ctx,query,{limit:4,scrapeOptions:{formats:["markdown"],onlyMainContent:true}});
    }catch(error){
      throw new Error(`Live research failed: ${error instanceof Error?error.message:"Firecrawl request failed."}`);
    }
    const source=Array.isArray(raw?.web)?raw.web:Array.isArray(raw?.data?.web)?raw.data.web:Array.isArray(raw?.data)?raw.data:[];
    const items=source.slice(0,4).map((x:any)=>({
      title:String(x.title || x.metadata?.title || x.url || "Source").slice(0,160),
      url:String(x.url || x.metadata?.sourceURL || ""),
      description:String(x.description || x.markdown || x.content || "").replace(/[#*_>`~\s]+/g," ").trim().slice(0,280)
    })).filter((x:any)=>/^https?:\/\//.test(x.url));
    if(items.length===0) throw new Error("Live research returned no usable web sources. Try again in a moment.");
    await ctx.runMutation(internal.futureLab.saveResearch,{...args,query,items});
    return {query,items};
  }
});
