(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint eqnull: true */

module.exports.create = function() {

var Handlebars = {};

// BEGIN(BROWSER)

Handlebars.VERSION = "1.0.0";
Handlebars.COMPILER_REVISION = 4;

Handlebars.REVISION_CHANGES = {
  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
  2: '== 1.0.0-rc.3',
  3: '== 1.0.0-rc.4',
  4: '>= 1.0.0'
};

Handlebars.helpers  = {};
Handlebars.partials = {};

var toString = Object.prototype.toString,
    functionType = '[object Function]',
    objectType = '[object Object]';

Handlebars.registerHelper = function(name, fn, inverse) {
  if (toString.call(name) === objectType) {
    if (inverse || fn) { throw new Handlebars.Exception('Arg not supported with multiple helpers'); }
    Handlebars.Utils.extend(this.helpers, name);
  } else {
    if (inverse) { fn.not = inverse; }
    this.helpers[name] = fn;
  }
};

Handlebars.registerPartial = function(name, str) {
  if (toString.call(name) === objectType) {
    Handlebars.Utils.extend(this.partials,  name);
  } else {
    this.partials[name] = str;
  }
};

Handlebars.registerHelper('helperMissing', function(arg) {
  if(arguments.length === 2) {
    return undefined;
  } else {
    throw new Error("Missing helper: '" + arg + "'");
  }
});

Handlebars.registerHelper('blockHelperMissing', function(context, options) {
  var inverse = options.inverse || function() {}, fn = options.fn;

  var type = toString.call(context);

  if(type === functionType) { context = context.call(this); }

  if(context === true) {
    return fn(this);
  } else if(context === false || context == null) {
    return inverse(this);
  } else if(type === "[object Array]") {
    if(context.length > 0) {
      return Handlebars.helpers.each(context, options);
    } else {
      return inverse(this);
    }
  } else {
    return fn(context);
  }
});

Handlebars.K = function() {};

Handlebars.createFrame = Object.create || function(object) {
  Handlebars.K.prototype = object;
  var obj = new Handlebars.K();
  Handlebars.K.prototype = null;
  return obj;
};

Handlebars.logger = {
  DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, level: 3,

  methodMap: {0: 'debug', 1: 'info', 2: 'warn', 3: 'error'},

  // can be overridden in the host environment
  log: function(level, obj) {
    if (Handlebars.logger.level <= level) {
      var method = Handlebars.logger.methodMap[level];
      if (typeof console !== 'undefined' && console[method]) {
        console[method].call(console, obj);
      }
    }
  }
};

Handlebars.log = function(level, obj) { Handlebars.logger.log(level, obj); };

Handlebars.registerHelper('each', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
        ret = ret + fn(context[i], { data: data });
      }
    } else {
      for(var key in context) {
        if(context.hasOwnProperty(key)) {
          if(data) { data.key = key; }
          ret = ret + fn(context[key], {data: data});
          i++;
        }
      }
    }
  }

  if(i === 0){
    ret = inverse(this);
  }

  return ret;
});

Handlebars.registerHelper('if', function(conditional, options) {
  var type = toString.call(conditional);
  if(type === functionType) { conditional = conditional.call(this); }

  if(!conditional || Handlebars.Utils.isEmpty(conditional)) {
    return options.inverse(this);
  } else {
    return options.fn(this);
  }
});

Handlebars.registerHelper('unless', function(conditional, options) {
  return Handlebars.helpers['if'].call(this, conditional, {fn: options.inverse, inverse: options.fn});
});

Handlebars.registerHelper('with', function(context, options) {
  var type = toString.call(context);
  if(type === functionType) { context = context.call(this); }

  if (!Handlebars.Utils.isEmpty(context)) return options.fn(context);
});

Handlebars.registerHelper('log', function(context, options) {
  var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
  Handlebars.log(level, context);
});

// END(BROWSER)

return Handlebars;
};

},{}],2:[function(require,module,exports){
exports.attach = function(Handlebars) {

// BEGIN(BROWSER)

Handlebars.VM = {
  template: function(templateSpec) {
    // Just add water
    var container = {
      escapeExpression: Handlebars.Utils.escapeExpression,
      invokePartial: Handlebars.VM.invokePartial,
      programs: [],
      program: function(i, fn, data) {
        var programWrapper = this.programs[i];
        if(data) {
          programWrapper = Handlebars.VM.program(i, fn, data);
        } else if (!programWrapper) {
          programWrapper = this.programs[i] = Handlebars.VM.program(i, fn);
        }
        return programWrapper;
      },
      merge: function(param, common) {
        var ret = param || common;

        if (param && common) {
          ret = {};
          Handlebars.Utils.extend(ret, common);
          Handlebars.Utils.extend(ret, param);
        }
        return ret;
      },
      programWithDepth: Handlebars.VM.programWithDepth,
      noop: Handlebars.VM.noop,
      compilerInfo: null
    };

    return function(context, options) {
      options = options || {};
      var result = templateSpec.call(container, Handlebars, context, options.helpers, options.partials, options.data);

      var compilerInfo = container.compilerInfo || [],
          compilerRevision = compilerInfo[0] || 1,
          currentRevision = Handlebars.COMPILER_REVISION;

      if (compilerRevision !== currentRevision) {
        if (compilerRevision < currentRevision) {
          var runtimeVersions = Handlebars.REVISION_CHANGES[currentRevision],
              compilerVersions = Handlebars.REVISION_CHANGES[compilerRevision];
          throw "Template was precompiled with an older version of Handlebars than the current runtime. "+
                "Please update your precompiler to a newer version ("+runtimeVersions+") or downgrade your runtime to an older version ("+compilerVersions+").";
        } else {
          // Use the embedded version info since the runtime doesn't know about this revision yet
          throw "Template was precompiled with a newer version of Handlebars than the current runtime. "+
                "Please update your runtime to a newer version ("+compilerInfo[1]+").";
        }
      }

      return result;
    };
  },

  programWithDepth: function(i, fn, data /*, $depth */) {
    var args = Array.prototype.slice.call(arguments, 3);

    var program = function(context, options) {
      options = options || {};

      return fn.apply(this, [context, options.data || data].concat(args));
    };
    program.program = i;
    program.depth = args.length;
    return program;
  },
  program: function(i, fn, data) {
    var program = function(context, options) {
      options = options || {};

      return fn(context, options.data || data);
    };
    program.program = i;
    program.depth = 0;
    return program;
  },
  noop: function() { return ""; },
  invokePartial: function(partial, name, context, helpers, partials, data) {
    var options = { helpers: helpers, partials: partials, data: data };

    if(partial === undefined) {
      throw new Handlebars.Exception("The partial " + name + " could not be found");
    } else if(partial instanceof Function) {
      return partial(context, options);
    } else if (!Handlebars.compile) {
      throw new Handlebars.Exception("The partial " + name + " could not be compiled when running in runtime-only mode");
    } else {
      partials[name] = Handlebars.compile(partial, {data: data !== undefined});
      return partials[name](context, options);
    }
  }
};

Handlebars.template = Handlebars.VM.template;

// END(BROWSER)

return Handlebars;

};

},{}],3:[function(require,module,exports){
exports.attach = function(Handlebars) {

var toString = Object.prototype.toString;

// BEGIN(BROWSER)

var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

Handlebars.Exception = function(message) {
  var tmp = Error.prototype.constructor.apply(this, arguments);

  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
  for (var idx = 0; idx < errorProps.length; idx++) {
    this[errorProps[idx]] = tmp[errorProps[idx]];
  }
};
Handlebars.Exception.prototype = new Error();

// Build out our basic SafeString type
Handlebars.SafeString = function(string) {
  this.string = string;
};
Handlebars.SafeString.prototype.toString = function() {
  return this.string.toString();
};

var escape = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "`": "&#x60;"
};

var badChars = /[&<>"'`]/g;
var possible = /[&<>"'`]/;

var escapeChar = function(chr) {
  return escape[chr] || "&amp;";
};

Handlebars.Utils = {
  extend: function(obj, value) {
    for(var key in value) {
      if(value.hasOwnProperty(key)) {
        obj[key] = value[key];
      }
    }
  },

  escapeExpression: function(string) {
    // don't escape SafeStrings, since they're already safe
    if (string instanceof Handlebars.SafeString) {
      return string.toString();
    } else if (string == null || string === false) {
      return "";
    }

    // Force a string conversion as this will be done by the append regardless and
    // the regex test will do this transparently behind the scenes, causing issues if
    // an object's to string has escaped characters in it.
    string = string.toString();

    if(!possible.test(string)) { return string; }
    return string.replace(badChars, escapeChar);
  },

  isEmpty: function(value) {
    if (!value && value !== 0) {
      return true;
    } else if(toString.call(value) === "[object Array]" && value.length === 0) {
      return true;
    } else {
      return false;
    }
  }
};

// END(BROWSER)

return Handlebars;
};

},{}],4:[function(require,module,exports){
module.exports = exports = require('handlebars/lib/handlebars/base.js').create()
require('handlebars/lib/handlebars/utils.js').attach(exports)
require('handlebars/lib/handlebars/runtime.js').attach(exports)
},{"handlebars/lib/handlebars/base.js":1,"handlebars/lib/handlebars/runtime.js":2,"handlebars/lib/handlebars/utils.js":3}],5:[function(require,module,exports){
var Application;

Application = {
  initialize: function() {
    var AppData, HomeView, InputItemView, LoginView, OutputView, Router, TimelineData, TimelineDataAlt, TimelineView;
    AppData = require('./data/WizardContent');
    TimelineData = require('./data/TimelineData');
    TimelineDataAlt = require('./data/TimelineDataAlt');
    this.WizardConfig = require('./data/WizardConfig');
    this.data = AppData;
    this.timelineData = TimelineData;
    this.timelineDataAlt = TimelineDataAlt;
    HomeView = require('./views/HomeView');
    LoginView = require('./views/LoginView');
    Router = require('./routers/Router');
    InputItemView = require('./views/InputItemView');
    OutputView = require('./views/OutputView');
    TimelineView = require('./views/TimelineView');
    this.homeView = new HomeView();
    this.loginView = new LoginView();
    this.inputItemView = new InputItemView();
    this.outputView = new OutputView();
    this.timelineView = new TimelineView();
    return this.router = new Router();
  }
};

module.exports = Application;



},{"./data/TimelineData":6,"./data/TimelineDataAlt":7,"./data/WizardConfig":8,"./data/WizardContent":9,"./routers/Router":16,"./views/HomeView":35,"./views/InputItemView":36,"./views/LoginView":37,"./views/OutputView":38,"./views/TimelineView":42}],6:[function(require,module,exports){
var TimelineData;

TimelineData = [
  {
    type: 'week',
    title: ['Wikipedia essentials'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}'],
    assignments: [],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 5
  }, {
    type: 'week',
    action: 'combine',
    title: ['Editing basics'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}'],
    milestones: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}'],
    readings: []
  }, {
    type: 'break',
    value: 8
  }, {
    type: 'week',
    action: 'combine',
    title: ['Exploring the topic area'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Using sources and choosing articles'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose articles from a list}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = Week 5}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Finalizing topics and starting research'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 7
  }, {
    type: 'week',
    action: 'combine',
    title: ['Drafting starter articles'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline }}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline | sandbox = no }}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Outline as lead section }}'],
    milestones: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}'],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Moving articles to the main space'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Building articles'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 2
  }, {
    type: 'week',
    action: 'combine',
    title: ['Creating first draft'],
    in_class: [],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 6
  }, {
    type: 'week',
    action: 'combine',
    title: ['Getting and giving feedback'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}'],
    milestones: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Responding to feedback'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}'],
    milestones: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'],
    readings: []
  }, {
    type: 'break',
    value: 1
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 3
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 4
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 9
  }, {
    type: 'week',
    action: 'combine',
    title: ['Class presentations and finishing touches'],
    in_class: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}'],
    assignments: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}', '{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}'],
    milestones: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'],
    readings: []
  }, {
    type: 'break',
    value: 10
  }, {
    type: 'week',
    action: 'combine',
    title: ['Due date'],
    in_class: [],
    assignments: [],
    milestones: ['{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}'],
    readings: []
  }
];

module.exports = TimelineData;



},{}],7:[function(require,module,exports){
var TimelineDataAlt;

TimelineDataAlt = [
  {
    type: 'week',
    title: ['Wikipedia essentials'],
    in_class: ['Intro to Wikipedia'],
    assignments: [],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 5
  }, {
    type: 'week',
    action: 'combine',
    title: ['Editing basics'],
    in_class: ['Editing basics in class'],
    assignments: ['Complete the training', 'Create userpage and sign up', 'Practice communicating'],
    milestones: [
      {
        title: 'Students enrolled'
      }
    ],
    readings: []
  }, {
    type: 'break',
    value: 8
  }, {
    type: 'week',
    action: 'combine',
    title: ['Exploring the topic area'],
    in_class: ['Editing basics in class'],
    assignments: ['Evaluate an article', 'Copyedit an article'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Using sources and choosing articles'],
    in_class: ['Using sources in class'],
    assignments: ['Add to an article', 'Illustrate an article', 'List article choices', 'Choose articles from a list', 'Evaluate article selections | due = next week'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Finalizing topics and starting research'],
    in_class: ['Discuss topics'],
    assignments: ['Select article from student choices', 'Compile a bibliography'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 7
  }, {
    type: 'week',
    action: 'combine',
    title: ['Drafting starter articles'],
    in_class: ['Discuss etiquette and sandboxes'],
    assignments: ['Conventional outline ', 'Conventional outline | sandbox = no ', 'Outline as lead section'],
    milestones: [
      {
        type: 'milestone',
        title: 'Students have started editing'
      }
    ],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Moving articles to the main space'],
    in_class: ['Main space in class'],
    assignments: ['Move to main space', 'DYK nominations', 'Expand your article'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Building articles'],
    in_class: ['Building articles in class'],
    assignments: ['Choose one peer review article', 'Choose peer review articles| peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 2
  }, {
    type: 'week',
    action: 'combine',
    title: ['Creating first draft'],
    in_class: [],
    assignments: ['Complete first draft'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 6
  }, {
    type: 'week',
    action: 'combine',
    title: ['Getting and giving feedback'],
    in_class: ['Group suggestions'],
    assignments: ['Do one peer review', 'Do peer reviews | peerreviewnumber = {{peer_feedback.peer_reviews.value}}'],
    milestones: [
      {
        title: 'Articles have been reviewed'
      }
    ],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Responding to feedback'],
    in_class: ['Media literacy discussion'],
    assignments: ['Make edits based on peer reviews'],
    milestones: [
      {
        title: 'Articles have been reviewed'
      }
    ],
    readings: []
  }, {
    type: 'break',
    value: 1
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: ['Discuss further article improvements'],
    assignments: ['Continue improving articles'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 3
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: ['Discuss further article improvements'],
    assignments: ['Continue improving articles'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 4
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: ['Discuss further article improvements'],
    assignments: ['Continue improving articles', 'Prepare in-class presentation'],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 9
  }, {
    type: 'week',
    action: 'combine',
    title: ['Class presentations and finishing touches'],
    in_class: ['In-class presentations'],
    assignments: ['Final touches to articles', 'Reflective essay', 'Wikipedia portfolio', 'Original argument paper'],
    milestones: [
      {
        title: 'Articles have been reviewed'
      }
    ],
    readings: []
  }, {
    type: 'break',
    value: 10
  }, {
    type: 'week',
    action: 'combine',
    title: ['Due date'],
    in_class: [],
    assignments: [],
    milestones: [
      {
        title: 'All students finished'
      }
    ],
    readings: []
  }
];

module.exports = TimelineDataAlt;



},{}],8:[function(require,module,exports){
var WizardConfig;

WizardConfig = {
  intro_steps: [
    {
      id: "intro",
      title: '<center>Welcome to the<br />Assignment Design Wizard!</center>',
      login_instructions: 'Click Login with Wikipedia to get started',
      instructions: '',
      inputs: [],
      sections: [
        {
          content: ["<p class='large'>This tool will help you to easily create a customized Wikipedia classroom assignment and customized syllabus for your course.</p>", "<p class='large'>When you’re finished, you'll have a ready-to-use lesson plan, with weekly assignments, published directly onto a sandbox page on Wikipedia where you can customeize it even further.</p>", "<p class='large'>Let’s start by filling in some basics about you and your course:</p>"]
        }
      ]
    }, {
      id: "assignment_selection",
      title: 'Assignment type selection',
      infoTitle: 'About assignment selections',
      formTitle: 'Available assignments:',
      instructions: "You can teach with Wikipedia in several different ways, and it's important to design an assignment that is suitable for Wikipedia <em>and</em> achieves your student learning objectives. Your first step is to choose which assignment(s) you'll be asking your students to complete as part of the course.",
      inputs: [],
      sections: [
        {
          title: '',
          content: ["<p>We've created some guidelines to help you, but you'll need to make some key decisions, such as: which learning objectives are you targeting with this assignment? What skills do your students already have? How much time can you devote to the assignment?</p>", "<p>Most instructors ask their students to write or expand an article. Students start by learning the basics of Wikipedia, and then focus on the content. They plan, research, and write a previously missing Wikipedia article, or contribute to an incomplete entry on a course-related topic. This assignment typically replaces a term paper or research project, or it forms the literature review section of a larger paper. The student learning outcome is high with this assignment, but it does take a significant amount of time. Your students need to learn both the wiki markup language and key policies and expectations of the Wikipedia-editing community.</p>", "<p>If writing an article isn't right for your class, other assignment options offer students valuable learning opportunities and help to improve Wikipedia. Select an assignment type on the left to learn more.</p>"]
        }
      ]
    }
  ],
  pathways: {
    researchwrite: [
      {
        id: "learning_essentials",
        title: 'Wikipedia essentials',
        showInOverview: true,
        formTitle: 'Choose one:',
        infoTitle: 'About Wikipedia essentials',
        instructions: "To get started, you'll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community.",
        inputs: [],
        sections: [
          {
            title: '',
            content: ['<p>As their first Wikipedia assignment milestone, you can ask the students to create user accounts and then complete the <em>online training for students</em>. This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and explains further sources of support as they continue along. It takes about an hour and ends with a certification step, which you can use to verify that students completed the training.</p>', '<p>Students who complete this training are better prepared to focus on learning outcomes, and spend less time distracted by cleaning up after errors.</p>', '<p>Will completion of the student training be part of your students\' grades? (Make your choice at the top left.)</p>']
          }, {
            title: 'Assignment milestones',
            accordian: true,
            content: ["<ul> <li>Create a user account and enroll on the course page. </li> <li>Complete the <em>online training for students</em>. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia.</li> <li>To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.</li> </ul>"]
          }
        ]
      }, {
        id: "getting_started",
        title: 'Getting started with editing',
        showInOverview: true,
        infoTitle: 'About early editing tasks',
        instructions: "It is important for students to start editing Wikipedia early on. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on.",
        formTitle: 'Which basic assignments would you like to include?',
        inputs: [],
        sections: [
          {
            title: '',
            content: ['<p>Which introductory assignments would you like to use to acclimate your students to Wikipedia? You can select none, one, or more. Whichever you select will be added to the assignment timeline.</p>', '<ul> <li><strong>Critique an article.</strong> Critically evaluate an existing Wikipedia article related to the class, and leave suggestions for improving it on the article’s talk page. </li> <li><strong>Add to an article.</strong> Using course readings or other relevant secondary sources, add 1–2 sentences of new information to a Wikipedia article related to the class. Be sure to integrate it well into the existing article, and include a citation to the source. </li> <li><strong>Copyedit an article.</strong> Browse Wikipedia until you find an article that you would like to improve, and make some edits to improve the language or formatting. </li> <li><strong>Illustrate an article.</strong> Find an opportunity to improve an article by uploading and adding a photo you took.</li> </ul>']
          }, {
            content: ['<p>For most courses, the <em>Critique an article</em> and <em>Add to an article</em> exercises provide a nice foundation for the main writing project. These have been selected by default.</p>']
          }
        ]
      }, {
        id: 'choosing_articles',
        title: 'Choosing articles',
        showInOverview: true,
        formTitle: 'How will your class select articles?',
        infoTitle: 'About choosing articles',
        inputs: [],
        sections: [
          {
            title: '',
            content: ['<p>Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.</p>', '<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>']
          }, {
            title: 'Good choice',
            accordian: true,
            content: ["<ul> <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li> <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1–2 paragraphs of information and are in need of expansion. Relevant WikiProject pages can provide a list of stubs that need improvement.</li> <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li> </ul>"]
          }, {
            title: 'Not such a good choice',
            accordian: true,
            content: ['<p>Articles that are "not such a good choice" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.</p>', "<ul> <li>You probably shouldn't try to completely overhaul articles on very broad topics (e.g., Law).</li> <li>You should probably avoid trying to improve articles on topics that are highly controversial (for example, Global Warming, Abortion, or Scientology). You may be more successful starting a sub-article on the topic instead.</li> <li>Don't work on an article that is already of high quality on Wikipedia, unless you discuss a specific plan for improving it with other editors beforehand.</li> <li>Avoid working on something with scarce literature. Wikipedia articles cite secondary literature sources, so it's important to have enough sources for verification and to provide a neutral point of view.</li> <li>Don't start articles with titles that imply an argument or essay-like approach (e.g., The Effects That The Recent Sub-Prime Mortgage Crisis has had on the US and Global Economics). These type of titles, and most likely the content too, may not be appropriate for an encyclopedia.</li> </ul>"]
          }, {
            title: '',
            content: ['<p>As the instructor, you should apply your own expertise to examining Wikipedia’s coverage of your field. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia.</p>', '<p>There are two recommended options for selecting articles:</p>']
          }, {
            title: 'Instructor prepares a list',
            content: ['<p>You (the instructor) prepare a list of appropriate \'non-existent\', \'stub\' or \'start\' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner.</p>']
          }, {
            title: 'Students find articles',
            content: ['<p>Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Having students find their own articles provides them with a sense of motivation and ownership over the assignment and exercises their critical thinking skills as they identify content gaps, but it may also lead to choices that are further afield from course material.</p>']
          }
        ]
      }, {
        id: "research_planning",
        title: 'Research and planning',
        showInOverview: true,
        formTitle: 'How should students plan their articles?',
        infoTitle: 'About research and planning',
        sections: [
          {
            title: '',
            content: ["<p>Students often wait until the last minute to do their research, or choose sources unsuitable for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians.</p>", "<p>Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?</p>"]
          }
        ],
        inputs: []
      }, {
        id: "drafts_mainspace",
        showInOverview: true,
        title: 'Drafts and mainspace',
        formTitle: 'Choose one:',
        infoTitle: 'About drafts and mainspace',
        instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandbox pages. There are pros and cons of each approach.',
        sections: [
          {
            title: 'Pros and cons of sandboxes',
            content: ["<p>Sandboxes — pages associated with an individual editor that are not considered part of Wikipedia proper — make students feel safe. They can edit without the pressure of the whole world reading their drafts or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.</p>"]
          }, {
            title: 'Pros and cons of editing live',
            content: ["<p>Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed.</p>"]
          }, {
            title: '',
            content: '"<p>Will you have your students draft their early work in sandboxes, or work live from the beginning?</p>"'
          }
        ],
        inputs: []
      }, {
        id: "peer_feedback",
        title: 'Peer feedback',
        showInOverview: true,
        infoTitle: 'About peer feedback',
        formTitle: "How many peer reviews should each student conduct?",
        instructions: "Collaboration is a critical element of contributing to Wikipedia.",
        sections: [
          {
            title: '',
            content: ["<p>For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term. Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers.</p>", "<p>Peer reviews are another chance for students to practice critical thinking. Useful reviews focus on specific issues that can be improved. Since students are usually hesitant to criticize their classmates—and other Wikipedia editors may get annoyed with a stream of praise from students that glosses over an article's shortcomings—it's important to gives examples of the kinds of constructively critical feedback that are the most helpful.</p>", "<p>How many peer reviews will you ask each student to contribute during the course?</p>"]
          }
        ],
        inputs: []
      }, {
        id: "supplementary_assignments",
        title: 'Supplementary assignments',
        showInOverview: true,
        formTitle: 'Choose supplementary assignments (optional):',
        infoTitle: 'About supplementary assignments',
        instructions: "By the time students have made improvements based on classmates' comments—and ideally suggestions from you as well—they should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria to create great content.",
        sections: [
          {
            title: '',
            content: ["<p>You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impacts and limits of Wikipedia. Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion in class about what the students have done so far and why (or whether) it matters.</p>", "<p>In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' work and learning outcomes. On the left are some of the effective supplementary assignments that instructors often use. Scroll over each for more information, and select any that you wish to use for your course.</p>"]
          }
        ],
        inputs: []
      }, {
        id: "dyk",
        title: 'DYK process',
        showInOverview: false,
        infoTitle: 'About the <em>Did You Know</em> process',
        formTitle: "Would you like to include DYK as an ungraded option?",
        sections: [
          {
            title: '',
            content: ["<p>Did You Know (DYK) is a section on Wikipedia’s main page highlighting new content that has been added to Wikipedia in the last seven days. DYK can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its 6 hours in the spotlight.</p>", "<p>The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x or more) within the last seven days. Students who meet this criteria may want to nominate their contributions for DYK.</p>", "<p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, as the DYK nomination process can be difficult for newcomers to navigate. However, it makes a great stretch goal when used selectively.</p>", "<p>Would you like to include DYK as an ungraded option? If so, the Wiki Ed team can help you and your students during the term to identify work that may be a good candidate for DYK and answer questions you may have about the nomination process.</p>"]
          }
        ],
        inputs: []
      }, {
        id: "ga",
        title: 'Good Article process',
        showInOverview: false,
        infoTitle: 'About the <em>Good Article</em> process',
        formTitle: "Would you like to include this as an ungraded option?",
        sections: [
          {
            title: '',
            content: ["<p>Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>", "<p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very well-developed. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term, and those written by student editors who are already experienced, strong writers and who are willing to come back to address reviewer feedback (even after the term ends)</em>.</p>", "<p>Would you like to include this as an ungraded option? If so, the Wiki Ed team can provide advice and support to high-achieving students who are interested in the Good Article process.</p>"]
          }
        ],
        inputs: []
      }
    ],
    multimedia: [],
    copyedit: []
  },
  outro_steps: [
    {
      id: "grading",
      title: 'Grading',
      showInOverview: false,
      formTitle: "How will students' grades for assignments be determined?",
      infoTitle: "About grading",
      instructions: 'Grading Wikipedia assignments can be a challenge. Here are some tips for grading your Wikipedia assignments:',
      sections: [
        {
          title: 'Know all of your students\' Wikipedia usernames.',
          accordian: true,
          content: ["<p>Without knowing the students' usernames, you won't be able to grade them.</p>", "<p>Make sure all students enroll on the course page. Once all students have signed the list, you can click on \"user contributions\" (in the menu bar on the left hand side of your browser screen) to review that student's activities on Wikipedia. If you have made student training compulsory, you can check the <a href='https://en.wikipedia.org/wiki/Wikipedia:Training/For_students/Training_feedback' target='_blank'>feedback page</a> to see which students have completed it.</p>"]
        }, {
          title: 'Be specific about your expectations.',
          accordian: true,
          content: ["<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing.</p>"]
        }, {
          title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.',
          accordian: true,
          content: ["<p>You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors.</p>", "<p>Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community.</p>"]
        }
      ],
      inputs: []
    }, {
      id: "overview",
      title: 'Assignment overview',
      showInOverview: false,
      infoTitle: "About the course",
      formTitle: "",
      sections: [
        {
          content: ["<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:", "<ul> <li>topics you're covering in the class</li> <li>what students will be asked to do on Wikipedia</li> <li>what types of articles your class will be working on</li> </ul>"]
        }, {
          content: ["<p class='description-container' style='margin-bottom:0;'></p>", "<div> <div class='preview-container'></div> </div>"]
        }, {
          content: ["<div class='step-form-dates'></div>"]
        }, {
          title: '',
          content: ["<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"]
        }
      ],
      inputs: []
    }
  ]
};

module.exports = WizardConfig;



},{}],9:[function(require,module,exports){
var WizardContent;

WizardContent = [
  {
    id: "intro",
    title: '<center>Welcome to the<br />Assignment Design Wizard!</center>',
    login_instructions: 'Click Login with Wikipedia to get started',
    instructions: '',
    inputs: [],
    sections: [
      {
        content: ["<p class='large'>This tool will help you to easily create a customized Wikipedia classroom assignment and customized syllabus for your course.</p>", "<p class='large'>When you’re finished, you'll have a ready-to-use lesson plan, with weekly assignments, published directly onto a sandbox page on Wikipedia where you can customeize it even further.</p>", "<p class='large'>Let’s start by filling in some basics about you and your course:</p>"]
      }
    ]
  }, {
    id: "assignment_selection",
    title: 'Assignment type selection',
    infoTitle: 'About assignment selections',
    formTitle: 'Available assignments:',
    instructions: "You can teach with Wikipedia in several different ways, and it's important to design an assignment that is suitable for Wikipedia <em>and</em> achieves your student learning objectives. Your first step is to choose which assignment(s) you'll be asking your students to complete as part of the course.",
    inputs: [],
    sections: [
      {
        title: '',
        content: ["<p>We've created some guidelines to help you, but you'll need to make some key decisions, such as: which learning objectives are you targeting with this assignment? What skills do your students already have? How much time can you devote to the assignment?</p>", "<p>Most instructors ask their students to write or expand an article. Students start by learning the basics of Wikipedia, and then focus on the content. They plan, research, and write a previously missing Wikipedia article, or contribute to an incomplete entry on a course-related topic. This assignment typically replaces a term paper or research project, or it forms the literature review section of a larger paper. The student learning outcome is high with this assignment, but it does take a significant amount of time. Your students need to learn both the wiki markup language and key policies and expectations of the Wikipedia-editing community.</p>", "<p>If writing an article isn't right for your class, other assignment options offer students valuable learning opportunities and help to improve Wikipedia. Select an assignment type on the left to learn more.</p>"]
      }
    ]
  }, {
    id: "learning_essentials",
    title: 'Wikipedia essentials',
    formTitle: 'Choose one:',
    infoTitle: 'About Wikipedia essentials',
    instructions: "To get started, you'll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community.",
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>As their first Wikipedia assignment milestone, you can ask the students to create user accounts and then complete the <em>online training for students</em>. This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and explains further sources of support as they continue along. It takes about an hour and ends with a certification step, which you can use to verify that students completed the training.</p>', '<p>Students who complete this training are better prepared to focus on learning outcomes, and spend less time distracted by cleaning up after errors.</p>', '<p>Will completion of the student training be part of your students\' grades? (Make your choice at the top left.)</p>']
      }, {
        title: 'Assignment milestones',
        accordian: true,
        content: ["<ul> <li>Create a user account and enroll on the course page. </li> <li>Complete the <em>online training for students</em>. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia.</li> <li>To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.</li> </ul>"]
      }
    ]
  }, {
    id: "getting_started",
    title: 'Getting started with editing',
    infoTitle: 'About early editing tasks',
    instructions: "It is important for students to start editing Wikipedia early on. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on.",
    formTitle: 'Which basic assignments would you like to include?',
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>Which introductory assignments would you like to use to acclimate your students to Wikipedia? You can select none, one, or more. Whichever you select will be added to the assignment timeline.</p>', '<ul> <li><strong>Critique an article.</strong> Critically evaluate an existing Wikipedia article related to the class, and leave suggestions for improving it on the article’s talk page. </li> <li><strong>Add to an article.</strong> Using course readings or other relevant secondary sources, add 1–2 sentences of new information to a Wikipedia article related to the class. Be sure to integrate it well into the existing article, and include a citation to the source. </li> <li><strong>Copyedit an article.</strong> Browse Wikipedia until you find an article that you would like to improve, and make some edits to improve the language or formatting. </li> <li><strong>Illustrate an article.</strong> Find an opportunity to improve an article by uploading and adding a photo you took.</li> </ul>']
      }, {
        content: ['<p>For most courses, the <em>Critique an article</em> and <em>Add to an article</em> exercises provide a nice foundation for the main writing project. These have been selected by default.</p>']
      }
    ]
  }, {
    id: 'choosing_articles',
    title: 'Choosing articles',
    formTitle: 'How will your class select articles?',
    infoTitle: 'About choosing articles',
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.</p>', '<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>']
      }, {
        title: 'Good choice',
        accordian: true,
        content: ["<ul> <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li> <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1–2 paragraphs of information and are in need of expansion. Relevant WikiProject pages can provide a list of stubs that need improvement.</li> <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li> </ul>"]
      }, {
        title: 'Not such a good choice',
        accordian: true,
        content: ['<p>Articles that are "not such a good choice" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.</p>', "<ul> <li>You probably shouldn't try to completely overhaul articles on very broad topics (e.g., Law).</li> <li>You should probably avoid trying to improve articles on topics that are highly controversial (for example, Global Warming, Abortion, or Scientology). You may be more successful starting a sub-article on the topic instead.</li> <li>Don't work on an article that is already of high quality on Wikipedia, unless you discuss a specific plan for improving it with other editors beforehand.</li> <li>Avoid working on something with scarce literature. Wikipedia articles cite secondary literature sources, so it's important to have enough sources for verification and to provide a neutral point of view.</li> <li>Don't start articles with titles that imply an argument or essay-like approach (e.g., The Effects That The Recent Sub-Prime Mortgage Crisis has had on the US and Global Economics). These type of titles, and most likely the content too, may not be appropriate for an encyclopedia.</li> </ul>"]
      }, {
        title: '',
        content: ['<p>As the instructor, you should apply your own expertise to examining Wikipedia’s coverage of your field. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia.</p>', '<p>There are two recommended options for selecting articles:</p>']
      }, {
        title: 'Instructor prepares a list',
        content: ['<p>You (the instructor) prepare a list of appropriate \'non-existent\', \'stub\' or \'start\' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner.</p>']
      }, {
        title: 'Students find articles',
        content: ['<p>Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Having students find their own articles provides them with a sense of motivation and ownership over the assignment and exercises their critical thinking skills as they identify content gaps, but it may also lead to choices that are further afield from course material.</p>']
      }
    ]
  }, {
    id: "research_planning",
    title: 'Research and planning',
    formTitle: 'How should students plan their articles?',
    infoTitle: 'About research and planning',
    sections: [
      {
        title: '',
        content: ["<p>Students often wait until the last minute to do their research, or choose sources unsuitable for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians.</p>", "<p>Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?</p>"]
      }
    ],
    inputs: []
  }, {
    id: "drafts_mainspace",
    title: 'Drafts and mainspace',
    formTitle: 'Choose one:',
    infoTitle: 'About drafts and mainspace',
    instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandbox pages. There are pros and cons of each approach.',
    sections: [
      {
        title: 'Pros and cons of sandboxes',
        content: ["<p>Sandboxes — pages associated with an individual editor that are not considered part of Wikipedia proper — make students feel safe. They can edit without the pressure of the whole world reading their drafts or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.</p>"]
      }, {
        title: 'Pros and cons of editing live',
        content: ["<p>Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed.</p>"]
      }, {
        title: '',
        content: '"<p>Will you have your students draft their early work in sandboxes, or work live from the beginning?</p>"'
      }
    ],
    inputs: []
  }, {
    id: "peer_feedback",
    title: 'Peer feedback',
    infoTitle: 'About peer feedback',
    formTitle: "How many peer reviews should each student conduct?",
    instructions: "Collaboration is a critical element of contributing to Wikipedia.",
    sections: [
      {
        title: '',
        content: ["<p>For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term. Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers.</p>", "<p>Peer reviews are another chance for students to practice critical thinking. Useful reviews focus on specific issues that can be improved. Since students are usually hesitant to criticize their classmates—and other Wikipedia editors may get annoyed with a stream of praise from students that glosses over an article's shortcomings—it's important to gives examples of the kinds of constructively critical feedback that are the most helpful.</p>", "<p>How many peer reviews will you ask each student to contribute during the course?</p>"]
      }
    ],
    inputs: []
  }, {
    id: "supplementary_assignments",
    title: 'Supplementary assignments',
    formTitle: 'Choose supplementary assignments (optional):',
    infoTitle: 'About supplementary assignments',
    instructions: "By the time students have made improvements based on classmates' comments—and ideally suggestions from you as well—they should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria to create great content.",
    sections: [
      {
        title: '',
        content: ["<p>You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impacts and limits of Wikipedia. Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion in class about what the students have done so far and why (or whether) it matters.</p>", "<p>In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' work and learning outcomes. On the left are some of the effective supplementary assignments that instructors often use. Scroll over each for more information, and select any that you wish to use for your course.</p>"]
      }
    ],
    inputs: []
  }, {
    id: "dyk",
    title: 'DYK process',
    infoTitle: 'About the <em>Did You Know</em> process',
    formTitle: "Would you like to include DYK as an ungraded option?",
    sections: [
      {
        title: '',
        content: ["<p>Did You Know (DYK) is a section on Wikipedia’s main page highlighting new content that has been added to Wikipedia in the last seven days. DYK can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its 6 hours in the spotlight.</p>", "<p>The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x or more) within the last seven days. Students who meet this criteria may want to nominate their contributions for DYK.</p>", "<p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, as the DYK nomination process can be difficult for newcomers to navigate. However, it makes a great stretch goal when used selectively.</p>", "<p>Would you like to include DYK as an ungraded option? If so, the Wiki Ed team can help you and your students during the term to identify work that may be a good candidate for DYK and answer questions you may have about the nomination process.</p>"]
      }
    ],
    inputs: []
  }, {
    id: "ga",
    title: 'Good Article process',
    infoTitle: 'About the <em>Good Article</em> process',
    formTitle: "Would you like to include this as an ungraded option?",
    sections: [
      {
        title: '',
        content: ["<p>Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>", "<p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very well-developed. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term, and those written by student editors who are already experienced, strong writers and who are willing to come back to address reviewer feedback (even after the term ends)</em>.</p>", "<p>Would you like to include this as an ungraded option? If so, the Wiki Ed team can provide advice and support to high-achieving students who are interested in the Good Article process.</p>"]
      }
    ],
    inputs: []
  }, {
    id: "grading",
    title: 'Grading',
    formTitle: "How will students' grades for assignments be determined?",
    infoTitle: "About grading",
    instructions: 'Grading Wikipedia assignments can be a challenge. Here are some tips for grading your Wikipedia assignments:',
    sections: [
      {
        title: 'Know all of your students\' Wikipedia usernames.',
        accordian: true,
        content: ["<p>Without knowing the students' usernames, you won't be able to grade them.</p>", "<p>Make sure all students enroll on the course page. Once all students have signed the list, you can click on \"user contributions\" (in the menu bar on the left hand side of your browser screen) to review that student's activities on Wikipedia. If you have made student training compulsory, you can check the <a href='https://en.wikipedia.org/wiki/Wikipedia:Training/For_students/Training_feedback' target='_blank'>feedback page</a> to see which students have completed it.</p>"]
      }, {
        title: 'Be specific about your expectations.',
        accordian: true,
        content: ["<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing.</p>"]
      }, {
        title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.',
        accordian: true,
        content: ["<p>You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors.</p>", "<p>Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community.</p>"]
      }
    ],
    inputs: []
  }, {
    id: "overview",
    title: 'Assignment overview',
    infoTitle: "About the course",
    formTitle: "",
    sections: [
      {
        content: ["<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:", "<ul> <li>topics you're covering in the class</li> <li>what students will be asked to do on Wikipedia</li> <li>what types of articles your class will be working on</li> </ul>"]
      }, {
        content: ["<p><textarea id='short_description' rows='14' style='width:100%;background-color:rgba(242,242,242,1.0);border:1px solid rgba(202,202,202,1.0);padding:10px 15px;font-size: 16px;line-height 23px;letter-spacing: 0.25px;'></textarea></p>"]
      }, {
        content: ["<div class='step-form-dates'></div>"]
      }, {
        title: '',
        content: ["<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"]
      }
    ],
    inputs: []
  }
];

module.exports = WizardContent;



},{}],10:[function(require,module,exports){
var WizardCourseInfo;

WizardCourseInfo = {
  researchwrite: {
    title: "Research and write a Wikipedia article",
    description: ["You guide your students to select course-related topics that are not well-covered on Wikipedia, and they work individually or in small teams to develop content — either expanding existing articles or creating new ones. Students analyze the current gaps, start their research to find high-quality secondary sources, and then consider the best way to organize the available information. Then it's time for them in turn to: propose an outline; draft new articles or new content for existing ones; provide and respond to peer feedback; and move their work into the live article namespace on Wikipedia.", "Along the way, students may work with experienced Wikipedia editors who can offer critical feedback and help make sure articles meet Wikipedia's standards and style conventions, and it's important to incorporate time into the assignment for the students to integrate those suggestions. Students who do great work may have their articles highlighted on Wikipedia's main page, and high quality articles will help inform thousands of future readers about the selected topic. ", "Optionally, you may ask your students to write a reflective paper about their Wikipedia experience, present their contributions in class, or develop their own conclusions and arguments in a supplementary essay."],
    min_timeline: "6 weeks",
    rec_timeline: "12 weeks",
    best_for: ["Classes with fewer than 30 students", "Advanced undergrads or grad students"],
    not_for: ["Large survey classes", "Intro (100-level) classes"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Develop writing skills",
        stars: 4
      }, {
        text: "Increase media and information fluency",
        stars: 4
      }, {
        text: "Improve critical thinking and research skills",
        stars: 4
      }, {
        text: "Foster collaboration",
        stars: 4
      }, {
        text: "Develop technical and communication skills",
        stars: 4
      }
    ]
  },
  sourcecentered: {
    title: "Source-centered additions",
    description: ["Students read Wikipedia articles in a self-selected subject area to identify articles in need of revision or improvement, such as those with \"citation needed\" tags. Students will find reliable sources to use as references for uncited content. This assignment includes a persuasive essay in which students make a case for their suggested changes, why they believe they are qualified to make those changes, and why their selected sources provide support. After making their contributions, students reflect on their work with a formal paper, and discuss whether they've accomplished their stated goals."],
    min_timeline: "6 weeks",
    rec_timeline: "8 weeks",
    best_for: ["Large classes", "Advanced undergraduates"],
    not_for: ["Intro (100-level) courses"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 2
      }, {
        text: "Writing skills development",
        stars: 4
      }, {
        text: "Increase media and information fluency",
        stars: 3
      }, {
        text: "Improve critical thinking and research skills",
        stars: 3
      }, {
        text: "Foster collaboration",
        stars: 1
      }, {
        text: "Develop technical and communication skills",
        stars: 1
      }
    ]
  },
  findfix: {
    title: "Find and fix errors",
    description: ["Students are asked to find an article about a course-related topic with which they are extremely familiar that has some mistakes. Students take what they know about the topic, find factual errors and other substantive mistakes, and correct those."],
    min_timeline: "6 weeks",
    rec_timeline: "8 weeks",
    best_for: ["Graduate students"],
    not_for: ["Intro (100-level) courses"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Writing skills development",
        stars: 4
      }, {
        text: "Increase media and information fluency",
        stars: 2
      }, {
        text: "Improve critical thinking and research skills",
        stars: 2
      }, {
        text: "Foster collaboration",
        stars: 2
      }, {
        text: "Develop technical and communication skills",
        stars: 3
      }
    ]
  },
  plagiarism: {
    title: "Identify and fix close paraphrasing / plagiarism",
    description: ["Students search through Wikipedia articles to find instances of close paraphrasing or plagiarism, then reword the information in their own language to be appropriate for Wikipedia. In this assignment, students gain a deeper understanding of what plagiarism is and how to avoid it."],
    min_timeline: "4 weeks",
    rec_timeline: "6 weeks",
    best_for: ["TBD"],
    not_for: ["TBD"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 2
      }, {
        text: "Writing skills development",
        stars: 4
      }, {
        text: "Increase media and information fluency",
        stars: 2
      }, {
        text: "Improve critical thinking and research skills",
        stars: 4
      }, {
        text: "Foster collaboration",
        stars: 1
      }, {
        text: "Develop technical and communication skills",
        stars: 2
      }
    ]
  },
  translate: {
    title: "Identify and fix close paraphrasing / plagiarism",
    description: ["This is a practical assignment for language instructors. Students select a Wikipedia article in the language they are studying, and translate it into their native language. Students should start with high-quality articles which are not available in their native language. This assignment provides practical translation advice with the incentive of real public service, as students expand the representation of the target culture on Wikipedia."],
    min_timeline: "4 weeks",
    rec_timeline: "6+ weeks",
    best_for: ["Language courses"],
    not_for: ["Students translating <em>from</em> their native language to the language they're studying"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Writing skills development",
        stars: 1
      }, {
        text: "Increase media and information fluency",
        stars: 1
      }, {
        text: "Improve critical thinking and research skills",
        stars: 3
      }, {
        text: "Foster collaboration",
        stars: 4
      }, {
        text: "Develop technical and communication skills",
        stars: 4
      }
    ]
  },
  copyedit: {
    title: "Copyedit",
    description: ["Students are asked to copyedit Wikipedia articles, engaging editors in conversation about their writing and improving the clarity of the language of the material. Students learn to write in different voices for different audiences. In learning about the specific voice on Wikipedia, they learn about the “authoritative” voice and how its tone can convince, even if the content is questionable."],
    min_timeline: "2 weeks",
    rec_timeline: "4 weeks",
    best_for: ["English grammar courses"],
    not_for: ["Students without strong writing skills"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Writing skills development",
        stars: 4
      }, {
        text: "Increase media and information fluency",
        stars: 2
      }, {
        text: "Improve critical thinking and research skills",
        stars: 2
      }, {
        text: "Foster collaboration",
        stars: 2
      }, {
        text: "Develop technical and communication skills",
        stars: 3
      }
    ]
  },
  evaluate: {
    title: "Evaluate articles",
    description: ["First, students write a report analyzing the state of Wikipedia articles on course-related topics with an eye toward future revisions. This encourages a critical reading of both content and form. Then, the students edit articles in sandboxes with feedback from the professor, carefully selecting and adding references to improve the article based on their critical essays. Finally, they compose a self-assessment evaluating their own contributions."],
    min_timeline: "5 weeks",
    rec_timeline: "8 weeks",
    best_for: ["Classes with fewer than 30 students"],
    not_for: ["Large survey classes"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Writing skills development",
        stars: 3
      }, {
        text: "Increase media and information fluency",
        stars: 4
      }, {
        text: "Improve critical thinking and research skills",
        stars: 4
      }, {
        text: "Foster collaboration",
        stars: 1
      }, {
        text: "Develop technical and communication skills",
        stars: 4
      }
    ]
  },
  multimedia: {
    title: " Add images or multimedia",
    description: ["If your students are adept at media, this can be a great way of contributing to Wikipedia in a non-textual way. In the past, students have photographed local monuments to illustrate articles, designed infographics to illustrate concepts, or created videos that demonstrated audio-visually what articles describe in words."],
    min_timeline: "2 weeks",
    rec_timeline: "3 weeks",
    best_for: ["Students studying photography, videography, or graphic design"],
    not_for: ["Students without media skills"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Writing skills development",
        stars: 1
      }, {
        text: "Increase media and information fluency",
        stars: 4
      }, {
        text: "Improve critical thinking and research skills",
        stars: 2
      }, {
        text: "Foster collaboration",
        stars: 3
      }, {
        text: "Develop technical and communication skills",
        stars: 4
      }
    ]
  }
};

module.exports = WizardCourseInfo;



},{}],11:[function(require,module,exports){
var WizardStepInputs;

WizardStepInputs = {
  intro: {
    teacher: {
      type: 'text',
      label: 'Instructor name',
      id: 'teacher',
      value: '',
      required: true
    },
    course_name: {
      type: 'text',
      label: 'Course name',
      id: 'course_name',
      value: '',
      required: true
    },
    school: {
      type: 'text',
      label: 'University',
      id: 'school',
      value: '',
      required: true
    },
    subject: {
      type: 'text',
      label: 'Subject',
      id: 'subject',
      value: '',
      required: true
    },
    students: {
      type: 'text',
      label: 'Approximate number of students',
      id: 'students',
      value: '',
      required: true
    },
    instructor_username: {
      label: 'Username (temporary)',
      id: 'instructor_username',
      value: ''
    },
    wizard_start_date: {
      isDate: true,
      month: '',
      day: '',
      year: '',
      value: '',
      required: true
    },
    wizard_end_date: {
      isDate: true,
      month: '',
      day: '',
      year: '',
      value: '',
      required: true
    }
  },
  multimedia_1: {
    multimedia_1_1: {
      type: 'checkbox',
      id: 'multimedia_1_1',
      selected: true,
      label: 'Text for the question 1?',
      disabled: false,
      exclusive: false,
      required: false
    },
    multimedia_1_2: {
      type: 'checkbox',
      id: 'multimedia_1_2',
      selected: true,
      label: 'Text for the question 2?',
      disabled: false,
      exclusive: false,
      required: false
    }
  },
  multimedia_2: {
    multimedia_2_1: {
      type: 'checkbox',
      id: 'multimedia_2_1',
      selected: false,
      label: 'Text for the question 1?',
      disabled: false,
      exclusive: false,
      required: false
    },
    multimedia_2_2: {
      type: 'checkbox',
      id: 'multimedia_2_2',
      selected: false,
      label: 'Text for the question 2?',
      disabled: false,
      exclusive: false,
      required: false
    }
  },
  copyedit_1: {
    copyedit_1_1: {
      type: 'radioBox',
      id: 'copyedit_1_1',
      selected: false,
      label: 'Text for the question 1?',
      disabled: false,
      exclusive: false,
      required: false
    },
    copyedit_1_2: {
      type: 'radioBox',
      id: 'copyedit_1_2',
      selected: false,
      label: 'Text for the question 2?',
      disabled: false,
      exclusive: false,
      required: false
    }
  },
  copyedit_2: {
    copyedit_2_1: {
      type: 'radioBox',
      id: 'copyedit_2_1',
      selected: false,
      label: 'Text for the question 1?',
      disabled: false,
      exclusive: false,
      required: false
    },
    copyedit_2_2: {
      type: 'radioBox',
      id: 'copyedit_2_2',
      selected: false,
      label: 'Text for the question 2?',
      disabled: false,
      exclusive: false,
      required: false
    }
  },
  assignment_selection: {
    researchwrite: {
      type: 'checkbox',
      id: 'researchwrite',
      selected: false,
      label: 'Research and write an article',
      exclusive: true,
      hasCourseInfo: true,
      required: true
    },
    multimedia: {
      type: 'checkbox',
      id: 'multimedia',
      selected: false,
      label: 'Add images & multimedia',
      exclusive: false,
      hasCourseInfo: true,
      disabled: false
    },
    copyedit: {
      type: 'checkbox',
      id: 'copyedit',
      selected: false,
      label: 'Copyedit articles',
      exclusive: false,
      hasCourseInfo: true,
      disabled: false
    },
    something_else: {
      type: 'link',
      href: 'mailto:contact@wikiedu.org',
      id: 'something_else',
      selected: false,
      label: 'A different assignment? Get in touch here.',
      exclusive: false,
      hasCourseInfo: false,
      tipInfo: {
        title: '',
        content: "Have another idea for incorporating Wikipedia into your class? We've found that these assignments work well, but they aren't the only way to do it. Get in touch, and we can talk things through: <a style='color:#505a7f;' href='mailto:contact@wikiedu.org'>contact@wikiedu.org</a>."
      }
    }
  },
  learning_essentials: {
    create_user: {
      id: 'create_user',
      selected: true,
      label: 'Create user account',
      exclusive: false,
      disabled: true,
      required: true
    },
    enroll: {
      id: 'enroll',
      selected: true,
      label: 'Enroll to the course',
      exclusive: false,
      disabled: true,
      required: true
    },
    complete_training: {
      id: 'complete_training',
      selected: true,
      label: 'Complete online training',
      disabled: true,
      exclusive: false,
      required: true
    },
    introduce_ambassadors: {
      id: 'introduce_ambassadors',
      selected: true,
      disabled: true,
      label: 'Introduce Wikipedia Ambassadors Involved',
      exclusive: false,
      required: true
    },
    training_graded: {
      type: 'radioBox',
      id: 'training_graded',
      selected: false,
      label: 'Completion of training will be graded',
      exclusive: false,
      required: true
    },
    training_not_graded: {
      type: 'radioBox',
      id: 'training_not_graded',
      selected: false,
      label: 'Completion of training will not be graded',
      exclusive: false,
      required: true
    }
  },
  getting_started: {
    critique_article: {
      type: 'checkbox',
      id: 'critique_article',
      selected: true,
      label: 'Critique an article',
      exclusive: false,
      required: true
    },
    add_to_article: {
      type: 'checkbox',
      id: 'add_to_article',
      selected: true,
      label: 'Add to an article',
      exclusive: false,
      required: true
    },
    copy_edit_article: {
      type: 'checkbox',
      id: 'copy_edit_article',
      selected: false,
      label: 'Copyedit an article',
      exclusive: false,
      required: true
    },
    illustrate_article: {
      type: 'checkbox',
      id: 'illustrate_article',
      selected: false,
      label: 'Illustrate an article',
      exclusive: false,
      required: true
    }
  },
  choosing_articles: {
    prepare_list: {
      type: 'radioBox',
      id: 'prepare_list',
      selected: false,
      label: 'Instructor prepares a list',
      exclusive: false,
      hasSubChoice: true,
      required: true
    },
    students_explore: {
      type: 'radioBox',
      id: 'students_explore',
      selected: false,
      label: 'Students find articles',
      exclusive: false,
      hasSubChoice: true,
      required: true
    },
    request_help: {
      type: 'checkbox',
      id: 'request_help',
      selected: false,
      label: 'Would you like help selecting or evaulating article choices?',
      exclusive: false,
      required: false,
      conditional_label: {
        prepare_list: "Would you like help selecting articles?",
        students_explore: "Would you like help evaluating student choices?"
      }
    }
  },
  research_planning: {
    create_outline: {
      type: 'radioBox',
      id: 'create_outline',
      selected: false,
      label: 'Traditional outline',
      exclusive: false,
      required: true,
      tipInfo: {
        title: "Traditional outline",
        content: "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
      }
    },
    write_lead: {
      type: 'radioBox',
      id: 'write_lead',
      selected: false,
      required: true,
      label: 'Wikipedia lead section',
      exclusive: false,
      tipInfo: {
        title: "Wikipedia lead section",
        content: "<p>For each article, the students create a well-balanced summary of its future state in the form of a Wikipedia lead section. The ideal lead section exemplifies Wikipedia's summary style of writing: it begins with a single sentence that defines the topic and places it in context, and then — in one to four paragraphs, depending on the article's size — it offers a concise summary of topic. A good lead section should reflect the main topics and balance of coverage over the whole article.</p> <p>Outlining an article this way is a more challenging assignment — and will require more work to evaluate and provide feedback for. However, it can be more effective for teaching the process of research, writing, and revision. Students will return to this lead section as they go, to guide their writing and to revise it to reflect their improved understanding of the topic as their research progresses. They will tackle Wikipedia's encyclopedic style early on, and their outline efforts will be an integral part of their final work.</p>"
      }
    }
  },
  drafts_mainspace: {
    work_live: {
      type: 'radioBox',
      id: 'work_live',
      selected: false,
      label: 'Work live from the start',
      exclusive: false,
      required: true
    },
    sandbox: {
      type: 'radioBox',
      id: 'sandbox',
      selected: false,
      label: 'Draft early work in sandboxes',
      exclusive: false,
      required: true
    }
  },
  peer_feedback: {
    peer_reviews: {
      type: 'radioGroup',
      id: 'peer_reviews',
      label: '',
      value: 'two',
      selected: 1,
      overviewLabel: 'Two peer review',
      options: [
        {
          id: 0,
          name: 'peer_reviews',
          label: '1',
          value: 'one',
          selected: false,
          overviewLabel: 'One peer review'
        }, {
          id: 1,
          name: 'peer_reviews',
          label: '2',
          value: 'two',
          selected: true,
          overviewLabel: 'Two peer review'
        }, {
          id: 2,
          name: 'peer_reviews',
          label: '3',
          value: 'three',
          selected: false,
          overviewLabel: 'Three peer review'
        }, {
          id: 3,
          name: 'peer_reviews',
          label: '4',
          value: 'four',
          selected: false,
          overviewLabel: 'Four peer review'
        }, {
          id: 4,
          name: 'peer_reviews',
          label: '5',
          value: 'five',
          selected: false,
          overviewLabel: 'Five peer review'
        }
      ]
    }
  },
  supplementary_assignments: {
    class_blog: {
      type: 'checkbox',
      id: 'class_blog',
      selected: false,
      required: false,
      label: 'Class blog or discussion',
      exclusive: false,
      tipInfo: {
        title: 'Class blog or class discussion',
        content: 'Students keep a running blog about their experiences. Giving them prompts every week or two, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person.'
      }
    },
    class_presentation: {
      type: 'checkbox',
      id: 'class_presentation',
      selected: false,
      required: false,
      label: 'In-class presentations',
      exclusive: false,
      tipInfo: {
        title: 'In-class presentation of Wikipedia work',
        content: "Each student or group prepares a short presentation for the class, explaining what they worked on, what went well and what didn't, and what they learned. These presentations can make excellent fodder for class discussions to reinforce your course's learning goals."
      }
    },
    reflective_essay: {
      type: 'checkbox',
      id: 'reflective_essay',
      selected: false,
      required: false,
      label: 'Reflective essay',
      exclusive: false,
      tipInfo: {
        title: 'Reflective essay',
        content: "Ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not they met those expectations during the assignment."
      }
    },
    portfolio: {
      type: 'checkbox',
      id: 'portfolio',
      selected: false,
      required: false,
      label: 'Wikipedia portfolio',
      exclusive: false,
      tipInfo: {
        title: 'Wikipedia portfolio',
        content: "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
      }
    },
    original_paper: {
      type: 'checkbox',
      id: 'original_paper',
      selected: false,
      required: false,
      label: 'Original analytical paper',
      exclusive: false,
      tipInfo: {
        title: 'Original analytical paper',
        content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with a complementary analytical paper; students’ Wikipedia articles serve as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
      }
    }
  },
  dyk: {
    dyk: {
      type: 'checkbox',
      id: 'dyk',
      selected: false,
      required: false,
      label: 'Did You Know?',
      exclusive: false
    }
  },
  ga: {
    ga: {
      type: 'checkbox',
      id: 'ga',
      selected: false,
      required: false,
      label: 'Good Article nominations',
      exclusive: false
    }
  },
  grading_multimedia: {
    complete_multimedia: {
      type: 'percent',
      label: 'Add images & multimedia',
      id: 'complete_multimedia',
      value: 50,
      renderInOutput: true,
      contingentUpon: []
    }
  },
  grading_copyedit: {
    complete_copyedit: {
      type: 'percent',
      label: 'Copyedit articles',
      id: 'omplete_copyedit',
      value: 50,
      renderInOutput: true,
      contingentUpon: []
    }
  },
  grading: {
    researchwrite: {
      complete_training: {
        type: 'percent',
        label: 'Completion of Wikipedia training',
        id: 'complete_training',
        value: 5,
        renderInOutput: true,
        pathwayId: 'researchwrite',
        contingentUpon: ['training_graded']
      },
      getting_started: {
        type: 'percent',
        label: 'Early Wikipedia exercises',
        id: 'getting_started',
        value: 15,
        renderInOutput: true,
        pathwayId: 'researchwrite',
        contingentUpon: []
      },
      outline_quality: {
        type: 'percent',
        id: 'outline_quality',
        label: 'Quality of bibliography and outline',
        value: 10,
        renderInOutput: true,
        pathwayId: 'researchwrite',
        contingentUpon: []
      },
      peer_reviews: {
        id: 'peer_reviews',
        type: 'percent',
        label: 'Peer reviews and collaboration with classmates',
        value: 10,
        renderInOutput: true,
        pathwayId: 'researchwrite',
        contingentUpon: []
      },
      contribution_quality: {
        type: 'percent',
        id: 'contribution_quality',
        label: 'Quality of your main Wikipedia contributions',
        value: 50,
        renderInOutput: true,
        pathwayId: 'researchwrite',
        contingentUpon: []
      },
      supplementary_assignments: {
        type: 'percent',
        id: 'supplementary_assignments',
        label: 'Supplementary assignments',
        value: 10,
        renderInOutput: true,
        pathwayId: 'researchwrite',
        contingentUpon: ['class_blog', 'class_presentation', 'reflective_essay', 'portfolio', 'original_paper']
      }
    },
    copyedit: {
      copy_edit: {
        type: 'percent',
        label: 'Copyedit articles',
        id: 'copy_edit',
        value: 100,
        renderInOutput: true,
        pathwayId: 'copyedit',
        contingentUpon: []
      }
    },
    multimedia: {
      multimedia: {
        type: 'percent',
        label: 'Add images & multimedia',
        id: 'multimedia',
        value: 100,
        renderInOutput: true,
        pathwayId: 'multimedia',
        contingentUpon: []
      }
    },
    grading_selection: {
      label: 'Grading based on:',
      id: 'grading_selection',
      value: '',
      renderInOutput: false,
      options: {
        percent: {
          label: 'Percentage',
          value: 'percent',
          selected: true
        },
        points: {
          label: 'Points',
          value: 'points',
          selected: false
        }
      }
    }
  },
  overview: {
    learning_essentials: {
      type: 'edit',
      label: 'Learning Wiki essentials',
      id: 'learning_essentials',
      value: ''
    },
    getting_started: {
      type: 'edit',
      label: 'Getting started with editing',
      id: 'getting_started',
      value: ''
    },
    choosing_articles: {
      type: 'edit',
      label: 'Choosing articles',
      id: 'choosing_articles',
      value: ''
    },
    research_planning: {
      type: 'edit',
      label: 'Research and planning',
      id: 'research_planning',
      value: ''
    },
    drafts_mainspace: {
      type: 'edit',
      label: 'Drafts and mainspace',
      id: 'drafts_mainspace',
      value: ''
    },
    peer_feedback: {
      type: 'edit',
      label: 'Peer Feedback',
      id: 'peer_feedback',
      value: ''
    },
    supplementary_assignments: {
      type: 'edit',
      label: 'Supplementary assignments',
      id: 'supplementary_assignments',
      value: ''
    },
    wizard_start_date: {
      month: '',
      day: '',
      year: ''
    },
    wizard_end_date: {
      month: '',
      day: '',
      year: ''
    }
  },
  course_details: {
    description: '',
    term_start_date: '',
    term_end_date: '',
    course_start_date: '',
    course_end_date: '',
    course_meets_on: [],
    course_length: '',
    selected_assignment: ''
  }
};

module.exports = WizardStepInputs;



},{}],12:[function(require,module,exports){
Handlebars.registerHelper('link', function(text, url) {
  var result;
  text = Handlebars.Utils.escapeExpression(text);
  url = Handlebars.Utils.escapeExpression(url);
  result = '<a href="' + url + '">' + text + '</a>';
  return new Handlebars.SafeString(result);
});

Handlebars.registerPartial('courseDetails', 'sup2');



},{}],13:[function(require,module,exports){
var application;

application = require('./app');

$(function() {
  application.initialize();
  return Backbone.history.start();
});



},{"./app":5}],14:[function(require,module,exports){
var Model, StepModel,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Model = require('../models/supers/Model');

module.exports = StepModel = (function(_super) {
  __extends(StepModel, _super);

  function StepModel() {
    return StepModel.__super__.constructor.apply(this, arguments);
  }

  return StepModel;

})(Model);



},{"../models/supers/Model":15}],15:[function(require,module,exports){
var Model,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Model = (function(_super) {
  __extends(Model, _super);

  function Model() {
    return Model.__super__.constructor.apply(this, arguments);
  }

  return Model;

})(Backbone.Model);



},{}],16:[function(require,module,exports){
var Router, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.prototype.routes = {
    '': 'home'
  };

  Router.prototype.home = function() {
    if ($('#app').length > 0) {
      this.currentWikiUser = $('#app').attr('data-wikiuser');
      WizardStepInputs['intro']['instructor_username']['value'] = this.currentWikiUser;
      $('#app').html(application.homeView.render().el);
      if (this.getParameterByName('step')) {
        return Backbone.Mediator.publish('step:goto', this.getParameterByName('step'));
      } else if (this.getParameterByName('stepid')) {
        return Backbone.Mediator.publish('step:gotoId', this.getParameterByName('stepid'));
      }
    } else if ($('#login').length > 0) {
      return ($('#login')).html(application.loginView.render().el);
    }
  };

  Router.prototype.getParameterByName = function(name) {
    var regex, results;
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
    results = regex.exec(location.search);
    if (results == null) {
      return "";
    } else {
      return decodeURIComponent(results[1].replace(/\+/g, " "));
    }
  };

  return Router;

})(Backbone.Router);



},{"../app":5,"../data/WizardStepInputs":11}],17:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Home Page Template\n-->\n\n<!-- MAIN APP CONTENT -->\n<div class=\"content\">\n\n\n  <!-- STEPS MAIN CONTAINER -->\n  <div class=\"steps\"></div><!-- end .steps -->\n\n\n</div><!-- end .content -->\n\n";
  })
},{"handleify":4}],18:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += " \n          <h3 class=\"step-form-header__title\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\n          ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += " \n          <h4 class=\"step-form__subtitle\">";
  if (stack1 = helpers.formTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.formTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h4>\n          ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <div class=\"step-form-instructions\">\n          <p class=\"large\">";
  if (stack1 = helpers.login_instructions) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.login_instructions; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n        </div>\n        ";
  return buffer;
  }

  buffer += "<div class=\"content\">\n\n\n  <!-- STEPS MAIN CONTAINER -->\n  <div class=\"steps\">\n    <div class=\"step step--first step--login\">\n    \n      <div class=\"step-form\">\n\n        <!-- STEP FORM HEADER -->\n        <div class=\"step-form-header\">\n\n          <!-- STEP TITLE -->\n          ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        \n          <!-- STEP FORM TITLE -->\n          ";
  stack1 = helpers['if'].call(depth0, depth0.formTitle, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n        </div><!-- end .step-form-header -->\n        \n        <!-- STEP INSTRUCTIONS -->\n        ";
  stack1 = helpers['if'].call(depth0, depth0.login_instructions, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " <!-- end .step-form-instructions -->\n\n\n\n\n        <!-- BEGIN BUTTON -->\n        <div class=\"step-form-actions\">\n          <a class=\"button button--blue\" id=\"loginButton\" href=\"/auth/mediawiki\">\n            Login with Wikipedia\n          </a>\n"
    + "\n        </div><!-- end .step-form-actions -->\n\n\n      </div><!-- end .step-form -->\n    </div>\n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],19:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div href=\"\" class=\"dot step-nav-indicators__item ";
  stack1 = helpers['if'].call(depth0, depth0.isActive, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " ";
  stack1 = helpers['if'].call(depth0, depth0.hasVisited, {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\" data-nav-id=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" title=\"";
  if (stack1 = helpers.stepTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.stepTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" data-step-id=\"";
  if (stack1 = helpers.stepId) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.stepId; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">*</div>\n  ";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "active";
  }

function program4(depth0,data) {
  
  
  return "visited";
  }

function program6(depth0,data) {
  
  
  return "inactive";
  }

function program8(depth0,data) {
  
  
  return " no-arrow ";
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Step Navigation \n-->\n\n\n<!-- STEP NAV DOT INDICATORS -->\n<div class=\"step-nav-indicators hidden\">\n\n  ";
  stack1 = helpers.each.call(depth0, depth0.steps, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</div><!-- end .step-nav-indicators -->\n\n\n\n<!-- STEP NAV BUTTONS -->\n<div class=\"step-nav-buttons\">\n  <div class=\"step-nav-buttons--normal\">\n    <a href=\"\" class=\"step-nav__button step-nav--prev prev ";
  stack1 = helpers['if'].call(depth0, depth0.prevInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <span class=\"arrow\" style=\"margin-right:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--left\"></div>\n      </span>\n      <span class=\"text\">";
  if (stack1 = helpers.prevTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.prevTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>\n    </a>\n\n    <a href=\"\" class=\"step-nav__button step-nav--next next ";
  stack1 = helpers['if'].call(depth0, depth0.nextInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " ";
  stack1 = helpers['if'].call(depth0, depth0.isLastStep, {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " \">\n      <span class=\"text\">";
  if (stack1 = helpers.nextTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.nextTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>\n      <span class=\"arrow\" style=\"margin-left:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n      </span>\n    </a>\n  </div>\n\n\n\n  <div class=\"step-nav-buttons--edit\">\n    <a href=\"#\" class=\"step-nav__button step-nav__button--exit-edit confirm exit-edit\">\n      <span class=\"text\">";
  if (stack1 = helpers.backToOverviewTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.backToOverviewTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>\n    </a>\n  </div>\n\n</div><!-- end .step-nav-buttons -->\n";
  return buffer;
  })
},{"handleify":4}],20:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += " \n    <h3 class=\"step-form-header__title\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\n    ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += " \n    <h4 class=\"step-form__subtitle\">";
  if (stack1 = helpers.formTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.formTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h4>\n    ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      ";
  stack1 = helpers.each.call(depth0, depth0.content, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    ";
  return buffer;
  }
function program6(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        ";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      ";
  return buffer;
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Individal Step Template\n-->\n\n<div class=\"step-form\">\n\n  <!-- STEP FORM HEADER -->\n  <div class=\"step-form-header\">\n\n    <!-- STEP TITLE -->\n    ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  \n    <!-- STEP FORM TITLE -->\n    ";
  stack1 = helpers['if'].call(depth0, depth0.formTitle, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  </div><!-- end .step-form-header -->\n  \n  <!-- STEP INSTRUCTIONS -->\n\n  <div class=\"step-form-instructions\">\n    ";
  stack1 = helpers.each.call(depth0, depth0.sections, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n   <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n"
    + "\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n\n    <div class=\"no-edit-mode\">\n      <a class=\"button button--blue inactive\" id=\"beginButton\" href=\"\">\n        Start designing my assignment\n      </a>\n    </div>\n\n    <div class=\"edit-mode-only\">\n      <a class=\"button button--blue exit-edit\" href=\"#\">\n        Back\n      </a>\n    </div>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
  return buffer;
  })
},{"handleify":4}],21:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h3 class=\"step-form-header__title\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\n        ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <h4 class=\"step-form-content__title\">";
  if (stack1 = helpers.formTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.formTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h4>\n        ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <h2 class=\"font-blue--dark step-info__title\">";
  if (stack1 = helpers.infoTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.infoTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n      ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <p class=\"large step-info__intro\">";
  if (stack1 = helpers.instructions) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.instructions; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n      ";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <div class=\"step-info-section ";
  stack1 = helpers['if'].call(depth0, depth0.accordian, {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n        \n        <!-- INFO SECTION HEADER -->\n        ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        \n        <!-- INFO SECTION CONTENT -->\n        <div class=\"step-info-section__content\">\n          ";
  stack1 = helpers.each.call(depth0, depth0.content, {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </div><!-- end .step-info-section__content -->\n\n      </div><!-- end .step-info-section -->\n      ";
  return buffer;
  }
function program10(depth0,data) {
  
  
  return " step-info-section--accordian";
  }

function program12(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <div class=\"step-info-section__header\">\n          <h2 class=\"font-blue--dark\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n        </div><!-- end .step-info-section__header -->\n        ";
  return buffer;
  }

function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "    \n            ";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "    \n          ";
  return buffer;
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Main Individal Step Template\n-->\n\n\n<!-- STEP FORM : Left Side of Step -->\n<div class=\"step-form\">\n  <div class=\"step-form-layout\">\n    <div class=\"step-form-layout__inner\">\n      <div class=\"step-form-header\">\n        ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div>\n\n      \n      <!-- STEP FORM INNER CONTENT -->\n      <div class=\"step-form-content\">\n        ";
  stack1 = helpers['if'].call(depth0, depth0.formTitle, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        <div class=\"step-form-inner\"></div>\n      </div>\n    </div>\n  </div>\n</div><!-- end .step-form -->\n\n\n\n<!-- STEP INFO : Right side of step -->\n<div class=\"step-info\">\n  <!-- STEP INFO TIP SECTION -->\n  <!-- used for both course info and generic info -->\n  <div class=\"step-info-tips\"></div><!-- end .step-info-tips -->\n  <div class=\"step-info-inner\">\n    <!-- WIKIEDU LOGO -->\n    <a class=\"main-logo\" href=\"http://wikiedu.org\" target=\"_blank\" title=\"wikiedu.org\">WIKIEDU.ORG</a>\n\n    <!-- STEP INFO INNER -->\n    <div class=\"step-info-wrapper\">\n\n      ";
  stack1 = helpers['if'].call(depth0, depth0.infoTitle, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      ";
  stack1 = helpers['if'].call(depth0, depth0.instructions, {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      \n      <!-- INFO SECTIONS -->\n      ";
  stack1 = helpers.each.call(depth0, depth0.sections, {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    </div><!-- end .step-info-inner -->\n    \n\n\n    \n\n  </div><!-- end .step-info-inner -->\n</div><!-- end .step-info -->\n";
  return buffer;
  })
},{"handleify":4}],22:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n        <p>\n          ";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </p>\n        ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <li class=\"input-info-block__stat\">";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</li>\n          ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <div class=\"input-info-block--grid\">\n        <div class=\"input-info-block__stat\">";
  if (stack1 = helpers.text) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.text; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " : <span class=\"stars stars--";
  if (stack1 = helpers.stars) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.stars; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (stack1 = helpers.stars) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.stars; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>\n      </div>\n      ";
  return buffer;
  }

  buffer += "<div class=\"input-info step-info-tip\" data-item-index=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">\n<a class=\"step-info-tip__close\">Close Info</a>\n  <div class=\"step-info-tip__inner\">\n    <div class=\"input-info-block \">\n      <div class=\"input-info-block__title\">\n        <h2 class=\"font-blue--dark\">Assignment type: ";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n      </div>\n      <div class=\"input-info-block__text\">\n        ";
  stack1 = helpers.each.call(depth0, depth0.description, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div>\n    </div>\n    <div class=\"input-info-block\">\n      <div class=\"input-info-block--two-columns\">\n        <div class=\"input-info-block__title\">\n          <h2 class=\"font-blue--dark\">Minimum timeline</h2>\n        </div>\n        <div class=\"input-info-block__stat\">\n          ";
  if (stack1 = helpers.min_timeline) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.min_timeline; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </div>\n      </div>\n      <div class=\"input-info-block--two-columns\">\n        <div class=\"input-info-block__title\">\n          <h2 class=\"font-blue--dark\">Recommended timeline</h2>\n        </div>\n        <div class=\"input-info-block__stat\">\n          ";
  if (stack1 = helpers.rec_timeline) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.rec_timeline; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </div>\n      </div>\n    </div>\n\n    <div class=\"input-info-block\">\n      <div class=\"input-info-block--two-columns\">\n        <div class=\"input-info-block__title\">\n          <h2 class=\"font-blue--dark\">Best for</h2>\n        </div>\n        <ul>\n          ";
  stack1 = helpers.each.call(depth0, depth0.best_for, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      </div>\n      <div class=\"input-info-block--two-columns\">\n        <div class=\"input-info-block__title\">\n          <h2 class=\"font-blue--dark\">Not appropriate for</h2>\n        </div>\n        <ul>\n          ";
  stack1 = helpers.each.call(depth0, depth0.not_for, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n        </ul>\n      </div>\n    </div>\n    <div class=\"input-info-block\">\n      <div class=\"input-info-block__title\">\n        <h2 class=\"font-blue--dark\">Learning Objectives</h2>\n      </div>\n      ";
  stack1 = helpers.each.call(depth0, depth0.learning_objectives, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </div>\n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],23:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <h2 class=\"font-blue--dark\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n      ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <p>";
  if (stack1 = helpers.content) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.content; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n      ";
  return buffer;
  }

  buffer += "<div class=\"step-info-tip\" data-item-index=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">\n  \n    <div class=\"step-info-tip__inner\">\n      <a class=\"step-info-tip__close\">Close Info</a>\n      ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      ";
  stack1 = helpers['if'].call(depth0, depth0.content, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      \n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],24:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"info-arrow\"></div>\n<div class=\"custom-input custom-input--checkbox ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.disabled), {hash:{},inverse:self.program(6, program6, data),fn:self.program(4, program4, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.exclusive), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += ">\n  <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"><span>"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span></label>\n  <input name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" type=\"checkbox\" id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "  />\n  <a class=\"check-button\" href=\"#\"></a>\n  <div class=\"info-icon\"></div>\n</div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return " checked ";
  }

function program4(depth0,data) {
  
  
  return " not-editable ";
  }

function program6(depth0,data) {
  
  
  return " editable ";
  }

function program8(depth0,data) {
  
  
  return " data-exclusive=\"true\" ";
  }

function program10(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"info-arrow\"></div>\n<div class=\"custom-input custom-input--checkbox custom-input--radiobox ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.exclusive), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += ">\n  <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"><span>"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</span></label>\n  <input name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" type=\"radio\" id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "  />\n  <a class=\"radio-button\" href=\"#\"></a>\n  <div class=\"info-icon\"></div>\n</div>\n";
  return buffer;
  }

function program12(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--text\">\n  <div class=\"custom-input--text__inner\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    <input id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" type=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.type)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" value=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" />\n  </div>\n</div>\n";
  return buffer;
  }

function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--percent\" data-pathway-id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.pathwayId)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <div class=\"custom-input--percent__inner\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    <div class=\"input-container\">\n    <div class=\"icon icon--percent\"></div>\n    <div class=\"icon icon--points\">points</div>\n    <input name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" type=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.type)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" value=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" maxlength=\"3\" />\n    </div>\n  </div>\n</div>\n";
  return buffer;
  }

function program16(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custom-input--edit custom-input-accordian\">\n  <a class=\"edit-button\" href=\"#\" data-step-id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">[edit]</a>\n  <div class=\"custom-input--edit__inner custom-input-accordian__header\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    \n  </div>\n  <div class=\"custom-input--edit__content custom-input-accordian__content\">\n    <ul>\n      ";
  stack2 = helpers.each.call(depth0, depth0.assignments, {hash:{},inverse:self.noop,fn:self.program(17, program17, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n    </ul>\n  </div>\n</div>\n";
  return buffer;
  }
function program17(depth0,data) {
  
  var buffer = "";
  buffer += "\n      <li>"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</li>\n      ";
  return buffer;
  }

function program19(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"info-arrow\"></div>\n<div class=\"custom-input custom-input--link\">\n  <label><a href=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.href)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" >"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</a></label>\n  <div class=\"info-icon\"></div>\n</div>\n";
  return buffer;
  }

function program21(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner\">\n  <div class=\"custom-input-radio-inner__header\">\n    <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n  </div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program22(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"custom-input custom-input--radio\">\n      <input name=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" id=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" value=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" type=\"radio\" ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "/>\n      <label for=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</label>\n      <a class=\"radio-button\" href=\"#\"></a>\n    </div>\n  ";
  return buffer;
  }

function program24(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner__header\">\n  <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n</div>\n<div class=\"custom-input-radio-inner custom-input-radio-inner--group\">\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(25, program25, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program25(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"custom-input custom-input--radio custom-input--radio-group ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <a class=\"radio-button\" href=\"#\"></a>\n      <label for=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</label>\n      <input name=\"";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" id=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" value=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" type=\"radio\" ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "/>\n    </div>\n  ";
  return buffer;
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Input Item Templates\n  \n-->\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.checkbox), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioBox), {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.text), {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.percent), {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.edit), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n"
    + "\n"
    + "\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.link), {hash:{},inverse:self.noop,fn:self.program(19, program19, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radio), {hash:{},inverse:self.noop,fn:self.program(21, program21, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioGroup), {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],25:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates\">\n  <div class=\"custom-input-dates__label\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>\n  <div class=\"custom-input-dates__inner from\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearStart\" name=\"yearStart\" data-date-id=\"wizard_start_date\" data-date-type=\"year\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthStart\" name=\"monthStart\" data-date-id=\"wizard_start_date\" data-date-type=\"month\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayStart\" name=\"dayStart\" data-date-id=\"wizard_start_date\" data-date-type=\"day\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n  <span class=\"dates-to\">\n    to\n  </span>\n  <div class=\"custom-input-dates__inner to\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearEnd\" name=\"yearEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"year\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n      </select>\n    </div>\n    \n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthEnd\" name=\"monthEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"month\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayEnd\" name=\"dayEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"day\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n\n</div>";
  return buffer;
  })
},{"handleify":4}],26:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "";
  buffer += "\n        <li>"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</li>\n        ";
  return buffer;
  }

  buffer += "\n<div class=\"custom-input-wrapper has-content edit\">\n  <div class=\"custom-input custom-input--edit custom-input-accordian\">\n    <a class=\"edit-button\" href=\"#\" data-step-id=\"";
  if (stack1 = helpers.stepId) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.stepId; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">[edit]</a>\n    <div class=\"custom-input--edit__inner custom-input-accordian__header\">\n      <label for=\"\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</label>\n      \n    </div>\n    <div class=\"custom-input--edit__content custom-input-accordian__content\">\n      <ul>\n        ";
  stack1 = helpers.each.call(depth0, depth0.assignments, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </ul>\n    </div>\n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],27:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  
  return " over-limit ";
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n          <div class=\"custom-input custom-input--radio custom-input--radio-group ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n\n            <a class=\"radio-button\" href=\"#\"></a>\n\n            <label for=\"percent\"><span>";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span></label>\n\n            <input name=\"grading-selection\" id=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" value=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" type=\"radio\" ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n\n          </div>\n        ";
  return buffer;
  }
function program4(depth0,data) {
  
  
  return " checked ";
  }

  buffer += "<div class=\"custom-input-grading\">\n\n  <div class=\"custom-input-grading-summary\">\n\n    <div class=\"custom-input-grading__total\">\n\n      <h3>Total</h3>\n\n    </div>\n\n    <div class=\"custom-input-grading__percent ";
  stack1 = helpers['if'].call(depth0, depth0.isOverLimit, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n\n      <h3 class=\"custom-input-grading__total-number\">";
  if (stack1 = helpers.totalGrade) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.totalGrade; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "<span class=\"percent-symbol\">%</span></h3>\n\n    </div>\n\n  </div>\n  \n  <div class=\"custom-input-grading-selection\">\n\n    <h5 class=\"custom-input-grading-selection__title\">Grading based on:</h5>\n\n    <div class=\"custom-input-grading-selection-form\">\n\n      <div class=\"custom-input-wrapper\">\n\n        ";
  stack1 = helpers.each.call(depth0, depth0.options, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      </div>\n\n    </div>\n\n  </div>\n\n</div>";
  return buffer;
  })
},{"handleify":4}],28:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  })
},{"handleify":4}],29:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "{{course details \n | course_name = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.course_name)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | instructor_username = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.instructor_username)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | instructor_realname = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.teacher)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | subject = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.subject)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | start_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.wizard_start_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | end_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.wizard_end_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | institution = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.school)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n | expected_students = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.students)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " \n}}\n\n";
  if (stack2 = helpers.description) { stack2 = stack2.call(depth0, {hash:{},data:data}); }
  else { stack2 = depth0.description; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }
  buffer += escapeExpression(stack2)
    + "\n\n"
    + "{{table of contents}}\n==Timeline==\n\n";
  return buffer;
  })
},{"handleify":4}],30:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, self=this;

function program1(depth0,data) {
  
  
  return "interested_in_DYK = yes";
  }

function program3(depth0,data) {
  
  
  return "interested_in_DYK = no";
  }

function program5(depth0,data) {
  
  
  return "interested_in_Good_Articles = yes";
  }

function program7(depth0,data) {
  
  
  return "interested_in_Good_Articles = no";
  }

function program9(depth0,data) {
  
  var stack1, stack2;
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack2 || stack2 === 0) { return stack2; }
  else { return ''; }
  }
function program10(depth0,data) {
  
  
  return "\n | want_help_finding_articles = yes";
  }

function program12(depth0,data) {
  
  var stack1, stack2;
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { return stack2; }
  else { return ''; }
  }
function program13(depth0,data) {
  
  
  return "\n | want_help_evaluating_articles = yes";
  }

  buffer += "\n"
    + "{{course options\n | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.ga),stack1 == null || stack1 === false ? stack1 : stack1.ga)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.prepare_list)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n}}\n";
  return buffer;
  })
},{"handleify":4}],31:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var stack1;
  stack1 = helpers['if'].call(depth0, depth0.renderInOutput, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { return stack1; }
  else { return ''; }
  }
function program2(depth0,data) {
  
  var buffer = "", stack1;
  buffer += " | ";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | ";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "%\n";
  return buffer;
  }

  buffer += "==Grading==\n"
    + "{{assignment grading \n";
  stack1 = helpers.each.call(depth0, depth0.grading, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "<br/>}}\n";
  return buffer;
  })
},{"handleify":4}],32:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose articles from a list}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program15(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n  ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.drafts_mainspace),stack1 == null || stack1 === false ? stack1 : stack1.sandbox)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.drafts_mainspace),stack1 == null || stack1 === false ? stack1 : stack1.work_live)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(18, program18, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  return buffer;
  }
function program16(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n  ";
  return buffer;
  }

function program18(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline | sandbox = no }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n  ";
  return buffer;
  }

function program20(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Outline as lead section }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program22(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program24(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program26(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program28(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program30(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program32(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program34(depth0,data) {
  
  
  return " Class presentations ";
  }

function program36(depth0,data) {
  
  
  return " Finishing touches ";
  }

function program38(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program40(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program42(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

function program44(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  }

  buffer += "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week 1| 1 | Wikipedia essentials }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 2 | Editing basics }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 3 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 3 | Exploring the topic area}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Exploring the topic area in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 4 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.getting_started),stack1 == null || stack1 === false ? stack1 : stack1.critique_article)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.getting_started),stack1 == null || stack1 === false ? stack1 : stack1.copy_edit_article)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 4 | Using sources and choosing articles }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 5}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.getting_started),stack1 == null || stack1 === false ? stack1 : stack1.add_to_article)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.getting_started),stack1 == null || stack1 === false ? stack1 : stack1.illustrate_article)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.prepare_list)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = Week 5}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 5 | Finalizing topics and starting research }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 6 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 6 | Drafting starter articles }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 7 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.research_planning),stack1 == null || stack1 === false ? stack1 : stack1.create_outline)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(15, program15, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.research_planning),stack1 == null || stack1 === false ? stack1 : stack1.write_lead)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 7 | Moving articles to the main space }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 8 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 8 | Building articles }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{class workshop}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 9 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.options)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(26, program26, data),fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 9 | Getting and giving feedback }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 10 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.options)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(30, program30, data),fn:self.program(28, program28, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 10 | Responding to feedback }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 11 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(32, program32, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 11 | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(36, program36, data),fn:self.program(34, program34, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(38, program38, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{assignment | due = Week 12 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.reflective_essay)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(40, program40, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.portfolio)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(42, program42, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.original_paper)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(44, program44, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | 12 | Due date }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{end of course week}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n";
  return buffer;
  })
},{"handleify":4}],33:[function(require,module,exports){
var DateInputView, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = DateInputView = (function(_super) {
  __extends(DateInputView, _super);

  function DateInputView() {
    return DateInputView.__super__.constructor.apply(this, arguments);
  }

  DateInputView.prototype.events = {
    'click select': 'clickHandler',
    'change select': 'changeHandler',
    'focus select': 'focusHandler',
    'blur select': 'blurHandler',
    'mouseover': 'focusHandler',
    'mouseout': 'blurHandler'
  };

  DateInputView.prototype.m = '';

  DateInputView.prototype.d = '';

  DateInputView.prototype.y = '';

  DateInputView.prototype.dateValue = '';

  DateInputView.prototype.render = function() {
    return $('body').on('click', (function(_this) {
      return function(e) {
        return _this.closeIfNoValue();
      };
    })(this));
  };

  DateInputView.prototype.clickHandler = function(e) {
    return this.$el.addClass('open');
  };

  DateInputView.prototype.blurHandler = function(e) {
    return this.closeIfNoValue();
  };

  DateInputView.prototype.focusHandler = function(e) {
    return this.$el.addClass('open');
  };

  DateInputView.prototype.changeHandler = function(e) {
    var $target, id, type, value;
    this.closeIfNoValue();
    $target = $(e.currentTarget);
    id = $target.attr('data-date-id');
    type = $target.attr('data-date-type');
    value = $target.val();
    WizardStepInputs[this.parentStepView.stepId()][id][type] = value;
    this.m = WizardStepInputs[this.parentStepView.stepId()][id]['month'];
    this.d = WizardStepInputs[this.parentStepView.stepId()][id]['day'];
    this.y = WizardStepInputs[this.parentStepView.stepId()][id]['year'];
    this.dateValue = "" + this.y + "-" + this.m + "-" + this.d;
    WizardStepInputs[this.parentStepView.stepId()][id].value = this.dateValue;
    Backbone.Mediator.publish('date:change', this);
    return this;
  };

  DateInputView.prototype.hasValue = function() {
    return this.$el.find('select').val() !== '';
  };

  DateInputView.prototype.closeIfNoValue = function() {
    if (this.hasValue()) {
      return this.$el.addClass('open');
    } else {
      return this.$el.removeClass('open');
    }
  };

  DateInputView.prototype.isValid = function() {
    var isIt;
    isIt = false;
    if (this.m !== '' && this.d !== '' && this.y !== '') {
      isIt = true;
    }
    return isIt;
  };

  return DateInputView;

})(Backbone.View);



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiDatesModule.hbs":25}],34:[function(require,module,exports){
var GradingInputView, View, WikiGradingModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

WikiGradingModule = require('../templates/steps/modules/WikiGradingModule.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = GradingInputView = (function(_super) {
  __extends(GradingInputView, _super);

  function GradingInputView() {
    return GradingInputView.__super__.constructor.apply(this, arguments);
  }

  GradingInputView.prototype.template = WikiGradingModule;

  GradingInputView.prototype.events = {
    'change input': 'inputChangeHandler',
    'click .custom-input--radio-group .radio-button': 'radioButtonClickHandler',
    'click .custom-input--radio-group label': 'radioButtonClickHandler'
  };

  GradingInputView.prototype.subscriptions = {
    'grade:change': 'gradeChangeHandler'
  };

  GradingInputView.prototype.currentValues = [];

  GradingInputView.prototype.valueLimit = 100;

  GradingInputView.prototype.gradingSelectionData = WizardStepInputs['grading']['grading_selection'];

  GradingInputView.prototype.currentTotal = function() {
    var total;
    total = 0;
    _.each(this.currentValues, (function(_this) {
      return function(val) {
        return total += parseInt(val);
      };
    })(this));
    return total;
  };

  GradingInputView.prototype.getInputValues = function() {
    var values;
    values = [];
    this.parentStepView.$el.find('input[type="percent"]').each(function() {
      var curVal;
      curVal = ($(this)).val();
      if (curVal) {
        return values.push(curVal);
      } else {
        ($(this)).val(0);
        return values.push(0);
      }
    });
    this.currentValues = values;
    return this;
  };

  GradingInputView.prototype.gradeChangeHandler = function(id, value) {
    return this.getInputValues().render();
  };

  GradingInputView.prototype.radioButtonClickHandler = function(e) {
    var $button, $inputEl, $otherRadios, $parentEl, $parentGroup;
    e.preventDefault();
    $button = $(e.currentTarget);
    $parentEl = $button.parents('.custom-input--radio');
    $parentGroup = $button.parents('.custom-input-wrapper');
    $inputEl = $parentEl.find('input[type="radio"]');
    if ($parentEl.hasClass('checked')) {
      return false;
    } else {
      $otherRadios = $parentGroup.find('.custom-input--radio').not($parentEl[0]);
      $otherRadios.find('input[type="radio"]').prop('checked', false).trigger('change');
      $otherRadios.removeClass('checked');
      $parentEl.addClass('checked');
      $inputEl.prop('checked', true);
      $inputEl.trigger('change');
      _.each(WizardStepInputs['grading']['grading_selection'].options, function(opt) {
        return opt.selected = false;
      });
      WizardStepInputs['grading']['grading_selection'].options[$inputEl.attr('id')].selected = true;
      return WizardStepInputs['grading']['grading_selection'].value = $inputEl.attr('id');
    }
  };

  GradingInputView.prototype.getRenderData = function() {
    var out;
    out = {
      totalGrade: this.currentTotal(),
      isOverLimit: this.currentTotal() > this.valueLimit,
      options: this.gradingSelectionData.options
    };
    return out;
  };

  return GradingInputView;

})(View);



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiGradingModule.hbs":27,"../views/supers/View":44}],35:[function(require,module,exports){
var HomeTemplate, HomeView, OutputTemplate, StepModel, StepNavView, StepView, TimelineView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

HomeTemplate = require('../templates/HomeTemplate.hbs');

OutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

StepView = require('../views/StepView');

StepModel = require('../models/StepModel');

StepNavView = require('../views/StepNavView');

TimelineView = require('../views/TimelineView');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = HomeView = (function(_super) {
  __extends(HomeView, _super);

  function HomeView() {
    return HomeView.__super__.constructor.apply(this, arguments);
  }

  HomeView.prototype.className = 'home-view';

  HomeView.prototype.template = HomeTemplate;

  HomeView.prototype.stepData = {
    intro: application.WizardConfig.intro_steps,
    pathways: application.WizardConfig.pathways,
    outro: application.WizardConfig.outro_steps
  };

  HomeView.prototype.pathwayIds = function() {
    return _.keys(this.stepData.pathways);
  };

  HomeView.prototype.stepViews = [];

  HomeView.prototype.allStepViews = {
    intro: [],
    pathway: [],
    outro: []
  };

  HomeView.prototype.selectedPathways = [];

  HomeView.prototype.initialize = function() {
    this.StepNav = new StepNavView();
    this.currentStep = 0;
    return this.stepsRendered = false;
  };

  HomeView.prototype.events = {
    'click .exit-edit': 'exitEditClickHandler'
  };

  HomeView.prototype.subscriptions = {
    'step:next': 'nextHandler',
    'step:prev': 'prevHandler',
    'step:goto': 'gotoHandler',
    'step:gotoId': 'gotoIdHandler',
    'step:edit': 'editHandler',
    'tips:hide': 'hideAllTips',
    'edit:exit': 'onEditExit'
  };

  HomeView.prototype.render = function() {
    this.$el.html(this.template(this.getRenderData()));
    if (!this.stepsRendered) {
      this.afterRender();
    }
    return this;
  };

  HomeView.prototype.afterRender = function() {
    this.$stepsContainer = this.$el.find('.steps');
    this.$innerContainer = this.$el.find('.content');
    this.renderIntroSteps();
    this.renderSteps();
    this.StepNav.stepViews = this.stepViews;
    this.StepNav.totalSteps = this.stepViews.length;
    this.$innerContainer.append(this.StepNav.el);
    if (this.stepViews.length > 0) {
      this.showCurrentStep();
    }
    setTimeout((function(_this) {
      return function() {
        return _this.timelineView = new TimelineView();
      };
    })(this), 2000);
    return this;
  };

  HomeView.prototype.renderIntroSteps = function() {
    var stepNumber;
    stepNumber = 0;
    _.each(this.stepData.intro, (function(_this) {
      return function(step, index) {
        var newmodel, newview;
        newmodel = new StepModel();
        _.map(step, function(value, key, list) {
          return newmodel.set(key, value);
        });
        newview = new StepView({
          model: newmodel
        });
        newview.model.set('stepNumber', stepNumber + 1);
        newview.model.set('stepIndex', stepNumber);
        if (index === 0) {
          newview.isFirstStep = true;
        }
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
        _this.stepViews.push(newview);
        _this.allStepViews.intro.push(newview);
        return stepNumber++;
      };
    })(this));
    return this;
  };

  HomeView.prototype.renderSteps = function() {
    var stepNumber;
    this.allStepViews.pathway = [];
    stepNumber = this.stepViews.length;
    _.each(this.selectedPathways, (function(_this) {
      return function(pid, pindex) {
        return _.each(_this.stepData.pathways[pid], function(step, index) {
          var newmodel, newview;
          if (_this.selectedPathways.length > 1) {
            if (step.id === 'grading' || step.id === 'overview' || step.type === 'grading' || step.type === 'overview') {
              if (pindex < _this.selectedPathways.length - 1) {
                return;
              }
            }
          }
          newmodel = new StepModel();
          _.map(step, function(value, key, list) {
            return newmodel.set(key, value);
          });
          newview = new StepView({
            model: newmodel
          });
          newview.model.set('stepNumber', stepNumber + 1);
          newview.model.set('stepIndex', stepNumber);
          _this.$stepsContainer.append(newview.render().hide().el);
          newview.$el.addClass("step--" + step.id);
          newview.$el.addClass("step-pathway step-pathway--" + pid);
          _this.stepViews.push(newview);
          _this.allStepViews.pathway.push(newview);
          return stepNumber++;
        });
      };
    })(this));
    return this;
  };

  HomeView.prototype.renderOutroSteps = function() {
    var stepNumber;
    console.log('outro');
    this.allStepViews.outro = [];
    stepNumber = this.stepViews.length;
    _.each(this.stepData.outro, (function(_this) {
      return function(step, index) {
        var newmodel, newview;
        newmodel = new StepModel();
        _.map(step, function(value, key, list) {
          return newmodel.set(key, value);
        });
        newview = new StepView({
          model: newmodel
        });
        newview.model.set('stepNumber', stepNumber + 1);
        newview.model.set('stepIndex', stepNumber);
        if (index === _this.stepData.outro.length - 1) {
          newview.isLastStep = true;
        }
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
        _this.stepViews.push(newview);
        _this.allStepViews.outro.push(newview);
        return stepNumber++;
      };
    })(this));
    return this;
  };

  HomeView.prototype.recreatePathway = function() {
    var clone;
    clone = this.stepViews;
    this.stepViews = [clone[0], clone[1]];
    _.each(this.allStepViews.pathway, function(step) {
      return step.remove();
    });
    _.each(this.allStepViews.outro, function(step) {
      return step.remove();
    });
    this.renderSteps();
    this.renderOutroSteps();
    this.StepNav.stepViews = this.stepViews;
    this.StepNav.totalSteps = this.stepViews.length;
    return this.$innerContainer.append(this.StepNav.el);
  };

  HomeView.prototype.getRenderData = function() {
    return {
      content: "This is special content"
    };
  };

  HomeView.prototype.advanceStep = function() {
    this.currentStep += 1;
    if (this.currentStep === this.stepViews.length) {
      this.currentStep = 0;
    }
    this.hideAllSteps();
    return this.showCurrentStep();
  };

  HomeView.prototype.decrementStep = function() {
    this.currentStep -= 1;
    if (this.currentStep < 0) {
      this.currentStep = this.stepViews.length - 1;
    }
    this.hideAllSteps();
    return this.showCurrentStep();
  };

  HomeView.prototype.updateStep = function(index) {
    this.currentStep = index;
    this.hideAllSteps();
    return this.showCurrentStep();
  };

  HomeView.prototype.updateStepById = function(id) {
    return _.each(this.stepViews, (function(_this) {
      return function(stepView) {
        if (stepView.stepId() === id) {
          _this.updateStep(_.indexOf(_this.stepViews, stepView));
        }
      };
    })(this));
  };

  HomeView.prototype.showCurrentStep = function() {
    this.stepViews[this.currentStep].show();
    Backbone.Mediator.publish('step:update', this.currentStep);
    return this;
  };

  HomeView.prototype.updateSelectedPathway = function(action, pathwayId) {
    var removeIndex;
    if (action === 'add') {
      if (pathwayId === 'researchwrite') {
        this.selectedPathways = [pathwayId];
      } else {
        this.selectedPathways.push(pathwayId);
      }
    } else if (action === 'remove') {
      if (pathwayId === 'researchwrite') {
        this.selectedPathways = [];
      } else {
        removeIndex = _.indexOf(this.selectedPathway, pathwayId);
        this.selectedPathways.splice(removeIndex);
      }
    }
    this.recreatePathway();
    return this;
  };

  HomeView.prototype.currentStepView = function() {
    return this.stepViews[this.currentStep];
  };

  HomeView.prototype.hideAllSteps = function() {
    return _.each(this.stepViews, (function(_this) {
      return function(stepView) {
        return stepView.hide();
      };
    })(this));
  };

  HomeView.prototype.hideAllTips = function(e) {
    _.each(this.stepViews, (function(_this) {
      return function(stepView) {
        return stepView.tipVisible = false;
      };
    })(this));
    $('body').addClass('tip-open');
    $('.step-info-tip').removeClass('visible');
    return $('.custom-input-wrapper').removeClass('selected');
  };

  HomeView.prototype.nextHandler = function() {
    this.advanceStep();
    return this.hideAllTips();
  };

  HomeView.prototype.prevHandler = function() {
    this.decrementStep();
    return this.hideAllTips();
  };

  HomeView.prototype.editHandler = function(id) {
    var x;
    if (id === 'assignment_selection') {
      x = confirm('Are you sure you want to start the process over with a new assignment type?');
      if (!x) {
        return;
      }
    } else {
      $('body').addClass('edit-mode');
    }
    return _.each(this.stepViews, (function(_this) {
      return function(view, index) {
        if (view.model.id === id) {
          return _this.updateStep(index);
        }
      };
    })(this));
  };

  HomeView.prototype.onEditExit = function() {
    return $('body').removeClass('edit-mode');
  };

  HomeView.prototype.exitEditClickHandler = function(e) {
    e.preventDefault();
    return Backbone.Mediator.publish('edit:exit');
  };

  HomeView.prototype.gotoHandler = function(index) {
    this.updateStep(index);
    return this.hideAllTips();
  };

  HomeView.prototype.gotoIdHandler = function(id) {
    this.updateStepById(id);
    return this.hideAllTips();
  };

  HomeView.prototype.getSelectedIds = function() {
    var selectedIds;
    selectedIds = [];
    _.each(WizardStepInputs, (function(_this) {
      return function(steps) {
        return _.each(steps, function(step) {
          if (step.selected === true) {
            if (step.id) {
              return selectedIds.push(step.id);
            }
          }
        });
      };
    })(this));
    return selectedIds;
  };

  return HomeView;

})(View);



},{"../app":5,"../data/WizardStepInputs":11,"../models/StepModel":14,"../templates/HomeTemplate.hbs":17,"../templates/steps/output/WikiOutputTemplate.hbs":32,"../views/StepNavView":40,"../views/StepView":41,"../views/TimelineView":42,"../views/supers/View":44}],36:[function(require,module,exports){
var InputItemView, InputView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

InputView = require('../views/supers/InputView');

module.exports = InputItemView = (function(_super) {
  __extends(InputItemView, _super);

  function InputItemView() {
    return InputItemView.__super__.constructor.apply(this, arguments);
  }

  return InputItemView;

})(InputView);



},{"../views/supers/InputView":43}],37:[function(require,module,exports){
var HomeView, LoginTemplate, View, WizardContent, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

LoginTemplate = require('../templates/LoginTemplate.hbs');

WizardContent = require('../data/WizardContent');

module.exports = HomeView = (function(_super) {
  __extends(HomeView, _super);

  function HomeView() {
    return HomeView.__super__.constructor.apply(this, arguments);
  }

  HomeView.prototype.className = 'home-view';

  HomeView.prototype.template = LoginTemplate;

  HomeView.prototype.getRenderData = function() {
    return WizardContent[0];
  };

  return HomeView;

})(View);



},{"../app":5,"../data/WizardContent":9,"../templates/LoginTemplate.hbs":18,"../views/supers/View":44}],38:[function(require,module,exports){
var CourseDetailsTempalte, CourseOptionsTemplate, GradingTemplate, OutputView, View, WikiOutputTemplate, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

CourseDetailsTempalte = require('../templates/steps/output/CourseDetailsTemplate.hbs');

GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs');

CourseOptionsTemplate = require('../templates/steps/output/CourseOptionsTemplate.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = OutputView = (function(_super) {
  __extends(OutputView, _super);

  function OutputView() {
    return OutputView.__super__.constructor.apply(this, arguments);
  }

  OutputView.prototype.template = WikiOutputTemplate;

  OutputView.prototype.detailsTemplate = CourseDetailsTempalte;

  OutputView.prototype.gradingTemplate = GradingTemplate;

  OutputView.prototype.optionsTemplate = CourseOptionsTemplate;

  OutputView.prototype.subscriptions = {
    'wizard:publish': 'publishHandler'
  };

  OutputView.prototype.outputPlainText = function() {
    this.render();
    return this.$el.text();
  };

  OutputView.prototype.render = function() {
    this.$el.html(this.template(this.populateOutput()));
    this.afterRender();
    return this;
  };

  OutputView.prototype.populateOutput = function() {
    var assignmentOutput, courseOut, detailsOutput, gradingOutput, optionsOutput, rawAssignmentOutput;
    detailsOutput = this.$el.html(this.detailsTemplate(this.getRenderData())).text();
    rawAssignmentOutput = this.$el.html(this.template(this.getRenderData())).text();
    assignmentOutput = rawAssignmentOutput.replace(/(\r\n|\n|\r)/gm, "");
    gradingOutput = this.$el.html(this.gradingTemplate(this.getRenderData())).text();
    optionsOutput = this.$el.html(this.optionsTemplate(this.getRenderData())).text();
    courseOut = detailsOutput + assignmentOutput + gradingOutput + optionsOutput;
    return courseOut;
  };

  OutputView.prototype.getRenderData = function() {
    return _.extend(WizardStepInputs, {
      description: $('#short_description').val(),
      lineBreak: '<br/>'
    });
  };

  OutputView.prototype.exportData = function(formData) {
    return $.ajax({
      type: 'POST',
      url: '/publish',
      data: {
        wikitext: formData,
        course_title: WizardStepInputs.intro.course_name.value
      },
      success: function(response) {
        var newPage;
        $('#publish').removeClass('processing');
        if (response.success) {
          newPage = "http://en.wikipedia.org/wiki/" + response.title;
          alert("Congrats! You have successfully created/edited a Wikiedu Course at " + newPage);
          return window.location.href = newPage;
        } else {
          console.log(response);
          return alert('Hmm... something went wrong. Try clicking "Publish" again. If that doesn\'t work, please send a message to sage@wikiedu.org.');
        }
      }
    });
  };

  OutputView.prototype.publishHandler = function() {
    if (WizardStepInputs.intro.course_name.value.length > 0) {
      $('#publish').addClass('processing');
      return this.exportData(this.populateOutput());
    } else {
      alert('You must enter a course title as this will become the title of your course page.');
      Backbone.Mediator.publish('step:edit', 'intro');
      return setTimeout((function(_this) {
        return function() {
          return $('#course_name').focus();
        };
      })(this), 500);
    }
  };

  return OutputView;

})(View);



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/output/CourseDetailsTemplate.hbs":29,"../templates/steps/output/CourseOptionsTemplate.hbs":30,"../templates/steps/output/GradingTemplate.hbs":31,"../templates/steps/output/WikiOutputTemplate.hbs":32,"../views/supers/View":44}],39:[function(require,module,exports){
var OverviewView, TimelineView, View, WikiDetailsModule, WikiSummaryModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

WikiSummaryModule = require('../templates/steps/modules/WikiSummaryModule.hbs');

WikiDetailsModule = require('../templates/steps/modules/WikiDetailsModule.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

TimelineView = require('../views/TimelineView');

module.exports = OverviewView = (function(_super) {
  __extends(OverviewView, _super);

  function OverviewView() {
    return OverviewView.__super__.constructor.apply(this, arguments);
  }

  OverviewView.prototype.overviewItemTemplate = WikiDetailsModule;

  OverviewView.prototype.render = function() {
    var selectedInputs, selectedObjects, selectedPathways;
    selectedPathways = application.homeView.selectedPathways;
    selectedObjects = _.where(WizardStepInputs['assignment_selection'], {
      selected: true
    });
    $('<div class="step-form-content__title">Selected assignment(s): </div>').appendTo(this.$el).css({
      marginBottom: '8px'
    });
    _.each(selectedObjects, (function(_this) {
      return function(obj) {
        var $newTitle, pathTitle;
        pathTitle = obj.label;
        $newTitle = $(_this.overviewItemTemplate({
          label: pathTitle,
          stepId: 'assignment_selection',
          assignments: []
        })).find('.custom-input').removeClass('custom-input--accordian');
        $newTitle.find('.edit-button');
        return _this.$el.append($newTitle);
      };
    })(this));
    selectedInputs = [];
    _.each(selectedPathways, (function(_this) {
      return function(pid, i) {
        var inputDataIds, stepData, stepTitles, totalLength;
        stepData = application.homeView.stepData.pathways[pid];
        inputDataIds = _.pluck(stepData, 'id');
        stepTitles = _.pluck(stepData, 'title');
        totalLength = stepData.length;
        if (stepTitles.length > 0 && i === 0) {
          $('<div class="step-form-content__title">Assignment details: </div>').appendTo(_this.$el).css({
            bottom: 'auto',
            display: 'block',
            position: 'relative',
            marginBottom: '0',
            marginTop: '15px'
          });
        }
        return _.each(stepTitles, function(title, index) {
          var stepInputItems;
          if (!stepData[index].showInOverview) {
            return;
          }
          selectedInputs = [];
          stepInputItems = WizardStepInputs[inputDataIds[index]];
          _.each(stepInputItems, function(input) {
            if (input.type) {
              if (input.type === 'checkbox' || input.type === 'radioBox') {
                if (input.selected === true) {
                  return selectedInputs.push(input.label);
                }
              } else if (input.type === 'radioGroup') {
                if (input.id === 'peer_reviews') {
                  return selectedInputs.push(input.overviewLabel);
                }
              }
            }
          });
          if (selectedInputs.length === 0) {
            selectedInputs.push("[None selected]");
          }
          return _this.$el.append(_this.overviewItemTemplate({
            label: title,
            stepId: inputDataIds[index],
            assignments: selectedInputs
          }));
        });
      };
    })(this));
    this.renderDescription();
    return this;
  };

  OverviewView.prototype.renderDescription = function() {
    var $descInput;
    $descInput = $("<textarea id='short_description' rows='6' style='width:100%;background-color:rgba(242,242,242,1.0);border:1px solid rgba(202,202,202,1.0);padding:10px 15px;font-size: 16px;line-height 23px;letter-spacing: 0.25px;'></textarea>");
    $descInput.val(WizardStepInputs.course_details.description);
    $('.description-container').html($descInput[0]);
    $descInput.off('change');
    $descInput.on('change', function(e) {
      return WizardStepInputs.course_details.description = $(this).val();
    });
    return this;
  };

  return OverviewView;

})(View);



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiDetailsModule.hbs":26,"../templates/steps/modules/WikiSummaryModule.hbs":28,"../views/TimelineView":42,"../views/supers/View":44}],40:[function(require,module,exports){
var StepNavTemplate, StepNavView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

StepNavTemplate = require('../templates/StepNavTemplate.hbs');

module.exports = StepNavView = (function(_super) {
  __extends(StepNavView, _super);

  function StepNavView() {
    return StepNavView.__super__.constructor.apply(this, arguments);
  }

  StepNavView.prototype.className = 'step-nav';

  StepNavView.prototype.template = StepNavTemplate;

  StepNavView.prototype.hasBeenToLastStep = false;

  StepNavView.prototype.initialize = function() {
    this.currentStep = 0;
    return this.render = _.bind(this.render, this);
  };

  StepNavView.prototype.subscriptions = {
    'step:update': 'updateCurrentStep',
    'step:answered': 'stepAnswered',
    'edit:exit': 'editExitHandler'
  };

  StepNavView.prototype.events = function() {
    return {
      'click .next': 'nextClickHandler',
      'click .prev': 'prevClickHandler',
      'click .dot': 'dotClickHandler'
    };
  };

  StepNavView.prototype.render = function() {
    this.$el.html(this.template(this.getRenderData()));
    if (this.currentStep > 0 && this.currentStep < this.totalSteps - 1) {
      this.$el.removeClass('hidden');
    } else if (this.currentStep > 0 && this.currentStep === this.totalSteps - 1) {
      this.$el.removeClass('hidden');
    } else {
      this.$el.addClass('hidden');
    }
    return this.afterRender();
  };

  StepNavView.prototype.getRenderData = function() {
    return {
      current: this.currentStep,
      total: this.totalSteps,
      prevInactive: this.isInactive('prev'),
      nextInactive: this.isInactive('next'),
      nextTitle: (function(_this) {
        return function() {
          if (_this.isLastStep()) {
            return '';
          } else {
            return 'Next';
          }
        };
      })(this),
      prevTitle: (function(_this) {
        return function() {
          if (_this.isLastStep()) {
            return 'Back';
          } else {
            return 'Prev';
          }
        };
      })(this),
      isLastStep: this.isLastStep(),
      backToOverviewTitle: 'Go Back to Overview',
      steps: (function(_this) {
        return function() {
          var out;
          out = [];
          _.each(_this.stepViews, function(step, index) {
            var isActive, stepData, wasVisited;
            stepData = step.model.attributes;
            isActive = _this.currentStep === index;
            wasVisited = step.hasUserVisited;
            return out.push({
              id: index,
              isActive: isActive,
              hasVisited: wasVisited,
              stepTitle: stepData.title,
              stepId: stepData.id
            });
          });
          return out;
        };
      })(this)
    };
  };

  StepNavView.prototype.afterRender = function() {
    return this;
  };

  StepNavView.prototype.prevClickHandler = function(e) {
    e.preventDefault();
    if (this.isLastStep()) {
      return Backbone.Mediator.publish('step:edit', 'grading');
    } else {
      return Backbone.Mediator.publish('step:prev');
    }
  };

  StepNavView.prototype.nextClickHandler = function(e) {
    e.preventDefault();
    return Backbone.Mediator.publish('step:next');
  };

  StepNavView.prototype.dotClickHandler = function(e) {
    var $target;
    e.preventDefault();
    $target = $(e.currentTarget);
    if (this.hasBeenToLastStep) {
      if (parseInt($target.attr('data-nav-id')) === parseInt(this.totalSteps - 1)) {
        return Backbone.Mediator.publish('edit:exit');
      } else {
        return Backbone.Mediator.publish('step:edit', $target.data('step-id'));
      }
    } else {
      return Backbone.Mediator.publish('step:goto', $target.data('nav-id'));
    }
  };

  StepNavView.prototype.editExitHandler = function() {
    return Backbone.Mediator.publish('step:goto', this.lastStepIndex());
  };

  StepNavView.prototype.updateCurrentStep = function(step) {
    this.currentStep = step;
    if (this.isLastStep()) {
      this.hasBeenToLastStep = true;
    }
    return this.render();
  };

  StepNavView.prototype.stepAnswered = function(stepView) {
    return this.render();
  };

  StepNavView.prototype.lastStepIndex = function() {
    return this.totalSteps - 1;
  };

  StepNavView.prototype.isLastStep = function() {
    return this.currentStep === this.totalSteps - 1 && this.currentStep > 1;
  };

  StepNavView.prototype.isInactive = function(item) {
    var itIs;
    itIs = true;
    if (item === 'prev') {
      itIs = this.currentStep === 0;
    } else if (item === 'next') {
      if (application.homeView.stepViews[this.currentStep].hasUserAnswered) {
        itIs = false;
      } else if (this.isLastStep()) {
        itIs = true;
      }
      if (application.homeView.selectedPathways.length === 0) {
        itIs = true;
      }
    }
    return itIs;
  };

  return StepNavView;

})(View);



},{"../app":5,"../templates/StepNavTemplate.hbs":19,"../views/supers/View":44}],41:[function(require,module,exports){
var CourseInfoData, CourseTipTemplate, DateInputView, GradingInputView, InputItemView, InputTipTemplate, IntroStepTemplate, OverviewView, StepTemplate, StepView, View, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

InputItemView = require('../views/InputItemView');

DateInputView = require('../views/DateInputView');

GradingInputView = require('../views/GradingInputView');

OverviewView = require('../views/OverviewView');

StepTemplate = require('../templates/steps/StepTemplate.hbs');

IntroStepTemplate = require('../templates/steps/IntroStepTemplate.hbs');

InputTipTemplate = require('../templates/steps/info/InputTipTemplate.hbs');

CourseTipTemplate = require('../templates/steps/info/CourseTipTemplate.hbs');

WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs');

CourseInfoData = require('../data/WizardCourseInfo');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = StepView = (function(_super) {
  __extends(StepView, _super);

  function StepView() {
    return StepView.__super__.constructor.apply(this, arguments);
  }

  StepView.prototype.className = 'step';

  StepView.prototype.tagName = 'section';

  StepView.prototype.template = StepTemplate;

  StepView.prototype.introTemplate = IntroStepTemplate;

  StepView.prototype.tipTemplate = InputTipTemplate;

  StepView.prototype.courseInfoTemplate = CourseTipTemplate;

  StepView.prototype.courseInfoData = CourseInfoData;

  StepView.prototype.datesModule = WikiDatesModule;

  StepView.prototype.hasUserAnswered = false;

  StepView.prototype.hasUserVisited = false;

  StepView.prototype.isLastStep = false;

  StepView.prototype.isFirstStep = false;

  StepView.prototype.events = {
    'click #publish': 'publishHandler',
    'click .step-info-tip__close': 'hideTips',
    'click #beginButton': 'beginHandler',
    'click .step-info .step-info-section--accordian': 'accordianClickHandler',
    'click .edit-button': 'editClickHandler'
  };

  StepView.prototype.subscriptions = {
    'tips:hide': 'hideTips',
    'date:change': 'isIntroValid'
  };

  StepView.prototype.editClickHandler = function(e) {
    var stepId;
    stepId = $(e.currentTarget).attr('data-step-id');
    if (stepId) {
      return Backbone.Mediator.publish('step:edit', stepId);
    }
  };

  StepView.prototype.stepId = function() {
    return this.model.attributes.id;
  };

  StepView.prototype.validateDates = function(dateView) {
    var datesAreValid;
    if (!(this.isFirstStep || this.isLastStep)) {
      return false;
    }
    datesAreValid = false;
    _.each(this.dateViews, (function(_this) {
      return function(dateView) {
        if (dateView.isValid()) {
          return datesAreValid = true;
        } else {
          return datesAreValid = false;
        }
      };
    })(this));
    return datesAreValid;
  };

  StepView.prototype.accordianClickHandler = function(e) {
    var $target;
    $target = $(e.currentTarget);
    return $target.toggleClass('open');
  };

  StepView.prototype.publishHandler = function(e) {
    e.preventDefault();
    return Backbone.Mediator.publish('wizard:publish');
  };

  StepView.prototype.render = function() {
    this.tipVisible = false;
    if (this.isFirstStep) {
      this._renderStepType('first');
    } else if (this.isLastStep) {
      this._renderStepType('last');
    } else {
      this._renderStepType('standard');
    }
    this._renderInputsAndInfo();
    return this.afterRender();
  };

  StepView.prototype._renderStepType = function(type) {
    var $dateInputs, $dates, dateTitle, self;
    if (type === 'standard') {
      this.$el.html(this.template(this.model.attributes));
    } else if (type === 'first' || type === 'last') {
      if (type === 'first') {
        this.$el.addClass('step--first').html(this.introTemplate(this.model.attributes));
        dateTitle = 'Course dates';
        this.$beginButton = this.$el.find('a#beginButton');
      } else {
        this.$el.addClass('step--last').html(this.template(this.model.attributes));
        dateTitle = 'Assignment timeline';
      }
      this.dateViews = [];
      $dates = $(this.datesModule({
        title: dateTitle
      }));
      $dateInputs = $dates.find('.custom-select');
      self = this;
      $dateInputs.each(function(inputElement) {
        var newDateView;
        newDateView = new DateInputView({
          el: $(this)
        });
        newDateView.parentStepView = self;
        return self.dateViews.push(newDateView);
      });
      this.$el.find('.step-form-dates').html($dates);
    }
    return this;
  };

  StepView.prototype._renderInputsAndInfo = function() {
    var distributedValue, numberOfPathways, pathways;
    this.inputSection = this.$el.find('.step-form-inner');
    this.$tipSection = this.$el.find('.step-info-tips');
    if (this.model.attributes.id === 'grading') {
      pathways = application.homeView.selectedPathways;
      numberOfPathways = pathways.length;
      if (numberOfPathways > 1) {
        distributedValue = Math.floor(100 / numberOfPathways);
        this.inputData = [];
        _.each(pathways, (function(_this) {
          return function(pathway) {
            var gradingData;
            gradingData = WizardStepInputs[_this.model.attributes.id][pathway];
            return _.each(gradingData, function(gradeItem) {
              gradeItem.value = distributedValue;
              return _this.inputData.push(gradeItem);
            });
          };
        })(this));
      } else {
        this.inputData = WizardStepInputs[this.model.attributes.id][pathways[0]] || [];
      }
    } else {
      this.inputData = WizardStepInputs[this.model.attributes.id] || [];
    }
    _.each(this.inputData, (function(_this) {
      return function(input, index) {
        var $tipEl, infoData, inputView, tip;
        if (!input.type) {
          return;
        }
        if (input.selected && input.required) {
          _this.hasUserAnswered = true;
        } else if (input.selected) {
          _this.hasUserAnswered = true;
        } else if (input.required === false) {
          _this.hasUserAnswered = true;
        } else if (input.type === 'percent') {
          _this.hasUserAnswered = true;
        }
        inputView = new InputItemView({
          model: new Backbone.Model(input)
        });
        inputView.inputType = input.type;
        inputView.itemIndex = index;
        inputView.parentStep = _this;
        _this.inputSection.append(inputView.render().el);
        if (input.tipInfo) {
          tip = {
            id: index,
            title: input.tipInfo.title,
            content: input.tipInfo.content
          };
          $tipEl = _this.tipTemplate(tip);
          _this.$tipSection.append($tipEl);
          return inputView.$el.addClass('has-info');
        } else if (input.hasCourseInfo) {
          infoData = _.extend(_this.courseInfoData[input.id], {
            id: index
          });
          $tipEl = _this.courseInfoTemplate(infoData);
          _this.$tipSection.append($tipEl);
          return inputView.$el.addClass('has-info');
        }
      };
    })(this));
    return this;
  };

  StepView.prototype.afterRender = function() {
    var $innerEl;
    this.$inputContainers = this.$el.find('.custom-input');
    if (this.model.attributes.id === 'grading' || this.model.attributes.type === 'grading') {
      this.gradingView = new GradingInputView();
      this.gradingView.parentStepView = this;
      this.$el.find('.step-form-content').append(this.gradingView.getInputValues().render().el);
    }
    if (this.model.attributes.id === 'overview') {
      $innerEl = this.$el.find('.step-form-inner');
      $innerEl.html('');
      this.overviewView = new OverviewView({
        el: $innerEl
      });
      this.overviewView.parentStepView = this;
      this.overviewView.render();
    }
    return this;
  };

  StepView.prototype.hide = function() {
    this.$el.hide();
    return this;
  };

  StepView.prototype.show = function() {
    $('body, html').animate({
      scrollTop: 0
    }, 1);
    if (this.model.attributes.id === 'overview' || this.model.attributes.type === 'overview') {
      this.render().$el.show();
    } else if (this.model.attributes.id === 'grading' || this.model.attributes.type === 'grading') {
      this.render().$el.show();
    } else {
      this.$el.show();
    }
    this.hasUserVisited = true;
    return this;
  };

  StepView.prototype.beginHandler = function(e) {
    e.preventDefault();
    return Backbone.Mediator.publish('step:next');
  };

  StepView.prototype.updateUserHasAnswered = function(id, value, type) {
    var inputItems, requiredSelected;
    inputItems = WizardStepInputs[this.model.id];
    requiredSelected = false;
    if (type === 'percent') {
      this.hasUserAnswered = true;
      return this;
    }
    _.each(inputItems, (function(_this) {
      return function(item) {
        if (item.type === 'checkbox') {
          if (item.required === true) {
            if (item.selected === true) {
              return requiredSelected = true;
            }
          } else {
            return requiredSelected = true;
          }
        }
      };
    })(this));
    if (requiredSelected === true) {
      this.hasUserAnswered = true;
    } else if (type === 'radioGroup' || type === 'radioBox') {
      this.hasUserAnswered = true;
    } else if (type === 'text') {
      if (this.isFirstStep) {
        _.each(inputItems, (function(_this) {
          return function(item) {
            if (item.type === 'text') {
              if (item.required === true) {
                if (item.value !== '') {
                  return requiredSelected = true;
                } else {
                  return requiredSelected = false;
                }
              }
            }
          };
        })(this));
        if (requiredSelected) {
          this.hasUserAnswered = true;
        } else {
          this.hasUserAnswered = false;
        }
        this.isIntroValid();
      }
    } else {
      this.hasUserAnswered = false;
    }
    Backbone.Mediator.publish('step:answered', this);
    return this;
  };

  StepView.prototype.isIntroValid = function() {
    if (!(this.isFirstStep || this.isLastStep)) {
      return false;
    }
    if (this.isFirstStep) {
      if (this.hasUserAnswered && this.validateDates()) {
        return this.$beginButton.removeClass('inactive');
      } else {
        return this.$beginButton.addClass('inactive');
      }
    }
  };

  StepView.prototype.updateRadioAnswer = function(id, index, value) {
    var inputType;
    inputType = WizardStepInputs[this.model.id][id].type;
    WizardStepInputs[this.model.id][id].options[index].selected = value;
    WizardStepInputs[this.model.id][id].value = WizardStepInputs[this.model.id][id].options[index].value;
    WizardStepInputs[this.model.id][id].overviewLabel = WizardStepInputs[this.model.id][id].options[index].overviewLabel;
    return WizardStepInputs[this.model.id][id].selected = index;
  };

  StepView.prototype.updateAnswer = function(id, value, hasPathway, pathway) {
    var allOthersDisengaged, hasExclusiveSibling, inputType, isExclusive, out;
    if (hasPathway) {
      console.log(pathway, id, value);
      inputType = WizardStepInputs[this.model.id][pathway][id].type;
      isExclusive = false;
    } else {
      inputType = WizardStepInputs[this.model.id][id].type;
      isExclusive = false || WizardStepInputs[this.model.id][id].exclusive;
    }
    hasExclusiveSibling = false;
    _.each(WizardStepInputs[this.model.id], (function(_this) {
      return function(inputItem) {
        if (inputItem.exclusive) {
          return hasExclusiveSibling = true;
        }
      };
    })(this));
    out = {
      type: inputType,
      id: id,
      value: value
    };
    if (inputType === 'radioBox' || inputType === 'checkbox') {
      if (value === 'on') {
        if (hasPathway) {
          WizardStepInputs[this.model.id][pathway][id].selected = true;
        } else {
          WizardStepInputs[this.model.id][id].selected = true;
        }
        if (hasExclusiveSibling && !isExclusive) {
          this.$el.find('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable');
        } else if (isExclusive) {
          this.$el.find('.custom-input--checkbox').not('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable');
        }
        if (this.model.id === 'assignment_selection') {
          application.homeView.updateSelectedPathway('add', id);
        }
      } else {
        if (hasPathway) {
          WizardStepInputs[this.model.id][pathway][id].selected = false;
        } else {
          WizardStepInputs[this.model.id][id].selected = false;
        }
        if (hasExclusiveSibling && !isExclusive) {
          allOthersDisengaged = true;
          this.$el.find('.custom-input--checkbox').each(function() {
            if (!$(this).attr('data-exclusive') && $(this).hasClass('checked')) {
              return allOthersDisengaged = false;
            }
          });
          if (allOthersDisengaged) {
            this.$el.find('.custom-input--checkbox[data-exclusive="true"]').removeClass('not-editable').addClass('editable');
          } else {
            this.$el.find('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable');
          }
        } else if (isExclusive) {
          this.$el.find('.custom-input--checkbox').not('.custom-input--checkbox[data-exclusive="true"]').removeClass('not-editable').addClass('editable');
        }
        if (this.model.id === 'assignment_selection') {
          application.homeView.updateSelectedPathway('remove', id);
        }
      }
    } else if (inputType === 'text' || inputType === 'percent') {
      if (hasPathway) {
        WizardStepInputs[this.model.id][pathway][id].value = value;
      } else {
        WizardStepInputs[this.model.id][id].value = value;
      }
    }
    console.log(WizardStepInputs[this.model.id]);
    return this;
  };

  StepView.prototype.hideTips = function(e) {
    $('.step-info-tip').removeClass('visible');
    $('.custom-input-wrapper').removeClass('selected');
    return $('body').removeClass('tip-open');
  };

  return StepView;

})(View);



},{"../app":5,"../data/WizardCourseInfo":10,"../data/WizardStepInputs":11,"../templates/steps/IntroStepTemplate.hbs":20,"../templates/steps/StepTemplate.hbs":21,"../templates/steps/info/CourseTipTemplate.hbs":22,"../templates/steps/info/InputTipTemplate.hbs":23,"../templates/steps/modules/WikiDatesModule.hbs":25,"../views/DateInputView":33,"../views/GradingInputView":34,"../views/InputItemView":36,"../views/OverviewView":39,"../views/supers/View":44}],42:[function(require,module,exports){
var TimelineView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

module.exports = TimelineView = (function(_super) {
  __extends(TimelineView, _super);

  function TimelineView() {
    return TimelineView.__super__.constructor.apply(this, arguments);
  }

  TimelineView.prototype.el = $('.form-container');

  TimelineView.prototype.curDateConfig = {
    termStart: '',
    termEnd: '',
    courseStart: '',
    courseEnd: '',
    courseStartWeekOf: '',
    courseEndWeekOf: '',
    numberWeeks: 16
  };

  TimelineView.prototype.daysSelected = [false, false, false, false, false, false, false];

  TimelineView.prototype.allDates = [];

  TimelineView.prototype.dowNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  TimelineView.prototype.dowAbbrv = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

  TimelineView.prototype.renderDays = true;

  TimelineView.prototype.events = {
    'mousedown #cLength': 'clickHandler',
    'mouseup #cLength': 'changeHandler',
    'change #cLength': 'changeHandler',
    'change #termStartDate': 'onTermStartDateChange',
    'change #termEndDate': 'onTermEndDateChange',
    'change #courseStartDate': 'onCourseStartDateChange',
    'change #courseEndDate': 'onCourseEndDateChange',
    'change .dowCheckbox': 'onDowSelect'
  };

  TimelineView.prototype.onDowSelect = function(e) {
    var $target, dow, dowId;
    $target = $(e.currentTarget);
    dow = $target.attr('id');
    dowId = parseInt($target.val());
    if ($target.is(':checked')) {
      this.daysSelected[dowId] = true;
    } else {
      this.daysSelected[dowId] = false;
    }
    return this.update();
  };

  TimelineView.prototype.initialize = function() {
    $('input[type="date"]').datepicker({
      dateFormat: 'yy-mm-dd',
      constrainInput: true,
      firstDay: 1
    }).prop('type', 'text');
    this.$startWeekOfDate = $('#startWeekOfDate');
    this.$courseStartDate = $('#courseStartDate');
    this.$courseEndDate = $('#courseEndDate');
    this.$outContainer = $('.output-container');
    this.$previewContainer = $('.preview-container');
    this.$courseLengthInput = $('#cLength');
    this.courseLength = this.$courseLengthInput.val();
    this.courseDiff = 0;
    this.data = application.timelineDataAlt;
    $('#cLength').on('change', (function(_this) {
      return function(e) {
        return _this.changeHandler(e);
      };
    })(this));
    $('#cLength').on('mousedown', (function(_this) {
      return function(e) {
        return _this.changeHandler(e);
      };
    })(this));
    $('#cLength').on('mouseup', (function(_this) {
      return function(e) {
        return _this.changeHandler(e);
      };
    })(this));
    $('#termStartDate').on('change', (function(_this) {
      return function(e) {
        return _this.onTermStartDateChange(e);
      };
    })(this));
    $('#termEndDate').on('change', (function(_this) {
      return function(e) {
        return _this.onTermEndDateChange(e);
      };
    })(this));
    $('#courseStartDate').on('change', (function(_this) {
      return function(e) {
        return _this.onCourseStartDateChange(e);
      };
    })(this));
    $('#courseEndDate').on('change', (function(_this) {
      return function(e) {
        return _this.onCourseEndDateChange(e);
      };
    })(this));
    $('.dowCheckbox').on('change', (function(_this) {
      return function(e) {
        return _this.onDowSelect(e);
      };
    })(this));
    return this.update();
  };

  TimelineView.prototype.resetDates = function() {};

  TimelineView.prototype.onTermStartDateChange = function(e) {
    var dateInput, newDate;
    this.curDateConfig.courseStart = '';
    this.$courseStartDate.val('');
    dateInput = $(e.currentTarget).val();
    newDate = moment(dateInput).toDate();
    this.curDateConfig.termStart = newDate;
    this.$courseStartDate.datepicker('option', 'minDate', newDate);
    return this.update();
  };

  TimelineView.prototype.onTermEndDateChange = function(e) {
    var dateInput, newDate;
    dateInput = $(e.currentTarget).val();
    newDate = moment(dateInput).toDate();
    this.curDateConfig.termEnd = newDate;
    this.$courseStartDate.datepicker('option', 'maxDate', newDate);
    return this.update();
  };

  TimelineView.prototype.onCourseStartDateChange = function(e) {
    return this.updateWeeklyDates();
  };

  TimelineView.prototype.onCourseEndDateChange = function(e) {
    this.$courseLengthInput.val(10);
    this.$courseLengthInput.trigger('change');
    return $('output[name="out2"]').html(10);
  };

  TimelineView.prototype.updateWeeklyDates = function() {
    var newStartDate, weekOfDate;
    if (this.$courseStartDate.val() === '') {
      this.curDateConfig.courseStart = '';
      $('span.date').hide();
      return;
    }
    this.allDates = [];
    newStartDate = new Date(this.$courseStartDate.val());
    this.curDateConfig.courseStart = newStartDate;
    weekOfDate = this.getWeekOfDate(newStartDate);
    this.curDateConfig.courseStartWeekOf = weekOfDate;
    $('span.date').each((function(_this) {
      return function(index, item) {
        var newDate, weekId;
        weekId = parseInt($(item).attr('data-week'));
        newDate = new Date(weekOfDate);
        if (index === 0) {
          _this.allDates.push(_this.getFormattedDateString(new Date(newDate)));
          return;
        }
        newDate = newDate.setDate(newDate.getDate() + (7 * (weekId - 1)));
        _this.allDates.push(_this.getFormattedDateString(new Date(newDate)));
        return $(item).show().text(_this.getFormattedDateString(new Date(newDate)));
      };
    })(this));
    $('span.date.date-1').show().text(this.getFormattedDateString(newStartDate));
    this.$startWeekOfDate.val("" + (this.getFormattedDateString(newStartDate)));
    $('.dates-preview').html('');
    $('.dates-preview').each((function(_this) {
      return function(ind, item) {
        return _.each(_this.daysSelected, function(selected, selectedIndex) {
          var theDate;
          if (selected) {
            if (ind === 0) {
              theDate = new Date(weekOfDate);
            } else {
              theDate = new Date(_this.allDates[ind]);
            }
            theDate = theDate.setDate(theDate.getDate() + selectedIndex);
            return $(item).append("<div class='dow-date dow-date--" + selectedIndex + "' ><span contenteditable>" + _this.dowNames[selectedIndex] + " | </span><span contenteditable>" + (_this.getFormattedDateString(new Date(theDate))) + "</span></div>");
          }
        });
      };
    })(this));
    return this;
  };

  TimelineView.prototype.clickHandler = function(e) {};

  TimelineView.prototype.changeHandler = function(e) {
    this.courseLength = $('#cLength').val();
    this.courseDiff = 16 - this.courseLength;
    this.curDateConfig.courseEndWeekOf = new Date(this.allDates[this.courseLength - 1]);
    return this.update();
  };

  TimelineView.prototype.update = function() {
    var obj;
    this.out = [];
    this.unitsClone = _.clone(this.data);
    if (this.courseDiff > 0) {
      this.unitsClone = _.reject(this.unitsClone, (function(_this) {
        return function(item) {
          return item.type === 'break' && _this.courseDiff >= item.value && item.value !== 0;
        };
      })(this));
    }
    obj = this.unitsClone[0];
    _.each(this.unitsClone, (function(_this) {
      return function(item, index) {
        if (item.type === 'break' || index === _this.unitsClone.length - 1) {
          if (index === _this.unitsClone.length - 1) {
            _this.out.push(_.clone(item));
          } else {
            _this.out.push(_.clone(obj));
          }
          obj = {};
        } else if (item.type === 'week') {
          return obj = _this.combine(obj, item);
        }
      };
    })(this));
    this.renderPreview();
    this.renderResult();
    return this.updateWeeklyDates();
  };

  TimelineView.prototype.renderPreview = function() {
    this.$previewContainer.html('');
    return _.each(this.out, (function(_this) {
      return function(item, index) {
        var assignmentsOut, datesOut, inClassOut, isLastWeek, milestonesOut, nextWeek, previewDetails, thisWeek, titles;
        thisWeek = index + 1;
        nextWeek = index + 2;
        isLastWeek = index === _this.out.length - 1;
        if (item.title.length > 0) {
          titles = "<div class='preview-container-header'>";
          titles += "<h4 data-week='" + thisWeek + "'>Week " + thisWeek + "<span class='date date-" + thisWeek + "' data-week='" + thisWeek + "'></span></h4>";
          _.each(item.title, function(t, i) {
            if (i === 0) {
              return titles += "<h2 class='preview-container-weekly-title'>" + t + "</h2>";
            } else {
              return titles += "<h3 class='preview-container-weekly-title preview-container-weekly-title--smaller'>" + t + "</h3>";
            }
          });
          titles += "</div>";
          _this.$previewContainer.append(titles);
        }
        datesOut = "<div class='preview-container-dates dates-preview dates-preview-" + thisWeek + "' data-week='" + thisWeek + "'></div>";
        _this.$previewContainer.append(datesOut);
        previewDetails = "<div class='preview-container-details'>";
        if (item.in_class.length > 0) {
          inClassOut = '<div>';
          inClassOut += "<h5 style='font-weight: bold;'>In class</h5>";
          inClassOut += '<ul>';
          _.each(item.in_class, function(c) {
            return inClassOut += "<li>" + c + "</li>";
          });
          inClassOut += "</ul>";
          inClassOut += "</div>";
          previewDetails += inClassOut;
        }
        if (item.assignments.length > 0) {
          assignmentsOut = "<div>";
          assignmentsOut += "<h5 style='font-weight: bold;'>Assignments | due week " + nextWeek + "</h5>";
          assignmentsOut += '<ul>';
          _.each(item.assignments, function(assign) {
            return assignmentsOut += "<li>" + assign + "</li>";
          });
          assignmentsOut += '</ul>';
          assignmentsOut += '</div>';
          previewDetails += assignmentsOut;
        }
        if (item.milestones.length > 0) {
          milestonesOut = "<div>";
          milestonesOut += "<h5 style='font-weight: bold;'>Milestones</h5>";
          milestonesOut += "<ul>";
          _.each(item.milestones, function(milestone) {
            return milestonesOut += "<li>" + milestone.title + "</li>";
          });
          milestonesOut += "</ul>";
          milestonesOut += "</div>";
          previewDetails += milestonesOut;
        }
        return _this.$previewContainer.append(previewDetails);
      };
    })(this));
  };

  TimelineView.prototype.renderResult = function() {
    this.$outContainer.html('').css('white-space', 'pre-wrap');
    return _.each(this.out, (function(_this) {
      return function(item, index) {
        var isLastWeek, nextWeek, thisWeek, titles;
        thisWeek = index + 1;
        nextWeek = index + 2;
        isLastWeek = index === _this.out.length - 1;
        if (item.title.length > 0) {
          titles = "<div>";
          titles += "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | " + thisWeek + " | ";
          _.each(item.title, function(t, i) {
            if (i === 0) {
              return titles += "" + t + " ";
            } else {
              return titles += "| " + t + " ";
            }
          });
          titles += "}}";
          titles += "</div>";
          _this.$outContainer.append(titles);
          _this.$outContainer.append("<br/>");
        }
        if (item.in_class.length > 0) {
          _this.$outContainer.append("<div style='font-weight: bold;'>{{in class}}</div>");
          _.each(item.in_class, function(c) {
            return _this.$outContainer.append("<div>" + c + "</div>");
          });
          _this.$outContainer.append("<br/>");
        }
        if (item.assignments.length > 0) {
          _this.$outContainer.append("<div style='font-weight: bold;'>{{assignment | due = Week " + nextWeek + " }}</div>");
          _.each(item.assignments, function(assign) {
            return _this.$outContainer.append("<div>" + assign + "</div>");
          });
          _this.$outContainer.append("<br/>");
        }
        if (item.milestones.length > 0) {
          _this.$outContainer.append("<div style='font-weight: bold;'>{{assignment milestones}}</div>");
          _.each(item.milestones, function(m) {
            return _this.$outContainer.append("<div>" + m + "</div>");
          });
          _this.$outContainer.append("<br/>");
        }
        if (isLastWeek) {
          _this.$outContainer.append("{{end of course week}}");
        }
        return _this.$outContainer.append("<br/><hr/>");
      };
    })(this));
  };

  TimelineView.prototype.getFormattedDateString = function(date) {
    var day, month, year;
    year = date.getUTCFullYear().toString();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
    if (month.toString().length === 1) {
      month = "0" + month.toString();
    } else {
      month = month.toString();
    }
    if (day.toString().length === 1) {
      day = "0" + day.toString();
    } else {
      day = day.toString();
    }
    return "" + year + "-" + month + "-" + day;
  };

  TimelineView.prototype.getWeekOfDate = function(date) {
    var dateDay, day, month, year;
    year = date.getUTCFullYear().toString();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDay();
    dateDay = date.getUTCDate();
    if (day === 1) {
      return date;
    } else {
      return new Date(date.setDate(date.getUTCDate() - date.getUTCDay()));
    }
  };

  TimelineView.prototype.getWeeksOutDate = function(date, weeksOut) {
    var newDate;
    newDate = new Date();
    newDate.setDate(date.getDate() + (weeksOut * 7));
    return newDate;
  };

  TimelineView.prototype.combine = function(obj1, obj2) {
    var assignments, in_class, milestones, readings, title;
    title = _.union(obj1.title, obj2.title);
    in_class = _.union(obj1.in_class, obj2.in_class);
    assignments = _.union(obj1.assignments, obj2.assignments);
    milestones = _.union(obj1.milestones, obj2.milestones);
    readings = _.union(obj1.readings, obj2.readings);
    return {
      title: title,
      in_class: in_class,
      assignments: assignments,
      milestones: milestones,
      readings: readings
    };
  };

  return TimelineView;

})(Backbone.View);



},{"../app":5,"../views/supers/View":44}],43:[function(require,module,exports){
var InputItemTemplate, InputItemView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../../app');

View = require('./View');

InputItemTemplate = require('../../templates/steps/inputs/InputItemTemplate.hbs');

WizardStepInputs = require('../../data/WizardStepInputs');

module.exports = InputItemView = (function(_super) {
  __extends(InputItemView, _super);

  function InputItemView() {
    return InputItemView.__super__.constructor.apply(this, arguments);
  }

  InputItemView.prototype.template = InputItemTemplate;

  InputItemView.prototype.className = 'custom-input-wrapper';

  InputItemView.prototype.hoverTime = 500;

  InputItemView.prototype.tipVisible = false;

  InputItemView.prototype.events = {
    'change input': 'itemChangeHandler',
    'keyup input[type="text"]': 'itemChangeHandler',
    'keyup input[type="percent"]': 'itemChangeHandler',
    'click .custom-input--checkbox label span': 'checkButtonClickHandler',
    'click .info-icon': 'infoIconClickHandler',
    'mouseover': 'mouseoverHandler',
    'mouseenter label': 'hideShowTooltip',
    'mouseover .custom-input': 'hideShowTooltip',
    'mouseenter .check-button': 'hideShowTooltip',
    'mouseout': 'mouseoutHandler',
    'click .editable .check-button': 'checkButtonClickHandler',
    'click .custom-input--radiobox .radio-button': 'radioBoxClickHandler',
    'click .custom-input--radio-group .radio-button': 'radioButtonClickHandler',
    'focus .custom-input--text input': 'onFocus',
    'blur .custom-input--text input': 'onBlur'
  };

  InputItemView.prototype.infoIconClickHandler = function() {
    if (!this.$el.hasClass('selected')) {
      return this.showTooltip();
    } else {
      return $('body, html').animate({
        scrollTop: 0
      }, 500);
    }
  };

  InputItemView.prototype.radioButtonClickHandler = function(e) {
    var $button, $inputEl, $otherRadios, $parentEl, $parentGroup;
    e.preventDefault();
    if (this.isDisabled()) {
      return false;
    }
    $button = $(e.currentTarget);
    $parentEl = $button.parents('.custom-input--radio');
    $parentGroup = $button.parents('.custom-input-wrapper');
    $inputEl = $parentEl.find('input[type="radio"]');
    if ($parentEl.hasClass('checked')) {
      Backbone.Mediator.publish('tips:hide');
      return false;
    } else {
      $otherRadios = $parentGroup.find('.custom-input--radio').not($parentEl[0]);
      $otherRadios.find('input[type="radio"]').prop('checked', false).trigger('change');
      $otherRadios.removeClass('checked');
      $parentEl.addClass('checked');
      $inputEl.prop('checked', true);
      return $inputEl.trigger('change');
    }
  };

  InputItemView.prototype.radioBoxClickHandler = function(e) {
    var $otherRadios, $parent;
    e.preventDefault();
    if (this.isDisabled()) {
      return false;
    }
    $otherRadios = this.$el.parents('.step-form-inner').find('.custom-input--radiobox');
    $otherRadios.removeClass('checked').find('input').val('off').trigger('change');
    $parent = this.$el.find('.custom-input--radiobox').addClass('checked');
    if ($parent.hasClass('checked')) {
      this.$inputEl.prop('checked', true);
      this.$inputEl.val('on');
      return this.$inputEl.trigger('change');
    } else {
      this.$inputEl.prop('checked', false);
      this.$inputEl.val('off');
      this.$inputEl.trigger('change');
      return Backbone.Mediator.publish('tips:hide');
    }
  };

  InputItemView.prototype.checkButtonClickHandler = function(e) {
    var $parent;
    e.preventDefault();
    if (this.isDisabled()) {
      return false;
    }
    if (this.$el.find('.custom-input--radiobox').length > 0) {
      return this.radioBoxClickHandler(e);
    }
    $parent = this.$el.find('.custom-input--checkbox').toggleClass('checked');
    if ($parent.hasClass('checked')) {
      this.$inputEl.prop('checked', true);
      this.$inputEl.val('on');
      return this.$inputEl.trigger('change');
    } else {
      this.$inputEl.prop('checked', false);
      this.$inputEl.val('off');
      this.$inputEl.trigger('change');
      return Backbone.Mediator.publish('tips:hide');
    }
  };

  InputItemView.prototype.hoverHandler = function(e) {
    return console.log(e.target);
  };

  InputItemView.prototype.mouseoverHandler = function(e) {
    return this.isHovering = true;
  };

  InputItemView.prototype.mouseoutHandler = function(e) {
    return this.isHovering = false;
  };

  InputItemView.prototype.showTooltip = function() {
    if (this.hasInfo() && this.parentStep.tipVisible === false) {
      this.$el.addClass('selected');
      this.parentStep.tipVisible = true;
      $('body').addClass('tip-open');
      this.parentStep.$el.find(".step-info-tip").removeClass('visible');
      return this.parentStep.$el.find(".step-info-tip[data-item-index='" + this.itemIndex + "']").addClass('visible');
    }
  };

  InputItemView.prototype.hideTooltip = function() {
    if (this.hasInfo()) {
      this.$el.removeClass('selected');
      $('body').removeClass('tip-open');
      this.parentStep.tipVisible = false;
      return this.parentStep.$el.find(".step-info-tip").removeClass('visible');
    }
  };

  InputItemView.prototype.hideShowTooltip = function() {
    if (this.$el.find('.custom-input').hasClass('not-editable')) {
      return false;
    }
    $('.custom-input-wrapper').removeClass('selected');
    this.parentStep.tipVisible = false;
    $('body').removeClass('tip-open');
    this.parentStep.$el.find(".step-info-tip").removeClass('visible');
    return this.showTooltip();
  };

  InputItemView.prototype.labelClickHandler = function(e) {
    return false;
  };

  InputItemView.prototype.itemChangeHandler = function(e) {
    var $target, index, inputId, parentId, pathway, value;
    if (this.inputType === 'radioGroup') {
      $target = $(e.currentTarget);
      index = $(e.currentTarget).attr('id');
      value = $(e.currentTarget).attr('value');
      parentId = $(e.currentTarget).attr('name');
      if ($(e.currentTarget).prop('checked')) {
        this.parentStep.updateRadioAnswer(parentId, index, true);
      } else {
        this.parentStep.updateRadioAnswer(parentId, index, false);
      }
    } else {
      value = $(e.currentTarget).val();
      inputId = $(e.currentTarget).attr('id');
      if (this.parentStep.model.attributes.id === 'grading') {
        pathway = $(e.target).parents('.custom-input').attr('data-pathway-id');
        if (!pathway) {
          return;
        }
        this.parentStep.updateAnswer(inputId, value, true, pathway);
      } else {
        this.parentStep.updateAnswer(inputId, value, false);
      }
      if (this.inputType === 'percent') {
        if (isNaN(parseInt(value))) {
          $(e.currentTarget).val('');
          return;
        } else {
          Backbone.Mediator.publish('grade:change', inputId, value);
        }
      }
    }
    return this.parentStep.updateUserHasAnswered(inputId, value, this.inputType);
  };

  InputItemView.prototype.afterRender = function() {
    this.$el.addClass(this.inputType);
    this.$inputEl = this.$el.find('input');
    if (this.model.attributes.value !== '' && this.model.attributes.type === 'text') {
      this.$el.addClass('open');
    }
    this.hoverTimer = null;
    return this.isHovering = false;
  };

  InputItemView.prototype.hasInfo = function() {
    return this.$el.hasClass('has-info');
  };

  InputItemView.prototype.onFocus = function(e) {
    return this.$el.addClass('open');
  };

  InputItemView.prototype.onBlur = function(e) {
    var $target, value;
    $target = $(e.currentTarget);
    value = $target.val();
    if (value === '') {
      if (!$target.is(':focus')) {
        return this.$el.removeClass('open');
      }
    }
  };

  InputItemView.prototype.isDisabled = function() {
    return this.$el.find('.custom-input').hasClass('not-editable');
  };

  InputItemView.prototype.render = function() {
    return InputItemView.__super__.render.call(this);
  };

  InputItemView.prototype.getInputTypeObject = function() {
    var returnData;
    returnData = {};
    returnData[this.inputType] = true;
    return returnData;
  };

  InputItemView.prototype.getRenderData = function() {
    var allInputs, currentSelected, inputTypeObject, renderInOutput, selectedInputs;
    inputTypeObject = this.getInputTypeObject();
    if (this.inputType === 'checkbox') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'radio') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'text') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'percent') {
      if (this.parentStep.model.attributes.id === 'grading' || this.parentStep.model.attributes.type === 'grading') {
        if (this.model.attributes.contingentUpon.length !== 0) {
          currentSelected = application.homeView.getSelectedIds();
          renderInOutput = false;
          _.each(this.model.attributes.contingentUpon, (function(_this) {
            return function(id) {
              return _.each(currentSelected, function(selectedId) {
                if (id === selectedId) {
                  return renderInOutput = true;
                }
              });
            };
          })(this));
          if (!renderInOutput) {
            return false;
          }
        }
      }
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'radioGroup') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'edit') {
      allInputs = WizardStepInputs[this.model.attributes.id];
      selectedInputs = [];
      _.each(allInputs, (function(_this) {
        return function(input) {
          if (input.type) {
            if (input.type === 'checkbox' || input.type === 'radioBox') {
              if (input.selected === true) {
                return selectedInputs.push(input.label);
              }
            } else if (input.type === 'radioGroup') {
              if (input.id === 'peer_reviews') {
                return selectedInputs.push(input.overviewLabel);
              }
            }
          }
        };
      })(this));
      this.$el.addClass('has-content');
      if (selectedInputs.length === 0) {
        selectedInputs.push("[None selected]");
      }
      return {
        assignments: selectedInputs,
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'radioBox') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'link') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    }
  };

  return InputItemView;

})(View);



},{"../../app":5,"../../data/WizardStepInputs":11,"../../templates/steps/inputs/InputItemTemplate.hbs":24,"./View":44}],44:[function(require,module,exports){
var View,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

require('../../helpers/ViewHelper');

View = (function(_super) {
  __extends(View, _super);

  function View() {
    return View.__super__.constructor.apply(this, arguments);
  }


  /*//--------------------------------------
  //+ PUBLIC PROPERTIES / CONSTANTS
  //--------------------------------------
   */

  View.prototype.template = function() {};

  View.prototype.getRenderData = function() {};


  /*//--------------------------------------
  //+ INHERITED / OVERRIDES
  //--------------------------------------
   */

  View.prototype.initialize = function() {
    return this.render = _.bind(this.render, this);
  };

  View.prototype.render = function() {
    this.$el.html(this.template(this.getRenderData()));
    this.afterRender();
    return this;
  };

  View.prototype.afterRender = function() {};


  /*//--------------------------------------
  //+ PUBLIC METHODS / GETTERS / SETTERS
  //--------------------------------------
   */


  /*//--------------------------------------
  //+ EVENT HANDLERS
  //--------------------------------------
   */


  /*//--------------------------------------
  //+ PRIVATE AND PROTECTED METHODS
  //--------------------------------------
   */

  return View;

})(Backbone.View);

module.exports = View;



},{"../../helpers/ViewHelper":12}]},{},[13])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9UaW1lbGluZURhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1RpbWVsaW5lRGF0YUFsdC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ29uZmlnLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb3Vyc2VJbmZvLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRTdGVwSW5wdXRzLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvbWFpbi5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9TdGVwTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvcm91dGVycy9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvSG9tZVRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2luZm8vSW5wdXRUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGV0YWlsc01vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraVN1bW1hcnlNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0RhdGVJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9HcmFkaW5nSW5wdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSG9tZVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9JbnB1dEl0ZW1WaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvTG9naW5WaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3V0cHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL092ZXJ2aWV3Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBOYXZWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvU3RlcFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9UaW1lbGluZVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvSW5wdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3Mvc3VwZXJzL1ZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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QUFDLENBQUEsYUFBRCxDQUFBLENBQVgsQ0FBWCxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxXQUFELENBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTE07RUFBQSxDQTNCUixDQUFBOztBQUFBLGlCQXFDQSxXQUFBLEdBQWEsU0FBQSxHQUFBLENBckNiLENBQUE7O0FBdUNBO0FBQUE7OztLQXZDQTs7QUEyQ0E7QUFBQTs7O0tBM0NBOztBQStDQTtBQUFBOzs7S0EvQ0E7O2NBQUE7O0dBRmlCLFFBQVEsQ0FBQyxLQUY1QixDQUFBOztBQUFBLE1BdURNLENBQUMsT0FBUCxHQUFpQixJQXZEakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcycpLmNyZWF0ZSgpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzJykuYXR0YWNoKGV4cG9ydHMpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMnKS5hdHRhY2goZXhwb3J0cykiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCBERVNJR04gV0laQVJEXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICAjIEFwcCBEYXRhXG4gICAgQXBwRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb250ZW50JylcblxuICAgIFRpbWVsaW5lRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGEnKVxuXG4gICAgVGltZWxpbmVEYXRhQWx0ID0gcmVxdWlyZSgnLi9kYXRhL1RpbWVsaW5lRGF0YUFsdCcpXG5cbiAgICBAV2l6YXJkQ29uZmlnID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbmZpZycpXG5cbiAgICBAZGF0YSA9IEFwcERhdGFcblxuICAgIEB0aW1lbGluZURhdGEgPSBUaW1lbGluZURhdGFcblxuICAgIEB0aW1lbGluZURhdGFBbHQgPSBUaW1lbGluZURhdGFBbHRcblxuICAgICMgSW1wb3J0IHZpZXdzXG4gICAgSG9tZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0hvbWVWaWV3JylcblxuICAgIExvZ2luVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvTG9naW5WaWV3JylcblxuICAgIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVycy9Sb3V0ZXInKVxuXG5cbiAgICBJbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuICAgIE91dHB1dFZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL091dHB1dFZpZXcnKVxuXG4gICAgVGltZWxpbmVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9UaW1lbGluZVZpZXcnKVxuXG5cbiAgICAjIEluaXRpYWxpemUgdmlld3NcbiAgICBAaG9tZVZpZXcgPSBuZXcgSG9tZVZpZXcoKVxuXG4gICAgQGxvZ2luVmlldyA9IG5ldyBMb2dpblZpZXcoKVxuXG4gICAgQGlucHV0SXRlbVZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldygpXG5cbiAgICBAb3V0cHV0VmlldyA9IG5ldyBPdXRwdXRWaWV3KClcblxuICAgIEB0aW1lbGluZVZpZXcgPSBuZXcgVGltZWxpbmVWaWV3KClcblxuICAgIEByb3V0ZXIgPSBuZXcgUm91dGVyKClcblxuICAgIFxuICAgIFxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvbiIsIlRpbWVsaW5lRGF0YSA9IFtcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgdGl0bGU6IFsnV2lraXBlZGlhIGVzc2VudGlhbHMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ludHJvIHRvIFdpa2lwZWRpYX19J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW11cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogNVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRWRpdGluZyBiYXNpY3MnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIHRoZSB0cmFpbmluZ319JyAjVFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fScgI1RcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319JyAjVFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX0nXG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogOFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FZGl0aW5nIGJhc2ljcyBpbiBjbGFzc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhbiBhcnRpY2xlfX0nICMgRlcgZ2V0dGluZ19zdGFydGVkLmNyaXRpcXVlX2FydGljbGUuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29weWVkaXQgYW4gYXJ0aWNsZX19JyAjIEZXMiBnZXR0aW5nX3N0YXJ0ZWQuY29weV9lZGl0X2FydGljbGUuc2VsZWN0ZWRcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ1VzaW5nIHNvdXJjZXMgYW5kIGNob29zaW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Vc2luZyBzb3VyY2VzIGluIGNsYXNzfX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FkZCB0byBhbiBhcnRpY2xlfX0nICMgRlczIGdldHRpbmdfc3RhcnRlZC5hZGRfdG9fYXJ0aWNsZS5zZWxlY3RlZFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbGx1c3RyYXRlIGFuIGFydGljbGV9fScgIyBGVzQgZ2V0dGluZ19zdGFydGVkLmlsbHVzdHJhdGVfYXJ0aWNsZS5zZWxlY3RlZFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9MaXN0IGFydGljbGUgY2hvaWNlcycgIyBQQSBjaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBhcnRpY2xlcyBmcm9tIGEgbGlzdH19JyAjIFBBIGNob29zaW5nX2FydGljbGVzLnByZXBhcmVfbGlzdC5zZWxlY3RlZH1cbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gV2VlayA1fX0nXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydGaW5hbGl6aW5nIHRvcGljcyBhbmQgc3RhcnRpbmcgcmVzZWFyY2gnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzfX0nICNDQSBjaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBpbGUgYSBiaWJsaW9ncmFwaHl9fScgI1BCXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA3XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydEcmFmdGluZyBzdGFydGVyIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIH19JyAjIFBPIHJlc2VhcmNoX3BsYW5uaW5nLmNyZWF0ZV9vdXRsaW5lLnNlbGVjdGVkICYmIGRyYWZ0c19tYWluc3BhY2Uuc2FuZGJveC5zZWxlY3RlZFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyB9fScgIyBQTyByZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBkcmFmdHNfbWFpbnNwYWNlLndvcmtfbGl2ZS5zZWxlY3RlZFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PdXRsaW5lIGFzIGxlYWQgc2VjdGlvbiB9fScgI1BPIHJlc2VhcmNoX3BsYW5uaW5nLndyaXRlX2xlYWQuc2VsZWN0ZWRcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBoYXZlIHN0YXJ0ZWQgZWRpdGluZ319J1xuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ01vdmluZyBhcnRpY2xlcyB0byB0aGUgbWFpbiBzcGFjZSddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Nb3ZlIHRvIG1haW4gc3BhY2V9fScgI01NU1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EWUsgbm9taW5hdGlvbnN9fScgI2R5ay5keWsuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwYW5kIHlvdXIgYXJ0aWNsZX19JyBcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0J1aWxkaW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGV9fScgI0NQUiBpZiBwZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zLjAuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzfCBwZWVycmV2aWV3bnVtYmVyID0ge3twZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy52YWx1ZX19IH19JyAjIENQUiBlbHNlXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAyXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydDcmVhdGluZyBmaXJzdCBkcmFmdCddXG4gICAgaW5fY2xhc3M6IFtcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fScgIzFEQ1xuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogNlxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnR2V0dGluZyBhbmQgZ2l2aW5nIGZlZWRiYWNrJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Hcm91cCBzdWdnZXN0aW9uc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBvbmUgcGVlciByZXZpZXd9fScgI1BSMSBwZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zLjAuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fSB9fScgI2Vsc2VcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fSdcbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydSZXNwb25kaW5nIHRvIGZlZWRiYWNrJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX0nICNSRkIgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ29taXQnXG4gICAgdGl0bGU6IFsnQ29udGludWluZyBpbXByb3ZpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50c319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXN9fScgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAzXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlc319JyBcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDRcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHN9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzfX0nIFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmVwYXJlIGluLWNsYXNzIHByZXNlbnRhdGlvbn19JyAjaWZcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDlcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0NsYXNzIHByZXNlbnRhdGlvbnMgYW5kIGZpbmlzaGluZyB0b3VjaGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Jbi1jbGFzcyBwcmVzZW50YXRpb25zfX0nICNzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLmNsYXNzX3ByZXNlbnRhdGlvbi5zZWxlY3RlZFxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9GaW5hbCB0b3VjaGVzIHRvIGFydGljbGVzfX0nICNGQVxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9SZWZsZWN0aXZlIGVzc2F5fX0nICNzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLnJlZmxlY3RpdmVfZXNzYXkuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2lraXBlZGlhIHBvcnRmb2xpb319JyAjc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5wb3J0Zm9saW8uc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3JpZ2luYWwgYXJndW1lbnQgcGFwZXJ9fScgI3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMub3JpZ2luYWxfcGFwZXIuc2VsZWN0ZWRcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fSdcbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAxMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRHVlIGRhdGUnIF1cbiAgICBpbl9jbGFzczogW11cbiAgICBhc3NpZ25tZW50czogW11cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FsbCBzdHVkZW50cyBmaW5pc2hlZH19J1xuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVsaW5lRGF0YVxuXG4iLCJUaW1lbGluZURhdGFBbHQgPSBbXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIHRpdGxlOiBbJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0ludHJvIHRvIFdpa2lwZWRpYSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDVcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0VkaXRpbmcgYmFzaWNzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0NvbXBsZXRlIHRoZSB0cmFpbmluZycgI1RcbiAgICAgICdDcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXAnICNUXG4gICAgICAnUHJhY3RpY2UgY29tbXVuaWNhdGluZycgI1RcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ1N0dWRlbnRzIGVucm9sbGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDhcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0V4cGxvcmluZyB0aGUgdG9waWMgYXJlYSddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdFZGl0aW5nIGJhc2ljcyBpbiBjbGFzcydcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdFdmFsdWF0ZSBhbiBhcnRpY2xlJyAjIEZXIGdldHRpbmdfc3RhcnRlZC5jcml0aXF1ZV9hcnRpY2xlLnNlbGVjdGVkXG4gICAgICAnQ29weWVkaXQgYW4gYXJ0aWNsZScgIyBGVzIgZ2V0dGluZ19zdGFydGVkLmNvcHlfZWRpdF9hcnRpY2xlLnNlbGVjdGVkXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydVc2luZyBzb3VyY2VzIGFuZCBjaG9vc2luZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdVc2luZyBzb3VyY2VzIGluIGNsYXNzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0FkZCB0byBhbiBhcnRpY2xlJyAjIEZXMyBnZXR0aW5nX3N0YXJ0ZWQuYWRkX3RvX2FydGljbGUuc2VsZWN0ZWRcbiAgICAgICdJbGx1c3RyYXRlIGFuIGFydGljbGUnICMgRlc0IGdldHRpbmdfc3RhcnRlZC5pbGx1c3RyYXRlX2FydGljbGUuc2VsZWN0ZWRcbiAgICAgICdMaXN0IGFydGljbGUgY2hvaWNlcycgIyBQQSBjaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkXG4gICAgICAnQ2hvb3NlIGFydGljbGVzIGZyb20gYSBsaXN0JyAjIFBBIGNob29zaW5nX2FydGljbGVzLnByZXBhcmVfbGlzdC5zZWxlY3RlZH1cbiAgICAgICdFdmFsdWF0ZSBhcnRpY2xlIHNlbGVjdGlvbnMgfCBkdWUgPSBuZXh0IHdlZWsnXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydGaW5hbGl6aW5nIHRvcGljcyBhbmQgc3RhcnRpbmcgcmVzZWFyY2gnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnRGlzY3VzcyB0b3BpY3MnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXMnICNDQSBjaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkXG4gICAgICAnQ29tcGlsZSBhIGJpYmxpb2dyYXBoeScgI1BCXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA3XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydEcmFmdGluZyBzdGFydGVyIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXMnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnQ29udmVudGlvbmFsIG91dGxpbmUgJyAjIFBPIHJlc2VhcmNoX3BsYW5uaW5nLmNyZWF0ZV9vdXRsaW5lLnNlbGVjdGVkICYmIGRyYWZ0c19tYWluc3BhY2Uuc2FuZGJveC5zZWxlY3RlZFxuICAgICAgJ0NvbnZlbnRpb25hbCBvdXRsaW5lIHwgc2FuZGJveCA9IG5vICcgIyBQTyByZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBkcmFmdHNfbWFpbnNwYWNlLndvcmtfbGl2ZS5zZWxlY3RlZFxuICAgICAgJ091dGxpbmUgYXMgbGVhZCBzZWN0aW9uJyAjUE8gcmVzZWFyY2hfcGxhbm5pbmcud3JpdGVfbGVhZC5zZWxlY3RlZFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdtaWxlc3RvbmUnXG4gICAgICAgIHRpdGxlOiAnU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmcnXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnTW92aW5nIGFydGljbGVzIHRvIHRoZSBtYWluIHNwYWNlJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ01haW4gc3BhY2UgaW4gY2xhc3MnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnTW92ZSB0byBtYWluIHNwYWNlJyAjTU1TXG4gICAgICAnRFlLIG5vbWluYXRpb25zJyAjZHlrLmR5ay5zZWxlY3RlZFxuICAgICAgJ0V4cGFuZCB5b3VyIGFydGljbGUnIFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnQnVpbGRpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnQnVpbGRpbmcgYXJ0aWNsZXMgaW4gY2xhc3MnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlJyAjQ1BSIGlmIHBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnMuMC5zZWxlY3RlZFxuICAgICAgJ0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fSB9fScgIyBDUFIgZWxzZVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMlxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnQ3JlYXRpbmcgZmlyc3QgZHJhZnQnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnQ29tcGxldGUgZmlyc3QgZHJhZnQnICMxRENcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDZcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0dldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdHcm91cCBzdWdnZXN0aW9ucydcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdEbyBvbmUgcGVlciByZXZpZXcnICNQUjEgcGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9ucy4wLnNlbGVjdGVkXG4gICAgICAnRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fScgI2Vsc2VcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydSZXNwb25kaW5nIHRvIGZlZWRiYWNrJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ01lZGlhIGxpdGVyYWN5IGRpc2N1c3Npb24nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3MnICNSRkIgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ29taXQnXG4gICAgdGl0bGU6IFsnQ29udGludWluZyBpbXByb3ZpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlcycgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAzXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdEaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHMnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzJyBcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDRcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnIFxuICAgICAgJ1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9uJyAjaWZcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDlcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0NsYXNzIHByZXNlbnRhdGlvbnMgYW5kIGZpbmlzaGluZyB0b3VjaGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0luLWNsYXNzIHByZXNlbnRhdGlvbnMnICNzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLmNsYXNzX3ByZXNlbnRhdGlvbi5zZWxlY3RlZFxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXMnICNGQVxuICAgICAgJ1JlZmxlY3RpdmUgZXNzYXknICNzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLnJlZmxlY3RpdmVfZXNzYXkuc2VsZWN0ZWRcbiAgICAgICdXaWtpcGVkaWEgcG9ydGZvbGlvJyAjc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5wb3J0Zm9saW8uc2VsZWN0ZWRcbiAgICAgICdPcmlnaW5hbCBhcmd1bWVudCBwYXBlcicgI3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMub3JpZ2luYWxfcGFwZXIuc2VsZWN0ZWRcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAxMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRHVlIGRhdGUnIF1cbiAgICBpbl9jbGFzczogW11cbiAgICBhc3NpZ25tZW50czogW11cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQWxsIHN0dWRlbnRzIGZpbmlzaGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVsaW5lRGF0YUFsdFxuXG4iLCJXaXphcmRDb25maWcgPSB7XG4gIGludHJvX3N0ZXBzOiBbXG4gICAge1xuICAgICAgaWQ6IFwiaW50cm9cIlxuICAgICAgdGl0bGU6ICc8Y2VudGVyPldlbGNvbWUgdG8gdGhlPGJyIC8+QXNzaWdubWVudCBEZXNpZ24gV2l6YXJkITwvY2VudGVyPidcbiAgICAgIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICAgICAgaW5zdHJ1Y3Rpb25zOiAnJ1xuICAgICAgaW5wdXRzOiBbXVxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCBoZWxwIHlvdSB0byBlYXNpbHkgY3JlYXRlIGEgY3VzdG9taXplZCBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnQgYW5kIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPldoZW4geW914oCZcmUgZmluaXNoZWQsIHlvdSdsbCBoYXZlIGEgcmVhZHktdG8tdXNlIGxlc3NvbiBwbGFuLCB3aXRoIHdlZWtseSBhc3NpZ25tZW50cywgcHVibGlzaGVkIGRpcmVjdGx5IG9udG8gYSBzYW5kYm94IHBhZ2Ugb24gV2lraXBlZGlhIHdoZXJlIHlvdSBjYW4gY3VzdG9tZWl6ZSBpdCBldmVuIGZ1cnRoZXIuPC9wPlwiICAgICBcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5MZXTigJlzIHN0YXJ0IGJ5IGZpbGxpbmcgaW4gc29tZSBiYXNpY3MgYWJvdXQgeW91IGFuZCB5b3VyIGNvdXJzZTo8L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gICAge1xuICAgICAgaWQ6IFwiYXNzaWdubWVudF9zZWxlY3Rpb25cIlxuICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgYXNzaWdubWVudCBzZWxlY3Rpb25zJ1xuICAgICAgZm9ybVRpdGxlOiAnQXZhaWxhYmxlIGFzc2lnbm1lbnRzOidcbiAgICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGlzIHN1aXRhYmxlIGZvciBXaWtpcGVkaWEgPGVtPmFuZDwvZW0+IGFjaGlldmVzIHlvdXIgc3R1ZGVudCBsZWFybmluZyBvYmplY3RpdmVzLiBZb3VyIGZpcnN0IHN0ZXAgaXMgdG8gY2hvb3NlIHdoaWNoIGFzc2lnbm1lbnQocykgeW91J2xsIGJlIGFza2luZyB5b3VyIHN0dWRlbnRzIHRvIGNvbXBsZXRlIGFzIHBhcnQgb2YgdGhlIGNvdXJzZS5cIlxuICAgICAgaW5wdXRzOiBbXVxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+V2UndmUgY3JlYXRlZCBzb21lIGd1aWRlbGluZXMgdG8gaGVscCB5b3UsIGJ1dCB5b3UnbGwgbmVlZCB0byBtYWtlIHNvbWUga2V5IGRlY2lzaW9ucywgc3VjaCBhczogd2hpY2ggbGVhcm5pbmcgb2JqZWN0aXZlcyBhcmUgeW91IHRhcmdldGluZyB3aXRoIHRoaXMgYXNzaWdubWVudD8gV2hhdCBza2lsbHMgZG8geW91ciBzdHVkZW50cyBhbHJlYWR5IGhhdmU/IEhvdyBtdWNoIHRpbWUgY2FuIHlvdSBkZXZvdGUgdG8gdGhlIGFzc2lnbm1lbnQ/PC9wPlwiXG4gICAgICAgICAgICBcIjxwPk1vc3QgaW5zdHJ1Y3RvcnMgYXNrIHRoZWlyIHN0dWRlbnRzIHRvIHdyaXRlIG9yIGV4cGFuZCBhbiBhcnRpY2xlLiBTdHVkZW50cyBzdGFydCBieSBsZWFybmluZyB0aGUgYmFzaWNzIG9mIFdpa2lwZWRpYSwgYW5kIHRoZW4gZm9jdXMgb24gdGhlIGNvbnRlbnQuIFRoZXkgcGxhbiwgcmVzZWFyY2gsIGFuZCB3cml0ZSBhIHByZXZpb3VzbHkgbWlzc2luZyBXaWtpcGVkaWEgYXJ0aWNsZSwgb3IgY29udHJpYnV0ZSB0byBhbiBpbmNvbXBsZXRlIGVudHJ5IG9uIGEgY291cnNlLXJlbGF0ZWQgdG9waWMuIFRoaXMgYXNzaWdubWVudCB0eXBpY2FsbHkgcmVwbGFjZXMgYSB0ZXJtIHBhcGVyIG9yIHJlc2VhcmNoIHByb2plY3QsIG9yIGl0IGZvcm1zIHRoZSBsaXRlcmF0dXJlIHJldmlldyBzZWN0aW9uIG9mIGEgbGFyZ2VyIHBhcGVyLiBUaGUgc3R1ZGVudCBsZWFybmluZyBvdXRjb21lIGlzIGhpZ2ggd2l0aCB0aGlzIGFzc2lnbm1lbnQsIGJ1dCBpdCBkb2VzIHRha2UgYSBzaWduaWZpY2FudCBhbW91bnQgb2YgdGltZS4gWW91ciBzdHVkZW50cyBuZWVkIHRvIGxlYXJuIGJvdGggdGhlIHdpa2kgbWFya3VwIGxhbmd1YWdlIGFuZCBrZXkgcG9saWNpZXMgYW5kIGV4cGVjdGF0aW9ucyBvZiB0aGUgV2lraXBlZGlhLWVkaXRpbmcgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5JZiB3cml0aW5nIGFuIGFydGljbGUgaXNuJ3QgcmlnaHQgZm9yIHlvdXIgY2xhc3MsIG90aGVyIGFzc2lnbm1lbnQgb3B0aW9ucyBvZmZlciBzdHVkZW50cyB2YWx1YWJsZSBsZWFybmluZyBvcHBvcnR1bml0aWVzIGFuZCBoZWxwIHRvIGltcHJvdmUgV2lraXBlZGlhLiBTZWxlY3QgYW4gYXNzaWdubWVudCB0eXBlIG9uIHRoZSBsZWZ0IHRvIGxlYXJuIG1vcmUuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICBdXG4gIHBhdGh3YXlzOiB7XG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICByZXNlYXJjaHdyaXRlOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcImxlYXJuaW5nX2Vzc2VudGlhbHNcIlxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuXCJcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIHVzZXIgYWNjb3VudHMgYW5kIHRoZW4gY29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5TdHVkZW50cyB3aG8gY29tcGxldGUgdGhpcyB0cmFpbmluZyBhcmUgYmV0dGVyIHByZXBhcmVkIHRvIGZvY3VzIG9uIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgc3BlbmQgbGVzcyB0aW1lIGRpc3RyYWN0ZWQgYnkgY2xlYW5pbmcgdXAgYWZ0ZXIgZXJyb3JzLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5XaWxsIGNvbXBsZXRpb24gb2YgdGhlIHN0dWRlbnQgdHJhaW5pbmcgYmUgcGFydCBvZiB5b3VyIHN0dWRlbnRzXFwnIGdyYWRlcz8gKE1ha2UgeW91ciBjaG9pY2UgYXQgdGhlIHRvcCBsZWZ0Lik8L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lcydcbiAgICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Db21wbGV0ZSB0aGUgPGVtPm9ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHM8L2VtPi4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgICAgICB0aXRsZTogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGVhcmx5IGVkaXRpbmcgdGFza3MnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIGVhcmx5IG9uLiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgICAgICBmb3JtVGl0bGU6ICdXaGljaCBiYXNpYyBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlPydcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+V2hpY2ggaW50cm9kdWN0b3J5IGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSB0byBhY2NsaW1hdGUgeW91ciBzdHVkZW50cyB0byBXaWtpcGVkaWE/IFlvdSBjYW4gc2VsZWN0IG5vbmUsIG9uZSwgb3IgbW9yZS4gV2hpY2hldmVyIHlvdSBzZWxlY3Qgd2lsbCBiZSBhZGRlZCB0byB0aGUgYXNzaWdubWVudCB0aW1lbGluZS48L3A+J1xuICAgICAgICAgICAgICAnPHVsPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+QWRkIHRvIGFuIGFydGljbGUuPC9zdHJvbmc+IFVzaW5nIGNvdXJzZSByZWFkaW5ncyBvciBvdGhlciByZWxldmFudCBzZWNvbmRhcnkgc291cmNlcywgYWRkIDHigJMyIHNlbnRlbmNlcyBvZiBuZXcgaW5mb3JtYXRpb24gdG8gYSBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcy4gQmUgc3VyZSB0byBpbnRlZ3JhdGUgaXQgd2VsbCBpbnRvIHRoZSBleGlzdGluZyBhcnRpY2xlLCBhbmQgaW5jbHVkZSBhIGNpdGF0aW9uIHRvIHRoZSBzb3VyY2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q29weWVkaXQgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQnJvd3NlIFdpa2lwZWRpYSB1bnRpbCB5b3UgZmluZCBhbiBhcnRpY2xlIHRoYXQgeW91IHdvdWxkIGxpa2UgdG8gaW1wcm92ZSwgYW5kIG1ha2Ugc29tZSBlZGl0cyB0byBpbXByb3ZlIHRoZSBsYW5ndWFnZSBvciBmb3JtYXR0aW5nLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgdXBsb2FkaW5nIGFuZCBhZGRpbmcgYSBwaG90byB5b3UgdG9vay48L2xpPlxuICAgICAgICAgICAgICA8L3VsPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+Rm9yIG1vc3QgY291cnNlcywgdGhlIDxlbT5Dcml0aXF1ZSBhbiBhcnRpY2xlPC9lbT4gYW5kIDxlbT5BZGQgdG8gYW4gYXJ0aWNsZTwvZW0+IGV4ZXJjaXNlcyBwcm92aWRlIGEgbmljZSBmb3VuZGF0aW9uIGZvciB0aGUgbWFpbiB3cml0aW5nIHByb2plY3QuIFRoZXNlIGhhdmUgYmVlbiBzZWxlY3RlZCBieSBkZWZhdWx0LjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgIHRpdGxlOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGZvcm1UaXRsZTogJ0hvdyB3aWxsIHlvdXIgY2xhc3Mgc2VsZWN0IGFydGljbGVzPydcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkNob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlNvbWUgYXJ0aWNsZXMgbWF5IGluaXRpYWxseSBsb29rIGVhc3kgdG8gaW1wcm92ZSwgYnV0IHF1YWxpdHkgcmVmZXJlbmNlcyB0byBleHBhbmQgdGhlbSBtYXkgYmUgZGlmZmljdWx0IHRvIGZpbmQuIEZpbmRpbmcgdG9waWNzIHdpdGggdGhlIHJpZ2h0IGJhbGFuY2UgYmV0d2VlbiBwb29yIFdpa2lwZWRpYSBjb3ZlcmFnZSBhbmQgYXZhaWxhYmxlIGxpdGVyYXR1cmUgZnJvbSB3aGljaCB0byBleHBhbmQgdGhhdCBjb3ZlcmFnZSBjYW4gYmUgdHJpY2t5LiBIZXJlIGFyZSBzb21lIGd1aWRlbGluZXMgdG8ga2VlcCBpbiBtaW5kIHdoZW4gc2VsZWN0aW5nIGFydGljbGVzIGZvciBpbXByb3ZlbWVudC48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0dvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5HcmF2aXRhdGUgdG93YXJkIFxcXCJzdHViXFxcIiBhbmQgXFxcInN0YXJ0XFxcIiBjbGFzcyBhcnRpY2xlcy4gVGhlc2UgYXJ0aWNsZXMgb2Z0ZW4gaGF2ZSBvbmx5IDHigJMyIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gUmVsZXZhbnQgV2lraVByb2plY3QgcGFnZXMgY2FuIHByb3ZpZGUgYSBsaXN0IG9mIHN0dWJzIHRoYXQgbmVlZCBpbXByb3ZlbWVudC48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdOb3Qgc3VjaCBhIGdvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5BcnRpY2xlcyB0aGF0IGFyZSBcIm5vdCBzdWNoIGEgZ29vZCBjaG9pY2VcIiBmb3IgbmV3Y29tZXJzIHVzdWFsbHkgaW52b2x2ZSBhIGxhY2sgb2YgYXBwcm9wcmlhdGUgcmVzZWFyY2ggbWF0ZXJpYWwsIGhpZ2hseSBjb250cm92ZXJzaWFsIHRvcGljcyB0aGF0IG1heSBhbHJlYWR5IGJlIHdlbGwgZGV2ZWxvcGVkLCBicm9hZCBzdWJqZWN0cywgb3IgdG9waWNzIGZvciB3aGljaCBpdCBpcyBkaWZmaWN1bHQgdG8gZGVtb25zdHJhdGUgbm90YWJpbGl0eS48L3A+J1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Zb3Ugc2hvdWxkIHByb2JhYmx5IGF2b2lkIHRyeWluZyB0byBpbXByb3ZlIGFydGljbGVzIG9uIHRvcGljcyB0aGF0IGFyZSBoaWdobHkgY29udHJvdmVyc2lhbCAoZm9yIGV4YW1wbGUsIEdsb2JhbCBXYXJtaW5nLCBBYm9ydGlvbiwgb3IgU2NpZW50b2xvZ3kpLiBZb3UgbWF5IGJlIG1vcmUgc3VjY2Vzc2Z1bCBzdGFydGluZyBhIHN1Yi1hcnRpY2xlIG9uIHRoZSB0b3BpYyBpbnN0ZWFkLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Eb24ndCBzdGFydCBhcnRpY2xlcyB3aXRoIHRpdGxlcyB0aGF0IGltcGx5IGFuIGFyZ3VtZW50IG9yIGVzc2F5LWxpa2UgYXBwcm9hY2ggKGUuZy4sIFRoZSBFZmZlY3RzIFRoYXQgVGhlIFJlY2VudCBTdWItUHJpbWUgTW9ydGdhZ2UgQ3Jpc2lzIGhhcyBoYWQgb24gdGhlIFVTIGFuZCBHbG9iYWwgRWNvbm9taWNzKS4gVGhlc2UgdHlwZSBvZiB0aXRsZXMsIGFuZCBtb3N0IGxpa2VseSB0aGUgY29udGVudCB0b28sIG1heSBub3QgYmUgYXBwcm9wcmlhdGUgZm9yIGFuIGVuY3ljbG9wZWRpYS48L2xpPlxuICAgICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlIGluc3RydWN0b3IsIHlvdSBzaG91bGQgYXBwbHkgeW91ciBvd24gZXhwZXJ0aXNlIHRvIGV4YW1pbmluZyBXaWtpcGVkaWHigJlzIGNvdmVyYWdlIG9mIHlvdXIgZmllbGQuIFlvdSB1bmRlcnN0YW5kIHRoZSBicm9hZGVyIGludGVsbGVjdHVhbCBjb250ZXh0IHdoZXJlIGluZGl2aWR1YWwgdG9waWNzIGZpdCBpbiwgeW91IGNhbiByZWNvZ25pemUgd2hlcmUgV2lraXBlZGlhIGZhbGxzIHNob3J0LCB5b3Uga25vd+KAlG9yIGtub3cgaG93IHRvIGZpbmTigJR0aGUgcmVsZXZhbnQgbGl0ZXJhdHVyZSwgYW5kIHlvdSBrbm93IHdoYXQgdG9waWNzIHlvdXIgc3R1ZGVudHMgc2hvdWxkIGJlIGFibGUgdG8gaGFuZGxlLiBZb3VyIGd1aWRhbmNlIG9uIGFydGljbGUgY2hvaWNlIGFuZCBzb3VyY2luZyBpcyBjcml0aWNhbCBmb3IgYm90aCB5b3VyIHN0dWRlbnRz4oCZIHN1Y2Nlc3MgYW5kIHRoZSBpbXByb3ZlbWVudCBvZiBXaWtpcGVkaWEuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlRoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gSGF2aW5nIHN0dWRlbnRzIGZpbmQgdGhlaXIgb3duIGFydGljbGVzIHByb3ZpZGVzIHRoZW0gd2l0aCBhIHNlbnNlIG9mIG1vdGl2YXRpb24gYW5kIG93bmVyc2hpcCBvdmVyIHRoZSBhc3NpZ25tZW50IGFuZCBleGVyY2lzZXMgdGhlaXIgY3JpdGljYWwgdGhpbmtpbmcgc2tpbGxzIGFzIHRoZXkgaWRlbnRpZnkgY29udGVudCBnYXBzLCBidXQgaXQgbWF5IGFsc28gbGVhZCB0byBjaG9pY2VzIHRoYXQgYXJlIGZ1cnRoZXIgYWZpZWxkIGZyb20gY291cnNlIG1hdGVyaWFsLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJyZXNlYXJjaF9wbGFubmluZ1wiXG4gICAgICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdIb3cgc2hvdWxkIHN0dWRlbnRzIHBsYW4gdGhlaXIgYXJ0aWNsZXM/J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGFibGUgZm9yIFdpa2lwZWRpYS4gVGhhdCdzIHdoeSB3ZSByZWNvbW1lbmQgYXNraW5nIHN0dWRlbnRzIHRvIHB1dCB0b2dldGhlciBhIGJpYmxpb2dyYXBoeSBvZiBtYXRlcmlhbHMgdGhleSB3YW50IHRvIHVzZSBpbiBlZGl0aW5nIHRoZSBhcnRpY2xlLCB3aGljaCBjYW4gdGhlbiBiZSBhc3Nlc3NlZCBieSB5b3UgYW5kIG90aGVyIFdpa2lwZWRpYW5zLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIHRpdGxlOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3ggcGFnZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIG9mIGVhY2ggYXBwcm9hY2guJ1xuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBzYW5kYm94ZXMnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U2FuZGJveGVzIOKAlCBwYWdlcyBhc3NvY2lhdGVkIHdpdGggYW4gaW5kaXZpZHVhbCBlZGl0b3IgdGhhdCBhcmUgbm90IGNvbnNpZGVyZWQgcGFydCBvZiBXaWtpcGVkaWEgcHJvcGVyIOKAlCBtYWtlIHN0dWRlbnRzIGZlZWwgc2FmZS4gVGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMgb3Igb3RoZXIgV2lraXBlZGlhbnMgYWx0ZXJpbmcgdGhlaXIgd3JpdGluZy4gSG93ZXZlciwgc2FuZGJveCBlZGl0aW5nIGxpbWl0cyBtYW55IG9mIHRoZSB1bmlxdWUgYXNwZWN0cyBvZiBXaWtpcGVkaWEgYXMgYSB0ZWFjaGluZyB0b29sLCBzdWNoIGFzIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBhbmQgaW5jcmVtZW50YWwgZHJhZnRpbmcuIFNwZW5kaW5nIG1vcmUgdGhhbiBhIHdlZWsgb3IgdHdvIGluIHNhbmRib3hlcyBpcyBzdHJvbmdseSBkaXNjb3VyYWdlZC48L3A+XCIgXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBlZGl0aW5nIGxpdmUnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RWRpdGluZyBsaXZlIGlzIGV4Y2l0aW5nIGZvciB0aGUgc3R1ZGVudHMgYmVjYXVzZSB0aGV5IGNhbiBzZWUgdGhlaXIgY2hhbmdlcyB0byB0aGUgYXJ0aWNsZXMgaW1tZWRpYXRlbHkgYW5kIGV4cGVyaWVuY2UgdGhlIGNvbGxhYm9yYXRpdmUgZWRpdGluZyBwcm9jZXNzIHRocm91Z2hvdXQgdGhlIGFzc2lnbm1lbnQuIEhvd2V2ZXIsIGJlY2F1c2UgbmV3IGVkaXRvcnMgb2Z0ZW4gdW5pbnRlbnRpb25hbGx5IGJyZWFrIFdpa2lwZWRpYSBydWxlcywgc29tZXRpbWVzIHN0dWRlbnRz4oCZIGFkZGl0aW9ucyBhcmUgcXVlc3Rpb25lZCBvciByZW1vdmVkLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgICAgIHRpdGxlOiAnUGVlciBmZWVkYmFjaydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICAgICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkNvbGxhYm9yYXRpb24gaXMgYSBjcml0aWNhbCBlbGVtZW50IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEuXCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5QZWVyIHJldmlld3MgYXJlIGFub3RoZXIgY2hhbmNlIGZvciBzdHVkZW50cyB0byBwcmFjdGljZSBjcml0aWNhbCB0aGlua2luZy4gVXNlZnVsIHJldmlld3MgZm9jdXMgb24gc3BlY2lmaWMgaXNzdWVzIHRoYXQgY2FuIGJlIGltcHJvdmVkLiBTaW5jZSBzdHVkZW50cyBhcmUgdXN1YWxseSBoZXNpdGFudCB0byBjcml0aWNpemUgdGhlaXIgY2xhc3NtYXRlc+KAlGFuZCBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyBtYXkgZ2V0IGFubm95ZWQgd2l0aCBhIHN0cmVhbSBvZiBwcmFpc2UgZnJvbSBzdHVkZW50cyB0aGF0IGdsb3NzZXMgb3ZlciBhbiBhcnRpY2xlJ3Mgc2hvcnRjb21pbmdz4oCUaXQncyBpbXBvcnRhbnQgdG8gZ2l2ZXMgZXhhbXBsZXMgb2YgdGhlIGtpbmRzIG9mIGNvbnN0cnVjdGl2ZWx5IGNyaXRpY2FsIGZlZWRiYWNrIHRoYXQgYXJlIHRoZSBtb3N0IGhlbHBmdWwuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+SG93IG1hbnkgcGVlciByZXZpZXdzIHdpbGwgeW91IGFzayBlYWNoIHN0dWRlbnQgdG8gY29udHJpYnV0ZSBkdXJpbmcgdGhlIGNvdXJzZT88L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICAgICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyAob3B0aW9uYWwpOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkJ5IHRoZSB0aW1lIHN0dWRlbnRzIGhhdmUgbWFkZSBpbXByb3ZlbWVudHMgYmFzZWQgb24gY2xhc3NtYXRlcycgY29tbWVudHPigJRhbmQgaWRlYWxseSBzdWdnZXN0aW9ucyBmcm9tIHlvdSBhcyB3ZWxs4oCUdGhleSBzaG91bGQgaGF2ZSBwcm9kdWNlZCBuZWFybHkgY29tcGxldGUgYXJ0aWNsZXMuIE5vdyBpcyB0aGUgY2hhbmNlIHRvIGVuY291cmFnZSB0aGVtIHRvIHdhZGUgYSBsaXR0bGUgZGVlcGVyIGludG8gV2lraXBlZGlhIGFuZCBpdHMgbm9ybXMgYW5kIGNyaXRlcmlhIHRvIGNyZWF0ZSBncmVhdCBjb250ZW50LlwiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgXCI8cD5Zb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0cyBhbmQgbGltaXRzIG9mIFdpa2lwZWRpYS4gQ29uc2lkZXIgYnJpbmdpbmcgaW4gYSBndWVzdCBzcGVha2VyLCBoYXZpbmcgYSBwYW5lbCBkaXNjdXNzaW9uLCBvciBzaW1wbHkgaGF2aW5nIGFuIG9wZW4gZGlzY3Vzc2lvbiBpbiBjbGFzcyBhYm91dCB3aGF0IHRoZSBzdHVkZW50cyBoYXZlIGRvbmUgc28gZmFyIGFuZCB3aHkgKG9yIHdoZXRoZXIpIGl0IG1hdHRlcnMuPC9wPlwiXG4gICAgICAgICAgICAgXCI8cD5JbiBhZGRpdGlvbiB0byB0aGUgV2lraXBlZGlhIGFydGljbGUgd3JpdGluZyBpdHNlbGYsIHlvdSBtYXkgd2FudCB0byB1c2UgYSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnQuIFRoZXNlIGFzc2lnbm1lbnRzIGNhbiByZWluZm9yY2UgYW5kIGRlZXBlbiB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgYWxzbyBoZWxwIHlvdSB0byB1bmRlcnN0YW5kIGFuZCBldmFsdWF0ZSB0aGUgc3R1ZGVudHMnIHdvcmsgYW5kIGxlYXJuaW5nIG91dGNvbWVzLiBPbiB0aGUgbGVmdCBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuIFNjcm9sbCBvdmVyIGVhY2ggZm9yIG1vcmUgaW5mb3JtYXRpb24sIGFuZCBzZWxlY3QgYW55IHRoYXQgeW91IHdpc2ggdG8gdXNlIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJkeWtcIlxuICAgICAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5EaWQgWW91IEtub3c8L2VtPiBwcm9jZXNzJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RGlkIFlvdSBLbm93IChEWUspIGlzIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBoaWdobGlnaHRpbmcgbmV3IGNvbnRlbnQgdGhhdCBoYXMgYmVlbiBhZGRlZCB0byBXaWtpcGVkaWEgaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy4gRFlLIGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+VGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4IG9yIG1vcmUpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBTdHVkZW50cyB3aG8gbWVldCB0aGlzIGNyaXRlcmlhIG1heSB3YW50IHRvIG5vbWluYXRlIHRoZWlyIGNvbnRyaWJ1dGlvbnMgZm9yIERZSy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBhcyB0aGUgRFlLIG5vbWluYXRpb24gcHJvY2VzcyBjYW4gYmUgZGlmZmljdWx0IGZvciBuZXdjb21lcnMgdG8gbmF2aWdhdGUuIEhvd2V2ZXIsIGl0IG1ha2VzIGEgZ3JlYXQgc3RyZXRjaCBnb2FsIHdoZW4gdXNlZCBzZWxlY3RpdmVseS48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBoZWxwIHlvdSBhbmQgeW91ciBzdHVkZW50cyBkdXJpbmcgdGhlIHRlcm0gdG8gaWRlbnRpZnkgd29yayB0aGF0IG1heSBiZSBhIGdvb2QgY2FuZGlkYXRlIGZvciBEWUsgYW5kIGFuc3dlciBxdWVzdGlvbnMgeW91IG1heSBoYXZlIGFib3V0IHRoZSBub21pbmF0aW9uIHByb2Nlc3MuPC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZ2FcIlxuICAgICAgICB0aXRsZTogJ0dvb2QgQXJ0aWNsZSBwcm9jZXNzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5Hb29kIEFydGljbGU8L2VtPiBwcm9jZXNzJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGlzIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IHdlbGwtZGV2ZWxvcGVkLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMgYW5kIHdobyBhcmUgd2lsbGluZyB0byBjb21lIGJhY2sgdG8gYWRkcmVzcyByZXZpZXdlciBmZWVkYmFjayAoZXZlbiBhZnRlciB0aGUgdGVybSBlbmRzKTwvZW0+LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBwcm92aWRlIGFkdmljZSBhbmQgc3VwcG9ydCB0byBoaWdoLWFjaGlldmluZyBzdHVkZW50cyB3aG8gYXJlIGludGVyZXN0ZWQgaW4gdGhlIEdvb2QgQXJ0aWNsZSBwcm9jZXNzLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nXCJcbiAgICAgICMgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgICBcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgIyAgICAgICAgIFwiPHVsPlxuICAgICAgIyAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgIyAgICAgICAgIDwvdWw+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgICAgIFxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cCBjbGFzcz0nZGVzY3JpcHRpb24tY29udGFpbmVyJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTowOyc+PC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8ZGl2IGNsYXNzPSdmb3JtLWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICA8Zm9ybSBpZD0nY291cnNlTGVuZ3RoJyBvbmlucHV0PSdvdXQudmFsdWUgPSBwYXJzZUludChjb3Vyc2VMZW5ndGgudmFsdWUpOyBvdXQyLnZhbHVlID0gcGFyc2VJbnQoY291cnNlTGVuZ3RoLnZhbHVlKTsnIG9uc3VibWl0PSdyZXR1cm4gZmFsc2UnPlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1TdGFydERhdGUnPlRlcm0gYmVnaW5zPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3Rlcm1TdGFydERhdGUnIG5hbWU9J3Rlcm1TdGFydERhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT0nZGlzcGxheTogbm9uZTsnPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1FbmREYXRlJz5UZXJtIGVuZHM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0ndGVybUVuZERhdGUnIG5hbWU9J3Rlcm1FbmREYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWRpdi5vdmVydmlldy1pbnB1dC1jb250YWluZXIgLS0+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWxhYmVsezpmb3IgPT4gJ2VuZERhdGUnfSBFbmQgV2VlayBvZiAtLT5cbiAgICAgICMgICAgICAgICAgICAgPCEtLSAlaW5wdXR7OnR5cGUgPT4gJ2RhdGUnLCA6aWQgPT4gJ2VuZERhdGUnLCA6bmFtZSA9PiAnZW5kRGF0ZSd9IC0tPlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J2NvdXJzZVN0YXJ0RGF0ZSc+Q291cnNlIHN0YXJ0cyBvbjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdjb3Vyc2VTdGFydERhdGUnIG5hbWU9J2NvdXJzZVN0YXJ0RGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInIHN0eWxlPSdkaXNwbGF5OiBub25lOyc+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3RhcnRXZWVrT2ZEYXRlJz5TdGFydCB3ZWVrIG9mPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3N0YXJ0V2Vla09mRGF0ZScgbmFtZT0nc3RhcnRXZWVrT2ZEYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcicgc3R5bGU9J2Rpc3BsYXk6IG5vbmU7Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdlbmRXZWVrT2ZEYXRlJz5FbmQgd2VlayBvZjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdlbmRXZWVrT2ZEYXRlJyBuYW1lPSdlbmRXZWVrT2ZEYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlTGVuZ3RoJz5Db3Vyc2UgTGVuZ3RoPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgZGVmYXVsdFZhbHVlPScxNicgaWQ9J2NMZW5ndGgnIG1heD0nMTYnIG1pbj0nNicgbmFtZT0nY291cnNlTGVuZ3RoJyBzdGVwPScxJyB0eXBlPSdyYW5nZScgdmFsdWU9JzE2Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8b3V0cHV0IG5hbWU9J291dDInPjE2PC9vdXRwdXQ+XG4gICAgICAjICAgICAgICAgICAgICAgPHNwYW4+d2Vla3M8L3NwYW4+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdtb25kYXknIG5hbWU9J01vbmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScwJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J21vbmRheSc+TW9uZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndHVlc2RheScgbmFtZT0nVHVlc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScxJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3R1ZXNkYXknPlR1ZXNkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd3ZWRuZXNkYXknIG5hbWU9J1dlZG5lc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3dlZG5lc2RheSc+V2VkbmVzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndGh1cnNkYXknIG5hbWU9J1RodXJzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzMnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGh1cnNkYXknPlRodXJzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nZnJpZGF5JyBuYW1lPSdGcmlkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNCc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdmcmlkYXknPkZyaWRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3NhdHVyZGF5JyBuYW1lPSdTYXR1cmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSc1Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3NhdHVyZGF5Jz5TYXR1cmRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3N1bmRheScgbmFtZT0nU3VuZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzYnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3VuZGF5Jz5TdW5kYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXJlYWRvdXQtaGVhZGVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdyZWFkb3V0Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxvdXRwdXQgZm9yPSdjb3Vyc2VMZW5ndGgnIGlkPSdjb3Vyc2VMZW5ndGhSZWFkb3V0JyBuYW1lPSdvdXQnPjE2PC9vdXRwdXQ+XG4gICAgICAjICAgICAgICAgICAgICAgICA8c3Bhbj53ZWVrczwvc3Bhbj5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAjICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgPGRpdj5cbiAgICAgICMgICAgICAgICAgIDxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyJz48L2Rpdj5cbiAgICAgICMgICAgICAgICA8L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgbXVsdGltZWRpYTogW1xuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwibXVsdGltZWRpYV8xXCJcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIHRpdGxlOiAnTXVsdGltZWRpYSBzdGVwIDEnXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm11bHRpbWVkaWFfMlwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICMgICB0aXRsZTogJ011bHRpbWVkaWEgc3RlcCAyJ1xuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nX211bHRpbWVkaWFcIlxuICAgICAgIyAgIHR5cGU6IFwiZ3JhZGluZ1wiXG4gICAgICAjICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgICAgIyAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgICAgXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJvdmVydmlld1wiXG4gICAgICAjICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgICAgIyAgIHR5cGU6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiXCJcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICMgICAgICAgICBcIjx1bD5cbiAgICAgICMgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICMgICAgICAgICA8L3VsPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICAgICBcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHAgY2xhc3M9J2Rlc2NyaXB0aW9uLWNvbnRhaW5lcic+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnJ1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICBdXG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBjb3B5ZWRpdDogW1xuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiY29weWVkaXRfMVwiXG4gICAgICAjICAgdGl0bGU6ICdDb3B5IEVkaXQgc3RlcCAxJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImNvcHllZGl0XzJcIlxuICAgICAgIyAgIHRpdGxlOiAnQ29weSBFZGl0IHN0ZXAgMidcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nX2NvcHllZGl0XCJcbiAgICAgICMgICB0eXBlOiBcImdyYWRpbmdcIlxuICAgICAgIyAgIHRpdGxlOiAnR3JhZGluZydcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICAgIFxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHR5cGU6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgdGhlIGNvdXJzZVwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIlwiXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAjICAgICAgICAgXCI8dWw+XG4gICAgICAjICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAjICAgICAgICAgPC91bD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAgICAgXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICB9XG4gIG91dHJvX3N0ZXBzOiBbXG4gICAge1xuICAgICAgaWQ6IFwiZ3JhZGluZ1wiXG4gICAgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICBzZWN0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgIFxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgICAgaW5wdXRzOiBbXVxuICAgIH1cbiAgICB7XG4gICAgICBpZDogXCJvdmVydmlld1wiXG4gICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInIHN0eWxlPSdtYXJnaW4tYm90dG9tOjA7Jz48L3A+XCJcbiAgICAgICAgICAgIFwiPGRpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXInPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICAgIGlucHV0czogW11cbiAgICB9XG4gIF1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRDb25maWdcblxuIiwiV2l6YXJkQ29udGVudCA9IFtcbiAge1xuICAgIGlkOiBcImludHJvXCJcbiAgICB0aXRsZTogJzxjZW50ZXI+V2VsY29tZSB0byB0aGU8YnIgLz5Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQhPC9jZW50ZXI+J1xuICAgIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICAgIGluc3RydWN0aW9uczogJydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCBoZWxwIHlvdSB0byBlYXNpbHkgY3JlYXRlIGEgY3VzdG9taXplZCBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnQgYW5kIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UnbGwgaGF2ZSBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiwgd2l0aCB3ZWVrbHkgYXNzaWdubWVudHMsIHB1Ymxpc2hlZCBkaXJlY3RseSBvbnRvIGEgc2FuZGJveCBwYWdlIG9uIFdpa2lwZWRpYSB3aGVyZSB5b3UgY2FuIGN1c3RvbWVpemUgaXQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPkxldOKAmXMgc3RhcnQgYnkgZmlsbGluZyBpbiBzb21lIGJhc2ljcyBhYm91dCB5b3UgYW5kIHlvdXIgY291cnNlOjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJhc3NpZ25tZW50X3NlbGVjdGlvblwiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGFzc2lnbm1lbnQgc2VsZWN0aW9ucydcbiAgICBmb3JtVGl0bGU6ICdBdmFpbGFibGUgYXNzaWdubWVudHM6J1xuICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGlzIHN1aXRhYmxlIGZvciBXaWtpcGVkaWEgPGVtPmFuZDwvZW0+IGFjaGlldmVzIHlvdXIgc3R1ZGVudCBsZWFybmluZyBvYmplY3RpdmVzLiBZb3VyIGZpcnN0IHN0ZXAgaXMgdG8gY2hvb3NlIHdoaWNoIGFzc2lnbm1lbnQocykgeW91J2xsIGJlIGFza2luZyB5b3VyIHN0dWRlbnRzIHRvIGNvbXBsZXRlIGFzIHBhcnQgb2YgdGhlIGNvdXJzZS5cIlxuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2UndmUgY3JlYXRlZCBzb21lIGd1aWRlbGluZXMgdG8gaGVscCB5b3UsIGJ1dCB5b3UnbGwgbmVlZCB0byBtYWtlIHNvbWUga2V5IGRlY2lzaW9ucywgc3VjaCBhczogd2hpY2ggbGVhcm5pbmcgb2JqZWN0aXZlcyBhcmUgeW91IHRhcmdldGluZyB3aXRoIHRoaXMgYXNzaWdubWVudD8gV2hhdCBza2lsbHMgZG8geW91ciBzdHVkZW50cyBhbHJlYWR5IGhhdmU/IEhvdyBtdWNoIHRpbWUgY2FuIHlvdSBkZXZvdGUgdG8gdGhlIGFzc2lnbm1lbnQ/PC9wPlwiXG4gICAgICAgICAgXCI8cD5Nb3N0IGluc3RydWN0b3JzIGFzayB0aGVpciBzdHVkZW50cyB0byB3cml0ZSBvciBleHBhbmQgYW4gYXJ0aWNsZS4gU3R1ZGVudHMgc3RhcnQgYnkgbGVhcm5pbmcgdGhlIGJhc2ljcyBvZiBXaWtpcGVkaWEsIGFuZCB0aGVuIGZvY3VzIG9uIHRoZSBjb250ZW50LiBUaGV5IHBsYW4sIHJlc2VhcmNoLCBhbmQgd3JpdGUgYSBwcmV2aW91c2x5IG1pc3NpbmcgV2lraXBlZGlhIGFydGljbGUsIG9yIGNvbnRyaWJ1dGUgdG8gYW4gaW5jb21wbGV0ZSBlbnRyeSBvbiBhIGNvdXJzZS1yZWxhdGVkIHRvcGljLiBUaGlzIGFzc2lnbm1lbnQgdHlwaWNhbGx5IHJlcGxhY2VzIGEgdGVybSBwYXBlciBvciByZXNlYXJjaCBwcm9qZWN0LCBvciBpdCBmb3JtcyB0aGUgbGl0ZXJhdHVyZSByZXZpZXcgc2VjdGlvbiBvZiBhIGxhcmdlciBwYXBlci4gVGhlIHN0dWRlbnQgbGVhcm5pbmcgb3V0Y29tZSBpcyBoaWdoIHdpdGggdGhpcyBhc3NpZ25tZW50LCBidXQgaXQgZG9lcyB0YWtlIGEgc2lnbmlmaWNhbnQgYW1vdW50IG9mIHRpbWUuIFlvdXIgc3R1ZGVudHMgbmVlZCB0byBsZWFybiBib3RoIHRoZSB3aWtpIG1hcmt1cCBsYW5ndWFnZSBhbmQga2V5IHBvbGljaWVzIGFuZCBleHBlY3RhdGlvbnMgb2YgdGhlIFdpa2lwZWRpYS1lZGl0aW5nIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICBcIjxwPklmIHdyaXRpbmcgYW4gYXJ0aWNsZSBpc24ndCByaWdodCBmb3IgeW91ciBjbGFzcywgb3RoZXIgYXNzaWdubWVudCBvcHRpb25zIG9mZmVyIHN0dWRlbnRzIHZhbHVhYmxlIGxlYXJuaW5nIG9wcG9ydHVuaXRpZXMgYW5kIGhlbHAgdG8gaW1wcm92ZSBXaWtpcGVkaWEuIFNlbGVjdCBhbiBhc3NpZ25tZW50IHR5cGUgb24gdGhlIGxlZnQgdG8gbGVhcm4gbW9yZS48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwibGVhcm5pbmdfZXNzZW50aWFsc1wiXG4gICAgdGl0bGU6ICdXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICBpbnN0cnVjdGlvbnM6IFwiVG8gZ2V0IHN0YXJ0ZWQsIHlvdSdsbCB3YW50IHRvIGludHJvZHVjZSB5b3VyIHN0dWRlbnRzIHRvIHRoZSBiYXNpYyBydWxlcyBvZiB3cml0aW5nIFdpa2lwZWRpYSBhcnRpY2xlcyBhbmQgd29ya2luZyB3aXRoIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5LlwiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZWlyIGZpcnN0IFdpa2lwZWRpYSBhc3NpZ25tZW50IG1pbGVzdG9uZSwgeW91IGNhbiBhc2sgdGhlIHN0dWRlbnRzIHRvIGNyZWF0ZSB1c2VyIGFjY291bnRzIGFuZCB0aGVuIGNvbXBsZXRlIHRoZSA8ZW0+b25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50czwvZW0+LiBUaGlzIHRyYWluaW5nIGludHJvZHVjZXMgdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkgYW5kIGhvdyBpdCB3b3JrcywgZGVtb25zdHJhdGVzIHRoZSBiYXNpY3Mgb2YgZWRpdGluZyBhbmQgd2Fsa3Mgc3R1ZGVudHMgdGhyb3VnaCB0aGVpciBmaXJzdCBlZGl0cywgZ2l2ZXMgYWR2aWNlIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgYW5kIGRyYWZ0aW5nIHJldmlzaW9ucywgYW5kIGV4cGxhaW5zIGZ1cnRoZXIgc291cmNlcyBvZiBzdXBwb3J0IGFzIHRoZXkgY29udGludWUgYWxvbmcuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCwgd2hpY2ggeW91IGNhbiB1c2UgdG8gdmVyaWZ5IHRoYXQgc3R1ZGVudHMgY29tcGxldGVkIHRoZSB0cmFpbmluZy48L3A+J1xuICAgICAgICAgICc8cD5TdHVkZW50cyB3aG8gY29tcGxldGUgdGhpcyB0cmFpbmluZyBhcmUgYmV0dGVyIHByZXBhcmVkIHRvIGZvY3VzIG9uIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgc3BlbmQgbGVzcyB0aW1lIGRpc3RyYWN0ZWQgYnkgY2xlYW5pbmcgdXAgYWZ0ZXIgZXJyb3JzLjwvcD4nXG4gICAgICAgICAgJzxwPldpbGwgY29tcGxldGlvbiBvZiB0aGUgc3R1ZGVudCB0cmFpbmluZyBiZSBwYXJ0IG9mIHlvdXIgc3R1ZGVudHNcXCcgZ3JhZGVzPyAoTWFrZSB5b3VyIGNob2ljZSBhdCB0aGUgdG9wIGxlZnQuKTwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IG1pbGVzdG9uZXMnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgPGxpPkNvbXBsZXRlIHRoZSA8ZW0+b25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50czwvZW0+LiBEdXJpbmcgdGhpcyB0cmFpbmluZywgeW91IHdpbGwgbWFrZSBlZGl0cyBpbiBhIHNhbmRib3ggYW5kIGxlYXJuIHRoZSBiYXNpYyBydWxlcyBvZiBXaWtpcGVkaWEuPC9saT5cbiAgICAgICAgICAgIDxsaT5UbyBwcmFjdGljZSBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIFdpa2lwZWRpYSwgaW50cm9kdWNlIHlvdXJzZWxmIHRvIGFueSBXaWtpcGVkaWFucyBoZWxwaW5nIHlvdXIgY2xhc3MgKHN1Y2ggYXMgYSBXaWtpcGVkaWEgQW1iYXNzYWRvciksIGFuZCBsZWF2ZSBhIG1lc3NhZ2UgZm9yIGEgY2xhc3NtYXRlIG9uIHRoZWlyIHVzZXIgdGFsayBwYWdlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgIHRpdGxlOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBlYXJseSBlZGl0aW5nIHRhc2tzJ1xuICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIGVhcmx5IG9uLiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgIGZvcm1UaXRsZTogJ1doaWNoIGJhc2ljIGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGU/J1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5XaGljaCBpbnRyb2R1Y3RvcnkgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gdXNlIHRvIGFjY2xpbWF0ZSB5b3VyIHN0dWRlbnRzIHRvIFdpa2lwZWRpYT8gWW91IGNhbiBzZWxlY3Qgbm9uZSwgb25lLCBvciBtb3JlLiBXaGljaGV2ZXIgeW91IHNlbGVjdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBhc3NpZ25tZW50IHRpbWVsaW5lLjwvcD4nXG4gICAgICAgICAgJzx1bD5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5BZGQgdG8gYW4gYXJ0aWNsZS48L3N0cm9uZz4gVXNpbmcgY291cnNlIHJlYWRpbmdzIG9yIG90aGVyIHJlbGV2YW50IHNlY29uZGFyeSBzb3VyY2VzLCBhZGQgMeKAkzIgc2VudGVuY2VzIG9mIG5ldyBpbmZvcm1hdGlvbiB0byBhIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLiBCZSBzdXJlIHRvIGludGVncmF0ZSBpdCB3ZWxsIGludG8gdGhlIGV4aXN0aW5nIGFydGljbGUsIGFuZCBpbmNsdWRlIGEgY2l0YXRpb24gdG8gdGhlIHNvdXJjZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNvcHllZGl0IGFuIGFydGljbGUuPC9zdHJvbmc+IEJyb3dzZSBXaWtpcGVkaWEgdW50aWwgeW91IGZpbmQgYW4gYXJ0aWNsZSB0aGF0IHlvdSB3b3VsZCBsaWtlIHRvIGltcHJvdmUsIGFuZCBtYWtlIHNvbWUgZWRpdHMgdG8gaW1wcm92ZSB0aGUgbGFuZ3VhZ2Ugb3IgZm9ybWF0dGluZy4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgdXBsb2FkaW5nIGFuZCBhZGRpbmcgYSBwaG90byB5b3UgdG9vay48L2xpPlxuICAgICAgICAgIDwvdWw+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+Rm9yIG1vc3QgY291cnNlcywgdGhlIDxlbT5Dcml0aXF1ZSBhbiBhcnRpY2xlPC9lbT4gYW5kIDxlbT5BZGQgdG8gYW4gYXJ0aWNsZTwvZW0+IGV4ZXJjaXNlcyBwcm92aWRlIGEgbmljZSBmb3VuZGF0aW9uIGZvciB0aGUgbWFpbiB3cml0aW5nIHByb2plY3QuIFRoZXNlIGhhdmUgYmVlbiBzZWxlY3RlZCBieSBkZWZhdWx0LjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgdGl0bGU6ICdDaG9vc2luZyBhcnRpY2xlcydcbiAgICBmb3JtVGl0bGU6ICdIb3cgd2lsbCB5b3VyIGNsYXNzIHNlbGVjdCBhcnRpY2xlcz8nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkNob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuPC9wPidcbiAgICAgICAgICAnPHA+U29tZSBhcnRpY2xlcyBtYXkgaW5pdGlhbGx5IGxvb2sgZWFzeSB0byBpbXByb3ZlLCBidXQgcXVhbGl0eSByZWZlcmVuY2VzIHRvIGV4cGFuZCB0aGVtIG1heSBiZSBkaWZmaWN1bHQgdG8gZmluZC4gRmluZGluZyB0b3BpY3Mgd2l0aCB0aGUgcmlnaHQgYmFsYW5jZSBiZXR3ZWVuIHBvb3IgV2lraXBlZGlhIGNvdmVyYWdlIGFuZCBhdmFpbGFibGUgbGl0ZXJhdHVyZSBmcm9tIHdoaWNoIHRvIGV4cGFuZCB0aGF0IGNvdmVyYWdlIGNhbiBiZSB0cmlja3kuIEhlcmUgYXJlIHNvbWUgZ3VpZGVsaW5lcyB0byBrZWVwIGluIG1pbmQgd2hlbiBzZWxlY3RpbmcgYXJ0aWNsZXMgZm9yIGltcHJvdmVtZW50LjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMeKAkzIgcGFyYWdyYXBocyBvZiBpbmZvcm1hdGlvbiBhbmQgYXJlIGluIG5lZWQgb2YgZXhwYW5zaW9uLiBSZWxldmFudCBXaWtpUHJvamVjdCBwYWdlcyBjYW4gcHJvdmlkZSBhIGxpc3Qgb2Ygc3R1YnMgdGhhdCBuZWVkIGltcHJvdmVtZW50LjwvbGk+XG4gICAgICAgICAgICA8bGk+QmVmb3JlIGNyZWF0aW5nIGEgbmV3IGFydGljbGUsIHNlYXJjaCByZWxhdGVkIHRvcGljcyBvbiBXaWtpcGVkaWEgdG8gbWFrZSBzdXJlIHlvdXIgdG9waWMgaXNuJ3QgYWxyZWFkeSBjb3ZlcmVkIGVsc2V3aGVyZS4gT2Z0ZW4sIGFuIGFydGljbGUgbWF5IGV4aXN0IHVuZGVyIGFub3RoZXIgbmFtZSwgb3IgdGhlIHRvcGljIG1heSBiZSBjb3ZlcmVkIGFzIGEgc3Vic2VjdGlvbiBvZiBhIGJyb2FkZXIgYXJ0aWNsZS48L2xpPlxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFydGljbGVzIHRoYXQgYXJlIFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD4nXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChmb3IgZXhhbXBsZSwgR2xvYmFsIFdhcm1pbmcsIEFib3J0aW9uLCBvciBTY2llbnRvbG9neSkuIFlvdSBtYXkgYmUgbW9yZSBzdWNjZXNzZnVsIHN0YXJ0aW5nIGEgc3ViLWFydGljbGUgb24gdGhlIHRvcGljIGluc3RlYWQuPC9saT5cbiAgICAgICAgICAgIDxsaT5Eb24ndCB3b3JrIG9uIGFuIGFydGljbGUgdGhhdCBpcyBhbHJlYWR5IG9mIGhpZ2ggcXVhbGl0eSBvbiBXaWtpcGVkaWEsIHVubGVzcyB5b3UgZGlzY3VzcyBhIHNwZWNpZmljIHBsYW4gZm9yIGltcHJvdmluZyBpdCB3aXRoIG90aGVyIGVkaXRvcnMgYmVmb3JlaGFuZC48L2xpPlxuICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHN0YXJ0IGFydGljbGVzIHdpdGggdGl0bGVzIHRoYXQgaW1wbHkgYW4gYXJndW1lbnQgb3IgZXNzYXktbGlrZSBhcHByb2FjaCAoZS5nLiwgVGhlIEVmZmVjdHMgVGhhdCBUaGUgUmVjZW50IFN1Yi1QcmltZSBNb3J0Z2FnZSBDcmlzaXMgaGFzIGhhZCBvbiB0aGUgVVMgYW5kIEdsb2JhbCBFY29ub21pY3MpLiBUaGVzZSB0eXBlIG9mIHRpdGxlcywgYW5kIG1vc3QgbGlrZWx5IHRoZSBjb250ZW50IHRvbywgbWF5IG5vdCBiZSBhcHByb3ByaWF0ZSBmb3IgYW4gZW5jeWNsb3BlZGlhLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZSBpbnN0cnVjdG9yLCB5b3Ugc2hvdWxkIGFwcGx5IHlvdXIgb3duIGV4cGVydGlzZSB0byBleGFtaW5pbmcgV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkLiBZb3UgdW5kZXJzdGFuZCB0aGUgYnJvYWRlciBpbnRlbGxlY3R1YWwgY29udGV4dCB3aGVyZSBpbmRpdmlkdWFsIHRvcGljcyBmaXQgaW4sIHlvdSBjYW4gcmVjb2duaXplIHdoZXJlIFdpa2lwZWRpYSBmYWxscyBzaG9ydCwgeW91IGtub3figJRvciBrbm93IGhvdyB0byBmaW5k4oCUdGhlIHJlbGV2YW50IGxpdGVyYXR1cmUsIGFuZCB5b3Uga25vdyB3aGF0IHRvcGljcyB5b3VyIHN0dWRlbnRzIHNob3VsZCBiZSBhYmxlIHRvIGhhbmRsZS4gWW91ciBndWlkYW5jZSBvbiBhcnRpY2xlIGNob2ljZSBhbmQgc291cmNpbmcgaXMgY3JpdGljYWwgZm9yIGJvdGggeW91ciBzdHVkZW50c+KAmSBzdWNjZXNzIGFuZCB0aGUgaW1wcm92ZW1lbnQgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgICAgJzxwPlRoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdTdHVkZW50cyBmaW5kIGFydGljbGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gSGF2aW5nIHN0dWRlbnRzIGZpbmQgdGhlaXIgb3duIGFydGljbGVzIHByb3ZpZGVzIHRoZW0gd2l0aCBhIHNlbnNlIG9mIG1vdGl2YXRpb24gYW5kIG93bmVyc2hpcCBvdmVyIHRoZSBhc3NpZ25tZW50IGFuZCBleGVyY2lzZXMgdGhlaXIgY3JpdGljYWwgdGhpbmtpbmcgc2tpbGxzIGFzIHRoZXkgaWRlbnRpZnkgY29udGVudCBnYXBzLCBidXQgaXQgbWF5IGFsc28gbGVhZCB0byBjaG9pY2VzIHRoYXQgYXJlIGZ1cnRoZXIgYWZpZWxkIGZyb20gY291cnNlIG1hdGVyaWFsLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH0gXG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJyZXNlYXJjaF9wbGFubmluZ1wiXG4gICAgdGl0bGU6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgZm9ybVRpdGxlOiAnSG93IHNob3VsZCBzdHVkZW50cyBwbGFuIHRoZWlyIGFydGljbGVzPydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPlN0dWRlbnRzIG9mdGVuIHdhaXQgdW50aWwgdGhlIGxhc3QgbWludXRlIHRvIGRvIHRoZWlyIHJlc2VhcmNoLCBvciBjaG9vc2Ugc291cmNlcyB1bnN1aXRhYmxlIGZvciBXaWtpcGVkaWEuIFRoYXQncyB3aHkgd2UgcmVjb21tZW5kIGFza2luZyBzdHVkZW50cyB0byBwdXQgdG9nZXRoZXIgYSBiaWJsaW9ncmFwaHkgb2YgbWF0ZXJpYWxzIHRoZXkgd2FudCB0byB1c2UgaW4gZWRpdGluZyB0aGUgYXJ0aWNsZSwgd2hpY2ggY2FuIHRoZW4gYmUgYXNzZXNzZWQgYnkgeW91IGFuZCBvdGhlciBXaWtpcGVkaWFucy48L3A+XCJcbiAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJkcmFmdHNfbWFpbnNwYWNlXCJcbiAgICB0aXRsZTogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGRyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgIGluc3RydWN0aW9uczogJ09uY2Ugc3R1ZGVudHMgaGF2ZSBnb3R0ZW4gYSBncmlwIG9uIHRoZWlyIHRvcGljcyBhbmQgdGhlIHNvdXJjZXMgdGhleSB3aWxsIHVzZSB0byB3cml0ZSBhYm91dCB0aGVtLCBpdOKAmXMgdGltZSB0byBzdGFydCB3cml0aW5nIG9uIFdpa2lwZWRpYS4gWW91IGNhbiBhc2sgdGhlbSB0byBqdW1wIHJpZ2h0IGluIGFuZCBlZGl0IGxpdmUsIG9yIHN0YXJ0IHRoZW0gb2ZmIGluIHRoZWlyIG93biBzYW5kYm94IHBhZ2VzLiBUaGVyZSBhcmUgcHJvcyBhbmQgY29ucyBvZiBlYWNoIGFwcHJvYWNoLidcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgb2Ygc2FuZGJveGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5TYW5kYm94ZXMg4oCUIHBhZ2VzIGFzc29jaWF0ZWQgd2l0aCBhbiBpbmRpdmlkdWFsIGVkaXRvciB0aGF0IGFyZSBub3QgY29uc2lkZXJlZCBwYXJ0IG9mIFdpa2lwZWRpYSBwcm9wZXIg4oCUIG1ha2Ugc3R1ZGVudHMgZmVlbCBzYWZlLiBUaGV5IGNhbiBlZGl0IHdpdGhvdXQgdGhlIHByZXNzdXJlIG9mIHRoZSB3aG9sZSB3b3JsZCByZWFkaW5nIHRoZWlyIGRyYWZ0cyBvciBvdGhlciBXaWtpcGVkaWFucyBhbHRlcmluZyB0aGVpciB3cml0aW5nLiBIb3dldmVyLCBzYW5kYm94IGVkaXRpbmcgbGltaXRzIG1hbnkgb2YgdGhlIHVuaXF1ZSBhc3BlY3RzIG9mIFdpa2lwZWRpYSBhcyBhIHRlYWNoaW5nIHRvb2wsIHN1Y2ggYXMgY29sbGFib3JhdGl2ZSB3cml0aW5nIGFuZCBpbmNyZW1lbnRhbCBkcmFmdGluZy4gU3BlbmRpbmcgbW9yZSB0aGFuIGEgd2VlayBvciB0d28gaW4gc2FuZGJveGVzIGlzIHN0cm9uZ2x5IGRpc2NvdXJhZ2VkLjwvcD5cIiBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgb2YgZWRpdGluZyBsaXZlJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5FZGl0aW5nIGxpdmUgaXMgZXhjaXRpbmcgZm9yIHRoZSBzdHVkZW50cyBiZWNhdXNlIHRoZXkgY2FuIHNlZSB0aGVpciBjaGFuZ2VzIHRvIHRoZSBhcnRpY2xlcyBpbW1lZGlhdGVseSBhbmQgZXhwZXJpZW5jZSB0aGUgY29sbGFib3JhdGl2ZSBlZGl0aW5nIHByb2Nlc3MgdGhyb3VnaG91dCB0aGUgYXNzaWdubWVudC4gSG93ZXZlciwgYmVjYXVzZSBuZXcgZWRpdG9ycyBvZnRlbiB1bmludGVudGlvbmFsbHkgYnJlYWsgV2lraXBlZGlhIHJ1bGVzLCBzb21ldGltZXMgc3R1ZGVudHPigJkgYWRkaXRpb25zIGFyZSBxdWVzdGlvbmVkIG9yIHJlbW92ZWQuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgdGl0bGU6ICdQZWVyIGZlZWRiYWNrJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHBlZXIgZmVlZGJhY2snXG4gICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICBpbnN0cnVjdGlvbnM6IFwiQ29sbGFib3JhdGlvbiBpcyBhIGNyaXRpY2FsIGVsZW1lbnQgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYS5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICBcIjxwPlBlZXIgcmV2aWV3cyBhcmUgYW5vdGhlciBjaGFuY2UgZm9yIHN0dWRlbnRzIHRvIHByYWN0aWNlIGNyaXRpY2FsIHRoaW5raW5nLiBVc2VmdWwgcmV2aWV3cyBmb2N1cyBvbiBzcGVjaWZpYyBpc3N1ZXMgdGhhdCBjYW4gYmUgaW1wcm92ZWQuIFNpbmNlIHN0dWRlbnRzIGFyZSB1c3VhbGx5IGhlc2l0YW50IHRvIGNyaXRpY2l6ZSB0aGVpciBjbGFzc21hdGVz4oCUYW5kIG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIG1heSBnZXQgYW5ub3llZCB3aXRoIGEgc3RyZWFtIG9mIHByYWlzZSBmcm9tIHN0dWRlbnRzIHRoYXQgZ2xvc3NlcyBvdmVyIGFuIGFydGljbGUncyBzaG9ydGNvbWluZ3PigJRpdCdzIGltcG9ydGFudCB0byBnaXZlcyBleGFtcGxlcyBvZiB0aGUga2luZHMgb2YgY29uc3RydWN0aXZlbHkgY3JpdGljYWwgZmVlZGJhY2sgdGhhdCBhcmUgdGhlIG1vc3QgaGVscGZ1bC48L3A+XCJcbiAgICAgICAgICBcIjxwPkhvdyBtYW55IHBlZXIgcmV2aWV3cyB3aWxsIHlvdSBhc2sgZWFjaCBzdHVkZW50IHRvIGNvbnRyaWJ1dGUgZHVyaW5nIHRoZSBjb3Vyc2U/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICB0aXRsZTogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgKG9wdGlvbmFsKTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBpbnN0cnVjdGlvbnM6IFwiQnkgdGhlIHRpbWUgc3R1ZGVudHMgaGF2ZSBtYWRlIGltcHJvdmVtZW50cyBiYXNlZCBvbiBjbGFzc21hdGVzJyBjb21tZW50c+KAlGFuZCBpZGVhbGx5IHN1Z2dlc3Rpb25zIGZyb20geW91IGFzIHdlbGzigJR0aGV5IHNob3VsZCBoYXZlIHByb2R1Y2VkIG5lYXJseSBjb21wbGV0ZSBhcnRpY2xlcy4gTm93IGlzIHRoZSBjaGFuY2UgdG8gZW5jb3VyYWdlIHRoZW0gdG8gd2FkZSBhIGxpdHRsZSBkZWVwZXIgaW50byBXaWtpcGVkaWEgYW5kIGl0cyBub3JtcyBhbmQgY3JpdGVyaWEgdG8gY3JlYXRlIGdyZWF0IGNvbnRlbnQuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgXCI8cD5Zb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0cyBhbmQgbGltaXRzIG9mIFdpa2lwZWRpYS4gQ29uc2lkZXIgYnJpbmdpbmcgaW4gYSBndWVzdCBzcGVha2VyLCBoYXZpbmcgYSBwYW5lbCBkaXNjdXNzaW9uLCBvciBzaW1wbHkgaGF2aW5nIGFuIG9wZW4gZGlzY3Vzc2lvbiBpbiBjbGFzcyBhYm91dCB3aGF0IHRoZSBzdHVkZW50cyBoYXZlIGRvbmUgc28gZmFyIGFuZCB3aHkgKG9yIHdoZXRoZXIpIGl0IG1hdHRlcnMuPC9wPlwiXG4gICAgICAgICBcIjxwPkluIGFkZGl0aW9uIHRvIHRoZSBXaWtpcGVkaWEgYXJ0aWNsZSB3cml0aW5nIGl0c2VsZiwgeW91IG1heSB3YW50IHRvIHVzZSBhIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudC4gVGhlc2UgYXNzaWdubWVudHMgY2FuIHJlaW5mb3JjZSBhbmQgZGVlcGVuIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBhbHNvIGhlbHAgeW91IHRvIHVuZGVyc3RhbmQgYW5kIGV2YWx1YXRlIHRoZSBzdHVkZW50cycgd29yayBhbmQgbGVhcm5pbmcgb3V0Y29tZXMuIE9uIHRoZSBsZWZ0IGFyZSBzb21lIG9mIHRoZSBlZmZlY3RpdmUgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyB0aGF0IGluc3RydWN0b3JzIG9mdGVuIHVzZS4gU2Nyb2xsIG92ZXIgZWFjaCBmb3IgbW9yZSBpbmZvcm1hdGlvbiwgYW5kIHNlbGVjdCBhbnkgdGhhdCB5b3Ugd2lzaCB0byB1c2UgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZHlrXCJcbiAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHRoZSA8ZW0+RGlkIFlvdSBLbm93PC9lbT4gcHJvY2VzcydcbiAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkRpZCBZb3UgS25vdyAoRFlLKSBpcyBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgaGlnaGxpZ2h0aW5nIG5ldyBjb250ZW50IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gV2lraXBlZGlhIGluIHRoZSBsYXN0IHNldmVuIGRheXMuIERZSyBjYW4gYmUgYSBncmVhdCBvcHBvcnR1bml0eSB0byBnZXQgc3R1ZGVudHMgZXhjaXRlZCBhYm91dCB0aGVpciB3b3JrLiBBIHR5cGljYWwgRFlLIGFydGljbGUgd2lsbCBiZSB2aWV3ZWQgaHVuZHJlZHMgb3IgdGhvdXNhbmRzIG9mIHRpbWVzIGR1cmluZyBpdHMgNiBob3VycyBpbiB0aGUgc3BvdGxpZ2h0LjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4IG9yIG1vcmUpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBTdHVkZW50cyB3aG8gbWVldCB0aGlzIGNyaXRlcmlhIG1heSB3YW50IHRvIG5vbWluYXRlIHRoZWlyIGNvbnRyaWJ1dGlvbnMgZm9yIERZSy48L3A+XCJcbiAgICAgICAgICBcIjxwPlRoZSBzaG9ydCB3aW5kb3cgb2YgZWxpZ2liaWxpdHksIGFuZCB0aGUgc3RyaWN0IHJ1bGVzIG9mIHRoZSBub21pbmF0aW9uIHByb2Nlc3MsIGNhbiBtYWtlIGl0IGNoYWxsZW5naW5nIHRvIGluY29ycG9yYXRlIERZSyBpbnRvIGEgY2xhc3Nyb29tIHByb2plY3QuIFRoZSBEWUsgcHJvY2VzcyBzaG91bGQgbm90IGJlIGEgcmVxdWlyZWQgcGFydCBvZiB5b3VyIGFzc2lnbm1lbnQsIGFzIHRoZSBEWUsgbm9taW5hdGlvbiBwcm9jZXNzIGNhbiBiZSBkaWZmaWN1bHQgZm9yIG5ld2NvbWVycyB0byBuYXZpZ2F0ZS4gSG93ZXZlciwgaXQgbWFrZXMgYSBncmVhdCBzdHJldGNoIGdvYWwgd2hlbiB1c2VkIHNlbGVjdGl2ZWx5LjwvcD5cIlxuICAgICAgICAgIFwiPHA+V291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gaGVscCB5b3UgYW5kIHlvdXIgc3R1ZGVudHMgZHVyaW5nIHRoZSB0ZXJtIHRvIGlkZW50aWZ5IHdvcmsgdGhhdCBtYXkgYmUgYSBnb29kIGNhbmRpZGF0ZSBmb3IgRFlLIGFuZCBhbnN3ZXIgcXVlc3Rpb25zIHlvdSBtYXkgaGF2ZSBhYm91dCB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ2FcIlxuICAgIHRpdGxlOiAnR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5Hb29kIEFydGljbGU8L2VtPiBwcm9jZXNzJ1xuICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyBwcm9jZXNzIGdlbmVyYWxseSB0YWtlcyBzb21lIHRpbWUg4oCUIGJldHdlZW4gc2V2ZXJhbCBkYXlzIGFuZCBzZXZlcmFsIHdlZWtzLCBkZXBlbmRpbmcgb24gdGhlIGludGVyZXN0IG9mIHJldmlld2VycyBhbmQgdGhlIHNpemUgb2YgdGhlIHJldmlldyBiYWNrbG9nIGluIHRoZSBzdWJqZWN0IGFyZWEg4oCUIGFuZCBzaG91bGQgb25seSBiZSB1bmRlcnRha2VuIGZvciBhcnRpY2xlcyB0aGF0IGFyZSBhbHJlYWR5IHZlcnkgd2VsbC1kZXZlbG9wZWQuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLCBhbmQgdGhvc2Ugd3JpdHRlbiBieSBzdHVkZW50IGVkaXRvcnMgd2hvIGFyZSBhbHJlYWR5IGV4cGVyaWVuY2VkLCBzdHJvbmcgd3JpdGVycyBhbmQgd2hvIGFyZSB3aWxsaW5nIHRvIGNvbWUgYmFjayB0byBhZGRyZXNzIHJldmlld2VyIGZlZWRiYWNrIChldmVuIGFmdGVyIHRoZSB0ZXJtIGVuZHMpPC9lbT4uPC9wPlwiXG4gICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gcHJvdmlkZSBhZHZpY2UgYW5kIHN1cHBvcnQgdG8gaGlnaC1hY2hpZXZpbmcgc3R1ZGVudHMgd2hvIGFyZSBpbnRlcmVzdGVkIGluIHRoZSBHb29kIEFydGljbGUgcHJvY2Vzcy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImdyYWRpbmdcIlxuICAgIHRpdGxlOiAnR3JhZGluZydcbiAgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJvdmVydmlld1wiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICBmb3JtVGl0bGU6IFwiXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIFxuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48dGV4dGFyZWEgaWQ9J3Nob3J0X2Rlc2NyaXB0aW9uJyByb3dzPScxNCcgc3R5bGU9J3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI0MiwyNDIsMjQyLDEuMCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDIwMiwyMDIsMjAyLDEuMCk7cGFkZGluZzoxMHB4IDE1cHg7Zm9udC1zaXplOiAxNnB4O2xpbmUtaGVpZ2h0IDIzcHg7bGV0dGVyLXNwYWNpbmc6IDAuMjVweDsnPjwvdGV4dGFyZWE+PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAgXG5dXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ29udGVudFxuIiwiV2l6YXJkQ291cnNlSW5mbyA9IFxuXG4gICMgUkVTRUFSQ0ggQU5EIFdSSVRFIEEgV0lLSVBFRElBIEFSVElDTEVcbiAgcmVzZWFyY2h3cml0ZTogXG4gICAgdGl0bGU6IFwiUmVzZWFyY2ggYW5kIHdyaXRlIGEgV2lraXBlZGlhIGFydGljbGVcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIllvdSBndWlkZSB5b3VyIHN0dWRlbnRzIHRvIHNlbGVjdCBjb3Vyc2UtcmVsYXRlZCB0b3BpY3MgdGhhdCBhcmUgbm90IHdlbGwtY292ZXJlZCBvbiBXaWtpcGVkaWEsIGFuZCB0aGV5IHdvcmsgaW5kaXZpZHVhbGx5IG9yIGluIHNtYWxsIHRlYW1zIHRvIGRldmVsb3AgY29udGVudCDigJQgZWl0aGVyIGV4cGFuZGluZyBleGlzdGluZyBhcnRpY2xlcyBvciBjcmVhdGluZyBuZXcgb25lcy4gU3R1ZGVudHMgYW5hbHl6ZSB0aGUgY3VycmVudCBnYXBzLCBzdGFydCB0aGVpciByZXNlYXJjaCB0byBmaW5kIGhpZ2gtcXVhbGl0eSBzZWNvbmRhcnkgc291cmNlcywgYW5kIHRoZW4gY29uc2lkZXIgdGhlIGJlc3Qgd2F5IHRvIG9yZ2FuaXplIHRoZSBhdmFpbGFibGUgaW5mb3JtYXRpb24uIFRoZW4gaXQncyB0aW1lIGZvciB0aGVtIGluIHR1cm4gdG86IHByb3Bvc2UgYW4gb3V0bGluZTsgZHJhZnQgbmV3IGFydGljbGVzIG9yIG5ldyBjb250ZW50IGZvciBleGlzdGluZyBvbmVzOyBwcm92aWRlIGFuZCByZXNwb25kIHRvIHBlZXIgZmVlZGJhY2s7IGFuZCBtb3ZlIHRoZWlyIHdvcmsgaW50byB0aGUgbGl2ZSBhcnRpY2xlIG5hbWVzcGFjZSBvbiBXaWtpcGVkaWEuXCJcbiAgICAgIFwiQWxvbmcgdGhlIHdheSwgc3R1ZGVudHMgbWF5IHdvcmsgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWEgZWRpdG9ycyB3aG8gY2FuIG9mZmVyIGNyaXRpY2FsIGZlZWRiYWNrIGFuZCBoZWxwIG1ha2Ugc3VyZSBhcnRpY2xlcyBtZWV0IFdpa2lwZWRpYSdzIHN0YW5kYXJkcyBhbmQgc3R5bGUgY29udmVudGlvbnMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBpbmNvcnBvcmF0ZSB0aW1lIGludG8gdGhlIGFzc2lnbm1lbnQgZm9yIHRoZSBzdHVkZW50cyB0byBpbnRlZ3JhdGUgdGhvc2Ugc3VnZ2VzdGlvbnMuIFN0dWRlbnRzIHdobyBkbyBncmVhdCB3b3JrIG1heSBoYXZlIHRoZWlyIGFydGljbGVzIGhpZ2hsaWdodGVkIG9uIFdpa2lwZWRpYSdzIG1haW4gcGFnZSwgYW5kIGhpZ2ggcXVhbGl0eSBhcnRpY2xlcyB3aWxsIGhlbHAgaW5mb3JtIHRob3VzYW5kcyBvZiBmdXR1cmUgcmVhZGVycyBhYm91dCB0aGUgc2VsZWN0ZWQgdG9waWMuIFwiXG4gICAgICBcIk9wdGlvbmFsbHksIHlvdSBtYXkgYXNrIHlvdXIgc3R1ZGVudHMgdG8gd3JpdGUgYSByZWZsZWN0aXZlIHBhcGVyIGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlLCBwcmVzZW50IHRoZWlyIGNvbnRyaWJ1dGlvbnMgaW4gY2xhc3MsIG9yIGRldmVsb3AgdGhlaXIgb3duIGNvbmNsdXNpb25zIGFuZCBhcmd1bWVudHMgaW4gYSBzdXBwbGVtZW50YXJ5IGVzc2F5LlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMTIgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkNsYXNzZXMgd2l0aCBmZXdlciB0aGFuIDMwIHN0dWRlbnRzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkcyBvciBncmFkIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJMYXJnZSBzdXJ2ZXkgY2xhc3Nlc1wiXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHdyaXRpbmcgc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBTT1VSQ0UtQ0VOVEVSRUQgQURESVRJT05TXG4gIHNvdXJjZWNlbnRlcmVkOiBcbiAgICB0aXRsZTogXCJTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyByZWFkIFdpa2lwZWRpYSBhcnRpY2xlcyBpbiBhIHNlbGYtc2VsZWN0ZWQgc3ViamVjdCBhcmVhIHRvIGlkZW50aWZ5IGFydGljbGVzIGluIG5lZWQgb2YgcmV2aXNpb24gb3IgaW1wcm92ZW1lbnQsIHN1Y2ggYXMgdGhvc2Ugd2l0aCBcXFwiY2l0YXRpb24gbmVlZGVkXFxcIiB0YWdzLiBTdHVkZW50cyB3aWxsIGZpbmQgcmVsaWFibGUgc291cmNlcyB0byB1c2UgYXMgcmVmZXJlbmNlcyBmb3IgdW5jaXRlZCBjb250ZW50LiBUaGlzIGFzc2lnbm1lbnQgaW5jbHVkZXMgYSBwZXJzdWFzaXZlIGVzc2F5IGluIHdoaWNoIHN0dWRlbnRzIG1ha2UgYSBjYXNlIGZvciB0aGVpciBzdWdnZXN0ZWQgY2hhbmdlcywgd2h5IHRoZXkgYmVsaWV2ZSB0aGV5IGFyZSBxdWFsaWZpZWQgdG8gbWFrZSB0aG9zZSBjaGFuZ2VzLCBhbmQgd2h5IHRoZWlyIHNlbGVjdGVkIHNvdXJjZXMgcHJvdmlkZSBzdXBwb3J0LiBBZnRlciBtYWtpbmcgdGhlaXIgY29udHJpYnV0aW9ucywgc3R1ZGVudHMgcmVmbGVjdCBvbiB0aGVpciB3b3JrIHdpdGggYSBmb3JtYWwgcGFwZXIsIGFuZCBkaXNjdXNzIHdoZXRoZXIgdGhleSd2ZSBhY2NvbXBsaXNoZWQgdGhlaXIgc3RhdGVkIGdvYWxzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2UgY2xhc3Nlc1wiXG4gICAgICBcIkFkdmFuY2VkIHVuZGVyZ3JhZHVhdGVzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEZJTkQgQU5EIEZJWCBFUlJPUlNcbiAgZmluZGZpeDogXG4gICAgdGl0bGU6IFwiRmluZCBhbmQgZml4IGVycm9yc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGZpbmQgYW4gYXJ0aWNsZSBhYm91dCBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHdpdGggd2hpY2ggdGhleSBhcmUgZXh0cmVtZWx5IGZhbWlsaWFyIHRoYXQgaGFzIHNvbWUgbWlzdGFrZXMuIFN0dWRlbnRzIHRha2Ugd2hhdCB0aGV5IGtub3cgYWJvdXQgdGhlIHRvcGljLCBmaW5kIGZhY3R1YWwgZXJyb3JzIGFuZCBvdGhlciBzdWJzdGFudGl2ZSBtaXN0YWtlcywgYW5kIGNvcnJlY3QgdGhvc2UuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJHcmFkdWF0ZSBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cbiAgcGxhZ2lhcmlzbTogXG4gICAgdGl0bGU6IFwiSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBzZWFyY2ggdGhyb3VnaCBXaWtpcGVkaWEgYXJ0aWNsZXMgdG8gZmluZCBpbnN0YW5jZXMgb2YgY2xvc2UgcGFyYXBocmFzaW5nIG9yIHBsYWdpYXJpc20sIHRoZW4gcmV3b3JkIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGVpciBvd24gbGFuZ3VhZ2UgdG8gYmUgYXBwcm9wcmlhdGUgZm9yIFdpa2lwZWRpYS4gSW4gdGhpcyBhc3NpZ25tZW50LCBzdHVkZW50cyBnYWluIGEgZGVlcGVyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBwbGFnaWFyaXNtIGlzIGFuZCBob3cgdG8gYXZvaWQgaXQuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJUQkRcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI1RSQU5TTEFURSBBTiBBUlRJQ0xFIFRPIEVOR0xJU0hcbiAgdHJhbnNsYXRlOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlRoaXMgaXMgYSBwcmFjdGljYWwgYXNzaWdubWVudCBmb3IgbGFuZ3VhZ2UgaW5zdHJ1Y3RvcnMuIFN0dWRlbnRzIHNlbGVjdCBhIFdpa2lwZWRpYSBhcnRpY2xlIGluIHRoZSBsYW5ndWFnZSB0aGV5IGFyZSBzdHVkeWluZywgYW5kIHRyYW5zbGF0ZSBpdCBpbnRvIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gU3R1ZGVudHMgc2hvdWxkIHN0YXJ0IHdpdGggaGlnaC1xdWFsaXR5IGFydGljbGVzIHdoaWNoIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gVGhpcyBhc3NpZ25tZW50IHByb3ZpZGVzIHByYWN0aWNhbCB0cmFuc2xhdGlvbiBhZHZpY2Ugd2l0aCB0aGUgaW5jZW50aXZlIG9mIHJlYWwgcHVibGljIHNlcnZpY2UsIGFzIHN0dWRlbnRzIGV4cGFuZCB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRhcmdldCBjdWx0dXJlIG9uIFdpa2lwZWRpYS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYrIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYW5ndWFnZSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB0cmFuc2xhdGluZyA8ZW0+ZnJvbTwvZW0+IHRoZWlyIG5hdGl2ZSBsYW5ndWFnZSB0byB0aGUgbGFuZ3VhZ2UgdGhleSdyZSBzdHVkeWluZ1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0NPUFkgRURJVElOR1xuICBjb3B5ZWRpdDogXG4gICAgdGl0bGU6IFwiQ29weWVkaXRcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIGFyZSBhc2tlZCB0byBjb3B5ZWRpdCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGVuZ2FnaW5nIGVkaXRvcnMgaW4gY29udmVyc2F0aW9uIGFib3V0IHRoZWlyIHdyaXRpbmcgYW5kIGltcHJvdmluZyB0aGUgY2xhcml0eSBvZiB0aGUgbGFuZ3VhZ2Ugb2YgdGhlIG1hdGVyaWFsLiBTdHVkZW50cyBsZWFybiB0byB3cml0ZSBpbiBkaWZmZXJlbnQgdm9pY2VzIGZvciBkaWZmZXJlbnQgYXVkaWVuY2VzLiBJbiBsZWFybmluZyBhYm91dCB0aGUgc3BlY2lmaWMgdm9pY2Ugb24gV2lraXBlZGlhLCB0aGV5IGxlYXJuIGFib3V0IHRoZSDigJxhdXRob3JpdGF0aXZl4oCdIHZvaWNlIGFuZCBob3cgaXRzIHRvbmUgY2FuIGNvbnZpbmNlLCBldmVuIGlmIHRoZSBjb250ZW50IGlzIHF1ZXN0aW9uYWJsZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkVuZ2xpc2ggZ3JhbW1hciBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB3aXRob3V0IHN0cm9uZyB3cml0aW5nIHNraWxsc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0VWQUxVQVRFIEFSVElDTEVTXG4gIGV2YWx1YXRlOiBcbiAgICB0aXRsZTogXCJFdmFsdWF0ZSBhcnRpY2xlc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiRmlyc3QsIHN0dWRlbnRzIHdyaXRlIGEgcmVwb3J0IGFuYWx5emluZyB0aGUgc3RhdGUgb2YgV2lraXBlZGlhIGFydGljbGVzIG9uIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB3aXRoIGFuIGV5ZSB0b3dhcmQgZnV0dXJlIHJldmlzaW9ucy4gVGhpcyBlbmNvdXJhZ2VzIGEgY3JpdGljYWwgcmVhZGluZyBvZiBib3RoIGNvbnRlbnQgYW5kIGZvcm0uIFRoZW4sIHRoZSBzdHVkZW50cyBlZGl0IGFydGljbGVzIGluIHNhbmRib3hlcyB3aXRoIGZlZWRiYWNrIGZyb20gdGhlIHByb2Zlc3NvciwgY2FyZWZ1bGx5IHNlbGVjdGluZyBhbmQgYWRkaW5nIHJlZmVyZW5jZXMgdG8gaW1wcm92ZSB0aGUgYXJ0aWNsZSBiYXNlZCBvbiB0aGVpciBjcml0aWNhbCBlc3NheXMuIEZpbmFsbHksIHRoZXkgY29tcG9zZSBhIHNlbGYtYXNzZXNzbWVudCBldmFsdWF0aW5nIHRoZWlyIG93biBjb250cmlidXRpb25zLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI1IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEFERCBJTUFHRVMgT1IgTVVMVElNRURJQVxuICBtdWx0aW1lZGlhOiBcbiAgICB0aXRsZTogXCIgQWRkIGltYWdlcyBvciBtdWx0aW1lZGlhXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJJZiB5b3VyIHN0dWRlbnRzIGFyZSBhZGVwdCBhdCBtZWRpYSwgdGhpcyBjYW4gYmUgYSBncmVhdCB3YXkgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYSBpbiBhIG5vbi10ZXh0dWFsIHdheS4gSW4gdGhlIHBhc3QsIHN0dWRlbnRzIGhhdmUgcGhvdG9ncmFwaGVkIGxvY2FsIG1vbnVtZW50cyB0byBpbGx1c3RyYXRlIGFydGljbGVzLCBkZXNpZ25lZCBpbmZvZ3JhcGhpY3MgdG8gaWxsdXN0cmF0ZSBjb25jZXB0cywgb3IgY3JlYXRlZCB2aWRlb3MgdGhhdCBkZW1vbnN0cmF0ZWQgYXVkaW8tdmlzdWFsbHkgd2hhdCBhcnRpY2xlcyBkZXNjcmliZSBpbiB3b3Jkcy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjMgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHN0dWR5aW5nIHBob3RvZ3JhcGh5LCB2aWRlb2dyYXBoeSwgb3IgZ3JhcGhpYyBkZXNpZ25cIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgbWVkaWEgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvdXJzZUluZm9cbiIsIldpemFyZFN0ZXBJbnB1dHMgPVxuICBpbnRybzogXG4gICAgdGVhY2hlcjpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIG5hbWUnXG4gICAgICBpZDogJ3RlYWNoZXInXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBjb3Vyc2VfbmFtZTpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdDb3Vyc2UgbmFtZSdcbiAgICAgIGlkOiAnY291cnNlX25hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc2Nob29sOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICBpZDogJ3NjaG9vbCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdWJqZWN0OlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1N1YmplY3QnXG4gICAgICBpZDogJ3N1YmplY3QnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc3R1ZGVudHM6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGluc3RydWN0b3JfdXNlcm5hbWU6XG4gICAgICBsYWJlbDogJ1VzZXJuYW1lICh0ZW1wb3JhcnkpJ1xuICAgICAgaWQ6ICdpbnN0cnVjdG9yX3VzZXJuYW1lJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIGlzRGF0ZTogdHJ1ZVxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgd2l6YXJkX2VuZF9kYXRlOlxuICAgICAgaXNEYXRlOiB0cnVlXG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBcbiAgbXVsdGltZWRpYV8xOlxuICAgIG11bHRpbWVkaWFfMV8xOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzFfMSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAxPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgICBtdWx0aW1lZGlhXzFfMjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYV8xXzInXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gIG11bHRpbWVkaWFfMjpcbiAgICBtdWx0aW1lZGlhXzJfMTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYV8yXzEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIG11bHRpbWVkaWFfMl8yOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzJfMidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gIGNvcHllZGl0XzE6XG4gICAgY29weWVkaXRfMV8xOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8xXzEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIGNvcHllZGl0XzFfMjpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY29weWVkaXRfMV8yJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgY29weWVkaXRfMjpcbiAgICBjb3B5ZWRpdF8yXzE6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzJfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgY29weWVkaXRfMl8yOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8yXzInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDI/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgbXVsdGltZWRpYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgY29weWVkaXQ6IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgc29tZXRoaW5nX2Vsc2U6XG4gICAgICB0eXBlOiAnbGluaydcbiAgICAgIGhyZWY6ICdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZydcbiAgICAgIGlkOiAnc29tZXRoaW5nX2Vsc2UnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQSBkaWZmZXJlbnQgYXNzaWdubWVudD8gR2V0IGluIHRvdWNoIGhlcmUuJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogZmFsc2VcbiAgICAgIHRpcEluZm86XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBcIkhhdmUgYW5vdGhlciBpZGVhIGZvciBpbmNvcnBvcmF0aW5nIFdpa2lwZWRpYSBpbnRvIHlvdXIgY2xhc3M/IFdlJ3ZlIGZvdW5kIHRoYXQgdGhlc2UgYXNzaWdubWVudHMgd29yayB3ZWxsLCBidXQgdGhleSBhcmVuJ3QgdGhlIG9ubHkgd2F5IHRvIGRvIGl0LiBHZXQgaW4gdG91Y2gsIGFuZCB3ZSBjYW4gdGFsayB0aGluZ3MgdGhyb3VnaDogPGEgc3R5bGU9J2NvbG9yOiM1MDVhN2Y7JyBocmVmPSdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZyc+Y29udGFjdEB3aWtpZWR1Lm9yZzwvYT4uXCJcblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBcbiAgICBjcmVhdGVfdXNlcjpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSB1c2VyIGFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBlbnJvbGw6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBjb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgb25saW5lIHRyYWluaW5nJ1xuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBpbnRyb2R1Y2VfYW1iYXNzYWRvcnM6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaW50cm9kdWNlX2FtYmFzc2Fkb3JzJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgICMgaW5jbHVkZV9jb21wbGV0aW9uOlxuICAgICMgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgIyAgIGlkOiAnaW5jbHVkZV9jb21wbGV0aW9uJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAjICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgdHJhaW5pbmdfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIGJlIGdyYWRlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB0cmFpbmluZ19ub3RfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ub3RfZ3JhZGVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgdHJhaW5pbmcgd2lsbCBub3QgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gIGdldHRpbmdfc3RhcnRlZDogXG4gICAgY3JpdGlxdWVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY3JpdGlxdWVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyaXRpcXVlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgICBhZGRfdG9fYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnYWRkX3RvX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGNvcHlfZWRpdF9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5X2VkaXRfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBpbGx1c3RyYXRlX2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2lsbHVzdHJhdGVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbGx1c3RyYXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICBcblxuICBjaG9vc2luZ19hcnRpY2xlczogXG4gICAgcHJlcGFyZV9saXN0OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdwcmVwYXJlX2xpc3QnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBcbiAgICBzdHVkZW50c19leHBsb3JlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICByZXF1ZXN0X2hlbHA6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlcXVlc3RfaGVscCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBvciBldmF1bGF0aW5nIGFydGljbGUgY2hvaWNlcz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGNvbmRpdGlvbmFsX2xhYmVsOiBcbiAgICAgICAgcHJlcGFyZV9saXN0OiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIGFydGljbGVzP1wiXG4gICAgICAgIHN0dWRlbnRzX2V4cGxvcmU6IFwiV291bGQgeW91IGxpa2UgaGVscCBldmFsdWF0aW5nIHN0dWRlbnQgY2hvaWNlcz9cIlxuICAgICAgXG5cblxuICByZXNlYXJjaF9wbGFubmluZzogXG4gICAgY3JlYXRlX291dGxpbmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NyZWF0ZV9vdXRsaW5lJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RyYWRpdGlvbmFsIG91dGxpbmUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIlRyYWRpdGlvbmFsIG91dGxpbmVcIlxuICAgICAgICBjb250ZW50OiBcIkZvciBlYWNoIGFydGljbGUsIHRoZSBzdHVkZW50cyBjcmVhdGUgYW4gb3V0bGluZSB0aGF0IHJlZmxlY3RzIHRoZSBpbXByb3ZlbWVudHMgdGhleSBwbGFuIHRvIG1ha2UsIGFuZCB0aGVuIHBvc3QgaXQgdG8gdGhlIGFydGljbGUncyB0YWxrIHBhZ2UuIFRoaXMgaXMgYSByZWxhdGl2ZWx5IGVhc3kgd2F5IHRvIGdldCBzdGFydGVkLlwiXG4gICAgXG4gICAgd3JpdGVfbGVhZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd3JpdGVfbGVhZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnV2lraXBlZGlhIGxlYWQgc2VjdGlvbidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogXCJXaWtpcGVkaWEgbGVhZCBzZWN0aW9uXCJcbiAgICAgICAgY29udGVudDpcbiAgICAgICAgICBcIjxwPkZvciBlYWNoIGFydGljbGUsIHRoZSBzdHVkZW50cyBjcmVhdGUgYSB3ZWxsLWJhbGFuY2VkIHN1bW1hcnkgb2YgaXRzIGZ1dHVyZSBzdGF0ZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24uIFRoZSBpZGVhbCBsZWFkIHNlY3Rpb24gZXhlbXBsaWZpZXMgV2lraXBlZGlhJ3Mgc3VtbWFyeSBzdHlsZSBvZiB3cml0aW5nOiBpdCBiZWdpbnMgd2l0aCBhIHNpbmdsZSBzZW50ZW5jZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwbGFjZXMgaXQgaW4gY29udGV4dCwgYW5kIHRoZW4g4oCUIGluIG9uZSB0byBmb3VyIHBhcmFncmFwaHMsIGRlcGVuZGluZyBvbiB0aGUgYXJ0aWNsZSdzIHNpemUg4oCUIGl0IG9mZmVycyBhIGNvbmNpc2Ugc3VtbWFyeSBvZiB0b3BpYy4gQSBnb29kIGxlYWQgc2VjdGlvbiBzaG91bGQgcmVmbGVjdCB0aGUgbWFpbiB0b3BpY3MgYW5kIGJhbGFuY2Ugb2YgY292ZXJhZ2Ugb3ZlciB0aGUgd2hvbGUgYXJ0aWNsZS48L3A+XG4gICAgICAgICAgPHA+T3V0bGluaW5nIGFuIGFydGljbGUgdGhpcyB3YXkgaXMgYSBtb3JlIGNoYWxsZW5naW5nIGFzc2lnbm1lbnQg4oCUIGFuZCB3aWxsIHJlcXVpcmUgbW9yZSB3b3JrIHRvIGV2YWx1YXRlIGFuZCBwcm92aWRlIGZlZWRiYWNrIGZvci4gSG93ZXZlciwgaXQgY2FuIGJlIG1vcmUgZWZmZWN0aXZlIGZvciB0ZWFjaGluZyB0aGUgcHJvY2VzcyBvZiByZXNlYXJjaCwgd3JpdGluZywgYW5kIHJldmlzaW9uLiBTdHVkZW50cyB3aWxsIHJldHVybiB0byB0aGlzIGxlYWQgc2VjdGlvbiBhcyB0aGV5IGdvLCB0byBndWlkZSB0aGVpciB3cml0aW5nIGFuZCB0byByZXZpc2UgaXQgdG8gcmVmbGVjdCB0aGVpciBpbXByb3ZlZCB1bmRlcnN0YW5kaW5nIG9mIHRoZSB0b3BpYyBhcyB0aGVpciByZXNlYXJjaCBwcm9ncmVzc2VzLiBUaGV5IHdpbGwgdGFja2xlIFdpa2lwZWRpYSdzIGVuY3ljbG9wZWRpYyBzdHlsZSBlYXJseSBvbiwgYW5kIHRoZWlyIG91dGxpbmUgZWZmb3J0cyB3aWxsIGJlIGFuIGludGVncmFsIHBhcnQgb2YgdGhlaXIgZmluYWwgd29yay48L3A+XCJcbiAgICAgICAgXG5cblxuICBkcmFmdHNfbWFpbnNwYWNlOiBcbiAgICB3b3JrX2xpdmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3dvcmtfbGl2ZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXb3JrIGxpdmUgZnJvbSB0aGUgc3RhcnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICBcbiAgICBzYW5kYm94OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzYW5kYm94J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RyYWZ0IGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgXG5cbiAgcGVlcl9mZWVkYmFjazogXG4gICAgcGVlcl9yZXZpZXdzOlxuICAgICAgdHlwZTogJ3JhZGlvR3JvdXAnXG4gICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgIGxhYmVsOiAnJ1xuICAgICAgdmFsdWU6ICd0d28nXG4gICAgICBzZWxlY3RlZDogMVxuICAgICAgb3ZlcnZpZXdMYWJlbDogJ1R3byBwZWVyIHJldmlldydcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAwXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzEnXG4gICAgICAgICAgdmFsdWU6ICdvbmUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ09uZSBwZWVyIHJldmlldydcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDFcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMidcbiAgICAgICAgICB2YWx1ZTogJ3R3bydcbiAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUd28gcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAyXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzMnXG4gICAgICAgICAgdmFsdWU6ICd0aHJlZSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnVGhyZWUgcGVlciByZXZpZXcnXG5cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDNcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNCdcbiAgICAgICAgICB2YWx1ZTogJ2ZvdXInXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ0ZvdXIgcGVlciByZXZpZXcnXG5cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDRcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNSdcbiAgICAgICAgICB2YWx1ZTogJ2ZpdmUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ0ZpdmUgcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICBcbiAgXG5cbiAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czogXG4gICAgY2xhc3NfYmxvZzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfYmxvZydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NsYXNzIGJsb2cgb3IgZGlzY3Vzc2lvbidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogJ0NsYXNzIGJsb2cgb3IgY2xhc3MgZGlzY3Vzc2lvbidcbiAgICAgICAgY29udGVudDogJ1N0dWRlbnRzIGtlZXAgYSBydW5uaW5nIGJsb2cgYWJvdXQgdGhlaXIgZXhwZXJpZW5jZXMuIEdpdmluZyB0aGVtIHByb21wdHMgZXZlcnkgd2VlayBvciB0d28sIHN1Y2ggYXMg4oCcVG8gd2hhdCBleHRlbnQgYXJlIHRoZSBlZGl0b3JzIG9uIFdpa2lwZWRpYSBhIHNlbGYtc2VsZWN0aW5nIGdyb3VwIGFuZCB3aHk/4oCdIHdpbGwgaGVscCB0aGVtIHRoaW5rIGFib3V0IHRoZSBsYXJnZXIgaXNzdWVzIHN1cnJvdW5kaW5nIHRoaXMgb25saW5lIGVuY3ljbG9wZWRpYSBjb21tdW5pdHkuIEl0IHdpbGwgYWxzbyBnaXZlIHlvdSBtYXRlcmlhbCBib3RoIG9uIHRoZSB3aWtpIGFuZCBvZmYgdGhlIHdpa2kgdG8gZ3JhZGUuIElmIHlvdSBoYXZlIHRpbWUgaW4gY2xhc3MsIHRoZXNlIGRpc2N1c3Npb25zIGNhbiBiZSBwYXJ0aWN1bGFybHkgY29uc3RydWN0aXZlIGluIHBlcnNvbi4nXG4gICAgICBcbiAgICBjbGFzc19wcmVzZW50YXRpb246XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX3ByZXNlbnRhdGlvbidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luLWNsYXNzIHByZXNlbnRhdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIFdpa2lwZWRpYSB3b3JrJ1xuICAgICAgICBjb250ZW50OiBcIkVhY2ggc3R1ZGVudCBvciBncm91cCBwcmVwYXJlcyBhIHNob3J0IHByZXNlbnRhdGlvbiBmb3IgdGhlIGNsYXNzLCBleHBsYWluaW5nIHdoYXQgdGhleSB3b3JrZWQgb24sIHdoYXQgd2VudCB3ZWxsIGFuZCB3aGF0IGRpZG4ndCwgYW5kIHdoYXQgdGhleSBsZWFybmVkLiBUaGVzZSBwcmVzZW50YXRpb25zIGNhbiBtYWtlIGV4Y2VsbGVudCBmb2RkZXIgZm9yIGNsYXNzIGRpc2N1c3Npb25zIHRvIHJlaW5mb3JjZSB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIGdvYWxzLlwiXG4gICAgICBcbiAgICByZWZsZWN0aXZlX2Vzc2F5OlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdyZWZsZWN0aXZlX2Vzc2F5J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICAgICBjb250ZW50OiBcIkFzayBzdHVkZW50cyB0byB3cml0ZSBhIHNob3J0IHJlZmxlY3RpdmUgZXNzYXkgb24gdGhlaXIgZXhwZXJpZW5jZXMgdXNpbmcgV2lraXBlZGlhLiBUaGlzIHdvcmtzIHdlbGwgZm9yIGJvdGggc2hvcnQgYW5kIGxvbmcgV2lraXBlZGlhIHByb2plY3RzLiBBbiBpbnRlcmVzdGluZyBpdGVyYXRpb24gb2YgdGhpcyBpcyB0byBoYXZlIHN0dWRlbnRzIHdyaXRlIGEgc2hvcnQgdmVyc2lvbiBvZiB0aGUgZXNzYXkgYmVmb3JlIHRoZXkgYmVnaW4gZWRpdGluZyBXaWtpcGVkaWEsIG91dGxpbmluZyB0aGVpciBleHBlY3RhdGlvbnMsIGFuZCB0aGVuIGhhdmUgdGhlbSByZWZsZWN0IG9uIHdoZXRoZXIgb3Igbm90IHRoZXkgbWV0IHRob3NlIGV4cGVjdGF0aW9ucyBkdXJpbmcgdGhlIGFzc2lnbm1lbnQuXCJcbiAgICAgIFxuICAgIHBvcnRmb2xpbzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncG9ydGZvbGlvJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgICBjb250ZW50OiBcIlN0dWRlbnRzIG9yZ2FuaXplIHRoZWlyIFdpa2lwZWRpYSB3b3JrIGludG8gYSBwb3J0Zm9saW8sIGluY2x1ZGluZyBhIG5hcnJhdGl2ZSBvZiB0aGUgY29udHJpYnV0aW9ucyB0aGV5IG1hZGUg4oCUIGFuZCBob3cgdGhleSB3ZXJlIHJlY2VpdmVkLCBhbmQgcG9zc2libHkgY2hhbmdlZCwgYnkgb3RoZXIgV2lraXBlZGlhbnMg4oCUIGFuZCBsaW5rcyB0byB0aGVpciBrZXkgZWRpdHMuIENvbXBvc2luZyB0aGlzIHBvcnRmb2xpbyB3aWxsIGhlbHAgc3R1ZGVudHMgdGhpbmsgbW9yZSBkZWVwbHkgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2VzLCBhbmQgYWxzbyBwcm92aWRlcyBhIGxlbnMgdGhyb3VnaCB3aGljaCB0byB1bmRlcnN0YW5kIOKAlCBhbmQgZ3JhZGUg4oCUIHRoZWlyIHdvcmsuXCJcbiAgICBcbiAgICBvcmlnaW5hbF9wYXBlcjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnb3JpZ2luYWxfcGFwZXInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdPcmlnaW5hbCBhbmFseXRpY2FsIHBhcGVyJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICAgIGNvbnRlbnQ6IFwiSW4gY291cnNlcyB0aGF0IGVtcGhhc2l6ZSB0cmFkaXRpb25hbCByZXNlYXJjaCBza2lsbHMgYW5kIHRoZSBkZXZlbG9wbWVudCBvZiBvcmlnaW5hbCBpZGVhcyB0aHJvdWdoIGEgdGVybSBwYXBlciwgV2lraXBlZGlhJ3MgcG9saWN5IG9mIFxcXCJubyBvcmlnaW5hbCByZXNlYXJjaFxcXCIgbWF5IGJlIHRvbyByZXN0cmljdGl2ZS4gTWFueSBpbnN0cnVjdG9ycyBwYWlyIFdpa2lwZWRpYSB3cml0aW5nIHdpdGggYSBjb21wbGVtZW50YXJ5IGFuYWx5dGljYWwgcGFwZXI7IHN0dWRlbnRz4oCZIFdpa2lwZWRpYSBhcnRpY2xlcyBzZXJ2ZSBhcyBhIGxpdGVyYXR1cmUgcmV2aWV3LCBhbmQgdGhlIHN0dWRlbnRzIGdvIG9uIHRvIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgaW4gdGhlIG9mZmxpbmUgYW5hbHl0aWNhbCBwYXBlci5cIlxuICAgIFxuICBkeWs6XG4gICAgZHlrOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdkeWsnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEaWQgWW91IEtub3c/J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gIGdhOiBcbiAgICBnYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZ2EnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdHb29kIEFydGljbGUgbm9taW5hdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBcblxuICBncmFkaW5nX211bHRpbWVkaWE6IFxuICAgIGNvbXBsZXRlX211bHRpbWVkaWE6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICAgICBpZDogJ2NvbXBsZXRlX211bHRpbWVkaWEnXG4gICAgICB2YWx1ZTogNTBcbiAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICBjb250aW5nZW50VXBvbjogW11cbiAgXG4gIGdyYWRpbmdfY29weWVkaXQ6IFxuICAgIGNvbXBsZXRlX2NvcHllZGl0OlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAgICAgaWQ6ICdvbXBsZXRlX2NvcHllZGl0J1xuICAgICAgdmFsdWU6IDUwXG4gICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgY29udGluZ2VudFVwb246IFtdXG5cblxuICBncmFkaW5nOiBcbiAgICByZXNlYXJjaHdyaXRlOlxuICAgICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgV2lraXBlZGlhIHRyYWluaW5nJ1xuICAgICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgICB2YWx1ZTogNVxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICAgICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICAgIF1cblxuICAgICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdFYXJseSBXaWtpcGVkaWEgZXhlcmNpc2VzJ1xuICAgICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgICAgdmFsdWU6IDE1ICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBvdXRsaW5lX3F1YWxpdHk6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBpZDogJ291dGxpbmVfcXVhbGl0eSdcbiAgICAgICAgbGFiZWw6ICdRdWFsaXR5IG9mIGJpYmxpb2dyYXBoeSBhbmQgb3V0bGluZSdcbiAgICAgICAgdmFsdWU6IDEwICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBwZWVyX3Jldmlld3M6XG4gICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdQZWVyIHJldmlld3MgYW5kIGNvbGxhYm9yYXRpb24gd2l0aCBjbGFzc21hdGVzJ1xuICAgICAgICB2YWx1ZTogMTAgICBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAgIGNvbnRyaWJ1dGlvbl9xdWFsaXR5OlxuICAgICAgICB0eXBlOiAncGVyY2VudCcgXG4gICAgICAgIGlkOiAnY29udHJpYnV0aW9uX3F1YWxpdHknXG4gICAgICAgIGxhYmVsOiAnUXVhbGl0eSBvZiB5b3VyIG1haW4gV2lraXBlZGlhIGNvbnRyaWJ1dGlvbnMnXG4gICAgICAgIHZhbHVlOiA1MFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnIFxuICAgICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgdmFsdWU6IDEwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgICAgJ2NsYXNzX2Jsb2cnXG4gICAgICAgICAgJ2NsYXNzX3ByZXNlbnRhdGlvbidcbiAgICAgICAgICAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgICAgICAncG9ydGZvbGlvJ1xuICAgICAgICAgICdvcmlnaW5hbF9wYXBlcidcbiAgICAgICAgXVxuXG4gICAgY29weWVkaXQ6XG4gICAgICBjb3B5X2VkaXQ6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAgICAgICBpZDogJ2NvcHlfZWRpdCdcbiAgICAgICAgdmFsdWU6IDEwMFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdjb3B5ZWRpdCdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgXVxuICAgIG11bHRpbWVkaWE6XG4gICAgICBtdWx0aW1lZGlhOlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgICB2YWx1ZTogMTAwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ211bHRpbWVkaWEnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgIF1cblxuXG5cblxuICAgIGdyYWRpbmdfc2VsZWN0aW9uOlxuICAgICAgbGFiZWw6ICdHcmFkaW5nIGJhc2VkIG9uOidcbiAgICAgIGlkOiAnZ3JhZGluZ19zZWxlY3Rpb24nXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlbmRlckluT3V0cHV0OiBmYWxzZVxuICAgICAgb3B0aW9uczogXG4gICAgICAgIHBlcmNlbnQ6IFxuICAgICAgICAgIGxhYmVsOiAnUGVyY2VudGFnZSdcbiAgICAgICAgICB2YWx1ZTogJ3BlcmNlbnQnXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgcG9pbnRzOlxuICAgICAgICAgIGxhYmVsOiAnUG9pbnRzJ1xuICAgICAgICAgIHZhbHVlOiAncG9pbnRzJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuXG5cbiAgb3ZlcnZpZXc6IFxuICAgIGxlYXJuaW5nX2Vzc2VudGlhbHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBlc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdsZWFybmluZ19lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuXG4gICAgY2hvb3NpbmdfYXJ0aWNsZXM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIHJlc2VhcmNoX3BsYW5uaW5nOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIGRyYWZ0c19tYWluc3BhY2U6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICBpZDogJ2RyYWZ0c19tYWluc3BhY2UnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIHBlZXJfZmVlZGJhY2s6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUGVlciBGZWVkYmFjaydcbiAgICAgIGlkOiAncGVlcl9mZWVkYmFjaydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG4gICAgXG4gICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgaWQ6ICdzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzJ1xuICAgICAgdmFsdWU6ICcnXG5cbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICAgIHdpemFyZF9lbmRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICBjb3Vyc2VfZGV0YWlsczpcbiAgICBkZXNjcmlwdGlvbjogJydcbiAgICB0ZXJtX3N0YXJ0X2RhdGU6ICcnXG4gICAgdGVybV9lbmRfZGF0ZTogJydcbiAgICBjb3Vyc2Vfc3RhcnRfZGF0ZTogJydcbiAgICBjb3Vyc2VfZW5kX2RhdGU6ICcnXG4gICAgY291cnNlX21lZXRzX29uOiBbXVxuICAgIGNvdXJzZV9sZW5ndGg6ICcnXG4gICAgc2VsZWN0ZWRfYXNzaWdubWVudDogJydcblxuXG4gICAgXG5cblxuXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRTdGVwSW5wdXRzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFZpZXdIZWxwZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCAnbGluaycsICggdGV4dCwgdXJsICkgLT5cblxuICB0ZXh0ID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB0ZXh0IClcbiAgdXJsICA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdXJsIClcblxuICByZXN1bHQgPSAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCI+JyArIHRleHQgKyAnPC9hPidcblxuICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyggcmVzdWx0IClcbilcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2NvdXJzZURldGFpbHMnLCAnc3VwMicpIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSAtIEFwcGxpY2F0aW9uIEluaXRpdGlhbGl6ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCcuL2FwcCcpXG5cblxuJCAtPlxuXG4gICMgSW5pdGlhbGl6ZSBBcHBsaWNhdGlvblxuICBhcHBsaWNhdGlvbi5pbml0aWFsaXplKClcblxuICAjIFN0YXJ0IEJhY2tib25lIHJvdXRlclxuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KClcblxuXG4gICIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvc3VwZXJzL01vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTW9kZWwgZXh0ZW5kcyBNb2RlbFxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgRVZFTlQgSEFORExFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIC0gUm91dGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUm91dGVzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBcbiAgcm91dGVzOlxuICAgICcnIDogJ2hvbWUnXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBIYW5kbGVyc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaG9tZTogLT5cbiAgICBpZiAkKCcjYXBwJykubGVuZ3RoID4gMFxuXG4gICAgICBAY3VycmVudFdpa2lVc2VyID0gJCggJyNhcHAnICkuYXR0cignZGF0YS13aWtpdXNlcicpXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2ludHJvJ11bJ2luc3RydWN0b3JfdXNlcm5hbWUnXVsndmFsdWUnXSA9IEBjdXJyZW50V2lraVVzZXJcblxuICAgICAgJCggJyNhcHAnICkuaHRtbChhcHBsaWNhdGlvbi5ob21lVmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcCcpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcCcpKVxuXG4gICAgICBlbHNlIGlmIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXBpZCcpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvSWQnLCBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwaWQnKSlcblxuXG4gICAgZWxzZSBpZiAkKCcjbG9naW4nKS5sZW5ndGggPiAwXG5cbiAgICAgICgkICcjbG9naW4nKS5odG1sKGFwcGxpY2F0aW9uLmxvZ2luVmlldy5yZW5kZXIoKS5lbClcblxuICAjXG4gICMgVXRpbGl0aWVzXG4gICNcblxuICBnZXRQYXJhbWV0ZXJCeU5hbWU6IChuYW1lKSAtPlxuXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKVxuXG4gICAgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKVxuXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKVxuXG4gICAgKGlmIG5vdCByZXN1bHRzPyB0aGVuIFwiXCIgZWxzZSBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKSlcblxuXG4iLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBIb21lIFBhZ2UgVGVtcGxhdGVcXG4tLT5cXG5cXG48IS0tIE1BSU4gQVBQIENPTlRFTlQgLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuY29udGVudCAtLT5cXG5cXG5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sb2dpbl9pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxvZ2luX2luc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAgc3RlcC0tZmlyc3Qgc3RlcC0tbG9naW5cXFwiPlxcbiAgICBcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgICAgICAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgICAgICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmxvZ2luX2luc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG5cXG4gICAgICAgIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImxvZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIvYXV0aC9tZWRpYXdpa2lcXFwiPlxcbiAgICAgICAgICAgIExvZ2luIHdpdGggV2lraXBlZGlhXFxuICAgICAgICAgIDwvYT5cXG5cIlxuICAgICsgXCJcXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxkaXYgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwiZG90IHN0ZXAtbmF2LWluZGljYXRvcnNfX2l0ZW0gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0FjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmhhc1Zpc2l0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGRhdGEtbmF2LWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBJZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcElkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+KjwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJ2aXNpdGVkXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbmFjdGl2ZVwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vLWFycm93IFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IFN0ZXAgTmF2aWdhdGlvbiBcXG4tLT5cXG5cXG5cXG48IS0tIFNURVAgTkFWIERPVCBJTkRJQ0FUT1JTIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWluZGljYXRvcnMgaGlkZGVuXFxcIj5cXG5cXG4gIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zdGVwcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1pbmRpY2F0b3JzIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBOQVYgQlVUVE9OUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnMtLW5vcm1hbFxcXCI+XFxuICAgIDxhIGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLXByZXYgcHJldiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnByZXZJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLXJpZ2h0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLWxlZnRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnByZXZUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAucHJldlRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgPC9hPlxcblxcbiAgICA8YSBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IG5leHQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5uZXh0SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0xhc3RTdGVwLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uZXh0VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm5leHRUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLWxlZnQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tcmlnaHRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPC9hPlxcbiAgPC9kaXY+XFxuXFxuXFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zLS1lZGl0XFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXZfX2J1dHRvbi0tZXhpdC1lZGl0IGNvbmZpcm0gZXhpdC1lZGl0XFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmJhY2tUb092ZXJ2aWV3VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmJhY2tUb092ZXJ2aWV3VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtYnV0dG9ucyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICBcXG4gICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gIFxcbiAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIDwvZGl2PlxcbiAgIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcbiAgPCEtLSBJTlRSTyBTVEVQIEZPUk0gQVJFQSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbm5lclxcXCI+XFxuICAgIDwhLS0gZm9ybSBmaWVsZHMgLS0+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWlubmVyIC0tPlxcblxcblxcbiAgPCEtLSBEQVRFUyBNT0RVTEUgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tZGF0ZXNcXFwiPlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1kYXRlcyAtLT5cXG5cXG5cIlxuICAgICsgXCJcXG5cXG4gIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuby1lZGl0LW1vZGVcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGluYWN0aXZlXFxcIiBpZD1cXFwiYmVnaW5CdXR0b25cXFwiIGhyZWY9XFxcIlxcXCI+XFxuICAgICAgICBTdGFydCBkZXNpZ25pbmcgbXkgYXNzaWdubWVudFxcbiAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImVkaXQtbW9kZS1vbmx5XFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZSBleGl0LWVkaXRcXFwiIGhyZWY9XFxcIiNcXFwiPlxcbiAgICAgICAgQmFja1xcbiAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWFjdGlvbnMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm0tY29udGVudF9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmsgc3RlcC1pbmZvX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluZm9UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5mb1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPHAgY2xhc3M9XFxcImxhcmdlIHN0ZXAtaW5mb19faW50cm9cXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb24gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5hY2NvcmRpYW4sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIEhFQURFUiAtLT5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICA8IS0tIElORk8gU0VDVElPTiBDT05URU5UIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2NvbnRlbnRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2NvbnRlbnQgLS0+XFxuXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uIC0tPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhblwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9faGVhZGVyXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXIgLS0+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiAgICBcXG4gICAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAgICBcXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFpbiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBGT1JNIDogTGVmdCBTaWRlIG9mIFN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1sYXlvdXRcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tbGF5b3V0X19pbm5lclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+XFxuXFxuICAgICAgXFxuICAgICAgPCEtLSBTVEVQIEZPUk0gSU5ORVIgQ09OVEVOVCAtLT5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tY29udGVudFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj48L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBJTkZPIDogUmlnaHQgc2lkZSBvZiBzdGVwIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mb1xcXCI+XFxuICA8IS0tIFNURVAgSU5GTyBUSVAgU0VDVElPTiAtLT5cXG4gIDwhLS0gdXNlZCBmb3IgYm90aCBjb3Vyc2UgaW5mbyBhbmQgZ2VuZXJpYyBpbmZvIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tdGlwcyAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1pbm5lclxcXCI+XFxuICAgIDwhLS0gV0lLSUVEVSBMT0dPIC0tPlxcbiAgICA8YSBjbGFzcz1cXFwibWFpbi1sb2dvXFxcIiBocmVmPVxcXCJodHRwOi8vd2lraWVkdS5vcmdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiB0aXRsZT1cXFwid2lraWVkdS5vcmdcXFwiPldJS0lFRFUuT1JHPC9hPlxcblxcbiAgICA8IS0tIFNURVAgSU5GTyBJTk5FUiAtLT5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXdyYXBwZXJcXFwiPlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5mb1RpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcXG4gICAgICA8IS0tIElORk8gU0VDVElPTlMgLS0+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlY3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuICAgIFxcblxcblxcbiAgICBcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mbyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8cD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvcD5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGxpIGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvbGk+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS1ncmlkXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50ZXh0KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50ZXh0OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiA6IDxzcGFuIGNsYXNzPVxcXCJzdGFycyBzdGFycy0tXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGFycykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RhcnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvIHN0ZXAtaW5mby10aXBcXFwiIGRhdGEtaXRlbS1pbmRleD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbjxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jayBcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Bc3NpZ25tZW50IHR5cGU6IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RleHRcXFwiPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmRlc2NyaXB0aW9uLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5NaW5pbXVtIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5taW5fdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm1pbl90aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+UmVjb21tZW5kZWQgdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnJlY190aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAucmVjX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkJlc3QgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuYmVzdF9mb3IsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+Tm90IGFwcHJvcHJpYXRlIGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLm5vdF9mb3IsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TGVhcm5pbmcgT2JqZWN0aXZlczwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmxlYXJuaW5nX29iamVjdGl2ZXMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cD5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuY29udGVudCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuY29udGVudDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBcXFwiIGRhdGEtaXRlbS1pbmRleD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbiAgXFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJpbmZvLWFycm93XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1jaGVja2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZGlzYWJsZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZXhjbHVzaXZlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj48c3Bhbj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcbiAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgIC8+XFxuICA8YSBjbGFzcz1cXFwiY2hlY2stYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJpbmZvLWljb25cXFwiPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vdC1lZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBlZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBkYXRhLWV4Y2x1c2l2ZT1cXFwidHJ1ZVxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IGN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS10ZXh0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tdGV4dF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8aW5wdXQgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnR5cGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiAvPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1wZXJjZW50XFxcIiBkYXRhLXBhdGh3YXktaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wYXRod2F5SWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXBlcmNlbnRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaWNvbiBpY29uLS1wZXJjZW50XFxcIj48L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaWNvbiBpY29uLS1wb2ludHNcXFwiPnBvaW50czwvZGl2PlxcbiAgICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnR5cGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBtYXhsZW5ndGg9XFxcIjNcXFwiIC8+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWVkaXQgY3VzdG9tLWlucHV0LWFjY29yZGlhblxcXCI+XFxuICA8YSBjbGFzcz1cXFwiZWRpdC1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPltlZGl0XTwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXIgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9faGVhZGVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgXFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9fY29udGVudCBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19jb250ZW50XFxcIj5cXG4gICAgPHVsPlxcbiAgICAgIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5hc3NpZ25tZW50cywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE3LCBwcm9ncmFtMTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvdWw+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE3KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGxpPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCkpXG4gICAgKyBcIjwvbGk+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE5KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJpbmZvLWFycm93XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1saW5rXFxcIj5cXG4gIDxsYWJlbD48YSBocmVmPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaHJlZikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiA+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2E+PC9sYWJlbD5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIxKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lclxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJfX2hlYWRlclxcXCI+XFxuICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMjIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpb1xcXCI+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIvPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJfX2hlYWRlclxcXCI+XFxuICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2gyPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lciBjdXN0b20taW5wdXQtcmFkaW8taW5uZXItLWdyb3VwXFxcIj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNSwgcHJvZ3JhbTI1LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMjUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubmFtZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSW5wdXQgSXRlbSBUZW1wbGF0ZXNcXG4gIFxcbi0tPlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNoZWNrYm94KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvQm94KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGV4dCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlcmNlbnQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lZGl0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCJcbiAgICArIFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGluayksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOSwgcHJvZ3JhbTE5LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIxLCBwcm9ncmFtMjEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Hcm91cCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IE1hcmt1cCBmb3IgU3RhcnQvRW5kIERhdGUgSW5wdXQgTW9kdWxlXFxuLS0+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19fbGFiZWxcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2lubmVyIGZyb21cXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPlllYXI8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJ5ZWFyXFxcIiBpZD1cXFwieWVhclN0YXJ0XFxcIiBuYW1lPVxcXCJ5ZWFyU3RhcnRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX3N0YXJ0X2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJ5ZWFyXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE0XFxcIj4yMDE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE1XFxcIj4yMDE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE2XFxcIj4yMDE2PC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5Nb250aDwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcIm1vbnRoXFxcIiBpZD1cXFwibW9udGhTdGFydFxcXCIgbmFtZT1cXFwibW9udGhTdGFydFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfc3RhcnRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcIm1vbnRoXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLWRheVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+RGF5PC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZGF5XFxcIiBpZD1cXFwiZGF5U3RhcnRcXFwiIG5hbWU9XFxcImRheVN0YXJ0XFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9zdGFydF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwiZGF5XFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxM1xcXCI+MTM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE0XFxcIj4xNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTVcXFwiPjE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNlxcXCI+MTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE3XFxcIj4xNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMThcXFwiPjE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxOVxcXCI+MTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwXFxcIj4yMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjFcXFwiPjIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMlxcXCI+MjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIzXFxcIj4yMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjRcXFwiPjI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNVxcXCI+MjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI2XFxcIj4yNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjdcXFwiPjI3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOFxcXCI+Mjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI5XFxcIj4yOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzBcXFwiPjMwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIzMVxcXCI+MzE8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIFxcblxcbiAgPC9kaXY+XFxuICA8c3BhbiBjbGFzcz1cXFwiZGF0ZXMtdG9cXFwiPlxcbiAgICB0b1xcbiAgPC9zcGFuPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19pbm5lciB0b1xcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0teWVhclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+WWVhcjwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcInllYXJcXFwiIGlkPVxcXCJ5ZWFyRW5kXFxcIiBuYW1lPVxcXCJ5ZWFyRW5kXFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9lbmRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcInllYXJcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTRcXFwiPjIwMTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTVcXFwiPjIwMTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTZcXFwiPjIwMTY8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuICAgIFxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5Nb250aDwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcIm1vbnRoXFxcIiBpZD1cXFwibW9udGhFbmRcXFwiIG5hbWU9XFxcIm1vbnRoRW5kXFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9lbmRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcIm1vbnRoXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLWRheVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+RGF5PC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZGF5XFxcIiBpZD1cXFwiZGF5RW5kXFxcIiBuYW1lPVxcXCJkYXlFbmRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX2VuZF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwiZGF5XFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxM1xcXCI+MTM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE0XFxcIj4xNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTVcXFwiPjE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNlxcXCI+MTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE3XFxcIj4xNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMThcXFwiPjE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxOVxcXCI+MTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwXFxcIj4yMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjFcXFwiPjIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMlxcXCI+MjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIzXFxcIj4yMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjRcXFwiPjI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNVxcXCI+MjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI2XFxcIj4yNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjdcXFwiPjI3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOFxcXCI+Mjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI5XFxcIj4yOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzBcXFwiPjMwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIzMVxcXCI+MzE8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIFxcblxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxsaT5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApKVxuICAgICsgXCI8L2xpPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtd3JhcHBlciBoYXMtY29udGVudCBlZGl0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWVkaXQgY3VzdG9tLWlucHV0LWFjY29yZGlhblxcXCI+XFxuICAgIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5bZWRpdF08L2E+XFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXIgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9faGVhZGVyXFxcIj5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICBcXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9fY29udGVudCBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19jb250ZW50XFxcIj5cXG4gICAgICA8dWw+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuYXNzaWdubWVudHMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L3VsPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG92ZXItbGltaXQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcblxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG5cXG4gICAgICAgICAgICA8bGFiZWwgZm9yPVxcXCJwZXJjZW50XFxcIj48c3Bhbj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcblxcbiAgICAgICAgICAgIDxpbnB1dCBuYW1lPVxcXCJncmFkaW5nLXNlbGVjdGlvblxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIC8+XFxuXFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ1xcXCI+XFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zdW1tYXJ5XFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3RvdGFsXFxcIj5cXG5cXG4gICAgICA8aDM+VG90YWw8L2gzPlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3BlcmNlbnQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc092ZXJMaW1pdCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuXFxuICAgICAgPGgzIGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fdG90YWwtbnVtYmVyXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudG90YWxHcmFkZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudG90YWxHcmFkZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8c3BhbiBjbGFzcz1cXFwicGVyY2VudC1zeW1ib2xcXFwiPiU8L3NwYW4+PC9oMz5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG4gIFxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uXFxcIj5cXG5cXG4gICAgPGg1IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb25fX3RpdGxlXFxcIj5HcmFkaW5nIGJhc2VkIG9uOjwvaDU+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvbi1mb3JtXFxcIj5cXG5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtd3JhcHBlclxcXCI+XFxuXFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAub3B0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIDwvZGl2PlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiO1xuXG5cbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5cbiAgYnVmZmVyICs9IFwie3tjb3Vyc2UgZGV0YWlscyBcXG4gfCBjb3Vyc2VfbmFtZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3Vyc2VfbmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBpbnN0cnVjdG9yX3VzZXJuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmluc3RydWN0b3JfdXNlcm5hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxuIHwgaW5zdHJ1Y3Rvcl9yZWFsbmFtZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZWFjaGVyKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IHN1YmplY3QgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3ViamVjdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBzdGFydF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndpemFyZF9zdGFydF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IGVuZF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndpemFyZF9lbmRfZGF0ZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBpbnN0aXR1dGlvbiA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zY2hvb2wpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxuIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxufX1cXG5cXG5cIjtcbiAgaWYgKHN0YWNrMiA9IGhlbHBlcnMuZGVzY3JpcHRpb24pIHsgc3RhY2syID0gc3RhY2syLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2syID0gZGVwdGgwLmRlc2NyaXB0aW9uOyBzdGFjazIgPSB0eXBlb2Ygc3RhY2syID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazIuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazIpXG4gICAgKyBcIlxcblxcblwiXG4gICAgKyBcInt7dGFibGUgb2YgY29udGVudHN9fVxcbj09VGltZWxpbmU9PVxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fRFlLID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0RZSyA9IG5vXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSB5ZXNcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fR29vZF9BcnRpY2xlcyA9IG5vXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazEsIHN0YWNrMjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZXF1ZXN0X2hlbHApKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IHJldHVybiBzdGFjazI7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJcXG4gfCB3YW50X2hlbHBfZmluZGluZ19hcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMSwgc3RhY2syO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgcmV0dXJuIHN0YWNrMjsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIlxcbiB8IHdhbnRfaGVscF9ldmFsdWF0aW5nX2FydGljbGVzID0geWVzXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e2NvdXJzZSBvcHRpb25zXFxuIHwgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmdhKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wcmVwYXJlX2xpc3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTIsIHByb2dyYW0xMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG59fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucmVuZGVySW5PdXRwdXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgcmV0dXJuIHN0YWNrMTsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiJVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPT1HcmFkaW5nPT1cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgZ3JhZGluZyBcXG5cIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZ3JhZGluZywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjxici8+fX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFuIGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FkZCB0byBhbiBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbGx1c3RyYXRlIGFuIGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0xpc3QgYXJ0aWNsZSBjaG9pY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIGFydGljbGVzIGZyb20gYSBsaXN0fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRyYWZ0c19tYWluc3BhY2UpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2FuZGJveCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRyYWZ0c19tYWluc3BhY2UpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud29ya19saXZlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOCwgcHJvZ3JhbTE4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL091dGxpbmUgYXMgbGVhZCBzZWN0aW9uIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RZSyBub21pbmF0aW9uc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBvbmUgcGVlciByZXZpZXcgYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzfCBwZWVycmV2aWV3bnVtYmVyID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnBlZXJfZmVlZGJhY2spLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVlcl9yZXZpZXdzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIG9uZSBwZWVyIHJldmlld319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmVwYXJlIGluLWNsYXNzIHByZXNlbnRhdGlvbn19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIENsYXNzIHByZXNlbnRhdGlvbnMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIEZpbmlzaGluZyB0b3VjaGVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Jbi1jbGFzcyBwcmVzZW50YXRpb25zfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUmVmbGVjdGl2ZSBlc3NheX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dpa2lwZWRpYSBwb3J0Zm9saW99fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00NChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PcmlnaW5hbCBhcmd1bWVudCBwYXBlcn19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgMXwgMSB8IFdpa2lwZWRpYSBlc3NlbnRpYWxzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ludHJvIHRvIFdpa2lwZWRpYX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgMiB8IEVkaXRpbmcgYmFzaWNzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgdGhlIHRyYWluaW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBlbnJvbGxlZH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgMyB8IEV4cGxvcmluZyB0aGUgdG9waWMgYXJlYX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGxvcmluZyB0aGUgdG9waWMgYXJlYSBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA0IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNyaXRpcXVlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3B5X2VkaXRfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgNCB8IFVzaW5nIHNvdXJjZXMgYW5kIGNob29zaW5nIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1VzaW5nIHNvdXJjZXMgaW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmFkZF90b19hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWxsdXN0cmF0ZV9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wcmVwYXJlX2xpc3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDExLCBwcm9ncmFtMTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IFdlZWsgNX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgNSB8IEZpbmFsaXppbmcgdG9waWNzIGFuZCBzdGFydGluZyByZXNlYXJjaCB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA2IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGlsZSBhIGJpYmxpb2dyYXBoeX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgNiB8IERyYWZ0aW5nIHN0YXJ0ZXIgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBldGlxdWV0dGUgYW5kIHNhbmRib3hlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA3IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucmVzZWFyY2hfcGxhbm5pbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY3JlYXRlX291dGxpbmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE1LCBwcm9ncmFtMTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucmVzZWFyY2hfcGxhbm5pbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud3JpdGVfbGVhZCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjAsIHByb2dyYW0yMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA3IHwgTW92aW5nIGFydGljbGVzIHRvIHRoZSBtYWluIHNwYWNlIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01haW4gc3BhY2UgaW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgOCB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Nb3ZlIHRvIG1haW4gc3BhY2V9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmR5ayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5keWspKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGFuZCB5b3VyIGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDggfCBCdWlsZGluZyBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7Y2xhc3Mgd29ya3Nob3B9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA5IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWzBdKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDI2LCBwcm9ncmFtMjYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDkgfCBHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2sgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTAgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWzBdKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMwLCBwcm9ncmFtMzAsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyOCwgcHJvZ3JhbTI4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAxMCB8IFJlc3BvbmRpbmcgdG8gZmVlZGJhY2sgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbn19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAxMSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NYWtlIGVkaXRzIGJhc2VkIG9uIHBlZXIgcmV2aWV3c319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jbGFzc19wcmVzZW50YXRpb24pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMyLCBwcm9ncmFtMzIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgMTEgfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzNiwgcHJvZ3JhbTM2LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMzQsIHByb2dyYW0zNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzgsIHByb2dyYW0zOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDEyIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVmbGVjdGl2ZV9lc3NheSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNDAsIHByb2dyYW00MCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBvcnRmb2xpbykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNDIsIHByb2dyYW00MiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9yaWdpbmFsX3BhcGVyKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0NCwgcHJvZ3JhbTQ0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDEyIHwgRHVlIGRhdGUgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FsbCBzdHVkZW50cyBmaW5pc2hlZH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tlbmQgb2YgY291cnNlIHdlZWt9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIlxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jVEVNUEFMVEVcbldpa2lEYXRlc01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMnKVxuXG4jSU5QVVRTXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRGF0ZUlucHV0VmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuXG4gIGV2ZW50czpcblxuICAgICdjbGljayBzZWxlY3QnIDogJ2NsaWNrSGFuZGxlcidcblxuICAgICdjaGFuZ2Ugc2VsZWN0JyA6ICdjaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2ZvY3VzIHNlbGVjdCcgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ2JsdXIgc2VsZWN0JyA6ICdibHVySGFuZGxlcidcblxuICAgICdtb3VzZW92ZXInIDogJ2ZvY3VzSGFuZGxlcidcblxuICAgICdtb3VzZW91dCcgOiAnYmx1ckhhbmRsZXInXG5cbiAgbTogJydcbiAgZDogJydcbiAgeTogJydcbiAgZGF0ZVZhbHVlOiAnJ1xuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgJCgnYm9keScpLm9uICdjbGljaycsIChlKSA9PlxuXG4gICAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgY2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgYmx1ckhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuXG4gIGZvY3VzSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIGNoYW5nZUhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuICAgICR0YXJnZXQgPSAoJCBlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZCA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLWlkJylcblxuICAgIHR5cGUgPSAkdGFyZ2V0LmF0dHIoJ2RhdGEtZGF0ZS10eXBlJylcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVt0eXBlXSA9IHZhbHVlXG5cbiAgICBAbSA9IFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF1bJ21vbnRoJ11cblxuICAgIEBkID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnZGF5J11cblxuICAgIEB5ID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsneWVhciddXG5cbiAgICBAZGF0ZVZhbHVlID0gXCIje0B5fS0je0BtfS0je0BkfVwiXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdLnZhbHVlID0gQGRhdGVWYWx1ZVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZGF0ZTpjaGFuZ2UnLCBAKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgaGFzVmFsdWU6IC0+XG5cbiAgICByZXR1cm4gQCRlbC5maW5kKCdzZWxlY3QnKS52YWwoKSAhPSAnJ1xuXG5cbiAgY2xvc2VJZk5vVmFsdWU6IC0+XG5cbiAgICBpZiBAaGFzVmFsdWUoKVxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnb3BlbicpXG5cblxuICBpc1ZhbGlkOiAtPlxuICAgIGlzSXQgPSBmYWxzZVxuXG4gICAgaWYgQG0gIT0gJycgYW5kIEBkICE9ICcnIGFuZCBAeSAhPSAnJ1xuICAgICAgaXNJdCA9IHRydWVcblxuICAgIHJldHVybiBpc0l0XG5cblxuXG5cblxuXG4iLCIjIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuV2lraUdyYWRpbmdNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpR3JhZGluZ01vZHVsZS5oYnMnKVxuXG4jRGF0YVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBHcmFkaW5nSW5wdXRWaWV3IGV4dGVuZHMgVmlld1xuXG4gIHRlbXBsYXRlOiBXaWtpR3JhZGluZ01vZHVsZVxuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaW5wdXRDaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIC5yYWRpby1idXR0b24nIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIGxhYmVsJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnZ3JhZGU6Y2hhbmdlJyA6ICdncmFkZUNoYW5nZUhhbmRsZXInXG5cbiAgY3VycmVudFZhbHVlczogW11cblxuXG4gIHZhbHVlTGltaXQ6IDEwMFxuXG5cbiAgZ3JhZGluZ1NlbGVjdGlvbkRhdGE6IFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXVxuXG5cbiAgY3VycmVudFRvdGFsOiAtPlxuXG4gICAgdG90YWwgPSAwXG5cbiAgICBfLmVhY2goQGN1cnJlbnRWYWx1ZXMsICh2YWwpID0+XG5cbiAgICAgIHRvdGFsICs9IHBhcnNlSW50KHZhbClcblxuICAgIClcblxuICAgIHJldHVybiB0b3RhbFxuXG5cblxuICBnZXRJbnB1dFZhbHVlczogLT5cblxuICAgIHZhbHVlcyA9IFtdXG5cbiAgICBAcGFyZW50U3RlcFZpZXcuJGVsLmZpbmQoJ2lucHV0W3R5cGU9XCJwZXJjZW50XCJdJykuZWFjaCgtPlxuXG4gICAgICBjdXJWYWwgPSAoJCB0aGlzKS52YWwoKVxuXG4gICAgICBpZiBjdXJWYWxcbiAgICAgICAgXG4gICAgICAgIHZhbHVlcy5wdXNoKGN1clZhbClcblxuICAgICAgZWxzZVxuXG4gICAgICAgICgkIHRoaXMpLnZhbCgwKVxuXG4gICAgICAgIHZhbHVlcy5wdXNoKDApXG5cblxuXG4gICAgKVxuXG4gICAgQGN1cnJlbnRWYWx1ZXMgPSB2YWx1ZXNcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGdyYWRlQ2hhbmdlSGFuZGxlcjogKGlkLCB2YWx1ZSkgLT5cbiAgICBcbiAgICBAZ2V0SW5wdXRWYWx1ZXMoKS5yZW5kZXIoKVxuXG5cbiAgcmFkaW9CdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkcGFyZW50RWwgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICRwYXJlbnRHcm91cCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRpbnB1dEVsID0gJHBhcmVudEVsLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpXG5cblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICAkb3RoZXJSYWRpb3MgPSAkcGFyZW50R3JvdXAuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKS5ub3QoJHBhcmVudEVsWzBdKVxuXG4gICAgICAkb3RoZXJSYWRpb3MuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkcGFyZW50RWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS5vcHRpb25zLCAob3B0KSAtPlxuXG4gICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlXG4gICAgICAgIFxuICAgICAgKVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10ub3B0aW9uc1skaW5wdXRFbC5hdHRyKCdpZCcpXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLnZhbHVlID0gJGlucHV0RWwuYXR0cignaWQnKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgb3V0ID0ge1xuXG4gICAgICB0b3RhbEdyYWRlOiBAY3VycmVudFRvdGFsKClcblxuICAgICAgaXNPdmVyTGltaXQ6IEBjdXJyZW50VG90YWwoKSA+IEB2YWx1ZUxpbWl0XG5cbiAgICAgIG9wdGlvbnM6IEBncmFkaW5nU2VsZWN0aW9uRGF0YS5vcHRpb25zXG5cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0XG5cblxuXG5cblxuXG5cblxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBIb21lVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuSG9tZVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0hvbWVUZW1wbGF0ZS5oYnMnKVxuXG5PdXRwdXRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicycpXG5cbiNTVUJWSUVXU1xuU3RlcFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9TdGVwVmlldycpXG5cblN0ZXBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9TdGVwTW9kZWwnKVxuXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuVGltZWxpbmVWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvVGltZWxpbmVWaWV3JylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG5cbiAgdGVtcGxhdGU6IEhvbWVUZW1wbGF0ZVxuXG5cbiAgc3RlcERhdGE6IFxuXG4gICAgaW50cm86IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5pbnRyb19zdGVwc1xuXG4gICAgcGF0aHdheXM6IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5wYXRod2F5c1xuXG4gICAgb3V0cm86IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5vdXRyb19zdGVwc1xuXG5cbiAgcGF0aHdheUlkczogLT5cblxuICAgIHJldHVybiBfLmtleXMoQHN0ZXBEYXRhLnBhdGh3YXlzKVxuXG4gIHN0ZXBWaWV3czogW11cblxuXG4gIGFsbFN0ZXBWaWV3czpcblxuICAgIGludHJvOiBbXVxuXG4gICAgcGF0aHdheTogW11cblxuICAgIG91dHJvOiBbXVxuXG5cbiAgc2VsZWN0ZWRQYXRod2F5czogW11cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIElOSVRcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgIEBTdGVwTmF2ID0gbmV3IFN0ZXBOYXZWaWV3KClcblxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBzdGVwc1JlbmRlcmVkID0gZmFsc2VcblxuXG4gIGV2ZW50czogXG5cbiAgICAnY2xpY2sgLmV4aXQtZWRpdCcgOiAnZXhpdEVkaXRDbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6bmV4dCcgOiAnbmV4dEhhbmRsZXInXG5cbiAgICAnc3RlcDpwcmV2JyA6ICdwcmV2SGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9IYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6Z290b0lkJyA6ICdnb3RvSWRIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6ZWRpdCcgOiAnZWRpdEhhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuICAgICdlZGl0OmV4aXQnIDogJ29uRWRpdEV4aXQnXG5cblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcblxuICAgIHVubGVzcyBAc3RlcHNSZW5kZXJlZFxuICAgIFxuICAgICAgQGFmdGVyUmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAJGlubmVyQ29udGFpbmVyID0gQCRlbC5maW5kKCcuY29udGVudCcpXG5cbiAgICBAcmVuZGVySW50cm9TdGVwcygpXG5cbiAgICBAcmVuZGVyU3RlcHMoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuXG4gICAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuICAgIHNldFRpbWVvdXQoPT5cbiAgICAgIEB0aW1lbGluZVZpZXcgPSBuZXcgVGltZWxpbmVWaWV3KClcbiAgICAsMjAwMClcbiAgICBcblxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVySW50cm9TdGVwczogLT5cblxuICAgIHN0ZXBOdW1iZXIgPSAwXG5cbiAgICBfLmVhY2goQHN0ZXBEYXRhLmludHJvLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBzdGVwTnVtYmVyIClcblxuICAgICAgaWYgaW5kZXggaXMgMFxuXG4gICAgICAgIG5ld3ZpZXcuaXNGaXJzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIEBhbGxTdGVwVmlld3MuaW50cm8ucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVyU3RlcHM6IC0+XG5cbiAgICBAYWxsU3RlcFZpZXdzLnBhdGh3YXkgPSBbXVxuXG4gICAgc3RlcE51bWJlciA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBfLmVhY2goQHNlbGVjdGVkUGF0aHdheXMsIChwaWQsIHBpbmRleCkgPT5cblxuICAgICAgXy5lYWNoKEBzdGVwRGF0YS5wYXRod2F5c1twaWRdLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICBpZiBAc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggPiAxXG5cbiAgICAgICAgICBpZiBzdGVwLmlkIGlzICdncmFkaW5nJyB8fCBzdGVwLmlkIGlzICdvdmVydmlldycgfHwgc3RlcC50eXBlIGlzICdncmFkaW5nJyB8fCBzdGVwLnR5cGUgaXMgJ292ZXJ2aWV3J1xuXG4gICAgICAgICAgICBpZiBwaW5kZXggPCBAc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggLSAxXG5cbiAgICAgICAgICAgICAgcmV0dXJuIFxuXG4gICAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICAgIClcblxuICAgICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC1wYXRod2F5IHN0ZXAtcGF0aHdheS0tI3twaWR9XCIpXG5cbiAgICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgICAgQGFsbFN0ZXBWaWV3cy5wYXRod2F5LnB1c2gobmV3dmlldylcblxuICAgICAgICBzdGVwTnVtYmVyKytcblxuICAgICAgKVxuICAgIFxuICAgIClcblxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVyT3V0cm9TdGVwczogLT5cblxuICAgIGNvbnNvbGUubG9nICdvdXRybydcblxuICAgIEBhbGxTdGVwVmlld3Mub3V0cm8gPSBbXVxuXG4gICAgc3RlcE51bWJlciA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBfLmVhY2goQHN0ZXBEYXRhLm91dHJvLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBzdGVwTnVtYmVyIClcblxuICAgICAgaWYgaW5kZXggaXMgQHN0ZXBEYXRhLm91dHJvLmxlbmd0aCAtIDFcblxuICAgICAgICBuZXd2aWV3LmlzTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIEBhbGxTdGVwVmlld3Mub3V0cm8ucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIHJlY3JlYXRlUGF0aHdheTogLT5cblxuICAgIGNsb25lID0gQHN0ZXBWaWV3c1xuXG4gICAgQHN0ZXBWaWV3cyA9IFtjbG9uZVswXSwgY2xvbmVbMV1dXG5cbiAgICBfLmVhY2goQGFsbFN0ZXBWaWV3cy5wYXRod2F5LCAoc3RlcCkgLT5cblxuICAgICAgc3RlcC5yZW1vdmUoKVxuXG4gICAgKVxuXG4gICAgXy5lYWNoKEBhbGxTdGVwVmlld3Mub3V0cm8sIChzdGVwKSAtPlxuXG4gICAgICBzdGVwLnJlbW92ZSgpXG5cbiAgICApXG5cbiAgICBAcmVuZGVyU3RlcHMoKVxuXG4gICAgQHJlbmRlck91dHJvU3RlcHMoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGNvbnRlbnQ6IFwiVGhpcyBpcyBzcGVjaWFsIGNvbnRlbnRcIlxuXG4gICAgfVxuICAgIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwKz0xXG4gICAgXG4gICAgaWYgQGN1cnJlbnRTdGVwIGlzIEBzdGVwVmlld3MubGVuZ3RoIFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgZGVjcmVtZW50U3RlcDogLT5cblxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHVwZGF0ZVN0ZXA6IChpbmRleCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IGluZGV4XG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgdXBkYXRlU3RlcEJ5SWQ6IChpZCkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgaWYgc3RlcFZpZXcuc3RlcElkKCkgaXMgaWRcblxuICAgICAgICBAdXBkYXRlU3RlcChfLmluZGV4T2YoQHN0ZXBWaWV3cyxzdGVwVmlldykpXG4gICAgICAgIFxuICAgICAgICByZXR1cm5cbiAgICAgIFxuICAgIClcblxuXG4gIHNob3dDdXJyZW50U3RlcDogLT5cblxuICAgIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5zaG93KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6dXBkYXRlJywgQGN1cnJlbnRTdGVwKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHVwZGF0ZVNlbGVjdGVkUGF0aHdheTogKGFjdGlvbiwgcGF0aHdheUlkKSAtPlxuXG4gICAgaWYgYWN0aW9uIGlzICdhZGQnXG5cbiAgICAgIGlmIHBhdGh3YXlJZCBpcyAncmVzZWFyY2h3cml0ZSdcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cyA9IFtwYXRod2F5SWRdXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cy5wdXNoKHBhdGh3YXlJZClcblxuICAgIGVsc2UgaWYgYWN0aW9uIGlzICdyZW1vdmUnXG5cbiAgICAgIGlmIHBhdGh3YXlJZCBpcyAncmVzZWFyY2h3cml0ZSdcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cyA9IFtdXG5cbiAgICAgIGVsc2VcblxuICAgICAgICByZW1vdmVJbmRleCA9IF8uaW5kZXhPZihAc2VsZWN0ZWRQYXRod2F5LCBwYXRod2F5SWQpXG5cbiAgICAgICAgQHNlbGVjdGVkUGF0aHdheXMuc3BsaWNlKHJlbW92ZUluZGV4KVxuXG4gICAgQHJlY3JlYXRlUGF0aHdheSgpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgY3VycmVudFN0ZXBWaWV3OiAtPlxuXG4gICAgcmV0dXJuIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXVxuXG5cbiAgaGlkZUFsbFN0ZXBzOiAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy5oaWRlKClcbiAgICAgIFxuICAgIClcblxuXG4gIGhpZGVBbGxUaXBzOiAoZSkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgc3RlcFZpZXcudGlwVmlzaWJsZSA9IGZhbHNlXG4gICAgICBcbiAgICApXG5cbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIG5leHRIYW5kbGVyOiAtPlxuXG4gICAgQGFkdmFuY2VTdGVwKClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG4gIHByZXZIYW5kbGVyOiAtPlxuXG4gICAgQGRlY3JlbWVudFN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGVkaXRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBpZiBpZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICB4ID0gY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHN0YXJ0IHRoZSBwcm9jZXNzIG92ZXIgd2l0aCBhIG5ldyBhc3NpZ25tZW50IHR5cGU/JylcbiAgICAgIGlmICF4XG4gICAgICAgIHJldHVyblxuXG4gICAgZWxzZSAgICAgICBcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdlZGl0LW1vZGUnKVxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsICh2aWV3LCBpbmRleCkgPT5cblxuICAgICAgaWYgdmlldy5tb2RlbC5pZCA9PSBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKGluZGV4KVxuXG4gICAgKVxuXG5cbiAgb25FZGl0RXhpdDogLT5cblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnZWRpdC1tb2RlJylcblxuXG4gIGV4aXRFZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdlZGl0OmV4aXQnKVxuXG5cblxuICBnb3RvSGFuZGxlcjogKGluZGV4KSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ290b0lkSGFuZGxlcjogKGlkKSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXBCeUlkKGlkKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGdldFNlbGVjdGVkSWRzOiAtPlxuXG4gICAgc2VsZWN0ZWRJZHMgPSBbXVxuXG4gICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHMsIChzdGVwcykgPT5cblxuICAgICAgXy5lYWNoKHN0ZXBzLCAoc3RlcCkgPT5cblxuICAgICAgICBpZiBzdGVwLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgIGlmIHN0ZXAuaWRcblxuICAgICAgICAgICAgc2VsZWN0ZWRJZHMucHVzaCBzdGVwLmlkXG5cbiAgICAgIClcblxuICAgIClcblxuICAgIHJldHVybiBzZWxlY3RlZElkc1xuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcbklucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIElucHV0VmlldyBcblxuXG4gICIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Mb2dpblRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzJylcblxuV2l6YXJkQ29udGVudCA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkQ29udGVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG4gIHRlbXBsYXRlOiBMb2dpblRlbXBsYXRlXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICBcbiAgICByZXR1cm4gV2l6YXJkQ29udGVudFswXSIsIlxuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5XaWtpT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMnKVxuQ291cnNlRGV0YWlsc1RlbXBhbHRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VEZXRhaWxzVGVtcGxhdGUuaGJzJylcbkdyYWRpbmdUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicycpXG5Db3Vyc2VPcHRpb25zVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZU9wdGlvbnNUZW1wbGF0ZS5oYnMnKVxuXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE91dHB1dFZpZXcgZXh0ZW5kcyBWaWV3IFxuXG5cbiAgdGVtcGxhdGU6IFdpa2lPdXRwdXRUZW1wbGF0ZVxuXG5cbiAgZGV0YWlsc1RlbXBsYXRlOiBDb3Vyc2VEZXRhaWxzVGVtcGFsdGVcblxuICBncmFkaW5nVGVtcGxhdGU6IEdyYWRpbmdUZW1wbGF0ZVxuXG4gIG9wdGlvbnNUZW1wbGF0ZTogQ291cnNlT3B0aW9uc1RlbXBsYXRlXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3dpemFyZDpwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcicgXG5cblxuICBvdXRwdXRQbGFpblRleHQ6IC0+XG5cbiAgICBAcmVuZGVyKClcblxuICAgIHJldHVybiBAJGVsLnRleHQoKVxuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBwb3B1bGF0ZU91dHB1dCgpICkgKVxuICAgIFxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuXG4gIHBvcHVsYXRlT3V0cHV0OiAtPlxuXG4gICAgZGV0YWlsc091dHB1dCA9IEAkZWwuaHRtbChAZGV0YWlsc1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIHJhd0Fzc2lnbm1lbnRPdXRwdXQgPSBAJGVsLmh0bWwoQHRlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIGFzc2lnbm1lbnRPdXRwdXQgPSByYXdBc3NpZ25tZW50T3V0cHV0LnJlcGxhY2UoLyhcXHJcXG58XFxufFxccikvZ20sXCJcIilcblxuICAgIGdyYWRpbmdPdXRwdXQgPSBAJGVsLmh0bWwoQGdyYWRpbmdUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBvcHRpb25zT3V0cHV0ID0gQCRlbC5odG1sKEBvcHRpb25zVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgY291cnNlT3V0ID0gZGV0YWlsc091dHB1dCArIGFzc2lnbm1lbnRPdXRwdXQgKyBncmFkaW5nT3V0cHV0ICsgb3B0aW9uc091dHB1dFxuICAgIFxuICAgIHJldHVybiBjb3Vyc2VPdXRcblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICByZXR1cm4gXy5leHRlbmQoV2l6YXJkU3RlcElucHV0cyx7IGRlc2NyaXB0aW9uOiAkKCcjc2hvcnRfZGVzY3JpcHRpb24nKS52YWwoKSwgbGluZUJyZWFrOiAnPGJyLz4nfSlcblxuXG4gIGV4cG9ydERhdGE6IChmb3JtRGF0YSkgLT5cblxuICAgICQuYWpheChcblxuICAgICAgdHlwZTogJ1BPU1QnXG5cbiAgICAgIHVybDogJy9wdWJsaXNoJ1xuXG4gICAgICBkYXRhOlxuXG4gICAgICAgIHdpa2l0ZXh0OiBmb3JtRGF0YVxuXG4gICAgICAgIGNvdXJzZV90aXRsZTogV2l6YXJkU3RlcElucHV0cy5pbnRyby5jb3Vyc2VfbmFtZS52YWx1ZVxuXG4gICAgICBzdWNjZXNzOiAocmVzcG9uc2UpIC0+XG5cbiAgICAgICAgJCgnI3B1Ymxpc2gnKS5yZW1vdmVDbGFzcygncHJvY2Vzc2luZycpXG5cbiAgICAgICAgaWYgcmVzcG9uc2Uuc3VjY2Vzc1xuXG4gICAgICAgICAgbmV3UGFnZSA9IFwiaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS8je3Jlc3BvbnNlLnRpdGxlfVwiXG5cbiAgICAgICAgICBhbGVydChcIkNvbmdyYXRzISBZb3UgaGF2ZSBzdWNjZXNzZnVsbHkgY3JlYXRlZC9lZGl0ZWQgYSBXaWtpZWR1IENvdXJzZSBhdCAje25ld1BhZ2V9XCIpXG5cbiAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IG5ld1BhZ2VcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBjb25zb2xlLmxvZyByZXNwb25zZVxuXG4gICAgICAgICAgYWxlcnQoJ0htbS4uLiBzb21ldGhpbmcgd2VudCB3cm9uZy4gVHJ5IGNsaWNraW5nIFwiUHVibGlzaFwiIGFnYWluLiBJZiB0aGF0IGRvZXNuXFwndCB3b3JrLCBwbGVhc2Ugc2VuZCBhIG1lc3NhZ2UgdG8gc2FnZUB3aWtpZWR1Lm9yZy4nKVxuXG5cbiAgICApXG4gICAgXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG5cbiAgICBpZiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlLmxlbmd0aCA+IDAgXG5cbiAgICAgICQoJyNwdWJsaXNoJykuYWRkQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAjIEBleHBvcnREYXRhKEAkZWwuaHRtbChAcG9wdWxhdGVPdXRwdXQoKSkudGV4dCgpKVxuXG4gICAgICBAZXhwb3J0RGF0YShAcG9wdWxhdGVPdXRwdXQoKSlcblxuICAgIGVsc2VcblxuICAgICAgYWxlcnQoJ1lvdSBtdXN0IGVudGVyIGEgY291cnNlIHRpdGxlIGFzIHRoaXMgd2lsbCBiZWNvbWUgdGhlIHRpdGxlIG9mIHlvdXIgY291cnNlIHBhZ2UuJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJ2ludHJvJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICQoJyNjb3Vyc2VfbmFtZScpLmZvY3VzKClcblxuICAgICAgLDUwMClcblxuXG4gICAgXG5cbiAgICBcblxuICAgIFxuIiwiIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbldpa2lTdW1tYXJ5TW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraVN1bW1hcnlNb2R1bGUuaGJzJylcbldpa2lEZXRhaWxzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURldGFpbHNNb2R1bGUuaGJzJylcblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblRpbWVsaW5lVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1RpbWVsaW5lVmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBPdmVydmlld1ZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgb3ZlcnZpZXdJdGVtVGVtcGxhdGU6IFdpa2lEZXRhaWxzTW9kdWxlXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc2VsZWN0ZWRQYXRod2F5cyA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXNcblxuICAgIHNlbGVjdGVkT2JqZWN0cyA9IF8ud2hlcmUoV2l6YXJkU3RlcElucHV0c1snYXNzaWdubWVudF9zZWxlY3Rpb24nXSwge3NlbGVjdGVkOiB0cnVlfSlcblxuICAgICQoJzxkaXYgY2xhc3M9XCJzdGVwLWZvcm0tY29udGVudF9fdGl0bGVcIj5TZWxlY3RlZCBhc3NpZ25tZW50KHMpOiA8L2Rpdj4nKS5hcHBlbmRUbyhAJGVsKS5jc3MoXG4gICAgICBtYXJnaW5Cb3R0b206ICc4cHgnXG4gICAgKVxuXG4gICAgXy5lYWNoKHNlbGVjdGVkT2JqZWN0cywgKG9iaikgPT5cblxuICAgICAgcGF0aFRpdGxlID0gb2JqLmxhYmVsXG5cbiAgICAgICRuZXdUaXRsZSA9ICQoQG92ZXJ2aWV3SXRlbVRlbXBsYXRlKFxuXG4gICAgICAgIGxhYmVsOiBwYXRoVGl0bGVcblxuICAgICAgICBzdGVwSWQ6ICdhc3NpZ25tZW50X3NlbGVjdGlvbidcblxuICAgICAgICBhc3NpZ25tZW50czogW11cblxuICAgICAgKSkuZmluZCgnLmN1c3RvbS1pbnB1dCcpLnJlbW92ZUNsYXNzKCdjdXN0b20taW5wdXQtLWFjY29yZGlhbicpXG5cbiAgICAgICRuZXdUaXRsZS5maW5kKCcuZWRpdC1idXR0b24nKVxuXG4gICAgICBAJGVsLmFwcGVuZCgkbmV3VGl0bGUpXG5cbiAgICApXG5cbiAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICBcbiAgICBcbiAgICBfLmVhY2goc2VsZWN0ZWRQYXRod2F5cywgKHBpZCwgaSkgPT5cblxuICAgICAgc3RlcERhdGEgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwRGF0YS5wYXRod2F5c1twaWRdXG5cbiAgICAgIGlucHV0RGF0YUlkcyA9IF8ucGx1Y2soc3RlcERhdGEsICdpZCcpXG5cbiAgICAgIHN0ZXBUaXRsZXMgPSBfLnBsdWNrKHN0ZXBEYXRhLCAndGl0bGUnKVxuXG4gICAgICB0b3RhbExlbmd0aCA9IHN0ZXBEYXRhLmxlbmd0aFxuXG4gICAgICBpZiBzdGVwVGl0bGVzLmxlbmd0aCA+IDAgJiYgaSBpcyAwXG5cbiAgICAgICAgJCgnPGRpdiBjbGFzcz1cInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVwiPkFzc2lnbm1lbnQgZGV0YWlsczogPC9kaXY+JykuYXBwZW5kVG8oQCRlbCkuY3NzKFxuICAgICAgICAgIGJvdHRvbTogJ2F1dG8nXG4gICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnXG4gICAgICAgICAgbWFyZ2luQm90dG9tOiAnMCdcbiAgICAgICAgICBtYXJnaW5Ub3A6ICcxNXB4J1xuICAgICAgICApXG5cbiAgICAgIF8uZWFjaChzdGVwVGl0bGVzLCAodGl0bGUsIGluZGV4KSA9PlxuXG4gICAgICAgIHVubGVzcyBzdGVwRGF0YVtpbmRleF0uc2hvd0luT3ZlcnZpZXdcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgICBzdGVwSW5wdXRJdGVtcyA9IFdpemFyZFN0ZXBJbnB1dHNbaW5wdXREYXRhSWRzW2luZGV4XV1cblxuICAgICAgICBfLmVhY2goc3RlcElucHV0SXRlbXMsIChpbnB1dCkgPT5cblxuICAgICAgICAgIGlmIGlucHV0LnR5cGVcblxuICAgICAgICAgICAgaWYgaW5wdXQudHlwZSBpcyAnY2hlY2tib3gnIHx8IGlucHV0LnR5cGUgaXMgJ3JhZGlvQm94J1xuXG4gICAgICAgICAgICAgIGlmIGlucHV0LnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQubGFiZWxcblxuICAgICAgICAgICAgZWxzZSBpZiBpbnB1dC50eXBlIGlzICdyYWRpb0dyb3VwJ1xuXG4gICAgICAgICAgICAgIGlmIGlucHV0LmlkIGlzICdwZWVyX3Jldmlld3MnXG5cbiAgICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0Lm92ZXJ2aWV3TGFiZWxcbiAgICAgICAgKVxuXG4gICAgICAgIGlmIHNlbGVjdGVkSW5wdXRzLmxlbmd0aCA9PSAwXG5cbiAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIFwiW05vbmUgc2VsZWN0ZWRdXCJcblxuICAgICAgICBAJGVsLmFwcGVuZCggQG92ZXJ2aWV3SXRlbVRlbXBsYXRlKFxuXG4gICAgICAgICAgbGFiZWw6IHRpdGxlXG5cbiAgICAgICAgICBzdGVwSWQ6IGlucHV0RGF0YUlkc1tpbmRleF1cblxuICAgICAgICAgIGFzc2lnbm1lbnRzOiBzZWxlY3RlZElucHV0c1xuXG4gICAgICAgICkpXG5cbiAgICAgIClcbiAgICApXG5cbiAgICBAcmVuZGVyRGVzY3JpcHRpb24oKVxuICAgIFxuICAgIHJldHVybiBAXG5cblxuICByZW5kZXJEZXNjcmlwdGlvbjogLT5cblxuICAgICRkZXNjSW5wdXQgPSAkKFwiPHRleHRhcmVhIGlkPSdzaG9ydF9kZXNjcmlwdGlvbicgcm93cz0nNicgc3R5bGU9J3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI0MiwyNDIsMjQyLDEuMCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDIwMiwyMDIsMjAyLDEuMCk7cGFkZGluZzoxMHB4IDE1cHg7Zm9udC1zaXplOiAxNnB4O2xpbmUtaGVpZ2h0IDIzcHg7bGV0dGVyLXNwYWNpbmc6IDAuMjVweDsnPjwvdGV4dGFyZWE+XCIpXG5cbiAgICAkZGVzY0lucHV0LnZhbChXaXphcmRTdGVwSW5wdXRzLmNvdXJzZV9kZXRhaWxzLmRlc2NyaXB0aW9uKVxuXG4gICAgJCgnLmRlc2NyaXB0aW9uLWNvbnRhaW5lcicpLmh0bWwoJGRlc2NJbnB1dFswXSlcblxuICAgICRkZXNjSW5wdXQub2ZmICdjaGFuZ2UnXG5cbiAgICAkZGVzY0lucHV0Lm9uICdjaGFuZ2UnLCAoZSkgLT5cblxuICAgICAgV2l6YXJkU3RlcElucHV0cy5jb3Vyc2VfZGV0YWlscy5kZXNjcmlwdGlvbiA9ICQodGhpcykudmFsKClcblxuICAgIHJldHVybiBAXG5cblxuXG5cbiAgICBcblxuICAiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwTmF2Vmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuU3RlcE5hdlRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE5hdlZpZXcgZXh0ZW5kcyBWaWV3XG5cblxuICBjbGFzc05hbWU6ICdzdGVwLW5hdidcblxuXG4gIHRlbXBsYXRlOiBTdGVwTmF2VGVtcGxhdGVcblxuXG4gIGhhc0JlZW5Ub0xhc3RTdGVwOiBmYWxzZVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBcbiAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDp1cGRhdGUnIDogJ3VwZGF0ZUN1cnJlbnRTdGVwJ1xuXG4gICAgJ3N0ZXA6YW5zd2VyZWQnIDogJ3N0ZXBBbnN3ZXJlZCdcblxuICAgICdlZGl0OmV4aXQnIDogJ2VkaXRFeGl0SGFuZGxlcidcblxuXG4gIGV2ZW50czogLT5cblxuICAgICdjbGljayAubmV4dCcgOiAnbmV4dENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAucHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZG90JyAgOiAnZG90Q2xpY2tIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA8IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG4gICAgZWxzZSBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA9PSBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGlkZGVuJylcblxuICAgIEBhZnRlclJlbmRlcigpXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY3VycmVudDogQGN1cnJlbnRTdGVwXG5cbiAgICAgIHRvdGFsOiBAdG90YWxTdGVwc1xuXG4gICAgICBwcmV2SW5hY3RpdmU6IEBpc0luYWN0aXZlKCdwcmV2JylcblxuICAgICAgbmV4dEluYWN0aXZlOiBAaXNJbmFjdGl2ZSgnbmV4dCcpXG5cbiAgICAgIG5leHRUaXRsZTogPT5cblxuICAgICAgICBpZiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgICAgICByZXR1cm4gJydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdOZXh0J1xuXG4gICAgICBwcmV2VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICdCYWNrJ1xuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICByZXR1cm4gJ1ByZXYnXG5cbiAgICAgIGlzTGFzdFN0ZXA6IEBpc0xhc3RTdGVwKClcblxuICAgICAgYmFja1RvT3ZlcnZpZXdUaXRsZTogJ0dvIEJhY2sgdG8gT3ZlcnZpZXcnXG5cbiAgICAgIHN0ZXBzOiA9PlxuXG4gICAgICAgIG91dCA9IFtdXG5cbiAgICAgICAgXy5lYWNoKEBzdGVwVmlld3MsIChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICAgIHN0ZXBEYXRhID0gc3RlcC5tb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgICAgICBpc0FjdGl2ZSA9IEBjdXJyZW50U3RlcCBpcyBpbmRleFxuXG4gICAgICAgICAgd2FzVmlzaXRlZCA9IHN0ZXAuaGFzVXNlclZpc2l0ZWRcblxuICAgICAgICAgIG91dC5wdXNoIHtpZDogaW5kZXgsIGlzQWN0aXZlOiBpc0FjdGl2ZSwgaGFzVmlzaXRlZDogd2FzVmlzaXRlZCwgc3RlcFRpdGxlOiBzdGVwRGF0YS50aXRsZSwgc3RlcElkOiBzdGVwRGF0YS5pZH1cblxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG91dFxuXG4gICAgfVxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIHJldHVybiBAXG5cblxuXG4gIHByZXZDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICdncmFkaW5nJylcblxuICAgIGVsc2VcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpwcmV2JylcblxuXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuXG4gIGRvdENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIGlmIEBoYXNCZWVuVG9MYXN0U3RlcFxuXG4gICAgICBpZiBwYXJzZUludCgkdGFyZ2V0LmF0dHIoJ2RhdGEtbmF2LWlkJykpID09IHBhcnNlSW50KEB0b3RhbFN0ZXBzIC0gMSlcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdlZGl0OmV4aXQnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJHRhcmdldC5kYXRhKCdzdGVwLWlkJykpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsICR0YXJnZXQuZGF0YSgnbmF2LWlkJykpXG5cblxuICBlZGl0RXhpdEhhbmRsZXI6IC0+XG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAbGFzdFN0ZXBJbmRleCgpKVxuXG5cbiAgdXBkYXRlQ3VycmVudFN0ZXA6IChzdGVwKSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gc3RlcFxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBAaGFzQmVlblRvTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICBAcmVuZGVyKClcblxuXG4gIHN0ZXBBbnN3ZXJlZDogKHN0ZXBWaWV3KSAtPlxuXG4gICAgcmV0dXJuIEByZW5kZXIoKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGxhc3RTdGVwSW5kZXg6IC0+XG4gICAgXG4gICAgcmV0dXJuIEB0b3RhbFN0ZXBzLTFcblxuICBpc0xhc3RTdGVwOiAtPlxuXG4gICAgcmV0dXJuIEBjdXJyZW50U3RlcCBpcyBAdG90YWxTdGVwcyAtIDEgJiYgQGN1cnJlbnRTdGVwID4gMVxuXG4gIGlzSW5hY3RpdmU6IChpdGVtKSAtPlxuXG4gICAgaXRJcyA9IHRydWVcblxuICAgIGlmIGl0ZW0gPT0gJ3ByZXYnXG5cbiAgICAgIGl0SXMgPSBAY3VycmVudFN0ZXAgaXMgMFxuXG4gICAgZWxzZSBpZiBpdGVtID09ICduZXh0J1xuXG4gICAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5oYXNVc2VyQW5zd2VyZWRcblxuICAgICAgICBpdElzID0gZmFsc2VcblxuICAgICAgZWxzZSBpZiBAaXNMYXN0U3RlcCgpXG4gICAgICAgIFxuICAgICAgICBpdElzID0gdHJ1ZVxuXG4gICAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzLmxlbmd0aCA9PSAwXG5cbiAgICAgICAgaXRJcyA9IHRydWUgIFxuXG5cbiAgICByZXR1cm4gaXRJc1xuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIyMjIyMjIyNBUFAjIyMjIyMjIyNcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIyMjIyMjIyNWSUVXIENMQVNTIyMjIyMjIyMjXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jIyMjIyMjIyNTVUJWSUVXUyMjIyMjIyMjI1xuSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG5cbkRhdGVJbnB1dFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9EYXRlSW5wdXRWaWV3JylcblxuXG5HcmFkaW5nSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvR3JhZGluZ0lucHV0VmlldycpXG5cblxuT3ZlcnZpZXdWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvT3ZlcnZpZXdWaWV3JylcblxuXG4jIyMjIyMjIyNURU1QTEFURVMjIyMjIyMjIyMjI1xuU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5cbkludHJvU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicycpXG5cblxuSW5wdXRUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0lucHV0VGlwVGVtcGxhdGUuaGJzJylcblxuXG5Db3Vyc2VUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicycpXG5cblxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiMjIyMjIyMjIyNEQVRBIyMjIyMjIyMjXG5Db3Vyc2VJbmZvRGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkQ291cnNlSW5mbycpXG5cbiMjIyMjIyMjI0lOUFVUUyMjIyMjIyMjI1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcFZpZXcgZXh0ZW5kcyBWaWV3XG5cblxuICBjbGFzc05hbWU6ICdzdGVwJ1xuXG5cbiAgdGFnTmFtZTogJ3NlY3Rpb24nXG5cblxuICB0ZW1wbGF0ZTogU3RlcFRlbXBsYXRlXG5cblxuICBpbnRyb1RlbXBsYXRlOiBJbnRyb1N0ZXBUZW1wbGF0ZVxuXG5cbiAgdGlwVGVtcGxhdGU6IElucHV0VGlwVGVtcGxhdGVcblxuXG4gIGNvdXJzZUluZm9UZW1wbGF0ZTogQ291cnNlVGlwVGVtcGxhdGVcblxuXG4gIGNvdXJzZUluZm9EYXRhOiBDb3Vyc2VJbmZvRGF0YVxuXG5cbiAgZGF0ZXNNb2R1bGU6IFdpa2lEYXRlc01vZHVsZVxuXG5cbiAgaGFzVXNlckFuc3dlcmVkOiBmYWxzZVxuXG5cbiAgaGFzVXNlclZpc2l0ZWQ6IGZhbHNlXG5cblxuICBpc0xhc3RTdGVwOiBmYWxzZVxuXG5cbiAgaXNGaXJzdFN0ZXA6IGZhbHNlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBFVkVOVFMgQU5EIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czpcblxuICAgICdjbGljayAjcHVibGlzaCcgOiAncHVibGlzaEhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mby10aXBfX2Nsb3NlJyA6ICdoaWRlVGlwcydcblxuICAgICdjbGljayAjYmVnaW5CdXR0b24nIDogJ2JlZ2luSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvIC5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJyA6ICdhY2NvcmRpYW5DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmVkaXQtYnV0dG9uJyA6ICdlZGl0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgIyAnY2xpY2sgLnN0ZXAtaW5mby10aXAnIDogJ2hpZGVUaXBzJ1xuXG4gIHN1YnNjcmlwdGlvbnM6IFxuXG4gICAgJ3RpcHM6aGlkZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnZGF0ZTpjaGFuZ2UnIDogJ2lzSW50cm9WYWxpZCdcblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgc3RlcElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc3RlcC1pZCcpXG5cbiAgICBpZiBzdGVwSWRcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0Jywgc3RlcElkKVxuXG4gIHN0ZXBJZDogLT5cblxuICAgIHJldHVybiBAbW9kZWwuYXR0cmlidXRlcy5pZFxuXG5cbiAgdmFsaWRhdGVEYXRlczogKGRhdGVWaWV3KSAtPlxuXG4gICAgdW5sZXNzIEBpc0ZpcnN0U3RlcCBvciBAaXNMYXN0U3RlcFxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGRhdGVzQXJlVmFsaWQgPSBmYWxzZVxuXG4gICAgXy5lYWNoKEBkYXRlVmlld3MsIChkYXRlVmlldykgPT5cbiAgICAgIGlmIGRhdGVWaWV3LmlzVmFsaWQoKVxuICAgICAgICBkYXRlc0FyZVZhbGlkID0gdHJ1ZVxuICAgICAgZWxzZSBcbiAgICAgICAgZGF0ZXNBcmVWYWxpZCA9IGZhbHNlXG4gICAgKVxuXG4gICAgcmV0dXJuIGRhdGVzQXJlVmFsaWRcblxuXG4gIGFjY29yZGlhbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkdGFyZ2V0LnRvZ2dsZUNsYXNzKCdvcGVuJylcblxuXG4gIHB1Ymxpc2hIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnd2l6YXJkOnB1Ymxpc2gnKVxuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQHRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgaWYgQGlzRmlyc3RTdGVwXG5cbiAgICAgIEBfcmVuZGVyU3RlcFR5cGUoJ2ZpcnN0JylcblxuICAgIGVsc2UgaWYgQGlzTGFzdFN0ZXBcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnbGFzdCcpXG4gICAgICBcbiAgICBlbHNlXG5cbiAgICAgIEBfcmVuZGVyU3RlcFR5cGUoJ3N0YW5kYXJkJylcblxuICAgIEBfcmVuZGVySW5wdXRzQW5kSW5mbygpXG5cbiAgICByZXR1cm4gQGFmdGVyUmVuZGVyKClcblxuXG4gIF9yZW5kZXJTdGVwVHlwZTogKHR5cGUpIC0+XG5cbiAgICBpZiB0eXBlIGlzICdzdGFuZGFyZCdcblxuICAgICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICdmaXJzdCcgb3IgdHlwZSBpcyAnbGFzdCdcblxuICAgICAgaWYgdHlwZSBpcyAnZmlyc3QnXG5cbiAgICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tZmlyc3QnKS5odG1sKCBAaW50cm9UZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICAgZGF0ZVRpdGxlID0gJ0NvdXJzZSBkYXRlcydcblxuICAgICAgICBAJGJlZ2luQnV0dG9uID0gQCRlbC5maW5kKCdhI2JlZ2luQnV0dG9uJylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEAkZWwuYWRkQ2xhc3MoJ3N0ZXAtLWxhc3QnKS5odG1sKCBAdGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG4gICAgICAgIGRhdGVUaXRsZSA9ICdBc3NpZ25tZW50IHRpbWVsaW5lJ1xuXG4gICAgICBAZGF0ZVZpZXdzID0gW11cblxuICAgICAgJGRhdGVzID0gJChAZGF0ZXNNb2R1bGUoe3RpdGxlOiBkYXRlVGl0bGV9KSlcblxuICAgICAgJGRhdGVJbnB1dHMgPSAkZGF0ZXMuZmluZCgnLmN1c3RvbS1zZWxlY3QnKVxuXG4gICAgICBzZWxmID0gQFxuXG4gICAgICAkZGF0ZUlucHV0cy5lYWNoKChpbnB1dEVsZW1lbnQpIC0+XG5cbiAgICAgICAgbmV3RGF0ZVZpZXcgPSBuZXcgRGF0ZUlucHV0VmlldyhcblxuICAgICAgICAgIGVsOiAkKHRoaXMpIFxuXG4gICAgICAgIClcblxuICAgICAgICBuZXdEYXRlVmlldy5wYXJlbnRTdGVwVmlldyA9IHNlbGZcblxuICAgICAgICBzZWxmLmRhdGVWaWV3cy5wdXNoKG5ld0RhdGVWaWV3KVxuICAgICAgXG4gICAgICApXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1kYXRlcycpLmh0bWwoJGRhdGVzKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIF9yZW5kZXJJbnB1dHNBbmRJbmZvOiAtPlxuXG4gICAgQGlucHV0U2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1pbm5lcicpXG5cbiAgICBAJHRpcFNlY3Rpb24gPSBAJGVsLmZpbmQoJy5zdGVwLWluZm8tdGlwcycpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZydcblxuICAgICAgcGF0aHdheXMgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzXG5cbiAgICAgIG51bWJlck9mUGF0aHdheXMgPSBwYXRod2F5cy5sZW5ndGhcblxuICAgICAgaWYgbnVtYmVyT2ZQYXRod2F5cyA+IDFcblxuICAgICAgICBkaXN0cmlidXRlZFZhbHVlID0gTWF0aC5mbG9vcigxMDAvbnVtYmVyT2ZQYXRod2F5cylcblxuICAgICAgICBAaW5wdXREYXRhID0gW11cblxuICAgICAgICBfLmVhY2gocGF0aHdheXMsIChwYXRod2F5KSA9PlxuXG4gICAgICAgICAgZ3JhZGluZ0RhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVtwYXRod2F5XVxuXG4gICAgICAgICAgXy5lYWNoKGdyYWRpbmdEYXRhLCAoZ3JhZGVJdGVtKSA9PlxuXG4gICAgICAgICAgICBncmFkZUl0ZW0udmFsdWUgPSBkaXN0cmlidXRlZFZhbHVlXG5cbiAgICAgICAgICAgIEBpbnB1dERhdGEucHVzaCBncmFkZUl0ZW1cblxuICAgICAgICAgIClcblxuICAgICAgICApXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAaW5wdXREYXRhID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuYXR0cmlidXRlcy5pZF1bcGF0aHdheXNbMF1dIHx8IFtdXG5cbiAgICBlbHNlXG5cbiAgICAgIEBpbnB1dERhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXSB8fCBbXVxuXG5cbiAgICBfLmVhY2goQGlucHV0RGF0YSwgKGlucHV0LCBpbmRleCkgPT5cblxuICAgICAgdW5sZXNzIGlucHV0LnR5cGUgXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIGlucHV0LnNlbGVjdGVkICYmIGlucHV0LnJlcXVpcmVkXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC5zZWxlY3RlZCBcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnJlcXVpcmVkIGlzIGZhbHNlXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC50eXBlIGlzICdwZXJjZW50J1xuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cblxuICAgICAgaW5wdXRWaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ldyBCYWNrYm9uZS5Nb2RlbChpbnB1dClcblxuICAgICAgKVxuXG4gICAgICBpbnB1dFZpZXcuaW5wdXRUeXBlID0gaW5wdXQudHlwZVxuXG4gICAgICBpbnB1dFZpZXcuaXRlbUluZGV4ID0gaW5kZXhcblxuICAgICAgaW5wdXRWaWV3LnBhcmVudFN0ZXAgPSBAXG5cbiAgICAgIEBpbnB1dFNlY3Rpb24uYXBwZW5kKGlucHV0Vmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgaW5wdXQudGlwSW5mb1xuXG4gICAgICAgIHRpcCA9IFxuXG4gICAgICAgICAgaWQ6IGluZGV4XG5cbiAgICAgICAgICB0aXRsZTogaW5wdXQudGlwSW5mby50aXRsZVxuXG4gICAgICAgICAgY29udGVudDogaW5wdXQudGlwSW5mby5jb250ZW50XG5cbiAgICAgICAgJHRpcEVsID0gQHRpcFRlbXBsYXRlKHRpcClcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuaGFzQ291cnNlSW5mb1xuXG4gICAgICAgIGluZm9EYXRhID0gXy5leHRlbmQoQGNvdXJzZUluZm9EYXRhW2lucHV0LmlkXSwge2lkOiBpbmRleH0gKVxuXG4gICAgICAgICR0aXBFbCA9IEBjb3Vyc2VJbmZvVGVtcGxhdGUoaW5mb0RhdGEpXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRpbnB1dENvbnRhaW5lcnMgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnIHx8IEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIEBncmFkaW5nVmlldyA9IG5ldyBHcmFkaW5nSW5wdXRWaWV3KClcblxuICAgICAgQGdyYWRpbmdWaWV3LnBhcmVudFN0ZXBWaWV3ID0gQFxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tY29udGVudCcpLmFwcGVuZChAZ3JhZGluZ1ZpZXcuZ2V0SW5wdXRWYWx1ZXMoKS5yZW5kZXIoKS5lbClcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdvdmVydmlldydcblxuICAgICAgJGlubmVyRWwgPSBAJGVsLmZpbmQoJy5zdGVwLWZvcm0taW5uZXInKVxuXG4gICAgICAkaW5uZXJFbC5odG1sKCcnKVxuXG4gICAgICBAb3ZlcnZpZXdWaWV3ID0gbmV3IE92ZXJ2aWV3VmlldyhcbiAgICAgICAgZWw6ICRpbm5lckVsXG4gICAgICApXG5cbiAgICAgIEBvdmVydmlld1ZpZXcucGFyZW50U3RlcFZpZXcgPSBAXG5cbiAgICAgIEBvdmVydmlld1ZpZXcucmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuICBoaWRlOiAtPlxuXG4gICAgQCRlbC5oaWRlKClcblxuICAgIHJldHVybiBAXG5cblxuICBzaG93OiAtPlxuXG4gICAgJCgnYm9keSwgaHRtbCcpLmFuaW1hdGUoXG4gICAgICBzY3JvbGxUb3A6IDBcbiAgICAsMSlcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdvdmVydmlldycgfHwgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnb3ZlcnZpZXcnXG5cbiAgICAgIEByZW5kZXIoKS4kZWwuc2hvdygpXG5cbiAgICBlbHNlIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJyB8fCBAbW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdncmFkaW5nJ1xuXG4gICAgICBAcmVuZGVyKCkuJGVsLnNob3coKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnNob3coKVxuXG4gICAgQGhhc1VzZXJWaXNpdGVkID0gdHJ1ZVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGJlZ2luSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cbiAgdXBkYXRlVXNlckhhc0Fuc3dlcmVkOiAoaWQsIHZhbHVlLCB0eXBlKSAtPlxuXG5cbiAgICBpbnB1dEl0ZW1zID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdXG5cbiAgICByZXF1aXJlZFNlbGVjdGVkID0gZmFsc2VcblxuICAgIGlmIHR5cGUgaXMgJ3BlcmNlbnQnXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIHJldHVybiBAXG5cbiAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnY2hlY2tib3gnXG5cbiAgICAgICAgaWYgaXRlbS5yZXF1aXJlZCBpcyB0cnVlXG5cbiAgICAgICAgICBpZiBpdGVtLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgaWYgcmVxdWlyZWRTZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ3JhZGlvR3JvdXAnIG9yIHR5cGUgaXMgJ3JhZGlvQm94J1xuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICd0ZXh0J1xuXG4gICAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgICAgICBpZiBpdGVtLnR5cGUgaXMgJ3RleHQnXG5cbiAgICAgICAgICAgIGlmIGl0ZW0ucmVxdWlyZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIGlmIGl0ZW0udmFsdWUgIT0gJydcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgZWxzZSBcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIClcblxuICAgICAgICBpZiByZXF1aXJlZFNlbGVjdGVkXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gZmFsc2VcblxuICAgICAgICBAaXNJbnRyb1ZhbGlkKClcblxuICAgIGVsc2UgXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSBmYWxzZVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDphbnN3ZXJlZCcsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgaXNJbnRyb1ZhbGlkOiAtPlxuXG4gICAgdW5sZXNzIEBpc0ZpcnN0U3RlcCBvciBAaXNMYXN0U3RlcFxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICBpZiBAaGFzVXNlckFuc3dlcmVkIGFuZCBAdmFsaWRhdGVEYXRlcygpXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5yZW1vdmVDbGFzcygnaW5hY3RpdmUnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5hZGRDbGFzcygnaW5hY3RpdmUnKVxuXG5cbiAgdXBkYXRlUmFkaW9BbnN3ZXI6IChpZCwgaW5kZXgsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5zZWxlY3RlZCA9IHZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS52YWx1ZVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vdmVydmlld0xhYmVsID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5vdmVydmlld0xhYmVsXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gaW5kZXhcblxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlLCBoYXNQYXRod2F5LCBwYXRod2F5KSAtPlxuXG4gICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICBjb25zb2xlLmxvZyBwYXRod2F5LCBpZCwgdmFsdWVcbiAgICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtwYXRod2F5XVtpZF0udHlwZSBcblxuICAgICAgaXNFeGNsdXNpdmUgPSBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnR5cGUgXG5cbiAgICAgIGlzRXhjbHVzaXZlID0gZmFsc2UgfHwgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5leGNsdXNpdmUgXG5cblxuICAgIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgPSBmYWxzZVxuXG4gICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXSwgKGlucHV0SXRlbSkgPT5cblxuICAgICAgaWYgaW5wdXRJdGVtLmV4Y2x1c2l2ZVxuXG4gICAgICAgIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgPSB0cnVlXG5cbiAgICApXG5cbiAgICBvdXQgPSBcblxuICAgICAgdHlwZTogaW5wdXRUeXBlXG5cbiAgICAgIGlkOiBpZFxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuICAgIGlmIGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnIHx8IGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIGlmIHZhbHVlID09ICdvbidcblxuICAgICAgICBpZiBoYXNQYXRod2F5XG5cbiAgICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgaWYgaGFzRXhjbHVzaXZlU2libGluZyAmJiAhaXNFeGNsdXNpdmVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykuYWRkQ2xhc3MoJ25vdC1lZGl0YWJsZScpLnJlbW92ZUNsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgZWxzZSBpZiBpc0V4Y2x1c2l2ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpLm5vdCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykuYWRkQ2xhc3MoJ25vdC1lZGl0YWJsZScpLnJlbW92ZUNsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgaWYgQG1vZGVsLmlkIGlzICdhc3NpZ25tZW50X3NlbGVjdGlvbidcbiAgICAgICAgICBcbiAgICAgICAgICBhcHBsaWNhdGlvbi5ob21lVmlldy51cGRhdGVTZWxlY3RlZFBhdGh3YXkoJ2FkZCcsIGlkKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS5zZWxlY3RlZCA9IGZhbHNlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IGZhbHNlXG5cbiAgICAgICAgaWYgaGFzRXhjbHVzaXZlU2libGluZyAmJiAhaXNFeGNsdXNpdmVcblxuICAgICAgICAgIGFsbE90aGVyc0Rpc2VuZ2FnZWQgPSB0cnVlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94JykuZWFjaCgtPlxuXG4gICAgICAgICAgICBpZiAhJCh0aGlzKS5hdHRyKCdkYXRhLWV4Y2x1c2l2ZScpICYmICQodGhpcykuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAgICAgICAgIGFsbE90aGVyc0Rpc2VuZ2FnZWQgPSBmYWxzZVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgaWYgYWxsT3RoZXJzRGlzZW5nYWdlZFxuXG4gICAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLnJlbW92ZUNsYXNzKCdub3QtZWRpdGFibGUnKS5hZGRDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLmFkZENsYXNzKCdub3QtZWRpdGFibGUnKS5yZW1vdmVDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGVsc2UgaWYgaXNFeGNsdXNpdmVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKS5ub3QoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLnJlbW92ZUNsYXNzKCdub3QtZWRpdGFibGUnKS5hZGRDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGlmIEBtb2RlbC5pZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICAgICAgXG4gICAgICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudXBkYXRlU2VsZWN0ZWRQYXRod2F5KCdyZW1vdmUnLCBpZClcblxuICAgIGVsc2UgaWYgaW5wdXRUeXBlID09ICd0ZXh0JyB8fCBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIGlmIGhhc1BhdGh3YXlcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnZhbHVlID0gdmFsdWVcblxuICAgICAgZWxzZVxuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSB2YWx1ZVxuXG4gICAgY29uc29sZS5sb2cgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgaGlkZVRpcHM6IChlKSAtPlxuXG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cblxuXG5cbiAgICBcbiAgICBcblxuIFxuXG4iLCJcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUaW1lbGluZVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IFxuXG4gIGVsOiAkKCcuZm9ybS1jb250YWluZXInKVxuXG4gIGN1ckRhdGVDb25maWc6XG5cbiAgICB0ZXJtU3RhcnQ6ICcnXG5cbiAgICB0ZXJtRW5kOiAnJ1xuXG4gICAgY291cnNlU3RhcnQ6ICcnXG5cbiAgICBjb3Vyc2VFbmQ6ICcnXG5cbiAgICBjb3Vyc2VTdGFydFdlZWtPZjogJydcblxuICAgIGNvdXJzZUVuZFdlZWtPZjogJydcblxuICAgIG51bWJlcldlZWtzOiAxNlxuXG5cbiAgZGF5c1NlbGVjdGVkOiBbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdXG5cblxuICBhbGxEYXRlczogW11cblxuXG4gIGRvd05hbWVzOiBbJ01vbmRheScsICdUdWVzZGF5JywgJ1dlZG5lc2RheScsICdUaHVyc2RheScsICdGcmlkYXknLCAnU2F0dXJkYXknLCAnU3VuZGF5J11cblxuXG4gIGRvd0FiYnJ2OiBbJ01vbicsICdUdWVzJywgJ1dlZCcsICdUaHVyJywgJ0ZyaScsICdTYXQnLCAnU3VuJ11cblxuXG4gIHJlbmRlckRheXM6IHRydWVcblxuXG4gIGV2ZW50czpcblxuICAgICdtb3VzZWRvd24gI2NMZW5ndGgnIDogJ2NsaWNrSGFuZGxlcidcblxuICAgICdtb3VzZXVwICNjTGVuZ3RoJyAgOiAnY2hhbmdlSGFuZGxlcidcblxuICAgICdjaGFuZ2UgI2NMZW5ndGgnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnY2hhbmdlICN0ZXJtU3RhcnREYXRlJyA6ICdvblRlcm1TdGFydERhdGVDaGFuZ2UnXG5cbiAgICAnY2hhbmdlICN0ZXJtRW5kRGF0ZScgOiAnb25UZXJtRW5kRGF0ZUNoYW5nZSdcblxuICAgICdjaGFuZ2UgI2NvdXJzZVN0YXJ0RGF0ZScgOiAnb25Db3Vyc2VTdGFydERhdGVDaGFuZ2UnXG5cbiAgICAnY2hhbmdlICNjb3Vyc2VFbmREYXRlJyA6ICdvbkNvdXJzZUVuZERhdGVDaGFuZ2UnXG5cbiAgICAnY2hhbmdlIC5kb3dDaGVja2JveCcgOiAnb25Eb3dTZWxlY3QnXG5cblxuICBvbkRvd1NlbGVjdDogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBkb3cgPSAkdGFyZ2V0LmF0dHIoJ2lkJylcblxuICAgIGRvd0lkID0gcGFyc2VJbnQoJHRhcmdldC52YWwoKSlcblxuICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgQGRheXNTZWxlY3RlZFtkb3dJZF0gPSB0cnVlXG5cbiAgICBlbHNlXG5cbiAgICAgIEBkYXlzU2VsZWN0ZWRbZG93SWRdID0gZmFsc2VcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgICQoJ2lucHV0W3R5cGU9XCJkYXRlXCJdJykuZGF0ZXBpY2tlcihcblxuICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICBjb25zdHJhaW5JbnB1dDogdHJ1ZVxuXG4gICAgICBmaXJzdERheTogMVxuXG4gICAgKS5wcm9wKCd0eXBlJywndGV4dCcpXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZSA9ICQoJyNzdGFydFdlZWtPZkRhdGUnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUgPSAkKCcjY291cnNlU3RhcnREYXRlJylcblxuICAgIEAkY291cnNlRW5kRGF0ZSA9ICQoJyNjb3Vyc2VFbmREYXRlJylcblxuICAgIEAkb3V0Q29udGFpbmVyID0gJCgnLm91dHB1dC1jb250YWluZXInKVxuXG4gICAgQCRwcmV2aWV3Q29udGFpbmVyID0gJCgnLnByZXZpZXctY29udGFpbmVyJylcblxuICAgIEAkY291cnNlTGVuZ3RoSW5wdXQgPSAkKCcjY0xlbmd0aCcpXG5cbiAgICBAY291cnNlTGVuZ3RoID0gQCRjb3Vyc2VMZW5ndGhJbnB1dC52YWwoKVxuXG4gICAgQGNvdXJzZURpZmYgPSAwXG5cbiAgICBAZGF0YSA9IGFwcGxpY2F0aW9uLnRpbWVsaW5lRGF0YUFsdFxuXG4gICAgJCgnI2NMZW5ndGgnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAY2hhbmdlSGFuZGxlcihlKVxuXG4gICAgJCgnI2NMZW5ndGgnKS5vbiAnbW91c2Vkb3duJywgKGUpID0+XG4gICAgICBAY2hhbmdlSGFuZGxlcihlKVxuXG4gICAgJCgnI2NMZW5ndGgnKS5vbiAnbW91c2V1cCcsIChlKSA9PlxuICAgICAgQGNoYW5nZUhhbmRsZXIoZSlcblxuICAgICQoJyN0ZXJtU3RhcnREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQG9uVGVybVN0YXJ0RGF0ZUNoYW5nZShlKVxuXG4gICAgJCgnI3Rlcm1FbmREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQG9uVGVybUVuZERhdGVDaGFuZ2UoZSlcblxuICAgICQoJyNjb3Vyc2VTdGFydERhdGUnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAb25Db3Vyc2VTdGFydERhdGVDaGFuZ2UoZSlcblxuICAgICQoJyNjb3Vyc2VFbmREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQG9uQ291cnNlRW5kRGF0ZUNoYW5nZShlKVxuXG4gICAgJCgnLmRvd0NoZWNrYm94Jykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQG9uRG93U2VsZWN0KGUpXG5cbiAgICBAdXBkYXRlKClcblxuICByZXNldERhdGVzOiAtPlxuICAgICNUT0RPIC0gTkVFRCBBIFBMQUNFIFRIQVQgUkVTRVRTIEVWRVJZVEhJTkcgLSBFRyBXSEVOIE1BU1RFUiBDT1VSU0UgREFURVMgQ0hBTkdFXG5cblxuICBvblRlcm1TdGFydERhdGVDaGFuZ2U6IChlKSAtPlxuXG4gICAgQGN1ckRhdGVDb25maWcuY291cnNlU3RhcnQgPSAnJ1xuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUudmFsKCcnKVxuXG4gICAgZGF0ZUlucHV0ID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICBuZXdEYXRlID0gbW9tZW50KGRhdGVJbnB1dCkudG9EYXRlKClcblxuICAgIEBjdXJEYXRlQ29uZmlnLnRlcm1TdGFydCA9IG5ld0RhdGVcblxuICAgIEAkY291cnNlU3RhcnREYXRlLmRhdGVwaWNrZXIoJ29wdGlvbicsICdtaW5EYXRlJywgbmV3RGF0ZSlcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgb25UZXJtRW5kRGF0ZUNoYW5nZTogKGUpIC0+XG5cbiAgICBkYXRlSW5wdXQgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgIG5ld0RhdGUgPSBtb21lbnQoZGF0ZUlucHV0KS50b0RhdGUoKVxuXG4gICAgQGN1ckRhdGVDb25maWcudGVybUVuZCA9IG5ld0RhdGVcblxuICAgIEAkY291cnNlU3RhcnREYXRlLmRhdGVwaWNrZXIoJ29wdGlvbicsICdtYXhEYXRlJywgbmV3RGF0ZSlcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgb25Db3Vyc2VTdGFydERhdGVDaGFuZ2U6IChlKSAtPlxuXG4gICAgQHVwZGF0ZVdlZWtseURhdGVzKClcblxuICBvbkNvdXJzZUVuZERhdGVDaGFuZ2U6IChlKSAtPlxuXG4gICAgQCRjb3Vyc2VMZW5ndGhJbnB1dC52YWwoMTApXG4gICAgQCRjb3Vyc2VMZW5ndGhJbnB1dC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgJCgnb3V0cHV0W25hbWU9XCJvdXQyXCJdJykuaHRtbCgxMClcblxuXG4gIHVwZGF0ZVdlZWtseURhdGVzOiAtPlxuXG4gICAgaWYgQCRjb3Vyc2VTdGFydERhdGUudmFsKCkgaXMgJydcblxuICAgICAgQGN1ckRhdGVDb25maWcuY291cnNlU3RhcnQgPSAnJ1xuXG4gICAgICAkKCdzcGFuLmRhdGUnKS5oaWRlKClcblxuICAgICAgcmV0dXJuXG5cbiAgICBAYWxsRGF0ZXMgPSBbXVxuXG4gICAgbmV3U3RhcnREYXRlID0gbmV3IERhdGUoQCRjb3Vyc2VTdGFydERhdGUudmFsKCkpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VTdGFydCA9IG5ld1N0YXJ0RGF0ZVxuXG4gICAgd2Vla09mRGF0ZSA9IEBnZXRXZWVrT2ZEYXRlKG5ld1N0YXJ0RGF0ZSlcblxuICAgIEBjdXJEYXRlQ29uZmlnLmNvdXJzZVN0YXJ0V2Vla09mID0gd2Vla09mRGF0ZVxuXG4gICAgJCgnc3Bhbi5kYXRlJykuZWFjaCgoaW5kZXgsaXRlbSkgPT5cblxuICAgICAgd2Vla0lkID0gcGFyc2VJbnQoJChpdGVtKS5hdHRyKCdkYXRhLXdlZWsnKSlcblxuICAgICAgbmV3RGF0ZSA9IG5ldyBEYXRlKHdlZWtPZkRhdGUpXG5cbiAgICAgIGlmIGluZGV4IGlzIDBcblxuICAgICAgICBAYWxsRGF0ZXMucHVzaChAZ2V0Rm9ybWF0dGVkRGF0ZVN0cmluZyhuZXcgRGF0ZShuZXdEYXRlKSkpXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIG5ld0RhdGUgPSBuZXdEYXRlLnNldERhdGUobmV3RGF0ZS5nZXREYXRlKCkgKyAoNyAqICh3ZWVrSWQtMSkpKVxuXG4gICAgICBAYWxsRGF0ZXMucHVzaChAZ2V0Rm9ybWF0dGVkRGF0ZVN0cmluZyhuZXcgRGF0ZShuZXdEYXRlKSkpXG5cbiAgICAgICQoaXRlbSkuc2hvdygpLnRleHQoQGdldEZvcm1hdHRlZERhdGVTdHJpbmcobmV3IERhdGUobmV3RGF0ZSkpKVxuXG4gICAgKVxuXG4gICAgJCgnc3Bhbi5kYXRlLmRhdGUtMScpLnNob3coKS50ZXh0KEBnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ld1N0YXJ0RGF0ZSkpXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZS52YWwoXCIje0BnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ld1N0YXJ0RGF0ZSl9XCIpXG5cbiAgICAkKCcuZGF0ZXMtcHJldmlldycpLmh0bWwoJycpXG5cbiAgICAkKCcuZGF0ZXMtcHJldmlldycpLmVhY2goKGluZCwgaXRlbSkgPT5cblxuICAgICAgXy5lYWNoKEBkYXlzU2VsZWN0ZWQsIChzZWxlY3RlZCwgc2VsZWN0ZWRJbmRleCkgPT5cblxuICAgICAgICBpZiBzZWxlY3RlZFxuXG4gICAgICAgICAgaWYgaW5kID09IDBcbiAgICAgICAgICAgIHRoZURhdGUgPSBuZXcgRGF0ZSh3ZWVrT2ZEYXRlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhlRGF0ZSA9IG5ldyBEYXRlKEBhbGxEYXRlc1tpbmRdKVxuXG4gICAgICAgICAgdGhlRGF0ZSA9IHRoZURhdGUuc2V0RGF0ZSh0aGVEYXRlLmdldERhdGUoKSArIChzZWxlY3RlZEluZGV4KSlcblxuICAgICAgICAgICQoaXRlbSkuYXBwZW5kKFwiPGRpdiBjbGFzcz0nZG93LWRhdGUgZG93LWRhdGUtLSN7c2VsZWN0ZWRJbmRleH0nID48c3BhbiBjb250ZW50ZWRpdGFibGU+I3tAZG93TmFtZXNbc2VsZWN0ZWRJbmRleF19IHwgPC9zcGFuPjxzcGFuIGNvbnRlbnRlZGl0YWJsZT4je0BnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ldyBEYXRlKHRoZURhdGUpKX08L3NwYW4+PC9kaXY+XCIpXG4gICAgICApXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgY2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm5cblxuICAgIFxuICBjaGFuZ2VIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBjb3Vyc2VMZW5ndGggPSAkKCcjY0xlbmd0aCcpLnZhbCgpXG5cbiAgICBAY291cnNlRGlmZiA9IDE2IC0gQGNvdXJzZUxlbmd0aFxuXG4gICAgQGN1ckRhdGVDb25maWcuY291cnNlRW5kV2Vla09mID0gbmV3IERhdGUoQGFsbERhdGVzW0Bjb3Vyc2VMZW5ndGgtMV0pXG5cbiAgICBAdXBkYXRlKClcblxuXG4gIHVwZGF0ZTogLT5cblxuICAgIEBvdXQgPSBbXVxuXG4gICAgQHVuaXRzQ2xvbmUgPSBfLmNsb25lKEBkYXRhKVxuXG4gICAgaWYgQGNvdXJzZURpZmYgPiAwXG5cbiAgICAgIEB1bml0c0Nsb25lID0gXy5yZWplY3QoQHVuaXRzQ2xvbmUsIChpdGVtKSA9PlxuXG4gICAgICAgIHJldHVybiBpdGVtLnR5cGUgaXMgJ2JyZWFrJyAmJiBAY291cnNlRGlmZiA+PSBpdGVtLnZhbHVlICYmIGl0ZW0udmFsdWUgIT0gMFxuXG4gICAgICApXG5cbiAgICBvYmogPSBAdW5pdHNDbG9uZVswXVxuXG4gICAgXy5lYWNoKEB1bml0c0Nsb25lLCAoaXRlbSwgaW5kZXgpID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnYnJlYWsnIHx8IGluZGV4IGlzIEB1bml0c0Nsb25lLmxlbmd0aCAtIDFcblxuICAgICAgICBpZiBpbmRleCBpcyBAdW5pdHNDbG9uZS5sZW5ndGggLSAxXG5cbiAgICAgICAgICBAb3V0LnB1c2ggXy5jbG9uZShpdGVtKVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIEBvdXQucHVzaCBfLmNsb25lKG9iailcblxuICAgICAgICBvYmogPSB7fVxuXG4gICAgICAgIHJldHVyblxuXG4gICAgICBlbHNlIGlmIGl0ZW0udHlwZSBpcyAnd2VlaydcblxuICAgICAgICBvYmogPSBAY29tYmluZShvYmosIGl0ZW0pXG5cbiAgICApXG5cbiAgICBAcmVuZGVyUHJldmlldygpXG4gICAgQHJlbmRlclJlc3VsdCgpXG5cbiAgICBAdXBkYXRlV2Vla2x5RGF0ZXMoKVxuXG5cbiAgcmVuZGVyUHJldmlldzogLT5cblxuICAgIEAkcHJldmlld0NvbnRhaW5lci5odG1sKCcnKVxuXG4gICAgXy5lYWNoKEBvdXQsIChpdGVtLCBpbmRleCkgPT5cblxuICAgICAgdGhpc1dlZWsgPSBpbmRleCArIDFcbiAgICAgIG5leHRXZWVrID0gaW5kZXggKyAyXG4gICAgICBpc0xhc3RXZWVrID0gaW5kZXggaXMgQG91dC5sZW5ndGggLSAxXG5cbiAgICAgICMgcmVuZGVyVGl0bGVzKClcbiAgICAgIGlmIGl0ZW0udGl0bGUubGVuZ3RoID4gMFxuXG4gICAgICAgIHRpdGxlcyA9IFwiPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXItaGVhZGVyJz5cIlxuXG4gICAgICAgIHRpdGxlcyArPSBcIjxoNCBkYXRhLXdlZWs9JyN7dGhpc1dlZWt9Jz5XZWVrICN7dGhpc1dlZWt9PHNwYW4gY2xhc3M9J2RhdGUgZGF0ZS0je3RoaXNXZWVrfScgZGF0YS13ZWVrPScje3RoaXNXZWVrfSc+PC9zcGFuPjwvaDQ+XCJcblxuICAgICAgICBfLmVhY2goaXRlbS50aXRsZSwgKHQsIGkpIC0+XG5cbiAgICAgICAgICBpZiBpIGlzIDBcblxuICAgICAgICAgICB0aXRsZXMgKz0gXCI8aDIgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyLXdlZWtseS10aXRsZSc+I3t0fTwvaDI+XCJcblxuICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgdGl0bGVzICs9IFwiPGgzIGNsYXNzPSdwcmV2aWV3LWNvbnRhaW5lci13ZWVrbHktdGl0bGUgcHJldmlldy1jb250YWluZXItd2Vla2x5LXRpdGxlLS1zbWFsbGVyJz4je3R9PC9oMz5cIlxuXG4gICAgICAgIClcblxuICAgICAgICB0aXRsZXMgKz0gXCI8L2Rpdj5cIlxuXG4gICAgICAgIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQodGl0bGVzKVxuXG4gICAgICBkYXRlc091dCA9IFwiPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXItZGF0ZXMgZGF0ZXMtcHJldmlldyBkYXRlcy1wcmV2aWV3LSN7dGhpc1dlZWt9JyBkYXRhLXdlZWs9JyN7dGhpc1dlZWt9Jz48L2Rpdj5cIlxuXG4gICAgICBAJHByZXZpZXdDb250YWluZXIuYXBwZW5kKGRhdGVzT3V0KVxuXG4gICAgICBwcmV2aWV3RGV0YWlscyA9IFwiPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXItZGV0YWlscyc+XCJcblxuICAgICAgIyByZW5kZXJJbkNsYXNzKClcbiAgICAgIGlmIGl0ZW0uaW5fY2xhc3MubGVuZ3RoID4gMFxuXG4gICAgICAgIGluQ2xhc3NPdXQgPSAnPGRpdj4nXG5cbiAgICAgICAgaW5DbGFzc091dCArPSBcIjxoNSBzdHlsZT0nZm9udC13ZWlnaHQ6IGJvbGQ7Jz5JbiBjbGFzczwvaDU+XCJcblxuICAgICAgICBpbkNsYXNzT3V0ICs9ICc8dWw+J1xuXG4gICAgICAgIF8uZWFjaChpdGVtLmluX2NsYXNzLCAoYykgLT5cbiAgICAgICAgICBpbkNsYXNzT3V0ICs9IFwiPGxpPiN7Y308L2xpPlwiXG4gICAgICAgIClcblxuICAgICAgICBpbkNsYXNzT3V0ICs9IFwiPC91bD5cIlxuXG4gICAgICAgIGluQ2xhc3NPdXQgKz0gXCI8L2Rpdj5cIlxuXG4gICAgICAgIHByZXZpZXdEZXRhaWxzICs9IGluQ2xhc3NPdXRcblxuICAgICAgICAjIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQoaW5DbGFzc091dClcblxuXG4gICAgICAjIHJlbmRlckFzc2lnbm1lbnRzKClcbiAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG4gICAgICAgIGFzc2lnbm1lbnRzT3V0ID0gXCI8ZGl2PlwiXG5cbiAgICAgICAgYXNzaWdubWVudHNPdXQgKz0gXCI8aDUgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+QXNzaWdubWVudHMgfCBkdWUgd2VlayAje25leHRXZWVrfTwvaDU+XCJcblxuICAgICAgICBhc3NpZ25tZW50c091dCArPSAnPHVsPidcblxuICAgICAgICBfLmVhY2goaXRlbS5hc3NpZ25tZW50cywgKGFzc2lnbikgLT5cbiAgICAgICAgICBhc3NpZ25tZW50c091dCArPSBcIjxsaT4je2Fzc2lnbn08L2xpPlwiIFxuICAgICAgICApXG5cbiAgICAgICAgYXNzaWdubWVudHNPdXQgKz0gJzwvdWw+J1xuXG4gICAgICAgIGFzc2lnbm1lbnRzT3V0ICs9ICc8L2Rpdj4nXG5cbiAgICAgICAgcHJldmlld0RldGFpbHMgKz0gYXNzaWdubWVudHNPdXRcblxuICAgICAgICAjIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQoYXNzaWdubWVudHNPdXQpXG5cblxuICAgICAgIyByZW5kZXJNaWxlc3RvbmVzKClcbiAgICAgIGlmIGl0ZW0ubWlsZXN0b25lcy5sZW5ndGggPiAwXG5cbiAgICAgICAgbWlsZXN0b25lc091dCA9IFwiPGRpdj5cIlxuXG4gICAgICAgIG1pbGVzdG9uZXNPdXQgKz0gXCI8aDUgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+TWlsZXN0b25lczwvaDU+XCJcblxuICAgICAgICBtaWxlc3RvbmVzT3V0ICs9IFwiPHVsPlwiXG5cbiAgICAgICAgXy5lYWNoKGl0ZW0ubWlsZXN0b25lcywgKG1pbGVzdG9uZSkgLT5cbiAgICAgICAgICBtaWxlc3RvbmVzT3V0ICs9IFwiPGxpPiN7bWlsZXN0b25lLnRpdGxlfTwvbGk+XCJcbiAgICAgICAgKVxuXG4gICAgICAgIG1pbGVzdG9uZXNPdXQgKz0gXCI8L3VsPlwiXG5cbiAgICAgICAgbWlsZXN0b25lc091dCArPSBcIjwvZGl2PlwiXG5cbiAgICAgICAgcHJldmlld0RldGFpbHMgKz0gbWlsZXN0b25lc091dFxuXG4gICAgICAgICMgQCRwcmV2aWV3Q29udGFpbmVyLmFwcGVuZChtaWxlc3RvbmVzT3V0KVxuXG4gICAgICBAJHByZXZpZXdDb250YWluZXIuYXBwZW5kKHByZXZpZXdEZXRhaWxzKVxuXG4gICAgICAjIGlmIGlzTGFzdFdlZWtcblxuICAgICAgIyAgIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQoXCI8aDE+RW5kIG9mIENvdXJzZTwvaDE+XCIpXG5cbiAgICApXG5cblxuICByZW5kZXJSZXN1bHQ6IC0+XG5cbiAgICBAJG91dENvbnRhaW5lci5odG1sKCcnKS5jc3MoJ3doaXRlLXNwYWNlJywgJ3ByZS13cmFwJylcblxuICAgIF8uZWFjaChAb3V0LCAoaXRlbSwgaW5kZXgpID0+XG5cbiAgICAgIHRoaXNXZWVrID0gaW5kZXggKyAxXG4gICAgICBuZXh0V2VlayA9IGluZGV4ICsgMlxuICAgICAgaXNMYXN0V2VlayA9IGluZGV4IGlzIEBvdXQubGVuZ3RoIC0gMVxuXG5cbiAgICAgIGlmIGl0ZW0udGl0bGUubGVuZ3RoID4gMFxuXG4gICAgICAgIHRpdGxlcyA9IFwiPGRpdj5cIlxuXG4gICAgICAgIHRpdGxlcyArPSBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8ICN7dGhpc1dlZWt9IHwgXCJcblxuICAgICAgICBfLmVhY2goaXRlbS50aXRsZSwgKHQsIGkpIC0+XG5cbiAgICAgICAgICBpZiBpIGlzIDBcblxuICAgICAgICAgICB0aXRsZXMgKz0gXCIje3R9IFwiXG5cbiAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIHRpdGxlcyArPSBcInwgI3t0fSBcIlxuXG4gICAgICAgIClcblxuICAgICAgICB0aXRsZXMgKz0gXCJ9fVwiXG5cbiAgICAgICAgdGl0bGVzICs9IFwiPC9kaXY+XCJcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQodGl0bGVzKVxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICAgIGlmIGl0ZW0uaW5fY2xhc3MubGVuZ3RoID4gMFxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+e3tpbiBjbGFzc319PC9kaXY+XCIpXG5cbiAgICAgICAgXy5lYWNoKGl0ZW0uaW5fY2xhc3MsIChjKSA9PlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj4je2N9PC9kaXY+XCIpXG5cbiAgICAgICAgKVxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+e3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAje25leHRXZWVrfSB9fTwvZGl2PlwiKVxuXG4gICAgICAgIF8uZWFjaChpdGVtLmFzc2lnbm1lbnRzLCAoYXNzaWduKSA9PlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj4je2Fzc2lnbn08L2Rpdj5cIilcblxuICAgICAgICApXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGJyLz5cIilcblxuICAgICAgaWYgaXRlbS5taWxlc3RvbmVzLmxlbmd0aCA+IDBcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDogYm9sZDsnPnt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX08L2Rpdj5cIilcblxuICAgICAgICBfLmVhY2goaXRlbS5taWxlc3RvbmVzLCAobSkgPT5cblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXY+I3ttfTwvZGl2PlwiKVxuXG4gICAgICAgIClcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8YnIvPlwiKVxuXG4gICAgICBpZiBpc0xhc3RXZWVrXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3tlbmQgb2YgY291cnNlIHdlZWt9fVwiKVxuXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+PGhyLz5cIilcblxuICAgIClcblxuXG4gIGdldEZvcm1hdHRlZERhdGVTdHJpbmc6IChkYXRlKSAtPlxuICAgIHllYXIgPSBkYXRlLmdldFVUQ0Z1bGxZZWFyKCkudG9TdHJpbmcoKVxuICAgIG1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpKzFcbiAgICBkYXkgPSBkYXRlLmdldFVUQ0RhdGUoKVxuXG4gICAgaWYgbW9udGgudG9TdHJpbmcoKS5sZW5ndGggaXMgMVxuXG4gICAgICBtb250aCA9IFwiMFwiICsgbW9udGgudG9TdHJpbmcoKVxuXG4gICAgZWxzZVxuXG4gICAgICBtb250aCA9IG1vbnRoLnRvU3RyaW5nKClcblxuICAgIGlmIGRheS50b1N0cmluZygpLmxlbmd0aCBpcyAxXG5cbiAgICAgIGRheSA9IFwiMFwiICsgZGF5LnRvU3RyaW5nKClcblxuICAgIGVsc2VcblxuICAgICAgZGF5ID0gZGF5LnRvU3RyaW5nKClcblxuXG4gICAgcmV0dXJuIFwiI3t5ZWFyfS0je21vbnRofS0je2RheX1cIlxuXG5cbiAgZ2V0V2Vla09mRGF0ZTogKGRhdGUpIC0+XG5cbiAgICB5ZWFyID0gZGF0ZS5nZXRVVENGdWxsWWVhcigpLnRvU3RyaW5nKClcblxuICAgIG1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpKzFcblxuICAgIGRheSA9IGRhdGUuZ2V0VVRDRGF5KClcblxuICAgIGRhdGVEYXkgPSBkYXRlLmdldFVUQ0RhdGUoKVxuXG5cbiAgICBpZiBkYXkgaXMgMVxuXG4gICAgICByZXR1cm4gZGF0ZVxuXG4gICAgZWxzZVxuXG4gICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5zZXREYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpLWRhdGUuZ2V0VVRDRGF5KCkpKVxuXG5cbiAgZ2V0V2Vla3NPdXREYXRlOiAoZGF0ZSwgd2Vla3NPdXQpIC0+XG5cbiAgICBuZXdEYXRlID0gbmV3IERhdGUoKVxuXG4gICAgbmV3RGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpKyh3ZWVrc091dCo3KSlcblxuICAgIHJldHVybiBuZXdEYXRlXG5cblxuICBjb21iaW5lOiAob2JqMSwgb2JqMikgLT5cblxuICAgIHRpdGxlID0gXy51bmlvbihvYmoxLnRpdGxlLCBvYmoyLnRpdGxlKVxuXG4gICAgaW5fY2xhc3MgPSBfLnVuaW9uKG9iajEuaW5fY2xhc3MsIG9iajIuaW5fY2xhc3MpXG5cbiAgICBhc3NpZ25tZW50cyA9IF8udW5pb24ob2JqMS5hc3NpZ25tZW50cywgb2JqMi5hc3NpZ25tZW50cylcblxuICAgIG1pbGVzdG9uZXMgPSBfLnVuaW9uKG9iajEubWlsZXN0b25lcywgb2JqMi5taWxlc3RvbmVzKVxuXG4gICAgcmVhZGluZ3MgPSBfLnVuaW9uKG9iajEucmVhZGluZ3MsIG9iajIucmVhZGluZ3MpXG5cbiAgICByZXR1cm4ge3RpdGxlOiB0aXRsZSwgaW5fY2xhc3M6IGluX2NsYXNzLCBhc3NpZ25tZW50czogYXNzaWdubWVudHMsIG1pbGVzdG9uZXM6IG1pbGVzdG9uZXMsIHJlYWRpbmdzOiByZWFkaW5nc31cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4vVmlldycpXG5cblxuI1RFTVBMQVRFU1xuSW5wdXRJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0SXRlbVRlbXBsYXRlLmhicycpXG5cblxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogSW5wdXRJdGVtVGVtcGxhdGVcblxuXG4gIGNsYXNzTmFtZTogJ2N1c3RvbS1pbnB1dC13cmFwcGVyJ1xuXG5cbiAgaG92ZXJUaW1lOiA1MDBcblxuICB0aXBWaXNpYmxlOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwidGV4dFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5pbmZvLWljb24nIDogJ2luZm9JY29uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdmVyIC5jdXN0b20taW5wdXQnIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZWVudGVyIC5jaGVjay1idXR0b24nIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZW91dCcgOiAnbW91c2VvdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0YWJsZSAuY2hlY2stYnV0dG9uJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpb2JveCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0JveENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdmb2N1cyAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkZvY3VzJ1xuXG4gICAgJ2JsdXIgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25CbHVyJ1xuXG5cbiAgaW5mb0ljb25DbGlja0hhbmRsZXI6IC0+XG5cbiAgICB1bmxlc3MgQCRlbC5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAc2hvd1Rvb2x0aXAoKVxuXG4gICAgZWxzZVxuXG4gICAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcblxuICAgICAgICBzY3JvbGxUb3A6IDBcblxuICAgICAgLDUwMClcblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cblxuXG4gIHJhZGlvQm94Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRvdGhlclJhZGlvcyA9IEAkZWwucGFyZW50cygnLnN0ZXAtZm9ybS1pbm5lcicpLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpLmZpbmQoJ2lucHV0JykudmFsKCdvZmYnKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuICBjaGVja0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JykubGVuZ3RoID4gMFxuXG4gICAgICByZXR1cm4gQHJhZGlvQm94Q2xpY2tIYW5kbGVyKGUpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpXG5cbiAgICAgIC50b2dnbGVDbGFzcygnY2hlY2tlZCcpXG4gICAgXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cblxuICBob3ZlckhhbmRsZXI6IChlKSAtPlxuXG4gICAgY29uc29sZS5sb2cgZS50YXJnZXRcblxuXG4gIG1vdXNlb3ZlckhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGlzSG92ZXJpbmcgPSB0cnVlXG4gICAgICBcblxuICBtb3VzZW91dEhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cbiAgc2hvd1Rvb2x0aXA6IC0+XG5cbiAgICBpZiBAaGFzSW5mbygpICYmIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPT0gZmFsc2VcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gdHJ1ZVxuXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBbZGF0YS1pdGVtLWluZGV4PScje0BpdGVtSW5kZXh9J11cIikuYWRkQ2xhc3MoJ3Zpc2libGUnKVxuXG5cbiAgaGlkZVRvb2x0aXA6IC0+XG5cbiAgICBpZiBAaGFzSW5mbygpXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJykgXG5cblxuICBoaWRlU2hvd1Rvb2x0aXA6IC0+XG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgQHNob3dUb29sdGlwKClcblxuXG4gIGxhYmVsQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm4gZmFsc2VcblxuXG4gIGl0ZW1DaGFuZ2VIYW5kbGVyOiAoZSkgLT5cblxuICAgICMgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnYW5zd2VyOnVwZGF0ZWQnLCBpbnB1dElkLCB2YWx1ZSlcblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICAgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCd2YWx1ZScpXG5cbiAgICAgIHBhcmVudElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ25hbWUnKVxuXG4gICAgICBpZiAkKGUuY3VycmVudFRhcmdldCkucHJvcCgnY2hlY2tlZCcpXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCB0cnVlKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCBmYWxzZSlcblxuICAgIGVsc2VcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgICAgaW5wdXRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAgIGlmIEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgICAgcGF0aHdheSA9ICQoZS50YXJnZXQpLnBhcmVudHMoJy5jdXN0b20taW5wdXQnKS5hdHRyKCdkYXRhLXBhdGh3YXktaWQnKVxuXG4gICAgICAgIHVubGVzcyBwYXRod2F5XG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlQW5zd2VyKGlucHV0SWQsIHZhbHVlLCB0cnVlLCBwYXRod2F5KVxuXG4gICAgICBlbHNlXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSwgZmFsc2UpXG5cbiAgICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgICAgaWYgaXNOYU4ocGFyc2VJbnQodmFsdWUpKVxuXG4gICAgICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgnJylcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2dyYWRlOmNoYW5nZScsIGlucHV0SWQsIHZhbHVlKVxuICAgIFxuICAgIHJldHVybiBAcGFyZW50U3RlcC51cGRhdGVVc2VySGFzQW5zd2VyZWQoaW5wdXRJZCwgdmFsdWUsIEBpbnB1dFR5cGUpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKEBpbnB1dFR5cGUpXG5cbiAgICBAJGlucHV0RWwgPSBAJGVsLmZpbmQoJ2lucHV0JylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLnZhbHVlICE9ICcnICYmIEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ3RleHQnXG4gICAgICBcbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgQGhvdmVyVGltZXIgPSBudWxsXG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuXG4gIGhhc0luZm86IC0+XG5cbiAgICByZXR1cm4gQCRlbC5oYXNDbGFzcygnaGFzLWluZm8nKVxuXG5cbiAgb25Gb2N1czogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIG9uQmx1cjogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICB2YWx1ZSA9ICR0YXJnZXQudmFsKClcblxuICAgIGlmIHZhbHVlID09ICcnXG5cbiAgICAgIHVubGVzcyAkdGFyZ2V0LmlzKCc6Zm9jdXMnKVxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgaXNEaXNhYmxlZDogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHVibGljIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc3VwZXIoKVxuXG5cbiAgZ2V0SW5wdXRUeXBlT2JqZWN0OiAtPlxuXG4gICAgcmV0dXJuRGF0YSA9IHt9XG5cbiAgICByZXR1cm5EYXRhW0BpbnB1dFR5cGVdID0gdHJ1ZVxuXG4gICAgcmV0dXJuIHJldHVybkRhdGFcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIGlucHV0VHlwZU9iamVjdCA9IEBnZXRJbnB1dFR5cGVPYmplY3QoKVxuXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAndGV4dCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIGlmIEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnIHx8IEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnZ3JhZGluZydcblxuICAgICAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5jb250aW5nZW50VXBvbi5sZW5ndGggIT0gMFxuXG4gICAgICAgICAgY3VycmVudFNlbGVjdGVkID0gYXBwbGljYXRpb24uaG9tZVZpZXcuZ2V0U2VsZWN0ZWRJZHMoKVxuXG4gICAgICAgICAgcmVuZGVySW5PdXRwdXQgPSBmYWxzZVxuXG4gICAgICAgICAgXy5lYWNoKEBtb2RlbC5hdHRyaWJ1dGVzLmNvbnRpbmdlbnRVcG9uLCAoaWQpID0+XG5cbiAgICAgICAgICAgIF8uZWFjaChjdXJyZW50U2VsZWN0ZWQsIChzZWxlY3RlZElkKSA9PlxuXG4gICAgICAgICAgICAgIGlmIGlkIGlzIHNlbGVjdGVkSWRcblxuICAgICAgICAgICAgICAgIHJlbmRlckluT3V0cHV0ID0gdHJ1ZVxuXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICB1bmxlc3MgcmVuZGVySW5PdXRwdXRcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG5cblxuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Hcm91cCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2VkaXQnXG5cbiAgICAgIGFsbElucHV0cyA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdXG5cbiAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgXy5lYWNoKGFsbElucHV0cywgKGlucHV0KSA9PlxuXG4gICAgICAgIGlmIGlucHV0LnR5cGVcblxuICAgICAgICAgIGlmIGlucHV0LnR5cGUgaXMgJ2NoZWNrYm94JyB8fCBpbnB1dC50eXBlIGlzICdyYWRpb0JveCdcblxuICAgICAgICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQubGFiZWxcblxuICAgICAgICAgIGVsc2UgaWYgaW5wdXQudHlwZSBpcyAncmFkaW9Hcm91cCdcblxuICAgICAgICAgICAgaWYgaW5wdXQuaWQgaXMgJ3BlZXJfcmV2aWV3cydcblxuICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0Lm92ZXJ2aWV3TGFiZWxcblxuICAgICAgKVxuXG4gICAgICBcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGFzLWNvbnRlbnQnKVxuXG4gICAgICBpZiBzZWxlY3RlZElucHV0cy5sZW5ndGggPT0gMFxuICAgICAgICBcbiAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBcIltOb25lIHNlbGVjdGVkXVwiXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgYXNzaWdubWVudHM6IHNlbGVjdGVkSW5wdXRzXG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdsaW5rJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuXG4gIFxuICAgICAgXG4gICAgXG4gICAgICBcblxuICAgIFxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgQmFzZSBWaWV3IENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxucmVxdWlyZSgnLi4vLi4vaGVscGVycy9WaWV3SGVscGVyJylcblxuY2xhc3MgVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgdGVtcGxhdGU6IC0+XG4gICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBJTkhFUklURUQgLyBPVkVSUklERVNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICByZW5kZXI6IC0+XG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIEVWRU5UIEhBTkRMRVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gVmlldyJdfQ==
