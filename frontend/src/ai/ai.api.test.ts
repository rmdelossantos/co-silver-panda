import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { aiApi } from './ai.api';

describe('aiApi', () => {
  it('reads the AI status, disabled by default in tests', async () => {
    await expect(aiApi.status()).resolves.toEqual({ enabled: false });
  });

  it('posts the draft request as JSON', async () => {
    let sent: unknown;
    server.use(
      http.post('/api/ai/product-draft', async ({ request }) => {
        sent = await request.json();
        return HttpResponse.json({ description: 'D', category: 'Home', categoryIsNew: false, sources: [] });
      }),
    );

    const input = { name: 'Lamp', category: '', description: '', productId: 3 };
    await expect(aiApi.draftProduct(input)).resolves.toMatchObject({ category: 'Home' });
    expect(sent).toEqual(input);
  });

  it('surfaces the status code on failure so the UI can choose its copy', async () => {
    server.use(http.post('/api/ai/product-draft', () => HttpResponse.json({ error: { message: 'busy' } }, { status: 429 })));

    await expect(aiApi.draftProduct({ name: 'Lamp', category: '', description: '' })).rejects.toMatchObject({ status: 429 });
  });
});
