# Contributing to Quarto Extension Helpers

Thank you for your interest in contributing! This guide will help you add support for new Quarto extensions.

## Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/EmilHvitfeldt/quarto-extension-helpers.git
   cd quarto-extension-helpers
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Open in VS Code:
   ```bash
   code .
   ```

4. Press F5 to launch the Extension Development Host with the example files.

## Project Structure

```
src/
  extension.ts          # Main entry point - data-driven provider registration
  types.ts              # Shared TypeScript types (AttributeDefinition, ShortcodeContext)
  shortcode-provider.ts # Shared utilities for shortcode parsing and completions
  color-utils.ts        # Color parsing and conversion utilities
  constants.ts          # Centralized constants (shortcode names, filters)
  utils.ts              # Filter detection and brand colors
  logger.ts             # Debug logging infrastructure
  <extension>.ts        # Extension-specific completion provider
  <extension>-icons.ts  # Optional: static data (e.g., icon lists)
examples/
  <extension>/          # Extension-specific test files
    demo.qmd            # Main demo file (shortcode-based)
    with-brandyml/      # Brand color testing (span-based)
    without-brandyml/   # Main testing (span-based)
```

## Adding Support for a New Extension

### 1. Create the Extension File

Create `src/<extension-name>.ts` using the shared utilities:

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

const SHORTCODE_NAME = 'myextension';

const ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'attr-name',
    description: 'What this attribute does',
    valueType: 'enum',  // 'enum' | 'boolean' | 'number' | 'string' | 'color'
    values: ['option1', 'option2'],
    defaultValue: 'option1',
    category: 'Category',  // Optional grouping
  },
];

const ATTRIBUTES_MAP = new Map<string, AttributeDefinition>(
  ATTRIBUTES.map(attr => [attr.name, attr])
);

export class MyExtensionCompletionProvider implements vscode.CompletionItemProvider {
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

    const brandColors = attr.valueType === 'color'
      ? await getBrandColors(document)
      : [];

    return createAttributeValueCompletions(attr, context, position, brandColors);
  }
}
```

### 2. Add Constants (Optional)

If you want centralized constants, add to `src/constants.ts`:

```typescript
export const SHORTCODE = {
  // ... existing
  MYEXTENSION: 'myextension',
} as const;
```

### 3. Register the Provider

Add to the `PROVIDERS` array in `src/extension.ts`:

```typescript
import { MyExtensionCompletionProvider } from './myextension';

const PROVIDERS: ProviderConfig[] = [
  // ... existing providers
  {
    configKey: 'myextension',
    createProvider: () => new MyExtensionCompletionProvider(),
    triggerCharacters: [' ', '='],
  },
];
```

### 4. Add Configuration Setting

Add to `package.json` under `contributes.configuration.properties`:

```json
"quartoExtensionHelpers.myextension.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Enable autocomplete support for the myextension extension"
}
```

### 5. Add Example Files

**For shortcode-based extensions:**
- `examples/<extension>/demo.qmd`

**For span-based extensions (with filter):**
- `examples/<extension>/without-brandyml/demo.qmd` - Main demo
- `examples/<extension>/with-brandyml/demo.qmd` - Color demo
- `examples/<extension>/with-brandyml/_brand.yml` - Brand colors

### 6. Update Documentation

- Add to `README.md` supported extensions list and add documentation section
- Add entry to `CHANGELOG.md` under `[Unreleased]`

### 7. Compile and Lint

```bash
npm run compile
npm run lint
```

## Architecture Patterns

### Shared Utilities (src/shortcode-provider.ts)

Use these instead of writing custom code:

| Function | Purpose |
|----------|---------|
| `getShortcodeContext()` | Parse cursor position within `{{< name ... >}}` |
| `analyzeShortcodeContext()` | Determine completion type for shortcodes with primary value |
| `analyzeAttributeOnlyContext()` | Determine completion type for attributes-only shortcodes |
| `createAttributeNameCompletions()` | Generate attribute name suggestions |
| `createAttributeValueCompletions()` | Generate value suggestions based on type |
| `createReplaceRange()` | Create replacement range for typed text |
| `getUsedAttributes()` | Find already-used attributes |
| `buildCategoryOrder()` | Create sorting map for categorized attributes |

### Shared Types (src/types.ts)

```typescript
interface AttributeDefinition {
  name: string;
  description: string;
  valueType: 'enum' | 'boolean' | 'color' | 'number' | 'string';
  values?: string[];
  defaultValue?: string;
  placeholder?: string;
  quoted?: boolean;
  category?: string;
}
```

### Filter Detection

For span-based extensions that need filter detection:

```typescript
import { hasFilter } from './utils';

if (!hasFilter(document, 'myextension')) {
  return undefined;
}
```

### Brand Color Integration

For extensions with color attributes:

```typescript
import { getBrandColors } from './utils';

const brandColors = await getBrandColors(document);
```

### Color Utilities (src/color-utils.ts)

For color picker providers:

```typescript
import { parseColor, colorToHex, findNamedColor, findBrandColorName } from './color-utils';
```

## Testing

1. Press F5 to launch Extension Development Host
2. Open example `.qmd` files
3. Test autocomplete triggers and suggestions
4. Enable debug logging: set `quartoExtensionHelpers.debug.enabled` to `true`
5. View logs: "Quarto Extension Helpers" in Output panel

## Code Style

- Use TypeScript strict mode
- Use shared utilities from `shortcode-provider.ts`
- Use types from `types.ts`
- Add constants to `constants.ts`
- Run `npm run lint` before submitting
- Cache expensive operations

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/extension-name`
3. Make your changes
4. Run `npm run compile && npm run lint`
5. Test in Extension Development Host
6. Submit a pull request

## Questions?

Open an issue if you have questions or need help!
