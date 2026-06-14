import { NextRequest, NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";
import { generateSquadCode, initPotMaps } from "@/lib/draw";
import { TEAMS } from "@/lib/teams";
import { sanitizeSquad } from "@/lib/sanitizeSquad";

function buildTeamsByPot() {
  const teamsByPot: Record<string, string[]> = { A: [], B: [], C: [], D: [] };
  TEAMS.forEach((t) => teamsByPot[t.pot].push(t.id));
  return teamsByPot;
}

export async function POST(req: NextRequest) {
  try {
    checkEnv();
    const { leader_phone, leader_display_name, name, member_count_target, stakes_enabled, stake_amount, currency } = await req.json();

    if (!leader_phone || !name || !member_count_target) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (member_count_target < 4 || member_count_target > 8) {
      return NextResponse.json({ error: "Squad size must be 4–8" }, { status: 400 });
    }
    if (stakes_enabled && (!stake_amount || stake_amount <= 0)) {
      return NextResponse.json({ error: "Enter a valid stake amount" }, { status: 400 });
    }

    // Check if this phone is already in any existing squad
    const { data: existing } = await supabase
      .from("squads")
      .select("squad_id, name")
      .filter("members", "cs", JSON.stringify([{ phone: leader_phone }]));

    if (existing && existing.length > 0) {
      const s = existing[0];
      void s;
      return NextResponse.json({
        error: `This number is already in a squad. Use "Return to squad" to get back in.`,
      }, { status: 409 });
    }

    const squad_id = generateSquadCode();
    const member = {
      phone: leader_phone,
      display_name: leader_display_name || "Leader",
      joined_at: new Date().toISOString(),
      ...(stakes_enabled ? { contribution_confirmed: true } : {}),
    };

    // Initialize pot maps immediately so leader can pick right away
    const pot_maps = initPotMaps(buildTeamsByPot());

    const { data, error } = await supabase
      .from("squads")
      .insert({
        squad_id, name, leader_phone, member_count_target,
        status: "forming",
        members: [member],
        draw_results: { [leader_phone]: [] },
        pot_maps,
        stakes_enabled: !!stakes_enabled,
        stake_amount: stakes_enabled ? stake_amount : null,
        currency: stakes_enabled ? (currency || "USD") : null,
      })
      .select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(sanitizeSquad(data));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
