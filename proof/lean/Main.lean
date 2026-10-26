import KibiIntervals

/-!
 The executable model, for differential testing against intervals.pl. It
 reads one case per line on standard input and prints `true` or `false` for
 each, computed by the same folds the proofs are about, over the rationals
 `Q` that `KibiIntervals/Rat.lean` proves satisfy the theorems' classes.

   S;<integer variables>;<constraints>          satisfiable
   E;<integer variables>;<premises>;<claim>     entailed

 Integer variables are comma-separated indexes; a constraint is
 `var:op:num/den` or `var:op:decimal` and constraints are comma-separated.
-/

open KibiIntervals

/-- `n / d` as a rational; `d` must not be zero. -/
def ratio (n d : Int) : Option Q :=
  if h : 0 < d then some (Q.ofFrac ⟨n, d, h⟩)
  else if h' : 0 < -d then some (Q.ofFrac ⟨-n, -d, h'⟩)
  else none

def parseOp : String → Option Op
  | "eq" => some .eq
  | "neq" => some .neq
  | "lt" => some .lt
  | "lte" => some .lte
  | "gt" => some .gt
  | "gte" => some .gte
  | _ => none

/-- A decimal such as `-1.25`, read exactly. -/
def parseDecimal (s : String) : Option Q :=
  let negative := s.startsWith "-"
  let body := if negative then s.drop 1 else s
  match body.splitOn "." with
  | [whole, fraction] => do
    let w ← whole.toNat?
    let f ← fraction.toNat?
    let scale := 10 ^ fraction.length
    let n : Int := (w * scale + f : Nat)
    ratio (if negative then -n else n) scale
  | _ => none

def parseQ (s : String) : Option Q :=
  match s.splitOn "/" with
  | [n] => if n.contains '.' then parseDecimal n else do
    let n ← n.toInt?; ratio n 1
  | [n, d] => do
    let n ← n.toInt?
    let d ← d.toInt?
    ratio n d
  | _ => none

def parseConstraint (s : String) : Option (Constraint Q) :=
  match s.splitOn ":" with
  | [v, op, value] => do
    let v ← v.toNat?
    let op ← parseOp op
    let value ← parseQ value
    pure ⟨v, op, value⟩
  | _ => none

def parseList (s : String) : Option (List (Constraint Q)) :=
  if s.isEmpty then some [] else (s.splitOn ",").mapM parseConstraint

def parseInts (s : String) : Option (List Nat) :=
  if s.isEmpty then some [] else (s.splitOn ",").mapM String.toNat?

def evalLine (line : String) : Option Bool :=
  match line.trim.splitOn ";" with
  | ["S", ints, cs] => do
    let ints ← parseInts ints
    let cs ← parseList cs
    pure (satisfiable (fun x => ints.contains x) cs)
  | ["E", ints, premises, claim] => do
    let ints ← parseInts ints
    let premises ← parseList premises
    let claim ← parseConstraint claim
    pure (entailed (fun x => ints.contains x) premises claim)
  | _ => none

def main : IO UInt32 := do
  let stdin ← IO.getStdin
  let stdout ← IO.getStdout
  let mut code : UInt32 := 0
  repeat
    let line ← stdin.getLine
    if line.isEmpty then break
    if line.trim.isEmpty then continue
    match evalLine line with
    | some b => stdout.putStrLn (if b then "true" else "false")
    | none =>
      IO.eprintln s!"cannot parse case: {line.trim}"
      code := 1
      break
  stdout.flush
  return code
