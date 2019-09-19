import * as React from 'react';
import { ProcessSelectorItem, ItemType } from './ProcessSelectorItem';
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
    allProcesses: IProcess[];
    filter: string;
    rootProcesses: IProcess[];
    processFolders: Map<string, IProcess[]>;
}

export class ProcessSelector extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            ...ProcessSelector.arrangeProcesses(props.processes),
            allProcesses: props.processes,
            filter: '',
        };
    }

    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
        if (nextProps.processes === prevState.allProcesses) {
            return null;
        }
        
        return {
            ...ProcessSelector.arrangeProcesses(nextProps.processes),
            allProcesses: nextProps.processes,
        };
    }

    private static arrangeProcesses(allProcesses: IProcess[]) {
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
        
        const filterRegex = new RegExp(this.state.filter, 'i');
        const rootProcesses = this.state.rootProcesses.map((p, i) => this.renderProcess(p, i, filterRegex, () => { }));

        const folders = [];
        for (const [folder, processes] of this.state.processFolders) {

            let anyVisible = false;
            const noteVisible = () => anyVisible = true;

            const folderProcesses = processes.map((p, i) => this.renderProcess(p, i, filterRegex, noteVisible));

            folders.push(<ProcessFolder name={folder} key={folder} visible={anyVisible}>
                {folderProcesses}
            </ProcessFolder>);
        }

        return (
            <div className={classes}>
                <div className="processSelector__scroll">
                    {rootProcesses}
                    {folders}
                </div>
                <input
                    type="text"
                    className="processSelector__filter"
                    value={this.state.filter}
                    onChange={e => this.setState({ filter: e.target.value })}
                    placeholder="filter processes..."
                />
            </div>
        );
    }
    
    private renderProcess(process: IProcess, index: number, filterRegex: RegExp, noteVisible: () => void) {
        let hasErrors: boolean;
        let isOpen: boolean;
        let openProcess: undefined | (() => void);
        let editDef: undefined | (() => void);
        let type: ItemType;

        if (isUserProcess(process)) {
            type = ItemType.UserProcess;
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
            type = ItemType.SystemProcess;
            hasErrors = false;
            isOpen = false;
            openProcess = undefined;
            editDef = undefined;
        }

        const isVisible = this.state.filter === ''
            || process.name.search(filterRegex) !== -1
            || process.description.search(filterRegex) !== -1;

        if (isVisible) {
            noteVisible();
        }

        const select = () => this.props.processSelected(process);
        const deselect = () => this.props.deselect();

        return (
            <ProcessSelectorItem
                name={process.name}
                description={process.description}
                type={type}
                key={index}
                visible={isVisible}
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