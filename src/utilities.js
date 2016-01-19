// This module exports a variety of utility functions that support 
// [`apg`](https://github.com/ldthomas/apg-js2), [`apg-lib`](https://github.com/ldthomas/apg-js2-lib)
// and the generated parser applications.
"use strict";
// Formats the returned object from [`parser.parse()`](./parse.html)
// into an HTML table.
//return {
//  success : sysData.success,
//  state : sysData.state,
//  length : chars.length,
//  matched : sysData.phraseLength,
//  maxMatched : maxMatched,
//  maxTreeDepth : maxTreeDepth,
//  nodeHits : nodeHits
//};
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
  html += '<tr><td>parser success</td><td>' + success + '</td><td>true if the parse succeeded, false otherwise'
      + '<br>NOTE: for success, entire string must be matched</th></tr>\n';
  html += '<tr><td>parser state</td><td>' + state + '</td><td>EMPTY, MATCH or NOMATCH</td></tr>\n';
  html += '<tr><td>string length</td><td>' + parserState.length + '</td><td>length of the input string</td></tr>\n';
  html += '<tr><td>matched length</td><td>' + parserState.matched
      + '</td><td>number of input string characters matched</td></tr>\n';
  html += '<tr><td>max matched</td><td>' + parserState.maxMatched
      + '</td><td>maximum number of input string characters matched</td></tr>\n';
  html += '<tr><td>max tree depth</td><td>' + parserState.maxTreeDepth
      + '</td><td>maximum depth of the parse tree reached</td></tr>\n';
  html += '<tr><td>node hits</td><td>' + parserState.nodeHits
      + '</td><td>number of parse tree node hits (opcode function calls)</td></tr>\n';
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
// Generates a complete, minimal HTML5 page, inserting the user's HTML text on the page.
// - *html* - the page text in HTML format
// - *filename* - the name of the file to write the page to.
// Will fail and return an error message if this file cannot be opened or
// created.
// - *classname* - defaults to "apg-table". (I'm not sure including this as
// parameter makes any sense, but here it is for now.)
// - *title* - the HTML page `<title>` - defaults to filename.
exports.htmlToPage = function(html, title, style) {
  var thisFileName = "utilities.js: ";
  if(typeof(html) !== "string"){
    throw new Error(thisFileName + "htmlToPage: input HTML is not a string");
  }
  if (typeof (style) !== "string") {
    style = this.styleApgTable();
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
  page += style;
  page += html;
  page += '</head>\n<body>\n';
  page += '<p>' + new Date() + '</p>\n';
  page += '</body>\n</html>\n';
  return page;
};
// HTML style for the apg-table used by many `toHtml()` -type functions.
exports.styleApgTable = function(){
  var COLOR_MATCH = "#0000FF";
  var COLOR_NOMATCH = "#ff0000";
  var COLOR_EMPTY = "#00ff00";
  var COLOR_INVALID = "#cc0000";
  var COLOR_CTRL = "#0000FF";
  var COLOR_CODE = "blue";
  var COLOR_SAMP = "#008000";
  var COLOR_VAR = "#cc0000";
  var COLOR_BACK = "#b2ffb2";
  var html = '<style>\n';
  html += "table.apg-table,\n";
  html += ".apg-table th,\n";
  html += ".apg-table td{text-align:right;border:1px solid black;border-collapse:collapse;}\n";
  html += ".apg-table th:last-child{text-align:left;}\n";
  html += ".apg-table td:last-child{text-align:left;}\n";
  html += ".apg-table b, \/*match*\/\n";
  html += ".apg-table i, \/* empty *\/\n";
  html += ".apg-table kbd, \/* no-match *\/\n";
  html += ".apg-table em, \/* invalid characters *\/\n";
  html += ".apg-table code, \/*control characters*\/\n";
  html += ".apg-table strong, \/* bold *\/\n";
  html += ".apg-table samp,\n";
  html += ".apg-table var\n";
  html += "{font-family:monospace;font-size:100%;font-style:normal;font-weight:normal;}\n";
  html += ".apg-table caption\n";
  html += "{font-family:monospace;font-size:125%;font-style:normal;font-weight:bold;text-align:left;}\n";
  html += ".apg-table b{color:"+COLOR_MATCH+";}\n";
  html += ".apg-table i{color:"+COLOR_EMPTY+";}\n";
  html += ".apg-table kbd{color:"+COLOR_NOMATCH+";}\n";
  html += ".apg-table em{color:"+COLOR_INVALID+";font-style:italic;font-weight:bold;}\n";
  html += ".apg-table strong{font-weight:bold;}\n";
  html += ".apg-table code{color:"+COLOR_CTRL+";font-style:italic;font-weight:bold;font-size:75%;}\n";
  html += ".apg-table samp{background-color:"+COLOR_BACK+";color:"+COLOR_SAMP+";}\n";
  html += ".apg-table var{color:"+COLOR_VAR+";font-weight:bold;}\n";
  html += '</style>\n';
  return html;
}
