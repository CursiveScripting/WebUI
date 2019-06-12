import { Workspace } from './data';
import React from 'react';
import { ProcessEditor } from './ui/ProcessEditor';

interface UIProps {
    className: string;
    loadWorkspace: () => Promise<Document | string>;
    loadProcesses: undefined | (() => Promise<string | null>);
    saveProcesses: (processXml: string) => void;
}

interface UIState {
    workspace?: Workspace;
}

export class CursiveUI extends React.PureComponent<UIProps, UIState> {
    constructor(props: UIProps) {
        super(props);

        this.state = {};
    }

    componentDidMount() {
        this.initialize();
    }

    render() {
        if (this.state.workspace !== undefined) {
            const doSave = () => this.save();

            return <ProcessEditor
                className={this.props.className}
                workspace={this.state.workspace}
                save={doSave}
            />
        }
        else {
            return <div>Loading...</div>
        }
    }
    
    private async initialize() {
        const workspaceData = await this.props.loadWorkspace();

        const workspace = this.isString(workspaceData)
            ? Workspace.loadFromString(workspaceData)
            : Workspace.loadFromDOM(workspaceData);

        if (this.props.loadProcesses !== undefined) {
            const processXml = await this.props.loadProcesses();
            if (processXml !== null) {
                workspace.loadProcessesFromString(processXml);
            }
        }

        workspace.validateAll();

        this.setState({
            workspace: workspace,
        });
    }

    private isString(data: string | Document): data is string {
        return typeof data === 'string';
    }

    private save() {
        if (this.state.workspace === undefined) {
            return;
        }

        const processXml = this.state.workspace.saveProcesses();
        this.props.saveProcesses(processXml);
    }
}