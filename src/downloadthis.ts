import * as vscode from 'vscode';
import * as path from 'path';

type ValueType = 'string' | 'enum';

interface DownloadthisAttribute {
  name: string;
  description: string;
  valueType: ValueType;
  values?: string[];
  defaultValue?: string;
  placeholder?: string;
  quoted?: boolean;
}

/** Downloadthis shortcode attributes */
const DOWNLOADTHIS_ATTRIBUTES: DownloadthisAttribute[] = [
  {
    name: 'dname',
    description: 'The filename (without file extension) which will be assigned to the downloaded file',
    valueType: 'string',
    defaultValue: 'file',
    placeholder: 'my-file'
  },
  {
    name: 'label',
    description: 'Text displayed on the download button',
    valueType: 'string',
    defaultValue: 'Download',
    placeholder: 'Download Data',
    quoted: true
  },
  {
    name: 'icon',
    description: 'Bootstrap Icon for the button',
    valueType: 'string',
    defaultValue: 'download',
    placeholder: 'file-earmark-arrow-down'
  },
  {
    name: 'type',
    description: 'Button styling variant',
    valueType: 'enum',
    values: ['default', 'primary', 'secondary', 'success', 'warning', 'danger', 'info', 'light', 'dark'],
    defaultValue: 'default'
  },
  {
    name: 'class',
    description: 'CSS class applied to the button',
    valueType: 'string',
    placeholder: 'my-button-class'
  },
  {
    name: 'id',
    description: 'CSS identifier for the button',
    valueType: 'string',
    placeholder: 'my-button-id'
  }
];

/** Map for O(1) attribute lookup */
const DOWNLOADTHIS_ATTRIBUTES_MAP = new Map<string, DownloadthisAttribute>(
  DOWNLOADTHIS_ATTRIBUTES.map(attr => [attr.name, attr])
);

type CompletionType = 'file' | 'attribute-name' | 'attribute-value';

interface ShortcodeContext {
  fullContent: string;
  contentStart: number;
  completionType: CompletionType;
  typedText: string;
  tokenStart: number;
  attributeName?: string;
  hasSpaceBeforeEnd: boolean;
  needsLeadingSpace: boolean;
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

    const shortcodeContext = this.getShortcodeContext(lineText, position.character);
    if (!shortcodeContext) {
      return undefined;
    }

    switch (shortcodeContext.completionType) {
      case 'file':
        return this.getFileCompletions(shortcodeContext, position, document);
      case 'attribute-name':
        return this.getAttributeNameCompletions(shortcodeContext, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(shortcodeContext, position);
      default:
        return undefined;
    }
  }

  /**
   * Find the shortcode context if cursor is inside {{< downloadthis ... >}}
   */
  private getShortcodeContext(lineText: string, cursorPos: number): ShortcodeContext | null {
    const beforeCursor = lineText.substring(0, cursorPos);
    const shortcodeStart = beforeCursor.lastIndexOf('{{< downloadthis');

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

    // Extract full content between "{{< downloadthis" and ">}}"
    const downloadthisEnd = shortcodeStart + '{{< downloadthis'.length;
    const shortcodeEnd = cursorPos + shortcodeEndRelative;
    const fullContent = lineText.substring(downloadthisEnd, shortcodeEnd).trim();

    // Find where content starts (skip spaces after "downloadthis")
    let contentStart = downloadthisEnd;
    while (contentStart < cursorPos && lineText[contentStart] === ' ') {
      contentStart++;
    }
    if (contentStart > cursorPos) {
      contentStart = cursorPos;
    }

    // Content before cursor
    const contentBeforeCursor = lineText.substring(downloadthisEnd, cursorPos);

    // Check if there's a space immediately after "downloadthis"
    const hasSpaceAfterDownloadthis = lineText[downloadthisEnd] === ' ';

    return this.analyzeContext(
      contentBeforeCursor,
      fullContent,
      contentStart,
      cursorPos,
      hasSpaceBeforeEnd,
      hasSpaceAfterDownloadthis
    );
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
    hasSpaceAfterDownloadthis: boolean
  ): ShortcodeContext {
    // Check if we're after an attribute= (completing a value)
    const attrValueMatch = contentBeforeCursor.match(/(\w+)=([^\s]*)$/);
    if (attrValueMatch) {
      const attrName = attrValueMatch[1];
      const typedValue = attrValueMatch[2].replace(/^["']/, '');
      const tokenStart = cursorPos - typedValue.length;

      return {
        fullContent,
        contentStart,
        completionType: 'attribute-value',
        typedText: typedValue,
        tokenStart,
        attributeName: attrName,
        hasSpaceBeforeEnd,
        needsLeadingSpace: false
      };
    }

    // Check if a file has been specified (first non-attribute token)
    const hasFile = this.hasFileSpecified(contentBeforeCursor.trim());

    if (hasFile) {
      // After file, suggest attributes
      const lastSpaceIndex = contentBeforeCursor.lastIndexOf(' ');
      const typedText = lastSpaceIndex >= 0
        ? contentBeforeCursor.substring(lastSpaceIndex + 1)
        : contentBeforeCursor.trim();
      const tokenStart = cursorPos - typedText.length;

      return {
        fullContent,
        contentStart,
        completionType: 'attribute-name',
        typedText,
        tokenStart,
        hasSpaceBeforeEnd,
        needsLeadingSpace: false
      };
    }

    // No file yet, suggest files
    const typedText = contentBeforeCursor.trim();
    const tokenStart = contentStart;

    return {
      fullContent,
      contentStart,
      completionType: 'file',
      typedText,
      tokenStart,
      hasSpaceBeforeEnd,
      needsLeadingSpace: !hasSpaceAfterDownloadthis
    };
  }

  /**
   * Check if a file path has been specified in the content
   */
  private hasFileSpecified(content: string): boolean {
    if (!content) {
      return false;
    }

    const parts = content.split(/\s+/).filter(p => p && !p.includes('='));

    // If there's at least one non-attribute part, it's the file
    if (parts.length >= 1) {
      const potentialFile = parts[0];

      // Don't treat known attribute names as files
      const attributeNames = DOWNLOADTHIS_ATTRIBUTES.map(a => a.name);
      if (attributeNames.includes(potentialFile)) {
        return false;
      }

      // It looks like a file if it contains a dot (extension) or slash (path)
      // or is any non-empty string that's not an attribute name
      return potentialFile.length > 0;
    }

    return false;
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

    const replaceRange = new vscode.Range(
      position.line,
      context.tokenStart,
      position.line,
      position.character
    );

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

        // Sort directories first, then files
        item.sortText = (isDirectory ? '0' : '1') + name;

        const leadingSpace = context.needsLeadingSpace ? ' ' : '';

        if (isDirectory) {
          // For directories, add trailing slash and trigger more completions
          item.insertText = leadingSpace + fullPath + '/';
          item.command = {
            command: 'editor.action.triggerSuggest',
            title: 'Trigger Suggest'
          };
        } else {
          // For files, add trailing space
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
   * Get attribute name completions
   */
  private getAttributeNameCompletions(
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText.toLowerCase();

    // Find which attributes are already used
    const usedAttributes = new Set<string>();
    for (const attr of DOWNLOADTHIS_ATTRIBUTES) {
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

    for (let i = 0; i < DOWNLOADTHIS_ATTRIBUTES.length; i++) {
      const attr = DOWNLOADTHIS_ATTRIBUTES[i];

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

      // Build documentation
      let doc = attr.description;
      if (attr.defaultValue !== undefined) {
        doc += `\n\nDefault: \`${attr.defaultValue}\``;
      }
      if (attr.values && attr.values.length > 0) {
        doc += `\n\nValues: ${attr.values.map(v => `\`${v}\``).join(', ')}`;
      }
      item.documentation = new vscode.MarkdownString(doc);

      item.range = replaceRange;
      item.sortText = String(i).padStart(2, '0');

      const leadingSpace = context.needsLeadingSpace ? ' ' : '';

      if (attr.valueType === 'enum') {
        // Trigger suggestions for values
        item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}=\$1`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest'
        };
      } else if (attr.quoted) {
        // Quoted value with placeholder inside quotes
        const placeholder = attr.placeholder || '';
        const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
        item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}="\${1:${placeholder}}"${trailingSpace}`);
      } else {
        // Free-form value with placeholder
        const placeholder = attr.placeholder || '';
        const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
        item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}=\${1:${placeholder}}${trailingSpace}`);
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
    const attr = DOWNLOADTHIS_ATTRIBUTES_MAP.get(context.attributeName || '');
    if (!attr || !attr.values || attr.values.length === 0) {
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

    for (const value of attr.values) {
      if (typedText && !value.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
      item.range = replaceRange;

      if (value === attr.defaultValue) {
        item.detail = '(default)';
        item.sortText = '0' + value;
      } else {
        item.sortText = '1' + value;
      }

      const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
      item.insertText = value + trailingSpace;

      completions.push(item);
    }

    return completions;
  }
}
