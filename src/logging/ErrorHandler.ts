export class ErrorHandler {

    // TODO: Do actual error logging
    public static logError(message: string, ...optionalParams: any[]) {
        console.error(`Error: ${message}`, ...optionalParams);
    }
}