import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});

export function checkEnv() {
  if (!url || !key) {
    throw new Error("Supabase not configured — copy .env.local.example to .env.local and fill in your project URL and anon key.");
  }
}

export type Member = {
  phone: string;
  display_name: string;
  joined_at: string;
  contribution_confirmed?: boolean;
};

// Sent to client — counts only, no team names exposed
export type PickState = {
  pot_counts: Record<string, number>; // how many numbers remain per pot
};

export type Squad = {
  id: string;
  squad_id: string;
  name: string;
  leader_phone: string;
  member_count_target: number;
  status: "forming" | "picking" | "drawn" | "active" | "completed";
  members: Member[];
  draw_results: Record<string, string[]> | null;
  pick_state: PickState | null;
  stakes_enabled: boolean;
  stake_amount: number | null;
  currency: string | null;
  created_at: string;
};

export type TeamRow = {
  id: string;
  name: string;
  flag: string;
  pot: "A" | "B" | "C" | "D";
  status: "alive" | "eliminated" | "champion";
};
