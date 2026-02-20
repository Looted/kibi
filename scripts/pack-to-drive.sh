#!/bin/bash
set -e
set -o pipefail


# --- CONFIGURATION ---
DEST_DIR="/mnt/g/Mój dysk/kibi"


# If drive not mounted (and not forcing local), try to verify or fallback
if [ ! -d "$DEST_DIR" ]; then
    echo "⚠️  Destination directory '$DEST_DIR' not found."
    echo "   Checking if we can dump locally for verification..."
    DEST_DIR="./dump_output"
    mkdir -p "$DEST_DIR"
    DEST_DIR="$(cd "$DEST_DIR" && pwd)"
    echo "   -> Using local dir: $DEST_DIR"
else
    echo "   -> Using drive dir: $DEST_DIR"
fi


TEMP_WORK_DIR=$(mktemp -d) # Creates a safe temporary directory
CHUNK_SIZE_LIMIT=$((80 * 1024)) # 80KB target
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PACK_LAST_UPDATED="$(TZ=Europe/Warsaw date +"%Y-%m-%d %H:%M %Z")"
PACK_COMMIT="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "unknown")"


# Helper function for cross-platform file size
filesize() {
    stat -c%s "$1" 2>/dev/null || stat -f%z "$1"
}


# Cleanup on exit
trap 'rm -rf "$TEMP_WORK_DIR"' EXIT


echo "----------------------------------------"
# 1. Copy project to temporary workspace
echo "📋 Copying files to workspace..."
if command -v rsync &> /dev/null; then
    rsync -a \
        --exclude 'node_modules' \
        --exclude '.git' \
        --exclude 'dist' \
        --exclude 'coverage' \
        --exclude 'dump_output' \
        --exclude '.kb' \
        --exclude '.kb-check-rel-debug' \
        --exclude '.sisyphus' \
        --exclude 'playwright-report' \
        --exclude 'test-results' \
        --exclude '.env*' \
        --exclude 'secrets/' \
        --exclude '*.key' \
        --exclude '*.pem' \
        --exclude '*.p12' \
        --exclude '.secrets*' \
        --exclude 'Dockerfile' \
        --exclude 'scripts/' \
        --exclude '.github/' \
        . "$TEMP_WORK_DIR"
else
    echo "⚠️  rsync not found. Using cp (slower)..."
    cp -r . "$TEMP_WORK_DIR"
fi


# 2. Modify files in temporary workspace


# Inject AI Instructions (Prepend to README)
AI_INSTRUCTIONS="# AI CONTEXT INSTRUCTIONS
> NOTE: This is an optimized repository dump suitable for LLM Context Window.
> It is split into multiple semantic feature packs.
>
> **Navigation:**
> - [AI_INDEX.md](file:AI_INDEX.md) - Master Index of all packs
> - Follow [NEXT PART] / [PREV PART] links at the bottom/top of each file.
>
> **Pack Structure:**
> 1.  **00-context**: Config & High-level docs (adr, requirements, scenarios).
> 2.  **01-logic**: Core packages.
> 3.  **02-tests**: Unit and integration tests.
>
---
"
if [ -f "$TEMP_WORK_DIR/README.md" ]; then
    echo -e "$AI_INSTRUCTIONS$(cat "$TEMP_WORK_DIR/README.md")" > "$TEMP_WORK_DIR/README.md"
else
    echo -e "$AI_INSTRUCTIONS" > "$TEMP_WORK_DIR/README.md"
fi


# 3. Packing Logic


# Usage: pack_slice "PREFIX" "SEARCH_BASE_DIR" [FIND_ARGS_ARRAY_NAME] [EXCLUDE_SPECS_BOOL]
pack_slice() {
    PREFIX=$1
    SEARCH_BASE=$2
    # Arguments passed by name reference for safety
    local -n ARGS_REF=$3
    EXCLUDE_SPECS="${4:-true}"


    echo "📦 Packing Slice: $PREFIX (Base: $SEARCH_BASE)..."


    pushd "$TEMP_WORK_DIR" > /dev/null


    CURRENT_SIZE=0
    CURRENT_FILES=()
    BATCH_INDEX=1


    process_batch() {
        if [ ${#CURRENT_FILES[@]} -eq 0 ]; then return; fi


        # Suffix logic
        OUTPUT_NAME="${PREFIX}-${BATCH_INDEX}.md"


        printf "%s\n" "${CURRENT_FILES[@]}" | \
        npx repomix@latest --stdin --style markdown --output "$OUTPUT_NAME" --no-security-check --quiet


        # Add Header
        echo -e "# Pack: $PREFIX (Part $BATCH_INDEX)\n\n" > "$OUTPUT_NAME.tmp"
        cat "$OUTPUT_NAME" >> "$OUTPUT_NAME.tmp"
        mv "$OUTPUT_NAME.tmp" "$OUTPUT_NAME"


        CURRENT_FILES=()
        CURRENT_SIZE=0
        ((BATCH_INDEX++))
    }


    if [ ! -d "$SEARCH_BASE" ]; then
         echo "   -> Skipping, dir '$SEARCH_BASE' not found."
         popd > /dev/null
         return
    fi


    CMD=("find" "$SEARCH_BASE" "-type" "f")


    if [ "$EXCLUDE_SPECS" = "true" ]; then
        CMD+=("-not" "-name" "*.spec.ts" "-not" "-name" "*.test.ts" "-not" "-name" "test.ts")
    fi


    CMD+=("${ARGS_REF[@]}")
    CMD+=("-print0")


    while IFS= read -r -d '' file; do
        SIZE=$(filesize "$file")


        if (( CURRENT_SIZE + SIZE > CHUNK_SIZE_LIMIT )) && [ ${#CURRENT_FILES[@]} -gt 0 ]; then
            process_batch
        fi


        CURRENT_FILES+=("$file")
        CURRENT_SIZE=$((CURRENT_SIZE + SIZE))
    done < <("${CMD[@]}" | sort -z)


    process_batch
    popd > /dev/null
}


# --- PREPARE PACKS ---


# 00: Context
echo "📦 Packing Slice: kibi-00-context..."
pushd "$TEMP_WORK_DIR" > /dev/null
npx repomix@latest --style markdown --output "kibi-00-context-1.md" \
    --include "README.md,package.json,tsconfig.json,biome.json,adr/**,requirements/**,scenarios/**,docs/**,brief.md,KNOWN_LIMITATIONS.md,CONTRIBUTING.md" \
    --no-security-check --quiet
popd > /dev/null


# 01: Logic
LOGIC_ARGS=(
    "("
    "-path" "./packages/*"
    "-o" "-path" "./events/*"
    "-o" "-path" "./flags/*"
    ")"
)
pack_slice "kibi-01-logic" "." LOGIC_ARGS true


# 02: Tests
TESTS_ARGS=(
    "("
    "-name" "*.spec.ts"
    "-o" "-name" "*.test.ts"
    "-o" "-path" "./test/*"
    "-o" "-path" "./tests/*"
    ")"
)
pack_slice "kibi-02-tests" "." TESTS_ARGS false


# 4. Linking and Redaction
echo "🔒 Redacting secrets in generated files..."
patterns=(
    "NG_APP_SUPABASE_URL=http[^ ]*"
    "NG_APP_SUPABASE_ANON_KEY=ey[^ ]*"
    "password=[^ ]*"
    "token=[^ ]*"
    "secret=[^ ]*"
)


redact_file() {
    local target="$1"
    if [ -f "$target" ]; then
        for pattern in "${patterns[@]}"; do
            key=$(echo "$pattern" | cut -d'=' -f1)
            sed -i "s|$key=[^ ]*|$key=[REDACTED]|g" "$target"
        done
    fi
}


for file in "$TEMP_WORK_DIR"/kibi-*.md "$TEMP_WORK_DIR"/AI_INDEX.md; do
    redact_file "$file"
done


echo "   ✅ Redaction complete."


echo ""
echo "🔗 Linking and Indexing files..."


mapfile -t FILE_ARRAY < <(find "$TEMP_WORK_DIR" -maxdepth 1 -name "kibi-*.md" -print | sort -V)
COUNT=${#FILE_ARRAY[@]}


INDEX_FILE="$TEMP_WORK_DIR/AI_INDEX.md"
{
    echo "LAST_UPDATED: ${PACK_LAST_UPDATED}"
    echo "COMMIT: ${PACK_COMMIT}"
    echo ""
    echo "# AI INDEX - Kibi Codebase"
    echo "> Generated on $(date)"
    echo ""
    echo "## Pack Manifest"
} > "$INDEX_FILE"


for (( i=0; i<$COUNT; i++ )); do
    CURRENT_FILE="${FILE_ARRAY[$i]}"
    BASENAME=$(basename "$CURRENT_FILE")
    echo "- [$BASENAME](file:$BASENAME)" >> "$INDEX_FILE"


    if [ $i -gt 0 ]; then
        PREV_FILE="${FILE_ARRAY[$((i - 1))]}"
        PREV_BASENAME=$(basename "$PREV_FILE")
        echo -e "\n\n---\n\n#### 🔙 PREVIOUS PART: [$PREV_BASENAME](file:$PREV_BASENAME)" >> "$CURRENT_FILE"
    fi


    if [ $((i + 1)) -lt $COUNT ]; then
        NEXT_FILE="${FILE_ARRAY[$((i + 1))]}"
        NEXT_BASENAME=$(basename "$NEXT_FILE")
        echo -e "\n#### ⏭️ NEXT PART: [$NEXT_BASENAME](file:$NEXT_BASENAME)" >> "$CURRENT_FILE"
        echo -e "\n> _End of Part $((i + 1))_" >> "$CURRENT_FILE"
    else
        echo -e "\n\n---\n\n# ✅ END OF ARCHIVE" >> "$CURRENT_FILE"
    fi
done


cp "$INDEX_FILE" "$DEST_DIR/AI_INDEX.md"
for file in "${FILE_ARRAY[@]}"; do
    cp "$file" "$DEST_DIR/"
done


# --- SINGLE LITE FILE ---
echo "📦 Creating single lite file..."
LITE_TEMP_DIR=$(mktemp -d)
# Update trap to include lite temp dir
trap 'rm -rf "$TEMP_WORK_DIR" "$LITE_TEMP_DIR"' EXIT


rsync -a \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'dist' \
    --exclude 'coverage' \
    --exclude 'dump_output' \
    --exclude '.kb' \
    --exclude '.kb-check-rel-debug' \
    --exclude '.sisyphus' \
    --exclude 'playwright-report' \
    --exclude 'test-results' \
    --exclude '*.spec.ts' \
    --exclude '*.test.ts' \
    --exclude 'test/' \
    --exclude 'tests/' \
    --exclude '*.png' \
    --exclude '*.ico' \
    --exclude '*.jpg' \
    --exclude '*.jpeg' \
    --exclude '*.gif' \
    --exclude '.env*' \
    --exclude 'secrets/' \
    --exclude '*.key' \
    --exclude '*.pem' \
    --exclude '*.p12' \
    --exclude '.secrets*' \
    --exclude 'Dockerfile' \
    --exclude 'scripts/' \
    --exclude '.github/' \
    . "$LITE_TEMP_DIR"


pushd "$LITE_TEMP_DIR" > /dev/null
npx repomix@latest --style markdown --output "kibi-complete-lite.md" \
    --no-security-check --quiet


LITE_HEADER="LAST_UPDATED: ${PACK_LAST_UPDATED}
COMMIT: ${PACK_COMMIT}


# Kibi Complete Lite
> Single-file repository dump optimized for LLM context windows.
> Generated on $(date)
---


"
echo -e "$LITE_HEADER$(cat kibi-complete-lite.md)" > kibi-complete-lite.md
cp kibi-complete-lite.md "$DEST_DIR/"
LITE_SIZE=$(filesize kibi-complete-lite.md)
popd > /dev/null


echo "   -> Lite file size: $((LITE_SIZE / 1024)) KB"
echo "----------------------------------------"
echo "✨ Packing complete!"
echo "📂 Output Directory: $DEST_DIR"
