#!/bin/bash
set -e

# Kibi Test Runner - Container Entrypoint
# Handles test environment setup, TypeScript compilation, and dispatches to test suites

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

# Show environment info (verbose)
if [ "${E2E_LOG_LEVEL}" = "debug" ]; then
    echo "📁 Environment:"
    echo "  HOME: $HOME"
    echo "  PATH: $PATH"
    echo "  XDG_CONFIG_HOME: $XDG_CONFIG_HOME"
    echo "  XDG_DATA_HOME: $XDG_DATA_HOME"
    echo "  XDG_CACHE_HOME: $XDG_CACHE_HOME"
    echo "  TMPDIR: $TMPDIR"
    echo "  npm_config_cache: $npm_config_cache"
    echo ""
fi

# Verify tools are available (verbose)
if [ "${E2E_LOG_LEVEL}" = "debug" ]; then
    echo "🔍 Verifying toolchain:"
    echo -n "  SWI-Prolog: "
    swipl --version | head -1
    echo -n "  Node.js: "
    node --version
    echo -n "  npm: "
    npm --version
    echo -n "  Bun: "
    bun --version
    echo -n "  Git: "
    git --version | head -1
    echo ""
fi

# Compile TypeScript E2E tests
compile_e2e_tests() {
    local e2e_dir="/workspace/documentation/tests/e2e/packed"
    local dist_dir="$e2e_dir/dist"
    
    echo "🔨 Compiling TypeScript E2E tests..."
    
    # Clean previous compilation
    rm -rf "$dist_dir"
    mkdir -p "$dist_dir"
    
    # Compile TypeScript (skip type checking for tests - focus on runtime behavior)
    # Use transpile-only mode to ignore type errors
    cd /workspace
    npx tsc -p "$e2e_dir/tsconfig.e2e.json" --outDir "$dist_dir" --noEmitOnError false 2>&1 || true
    echo "  ✓ TypeScript compilation complete (type errors ignored)"
    echo ""
}

# Function to run E2E tests
run_e2e_tests() {
    local test_file="$1"
    local e2e_dir="/workspace/documentation/tests/e2e/packed"
    local dist_dir="$e2e_dir/dist"
    
    echo "🧪 Running E2E tests..."
    
    # Check if we're using baked assets (CI image) or need to build (dev bind-mount)
    if [ -n "$KIBI_E2E_PREFIX" ] && [ -f "$KIBI_E2E_PREFIX/bin/kibi" ]; then
        echo "✅ Using baked kibi installation from $KIBI_E2E_PREFIX"
        echo "   (Skipping bun install, build, and npm pack)"
    else
        # Dev bind-mount workflow: ensure dependencies are installed
        if [ ! -d "/workspace/node_modules" ] || [ -z "$(ls -A /workspace/node_modules 2>/dev/null)" ]; then
            echo "📦 Installing dependencies..."
            bun install
        fi
        
        # Build packages if needed
        if [ ! -f "/workspace/packages/cli/dist/cli.js" ]; then
            echo "🔨 Building packages..."
            bun run build
        fi
    fi
    
    # Compile TypeScript tests
    # Compile TypeScript tests
    compile_e2e_tests
    
    # Use baked tarballs if available, otherwise pack them
    if [ -n "$KIBI_TEST_TARBALLS" ] && [ -d "$KIBI_TEST_TARBALLS" ] && [ -n "$(ls -A $KIBI_TEST_TARBALLS/*.tgz 2>/dev/null)" ]; then
        echo "✅ Using baked tarballs from $KIBI_TEST_TARBALLS"
    else
        # Pre-pack packages to avoid npm execution issues in test environment
        echo "📦 Pre-packing packages..."
        mkdir -p /tmp/kibi-tarballs
        for pkg in core cli mcp; do
            pkg_dir="/workspace/packages/$pkg"
            tarball=$(cd "$pkg_dir" && /usr/bin/npm pack 2>/dev/null | tail -1)
            if [ -n "$tarball" ]; then
                mv "$pkg_dir/$tarball" "/tmp/kibi-tarballs/"
                echo "  ✓ Packed $pkg -> $tarball"
            fi
        done
        echo "  ✓ All packages pre-packed in /tmp/kibi-tarballs/"
        export KIBI_TEST_TARBALLS="/tmp/kibi-tarballs"
    fi
    
    # Enable source maps for better debugging
    export NODE_OPTIONS="--enable-source-maps"
    
    # Pass tarball location to tests via environment
    if [ -n "$test_file" ]; then
        # Convert .ts path to .js path in dist/
        local test_basename=$(basename "$test_file" .ts)
        echo "  File: $test_file (compiled: $test_basename.js)"
        node --test --test-concurrency=1 "$dist_dir/$test_basename.js"
    else
        echo "  Running all E2E tests..."
        node --test --test-concurrency=1 "$dist_dir"/*.test.js
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
        echo "  $0 e2e cli-workflows.test.ts     # Run specific E2E test"
        echo "  $0 integration                   # Run all integration tests"
        echo "  $0 integration mcp-crud.test.ts  # Run specific integration test"
        echo "  $0 unit                          # Run all unit tests"
        exit 1
        ;;
esac

echo ""
echo "✅ Test run completed successfully"
