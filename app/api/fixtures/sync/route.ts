import { NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";
import { TEAMS } from "@/lib/teams";

export const dynamic = "force-dynamic";

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=100&dates=20260611-20260719";

function matchStatus(espnStatus: string): "upcoming" | "live" | "finished" {
  if (espnStatus === "STATUS_FULL_TIME" || espnStatus === "STATUS_FINAL" || espnStatus === "STATUS_FT_PEN") return "finished";
  if (espnStatus === "STATUS_SCHEDULED" || espnStatus === "STATUS_POSTPONED") return "upcoming";
  return "live";
}

function findTeamId(name: string): string {
  const lower = name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const found = TEAMS.find((t) => {
    const tLower = t.name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    return tLower === lower || lower.includes(tLower) || tLower.includes(lower);
  });
  return found?.id ?? name.toLowerCase().replace(/\s+/g, "_");
}

export async function POST() {
  try {
    checkEnv();

    const res = await fetch(ESPN_URL, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch ESPN data" }, { status: 502 });

    const data = await res.json();
    const events: unknown[] = data.events ?? [];

    const fixtures = events.map((e) => {
      const ev = e as Record<string, unknown>;
      const comp = ((ev.competitions as unknown[]) ?? [])[0] as Record<string, unknown>;
      const competitors: unknown[] = (comp?.competitors as unknown[]) ?? [];
      const home = competitors.find((c) => (c as Record<string, unknown>).homeAway === "home") as Record<string, unknown> | undefined;
      const away = competitors.find((c) => (c as Record<string, unknown>).homeAway === "away") as Record<string, unknown> | undefined;
      const status = ((ev.status as Record<string, unknown>)?.type as Record<string, unknown>)?.name as string ?? "STATUS_SCHEDULED";
      const stageName = (((comp?.season as Record<string, unknown>)?.slug as string) ?? (((ev.competitions as unknown[])?.[0] as Record<string, unknown>)?.type as Record<string, unknown>)?.text as string ?? "Group Stage");
      const note = (comp?.notes as unknown[] ?? [])[0] as Record<string, unknown> | undefined;
      const stage = (note?.headline as string) ?? "Group Stage";

      const homeTeamName = (home?.team as Record<string, unknown>)?.displayName as string ?? "";
      const awayTeamName = (away?.team as Record<string, unknown>)?.displayName as string ?? "";

      void stageName;

      return {
        espn_id: ev.id as string,
        team1_id: findTeamId(homeTeamName),
        team2_id: findTeamId(awayTeamName),
        team1_name: homeTeamName,
        team2_name: awayTeamName,
        team1_score: home?.score != null ? Number(home.score) : null,
        team2_score: away?.score != null ? Number(away.score) : null,
        match_date: ev.date as string,
        stage,
        status: matchStatus(status),
      };
    });

    // Upsert into Supabase using espn_id as the dedup key
    let inserted = 0;
    let updated = 0;
    for (const f of fixtures) {
      const { data: existing } = await supabase
        .from("fixtures")
        .select("id")
        .eq("espn_id", f.espn_id)
        .single();

      if (existing) {
        await supabase.from("fixtures").update({
          team1_score: f.team1_score,
          team2_score: f.team2_score,
          status: f.status,
          stage: f.stage,
        }).eq("espn_id", f.espn_id);
        updated++;
      } else {
        await supabase.from("fixtures").insert({
          espn_id: f.espn_id,
          team1_id: f.team1_id,
          team2_id: f.team2_id,
          team1_name: f.team1_name,
          team2_name: f.team2_name,
          team1_score: f.team1_score,
          team2_score: f.team2_score,
          match_date: f.match_date,
          stage: f.stage,
          status: f.status,
        });
        inserted++;
      }
    }

    return NextResponse.json({ ok: true, total: fixtures.length, inserted, updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
