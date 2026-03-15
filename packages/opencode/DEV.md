# Kibi-Opencode Dogfood Setup

This directory contains the OpenCode plugin for Kibi. When developing locally, this project uses a "dogfood" setup where the plugin is loaded from source rather than from the published npm package.

## Local Plugin Architecture

The dogfood setup consists of:

1. **Source Code**: `packages/opencode/src/` - TypeScript source files
2. **Local Shim**: `.opencode/plugins/kibi.ts` - Thin re-export of the built plugin
3. **Built Output**: `packages/opencode/dist/` - Compiled JavaScript

The local shim at `.opencode/plugins/kibi.ts` exports:
```typescript
export { default } from "../../packages/opencode/dist/index.js";
```

OpenCode automatically discovers and loads plugins from `.opencode/plugins/`, so this shim makes the locally built plugin available.

## Development Workflow

### Initial Setup

1. Build the plugin once:
   ```bash
   cd packages/opencode
   bun run build
   ```

2. Ensure `opencode.json` in the project root has:
   ```json
   {
     "plugin": []
   }
   ```
   (Empty array = local plugins only, no npm packages)

### During Development

Option 1: Manual rebuild after changes
```bash
cd packages/opencode
bun run build
```

Option 2: Watch mode for automatic rebuilds
```bash
cd packages/opencode
bun run dev
```

The watch mode will automatically rebuild the plugin when you save changes in `packages/opencode/src/`.

## How It Works

1. You edit TypeScript files in `packages/opencode/src/`
2. Build/watch process compiles them to `packages/opencode/dist/`
3. `.opencode/plugins/kibi.ts` re-exports from the dist directory
4. OpenCode loads the plugin from `.opencode/plugins/`
5. Changes are reflected immediately after rebuild

## Verification

To verify the dogfood setup is working:

1. Check that the local shim exists:
   ```bash
   cat .opencode/plugins/kibi.ts
   ```

2. Verify the plugin is built:
   ```bash
   ls -la packages/opencode/dist/
   ```

3. Restart OpenCode to pick up the local plugin

## Common Issues

**Plugin not loading:**
- Ensure `opencode.json` has `"plugin": []` (no npm package reference)
- Verify the build completed successfully: `ls packages/opencode/dist/`
- Restart OpenCode after changes

**Changes not reflected:**
- If using manual build: run `bun run build` after changes
- If using watch mode: ensure the watch process is running
- Restart OpenCode to reload the plugin

## Testing

Run tests for the plugin:
```bash
cd packages/opencode
bun test
```

## Publishing

When ready to publish:
1. Update version in `package.json`
2. Run `bun run build`
3. Test the built plugin locally first
4. Create a changeset: `bun run changeset`
5. Follow the release workflow in the main README
