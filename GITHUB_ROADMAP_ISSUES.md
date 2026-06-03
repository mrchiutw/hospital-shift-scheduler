# GitHub Roadmap Issue Notes

以下條目可直接整理成 GitHub issue。

---

## 1. [docs] Improve README clarity and onboarding

### Body

The README already covers the core workflow, but it can still better guide first-time users through the tool and its current assumptions.

Scope:

- tighten the English summary for first-time users
- add a clearer demo / deployment note
- document current scheduling assumptions and non-goals
- keep all claims conservative and verifiable

Why:

This repository should be easy to understand for both clinical users and developers.

Labels:

- `documentation`

---

## 2. [bug] Verify UTF-8 rendering across GitHub and deployed demo

### Body

We refreshed the demo and root documentation, but UTF-8 rendering still needs verification across environments.

Scope:

- verify README rendering on GitHub
- verify demo text in deployed Pages build
- check CSV export opens correctly in spreadsheet tools
- identify any remaining mojibake or fallback-font issues

Labels:

- `bug`
- `documentation`

---

## 3. [feature] Expand scheduling constraints for real-world duty rules

### Body

The current tool supports pre-leave and doctor-specific shift avoidance, but real-world scheduling may require more constraints.

Possible next steps:

- stronger consecutive-shift rules
- weekend or holiday balancing
- custom rest windows after night shifts
- configurable shift mix by department

Goal:

Improve real-world usability without turning the tool into a heavyweight system.

Labels:

- `enhancement`

---

## 4. [feature] Improve manual adjustment workflow after auto-generation

### Body

The current focus is candidate schedule generation. The next improvement area is manual refinement after generation.

Ideas:

- easier row / column review
- quick swap or re-roll helpers
- better visibility for pre-leave cells in final output
- export formats that support downstream manual editing

Labels:

- `enhancement`
- `ux`

---

## 5. [docs] Add release and maintenance workflow notes

### Body

This repository now has the core docs in place, but the release and maintenance workflow should be written down more explicitly.

Scope:

- document how to publish a release
- clarify what belongs in `docs/`, `docs_legacy/`, and `Reference/`
- define lightweight acceptance checks before release
- keep the repo easy to maintain as a static browser tool

Labels:

- `documentation`
- `maintenance`
