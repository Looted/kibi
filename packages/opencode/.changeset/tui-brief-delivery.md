---
"kibi-opencode": patch
---

Users now receive knowledge updates through a rich toast notification that automatically opens an interactive TUI brief view. When Kibi briefings are generated, users see a structured summary with "What changed" and "Why it matters" sections, plus conditional context about knowledge impacts and validation notes. Briefings can be viewed manually via the `kibi.brief` route or `kibi.open_latest_brief` command.

- Added toast-based briefing delivery with 8-second display duration
- Added `kibi.brief` TUI route for interactive brief viewing
- Added `kibi.open_latest_brief` SDK command for manual retrieval
- Added `SharedBriefPolicy` and `LocalBriefConfig` for delivery configuration
- Added `deliverBriefTui` and `announceBriefTui` functions for toast and announcement delivery
- Added announcement-only delivery path that publishes SDK commands without mutating read/seen state
