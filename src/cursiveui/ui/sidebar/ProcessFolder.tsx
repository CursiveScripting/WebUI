import * as React from 'react';
import './ProcessFolder.css';

interface Props {
    name: string;
}

interface State {
    open: boolean;
}

export class ProcessFolder extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            open: true,
        };
    }
    render() {
        const classes = this.state.open
            ? 'processFolder processFolder--open'
            : 'processFolder processFolder--closed';
        
        const clickHeader = () => this.setState(prevState => {
            return {
                open: !prevState.open,
            }
        });

        return (
            <div className={classes}>
                <div className="processFolder__header" onClick={clickHeader}>
                    <div className="processFolder__headerText">{this.props.name}</div>
                </div>
                <div className="processFolder__content">
                    {this.props.children}
                </div>
            </div>
        );
    }
}