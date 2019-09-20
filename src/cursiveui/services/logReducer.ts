import { Reducer } from 'react';

interface IAction {
    type: string;
}

export function logReducer<TState, TAction extends IAction>(
    reducer: Reducer<TState, TAction>,
    log: (action: TAction) => void
) {
    return function(state: TState, action: TAction): TState {
        const newState = reducer(state, action);

        if (newState !== state) {
            log(action);
        }

        return newState;
    }
}