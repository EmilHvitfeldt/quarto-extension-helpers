# Add Quarto Extension Helper

Scaffolds a new Quarto extension helper with completion provider, attributes, and registration.

## Usage

```
/add-extension <extension-name>
```

## Arguments

- `extension-name`: The name of the Quarto extension (e.g., `lightbox`, `fancy-text`)

## Instructions

When the user runs this skill, follow these steps:

### 1. Gather Information

Ask the user for:
- The extension's GitHub repository URL (for documentation reference)
- **Syntax type**: Does it use:
  - **Span syntax**: `{.class-name attr=value}` (e.g., roughnotation)
  - **Shortcode syntax**: `{{< shortcode attr=value >}}` (e.g., fontawesome, countdown)
- The CSS class or shortcode name used (e.g., `.lightbox`, `countdown`)
- A list of attributes the extension supports with:
  - Attribute name
  - Type: `enum`, `boolean`, `number`, `string`, or `color`
  - Valid values (for enum/boolean)
  - Default value
  - Description
- Whether the extension has color attributes (for brand color support)

### 2. Create Extension File

Create `src/<extension-name>.ts` following the appropriate pattern:

- **For span-based extensions** (e.g., `{.class attr=value}`): Reference `src/roughnotation.ts`
- **For shortcode-based extensions** (e.g., `{{< name attr=value >}}`): Reference `src/fontawesome.ts` or `src/countdown.ts`

**Key structures needed:**

```typescript
import * as vscode from 'vscode';
import { hasFilter, getBrandColors, BrandColor } from './utils';

type ValueType = 'enum' | 'boolean' | 'color' | 'number';

// Use a prefix for the extension (e.g., RN_ for roughnotation, LB_ for lightbox)
interface <Prefix>Attribute {
  name: string;
  description: string;
  valueType: ValueType;
  values?: string[];
  placeholder?: string;
  defaultValue?: string;
}

// For detecting cursor position in spans
interface SpanContext {
  content: string;
}

// For determining what completions to show
interface CompletionContext {
  type: 'attribute-name' | 'attribute-value';
  prefix?: string;
  attributeName?: string;
  needsLeadingSpace?: boolean;  // Handle case when no space after class
}

const <PREFIX>_ATTRIBUTES: <Prefix>Attribute[] = [
  // Add attributes here
];

// Build a Map for O(1) attribute lookup
const <PREFIX>_ATTRIBUTES_MAP = new Map<string, <Prefix>Attribute>(
  <PREFIX>_ATTRIBUTES.map(attr => [attr.name, attr])
);
```

**Key implementation details:**
- Use `hasFilter(document, '<extension-name>')` to check if extension is enabled
- Make `provideCompletionItems` async if using brand colors: `async provideCompletionItems(...): Promise<vscode.CompletionItem[] | undefined>`
- Detect span context (cursor inside `{...}` with correct class)
- Handle `needsLeadingSpace` - add space prefix when user completes directly after class
- Set replacement range to handle prefix replacement (e.g., `rn-` → `rn-color=`)
- Use `item.command` to trigger suggestions after inserting attribute with `=`
- If extension has color attributes:
  - Integrate brand colors from `_brand.yml` using `getBrandColors(document)`
  - Insert hex values for brand colors (not names) since extensions don't understand brand names
  - Implement `DocumentColorProvider` for color picker support

**Helper methods to implement:**

For **span-based extensions** (see `src/roughnotation.ts`):
- `getSpanContext(lineText, cursorPos)` - Find `{...}` brackets around cursor
- `is<ExtensionName>Span(content)` - Check if span has the extension's class
- `getCompletionContext(textBeforeCursor)` - Determine if completing attribute name or value
- `getAttributeNameCompletions(...)` - Generate attribute name completion items
- `getAttributeValueCompletions(...)` - Generate attribute value completion items
- `getUsedAttributes(content)` - Extract already-used attributes to filter from suggestions

For **shortcode-based extensions** (see `src/countdown.ts`):
- `getShortcodeContext(lineText, cursorPos)` - Find `{{< name ... >}}` around cursor
- `analyzeContext(...)` - Determine if completing attribute name or value
- `getAttributeNameCompletions(...)` - Generate attribute name completion items
- `getAttributeValueCompletions(...)` - Generate attribute value completion items
- Note: No filter detection needed - shortcode syntax (`{{< name`) is distinctive

### 3. Add Configuration Setting

Add a setting to `package.json` under `contributes.configuration.properties` to allow users to enable/disable the extension:

```json
"quartoExtensionHelpers.<extension-name>.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable autocomplete support for the <extension-name> extension"
}
```

### 4. Register in extension.ts

Add import and registration in `src/extension.ts`:

```typescript
import { <ExtensionName>CompletionProvider } from './<extension-name>';
// If has colors:
import { <ExtensionName>CompletionProvider, <ExtensionName>ColorProvider } from './<extension-name>';

// In activate(), wrap registration in config check:
if (config.get<boolean>('<extension-name>.enabled', true)) {
  register<ExtensionName>Provider(context, quartoSelector);
  // If has colors:
  register<ExtensionName>ColorProvider(context, quartoSelector);
}

// Add registration function:
function register<ExtensionName>Provider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new <ExtensionName>CompletionProvider();
  // For span-based: [' ', '=', '-', '.']  - Include '.' for typing after {.
  // For shortcode-based: [' ', '=']  - Trigger after shortcode name and for values
  const triggerCharacters = [' ', '=', '-', '.'];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}

// If has colors, add color provider registration:
function register<ExtensionName>ColorProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new <ExtensionName>ColorProvider();

  context.subscriptions.push(
    vscode.languages.registerColorProvider(selector, provider)
  );
}
```

### 5. Create Example Files

Create an extension-specific example folder with demo files.

#### For span-based extensions (with filter detection):

- `examples/<extension-name>/without-brandyml/demo.qmd` - **Main demo** with all features
- `examples/<extension-name>/with-brandyml/demo.qmd` - **Color demo** (only if extension has color attributes)
- `examples/<extension-name>/with-brandyml/_brand.yml` - Brand colors file

**`_brand.yml`** (copy from roughnotation example or create new):

```yaml
meta:
  name: "Example Brand"

color:
  palette:
    primary-blue: "#447099"
    accent-orange: "#EE6331"
    success-green: "#72994E"
```

**Span-based demo.qmd:**

```markdown
---
title: <Extension Name> Demo
filters:
  - <extension-name>
---

## Autocomplete Examples

### Basic usage
[Example text]{.<class-name> }

### With attributes
[Example text]{.<class-name> attr=value}

### All attribute types
- Show examples of each attribute...
```

#### For shortcode-based extensions (no filter needed):

- `examples/<extension-name>/demo.qmd` - **Main demo** with all features

**Shortcode-based demo.qmd:**

```markdown
---
title: <Extension Name> Demo
---

## Basic Usage

{{< shortcode-name attr=value >}}

## All Attributes

### Timer/Core attributes
{{< shortcode-name attr1=value1 >}}

### Style attributes
{{< shortcode-name style-attr=value >}}

### Color attributes (if applicable)
{{< shortcode-name color_attr=blue >}}

## Try Autocomplete

1. Type `{{< shortcode-name ` and press space to see attribute suggestions
2. After `attr=`, see available values
```

### 6. Update Documentation (MANDATORY)

**IMPORTANT**: Documentation updates are required for every new extension. Do not skip this step.

#### Update `README.md`:

1. **Add to Supported Extensions list** (near the top of the file):
   ```markdown
   ### Supported Extensions

   - [roughnotation](https://github.com/EmilHvitfeldt/quarto-roughnotation)
   - [fontawesome](https://github.com/quarto-ext/fontawesome)
   - [countdown](https://github.com/gadenbuie/countdown)
   - [<extension-name>](<github-url>)  <!-- ADD THIS LINE -->
   ```

2. **Add a new section** after the existing extension sections (before "## Requirements"):
   ```markdown
   ### <Extension Name>

   Provides intelligent autocomplete for [<extension-name>](<github-url>) <brief description>.

   #### Attribute Autocomplete

   Type inside `{.<class-name> }` or `{{< <shortcode> ... >}}` to get suggestions for all <extension-name> attributes:

   <!-- TODO: Add gif showing attribute autocomplete -->

   **<Category> attributes:**
   - `attr1` - Description
   - `attr2` - Description

   #### Value Autocomplete

   After typing an attribute name and `=`, get suggestions for valid values:

   - <Describe what values are suggested>

   #### Brand Color Integration (if applicable)

   If your project has a `_brand.yml` file, brand colors appear first in color attribute suggestions.

   **Examples:**
   ```markdown
   <!-- Show 3-4 example usages -->
   ```
   ```

3. **Add to Acknowledgments** (at the bottom):
   ```markdown
   ## Acknowledgments

   - [<Extension Name>](<url>) - Brief description
   ```

#### Update `CHANGELOG.md`:

Add a detailed entry under `[Unreleased]`:
```markdown
## [Unreleased]

### Added

- **<Extension Name> support:**
  - Autocomplete for <extension-name> <syntax type> (`{.<class> }` or `{{< shortcode >}}`)
  - <List main attribute categories>
  - <List special features like boolean values, color suggestions, brand colors>
```

### 7. Compile and Verify

Run `npm run compile` to verify there are no TypeScript errors.

### 8. Final Checklist

Before completing, verify all items:

- [ ] `src/<extension-name>.ts` created with CompletionProvider
- [ ] Configuration setting added to `package.json` (`quartoExtensionHelpers.<extension-name>.enabled`)
- [ ] Provider registered in `src/extension.ts` with config check
- [ ] Example folder created at `examples/<extension-name>/`
- [ ] Demo file(s) created showing all features
- [ ] `README.md` updated:
  - [ ] Added to "Supported Extensions" list
  - [ ] New section with full documentation
  - [ ] Added to "Acknowledgments"
- [ ] `CHANGELOG.md` updated with detailed entry under `[Unreleased]`
- [ ] `npm run compile` succeeds

## Examples

### Span-based Extension

```
User: /add-extension lightbox

Claude: I'll help you add support for the lightbox extension. First, let me gather some information:

1. What is the GitHub repository URL for this extension?
2. Does it use span syntax ({.class attr=value}) or shortcode syntax ({{< name attr=value >}})?
3. What CSS class does it use (e.g., `.lightbox`)?
4. What attributes does it support? For each, please provide:
   - Name (e.g., `group`, `desc-position`)
   - Type (enum/boolean/number/string/color)
   - Valid values (if enum/boolean)
   - Default value
   - Brief description
5. Does it have any color-related attributes that should support brand colors?
```

### Shortcode-based Extension

```
User: /add-extension countdown

Claude: I'll help you add support for the countdown extension. First, let me gather some information:

1. What is the GitHub repository URL for this extension?
2. Does it use span syntax or shortcode syntax? (It looks like shortcode: {{< countdown ... >}})
3. What shortcode name does it use?
4. What attributes does it support? For each, please provide:
   - Name (e.g., `minutes`, `seconds`, `play_sound`)
   - Type (enum/boolean/number/string/color)
   - Valid values (if enum/boolean)
   - Default value
   - Brief description
5. Does it have any color-related attributes that should support brand colors?
```
