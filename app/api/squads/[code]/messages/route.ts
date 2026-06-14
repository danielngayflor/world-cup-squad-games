import { NextRequest, NextResponse } from "next/server";
import { supabase, checkEnv } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    checkEnv();
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("squad_id", params.code.toUpperCase())
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    checkEnv();
    const { sender_phone, sender_name, content, image_url } = await req.json();
    const code = params.code.toUpperCase();
    if (!sender_phone || (!content && !image_url)) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const { data, error } = await supabase.from("messages").insert({
      squad_id: code, sender_phone, sender_name, content, image_url,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Server error" }, { status: 500 });
  }
}
