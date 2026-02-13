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

Create `src/<extension-name>.ts` using the shared utilities.

**Key imports to use:**

```typescript
import * as vscode from 'vscode';
import { ShortcodeContext, AttributeDefinition } from './types';
import {
  getShortcodeContext,
  analyzeShortcodeContext,       // For shortcodes with primary value (icon, file)
  analyzeAttributeOnlyContext,   // For shortcodes with only attributes
  createReplaceRange,
  createAttributeNameCompletions,
  createAttributeValueCompletions,
  buildCategoryOrder,            // If grouping attributes by category
} from './shortcode-provider';
import { hasFilter, getBrandColors } from './utils';
import { SHORTCODE, FILTER } from './constants';
```

**For shortcode-based extensions** (e.g., `{{< name attr=value >}}`):

Reference these files as templates:
- `src/countdown.ts` - Attributes-only shortcode with color support
- `src/fontawesome.ts` - Shortcode with primary value (icon) + attributes
- `src/downloadthis.ts` - Shortcode with primary value (file) + attributes
- `src/now.ts` / `src/acronyms.ts` - Simple shortcodes with single primary value

```typescript
import * as vscode from 'vscode';
import { ShortcodeContext, AttributeDefinition } from './types';
import {
  getShortcodeContext,
  analyzeAttributeOnlyContext,
  createAttributeNameCompletions,
  createAttributeValueCompletions,
} from './shortcode-provider';
import { getBrandColors } from './utils';
import { SHORTCODE } from './constants';

const SHORTCODE_NAME = 'extension-name';  // Or add to constants.ts

const ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'attr-name',
    description: 'What this attribute does',
    valueType: 'enum',  // or 'boolean', 'number', 'string', 'color'
    values: ['option1', 'option2'],
    defaultValue: 'option1',
    category: 'Category',  // Optional for grouping
  },
];

export class ExtensionNameCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const lineText = document.lineAt(position).text;

    const baseContext = getShortcodeContext(lineText, position.character, SHORTCODE_NAME);
    if (!baseContext) {
      return undefined;
    }

    // Get content before cursor for analysis
    const marker = `{{< ${SHORTCODE_NAME}`;
    const markerEnd = lineText.lastIndexOf(marker) + marker.length;
    const contentBeforeCursor = lineText.substring(markerEnd, position.character);
    const hasSpaceAfterName = lineText[markerEnd] === ' ';

    const context = analyzeAttributeOnlyContext(
      baseContext,
      contentBeforeCursor,
      position.character,
      hasSpaceAfterName
    );

    switch (context.completionType) {
      case 'attribute-name':
        return createAttributeNameCompletions(ATTRIBUTES, context, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(context, position, document);
      default:
        return undefined;
    }
  }

  private async getAttributeValueCompletions(
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const attr = ATTRIBUTES_MAP.get(context.attributeName || '');
    if (!attr) {
      return [];
    }

    // For color attributes, fetch brand colors
    const brandColors = attr.valueType === 'color'
      ? await getBrandColors(document)
      : [];

    return createAttributeValueCompletions(attr, context, position, brandColors);
  }
}
```

**For span-based extensions** (e.g., `{.class attr=value}`):

Reference `src/roughnotation.ts` as template. These require:
- Filter detection via `hasFilter(document, 'filter-name')`
- Custom span context detection (cursor inside `{...}`)

### 3. Add Constants

Add shortcode/filter name to `src/constants.ts`:

```typescript
export const SHORTCODE = {
  // ... existing
  NEW_EXTENSION: 'new-extension',
} as const;

// If span-based with filter:
export const FILTER = {
  // ... existing
  NEW_EXTENSION: 'new-extension',
} as const;
```

### 4. Add Configuration Setting

Add a setting to `package.json` under `contributes.configuration.properties`:

```json
"quartoExtensionHelpers.<extension-name>.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable autocomplete support for the <extension-name> extension"
}
```

### 5. Register in extension.ts

Add to the `PROVIDERS` array in `src/extension.ts`:

```typescript
import { ExtensionNameCompletionProvider } from './extension-name';

const PROVIDERS: ProviderConfig[] = [
  // ... existing providers
  {
    configKey: 'extension-name',
    createProvider: () => new ExtensionNameCompletionProvider(),
    triggerCharacters: [' ', '='],  // Adjust as needed
    // If has color provider:
    additionalProviders: [
      {
        register: (context, selector) => {
          context.subscriptions.push(
            vscode.languages.registerColorProvider(selector, new ExtensionNameColorProvider())
          );
        },
      },
    ],
  },
];
```

### 6. Create Example Files

Create an extension-specific example folder:

#### For shortcode-based extensions:
- `examples/<extension-name>/demo.qmd`

#### For span-based extensions (with filter):
- `examples/<extension-name>/without-brandyml/demo.qmd` - Main demo
- `examples/<extension-name>/with-brandyml/demo.qmd` - Color demo (if has colors)
- `examples/<extension-name>/with-brandyml/_brand.yml` - Brand colors

### 7. Update Documentation (MANDATORY)

#### Update `README.md`:
1. Add to "Supported Extensions" list
2. Add a new section with documentation
3. Add to "Acknowledgments"

#### Update `CHANGELOG.md`:
Add entry under `[Unreleased]`

### 8. Compile and Verify

Run `npm run compile` and `npm run lint` to verify no errors.

### 9. Final Checklist

- [ ] `src/<extension-name>.ts` created using shared utilities
- [ ] Constants added to `src/constants.ts`
- [ ] Configuration setting added to `package.json`
- [ ] Provider added to `PROVIDERS` array in `src/extension.ts`
- [ ] Example files created
- [ ] `README.md` updated
- [ ] `CHANGELOG.md` updated
- [ ] `npm run compile` succeeds
- [ ] `npm run lint` succeeds
