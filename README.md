# FutureOS

> Don’t predict your future. Talk to the person your choices are creating.

FutureOS turns a routine you control into a plausible future-self branch. Log today as **Done**, **Partial**, or **Missed**, watch the branch evolve, talk to Future You, ground the story in live sources, and receive a real email from the branch.

FutureOS is motivational rehearsal—not prophecy. It never guarantees medical, sexual, romantic, career, financial, appearance, or psychological outcomes, and it never invents another person’s decisions.

## Try the demo

1. Create **Study One Hour** for 75 days.
2. Record today as **Partial**.
3. Ask Future You: “I missed yesterday. Did I ruin this?”
4. Run a **Reality Check** to fetch current sources.
5. Send a **Letter Through Time** to your email.

Live demo: pending production deployment.

## Sponsor stack

- **Convex** — reactive routines, day evidence, messages, research, inbound replies, and static hosting.
- **OpenAI** — Future Self conversation and future-letter generation through the Responses API, locked to the low-cost `gpt-5.6-luna` model with low reasoning and short output budgets.
- **Firecrawl** — live web search shown separately from generated narrative.
- **AgentMail** — a real Future You inbox, durable sending, delivery status, and inbound reply webhook.

## Architecture

The React/Vite client subscribes to one reactive Convex snapshot. Convex mutations own routine and day state; actions call OpenAI and Firecrawl server-side. AgentMail queues outbound email from a mutation and posts inbound replies to `/agentmail/webhook`. Convex Static Hosting serves the app at `*.convex.site`.

## Run locally

Requirements: Node.js 22.13+ and a Convex account.

```bash
npm install
npx convex dev
npm run dev
```

Set `VITE_CONVEX_URL` in `.env.local` for the Vite client. Set sponsor credentials on the Convex deployment, not in client files:

```bash
npx convex env set OPENAI_API_KEY "..."
npx convex env set FIRECRAWL_API_KEY "..."
npx convex env set AGENTMAIL_API_KEY "..."
npx convex env set AGENTMAIL_WEBHOOK_SECRET "..."
```

The public demo enforces server-side input bounds, cooldowns, and daily caps: 20 chats, 5 research requests, and 3 emails per anonymous session per UTC day. Global daily circuit breakers (250 chats, 50 research requests, and 25 emails) contain spend even if visitors reset their anonymous sessions. Model selection cannot be overridden by the client or environment.

Deploy backend and frontend together:

```bash
npm run deploy
```

## Validation

```bash
npm run typecheck
npm test
npm run build
```

See [hackathon.md](./hackathon.md) for the build log and [SUBMISSION.md](./SUBMISSION.md) for the exact demo sequence.
