import { fireEvent, render, screen } from '@testing-library/react';
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

it('reports a close the browser forces while open, so state can follow', () => {
  const onClose = vi.fn();
  const onForcedClose = vi.fn();
  render(
    <Dialog open title="Example" onClose={onClose} onForcedClose={onForcedClose}>
      <p>Body</p>
    </Dialog>,
  );

  fireEvent(screen.getByRole('dialog'), new Event('close'));

  expect(onForcedClose).toHaveBeenCalledOnce();
  expect(onClose).not.toHaveBeenCalled();
});

it('ignores the close event from its own programmatic close', () => {
  const onClose = vi.fn();
  const { rerender } = render(
    <Dialog open title="Example" onClose={onClose}>
      <p>Body</p>
    </Dialog>,
  );
  const dialog = document.querySelector('dialog')!;

  rerender(
    <Dialog open={false} title="Example" onClose={onClose}>
      <p>Body</p>
    </Dialog>,
  );
  fireEvent(dialog, new Event('close'));

  expect(onClose).not.toHaveBeenCalled();
});
