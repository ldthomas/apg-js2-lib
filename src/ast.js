// This module is used by the parser to build an Abstract Syntax Tree (`AST`).
//
// The `AST` is a tree of nodes, each node being related to a rule name or `UDT` name
// in the defining SABNF grammar.
// It is built as the parser successfully matches phrases to the rule names
// (`RNM` operators) and `UDT`s as it parses an input string.
// Associated with each node is the phrase that the
// named rule name or `UDT` matched.
// The user controls which rule or `UDT` names to keep on the `AST`.
// The user can also associate callback functions with some or all of the retained
// `AST` nodes to be used to translate the node phrases. That is, associate semantic
// actions to the matched phrases.
// Translating the `AST` rather that attempting to apply semantic actions during
// the parsing process, has the advantage that there is no backtracking and that the phrases
// are known while traversing down tree as will as up.
//
// To identify a node to be kept on the `AST` use:<br>
// `ast.callbacks["rulename"] = true;` (all nodes default to `false`)<br>
// To associate a callback function with a node:<br>
// `ast.callbacks["rulename"] = fn`<br>
// where `ast` is an `ast.js` module object, `rulename` is any rule or `UDT` name defined by the associated grammar
// and `fn` is a user-written callback function.
// 
// (See `apg-examples` for examples of how to create an `AST`,
// define the nodes and callback functions and attach it to a parser.)
module.exports = function() {
  "use strict";
  var thisFileName = "ast.js: ";
  var id = require("./identifiers.js");
  var that = this;
  var rules = null;
  var udts = null;
  var chars = null;
  var charsFirst = 0;
  var charsLength = 0;
  var nodeCount = 0;
  var nodesDefined = [];
  var nodeCallbacks = [];
  var stack = [];
  var records = [];
  this.callbacks = [];
  this.astObject = "astObject";
  // Called by the parser to define the rule names, `UDT`s and the input string
  // for this `AST`.
  this.init = function(rulesIn, udtsIn, charsIn, beg, len) {
    stack.length = 0;
    records.length = 0;
    nodesDefined.length = 0;
    nodeCount = 0;
    rules = rulesIn;
    udts = udtsIn;
    chars = charsIn;
    charsFirst = beg;
    charsLength = len;
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
        throw new Error(thisFileName + "init: " + "node '" + index
            + "' not a rule or udt name");
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
  // Called by the parser's `RNM` operator to see if there is an `AST` node
  // defined for this rule name.
  this.ruleDefined = function(index) {
    return nodesDefined[index] === false ? false : true;
  }
  // Called by the parser's `UDT` operator to see if there is an `AST` node
  // defined for this `UDT` name.
  this.udtDefined = function(index) {
    return nodesDefined[rules.length + index] === false ? false : true;
  }
  // Called by the parser's `RNM` and `UDT` operators to build a node record for
  // traversing down the `AST`.
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
  // Called by the parser's `RNM` and `UDT` operators to build a node record for
  // traversing up the `AST`.
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
  // Called by the user to translate the `AST`.
  // Translate means to associate or apply some semantic action to the
  // phrases that were syntactically matched to the `AST` nodes according
  // to the defining grammar.
  //
  // To translate a given rule or `UDT` name phrase, a node & callback function
  // must have been defined for it. (See `apg-examples`.)
  this.translate = function(data) {
    var ret, call, callback, record;
    for (var i = 0; i < records.length; i += 1) {
      record = records[i];
      callback = nodeCallbacks[record.callbackIndex];
      if (record.state === id.SEM_PRE) {
        if (callback !== null) {
          ret = callback(id.SEM_PRE, chars, record.phraseIndex,
              record.phraseLength, data);
          if (ret === id.SEM_SKIP) {
            i = record.thatIndex;
          }
        }
      } else {
        if (callback !== null) {
          callback(id.SEM_POST, chars, record.phraseIndex, record.phraseLength,
              data);
        }
      }
    }
  }
  // Called by the parser to reset the length of the records array.
  // The length should be the return value of a previous call to `getLength()`.
  this.setLength = function(length) {
    records.length = length;
    if (length > 0) {
      stack.length = records[length - 1].stack;
    } else {
      stack.length = 0;
    }
  };
  // Called by the parser to get the length of the records array.
  // The array length will have to be reset to this with `setLength()` on
  // backtracking.
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
  /* helper for XML display */
  function phrase(chars, depth, beg, len) {
    var xml = '';
    var maxLine = 30;
    var i;
    depth += 2;
    var end = Math.min(charsLength, beg + len);
    xml += indent(depth);
    for (i = beg; i < end; i += 1) {
      if (i > beg) {
        xml += ",";
        if (i % maxLine === 0) {
          xml += "\n" + indent(depth);
        }
      }
      xml += chars[i];
    }
    xml += "\n";
    return xml;
  }
  // Generate an `XML` version of the `AST`.
  // Useful if you want to use a special or favorite XML parser to translate the
  // `AST`.
  this.displayXml = function() {
    var xml = "";
    var i, j, depth = 0;
    xml += '<?xml version="1.0" encoding="utf-8"?>\n';
    xml += '<root nodes="' + records.length / 2 + '" characters="'
        + charsLength + '">\n';
    xml += '<!-- input string character codes, comma-delimited UTF-32 integers -->\n';
    xml += phrase(chars, depth, charsFirst, charsLength);
    records.forEach(function(rec, index) {
      if (rec.state === id.SEM_PRE) {
        depth += 1;
        xml += indent(depth);
        xml += '<node name="' + rec.name + '" phraseIndex="' + rec.phraseIndex
            + '" phraseLength="' + rec.phraseLength + '">\n'
        xml += phrase(chars, depth, rec.phraseIndex, rec.phraseLength);
      } else {
        xml += indent(depth);
        xml += '</node><!-- name="' + rec.name + '" -->\n'
        depth -= 1;
      }
    });

    xml += '</root>\n';
    return xml;
  }
  // Generate a JavaScript object version of the `AST`.
  this.phrases = function(obj) {
    var i, j, str, beg, end, record;
    if(typeof(obj) !== "object" || obj == null){
      return;
    }
    for(i = 0; i < records.length; i += 1){
      record = records[i];
      if (record.state === id.SEM_PRE) {
        if(Array.isArray(obj[record.name]) === false){
          obj[record.name] = [];
        }
        str = "";
        end = record.phraseIndex + record.phraseLength
        for(j = record.phraseIndex; j < end; j += 1){
          str += String.fromCharCode(chars[j]);
        }
        obj[record.name].push({
          phrase : str,
          index : record.phraseIndex
//          length : record.phraseLength
        });
      }
    }
  }
}
