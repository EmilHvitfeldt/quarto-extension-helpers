import * as vscode from 'vscode';
import { AttributeDefinition, BrandColor } from './types';
import {
  createReplaceRange,
  getUsedAttributes,
  createBooleanValueCompletions,
  createEnumValueCompletions,
} from './shortcode-provider';
import { hasFilter, getBrandColors } from './utils';
import {
  parseColor,
  colorToHex,
  colorToRgb,
  findNamedColor,
  findBrandColorName,
} from './color-utils';
import { FILTER } from './constants';

/** Filter name constant */
const FILTER_NAME = FILTER.ROUGHNOTATION;

/** Roughnotation attributes */
const RN_ATTRIBUTES: AttributeDefinition[] = [
  // Attributes with fixed options (enum-like)
  {
    name: 'rn-type',
    description: 'The type of annotation to draw',
    valueType: 'enum',
    values: ['highlight', 'underline', 'box', 'circle', 'strike-through', 'crossed-off', 'bracket'],
    defaultValue: 'highlight',
  },
  {
    name: 'rn-brackets',
    description: 'Which sides to draw brackets on (can be comma-separated)',
    valueType: 'enum',
    values: ['left', 'right', 'top', 'bottom', 'left,right', 'top,bottom'],
    defaultValue: 'right',
  },
  {
    name: 'rn-animate',
    description: 'Whether to animate the annotation',
    valueType: 'boolean',
    defaultValue: 'true',
  },
  {
    name: 'rn-multiline',
    description: 'Whether to annotate across multiple lines',
    valueType: 'boolean',
    defaultValue: 'false',
  },
  {
    name: 'rn-rtl',
    description: 'Right-to-left text direction',
    valueType: 'boolean',
    defaultValue: 'false',
  },

  // Attributes with free-form values
  {
    name: 'rn-color',
    description: 'CSS color for the annotation',
    valueType: 'color',
    values: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black'],
    defaultValue: 'yellow',
  },
  {
    name: 'rn-animationDuration',
    description: 'Animation duration in milliseconds',
    valueType: 'number',
    placeholder: '800',
    defaultValue: '800',
  },
  {
    name: 'rn-strokeWidth',
    description: 'Stroke width in pixels',
    valueType: 'number',
    placeholder: '1',
    defaultValue: '1',
  },
  {
    name: 'rn-padding',
    description: 'Padding around the annotation in pixels',
    valueType: 'number',
    placeholder: '5',
    defaultValue: '5',
  },
  {
    name: 'rn-iterations',
    description: 'Number of drawing passes',
    valueType: 'number',
    placeholder: '2',
    defaultValue: '2',
  },
  {
    name: 'fragment-index',
    description: 'RevealJS fragment order',
    valueType: 'number',
    placeholder: '1',
  },
];

/** Map for O(1) attribute lookup */
const RN_ATTRIBUTES_MAP = new Map<string, AttributeDefinition>(
  RN_ATTRIBUTES.map(attr => [attr.name, attr])
);

/** Span context for roughnotation */
interface SpanContext {
  content: string;
}

/** Completion context types */
interface CompletionContext {
  type: 'attribute-name' | 'attribute-value';
  prefix?: string;
  attributeName?: string;
  needsLeadingSpace?: boolean;
}

/**
 * Completion provider for roughnotation attributes in Quarto documents
 */
export class RoughNotationCompletionProvider implements vscode.CompletionItemProvider {
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | undefined> {
    // Check if roughnotation filter is loaded in the document
    if (!hasFilter(document, FILTER_NAME)) {
      return undefined;
    }

    const lineText = document.lineAt(position).text;
    const textBeforeCursor = lineText.substring(0, position.character);

    // Check if we're inside a span with .rn-fragment or .rn class
    const spanContext = this.getSpanContext(lineText, position.character);
    if (!spanContext) {
      return undefined;
    }

    // Determine what kind of completion to provide
    const completionContext = this.getCompletionContext(textBeforeCursor);
    if (!completionContext) {
      return undefined;
    }

    if (completionContext.type === 'attribute-name') {
      return this.getAttributeNameCompletions(
        spanContext.content,
        completionContext.prefix || '',
        position,
        completionContext.needsLeadingSpace || false
      );
    } else if (completionContext.type === 'attribute-value' && completionContext.attributeName) {
      // Fetch brand colors for rn-color suggestions
      const brandColors = completionContext.attributeName === 'rn-color'
        ? await getBrandColors(document)
        : [];
      return this.getAttributeValueCompletions(completionContext.attributeName, position, brandColors);
    }

    return undefined;
  }

  /**
   * Parse the line to find span context (content between { and }).
   * Note: This only works for single-line spans. Multi-line spans are not supported.
   */
  private getSpanContext(lineText: string, cursorPos: number): SpanContext | null {
    // Find the opening brace before cursor
    let braceStart = -1;
    for (let i = cursorPos - 1; i >= 0; i--) {
      if (lineText[i] === '{') {
        braceStart = i;
        break;
      }
      if (lineText[i] === '}') {
        return null;
      }
    }

    if (braceStart === -1) {
      return null;
    }

    // Find the closing brace after cursor
    let braceEnd = -1;
    for (let i = cursorPos; i < lineText.length; i++) {
      if (lineText[i] === '}') {
        braceEnd = i;
        break;
      }
      if (lineText[i] === '{') {
        return null;
      }
    }

    if (braceEnd === -1) {
      return null;
    }

    const content = lineText.substring(braceStart + 1, braceEnd);

    // Check if this span contains .rn-fragment or .rn class
    if (!this.isRoughNotationSpan(content)) {
      return null;
    }

    return { content };
  }

  /**
   * Check if span content contains roughnotation class.
   */
  private isRoughNotationSpan(content: string): boolean {
    return /(?:^|\s)\.rn-fragment\b/.test(content) || /(?:^|\s)\.rn\b/.test(content);
  }

  /**
   * Determine what kind of completion to provide based on cursor position
   */
  private getCompletionContext(textBeforeCursor: string): CompletionContext | null {
    // Check if we just typed '=' after an attribute name
    const attrValueMatch = textBeforeCursor.match(/([\w-]+)=["']?$/);
    if (attrValueMatch) {
      return {
        type: 'attribute-value',
        attributeName: attrValueMatch[1],
      };
    }

    // Check if we're typing an attribute name (after space, or typing rn-)
    const attrNameMatch = textBeforeCursor.match(/\s([\w-]*)$/);
    if (attrNameMatch) {
      return {
        type: 'attribute-name',
        prefix: attrNameMatch[1],
        needsLeadingSpace: false,
      };
    }

    // Check if cursor is right after the class (with or without space)
    const classMatch = textBeforeCursor.match(/\.(rn-fragment|rn)(\s*)$/);
    if (classMatch) {
      return {
        type: 'attribute-name',
        prefix: '',
        needsLeadingSpace: classMatch[2].length === 0,
      };
    }

    return null;
  }

  /**
   * Get completions for attribute names
   */
  private getAttributeNameCompletions(
    spanContent: string,
    prefix: string,
    position: vscode.Position,
    needsLeadingSpace: boolean
  ): vscode.CompletionItem[] {
    const usedAttributes = getUsedAttributes(spanContent, RN_ATTRIBUTES);
    const replaceRange = createReplaceRange(position, position.character - prefix.length);
    const spacePrefix = needsLeadingSpace ? ' ' : '';

    const completions: vscode.CompletionItem[] = [];
    for (const attr of RN_ATTRIBUTES) {
      if (usedAttributes.has(attr.name)) {
        continue;
      }

      if (prefix && !attr.name.startsWith(prefix)) {
        continue;
      }

      const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property);
      item.detail = attr.valueType;
      item.documentation = new vscode.MarkdownString(attr.description);
      item.range = replaceRange;

      if (attr.valueType === 'enum' || attr.valueType === 'boolean' || attr.valueType === 'color') {
        item.insertText = new vscode.SnippetString(`${spacePrefix}${attr.name}=\${1}`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest',
        };
      } else {
        item.insertText = new vscode.SnippetString(`${spacePrefix}${attr.name}=\${1:${attr.placeholder || ''}}`);
      }

      completions.push(item);
    }

    return completions;
  }

  /**
   * Get completions for attribute values
   */
  private getAttributeValueCompletions(
    attributeName: string,
    position: vscode.Position,
    brandColors: BrandColor[] = []
  ): vscode.CompletionItem[] {
    const attr = RN_ATTRIBUTES_MAP.get(attributeName);
    if (!attr) {
      return [];
    }

    const completions: vscode.CompletionItem[] = [];

    // Create a minimal context for the shared helpers
    const context = {
      fullContent: '',
      contentStart: position.character,
      completionType: 'attribute-value' as const,
      typedText: '',
      tokenStart: position.character,
      hasSpaceBeforeEnd: false,
      needsLeadingSpace: false,
    };

    // Add brand colors first for rn-color (they take priority)
    if (attr.name === 'rn-color' && brandColors.length > 0) {
      for (const brandColor of brandColors) {
        const item = new vscode.CompletionItem(brandColor.name, vscode.CompletionItemKind.Color);
        item.detail = `Brand: ${brandColor.value}`;
        item.documentation = new vscode.MarkdownString(
          `Brand color from \`_brand.yml\`\n\nInserts: \`${brandColor.value}\``
        );
        item.insertText = brandColor.value;
        item.sortText = '0' + brandColor.name;
        completions.push(item);
      }
    }

    if (attr.valueType === 'boolean') {
      const boolCompletions = createBooleanValueCompletions(context, position, attr.defaultValue);
      // Remove trailing space from insert text for span context
      for (const item of boolCompletions) {
        if (typeof item.insertText === 'string') {
          item.insertText = item.insertText.trim();
        }
      }
      completions.push(...boolCompletions);
    } else if (attr.values && attr.values.length > 0) {
      const enumCompletions = createEnumValueCompletions(attr.values, context, position, attr.defaultValue);
      // Remove trailing space and add brackets hint for rn-brackets
      for (const item of enumCompletions) {
        if (typeof item.insertText === 'string') {
          item.insertText = item.insertText.trim();
        }
        if (attr.name === 'rn-brackets') {
          item.documentation = new vscode.MarkdownString(
            `Add \`${item.label}\` bracket. Multiple values can be comma-separated.`
          );
        }
      }
      completions.push(...enumCompletions);
    } else if (attr.valueType === 'number') {
      const item = new vscode.CompletionItem(
        attr.placeholder || '0',
        vscode.CompletionItemKind.Value
      );
      item.detail = attr.description;
      completions.push(item);
    }

    return completions;
  }
}

/**
 * Color provider for rn-color attributes - shows VS Code's color picker
 */
export class RoughNotationColorProvider implements vscode.DocumentColorProvider {
  // Cache brand colors per document for use in provideColorPresentations
  private brandColorsCache = new Map<string, BrandColor[]>();

  async provideDocumentColors(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): Promise<vscode.ColorInformation[]> {
    if (!hasFilter(document, FILTER_NAME)) {
      return [];
    }

    const brandColors = await getBrandColors(document);
    this.brandColorsCache.set(document.uri.toString(), brandColors);

    const colors: vscode.ColorInformation[] = [];
    const text = document.getText();
    const pattern = /rn-color=([^\s}]+)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const colorValue = match[1];
      const color = parseColor(colorValue, brandColors);

      if (color) {
        const startPos = document.positionAt(match.index + 'rn-color='.length);
        const endPos = document.positionAt(match.index + 'rn-color='.length + colorValue.length);
        const range = new vscode.Range(startPos, endPos);
        colors.push(new vscode.ColorInformation(range, color));
      }
    }

    return colors;
  }

  async provideColorPresentations(
    color: vscode.Color,
    context: { document: vscode.TextDocument; range: vscode.Range },
    _token: vscode.CancellationToken
  ): Promise<vscode.ColorPresentation[]> {
    const presentations: vscode.ColorPresentation[] = [];
    const brandColors = this.brandColorsCache.get(context.document.uri.toString()) || [];

    const hex = colorToHex(color);
    presentations.push(new vscode.ColorPresentation(hex));
    presentations.push(new vscode.ColorPresentation(colorToRgb(color)));

    const brandColorName = findBrandColorName(color, brandColors);
    if (brandColorName) {
      const brandPresentation = new vscode.ColorPresentation(`${hex} (${brandColorName})`);
      brandPresentation.label = `${hex} (${brandColorName})`;
      brandPresentation.textEdit = new vscode.TextEdit(context.range, hex);
      presentations.unshift(brandPresentation);
    }

    const namedColor = findNamedColor(color);
    if (namedColor) {
      presentations.unshift(new vscode.ColorPresentation(namedColor));
    }

    return presentations;
  }
}
