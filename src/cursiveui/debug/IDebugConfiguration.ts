import { IDebugState } from './IDebugState';

export interface IDebugConfiguration {
    start: () => Promise<void>; // TODO: how do we specify what process to debug when we start? And the parameters to pass it if they're non-serialisable?
    stop: () => void;

    pause: () => Promise<IDebugState>;
    continue: () => Promise<void>;

    stepOver: () => Promise<IDebugState>;
    stepInto: () => Promise<IDebugState>;

    runUntil: (stepId: string) => Promise<IDebugState>;
}