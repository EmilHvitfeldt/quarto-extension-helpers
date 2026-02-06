import * as vscode from 'vscode';

// Import providers from each Quarto extension helper
import { RoughNotationCompletionProvider, RoughNotationColorProvider } from './roughnotation';
import { FontAwesomeCompletionProvider } from './fontawesome';
import { CountdownCompletionProvider } from './countdown';

export function activate(context: vscode.ExtensionContext): void {
  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };

  // Register roughnotation providers
  registerRoughNotationProvider(context, quartoSelector);
  registerRoughNotationColorProvider(context, quartoSelector);

  // Register fontawesome provider
  registerFontAwesomeProvider(context, quartoSelector);

  // Register countdown provider
  registerCountdownProvider(context, quartoSelector);
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

/**
 * Register fontawesome autocomplete provider
 */
function registerFontAwesomeProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new FontAwesomeCompletionProvider();
  // Trigger on space (after "fa" or icon name), '<' (after {{), and '=' (for attribute values)
  const triggerCharacters = [' ', '<', '='];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}

/**
 * Register countdown autocomplete provider
 */
function registerCountdownProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new CountdownCompletionProvider();
  // Trigger on space (after "countdown"), '=' (for attribute values)
  const triggerCharacters = [' ', '='];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}

export function deactivate(): void {}
