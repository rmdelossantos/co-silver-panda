import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { useForm, type FieldError, type UseFormRegisterReturn } from 'react-hook-form';
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

const toFormValues = (product?: Product): ProductFormValues => ({
  name: product?.name ?? '',
  price: product ? String(product.price) : '',
  category: product?.category ?? '',
  description: product?.description ?? '',
});

export function ProductForm({ product, categories, submitLabel, onSubmit, onCancel, ref }: ProductFormProps) {
  const categoryListId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product),
  });

  const requestClose = () => {
    if (confirmingDiscard) setConfirmingDiscard(false); // a second Esc means "keep editing"
    else if (isDirty) setConfirmingDiscard(true);
    else onCancel();
  };
  useImperativeHandle(ref, () => ({ requestClose }));

  const keepEditing = () => {
    setConfirmingDiscard(false);
    cancelRef.current?.focus();
  };

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
      <Field label="Description (optional)" error={errors.description} registration={register('description')} multiline />

      {errors.root && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
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
}

function Field({ label, error, registration, multiline, prefix, autoFocusOnOpen, ...inputProps }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const className = `${controlClass} ${controlStateClass(!!error)}`;
  const a11y = { id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined };

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
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
}
