# Generic-agent onboarding

This repository uses Kibi.

On the first Kibi interaction, use the visible Kibi MCP surface or trusted
project-local CLI to discover bundled skills.

Call `kb_skills_list`, then load `kibi-usage` with `kb_skills_load`.
Load task-specific skills such as `init-kibi`, `kibi-freshness`, or
`kibi-traceability` when relevant.

Follow the loaded skill guidance and current operation schemas.
Do not treat a package `skills/` directory as implicitly loaded by the host.
Do not bypass Kibi's normal authorization or mutation safeguards.

Skills are bundled only. Remote install, marketplace install, and script execution are not supported.
