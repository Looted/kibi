# Lean proofs of the numeric decision procedure

`packages/core/src/intervals.pl` decides whether one-variable numeric
comparisons (`x op v` with `op` one of `eq`, `neq`, `lt`, `lte`, `gt`,
`gte`) are satisfiable, for real and for integer variables, and whether
premises entail a comparison. Kibi's numeric contradiction checks and the
`arithmetic` certificate kind rely on it. This Lean 4 project proves the
procedure exact.

| File | Contents |
| --- | --- |
| `KibiIntervals/Basic.lean` | The folds `intervals.pl` runs, over any type with the operations they use |
| `KibiIntervals/Reals.lean` | `realFeasible_iff`: the interval fold decides real satisfiability exactly, over any dense linear order without endpoints |
| `KibiIntervals/Integers.lean` | `intFeasible_iff`, `satisfiable_iff`, `entailed_iff`: the integer-range fold, many variables, entailment |
| `KibiIntervals/Rat.lean` | The rationals `Q` (fractions up to cross-multiplication) and the proof that they are a `DenseOrder` with an `IntEmbedding`, so the theorems hold for `Q` (`satisfiable_Q_iff`, `entailed_Q_iff`) |
| `Main.lean` | The executable model over `Q`, for the differential test |
| `CheckAxioms.lean` | Prints the axioms the main theorems use; CI fails on `sorryAx` |
| `differential/` | The Prolog drivers: `intervals_driver.pl` runs `intervals.pl`, `clp_oracle.pl` decides the same cases with CLP(Q) and CLP(FD) |

The model mirrors the Prolog clause by clause (`raiseLow` is `raise_low/6`,
`Box.nonEmpty` is `integer_box_non_empty/1`, and so on). The theorems assume
only a dense linear order without endpoints into which the integers embed
with a floor and a ceiling, which the rationals and the reals satisfy;
`Rat.lean` proves it for the rationals the executable computes with, so the
only step between the theorems and `intervals.pl` is the differential test.

## Running

```bash
cd proof/lean
lake build                       # checks every proof, builds the executable
lake env lean CheckAxioms.lean   # propext, Quot.sound, Classical.choice only
cd ../..
bun scripts/intervals-differential.ts \
  --lean proof/lean/.lake/build/bin/kibi-intervals \
  --oracle-swipl /usr/bin/swipl --cases 200000 [--seed N]
```

A fifth of the generated values are floats with an exact binary value
(`0.5`, `-1.25`), which `intervals.pl` reads as floats and compares with the
rationals and integers in the same case, as it does for facts.

The differential run needs the bundled SWI-Prolog as `swipl` on `PATH` and
an SWI-Prolog with `library(clpq)` for the oracle (the bundle does not ship
it; `apt-get install swi-prolog-nox` does). Without one the oracle is skipped
with a note and `intervals.pl` is compared with the Lean model alone; CI
passes `--require-oracle` (or sets `KIBI_REQUIRE_ORACLE=1`) so it never
skips. The toolchain version is in
`lean-toolchain`; install it with [elan](https://github.com/leanprover/elan)
and make it the default (`elan default "$(cat proof/lean/lean-toolchain)"`),
because `kibi prove` runs `lake --dir proof/lean` from the repository root.
