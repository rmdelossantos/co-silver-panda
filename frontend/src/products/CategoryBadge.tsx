// Fixed tones so each category keeps the same color across sessions; full class names keep Tailwind's scanner happy.
const tones = [
  'bg-teal-50 text-teal-800 ring-teal-700/15',
  'bg-amber-50 text-amber-800 ring-amber-700/15',
  'bg-sky-50 text-sky-800 ring-sky-700/15',
  'bg-rose-50 text-rose-800 ring-rose-700/15',
  'bg-violet-50 text-violet-800 ring-violet-700/15',
  'bg-lime-50 text-lime-800 ring-lime-700/15',
  'bg-orange-50 text-orange-800 ring-orange-700/15',
  'bg-indigo-50 text-indigo-800 ring-indigo-700/15',
];

function toneFor(category: string) {
  let hash = 0;
  for (const char of category.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tones[hash % tones.length];
}

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneFor(category)}`}
    >
      {category}
    </span>
  );
}
