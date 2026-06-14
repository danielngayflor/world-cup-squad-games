import { NextRequest, NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    checkEnv();
    const { data, error } = await supabase.from("teams").select("*").order("pot");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    checkEnv();
    const { team_id, status, leader_phone, squad_code } = await req.json();

    if (!team_id || !status || !leader_phone || !squad_code) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { data: squad } = await supabase
      .from("squads")
      .select("leader_phone")
      .eq("squad_id", squad_code)
      .single();

    if (!squad || squad.leader_phone !== leader_phone) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("teams")
      .update({ status })
      .eq("id", team_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
