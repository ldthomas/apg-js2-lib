module.exports = function() {
	"use strict";
	var thisFileName = "trace.js: ";
	var that = this;
	var MODE_HEX = 16;
	var MODE_DEC = 10;
	var MODE_ASCII = 8;
	var MAX_PHRASE = 128;
	var MAX_TLS = 5;
	var PHRASE_END = "&bull;";
	var PHRASE_CONTINUE = "&hellip;"
	var utils = require("./utilities.js");
	var circular = new (require("./circular-buffer.js"))();
	var id = require("./identifiers.js");
	var lines = [];
	var maxLines = 5000;
	var totalRecords = 0;
	var filteredRecords = 0;
	var treeDepth = 0;
	var lineStack = [];
	var chars = null;
	var rules = null;
	var udts = null;
	var operatorFilter = [];
	var ruleFilter = [];

	// non-RNM & non-UDT operators
	var initOperatorFilter = function() {
		var setOperators = function(set) {
			operatorFilter[id.ALT] = set;
			operatorFilter[id.CAT] = set;
			operatorFilter[id.REP] = set;
			operatorFilter[id.AND] = set;
			operatorFilter[id.NOT] = set;
			operatorFilter[id.TLS] = set;
			operatorFilter[id.TBS] = set;
			operatorFilter[id.TRG] = set;
		}
		var all, items = 0;
		for ( var name in that.filter.operators) {
			items += 1;
		}
		if (items === 0) {
			// case 1: no operators specified: default: do not trace any
			// operators
			setOperators(false);
		} else {
			all = false;
			for ( var name in that.filter.operators) {
				var upper = name.toUpperCase();
				if (upper === '<ALL>') {
					// case 2: <all> operators specified: trace all operators
					// ignore all other operator commands
					setOperators(true);
					all = true;
					break;
				}
				if (upper === '<NONE>') {
					// case 3: <none> operators specified: trace NO operators
					// ignore all other operator commands
					setOperators(false);
					all = true;
					break;
				}
			}
			if (all === false) {
				setOperators(false);
				for ( var name in that.filter.operators) {
					var upper = name.toUpperCase();
					// case 4: one or more individual operators specified: trace
					// specified operators only
					if (upper === 'ALT') {
						operatorFilter[id.ALT] = true;
					} else if (upper === 'CAT') {
						operatorFilter[id.CAT] = true;
					} else if (upper === 'REP') {
						operatorFilter[id.REP] = true;
					} else if (upper === 'AND') {
						operatorFilter[id.AND] = true;
					} else if (upper === 'NOT') {
						operatorFilter[id.NOT] = true;
					} else if (upper === 'TLS') {
						operatorFilter[id.TLS] = true;
					} else if (upper === 'TBS') {
						operatorFilter[id.TBS] = true;
					} else if (upper === 'TRG') {
						operatorFilter[id.TRG] = true;
					} else {
						throw new Error(
								thisFileName
										+ "initOpratorFilter: '"
										+ name
										+ "' not a valid operator name."
										+ " Must be <all>, <none>, alt, cat, rep, and, not, tls, tbs or trg");
					}
				}
			}
		}
	}
	var initRuleFilter = function() {
		// function to set all rules and udts
		var setRules = function(set) {
			operatorFilter[id.RNM] = set;
			operatorFilter[id.UDT] = set;
			var count = rules.length + udts.length
			ruleFilter.length = 0;
			for (var i = 0; i < count; i += 1) {
				ruleFilter.push(set);
			}
		}

		// make name lookup list
		var all, items, i, list = [];
		for (i = 0; i < rules.length; i += 1) {
			list.push(rules[i].lower);
		}
		for (i = 0; i < udts.length; i += 1) {
			list.push(udts[i].lower);
		}

		ruleFilter.length = 0;
		items = 0;
		for ( var name in that.filter.rules) {
			items += 1;
		}
		if (items === 0) {
			// case 1: default to all rules & udts
			setRules(true);
		} else {
			all = false;
			for ( var name in that.filter.rules) {
				var lower = name.toLowerCase();
				if (lower === '<all>') {
					// case 2: trace all rules
					// ignore all other rule commands
					setRules(true);
					all = true;
					break;
				}
				if (lower === '<none>') {
					// case 3: trace no rules
					setRules(false);
					all = true;
					break;
				}
			}
			if (all === false) {
				// case 4: trace only individually specified rules
				setRules(false);
				for ( var name in that.filter.rules) {
					var lower = name.toLowerCase();
					i = list.indexOf(lower);
					if (i < 0) {
						throw new Error(thisFileName + "initRuleFilter: '"
								+ name + "' not a valid rule or udt name");
					}
					ruleFilter[i] = true;
				}
				operatorFilter[id.RNM] = true;
				operatorFilter[id.UDT] = true;
			}
		}
	}
	this.traceObject = "traceObject";
	this.filter = {
		operators : [],
		rules : []
	}
	this.setMaxRecords = function(max){
		if(typeof(max) === "number" && max > 0){
			maxLines = Math.ceil(max);
		}
	}
	this.getMaxRecords = function(){
		return maxLines;
	}
	// no verification of input - only called by Parser
	this.init = function(rulesIn, udtsIn, charsIn) {
		lines.length = 0;
		lineStack.length = 0;
		totalRecords = 0;
		filteredRecords = 0;
		treeDepth = 0;
		chars = charsIn;
		rules = rulesIn;
		udts = udtsIn;
		initOperatorFilter();
		initRuleFilter();
		circular.init(maxLines);
	};
	var filter = function(op) {
		var ret = false;
		// use the operatorFilter object to determine if this opcode should be
		// traced or not
		if (op.type === id.RNM) {
			if(operatorFilter[op.type] && ruleFilter[op.index]){
				ret = true;
			}else{
				ret = false;
			}
		} else if (op.type === id.UDT) {
			if(operatorFilter[op.type] && ruleFilter[rules.length + op.index]){
				ret = true;
			}else{
				ret = false;
			}
		} else {
			ret = operatorFilter[op.type];
		}
		return ret;
	}
	this.down = function(op, state, offset, length) {
		totalRecords += 1;
		if (filter(op)) {
			lineStack.push(filteredRecords);
			lines[circular.increment()] = {
				dirUp : false,
				depth : treeDepth,
				thisLine : filteredRecords,
				thatLine : undefined,
				opcode : op,
				state : state,
				phraseIndex : offset,
				phraseLength : length
			};
			filteredRecords += 1;
			treeDepth += 1;
		}
	};

	this.up = function(op, state, offset, length) {
		totalRecords += 1;
		if (filter(op)) {
			var thisLine = filteredRecords;
			var thatLine = lineStack.pop();
			var thatRecord = circular.getListIndex(thatLine);
			if(thatRecord !== -1){
				lines[thatRecord].thatLine = thisLine;
			}
			treeDepth -= 1;
			lines[circular.increment()] = {
				dirUp : true,
				depth : treeDepth,
				thisLine : thisLine,
				thatLine : thatLine,
				opcode : op,
				state : state,
				phraseIndex : offset,
				phraseLength : length
			};
			filteredRecords += 1;
		}
	};

	// returns an HTML-tabular format of the filtered records
	this.displayHtml = function(caption, mode, classname) {
		if (rules === null) {
			return "";
		}
		if(typeof(mode) === "string"){
			mode = mode.toLowerCase()
			if (mode === 'hex') {
				mode = MODE_HEX;
			}else if (mode === 'dec') {
				mode = MODE_DEC;
			} else {
				mode = MODE_ASCII;
			}
		}else{
			mode = MODE_ASCII;
		}
		if (typeof (classname) !== "string") {
			classname = "apg-table";
		}
		var html = '';
		var line, thisLine, thatLine;
		html += '<table class="' + classname + '">\n';
		if (typeof (caption) === "string") {
			html += '<caption>' + caption + '</caption>';
		}
		html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
		html += '<th>operator</th><th>phrase</th></tr>\n';
		circular.forEach(function(lineIndex, index) {
			var line = lines[lineIndex];
			thisLine = line.thisLine;
			thatLine = (line.thatLine !== undefined) ? line.thatLine : '--';
			html += '<tr>';
			html += '<td>' + thisLine + '</td><td>' + thatLine + '</td>';
			html += '<td>' + line.phraseIndex + '</td>';
			html += '<td>' + line.phraseLength + '</td>';
			html += '<td>' + line.depth + '</td>';
			html += '<td>';
			switch (line.state) {
			case id.ACTIVE:
				html += '&darr;&nbsp;';
				break;
			case id.MATCH:
				html += '<b>&uarr;M</b>';
				break;
			case id.NOMATCH:
				html += '<kbd>&uarr;N</kbd>';
				break;
			case id.EMPTY:
				html += '<i>&uarr;E</i>';
				break;
			default:
				html += '<kbd>--</kbd>';
				break;
			}
			html += '</td>';
			html += '<td>';
			html += that.indent(line.depth)
					+ utils.opcodeToString(line.opcode.type);
			if (line.opcode.type === id.RNM) {
				html += '(' + rules[line.opcode.index].name + ') ';
			}
			if (line.opcode.type === id.UDT) {
				html += '(' + udts[line.opcode.index].name + ') ';
			}
			if (line.opcode.type === id.TRG) {
				html += '(' + displayTrg(mode, line.opcode) + ') ';
			}
			if (line.opcode.type === id.TBS) {
				html += '(' + displayTbs(mode, line.opcode) + ') ';
			}
			if (line.opcode.type === id.TLS) {
				html += '(' + displayTls(mode, line.opcode) + ') ';
			}
			html += '</td>';
			html += '<td>';
			html += displayPhrase(mode, chars, line.phraseIndex, line.phraseLength,line.state);
			html += '</td></tr>\n';

		});
		html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
		html += '<th>operator</th><th>phrase</th></tr>\n';
		html += '</table>\n';

		html += '<p>\n';
		html += '(a)&nbsp;-&nbsp;line number<br />\n';
		html += '(b)&nbsp;-&nbsp;matching line number<br />\n';
		html += '(c)&nbsp;-&nbsp;phrase offset<br />\n';
		html += '(d)&nbsp;-&nbsp;phrase length<br />\n';
		html += '(e)&nbsp;-&nbsp;relative tree depth<br />\n';
		html += '(f)&nbsp;-&nbsp;operator state<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&darr;open<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&uarr;final<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;M phrase matched<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;N phrase not matched<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;E phrase matched, empty<br />\n';
		html += 'operator&nbsp;-&nbsp;ALT, CAT, REP, AND, NOT, TRG, TLS, TBS, UDT(udt name) or RNM(rule name)<br />\n';
		html += 'phrase&nbsp;&nbsp;&nbsp;-&nbsp;up to '+MAX_PHRASE+' characters of the phrase being matched<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>'+PHRASE_END+'</code> = End of String<br />\n';
		html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<code>'+PHRASE_CONTINUE+'</code> = String Truncated<br />\n';
		html += '</p>\n';
		return html;
	};

	// display helper - adds indenting spaces to a line
	this.indent = function(depth) {
		var html = '';
		for (var i = 0; i < depth; i += 1) {
			if (i % 2 === 0) {
				html += '&nbsp;';
			} else {
				html += '&#46;';
			}
		}
		return html;
	};

	var displayTrg = function(mode, op){
		var html = "";
		if(op.type === id.TRG){
			var min, max, hex;
			if(mode === MODE_HEX){
				hex = op.min.toString(16).toUpperCase();
				if(hex.length % 2 !== 0){
					hex = "0" + hex;
				}
				html = "%x" + hex;
				hex = op.max.toString(16).toUpperCase();
				if(hex.length % 2 !== 0){
					hex = "0" + hex;
				}
				html += "&ndash;" + hex;
			}else{
				html = "%d" + op.min.toString(10) + "&ndash;" + op.max.toString(10);
			}
		}
		return html;
	}
	var displayTbs = function(mode, op){
		var html = "";
		if(op.type === id.TBS){
			var len = Math.min(op.string.length, MAX_TLS * 2);
			if(mode === MODE_HEX){
				html = "%x";
				for (var i = 0; i < len; i += 1){
					var hex;
					if( i > 0){
						html += ".";
					}
					hex = op.string[i].toString(16).toUpperCase();
					if(hex.length % 2 !== 0){
						hex = "0" + hex;
					}
					html += hex;
				}
			}else{
				html = "%d";
				for (var i = 0; i < len; i += 1){
					if( i > 0){
						html += ".";
					}
					html += op.string[i].toString(10);
				}
			}
			if(len < op.string.length){
				html += PHRASE_CONTINUE;
			}
		}
		return html;
	}
	var displayTls = function(mode, op){
		var html = "";
		if(op.type === id.TLS){
			var len = Math.min(op.string.length, MAX_TLS);
			if(mode === MODE_HEX || mode === MODE_DEC){
				var charu, charl, base;
				if(mode === MODE_HEX){
					html = "%x";
					base = 16;
				}else{
					html = "%d";
					base = 10;
				}
				for (var i = 0; i < len; i += 1){
					if( i > 0){
						html += ".";
					}
					charl = op.string[i];
					if(charl >= 97 && charl <= 122){
						charu = charl - 32;
						html += (charu.toString(base) + '/' + charl.toString(base)).toUpperCase();
					}else if(charl >= 65 && charl  <= 90){
						charu = charl;
						charl += 32;
						html += (charu.toString(base) + '/' + charl.toString(base)).toUpperCase();
					}else{
						html += charl.toString(base).toUpperCase();
					}
				}
				if(len < op.string.length){
					html += PHRASE_CONTINUE;
				}
			}else{
				html = '"';
				for (var i = 0; i < len; i += 1){
					html += String.fromCharCode(op.string[i]);
				}
				if(len < op.string.length){
					html += PHRASE_CONTINUE;
				}
				html += '"';
			}
		}
		return html;
	}
	var displayPhrase = function(mode, chars, offset, len, state){
		var i;
		var html = '';
		var offMax = chars.length;
		var lastChar = '<code>'+PHRASE_END+'</code>';
		if (offMax - offset > MAX_PHRASE) {
			offMax = offset + MAX_PHRASE;
			lastChar = '<code>'+PHRASE_CONTINUE+'</code>';
		}
		var offLen = offset + len;
		if (offLen > offMax) {
			offLen = offMax;
		}
		var count = 0;
		if (state === id.MATCH && len > 0) {
			html += '<b>';
		} else if (state === id.NOMATCH && len > 0) {
			html += '<var>';
		} else if (state === id.EMPTY) {
			html += '<i>&#120634;</i>'
		}
		var matchedPhrase = subPhrase(mode, chars, offset, offLen);
		html += matchedPhrase;
		if (state === id.MATCH && len > 0) {
			html += '</b>';
		} else if (state === id.NOMATCH && len > 0) {
			html += '</var>';
		}
		html += subPhrase(mode, chars, offLen, offMax, matchedPhrase.length);
		html += lastChar;
		return html;
	}
	var subPhrase = function(mode, chars, beg, end, prefix){
		var html = "";
		var char;
		var threshold;
		if(typeof(prefix) === "number"){
			threshold = (prefix > 0) ? -1 : beg;
		}else{
			threshold = beg;
		}
		for(var i = beg; i < end; i += 1){
			if(mode === MODE_HEX){
				char = chars[i].toString(16).toUpperCase();
				if(char.length % 2 !== 0){
					char = "0" + char;
				}
				html += "x" + char;
			}else if(mode === MODE_DEC){
				if(i > threshold){
					html += ",";
				}
				html += chars[i].toString(10);
			}else{
				if (chars[i] === 10) {
					html += '<code>LF</code>';
				} else if (chars[i] === 13) {
					html += '<code>CR</code>';
				} else if (chars[i] === 9) {
					html += '<code>TAB</code>';
				} else if (chars[i] === 32) {
					html += '&nbsp;';
				} else if (chars[i] === 34) {
					html += '&#34;';
				} else if (chars[i] === 38) {
					html += '&#38;';
				} else if (chars[i] === 39) {
					html += '&#39;';
				} else if (chars[i] === 60) {
					html += '&#60;';
				} else if (chars[i] === 62) {
					html += '&#62;';
				} else if (chars[i] < 33 || chars[i] > 126) {
					html += '<code>x' + chars[i].toString(16) + '</code>';
				} else {
					html += String.fromCharCode(chars[i]);
				}
			}
		}
		return html;
	}

	// formats the phrase display in hexidecimal
	/**
	 * Formats the phrase display in hexidecimal.
	 * 
	 * @param {array}
	 *            chars - array of input string character codes
	 * @private
	 */
	this.displayHex = function(chars, offset, len, state) {
		var matchLen = 16;
		if (offset < 0) {
			offset = 0;
		}
		var end = offset + matchLen;
		var htmlHex;
		var htmlAscii;
		var count = 0;
		var mid = matchLen / 2;
		var quarter = matchLen / 4;
		if (state === id.MATCH) {
			htmlHex = '<span class="match">';
			htmlAscii = '<span class="match">';
		} else {
			htmlHex = '<span class="nomatch">';
			htmlAscii = '<span class="nomatch">';
		}
		for (var i = offset; i < end; i += 1, count += 1) {
			if (count > 0) {
				if (count % quarter === 0) {
					htmlHex += '&nbsp;';
				}
				if (count % mid === 0) {
					htmlHex += '&nbsp;';
				}
			}
			if (i >= chars.length) {
				htmlHex += '..';
			} else {
				var hexChar = chars[i].toString(16).toUpperCase();
				if (hexChar.length === 1) {
					htmlHex += '0' + hexChar;
				} else {
					htmlHex += hexChar;
				}
				if (chars[i] < 32 || chars[i] > 126) {
					htmlAscii += '.';
				} else {
					htmlAscii += String.fromCharCode(chars[i]);
				}
			}
			if (state === id.MATCH && (count + 1) >= len) {
				htmlHex += '</span><span class="nomatch">';
				htmlAscii += '</span><span class="nomatch">';
			}
		}
		htmlHex += '</span>';
		htmlAscii += '</span>';
		return htmlHex + '&nbsp;&nbsp;' + htmlAscii;
	};
}
