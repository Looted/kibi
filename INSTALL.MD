Excellent! Everything is ready. Here's your setup guide:
Setting Up Kibi on This Repo
Step 1: Install the VS Code Extension
cd /home/looted/projects/kibi/packages/vscode
# Package the extension (creates .vsix file)
npx @vscode/vsce package
# Install in VS Code
code --install-extension kibi-vscode-0.1.0.vsix
Alternative (if vsce not available): Copy extension directly to VS Code extensions directory:
# Create symlink to extension directory
mkdir -p ~/.vscode-server/extensions/kibi-vscode-0.1.0
cp -r /home/looted/projects/kibi/packages/vscode/* ~/.vscode-server/extensions/kibi-vscode-0.1.0/
Step 2: Initialize Kibi KB
cd /home/looted/projects/kibi
# Initialize .kb/ directory with git hooks
bun run packages/cli/bin/kibi init --hooks
# Verify initialization
ls -la .kb/
Step 3: Configure MCP Server for Your Agent
The MCP server needs to be configured in your agent's MCP settings. Here's the configuration:
For Claude Desktop (if you're using it):
Edit ~/Library/Application Support/Claude/claude_desktop_config.json (macOS) or equivalent:
{
  mcpServers: {
    kibi: {
      command: bun,
      args: [/home/looted/projects/kibi/packages/mcp/bin/kibi-mcp],
      env: {
        KB_PATH: /home/looted/projects/kibi/.kb
      }
    }
  }
}
For Oh-My-OpenCode (if using MCP integration):
Add to your oh-my-opencode MCP config:
{
  kibi-mcp: {
    command: bun,
    args: [/home/looted/projects/kibi/packages/mcp/bin/kibi-mcp],
    cwd: /home/looted/projects/kibi
  }
}
Step 4: Test MCP Server Manually
cd /home/looted/projects/kibi
# Test MCP server initialization
echo '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "test", "version": "1.0"}
  }
}' | bun run packages/mcp/bin/kibi-mcp
# Test kb_query tool
echo '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "kb_query",
    "arguments": {
      "type": "req",
      "branch": "main"
    }
  }
}' | bun run packages/mcp/bin/kibi-mcp
Step 5: Create Sample Entities (Optional)
To populate the KB with some test data:
cd /home/looted/projects/kibi
# Create a requirements directory
mkdir -p docs/requirements
# Create a sample requirement
cat > docs/requirements/REQ-001.md <<EOF
---
title: Kibi should support branch-aware KB
status: done
priority: must
tags: [core, persistence]
owner: team
---
# Branch-Aware Knowledge Base
Kibi must maintain separate KB state per git branch with copy-from-main semantics.
EOF
# Update config to include docs directory
cat > .kb/config.json <<EOF
{
  "documentPaths": [
    "docs/**/*.md",
    "test/fixtures/**/*.md"
  ]
}
EOF
# Sync entities into KB
bun run packages/cli/bin/kibi sync
# Query to verify
bun run packages/cli/bin/kibi query req --format table
Step 6: Verify VS Code Extension Loads
1. Restart VS Code (or reload window: Cmd+Shift+P → "Developer: Reload Window")
2. Open the kibi project folder in VS Code
3. Look for "Kibi Knowledge Base" in the Explorer sidebar
4. The TreeView should show entity types once .kb/ directory exists
Step 7: Test Agent Integration
Once your agent is configured with the MCP server, you can test these commands:
Initialize KB (via MCP):
// Your agent should call:
kb_branch_ensure({ branch: "main" })
Query entities:
kb_query({ type: "req", branch: "main" })
Add an entity:
kb_upsert({
  entity: {
    id: "REQ-TEST-001",
    title: "Test Requirement",
    status: "open",
    created_at: "2026-02-18T00:00:00Z",
    updated_at: "2026-02-18T00:00:00Z",
    source: "agent-created"
  },
  branch: "main"
})
Current State of Kibi
✅ Ready to use:
- CLI commands (init, sync, query, check, gc, branch, doctor)
- MCP server with 6 tools
- VS Code extension (basic TreeView)
- Per-branch KB architecture
- Git hooks for auto-sync
⚠️ Known Issues (from F2 review):
- 8 test failures (non-blocking for manual testing)
- Some validation checks may not work perfectly yet
- kb.rdf persistence issue in certain scenarios
Quick Start (TL;DR)
cd /home/looted/projects/kibi
# 1. Init KB
bun run packages/cli/bin/kibi init --hooks
# 2. Configure your agent's MCP to point to:
#    /home/looted/projects/kibi/packages/mcp/bin/kibi-mcp
# 3. Install VS Code extension:
cd packages/vscode && npx @vscode/vsce package && code --install-extension *.vsix
# 4. Test MCP manually (optional):
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | bun run packages/mcp/bin/kibi-mcp
Do you want me to:
1. Run the init command now to set up .kb/ in this repo?
2. Help you configure your specific agent's MCP settings?
3. Create some sample entities to test with?