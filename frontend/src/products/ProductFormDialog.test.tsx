import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { renderWithQueryClient } from '../test/render';
import { server } from '../test/server';
import type { Product } from './product.types';
import { ProductsPage } from './ProductsPage';

// A tiny in-memory API so create/edit round-trip through the real hooks.
function mockApi(initial: Product[]) {
  let products = [...initial];
  const requests: { method: string; body: unknown }[] = [];
  server.use(
    http.get('/api/products', () => HttpResponse.json(products)),
    http.post('/api/products', async ({ request }) => {
      const body = (await request.json()) as Partial<Product>;
      requests.push({ method: 'POST', body });
      const created = makeProduct({ ...body, id: 100 });
      products = [created, ...products];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put('/api/products/:id', async ({ request, params }) => {
      const body = (await request.json()) as Partial<Product>;
      requests.push({ method: 'PUT', body });
      products = products.map((p) => (p.id === Number(params.id) ? { ...p, ...body } : p));
      return HttpResponse.json(products.find((p) => p.id === Number(params.id)));
    }),
  );
  return requests;
}

const user = userEvent.setup();

async function openAddForm() {
  await screen.findByRole('table');
  await user.click(screen.getByRole('button', { name: 'Add product' }));
  return screen.getByRole('dialog', { name: 'Add product' });
}

describe('add product', () => {
  it('creates a product, closes the dialog, and shows it in the list', async () => {
    const requests = mockApi([makeProduct({ id: 1, name: 'Existing' })]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.type(within(dialog).getByLabelText('Name'), 'Desk Mat');
    await user.type(within(dialog).getByLabelText('Price (USD)'), '19.5');
    await user.type(within(dialog).getByLabelText('Category'), 'Home');
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    expect(await screen.findByText('Desk Mat')).toBeInTheDocument();
    expect(screen.getByText('Added “Desk Mat”')).toBeInTheDocument();
    expect(requests).toEqual([
      { method: 'POST', body: { name: 'Desk Mat', price: 19.5, category: 'Home', description: '' } },
    ]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows required-field errors and does not submit', async () => {
    const requests = mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Price is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Category is required')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(requests).toHaveLength(0);
  });

  it('rejects a non-numeric price', async () => {
    mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.type(within(dialog).getByLabelText('Price (USD)'), 'abc');
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    expect(await within(dialog).findByText('Price must be a number')).toBeInTheDocument();
  });

  it('maps server validation errors onto fields', async () => {
    mockApi([makeProduct()]);
    server.use(
      http.post('/api/products', () =>
        HttpResponse.json(
          { error: { message: 'Validation failed', details: [{ field: 'name', message: 'Name is taken' }] } },
          { status: 400 },
        ),
      ),
    );
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.type(within(dialog).getByLabelText('Name'), 'Dup');
    await user.type(within(dialog).getByLabelText('Price (USD)'), '5');
    await user.type(within(dialog).getByLabelText('Category'), 'Home');
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    expect(await within(dialog).findByText('Name is taken')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows a form-level error when the server is unreachable', async () => {
    mockApi([makeProduct()]);
    server.use(http.post('/api/products', () => HttpResponse.error()));
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.type(within(dialog).getByLabelText('Name'), 'Lamp');
    await user.type(within(dialog).getByLabelText('Price (USD)'), '5');
    await user.type(within(dialog).getByLabelText('Category'), 'Home');
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Could not reach the server');
  });

  it('closes straight away on Cancel when nothing was typed', async () => {
    const requests = mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('asks before discarding unsaved changes, and keeps them on "Keep editing"', async () => {
    mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Draft');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Discard unsaved changes?');
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();

    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Draft');
    expect(within(dialog).queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
  });

  it('discards unsaved changes from the close button after confirming', async () => {
    const requests = mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Draft');

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await user.click(within(dialog).getByRole('button', { name: 'Discard' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });
});

describe('edit product', () => {
  it('prefills the form and saves changes with PUT', async () => {
    const requests = mockApi([
      makeProduct({ id: 7, name: 'Wireless Mouse', price: 24.99, category: 'Electronics', description: 'Quiet' }),
    ]);
    renderWithQueryClient(<ProductsPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Wireless Mouse' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit product' });
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Wireless Mouse');
    expect(within(dialog).getByLabelText('Price (USD)')).toHaveValue('24.99');
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveValue('Quiet');

    const price = within(dialog).getByLabelText('Price (USD)');
    await user.clear(price);
    await user.type(price, '19.99');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('$19.99')).toBeInTheDocument();
    expect(screen.getByText('Saved changes to “Wireless Mouse”')).toBeInTheDocument();
    expect(requests).toEqual([
      { method: 'PUT', body: { name: 'Wireless Mouse', price: 19.99, category: 'Electronics', description: 'Quiet' } },
    ]);
  });
});
