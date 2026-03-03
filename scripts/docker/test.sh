#!/bin/bash
set -e

# Kibi Docker Test Runner - Host Orchestrator
# Runs E2E and integration tests in isolated Docker containers

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker/compose.test.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
SUITE=""
TEST_FILE=""
PATTERN=""
PARALLEL=1
CLEAN=false
VERBOSE=false
CI_MODE=false

# Help message
show_help() {
    cat << EOF
Kibi Docker Test Runner

Usage: $0 [OPTIONS] [SUITE] [TEST_FILE]

Arguments:
  SUITE         Test suite to run: e2e, integration, or unit
  TEST_FILE     Specific test file to run (optional)

Options:
  -p, --parallel N      Run N tests in parallel (default: 1)
  -f, --file FILE       Run specific test file
  -p, --pattern PATTERN Glob pattern for test files
  -c, --clean           Clean up volumes and containers before running
  -v, --verbose         Verbose output
  --ci                  Use CI mode (copy-in instead of bind-mount)
  -h, --help            Show this help message

Examples:
  $0 e2e                                    # Run all E2E tests
  $0 e2e documentation/tests/e2e/packed/mcp.test.mjs
  $0 integration                            # Run all integration tests
  $0 integration -f init-sync-check.test.ts
  $0 e2e --parallel 3                       # Run 3 E2E tests in parallel
  $0 --clean e2e                            # Clean first, then run

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--parallel)
            PARALLEL="$2"
            shift 2
            ;;
        -f|--file)
            TEST_FILE="$2"
            shift 2
            ;;
        --pattern)
            PATTERN="$2"
            shift 2
            ;;
        -c|--clean)
            CLEAN=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --ci)
            CI_MODE=true
            shift
            ;;
        e2e|integration|unit)
            SUITE="$1"
            shift
            ;;
        *.test.mjs|*.test.ts|*.spec.ts)
            TEST_FILE="$1"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate suite
if [ -z "$SUITE" ]; then
    echo -e "${RED}❌ Error: Test suite required (e2e, integration, or unit)${NC}"
    show_help
    exit 1
fi

# Docker compose service name
if [ "$CI_MODE" = true ]; then
    SERVICE="test-ci"
else
    SERVICE="test"
fi

# Verbose logging
log() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[docker-test]${NC} $1"
    fi
}

# Clean up function
cleanup() {
    if [ "$CLEAN" = true ]; then
        echo -e "${YELLOW}🧹 Cleaning up...${NC}"
        docker compose -f "$COMPOSE_FILE" down -v --remove-orphans 2>/dev/null || true
        docker volume rm kibi_node_modules kibi_bun_cache 2>/dev/null || true
    fi
}

# Run cleanup if requested
if [ "$CLEAN" = true ]; then
    cleanup
fi

# Build image if needed
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker compose -f "$COMPOSE_FILE" build "$SERVICE"

# Function to run a single test file
run_test_file() {
    local file="$1"
    local run_id="run-$(date +%s)-$RANDOM"
    
    log "Running: $file (ID: $run_id)"
    
    # Create unique environment for this run
    local env_vars="-e TEST_RUN_ID=$run_id"
    
    # Run the test
    if docker compose -f "$COMPOSE_FILE" run --rm \
        $env_vars \
        "$SERVICE" \
        "$SUITE" \
        "$file"; then
        echo -e "${GREEN}✅ PASS:${NC} $file"
        return 0
    else
        echo -e "${RED}❌ FAIL:${NC} $file"
        return 1
    fi
}

# Get list of test files
echo -e "${BLUE}📋 Discovering test files...${NC}"

TEST_FILES=()

if [ -n "$TEST_FILE" ]; then
    # Single file specified
    if [ -f "$REPO_ROOT/$TEST_FILE" ]; then
        TEST_FILES=("$TEST_FILE")
    else
        echo -e "${RED}❌ Error: Test file not found: $TEST_FILE${NC}"
        exit 1
    fi
else
    # Discover test files based on suite
    case "$SUITE" in
        e2e)
            if [ -n "$PATTERN" ]; then
                mapfile -t TEST_FILES < <(find "$REPO_ROOT/documentation/tests/e2e/packed" -name "$PATTERN" -type f 2>/dev/null | sed "s|$REPO_ROOT/||")
            else
                mapfile -t TEST_FILES < <(find "$REPO_ROOT/documentation/tests/e2e/packed" -name "*.test.mjs" -type f 2>/dev/null | sed "s|$REPO_ROOT/||")
            fi
            ;;
        integration)
            if [ -n "$PATTERN" ]; then
                mapfile -t TEST_FILES < <(find "$REPO_ROOT/documentation/tests/integration" -name "$PATTERN" -type f 2>/dev/null | sed "s|$REPO_ROOT/||")
            else
                mapfile -t TEST_FILES < <(find "$REPO_ROOT/documentation/tests/integration" -name "*.test.ts" -type f 2>/dev/null | sed "s|$REPO_ROOT/||")
            fi
            ;;
        unit)
            echo -e "${YELLOW}⚠️  Unit tests should be run directly with 'bun test'${NC}"
            echo "Running in Docker anyway..."
            mapfile -t TEST_FILES < <(find "$REPO_ROOT/packages" -name "*.test.ts" -type f 2>/dev/null | sed "s|$REPO_ROOT/||")
            ;;
    esac
fi

if [ ${#TEST_FILES[@]} -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No test files found${NC}"
    exit 0
fi

echo -e "${BLUE}📝 Found ${#TEST_FILES[@]} test file(s):${NC}"
for f in "${TEST_FILES[@]}"; do
    echo "  - $f"
done
echo ""

# Run tests
FAILED=0
PASSED=0

if [ "$PARALLEL" -gt 1 ] && [ ${#TEST_FILES[@]} -gt 1 ]; then
    echo -e "${BLUE}🚀 Running tests in parallel (max $PARALLEL)...${NC}"
    
    # Export function for parallel execution
    export -f run_test_file
    export SUITE SERVICE COMPOSE_FILE VERBOSE RED GREEN NC BLUE
    
    # Use parallel or xargs for parallel execution
    if command -v parallel > /dev/null 2>&1; then
        # GNU parallel available
        for file in "${TEST_FILES[@]}"; do
            echo "$file"
        done | parallel --jobs "$PARALLEL" --line-buffer run_test_file {}
    else
        # Fallback to xargs
        printf '%s\n' "${TEST_FILES[@]}" | xargs -P "$PARALLEL" -I {} bash -c 'run_test_file "$@"' _ {}
    fi
    
    # Count results (simplified - actual implementation would track exit codes)
    echo -e "${GREEN}✅ Parallel execution completed${NC}"
else
    echo -e "${BLUE}🚀 Running tests sequentially...${NC}"
    # Don't exit on error in loop - we want to run all tests
    set +e
    for file in "${TEST_FILES[@]}"; do
        if run_test_file "$file"; then
            ((PASSED++))
        else
            ((FAILED++))
        fi
    done
    set -e
fi

echo ""
echo "========================="
echo -e "${BLUE}📊 Test Summary${NC}"
echo "========================="
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${RED}❌ Failed: $FAILED${NC}"
echo "========================="

if [ $FAILED -gt 0 ]; then
    exit 1
else
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
fi
