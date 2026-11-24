// Eight tones with well-separated hues; full class names keep Tailwind's scanner happy.
// The badge always shows the category name, so color is a secondary cue, never the only one.
// Order is chosen so the sample categories land far apart (Books amber, Sports sky, Electronics violet,
// Home rose, Kitchen lime) and teal, the action color, stays off them.
export const CATEGORY_TONES = [
  'bg-teal-50 text-teal-800 ring-teal-700/15',
  'bg-amber-50 text-amber-800 ring-amber-700/20',
  'bg-sky-50 text-sky-800 ring-sky-700/15',
  'bg-orange-50 text-orange-800 ring-orange-700/15',
  'bg-violet-50 text-violet-800 ring-violet-700/15',
  'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-700/15',
  'bg-rose-50 text-rose-800 ring-rose-700/15',
  'bg-lime-50 text-lime-800 ring-lime-700/20',
];
