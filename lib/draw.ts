export function generateSquadCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => chars[b % chars.length]).join("");
}

export function shuffle<T>(arr: T[]): T[] {
  const buf = new Uint32Array(arr.length);
  crypto.getRandomValues(buf);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Build a fresh number→teamId map from a list of team ids (randomly ordered)
export function buildNumberMap(teamIds: string[]): Record<string, string> {
  const shuffled = shuffle([...teamIds]);
  return Object.fromEntries(shuffled.map((id, i) => [String(i + 1), id]));
}

// Called at squad creation — builds a hidden number→team map for each pot
export function initPotMaps(teamsByPot: Record<string, string[]>) {
  return {
    A: buildNumberMap(teamsByPot["A"]),
    B: buildNumberMap(teamsByPot["B"]),
    C: buildNumberMap(teamsByPot["C"]),
    D: buildNumberMap(teamsByPot["D"]),
  };
}

export const POTS = ["A", "B", "C", "D"] as const;
