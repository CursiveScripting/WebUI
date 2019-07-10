import * as React from 'react';
import { ToolboxItem, ToolboxItemType } from './ToolboxItem';
import './ProcessSelector.css';
import { ProcessFolder } from './ProcessFolder';
import { IProcess } from '../../workspaceState/IProcess';
import { IUserProcess } from '../../workspaceState/IUserProcess';
import { isUserProcess } from '../../services/StepFunctions';
import { IType } from '../../workspaceState/IType';

interface Props {
    processes: IProcess[];
    openProcess?: IUserProcess;
    selectedProcess?: IProcess;
    className?: string;
    errorProcesses: IUserProcess[];
    dataTypes: IType[];

    deselect: () => void;
    processSelected: (process: IProcess) => void;
    stopStepSelected: (name: string | null) => void;
    dataTypeSelected: (type: IType) => void;
    
    processOpened: (process: IUserProcess) => void;
    editDefinition: (process: IUserProcess) => void;
}

interface State {
    rootProcesses: IProcess[];
    processFolders: Map<string, IProcess[]>;
    returnPathNames: string[];
}

export class ProcessSelector extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            ...this.arrangeProcesses(props.processes),
            ...this.determineReturnPaths(props),
        };
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.processes !== this.props.processes) {
            this.setState(this.arrangeProcesses(nextProps.processes));
        }

        if (nextProps.openProcess !== this.props.openProcess) {
            this.setState(this.determineReturnPaths(nextProps));
        }
    }

    private arrangeProcesses(allProcesses: IProcess[]) {
        const rootProcesses: IProcess[] = [];
        const processFolders = new Map<string, IProcess[]>();

        for (const process of allProcesses) {
            if (process.folder === null) {
                rootProcesses.push(process);
                continue;
            }
            
            let folderGroup = processFolders.get(process.folder);
            if (folderGroup === undefined) {
                processFolders.set(process.folder, [process]);
            }
            else {
                folderGroup.push(process);
            }
        }

        return {
            rootProcesses,
            processFolders,
        };
    }

    private determineReturnPaths(props: Props) {
        return {
            returnPathNames: props.openProcess === undefined
                ? []
                : props.openProcess.returnPaths,
        };
    }

    render() {
        let classes = 'processSelector';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        const stopSteps = this.state.returnPathNames.length === 0
            ? this.renderStopStep(null)
            : this.state.returnPathNames.map((path, index) => this.renderStopStep(path, index));

        const rootProcesses = this.state.rootProcesses.map((p, i) => this.renderProcess(p, i));

        const folders = [];
        for (const [folder, processes] of this.state.processFolders) {
            folders.push(<ProcessFolder name={folder} key={folder}>
                {processes.map((p, i) => this.renderProcess(p, i))}
            </ProcessFolder>);
        }

        const dataTypeItems = [];
        for (const type of this.props.dataTypes) {
            dataTypeItems.push(this.renderDataType(type));
        }

        const dataTypeRoot = dataTypeItems.length === 0
            ? undefined
            : <ProcessFolder name="Variables">
                {dataTypeItems}
            </ProcessFolder>;

        return (
            <div className={classes}>
                {stopSteps}
                {rootProcesses}
                {dataTypeRoot}
                {folders}
            </div>
        );
    }

    private renderStopStep(returnPath: string | null, index?: number) {
        const select = () => this.props.stopStepSelected(returnPath);
        const deselect = () => this.props.deselect();

        const subName = returnPath === null
            ? undefined
            : returnPath;

        return <ToolboxItem
            name="Stop"
            subName={subName}
            type={ToolboxItemType.StopStep}
            key={index}
            onMouseDown={select}
            onMouseUp={deselect}
        />
    }

    renderDataType(type: IType) {
        const select = () => this.props.dataTypeSelected(type);
        const deselect = () => this.props.deselect();

        return <ToolboxItem
            name={type.name}
            description={type.guidance}
            type={ToolboxItemType.Variable}
            key={type.name}
            colorOverride={type.color}
            onMouseDown={select}
            onMouseUp={deselect}
        />
    }

    private renderProcess(process: IProcess, index: number) {
        let hasErrors: boolean;
        let isOpen: boolean;
        let openProcess: undefined | (() => void);
        let editDef: undefined | (() => void);
        let type: ToolboxItemType;

        if (isUserProcess(process)) {
            type = ToolboxItemType.UserProcess;
            hasErrors = this.props.errorProcesses.indexOf(process) !== -1;
            isOpen = process === this.props.openProcess;

            openProcess = process === this.props.openProcess
                ? undefined
                : () => this.props.processOpened(process);

            editDef = process.fixedSignature
                ? undefined
                : () => this.props.editDefinition(process);
        }
        else {
            type = ToolboxItemType.SystemProcess;
            hasErrors = false;
            isOpen = false;
            openProcess = undefined;
            editDef = undefined;
        }

        const select = () => this.props.processSelected(process);
        const deselect = () => this.props.deselect();

        return (
            <ToolboxItem
                name={process.name}
                description={process.description}
                type={type}
                key={index}
                isOpen={isOpen}
                isSelected={this.props.selectedProcess === process}
                hasError={hasErrors}
                clickHeader={openProcess}
                clickEdit={editDef}
                onMouseDown={select}
                onMouseUp={deselect}
            />
        );
    }
}