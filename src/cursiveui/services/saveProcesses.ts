import { IProcess } from '../state/IProcess';
import { isStopStep, usesInputs, usesOutputs } from './StepFunctions';
import { IUserProcess } from '../state/IUserProcess';
import { IParameter } from '../state/IParameter';
import { StepType, IStep } from '../state/IStep';
import { IStopStep } from '../state/IStopStep';
import { IProcessStep } from '../state/IProcessStep';
import { isUserProcess } from './ProcessFunctions';
import { IStepParameter } from '../state/IStepParameter';
import { IUserProcessData } from './loadProcesses';

export function saveProcesses(processes: IProcess[]) {
    const processData: IUserProcessData[] = [];

    for (const process of processes) {
        if (isUserProcess(process)) {
            processData.push(saveProcess(process));
        }
    }

    return JSON.stringify(processes);
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

        /*
        steps: process.steps.length === 0
            ? undefined
            : process.steps.map(step => {
                return {

                };
            }),
        */
    };
}

function saveStep(step: IStep, parent: HTMLElement) {
    let element: HTMLElement;

    if (step.stepType === StepType.Start) {
        element = parent.ownerDocument!.createElement('Start');
    }
    else if (isStopStep(step)) {
        element = parent.ownerDocument!.createElement('Stop');
        let returnPath = (step as IStopStep).returnPath;
        if (returnPath !== null) {
            element.setAttribute('name', returnPath);
        }
    }
    else {
        element = parent.ownerDocument!.createElement('Step');
        element.setAttribute('process', (step as IProcessStep).process.name);
    }
    parent.appendChild(element);

    element.setAttribute('ID', step.uniqueId.toString());

    element.setAttribute('x', step.x.toString());
    element.setAttribute('y', step.y.toString());

    if (usesInputs(step)) {
        saveStepParameters(step.inputs, element, 'Input', 'source');
    }

    if (usesOutputs(step)) {
        saveStepParameters(step.outputs, element, 'Output', 'destination');

        for (const path of step.returnPaths) {
            let pathElement: HTMLElement;
            
            if (path.name !== null) {
                pathElement = parent.ownerDocument!.createElement('NamedReturnPath');
                pathElement.setAttribute('name', path.name);
            }
            else {
                pathElement = parent.ownerDocument!.createElement('ReturnPath');
            }

            if (path.connection !== undefined) {
                pathElement.setAttribute('targetStepID', path.connection.uniqueId);
            }
            element.appendChild(pathElement);
        }
    }
}

function saveStepParameters(
    parameters: IStepParameter[],
    parent: Element,
    nodeName: string,
    variableAttributeName: string
) {
    if (parameters === null) {
        return;
    }

    for (const parameter of parameters) {
        const varName = parameter.connection !== undefined
            ? parameter.connection.name
            : undefined;

        saveStepParameter(parameter, varName, parent, nodeName, variableAttributeName);
    }
}

function saveStepParameter(
    parameter: IParameter,
    variableName: string | undefined,
    parent: Element,
    nodeName: string,
    variableAttributeName: string
) {
    const element = saveProcessParameter(parameter, parent, nodeName);

    if (variableName !== undefined) {
        element.setAttribute(variableAttributeName, variableName);
    }
}

function saveProcessParameter(parameter: IParameter, parent: Element, nodeName: string) {
    let element = parent.ownerDocument!.createElement(nodeName);
    element.setAttribute('name', parameter.name);
    element.setAttribute('type', parameter.type.name);
    parent.appendChild(element);
    return element;
}

function saveProcessReturnPath(returnPath: string, parent: Element) {
    let element = parent.ownerDocument!.createElement('ReturnPath');
    element.setAttribute('name', returnPath);
    parent.appendChild(element);
}