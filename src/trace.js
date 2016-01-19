7// This module provides a means of tracing the parser through the parse tree as it goes.
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
  /* colors */
  var COLOR_EMPTY = "#0fbd0f";
  var COLOR_MATCH = "#264BFF";
  var COLOR_LH_MATCH = "#1A97BA";
  var COLOR_LB_MATCH = "#5F1687";
  var COLOR_NOMATCH = "#FF4000";
  var COLOR_LH_NOMATCH = "#FF8000";
  var COLOR_LB_NOMATCH = "#e6ac00";
  var COLOR_END = "#000000";
  var COLOR_CTRL = "#000000";
  var COLOR_REMAINDER = "#999999";
  var COLOR_TEXT = "#000000";
  var COLOR_BACKGROUND = "#FFFFFF";
  var COLOR_BORDER = "#000000";
  /* color classes */
  var CLASS_MATCH = "match";
  var CLASS_EMPTY = "empty";
  var CLASS_OS_ACTIVE = "os-active";
  var CLASS_OS_MATCH = "os-match";
  var CLASS_OS_EMPTY = "os-empty";
  var CLASS_OS_NOMATCH = "osnomatch";
  var CLASS_LH_MATCH = "lh-match";
  var CLASS_LB_MATCH = "lb-match";
  var CLASS_REMAINDER = "remainder";
  var CLASS_CTRL = "ctrl-char";
  var CLASS_END = "line-end";
  /* special trace table phrases */
  var PHRASE_END_CHAR = "&bull;";
  var PHRASE_CONTINUE_CHAR = "&hellip;";
  var PHRASE_END = '<span class="' + CLASS_END + '">&bull;</span>';
  var PHRASE_CONTINUE = '<span class="' + CLASS_END + '">&hellip;</span>';
  var PHRASE_EMPTY = '<span class="' + CLASS_EMPTY + '">&#120634;</span>';
  var PHRASE_NOMATCH = '<span class="' + CLASS_OS_NOMATCH + '">&#120636;</span>';
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
      operatorFilter[id.TLS] = set;
      operatorFilter[id.TBS] = set;
      operatorFilter[id.TRG] = set;
      operatorFilter[id.AND] = set;
      operatorFilter[id.NOT] = set;
      operatorFilter[id.BKR] = set;
      operatorFilter[id.BKA] = set;
      operatorFilter[id.BKN] = set;
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
          } else if (upper === 'BKA') {
            operatorFilter[id.BKA] = true;
          } else if (upper === 'BKN') {
            operatorFilter[id.BKN] = true;
          } else {
            throw new Error(thisFileName + "initOpratorFilter: '" + name + "' not a valid operator name."
                + " Must be <all>, <none>, alt, cat, rep, tls, tbs, trg, and, not, bkr, bka or bkn");
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
  this.down = function(op, state, offset, length,
      anchor, lookAround) {
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
        lookAnchor : anchor,
        lookAround : lookAround
      };
      filteredRecords += 1;
      treeDepth += 1;
    }
  };
  // Collect the "up" record.
  this.up = function(op, state, offset, length,
      anchor, lookAround) {
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
        lookAnchor : anchor,
        lookAround : lookAround
      };
      filteredRecords += 1;
    }
  };
  // The trace table style is available just in case it might be needed elsewhere sometime.
  this.styleTraceTable = function(){
    var html = "";
    html += '<style>\n';
    html += 'body {\n';
    html += '  color: ' + COLOR_TEXT + ';\n';
    html += '  background-color: ' + COLOR_BACKGROUND + ';\n';
    html += '  font-family: monospace;\n';
    html += '  font-size: .9em\n';
    html += '  margin: 0 0 10px 10px;\n';
    html += '  padding: 0;\n';
    html += '}\n';
    html += 'h1, h2, h3, h4, h5, h6 {margin: 5px 0 5px 0;}\n';
    html += 'table.trace-table,\n';
    html += '.trace-table th,\n';
    html += '.trace-table td{text-align:right;border:1px solid ' + COLOR_BORDER + ';border-collapse:collapse;}\n';
    html += '.trace-table th:last-child{text-align:left;}\n';
    html += '.trace-table th:nth-last-child(2){text-align:left;}\n';
    html += '.trace-table td:last-child{text-align:left;}\n';
    html += '.trace-table td:nth-last-child(2){text-align:left;}\n';
    html += 'table.trace-table caption{font-weight: bold;}\n';
    html += 'span.' + CLASS_OS_ACTIVE + '{font-weight: bold; color: ' + COLOR_TEXT + ';}\n';
    html += 'span.' + CLASS_OS_MATCH + '{font-weight: bold; color: ' + COLOR_MATCH + ';}\n';
    html += 'span.' + CLASS_OS_EMPTY + '{font-weight: bold; color: ' + COLOR_EMPTY + ';}\n';
    html += 'span.' + CLASS_OS_NOMATCH + '{font-weight: bold; color: ' + COLOR_NOMATCH + ';}\n';
    html += 'span.' + CLASS_MATCH + '{font-weight: bold; color: ' + COLOR_MATCH + ';}\n';
    html += 'span.' + CLASS_EMPTY + '{font-weight: bold; color: ' + COLOR_EMPTY + ';}\n';
    html += 'span.' + CLASS_LH_MATCH + '{font-weight: bold; color: ' + COLOR_LH_MATCH + ';}\n';
    html += 'span.' + CLASS_LB_MATCH + '{font-weight: bold; color: ' + COLOR_LB_MATCH + ';}\n';
    html += 'span.' + CLASS_REMAINDER + '{font-weight: bold; color: ' + COLOR_REMAINDER + ';}\n';
    html += 'span.' + CLASS_CTRL + '{font-weight: bolder; font-style: italic; font-size: .6em;}\n';
    html += 'span.' + CLASS_END + '{font-weight: bold; color: ' + COLOR_END + ';}\n';
    html += '</style>\n';
    return html;
  }
  this.toHtml = function(modearg, caption) {
    /* writes the trace records as a table in a complete html page */
    var mode = MODE_ASCII;
    if (typeof (modearg) === "string" && modearg.length >= 3) {
      var modein = modearg.toLowerCase().slice(0, 3);
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
    html += htmlTable(mode);
    html += htmlFooter();
    return html;
  }

  // From here on down, these are just helper functions for `toHtml()`.
  var htmlHeader = function(mode, caption) {
    /* open the page */
    /* write the HTML5 header with table style */
    /* open the <table> tag */
    var modeName;
    switch (mode) {
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
    var title = "trace";
    var header = '<!DOCTYPE html>\n';
    header += '<html lang="en">\n';
    header += '<head>\n';
    header += '<meta charset="utf-8">\n';
    header += '<title>' + title + '</title>\n';
    header += that.styleTraceTable();
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
  var htmlFooter = function() {
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
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_OS_ACTIVE + '">&darr;</span>&nbsp;&nbsp;phrase opened<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_OS_MATCH + '">&uarr;M</span> phrase matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_OS_EMPTY + '">&uarr;E</span> empty phrase matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_OS_NOMATCH + '">&uarr;N</span> phrase not matched<br>\n';
    footer += 'operator&nbsp;-&nbsp;ALT, CAT, REP, RNM, TRG, TLS, TBS<sup>&dagger;</sup>, UDT, AND, NOT, BKA, BKN, BKR<sup>&Dagger;</sup><br>\n';
    footer += 'phrase&nbsp;&nbsp;&nbsp;-&nbsp;up to ' + MAX_PHRASE + ' characters of the phrase being matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_MATCH
    + '">matched characters</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_LH_MATCH
    + '">matched characters in look ahead mode</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_LB_MATCH
    + '">matched characters in look behind mode</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_REMAINDER
        + '">remainder characters(not yet examined by parser)</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + CLASS_CTRL
        + '">control characters (ASCII mode only)</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;' + PHRASE_EMPTY + ' empty string<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;' + PHRASE_END + ' end of input string<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;' + PHRASE_CONTINUE
        + ' input string truncated<br>\n';
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
  // Returns the filtered records, formatted as an HTML table.
  // - *caption* - optional caption for the HTML table
  // - *mode* - "hex", "dec", "ascii", display string characters as
  // hexidecimal, decimal or ascii printing characters, respectively. (default "ascii")
  // - *classname* - default is "apg-table" but maybe someday there will be a user who
  // really wants to use his/her own style sheet.
  var htmlTable = function(mode) {
    if (rules === null) {
      return "";
    }
    var html = '';
    var line, thisLine, thatLine, lookAhead, lookBehind, lookAround, anchor;
    html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
    html += '<th>operator</th><th>phrase</th></tr>\n';
    circular.forEach(function(lineIndex, index) {
      var line = lines[lineIndex];
      thisLine = line.thisLine;
      thatLine = (line.thatLine !== undefined) ? line.thatLine : '--';
      lookAhead = false;
      lookBehind = false;
      lookAround = false;
      if (line.lookAround === id.LOOKAROUND_AHEAD) {
        lookAhead = true;
        lookAround = true;
        anchor = line.lookAnchor;
      }
      if (line.opcode.type === id.AND ||
          line.opcode.type === id.NOT) {
        lookAhead = true;
        lookAround = true;
        anchor = line.phraseIndex;
      }
      if (line.lookAround === id.LOOKAROUND_BEHIND){
        lookBehind = true;
        lookAround = true;
        anchor = line.lookAnchor;
      }
      if (line.opcode.type === id.BKA ||
          line.opcode.type === id.BKN) {
        lookBehind = true;
        lookAround = true;
        anchor = line.phraseIndex;
      }
      html += '<tr>';
      html += '<td>' + thisLine + '</td><td>' + thatLine + '</td>';
      html += '<td>' + line.phraseIndex + '</td>';
      html += '<td>' + line.phraseLength + '</td>';
      html += '<td>' + line.depth + '</td>';
      html += '<td>';
      switch (line.state) {
      case id.ACTIVE:
        html += '<span class="' + CLASS_OS_ACTIVE + '">&darr;&nbsp;</span>';
        break;
      case id.MATCH:
        html += '<span class="' + CLASS_OS_MATCH + '">&uarr;M</span>';
        break;
      case id.NOMATCH:
        html += '<span class="' + CLASS_OS_NOMATCH + '">&uarr;N</span>';
        break;
      case id.EMPTY:
        html += '<span class="' + CLASS_OS_EMPTY + '">&uarr;E</span>';
        break;
      default:
        html += '<span class="' + CLASS_OS_ACTIVE + '">--</span>';
        break;
      }
      html += '</td>';
      html += '<td>';
      html += that.indent(line.depth);
      if (lookAhead) {
        html += '<span class="' + CLASS_LH_MATCH + '">';
      }else  if (lookBehind) {
        html += '<span class="' + CLASS_LB_MATCH + '">';
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
      if (lookAround) {
        html += '</span>';
      }
      html += '</td>';
      html += '<td>';
      if (lookBehind) {
        html += displayBehind(mode, chars, line.state, line.phraseIndex, line.phraseLength, anchor);
      } else if(lookAhead){
        html += displayAhead(mode, chars, line.state, line.phraseIndex, line.phraseLength);
      }else{
        html += displayNone(mode, chars, line.state, line.phraseIndex, line.phraseLength);
      }
      html += '</td></tr>\n';

    });
    html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
    html += '<th>operator</th><th>phrase</th></tr>\n';
    html += '</table>\n';
    return html;
  };
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
  var displayBehind = function(mode, chars, state, index, length, anchor) {
    var html = '';
    var beg1, len1, beg2, len2;
    var lastchar = PHRASE_END;
    var spanBehind = '<span class="' + CLASS_LB_MATCH + '">';
    var spanRemainder = '<span class="' + CLASS_REMAINDER + '">'
    var spanend = '</span>';
    debugger;
    switch (state) {
    case id.EMPTY:
      html += PHRASE_EMPTY;
    case id.NOMATCH:
    case id.MATCH:
    case id.ACTIVE:
      beg1 = index - length;
      len1 = anchor -beg1;
      if(len1 > 0){
        html += spanBehind;
        html += subPhrase(mode, chars, beg1, len1);
        html += spanend;
      }
      beg2 = anchor;
      len2 = chars.length - beg2;
      html += spanRemainder;
      html += subPhrase(mode, chars, beg2, len2);
      html += spanend;
      break;
    }
    lastchar = PHRASE_END;
    if (len1 > MAX_PHRASE) {
      len1 = MAX_PHRASE;
      lastchar = PHRASE_CONTINUE;
      len2 = 0;
    } else if (len1 + len2 > MAX_PHRASE) {
      lastchar = PHRASE_CONTINUE;
      len2 = MAX_PHRASE - len1;
    }
    return html + lastchar;
  }
  var displayAhead = function(mode, chars, state, index, length) {
    var spanAhead = '<span class="' + CLASS_LH_MATCH + '">';
    return displayForward(mode, chars, state, index, length, spanAhead);
  }
  var displayNone = function(mode, chars, state, index, length) {
    var spanAhead = '<span class="' + CLASS_MATCH + '">';
    return displayForward(mode, chars, state, index, length, spanAhead);
  }
  var displayForward = function(mode, chars, state, index, length, spanAhead) {
    var html = '';
    var len1, beg2, len2;
    var lastchar = PHRASE_END;
    var spanRemainder = '<span class="' + CLASS_REMAINDER + '">'
    var spanend = '</span>';
    switch (state) {
    case id.EMPTY:
      html += PHRASE_EMPTY;
    case id.NOMATCH:
    case id.ACTIVE:
      len1 = 0;
      len2 = chars.length - index;
      html += spanRemainder;
      html += subPhrase(mode, chars, index, len2);
      html += spanend;
      break;
    case id.MATCH:
      len1 = length;
      html += spanAhead;
      html += subPhrase(mode, chars, index, len1);
      html += spanend;
      beg2 = index + len1;
      len2 = chars.length - beg2;
      html += spanRemainder;
      html += subPhrase(mode, chars, beg2, len2);
      html += spanend;
      break;
    }
    lastchar = PHRASE_END;
    if (len1 > MAX_PHRASE) {
      len1 = MAX_PHRASE;
      lastchar = PHRASE_CONTINUE;
      len2 = 0;
    } else if (len1 + len2 > MAX_PHRASE) {
      lastchar = PHRASE_CONTINUE;
      len2 = MAX_PHRASE - len1;
    }
    return html + lastchar;
  }
  var subPhrase = function(mode, chars, index, length) {
    if (length === 0) {
      return "";
    }
    switch (mode) {
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
  var subascii = function(chars, index, length) {
    var ctrlChars = [];
    ctrlChars[0] = "NUL";
    ctrlChars[1] = "SOH";
    ctrlChars[2] = "STX";
    ctrlChars[3] = "ETX";
    ctrlChars[4] = "EOT";
    ctrlChars[5] = "ENQ";
    ctrlChars[6] = "ACK";
    ctrlChars[7] = "BEL";
    ctrlChars[8] = "BS";
    ctrlChars[9] = "TAB";
    ctrlChars[10] = "LF";
    ctrlChars[11] = "VT";
    ctrlChars[12] = "FF";
    ctrlChars[13] = "CR";
    ctrlChars[14] = "SO";
    ctrlChars[15] = "SI";
    ctrlChars[16] = "DLE";
    ctrlChars[17] = "DC1";
    ctrlChars[18] = "DC2";
    ctrlChars[19] = "DC3";
    ctrlChars[20] = "DC4";
    ctrlChars[21] = "NAK";
    ctrlChars[22] = "SYN";
    ctrlChars[23] = "ETB";
    ctrlChars[24] = "CAN";
    ctrlChars[25] = "EM";
    ctrlChars[26] = "SUB";
    ctrlChars[27] = "ESC";
    ctrlChars[28] = "FS";
    ctrlChars[29] = "GS";
    ctrlChars[30] = "RS";
    ctrlChars[31] = "US";
    ctrlChars[127] = "DEL";
    var html = "";
    var char, ctrl;
    var end = index + length;
    for (var i = index; i < end; i += 1) {
      char = chars[i];
      if (char < 32 || char === 127) {
        /* control characters */
        html += '<span class="' + CLASS_CTRL + '">' + ctrlChars[char] + '</span>';
      } else if (char > 127) {
        /* non-ASCII */
        ctrl = char.toString(16).toUpperCase();
        if (ctrl.length % 2 !== 0) {
          ctrl = "0" + ctrl;
        }
//        html += '\\x' + ctrl;
        html += '<span class="' + CLASS_CTRL + '">' + '\\x' + ctrl + '</span>';
      } else {
        /* printing ASCII, 32 <= char <= 126 */
        switch (char) {
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
  var subhex = function(chars, index, length) {
    var html = "";
    var char;
    var end = index + length;
    for (var i = index; i < end; i += 1) {
      char = chars[i].toString(16).toUpperCase();
      if (char.length % 2 !== 0) {
        char = "0" + char;
      }
      html += '\\x' + char;
    }
    return html;
  }
  var subunicode = function(chars, index, length) {
    var html = "";
    var char;
    var end = index + length;
    for (var i = index; i < end; i += 1) {
      char = chars[i].toString(16).toUpperCase();
      if (char.length % 2 !== 0) {
        char = "0" + char;
      }
      html += '\\u' + char;
    }
    return html;
  }
  var subdec = function(chars, index, length) {
    var html = "";
    var char;
    html += chars[index];
    var end = index + length;
    for (var i = index + 1; i < end; i += 1) {
      html += "," + chars[i];
    }
    return html;
  }
}
