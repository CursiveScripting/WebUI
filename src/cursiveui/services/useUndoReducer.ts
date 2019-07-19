import { Reducer, ReducerState, useReducer, useCallback } from 'react';

export function useUndoReducer<TState, TAction extends IAction>(
    reducer: Reducer<TState, TAction>,
    initialState: ReducerState<Reducer<TState, TAction>>,
    maxHistorySize?: number,
) {
    const [state, dispatch] = useReducer(undoReducer(reducer, maxHistorySize), {
        present: {
            state: initialState,
            actionName: '',
        },
        past: [],
        future: [],
    });

    const undoAction = useCallback(
        () => dispatch({ type: 'undo' }),
        [dispatch]
    );
    
    const redoAction = useCallback(
        () => dispatch({ type: 'redo' }),
        [dispatch]
    );
    
    const clearHistory = useCallback(
        () => dispatch({ type: 'clearHistory' }),
        [dispatch]
    );

    const undo = state.past.length === 0
        ? undefined
        : {
            perform: undoAction,
            name: state.present.actionName,
        } as IUndoRedoAction

    const redo = state.future.length === 0
        ? undefined
        : {
            perform: redoAction,
            name: state.future[0].actionName,
        } as IUndoRedoAction

    return {
        state: state.present.state,
        dispatch,
        undo,
        redo,
        clearHistory,
    }
}

export interface IUndoRedoAction {
    name: string;
    perform: () => void;
}

interface IUndoable<T> {
    present: IUndoState<T>;
    past: Array<IUndoState<T>>;
    future: Array<IUndoState<T>>;
}

interface IUndoState<T> {
    state: T;
    actionName: string;
}

interface IAction {
    type: string;
}

type UndoAction = {
    type: 'undo' | 'redo' | 'clearHistory';
}

function undoReducer<TState, TAction extends IAction>(reducer: Reducer<TState, TAction>, maxHistorySize?: number) {
    return function(state: IUndoable<TState>, action: TAction | UndoAction): IUndoable<TState> {
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
            const newPresent = reducer(state.present.state, action as TAction)

            if (newPresent === state.present.state) {
                return state; // no change
            }

            const pastToKeep = maxHistorySize !== undefined && state.past.length >= maxHistorySize
                ? state.past.slice(state.past.length - maxHistorySize + 1)
                : state.past;

            return {
                present: {
                    state: newPresent,
                    actionName: action.type,
                },
                past: [...pastToKeep, state.present],
                future: [],
            }
        }
    }
}