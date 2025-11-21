
// src/ui.ts
import * as vscode from 'vscode';

export async function promptForLogin(): Promise<boolean> {
    const result = await vscode.window.showInformationMessage(
        "To associate logs with your account, sign in with Google — proceed?",
        "Sign in", "Cancel"
    );
    return result === "Sign in";
}

export async function showNetworkError(onRetry?: () => void): Promise<void> {
    const message = "Couldn't verify your login right now (offline). We'll keep your last verified identity but mark it as unverified.";
    const actions = onRetry ? ["Retry", "Continue offline"] : ["Continue offline"];
    const result = await vscode.window.showWarningMessage(message, ...actions);

    if (result === "Retry" && onRetry) {
        onRetry();
    }
}

export async function showTokenError(): Promise<void> {
    await vscode.window.showErrorMessage(
        "Sign-in failed: Google returned an error. Try signing in again or check your network."
    );
}

export async function showCancelledError(): Promise<void> {
    vscode.window.showInformationMessage("Sign-in cancelled. No changes were made.");
}

export async function showLoginSuccess(email: string): Promise<void> {
    vscode.window.showInformationMessage(`Successfully signed in as ${email}.`);
}

export async function showLogoutSuccess(): Promise<void> {
    vscode.window.showInformationMessage("You have been signed out.");
}
