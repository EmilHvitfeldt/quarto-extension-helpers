import * as vscode from 'vscode';

/**
 * Alias definition for the now shortcode
 */
interface NowAlias {
  name: string;
  description: string;
  example: string;
}

/** Predefined aliases for the now shortcode */
const NOW_ALIASES: NowAlias[] = [
  { name: 'year', description: 'Four-digit year', example: '2024' },
  { name: 'month', description: 'Full month name', example: 'March' },
  { name: 'day', description: 'Day of month', example: '29' },
  { name: 'weekday', description: 'Full weekday name', example: 'Friday' },
  { name: 'date', description: 'Short date format', example: '03/29/24' },
  { name: 'isodate', description: 'ISO date format', example: '2024-03-29' },
  { name: 'hour', description: 'Hour (12-hour format)', example: '02' },
  { name: 'minute', description: 'Minute', example: '30' },
  { name: 'ampm', description: 'AM/PM indicator', example: 'PM' },
  { name: 'time', description: 'Time in 12-hour format', example: '02:30 PM' },
  { name: 'datetime', description: 'Date and time', example: '03/29/24 02:30 PM' },
  { name: 'isotime', description: 'ISO time format', example: '14:30:00' },
  { name: 'isodatetime', description: 'ISO date and time', example: '2024-03-29T14:30:00' },
  { name: 'timestamp', description: 'Unix timestamp', example: '1711720200' }
];

interface ShortcodeContext {
  /** Position where shortcode content starts (after "now") */
  contentStart: number;
  /** The text being typed (for filtering) */
  typedText: string;
  /** Position where the current token starts */
  tokenStart: number;
  /** Whether there's a space before >}} */
  hasSpaceBeforeEnd: boolean;
  /** Whether a leading space is needed */
  needsLeadingSpace: boolean;
}

/**
 * Completion provider for the now shortcode in Quarto
 *
 * Provides autocomplete for:
 * - {{< now ALIAS >}} - where ALIAS is a predefined format alias
 *
 * Available aliases: year, month, day, weekday, date, isodate,
 * hour, minute, ampm, time, datetime, isotime, isodatetime, timestamp
 */
export class NowCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    const lineText = document.lineAt(position).text;

    // Check if we're inside a {{< now ... >}} shortcode
    const shortcodeContext = this.getShortcodeContext(lineText, position.character);
    if (!shortcodeContext) {
      return undefined;
    }

    return this.getAliasCompletions(shortcodeContext, position);
  }

  /**
   * Find the shortcode context if cursor is inside {{< now ... >}}
   */
  private getShortcodeContext(lineText: string, cursorPos: number): ShortcodeContext | null {
    // Find {{< now before cursor
    const beforeCursor = lineText.substring(0, cursorPos);
    const shortcodeStart = beforeCursor.lastIndexOf('{{< now');

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

    // Extract content position (after "{{< now")
    const nowEnd = shortcodeStart + '{{< now'.length;

    // Find where content starts (skip spaces after "now")
    let contentStart = nowEnd;
    while (contentStart < cursorPos && lineText[contentStart] === ' ') {
      contentStart++;
    }
    if (contentStart > cursorPos) {
      contentStart = cursorPos;
    }

    // Check if there's a space immediately after "now"
    const hasSpaceAfterNow = lineText[nowEnd] === ' ';

    // Content before cursor (trimmed)
    const contentBeforeCursor = lineText.substring(nowEnd, cursorPos);
    const typedText = contentBeforeCursor.trim();
    const tokenStart = contentStart;

    return {
      contentStart,
      typedText,
      tokenStart,
      hasSpaceBeforeEnd,
      needsLeadingSpace: !hasSpaceAfterNow
    };
  }

  /**
   * Get completion items for now aliases
   */
  private getAliasCompletions(
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText.toLowerCase();

    const replaceRange = new vscode.Range(
      position.line,
      context.tokenStart,
      position.line,
      position.character
    );

    for (let i = 0; i < NOW_ALIASES.length; i++) {
      const alias = NOW_ALIASES[i];

      // Filter by typed text (case-insensitive prefix match)
      if (typedText && !alias.name.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(alias.name, vscode.CompletionItemKind.Constant);
      item.detail = alias.example;
      item.documentation = new vscode.MarkdownString(
        `**${alias.name}**: ${alias.description}\n\nExample output: \`${alias.example}\``
      );

      item.range = replaceRange;
      item.sortText = String(i).padStart(2, '0'); // Preserve definition order

      const leadingSpace = context.needsLeadingSpace ? ' ' : '';
      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = leadingSpace + alias.name + trailingSpace;

      completions.push(item);
    }

    return completions;
  }
}
