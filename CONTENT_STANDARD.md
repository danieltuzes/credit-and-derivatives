# Content standard

Every lesson must declare a stable lesson ID, status, required and taught
competencies, assessments, sources, assumptions, and whether AI materially
assisted it.

Quantitative lessons must provide intuition, notation and units, model and
market conventions, a reproducible example, checks for understanding, visible
limitations, and source locators. Contractual language must be paraphrased and
cited unless its license explicitly permits copying.

Every variable shown in a quantitative lesson's rendered mathematics must
resolve to a semantic notation key; the content validator fails on an
unresolved variable. Sub-expression and whole-equation explanations are
reviewed content with their own editorial status, sources, and curriculum
alignment. A quantitative reviewer checks the per-lesson resolution report and
the authoring overlay, not raw markup.

Every competency must be atomic and observable. Every taught competency needs
the minimum evidence declared in its record, including a transfer item when
required. Reading a page is not evidence of competency.

The schemas in `src/content.config.ts`, the semantic rules in
`src/curriculum/validation.ts`, and the notation registry checks in
`src/notation/` are enforceable counterparts to this policy.
