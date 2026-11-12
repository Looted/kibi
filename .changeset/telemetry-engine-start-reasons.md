---
"kibi-agent-core": patch
"kibi-cli": patch
"kibi-mcp": patch
---

When the Kibi engine cannot start, anonymous telemetry now says why in a fixed word, so start failures can be told apart without sending any message text. Every `kibi sync` refusal now has its own error code, so a refusal you can act on (unresolved Git conflicts, a requirement that failed proposition-complete ingestion) is counted as a rejection and not as a Kibi failure.

- The engine daemon writes its start diagnostic as one JSON line: a fixed failure kind (the error's own code such as `swipl_not_found`, or `already_listening`, `store_locked`, `journal_unreadable`, `prolog_module_load_failed`, `branch_attach_failed`, `invalid_branch`, `daemon_error`) and the message. The client still accepts a plain-text diagnostic and raises `ENGINE_START_FAILED` with the same message as before, plus a `startFailure` property. A daemon that exits without a diagnostic reports `daemon_exited`, and an unreadable diagnostic reports `diagnostic_unreadable`. Telemetry sends this kind as `rejection_code`.
- `SyncError`s that had no code now have one: `GIT_CONFLICTS_UNRESOLVED`, `INVENTORY_INGESTION_FAILED`, `LEGACY_BRANCH_STORAGE`, `BRANCH_RESOLUTION_FAILED`, `ENGINE_SOCKET_UNREACHABLE`, `KB_SAVE_FAILED`, `STAGING_ATTACH_FAILED`, `STAGING_SAVE_FAILED`, `RELATIONSHIP_SHARD_CLEAR_FAILED`, `SYNC_CHECKPOINT_FAILED`, `SYNC_CACHE_KEY_INVALID`, `SNAPSHOT_COMPILE_REFUSED`, `RECOVERY_TARGET_MISSING` and `RECOVERY_BACKUP_EXISTS`. `git_conflicts_unresolved` and `inventory_ingestion_failed` count as rejections.
- The MCP error classifier recognizes a missing SWI-Prolog (`swipl_not_found`), a failed engine start (`engine_start_failed`) and an engine that never accepted connections (`engine_connect_timeout`) instead of reporting them as `handler_error`.
