import * as vscode from 'vscode';
import { ShortcodeContext } from './types';
import { getShortcodeContext, createReplaceRange } from './shortcode-provider';

/** Shortcode name constant */
const SHORTCODE_NAME = 'now';

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
  { name: 'timestamp', description: 'Unix timestamp', example: '1711720200' },
];

/**
 * Completion provider for the now shortcode in Quarto
 *
 * Provides autocomplete for:
 * - {{< now ALIAS >}} - where ALIAS is a predefined format alias
 */
export class NowCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    const lineText = document.lineAt(position).text;

    const context = getShortcodeContext(lineText, position.character, SHORTCODE_NAME);
    if (!context) {
      return undefined;
    }

    return this.getAliasCompletions(context, position);
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
    const replaceRange = createReplaceRange(position, context.tokenStart);

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
      item.sortText = String(i).padStart(2, '0');

      const leadingSpace = context.needsLeadingSpace ? ' ' : '';
      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = leadingSpace + alias.name + trailingSpace;

      completions.push(item);
    }

    return completions;
  }
}
