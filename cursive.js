"use strict";

var Workspace = function (workspaceXml, processList, mainContainer) {
	this.processList = processList;
	this.root = mainContainer;
	this.loadWorkspace(workspaceXml);
	
	this.currentProcess = new UserProcess('initial process', [], [], [], false); // TODO: required user process signatures ought to be loaded from the workspace
	this.userProcesses[this.currentProcess.name] = this.currentProcess;
	
	this.setupUI();
};

Workspace.prototype = {
	constructor: Workspace,
	updateSize: function () {
		var scrollSize = this.getScrollbarSize();
		
		var w = this.root.offsetWidth - scrollSize.width, h = this.root.offsetHeight - scrollSize.height;
		this.canvas.setAttribute('width', w);
		this.canvas.setAttribute('height', h);
		this.textDisplay.setAttribute('width', w);
		this.textDisplay.setAttribute('height', h);
		
		this.draw();
	},
	setupUI: function () {
		this.populateProcessList();
	
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
			null,
			null,
			function () { this.showProcessOptions(this.currentProcess); }.bind(this),
			null,
			null,
			'pointer'
		);
		this.fixedRegions = [titleRegion, editLinkRegion];
		this.moveStep = null; // TODO: remove this and handle all dragging in region code?
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
			var ctx = this.canvas.getContext('2d');
			var steps = this.currentProcess.steps;
			
			for (var i=0; i<steps.length; i++) {
				if (steps[i].bodyRegion.containsPoint(ctx, pos.x, pos.y)) {
					this.moveStep = steps[i];
					this.moveStep.drawText = true;
					this.moveOffsetX = this.moveStep.x - pos.x;
					this.moveOffsetY = this.moveStep.y - pos.y;
					this.draw();
					return;
				}
			}
			
			var region = this.getRegion(pos.x, pos.y);
			this.mouseDownRegion = region;
			if (region != null)
				region.mousedown(pos.x, pos.y);

			this.draw();
		}.bind(this));
		
		var stopMove = function (e) {
			if (this.moveStep != null) {
				this.moveStep.drawText = false;
				this.moveStep = null;
				this.draw();
			}
		}.bind(this);
		
		this.canvas.addEventListener('mouseup', function (e) {
			stopMove(e);
			
			var pos = this.getCanvasCoords(e);
			var region = this.getRegion(pos.x, pos.y);
			if (region != null) {
				region.mouseup(pos.x, pos.y);
				if (region == this.mouseDownRegion)
					region.click(pos.x, pos.y);
			}
			if (this.mouseDownRegion != null) {
				this.mouseDownRegion = null;
			}
			
			this.draw();
		}.bind(this));
		
		this.canvas.addEventListener('mouseout', function (e) {
			if (this.hoverRegion != null) {
				if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
					this.hoverRegion.unhover();
					this.hoverRegion = null;
					this.canvas.style.cursor = ''; 
					this.draw();
				}
			}
			
			stopMove(e);
		}.bind(this));
		
		this.canvas.addEventListener('mousemove', function (e) {
			if (this.currentProcess == null)
				return;
		
			var pos = this.getCanvasCoords(e);	
			
			var ctx = this.canvas.getContext('2d');
			ctx.strokeStyle = 'rgba(0,0,0,0)';
			
			// handle dragging
			if (this.moveStep != null) {
				var steps = this.currentProcess.steps;
				var blocking = null;
				
				for (var i=0; i<steps.length; i++) {
					if (steps[i] === this.moveStep)
						continue;
					
					if (steps[i].collisionRegion.containsPoint(ctx, pos.x + this.moveOffsetX, pos.y + this.moveOffsetY)) {
						blocking = steps[i];
						break;
					}
				}
				if (blocking == null) {
					this.moveStep.x = pos.x + this.moveOffsetX;
					this.moveStep.y = pos.y + this.moveOffsetY;
					this.draw();
				}
				return;
			}
			
			// check for "unhovering"
			if (this.hoverRegion != null) {
				if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
					this.hoverRegion.unhover();
					this.hoverRegion = null;
					this.canvas.style.cursor = ''; 
					this.draw();
				}
			}
		
			var region = this.getRegion(pos.x, pos.y);
			if (region != null/* && region != this.hoverRegion*/) {
				region.hover(pos.x, pos.y);
				this.hoverRegion = region;
				this.canvas.style.cursor = region.cursor;
				this.draw();
			}
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
			
			this.hoverRegion = null;
			this.showCanvas(true);
			this.currentProcess = process;
			this.populateProcessList();
			this.draw();
		}.bind(this);
		
		this.processList.childNodes[0].addEventListener('dblclick', this.showProcessOptions.bind(this, null));
		
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
		else if (process == this.currentProcess)
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
		this.populateProcessList();
	},
	dropProcess: function (name, x, y) {
		var process = this.systemProcesses[name];
		if (process === undefined)
			process = this.userProcesses[name];
		
		if (process === undefined) {
			//this.showError('Dropped unrecognised process: ' + name);
			return;
		}

		this.currentProcess.steps.push(new Step(process, x, y));
		this.draw();
	},
	draw: function() {
		var ctx = this.canvas.getContext('2d');
		ctx.clearRect(0, 0, this.root.offsetWidth, this.root.offsetHeight);
		ctx.lineCap = 'round';
		
		for (var i=0; i<this.fixedRegions.length; i++)
			this.fixedRegions[i].callDraw(ctx, this);
		
		var steps = this.currentProcess.steps, step;
		for (var i=0; i<steps.length; i++) {
			step = steps[i];
			for (var j=0; j<step.regions.length; j++)
				step.regions[j].callDraw(ctx, this);
		}
	},
	showError: function (message) {
		this.textDisplay.innerHTML = '<h3>An error has occurred</h3><p>Sorry. You might need to reload the page to continue.</p><p>The following error was encountered - you might want to report this:</p><pre>' + message + '</pre>';
		this.showCanvas(false);
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
	this.radius = 45;
	this.drawText = false;
	this.createRegions();
};

Step.prototype = {
	constructor: Step,
	createRegions: function() {
		this.connectors = [];
		this.regions = [];
		
		this.createConnectors(this.process.inputs, true);
		this.createConnectors(this.process.outputs, false);
		
		this.bodyRegion = new Region(
			function (ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI); ctx.stroke(); }.bind(this),
			this.drawBody.bind(this),
			function () { this.drawText = true; }.bind(this),
			function () { this.drawText = false; }.bind(this),
			null,
			null, // TODO: handle dragging here?
			null,
			'move'
		);
		this.regions.push(this.bodyRegion);
		
		this.collisionRegion = new Region( // twice the normal radius, so that another step can't overlap this one
			function (ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 2, 0, 2 * Math.PI); ctx.stroke(); }.bind(this)
		);
	},
	drawBody: function (ctx) {
		ctx.lineWidth = 2;
		ctx.strokeStyle = '#000';
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
	
	this.region = new Region(
		function (ctx) { },
		this.draw.bind(this)
	);
};

Connector.prototype = {
	constructor: Connector,
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
	},
	offset: function(x, y, distance, angle) {
		return {
			x: x + distance * Math.cos(angle),
			y: y + distance * Math.sin(angle)
		};
	}
};

var Link = function () {
	
};

var Region = function(definition, draw, hover, unhover, click, mousedown, mouseup, cursor) {
	var empty = function () {}
	this.define = definition == null ? empty : definition;
	this.draw = draw == null ? empty : draw;
	this.hover = hover == null ? empty : hover;
	this.unhover = unhover == null ? empty : unhover;
	this.click = click == null ? empty : click;
	this.mousedown = mousedown == null ? empty : mousedown;
	this.mouseup = mouseup == null ? empty : mouseup;
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
	callDraw: function (ctx,workspace) {
		this.draw(ctx, workspace.hoverRegion === this, workspace.mouseDownRegion === this);
	}
};

var Cursive = {};
Cursive.Workspace = Workspace;
Cursive.Parameter = Parameter;
Cursive.SystemProcess = SystemProcess;
Cursive.UserProcess = UserProcess;
Cursive.Step = Step;
Cursive.Link = Link;