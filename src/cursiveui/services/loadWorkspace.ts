import ajv from 'ajv';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { IUserProcess } from '../state/IUserProcess';
import { ISystemProcess } from '../state/ISystemProcess';
import { IProcess } from '../state/IProcess';
import { DataType, IType, ILookupType } from '../state/IType';
import { IParameter } from '../state/IParameter';
import { createEmptyStartStep } from './StepFunctions';
import { usesOptions } from './TypeFunctions';
import workspaceSchema from '../../../Schema/workspace.json';

export function loadWorkspace(workspaceData: string) {
    var validator = new ajv();

    let validate = validator.compile(workspaceSchema);

    let valid = validate(workspaceData);

    if (!valid) {
        console.log(validator.errors);
    }

    /*
    const rootElement = isString(workspaceData)
        ? new DOMParser().parseFromString(workspaceData, 'application/xml').documentElement
        : workspaceData.firstChild as HTMLElement;

    return loadWorkspaceFromElement(rootElement);
    */
}

function loadWorkspaceFromElement(workspaceData: HTMLElement): IWorkspaceState {
    const typesByName = loadTypes(workspaceData);
    const processesByName = new Map<string, IProcess>();

    let procNodes = workspaceData.getElementsByTagName('SystemProcess');
    for (const procNode of procNodes) {
        const process = loadProcessDefinition(procNode, typesByName, true) as ISystemProcess;
        processesByName.set(process.name, process);
    }

    procNodes = workspaceData.getElementsByTagName('RequiredProcess');
    for (const procNode of procNodes) {
        const process = loadProcessDefinition(procNode, typesByName, false) as IUserProcess;
        processesByName.set(process.name, process);
    }

    return {
        types: Array.from(typesByName.values()),
        processes: Array.from(processesByName.values()),
    };
}

type ITypeWithExtendsName = IType & {
    extendsTypeName?: string;
}

function loadTypes(workspaceData: HTMLElement) {
    const typesByName = new Map<string, DataType>();
    const typesThatExtend: ITypeWithExtendsName[] = [];

    let typeNodes = workspaceData.getElementsByTagName('Type');
    
    for (const typeNode of typeNodes) {
        const type = loadType(typeNode);
        
        if (typesByName.has(type.name)) {
            throw new Error(`There are two types in the workspace with the same name: ${type.name}. Type names must be unique.`);
        }

        typesByName.set(type.name, type);

        if (!usesOptions(type) && type.extendsTypeName !== undefined) {
            // TODO: if type extends, add it to typesThatExtend   
            typesThatExtend.push(type);
        }
    }

    typeNodes = workspaceData.getElementsByTagName('LookupType');
    for (const typeNode of typeNodes) {
        const type = loadLookupType(typeNode);
        
        if (typesByName.has(type.name)) {
            throw new Error(`There are two types in the workspace with the same name: ${type.name}. Type names must be unique.`);
        }

        typesByName.set(type.name, type);
    }

    // Now that all types are loaded, properly hook up extendsType property
    for (const type of typesThatExtend) {
        if (type.extendsTypeName === undefined) {
            continue;
        }

        const extendsType = typesByName.get(type.extendsTypeName);

        if (extendsType === undefined) {
            throw new Error(`Type ${type.name} extends a type which has not been defined: ${type.extendsTypeName}.`);
        }

        type.extendsType = extendsType;

        delete type.extendsTypeName;
    }

    return typesByName;
}

function loadType(typeNode: Element): ITypeWithExtendsName {
    const name = typeNode.getAttribute('name')!;
    const color = typeNode.getAttribute('color')!;
    const guidance = typeNode.getAttribute('guidance');

    let type: ITypeWithExtendsName = {
        name,
        color,
        guidance: guidance === null ? undefined : guidance,
    };

    const validationExpression = typeNode.getAttribute('validation');
    if (validationExpression !== null) {
        type.validationExpression = validationExpression;
    }

    const extendsTypeName = typeNode.getAttribute('extends');
    if (extendsTypeName !== null) {
        type.extendsTypeName = extendsTypeName;
    }

    return type;
}

function loadLookupType(typeNode: Element): ILookupType {
    const name = typeNode.getAttribute('name')!;
    const color = typeNode.getAttribute('color')!;
    const guidance = typeNode.getAttribute('guidance');

    return {
        name,
        color,
        guidance: guidance === null ? undefined : guidance,
        options: Array.from(typeNode.getElementsByTagName('Option'))
            .map(option => (option as HTMLElement).innerHTML),
    };
}

function loadProcessDefinition(
    procNode: Element,
    typesByName: Map<string, DataType>,
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
    typesByName: Map<string, DataType>,
    paramNodes: HTMLCollectionOf<Element>,
    parameters: IParameter[],
    inputOrOutput: 'input' | 'output',
    procTypeName: string
) {
    const usedNames = new Set<string>();

    for (const paramNode of paramNodes) {
        const paramName = paramNode.getAttribute('name') as string;
        const paramTypeName = paramNode.getAttribute('type') as string;
        
        const type = typesByName.get(paramTypeName);

        if (type === undefined) {
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
            type,
        });
    }
}