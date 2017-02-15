﻿namespace Cursive {
    export class Step {
        x: number;
        y: number;
        readonly returnPaths: ReturnPath[];
        readonly radius: number;
        drawText: boolean;
        private dragging: boolean;
        private connectors: Connector[];
        regions: Region[];
        private bodyRegion: Region;
        private collisionRegion: Region;

        constructor(readonly process: Process, readonly parentProcess: Process, x: number, y: number) {
            this.x = x;
            this.y = y;
            this.returnPaths = [];
            this.radius = 45;
            this.drawText = this.dragging = false;
            this.createRegions();
        }
        protected createRegions() {
            this.connectors = [];
            this.regions = [];

            this.bodyRegion = this.createBodyRegion();
        
            this.bodyRegion.mousedown = function (x,y) {
                this.dragging = true;
                this.moveOffsetX = this.x - x;
                this.moveOffsetY = this.y - y;
                return true;
            }.bind(this);
        
            this.bodyRegion.mouseup = function (x,y) {
                this.dragging = false;
                return true;
            }.bind(this);
        
            this.bodyRegion.hover = function () {
                this.drawText = true; return true;
            }.bind(this);
        
            this.bodyRegion.move = function (x,y) {
                if (!this.dragging)
                    return false;
            
                // test for collisions
                let steps = this.parentProcess.steps;
                let ctx = this.parentProcess.editor.canvas.getContext('2d');

                for (let i=0; i<steps.length; i++) {
                    if (steps[i] === this)
                        continue;
                
                    if (steps[i].collisionRegion.containsPoint(ctx, x + this.moveOffsetX, y + this.moveOffsetY))
                        return;
                }
            
                this.x = x + this.moveOffsetX;
                this.y = y + this.moveOffsetY;
                return true;
            }.bind(this);
        
            this.bodyRegion.unhover = function (x, y) {
                if (!this.dragging)
                    this.drawText = false;
            
                return true;
            }.bind(this);
        
            this.regions.push(this.bodyRegion);
        
            this.collisionRegion = this.createCollisionRegion();
            this.createConnectors(this.getInputs(), true);
            this.createConnectors(this.getOutputs(), false);
        }
        protected drawBody(ctx) {
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            this.bodyRegion.define(ctx);
            ctx.fill();
            ctx.stroke();

            this.writeText(ctx);
        }
        protected writeText(ctx) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000';
            ctx.fillText(this.process.name, this.x, this.y);
        }
        protected createBodyRegion() {
            return new Region(
                function (ctx) { ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI); }.bind(this),
                this.drawBody.bind(this),
                'move'
            )
        }
        protected createCollisionRegion() {
            return new Region( // twice the normal radius, so that another step can't overlap this one
                function (ctx) { ctx.arc(this.x, this.y, this.radius * 2, 0, 2 * Math.PI); }.bind(this)
            )
        }
        protected getInputs() {
            return this.process.inputs;
        }
        protected getOutputs() {
            return this.process.outputs;
        }
        private createConnectors(params, input) {
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
                
            for (let i=0; i<params.length; i++) {
                let connector = new Connector(this, currentAngle, params[i], input);
                this.connectors.push(connector);
                this.regions.push(connector.region);
                currentAngle += stepSize;
            }
        }
        createDanglingReturnPaths() {
            let distance = 150;
            if (this.process.returnPaths.length == 0) {
                let returnPath = new ReturnPath(this, null, null, 0, distance);
                returnPath.onlyPath = true;
                this.returnPaths.push(returnPath);
            }
            else {
                let centerAngle = 7 * Math.PI / 16;
                let targetSeparation = 3 * Math.PI / 16;
                let maxSpread = 5 * Math.PI / 8;
                let numSteps = this.process.returnPaths.length - 1;
                let totalSpread = Math.min(maxSpread, numSteps * targetSeparation);

                let currentAngle = centerAngle - totalSpread / 2;
                let angularIncrement = totalSpread / numSteps;

                for (let path of this.process.returnPaths) {
                    let xOffset = distance * Math.cos(currentAngle);
                    let yOffset = distance * Math.sin(currentAngle);
                    currentAngle += angularIncrement;

                    let returnPath = new ReturnPath(this, null, path, xOffset, yOffset);
                    this.returnPaths.push(returnPath);
                }
            }
        }
    }

    export class StartStep extends Step {
        constructor(parentProcess: Process, x: number, y: number) {
            super(null, parentProcess, x, y);
        }
        protected writeText(ctx) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#0a0';
            ctx.fillText("Start", this.x - this.radius / 4, this.y);
        }
        protected createBodyRegion() {
            return new Region(
                function (ctx) {
                    ctx.moveTo(this.x - this.radius, this.y - this.radius * 0.75);
                    ctx.lineTo(this.x + this.radius, this.y);
                    ctx.lineTo(this.x - this.radius, this.y + this.radius * 0.75);
                    ctx.closePath();
                }.bind(this),
                this.drawBody.bind(this),
                'move'
            )
        }
        protected createCollisionRegion() {
            return new Region( // twice the normal radius, so that another step can't overlap this one
                function (ctx) {
                    ctx.moveTo(this.x - this.radius * 2, this.y - this.radius * 1.5);
                    ctx.lineTo(this.x + this.radius * 2, this.y);
                    ctx.lineTo(this.x - this.radius * 2, this.y + this.radius * 1.5);
                    ctx.closePath();
                }.bind(this)
            )
        }
        createDanglingReturnPaths() {
            let returnPath = new ReturnPath(this, null, null, 150, 0);
            returnPath.onlyPath = true;
            this.returnPaths.push(returnPath);
        }
        protected getInputs() { return null; }
        protected getOutputs() { return this.parentProcess.inputs; }
    }

    export class StopStep extends Step {
        returnPath: string;
        constructor(parentProcess: Process, returnPath: string, x: number, y: number) {
            super(null, parentProcess, x, y);
            this.returnPath = returnPath;
        }
        protected writeText(ctx) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#a00';
            ctx.fillText("Stop", this.x, this.y - this.radius / 4);
        }
        protected createBodyRegion() {
            return new Region(
                function (ctx) { ctx.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2); }.bind(this),
                this.drawBody.bind(this),
                'move'
            )
        }
        protected createCollisionRegion() {
            return new Region( // twice the normal radius, so that another step can't overlap this one
                function (ctx) { ctx.rect(this.x - this.radius * 2, this.y - this.radius * 2, this.radius * 4, this.radius * 4); }.bind(this)
            )
        }
        protected createRegions() {
            super.createRegions();

            let pathName = new Region(
                function (ctx) {
                    ctx.rect(this.x - this.radius, this.y + this.radius / 8, this.radius * 2, this.radius / 3);
                }.bind(this),
                function (ctx, isMouseOver, isMouseDown) {
                    
                    ctx.font = '16px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = '#000';

                    let displayName = this.returnPath == null ? '[no name]' : '"' + this.returnPath + '"';
                    this.parentProcess.editor.underlineText(ctx, displayName, this.x, this.y + this.radius / 2, isMouseOver);
                }.bind(this),
                'pointer'
            );
            pathName.click = function () {
                let content = 'Name a return path for this process, or leave blank to use none:<br/><input type="text" class="name" value="'
                content += this.returnPath == null ? '' : this.returnPath
                content += '" />';
                
                let action = function () {
                    let name = this.parentProcess.editor.popupContent.querySelector('.name').value.trim();
                    this.returnPath = name == '' ? null : name;
                }.bind(this);

                this.parentProcess.editor.workspace.showPopup(content, action);
            }.bind(this);
            pathName.hover = function () { return true; }
            pathName.unhover = function () { return true; }

            this.regions.unshift(pathName);
        }
        createDanglingReturnPaths() { }
        protected getInputs() { return this.parentProcess.outputs; }
        protected getOutputs() { return null; }
    }
}