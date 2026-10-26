/-
 A model of packages/core/src/intervals.pl and the operations it decides.

 A constraint compares one variable with a value: `x op v`. intervals.pl
 folds every constraint on a variable into an interval (a lower bound, an
 upper bound, each open or closed, and a list of excluded points) and then
 asks whether the interval is non-empty; an integer variable folds into an
 integer range instead. This file defines the same folds over any type with
 the operations they use. Reals.lean and Integers.lean prove that the folds
 decide satisfiability exactly.
-/

namespace KibiIntervals

/-- The comparison operators intervals.pl accepts. -/
inductive Op where
  | eq | neq | lt | lte | gt | gte
  deriving DecidableEq, Repr, Inhabited

/-- `numeric_constraint_negation/2`. -/
def Op.negate : Op → Op
  | .eq => .neq
  | .neq => .eq
  | .lt => .gte
  | .gte => .lt
  | .lte => .gt
  | .gt => .lte

/-- The operations the folds compute with. `embed n` is the integer `n` as a
value, `floor v` and `ceil v` round a value to an integer. -/
class OrderOps (α : Type) where
  lt : α → α → Prop
  decLt : ∀ a b : α, Decidable (lt a b)
  decEq : DecidableEq α
  embed : Int → α
  floor : α → Int
  ceil : α → Int

namespace OrderOps

variable {α : Type} [OrderOps α]

instance instDecLt (a b : α) : Decidable (OrderOps.lt a b) := OrderOps.decLt a b
instance instDecEq : DecidableEq α := OrderOps.decEq

/-- `numeric_constraint_holds/3` with the variable's value on the left. -/
def holds : Op → α → α → Prop
  | .eq, x, v => x = v
  | .neq, x, v => x ≠ v
  | .lt, x, v => lt x v
  | .lte, x, v => lt x v ∨ x = v
  | .gt, x, v => lt v x
  | .gte, x, v => lt v x ∨ x = v

end OrderOps

open OrderOps

/-- Whether an interval end includes its value. -/
inductive Kind where
  | strict | closed
  deriving DecidableEq, Repr

/-- `tighter_kind/3`: two bounds at the same value keep the stricter one. -/
def Kind.tighter : Kind → Kind → Kind
  | .closed, .closed => .closed
  | _, _ => .strict

/-- `interval(Low, LowKind, High, HighKind, Excluded)`; `none` is an
unbounded end (`ninf`, `pinf`). -/
structure Interval (α : Type) where
  lo : Option (α × Kind)
  hi : Option (α × Kind)
  ex : List α

variable {α : Type} [OrderOps α]

/-- `raise_low/6`. -/
def raiseLow : Option (α × Kind) → α → Kind → Option (α × Kind)
  | none, v, k => some (v, k)
  | some (lo, lk), v, k =>
    if lt lo v then some (v, k)
    else if v = lo then some (lo, Kind.tighter lk k)
    else some (lo, lk)

/-- `lower_high/6`. -/
def lowerHigh : Option (α × Kind) → α → Kind → Option (α × Kind)
  | none, v, k => some (v, k)
  | some (hi, hk), v, k =>
    if lt v hi then some (v, k)
    else if v = hi then some (hi, Kind.tighter hk k)
    else some (hi, hk)

/-- `apply_bound/3`. -/
def applyBound (i : Interval α) : Op × α → Interval α
  | (.eq, v) => { i with lo := raiseLow i.lo v .closed, hi := lowerHigh i.hi v .closed }
  | (.neq, v) => { i with ex := v :: i.ex }
  | (.lt, v) => { i with hi := lowerHigh i.hi v .strict }
  | (.lte, v) => { i with hi := lowerHigh i.hi v .closed }
  | (.gt, v) => { i with lo := raiseLow i.lo v .strict }
  | (.gte, v) => { i with lo := raiseLow i.lo v .closed }

/-- `interval_non_empty/1`. -/
def Interval.nonEmpty : Interval α → Bool
  | ⟨none, _, _⟩ => true
  | ⟨_, none, _⟩ => true
  | ⟨some (lo, lk), some (hi, hk), ex⟩ =>
    decide (lt lo hi) ||
      (decide (lo = hi) && lk == .closed && hk == .closed && !(decide (lo ∈ ex)))

/-- `variable_feasible/2` for one real variable: fold every bound into the
unbounded interval and test it. -/
def realFeasible (cs : List (Op × α)) : Bool :=
  (cs.foldl applyBound ⟨none, none, []⟩).nonEmpty

/-- `ibox(Lo, Hi, Excluded)`, or `none` for `empty`. -/
structure Box where
  lo : Option Int
  hi : Option Int
  ex : List Int

def raiseLowInt : Option Int → Int → Option Int
  | none, b => some b
  | some lo, b => some (max lo b)

def lowerHighInt : Option Int → Int → Option Int
  | none, b => some b
  | some hi, b => some (min hi b)

/-- `integral_value/2`: the value is an integer. -/
def integral (v : α) : Bool := decide (embed (floor v) = v)

/-- `apply_integer_bound/3`. -/
def applyIntBound : Option Box → Op × α → Option Box
  | none, _ => none
  | some b, (.eq, v) =>
    if integral v then
      some { b with lo := raiseLowInt b.lo (floor v), hi := lowerHighInt b.hi (floor v) }
    else none
  | some b, (.neq, v) => if integral v then some { b with ex := floor v :: b.ex } else some b
  | some b, (.gt, v) => some { b with lo := raiseLowInt b.lo (floor v + 1) }
  | some b, (.gte, v) => some { b with lo := raiseLowInt b.lo (ceil v) }
  | some b, (.lt, v) => some { b with hi := lowerHighInt b.hi (ceil v - 1) }
  | some b, (.lte, v) => some { b with hi := lowerHighInt b.hi (floor v) }

/-- The list without repeats, as `sort/2` leaves it. -/
def dedup : List Int → List Int
  | [] => []
  | a :: t => if a ∈ dedup t then dedup t else a :: dedup t

/-- `integer_box_non_empty/1`: an unbounded range is non-empty; a bounded
one is non-empty when it holds more integers than it excludes. -/
def Box.nonEmpty : Option Box → Bool
  | none => false
  | some ⟨none, _, _⟩ => true
  | some ⟨_, none, _⟩ => true
  | some ⟨some lo, some hi, ex⟩ =>
    decide (lo ≤ hi) &&
      decide (((dedup (ex.filter fun v => decide (lo ≤ v ∧ v ≤ hi))).length : Int) < hi - lo + 1)

/-- `integer_variable_feasible/2`. -/
def intFeasible (cs : List (Op × α)) : Bool :=
  Box.nonEmpty (cs.foldl applyIntBound (some ⟨none, none, []⟩))

/-- A constraint on one of several variables, numbered. -/
structure Constraint (α : Type) where
  var : Nat
  op : Op
  value : α

/-- `numeric_constraints_satisfiable/2`: every variable is feasible on its
own constraints, as an integer when `isInt` says so. -/
def satisfiable (isInt : Nat → Bool) (cs : List (Constraint α)) : Bool :=
  (cs.map (·.var)).all fun x =>
    let own := (cs.filter (·.var == x)).map fun c => (c.op, c.value)
    if isInt x then intFeasible own else realFeasible own

/-- `numeric_constraint_entailed/3`: the premises plus the negated claim
are unsatisfiable. -/
def entailed (isInt : Nat → Bool) (premises : List (Constraint α)) (claim : Constraint α) : Bool :=
  !satisfiable isInt ({ claim with op := claim.op.negate } :: premises)

end KibiIntervals
