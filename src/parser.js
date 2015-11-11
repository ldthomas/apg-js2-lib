// This is the primary object of `apg-lib`. Calling its `parse()` member function 
// walks the parse tree of opcodes, matching phrases from the input string as it goes.
// The working code for all of the operators, `ALT`, `CAT`, etc. is in this module.
/*
 * COPYRIGHT: Copyright (c) 2015 Lowell D. Thomas, all rights reserved
 *   LICENSE: BSD-3-Clause
 *    AUTHOR: Lowell D. Thomas
 *     EMAIL: lowell@coasttocoastresearch.com
 *   WEBSITE: http://coasttocoastresearch.com/
 */
module.exports = function() {
  "use strict";
  var thisFileName = "parser.js: "
  var that = this;
  var id = require("./identifiers.js");
  this.ast = null;
  this.stats = null;
  this.trace = null;
  this.callbacks = [];
  var startRule = 0;
  var opcodes = null;
  var chars = null;
  var treeDepth = 0;
  var spDepth = 0; /* syntactic predicate depth */
  var ruleCallbacks = null;
  var udtCallbacks = null;
  var rules = null;
  var udts = null;
  var syntaxData = null;
  var maxMatched = 0;

  // Evaluates any given rule. This can be called from the syntax callback
  // functions to evaluate any rule in the grammar's rule list. Great caution
  // should be used. Use of this function will alter the language that the
  // parser accepts.
  var evaluateRule = function(ruleIndex, phraseIndex, result) {
    var functionName = thisFileName + "evaluateRule(): ";
    var length;
    if (ruleIndex >= rules.length) {
      throw new Error(functionsName + "rule index: " + ruleIndex
          + " out of range");
    }
    if ((phraseIndex >= chars.length)) {
      throw new Error(functionsName + "phrase index: " + phraseIndex
          + " out of range");
    }
    length = opcodes.length;
    opcodes.push({
      type : id.RNM,
      index : ruleIndex
    });
    opExecute(length, phraseIndex, result);
    opcodes.pop();
  };
  // Evaluates any given UDT. This can be called from the syntax callback
  // functions to evaluate any UDT in the grammar's UDT list. Great caution
  // should be used. Use of this function will alter the language that the
  // parser accepts.
  var evaluateUdt = function(udtIndex, phraseIndex, result) {
    var functionName = thisFileName + "evaluateUdt(): ";
    var length;
    if (udtIndex >= udts.length) {
      throw new Error(functionsName + "udt index: " + udtIndex
          + " out of range");
    }
    if ((phraseIndex >= chars.length)) {
      throw new Error(functionsName + "phrase index: " + phraseIndex
          + " out of range");
    }
    length = opcodes.length;
    opcodes.push({
      type : id.UDT,
      empty : udts[udtIndex].empty,
      index : udtIndex
    });
    opExecute(length, phraseIndex, result);
    opcodes.pop();
  };
  // Clears this object of any/all data that has been initialized or added to it.
  // Called by `parse()` on initialization, allowing this object to be re-used
  // for multiple parsing calls.
  var clear = function() {
    startRule = 0;
    treeDepth = 0;
    spDepth = 0;
    rules = null;
    udts = null;
    chars = null;
    maxMatched = 0;
    ruleCallbacks = null;
    udtCallbacks = null;
    syntaxData = null;
    opcodes = null;
  };
  /* called by `parse()` to initialize the AST object, if one has been defined */
  var initializeAst = function() {
    var functionName = thisFileName + "initializeAst(): ";
    while (true) {
      if (that.ast === undefined) {
        that.ast = null;
        break;
      }
      if (that.ast === null) {
        break;
      }
      if (that.ast.astObject !== "astObject") {
        throw new Error(functionName + "ast object not recognized");
      }
      break;
    }
    if (that.ast !== null) {
      that.ast.init(rules, udts, chars);
    }
  }
  /* called by `parse()` to initialize the trace object, if one has been defined */
  var initializeTrace = function() {
    var functionName = thisFileName + "initializeTrace(): ";
    while (true) {
      if (that.trace === undefined) {
        that.trace = null;
        break;
      }
      if (that.trace === null) {
        break;
      }
      if (that.trace.traceObject !== "traceObject") {
        throw new Error(functionName + "trace object not recognized");
      }
      break;
    }
    if (that.trace !== null) {
      that.trace.init(rules, udts, chars);
    }

  }
  /* called by `parse()` to initialize the statistics object, if one has been defined */
  var initializeStats = function() {
    var functionName = thisFileName + "initializeStats(): ";
    while (true) {
      if (that.stats === undefined) {
        that.stats = null;
        break;
      }
      if (that.stats === null) {
        break;
      }
      if (that.stats.statsObject !== "statsObject") {
        throw new Error(functionName + "stats object not recognized");
      }
      break;
    }
    if (that.stats !== null) {
      that.stats.init(rules, udts);
    }
  }
  /* called by `parse()` to initialize the rules & udts from the grammar object */
  /* (the grammar object generated previously by `apg`) */
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
  /* called by `parse()` to initialize the start rule */
  var initializeStartRule = function(startRule) {
    var functionName = thisFileName + "initializeStartRule(): ";
    var start = null;
    if (typeof (startRule) === "number") {
      if (startRule >= rules.length) {
        throw new Error(functionName + "start rule index too large: max: "
            + rules.length + ": index: " + startRule);
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
        throw new Error(functionName + "start rule name '" + startRule
            + "' not recognized");
      }
    } else {
      throw new Error(functionName + "type of start rule '"
          + typeof (startRule) + "' not recognized");
    }
    return start;
  }
  /* called by `parse()` to initialize the array of characters codes representing the input string */
  var initializeInputChars = function(input) {
    var functionName = thisFileName + "initializeInputChars(): ";
    if (input === undefined) {
      throw new Error(functionName + "input string is undefined");
    }
    if (input === null) {
      throw new Error(functionName + "input string is null");
    }
    if (!Array.isArray(input)) {
      throw new Error(functionName + "input string is not an array");
    }
    if (input.length > 0) {
      if (typeof (input[0]) !== "number") {
        throw new Error(functionName + "input string not an array of integers");
      }
    }
    chars = input;
  }
   /* called by `parse()` to initialize the user-written, syntax callback functions, if any */
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
    for ( var index in that.callbacks) {
      i = list.indexOf(index);
      if (i < 0) {
        throw new Error(functionName + "syntax callback '" + index
            + "' not a rule or udt name");
      }
      func = that.callbacks[index];
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
        throw new Error(functionName + "syntax callback[" + index
            + "] must be function reference or 'false'");
      }
    }
    /* make sure all udts have been defined - the parser can't work without them */
    for (i = 0; i < udts.length; i += 1) {
      if (udtCallbacks[i] === null) {
        throw new Error(functionName
            + "all UDT callbacks must be defined. UDT callback["
            + udts[i].lower + "] not a function reference");
      }
    }
  }
  // This is the main function, called to parse an input string.
  // <ul>
  // <li>*grammar* - an instantiated grammar object - the output of `apg` for a specific SABNF grammar</li>
  // <li>*startRule* - the rule name or rule index to be used as the root of the parse tree.
  // This is usually the first rule, index = 0, of the grammar
  // but can be any rule defined in the above grammar object.</li>
  // <li>*inputChars* - an array of integer character codes representing the input string to be parsed</li>
  // <li>*callbackData* - user-defined data object to be passed to the user's callback functions.
  //  This is not used by the parser in any way, merely passed on to the user. May be `null` or omitted.</li>
  // </ul>
  this.parse = function(grammar, startRule, inputChars, callbackData) {
    var functionName, result;
    functionName = thisFileName + "parse(): ";
    result = {
      state : id.ACTIVE,
      phraseLength : 0,
      lostChars : 0,
      success : false,
      evaluateRule : evaluateRule,
      evaluateUdt : evaluateUdt
    };
    /* clear the parser and initialize all of the components */
    clear();
    initializeGrammar(grammar);
    startRule = initializeStartRule(startRule);
    initializeInputChars(inputChars);
    initializeCallbacks();
    initializeTrace();
    initializeStats();
    initializeAst();
    if (!(callbackData === undefined || callbackData === null)) {
      syntaxData = callbackData;
    }
    /* create a dummy opcode for the start rule */
    opcodes = [ {
      type : id.RNM,
      index : startRule
    } ];
    /* execute the start rule */
    opExecute(0, 0, result);
    opcodes = null;
    /* test and return the result */
    switch (result.state) {
    case id.ACTIVE:
      throw new Error(functionName + "final state should never be 'ACTIVE'");
      break;
    case id.NOMATCH:
      result.success = false;
      break;
    case id.EMPTY:
    case id.MATCH:
      if (result.phraseLength === chars.length) {
        result.success = true;
      } else {
        result.success = false;
      }
      break;
    }
    return {
      success : result.success,
      state : result.state,
      length : chars.length,
      matched : maxMatched
    };
  };

  // The `ALT` operator<br>
  // Executes its child nodes, from left to right, until it finds a match.
  // Fails if *all* of its child nodes fail.
  var opALT = function(opIndex, phraseIndex, result) {
    var op = opcodes[opIndex];
    for (var i = 0; i < op.children.length; i += 1) {
      opExecute(op.children[i], phraseIndex, result);
      if (result.state !== id.NOMATCH) {
        break;
      }
    }
  };
  // The `CAT` operator<br>
  // Executes all of its child nodes, from left to right,
  // concatenating the matched phrases.
  // Fails if *any* child nodes fail.
  var opCAT = function(opIndex, phraseIndex, result) {
    var op, success, astLength, catResult, catCharIndex, catMatched, childOpIndex, matchedChildren;
    op = opcodes[opIndex];
    if (that.ast) {
      astLength = that.ast.getLength();
    }
    catResult = {
      state : id.ACTIVE,
      phraseLength : 0,
      lostChars : 0,
      success : false,
      evaluateRule : result.evaluateRule,
      evaluateUdt : result.evaluateUdt
    };
    success = true;
    catCharIndex = phraseIndex;
    catMatched = 0;
    matchedChildren = 0;
    for (var i = 0; i < op.children.length; i += 1) {
      opExecute(op.children[i], catCharIndex, catResult);
      catCharIndex += catResult.phraseLength;
      catMatched += catResult.phraseLength;
      if (catResult.state === id.NOMATCH) {
        success = false;
        break;
      }
      matchedChildren += 1;
    }
    if (success) {
      result.state = catMatched === 0 ? id.EMPTY : id.MATCH;
      result.phraseLength = catMatched;
      result.lostChars = 0;
    } else {
      result.state = id.NOMATCH;
      result.phraseLength = 0;
      result.lostChars = catMatched;
    }
    if (that.ast && result.state === id.NOMATCH) {
      that.ast.setLength(astLength);
    }
  };
  // The `REP` operator<br>
  // Repeatedly executes its single child node,
  // concatenating each of the matched phrases found.
  // The number of repetitions executed and its final result depends
  // on its min & max repetition values.
  var opREP = function(opIndex, phraseIndex, result) {
    var nextResult, nextCharIndex, matchedCount, matchedChars, op, astLength;
    op = opcodes[opIndex];
    nextResult = {
      state : id.ACTIVE,
      phraseLength : 0,
      lostChars : 0,
      success : false,
      evaluateRule : result.evaluateRule,
      evaluateUdt : result.evaluateUdt
    };
    nextCharIndex = phraseIndex;
    matchedCount = 0;
    matchedChars = 0;
    if (that.ast) {
      astLength = that.ast.getLength();
    }
    while (true) {
      if (nextCharIndex > chars.length) {
        /* exit on end of input string */
        break;
      }
      opExecute(opIndex + 1, nextCharIndex, nextResult);
      if (nextResult.state === id.NOMATCH) {
        /* always end if the child node fails */
        break;
      }
      if (nextResult.state === id.EMPTY) {
        /* REP always succeeds when the child node returns an empty phrase */
        /* this may not seem obvious, but that's the way it works out */
        break;
      }
      matchedCount += 1;
      matchedChars += nextResult.phraseLength;
      nextCharIndex += nextResult.phraseLength;
      if (matchedCount === op.max) {
        /* end on maxed out reps */
        break;
      }
    }
    /* evaluate the match count according to the min, max values*/
    if (nextResult.state === id.EMPTY) {
      result.state = (matchedChars === 0) ? id.EMPTY : id.MATCH;
      result.phraseLength = matchedChars;
      result.lostChars = 0;
    } else if (matchedCount >= op.min) {
      result.state = (matchedChars === 0) ? id.EMPTY : id.MATCH;
      result.phraseLength = matchedChars;
      result.lostChars = 0;
    } else {
      result.state = id.NOMATCH;
      result.phraseLength = 0;
      result.lostChars = matchedChars;
    }
    if (that.ast && result.state === id.NOMATCH) {
      that.ast.setLength(astLength);
    }
  };
  // Validate the callback function's return result.
  // It's the user's responsibility to get it right
  // but it is `RNM`'s responsibility to fail if the user doesn't.
  var validateRnmCallbackResult = function(rule, result, down) {
    switch (result.state) {
    case id.ACTIVE:
      if (down === true) {
        result.phraseLength = 0;
      } else {
        throw new Error(thisFileName + "opRNM(" + rule.name
            + "): callback function return error. ACTIVE state not allowed.");
      }
      break;
    case id.EMPTY:
      result.phraseLength = 0;
      break;
    case id.MATCH:
      if (result.phraseLength === 0) {
        result.state = id.EMPTY;
      }
      break;
    case id.NOMATCH:
      break;
    default:
      throw new Error(thisFileName + "opRNM(" + rule.name
          + "): callback function return error. Unrecognized return state: "
          + result.state);
      break;
    }
  }
  // The `RNM` operator<br>
  // If there is no callback function defined for this rule and no `AST` object defined
  // this operator will simply act as a root node for a sub-parse tree and
  // return the matched phrase to its parent.
  // However, its larger responsibility is calling the user's callback functions
  // and the collection of `AST` nodes.
  // Note that the `AST` is a separate object, but `RNM` calls its functions to create its nodes.
  // See [`ast.js`](./ast.html) for usage.
  var opRNM = function(opIndex, phraseIndex, result) {
    var savedOpcodes, downIndex, op, rule, astLength, astDefined;
    op = opcodes[opIndex];
    /* AST node creation only if an AST object is defined,
       and an AST node for this rule is defined.
       Note also that AST node creation is supressed when parsing a syntactic predicate
       since in that case the nodes are guaranteed to be removed by backtracking */
    astDefined = that.ast && (spDepth === 0) && that.ast.ruleDefined(op.index);
    if (astDefined) {
      astLength = that.ast.getLength();
      downIndex = that.ast.down(op.index, rules[op.index].name);
    }
    var callback = ruleCallbacks[op.index];
    var rule = rules[op.index];
    if (callback === null) {
      /* no callback - just execute the rule */
      savedOpcodes = opcodes;
      opcodes = rule.opcodes;
      opExecute(0, phraseIndex, result);
      opcodes = savedOpcodes;
    } else {
      /* syntax callback function defined: downward function execution */
      callback(result, chars, phraseIndex, syntaxData);
      validateRnmCallbackResult(rule, result, true);
      if (result.state === id.ACTIVE) {
        savedOpcodes = opcodes;
        opcodes = rule.opcodes;
        opExecute(0, phraseIndex, result);
        opcodes = savedOpcodes;
        /* syntax callback function defined: upward function execution */
        callback(result, chars, phraseIndex, syntaxData);
        validateRnmCallbackResult(rule, result, false);
      }
      /* implied else clause: just accept the callback result - RNM acting as UDT */
    }
    if (astDefined) {
      if (result.state === id.NOMATCH) {
        that.ast.setLength(astLength);
      } else {
        that.ast.up(op.index, rules[op.index].name, phraseIndex,
            result.phraseLength);
      }
    }
  };
  // Validate the callback function's return result.
  // It's the user's responsibility to get it right
  // but it is `UDT`'s responsibility to fail if the user doesn't.
  var validateUdtCallbackResult = function(udt, result) {
    switch (result.state) {
    case id.ACTIVE:
      throw new Error(thisFileName + "opUDT(" + udt.name
          + "): callback function return error. ACTIVE state not allowed.");
      break;
    case id.EMPTY:
      if (udt.empty === false) {
        throw new Error(thisFileName + "opUDT(" + udt.name
            + "): callback function return error. May not return EMPTY.");
      } else {
        result.phraseLength = 0;
      }
      break;
    case id.MATCH:
      if (result.phraseLength === 0) {
        if (udt.empty === false) {
          throw new Error(thisFileName + "opUDT(" + udt.name
              + "): callback function return error. May not return EMPTY.");
        } else {
          result.state = id.EMPTY;
        }
      }
      break;
    case id.NOMATCH:
      break;
    default:
      throw new Error(thisFileName + "opUDT(" + udt.name
          + "): callback function return error. Unrecognized return state: "
          + result.state);
      break;
    }
  }
  // The `UDT` operator<br>
  // Simply calls the user's callback function, but operates like `RNM` with regard to the `AST`.
  // There is some ambiguity here. `UDT`s act as terminals for phrase recognition but as named rules
  // for `AST` nodes.
  // See [`ast.js`](./ast.html) for usage.
  var opUDT = function(opIndex, phraseIndex, result) {
    var downIndex, astLength, astIndex, op, udt, astDefined;
    op = opcodes[opIndex];
    astDefined = that.ast && (spDepth === 0) && that.ast.udtDefined(op.index);
    if (astDefined) {
      astIndex = rules.length + op.index;
      astLength = that.ast.getLength();
      downIndex = that.ast.down(astIndex, udts[op.index].name);
    }
    /* call the user's callback function */
    udtCallbacks[op.index](result, chars, phraseIndex, syntaxData);
    validateUdtCallbackResult(udts[op.index], result);
    if (astDefined) {
      if (result.state === id.NOMATCH) {
        that.ast.setLength(astLength);
      } else {
        that.ast.up(astIndex, udts[op.index].name, phraseIndex,
            result.phraseLength);
      }
    }
  };
  // The `AND` syntactic predicate operator<br>
  // Executes its single child node, returning a matched empty phrase
  // if the child node succeeds. Fails if the child node fails.
  // *Always* backtracks on any matched phrase and returns empty on success.
  var opAND = function(opIndex, phraseIndex, result) {
    var op, prdResult;
    op = opcodes[opIndex];
    prdResult = {
      state : id.ACTIVE,
      phraseLength : 0,
      lostChars : 0,
      success : false
    };
    spDepth += 1;
    opExecute(opIndex + 1, phraseIndex, prdResult);
    spDepth -= 1;
    switch (prdResult.state) {
    case id.EMPTY:
      result.state = id.EMPTY;
      result.phraseLength = 0;
      result.lostChars = 0;
      break;
    case id.MATCH:
      result.state = id.EMPTY;
      result.phraseLength = 0;
      result.lostChars = prdResult.phraseLength;
      break;
    case id.NOMATCH:
      result.state = id.NOMATCH;
      result.phraseLength = 0;
      result.lostChars = 0;
      break;
    default:
      throw [ 'opAND: invalid state ' + prdResult.state ];
    }
  };
  // The `NOT` syntactic predicate operator<br>
  // Executes its single child node, returning a matched empty phrase
  // if the child node *fails*. Fails if the child node succeeds.
  // *Always* backtracks on any matched phrase and returns empty
  // on success (failure of its child node).
  var opNOT = function(opIndex, phraseIndex, result) {
    var op, prdResult;
    op = opcodes[opIndex];
    prdResult = {
      state : id.ACTIVE,
      phraseLength : 0,
      lostChars : 0,
      success : false
    };
    spDepth += 1;
    opExecute(opIndex + 1, phraseIndex, prdResult);
    spDepth -= 1;
    result.phraseLength = prdResult.phraseLength;
    switch (prdResult.state) {
    case id.EMPTY:
    case id.MATCH:
      result.state = id.NOMATCH;
      result.phraseLength = 0;
      result.lostChars = prdResult.phraseLength;
      break;
    case id.NOMATCH:
      result.state = id.EMPTY;
      result.phraseLength = 0;
      result.lostChars = 0;
      break;
    default:
      throw [ 'opNOT: invalid state ' + prdResult.state ];
    }
  };
  // The `TRG` operator<br>
  // Succeeds if the single first character of the phrase is
  // within the `min - max` range.
  var opTRG = function(opIndex, phraseIndex, result) {
    var op = opcodes[opIndex];
    result.state = id.NOMATCH;
    result.phraseLength = 0;
    result.lostChars = 0;
    if (phraseIndex < chars.length) {
      if (op.min <= chars[phraseIndex] && chars[phraseIndex] <= op.max) {
        result.state = id.MATCH;
        result.phraseLength = 1;
      }
    }
  };
  // The `TBS` operator<br>
  // Matches its pre-defined phrase against the input string.
  // All characters must match exactly.
  // Case-sensitive literal strings (`'string'`) are translated to `TBS` operators
  // by `apg`.
  // Phrase length of zero is not allowed.
  // Empty phrases can only be defined with `TLS` operators.
  var opTBS = function(opIndex, phraseIndex, result) {
    var i, op, len;
    op = opcodes[opIndex];
    result.state = id.NOMATCH;
    result.phraseLength = 0;
    result.lostChars = 0;
    len = op.string.length;
    if ((phraseIndex + len) <= chars.length) {
      for (i = 0; i < len; i += 1) {
        if (chars[phraseIndex + i] !== op.string[i]) {
          break;
        }
        result.phraseLength += 1;
      }
      if (result.phraseLength === len) {
        result.state = id.MATCH;
      }
    }
  };
  // The `TLS` operator<br>
  // Matches its pre-defined phrase against the input string.
  // A case-insensitive match is attempted for ASCII alphbetical characters.
  // `TLS` is the only operator that explicitly allows empty phrases.
  // `apg` will fail for empty `TBS`, case-sensitive strings (`''`) or
  // zero repetitions (`0*0RuleName` or `0RuleName`).
  var opTLS = function(opIndex, phraseIndex, result) {
    var i, code, len, op;
    op = opcodes[opIndex];
    result.state = id.NOMATCH;
    result.phraseLength = 0;
    result.lostChars = 0;
    len = op.string.length;
    if (len === 0) {
      result.state = id.EMPTY;
    } else if ((phraseIndex + len) <= chars.length) {
      for (i = 0; i < len; i += 1) {
        code = chars[phraseIndex + i];
        if (code >= 65 && code <= 90) {
          code += 32;
        }
        if (code !== op.string[i]) {
          break;
        }
        result.phraseLength += 1;
      }
      if (result.phraseLength === len) {
        result.state = id.MATCH;
      }
    }
  };
  // Generalized execution function.<br>
  // Having a single, generalized function, allows a single location
  // for tracing and statistics gathering functions to be called.
  // Tracing and statistics are handled in separate objects.
  // However, the parser calls their API to build the object data records.
  // See [`trace.js`](./trace.html) and [`stats.js`](./stats.html) for their usage.
  var opExecute = function(opIndex, phraseIndex, result) {
    var op, ret = true;
    op = opcodes[opIndex];
    treeDepth += 1;
    result.state = id.ACTIVE;
    result.phraseLength = 0;
    result.lostChars = 0;
    result.success = false;
    if (that.trace !== null) {
      /* collect the trace record for down the parse tree */
      that.trace.down(op, result.state, phraseIndex, result.phraseLength);
    }
    switch (op.type) {
    case id.ALT:
      opALT(opIndex, phraseIndex, result);
      break;
    case id.CAT:
      opCAT(opIndex, phraseIndex, result);
      break;
    case id.RNM:
      opRNM(opIndex, phraseIndex, result);
      break;
    case id.UDT:
      opUDT(opIndex, phraseIndex, result);
      break;
    case id.REP:
      opREP(opIndex, phraseIndex, result);
      break;
    case id.AND:
      opAND(opIndex, phraseIndex, result);
      break;
    case id.NOT:
      opNOT(opIndex, phraseIndex, result);
      break;
    case id.TRG:
      opTRG(opIndex, phraseIndex, result);
      break;
    case id.TBS:
      opTBS(opIndex, phraseIndex, result);
      break;
    case id.TLS:
      opTLS(opIndex, phraseIndex, result);
      break;
    default:
      ret = false;
      break;
    }
    if (phraseIndex + result.phraseLength > maxMatched) {
      maxMatched = phraseIndex + result.phraseLength;
    }
    if (that.stats !== null) {
      /* collect the statistics */
      that.stats.collect(op, result);
    }
    if (that.trace !== null) {
      /* collect the trace record for up the parse tree */
      that.trace.up(op, result.state, phraseIndex, result.phraseLength);
    }
    treeDepth -= 1;
    return ret;
  };
}
