import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

// jsdom does not implement modal dialogs yet.
HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
  this.open = true;
};
HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
  this.open = false;
};

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  // Sonner keeps toasts in a module-level store that outlives unmounting; clear it so tests don't inherit them.
  toast.dismiss();
  window.history.replaceState(null, '', '/');
});
afterAll(() => server.close());
