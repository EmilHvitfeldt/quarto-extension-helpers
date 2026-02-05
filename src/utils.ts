import * as vscode from 'vscode';

/**
 * Check if a document has a specific filter in its YAML frontmatter
 */
export function hasFilter(document: vscode.TextDocument, filterName: string): boolean {
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

  // Check if filters section contains the specified filter
  // Matches patterns like:
  //   filters:
  //     - filterName
  // or:
  //   filters: [filterName]
  const pattern = new RegExp(`filters:[\\s\\S]*?(?:- ${filterName}|${filterName})`, 'm');
  return pattern.test(frontmatter);
}
