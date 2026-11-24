import { zodResolver } from '@hookform/resolvers/zod';
import { useId } from 'react';
import { useForm, type FieldError, type UseFormRegisterReturn } from 'react-hook-form';
import { ApiError } from '../lib/api-client';
import { productFormSchema, type ProductFormValues } from './product.schema';
import type { Product, ProductInput } from './product.types';

interface ProductFormProps {
  product?: Product;
  categories: string[];
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<unknown>;
  onCancel: () => void;
}

const toFormValues = (product?: Product): ProductFormValues => ({
  name: product?.name ?? '',
  price: product ? String(product.price) : '',
  category: product?.category ?? '',
  description: product?.description ?? '',
});

export function ProductForm({ product, categories, submitLabel, onSubmit, onCancel }: ProductFormProps) {
  const categoryListId = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: toFormValues(product),
  });

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
    <form noValidate onSubmit={submit} className="space-y-4">
      <Field label="Name" error={errors.name} registration={register('name')} autoComplete="off" />
      <Field
        label="Price (USD)"
        error={errors.price}
        registration={register('price')}
        inputMode="decimal"
        placeholder="0.00"
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
        <p role="alert" className="text-sm text-red-700">
          {errors.root.message}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm hover:bg-gray-100">
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
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
}

function Field({ label, error, registration, multiline, ...inputProps }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const className = `w-full rounded-md border px-3 py-2 text-sm ${error ? 'border-red-500' : 'border-gray-300'}`;
  const a11y = { id, 'aria-invalid': !!error, 'aria-describedby': error ? errorId : undefined };

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      {multiline ? (
        <textarea rows={3} className={className} {...a11y} {...registration} />
      ) : (
        <input type="text" className={className} {...a11y} {...inputProps} {...registration} />
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-700">
          {error.message}
        </p>
      )}
    </div>
  );
}
