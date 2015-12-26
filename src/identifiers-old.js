// This module exposes a list of named identifiers, shared across the parser generator
// and the parsers that are generated.
"use strict";
module.exports = {
  // Identifies the operator type. Used by the [generator](https://github.com/ldthomas/apg-js2)
    // to indicate operator types in the grammar object. 
    // Used by the [parser](./parser.html) when interpreting the grammar object.
  ALT : 1,
  CAT : 2,
  REP : 3,
  RNM : 4,
  UDT : 5,
  AND : 6,
  NOT : 7,
  TRG : 8,
  TLS : 9,
  TBS : 10,
  // Used by the parser and the user's `RNM` and `UDT` callback functions.
  // Identifies the parser state as it traverses the parse tree nodes.
  // - *ACTIVE* - indicates the downward direction through the parse tree node.
  // - *MATCH* - indicates the upward direction and a phrase, of length \> 0,  has been successfully matched
  // - *EMPTY* - indicates the upward direction and a phrase, of length = 0, has been successfully matched
  // - *NOMATCH* - indicates the upward direction and the parser failed to match any phrase at all
  ACTIVE : 11,
  MATCH : 12,
  EMPTY : 13,
  NOMATCH : 14,
  // Used by [`AST` translator](./ast.html) (semantic analysis) and the user's callback functions
  // to indicate the direction of flow through the `AST` nodes.
  // - *SEM_PRE* - indicates the downward direction through the `AST` node.
  // - *SEM_POST* - indicates the upward direction through the `AST` node.
  SEM_PRE : 17,
  SEM_POST : 18,
  // Used by the user's callback functions to indicate to the `AST` translator (semantic analysis) how to proceed.
  // - *SEM_OK* - normal return value
  // - *SEM_SKIP* - if a callback function returns this value from the SEM_PRE state,
  // the translator will skip processing all `AST` nodes in the branch below the current node.
  // Ignored if returned from the SEM_POST state.
  SEM_OK : 19,
  SEM_SKIP : 21,
  // Used in attribute generation to distinguish the necessary attribute categories.
  // - *ATTR_N* - non-recursive
  // - *ATTR_R* - recursive
  // - *ATTR_MR* - belongs to a mutually-recursive set
  // - *ATTR_NMR* - non-recursive, but refers to a mutually-recursive set
  // - *ATTR_RMR* - recursive, but refers to a mutually-recursive set
  ATTR_N : 30,
  ATTR_R : 31,
  ATTR_MR : 32,
  ATTR_NMR : 33,
  ATTR_RMR : 34
}