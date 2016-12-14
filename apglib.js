(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// This module is used by the parser to build an [Abstract Syntax Tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree) (AST).
// The AST can be thought of as a subset of the full parse tree.
// Each node of the AST holds the phrase that was matched at the corresponding, named parse tree node.
// It is built as the parser successfully matches phrases to the rule names
// (`RNM` operators) and `UDT`s as it parses an input string.
// The user controls which `RNM` or `UDT` names to keep on the AST.
// The user can also associate callback functions with some or all of the retained
// AST nodes to be used to translate the node phrases. That is, associate semantic
// actions to the matched phrases.
// Translating the AST rather that attempting to apply semantic actions during
// the parsing process, has the advantage that there is no backtracking and that the phrases
// are known while traversing down tree as will as up.
//
// Let `ast` be an `ast.js` object. To identify a node to be kept on the AST:
//```
// ast.callbacks["rulename"] = true; (all nodes default to false)
//```
// To associate a callback function with a node:
//```
// ast.callbacks["rulename"] = fn
//```
// `rulename` is any `RNM` or `UDT` name defined by the associated grammar
// and `fn` is a user-written callback function.
// (See [`apg-examples`](https://github.com/ldthomas/apg-js2-examples/tree/master/ast) for examples of how to create an AST,
// define the nodes and callback functions and attach it to a parser.)
module.exports = function() {
  "use strict";
  var thisFileName = "ast.js: ";
  var id = require("./identifiers.js");
  var utils = require("./utilities.js");
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
  this.astObject = "astObject";
  /* called by the parser to initialize the AST with the rules, UDTs and the input characters */
  this.init = function(rulesIn, udtsIn, charsIn) {
    stack.length = 0;
    records.length = 0;
    nodesDefined.length = 0;
    nodeCount = 0;
    rules = rulesIn;
    udts = udtsIn;
    chars = charsIn;
    var i, list = [];
    for (i = 0; i < rules.length; i += 1) {
      list.push(rules[i].lower);
    }
    for (i = 0; i < udts.length; i += 1) {
      list.push(udts[i].lower);
    }
    nodeCount = rules.length + udts.length;
    for (i = 0; i < nodeCount; i += 1) {
      nodesDefined[i] = false;
      nodeCallbacks[i] = null;
    }
    for ( var index in that.callbacks) {
      var lower = index.toLowerCase();
      i = list.indexOf(lower);
      if (i < 0) {
        throw new Error(thisFileName + "init: " + "node '" + index + "' not a rule or udt name");
      }
      if (typeof (that.callbacks[index]) === "function") {
        nodesDefined[i] = true;
        nodeCallbacks[i] = that.callbacks[index];
      }
      if (that.callbacks[index] === true) {
        nodesDefined[i] = true;
      }
    }
  }
  /* AST node definitions - called by the parser's `RNM` operator */
  this.ruleDefined = function(index) {
    return nodesDefined[index] === false ? false : true;
  }
  /* AST node definitions - called by the parser's `UDT` operator */
  this.udtDefined = function(index) {
    return nodesDefined[rules.length + index] === false ? false : true;
  }
  /* called by the parser's `RNM` & `UDT` operators */
  /* builds a record for the downward traversal of the node */
  this.down = function(callbackIndex, name) {
    var thisIndex = records.length;
    stack.push(thisIndex);
    records.push({
      name : name,
      thisIndex : thisIndex,
      thatIndex : null,
      state : id.SEM_PRE,
      callbackIndex : callbackIndex,
      phraseIndex : null,
      phraseLength : null,
      stack : stack.length
    });
    return thisIndex;
  };
  /* called by the parser's `RNM` & `UDT` operators */
  /* builds a record for the upward traversal of the node */
  this.up = function(callbackIndex, name, phraseIndex, phraseLength) {
    var thisIndex = records.length;
    var thatIndex = stack.pop();
    records.push({
      name : name,
      thisIndex : thisIndex,
      thatIndex : thatIndex,
      state : id.SEM_POST,
      callbackIndex : callbackIndex,
      phraseIndex : phraseIndex,
      phraseLength : phraseLength,
      stack : stack.length
    });
    records[thatIndex].thatIndex = thisIndex;
    records[thatIndex].phraseIndex = phraseIndex;
    records[thatIndex].phraseLength = phraseLength;
    return thisIndex;
  };
  // Called by the user to translate the AST.
  // Translate means to associate or apply some semantic action to the
  // phrases that were syntactically matched to the AST nodes according
  // to the defining grammar.
  //```
  // data - optional user-defined data
  //        passed to the callback functions by the translator
  //```
  this.translate = function(data) {
    var ret, call, callback, record;
    for (var i = 0; i < records.length; i += 1) {
      record = records[i];
      callback = nodeCallbacks[record.callbackIndex];
      if (record.state === id.SEM_PRE) {
        if (callback !== null) {
          ret = callback(id.SEM_PRE, chars, record.phraseIndex, record.phraseLength, data);
          if (ret === id.SEM_SKIP) {
            i = record.thatIndex;
          }
        }
      } else {
        if (callback !== null) {
          callback(id.SEM_POST, chars, record.phraseIndex, record.phraseLength, data);
        }
      }
    }
  }
  /* called by the parser to reset the length of the records array */
  /* necessary on backtracking */
  this.setLength = function(length) {
    records.length = length;
    if (length > 0) {
      stack.length = records[length - 1].stack;
    } else {
      stack.length = 0;
    }
  };
  /* called by the parser to get the length of the records array */
  this.getLength = function() {
    return records.length;
  };
  /* helper for XML display */
  function indent(n) {
    var ret = "";
    for (var i = 0; i < n; i += 1) {
      ret += " ";
    }
    return ret;
  }
  // Generate an `XML` version of the AST.
  // Useful if you want to use a special or favorite XML parser to translate the
  // AST.
  //```
  // mode - the display mode of the captured phrases
  //      - default mode is "ascii"
  //      - can be: "ascii"
  //                "decimal"
  //                "hexidecimal"
  //                "unicode"
  //```
  this.toXml = function(mode) {
    var display = utils.charsToDec;
    var caption = "decimal integer character codes";
    if (typeof (mode) === "string" && mode.length >= 3) {
      mode = mode.slice(0, 3).toLowerCase();
      if (mode === "asc") {
        display = utils.charsToAscii;
        caption = "ASCII for printing characters, hex for non-printing";
      } else if (mode === "hex") {
        display = utils.charsToHex;
        caption = "hexidecimal integer character codes"
      } else if (mode === "uni") {
        display = utils.charsToUnicode;
        caption = "Unicode UTF-32 integer character codes"
      }
    }
    var xml = "";
    var i, j, depth = 0;
    xml += '<?xml version="1.0" encoding="utf-8"?>\n';
    xml += '<root nodes="' + records.length / 2 + '" characters="' + chars.length + '">\n';
    xml += '<!-- input string, '+caption+' -->\n';
    xml += indent(depth + 2);
    xml += display(chars);
    xml += "\n";
    records.forEach(function(rec, index) {
      if (rec.state === id.SEM_PRE) {
        depth += 1;
        xml += indent(depth);
        xml += '<node name="' + rec.name + '" index="' + rec.phraseIndex + '" length="' + rec.phraseLength + '">\n';
        xml += indent(depth + 2);
        xml += display(chars, rec.phraseIndex, rec.phraseLength);
        xml += "\n";
      } else {
        xml += indent(depth);
        xml += '</node><!-- name="' + rec.name + '" -->\n'
        depth -= 1;
      }
    });

    xml += '</root>\n';
    return xml;
  }
  /* generate a JavaScript object version of the AST */
  /* for the phrase-matching engine apg-exp */
  this.phrases = function() {
    var obj = {};
    var i, record;
    for (i = 0; i < records.length; i += 1) {
      record = records[i];
      if (record.state === id.SEM_PRE) {
        if (!Array.isArray(obj[record.name])) {
          obj[record.name] = [];
        }
        obj[record.name].push({
          index : record.phraseIndex,
          length : record.phraseLength
        });
      }
    }
    return obj;
  }
}

},{"./identifiers.js":6,"./utilities.js":11}],2:[function(require,module,exports){
// This module acts as a "circular buffer". It is used to keep track
// only the last N records in an array of records. If more than N records
// are saved, each additional record overwrites the previously oldest record.
// This module deals only with the record indexes and does not save
// any actual records. It is used by [`trace.js`](./trace.html) for limiting the number of 
// trace records saved.
module.exports = function() {
  "use strict;"
  var thisFileName = "circular-buffer.js: ";
  var itemIndex = -1;
  var maxListSize = 0;
  var forward = true;
  // Initialize buffer.<br>
  // *size* is `maxListSize`, the maximum number of records saved before overwriting begins.
  this.init = function(size) {
    if (typeof (size) !== "number" || size <= 0) {
      throw new Error(thisFileName + "init: circular buffer size must an integer > 0")
    }
    maxListSize = Math.ceil(size);
    itemIndex = -1;
  };
  // Call this to increment the number of records collected.<br>
  // Returns the array index number to store the next record in.
  this.increment = function() {
    itemIndex += 1;
    return (itemIndex + maxListSize) % maxListSize;
  };
  // Returns `maxListSize` - the maximum number of records to keep in the buffer.
  this.maxSize = function() {
    return maxListSize;
  }
  // Returns the highest number of items saved.<br>
  // (The number of items is the actual number of records processed
  // even though only `maxListSize` records are actually retained.)
  this.items = function() {
    return itemIndex + 1;
  }
  // Returns the record number associated with this item index.
  this.getListIndex = function(item) {
    if (itemIndex === -1) {
      return -1;
    }
    if (item < 0 || item > itemIndex) {
      return -1;
    }
    if (itemIndex - item >= maxListSize) {
      return -1;
    }
    return (item + maxListSize) % maxListSize;
  }
  // The iterator over the circular buffer.
  // The user's function, `fn`, will be called with arguments `fn(listIndex, itemIndex)`
  // where `listIndex` is the saved record index and `itemIndex` is the actual item index.
  this.forEach = function(fn) {
    if (itemIndex === -1) {
      /* no records have been collected */
      return;
    }
    if (itemIndex < maxListSize) {
      /* fewer than maxListSize records have been collected - number of items = number of records */
      for (var i = 0; i <= itemIndex; i += 1) {
        fn(i, i);
      }
      return;
    }
    /* start with the oldest record saved and finish with the most recent record saved */
    for (var i = itemIndex - maxListSize + 1; i <= itemIndex; i += 1) {
      var listIndex = (i + maxListSize) % maxListSize;
      fn(listIndex, i);
    }
  }
}

},{}],3:[function(require,module,exports){
module.exports = function(){
return '/* This file automatically generated by toless() and LESS. */\n.apg-mono {\n  font-family: monospace;\n}\n.apg-active {\n  font-weight: bold;\n  color: #000000;\n}\n.apg-match {\n  font-weight: bold;\n  color: #264BFF;\n}\n.apg-empty {\n  font-weight: bold;\n  color: #0fbd0f;\n}\n.apg-nomatch {\n  font-weight: bold;\n  color: #FF4000;\n}\n.apg-lh-match {\n  font-weight: bold;\n  color: #1A97BA;\n}\n.apg-lb-match {\n  font-weight: bold;\n  color: #5F1687;\n}\n.apg-remainder {\n  font-weight: bold;\n  color: #999999;\n}\n.apg-ctrl-char {\n  font-weight: bolder;\n  font-style: italic;\n  font-size: .6em;\n}\n.apg-line-end {\n  font-weight: bold;\n  color: #000000;\n}\n.apg-error {\n  font-weight: bold;\n  color: #FF4000;\n}\n.apg-phrase {\n  color: #000000;\n  background-color: #8caae6;\n}\n.apg-empty-phrase {\n  color: #0fbd0f;\n}\ntable.apg-state {\n  font-family: monospace;\n  margin-top: 5px;\n  font-size: 11px;\n  line-height: 130%;\n  text-align: left;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-state th,\ntable.apg-state td {\n  text-align: left;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-state th:nth-last-child(2),\ntable.apg-state td:nth-last-child(2) {\n  text-align: right;\n}\ntable.apg-state caption {\n  font-size: 125%;\n  line-height: 130%;\n  font-weight: bold;\n  text-align: left;\n}\ntable.apg-stats {\n  font-family: monospace;\n  margin-top: 5px;\n  font-size: 11px;\n  line-height: 130%;\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-stats th,\ntable.apg-stats td {\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-stats caption {\n  font-size: 125%;\n  line-height: 130%;\n  font-weight: bold;\n  text-align: left;\n}\ntable.apg-trace {\n  font-family: monospace;\n  margin-top: 5px;\n  font-size: 11px;\n  line-height: 130%;\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-trace caption {\n  font-size: 125%;\n  line-height: 130%;\n  font-weight: bold;\n  text-align: left;\n}\ntable.apg-trace th,\ntable.apg-trace td {\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-trace th:last-child,\ntable.apg-trace th:nth-last-child(2),\ntable.apg-trace td:last-child,\ntable.apg-trace td:nth-last-child(2) {\n  text-align: left;\n}\ntable.apg-grammar {\n  font-family: monospace;\n  margin-top: 5px;\n  font-size: 11px;\n  line-height: 130%;\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-grammar caption {\n  font-size: 125%;\n  line-height: 130%;\n  font-weight: bold;\n  text-align: left;\n}\ntable.apg-grammar th,\ntable.apg-grammar td {\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-grammar th:last-child,\ntable.apg-grammar td:last-child {\n  text-align: left;\n}\ntable.apg-rules {\n  font-family: monospace;\n  margin-top: 5px;\n  font-size: 11px;\n  line-height: 130%;\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-rules caption {\n  font-size: 125%;\n  line-height: 130%;\n  font-weight: bold;\n  text-align: left;\n}\ntable.apg-rules th,\ntable.apg-rules td {\n  text-align: right;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-rules a {\n  color: #003399 !important;\n}\ntable.apg-rules a:hover {\n  color: #8caae6 !important;\n}\ntable.apg-attrs {\n  font-family: monospace;\n  margin-top: 5px;\n  font-size: 11px;\n  line-height: 130%;\n  text-align: center;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-attrs caption {\n  font-size: 125%;\n  line-height: 130%;\n  font-weight: bold;\n  text-align: left;\n}\ntable.apg-attrs th,\ntable.apg-attrs td {\n  text-align: center;\n  border: 1px solid black;\n  border-collapse: collapse;\n}\ntable.apg-attrs th:nth-child(1),\ntable.apg-attrs th:nth-child(2),\ntable.apg-attrs th:nth-child(3) {\n  text-align: right;\n}\ntable.apg-attrs td:nth-child(1),\ntable.apg-attrs td:nth-child(2),\ntable.apg-attrs td:nth-child(3) {\n  text-align: right;\n}\ntable.apg-attrs a {\n  color: #003399 !important;\n}\ntable.apg-attrs a:hover {\n  color: #8caae6 !important;\n}\n';
}

},{}],4:[function(require,module,exports){
// This module serves only to export all other objects and object constructors with a single `require("apg-lib")` statement.
/*
* COPYRIGHT: Copyright (c) 2016 Lowell D. Thomas, all rights reserved
*   LICENSE: BSD-3-Clause
*    AUTHOR: Lowell D. Thomas
*     EMAIL: lowell@coasttocoastresearch.com
*   WEBSITE: http://coasttocoastresearch.com/
*/
"use strict";
exports.ast = require("./ast.js");
exports.circular = require("./circular-buffer.js");
exports.ids = require("./identifiers.js");
exports.parser = require("./parser.js");
exports.stats = require("./stats.js");
exports.trace = require("./trace.js");
exports.utils = require("./utilities.js");
exports.emitcss = require("./emitcss.js");
exports.style = require("./style.js");

},{"./ast.js":1,"./circular-buffer.js":2,"./emitcss.js":3,"./identifiers.js":6,"./parser.js":7,"./stats.js":8,"./style.js":9,"./trace.js":10,"./utilities.js":11}],5:[function(require,module,exports){
// This function is used to generate a browser-accessible copy of `apg-lib`.
(function(){
  this.apglib = require('./export.js');
//  this.apglib = {};
//  this.apglib.ast = require("./ast.js");
//  this.apglib.circular = require("./circular-buffer.js");
//  this.apglib.ids = require("./identifiers.js");
//  this.apglib.parser = require("./parser.js");
//  this.apglib.stats = require("./stats.js");
//  this.apglib.trace = require("./trace.js");
//  this.apglib.utils = require("./utilities.js");
})()

},{"./export.js":4}],6:[function(require,module,exports){
// This module exposes a list of named identifiers, shared across the parser generator
// and the parsers that are generated.
"use strict";
module.exports = {
  // Identifies the operator type. Used by the [generator](https://github.com/ldthomas/apg-js2)
  // to indicate operator types in the grammar object.
  // Used by the [parser](./parser.html) when interpreting the grammar object.
  /* the original ABNF operators */
  ALT : 1, /* alternation */
  CAT : 2, /* concatenation */
  REP : 3, /* repetition */
  RNM : 4, /* rule name */
  TRG : 5, /* terminal range */
  TBS : 6, /* terminal binary string, case sensitive */
  TLS : 7, /* terminal literal string, case insensitive */
  /* the super set, SABNF operators */
  UDT : 11, /* user-defined terminal */
  AND : 12, /* positive look ahead */
  NOT : 13, /* negative look ahead */
  BKR : 14, /* back reference to a previously matched rule name */
  BKA : 15, /* positive look behind */
  BKN : 16, /* negative look behind */
  ABG : 17, /* anchor - begin of string */
  AEN : 18, /* anchor - end of string */
  // Used by the parser and the user's `RNM` and `UDT` callback functions.
  // Identifies the parser state as it traverses the parse tree nodes.
  // - *ACTIVE* - indicates the downward direction through the parse tree node.
  // - *MATCH* - indicates the upward direction and a phrase, of length \> 0, has been successfully matched
  // - *EMPTY* - indicates the upward direction and a phrase, of length = 0, has been successfully matched
  // - *NOMATCH* - indicates the upward direction and the parser failed to match any phrase at all
  ACTIVE : 100,
  MATCH : 101,
  EMPTY : 102,
  NOMATCH : 103,
  // Used by [`AST` translator](./ast.html) (semantic analysis) and the user's callback functions
  // to indicate the direction of flow through the `AST` nodes.
  // - *SEM_PRE* - indicates the downward (pre-branch) direction through the `AST` node.
  // - *SEM_POST* - indicates the upward (post-branch) direction through the `AST` node.
  SEM_PRE : 200,
  SEM_POST : 201,
  // Used by the user's callback functions to indicate to the `AST` translator (semantic analysis) how to proceed.
  // - *SEM_OK* - normal return value
  // - *SEM_SKIP* - if a callback function returns this value from the SEM_PRE state,
  // the translator will skip processing all `AST` nodes in the branch below the current node.
  // Ignored if returned from the SEM_POST state.
  SEM_OK : 300,
  SEM_SKIP : 301,
  // Used in attribute generation to distinguish the necessary attribute categories.
  // - *ATTR_N* - non-recursive
  // - *ATTR_R* - recursive
  // - *ATTR_MR* - belongs to a mutually-recursive set
  // - *ATTR_NMR* - non-recursive, but refers to a mutually-recursive set
  // - *ATTR_RMR* - recursive, but refers to a mutually-recursive set
  ATTR_N : 400,
  ATTR_R : 401,
  ATTR_MR : 402,
  ATTR_NMR : 403,
  ATTR_RMR : 404,
  // Look around values indicate whether the parser is in look ahead or look behind mode.
  // Used by the tracing facility to indicate the look around mode in the trace records display.
  // - *LOOKAROUND_NONE* - the parser is in normal parsing mode
  // - *LOOKAROUND_AHEAD* - the parse is in look-ahead mode, phrase matching for operator `AND(&)` or `NOT(!)`
  // - *LOOKAROUND_BEHIND* - the parse is in look-behind mode, phrase matching for operator `BKA(&&)` or `BKN(!!)`
  LOOKAROUND_NONE : 500,
  LOOKAROUND_AHEAD : 501,
  LOOKAROUND_BEHIND : 502,
  // Back reference rule mode indicators
  // - *BKR_MODE_UM* - the back reference is using universal mode
  // - *BKR_MODE_PM* - the back reference is using parent frame mode
  // - *BKR_MODE_CS* - the back reference is using case-sensitive phrase matching
  // - *BKR_MODE_CI* - the back reference is using case-insensitive phrase matching
  BKR_MODE_UM : 601,
  BKR_MODE_PM : 602,
  BKR_MODE_CS : 603,
  BKR_MODE_CI : 604
}
},{}],7:[function(require,module,exports){
// This is the primary object of `apg-lib`. Calling its `parse()` member function 
// walks the parse tree of opcodes, matching phrases from the input string as it goes.
// The working code for all of the operators, `ALT`, `CAT`, etc. is in this module.
/*
 * COPYRIGHT: Copyright (c) 2016 Lowell D. Thomas, all rights reserved
 *   LICENSE: BSD-3-Clause
 *    AUTHOR: Lowell D. Thomas
 *     EMAIL: lowell@coasttocoastresearch.com
 *   WEBSITE: http://coasttocoastresearch.com/
 */
module.exports = function() {
  "use strict";
  var thisFileName = "parser.js: "
  var _this = this;
  var id = require("./identifiers.js");
  var utils = require("./utilities.js");
  this.ast = null;
  this.stats = null;
  this.trace = null;
  this.callbacks = [];
  var startRule = 0;
  var opcodes = null;
  var chars = null;
  var charsBegin, charsLength, charsEnd;
  var lookAround;
  var treeDepth = 0;
  var maxTreeDepth = 0;
  var nodeHits = 0;
  var ruleCallbacks = null;
  var udtCallbacks = null;
  var rules = null;
  var udts = null;
  var syntaxData = null;
  var maxMatched = 0;
  var limitTreeDepth = Infinity;
  var limitNodeHits = Infinity;
  // Evaluates any given rule. This can be called from the syntax callback
  // functions to evaluate any rule in the grammar's rule list. Great caution
  // should be used. Use of this function will alter the language that the
  // parser accepts.
  var evaluateRule = function(ruleIndex, phraseIndex, sysData) {
    var functionName = thisFileName + "evaluateRule(): ";
    var length;
    if (ruleIndex >= rules.length) {
      throw new Error(functionsName + "rule index: " + ruleIndex + " out of range");
    }
    if ((phraseIndex >= charsEnd)) {
      throw new Error(functionsName + "phrase index: " + phraseIndex + " out of range");
    }
    length = opcodes.length;
    opcodes.push({
      type : id.RNM,
      index : ruleIndex
    });
    opExecute(length, phraseIndex, sysData);
    opcodes.pop();
  };
  // Evaluates any given UDT. This can be called from the syntax callback
  // functions to evaluate any UDT in the grammar's UDT list. Great caution
  // should be used. Use of this function will alter the language that the
  // parser accepts.
  var evaluateUdt = function(udtIndex, phraseIndex, sysData) {
    var functionName = thisFileName + "evaluateUdt(): ";
    var length;
    if (udtIndex >= udts.length) {
      throw new Error(functionsName + "udt index: " + udtIndex + " out of range");
    }
    if ((phraseIndex >= charsEnd)) {
      throw new Error(functionsName + "phrase index: " + phraseIndex + " out of range");
    }
    length = opcodes.length;
    opcodes.push({
      type : id.UDT,
      empty : udts[udtIndex].empty,
      index : udtIndex
    });
    opExecute(length, phraseIndex, sysData);
    opcodes.pop();
  };
  /* Clears this object of any/all data that has been initialized or added to it. */
  /* Called by parse() on initialization, allowing this object to be re-used for multiple parsing calls. */
  var clear = function() {
    startRule = 0;
    treeDepth = 0;
    maxTreeDepth = 0;
    nodeHits = 0;
    maxMatched = 0;
    lookAround = [ {
      lookAround : id.LOOKAROUND_NONE,
      anchor : 0,
      charsEnd : 0,
      charsLength : 0
    } ];
    rules = null;
    udts = null;
    chars = null;
    charsBegin = 0;
    charsLength = 0;
    charsEnd = 0;
    ruleCallbacks = null;
    udtCallbacks = null;
    syntaxData = null;
    opcodes = null;
  };
  /* object for maintaining a stack of back reference frames */
  var backRef = function() {
    var stack = [];
    var init = function() {
      var obj = {};
      rules.forEach(function(rule) {
        if (rule.isBkr) {
          obj[rule.lower] = null;
        }
      });
      if (udts.length > 0) {
        udts.forEach(function(udt) {
          if (udt.isBkr) {
            obj[udt.lower] = null;
          }
        });
      }
      stack.push(obj);
    }
    var copy = function() {
      var top = stack[stack.length - 1];
      var obj = {};
      for ( var name in top) {
        obj[name] = top[name];
      }
      return obj;
    }
    this.push = function() {
      stack.push(copy());
    }
    this.pop = function(length) {
      if (!length) {
        length = stack.length - 1;
      }
      if (length < 1 || length > stack.length) {
        throw new Error(thisFileName + "backRef.pop(): bad length: " + length);
      }
      stack.length = length;
      return stack[stack.length - 1];
    }
    this.length = function() {
      return stack.length;
    }
    this.savePhrase = function(name, index, length) {
      stack[stack.length - 1][name] = {
        phraseIndex : index,
        phraseLength : length
      }
    }
    this.getPhrase = function(name) {
      return stack[stack.length - 1][name];
    }
    /* constructor */
    init();
  }
  // The system data structure that relays system information to and from the rule and UDT callback functions.
  // - *state* - the state of the parser, ACTIVE, MATCH, EMPTY or NOMATCH (see the `identifiers` object in
  // [`apg-lib`](https://github.com/ldthomas/apg-js2-lib))
  // - *phraseLength* - the number of characters matched if the state is MATCHED or EMPTY
  // - *lookaround* - the top of the stack holds the current look around state,
  // LOOKAROUND_NONE, LOOKAROUND_AHEAD or LOOKAROUND_BEHIND,
  // - *uFrame* - the "universal" back reference frame.
  // Holds the last matched phrase for each of the back referenced rules and UDTs.
  // - *pFrame* - the stack of "parent" back reference frames.
  // Holds the matched phrase from the parent frame of each back referenced rules and UDTs.
  // - *evaluateRule* - a reference to this object's `evaluateRule()` function.
  // Can be called from a callback function (use with extreme caution!)
  // - *evaluateUdt* - a reference to this object's `evaluateUdt()` function.
  // Can be called from a callback function (use with extreme caution!)
  var systemData = function() {
    var _this = this;
    this.state = id.ACTIVE;
    this.phraseLength = 0;
    this.lookAround = lookAround[lookAround.length - 1];
    this.uFrame = new backRef();
    this.pFrame = new backRef();
    this.evaluateRule = evaluateRule;
    this.evaluateUdt = evaluateUdt;
    /* refresh the parser state for the next operation */
    this.refresh = function() {
      _this.state = id.ACTIVE;
      _this.phraseLength = 0;
      _this.lookAround = lookAround[lookAround.length - 1];
    }
  }
  /* some look around helper functions */
  var lookAroundValue = function() {
    return lookAround[lookAround.length - 1];
  }
  /* return true if parser is in look around (ahead or behind) state */
  var inLookAround = function() {
    return (lookAround.length > 1);
  }
  /* return true if parser is in look behind state */
  var inLookBehind = function() {
    return lookAround[lookAround.length - 1].lookAround === id.LOOKAROUND_BEHIND ? true : false;
  }
  /* called by parse() to initialize the AST object, if one has been defined */
  var initializeAst = function() {
    var functionName = thisFileName + "initializeAst(): ";
    while (true) {
      if (_this.ast === undefined) {
        _this.ast = null;
        break;
      }
      if (_this.ast === null) {
        break;
      }
      if (_this.ast.astObject !== "astObject") {
        throw new Error(functionName + "ast object not recognized");
      }
      break;
    }
    if (_this.ast !== null) {
      _this.ast.init(rules, udts, chars);
    }
  }
  /* called by parse() to initialize the trace object, if one has been defined */
  var initializeTrace = function() {
    var functionName = thisFileName + "initializeTrace(): ";
    while (true) {
      if (_this.trace === undefined) {
        _this.trace = null;
        break;
      }
      if (_this.trace === null) {
        break;
      }
      if (_this.trace.traceObject !== "traceObject") {
        throw new Error(functionName + "trace object not recognized");
      }
      break;
    }
    if (_this.trace !== null) {
      _this.trace.init(rules, udts, chars);
    }

  }
  /* called by parse() to initialize the statistics object, if one has been defined */
  var initializeStats = function() {
    var functionName = thisFileName + "initializeStats(): ";
    while (true) {
      if (_this.stats === undefined) {
        _this.stats = null;
        break;
      }
      if (_this.stats === null) {
        break;
      }
      if (_this.stats.statsObject !== "statsObject") {
        throw new Error(functionName + "stats object not recognized");
      }
      break;
    }
    if (_this.stats !== null) {
      _this.stats.init(rules, udts);
    }
  }
  /* called by parse() to initialize the rules & udts from the grammar object */
  /* (the grammar object generated previously by apg) */
  var initializeGrammar = function(grammar) {
    var functionName = thisFileName + "initializeGrammar(): ";
    if (grammar === undefined || grammar === null) {
      throw new Error(functionName + "grammar object undefined");
    }
    if (grammar.grammarObject !== "grammarObject") {
      throw new Error(functionName + "bad grammar object");
    }
    rules = grammar.rules;
    udts = grammar.udts;
  }
  /* called by parse() to initialize the start rule */
  var initializeStartRule = function(startRule) {
    var functionName = thisFileName + "initializeStartRule(): ";
    var start = null;
    if (typeof (startRule) === "number") {
      if (startRule >= rules.length) {
        throw new Error(functionName + "start rule index too large: max: " + rules.length + ": index: " + startRule);
      }
      start = startRule;
    } else if (typeof (startRule) === "string") {
      var lower = startRule.toLowerCase();
      for (var i = 0; i < rules.length; i += 1) {
        if (lower === rules[i].lower) {
          start = rules[i].index;
          break;
        }
      }
      if (start === null) {
        throw new Error(functionName + "start rule name '" + startRule + "' not recognized");
      }
    } else {
      throw new Error(functionName + "type of start rule '" + typeof (startRule) + "' not recognized");
    }
    return start;
  }
  /* called by parse() to initialize the array of characters codes representing the input string */
  var initializeInputChars = function(input, beg, len) {
    var functionName = thisFileName + "initializeInputChars(): ";
    /* varify and normalize input */
    if (input === undefined) {
      throw new Error(functionName + "input string is undefined");
    }
    if (input === null) {
      throw new Error(functionName + "input string is null");
    }
    if (typeof (input) === "string") {
      input = utils.stringToChars(input);
    } else if (!Array.isArray(input)) {
      throw new Error(functionName + "input string is not a string or array");
    }
    if (input.length > 0) {
      if (typeof (input[0]) !== "number") {
        throw new Error(functionName + "input string not an array of integers");
      }
    }
    /* verify and normalize beginning index */
    if (typeof (beg) !== "number") {
      beg = 0;
    } else {
      beg = Math.floor(beg);
      if (beg < 0 || beg > input.length) {
        throw new Error(functionName + "input beginning index out of range: " + beg);
      }
    }
    /* verify and normalize input length */
    if (typeof (len) !== "number") {
      len = input.length - beg;
    } else {
      len = Math.floor(len);
      if (len < 0 || len > (input.length - beg)) {
        throw new Error(functionName + "input length out of range: " + len);
      }
    }
    chars = input;
    charsBegin = beg;
    charsLength = len;
    charsEnd = charsBegin + charsLength;
  }
  /* called by parse() to initialize the user-written, syntax callback functions, if any */
  var initializeCallbacks = function() {
    var functionName = thisFileName + "initializeCallbacks(): ";
    var i;
    ruleCallbacks = [];
    udtCallbacks = [];
    for (i = 0; i < rules.length; i += 1) {
      ruleCallbacks[i] = null;
    }
    for (i = 0; i < udts.length; i += 1) {
      udtCallbacks[i] = null;
    }
    var func, list = [];
    for (i = 0; i < rules.length; i += 1) {
      list.push(rules[i].lower);
    }
    for (i = 0; i < udts.length; i += 1) {
      list.push(udts[i].lower);
    }
    for ( var index in _this.callbacks) {
      i = list.indexOf(index);
      if (i < 0) {
        throw new Error(functionName + "syntax callback '" + index + "' not a rule or udt name");
      }
      func = _this.callbacks[index];
      if (func === false) {
        func = null;
      }
      if (typeof (func) === "function" || func === null) {
        if (i < rules.length) {
          ruleCallbacks[i] = func;
        } else {
          udtCallbacks[i - rules.length] = func;
        }
      } else {
        throw new Error(functionName + "syntax callback[" + index + "] must be function reference or 'false'");
      }
    }
    /* make sure all udts have been defined - the parser can't work without them */
    for (i = 0; i < udts.length; i += 1) {
      if (udtCallbacks[i] === null) {
        throw new Error(functionName + "all UDT callbacks must be defined. UDT callback[" + udts[i].lower
            + "] not a function reference");
      }
    }
  }
  // Set the maximum parse tree depth allowed. The default is `Infinity`.
  // A limit is not normally needed, but can be used to protect against an
  // exponentual or "catastrophically backtracking" grammar.
  //<ul>
  //<li>
  // depth - max allowed parse tree depth. An exception is thrown if exceeded.
  //</li>
  //</ul>
  this.setMaxTreeDepth = function(depth) {
    if (typeof (depth) !== "number") {
      throw new Error("parser: max tree depth must be integer > 0: " + depth);
    }
    limitTreeDepth = Math.floor(depth);
    if (limitTreeDepth <= 0) {
      throw new Error("parser: max tree depth must be integer > 0: " + depth);
    }
  }
  // Set the maximum number of node hits (parser unit steps or opcode function calls) allowed.
  // The default is `Infinity`.
  // A limit is not normally needed, but can be used to protect against an
  // exponentual or "catastrophically backtracking" grammar.
  //<ul>
  //<li>
  // hits - maximum number of node hits or parser unit steps allowed.
  // An exception thrown if exceeded.
  //</li>
  //</ul>
  this.setMaxNodeHits = function(hits) {
    if (typeof (hits) !== "number") {
      throw new Error("parser: max node hits must be integer > 0: " + hits);
    }
    limitNodeHits = Math.floor(hits);
    if (limitNodeHits <= 0) {
      throw new Error("parser: max node hits must be integer > 0: " + hits);
    }
  }
  // This is the main function, called to parse an input string.
  // <ul>
  // <li>*grammar* - an instantiated grammar object - the output of `apg` for a
  // specific SABNF grammar</li>
  // <li>*startRule* - the rule name or rule index to be used as the root of the
  // parse tree. This is usually the first rule, index = 0, of the grammar
  // but can be any rule defined in the above grammar object.</li>
  // <li>*inputChars* - the input string. Can be a string or an array of integer character codes representing the
  // string.</li>
  // <li>*callbackData* - user-defined data object to be passed to the user's
  // callback functions.
  // This is not used by the parser in any way, merely passed on to the user.
  // May be `null` or omitted.</li>
  // </ul>
  this.parse = function(grammar, startRule, inputChars, callbackData) {
    clear();
    initializeInputChars(inputChars, 0, inputChars.length);
    return privateParse(grammar, startRule, callbackData);
  }
  // This form allows parsing of a sub-string of the full input string.
  // <ul>
  // <li>*inputIndex* - index of the first character in the sub-string</li>
  // <li>*inputLength* - length of the sub-string</li>
  // </ul>
  // All other parameters as for the above function `parse()`.
  this.parseSubstring = function(grammar, startRule, inputChars, inputIndex, inputLength, callbackData) {
    clear();
    initializeInputChars(inputChars, inputIndex, inputLength);
    return privateParse(grammar, startRule, callbackData);
  }
  /* the main parser function */
  var privateParse = function(grammar, startRule, callbackData) {
    var functionName, sysData, success;
    functionName = thisFileName + "parse(): ";
    initializeGrammar(grammar);
    startRule = initializeStartRule(startRule);
    initializeCallbacks();
    initializeTrace();
    initializeStats();
    initializeAst();
    sysData = new systemData();
    if (!(callbackData === undefined || callbackData === null)) {
      syntaxData = callbackData;
    }
    /* create a dummy opcode for the start rule */
    opcodes = [ {
      type : id.RNM,
      index : startRule
    } ];
    /* execute the start rule */
    opExecute(0, charsBegin, sysData);
    opcodes = null;
    /* test and return the sysData */
    switch (sysData.state) {
    case id.ACTIVE:
      throw new Error(functionName + "final state should never be 'ACTIVE'");
      break;
    case id.NOMATCH:
      success = false;
      break;
    case id.EMPTY:
    case id.MATCH:
      if (sysData.phraseLength === charsLength) {
        success = true;
      } else {
        success = false;
      }
      break;
    }
    return {
      success : success,
      state : sysData.state,
      length : charsLength,
      matched : sysData.phraseLength,
      maxMatched : maxMatched,
      maxTreeDepth : maxTreeDepth,
      nodeHits : nodeHits,
      inputLength : chars.length,
      subBegin : charsBegin,
      subEnd : charsEnd,
      subLength : charsLength
    };
  };

  // The `ALT` operator.<br>
  // Executes its child nodes, from left to right, until it finds a match.
  // Fails if *all* of its child nodes fail.
  var opALT = function(opIndex, phraseIndex, sysData) {
    var op = opcodes[opIndex];
    for (var i = 0; i < op.children.length; i += 1) {
      opExecute(op.children[i], phraseIndex, sysData);
      if (sysData.state !== id.NOMATCH) {
        break;
      }
    }
  };
  // The `CAT` operator.<br>
  // Executes all of its child nodes, from left to right,
  // concatenating the matched phrases.
  // Fails if *any* child nodes fail.
  var opCAT = function(opIndex, phraseIndex, sysData) {
    var op, success, astLength, catCharIndex, catPhrase;
    op = opcodes[opIndex];
    var ulen = sysData.uFrame.length();
    var plen = sysData.pFrame.length();
    if (_this.ast) {
      astLength = _this.ast.getLength();
    }
    success = true;
    catCharIndex = phraseIndex;
    catPhrase = 0;
    for (var i = 0; i < op.children.length; i += 1) {
      opExecute(op.children[i], catCharIndex, sysData);
      if (sysData.state === id.NOMATCH) {
        success = false;
        break;
      } else {
        catCharIndex += sysData.phraseLength;
        catPhrase += sysData.phraseLength;
      }
    }
    if (success) {
      sysData.state = catPhrase === 0 ? id.EMPTY : id.MATCH;
      sysData.phraseLength = catPhrase;
    } else {
      sysData.state = id.NOMATCH;
      sysData.phraseLength = 0;
      /* reset the back referencing frames on failure */
      sysData.uFrame.pop(ulen);
      sysData.pFrame.pop(plen);
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  };
  // The `REP` operator.<br>
  // Repeatedly executes its single child node,
  // concatenating each of the matched phrases found.
  // The number of repetitions executed and its final sysData depends
  // on its `min` & `max` repetition values.
  var opREP = function(opIndex, phraseIndex, sysData) {
    var op, astLength, repCharIndex, repPhrase, repCount;
    op = opcodes[opIndex];
    repCharIndex = phraseIndex;
    repPhrase = 0;
    repCount = 0;
    var ulen = sysData.uFrame.length();
    var plen = sysData.pFrame.length();
    if (_this.ast) {
      astLength = _this.ast.getLength();
    }
    while (true) {
      if (repCharIndex >= charsEnd) {
        /* exit on end of input string */
        break;
      }
      opExecute(opIndex + 1, repCharIndex, sysData);
      if (sysData.state === id.NOMATCH) {
        /* always end if the child node fails */
        break;
      }
      if (sysData.state === id.EMPTY) {
        /* REP always succeeds when the child node returns an empty phrase */
        /* this may not seem obvious, but that's the way it works out */
        break;
      }
      repCount += 1;
      repPhrase += sysData.phraseLength;
      repCharIndex += sysData.phraseLength;
      if (repCount === op.max) {
        /* end on maxed out reps */
        break;
      }
    }
    /* evaluate the match count according to the min, max values */
    if (sysData.state === id.EMPTY) {
      sysData.state = (repPhrase === 0) ? id.EMPTY : id.MATCH;
      sysData.phraseLength = repPhrase;
    } else if (repCount >= op.min) {
      sysData.state = (repPhrase === 0) ? id.EMPTY : id.MATCH;
      sysData.phraseLength = repPhrase;
    } else {
      sysData.state = id.NOMATCH;
      sysData.phraseLength = 0;
      /* reset the back referencing frames on failure */
      sysData.uFrame.pop(ulen);
      sysData.pFrame.pop(plen);
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  };
  // Validate the callback function's returned sysData values.
  // It's the user's responsibility to get them right
  // but `RNM` fails if not.
  var validateRnmCallbackResult = function(rule, sysData, charsLeft, down) {
    if (sysData.phraseLength > charsLeft) {
      var str = thisFileName + "opRNM(" + rule.name + "): callback function error: "
      str += "sysData.phraseLength: " + sysData.phraseLength;
      str += " must be <= remaining chars: " + charsLeft;
      throw new Error(str);
    }
    switch (sysData.state) {
    case id.ACTIVE:
      if (down === true) {
      } else {
        throw new Error(thisFileName + "opRNM(" + rule.name + "): callback function return error. ACTIVE state not allowed.");
      }
      break;
    case id.EMPTY:
      sysData.phraseLength = 0;
      break;
    case id.MATCH:
      if (sysData.phraseLength === 0) {
        sysData.state = id.EMPTY;
      }
      break;
    case id.NOMATCH:
      sysData.phraseLength = 0;
      break;
    default:
      throw new Error(thisFileName + "opRNM(" + rule.name + "): callback function return error. Unrecognized return state: "
          + sysData.state);
      break;
    }
  }
  // The `RNM` operator.<br>
  // This operator will acts as a root node for a parse tree branch below and
  // returns the matched phrase to its parent.
  // However, its larger responsibility is handling user-defined callback functions, back references and `AST` nodes.
  // Note that the `AST` is a separate object, but `RNM` calls its functions to create its nodes.
  // See [`ast.js`](./ast.html) for usage.
  var opRNM = function(opIndex, phraseIndex, sysData) {
    var op, rule, callback, astLength, astDefined, downIndex, savedOpcodes;
    var ulen, plen, saveFrame;
    op = opcodes[opIndex];
    rule = rules[op.index];
    callback = ruleCallbacks[op.index];
    var notLookAround = !inLookAround();
    /* ignore AST and back references in lookaround */
    if (notLookAround) {
      /* begin AST and back references */
      astDefined = _this.ast && _this.ast.ruleDefined(op.index);
      if (astDefined) {
        astLength = _this.ast.getLength();
        downIndex = _this.ast.down(op.index, rules[op.index].name);
      }
      ulen = sysData.uFrame.length();
      plen = sysData.pFrame.length();
      sysData.uFrame.push();
      sysData.pFrame.push();
      saveFrame = sysData.pFrame;
      sysData.pFrame = new backRef();
    }
    if (callback === null) {
      /* no callback - just execute the rule */
      savedOpcodes = opcodes;
      opcodes = rule.opcodes;
      opExecute(0, phraseIndex, sysData);
      opcodes = savedOpcodes;
    } else {
      /* call user's callback */
      var charsLeft = charsEnd - phraseIndex;
      callback(sysData, chars, phraseIndex, syntaxData);
      validateRnmCallbackResult(rule, sysData, charsLeft, true);
      if (sysData.state === id.ACTIVE) {
        savedOpcodes = opcodes;
        opcodes = rule.opcodes;
        opExecute(0, phraseIndex, sysData);
        opcodes = savedOpcodes;
        callback(sysData, chars, phraseIndex, syntaxData);
        validateRnmCallbackResult(rule, sysData, charsLeft, false);
      }/* implied else clause: just accept the callback sysData - RNM acting as UDT */
    }
    if (notLookAround) {
      /* end AST */
      if (astDefined) {
        if (sysData.state === id.NOMATCH) {
          _this.ast.setLength(astLength);
        } else {
          _this.ast.up(op.index, rules[op.index].name, phraseIndex, sysData.phraseLength);
        }
      }
      /* end back reference */
      sysData.pFrame = saveFrame;
      if (sysData.state === id.NOMATCH) {
        sysData.uFrame.pop(ulen);
        sysData.pFrame.pop(plen);
      } else {
        if (rules[op.index].isBkr) {
          /* save phrase on both the parent and universal frames */
          /* BKR operator will decide which to use later */
          sysData.pFrame.savePhrase(rules[op.index].lower, phraseIndex, sysData.phraseLength);
          sysData.uFrame.savePhrase(rules[op.index].lower, phraseIndex, sysData.phraseLength);
        }
      }
    }
  };
  // Validate the callback function's returned sysData values.
  // It's the user's responsibility to get it right but `UDT` fails if not.
  var validateUdtCallbackResult = function(udt, sysData, charsLeft) {
    if (sysData.phraseLength > charsLeft) {
      var str = thisFileName + "opUDT(" + udt.name + "): callback function error: "
      str += "sysData.phraseLength: " + sysData.phraseLength;
      str += " must be <= remaining chars: " + charsLeft;
      throw new Error(str);
    }
    switch (sysData.state) {
    case id.ACTIVE:
      throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. ACTIVE state not allowed.");
      break;
    case id.EMPTY:
      if (udt.empty === false) {
        throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. May not return EMPTY.");
      } else {
        sysData.phraseLength = 0;
      }
      break;
    case id.MATCH:
      if (sysData.phraseLength === 0) {
        if (udt.empty === false) {
          throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. May not return EMPTY.");
        } else {
          sysData.state = id.EMPTY;
        }
      }
      break;
    case id.NOMATCH:
      sysData.phraseLength = 0;
      break;
    default:
      throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. Unrecognized return state: "
          + sysData.state);
      break;
    }
  }
  // The `UDT` operator.<br>
  // Simply calls the user's callback function, but operates like `RNM` with regard to the `AST`
  // and back referencing.
  // There is some ambiguity here. `UDT`s act as terminals for phrase recognition but as named rules
  // for `AST` nodes and back referencing.
  // See [`ast.js`](./ast.html) for usage.
  var opUDT = function(opIndex, phraseIndex, sysData) {
    var downIndex, astLength, astIndex, op, udt, astDefined;
    var ulen, plen, saveFrame;
    op = opcodes[opIndex];
    var notLookAround = !inLookAround();
    /* ignore AST and back references in lookaround */
    if (notLookAround) {
      /* begin AST and back reference */
      astDefined = _this.ast && _this.ast.udtDefined(op.index);
      if (astDefined) {
        astIndex = rules.length + op.index;
        astLength = _this.ast.getLength();
        downIndex = _this.ast.down(astIndex, udts[op.index].name);
      }
      /* NOTE: push and pop of the back reference frame is normally not necessary */
      /* only in the case that the UDT calls evaluateRule() or evaluateUdt() */
      ulen = sysData.uFrame.length();
      plen = sysData.pFrame.length();
      sysData.uFrame.push();
      sysData.pFrame.push();
      saveFrame = sysData.pFrame;
      sysData.pFrame = new backRef();
    }
    /* call the UDT */
    var charsLeft = charsEnd - phraseIndex;
    udtCallbacks[op.index](sysData, chars, phraseIndex, syntaxData);
    validateUdtCallbackResult(udts[op.index], sysData, charsLeft);
    if (notLookAround) {
      /* end AST */
      if (astDefined) {
        if (sysData.state === id.NOMATCH) {
          _this.ast.setLength(astLength);
        } else {
          _this.ast.up(astIndex, udts[op.index].name, phraseIndex, sysData.phraseLength);
        }
      }
      /* end back reference */
      sysData.pFrame = saveFrame;
      if (sysData.state === id.NOMATCH) {
        sysData.uFrame.pop(ulen);
        sysData.pFrame.pop(plen);
      } else {
        if (udts[op.index].isBkr) {
          /* save phrase on both the parent and universal frames */
          /* BKR operator will decide which to use later */
          sysData.pFrame.savePhrase(udt[op.index].lower, phraseIndex, sysData.phraseLength);
          sysData.uFrame.savePhrase(udt[op.index].lower, phraseIndex, sysData.phraseLength);
        }
      }
    }
  };
  // The `AND` operator.<br>
  // This is the positive `look ahead` operator.
  // Executes its single child node, returning the EMPTY state
  // if it succeedsand NOMATCH if it fails.
  // *Always* backtracks on any matched phrase and returns EMPTY on success.
  var opAND = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({
      lookAround : id.LOOKAROUND_AHEAD,
      anchor : phraseIndex,
      charsEnd : charsEnd,
      charsLength : charsLength
    });
    charsEnd = chars.length;
    charsLength = chars.length - charsBegin;
    opExecute(opIndex + 1, phraseIndex, sysData);
    var pop = lookAround.pop();
    charsEnd = pop.charsEnd;
    charsLength = pop.charsLength;
    sysData.phraseLength = 0;
    switch (sysData.state) {
    case id.EMPTY:
      sysData.state = id.EMPTY;
      break;
    case id.MATCH:
      sysData.state = id.EMPTY;
      break;
    case id.NOMATCH:
      sysData.state = id.NOMATCH;
      break;
    default:
      throw new Error('opAND: invalid state ' + sysData.state);
    }
  };
  // The `NOT` operator.<br>
  // This is the negative `look ahead` operator.
  // Executes its single child node, returning the EMPTY state
  // if it *fails* and NOMATCH if it succeeds.
  // *Always* backtracks on any matched phrase and returns EMPTY
  // on success (failure of its child node).
  var opNOT = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({
      lookAround : id.LOOKAROUND_AHEAD,
      anchor : phraseIndex,
      charsEnd : charsEnd,
      charsLength : charsLength
    });
    charsEnd = chars.length;
    charsLength = chars.length - charsBegin;
    opExecute(opIndex + 1, phraseIndex, sysData);
    var pop = lookAround.pop();
    charsEnd = pop.charsEnd;
    charsLength = pop.charsLength;
    sysData.phraseLength = 0;
    switch (sysData.state) {
    case id.EMPTY:
    case id.MATCH:
      sysData.state = id.NOMATCH;
      break;
    case id.NOMATCH:
      sysData.state = id.EMPTY;
      break;
    default:
      throw new Error('opNOT: invalid state ' + sysData.state);
    }
  };
  // The `TRG` operator.<br>
  // Succeeds if the single first character of the phrase is
  // within the `min - max` range.
  var opTRG = function(opIndex, phraseIndex, sysData) {
    var op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    if (phraseIndex < charsEnd) {
      if (op.min <= chars[phraseIndex] && chars[phraseIndex] <= op.max) {
        sysData.state = id.MATCH;
        sysData.phraseLength = 1;
      }
    }
  };
  // The `TBS` operator.<br>
  // Matches its pre-defined phrase against the input string.
  // All characters must match exactly.
  // Case-sensitive literal strings (`'string'` & `%s"string"`) are translated to `TBS`
  // operators by `apg`.
  // Phrase length of zero is not allowed.
  // Empty phrases can only be defined with `TLS` operators.
  var opTBS = function(opIndex, phraseIndex, sysData) {
    var i, op, len;
    op = opcodes[opIndex];
    len = op.string.length;
    sysData.state = id.NOMATCH;
    if ((phraseIndex + len) <= charsEnd) {
      for (i = 0; i < len; i += 1) {
        if (chars[phraseIndex + i] !== op.string[i]) {
          return;
        }
      }
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* implied else NOMATCH */
  };
  // The `TLS` operator.<br>
  // Matches its pre-defined phrase against the input string.
  // A case-insensitive match is attempted for ASCII alphbetical characters.
  // `TLS` is the only operator that explicitly allows empty phrases.
  // `apg` will fail for empty `TBS`, case-sensitive strings (`''`) or
  // zero repetitions (`0*0RuleName` or `0RuleName`).
  var opTLS = function(opIndex, phraseIndex, sysData) {
    var i, code, len, op;
    op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    len = op.string.length;
    if (len === 0) {
      /* EMPTY match allowed for TLS */
      sysData.state = id.EMPTY;
      return;
    }
    if ((phraseIndex + len) <= charsEnd) {
      for (i = 0; i < len; i += 1) {
        code = chars[phraseIndex + i];
        if (code >= 65 && code <= 90) {
          code += 32;
        }
        if (code !== op.string[i]) {
          return;
        }
      }
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* implied else NOMATCH */
  };
  // The `ABG` operator.<br>
  // This is an "anchor" for the beginning of the string, similar to the familiar regex `^` anchor.
  // An anchor matches a position rather than a phrase.
  // Returns EMPTY if `phraseIndex` is 0, NOMATCH otherwise.
  var opABG = function(opIndex, phraseIndex, sysData) {
    var op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    sysData.phraseLength = 0;
    sysData.state = (phraseIndex === 0) ? id.EMPTY : id.NOMATCH;
  };
  // The `AEN` operator.<br>
  // This is an "anchor" for the end of the string, similar to the familiar regex `$` anchor.
  // An anchor matches a position rather than a phrase.
  // Returns EMPTY if `phraseIndex` equals the input string length, NOMATCH otherwise.
  var opAEN = function(opIndex, phraseIndex, sysData) {
    var op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    sysData.phraseLength = 0;
    sysData.state = (phraseIndex === chars.length) ? id.EMPTY : id.NOMATCH;
  };
  // The `BKR` operator.<br>
  // The back reference operator.
  // Matches the last matched phrase of the named rule or UDT against the input string.
  // For ASCII alphbetical characters the match may be case sensitive (`%s`) or insensitive (`%i`),
  // depending on the back reference definition.
  // For `universal` mode (`%u`) matches the last phrase found anywhere in the grammar.
  // For `parent frame` mode (`%p`) matches the last phrase found in the parent rule only.
  var opBKR = function(opIndex, phraseIndex, sysData) {
    var i, code, len, op, lmIndex, lmcode, lower, frame, insensitive;
    op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    if (op.index < rules.length) {
      lower = rules[op.index].lower;
    } else {
      lower = udts[op.index - rules.length].lower;
    }
    frame = (op.bkrMode === id.BKR_MODE_PM) ? sysData.pFrame.getPhrase(lower) : sysData.uFrame.getPhrase(lower);
    insensitive = (op.bkrCase === id.BKR_MODE_CI) ? true : false;
    if (frame === null) {
      return;
    }
    lmIndex = frame.phraseIndex;
    len = frame.phraseLength;
    if (len === 0) {
      sysData.state = id.EMPTY;
      return;
    }
    if ((phraseIndex + len) <= charsEnd) {
      if (insensitive) {
        /* case-insensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[phraseIndex + i];
          lmcode = chars[lmIndex + i];
          if (code >= 65 && code <= 90) {
            code += 32;
          }
          if (lmcode >= 65 && lmcode <= 90) {
            lmcode += 32;
          }
          if (code !== lmcode) {
            return;
          }
        }
        sysData.state = id.MATCH;
        sysData.phraseLength = len;
      } else {
        /* case-sensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[phraseIndex + i];
          lmcode = chars[lmIndex + i];
          if (code !== lmcode) {
            return;
          }
        }
      }
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    }
  };
  // The `BKA` operator.<br>
  // This is the positive `look behind` operator.
  // It's child node is parsed right-to-left.
  // Returns the EMPTY state if a match is found, NOMATCH otherwise.
  // Like the look ahead operators, it always backtracks to `phraseIndex`.
  var opBKA = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({
      lookAround : id.LOOKAROUND_BEHIND,
      anchor : phraseIndex
    });
    opExecute(opIndex + 1, phraseIndex, sysData);
    lookAround.pop();
    sysData.phraseLength = 0;
    switch (sysData.state) {
    case id.EMPTY:
      sysData.state = id.EMPTY;
      break;
    case id.MATCH:
      sysData.state = id.EMPTY;
      break;
    case id.NOMATCH:
      sysData.state = id.NOMATCH;
      break;
    default:
      throw new Error('opBKA: invalid state ' + sysData.state);
    }
  }
  // The `BKN` operator.<br>
  // This is the negative `look behind` operator.
  // It's child node is parsed right-to-left.
  // Returns the EMPTY state if a match is *not* found, NOMATCH otherwise.
  // Like the look ahead operators, it always backtracks to `phraseIndex`.
  var opBKN = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({
      lookAround : id.LOOKAROUND_BEHIND,
      anchor : phraseIndex
    });
    opExecute(opIndex + 1, phraseIndex, sysData);
    lookAround.pop();
    sysData.phraseLength = 0;
    switch (sysData.state) {
    case id.EMPTY:
    case id.MATCH:
      sysData.state = id.NOMATCH;
      break;
    case id.NOMATCH:
      sysData.state = id.EMPTY;
      break;
    default:
      throw new Error('opBKN: invalid state ' + sysData.state);
    }
  }
  // The right-to-left `CAT` operator.<br>
  // Called for `CAT` operators when in look behind mode.
  // Calls its child nodes from right to left concatenating matched phrases right to left.
  var opCATBehind = function(opIndex, phraseIndex, sysData) {
    var op, success, astLength, catCharIndex, catPhrase, catMatched;
    var ulen, plen;
    op = opcodes[opIndex];
    ulen = sysData.uFrame.length();
    plen = sysData.pFrame.length();
    if (_this.ast) {
      astLength = _this.ast.getLength();
    }
    success = true;
    catCharIndex = phraseIndex;
    catMatched = 0;
    catPhrase = 0;
    for (var i = op.children.length - 1; i >= 0; i -= 1) {
      opExecute(op.children[i], catCharIndex, sysData);
      catCharIndex -= sysData.phraseLength;
      catMatched += sysData.phraseLength;
      catPhrase += sysData.phraseLength;
      if (sysData.state === id.NOMATCH) {
        success = false;
        break;
      }
    }
    if (success) {
      sysData.state = catMatched === 0 ? id.EMPTY : id.MATCH;
      sysData.phraseLength = catMatched;
    } else {
      sysData.state = id.NOMATCH;
      sysData.phraseLength = 0;
      sysData.uFrame.pop(ulen);
      sysData.pFrame.pop(plen);
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  };
  // The right-to-left `REP` operator.<br>
  // Called for `REP` operators in look behind mode.
  // Makes repeated calls to its child node, concatenating matched phrases right to left.
  var opREPBehind = function(opIndex, phraseIndex, sysData) {
    var op, astLength, repCharIndex, repPhrase, repCount;
    var ulen, plen;
    op = opcodes[opIndex];
    repCharIndex = phraseIndex;
    repPhrase = 0;
    repCount = 0;
    ulen = sysData.uFrame.length();
    plen = sysData.pFrame.length();
    if (_this.ast) {
      astLength = _this.ast.getLength();
    }
    while (true) {
      if (repCharIndex <= 0) {
        /* exit on end of input string */
        break;
      }
      opExecute(opIndex + 1, repCharIndex, sysData);
      if (sysData.state === id.NOMATCH) {
        /* always end if the child node fails */
        break;
      }
      if (sysData.state === id.EMPTY) {
        /* REP always succeeds when the child node returns an empty phrase */
        /* this may not seem obvious, but that's the way it works out */
        break;
      }
      repCount += 1;
      repPhrase += sysData.phraseLength;
      repCharIndex -= sysData.phraseLength;
      if (repCount === op.max) {
        /* end on maxed out reps */
        break;
      }
    }
    /* evaluate the match count according to the min, max values */
    if (sysData.state === id.EMPTY) {
      sysData.state = (repPhrase === 0) ? id.EMPTY : id.MATCH;
      sysData.phraseLength = repPhrase;
    } else if (repCount >= op.min) {
      sysData.state = (repPhrase === 0) ? id.EMPTY : id.MATCH;
      sysData.phraseLength = repPhrase;
    } else {
      sysData.state = id.NOMATCH;
      sysData.phraseLength = 0;
      sysData.uFrame.pop(ulen);
      sysData.pFrame.pop(plen);
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  }
  // The right-to-left `TRG` operator.<br>
  // Called for `TRG` operators in look behind mode.
  // Matches a single character at `phraseIndex - 1` to the `min` - `max` range.
  var opTRGBehind = function(opIndex, phraseIndex, sysData) {
    var op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    sysData.phraseLength = 0;
    if (phraseIndex > 0) {
      var char = chars[phraseIndex - 1];
      if (op.min <= char && char <= op.max) {
        sysData.state = id.MATCH;
        sysData.phraseLength = 1;
      }
    }
  }
  // The right-to-left `TBS` operator.<br>
  // Called for `TBS` operators in look behind mode.
  // Matches the `TBS` phrase to the left of `phraseIndex`.
  var opTBSBehind = function(opIndex, phraseIndex, sysData) {
    var i, op, len, beg;
    op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    len = op.string.length;
    beg = phraseIndex - len;
    if (beg >= 0) {
      for (i = 0; i < len; i += 1) {
        if (chars[beg + i] !== op.string[i]) {
          return;
        }
      }
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    }
  }
  // The right-to-left `TLS` operator.<br>
  // Called for `TLS` operators in look behind mode.
  // Matches the `TLS` phrase to the left of `phraseIndex`.
  var opTLSBehind = function(opIndex, phraseIndex, sysData) {
    var op, char, beg, len;
    op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    len = op.string.length;
    if (len === 0) {
      /* EMPTY match allowed for TLS */
      sysData.state = id.EMPTY;
      return;
    }
    beg = phraseIndex - len;
    if (beg >= 0) {
      for (var i = 0; i < len; i += 1) {
        char = chars[beg + i];
        if (char >= 65 && char <= 90) {
          char += 32;
        }
        if (char !== op.string[i]) {
          return;
        }
      }
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    }
  }
  // The right-to-left back reference operator.<br>
  // Matches the back referenced phrase to the left of `phraseIndex`.
  var opBKRBehind = function(opIndex, phraseIndex, sysData) {
    var i, code, len, op, lmIndex, lmcode, lower, beg, frame, insensitive;
    op = opcodes[opIndex];
    /* NOMATCH default */
    sysData.state = id.NOMATCH;
    sysData.phraseLength = 0;
    if (op.index < rules.length) {
      lower = rules[op.index].lower;
    } else {
      lower = udts[op.index - rules.length].lower;
    }
    frame = (op.bkrMode === id.BKR_MODE_PM) ? sysData.pFrame.getPhrase(lower) : sysData.uFrame.getPhrase(lower);
    insensitive = (op.bkrCase === id.BKR_MODE_CI) ? true : false;
    if (frame === null) {
      return;
    }
    lmIndex = frame.phraseIndex;
    len = frame.phraseLength;
    if (len === 0) {
      sysData.state = id.EMPTY;
      sysData.phraseLength = 0;
      return;
    }
    beg = phraseIndex - len;
    if (beg >= 0) {
      if (insensitive) {
        /* case-insensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[beg + i];
          lmcode = chars[lmIndex + i];
          if (code >= 65 && code <= 90) {
            code += 32;
          }
          if (lmcode >= 65 && lmcode <= 90) {
            lmcode += 32;
          }
          if (code !== lmcode) {
            return;
          }
        }
        sysData.state = id.MATCH;
        sysData.phraseLength = len;
      } else {
        /* case-sensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[beg + i];
          lmcode = chars[lmIndex + i];
          if (code !== lmcode) {
            return;
          }
        }
      }
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    }
  }
  // Generalized execution function.<br>
  // Having a single, generalized function, allows a single location
  // for tracing and statistics gathering functions to be called.
  // Tracing and statistics are handled in separate objects.
  // However, the parser calls their API to build the object data records.
  // See [`trace.js`](./trace.html) and [`stats.js`](./stats.html) for their
  // usage.
  var opExecute = function(opIndex, phraseIndex, sysData) {
    var op, ret = true;
    op = opcodes[opIndex];
    nodeHits += 1;
    if (nodeHits > limitNodeHits) {
      throw new Error("parser: maximum number of node hits exceeded: " + limitNodeHits);
    }
    treeDepth += 1;
    if (treeDepth > maxTreeDepth) {
      maxTreeDepth = treeDepth;
      if (maxTreeDepth > limitTreeDepth) {
        throw new Error("parser: maximum parse tree depth exceeded: " + limitTreeDepth);
      }
    }
    sysData.refresh();
    if (_this.trace !== null) {
      /* collect the trace record for down the parse tree */
      var lk = lookAroundValue();
      _this.trace.down(op, sysData.state, phraseIndex, sysData.phraseLength, lk.anchor, lk.lookAround);
    }
    if (inLookBehind()) {
      switch (op.type) {
      case id.ALT:
        opALT(opIndex, phraseIndex, sysData);
        break;
      case id.CAT:
        opCATBehind(opIndex, phraseIndex, sysData);
        break;
      case id.REP:
        opREPBehind(opIndex, phraseIndex, sysData);
        break;
      case id.RNM:
        opRNM(opIndex, phraseIndex, sysData);
        break;
      case id.UDT:
        opUDT(opIndex, phraseIndex, sysData);
        break;
      case id.AND:
        opAND(opIndex, phraseIndex, sysData);
        break;
      case id.NOT:
        opNOT(opIndex, phraseIndex, sysData);
        break;
      case id.TRG:
        opTRGBehind(opIndex, phraseIndex, sysData);
        break;
      case id.TBS:
        opTBSBehind(opIndex, phraseIndex, sysData);
        break;
      case id.TLS:
        opTLSBehind(opIndex, phraseIndex, sysData);
        break;
      case id.BKR:
        opBKRBehind(opIndex, phraseIndex, sysData);
        break;
      case id.BKA:
        opBKA(opIndex, phraseIndex, sysData);
        break;
      case id.BKN:
        opBKN(opIndex, phraseIndex, sysData);
        break;
      case id.ABG:
        opABG(opIndex, phraseIndex, sysData);
        break;
      case id.AEN:
        opAEN(opIndex, phraseIndex, sysData);
        break;
      default:
        ret = false;
        break;
      }
    } else {
      switch (op.type) {
      case id.ALT:
        opALT(opIndex, phraseIndex, sysData);
        break;
      case id.CAT:
        opCAT(opIndex, phraseIndex, sysData);
        break;
      case id.REP:
        opREP(opIndex, phraseIndex, sysData);
        break;
      case id.RNM:
        opRNM(opIndex, phraseIndex, sysData);
        break;
      case id.UDT:
        opUDT(opIndex, phraseIndex, sysData);
        break;
      case id.AND:
        opAND(opIndex, phraseIndex, sysData);
        break;
      case id.NOT:
        opNOT(opIndex, phraseIndex, sysData);
        break;
      case id.TRG:
        opTRG(opIndex, phraseIndex, sysData);
        break;
      case id.TBS:
        opTBS(opIndex, phraseIndex, sysData);
        break;
      case id.TLS:
        opTLS(opIndex, phraseIndex, sysData);
        break;
      case id.BKR:
        opBKR(opIndex, phraseIndex, sysData);
        break;
      case id.BKA:
        opBKA(opIndex, phraseIndex, sysData);
        break;
      case id.BKN:
        opBKN(opIndex, phraseIndex, sysData);
        break;
      case id.ABG:
        opABG(opIndex, phraseIndex, sysData);
        break;
      case id.AEN:
        opAEN(opIndex, phraseIndex, sysData);
        break;
      default:
        ret = false;
        break;
      }
    }
    if (!inLookAround() && (phraseIndex + sysData.phraseLength > maxMatched)) {
      maxMatched = phraseIndex + sysData.phraseLength;
    }
    if (_this.stats !== null) {
      /* collect the statistics */
      _this.stats.collect(op, sysData);
    }
    if (_this.trace !== null) {
      /* collect the trace record for up the parse tree */
      var lk = lookAroundValue();
      _this.trace.up(op, sysData.state, phraseIndex, sysData.phraseLength, lk.anchor, lk.lookAround);
    }
    treeDepth -= 1;
    return ret;
  };
}

},{"./identifiers.js":6,"./utilities.js":11}],8:[function(require,module,exports){
// This module is the constructor for the statistics gathering object.
// The statistics are nothing more than keeping a count of the 
// number of times each node in the parse tree is traversed.
//
// Counts are collected for each of the individual types of operators.
// Additionally, counts are collected for each of the individually named
// `RNM` and `UDT` operators.
module.exports = function() {
  "use strict";
  var thisFileName = "stats.js: ";
  var id = require("./identifiers.js");
  var utils = require("./utilities");
  var style = require("./style.js");
  var rules = [];
  var udts = [];
  var stats = [];
  var totals;
  var ruleStats = [];
  var udtStats = [];
  this.statsObject = "statsObject";
  var nameId = 'stats';
  /* `Array.sort()` callback function for sorting `RNM` and `UDT` operators alphabetically by name. */
  var sortAlpha = function(lhs, rhs) {
    if (lhs.lower < rhs.lower) {
      return -1;
    }
    if (lhs.lower > rhs.lower) {
      return 1;
    }
    return 0;
  }
  /* `Array.sort()` callback function for sorting `RNM` and `UDT` operators by hit count. */
  var sortHits = function(lhs, rhs) {
    if (lhs.total < rhs.total) {
      return 1;
    }
    if (lhs.total > rhs.total) {
      return -1;
    }
    return sortAlpha(lhs, rhs);
  }
  /* `Array.sort()` callback function for sorting `RNM` and `UDT` operators by index */
  /* (in the order in which they appear in the SABNF grammar). */
  var sortIndex = function(lhs, rhs) {
    if (lhs.index < rhs.index) {
      return -1;
    }
    if (lhs.index > rhs.index) {
      return 1;
    }
    return 0;
  }
  var emptyStat = function(){
    this.empty = 0;
    this.match = 0;
    this.nomatch = 0;
    this.total = 0;
  }
  /* Zero out all stats */
  var clear = function() {
    stats.length = 0;
    totals = new emptyStat();
    stats[id.ALT] = new emptyStat();
    stats[id.CAT] = new emptyStat();
    stats[id.REP] = new emptyStat();
    stats[id.RNM] = new emptyStat();
    stats[id.TRG] = new emptyStat();
    stats[id.TBS] = new emptyStat();
    stats[id.TLS] = new emptyStat();
    stats[id.UDT] = new emptyStat();
    stats[id.AND] = new emptyStat();
    stats[id.NOT] = new emptyStat();
    stats[id.BKR] = new emptyStat();
    stats[id.BKA] = new emptyStat();
    stats[id.BKN] = new emptyStat();
    ruleStats.length = 0;
    for (var i = 0; i < rules.length; i += 1) {
      ruleStats.push({
        empty : 0,
        match : 0,
        nomatch : 0,
        total : 0,
        name : rules[i].name,
        lower : rules[i].lower,
        index : rules[i].index
      });
    }
    if (udts.length > 0) {
      udtStats.length = 0;
      for (var i = 0; i < udts.length; i += 1) {
        udtStats.push({
          empty : 0,
          match : 0,
          nomatch : 0,
          total : 0,
          name : udts[i].name,
          lower : udts[i].lower,
          index : udts[i].index
        });
      }
    }
  };
  /* increment the designated operator hit count by one*/
  var incStat = function(stat, state, phraseLength) {
    stat.total += 1;
    switch (state) {
    case id.EMPTY:
      stat.empty += 1;
      break;
    case id.MATCH:
      stat.match += 1;
      break;
    case id.NOMATCH:
      stat.nomatch += 1;
      break;
    default:
      throw thisFileName + "collect(): incStat(): unrecognized state: " + state;
      break;
    }
  }
  /* helper for toHtml() */
  var displayRow = function(name, stat){
    var html = '';
    html += '<tr>';
    html += '<td class="'+style.CLASS_ACTIVE+'">'+name+'</td>';
    html += '<td class="'+style.CLASS_EMPTY+'">' + stat.empty + '</td>';
    html += '<td class="'+style.CLASS_MATCH+'">' + stat.match + '</td>';
    html += '<td class="'+style.CLASS_NOMATCH+'">' + stat.nomatch + '</td>';
    html += '<td class="'+style.CLASS_ACTIVE+'">' + stat.total + '</td>';
    html += '</tr>\n';
    return html;
  }
  var displayOpsOnly = function() {
    var html = '';
    html += displayRow("ALT", stats[id.ALT]);
    html += displayRow("CAT", stats[id.CAT]);
    html += displayRow("REP", stats[id.REP]);
    html += displayRow("RNM", stats[id.RNM]);
    html += displayRow("TRG", stats[id.TRG]);
    html += displayRow("TBS", stats[id.TBS]);
    html += displayRow("TLS", stats[id.TLS]);
    html += displayRow("UDT", stats[id.UDT]);
    html += displayRow("AND", stats[id.AND]);
    html += displayRow("NOT", stats[id.NOT]);
    html += displayRow("BKR", stats[id.BKR]);
    html += displayRow("BKA", stats[id.BKA]);
    html += displayRow("BKN", stats[id.BKN]);
    html += displayRow("totals", totals);
    return html;
  }
  /* helper for toHtml() */
  var displayRules = function() {
    var html = "";
    html += '<tr><th></th><th></th><th></th><th></th><th></th></tr>\n';
    html += '<tr><th>rules</th><th></th><th></th><th></th><th></th></tr>\n';
    for (var i = 0; i < rules.length; i += 1) {
      if (ruleStats[i].total > 0) {
        html += '<tr>';
        html += '<td class="'+style.CLASS_ACTIVE+'">' + ruleStats[i].name + '</td>';
        html += '<td class="'+style.CLASS_EMPTY+'">' + ruleStats[i].empty + '</td>';
        html += '<td class="'+style.CLASS_MATCH+'">' + ruleStats[i].match + '</td>';
        html += '<td class="'+style.CLASS_NOMATCH+'">' + ruleStats[i].nomatch + '</td>';
        html += '<td class="'+style.CLASS_ACTIVE+'">' + ruleStats[i].total + '</td>';
        html += '</tr>\n';
      }
    }
    if (udts.length > 0) {
      html += '<tr><th></th><th></th><th></th><th></th><th></th></tr>\n';
      html += '<tr><th>udts</th><th></th><th></th><th></th><th></th></tr>\n';
      for (var i = 0; i < udts.length; i += 1) {
        if (udtStats[i].total > 0) {
          html += '<tr>';
          html += '<td class="'+style.CLASS_ACTIVE+'">' + udtStats[i].name + '</td>';
          html += '<td class="'+style.CLASS_EMPTY+'">' + udtStats[i].empty + '</td>';
          html += '<td class="'+style.CLASS_MATCH+'">' + udtStats[i].match + '</td>';
          html += '<td class="'+style.CLASS_NOMATCH+'">' + udtStats[i].nomatch + '</td>';
          html += '<td class="'+style.CLASS_ACTIVE+'">' + udtStats[i].total + '</td>';
          html += '</tr>\n';
        }
      }
    }
    return html;
  }
  /* called only by the parser to validate a stats object*/
  this.validate = function(name) {
    var ret = false;
    if (typeof (name) === 'string' && nameId === name) {
      ret = true;
    }
    return ret;
  }
  /* no verification of input - only called by parser() */
  this.init = function(inputRules, inputUdts) {
    rules = inputRules;
    udts = inputUdts;
    clear();
  }
  /* This function is the main interaction with the parser. */
  /* The parser calls it after each node has been traversed. */
  this.collect = function(op, result) {
    incStat(totals, result.state, result.phraseLength);
    incStat(stats[op.type], result.state, result.phraseLength);
    if (op.type === id.RNM) {
      incStat(ruleStats[op.index], result.state, result.phraseLength);
    }
    if (op.type === id.UDT) {
      incStat(udtStats[op.index], result.state, result.phraseLength);
    }
  };
  // Display the statistics as an HTML table.
  // - *type*
  //   - "ops" - (default) display only the total hit counts for all operator types.
  //   - "index" - additionally, display the hit counts for the individual `RNM` and `UDT` operators ordered by index.
  //   - "hits" - additionally, display the hit counts for the individual `RNM` and `UDT` operators by hit count.
  //   - "alpha" - additionally, display the hit counts for the individual `RNM` and `UDT` operators by name alphabetically.
  // - *caption* - optional caption for the table
  this.toHtml = function(type, caption) {
    var display = displayOpsOnly;
    var html = "";
    html += '<table class="'+style.CLASS_STATS+'">\n';
    if (typeof (caption) === "string") {
      html += '<caption>' + caption + '</caption>\n';
    }
    html += '<tr><th class="'+style.CLASS_ACTIVE+'">ops</th>\n';
    html += '<th class="'+style.CLASS_EMPTY+'">EMPTY</th>\n';
    html += '<th class="'+style.CLASS_MATCH+'">MATCH</th>\n';
    html += '<th class="'+style.CLASS_NOMATCH+'">NOMATCH</th>\n';
    html += '<th class="'+style.CLASS_ACTIVE+'">totals</th></tr>\n';
    while (true) {
      if (type === undefined) {
        html += displayOpsOnly();
        break;
      }
      if (type === null) {
        html += displayOpsOnly();
        break;
      }
      if (type === "ops") {
        html += displayOpsOnly();
        break;
      }
      if (type === "index") {
        ruleStats.sort(sortIndex);
        if (udtStats.length > 0) {
          udtStats.sort(sortIndex);
        }
        html += displayOpsOnly();
        html += displayRules();
        break;
      }
      if (type === "hits") {
        ruleStats.sort(sortHits);
        if (udtStats.length > 0) {
          udtStats.sort(sortIndex);
        }
        html += displayOpsOnly();
        html += displayRules();
        break;
      }
      if (type === "alpha") {
        ruleStats.sort(sortAlpha);
        if (udtStats.length > 0) {
          udtStats.sort(sortAlpha);
        }
        html += displayOpsOnly();
        html += displayRules();
        break;
      }
      break;
    }
    html += "</table>\n";
    return html;
  }
  // Display the stats table in a complete HTML5 page.
  this.toHtmlPage = function(type, caption, title) {
    return utils.htmlToPage(this.toHtml(type, caption), title);
  }
}

},{"./identifiers.js":6,"./style.js":9,"./utilities":11}],9:[function(require,module,exports){
module.exports = {

  // Generated by apglib/style.js 
  CLASS_MONOSPACE: 'apg-mono',
  CLASS_ACTIVE: 'apg-active',
  CLASS_EMPTY: 'apg-empty',
  CLASS_MATCH: 'apg-match',
  CLASS_NOMATCH: 'apg-nomatch',
  CLASS_LOOKAHEAD: 'apg-lh-match',
  CLASS_LOOKBEHIND: 'apg-lb-match',
  CLASS_REMAINDER: 'apg-remainder',
  CLASS_CTRLCHAR: 'apg-ctrl-char',
  CLASS_LINEEND: 'apg-line-end',
  CLASS_ERROR: 'apg-error',
  CLASS_PHRASE: 'apg-phrase',
  CLASS_EMPTYPHRASE: 'apg-empty-phrase',
  CLASS_STATE: 'apg-state',
  CLASS_STATS: 'apg-stats',
  CLASS_TRACE: 'apg-trace',
  CLASS_GRAMMAR: 'apg-grammar',
  CLASS_RULES: 'apg-rules',
  CLASS_RULESLINK: 'apg-rules-link',
  CLASS_ATTRIBUTES: 'apg-attrs',
}

},{}],10:[function(require,module,exports){
// This module provides a means of tracing the parser through the parse tree as it goes.
// It is the primary debugging facility for debugging both the SABNF grammar syntax
// and the input strings that are supposed to be valid grammar sentences.
// It is also a very informative and educational tool for understanding
// how a parser actually operates for a given language.
//
// Tracing is the process of generating and saving a record of information for each passage
// of the parser through a parse tree node. And since it traverses each node twice, once down the tree
// and once coming back up, there are two records for each node.
// This, obviously, has the potential of generating lots of records.
// And since these records are normally displayed on a web page
// it is important to have a means to limit the actual number of records generated to
// probably no more that a few thousand. This is almost always enough to find any errors.
// The problem is to get the *right* few thousand records.
// Therefore, this module has a number of ways of limiting and/or filtering, the number and type of records.
// Considerable effort has been made to make this filtering of the trace output as simple
// and intuitive as possible. In [previous versions](http://coasttocoastresearch.com/)
// of the APG library this has admittedly not been very clean.
//
// However, the ability to filter the trace records, or for that matter even understand what they are
// and the information they contain, does require a minimum amount of understanding of the APG parsing
// method. The parse tree nodes are all represented by APG operators. They break down into two natural groups.
// - The `RNM` operators and `UDT` operators are named phrases.
// These are names chosen by the writer of the SABNF grammar to represent special phrases of interest.
// - All others collect, concatenate and otherwise manipulate various intermediate phrases along the way.
//
// There are separate means of filtering which of these operators in each of these two groups get traced.
// Let `trace` be an instantiated `trace.js` object.
// Prior to parsing the string, filtering the rules and UDTs can be defined as follows:
//```
// trace.filter.rules["rulename"] = true;
//     /* trace rule name "rulename" */
// trace.filter.rules["udtname"]  = true;
//     /* trace UDT name "udtname" */
// trace.filter.rules["<ALL>"]    = true;
//     /* trace all rules and UDTs (the default) */
// trace.filter.rules["<NONE>"]   = true;
//     /* trace no rules or UDTS */
//```
// If any rule or UDT name other than "&lt;ALL>" or "&lt;NONE>" is specified, all other names are turned off.
// Therefore, to be selective of rule names, a filter statement is required for each rule/UDT name desired.
//
// Filtering of the other operators follows a similar procedure.
//```
// trace.filter.operators["TRG"] = true;
//     /* trace the terminal range, TRG, operators */
// trace.filter.operators["CAT"]  = true;
//     /* trace the concatenations, CAT, operators */
// trace.filter.operators["<ALL>"]    = true;
//     /* trace all operators */
// trace.filter.operators["<NONE>"]   = true;
//     /* trace no operators (the default) */
//```
// If any operator name other than "&lt;ALL>" or "&lt;NONE>" is specified, all other names are turned off.
// Therefore, to be selective of operator names, a filter statement is required for each name desired.
//
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
  var MAX_PHRASE = 80;
  var MAX_TLS = 5;
  var utils = require("./utilities.js");
  var style = require("./style.js");
  var circular = new (require("./circular-buffer.js"))();
  var id = require("./identifiers.js");
  var records = [];
  var maxRecords = 5000;
  var lastRecord = -1;
  var filteredRecords = 0;
  var treeDepth = 0;
  var recordStack = [];
  var chars = null;
  var rules = null;
  var udts = null;
  var operatorFilter = [];
  var ruleFilter = [];
  /* special trace table phrases */
  var PHRASE_END_CHAR = "&bull;";
  var PHRASE_CONTINUE_CHAR = "&hellip;";
  var PHRASE_END = '<span class="' + style.CLASS_LINEEND + '">&bull;</span>';
  var PHRASE_CONTINUE = '<span class="' + style.CLASS_LINEEND + '">&hellip;</span>';
  var PHRASE_EMPTY = '<span class="' + style.CLASS_EMPTY + '">&#120634;</span>';
  var PHRASE_NOMATCH = '<span class="' + style.CLASS_NOMATCH + '">&#120636;</span>';
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
      operatorFilter[id.ABG] = set;
      operatorFilter[id.AEN] = set;
    }
    var items = 0;
    for ( var name in that.filter.operators) {
      items += 1;
    }
    if (items === 0) {
      /* case 1: no operators specified: default: do not trace any operators */
      setOperators(false);
      return;
    }
    for ( var name in that.filter.operators) {
      var upper = name.toUpperCase();
      if (upper === '<ALL>') {
        /* case 2: <all> operators specified: trace all operators ignore all other operator commands */
        setOperators(true);
        return;
      }
      if (upper === '<NONE>') {
        /* case 3: <none> operators specified: trace NO operators ignore all other operator commands */
        setOperators(false);
        return;
      }
    }
    setOperators(false);
    for ( var name in that.filter.operators) {
      var upper = name.toUpperCase();
      /* case 4: one or more individual operators specified: trace 'true' operators only */
      if (upper === 'ALT') {
        operatorFilter[id.ALT] = (that.filter.operators[name] === true) ? true: false;
      } else if (upper === 'CAT') {
        operatorFilter[id.CAT] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'REP') {
        operatorFilter[id.REP] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'AND') {
        operatorFilter[id.AND] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'NOT') {
        operatorFilter[id.NOT] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'TLS') {
        operatorFilter[id.TLS] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'TBS') {
        operatorFilter[id.TBS] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'TRG') {
        operatorFilter[id.TRG] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'BKR') {
        operatorFilter[id.BKR] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'BKA') {
        operatorFilter[id.BKA] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'BKN') {
        operatorFilter[id.BKN] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'ABG') {
        operatorFilter[id.ABG] = (that.filter.operators[name] === true) ? true: false;;
      } else if (upper === 'AEN') {
        operatorFilter[id.AEN] = (that.filter.operators[name] === true) ? true: false;;
      } else {
        throw new Error(thisFileName + "initOpratorFilter: '" + name + "' not a valid operator name."
            + " Must be <all>, <none>, alt, cat, rep, tls, tbs, trg, and, not, bkr, bka or bkn");
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
    var items, i, list = [];
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
      return;
    }
    for ( var name in that.filter.rules) {
      var lower = name.toLowerCase();
      if (lower === '<all>') {
        /* case 2: trace all rules ignore all other rule commands */
        setRules(true);
        return;
      }
      if (lower === '<none>') {
        /* case 3: trace no rules */
        setRules(false);
        return;
      }
    }
    /* case 4: trace only individually specified rules */
    setRules(false);
    operatorFilter[id.RNM] = true;
    operatorFilter[id.UDT] = true;
    for ( var name in that.filter.rules) {
      var lower = name.toLowerCase();
      i = list.indexOf(lower);
      if (i < 0) {
        throw new Error(thisFileName + "initRuleFilter: '" + name + "' not a valid rule or udt name");
      }
      ruleFilter[i] = (that.filter.rules[name] === true) ? true: false;;
    }
  }
  /* used by other APG components to verify that they have a valid trace object */
  this.traceObject = "traceObject";
  this.filter = {
    operators : [],
    rules : []
  }
  // Set the maximum number of records to keep (default = 5000).
  // Each record number larger than `maxRecords`
  // will result in deleting the previously oldest record.
  this.setMaxRecords = function(max, last) {
    if (typeof (max) === "number" && max > 0) {
      maxRecords = Math.ceil(max);
    }
    if(typeof(last) === "number"){
      lastRecord = Math.floor(last);
      if(lastRecord < 0){
        lastRecord = -1;
      }else if(lastRecord < maxRecords){
        lastRecord = maxRecords;
      }
    }
  }
  // Returns `maxRecords` to the caller.
  this.getMaxRecords = function() {
    return maxRecords;
  }
  /* Called only by the `parser.js` object. No verification of input. */
  this.init = function(rulesIn, udtsIn, charsIn) {
    records.length = 0;
    recordStack.length = 0;
    filteredRecords = 0;
    treeDepth = 0;
    chars = charsIn;
    rules = rulesIn;
    udts = udtsIn;
    initOperatorFilter();
    initRuleFilter();
    circular.init(maxRecords);
  };
  /* returns true if this records passes through the designated filter, false if the record is to be skipped */
  var filterOps = function(op) {
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
  var filterRecords = function(record){
    if((lastRecord === -1) || (record <= lastRecord)){
      return true;
    }
    return false;
  }
  /* Collect the "down" record. */
  this.down = function(op, state, offset, length, anchor, lookAround) {
    if (filterRecords(filteredRecords) && filterOps(op)) {
      recordStack.push(filteredRecords);
      records[circular.increment()] = {
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
  /* Collect the "up" record. */
  this.up = function(op, state, offset, length, anchor, lookAround) {
    if (filterRecords(filteredRecords) && filterOps(op)) {
      var thisLine = filteredRecords;
      var thatLine = recordStack.pop();
      var thatRecord = circular.getListIndex(thatLine);
      if (thatRecord !== -1) {
        records[thatRecord].thatLine = thisLine;
      }
      treeDepth -= 1;
      records[circular.increment()] = {
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
  // Translate the trace records to HTML format.
  // - *modearg* - can be `"ascii"`, `"decimal"`, `"hexidecimal"` or `"unicode"`.
  // Determines the format of the string character code display.
  // - *caption* - optional caption for the HTML table.
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
  // Translate the trace records to HTML format and create a complete HTML page for browser display.
  this.toHtmlPage = function(mode, caption, title){
    return utils.htmlToPage(this.toHtml(mode, caption), title);
  }

  /* From here on down, these are just helper functions for `toHtml()`. */
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
    var header = '';
    header += '<p>display mode: ' + modeName + '</p>\n';
    header += '<table class="'+style.CLASS_TRACE+'">\n';
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
    footer += '<p class="'+style.CLASS_MONOSPACE+'">legend:<br>\n';
    footer += '(a)&nbsp;-&nbsp;line number<br>\n';
    footer += '(b)&nbsp;-&nbsp;matching line number<br>\n';
    footer += '(c)&nbsp;-&nbsp;phrase offset<br>\n';
    footer += '(d)&nbsp;-&nbsp;phrase length<br>\n';
    footer += '(e)&nbsp;-&nbsp;tree depth<br>\n';
    footer += '(f)&nbsp;-&nbsp;operator state<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_ACTIVE + '">&darr;</span>&nbsp;&nbsp;phrase opened<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_MATCH + '">&uarr;M</span> phrase matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_EMPTY + '">&uarr;E</span> empty phrase matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_NOMATCH + '">&uarr;N</span> phrase not matched<br>\n';
    footer += 'operator&nbsp;-&nbsp;ALT, CAT, REP, RNM, TRG, TLS, TBS<sup>&dagger;</sup>, UDT, AND, NOT, BKA, BKN, BKR, ABG, AEN<sup>&Dagger;</sup><br>\n';
    footer += 'phrase&nbsp;&nbsp;&nbsp;-&nbsp;up to ' + MAX_PHRASE + ' characters of the phrase being matched<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_MATCH
    + '">matched characters</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_LOOKAHEAD
    + '">matched characters in look ahead mode</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_LOOKBEHIND
    + '">matched characters in look behind mode</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_REMAINDER
        + '">remainder characters(not yet examined by parser)</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;<span class="' + style.CLASS_CTRLCHAR
        + '">control characters, TAB, LF, CR, etc. (ASCII mode only)</span><br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;' + PHRASE_EMPTY + ' empty string<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;' + PHRASE_END + ' end of input string<br>\n';
    footer += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;' + PHRASE_CONTINUE
        + ' input string display truncated<br>\n';
    footer += '</p>\n';
    footer += '<p class="'+style.CLASS_MONOSPACE+'">\n';
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
    footer += 'BKR - back reference<br>\n';
    footer += 'ABG - anchor - begin of input string<br>\n';
    footer += 'AEN - anchor - end of input string<br>\n';
    footer += '</p>\n';
    return footer;
  }
  /* Returns the filtered records, formatted as an HTML table. */
  var htmlTable = function(mode) {
    if (rules === null) {
      return "";
    }
    var html = '';
    var line, thisLine, thatLine, lookAhead, lookBehind, lookAround, anchor;
    html += '<tr><th>(a)</th><th>(b)</th><th>(c)</th><th>(d)</th><th>(e)</th><th>(f)</th>';
    html += '<th>operator</th><th>phrase</th></tr>\n';
    circular.forEach(function(lineIndex, index) {
      var line = records[lineIndex];
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
        html += '<span class="' + style.CLASS_ACTIVE + '">&darr;&nbsp;</span>';
        break;
      case id.MATCH:
        html += '<span class="' + style.CLASS_MATCH + '">&uarr;M</span>';
        break;
      case id.NOMATCH:
        html += '<span class="' + style.CLASS_NOMATCH + '">&uarr;N</span>';
        break;
      case id.EMPTY:
        html += '<span class="' + style.CLASS_EMPTY + '">&uarr;E</span>';
        break;
      default:
        html += '<span class="' + style.CLASS_ACTIVE + '">--</span>';
        break;
      }
      html += '</td>';
      html += '<td>';
      html += that.indent(line.depth);
      if (lookAhead) {
        html += '<span class="' + style.CLASS_LOOKAHEAD + '">';
      }else  if (lookBehind) {
        html += '<span class="' + style.CLASS_LOOKBEHIND + '">';
      }
      html += utils.opcodeToString(line.opcode.type);
      if (line.opcode.type === id.RNM) {
        html += '(' + rules[line.opcode.index].name + ') ';
      }
      if (line.opcode.type === id.BKR) {
        var casetype = line.opcode.bkrCase === id.BKR_MODE_CI ? "%i" : "%s";
        var modetype = line.opcode.bkrMode === id.BKR_MODE_UM ? "%u" : "%p";
        html += '(\\' + casetype + modetype + rules[line.opcode.index].name + ') ';
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
    }
    return html;
  };
  /* format the TRG operator */
  var displayTrg = function(mode, op) {
    var html = "";
    if (op.type === id.TRG) {
      var min, max, hex;
      if (mode === MODE_HEX || mode === MODE_UNICODE) {
        hex = op.min.toString(16).toUpperCase();
        if (hex.length % 2 !== 0) {
          hex = "0" + hex;
        }
        html += (mode === MODE_HEX) ? "%x" : "U+";
        html += hex;
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
  /* format the REP operator */
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
  /* format the TBS operator */
  var displayTbs = function(mode, op) {
    var html = "";
    if (op.type === id.TBS) {
      var len = Math.min(op.string.length, MAX_TLS * 2);
      if (mode === MODE_HEX || mode === MODE_UNICODE) {
        html += (mode === MODE_HEX) ? "%x" : "U+";
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
  /* format the TLS operator */
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
          html += utils.asciiChars[op.string[i]];
        }
        if (len < op.string.length) {
          html += PHRASE_CONTINUE;
        }
        html += '"';
      }
    }
    return html;
  }
  /* display phrases matched in look-behind mode */
  var displayBehind = function(mode, chars, state, index, length, anchor) {
    var html = '';
    var beg1, len1, beg2, len2;
    var lastchar = PHRASE_END;
    var spanBehind = '<span class="' + style.CLASS_LOOKBEHIND + '">';
    var spanRemainder = '<span class="' + style.CLASS_REMAINDER + '">'
    var spanend = '</span>';
    var prev = false;
    switch (state) {
    case id.EMPTY:
      html += PHRASE_EMPTY;
    case id.NOMATCH:
    case id.MATCH:
    case id.ACTIVE:
      beg1 = index - length;
      len1 = anchor - beg1;
      beg2 = anchor;
      len2 = chars.length - beg2;
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
    if(len1 > 0){
      html += spanBehind;
      html += subPhrase(mode, chars, beg1, len1, prev);
      html += spanend;
      prev = true;
    }
    if(len2 > 0){
      html += spanRemainder;
      html += subPhrase(mode, chars, beg2, len2, prev);
      html += spanend;
    }
    return html + lastchar;
  }
  /* display phrases matched in look-ahead mode */
  var displayAhead = function(mode, chars, state, index, length) {
    var spanAhead = '<span class="' + style.CLASS_LOOKAHEAD + '">';
    return displayForward(mode, chars, state, index, length, spanAhead);
  }
  /* display phrases matched in normal parsing mode */
  var displayNone = function(mode, chars, state, index, length) {
    var spanAhead = '<span class="' + style.CLASS_MATCH + '">';
    return displayForward(mode, chars, state, index, length, spanAhead);
  }
  var displayForward = function(mode, chars, state, index, length, spanAhead) {
    var html = '';
    var beg1, len1, beg2, len2;
    var lastchar = PHRASE_END;
    var spanRemainder = '<span class="' + style.CLASS_REMAINDER + '">'
    var spanend = '</span>';
    var prev = false;
    switch (state) {
    case id.EMPTY:
      html += PHRASE_EMPTY;
    case id.NOMATCH:
    case id.ACTIVE:
      beg1 = index;
      len1 = 0;
      beg2 = index;
      len2 = chars.length - beg2;
      break;
    case id.MATCH:
      beg1 = index;
      len1 = length;
      beg2 = index + len1;
      len2 = chars.length - beg2;
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
    if(len1 > 0){
      html += spanAhead;
      html += subPhrase(mode, chars, beg1, len1, prev);
      html += spanend;
      prev = true;
    }
    if(len2 > 0){
      html += spanRemainder;
      html += subPhrase(mode, chars, beg2, len2, prev);
      html += spanend;
    }
    return html + lastchar;
  }
  var subPhrase = function(mode, chars, index, length, prev) {
    if (length === 0) {
      return "";
    }
    var phrase = "";
    var comma = prev ? "," : "";
    switch (mode) {
    case MODE_HEX:
      phrase = comma + utils.charsToHex(chars, index, length);
      break;
    case MODE_DEC:
      if(prev){
        return "," + utils.charsToDec(chars, index, length);
      }
      phrase = comma + utils.charsToDec(chars, index, length);
      break;
    case MODE_UNICODE:
      phrase = comma + utils.charsToUnicode(chars, index, length);
      break;
    case MODE_ASCII:
    default:
    phrase = utils.charsToAsciiHtml(chars, index, length);
      break;
    }
    return phrase;
  }
}

},{"./circular-buffer.js":2,"./identifiers.js":6,"./style.js":9,"./utilities.js":11}],11:[function(require,module,exports){
// This module exports a variety of utility functions that support 
// [`apg`](https://github.com/ldthomas/apg-js2), [`apg-lib`](https://github.com/ldthomas/apg-js2-lib)
// and the generated parser applications.
"use strict";
var thisFileName = "utilities.js: ";
var style = require('./style.js');
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
//var style = {
//  /* classes */
//  CLASS_ACTIVE : "apg-active",
//  CLASS_MATCH : "apg-match",
//  CLASS_NOMATCH : "apg-nomatch",
//  CLASS_EMPTY : "apg-empty",
//  CLASS_LOOKAHEAD : "apg-lh-match",
//  CLASS_LOOKBEHIND : "apg-lb-match",
//  CLASS_REMAINDER : "apg-remainder",
//  CLASS_CTRLCHAR : "apg-ctrl-char",
//  CLASS_LINEEND : "apg-line-end",
//  CLASS_ERROR : "apg-error",
//  CLASS_PHRASE : "apg-phrase",
//  CLASS_EMPTYPHRASE : "apg-empty-phrase",
//  CLASS_STATE : "apg-state",
//  CLASS_STATS : "apg-stats",
//  CLASS_TRACE : "apg-trace",
//  CLASS_MONOSPACE : "apg-mono"
//}
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
  page += '<link rel="stylesheet" href="apglib.css">\n';
//  page += exports.styleClasses();
//  page += exports.styleLeftTable();
//  page += exports.styleRightTable();
//  page += exports.styleLastLeftTable();
//  page += exports.styleLast2LeftTable();
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
  html += '<table class="' + style.CLASS_STATE + '">\n';
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
  html += '</table>\n';
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
  case id.ABG:
    ret = 'ABG';
    break;
  case id.AEN:
    ret = 'AEN';
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
// Translates a sub-array of character codes to HTML display format.
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
      html += '<span class="' + style.CLASS_CTRLCHAR + '">' + _this.asciiChars[char] + '</span>';
    } else if (char > 127) {
      /* non-ASCII */
      html += '<span class="' + style.CLASS_CTRLCHAR + '">' + 'U+' + _this.charToHex(char) + '</span>';
    } else {
      /* printing ASCII, 32 <= char <= 126 */
      html += _this.asciiChars[char];
    }
  }
  return html;
}
//Translates a JavaScript string to HTML display format.
exports.stringToAsciiHtml = function(str){
  var chars = this.stringToChars(str);
  return this.charsToAsciiHtml(chars);
}
},{"./identifiers.js":6,"./style.js":9}]},{},[5])