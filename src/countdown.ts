import * as vscode from 'vscode';
import { getBrandColors, BrandColor } from './utils';

type ValueType = 'number' | 'boolean' | 'string' | 'color';

interface CountdownAttribute {
  name: string;
  description: string;
  valueType: ValueType;
  values?: string[];
  defaultValue?: string;
  placeholder?: string;
}

/** Core timer parameters */
const TIMER_ATTRIBUTES: CountdownAttribute[] = [
  {
    name: 'minutes',
    description: 'Duration in minutes',
    valueType: 'number',
    defaultValue: '0',
    placeholder: '5'
  },
  {
    name: 'seconds',
    description: 'Duration in seconds',
    valueType: 'number',
    defaultValue: '0',
    placeholder: '30'
  },
  {
    name: 'play_sound',
    description: 'Play fanfare on completion',
    valueType: 'boolean',
    values: ['true', 'false'],
    defaultValue: 'false'
  },
  {
    name: 'start_immediately',
    description: 'Auto-start timer when slide appears',
    valueType: 'boolean',
    values: ['true', 'false'],
    defaultValue: 'false'
  },
  {
    name: 'warn_when',
    description: 'Seconds remaining to trigger warning state',
    valueType: 'number',
    defaultValue: '0',
    placeholder: '60'
  },
  {
    name: 'update_every',
    description: 'Update frequency in seconds',
    valueType: 'number',
    defaultValue: '1',
    placeholder: '1'
  },
  {
    name: 'blink_colon',
    description: 'Blinking colon effect',
    valueType: 'boolean',
    values: ['true', 'false'],
    defaultValue: 'false'
  }
];

/** Positioning parameters */
const POSITION_ATTRIBUTES: CountdownAttribute[] = [
  {
    name: 'top',
    description: 'Distance from top (e.g., "10px", "1em")',
    valueType: 'string',
    placeholder: '10px'
  },
  {
    name: 'bottom',
    description: 'Distance from bottom',
    valueType: 'string',
    defaultValue: '0',
    placeholder: '0'
  },
  {
    name: 'left',
    description: 'Distance from left',
    valueType: 'string',
    placeholder: '0'
  },
  {
    name: 'right',
    description: 'Distance from right',
    valueType: 'string',
    defaultValue: '0',
    placeholder: '0'
  }
];

/** Styling parameters */
const STYLE_ATTRIBUTES: CountdownAttribute[] = [
  {
    name: 'font_size',
    description: 'Timer text size',
    valueType: 'string',
    defaultValue: '3rem',
    placeholder: '3rem'
  },
  {
    name: 'margin',
    description: 'Spacing around timer',
    valueType: 'string',
    defaultValue: '0.5em',
    placeholder: '0.5em'
  },
  {
    name: 'padding',
    description: 'Internal spacing',
    valueType: 'string',
    defaultValue: '10px 15px',
    placeholder: '10px 15px'
  },
  {
    name: 'border_width',
    description: 'Border thickness',
    valueType: 'string',
    defaultValue: '3px',
    placeholder: '3px'
  },
  {
    name: 'border_radius',
    description: 'Corner rounding',
    valueType: 'string',
    defaultValue: '15px',
    placeholder: '15px'
  },
  {
    name: 'line_height',
    description: 'Text line spacing',
    valueType: 'string',
    defaultValue: '1',
    placeholder: '1'
  },
  {
    name: 'box_shadow',
    description: 'Shadow effect',
    valueType: 'string',
    placeholder: '0 4px 8px rgba(0,0,0,0.2)'
  },
  {
    name: 'id',
    description: 'Unique identifier for custom CSS',
    valueType: 'string',
    placeholder: 'my-timer'
  }
];

/** Color parameters */
const COLOR_ATTRIBUTES: CountdownAttribute[] = [
  {
    name: 'color_border',
    description: 'Border color',
    valueType: 'color'
  },
  {
    name: 'color_text',
    description: 'Text color',
    valueType: 'color'
  },
  {
    name: 'color_background',
    description: 'Background color',
    valueType: 'color'
  },
  {
    name: 'color_running_background',
    description: 'Running state background',
    valueType: 'color'
  },
  {
    name: 'color_running_border',
    description: 'Running state border',
    valueType: 'color'
  },
  {
    name: 'color_running_text',
    description: 'Running state text',
    valueType: 'color'
  },
  {
    name: 'color_finished_background',
    description: 'Completion state background',
    valueType: 'color'
  },
  {
    name: 'color_finished_border',
    description: 'Completion state border',
    valueType: 'color'
  },
  {
    name: 'color_finished_text',
    description: 'Completion state text',
    valueType: 'color'
  },
  {
    name: 'color_warning_background',
    description: 'Warning state background',
    valueType: 'color'
  },
  {
    name: 'color_warning_border',
    description: 'Warning state border',
    valueType: 'color'
  },
  {
    name: 'color_warning_text',
    description: 'Warning state text',
    valueType: 'color'
  }
];

/** All countdown attributes combined */
const COUNTDOWN_ATTRIBUTES: CountdownAttribute[] = [
  ...TIMER_ATTRIBUTES,
  ...POSITION_ATTRIBUTES,
  ...STYLE_ATTRIBUTES,
  ...COLOR_ATTRIBUTES
];

/** Map for O(1) attribute lookup */
const COUNTDOWN_ATTRIBUTES_MAP = new Map<string, CountdownAttribute>(
  COUNTDOWN_ATTRIBUTES.map(attr => [attr.name, attr])
);

/** Common CSS color values for completion */
const CSS_COLOR_VALUES = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
  'black', 'white', 'gray', 'cyan', 'magenta'
];

type CompletionType = 'attribute-name' | 'attribute-value';

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
 * Completion provider for countdown timers in Quarto shortcodes
 *
 * Provides autocomplete for attributes like:
 * - {{< countdown minutes=5 seconds=30 >}}
 * - {{< countdown minutes=5 warn_when=60 color_border=red >}}
 */
export class CountdownCompletionProvider implements vscode.CompletionItemProvider {
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
      case 'attribute-name':
        return this.getAttributeNameCompletions(shortcodeContext, position);
      case 'attribute-value':
        return this.getAttributeValueCompletions(shortcodeContext, position, document);
      default:
        return undefined;
    }
  }

  /**
   * Find the shortcode context if cursor is inside {{< countdown ... >}}
   */
  private getShortcodeContext(lineText: string, cursorPos: number): ShortcodeContext | null {
    const beforeCursor = lineText.substring(0, cursorPos);
    const shortcodeStart = beforeCursor.lastIndexOf('{{< countdown');

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

    // Extract full content between "{{< countdown" and ">}}"
    const countdownEnd = shortcodeStart + '{{< countdown'.length;
    const shortcodeEnd = cursorPos + shortcodeEndRelative;
    const fullContent = lineText.substring(countdownEnd, shortcodeEnd).trim();

    // Find where content starts (skip spaces after "countdown")
    let contentStart = countdownEnd;
    while (contentStart < cursorPos && lineText[contentStart] === ' ') {
      contentStart++;
    }
    if (contentStart > cursorPos) {
      contentStart = cursorPos;
    }

    // Content before cursor
    const contentBeforeCursor = lineText.substring(countdownEnd, cursorPos);

    // Check if there's a space immediately after "countdown"
    const hasSpaceAfterCountdown = lineText[countdownEnd] === ' ';

    return this.analyzeContext(
      contentBeforeCursor,
      fullContent,
      contentStart,
      cursorPos,
      hasSpaceBeforeEnd,
      hasSpaceAfterCountdown
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
    hasSpaceAfterCountdown: boolean
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

    // Otherwise, suggest attributes
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
      needsLeadingSpace: !hasSpaceAfterCountdown && contentBeforeCursor.trim() === ''
    };
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
    for (const attr of COUNTDOWN_ATTRIBUTES) {
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

    // Group attributes by category for sorting
    const categoryOrder: Record<string, string> = {};
    TIMER_ATTRIBUTES.forEach((attr, i) => { categoryOrder[attr.name] = '0' + String(i).padStart(2, '0'); });
    POSITION_ATTRIBUTES.forEach((attr, i) => { categoryOrder[attr.name] = '1' + String(i).padStart(2, '0'); });
    STYLE_ATTRIBUTES.forEach((attr, i) => { categoryOrder[attr.name] = '2' + String(i).padStart(2, '0'); });
    COLOR_ATTRIBUTES.forEach((attr, i) => { categoryOrder[attr.name] = '3' + String(i).padStart(2, '0'); });

    for (const attr of COUNTDOWN_ATTRIBUTES) {
      // Skip if already used
      if (usedAttributes.has(attr.name)) {
        continue;
      }

      // Filter by typed text
      if (typedText && !attr.name.toLowerCase().startsWith(typedText)) {
        continue;
      }

      const item = new vscode.CompletionItem(attr.name, vscode.CompletionItemKind.Property);

      // Determine category for detail
      let category = 'Attribute';
      if (TIMER_ATTRIBUTES.some(a => a.name === attr.name)) {
        category = 'Timer';
      } else if (POSITION_ATTRIBUTES.some(a => a.name === attr.name)) {
        category = 'Position';
      } else if (STYLE_ATTRIBUTES.some(a => a.name === attr.name)) {
        category = 'Style';
      } else if (COLOR_ATTRIBUTES.some(a => a.name === attr.name)) {
        category = 'Color';
      }

      item.detail = category;

      // Build documentation
      let doc = attr.description;
      if (attr.defaultValue !== undefined) {
        doc += `\n\nDefault: \`${attr.defaultValue}\``;
      }
      item.documentation = new vscode.MarkdownString(doc);

      item.range = replaceRange;
      item.sortText = categoryOrder[attr.name] || attr.name;

      const leadingSpace = context.needsLeadingSpace ? ' ' : '';

      if (attr.valueType === 'boolean' || attr.valueType === 'color') {
        // Trigger suggestions for values
        item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}=\$1`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest'
        };
      } else if (attr.values && attr.values.length > 0) {
        item.insertText = new vscode.SnippetString(`${leadingSpace}${attr.name}=\$1`);
        item.command = {
          command: 'editor.action.triggerSuggest',
          title: 'Trigger Suggest'
        };
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
  private async getAttributeValueCompletions(
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const attr = COUNTDOWN_ATTRIBUTES_MAP.get(context.attributeName || '');
    if (!attr) {
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

    // Handle boolean attributes
    if (attr.valueType === 'boolean') {
      for (const value of ['true', 'false']) {
        if (typedText && !value.startsWith(typedText)) {
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

    // Handle color attributes
    if (attr.valueType === 'color') {
      // Add brand colors first (insert hex value since countdown doesn't understand brand names)
      const brandColors = await getBrandColors(document);
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

        const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
        item.insertText = brandColor.value + trailingSpace;  // Insert hex value, not name

        completions.push(item);
      }

      // Add CSS color values
      for (const color of CSS_COLOR_VALUES) {
        if (typedText && !color.toLowerCase().startsWith(typedText)) {
          continue;
        }

        const item = new vscode.CompletionItem(color, vscode.CompletionItemKind.Color);
        item.detail = 'CSS color';
        item.range = replaceRange;
        item.sortText = '1' + color;

        const trailingSpace = context.hasSpaceBeforeEnd ? '' : ' ';
        item.insertText = color + trailingSpace;

        completions.push(item);
      }

      return completions;
    }

    // Handle enum-like values
    if (attr.values && attr.values.length > 0) {
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
    }

    return completions;
  }
}
