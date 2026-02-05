# Changelog

All notable changes to the Quarto Extension Helpers extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - YYYY-MM-DD

### Added

- Initial release
- **Roughnotation support:**
  - Autocomplete for all roughnotation attributes (`rn-type`, `rn-color`, `rn-animate`, etc.)
  - Value suggestions for enum attributes (annotation types, bracket positions, booleans)
  - VS Code color picker integration for `rn-color`
  - Brand color support from `_brand.yml` palette
  - Automatic trigger after attribute completion
  - Filter-aware activation (only enables when `roughnotation` is in frontmatter)
