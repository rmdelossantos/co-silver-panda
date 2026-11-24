import { Sparkles } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { Button } from '../components/Button';
import { ApiError } from '../lib/api-client';
import type { ProductFormValues } from '../products/product.schema';
import type { ProductInput } from '../products/product.types';
import type { DraftResult } from './ai.types';
import { useAiStatus, useDraftProduct } from './useAi';

interface AiDraftAssistProps {
  form: UseFormReturn<ProductFormValues, unknown, ProductInput>;
  productId?: number;
}

// The API masks 5xx text for the rest of the app, so this picks its own copy by status.
function errorCopy(error: unknown): string {
  const status = error instanceof ApiError ? error.status : -1;
  if (status === 429) return 'Too many suggestions right now. Wait a minute and try again.';
  if (status === 422 && error instanceof ApiError) return error.message;
  if (status === 503 || status === 0) {
    return 'AI suggestions aren’t available right now. You can still fill in the fields yourself.';
  }
  return 'The suggestion didn’t work out. Try again.';
}

export function AiDraftAssist({ form, productId }: AiDraftAssistProps) {
  const { enabled } = useAiStatus();
  const draft = useDraftProduct();
  const hintId = useId();
  const headingId = useId();
  // A suggestion belongs to the name it was made for; it only shows while that name is unchanged.
  const [suggestion, setSuggestion] = useState<{ forName: string; result: DraftResult } | null>(null);
  const currentName = useWatch({ control: form.control, name: 'name' });

  // Move focus to the suggestion once, when it first appears. A stable callback ref (not an inline one,
  // which React re-runs on every render) plus a one-shot flag armed only if the panel will show.
  const focusOnShowRef = useRef(false);
  const focusHeading = useCallback((el: HTMLElement | null) => {
    if (el && focusOnShowRef.current) {
      focusOnShowRef.current = false;
      el.focus();
    }
  }, []);

  if (!enabled) return null;

  const requestSuggestion = async () => {
    if (draft.isPending) return;
    if (!(await form.trigger('name', { shouldFocus: true }))) return;

    const { name, category, description } = form.getValues();
    focusOnShowRef.current = false;
    setSuggestion(null);
    draft.mutate(
      { name, category, description, productId },
      {
        onSuccess: (result) => {
          focusOnShowRef.current = form.getValues('name') === name;
          setSuggestion({ forName: name, result });
        },
      },
    );
  };

  const applySuggestion = (result: DraftResult) => {
    const options = { shouldDirty: true, shouldValidate: true };
    form.setValue('category', result.category, options);
    form.setValue('description', result.description, options);
    setSuggestion(null);
    form.setFocus('description');
  };

  const visible = suggestion && suggestion.forName === currentName ? suggestion.result : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Button
          onClick={requestSuggestion}
          aria-disabled={draft.isPending}
          aria-busy={draft.isPending}
          aria-describedby={hintId}
          className="aria-disabled:opacity-55"
        >
          <Sparkles className="-ml-0.5 size-4 text-accent" aria-hidden="true" />
          {draft.isPending ? 'Drafting…' : 'Suggest with AI'}
        </Button>
        <p id={hintId} className="text-xs text-ink-muted">
          Drafts a description and category from the name and similar products.
        </p>
      </div>
      <p role="status" className="sr-only">
        {draft.isPending ? 'Drafting a suggestion…' : ''}
      </p>

      {draft.isError && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {errorCopy(draft.error)}
        </p>
      )}

      {visible && (
        <section aria-labelledby={headingId} className="space-y-3 rounded-lg border border-line bg-canvas p-3.5">
          <h3
            id={headingId}
            ref={focusHeading}
            tabIndex={-1}
            className="flex items-center gap-1.5 text-sm font-semibold text-ink focus-visible:outline-none"
          >
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            Suggestion
          </h3>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-ink-muted">Category</dt>
              <dd className="mt-0.5 flex items-center gap-2 text-ink">
                {visible.category}
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-ink-muted ring-1 ring-line ring-inset">
                  {visible.categoryIsNew ? 'new category' : 'existing category'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink-muted">Description</dt>
              <dd className="mt-0.5 text-pretty text-ink">{visible.description}</dd>
            </div>
          </dl>
          {visible.sources.length > 0 && (
            <p className="text-xs text-ink-muted">Based on: {visible.sources.map((s) => s.name).join(', ')}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button onClick={() => setSuggestion(null)}>Dismiss</Button>
            <Button variant="primary" onClick={() => applySuggestion(visible)}>
              Use suggestion
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
