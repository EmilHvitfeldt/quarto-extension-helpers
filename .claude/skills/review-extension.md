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
- `src/types.ts` (for type definitions)
- `src/shortcode-provider.ts` (for shared utilities)
- `src/constants.ts` (for constants)
- `examples/<extension-name>/` folder
- `README.md`
- `CHANGELOG.md`

### 1. Architecture Checks

- [ ] Uses shared types from `src/types.ts` (`AttributeDefinition`, `ShortcodeContext`)
- [ ] Uses shared utilities from `src/shortcode-provider.ts` where applicable
- [ ] Uses constants from `src/constants.ts` for shortcode/filter names
- [ ] Uses color utilities from `src/color-utils.ts` (if has color support)
- [ ] No code duplication with other providers

### 2. Code Quality Checks

- [ ] TypeScript strict mode compliance (no `any` types, proper null checks)
- [ ] Proper use of VS Code API types
- [ ] Consistent code style with other extension files
- [ ] JSDoc comments on exported classes
- [ ] No unused imports or variables
- [ ] Passes `npm run lint`
- [ ] Passes `npm run test:unit`

### 3. Completion Provider Checks

**For shortcode-based extensions:**
- [ ] Uses `getShortcodeContext()` from shortcode-provider
- [ ] Uses `analyzeShortcodeContext()` or `analyzeAttributeOnlyContext()` for context analysis
- [ ] Uses `createAttributeNameCompletions()` for attribute suggestions
- [ ] Uses `createAttributeValueCompletions()` for value suggestions

**For span-based extensions:**
- [ ] Uses `hasFilter(document, 'filter-name')` to check filter is enabled
- [ ] Custom span context detection works correctly
- [ ] Uses shared helpers where possible (`getUsedAttributes`, `createReplaceRange`, etc.)

**General:**
- [ ] Handles attribute name completions
- [ ] Handles attribute value completions
- [ ] Filters out already-used attributes
- [ ] Sets proper `CompletionItemKind` (Property, Value, Color)
- [ ] Includes helpful `detail` and `documentation`
- [ ] Uses `sortText` to order completions appropriately
- [ ] Uses `item.command` to trigger suggestions after attribute completion

### 4. Attribute Definition Checks

- [ ] Uses `AttributeDefinition` type from `src/types.ts`
- [ ] All documented extension attributes are included
- [ ] Each attribute has correct `valueType`
- [ ] Enum attributes have complete `values` arrays
- [ ] Boolean attributes have `defaultValue` of 'true' or 'false'
- [ ] Number attributes have sensible `placeholder` values
- [ ] `defaultValue` set where applicable
- [ ] `category` set for organization (if using categories)
- [ ] Descriptions are clear and helpful

### 5. Color Support Checks (if applicable)

- [ ] Uses `getBrandColors(document)` from utils
- [ ] Uses color utilities from `src/color-utils.ts` for parsing
- [ ] Brand colors insert hex values (not names)
- [ ] Brand colors show name in label
- [ ] `DocumentColorProvider` implemented if interactive color picker is wanted

### 6. Registration Checks

- [ ] Provider added to `PROVIDERS` array in `src/extension.ts`
- [ ] Uses data-driven registration (not separate function)
- [ ] Correct `configKey` matching package.json setting
- [ ] Appropriate `triggerCharacters` specified
- [ ] Color provider registered via `additionalProviders` (if applicable)

### 7. Constants Checks

- [ ] Shortcode name defined in `src/constants.ts` (or local constant)
- [ ] Filter name defined in `src/constants.ts` (for span-based)
- [ ] No magic strings scattered in code

### 8. Documentation Checks

- [ ] Extension added to README.md supported extensions list
- [ ] Extension has dedicated section in README.md
- [ ] Section includes TODO comments for screenshots/gifs (or actual images)
- [ ] Example folder exists at `examples/<extension-name>/`
- [ ] Demo files demonstrate all features
- [ ] CHANGELOG.md has entry under `[Unreleased]` or appropriate version

### 9. Output Format

Provide a summary table:

| Category | Status | Issues |
|----------|--------|--------|
| Architecture | ✅/⚠️/❌ | List any issues |
| Code Quality | ✅/⚠️/❌ | List any issues |
| Completion Provider | ✅/⚠️/❌ | List any issues |
| Attributes | ✅/⚠️/❌ | List any issues |
| Color Support | ✅/⚠️/N/A | List any issues |
| Registration | ✅/⚠️/❌ | List any issues |
| Constants | ✅/⚠️/❌ | List any issues |
| Documentation | ✅/⚠️/❌ | List any issues |

Legend:
- ✅ = All checks pass
- ⚠️ = Minor issues or improvements suggested
- ❌ = Critical issues that should be fixed
- N/A = Not applicable (e.g., no color attributes)

Then provide specific recommendations for any issues found, with file paths and line numbers where applicable.

## Example

```
User: /review-extension countdown

Claude: I'll review the countdown extension implementation...

[Reads relevant files]

## Review Summary

| Category | Status | Issues |
|----------|--------|--------|
| Architecture | ✅ | Uses shared utilities correctly |
| Code Quality | ✅ | None |
| Completion Provider | ✅ | None |
| Attributes | ✅ | Complete attribute coverage |
| Color Support | ✅ | Brand colors integrated |
| Registration | ✅ | Properly registered in PROVIDERS array |
| Constants | ⚠️ | SHORTCODE_NAME could be in constants.ts |
| Documentation | ⚠️ | Screenshot TODOs not completed |

## Recommendations

1. **Constants** (minor): Consider moving `SHORTCODE_NAME` to `src/constants.ts`:
   ```typescript
   export const SHORTCODE = {
     // ...existing
     COUNTDOWN: 'countdown',
   } as const;
   ```

2. **Documentation** (minor): README.md has TODO comments for screenshots/gifs

Overall the implementation is solid and follows the new architecture patterns.
```
