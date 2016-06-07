"use strict";

var Workspace = function (workspaceXml, processList, mainContainer) {
	this.processList = processList;
	this.root = mainContainer;
	this.setupUI();
	this.loadWorkspace(workspaceXml);
	this.updateSize();
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
		
		console.log('dropped ' + (isSystem ? 'system' : 'user') + ' process "' + process.name + '" at ' + x + ', ' + y);
		this.draw();
	},
	draw: function() {
		
	},
	showError: function (message) {
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

var UserProcess = function () {
	
};

var Step = function () {
	
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