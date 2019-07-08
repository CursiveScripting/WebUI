import { Type, Parameter } from '../data';
import { IWorkspace } from '../workspaceState/IWorkspace';
import { IUserProcess } from '../workspaceState/IUserProcess';
import { ISystemProcess } from '../workspaceState/ISystemProcess';
import { isString } from './DataFunctions';
import { IProcess } from '../workspaceState/IProcess';

export class WorkspaceLoading {
    public static load(workspaceData: Document | string) {
        const rootElement = isString(workspaceData)
            ? new DOMParser().parseFromString(workspaceData, 'application/xml').documentElement
            : workspaceData.firstChild as HTMLElement;

        return this.loadWorkspace(rootElement);
    }

    private static loadWorkspace(
        workspaceXml: HTMLElement
    ): IWorkspace {
        const processesByName = new Map<string, IProcess>();

        const typesByName = new Map<string, Type>();
        const typeNodes = workspaceXml.getElementsByTagName('Type');
        
        for (const typeNode of typeNodes) {
            const type = this.loadType(typeNode, typesByName);
            
            if (typesByName.has(type.name)) {
                throw new Error(`There are two types in the workspace with the same name: ${type.name}. Type names must be unique.`);
            }

            typesByName.set(type.name, type);
        }
    
        let procNodes = workspaceXml.getElementsByTagName('SystemProcess');
        for (const procNode of procNodes) {
            const process = this.loadProcessDefinition(procNode, typesByName, true) as ISystemProcess;
            processesByName.set(process.name, process);
        }

        procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
        for (const procNode of procNodes) {
            const process = this.loadProcessDefinition(procNode, typesByName, false) as IUserProcess;
            processesByName.set(process.name, process);
        }

        return {
            types: Array.from(typesByName.values()),
            processes: Array.from(processesByName.values()),
        };
    }

    private static loadType(typeNode: Element, typesByName: Map<string, Type>) {
        const name = typeNode.getAttribute('name') as string;
        const color = typeNode.getAttribute('color') as string;
        
        let validationExpression: RegExp | undefined;
        if (typeNode.hasAttribute('validation')) {
            const validation = typeNode.getAttribute('validation') as string;
            validationExpression = new RegExp(validation);
        }

        let extendsType: Type | null;
        if (typeNode.hasAttribute('extends')) {
            const extendsName = typeNode.getAttribute('extends') as string;
            const tmpExtendsType = typesByName.get(extendsName)
            
            if (tmpExtendsType === undefined) {
                throw new Error(`Type ${name} extends a type which has not been defined: ${extendsName}.`);
            }
            
            extendsType = tmpExtendsType;
        }
        else {
            extendsType = null;
        }

        let guidance: string | undefined;
        if (typeNode.hasAttribute('guidance')) {
            guidance = typeNode.getAttribute('guidance') as string;
        }

        return new Type(name, color, extendsType, validationExpression, guidance);
    }

    private static loadProcessDefinition(
        procNode: Element,
        typesByName: Map<string, Type>,
        isSystemProcess: boolean
    ): ISystemProcess | IUserProcess {
        const processName = procNode.getAttribute('name') as string;
        const inputs: Parameter[] = [];
        const outputs: Parameter[] = [];
        const returnPaths: string[] = [];
        const procTypeName = isSystemProcess ? 'system' : 'fixed';
        
        const folder = procNode.hasAttribute('folder') ? procNode.getAttribute('folder') : null;
        const descNodes = procNode.getElementsByTagName('Description');
        const description = descNodes.length > 0 ? descNodes[0].innerHTML : '';
        
        let paramNodes = procNode.getElementsByTagName('Input');
        this.loadParameters(processName, typesByName, paramNodes, inputs, 'input', procTypeName);

        paramNodes = procNode.getElementsByTagName('Output');
        this.loadParameters(processName, typesByName, paramNodes, outputs, 'output', procTypeName);
        
        const returnPathNodes = procNode.getElementsByTagName('ReturnPath');
        const usedNames: {[key: string]: boolean} = {};
        for (const returnPathNode of returnPathNodes) {
            let path = returnPathNode.getAttribute('name') as string;
            
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
                steps: [], // TODO: createDefaultSteps
                variables: [],
                isSystem: false,
                fixedSignature: true,
            };
    }

    private static loadParameters(
        processName: string,
        types: Map<string, Type>,
        paramNodes: HTMLCollectionOf<Element>,
        parameters: Parameter[],
        inputOrOutput: 'input' | 'output',
        procTypeName: string
    ) {
        const usedNames = new Set<string>();
        const isInput = inputOrOutput === 'input';

        for (const paramNode of paramNodes) {
            const paramName = paramNode.getAttribute('name') as string;
            const paramTypeName = paramNode.getAttribute('type') as string;
            
            const paramType = types.get(paramTypeName);
            if (paramType === undefined) {
                throw new Error(`The '${processName}' ${procTypeName} process has an ${inputOrOutput} (${paramName})`
                 + ` with an unrecognised type: ${paramTypeName}.`);
                continue;
            }    
            
            if (usedNames.has(paramName)) {
                throw new Error(`The '${processName}' ${procTypeName} process has two ${inputOrOutput}s`
                    + ` with the same name: ${paramName}. The names of ${paramTypeName}s must be unique within a process.`);
                continue;
            }
                
            usedNames.add(paramName);
            parameters.push(new Parameter(paramName, paramType, isInput));
        }
    }
}