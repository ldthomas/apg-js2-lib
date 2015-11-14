**Annotated Table of Contents**<br>
*JavaScript APG Parsing Library Version 2.0*

0. The GitHub & npm README page.
> [README.md](./README.html)

0. The Parser. This is the main program that traverses the parse tree of opcodes,
matching phrases from the input string as it goes.
> [parser.js](./parser.html)<br>

0. The Abstract Syntax Tree (AST) object constructor.
> [ast.js](./ast.html)<br>

0. The trace object constructor
> [trace.js](./trace.html)<br>

0. The statistics object constructor.
> [stats.js](./stats.html)<br>

0. A circular buffer object constructor. Used by [trace](./trace.html) to limit the number of trace records saved.
> [circular-buffer.js](./circular-buffer.html)<br>

0. A library of utility functions. An object of individual functions, not a constructor.
> [utilities.js](./utilities.html)<br>

0. Numerical identifiers for the APG operators and states.
> [identifiers.js](./identifiers.html)<br>

0. Module to export the entire library from a single module.
> [export.js](./export.html)<br>
