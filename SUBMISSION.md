# FutureOS — All Gas Submission Package

## Title
FutureOS — Talk to the Person Your Choices Are Creating

## One-line description
FutureOS turns a routine into a plausible future-self branch you can talk to, grounds the story with live Firecrawl research, and lets Future You send real email through AgentMail — all on a realtime Convex backend.

## Short description
Most habit apps show a streak. FutureOS makes the streak emotionally legible.

Choose a controllable routine such as studying one hour a day for 75 days. FutureOS creates an evolving story of a plausible Day-75 version of you, lets you talk to that Future Self through OpenAI, and keeps missed days from becoming an identity failure by tracking Done / Partial / Missed.

A separate Reality Check uses Firecrawl to pull live sources, keeping generated narrative distinct from evidence. AgentMail gives Future You a real inbox so the user can receive and reply to a letter from the future. Convex stores the entire branch reactively and hosts the judge-facing SPA.

## Sponsor use

**Convex**
- primary backend
- reactive routine state
- mutations for adherence
- persisted story/chat/research/email state
- Convex Components
- convex.site static hosting

**OpenAI**
- Future Self conversation
- Future Self email letters
- explicit non-prophecy and human-agency guardrails

**Firecrawl**
- live Reality Check web search
- current sourced context displayed separately from AI story content

**AgentMail**
- creates a real FutureOS inbox
- sends Future Self email
- webhook ingests replies back into Convex

## Demo video script — target 2:20

### 0:00–0:15 — Hook
"Most habit trackers tell you whether you kept a streak. FutureOS lets you talk to the person that streak is creating."

Show the landing screen and the four Future Branch presets.

### 0:15–0:35 — Create the branch
Choose **Study One Hour — 75 days**.

Say:
"I choose a behavior I control, not an outcome the AI pretends it can predict."

Show the active branch and Story Mode.

### 0:35–0:55 — Non-punitive adherence
Click **Partial**.

Say:
"FutureOS doesn't kill the identity because I had an imperfect day. Full, partial, and missed days become evidence."

Show realtime numbers changing through Convex.

### 0:55–1:25 — Future Self
Open **Future You**.

Ask:
"I missed yesterday. Did I ruin this?"

Show OpenAI response.

Say:
"The character is a plausible branch, not prophecy. It can't guarantee health, romance, money, or another person's decisions."

### 1:25–1:50 — Reality Check
Open **Reality Check** and click **Run live reality check**.

Say:
"Story and evidence are deliberately separate. Firecrawl searches the live web and the sources appear here instead of the model inventing external facts."

### 1:50–2:10 — Letter Through Time
Open **Future You**, enter an email, click **Email me from the future**.

Show the received AgentMail email if available.

Say:
"Future You has a real AgentMail inbox. The user can reply, and inbound mail flows back through the webhook into Convex."

### 2:10–2:20 — Close
"FutureOS: the past is information, the future is direction, today is control."

## Social post draft

Built **FutureOS** for the Convex All Gas Hackathon.

Instead of another streak tracker, FutureOS lets you create a routine, meet a plausible future version of yourself, and actually talk to them.

✦ Convex — realtime branches + state + hosting  
✦ OpenAI — Future Self conversations  
✦ Firecrawl — live Reality Checks with sources  
✦ AgentMail — real letters from Future You

The rule: FutureOS never pretends it can predict your life. It uses the future to bring you back to the action you control today.

@convex @OpenAI @firecrawl @agentmail

#AllGasHackathon #AI #Convex

## Final submission fields

- Public GitHub repo: **TODO**
- Live convex.site URL: https://adept-ox-835.convex.site
- Demo video URL (<3 min): **TODO**
- Social post URL: **TODO**
- vibeapps.dev submission: **TODO**

## Final pre-submit smoke test

1. New/incognito browser can open the live URL.
2. Create Study One Hour branch.
3. Click Partial and see Convex-backed state update.
4. Ask Future You a question and receive an OpenAI-generated answer.
5. Run Reality Check and see Firecrawl source cards.
6. Send Future Self email and verify receipt.
7. Confirm no secret values appear in browser source, repo, logs, or hackathon.md.
8. Public repository opens without authentication.
9. hackathon.md is present at repository root.
10. Video is under three minutes and demonstrates all four sponsors.


## Minimal deployment handoff

The GitHub workflow intentionally needs only one GitHub secret: `CONVEX_DEPLOY_KEY`.

Set sponsor credentials directly on the target Convex deployment before running the workflow:

```bash
npx convex env set OPENAI_API_KEY "..."
npx convex env set OPENAI_FUTURE_MODEL "gpt-5.6-luna"
npx convex env set FIRECRAWL_API_KEY "..."
npx convex env set AGENTMAIL_API_KEY "..."
npx convex env set AGENTMAIL_WEBHOOK_SECRET "..."
```

`FIRECRAWL_WEBHOOK_SECRET` is optional for the current one-shot search path, though recommended if durable crawls are added.

Then add `CONVEX_DEPLOY_KEY` in GitHub Actions secrets and manually run **Deploy All Gas**. The static-hosting command builds the Vite judge SPA with the production `VITE_CONVEX_URL`, deploys Convex, and uploads the site to `*.convex.site`.
