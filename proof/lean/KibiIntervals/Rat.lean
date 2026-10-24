import KibiIntervals.Reals
import KibiIntervals.Integers

set_option linter.unusedSectionVars false

/-!
 The exact rationals the executable model computes with, and the proof that
 they satisfy the classes the theorems assume: `DenseOrder Q` and
 `IntEmbedding Q`. So `satisfiable_iff` and `entailed_iff` hold for the very
 type the differential test runs, with no unproven link between the theorems
 and the executable.

 A rational is a fraction with a positive denominator, up to the equivalence
 `a/b = c/d ↔ a*d = c*b`; equality is the quotient's, so it is decidable and
 numeric, and no normal form is needed.
-/

namespace KibiIntervals

/-- A fraction with a positive denominator. -/
structure Frac where
  num : Int
  den : Int
  pos : 0 < den

namespace Frac

/-- Two fractions name the same rational. -/
def Equiv (a b : Frac) : Prop := a.num * b.den = b.num * a.den

theorem den_ne (a : Frac) : a.den ≠ 0 := Int.ne_of_gt a.pos

theorem equiv_trans {a b c : Frac} (h₁ : Equiv a b) (h₂ : Equiv b c) : Equiv a c := by
  unfold Equiv at *
  apply Int.eq_of_mul_eq_mul_right (den_ne b)
  calc a.num * c.den * b.den = (a.num * b.den) * c.den := by ac_rfl
    _ = (b.num * a.den) * c.den := by rw [h₁]
    _ = (b.num * c.den) * a.den := by ac_rfl
    _ = (c.num * b.den) * a.den := by rw [h₂]
    _ = c.num * a.den * b.den := by ac_rfl

instance setoid : Setoid Frac where
  r := Equiv
  iseqv := ⟨fun _ => rfl, fun h => h.symm, equiv_trans⟩

/-- The strict order on fractions: cross-multiplied, as the denominators are positive. -/
def Lt (a b : Frac) : Prop := a.num * b.den < b.num * a.den

theorem lt_of_equiv {a b a' b' : Frac} (ha : Equiv a a') (hb : Equiv b b') (h : Lt a b) :
    Lt a' b' := by
  unfold Equiv Lt at *
  have hpos : 0 < a.den * b.den := Int.mul_pos a.pos b.pos
  have h' := Int.mul_lt_mul_of_pos_right h (Int.mul_pos a'.pos b'.pos)
  apply Int.lt_of_mul_lt_mul_right (a := a.den * b.den) _ (Int.le_of_lt hpos)
  calc a'.num * b'.den * (a.den * b.den) = (a.num * a'.den) * (b.den * b'.den) := by
          rw [ha]; ac_rfl
    _ = a.num * b.den * (a'.den * b'.den) := by ac_rfl
    _ < b.num * a.den * (a'.den * b'.den) := h'
    _ = (b.num * b'.den) * (a.den * a'.den) := by ac_rfl
    _ = b'.num * a'.den * (a.den * b.den) := by rw [hb]; ac_rfl

/-- Negation respects the equivalence. -/
def neg (a : Frac) : Frac := ⟨-a.num, a.den, a.pos⟩

theorem neg_equiv {a b : Frac} (h : Equiv a b) : Equiv (neg a) (neg b) := by
  unfold Equiv neg at *
  simp only [Int.neg_mul, h]

/-- `a.num / a.den` (Euclidean, so floor, as the denominator is positive). -/
def floor (a : Frac) : Int := a.num / a.den

theorem floor_mul_le (a : Frac) : a.floor * a.den ≤ a.num := Int.ediv_mul_le _ (den_ne a)

theorem lt_floor_succ_mul (a : Frac) : a.num < (a.floor + 1) * a.den :=
  Int.lt_ediv_add_one_mul_self _ a.pos

/-- The floor is the only integer `q` with `q ≤ a < q + 1`. -/
theorem floor_unique {a : Frac} {q : Int} (h₁ : q * a.den ≤ a.num)
    (h₂ : a.num < (q + 1) * a.den) : q = a.floor := by
  have l₁ : q < a.floor + 1 :=
    Int.lt_of_mul_lt_mul_right (Int.lt_of_le_of_lt h₁ (lt_floor_succ_mul a)) (Int.le_of_lt a.pos)
  have l₂ : a.floor < q + 1 :=
    Int.lt_of_mul_lt_mul_right (Int.lt_of_le_of_lt (floor_mul_le a) h₂) (Int.le_of_lt a.pos)
  omega

theorem le_transfer {a b : Frac} (h : Equiv a b) {q : Int} (hq : q * a.den ≤ a.num) :
    q * b.den ≤ b.num := by
  unfold Equiv at h
  apply Int.le_of_mul_le_mul_right _ a.pos
  calc q * b.den * a.den = q * a.den * b.den := by ac_rfl
    _ ≤ a.num * b.den := Int.mul_le_mul_of_nonneg_right hq (Int.le_of_lt b.pos)
    _ = b.num * a.den := h

theorem lt_transfer {a b : Frac} (h : Equiv a b) {q : Int} (hq : a.num < q * a.den) :
    b.num < q * b.den := by
  unfold Equiv at h
  apply Int.lt_of_mul_lt_mul_right _ (Int.le_of_lt a.pos)
  calc b.num * a.den = a.num * b.den := h.symm
    _ < q * a.den * b.den := Int.mul_lt_mul_of_pos_right hq b.pos
    _ = q * b.den * a.den := by ac_rfl

theorem floor_equiv {a b : Frac} (h : Equiv a b) : a.floor = b.floor :=
  floor_unique (le_transfer h (floor_mul_le a)) (lt_transfer h (lt_floor_succ_mul a))

end Frac

/-- The rationals: fractions up to equivalence. -/
def Q : Type := Quotient Frac.setoid

namespace Q

/-- The fraction `n / d`; `d` must be positive. -/
def ofFrac (a : Frac) : Q := Quotient.mk _ a

theorem sound {a b : Frac} (h : Frac.Equiv a b) : ofFrac a = ofFrac b := Quotient.sound h

theorem exact {a b : Frac} (h : ofFrac a = ofFrac b) : Frac.Equiv a b := Quotient.exact h

def lt (x y : Q) : Prop :=
  Quotient.lift₂ Frac.Lt
    (fun _ _ _ _ ha hb => propext ⟨Frac.lt_of_equiv ha hb, Frac.lt_of_equiv
      (Setoid.symm ha) (Setoid.symm hb)⟩) x y

instance decLt (x y : Q) : Decidable (lt x y) :=
  Quotient.recOnSubsingleton₂ x y fun a b =>
    inferInstanceAs (Decidable (a.num * b.den < b.num * a.den))

instance decEq : DecidableEq Q := fun x y =>
  Quotient.recOnSubsingleton₂ x y fun a b =>
    if h : a.num * b.den = b.num * a.den then isTrue (Quotient.sound h)
    else isFalse fun e => h (Quotient.exact e)

def floor (x : Q) : Int := Quotient.lift Frac.floor (fun _ _ h => Frac.floor_equiv h) x

def neg (x : Q) : Q :=
  Quotient.lift (fun a => ofFrac (Frac.neg a)) (fun _ _ h => sound (Frac.neg_equiv h)) x

/-- The least integer at least `x`. -/
def ceil (x : Q) : Int := -floor (neg x)

def embed (n : Int) : Q := ofFrac ⟨n, 1, by decide⟩

instance : OrderOps Q where
  lt := lt
  decLt := decLt
  decEq := decEq
  embed := embed
  floor := floor
  ceil := ceil

theorem lt_or_eq_of_le {a b : Int} (h : a ≤ b) : a < b ∨ a = b := by omega

theorem ind {p : Q → Prop} (h : ∀ a, p (ofFrac a)) : ∀ x, p x := Quotient.ind h

theorem lt_mk (a b : Frac) :
    OrderOps.lt (ofFrac a) (ofFrac b) ↔ a.num * b.den < b.num * a.den := Iff.rfl

theorem embed_eq (n : Int) : OrderOps.embed (α := Q) n = ofFrac ⟨n, 1, by decide⟩ := rfl

theorem floor_mk (a : Frac) : OrderOps.floor (ofFrac a) = a.floor := rfl

theorem ceil_mk (a : Frac) : OrderOps.ceil (ofFrac a) = -(Frac.neg a).floor := rfl

instance : DenseOrder Q where
  lt_irrefl := ind fun a h => Int.lt_irrefl _ ((lt_mk a a).mp h)
  lt_trans := by
    intro x y z
    induction x using ind; induction y using ind; induction z using ind
    rename_i a b c
    intro h₁ h₂
    rw [lt_mk] at *
    apply Int.lt_of_mul_lt_mul_right (a := b.den) _ (Int.le_of_lt b.pos)
    calc a.num * c.den * b.den = (a.num * b.den) * c.den := by ac_rfl
      _ < (b.num * a.den) * c.den := Int.mul_lt_mul_of_pos_right h₁ c.pos
      _ = (b.num * c.den) * a.den := by ac_rfl
      _ < (c.num * b.den) * a.den := Int.mul_lt_mul_of_pos_right h₂ a.pos
      _ = c.num * a.den * b.den := by ac_rfl
  lt_trichotomy := by
    intro x y
    induction x using ind; induction y using ind
    rename_i a b
    rcases Int.lt_trichotomy (a.num * b.den) (b.num * a.den) with h | h | h
    · exact Or.inl h
    · exact Or.inr (Or.inl (sound h))
    · exact Or.inr (Or.inr h)
  dense := by
    intro x y
    induction x using ind; induction y using ind
    rename_i a b
    intro h
    rw [lt_mk] at h
    have hd : 0 < 2 * a.den * b.den := Int.mul_pos (Int.mul_pos (by decide) a.pos) b.pos
    refine ⟨ofFrac ⟨a.num * b.den + b.num * a.den, 2 * a.den * b.den, hd⟩, ?_, ?_⟩
    · show a.num * (2 * a.den * b.den) < (a.num * b.den + b.num * a.den) * a.den
      have h' := Int.mul_lt_mul_of_pos_right h a.pos
      have e : a.num * (2 * a.den * b.den) = 2 * (a.num * b.den * a.den) := by ac_rfl
      rw [e, Int.add_mul]
      omega
    · show (a.num * b.den + b.num * a.den) * b.den < b.num * (2 * a.den * b.den)
      have h' := Int.mul_lt_mul_of_pos_right h b.pos
      have e : b.num * (2 * a.den * b.den) = 2 * (b.num * a.den * b.den) := by ac_rfl
      rw [e, Int.add_mul]
      omega
  no_max := ind fun a => ⟨ofFrac ⟨a.num + a.den, a.den, a.pos⟩, by
    show a.num * a.den < (a.num + a.den) * a.den
    have := Int.mul_pos a.pos a.pos
    rw [Int.add_mul]
    omega⟩
  no_min := ind fun a => ⟨ofFrac ⟨a.num - a.den, a.den, a.pos⟩, by
    show (a.num - a.den) * a.den < a.num * a.den
    have := Int.mul_pos a.pos a.pos
    rw [Int.sub_mul]
    omega⟩
  nonempty := ⟨embed 0⟩

instance : IntEmbedding Q where
  embed_lt m n := by
    show m < n ↔ m * 1 < n * 1
    simp only [Int.mul_one]
  floor_le := ind fun a => by
    rw [floor_mk, embed_eq]
    rcases lt_or_eq_of_le (Frac.floor_mul_le a) with h | h
    · left
      show a.floor * a.den < a.num * 1
      rw [Int.mul_one]; exact h
    · right
      apply sound
      show a.floor * a.den = a.num * 1
      rw [Int.mul_one]; exact h
  lt_floor_succ := ind fun a => by
    rw [floor_mk, embed_eq]
    show a.num * 1 < (a.floor + 1) * a.den
    rw [Int.mul_one]; exact Frac.lt_floor_succ_mul a
  ceil_pred_lt := ind fun a => by
    rw [ceil_mk, embed_eq]
    show (-(Frac.neg a).floor - 1) * a.den < a.num * 1
    have h := Frac.lt_floor_succ_mul (Frac.neg a)
    simp only [Frac.neg] at h ⊢
    have e : (-((Frac.neg a).floor) - 1) * a.den = -(((Frac.neg a).floor + 1) * a.den) := by
      rw [show -((Frac.neg a).floor) - 1 = -((Frac.neg a).floor + 1) by omega, Int.neg_mul]
    simp only [Frac.neg] at e
    rw [e, Int.mul_one]
    omega
  le_ceil := ind fun a => by
    rw [ceil_mk, embed_eq]
    have h := Frac.floor_mul_le (Frac.neg a)
    simp only [Frac.neg] at h ⊢
    rcases lt_or_eq_of_le h with h | h
    · left
      show a.num * 1 < -(Frac.floor ⟨-a.num, a.den, a.pos⟩) * a.den
      rw [Int.mul_one, Int.neg_mul]
      omega
    · right
      apply sound
      show a.num * 1 = -(Frac.floor ⟨-a.num, a.den, a.pos⟩) * a.den
      rw [Int.mul_one, Int.neg_mul]
      omega

end Q

/-- `satisfiable_iff` for the executable's rationals. -/
theorem satisfiable_Q_iff (isInt : Nat → Bool) (cs : List (Constraint Q)) :
    satisfiable isInt cs = true ↔
      ∃ assign : Nat → Q, Admissible isInt assign ∧
        ∀ c ∈ cs, OrderOps.holds c.op (assign c.var) c.value :=
  satisfiable_iff isInt cs

/-- `entailed_iff` for the executable's rationals. -/
theorem entailed_Q_iff (isInt : Nat → Bool) (premises : List (Constraint Q))
    (claim : Constraint Q) :
    entailed isInt premises claim = true ↔
      ∀ assign : Nat → Q, Admissible isInt assign →
        (∀ p ∈ premises, OrderOps.holds p.op (assign p.var) p.value) →
          OrderOps.holds claim.op (assign claim.var) claim.value :=
  entailed_iff isInt premises claim

end KibiIntervals
