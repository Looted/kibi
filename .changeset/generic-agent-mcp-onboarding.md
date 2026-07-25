---
"kibi-mcp": patch
---

Generic agents can now discover and load Kibi's bundled skills through a documented MCP-first flow, with a structured CLI fallback when MCP is unavailable. Skill tools also advertise that they are local, read-only, idempotent operations so compatible agent hosts can present safer tool affordances without treating those hints as authorization.

- Add host-neutral progressive-disclosure onboarding guidance to the agent and MCP references.
- Advertise MCP behavior annotations for `kb_skills_list`, `kb_skills_load`, and `kb_skills_read`.
