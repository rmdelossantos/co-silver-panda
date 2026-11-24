import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { renderWithQueryClient } from '../test/render';
import { server } from '../test/server';
import type { Product } from './product.types';
import { ProductsPage } from './ProductsPage';

const user = userEvent.setup();

function mockApi(initial: Product[], deleteResponse?: () => Response) {
  let products = [...initial];
  const deleted: number[] = [];
  server.use(
    http.get('/api/products', () => HttpResponse.json(products)),
    http.delete('/api/products/:id', ({ params }) => {
      if (deleteResponse) return deleteResponse();
      deleted.push(Number(params.id));
      products = products.filter((p) => p.id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return deleted;
}

async function openDeleteDialog(name: string) {
  await user.click(await screen.findByRole('button', { name: `Delete ${name}` }));
  return screen.getByRole('dialog', { name: 'Delete product?' });
}

describe('delete product', () => {
  it('asks for confirmation, deletes, removes the row, and confirms with a toast', async () => {
    const deleted = mockApi([makeProduct({ id: 1, name: 'Mouse' }), makeProduct({ id: 2, name: 'Lamp' })]);
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Mouse');
    expect(dialog).toHaveTextContent('Mouse will be permanently removed');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Deleted “Mouse”')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Mouse' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Lamp' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleted).toEqual([1]);
  });

  it('moves focus to the next row after deleting, so keyboard users keep their place', async () => {
    mockApi([makeProduct({ id: 1, name: 'Mouse' }), makeProduct({ id: 2, name: 'Lamp' })]);
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Mouse');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Lamp' })).toHaveFocus());
  });

  it('moves focus to the Products heading after deleting the last product', async () => {
    mockApi([makeProduct({ id: 1, name: 'Mouse' })]);
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Mouse');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Products' })).toHaveFocus());
  });

  it('explains the fallback and clears the URL when the filtered category loses its last product', async () => {
    window.history.replaceState(null, '', '/?category=Kitchen');
    mockApi([makeProduct({ id: 1, name: 'Skillet', category: 'Kitchen' }), makeProduct({ id: 2, name: 'Lamp', category: 'Home' })]);
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Skillet');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('No products in Kitchen. Showing all categories instead.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Lamp' })).toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('does nothing when cancelled', async () => {
    const deleted = mockApi([makeProduct({ id: 1, name: 'Mouse' })]);
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Mouse');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Mouse' })).toBeInTheDocument();
    expect(deleted).toEqual([]);
  });

  it('treats an already-deleted product (404) as done', async () => {
    mockApi([makeProduct({ id: 1, name: 'Mouse' })], () =>
      HttpResponse.json({ error: { message: 'Product not found' } }, { status: 404 }),
    );
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Mouse');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('“Mouse” was already deleted')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the dialog open and shows the error when the delete fails', async () => {
    mockApi([makeProduct({ id: 1, name: 'Mouse' })], () =>
      HttpResponse.json({ error: { message: 'Internal server error' } }, { status: 500 }),
    );
    renderWithQueryClient(<ProductsPage />);

    const dialog = await openDeleteDialog('Mouse');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('The product wasn’t deleted.');
    expect(alert).toHaveTextContent('The server ran into a problem. Try again in a moment.');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
