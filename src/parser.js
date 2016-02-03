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
  var parentFrameMode = true;
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
  /* Called by `parse()` on initialization, allowing this object to be re-used for multiple parsing calls. */
  var clear = function() {
    startRule = 0;
    treeDepth = 0;
    maxTreeDepth = 0;
    nodeHits = 0;
    maxMatched = 0;
    lookAround = [{lookAround : id.LOOKAROUND_NONE, anchor : 0, charsEnd : 0, charsLength : 0}];
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
  // Called to create and initialize a back reference object.
  // Holds the matched phrases for rules and UDTs that have back references in the grammar.
  var backrefInit = function() {
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
    return obj;
  }
  // The system data structure that relays system information to and from the rule and UDT callback functions.
  // - *state* - the state of the parser (see the `identifiers` object in
  // [`apg-lib`](https://github.com/ldthomas/apg-js2-lib))
  // - *phraseLength* - the number of characters matched if the state is `MATCHED` or `EMPTY`
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
    this.lookAround = lookAround[lookAround.length -1];
    this.uFrame = backrefInit();
    this.pFrame = backrefInit();
    this.evaluateRule = evaluateRule;
    this.evaluateUdt = evaluateUdt;
    /* refresh the parser state for the next operation */
    this.refresh = function(){
      _this.state = id.ACTIVE;
      _this.phraseLength = 0;
      _this.lookAround = lookAround[lookAround.length -1];
    }
  }
  /* some around helper functions */
  var lookAroundValue = function() {
    return lookAround[lookAround.length - 1];
  }
  var inLookAround = function() {
    return (lookAround.length > 1);
  }
  var inLookBehind = function() {
    return lookAround[lookAround.length - 1].lookAround === id.LOOKAROUND_BEHIND ? true : false;
  }
  /* called by `parse()` to initialize the AST object, if one has been defined */
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
  /* called by `parse()` to initialize the trace object, if one has been defined */
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
  /* called by `parse()` to initialize the statistics object, if one has been defined */
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
    }else{
      beg = Math.floor(beg);
      if (beg < 0 || beg >= input.length) {
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
  // A limit is not normally needed, but can be used to protect against a pathological grammar exceeding
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
  // It treats `inputChars[inputIndex]` as the first character to match and
  // `inputChars[inputIndex + inputLength - 1]` as the last.
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

  // The `ALT` operator<br>
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
  // The `CAT` operator<br>
  // Executes all of its child nodes, from left to right,
  // concatenating the matched phrases.
  // Fails if *any* child nodes fail.
  var opCAT = function(opIndex, phraseIndex, sysData) {
    var op, success, astLength, catCharIndex, catPhrase;
    op = opcodes[opIndex];
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
      }else{
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
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  };
  // The `REP` operator<br>
  // Repeatedly executes its single child node,
  // concatenating each of the matched phrases found.
  // The number of repetitions executed and its final sysData depends
  // on its min & max repetition values.
  var opREP = function(opIndex, phraseIndex, sysData) {
    var op, astLength, repCharIndex, repPhrase, repCount;
    op = opcodes[opIndex];
    repCharIndex = phraseIndex;
    repPhrase = 0;
    repCount = 0;
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
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  };
  // Validate the callback function's return sysData.
  // It's the user's responsibility to get it right
  // but it is `RNM`'s responsibility to fail if the user doesn't.
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
  var opRNM = function(opIndex, phraseIndex, sysData) {
    var op, rule, callback, astLength, astDefined, downIndex, savedOpcodes;
    var frame, saveFrame;
    op = opcodes[opIndex];
    rule = rules[op.index];
    callback = ruleCallbacks[op.index];
    /* begin backrefs */
    saveFrame = sysData.pFrame;
    sysData.pFrame = backrefInit();
    /* begin backrefs */
    var notLookAround = !inLookAround();
    if (notLookAround) {
      /* begin AST - note: ignore AST in lookaround */
      astDefined = _this.ast && _this.ast.ruleDefined(op.index);
      if (astDefined) {
        astLength = _this.ast.getLength();
        downIndex = _this.ast.down(op.index, rules[op.index].name);
      }
      /* begin AST */
    }

    if (callback === null) {
      /* no callback - just execute the rule */
      savedOpcodes = opcodes;
      opcodes = rule.opcodes;
      opExecute(0, phraseIndex, sysData);
      opcodes = savedOpcodes;
    } else {
      /* begin callback */
      var charsLeft = charsEnd - phraseIndex;
      callback(sysData, chars, phraseIndex, syntaxData);
      validateRnmCallbackResult(rule, sysData, charsLeft, true);
      /* begin callback */
      if (sysData.state === id.ACTIVE) {
        savedOpcodes = opcodes;
        opcodes = rule.opcodes;
        opExecute(0, phraseIndex, sysData);
        opcodes = savedOpcodes;
        /* end callback */
        callback(sysData, chars, phraseIndex, syntaxData);
        validateRnmCallbackResult(rule, sysData, charsLeft, false);
        /* end callback */
      }
      /* implied else clause: just accept the callback sysData - RNM acting as UDT */
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
      /* end AST */
    }
    /* end backref */
    sysData.pFrame = saveFrame;
    if (rules[op.index].isBkr && (sysData.state === id.MATCH || sysData.state === id.EMPTY)) {
      /* save phrase on both the parent and universal frames */
      /* BKR operator will decide which to use later */
      sysData.pFrame[rules[op.index].lower] = {
        phraseIndex : phraseIndex,
        phraseLength : sysData.phraseLength
      }
      sysData.uFrame[rules[op.index].lower] = {
          phraseIndex : phraseIndex,
          phraseLength : sysData.phraseLength
        }
    }
    /* end backref */
  };
  // Validate the callback function's return sysData.
  // It's the user's responsibility to get it right
  // but it is `UDT`'s responsibility to fail if the user doesn't.
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
  // The `UDT` operator<br>
  // Simply calls the user's callback function, but operates like `RNM` with
  // regard to the `AST`.
  // There is some ambiguity here. `UDT`s act as terminals for phrase
  // recognition but as named rules
  // for `AST` nodes.
  // See [`ast.js`](./ast.html) for usage.
  var opUDT = function(opIndex, phraseIndex, sysData) {
    var downIndex, astLength, astIndex, op, udt, astDefined;
    op = opcodes[opIndex];
    var notLookAround = !inLookAround();
    if (notLookAround) {
      /* begin AST */
      astDefined = _this.ast && _this.ast.udtDefined(op.index);
      if (astDefined) {
        astIndex = rules.length + op.index;
        astLength = _this.ast.getLength();
        downIndex = _this.ast.down(astIndex, udts[op.index].name);
      }
      /* begin AST */
    }

    /* UDT */
    var charsLeft = charsEnd - phraseIndex;
    udtCallbacks[op.index](sysData, chars, phraseIndex, syntaxData);
    validateUdtCallbackResult(udts[op.index], sysData, charsLeft);
    /* UDT */

    if (notLookAround) {
      /* end AST */
      if (astDefined) {
        if (sysData.state === id.NOMATCH) {
          _this.ast.setLength(astLength);
        } else {
          _this.ast.up(astIndex, udts[op.index].name, phraseIndex, sysData.phraseLength);
        }
      }
      /* end AST */
    }
    /* back reference */
    if (udts[op.index].isBkr && (sysData.state === id.MATCH || sysData.state === id.EMPTY)) {
      /* save phrase on both the parent and universal frames */
      /* BKR operator will decide which to use later */
      sysData.pFrame[udt[op.index].lower] = {
        phraseIndex : phraseIndex,
        phraseLength : sysData.phraseLength
      }
      sysData.uFrame[udt[op.index].lower] = {
          phraseIndex : phraseIndex,
          phraseLength : sysData.phraseLength
        }
    }
  };
  // The `AND` operator<br>
  // This is the positive `look ahead` operator.
  // Executes its single child node, returning a matched empty phrase
  // if the child node succeeds. Fails if the child node fails.
  // *Always* backtracks on any matched phrase and returns empty on success.
  var opAND = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({lookAround : id.LOOKAROUND_AHEAD, anchor : phraseIndex, charsEnd : charsEnd, charsLength : charsLength});
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
  // The `NOT` operator<br>
  // This is the negative `look ahead` operator.
  // Executes its single child node, returning a matched empty phrase
  // if the child node *fails*. Fails if the child node succeeds.
  // *Always* backtracks on any matched phrase and returns empty
  // on success (failure of its child node).
  var opNOT = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({lookAround : id.LOOKAROUND_AHEAD, anchor : phraseIndex, charsEnd : charsEnd, charsLength : charsLength});
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
  // The `TRG` operator<br>
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
  // The `TBS` operator<br>
  // Matches its pre-defined phrase against the input string.
  // All characters must match exactly.
  // Case-sensitive literal strings (`'string'` && `%s"string"`) are translated to `TBS`
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
          /* NOMATCH */
          return;
        }
      }
      /* MATCH */
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* else NOMATCH */
  };
  // The `TLS` operator<br>
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
          /* NOMATCH */
          return;
        }
      }
      /* MATCH found */
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* else NOMATCH */
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
    frame = (op.bkrMode === id.BKR_MODE_PM) ? sysData.pFrame[lower]: sysData.uFrame[lower];
    insensitive = (op.bkrCase === id.BKR_MODE_CI) ? true: false;
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
            /* NOMATCH */
            return;
          }
        }
        /* MATCH */
        sysData.state = id.MATCH;
        sysData.phraseLength = len;
      } else {
        /* case-sensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[phraseIndex + i];
          lmcode = chars[lmIndex + i];
          if (code !== lmcode) {
            /* NOMATCH */
            return;
          }
        }
      }
      /* MATCH */
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* else NOMATCH */
  };
  // The `BKA` operator<br>
  // This is the positive `look behind` operator.
  // It succeeds if the phrase is found to preceed `phraseIndex`.
  // It then back tracks and returns NOMATCH or an empty string.
  var opBKA = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({lookAround : id.LOOKAROUND_BEHIND, anchor : phraseIndex});
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
  // The `BKN` operator<br>
  // This is the negative `look behind` operator.
  // It succeeds if the phrase is NOT found to preceed `phraseIndex`.
  // It then back tracks and returns NOMATCH or an empty string.
  var opBKN = function(opIndex, phraseIndex, sysData) {
    var op, prdResult;
    op = opcodes[opIndex];
    lookAround.push({lookAround : id.LOOKAROUND_BEHIND, anchor : phraseIndex});
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
  // The right-to-left concatenation operator.<br>
  // Works just like `CAT` except it parses right to left from the first character preceeding `phraseIndex`.
  var opCATBehind = function(opIndex, phraseIndex, sysData) {
    var op, success, astLength, catCharIndex, catPhrase, catMatched;
    op = opcodes[opIndex];
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
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  };
  // The right-to-left repetition operator.<br>
  // Works just like `REP` except it parses right to left from the first character preceeding `phraseIndex`.
  var opREPBehind = function(opIndex, phraseIndex, sysData) {
    var op, astLength, repCharIndex, repPhrase, repCount;
    op = opcodes[opIndex];
    repCharIndex = phraseIndex;
    repPhrase = 0;
    repCount = 0;
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
      if (_this.ast) {
        _this.ast.setLength(astLength);
      }
    }
  }
  // The right-to-left terminal range operator.<br>
  // Works just like `TRG` except it parses right to left from the first character preceeding `phraseIndex`.
  var opTRGBehind = function(opIndex, phraseIndex, sysData) {
    var op = opcodes[opIndex];
    sysData.state = id.NOMATCH;
    sysData.phraseLength = 0;
    if (phraseIndex >= 0) {
      var char = chars[phraseIndex - 1];
      if (op.min <= char && char <= op.max) {
        sysData.state = id.MATCH;
        sysData.phraseLength = 1;
      }
    }
  }
  // The right-to-left terminal binary string operator.<br>
  // Works just like `TBS` except it parses right to left from the first character preceeding `phraseIndex`.
  var opTBSBehind = function(opIndex, phraseIndex, sysData) {
    var i, op, len, beg;
    op = opcodes[opIndex];
    /* NOMATCH default */
    sysData.state = id.NOMATCH;
    len = op.string.length;
    beg = phraseIndex - len;
    if (beg >= 0) {
      for (i = 0; i < len; i += 1) {
        if (chars[beg + i] !== op.string[i]) {
          /* NOMATCH */
          return;
        }
      }
      /* MATCH */
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* else NOMATCH */
  }
  // The right-to-left terminal literal string operator.<br>
  // Works just like `TLS` except it parses right to left from the first character preceeding `phraseIndex`.
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
          /* NOMATCH */
          return;
        }
      }
      /* MATCH found */
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* else NOMATCH */
  }
  // The right-to-left back reference operator.<br>
  // Works just like `BKR` except it parses right to left from the first character preceeding `phraseIndex`.
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
    frame = (op.bkrMode === id.BKR_MODE_PM) ? sysData.pFrame[lower]: sysData.uFrame[lower];
    insensitive = (op.bkrCase === id.BKR_MODE_CI) ? true: false;
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
            /* NOMATCH */
            return;
          }
        }
        /* MATCH */
        sysData.state = id.MATCH;
        sysData.phraseLength = len;
      } else {
        /* case-sensitive match */
        for (i = 0; i < len; i += 1) {
          code = chars[beg + i];
          lmcode = chars[lmIndex + i];
          if (code !== lmcode) {
            /* NOMATCH */
            return;
          }
        }
      }
      /* MATCH */
      sysData.state = id.MATCH;
      sysData.phraseLength = len;
    } /* else NOMATCH */
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
      _this.trace.down(op, sysData.state, phraseIndex, sysData.phraseLength,
          lk.anchor, lk.lookAround);
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
      _this.trace.up(op, sysData.state, phraseIndex, sysData.phraseLength,
          lk.anchor, lk.lookAround);
    }
    treeDepth -= 1;
    return ret;
  };
}
