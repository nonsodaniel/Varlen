// ---------------------------------------------------------------------------
// User domain types
// ---------------------------------------------------------------------------

/** A registered user. */
export interface IUser {
  /** Unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Email address (unique). */
  email: string;
  /** URL to the user's avatar image. */
  avatarUrl?: string;
  /** Hex colour used to represent this user in the UI. */
  color?: string;
}

/** Payload for creating a new user (sign-up). */
export interface ICreateUser {
  /** Email address. */
  email: string;
  /** Plain-text password (hashed server-side). */
  password: string;
  /** Display name. */
  name: string;
}

/** Payload for updating an existing user's profile. */
export interface IUpdateUser {
  /** Updated display name. */
  name?: string;
  /** Updated avatar URL. */
  avatarUrl?: string;
  /** Updated hex colour. */
  color?: string;
}
