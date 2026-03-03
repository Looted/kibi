#!/bin/bash
set -e

# Kibi Test Runner - Container Entrypoint
# Handles test environment setup and dispatches to appropriate test suites

echo "🐳 Kibi Docker Test Runner"
echo "=========================="

# Validate TEST_RUN_ID is set
if [ -z "$TEST_RUN_ID" ]; then
    echo "❌ ERROR: TEST_RUN_ID environment variable must be set"
    exit 1
fi

echo "📋 Test Run ID: $TEST_RUN_ID"

# Setup isolated directories for this test run
echo "🔧 Setting up isolated environment..."

# Create directories
mkdir -p "$HOME"
mkdir -p "$XDG_CONFIG_HOME"
mkdir -p "$XDG_DATA_HOME"
mkdir -p "$XDG_CACHE_HOME"
mkdir -p "$TMPDIR"
mkdir -p "$npm_config_cache"

# Set permissions
chmod -R 755 "$HOME" 2>/dev/null || true
chmod -R 755 "$XDG_CONFIG_HOME" 2>/dev/null || true
chmod -R 755 "$XDG_DATA_HOME" 2>/dev/null || true
chmod -R 755 "$XDG_CACHE_HOME" 2>/dev/null || true
chmod -R 755 "$TMPDIR" 2>/dev/null || true
chmod -R 755 "$npm_config_cache" 2>/dev/null || true

# Configure git to not use global config
export GIT_CONFIG_GLOBAL=/dev/null
export GIT_CONFIG_SYSTEM=/dev/null

# Show environment info
echo "📁 Environment:"
echo "  HOME: $HOME"
echo "  XDG_CONFIG_HOME: $XDG_CONFIG_HOME"
echo "  XDG_DATA_HOME: $XDG_DATA_HOME"
echo "  XDG_CACHE_HOME: $XDG_CACHE_HOME"
echo "  TMPDIR: $TMPDIR"
echo "  npm_config_cache: $npm_config_cache"
echo ""

# Verify tools are available
echo "🔍 Verifying toolchain:"
echo -n "  SWI-Prolog: "
swipl --version | head -1
echo -n "  Node.js: "
node --version
echo -n "  Bun: "
bun --version
echo -n "  Git: "
git --version | head -1
echo ""

# Function to run E2E tests
run_e2e_tests() {
    local test_file="$1"
    
    echo "🧪 Running E2E tests..."
    
    # Ensure dependencies are installed (for dev bind-mount workflow)
    if [ ! -d "/workspace/node_modules" ] || [ -z "$(ls -A /workspace/node_modules 2>/dev/null)" ]; then
        echo "📦 Installing dependencies..."
        bun install
    fi
    
    # Build packages if needed (required for npm pack)
    if [ ! -f "/workspace/packages/cli/dist/cli.js" ]; then
        echo "🔨 Building packages..."
        bun run build
    fi
    
    if [ -n "$test_file" ]; then
        echo "  File: $test_file"
        node --test --test-concurrency=1 "$test_file"
    else
        echo "  Running all E2E tests..."
        node --test --test-concurrency=1 documentation/tests/e2e/packed/*.test.mjs
    fi
}

# Function to run integration tests
run_integration_tests() {
    local test_file="$1"
    
    echo "🧪 Running Integration tests..."
    
    # Ensure dependencies are installed (for dev bind-mount workflow)
    if [ ! -d "/workspace/node_modules" ] || [ -z "$(ls -A /workspace/node_modules 2>/dev/null)" ]; then
        echo "📦 Installing dependencies..."
        bun install
    fi
    
    # Build packages if needed
    if [ ! -f "/workspace/packages/cli/dist/cli.js" ]; then
        echo "🔨 Building packages..."
        bun run build:cli
        bun run build:mcp
    fi
    
    if [ -n "$test_file" ]; then
        echo "  File: $test_file"
        bun test "$test_file"
    else
        echo "  Running all integration tests..."
        bun test documentation/tests/integration/
    fi
}

# Function to run unit tests
run_unit_tests() {
    echo "🧪 Running Unit tests..."
    bun test packages/
}

# Main dispatch
SUITE="${1:-}"
TEST_FILE="${2:-}"

case "$SUITE" in
    e2e)
        run_e2e_tests "$TEST_FILE"
        ;;
    integration)
        run_integration_tests "$TEST_FILE"
        ;;
    unit)
        run_unit_tests
        ;;
    *)
        echo "Usage: $0 [e2e|integration|unit] [test-file]"
        echo ""
        echo "Examples:"
        echo "  $0 e2e                           # Run all E2E tests"
        echo "  $0 e2e documentation/tests/e2e/packed/mcp.test.mjs"
        echo "  $0 integration                   # Run all integration tests"
        echo "  $0 integration documentation/tests/integration/mcp-crud.test.ts"
        echo "  $0 unit                          # Run all unit tests"
        exit 1
        ;;
esac

echo ""
echo "✅ Test run completed successfully"
