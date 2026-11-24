// Ordered for maximum hue separation between neighbours; full class names keep Tailwind's scanner happy.
const tones = [
  'bg-teal-50 text-teal-800 ring-teal-700/15',
  'bg-amber-50 text-amber-800 ring-amber-700/20',
  'bg-violet-50 text-violet-800 ring-violet-700/15',
  'bg-rose-50 text-rose-800 ring-rose-700/15',
  'bg-sky-50 text-sky-800 ring-sky-700/15',
  'bg-lime-50 text-lime-800 ring-lime-700/20',
  'bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-700/15',
  'bg-orange-50 text-orange-800 ring-orange-700/15',
];

interface CategoryBadgeProps {
  category: string;
  // Position of the category in the sorted category list, so each one gets a distinct tone.
  index: number;
}

export function CategoryBadge({ category, index }: CategoryBadgeProps) {
  const tone = tones[Math.max(index, 0) % tones.length];
  return (
    // Long names truncate on one line; the full name stays available as a tooltip and to screen readers.
    <span
      title={category}
      className={`inline-block max-w-44 truncate rounded-md px-2 py-0.5 align-middle text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      {category}
    </span>
  );
}
