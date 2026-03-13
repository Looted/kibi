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
   kibi init --hooks
   ```
   This explicitly reinstalls the hooks (pre-commit, post-checkout, post-merge, post-rewrite).

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
   kibi init --hooks
   ```

### Hook Conflicts

If you have existing git hooks that conflict with kibi:

**Warning:** The `--hooks` flag overwrites existing hooks. Make sure to back up your hooks first.

1. **Backup existing hooks:**
   ```bash
   cp .git/hooks/pre-commit .git/hooks/pre-commit.backup
   cp .git/hooks/post-checkout .git/hooks/post-checkout.backup
   cp .git/hooks/post-merge .git/hooks/post-merge.backup
   cp .git/hooks/post-rewrite .git/hooks/post-rewrite.backup
   ```

2. **Install kibi hooks:**
   ```bash
   kibi init --hooks
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

For installation issues, see [install guide](install.md).

## Recovery Steps Summary

| Issue | First Try | If That Fails |
|--------|-----------|----------------|
| KB corruption on upgrade | `kibi doctor` | Delete `.kb/branches` and `kibi sync` |
| Dangling references | Update source files with correct IDs | Verify and `kibi sync` |
| Hooks not working | `kibi doctor` | `kibi init --hooks` |
| Sync finds no docs | Check `config.json` paths | Verify files exist at paths |
| SWI-Prolog errors | Check version | Reinstall SWI-Prolog per [install guide](install.md) |

---

*For CLI command syntax and options, see [CLI Reference](cli-reference.md)*
*For agent-specific workflows, see [AGENTS.md](../AGENTS.md)*
