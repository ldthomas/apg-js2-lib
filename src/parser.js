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
  var charsFirst = 0;
  var charsLength = 0;
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
  var parentFrameMode = true;
  // Evaluates any given rule. This can be called from the syntax callback
  // functions to evaluate any rule in the grammar's rule list. Great caution
  // should be used. Use of this function will alter the language that the
  // parser accepts.
  var evaluateRule = function(ruleIndex, phraseIndex, result) {
    var functionName = thisFileName + "evaluateRule(): ";
    var length;
    if (ruleIndex >= rules.length) {
      throw new Error(functionsName + "rule index: " + ruleIndex + " out of range");
    }
    if ((phraseIndex >= charsLength)) {
      throw new Error(functionsName + "phrase index: " + phraseIndex + " out of range");
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
      throw new Error(functionsName + "udt index: " + udtIndex + " out of range");
    }
    if ((phraseIndex >= charsLength)) {
      throw new Error(functionsName + "phrase index: " + phraseIndex + " out of range");
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
  // Clears this object of any/all data that has been initialized or added to
  // it.
  // Called by `parse()` on initialization, allowing this object to be re-used
  // for multiple parsing calls.
  var clear = function() {
    startRule = 0;
    treeDepth = 0;
    maxTreeDepth = 0;
    nodeHits = 0;
    rules = null;
    udts = null;
    chars = null;
    maxMatched = 0;
    ruleCallbacks = null;
    udtCallbacks = null;
    syntaxData = null;
    opcodes = null;
  };
  var backrefInit = function() {
    var obj = {};
    rules.forEach(function(rule) {
      if (rule.isBkr) {
        obj[rule.lower] = null;
      }
    });
    if (udts.length > 0) {
      udt.forEach(function(rule) {
        if (rule.isBkr) {
          obj[rule.lower] = null;
        }
      });
    }
    return obj;
  }
  var resultInit = function() {
    return {
      state : id.ACTIVE,
      phraseLength : 0,
      success : false,
      backrefFrame : backrefInit(),
      lookAhead : 0,
      lookBehind : 0,
      evaluateRule : evaluateRule,
      evaluateUdt : evaluateUdt
    }
  }
  var resultCopy = function(result) {
    return {
      state : result.state,
      phraseLength : result.PhraseLength,
      success : result.success,
      backrefFrame : result.backrefFrame,
      lookAhead : result.lookAhead,
      lookBehind : result.lookBehind,
      evaluateRule : result.evaluateRule,
      evaluateUdt : result.evaluateUdt
    }
  }
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
      that.ast.init(rules, udts, chars, charsFirst, charsLength);
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
      that.trace.init(rules, udts, chars, charsFirst, charsLength);
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
  /* called by `parse()` to initialize the array of characters codes representing the input string */
  var initializeInputChars = function(input, beg, len) {
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
    if (typeof (beg) === "number") {
      beg = Math.floor(beg);
      if (beg < 0 || beg > chars.length) {
        throw Error(functionName + "beginning input character out of range: " + beg);
      }
      charsFirst = beg;
    }
    if (typeof (len) === "number") {
      len = Math.floor(len);
      if (len < 0) {
        charsLength = chars.length;
      } else if ((charsFirst + len) > chars.length) {
        throw Error(functionName + "last input character out of range: " + (charsFirst + len));
      } else {
        charsLength = charsFirst + len;
      }
    }
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
        throw new Error(functionName + "syntax callback '" + index + "' not a rule or udt name");
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
  // A limit is not normally needed, but can be used to protect against
  // a pathological grammar exceeding
  // the call stack depth.
  this.setMaxTreeDepth = function(depth) {
    if (typeof (depth) !== "number") {
      throw new Error("parser: max tree depth must be integer > 0: " + depth);
    }
    limitTreeDepth = Math.floor(depth);
    if (limitTreeDepth <= 0) {
      throw new Error("parser: max tree depth must be integer > 0: " + depth);
    }
  }
  // Set the maximum number of node hit (opcode function calls) allowed.
  // The default is `Infinity`.
  // A limit is not normally needed, but can be used to protect against
  // a runaway exponential or pathological grammar.
  this.setMaxNodeHits = function(depth) {
    if (typeof (depth) !== "number") {
      throw new Error("parser: max node hits must be integer > 0: " + depth);
    }
    limitNodeHits = Math.floor(depth);
    if (limitNodeHits <= 0) {
      throw new Error("parser: max node hits must be integer > 0: " + depth);
    }
  }
  // Set the back referencing mode.
  // ```
  // universalMode - true/false
  // ```
  // Universial mode means that the back reference to a rule name, say "A",
  // is a reference to the last match, regardless of where or which rule the match was made in.
  // False, or parent frame mode, means that the back reference to "A" is a reference to
  // the last match on the parent rule's parse tree node level.
  // e.g.
  // ```
  // S = A B \A
  // B = A "b" \A
  // A = "x" / "y"
  //```
  // In universal mode this would match `xybyy` but not `xybyx`.
  // That is \A refers to the last match regardless of where it occurs.
  // In parent frame mode, this would match `xybyx` but not `xybyy`.
  this.setUniversalMode = function(universalMode){
    parentFrameMode = (universalMode === false) ? true : false;
  }
  // This is the main function, called to parse an input string.
  // <ul>
  // <li>*grammar* - an instantiated grammar object - the output of `apg` for a
  // specific SABNF grammar</li>
  // <li>*startRule* - the rule name or rule index to be used as the root of the
  // parse tree.
  // This is usually the first rule, index = 0, of the grammar
  // but can be any rule defined in the above grammar object.</li>
  // <li>*inputChars* - an array of integer character codes representing the
  // input string to be parsed</li>
  // <li>*callbackData* - user-defined data object to be passed to the user's
  // callback functions.
  // This is not used by the parser in any way, merely passed on to the user.
  // May be `null` or omitted.</li>
  // </ul>
  this.parse = function(grammar, startRule, inputChars, callbackData) {
    clear();
    initializeInputChars(inputChars, 0, -1);
    return privateParse(grammar, startRule, callbackData);
  }
  // This form allows parsing of a sub-string of the full input string.
  // It treats inputChars[inputIndex] as the first character to match and
  // inputChars[inputIndex + inputLength - 1] as the last.
  this.parseSubstring = function(grammar, startRule, inputChars, inputIndex, inputLength, callbackData) {
    clear();
    initializeInputChars(inputChars, inputIndex, inputLength);
    return privateParse(grammar, startRule, callbackData);
  }
  var privateParse = function(grammar, startRule, callbackData) {
    var functionName, result;
    functionName = thisFileName + "parse(): ";
    // The `result` object is used to communicate parsing results and states
    // internally as well as
    // with the user's callback functions. Named `result` early on when only
    // parsing results
    // were being handled with it, it has since grown to include some additional
    // communication items.
    // - *state* - the state of the parser
    // (see the `identifiers` object in
    // [`apg-lib`](https://github.com/ldthomas/apg-js2-lib))
    // - *phraseLength* - the number of characters matched if the state is
    // `MATCHED` or `EMPTY`
    // - *evaluateRule* - a reference to this object's `evaluateRule()`
    // function. Can be called from a callback function
    // (use with extreme caution!)
    // - *evaluateUdt* - a reference to this object's `evaluateUdt()` function.
    // Can be called from a callback function
    // (use with extreme caution!)
    initializeGrammar(grammar);
    startRule = initializeStartRule(startRule);
    initializeCallbacks();
    initializeTrace();
    initializeStats();
    initializeAst();
    result = resultInit();
    if (!(callbackData === undefined || callbackData === null)) {
      syntaxData = callbackData;
    }
    /* create a dummy opcode for the start rule */
    opcodes = [ {
      type : id.RNM,
      index : startRule
    } ];
    /* execute the start rule */
    opExecute(0, charsFirst, result);
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
      if (result.phraseLength === (charsLength - charsFirst)) {
        result.success = true;
      } else {
        result.success = false;
      }
      break;
    }
    return {
      success : result.success,
      state : result.state,
      length : charsLength - charsFirst,
      matched : result.phraseLength,
      maxMatched : maxMatched - charsFirst,
      maxTreeDepth : maxTreeDepth,
      nodeHits : nodeHits
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
    catResult = resultCopy(result);
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
    } else {
      result.state = id.NOMATCH;
      result.phraseLength = 0;
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
    nextResult = resultCopy(result);
    nextCharIndex = phraseIndex;
    matchedCount = 0;
    matchedChars = 0;
    if (that.ast) {
      astLength = that.ast.getLength();
    }
    while (true) {
      if (nextCharIndex > charsLength) {
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
    /* evaluate the match count according to the min, max values */
    if (nextResult.state === id.EMPTY) {
      result.state = (matchedChars === 0) ? id.EMPTY : id.MATCH;
      result.phraseLength = matchedChars;
    } else if (matchedCount >= op.min) {
      result.state = (matchedChars === 0) ? id.EMPTY : id.MATCH;
      result.phraseLength = matchedChars;
    } else {
      result.state = id.NOMATCH;
      result.phraseLength = 0;
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
        throw new Error(thisFileName + "opRNM(" + rule.name + "): callback function return error. ACTIVE state not allowed.");
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
      throw new Error(thisFileName + "opRNM(" + rule.name + "): callback function return error. Unrecognized return state: "
          + result.state);
      break;
    }
  }
  // The `RNM` operator<br>
  // If there is no callback function defined for this rule and no `AST` object
  // defined
  // this operator will simply act as a root node for a sub-parse tree and
  // return the matched phrase to its parent.
  // However, its larger responsibility is calling the user's callback functions
  // and the collection of `AST` nodes.
  // Note that the `AST` is a separate object, but `RNM` calls its functions to
  // create its nodes.
  // See [`ast.js`](./ast.html) for usage.
  var opRNM = function(opIndex, phraseIndex, result) {
    var op, rule, callback, astLength, astDefined, downIndex, savedOpcodes;
    var frame, saveFrame;
    op = opcodes[opIndex];
    rule = rules[op.index];
    callback = ruleCallbacks[op.index];

    /* begin backrefs */
    if(parentFrameMode){
      saveFrame = result.backrefFrame;
      result.backrefFrame = backrefInit();
    }
    /* begin backrefs */

    /* begin AST - note: ignore AST in lookaround */
    astDefined = that.ast && that.ast.ruleDefined(op.index) && (result.lookAhead === 0) && (result.lookBehind === 0);
    if (astDefined) {
      astLength = that.ast.getLength();
      downIndex = that.ast.down(op.index, rules[op.index].name);
    }
    /* begin AST */

    if (callback === null) {
      /* no callback - just execute the rule */
      savedOpcodes = opcodes;
      opcodes = rule.opcodes;
      opExecute(0, phraseIndex, result);
      opcodes = savedOpcodes;
    } else {
      /* begin callback */
      callback(result, chars, phraseIndex, syntaxData);
      validateRnmCallbackResult(rule, result, true);
      /* begin callback */
      if (result.state === id.ACTIVE) {
        savedOpcodes = opcodes;
        opcodes = rule.opcodes;
        opExecute(0, phraseIndex, result);
        opcodes = savedOpcodes;
        /* end callback */
        callback(result, chars, phraseIndex, syntaxData);
        validateRnmCallbackResult(rule, result, false);
        /* end callback */
      }
      /* implied else clause: just accept the callback result - RNM acting as UDT */
    }
    /* end AST */
    if (astDefined) {
      if (result.state === id.NOMATCH) {
        that.ast.setLength(astLength);
      } else {
        that.ast.up(op.index, rules[op.index].name, phraseIndex, result.phraseLength);
      }
    }
    /* end AST */

    /* end backref */
    if(parentFrameMode){
      result.backrefFrame = saveFrame;
    }
    if (rules[op.index].isBkr && (result.state === id.MATCH || result.state === id.EMPTY)) {
      result.backrefFrame[rules[op.index].lower] = {
        phraseIndex : phraseIndex,
        phraseLength : result.phraseLength
      }
    }
    /* end backref */
  };
  // Validate the callback function's return result.
  // It's the user's responsibility to get it right
  // but it is `UDT`'s responsibility to fail if the user doesn't.
  var validateUdtCallbackResult = function(udt, result) {
    switch (result.state) {
    case id.ACTIVE:
      throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. ACTIVE state not allowed.");
      break;
    case id.EMPTY:
      if (udt.empty === false) {
        throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. May not return EMPTY.");
      } else {
        result.phraseLength = 0;
      }
      break;
    case id.MATCH:
      if (result.phraseLength === 0) {
        if (udt.empty === false) {
          throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. May not return EMPTY.");
        } else {
          result.state = id.EMPTY;
        }
      }
      break;
    case id.NOMATCH:
      break;
    default:
      throw new Error(thisFileName + "opUDT(" + udt.name + "): callback function return error. Unrecognized return state: "
          + result.state);
      break;
    }
  }
  // The `UDT` operator<br>
  // Simply calls the user's callback function, but operates like `RNM` with
  // regard to the `AST`.
  // There is some ambiguity here. `UDT`s act as terminals for phrase
  // recognition but as named rules
  // for `AST` nodes.
  // See [`ast.js`](./ast.html) for usage.
  var opUDT = function(opIndex, phraseIndex, result) {
    var downIndex, astLength, astIndex, op, udt, astDefined;
    op = opcodes[opIndex];
    /* begin AST */
    astDefined = that.ast && that.ast.udtDefined(op.index) && (result.lookAhead === 0) && (result.lookBehind === 0);
    if (astDefined) {
      astIndex = rules.length + op.index;
      astLength = that.ast.getLength();
      downIndex = that.ast.down(astIndex, udts[op.index].name);
    }
    /* begin AST */

    /* UDT */
    udtCallbacks[op.index](result, chars, phraseIndex, syntaxData);
    validateUdtCallbackResult(udts[op.index], result);
    /* UDT */

    /* end AST */
    if (astDefined) {
      if (result.state === id.NOMATCH) {
        that.ast.setLength(astLength);
      } else {
        that.ast.up(astIndex, udts[op.index].name, phraseIndex, result.phraseLength);
      }
    }
    /* end AST */

    /* back reference */
    if (udts[op.index - rules.length].isBkr && (result.state === id.MATCH || result.state === id.EMPTY)) {
      result.backrefFrame[udts[op.index - rules.length].lower] = {
        phraseIndex : phraseIndex,
        phraseLength : result.phraseLength
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
    prdResult = resultCopy(result);
    prdResult.lookAhead += 1;
    opExecute(opIndex + 1, phraseIndex, prdResult);
    prdResult.lookAhead -= 1;
    switch (prdResult.state) {
    case id.EMPTY:
      result.state = id.EMPTY;
      result.phraseLength = 0;
      break;
    case id.MATCH:
      result.state = id.EMPTY;
      result.phraseLength = 0;
      break;
    case id.NOMATCH:
      result.state = id.NOMATCH;
      result.phraseLength = 0;
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
    prdResult = resultCopy(result);
    prdResult.lookAhead += 1;
    opExecute(opIndex + 1, phraseIndex, prdResult);
    prdResult.lookAhead -= 1;
    result.phraseLength = prdResult.phraseLength;
    switch (prdResult.state) {
    case id.EMPTY:
    case id.MATCH:
      result.state = id.NOMATCH;
      result.phraseLength = 0;
      break;
    case id.NOMATCH:
      result.state = id.EMPTY;
      result.phraseLength = 0;
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
    if (phraseIndex < charsLength) {
      if (op.min <= chars[phraseIndex] && chars[phraseIndex] <= op.max) {
        result.state = id.MATCH;
        result.phraseLength = 1;
      }
    }
  };
  // The `TBS` operator<br>
  // Matches its pre-defined phrase against the input string.
  // All characters must match exactly.
  // Case-sensitive literal strings (`'string'`) are translated to `TBS`
  // operators
  // by `apg`.
  // Phrase length of zero is not allowed.
  // Empty phrases can only be defined with `TLS` operators.
  var opTBS = function(opIndex, phraseIndex, result) {
    var i, op, len;
    op = opcodes[opIndex];
    result.state = id.NOMATCH;
    result.phraseLength = 0;
    len = op.string.length;
    if ((phraseIndex + len) <= charsLength) {
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
    len = op.string.length;
    if (len === 0) {
      result.state = id.EMPTY;
    } else if ((phraseIndex + len) <= charsLength) {
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
  // The `BKR` operator<br>
  // Matches the last matched phrase of the named rule or UDT against the input string.
  // For ASCII alphbetical characters the match may be case sensitive or insensitive,
  // depending on the back reference definition.
  var opBKR = function(opIndex, phraseIndex, result) {
    var i, code, len, op, lmIndex, lmcode, lower;
    op = opcodes[opIndex];
    result.state = id.NOMATCH;
    result.phraseLength = 0;
    if (op.index < rules.length) {
      lower = rules[op.index].lower;
    } else {
      lower = udts[op.index - rules.length].lower;
    }
    if(result.backrefFrame[lower] === null){
      return;
    }
    lmIndex = result.backrefFrame[lower].phraseIndex;
    len = result.backrefFrame[lower].phraseLength;
    if (len === 0) {
      result.state = id.EMPTY;
    } else if ((phraseIndex + len) <= charsLength) {
      if (op.insensitive) {
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
            break;
          }
          result.phraseLength += 1;
        }
      } else {
        /* case-sensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[phraseIndex + i];
          lmcode = chars[lmIndex + i];
          if (code !== lmcode) {
            break;
          }
          result.phraseLength += 1;
        }
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
  // See [`trace.js`](./trace.html) and [`stats.js`](./stats.html) for their
  // usage.
  var opExecute = function(opIndex, phraseIndex, result) {
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
    result.state = id.ACTIVE;
    result.phraseLength = 0;
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
    case id.BKR:
      opBKR(opIndex, phraseIndex, result);
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
