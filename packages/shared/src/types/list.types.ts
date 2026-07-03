// ---------------------------------------------------------------------------
// Shopping-list domain types
// ---------------------------------------------------------------------------

/** A single item within a shopping list. */
export interface IShoppingItem {
  /** Unique identifier. */
  id: string;
  /** Parent shopping list ID. */
  listId: string;
  /** Item name / label. */
  name: string;
  /** Desired quantity. */
  quantity: number;
  /** Unit of measurement (e.g. "kg", "pcs"). */
  unit?: string;
  /** Whether the item has been checked off. */
  checked: boolean;
  /** Optional grouping category (e.g. "Produce", "Dairy"). */
  category?: string;
  /** User ID of the member who added this item. */
  addedBy: string;
}

/** A shopping list belonging to a household. */
export interface IShoppingList {
  /** Unique identifier. */
  id: string;
  /** Household this list belongs to. */
  householdId: string;
  /** List display name. */
  name: string;
  /** Items on the list. */
  items: IShoppingItem[];
  /** Whether the list is visible to all household members. */
  shared: boolean;
  /** User ID of the member who created the list. */
  createdBy: string;
  /** ISO-8601 date-time string of the last update. */
  updatedAt: string;
}

/** Payload for creating a new shopping list. */
export interface ICreateList {
  /** Household this list belongs to. */
  householdId: string;
  /** List display name. */
  name: string;
  /** Whether visible to all household members. */
  shared: boolean;
}

/** Payload for adding an item to an existing shopping list. */
export interface ICreateItem {
  /** Parent shopping list ID. */
  listId: string;
  /** Item name / label. */
  name: string;
  /** Desired quantity. */
  quantity: number;
  /** Unit of measurement. */
  unit?: string;
  /** Optional grouping category. */
  category?: string;
}
