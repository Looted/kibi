Created fixture files for entity types required by T5.

Files added under test/fixtures/:
- req-example.md
- scenario-example.md
- test-example.md
- adr-example.md
- flag-example.md
- event-example.md
- symbol-example.md
- symbols-manifest.yaml

Notes:
- Frontmatter keys match fields in packages/core/schema/entities.pl (id,title,status,created_at,updated_at,source).
- Included optional fields (tags,owner,priority,severity,links,text_ref) where appropriate.
- Manifest is valid YAML with a symbols array and one symbol entry.

Next steps: run extractor to validate parsing and add more complex fixtures if needed.

## [2026-02-17T17:29:51Z] Task: T2 (validation.pl + tests)
- validation.pl exports: validate_entity/2, validate_relationship/3, validate_property_type/3
- schema.plt contains 7 plunit tests covering entity types and relationships; all tests pass
- All tests pass with swipl -g "load_test_files([]),run_tests" -t halt packages/core/tests/schema.plt
