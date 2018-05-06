import * as React from 'react';
import { ProcessEditor } from './ui/ProcessEditor';
import { Workspace } from './data';
import './App.css';
import { ProcessLoading } from './io/ProcessLoading';

interface AppState {
    workspace?: Workspace;
}

class App extends React.PureComponent<{}, AppState> {
    constructor(props: {}) {
        super(props);
        this.state = {};
    }

    componentWillMount() {
        let request = new XMLHttpRequest();
        request.open('GET', 'workspace.xml', true);
    
        request.onload = () => {
            if ((request.status >= 400 || request.status < 200) && request.status !== 0 || request.responseXML === null) {
                throw 'Failed to load workspace XML';
            }

            let workspace = Workspace.loadWorkspace(request.responseXML);
            let processXml = sessionStorage.getItem('saved');
            if (processXml !== null) {
                let tmp = document.createElement('div');
                tmp.innerHTML = processXml;
                ProcessLoading.loadProcesses(workspace, tmp.firstChild as HTMLElement);
            }

            this.setState({
                workspace: workspace,
            });
        };
        request.send();
    }

    render() {
        if (this.state.workspace === undefined) {
            return <div>Please wait</div>;
        }
      
        return (
            <ProcessEditor
                className="fullScreen"
                workspace={this.state.workspace}
                save={xml => this.saveProcesses(xml)}
            />
        );
    }

    private saveProcesses(processXml: string) {
        sessionStorage.setItem('saved', processXml);
    }
}

export default App;
