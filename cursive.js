var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Cursive;
(function (Cursive) {
    var Workspace = (function () {
        function Workspace(workspaceXml, processList, variableList, canvasWrapper) {
            Cursive.WorkspaceLoading.loadWorkspace(this, workspaceXml);
            canvasWrapper.classList.add('editorWrapper');
            var canvas = document.createElement('canvas');
            canvasWrapper.appendChild(canvas);
            var processEditRoot = document.createElement('div');
            processEditRoot.className = 'processSignatureEdit';
            canvasWrapper.appendChild(processEditRoot);
            var popupRoot = document.createElement('div');
            canvasWrapper.appendChild(popupRoot);
            var popup = new Cursive.EditorPopup(popupRoot);
            this.errorDisplay = new Cursive.ErrorDisplay(popup);
            this.processEditor = new Cursive.EditorCanvas(this, canvas);
            this.processListDisplay = new Cursive.ProcessListDisplay(this, processList);
            this.variableListDisplay = new Cursive.VariableListDisplay(this, variableList);
            this.variableEditor = new Cursive.VariableEdit(this, popup);
            this.parameterEditor = new Cursive.ParameterEdit(this, popup);
            this.returnPathEditor = new Cursive.ReturnPathEdit(this, popup);
            this.processSignatureEditor = new Cursive.ProcessSignatureEdit(this, processEditRoot);
            this.currentProcess = null;
        }
        Workspace.prototype.setDefinitions = function (types, systemProcesses, userProcesses) {
            this.types = types;
            this.systemProcesses = systemProcesses;
            this.userProcesses = userProcesses;
        };
        Workspace.prototype.loadProcesses = function (processXml) {
            Cursive.ProcessLoading.loadProcesses(this, processXml);
        };
        Workspace.prototype.saveProcesses = function () {
            if (!this.validate()) {
                this.showError('<h3>Unable to save workspace</h3>Some of your processes are not valid. Please ensure all inputs, outputs and return paths are connected.');
                return null;
            }
            return Cursive.ProcessSaving.saveProcesses(this.userProcesses);
        };
        Workspace.prototype.openProcess = function (process) {
            this.currentProcess = process;
            this.variableListDisplay.populateList();
            this.processEditor.loadProcess(process);
            this.variableListDisplay.show();
            this.processSignatureEditor.hide();
        };
        Workspace.prototype.validate = function () {
            var valid = true;
            for (var i = 0; i < this.userProcesses.count; i++) {
                var process = this.userProcesses.getByIndex(i);
                if (!process.validate())
                    valid = false;
            }
            this.processListDisplay.populateList();
            return valid;
        };
        Workspace.prototype.showError = function (message) {
            this.errorDisplay.showError(message);
            console.error(message);
        };
        Workspace.prototype.getScrollbarSize = function () {
            var outer = document.createElement('div');
            outer.style.visibility = 'hidden';
            outer.style.width = '100px';
            outer.style.height = '100px';
            outer.style.msOverflowStyle = 'scrollbar';
            document.body.appendChild(outer);
            var widthNoScroll = outer.offsetWidth;
            var heightNoScroll = outer.offsetHeight;
            outer.style.overflow = 'scroll';
            var inner = document.createElement('div');
            inner.style.width = '100%';
            inner.style.height = '100%';
            outer.appendChild(inner);
            var widthWithScroll = inner.offsetWidth;
            var heightWithScroll = inner.offsetHeight;
            outer.parentNode.removeChild(outer);
            return {
                width: widthNoScroll - widthWithScroll,
                height: heightNoScroll - heightWithScroll
            };
        };
        Workspace.prototype.showAddNewProcess = function () {
            this.processEditor.hide();
            this.variableListDisplay.hide();
            this.currentProcess = null;
            this.processSignatureEditor.showNew();
        };
        Workspace.prototype.ready = function () {
            if (this.userProcesses.count == 0)
                this.showAddNewProcess();
            else
                this.openProcess(this.userProcesses.getByIndex(0));
            this.processListDisplay.populateList();
        };
        Workspace.prototype.processSignatureChanged = function (process) {
            for (var _i = 0, _a = process.steps; _i < _a.length; _i++) {
                var step = _a[_i];
                if (step instanceof Cursive.StartStep || step instanceof Cursive.StopStep)
                    step.processSignatureChanged();
            }
            process.validate();
            for (var i = 0; i < this.userProcesses.count; i++) {
                var otherProcess = this.userProcesses.getByIndex(i);
                var changed = false;
                for (var _b = 0, _c = otherProcess.steps; _b < _c.length; _b++) {
                    var step = _c[_b];
                    if (step.process === process) {
                        step.processSignatureChanged();
                        changed = true;
                    }
                }
                if (changed)
                    otherProcess.validate();
            }
        };
        Workspace.prototype.processRemoved = function (process) {
            this.userProcesses.remove(process.name);
            for (var i = 0; i < this.userProcesses.count; i++) {
                var otherProcess = this.userProcesses.getByIndex(i);
                var changed = false;
                for (var _i = 0, _a = otherProcess.steps; _i < _a.length; _i++) {
                    var step = _a[_i];
                    if (step.process === process) {
                        otherProcess.removeStep(step);
                        changed = true;
                    }
                }
                if (changed)
                    otherProcess.validate();
            }
            this.ready();
        };
        return Workspace;
    }());
    Cursive.Workspace = Workspace;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var EditorCanvas = (function () {
        function EditorCanvas(workspace, canvas) {
            this.workspace = workspace;
            this.canvas = canvas;
            this.highlightVariable = null;
            this.mouseDownTime = null;
            this.prevMouseDownTime = null;
            this.setupUI();
        }
        EditorCanvas.prototype.loadProcess = function (process) {
            this.hoverRegion = null;
            this.currentProcess = process;
            this.show();
            this.draw();
        };
        EditorCanvas.prototype.updateSize = function () {
            var scrollSize = this.workspace.getScrollbarSize();
            var w = this.canvasWidth = this.canvas.parentElement.offsetWidth - scrollSize.width;
            var h = this.canvas.parentElement.offsetHeight - scrollSize.height;
            this.canvas.setAttribute('width', w.toString());
            this.canvas.setAttribute('height', h.toString());
            this.draw();
        };
        EditorCanvas.prototype.setupUI = function () {
            this.show();
            this.headerCutoff = 68;
            this.canvasWidth = 999;
            var addStopStep = new Cursive.Region(this.defineStopStepRegion.bind(this), this.drawStopStepRegion.bind(this), 'move');
            addStopStep.mousedown = this.stopStepRegionMouseDown.bind(this);
            this.deleteStepRegion = new Cursive.Region(this.defineDeleteStepRegion.bind(this), this.drawDeleteStepRegion.bind(this), 'not-allowed');
            this.fixedRegions = [addStopStep, this.deleteStepRegion];
            this.hoverRegion = null;
            this.mouseDownRegion = null;
            this.prevMouseDownRegion = null;
            this.canvas.addEventListener('dragover', this.canvasDragOver.bind(this));
            this.canvas.addEventListener('drop', this.canvasDrop.bind(this));
            this.canvas.addEventListener('mousedown', this.canvasMouseDown.bind(this));
            this.canvas.addEventListener('mouseup', this.canvasMouseUp.bind(this));
            this.canvas.addEventListener('mouseout', this.canvasMouseOut.bind(this));
            this.canvas.addEventListener('mousemove', this.canvasMouseMove.bind(this));
            this.canvas.addEventListener('touchstart', this.canvasTouchStart.bind(this));
            this.canvas.addEventListener('touchend', this.canvasTouchEnd.bind(this));
            this.canvas.addEventListener('touchcancel', this.canvasTouchCancel.bind(this));
            this.canvas.addEventListener('touchmove', this.canvasTouchMove.bind(this));
            window.addEventListener('resize', this.updateSize.bind(this));
            setTimeout(this.updateSize.bind(this), 0);
        };
        EditorCanvas.prototype.defineStopStepRegion = function (ctx) {
            ctx.rect(this.canvasWidth - 110, 10, 40, 40);
        };
        EditorCanvas.prototype.drawStopStepRegion = function (ctx, isMouseOver, isMouseDown) {
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(this.canvasWidth - 110, 10, 40, 40);
            ctx.fill();
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '32px sans-serif';
            ctx.fillStyle = isMouseDown ? '#000' : '#a00';
            ctx.fillText('+', this.canvasWidth - 90, 30);
        };
        EditorCanvas.prototype.stopStepRegionMouseDown = function (x, y) {
            var step = new Cursive.StopStep(this.currentProcess.getNextStepID(), this.currentProcess, null, this.canvasWidth - 90, 30);
            this.currentProcess.steps.push(step);
            step.dragging = true;
            this.mouseDownRegion = step.bodyRegion;
            step.bodyRegion.mousedown(x, y - 35);
            return false;
        };
        EditorCanvas.prototype.defineDeleteStepRegion = function (ctx) {
            ctx.rect(this.canvasWidth - 50, 10, 40, 40);
        };
        EditorCanvas.prototype.drawDeleteStepRegion = function (ctx, isMouseOver, isMouseDown) {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.canvasWidth - 50, 10);
            ctx.lineTo(this.canvasWidth - 45, 50);
            ctx.lineTo(this.canvasWidth - 20, 50);
            ctx.lineTo(this.canvasWidth - 15, 10);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#a00';
            ctx.fillText('bin', this.canvasWidth - 32.5, 30);
        };
        EditorCanvas.prototype.stepMouseUp = function (x, y, step) {
            var ctx = this.getContext();
            if (!this.deleteStepRegion.containsPoint(ctx, x, y))
                return;
            this.workspace.currentProcess.removeStep(step);
            this.processChanged();
            this.draw();
        };
        EditorCanvas.prototype.canvasDragOver = function (e) {
            if (this.currentProcess == null)
                return;
            e.preventDefault();
        };
        EditorCanvas.prototype.canvasDrop = function (e) {
            if (this.currentProcess == null)
                return;
            e.preventDefault();
            var process = e.dataTransfer.getData('process');
            var pos = this.getCanvasMouseCoords(e);
            this.dropProcess(process, pos.x, pos.y);
        };
        EditorCanvas.prototype.canvasMouseDown = function (e) {
            var pos = this.getCanvasMouseCoords(e);
            this.canvasInteractStart(pos);
        };
        EditorCanvas.prototype.canvasTouchStart = function (e) {
            var pos = this.getCanvasTouchCoords(e);
            this.canvasInteractStart(pos);
        };
        EditorCanvas.prototype.canvasInteractStart = function (pos) {
            this.prevMouseDownTime = this.mouseDownTime;
            this.mouseDownTime = new Date();
            var region = this.getRegion(pos.x, pos.y);
            this.mouseDownRegion = region;
            if (region != null && region.mousedown(pos.x, pos.y)) {
                this.processChanged();
                this.draw();
            }
        };
        EditorCanvas.prototype.canvasMouseUp = function (e) {
            var pos = this.getCanvasMouseCoords(e);
            this.canvasInteractEnd(pos);
        };
        EditorCanvas.prototype.canvasTouchEnd = function (e) {
            var pos = this.getCanvasTouchCoords(e);
            this.canvasInteractEnd(pos);
            e.preventDefault();
        };
        EditorCanvas.prototype.canvasInteractEnd = function (pos) {
            var region = this.getRegion(pos.x, pos.y);
            var draw = false;
            if (region != null) {
                draw = region.mouseup(pos.x, pos.y);
                if (region === this.mouseDownRegion) {
                    if (region.doubleClick !== null && region === this.prevMouseDownRegion && this.prevMouseDownTime !== null) {
                        var doubleClickCutoff = new Date();
                        doubleClickCutoff.setSeconds(doubleClickCutoff.getSeconds() - 1);
                        if (this.prevMouseDownTime >= doubleClickCutoff) {
                            draw = region.doubleClick() || draw;
                        }
                        else {
                            draw = region.click() || draw;
                        }
                    }
                    else {
                        draw = region.click() || draw;
                    }
                }
            }
            if (this.mouseDownRegion != null) {
                if (region !== this.mouseDownRegion)
                    draw = this.mouseDownRegion.mouseup(pos.x, pos.y) || draw;
                this.prevMouseDownRegion = this.mouseDownRegion;
                this.mouseDownRegion = null;
                draw = true;
            }
            if (draw) {
                this.processChanged();
                this.draw();
            }
        };
        EditorCanvas.prototype.canvasMouseOut = function (e) {
            var pos = this.getCanvasMouseCoords(e);
            this.canvasInteractExit(pos);
        };
        EditorCanvas.prototype.canvasTouchCancel = function (e) {
            var pos = this.getCanvasTouchCoords(e);
            this.canvasInteractExit(pos);
        };
        EditorCanvas.prototype.canvasInteractExit = function (pos) {
            if (this.hoverRegion != null) {
                var ctx = this.getContext();
                if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
                    var draw = this.hoverRegion.unhover();
                    this.hoverRegion = null;
                    this.canvas.style.cursor = '';
                    if (draw) {
                        this.processChanged();
                        this.draw();
                    }
                }
            }
        };
        EditorCanvas.prototype.canvasMouseMove = function (e) {
            if (this.currentProcess == null)
                return;
            var pos = this.getCanvasMouseCoords(e);
            this.canvasInteractMove(pos);
        };
        EditorCanvas.prototype.canvasTouchMove = function (e) {
            if (this.currentProcess == null)
                return;
            var pos = this.getCanvasTouchCoords(e);
            this.canvasInteractMove(pos);
        };
        EditorCanvas.prototype.canvasInteractMove = function (pos) {
            var ctx = this.getContext();
            var draw = false;
            if (this.hoverRegion != null) {
                if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
                    draw = this.hoverRegion.unhover();
                    this.hoverRegion = null;
                    this.canvas.style.cursor = '';
                }
            }
            var region = this.getRegion(pos.x, pos.y);
            if (region != null) {
                if (region != this.hoverRegion) {
                    draw = region.hover() || draw;
                    this.hoverRegion = region;
                    this.canvas.style.cursor = region.cursor;
                }
                else
                    draw = region.move(pos.x, pos.y) || draw;
            }
            if (this.mouseDownRegion != null && this.mouseDownRegion != region)
                draw = this.mouseDownRegion.move(pos.x, pos.y) || draw;
            if (draw) {
                this.draw();
            }
        };
        EditorCanvas.prototype.getContext = function () {
            return this.canvas.getContext('2d');
        };
        EditorCanvas.prototype.getCanvasMouseCoords = function (e) {
            var canvasPos = this.canvas.getBoundingClientRect();
            return new Cursive.Position(e.clientX - canvasPos.left, e.clientY - canvasPos.top);
        };
        EditorCanvas.prototype.getCanvasTouchCoords = function (e) {
            var canvasPos = this.canvas.getBoundingClientRect();
            var touch = e.changedTouches[0];
            return new Cursive.Position(touch.clientX - canvasPos.left, touch.clientY - canvasPos.top);
        };
        EditorCanvas.prototype.getRegion = function (x, y) {
            if (this.currentProcess == null)
                return null;
            var ctx = this.getContext();
            for (var _i = 0, _a = this.currentProcess.steps; _i < _a.length; _i++) {
                var step = _a[_i];
                for (var _b = 0, _c = step.regions; _b < _c.length; _b++) {
                    var region = _c[_b];
                    if (region.containsPoint(ctx, x, y))
                        return region;
                }
                for (var _d = 0, _e = step.returnPaths; _d < _e.length; _d++) {
                    var path = _e[_d];
                    for (var _f = 0, _g = path.regions; _f < _g.length; _f++) {
                        var region = _g[_f];
                        if (region.containsPoint(ctx, x, y))
                            return region;
                    }
                }
            }
            for (var _h = 0, _j = this.fixedRegions; _h < _j.length; _h++) {
                var region = _j[_h];
                if (region.containsPoint(ctx, x, y))
                    return region;
            }
            return null;
        };
        EditorCanvas.prototype.getStep = function (x, y) {
            var ctx = this.getContext();
            var steps = this.currentProcess.steps;
            for (var i = 0; i < steps.length; i++) {
                var regions = steps[i].regions;
                for (var j = 0; j < regions.length; j++) {
                    var region = regions[j];
                    if (region.containsPoint(ctx, x, y))
                        return steps[i];
                }
            }
            return null;
        };
        EditorCanvas.prototype.show = function () {
            this.canvas.style.removeProperty('display');
        };
        EditorCanvas.prototype.hide = function () {
            this.canvas.style.display = 'none';
        };
        EditorCanvas.prototype.dropProcess = function (name, x, y) {
            var process = this.workspace.systemProcesses.getByName(name);
            var isUserProcess;
            if (process === undefined) {
                process = this.workspace.userProcesses.getByName(name);
                isUserProcess = true;
            }
            else
                isUserProcess = false;
            if (process === undefined) {
                this.workspace.showError('Dropped unrecognised process: ' + name);
                return;
            }
            var step = new Cursive.ProcessStep(this.currentProcess.getNextStepID(), process, isUserProcess, this.currentProcess, x, y);
            step.createDanglingReturnPaths();
            this.currentProcess.steps.push(step);
            this.processChanged();
            this.draw();
        };
        EditorCanvas.prototype.draw = function () {
            if (this.currentProcess == null)
                return;
            var ctx = this.getContext();
            ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
            ctx.lineCap = 'round';
            var steps = this.currentProcess.steps, step;
            for (var i = steps.length - 1; i >= 0; i--) {
                step = steps[i];
                for (var j = 0; j < step.returnPaths.length; j++)
                    step.returnPaths[j].draw(ctx);
            }
            for (var i = steps.length - 1; i >= 0; i--) {
                step = steps[i];
                for (var j = step.regions.length - 1; j >= 0; j--)
                    step.regions[j].callDraw(ctx, this);
                var paths = step.returnPaths;
                for (var j = paths.length - 1; j >= 0; j--) {
                    var path = paths[j];
                    for (var k = 0; k < path.regions.length; k++)
                        path.regions[k].callDraw(ctx, this);
                }
            }
            for (var i = this.fixedRegions.length - 1; i >= 0; i--)
                this.fixedRegions[i].callDraw(ctx, this);
        };
        EditorCanvas.prototype.processChanged = function () {
            this.currentProcess.validate();
            this.workspace.processListDisplay.populateList();
        };
        EditorCanvas.prototype.highlightConnectors = function (variable) {
            this.highlightVariable = variable;
            this.draw();
        };
        return EditorCanvas;
    }());
    Cursive.EditorCanvas = EditorCanvas;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var WorkspaceLoading = (function () {
        function WorkspaceLoading() {
        }
        WorkspaceLoading.loadWorkspace = function (workspace, workspaceXml) {
            var systemProcesses = new Cursive.Dictionary();
            var userProcesses = new Cursive.Dictionary();
            var types = new Cursive.Dictionary();
            var typeNodes = workspaceXml.getElementsByTagName('Type');
            for (var i = 0; i < typeNodes.length; i++) {
                var type = this.loadType(typeNodes[i], workspace, types);
                if (types.contains(type.name)) {
                    workspace.showError('There are two types in the workspace with the same name: ' + type.name + '. Type names must be unique.');
                    continue;
                }
                types.add(type.name, type);
            }
            var procNodes = workspaceXml.getElementsByTagName('SystemProcess');
            for (var i = 0; i < procNodes.length; i++) {
                var process = this.loadProcessDefinition(workspace, procNodes[i], types, true);
                systemProcesses.add(process.name, process);
            }
            procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
            for (var i = 0; i < procNodes.length; i++) {
                var process = this.loadProcessDefinition(workspace, procNodes[i], types, false);
                userProcesses.add(process.name, process);
            }
            workspace.setDefinitions(types, systemProcesses, userProcesses);
        };
        WorkspaceLoading.loadType = function (typeNode, workspace, types) {
            var name = typeNode.getAttribute('name');
            var color = typeNode.getAttribute('color');
            var validationExpression;
            if (typeNode.hasAttribute('validation')) {
                var validation = typeNode.getAttribute('validation');
                validationExpression = new RegExp(validation);
            }
            else
                validationExpression = null;
            var extendsType;
            if (typeNode.hasAttribute('extends')) {
                var extendsName = typeNode.getAttribute('extends');
                if (types.contains(extendsName))
                    extendsType = types.getByName(extendsName);
                else {
                    extendsType = null;
                    workspace.showError('Type ' + name + ' extends a type which has not been defined: ' + extendsName + '.');
                }
            }
            else
                extendsType = null;
            var guidance;
            if (typeNode.hasAttribute('guidance')) {
                guidance = typeNode.getAttribute('guidance');
            }
            return new Cursive.Type(name, color, extendsType, validationExpression, guidance);
        };
        WorkspaceLoading.loadProcessDefinition = function (workspace, procNode, types, isSystemProcess) {
            var processName = procNode.getAttribute('name');
            var inputs = [];
            var outputs = [];
            var returnPaths = [];
            var procTypeName = isSystemProcess ? 'system' : 'fixed';
            var folder = procNode.hasAttribute('folder') ? procNode.getAttribute('folder') : null;
            var descNodes = procNode.getElementsByTagName('Description');
            var description = descNodes.length > 0 ? descNodes[0].innerHTML : '';
            var paramNodes = procNode.getElementsByTagName('Input');
            this.loadParameters(workspace, processName, types, paramNodes, inputs, 'input', procTypeName);
            paramNodes = procNode.getElementsByTagName('Output');
            this.loadParameters(workspace, processName, types, paramNodes, outputs, 'output', procTypeName);
            var returnPathNodes = procNode.getElementsByTagName('ReturnPath');
            var usedNames = {};
            for (var i = 0; i < returnPathNodes.length; i++) {
                var path = returnPathNodes[i].getAttribute('name');
                if (usedNames.hasOwnProperty(path))
                    workspace.showError('The \'' + processName + '\' ' + procTypeName + ' process has two return paths with the same name: ' + processName + '. Return path names must be unique within a process.');
                else {
                    usedNames[path] = null;
                    returnPaths.push(path);
                }
            }
            var process;
            if (isSystemProcess)
                process = new Cursive.SystemProcess(processName, inputs, outputs, returnPaths, description, folder);
            else {
                process = new Cursive.UserProcess(processName, inputs, outputs, [], returnPaths, true, description, folder);
                process.createDefaultSteps();
            }
            process.workspace = workspace;
            return process;
        };
        WorkspaceLoading.loadParameters = function (workspace, processName, types, paramNodes, parameters, inputOrOutput, procTypeName) {
            var usedNames = {};
            for (var i = 0; i < paramNodes.length; i++) {
                var paramName = paramNodes[i].getAttribute('name');
                var paramTypeName = paramNodes[i].getAttribute('type');
                var paramType = void 0;
                if (types.contains(paramTypeName))
                    paramType = types.getByName(paramTypeName);
                else {
                    workspace.showError('The \'' + processName + '\' ' + procTypeName + ' process has an ' + inputOrOutput + ' (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
                    paramType = null;
                }
                if (usedNames.hasOwnProperty(paramName))
                    workspace.showError('The \'' + processName + '\' ' + procTypeName + ' process has two ' + inputOrOutput + 's with the same name: ' + paramName + '. The names of ' + paramTypeName + 's must be unique within a process.');
                else {
                    usedNames[paramName] = null;
                    parameters.push(new Cursive.Parameter(paramName, paramType));
                }
            }
        };
        return WorkspaceLoading;
    }());
    Cursive.WorkspaceLoading = WorkspaceLoading;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ProcessLoading = (function () {
        function ProcessLoading() {
        }
        ProcessLoading.loadProcesses = function (workspace, processXml) {
            var processNodes = processXml.getElementsByTagName('Process');
            var userProcesses = workspace.userProcesses;
            var systemProcesses = workspace.systemProcesses;
            for (var i = 0; i < processNodes.length; i++) {
                var process = this.loadProcessDefinition(workspace, processNodes[i]);
                var existing = userProcesses.getByName(process.name);
                if (existing !== undefined) {
                    if (existing.fixedSignature) {
                        existing.variables = process.variables;
                        existing.folder = process.folder;
                        existing.description = process.description;
                    }
                    else
                        workspace.showError('There are two user processes with the same name: ' + name + '. Process names must be unique.');
                    continue;
                }
                if (systemProcesses.contains(process.name)) {
                    workspace.showError('A user process has the same name as a system processes: ' + name + '. Process names must be unique.');
                    continue;
                }
                process.workspace = workspace;
                userProcesses.add(process.name, process);
            }
            for (var i = 0; i < processNodes.length; i++) {
                this.loadProcessSteps(workspace, processNodes[i], userProcesses, systemProcesses);
            }
            workspace.validate();
        };
        ProcessLoading.loadProcessDefinition = function (workspace, processNode) {
            var processName = processNode.getAttribute('name');
            var folder = processNode.hasAttribute('folder') ? processNode.getAttribute('folder') : null;
            var descNodes = processNode.getElementsByTagName('Description');
            var description = descNodes.length > 0 ? descNodes[0].innerHTML : '';
            var inputs = [];
            var paramNodes = processNode.getElementsByTagName('Input');
            this.loadProcessParameters(workspace, paramNodes, inputs, 'input');
            var outputs = [];
            paramNodes = processNode.getElementsByTagName('Output');
            this.loadProcessParameters(workspace, paramNodes, outputs, 'output');
            var variables = [];
            paramNodes = processNode.getElementsByTagName('Variable');
            this.loadProcessParameters(workspace, paramNodes, variables, 'variable');
            var returnPaths = [];
            var usedNames = {};
            paramNodes = processNode.getElementsByTagName('ReturnPath');
            for (var i = 0; i < paramNodes.length; i++) {
                var paramNode = paramNodes[i];
                if (paramNode.parentElement !== processNode)
                    continue;
                var returnPathName = paramNode.getAttribute('name');
                if (returnPathName !== '' && !usedNames.hasOwnProperty(returnPathName))
                    returnPaths.push(returnPathName);
            }
            return new Cursive.UserProcess(processName, inputs, outputs, variables, returnPaths, false, description, folder);
        };
        ProcessLoading.loadProcessParameters = function (workspace, paramNodes, dataFields, paramTypeName) {
            for (var i = 0; i < paramNodes.length; i++) {
                var node = paramNodes[i];
                var paramName = node.getAttribute('name');
                var typeName = node.getAttribute('type');
                var dataType = workspace.types.getByName(typeName);
                if (dataType === null) {
                    workspace.showError('The ' + paramName + ' ' + paramTypeName + ' has an invalid type: ' + name + '. That type doesn\'t exist in this workspace.');
                    continue;
                }
                var dataField = void 0;
                if (paramTypeName == 'variable')
                    dataField = new Cursive.Variable(paramName, dataType);
                else
                    dataField = new Cursive.Parameter(paramName, dataType);
                if (node.hasAttribute('initialValue')) {
                    var initial = node.getAttribute('initialValue');
                    dataField.initialValue = initial;
                }
                dataFields.push(dataField);
            }
        };
        ProcessLoading.loadProcessSteps = function (workspace, processNode, userProcesses, systemProcesses) {
            var name = processNode.getAttribute('name');
            if (!userProcesses.contains(name))
                return;
            var process = userProcesses.getByName(name);
            process.steps = [];
            var stepsByID = {};
            var returnPathsToProcess = [];
            var startNodes = processNode.getElementsByTagName('Start');
            for (var i = 0; i < startNodes.length; i++) {
                var stepNode = startNodes[i];
                var id = parseInt(stepNode.getAttribute('ID'));
                var x = parseInt(stepNode.getAttribute('x'));
                var y = parseInt(stepNode.getAttribute('y'));
                process.noteUsedStepID(id);
                var step = new Cursive.StartStep(id, process, x, y);
                this.loadStepOutputs(workspace, process, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }
            var stopNodes = processNode.getElementsByTagName('Stop');
            for (var i = 0; i < stopNodes.length; i++) {
                var stepNode = stopNodes[i];
                var id = parseInt(stepNode.getAttribute('ID'));
                var x = parseInt(stepNode.getAttribute('x'));
                var y = parseInt(stepNode.getAttribute('y'));
                var returnPath = void 0;
                if (stepNode.hasAttribute('name')) {
                    returnPath = stepNode.getAttribute('name');
                    if (process.returnPaths.indexOf(returnPath) == -1) {
                        workspace.showError('Step ' + id + ' of the "' + process.name + '" process uses an unspecified return path name: ' + name + '. That name isn\'t a return path on this process.');
                    }
                }
                else {
                    returnPath = null;
                    if (process.returnPaths.length > 0) {
                        workspace.showError('Step ' + id + ' of the "' + process.name + '" process has no return path name. This process uses named return paths, so a name is required.');
                    }
                }
                process.noteUsedStepID(id);
                var step = new Cursive.StopStep(id, process, returnPath, x, y);
                this.loadStepInputs(workspace, process, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }
            var stepNodes = processNode.getElementsByTagName('Step');
            for (var i = 0; i < stepNodes.length; i++) {
                var stepNode = stepNodes[i];
                var id = parseInt(stepNode.getAttribute('ID'));
                var x = parseInt(stepNode.getAttribute('x'));
                var y = parseInt(stepNode.getAttribute('y'));
                var childProcess = void 0;
                var childProcessName = stepNode.getAttribute('process');
                var isUserProcess = void 0;
                if (systemProcesses.contains(childProcessName)) {
                    childProcess = systemProcesses.getByName(childProcessName);
                    isUserProcess = false;
                }
                else if (userProcesses.contains(childProcessName)) {
                    childProcess = userProcesses.getByName(childProcessName);
                    isUserProcess = true;
                }
                else {
                    workspace.showError('Step ' + id + ' of the "' + process.name + '" process wraps an unknown process: ' + name + '. That process doesn\'t exist in this workspace.');
                    continue;
                }
                process.noteUsedStepID(id);
                var step = new Cursive.ProcessStep(id, childProcess, isUserProcess, process, x, y);
                this.loadStepInputs(workspace, process, step, stepNode);
                this.loadStepOutputs(workspace, process, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }
            for (var _i = 0, returnPathsToProcess_1 = returnPathsToProcess; _i < returnPathsToProcess_1.length; _i++) {
                var step = returnPathsToProcess_1[_i];
                this.loadReturnPaths(workspace, step[0], step[1], stepsByID);
            }
        };
        ProcessLoading.loadStepInputs = function (workspace, process, step, stepNode) {
            var inputNodes = stepNode.getElementsByTagName('MapInput');
            var inputs = step.inputs;
            for (var i = 0; i < inputNodes.length; i++) {
                var mapNode = inputNodes[i];
                var paramName = mapNode.getAttribute('name');
                var sourceName = mapNode.getAttribute('source');
                var parameter = this.getNamed(inputs, paramName);
                var source = this.getNamed(process.variables, sourceName);
                if (parameter === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map a non-existant output: ' + paramName);
                    continue;
                }
                if (source === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map an input from a non-existant variable: ' + sourceName);
                    continue;
                }
                parameter.link = source;
                source.links.push(parameter);
            }
            inputNodes = stepNode.getElementsByTagName('FixedInput');
            for (var i = 0; i < inputNodes.length; i++) {
                var mapNode = inputNodes[i];
                var paramName = mapNode.getAttribute('name');
                var value = mapNode.getAttribute('value');
                var parameter = this.getNamed(inputs, paramName);
                if (parameter === null)
                    continue;
                if (!parameter.type.isValid(value))
                    continue;
                parameter.initialValue = value;
            }
        };
        ProcessLoading.loadStepOutputs = function (workspace, process, step, stepNode) {
            var outputNodes = stepNode.getElementsByTagName('MapOutput');
            var outputs = step.outputs;
            for (var i = 0; i < outputNodes.length; i++) {
                var mapNode = outputNodes[i];
                var paramName = mapNode.getAttribute('name');
                var destinationName = mapNode.getAttribute('destination');
                var parameter = this.getNamed(outputs, paramName);
                var destination = this.getNamed(process.variables, destinationName);
                if (parameter === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map a non-existant output: ' + paramName);
                    continue;
                }
                if (destination === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map an output to a non-existant variable: ' + destinationName);
                    continue;
                }
                parameter.link = destination;
                destination.links.push(parameter);
            }
        };
        ProcessLoading.getNamed = function (options, name) {
            for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
                var option = options_1[_i];
                if (option.name == name)
                    return option;
            }
            return null;
        };
        ProcessLoading.loadReturnPaths = function (workspace, step, stepNode, stepsByID) {
            var returnPathNodes = stepNode.getElementsByTagName('ReturnPath');
            for (var i = 0; i < returnPathNodes.length; i++) {
                var returnPathNode = returnPathNodes[i];
                var targetStepID = returnPathNode.getAttribute('targetStepID');
                var targetStep = stepsByID[targetStepID];
                if (targetStep === undefined)
                    continue;
                var returnPath = new Cursive.ReturnPath(step, targetStep, null);
                returnPath.onlyPath = true;
                step.returnPaths.push(returnPath);
            }
            returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');
            for (var i = 0; i < returnPathNodes.length; i++) {
                var returnPathNode = returnPathNodes[i];
                var targetStepID = returnPathNode.getAttribute('targetStepID');
                var targetStep = stepsByID[targetStepID];
                if (targetStep === undefined)
                    continue;
                var name_1 = returnPathNode.getAttribute('name');
                var returnPath = new Cursive.ReturnPath(step, targetStep, name_1);
                returnPath.onlyPath = false;
                step.returnPaths.push(returnPath);
            }
        };
        return ProcessLoading;
    }());
    Cursive.ProcessLoading = ProcessLoading;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ProcessSaving = (function () {
        function ProcessSaving() {
        }
        ProcessSaving.saveProcesses = function (processes) {
            var saveDoc = document.implementation.createDocument(null, 'processes', null);
            var rootNode = saveDoc.createElement('Processes');
            for (var i = 0; i < processes.count; i++) {
                this.saveProcess(processes.getByIndex(i), rootNode);
            }
            return rootNode.outerHTML;
        };
        ProcessSaving.saveProcess = function (process, parent) {
            var element = parent.ownerDocument.createElement('Process');
            parent.appendChild(element);
            element.setAttribute('name', process.name);
            if (process.folder !== null)
                element.setAttribute('folder', process.folder);
            if (process.description !== null && process.description !== '') {
                var desc = parent.ownerDocument.createElement('Description');
                desc.innerHTML = process.description;
                element.appendChild(desc);
            }
            for (var _i = 0, _a = process.inputs; _i < _a.length; _i++) {
                var parameter = _a[_i];
                this.saveProcessParameter(parameter, element, 'Input');
            }
            for (var _b = 0, _c = process.outputs; _b < _c.length; _b++) {
                var parameter = _c[_b];
                this.saveProcessParameter(parameter, element, 'Output');
            }
            for (var _d = 0, _e = process.variables; _d < _e.length; _d++) {
                var variable = _e[_d];
                var varElement = this.saveProcessParameter(variable, element, 'Variable');
            }
            for (var _f = 0, _g = process.returnPaths; _f < _g.length; _f++) {
                var returnPath = _g[_f];
                this.saveProcessReturnPath(returnPath, element);
            }
            var steps = parent.ownerDocument.createElement('Steps');
            element.appendChild(steps);
            for (var _h = 0, _j = process.steps; _h < _j.length; _h++) {
                var step = _j[_h];
                this.saveStep(step, steps);
            }
        };
        ProcessSaving.saveStep = function (step, parent) {
            var element;
            if (step instanceof Cursive.StartStep)
                element = parent.ownerDocument.createElement('Start');
            else if (step instanceof Cursive.StopStep) {
                element = parent.ownerDocument.createElement('Stop');
                var returnPath = step.returnPath;
                if (returnPath !== null)
                    element.setAttribute('name', returnPath);
            }
            else {
                element = parent.ownerDocument.createElement('Step');
                element.setAttribute('process', step.process.name);
            }
            parent.appendChild(element);
            element.setAttribute('ID', step.uniqueID.toString());
            element.setAttribute('x', step.x.toString());
            element.setAttribute('y', step.y.toString());
            this.saveStepParameters(step.inputs, element, 'MapInput', 'source');
            this.saveStepParameters(step.outputs, element, 'MapOutput', 'destination');
            for (var _i = 0, _a = step.returnPaths; _i < _a.length; _i++) {
                var path = _a[_i];
                var pathElement = void 0;
                if (path.name !== null) {
                    pathElement = parent.ownerDocument.createElement('NamedReturnPath');
                    pathElement.setAttribute('name', path.name);
                }
                else
                    pathElement = parent.ownerDocument.createElement('ReturnPath');
                pathElement.setAttribute('targetStepID', path.toStep.uniqueID.toString());
                element.appendChild(pathElement);
            }
        };
        ProcessSaving.saveStepParameters = function (parameters, parent, nodeName, variableAttributeName) {
            if (parameters === null)
                return;
            for (var _i = 0, parameters_1 = parameters; _i < parameters_1.length; _i++) {
                var parameter = parameters_1[_i];
                this.saveStepParameter(parameter, parent, nodeName, variableAttributeName);
            }
        };
        ProcessSaving.saveStepParameter = function (parameter, parent, nodeName, variableAttributeName) {
            var element = parent.ownerDocument.createElement(parameter.initialValue === null ? nodeName : 'FixedInput');
            element.setAttribute('name', parameter.name);
            parent.appendChild(element);
            if (parameter.initialValue !== null)
                element.setAttribute('value', parameter.initialValue);
            else if (parameter.link != null)
                element.setAttribute(variableAttributeName, parameter.link.name);
        };
        ProcessSaving.saveProcessParameter = function (parameter, parent, nodeName) {
            var element = parent.ownerDocument.createElement(nodeName);
            element.setAttribute('name', parameter.name);
            element.setAttribute('type', parameter.type.name);
            parent.appendChild(element);
            return element;
        };
        ProcessSaving.saveProcessReturnPath = function (returnPath, parent) {
            var element = parent.ownerDocument.createElement('ReturnPath');
            element.setAttribute('name', returnPath);
            parent.appendChild(element);
        };
        return ProcessSaving;
    }());
    Cursive.ProcessSaving = ProcessSaving;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ProcessListDisplay = (function () {
        function ProcessListDisplay(workspace, processList) {
            this.workspace = workspace;
            this.listElement = processList;
            this.populateList();
        }
        ProcessListDisplay.prototype.populateList = function () {
            this.listElement.innerHTML = '';
            this.folderElements = {};
            this.activeProcessItem = null;
            this.createAddNewProcessItem();
            var userProcs = this.workspace.userProcesses;
            for (var i = 0; i < userProcs.count; i++) {
                var proc = userProcs.getByIndex(i);
                this.createProcessItem(proc, true, proc.fixedSignature, proc.isValid);
            }
            var sysProcs = this.workspace.systemProcesses;
            for (var i = 0; i < sysProcs.count; i++) {
                var proc = sysProcs.getByIndex(i);
                this.createProcessItem(proc, false, true, true);
            }
        };
        ProcessListDisplay.prototype.getFolderElement = function (proc) {
            if (proc.folder === null)
                return this.listElement;
            var folderName = proc.folder;
            if (this.folderElements.hasOwnProperty(folderName)) {
                return this.folderElements[folderName];
            }
            else {
                var wrapperItem = document.createElement('li');
                wrapperItem.className = 'folder';
                wrapperItem.setAttribute('data-name', folderName);
                this.listElement.appendChild(wrapperItem);
                var folderList = document.createElement('ul');
                wrapperItem.appendChild(folderList);
                this.folderElements[folderName] = folderList;
                return folderList;
            }
        };
        ProcessListDisplay.prototype.dragStart = function (e) {
            e.dataTransfer.setData('process', e.target.getAttribute('data-process'));
        };
        ProcessListDisplay.prototype.createAddNewProcessItem = function () {
            var item = document.createElement('li');
            item.classList.add('addNew');
            if (this.workspace.currentProcess === null) {
                item.classList.add('active');
                this.activeProcessItem = item;
            }
            item.innerText = 'add new process';
            this.listElement.appendChild(item);
            item.addEventListener('click', this.addNewProcessClicked.bind(this, item));
        };
        ProcessListDisplay.prototype.addNewProcessClicked = function (item) {
            this.activeItemChanged(item);
            this.workspace.showAddNewProcess();
        };
        ProcessListDisplay.prototype.createProcessItem = function (process, openable, fixedSignature, valid) {
            var item = document.createElement('li');
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-process', process.name);
            this.getFolderElement(process).appendChild(item);
            if (!openable)
                item.classList.add('cantOpen');
            else if (fixedSignature)
                item.classList.add('fixed');
            if (!valid)
                item.classList.add('invalid');
            if (process === this.workspace.currentProcess) {
                this.activeProcessItem = item;
                item.classList.add('active');
            }
            var element = document.createElement('div');
            element.className = 'name';
            element.innerText = process.name;
            item.appendChild(element);
            if (process.inputs.length > 0) {
                element = document.createElement('div');
                element.className = 'props inputs';
                item.appendChild(element);
                this.writeItemFields(process.inputs, element);
            }
            if (process.outputs.length > 0) {
                element = document.createElement('div');
                element.className = 'props outputs';
                item.appendChild(element);
                this.writeItemFields(process.outputs, element);
            }
            if (process.returnPaths.length > 0) {
                element = document.createElement('div');
                element.className = 'props returnPaths';
                item.appendChild(element);
                for (var _i = 0, _a = process.returnPaths; _i < _a.length; _i++) {
                    var returnPath = _a[_i];
                    var prop = document.createElement('span');
                    prop.className = 'prop';
                    prop.innerText = returnPath;
                    element.appendChild(prop);
                }
            }
            element = document.createElement('div');
            element.className = 'description';
            element.innerText = process.description;
            item.appendChild(element);
            item.addEventListener('dragstart', this.dragStart.bind(this));
            if (openable)
                item.addEventListener('click', this.openUserProcess.bind(this, item));
            item.addEventListener('mouseover', this.itemHovered.bind(this, item));
            item.addEventListener('mouseleave', this.itemUnhovered.bind(this, item));
        };
        ProcessListDisplay.prototype.writeItemFields = function (variables, parent) {
            for (var _i = 0, variables_1 = variables; _i < variables_1.length; _i++) {
                var variable = variables_1[_i];
                var prop = document.createElement('span');
                prop.className = 'prop';
                prop.style.color = variable.type.color;
                prop.innerText = variable.name;
                parent.appendChild(prop);
            }
        };
        ProcessListDisplay.prototype.openUserProcess = function (item, e) {
            this.activeItemChanged(item);
            var name = item.getAttribute('data-process');
            var process = this.workspace.userProcesses.getByName(name);
            if (process === undefined) {
                this.workspace.showError('Clicked unrecognised process: ' + name);
                return;
            }
            this.workspace.openProcess(process);
        };
        ProcessListDisplay.prototype.activeItemChanged = function (item) {
            if (this.activeProcessItem !== null)
                this.activeProcessItem.classList.remove('active');
            this.activeProcessItem = item;
            item.classList.add('active');
        };
        ProcessListDisplay.prototype.itemHovered = function (item) {
            item.classList.add('hover');
            window.setTimeout(this.toggleItem.bind(this, item), 500);
        };
        ProcessListDisplay.prototype.toggleItem = function (item) {
            item.classList.toggle('details', item.classList.contains('hover'));
        };
        ProcessListDisplay.prototype.itemUnhovered = function (item) {
            item.classList.remove('hover');
            window.setTimeout(this.toggleItem.bind(this, item), 500);
        };
        return ProcessListDisplay;
    }());
    Cursive.ProcessListDisplay = ProcessListDisplay;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var VariableListDisplay = (function () {
        function VariableListDisplay(workspace, variableList) {
            this.workspace = workspace;
            this.rootElement = variableList;
        }
        VariableListDisplay.prototype.populateList = function () {
            this.rootElement.innerHTML = '';
            if (this.workspace.currentProcess == null) {
                this.rootElement.removeAttribute('data-process-name');
                return;
            }
            this.rootElement.setAttribute('data-process-name', this.workspace.currentProcess.name);
            if (!this.workspace.currentProcess.fixedSignature)
                this.rootElement.appendChild(this.createEditProcessLink());
            this.rootElement.appendChild(this.createAddVariableLink());
            for (var _i = 0, _a = this.workspace.currentProcess.variables; _i < _a.length; _i++) {
                var variable = _a[_i];
                this.rootElement.appendChild(this.createVariableLink(variable));
            }
        };
        VariableListDisplay.prototype.createEditProcessLink = function () {
            var link = document.createElement('li');
            link.className = 'link editProcess';
            link.innerText = 'edit process';
            link.addEventListener("click", this.editProcessLinkClicked.bind(this));
            return link;
        };
        VariableListDisplay.prototype.createAddVariableLink = function () {
            var link = document.createElement('li');
            link.className = 'link addVariable';
            link.innerText = 'add new variable';
            link.addEventListener("click", this.addVariableLinkClicked.bind(this));
            return link;
        };
        VariableListDisplay.prototype.createVariableLink = function (variable) {
            var link = document.createElement('li');
            link.className = 'link variable';
            link.setAttribute('data-name', variable.name);
            link.setAttribute('data-type', variable.type.name);
            link.style.color = variable.type.color;
            link.innerText = variable.name;
            link.addEventListener("click", this.variableLinkClicked.bind(this, variable, link));
            link.addEventListener("mouseover", this.highlight.bind(this, variable, link));
            link.addEventListener("mouseout", this.highlight.bind(this, null, link));
            return link;
        };
        VariableListDisplay.prototype.editProcessLinkClicked = function () {
            if (this.workspace.currentProcess.fixedSignature)
                return;
            this.hide();
            this.workspace.processEditor.hide();
            this.workspace.processSignatureEditor.showExisting(this.workspace.currentProcess);
        };
        VariableListDisplay.prototype.addVariableLinkClicked = function () {
            this.workspace.variableEditor.showNew();
        };
        VariableListDisplay.prototype.variableLinkClicked = function (variable, link) {
            this.workspace.variableEditor.showExisting(variable);
        };
        VariableListDisplay.prototype.highlight = function (variable, hoverLink) {
            if (hoverLink === undefined) {
                var selector = void 0;
                if (variable === null)
                    selector = '.link.variable.highlight';
                else
                    selector = '.link.variable[data-name="' + variable.name + '"]';
                hoverLink = this.rootElement.querySelector(selector);
            }
            if (hoverLink != null) {
                if (variable === null) {
                    hoverLink.classList.remove('highlight');
                    hoverLink.style.textShadow = '';
                }
                else {
                    hoverLink.classList.add('highlight');
                    hoverLink.style.textShadow = '0 0 1px ' + hoverLink.style.color;
                }
            }
            this.workspace.processEditor.highlightConnectors(variable);
        };
        VariableListDisplay.prototype.show = function () {
            this.rootElement.style.removeProperty('display');
        };
        VariableListDisplay.prototype.hide = function () {
            this.rootElement.style.display = 'none';
        };
        return VariableListDisplay;
    }());
    Cursive.VariableListDisplay = VariableListDisplay;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Process = (function () {
        function Process(name, inputs, outputs, returnPaths, isEditable, description, folder) {
            this.name = name;
            this.inputs = inputs;
            this.outputs = outputs;
            this.returnPaths = returnPaths;
            this.isEditable = isEditable;
            this.description = description;
            this.folder = folder;
        }
        Process.prototype.signatureMatches = function (other) {
            if (this.inputs.length != other.inputs.length ||
                this.outputs.length != other.outputs.length ||
                this.returnPaths.length != other.returnPaths.length)
                return false;
            for (var i = 0; i < this.inputs.length; i++) {
                var mine = this.inputs[i], theirs = other.inputs[i];
                if (mine.name != theirs.name || mine.type != theirs.type)
                    return false;
            }
            for (var i = 0; i < this.outputs.length; i++) {
                var mine = this.outputs[i], theirs = other.outputs[i];
                if (mine.name != theirs.name || mine.type != theirs.type)
                    return false;
            }
            for (var i = 0; i < this.returnPaths.length; i++) {
                if (this.returnPaths[i] != other.returnPaths[i])
                    return false;
            }
            return true;
        };
        return Process;
    }());
    Cursive.Process = Process;
    var SystemProcess = (function (_super) {
        __extends(SystemProcess, _super);
        function SystemProcess(name, inputs, outputs, returnPaths, description, folder) {
            return _super.call(this, name, inputs, outputs, returnPaths, false, description, folder) || this;
        }
        return SystemProcess;
    }(Process));
    Cursive.SystemProcess = SystemProcess;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var UserProcess = (function (_super) {
        __extends(UserProcess, _super);
        function UserProcess(name, inputs, outputs, variables, returnPaths, fixedSignature, description, folder) {
            var _this = _super.call(this, name, inputs, outputs, returnPaths, true, description, folder) || this;
            _this.variables = variables;
            _this.fixedSignature = fixedSignature;
            _this.steps = [];
            _this.valid = false;
            _this.nextStepID = 1;
            return _this;
        }
        Object.defineProperty(UserProcess.prototype, "isValid", {
            get: function () {
                return this.valid;
            },
            enumerable: true,
            configurable: true
        });
        UserProcess.prototype.getNextStepID = function () {
            return this.nextStepID++;
        };
        UserProcess.prototype.noteUsedStepID = function (stepID) {
            this.nextStepID = Math.max(this.nextStepID, stepID + 1);
        };
        UserProcess.prototype.validate = function () {
            var valid = true;
            for (var _i = 0, _a = this.steps; _i < _a.length; _i++) {
                var step = _a[_i];
                if (!step.validate())
                    valid = false;
            }
            this.valid = valid;
            return valid;
        };
        UserProcess.prototype.createDefaultSteps = function () {
            var step = new Cursive.StartStep(this.getNextStepID(), this, 75, 125);
            step.createDanglingReturnPaths();
            this.steps.push(step);
        };
        UserProcess.prototype.removeStep = function (step) {
            var index = this.steps.indexOf(step);
            this.steps.splice(index, 1);
            for (var _i = 0, _a = step.incomingPaths; _i < _a.length; _i++) {
                var returnPath = _a[_i];
                returnPath.disconnect();
            }
            for (var _b = 0, _c = step.connectors; _b < _c.length; _b++) {
                var connector = _c[_b];
                if (connector.param.link === null)
                    continue;
                var variableLinks = connector.param.link.links;
                var index_1 = variableLinks.indexOf(connector.param);
                variableLinks.splice(index_1, 1);
            }
        };
        return UserProcess;
    }(Cursive.Process));
    Cursive.UserProcess = UserProcess;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Type = (function () {
        function Type(name, color, extendsType, validation, guidance) {
            this.name = name;
            this.extendsType = extendsType;
            this.color = color;
            this.allowInput = validation !== null;
            this.validation = validation;
            this.guidance = guidance;
        }
        Type.prototype.isValid = function (value) {
            if (this.validation === null)
                return false;
            return this.validation.test(value);
        };
        Type.prototype.isAssignableFrom = function (other) {
            var test = this;
            do {
                if (test == other)
                    return true;
                test = test.extendsType;
            } while (test != null);
            return false;
        };
        return Type;
    }());
    Cursive.Type = Type;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var DataField = (function () {
        function DataField(name, type) {
            this.name = name;
            this.type = type;
            this.initialValue = null;
        }
        return DataField;
    }());
    Cursive.DataField = DataField;
    var Parameter = (function (_super) {
        __extends(Parameter, _super);
        function Parameter(name, dataType) {
            var _this = _super.call(this, name, dataType) || this;
            _this.link = null;
            return _this;
        }
        return Parameter;
    }(DataField));
    Cursive.Parameter = Parameter;
    var Variable = (function (_super) {
        __extends(Variable, _super);
        function Variable(name, dataType) {
            var _this = _super.call(this, name, dataType) || this;
            _this.links = [];
            return _this;
        }
        return Variable;
    }(DataField));
    Cursive.Variable = Variable;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Position = (function () {
        function Position(x, y) {
            this.x = x;
            this.y = y;
        }
        return Position;
    }());
    Cursive.Position = Position;
    var Orientation = (function (_super) {
        __extends(Orientation, _super);
        function Orientation(x, y, angle) {
            var _this = _super.call(this, x, y) || this;
            _this.angle = angle;
            return _this;
        }
        return Orientation;
    }(Position));
    Cursive.Orientation = Orientation;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Drawing = (function () {
        function Drawing() {
        }
        Drawing.drawCurve = function (ctx, startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();
        };
        Drawing.underlineText = function (ctx, text, x, y, drawLine) {
            ctx.fillText(text, x, y);
            if (drawLine) {
                var w = ctx.measureText(text).width;
                ctx.lineWidth = 1;
                ctx.beginPath();
                var startX = void 0;
                switch (ctx.textAlign) {
                    case 'center':
                        startX = x - w / 2;
                        break;
                    case 'right':
                        startX = x - w;
                        break;
                    default:
                        startX = x;
                        break;
                }
                ctx.moveTo(startX, y + 1);
                ctx.lineTo(startX + w, y + 1);
                ctx.stroke();
            }
        };
        Drawing.writeTextBackground = function (ctx, text, x, y, blurColor) {
            ctx.save();
            ctx.shadowBlur = 14;
            ctx.shadowColor = ctx.fillStyle = blurColor;
            for (var i = 0; i < 12; i++)
                ctx.fillText(text, x, y);
            ctx.restore();
        };
        return Drawing;
    }());
    Cursive.Drawing = Drawing;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Transform = (function () {
        function Transform(x, y, angle) {
            this.x = x;
            this.y = y;
            this.angle = angle;
        }
        Transform.prototype.apply = function (ctx) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
        };
        return Transform;
    }());
    Cursive.Transform = Transform;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Step = (function () {
        function Step(uniqueID, process, parentProcess, x, y) {
            this.uniqueID = uniqueID;
            this.process = process;
            this.parentProcess = parentProcess;
            this.x = x === undefined ? 100 : x;
            this.y = y === undefined ? 100 : y;
            this.returnPaths = [];
            this.incomingPaths = [];
            this.drawText = this.dragging = false;
            this.inputs = this.copyParameters(this.getInputSource());
            this.outputs = this.copyParameters(this.getOutputSource());
            this.createRegions();
        }
        Step.prototype.createRegions = function () {
            this.connectors = [];
            this.regions = [];
            this.bodyRegion = new Cursive.Region(this.defineBodyRegion.bind(this), this.drawBody.bind(this), 'move');
            this.bodyRegion.mousedown = this.bodyRegionMouseDown.bind(this);
            this.bodyRegion.mouseup = this.bodyRegionMouseUp.bind(this);
            this.bodyRegion.hover = this.bodyRegionHover.bind(this);
            this.bodyRegion.move = this.bodyRegionMove.bind(this);
            this.bodyRegion.unhover = this.bodyRegionUnhover.bind(this);
            this.regions.push(this.bodyRegion);
            this.collisionRegion = new Cursive.Region(this.defineCollisionRegion.bind(this));
            this.anglesRangesToAvoid = [];
            this.createConnectors(this.outputs, false);
            this.createConnectors(this.inputs, true);
        };
        Step.prototype.bodyRegionMouseDown = function (x, y) {
            this.dragging = true;
            this.moveOffsetX = this.x - x;
            this.moveOffsetY = this.y - y;
            return true;
        };
        Step.prototype.bodyRegionMouseUp = function (x, y) {
            this.dragging = false;
            this.parentProcess.workspace.processEditor.stepMouseUp(x, y, this);
            return true;
        };
        Step.prototype.bodyRegionHover = function () {
            this.drawText = true;
            return true;
        };
        Step.prototype.bodyRegionMove = function (x, y) {
            if (!this.dragging)
                return false;
            var steps = this.parentProcess.steps;
            var ctx = this.parentProcess.workspace.processEditor.getContext();
            for (var _i = 0, steps_1 = steps; _i < steps_1.length; _i++) {
                var step = steps_1[_i];
                if (step === this)
                    continue;
                if (step.collisionRegion.containsPoint(ctx, x + this.moveOffsetX, y + this.moveOffsetY))
                    return;
            }
            this.x = x + this.moveOffsetX;
            this.y = y + this.moveOffsetY;
            for (var _a = 0, _b = this.returnPaths; _a < _b.length; _a++) {
                var returnPath = _b[_a];
                returnPath.forgetAngles();
            }
            for (var _c = 0, _d = this.incomingPaths; _c < _d.length; _c++) {
                var returnPath = _d[_c];
                returnPath.forgetAngles();
            }
            for (var _e = 0, _f = this.connectors; _e < _f.length; _e++) {
                var connector = _f[_e];
                connector.calculateOffsets();
            }
            return true;
        };
        Step.prototype.bodyRegionUnhover = function () {
            if (!this.dragging)
                this.drawText = false;
            return true;
        };
        Step.prototype.setFont = function (ctx) {
            ctx.font = '16px sans-serif';
        };
        Step.prototype.drawBody = function (ctx) {
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
        };
        Step.prototype.defineBodyRegion = function (ctx) {
            this.defineRegion(ctx, 1);
        };
        Step.prototype.defineCollisionRegion = function (ctx) {
            this.defineRegion(ctx, 2);
        };
        Step.prototype.copyParameters = function (sourceParams) {
            if (sourceParams === null)
                return null;
            var params = [];
            for (var _i = 0, sourceParams_1 = sourceParams; _i < sourceParams_1.length; _i++) {
                var sourceParam = sourceParams_1[_i];
                params.push(new Cursive.Parameter(sourceParam.name, sourceParam.type));
            }
            return params;
        };
        Step.prototype.createConnectors = function (params, input) {
            if (params === null)
                return;
            var angularSpread;
            switch (params.length) {
                case 0: return;
                case 1:
                    angularSpread = 0;
                    break;
                case 2:
                    angularSpread = 60;
                    break;
                case 3:
                    angularSpread = 90;
                    break;
                case 4:
                    angularSpread = 110;
                    break;
                case 5:
                    angularSpread = 120;
                    break;
                case 6:
                    angularSpread = 130;
                    break;
                default:
                    angularSpread = 140;
                    break;
            }
            angularSpread *= Math.PI / 180;
            var centerAngle = input ? Math.PI : 0;
            var stepSize = params.length == 1 ? 0 : angularSpread / (params.length - 1);
            var currentAngle = input ? centerAngle + angularSpread / 2 : centerAngle - angularSpread / 2;
            if (input)
                stepSize = -stepSize;
            var angularPadding = Math.PI / 10;
            for (var _i = 0, params_1 = params; _i < params_1.length; _i++) {
                var param = params_1[_i];
                var constrainedAngle = this.constrain(currentAngle);
                var connector = new Cursive.ParameterDisplay(this, constrainedAngle, param, input);
                this.connectors.push(connector);
                this.regions.push(connector.region);
                var angularRegion = [constrainedAngle - angularPadding, constrainedAngle + angularPadding];
                this.anglesRangesToAvoid.push(angularRegion);
                if (angularRegion[0] < 0) {
                    angularRegion = [constrainedAngle - angularPadding + Math.PI * 2, constrainedAngle + angularPadding + Math.PI * 2];
                    this.anglesRangesToAvoid.push(angularRegion);
                }
                else if (angularRegion[1] > Math.PI * 2) {
                    angularRegion = [constrainedAngle - angularPadding - Math.PI * 2, constrainedAngle + angularPadding - Math.PI * 2];
                    this.anglesRangesToAvoid.push(angularRegion);
                }
                currentAngle += stepSize;
            }
        };
        Step.prototype.constrain = function (angle) {
            var fullTurn = Math.PI * 2;
            if (angle < 0)
                angle += fullTurn;
            else if (angle >= fullTurn)
                angle += fullTurn;
            return angle;
        };
        Step.prototype.createDanglingReturnPaths = function () { };
        Step.prototype.validate = function () {
            this.valid = false;
            var inputs = this.inputs;
            if (inputs !== null)
                for (var _i = 0, inputs_1 = inputs; _i < inputs_1.length; _i++) {
                    var input = inputs_1[_i];
                    if (input.initialValue === null && input.link === null)
                        return false;
                }
            var outputs = this.outputs;
            if (outputs !== null)
                for (var _a = 0, outputs_1 = outputs; _a < outputs_1.length; _a++) {
                    var output = outputs_1[_a];
                    if (output.link === null)
                        return false;
                }
            this.valid = true;
            for (var _b = 0, _c = this.returnPaths; _b < _c.length; _b++) {
                var path = _c[_b];
                if (!path.isConnected())
                    return false;
            }
            return true;
        };
        Step.prototype.processSignatureChanged = function () {
            this.handleProcessSignatureChanges();
            this.createRegions();
            this.validate();
        };
        ;
        Step.prototype.handleProcessSignatureChanges = function () {
            var sourceParams = this.getInputSource();
            if (sourceParams != null)
                this.updateParameters(sourceParams, true);
            sourceParams = this.getOutputSource();
            if (sourceParams != null)
                this.updateParameters(sourceParams, false);
        };
        Step.prototype.updateParameters = function (sourceParams, isInput) {
            var oldConnectors = this.connectors.slice();
            var actualParams = isInput ? this.inputs : this.outputs;
            for (var _i = 0, sourceParams_2 = sourceParams; _i < sourceParams_2.length; _i++) {
                var sourceParam = sourceParams_2[_i];
                var foundExact = false;
                for (var _a = 0, _b = this.connectors; _a < _b.length; _a++) {
                    var connector = _b[_a];
                    if (connector.isInput !== isInput)
                        continue;
                    if (connector.param.name == sourceParam.name && connector.param.type === sourceParam.type) {
                        foundExact = true;
                        var pos = oldConnectors.indexOf(connector);
                        oldConnectors.splice(pos, 1);
                        break;
                    }
                }
                if (foundExact)
                    continue;
                actualParams.push(new Cursive.Parameter(sourceParam.name, sourceParam.type));
            }
            for (var _c = 0, oldConnectors_1 = oldConnectors; _c < oldConnectors_1.length; _c++) {
                var oldConnector = oldConnectors_1[_c];
                if (oldConnector.isInput !== isInput)
                    continue;
                var oldParam = oldConnector.param;
                var pos = actualParams.indexOf(oldParam);
                if (pos != -1)
                    actualParams.splice(pos, 1);
                if (oldParam.link !== null) {
                    pos = oldParam.link.links.indexOf(oldParam);
                    if (pos != -1)
                        oldParam.link.links.splice(pos, 1);
                }
            }
        };
        Step.prototype.getBestPathAngle = function (desiredAngle) {
            desiredAngle = this.constrain(desiredAngle);
            for (var _i = 0, _a = this.anglesRangesToAvoid; _i < _a.length; _i++) {
                var range = _a[_i];
                if (desiredAngle > range[0] && desiredAngle < range[1]) {
                    var mid = (range[0] + range[1]) / 2;
                    return this.constrain(range[desiredAngle >= mid ? 1 : 0]);
                }
            }
            return desiredAngle;
        };
        return Step;
    }());
    Cursive.Step = Step;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var StartStep = (function (_super) {
        __extends(StartStep, _super);
        function StartStep(uniqueID, parentProcess, x, y) {
            var _this = _super.call(this, uniqueID, null, parentProcess, x, y) || this;
            _this.radius = 45;
            for (var _i = 0, _a = _this.connectors; _i < _a.length; _i++) {
                var connector = _a[_i];
                connector.calculateOffsets();
            }
            return _this;
        }
        StartStep.prototype.writeText = function (ctx) {
            ctx.fillStyle = '#0a0';
            ctx.fillText('Start', this.x - this.radius / 4, this.y);
        };
        StartStep.prototype.defineRegion = function (ctx, scale) {
            ctx.moveTo(this.x - this.radius * scale, this.y - this.radius * 0.75 * scale);
            ctx.lineTo(this.x + this.radius * scale, this.y);
            ctx.lineTo(this.x - this.radius * scale, this.y + this.radius * 0.75 * scale);
            ctx.closePath();
        };
        StartStep.prototype.getPerpendicular = function (angle) {
            var sin = Math.sin(angle);
            var cos = Math.cos(angle);
            var dist = this.radius;
            var x = this.x + dist * cos;
            var y = this.y + dist * sin;
            var facingAngle = angle;
            return new Cursive.Orientation(x, y, facingAngle);
        };
        StartStep.prototype.createDanglingReturnPaths = function () {
            var returnPath = new Cursive.ReturnPath(this, null, null, 150, 0);
            returnPath.onlyPath = true;
            this.returnPaths.push(returnPath);
        };
        StartStep.prototype.getInputSource = function () { return null; };
        StartStep.prototype.getOutputSource = function () { return this.parentProcess.inputs; };
        StartStep.prototype.bodyRegionMouseUp = function (x, y) {
            this.dragging = false;
            return true;
        };
        return StartStep;
    }(Cursive.Step));
    Cursive.StartStep = StartStep;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var StopStep = (function (_super) {
        __extends(StopStep, _super);
        function StopStep(uniqueID, parentProcess, returnPath, x, y) {
            var _this = _super.call(this, uniqueID, null, parentProcess, x, y) || this;
            _this.returnPath = returnPath;
            _this.radius = 45;
            for (var _i = 0, _a = _this.connectors; _i < _a.length; _i++) {
                var connector = _a[_i];
                connector.calculateOffsets();
            }
            return _this;
        }
        StopStep.prototype.writeText = function (ctx) {
            ctx.fillStyle = '#a00';
            ctx.fillText('Stop', this.x, this.y - this.radius / 4);
        };
        StopStep.prototype.defineRegion = function (ctx, scale) {
            ctx.rect(this.x - this.radius * scale, this.y - this.radius * scale, this.radius * 2 * scale, this.radius * 2 * scale);
        };
        StopStep.prototype.getPerpendicular = function (angle) {
            var sin = Math.sin(angle);
            var cos = Math.cos(angle);
            var absCos = Math.abs(cos);
            var absSin = Math.abs(sin);
            var dist;
            if (this.radius * absSin <= this.radius * absCos)
                dist = this.radius / absCos;
            else
                dist = this.radius / absSin;
            var x = this.x + dist * cos;
            var y = this.y + dist * sin;
            var facingAngle;
            var halfPi = Math.PI / 2;
            var quarterPi = Math.PI / 4;
            if (angle < quarterPi)
                facingAngle = 0;
            else if (angle < 3 * quarterPi)
                facingAngle = halfPi;
            else if (angle < 5 * quarterPi)
                facingAngle = Math.PI;
            else if (angle < 7 * quarterPi)
                facingAngle = Math.PI + halfPi;
            else
                facingAngle = 0;
            return new Cursive.Orientation(x, y, facingAngle);
        };
        StopStep.prototype.createRegions = function () {
            _super.prototype.createRegions.call(this);
            var pathName = new Cursive.Region(this.definePathNameRegion.bind(this), this.drawPathNameRegion.bind(this), this.parentProcess.returnPaths.length > 0 ? 'pointer' : 'not-allowed');
            pathName.click = this.pathNameRegionClick.bind(this);
            pathName.hover = function () { return true; };
            pathName.unhover = function () { return true; };
            this.regions.unshift(pathName);
        };
        StopStep.prototype.definePathNameRegion = function (ctx) {
            ctx.rect(this.x - this.radius, this.y + this.radius / 8, this.radius * 2, this.radius / 3);
        };
        StopStep.prototype.drawPathNameRegion = function (ctx, isMouseOver, isMouseDown) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.strokeStyle = ctx.fillStyle = '#000';
            var displayName = this.returnPath === null ? '[no name]' : '"' + this.returnPath + '"';
            var underline = isMouseOver && this.parentProcess.returnPaths.length > 0;
            Cursive.Drawing.underlineText(ctx, displayName, this.x, this.y + this.radius / 2, underline);
        };
        StopStep.prototype.pathNameRegionClick = function () {
            if (this.parentProcess.returnPaths.length > 0)
                this.parentProcess.workspace.returnPathEditor.show(this);
        };
        StopStep.prototype.getInputSource = function () { return this.parentProcess.outputs; };
        StopStep.prototype.getOutputSource = function () { return null; };
        StopStep.prototype.validate = function () {
            var isValid = _super.prototype.validate.call(this);
            if (this.returnPath !== null) {
                if (this.parentProcess.returnPaths.indexOf(this.returnPath) == -1)
                    isValid = false;
            }
            else if (this.parentProcess.returnPaths.length > 0)
                isValid = false;
            this.valid = isValid;
            return isValid;
        };
        StopStep.prototype.handleProcessSignatureChanges = function () {
            _super.prototype.handleProcessSignatureChanges.call(this);
            if (this.returnPath !== null && this.parentProcess.returnPaths.indexOf(this.returnPath) == -1)
                this.returnPath = null;
        };
        return StopStep;
    }(Cursive.Step));
    Cursive.StopStep = StopStep;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ParameterDisplay = (function () {
        function ParameterDisplay(step, angle, param, isInput) {
            this.step = step;
            this.param = param;
            this.isInput = isInput;
            this.linkLength = 18;
            this.linkBranchLength = 6;
            this.outputBranchAngle = Math.PI * 0.8;
            this.inputBranchAngle = Math.PI - this.outputBranchAngle;
            this.textDistance = 30;
            this.angle = angle;
            this.drawText = false;
            this.createRegion();
        }
        ParameterDisplay.prototype.calculateOffsets = function () {
            var halfAngle = Math.PI / 24;
            var offset = this.offsetStep(0);
            var pos1 = this.offset(offset.x, offset.y, this.linkBranchLength, offset.angle + Math.PI / 2);
            var pos2 = this.offset(offset.x, offset.y, this.linkBranchLength, offset.angle - Math.PI / 2);
            var pos3 = this.offset(pos2.x, pos2.y, this.textDistance, offset.angle - halfAngle);
            var pos4 = this.offset(pos1.x, pos1.y, this.textDistance, offset.angle + halfAngle);
            this.regionOffsets = [pos2, pos3, pos4, pos1];
            offset = this.offsetStep(2);
            var startPos = offset;
            var endPos = this.offset(offset.x, offset.y, this.linkLength, offset.angle);
            var midPos = this.isInput ? startPos : endPos;
            var sidePos1 = this.offset(midPos.x, midPos.y, this.linkBranchLength, this.isInput ? offset.angle + this.inputBranchAngle : offset.angle + this.outputBranchAngle);
            var sidePos2 = this.offset(midPos.x, midPos.y, this.linkBranchLength, this.isInput ? offset.angle - this.inputBranchAngle : offset.angle - this.outputBranchAngle);
            var textPos = this.offset(offset.x, offset.y, this.textDistance, offset.angle);
            this.drawingOffsets = [offset, endPos, midPos, sidePos1, sidePos2, textPos];
        };
        ParameterDisplay.prototype.createRegion = function () {
            this.region = new Cursive.Region(this.defineRegion.bind(this), this.draw.bind(this), 'pointer');
            this.region.hover = this.regionHover.bind(this);
            this.region.unhover = this.regionUnhover.bind(this);
            this.region.mousedown = this.regionMouseDown.bind(this);
            this.region.mouseup = this.regionMouseUp.bind(this);
        };
        ParameterDisplay.prototype.regionHover = function () {
            this.drawText = true;
            this.step.parentProcess.workspace.variableListDisplay.highlight(this.param.link);
            return true;
        };
        ParameterDisplay.prototype.regionUnhover = function () {
            this.drawText = false;
            this.step.parentProcess.workspace.variableListDisplay.highlight(null);
            return true;
        };
        ParameterDisplay.prototype.regionMouseDown = function (x, y) {
            return false;
        };
        ParameterDisplay.prototype.regionMouseUp = function (x, y) {
            this.step.parentProcess.workspace.parameterEditor.show(this);
            return true;
        };
        ParameterDisplay.prototype.defineRegion = function (ctx) {
            var offset = this.regionOffsets[this.regionOffsets.length - 1];
            ctx.moveTo(offset.x, offset.y);
            for (var _i = 0, _a = this.regionOffsets; _i < _a.length; _i++) {
                offset = _a[_i];
                ctx.lineTo(offset.x, offset.y);
            }
        };
        ParameterDisplay.prototype.draw = function (ctx, isMouseOver, isMouseDown) {
            ctx.fillStyle = ctx.strokeStyle = this.param.type.color;
            ctx.lineWidth = 4;
            ctx.beginPath();
            var startPos = this.drawingOffsets[0];
            ctx.moveTo(startPos.x, startPos.y);
            var endPos = this.drawingOffsets[1];
            ctx.lineTo(endPos.x, endPos.y);
            var midPos = this.drawingOffsets[2];
            var sidePos1 = this.drawingOffsets[3];
            var sidePos2 = this.drawingOffsets[4];
            ctx.moveTo(sidePos1.x, sidePos1.y);
            ctx.lineTo(midPos.x, midPos.y);
            ctx.lineTo(sidePos2.x, sidePos2.y);
            ctx.stroke();
            if (this.param.initialValue !== null) {
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(endPos.x, endPos.y, this.linkBranchLength * 0.75, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (this.step.drawText || this.drawText || (this.param.link !== null && this.step.parentProcess.workspace.processEditor.highlightVariable === this.param.link)) {
                ctx.textAlign = this.isInput ? 'right' : 'left';
                var pos = this.drawingOffsets[5];
                var nameText = this.param.name;
                var valueText = void 0;
                ctx.fillStyle = '#666';
                ctx.font = 'italic 12px sans-serif';
                if (this.param.link !== null)
                    valueText = this.param.link.name;
                else if (this.param.initialValue !== null)
                    valueText = '"' + this.param.initialValue + '"';
                else {
                    valueText = 'not connected';
                    ctx.fillStyle = '#c00';
                    ctx.font = '12px sans-serif';
                }
                ctx.textBaseline = 'top';
                Cursive.Drawing.writeTextBackground(ctx, valueText, pos.x, pos.y + 5, '#fff');
                ctx.save();
                ctx.font = '12px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = this.param.type.color;
                Cursive.Drawing.writeTextBackground(ctx, nameText, pos.x, pos.y, '#fff');
                ctx.fillText(nameText, pos.x, pos.y);
                ctx.restore();
                ctx.fillText(valueText, pos.x, pos.y + 5);
            }
        };
        ParameterDisplay.prototype.offsetStep = function (extraDistance) {
            var perpendicular = this.step.getPerpendicular(this.angle);
            return new Cursive.Orientation(perpendicular.x + extraDistance * Math.cos(perpendicular.angle), perpendicular.y + extraDistance * Math.sin(perpendicular.angle), perpendicular.angle);
        };
        ParameterDisplay.prototype.offset = function (x, y, distance, angle) {
            return new Cursive.Position(x + distance * Math.cos(angle), y + distance * Math.sin(angle));
        };
        return ParameterDisplay;
    }());
    Cursive.ParameterDisplay = ParameterDisplay;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ReturnPath = (function () {
        function ReturnPath(fromStep, toStep, name, endOffsetX, endOffsetY) {
            this.warnDuplicate = false;
            this.onlyPath = false;
            this.nameLength = 30;
            this.dragging = false;
            this.fromStep = fromStep;
            this._toStep = toStep;
            if (endOffsetX === undefined && toStep !== null && fromStep != null) {
                endOffsetX = toStep.x - fromStep.x;
                endOffsetY = toStep.y - fromStep.y;
            }
            this.endOffsetX = endOffsetX;
            this.endOffsetY = endOffsetY;
            this.startOrientation = null;
            this.endOrientation = null;
            this.cpDist = null;
            this.name = name;
            var pathName = new Cursive.Region(this.definePathNameRegion.bind(this), this.drawName.bind(this), 'default');
            var midArrow = new Cursive.Region(this.defineMidArrowRegion.bind(this), this.drawMidArrowRegion.bind(this), 'move');
            midArrow.hover = function () { return true; };
            midArrow.unhover = function () { return true; };
            midArrow.mousedown = this.dragStart.bind(this);
            midArrow.mouseup = this.dragStop.bind(this);
            midArrow.move = this.dragMove.bind(this);
            var endConnector = new Cursive.Region(this.defineEndConnectorRegion.bind(this), this.drawEndConnectorRegion.bind(this), 'move');
            endConnector.hover = function () { return true; };
            endConnector.unhover = function () { return true; };
            endConnector.mousedown = this.dragStart.bind(this);
            endConnector.mouseup = this.dragStop.bind(this);
            endConnector.move = this.dragMove.bind(this);
            this.regions = [pathName, midArrow, endConnector];
            if (toStep !== null)
                toStep.incomingPaths.push(this);
        }
        Object.defineProperty(ReturnPath.prototype, "toStep", {
            get: function () {
                return this._toStep;
            },
            enumerable: true,
            configurable: true
        });
        ReturnPath.prototype.getNameToWrite = function () {
            return this.name !== null ? this.name : this.onlyPath ? null : 'default';
        };
        ReturnPath.prototype.defineMidArrowRegion = function (ctx) {
            ctx.save();
            this.midArrowTransform.apply(ctx);
            var halfWidth = 8, arrowLength = 20;
            ctx.rect(-arrowLength - 1, -halfWidth - 1, arrowLength + 2, halfWidth * 2 + 2);
            ctx.restore();
        };
        ReturnPath.prototype.definePathNameRegion = function (ctx) {
            if (this.getNameToWrite() === null)
                return;
            ctx.save();
            this.midArrowTransform.apply(ctx);
            ctx.translate(-26, 0);
            ctx.rect(-this.nameLength - 5, -10, this.nameLength + 10, 20);
            ctx.restore();
        };
        ReturnPath.prototype.drawName = function (ctx) {
            var writeName = this.getNameToWrite();
            if (writeName === null)
                return;
            ctx.save();
            var transform = this.midArrowTransform;
            transform.apply(ctx);
            ctx.translate(-26, 0);
            ctx.textAlign = 'right';
            if (transform.angle > Math.PI / 2 || transform.angle <= -Math.PI / 2) {
                ctx.rotate(Math.PI);
                ctx.textAlign = 'left';
            }
            if (writeName !== null) {
                ctx.font = '16px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000';
                this.nameLength = ctx.measureText(writeName).width;
                Cursive.Drawing.writeTextBackground(ctx, writeName, 0, 0, this.warnDuplicate ? '#f99' : '#fff');
                ctx.fillText(writeName, 0, 0);
            }
            ctx.restore();
        };
        ReturnPath.prototype.defineEndConnectorRegion = function (ctx) {
            if (this._toStep != null)
                return;
            ctx.save();
            this.endConnectorTranform.apply(ctx);
            var radius = 8;
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.restore();
        };
        ReturnPath.prototype.drawEndConnectorRegion = function (ctx) {
            if (this._toStep != null)
                return;
            ctx.save();
            this.endConnectorTranform.apply(ctx);
            var radius = 8;
            ctx.beginPath();
            ctx.fillStyle = this._toStep == null && !this.dragging ? '#f00' : '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };
        ReturnPath.prototype.drawMidArrowRegion = function (ctx) {
            ctx.save();
            this.midArrowTransform.apply(ctx);
            var halfWidth = 8, arrowLength = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.fillStyle = this._toStep == null && !this.dragging ? '#f00' : '#fff';
            ctx.beginPath();
            ctx.moveTo(-arrowLength, halfWidth);
            ctx.lineTo(0, 0);
            ctx.lineTo(-arrowLength, -halfWidth);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-arrowLength, halfWidth);
            ctx.lineTo(0, 0);
            ctx.lineTo(-arrowLength, -halfWidth);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
        };
        ReturnPath.prototype.draw = function (ctx) {
            var fromX = this.fromStep.x, fromY = this.fromStep.y;
            var toX, toY;
            if (this._toStep == null) {
                toX = this.fromStep.x + this.endOffsetX;
                toY = this.fromStep.y + this.endOffsetY;
            }
            else {
                toX = this._toStep.x;
                toY = this._toStep.y;
            }
            if (this.startOrientation === null) {
                var startAngle = void 0, endAngle = void 0;
                if (this.fromStep === this.toStep) {
                    startAngle = this.fromStep.getBestPathAngle(Math.PI / 2);
                    endAngle = this.toStep.getBestPathAngle(3 * Math.PI / 2);
                    this.cpDist = 80;
                }
                else {
                    var dx = toX - fromX, dy = toY - fromY;
                    var directAngle = Math.atan2(dy, dx);
                    startAngle = this.fromStep.getBestPathAngle(directAngle);
                    endAngle = directAngle + Math.PI;
                    if (endAngle > Math.PI * 2)
                        endAngle -= Math.PI * 2;
                    if (this._toStep !== null)
                        endAngle = this.toStep.getBestPathAngle(endAngle);
                    this.cpDist = Math.min(100, Math.sqrt(dx * dx + dy * dy) * 0.2);
                }
                this.startOrientation = this.fromStep.getPerpendicular(startAngle);
                if (this.toStep !== null)
                    this.endOrientation = this.toStep.getPerpendicular(endAngle);
                else
                    this.endOrientation = new Cursive.Orientation(toX, toY, endAngle);
            }
            fromX = this.startOrientation.x;
            fromY = this.startOrientation.y;
            toX = this.endOrientation.x;
            toY = this.endOrientation.y;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            var cp1x, cp1y, cp2x, cp2y;
            if (this.fromStep === this.toStep) {
                cp1x = fromX + 180;
                cp1y = fromY - 160;
                cp2x = toX + 180;
                cp2y = toY + 160;
            }
            else {
                cp1x = fromX + Math.cos(this.startOrientation.angle) * this.cpDist;
                cp1y = fromY + Math.sin(this.startOrientation.angle) * this.cpDist;
                cp2x = toX + Math.cos(this.endOrientation.angle) * this.cpDist;
                cp2y = toY + Math.sin(this.endOrientation.angle) * this.cpDist;
            }
            Cursive.Drawing.drawCurve(ctx, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
            if (this._toStep == null) {
                this.endConnectorTranform = new Cursive.Transform(toX, toY, 0);
            }
            var mid1x = (fromX + cp1x + cp1x + cp2x) / 4, mid1y = (fromY + cp1y + cp1y + cp2y) / 4;
            var mid2x = (toX + cp2x + cp2x + cp1x) / 4, mid2y = (toY + cp2y + cp2y + cp1y) / 4;
            var midAngle = Math.atan2(mid2y - mid1y, mid2x - mid1x);
            var tx = (mid1x + mid2x) / 2;
            var ty = (mid1y + mid2y) / 2;
            this.midArrowTransform = new Cursive.Transform(tx, ty, midAngle);
        };
        ReturnPath.prototype.dragStart = function (x, y) {
            this.disconnect();
            this.updateOffset(x, y);
            this.dragging = true;
            return true;
        };
        ReturnPath.prototype.dragStop = function (x, y) {
            if (!this.dragging)
                return false;
            this.updateOffset(x, y);
            this.dragging = false;
            var otherStep = this.fromStep.parentProcess.workspace.processEditor.getStep(x, y);
            if (otherStep instanceof Cursive.StartStep)
                return false;
            this._toStep = otherStep;
            if (otherStep === null)
                return true;
            otherStep.incomingPaths.push(this);
            return true;
        };
        ReturnPath.prototype.dragMove = function (x, y) {
            if (!this.dragging)
                return false;
            this.updateOffset(x, y);
            return true;
        };
        ReturnPath.prototype.updateOffset = function (x, y) {
            this.forgetAngles();
            this.endOffsetX = x - this.fromStep.x;
            this.endOffsetY = y - this.fromStep.y;
        };
        ReturnPath.prototype.isConnected = function () {
            return this._toStep !== null;
        };
        ReturnPath.prototype.disconnect = function () {
            if (this._toStep === null)
                return;
            var pos = this._toStep.incomingPaths.indexOf(this);
            if (pos != -1)
                this._toStep.incomingPaths.splice(pos, 1);
            this._toStep = null;
        };
        ReturnPath.prototype.forgetAngles = function () {
            this.startOrientation = null;
            this.endOrientation = null;
            this.cpDist = null;
        };
        return ReturnPath;
    }());
    Cursive.ReturnPath = ReturnPath;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Region = (function () {
        function Region(definition, draw, cursor) {
            var empty = function () { return false; };
            this.define = definition == null ? empty : definition;
            this.draw = draw == null ? empty : draw;
            this.click = this.hover = this.unhover = this.move = this.mousedown = this.mouseup = empty;
            this.doubleClick = null;
            this.cursor = cursor == null ? '' : cursor;
        }
        Region.prototype.containsPoint = function (ctx, x, y) {
            ctx.strokeStyle = 'rgba(0,0,0,0)';
            ctx.beginPath();
            this.define(ctx);
            ctx.stroke();
            return ctx.isPointInPath(x, y);
        };
        Region.prototype.callDraw = function (ctx, editor) {
            this.draw(ctx, editor.hoverRegion === this, editor.mouseDownRegion === this);
        };
        return Region;
    }());
    Cursive.Region = Region;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ProcessStep = (function (_super) {
        __extends(ProcessStep, _super);
        function ProcessStep(uniqueID, process, isUserProcess, parentProcess, x, y) {
            var _this = _super.call(this, uniqueID, process, parentProcess, x, y) || this;
            _this.radius = 25;
            var ctx = parentProcess.workspace.processEditor.getContext();
            _this.setFont(ctx);
            var textLength = ctx.measureText(_this.process.name).width / 2 + 8;
            _this.extraLength = Math.max(0, textLength - _this.radius);
            for (var _i = 0, _a = _this.connectors; _i < _a.length; _i++) {
                var connector = _a[_i];
                connector.calculateOffsets();
            }
            if (isUserProcess)
                _this.bodyRegion.doubleClick = _this.doubleClicked.bind(_this);
            return _this;
        }
        ProcessStep.prototype.writeText = function (ctx) {
            ctx.fillStyle = '#000';
            ctx.fillText(this.process.name, this.x, this.y);
        };
        ProcessStep.prototype.drawBody = function (ctx) {
            _super.prototype.drawBody.call(this, ctx);
            if (this.process.isEditable) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                this.defineRegion(ctx, 0.85);
                ctx.stroke();
            }
        };
        ProcessStep.prototype.defineRegion = function (ctx, scale) {
            var radius = this.radius * scale;
            var length = this.extraLength;
            ctx.beginPath();
            ctx.moveTo(this.x - length, this.y - radius);
            ctx.lineTo(this.x + length, this.y - radius);
            ctx.arcTo(this.x + length + radius, this.y - radius, this.x + length + radius, this.y, radius);
            ctx.arcTo(this.x + length + radius, this.y + radius, this.x + length, this.y + radius, radius);
            ctx.lineTo(this.x - length, this.y + radius);
            ctx.arcTo(this.x - length - radius, this.y + radius, this.x - length - radius, this.y, radius);
            ctx.arcTo(this.x - length - radius, this.y - radius, this.x - length, this.y - radius, radius);
            ctx.closePath();
        };
        ProcessStep.prototype.getPerpendicular = function (angle) {
            var cornerAngle = this.extraLength == 0 ? Math.PI / 2 : Math.atan(this.radius / this.extraLength);
            var sin = Math.sin(angle);
            var cos = Math.cos(angle);
            var calcAngle = Math.abs(angle);
            if (calcAngle > Math.PI)
                calcAngle -= Math.PI;
            if (calcAngle > Math.PI / 2)
                calcAngle = Math.PI - calcAngle;
            var dist;
            var facingAngle;
            if (calcAngle > cornerAngle) {
                dist = this.radius / Math.sin(calcAngle);
                if (angle < Math.PI)
                    facingAngle = Math.PI / 2;
                else
                    facingAngle = 3 * Math.PI / 2;
            }
            else {
                var calcSin = Math.sin(calcAngle);
                var sqrt = Math.sqrt(this.radius * this.radius - this.extraLength * this.extraLength * calcSin * calcSin);
                dist = this.extraLength * Math.cos(calcAngle) + sqrt;
                var leftward = angle > Math.PI / 2 && angle < 3 * Math.PI / 2;
                var cy = sin * dist;
                if (leftward) {
                    var cx = cos * dist + this.extraLength;
                    facingAngle = Math.PI + Math.atan(cy / cx);
                }
                else {
                    var cx = cos * dist - this.extraLength;
                    facingAngle = Math.atan(cy / cx);
                }
            }
            var x = this.x + dist * cos;
            var y = this.y + dist * sin;
            return new Cursive.Orientation(x, y, facingAngle);
        };
        ProcessStep.prototype.getInputSource = function () {
            return this.process.inputs;
        };
        ProcessStep.prototype.getOutputSource = function () {
            return this.process.outputs;
        };
        ProcessStep.prototype.createDanglingReturnPaths = function () {
            var distance = 150;
            if (this.process.returnPaths.length == 0) {
                var returnPath = new Cursive.ReturnPath(this, null, null, 0, distance);
                returnPath.onlyPath = true;
                this.returnPaths.push(returnPath);
            }
            else {
                var centerAngle = 7 * Math.PI / 16;
                var targetSeparation = 3 * Math.PI / 16;
                var maxSpread = 5 * Math.PI / 8;
                var numSteps = this.process.returnPaths.length - 1;
                var totalSpread = Math.min(maxSpread, numSteps * targetSeparation);
                var currentAngle = centerAngle - totalSpread / 2;
                var angularIncrement = totalSpread / numSteps;
                for (var _i = 0, _a = this.process.returnPaths; _i < _a.length; _i++) {
                    var path = _a[_i];
                    var xOffset = distance * Math.cos(currentAngle);
                    var yOffset = distance * Math.sin(currentAngle);
                    currentAngle += angularIncrement;
                    var returnPath = new Cursive.ReturnPath(this, null, path, xOffset, yOffset);
                    this.returnPaths.push(returnPath);
                }
            }
        };
        ProcessStep.prototype.handleProcessSignatureChanges = function () {
            _super.prototype.handleProcessSignatureChanges.call(this);
            var oldPaths = this.returnPaths.slice();
            var createDistance = 150;
            var angularIncrement = Math.PI / 8;
            var createAngle = Math.PI / 4;
            for (var _i = 0, _a = this.process.returnPaths; _i < _a.length; _i++) {
                var path = _a[_i];
                var foundMatch = false;
                for (var i = 0; i < oldPaths.length; i++) {
                    var oldPath = oldPaths[i];
                    if (oldPath.name == path) {
                        foundMatch = true;
                        oldPaths.splice(i, 1);
                        break;
                    }
                }
                if (foundMatch)
                    continue;
                var xOffset = createDistance * Math.cos(createAngle);
                var yOffset = createDistance * Math.sin(createAngle);
                createAngle += angularIncrement;
                var returnPath = new Cursive.ReturnPath(this, null, path, xOffset, yOffset);
                this.returnPaths.push(returnPath);
            }
            if (this.process.returnPaths.length == 0) {
                var foundMatch = false;
                for (var i = 0; i < oldPaths.length; i++) {
                    var oldPath = oldPaths[i];
                    if (oldPath.name === null) {
                        foundMatch = true;
                        oldPaths.splice(i, 1);
                        break;
                    }
                }
                if (!foundMatch) {
                    var xOffset = createDistance * Math.cos(createAngle);
                    var yOffset = createDistance * Math.sin(createAngle);
                    var returnPath = new Cursive.ReturnPath(this, null, null, xOffset, yOffset);
                    this.returnPaths.push(returnPath);
                }
            }
            for (var _b = 0, oldPaths_1 = oldPaths; _b < oldPaths_1.length; _b++) {
                var oldPath = oldPaths_1[_b];
                var pos = this.returnPaths.indexOf(oldPath);
                if (pos != -1)
                    this.returnPaths.splice(pos, 1);
            }
        };
        ProcessStep.prototype.doubleClicked = function () {
            this.parentProcess.workspace.openProcess(this.process);
            return false;
        };
        return ProcessStep;
    }(Cursive.Step));
    Cursive.ProcessStep = ProcessStep;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var Dictionary = (function () {
        function Dictionary() {
            this.valuesByName = {};
            this.valuesByIndex = [];
        }
        Dictionary.prototype.getByName = function (key) {
            return this.valuesByName[key];
        };
        Dictionary.prototype.add = function (key, value) {
            if (!this.contains(key))
                this.valuesByIndex.push(value);
            this.valuesByName[key] = value;
        };
        Dictionary.prototype.contains = function (key) {
            return this.valuesByName.hasOwnProperty(key);
        };
        Object.defineProperty(Dictionary.prototype, "count", {
            get: function () {
                return this.valuesByIndex.length;
            },
            enumerable: true,
            configurable: true
        });
        Dictionary.prototype.getByIndex = function (index) {
            return this.valuesByIndex[index];
        };
        Dictionary.prototype.remove = function (key) {
            var value = this.valuesByName[key];
            delete this.valuesByName[key];
            var index = this.valuesByIndex.indexOf(value);
            this.valuesByIndex.splice(index, 1);
        };
        return Dictionary;
    }());
    Cursive.Dictionary = Dictionary;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ErrorDisplay = (function () {
        function ErrorDisplay(popup) {
            this.popup = popup;
        }
        ErrorDisplay.prototype.showError = function (message) {
            this.popup.popupContent.innerHTML = '<h3>An error has occurred</h3><p>Sorry. You might need to reload the page to continue.</p><p>The following error was encountered - you might want to report this:</p><pre>' + message + '</pre>';
        };
        return ErrorDisplay;
    }());
    Cursive.ErrorDisplay = ErrorDisplay;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ReturnPathEdit = (function () {
        function ReturnPathEdit(workspace, popup) {
            this.workspace = workspace;
            this.popup = popup;
            this.editingStep = null;
        }
        ReturnPathEdit.prototype.populateContent = function () {
            this.popup.popupContent.innerHTML = '';
            var prompt = document.createElement('div');
            prompt.className = 'returnPath prompt';
            prompt.innerText = 'Select a return path for this process:';
            this.popup.popupContent.appendChild(prompt);
            this.pathSelect = document.createElement('select');
            this.pathSelect.className = 'pathName';
            this.popup.popupContent.appendChild(this.pathSelect);
            var fieldRow = this.popup.addField(null);
            fieldRow.classList.add('buttons');
            var okButton = document.createElement('button');
            okButton.setAttribute('type', 'button');
            okButton.addEventListener('click', this.okClicked.bind(this));
            okButton.innerText = 'OK';
            fieldRow.appendChild(okButton);
            var cancelButton = document.createElement('button');
            cancelButton.setAttribute('type', 'button');
            cancelButton.addEventListener('click', this.hide.bind(this));
            cancelButton.innerText = 'cancel';
            fieldRow.appendChild(cancelButton);
        };
        ReturnPathEdit.prototype.show = function (stopStep) {
            this.populateContent();
            this.editingStep = stopStep;
            this.pathSelect.innerHTML = '';
            for (var _i = 0, _a = stopStep.parentProcess.returnPaths; _i < _a.length; _i++) {
                var path = _a[_i];
                var pathOption = document.createElement('option');
                pathOption.value = path;
                pathOption.text = path;
                this.pathSelect.options.add(pathOption);
            }
            this.pathSelect.value = stopStep.returnPath;
            this.popup.show();
        };
        ReturnPathEdit.prototype.hide = function () {
            this.popup.hide();
        };
        ReturnPathEdit.prototype.okClicked = function () {
            if (this.pathSelect.value == '') {
                Cursive.EditorPopup.showError(this.pathSelect, 'Please select a return path');
                return;
            }
            this.editingStep.returnPath = this.pathSelect.value;
            this.hide();
            this.editingStep.parentProcess.validate();
            this.workspace.variableListDisplay.populateList();
            this.workspace.processEditor.draw();
        };
        return ReturnPathEdit;
    }());
    Cursive.ReturnPathEdit = ReturnPathEdit;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ProcessSignatureEdit = (function () {
        function ProcessSignatureEdit(workspace, popupRoot) {
            this.workspace = workspace;
            this.rootElement = popupRoot;
            this.editingProcess = null;
        }
        ProcessSignatureEdit.prototype.populateContent = function () {
            this.rootElement.innerHTML = '';
            var p = document.createElement('p');
            this.rootElement.appendChild(p);
            var label = document.createElement('label');
            label.innerText = 'Process name: ';
            p.appendChild(label);
            this.processNameInput = document.createElement('input');
            this.processNameInput.type = 'text';
            label.appendChild(this.processNameInput);
            p.appendChild(document.createTextNode(' '));
            this.deleteButton = document.createElement('button');
            this.deleteButton.setAttribute('type', 'button');
            p.appendChild(this.deleteButton);
            this.deleteButton.className = 'delete';
            this.deleteButton.innerText = 'delete this process';
            this.deleteButton.addEventListener('click', this.deleteButtonClicked.bind(this));
            this.inputListElement = this.createListElement('inputs', 'inputs', 'input');
            this.outputListElement = this.createListElement('outputs', 'outputs', 'output');
            this.returnPathListElement = this.createListElement('returnPaths', 'return paths', 'return path');
            p = document.createElement('p');
            this.rootElement.appendChild(p);
            label = document.createElement('label');
            label.innerText = 'Folder group: ';
            p.appendChild(label);
            this.folderNameInput = document.createElement('input');
            this.folderNameInput.type = 'text';
            label.appendChild(this.folderNameInput);
            p.appendChild(document.createTextNode(' (optional, used for sorting the process list)'));
            p = document.createElement('p');
            this.rootElement.appendChild(p);
            label = document.createElement('label');
            label.innerText = 'Description: ';
            p.appendChild(label);
            this.descriptionInput = document.createElement('textarea');
            label.appendChild(this.descriptionInput);
            p = document.createElement('p');
            p.className = 'row buttons';
            this.rootElement.appendChild(p);
            this.saveButton = document.createElement('button');
            this.saveButton.setAttribute('type', 'button');
            p.appendChild(this.saveButton);
            this.saveButton.className = 'save';
            this.saveButton.addEventListener('click', this.saveButtonClicked.bind(this));
            this.cancelButton = document.createElement('button');
            this.cancelButton.setAttribute('type', 'button');
            p.appendChild(this.cancelButton);
            this.cancelButton.className = 'cancel';
            this.cancelButton.innerText = 'cancel';
            this.cancelButton.addEventListener('click', this.cancelButtonClicked.bind(this));
        };
        ProcessSignatureEdit.prototype.createListElement = function (className, namePlural, nameSingular) {
            var fieldSet = document.createElement('fieldset');
            fieldSet.className = className;
            this.rootElement.appendChild(fieldSet);
            var legendElement = document.createElement('legend');
            legendElement.innerText = namePlural;
            fieldSet.appendChild(legendElement);
            var listElement = document.createElement('ol');
            fieldSet.appendChild(listElement);
            var addLink = document.createElement('div');
            addLink.className = "link add" + className;
            addLink.innerText = 'add new ' + nameSingular;
            fieldSet.appendChild(addLink);
            addLink.addEventListener('click', className == 'returnPaths' ? this.addReturnPathClicked.bind(this, listElement) : this.addParameterClicked.bind(this, listElement));
            return listElement;
        };
        ProcessSignatureEdit.prototype.addParameterClicked = function (listElement) {
            listElement.appendChild(this.createProcessParameter(null));
        };
        ProcessSignatureEdit.prototype.addReturnPathClicked = function (listElement) {
            listElement.appendChild(this.createReturnPath(null));
        };
        ProcessSignatureEdit.prototype.saveButtonClicked = function () {
            Cursive.EditorPopup.clearErrors(this.rootElement);
            var processName = this.checkProcessName();
            if (processName === null)
                return;
            if (!this.checkParameterNames(this.inputListElement, 'input'))
                return;
            if (!this.checkParameterNames(this.outputListElement, 'output'))
                return;
            var isNew = false;
            if (this.editingProcess === null) {
                this.editingProcess = new Cursive.UserProcess(processName, [], [], [], [], false, '', null);
                this.editingProcess.workspace = this.workspace;
                this.workspace.userProcesses.add(processName, this.editingProcess);
                isNew = true;
            }
            else if (this.editingProcess.name != processName) {
                this.workspace.userProcesses.remove(this.editingProcess.name);
                this.editingProcess.name = processName;
                this.workspace.userProcesses.add(processName, this.editingProcess);
            }
            this.editingProcess.description = this.descriptionInput.value.trim();
            var folder = this.folderNameInput.value.trim();
            this.editingProcess.folder = folder == '' ? null : folder;
            this.updateProcessParameters(this.editingProcess.inputs, this.inputListElement.childNodes);
            this.updateProcessParameters(this.editingProcess.outputs, this.outputListElement.childNodes);
            this.updateReturnPaths(this.editingProcess.returnPaths, this.returnPathListElement.childNodes);
            if (isNew)
                this.editingProcess.createDefaultSteps();
            else
                this.workspace.processSignatureChanged(this.editingProcess);
            this.hide();
            this.workspace.processListDisplay.populateList();
            this.workspace.openProcess(this.editingProcess);
        };
        ProcessSignatureEdit.prototype.checkProcessName = function () {
            var processName = this.processNameInput.value.trim();
            if (processName == '') {
                Cursive.EditorPopup.showError(this.processNameInput, 'Please enter a name for this process.');
                return null;
            }
            var existingProcess = this.workspace.userProcesses.getByName(processName);
            var existingProcessType;
            if (existingProcess !== null) {
                existingProcessType = 'user';
            }
            else {
                existingProcess = this.workspace.systemProcesses.getByName(processName);
                existingProcessType = 'system';
            }
            if (existingProcess !== undefined && existingProcess !== this.editingProcess) {
                Cursive.EditorPopup.showError(this.processNameInput, 'There is already a ' + existingProcessType + ' process with this name. Please enter a different name.');
                return null;
            }
            return processName;
        };
        ProcessSignatureEdit.prototype.checkParameterNames = function (listElement, parameterType) {
            var nameInputs = listElement.querySelectorAll('input.name');
            var ok = true;
            var usedNames = {};
            for (var i = 0; i < nameInputs.length; i++) {
                var nameInput = nameInputs[i];
                if (usedNames.hasOwnProperty(nameInput.value)) {
                    Cursive.EditorPopup.showError(nameInput, 'Multiple ' + parameterType + 's have the same name. Please give this ' + parameterType + ' a different name.');
                    ok = false;
                }
                else
                    usedNames[nameInput.value] = true;
            }
            return ok;
        };
        ProcessSignatureEdit.prototype.updateProcessParameters = function (parameters, listItems) {
            var oldParameters = parameters.slice();
            for (var i = 0; i < listItems.length; i++) {
                var item = listItems[i];
                var typeInput = item.querySelector('.type');
                var dataType = this.workspace.types.getByName(typeInput.value);
                var nameInput = item.querySelector('.name');
                var name_2 = nameInput.value.trim();
                var origName = nameInput.getAttribute('data-orig');
                if (origName === null || origName == '') {
                    parameters.push(new Cursive.Parameter(name_2, dataType));
                    continue;
                }
                var origParam = null;
                for (var j = 0; j < oldParameters.length; j++) {
                    var origParam_1 = oldParameters[j];
                    if (origParam_1.name == origName) {
                        origParam_1.name = name_2;
                        origParam_1.type = dataType;
                        oldParameters.splice(j, 1);
                        break;
                    }
                }
            }
            for (var _i = 0, oldParameters_1 = oldParameters; _i < oldParameters_1.length; _i++) {
                var oldParam = oldParameters_1[_i];
                var pos = parameters.indexOf(oldParam);
                if (pos != -1)
                    parameters.splice(pos, 1);
            }
        };
        ProcessSignatureEdit.prototype.updateReturnPaths = function (returnPaths, listItems) {
            var oldReturnPaths = returnPaths.slice();
            for (var i = 0; i < listItems.length; i++) {
                var item = listItems[i];
                var nameInput = item.querySelector('.name');
                var name_3 = nameInput.value.trim();
                if (!nameInput.hasAttribute('data-orig')) {
                    returnPaths.push(name_3);
                    continue;
                }
                var origName = nameInput.getAttribute('data-orig');
                var pos = oldReturnPaths.indexOf(origName);
                if (name_3 != origName) {
                    returnPaths[pos] = name_3;
                    continue;
                }
                oldReturnPaths.splice(pos, 1);
            }
            for (var _i = 0, oldReturnPaths_1 = oldReturnPaths; _i < oldReturnPaths_1.length; _i++) {
                var oldPath = oldReturnPaths_1[_i];
                var pos = returnPaths.indexOf(oldPath);
                if (pos != -1)
                    returnPaths.splice(pos, 1);
            }
        };
        ProcessSignatureEdit.prototype.cancelButtonClicked = function () {
            this.hide();
            this.workspace.processEditor.show();
            this.workspace.variableListDisplay.show();
        };
        ProcessSignatureEdit.prototype.deleteButtonClicked = function () {
            this.hide();
            this.workspace.processRemoved(this.editingProcess);
        };
        ProcessSignatureEdit.prototype.show = function () {
            this.populateContent();
            this.inputListElement.innerHTML = '';
            this.outputListElement.innerHTML = '';
            this.returnPathListElement.innerHTML = '';
            this.rootElement.style.removeProperty('display');
        };
        ProcessSignatureEdit.prototype.hide = function () {
            this.rootElement.style.display = 'none';
        };
        ProcessSignatureEdit.prototype.showNew = function () {
            this.show();
            this.saveButton.innerText = 'add new process';
            this.cancelButton.style.display = 'none';
            this.deleteButton.style.display = 'none';
            this.editingProcess = null;
            this.folderNameInput.value = '';
            this.descriptionInput.value = '';
        };
        ProcessSignatureEdit.prototype.showExisting = function (process) {
            this.show();
            this.saveButton.innerText = 'update process';
            this.cancelButton.style.removeProperty('display');
            this.deleteButton.style.removeProperty('display');
            this.editingProcess = process;
            this.processNameInput.value = process.name;
            this.folderNameInput.value = process.folder === null ? '' : process.folder;
            this.descriptionInput.value = process.description;
            if (process.inputs !== null)
                for (var _i = 0, _a = process.inputs; _i < _a.length; _i++) {
                    var input = _a[_i];
                    this.inputListElement.appendChild(this.createProcessParameter(input));
                }
            if (process.outputs !== null)
                for (var _b = 0, _c = process.outputs; _b < _c.length; _b++) {
                    var output = _c[_b];
                    this.outputListElement.appendChild(this.createProcessParameter(output));
                }
            if (process.returnPaths !== null)
                for (var _d = 0, _e = process.returnPaths; _d < _e.length; _d++) {
                    var path = _e[_d];
                    this.returnPathListElement.appendChild(this.createReturnPath(path));
                }
        };
        ProcessSignatureEdit.prototype.createProcessParameter = function (param) {
            var element = document.createElement('li');
            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'name';
            element.appendChild(nameInput);
            if (param !== null) {
                nameInput.value = param.name;
                nameInput.setAttribute('data-orig', param.name);
            }
            element.appendChild(document.createTextNode(' '));
            var typeSelect = document.createElement('select');
            typeSelect.className = 'type';
            element.appendChild(typeSelect);
            for (var i = 0; i < this.workspace.types.count; i++) {
                var dataType = this.workspace.types.getByIndex(i);
                var option = document.createElement('option');
                option.value = dataType.name;
                option.text = dataType.name;
                option.style.color = dataType.color;
                if (param !== null && param.type === dataType)
                    option.selected = true;
                typeSelect.appendChild(option);
            }
            element.appendChild(document.createTextNode(' '));
            var removeLink = document.createElement('span');
            removeLink.className = 'remove link';
            removeLink.innerText = 'remove';
            element.appendChild(removeLink);
            removeLink.addEventListener('click', this.removeParameterClicked.bind(this, element));
            return element;
        };
        ProcessSignatureEdit.prototype.createReturnPath = function (path) {
            var element = document.createElement('li');
            var nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'name';
            element.appendChild(nameInput);
            if (path !== null) {
                nameInput.value = path;
                nameInput.setAttribute('data-orig', path);
            }
            element.appendChild(document.createTextNode(' '));
            var removeLink = document.createElement('span');
            removeLink.className = 'remove link';
            removeLink.innerText = 'remove';
            element.appendChild(removeLink);
            removeLink.addEventListener('click', this.removeParameterClicked.bind(this, element));
            return element;
        };
        ProcessSignatureEdit.prototype.removeParameterClicked = function (paramElement) {
            paramElement.parentElement.removeChild(paramElement);
        };
        return ProcessSignatureEdit;
    }());
    Cursive.ProcessSignatureEdit = ProcessSignatureEdit;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var EditorPopup = (function () {
        function EditorPopup(popupRoot) {
            this.rootElement = popupRoot;
            this.rootElement.className = 'popupOverlay';
            this.rootElement.addEventListener('click', this.hide.bind(this));
            var popupPanel = document.createElement('div');
            popupPanel.className = 'popupPanel';
            this.rootElement.appendChild(popupPanel);
            popupPanel.addEventListener('click', this.cancelEventBubble.bind(this));
            this.popupContent = document.createElement('div');
            popupPanel.appendChild(this.popupContent);
            this.hide();
        }
        EditorPopup.prototype.show = function () {
            this.rootElement.style.display = '';
        };
        EditorPopup.prototype.hide = function () {
            this.rootElement.style.display = 'none';
        };
        EditorPopup.prototype.cancelEventBubble = function (e) {
            e.cancelBubble = true;
        };
        EditorPopup.prototype.addField = function (name) {
            var row = document.createElement('label');
            row.className = 'row';
            this.popupContent.appendChild(row);
            if (name !== null) {
                var label = document.createElement('span');
                label.className = 'label';
                label.innerText = name;
                row.appendChild(label);
            }
            var wrapper = document.createElement('span');
            wrapper.className = 'value';
            row.appendChild(wrapper);
            return row;
        };
        EditorPopup.showError = function (element, message) {
            element.classList.add('error');
            var messageElement = document.createElement('div');
            messageElement.innerText = message;
            messageElement.className = 'errorMessage';
            element.parentElement.appendChild(messageElement);
        };
        EditorPopup.clearErrors = function (root) {
            var errorElements = root.querySelectorAll('.error');
            for (var i = 0; i < errorElements.length; i++)
                errorElements[i].classList.remove('error');
            var errorMessages = root.querySelectorAll('.errorMessage');
            for (var i = 0; i < errorMessages.length; i++) {
                var message = errorMessages[i];
                message.parentElement.removeChild(message);
            }
        };
        return EditorPopup;
    }());
    Cursive.EditorPopup = EditorPopup;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var ParameterEdit = (function () {
        function ParameterEdit(workspace, popup) {
            this.workspace = workspace;
            this.popup = popup;
        }
        ParameterEdit.prototype.populateContent = function () {
            this.popup.popupContent.innerHTML = '';
            this.prompt = document.createElement('div');
            this.prompt.className = 'parameter prompt';
            this.popup.popupContent.appendChild(this.prompt);
            this.fixedInputRow = this.popup.addField('fixed value');
            this.fixedInputValue = document.createElement('input');
            this.fixedInputValue.type = 'text';
            this.fixedInputValue.className = 'fixed value';
            this.fixedInputRow.appendChild(this.fixedInputValue);
            var variableContainer = this.popup.addField('variable');
            this.variableSelect = document.createElement('select');
            this.variableSelect.className = 'variable value';
            variableContainer.appendChild(this.variableSelect);
            var addVariable = document.createElement('span');
            addVariable.className = 'link addVariable';
            addVariable.innerText = 'add new';
            addVariable.addEventListener('click', this.addVariableClicked.bind(this));
            variableContainer.appendChild(document.createTextNode(' '));
            variableContainer.appendChild(addVariable);
            var fieldRow = this.popup.addField(null);
            fieldRow.classList.add('buttons');
            var okButton = document.createElement('button');
            okButton.setAttribute('type', 'button');
            okButton.addEventListener('click', this.okClicked.bind(this));
            okButton.innerText = 'OK';
            fieldRow.appendChild(okButton);
            var cancelButton = document.createElement('button');
            cancelButton.setAttribute('type', 'button');
            cancelButton.addEventListener('click', this.hide.bind(this));
            cancelButton.innerText = 'cancel';
            fieldRow.appendChild(cancelButton);
        };
        ParameterEdit.prototype.show = function (connector) {
            this.populateContent();
            this.connector = connector;
            var allowFixedInput = connector.isInput && connector.param.type.allowInput;
            if (allowFixedInput) {
                this.fixedInputRow.style.removeProperty('display');
                this.prompt.innerText = 'Enter a fixed variable for this input, or select a variable to map from. ';
                if (connector.param.type.guidance != null)
                    this.prompt.innerText += connector.param.type.guidance;
                this.prompt.classList.add('input');
                this.prompt.classList.add('fixed');
                this.prompt.classList.remove('output');
                if (connector.param.initialValue !== null)
                    this.fixedInputValue.value = connector.param.initialValue;
                else
                    this.fixedInputValue.value = '';
            }
            else {
                this.fixedInputRow.style.display = 'none';
                this.prompt.classList.remove('fixed');
                if (this.connector.isInput) {
                    this.prompt.innerText = 'Select a variable to map this input from.';
                    this.prompt.classList.add('input');
                    this.prompt.classList.remove('output');
                }
                else {
                    this.prompt.innerText = 'Select a variable to map this output to.';
                    this.prompt.classList.add('output');
                    this.prompt.classList.remove('input');
                }
                this.fixedInputValue.value = '';
            }
            this.variableSelect.innerHTML = '';
            var varOption = document.createElement('option');
            varOption.value = '';
            varOption.text = allowFixedInput ? '(use fixed value)' : '(please select)';
            this.variableSelect.options.add(varOption);
            var anyVariables = false;
            for (var _i = 0, _a = this.workspace.currentProcess.variables; _i < _a.length; _i++) {
                var variable = _a[_i];
                if (this.connector.isInput) {
                    if (!variable.type.isAssignableFrom(this.connector.param.type))
                        continue;
                }
                else {
                    if (!this.connector.param.type.isAssignableFrom(variable.type))
                        continue;
                }
                varOption = document.createElement('option');
                varOption.value = variable.name;
                varOption.text = variable.name;
                varOption.style.color = variable.type.color;
                varOption.selected = variable === connector.param.link;
                this.variableSelect.options.add(varOption);
                anyVariables = true;
            }
            if (anyVariables) {
                this.variableSelect.style.removeProperty('display');
            }
            else {
                this.variableSelect.style.display = 'none';
            }
            this.popup.show();
        };
        ParameterEdit.prototype.hide = function () {
            this.popup.hide();
        };
        ParameterEdit.prototype.okClicked = function () {
            Cursive.EditorPopup.clearErrors(this.popup.popupContent);
            var fixedInput = this.fixedInputValue.value;
            var selectedVariableName = this.variableSelect.value;
            var hasFixed = fixedInput != '';
            var hasVar = selectedVariableName != '';
            var allowFixed = this.connector.isInput && this.connector.param.type.allowInput;
            if (hasVar && hasFixed) {
                Cursive.EditorPopup.showError(this.fixedInputValue, 'Please provide either a fixed input value or a variable, not both.');
                return;
            }
            else if (!hasVar && !allowFixed) {
                Cursive.EditorPopup.showError(this.variableSelect, 'Please select a variable.');
                return;
            }
            if (hasFixed && !this.connector.param.type.isValid(fixedInput)) {
                Cursive.EditorPopup.showError(this.fixedInputValue, 'The value you entered is not valid.');
                return;
            }
            var previousVar = this.connector.param.link;
            if (previousVar !== null && previousVar.name != selectedVariableName) {
                var indexOnVar = previousVar.links.indexOf(this.connector.param);
                if (indexOnVar != -1)
                    previousVar.links.splice(indexOnVar, 1);
            }
            if (hasVar) {
                var variable = null;
                for (var _i = 0, _a = this.workspace.currentProcess.variables; _i < _a.length; _i++) {
                    var testVariable = _a[_i];
                    if (testVariable.name == selectedVariableName) {
                        variable = testVariable;
                        break;
                    }
                }
                if (variable === null) {
                    Cursive.EditorPopup.showError(this.variableSelect, 'Unrecognised variable.');
                    return;
                }
                this.connector.param.initialValue = null;
                this.connector.param.link = variable;
                if (variable !== previousVar) {
                    variable.links.push(this.connector.param);
                }
            }
            else {
                this.connector.param.initialValue = fixedInput;
                this.connector.param.link = null;
            }
            this.hide();
            this.workspace.currentProcess.validate();
            this.workspace.processListDisplay.populateList();
            this.workspace.processEditor.draw();
        };
        ParameterEdit.prototype.addVariableClicked = function () {
            this.workspace.variableEditor.showNew(this.connector, this.connector.param.type);
        };
        ParameterEdit.prototype.selectVariable = function (variable) {
            this.variableSelect.value = variable.name;
        };
        return ParameterEdit;
    }());
    Cursive.ParameterEdit = ParameterEdit;
})(Cursive || (Cursive = {}));
var Cursive;
(function (Cursive) {
    var VariableEdit = (function () {
        function VariableEdit(workspace, popup) {
            this.workspace = workspace;
            this.popup = popup;
            this.editingVariable = null;
        }
        VariableEdit.prototype.populateContent = function () {
            this.popup.popupContent.innerHTML = '';
            this.promptElement = document.createElement('div');
            this.popup.popupContent.appendChild(this.promptElement);
            var fieldRow = this.popup.addField('name');
            this.nameInput = document.createElement('input');
            this.nameInput.type = 'text';
            fieldRow.appendChild(this.nameInput);
            fieldRow = this.popup.addField('type');
            this.typeSelect = document.createElement('select');
            fieldRow.appendChild(this.typeSelect);
            for (var i = 0; i < this.workspace.types.count; i++) {
                var dataType = this.workspace.types.getByIndex(i);
                var typeOption = document.createElement('option');
                typeOption.value = dataType.name;
                typeOption.text = dataType.name;
                typeOption.style.color = dataType.color;
                this.typeSelect.options.add(typeOption);
            }
            this.deleteRow = this.popup.addField(null);
            this.deleteRow.classList.add('delete');
            var deleteLink = document.createElement('span');
            deleteLink.className = 'link delete';
            deleteLink.innerText = 'remove this variable';
            this.deleteRow.appendChild(deleteLink);
            deleteLink.addEventListener('click', this.deleteClicked.bind(this));
            fieldRow = this.popup.addField(null);
            fieldRow.classList.add('buttons');
            var okButton = document.createElement('button');
            okButton.setAttribute('type', 'button');
            okButton.addEventListener('click', this.okClicked.bind(this));
            okButton.innerText = 'OK';
            fieldRow.appendChild(okButton);
            var cancelButton = document.createElement('button');
            cancelButton.setAttribute('type', 'button');
            cancelButton.addEventListener('click', this.hide.bind(this));
            cancelButton.innerText = 'cancel';
            fieldRow.appendChild(cancelButton);
        };
        VariableEdit.prototype.showNew = function (showOnClose, selectedType) {
            if (showOnClose === void 0) { showOnClose = null; }
            if (selectedType === void 0) { selectedType = null; }
            this.showParameterOnClose = showOnClose;
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'Name your new variable, and select its type:';
            this.nameInput.value = '';
            this.typeSelect.selectedIndex = 0;
            this.typeSelect.disabled = false;
            this.deleteRow.style.display = 'none';
            this.editingVariable = null;
            if (selectedType != null)
                this.typeSelect.value = selectedType.name;
            this.nameInput.focus();
        };
        VariableEdit.prototype.showExisting = function (variable) {
            this.showParameterOnClose = null;
            this.editingVariable = variable;
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'You can rename a variable, but you can\'t change its type:';
            this.nameInput.value = variable.name;
            this.typeSelect.value = variable.type.name;
            this.typeSelect.disabled = true;
            this.deleteRow.style.removeProperty('display');
            this.editingVariable = variable;
            this.nameInput.focus();
        };
        VariableEdit.prototype.hide = function () {
            this.popup.hide();
            if (this.showParameterOnClose !== null) {
                this.workspace.parameterEditor.show(this.showParameterOnClose);
                if (this.editingVariable !== null) {
                    this.workspace.parameterEditor.selectVariable(this.editingVariable);
                }
                this.showParameterOnClose = null;
            }
            this.editingVariable = null;
        };
        VariableEdit.prototype.okClicked = function () {
            Cursive.EditorPopup.clearErrors(this.popup.popupContent);
            if (this.nameInput.value == '') {
                Cursive.EditorPopup.showError(this.nameInput, 'Please enter a name for this variable.');
                return;
            }
            else if (this.typeSelect.value == '') {
                Cursive.EditorPopup.showError(this.typeSelect, 'Please select a data type.');
                return;
            }
            if (this.editingVariable !== null)
                this.updateExistingVariable(this.editingVariable);
            else if (!this.createNewVariable())
                return;
            this.hide();
            this.workspace.variableListDisplay.populateList();
        };
        VariableEdit.prototype.createNewVariable = function () {
            var dataType = this.workspace.types.getByName(this.typeSelect.value);
            if (dataType === null) {
                Cursive.EditorPopup.showError(this.typeSelect, 'Please select a data type.');
                return false;
            }
            var variableName = this.nameInput.value;
            for (var _i = 0, _a = this.workspace.currentProcess.variables; _i < _a.length; _i++) {
                var existing = _a[_i];
                if (existing.name == variableName) {
                    Cursive.EditorPopup.showError(this.nameInput, 'Another variable already uses this name. Please enter a different name.');
                    return;
                }
            }
            this.editingVariable = new Cursive.Variable(variableName, dataType);
            this.workspace.currentProcess.variables.push(this.editingVariable);
            return true;
        };
        VariableEdit.prototype.updateExistingVariable = function (variable) {
            variable.name = this.nameInput.value;
        };
        VariableEdit.prototype.deleteClicked = function () {
            if (this.editingVariable === null)
                return;
            var index = this.workspace.currentProcess.variables.indexOf(this.editingVariable);
            this.workspace.currentProcess.variables.splice(index, 1);
            for (var _i = 0, _a = this.editingVariable.links; _i < _a.length; _i++) {
                var param = _a[_i];
                param.link = null;
            }
            this.workspace.currentProcess.validate();
            this.workspace.variableListDisplay.populateList();
            this.workspace.processListDisplay.populateList();
            this.workspace.processEditor.draw();
            this.hide();
        };
        return VariableEdit;
    }());
    Cursive.VariableEdit = VariableEdit;
})(Cursive || (Cursive = {}));
//# sourceMappingURL=cursive.js.map