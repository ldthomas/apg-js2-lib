// This module provides a means of tracing the parser through the parse tree as it goes.
// It is the primary debugging facility for debugging both the SABNF grammar syntax
// and the input strings that are supposed to valid grammar sentences.
// It is also a very informative and educational tool for understanding
// how a parser actually operates for a given language.
//
// Tracing is the process of generating and saving a record of information for each passage
// of the parser through a parse tree node. And since it traverses each node twice, once down the tree
// and once coming back up, there are two records for each node.
// This, obviously, has the potential of generating lots of records.
// And since these records are normally displayed on a web page (this being JavaScript)
// it is important to have a means to limit the actual number of records generated to
// probably no more that a few thousand. This is almost always enough to find any errors.
// The problem is to get the *right* few thousand records.
// Therefore, this module has a number of ways of limiting,or filtering, the number and type of records.
// Considerable effort has been made to make this filtering of the trace output as simple
// and intuitive as possible. In [previous versions](http://coasttocoastresearch.com/)
// of the APG library this has admittedly not been very clean.
//
// However, the ability to filter the trace records, or for that matter even understand what they are
// and the information they contain, does require a minimum amount of understanding of the APG parsing
// method. The parse tree nodes are all represented by APG operators. They break down into two natural groups.
// - The `RNM` operators and `UDT` operators are named phrases.
// These are names chosen by the writer of the SABNF grammar to represent special phrases of interest.
// - all others, the `ALT, CAT, REP, AND, NOT, TLS, TBS & TRG` operators. These collect and concatenate various
// intermediate phrases along the way.
//
// Therefore, there are separate means of filtering which of these operators get saved records.
// By default, all of the `RNM` and `UDT` records are saved and none of the others are. This is often sufficient.
// Often the problem shows up right away as a rule name phrase that should be matched but isn't.
// To limit these records, specific rules only can be saved by naming them prior to parsing use:<br>
// `trace.filter.rules["rulename"] = true;`<br>
// where `trace` is the `trace.js` object and `rulename` is any rule or `UDT` name defined in the grammar.
// This will default all rule name operators to `false` except for those specifically named.<br>
// The special rule name `<ALL>` will turn on tracing of all rule and `UDT` names (default).<br>
// The special rule name `<NONE>` will turn off all rule and `UDT` names.
//
// Trace records for the non-rule name operators are filtered in a similar manner. To collect records
// for a specified few of them use:<br>
// `trace.filter.operators["TBS"] = true`<br>
// for example to save all `TBS` node records. Similarly,<br>
// the special operator `<ALL>` will turn on tracing of all non-rule name operators.<br>
// The special rule name `<NONE>` will turn off all non-rule operators (default).

// There is, additionally, a means for limiting the total number of filtered or saved trace records.
// See the function, `setMaxRecords(max)` below. This will result in only the last `max` records being saved. 
// 
// (See [`apg-examples`](https://github.com/ldthomas/apg-js2-examples) for examples of using `trace.js`.)
module.exports = function() {
  "use strict";
  var thisFileName = "trace.js: ";
  var that = this;
  var MODE_HEX = 16;
  var MODE_DEC = 10;
  var MODE_ASCII = 8;
  var MODE_UNICODE = 32;
  var MAX_PHRASE = 128;
  var MAX_TLS = 5;
  var CLASS_MATCH = "match";
  var CLASS_BACKTRACK = "backtrack";
  var CLASS_EMPTY = "empty";
  var CLASS_LOOKAHEAD = "look-ahead";
  var CLASS_LOOKBEHIND = "look-behind";
  var CLASS_REMAINDER = "remainder";
  var CLASS_CTRL = "ctrl-char";
  var CLASS_END = "line-end";
  var PHRASE_END_CHAR = "&bull;";
  var PHRASE_CONTINUE_CHAR = "&hellip;";
  var PHRASE_END = '<span class="'+CLASS_END+'">&bull;</span>';
  var PHRASE_CONTINUE = '<span class="'+CLASS_END+'">&hellip;</span>';
  var EMPTY_CHAR = '<span class="'+CLASS_EMPTY+'">&#120634;</span>';
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
  /* filter the non-RNM & non-UDT operators */
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
      operatorFilter[id.BKR] = set;
    }
    var all, items = 0;
    for ( var name in that.filter.operators) {
      items += 1;
    }
    if (items === 0) {
      /* case 1: no operators specified: default: do not trace any operators */
      setOperators(false);
    } else {
      all = false;
      for ( var name in that.filter.operators) {
        var upper = name.toUpperCase();
        if (upper === '<ALL>') {
          /* case 2: <all> operators specified: trace all operators ignore all other operator commands */
          setOperators(true);
          all = true;
          break;
        }
        if (upper === '<NONE>') {
          /* case 3: <none> operators specified: trace NO operators ignore all other operator commands */
          setOperators(false);
          all = true;
          break;
        }
      }
      if (all === false) {
        setOperators(false);
        for ( var name in that.filter.operators) {
          var upper = name.toUpperCase();
          /* case 4: one or more individual operators specified: trace specified operators only */
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
          } else if (upper === 'BKR') {
            operatorFilter[id.BKR] = true;
          } else {
            throw new Error(thisFileName + "initOpratorFilter: '" + name + "' not a valid operator name."
                + " Must be <all>, <none>, alt, cat, rep, and, not, tls, tbs, bkr or trg");
          }
        }
      }
    }
  }
  /* filter the rule and `UDT` named operators */
  var initRuleFilter = function() {
    var setRules = function(set) {
      operatorFilter[id.RNM] = set;
      operatorFilter[id.UDT] = set;
      var count = rules.length + udts.length
      ruleFilter.length = 0;
      for (var i = 0; i < count; i += 1) {
        ruleFilter.push(set);
      }
    }
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
      /* case 1: default to all rules & udts */
      setRules(true);
    } else {
      all = false;
      for ( var name in that.filter.rules) {
        var lower = name.toLowerCase();
        if (lower === '<all>') {
          /* case 2: trace all rules ignore all other rule commands */
          setRules(true);
          all = true;
          break;
        }
        if (lower === '<none>') {
          /* case 3: trace no rules */
          setRules(false);
          all = true;
          break;
        }
      }
      if (all === false) {
        /* case 4: trace only individually specified rules */
        setRules(false);
        for ( var name in that.filter.rules) {
          var lower = name.toLowerCase();
          i = list.indexOf(lower);
          if (i < 0) {
            throw new Error(thisFileName + "initRuleFilter: '" + name + "' not a valid rule or udt name");
          }
          ruleFilter[i] = true;
        }
        operatorFilter[id.RNM] = true;
        operatorFilter[id.UDT] = true;
      }
    }
  }
  /* used by other APG components to verify that they have a valid trace object */
  this.traceObject = "traceObject";
  this.filter = {
    operators : [],
    rules : []
  }
  // Set the maximum number of records to keep (default = 5000).
  // Each record number larger than `maxLines`
  // will result in deleting the previously oldest record.
  this.setMaxRecords = function(max) {
    if (typeof (max) === "number" && max > 0) {
      maxLines = Math.ceil(max);
    }
  }
  // Returns `maxLines` to the caller.
  this.getMaxRecords = function() {
    return maxLines;
  }
  // Called only by the `parser.js` object. No verification of input.
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
  /* returns true if this records passes through the designated filter, false if the record is to be skipped */
  var filter = function(op) {
    var ret = false;
    if (op.type === id.RNM) {
      if (operatorFilter[op.type] && ruleFilter[op.index]) {
        ret = true;
      } else {
        ret = false;
      }
    } else if (op.type === id.UDT) {
      if (operatorFilter[op.type] && ruleFilter[rules.length + op.index]) {
        ret = true;
      } else {
        ret = false;
      }
    } else {
      ret = operatorFilter[op.type];
    }
    return ret;
  }
  // Collect the "down" record.
  this.down = function(op, state, offset, length, backtrack, lookAround) {
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
        phraseLength : length,
        backtrack : backtrack,
        lookAround : lookAround
      };
      filteredRecords += 1;
      treeDepth += 1;
    }
  };
  // Collect the "up" record.
  this.up = function(op, state, offset, length, backtrack, lookAround) {
    totalRecords += 1;
    if (filter(op)) {
      var thisLine = filteredRecords;
      var thatLine = lineStack.pop();
      var thatRecord = circular.getListIndex(thatLine);
      if (thatRecord !== -1) {
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
        phraseLength : length,
        backtrack : backtrack,
        lookAround : lookAround
      };
      filteredRecords += 1;
    }
  };
  var htmlHeader = function(mode, caption){
    /* open the page */
    /* write the HTML5 header with table style */
    /* open the <table> tag */
    var modeName;
    switch(mode){
    case MODE_HEX:
      modeName = "hexidecimal";
      break;
    case MODE_DEC:
      modeName = "decimal";
      break;
    case MODE_ASCII:
      modeName = "ASCII";
      break;
    case MODE_UNICODE:
      modeName = "UNICODE";
      break;
    default:
      throw new Error(thisFileName + "htmlHeader: unrecognized mode: " + mode);
      break;
    }
    /* page colors */
    var pageTextColor = "#000000";
    var pageBackgroundColor = "#FFFFFF";
    var tableBorderColor = "#000000";
    var matchColor = "#0066ff";
// var nomatchColor = "#ff4d4d";
// var emptyColor = "#00cc00";
    var emptyColor = "#0fbd0f";
// var lookAheadColor = "#00ffff";
    var lookAheadColor = "#008b8b";
// var lookBehindColor = "#ff33ff";
//    var lookBehindColor = "#e600e5";
    var lookBehindColor = "#bf00ff";
    var backtrackColor = "#ff4d4d";
    var lineEndColor = "#000000";
//    var remainderColor = "#a9a9a9";
    var remainderColor = "#999999";
    var controlCharacterColor = "#4b0082";
    var title = "trace";
    var header = '<!DOCTYPE html>\n';
    header += '<html lang="en">\n';
    header += '<head>\n';
    header += '<meta charset="utf-8">\n';
    header += '<title>' + title + '</title>\n';
// header += '<link rel="stylesheet" type="text/css" href="trace-table.css" media="screen" title="Sinorca (screen)" />\n';
    header += '<style>\n';
    header += 'body {\n';
    header += '  color: '+pageTextColor+';\n';
    header += '  background-color: '+pageBackgroundColor+';\n';
    header += '  font-family: monospace;\n';
    header += '  font-size: .9em\n';
    header += '  margin: 0 0 10px 10px;\n';
    header += '  padding: 0;\n';
    header += '}\n';
// header += 'h1, h2, h3, h4, h5, h6 {color: #6297bc;}\n';
    header += 'h1, h2, h3, h4, h5, h6 {margin: 5px 0 5px 0;}\n';
    header += 'table.trace-table,\n';
    header += '.trace-table th,\n';
    header += '.trace-table td{text-align:right;border:1px solid '+tableBorderColor+';border-collapse:collapse;}\n';
    header += '.trace-table th:last-child{text-align:left;}\n';
    header += '.trace-table th:nth-last-child(2){text-align:left;}\n';
    header += '.trace-table td:last-child{text-align:left;}\n';
    header += '.trace-table td:nth-last-child(2){text-align:left;}\n';
    header += 'table.trace-table caption{font-weight: bold;}\n';
    header += 'span.'+CLASS_MATCH+'{font-weight: bold; color: '+matchColor+';}\n';
    header += 'span.'+CLASS_EMPTY+'{font-weight: bold; color: '+emptyColor+';}\n';
    header += 'span.'+CLASS_BACKTRACK+'{font-weight: bold; color: '+backtrackColor+';}\n';
    header += 'span.'+CLASS_LOOKAHEAD+'{font-weight: bold; color: '+lookAheadColor+';}\n';
    header += 'span.'+CLASS_LOOKBEHIND+'{font-weight: bold; color: '+lookBehindColor+';}\n';
    header += 'span.'+CLASS_REMAINDER+'{font-weight: bold; color: '+remainderColor+';}\n';
    header += 'span.'+CLASS_CTRL+'{font-weight: bold; color: '+controlCharacterColor+';}\n';
    header += 'span.'+CLASS_END+'{font-weight: bold; color: '+lineEndColor+';}\n';
    header += '</style>\n';
    header += '</head>\n<body>\n';
    header += '<h1>JavaScript APG Trace</h1>\n';
    header += '<h3>&nbsp;&nbsp;&nbsp;&nbsp;display mode: ' + modeName + '</h3>\n';
    header += '<h5>&nbsp;&nbsp;&nbsp;&nbsp;' + new Date() + '</h5>\n';
    header += '<table class="trace-table">\n';
    if (typeof (caption) === "string") {
      header += '<caption>' + caption + '</caption>';
    }
    return header;
  }
  var htmlFooter = function(){
    var footer = "";
    /* close the </table> tag */
    footer += '</table>\n';
    /* display a table legend */
    footer += '<p>legend:<br>\n';
    footer += '(a)&nbsp;-&nbsp;line number<br>\n';
    footer += '(b)&nbsp;-&nbsp;matching line number<br>\n';
    footer += '(c)&nbsp;-&nbsp;phrase offset<br>\n';
    footer += '(d)&nbsp;-&nbsp;phrase length<br>\n';
    footer += '(e)&nbsp;-&nbsp;relative tree depth<br>\n';
    footer += '(f)&nbsp;-&nbsp;operator state<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&darr;&nbsp;&nbsp;phrase opened<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="match">&uarr;M</span> phrase matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="empty">&uarr;E</span> empty phrase matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="nomatch">&uarr;N</span> phrase not matched<br>\n';
    footer += 'operator&nbsp;-&nbsp;ALT, CAT, REP, RNM, TRG, TLS, TBS<sup>&dagger;</sup>, UDT, AND, NOT, BKA, BKN, BKR<sup>&Dagger;</sup><br>\n';
    footer += 'phrase&nbsp;&nbsp;&nbsp;-&nbsp;up to '+MAX_PHRASE+' characters of the phrase being matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="'+CLASS_MATCH+'">matched characters</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="'+CLASS_LOOKAHEAD+'">matched characters in look ahead mode</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="'+CLASS_LOOKBEHIND+'">matched characters in look behind mode</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="'+CLASS_BACKTRACK+'">backtracked characters</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="'+CLASS_REMAINDER+'">remainder characters(not yet examined by parser)</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="'+CLASS_CTRL+'">control characters</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;'+EMPTY_CHAR+' empty string<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;'+PHRASE_END+' end of input string<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;'+PHRASE_CONTINUE+' input string truncated<br>\n';
    footer += '</p>\n';
    footer += '<p>\n';
    footer += '<sup>&dagger;</sup>original ABNF operators:<br>\n';
    footer += 'ALT - alternation<br>\n';
    footer += 'CAT - concatenation<br>\n';
    footer += 'REP - repetition<br>\n';
    footer += 'RNM - rule name<br>\n';
    footer += 'TRG - terminal range<br>\n';
    footer += 'TLS - terminal literal string (case insensitive)<br>\n';
    footer += 'TBS - terminal binary string (case sensitive)<br>\n';
    footer += '<br>\n';
    footer += '<sup>&Dagger;</sup>super set SABNF operators:<br>\n';
    footer += 'UDT - user-defined terminal<br>\n';
    footer += 'AND - positive look ahead<br>\n';
    footer += 'NOT - negative look ahead<br>\n';
    footer += 'BKA - positive look behind<br>\n';
    footer += 'BKN - negative look behind<br>\n';
    footer += 'BKR - back referance<br>\n';
    footer += '</p>\n';
    /* close the page */
    footer += '</body>\n';
    footer += '</html>\n';
    return footer;
  }
  this.toHtml = function(modearg, caption){
    /* writes the trace records as a table in a complete html page */
    var mode = MODE_ASCII;
    if (typeof (modearg) === "string" && modearg.length >= 3) {
      var modein = modearg.toLowerCase().slice(0,3);
      if (modein === 'hex') {
        mode = MODE_HEX;
      } else if (modein === 'dec') {
        mode = MODE_DEC;
      } else if (modein === 'uni') {
        mode = MODE_UNICODE;
      }
    }
    var html = "";
    html += htmlHeader(mode, caption);
    html += toTable(mode);
    html += htmlFooter();
    return html;
  }
  // Returns the filtered records, formatted as an HTML table.
  // - *caption* - optional caption for the HTML table
  // - *mode* - "hex", "dec", "ascii", display string characters as
  // hexidecimal, decimal or ascii printing characters, respectively. (default "ascii")
  // - *classname* - default is "apg-table" but maybe someday there will be a user who
  // really wants to use his/her own style sheet.
  var toTable = function(mode) {
    if (rules === null) {
      return "";
    }
    var html = '';
    var line, thisLine, thatLine, lookAhead, lookBehind;
    html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
    html += '<th>operator</th><th>phrase</th></tr>\n';
    circular.forEach(function(lineIndex, index) {
      var line = lines[lineIndex];
      thisLine = line.thisLine;
      thatLine = (line.thatLine !== undefined) ? line.thatLine : '--';
      lookAhead = false;
      lookBehind = false;
      if(line.lookAround === id.AND || line.lookAround === id.NOT){
        lookAhead = true;
      }
      if(line.lookAround === id.BKA || line.lookAround === id.BKN){
        lookBehind = true;
      }
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
        html += '<span class="match">&uarr;M</span>';
        break;
      case id.NOMATCH:
        html += '<span class="nomatch">&uarr;N</span>';
        break;
      case id.EMPTY:
        html += '<span class="empty">&uarr;E</span>';
        break;
      default:
        html += '<span class="nomatch">--</span>';
        break;
      }
      html += '</td>';
      html += '<td>';
      html += that.indent(line.depth);
      if(lookAhead){
        html += '<span class="look-ahead">';
      }
      if(lookBehind){
        html += '<span class="look-behind">';
      }
      html += utils.opcodeToString(line.opcode.type);
      if (line.opcode.type === id.RNM) {
        html += '(' + rules[line.opcode.index].name + ') ';
      }
      if (line.opcode.type === id.BKR) {
        var casetype = line.opcode.insensitive ? "%i" : "%s";
        html += '(\\' + casetype + rules[line.opcode.index].name + ') ';
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
      if (line.opcode.type === id.REP) {
        html += '(' + displayRep(mode, line.opcode) + ') ';
      }
      if(lookAhead || lookBehind){
        html += '</span>';
      }
      html += '</td>';
      html += '<td>';
//      html += displayPhrase(mode, chars, line.phraseIndex, line.phraseLength, line.state);
//      html += subdec(chars, line.phraseIndex, chars.length - line.phraseIndex);
      html += displayPhrase(lookAhead, lookBehind, mode, line.state, chars, line.phraseIndex, line.phraseLength, line.backtrack);
      html += '</td></tr>\n';

    });
    html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
    html += '<th>operator</th><th>phrase</th></tr>\n';
    html += '</table>\n';
    return html;
  };

  // From here on down, these are just helper functions for `displayHtml()`.
  this.indent = function(depth) {
    var html = '';
    for (var i = 0; i < depth; i += 1) {
      html += '.';
// html += '&#46;';
// if (i % 2 === 0) {
// html += '&nbsp;';
// } else {
// html += '&#46;';
// }
    }
    return html;
  };
  var displayTrg = function(mode, op) {
    var html = "";
    if (op.type === id.TRG) {
      var min, max, hex;
      if (mode === MODE_HEX) {
        hex = op.min.toString(16).toUpperCase();
        if (hex.length % 2 !== 0) {
          hex = "0" + hex;
        }
        html = "%x" + hex;
        hex = op.max.toString(16).toUpperCase();
        if (hex.length % 2 !== 0) {
          hex = "0" + hex;
        }
        html += "&ndash;" + hex;
      } else {
        html = "%d" + op.min.toString(10) + "&ndash;" + op.max.toString(10);
      }
    }
    return html;
  }
  var displayRep = function(mode, op) {
    var html = "";
    if (op.type === id.REP) {
      var min, max, hex;
      if (mode === MODE_HEX) {
        hex = op.min.toString(16).toUpperCase();
        if (hex.length % 2 !== 0) {
          hex = "0" + hex;
        }
        html = "x" + hex;
        if (op.max < Infinity) {
          hex = op.max.toString(16).toUpperCase();
          if (hex.length % 2 !== 0) {
            hex = "0" + hex;
          }
        } else {
          hex = "inf";
        }
        html += "&ndash;" + hex;
      } else {
        if (op.max < Infinity) {
          html = op.min.toString(10) + "&ndash;" + op.max.toString(10);
        } else {
          html = op.min.toString(10) + "&ndash;" + "inf";
        }
      }
    }
    return html;
  }
  var displayTbs = function(mode, op) {
    var html = "";
    if (op.type === id.TBS) {
      var len = Math.min(op.string.length, MAX_TLS * 2);
      if (mode === MODE_HEX) {
        html = "%x";
        for (var i = 0; i < len; i += 1) {
          var hex;
          if (i > 0) {
            html += ".";
          }
          hex = op.string[i].toString(16).toUpperCase();
          if (hex.length % 2 !== 0) {
            hex = "0" + hex;
          }
          html += hex;
        }
      } else {
        html = "%d";
        for (var i = 0; i < len; i += 1) {
          if (i > 0) {
            html += ".";
          }
          html += op.string[i].toString(10);
        }
      }
      if (len < op.string.length) {
        html += PHRASE_CONTINUE;
      }
    }
    return html;
  }
  var displayTls = function(mode, op) {
    var html = "";
    if (op.type === id.TLS) {
      var len = Math.min(op.string.length, MAX_TLS);
      if (mode === MODE_HEX || mode === MODE_DEC) {
        var charu, charl, base;
        if (mode === MODE_HEX) {
          html = "%x";
          base = 16;
        } else {
          html = "%d";
          base = 10;
        }
        for (var i = 0; i < len; i += 1) {
          if (i > 0) {
            html += ".";
          }
          charl = op.string[i];
          if (charl >= 97 && charl <= 122) {
            charu = charl - 32;
            html += (charu.toString(base) + '/' + charl.toString(base)).toUpperCase();
          } else if (charl >= 65 && charl <= 90) {
            charu = charl;
            charl += 32;
            html += (charu.toString(base) + '/' + charl.toString(base)).toUpperCase();
          } else {
            html += charl.toString(base).toUpperCase();
          }
        }
        if (len < op.string.length) {
          html += PHRASE_CONTINUE;
        }
      } else {
        html = '"';
        for (var i = 0; i < len; i += 1) {
          html += String.fromCharCode(op.string[i]);
        }
        if (len < op.string.length) {
          html += PHRASE_CONTINUE;
        }
        html += '"';
      }
    }
    return html;
  }
//  var displayPhrase = function(mode, chars, offset, len, state) {
 var displayPhrase = function(ahead, behind, mode, state, chars, index, length, backtrack) {
    var html = '';
    var beg1, len1, beg2, len2;
    var lastchar = PHRASE_END;
    var spanbeg1 = "";
    var spanend1 = "";
    var spanbeg2 = '<span class="'+CLASS_REMAINDER+'">'
    var spanend2 = '</span>';
    if(behind){
      /* do it differently */
      html += "TODO: look behind";
    }else{
      switch(state){
      case id.ACTIVE:
        beg1 = index;
        len1 = 0;
        beg2 = index;
        len2 = chars.length - beg2;
        break;
      case id.EMPTY:
        html += EMPTY_CHAR;
        if(backtrack > 0){
          beg1 = index;
          len1 = backtrack;
          spanbeg1 = '<span class="'+CLASS_BACKTRACK+'">'
          spanend1 = '</span>';
          beg2 = index + len1;
          len2 = chars.length - beg2;
        }else{
          beg1 = index;
          len1 = 0;
          beg2 = index;
          len2 = chars.length - beg2;
        }
        break;
      case id.MATCH:
        spanbeg1 = '<span class="'
        spanbeg1 += ahead ? CLASS_LOOKAHEAD: CLASS_MATCH;
        spanbeg1 += '">';
        spanend1 = '</span>';
        beg1 = index;
        len1 = length;
        beg2 = index + len1;
        len2 = chars.length - beg2;
        break;
      case id.NOMATCH:
        spanbeg1 = '<span class="'+CLASS_BACKTRACK+'">';
        spanend1 = '</span>';
        beg1 = index;
        len1 = backtrack;
        beg2 = index + len1;
        len2 = chars.length - beg2;
        break;
      }
      lastchar = PHRASE_END;
      if(len1 > MAX_PHRASE){
        len1 = MAX_PHRASE;
        lastchar = PHRASE_CONTINUE;
        len2 = 0;
      }else if(len1 + len2 > MAX_PHRASE){
        lastchar = PHRASE_CONTINUE;
        len2 = MAX_PHRASE - len1;
      }
      if(len1 > 0){
        html += spanbeg1;
        html += subPhrase(mode, chars, beg1, len1);
        html += spanend1;
      }
      if(len2 > 0){
        html += spanbeg2;
        html += subPhrase(mode, chars, beg2, len2);
        html += spanend2;
      }
      html += lastchar;
    }
    return html;
  }
  var subPhrase = function(mode, chars, index, length) {
    if(length === 0){
      return "";
    }
    switch(mode){
    case MODE_HEX:
      return subhex(chars, index, length);
      break;
    case MODE_DEC:
      return subdec(chars, index, length);
      break;
    case MODE_UNICODE:
      return subunicode(chars, index, length);
      break;
    case MODE_ASCII:
      default:
      return subascii(chars, index, length);
      break;
    }
  }
  var subascii = function(chars, index, length){
    var html = "";
    var char, ctrl;
    var end = index + length;
    for (var i = index; i < end; i += 1) {
      char = chars[i];
      if(char < 32 || char === 126){
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
        html += '<span class="'+CLASS_CTRL+'">\\x'+ctrl+'</span>';
      }else if (char > 126){
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
        html += '\\x'+ctrl;
      }else{
        switch(char){
        case 32:
          html += '&nbsp;';
          break;
        case 34:
          html += '&#34;';
          break;
        case 38:
          html += '&#38;';
          break;
        case 39:
          html += '&#39;';
          break;
        case 60:
          html += '&#60;';
          break;
        case 62:
          html += '&#62;';
          break;
        default:
        html += String.fromCharCode(char);
          break;
        }
      }
    }
  return html;
  }
  var subhex = function(chars, index, length){
    var html = "";
    var char, ctrl;
    var end = index + length;
    for (var i = index; i < end; i += 1) {
      char = chars[i];
      if(char < 32 || char === 126){
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
        html += '<span class="'+CLASS_CTRL+'">\\x'+ctrl+'</span>';
      }else{
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
        html += '\\x'+ctrl;
      }
    }
  return html;
  }
  var subunicode = function(chars, index, length){
    var html = "";
    var char, ctrl;
    var end = index + length;
    for (var i = index; i < end; i += 1) {
      char = chars[i];
      if(char < 32 || char === 126){
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
        html += '<span class="'+CLASS_CTRL+'">\\u'+ctrl+'</span>';
      }else{
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
        html += '\\u'+ctrl;
      }
    }
  return html;
  }
  var subdec = function(chars, index, length){
    var html = "";
    var char, ctrl;
    char = chars[0];
    if(char < 32 || char === 126){
      html += '<span class="'+CLASS_CTRL+'">'+char+'</span>';
    }else{
      html += char;
    }
    var end = index + length;
    for (var i = index+1; i < end; i += 1) {
      char = chars[i];
      html += ",";
      if(char < 32 || char === 126){
        html += '<span class="'+CLASS_CTRL+'">'+char+'</span>';
      }else{
        html += char;
      }
    }
  return html;
  }
// var subPhrase = function(mode, chars, beg, end, prefix) {
// var html = "";
// var char;
// var threshold;
// if (typeof (prefix) === "number") {
// threshold = (prefix > 0) ? -1 : beg;
// } else {
// threshold = beg;
// }
// for (var i = beg; i < end; i += 1) {
// if (mode === MODE_HEX) {
// char = chars[i].toString(16).toUpperCase();
// if (char.length % 2 !== 0) {
// char = "0" + char;
// }
// html += "x" + char;
// } else if (mode === MODE_DEC) {
// if (i > threshold) {
// html += ",";
// }
// html += chars[i].toString(10);
// } else {
// if (chars[i] === 10) {
// html += '<code>LF</code>';
// } else if (chars[i] === 13) {
// html += '<code>CR</code>';
// } else if (chars[i] === 9) {
// html += '<code>TAB</code>';
// } else if (chars[i] === 32) {
// html += '&nbsp;';
// } else if (chars[i] === 34) {
// html += '&#34;';
// } else if (chars[i] === 38) {
// html += '&#38;';
// } else if (chars[i] === 39) {
// html += '&#39;';
// } else if (chars[i] === 60) {
// html += '&#60;';
// } else if (chars[i] === 62) {
// html += '&#62;';
// } else if (chars[i] < 33 || chars[i] > 126) {
// html += '<code>x' + chars[i].toString(16) + '</code>';
// } else {
// html += String.fromCharCode(chars[i]);
// }
// }
// }
// return html;
// }
}
