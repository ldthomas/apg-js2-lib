"use strict";
module.exports = function() {
	var thisFileName = "parser.js: "
	var that = this;
	var id = require("./identifiers.js");
//	var utils = require("./utilities.js");
	this.ast = null;
	this.stats = null;
	this.trace = null;
	this.callbacks = [];
	var startRule = 0;
	var opcodes = null;
	var chars = null;
	var treeDepth = 0;
	var ruleCallbacks = null;
	var udtCallbacks = null;
	var rules = null;
	var udts = null;
	var syntaxData = null;
	var maxMatched = 0;

	/**
	 * Clear this object of any/all data that has been initialized or added to
	 * it. Can be called to re-initialize this object for re-use.
	 * 
	 * @public
	 */
	var clear = function() {
		startRule = 0;
		treeDepth = 0;
		rules = null;
		udts = null;
		chars = null;
		maxMatched = 0;
		ruleCallbacks = null;
		udtCallbacks = null;
		syntaxData = null;
		opcodes = null;
	};

	/** ************************************************************************** */
	// evaluate any rule name
	// can be called from syntax call back functions for handwritten parsing
	// ruleIndex - index of the rule to execute (see the opcodes)
	// phraseIndex - what phrase to parser, offset into the input string
	// state - array to return the final state (OP_STATE) and number of matched
	// characters (OP_MATCH)
	/**
	 * Evaluates any given rule. This can be called from the syntax callback
	 * functions to evaluate any rule in the grammar's rule list. Great caution
	 * should be used. Use of this function will alter the language that the
	 * parser accepts. The original grammar will still define the rules but use
	 * of this function will alter the way the rules are combined to form
	 * language sentences.
	 * 
	 * @public
	 * @param {number}
	 *            ruleIndex - the index of the rule to evaluate
	 * @param {number}
	 *            phraseIndex - the index of the first character in the string
	 *            to parse
	 * @param {array}
	 *            state - array to receive the parser's state on return state[0] =
	 *            parser state, state[1] = number of matched characters
	 */
	var evaluateRule = function(ruleIndex, phraseIndex, result) {
		var length, valid = (ruleIndex < rules.length)
				&& (phraseIndex < chars.length);
		if (valid) {
			// create a dummy RNM operator
			length = opcodes.length;
			opcodes[length] = [];
			opcodes[length].opNext = length + 1;
			opcodes[length].type = id.RNM;
			opcodes[length].ruleIndex = ruleIndex;
			opExecute(length, phraseIndex, result);
			opcodes.length = length;
		}
	};

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
			if(that.ast.astObject !== "astObject"){
				throw new Error(functionName + "ast object not recognized");
			}
			break;
		}
		if(that.ast !== null){
			that.ast.init(rules, udts, chars);
		}
	}
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
			if(that.trace.traceObject !== "traceObject"){
				throw new Error(functionName + "trace object not recognized");
			}
			break;
		}
		if(that.trace !== null){
			that.trace.init(rules, udts, chars);
		}
		
	}
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
			if(that.stats.statsObject !== "statsObject"){
				throw new Error(functionName + "stats object not recognized");
			}
			break;
		}
		if(that.stats !== null){
			that.stats.init(rules, udts);
		}
	}
	var initializeGrammar = function(grammar){
		var functionName = thisFileName + "initializeGrammar(): ";
		if(grammar === undefined || grammar === null){
			throw new Error(functionName + "grammar object undefined");
		}
		if(grammar.grammarObject !== "grammarObject"){
			throw new Error(functionName + "bad grammar object");
		}
		rules = grammar.rules;
		udts = grammar.udts;
	}
	var initializeStartRule = function(startRule){
		var functionName = thisFileName + "initializeStartRule(): ";
		var start = null;
		if (typeof (startRule) === "number") {
			if (startRule >= rules.length) {
				throw new Error(functionName+ "start rule index too large: max: "+ rules.length + ": index: " + startRule);
			}
			start = startRule;
		}else if (typeof (startRule) === "string") {
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
		}else{
			throw new Error(functionName + "type of start rule '" + typeof(startRule)
					+ "' not recognized");
		}
		return start;
	}
	var initializeInputChars = function(input){
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
	var initializeCallbacks = function(){
		var functionName = thisFileName + "initializeCallbacks(): ";
		var i;
		// initialize all syntax callbacks to false
		ruleCallbacks = [];
		udtCallbacks = [];
		for(i = 0; i < rules.length; i += 1){
			ruleCallbacks[i] = null;
		}
		for(i = 0; i < udts.length; i += 1){
			udtCallbacks[i] = null;
		}
		
		var func, list = [];
		// make name lookup list
		for(i = 0; i < rules.length; i += 1){
			list.push(rules[i].lower);
		}
		for(i = 0; i < udts.length; i += 1){
			list.push(udts[i].lower);
		}
		for( var index in that.callbacks){
			i = list.indexOf(index);
			if(i < 0){
				throw new Error(functionName + "syntax callback '"+index+"' not a rule or udt name");
			}
			func = that.callbacks[index];
			if(func === false){
				func = null;
			}
			if(typeof(func) === "function" || func === null){
				if(i < rules.length){
					ruleCallbacks[i] = func;
				}else{
					udtCallbacks[i - rules.length] = func;
				}
			}else{
				throw new Error(functionName + "syntax callback["+index+"] must be function reference or 'false'");
			}
		}
		
		// make sure all udts have been defined
		for(i = 0; i < udts.length; i += 1){
			if(udtCallbacks[i] === null){
				throw new Error(functionName + "all UDT callbacks must be defined. UDT callback["+udts[i].lower+"] not a function reference");
			}
		}
	}
	this.parse = function(grammar, startRule, inputChars, callbackData) {
		var functionName, result;
		functionName = thisFileName + "parse(): ";
		result = {
			state : id.ACTIVE,
			phraseLength : 0,
			lostChars: 0,
			success : false
		};

		clear();
		initializeGrammar(grammar);
		startRule = initializeStartRule(startRule);
		initializeInputChars(inputChars);
		initializeCallbacks();
		initializeTrace();
		initializeStats();
		initializeAst();
		if(!(callbackData === undefined || callbackData === null)){
			syntaxData = callbackData;
		}

		// create a dummy opcode for the start rule
		opcodes = [ {
			type : id.RNM,
			index : startRule
		} ];

		// execute the start rule
		opExecute(0, 0, result);
		opcodes = null;

		// test the result
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
			success: result.success,
			state: result.state,
			length: chars.length,
			matched: maxMatched
		};
	};

	/** ************************************************************************** */
	// the ALTERNATION operator
	// opIndex - index of the ALT operator opcode
	// phraseIndex - input string index of the phrase to be parsed
	// state - array for return of the final state and matched phrase length
	/**
	 * @private
	 */
	var opALT = function(opIndex, phraseIndex, result) {
		var op = opcodes[opIndex];
		if (op.type !== id.ALT) {
			throw new Error('opALT: type: ' + op.type + ': not ALT');
		}
		for (var i = 0; i < op.children.length; i += 1) {
			opExecute(op.children[i], phraseIndex, result);
			if (result.state !== id.NOMATCH) {
				break;
			}
		}
	};
	/** ************************************************************************** */
	// the CONCATENATION operator
	/**
	 * @private
	 */
	var opCAT = function(opIndex, phraseIndex, result) {
		var op, success, astLength, catResult, catCharIndex, catMatched, childOpIndex, matchedChildren;
		op = opcodes[opIndex];
		if (op.type !== id.CAT) {
			throw new Error('opCAT: type: ' + op.type + ': not CAT');
		}
		if(that.ast){
			astLength = that.ast.getLength();
		}
		catResult = {
			state : id.ACTIVE,
			phraseLength : 0,
			lostChars: 0,
			success: false
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
			// success
			result.state = catMatched === 0 ? id.EMPTY : id.MATCH;
			result.phraseLength = catMatched;
			result.lostChars = 0;
		} else {
			result.state = id.NOMATCH;
			result.phraseLength = 0;
			result.lostChars = catMatched;
		}
		if(that.ast && result.state === id.NOMATCH){
			that.ast.setLength(astLength);
		}
	};
	/** ************************************************************************** */
	// the REPETITION operator
	/**
	 * @private
	 */
	var opREP = function(opIndex, phraseIndex, result) {
		var nextResult, nextCharIndex, matchedCount, matchedChars, op, astLength;
		op = opcodes[opIndex];
		if (op.type !== id.REP) {
			throw new Error('opREP: type: ' + op.type + ': not REP');
		}
		nextResult = {
			state : id.ACTIVE,
			phraseLength : 0,
			lostChars: 0,
			success: false
		};
		nextCharIndex = phraseIndex;
		matchedCount = 0;
		matchedChars = 0;
		if(that.ast){
			astLength = that.ast.getLength();
		}
		while (true) {
			// always end on End of String
			if (nextCharIndex > chars.length) {
				break;
			}

			// execute the child opcode
			opExecute(opIndex + 1, nextCharIndex, nextResult);

			// end on nomatch
			if (nextResult.state === id.NOMATCH) {
				break;
			}

			// always succeed on empty
			if (nextResult.state === id.EMPTY) {
				break;
			}

			// increment for next repetition
			matchedCount += 1;
			matchedChars += nextResult.phraseLength;
			nextCharIndex += nextResult.phraseLength;

			// end on maxed out matches
			if (matchedCount === op.max) {
				break;
			}
		}

		// evaluate the match count
		if (nextResult.state === id.EMPTY) {
			result.state = (matchedChars === 0) ? id.EMPTY : id.MATCH;
			result.phraseLength = matchedChars;
			result.lostChars = 0;
		} else if (matchedCount >= op.min) {
			// got a match
			result.state = (matchedChars === 0) ? id.EMPTY : id.MATCH;
			result.phraseLength = matchedChars;
			result.lostChars = 0;
		} else {
			// failed to meet minimum match requirement
			result.state = id.NOMATCH;
			result.phraseLength = 0;
			result.lostChars = matchedChars;
		}
		if(that.ast && result.state === id.NOMATCH){
			that.ast.setLength(astLength);
		}
	};
	/*
	 * Validate the callback function return result. User's responsibility to
	 * get it right.
	 */
	var validateRnmCallbackResult = function(rule, result, down) {
		switch (result.state) {
		case id.ACTIVE:
			if (down === true) {
				result.phraseLength = 0;
			} else {
				throw new Error(thisFileName + "opRNM("
						+ rule.name
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
			throw new Error(thisFileName + "opRNM("
					+ rule.name
					+ "): callback function return error. Unrecognized return state: "
					+ result.state);
			break;
		}
	}
	var opRNM = function(opIndex, phraseIndex, result) {
		var savedOpcodes, downIndex, op, rule, astLength, astDefined;
		op = opcodes[opIndex];
		if (op.type !== id.RNM) {
			throw new Error('opRNM: type: ' + op.type + ': not RNM');
		}

		// AST
		astDefined = that.ast && that.ast.ruleDefined(op.index);
		if (astDefined) {
			astLength = that.ast.getLength();
			downIndex = that.ast.down(op.index, rules[op.index].name);
		}

		// syntax call back
		var callback = ruleCallbacks[op.index];
		var rule = rules[op.index];
		if (callback === null) {
			// no callback - just execute the rule
			savedOpcodes = opcodes;
			opcodes = rule.opcodes;
			opExecute(0, phraseIndex, result);
			opcodes = savedOpcodes;
		} else {
			// syntax call back: downward function execution
			callback(result, chars, phraseIndex, syntaxData);
			validateRnmCallbackResult(rule, result, true);
			if (result.state === id.ACTIVE) {
				// execute the rule
				savedOpcodes = opcodes;
				opcodes = rule.opcodes;
				opExecute(0, phraseIndex, result);
				opcodes = savedOpcodes;

				// syntax call back: upward function execution
				callback(result, chars, phraseIndex, syntaxData);
				validateRnmCallbackResult(rule, result, false);
			} // else just accept the callback result - RNM acting as UDT
		}

		// AST
		if (astDefined) {
			if (result.state === id.NOMATCH) {
				that.ast.setLength(astLength);
			} else {
				that.ast.up(op.index, rules[op.index].name, phraseIndex, result.phraseLength);
			}
		}
	};
	var validateUdtCallbackResult = function(udt, result) {
		switch (result.state) {
		case id.ACTIVE:
			throw new Error(thisFileName + "opUDT("
					+ udt.name
					+ "): callback function return error. ACTIVE state not allowed.");
			break;
		case id.EMPTY:
			if(udt.empty === false){
				throw new Error(thisFileName + "opUDT("
						+ udt.name
						+ "): callback function return error. May not return EMPTY.");
			}else{
				result.phraseLength = 0;
			}
			break;
		case id.MATCH:
			if (result.phraseLength === 0) {
				if(udt.empty === false){
					throw new Error(thisFileName + "opUDT("
							+ udt.name
							+ "): callback function return error. May not return EMPTY.");
				}else{
					result.state = id.EMPTY;
				}
			}
			break;
		case id.NOMATCH:
			break;
		default:
			throw new Error(thisFileName + "opUDT("
					+ udt.name
					+ "): callback function return error. Unrecognized return state: "
					+ result.state);
			break;
		}
	}
	var opUDT = function(opIndex, phraseIndex, result) {
		var downIndex, astLength, astIndex, op, udt, astDefined;
		op = opcodes[opIndex];
		if (op.type !== id.UDT) {
			throw new Error('opUDT: type: ' + op.type + ': not UDT');
		}

		// AST
		astDefined = that.ast && that.ast.udtDefined(op.index);
		if (astDefined) {
			astIndex = rules.length + op.index;
			astLength = that.ast.getLength();
			downIndex = that.ast.down(astIndex, udts[op.index].name);
		}

		// UDT syntax call back
		udtCallbacks[op.index](result, chars, phraseIndex,
				syntaxData);
		validateUdtCallbackResult(udts[op.index], result);

		// AST
		if (astDefined) {
			if (result.state === id.NOMATCH) {
				that.ast.setLength(astLength);
			} else {
				that.ast.up(astIndex, udts[op.index].name, phraseIndex, result.phraseLength);
			}
		}
	};
	/** ************************************************************************** */
	// the SYNTACTIC PREDICATE AND operator
	/**
	 * @private
	 */
	var opAND = function(opIndex, phraseIndex, result) {
		var op, prdResult;
		op = opcodes[opIndex];
		if (op.type !== id.AND) {
			throw new Error('opAND: type: ' + op.type + ': not AND');
		}
		prdResult = {
			state : id.ACTIVE,
			phraseLength : 0,
			lostChars: 0,
			success: false
		};

		// execute the child opcode
		if (that.ast !== null) {
			that.ast.pause();
		}
		opExecute(opIndex + 1, phraseIndex, prdResult);
		if (that.ast !== null) {
			that.ast.resume();
		}

		// evaluate the result
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
	/** ************************************************************************** */
	// the SYNTACTIC PREDICATE NOT operator
	/**
	 * @private
	 */
	var opNOT = function(opIndex, phraseIndex, result) {
		var op, prdResult;
		op = opcodes[opIndex];
		if (op.type !== id.NOT) {
			throw new Error('opNOT: type: ' + op.type + ': not NOT');
		}
		prdResult = {
			state : id.ACTIVE,
			phraseLength : 0,
			lostChars: 0,
			success: false
		};

		// execute the child opcode
		if (that.ast !== null) {
			that.ast.pause();
		}
		opExecute(opIndex + 1, phraseIndex, prdResult);
		if (that.ast !== null) {
			that.ast.resume();
		}

		// evaluate the result
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
	/** ************************************************************************** */
	// the TERMINAL RANGE operator
	/**
	 * @private
	 */
	var opTRG = function(opIndex, phraseIndex, result) {
		var op = opcodes[opIndex];
		if (op.type !== id.TRG) {
			throw new Error('opTRG: type: ' + op.type + ': not TRG');
		}
		result.state = id.NOMATCH;
		result.phraseLength = 0;
		result.lostChars = 0;
		if (phraseIndex < chars.length) {
			if (op.min <= chars[phraseIndex]
					&& chars[phraseIndex] <= op.max) {
				result.state = id.MATCH;
				result.phraseLength = 1;
			}
		}
	};
	/** ************************************************************************** */
	// the TERMINAL BINARY STRING operator
	/**
	 * @private
	 */
	var opTBS = function(opIndex, phraseIndex, result) {
		var i, op, len;
		op = opcodes[opIndex];
		if (op.type !== id.TBS) {
			throw new Error('opTBS: type: ' + op.type + ': not TBS');
		}
		result.state = id.NOMATCH;
		result.phraseLength = 0;
		result.lostChars = 0;
		len = op.string.length;
		if (len === 0) {
			throw new Error('opTBS: string length cannot be 0');
		}
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
	/** ************************************************************************** */
	// the TERMINAL LITERAL STRING operator
	/**
	 * @private
	 */
	var opTLS = function(opIndex, phraseIndex, result) {
		var i, code, len, op;
		op = opcodes[opIndex];
		if (op.type !== id.TLS) {
			throw new Error('opTLS: type: ' + op.type + ': not TLS');
		}
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
	/**
	 * Generalized execute function to execute any node operator.
	 * 
	 * @private
	 */
	var opExecute = function(opIndex, phraseIndex, result) {
		var op, ret = true;
		op = opcodes[opIndex];

		// tree depth
		treeDepth += 1;

		result.state = id.ACTIVE;
		result.phraseLength = 0;
		result.lostChars = 0;
		result.success = false;
		
		if (that.trace !== null) {
			that.trace.down(op, result.state, phraseIndex,
					result.phraseLength);
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
		if ((result.state !== id.MATCH) && (result.state !== id.NOMATCH)
				&& (result.state !== id.EMPTY)) {
			throw new Error('opExecute: invalid state returned');
		}
		if(phraseIndex + result.phraseLength > maxMatched){
			maxMatched = phraseIndex + result.phraseLength;
		}

		// statistics up
		if (that.stats !== null) {
			that.stats.collect(op, result);
		}

		// trace up
		if (that.trace !== null) {
			that.trace.up(op, result.state, phraseIndex,
					result.phraseLength);
		}

		// tree depth
		treeDepth -= 1;

		return ret;
	};
}
