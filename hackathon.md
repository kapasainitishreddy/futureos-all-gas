# FutureOS — All Gas Hackathon Build Log

## One-line pitch

**FutureOS lets you meet and talk to a plausible future version of yourself created from the routines you choose today — then grounds that story in live evidence and gives Future You a real email inbox.**

## Why this exists

Most habit trackers reduce behavior change to checkboxes and streaks. FutureOS uses future-self continuity as the emotional interface:

1. Choose a controllable routine and a time horizon.
2. Log **Done / Partial / Missed** without destroying your identity after a missed day.
3. Read an evolving future-story branch.
4. Talk to "Day N You" with an AI that is explicitly framed as a plausible branch, never prophecy.
5. Run a live **Reality Check** so current web evidence stays separate from imagination.
6. Ask Future You to email you, then reply to the agent inbox.

The product keeps bringing the user back to one idea: **the past is information, the future is direction, today is control.**

## Sponsor stack — real product work

### Convex

The hackathon experience is a standalone Vite SPA backed by Convex.

- Reactive snapshot queries update routines, day logs, chat, research, and inbound email without polling.
- Mutations create/select routines and log Done / Partial / Missed days.
- Actions run OpenAI and Firecrawl.
- Convex Components provide Firecrawl, AgentMail, and static hosting.
- The judge-facing SPA is deployed on convex.site.

### OpenAI

OpenAI powers the Future Self voice and email-letter generation.

Guardrails are part of the product:
- never claims prophecy;
- never guarantees medical, sexual, romantic, career, financial, appearance, or psychological outcomes;
- never invents another person's consent, attraction, acceptance, rejection, or motives;
- treats missed days as data and encourages resuming.

A deterministic fallback exists so the UX does not collapse when the model is unavailable.

### Firecrawl

The **Reality Check** action uses the official @firecrawl/firecrawl-convex component to search the live web for current practical/evidence-based context around the selected routine.

The UI shows sourced results separately from the generated Future Story. This is intentional: **FutureOS does not confuse imagination with evidence.**

### AgentMail

The **Letter Through Time** feature uses @agentmail/convex.

- A FutureOS inbox is created for the user's anonymous session.
- Future You generates and sends a real email.
- The AgentMail webhook is mounted at /agentmail/webhook.
- Replies are ingested and stored in Convex, then surface reactively inside FutureOS.

## Judge demo path

1. Open the public convex.site URL.
2. Create **Study One Hour for 75 Days**.
3. Log Partial for today to demonstrate non-binary adherence.
4. Open **Future You** and ask: "I missed yesterday. Did I ruin this?"
5. Open **Reality Check** and run a live Firecrawl search.
6. Enter an email and click **Email me from the future**.
7. Show that routines/chat/research update through Convex.

## Product decisions

### Why no endless dashboard?

The hackathon UI exposes only three views:

- **Today** — one controllable action and story checkpoints
- **Future You** — conversation + letter through time
- **Reality Check** — live sources

FutureOS is meant to feel like a life interface, not a feature warehouse.

### Why "plausible future branch" instead of prediction?

The value is motivational rehearsal and reflection, not pretending an AI can know the user's future. External outcomes remain uncertain and other people's agency is never simulated as fact.

## Repository layout

- hackathon/ — focused judge-facing Vite SPA
- convex/ — Convex backend and sponsor integrations
- src/ — original FutureOS Next.js product
- hackathon.md — this build log

## Deployment

Required environment variables on the Convex deployment:

```bash
npx convex env set OPENAI_API_KEY ...
npx convex env set FIRECRAWL_API_KEY ...
npx convex env set FIRECRAWL_WEBHOOK_SECRET ...
npx convex env set AGENTMAIL_API_KEY ...
npx convex env set AGENTMAIL_WEBHOOK_SECRET ...
```

Deploy:

```bash
npm install
npm run deploy:hackathon
```

Then register the AgentMail webhook as:

```
https://<deployment>.convex.site/agentmail/webhook
```

## Submission assets

- Live URL: **TODO after deploy**
- Demo video (<3 min): **TODO**
- Social post: **TODO**
- vibeapps.dev submission: **TODO**

## Build log

- Sep 22: Shipped Future Branches core in the existing FutureOS app.
- Sep 22: Added focused All Gas Vite experience to avoid a feature-heavy judge demo.
- Sep 22: Added Convex reactive routines, logs, story state, chat history, research state, and inbound mail.
- Sep 22: Added official Firecrawl Convex component and live Reality Check.
- Sep 22: Added official AgentMail Convex component, Future Self mail sending, webhook, and reply ingestion.
- Sep 22: Added OpenAI Future Self and future-letter generation with explicit non-prophecy guardrails.
- Sep 22: Added Convex static hosting deploy script for a qualifying convex.site URL.
