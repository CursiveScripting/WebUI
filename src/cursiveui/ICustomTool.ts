export interface ICustomTool {
    prompt: string;
    icon: string; // TODO: image path? class?
    unsavedConfirmation?: string;
    action: () => void;
}