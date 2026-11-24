import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeProduct } from '../test/fixtures';
import { renderWithQueryClient } from '../test/render';
import { server } from '../test/server';
import { ProductsPage } from './ProductsPage';

const products = [
  makeProduct({ id: 1, name: 'Wireless Mouse', price: 24.99, category: 'Electronics' }),
  makeProduct({ id: 2, name: 'Cast Iron Skillet', price: 45.99, category: 'Kitchen' }),
  makeProduct({ id: 3, name: 'USB-C Hub', price: 39, category: 'Electronics' }),
];

const respondWith = (body: JsonBodyType, status = 200) =>
  server.use(http.get('/api/products', () => HttpResponse.json(body, { status })));

const rowNames = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]!.textContent);

describe('ProductsPage', () => {
  it('lists products with formatted prices', async () => {
    respondWith(products);

    renderWithQueryClient(<ProductsPage />);

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(screen.getByText('$39.00')).toBeInTheDocument();
  });

  it('filters by the selected category and writes it to the URL', async () => {
    respondWith(products);
    renderWithQueryClient(<ProductsPage />);
    await screen.findByText('Wireless Mouse');

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Kitchen');

    expect(rowNames()).toEqual(['Cast Iron Skillet']);
    expect(window.location.search).toBe('?category=Kitchen');
  });

  it('shows all products again when "All categories" is chosen', async () => {
    window.history.replaceState(null, '', '/?category=Kitchen');
    respondWith(products);
    renderWithQueryClient(<ProductsPage />);
    await screen.findByText('Cast Iron Skillet');

    await userEvent.selectOptions(screen.getByLabelText('Category'), '');

    expect(rowNames()).toHaveLength(3);
    expect(window.location.search).toBe('');
  });

  it('applies a category from the URL on load, case-insensitively', async () => {
    window.history.replaceState(null, '', '/?category=electronics');
    respondWith(products);

    renderWithQueryClient(<ProductsPage />);
    await screen.findByText('Wireless Mouse');

    expect(rowNames()).toEqual(['Wireless Mouse', 'USB-C Hub']);
    expect(screen.getByLabelText('Category')).toHaveValue('Electronics');
  });

  it('falls back to all products for an unknown category in the URL', async () => {
    window.history.replaceState(null, '', '/?category=Garden');
    respondWith(products);

    renderWithQueryClient(<ProductsPage />);
    await screen.findByText('Wireless Mouse');

    expect(rowNames()).toHaveLength(3);
    expect(screen.getByLabelText('Category')).toHaveValue('');
  });

  it('summarises the catalog and the active filter', async () => {
    respondWith(products);
    renderWithQueryClient(<ProductsPage />);

    expect(await screen.findByText('3 products across 2 categories')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Category'), 'Electronics');

    expect(screen.getByText('2 of 3 products in Electronics')).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', async () => {
    respondWith([]);

    renderWithQueryClient(<ProductsPage />);

    expect(await screen.findByText('No products yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add your first product' })).toBeInTheDocument();
  });

  it('shows the error and retries on request', async () => {
    respondWith({ error: { message: 'Database unavailable' } }, 500);
    renderWithQueryClient(<ProductsPage />);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load products');
    expect(alert).toHaveTextContent('The server ran into a problem. Try again in a moment.');
    expect(alert).not.toHaveTextContent('Database unavailable');

    respondWith(products);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument();
  });
});
