import * as vscode from 'vscode';
import { ShortcodeContext, AttributeDefinition } from './types';
import {
  getShortcodeContext,
  analyzeAttributeOnlyContext,
  createAttributeNameCompletions,
  createAttributeValueCompletions,
  buildCategoryOrder,
} from './shortcode-provider';
import { getBrandColors } from './utils';

/** Shortcode name constant */
const SHORTCODE_NAME = 'countdown';

/** Core timer parameters */
const TIMER_ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'minutes',
    description: 'Duration in minutes',
    valueType: 'number',
    defaultValue: '0',
    placeholder: '5',
    category: 'Timer',
  },
  {
    name: 'seconds',
    description: 'Duration in seconds',
    valueType: 'number',
    defaultValue: '0',
    placeholder: '30',
    category: 'Timer',
  },
  {
    name: 'play_sound',
    description: 'Play fanfare on completion',
    valueType: 'boolean',
    defaultValue: 'false',
    category: 'Timer',
  },
  {
    name: 'start_immediately',
    description: 'Auto-start timer when slide appears',
    valueType: 'boolean',
    defaultValue: 'false',
    category: 'Timer',
  },
  {
    name: 'warn_when',
    description: 'Seconds remaining to trigger warning state',
    valueType: 'number',
    defaultValue: '0',
    placeholder: '60',
    category: 'Timer',
  },
  {
    name: 'update_every',
    description: 'Update frequency in seconds',
    valueType: 'number',
    defaultValue: '1',
    placeholder: '1',
    category: 'Timer',
  },
  {
    name: 'blink_colon',
    description: 'Blinking colon effect',
    valueType: 'boolean',
    defaultValue: 'false',
    category: 'Timer',
  },
];

/** Positioning parameters */
const POSITION_ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'top',
    description: 'Distance from top (e.g., "10px", "1em")',
    valueType: 'string',
    placeholder: '10px',
    category: 'Position',
  },
  {
    name: 'bottom',
    description: 'Distance from bottom',
    valueType: 'string',
    defaultValue: '0',
    placeholder: '0',
    category: 'Position',
  },
  {
    name: 'left',
    description: 'Distance from left',
    valueType: 'string',
    placeholder: '0',
    category: 'Position',
  },
  {
    name: 'right',
    description: 'Distance from right',
    valueType: 'string',
    defaultValue: '0',
    placeholder: '0',
    category: 'Position',
  },
];

/** Styling parameters */
const STYLE_ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'font_size',
    description: 'Timer text size',
    valueType: 'string',
    defaultValue: '3rem',
    placeholder: '3rem',
    category: 'Style',
  },
  {
    name: 'margin',
    description: 'Spacing around timer',
    valueType: 'string',
    defaultValue: '0.5em',
    placeholder: '0.5em',
    category: 'Style',
  },
  {
    name: 'padding',
    description: 'Internal spacing',
    valueType: 'string',
    defaultValue: '10px 15px',
    placeholder: '10px 15px',
    category: 'Style',
  },
  {
    name: 'border_width',
    description: 'Border thickness',
    valueType: 'string',
    defaultValue: '3px',
    placeholder: '3px',
    category: 'Style',
  },
  {
    name: 'border_radius',
    description: 'Corner rounding',
    valueType: 'string',
    defaultValue: '15px',
    placeholder: '15px',
    category: 'Style',
  },
  {
    name: 'line_height',
    description: 'Text line spacing',
    valueType: 'string',
    defaultValue: '1',
    placeholder: '1',
    category: 'Style',
  },
  {
    name: 'box_shadow',
    description: 'Shadow effect',
    valueType: 'string',
    placeholder: '0 4px 8px rgba(0,0,0,0.2)',
    category: 'Style',
  },
  {
    name: 'id',
    description: 'Unique identifier for custom CSS',
    valueType: 'string',
    placeholder: 'my-timer',
    category: 'Style',
  },
];

/** Color parameters */
const COLOR_ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'color_border',
    description: 'Border color',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_text',
    description: 'Text color',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_background',
    description: 'Background color',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_running_background',
    description: 'Running state background',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_running_border',
    description: 'Running state border',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_running_text',
    description: 'Running state text',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_finished_background',
    description: 'Completion state background',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_finished_border',
    description: 'Completion state border',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_finished_text',
    description: 'Completion state text',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_warning_background',
    description: 'Warning state background',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_warning_border',
    description: 'Warning state border',
    valueType: 'color',
    category: 'Color',
  },
  {
    name: 'color_warning_text',
    description: 'Warning state text',
    valueType: 'color',
    category: 'Color',
  },
];

/** All countdown attributes combined */
const ALL_ATTRIBUTES: AttributeDefinition[] = [
  ...TIMER_ATTRIBUTES,
  ...POSITION_ATTRIBUTES,
  ...STYLE_ATTRIBUTES,
  ...COLOR_ATTRIBUTES,
];

/** Map for O(1) attribute lookup */
const ATTRIBUTES_MAP = new Map<string, AttributeDefinition>(
  ALL_ATTRIBUTES.map(attr => [attr.name, attr])
);

/** Category order for sorting completions */
const CATEGORY_ORDER = buildCategoryOrder([
  { name: 'Timer', attributes: TIMER_ATTRIBUTES },
  { name: 'Position', attributes: POSITION_ATTRIBUTES },
  { name: 'Style', attributes: STYLE_ATTRIBUTES },
  { name: 'Color', attributes: COLOR_ATTRIBUTES },
]);

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

    const baseContext = getShortcodeContext(lineText, position.character, SHORTCODE_NAME);
    if (!baseContext) {
      return undefined;
    }

    // Get content before cursor for analysis
    const marker = `{{< ${SHORTCODE_NAME}`;
    const markerEnd = lineText.lastIndexOf(marker) + marker.length;
    const contentBeforeCursor = lineText.substring(markerEnd, position.character);
    const hasSpaceAfterName = lineText[markerEnd] === ' ';

    const context = analyzeAttributeOnlyContext(
      baseContext,
      contentBeforeCursor,
      position.character,
      hasSpaceAfterName
    );

    switch (context.completionType) {
      case 'attribute-name':
        return createAttributeNameCompletions(ALL_ATTRIBUTES, context, position, CATEGORY_ORDER);
      case 'attribute-value':
        return this.getAttributeValueCompletions(context, position, document);
      default:
        return undefined;
    }
  }

  /**
   * Get attribute value completions
   */
  private async getAttributeValueCompletions(
    context: ShortcodeContext,
    position: vscode.Position,
    document: vscode.TextDocument
  ): Promise<vscode.CompletionItem[]> {
    const attr = ATTRIBUTES_MAP.get(context.attributeName || '');
    if (!attr) {
      return [];
    }

    // For color attributes, fetch brand colors
    const brandColors = attr.valueType === 'color'
      ? await getBrandColors(document)
      : [];

    return createAttributeValueCompletions(attr, context, position, brandColors);
  }
}
