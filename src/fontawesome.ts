import * as vscode from 'vscode';
import { ShortcodeContext, AttributeDefinition } from './types';
import {
  getShortcodeContext,
  analyzeShortcodeContext,
  createReplaceRange,
  getUsedAttributes,
  createEnumValueCompletions,
} from './shortcode-provider';
import { FONTAWESOME_ICONS } from './fontawesome-icons';

/** Shortcode name constant */
const SHORTCODE_NAME = 'fa';

/** Size values for FontAwesome icons (sortOrder controls display order) */
const SIZE_VALUES = [
  // Relative sizing (HTML)
  { value: '2xs', description: 'Extra extra small (HTML)', sortOrder: '00' },
  { value: 'xs', description: 'Extra small (HTML)', sortOrder: '01' },
  { value: 'sm', description: 'Small (HTML)', sortOrder: '02' },
  { value: 'lg', description: 'Large (HTML)', sortOrder: '03' },
  { value: 'xl', description: 'Extra large (HTML)', sortOrder: '04' },
  { value: '2xl', description: 'Extra extra large (HTML)', sortOrder: '05' },
  // Literal sizing (HTML)
  { value: '1x', description: '1x size (HTML)', sortOrder: '10' },
  { value: '2x', description: '2x size (HTML)', sortOrder: '11' },
  { value: '3x', description: '3x size (HTML)', sortOrder: '12' },
  { value: '4x', description: '4x size (HTML)', sortOrder: '13' },
  { value: '5x', description: '5x size (HTML)', sortOrder: '14' },
  { value: '6x', description: '6x size (HTML)', sortOrder: '15' },
  { value: '7x', description: '7x size (HTML)', sortOrder: '16' },
  { value: '8x', description: '8x size (HTML)', sortOrder: '17' },
  { value: '9x', description: '9x size (HTML)', sortOrder: '18' },
  { value: '10x', description: '10x size (HTML)', sortOrder: '19' },
  // LaTeX sizing (PDF)
  { value: 'tiny', description: 'Tiny (LaTeX/PDF)', sortOrder: '20' },
  { value: 'scriptsize', description: 'Script size (LaTeX/PDF)', sortOrder: '21' },
  { value: 'footnotesize', description: 'Footnote size (LaTeX/PDF)', sortOrder: '22' },
  { value: 'small', description: 'Small (LaTeX/PDF)', sortOrder: '23' },
  { value: 'normalsize', description: 'Normal size (LaTeX/PDF)', sortOrder: '24' },
  { value: 'large', description: 'Large (LaTeX/PDF)', sortOrder: '25' },
  { value: 'Large', description: 'Larger (LaTeX/PDF)', sortOrder: '26' },
  { value: 'LARGE', description: 'Even larger (LaTeX/PDF)', sortOrder: '27' },
  { value: 'huge', description: 'Huge (LaTeX/PDF)', sortOrder: '28' },
  { value: 'Huge', description: 'Largest (LaTeX/PDF)', sortOrder: '29' },
];

/** Attributes for FontAwesome shortcodes */
const ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'size',
    description: 'Icon size (relative, literal, or LaTeX)',
    valueType: 'enum',
    values: SIZE_VALUES.map(s => s.value),
  },
  {
    name: 'title',
    description: 'Accessibility title text',
    valueType: 'string',
    quoted: true,
  },
];

/** Attribute names set for quick lookup */
const ATTRIBUTE_NAMES = new Set(ATTRIBUTES.map(a => a.name));

/**
 * Check if an icon name has been specified in the content
 */
function hasIconSpecified(content: string): boolean {
  if (!content) {
    return false;
  }

  const parts = content.split(/\s+/).filter(p => p && !p.includes('='));

  // Check if first part is "brands"
  if (parts[0] === 'brands') {
    return parts.length >= 2;
  }

  // Check if first part is a valid icon name
  if (parts.length >= 1) {
    const potentialIcon = parts[0];

    // Don't treat known attribute names as icons
    if (ATTRIBUTE_NAMES.has(potentialIcon)) {
      return false;
    }

    // It's an icon if it's in our list or looks like an icon name (lowercase alphanumeric with hyphens)
    return FONTAWESOME_ICONS.includes(potentialIcon as (typeof FONTAWESOME_ICONS)[number]) ||
           /^[a-z][a-z0-9-]*$/i.test(potentialIcon);
  }

  return false;
}

/**
 * Completion provider for FontAwesome icons in Quarto shortcodes
 *
 * Provides autocomplete for:
 * - {{< fa icon-name >}} - regular icons
 * - {{< fa brands icon-name >}} - brand icons
 * - {{< fa icon-name size=value >}} - with size
 * - {{< fa icon-name title="text" >}} - with title
 */
export class FontAwesomeCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    const lineText = document.lineAt(position).text;

    const baseContext = getShortcodeContext(lineText, position.character, SHORTCODE_NAME);
    if (!baseContext) {
      return undefined;
    }

    // Get content before cursor for analysis
    const marker = `{{< ${SHORTCODE_NAME}`;
    const markerEnd = lineText.lastIndexOf(marker) + marker.length;
    const contentBeforeCursor = lineText.substring(markerEnd, position.character);
    const hasSpaceAfterFa = lineText[markerEnd] === ' ';

    const context = analyzeShortcodeContext(
      baseContext,
      contentBeforeCursor,
      position.character,
      hasSpaceAfterFa,
      hasIconSpecified,
      'icon'
    );

    switch (context.completionType) {
      case 'icon':
        return this.getIconCompletions(context, position);
      case 'attribute-name':
        return this.getAttributeNameCompletions(context, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(context, position);
      default:
        return undefined;
    }
  }

  /**
   * Get icon completions
   */
  private getIconCompletions(
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText;
    const replaceRange = createReplaceRange(position, context.tokenStart);

    for (const icon of FONTAWESOME_ICONS) {
      // Filter by typed text (case-insensitive prefix match)
      if (typedText && !icon.toLowerCase().startsWith(typedText.toLowerCase())) {
        continue;
      }

      const isBrandIcon = icon.startsWith('brands ');
      const displayName = isBrandIcon ? icon.substring('brands '.length) : icon;

      const item = new vscode.CompletionItem(icon, vscode.CompletionItemKind.Constant);
      item.detail = isBrandIcon ? 'Brand icon' : 'Icon';
      item.documentation = new vscode.MarkdownString(
        isBrandIcon
          ? `FontAwesome brand icon: \`{{< fa ${icon} >}}\``
          : `FontAwesome icon: \`{{< fa ${icon} >}}\``
      );

      const leadingSpace = context.needsLeadingSpace ? ' ' : '';
      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = leadingSpace + icon + trailingSpace;
      item.range = replaceRange;

      // Sort brand icons after regular icons, then alphabetically
      item.sortText = (isBrandIcon ? '1' : '0') + displayName;

      // Add filter text to allow searching by icon name without "brands " prefix
      item.filterText = isBrandIcon ? `${icon} ${displayName}` : icon;

      completions.push(item);
    }

    return completions;
  }

  /**
   * Get attribute name completions (size, title)
   */
  private getAttributeNameCompletions(
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText.toLowerCase();
    const usedAttributes = getUsedAttributes(context.fullContent, ATTRIBUTES);
    const replaceRange = createReplaceRange(position, context.tokenStart);

    for (const attr of ATTRIBUTES) {
      // Skip if already used
      if (usedAttributes.has(attr.name)) {
        continue;
      }

      // Filter by typed text
      if (typedText && !attr.name.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property);
      item.detail = 'Attribute';
      item.documentation = new vscode.MarkdownString(attr.description);
      item.range = replaceRange;

      if (attr.valueType === 'enum') {
        // For attributes with predefined values, add = and trigger suggestions
        item.insertText = new vscode.SnippetString(`${attr.name}=\$1`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest',
        };
      } else {
        // For free-form attributes like title, add ="" with cursor inside
        const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
        item.insertText = new vscode.SnippetString(`${attr.name}="\$1"${trailingSpace}`);
      }

      completions.push(item);
    }

    return completions;
  }

  /**
   * Get attribute value completions
   */
  private getAttributeValueCompletions(
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    // Only provide completions for 'size' attribute
    if (context.attributeName !== 'size') {
      return [];
    }

    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText.toLowerCase();
    const replaceRange = createReplaceRange(position, context.tokenStart);

    for (const size of SIZE_VALUES) {
      if (typedText && !size.value.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(size.value, vscode.CompletionItemKind.Value);
      item.detail = size.description;
      item.sortText = size.sortOrder;
      item.range = replaceRange;

      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = size.value + trailingSpace;

      completions.push(item);
    }

    return completions;
  }
}
