// The public shape of an account. Never carries the password hash.
export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export const toUser = (row: Pick<UserRow, 'id' | 'email' | 'name' | 'created_at'>): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.created_at,
});
