const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Extension "quarto-extension-helpers" is now active!');

  const disposable = vscode.commands.registerCommand('quarto-extension-helpers.helloWorld', function () {
    vscode.window.showInformationMessage('Hello World from Quarto Extension Helpers!');
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
};
