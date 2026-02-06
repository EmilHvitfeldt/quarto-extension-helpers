import * as vscode from 'vscode';
import { FONTAWESOME_ICONS } from './fontawesome-icons';

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
const ATTRIBUTES = [
  { name: 'size', description: 'Icon size (relative, literal, or LaTeX)', hasValues: true },
  { name: 'title', description: 'Accessibility title text', hasValues: false },
];

type CompletionType = 'icon' | 'attribute-name' | 'attribute-value';

interface ShortcodeContext {
  /** The full content between {{< fa and >}} */
  fullContent: string;
  /** Position where the shortcode content starts (after "fa ") */
  contentStart: number;
  /** What type of completion to provide */
  completionType: CompletionType;
  /** The text being typed (for filtering) */
  typedText: string;
  /** Position where the current token starts */
  tokenStart: number;
  /** Attribute name if completing a value */
  attributeName?: string;
  /** Whether there's a space before >}} */
  hasSpaceBeforeEnd: boolean;
  /** Whether a leading space is needed before the completion */
  needsLeadingSpace: boolean;
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

    // Check if we're inside a {{< fa ... >}} shortcode
    const shortcodeContext = this.getShortcodeContext(lineText, position.character);
    if (!shortcodeContext) {
      return undefined;
    }

    switch (shortcodeContext.completionType) {
      case 'icon':
        return this.getIconCompletions(shortcodeContext, position);
      case 'attribute-name':
        return this.getAttributeNameCompletions(shortcodeContext, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(shortcodeContext, position);
      default:
        return undefined;
    }
  }

  /**
   * Find the shortcode context if cursor is inside {{< fa ... >}}
   */
  private getShortcodeContext(lineText: string, cursorPos: number): ShortcodeContext | null {
    // Find {{< fa before cursor
    const beforeCursor = lineText.substring(0, cursorPos);
    const shortcodeStart = beforeCursor.lastIndexOf('{{< fa');

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
    // If shortcodeEndRelative === 0, cursor is right before >}} with no space
    const textBeforeEnd = afterCursor.substring(0, shortcodeEndRelative);
    const hasSpaceBeforeEnd = shortcodeEndRelative > 0 && textBeforeEnd.endsWith(' ');

    // Extract full content between "{{< fa" and ">}}"
    const faEnd = shortcodeStart + '{{< fa'.length;
    const shortcodeEnd = cursorPos + shortcodeEndRelative;
    const fullContent = lineText.substring(faEnd, shortcodeEnd).trim();

    // Find where content starts (skip spaces after "fa")
    let contentStart = faEnd;
    while (contentStart < cursorPos && lineText[contentStart] === ' ') {
      contentStart++;
    }
    if (contentStart > cursorPos) {
      contentStart = cursorPos;
    }

    // Content before cursor
    const contentBeforeCursor = lineText.substring(faEnd, cursorPos);

    // Check if there's a space immediately after "fa"
    const hasSpaceAfterFa = lineText[faEnd] === ' ';

    // Determine completion type and context
    return this.analyzeContext(contentBeforeCursor, fullContent, contentStart, cursorPos, hasSpaceBeforeEnd, hasSpaceAfterFa);
  }

  /**
   * Analyze the content to determine what type of completion to provide
   */
  private analyzeContext(
    contentBeforeCursor: string,
    fullContent: string,
    contentStart: number,
    cursorPos: number,
    hasSpaceBeforeEnd: boolean,
    hasSpaceAfterFa: boolean
  ): ShortcodeContext {
    const trimmedBefore = contentBeforeCursor.trim();

    // Check if we're after an attribute= (completing a value)
    const attrValueMatch = contentBeforeCursor.match(/(\w+)=([^\s]*)$/);
    if (attrValueMatch) {
      const attrName = attrValueMatch[1];
      const typedValue = attrValueMatch[2].replace(/^["']/, ''); // Remove leading quote if present
      const tokenStart = cursorPos - typedValue.length;

      return {
        fullContent,
        contentStart,
        completionType: 'attribute-value',
        typedText: typedValue,
        tokenStart,
        attributeName: attrName,
        hasSpaceBeforeEnd,
        needsLeadingSpace: false // After '=', no leading space needed
      };
    }

    // Check if an icon has been specified
    const hasIcon = this.hasIconSpecified(trimmedBefore);

    if (hasIcon) {
      // After icon, suggest attributes
      // Find what's being typed (last word after space)
      const lastSpaceIndex = contentBeforeCursor.lastIndexOf(' ');
      const typedText = lastSpaceIndex >= 0
        ? contentBeforeCursor.substring(lastSpaceIndex + 1)
        : '';
      // tokenStart = cursor position minus the length of what's been typed
      const tokenStart = cursorPos - typedText.length;

      return {
        fullContent,
        contentStart,
        completionType: 'attribute-name',
        typedText,
        tokenStart,
        hasSpaceBeforeEnd,
        needsLeadingSpace: false // After icon + space, no leading space needed
      };
    }

    // No icon yet, suggest icons
    // Need leading space if there's no space after "fa"
    const tokenStart = contentStart;
    const typedText = trimmedBefore;

    return {
      fullContent,
      contentStart,
      completionType: 'icon',
      typedText,
      tokenStart,
      hasSpaceBeforeEnd,
      needsLeadingSpace: !hasSpaceAfterFa
    };
  }

  /**
   * Check if an icon name has been specified in the content
   */
  private hasIconSpecified(content: string): boolean {
    if (!content) {
      return false;
    }

    const parts = content.split(/\s+/).filter(p => p && !p.includes('='));

    // Check if first part is "brands"
    if (parts[0] === 'brands') {
      // Need at least "brands iconname"
      return parts.length >= 2;
    }

    // Check if first part is a valid icon name
    if (parts.length >= 1) {
      const potentialIcon = parts[0];

      // Don't treat known attribute names as icons
      const attributeNames = ATTRIBUTES.map(a => a.name);
      if (attributeNames.includes(potentialIcon)) {
        return false;
      }

      // It's an icon if it's in our list or looks like an icon name
      return FONTAWESOME_ICONS.includes(potentialIcon as any) ||
             /^[a-z0-9-]+$/i.test(potentialIcon);
    }

    return false;
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

    // Calculate the range to replace
    const replaceRange = new vscode.Range(
      position.line,
      context.tokenStart,
      position.line,
      position.character
    );

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

    // Find which attributes are already used
    const usedAttributes = new Set<string>();
    for (const attr of ATTRIBUTES) {
      if (context.fullContent.includes(`${attr.name}=`)) {
        usedAttributes.add(attr.name);
      }
    }

    const replaceRange = new vscode.Range(
      position.line,
      context.tokenStart,
      position.line,
      position.character
    );

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

      if (attr.hasValues) {
        // For attributes with predefined values, add = and trigger suggestions
        item.insertText = new vscode.SnippetString(`${attr.name}=\$1`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest'
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

    const replaceRange = new vscode.Range(
      position.line,
      context.tokenStart,
      position.line,
      position.character
    );

    for (const size of SIZE_VALUES) {
      // Filter by typed text
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
