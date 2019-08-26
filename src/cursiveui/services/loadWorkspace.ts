import workspaceSchema from 'cursive-schema/workspace.json';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { IUserProcess } from '../state/IUserProcess';
import { ISystemProcess } from '../state/ISystemProcess';
import { IProcess } from '../state/IProcess';
import { DataType, IType, ILookupType } from '../state/IType';
import { IParameter } from '../state/IParameter';
import { createEmptyStartStep } from './StepFunctions';
import { usesOptions } from './TypeFunctions';
import { validateSchema } from './DataFunctions';
import { IWorkspaceData, IFixedTypeData, ILookupTypeData, IProcessData, IParameterData } from './serializedDataModels';

export function loadWorkspace(workspaceData: IWorkspaceData, checkSchema: boolean): IWorkspaceState {
    if (checkSchema) {
        const validationErrors = validateSchema(workspaceSchema, workspaceData);

        if (validationErrors !== null) {
            throw new Error(`Workspace is not valid: ${validationErrors}`);
        }
    }
    
    const typesByName = loadTypes(workspaceData);
    const processesByName = new Map<string, IProcess>();

    for (const processData of workspaceData.systemProcesses) {
        const process = loadProcessDefinition(processData, typesByName, true);
        processesByName.set(process.name, process);
    }

    for (const processData of workspaceData.requiredProcesses) {
        const process = loadProcessDefinition(processData, typesByName, false);
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

function loadTypes(workspaceData: IWorkspaceData) {
    const typesByName = new Map<string, DataType>();
    const typesThatExtend: ITypeWithExtendsName[] = [];

    for (const typeData of workspaceData.types) {
        let type = (typeData as any).options === undefined
            ? loadStandardType(typeData as IFixedTypeData)
            : loadLookupType(typeData as ILookupTypeData);

        if (typesByName.has(type.name)) {
            throw new Error(`There are two types in the workspace with the same name: ${type.name}. Type names must be unique.`);
        }

        if (typeData.guidance !== undefined) {
            type.guidance = typeData.guidance;
        }    

        typesByName.set(type.name, type);

        if (!usesOptions(type) && type.extendsTypeName !== undefined) {
            typesThatExtend.push(type);
        }
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

function loadStandardType(typeData: IFixedTypeData): ITypeWithExtendsName {
    let type: ITypeWithExtendsName = {
        name: typeData.name,
        color: typeData.color,
    };

    if (typeData.validation !== undefined) {
        type.validationExpression = typeData.validation;
    }

    if (typeData.extends !== undefined) {
        type.extendsTypeName = typeData.extends;
    }

    return type;
}

function loadLookupType(typeData: ILookupTypeData): ILookupType {
    return {
        name: typeData.name,
        color: typeData.color,
        options: typeData.options,
    };
}

function loadProcessDefinition(
    processData: IProcessData,
    typesByName: Map<string, DataType>,
    isSystemProcess: boolean
): ISystemProcess | IUserProcess {
    const processName = processData.name
    const inputs: IParameter[] = [];
    const outputs: IParameter[] = [];
    const returnPaths: string[] = [];
    const procTypeName = isSystemProcess ? 'system' : 'fixed';
    
    const folder = processData.folder === undefined ? null : processData.folder;
    const description = processData.description === undefined ? '' : processData.description;
    
    if (processData.inputs !== undefined) {
        loadParameters(processName, typesByName, processData.inputs, inputs, 'input', procTypeName);
    }

    if (processData.outputs !== undefined) {
        loadParameters(processName, typesByName, processData.outputs, outputs, 'output', procTypeName);
    }
    
    if (processData.returnPaths !== undefined) {
        const usedNames: {[key: string]: boolean} = {};
        for (const path of processData.returnPaths) {
            if (usedNames.hasOwnProperty(path)) {
                throw new Error(`The '${processName}' ${procTypeName} process has two return paths with the same name: ${path}.`
                + ` Return path names must be unique within a process.`);
            }
            else {
                usedNames[path] = true;
                returnPaths.push(path);
            }
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
    paramData: IParameterData[],
    parameters: IParameter[],
    inputOrOutput: 'input' | 'output',
    procTypeName: string
) {
    const usedNames = new Set<string>();

    for (const param of paramData) {
        const paramName = param.name;
        const paramTypeName = param.type;
        
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