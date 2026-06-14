"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { TEAM_MAP } from "@/lib/teams";
import type { Squad } from "@/lib/supabase";

const POTS = ["A", "B", "C", "D"] as const;
const POT_LABELS: Record<string, string> = {
  A: "Pot A — Strongest Teams",
  B: "Pot B",
  C: "Pot C",
  D: "Pot D — Weakest Teams",
};

type Reveal = { teamId: string; pot: string; number: number };

export default function PickPage() {
  const { code } = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const myPhone = searchParams.get("phone") ?? "";

  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [reveals, setReveals] = useState<Reveal[]>([]);
  const [done, setDone] = useState(false);

  const fetchSquad = useCallback(async () => {
    const res = await fetch(`/api/squads/${code}`);
    if (!res.ok) { setError("Squad not found"); setLoading(false); return; }
    const data: Squad = await res.json();
    setSquad(data);
    setLoading(false);

    // If already picked all 4 → go to squad page
    const myPicks = data.draw_results?.[myPhone] ?? [];
    if (myPicks.length === 4) {
      setDone(true);
    }
  }, [code, myPhone]);

  useEffect(() => { fetchSquad(); }, [fetchSquad]);

  const myPicks = squad?.draw_results?.[myPhone] ?? [];
  const currentPotIndex = myPicks.length; // 0=A, 1=B, 2=C, 3=D
  const currentPot = POTS[currentPotIndex];
  const availableCount = squad?.pick_state?.pot_counts?.[currentPot] ?? 0;

  async function handlePick(number: number) {
    if (picking || !currentPot) return;
    setPicking(true);
    setError("");
    try {
      const res = await fetch(`/api/squads/${code}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: myPhone, pot: currentPot, number }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        // Refresh counts in case number was taken
        await fetchSquad();
        return;
      }
      setReveals((prev) => [...prev, { teamId: data.picked_team.id, pot: currentPot, number }]);
      setSquad(data.squad);

      const newPicks = (data.squad.draw_results?.[myPhone] ?? []);
      if (newPicks.length === 4) setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong, try again");
    } finally {
      setPicking(false);
    }
  }

  if (loading) return <div className="text-center py-20 text-blue-300">Loading…</div>;
  if (!squad) return <div className="text-center py-20 text-red-300">{error || "Squad not found"}</div>;

  // Done picking — show summary then enter
  if (done) {
    const allPicks = squad.draw_results?.[myPhone] ?? [];
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">Your teams are set!</h1>
          <p className="text-blue-300">Here's what you drew from each pot</p>
        </div>
        <div className="space-y-3">
          {allPicks.map((teamId, i) => {
            const team = TEAM_MAP[teamId];
            return (
              <div key={teamId} className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-4">
                <span className="text-3xl">{team?.flag}</span>
                <div>
                  <p className="font-bold">{team?.name}</p>
                  <p className="text-xs text-blue-300">Pot {POTS[i]}</p>
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => router.push(`/squad/${code}?phone=${encodeURIComponent(myPhone)}`)}
          className="w-full bg-blue-600 hover:bg-blue-500 transition-colors rounded-xl py-3 font-bold text-lg"
        >
          Enter the squad →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{squad.name}</h1>
        <p className="text-blue-300 text-sm">Pick your 4 teams — one blind number from each pot</p>
      </div>

      {/* Progress */}
      <div className="grid grid-cols-4 gap-2">
        {POTS.map((pot, i) => (
          <div key={pot} className={`text-center py-2 rounded-xl text-sm font-medium transition-colors ${
            i < currentPotIndex ? "bg-blue-700/50 text-blue-200" :
            pot === currentPot ? "bg-blue-600 text-white" :
            "bg-white/10 text-blue-500/40"
          }`}>
            {i < currentPotIndex ? "✓" : `Pot ${pot}`}
          </div>
        ))}
      </div>

      {/* Reveals so far */}
      {reveals.length > 0 && (
        <div className="space-y-2">
          {reveals.map((r) => {
            const team = TEAM_MAP[r.teamId];
            return (
              <div key={r.pot} className="flex items-center gap-3 bg-blue-600/20 border border-blue-500/30 rounded-xl px-4 py-3 text-sm">
                <span className="text-2xl">{team?.flag}</span>
                <div>
                  <span className="font-semibold">{team?.name}</span>
                  <span className="text-blue-400 text-xs ml-2">from Pot {r.pot} (your #{r.number})</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 rounded-xl p-3 text-sm">{error}</div>
      )}

      {/* Pick panel */}
      <div className="bg-white/10 rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-blue-300 uppercase tracking-wide font-medium">{POT_LABELS[currentPot]}</p>
          <p className="font-bold text-lg">Pick a number</p>
          <p className="text-blue-400/70 text-xs">
            {availableCount} number{availableCount !== 1 ? "s" : ""} remaining — your team is hidden until you choose
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: availableCount }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => handlePick(n)}
              disabled={picking}
              className="aspect-square rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 disabled:cursor-wait font-bold text-xl transition-all"
            >
              {picking ? "…" : n}
            </button>
          ))}
        </div>
      </div>

      {/* What others have picked (teams revealed, not numbers) */}
      {(() => {
        const others = (squad.members ?? []).filter((m) => m.phone !== myPhone && (squad.draw_results?.[m.phone]?.length ?? 0) > 0);
        if (!others.length) return null;
        return (
          <div className="space-y-2">
            <p className="text-xs text-blue-300 uppercase tracking-wide font-medium">Others have picked</p>
            {others.map((m) => {
              const picks = squad.draw_results?.[m.phone] ?? [];
              return (
                <div key={m.phone} className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 text-sm">
                  <span className="flex-1">{m.display_name}</span>
                  <div className="flex gap-1">
                    {picks.map((id) => <span key={id}>{TEAM_MAP[id]?.flag}</span>)}
                    {Array.from({ length: 4 - picks.length }).map((_, i) => (
                      <span key={i} className="text-blue-500/20">?</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}
