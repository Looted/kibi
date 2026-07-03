---
"kibi-cli": patch
"kibi-mcp": patch
---

Agents and hook users now get clearer guidance when behavior-changing staged files are missing Kibi impact evidence. The staged check points to the staged-impact workflow, explains that MCP KB writes do not automatically stage tracked markdown or manifest evidence, and tells users which files to stage before rerunning the hook. MCP validation also catches invalid relationship shortcuts earlier, and bundled skill loading makes follow-up resources easier to discover.

Technical summary:

- Add Prolog-backed relationship tuple preflight to `kb_validate_upsert` when invoked through MCP.
- Improve invalid relationship and relationship-source mismatch guidance in MCP upsert flows.
- Include declared skill resources in `kb_skills_load` visible text and missing-resource errors.
- Update staged impact diagnostic docs and bundled Kibi usage resources for requirement-mediated behavior-fix evidence.
