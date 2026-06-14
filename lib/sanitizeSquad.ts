export function sanitizeSquad(squad: Record<string, unknown>) {
  const ps = squad.pot_maps as Record<string, Record<string, string>> | null;
  const pick_state = ps
    ? { pot_counts: Object.fromEntries(Object.entries(ps).map(([pot, map]) => [pot, Object.keys(map).length])) }
    : null;
  const { pot_maps: _omit, ...rest } = squad;
  void _omit;
  return { ...rest, pick_state };
}
