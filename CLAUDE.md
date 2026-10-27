# Claude Code Rules for Valen

## Scale Mindset — Non-Negotiable

Every implementation must be designed as if this app serves 10 million+ active users globally. This means:

- **Performance first.** No blocking operations on the main thread. Paginate all lists. Virtualise large data sets. Memoize expensive computations. Avoid unnecessary re-renders.
- **Resilience by default.** Every network call must handle failure, retry, and timeout gracefully. Use optimistic updates with rollback. Never leave the UI in a broken state on error.
- **Scalable data patterns.** Prefer cursor-based pagination over offset. Cache aggressively with proper invalidation. Never fetch more data than needed.
- **Concurrency safety.** Guard against race conditions in async flows, duplicate requests, and stale closures. Use request deduplication and abort controllers where appropriate.
- **Internationalisation-ready.** Do not hardcode strings that could face users. Structure for multi-language, multi-timezone, and multi-currency support even if not yet wired.
- **Observability.** Errors must be catchable and loggable. Avoid swallowing exceptions silently.
- **Security.** Sanitise all user input. Never trust client-side data. Apply least-privilege access patterns. No sensitive data in local storage without encryption.

## Non-Negotiable: No Accidental Removals

Before editing any file, run a git diff mentally against the previous version. Every property, style key, or prop that existed before a fix must still exist after — unless the user explicitly asked to remove it.

When fixing a bug, touch ONLY the lines needed for the fix. Do not clean up, reformat, or remove surrounding code.

## Regression Check — Required After Every Edit

After every change to a component, explicitly verify:

1. **Read the full modified file** — confirm nothing was inadvertently dropped.
2. **Diff against the last git commit** — use `git diff` to review what changed before finalising.
3. **Check all props and style keys still present** — especially in `screenOptions`, `StyleSheet.create`, and any config objects.

Run this after every edit:
```
git diff apps/mobile/app/(tabs)/_layout.tsx
```
(adjust path to match the file changed)

## Non-Negotiable: Fix All Errors Before Deploying

- **Never leave a pre-existing TypeScript or lint error unfixed.** If an error existed before your changes, fix it as part of the same task.
- **Never deploy (OTA or native build) while any TypeScript or lint errors remain.** Always run a type-check first and resolve all errors before triggering any deployment.
- **Never deploy without explicit user instruction.** Do not run `eas update`, `eas build`, or any deployment command unless the user has explicitly said to deploy. Even if a fix is complete, wait for the user to say "deploy" or "push" before doing so.

## App Review — Full Coverage Required

When asked to do an app review or fix bugs:

- **Cover every section of the app** — every screen, store, service, type, navigation flow, and component. Do not stop at the first reported issue.
- **Read every relevant file before declaring anything fixed** — do not assume a file is correct without reading it.
- **After every implementation, before marking complete**, explicitly check for:
  - Crash scenarios (null/undefined access, missing guards, async race conditions)
  - TypeScript errors and type mismatches
  - Performance issues (unnecessary re-renders, missing memoization, large lists without virtualisation, heavy operations on the main thread)
  - State consistency (optimistic updates that don't roll back on failure, stale cache, missing error handling)
  - Edge cases (empty states, network failure, first-time user with no data, mode switching mid-operation)
- **Do not issue a completion notice until all of the above have been checked and resolved.**

## Thorough Implementation — Non-Negotiable

When implementing any feature or fix, exhaustive coverage is required before touching a single line of code:

1. **Map every layer first.** A bug or feature can touch stores, services, screens, navigation, types, and API calls simultaneously. Identify ALL affected layers before writing any code.
2. **Read every relevant file.** Do not assume a file is correct or irrelevant without reading it. If a feature involves data fetching, read the store, the API service, the screen, and any related stores that share the same data.
3. **Fix all layers in one pass.** Do not fix one layer, deploy, wait for feedback, then fix the next. Find every broken layer upfront and fix them all together.
4. **Verify completeness before declaring done.** After implementing, explicitly list every file touched and every scenario covered. If any scenario is unverified, keep working.
5. **Do not reactive-patch.** If a fix requires a follow-up fix, that is a sign the original investigation was incomplete. Go back and audit more broadly.

This rule exists because multi-layer bugs (e.g. mode isolation) were fixed across 8 separate rounds when a single thorough investigation would have caught all layers at once.

## Specific Lessons Learned

- `tabBarIconStyle: { flex: 1, width: '100%' }` in `screenOptions` is **critical** — it gives React Navigation's internal icon wrapper the full tab width so labels render without wrapping. Never remove it.
- When fixing one thing (e.g. touch responsiveness), always check that style/config keys in the same object were not collaterally removed.
- If a bug existed before your changes, investigate the git history (`git log --oneline <file>`) to find when it was introduced before guessing at a fix.
