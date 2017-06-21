JavaScript APG Parsing Library
=========================

## Description
The JavaScript APG Parsing Library contains the basic core support code needed to run both <a href="https://github.com/ldthomas/apg-js2">apg<a/>, the parser generator, and the parsers that it generates.

## Installation

github:  
```
git clone https://github.com/ldthomas/apg-js2-lib.git /path/to/my-copy-of-apg-lib
mkdir my-project 
cd my-project 
npm init
npm install /path/to/my-copy-of-apg-lib --save
```
npm:  
```
mkdir my-project 
cd my-project 
npm init
npm install apg-lib --save
```
In your application code you can now access the apg library with `require("apg-lib")` (see <a href="https://github.com/ldthomas/apg-js2-examples">examples</a>)

### Web page use
```
git clone https://github.com/ldthomas/apg-js2-lib.git apg-dir
```
In the header of your web page now include the resources:
```
<link rel="stylesheet" href="./apg-dir/apglib.css">
<script src="./apg-dir/apglib.js" charset="utf-8"></script>
or
<link rel="stylesheet" href="./apg-dir/apglib-min.css">
<script src="./apg-dir/apglib-min.js" charset="utf-8"></script>
```
Note that some `apg-lib` functions return results as HTML strings. `apglib.css` is required to properly style the HTML elements. In your web page JavaSript code you can now access the apg-lib modules through the `apglib` object. For example, to create a parser
````
var my-parser = new apglib.parser();
````

See the [browser](https://github.com/ldthomas/apg-js2-examples/tree/master/simple/browser) example, for specifics. See, also, this [CodePen](http://codepen.io/apg-exp/pen/ZWKGqQ).

### Examples
See <a href="https://github.com/ldthomas/apg-js2-examples">apg-js2-examples</a> for examples of running JavaScript APG and the parsers it generates.
  
### Documentation
The full documentation is in the code in [`docco`](https://jashkenas.github.io/docco/) format.
To generate the documentation, from the package directory:
```
npm install -g docco
./docco-gen
```
View `docs/index.html` in any web browser to get started.
Or view it on the [APG website](http://coasttocoastresearch.com/docjs2/apg-lib/index.html)

#### Copyright
*Copyright &copy; 2017 Lowell D. Thomas, all rights reserved*  

#### License  
Released under the BSD-3-Clause license.
      
