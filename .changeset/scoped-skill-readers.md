---
"kibi-cli": patch
---

SkillOpt verification now reads canonical skill bundles from an explicitly authorized repository snapshot, and the public skill loader is split into focused modules with scoped readers. That stops locked source or isolated target checkouts from silently falling back to a different skill tree during review and adoption planning.

fix(cli): add scoped canonical skill bundle loaders
