import * as React from 'react';

export interface StopStepToolProps {
    returnPaths: (string | null)[];
    selectedStopStep?: string | null;

    selectStopStep: (name: string | null) => void;
}

export class StopStepTool extends React.PureComponent<StopStepToolProps, {}> {
    render() {
        return (
            <div className="tool stopStepTool">
                <div className="tool__label">Add a stop step:</div>
                <div className="stopStepTool__items">
                    {this.renderReturnPathSelectors()}
                </div>
            </div>
        );
    }
    
    private renderReturnPathSelectors() {
        let paths = this.props.returnPaths;

        if (paths.length === 0) {
            paths = [null];
        }

        return paths.map((name, idx) => {
            let classes = 'tool__icon stopStepTool__icon';
            if (name === this.props.selectedStopStep) {
                classes += ' stopStepTool__icon--active';
            }

            return (
                <div
                    className={classes}
                    key={idx}
                    onMouseDown={() => this.props.selectStopStep(name)}
                >
                    {name}
                </div>
            );
        });
    }
}