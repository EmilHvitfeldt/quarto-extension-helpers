import * as vscode from 'vscode';

// Roughnotation uses span syntax, so it's still hardcoded
import { RoughNotationCompletionProvider, RoughNotationColorProvider } from './roughnotation';

// Spec-based providers
import { loadAllSpecs } from './spec-loader';
import { createSpecProvider } from './spec-provider';

import { logger } from './logger';
import { CONFIG } from './constants';

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
 * Hardcoded providers (for non-shortcode syntax like roughnotation)
 */
const HARDCODED_PROVIDERS: ProviderConfig[] = [
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
];

/**
 * Map shortcode names to config keys
 */
const SHORTCODE_CONFIG_MAP: Record<string, string> = {
  fa: 'fontawesome',
  countdown: 'countdown',
  downloadthis: 'downloadthis',
  acr: 'acronyms',
  now: 'now',
};

/**
 * Build providers from specs
 */
function buildSpecProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];
  const specs = loadAllSpecs();

  for (const spec of specs) {
    const configKey = SHORTCODE_CONFIG_MAP[spec.shortcode] || spec.shortcode;

    providers.push({
      configKey,
      createProvider: () => createSpecProvider(spec),
      triggerCharacters: [' ', '='],
    });
  }

  return providers;
}

export function activate(context: vscode.ExtensionContext): void {
  // Initialize logger
  logger.init(context);
  logger.info('Quarto Extension Helpers activating...');

  const quartoSelector: vscode.DocumentSelector = { language: 'quarto', scheme: 'file' };
  const config = vscode.workspace.getConfiguration(CONFIG.ROOT);

  // Combine hardcoded and spec-based providers
  const specProviders = buildSpecProviders();
  const allProviders = [...HARDCODED_PROVIDERS, ...specProviders];

  let enabledCount = 0;
  for (const providerConfig of allProviders) {
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

      enabledCount++;
      logger.debug(`Registered provider: ${providerConfig.configKey}`);
    }
  }

  logger.info(`Activated with ${enabledCount} providers enabled`);
}

export function deactivate(): void {}
