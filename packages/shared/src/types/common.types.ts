// ---------------------------------------------------------------------------
// Common / generic types shared across every domain
// ---------------------------------------------------------------------------

/** Query parameters for any paginated list endpoint. */
export interface IPaginationQuery {
  /** 1-based page number. */
  page?: number;
  /** Maximum items per page. */
  limit?: number;
  /** Field name to sort by. */
  sortBy?: string;
  /** Sort direction. */
  sortOrder?: 'asc' | 'desc';
}

/** Envelope returned by every paginated list endpoint. */
export interface IPaginatedResponse<T> {
  /** The slice of items for the current page. */
  data: T[];
  /** Total number of items matching the query. */
  total: number;
  /** Current 1-based page number. */
  page: number;
  /** Maximum items per page. */
  limit: number;
  /** Total number of pages. */
  totalPages: number;
}

/** Standard API response wrapper. */
export interface IApiResponse<T> {
  /** Whether the request succeeded. */
  success: boolean;
  /** Response payload (present on success). */
  data?: T;
  /** Human-readable error message (present on failure). */
  error?: string;
  /** Machine-readable error code (present on failure). */
  errorCode?: string;
}
