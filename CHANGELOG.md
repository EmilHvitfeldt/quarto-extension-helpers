# Changelog

All notable changes to the Quarto Extension Helpers extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Countdown support:**
  - Autocomplete for countdown timer shortcodes (`{{< countdown ... >}}`)
  - Timer attributes: `minutes`, `seconds`, `play_sound`, `start_immediately`, `warn_when`, `update_every`, `blink_colon`
  - Position attributes: `top`, `bottom`, `left`, `right`
  - Style attributes: `font_size`, `margin`, `padding`, `border_width`, `border_radius`, `line_height`, `box_shadow`, `id`
  - Color attributes for base, running, warning, and finished states
  - Boolean value suggestions (`true`/`false`)
  - Brand color integration from `_brand.yml` for color attributes
  - Common CSS color suggestions

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
- **FontAwesome support:**
  - Autocomplete for FontAwesome 6 free icons in `{{< fa ... >}}` shortcodes
  - Support for regular icons (e.g., `thumbs-up`, `arrow-right`)
  - Support for brand icons (e.g., `brands github`, `brands twitter`)
  - Attribute autocomplete for `size` and `title`
  - Size value suggestions (relative, literal, and LaTeX sizing)
