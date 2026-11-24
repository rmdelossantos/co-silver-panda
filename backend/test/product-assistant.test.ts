import type Anthropic from '@anthropic-ai/sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AiDraftError,
  createProductAssistant,
  type DraftClient,
  type DraftInput,
} from '../src/ai/product-assistant.js';
import { openDb } from '../src/db/client.js';
import { seedIfEmpty } from '../src/db/seed.js';
import { createProductsRepo, type ProductsRepo } from '../src/products/products.repo.js';

type Body = Anthropic.MessageCreateParamsNonStreaming;

function message(overrides: Partial<Anthropic.Message> & { json?: unknown } = {}): Anthropic.Message {
  const { json = { description: 'Thick bamboo board that is gentle on knives.', category: 'kitchen' }, ...rest } =
    overrides;
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [{ type: 'text', text: typeof json === 'string' ? json : JSON.stringify(json), citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: { input_tokens: 120, output_tokens: 40 },
    ...rest,
  } as Anthropic.Message;
}

const input: DraftInput = { name: 'Bamboo Cutting Board', category: '', description: '' };

describe('product assistant', () => {
  let repo: ProductsRepo;
  let create: ReturnType<typeof vi.fn<(body: Body) => Promise<Anthropic.Message>>>;
  let assistant: ReturnType<typeof createProductAssistant>;

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    repo = createProductsRepo(openDb(':memory:'));
    seedIfEmpty(repo);
    create = vi.fn(async () => message());
    const client: DraftClient = { messages: { create } };
    assistant = createProductAssistant({ client, model: 'claude-opus-5-5', repo });
  });

  const sentBody = () => create.mock.calls[0]![0];
  const sentPrompt = () => sentBody().messages[0]!.content as string;

  it('grounds the prompt in similar products and the existing categories', async () => {
    await assistant.draft({ name: "Chef's Knife Set", category: 'Kitchen', description: '' });

    expect(sentPrompt()).toContain('<catalog_examples>');
    expect(sentPrompt()).toContain("Chef’s Knife 8\"");
    expect(sentPrompt()).toMatch(/<categories>\nBooks\nElectronics\nHome\nKitchen\nSports\n<\/categories>/);
  });

  it('returns the retrieved products as sources', async () => {
    const result = await assistant.draft({ name: 'Wireless Keyboard', category: '', description: '' });

    expect(result.sources.map((s) => s.name)).toEqual(expect.arrayContaining(['Mechanical Keyboard', 'Wireless Mouse']));
    expect(result.sources[0]).toEqual({ id: expect.any(Number), name: expect.any(String), category: expect.any(String) });
  });

  it('never uses the product being edited as its own source', async () => {
    const mouse = repo.searchSimilar('wireless mouse')[0]!;

    const result = await assistant.draft({ name: 'Wireless Mouse', category: '', description: '', productId: mouse.id });

    expect(result.sources.map((s) => s.id)).not.toContain(mouse.id);
  });

  it('sends no examples and returns no sources when nothing similar exists', async () => {
    const result = await assistant.draft({ name: 'Quantum Zither', category: '', description: '' });

    expect(result.sources).toEqual([]);
    expect(sentPrompt()).toContain('(no similar products in the catalog)');
  });

  it('reuses the existing spelling of a matching category', async () => {
    const result = await assistant.draft(input);

    expect(result).toMatchObject({ category: 'Kitchen', categoryIsNew: false });
  });

  it('flags a category that does not exist yet', async () => {
    create.mockResolvedValueOnce(message({ json: { description: 'A kite.', category: 'Toys' } }));

    expect(await assistant.draft(input)).toMatchObject({ category: 'Toys', categoryIsNew: true });
  });

  it('asks for structured output at low effort with the configured model, without a thinking setting', async () => {
    await assistant.draft(input);

    expect(sentBody()).toMatchObject({ model: 'claude-opus-5-5', output_config: { effort: 'low', format: { type: 'json_schema' } } });
    expect(sentBody()).not.toHaveProperty('thinking');
    expect(sentBody()).not.toHaveProperty('tool_choice');
  });

  it('raises "refused" on a refusal, even when the body has no JSON', async () => {
    create.mockResolvedValueOnce(message({ stop_reason: 'refusal', json: 'I can’t help with that.' }));

    await expect(assistant.draft(input)).rejects.toEqual(new AiDraftError('refused'));
  });

  it.each([
    ['truncated output', message({ stop_reason: 'max_tokens' })],
    ['invalid JSON', message({ json: '{"description": "cut off' })],
    ['wrong shape', message({ json: { text: 'hello' } })],
    ['no text block', message({ content: [] })],
    ['a description over 500 characters', message({ json: { description: 'x'.repeat(501), category: 'Kitchen' } })],
    ['an empty category', message({ json: { description: 'Fine.', category: '  ' } })],
  ])('raises "unusable" for %s', async (_label, response) => {
    create.mockResolvedValueOnce(response);

    await expect(assistant.draft(input)).rejects.toEqual(new AiDraftError('unusable'));
  });

  it('logs token usage, never the prompt contents', async () => {
    await assistant.draft(input);

    expect(console.info).toHaveBeenCalledWith('[ai] product-draft model=claude-opus-5-5 in=120 out=40');
  });
});
