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
cd packages/vscode
bun install
bun run build
bun run package
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
bun run build     # Compile TypeScript
bun run watch     # Watch mode
```

### Package

```bash
bun run package   # Create VSIX file
```

### Test

```bash
bun test         # Run unit tests
```

## Contributing

This extension is part of the larger Kibi project. See the main repository for contribution guidelines.

## License

MIT - See LICENSE file for details.