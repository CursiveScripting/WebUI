export interface IStackFrame {
    processName: string;
    stepId: string;
    variables: Record<string, string | null>;
}

export interface IDebugState {
    isPaused: boolean;
    errorMessage?: string;
    callStack: IStackFrame[];
}