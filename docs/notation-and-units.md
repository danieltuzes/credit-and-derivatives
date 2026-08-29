# Notation and units

The notation collection is the authoritative glossary. This document records
cross-cutting conventions so editors do not reuse a glyph for an incompatible
meaning or hide a unit conversion.

## Authoring rules

- A semantic key names a meaning; `notation` stores its LaTeX. Never resolve a
  definition by raw LaTeX.
- Reuse an entry under `src/content/notation/` when the same meaning appears in
  more than one lesson. Keep lesson-only bookkeeping in `notation.local`.
- Declare shared imports in lesson `notation.uses`. Local keys are already in
  that lesson's scope and are not repeated in `uses`.
- Use `\term\{semantic-key\}` in `.mdx` prose. MDX consumes the brace escapes
  before the notation plugin sees the normal `\term{semantic-key}` form.
  Shared `.md` notation bodies use `\term{semantic-key}` directly.
- Use `\explain{semantic-key}{complete LaTeX token}` inside `$...$` or
  `$$...$$` math. Do not use `\(...\)` or `\[...\]` as lesson math delimiters.
- Annotate the complete token, including its subscript or arguments. Nested
  `\explain` calls are allowed when both the outer expression and inner symbol
  have distinct meanings.
- Bare LaTeX is allowed when no explanation is useful. Do not annotate every
  digit, operator, or universally understood symbol merely to increase
  coverage.
- Shared entries carry sources, curriculum alignment, review status, and AI
  provenance. Page-local entries carry alignment and inherit the lesson's
  status; add sources when they make sourced claims.
- Do not use `\explain[def]`, `:::def`, a hand-authored JavaScript dictionary,
  raw HTML, MathJax, or a remote math script.

## Unit and convention rules

- Decimal rates are used in code: `0.05` means 5%.
- User interfaces label percentage inputs and convert at their boundary.
- Basis points must be named explicitly: 100 bp = 1 percentage point = 0.01 in
  decimal-rate units.
- An annualized rate must name its convention. The current toy model writes the
  nominal annual rate as $j^{(m)}$, its frequency as $m$, and its periodic rate
  as $r_m=j^{(m)}/m$.
- Time zero is the valuation date. A payment time $t_k$ is measured from that
  date and is not itself a calendar date or payment index.
- Time is expressed in years only when the model states what makes that
  meaningful. The current eight-lesson slice uses exact model-year times and
  explicitly defers day counts and business-day adjustments.
- Cash-flow signs state the holder or counterparty perspective. Current lesson
  examples use positive for received and negative for paid by the named holder.
- Currency amounts name their currency or are explicitly synthetic.
- Date-only financial schedules must not use local-time arithmetic.
- Bond payment frequency uses $m_B$ so it is not silently confused with a
  generic compounding frequency $m$.
- Yield to maturity is written $y^{(m_B)}$ in the current toy model. It is not
  silently interchangeable with coupon rate, spot rate, effective annual rate,
  probability, expected return, or guaranteed realized return.
- The current $P_0$ is the positive present value of promised bond cash flows
  under settlement-on-coupon-date assumptions. Clean price, accrued interest,
  default adjustment, and quoted price are not yet represented by that key.

## Current canonical families

| Meaning                | Semantic key             | Current notation |
| ---------------------- | ------------------------ | ---------------- |
| Valuation origin       | `valuation-time`         | $0$              |
| Payment time           | `payment-time`           | $t_k$            |
| Signed cash flow       | `signed-cash-flow`       | $CF_k$           |
| Nominal annual rate    | `nominal-annual-rate`    | $j^{(m)}$        |
| Compounding frequency  | `compounding-frequency`  | $m$              |
| Periodic rate          | `periodic-rate`          | $r_m$            |
| Accumulation factor    | `accumulation-factor`    | $A(0,t)$         |
| Discount factor        | `discount-factor`        | $D(0,t)$         |
| Present value          | `present-value`          | $PV_0$           |
| Face value             | `face-value`             | $F$              |
| Annual coupon rate     | `annual-coupon-rate`     | $c$              |
| Bond payment frequency | `bond-payment-frequency` | $m_B$            |
| Coupon payment         | `coupon-payment`         | $C$              |
| Maturity time          | `maturity-time`          | $T$              |
| Bond price             | `bond-price`             | $P_0$            |
| Yield to maturity      | `yield-to-maturity`      | $y^{(m_B)}$      |

This table is an orientation aid, not a second database. Change the collection
entry first, validate all references, and then update this table if the
cross-cutting convention changed.
