"use strict";

module.exports = function() {
	var thisFileName = "ast.js: ";
//	var utils = require("./utilities.js");
	var id = require("./identifiers.js");
	var that = this;
	var rules = null;
	var udts = null;
	var chars = null;
	var nodeCount = 0;
	var nodesDefined = [];
	var nodeCallbacks = [];
	var stack = [];
	var records = [];
	this.callbacks = [];
	var pause = 0;
	this.astObject = "astObject";

	// define rules and udts to keep on the AST
	this.init = function(rulesIn, udtsIn, charsIn) {
		pause = 0;
		stack.length = 0;
		records.length = 0;
		nodesDefined.length = 0;
		nodeCount = 0;
		rules = rulesIn;
		udts = udtsIn;
		chars = charsIn;
	
		var i, list = [];
		// make name lookup list
		for(i = 0; i < rules.length; i += 1){
			list.push(rules[i].lower);
		}
		for(i = 0; i < udts.length; i += 1){
			list.push(udts[i].lower);
		}
		nodeCount = rules.length + udts.length;
		for( i = 0; i < nodeCount; i += 1){
			nodesDefined[i] = false;
			nodeCallbacks[i] = null;
		}
		for( var index in that.callbacks){
			var lower = index.toLowerCase();
			i = list.indexOf(lower);
			if(i < 0){
				throw new Error(thisFileName + "init: " + "node '"+index+"' not a rule or udt name");
			}
			if(typeof(that.callbacks[index]) === "function"){
				nodesDefined[i] = true;
				nodeCallbacks[i] = that.callbacks[index];
			}
			if(that.callbacks[index] === true){
				nodesDefined[i] = true;
			}
		}
	}

	this.ruleDefined = function(index){
		return nodesDefined[index] === false ? false : true;
	}
	this.udtDefined = function(index){
		return nodesDefined[rules.length + index] === false ? false : true;
	}

	this.down = function(callbackIndex, name) {
		var thisIndex = records.length;
		if (pause === 0) {
			// only record this node if not in a PRD opcode branch
			stack.push(thisIndex);
			records.push({
				name: name,
				thisIndex: thisIndex,
				thatIndex: null,
				state: id.SEM_PRE,
				callbackIndex: callbackIndex,
				phraseIndex:  null,
				phraseLength: null,
				stack: stack.length
			});
		}
		return thisIndex;
	};
	
	this.up = function(callbackIndex, name, phraseIndex, phraseLength) {
		var thisIndex = records.length;
		if (pause === 0) {
			// only record this node if not in a PRD opcode branch
			var thatIndex = stack.pop();
			records.push({
				name: name,
				thisIndex: thisIndex,
				thatIndex: thatIndex,
				state: id.SEM_POST,
				callbackIndex: callbackIndex,
				phraseIndex:  phraseIndex,
				phraseLength: phraseLength,
				stack: stack.length
			});
			records[thatIndex].thatIndex = thisIndex;
			records[thatIndex].phraseIndex = phraseIndex;
			records[thatIndex].phraseLength = phraseLength;
			
			// !!!! DEBUG
			if(records[thatIndex].callbackIndex !== records[thisIndex].callbackIndex){
				throw new Error(thisFileName + "up: direction up and down callback functions must be the same");
			}
			if(records[thatIndex].name !== records[thisIndex].name){
				throw new Error(thisFileName + "up: direction up and down callback function names must be the same");
			}
		}
		return thisIndex;
	};
	this.translate = function(data){
		var ret, call, callback, record;
		for(var i = 0; i < records.length; i += 1){
			record = records[i];
			callback = nodeCallbacks[record.callbackIndex];
			if(record.state === id.SEM_PRE){
				if(callback !== null){
					ret = callback(id.SEM_PRE, chars, record.phraseIndex, record.phraseLength, data);
					if(ret === id.SEM_SKIP){
						i = record.thatIndex;
					}
				}
			}else{
				if(callback !== null){
					callback(id.SEM_POST, chars, record.phraseIndex, record.phraseLength, data);
				}
			}
		}
	}
	
	this.setLength = function(length) {
		if (pause === 0) {
			records.length = length;
			if(length > 0){
				stack.length = records[length-1].stack;
			}else{
				stack.length = 0;
			}
		}
	};

	this.getLength = function() {
		return records.length;
	};

	function indent(n){
		var ret = "";
		for(var i = 0; i < n; i += 1){
			ret += " ";
		}
		return ret;
	}
	function phrase(chars, depth, beg, len){
		var xml = '';
		var maxLine = 30;
		var i;
		depth += 2;
		var end = Math.min(chars.length, beg + len);
		xml += indent(depth);
		for(i = beg; i < end; i += 1){
			if(i > beg){
				xml += ",";
				if(i % maxLine === 0){
					xml += "\n" + indent(depth);
				}
			}
			xml += chars[i];
		}
		xml += "\n";
		return xml;
	}
	
	this.displayXml = function(){
		var xml = "";
		var i, j, depth = 0;
		xml += '<?xml version="1.0" encoding="utf-8"?>\n';
		xml += '<root nodes="'+records.length/2+'" characters="'+chars.length+'">\n';
		xml += '<!-- input string character codes, comma-delimited UTF-32 integers -->\n';
		xml += phrase(chars, depth, 0, chars.length);
		records.forEach(function(rec, index){
			if(rec.state === id.SEM_PRE){
				depth += 1;
				xml += indent(depth);
				xml += '<node name="'+rec.name+'" phraseIndex="'+rec.phraseIndex+'" phraseLength="'+rec.phraseLength+'">\n'
				xml += phrase(chars, depth, rec.phraseIndex, rec.phraseLength);
			}else{
				xml += indent(depth);
				xml += '</node><!-- name="'+rec.name+'" -->\n'
				depth -= 1;
			}
		});
		
		xml += '</root>\n';
		return xml;
	}
	this.dump = function(rules, chars) {
		var i, indent, downIndex, upIndex, ruleIndex, name, index, count;
		var html = '';

		html += 'AST dump:';
		html += '<br />';
		indent = 0;
		i = 0;
		for (; i < this.ast.length; i += 1) {
			if (this.ast[i].down) {
				downIndex = i;
				upIndex = this.ast[downIndex].upIndex;
				ruleIndex = this.ast[downIndex].ruleIndex;
				name = this.rules[ruleIndex].rule;
				index = this.ast[upIndex].phraseIndex;
				count = this.ast[upIndex].phraseLength;
				html += printLine(indent, false, name, index, count, chars);
				indent += 1;
			} else {
				indent -= 1;
				upIndex = i;
				downIndex = this.ast[upIndex].downIndex;
				ruleIndex = this.ast[downIndex].ruleIndex;
				name = this.rules[ruleIndex].rule;
				index = this.ast[upIndex].phraseIndex;
				count = this.ast[upIndex].phraseLength;
				html += printLine(indent, true, name, index, count, chars);
			}
		}
		return html;
	};
}
