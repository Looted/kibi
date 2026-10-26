import KibiIntervals.Reals

set_option linter.unusedSectionVars false

/-!
 The integer fold decides satisfiability exactly for an integer-valued
 variable compared with arbitrary values: `intFeasible cs` is true exactly
 when some integer satisfies every constraint in `cs`. Then the whole of
 `numeric_constraints_satisfiable/2` and `numeric_constraint_entailed/3`
 follow: each variable is decided on its own constraints, and entailment is
 unsatisfiability of the premises with the negated claim.
-/

namespace KibiIntervals

open OrderOps

/-- How the integers sit inside the values: `embed` is strictly monotone,
`floor v` is the greatest integer at most `v`, `ceil v` the least integer at
least `v`. -/
class IntEmbedding (α : Type) [OrderOps α] : Prop where
  embed_lt : ∀ m n : Int, m < n ↔ lt (embed (α := α) m) (embed n)
  floor_le : ∀ v : α, lt (embed (floor v)) v ∨ embed (floor v) = v
  lt_floor_succ : ∀ v : α, lt v (embed (floor v + 1))
  ceil_pred_lt : ∀ v : α, lt (embed (ceil v - 1)) v
  le_ceil : ∀ v : α, lt v (embed (ceil v)) ∨ v = embed (ceil v)

variable {α : Type} [OrderOps α] [DenseOrder α] [IntEmbedding α]

/-- The non-strict order the closed bounds use. -/
def le (a b : α) : Prop := lt a b ∨ a = b

theorem le_of_lt_or_eq {a b : α} (h : lt a b ∨ a = b) : le a b := h

theorem lt_of_le_of_lt {a b c : α} (h1 : le a b) (h2 : lt b c) : lt a c := by
  rcases h1 with h1 | h1
  · exact DenseOrder.lt_trans h1 h2
  · exact h1 ▸ h2

theorem lt_of_lt_of_le {a b c : α} (h1 : lt a b) (h2 : le b c) : lt a c := by
  rcases h2 with h2 | h2
  · exact DenseOrder.lt_trans h1 h2
  · exact h2 ▸ h1

theorem not_lt_of_le {a b : α} (h : le a b) : ¬ lt b a := by
  intro h'
  exact DenseOrder.lt_irrefl _ (lt_of_le_of_lt h h')

theorem le_of_not_lt {a b : α} (h : ¬ lt b a) : le a b := by
  rcases DenseOrder.lt_trichotomy a b with h1 | h1 | h1
  · exact Or.inl h1
  · exact Or.inr h1
  · exact absurd h1 h

theorem embed_le (m n : Int) : m ≤ n ↔ le (embed (α := α) m) (embed n) := by
  constructor
  · intro h
    by_cases hmn : m = n
    · exact Or.inr (hmn ▸ rfl)
    · exact Or.inl ((IntEmbedding.embed_lt m n).mp (by omega))
  · intro h
    apply Int.not_lt.mp
    intro hlt
    exact not_lt_of_le h ((IntEmbedding.embed_lt n m).mp hlt)

theorem embed_inj {m n : Int} (h : embed (α := α) m = embed n) : m = n := by
  have a := (embed_le (α := α) m n).mpr (Or.inr h)
  have b := (embed_le (α := α) n m).mpr (Or.inr h.symm)
  omega

theorem floor_embed (n : Int) : floor (embed (α := α) n) = n := by
  have a := (embed_le (α := α) _ _).mpr (IntEmbedding.floor_le (embed (α := α) n))
  have b := (IntEmbedding.embed_lt (α := α) _ _).mpr (IntEmbedding.lt_floor_succ (embed (α := α) n))
  omega

theorem gt_iff (v : α) (n : Int) : lt v (embed n) ↔ floor v + 1 ≤ n := by
  constructor
  · intro h
    apply Int.not_lt.mp
    intro hn
    have : le (embed (α := α) n) (embed (floor v)) := (embed_le _ _).mp (by omega)
    exact not_lt_of_le (le_of_lt_or_eq (IntEmbedding.floor_le v) |> fun hf =>
      match this, hf with
      | Or.inl a, Or.inl b => Or.inl (DenseOrder.lt_trans a b)
      | Or.inl a, Or.inr b => Or.inl (b ▸ a)
      | Or.inr a, Or.inl b => Or.inl (a ▸ b)
      | Or.inr a, Or.inr b => Or.inr (a.trans b)) h
  · intro h
    exact lt_of_lt_of_le (IntEmbedding.lt_floor_succ v) ((embed_le _ _).mp h)

theorem gte_iff (v : α) (n : Int) : (lt v (embed n) ∨ embed n = v) ↔ ceil v ≤ n := by
  constructor
  · intro h
    apply Int.not_lt.mp
    intro hn
    have hle : le (embed (α := α) n) (embed (ceil v - 1)) := (embed_le _ _).mp (by omega)
    have hlt : lt (embed (α := α) n) v := lt_of_le_of_lt hle (IntEmbedding.ceil_pred_lt v)
    rcases h with h | h
    · exact lt_asymm hlt h
    · exact DenseOrder.lt_irrefl _ (h ▸ hlt)
  · intro h
    have hle : le (embed (α := α) (ceil v)) (embed n) := (embed_le _ _).mp h
    rcases IntEmbedding.le_ceil v with h1 | h1
    · exact Or.inl (lt_of_lt_of_le h1 hle)
    · rcases hle with h2 | h2
      · exact Or.inl (h1 ▸ h2)
      · exact Or.inr (h2.symm.trans h1.symm)

theorem lt_iff (v : α) (n : Int) : lt (embed n) v ↔ n ≤ ceil v - 1 := by
  have := gte_iff v n
  constructor
  · intro h
    apply Int.not_lt.mp
    intro hn
    have := this.mpr (by omega)
    rcases this with h1 | h1
    · exact lt_asymm h h1
    · exact DenseOrder.lt_irrefl _ (h1 ▸ h)
  · intro h
    apply Classical.byContradiction
    intro hn
    have := this.mp (le_of_not_lt hn |> fun hl => match hl with
      | Or.inl a => Or.inl a
      | Or.inr a => Or.inr a.symm)
    omega

theorem lte_iff (v : α) (n : Int) : (lt (embed n) v ∨ embed n = v) ↔ n ≤ floor v := by
  have := gt_iff v n
  constructor
  · intro h
    apply Int.not_lt.mp
    intro hn
    have h2 := this.mpr (by omega)
    exact not_lt_of_le (le_of_lt_or_eq h) h2
  · intro h
    apply le_of_not_lt
    intro h2
    have := this.mp h2
    omega

theorem integral_iff (v : α) : integral v = true ↔ ∃ n, embed n = v := by
  simp only [integral, decide_eq_true_eq]
  constructor
  · intro h; exact ⟨_, h⟩
  · rintro ⟨n, rfl⟩; rw [floor_embed]

theorem eq_iff (v : α) (n : Int) : embed n = v ↔ integral v = true ∧ n = floor v := by
  constructor
  · rintro rfl
    exact ⟨(integral_iff _).mpr ⟨n, rfl⟩, (floor_embed n).symm⟩
  · rintro ⟨h, rfl⟩
    simp only [integral, decide_eq_true_eq] at h
    exact h

/-- The integer lies in the range. -/
def Box.mem : Option Box → Int → Prop
  | none, _ => False
  | some b, n => (∀ l, b.lo = some l → l ≤ n) ∧ (∀ h, b.hi = some h → n ≤ h) ∧ n ∉ b.ex

theorem raiseLowInt_iff (lo : Option Int) (b n : Int) :
    (∀ l, raiseLowInt lo b = some l → l ≤ n) ↔ (∀ l, lo = some l → l ≤ n) ∧ b ≤ n := by
  cases lo with
  | none => simp [raiseLowInt]
  | some l =>
    simp only [raiseLowInt, Option.some.injEq, forall_eq', Int.max_le]

theorem lowerHighInt_iff (hi : Option Int) (b n : Int) :
    (∀ h, lowerHighInt hi b = some h → n ≤ h) ↔ (∀ h, hi = some h → n ≤ h) ∧ n ≤ b := by
  cases hi with
  | none => simp [lowerHighInt]
  | some h =>
    simp only [lowerHighInt, Option.some.injEq, forall_eq', Int.le_min]

/-- `apply_integer_bound/3` keeps exactly the integers that also meet the bound. -/
theorem mem_applyIntBound (b : Option Box) (c : Op × α) (n : Int) :
    Box.mem (applyIntBound b c) n ↔ Box.mem b n ∧ holds c.1 (embed n) c.2 := by
  obtain ⟨op, v⟩ := c
  cases b with
  | none => cases op <;> simp [applyIntBound, Box.mem]
  | some b =>
    obtain ⟨lo, hi, ex⟩ := b
    cases op
    · -- eq
      simp only [applyIntBound, holds, eq_iff]
      by_cases hi' : integral v = true
      · simp only [hi', if_true, Box.mem, raiseLowInt_iff, lowerHighInt_iff, true_and]
        constructor
        · rintro ⟨⟨a, b⟩, ⟨c, d⟩, e⟩; exact ⟨⟨a, c, e⟩, by omega⟩
        · rintro ⟨⟨a, c, e⟩, rfl⟩; exact ⟨⟨a, Int.le_refl _⟩, ⟨c, Int.le_refl _⟩, e⟩
      · simp [hi', Box.mem]
    · -- neq
      simp only [applyIntBound, holds, ne_eq, eq_iff, not_and]
      by_cases hi' : integral v = true
      · simp only [hi', if_true, Box.mem, List.mem_cons, not_or, true_implies]
        constructor
        · rintro ⟨a, b, c, d⟩; exact ⟨⟨a, b, d⟩, c⟩
        · rintro ⟨⟨a, b, d⟩, c⟩; exact ⟨a, b, c, d⟩
      · simp [hi', Box.mem]
    · -- lt
      simp only [applyIntBound, holds, lt_iff, Box.mem, lowerHighInt_iff]
      constructor
      · rintro ⟨a, ⟨b, c⟩, d⟩; exact ⟨⟨a, b, d⟩, c⟩
      · rintro ⟨⟨a, b, d⟩, c⟩; exact ⟨a, ⟨b, c⟩, d⟩
    · -- lte
      simp only [applyIntBound, holds, lte_iff, Box.mem, lowerHighInt_iff]
      constructor
      · rintro ⟨a, ⟨b, c⟩, d⟩; exact ⟨⟨a, b, d⟩, c⟩
      · rintro ⟨⟨a, b, d⟩, c⟩; exact ⟨a, ⟨b, c⟩, d⟩
    · -- gt
      simp only [applyIntBound, holds, gt_iff, Box.mem, raiseLowInt_iff]
      constructor
      · rintro ⟨⟨a, c⟩, b, d⟩; exact ⟨⟨a, b, d⟩, c⟩
      · rintro ⟨⟨a, b, d⟩, c⟩; exact ⟨⟨a, c⟩, b, d⟩
    · -- gte
      simp only [applyIntBound, holds, gte_iff, Box.mem, raiseLowInt_iff]
      constructor
      · rintro ⟨⟨a, c⟩, b, d⟩; exact ⟨⟨a, b, d⟩, c⟩
      · rintro ⟨⟨a, b, d⟩, c⟩; exact ⟨⟨a, c⟩, b, d⟩

theorem mem_foldlInt (cs : List (Op × α)) (b : Option Box) (n : Int) :
    Box.mem (cs.foldl applyIntBound b) n ↔ Box.mem b n ∧ ∀ c ∈ cs, holds c.1 (embed n) c.2 := by
  induction cs generalizing b with
  | nil => simp
  | cons c rest ih =>
    rw [List.foldl_cons, ih, mem_applyIntBound]
    simp only [List.mem_cons, forall_eq_or_imp]
    exact ⟨fun ⟨⟨a, b⟩, d⟩ => ⟨a, b, d⟩, fun ⟨a, b, d⟩ => ⟨⟨a, b⟩, d⟩⟩

/-! Counting: a range of integers is covered by an exclusion list exactly
when the list holds at least as many distinct integers of the range. -/

theorem mem_dedup (l : List Int) (x : Int) : x ∈ dedup l ↔ x ∈ l := by
  induction l with
  | nil => simp [dedup]
  | cons a t ih =>
    simp only [dedup]
    split
    · rename_i h
      rw [ih, List.mem_cons]
      constructor
      · exact Or.inr
      · rintro (rfl | h')
        · exact (ih).mp h
        · exact h'
    · rw [List.mem_cons, ih, List.mem_cons]

theorem nodup_dedup (l : List Int) : (dedup l).Nodup := by
  induction l with
  | nil => simp [dedup]
  | cons a t ih =>
    simp only [dedup]
    split
    · exact ih
    · rename_i h
      exact List.nodup_cons.mpr ⟨h, ih⟩

theorem length_le_of_subset : ∀ (l₁ l₂ : List Int), l₁.Nodup → (∀ x ∈ l₁, x ∈ l₂) →
    l₁.length ≤ l₂.length
  | [], _, _, _ => Nat.zero_le _
  | a :: t, l₂, hn, hs => by
    have ⟨hat, htn⟩ := List.nodup_cons.mp hn
    have ha : a ∈ l₂ := hs a (List.mem_cons_self a t)
    have ht : ∀ x ∈ t, x ∈ l₂.erase a := by
      intro x hx
      have hxa : x ≠ a := fun e => hat (e ▸ hx)
      exact (List.mem_erase_of_ne hxa).mpr (hs x (List.mem_cons_of_mem a hx))
    have ih := length_le_of_subset t (l₂.erase a) htn ht
    rw [List.length_erase_of_mem ha] at ih
    have := List.length_pos_of_mem ha
    simp only [List.length_cons]
    omega

/-- The integers `lo, lo + 1, …, lo + k - 1`. -/
def irange (lo : Int) : Nat → List Int
  | 0 => []
  | k + 1 => lo :: irange (lo + 1) k

theorem mem_irange : ∀ (k : Nat) (lo x : Int), x ∈ irange lo k ↔ lo ≤ x ∧ x < lo + k
  | 0, lo, x => by simp [irange]; omega
  | k + 1, lo, x => by
    simp only [irange, List.mem_cons, mem_irange k (lo + 1) x]
    omega

theorem length_irange : ∀ (k : Nat) (lo : Int), (irange lo k).length = k
  | 0, _ => rfl
  | k + 1, lo => by simp [irange, length_irange k (lo + 1)]

theorem nodup_irange : ∀ (k : Nat) (lo : Int), (irange lo k).Nodup
  | 0, _ => List.nodup_nil
  | k + 1, lo => by
    refine List.nodup_cons.mpr ⟨?_, nodup_irange k (lo + 1)⟩
    rw [mem_irange]; omega

theorem bounded_nonEmpty_iff (lo hi : Int) (ex : List Int) :
    (decide (lo ≤ hi) &&
      decide (((dedup (ex.filter fun v => decide (lo ≤ v ∧ v ≤ hi))).length : Int) < hi - lo + 1))
      = true ↔ ∃ n, lo ≤ n ∧ n ≤ hi ∧ n ∉ ex := by
  simp only [Bool.and_eq_true, decide_eq_true_eq]
  generalize hdef : dedup (ex.filter fun v => decide (lo ≤ v ∧ v ≤ hi)) = d
  have hd : ∀ x, x ∈ d ↔ x ∈ ex ∧ lo ≤ x ∧ x ≤ hi := by
    intro x
    rw [← hdef, mem_dedup, List.mem_filter, decide_eq_true_eq]
  have hnd : d.Nodup := hdef ▸ nodup_dedup _
  constructor
  · rintro ⟨hle, hcount⟩
    apply Classical.byContradiction
    intro hall
    have cover : ∀ x ∈ irange lo (hi - lo + 1).toNat, x ∈ d := by
      intro x hx
      rw [mem_irange] at hx
      refine (hd x).mpr ⟨?_, by omega, by omega⟩
      apply Classical.byContradiction
      intro hnot
      exact hall ⟨x, by omega, by omega, hnot⟩
    have := length_le_of_subset _ _ (nodup_irange _ _) cover
    rw [length_irange] at this
    omega
  · rintro ⟨n, hl, hh, hn⟩
    refine ⟨by omega, ?_⟩
    have sub : ∀ x ∈ d, x ∈ (irange lo (hi - lo + 1).toNat).erase n := by
      intro x hx
      have ⟨hex, hxl, hxh⟩ := (hd x).mp hx
      have hxn : x ≠ n := fun e => hn (e ▸ hex)
      rw [List.mem_erase_of_ne hxn, mem_irange]
      omega
    have := length_le_of_subset _ _ hnd sub
    have hmem : n ∈ irange lo (hi - lo + 1).toNat := by rw [mem_irange]; omega
    rw [List.length_erase_of_mem hmem, length_irange] at this
    omega

/-- An integer below every listed value and `b`. -/
def belowAll (ex : List Int) (b : Int) : Int := ex.foldr min b - 1

theorem belowAll_spec (ex : List Int) (b : Int) :
    belowAll ex b < b ∧ ∀ e ∈ ex, belowAll ex b < e := by
  unfold belowAll
  induction ex with
  | nil => exact ⟨by simp only [List.foldr_nil]; omega, by simp⟩
  | cons a t ih =>
    simp only [List.foldr_cons, List.mem_cons, forall_eq_or_imp]
    refine ⟨by omega, by omega, fun e he => ?_⟩
    have := ih.2 e he
    omega

/-- An integer above every listed value and `b`. -/
def aboveAll (ex : List Int) (b : Int) : Int := ex.foldr max b + 1

theorem aboveAll_spec (ex : List Int) (b : Int) :
    b < aboveAll ex b ∧ ∀ e ∈ ex, e < aboveAll ex b := by
  unfold aboveAll
  induction ex with
  | nil => exact ⟨by simp only [List.foldr_nil]; omega, by simp⟩
  | cons a t ih =>
    simp only [List.foldr_cons, List.mem_cons, forall_eq_or_imp]
    refine ⟨by omega, by omega, fun e he => ?_⟩
    have := ih.2 e he
    omega

theorem not_mem_of_lt_all {ex : List Int} {n : Int} (h : ∀ e ∈ ex, n < e) : n ∉ ex :=
  fun hm => Int.lt_irrefl n (h n hm)

theorem not_mem_of_gt_all {ex : List Int} {n : Int} (h : ∀ e ∈ ex, e < n) : n ∉ ex :=
  fun hm => Int.lt_irrefl n (h n hm)

/-- `integer_box_non_empty/1` is true exactly when the range holds an integer. -/
theorem boxNonEmpty_iff (b : Option Box) : Box.nonEmpty b = true ↔ ∃ n, Box.mem b n := by
  match b with
  | none => simp [Box.nonEmpty, Box.mem]
  | some ⟨none, none, ex⟩ =>
    have ⟨_, h⟩ := belowAll_spec ex 0
    simp only [Box.nonEmpty, true_iff]
    exact ⟨belowAll ex 0, by simp, by simp, not_mem_of_lt_all h⟩
  | some ⟨none, some hi, ex⟩ =>
    have ⟨h1, h⟩ := belowAll_spec ex hi
    simp only [Box.nonEmpty, true_iff]
    exact ⟨belowAll ex hi, by simp, by simp; omega, not_mem_of_lt_all h⟩
  | some ⟨some lo, none, ex⟩ =>
    have ⟨h1, h⟩ := aboveAll_spec ex lo
    simp only [Box.nonEmpty, true_iff]
    exact ⟨aboveAll ex lo, by simp; omega, by simp, not_mem_of_gt_all h⟩
  | some ⟨some lo, some hi, ex⟩ =>
    simp only [Box.nonEmpty, bounded_nonEmpty_iff, Box.mem, Option.some.injEq, forall_eq']

/-- **Soundness and completeness for one integer variable.** The fold
`integer_variable_feasible/2` runs is true exactly when some integer
satisfies every constraint, whatever values the constraints compare with. -/
theorem intFeasible_iff (cs : List (Op × α)) :
    intFeasible cs = true ↔ ∃ n : Int, ∀ c ∈ cs, holds c.1 (embed n) c.2 := by
  unfold intFeasible
  rw [boxNonEmpty_iff]
  have init : ∀ n, Box.mem (some ⟨none, none, []⟩) n :=
    fun _ => ⟨by simp, by simp, List.not_mem_nil _⟩
  exact ⟨fun ⟨n, h⟩ => ⟨n, ((mem_foldlInt cs _ n).mp h).2⟩,
    fun ⟨n, h⟩ => ⟨n, (mem_foldlInt cs _ n).mpr ⟨init n, h⟩⟩⟩

/-- An assignment of values to variables that gives each integer variable
an integer. -/
def Admissible (isInt : Nat → Bool) (assign : Nat → α) : Prop :=
  ∀ x, isInt x = true → ∃ n, assign x = embed n

/-- A variable's own constraints, as the per-variable folds see them. -/
theorem mem_own (cs : List (Constraint α)) (x : Nat) (c : Op × α) :
    c ∈ (cs.filter (·.var == x)).map (fun c => (c.op, c.value)) ↔
      ∃ d ∈ cs, d.var = x ∧ d.op = c.1 ∧ d.value = c.2 := by
  simp only [List.mem_map, List.mem_filter, beq_iff_eq]
  constructor
  · rintro ⟨d, ⟨hd, hx⟩, rfl⟩; exact ⟨d, hd, hx, rfl, rfl⟩
  · rintro ⟨d, hd, hx, h1, h2⟩
    exact ⟨d, ⟨hd, hx⟩, by rw [h1, h2]⟩

/-- **`numeric_constraints_satisfiable/2` is exact.** It is true exactly
when one assignment, integral on the integer variables, satisfies every
constraint at once. -/
theorem satisfiable_iff (isInt : Nat → Bool) (cs : List (Constraint α)) :
    satisfiable isInt cs = true ↔
      ∃ assign : Nat → α, Admissible isInt assign ∧ ∀ c ∈ cs, holds c.op (assign c.var) c.value := by
  -- Each variable is feasible on its own constraints.
  have per : ∀ x, (if isInt x then intFeasible ((cs.filter (·.var == x)).map fun c => (c.op, c.value))
      else realFeasible ((cs.filter (·.var == x)).map fun c => (c.op, c.value))) = true ↔
      ∃ v : α, (isInt x = true → ∃ n, v = embed n) ∧ ∀ d ∈ cs, d.var = x → holds d.op v d.value := by
    intro x
    split
    · rename_i hx
      rw [intFeasible_iff]
      constructor
      · rintro ⟨n, h⟩
        refine ⟨embed n, fun _ => ⟨n, rfl⟩, fun d hd hdx => ?_⟩
        exact h (d.op, d.value) ((mem_own cs x _).mpr ⟨d, hd, hdx, rfl, rfl⟩)
      · rintro ⟨v, hv, h⟩
        obtain ⟨n, rfl⟩ := hv hx
        refine ⟨n, fun c hc => ?_⟩
        obtain ⟨d, hd, hdx, h1, h2⟩ := (mem_own cs x c).mp hc
        rw [← h1, ← h2]; exact h d hd hdx
    · rename_i hx
      rw [realFeasible_iff]
      constructor
      · rintro ⟨v, h⟩
        refine ⟨v, fun hi => absurd hi hx, fun d hd hdx => ?_⟩
        exact h (d.op, d.value) ((mem_own cs x _).mpr ⟨d, hd, hdx, rfl, rfl⟩)
      · rintro ⟨v, _, h⟩
        refine ⟨v, fun c hc => ?_⟩
        obtain ⟨d, hd, hdx, h1, h2⟩ := (mem_own cs x c).mp hc
        rw [← h1, ← h2]; exact h d hd hdx
  unfold satisfiable
  simp only [List.all_eq_true, List.mem_map]
  constructor
  · intro h
    have choice : ∀ x, ∃ v : α, (isInt x = true → ∃ n, v = embed n) ∧
        ∀ d ∈ cs, d.var = x → holds d.op v d.value := by
      intro x
      by_cases hx : ∃ c ∈ cs, c.var = x
      · obtain ⟨c, hc, rfl⟩ := hx
        exact (per c.var).mp (h c.var ⟨c, hc, rfl⟩)
      · refine ⟨embed 0, fun _ => ⟨0, rfl⟩, fun d hd hdx => absurd ⟨d, hd, hdx⟩ hx⟩
    refine ⟨fun x => Classical.choose (choice x), fun x hx => (Classical.choose_spec (choice x)).1 hx,
      fun c hc => (Classical.choose_spec (choice c.var)).2 c hc rfl⟩
  · rintro ⟨assign, hadm, h⟩ x ⟨c, hc, rfl⟩
    exact (per c.var).mpr ⟨assign c.var, hadm c.var, fun d hd hdx => hdx ▸ h d hd⟩

theorem not_lt_iff_ge (a b : α) : ¬ lt a b ↔ (lt b a ∨ a = b) := by
  constructor
  · intro h
    rcases DenseOrder.lt_trichotomy a b with h1 | h1 | h1
    · exact absurd h1 h
    · exact Or.inr h1
    · exact Or.inl h1
  · rintro (h | h) h'
    · exact lt_asymm h h'
    · subst h; exact DenseOrder.lt_irrefl _ h'

theorem not_le_iff_gt (a b : α) : ¬ (lt a b ∨ a = b) ↔ lt b a := by
  constructor
  · intro h
    rcases DenseOrder.lt_trichotomy a b with h1 | h1 | h1
    · exact absurd (Or.inl h1) h
    · exact absurd (Or.inr h1) h
    · exact h1
  · rintro h (h' | h')
    · exact lt_asymm h h'
    · subst h'; exact DenseOrder.lt_irrefl _ h

/-- The negated operator holds exactly when the operator does not. -/
theorem holds_negate (op : Op) (x v : α) : holds op.negate x v ↔ ¬ holds op x v := by
  cases op
  · exact Iff.rfl
  · exact Classical.not_not.symm
  · exact (not_lt_iff_ge x v).symm
  · exact (not_le_iff_gt x v).symm
  · show (lt x v ∨ x = v) ↔ ¬ lt v x
    rw [not_lt_iff_ge, eq_comm]
  · show lt x v ↔ ¬ (lt v x ∨ x = v)
    rw [eq_comm, not_le_iff_gt]

/-- **`numeric_constraint_entailed/3` is exact.** It is true exactly when
every admissible assignment that satisfies the premises satisfies the
claim. -/
theorem entailed_iff (isInt : Nat → Bool) (premises : List (Constraint α)) (claim : Constraint α) :
    entailed isInt premises claim = true ↔
      ∀ assign : Nat → α, Admissible isInt assign →
        (∀ p ∈ premises, holds p.op (assign p.var) p.value) →
          holds claim.op (assign claim.var) claim.value := by
  unfold entailed
  rw [Bool.not_eq_true', ← Bool.not_eq_true, satisfiable_iff]
  simp only [List.mem_cons, forall_eq_or_imp, holds_negate, not_exists, not_and]
  constructor
  · intro h assign hadm hp
    apply Classical.byContradiction
    intro hn
    exact h assign hadm hn hp
  · intro h assign hadm hn hp
    exact hn (h assign hadm hp)

end KibiIntervals
