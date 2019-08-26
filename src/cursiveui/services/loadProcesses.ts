import processSchema from 'cursive-schema/processes.json';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { createMap, validateSchema } from './DataFunctions';
import { usesOutputs, usesInputs } from './StepFunctions';
import { IUserProcess } from '../state/IUserProcess';
import { IVariable } from '../state/IVariable';
import { IStep, StepType, IStepWithOutputs } from '../state/IStep';
import { IProcess } from '../state/IProcess';
import { IParameter } from '../state/IParameter';
import { IProcessStep } from '../state/IProcessStep';
import { DataType } from '../state/IType';
import { isUserProcess } from './ProcessFunctions';
import { IProcessData, IParameterData } from './serializedDataModels';

export interface IUserProcessData extends IProcessData {
    variables?: IVariableData[];
    steps?: Array<IStartStepData | IStopStepData | IProcessStepData>;
}

interface IPositionData {
    x: number;
    y: number;
}

interface IVariableData extends IParameterData, IPositionData {
    initialValue?: string;
}

interface IStepData extends IPositionData {
    id: string;
}

interface IStartStepData extends IStepData {
    type: 'start';
    outputs: Record<string, string>;
    returnPath?: string;
}

interface IStopStepData extends IStepData {
    type: 'stop';
    name?: string;
    inputs: Record<string, string>;
}

interface IProcessStepData extends IStepData {
    type: 'process';
    process: string;
    inputs: Record<string, string>;
    outputs: Record<string, string>;
    returnPath?: string;
    returnPaths?: Record<string, string>;
}

export function loadProcesses(workspace: IWorkspaceState, processData: IUserProcessData[], checkSchema: boolean) {
    if (checkSchema) {
        const validationErrors = validateSchema(processSchema, processData);

        if (validationErrors !== null) {
            throw new Error(`Processes are not valid: ${validationErrors}`);
        }
    }
    
    const processesByName = createMap(workspace.processes, p => p.name);
    const typesByName = createMap(workspace.types, t => t.name);

    for (const dataItem of processData) {
        const process = loadProcessDefinition(typesByName, dataItem);
        
        const existing = processesByName.get(process.name);
        if (existing !== undefined) {
            if (isUserProcess(existing)) {
                if (existing.fixedSignature) {
                    existing.variables = process.variables;
                    existing.folder = process.folder;
                    existing.description = process.description;
                }
                else {
                    throw new Error(`There are two user processes with the same name: ${process.name}. Process names must be unique.`);
                }
            }
            else {
                throw new Error(`A user process has the same name as a system processes: ${process.name}. Process names must be unique.`);
            }
            continue;
        }

        if (!processesByName.has(process.name)) {
            processesByName.set(process.name, process);
            workspace.processes.push(process);
        }
    }

    for (const dataItem of processData) {
        loadProcessSteps(dataItem, processesByName);
    }
}

function loadProcessDefinition(typesByName: Map<string, DataType>, processData: IUserProcessData): IUserProcess {
    return {
        name: processData.name,
        description: processData.description === undefined
            ? ''
            : processData.description,
        folder: processData.folder === undefined
            ? null
            : processData.folder,
        fixedSignature: false,
        isSystem: false,
        inputs: loadProcessParameters(typesByName, processData.inputs, processData.name, 'input'),
        outputs: loadProcessParameters(typesByName, processData.outputs, processData.name, 'output'),
        returnPaths: processData.returnPaths === undefined
            ? []
            : processData.returnPaths.slice(),
        steps: [],
        variables: loadProcessVariables(typesByName, processData.variables, processData.name),
        errors: [],
    };
}

function loadProcessParameters(
    typesByName: Map<string, DataType>,
    paramData: IParameterData[] | undefined,
    processName: string,
    paramTypeName: 'input' | 'output'
) {
    if (paramData === undefined) {
        return [];
    }

    return paramData.map(param => {
        const type = typesByName.get(param.type);

        if (type === undefined) {
            throw new Error(`The ${param.name} ${paramTypeName} in the ${processName} process has an invalid type: ${param.type}. That type doesn't exist in this workspace.`);
        }

        return {
            name: param.name,
            type: type,
        }
    });
}

function loadProcessVariables(
    typesByName: Map<string, DataType>,
    variableData: IVariableData[] | undefined,
    processName: string
) {
    if (variableData === undefined) {
        return [];
    }

    const usedNames = new Set<string>();

    return variableData.map(v => {
        if (usedNames.has(v.name)) {
            throw new Error(`Multiple variables called ${v.name} in the ${processName} process. Variable names must be unique.`);
        }

        const type = typesByName.get(v.type);

        if (type === undefined) {
            throw new Error(`The ${v.name} variable in the ${processName} process has an invalid type: ${v.type}. That type doesn't exist in this workspace.`);
        }

        usedNames.add(v.name);

        return {
            name: v.name,
            type,
            incomingLinks: [],
            outgoingLinks: [],
            x: v.x,
            y: v.y,
            initialValue: v.initialValue === undefined ? null : v.initialValue,
        };
    })
}

interface IIntermediateReturnPath {
    name: string | null;
    connection?: string;
}

interface IIntermediateStep {
    step: IStep;
    returnPaths?: IIntermediateReturnPath[];
}

function loadProcessSteps(
    processData: IUserProcessData,
    processesByName: Map<string, IProcess>
) {
    if (processData.steps === undefined) {
        return;
    }

    const process = processesByName.get(processData.name);
    if (process === undefined || !isUserProcess(process)) {
        return;
    }

    const stepsById = new Map<string, IIntermediateStep>();

    for (const stepData of processData.steps) {
        const id = stepData.id;
        if (stepData.type === 'start') {
            stepsById.set(id, {
                step: loadStartStep(process, stepData),
                returnPaths: loadReturnPaths(stepData),
            });
        }
        else if (stepData.type === 'stop') {
            stepsById.set(id, {
                step: loadStopStep(process, stepData),
            });
        }
        else if (stepData.type === 'process') {
            stepsById.set(id, {
                step: loadProcessStep(process, stepData, processesByName),
                returnPaths: loadReturnPaths(stepData),
            });
        }
    }

    validateReturnPaths(process.name, stepsById);
    
    process.steps = Array.from(stepsById.values()).map(s => s.step);
}

function loadProcessStep(process: IUserProcess, stepData: IProcessStepData, processesByName: Map<string, IProcess>) {
    const childProcessName = stepData.process;
    const childProcess = processesByName.get(childProcessName);

    if (childProcess === undefined) {
        throw new Error(`Step ${stepData.id} of the "${process.name}" process wraps an unknown process: ${childProcessName}.`
            + ' That process doesn\'t exist in this workspace.');
    }

    const isUser = isUserProcess(childProcess);

    const step: IProcessStep = {
        uniqueId: stepData.id,
        stepType: isUser ? StepType.UserProcess : StepType.SystemProcess,
        process: childProcess,
        inputs: loadStepInputs(stepData.id, process, childProcess.inputs, stepData),
        outputs: loadStepOutputs(stepData.id, process, childProcess.outputs, stepData),
        returnPaths: [],
        x: stepData.x,
        y: stepData.y,
        inputConnected: false,
    };
    return step;
}

function loadStopStep(process: IUserProcess, stepData: IStopStepData) {
    let returnPath: string | null;

    if (stepData.name !== undefined) {
        returnPath = stepData.name;

        if (process.returnPaths.indexOf(returnPath) === -1) {
            throw new Error(`Step ${stepData.id} of the "${process.name}" process uses an unspecified return path name: ${returnPath}.`
                + ' That name isn\'t a return path on this process.');
        }
    }
    else {
        returnPath = null;

        if (process.returnPaths.length > 0) {
            throw new Error(`Step ${stepData.id} of the "${process.name}" process has no return path name.`
                + ' This process uses named return paths, so a name is required.');
        }
    }

    return {
        uniqueId: stepData.id,
        stepType: StepType.Stop,
        inputs: loadStepInputs(stepData.id, process, process.outputs, stepData),
        x: stepData.x,
        y: stepData.y,
        returnPath,
        inputConnected: false,
    };
}

function loadStartStep(process: IUserProcess, stepData: IStartStepData) {
    return {
        uniqueId: stepData.id,
        stepType: StepType.Start,
        outputs: loadStepOutputs(stepData.id, process, process.inputs, stepData),
        returnPaths: [],
        x: stepData.x,
        y: stepData.y,
    };
}

function loadStepInputs(stepId: string, process: IUserProcess, inputs: IParameter[], stepData: IProcessStepData | IStopStepData) {
    return loadStepParameters(stepId, process, inputs, stepData.inputs, true);
}

function loadStepOutputs(stepId: string, process: IUserProcess, outputs: IParameter[], stepData: IProcessStepData | IStartStepData) {
    return loadStepParameters(stepId, process, outputs, stepData.outputs, false);
}

function loadStepParameters(
    stepId: string,
    process: IUserProcess,
    parameters: IParameter[],
    paramData: Record<string, string>,
    isInputParam: boolean
) {
    const usedParameters = new Set<string>();
    const usedVariables = new Set<string>();

    for (const paramName in Object.keys(paramData)) {
        const varName = paramData[paramName];

        if (usedParameters.has(paramName)) {
            const parameterTypeName = isInputParam ? 'input' : 'output';
            throw new Error(`Step ${stepId} of the "${process.name}" process tries to map the one ${parameterTypeName} multiple times: ${paramName}`);
        }

        if (usedVariables.has(varName)) {
            const parameterTypeName = isInputParam ? 'input' : 'output';
            throw new Error(`Step ${stepId} of the "${process.name}" process tries to mulitple ${parameterTypeName} to the same variable: ${varName}`);
        }

        usedParameters.add(paramName);
        usedVariables.add(varName);
    }
    
    return parameters.map(p => {
        let variable: IVariable | undefined;

        const variableName = paramData[p.name];
        if (variableName !== undefined) {
            variable = process.variables.find(v => v.name === variableName);
            
            if (variable === undefined) {
                const parameterTypeName = isInputParam ? 'input' : 'output';
                throw new Error(`Step ${stepId} of the "${process.name}" process tries to map an ${parameterTypeName} to a non-existant variable: ${variableName}`);
            }
        }

        const link = {
            ...p,
            connection: variable,
        };

        if (variable !== undefined) {
            if (isInputParam) {
                variable.outgoingLinks.push(link);
            }
            else {
                variable.incomingLinks.push(link);
            }
        }

        return link;
    });
}

function loadReturnPaths(stepData: IStartStepData | IProcessStepData) {
    const returnPaths: IIntermediateReturnPath[] = [];

    if (stepData.returnPath !== undefined) {
        returnPaths.push({ name: null, connection: stepData.returnPath});
        return returnPaths; // can only ever have one non-named return path
    }

    else if (stepData.type === 'process' && stepData.returnPaths !== undefined) {
        for (const pathName in Object.keys(stepData.returnPaths)) {
            const targetStepId = stepData.returnPaths[pathName];
            returnPaths.push({ name: pathName, connection: targetStepId});
        }
    
        return returnPaths;
    }
}

function validateReturnPaths(
    processName: string,
    stepsById: Map<string, IIntermediateStep>
) {
    for (const [, intermediateStep] of stepsById) {
        const step = intermediateStep.step;
        if (usesOutputs(step) && intermediateStep.returnPaths !== undefined) {
            validateStepReturnPaths(step, intermediateStep.returnPaths, stepsById, processName);
        }
    }
}

function validateStepReturnPaths(
    step: IStepWithOutputs,
    returnPaths: IIntermediateReturnPath[],
    stepsById: Map<string, IIntermediateStep>,
    processName: string
) {
    for (const path of returnPaths) {
        let destinationStep: IIntermediateStep | undefined;
        
        if (path.connection !== undefined) {
            destinationStep = stepsById.get(path.connection);

            if (destinationStep === undefined) {
                throw new Error(`Step ${step.uniqueId} of process "${processName}" links a return path to an unknown step: ${path.connection}.`);
            }
            if (!usesInputs(destinationStep.step)) {
                throw new Error(`Step ${step.uniqueId} of process "${processName}" links a return path to an invalid step: ${path.connection}.`);
            }
            step.returnPaths.push({ name: path.name, connection: destinationStep.step });
            destinationStep.step.inputConnected = true;
        }
        else {
            step.returnPaths.push({ name: path.name });
        }
    }
}
