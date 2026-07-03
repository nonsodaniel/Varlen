export interface JwtPayload {
  sub: string; // userId
  email: string;
  householdId?: string;
  role?: string;
}
