// This module exports a variety of utility functions that support 
// [`apg`](https://github.com/ldthomas/apg-js2), [`apg-lib`](https://github.com/ldthomas/apg-js2-lib)
// and the generated parser applications.
"use strict";
var thisFileName = "utilities.js: ";
var _this = this;
/* translate (implied) phrase beginning character and length to actual first and last character indexes */
/* used by multiple phrase handling functions */
var getBounds = function(length, beg, len) {
  var end;
  while (true) {
    if (length <= 0) {
      beg = 0;
      end = 0;
      break;
    }
    if (typeof (beg) !== "number") {
      beg = 0;
      end = length;
      break;
    }
    if (beg >= length) {
      beg = length;
      end = length;
      break;
    }
    if (typeof (len) !== "number") {
      end = length;
      break;
    }
    end = beg + len;
    if (end > length) {
      end = length;
      break
    }
    break;
  }
  return {
    beg : beg,
    end : end
  };
}
/* Standard set of colors and classes for HTML display of results. */
var style = {
  /* colors */
  COLOR_ACTIVE : "#000000",
  COLOR_MATCH : "#264BFF",
  COLOR_EMPTY : "#0fbd0f",
  COLOR_NOMATCH : "#FF4000",
  COLOR_LH_MATCH : "#1A97BA",
  COLOR_LB_MATCH : "#5F1687",
  COLOR_LH_NOMATCH : "#FF8000",
  COLOR_LB_NOMATCH : "#e6ac00",
  COLOR_END : "#000000",
  COLOR_CTRL : "#000000",
  COLOR_REMAINDER : "#999999",
  COLOR_TEXT : "#000000",
  COLOR_BACKGROUND : "#FFFFFF",
  COLOR_BORDER : "#000000",
  /* color classes */
  CLASS_ACTIVE : "active",
  CLASS_MATCH : "match",
  CLASS_NOMATCH : "nomatch",
  CLASS_EMPTY : "empty",
  CLASS_LH_MATCH : "lh-match",
  CLASS_LB_MATCH : "lb-match",
  CLASS_REMAINDER : "remainder",
  CLASS_CTRL : "ctrl-char",
  CLASS_END : "line-end",
  /* table classes */
  CLASS_LEFT_TABLE : "left-table",
  CLASS_RIGHT_TABLE : "right-table",
  CLASS_LAST_LEFT_TABLE : "last-left-table",
  CLASS_LAST2_LEFT_TABLE : "last2-left-table",
  /* text classes */
  CLASS_MONOSPACE : "mono"
}
exports.styleNames = style;
exports.styleClasses = function() {
  var html = '<style>\n';
  html += '.' + style.CLASS_MONOSPACE + '{font-family: monospace;}\n';
  html += '.' + style.CLASS_ACTIVE + '{font-weight: bold; color: ' + style.COLOR_TEXT + ';}\n';
  html += '.' + style.CLASS_MATCH + '{font-weight: bold; color: ' + style.COLOR_MATCH + ';}\n';
  html += '.' + style.CLASS_EMPTY + '{font-weight: bold; color: ' + style.COLOR_EMPTY + ';}\n';
  html += '.' + style.CLASS_NOMATCH + '{font-weight: bold; color: ' + style.COLOR_NOMATCH + ';}\n';
  html += '.' + style.CLASS_LH_MATCH + '{font-weight: bold; color: ' + style.COLOR_LH_MATCH + ';}\n';
  html += '.' + style.CLASS_LB_MATCH + '{font-weight: bold; color: ' + style.COLOR_LB_MATCH + ';}\n';
  html += '.' + style.CLASS_REMAINDER + '{font-weight: bold; color: ' + style.COLOR_REMAINDER + ';}\n';
  html += '.' + style.CLASS_CTRL + '{font-weight: bolder; font-style: italic; font-size: .6em;}\n';
  html += '.' + style.CLASS_END + '{font-weight: bold; color: ' + style.COLOR_END + ';}\n';
  html += '</style>\n';
  return html;
}
// Table style for all columns left aligned
exports.styleLeftTable = function() {
  var html = '<style>\n';
  html += "." + style.CLASS_LEFT_TABLE + "{font-family:monospace;}\n";
  html += "." + style.CLASS_LEFT_TABLE + ",\n";
  html += "." + style.CLASS_LEFT_TABLE + " th,\n";
  html += "." + style.CLASS_LEFT_TABLE + " td{text-align:left;border:1px solid black;border-collapse:collapse;}\n";
  html += "." + style.CLASS_LEFT_TABLE + " caption";
  html += "{font-size:125%;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
// Table style for all columns right aligned (0 left-aligned cols)
exports.styleRightTable = function() {
  var html = '<style>\n';
  html += "." + style.CLASS_RIGHT_TABLE + "{font-family:monospace;}\n";
  html += "." + style.CLASS_RIGHT_TABLE + ",\n";
  html += "." + style.CLASS_RIGHT_TABLE + " th,\n";
  html += "." + style.CLASS_RIGHT_TABLE + " td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += "." + style.CLASS_RIGHT_TABLE + " caption";
  html += "{font-size:125%;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
// Table style for all but last columns right aligned (1 left-aligned col)
exports.styleLastLeftTable = function() {
  var html = '<style>\n';
  html += "." + style.CLASS_LAST_LEFT_TABLE + "{font-family:monospace;}\n";
  html += "." + style.CLASS_LAST_LEFT_TABLE + ",\n";
  html += "." + style.CLASS_LAST_LEFT_TABLE + " th,\n";
  html += "." + style.CLASS_LAST_LEFT_TABLE + " td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += "." + style.CLASS_LAST_LEFT_TABLE + " th:last-child{text-align:left;}\n";
  html += "." + style.CLASS_LAST_LEFT_TABLE + " td:last-child{text-align:left;}\n";
  html += "." + style.CLASS_LAST_LEFT_TABLE + " caption";
  html += "{font-size:125%;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
// Table style for all but last 2 columns right aligned (2 left-aligned cols)
exports.styleLast2LeftTable = function() {
  var html = '<style>\n';
  html += "." + style.CLASS_LAST2_LEFT_TABLE + "{font-family:monospace;}\n";
  html += "." + style.CLASS_LAST2_LEFT_TABLE + ",\n";
  html += "." + style.CLASS_LAST2_LEFT_TABLE + " th,\n";
  html += "." + style.CLASS_LAST2_LEFT_TABLE + " td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += '.' + style.CLASS_LAST2_LEFT_TABLE + ' th:last-child{text-align:left;}\n';
  html += '.' + style.CLASS_LAST2_LEFT_TABLE + ' th:nth-last-child(2){text-align:left;}\n';
  html += '.' + style.CLASS_LAST2_LEFT_TABLE + ' td:last-child{text-align:left;}\n';
  html += '.' + style.CLASS_LAST2_LEFT_TABLE + ' td:nth-last-child(2){text-align:left;}\n';
  html += "." + style.CLASS_LAST2_LEFT_TABLE + " caption";
  html += "{font-size:125%;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
// Generates a complete, minimal HTML5 page, inserting the user's HTML text on the page.
// - *html* - the page text in HTML format
// - *title* - the HTML page `<title>` - defaults to `htmlToPage`.
exports.htmlToPage = function(html, title) {
  var thisFileName = "utilities.js: ";
  if (typeof (html) !== "string") {
    throw new Error(thisFileName + "htmlToPage: input HTML is not a string");
  }
  if (typeof (title) !== "string") {
    title = "htmlToPage";
  }
  var page = '';
  page += '<!DOCTYPE html>\n';
  page += '<html lang="en">\n';
  page += '<head>\n';
  page += '<meta charset="utf-8">\n';
  page += '<title>' + title + '</title>\n';
  page += exports.styleClasses();
  page += exports.styleLeftTable();
  page += exports.styleRightTable();
  page += exports.styleLastLeftTable();
  page += exports.styleLast2LeftTable();
  page += '</head>\n<body>\n';
  page += '<p>' + new Date() + '</p>\n';
  page += html;
  page += '</body>\n</html>\n';
  return page;
};
// Formats the returned object from [`parser.parse()`](./parse.html)
// into an HTML table.
// ```
// return {
//   success : sysData.success,
//   state : sysData.state,
//   length : charsLength,
//   matched : sysData.phraseLength,
//   maxMatched : maxMatched,
//   maxTreeDepth : maxTreeDepth,
//   nodeHits : nodeHits,
//   inputLength : chars.length,
//   subBegin : charsBegin,
//   subEnd : charsEnd,
//   subLength : charsLength
// };
// ```
exports.parserResultToHtml = function(result, caption) {
  var id = require("./identifiers.js");
  var cap = null;
  if (typeof (caption === "string") && caption !== "") {
    cap = caption;
  }
  var success, state;
  if (result.success === true) {
    success = '<span class="' + style.CLASS_MATCH + '">true</span>';
  } else {
    success = '<span class="' + style.CLASS_NOMATCH + '">false</span>';
  }
  if (result.state === id.EMPTY) {
    state = '<span class="' + style.CLASS_EMPTY + '">EMPTY</span>';
  } else if (result.state === id.MATCH) {
    state = '<span class="' + style.CLASS_MATCH + '">MATCH</span>';
  } else if (result.state === id.NOMATCH) {
    state = '<span class="' + style.CLASS_NOMATCH + '">NOMATCH</span>';
  } else {
    state = '<span class="' + style.CLASS_NOMATCH + '">unrecognized</span>';
  }
  var html = '';
  html += '<p><table class="' + style.CLASS_LEFT_TABLE + '">\n';
  if (cap) {
    html += '<caption>' + cap + '</caption>\n';
  }
  html += '<tr><th>state item</th><th>value</th><th>description</th></tr>\n';
  html += '<tr><td>parser success</td><td>' + success + '</td>\n';
  html += '<td><span class="' + style.CLASS_MATCH + '">true</span> if the parse succeeded,\n';
  html += ' <span class="' + style.CLASS_NOMATCH + '">false</span> otherwise';
  html += '<br><i>NOTE: for success, entire string must be matched</i></td></tr>\n';
  html += '<tr><td>parser state</td><td>' + state + '</td>\n';
  html += '<td><span class="' + style.CLASS_EMPTY + '">EMPTY</span>, ';
  html += '<span class="' + style.CLASS_MATCH + '">MATCH</span> or \n';
  html += '<span class="' + style.CLASS_NOMATCH + '">NOMATCH</span></td></tr>\n';
  html += '<tr><td>string length</td><td>' + result.length + '</td><td>length of the input (sub)string</td></tr>\n';
  html += '<tr><td>matched length</td><td>' + result.matched + '</td><td>number of input string characters matched</td></tr>\n';
  html += '<tr><td>max matched</td><td>' + result.maxMatched
      + '</td><td>maximum number of input string characters matched</td></tr>\n';
  html += '<tr><td>max tree depth</td><td>' + result.maxTreeDepth
      + '</td><td>maximum depth of the parse tree reached</td></tr>\n';
  html += '<tr><td>node hits</td><td>' + result.nodeHits
      + '</td><td>number of parse tree node hits (opcode function calls)</td></tr>\n';
  html += '<tr><td>input length</td><td>' + result.inputLength + '</td><td>length of full input string</td></tr>\n';
  html += '<tr><td>sub-string begin</td><td>' + result.subBegin + '</td><td>sub-string first character index</td></tr>\n';
  html += '<tr><td>sub-string end</td><td>' + result.subEnd + '</td><td>sub-string end-of-string index</td></tr>\n';
  html += '<tr><td>sub-string length</td><td>' + result.subLength + '</td><td>sub-string length</td></tr>\n';
  html += '</table></p>\n';
  return html;
}
// Translates a sub-array of integer character codes into a string.
// Very useful in callback functions to translate the matched phrases into strings.
exports.charsToString = function(chars, phraseIndex, phraseLength) {
  var string = '';
  if (Array.isArray(chars)) {
    var charIndex = (typeof (phraseIndex) === 'number') ? phraseIndex : 0;
    var charLength = (typeof (phraseLength) === 'number') ? phraseLength : chars.length;
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
// Translates a string into an array of integer character codes.
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
// Translates an opcode identifier into a human-readable string.
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
  case id.BKR:
    ret = 'BKR';
    break;
  case id.BKA:
    ret = 'BKA';
    break;
  case id.BKN:
    ret = 'BKN';
    break;
  }
  return ret;
};
// Array which translates all 128, 7-bit ASCII character codes to their respective HTML format.
exports.asciiChars = [ "NUL", "SOH", "STX", "ETX", "EOT", "ENQ", "ACK", "BEL", "BS", "TAB", "LF", "VT", "FF", "CR", "SO", "SI",
    "DLE", "DC1", "DC2", "DC3", "DC4", "NAK", "SYN", "ETB", "CAN", "EM", "SUB", "ESC", "FS", "GS", "RS", "US", '&nbsp;', "!",
    '&#34;', "#", "$", "%", '&#38;', '&#39;', "(", ")", "*", "+", ",", "-", ".", "/", "0", "1", "2", "3", "4", "5", "6", "7",
    "8", "9", ":", ";", '&#60;', "=", '&#62;', "?", "@", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N",
    "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "[", "&#92;", "]", "^", "_", "`", "a", "b", "c", "d", "e", "f",
    "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "{", "|", "}", "~",
    "DEL" ];
// Translates a single character to hexidecimal with leading zeros for 2, 4, or 8 digit display.
exports.charToHex = function(char) {
  var ch = char.toString(16).toUpperCase();
  switch (ch.length) {
  case 1:
  case 3:
  case 7:
    ch = "0" + ch;
    break;
  case 6:
    ch = "00" + ch;
    break;
  case 5:
    ch = "000" + ch;
    break;
  }
  return ch;
}
// Translates a sub-array of character codes to decimal display format.
exports.charsToDec = function(chars, beg, len) {
  var ret = "";
  if (!Array.isArray(chars)) {
    throw new Error(thisFileName + "charsToDec: input must be an array of integers");
  }
  var bounds = getBounds(chars.length, beg, len);
  if (bounds.end > bounds.beg) {
    ret += chars[bounds.beg];
    for (var i = bounds.beg + 1; i < bounds.end; i += 1) {
      ret += "," + chars[i];
    }
  }
  return ret;
}
// Translates a sub-array of character codes to hexidecimal display format.
exports.charsToHex = function(chars, beg, len) {
  var ret = "";
  if (!Array.isArray(chars)) {
    throw new Error(thisFileName + "charsToHex: input must be an array of integers");
  }
  var bounds = getBounds(chars.length, beg, len);
  if (bounds.end > bounds.beg) {
    ret += "\\x" + _this.charToHex(chars[bounds.beg]);
    for (var i = bounds.beg + 1; i < bounds.end; i += 1) {
      ret += ",\\x" + _this.charToHex(chars[i]);
    }
  }
  return ret;
}
// Translates a sub-array of character codes to Unicode display format.
exports.charsToUnicode = function(chars, beg, len) {
  var ret = "";
  if (!Array.isArray(chars)) {
    throw new Error(thisFileName + "charsToUnicode: input must be an array of integers");
  }
  var bounds = getBounds(chars.length, beg, len);
  if (bounds.end > bounds.beg) {
    ret += "U+" + _this.charToHex(chars[bounds.beg]);
    for (var i = bounds.beg + 1; i < bounds.end; i += 1) {
      ret += ",U+" + _this.charToHex(chars[i]);
    }
  }
  return ret;
}
// Translates a sub-array of character codes to JavaScript Unicode display format (`\uXXXX`).
exports.charsToJsUnicode = function(chars, beg, len) {
  var ret = "";
  if (!Array.isArray(chars)) {
    throw new Error(thisFileName + "charsToJsUnicode: input must be an array of integers");
  }
  var bounds = getBounds(chars.length, beg, len);
  if (bounds.end > bounds.beg) {
    ret += "\\u" + _this.charToHex(chars[bounds.beg]);
    for (var i = bounds.beg + 1; i < bounds.end; i += 1) {
      ret += ",\\u" + _this.charToHex(chars[i]);
    }
  }
  return ret;
}
// Translates a sub-array of character codes to printing ASCII character display format.
exports.charsToAscii = function(chars, beg, len) {
  var ret = "";
  if (!Array.isArray(chars)) {
    throw new Error(thisFileName + "charsToAscii: input must be an array of integers");
  }
  var bounds = getBounds(chars.length, beg, len);
  for (var i = bounds.beg; i < bounds.end; i += 1) {
    var char = chars[i];
    if (char >= 32 && char <= 126) {
      ret += String.fromCharCode(char);
    } else {
      ret += "\\x" + _this.charToHex(char);
    }
  }
  return ret;
}
exports.charsToAsciiHtml = function(chars, beg, len) {
  if (!Array.isArray(chars)) {
    throw new Error(thisFileName + "charsToAsciiHtml: input must be an array of integers");
  }
  var html = "";
  var char, ctrl;
  var bounds = getBounds(chars.length, beg, len);
  for (var i = bounds.beg; i < bounds.end; i += 1) {
    char = chars[i];
    if (char < 32 || char === 127) {
      /* control characters */
      html += '<span class="' + style.CLASS_CTRL + '">' + _this.asciiChars[char] + '</span>';
    } else if (char > 127) {
      /* non-ASCII */
      html += '<span class="' + style.CLASS_CTRL + '">' + 'U+' + _this.charToHex(char) + '</span>';
    } else {
      /* printing ASCII, 32 <= char <= 126 */
      html += _this.asciiChars[char];
    }
  }
  return html;
}
