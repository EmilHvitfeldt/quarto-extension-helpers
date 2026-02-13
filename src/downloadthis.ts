import * as vscode from 'vscode';
import * as path from 'path';
import { ShortcodeContext, AttributeDefinition } from './types';
import {
  getShortcodeContext,
  analyzeShortcodeContext,
  createReplaceRange,
  createAttributeNameCompletions,
  createEnumValueCompletions,
} from './shortcode-provider';

/** Shortcode name constant */
const SHORTCODE_NAME = 'downloadthis';

/** Downloadthis shortcode attributes */
const ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'dname',
    description: 'The filename (without file extension) which will be assigned to the downloaded file',
    valueType: 'string',
    defaultValue: 'file',
    placeholder: 'my-file',
  },
  {
    name: 'label',
    description: 'Text displayed on the download button',
    valueType: 'string',
    defaultValue: 'Download',
    placeholder: 'Download Data',
    quoted: true,
  },
  {
    name: 'icon',
    description: 'Bootstrap Icon for the button',
    valueType: 'string',
    defaultValue: 'download',
    placeholder: 'file-earmark-arrow-down',
  },
  {
    name: 'type',
    description: 'Button styling variant',
    valueType: 'enum',
    values: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'light', 'dark'],
    defaultValue: 'default',
  },
  {
    name: 'class',
    description: 'CSS class applied to the button',
    valueType: 'string',
    placeholder: 'my-button-class',
  },
  {
    name: 'id',
    description: 'CSS identifier for the button',
    valueType: 'string',
    placeholder: 'my-button-id',
  },
];

/** Map for O(1) attribute lookup */
const ATTRIBUTES_MAP = new Map<string, AttributeDefinition>(
  ATTRIBUTES.map(attr => [attr.name, attr])
);

/** Attribute names set for quick lookup */
const ATTRIBUTE_NAMES = new Set(ATTRIBUTES.map(a => a.name));

/**
 * Check if a file path has been specified in the content
 */
function hasFileSpecified(content: string): boolean {
  if (!content) {
    return false;
  }

  const parts = content.split(/\s+/).filter(p => p && !p.includes('='));

  if (parts.length >= 1) {
    const potentialFile = parts[0];

    // Don't treat known attribute names as files
    if (ATTRIBUTE_NAMES.has(potentialFile)) {
      return false;
    }

    return potentialFile.length > 0;
  }

  return false;
}

/**
 * Completion provider for downloadthis in Quarto shortcodes
 *
 * Provides autocomplete for:
 * - File paths: {{< downloadthis path/to/file.csv >}}
 * - Attributes: {{< downloadthis file.csv dname="data" label="Download CSV" >}}
 */
export class DownloadthisCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const lineText = document.lineAt(position).text;

    const baseContext = getShortcodeContext(lineText, position.character, SHORTCODE_NAME);
    if (!baseContext) {
      return undefined;
    }

    // Get content before cursor for analysis
    const marker = `{{< ${SHORTCODE_NAME}`;
    const markerEnd = lineText.lastIndexOf(marker) + marker.length;
    const contentBeforeCursor = lineText.substring(markerEnd, position.character);
    const hasSpaceAfterName = lineText[markerEnd] === ' ';

    const context = analyzeShortcodeContext(
      baseContext,
      contentBeforeCursor,
      position.character,
      hasSpaceAfterName,
      hasFileSpecified,
      'file'
    );

    switch (context.completionType) {
      case 'file':
        return this.getFileCompletions(context, position, document);
      case 'attribute-name':
        return createAttributeNameCompletions(ATTRIBUTES, context, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(context, position);
      default:
        return undefined;
    }
  }

  /**
   * Get file completions from the workspace
   */
  private async getFileCompletions(
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText;
    const replaceRange = createReplaceRange(position, context.tokenStart);

    // Get the directory of the current document
    const documentDir = path.dirname(document.uri.fsPath);

    // Determine the search directory and prefix based on typed text
    let searchDir = documentDir;
    let prefix = '';

    if (typedText.includes('/')) {
      const lastSlash = typedText.lastIndexOf('/');
      prefix = typedText.substring(0, lastSlash + 1);
      const relativePath = typedText.substring(0, lastSlash);
      searchDir = path.resolve(documentDir, relativePath);
    }

    try {
      const searchUri = vscode.Uri.file(searchDir);
      const entries = await vscode.workspace.fs.readDirectory(searchUri);

      const filterText = typedText.includes('/')
        ? typedText.substring(typedText.lastIndexOf('/') + 1).toLowerCase()
        : typedText.toLowerCase();

      for (const [name, fileType] of entries) {
        // Skip hidden files
        if (name.startsWith('.')) {
          continue;
        }

        // Filter by typed text
        if (filterText && !name.toLowerCase().startsWith(filterText)) {
          continue;
        }

        const isDirectory = fileType === vscode.FileType.Directory;
        const fullPath = prefix + name;

        const item = new vscode.CompletionItem(
          name,
          isDirectory ? vscode.CompletionItemKind.Folder : vscode.CompletionItemKind.File
        );

        item.detail = isDirectory ? 'Directory' : 'File';
        item.range = replaceRange;
        item.sortText = (isDirectory ? '0' : '1') + name;

        const leadingSpace = context.needsLeadingSpace ? ' ' : '';

        if (isDirectory) {
          item.insertText = leadingSpace + fullPath + '/';
          item.command = {
            command: 'editor.action.triggerSuggest',
            title: 'Trigger Suggest',
          };
        } else {
          const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
          item.insertText = leadingSpace + fullPath + trailingSpace;
        }

        completions.push(item);
      }
    } catch {
      // Directory doesn't exist or can't be read
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
    const attr = ATTRIBUTES_MAP.get(context.attributeName || '');
    if (!attr || !attr.values || attr.values.length === 0) {
      return [];
    }

    return createEnumValueCompletions(attr.values, context, position, attr.defaultValue);
  }
}
