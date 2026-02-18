## Known Issues - Test Failures

### CRITICAL: relates_to Relationship Timeout
**Status**: Unresolved - Deep Prolog debugging required
**Symptom**: 30s query timeout when asserting `relates_to` relationships
**Impact**: Blocks sync idempotency test, prevents full test suite completion
**Error**: `Query timeout after 30s` in kb_assert_relationship
**Attempted Fix**: 10-minute ultrabrain investigation timed out
**Root Cause Hypotheses**:
1. Mutex deadlock in kb_assert_relationship
2. Infinite recursion in relationship validation
3. Missing relates_to schema definition
4. Expensive unbounded RDF query

**Recommendation**: Requires 1-2 hours of expert Prolog debugging with tools like trace/notrace

### MEDIUM: kb.rdf Path Mismatch
**Status**: Identified, not fixed
**Symptom**: kb.rdf created in `master` branch, test expects `main`
**Impact**: 1 test failure in sync.test.ts
**Root Cause**: Git default branch naming inconsistency
**Fix**: Ensure branch detection aligns with test expectations

### LOW: Query JSON Format
**Status**: Identified, not fixed  
**Symptom**: query command returns "No entities found" text instead of empty JSON array
**Impact**: 2 test failures in query.test.ts
**Root Cause**: query.ts returns plain text for empty results instead of JSON
**Fix**: Return `[]` when --format json and no results

### LOW: Init Idempotency
**Status**: Identified, not fixed (may be feature not bug)
**Symptom**: Init no longer throws when .kb/ exists, test expects throw
**Impact**: 2 test failures in init.test.ts
**Root Cause**: Init was made idempotent (intentional change), tests not updated
**Fix**: Either make init non-idempotent again, or update tests to expect success

## Test Status Summary
- **Prolog Core**: 9/9 passing (100%)
- **MCP Check**: 8/8 passing (100%)
- **Sync**: 3/5 passing (60%) - blocked by relates_to timeout
- **Overall**: ~158/162 estimated (97.5%) - unable to complete full run due to timeout

## Fixes Completed This Session
1. ✅ Prolog literal type handling (^^/2 functor) - commit 808036e
2. ✅ Prolog kb_save syntax error - commit 3b3074c
3. ✅ MCP check string mismatch - commit 51e5c80

## F3 Manual QA Blockers (REJECT Verdict)

### BLOCKER 1: Sync Hangs on Repeated Operations
**Status**: CRITICAL - Same as relates_to timeout issue above
**Symptom**: Prolog process hangs, spawns multiple swipl processes, requires kill -9
**Impact**: Blocks all branch workflow testing, prevents repeated sync operations
**Manual QA Pass Rate**: 3/7 branch workflow scenarios (blocked at scenario 4)
**Root Cause**: RDF transaction/locking issue, likely race condition or deadlock
**Recommendation**: Fix relates_to timeout issue, re-test branch workflows

### BLOCKER 2: Query Type "req" Returns Empty
**Status**: CRITICAL - New discovery from manual QA
**Symptom**: `kibi query req` returns "No entities found" despite successful import
**Impact**: Core requirements tracking completely broken
**Manual QA Evidence**: 
- Sync successfully imports 10 entities including req types
- `kibi query scenario` works (returns 2 entities)
- `kibi query test` works (returns 2 entities)
- `kibi query req` returns empty (expected 4+ entities)
**Root Cause**: Unknown - entity-type-specific query issue
**Recommendation**: Debug query.ts and kb.pl query predicates for req type

### BLOCKER 3: Performance 675x Slower Than Targets
**Status**: KNOWN LIMITATION - Expected for v0
**Symptom**: Query 1000 entities takes ~67.5s vs 100ms target (675x slower)
**Impact**: System unusable beyond trivial datasets
**Manual QA Measurements**:
- 100 entities: ~6.75s (includes setup overhead)
- Extrapolated 1000 entities: ~67.5s
- Target: < 100ms
**Root Cause**: Unoptimized v0 implementation (setup overhead dominates)
**Recommendation**: Defer to v0.1 - document as known limitation

### MAJOR ISSUE 4: Validation Not Enforced
**Status**: HIGH PRIORITY
**Symptom**: Accepts entities with missing required fields (no title, no source)
**Impact**: Data quality risk, KB corruption possible
**Recommendation**: Fix in v0.1 - add required field enforcement

### MAJOR ISSUE 5: CLI Lacks --branch Parameter
**Status**: MEDIUM PRIORITY
**Symptom**: MCP tools accept branch parameter, CLI commands don't
**Impact**: Feature parity gap, cannot test per-branch queries via CLI
**Recommendation**: Add --branch flag to query/check/sync commands in v0.1

### MAJOR ISSUE 6: Branch List Command Not Implemented
**Status**: MEDIUM PRIORITY  
**Symptom**: Documentation says `kibi branch --list`, command fails
**Impact**: User experience issue, documentation mismatch
**Recommendation**: Implement --list flag or update documentation

### MAJOR ISSUE 7: Incremental Sync Performance Regression
**Status**: MEDIUM PRIORITY
**Symptom**: Incremental sync (1 file changed) 2x slower than full 100-file sync
**Impact**: Performance regression, defeats purpose of incremental sync
**Measurement**: 11.70s incremental vs 5.93s full sync
**Root Cause**: No delta detection, always does full resync
**Recommendation**: Implement proper delta detection in v0.1

## Manual QA Summary
- **Automated Tests**: 97.5% pass (158/162 estimated)
- **Manual QA**: 64.6% pass (31/48 scenarios)
- **Integration Tests**: 40% pass (2/5 integrations)
- **F3 Verdict**: REJECT (3 critical blockers, 4 major issues)

## Conclusion
Kibi v0 has solid architectural foundation but fails under real-world usage:
- Basic happy-path scenarios work
- Repeated operations fail (sync hangs)
- Core use cases broken (req queries)
- Performance unacceptable for production scale

**v0 Status**: Functional prototype with known reliability issues
**Recommendation**: Document limitations, plan v0.1 for blocker resolution
