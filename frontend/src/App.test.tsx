import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import App from './App';
import { makeProduct } from './test/fixtures';
import { renderWithQueryClient } from './test/render';
import { server } from './test/server';

const user = userEvent.setup();
const ana = { id: 7, email: 'ana@shop.example', name: 'Ana', createdAt: '2026-11-25T08:00:00.000Z' };
const products = [
  makeProduct({ id: 1, name: 'Wireless Mouse', category: 'Electronics' }),
  makeProduct({ id: 2, name: 'Cast Iron Skillet', category: 'Kitchen' }),
];

const signedOut = () => server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: null, signupEnabled: true })));
const serveProducts = () => server.use(http.get('/api/products', () => HttpResponse.json(products)));

describe('App', () => {
  it('renders the app heading', () => {
    serveProducts();

    renderWithQueryClient(<App />);

    expect(screen.getByRole('heading', { name: 'Product Catalog' })).toBeInTheDocument();
  });

  it('shows the catalog to a signed-in user', async () => {
    serveProducts();

    renderWithQueryClient(<App />);

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows sign-in to a signed-out visitor, without loading products', async () => {
    signedOut();
    let productRequests = 0;
    server.use(http.get('/api/products', () => (productRequests++, HttpResponse.json(products))));

    renderWithQueryClient(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(productRequests).toBe(0);
  });

  it('switches to the catalog after signing in', async () => {
    signedOut();
    serveProducts();
    server.use(http.post('/api/auth/sign-in', () => HttpResponse.json({ user: ana })));
    renderWithQueryClient(<App />);

    await user.type(await screen.findByLabelText('Email'), ana.email);
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(await screen.findByText('Wireless Mouse')).toBeInTheDocument();
  });

  it('keeps a deep-linked category filter through sign-in', async () => {
    window.history.replaceState(null, '', '/?category=Kitchen');
    signedOut();
    serveProducts();
    server.use(http.post('/api/auth/sign-in', () => HttpResponse.json({ user: ana })));
    renderWithQueryClient(<App />);

    await user.type(await screen.findByLabelText('Email'), ana.email);
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const table = await screen.findByRole('table');
    await waitFor(() => expect(within(table).queryByText('Wireless Mouse')).not.toBeInTheDocument());
    expect(within(table).getByText('Cast Iron Skillet')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toHaveValue('Kitchen');
  });

  it('shows who is signed in', async () => {
    serveProducts();

    renderWithQueryClient(<App />);

    expect(await screen.findByText('Sam Rivera')).toBeInTheDocument();
    expect(screen.getByText('(sam@shop.example)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('signs out back to sign-in without refetching products', async () => {
    let productRequests = 0;
    server.use(
      http.get('/api/products', () => (productRequests++, HttpResponse.json(products))),
      http.post('/api/auth/sign-out', () => new HttpResponse(null, { status: 204 })),
    );
    renderWithQueryClient(<App />);
    await screen.findByText('Wireless Mouse');

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(await screen.findByText('Signed out')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(productRequests).toBe(1);
  });

  it('returns to sign-in with an explanation when the session ends mid-use', async () => {
    server.use(http.get('/api/products', () => HttpResponse.json({ error: { message: 'Sign in to continue' } }, { status: 401 })));

    renderWithQueryClient(<App />);

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(await screen.findByText('Your session ended. Sign in again to continue.')).toBeInTheDocument();
  });

  it('offers a retry, not sign-in, when the session check fails', async () => {
    server.use(http.get('/api/auth/me', () => HttpResponse.json({ error: { message: 'x' } }, { status: 500 })));
    renderWithQueryClient(<App />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t reach the catalog');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();

    server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: null, signupEnabled: true })));
    await user.click(within(alert).getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
