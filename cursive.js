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
					inputs.push(new Variable(paramName, paramType));
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
					outputs.push(new Variable(paramName, paramType));
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
		// TODO: parse XML, add to existing processes
		this.populateProcessList();
	},
	saveProcesses: function () {
		// TODO: generate XML of all (user?) processes
		return '<Processes />';
	},
	populateProcessList: function () {
		var content = '<li class="addNew';
		if (this.editor.currentProcess === null)
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
	showPopup: function (contents, okAction) {
		this.editor.popupContent.innerHTML = contents;
		
		if (this.editor.popupEventListener != null)
			this.editor.popupOkButton.removeEventListener('click', this.editor.popupEventListener);
		
		if (okAction != null) {
			this.editor.popupOkButton.addEventListener('click', okAction);
			this.editor.popupEventListener = okAction;
		}
		else
			this.editor.popupEventListener = null;
		
		this.editor.popup.style.display = '';
		this.editor.overlay.style.display = '';
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
	this.highlightType = null;
	this.hoverVariable = null;
	this.setupUI();
	
	// TODO: required user process signatures ought to be loaded from the workspace
	var process = this.currentProcess = new UserProcess('initial process', [], [], [], false);
	this.workspace.userProcesses[process.name] = process;
	this.loadProcess(process);
};

ProcessEditor.prototype = {
	constructor: ProcessEditor,
	loadProcess: function (process) {
		this.hoverRegion = null;
		this.currentProcess = process;
		this.showCanvas(true);
		this.variablesUpdated();
		this.draw();
	},
	updateSize: function () {
		var scrollSize = this.workspace.getScrollbarSize();
		
		var w = this.canvasWidth = this.root.offsetWidth - scrollSize.width, h = this.root.offsetHeight - scrollSize.height;
		this.canvas.setAttribute('width', w);
		this.canvas.setAttribute('height', h);
		this.textDisplay.setAttribute('width', w);
		this.textDisplay.setAttribute('height', h);
		
		this.draw();
	},
	setupUI: function () {
		this.root.innerHTML = '<canvas></canvas><div class="textDisplay"></div><div class="popup" style="display:none"><div class="content"></div><div class="buttons"><button>OK</button></div></div><div class="overlay" style="display:none"></div>';
		this.canvas = this.root.childNodes[0];
		this.textDisplay = this.root.childNodes[1];
		this.popup = this.root.childNodes[2];
		this.popupContent = this.popup.childNodes[0];
		this.popupOkButton = this.popup.querySelector('.buttons > button');
		this.overlay = this.root.childNodes[3];
		
		this.popupOkButton.addEventListener('click', function () {
			this.popup.style.display = 'none';
			this.overlay.style.display = 'none';
		}.bind(this));
		
		this.showCanvas(true);
		
		this.headerCutoff = 68;
		this.canvasWidth = 999;
		
		var underlineText = function (ctx, text, x, y, drawLine) {
			ctx.fillText(text, x, y);
				
			if (drawLine) {
				var w = ctx.measureText(text).width;
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo(x, y + 1);
				ctx.lineTo(x + w, y + 1);
				ctx.stroke();
			}
		}
		
		var title = new Region(
			null,
			function (ctx) {
				ctx.font = '36px sans-serif';
				ctx.textAlign = 'left';
				ctx.textBaseline = 'top';
				ctx.fillStyle = '#000';
				ctx.fillText(this.currentProcess.name, 32, 8);
				
				this.titleEndX = 32 + ctx.measureText(this.currentProcess.name).width;
				
				ctx.lineWidth = 0.5;
				ctx.strokeStyle = '#000';
				ctx.beginPath();
				ctx.moveTo(0, this.headerCutoff);
				ctx.lineTo(this.canvasWidth, this.headerCutoff);
				ctx.stroke();
			}.bind(this)
		);
		var editLink = new Region(
			function (ctx) { ctx.rect(32, 44, 100, 18); },
			function (ctx, isMouseOver, isMouseDown) {
				ctx.textAlign = 'left';
				ctx.textBaseline = 'bottom';
				ctx.font = '16px sans-serif';
				ctx.strokeStyle = ctx.fillStyle = isMouseDown ? '#000' : '#999';
				
				underlineText(ctx, 'edit this process', 32, 62, isMouseOver);
			}.bind(this),
			'pointer'
		);
		editLink.click = function () { this.showProcessOptions(this.currentProcess); }.bind(this);
		editLink.hover = function() { return true; }
		editLink.unhover = function() { return true; }
		
		var addVariable = new Region(
			function (ctx) {
				ctx.rect(this.titleEndX + 16, 22, 100, 16);
			}.bind(this),
			function (ctx, isMouseOver, isMouseDown) {
				ctx.textAlign = 'left';
				ctx.textBaseline = 'bottom';
				ctx.font = '16px sans-serif';
				ctx.strokeStyle = ctx.fillStyle = isMouseDown ? '#000' : '#999';
				
				underlineText(ctx, 'add variable', this.titleEndX + 16, 40, isMouseOver);
			}.bind(this),
			'pointer'
		);
		addVariable.click = function () {
			var content = 'Name your new variable, and select its type:<br/><input type="text" class="name" value="'
			// content += name
			content += '" /> <select class="type">';
			
			for (var i=0; i<this.workspace.types.length; i++) {
				var type = this.workspace.types[i];
				content += '<option value="' + i + '" style="color:' + type.color + ';"';
				//content +=' selected="selected"';
				content += '>' + type.name + '</option>';
			}
			content += '</select>';
			
			// TODO: allow editing existing variables
			
			// TODO: link to delete existing variables
			
			var action = function () {
				var name = this.popupContent.querySelector('.name').value;
				var warnDuplicate = false;
				
				for (var i=0; i<this.currentProcess.variables.length; i++) {
					var existing = this.currentProcess.variables[i];
					if (existing !== this && existing.name === this.name) {
						warnDuplicate = true;
						break;
					}
				}
				
				if (warnDuplicate)
					return false; // TODO: have a way of stopping the popup from closing
				
				var type = this.workspace.types[parseInt(this.popupContent.querySelector('.type').value)];
				
				this.currentProcess.variables.push(new Variable(name, type));
				this.variablesUpdated();
				this.draw();
			}.bind(this);
			
			this.workspace.showPopup(content, action);
		}.bind(this);
		addVariable.hover = function() { return true; }
		addVariable.unhover = function() { return true; }
		
		this.fixedRegions = [addVariable, title, editLink];
		this.variableRegions = [];
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
		setTimeout(this.updateSize.bind(this), 0);
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
			var step = steps[i];
			var regions = step.regions;
			for (var j=0; j<regions.length; j++) {
				var region = regions[j];
				if (region.containsPoint(ctx, x, y))
					return region;
			}
			var paths = step.returnPaths;
			for (var j=0; j<paths.length; j++) {
				var path = paths[j];
				for (var k=0; k<path.regions.length; k++) {
					var region = path.regions[k];
					if (region.containsPoint(ctx, x, y))
						return region;
				}
			}
		}
		
		// check fixed regions
		for (var i=0; i<this.fixedRegions.length; i++) {
			var region = this.fixedRegions[i];
			if (region.containsPoint(ctx, x, y))
				return region;
		}
		
		// check variable regions
		for (var i=0; i<this.variableRegions.length; i++) {
			var region = this.variableRegions[i];
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
		
		var output = '<p><label for="txtProcessName">Process name</label>: <input id="txtProcessName" type="text"';
		if (process !== null)
			output += ' value="' + process.name + '"';
		
		output += ' /></p>'
		
		var writeParameter = function (param) {
			output = '<input type="text" class="name" value="'
			
			if (param !== null)
				output += param.name + '" data-orig="' + param.name;
			
			output += '" /> <select class="type">';
			
			for (var i=0; i<this.types.length; i++) {
				var type = this.types[i];
				output += '<option value="' + i + '" style="color:' + type.color + ';"';
				if (param != null && param.type === type)
					output +=' selected="selected"';
				output += '>' + type.name + '</option>';
			}
			
			output += '</select> <a href="#" class="remove" onclick="this.parentNode.parentNode.removeChild(this.parentNode); return false">remove</a>';
			return output;
		}.bind(this.workspace);
		
		output += '<fieldset class="inputs"><legend>inputs</legend><ol id="inputList">';
		
		if (process !== null)
			for (var i=0; i<process.inputs.length; i++)
				output += '<li>' + writeParameter(process.inputs[i]) + '</li>';
		
		output += '</ol><a href="#" id="lnkAddInput" onclick="return false">add new input</a></fieldset>';
		
		output += '<fieldset class="outputs"><legend>outputs</legend><ol id="outputList">';
		
		if (process !== null)
			for (var i=0; i<process.outputs.length; i++)
				output += '<li>' + writeParameter(process.outputs[i]) + '</li>';
		
		output += '</ol><a href="#" id="lnkAddOutput" onclick="return false">add new output</a></fieldset>';
		
		output += '<p>Note that return paths are configured within the process, and aren\'t set up through this screen.</p>';
		
		output += '<input id="btnSaveProcess" type="button" value="';
		if (process === null)
			output += 'add';
		else
			output += 'update';
		output += ' function" />';
		
		this.textDisplay.innerHTML = output;
		
		document.getElementById('lnkAddInput').addEventListener('click', function () {
			var item = document.createElement('li');
			item.innerHTML = writeParameter(null);
			document.getElementById('inputList').appendChild(item);
			return false;
		});
		document.getElementById('lnkAddOutput').addEventListener('click', function () {
		var item = document.createElement('li');
			item.innerHTML = writeParameter(null);
			document.getElementById('outputList').appendChild(item);
			return false;
		});
		
		document.getElementById('btnSaveProcess').addEventListener('click', function () {
			var name = document.getElementById('txtProcessName').value.trim();
			
			var processes = this.workspace.systemProcesses;
			for (var i=0; i<processes.length; i++)
				if (processes[i].name.trim() == name) {
					this.workspace.showPopup('A system process already uses the name \'' + name + '\'. Please use a different one.');
					return;
				}
				
			processes = this.workspace.userProcesses;
			for (var i=0; i<processes.length; i++)
				if (processes[i] != this.currentProcess && processes[i].name.trim() == name) {
					this.workspace.showPopup('Another process already uses the name \'' + name + '\'. Please use a different one.');
					return;
				}
			
			var updateParameters = function(parameters, listItems) {
				var oldParameters = parameters.slice();
				
				for (var i=0; i<listItems.length; i++) {
					var item = listItems[i];
					
					var typeIndex = parseInt(item.querySelector('.type').value);
					if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= this.types.length) {
						continue;
					}
					var type = this.types[typeIndex];
					
					var textbox = item.querySelector('.name');
					var name = textbox.value.trim();
					
					var origName = textbox.getAttribute('data-orig');
					if ( origName === null || origName == '') {
						parameters.push(new Variable(name, type));
						continue; // new parameter
					}
					
					var origParam = null; // existing parameter
					for (var j=0; j<oldParameters.length; j++) {
						var origParam = oldParameters[j];
						if (origParam.name == origName) {
							origParam.name = name;
							origParam.type = type;
							oldParameters.splice(j, 1);
							break;
						}
					}
				}
				
				// remove any parameters which weren't in the UI (cos they must have been removed)
				for (var i=0; i<oldParameters.length; i++) {
					var oldParam = oldParameters[i];
					for (var j=0; j<parameters.length; j++)
						if (parameters[j] === oldParam)
							parameters.splice(j, 1);
				}
			}.bind(this.workspace);
				
			var inputs = this.textDisplay.querySelectorAll('#inputList li');
			var outputs = this.textDisplay.querySelectorAll('#outputList li');
			
			var paramNames = {};
			for (var i=0; i<inputs.length; i++) {
				var paramName = inputs[i].querySelector('.name').value.trim();
				if (paramNames.hasOwnProperty(paramName)) {
					this.workspace.showPopup('Multiple inputs have the same name: \'' + paramName + '\'. Please ensure input are unique.');
					return;
				}
				else
					paramNames[paramName] = true;
			}
			paramNames = {};
			for (var i=0; i<outputs.length; i++) {
				var paramName = outputs[i].querySelector('.name').value.trim();
				if (paramNames.hasOwnProperty(paramName)) {
					this.workspace.showPopup('Multiple outputs have the same name: \'' + paramName + '\'. Please ensure output are unique.');
					return;
				}
				else
					paramNames[paramName] = true;
			}
			
			if (this.currentProcess === null) { // create new process
				this.currentProcess = new UserProcess(name, [], [], [], false);
			}
			else { // unlink existing process's old name
				delete this.workspace.userProcesses[this.currentProcess.name];
				this.currentProcess.name = name;
			}
			
			
			this.workspace.userProcesses[name] = this.currentProcess;
			
			updateParameters(this.currentProcess.inputs, inputs);
			updateParameters(this.currentProcess.outputs, outputs);
			
			this.workspace.populateProcessList();
			this.showCanvas(true);
			this.draw();
		}.bind(this));
		
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
	variablesUpdated: function () {
		var ctx = this.canvas.getContext('2d');
		this.variableRegions = [];
		var vars = this.currentProcess.variables;
		
		var createRegion = function(variable, x) {
			var textWidth = ctx.measureText(variable.name).width;
			var regionWidth = textWidth + xPadding + xPadding;
			var textRegion = new Region(
				function (ctx) { ctx.rect(x, 22, regionWidth, 20); },
				function (ctx, isMouseOver, isMouseDown) {
					ctx.textAlign = 'left';
					ctx.textBaseline = 'bottom';
					ctx.font = '16px sans-serif';
					ctx.strokeStyle = ctx.fillStyle = variable.type.color;
					
					ctx.fillText(variable.name, x + xPadding, 40);
					
					if (isMouseOver) {
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(x + xPadding, 41);
						ctx.lineTo(x + xPadding + textWidth, 41);
						ctx.stroke();
					}
				},
				'pointer'
			);
			
			textRegion.click = function () {
				console.log('show region edit dialog');
			};
			
			var hover = function () {
				this.hoverVariable = variable;
				return true;
			}.bind(this);
			
			var unhover = function () {
				this.hoverVariable = null;
				return true;
			}.bind(this);
			
			textRegion.hover = hover;
			textRegion.unhover = unhover;
			/*
			// TODO: allow dragging these to I/O connectors of the same type
			textRegion.mousedown = this.startDragPath.bind(this);
			textRegion.mouseup = this.stopDragPath.bind(this);
			textRegion.move = this.moveDragPath.bind(this);
			*/
			
			textRegion.centerX = x + xPadding + textWidth / 2;
			this.variableRegions.push(textRegion);
			
			var connectorRegion = new Region(
				function (ctx) { ctx.rect(x, 22, regionWidth, 36); },
				function (ctx, isMouseOver, isMouseDown) {
					if (!isMouseOver && this.highlightType !== variable.type)
						return;
					
					ctx.strokeStyle = ctx.fillStyle = variable.type.color;
				
					var midX = x + xPadding + textWidth / 2;
					var halfLength = 4, topY = 43;
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.moveTo(midX, topY);
					ctx.lineTo(midX, topY + halfLength + halfLength);
					ctx.moveTo(midX - halfLength, topY + halfLength);
					ctx.lineTo(midX + halfLength, topY + halfLength);
					ctx.stroke();
				}.bind(this),
				'crosshair'
			);
			connectorRegion.hover = hover;
			connectorRegion.unhover = unhover;
			this.variableRegions.push(connectorRegion);
			
			return regionWidth;
		}.bind(this);
		
		var x = this.titleEndX + 120;
		var xPadding = 5;
		
		for (var i=0; i<vars.length; i++) {
			x += createRegion(vars[i], x) + xPadding;
		}
	},
	highlightVariables(type) {
		this.highlightType = type;
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
			
			if (step.draggingPath)
				ReturnPath.drawPath(this, ctx, step.x, step.y, step.dragEndX, step.dragEndY);
		}
		
		// draw in opposite order to getRegion, so that topmost (visible) regions are the ones you can interact with
		for (var i=steps.length - 1; i>=0; i--) {
			step = steps[i];
			for (var j=step.regions.length - 1; j>=0; j--)
				step.regions[j].callDraw(ctx, this);
				
			var paths = step.returnPaths;
			for (var j=paths.length - 1; j>=0; j--) {
				var path = paths[j];
				for (var k=0; k<path.regions.length; k++)
					path.regions[k].callDraw(ctx, this);
			}
		}
		
		for (var i=this.fixedRegions.length - 1; i>=0; i--)
			this.fixedRegions[i].callDraw(ctx, this);
			
		for (var i=this.variableRegions.length - 1; i>=0; i--)
			this.variableRegions[i].callDraw(ctx, this);
		
		if (this.hoverVariable !== null) {
			var varNumber = this.currentProcess.variables.indexOf(this.hoverVariable);
			var region = this.variableRegions[varNumber * 2];
			var fromX = region.centerX, fromY = 50;
			
			for (var i=0; i<this.hoverVariable.links.length; i++)
				Connector.drawPath(ctx, this.hoverVariable.links[i], fromX, fromY);
		}
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

var Variable = function(name, type) {
	this.name = name;
	this.type = type;
	this.links = [];
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
	this.variables = [];
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
		this.returnConnectorRegion.mousedown = this.startDragPath.bind(this);
		this.returnConnectorRegion.mouseup = this.stopDragPath.bind(this);
		this.returnConnectorRegion.move = this.moveDragPath.bind(this);
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
	},
	startDragPath: function (x,y) {
		this.draggingPath = true;
		return true;
	},
	stopDragPath: function (x,y) {
		if (!this.draggingPath)
			return false;
		
		var toStep = this.editor.getStep(x, y);
		if (toStep !== null) {
			var existingPath = null;
			for (var i=0; i<this.returnPaths.length; i++)
				if (toStep === this.returnPaths[i].toStep) {
					existingPath = this.returnPaths[i];
					// TODO: explain to user that they should set up multiple return paths to the same destination through a single link
					break;
				}
			
			if (existingPath === null) {
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
		}
		
		this.dragEndX = undefined;
		this.dragEndY = undefined;
		this.draggingPath = false;
		return true;
	},
	moveDragPath: function (x,y) {
		if (!this.draggingPath)
			return false;
		
		this.dragEndX = x;
		this.dragEndY = y;
		return true;
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
	this.dragging = false;
	
	this.createRegion();
};

Connector.prototype = {
	constructor: Connector,
	createRegion: function () {
		this.region = new Region(
			this.outline.bind(this),
			this.draw.bind(this),
			'crosshair'
		);
		this.region.hover = function () { this.step.drawText = true; return true; }.bind(this);
		this.region.unhover = function () { this.step.drawText = false; return true; }.bind(this);
		
		this.region.mousedown = function (x,y) {
			this.dragging = true;
			this.step.editor.highlightVariables(this.param.type);
			this.step.editor.draw();
			return true;
		}.bind(this);
		this.region.mouseup = function (x,y) {
			if (!this.dragging)
				return false;
				
			this.step.editor.highlightVariables(null);
			
			var editor = this.step.editor;
			var ctx = editor.canvas.getContext('2d');
			var variables = editor.currentProcess.variables;
			for (var i=0; i<editor.variableRegions.length; i++) {
				var region = editor.variableRegions[i];
				
				if (!region.containsPoint(ctx, x, y))
					continue;
				
				var variableIndex = i % 2 == 0 ? i / 2 : (i-1) / 2; // there's two regions for each
				var variable = variables[variableIndex];
				
				if (variable.type !== this.param.type)
					break;
				
				for (var j=0; j<this.param.links.length; j++) {
					var oldVarLinks = this.param.links[j].links;
					var index = oldVarLinks.indexOf(this);
					if (index > -1)
						oldVarLinks.splice(index, 1);
				}
				this.param.links = [variable];
				variable.links.push(this);
			}
			
			this.dragEndX = undefined;
			this.dragEndY = undefined;
			this.dragging = false;
			editor.draw();
			return true;
		}.bind(this);
		this.region.move = function (x,y) {
			if (!this.dragging)
				return false;
			
			this.dragEndX = x;
			this.dragEndY = y;
			return true;
		}.bind(this);
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
		
		if (this.dragging)
			Connector.drawPath(ctx, this, this.dragEndX, this.dragEndY);
	},
	offset: function(x, y, distance, angle) {
		return {
			x: x + distance * Math.cos(angle),
			y: y + distance * Math.sin(angle)
		};
	}
};

Connector.drawPath = function (ctx, connector, toX, toY) {
	ctx.strokeStyle = connector.param.type.color;
	ctx.lineWidth = 3;

	var edgePos = connector.offset(connector.step.x, connector.step.y, connector.step.radius + connector.linkLength, connector.angle);
	var cp1 = connector.offset(connector.step.x, connector.step.y, connector.step.radius * 5, connector.angle);
	var cp2x = toX, cp2y = toY + 200;
	
	connector.step.editor.drawCurve(ctx, edgePos.x, edgePos.y, cp1.x, cp1.y, cp2x, cp2y, toX, toY);
};

var ReturnPath = function (fromStep, toStep, name) {
	this.fromStep = fromStep;
	this.toStep = toStep;
	this.name = name;
	this.warnDuplicate = false;
	this.onlyPath = false;
	this.nameLength = 30;
	
	var pathName = new Region(
		function (ctx) {
			if (this.getNameToWrite() === null)
				return;
			
			ctx.save();
			
			var transform = this.arrowTransform;
			ctx.translate(transform.x, transform.y);
			ctx.rotate(transform.angle);
			ctx.translate(-26, 0);
			
			ctx.rect(-this.nameLength - 5, -10, this.nameLength + 10, 20);
			
			ctx.restore();
		}.bind(this),
		this.drawName.bind(this),
		'pointer'
	);
	
	pathName.click = function (x, y) {
		var paths = this.fromStep.process.returnPaths;
		var content, action;
		if (paths.length < 2)
			content = 'Only one path can come from this process,<br />as it doesn\'t have multiple return paths.<br />Please remove the extra path(s).';
		else {
			content = 'Select the return path to use:<br/><select class="returnPath"><option value="">[default]</option>';
			for (var i=0; i<paths.length; i++)
				content += '<option value="' + paths[i] + '">' + paths[i] + '</option>';
			content += '</select>';
			
			action = function () {
				this.name = this.fromStep.editor.popupContent.querySelector('.returnPath').value;
				this.warnDuplicate = false;
				
				for (var i=0; i<this.fromStep.returnPaths.length; i++) {
					var existing = this.fromStep.returnPaths[i];
					if (existing !== this && existing.name === this.name)
						existing.warnDuplicate = this.warnDuplicate = true;
				}
				
				this.fromStep.editor.draw();
			}.bind(this);
		}
		
		this.fromStep.editor.workspace.showPopup(content, action);
	}.bind(this);
	
	var arrowHead = new Region(
		function (ctx) {
			ctx.save();			
			var transform = this.arrowTransform;
			ctx.translate(transform.x, transform.y);
			ctx.rotate(transform.angle);
			
			var halfWidth = 8, arrowLength = 20;
			ctx.rect(-arrowLength - 1, -halfWidth - 1, arrowLength + 2, halfWidth * 2 + 2);
			
			ctx.restore();
		}.bind(this),
		null, // drawn as part of the line
		'move'
	);
	
	arrowHead.hover = function () { return true; };
	arrowHead.unhover = function () { return true; };
	arrowHead.mousedown = function (x, y) {
		// first, disconnect this return path - it must be dragged somewhere to avoid deleting it
		var paths = this.fromStep.returnPaths;
		for (var i=0; i<paths.length; i++)
			if (paths[i] === this) {
				paths.splice(i, 1);
				break;
			}

		return this.fromStep.startDragPath.call(this.fromStep);
	}.bind(this);
	arrowHead.mouseup = this.fromStep.stopDragPath.bind(this.fromStep);
	arrowHead.move = this.fromStep.moveDragPath.bind(this.fromStep);
	this.regions = [pathName, arrowHead];
};

ReturnPath.prototype = {
	constructor: ReturnPath,
	draw: function (ctx) {
		this.arrowTransform = ReturnPath.drawPath(this.fromStep.editor, ctx, this.fromStep.x, this.fromStep.y, this.toStep.x, this.toStep.y);
	},
	getNameToWrite: function () {
		return this.name !== null ? this.name : this.onlyPath ? null : 'default';
	},
	drawName: function (ctx) {
		var writeName = this.getNameToWrite();
		if (writeName === null)
			return;
		
		ctx.save();
		var transform = this.arrowTransform; // not actually a transform, but hey
		ctx.translate(transform.x, transform.y);
		ctx.rotate(transform.angle);
		ctx.translate(-26, 0);
	
		ctx.shadowBlur = 14;
		ctx.textAlign = 'right';
		
		if (transform.angle > Math.PI / 2 || transform.angle <= -Math.PI / 2) {
			ctx.rotate(Math.PI);
			ctx.textAlign = 'left';
		}
		
		if (writeName !== null)
		{
			ctx.shadowColor = this.warnDuplicate ? '#f99' : '#fff';
			
			ctx.fillStyle = '#000';
			ctx.font = '16px sans-serif';
			ctx.textBaseline = 'middle';
			
			this.nameLength = ctx.measureText(writeName).width;
			for (var i=0; i<12; i++) // strengthen the shadow
				ctx.fillText(writeName, 0, 0);
		}
		
		ctx.restore();
	}
};

ReturnPath.drawPath = function (editor, ctx, fromX, fromY, toX, toY) {
	ctx.strokeStyle = '#000';
	ctx.lineWidth = 3;
	
	var scale = function (input, min, max) {
		if (input <= min)
			return 0;
		if (input >= max)
			return 1;
		return (input - min) / (max - min);
	};
	
	var dx = toX - fromX, dy = toY - fromY, m = dx === 0 ? 1 : Math.abs(dy/dx);
	var xOffset = -175 * scale(-Math.abs(dx), -100, -40) * scale(-dy, -50, -20);
	var yOffset = dy < 0 ? 300 : 300 * scale(-m, -5, -0.62);
	
	var cp1x = fromX + xOffset, cp2x = toX + xOffset;
	var cp1y = fromY + yOffset, cp2y = toY - yOffset;
	
	
	editor.drawCurve(ctx, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
	
	var mid1x = (fromX + cp1x + cp1x + cp2x) / 4, mid1y = (fromY + cp1y + cp1y + cp2y) / 4;
	var mid2x = (toX + cp2x + cp2x + cp1x) / 4, mid2y = (toY + cp2y + cp2y + cp1y) / 4;
	var angle = Math.atan2((mid2y - mid1y), (mid2x - mid1x));
	var midX = (mid1x + mid2x) / 2;
	var midY = (mid1y + mid2y) / 2;
	
	var halfWidth = 8, arrowLength = 20;
	
	ctx.save();
	
	var transform = {x: midX, y: midY, angle: angle};
	ctx.translate(transform.x, transform.y);
	ctx.rotate(transform.angle);
	
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

	ctx.restore();
	return transform;
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