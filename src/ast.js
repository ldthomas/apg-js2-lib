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
    var ret, callback, record;
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
    var depth = 0;
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
