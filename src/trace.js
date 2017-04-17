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
  var PHRASE_END = '<span class="' + style.CLASS_LINEEND + '">&bull;</span>';
  var PHRASE_CONTINUE = '<span class="' + style.CLASS_LINEEND + '">&hellip;</span>';
  var PHRASE_EMPTY = '<span class="' + style.CLASS_EMPTY + '">&#120634;</span>';
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
  this.toTreeObject = function(){
    /* generate the tree nodes */
    function nodeOpcode(node, opcode){
      if(opcode){
        node.op = {id: opcode.type, name: utils.opcodeToString(opcode.type)};
        node.opData = undefined;
        switch(opcode.type){
        case id.RNM:
          node.opData = rules[opcode.index].name
          break;
        case id.UDT:
          node.opData = udts[opcode.index].name
          break;
        case id.BKR:
          var name, casetype, modetype;
          if (opcode.index < rules.length) {
            name = rules[opcode.index].name;
          } else {
            name = udts[opcode.index - rules.length].name;
          }
          casetype = opcode.bkrCase === id.BKR_MODE_CI ? "%i" : "%s";
          modetype = opcode.bkrMode === id.BKR_MODE_UM ? "%u" : "%p";
          node.opData = '\\' + casetype + modetype + name;
          break;
        case id.TLS:
          node.opData = [];
          for(var i = 0; i < opcode.string.length; i += 1){
            node.opData.push(opcode.string[i]);
          }
          break;
        case id.TBS:
          node.opData = [];
          for(var i = 0; i < opcode.string.length; i += 1){
            node.opData.push(opcode.string[i]);
          }
          break;
        case id.TRG:
          node.opData = [opcode.min, opcode.max];
          break;
        case id.REP:
          node.opData = [opcode.min, opcode.max];
          break;
        }
      }else{
        node.opType = {id: undefined, name: undefined};
        node.opData = undefined;
      }
    }
    function nodePhrase(state, index, length){
      var ret = "";
      if(state === id.MATCH){
        var ret = "[";
        for(var i = index; i < index + length; i += 1){
          if(i > index){
            ret += ", " + chars[i];
          }else{
            ret += chars[i];
          }
        }
        ret += "]";
        return ret;
      }
      if(state === id.NOMATCH){
        return null;
      }
      if(state === id.EMPTY){
        return null;
      }
      return null;
    }
    function nodeFactory(parent, record, depth){
      var op, state, name, casetype, modetype;
      var node = {
          id: nodeId++,
          branch: -1,
          parent: parent,
          up: false,
          depth: depth,
          children: []
      }
      if(record){
        node.down = true;
        node.state = {id: record.state, name: utils.stateToString(record.state)};
        node.phrase = nodePhrase(record.state, record.phraseIndex, record.phraseLength);
        nodeOpcode(node, record.opcode);
      }else{
        node.down = false;
        node.state = {id: undefined, name: undefined};
        node.phrase = nodePhrase();
        nodeOpcode(node, undefined);
      }
      return node;
    }
    function nodeUp(node, record){
      if(record){
        node.up = true;
        node.state = {id: record.state, name: utils.stateToString(record.state)};
        node.phrase = nodePhrase(record.state, record.phraseIndex, record.phraseLength);
        if(!node.down){
          nodeOpcode(node, record.opcode);
        }
      }
    }
    function indent(n, offset){
      var ret = "";
      offset = (offset < 0) ? 0: offset;
      for(var i = 0; i < (n - offset); i += 1){
        ret += "  ";
      }
      return ret;
    }
    function display(node, offset, comma){
      var ret = '';
      var inset = indent(node.depth, offset) + '  ';
      var inset1 = inset + ' ';
      ret += inset + '{';
      ret += '\n';
      ret += inset1 + 'id: ' +node.id + ',';
      ret += '\n';
      ret += inset1 + 'branch: ' +node.branch + ',';
      ret += '\n';
      ret += inset1 + 'down: ' + node.down + ',';
      ret += '\n';
      ret += inset1 + 'up: ' + node.up + ',';
      ret += '\n';
      ret += inset1 + 'state: {id: '+node.state.id+', name: "'+node.state.name+'"},';
      ret += '\n';
      ret += inset1 + 'op: {id: '+node.op.id+', name: "'+node.op.name+'"},';
      ret += '\n';
      if(typeof(node.opData) === "string"){
        ret += inset1 + 'opData: "'+node.opData+'",';
      }else if(Array.isArray(node.opData)){
        ret += inset1 + 'opData: [';
        for(var i = 0; i < node.opData.length; i += 1){
          if(i > 0){
            ret += ','
          }
          ret += node.opData[i];
        }
        ret += '],'
      }else{
        ret += inset1 + 'opData: undefined,';
      }
      ret += '\n';
      ret += inset1 + 'phrase: '+node.phrase+',';
      ret += '\n';
      ret += inset1 + 'depth: ' + node.depth + ',';
      ret += '\n';
      if(node.children.length === 0){
        ret += inset1 + 'children: []';
      }else{
        ret += inset1 + 'children: [';
        ret += '\n';
        for(var i = 0; i < node.children.length; i += 1){
          var c = (i === (node.children.length -1)) ? false: true;
          ret += display(node.children[i], offset, c);
        }
        ret += inset1 + ']';
      }
      ret += '\n';
      ret += inset + '}';
      if(comma){
        ret += ',';
      }
      ret += '\n';
      return ret;
    }
    var nodeId = -1;
    var branch = [];
    var node, root, parent;
    var record, c;
    var first = true;
    root = nodeFactory(null, null, -1);
    node = root;
    branch.push(node);
    var index = 0;
    circular.forEach(function(lineIndex, index) {
      record = records[lineIndex];
      if(first){
        first = false;
        if(record.depth > 0){
          /* push some dummy nodes to fill in for missing records. */
          for( var i = 0; i < record.depth; i += 1){
            parent = node;
            node = nodeFactory(node, null, i);
            branch.push(node);
            if(parent){
              parent.children.push(node);
            }
//            if(node.parent){
//              node.parent.children.push(node);
//            }
          }
        }
      }
      
      if(!record.dirUp){
        /* handle the next record down */
        parent = node;
        node = nodeFactory(node, record, record.depth);
        branch.push(node);
        if(parent){
          parent.children.push(node);
        }
//        if(node.parent){
//          node.parent.children.push(node);
//        }
      }else{
        /* handle the next record up */
        node = branch.pop();
        if(node){
          nodeUp(node, record);
          node = (branch.length === 0) ? null : branch[branch.length -1];
//          node = node.parent;
        }
      }
    });
    if(branch.length > 0){
      /* walk it up to root node */
      while(branch.length > 0){
        node = branch.pop();
        nodeUp(node, null);
      }
    }
    /* find the tree root */
    // TBD: may need some boundary conditions for special cases
    var treeRoot = root;
    if(treeRoot.children.length === 0){
      throw new Error("trace.toTreeObject(): parse tree has no nodes")
    }
    treeRoot = treeRoot.children[0];
    if(treeRoot.down || treeRoot.up){
      /* the parse tree root is the grammar start rule node */
    }else{
      /* walk down to the first populated node, tree root is the psuedo node parent */
      var prev;
      while(treeRoot && !(treeRoot.down || treeRoot.up)){
        prev = treeRoot;
        treeRoot = treeRoot.children[0];
      }
      treeRoot = prev;
    }
    
    /* walk the final tree for max tree depth and number of leaf nodes */
    var treeDepth = 0;
    var leafNodes = 0;
    var depth = -1;
    var branchCount = 1;
    function walk(node){
      node.branch = branchCount;
      depth +=1;
      if(depth > treeDepth){
        treeDepth = depth;
      }
      if(node.children.length === 0){
        leafNodes += 1;
      }else{
        for(var i = 0; i < node.children.length; i += 1){
          if(i > 0){
            branchCount += 1;
          }
          walk(node.children[i]);
        }
      }
      depth -= 1;
    }
    walk(treeRoot);
    treeRoot.branch = 0;
    
    
    /* validate that current node is root node */
//    console.log("\nparse tree nodes:");
//    console.log("max records: " + circular.maxSize());
//    console.log("total records: " + circular.items());
//  console.log("temp root:");
//  console.log(display(root, root.depth, false));
//    console.log("\nfound root:");
//    console.log(display(treeRoot, treeRoot.depth, false));
//    return "trace.toTreeObject(): early exit";
    
    /* generate the exported string object*/
    var str = '';
    str += '// generated by apg-lib.trace.toTreeObject()';
    str += '\n';
    str += 'var treeJson = {';
    str += '\n';
    str += '  /* the input string character codes*/\n';
    str += '  string: [';
    for(var i = 0; i < chars.length; i += 1){
      str += (i > 0) ? ','+chars[i] : chars[i];
    }
    str += '],\n';
    /* generate the exported rule names */
    str += '\n';
    str += '  /* the grammar rule names */\n';
    str += '  rules: [';
    for(var i = 0; i < rules.length; i += 1){
      if(i > 0){
        str += ', ';
      }
      str += '"' + rules[i].name + '"';
    }
    str += '],\n';
    /* generate the exported UDT names*/
    str += '\n';
    str += '  /* the grammar UDT names */\n';
    str += '  udts: [';
    for(var i = 0; i < udts.length; i += 1){
      if(i > 0){
        str += ', ';
      }
      str += '"' + udts[i].name + '"';
    }
    str += '],\n';
    /* generate the ids */
    str += '\n';
    str += '  /* the trace record ids */\n';
    str += '  id: {';
    str += '\n';
    str += '      ALT: {id: '+id.ALT+', name: "ALT"},';
    str += '\n';
    str += '      CAT: {id: '+id.CAT+', name: "CAT"},';
    str += '\n';
    str += '      REP: {id: '+id.REP+', name: "REP"},';
    str += '\n';
    str += '      RNM: {id: '+id.RNM+', name: "RNM"},';
    str += '\n';
    str += '      TLS: {id: '+id.TLS+', name: "TLS"},';
    str += '\n';
    str += '      TBS: {id: '+id.TBS+', name: "TBS"},';
    str += '\n';
    str += '      TRG: {id: '+id.TRG+', name: "TRG"},';
    str += '\n';
    str += '      UDT: {id: '+id.UDT+', name: "UDT"},';
    str += '\n';
    str += '      AND: {id: '+id.AND+', name: "AND"},';
    str += '\n';
    str += '      NOT: {id: '+id.NOT+', name: "NOT"},';
    str += '\n';
    str += '      BKR: {id: '+id.BKR+', name: "BKR"},';
    str += '\n';
    str += '      BKA: {id: '+id.BKA+', name: "BKA"},';
    str += '\n';
    str += '      BKN: {id: '+id.BKN+', name: "BKN"},';
    str += '\n';
    str += '      ABG: {id: '+id.ABG+', name: "ABG"},';
    str += '\n';
    str += '      AEN: {id: '+id.AEN+', name: "AEN"},';
    str += '\n';
    str += '      ACTIVE: {id: '+id.ACTIVE+', name: "ACTIVE"},';
    str += '\n';
    str += '      MATCH: {id: '+id.MATCH+', name: "MATCH"},';
    str += '\n';
    str += '      EMPTY: {id: '+id.EMPTY+', name: "EMPTY"},';
    str += '\n';
    str += '      NOMATCH: {id: '+id.NOMATCH+', name: "NOMATCH"},';
    str += '\n';
    str += '  },\n';
    /* generate the max tree depth */
    str += '\n';
    str += '  /* the maximum tree depth */\n';
    str += '  treeDepth: ' + treeDepth + ',';
    str += '\n';
    /* generate the number of leaf nodes (branches) */
    str += '\n';
    str += '  /* the number of leaf nodes (branches) */\n';
    str += '  leafNodes: ' + leafNodes + ',';
    str += '\n';
    /* generate the exported tree object*/
    str += '\n';
    str += '  /* the traced parse tree object */\n';
    str += '  tree: \n';
    str += display(treeRoot, treeRoot.depth, false);
    str += '}';
    str += '\n';
    return str;
  }
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
    }
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
    var thisLine, thatLine, lookAhead, lookBehind, lookAround, anchor;
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
      if (mode === MODE_HEX || mode === MODE_UNICODE) {
        var hex = op.min.toString(16).toUpperCase();
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
      if (mode === MODE_HEX) {
        var hex = op.min.toString(16).toUpperCase();
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
      phrase = utils.charsToUnicode(chars, index, length);
      break;
    case MODE_ASCII:
    default:
    phrase = utils.charsToAsciiHtml(chars, index, length);
      break;
    }
    return phrase;
  }
}
