interface PasswordToggleProps {
  shown: boolean;
  onToggle: () => void;
}

// Lets people check what they typed instead of retyping it in a confirm field.
// The name starts with the visible word ("Hide password"), so voice control can say what it sees.
export function PasswordToggle({ shown, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? 'Hide password' : 'Show password'}
      className="min-h-8 rounded-md px-3 text-xs font-medium text-ink-muted hover:bg-hover hover:text-ink"
    >
      {shown ? 'Hide' : 'Show'}
    </button>
  );
}
