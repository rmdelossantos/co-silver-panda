import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useForm, useWatch, type FieldError, type UseFormRegisterReturn } from 'react-hook-form';
import { Button } from '../components/Button';
import { controlClass, controlStateClass } from '../components/field-styles';
import { ApiError } from '../lib/api-client';
import { productFormSchema, type ProductFormValues } from './product.schema';
import type { Product, ProductInput } from './product.types';

interface ProductFormProps {
  product?: Product;
  categories: string[];
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<unknown>;
  onCancel: () => void;
  ref?: Ref<ProductFormHandle>;
}

export interface ProductFormHandle {
  // Close unless there are unsaved edits, in which case ask first. Used for Esc and the close button.
  requestClose: () => void;
}

const DESCRIPTION_MAX = 500;

const toFormValues = (product?: Product): ProductFormValues => ({
  name: product?.name ?? '',
  price: product ? product.price.toFixed(2) : '',
  category: product?.category ?? '',
  description: product?.description ?? '',
});

export function ProductForm({ product, categories, submitLabel, onSubmit, onCancel, ref }: ProductFormProps) {
  const categoryListId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product),
  });

  const descriptionLength = useWatch({ control, name: 'description' }).length;

  const keepEditing = () => {
    setConfirmingDiscard(false);
    cancelRef.current?.focus(); // the prompt held focus; don't let it fall to <body> as the prompt unmounts
  };

  // Read the live field values rather than formState.isDirty, which only updates on the next render and
  // would miss an Esc pressed immediately after typing.
  const hasUnsavedChanges = () => {
    const initial = toFormValues(product);
    const current = getValues();
    return (Object.keys(initial) as (keyof ProductFormValues)[]).some((field) => current[field] !== initial[field]);
  };

  const requestClose = () => {
    if (confirmingDiscard) keepEditing(); // a second Esc means "keep editing"
    else if (hasUnsavedChanges()) setConfirmingDiscard(true);
    else onCancel();
  };
  useImperativeHandle(ref, () => ({ requestClose }));

  const submit = handleSubmit(async (input) => {
    try {
      await onSubmit(input);
    } catch (error) {
      // Surface server-side validation on the matching fields; anything else at form level.
      const details = error instanceof ApiError ? error.details : [];
      const fields = Object.keys(productFormSchema.shape);
      for (const { field, message } of details) {
        if (fields.includes(field)) setError(field as keyof ProductFormValues, { message });
      }
      if (details.length === 0) {
        setError('root', { message: error instanceof Error ? error.message : 'Something went wrong' });
      }
    }
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <Field label="Name" error={errors.name} registration={register('name')} autoComplete="off" autoFocusOnOpen />
      <Field
        label="Price (USD)"
        error={errors.price}
        registration={register('price')}
        inputMode="decimal"
        placeholder="0.00"
        prefix="$"
      />
      <Field
        label="Category"
        error={errors.category}
        registration={register('category')}
        list={categoryListId}
        autoComplete="off"
      />
      <datalist id={categoryListId}>
        {categories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <Field
        label="Description (optional)"
        error={errors.description}
        registration={register('description')}
        multiline
        hint={`${descriptionLength} / ${DESCRIPTION_MAX} characters`}
        hintOver={descriptionLength > DESCRIPTION_MAX}
      />

      {errors.root && (
        <div role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
          <p className="font-medium">{product ? 'Your changes weren’t saved.' : 'The product wasn’t added.'}</p>
          <p className="mt-0.5">{errors.root.message}</p>
        </div>
      )}

      {confirmingDiscard && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-canvas px-3 py-2.5">
          <p role="alert" className="text-sm font-medium text-ink">
            Discard unsaved changes?
          </p>
          <div className="flex gap-2">
            <Button onClick={keepEditing} autoFocus>
              Keep editing
            </Button>
            <Button variant="danger" onClick={onCancel}>
              Discard
            </Button>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button ref={cancelRef} onClick={requestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface FieldProps {
  label: string;
  error?: FieldError;
  registration: UseFormRegisterReturn;
  multiline?: boolean;
  inputMode?: 'decimal';
  placeholder?: string;
  list?: string;
  autoComplete?: string;
  prefix?: string;
  autoFocusOnOpen?: boolean;
  hint?: string;
  hintOver?: boolean;
}

function Field({
  label,
  error,
  registration,
  multiline,
  prefix,
  autoFocusOnOpen,
  hint,
  hintOver,
  ...inputProps
}: FieldProps) {
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
            type="text"
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
