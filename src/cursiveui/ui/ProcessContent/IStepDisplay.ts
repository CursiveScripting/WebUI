import { IStep } from '../../workspaceState/IStep';
import { IType } from '../../workspaceState/IType';
import { IProcess } from '../../workspaceState/IProcess';
import { isStartStep, isStopStep } from '../../services/StepFunctions';
import { IProcessStep } from '../../workspaceState/IProcessStep';

export interface IStepDisplayParam {
    name: string;
    type: IType;
    linkedVariable?: string;
}

export interface IStepDisplay extends IStep {
    name: string;
    description?: string;
    
    inputs: IStepDisplayParam[];
    outputs: IStepDisplayParam[];
    returnPaths: Map<string, string | null>;
}

function constructReturnPaths(paths: string[], links: Record<string, string>) {    
    const returnPaths = new Map<string, string | null>();

    if (paths.length === 0) {
        const value = links.hasOwnProperty('')
                ? links[''] : null;

        returnPaths.set('', value);
    }
    else {   
        for (const path of paths) {
            const value = links.hasOwnProperty(path)
                ? links[path] : null
            returnPaths.set(path, value);
        }
    }

    return returnPaths;
}

export function populateStepDisplay(
    step: IStep,
    inProcess: IProcess,
    processesByName: Map<string, IProcess>,
    typesByName: Map<string, IType>
): IStepDisplay {

    if (isStartStep(step)) {
        return {
            uniqueId: step.uniqueId,
            stepType: step.stepType,
            x: step.x,
            y: step.y,
            name: 'Start',
            inputs: [],
            outputs: inProcess.inputs.map(p => { return {
                name: p.name,
                type: typesByName.get(p.typeName)!,
                linkedVariable: step.outputs[p.name],
            }}),
            returnPaths: constructReturnPaths([], step.returnPaths),
        }
    }

    if (isStopStep(step)) {
        return {
            uniqueId: step.uniqueId,
            stepType: step.stepType,
            x: step.x,
            y: step.y,
            name: 'Stop',
            inputs: inProcess.outputs.map(p => { return {
                name: p.name,
                type: typesByName.get(p.typeName)!,
                linkedVariable: step.inputs[p.name],
            }}),
            outputs: [],
            returnPaths: new Map<string, string | null>(),
        }
    }

    const procStep = step as IProcessStep;

    const process = processesByName.get(procStep.processName)!;

    const returnPaths: Record<string, string | null> = { ...procStep.returnPaths };
    for (const pathName of process.returnPaths) {
        if (!returnPaths.hasOwnProperty(pathName)) {
            returnPaths[pathName] = null;
        }
    }

    return {
        uniqueId: step.uniqueId,
        stepType: step.stepType,
        x: step.x,
        y: step.y,
        name: process.name,
        description: process.description,
        inputs: process.inputs.map(p => { return {
            name: p.name,
            type: typesByName.get(p.typeName)!,
            linkedVariable: procStep.inputs[p.name],
        }}),
        outputs: process.outputs.map(p => { return {
            name: p.name,
            type: typesByName.get(p.typeName)!,
            linkedVariable: procStep.outputs[p.name],
        }}),
        returnPaths: constructReturnPaths(process.returnPaths, procStep.returnPaths),
    };
}