// ---------------------------------------------------------------------------
// Offline-sync domain types
// ---------------------------------------------------------------------------

/** A single change record used for offline synchronisation. */
export interface ISyncChange {
  /** The kind of mutation. */
  type: 'create' | 'update' | 'delete';
  /** Resource name (e.g. "task", "event", "expense"). */
  resource: string;
  /** Unique identifier of the affected resource. */
  resourceId: string;
  /** Payload data (present for create / update, absent for delete). */
  data?: any;
  /** Client-generated ID used for deduplication. */
  clientId?: string;
  /** ISO-8601 date-time string when the change occurred. */
  timestamp: string;
  /** Monotonically increasing version used for conflict resolution. */
  syncVersion?: number;
}

/** Payload sent by the client to push local changes to the server. */
export interface ISyncPushPayload {
  /** Array of local changes to apply. */
  changes: ISyncChange[];
  /** Unique identifier of the originating device. */
  deviceId: string;
}

/** Response returned by the server when the client pulls remote changes. */
export interface ISyncPullResponse {
  /** Array of remote changes since the client's last sync. */
  changes: ISyncChange[];
  /** The server's current sync version (used as cursor for the next pull). */
  serverVersion: number;
}
