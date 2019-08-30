export interface ICustomTool {
    prompt: string;
    iconBackground: string;
    unsavedConfirmation?: string;
    action: () => void;
}