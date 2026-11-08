# Fix List — 5,000 Users

At 5K users, infrastructure scaling (Redis, read replicas, CDN, connection pooling) is premature.
Focus is on correctness, UX quality, and avoiding bugs that become painful as the user base grows.

---

## Must Fix (bugs / data loss risk)

### 1. Offline conflict: locally-created records can disappear on reconnect
**File:** `apps/mobile/src/services/offlineQueue.ts:152`
When user creates tasks/habits offline then reconnects, the server refetch overwrites local state.
Records with `temp-` IDs disappear if the server response arrives before optimistic state is confirmed.
**Fix:** Keep `temp-` items visible until server responds with a real ID. On sync, replace by `clientId` match, don't wipe.

---

### 2. Push token not guaranteed deregistered on logout
**File:** `apps/mobile/src/stores/authStore.ts:55`
`deregisterPushToken()` is fire-and-forget. If it fails (network blip), the next user on the same device receives the previous user's notifications.
**Fix:** Best-effort deregister on logout + server-side cleanup job: revoke tokens not seen in 30 days.

---

### 3. POST/PATCH have no double-tap protection
**File:** `apps/mobile/src/services/api.ts`
GET requests deduplicate. Mutations do not. Double-tap on "Save" or network retry creates duplicate records.
**Fix:** Per-screen `saving` state flag (already done in some screens, missing in others). Audit all forms.

---

### 4. Offline queue TTL is 7 days
**File:** `apps/mobile/src/services/offlineQueue.ts:30`
Mutations queued 7 days ago replay on reconnect — creates or deletes records the user has long forgotten about.
**Fix:** 24h TTL. After 24h offline, discard queue and do a clean server sync with a user-visible notice.

---

## Should Fix (UX quality, noticeable at current scale)

### 5. Home screen `.map()` on all tasks/events
**File:** `apps/mobile/app/(tabs)/index.tsx:946, 1012, 1232, 1270`
Renders every task and event in the list simultaneously. Users with 100+ items see jank on low-end Android.
**Fix:** Replace with `FlatList` + `windowSize={5}`. Not urgent until users complain, but cheap to do now.

---

### 6. No proactive token refresh
**File:** `apps/mobile/src/services/api.ts:117`
Tokens refreshed reactively on 401. User idle 15min → brief login flash on next action.
**Fix:** Schedule refresh at `(expiresIn - 60)s` after login using `setTimeout`. Cancel on logout.

---

### 7. All stores share a 30s cache TTL with no jitter
**Files:** All stores
Fine at 5K users. Becomes a problem at 50K. Add jitter (±5s) now to avoid all clients hitting the server simultaneously on app open.
**Fix:** `Math.random() * 10_000` added to TTL constants.

---

### 8. Notification inserts are N+1
**Files:** `apps/backend/src/modules/goals/goals.service.ts:113`, tasks, expenses
One `INSERT` per household member. For a family of 5 this is 5 queries. Fine now, but trivial to fix.
**Fix:** `prisma.notification.createMany({ data: [...] })`.

---

### 9. Retry on 429 has no jitter
**File:** `apps/mobile/src/services/api.ts:109`
Fixed 5s retry. If the server is briefly overwhelmed, all clients retry at exactly the same moment.
**Fix:** `delay + Math.random() * 1000`.

---

## Ignore for now (overkill at 5K)

- Redis adapter for sockets — single instance is fine until ~50K concurrent connections
- PgBouncer / connection pooling — Prisma's built-in pool is sufficient
- Read replicas — not needed until DB CPU consistently above 60%
- CDN for static assets — Expo's CDN handles this already
- Cursor-based pagination — hard limits (50 tasks, 60 messages) are fine at 5K
- WebSocket connection limits — a single server handles 5K users easily

---

## Already Good

- GET request deduplication
- Optimistic updates with rollback
- Tokens in SecureStore (not AsyncStorage)
- Mode isolation stale-response guard
- Offline queue with retry and idempotency keys
- Push notification channels per category
- Timing-safe code verification (crypto.timingSafeEqual)
- Rate limiting on auth endpoints
