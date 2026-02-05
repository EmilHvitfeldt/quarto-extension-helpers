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
- The CSS class or span syntax used (e.g., `.lightbox`, `.fancy`)
- A list of attributes the extension supports with:
  - Attribute name
  - Type: `enum`, `boolean`, `number`, or `color`
  - Valid values (for enum/boolean)
  - Default value
  - Description
- Whether the extension has color attributes (for color picker support)

### 2. Create Extension File

Create `src/<extension-name>.ts` following the pattern in `src/roughnotation.ts`.

**Reference `src/roughnotation.ts` directly** for the full implementation pattern. Key structures needed:

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

**Helper methods to implement** (see `src/roughnotation.ts` for reference):
- `getSpanContext(lineText, cursorPos)` - Find `{...}` brackets around cursor
- `is<ExtensionName>Span(content)` - Check if span has the extension's class
- `getCompletionContext(textBeforeCursor)` - Determine if completing attribute name or value
- `getAttributeNameCompletions(...)` - Generate attribute name completion items
- `getAttributeValueCompletions(...)` - Generate attribute value completion items
- `getUsedAttributes(content)` - Extract already-used attributes to filter from suggestions

### 3. Register in extension.ts

Add import and registration in `src/extension.ts`:

```typescript
import { <ExtensionName>CompletionProvider } from './<extension-name>';
// If has colors:
import { <ExtensionName>CompletionProvider, <ExtensionName>ColorProvider } from './<extension-name>';

// In activate():
register<ExtensionName>Provider(context, quartoSelector);
// If has colors:
register<ExtensionName>ColorProvider(context, quartoSelector);

// Add registration function:
function register<ExtensionName>Provider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new <ExtensionName>CompletionProvider();
  const triggerCharacters = [' ', '=', '-', '.'];  // Include '.' for typing after {.

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

### 4. Create Example File

Create `examples/<extension-name>-demo.qmd`:

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
```

### 5. Update Documentation

Update `README.md`:
- Add extension to the supported extensions table with checkmarks for features
- Add a section describing the extension's features
- Include TODO comments for screenshots/gifs:
  ```markdown
  <!-- TODO: Add gif showing <extension-name> autocomplete -->
  ```

Update `CHANGELOG.md`:
- Add entry under `[Unreleased]`:
  ```markdown
  ### Added
  - **<Extension Name> support**: Autocomplete for all <extension-name> attributes
  ```

### 6. Compile and Verify

Run `npm run compile` to verify there are no TypeScript errors.

## Example

```
User: /add-extension lightbox

Claude: I'll help you add support for the lightbox extension. First, let me gather some information:

1. What is the GitHub repository URL for this extension?
2. What CSS class does it use (e.g., `.lightbox`)?
3. What attributes does it support? For each, please provide:
   - Name (e.g., `group`, `desc-position`)
   - Type (enum/boolean/number/color)
   - Valid values (if enum/boolean)
   - Default value
   - Brief description
4. Does it have any color-related attributes that should support the color picker?
```
