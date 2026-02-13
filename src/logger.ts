import * as vscode from 'vscode';

/**
 * Logger for the extension using VS Code's output channel
 */
class Logger {
  private outputChannel: vscode.OutputChannel | null = null;
  private enabled = false;

  /**
   * Initialize the logger with an output channel
   */
  init(context: vscode.ExtensionContext): void {
    this.outputChannel = vscode.window.createOutputChannel('Quarto Extension Helpers');
    context.subscriptions.push(this.outputChannel);

    // Check if debug logging is enabled via configuration
    const config = vscode.workspace.getConfiguration('quartoExtensionHelpers');
    this.enabled = config.get<boolean>('debug.enabled', false);

    if (this.enabled) {
      this.info('Logger initialized');
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    this.log('INFO', message, ...args);
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    this.log('WARN', message, ...args);
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    this.log('ERROR', message, ...args);
  }

  /**
   * Log a debug message (only when debug is enabled)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      this.log('DEBUG', message, ...args);
    }
  }

  /**
   * Internal logging method
   */
  private log(level: string, message: string, ...args: unknown[]): void {
    if (!this.outputChannel) {
      return;
    }

    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;

    if (args.length > 0) {
      formattedMessage += ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
    }

    this.outputChannel.appendLine(formattedMessage);
  }

  /**
   * Show the output channel
   */
  show(): void {
    this.outputChannel?.show();
  }
}

/** Singleton logger instance */
export const logger = new Logger();
