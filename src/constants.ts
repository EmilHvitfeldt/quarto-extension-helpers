/**
 * Centralized constants for the extension
 */

/** Shortcode names used in Quarto documents */
export const SHORTCODE = {
  FONTAWESOME: 'fa',
  COUNTDOWN: 'countdown',
  DOWNLOADTHIS: 'downloadthis',
  ACRONYMS: 'acr',
  NOW: 'now',
} as const;

/** Filter names for YAML frontmatter */
export const FILTER = {
  ROUGHNOTATION: 'roughnotation',
} as const;

/** CSS class names for span-based extensions */
export const CSS_CLASS = {
  RN_FRAGMENT: 'rn-fragment',
  RN: 'rn',
} as const;

/** Cache configuration */
export const CACHE = {
  MAX_FILTER_ENTRIES: 100,
  MAX_BRAND_COLOR_ENTRIES: 50,
  MAX_ACRONYM_ENTRIES: 100,
} as const;

/** File names */
export const FILES = {
  BRAND_YML: '_brand.yml',
} as const;

/** VS Code commands */
export const COMMANDS = {
  TRIGGER_SUGGEST: 'editor.action.triggerSuggest',
} as const;

/** Configuration keys */
export const CONFIG = {
  ROOT: 'quartoExtensionHelpers',
  ROUGHNOTATION_ENABLED: 'roughnotation.enabled',
  FONTAWESOME_ENABLED: 'fontawesome.enabled',
  COUNTDOWN_ENABLED: 'countdown.enabled',
  DOWNLOADTHIS_ENABLED: 'downloadthis.enabled',
  ACRONYMS_ENABLED: 'acronyms.enabled',
  NOW_ENABLED: 'now.enabled',
} as const;
