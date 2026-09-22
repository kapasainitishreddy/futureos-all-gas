import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";

const api = anyApi;
type Tab = "today" | "future" | "reality";
type DayState = "done" | "partial" | "skip";
type Notice = { kind: "success" | "warning" | "error"; text: string } | null;

type Preset = {
  title: string;
  domain: string;
  days: number;
  dailyTarget: number;
  unit: string;
  why: string;
};

const presets: Preset[] = [
  { title: "Study One Hour", domain: "Learning", days: 75, dailyTarget: 60, unit: "minutes", why: "Build proof that focused study is part of who I am." },
  { title: "21-Day Sexual Self-Control", domain: "Self-direction", days: 21, dailyTarget: 1, unit: "deliberate choice", why: "Practice deliberate choice without inventing medical benefits." },
  { title: "75-Day Discipline", domain: "Follow-through", days: 75, dailyTarget: 1, unit: "daily protocol", why: "Keep returning to the planned work after motivation fades." },
  { title: "30-Day Courage Practice", domain: "Agency", days: 30, dailyTarget: 1, unit: "courage action", why: "Take respectful action without controlling another person’s answer." },
];

const previewSnapshot = {
  routines: [{ _id: "preview", ...presets[0], active: true }],
  selected: { _id: "preview", ...presets[0], active: true },
  stats: { done: 11, partial: 3, skip: 2, consistency: 78 },
  todayState: "partial",
  story: [
    { day: 1, title: "The first vote", scene: "Nothing magical happened. You simply did the controllable thing once.", lesson: "Begin smaller than your ambition." },
    { day: 25, title: "The ordinary middle", scene: "Novelty left. The practice stayed because imperfect days became information.", lesson: "Return before you feel ready." },
    { day: 50, title: "Quiet evidence", scene: "The work started needing less negotiation. Not certainty—familiarity.", lesson: "Let repetition carry the mood." },
    { day: 75, title: "The handoff", scene: "This branch came from repeated evidence, not a perfect streak.", lesson: "Keep what became useful." },
  ],
  messages: [
    { _id: "m1", role: "user", content: "I missed yesterday. Did I ruin this?" },
    { _id: "m2", role: "assistant", provider: "openai", content: "No. I’m the branch where one missed day became a useful signal, not a verdict. Open the book and study for ten honest minutes now; momentum can follow." },
  ],
  research: null,
  inbound: [],
};

function getSessionId() {
  const key = "futureos-all-gas-session";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

function asMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function progressFor(selected: any, stats: any) {
  if (!selected) return 0;
  return Math.min(100, Math.round((((stats?.done ?? 0) + (stats?.partial ?? 0) * 0.5) / Math.max(1, selected.days)) * 100));
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {
      return <CenteredState title="FutureOS could not load this branch." detail="The backend connection failed before the workspace became available." action="Try again" onAction={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}

export function ConfigurationNotice() {
  return <CenteredState title="Connect the Convex deployment." detail="Set VITE_CONVEX_URL for local development. The production static-hosting deploy injects it automatically." />;
}

export function PreviewApp() {
  const [tab, setTab] = useState<Tab>("today");
  const onboarding = new URLSearchParams(window.location.search).get("preview") === "onboarding";
  const snapshot = onboarding ? { ...previewSnapshot, selected: null, routines: [] } : previewSnapshot;
  return <AppFrame snapshot={snapshot} tab={tab} setTab={setTab} name="Builder" setName={() => {}} busy="" notice={{ kind: "warning", text: "Local design preview — sponsor actions are intentionally disabled." }} onCreate={() => {}} onSelect={() => {}} onLog={() => {}} onChat={() => {}} onResearch={() => {}} onEmail={() => {}} emailStatus={null} preview />;
}

export function FutureOSApp() {
  const [sessionId] = useState(getSessionId);
  const [name, setNameState] = useState(() => localStorage.getItem("futureos-name") || "Builder");
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [outboundId, setOutboundId] = useState(() => localStorage.getItem("futureos-outbound-id"));
  const dayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const snapshot: any = useQuery(api.futureLab.snapshot, { sessionId, dayKey });
  const emailStatus: any = useQuery(api.mail.deliveryStatus, outboundId ? { outboundId } : "skip");
  const createRoutine = useMutation(api.futureLab.createRoutine);
  const selectRoutine = useMutation(api.futureLab.selectRoutine);
  const logDay = useMutation(api.futureLab.logDay);
  const chat = useAction(api.futureLab.chat);
  const realityCheck = useAction(api.research.realityCheck);
  const sendFutureLetter = useAction(api.mail.sendFutureLetter);

  const setName = (value: string) => {
    setNameState(value);
    localStorage.setItem("futureos-name", value);
  };

  const run = async (key: string, task: () => Promise<void>, failure: string) => {
    setBusy(key);
    setNotice(null);
    try { await task(); }
    catch (error) { setNotice({ kind: "error", text: asMessage(error, failure) }); }
    finally { setBusy(""); }
  };

  if (snapshot === undefined) return <LoadingState />;

  return <AppFrame
    snapshot={snapshot}
    tab={tab}
    setTab={setTab}
    name={name}
    setName={setName}
    busy={busy}
    notice={notice}
    emailStatus={emailStatus}
    onCreate={(preset) => run("create", async () => { await createRoutine({ sessionId, ...preset }); setNotice({ kind: "success", text: `${preset.title} is now your active branch.` }); }, "The branch could not be created. Try again.")}
    onSelect={(routineId) => run("select", async () => { await selectRoutine({ sessionId, routineId }); }, "The branch could not be selected.")}
    onLog={(routineId, state) => run("log", async () => { await logDay({ sessionId, routineId, dayKey, state, note: "" }); setNotice({ kind: "success", text: state === "skip" ? "Missed recorded as information—not identity." : `${state === "done" ? "Done" : "Partial"} recorded for today.` }); }, "Today’s evidence could not be saved.")}
    onChat={(routineId, message) => run("chat", async () => {
      const result: any = await chat({ sessionId, routineId, name, message });
      if (result?.provider !== "openai") setNotice({ kind: "warning", text: result?.warning || "Future Self is temporarily unavailable; a clearly marked fallback response was used." });
    }, "Future Self is temporarily unavailable. Your message was preserved; try again.")}
    onResearch={(routineId) => run("research", async () => { await realityCheck({ sessionId, routineId }); setTab("reality"); setNotice({ kind: "success", text: "Live sources saved to this branch." }); }, "Live research failed. Check the Firecrawl configuration and try again.")}
    onEmail={(routineId, email) => run("email", async () => {
      const result: any = await sendFutureLetter({ sessionId, routineId, email, name });
      if (result?.outboundId) {
        setOutboundId(result.outboundId);
        localStorage.setItem("futureos-outbound-id", result.outboundId);
      }
      setNotice({ kind: result?.generationProvider === "openai" ? "success" : "warning", text: result?.generationProvider === "openai" ? "AgentMail queued a real letter written by Future You." : "AgentMail queued the letter, but OpenAI was unavailable so the fallback letter was used." });
    }, "The email could not be sent. Check AgentMail and try again.")}
  />;
}

type FrameProps = {
  snapshot: any;
  tab: Tab;
  setTab: (tab: Tab) => void;
  name: string;
  setName: (name: string) => void;
  busy: string;
  notice: Notice;
  emailStatus: any;
  onCreate: (preset: Preset) => void;
  onSelect: (routineId: string) => void;
  onLog: (routineId: string, state: DayState) => void;
  onChat: (routineId: string, message: string) => void;
  onResearch: (routineId: string) => void;
  onEmail: (routineId: string, email: string) => void;
  preview?: boolean;
};

function AppFrame(props: FrameProps) {
  const { snapshot, name, setName, notice } = props;
  const selected = snapshot?.selected;
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to main content</a>
    <header className="masthead">
      <a className="brand" href="/" aria-label="FutureOS home"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>FutureOS</span></a>
      <p>Past is information. Future is direction. <strong>Today is control.</strong></p>
      {selected && <label className="name-field"><span>Your name</span><input value={name} maxLength={48} onChange={(event) => setName(event.target.value)} /></label>}
    </header>
    {notice && <StatusNotice notice={notice} />}
    {!selected ? <Onboarding busy={props.busy === "create"} onPick={props.onCreate} /> : <Workspace {...props} selected={selected} />}
    <footer className="sponsor-bar" aria-label="Technology partners"><span>Built with</span><strong>Convex</strong><strong>OpenAI</strong><strong>Firecrawl</strong><strong>AgentMail</strong></footer>
  </div>;
}

function Onboarding({ busy, onPick }: { busy: boolean; onPick: (preset: Preset) => void }) {
  return <main id="main" className="onboarding">
    <section className="onboarding-copy">
      <span className="section-number">01 / Choose a branch</span>
      <h1>Don’t predict your future.<br />Talk to the person your choices are creating.</h1>
      <p>Pick one behavior you control. FutureOS turns it into a plausible branch—a story you can update, question, and ground in live evidence.</p>
      <div className="truth-note"><Icon name="compass" /><span><strong>Not prophecy.</strong> No guaranteed health, love, money, career, or psychological outcomes. Other people keep their agency.</span></div>
    </section>
    <section className="preset-board" aria-labelledby="preset-heading">
      <div className="board-heading"><span id="preset-heading">Start with a focused routine</span><span>4 branches</span></div>
      {presets.map((preset, index) => <button className="preset-row" disabled={busy} key={preset.title} onClick={() => onPick(preset)}>
        <span className="preset-index">0{index + 1}</span>
        <span className="preset-copy"><strong>{preset.title}</strong><small>{preset.dailyTarget} {preset.unit} · {preset.days} days</small><span>{preset.why}</span></span>
        <Icon name="arrow" />
      </button>)}
      <p className="board-note">You can log Done, Partial, or Missed. No streak is treated as a moral score.</p>
    </section>
  </main>;
}

function Workspace(props: FrameProps & { selected: any }) {
  const { snapshot, selected, tab, setTab } = props;
  const progress = progressFor(selected, snapshot.stats);
  return <div className="workspace">
    <aside className="branch-rail" aria-label="Active future branch">
      <span className="section-number">Active branch</span>
      <h1>{selected.title}</h1>
      <p>{selected.why}</p>
      <div className="branch-progress" aria-label={`${progress}% of branch evidence logged`}><span style={{ width: `${progress}%` }} /></div>
      <div className="branch-days"><strong>Day {Math.min(selected.days, (snapshot.stats?.done ?? 0) + (snapshot.stats?.partial ?? 0) + (snapshot.stats?.skip ?? 0) + 1)}</strong><span>of {selected.days}</span></div>
      <dl className="evidence-counts">
        <div><dt>Done</dt><dd>{snapshot.stats?.done ?? 0}</dd></div>
        <div><dt>Partial</dt><dd>{snapshot.stats?.partial ?? 0}</dd></div>
        <div><dt>Missed</dt><dd>{snapshot.stats?.skip ?? 0}</dd></div>
      </dl>
      {snapshot.routines.length > 1 && <label className="branch-select"><span>Switch branch</span><select value={selected._id} onChange={(event) => props.onSelect(event.target.value)}>{snapshot.routines.map((routine: any) => <option key={routine._id} value={routine._id}>{routine.title}</option>)}</select></label>}
      <button className="reset-button" onClick={() => {
        if (window.confirm("Reset this local demo session? The current browser will start with no selected branch.")) {
          localStorage.removeItem("futureos-all-gas-session");
          localStorage.removeItem("futureos-outbound-id");
          window.location.reload();
        }
      }}>Reset local demo</button>
    </aside>
    <div className="work-area">
      <nav className="view-tabs" aria-label="FutureOS views">
        <TabButton active={tab === "today"} icon="sun" onClick={() => setTab("today")}>Today</TabButton>
        <TabButton active={tab === "future"} icon="message" onClick={() => setTab("future")}>Future You</TabButton>
        <TabButton active={tab === "reality"} icon="search" onClick={() => setTab("reality")}>Reality Check</TabButton>
      </nav>
      <main id="main" className="main-surface">
        {tab === "today" && <TodayView selected={selected} stats={snapshot.stats} todayState={snapshot.todayState} story={snapshot.story} busy={props.busy} onLog={props.onLog} />}
        {tab === "future" && <FutureView selected={selected} name={props.name} messages={snapshot.messages} inbound={snapshot.inbound} busy={props.busy} onChat={props.onChat} onEmail={props.onEmail} emailStatus={props.emailStatus} preview={props.preview} />}
        {tab === "reality" && <RealityView selected={selected} research={snapshot.research} busy={props.busy} onRun={props.onResearch} preview={props.preview} />}
      </main>
    </div>
  </div>;
}

function TabButton({ active, icon, children, onClick }: { active: boolean; icon: IconName; children: React.ReactNode; onClick: () => void }) {
  return <button aria-current={active ? "page" : undefined} className={active ? "active" : ""} onClick={onClick}><Icon name={icon} />{children}</button>;
}

function TodayView({ selected, stats, todayState, story, busy, onLog }: any) {
  const labels: Record<DayState, string> = { done: "Done", partial: "Partial", skip: "Missed" };
  return <section className="view today-view" aria-labelledby="today-heading">
    <ViewHeader index="01" label="Today’s evidence" title={`${selected.dailyTarget} ${selected.unit}`} aside={`${stats?.consistency ?? 0}% consistency`} />
    <p className="view-intro" id="today-heading">You do not need to emotionally live at Day {selected.days}. Give this branch one honest data point today.</p>
    <div className="day-choices" role="group" aria-label="How did today go?">
      {(Object.keys(labels) as DayState[]).map((state) => <button key={state} disabled={busy === "log"} aria-pressed={todayState === state} onClick={() => onLog(selected._id, state)}>
        <Icon name={state === "done" ? "check" : state === "partial" ? "half" : "return"} />
        <span><strong>{labels[state]}</strong><small>{state === "done" ? "Target completed" : state === "partial" ? "Some honest progress" : "Record it, then return"}</small></span>
      </button>)}
    </div>
    <div className="story-heading"><span>How this branch could unfold</span><small>Plausible narrative · not a forecast</small></div>
    <ol className="story-line">{story.map((item: any, index: number) => <li key={item.day}><span className="story-node">{String(index + 1).padStart(2, "0")}</span><article><small>Day {item.day}</small><h2>{item.title}</h2><p>{item.scene}</p><blockquote>{item.lesson}</blockquote></article></li>)}</ol>
  </section>;
}

function FutureView({ selected, name, messages, inbound, busy, onChat, onEmail, emailStatus, preview }: any) {
  const [chat, setChat] = useState("");
  const [email, setEmail] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length, busy]);
  const submitChat = (event: React.FormEvent) => {
    event.preventDefault();
    const value = chat.trim();
    if (!value || busy === "chat" || preview) return;
    setChat("");
    onChat(selected._id, value);
  };
  const submitEmail = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || busy === "email" || preview) return;
    onEmail(selected._id, email.trim());
  };
  return <section className="view future-view" aria-labelledby="future-heading">
    <ViewHeader index="02" label={`Talk to Day ${selected.days} You`} title="One plausible future, in conversation." aside="Powered by OpenAI" />
    <div className="future-layout">
      <div className="conversation">
        <div className="messages" aria-live="polite" aria-busy={busy === "chat"}>
          {messages.length === 0 && <div className="message assistant"><span>Future You</span><p>{name}, I’m the Day {selected.days} branch you’re rehearsing. Ask what was hard, what changed, or what I need you to do today.</p></div>}
          {messages.map((message: any) => <div key={message._id} className={`message ${message.role === "user" ? "user" : "assistant"}`}><span>{message.role === "user" ? "You" : "Future You"}{message.provider === "fallback" ? " · fallback" : ""}</span><p>{message.content}</p></div>)}
          {busy === "chat" && <div className="message-thinking"><i /><i /><i /><span>Future You is responding</span></div>}
          <div ref={endRef} />
        </div>
        <div className="quick-prompts" aria-label="Suggested questions">{["I missed yesterday. Did I ruin this?", "What changed honestly?", "What should I do right now?"].map((prompt) => <button key={prompt} onClick={() => setChat(prompt)}>{prompt}</button>)}</div>
        <form className="composer" onSubmit={submitChat}><label htmlFor="future-message">Message Future You</label><div><textarea id="future-message" rows={2} value={chat} onChange={(event) => setChat(event.target.value)} placeholder="Say what is actually happening today…" /><button disabled={!chat.trim() || busy === "chat" || preview} type="submit">Send <Icon name="arrow" /></button></div></form>
      </div>
      <aside className="letter-panel">
        <span className="section-number">Letter through time</span>
        <h2>Let Future You reach your real inbox.</h2>
        <p>AgentMail creates a real address for this branch. Reply to the letter and the response returns here through Convex.</p>
        <form onSubmit={submitEmail}><label htmlFor="future-email">Your email</label><input id="future-email" autoComplete="email" inputMode="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /><button disabled={busy === "email" || preview}>{busy === "email" ? "Queuing letter…" : "Email me from the future"}</button></form>
        {emailStatus && <div className={`delivery-status ${emailStatus.status === "bounced" || emailStatus.status === "failed" ? "failed" : ""}`} role="status"><Icon name="mail" /><span><strong>{emailStatus.status === "delivered" ? "Delivered" : emailStatus.status === "bounced" ? "Bounced" : "AgentMail status"}</strong><small>{emailStatus.errorMessage || emailStatus.status}</small></span></div>}
        {inbound?.length > 0 && <div className="replies"><h3>Replies received</h3>{inbound.map((reply: any) => <article key={reply._id}><small>{reply.from}</small><strong>{reply.subject}</strong><p>{reply.text || "Reply received without a plain-text body."}</p></article>)}</div>}
      </aside>
    </div>
  </section>;
}

function RealityView({ selected, research, busy, onRun, preview }: any) {
  return <section className="view reality-view" aria-labelledby="reality-heading">
    <ViewHeader index="03" label="Reality layer" title="Keep evidence separate from imagination." aside="Live via Firecrawl" />
    <div className="reality-intro"><p id="reality-heading">FutureOS uses story for direction and live sources for facts. Firecrawl searches the current web for practical evidence around <strong>{selected.title}</strong>.</p><button disabled={busy === "research" || preview} onClick={() => onRun(selected._id)}>{busy === "research" ? "Searching live sources…" : research ? "Refresh live sources" : "Run live reality check"}<Icon name="search" /></button></div>
    {!research ? <div className="research-empty"><Icon name="layers" /><div><h2>No outside evidence yet.</h2><p>Run a Reality Check when you want current sources. Generated story stays on the other side of this line.</p></div></div> : <div className="source-list">
      <div className="query-line"><span>Latest query</span><code>{research.query}</code></div>
      {research.items.map((source: any, index: number) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer"><span className="source-index">0{index + 1}</span><span><small>{safeHost(source.url)}</small><strong>{source.title}</strong><p>{source.description || "Open the source to read more."}</p></span><Icon name="external" /></a>)}
    </div>}
  </section>;
}

function safeHost(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "source"; } }

function ViewHeader({ index, label, title, aside }: { index: string; label: string; title: string; aside: string }) {
  return <header className="view-header"><div><span className="section-number">{index} / {label}</span><h1>{title}</h1></div><span className="provider-label">{aside}</span></header>;
}

function StatusNotice({ notice }: { notice: NonNullable<Notice> }) {
  return <div className={`status-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}><Icon name={notice.kind === "error" ? "alert" : notice.kind === "warning" ? "info" : "check"} /><span>{notice.text}</span></div>;
}

function LoadingState() {
  return <div className="loading-shell" aria-busy="true"><div className="loading-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><strong>FutureOS</strong></div><div className="loading-layout"><aside /><main><span /><span /><span /></main></div><p>Restoring your future branch…</p></div>;
}

function CenteredState({ title, detail, action, onAction }: { title: string; detail: string; action?: string; onAction?: () => void }) {
  return <main className="centered-state"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><h1>{title}</h1><p>{detail}</p>{action && <button onClick={onAction}>{action}</button>}</main>;
}

type IconName = "arrow" | "check" | "half" | "return" | "sun" | "message" | "search" | "compass" | "mail" | "layers" | "external" | "alert" | "info";
function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    half: <><circle cx="12" cy="12" r="8"/><path d="M12 4v16"/></>,
    return: <><path d="M9 7 4 12l5 5"/><path d="M20 17v-2a3 3 0 0 0-3-3H4"/></>,
    sun: <><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4z"/></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/></>,
    external: <><path d="M14 4h6v6"/><path d="m20 4-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></>,
    alert: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
  };
  return <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export { progressFor };
