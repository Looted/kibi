---
title: Kibi workspace env files
status: active
fact_kind: subject
subject_key: kibi.env_bootstrap.workspace_files
tags:
  - lane:strict
  - env
  - security
origin:
  kind: agent
  recorded_at: '2026-11-16T20:32:50.121Z'
id: FACT-SUBJECT-kibi-env-workspace-files
type: fact
distinct_from:
  - kibi.env_bootstrap.files
---
The env files that come with a workspace checkout and that the Kibi env bootstrap reads before a command runs: the project file `<workspace>/.env.kibi` (or the file `KIBI_ENV_FILE` names) and the legacy `<workspace>/.env`. A cloned repository controls them. They are not the user env file `~/.config/kibi/env` (`$XDG_CONFIG_HOME/kibi/env`), which belongs to the person running Kibi, nor the process environment; those two are part of kibi.env_bootstrap but not of this subject.

It differs from kibi.env_bootstrap.files, which names the env file names Kibi uses (`.env.kibi` and `.env`) as configuration values; this subject is the files of a checkout as untrusted input and what they may set.
