export type TeamStatus = "alive" | "eliminated" | "champion";

export interface Team {
  id: string;
  name: string;
  flag: string;
  pot: "A" | "B" | "C" | "D";
  status: TeamStatus;
}

export const TEAMS: Team[] = [
  // Pot A — strongest
  { id: "arg", name: "Argentina", flag: "🇦🇷", pot: "A", status: "alive" },
  { id: "fra", name: "France", flag: "🇫🇷", pot: "A", status: "alive" },
  { id: "eng", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", pot: "A", status: "alive" },
  { id: "bra", name: "Brazil", flag: "🇧🇷", pot: "A", status: "alive" },
  { id: "bel", name: "Belgium", flag: "🇧🇪", pot: "A", status: "alive" },
  { id: "por", name: "Portugal", flag: "🇵🇹", pot: "A", status: "alive" },
  { id: "ned", name: "Netherlands", flag: "🇳🇱", pot: "A", status: "alive" },
  { id: "spa", name: "Spain", flag: "🇪🇸", pot: "A", status: "alive" },
  { id: "ger", name: "Germany", flag: "🇩🇪", pot: "A", status: "alive" },
  { id: "usa", name: "USA", flag: "🇺🇸", pot: "A", status: "alive" },
  { id: "can", name: "Canada", flag: "🇨🇦", pot: "A", status: "alive" },
  { id: "mex", name: "Mexico", flag: "🇲🇽", pot: "A", status: "alive" },
  // Pot B
  { id: "uru", name: "Uruguay", flag: "🇺🇾", pot: "B", status: "alive" },
  { id: "col", name: "Colombia", flag: "🇨🇴", pot: "B", status: "alive" },
  { id: "cro", name: "Croatia", flag: "🇭🇷", pot: "B", status: "alive" },
  { id: "den", name: "Denmark", flag: "🇩🇰", pot: "B", status: "alive" },
  { id: "swi", name: "Switzerland", flag: "🇨🇭", pot: "B", status: "alive" },
  { id: "sen", name: "Senegal", flag: "🇸🇳", pot: "B", status: "alive" },
  { id: "aus", name: "Australia", flag: "🇦🇺", pot: "B", status: "alive" },
  { id: "jap", name: "Japan", flag: "🇯🇵", pot: "B", status: "alive" },
  { id: "kor", name: "South Korea", flag: "🇰🇷", pot: "B", status: "alive" },
  { id: "pol", name: "Poland", flag: "🇵🇱", pot: "B", status: "alive" },
  { id: "mar", name: "Morocco", flag: "🇲🇦", pot: "B", status: "alive" },
  { id: "ira", name: "Iran", flag: "🇮🇷", pot: "B", status: "alive" },
  // Pot C
  { id: "mex2", name: "Ecuador", flag: "🇪🇨", pot: "C", status: "alive" },
  { id: "qat", name: "Qatar", flag: "🇶🇦", pot: "C", status: "alive" },
  { id: "tun", name: "Tunisia", flag: "🇹🇳", pot: "C", status: "alive" },
  { id: "crc", name: "Costa Rica", flag: "🇨🇷", pot: "C", status: "alive" },
  { id: "ser", name: "Serbia", flag: "🇷🇸", pot: "C", status: "alive" },
  { id: "wal", name: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿", pot: "C", status: "alive" },
  { id: "cmr", name: "Cameroon", flag: "🇨🇲", pot: "C", status: "alive" },
  { id: "gha", name: "Ghana", flag: "🇬🇭", pot: "C", status: "alive" },
  { id: "nga", name: "Nigeria", flag: "🇳🇬", pot: "C", status: "alive" },
  { id: "egy", name: "Egypt", flag: "🇪🇬", pot: "C", status: "alive" },
  { id: "alg", name: "Algeria", flag: "🇩🇿", pot: "C", status: "alive" },
  { id: "saf", name: "South Africa", flag: "🇿🇦", pot: "C", status: "alive" },
  // Pot D — weakest
  { id: "ksa", name: "Saudi Arabia", flag: "🇸🇦", pot: "D", status: "alive" },
  { id: "ire", name: "Ireland", flag: "🇮🇪", pot: "D", status: "alive" },
  { id: "sco", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", pot: "D", status: "alive" },
  { id: "bih", name: "Bosnia", flag: "🇧🇦", pot: "D", status: "alive" },
  { id: "ven", name: "Venezuela", flag: "🇻🇪", pot: "D", status: "alive" },
  { id: "par", name: "Paraguay", flag: "🇵🇾", pot: "D", status: "alive" },
  { id: "bol", name: "Bolivia", flag: "🇧🇴", pot: "D", status: "alive" },
  { id: "pan", name: "Panama", flag: "🇵🇦", pot: "D", status: "alive" },
  { id: "jam", name: "Jamaica", flag: "🇯🇲", pot: "D", status: "alive" },
  { id: "ang", name: "Angola", flag: "🇦🇴", pot: "D", status: "alive" },
  { id: "uga", name: "Uganda", flag: "🇺🇬", pot: "D", status: "alive" },
  { id: "ind", name: "Indonesia", flag: "🇮🇩", pot: "D", status: "alive" },
];

export const TEAM_MAP = Object.fromEntries(TEAMS.map((t) => [t.id, t]));
