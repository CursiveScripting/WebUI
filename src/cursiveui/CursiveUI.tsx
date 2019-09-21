import React from 'react';
import { Error } from './ui/Error';
import { WorkspaceUI, Props as WorkspaceProps } from './WorkspaceUI';

interface Props extends WorkspaceProps {
    catchErrors?: boolean;
}

interface State {
    error?: Error
}

export class CursiveUI extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {};
    }

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    render() {
        if (this.props.catchErrors && this.state.error !== undefined) {
            return <Error
                message={this.state.error.message}
                stack={this.state.error.stack}
            />
        }

        return <WorkspaceUI {...this.props} />
    }
}
