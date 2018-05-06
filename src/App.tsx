import * as React from 'react';
import { ProcessEditor } from './ui/ProcessEditor';
import { Workspace } from './data';
import './App.css';

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

            this.setState({
                workspace: Workspace.loadWorkspace(request.responseXML),
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
            />
        );
    }

    private saveProcesses(xml: XMLDocument) {
        console.log('not really saving...', xml);
        return true;
    }
}

export default App;
