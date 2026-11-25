import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithQueryClient } from '../test/render';
import { server } from '../test/server';
import type { User } from './auth.types';
import { AuthScreen } from './AuthScreen';
import { useSession } from './useSession';

const user = userEvent.setup();
const ana: User = { id: 7, email: 'ana@shop.example', name: 'Ana', createdAt: '2026-11-25T08:00:00.000Z' };

// Shows what the session cache says, so tests can see sign-in take effect before App gating exists.
function SessionProbe() {
  const { data } = useSession();
  return <output aria-label="session">{data?.user ? `signed in as ${data.user.email}` : 'signed out'}</output>;
}

function renderScreen({ signupEnabled = true } = {}) {
  renderWithQueryClient(
    <>
      <AuthScreen signupEnabled={signupEnabled} />
      <SessionProbe />
    </>,
  );
}

let requests: { path: string; body: unknown }[];

function respond(path: string, body: JsonBodyType, status = 200) {
  server.use(
    http.post(path, async ({ request }) => {
      requests.push({ path, body: await request.json() });
      return HttpResponse.json(body, { status });
    }),
  );
}

beforeEach(() => {
  requests = [];
  server.use(http.get('/api/auth/me', () => HttpResponse.json({ user: null, signupEnabled: true })));
});

describe('sign in', () => {
  it('starts in the email field and signs in', async () => {
    respond('/api/auth/sign-in', { user: ana });
    renderScreen();

    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus());
    await user.type(screen.getByLabelText('Email'), '  Ana@Shop.Example ');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(screen.getByLabelText('session')).toHaveTextContent('signed in as ana@shop.example'));
    expect(requests).toEqual([{ path: '/api/auth/sign-in', body: { email: 'ana@shop.example', password: 'correct horse battery' } }]);
  });

  it('shows the generic error, keeps the email, and focuses the alert', async () => {
    respond('/api/auth/sign-in', { error: { message: 'Email or password is incorrect' } }, 401);
    renderScreen();

    await user.type(screen.getByLabelText('Email'), 'ana@shop.example');
    await user.type(screen.getByLabelText('Password'), 'wrong password!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Email or password is incorrect');
    expect(alert).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@shop.example');
    expect(screen.getByLabelText('session')).toHaveTextContent('signed out');
  });

  it('explains rate limiting', async () => {
    respond('/api/auth/sign-in', { error: { message: 'Too many attempts. Try again in a few minutes.' } }, 429);
    renderScreen();

    await user.type(screen.getByLabelText('Email'), 'ana@shop.example');
    await user.type(screen.getByLabelText('Password'), 'guess-guess');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Wait a few minutes and try again.');
  });

  it('validates before sending anything', async () => {
    renderScreen();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('shows and hides the password', async () => {
    renderScreen();
    const password = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    await user.click(toggle);

    // The accessible name follows the visible word (WCAG 2.5.3), so "Hide" is what voice control hears.
    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAccessibleName('Hide password');
    await user.click(toggle);
    expect(toggle).toHaveAccessibleName('Show password');
  });

  it('hides "Create an account" when sign-up is turned off', () => {
    renderScreen({ signupEnabled: false });

    expect(screen.queryByRole('button', { name: 'Create an account' })).not.toBeInTheDocument();
  });
});

describe('create account', () => {
  async function openCreateAccount(email = '') {
    renderScreen();
    if (email) await user.type(screen.getByLabelText('Email'), email);
    await user.click(screen.getByRole('button', { name: 'Create an account' }));
  }

  it('switches mode, carries the email over, and focuses the heading', async () => {
    await openCreateAccount('ana@shop.example');

    expect(screen.getByRole('heading', { name: 'Create an account' })).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@shop.example');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('creates the account and signs in', async () => {
    respond('/api/auth/sign-up', { user: ana }, 201);
    await openCreateAccount();

    await user.type(screen.getByLabelText('Name'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'ana@shop.example');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(screen.getByLabelText('session')).toHaveTextContent('signed in as ana@shop.example'));
    expect(requests[0]).toEqual({
      path: '/api/auth/sign-up',
      body: { name: 'Ana', email: 'ana@shop.example', password: 'correct horse battery' },
    });
  });

  it('requires at least 12 characters, shown as a hint', async () => {
    await openCreateAccount();

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 12 characters');
    await user.type(screen.getByLabelText('Name'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'ana@shop.example');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password is too short')).toBeInTheDocument();
    // Error and hint stay distinct: the error names the problem, the hint keeps the rule visible.
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Password is too short At least 12 characters');
    expect(requests).toHaveLength(0);
  });

  it('offers to sign in instead when the email is taken, keeping the email', async () => {
    respond('/api/auth/sign-up', { error: { message: 'An account with this email already exists', details: [] } }, 409);
    await openCreateAccount();
    await user.type(screen.getByLabelText('Name'), 'Ana');
    await user.type(screen.getByLabelText('Email'), 'ana@shop.example');
    await user.type(screen.getByLabelText('Password'), 'correct horse battery');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Sign in instead' }));

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ana@shop.example');
  });
});
