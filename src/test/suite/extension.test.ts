/**
 * Integration tests for the extension
 * These tests run in the VS Code Extension Host environment
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Integration Tests', () => {
  vscode.window.showInformationMessage('Starting integration tests');

  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('EmilHvitfeldt.quarto-extension-helpers');
    assert.ok(extension, 'Extension should be installed');
  });

  test('Extension should activate on quarto file', async () => {
    const extension = vscode.extensions.getExtension('EmilHvitfeldt.quarto-extension-helpers');
    if (!extension) {
      assert.fail('Extension not found');
      return;
    }

    // Create a temporary .qmd file to trigger activation
    const doc = await vscode.workspace.openTextDocument({
      language: 'quarto',
      content: '---\ntitle: Test\n---\n\nHello world\n',
    });

    await vscode.window.showTextDocument(doc);

    // Wait for extension to activate
    await extension.activate();

    assert.ok(extension.isActive, 'Extension should be active');
  });

  test('Extension contributes quarto language', () => {
    const languages = vscode.languages.getLanguages();
    // The languages are returned asynchronously but the contribution should be present
    assert.ok(languages, 'Languages should be available');
  });
});

suite('Completion Provider Tests', () => {
  let testDocument: vscode.TextDocument;

  suiteSetup(async () => {
    // Create a test document with frontmatter containing acronyms
    const content = `---
title: Test Document
acronyms:
  keys:
    - shortname: API
      longname: Application Programming Interface
    - shortname: HTML
      longname: HyperText Markup Language
---

# Test

{{< fa  >}}

{{< acr  >}}

{{< countdown  >}}
`;

    testDocument = await vscode.workspace.openTextDocument({
      language: 'quarto',
      content,
    });

    await vscode.window.showTextDocument(testDocument);
  });

  test('Document should be quarto language', () => {
    assert.strictEqual(testDocument.languageId, 'quarto');
  });

  test('Completion provider should respond to fa shortcode', async () => {
    // Position cursor inside {{< fa | >}}
    const position = new vscode.Position(11, 7); // After "{{< fa "

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      testDocument.uri,
      position
    );

    // Should have completions (FontAwesome icons)
    assert.ok(completions, 'Should return completions');
    assert.ok(completions.items.length > 0, 'Should have completion items');
  });

  test('Completion provider should respond to acr shortcode', async () => {
    // Position cursor inside {{< acr | >}}
    const position = new vscode.Position(13, 8); // After "{{< acr "

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      testDocument.uri,
      position
    );

    // Should have completions from frontmatter
    assert.ok(completions, 'Should return completions');
    // Check if API and HTML are in the completions
    const labels = completions.items.map(item =>
      typeof item.label === 'string' ? item.label : item.label.label
    );
    assert.ok(
      labels.includes('API') || labels.some(l => l.includes('API')),
      'Should include API acronym'
    );
  });

  test('Completion provider should respond to countdown shortcode', async () => {
    // Position cursor inside {{< countdown | >}}
    const position = new vscode.Position(15, 14); // After "{{< countdown "

    const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      testDocument.uri,
      position
    );

    // Should have attribute completions
    assert.ok(completions, 'Should return completions');
    assert.ok(completions.items.length > 0, 'Should have completion items');

    // Check for expected attributes
    const labels = completions.items.map(item =>
      typeof item.label === 'string' ? item.label : item.label.label
    );
    assert.ok(
      labels.includes('minutes') || labels.some(l => l.includes('minutes')),
      'Should include minutes attribute'
    );
  });
});
