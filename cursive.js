"use strict";

var Workspace = function (workspaceXml, canvas) {
	this.canvas = canvas;
	this.initialize(workspaceXml);
};

Workspace.prototype = {
	constructor: Workspace,
	initialize: function (workspaceXml) {
		//console.log('xml', workspaceXml.documentElement);
		this.types = [];
		this.systemProcesses = [];
		this.userProcesses = [];
		
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
			this.systemProcesses.push(process);
		}
		//console.log('types', this.types);
		//console.log('processes', this.systemProcesses);
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
		var hueStep = 1 / num, hue = 0, sat = 1, lum = 0.8;
		for (var i=0; i<num; i++) {
			colors.push(hslToRgb(hue, sat, lum));
			hue += hueStep;
		}
		return colors;
	},
	loadProcesses: function (processXml) {
		
	},
	saveProcesses: function () {
		return '<Processes />';
	},
	showError: function (message) {
		console.error(message);
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