import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { focusOnMount } from './focus-on-mount';
import { useForm } from 'react-hook-form';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { ApiError } from '../lib/api-client';
import { signUpSchema, type SignUpValues } from './auth.schema';
import type { SignUpInput } from './auth.types';
import { formErrorCopy } from './form-errors';
import { PasswordToggle } from './PasswordToggle';
import { useSignUp } from './useSession';

interface SignUpFormProps {
  initialEmail: string;
  focusHeading: boolean;
  onSignIn: (email: string) => void;
}

export function SignUpForm({ initialEmail, focusHeading, onSignIn }: SignUpFormProps) {
  const signUp = useSignUp();
  const [showPassword, setShowPassword] = useState(false);
  const [emailTaken, setEmailTaken] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<SignUpValues, unknown, SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: initialEmail, password: '' },
  });

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus();
    else setFocus('name');
  }, [focusHeading, setFocus]);

  const submit = handleSubmit((input) => {
    setEmailTaken(false);
    signUp.mutate(input, {
      onError: (error) => {
        if (error instanceof ApiError && error.status === 409) {
          setEmailTaken(true);
          setError('email', { message: 'An account with this email already exists' }, { shouldFocus: true });
        }
      },
    });
  });

  const formError = signUp.isError && !emailTaken;

  return (
    <form noValidate onSubmit={submit} className="space-y-5">
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold tracking-tight focus-visible:outline-none">
          Create an account
        </h2>
        <p className="mt-1 text-sm text-ink-muted">Everyone on your team shares one catalog.</p>
      </div>

      {formError && (
        <div ref={focusOnMount} tabIndex={-1} role="alert" className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger focus-visible:outline-none">
          {formErrorCopy(signUp.error)}
        </div>
      )}

      <TextField label="Name" autoComplete="name" error={errors.name} registration={register('name')} />
      <div className="space-y-2">
        <TextField label="Email" type="email" autoComplete="email" inputMode="email" error={errors.email} registration={register('email')} />
        {emailTaken && (
          <button type="button" onClick={() => onSignIn(getValues('email'))} className="text-sm font-medium text-accent hover:underline">
            Sign in instead
          </button>
        )}
      </div>
      <TextField
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        hint="At least 12 characters. A short phrase works well."
        error={errors.password}
        registration={register('password')}
        trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((s) => !s)} />}
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full aria-disabled:opacity-55"
        aria-disabled={signUp.isPending}
        onClick={(e) => signUp.isPending && e.preventDefault()}
      >
        {signUp.isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{' '}
        <button type="button" onClick={() => onSignIn(getValues('email'))} className="font-medium text-accent hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}
