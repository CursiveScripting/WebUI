namespace Cursive {
    export abstract class Step {
        readonly inputs: Parameter[];
        readonly outputs: Parameter[];
        x: number;
        y: number;
        private moveOffsetX: number;
        private moveOffsetY: number;
        readonly returnPaths: ReturnPath[];
        drawText: boolean;
        dragging: boolean;
        valid: boolean;
        connectors: ParameterDisplay[];
        regions: Region[];
        bodyRegion: Region;
        private collisionRegion: Region;

        constructor(readonly uniqueID: number, readonly process: Process, readonly parentProcess: UserProcess, x: number, y: number) {
            this.x = x === undefined ? 100 : x;
            this.y = y === undefined ? 100 : y;
            this.returnPaths = [];
            this.drawText = this.dragging = false;

            this.inputs = this.copyParameters(this.getInputSource());
            this.outputs = this.copyParameters(this.getOutputSource());
            this.createRegions();
        }
        protected createRegions() {
            this.connectors = [];
            this.regions = [];

            this.bodyRegion = new Region(
                this.defineBodyRegion.bind(this),
                this.drawBody.bind(this),
                'move'
            );
            this.bodyRegion.mousedown = this.bodyRegionMouseDown.bind(this);
            this.bodyRegion.mouseup = this.bodyRegionMouseUp.bind(this);
            this.bodyRegion.hover = this.bodyRegionHover.bind(this);
            this.bodyRegion.move = this.bodyRegionMove.bind(this);
            this.bodyRegion.unhover = this.bodyRegionUnhover.bind(this);
        
            this.regions.push(this.bodyRegion);

            // twice the normal radius, so that another step can't overlap this one
            this.collisionRegion = new Region(
                this.defineCollisionRegion.bind(this)
            );

            this.createConnectors(this.inputs, true);
            this.createConnectors(this.outputs, false);
        }
        private bodyRegionMouseDown(x: number, y: number) {
            this.dragging = true;
            this.moveOffsetX = this.x - x;
            this.moveOffsetY = this.y - y;
            return true;
        }
        protected bodyRegionMouseUp(x: number, y: number) {
            this.dragging = false;
            this.parentProcess.workspace.processEditor.stepMouseUp(x, y, this);
            return true;
        }
        private bodyRegionHover() {
            this.drawText = true; return true;
        }
        private bodyRegionMove(x, y) {
            if (!this.dragging)
                return false;

            // test for collisions
            let steps = this.parentProcess.steps;
            let ctx = this.parentProcess.workspace.processEditor.getContext();

            for (let i = 0; i < steps.length; i++) {
                if (steps[i] === this)
                    continue;

                if (steps[i].collisionRegion.containsPoint(ctx, x + this.moveOffsetX, y + this.moveOffsetY))
                    return;
            }

            this.x = x + this.moveOffsetX;
            this.y = y + this.moveOffsetY;
            return true;
        }
        private bodyRegionUnhover() {
            if (!this.dragging)
                this.drawText = false;

            return true;
        }
        protected setFont(ctx: CanvasRenderingContext2D) {
            ctx.font = '16px sans-serif';
        }
        protected drawBody(ctx: CanvasRenderingContext2D) {
            this.setFont(ctx);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.strokeStyle = this.valid ? '#000' : '#a00';
            ctx.fillStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            this.defineRegion(ctx, 1);
            ctx.fill();
            ctx.stroke();

            this.writeText(ctx);
        }
        protected abstract writeText(ctx: CanvasRenderingContext2D);
        private defineBodyRegion(ctx: CanvasRenderingContext2D) {
            this.defineRegion(ctx, 1);
        }
        private defineCollisionRegion(ctx: CanvasRenderingContext2D) {
            this.defineRegion(ctx, 2);
        }
        protected abstract defineRegion(ctx: CanvasRenderingContext2D, scale: number);
        protected abstract getInputSource(): Parameter[];
        protected abstract getOutputSource(): Parameter[];
        private copyParameters(sourceParams: Parameter[]) {
            if (sourceParams === null)
                return null;
            let params: Parameter[] = [];
            
            for (let sourceParam of sourceParams)
                params.push(new Parameter(sourceParam.name, sourceParam.type));
    
            return params;
        }
        private createConnectors(params: Parameter[], input: boolean) {
            if (params === null)
                return;
            let angularSpread;
            switch (params.length) {
                case 0: return;
                case 1: angularSpread = 0; break;
                case 2: angularSpread = 60; break;
                case 3: angularSpread = 90; break;
                case 4: angularSpread = 110; break;
                case 5: angularSpread = 120; break;
                case 6: angularSpread = 130; break;
                default: angularSpread = 140; break;
            }
            angularSpread *= Math.PI / 180;
        
            let centerAngle = input ? Math.PI : 0;
        
            let stepSize = params.length == 1 ? 0 : angularSpread / (params.length - 1);
            let currentAngle = input ? centerAngle + angularSpread / 2 : centerAngle - angularSpread / 2;
            if (input)
                stepSize = -stepSize;
                
            for (let param of params) {
                let connector = new ParameterDisplay(this, currentAngle, param, input);
                this.connectors.push(connector);
                this.regions.push(connector.region);
                currentAngle += stepSize;
            }
        }
        createDanglingReturnPaths() { }
        validate() {
            this.valid = false;

            for (let path of this.returnPaths)
                if (!path.isConnected())
                    return false;

            let inputs = this.inputs;
            if (inputs !== null)
                for (let input of inputs)
                    if (input.initialValue === null && input.link === null)
                        return false;
            
            let outputs = this.outputs;
            if (outputs !== null)
                for (let output of outputs)
                    if (output.link === null)
                        return false;

            this.valid = true;
            return true;
        }
        abstract getPerpendicular(angle: number): Orientation;
        processSignatureChanged() {
            this.handleProcessSignatureChanges();
            this.createRegions();
            this.validate();
        };
        protected handleProcessSignatureChanges() {
            let sourceParams = this.getInputSource();
            if (sourceParams != null)
                this.updateParameters(sourceParams, true);

            sourceParams = this.getOutputSource();
            if (sourceParams!= null)
                this.updateParameters(sourceParams, false);
        }
        private updateParameters(sourceParams: Parameter[], isInput: boolean) {
            // update existing parameters, add new ones and remove superfluous ones
            let oldConnectors = this.connectors.slice();
            let actualParams = isInput ? this.inputs : this.outputs;

            for (let sourceParam of sourceParams) {
                let foundExact = false;
                for (let connector of this.connectors) {
                    if (connector.isInput !== isInput)
                        continue;
                    if (connector.param.name == sourceParam.name && connector.param.type === sourceParam.type) {
                        // forget about this one, it existed before and hasn't changed
                        foundExact = true;
                        let pos = oldConnectors.indexOf(connector);
                        oldConnectors.splice(pos, 1);
                        break;
                    }
                }

                if (foundExact)
                    continue;
                
                // this name / type is new, so recreate it
                actualParams.push(new Parameter(sourceParam.name, sourceParam.type));
            }

            // remove any parameters which aren't in the new set (cos they must have been removed)
            for (let oldConnector of oldConnectors) {
                if (oldConnector.isInput !== isInput)
                    continue;

                let oldParam = oldConnector.param;
                let pos = actualParams.indexOf(oldParam);
                if (pos != -1)
                    actualParams.splice(pos, 1);

                // also unlink old param from any variables
                if (oldParam.link !== null) {
                    pos = oldParam.link.links.indexOf(oldParam);
                    if (pos != -1)
                        oldParam.link.links.splice(pos, 1);
                }
            }
        }
    }
}