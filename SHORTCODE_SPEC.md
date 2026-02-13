# Shortcode Completion Spec

This document defines the YAML specification for declaratively describing Quarto shortcode completions.

## Overview

Each shortcode is defined in a YAML file that describes:
- The shortcode name
- Positional arguments (unnamed, order matters)
- Named attributes (key=value pairs)
- Completion sources for each argument/attribute

## File Location

Shortcode specs are stored in `src/specs/` as `<shortcode-name>.yaml`.

## Schema

```yaml
shortcode: <name>          # Required: shortcode name (e.g., "fa", "countdown")

arguments:                 # Optional: positional arguments (omit if none)
  - name: <identifier>     # Internal name for reference
    required: <boolean>    # Whether this argument is required (default: false)
    completion:            # How to provide completions
      type: <type>         # See "Completion Types" below
      # ... type-specific fields

attributes:                # Optional: named attributes (omit if none)
  - name: <identifier>     # Attribute name as used in shortcode
    description: <text>    # Help text shown in completion
    category: <text>       # Optional: group for sorting completions
    quoted: <boolean>      # Optional: wrap value in quotes (default: false)
    completion:            # How to provide completions
      type: <type>         # See "Completion Types" below
      # ... type-specific fields
```

## Completion Types

### File-related types comparison

| Type | What it completes | Source location |
|------|-------------------|-----------------|
| `file` | **File paths** in the workspace | User's workspace |
| `file-data` | **Data extracted from** a file | Bundled with extension |
| `workspace-file` | **Data extracted from** a file | User's workspace |

- **`file`**: User selects a file path (e.g., `data.csv`, `report.xlsx`)
- **`file-data`**: User selects values defined in an extension data file (e.g., icon names from `data/icons.json`)
- **`workspace-file`**: User selects values defined in a workspace file (e.g., color names from `_brand.yml`)

### `enum` - Hardcoded list of values

```yaml
completion:
  type: enum
  values: [option1, option2, option3]
  default: option1         # Optional: marks default in UI
```

### `boolean` - True/false values

```yaml
completion:
  type: boolean
  default: true            # Optional: marks default in UI
```

### `freeform` - No completions, just placeholder

```yaml
completion:
  type: freeform
  placeholder: "enter value"
```

### `file` - Workspace file paths

```yaml
completion:
  type: file
  extensions: [.csv, .xlsx, .json]  # Optional: filter by extension
```

### `color` - CSS colors + brand colors

```yaml
completion:
  type: color
  # Automatically includes:
  # - CSS named colors (red, blue, etc.)
  # - Brand colors from _brand.yml if present
```

### `file-data` - Values from JSON/YAML file in extension

```yaml
completion:
  type: file-data
  source: data/icons.json  # Path relative to extension root
  path: icons              # JSONPath/key to array of values
  labelPath: name          # Optional: field for completion label
  detailPath: category     # Optional: field for completion detail
```

### `frontmatter` - Values from document YAML frontmatter

```yaml
completion:
  type: frontmatter
  key: acronyms            # Key in frontmatter YAML
  valuePath: shortname     # Optional: field to use as completion value
```

### `workspace-file` - Values from file in workspace

```yaml
completion:
  type: workspace-file
  filename: _variables.yml # Filename to search for
  path: variables          # Path to data within file
```

### `none` - No completions available

```yaml
completion:
  type: none
```

## Full Examples

### Positional argument only (enum)

```yaml
shortcode: date

arguments:
  - name: format
    completion:
      type: enum
      values: [short, medium, long, full]
```

### Attributes only (mixed types, categories)

```yaml
shortcode: timer

attributes:
  - name: duration
    description: Duration in seconds
    category: Settings
    completion:
      type: freeform
      placeholder: "60"

  - name: autostart
    description: Start automatically
    category: Behavior
    completion:
      type: boolean
      default: false

  - name: background
    description: Background color
    category: Style
    completion:
      type: color
```

### Positional argument + attributes (file-data source)

```yaml
shortcode: emoji

arguments:
  - name: name
    required: true
    completion:
      type: file-data
      source: data/emojis.json
      path: emojis

attributes:
  - name: size
    description: Emoji size
    category: Style
    completion:
      type: enum
      values: [small, medium, large]
      default: medium

  - name: label
    description: Accessibility label
    category: Accessibility
    quoted: true
    completion:
      type: freeform
      placeholder: emoji description
```

### File path argument

```yaml
shortcode: include

arguments:
  - name: path
    required: true
    completion:
      type: file
      extensions: [.qmd, .md, .txt]

attributes:
  - name: caption
    description: Caption text
    quoted: true
    completion:
      type: freeform
      placeholder: Caption
```

### Frontmatter-based completions

```yaml
shortcode: term

arguments:
  - name: key
    required: true
    completion:
      type: frontmatter
      key: glossary
```

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Argument order | Array order = positional order in shortcode |
| Conditional attributes | Not supported - keeps spec simple |
| Validation rules | Not included - handled elsewhere if needed |
| Attribute categories | Supported via `category` field for sorting |
| Trigger characters | Global configuration, not per-shortcode |
| Empty arrays | Omit `arguments` or `attributes` if none exist |

## Usage Notes

1. **Positional arguments** appear before named attributes in the shortcode:
   ```
   {{< fa icon-name size=2x >}}
         ^^^^^^^^^^ ^^^^^^^^
         argument   attribute
   ```

2. **Categories** control sort order in the completion menu. Attributes without a category appear last.

3. **Quoted attributes** use `quoted: true` to insert `name="value"` instead of `name=value`.

4. **Defaults** marked with `default` show "(default)" in the completion detail and sort first.
