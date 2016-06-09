"use strict";

var Workspace = function (workspaceXml, processList, mainContainer) {
	this.processList = processList;
	this.root = mainContainer;
	this.moveStep = this.hoverStep = null;
	this.currentProcess = new UserProcess();
	this.setupUI();
	this.loadWorkspace(workspaceXml);
	this.updateSize();
	this.processes = [this.currentProcess];
};

Workspace.prototype = {
	constructor: Workspace,
	updateSize: function () {
		var scrollSize = this.getScrollbarSize();
		
		this.canvas.setAttribute('width', this.root.offsetWidth - scrollSize.width);
		this.canvas.setAttribute('height', this.root.offsetHeight - scrollSize.height);
		
		this.draw();
	},
	setupUI: function () {
		this.root.innerHTML = '<canvas></canvas>';
		this.canvas = this.root.childNodes[0];
		
		this.canvas.addEventListener('dragover', function (e) {
			e.preventDefault();
		});
		
		this.canvas.addEventListener('drop', function (e) {
			e.preventDefault();
			var process = e.dataTransfer.getData('process');
			var canvasPos = this.canvas.getBoundingClientRect();
			var dropX = e.clientX - canvasPos.left;
			var dropY = e.clientY - canvasPos.top;
			
			this.dropProcess(true, process, dropX, dropY);
		}.bind(this));
		
		this.canvas.addEventListener('mousedown', function (e) {
			var canvasPos = this.canvas.getBoundingClientRect();
			var x = e.clientX - canvasPos.left;
			var y = e.clientY - canvasPos.top;
			
			this.moveStep = this.findStepAt(x, y);
			if (this.moveStep !== null) {
				this.hoverStep = this.moveStep;
				this.moveStep.drawText = true;
				this.moveOffsetX = this.moveStep.x - x;
				this.moveOffsetY = this.moveStep.y - y;
				this.draw();
			}
		}.bind(this));
		
		var stopMove = function (e) {
			if (this.moveStep != null && this.moveStep != this.hoverStep)
				this.moveStep.drawText = false;
			this.moveStep = null;
			this.draw();
		}.bind(this);
		this.canvas.addEventListener('mouseup', stopMove);
		this.canvas.addEventListener('mouseout', stopMove);
		
		this.canvas.addEventListener('mousemove', function (e) {
			var canvasPos = this.canvas.getBoundingClientRect();
			var x = e.clientX - canvasPos.left;
			var y = e.clientY - canvasPos.top;
			
			if (this.moveStep === null) {
				var hover = this.findStepAt(x, y);
				if (hover != this.hoverStep) {
					if (this.hoverStep != null)
						this.hoverStep.drawText = false;
					this.hoverStep = hover;
					if (hover != null)
						hover.drawText = true;
					this.draw();
				}
				return;
			}
			
			var blocking = this.findStepAt(x + this.moveOffsetX, y + this.moveOffsetY, this.moveStep);
			if (blocking === null) {
				this.moveStep.x = x + this.moveOffsetX;
				this.moveStep.y = y + this.moveOffsetY;
				
				this.draw();
			}
		}.bind(this));
		
		window.addEventListener('resize', this.updateSize.bind(this));
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
		
		this.populateProcessList();
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
		var content = '';
		for (var proc in this.systemProcesses)
			content += this.writeProcessListItem(this.systemProcesses[proc]);
		
		this.processList.innerHTML = content;
		
		var dragStart = function (e) {
			e.dataTransfer.setData('process',e.target.getAttribute('data-process'));
		};
		for (var i=0; i<this.processList.childNodes.length; i++)
			this.processList.childNodes[i].addEventListener('dragstart', dragStart);
	},
	writeProcessListItem: function (process) {
		var desc = '<li draggable="true" data-process="' + process.name + '"><div class="name">' + process.name + '</div>';
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
	dropProcess: function (isSystem, name, x, y) {
		var list = isSystem ? this.systemProcesses : this.userProcesses;
		var process = list[name];
		
		if (process === undefined) {
			showError('Dropped unrecognised ' + (isSystem ? 'system' : 'user') + ' process: ' + name);
			return;
		}

		this.currentProcess.steps.push(new Step(process, x, y));
		this.draw();
	},
	draw: function() {
		var ctx = this.canvas.getContext('2d');
		ctx.clearRect(0, 0, this.root.offsetWidth, this.root.offsetHeight);
		// TODO: write the name of the current function at the top of the page
		
		var steps = this.currentProcess.steps;
		for (var i=0; i<steps.length; i++)
			steps[i].draw(ctx);
	},
	showError: function (message) {
		console.error(message);
	},
	findStepAt: function(x, y, ignoreStep) {
		var testRadius = ignoreStep === undefined ? 0 : ignoreStep.radius;
		var steps = this.currentProcess.steps;
		for (var i=0; i<steps.length; i++) {
			var step = steps[i];
			if (step === ignoreStep)
				continue;
			var distSq = (x-step.x)*(x-step.x) + (y-step.y)*(y-step.y);
			if (distSq <= (step.radius + testRadius) * (step.radius + testRadius))
				return step;
		}
		return null;
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

var UserProcess = function () {
	this.steps = [];
};

var Step = function (process, x, y) {
	this.process = process;
	this.x = x;
	this.y = y;
	this.radius = 45;
	this.linkLength = 16;
	this.textDistance = 21;
	this.drawText = false;
};

Step.prototype = {
	constructor: Step,
	draw: function (ctx) {
		this.drawConnectors(ctx, this.process.inputs, true);
		this.drawConnectors(ctx, this.process.outputs, false);
		
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
	drawConnectors: function(ctx, params, leftSide) {
		if (params.length == 0)
			return;
		
		var angularSpread;
		switch (params.length) {
			case 1: angularSpread = 0; break;
			case 2: angularSpread = 60; break;
			case 3: angularSpread = 90; break;
			case 4: angularSpread = 110; break;
			case 5: angularSpread = 120; break;
			case 6: angularSpread = 130; break;
			default: angularSpread = 140; break;
		}
		angularSpread *= Math.PI / 180;
		
		var centerAngle;
		if (leftSide) {
			centerAngle = Math.PI;
			ctx.textAlign = 'right';
		}
		else {
			centerAngle = 0;
			ctx.textAlign = 'left';
		}
		
		ctx.font = '12px sans-serif';
		ctx.textBaseline = 'middle';
		
		var stepSize = params.length == 1 ? 0 : angularSpread / (params.length - 1);
		var currentAngle = leftSide ? centerAngle + angularSpread / 2 : centerAngle - angularSpread / 2;
		if (leftSide)
			stepSize = -stepSize;
		
		ctx.lineWidth = 4;
		var textDist = this.textDistance + this.radius;
		
		for (var i=0; i<params.length; i++) {
			ctx.fillStyle = ctx.strokeStyle = params[i].type.color;
			ctx.beginPath();
			var pos = this.offset(this.radius, currentAngle);
			ctx.moveTo(pos.x, pos.y);
			pos = this.offset(this.radius + this.linkLength, currentAngle);
			ctx.lineTo(pos.x, pos.y);
			ctx.stroke();
			
			if (this.drawText) {
				pos = this.offset(textDist, currentAngle);
				ctx.fillText(params[i].name, pos.x, pos.y);
			}
			
			currentAngle += stepSize;
		}
	},
	offset: function(distance, angle) {
		return {
			x: this.x + distance * Math.cos(angle),
			y: this.y + distance * Math.sin(angle)
		};
	}
};
		
var Link = function () {
	
};

var Cursive = {};
Cursive.Workspace = Workspace;
Cursive.Parameter = Parameter;
Cursive.SystemProcess = SystemProcess;
Cursive.UserProcess = UserProcess;
Cursive.Step = Step;
Cursive.Link = Link;