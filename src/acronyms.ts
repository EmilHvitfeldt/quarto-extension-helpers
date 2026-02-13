import * as vscode from 'vscode';
import { ShortcodeContext } from './types';
import { getShortcodeContext, createReplaceRange } from './shortcode-provider';

/** Shortcode name constant */
const SHORTCODE_NAME = 'acr';

/** Maximum cache entries */
const MAX_CACHE_ENTRIES = 100;

/**
 * Acronym definition from YAML frontmatter
 */
interface AcronymDefinition {
  shortname: string;
  longname: string;
}

// Cache for acronym definitions (keyed by document URI + version)
const acronymCache = new Map<string, AcronymDefinition[]>();

/**
 * Completion provider for acronyms shortcodes in Quarto
 *
 * Provides autocomplete for:
 * - {{< acr KEY >}} - where KEY is a shortname defined in acronyms.keys
 *
 * Acronyms are defined in the YAML frontmatter:
 * acronyms:
 *   keys:
 *     - shortname: qmd
 *       longname: Quarto documents
 */
export class AcronymsCompletionProvider implements vscode.CompletionItemProvider {
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

    // Get acronyms from frontmatter
    const acronyms = this.getAcronyms(document);
    if (acronyms.length === 0) {
      return undefined;
    }

    return this.getAcronymCompletions(acronyms, context, position);
  }

  /**
   * Get acronym definitions from document frontmatter
   */
  private getAcronyms(document: vscode.TextDocument): AcronymDefinition[] {
    const cacheKey = `${document.uri.toString()}:${document.version}`;

    // Check cache first
    const cached = acronymCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const acronyms = this.parseAcronymsFromFrontmatter(document);

    // Clear old versions for this document
    for (const key of acronymCache.keys()) {
      if (key.startsWith(document.uri.toString() + ':') && key !== cacheKey) {
        acronymCache.delete(key);
      }
    }

    // Enforce cache size limit
    if (acronymCache.size >= MAX_CACHE_ENTRIES) {
      const firstKey = acronymCache.keys().next().value;
      if (firstKey) {
        acronymCache.delete(firstKey);
      }
    }

    acronymCache.set(cacheKey, acronyms);
    return acronyms;
  }

  /**
   * Parse acronyms.keys from YAML frontmatter
   */
  private parseAcronymsFromFrontmatter(document: vscode.TextDocument): AcronymDefinition[] {
    const text = document.getText();
    const acronyms: AcronymDefinition[] = [];

    // Check if document starts with YAML frontmatter
    if (!text.startsWith('---')) {
      return acronyms;
    }

    // Find the closing --- of the frontmatter
    const endIndex = text.indexOf('---', 3);
    if (endIndex === -1) {
      return acronyms;
    }

    const frontmatter = text.substring(3, endIndex);

    // Find acronyms: section
    const acronymsSectionMatch = frontmatter.match(/^acronyms:\s*$/m);
    if (!acronymsSectionMatch) {
      return acronyms;
    }

    const sectionStart = acronymsSectionMatch.index! + acronymsSectionMatch[0].length;
    const afterSection = frontmatter.substring(sectionStart);

    // Find keys: subsection
    const keysSectionMatch = afterSection.match(/^\s+keys:\s*$/m);
    if (!keysSectionMatch) {
      return acronyms;
    }

    const keysStart = keysSectionMatch.index! + keysSectionMatch[0].length;
    const afterKeys = afterSection.substring(keysStart);

    // Parse the list items
    const lines = afterKeys.split('\n');
    let currentAcronym: Partial<AcronymDefinition> = {};

    for (const line of lines) {
      // Stop if we hit a line that's not indented enough (new section)
      if (line.match(/^\S/) || line.match(/^[ ]{2}\S/)) {
        break;
      }

      // Match list item start: "    - shortname: value" or "    - "
      const listItemMatch = line.match(/^\s{4,}-\s+shortname:\s*["']?([^"'\n]+)["']?\s*$/);
      if (listItemMatch) {
        // Save previous acronym if complete
        if (currentAcronym.shortname && currentAcronym.longname) {
          acronyms.push(currentAcronym as AcronymDefinition);
        }
        currentAcronym = { shortname: listItemMatch[1].trim() };
        continue;
      }

      // Match shortname on same line as dash: "    - shortname: value"
      const shortnameOnlyMatch = line.match(/^\s{4,}-\s*$/);
      if (shortnameOnlyMatch) {
        // Save previous acronym if complete
        if (currentAcronym.shortname && currentAcronym.longname) {
          acronyms.push(currentAcronym as AcronymDefinition);
        }
        currentAcronym = {};
        continue;
      }

      // Match shortname continuation: "      shortname: value"
      const shortnameMatch = line.match(/^\s{6,}shortname:\s*["']?([^"'\n]+)["']?\s*$/);
      if (shortnameMatch) {
        currentAcronym.shortname = shortnameMatch[1].trim();
        continue;
      }

      // Match longname: "      longname: value"
      const longnameMatch = line.match(/^\s{6,}longname:\s*["']?([^"'\n]+)["']?\s*$/);
      if (longnameMatch) {
        currentAcronym.longname = longnameMatch[1].trim();
        continue;
      }
    }

    // Don't forget the last acronym
    if (currentAcronym.shortname && currentAcronym.longname) {
      acronyms.push(currentAcronym as AcronymDefinition);
    }

    return acronyms;
  }

  /**
   * Get completion items for acronym shortnames
   */
  private getAcronymCompletions(
    acronyms: AcronymDefinition[],
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText.toLowerCase();
    const replaceRange = createReplaceRange(position, context.tokenStart);

    for (let i = 0; i < acronyms.length; i++) {
      const acronym = acronyms[i];

      // Filter by typed text (case-insensitive prefix match on shortname)
      if (typedText && !acronym.shortname.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(acronym.shortname, vscode.CompletionItemKind.Reference);
      item.detail = acronym.longname;
      item.documentation = new vscode.MarkdownString(
        `**${acronym.shortname}**: ${acronym.longname}\n\nDefined in document frontmatter under \`acronyms.keys\``
      );

      item.range = replaceRange;
      item.sortText = String(i).padStart(4, '0');

      const leadingSpace = context.needsLeadingSpace ? ' ' : '';
      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = leadingSpace + acronym.shortname + trailingSpace;

      completions.push(item);
    }

    return completions;
  }
}
