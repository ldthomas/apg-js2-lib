// This function is used to generate a browser-accessible copy of `apg-lib`.
// To generate and minify:
// ```
//npm install -g browserify
//npm install -g uglifyjs
//browserify apglibjs-gen.js > apglib.js
//uglifyjs apglib.js --compress --mangle > apglib-min.js
// ```
// To use it in a browser, include `apglib.js` or `apglib-min.js`
// and the style sheet, `apglib.css`, in a script in the web page header.
// ```
//<head>
// ...
// <link rel="stylesheet" href="apglib.css">
// <script src="apglib.js" charset="utf-8"></script>
// <!-- or -->
// <script src="apglib-min.js" charset="utf-8"></script>
// ...
//</head>
// ```
// You can now access `apg-lib` 
// in your web page JavaScript
// through the variable `window.apglib`. 
// ```
//  <script>
//  var exec = function(){
//    var str = "---abc---";
//    /* 
//     * instantiate a parser
//    */
//    var parser = new apglib.parser()';
//    /* 
//     * use the "string to array of character codes"
//     * utility function
//    */
//    var chars = apglib.utils.stringToChars(str);
//    /*
//     * more code ...
//    */
//  }
//  </script>
// ```
(function(){
  this.apglib = require("./export.js");
})()
