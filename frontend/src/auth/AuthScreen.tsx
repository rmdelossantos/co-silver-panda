import { Package } from 'lucide-react';
import { useState } from 'react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

interface AuthScreenProps {
  signupEnabled: boolean;
}

// Sign in or create an account. The URL is never touched, so a deep link like ?category=Kitchen
// still applies once the person is signed in.
export function AuthScreen({ signupEnabled }: AuthScreenProps) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [switched, setSwitched] = useState(false);

  const switchTo = (next: 'sign-in' | 'sign-up') => (currentEmail: string) => {
    setEmail(currentEmail);
    setSwitched(true);
    setMode(next);
  };

  return (
    <div className="mx-auto w-full max-w-sm py-6 sm:py-12">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="grid size-10 place-items-center rounded-lg bg-accent text-white" aria-hidden="true">
          <Package className="size-5" strokeWidth={2.25} />
        </span>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs sm:p-7">
        {mode === 'sign-in' || !signupEnabled ? (
          <SignInForm
            key="sign-in"
            initialEmail={email}
            focusHeading={switched}
            onCreateAccount={signupEnabled ? switchTo('sign-up') : undefined}
          />
        ) : (
          <SignUpForm key="sign-up" initialEmail={email} focusHeading={switched} onSignIn={switchTo('sign-in')} />
        )}
      </div>
    </div>
  );
}
