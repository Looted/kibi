---
"kibi-vibe": patch
---

The Vibe hooks now find the file a tool touched when it names it by a path relative to the session folder, so the linked entities and the firm-requirement notice appear for those edits too, and `search_replace` edits are covered. The hooks no longer print the failing Kibi call's stderr into the session (set `KIBI_VIBE_LAUNCHER_DEBUG=1` to see it), and a long prompt still gets the rule note. On Windows, a `\\wsl.localhost` workspace whose distribution has no Node.js 22+ now fails with a message saying so instead of silently running Windows Node.js, and the nvm fallback of the Node.js probe works.

Technically: relative tool paths resolve against the payload `cwd` and the guard runs before the path gate; the post-tool matcher lists `search_replace`; drive-letter paths are converted with `wsl.exe --exec wslpath -a` (with `-d` for a named distribution) so no shell parses them; the Node.js probe is one constant script with sentinel-tagged result lines that runs the resolved node path for its version; the silent MCP server reports the package version. The `kibi-workspace.txt` pointer is documented as a single-project fallback; the launcher does not read MCP `roots/list`, because it starts `kibi-mcp` as a stdio child, but `kibi-mcp` itself routes each call to the Kibi workspace under the roots the client declares.
