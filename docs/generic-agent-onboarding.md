# Generic-agent onboarding

This repository uses Kibi.

Initialize repository infrastructure with `kibi init`. Then ask the agent to
“Bootstrap Kibi for this repository.” The agent first inspects
`kb_status.bootstrap` and follows its typed `nextAction`, then routes the
request to `kibi-bootstrap`. That skill calls `kb_plan_bootstrap`; questions
come only from a `needs_context` result. It shows the hash-bound plan, obtains
approval, passes the unchanged plan to `kb_apply_plan`, and finishes with
`kb_check` and `kb_status`.

The stable onboarding contract is typed status plus the named workflow skill.
Skill manifests and resources are host plumbing for advanced integrations;
they are not a prerequisite for ordinary bootstrap requests.
Advanced hosts may use `kb_skills_list` and `kb_skills_load` to discover that
plumbing; ordinary onboarding follows typed status and the named skill.
For general Kibi work, load the bundled `kibi-usage` skill as the shared
source-first guidance.

Follow the loaded skill guidance and current operation schemas.
Do not treat a package `skills/` directory as implicitly loaded by the host.
Do not bypass Kibi's normal authorization or mutation safeguards.

Skills are bundled only. Remote install, marketplace install, and script execution are not supported.
