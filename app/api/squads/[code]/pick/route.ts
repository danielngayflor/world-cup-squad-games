import { NextRequest, NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";
import { buildNumberMap, POTS } from "@/lib/draw";
import { TEAMS } from "@/lib/teams";
import { sanitizeSquad } from "@/lib/sanitizeSquad";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    checkEnv();
    const { phone, pot, number } = await req.json();
    const code = params.code.toUpperCase();

    if (!phone || !pot || !number) {
      return NextResponse.json({ error: "Missing phone, pot, or number" }, { status: 400 });
    }
    if (!POTS.includes(pot)) {
      return NextResponse.json({ error: "Invalid pot" }, { status: 400 });
    }

    const { data: squad } = await supabase
      .from("squads").select("*").eq("squad_id", code).single();

    if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    if (squad.status === "drawn" || squad.status === "completed") {
      return NextResponse.json({ error: "Picks are already complete" }, { status: 409 });
    }

    // Initialize pot_maps if missing (squads created before this feature)
    if (!squad.pot_maps) {
      const pickedIds = new Set(Object.values((squad.draw_results ?? {}) as Record<string, string[]>).flat());
      const newPotMaps: Record<string, Record<string, string>> = {};
      for (const p of POTS) {
        const available = TEAMS.filter((t) => t.pot === p && !pickedIds.has(t.id)).map((t) => t.id);
        newPotMaps[p] = buildNumberMap(available);
      }
      await supabase.from("squads").update({ pot_maps: newPotMaps }).eq("squad_id", code);
      squad.pot_maps = newPotMaps;
    }

    // Ensure draw_results has an entry for this phone
    if (!squad.draw_results) squad.draw_results = {};
    if (!squad.draw_results[phone]) squad.draw_results[phone] = [];

    // Validate member
    const member = (squad.members ?? []).find((m: { phone: string }) => m.phone === phone);
    if (!member) return NextResponse.json({ error: "You are not in this squad" }, { status: 403 });

    const draw_results: Record<string, string[]> = squad.draw_results ?? {};
    const myPicks = draw_results[phone] ?? [];
    const potIndex = POTS.indexOf(pot as typeof POTS[number]);

    // Enforce picking in order A→B→C→D
    if (myPicks.length !== potIndex) {
      return NextResponse.json({ error: `Pick from Pot ${POTS[myPicks.length]} first` }, { status: 400 });
    }

    // Already picked from this pot
    if (myPicks.length > potIndex) {
      return NextResponse.json({ error: `Already picked from Pot ${pot}` }, { status: 409 });
    }

    const pot_maps = squad.pot_maps as Record<string, Record<string, string>>;
    const potMap = pot_maps[pot];
    const teamId = potMap?.[String(number)];

    if (!teamId) {
      return NextResponse.json({ error: "That number is no longer available — pick again" }, { status: 409 });
    }

    // Record pick
    draw_results[phone] = [...myPicks, teamId];

    // Remove picked team from pot map and reshuffle remaining
    const remaining = Object.values(potMap).filter((id) => id !== teamId);
    const newPotMaps = { ...pot_maps, [pot]: buildNumberMap(remaining) };

    // Check if everyone is done (all members have 4 picks AND squad is full)
    const allMembers: { phone: string }[] = squad.members ?? [];
    const allPicked = allMembers.every((m) => (draw_results[m.phone] ?? []).length === 4);
    const squadFull = allMembers.length === squad.member_count_target;
    const newStatus = allPicked && squadFull ? "drawn" : squad.status;

    const { error: updateError } = await supabase.from("squads").update({
      draw_results,
      pot_maps: newPotMaps,
      status: newStatus,
    }).eq("squad_id", code);

    if (updateError) {
      return NextResponse.json({ error: `Failed to save pick: ${updateError.message}` }, { status: 500 });
    }

    const pickedTeam = TEAMS.find((t) => t.id === teamId)!;

    const { data: fresh, error: fetchError } = await supabase
      .from("squads").select("*").eq("squad_id", code).single();

    if (fetchError || !fresh) {
      return NextResponse.json({ error: "Pick saved but failed to load updated squad" }, { status: 500 });
    }

    return NextResponse.json({ picked_team: pickedTeam, squad: sanitizeSquad(fresh) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
