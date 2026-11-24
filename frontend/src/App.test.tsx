import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import App from './App';
import { renderWithQueryClient } from './test/render';
import { server } from './test/server';

it('renders the app heading', () => {
  server.use(http.get('/api/products', () => HttpResponse.json([])));

  renderWithQueryClient(<App />);

  expect(screen.getByRole('heading', { name: 'Product Catalog' })).toBeInTheDocument();
});
