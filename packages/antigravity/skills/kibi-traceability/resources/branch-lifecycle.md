# Branch lifecycle

The exact Git ref is the branch identity. Hashed stores are rebuildable
artifacts, missing stores compile from this checkout, and Git remains the sole
merge/conflict authority. Explicitly migrate legacy literal stores; do not copy
another branch's compiled state.

