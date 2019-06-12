import * as React from 'react';
import { Step, Variable } from '../../data';

export interface BinToolProps {
    selectedStep?: Step;
    selectedVariable?: Variable;
    removeSelectedItem: () => void;
}

export class BinTool extends React.PureComponent<BinToolProps, {}> {
    render() {
        let binClasses = 'tool binTool';
        if (this.props.selectedStep !== undefined || this.props.selectedVariable !== undefined) {
            binClasses += ' binTool--active';
        }

        return (
            <div className={binClasses} onMouseUp={() => this.props.removeSelectedItem()}>
                <div className="tool__label">Drag here to remove:</div>
                <div className="tool__icon binTool__icon" />
            </div>
        );
    }
}