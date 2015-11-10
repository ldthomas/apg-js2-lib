// This module is the constructor for the statistics gathering object.
// The statistics are nothing more than keeping a count of the 
// number of times each node in the parse tree is traversed.
//
// Counts are collected for each of the individual types of operators.
// Additionally, counts are collected for each of the individually named
// `RNM` and `UDT` operators.
module.exports = function() {
  "use strict";
  var thisFileName = "stats.js: ";
  var id = require("./identifiers.js");
  var rules = [];
  var udts = [];
  var stats = [];
  var totals;
  var ruleStats = [];
  var udtStats = [];
  this.statsObject = "statsObject";
  var nameId = 'stats';
  /* called only by the parser to validate a stats object*/
  this.validate = function(name) {
    var ret = false;
    if (typeof (name) === 'string' && nameId === name) {
      ret = true;
    }
    return ret;
  }
  // `Array.sort()` callback function for sorting `RNM` and `UDT` operators alphabetically by name.
  var sortAlpha = function(lhs, rhs) {
    if (lhs.lower < rhs.lower) {
      return -1;
    }
    if (lhs.lower > rhs.lower) {
      return 1;
    }
    return 0;
  }
  // `Array.sort()` callback function for sorting `RNM` and `UDT` operators by hit count.
  var sortHits = function(lhs, rhs) {
    if (lhs.total < rhs.total) {
      return 1;
    }
    if (lhs.total > rhs.total) {
      return -1;
    }
    return sortAlpha(lhs, rhs);
  }
  // `Array.sort()` callback function for sorting `RNM` and `UDT` operators by index
  // (in the order in which they appear in the SABNF grammar).
  var sortIndex = function(lhs, rhs) {
    if (lhs.index < rhs.index) {
      return -1;
    }
    if (lhs.index > rhs.index) {
      return 1;
    }
    return 0;
  }
  var clear = function() {
    totals = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.ALT] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.CAT] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.RNM] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.UDT] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.REP] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.AND] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.NOT] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.TLS] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.TBS] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    stats[id.TRG] = {
      empty : 0,
      match : 0,
      nomatch : 0,
      total : 0
    };
    ruleStats.length = 0;
    for (var i = 0; i < rules.length; i += 1) {
      ruleStats.push({
        empty : 0,
        match : 0,
        nomatch : 0,
        total : 0,
        name : rules[i].name,
        lower : rules[i].lower,
        index : rules[i].index
      });
    }
    if (udts.length > 0) {
      udtStats.length = 0;
      for (var i = 0; i < udts.length; i += 1) {
        udtStats.push({
          empty : 0,
          match : 0,
          nomatch : 0,
          total : 0,
          name : udts[i].name,
          lower : udts[i].lower,
          index : udts[i].index
        });
      }
    }
  };
  /* no verification of input - only called by parser() */
  this.init = function(inputRules, inputUdts) {
    rules = inputRules;
    udts = inputUdts;
    clear();
  }
  /* increment the designated operator hit count by one*/
  var incStat = function(stat, state, phraseLength) {
    stat.total += 1;
    switch (state) {
    case id.EMPTY:
      stat.empty += 1;
      break;
    case id.MATCH:
      stat.match += 1;
      break;
    case id.NOMATCH:
      stat.nomatch += 1;
      break;
    default:
      throw thisFileName + "collect(): incStat(): unrecognized state: " + state;
      break;
    }
  }
  // This function is the main interaction with the parser.
  // The parser calls it after each node has been traversed.
  this.collect = function(op, result) {
    incStat(totals, result.state, result.phraseLength);
    incStat(stats[op.type], result.state, result.phraseLength);
    if (op.type === id.RNM) {
      incStat(ruleStats[op.index], result.state, result.phraseLength);
    }
    if (op.type === id.UDT) {
      incStat(udtStats[op.index], result.state, result.phraseLength);
    }
  };
  /* helper for displayHtml() */
  var displayOpsOnly = function() {
    var html = '';
    html += '<tr>';
    html += '<td>ALT</td><td>' + stats[id.ALT].empty + '</td>';
    html += '<td>' + stats[id.ALT].match + '</td>';
    html += '<td>' + stats[id.ALT].nomatch + '</td>';
    html += '<td>' + stats[id.ALT].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>CAT</td><td>' + stats[id.CAT].empty + '</td>';
    html += '<td>' + stats[id.CAT].match + '</td>';
    html += '<td>' + stats[id.CAT].nomatch + '</td>';
    html += '<td>' + stats[id.CAT].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>RNM</td><td>' + stats[id.RNM].empty + '</td>';
    html += '<td>' + stats[id.RNM].match + '</td>';
    html += '<td>' + stats[id.RNM].nomatch + '</td>';
    html += '<td>' + stats[id.RNM].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>UDT</td><td>' + stats[id.UDT].empty + '</td>';
    html += '<td>' + stats[id.UDT].match + '</td>';
    html += '<td>' + stats[id.UDT].nomatch + '</td>';
    html += '<td>' + stats[id.UDT].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>REP</td><td>' + stats[id.REP].empty + '</td>';
    html += '<td>' + stats[id.REP].match + '</td>';
    html += '<td>' + stats[id.REP].nomatch + '</td>';
    html += '<td>' + stats[id.REP].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>AND</td><td>' + stats[id.AND].empty + '</td>';
    html += '<td>' + stats[id.AND].match + '</td>';
    html += '<td>' + stats[id.AND].nomatch + '</td>';
    html += '<td>' + stats[id.AND].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>NOT</td><td>' + stats[id.NOT].empty + '</td>';
    html += '<td>' + stats[id.NOT].match + '</td>';
    html += '<td>' + stats[id.NOT].nomatch + '</td>';
    html += '<td>' + stats[id.NOT].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>TLS</td><td>' + stats[id.TLS].empty + '</td>';
    html += '<td>' + stats[id.TLS].match + '</td>';
    html += '<td>' + stats[id.TLS].nomatch + '</td>';
    html += '<td>' + stats[id.TLS].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>TBS</td><td>' + stats[id.TBS].empty + '</td>';
    html += '<td>' + stats[id.TBS].match + '</td>';
    html += '<td>' + stats[id.TBS].nomatch + '</td>';
    html += '<td>' + stats[id.TBS].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td>TRG</td><td>' + stats[id.TRG].empty + '</td>';
    html += '<td>' + stats[id.TRG].match + '</td>';
    html += '<td>' + stats[id.TRG].nomatch + '</td>';
    html += '<td>' + stats[id.TRG].total + '</td>';
    html += '</tr>\n';
    html += '<tr>';
    html += '<td><strong>totals</strong></td><td>' + totals.empty + '</td>';
    html += '<td>' + totals.match + '</td>';
    html += '<td>' + totals.nomatch + '</td>';
    html += '<td>' + totals.total + '</td>';
    html += '</tr>\n';
    return html;
  }
  /* helper for displayHtml() */
  var displayRules = function() {
    var html = "";
    html += '<tr><th></th><th></th><th></th><th></th><th></th></tr>\n';
    html += '<tr><th>rules</th><th></th><th></th><th></th><th></th></tr>\n';
    for (var i = 0; i < rules.length; i += 1) {
      if (ruleStats[i].total > 0) {
        html += '<tr>';
        html += '<td>' + ruleStats[i].name + '</td>';
        html += '<td>' + ruleStats[i].empty + '</td>';
        html += '<td>' + ruleStats[i].match + '</td>';
        html += '<td>' + ruleStats[i].nomatch + '</td>';
        html += '<td>' + ruleStats[i].total + '</td>';
        html += '</tr>\n';
      }
    }
    if (udts.length > 0) {
      html += '<tr><th></th><th></th><th></th><th></th><th></th></tr>\n';
      html += '<tr><th>udts</th><th></th><th></th><th></th><th></th></tr>\n';
      for (var i = 0; i < udts.length; i += 1) {
        if (udtStats[i].total > 0) {
          html += '<tr>';
          html += '<td>' + udtStats[i].name + '</td>';
          html += '<td>' + udtStats[i].empty + '</td>';
          html += '<td>' + udtStats[i].match + '</td>';
          html += '<td>' + udtStats[i].nomatch + '</td>';
          html += '<td>' + udtStats[i].total + '</td>';
          html += '</tr>\n';
        }
      }
    }
    return html;
  }
  /* helper for displayHtml() */
  var header = function(caption, classname) {
    var html = '';
    if (classname === undefined || typeof (classname) !== "string") {
      classname = "apg-table";
    }
    html += '<table class="' + classname + '">\n';
    if (typeof (caption) === "string") {
      html += '<caption>' + caption + '</caption>\n';
    }
    html += '<tr><th>ops</th><th>EMPTY</th><th>MATCH</th><th>NOMATCH</th><th>totals</th></tr>\n';
    return html;
  }
  /* helper for displayHtml() */
  var footer = function() {
    return "</table><br>\n";
  }
  // Display the statistics as an HTML table.
  // - *type*
  //   - "ops" - (default) display only the total hit counts for all operator types.
  //   - "index" - additionally, display the hit counts for the individual `RNM` and `UDT` operators ordered by index.
  //   - "hits" - additionally, display the hit counts for the individual `RNM` and `UDT` operators by hit count.
  //   - "alpha" - additionally, display the hit counts for the individual `RNM` and `UDT` operators by name alphabetically.
  // - *caption* - optional caption for the table
  // - *classname* - default is "apg-table" but maybe someday there will be a user who
  // really wants to use his/her own style sheet.
  this.displayHtml = function(type, caption, classname) {
    var display = displayOpsOnly;
    var html = header(caption, classname);
    while (true) {
      if (type === undefined) {
        html += displayOpsOnly();
        break;
      }
      if (type === null) {
        html += displayOpsOnly();
        break;
      }
      if (type === "ops") {
        html += displayOpsOnly();
        break;
      }
      if (type === "index") {
        ruleStats.sort(sortIndex);
        if (udtStats.length > 0) {
          udtStats.sort(sortIndex);
        }
        html += displayOpsOnly();
        html += displayRules();
        break;
      }
      if (type === "hits") {
        ruleStats.sort(sortHits);
        if (udtStats.length > 0) {
          udtStats.sort(sortIndex);
        }
        html += displayOpsOnly();
        html += displayRules();
        break;
      }
      if (type === "alpha") {
        ruleStats.sort(sortAlpha);
        if (udtStats.length > 0) {
          udtStats.sort(sortAlpha);
        }
        html += displayOpsOnly();
        html += displayRules();
        break;
      }
      break;
    }
    html += footer();
    return html;
  }
}
