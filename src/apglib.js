// This function is used to generate a browser-accessible copy of `apg-lib`.
(function(){
  this.apglib = {};
  this.apglib.ast = require("./ast.js");
  this.apglib.circular = require("./circular-buffer.js");
  this.apglib.ids = require("./identifiers.js");
  this.apglib.parser = require("./parser.js");
  this.apglib.stats = require("./stats.js");
  this.apglib.trace = require("./trace.js");
  this.apglib.utils = require("./utilities.js");
})()
