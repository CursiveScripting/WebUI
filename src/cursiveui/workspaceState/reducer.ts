import { Reducer} from 'react';
import { WorkspaceAction } from './actions';
import { IWorkspaceState } from './IWorkspaceState';
import { IUserProcess } from './IUserProcess';
import { determineStepId, usesOutputs, isStopStep, isStartStep, isProcessStep } from '../services/StepFunctions';
import { IVariable } from './IVariable';
import { IProcessStep } from './IProcessStep';
import { StepType } from './IStep';
import { IStopStep } from './IStopStep';
import { isUserProcess, hasEditableSignature } from '../services/ProcessFunctions';
import { mapRecordKeys } from '../services/DataFunctions';

export const workspaceReducer: Reducer<IWorkspaceState, WorkspaceAction> = (state, action) => {
    let processes = state.processes.slice();

    switch (action.type) {
        case 'load': {
            return {
                types: action.types,
                processes: action.processes,
            };
        }

        case 'add process': {
            const index = processes.findIndex(p => p.name === action.name);

            if (index !== -1) {
                return state;
            }

            const newProcess: IUserProcess = {
                name: action.name,
                description: action.description,
                folder: action.folder,
                inputs: action.inputs,
                outputs: action.outputs,
                returnPaths: action.returnPaths,
                steps: [],
                variables: [],
                isSystem: false,
                fixedSignature: false,
            };

            processes.push(newProcess);

            return {
                ...state,
                processes,
            };
        }

        case 'edit process': {
            const index = processes.findIndex(p => p.name === action.oldName);

            if (index === -1) {
                return state;
            }

            const oldProcess = processes[index];

            if (!hasEditableSignature(oldProcess)) {
                return state;
            }

            // Everything that references oldProcess should change to newProcess instead
            processes = processes.map(process => {
                if (!isUserProcess(process)) {
                    return process;
                }

                let changed = false;
                
                const copyProcess = {
                    ...process,
                    steps: process.steps.map(step => {
                        if (!isProcessStep(step) || step.processName !== action.oldName) {
                            return step;
                        }

                        changed = true;
                        
                        // Strip out any return paths that are no longer valid
                        const returnPaths: Record<string, string> = {};
                        for (const path in step.returnPaths) {
                            if (action.returnPaths.indexOf(path) !== -1) {
                                returnPaths[path] = step.returnPaths[path];
                            }
                        }

                        return {
                            ...step,
                            processName: action.newName,
                            inputs: mapRecordKeys(step.inputs, action.mapInputs),
                            outputs: mapRecordKeys(step.outputs, action.mapOutputs),
                            returnPaths,
                        }
                    }),
                };

                return changed
                    ? copyProcess
                    : process;
            });

            // Also update the i/o of process's own start and stop steps
            const steps = oldProcess.steps.map(s => {
                if (isStartStep(s)) {
                    return {
                        ...s,
                        outputs: mapRecordKeys(s.outputs, action.mapInputs),
                    }
                }
                
                if (isStopStep(s)) {
                    // Stop steps with invalid return paths will be left, and will fail to validate
                    return {
                        ...s,
                        outputs: mapRecordKeys(s.inputs, action.mapOutputs),
                    }
                }
                
                return s;
            })

            const newProcess: IUserProcess = {
                ...oldProcess,
                name: action.newName,
                description: action.description,
                folder: action.folder,
                inputs: action.inputs,
                outputs: action.outputs,
                returnPaths: action.returnPaths,
                steps,
            };

            processes[index] = newProcess;

            return {
                ...state,
                processes,
            };
        }

        case 'remove process': {
            const index = processes.findIndex(p => p.name === action.name);

            if (index === -1) {
                return state;
            }

            const process = processes.splice(index, 1)[0];

            if (!hasEditableSignature(process)) {
                 return state;
            }

            return {
                ...state,
                processes,
            };
        }

        case 'add step': {
            const inProcessIndex = processes.findIndex(p => p.name === action.inProcessName);

            if (inProcessIndex === -1) {
                return state;
            }

            const inProcess = { ...processes[inProcessIndex] };
            
            if (!isUserProcess(inProcess)) {
                return state;
            }

            const stepProcess = processes.find(p => p.name === action.stepProcessName);
            if (stepProcess === undefined) {
                return state; // invalid process
            }

            inProcess.steps = [...inProcess.steps, {
                uniqueId: determineStepId(inProcess.steps),
                processName: action.stepProcessName,
                inputs: {},
                outputs: {},
                returnPaths: {},
                stepType: stepProcess.isSystem
                    ? StepType.SystemProcess
                    : StepType.UserProcess,
                x: action.x,
                y: action.y,
            } as IProcessStep];

            processes[inProcessIndex] = inProcess;
            
            return {
                ...state,
                processes,
            };
        }

        case 'add stop step': {
            const inProcessIndex = processes.findIndex(p => p.name === action.inProcessName);

            if (inProcessIndex === -1) {
                return state;
            }

            const inProcess = { ...processes[inProcessIndex] };
            
            if (!isUserProcess(inProcess)) {
                return state;
            }

            if (action.returnPath === null && inProcess.returnPaths.length > 0) {
                return state; // need to specify a path name
            }
            else if (action.returnPath !== null && inProcess.returnPaths.indexOf(action.returnPath) === -1) {
                return state; // invalid path name, or shouldn't have specified a path name
            }

            inProcess.steps = [...inProcess.steps, {
                uniqueId: determineStepId(inProcess.steps),
                returnPath: action.returnPath,
                inputs: {},
                stepType: StepType.Stop,
                x: action.x,
                y: action.y,
            } as IStopStep];

            processes[inProcessIndex] = inProcess;
            
            return {
                ...state,
                processes,
            };
        }

        case 'remove step': {
            const processIndex = processes.findIndex(p => p.name === action.processName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }
            
            process.steps = process.steps.slice();

            const stepIndex = process.steps.findIndex(step => step.uniqueId === action.stepId);

            if (stepIndex === -1) {
                return state;
            }

            process.steps.splice(stepIndex, 1);

            processes[processIndex] = process;

            return {
                ...state,
                processes,
            };
        }

        case 'add variable': {
            if (!state.types.hasOwnProperty(action.typeName)) {
                return state; // invalid type
            }

            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            process.variables = [...process.variables, {
                name: action.varName,
                typeName: action.typeName,
                fromLinks: [],
                toLinks: [],
                initialValue: null,
                x: action.x,
                y: action.y,
            } as IVariable];
            
            processes[processIndex] = process;

            return {
                ...state,
                processes,
            };
        }

        case 'remove variable': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            const varIndex = process.variables.findIndex(v => v.name === action.varName);

            if (varIndex === -1) {
                return state;
            }

            process.variables = process.variables.slice();
            process.variables.splice(varIndex, 1);

            return {
                ...state,
                processes,
            };
        }

        case 'move step': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }
            
            process.steps = process.steps.slice();

            const stepIndex = process.steps.findIndex(step => step.uniqueId === action.stepId);

            if (stepIndex === -1) {
                return state;
            }

            process.steps[processIndex] = { ...process.steps[stepIndex], x: action.x, y: action.y };

            return {
                ...state,
                processes,
            };
        }

        case 'move variable': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            const varIndex = process.variables.findIndex(v => v.name === action.varName);

            if (varIndex === -1) {
                return state;
            }

            process.variables = process.variables.slice();
            process.variables[varIndex] = { ...process.variables[varIndex], x: action.x, y: action.y };

            return {
                ...state,
                processes,
            };
        }

        case 'set return path': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            process.steps = process.steps.slice();

            const fromStepIndex = process.steps.findIndex(step => step.uniqueId === action.fromStepId);

            if (fromStepIndex === -1
                || (action.toStepId !== undefined && process.steps.findIndex(step => step.uniqueId === action.toStepId) === -1)) {
                return state;
            }

            const fromStep = { ...process.steps[fromStepIndex] };

            if (!usesOutputs(fromStep)) {
                return state;
            }

            process.steps[fromStepIndex] = fromStep;

            fromStep.returnPaths = { ...fromStep.returnPaths };

            const pathNameProperty = action.pathName === null
                ? ''
                : action.pathName;

            if (action.toStepId === undefined) {
                delete fromStep.returnPaths[pathNameProperty];
            }
            else {
                fromStep.returnPaths[pathNameProperty] = action.toStepId;
            }

            return {
                ...state,
                processes,
            };
        }

        case 'link variable': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            process.steps = process.steps.map(step => {
                if (step.uniqueId !== action.stepId || !isProcessStep(step)) {
                    return step;
                }

                let inputs, outputs, modifyingParameters;

                if (action.stepInputParam) {
                    modifyingParameters = inputs = { ...step.inputs };
                    outputs = step.outputs;
                }
                else {
                    inputs = step.inputs;
                    modifyingParameters = outputs = { ...step.outputs };
                }

                if (action.varName === undefined) {
                    delete modifyingParameters[action.stepParamName];
                }
                else {
                    modifyingParameters[action.stepParamName] = action.varName;
                }

                return {
                    ...step,
                    inputs,
                    outputs,
                }
            });
            
            return {
                ...state,
                processes,
            }
        }

        case 'set variable': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }
            
            const varIndex = process.variables.findIndex(v => v.name === action.varName);

            if (varIndex === -1) {
                return state;
            }

            process.variables[varIndex] = {
                ...process.variables[varIndex],
                initialValue: action.initialValue,
            };

            return {
                ...state,
                processes,
            }
        }
    }
}