import { IWorkspaceState } from '../state/IWorkspaceState';
import { IUserProcess } from '../state/IUserProcess';
import { ISystemProcess } from '../state/ISystemProcess';
import { isString } from './DataFunctions';
import { IProcess } from '../state/IProcess';
import { IType } from '../state/IType';
import { IParameter } from '../state/IParameter';
import { StepType } from '../state/IStep';
import { determineStepId, createEmptyStartStep } from './StepFunctions';
import { gridSize } from '../ui/ProcessContent/gridSize';
import { IStartStep } from '../state/IStartStep';
import { ValidationError } from '../state/IValidationError';

export function loadWorkspace(workspaceData: Document | string) {
    const rootElement = isString(workspaceData)
        ? new DOMParser().parseFromString(workspaceData, 'application/xml').documentElement
        : workspaceData.firstChild as HTMLElement;

    return loadWorkspaceFromElement(rootElement);
}

function loadWorkspaceFromElement(workspaceData: HTMLElement): IWorkspaceState {
    const processesByName: Record<string, IProcess> = {};
    const typesByName: Record<string, IType> = {};

    const typeNodes = workspaceData.getElementsByTagName('Type');
    
    for (const typeNode of typeNodes) {
        const type = loadType(typeNode, typesByName);
        
        if (typesByName.hasOwnProperty(type.name)) {
            throw new Error(`There are two types in the workspace with the same name: ${type.name}. Type names must be unique.`);
        }

        typesByName[type.name] = type;
    }

    let procNodes = workspaceData.getElementsByTagName('SystemProcess');
    for (const procNode of procNodes) {
        const process = loadProcessDefinition(procNode, typesByName, true) as ISystemProcess;
        processesByName[process.name] = process;
    }

    const errors: Record<string, ValidationError[]> = {};

    procNodes = workspaceData.getElementsByTagName('RequiredProcess');
    for (const procNode of procNodes) {
        const process = loadProcessDefinition(procNode, typesByName, false) as IUserProcess;
        processesByName[process.name] = process;
        errors[process.name] = [];
    }

    return {
        types: Object.values(typesByName),
        processes: Object.values(processesByName),
    };
}

function loadType(typeNode: Element, typesByName: Record<string, IType>): IType {
    const name = typeNode.getAttribute('name')!;
    const color = typeNode.getAttribute('color')!;
    
    const validationExpression = typeNode.getAttribute('validation');

    let extendsTypeName = typeNode.getAttribute('extends');

    if (extendsTypeName !== null) {
        if (!typesByName.hasOwnProperty(extendsTypeName)) {
            throw new Error(`Type ${name} extends a type which has not been defined: ${extendsTypeName}.`);
        }
    }

    const guidance = typeNode.getAttribute('guidance');

    return {
        name,
        color,
        extendsTypeName: extendsTypeName === null ? undefined : extendsTypeName,
        guidance: guidance === null ? undefined : guidance,
        validationExpression: validationExpression === null ? undefined : validationExpression,
    };
}

function loadProcessDefinition(
    procNode: Element,
    typesByName: Record<string, IType>,
    isSystemProcess: boolean
): ISystemProcess | IUserProcess {
    const processName = procNode.getAttribute('name') as string;
    const inputs: IParameter[] = [];
    const outputs: IParameter[] = [];
    const returnPaths: string[] = [];
    const procTypeName = isSystemProcess ? 'system' : 'fixed';
    
    const folder = procNode.hasAttribute('folder') ? procNode.getAttribute('folder') : null;
    const descNodes = procNode.getElementsByTagName('Description');
    const description = descNodes.length > 0 ? descNodes[0].innerHTML : '';
    
    let paramNodes = procNode.getElementsByTagName('Input');
    loadParameters(processName, typesByName, paramNodes, inputs, 'input', procTypeName);

    paramNodes = procNode.getElementsByTagName('Output');
    loadParameters(processName, typesByName, paramNodes, outputs, 'output', procTypeName);
    
    const returnPathNodes = procNode.getElementsByTagName('ReturnPath');
    const usedNames: {[key: string]: boolean} = {};
    for (const returnPathNode of returnPathNodes) {
        const path = returnPathNode.getAttribute('name') as string;
        
        if (usedNames.hasOwnProperty(path)) {
            throw new Error(`The '${processName}' ${procTypeName} process has two return paths with the same name: ${path}.`
            + ` Return path names must be unique within a process.`);
        }
        else {
            usedNames[path] = true;
            returnPaths.push(path);
        }
    }

    return isSystemProcess
        ? {
            name: processName,
            description: description,
            folder: folder,
            inputs: inputs,
            outputs: outputs,
            returnPaths,
            isSystem: true,
        }
        : {
            name: processName,
            description: description,
            folder: folder,
            inputs: inputs,
            outputs: outputs,
            returnPaths,
            steps: [createEmptyStartStep(inputs)],
            variables: [],
            isSystem: false,
            fixedSignature: true,
            errors: [],
        };
}

function loadParameters(
    processName: string,
    typesByName: Record<string, IType>,
    paramNodes: HTMLCollectionOf<Element>,
    parameters: IParameter[],
    inputOrOutput: 'input' | 'output',
    procTypeName: string
) {
    const usedNames = new Set<string>();

    for (const paramNode of paramNodes) {
        const paramName = paramNode.getAttribute('name') as string;
        const paramTypeName = paramNode.getAttribute('type') as string;
        
        if (!typesByName.hasOwnProperty(paramTypeName)) {
            throw new Error(`The '${processName}' ${procTypeName} process has an ${inputOrOutput} (${paramName})`
                + ` with an unrecognised type: ${paramTypeName}.`);
        }    
        
        if (usedNames.has(paramName)) {
            throw new Error(`The '${processName}' ${procTypeName} process has two ${inputOrOutput}s`
                + ` with the same name: ${paramName}. The names of ${paramTypeName}s must be unique within a process.`);
        }
            
        usedNames.add(paramName);

        parameters.push({
            name: paramName,
            type: typesByName[paramTypeName],
        });
    }
}