namespace Cursive {
    export class StopStep extends Step {
        returnPath: string;
        constructor(parentProcess: UserProcess, returnPath: string, x: number, y: number) {
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
                    Drawing.underlineText(ctx, displayName, this.x, this.y + this.radius / 2, isMouseOver);
                }.bind(this),
                'pointer'
            );
            pathName.click = function () {
                let content = 'Name a return path for this process, or leave blank to use none:<br/><input type="text" class="name" value="'
                content += this.returnPath == null ? '' : this.returnPath
                content += '" />';
                
                let action = function () {
                    let name = this.parentProcess.workspace.editor.popupContent.querySelector('.name').value.trim();
                    this.returnPath = name == '' ? null : name;
                }.bind(this);

                this.parentProcess.workspace.editor.workspace.showPopup(content, action);
            }.bind(this);
            pathName.hover = function () { return true; }
            pathName.unhover = function () { return true; }

            this.regions.unshift(pathName);
        }
        createDanglingReturnPaths() { }
        getInputs() { return this.parentProcess.outputs; }
        getOutputs() { return null; }
    }
}