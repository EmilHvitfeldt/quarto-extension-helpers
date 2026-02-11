import * as vscode from 'vscode';

// Import providers from each Quarto extension helper
import { RoughNotationCompletionProvider, RoughNotationColorProvider } from './roughnotation';
import { FontAwesomeCompletionProvider } from './fontawesome';
import { CountdownCompletionProvider } from './countdown';
import { DownloadthisCompletionProvider } from './downloadthis';
import { AcronymsCompletionProvider } from './acronyms';

export function activate(context: vscode.ExtensionContext): void {
  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };
  const config = vscode.workspace.getConfiguration('quartoExtensionHelpers');

  // Register roughnotation providers
  if (config.get<boolean>('roughnotation.enabled', true)) {
    registerRoughNotationProvider(context, quartoSelector);
    registerRoughNotationColorProvider(context, quartoSelector);
  }

  // Register fontawesome provider
  if (config.get<boolean>('fontawesome.enabled', true)) {
    registerFontAwesomeProvider(context, quartoSelector);
  }

  // Register countdown provider
  if (config.get<boolean>('countdown.enabled', true)) {
    registerCountdownProvider(context, quartoSelector);
  }

  // Register downloadthis provider
  if (config.get<boolean>('downloadthis.enabled', true)) {
    registerDownloadthisProvider(context, quartoSelector);
  }

  // Register acronyms provider
  if (config.get<boolean>('acronyms.enabled', true)) {
    registerAcronymsProvider(context, quartoSelector);
  }
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

/**
 * Register downloadthis autocomplete provider
 */
function registerDownloadthisProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new DownloadthisCompletionProvider();
  // Trigger on space (after "downloadthis"), '=' (for attribute values)
  const triggerCharacters = [' ', '='];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}

/**
 * Register acronyms autocomplete provider
 */
function registerAcronymsProvider(
  context: vscode.ExtensionContext,
  selector: vscode.DocumentSelector
): void {
  const provider = new AcronymsCompletionProvider();
  // Trigger on space (after "acr")
  const triggerCharacters = [' '];

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      provider,
      ...triggerCharacters
    )
  );
}

export function deactivate(): void {}
