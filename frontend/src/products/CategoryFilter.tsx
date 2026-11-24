interface CategoryFilterProps {
  categories: string[];
  value: string | null;
  onChange: (category: string | null) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Category</span>
      <select
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5"
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
    </label>
  );
}
