"use strict";
/**
 * Identifiers to be shared across generator and parser applications.
 */
module.exports = {
	// opcode operator types
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

	// opcode & syntax analysis states
	ACTIVE : 11,
	MATCH : 12,
	EMPTY : 13,
	NOMATCH : 14,

	// semantic analysis callback states
	SEM_PRE : 17,
	SEM_POST : 18,

	// semantic analysis callback return values
	SEM_OK : 19,
	SEM_ERROR : 20,
	SEM_SKIP : 21,
	
	// attribute types
	ATTR_N: 30,		// non-recursive
	ATTR_R: 31,		// recursive
	ATTR_MR: 32,	// belongs to a mutually-recursive set
	ATTR_NMR: 33,	// non-recursive, but refers to a mutually-recursive set
	ATTR_RMR: 34,	// recursive, but refers to a mutually-recursive set
}