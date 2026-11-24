import { ChevronDown } from 'lucide-react';
import { controlClass, controlStateClass } from '../components/field-styles';

interface CategoryFilterProps {
  categories: string[];
  value: string | null;
  onChange: (category: string | null) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <label className="flex items-center gap-2.5 text-sm max-sm:w-full">
      <span className="font-medium text-ink-muted">Category</span>
      <span className="relative max-sm:flex-1">
        <select
          className={`${controlClass} ${controlStateClass(false)} appearance-none pr-9 sm:w-52`}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
          aria-hidden="true"
        />
      </span>
    </label>
  );
}
