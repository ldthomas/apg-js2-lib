// This module exports a variety of utility functions that support 
// [`apg`](https://github.com/ldthomas/apg-js2), [`apg-lib`](https://github.com/ldthomas/apg-js2-lib)
// and the generated parser applications.
"use strict";
// Standard set of colors and classes for HTML display of results.
exports.styleNames = {
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
  CLASS_LEFT0TABLE : "left-0-table",
  CLASS_LEFT1TABLE : "left-1-table",
  CLASS_LEFT2TABLE : "left-2-table"
}
exports.styleClasses = function(){
  var style = exports.styleNames;
  var html = '<style>\n';
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
// Table style for all columns right aligned (0 left-aligned cols)
exports.styleLeft0Table = function(){
  var style = exports.styleNames;
  var html = '<style>\n';
  html += "." + style.CLASS_LEFT0TABLE +"\n";
  html += "." + style.CLASS_LEFT0TABLE +" th,\n";
  html += "." + style.CLASS_LEFT0TABLE +" td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += "." + style.CLASS_LEFT0TABLE +" caption\n";
  html += "{font-family:monospace;font-size:125%;font-style:normal;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
//Table style for all but last columns right aligned (1 left-aligned col)
exports.styleLeft1Table = function(){
  var style = exports.styleNames;
  var html = '<style>\n';
  html += "." + style.CLASS_LEFT1TABLE +",\n";
  html += "." + style.CLASS_LEFT1TABLE +" th,\n";
  html += "." + style.CLASS_LEFT1TABLE +" td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += "." + style.CLASS_LEFT1TABLE +" th:last-child{text-align:left;}\n";
  html += "." + style.CLASS_LEFT1TABLE +" td:last-child{text-align:left;}\n";
  html += "." + style.CLASS_LEFT1TABLE +" caption\n";
  html += "{font-family:monospace;font-size:125%;font-style:normal;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
//Table style for all but last 2 columns right aligned (2 left-aligned cols)
exports.styleLeft2Table = function(){
  var style = exports.styleNames;
  var html = '<style>\n';
  html += "." + style.CLASS_LEFT2TABLE +",\n";
  html += "." + style.CLASS_LEFT2TABLE +" th,\n";
  html += "." + style.CLASS_LEFT2TABLE +" td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += '.' + style.CLASS_LEFT2TABLE +' th:last-child{text-align:left;}\n';
  html += '.' + style.CLASS_LEFT2TABLE +' th:nth-last-child(2){text-align:left;}\n';
  html += '.' + style.CLASS_LEFT2TABLE +' td:last-child{text-align:left;}\n';
  html += '.' + style.CLASS_LEFT2TABLE +' td:nth-last-child(2){text-align:left;}\n';
  html += "." + style.CLASS_LEFT2TABLE +" caption\n";
  html += "{font-family:monospace;font-size:125%;font-style:normal;font-weight:bold;text-align:left;}\n";
  html += '</style>\n';
  return html;
}
//Generates a complete, minimal HTML5 page, inserting the user's HTML text on the page.
//- *html* - the page text in HTML format
//- *filename* - the name of the file to write the page to.
//Will fail and return an error message if this file cannot be opened or
//created.
//- *classname* - defaults to "apg-table". (I'm not sure including this as
//parameter makes any sense, but here it is for now.)
//- *title* - the HTML page `<title>` - defaults to filename.
exports.htmlToPage = function(html, title) {
var thisFileName = "utilities.js: ";
if(typeof(html) !== "string"){
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
page += exports.styleLeft0Table();
page += exports.styleLeft1Table();
page += exports.styleLeft2Table();
page += '</head>\n<body>\n';
page += '<p>' + new Date() + '</p>\n';
page += html;
page += '</body>\n</html>\n';
return page;
};
// Formats the returned object from [`parser.parse()`](./parse.html)
// into an HTML table.
//return {
//  success : sysData.success,
//  state : sysData.state,
//  length : charsLength,
//  matched : sysData.phraseLength,
//  maxMatched : maxMatched,
//  maxTreeDepth : maxTreeDepth,
//  nodeHits : nodeHits,
//  inputLength : chars.length,
//  subBegin : charsBegin,
//  subEnd : charsEnd,
//  subLength : charsLength
//};
exports.parserResultToHtml = function(result, caption, className) {
  var id = require("./identifiers.js");
  var style = exports.styleNames;
  if (typeof (caption !== "string")) {
    caption = "Parser State";
  }
  if (typeof (className !== "string")) {
    className = "left-1-table";
  }
  var success, state;
  if (result.success === true) {
    success = '<span class="'+style.CLASS_MATCH+'">true</span>';
  } else {
    success = '<span class="'+style.CLASS_noMATCH+'">FALSE</span>';
  }
  if (result.state === id.EMPTY) {
    state = '<span class="'+style.CLASS_EMPTY+'">EMPTY</span>';
  } else if (result.state === id.MATCH) {
    state = '<span class="'+style.CLASS_MATCH+'">MATCH</span>';
  } else if (result.state === id.NOMATCH) {
    state = '<span class="'+style.CLASS_NOMATCH+'">NOMATCH</span>';
  } else {
    state = '<span class="'+style.CLASS_NOMATCH+'">unrecognized</span>';
  }
  var html = '';
  html += '<p><table class="' + className + '">\n';
  html += '<caption>' + caption + '</caption>\n';
  html += '<tr><th>state item</th><th>value</th><th>description</th></tr>\n';
  html += '<tr><td>parser success</td><td>' + success + '</td><td>true if the parse succeeded, false otherwise'
      + '<br>NOTE: for success, entire string must be matched</th></tr>\n';
  html += '<tr><td>parser state</td><td>' + state + '</td>\n';
  html += '<td><span class="'+style.CLASS_EMPTY+'">EMPTY</span>, ';
  html += '<span class="'+style.CLASS_MATCH+'">MATCH</span> or \n';
  html += '<span class="'+style.CLASS_NOMATCH+'">NOMATCH</span></td></tr>\n';
  html += '<tr><td>length</td><td>' + result.length + '</td><td>length of the input (sub)string</td></tr>\n';
  html += '<tr><td>matched length</td><td>' + result.matched
      + '</td><td>number of input string characters matched</td></tr>\n';
  html += '<tr><td>max matched</td><td>' + result.maxMatched
      + '</td><td>maximum number of input string characters matched</td></tr>\n';
  html += '<tr><td>max tree depth</td><td>' + result.maxTreeDepth
      + '</td><td>maximum depth of the parse tree reached</td></tr>\n';
  html += '<tr><td>node hits</td><td>' + result.nodeHits
      + '</td><td>number of parse tree node hits (opcode function calls)</td></tr>\n';
  html += '<tr><td>input length</td><td>' + result.inputLength
  + '</td><td>length of full input string</td></tr>\n';
  html += '<tr><td>sub-string begin</td><td>' + result.subBegin
  + '</td><td>sub-string first character index</td></tr>\n';
  html += '<tr><td>sub-string end</td><td>' + result.subEnd
  + '</td><td>sub-string end-of-string index</td></tr>\n';
  html += '<tr><td>sub-string length</td><td>' + result.subLength
  + '</td><td>sub-string length</td></tr>\n';
  html += '</table></p>\n';
  return html;
}
// Formats an array of integer character codes to HTML.
// - *chars* - the array of integers
// - *beg* - the first character in the array to format
// - *end* - the last character (included) in the array to format
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
        /* normal - printable ASCII characters */
        if (state === CONTROL_BEG) {
          html += CONTROL_END;
          state = NORMAL;
        } else if (state == INVALID_BEG) {
          html += INVALID_END;
          state = NORMAL;
        }
        /* handle reserved HTML entity characters */
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
        /* control characters */
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
        /* invalid characters */
        if (state === NORMAL) {
          html += INVALID_BEG;
          state = INVALID_BEG;
        } else if (state == CONTROL_BEG) {
          html += CONTROL_END + INVALID_BEG;
          state = INVALID_BEG;
        }
        /* display character as hexidecimal value */
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
// Used by [`apg`](https://github.com/ldthomas/apg-js2) to format specialized
// error objects into an HTML table.
// It's here because it was used by more than one object at one time. I think
// only `apg` uses it now.
exports.errorsToHtml = function(chars, lines, errors, title) {
  var style = exports.styleNames;
  var html = "";
  var that = this;
  if (!(Array.isArray(chars) && Array.isArray(lines) && Array.isArray(errors))) {
    return html;
  }
  if (typeof (title) !== "string") {
    title = "&nbsp;";
  }
  var className = "left-1-table";
  var errorArrow = '<span class="'+style.CLASS_NOMATCH+'">&raquo;</span>';
  html += '<p><table class="' + className + '">\n';
  html += '<caption>' + title + '</caption>\n';
  html += '<tr><th>line<br>no.</th><th>first<br>char</th><th><br>text</th></tr>\n';
  errors.forEach(function(val) {
    var line, relchar, beg, end, length, text, prefix = "", suffix = "";
    if (lines.length === 0) {
      text = errorArrow;
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
      text = prefix + errorArrow + suffix;
      relchar = val.char - line.beginChar;
    }
    html += '<tr>';
    html += '<td>' + val.line + '</td><td>' + relchar + '</td><td>' + text + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td colspan="2"></td>' + '<td>&uarr;:&nbsp;' + val.msg + '</td>'
    html += '</tr>\n';
  });
  html += '</table></p>\n';
  return html;
}
// Translates a sub-array of integer character codes into a string.
// Very useful in callback functions to translate the matched phrases into
// strings.
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
