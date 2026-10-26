import KibiIntervals.Basic

set_option linter.unusedSectionVars false

/-!
 The real fold decides satisfiability exactly: `realFeasible cs` is true
 exactly when some value satisfies every constraint in `cs`. The proof needs
 only a dense linear order without endpoints, so it holds for the rationals
 and the reals alike.
-/

namespace KibiIntervals

open OrderOps

/-- A dense linear order without endpoints. -/
class DenseOrder (α : Type) [OrderOps α] : Prop where
  lt_irrefl : ∀ a : α, ¬ lt a a
  lt_trans : ∀ {a b c : α}, lt a b → lt b c → lt a c
  lt_trichotomy : ∀ a b : α, lt a b ∨ a = b ∨ lt b a
  dense : ∀ {a b : α}, lt a b → ∃ c, lt a c ∧ lt c b
  no_max : ∀ a : α, ∃ b, lt a b
  no_min : ∀ a : α, ∃ b, lt b a
  nonempty : Nonempty α

variable {α : Type} [OrderOps α] [DenseOrder α]

theorem lt_asymm {a b : α} (h : lt a b) : ¬ lt b a :=
  fun h' => DenseOrder.lt_irrefl a (DenseOrder.lt_trans h h')

theorem lt_ne {a b : α} (h : lt a b) : a ≠ b := by
  intro e; subst e; exact DenseOrder.lt_irrefl a h

/-- Every open interval holds a point outside any finite list. -/
theorem avoid (ex : List α) : ∀ {a b : α}, lt a b → ∃ x, lt a x ∧ lt x b ∧ x ∉ ex := by
  induction ex with
  | nil =>
    intro a b h
    obtain ⟨c, h1, h2⟩ := DenseOrder.dense h
    exact ⟨c, h1, h2, by simp⟩
  | cons e rest ih =>
    intro a b h
    obtain ⟨x, hax, hxb, hx⟩ := ih h
    by_cases hxe : x = e
    · obtain ⟨y, hay, hyx, hy⟩ := ih hax
      refine ⟨y, hay, DenseOrder.lt_trans hyx hxb, ?_⟩
      intro hm
      cases List.mem_cons.mp hm with
      | inl h => exact lt_ne hyx (h.trans hxe.symm)
      | inr h => exact hy h
    · refine ⟨x, hax, hxb, ?_⟩
      intro hm
      cases List.mem_cons.mp hm with
      | inl h => exact hxe h
      | inr h => exact hx h

theorem avoid_below (ex : List α) (b : α) : ∃ x, lt x b ∧ x ∉ ex := by
  obtain ⟨a, ha⟩ := DenseOrder.no_min b
  obtain ⟨x, _, hxb, hx⟩ := avoid ex ha
  exact ⟨x, hxb, hx⟩

theorem avoid_above (ex : List α) (a : α) : ∃ x, lt a x ∧ x ∉ ex := by
  obtain ⟨b, hb⟩ := DenseOrder.no_max a
  obtain ⟨x, hax, _, hx⟩ := avoid ex hb
  exact ⟨x, hax, hx⟩

/-- The value meets a lower end. -/
def lowOk : Option (α × Kind) → α → Prop
  | none, _ => True
  | some (v, .closed), x => lt v x ∨ x = v
  | some (v, .strict), x => lt v x

/-- The value meets an upper end. -/
def highOk : Option (α × Kind) → α → Prop
  | none, _ => True
  | some (v, .closed), x => lt x v ∨ x = v
  | some (v, .strict), x => lt x v

@[simp] theorem lowOk_none (x : α) : lowOk none x ↔ True := Iff.rfl
@[simp] theorem highOk_none (x : α) : highOk none x ↔ True := Iff.rfl
@[simp] theorem lowOk_closed (v x : α) : lowOk (some (v, .closed)) x ↔ (lt v x ∨ x = v) := Iff.rfl
@[simp] theorem lowOk_strict (v x : α) : lowOk (some (v, .strict)) x ↔ lt v x := Iff.rfl
@[simp] theorem highOk_closed (v x : α) : highOk (some (v, .closed)) x ↔ (lt x v ∨ x = v) := Iff.rfl
@[simp] theorem highOk_strict (v x : α) : highOk (some (v, .strict)) x ↔ lt x v := Iff.rfl

/-- The value lies in the interval. -/
def Interval.mem (i : Interval α) (x : α) : Prop :=
  lowOk i.lo x ∧ highOk i.hi x ∧ x ∉ i.ex

theorem lowOk_strict_of {v x : α} {k : Kind} (h : lowOk (some (v, k)) x) : lt v x ∨ x = v := by
  cases k with
  | strict => exact Or.inl h
  | closed => exact h

theorem highOk_strict_of {v x : α} {k : Kind} (h : highOk (some (v, k)) x) : lt x v ∨ x = v := by
  cases k with
  | strict => exact Or.inl h
  | closed => exact h

theorem lowOk_of_lt {v x : α} (k : Kind) (h : lt v x) : lowOk (some (v, k)) x := by
  cases k with
  | strict => exact h
  | closed => exact Or.inl h

theorem highOk_of_lt {v x : α} (k : Kind) (h : lt x v) : highOk (some (v, k)) x := by
  cases k with
  | strict => exact h
  | closed => exact Or.inl h

/-- A lower end at a value the bound exceeds is implied by the bound. -/
theorem lowOk_weaken {lo v x : α} {lk k : Kind} (hlt : lt lo v) (h : lowOk (some (v, k)) x) :
    lowOk (some (lo, lk)) x := by
  apply lowOk_of_lt
  cases lowOk_strict_of h with
  | inl h => exact DenseOrder.lt_trans hlt h
  | inr h => exact h ▸ hlt

theorem highOk_weaken {hi v x : α} {hk k : Kind} (hlt : lt v hi) (h : highOk (some (v, k)) x) :
    highOk (some (hi, hk)) x := by
  apply highOk_of_lt
  cases highOk_strict_of h with
  | inl h => exact DenseOrder.lt_trans h hlt
  | inr h => exact h ▸ hlt

theorem lowOk_tighter {v x : α} (a b : Kind) :
    lowOk (some (v, Kind.tighter a b)) x ↔ lowOk (some (v, a)) x ∧ lowOk (some (v, b)) x := by
  cases a <;> cases b <;> simp [Kind.tighter, lowOk] <;> intro h <;>
    first | exact Or.inl h | (intro e; subst e; exact DenseOrder.lt_irrefl _ h)

theorem highOk_tighter {v x : α} (a b : Kind) :
    highOk (some (v, Kind.tighter a b)) x ↔ highOk (some (v, a)) x ∧ highOk (some (v, b)) x := by
  cases a <;> cases b <;> simp [Kind.tighter, highOk] <;> intro h <;>
    first | exact Or.inl h | (intro e; subst e; exact DenseOrder.lt_irrefl _ h)

/-- `raise_low/6` keeps exactly the values that meet both lower ends. -/
theorem lowOk_raiseLow (lo : Option (α × Kind)) (v : α) (k : Kind) (x : α) :
    lowOk (raiseLow lo v k) x ↔ lowOk lo x ∧ lowOk (some (v, k)) x := by
  match lo with
  | none => simp [raiseLow, lowOk]
  | some (l, lk) =>
    simp only [raiseLow]
    by_cases hlt : lt l v
    · simp only [hlt, if_true]
      exact ⟨fun h => ⟨lowOk_weaken hlt h, h⟩, fun h => h.2⟩
    · simp only [hlt, if_false]
      by_cases he : v = l
      · subst he; simp only [if_true]; exact lowOk_tighter lk k
      · simp only [he, if_false]
        have hvl : lt v l := by
          rcases DenseOrder.lt_trichotomy l v with h | h | h
          · exact absurd h hlt
          · exact absurd h.symm he
          · exact h
        exact ⟨fun h => ⟨h, lowOk_weaken hvl h⟩, fun h => h.1⟩

theorem highOk_lowerHigh (hi : Option (α × Kind)) (v : α) (k : Kind) (x : α) :
    highOk (lowerHigh hi v k) x ↔ highOk hi x ∧ highOk (some (v, k)) x := by
  match hi with
  | none => simp [lowerHigh, highOk]
  | some (h, hk) =>
    simp only [lowerHigh]
    by_cases hlt : lt v h
    · simp only [hlt, if_true]
      exact ⟨fun hh => ⟨highOk_weaken hlt hh, hh⟩, fun hh => hh.2⟩
    · simp only [hlt, if_false]
      by_cases he : v = h
      · subst he; simp only [if_true]; exact highOk_tighter hk k
      · simp only [he, if_false]
        have hhv : lt h v := by
          rcases DenseOrder.lt_trichotomy v h with hh | hh | hh
          · exact absurd hh hlt
          · exact absurd hh he
          · exact hh
        exact ⟨fun hh => ⟨hh, highOk_weaken hhv hh⟩, fun hh => hh.1⟩

/-- `apply_bound/3` keeps exactly the values that also meet the bound. -/
theorem mem_applyBound (i : Interval α) (c : Op × α) (x : α) :
    (applyBound i c).mem x ↔ i.mem x ∧ holds c.1 x c.2 := by
  obtain ⟨op, v⟩ := c
  obtain ⟨lo, hi, ex⟩ := i
  cases op <;> simp only [applyBound, Interval.mem, holds, lowOk_raiseLow, highOk_lowerHigh,
    lowOk_closed, lowOk_strict, highOk_closed, highOk_strict, List.mem_cons, not_or]
  · constructor
    · rintro ⟨⟨h1, h2⟩, ⟨h3, h4⟩, h5⟩
      refine ⟨⟨h1, h3, h5⟩, ?_⟩
      rcases h2 with h2 | h2
      · rcases h4 with h4 | h4
        · exact absurd (DenseOrder.lt_trans h2 h4) (DenseOrder.lt_irrefl v)
        · exact h4
      · exact h2
    · rintro ⟨⟨h1, h3, h5⟩, e⟩
      exact ⟨⟨h1, Or.inr e⟩, ⟨h3, Or.inr e⟩, h5⟩
  · constructor
    · rintro ⟨h1, h2, h3, h4⟩; exact ⟨⟨h1, h2, h4⟩, h3⟩
    · rintro ⟨⟨h1, h2, h4⟩, h3⟩; exact ⟨h1, h2, h3, h4⟩
  · constructor
    · rintro ⟨h1, ⟨h2, h3⟩, h4⟩; exact ⟨⟨h1, h2, h4⟩, h3⟩
    · rintro ⟨⟨h1, h2, h4⟩, h3⟩; exact ⟨h1, ⟨h2, h3⟩, h4⟩
  · constructor
    · rintro ⟨h1, ⟨h2, h3⟩, h4⟩; exact ⟨⟨h1, h2, h4⟩, h3⟩
    · rintro ⟨⟨h1, h2, h4⟩, h3⟩; exact ⟨h1, ⟨h2, h3⟩, h4⟩
  · constructor
    · rintro ⟨⟨h1, h2⟩, h3, h4⟩; exact ⟨⟨h1, h3, h4⟩, h2⟩
    · rintro ⟨⟨h1, h3, h4⟩, h2⟩; exact ⟨⟨h1, h2⟩, h3, h4⟩
  · constructor
    · rintro ⟨⟨h1, h2⟩, h3, h4⟩; exact ⟨⟨h1, h3, h4⟩, h2⟩
    · rintro ⟨⟨h1, h3, h4⟩, h2⟩; exact ⟨⟨h1, h2⟩, h3, h4⟩

/-- Folding bounds keeps exactly the values that meet all of them. -/
theorem mem_foldl (cs : List (Op × α)) (i : Interval α) (x : α) :
    (cs.foldl applyBound i).mem x ↔ i.mem x ∧ ∀ c ∈ cs, holds c.1 x c.2 := by
  induction cs generalizing i with
  | nil => simp
  | cons c rest ih =>
    rw [List.foldl_cons, ih, mem_applyBound]
    simp only [List.mem_cons, forall_eq_or_imp]
    exact ⟨fun ⟨⟨a, b⟩, d⟩ => ⟨a, b, d⟩, fun ⟨a, b, d⟩ => ⟨⟨a, b⟩, d⟩⟩

/-- `interval_non_empty/1` is true exactly when the interval holds a value. -/
theorem nonEmpty_iff (i : Interval α) : i.nonEmpty = true ↔ ∃ x, i.mem x := by
  obtain ⟨lo, hi, ex⟩ := i
  match lo, hi with
  | none, none =>
    obtain ⟨a⟩ := DenseOrder.nonempty (α := α)
    obtain ⟨x, _, hx⟩ := avoid_above ex a
    simp only [Interval.nonEmpty, true_iff]
    exact ⟨x, trivial, trivial, hx⟩
  | none, some (h, hk) =>
    obtain ⟨x, hxh, hx⟩ := avoid_below ex h
    simp only [Interval.nonEmpty, true_iff]
    exact ⟨x, trivial, highOk_of_lt hk hxh, hx⟩
  | some (l, lk), none =>
    obtain ⟨x, hlx, hx⟩ := avoid_above ex l
    simp only [Interval.nonEmpty, true_iff]
    exact ⟨x, lowOk_of_lt lk hlx, trivial, hx⟩
  | some (l, lk), some (h, hk) =>
    simp only [Interval.nonEmpty, Bool.or_eq_true, Bool.and_eq_true, decide_eq_true_eq,
      beq_iff_eq, Bool.not_eq_true', decide_eq_false_iff_not]
    constructor
    · rintro (hlt | ⟨⟨⟨e, hlk⟩, hhk⟩, hnot⟩)
      · obtain ⟨x, hlx, hxh, hx⟩ := avoid ex hlt
        exact ⟨x, lowOk_of_lt lk hlx, highOk_of_lt hk hxh, hx⟩
      · subst e hlk hhk
        exact ⟨l, Or.inr rfl, Or.inr rfl, hnot⟩
    · rintro ⟨x, hlo, hhi, hx⟩
      rcases DenseOrder.lt_trichotomy l h with hlt | e | hgt
      · exact Or.inl hlt
      · subst e
        refine Or.inr ⟨⟨⟨rfl, ?_⟩, ?_⟩, ?_⟩
        · cases lk with
          | closed => rfl
          | strict =>
            exfalso
            rcases highOk_strict_of hhi with h2 | h2
            · exact lt_asymm hlo h2
            · exact DenseOrder.lt_irrefl _ (h2 ▸ hlo)
        · cases hk with
          | closed => rfl
          | strict =>
            exfalso
            rcases lowOk_strict_of hlo with h2 | h2
            · exact lt_asymm hhi h2
            · exact DenseOrder.lt_irrefl _ (h2 ▸ hhi)
        · rcases lowOk_strict_of hlo with h1 | h1
          · rcases highOk_strict_of hhi with h2 | h2
            · exact absurd (DenseOrder.lt_trans h1 h2) (DenseOrder.lt_irrefl l)
            · exact h2 ▸ hx
          · exact h1 ▸ hx
      · exfalso
        have a := lowOk_strict_of hlo
        have b := highOk_strict_of hhi
        rcases a with a | a <;> rcases b with b | b
        · exact DenseOrder.lt_irrefl _ (DenseOrder.lt_trans (DenseOrder.lt_trans a b) hgt)
        · subst b; exact DenseOrder.lt_irrefl _ (DenseOrder.lt_trans a hgt)
        · subst a; exact DenseOrder.lt_irrefl _ (DenseOrder.lt_trans b hgt)
        · subst a; subst b; exact DenseOrder.lt_irrefl _ hgt

/-- **Soundness and completeness for one real variable.** The fold
`variable_feasible/2` runs is true exactly when some real value satisfies
every constraint. -/
theorem realFeasible_iff (cs : List (Op × α)) :
    realFeasible cs = true ↔ ∃ x, ∀ c ∈ cs, holds c.1 x c.2 := by
  unfold realFeasible
  rw [nonEmpty_iff]
  have init : ∀ x : α, (⟨none, none, []⟩ : Interval α).mem x :=
    fun _ => ⟨trivial, trivial, List.not_mem_nil _⟩
  exact ⟨fun ⟨x, h⟩ => ⟨x, ((mem_foldl cs _ x).mp h).2⟩,
    fun ⟨x, h⟩ => ⟨x, (mem_foldl cs _ x).mpr ⟨init x, h⟩⟩⟩

end KibiIntervals
