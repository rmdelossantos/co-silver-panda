import { CATEGORY_TONES } from './category-tones';

interface CategoryBadgeProps {
  category: string;
  // From categoryTone, so a category keeps its color as others come and go.
  tone: number;
}

export function CategoryBadge({ category, tone }: CategoryBadgeProps) {
  return (
    // Long names truncate on one line; the full name stays available as a tooltip and to screen readers.
    <span
      title={category}
      className={`inline-block max-w-44 truncate rounded-md px-2 py-0.5 align-middle text-xs font-medium ring-1 ring-inset ${CATEGORY_TONES[tone]}`}
    >
      {category}
    </span>
  );
}
