import { useId } from 'react';
import type { FieldError, UseFormRegisterReturn } from 'react-hook-form';
import { controlClass, controlStateClass } from './field-styles';

// A labelled form field wired for react-hook-form: errors and hints are linked with aria-describedby.
export interface TextFieldProps {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  multiline?: boolean;
  // Input type for single-line fields (multiline renders a textarea).
  type?: 'text' | 'email' | 'password';
  inputMode?: 'decimal' | 'email';
  placeholder?: string;
  list?: string;
  autoComplete?: string;
  prefix?: string;
  autoFocusOnOpen?: boolean;
  hint?: string;
  hintOver?: boolean;
}

export function TextField({
  label,
  error,
  registration,
  multiline,
  prefix,
  autoFocusOnOpen,
  hint,
  hintOver,
  type = 'text',
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(' ') || undefined;
  const className = `${controlClass} ${controlStateClass(!!error)}`;
  const a11y = { id, 'aria-invalid': !!error, 'aria-describedby': describedBy };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {multiline ? (
        <textarea rows={3} className={`${className} h-auto resize-y py-2.5`} {...a11y} {...registration} />
      ) : (
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-ink-muted" aria-hidden="true">
              {prefix}
            </span>
          )}
          <input
            type={type}
            className={`${className} ${prefix ? 'pl-7 tabular-nums' : ''}`}
            {...a11y}
            {...inputProps}
            data-autofocus={autoFocusOnOpen || undefined}
            {...registration}
          />
        </div>
      )}
      {(error || hint) && (
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <p id={errorId} className="text-sm text-danger">
              {error.message}
            </p>
          ) : (
            <span />
          )}
          {hint && (
            <p id={hintId} className={`shrink-0 text-xs tabular-nums ${hintOver ? 'text-danger' : 'text-ink-muted'}`}>
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
