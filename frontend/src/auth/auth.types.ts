export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

// What GET /api/auth/me returns: the signed-in user (or null) and whether new accounts can be created.
export interface Session {
  user: User | null;
  signupEnabled: boolean;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface SignUpInput extends SignInInput {
  name: string;
}
