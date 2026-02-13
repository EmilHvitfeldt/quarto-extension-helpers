import * as vscode from 'vscode';
import { BrandColor } from './types';

/**
 * Named CSS colors mapped to RGB values
 */
export const CSS_COLORS: Record<string, [number, number, number]> = {
  red: [255, 0, 0],
  blue: [0, 0, 255],
  green: [0, 128, 0],
  yellow: [255, 255, 0],
  orange: [255, 165, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  black: [0, 0, 0],
  white: [255, 255, 255],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
  cyan: [0, 255, 255],
  magenta: [255, 0, 255],
  lime: [0, 255, 0],
  maroon: [128, 0, 0],
  navy: [0, 0, 128],
  olive: [128, 128, 0],
  teal: [0, 128, 128],
  aqua: [0, 255, 255],
  fuchsia: [255, 0, 255],
  silver: [192, 192, 192],
  coral: [255, 127, 80],
  crimson: [220, 20, 60],
  gold: [255, 215, 0],
  indigo: [75, 0, 130],
  khaki: [240, 230, 140],
  lavender: [230, 230, 250],
  salmon: [250, 128, 114],
  tomato: [255, 99, 71],
  turquoise: [64, 224, 208],
  violet: [238, 130, 238],
};

/**
 * Common CSS color names for completion suggestions
 */
export const CSS_COLOR_NAMES = [
  'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
  'black', 'white', 'gray', 'cyan', 'magenta',
];

/**
 * Parse a color string into a VS Code Color object
 */
export function parseColor(value: string, brandColors: BrandColor[] = []): vscode.Color | null {
  const cleanValue = value.replace(/^["']|["']$/g, '');

  // Check brand colors first (case-sensitive)
  for (const brandColor of brandColors) {
    if (brandColor.name === cleanValue) {
      return parseColorValue(brandColor.value);
    }
  }

  return parseColorValue(cleanValue);
}

/**
 * Parse a raw color value (hex, rgb, or named color)
 */
export function parseColorValue(value: string): vscode.Color | null {
  const cleanValue = value.toLowerCase();

  // Check named CSS colors
  if (CSS_COLORS[cleanValue]) {
    const [r, g, b] = CSS_COLORS[cleanValue];
    return new vscode.Color(r / 255, g / 255, b / 255, 1);
  }

  // Parse hex color (#RGB, #RRGGBB, #RRGGBBAA)
  const hexMatch = cleanValue.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255;
      const g = parseInt(hex[1] + hex[1], 16) / 255;
      const b = parseInt(hex[2] + hex[2], 16) / 255;
      return new vscode.Color(r, g, b, 1);
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      return new vscode.Color(r, g, b, 1);
    } else if (hex.length === 8) {
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      const a = parseInt(hex.substring(6, 8), 16) / 255;
      return new vscode.Color(r, g, b, a);
    }
  }

  // Parse rgb/rgba
  const rgbMatch = cleanValue.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
    return new vscode.Color(r, g, b, a);
  }

  return null;
}

/**
 * Convert a VS Code Color to hex string
 */
export function colorToHex(color: vscode.Color): string {
  const r = Math.round(color.red * 255).toString(16).padStart(2, '0');
  const g = Math.round(color.green * 255).toString(16).padStart(2, '0');
  const b = Math.round(color.blue * 255).toString(16).padStart(2, '0');

  if (color.alpha < 1) {
    const a = Math.round(color.alpha * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`;
  }

  return `#${r}${g}${b}`;
}

/**
 * Convert a VS Code Color to rgb/rgba string
 */
export function colorToRgb(color: vscode.Color): string {
  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);

  if (color.alpha < 1) {
    return `rgba(${r},${g},${b},${color.alpha.toFixed(2)})`;
  }

  return `rgb(${r},${g},${b})`;
}

/**
 * Find a named CSS color that matches the given color
 */
export function findNamedColor(color: vscode.Color): string | null {
  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);

  for (const [name, [nr, ng, nb]] of Object.entries(CSS_COLORS)) {
    if (nr === r && ng === g && nb === b) {
      return name;
    }
  }

  return null;
}

/**
 * Find a brand color that matches the given color
 */
export function findBrandColorName(color: vscode.Color, brandColors: BrandColor[]): string | null {
  const r = Math.round(color.red * 255);
  const g = Math.round(color.green * 255);
  const b = Math.round(color.blue * 255);

  for (const brandColor of brandColors) {
    const parsedColor = parseColorValue(brandColor.value);
    if (parsedColor) {
      const br = Math.round(parsedColor.red * 255);
      const bg = Math.round(parsedColor.green * 255);
      const bb = Math.round(parsedColor.blue * 255);

      if (br === r && bg === g && bb === b) {
        return brandColor.name;
      }
    }
  }

  return null;
}
