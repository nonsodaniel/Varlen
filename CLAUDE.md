# Claude Code Rules for Valen

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

## Specific Lessons Learned

- `tabBarIconStyle: { flex: 1, width: '100%' }` in `screenOptions` is **critical** — it gives React Navigation's internal icon wrapper the full tab width so labels render without wrapping. Never remove it.
- When fixing one thing (e.g. touch responsiveness), always check that style/config keys in the same object were not collaterally removed.
- If a bug existed before your changes, investigate the git history (`git log --oneline <file>`) to find when it was introduced before guessing at a fix.
