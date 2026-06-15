"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { TEAM_MAP, type Team } from "@/lib/teams";
import type { Squad, Member, TeamRow } from "@/lib/supabase";

type Tab = "board" | "fixtures" | "chat" | "standings";

type Fixture = {
  id: string;
  team1_id: string;
  team2_id: string;
  team1_name?: string;
  team2_name?: string;
  team1_flag?: string;
  team2_flag?: string;
  team1_score: number | null;
  team2_score: number | null;
  match_date: string;
  stage: string;
  status: "upcoming" | "live" | "finished";
  clock?: string | null;
};

type Message = {
  id: string;
  squad_id: string;
  sender_phone: string;
  sender_name: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  created_at: string;
};

export default function SquadPage() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const myPhone = searchParams.get("phone") ?? "";

  const [squad, setSquad] = useState<Squad | null>(null);
  const [teams, setTeams] = useState<Record<string, TeamRow>>({});
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<Tab>("board");

  const fetchSquadAndTeams = useCallback(async () => {
    const [squadRes, teamsRes] = await Promise.all([
      fetch(`/api/squads/${code}`),
      fetch("/api/teams"),
    ]);
    if (!squadRes.ok) { setError("Squad not found"); setLoading(false); return; }
    const squadData: Squad = await squadRes.json();
    const teamsData: TeamRow[] = teamsRes.ok ? await teamsRes.json() : [];
    setSquad(squadData);
    setTeams(Object.fromEntries(teamsData.map((t) => [t.id, t])));
    setLoading(false);
  }, [code]);

  const fetchFixtures = useCallback(async () => {
    const res = await fetch("/api/fixtures");
    if (res.ok) setFixtures(await res.json());
  }, []);

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/squads/${code}/messages`);
    if (res.ok) setMessages(await res.json());
  }, [code]);

  useEffect(() => {
    fetchSquadAndTeams();
    fetchFixtures();
    fetchMessages();
    const interval = setInterval(() => {
      fetchSquadAndTeams();
      if (tab === "chat") fetchMessages();
      if (tab === "fixtures") fetchFixtures();
    }, tab === "fixtures" ? 60000 : 5000);
    return () => clearInterval(interval);
  }, [fetchSquadAndTeams, fetchFixtures, fetchMessages, tab]);

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/?join=${code}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (loading) return <div className="text-center py-20 text-blue-300">Loading squad…</div>;
  if (error || !squad) return <div className="text-center py-20 text-red-300">{error || "Squad not found"}</div>;

  const members: Member[] = squad.members ?? [];
  const isLeader = myPhone && myPhone === squad.leader_phone;
  const draws = squad.draw_results ?? {};
  const waiting = squad.member_count_target - members.length;
  const stakesEnabled = squad.stakes_enabled;
  const totalPot = stakesEnabled && squad.stake_amount ? squad.stake_amount * squad.member_count_target : null;
  const currency = squad.currency ?? "USD";
  const imAMember = members.some((m) => m.phone === myPhone);
  const myPicksDone = (draws[myPhone] ?? []).length === 4;

  const champion = Object.values(teams).find((t) => t.status === "champion");
  const winnerPhone = champion
    ? Object.entries(draws).find(([, ids]) => ids.includes(champion.id))?.[0]
    : null;
  const winner = winnerPhone ? members.find((m) => m.phone === winnerPhone) : null;
  const isDrawn = squad.status === "drawn" || squad.status === "active" || squad.status === "completed";

  function getTeam(id: string): Team & Partial<TeamRow> {
    return { ...TEAM_MAP[id], ...(teams[id] ?? {}) };
  }

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "board", label: "Board", icon: "📋" },
    { key: "standings", label: "Standings", icon: "🏅" },
    { key: "fixtures", label: "Fixtures", icon: "📅" },
    { key: "chat", label: "Chat", icon: "💬" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{squad.name}</h1>
          <span className="text-xs bg-white/10 px-2 py-1 rounded-full font-mono">{squad.squad_id}</span>
        </div>
        <p className="text-blue-300 text-sm">
          {isDrawn ? "All teams picked — tournament is on! 🏆" : `${members.length}/${squad.member_count_target} joined · picks in progress`}
        </p>
      </div>

      {/* Pending picks banner */}
      {imAMember && !myPicksDone && (
        <button onClick={() => router.push(`/squad/${code}/pick?phone=${encodeURIComponent(myPhone)}`)}
          className="w-full bg-yellow-500/20 border border-yellow-400 hover:bg-yellow-500/30 transition-colors rounded-2xl p-4 text-left space-y-1">
          <p className="font-bold text-yellow-300">⚠️ You haven&apos;t picked your teams yet</p>
          <p className="text-yellow-200 text-sm">Tap here to pick your 4 teams →</p>
        </button>
      )}

      {/* Stakes */}
      {stakesEnabled && totalPot && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-yellow-200 font-medium">💰 Pot</span>
          <span className="text-yellow-300 font-bold text-lg">
            {currency} {totalPot.toLocaleString()}
            <span className="text-yellow-400/60 text-sm font-normal ml-2">({members.length} × {currency} {squad.stake_amount})</span>
          </span>
        </div>
      )}

      {/* Winner banner */}
      {winner && (
        <div className="bg-yellow-500/20 border border-yellow-400 rounded-2xl p-5 text-center space-y-2">
          <div className="text-4xl">🏆</div>
          <div className="font-bold text-2xl text-yellow-300">{winner.display_name} wins!</div>
          <div className="text-sm text-yellow-200">{champion?.flag} {champion?.name} are World Champions</div>
          {stakesEnabled && totalPot && (
            <div className="text-yellow-100 font-semibold text-lg">Payout: {currency} {totalPot.toLocaleString()}</div>
          )}
        </div>
      )}

      {/* Invite link */}
      {waiting > 0 && (
        <button onClick={copyLink} className="w-full bg-white/10 hover:bg-white/20 transition-colors rounded-xl py-3 px-4 text-sm font-medium">
          {copied ? "✅ Link copied!" : (
            <span className="flex items-center justify-between gap-2">
              <span>📋 Copy invite link · {waiting} spot{waiting !== 1 ? "s" : ""} left</span>
              <span className="font-mono bg-white/15 px-2 py-0.5 rounded text-xs tracking-widest">{squad.squad_id}</span>
            </span>
          )}
        </button>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-white/5 rounded-2xl p-1">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-xl py-2 text-sm font-medium transition-colors flex flex-col items-center gap-0.5 ${
              tab === t.key ? "bg-blue-600 text-white" : "text-blue-300 hover:text-white"
            }`}>
            <span>{t.icon}</span>
            <span className="text-xs">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: Squad Board */}
      {tab === "board" && (
        <BoardTab members={members} draws={draws} teams={teams} myPhone={myPhone}
          squad={squad} isDrawn={isDrawn} stakesEnabled={!!stakesEnabled}
          currency={currency} getTeam={getTeam} waiting={waiting}
          isLeader={!!isLeader} squadCode={code} onUpdate={fetchSquadAndTeams} />
      )}

      {/* Tab: Standings */}
      {tab === "standings" && (
        <StandingsTab members={members} draws={draws} teams={teams} getTeam={getTeam} />
      )}

      {/* Tab: Fixtures */}
      {tab === "fixtures" && (
        <FixturesTab fixtures={fixtures} isLeader={!!isLeader} myPhone={myPhone}
          squadCode={code} onUpdate={fetchFixtures} />
      )}

      {/* Tab: Chat */}
      {tab === "chat" && (
        <ChatTab messages={messages} myPhone={myPhone} squadCode={code}
          senderName={members.find((m) => m.phone === myPhone)?.display_name ?? ""}
          members={members}
          onSent={fetchMessages} />
      )}
    </div>
  );
}

// ── BOARD TAB ────────────────────────────────────────────────────────────────

function BoardTab({ members, draws, teams, myPhone, squad, isDrawn, stakesEnabled, currency, getTeam, waiting, isLeader, squadCode, onUpdate }: {
  members: Member[]; draws: Record<string, string[]>; teams: Record<string, TeamRow>;
  myPhone: string; squad: Squad; isDrawn: boolean; stakesEnabled: boolean;
  currency: string; getTeam: (id: string) => Team & Partial<TeamRow>;
  waiting: number; isLeader: boolean; squadCode: string; onUpdate: () => void;
}) {
  return (
    <div className="space-y-3">
      {members.map((member) => {
        const myTeams = draws[member.phone] ?? [];
        const isMe = member.phone === myPhone;
        const pickedAll = myTeams.length === 4;
        const aliveCount = myTeams.filter((id) => (teams[id]?.status ?? "alive") === "alive").length;
        return (
          <div key={member.phone} className={`rounded-2xl p-4 space-y-3 ${isMe ? "bg-blue-800/40 border border-blue-500/50" : "bg-white/5"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{member.display_name}</span>
                {isMe && <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">you</span>}
                {member.phone === squad.leader_phone && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">leader</span>}
                {!pickedAll && <span className="text-xs bg-white/10 text-blue-400/60 px-2 py-0.5 rounded-full">picking…</span>}
                {stakesEnabled && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${member.contribution_confirmed ? "bg-blue-600/20 text-blue-300" : "bg-red-500/20 text-red-300"}`}>
                    {member.contribution_confirmed ? `✓ ${currency} ${squad.stake_amount}` : "stake unconfirmed"}
                  </span>
                )}
              </div>
              {pickedAll && isDrawn && <span className="text-sm text-blue-300">{aliveCount}/4 alive</span>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {["A", "B", "C", "D"].map((pot, i) => {
                const teamId = myTeams[i];
                if (!teamId) return (
                  <div key={pot} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm bg-white/5 border border-dashed border-white/10 text-blue-500/30">
                    <span className="text-xs font-mono">Pot {pot}</span>
                    <span className="ml-auto">?</span>
                  </div>
                );
                const team = getTeam(teamId);
                const status = teams[teamId]?.status ?? "alive";
                return (
                  <div key={pot} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                    status === "champion" ? "bg-yellow-500/30 border border-yellow-400" :
                    status === "eliminated" ? "bg-white/5 opacity-40" : "bg-white/10"
                  }`}>
                    <span>{team.flag}</span>
                    <span className={`truncate ${status === "eliminated" ? "line-through" : ""}`}>{team.name}</span>
                    <span className="ml-auto text-xs text-blue-400 font-mono">{pot}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {Array.from({ length: waiting }).map((_, i) => (
        <div key={i} className="rounded-2xl p-4 bg-white/5 border border-dashed border-white/10 text-blue-500/40 text-sm">
          Waiting for member…
        </div>
      ))}
      {isLeader && isDrawn && (
        <LeaderPanel teams={teams} myPhone={myPhone} squadCode={squadCode} onUpdate={onUpdate} />
      )}
    </div>
  );
}

// ── STANDINGS TAB ────────────────────────────────────────────────────────────

function StandingsTab({ members, draws, teams, getTeam }: {
  members: Member[]; draws: Record<string, string[]>;
  teams: Record<string, TeamRow>; getTeam: (id: string) => Team & Partial<TeamRow>;
}) {
  const ranked = [...members].map((m) => {
    const picks = draws[m.phone] ?? [];
    const alive = picks.filter((id) => (teams[id]?.status ?? "alive") === "alive");
    const eliminated = picks.filter((id) => teams[id]?.status === "eliminated");
    const isChamp = picks.some((id) => teams[id]?.status === "champion");
    return { member: m, picks, alive, eliminated, isChamp, score: alive.length };
  }).sort((a, b) => b.score - a.score || (b.isChamp ? 1 : 0) - (a.isChamp ? 1 : 0));

  if (ranked.every((r) => r.picks.length === 0)) {
    return <div className="text-center py-10 text-blue-400/60 text-sm">Standings will show once picks are made.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">Teams still in the race</p>
      {ranked.map(({ member, picks, alive, isChamp }, i) => (
        <div key={member.phone} className={`rounded-2xl p-4 space-y-3 ${isChamp ? "bg-yellow-500/20 border border-yellow-400" : i === 0 && alive.length > 0 ? "bg-blue-800/40 border border-blue-500/40" : "bg-white/5"}`}>
          <div className="flex items-center gap-3">
            <span className={`text-lg font-bold w-7 text-center ${i === 0 ? "text-yellow-300" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-blue-400/60"}`}>
              {isChamp ? "🏆" : `#${i + 1}`}
            </span>
            <span className="font-semibold flex-1">{member.display_name}</span>
            <span className="text-sm font-bold text-blue-300">{alive.length} alive</span>
          </div>
          {picks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {picks.map((id) => {
                const team = getTeam(id);
                const status = teams[id]?.status ?? "alive";
                return (
                  <div key={id} className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm ${
                    status === "champion" ? "bg-yellow-500/30 border border-yellow-400" :
                    status === "eliminated" ? "bg-white/5 opacity-35" : "bg-white/10"
                  }`}>
                    <span>{team.flag}</span>
                    <span className={status === "eliminated" ? "line-through text-xs" : "text-xs"}>{team.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── FIXTURES TAB ─────────────────────────────────────────────────────────────

const PAGE = 3;

function FixturesTab({ fixtures }: {
  fixtures: Fixture[]; isLeader: boolean; myPhone: string; squadCode: string; onUpdate: () => void;
}) {
  const [upcomingLimit, setUpcomingLimit] = useState(PAGE);
  const [pastLimit, setPastLimit] = useState(PAGE);

  const live = fixtures.filter((f) => f.status === "live");
  const upcoming = fixtures.filter((f) => f.status === "upcoming");
  const past = fixtures.filter((f) => f.status === "finished");

  function FixtureCard({ f }: { f: Fixture }) {
    const t1 = TEAM_MAP[f.team1_id];
    const t2 = TEAM_MAP[f.team2_id];
    const t1Name = t1?.name ?? f.team1_name ?? f.team1_id;
    const t2Name = t2?.name ?? f.team2_name ?? f.team2_id;
    const t1Flag = t1?.flag ?? f.team1_flag ?? "🏳️";
    const t2Flag = t2?.flag ?? f.team2_flag ?? "🏳️";
    const d = new Date(f.match_date);
    const isLive = f.status === "live";

    return (
      <div className={`bg-white/5 border rounded-2xl p-4 space-y-3 ${isLive ? "border-green-400/50 bg-green-900/10" : "border-white/10"}`}>
        <div className="flex items-center justify-between text-xs text-blue-400/70">
          <span>{f.stage}</span>
          <div className="flex items-center gap-2">
            {isLive && <span className="text-green-400 font-semibold animate-pulse">● LIVE</span>}
            {f.clock && isLive && <span className="text-green-300 font-mono">{f.clock}</span>}
            <span>{d.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 text-right space-y-1">
            <div className="text-2xl">{t1Flag}</div>
            <div className="text-sm font-semibold">{t1Name}</div>
          </div>
          <div className="text-center px-4">
            {f.status === "upcoming" ? (
              <span className="text-blue-300 font-mono text-lg">VS</span>
            ) : (
              <span className="text-white font-bold text-2xl font-mono">
                {f.team1_score ?? 0} – {f.team2_score ?? 0}
              </span>
            )}
          </div>
          <div className="flex-1 text-left space-y-1">
            <div className="text-2xl">{t2Flag}</div>
            <div className="text-sm font-semibold">{t2Name}</div>
          </div>
        </div>
      </div>
    );
  }

  function Section({ title, items, limit, onMore }: { title: string; items: Fixture[]; limit: number; onMore: () => void }) {
    if (items.length === 0) return null;
    const visible = items.slice(0, limit);
    const hasMore = items.length > limit;
    return (
      <div className="space-y-3">
        <p className="text-xs text-blue-400 uppercase tracking-widest font-semibold">{title}</p>
        {visible.map((f) => <FixtureCard key={f.id} f={f} />)}
        {hasMore && (
          <button onClick={onMore} className="w-full text-xs text-blue-400/60 hover:text-blue-300 py-2 border border-white/10 rounded-xl transition-colors">
            Load more ({items.length - limit} remaining)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-blue-400/50 text-center">Live from FIFA · updates every 60s</p>

      {live.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-green-400 uppercase tracking-widest font-semibold">● Live now</p>
          {live.map((f) => <FixtureCard key={f.id} f={f} />)}
        </div>
      )}

      <Section title="Upcoming" items={upcoming} limit={upcomingLimit} onMore={() => setUpcomingLimit((l) => l + PAGE)} />
      <Section title="Past results" items={past} limit={pastLimit} onMore={() => setPastLimit((l) => l + PAGE)} />

      {fixtures.length === 0 && (
        <div className="text-center py-10 text-blue-400/60 text-sm">Loading fixtures from FIFA…</div>
      )}
    </div>
  );
}

// ── CHAT TAB ──────────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  { bg: "bg-rose-500",    bubble: "bg-rose-600/80",    text: "text-rose-300",    border: "border-rose-500/50"    },
  { bg: "bg-amber-500",   bubble: "bg-amber-600/80",   text: "text-amber-300",   border: "border-amber-500/50"   },
  { bg: "bg-emerald-500", bubble: "bg-emerald-600/80", text: "text-emerald-300", border: "border-emerald-500/50" },
  { bg: "bg-cyan-500",    bubble: "bg-cyan-600/80",    text: "text-cyan-300",    border: "border-cyan-500/50"    },
  { bg: "bg-violet-500",  bubble: "bg-violet-600/80",  text: "text-violet-300",  border: "border-violet-500/50"  },
  { bg: "bg-pink-500",    bubble: "bg-pink-600/80",    text: "text-pink-300",    border: "border-pink-500/50"    },
  { bg: "bg-orange-500",  bubble: "bg-orange-600/80",  text: "text-orange-300",  border: "border-orange-500/50"  },
  { bg: "bg-teal-500",    bubble: "bg-teal-600/80",    text: "text-teal-300",    border: "border-teal-500/50"    },
];

function memberColor(phone: string) {
  let hash = 0;
  for (let i = 0; i < phone.length; i++) hash = (hash * 31 + phone.charCodeAt(i)) >>> 0;
  return MEMBER_COLORS[hash % MEMBER_COLORS.length];
}

function renderContent(content: string) {
  // Highlight @mentions
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <span key={i} className="text-yellow-300 font-semibold">{part}</span>
      : <span key={i}>{part}</span>
  );
}

function ChatTab({ messages, myPhone, squadCode, senderName, members, onSent }: {
  messages: Message[]; myPhone: string; squadCode: string; senderName: string;
  members: { phone: string; display_name: string }[]; onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect @ in input
  function handleTextChange(val: string) {
    setText(val);
    const match = val.match(/@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(name: string) {
    const newText = text.replace(/@\w*$/, `@${name.replace(/\s+/g, "")} `);
    setText(newText);
    setMentionQuery(null);
    inputRef.current?.focus();
  }

  const mentionMatches = mentionQuery !== null
    ? members.filter((m) =>
        m.phone !== myPhone &&
        m.display_name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  async function uploadFile(file: File): Promise<string | null> {
    const ext = file.name.split(".").pop();
    const path = `${squadCode}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { supabase: sb } = await import("@/lib/supabase");
    const { error } = await sb.storage.from("chat-media").upload(path, file, { upsert: false });
    if (error) { setSendError(`Upload failed: ${error.message}`); return null; }
    const { data } = sb.storage.from("chat-media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function sendMessage(mediaUrl?: string) {
    const content = text.trim() || null;
    const image_url = mediaUrl ?? null;
    if (!content && !image_url) return;
    setSendError("");
    setSending(true);
    try {
      const res = await fetch(`/api/squads/${squadCode}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_phone: myPhone,
          sender_name: senderName || "Anonymous",
          content,
          image_url,
          reply_to_id: replyTo?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setText("");
      setReplyTo(null);
      await onSent();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send");
    } finally { setSending(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSendError("");
    const url = await uploadFile(file);
    setUploading(false);
    if (url) await sendMessage(url);
    if (fileRef.current) fileRef.current.value = "";
  }

  const msgMap = Object.fromEntries(messages.map((m) => [m.id, m]));

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function isVideo(url: string) { return /\.(mp4|mov|webm|ogg)(\?|$)/i.test(url); }
  function isAudio(url: string) { return /\.(mp3|wav|ogg|m4a|aac)(\?|$)/i.test(url); }

  let lastDate = "";

  return (
    <div className="space-y-4">
      <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="text-center py-10 text-blue-400/60 text-sm">No messages yet. Say something! 👋</div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_phone === myPhone;
          const color = memberColor(msg.sender_phone);
          const dateLabel = formatDate(msg.created_at);
          const showDate = dateLabel !== lastDate;
          lastDate = dateLabel;
          const quoted = msg.reply_to_id ? msgMap[msg.reply_to_id] : null;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="text-center text-xs text-blue-400/50 py-2">{dateLabel}</div>
              )}
              <div className={`group flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold mt-1 text-white ${color.bg}`}>
                  {msg.sender_name.charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[75%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                  {!isMe && <span className={`text-xs px-1 font-semibold ${color.text}`}>{msg.sender_name}</span>}

                  {/* Quoted reply */}
                  {quoted && (
                    <div className={`text-xs px-3 py-1.5 rounded-xl border-l-2 bg-white/5 max-w-full truncate ${memberColor(quoted.sender_phone).border} ${memberColor(quoted.sender_phone).text}`}>
                      <span className="font-semibold">{quoted.sender_name}: </span>
                      {quoted.content ?? "📎 Media"}
                    </div>
                  )}

                  {msg.content && (
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed text-white ${isMe ? `${color.bubble} rounded-tr-sm` : "bg-white/10 rounded-tl-sm"}`}>
                      {renderContent(msg.content)}
                    </div>
                  )}
                  {msg.image_url && isVideo(msg.image_url) && (
                    <video src={msg.image_url} controls className="max-w-full rounded-2xl max-h-64 border border-white/10" />
                  )}
                  {msg.image_url && isAudio(msg.image_url) && (
                    <audio src={msg.image_url} controls className="w-48 rounded-xl" />
                  )}
                  {msg.image_url && !isVideo(msg.image_url) && !isAudio(msg.image_url) && (
                    <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={msg.image_url} alt="shared" className="max-w-full rounded-2xl max-h-64 object-cover border border-white/10" />
                    </a>
                  )}
                  <div className={`flex items-center gap-2 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className="text-xs text-blue-400/40">{formatTime(msg.created_at)}</span>
                    {myPhone && (
                      <button
                        onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                        className="text-xs text-blue-400/0 group-hover:text-blue-400/50 hover:!text-blue-300 transition-colors"
                      >
                        ↩ Reply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {myPhone ? (
        <div className="space-y-2 border-t border-white/10 pt-3">
          {sendError && <p className="text-xs text-red-400 text-center">{sendError}</p>}

          {/* Reply preview */}
          {replyTo && (
            <div className="flex items-center gap-2 bg-white/5 border border-blue-400/30 rounded-xl px-3 py-2">
              <div className="flex-1 text-xs text-blue-300 truncate">
                <span className="font-semibold">{replyTo.sender_name}: </span>
                {replyTo.content ?? "📎 Media"}
              </div>
              <button onClick={() => setReplyTo(null)} className="text-blue-400/60 hover:text-blue-300 text-sm">✕</button>
            </div>
          )}

          {/* @mention picker */}
          {mentionMatches.length > 0 && (
            <div className="bg-blue-950 border border-white/20 rounded-xl overflow-hidden">
              {mentionMatches.map((m) => (
                <button
                  key={m.phone}
                  type="button"
                  onClick={() => insertMention(m.display_name)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  <span className="font-semibold">{m.display_name}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || sending}
              title="Attach photo, video, or audio"
              className="rounded-xl px-3 py-2 text-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors"
            >
              {uploading ? <span className="animate-spin inline-block">⟳</span> : "📎"}
            </button>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Say something… or type @ to tag"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <button
              type="submit"
              disabled={sending || uploading || !text.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
            >
              {sending ? "…" : "Send"}
            </button>
          </form>
        </div>
      ) : (
        <p className="text-center text-sm text-blue-400/60">Join the squad to chat.</p>
      )}
    </div>
  );
}

// ── LEADER PANEL ─────────────────────────────────────────────────────────────

function LeaderPanel({ teams, myPhone, squadCode, onUpdate }: {
  teams: Record<string, TeamRow>; myPhone: string; squadCode: string; onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  async function setStatus(teamId: string, status: string) {
    setSaving(teamId);
    await fetch("/api/teams", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, status, leader_phone: myPhone, squad_code: squadCode }),
    });
    await onUpdate();
    setSaving(null);
  }

  return (
    <div className="border border-yellow-500/30 rounded-2xl overflow-hidden mt-2">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between bg-yellow-500/10 hover:bg-yellow-500/20 transition-colors text-left">
        <span className="font-semibold text-yellow-300">⚙️ Manage team results</span>
        <span className="text-yellow-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {Object.values(teams).sort((a, b) => a.pot.localeCompare(b.pot)).map((team) => {
            const { flag, name } = { ...TEAM_MAP[team.id], ...team };
            return (
              <div key={team.id} className="flex items-center gap-2">
                <span className="w-6 text-center">{flag}</span>
                <span className="flex-1 text-sm truncate">{name}</span>
                <span className="text-xs text-blue-400 w-4">{team.pot}</span>
                <select value={team.status} disabled={saving === team.id} onChange={(e) => setStatus(team.id, e.target.value)}
                  className="bg-blue-950 border border-white/20 rounded-lg text-xs px-2 py-1">
                  <option value="alive">Alive</option>
                  <option value="eliminated">Eliminated</option>
                  <option value="champion">🏆 Champion</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
