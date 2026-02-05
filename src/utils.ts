import * as vscode from 'vscode';

// Cache for frontmatter filter checks (keyed by document URI + version)
const filterCache = new Map<string, Map<string, boolean>>();

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
    if (key.startsWith(document.uri.toString()) && key !== cacheKey) {
      filterCache.delete(key);
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
