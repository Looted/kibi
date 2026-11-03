---
"kibi-core": patch
---

Migrating a legacy KB store now validates every migrated entity: an entity whose integer or number field held text that does not decode as a number used to skip validation and is now rejected like any other invalid entity. Requirement verification checks now read a `verification_perspective` fact as well as a `verification_scope` fact, where only the scope was read before. The KB module also drops an in-memory symbol coordinate index that nothing read, and a few other unused helpers.
