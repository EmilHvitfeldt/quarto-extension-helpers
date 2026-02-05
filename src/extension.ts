import * as vscode from 'vscode';

// Import providers from each Quarto extension helper
import { RoughNotationCompletionProvider } from './roughnotation';

export function activate(context: vscode.ExtensionContext): void {
  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };

  // Register roughnotation completion provider
  registerRoughNotationProvider(context, quartoSelector);
}

/**
 * Register roughnotation autocomplete provider
 */
function registerRoughNotationProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new RoughNotationCompletionProvider();
  const triggerCharacters = [' ', '=', '-', '.'];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}

export function deactivate(): void {}
