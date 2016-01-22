// This module exposes a list of named identifiers, shared across the parser generator
// and the parsers that are generated.
"use strict";
module.exports = {
  // Identifies the operator type. Used by the [generator](https://github.com/ldthomas/apg-js2)
    // to indicate operator types in the grammar object. 
    // Used by the [parser](./parser.html) when interpreting the grammar object.
  ALT : 1, /* alternation */
  CAT : 2, /* concatenation */
  REP : 3, /* repetition */
  RNM : 4, /* rule name */
  UDT : 5, /* user-defined terminal */
  AND : 6, /* positive look ahead */
  NOT : 7, /* negative look ahead */
  TRG : 8, /* terminal range */
  TLS : 9, /* terminal literal string, case insensitive */
  TBS : 10, /* terminal binary string, case sensitive */
  BKR : 11, /* back reference to a previously matched rule name */
  BKA : 12, /* positive look behind */
  BKN : 13, /* negative look behind */
  // Used by the parser and the user's `RNM` and `UDT` callback functions.
  // Identifies the parser state as it traverses the parse tree nodes.
  // - *ACTIVE* - indicates the downward direction through the parse tree node.
  // - *MATCH* - indicates the upward direction and a phrase, of length \> 0,  has been successfully matched
  // - *EMPTY* - indicates the upward direction and a phrase, of length = 0, has been successfully matched
  // - *NOMATCH* - indicates the upward direction and the parser failed to match any phrase at all
  ACTIVE : 20,
  MATCH : 21,
  EMPTY : 22,
  NOMATCH : 23,
  // Used by [`AST` translator](./ast.html) (semantic analysis) and the user's callback functions
  // to indicate the direction of flow through the `AST` nodes.
  // - *SEM_PRE* - indicates the downward direction through the `AST` node.
  // - *SEM_POST* - indicates the upward direction through the `AST` node.
  SEM_PRE : 30,
  SEM_POST : 31,
  // Used by the user's callback functions to indicate to the `AST` translator (semantic analysis) how to proceed.
  // - *SEM_OK* - normal return value
  // - *SEM_SKIP* - if a callback function returns this value from the SEM_PRE state,
  // the translator will skip processing all `AST` nodes in the branch below the current node.
  // Ignored if returned from the SEM_POST state.
  SEM_OK : 32,
  SEM_SKIP : 33,
  // Used in attribute generation to distinguish the necessary attribute categories.
  // - *ATTR_N* - non-recursive
  // - *ATTR_R* - recursive
  // - *ATTR_MR* - belongs to a mutually-recursive set
  // - *ATTR_NMR* - non-recursive, but refers to a mutually-recursive set
  // - *ATTR_RMR* - recursive, but refers to a mutually-recursive set
  ATTR_N : 40,
  ATTR_R : 41,
  ATTR_MR : 42,
  ATTR_NMR : 43,
  ATTR_RMR : 44,
  // Look around values indicate whether the parser is in look ahead or look behind mode.
  // Used by the tracing facility to indicate the look around mode in the trace records display.
  LOOKAROUND_NONE : 50,
  LOOKAROUND_AHEAD : 51,
  LOOKAROUND_BEHIND : 52,
  // Back reference values indicate whether a rule is back referenced in universal, parent or not at all mode.
  BKR_MODE_NONE : 60, /* not back referenced at all */
  BKR_MODE_UM : 61,   /* back referenced in universal mode */
  BKR_MODE_PM : 62,   /* back referenced in parent-frame mode */
  BKR_MODE_CS : 63,   /* back referenced in case-sensitive mode */
  BKR_MODE_CI : 64    /* back referenced in case-insensitive mode */
}