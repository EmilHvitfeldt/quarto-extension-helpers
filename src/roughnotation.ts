import * as vscode from 'vscode';
import { hasFilter } from './utils';

type ValueType = 'enum' | 'boolean' | 'color' | 'number';

interface RnAttribute {
  name: string;
  description: string;
  valueType: ValueType;
  values?: string[];
  placeholder?: string;
  defaultValue?: string;
}

interface SpanContext {
  start: number;
  end: number;
  content: string;
}

interface CompletionContext {
  type: 'attribute-name' | 'attribute-value';
  prefix?: string;
  attributeName?: string;
}

const RN_ATTRIBUTES: RnAttribute[] = [
  // Attributes with fixed options (enum-like)
  {
    name: 'rn-type',
    description: 'The type of annotation to draw',
    valueType: 'enum',
    values: ['highlight', 'underline', 'box', 'circle', 'strike-through', 'crossed-off', 'bracket'],
    defaultValue: 'highlight'
  },
  {
    name: 'rn-brackets',
    description: 'Which sides to draw brackets on (can be comma-separated)',
    valueType: 'enum',
    values: ['left', 'right', 'top', 'bottom'],
    defaultValue: 'right'
  },
  {
    name: 'rn-animate',
    description: 'Whether to animate the annotation',
    valueType: 'boolean',
    values: ['true', 'false'],
    defaultValue: 'true'
  },
  {
    name: 'rn-multiline',
    description: 'Whether to annotate across multiple lines',
    valueType: 'boolean',
    values: ['true', 'false'],
    defaultValue: 'false'
  },
  {
    name: 'rn-rtl',
    description: 'Right-to-left text direction',
    valueType: 'boolean',
    values: ['true', 'false'],
    defaultValue: 'false'
  },

  // Attributes with free-form values
  {
    name: 'rn-color',
    description: 'CSS color for the annotation',
    valueType: 'color',
    values: ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'black'],
    defaultValue: 'yellow'
  },
  {
    name: 'rn-animationDuration',
    description: 'Animation duration in milliseconds',
    valueType: 'number',
    placeholder: '800',
    defaultValue: '800'
  },
  {
    name: 'rn-strokeWidth',
    description: 'Stroke width in pixels',
    valueType: 'number',
    placeholder: '1',
    defaultValue: '1'
  },
  {
    name: 'rn-padding',
    description: 'Padding around the annotation in pixels',
    valueType: 'number',
    placeholder: '5',
    defaultValue: '5'
  },
  {
    name: 'rn-iterations',
    description: 'Number of drawing passes',
    valueType: 'number',
    placeholder: '2',
    defaultValue: '2'
  },
  {
    name: 'fragment-index',
    description: 'RevealJS fragment order',
    valueType: 'number',
    placeholder: '1'
  }
];

function getAttributeByName(name: string): RnAttribute | undefined {
  return RN_ATTRIBUTES.find(attr => attr.name === name);
}

/**
 * Completion provider for roughnotation attributes in Quarto documents
 */
export class RoughNotationCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
    _context: vscode.CompletionContext
  ): vscode.CompletionItem[] | undefined {
    // Check if roughnotation filter is loaded in the document
    if (!hasFilter(document, 'roughnotation')) {
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
      return this.getAttributeNameCompletions(spanContext.content, completionContext.prefix || '', position);
    } else if (completionContext.type === 'attribute-value' && completionContext.attributeName) {
      return this.getAttributeValueCompletions(completionContext.attributeName);
    }

    return undefined;
  }

  /**
   * Parse the line to find span context (content between { and })
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
        // Found closing brace before opening, cursor is outside
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
        // Found another opening brace, cursor is outside
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

    return {
      start: braceStart,
      end: braceEnd,
      content: content
    };
  }

  /**
   * Check if span content contains roughnotation class
   */
  private isRoughNotationSpan(content: string): boolean {
    // Match .rn-fragment or .rn (but not .rn- followed by other things like .rn-type)
    return /\.rn-fragment\b/.test(content) || /\.rn\b/.test(content);
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
        attributeName: attrValueMatch[1]
      };
    }

    // Check if we're typing an attribute name (after space, or typing rn-)
    const attrNameMatch = textBeforeCursor.match(/\s([\w-]*)$/);
    if (attrNameMatch) {
      return {
        type: 'attribute-name',
        prefix: attrNameMatch[1]
      };
    }

    // Check if cursor is right after the class with a space
    if (textBeforeCursor.match(/\.(rn-fragment|rn)\s*$/)) {
      return {
        type: 'attribute-name',
        prefix: ''
      };
    }

    return null;
  }

  /**
   * Get completions for attribute names
   */
  private getAttributeNameCompletions(spanContent: string, prefix: string, position: vscode.Position): vscode.CompletionItem[] {
    // Find attributes already used in the span
    const usedAttributes = this.getUsedAttributes(spanContent);

    // Calculate the range to replace (the typed prefix)
    const replaceRange = new vscode.Range(
      position.line,
      position.character - prefix.length,
      position.line,
      position.character
    );

    const completions: vscode.CompletionItem[] = [];
    for (const attr of RN_ATTRIBUTES) {
      // Skip if already used
      if (usedAttributes.has(attr.name)) {
        continue;
      }

      // Skip if doesn't match prefix
      if (prefix && !attr.name.startsWith(prefix)) {
        continue;
      }

      const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property);
      item.detail = attr.valueType;
      item.documentation = new vscode.MarkdownString(attr.description);
      item.range = replaceRange;

      // Insert with = for easier value entry
      if (attr.valueType === 'enum' || attr.valueType === 'boolean' || attr.valueType === 'color') {
        item.insertText = new vscode.SnippetString(`${attr.name}=\${1}`);
        // Trigger suggestions for values after inserting
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest'
        };
      } else {
        item.insertText = new vscode.SnippetString(`${attr.name}=\${1:${attr.placeholder || ''}}`);
      }

      completions.push(item);
    }

    return completions;
  }

  /**
   * Get completions for attribute values
   */
  private getAttributeValueCompletions(attributeName: string): vscode.CompletionItem[] {
    const attr = getAttributeByName(attributeName);
    if (!attr) {
      return [];
    }

    const completions: vscode.CompletionItem[] = [];

    if (attr.values && attr.values.length > 0) {
      for (const value of attr.values) {
        const item = new vscode.CompletionItem(value, vscode.CompletionItemKind.Value);

        if (value === attr.defaultValue) {
          item.detail = '(default)';
          item.sortText = '0' + value; // Sort default first
        }

        // For brackets, add hint about comma-separation
        if (attr.name === 'rn-brackets') {
          item.documentation = new vscode.MarkdownString(
            `Add \`${value}\` bracket. Multiple values can be comma-separated.`
          );
        }

        completions.push(item);
      }
    } else if (attr.valueType === 'number') {
      // For numbers, provide a placeholder hint
      const item = new vscode.CompletionItem(
        attr.placeholder || '0',
        vscode.CompletionItemKind.Value
      );
      item.detail = attr.description;
      completions.push(item);
    }

    return completions;
  }

  /**
   * Extract already-used attribute names from span content
   */
  private getUsedAttributes(content: string): Set<string> {
    const used = new Set<string>();
    // Match attribute=value or attribute="value" patterns
    const matches = content.matchAll(/([\w-]+)=/g);
    for (const match of matches) {
      used.add(match[1]);
    }
    return used;
  }
}
