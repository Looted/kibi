# Kibi VS Code Extension

VS Code extension for Kibi knowledge base system, providing TreeView visualization of knowledge entities and MCP integration.

## Features

- **TreeView Explorer**: Visualize your Kibi knowledge base entities in the VS Code sidebar
- **Entity Types**: Browse Requirements, Scenarios, Tests, ADRs, Flags, Events, and Symbols
- **MCP Integration**: Built-in Model Context Protocol server for AI assistant integration
- **Workspace Detection**: Auto-activates when `.kb` folder is detected

## Installation

### From VSIX Package

1. Download the latest `kibi-vscode-x.x.x.vsix` file
2. Open VS Code Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
3. Run `Extensions: Install from VSIX...`
4. Select the downloaded VSIX file

### Development Installation

```bash
cd /path/to/kibi
bun install
bun run --cwd packages/vscode build
bun run --cwd packages/vscode package
code --install-extension kibi-vscode-*.vsix
```

## Usage

1. Open a workspace containing a `.kb` directory
2. The Kibi Knowledge Base panel will appear in the Explorer sidebar
3. Expand entity categories to view their contents (placeholder in v0.1)
4. Use the refresh button to reload the tree view

## Entity Types

- **📋 Requirements**: System requirements and specifications
- **📝 Scenarios**: Use cases and business scenarios  
- **✅ Tests**: Test definitions and cases
- **📖 ADRs**: Architectural Decision Records
- **🚩 Flags**: Feature flags and configuration
- **📅 Events**: Domain events and system events
- **🔤 Symbols**: Code symbols and references

## Configuration

The extension provides the following configuration settings:

### `kibi.mcp.serverPath`

**Type:** `string`  
**Default:** `""` (empty)

Absolute path to the kibi-mcp executable. Examples:
- `/path/to/kibi/packages/mcp/bin/kibi-mcp` (local clone)
- `/usr/local/bin/kibi-mcp` (global installation)

If left empty, the extension will attempt to auto-detect `kibi-mcp` in your system PATH.

#### Finding the correct path

**Option 1: Check your PATH**
```bash
which kibi-mcp
# or on Windows:
where kibi-mcp
```

**Option 2: Point to your Kibi clone**
If you have the Kibi repository cloned locally:
```bash
# Replace /path/to/kibi with your actual clone path
/path/to/kibi/packages/mcp/bin/kibi-mcp
```

**Option 3: Install globally**
If you've installed Kibi globally, the path might be:
- `~/.local/bin/kibi-mcp`
- `~/.bun/bin/kibi-mcp`
- `/usr/local/bin/kibi-mcp`

### Setting the configuration

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for "Kibi"
3. Set **Kibi: Mcp: Server Path** to the absolute path of your kibi-mcp executable

Or edit `settings.json` directly:
```json
{
  "kibi.mcp.serverPath": "/path/to/kibi/packages/mcp/bin/kibi-mcp"
}
```

## MCP Integration

This extension includes MCP (Model Context Protocol) server integration for AI assistant interaction with your knowledge base. The extension relies on the public four-tool MCP surface and uses `kb_query` for source-linked context lookups.

## Current Limitations (v0.1)

- TreeView shows placeholder data only
- No actual data loading from `.kb` files
- Basic scaffolding for future enhancements

## Development

### Build

```bash
bun run --cwd packages/vscode build     # Compile extension bundle
bun run --cwd packages/vscode watch     # Watch mode
```

### Package

```bash
bun run --cwd packages/vscode package   # Create VSIX file
```

### Test

```bash
bun run --cwd packages/vscode test       # Run VS Code package tests
```

### Debugging (Extension Host)

1. Build the extension bundle:

```bash
bun run --cwd packages/vscode build
```

2. In VS Code, run the launch config `Run Kibi VS Code Extension` (F5).
3. In the Extension Development Host window, open `View -> Output` and select `Kibi`.
4. Confirm logs include:
   - `Activating Kibi extension...`
   - `CodeLens indicators initialized.`

### Debugging CodeLens (Installed VSIX)

1. Uninstall older `kibi-vscode` versions.
2. Install a single VSIX from `packages/vscode/`.
3. Reload VS Code.
4. Verify these conditions:
   - `editor.codeLens` is enabled.
   - Active file language is `TypeScript` or `JavaScript`.
   - Workspace root contains `.kb/config.json` and `symbols.yaml`.
   - The file path is listed in `symbols.yaml` under `sourceFile`.
5. Check `Developer: Show Running Extensions` and confirm `kibi-vscode` is active.
6. If lenses still do not appear, capture:
   - `Kibi` output channel logs
   - `Help -> Toggle Developer Tools` console errors

### CodeLens Scope

- CodeLens is currently registered only for `typescript` and `javascript`.
- CodeLens appears only for symbols whose `sourceFile` in `symbols.yaml` resolves to the currently opened file path.

## Contributing

This extension is part of the larger Kibi project. See the main repository for contribution guidelines.

## License

AGPL-3.0-or-later - See LICENSE file for details.
