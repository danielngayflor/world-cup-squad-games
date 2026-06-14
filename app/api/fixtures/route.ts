import { NextResponse } from "next/server";
import { TEAMS } from "@/lib/teams";

export const dynamic = "force-dynamic";

const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=100&dates=20260611-20260719";

function matchStatus(s: string): "upcoming" | "live" | "finished" {
  if (s === "STATUS_FULL_TIME" || s === "STATUS_FINAL" || s === "STATUS_FT_PEN" || s === "STATUS_ABANDONED") return "finished";
  if (s === "STATUS_SCHEDULED" || s === "STATUS_POSTPONED") return "upcoming";
  return "live";
}

function findTeam(name: string) {
  if (!name) return null;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const n = norm(name);
  return TEAMS.find((t) => {
    const tn = norm(t.name);
    return tn === n || n.includes(tn) || tn.includes(n);
  }) ?? null;
}

export async function GET() {
  try {
    const res = await fetch(ESPN_URL, { next: { revalidate: 60 } });
    if (!res.ok) return NextResponse.json([], { status: 200 });

    const data = await res.json();
    const events: unknown[] = data.events ?? [];

    const fixtures = events.map((e) => {
      const ev = e as Record<string, unknown>;
      const comp = ((ev.competitions as unknown[]) ?? [])[0] as Record<string, unknown>;
      const competitors: unknown[] = (comp?.competitors as unknown[]) ?? [];
      const home = competitors.find((c) => (c as Record<string, unknown>).homeAway === "home") as Record<string, unknown> | undefined;
      const away = competitors.find((c) => (c as Record<string, unknown>).homeAway === "away") as Record<string, unknown> | undefined;
      const espnStatus = ((ev.status as Record<string, unknown>)?.type as Record<string, unknown>)?.name as string ?? "STATUS_SCHEDULED";
      const note = ((comp?.notes as unknown[]) ?? [])[0] as Record<string, unknown> | undefined;
      const stage = (note?.headline as string) ?? "Group Stage";
      const homeTeamName = (home?.team as Record<string, unknown>)?.displayName as string ?? "";
      const awayTeamName = (away?.team as Record<string, unknown>)?.displayName as string ?? "";
      const t1 = findTeam(homeTeamName);
      const t2 = findTeam(awayTeamName);
      const clock = ((ev.status as Record<string, unknown>)?.displayClock as string) ?? "";
      const period = ((ev.status as Record<string, unknown>)?.period as number) ?? 0;

      return {
        id: ev.id as string,
        team1_id: t1?.id ?? homeTeamName.toLowerCase().replace(/\s+/g, "_"),
        team2_id: t2?.id ?? awayTeamName.toLowerCase().replace(/\s+/g, "_"),
        team1_name: homeTeamName,
        team2_name: awayTeamName,
        team1_flag: t1?.flag ?? "🏳️",
        team2_flag: t2?.flag ?? "🏳️",
        team1_score: home?.score != null ? Number(home.score) : null,
        team2_score: away?.score != null ? Number(away.score) : null,
        match_date: ev.date as string,
        stage,
        status: matchStatus(espnStatus),
        clock: clock && period > 0 ? `${clock}` : null,
      };
    });

    // Sort: live first, then upcoming by date, then finished by date desc
    fixtures.sort((a, b) => {
      const order = { live: 0, upcoming: 1, finished: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      if (a.status === "finished") return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
      return new Date(a.match_date).getTime() - new Date(b.match_date).getTime();
    });

    return NextResponse.json(fixtures);
  } catch {
    return NextResponse.json([]);
  }
}
