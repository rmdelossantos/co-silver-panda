import Anthropic from '@anthropic-ai/sdk';

// Built only when AI is enabled. The key is passed explicitly so credentials always come from the
// variable we gate on. No retries: the admin can simply ask again, which keeps the worst-case wait ~30s.
export function createClaudeClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 30_000, maxRetries: 0 });
}
