"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const CURRENCIES = ["USD", "LRD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD"];

type Mode = "none" | "create" | "join" | "return";
type Screen = "landing" | "play";

function HomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>("landing");
  const [mode, setMode] = useState<Mode>("none");

  const [form, setForm] = useState({
    phone: "", display_name: "", name: "", size: "6",
    stakes_enabled: false, stake_amount: "", currency: "USD",
  });
  const prefillCode = searchParams.get("join") ?? "";
  const [joinForm, setJoinForm] = useState({ phone: "", display_name: "", code: prefillCode, contribution_confirmed: false });
  const [returnForm, setReturnForm] = useState({ phone: "", code: "" });
  const [squadForJoin, setSquadForJoin] = useState<{ stakes_enabled: boolean; stake_amount: number | null; currency: string | null; name: string } | null>(null);

  useEffect(() => {
    if (prefillCode) { setScreen("play"); setMode("join"); }
  }, [prefillCode]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const code = joinForm.code.trim();
    if (code.length === 6) {
      fetch(`/api/squads/${code}`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => d ? setSquadForJoin({ stakes_enabled: d.stakes_enabled, stake_amount: d.stake_amount, currency: d.currency, name: d.name }) : setSquadForJoin(null))
        .catch(() => setSquadForJoin(null));
    } else {
      setSquadForJoin(null);
    }
  }, [joinForm.code]);

  function switchMode(m: Mode) { setMode(m); setError(""); }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leader_phone: form.phone,
          leader_display_name: form.display_name,
          name: form.name,
          member_count_target: Number(form.size),
          stakes_enabled: form.stakes_enabled,
          stake_amount: form.stakes_enabled ? Number(form.stake_amount) : null,
          currency: form.stakes_enabled ? form.currency : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/squad/${data.squad_id}/pick?phone=${encodeURIComponent(form.phone)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (squadForJoin?.stakes_enabled && !joinForm.contribution_confirmed) {
      setError("You must confirm your contribution to join this squad."); return;
    }
    setLoading(true); setError("");
    try {
      const code = joinForm.code.toUpperCase();
      const res = await fetch(`/api/squads/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: joinForm.phone, display_name: joinForm.display_name, contribution_confirmed: joinForm.contribution_confirmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.already_member) {
        setError("That number is already in this squad. Use 'Return to my squad' if this is you.");
        setLoading(false); return;
      }
      router.push(`/squad/${code}/pick?phone=${encodeURIComponent(joinForm.phone)}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  async function handleReturn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const code = returnForm.code.toUpperCase();
      const res = await fetch(`/api/squads/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: returnForm.phone, display_name: "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.already_member) {
        setError("That number isn't in this squad. Check your squad code or phone number.");
        setLoading(false); return;
      }
      const myPicks = data.draw_results?.[returnForm.phone] ?? [];
      if (myPicks.length === 4) {
        router.push(`/squad/${code}?phone=${encodeURIComponent(returnForm.phone)}`);
      } else {
        router.push(`/squad/${code}/pick?phone=${encodeURIComponent(returnForm.phone)}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setLoading(false); }
  }

  // ── LANDING ──────────────────────────────────────────────
  if (screen === "landing") {
    return (
      <div className="space-y-10">
        {/* Hero */}
        <div className="text-center space-y-4 pt-4">
          <div className="text-6xl">⚽</div>
          <h1 className="text-4xl font-bold tracking-tight">World Cup Squad Games</h1>
          <p className="text-blue-200 text-lg max-w-md mx-auto leading-relaxed">
            Get your crew together, blind-draw national teams, and follow them all the way to the final.
          </p>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400 text-center">How it works</h2>
          <div className="space-y-3">
            {[
              { step: "1", icon: "👥", title: "Form a squad", body: "One person creates a squad and invites 3–7 friends using a share code. Everyone joins before picks begin." },
              { step: "2", icon: "🎲", title: "Blind draw", body: "Teams are split into 4 strength pots (A–D). Each player picks a number — not a team name — from each pot. Your team is revealed only after you choose." },
              { step: "3", icon: "🏆", title: "Follow the tournament", body: "Every player ends up with 4 national teams — one from each pot. The player whose team lifts the trophy wins the squad." },
              { step: "4", icon: "💰", title: "Optional stakes", body: "The squad leader can set a stake amount per person as a friendly wager. It's a ledger only — settle up with each other directly." },
            ].map(({ step, icon, title, body }) => (
              <div key={step} className="flex gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600/40 border border-blue-500/40 flex items-center justify-center text-blue-300 font-bold text-sm">
                  {step}
                </div>
                <div className="space-y-0.5">
                  <div className="font-semibold flex items-center gap-2">{icon} {title}</div>
                  <p className="text-sm text-blue-200/80 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rules */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-400">The rules</h2>
          <ul className="space-y-2 text-sm text-blue-100/90">
            {[
              "Each player draws exactly 4 teams — one from each pot.",
              "Picks are made one pot at a time, in order A → B → C → D.",
              "You cannot see team names before picking — only a number.",
              "Once a team is picked, it is removed from the pool for everyone else.",
              "Your phone number is your identity. Each number can only be in one squad.",
              "The squad leader tracks eliminations and declares the champion.",
              "If the winning team was not drawn by anyone, there is no winner.",
            ].map((rule, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-blue-400 mt-0.5 flex-shrink-0">→</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => setScreen("play")}
          className="w-full py-4 rounded-2xl font-bold text-lg tracking-wide transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb, #3b82f6)", boxShadow: "0 4px 24px rgba(59,130,246,0.35)" }}
        >
          Let&apos;s Play →
        </button>
      </div>
    );
  }

  // ── PLAY (create / join / return) ────────────────────────
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">⚽ World Cup Squad Games</h1>
        <p className="text-blue-300">Draft 4 teams with your crew. Whoever holds the champion wins.</p>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-xl p-3 text-sm">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => switchMode("create")}
          className={`rounded-2xl p-5 text-left space-y-1 transition-colors ${mode === "create" ? "bg-blue-600 ring-2 ring-blue-400" : "bg-blue-800/50 hover:bg-blue-700/70"}`}>
          <div className="text-2xl">🏆</div>
          <div className="font-bold">Create a squad</div>
          <div className="text-blue-200 text-xs">Start a new group</div>
        </button>
        <button onClick={() => switchMode("join")}
          className={`rounded-2xl p-5 text-left space-y-1 transition-colors ${mode === "join" ? "bg-blue-600 ring-2 ring-blue-400" : "bg-white/10 hover:bg-white/20"}`}>
          <div className="text-2xl">🤝</div>
          <div className="font-bold">Join a squad</div>
          <div className="text-blue-200 text-xs">Enter an invite code</div>
        </button>
        <button onClick={() => switchMode("return")}
          className={`rounded-2xl p-5 text-left space-y-1 transition-colors ${mode === "return" ? "bg-blue-600 ring-2 ring-blue-400" : "bg-white/10 hover:bg-white/20"}`}>
          <div className="text-2xl">🔑</div>
          <div className="font-bold">Return to squad</div>
          <div className="text-blue-200 text-xs">Already joined? Come back</div>
        </button>
      </div>

      {mode === "create" && (
        <form onSubmit={handleCreate} className="bg-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-xl">Create your squad</h2>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Your phone number <span className="text-blue-400/60">(your unique ID — keep it safe)</span></span>
            <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Your display name</span>
            <input required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Your name"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Squad name</span>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="The Lads ⚽"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">How many people? (4–8)</span>
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}
              className="w-full bg-blue-950 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400">
              {[4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} people</option>)}
            </select>
          </label>
          <div className="border border-white/10 rounded-xl p-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.stakes_enabled} onChange={(e) => setForm({ ...form, stakes_enabled: e.target.checked })} className="w-4 h-4 accent-blue-400" />
              <span className="font-medium">Add stakes 💰 <span className="text-blue-300 font-normal text-sm">(optional)</span></span>
            </label>
            {form.stakes_enabled && (
              <div className="space-y-3 pt-1">
                <div className="flex gap-2">
                  <label className="flex-1 space-y-1">
                    <span className="text-sm text-blue-200">Amount per person</span>
                    <input type="number" required min="1" value={form.stake_amount} onChange={(e) => setForm({ ...form, stake_amount: e.target.value })} placeholder="20"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm text-blue-200">Currency</span>
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="bg-blue-950 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400">
                      {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
                <p className="text-xs text-yellow-300/80">💡 This is a ledger only — no money is collected here. Members settle up directly.</p>
              </div>
            )}
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors rounded-xl py-2 font-bold">
            {loading ? "Creating…" : "Create squad →"}
          </button>
          <p className="text-xs text-yellow-300/80">⚠️ Your phone number is your identity in this squad — only you should use it.</p>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoin} className="bg-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-xl">Join a squad</h2>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Squad code</span>
            <input required value={joinForm.code} onChange={(e) => setJoinForm({ ...joinForm, code: e.target.value.toUpperCase() })} placeholder="ABC123" maxLength={6}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 uppercase tracking-widest font-mono focus:outline-none focus:border-blue-400" />
          </label>
          {squadForJoin && <p className="text-blue-300 text-sm">Joining: <strong>{squadForJoin.name}</strong></p>}
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Your display name</span>
            <input required value={joinForm.display_name} onChange={(e) => setJoinForm({ ...joinForm, display_name: e.target.value })} placeholder="Your name"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Your phone number <span className="text-blue-400/60">(your unique ID — keep it safe)</span></span>
            <input type="tel" required value={joinForm.phone} onChange={(e) => setJoinForm({ ...joinForm, phone: e.target.value })} placeholder="+1 555 000 0000"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
          </label>
          {squadForJoin?.stakes_enabled && (
            <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-xl p-4 space-y-3">
              <p className="font-medium text-yellow-200">💰 This squad has a {squadForJoin.currency} {squadForJoin.stake_amount} stake per person</p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={joinForm.contribution_confirmed} onChange={(e) => setJoinForm({ ...joinForm, contribution_confirmed: e.target.checked })} className="mt-0.5 w-4 h-4 accent-yellow-400" />
                <span className="text-sm text-yellow-100">I agree to contribute {squadForJoin.currency} {squadForJoin.stake_amount} to the pot.</span>
              </label>
              <p className="text-xs text-yellow-300/70">This is a record of agreement, not a payment. Settle up directly.</p>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors rounded-xl py-2 font-bold">
            {loading ? "Joining…" : "Join squad →"}
          </button>
          <p className="text-xs text-blue-400/80">
            Already in this squad?{" "}
            <button type="button" onClick={() => switchMode("return")} className="underline text-blue-300">Return to your squad instead →</button>
          </p>
        </form>
      )}

      {mode === "return" && (
        <form onSubmit={handleReturn} className="bg-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-bold text-xl">🔑 Return to your squad</h2>
          <p className="text-blue-300 text-sm">Enter your squad code and the phone number you used when you joined.</p>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Squad code</span>
            <input required value={returnForm.code} onChange={(e) => setReturnForm({ ...returnForm, code: e.target.value.toUpperCase() })} placeholder="ABC123" maxLength={6}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 uppercase tracking-widest font-mono focus:outline-none focus:border-blue-400" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-blue-200">Your phone number</span>
            <input type="tel" required value={returnForm.phone} onChange={(e) => setReturnForm({ ...returnForm, phone: e.target.value })} placeholder="+1 555 000 0000"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400" />
          </label>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors rounded-xl py-2 font-bold">
            {loading ? "Looking up…" : "Enter my squad →"}
          </button>
        </form>
      )}

      <button onClick={() => setScreen("landing")} className="text-xs text-blue-400/60 hover:text-blue-300 transition-colors mx-auto block">
        ← Back to rules
      </button>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeInner />
    </Suspense>
  );
}
