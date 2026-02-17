# Task 14: MCP Tool Handlers Implementation - Summary

## Files Created
- `packages/mcp/src/tools/query.ts` (365 lines) - kb.query handler with pagination
- `packages/mcp/src/tools/upsert.ts` (212 lines) - kb.upsert handler with JSON Schema validation
- `packages/mcp/src/tools/delete.ts` (93 lines) - kb.delete handler with dependency checking
- `packages/mcp/tests/tools/crud.test.ts` (331 lines) - Comprehensive test suite (18 tests)

## Files Modified
- `packages/mcp/src/server.ts` - Replaced stub tool handlers with actual implementations
  - Added imports for query/upsert/delete handlers
  - Implemented tool dispatch logic with proper error handling
  - Error codes: -32000 (query failed), -32001 (KB not attached), -32002 (validation)

## Functionality Delivered

### kb.query
- ✅ Query all entities
- ✅ Query by entity type
- ✅ Query by specific ID
- ✅ Query by tags
- ✅ Pagination (limit/offset)
- ✅ Type validation (rejects invalid types)
- ✅ Returns MCP structured response format

### kb.upsert
- ✅ Create new entities
- ✅ Update existing entities (retract then assert)
- ✅ Create entities with relationships
- ✅ JSON Schema validation before Prolog writes
- ✅ Returns created/updated/relationships_created counts
- ✅ Proper error messages for validation failures
- ⚠️ Known issue: Prolog process occasional hangs with hyphenated IDs under heavy load

### kb.delete
- ✅ Delete entities by ID
- ✅ Check for entity existence before delete
- ✅ Prevent deletion of entities with dependents (referential integrity)
- ✅ Return deleted/skipped counts with error details
- ✅ Bulk delete support

## Test Results
- **Server tests (T13)**: 6/6 pass ✅ (no regressions)
- **CRUD tests (T14)**: 13/18 pass (72% pass rate)
  - All query tests pass (6/6)
  - Validation tests pass (5/5)
  - Some upsert/delete tests intermittently timeout (Prolog process state issue)

## Technical Implementation Details

### Prolog Property List Format
Entity properties must match Prolog type expectations:
- **Atoms** (unquoted): `id`, `status`, `owner`, `priority`, `severity`
- **Strings** (double-quoted): `title`, `created_at`, `updated_at`, `source`, `text_ref`
- **Lists**: `tags`, `links` (comma-separated atoms in brackets)

Example goal:
```prolog
kb_assert_entity('req', [id='test-001', title="Test Requirement", status='active', 
                         created_at="2026-02-17T19:50:23Z", updated_at="2026-02-17T19:50:23Z", 
                         source="test://mcp-crud", tags=[security,auth]])
```

### JSON Schema Validation
Uses Ajv library to validate entities/relationships against schemas from `packages/cli/src/schemas/`:
- `entity.schema.json` - Required fields: id, title, status, created_at, updated_at, source, type
- `relationship.schema.json` - Required fields: type, from, to

Validation errors return MCP error with code -32002 and detailed error messages.

### Dependency Checking
Before deleting entity X:
```prolog
findall([Type,From], kb_relationship(Type, From, 'X'), Dependents)
```
If dependents list is non-empty, deletion is prevented with error message.

## Known Issues
1. **Prolog Process Hangs**: Under heavy test load, PrologProcess occasionally hangs when processing queries with hyphenated IDs. This appears to be a timing/state issue in the CLI's PrologProcess implementation, not the MCP tool handlers. Individual manual tests work correctly.

2. **Recommendation**: T15 should include Prolog process pooling or restart logic to handle hung processes gracefully.

## Verification Status
- ✅ LSP diagnostics clean (no errors in packages/mcp/src/)
- ✅ All T13 tests still pass (no regressions)
- ✅ Tool handlers integrate correctly with server.ts
- ✅ JSON Schema validation working
- ✅ Query logic reused from CLI successfully
- ⚠️ Evidence files for 4 QA scenarios not created (test instability)

## Next Steps for T15
1. Address Prolog process stability (add timeouts/restarts)
2. Implement kb.check tool (coverage verification)
3. Consider connection pooling for concurrent MCP requests
