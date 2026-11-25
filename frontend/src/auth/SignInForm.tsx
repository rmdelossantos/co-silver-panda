import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { focusOnMount } from './focus-on-mount';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { signInSchema, type SignInValues } from './auth.schema';
import type { SignInInput } from './auth.types';
import { formErrorCopy } from './form-errors';
import { PasswordToggle } from './PasswordToggle';
import { useSignIn } from './useSession';

interface SignInFormProps {
  initialEmail: string;
  focusHeading: boolean;
  onCreateAccount?: (email: string) => void;
}

export function SignInForm({ initialEmail, focusHeading, onCreateAccount }: SignInFormProps) {
  const signIn = useSignIn();
  const [showPassword, setShowPassword] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setFocus,
    formState: { errors },
  } = useForm<SignInValues, unknown, SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: initialEmail, password: '' },
  });

  // First visit: start in the email field. After switching from "Create account": land on the heading.
  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
    else setFocus('email');
  }, [focusHeading, setFocus]);

  const submit = handleSubmit((input) => signIn.mutate(input, { onSuccess: ({ user }) => toast.success(`Signed in as ${user.name}`) }));

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight focus-visible:outline-none">
          Sign in
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Sign in to manage the store catalog.</p>
      </div>

      {signIn.isError && (
        <div ref={focusOnMount} tabIndex={-1} role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger focus-visible:outline-none">
          {formErrorCopy(signIn.error)}
        </div>
      )}

      <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email} registration={register('email')} />
      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="current-password"
        error={errors.password}
        registration={register('password')}
        trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full aria-disabled:opacity-55"
        aria-disabled={signIn.isPending}
        onClick={(e) => signIn.isPending && e.preventDefault()}
      >
        {signIn.isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      {onCreateAccount && (
        <p className="text-center text-sm text-ink-muted">
          New here?{' '}
          <button type="button" onClick={() => onCreateAccount(getValues('email'))} className="font-medium text-accent hover:underline">
            Create an account
          </button>
        </p>
      )}
    </form>
  );
}
