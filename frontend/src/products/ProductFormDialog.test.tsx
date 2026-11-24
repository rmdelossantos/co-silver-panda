import { fireEvent, screen, within } from '@testing-library/react';
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

  it('counts description characters against the 500 limit', async () => {
    mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    expect(within(dialog).getByText('0 / 500 characters')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Description (optional)'), 'Quiet clicks');

    expect(within(dialog).getByText('12 / 500 characters')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveAccessibleDescription('12 / 500 characters');
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

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('The product wasn’t added.');
    expect(alert).toHaveTextContent('Could not reach the server');
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

  it('returns focus to Cancel when a second Esc dismisses the discard prompt', async () => {
    mockApi([makeProduct()]);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Draft');

    fireEvent(dialog, new Event('cancel', { cancelable: true })); // Esc: shows the prompt
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    fireEvent(dialog, new Event('cancel', { cancelable: true })); // Esc again: keep editing

    expect(within(dialog).queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Draft');
  });

  it('does not snap back to a cleared category filter when that category reappears', async () => {
    window.history.replaceState(null, '', '/?category=Toys');
    mockApi([makeProduct({ id: 1, name: 'Lamp', category: 'Home' })]);
    renderWithQueryClient(<ProductsPage />);
    expect(await screen.findByText('No products in Toys. Showing all categories instead.')).toBeInTheDocument();

    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Kite');
    await user.type(within(dialog).getByLabelText('Price (USD)'), '15');
    await user.type(within(dialog).getByLabelText('Category'), 'Toys');
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    expect(await screen.findByText('Kite')).toBeInTheDocument();
    expect(screen.getByText('Lamp')).toBeInTheDocument(); // still showing all, not re-filtered to Toys
    expect(screen.getByLabelText('Category')).toHaveValue('');
    expect(screen.queryByText(/No products in Toys/)).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
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
  it('shows whole-dollar prices with cents, e.g. 28 as 28.00', async () => {
    mockApi([makeProduct({ id: 3, name: 'Yoga Mat', price: 28 })]);
    renderWithQueryClient(<ProductsPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Yoga Mat' }));

    expect(within(screen.getByRole('dialog')).getByLabelText('Price (USD)')).toHaveValue('28.00');
  });

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
