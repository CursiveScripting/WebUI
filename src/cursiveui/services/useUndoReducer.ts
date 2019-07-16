import { Reducer, ReducerState, useReducer, useCallback } from 'react';

export function useUndoReducer<TState, TAction extends IAction>(
    reducer: Reducer<TState, TAction>,
    initialState: ReducerState<Reducer<TState, TAction>>,
    maxHistorySize?: number,
) {
    const [state, dispatch] = useReducer(undoReducer(reducer, maxHistorySize), {
        present: initialState,
        past: [],
        future: [],
    });

    const undo = useCallback(
        () => dispatch({ type: 'undo' }),
        [dispatch]
    );
    
    const redo = useCallback(
        () => dispatch({ type: 'redo' }),
        [dispatch]
    );
    
    const clearHistory = useCallback(
        () => dispatch({ type: 'clearHistory' }),
        [dispatch]
    );

    return {
        state: state.present,
        dispatch,
        undo: state.past.length === 0 ? undefined : undo,
        redo: state.future.length === 0 ? undefined : redo,
        clearHistory,
    }
}

interface IUndoable<T> {
    present: T;
    past: Array<T>;
    future: Array<T>;
}

interface IAction {
    type: string;
}

type UndoAction = {
    type: 'undo' | 'redo' | 'clearHistory';
}

function undoReducer<TState, TAction extends IAction>(reducer: Reducer<TState, TAction>, maxHistorySize?: number) {
    return function(state: IUndoable<TState>, action: TAction | UndoAction) {
        if (action.type === 'undo') {
            if (state.past.length === 0) {
                return state;
            }

            return {
                present: state.past[state.past.length - 1],
                past: state.past.slice(0, state.past.length - 1),
                future: [state.present, ...state.future],
            };
        }
        else if (action.type === 'redo') {
            if (state.future.length === 0) {
                return state;
            }

            return {
                present: state.future[0],
                past: [...state.past, state.present],
                future: state.future.slice(1),
            };
        }
        else if (action.type === 'clearHistory') {
            return {
                present: state.present,
                past: [],
                future: [],
            };
        }
        else {
            const newPresent = reducer(state.present, action as TAction);

            if (newPresent === state.present) {
                return state; // no change
            }

            const pastToKeep = maxHistorySize !== undefined && state.past.length >= maxHistorySize
                ? state.past.slice(state.past.length - maxHistorySize + 1)
                : state.past;

            return {
                present: newPresent,
                past: [...pastToKeep, state.present],
                future: [],
            }
        }
    }
}