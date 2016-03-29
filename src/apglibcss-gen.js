// This module generates `apglib.css`,
// a CSS file for displaying the HTML output of the `apg-lib` utility functions.
// To generate it:
//```
// node apglibcss-gen.js
//```
// `apglib.css` should be included in the web pages that use `apglib.js`.
// e.g.
// ```
//<head>
// ...
// <link rel="stylesheet" href="apglib.css">
// <script src="apglib.js" charset="utf-8"></script>
// ...
//</head>
//```
(function(){
  var fs = require("fs");
  var apglib = require("./export.js");
  var css = apglib.utils.css();
  var name = "./apglib.css";
  try{
    fs.writeFileSync(name, css);
    console.log("apglibcss-gen: apg-lib css file written to: "+name);
  }catch(e){
    console.log(e.message);
  }
})()
