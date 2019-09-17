export interface IWorkspaceData {
    types: Array<IFixedTypeData | ILookupTypeData>;
    requiredProcesses: IProcessData[];
    systemProcesses: IProcessData[];
}

interface ITypeData {
    name: string;
    color: string;
    guidance?: string;
}

export interface IFixedTypeData extends ITypeData {
    extends?: string;
    validation?: string;
}

export interface ILookupTypeData extends ITypeData {
    options: string[];
}

export interface IParameterData {
    name: string;
    type: string;
}

export interface IProcessData {
    name: string;
    description?: string;
    folder?: string;
    inputs?: IParameterData[];
    outputs?: IParameterData[];
    returnPaths?: string[];
}

export interface IUserProcessData extends IProcessData {
    variables?: IVariableData[];
    steps: Array<IStartStepData | IStopStepData | IProcessStepData>;
}

interface IPositionData {
    x: number;
    y: number;
}

export interface IVariableData extends IParameterData, IPositionData {
    initialValue?: string;
}

interface IStepData extends IPositionData {
    id: string;
}

export interface IStartStepData extends IStepData {
    type: 'start';
    outputs?: Record<string, string>;
    returnPath?: string;
}

export interface IStopStepData extends IStepData {
    type: 'stop';
    name?: string;
    inputs?: Record<string, string>;
}

export interface IProcessStepData extends IStepData {
    type: 'process';
    process: string;
    inputs?: Record<string, string>;
    outputs?: Record<string, string>;
    returnPath?: string;
    returnPaths?: Record<string, string>;
}
