---
"kibi-cli": patch
---

Fix staged traceability check to correctly resolve symbol IDs from symbols.yaml manifests

The staged traceability check (`kibi check --staged`) was failing to resolve symbol IDs from symbols.yaml manifests because the manifest extractor only recognized the legacy `source` field, while the documented format uses `sourceFile`. This caused false-positive violations for symbols that were properly linked to requirements in the manifest.

Changes:
- Updated `extractFromManifest()` to recognize both `sourceFile` (preferred) and legacy `source` fields
- Added fallback logic: `sourceFile ?? source` for backward compatibility
- Added unit tests for sourceFile extraction, legacy source fallback, and field precedence

Fixes #98