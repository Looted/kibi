# Changesets

This directory contains [Changesets](https://github.com/changesets/changesets) configuration and changeset files for versioning and releasing the Kibi packages.

## Configuration

- **Independent Versioning**: Each package is versioned independently (`linked: []`)
- **Internal Dependencies**: Core → CLI/MCP dependency propagation enabled
- **No Auto-Commit**: Commits are handled separately per project workflow

## Usage

```bash
# Add a changeset for your changes
bunx changeset

# Check release status (what would be released)
bunx changeset status

# Version packages (updates package.json versions and changelogs)
bunx changeset version

# Publish packages (requires authentication)
bunx changeset publish
```

## Package Dependency Chain

```
kibi-core
    ↓
kibi-cli ──→ uses kibi-core
    ↓
kibi-mcp ──→ uses kibi-cli, kibi-core and kibi-runtime

kibi-opencode ──→ uses kibi-cli
kibi-codex, kibi-cursor, kibi-claude, kibi-zcode ──→ host plugin adapters
kibi-vscode ──→ uses kibi-cli
```

When `kibi-core` is bumped, `kibi-cli` and `kibi-mcp` will automatically update their dependency ranges. `kibi-opencode` is versioned independently and receives changelog updates through Changesets like the other npm packages.

## Adding a Changeset

1. Run `bunx changeset` or `bun run changeset`
2. Select the packages you've modified
3. Choose the semver impact (patch/minor/major)
4. Write a summary of the changes
5. Commit the generated `.changeset/*.md` file

## Release Workflow

1. Create changeset files on `develop` with human-readable user impact first
2. Run `bun run version-packages` on `develop` to consume changesets, bump versions, update changelogs, and sync plugin manifests
3. Review and commit the generated release changes
4. Merge `develop` into `master`
5. Let the `master` publish workflow build, verify, and publish packages

Do not publish manually or merge `master` back into `develop`.
