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
  extension.ts      # Main entry point - registers all providers
  utils.ts          # Shared utilities (filter detection, brand colors)
  roughnotation.ts  # Roughnotation extension support
  [extension].ts    # Add new extension support here
examples/
  *.qmd             # Test files for development
  _brand.yml        # Example brand configuration
```

## Adding Support for a New Extension

### 1. Create the Extension File

Create `src/[extension-name].ts` with:

```typescript
import * as vscode from 'vscode';
import { hasFilter } from './utils';

// Define attributes for the extension
const ATTRIBUTES = [
  {
    name: 'attr-name',
    description: 'What this attribute does',
    valueType: 'enum', // or 'boolean', 'number', 'color'
    values: ['option1', 'option2'], // for enum/boolean
    defaultValue: 'option1'
  },
  // ... more attributes
];

export class MyExtensionCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    // Check if extension filter is loaded
    if (!hasFilter(document, 'extension-name')) {
      return undefined;
    }

    // Implement completion logic
    // See roughnotation.ts for reference
  }
}
```

### 2. Register the Provider

In `src/extension.ts`:

```typescript
import { MyExtensionCompletionProvider } from './myextension';

export function activate(context: vscode.ExtensionContext): void {
  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };

  // Register existing providers...

  // Register your new provider
  registerMyExtensionProvider(context, quartoSelector);
}

function registerMyExtensionProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new MyExtensionCompletionProvider();
  const triggerCharacters = [' ', '=', '-']; // Adjust as needed

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}
```

### 3. Add Example Files

Create `examples/[extension]-demo.qmd` with test cases.

### 4. Update Documentation

- Add the extension to the table in `README.md`
- Add a section describing the extension's features
- Include TODO comments for screenshots/gifs

### 5. Update CHANGELOG

Add your changes under `[Unreleased]` in `CHANGELOG.md`.

## Key Patterns

### Filter Detection

Use `hasFilter(document, 'filter-name')` to check if an extension is enabled:

```typescript
if (!hasFilter(document, 'myextension')) {
  return undefined;
}
```

### Context Detection

Determine where the cursor is (class context, attribute name, attribute value) to provide appropriate completions.

### Brand Color Integration

If your extension uses colors, you can integrate with `_brand.yml`:

```typescript
import { getBrandColors } from './utils';

const brandColors = await getBrandColors(document);
```

## Testing

1. Press F5 to launch Extension Development Host
2. Open example `.qmd` files
3. Test autocomplete triggers and suggestions
4. Test that completions only appear when the filter is declared

## Code Style

- Use TypeScript strict mode
- Add JSDoc comments for public APIs
- Keep completion providers focused and efficient
- Cache expensive operations (see `utils.ts` for examples)

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/extension-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Questions?

Open an issue if you have questions or need help!
