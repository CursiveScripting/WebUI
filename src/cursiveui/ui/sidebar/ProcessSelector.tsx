import * as React from 'react';
import { ToolboxItem, ToolboxItemType } from './ToolboxItem';
import './ProcessSelector.css';
import { ProcessFolder } from './ProcessFolder';
import { IProcess } from '../../state/IProcess';
import { IUserProcess } from '../../state/IUserProcess';
import { isUserProcess } from '../../services/ProcessFunctions';

interface Props {
    processes: IProcess[];
    openProcess?: IUserProcess;
    selectedProcess?: IProcess;
    className?: string;

    deselect: () => void;
    processSelected: (process: IProcess) => void;
    
    processOpened: (process: IUserProcess) => void;
    editDefinition: (process: IUserProcess) => void;
}

interface State {
    rootProcesses: IProcess[];
    processFolders: Map<string, IProcess[]>;
}

export class ProcessSelector extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = this.arrangeProcesses(props.processes);
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.processes !== this.props.processes) {
            this.setState(this.arrangeProcesses(nextProps.processes));
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

    render() {
        let classes = 'processSelector';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }
        const rootProcesses = this.state.rootProcesses.map((p, i) => this.renderProcess(p, i));

        const folders = [];
        for (const [folder, processes] of this.state.processFolders) {
            folders.push(<ProcessFolder name={folder} key={folder}>
                {processes.map((p, i) => this.renderProcess(p, i))}
            </ProcessFolder>);
        }

        return (
            <div className={classes}>
                {rootProcesses}
                {folders}
            </div>
        );
    }
    
    private renderProcess(process: IProcess, index: number) {
        let hasErrors: boolean;
        let isOpen: boolean;
        let openProcess: undefined | (() => void);
        let editDef: undefined | (() => void);
        let type: ToolboxItemType;

        if (isUserProcess(process)) {
            type = ToolboxItemType.UserProcess;
            hasErrors = process.errors.length > 0;
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