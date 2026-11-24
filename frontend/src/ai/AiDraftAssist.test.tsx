import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Product } from '../products/product.types';
import { ProductsPage } from '../products/ProductsPage';
import { makeProduct } from '../test/fixtures';
import { renderWithQueryClient } from '../test/render';
import { server } from '../test/server';
import type { DraftRequest, DraftResult } from './ai.types';

const user = userEvent.setup();

const suggestion: DraftResult = {
  description: 'Thick bamboo board that is gentle on knife edges.',
  category: 'Kitchen',
  categoryIsNew: false,
  sources: [
    { id: 5, name: 'Chef’s Knife 8"', category: 'Kitchen' },
    { id: 6, name: 'Cast Iron Skillet', category: 'Kitchen' },
  ],
};

let products: Product[];
let draftRequests: DraftRequest[];
let productRequests: unknown[];
let statusResolved: Promise<void>;

function enableAi(enabled = true) {
  let markResolved!: () => void;
  statusResolved = new Promise((resolve) => (markResolved = resolve));
  server.use(
    http.get('/api/ai/status', () => {
      queueMicrotask(markResolved);
      return HttpResponse.json({ enabled });
    }),
  );
}

// Responds to drafts; pass `hold` to keep the request pending until released.
function respondToDrafts(body: JsonBodyType = suggestion, status = 200, hold?: Promise<void>) {
  server.use(
    http.post('/api/ai/product-draft', async ({ request }) => {
      draftRequests.push((await request.json()) as DraftRequest);
      if (hold) await hold;
      return HttpResponse.json(body, { status });
    }),
  );
}

beforeEach(() => {
  products = [makeProduct({ id: 1, name: 'Wireless Mouse' })];
  draftRequests = [];
  productRequests = [];
  server.use(
    http.get('/api/products', () => HttpResponse.json(products)),
    http.post('/api/products', async ({ request }) => {
      const body = (await request.json()) as Partial<Product>;
      productRequests.push(body);
      return HttpResponse.json(makeProduct({ ...body, id: 100 }), { status: 201 });
    }),
  );
});

async function openAddForm() {
  await screen.findByRole('table');
  await user.click(screen.getByRole('button', { name: 'Add product' }));
  return screen.getByRole('dialog', { name: 'Add product' });
}

describe('Suggest with AI', () => {
  it('is hidden when AI is not configured', async () => {
    enableAi(false);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await statusResolved; // wait for the gating decision, so absence is meaningful
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(within(dialog).queryByRole('button', { name: /Suggest with AI/ })).not.toBeInTheDocument();
  });

  it('asks for a name first and sends nothing without one', async () => {
    enableAi();
    respondToDrafts();
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();

    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    expect(await within(dialog).findByText('Name is required')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveFocus();
    expect(draftRequests).toHaveLength(0);
  });

  it('shows a grounded suggestion and fills the form when used', async () => {
    enableAi();
    respondToDrafts();
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Bamboo Cutting Board');

    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    const panel = await within(dialog).findByRole('region', { name: 'Suggestion' });
    expect(within(panel).getByText('existing category')).toBeInTheDocument();
    expect(within(panel).getByText(suggestion.description)).toBeInTheDocument();
    expect(within(panel).getByText('Based on: Chef’s Knife 8", Cast Iron Skillet')).toBeInTheDocument();
    expect(within(panel).getByRole('heading', { name: 'Suggestion' })).toHaveFocus();
    expect(draftRequests).toEqual([{ name: 'Bamboo Cutting Board', category: '', description: '' }]);

    await user.click(within(panel).getByRole('button', { name: 'Use suggestion' }));

    expect(within(dialog).getByLabelText('Category')).toHaveValue('Kitchen');
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveValue(suggestion.description);
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveFocus();
    expect(within(dialog).queryByRole('region', { name: 'Suggestion' })).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Price (USD)'), '24');
    await user.click(within(dialog).getByRole('button', { name: 'Add product' }));

    await waitFor(() =>
      expect(productRequests).toEqual([
        { name: 'Bamboo Cutting Board', price: 24, category: 'Kitchen', description: suggestion.description },
      ]),
    );
  });

  it('labels a proposed category as new and omits "Based on" when nothing was retrieved', async () => {
    enableAi();
    respondToDrafts({ ...suggestion, category: 'Toys', categoryIsNew: true, sources: [] });
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Kite');

    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    const panel = await within(dialog).findByRole('region', { name: 'Suggestion' });
    expect(within(panel).getByText('new category')).toBeInTheDocument();
    expect(within(panel).queryByText(/Based on/)).not.toBeInTheDocument();
  });

  it('leaves the fields untouched when dismissed', async () => {
    enableAi();
    respondToDrafts();
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Bamboo Cutting Board');
    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    await user.click(await within(dialog).findByRole('button', { name: 'Dismiss' }));

    expect(within(dialog).queryByRole('region', { name: 'Suggestion' })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Category')).toHaveValue('');
    expect(within(dialog).getByLabelText('Description (optional)')).toHaveValue('');
  });

  it('ignores clicks while a suggestion is pending and keeps focus on the button', async () => {
    enableAi();
    let release!: () => void;
    respondToDrafts(suggestion, 200, new Promise((resolve) => (release = resolve)));
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Bamboo Cutting Board');
    const button = await within(dialog).findByRole('button', { name: /Suggest with AI/ });

    await user.click(button);
    const pending = await within(dialog).findByRole('button', { name: 'Drafting…' });
    await user.click(pending);

    expect(pending).toHaveAttribute('aria-disabled', 'true');
    expect(pending).toHaveFocus();
    expect(draftRequests).toHaveLength(1);
    release();
    await within(dialog).findByRole('region', { name: 'Suggestion' });
  });

  it('hides a suggestion once the name changes, and never shows one for a name edited mid-request', async () => {
    enableAi();
    let release!: () => void;
    respondToDrafts(suggestion, 200, new Promise((resolve) => (release = resolve)));
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    const name = within(dialog).getByLabelText('Name');
    await user.type(name, 'Bamboo Board');

    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));
    await user.type(name, 's'); // edited while the request is in flight
    release();
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /Suggest with AI/ })).toBeInTheDocument());

    expect(within(dialog).queryByRole('region', { name: 'Suggestion' })).not.toBeInTheDocument();

    // Typing the original name back shows the (now matching) suggestion without stealing focus from Name.
    await user.type(name, '{Backspace}');
    expect(await within(dialog).findByRole('region', { name: 'Suggestion' })).toBeInTheDocument();
    expect(name).toHaveFocus();

    await user.type(name, ' XL');
    expect(within(dialog).queryByRole('region', { name: 'Suggestion' })).not.toBeInTheDocument();
  });

  it('keeps focus in Description while typing with the suggestion open', async () => {
    enableAi();
    respondToDrafts();
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Bamboo Cutting Board');
    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));
    await within(dialog).findByRole('region', { name: 'Suggestion' });

    const description = within(dialog).getByLabelText('Description (optional)');
    await user.click(description);
    await user.type(description, 'Hand-finished');

    expect(description).toHaveFocus();
    expect(description).toHaveValue('Hand-finished');
  });

  it('sends the product id when editing', async () => {
    enableAi();
    respondToDrafts();
    renderWithQueryClient(<ProductsPage />);

    await user.click(await screen.findByRole('button', { name: 'Edit Wireless Mouse' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit product' });
    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    await waitFor(() => expect(draftRequests[0]).toMatchObject({ name: 'Wireless Mouse', productId: 1 }));
  });

  it.each([
    [429, 'Too many suggestions right now. Wait a minute and try again.'],
    [503, 'AI suggestions aren’t available right now. You can still fill in the fields yourself.'],
    [502, 'The suggestion didn’t work out. Try again.'],
    [500, 'The suggestion didn’t work out. Try again.'],
  ])('explains a %i response', async (status, copy) => {
    enableAi();
    respondToDrafts({ error: { message: 'upstream' } }, status);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Bamboo Cutting Board');

    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(copy);
  });

  it('shows the server explanation for a declined draft (422)', async () => {
    enableAi();
    respondToDrafts({ error: { message: 'The AI declined to draft this product.' } }, 422);
    renderWithQueryClient(<ProductsPage />);
    const dialog = await openAddForm();
    await user.type(within(dialog).getByLabelText('Name'), 'Something odd');

    await user.click(await within(dialog).findByRole('button', { name: /Suggest with AI/ }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The AI declined to draft this product.');
  });
});
