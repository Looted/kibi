# Troubleshooting

This document provides recovery procedures and common issue resolution for kibi.

## Alpha Migration & Rebuild

Since kibi is in alpha, automatic migrations are not yet implemented. If you encounter KB corruption or upgrade to a new version:

1. **Delete the `.kb/branches` folder:**
   ```bash
   rm -rf .kb/branches
   ```

2. **Rebuild from current docs:**
   ```bash
   kibi sync
   ```

This rebuilds the entire KB from your documentation. No data is preserved from the old KB - it is regenerated from your Markdown files and YAML manifests.

## Dangling References

If `kibi check` fails with `no-dangling-refs` violations:

**Symptom:**
- Check reports that entities reference IDs that don't exist
- Relationships point to deleted or missing entities

**Resolution:**
1. **Identify the dangling references:**
   ```bash
   kibi check
   ```
   Note the specific entity IDs and relationship types reported.

2. **Fix the source files:**
   - Update Markdown frontmatter to use correct entity IDs
   - Verify that all linked entities actually exist
   - Remove relationships to deleted entities

3. **Re-sync:**
   ```bash
   kibi sync
   ```

4. **Re-check:**
   ```bash
   kibi check
   ```

## Git Hook Issues

### Hooks Not Installing

If `kibi doctor` reports missing git hooks:

1. **Reinstall hooks:**
   ```bash
   kibi init
   ```
   This reinstalls the hooks (pre-commit, post-checkout, post-merge, post-rewrite) by default.

2. **Verify hooks are executable:**
   ```bash
   ls -la .git/hooks/
   ```
   The hooks should be executable files (not just `.sample` files).

3. **Manually check hook permissions:**
   ```bash
   chmod +x .git/hooks/pre-commit
   chmod +x .git/hooks/post-checkout
   chmod +x .git/hooks/post-merge
   chmod +x .git/hooks/post-rewrite
   ```

### Hooks Not Running

If git operations don't trigger kibi hooks:

1. **Check hook files exist:**
   ```bash
   ls -la .git/hooks/ | grep -E "pre-commit|post-checkout|post-merge|post-rewrite"
   ```

2. **Check hook content:**
   ```bash
   cat .git/hooks/pre-commit
   ```
   Should contain kibi commands (e.g., `kibi check --staged`).

3. **Reinstall hooks:**
   ```bash
   kibi init
   ```
   Re-running `kibi init` also refreshes `.gitignore` entries for `.kb/` and `.kb/briefs/`.

### Hook Conflicts

If you have existing git hooks that conflict with kibi:

**Warning:** Re-running `kibi init` overwrites Kibi-managed hooks. Make sure to back up custom hook logic first.

1. **Backup existing hooks:**
   ```bash
   cp .git/hooks/pre-commit .git/hooks/pre-commit.backup
   cp .git/hooks/post-checkout .git/hooks/post-checkout.backup
   cp .git/hooks/post-merge .git/hooks/post-merge.backup
   cp .git/hooks/post-rewrite .git/hooks/post-rewrite.backup
   ```

2. **Install kibi hooks:**
   ```bash
   kibi init
   ```

3. **Manually merge (if needed):**
   Edit the hook files to combine both your existing hooks and kibi hooks.

## KB Corruption

If `kibi sync` or `kibi query` produce errors:

1. **Check SWI-Prolog:**
   ```bash
   kibi doctor
   ```
   Ensure SWI-Prolog is installed and at correct version (9.0+).

2. **Validate config:**
   ```bash
   cat .kb/config.json
   ```
   Check for syntax errors (valid JSON).

3. **Rebuild KB:**
   ```bash
   rm -rf .kb/branches
   kibi sync
   ```

4. **Check for locked files:**
   ```bash
   ls -la .kb/branches/
   ```
   If files appear locked or have unusual permissions, check running processes and file system issues.

## Configuration Issues

### Document Path Configuration

If `kibi sync` doesn't find your documents:

1. **Check your config:**
   ```bash
   cat .kb/config.json
   ```
   The `include` and `exclude` patterns specify which files are scanned.

2. **Test patterns:**
   Ensure your Markdown files match the patterns in `include`.
   Default patterns are typically:
   - `documentation/**/*.md`
   - `docs/**/*.md`

3. **Verify file paths:**
   ```bash
   ls documentation/requirements/  # or your actual doc directory
   ```
   Ensure files exist at the configured paths.

## Environment Diagnostics

Run comprehensive diagnostics:

```bash
kibi doctor
```

This checks:
- SWI-Prolog installation
- `.kb/` directory existence
- `config.json` validity
- Git repository presence
- Git hooks installation

## OpenCode shows "workspace needs Kibi bootstrap" before the TUI
## OpenCode shows "workspace needs Kibi bootstrap" before the TUI

### Symptom

When launching OpenCode in a workspace that already has `.kb/config.json` pointing at relocated `kibi-docs/*` paths, you see a red error message saying "workspace needs Kibi bootstrap" before the TUI appears.

### Root Cause

Your workspace is healthy—it has:
- `.kb/config.json` with `kibi-docs/*` paths
- Populated `kibi-docs/` directories
- Non-empty `.kb/` directory

The false positive occurs when the **cached `kibi-opencode` plugin** still uses old hardcoded `documentation/*` checks instead of reading your `.kb/config.json`. This happens when:
1. The published `kibi-opencode` npm package was built before the config-aware fix
2. OpenCode's plugin cache hasn't been refreshed with the fixed version

### Inspection Commands

Check the cache plugin version:
```bash
cat ~/.cache/opencode/node_modules/kibi-opencode/package.json
```

Check if the cached plugin has the config-aware code:
```bash
grep -l "getKbExistenceTargets" ~/.cache/opencode/node_modules/kibi-opencode/dist/workspace-health.js
```
If this returns nothing, the cache is stale.

### Recovery

Clear only the `kibi-opencode` plugin cache (not the entire cache):
```bash
rm -rf "$HOME/.cache/opencode/node_modules/kibi-opencode" "$HOME/.cache/opencode/bun.lock"
```

Then restart OpenCode. The plugin will reinstall from npm. If the published version is still old, you'll need to wait for a patch release or pin a specific version.

### Verification

After clearing the cache and restarting OpenCode, run from your workspace:
```bash
timeout 20s opencode >/tmp/opencode-start.stdout 2>/tmp/opencode-start.stderr
grep -i "bootstrap" /tmp/opencode-start.stderr
```
If the grep returns nothing, the issue is resolved.

### If the Problem Persists

If the false warning returns after clearing the cache, the published npm package may still contain the bug. Check for a newer version:
```bash
npm view kibi-opencode versions
```

If you're on an old version, upgrade when a patch is available. Do not repeatedly clear the cache on the same broken version.

---

### Interpreting Sync Failures in OpenCode

When a background sync fails in OpenCode, the plugin logs an operational error with diagnostic metadata. To debug these failures, check the structured logs for the following fields:

- `syncStdout`: The captured standard output from the kibi sync command.
- `syncStderr`: The captured standard error from the kibi sync command. Often contains SWI-Prolog errors or file permission issues.
- `syncErrorMessage`: The underlying system error message if the command failed to execute.

**Idle Sync Suppression**: To prevent terminal noise, the plugin suppresses background sync attempts triggered by session idle after a `scheduler_sync_failed` event is latched for the session. Syncs will still be attempted when you edit files or execute tools, which provides opportunities for recovery once the underlying issue is fixed.

To verify behavior or capture detailed logs, start OpenCode with stderr redirection:
```bash
opencode 2> opencode-debug.log
```

Look for entries prefixed with `[kibi-opencode]` and check for the `scheduler_sync_failed` cause in the runtime overlay metadata.

## Recovery Steps Summary
For installation issues, see [install guide](install.md).

## Recovery Steps Summary

| Issue | First Try | If That Fails |
|--------|-----------|----------------|
| KB corruption on upgrade | `kibi doctor` | Delete `.kb/branches` and `kibi sync` |
| Dangling references | Update source files with correct IDs | Verify and `kibi sync` |
| Hooks not working | `kibi doctor` | `kibi init` |
| Sync finds no docs | Check `config.json` paths | Verify files exist at paths |
| SWI-Prolog errors | Check version | Reinstall SWI-Prolog per [install guide](install.md) |

---

*For CLI command syntax and options, see [CLI Reference](cli-reference.md)*
*For agent-specific workflows, see [AGENTS.md](../AGENTS.md)*
