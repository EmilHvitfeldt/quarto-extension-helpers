import * as vscode from 'vscode';
import {
  ShortcodeContext,
  AttributeDefinition,
  CompletionType,
  AttributeValueContext,
  BrandColor,
} from './types';

/** Common CSS color values for completion */
export const CSS_COLOR_VALUES = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
  'black', 'white', 'gray', 'cyan', 'magenta'
];

/**
 * Parse shortcode context from a line of text.
 * Handles the common pattern: {{< shortcodeName content >}}
 */
export function getShortcodeContext(
  lineText: string,
  cursorPos: number,
  shortcodeName: string
): ShortcodeContext | null {
  const marker = `{{< ${shortcodeName}`;
  const beforeCursor = lineText.substring(0, cursorPos);
  const shortcodeStart = beforeCursor.lastIndexOf(marker);

  if (shortcodeStart === -1) {
    return null;
  }

  // Check that we haven't closed this shortcode before cursor
  const afterShortcodeStart = beforeCursor.substring(shortcodeStart);
  if (afterShortcodeStart.includes('>}}')) {
    return null;
  }

  // Find >}} after cursor
  const afterCursor = lineText.substring(cursorPos);
  const shortcodeEndRelative = afterCursor.indexOf('>}}');

  if (shortcodeEndRelative === -1) {
    return null;
  }

  // Check if there's already a space before >}}
  const textBeforeEnd = afterCursor.substring(0, shortcodeEndRelative);
  const hasSpaceBeforeEnd = shortcodeEndRelative > 0 && textBeforeEnd.endsWith(' ');

  // Extract full content between marker and ">}}"
  const markerEnd = shortcodeStart + marker.length;
  const shortcodeEnd = cursorPos + shortcodeEndRelative;
  const fullContent = lineText.substring(markerEnd, shortcodeEnd).trim();

  // Find where content starts (skip spaces after shortcode name)
  let contentStart = markerEnd;
  while (contentStart < cursorPos && lineText[contentStart] === ' ') {
    contentStart++;
  }
  if (contentStart > cursorPos) {
    contentStart = cursorPos;
  }

  // Content before cursor
  const contentBeforeCursor = lineText.substring(markerEnd, cursorPos);

  // Check if there's a space immediately after the shortcode name
  const hasSpaceAfterName = lineText[markerEnd] === ' ';

  return {
    fullContent,
    contentStart,
    completionType: 'attribute-name', // Will be refined by analyzeContext
    typedText: contentBeforeCursor.trim(),
    tokenStart: contentStart,
    hasSpaceBeforeEnd,
    needsLeadingSpace: !hasSpaceAfterName && contentBeforeCursor.trim() === '',
  };
}

/**
 * Check if we're completing an attribute value (after attr=)
 */
export function parseAttributeValueContext(
  contentBeforeCursor: string,
  cursorPos: number
): AttributeValueContext | null {
  const attrValueMatch = contentBeforeCursor.match(/(\w+)=([^\s]*)$/);
  if (!attrValueMatch) {
    return null;
  }

  const attributeName = attrValueMatch[1];
  const typedValue = attrValueMatch[2].replace(/^["']/, ''); // Remove leading quote
  const tokenStart = cursorPos - typedValue.length;

  return { attributeName, typedValue, tokenStart };
}

/**
 * Analyze context to determine completion type for shortcodes with a primary value
 * (like icon name for fa, file for downloadthis)
 */
export function analyzeShortcodeContext(
  context: ShortcodeContext,
  contentBeforeCursor: string,
  cursorPos: number,
  hasSpaceAfterName: boolean,
  hasPrimaryValue: (content: string) => boolean,
  primaryCompletionType: CompletionType
): ShortcodeContext {
  // Check if we're after an attribute= (completing a value)
  const attrValueCtx = parseAttributeValueContext(contentBeforeCursor, cursorPos);
  if (attrValueCtx) {
    return {
      ...context,
      completionType: 'attribute-value',
      typedText: attrValueCtx.typedValue,
      tokenStart: attrValueCtx.tokenStart,
      attributeName: attrValueCtx.attributeName,
      needsLeadingSpace: false,
    };
  }

  // Check if primary value has been specified
  const trimmedContent = contentBeforeCursor.trim();
  if (hasPrimaryValue(trimmedContent)) {
    // After primary value, suggest attributes
    const lastSpaceIndex = contentBeforeCursor.lastIndexOf(' ');
    const typedText = lastSpaceIndex >= 0
      ? contentBeforeCursor.substring(lastSpaceIndex + 1)
      : trimmedContent;
    const tokenStart = cursorPos - typedText.length;

    return {
      ...context,
      completionType: 'attribute-name',
      typedText,
      tokenStart,
      needsLeadingSpace: false,
    };
  }

  // No primary value yet, suggest it
  return {
    ...context,
    completionType: primaryCompletionType,
    typedText: trimmedContent,
    tokenStart: context.contentStart,
    needsLeadingSpace: !hasSpaceAfterName,
  };
}

/**
 * Analyze context for shortcodes that only have attributes (no primary value)
 */
export function analyzeAttributeOnlyContext(
  context: ShortcodeContext,
  contentBeforeCursor: string,
  cursorPos: number,
  hasSpaceAfterName: boolean
): ShortcodeContext {
  // Check if we're after an attribute= (completing a value)
  const attrValueCtx = parseAttributeValueContext(contentBeforeCursor, cursorPos);
  if (attrValueCtx) {
    return {
      ...context,
      completionType: 'attribute-value',
      typedText: attrValueCtx.typedValue,
      tokenStart: attrValueCtx.tokenStart,
      attributeName: attrValueCtx.attributeName,
      needsLeadingSpace: false,
    };
  }

  // Suggest attributes
  const lastSpaceIndex = contentBeforeCursor.lastIndexOf(' ');
  const typedText = lastSpaceIndex >= 0
    ? contentBeforeCursor.substring(lastSpaceIndex + 1)
    : contentBeforeCursor.trim();
  const tokenStart = cursorPos - typedText.length;

  return {
    ...context,
    completionType: 'attribute-name',
    typedText,
    tokenStart,
    needsLeadingSpace: !hasSpaceAfterName && contentBeforeCursor.trim() === '',
  };
}

/**
 * Get which attributes are already used in the shortcode content
 */
export function getUsedAttributes(
  fullContent: string,
  attributes: AttributeDefinition[]
): Set<string> {
  const used = new Set<string>();
  for (const attr of attributes) {
    if (fullContent.includes(`${attr.name}=`)) {
      used.add(attr.name);
    }
  }
  return used;
}

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
  const usedAttributes = getUsedAttributes(context.fullContent, attributes);

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
  for (const color of CSS_COLOR_VALUES) {
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
