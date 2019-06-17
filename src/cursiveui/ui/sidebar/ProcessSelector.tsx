import * as React from 'react';
import { UserProcess, SystemProcess, Process, Type } from '../../data';
import { ToolboxItem, ToolboxItemType } from './ToolboxItem';
import './ProcessSelector.css';
import { ProcessFolder } from './ProcessFolder';

interface Props {
    systemProcesses: SystemProcess[];
    userProcesses: UserProcess[];
    openProcess?: UserProcess;
    selectedProcess?: Process;
    className?: string;
    errorProcesses: UserProcess[];
    dataTypes: Map<string, Type>;

    deselect: () => void;
    processSelected: (process: Process) => void;
    stopStepSelected: (name: string | null) => void;
    dataTypeSelected: (type: Type) => void;
    
    processOpened: (process: UserProcess) => void;
    editDefinition: (process: UserProcess) => void;
}

interface State {
    rootProcesses: Process[];
    processFolders: Map<string, Process[]>;
    returnPathNames: string[];
}

export class ProcessSelector extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            ...this.arrangeProcesses(props),
            ...this.determineReturnPaths(props),
        };
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.userProcesses !== this.props.userProcesses
            || nextProps.systemProcesses !== this.props.systemProcesses) {
            this.setState(this.arrangeProcesses(nextProps));
        }

        if (nextProps.openProcess !== this.props.openProcess) {
            this.setState(this.determineReturnPaths(nextProps));
        }
    }

    private arrangeProcesses(props: Props) {
        const rootProcesses: Process[] = [];
        const processFolders = new Map<string, Process[]>();

        const allProcesses = [...props.userProcesses, ...props.systemProcesses];

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
        for (const type of this.props.dataTypes.values()) {
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

    renderDataType(type: Type) {
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

    private isUserProcess(process: Process): process is UserProcess {
        return !process.isSystem;
    }

    private renderProcess(process: Process, index: number) {
        let hasErrors: boolean;
        let isOpen: boolean;
        let openProcess: undefined | (() => void);
        let editDef: undefined | (() => void);
        let type: ToolboxItemType;

        if (this.isUserProcess(process)) {
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