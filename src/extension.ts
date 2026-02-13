import * as vscode from 'vscode';

// Import providers from each Quarto extension helper
import { RoughNotationCompletionProvider, RoughNotationColorProvider } from './roughnotation';
import { FontAwesomeCompletionProvider } from './fontawesome';
import { CountdownCompletionProvider } from './countdown';
import { DownloadthisCompletionProvider } from './downloadthis';
import { AcronymsCompletionProvider } from './acronyms';
import { NowCompletionProvider } from './now';

/**
 * Provider registration configuration
 */
interface ProviderConfig {
  /** Configuration key for enabling/disabling */
  configKey: string;
  /** Factory function to create the completion provider */
  createProvider: () => vscode.CompletionItemProvider;
  /** Characters that trigger completion */
  triggerCharacters: string[];
  /** Optional: Factory to create additional providers (e.g., color provider) */
  additionalProviders?: Array<{
    register: (
      context: vscode.ExtensionContext,
      selector: vscode.DocumentSelector
    ) => void;
  }>;
}

/**
 * All registered providers
 */
const PROVIDERS: ProviderConfig[] = [
  {
    configKey: 'roughnotation',
    createProvider: () => new RoughNotationCompletionProvider(),
    triggerCharacters: [' ', '=', '-', '.'],
    additionalProviders: [
      {
        register: (context, selector) => {
          context.subscriptions.push(
            vscode.languages.registerColorProvider(selector, new RoughNotationColorProvider())
          );
        },
      },
    ],
  },
  {
    configKey: 'fontawesome',
    createProvider: () => new FontAwesomeCompletionProvider(),
    triggerCharacters: [' ', '<', '='],
  },
  {
    configKey: 'countdown',
    createProvider: () => new CountdownCompletionProvider(),
    triggerCharacters: [' ', '='],
  },
  {
    configKey: 'downloadthis',
    createProvider: () => new DownloadthisCompletionProvider(),
    triggerCharacters: [' ', '='],
  },
  {
    configKey: 'acronyms',
    createProvider: () => new AcronymsCompletionProvider(),
    triggerCharacters: [' '],
  },
  {
    configKey: 'now',
    createProvider: () => new NowCompletionProvider(),
    triggerCharacters: [' '],
  },
];

export function activate(context: vscode.ExtensionContext): void {
  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };
  const config = vscode.workspace.getConfiguration('quartoExtensionHelpers');

  for (const providerConfig of PROVIDERS) {
    if (config.get<boolean>(`${providerConfig.configKey}.enabled`, true)) {
      // Register the main completion provider
      context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
          quartoSelector,
          providerConfig.createProvider(),
          ...providerConfig.triggerCharacters
        )
      );

      // Register any additional providers (e.g., color providers)
      if (providerConfig.additionalProviders) {
        for (const additional of providerConfig.additionalProviders) {
          additional.register(context, quartoSelector);
        }
      }
    }
  }
}

export function deactivate(): void {}
