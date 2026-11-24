import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

it('focuses the element marked data-autofocus when opened', () => {
  render(
    <Dialog open title="Example" onClose={() => {}}>
      <input aria-label="First" />
      <button data-autofocus>Preferred</button>
    </Dialog>,
  );

  expect(screen.getByRole('button', { name: 'Preferred' })).toHaveFocus();
});

it('calls onClose from the close button', async () => {
  const onClose = vi.fn();
  render(
    <Dialog open title="Example" onClose={onClose}>
      <p>Body</p>
    </Dialog>,
  );

  await userEvent.click(screen.getByRole('button', { name: 'Close' }));

  expect(onClose).toHaveBeenCalledOnce();
});
