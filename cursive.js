"use strict";

var Workspace = function (workspaceXml, processList, mainContainer) {
	this.processList = processList;
	this.loadWorkspace(workspaceXml);
	
	this.editor = new ProcessEditor(this, mainContainer);
	
	this.populateProcessList();
};

Workspace.prototype = {
	constructor: Workspace,	
	loadWorkspace: function (workspaceXml) {
		this.types = [];
		this.systemProcesses = {};
		this.userProcesses = {};
		
		var typesByName = {};
		var typeNodes = workspaceXml.getElementsByTagName('Type');
		var typeColors = this.allocateColors(typeNodes.length);
		
		for (var i=0; i<typeNodes.length; i++) {
			var name = typeNodes[i].getAttribute('name');
			var color = typeColors[i];
			
			if (typesByName.hasOwnProperty(name)) {
				this.showError('There are two types in the workspace with the same name: ' + name + '. Type names must be unique.');
				continue;
			}
			
			var type = new Type(name, color);
			this.types.push(type);
			typesByName[name] = type;
		}
		
		var procNodes = workspaceXml.getElementsByTagName('SystemProcess');
		for (var i=0; i<procNodes.length; i++) {
			var procNode = procNodes[i];
			var name = procNode.getAttribute('name');
			
			var inputs = [];
			var outputs = [];
			var returnPaths = [];
			
			var usedNames = {};
			var paramNodes = procNode.getElementsByTagName('Input');
			for (var j=0; j<paramNodes.length; j++) {
				var paramName = paramNodes[j].getAttribute('name');
				var paramTypeName = paramNodes[j].getAttribute('type');
				
				var paramType;
				if (typesByName.hasOwnProperty(paramTypeName))
					paramType = typesByName[paramTypeName];
				else {
					this.showError('The \'' + name + '\' system function has an input (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
					paramType = null;
				}	
				
				if (usedNames.hasOwnProperty(paramName))
					this.showError('The \'' + name + '\' system function has two inputs with the same name: ' + paramName + '. Input names must be unique within the a process.');
				else {
					usedNames[paramName] = null;
					inputs.push(new Parameter(paramName, paramType));
				}
			}
			
			usedNames = {};
			paramNodes = procNode.getElementsByTagName('Output');
			for (var j=0; j<paramNodes.length; j++) {
				var paramName = paramNodes[j].getAttribute('name');
				var paramTypeName = paramNodes[j].getAttribute('type');
				
				var paramType;
				if (typesByName.hasOwnProperty(paramTypeName))
					paramType = typesByName[paramTypeName];
				else {
					this.showError('The \'' + name + '\' system function has an output (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
					paramType = null;
				}
				
				if (usedNames.hasOwnProperty(paramName))
					this.showError('The \'' + name + '\' system function has two outputs with the same name: ' + paramName + '. Output names must be unique within the a process.');
				else {
					usedNames[paramName] = null;
					outputs.push(new Parameter(paramName, paramType));
				}
			}
			
			var returnPathParent = procNode.getElementsByTagName('ReturnPaths');
			if (returnPathParent.length > 0) {
				returnPathParent = returnPathParent[0];
				var returnPathNodes = returnPathParent.getElementsByTagName('Path');
				
				usedNames = {};
				for (var j=0; j<returnPathNodes.length; j++) {
					var path = returnPathNodes[j].getAttribute('name');
					
					if (usedNames.hasOwnProperty(path))
						this.showError('The \'' + name + '\' system function has two return paths with the same name: ' + name + '. Return paths must be unique within the a process.');
					else {
						usedNames[path] = null;
						returnPaths.push(path);	
					}
				}
			}
			
			var process = new SystemProcess(name, inputs, outputs, returnPaths);
			this.systemProcesses[name] = process;
		}
	},
	allocateColors: function (num) {
		var hue2rgb = function hue2rgb(p, q, t){
			if(t < 0) t += 1;
			if(t > 1) t -= 1;
			if(t < 1/6) return p + (q - p) * 6 * t;
			if(t < 1/2) return q;
			if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		};
		var hslToRgb = function (h, s, l) {
			var r, g, b;

			if(s == 0){
				r = g = b = l; // achromatic
			}else{

				var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				var p = 2 * l - q;
				r = hue2rgb(p, q, h + 1/3);
				g = hue2rgb(p, q, h);
				b = hue2rgb(p, q, h - 1/3);
			}

			return 'rgb(' + Math.round(r * 255) + ', ' + Math.round(g * 255) + ', ' + Math.round(b * 255) + ')';
		};
		
		var colors = [];
		var hueStep = 1 / num, hue = 0, sat = 1, lum = 0.45;
		for (var i=0; i<num; i++) {
			colors.push(hslToRgb(hue, sat, lum));
			hue += hueStep;
		}
		return colors;
	},
	loadProcesses: function (processXml) {
		this.populateProcessList();
	},
	saveProcesses: function () {
		return '<Processes />';
	},
	populateProcessList: function () {
		var content = '<li class="addNew';
		if (this.currentProcess === null)
			content += ' active';
		content += '">add new process</li>';
		
		for (var proc in this.userProcesses)
			content += this.writeProcessListItem(this.userProcesses[proc], true);
			
		for (var proc in this.systemProcesses)
			content += this.writeProcessListItem(this.systemProcesses[proc], false);
		
		this.processList.innerHTML = content;
		
		var dragStart = function (e) {
			e.dataTransfer.setData('process', e.target.getAttribute('data-process'));
		};
		
		var openUserProcess = function (e) {
			var name = e.currentTarget.getAttribute('data-process');
			var process = this.userProcesses[name];
			if (process === undefined) {
				this.showError('Clicked unrecognised process: ' + name);
				return;
			}
			
			this.editor.loadProcess(process);
			this.populateProcessList();
		}.bind(this);
		
		this.processList.childNodes[0].addEventListener('dblclick', this.editor.showProcessOptions.bind(this.editor, null));
		
		var userProcessCutoff = Object.keys(this.userProcesses).length;
		
		for (var i=1; i<this.processList.childNodes.length; i++) {
			var item = this.processList.childNodes[i];
			item.addEventListener('dragstart', dragStart);
			
			if (i <= userProcessCutoff)
				item.addEventListener('dblclick', openUserProcess);
		}
	},
	writeProcessListItem: function (process, editable) {
		var desc = '<li draggable="true" data-process="' + process.name + '" class="';
		
		if (!editable)
			desc += 'readonly';
		else if (process == this.editor.currentProcess)
			desc += 'active';
		
		desc += '"><div class="name">' + process.name + '</div>';
		
		if (process.inputs.length > 0) {
			desc += '<div class="props inputs"><span class="separator">inputs: </span>';
			for (var i=0; i<process.inputs.length; i++) {
				if (i > 0)
					desc += '<span class="separator">, </span>';
				desc += '<span class="prop" style="color: ' + process.inputs[i].type.color + '">' + process.inputs[i].name + '</span>';
			}
			desc += '</div>';
		}
		if (process.outputs.length > 0) {
			desc += '<div class="props output"><span class="separator">outputs: </span>';
			for (var i=0; i<process.outputs.length; i++) {
				if (i > 0)
					desc += '<span class="separator">, </span>';
				desc += '<span class="prop" style="color: ' + process.outputs[i].type.color + '">' + process.outputs[i].name + '</span>';
			}
			desc += '</div>';
		}
		if (process.returnPaths.length > 0) {
			desc += '<div class="props paths"><span class="separator">return paths: </span>';
			for (var i=0; i<process.returnPaths.length; i++) {
				if (i > 0)
					desc += '<span class="separator">, </span>';
				desc += '<span class="prop">' + process.returnPaths[i] + '</span>';
			}
			desc += '</div>';
		}
		desc += '</li>';
		return desc;
	},
	showError: function (message) {
		this.editor.textDisplay.innerHTML = '<h3>An error has occurred</h3><p>Sorry. You might need to reload the page to continue.</p><p>The following error was encountered - you might want to report this:</p><pre>' + message + '</pre>';
		this.editor.showCanvas(false);
		console.error(message);
	},
	getScrollbarSize: function() {
        var outer = document.createElement('div');
        outer.style.visibility = 'hidden';
        outer.style.width = '100px';
        outer.style.height = '100px';
        outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps

        document.body.appendChild(outer);

        var widthNoScroll = outer.offsetWidth;
        var heightNoScroll = outer.offsetHeight;

        // force scrollbars
        outer.style.overflow = 'scroll';

        // add innerdiv
        var inner = document.createElement('div');
        inner.style.width = '100%';
        inner.style.height = '100%';
        outer.appendChild(inner);

        var widthWithScroll = inner.offsetWidth;
        var heightWithScroll = inner.offsetHeight;

        // remove divs
        outer.parentNode.removeChild(outer);

        return {
            width: widthNoScroll - widthWithScroll,
            height: heightNoScroll - heightWithScroll
        }
    }
};

var ProcessEditor = function(workspace, root) {
	this.workspace = workspace;
	this.root = root;
	
	this.currentProcess = new UserProcess('initial process', [], [], [], false); // TODO: required user process signatures ought to be loaded from the workspace
	this.workspace.userProcesses[this.currentProcess.name] = this.currentProcess;
	
	this.setupUI();
};

ProcessEditor.prototype = {
	constructor: ProcessEditor,
	loadProcess: function (process) {
		this.hoverRegion = null;
		this.currentProcess = process;
		this.showCanvas(true);
		this.draw();
	},
	updateSize: function () {
		var scrollSize = this.workspace.getScrollbarSize();
		
		var w = this.root.offsetWidth - scrollSize.width, h = this.root.offsetHeight - scrollSize.height;
		this.canvas.setAttribute('width', w);
		this.canvas.setAttribute('height', h);
		this.textDisplay.setAttribute('width', w);
		this.textDisplay.setAttribute('height', h);
		
		this.draw();
	},
	setupUI: function () {
		this.root.innerHTML = '<canvas></canvas><div class="textDisplay"></div>';
		this.canvas = this.root.childNodes[0];
		this.textDisplay = this.root.childNodes[1];
		this.showCanvas(true);
		
		var titleRegion = new Region(
			null,
			function (ctx) {
				ctx.font = '36px sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.fillStyle = '#000';
				ctx.fillText(this.currentProcess.name, 32, 8);
			}.bind(this)
		);
		var editLinkRegion = new Region(
			function (ctx) { ctx.rect(32, 46, 100, 18); },
			function (ctx, isMouseOver, isMouseDown) {
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.font = '16px sans-serif';
				ctx.strokeStyle = ctx.fillStyle = isMouseDown ? '#000' : '#999';
				ctx.fillText('edit this process', 32, 46);
				
				if (isMouseOver) {
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(32, 64);
					ctx.lineTo(148, 64);
					ctx.stroke();
				}
			}.bind(this),
			'pointer'
		);
		editLinkRegion.click = function () { this.showProcessOptions(this.currentProcess); }.bind(this);
		
		this.fixedRegions = [titleRegion, editLinkRegion];
		this.hoverRegion = null;
		this.mouseDownRegion = null;
		
		this.canvas.addEventListener('dragover', function (e) {
			e.preventDefault();
		});
		
		this.canvas.addEventListener('drop', function (e) {
			e.preventDefault();
			var process = e.dataTransfer.getData('process');
			var pos = this.getCanvasCoords(e);
			
			this.dropProcess(process, pos.x, pos.y);
		}.bind(this));
		
		this.canvas.addEventListener('mousedown', function (e) {
			var pos = this.getCanvasCoords(e);
			var region = this.getRegion(pos.x, pos.y);
			this.mouseDownRegion = region;
			if (region != null && region.mousedown(pos.x, pos.y))
				this.draw();
		}.bind(this));
		
		this.canvas.addEventListener('mouseup', function (e) {
			var pos = this.getCanvasCoords(e);
			var region = this.getRegion(pos.x, pos.y);
			var draw = false;
			
			if (region != null) {
				draw = region.mouseup(pos.x, pos.y);
				
				if (region === this.mouseDownRegion)
					draw |= region.click(pos.x, pos.y);
			}
			if (this.mouseDownRegion != null) {
				if (region !== this.mouseDownRegion)
					draw |= this.mouseDownRegion.mouseup(pos.x, pos.y);
				this.mouseDownRegion = null;
				draw = true;
			}
			
			if (draw)
				this.draw();
		}.bind(this));
		
		this.canvas.addEventListener('mouseout', function (e) {
			if (this.hoverRegion != null) {
				var pos = this.getCanvasCoords(e);
				var ctx = this.canvas.getContext('2d');
				
				if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
					var draw = this.hoverRegion.unhover(pos.x, pos.y);
					this.hoverRegion = null;
					this.canvas.style.cursor = ''; 
					
					if (draw)
						this.draw();
				}
			}
		}.bind(this));
		
		this.canvas.addEventListener('mousemove', function (e) {
			if (this.currentProcess == null)
				return;
		
			var pos = this.getCanvasCoords(e);	
			
			var ctx = this.canvas.getContext('2d');
			ctx.strokeStyle = 'rgba(0,0,0,0)';
			
			// check for "unhovering"
			if (this.hoverRegion != null) {
				if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
					var draw = this.hoverRegion.unhover(pos.x, pos.y);
					this.hoverRegion = null;
					this.canvas.style.cursor = ''; 
					
					if (draw)
						this.draw();
				}
			}
		
			var draw = false;
			var region = this.getRegion(pos.x, pos.y);
			if (region != null) {
				if (region != this.hoverRegion) {
					draw = region.hover(pos.x, pos.y);
					this.hoverRegion = region;
					this.canvas.style.cursor = region.cursor;
				}
				else
					draw = region.move(pos.x, pos.y);
			}
			
			if (this.mouseDownRegion != null && this.mouseDownRegion != region)
				draw |= this.mouseDownRegion.move(pos.x, pos.y);
			
			if (draw)
				this.draw();
		}.bind(this));
		
		window.addEventListener('resize', this.updateSize.bind(this));
		this.updateSize();
	},
	getCanvasCoords: function (e) {
		var canvasPos = this.canvas.getBoundingClientRect();
		return { x: e.clientX - canvasPos.left, y: e.clientY - canvasPos.top };
	},
	getRegion: function (x, y) {
		var ctx = this.canvas.getContext('2d');
		ctx.strokeStyle = 'rgba(0,0,0,0)';
		
		// check regions from steps
		var steps = this.currentProcess.steps;
		for (var i=0; i<steps.length; i++) {
			var regions = steps[i].regions;
			for (var j=0; j<regions.length; j++) {
				var region = regions[j];
				if (region.containsPoint(ctx, x, y))
					return region;
			}
		}
		
		// check fixed regions
		for (var i=0; i<this.fixedRegions.length; i++) {
			var region = this.fixedRegions[i];
			if (region.containsPoint(ctx, x, y))
				return region;
		}
		
		return null;
	},
	getStep: function (x, y) {
		var ctx = this.canvas.getContext('2d');
		var steps = this.currentProcess.steps;
		for (var i=0; i<steps.length; i++) {
			var regions = steps[i].regions;
			for (var j=0; j<regions.length; j++) {
				var region = regions[j];
				if (region.containsPoint(ctx, x, y))
					return steps[i];
			}
		}
		return null;
	},
	showCanvas: function(show) {
		this.canvas.style = show ? '' : 'display:none;';
		this.textDisplay.style = show ? 'display:none;' : '';
	},
	showProcessOptions: function (process) {
		this.currentProcess = process;
		this.textDisplay.innerHTML = 'Options for adding a new process are shown here';
		
		// TODO: display function name box (with already-in-use check), list of inputs and outputs. Text that return paths are configured within the function, and aren't part of its signature.
		// populate these if process is not null, otherwise set them up blank
		
		this.showCanvas(false);
		this.workspace.populateProcessList();
	},
	dropProcess: function (name, x, y) {
		var process = this.workspace.systemProcesses[name];
		if (process === undefined)
			process = this.workspace.userProcesses[name];
		
		if (process === undefined) {
			//this.showError('Dropped unrecognised process: ' + name);
			return;
		}

		var step = new Step(process, x, y)
		step.editor = this;
		this.currentProcess.steps.push(step);
		this.draw();
	},
	draw: function() {
		var ctx = this.canvas.getContext('2d');
		ctx.clearRect(0, 0, this.root.offsetWidth, this.root.offsetHeight);
		ctx.lineCap = 'round';
		
		var steps = this.currentProcess.steps, step;
		for (var i=steps.length - 1; i>=0; i--) {
			step = steps[i];
			for (var j=0; j<step.returnPaths.length; j++)
				step.returnPaths[j].draw(ctx);
		}
		
		// draw in opposite order to getRegion, so that topmost (visible) regions are the ones you can interact with
		for (var i=steps.length - 1; i>=0; i--) {
			step = steps[i];
			for (var j=step.regions.length - 1; j>=0; j--)
				step.regions[j].callDraw(ctx, this);
		}
		
		for (var i=this.fixedRegions.length - 1; i>=0; i--)
			this.fixedRegions[i].callDraw(ctx, this);
	},
	drawCurve: function (ctx, startX, startY, cp1x, cp1y, cp2x, cp2y, endX, endY) {
		ctx.beginPath();
		ctx.moveTo(startX, startY);
		ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
		ctx.stroke();
	}
};

var Type = function(name, color) {
	this.name = name;
	this.color = color;
};

var Parameter = function(name, type) {
	this.name = name;
	this.type = type;
};

var SystemProcess = function (name, inputs, outputs, returnPaths) {
	this.name = name;
	this.inputs = inputs;
	this.outputs = outputs;
	this.returnPaths = returnPaths;
};

var UserProcess = function (name, inputs, outputs, returnPaths, fixedSignature) {
	this.name = name;
	this.inputs = inputs;
	this.outputs = outputs;
	this.returnPaths = returnPaths;
	this.fixedSignature = fixedSignature;
	
	this.steps = [];
};

var Step = function (process, x, y) {
	this.process = process;
	this.x = x;
	this.y = y;
	this.returnPaths = [];
	this.radius = 45;
	this.drawText = this.dragging = this.draggingPath = false;
	this.createRegions();
};

Step.prototype = {
	constructor: Step,
	createRegions: function() {
		this.connectors = [];
		this.regions = [];
		
		var returnStartSize = 2.5, returnStartOffset = 20;
		this.returnConnectorRegion = new Region(
			function (ctx) { ctx.arc(this.x, this.y + returnStartOffset, returnStartSize * 3.5, 0, 2 * Math.PI);}.bind(this),
			function (ctx, isMouseOver, isMouseDown) {
				ctx.lineWidth = 2;
				ctx.strokeStyle = isMouseOver || isMouseDown ? '#000' : '#999';
				ctx.beginPath();
				ctx.moveTo(this.x - returnStartSize, this.y + returnStartOffset);
				ctx.lineTo(this.x + returnStartSize, this.y + returnStartOffset);
				ctx.moveTo(this.x, this.y - returnStartSize + returnStartOffset);
				ctx.lineTo(this.x, this.y + returnStartSize + returnStartOffset);
				ctx.stroke();
			}.bind(this),
			'crosshair'
		);
		this.returnConnectorRegion.hover = function () { return true; };
		this.returnConnectorRegion.unhover = function () { return true; };
		
		this.returnConnectorRegion.mousedown = function (x,y) {
			this.draggingPath = true;
			return true;
		}.bind(this);
		this.returnConnectorRegion.mouseup = function (x,y) {
			if (!this.draggingPath)
				return false;
			
			var toStep = this.editor.getStep(x, y);
			if (toStep !== null) {
				var newPath = new ReturnPath(this, toStep, null);
				
				for (var i=0; i<this.returnPaths.length; i++) {
					var existing = this.returnPaths[i];
					existing.onlyPath = false;
					if (existing.name === null) {
						existing.warnDuplicate = newPath.warnDuplicate = true;
					}
				}
				
				newPath.onlyPath = this.returnPaths.length == 0;
				this.returnPaths.push(newPath);
			}
			
			this.dragEndX = undefined;
			this.dragEndY = undefined;
			this.draggingPath = false;
			return true;
		}.bind(this);
		this.returnConnectorRegion.move = function (x,y) {
			if (!this.draggingPath)
				return false;
			
			this.dragEndX = x;
			this.dragEndY = y;
			return true;
		}.bind(this);
		
		this.regions.push(this.returnConnectorRegion);
		
		
		this.bodyRegion = new Region(
			function (ctx) { ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI); }.bind(this),
			this.drawBody.bind(this),
			'move'
		);
		
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
			var steps = this.editor.currentProcess.steps;
			var ctx = this.editor.canvas.getContext('2d');

			for (var i=0; i<steps.length; i++) {
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
		
		this.collisionRegion = new Region( // twice the normal radius, so that another step can't overlap this one
			function (ctx) { ctx.arc(this.x, this.y, this.radius * 2, 0, 2 * Math.PI); }.bind(this)
		);
		
		this.createConnectors(this.process.inputs, true);
		this.createConnectors(this.process.outputs, false);
	},
	drawBody: function (ctx) {
		if (this.draggingPath)
			ReturnPath.drawPath(this.editor, ctx, this.x, this.y, this.dragEndX, this.dragEndY, null, false);
		
		ctx.strokeStyle = '#000';
		ctx.fillStyle = '#fff';
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		ctx.stroke();
		
		ctx.font = '16px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#000';
		ctx.fillText(this.process.name, this.x, this.y);
	},
	createConnectors: function(params, input) {
		var angularSpread;
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
		
		var centerAngle = input ? Math.PI : 0;
		
		var stepSize = params.length == 1 ? 0 : angularSpread / (params.length - 1);
		var currentAngle = input ? centerAngle + angularSpread / 2 : centerAngle - angularSpread / 2;
		if (input)
			stepSize = -stepSize;
				
		for (var i=0; i<params.length; i++) {
			var connector = new Connector(this, currentAngle, params[i], input);
			this.connectors.push(connector);
			this.regions.push(connector.region);
			currentAngle += stepSize;
		}
	}
};

var Connector = function (step, angle, param, isInput) {
	this.step = step;
	this.angle = angle;
	this.param = param;
	this.input = isInput;
	
	this.linkLength = 18;
	this.linkBranchLength = 6;
	this.outputBranchAngle = Math.PI * 0.8;
	this.inputBranchAngle = Math.PI - this.outputBranchAngle;
	this.textDistance = 24;
	
	this.createRegion();
};

Connector.prototype = {
	constructor: Connector,
	createRegion: function () {
		this.dragging = false;
		
		this.region = new Region(
			this.outline.bind(this),
			this.draw.bind(this),
			this.input ? 'default' : 'crosshair'
		);
		this.region.hover = function () { this.step.drawText = true; return true; }.bind(this);
		this.region.unhover = function () { this.step.drawText = false; return true; }.bind(this);
		
		if (!this.input) {
			this.region.mousedown = function (x,y) {
				this.dragging = true;
				return true;
			}.bind(this);
			this.region.mouseup = function (x,y) {
				if (!this.dragging)
					return false;
				
				this.dragEndX = undefined;
				this.dragEndY = undefined;
				this.dragging = false;
				return true;
			}.bind(this);
			this.region.move = function (x,y) {
				if (!this.dragging)
					return false;
				
				this.dragEndX = x;
				this.dragEndY = y;
				return true;
			}.bind(this);
		}
	},
	outline: function (ctx) {
		var halfAngle = Math.PI / 24;
		var pos = this.offset(this.step.x, this.step.y, this.step.radius + 2, this.angle - halfAngle);
		ctx.moveTo(pos.x, pos.y);
		pos = this.offset(this.step.x, this.step.y, this.step.radius + 2, this.angle + halfAngle);
		ctx.lineTo(pos.x, pos.y);
		pos = this.offset(this.step.x, this.step.y, this.step.radius + this.textDistance, this.angle + halfAngle);
		ctx.lineTo(pos.x, pos.y);
		pos = this.offset(this.step.x, this.step.y, this.step.radius + this.textDistance, this.angle - halfAngle);
		ctx.lineTo(pos.x, pos.y);
	},
	draw: function (ctx, isMouseOver, isMouseDown) {
		ctx.fillStyle = ctx.strokeStyle = this.param.type.color;
		ctx.font = '12px sans-serif';
		ctx.textAlign = this.input ? 'right' : 'left';
		ctx.textBaseline = 'middle';
		ctx.lineWidth = 4;
		
		ctx.beginPath();
		var startPos = this.offset(this.step.x, this.step.y, this.step.radius + 2, this.angle);
		ctx.moveTo(startPos.x, startPos.y);
		var endPos = this.offset(this.step.x, this.step.y, this.step.radius + this.linkLength, this.angle);
		ctx.lineTo(endPos.x, endPos.y);
		
		if (this.input) {
			var tmp = startPos;
			startPos = endPos;
			endPos = tmp;
		}
		
		var sidePos1 = this.offset(endPos.x, endPos.y, this.linkBranchLength, this.input ? this.angle + this.inputBranchAngle : this.angle + this.outputBranchAngle);
		var sidePos2 = this.offset(endPos.x, endPos.y, this.linkBranchLength, this.input ? this.angle - this.inputBranchAngle : this.angle - this.outputBranchAngle);
		ctx.moveTo(sidePos1.x, sidePos1.y);
		ctx.lineTo(endPos.x, endPos.y);
		ctx.lineTo(sidePos2.x, sidePos2.y);
		
		ctx.stroke();
		
		if (this.step.drawText) {
			var pos = this.offset(this.step.x, this.step.y, this.textDistance + this.step.radius, this.angle);
			ctx.fillText(this.param.name, pos.x, pos.y);
		}
		
		if (this.dragging) {
			ctx.beginPath();
			var cp1 = this.offset(this.step.x, this.step.y, this.step.radius * 3, this.angle);
			this.step.editor.drawCurve(ctx, endPos.x, endPos.y, cp1.x, cp1.y, this.dragEndX, this.dragEndY + 200, this.dragEndX, this.dragEndY);
		}
	},
	offset: function(x, y, distance, angle) {
		return {
			x: x + distance * Math.cos(angle),
			y: y + distance * Math.sin(angle)
		};
	}
};

var ReturnPath = function (fromStep, toStep, name) {
	this.fromStep = fromStep;
	this.toStep = toStep;
	this.name = name;
	this.warnDuplicate = false;
	this.onlyPath = false;
	
	this.nameRegion = new Region(
		function (ctx) {
			if (this.name === null && !this.warnDuplicate)
				return;
			
			// TODO: define path to surround name text / duplicate warning thing
			;
		}.bind(this),
		null,
		'pointer'
	);
	
	this.nameRegion.click = function (x, y) {
		console.log('showing name change input');
	}
	
	// return paths should encapsulate the logic for deciding arrow/text angle and control point placement. Am happy for hooking up I/O to show arrowheads
	
	// when drawing a "fake" return path (i.e. while dragging), the arrow angle & control point stuff is still needed. How best to do this, short of a static "draw curve" method in here?
};

ReturnPath.prototype = {
	constructor: ReturnPath,
	draw: function (ctx) {
		var writeName = this.name !== null ? this.name : this.onlyPath ? null : 'default';
		ReturnPath.drawPath(this.fromStep.editor, ctx, this.fromStep.x, this.fromStep.y, this.toStep.x, this.toStep.y, writeName, this.warnDuplicate);

		// TODO: add nameRegion to the regions property of the fromStep, so that it is detected for interactions, etc.
		// But don't want it to be used for detecting the region you have dragged a return path onto, which currently just uses that list.
		// How to handle this?
	}
};

ReturnPath.drawPath = function (editor, ctx, fromX, fromY, toX, toY, name, warnDuplicate) {
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 3;
	var cpOffset = Math.min(300, Math.abs(toX - fromX));
	var cp1x = fromX, cp1y = fromY + cpOffset, cp2x = toX, cp2y = toY - cpOffset;
	editor.drawCurve(ctx, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
	
	var mid1x = (fromX + cp1x + cp1x + cp2x) / 4, mid1y = (fromY + cp1y + cp1y + cp2y) / 4;
	var mid2x = (toX + cp2x + cp2x + cp1x) / 4, mid2y = (toY + cp2y + cp2y + cp1y) / 4;
	var angle = Math.atan2((mid2y - mid1y), (mid2x - mid1x));
	var midX = (mid1x + mid2x) / 2;
	var midY = (mid1y + mid2y) / 2;
	
	var halfWidth = 10, arrowLength = 20;
	
	ctx.save();
	
	ctx.translate(midX, midY);
	ctx.rotate(angle);

	ctx.shadowOffsetX = 0; 
	ctx.shadowOffsetY = 0; 
	ctx.fillStyle = '#fff';
	
	ctx.beginPath();
	ctx.moveTo(-arrowLength, halfWidth);
	ctx.lineTo(0,0);
	ctx.lineTo(-arrowLength, -halfWidth);
	ctx.closePath();
	ctx.fill();
	
	ctx.beginPath();
	ctx.moveTo(-arrowLength, halfWidth);
	ctx.lineTo(0,0);
	ctx.lineTo(-arrowLength, -halfWidth);
	ctx.closePath();
	ctx.stroke();
	
	ctx.translate(-26, 0);
	
	ctx.shadowBlur = 14;
	ctx.textAlign = 'right';
	
	if (angle > Math.PI / 2 || angle <= -Math.PI / 2) {
		ctx.rotate(Math.PI);
		ctx.textAlign = 'left';
	}
	
	if (name !== null)
	{
		ctx.shadowColor = warnDuplicate ? '#f99' : '#fff';
		
		ctx.fillStyle = '#000';
		ctx.font = '16px sans-serif';
		ctx.textBaseline = 'middle';
		
		for (var i=0; i<8; i++) // strengthen the shadow
			ctx.fillText(name, 0, 0);
	}
	
	ctx.restore();
};


var Region = function(definition, draw, cursor) {
	var empty = function () { return false; }
	this.define = definition == null ? empty : definition;
	this.draw = draw == null ? empty : draw;
	this.click = this.hover = this.unhover = this.move = this.mousedown = this.mouseup = empty;
	this.cursor = cursor == null ? '' : cursor;
};

Region.prototype = {
	constructor: Region,
	containsPoint: function(ctx,x,y) {
		ctx.beginPath();
		this.define(ctx);
		ctx.stroke();
		
		return ctx.isPointInPath(x,y);
	},
	callDraw: function (ctx, editor) {
		this.draw(ctx, editor.hoverRegion === this, editor.mouseDownRegion === this);
	}
};

var Cursive = {};
Cursive.Workspace = Workspace;