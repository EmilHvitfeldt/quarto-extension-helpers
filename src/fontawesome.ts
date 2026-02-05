import * as vscode from 'vscode';
import { hasFilter } from './utils';
import { FONTAWESOME_ICONS } from './fontawesome-icons';

interface ShortcodeContext {
  /** Content between {{< fa and >}} */
  content: string;
  /** Position where icon content starts (after "fa" or "fa ") */
  contentStart: number;
  /** Whether a leading space is needed before the icon name */
  needsLeadingSpace: boolean;
  /** Whether a trailing space is needed after the icon name */
  needsTrailingSpace: boolean;
}

/**
 * Completion provider for FontAwesome icons in Quarto shortcodes
 *
 * Provides autocomplete for:
 * - {{< fa icon-name >}} - regular icons
 * - {{< fa brands icon-name >}} - brand icons
 */
export class FontAwesomeCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    // Check if fontawesome filter is loaded in the document
    if (!hasFilter(document, 'fontawesome')) {
      return undefined;
    }

    const lineText = document.lineAt(position).text;

    // Check if we're inside a {{< fa ... >}} shortcode
    const shortcodeContext = this.getShortcodeContext(lineText, position.character);
    if (!shortcodeContext) {
      return undefined;
    }

    // Get the text typed so far (for filtering)
    const typedText = shortcodeContext.content.trim();

    return this.getIconCompletions(typedText, position, shortcodeContext);
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
    const hasSpaceBeforeEnd = afterCursor[shortcodeEndRelative - 1] === ' ' ||
                               (shortcodeEndRelative > 0 && afterCursor.substring(0, shortcodeEndRelative).endsWith(' '));

    // Extract content between "{{< fa" and cursor
    // The pattern is: {{< fa [content] >}}
    const faEnd = shortcodeStart + '{{< fa'.length;

    // Find where actual content starts (skip any spaces after "fa")
    let contentStart = faEnd;
    while (contentStart < cursorPos && lineText[contentStart] === ' ') {
      contentStart++;
    }

    // Ensure contentStart doesn't exceed cursor position
    if (contentStart > cursorPos) {
      contentStart = cursorPos;
    }

    const content = lineText.substring(contentStart, cursorPos);

    // Check if we need a leading space - look at character immediately before contentStart
    const charBeforeContent = contentStart > 0 ? lineText[contentStart - 1] : '';
    const needsLeadingSpace = charBeforeContent !== ' ';

    return {
      content,
      contentStart,
      needsLeadingSpace,
      needsTrailingSpace: !hasSpaceBeforeEnd
    };
  }

  /**
   * Get icon completions filtered by typed prefix
   */
  private getIconCompletions(
    typedText: string,
    position: vscode.Position,
    context: ShortcodeContext
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    // Calculate the range to replace (from content start to cursor)
    const replaceRange = new vscode.Range(
      position.line,
      context.contentStart,
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
      const trailingSpace = context.needsTrailingSpace ? ' ' : '';
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
}
