import * as vscode from 'vscode';
import { BrandColor } from './types';

// Re-export BrandColor for backwards compatibility
export type { BrandColor } from './types';

// Cache for frontmatter filter checks (keyed by document URI + version)
const filterCache = new Map<string, Map<string, boolean>>();

// Maximum cache size to prevent unbounded growth
const MAX_CACHE_ENTRIES = 100;

/**
 * Check if a document has a specific filter in its YAML frontmatter.
 * Results are cached per document version for performance.
 */
export function hasFilter(document: vscode.TextDocument, filterName: string): boolean {
  const cacheKey = `${document.uri.toString()}:${document.version}`;

  // Check cache first
  let docCache = filterCache.get(cacheKey);
  if (docCache?.has(filterName)) {
    return docCache.get(filterName)!;
  }

  const result = checkFilterInDocument(document, filterName);

  // Store in cache (clear old versions for this document)
  for (const key of filterCache.keys()) {
    if (key.startsWith(document.uri.toString() + ':') && key !== cacheKey) {
      filterCache.delete(key);
    }
  }

  // Enforce cache size limit (simple LRU: delete oldest entries)
  if (filterCache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = filterCache.keys().next().value;
    if (firstKey) {
      filterCache.delete(firstKey);
    }
  }

  if (!docCache) {
    docCache = new Map();
    filterCache.set(cacheKey, docCache);
  }
  docCache.set(filterName, result);

  return result;
}

function checkFilterInDocument(document: vscode.TextDocument, filterName: string): boolean {
  const text = document.getText();

  // Check if document starts with YAML frontmatter
  if (!text.startsWith('---')) {
    return false;
  }

  // Find the closing --- of the frontmatter
  const endIndex = text.indexOf('---', 3);
  if (endIndex === -1) {
    return false;
  }

  const frontmatter = text.substring(0, endIndex);

  // Escape special regex characters in filter name
  const escapedName = filterName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Check if filters section contains the specified filter
  // Matches patterns like:
  //   filters:
  //     - filterName
  // or:
  //   filters: [filterName, other]
  // or:
  //   filters: filterName (shorthand for single filter)
  const listPattern = new RegExp(`filters:[\\s\\S]*?-\\s*${escapedName}\\s*(?:\\n|$)`, 'm');
  const arrayPattern = new RegExp(`filters:\\s*\\[[^\\]]*\\b${escapedName}\\b[^\\]]*\\]`, 'm');
  const shorthandPattern = new RegExp(`filters:\\s*${escapedName}\\s*(?:\\n|$)`, 'm');

  return listPattern.test(frontmatter) || arrayPattern.test(frontmatter) || shorthandPattern.test(frontmatter);
}

// Cache for brand colors (keyed by file path)
const brandColorCache = new Map<string, { colors: BrandColor[]; mtime: number }>();

// Maximum brand color cache entries
const MAX_BRAND_CACHE_ENTRIES = 50;

/**
 * Get brand colors from _brand.yml in the document's directory or ancestor directories.
 * Searches from the document's directory up to the workspace root.
 * Returns an array of color names and their hex values.
 */
export async function getBrandColors(document: vscode.TextDocument): Promise<BrandColor[]> {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!workspaceFolder) {
    return [];
  }

  // Find _brand.yml by walking up from the document's directory
  const brandFile = await findBrandFile(document.uri, workspaceFolder.uri);
  if (!brandFile) {
    return [];
  }

  try {
    const stat = await vscode.workspace.fs.stat(brandFile);
    const cacheKey = brandFile.toString();
    const cached = brandColorCache.get(cacheKey);

    // Return cached if file hasn't changed
    if (cached && cached.mtime === stat.mtime) {
      return cached.colors;
    }

    const content = await vscode.workspace.fs.readFile(brandFile);
    const text = Buffer.from(content).toString('utf-8');
    const colors = parseBrandColors(text);

    // Enforce cache size limit
    if (brandColorCache.size >= MAX_BRAND_CACHE_ENTRIES) {
      const firstKey = brandColorCache.keys().next().value;
      if (firstKey) {
        brandColorCache.delete(firstKey);
      }
    }

    brandColorCache.set(cacheKey, { colors, mtime: stat.mtime });
    return colors;
  } catch {
    // File doesn't exist or can't be read
    return [];
  }
}

/**
 * Find _brand.yml by searching from the document's directory up to workspace root
 */
async function findBrandFile(documentUri: vscode.Uri, workspaceUri: vscode.Uri): Promise<vscode.Uri | null> {
  // Start from the document's directory
  let currentDir = vscode.Uri.joinPath(documentUri, '..');
  const workspacePath = workspaceUri.path;

  // Ensure we check path with trailing separator to avoid prefix issues
  // (e.g., /workspace matching /workspace2)
  while (currentDir.path === workspacePath || currentDir.path.startsWith(workspacePath + '/')) {
    const brandFile = vscode.Uri.joinPath(currentDir, '_brand.yml');
    try {
      await vscode.workspace.fs.stat(brandFile);
      return brandFile;
    } catch {
      // File doesn't exist, try parent directory
    }

    // Move to parent directory
    const parentDir = vscode.Uri.joinPath(currentDir, '..');
    if (parentDir.path === currentDir.path) {
      // Reached filesystem root
      break;
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Parse color palette from _brand.yml content
 */
function parseBrandColors(content: string): BrandColor[] {
  const colors: BrandColor[] = [];

  // Find the color: section
  const colorSectionMatch = content.match(/^color:\s*$/m);
  if (!colorSectionMatch) {
    return colors;
  }

  const colorSectionStart = colorSectionMatch.index! + colorSectionMatch[0].length;
  const remainingContent = content.substring(colorSectionStart);

  // Find the palette: subsection
  const paletteSectionMatch = remainingContent.match(/^\s+palette:\s*$/m);
  if (!paletteSectionMatch) {
    return colors;
  }

  const paletteStart = paletteSectionMatch.index! + paletteSectionMatch[0].length;
  const afterPalette = remainingContent.substring(paletteStart);

  // Extract color definitions (indented under palette)
  // Match lines like "    color-name: "#hexcode"" or "    color-name: value"
  const lines = afterPalette.split('\n');

  for (const line of lines) {
    // Stop if we hit a line that's not indented enough (new section)
    if (line.match(/^\S/) || line.match(/^[ ]{2}\S/)) {
      break;
    }

    // Match color definitions (at least 4 spaces indent under palette)
    const colorMatch = line.match(/^\s{4,}([\w-]+):\s*["']?(#[0-9a-fA-F]{3,8}|[\w-]+)["']?\s*$/);
    if (colorMatch) {
      colors.push({
        name: colorMatch[1],
        value: colorMatch[2]
      });
    }
  }

  return colors;
}
