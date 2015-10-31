"use strict";
exports.stateToHtml = function(parserState, caption, className) {
	var id = require("./identifiers.js");
	if (typeof (caption !== "string")) {
		caption = "Parser State";
	}
	if (typeof (className !== "string")) {
		className = "apg-table";
	}
	var success, state;
	if (parserState.success === true) {
		success = "<b>true</b>";
	} else {
		success = "<kbd>false</kbd>";
	}
	if (parserState.state === id.EMPTY) {
		state = "<i>EMPTY</i>";
	} else if (parserState.state === id.MATCH) {
		state = "<b>MATCH</b>";
	} else if (parserState.state === id.NOMATCH) {
		state = "<kbd>NOMATCH</kbd>";
	} else {
		state = "<kbd>unrecognized</kbd>";
	}
	var html = '';
	html += '<p><table class="' + className + '">\n';
	html += '<caption>' + caption + '</caption>\n';
	html += '<tr><th>state item</th><th>value</th><th>description</th></tr>\n';
	html += '<tr><td>parser success</td><td>'
			+ success
			+ '</td><td>true if the parse succeeded, false otherwise'
			+ '<br>NOTE: for success, entire string must be matched</th></tr>\n';
	html += '<tr><td>parser state</td><td>' + state
			+ '</td><td>EMPTY, MATCH or NOMATCH</td></tr>\n';
	html += '<tr><td>string length</td><td>' + parserState.length
			+ '</td><td>length of the input string</td></tr>\n';
	html += '<tr><td>matched length</td><td>'
			+ parserState.matched
			+ '</td><td>maximum number of input string characters matched</td></tr>\n';
	html += '</table></p>\n';
	return html;
}
exports.charsToHtml = function(chars, beg, end) {
	var NORMAL = 0;
	var CONTROL_BEG = "<code>";
	var CONTROL_END = "</code>";
	var INVALID_BEG = "<em>";
	var INVALID_END = "</em>";
	var html = '';
	while (true) {
		if (!Array.isArray(chars) || chars.length === 0) {
			break;
		}
		if (typeof (beg) !== "number") {
			beg = 0;
		}
		if (typeof (end) !== 'number') {
			end = chars.length - 1;
		}
		if (beg >= chars.length) {
			break;
		}
		var state = NORMAL
		for (var i = beg; i <= end; i += 1) {
			var ch = chars[i];
			if (ch >= 32 && ch <= 126) {
				// normal
				if (state === CONTROL_BEG) {
					html += CONTROL_END;
					state = NORMAL;
				} else if (state == INVALID_BEG) {
					html += INVALID_END;
					state = NORMAL;
				}
				// handle reserved HTML entity characters
				switch (ch) {
				case 32:
					html += '&nbsp;';
					break;
				case 60:
					html += '&lt;';
					break;
				case 62:
					html += '&gt;';
					break;
				case 38:
					html += '&amp;';
					break;
				case 34:
					html += '&quot;';
					break;
				case 39:
					html += '&#039;';
					break;
				case 92:
					html += '&#092;';
					break;
				default:
					html += String.fromCharCode(ch);
					break;
				}
			} else if (ch === 9 || ch === 10 || ch === 13) {
				// control char
				if (state === NORMAL) {
					html += CONTROL_BEG;
					state = CONTROL_BEG;
				} else if (state == INVALID_BEG) {
					html += INVALID_END + CONTROL_BEG;
					state = CONTROL_BEG;
				}
				if (ch === 9) {
					html += "TAB";
				}
				if (ch === 10) {
					html += "LF";
				}
				if (ch === 13) {
					html += "CR";
				}
			} else {
				// invalid
				if (state === NORMAL) {
					html += INVALID_BEG;
					state = INVALID_BEG;
				} else if (state == CONTROL_BEG) {
					html += CONTROL_END + INVALID_BEG;
					state = INVALID_BEG;
				}
				// char to hex
				html += "x" + ch.toString(16);
			}
		}
		if (state === INVALID_BEG) {
			html += INVALID_END;
		}
		if (state === CONTROL_BEG) {
			html += CONTROL_END;
		}

		break;
	}
	return html;
}
exports.errorsToHtml = function(chars, lines, errors, title, className) {
	var html = "";
	var that = this;
	if (!(Array.isArray(chars) && Array.isArray(lines) && Array.isArray(errors))) {
		return html;
	}
	if (typeof (title) !== "string") {
		title = "&nbsp;";
	}
	if (typeof (className !== "string")) {
		className = "apg-table";
	}
	html += '<p><table class="' + className + '">\n';
	html += '<caption>' + title + '</caption>\n';
	html += '<tr><th>line<br>no.</th><th>first<br>char</th><th><br>text</th></tr>\n';
	errors.forEach(function(val) {
		var line, relchar, beg, end, length, text, prefix = "", suffix = "";
		if (lines.length === 0) {
			text = "<var>&raquo;</var>";
			relchar = 0;
		} else {
			line = lines[val.line];
			beg = line.beginChar;
			end = val.char - 1;
			if (end > beg) {
				prefix = that.charsToHtml(chars, beg, end);
			}
			beg = val.char;
			end = line.beginChar + line.length - 1;
			if (end > beg) {
				suffix = that.charsToHtml(chars, beg, end);
			}
			text = prefix + "<var>&raquo;</var>" + suffix;
			relchar = val.char - line.beginChar;
		}
		html += '<tr>';
		html += '<td>' + val.line + '</td><td>' + relchar + '</td><td>' + text
				+ '</td>';
		html += '</tr>\n';
		html += '<tr>';
		html += '<td colspan="2"></td>' + '<td>&uarr;:&nbsp;' + val.msg
				+ '</td>'
		html += '</tr>\n';
	});
	html += '</table></p>\n';
	return html;
}
exports.charsToString = function(chars, phraseIndex, phraseLength) {
	var string = '';
	if (Array.isArray(chars)) {
		var charIndex = (typeof (phraseIndex) === 'number') ? phraseIndex : 0;
		var charLength = (typeof (phraseLength) === 'number') ? phraseLength
				: chars.length;
		if (charLength > chars.length) {
			charLength = chars.length;
		}
		var charEnd = charIndex + charLength;
		for (var i = charIndex; i < charEnd; i += 1) {
			if (chars[i]) {
				string += String.fromCharCode(chars[i]);
			}
		}
	}
	return string;
}

exports.stringToChars = function(string) {
	var chars = [];
	if (typeof (string) === 'string') {
		var charIndex = 0;
		while (charIndex < string.length) {
			chars[charIndex] = string.charCodeAt(charIndex);
			charIndex += 1;
		}
	}
	return chars;
}

/**
 * Translates an APG state to a human-readable string.
 * 
 * @param {number}
 *            state - the state to translate
 * @returns {string} the string value of the state or "unknown" if not a valid
 *          state.
 * @memberof ApgUtilities
 */
exports.stateToString = function(state) {
	var id = require("./identifiers.js");
	var ret = 'unknown';
	switch (state) {
	case id.ACTIVE:
		ret = 'ACTIVE';
		break;

	case id.EMPTY:
		ret = 'EMPTY';
		break;

	case id.NOMATCH:
		ret = 'NOMATCH';
		break;

	case id.MATCH:
		ret = 'MATCH';
		break;

	case id.SEM_PRE:
		ret = 'SEMANTIC PRE-BRANCH';
		break;

	case id.SEM_POST:
		ret = 'SEMANTIC POST-BRANCH';
		break;
	}
	return ret;
};

/**
 * Translates an APG opcode type to a human-readable string.
 * 
 * @param {number}
 *            type - the APG type to translate
 * @returns {string} the string representation of type or "unknown" if not a
 *          valid type.
 * @memberof ApgUtilities
 */
exports.opcodeToString = function(type) {
	var id = require("./identifiers.js");
	var ret = 'unknown';
	switch (type) {
	case id.ALT:
		ret = 'ALT';
		break;

	case id.CAT:
		ret = 'CAT';
		break;

	case id.RNM:
		ret = 'RNM';
		break;

	case id.UDT:
		ret = 'UDT';
		break;

	case id.AND:
		ret = 'AND';
		break;

	case id.NOT:
		ret = 'NOT';
		break;

	case id.REP:
		ret = 'REP';
		break;

	case id.TRG:
		ret = 'TRG';
		break;

	case id.TBS:
		ret = 'TBS';
		break;

	case id.TLS:
		ret = 'TLS';
		break;
	}
	return ret;
};

exports.htmlToPage = function(html, filename, classname, title) {
	var fs = require("fs");
	var thisFileName = "utilities.js: ";
	var ret = {
		hasErrors : false,
		errors : []
	};
	if (typeof (classname) !== "string") {
		// if(classname === undefined || typeof(classname) !== "string"){
		classname = "apg-table";
	}
	if (typeof (title) !== "string") {
		// if(title === undefined || typeof(title) !== "string"){
		title = filename;
	}
	var header = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n';
	header += '<title>' + title + '</title>\n';
	header += '<style>\n';
	header += 'table.'
			+ classname
			+ '{font-family:monospace;font-size:85%;font-style:normal;font-weight:normal;border:1px solid black;border-collapse:collapse;}\n\.'
			+ classname
			+ ' caption{font-size:125%;font-weight:bold;text-align:left;}\n\.'
			+ classname
			+ ' th,\n\.'
			+ classname
			+ ' td{text-align:right;border:1px solid black;border-collapse:collapse;}\n\.'
			+ classname
			+ ' th:nth-last-child(-n+2){text-align:left;}\n\.'
			+ classname
			+ ' td:nth-last-child(-n+2){text-align:left;}\n\.'
			+ classname
			+ ' b{background-color:#c2e0ff;color:#0000ff;}\n\.'
			+ classname
			+ ' i{background-color:#CCE6CC;color:#00cc00;}\n\.'
			+ classname
			+ ' em{color:#cc0000;font-style:italic;font-weight:bold;}\n\.'
			+ classname
			+ ' strong{font-weight:bold;}\n\.'
			+ classname
			+ ' code{color:blue;font-style:italic;font-weight:bold;font-size:75%;}\n\.'
			+ classname + ' samp{background-color:#b2ffb2;color:#008000;}\n\.'
			+ classname + ' kbd{background-color:#ffe6e6;color:#ff0000;}\n\.'
			+ classname
			+ ' var{background-color:#ffcccc;color:#cc0000;font-weight:bold;}';
	header += '</style>\n';
	header += '</head>\n<body>\n';
	header += '<p>' + new Date() + '</p>\n';
	var footer = '</body>\n</html>\n';
	while (true) {
		if (filename === undefined || typeof (filename) !== "string") {
			ret.hasErrors = true;
			ret.errors.push(thisFileName
					+ "htmlToPage: bad filename: not a string");
			break;
		}
		try {
			var fd = fs.openSync(filename, "w");
			fs.writeSync(fd, header);
			fs.writeSync(fd, html);
			fs.writeSync(fd, footer);
			fs.closeSync(fd);
		} catch (e) {
			ret.hasErrors = true;
			ret.errors.push(thisFileName + 'htmlToPage: output file error');
			ret.errors.push(thisFileName + e.message);
		}

		break;
	}
	return ret;
};
