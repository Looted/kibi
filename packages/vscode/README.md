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

## MCP Integration

This extension includes MCP (Model Context Protocol) server integration pointing to the Kibi MCP server at `packages/mcp/bin/kibi-mcp`. This enables AI assistants to query and interact with your knowledge base.

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

MIT - See LICENSE file for details.
