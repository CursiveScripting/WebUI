import * as React from 'react';
import { UserProcess, SystemProcess, Process } from '../../data';
import { ProcessListItem } from './ProcessListItem';
import './ProcessSelector.css';
import { ProcessFolder } from './ProcessFolder';

interface Props {
    systemProcesses: SystemProcess[];
    userProcesses: UserProcess[];
    openProcess?: UserProcess;
    selectedProcess?: Process;
    className?: string;
    errorProcesses: UserProcess[];
    processOpened: (process: UserProcess) => void;
    editDefinition: (process: UserProcess) => void;
    processSelected: (process: Process) => void;
}

interface State {
    rootProcesses: Process[];
    processFolders: Map<string, Process[]>
}

export class ProcessSelector extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = this.arrangeProcesses(props);
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.userProcesses !== this.props.userProcesses
            || nextProps.systemProcesses !== this.props.systemProcesses) {
            this.setState(this.arrangeProcesses(nextProps));
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

    private isUserProcess(process: Process): process is UserProcess {
        return !process.isSystem;
    }

    private renderProcess(process: Process, index: number) {
        let hasErrors: boolean;
        let isOpen: boolean;
        let openProcess: undefined | (() => void);
        let editDef: undefined | (() => void);

        if (this.isUserProcess(process)) {
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
            hasErrors = false;
            isOpen = false;
            openProcess = undefined;
            editDef = undefined;
        }

        const select = () => this.props.processSelected(process);

        return (
            <ProcessListItem
                process={process}
                key={index}
                isOpen={isOpen}
                isSelected={this.props.selectedProcess === process}
                hasError={hasErrors}
                clickHeader={openProcess}
                clickEdit={editDef}
                onMouseDown={select}
            />
        );
    }
}