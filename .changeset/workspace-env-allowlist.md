---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
---

A workspace env file (`.env.kibi` or the legacy `.env`) can no longer set a process variable that makes Kibi's engine load code, such as `OPENSSL_CONF`, `_JAVA_OPTIONS` or `RUSTC_WRAPPER`. Outside the `KIBI_JEV_*` provider settings, a workspace file may now set only keys named like a provider secret or setting (ending in `_API_KEY`, `_KEY`, `_TOKEN`, `_SECRET`, `_PASSWORD`, `_MODEL`, `_ORG`, `_ORG_ID`, `_ORGANIZATION`, `_PROJECT`, `_PROJECT_ID` or `_REGION`); every other key is ignored. That includes provider endpoints such as `TYPESAFE_BASE_URL`, which would let a cloned repository receive the API key you keep in `~/.config/kibi/env`. Ignored Kibi and process keys are named on stderr without their values; a line that is not a plain variable name is only counted, a legacy `.env` no longer announces an application's own settings, and a quoted value may span lines, as a PEM key does. Set other variables in the process environment or `~/.config/kibi/env`.
