# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- Failed schedule attempts now clear stale output instead of leaving the previous result visible
- Clearing pre-leave selections in the modal no longer overwrites saved data unless the user clicks Save
- CSV export now keeps the weekday column aligned with the schedule that was actually generated, even if the month input changes afterward

### Changed

- Added a regression check for failed schedule attempts to `CONTRIBUTING.md`
- Updated the pre-leave modal copy to make Save and Cancel behavior explicit
- Added a regression check for pre-leave cancel behavior to `CONTRIBUTING.md`
- Added release and maintenance checklist notes to `CONTRIBUTING.md`
- Updated `README.md` with the live GitHub Pages demo URL and a demo preset example

## [0.1.0] - 2026-06-02

### Added

- Root `README.md` with project overview and clinical workflow framing
- MIT `LICENSE`
- `CONTRIBUTING.md`
- GitHub issue templates and pull request template

### Changed

- Refreshed `docs/` demo into a UTF-8 static application with:
  - clean interface copy
  - pre-leave planner
  - avoid-shift rules
  - printable schedule output
  - CSV export
  - workload summary table
- Clarified repo structure and demo deployment notes for GitHub Pages

### Historical project capabilities now documented

- Monthly doctor schedule generation
- Support for up to 80 doctors
- Pre-leave matrix for unavailable dates
- Doctor-specific avoid-shift rules
