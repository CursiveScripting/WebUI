import { IProcess } from '../state/IProcess';
import { isStopStep, isStartStep, isProcessStep } from './StepFunctions';
import { IUserProcess } from '../state/IUserProcess';
import { isUserProcess } from './ProcessFunctions';
import { IStepParameter } from '../state/IStepParameter';
import { IReturnPath } from '../state/IReturnPath';
import { IUserProcessData } from './serializedDataModels';

export function saveProcesses(processes: IProcess[]) {
    const processData: IUserProcessData[] = [];

    for (const process of processes) {
        if (isUserProcess(process)) {
            processData.push(saveProcess(process));
        }
    }
    
    return JSON.stringify(processData);
}

function saveProcess(process: IUserProcess): IUserProcessData {
    return {
        name: process.name,

        description: process.description === ''
            ? undefined
            : process.description,

        folder: process.folder === null
            ? undefined
            : process.folder,

        inputs: process.inputs.length === 0
            ? undefined
            : process.inputs.map(i => {
                return {
                    name: i.name,
                    type: i.type.name,
                };
            }),

        outputs: process.outputs.length === 0
            ? undefined
            : process.outputs.map(o => {
                return {
                    name: o.name,
                    type: o.type.name,
                };
            }),

        returnPaths: process.returnPaths.length === 0
            ? undefined
            : process.returnPaths.slice(),

        variables: process.variables.length === 0
            ? undefined
            : process.variables.map(v => {
                return {
                    name: v.name,
                    type: v.type.name,
                    x: v.x,
                    y: v.y,
                    initialValue: v.initialValue === null
                        ? undefined
                        : v.initialValue,
                };
            }),

        steps: process.steps.length === 0
            ? undefined
            : process.steps.map(step => {
                if (isStartStep(step)) {
                    return {
                        type: 'start',
                        id: step.uniqueId,
                        x: step.x,
                        y: step.y,
                        outputs: saveStepParameters(step.outputs),
                        returnPath: saveSingleReturnPath(step.returnPaths),
                    }
                }
                else if (isStopStep(step)) {
                    return {
                        type: 'stop',
                        id: step.uniqueId,
                        x: step.x,
                        y: step.y,
                        name: step.returnPath === null
                            ? undefined
                            : step.returnPath,
                        inputs: saveStepParameters(step.inputs),
                    }
                }
                else if (isProcessStep(step)) {
                    return {
                        type: 'process',
                        id: step.uniqueId,
                        x: step.x,
                        y: step.y,
                        process: step.process.name,
                        inputs: saveStepParameters(step.inputs),
                        outputs: saveStepParameters(step.outputs),
                        returnPath: saveSingleReturnPath(step.returnPaths),
                        returnPaths: saveMultipleReturnPaths(step.returnPaths),
                    }
                }

                throw new Error(`Unexpected step type, cannot save: ${step}`);
            }),
    };
}

function saveSingleReturnPath(returnPaths: IReturnPath[]) {
    if (returnPaths.length !== 1) {
        return undefined;
    }

    const onlyPath = returnPaths[0];

    if (onlyPath.connection === undefined || onlyPath.name !== null) {
        return undefined;
    }

    return onlyPath.connection.uniqueId;
}

function saveMultipleReturnPaths(returnPaths: IReturnPath[]) {
    if (returnPaths.length === 1 && returnPaths[0].name === null) {
        return undefined;
    }

    const output: Record<string, string> = {};

    for (const path of returnPaths) {
        if (path.connection !== undefined && path.name !== null) {
            output[path.name] = path.connection.uniqueId
        }
    }

    return output;
}

function saveStepParameters(parameters: IStepParameter[]) {
    if (parameters.length === 0) {
        return undefined;
    }

    const output: Record<string, string> = {};

    for (const param of parameters) {
        if (param.connection !== undefined) {
            output[param.name] = param.connection.name;
        }
    }

    return output;
}