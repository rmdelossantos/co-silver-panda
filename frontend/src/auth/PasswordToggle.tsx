interface PasswordToggleProps {
  shown: boolean;
  onToggle: () => void;
}

// Lets people check what they typed instead of retyping it in a confirm field.
export function PasswordToggle({ shown, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={shown}
      aria-label="Show password"
      className="rounded-md px-2.5 py-1 text-xs font-medium text-ink-muted hover:bg-hover hover:text-ink"
    >
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}
