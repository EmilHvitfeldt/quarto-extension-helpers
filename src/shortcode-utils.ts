/**
 * Pure utility functions for shortcode parsing and analysis.
 * These functions have no VS Code dependencies and can be unit tested directly.
 */

import {
  ShortcodeContext,
  AttributeDefinition,
  CompletionType,
  AttributeValueContext,
} from './types';

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
 * Filter values based on typed text (case-insensitive prefix match)
 */
export function filterByPrefix(values: string[], typedText: string): string[] {
  if (!typedText) {
    return values;
  }
  const lowerTyped = typedText.toLowerCase();
  return values.filter((v) => v.toLowerCase().startsWith(lowerTyped));
}
