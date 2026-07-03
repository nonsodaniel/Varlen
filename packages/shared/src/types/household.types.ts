import { HouseholdRole } from '../enums/role.enum';
import { LifeMode } from '../enums/life-mode.enum';

// ---------------------------------------------------------------------------
// Household domain types
// ---------------------------------------------------------------------------

/** A member entry within a household. */
export interface IHouseholdMember {
  /** Unique membership identifier. */
  id: string;
  /** The user this membership belongs to. */
  userId: string;
  /** Role within the household. */
  role: HouseholdRole;
  /** ISO-8601 date string when the user joined. */
  joinedAt: string;
}

/** A household (the top-level organisational unit). */
export interface IHousehold {
  /** Unique identifier. */
  id: string;
  /** Household display name. */
  name: string;
  /** Active life mode that drives feature visibility. */
  mode: LifeMode;
  /** Current household members. */
  members: IHouseholdMember[];
  /** Names / identifiers of children (relevant in FAMILY / PARENTING modes). */
  children?: string[];
  /** ISO-8601 date string of the couple's anniversary. */
  anniversary?: string;
  /** ISO-8601 date string representing when the couple got together. */
  togetherSince?: string;
  /** ISO-8601 date string when the household was created. */
  createdAt: string;
}

/** Payload for creating a new household. */
export interface ICreateHousehold {
  /** Household display name. */
  name: string;
  /** Initial life mode (defaults to COUPLE on the server). */
  mode?: LifeMode;
}
