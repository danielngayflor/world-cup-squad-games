import { NextRequest, NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";
import { sanitizeSquad } from "@/lib/sanitizeSquad";

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    checkEnv();
    const { phone, display_name, contribution_confirmed } = await req.json();
    const code = params.code.toUpperCase();

    if (!phone || !display_name) {
      return NextResponse.json({ error: "Missing phone or display_name" }, { status: 400 });
    }

    const { data: squad } = await supabase
      .from("squads").select("*").eq("squad_id", code).single();

    if (!squad) return NextResponse.json({ error: "Squad not found" }, { status: 404 });
    if (squad.status === "drawn" || squad.status === "completed") {
      return NextResponse.json({ error: "Squad is closed — picks are already done" }, { status: 409 });
    }

    const members = squad.members ?? [];
    if (members.some((m: { phone: string }) => m.phone === phone)) {
      // Existing member re-logging in — return their squad so the client can redirect them
      return NextResponse.json({ ...sanitizeSquad(squad), already_member: true });
    }
    if (members.length >= squad.member_count_target) {
      return NextResponse.json({ error: "Squad is full" }, { status: 409 });
    }

    // Block if phone is already in a different squad
    const { data: otherSquads } = await supabase
      .from("squads")
      .select("squad_id, name")
      .filter("members", "cs", JSON.stringify([{ phone }]))
      .neq("squad_id", code);

    if (otherSquads && otherSquads.length > 0) {
      const s = otherSquads[0];
      void s;
      return NextResponse.json({
        error: `This number is already in a squad. Use "Return to squad" to get back in.`,
      }, { status: 409 });
    }

    const newMember = {
      phone, display_name,
      joined_at: new Date().toISOString(),
      ...(squad.stakes_enabled ? { contribution_confirmed: !!contribution_confirmed } : {}),
    };

    const draw_results = { ...(squad.draw_results ?? {}), [phone]: [] };

    const { error } = await supabase
      .from("squads")
      .update({ members: [...members, newMember], draw_results })
      .eq("squad_id", code);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: fresh } = await supabase
      .from("squads").select("*").eq("squad_id", code).single();

    return NextResponse.json(sanitizeSquad(fresh));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
