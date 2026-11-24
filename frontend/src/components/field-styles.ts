export const controlClass =
  'h-10 w-full rounded-lg border bg-surface px-3 text-sm text-ink shadow-xs transition-colors placeholder:text-ink-subtle hover:border-ink-subtle/60 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent/25';

export const controlStateClass = (invalid: boolean) =>
  invalid ? 'border-danger focus-visible:border-danger focus-visible:outline-danger/25' : 'border-line-strong';
