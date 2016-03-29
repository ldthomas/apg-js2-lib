##JavaScript APG Parsing Library

**Description:**  
The JavaScript APG Parsing Library contains the basic core support code needed to run both <a href="https://github.com/ldthomas/apg-js2">apg<a/>, the parser generator, and the parsers that it generates.

**Installation:**  
*Requires node.js and npm*

github intallation  
```
git clone https://github.com/ldthomas/apg-js2-lib.git /path/to/my-copy-of-apg-lib
mkdir my-project 
cd my-project 
npm init
npm install /path/to/my-copy-of-apg-lib --save
```
npm installation:  
```
mkdir my-project 
cd my-project 
npm init
npm install apg-lib --save
```
In your application code you can now access the apg library with `require("apg-lib")`
(see <a href="https://github.com/ldthomas/apg-js2-examples">examples</a>)

**Examples:**  
See <a href="https://github.com/ldthomas/apg-js2-examples">apg-js2-examples</a> for examples of running JavaScript APG 2.0 and the parsers it generates.
  
**Documentation:**  
<i><b>UPDATE:</b> The files `apglib.js` and `apglib.css` have been added to make using `apg-lib`
 in a browser web page simple.</i><br>
See the documentation in `src/apglibjs-gen.js` and `src/apglibcss-gen.js` for details.
See, also, this [CodePen](http://codepen.io/apg-exp/pen/ZWKGqQ) for an example.

The full documentation is in the code in [`docco`](https://jashkenas.github.io/docco/) format.
To generate the documentation, from the package directory:
```
npm install -g docco
./docco-gen
```
View `docs/index.html` in any web browser to get started.
Or view it on the [APG website](http://coasttocoastresearch.com/docjs2/apg-lib/index.html)

**Copyright:**  
*Copyright &copy; 2016 Lowell D. Thomas, all rights reserved*  

**License:**  
Released under the BSD-3-Clause license.
      
