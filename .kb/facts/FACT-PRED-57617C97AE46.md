---
title: 'Predicate: git_effective_hooks_path_policy(kibi_init_and_doctor,git_rev_parse_git_path_hooks,effective_git_hooks_directory,linked_worktree_and_subdirectory)'
status: active
text_ref: .kb/requirements/REQ-git-hook-effective-install.md
tags:
  - lane:ontology
  - predicate-suggestion
  - predicate:ontology
  - predicate:git
  - predicate:hooks
  - predicate:effective-path
fact_kind: predicate
predicate_name: git_effective_hooks_path_policy
predicate_args:
  - kibi_init_and_doctor
  - git_rev_parse_git_path_hooks
  - effective_git_hooks_directory
  - linked_worktree_and_subdirectory
canonical_key: git_effective_hooks_path_policy(kibi_init_and_doctor,git_rev_parse_git_path_hooks,effective_git_hooks_directory,linked_worktree_and_subdirectory)
polarity: assert
claim_key: CLAIM-7FBA2ADB25083C8E
claim_text: '`kibi init` and `kibi doctor` must resolve Git''s effective hooks directory with `git rev-parse --git-path hooks` and install or diagnose hooks there instead of assuming `.git/hooks` under the current directory. `kibi init` must succeed inside a linked worktree'
id: FACT-PRED-57617C97AE46
type: fact
---
