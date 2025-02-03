// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';

interface RAGResponse {
    retrieved: Array<{
        filepath: string;
        content: string;
    }>;
}

interface AICompletionResponse {
    choices: Array<{
        text: string;
    }>;
}

let attachedFiles: string[] = [];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "aupair" is now active!');

    let disposable = vscode.commands.registerCommand('rag.attachFile', (uri: vscode.Uri) => {
        if (uri && uri.fsPath) {
            attachedFiles.push(uri.fsPath);
            vscode.window.showInformationMessage(`Attached: ${uri.fsPath}`);
        }
    });

    let queryCommand = vscode.commands.registerCommand('rag.queryAI', async () => {
        try {
            if (attachedFiles.length === 0) {
                vscode.window.showWarningMessage("No files attached.");
                // return;
            }

            // Prompt user for the question
            const user_question = await vscode.window.showInputBox({
                prompt: "Enter your question about the attached file(s):"
            });

            if (!user_question) return;

            let injectedCode = "";
            // 1. Add manually selected files, if applicable
            for (const file of attachedFiles) {
                const content = fs.readFileSync(file, "utf-8");
                injectedCode += `\n\n# File: ${file}\n${content.substring(0, 5000)}`; // Limit size
            }

            // 2. Call the local RAG system for additional context (adjust endpoint as needed)
            const retrievedFiles = await fetch("http://localhost:1234/rag/retrieve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: "Retrieve context for: " + user_question })
            });

            const ragResponse: RAGResponse = await retrievedFiles.json();
            ragResponse.retrieved.forEach((doc: any) => {
                injectedCode += `\n\n# Retrieved: ${doc.filepath}\n${doc.content.substring(0, 5000)}`;
            });

            vscode.window.showInformationMessage("Sending files to AI...");

            // Send the combined context to the AI (adjust endpoint as needed)
            const response = await fetch("http://localhost:1234/v1/completions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "codellama:instruct",
                    prompt: `Context from attached and retrieved files:\n${injectedCode}\n\nUser question: `,
                    max_tokens: 500
                })
            });

            const answer: AICompletionResponse = await response.json();
            vscode.window.showInformationMessage(answer.choices[0].text);
        } catch (error) {
            vscode.window.showErrorMessage(`Request failed: ${error instanceof Error ? error.message : String(error)}`)
        }
    });

    context.subscriptions.push(disposable, queryCommand);
}

// This method is called when your extension is deactivated
export function deactivate() { }
