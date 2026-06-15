#!/usr/bin/env bash
# merge_pages.sh
# Run from the directory containing all *_output folders.
# For each *_output folder:
#   - Merges numbered page .txt files (e.g. Name-01..txt, Name-1..txt) in order
#     into a single combined file: Name.txt (placed inside the _output folder)
#   - Deletes the individual page .txt files
#   - Leaves everything else (PDFs, etc.) untouched

set -euo pipefail

shopt -s nullglob

BASE_DIR="$(pwd)"
MERGED_COUNT=0
SKIPPED_COUNT=0

for output_dir in "$BASE_DIR"/*.pdf_output; do
    [[ -d "$output_dir" ]] || continue

    dir_name="$(basename "$output_dir")"
    # Strip trailing .pdf_output to get the base document name
    base_name="${dir_name%.pdf_output}"

    # Collect page txt files: match Name-<digits>..txt pattern, sorted naturally
    mapfile -t page_files < <(
        find "$output_dir" -maxdepth 1 -name "${base_name}-*.txt" \
        | sort -V
    )

    if [[ ${#page_files[@]} -eq 0 ]]; then
        echo "  [SKIP] No page .txt files found in: $dir_name"
        ((SKIPPED_COUNT++)) || true
        continue
    fi

    combined_file="$output_dir/${base_name}.txt"

    echo "Processing: $dir_name"
    echo "  Found ${#page_files[@]} page file(s) → merging into: ${base_name}.txt"

    # Merge in sorted order, with a simple page separator
    {
        for page_file in "${page_files[@]}"; do
            page_label="$(basename "$page_file")"
            echo "===== $page_label ====="
            cat "$page_file"
            echo ""   # blank line between pages
        done
    } > "$combined_file"

    echo "  Merged successfully. Removing page files..."

    for page_file in "${page_files[@]}"; do
        rm "$page_file"
        echo "    Deleted: $(basename "$page_file")"
    done

    ((MERGED_COUNT++)) || true
    echo ""
done

echo "Done. Merged: $MERGED_COUNT folder(s), skipped: $SKIPPED_COUNT folder(s)."