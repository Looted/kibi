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
kibi-core (0.1.6)
    ↓
kibi-cli (0.2.0) ──→ uses kibi-core ^0.1.6
    ↓
kibi-mcp (0.2.1) ──→ uses kibi-cli ^0.2.0, kibi-core ^0.1.6

kibi-opencode (0.1.0) ──→ standalone OpenCode plugin package
```

When `kibi-core` is bumped, `kibi-cli` and `kibi-mcp` will automatically update their dependency ranges. `kibi-opencode` is versioned independently and receives changelog updates through Changesets like the other npm packages.

## Adding a Changeset

1. Run `bunx changeset` or `bun run changeset`
2. Select the packages you've modified
3. Choose the semver impact (patch/minor/major)
4. Write a summary of the changes
5. Commit the generated `.changeset/*.md` file

## Release Workflow

1. Create PRs with changeset files
2. Merge to `master`
3. Run `bun run version-packages` to bump versions
4. Run `bun run release` to publish
