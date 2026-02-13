import * as vscode from 'vscode';
import {
  ShortcodeContext,
  AttributeDefinition,
  BrandColor,
} from './types';
import { CSS_COLOR_NAMES } from './color-utils';

// Re-export pure functions from shortcode-utils for backward compatibility
export {
  getShortcodeContext,
  parseAttributeValueContext,
  analyzeShortcodeContext,
  analyzeAttributeOnlyContext,
  getUsedAttributes,
  filterByPrefix,
} from './shortcode-utils';

// Import for internal use
import { getUsedAttributes as _getUsedAttributes } from './shortcode-utils';

/**
 * Create a replacement range for the typed text
 */
export function createReplaceRange(
  position: vscode.Position,
  tokenStart: number
): vscode.Range {
  return new vscode.Range(
    position.line,
    tokenStart,
    position.line,
    position.character
  );
}

/**
 * Generate attribute name completion items
 */
export function createAttributeNameCompletions(
  attributes: AttributeDefinition[],
  context: ShortcodeContext,
  position: vscode.Position,
  categoryOrder?: Map<string, string>
): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];
  const typedText = context.typedText.toLowerCase();
  const usedAttributes = _getUsedAttributes(context.fullContent, attributes);

  const replaceRange = createReplaceRange(position, context.tokenStart);
  const leadingSpace = context.needsLeadingSpace ? ' ' : '';

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];

    // Skip if already used
    if (usedAttributes.has(attr.name)) {
      continue;
    }

    // Filter by typed text
    if (typedText && !attr.name.toLowerCase().startsWith(typedText)) {
      continue;
    }

    const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property);
    item.detail = attr.category || 'Attribute';

    // Build documentation
    let doc = attr.description;
    if (attr.defaultValue !== undefined) {
      doc += `\n\nDefault: \`${attr.defaultValue}\``;
    }
    if (attr.values && attr.values.length > 0 && attr.valueType === 'enum') {
      doc += `\n\nValues: ${attr.values.map(v => `\`${v}\``).join(', ')}`;
    }
    item.documentation = new vscode.MarkdownString(doc);

    item.range = replaceRange;

    // Sort by category order if provided, otherwise by index
    if (categoryOrder && categoryOrder.has(attr.name)) {
      item.sortText = categoryOrder.get(attr.name)!;
    } else {
      item.sortText = String(i).padStart(3, '0');
    }

    // Determine insert text based on value type
    if (attr.valueType === 'boolean' || attr.valueType === 'enum' || attr.valueType === 'color') {
      // Trigger suggestions for values
      item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}=\$1`);
      item.command = {
        command: 'editor.action.triggerSuggest',
        title: 'Trigger Suggest',
      };
    } else if (attr.quoted) {
      // Quoted value with placeholder inside quotes
      const placeholder = attr.placeholder || '';
      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = new vscode.SnippetString(
        `${leadingSpace}${attr.name}="\${1:${placeholder}}"${trailingSpace}`
      );
    } else {
      // Free-form value with placeholder
      const placeholder = attr.placeholder || '';
      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = new vscode.SnippetString(
        `${leadingSpace}${attr.name}=\${1:${placeholder}}${trailingSpace}`
      );
    }

    completions.push(item);
  }

  return completions;
}

/**
 * Generate boolean value completion items
 */
export function createBooleanValueCompletions(
  context: ShortcodeContext,
  position: vscode.Position,
  defaultValue?: string
): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];
  const typedText = context.typedText.toLowerCase();
  const replaceRange = createReplaceRange(position, context.tokenStart);
  const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';

  for (const value of ['true', 'false']) {
    if (typedText && !value.startsWith(typedText)) {
      continue;
    }

    const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
    item.range = replaceRange;

    if (value === defaultValue) {
      item.detail = '(default)';
      item.sortText = '0' + value;
    } else {
      item.sortText = '1' + value;
    }

    item.insertText = value + trailingSpace;
    completions.push(item);
  }

  return completions;
}

/**
 * Generate enum value completion items
 */
export function createEnumValueCompletions(
  values: string[],
  context: ShortcodeContext,
  position: vscode.Position,
  defaultValue?: string
): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];
  const typedText = context.typedText.toLowerCase();
  const replaceRange = createReplaceRange(position, context.tokenStart);
  const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';

  for (const value of values) {
    if (typedText && !value.toLowerCase().startsWith(typedText)) {
      continue;
    }

    const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
    item.range = replaceRange;

    if (value === defaultValue) {
      item.detail = '(default)';
      item.sortText = '0' + value;
    } else {
      item.sortText = '1' + value;
    }

    item.insertText = value + trailingSpace;
    completions.push(item);
  }

  return completions;
}

/**
 * Generate color value completion items (brand colors + CSS colors)
 */
export function createColorValueCompletions(
  context: ShortcodeContext,
  position: vscode.Position,
  brandColors: BrandColor[] = []
): vscode.CompletionItem[] {
  const completions: vscode.CompletionItem[] = [];
  const typedText = context.typedText.toLowerCase();
  const replaceRange = createReplaceRange(position, context.tokenStart);
  const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';

  // Add brand colors first (insert hex value since extensions don't understand brand names)
  for (const brandColor of brandColors) {
    if (typedText && !brandColor.name.toLowerCase().startsWith(typedText)) {
      continue;
    }

    const item = new vscode.CompletionItem(brandColor.name, vscode.CompletionItemKind.Color);
    item.detail = `Brand: ${brandColor.value}`;
    item.documentation = new vscode.MarkdownString(
      `Brand color from \`_brand.yml\`\n\nInserts: \`${brandColor.value}\``
    );
    item.range = replaceRange;
    item.sortText = '0' + brandColor.name;
    item.insertText = brandColor.value + trailingSpace; // Insert hex value, not name

    completions.push(item);
  }

  // Add CSS color values
  for (const color of CSS_COLOR_NAMES) {
    if (typedText && !color.toLowerCase().startsWith(typedText)) {
      continue;
    }

    const item = new vscode.CompletionItem(color, vscode.CompletionItemKind.Color);
    item.detail = 'CSS color';
    item.range = replaceRange;
    item.sortText = '1' + color;
    item.insertText = color + trailingSpace;

    completions.push(item);
  }

  return completions;
}

/**
 * Generate attribute value completions based on attribute type
 */
export function createAttributeValueCompletions(
  attr: AttributeDefinition,
  context: ShortcodeContext,
  position: vscode.Position,
  brandColors: BrandColor[] = []
): vscode.CompletionItem[] {
  switch (attr.valueType) {
    case 'boolean':
      return createBooleanValueCompletions(context, position, attr.defaultValue);

    case 'color':
      return createColorValueCompletions(context, position, brandColors);

    case 'enum':
      if (attr.values && attr.values.length > 0) {
        return createEnumValueCompletions(attr.values, context, position, attr.defaultValue);
      }
      return [];

    default:
      return [];
  }
}

/**
 * Build a category order map for sorting completions
 */
export function buildCategoryOrder(
  categories: { name: string; attributes: AttributeDefinition[] }[]
): Map<string, string> {
  const order = new Map<string, string>();
  categories.forEach((category, catIndex) => {
    category.attributes.forEach((attr, attrIndex) => {
      order.set(attr.name, `${catIndex}${String(attrIndex).padStart(2, '0')}`);
    });
  });
  return order;
}
