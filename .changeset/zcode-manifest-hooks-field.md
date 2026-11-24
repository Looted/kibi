---
"kibi-zcode": patch
---

ZCode no longer reports an error for the Kibi plugin on every start, and the plugin's pre-edit hook no longer runs on `TodoWrite`. Both changes are invisible otherwise: the hooks behave as before for edits and Kibi calls.

The manifest no longer declares a `hooks` field. ZCode reads that field as the path of a hooks file, so naming the `hooks` directory in it raised `plugin_hook_read_failed` on every start, although the hooks load from the conventional `hooks/hooks.json`. REQ-zcode-plugin-package asked for the field and is superseded by REQ-zcode-plugin-package-v2, whose first sentence names the skills, commands and mcpServers fields; the other four sentences keep their facts and proofs. The `PreToolUse` matcher is anchored (`^(Edit|MultiEdit|Write|apply_patch|mcp__.*__kb_.*)$`), because ZCode tests it against the whole tool name and the unanchored `Write` alternative matched `TodoWrite`.
