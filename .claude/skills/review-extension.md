# Review Extension Implementation

Reviews a Quarto extension helper for correctness, completeness, and best practices.

## Usage

```
/review-extension <extension-name>
```

## Arguments

- `extension-name`: The extension to review (e.g., `roughnotation`)

## Instructions

When the user runs this skill, perform a comprehensive review by reading:
- `src/<extension-name>.ts`
- `src/extension.ts`
- `examples/<extension-name>/with-brandyml/demo.qmd`
- `examples/<extension-name>/without-brandyml/demo.qmd`
- `README.md`
- `CHANGELOG.md`

### 1. Code Quality Checks

- [ ] TypeScript strict mode compliance (no `any` types, proper null checks)
- [ ] Proper use of VS Code API types
- [ ] Consistent code style with other extension files
- [ ] JSDoc comments on exported classes
- [ ] No unused imports or variables
- [ ] Proper interface definitions (`<Prefix>Attribute`, `SpanContext`, `CompletionContext`)

### 2. Completion Provider Checks

- [ ] Uses `hasFilter(document, '<extension-name>')` to check filter is enabled
- [ ] Properly detects span context (cursor inside `{...}` with correct class)
- [ ] `isExtensionSpan()` method matches class at start or after whitespace (not inside attribute values)
- [ ] Handles attribute name completions
- [ ] Handles attribute value completions
- [ ] Filters out already-used attributes via `getUsedAttributes()`
- [ ] `getUsedAttributes()` matches attributes after whitespace (avoids partial matches)
- [ ] Sets proper `CompletionItemKind`:
  - `Property` for attribute names
  - `Value` for attribute values
  - `Color` for color values
- [ ] Includes helpful `detail` and `documentation` on completion items
- [ ] Uses `sortText` to order completions (brand colors first, then defaults)
- [ ] Sets replacement `range` correctly (handles prefix like `rn-` replacement)
- [ ] Handles `needsLeadingSpace` - adds space when completing directly after class
- [ ] Uses `item.command` to trigger suggestions after attribute completion (for enum/boolean/color types)
- [ ] `provideCompletionItems` is async if using brand colors

### 3. Attribute Definition Checks

- [ ] All documented extension attributes are included
- [ ] Each attribute has correct `valueType`
- [ ] Enum attributes have complete `values` arrays
- [ ] Boolean attributes use `['true', 'false']` values
- [ ] Number attributes have sensible `placeholder` values
- [ ] `defaultValue` is set where applicable
- [ ] Descriptions are clear and helpful
- [ ] Attributes array uses correct naming (`<PREFIX>_ATTRIBUTES`)
- [ ] Map for O(1) lookup exists (`<PREFIX>_ATTRIBUTES_MAP`)

### 4. Color Support Checks (if applicable)

- [ ] Color attributes integrate with brand colors from `_brand.yml`
- [ ] `getBrandColors(document)` called for color attribute completions
- [ ] Brand colors insert hex values (not names) since extensions don't understand brand names
- [ ] Brand colors show name in label but hex in `insertText`
- [ ] `DocumentColorProvider` implemented with:
  - [ ] `provideDocumentColors()` - finds color values in document
  - [ ] `provideColorPresentations()` - offers formats when using picker
- [ ] Color provider is async
- [ ] Parses multiple color formats (hex, rgb, rgba, named colors)
- [ ] Color presentations include brand color name as reference (but insert hex)

### 5. Registration Checks

- [ ] Completion provider is imported in `src/extension.ts`
- [ ] Completion provider is registered with trigger characters: `[' ', '=', '-', '.']`
- [ ] Color provider imported and registered (if applicable)
- [ ] Uses `vscode.languages.registerColorProvider()` for colors

### 6. Documentation Checks

- [ ] Extension added to README.md supported extensions list
- [ ] Extension has dedicated section in README.md
- [ ] Section includes TODO comments for screenshots/gifs
- [ ] Example folder exists at `examples/<extension-name>/`
- [ ] Example files exist in both subfolders:
  - `examples/<extension-name>/with-brandyml/demo.qmd`
  - `examples/<extension-name>/without-brandyml/demo.qmd`
- [ ] `_brand.yml` exists in `with-brandyml` folder
- [ ] Example files have correct YAML frontmatter with filter
- [ ] `without-brandyml/demo.qmd` demonstrates all attributes (main demo)
- [ ] `with-brandyml/demo.qmd` focuses only on color/brand integration (if extension has color attributes)
- [ ] CHANGELOG.md has entry under `[Unreleased]` or appropriate version

### 7. Output Format

Provide a summary table:

| Category | Status | Issues |
|----------|--------|--------|
| Code Quality | ✅/⚠️/❌ | List any issues |
| Completion Provider | ✅/⚠️/❌ | List any issues |
| Attributes | ✅/⚠️/❌ | List any issues |
| Color Support | ✅/⚠️/N/A | List any issues |
| Registration | ✅/⚠️/❌ | List any issues |
| Documentation | ✅/⚠️/❌ | List any issues |

Legend:
- ✅ = All checks pass
- ⚠️ = Minor issues or improvements suggested
- ❌ = Critical issues that should be fixed
- N/A = Not applicable (e.g., no color attributes)

Then provide specific recommendations for any issues found, with file paths and line numbers where applicable.

## Example

```
User: /review-extension roughnotation

Claude: I'll review the roughnotation extension implementation...

[Reads src/roughnotation.ts, src/extension.ts, README.md, examples/roughnotation/with-brandyml/demo.qmd, examples/roughnotation/without-brandyml/demo.qmd, CHANGELOG.md]

## Review Summary

| Category | Status | Issues |
|----------|--------|--------|
| Code Quality | ✅ | None |
| Completion Provider | ✅ | None |
| Attributes | ⚠️ | Consider adding `rn-delay` attribute |
| Color Support | ✅ | None |
| Registration | ✅ | None |
| Documentation | ⚠️ | Screenshot TODOs not completed |

## Recommendations

1. **Attributes** (minor): The roughnotation library supports an `rn-delay` attribute for delaying animation start, but it's not in `RN_ATTRIBUTES`. Consider adding:
   ```typescript
   {
     name: 'rn-delay',
     description: 'Delay before animation starts in milliseconds',
     valueType: 'number',
     placeholder: '0',
     defaultValue: '0'
   }
   ```

2. **Documentation** (minor): README.md has 5 TODO comments for screenshots/gifs that should be completed before publishing:
   - Line 5: Hero gif
   - Line 28: Attribute autocomplete gif
   - Line 35: Value autocomplete gif
   - Line 40: Color picker gif
   - Line 45: Brand colors screenshot

Overall the implementation is solid and follows best practices.
```
