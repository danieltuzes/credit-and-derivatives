# Notation and units

The notation collection is the authoritative glossary. This document records
cross-cutting conventions so editors do not reuse a glyph for an incompatible
meaning or hide a unit conversion.

Every variable in rendered lesson mathematics must resolve to a semantic key
(the content validator fails otherwise); the base notation library covers
universal constants and operators without any binding.

## Authoring rules

- A semantic key names a meaning; `notation` stores its LaTeX. Never resolve a
  definition by raw LaTeX.
- Coverage is enforced. Every variable in a lesson's rendered mathematics must
  resolve to a semantic key; `pnpm validate:content` fails on an unresolved
  variable and prints its `file:line`. Operators, digits, delimiters, the
  differential `d`, primes, and the base notation library need no binding.
- The base notation library (universal `notation` entries -- the circle
  constant, Euler's number, the imaginary unit, `\exp`, `\ln`, expectation,
  probability, the indicator, a generic summation index) is in every lesson's
  scope automatically. Do not import or redefine these.
- Binding resolves by a fixed ladder, checked at build time. Two candidates at
  any level is an error, never a guess:
  1. `\explain{key}{token}` on the token;
  2. an equation-local gloss;
  3. the nearest `\let{glyph}{key}` in the enclosing section;
  4. the nearest earlier `\def{glyph}{key}{...}` on the page;
  5. a unique match in the lesson's `notation.uses` (base library included);
  6. a unique match in the `notation` collection within the lesson's `domain`.
- Prefer scope. Add `\explain{key}{token}` only when the ladder cannot resolve
  the symbol or the equation renders a non-canonical glyph for its key. Use
  `\term\{key\}` in `.mdx` prose (MDX consumes the brace escapes before the
  notation plugin sees `\term{key}`); shared `.md` bodies use `\term{key}`.
- `\def{glyph}{key}{summary ...}` writes a positioned page-local definition
  (the shape of a `notation.local` entry) and binds from that point.
  `\let{glyph}{key}` re-binds an already-resolvable key for the enclosing
  section subtree only -- it ends at the next heading of equal or higher level
  -- and adds no content.
- Every equation must also resolve from the page's static bundle alone
  (`notation.local` plus `notation.uses` plus the base library); `\let` and
  `\def` only choose among in-scope meanings. A symbol that resolves only
  through narrative position, with no bundle entry, is a warning.
- Reusing one glyph for two meanings in a lesson is a warning. Acknowledge it
  with `notation.reusedGlyphs` or keep the meanings in separate `\let`
  sections.
- Sub-expressions are explainable only through a group macro carrying a key:
  `\group{expr}{key}` renders as plain math with a hover affordance;
  `\underbrace{expr}_{\explain{key}{...}}` renders the visible brace. Spans
  must be disjoint or fully nested; partial overlap is an error.
- A whole-equation meaning is the block attribute `:::equation{explains: key}`,
  not a symbol binding.
- Shared entries carry sources, curriculum alignment, review status, and AI
  provenance. Page-local entries (frontmatter or `\def`) carry alignment and
  inherit the lesson's status; add sources for sourced claims.
- The validator writes a per-lesson resolution report (symbol, key, level,
  location). Review it, and the authoring overlay, rather than raw MDX.
- A reader may mute an explanation by semantic key. Muting hides only the
  inline affordance and never a lesson's first canonical entry; the repository
  ships an initial muted set for the universal constants.
- Nested `\explain` calls are allowed when the outer expression and inner
  symbol have distinct meanings. Do not hand-author a JavaScript explanation
  dictionary, raw HTML, `\htmlData`, MathJax, or a remote math script.

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
  meaningful. The foundations and bond lessons use exact model-year times. The
  CDS teaching schedule also uses exact model periods and explicitly defers
  calendar dates, day counts, stubs, and business-day adjustments.
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
- Credit survival $S(0,t)$ and discounting $D(0,t)$ are separate inputs. A
  probability must not be used as a discount factor, or vice versa.
- CDS premium- and protection-leg present values are displayed as positive
  magnitudes. Protection-buyer net present value is signed as protection less
  premium.
- CDS spreads use decimal-per-year units in code and are converted explicitly
  to basis points per year at the UI boundary.

## Current canonical families

| Meaning                | Semantic key                   | Current notation |
| ---------------------- | ------------------------------ | ---------------- |
| Valuation origin       | `valuation-time`               | $0$              |
| Payment time           | `payment-time`                 | $t_k$            |
| Signed cash flow       | `signed-cash-flow`             | $CF_k$           |
| Nominal annual rate    | `nominal-annual-rate`          | $j^{(m)}$        |
| Compounding frequency  | `compounding-frequency`        | $m$              |
| Periodic rate          | `periodic-rate`                | $r_m$            |
| Accumulation factor    | `accumulation-factor`          | $A(0,t)$         |
| Discount factor        | `discount-factor`              | $D(0,t)$         |
| Present value          | `present-value`                | $PV_0$           |
| Face value             | `face-value`                   | $F$              |
| Annual coupon rate     | `annual-coupon-rate`           | $c$              |
| Bond payment frequency | `bond-payment-frequency`       | $m_B$            |
| Coupon payment         | `coupon-payment`               | $C$              |
| Maturity time          | `maturity-time`                | $T$              |
| Bond price             | `bond-price`                   | $P_0$            |
| Yield to maturity      | `yield-to-maturity`            | $y^{(m_B)}$      |
| Survival probability   | `survival-probability`         | $S(0,t)$         |
| Constant hazard rate   | `hazard-rate`                  | $\lambda$        |
| Interval default prob. | `interval-default-probability` | $\Delta q_i$     |
| Recovery rate          | `recovery-rate`                | $R$              |
| Loss given default     | `loss-given-default`           | $\mathrm{LGD}$   |
| CDS notional           | `cds-notional`                 | $N$              |
| CDS contractual spread | `cds-contract-spread`          | $s$              |
| CDS par spread         | `cds-par-spread`               | $s^{\star}$      |

This table is an orientation aid, not a second database. Change the collection
entry first, validate all references, and then update this table if the
cross-cutting convention changed.
