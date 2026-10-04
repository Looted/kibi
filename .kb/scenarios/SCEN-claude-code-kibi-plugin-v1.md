---
title: 'Claude Code Kibi Plugin v1: progressive-disclosure hook behaviors'
status: active
tags:
  - scenario
  - claude-code
  - plugin
  - hooks
id: SCEN-claude-code-kibi-plugin-v1
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# Claude Code Kibi Plugin v1: progressive-disclosure hook behaviors

## Knowledge snippet before a read or edit

- **Given** a workspace whose root owns `.kb/manifest.json`, and a source file whose symbols implement requirements in the symbol manifest
- **When** the agent first reads or edits that file in a Claude Code session
- **Then** the hook adds one snippet naming each linked requirement and its title, the implementing symbols, the covering tests, and the follow-up `kb_query` / intent-mode `kb_search` calls
- **And** an edit names the symbol the edit lands in
- **And** a second read of the same file, or a read of a file the agent already explored through Kibi, adds nothing

## Stop reminder for unchecked edits

- **Given** the agent edited source files during the session
- **When** the session stops before a `kb_check` covering those files
- **Then** the hook reminds the agent once, naming the files and the impact-check call
- **And** a host-prefixed MCP `kb_check` naming a file, a working-tree check, or a CLI `kibi check` acknowledges the edit

## Silence outside Kibi workspaces

- **Given** a workspace whose root does not own `.kb/manifest.json`
- **When** any hook event fires or the MCP endpoint lists tools
- **Then** hooks emit no output and write no state, and the MCP endpoint exposes no tools

## Advisory boundary

- **Given** any hook event in a Kibi workspace
- **When** the hook responds
- **Then** it never denies or rewrites a tool call, never invokes the Kibi CLI or engine, and never modifies workspace files
