import * as vscode from 'vscode';

// Import providers from each Quarto extension helper
import { RoughNotationCompletionProvider, RoughNotationColorProvider } from './roughnotation';

export function activate(context: vscode.ExtensionContext): void {
  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };

  // Register roughnotation providers
  registerRoughNotationProvider(context, quartoSelector);
  registerRoughNotationColorProvider(context, quartoSelector);
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

/**
 * Register roughnotation color provider for color picker support
 */
function registerRoughNotationColorProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new RoughNotationColorProvider();

  context.subscriptions.push(
    vscode.languages.registerColorProvider(selector, provider)
  );
}

export function deactivate(): void {}
