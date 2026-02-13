import * as vscode from 'vscode';

/**
 * Supported value types for attributes
 */
export type ValueType = 'enum' | 'boolean' | 'color' | 'number' | 'string';

/**
 * Generic attribute definition for completion providers
 */
export interface AttributeDefinition {
  name: string;
  description: string;
  valueType: ValueType;
  values?: string[];
  defaultValue?: string;
  placeholder?: string;
  /** Whether the value should be quoted (e.g., label="text") */
  quoted?: boolean;
  /** Category for grouping in completions (e.g., 'Timer', 'Style') */
  category?: string;
}

/**
 * Context information for cursor position within a shortcode
 */
export interface ShortcodeContext {
  /** The full content between shortcode markers */
  fullContent: string;
  /** Position where the shortcode content starts */
  contentStart: number;
  /** What type of completion to provide */
  completionType: CompletionType;
  /** The text being typed (for filtering) */
  typedText: string;
  /** Position where the current token starts */
  tokenStart: number;
  /** Attribute name if completing a value */
  attributeName?: string;
  /** Whether there's a space before the closing marker */
  hasSpaceBeforeEnd: boolean;
  /** Whether a leading space is needed before the completion */
  needsLeadingSpace: boolean;
}

/**
 * Types of completions that can be provided
 */
export type CompletionType =
  | 'attribute-name'
  | 'attribute-value'
  | 'icon'
  | 'file'
  | 'alias'
  | 'acronym';

/**
 * Brand color with name and hex value
 */
export interface BrandColor {
  name: string;
  value: string;
}

/**
 * Configuration for a shortcode-based completion provider
 */
export interface ShortcodeProviderConfig {
  /** The shortcode name (e.g., 'countdown', 'fa', 'downloadthis') */
  shortcodeName: string;
  /** Attributes supported by this shortcode */
  attributes: AttributeDefinition[];
  /** Whether to check for filter in frontmatter */
  requiresFilter?: boolean;
  /** Filter name to check (if different from shortcodeName) */
  filterName?: string;
}

/**
 * Result of parsing attribute value context
 */
export interface AttributeValueContext {
  attributeName: string;
  typedValue: string;
  tokenStart: number;
}

/**
 * Options for generating completion items
 */
export interface CompletionItemOptions {
  position: vscode.Position;
  replaceRange: vscode.Range;
  needsLeadingSpace: boolean;
  hasSpaceBeforeEnd: boolean;
}
