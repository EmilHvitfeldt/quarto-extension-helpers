/**
 * Generic completion provider that uses shortcode specs
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  ShortcodeSpec,
  SpecArgument,
  SpecAttribute,
  Completion,
  EnumCompletion,
  FileDataCompletion,
  FrontmatterCompletion,
  FreeformCompletion,
} from './spec-types';
import { loadFileData } from './spec-loader';
import {
  getShortcodeContext,
  analyzeShortcodeContext,
  analyzeAttributeOnlyContext,
  createReplaceRange,
} from './shortcode-provider';
import { getBrandColors } from './utils';
import { CSS_COLOR_NAMES } from './color-utils';
import { ShortcodeContext } from './types';

/**
 * Create a completion provider from a shortcode spec
 */
export function createSpecProvider(spec: ShortcodeSpec): vscode.CompletionItemProvider {
  return new SpecCompletionProvider(spec);
}

/**
 * Generic completion provider based on a spec
 */
class SpecCompletionProvider implements vscode.CompletionItemProvider {
  private spec: ShortcodeSpec;
  private attributeMap: Map<string, SpecAttribute>;

  constructor(spec: ShortcodeSpec) {
    this.spec = spec;
    this.attributeMap = new Map(
      (spec.attributes || []).map(attr => [attr.name, attr])
    );
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    const lineText = document.lineAt(position).text;
    const shortcodeName = this.spec.shortcode;

    const baseContext = getShortcodeContext(lineText, position.character, shortcodeName);
    if (!baseContext) {
      return undefined;
    }

    // Get content before cursor for analysis
    const marker = `{{< ${shortcodeName}`;
    const markerEnd = lineText.lastIndexOf(marker) + marker.length;
    const contentBeforeCursor = lineText.substring(markerEnd, position.character);
    const hasSpaceAfterName = lineText[markerEnd] === ' ';

    // Determine if we have positional arguments
    const hasArguments = this.spec.arguments && this.spec.arguments.length > 0;

    let context: ShortcodeContext;

    if (hasArguments) {
      // Use analyzeShortcodeContext for shortcodes with positional arguments
      context = analyzeShortcodeContext(
        baseContext,
        contentBeforeCursor,
        position.character,
        hasSpaceAfterName,
        (content) => this.hasPrimaryValue(content),
        'icon' // Generic type, will be handled by argument completion
      );

      // Map 'icon' back to first argument
      if (context.completionType === 'icon') {
        return this.getArgumentCompletions(
          this.spec.arguments![0],
          context,
          position,
          document
        );
      }
    } else {
      // Use analyzeAttributeOnlyContext for attribute-only shortcodes
      context = analyzeAttributeOnlyContext(
        baseContext,
        contentBeforeCursor,
        position.character,
        hasSpaceAfterName
      );
    }

    switch (context.completionType) {
      case 'attribute-name':
        return this.getAttributeNameCompletions(context, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(context, position, document);
      default:
        return undefined;
    }
  }

  /**
   * Check if a primary value (first positional argument) has been specified
   */
  private hasPrimaryValue(content: string): boolean {
    if (!content || !this.spec.arguments || this.spec.arguments.length === 0) {
      return false;
    }

    const parts = content.split(/\s+/).filter(p => p && !p.includes('='));
    if (parts.length === 0) {
      return false;
    }

    // Check if first part looks like a value (not an attribute name)
    const potentialValue = parts[0];
    const attributeNames = new Set((this.spec.attributes || []).map(a => a.name));

    return !attributeNames.has(potentialValue) && potentialValue.length > 0;
  }

  /**
   * Get completions for positional arguments
   */
  private async getArgumentCompletions(
    arg: SpecArgument,
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    return this.getCompletionsForType(
      arg.completion,
      context,
      position,
      document,
      arg.name
    );
  }

  /**
   * Get completions for attribute names
   */
  private getAttributeNameCompletions(
    context: ShortcodeContext,
    position: vscode.Position
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const attributes = this.spec.attributes || [];
    const typedText = context.typedText.toLowerCase();
    const replaceRange = createReplaceRange(position, context.tokenStart);
    const leadingSpace = context.needsLeadingSpace ? ' ' : '';

    // Get used attributes
    const usedAttributes = new Set<string>();
    for (const attr of attributes) {
      if (context.fullContent.includes(`${attr.name}=`)) {
        usedAttributes.add(attr.name);
      }
    }

    // Group by category for sorting
    const categoryOrder = new Map<string, number>();
    const categories = [...new Set(attributes.map(a => a.category || 'Other'))];
    categories.forEach((cat, i) => categoryOrder.set(cat, i));

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

      if (attr.description) {
        item.documentation = new vscode.MarkdownString(attr.description);
      }

      item.range = replaceRange;

      // Sort by category, then by order in spec
      const catIndex = categoryOrder.get(attr.category || 'Other') || 99;
      item.sortText = `${catIndex.toString().padStart(2, '0')}${i.toString().padStart(3, '0')}`;

      // Determine insert text based on completion type
      const completion = attr.completion;
      if (completion.type === 'enum' || completion.type === 'boolean' || completion.type === 'color') {
        item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}=\$1`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest',
        };
      } else if (attr.quoted) {
        const placeholder = (completion as FreeformCompletion).placeholder || '';
        const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
        item.insertText = new vscode.SnippetString(
          `${leadingSpace}${attr.name}="\${1:${placeholder}}"${trailingSpace}`
        );
      } else {
        const placeholder = (completion as FreeformCompletion).placeholder || '';
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
   * Get completions for attribute values
   */
  private async getAttributeValueCompletions(
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const attr = this.attributeMap.get(context.attributeName || '');
    if (!attr) {
      return [];
    }

    return this.getCompletionsForType(
      attr.completion,
      context,
      position,
      document,
      attr.name
    );
  }

  /**
   * Get completions based on completion type
   */
  private async getCompletionsForType(
    completion: Completion,
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument,
    _name: string
  ): Promise<vscode.CompletionItem[]> {
    const replaceRange = createReplaceRange(position, context.tokenStart);
    const typedText = context.typedText.toLowerCase();
    const leadingSpace = context.needsLeadingSpace ? ' ' : '';
    const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';

    switch (completion.type) {
      case 'enum':
        return this.createEnumCompletions(
          completion as EnumCompletion,
          typedText,
          replaceRange,
          leadingSpace,
          trailingSpace
        );

      case 'boolean':
        return this.createBooleanCompletions(
          completion.default,
          typedText,
          replaceRange,
          leadingSpace,
          trailingSpace
        );

      case 'color':
        return this.createColorCompletions(
          typedText,
          replaceRange,
          leadingSpace,
          trailingSpace,
          document
        );

      case 'file':
        return this.createFileCompletions(
          context,
          position,
          document,
          completion.extensions
        );

      case 'file-data':
        return this.createFileDataCompletions(
          completion as FileDataCompletion,
          typedText,
          replaceRange,
          leadingSpace,
          trailingSpace
        );

      case 'frontmatter':
        return this.createFrontmatterCompletions(
          completion as FrontmatterCompletion,
          typedText,
          replaceRange,
          leadingSpace,
          trailingSpace,
          document
        );

      case 'freeform':
      case 'none':
      default:
        return [];
    }
  }

  /**
   * Create enum value completions
   */
  private createEnumCompletions(
    completion: EnumCompletion,
    typedText: string,
    replaceRange: vscode.Range,
    leadingSpace: string,
    trailingSpace: string
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    for (const value of completion.values) {
      if (typedText && !value.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
      item.range = replaceRange;

      if (value === completion.default) {
        item.detail = '(default)';
        item.sortText = '0' + value;
      } else {
        item.sortText = '1' + value;
      }

      item.insertText = leadingSpace + value + trailingSpace;
      completions.push(item);
    }

    return completions;
  }

  /**
   * Create boolean value completions
   */
  private createBooleanCompletions(
    defaultValue: boolean | undefined,
    typedText: string,
    replaceRange: vscode.Range,
    leadingSpace: string,
    trailingSpace: string
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const defaultStr = defaultValue?.toString();

    for (const value of ['true', 'false']) {
      if (typedText && !value.startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);
      item.range = replaceRange;

      if (value === defaultStr) {
        item.detail = '(default)';
        item.sortText = '0' + value;
      } else {
        item.sortText = '1' + value;
      }

      item.insertText = leadingSpace + value + trailingSpace;
      completions.push(item);
    }

    return completions;
  }

  /**
   * Create color value completions
   */
  private async createColorCompletions(
    typedText: string,
    replaceRange: vscode.Range,
    leadingSpace: string,
    trailingSpace: string,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const completions: vscode.CompletionItem[] = [];
    const brandColors = await getBrandColors(document);

    // Add brand colors first
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
      item.insertText = leadingSpace + brandColor.value + trailingSpace;
      completions.push(item);
    }

    // Add CSS colors
    for (const color of CSS_COLOR_NAMES) {
      if (typedText && !color.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(color, vscode.CompletionItemKind.Color);
      item.detail = 'CSS color';
      item.range = replaceRange;
      item.sortText = '1' + color;
      item.insertText = leadingSpace + color + trailingSpace;
      completions.push(item);
    }

    return completions;
  }

  /**
   * Create file path completions
   */
  private async createFileCompletions(
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument,
    extensions?: string[]
  ): Promise<vscode.CompletionItem[]> {
    const completions: vscode.CompletionItem[] = [];
    const typedText = context.typedText;
    const replaceRange = createReplaceRange(position, context.tokenStart);

    const documentDir = path.dirname(document.uri.fsPath);
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
        if (name.startsWith('.')) {
          continue;
        }

        if (filterText && !name.toLowerCase().startsWith(filterText)) {
          continue;
        }

        const isDirectory = fileType === vscode.FileType.Directory;

        // Filter by extension if specified
        if (!isDirectory && extensions && extensions.length > 0) {
          const ext = path.extname(name).toLowerCase();
          if (!extensions.some(e => e.toLowerCase() === ext)) {
            continue;
          }
        }

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
      // Directory doesn't exist
    }

    return completions;
  }

  /**
   * Create file-data completions (from JSON file)
   */
  private createFileDataCompletions(
    completion: FileDataCompletion,
    typedText: string,
    replaceRange: vscode.Range,
    leadingSpace: string,
    trailingSpace: string
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const values = loadFileData(completion.source, completion.path);

    for (const value of values) {
      const displayValue = typeof value === 'string' ? value : String(value);

      if (typedText && !displayValue.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(displayValue, vscode.CompletionItemKind.Constant);
      item.range = replaceRange;
      item.insertText = leadingSpace + displayValue + trailingSpace;
      completions.push(item);
    }

    return completions;
  }

  /**
   * Create frontmatter-based completions
   */
  private createFrontmatterCompletions(
    completion: FrontmatterCompletion,
    typedText: string,
    replaceRange: vscode.Range,
    leadingSpace: string,
    trailingSpace: string,
    document: vscode.TextDocument
  ): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];
    const values = this.parseFrontmatterValues(document, completion.key, completion.valuePath);

    for (const value of values) {
      if (typedText && !value.key.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(value.key, vscode.CompletionItemKind.Reference);
      if (value.detail) {
        item.detail = value.detail;
      }
      item.range = replaceRange;
      item.insertText = leadingSpace + value.key + trailingSpace;
      completions.push(item);
    }

    return completions;
  }

  /**
   * Parse values from document frontmatter
   */
  private parseFrontmatterValues(
    document: vscode.TextDocument,
    key: string,
    valuePath?: string
  ): { key: string; detail?: string }[] {
    const text = document.getText();
    const values: { key: string; detail?: string }[] = [];

    if (!text.startsWith('---')) {
      return values;
    }

    const endIndex = text.indexOf('---', 3);
    if (endIndex === -1) {
      return values;
    }

    const frontmatter = text.substring(3, endIndex);

    // Simple YAML parsing for the specific key
    // This handles the acronyms.keys pattern
    const keyParts = key.split('.');
    let currentIndent = 0;
    let inTargetSection = false;
    let sectionDepth = 0;

    const lines = frontmatter.split('\n');

    for (const line of lines) {
      const trimmed = line.trimStart();
      const indent = line.length - trimmed.length;

      // Check for section headers
      for (let i = 0; i < keyParts.length; i++) {
        const pattern = new RegExp(`^${keyParts[i]}:\\s*$`);
        if (pattern.test(trimmed) && sectionDepth === i) {
          sectionDepth++;
          if (sectionDepth === keyParts.length) {
            inTargetSection = true;
            currentIndent = indent;
          }
          break;
        }
      }

      // Parse list items in target section
      if (inTargetSection && indent > currentIndent) {
        // Match "- shortname: value" or "shortname: value"
        const valueKey = valuePath || 'shortname';
        const pattern = new RegExp(`${valueKey}:\\s*["']?([^"'\\n]+)["']?`);
        const match = trimmed.match(pattern);
        if (match) {
          values.push({ key: match[1].trim() });
        }
      } else if (inTargetSection && indent <= currentIndent && trimmed.length > 0) {
        // Exited the section
        break;
      }
    }

    return values;
  }
}
