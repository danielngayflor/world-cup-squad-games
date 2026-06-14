import { NextRequest, NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";
import { sanitizeSquad } from "@/lib/sanitizeSquad";
import { buildNumberMap, POTS } from "@/lib/draw";
import { TEAMS } from "@/lib/teams";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    checkEnv();
    const { data, error } = await supabase
      .from("squads").select("*")
      .eq("squad_id", params.code.toUpperCase()).single();

    if (error || !data) return NextResponse.json({ error: "Squad not found" }, { status: 404 });

    // Auto-initialize pot_maps and draw_results for squads created before these features
    if (!data.pot_maps || !data.draw_results) {
      const pickedIds = new Set(
        Object.values((data.draw_results ?? {}) as Record<string, string[]>).flat()
      );
      const pot_maps = data.pot_maps ?? Object.fromEntries(
        POTS.map((p) => [p, buildNumberMap(TEAMS.filter((t) => t.pot === p && !pickedIds.has(t.id)).map((t) => t.id))])
      );
      const draw_results = data.draw_results ?? Object.fromEntries(
        (data.members ?? []).map((m: { phone: string }) => [m.phone, []])
      );
      await supabase.from("squads").update({ pot_maps, draw_results }).eq("squad_id", data.squad_id);
      data.pot_maps = pot_maps;
      data.draw_results = draw_results;
    }

    return NextResponse.json(sanitizeSquad(data));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
