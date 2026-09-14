---
"kibi-cli": minor
"kibi-core": minor
---

"Access denied or KB locked" finally says who is holding the lock and heals itself when the holder is dead. Kibi engines now record an ownership journal (pid, workspace, boot id, started-at) next to the branch-store lock while they are attached. When a later attach fails because the store is locked, the error carries the holder's identity, and — when the holder is provably dead (a crashed or killed engine, a `git worktree remove --force`, a reboot) — Kibi breaks the stale lock automatically, reports the takeover, and continues instead of wedging every later operation behind an opaque permission error. Live holders are surfaced by name with the exact remediation ("close that session, or run `kibi engine stop` for its workspace") instead of a generic message.

Engine daemons also stop outliving their workspace: a daemon whose workspace root disappears is now detected within thirty seconds and shuts down cleanly, releasing the store lock — the orphaned-daemon lock jam no longer requires manual `rdf/lock` cleanup.

Technical summary: `kb.pl` writes `.kibi-lock-owner.json` on attach (removes it on `kb_detach`) and throws `permission_error(attach, kb_store, …)` with a `kb_store_locked(OwnerJson, LockDir)` context when `rdf_attach_db` cannot take the lock; the CLI error decoder parses that context into a typed `storeLocked` record; the CLI runtime attach path consults a new lock-stewardship module (`prolog/store-lock.ts`) that classifies holders via `kill(pid,0)` plus a Linux boot-id check (defending against PID reuse across reboots) and breaks locks only for provably dead holders; `engine.ts` adds a workspace watchdog interval that shuts the daemon down when its workspace root vanishes.
