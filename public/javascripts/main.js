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



},{"./data/TimelineData":6,"./data/TimelineDataAlt":7,"./data/WizardConfig":8,"./data/WizardContent":9,"./routers/Router":16,"./views/HomeView":33,"./views/InputItemView":34,"./views/LoginView":35,"./views/OutputView":36,"./views/TimelineView":39}],6:[function(require,module,exports){
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
    multimedia: [
      {
        id: "image_stuff",
        title: 'Image related step',
        formTitle: 'Choose one:',
        infoTitle: 'Image stuff',
        instructions: "To get started, you'll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community.",
        inputs: [],
        sections: []
      }
    ],
    researchwrite: [
      {
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
      }
    ]
  },
  outro_steps: [
    {
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
  image_stuff: {
    want_image: {
      type: 'checkbox',
      id: 'want_image',
      selected: true,
      label: 'You Want Image?',
      disabled: false,
      exclusive: false,
      required: true
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
  grading: {
    complete_training: {
      type: 'percent',
      label: 'Completion of Wikipedia training',
      id: 'complete_training',
      value: 5,
      renderInOutput: true,
      contingentUpon: ['training_graded']
    },
    getting_started: {
      type: 'percent',
      label: 'Early Wikipedia exercises',
      id: 'getting_started',
      value: 15,
      renderInOutput: true,
      contingentUpon: []
    },
    outline_quality: {
      type: 'percent',
      id: 'outline_quality',
      label: 'Quality of bibliography and outline',
      value: 10,
      renderInOutput: true,
      contingentUpon: []
    },
    peer_reviews: {
      type: 'percent',
      label: 'Peer reviews and collaboration with classmates',
      value: 10,
      renderInOutput: true,
      contingentUpon: []
    },
    contribution_quality: {
      type: 'percent',
      id: 'contribution_quality',
      label: 'Quality of your main Wikipedia contributions',
      value: 50,
      renderInOutput: true,
      contingentUpon: []
    },
    supplementary_assignments: {
      type: 'percent',
      id: 'supplementary_assignments',
      label: 'Supplementary assignments',
      value: 10,
      renderInOutput: true,
      contingentUpon: ['class_blog', 'class_presentation', 'reflective_essay', 'portfolio', 'original_paper']
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
  buffer += "\n  </div>\n   <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n\n    <div class=\"no-edit-mode\">\n      <a class=\"button button--blue inactive\" id=\"beginButton\" href=\"\">\n        Start designing my assignment\n      </a>\n    </div>\n\n    <div class=\"edit-mode-only\">\n      <a class=\"button button--blue exit-edit\" href=\"#\">\n        Back\n      </a>\n    </div>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
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
  buffer += "\n<div class=\"custom-input custom-input--percent\">\n  <div class=\"custom-input--percent__inner\">\n    <label for=\""
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
    + "\" maxlength=\"2\" />\n    </div>\n  </div>\n</div>\n";
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
},{"handleify":4}],27:[function(require,module,exports){
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
},{"handleify":4}],28:[function(require,module,exports){
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
},{"handleify":4}],29:[function(require,module,exports){
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
},{"handleify":4}],30:[function(require,module,exports){
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
},{"handleify":4}],31:[function(require,module,exports){
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiDatesModule.hbs":25}],32:[function(require,module,exports){
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiGradingModule.hbs":26,"../views/supers/View":41}],33:[function(require,module,exports){
var HomeTemplate, HomeView, OutputTemplate, StepModel, StepNavView, StepView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

HomeTemplate = require('../templates/HomeTemplate.hbs');

OutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

StepView = require('../views/StepView');

StepModel = require('../models/StepModel');

StepNavView = require('../views/StepNavView');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = HomeView = (function(_super) {
  __extends(HomeView, _super);

  function HomeView() {
    return HomeView.__super__.constructor.apply(this, arguments);
  }

  HomeView.prototype.className = 'home-view';

  HomeView.prototype.template = HomeTemplate;

  HomeView.prototype.initialize = function() {
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
    this.StepNav = new StepNavView();
    this.$stepsContainer = this.$el.find('.steps');
    this.$innerContainer = this.$el.find('.content');
    this.stepViews = this._createStepViews();
    this.StepNav.stepViews = this.stepViews;
    this.StepNav.totalSteps = this.stepViews.length;
    this.$innerContainer.append(this.StepNav.el);
    if (this.stepViews.length > 0) {
      this.showCurrentStep();
    }
    return this;
  };

  HomeView.prototype._createStepViews = function() {
    var introSteps, outroSteps, pathways, stepNumber, _views;
    _views = [];
    introSteps = application.WizardConfig.intro_steps;
    pathways = application.WizardConfig.pathways;
    outroSteps = application.WizardConfig.outro_steps;
    stepNumber = 0;
    _.each(introSteps, (function(_this) {
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
        if (stepNumber === 0) {
          newview.isFirstStep = true;
        }
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
        _views.push(newview);
        return stepNumber++;
      };
    })(this));
    _.each(pathways.multimedia, (function(_this) {
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
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
        _views.push(newview);
        return stepNumber++;
      };
    })(this));
    _.each(pathways.researchwrite, (function(_this) {
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
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
        _views.push(newview);
        return stepNumber++;
      };
    })(this));
    _.each(outroSteps, (function(_this) {
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
        if (index === outroSteps.length - 1) {
          newview.isLastStep = true;
        }
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
        _views.push(newview);
        return stepNumber++;
      };
    })(this));
    return _views;
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
    $('body').addClass('edit-mode');
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



},{"../app":5,"../data/WizardStepInputs":11,"../models/StepModel":14,"../templates/HomeTemplate.hbs":17,"../templates/steps/output/WikiOutputTemplate.hbs":30,"../views/StepNavView":37,"../views/StepView":38,"../views/supers/View":41}],34:[function(require,module,exports){
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



},{"../views/supers/InputView":40}],35:[function(require,module,exports){
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



},{"../app":5,"../data/WizardContent":9,"../templates/LoginTemplate.hbs":18,"../views/supers/View":41}],36:[function(require,module,exports){
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/output/CourseDetailsTemplate.hbs":27,"../templates/steps/output/CourseOptionsTemplate.hbs":28,"../templates/steps/output/GradingTemplate.hbs":29,"../templates/steps/output/WikiOutputTemplate.hbs":30,"../views/supers/View":41}],37:[function(require,module,exports){
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
    return this.currentStep === this.totalSteps - 1;
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
      } else {
        itIs = true;
      }
    }
    return itIs;
  };

  return StepNavView;

})(View);



},{"../app":5,"../templates/StepNavTemplate.hbs":19,"../views/supers/View":41}],38:[function(require,module,exports){
var CourseInfoData, CourseTipTemplate, DateInputView, GradingInputView, InputItemView, InputTipTemplate, IntroStepTemplate, StepTemplate, StepView, View, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

InputItemView = require('../views/InputItemView');

DateInputView = require('../views/DateInputView');

GradingInputView = require('../views/GradingInputView');

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
    this.inputSection = this.$el.find('.step-form-inner');
    this.$tipSection = this.$el.find('.step-info-tips');
    this.inputData = WizardStepInputs[this.model.attributes.id] || [];
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
    this.$inputContainers = this.$el.find('.custom-input');
    if (this.model.attributes.id === 'grading') {
      this.gradingView = new GradingInputView();
      this.gradingView.parentStepView = this;
      this.$el.find('.step-form-content').append(this.gradingView.getInputValues().render().el);
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
    if (this.isLastStep) {
      this.render().$el.show();
    } else if (this.model.attributes.id === 'grading') {
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

  StepView.prototype.updateUserAnswer = function(id, value, type) {
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

  StepView.prototype.updateAnswer = function(id, value) {
    var allOthersDisengaged, hasExclusiveSibling, inputType, isExclusive, out;
    inputType = WizardStepInputs[this.model.id][id].type;
    isExclusive = false || WizardStepInputs[this.model.id][id].exclusive;
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
        WizardStepInputs[this.model.id][id].selected = true;
        if (hasExclusiveSibling && !isExclusive) {
          this.$el.find('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable');
        } else if (isExclusive) {
          this.$el.find('.custom-input--checkbox').not('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable');
        }
      } else {
        WizardStepInputs[this.model.id][id].selected = false;
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
      }
    } else if (inputType === 'text' || inputType === 'percent') {
      WizardStepInputs[this.model.id][id].value = value;
    }
    return this;
  };

  StepView.prototype.hideTips = function(e) {
    $('.step-info-tip').removeClass('visible');
    $('.custom-input-wrapper').removeClass('selected');
    return $('body').removeClass('tip-open');
  };

  return StepView;

})(View);



},{"../app":5,"../data/WizardCourseInfo":10,"../data/WizardStepInputs":11,"../templates/steps/IntroStepTemplate.hbs":20,"../templates/steps/StepTemplate.hbs":21,"../templates/steps/info/CourseTipTemplate.hbs":22,"../templates/steps/info/InputTipTemplate.hbs":23,"../templates/steps/modules/WikiDatesModule.hbs":25,"../views/DateInputView":31,"../views/GradingInputView":32,"../views/InputItemView":34,"../views/supers/View":41}],39:[function(require,module,exports){
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
    this.$outContainer = $('.output-container');
    this.$previewContainer = $('.preview-container');
    this.courseLength = $('#cLength').val();
    this.courseDiff = 0;
    this.data = application.timelineDataAlt;
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
            return $(item).append("<div class='dow-date dow-date--" + selectedIndex + "' ><span contenteditable>" + _this.dowNames[selectedIndex] + " | </span><span contenteditable>" + (_this.getFormattedDateString(new Date(theDate))) + "</span></div><br/>");
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
    return this.updateWeeklyDates();
  };

  TimelineView.prototype.renderPreview = function() {
    this.$previewContainer.html('');
    return _.each(this.out, (function(_this) {
      return function(item, index) {
        var assignmentsOut, datesOut, inClassOut, isLastWeek, milestonesOut, nextWeek, thisWeek, titles;
        thisWeek = index + 1;
        nextWeek = index + 2;
        isLastWeek = index === _this.out.length - 1;
        if (item.title.length > 0) {
          titles = "<div>";
          titles += "<h4 data-week='" + thisWeek + "'>Week " + thisWeek + "<span class='date date-" + thisWeek + "' data-week='" + thisWeek + "'></span></h4>";
          _.each(item.title, function(t, i) {
            if (i === 0) {
              return titles += "<h2>" + t + "</h2>";
            } else {
              return titles += "<h3>" + t + "</h3>";
            }
          });
          titles += "</div><br/>";
          _this.$previewContainer.append(titles);
        }
        datesOut = "<div class='dates-preview dates-preview-" + thisWeek + "' data-week='" + thisWeek + "'></div>";
        _this.$previewContainer.append(datesOut);
        if (item.in_class.length > 0) {
          inClassOut = '<div>';
          inClassOut += "<h5 style='font-weight: bold;'>In class</h5>";
          inClassOut += '<ul>';
          _.each(item.in_class, function(c) {
            return inClassOut += "<li>" + c + "</li>";
          });
          inClassOut += "</ul>";
          inClassOut += "</div><br/>";
          _this.$previewContainer.append(inClassOut);
        }
        if (item.assignments.length > 0) {
          assignmentsOut = "<div>";
          assignmentsOut += "<h5 style='font-weight: bold;'>Assignments | due week " + nextWeek + "</h5>";
          assignmentsOut += '<ul>';
          _.each(item.assignments, function(assign) {
            return assignmentsOut += "<li>" + assign + "</li>";
          });
          assignmentsOut += '</ul>';
          assignmentsOut += '</div><br/>';
          _this.$previewContainer.append(assignmentsOut);
        }
        if (item.milestones.length > 0) {
          milestonesOut = "<div>";
          milestonesOut += "<h5 style='font-weight: bold;'>Milestones</h5>";
          milestonesOut += "<ul>";
          _.each(item.milestones, function(milestone) {
            return milestonesOut += "<li>" + milestone.title + "</li>";
          });
          milestonesOut += "</ul>";
          milestonesOut += "</div><br/>";
          _this.$previewContainer.append(milestonesOut);
        }
        if (isLastWeek) {
          _this.$previewContainer.append("<h1>End of Course</h1>");
        }
        return _this.$previewContainer.append("<br/>");
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



},{"../app":5,"../views/supers/View":41}],40:[function(require,module,exports){
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
    var $target, index, inputId, parentId, value;
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
      this.parentStep.updateAnswer(inputId, value);
      if (this.inputType === 'percent') {
        if (isNaN(parseInt(value))) {
          $(e.currentTarget).val('');
          return;
        } else {
          Backbone.Mediator.publish('grade:change', inputId, value);
        }
      }
    }
    return this.parentStep.updateUserAnswer(inputId, value, this.inputType);
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
      if (this.parentStep.model.attributes.id === 'grading') {
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



},{"../../app":5,"../../data/WizardStepInputs":11,"../../templates/steps/inputs/InputItemTemplate.hbs":24,"./View":41}],41:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9UaW1lbGluZURhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1RpbWVsaW5lRGF0YUFsdC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ29uZmlnLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb3Vyc2VJbmZvLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRTdGVwSW5wdXRzLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvbWFpbi5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9TdGVwTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvcm91dGVycy9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvSG9tZVRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2luZm8vSW5wdXRUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpR3JhZGluZ01vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvRGF0ZUlucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0lucHV0SXRlbVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvU3RlcE5hdlZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1RpbWVsaW5lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvVmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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WixDQUFBOztBQUFBLGlCQTJCQSxNQUFBLEdBQVEsU0FBQSxHQUFBO0FBQ04sSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVyxJQUFDLENBQUEsUUFBRCxDQUFXLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBWCxDQUFYLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FMTTtFQUFBLENBM0JSLENBQUE7O0FBQUEsaUJBcUNBLFdBQUEsR0FBYSxTQUFBLEdBQUEsQ0FyQ2IsQ0FBQTs7QUF1Q0E7QUFBQTs7O0tBdkNBOztBQTJDQTtBQUFBOzs7S0EzQ0E7O0FBK0NBO0FBQUE7OztLQS9DQTs7Y0FBQTs7R0FGaUIsUUFBUSxDQUFDLEtBRjVCLENBQUE7O0FBQUEsTUF1RE0sQ0FBQyxPQUFQLEdBQWlCLElBdkRqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qanNoaW50IGVxbnVsbDogdHJ1ZSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcblxudmFyIEhhbmRsZWJhcnMgPSB7fTtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WRVJTSU9OID0gXCIxLjAuMFwiO1xuSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5cbkhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5cbkhhbmRsZWJhcnMuaGVscGVycyAgPSB7fTtcbkhhbmRsZWJhcnMucGFydGlhbHMgPSB7fTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBmdW5jdGlvblR5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG5cbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMpO1xuICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMuSyA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuY3JlYXRlRnJhbWUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uKG9iamVjdCkge1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gb2JqZWN0O1xuICB2YXIgb2JqID0gbmV3IEhhbmRsZWJhcnMuSygpO1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gbnVsbDtcbiAgcmV0dXJuIG9iajtcbn07XG5cbkhhbmRsZWJhcnMubG9nZ2VyID0ge1xuICBERUJVRzogMCwgSU5GTzogMSwgV0FSTjogMiwgRVJST1I6IDMsIGxldmVsOiAzLFxuXG4gIG1ldGhvZE1hcDogezA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InfSxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAoSGFuZGxlYmFycy5sb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBIYW5kbGViYXJzLmxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMubG9nID0gZnVuY3Rpb24obGV2ZWwsIG9iaikgeyBIYW5kbGViYXJzLmxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGRhdGEgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gIH1cblxuICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgIGlmKGNvbnRleHQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gMCl7XG4gICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29uZGl0aW9uYWwpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoIWNvbmRpdGlvbmFsIHx8IEhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbn0pO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAoIUhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gIEhhbmRsZWJhcnMubG9nKGxldmVsLCBjb250ZXh0KTtcbn0pO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVk0gPSB7XG4gIHRlbXBsYXRlOiBmdW5jdGlvbih0ZW1wbGF0ZVNwZWMpIHtcbiAgICAvLyBKdXN0IGFkZCB3YXRlclxuICAgIHZhciBjb250YWluZXIgPSB7XG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBIYW5kbGViYXJzLlZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcbiAgICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICAgIHJldCA9IHt9O1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcbiAgICAgIHByb2dyYW1XaXRoRGVwdGg6IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICAgIG5vb3A6IEhhbmRsZWJhcnMuVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoY29udGFpbmVyLCBIYW5kbGViYXJzLCBjb250ZXh0LCBvcHRpb25zLmhlbHBlcnMsIG9wdGlvbnMucGFydGlhbHMsIG9wdGlvbnMuZGF0YSk7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdLFxuICAgICAgICAgIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBIYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICBwcm9ncmFtV2l0aERlcHRoOiBmdW5jdGlvbihpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSAwO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBub29wOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiXCI7IH0sXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gICAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICghSGFuZGxlYmFycy5jb21waWxlKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShwYXJ0aWFsLCB7ZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkfSk7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLnRlbXBsYXRlID0gSGFuZGxlYmFycy5WTS50ZW1wbGF0ZTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuSGFuZGxlYmFycy5FeGNlcHRpb24gPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cbn07XG5IYW5kbGViYXJzLkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbkhhbmRsZWJhcnMuU2FmZVN0cmluZyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn07XG5IYW5kbGViYXJzLlNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0cmluZy50b1N0cmluZygpO1xufTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbnZhciBlc2NhcGVDaGFyID0gZnVuY3Rpb24oY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59O1xuXG5IYW5kbGViYXJzLlV0aWxzID0ge1xuICBleHRlbmQ6IGZ1bmN0aW9uKG9iaiwgdmFsdWUpIHtcbiAgICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVzY2FwZUV4cHJlc3Npb246IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgSGFuZGxlYmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCB8fCBzdHJpbmcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSBzdHJpbmcudG9TdHJpbmcoKTtcblxuICAgIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG4gIH0sXG5cbiAgaXNFbXB0eTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYodG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcnJheV1cIiAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzJykuY3JlYXRlKClcbnJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMnKS5hdHRhY2goZXhwb3J0cylcbnJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcycpLmF0dGFjaChleHBvcnRzKSIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIERFU0lHTiBXSVpBUkRcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5cbkFwcGxpY2F0aW9uID0gXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgICMgQXBwIERhdGFcbiAgICBBcHBEYXRhID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbnRlbnQnKVxuICAgIFRpbWVsaW5lRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGEnKVxuXG4gICAgVGltZWxpbmVEYXRhQWx0ID0gcmVxdWlyZSgnLi9kYXRhL1RpbWVsaW5lRGF0YUFsdCcpXG5cbiAgICBAV2l6YXJkQ29uZmlnID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbmZpZycpXG5cbiAgICBAZGF0YSA9IEFwcERhdGFcbiAgICBAdGltZWxpbmVEYXRhID0gVGltZWxpbmVEYXRhXG4gICAgQHRpbWVsaW5lRGF0YUFsdCA9IFRpbWVsaW5lRGF0YUFsdFxuXG5cbiAgICAjIEltcG9ydCB2aWV3c1xuICAgIEhvbWVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Ib21lVmlldycpXG5cbiAgICBMb2dpblZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0xvZ2luVmlldycpXG5cbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuXG4gICAgSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbiAgICBPdXRwdXRWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9PdXRwdXRWaWV3JylcblxuICAgIFRpbWVsaW5lVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvVGltZWxpbmVWaWV3JylcblxuXG4gICAgIyBJbml0aWFsaXplIHZpZXdzXG4gICAgQGhvbWVWaWV3ID0gbmV3IEhvbWVWaWV3KClcblxuICAgIEBsb2dpblZpZXcgPSBuZXcgTG9naW5WaWV3KClcblxuICAgIEBpbnB1dEl0ZW1WaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoKVxuXG4gICAgQG91dHB1dFZpZXcgPSBuZXcgT3V0cHV0VmlldygpXG5cbiAgICBAdGltZWxpbmVWaWV3ID0gbmV3IFRpbWVsaW5lVmlldygpXG5cbiAgICBAcm91dGVyID0gbmV3IFJvdXRlcigpXG5cbiAgICBcbiAgICBcbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb24iLCJUaW1lbGluZURhdGEgPSBbXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIHRpdGxlOiBbJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbnRybyB0byBXaWtpcGVkaWF9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDVcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0VkaXRpbmcgYmFzaWNzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FZGl0aW5nIGJhc2ljcyBpbiBjbGFzc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSB0aGUgdHJhaW5pbmd9fScgI1RcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwfX0nICNUXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByYWN0aWNlIGNvbW11bmljYXRpbmd9fScgI1RcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBlbnJvbGxlZH19J1xuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDhcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0V4cGxvcmluZyB0aGUgdG9waWMgYXJlYSddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYW4gYXJ0aWNsZX19JyAjIEZXIGdldHRpbmdfc3RhcnRlZC5jcml0aXF1ZV9hcnRpY2xlLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fScgIyBGVzIgZ2V0dGluZ19zdGFydGVkLmNvcHlfZWRpdF9hcnRpY2xlLnNlbGVjdGVkXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydVc2luZyBzb3VyY2VzIGFuZCBjaG9vc2luZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvVXNpbmcgc291cmNlcyBpbiBjbGFzc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BZGQgdG8gYW4gYXJ0aWNsZX19JyAjIEZXMyBnZXR0aW5nX3N0YXJ0ZWQuYWRkX3RvX2FydGljbGUuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSWxsdXN0cmF0ZSBhbiBhcnRpY2xlfX0nICMgRlc0IGdldHRpbmdfc3RhcnRlZC5pbGx1c3RyYXRlX2FydGljbGUuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXMnICMgUEEgY2hvb3NpbmdfYXJ0aWNsZXMuc3R1ZGVudHNfZXhwbG9yZS5zZWxlY3RlZFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3R9fScgIyBQQSBjaG9vc2luZ19hcnRpY2xlcy5wcmVwYXJlX2xpc3Quc2VsZWN0ZWR9XG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IFdlZWsgNX19J1xuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TZWxlY3QgYXJ0aWNsZSBmcm9tIHN0dWRlbnQgY2hvaWNlc319JyAjQ0EgY2hvb3NpbmdfYXJ0aWNsZXMuc3R1ZGVudHNfZXhwbG9yZS5zZWxlY3RlZFxuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21waWxlIGEgYmlibGlvZ3JhcGh5fX0nICNQQlxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogN1xuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBldGlxdWV0dGUgYW5kIHNhbmRib3hlc319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB9fScgIyBQTyByZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBkcmFmdHNfbWFpbnNwYWNlLnNhbmRib3guc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfCBzYW5kYm94ID0gbm8gfX0nICMgUE8gcmVzZWFyY2hfcGxhbm5pbmcuY3JlYXRlX291dGxpbmUuc2VsZWN0ZWQgJiYgZHJhZnRzX21haW5zcGFjZS53b3JrX2xpdmUuc2VsZWN0ZWRcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3V0bGluZSBhcyBsZWFkIHNlY3Rpb24gfX0nICNQTyByZXNlYXJjaF9wbGFubmluZy53cml0ZV9sZWFkLnNlbGVjdGVkXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmd9fSdcbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydNb3ZpbmcgYXJ0aWNsZXMgdG8gdGhlIG1haW4gc3BhY2UnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01haW4gc3BhY2UgaW4gY2xhc3N9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTW92ZSB0byBtYWluIHNwYWNlfX0nICNNTVNcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX0nICNkeWsuZHlrLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGFuZCB5b3VyIGFydGljbGV9fScgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydCdWlsZGluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQnVpbGRpbmcgYXJ0aWNsZXMgaW4gY2xhc3N9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlfX0nICNDUFIgaWYgcGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9ucy4wLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fSB9fScgIyBDUFIgZWxzZVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMlxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnQ3JlYXRpbmcgZmlyc3QgZHJhZnQnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX0nICMxRENcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDZcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0dldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gb25lIHBlZXIgcmV2aWV3fX0nICNQUjEgcGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9ucy4wLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSB7e3BlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLnZhbHVlfX0gfX0nICNlbHNlXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnUmVzcG9uZGluZyB0byBmZWVkYmFjayddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbn19J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NYWtlIGVkaXRzIGJhc2VkIG9uIHBlZXIgcmV2aWV3c319JyAjUkZCIFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19J1xuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDFcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHN9fSdcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzfX0nIFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogM1xuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ29taXQnXG4gICAgdGl0bGU6IFsnQ29udGludWluZyBpbXByb3ZpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50c319J1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXN9fScgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA0XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlc319JyBcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fScgI2lmXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA5XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydDbGFzcyBwcmVzZW50YXRpb25zIGFuZCBmaW5pc2hpbmcgdG91Y2hlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319JyAjc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5jbGFzc19wcmVzZW50YXRpb24uc2VsZWN0ZWRcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319JyAjRkFcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUmVmbGVjdGl2ZSBlc3NheX19JyAjc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5yZWZsZWN0aXZlX2Vzc2F5LnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dpa2lwZWRpYSBwb3J0Zm9saW99fScgI3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMucG9ydGZvbGlvLnNlbGVjdGVkXG4gICAgICAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyfX0nICNzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLm9yaWdpbmFsX3BhcGVyLnNlbGVjdGVkXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMTBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0R1ZSBkYXRlJyBdXG4gICAgaW5fY2xhc3M6IFtdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAgJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BbGwgc3R1ZGVudHMgZmluaXNoZWR9fSdcbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lbGluZURhdGFcblxuIiwiVGltZWxpbmVEYXRhQWx0ID0gW1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICB0aXRsZTogWydXaWtpcGVkaWEgZXNzZW50aWFscyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdJbnRybyB0byBXaWtpcGVkaWEnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA1XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydFZGl0aW5nIGJhc2ljcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdFZGl0aW5nIGJhc2ljcyBpbiBjbGFzcydcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdDb21wbGV0ZSB0aGUgdHJhaW5pbmcnICNUXG4gICAgICAnQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwJyAjVFxuICAgICAgJ1ByYWN0aWNlIGNvbW11bmljYXRpbmcnICNUXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdTdHVkZW50cyBlbnJvbGxlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA4XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydFeHBsb3JpbmcgdGhlIHRvcGljIGFyZWEnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnRWRpdGluZyBiYXNpY3MgaW4gY2xhc3MnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnRXZhbHVhdGUgYW4gYXJ0aWNsZScgIyBGVyBnZXR0aW5nX3N0YXJ0ZWQuY3JpdGlxdWVfYXJ0aWNsZS5zZWxlY3RlZFxuICAgICAgJ0NvcHllZGl0IGFuIGFydGljbGUnICMgRlcyIGdldHRpbmdfc3RhcnRlZC5jb3B5X2VkaXRfYXJ0aWNsZS5zZWxlY3RlZFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnVXNpbmcgc291cmNlcyBpbiBjbGFzcydcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdBZGQgdG8gYW4gYXJ0aWNsZScgIyBGVzMgZ2V0dGluZ19zdGFydGVkLmFkZF90b19hcnRpY2xlLnNlbGVjdGVkXG4gICAgICAnSWxsdXN0cmF0ZSBhbiBhcnRpY2xlJyAjIEZXNCBnZXR0aW5nX3N0YXJ0ZWQuaWxsdXN0cmF0ZV9hcnRpY2xlLnNlbGVjdGVkXG4gICAgICAnTGlzdCBhcnRpY2xlIGNob2ljZXMnICMgUEEgY2hvb3NpbmdfYXJ0aWNsZXMuc3R1ZGVudHNfZXhwbG9yZS5zZWxlY3RlZFxuICAgICAgJ0Nob29zZSBhcnRpY2xlcyBmcm9tIGEgbGlzdCcgIyBQQSBjaG9vc2luZ19hcnRpY2xlcy5wcmVwYXJlX2xpc3Quc2VsZWN0ZWR9XG4gICAgICAnRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gbmV4dCB3ZWVrJ1xuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0Rpc2N1c3MgdG9waWNzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzJyAjQ0EgY2hvb3NpbmdfYXJ0aWNsZXMuc3R1ZGVudHNfZXhwbG9yZS5zZWxlY3RlZFxuICAgICAgJ0NvbXBpbGUgYSBiaWJsaW9ncmFwaHknICNQQlxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogN1xuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdEaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0NvbnZlbnRpb25hbCBvdXRsaW5lICcgIyBQTyByZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBkcmFmdHNfbWFpbnNwYWNlLnNhbmRib3guc2VsZWN0ZWRcbiAgICAgICdDb252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyAnICMgUE8gcmVzZWFyY2hfcGxhbm5pbmcuY3JlYXRlX291dGxpbmUuc2VsZWN0ZWQgJiYgZHJhZnRzX21haW5zcGFjZS53b3JrX2xpdmUuc2VsZWN0ZWRcbiAgICAgICdPdXRsaW5lIGFzIGxlYWQgc2VjdGlvbicgI1BPIHJlc2VhcmNoX3BsYW5uaW5nLndyaXRlX2xlYWQuc2VsZWN0ZWRcbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnbWlsZXN0b25lJ1xuICAgICAgICB0aXRsZTogJ1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nJ1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ01vdmluZyBhcnRpY2xlcyB0byB0aGUgbWFpbiBzcGFjZSddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdNYWluIHNwYWNlIGluIGNsYXNzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ01vdmUgdG8gbWFpbiBzcGFjZScgI01NU1xuICAgICAgJ0RZSyBub21pbmF0aW9ucycgI2R5ay5keWsuc2VsZWN0ZWRcbiAgICAgICdFeHBhbmQgeW91ciBhcnRpY2xlJyBcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0J1aWxkaW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0Nob29zZSBvbmUgcGVlciByZXZpZXcgYXJ0aWNsZScgI0NQUiBpZiBwZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zLjAuc2VsZWN0ZWRcbiAgICAgICdDaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSB7e3BlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLnZhbHVlfX0gfX0nICMgQ1BSIGVsc2VcbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDJcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0NyZWF0aW5nIGZpcnN0IGRyYWZ0J11cbiAgICBpbl9jbGFzczogW1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0NvbXBsZXRlIGZpcnN0IGRyYWZ0JyAjMURDXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA2XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2snXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnR3JvdXAgc3VnZ2VzdGlvbnMnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnRG8gb25lIHBlZXIgcmV2aWV3JyAjUFIxIHBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnMuMC5zZWxlY3RlZFxuICAgICAgJ0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSB7e3BlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLnZhbHVlfX0nICNlbHNlXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnUmVzcG9uZGluZyB0byBmZWVkYmFjayddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdNZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9uJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzJyAjUkZCIFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkJ1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDFcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAgJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnIFxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogM1xuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ29taXQnXG4gICAgdGl0bGU6IFsnQ29udGludWluZyBpbXByb3ZpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICAnRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzJ1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAgJ0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlcycgXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA0XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdEaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHMnXG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICAnQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzJyBcbiAgICAgICdQcmVwYXJlIGluLWNsYXNzIHByZXNlbnRhdGlvbicgI2lmXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA5XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydDbGFzcyBwcmVzZW50YXRpb25zIGFuZCBmaW5pc2hpbmcgdG91Y2hlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgICdJbi1jbGFzcyBwcmVzZW50YXRpb25zJyAjc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5jbGFzc19wcmVzZW50YXRpb24uc2VsZWN0ZWRcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgICdGaW5hbCB0b3VjaGVzIHRvIGFydGljbGVzJyAjRkFcbiAgICAgICdSZWZsZWN0aXZlIGVzc2F5JyAjc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5yZWZsZWN0aXZlX2Vzc2F5LnNlbGVjdGVkXG4gICAgICAnV2lraXBlZGlhIHBvcnRmb2xpbycgI3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMucG9ydGZvbGlvLnNlbGVjdGVkXG4gICAgICAnT3JpZ2luYWwgYXJndW1lbnQgcGFwZXInICNzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLm9yaWdpbmFsX3BhcGVyLnNlbGVjdGVkXG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMTBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0R1ZSBkYXRlJyBdXG4gICAgaW5fY2xhc3M6IFtdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0FsbCBzdHVkZW50cyBmaW5pc2hlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lbGluZURhdGFBbHRcblxuIiwiV2l6YXJkQ29uZmlnID0ge1xuICBpbnRyb19zdGVwczogW1xuICAgIHtcbiAgICAgIGlkOiBcImludHJvXCJcbiAgICAgIHRpdGxlOiAnPGNlbnRlcj5XZWxjb21lIHRvIHRoZTxiciAvPkFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCE8L2NlbnRlcj4nXG4gICAgICBsb2dpbl9pbnN0cnVjdGlvbnM6ICdDbGljayBMb2dpbiB3aXRoIFdpa2lwZWRpYSB0byBnZXQgc3RhcnRlZCdcbiAgICAgIGluc3RydWN0aW9uczogJydcbiAgICAgIGlucHV0czogW11cbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+VGhpcyB0b29sIHdpbGwgaGVscCB5b3UgdG8gZWFzaWx5IGNyZWF0ZSBhIGN1c3RvbWl6ZWQgV2lraXBlZGlhIGNsYXNzcm9vbSBhc3NpZ25tZW50IGFuZCBjdXN0b21pemVkIHN5bGxhYnVzIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UnbGwgaGF2ZSBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiwgd2l0aCB3ZWVrbHkgYXNzaWdubWVudHMsIHB1Ymxpc2hlZCBkaXJlY3RseSBvbnRvIGEgc2FuZGJveCBwYWdlIG9uIFdpa2lwZWRpYSB3aGVyZSB5b3UgY2FuIGN1c3RvbWVpemUgaXQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+TGV04oCZcyBzdGFydCBieSBmaWxsaW5nIGluIHNvbWUgYmFzaWNzIGFib3V0IHlvdSBhbmQgeW91ciBjb3Vyc2U6PC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICAgIHtcbiAgICAgIGlkOiBcImFzc2lnbm1lbnRfc2VsZWN0aW9uXCJcbiAgICAgIHRpdGxlOiAnQXNzaWdubWVudCB0eXBlIHNlbGVjdGlvbidcbiAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGFzc2lnbm1lbnQgc2VsZWN0aW9ucydcbiAgICAgIGZvcm1UaXRsZTogJ0F2YWlsYWJsZSBhc3NpZ25tZW50czonXG4gICAgICBpbnN0cnVjdGlvbnM6IFwiWW91IGNhbiB0ZWFjaCB3aXRoIFdpa2lwZWRpYSBpbiBzZXZlcmFsIGRpZmZlcmVudCB3YXlzLCBhbmQgaXQncyBpbXBvcnRhbnQgdG8gZGVzaWduIGFuIGFzc2lnbm1lbnQgdGhhdCBpcyBzdWl0YWJsZSBmb3IgV2lraXBlZGlhIDxlbT5hbmQ8L2VtPiBhY2hpZXZlcyB5b3VyIHN0dWRlbnQgbGVhcm5pbmcgb2JqZWN0aXZlcy4gWW91ciBmaXJzdCBzdGVwIGlzIHRvIGNob29zZSB3aGljaCBhc3NpZ25tZW50KHMpIHlvdSdsbCBiZSBhc2tpbmcgeW91ciBzdHVkZW50cyB0byBjb21wbGV0ZSBhcyBwYXJ0IG9mIHRoZSBjb3Vyc2UuXCJcbiAgICAgIGlucHV0czogW11cbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPldlJ3ZlIGNyZWF0ZWQgc29tZSBndWlkZWxpbmVzIHRvIGhlbHAgeW91LCBidXQgeW91J2xsIG5lZWQgdG8gbWFrZSBzb21lIGtleSBkZWNpc2lvbnMsIHN1Y2ggYXM6IHdoaWNoIGxlYXJuaW5nIG9iamVjdGl2ZXMgYXJlIHlvdSB0YXJnZXRpbmcgd2l0aCB0aGlzIGFzc2lnbm1lbnQ/IFdoYXQgc2tpbGxzIGRvIHlvdXIgc3R1ZGVudHMgYWxyZWFkeSBoYXZlPyBIb3cgbXVjaCB0aW1lIGNhbiB5b3UgZGV2b3RlIHRvIHRoZSBhc3NpZ25tZW50PzwvcD5cIlxuICAgICAgICAgICAgXCI8cD5Nb3N0IGluc3RydWN0b3JzIGFzayB0aGVpciBzdHVkZW50cyB0byB3cml0ZSBvciBleHBhbmQgYW4gYXJ0aWNsZS4gU3R1ZGVudHMgc3RhcnQgYnkgbGVhcm5pbmcgdGhlIGJhc2ljcyBvZiBXaWtpcGVkaWEsIGFuZCB0aGVuIGZvY3VzIG9uIHRoZSBjb250ZW50LiBUaGV5IHBsYW4sIHJlc2VhcmNoLCBhbmQgd3JpdGUgYSBwcmV2aW91c2x5IG1pc3NpbmcgV2lraXBlZGlhIGFydGljbGUsIG9yIGNvbnRyaWJ1dGUgdG8gYW4gaW5jb21wbGV0ZSBlbnRyeSBvbiBhIGNvdXJzZS1yZWxhdGVkIHRvcGljLiBUaGlzIGFzc2lnbm1lbnQgdHlwaWNhbGx5IHJlcGxhY2VzIGEgdGVybSBwYXBlciBvciByZXNlYXJjaCBwcm9qZWN0LCBvciBpdCBmb3JtcyB0aGUgbGl0ZXJhdHVyZSByZXZpZXcgc2VjdGlvbiBvZiBhIGxhcmdlciBwYXBlci4gVGhlIHN0dWRlbnQgbGVhcm5pbmcgb3V0Y29tZSBpcyBoaWdoIHdpdGggdGhpcyBhc3NpZ25tZW50LCBidXQgaXQgZG9lcyB0YWtlIGEgc2lnbmlmaWNhbnQgYW1vdW50IG9mIHRpbWUuIFlvdXIgc3R1ZGVudHMgbmVlZCB0byBsZWFybiBib3RoIHRoZSB3aWtpIG1hcmt1cCBsYW5ndWFnZSBhbmQga2V5IHBvbGljaWVzIGFuZCBleHBlY3RhdGlvbnMgb2YgdGhlIFdpa2lwZWRpYS1lZGl0aW5nIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgIFwiPHA+SWYgd3JpdGluZyBhbiBhcnRpY2xlIGlzbid0IHJpZ2h0IGZvciB5b3VyIGNsYXNzLCBvdGhlciBhc3NpZ25tZW50IG9wdGlvbnMgb2ZmZXIgc3R1ZGVudHMgdmFsdWFibGUgbGVhcm5pbmcgb3Bwb3J0dW5pdGllcyBhbmQgaGVscCB0byBpbXByb3ZlIFdpa2lwZWRpYS4gU2VsZWN0IGFuIGFzc2lnbm1lbnQgdHlwZSBvbiB0aGUgbGVmdCB0byBsZWFybiBtb3JlLjwvcD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgXVxuICBwYXRod2F5czoge1xuICAgIG11bHRpbWVkaWE6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiaW1hZ2Vfc3R1ZmZcIlxuICAgICAgICB0aXRsZTogJ0ltYWdlIHJlbGF0ZWQgc3RlcCdcbiAgICAgICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAgIGluZm9UaXRsZTogJ0ltYWdlIHN0dWZmJ1xuICAgICAgICBpbnN0cnVjdGlvbnM6IFwiVG8gZ2V0IHN0YXJ0ZWQsIHlvdSdsbCB3YW50IHRvIGludHJvZHVjZSB5b3VyIHN0dWRlbnRzIHRvIHRoZSBiYXNpYyBydWxlcyBvZiB3cml0aW5nIFdpa2lwZWRpYSBhcnRpY2xlcyBhbmQgd29ya2luZyB3aXRoIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5LlwiXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICByZXNlYXJjaHdyaXRlOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcImxlYXJuaW5nX2Vzc2VudGlhbHNcIlxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuXCJcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIHVzZXIgYWNjb3VudHMgYW5kIHRoZW4gY29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5TdHVkZW50cyB3aG8gY29tcGxldGUgdGhpcyB0cmFpbmluZyBhcmUgYmV0dGVyIHByZXBhcmVkIHRvIGZvY3VzIG9uIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgc3BlbmQgbGVzcyB0aW1lIGRpc3RyYWN0ZWQgYnkgY2xlYW5pbmcgdXAgYWZ0ZXIgZXJyb3JzLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5XaWxsIGNvbXBsZXRpb24gb2YgdGhlIHN0dWRlbnQgdHJhaW5pbmcgYmUgcGFydCBvZiB5b3VyIHN0dWRlbnRzXFwnIGdyYWRlcz8gKE1ha2UgeW91ciBjaG9pY2UgYXQgdGhlIHRvcCBsZWZ0Lik8L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lcydcbiAgICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Db21wbGV0ZSB0aGUgPGVtPm9ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHM8L2VtPi4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgICAgICB0aXRsZTogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGVhcmx5IGVkaXRpbmcgdGFza3MnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIGVhcmx5IG9uLiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgICAgICBmb3JtVGl0bGU6ICdXaGljaCBiYXNpYyBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlPydcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+V2hpY2ggaW50cm9kdWN0b3J5IGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSB0byBhY2NsaW1hdGUgeW91ciBzdHVkZW50cyB0byBXaWtpcGVkaWE/IFlvdSBjYW4gc2VsZWN0IG5vbmUsIG9uZSwgb3IgbW9yZS4gV2hpY2hldmVyIHlvdSBzZWxlY3Qgd2lsbCBiZSBhZGRlZCB0byB0aGUgYXNzaWdubWVudCB0aW1lbGluZS48L3A+J1xuICAgICAgICAgICAgICAnPHVsPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+QWRkIHRvIGFuIGFydGljbGUuPC9zdHJvbmc+IFVzaW5nIGNvdXJzZSByZWFkaW5ncyBvciBvdGhlciByZWxldmFudCBzZWNvbmRhcnkgc291cmNlcywgYWRkIDHigJMyIHNlbnRlbmNlcyBvZiBuZXcgaW5mb3JtYXRpb24gdG8gYSBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcy4gQmUgc3VyZSB0byBpbnRlZ3JhdGUgaXQgd2VsbCBpbnRvIHRoZSBleGlzdGluZyBhcnRpY2xlLCBhbmQgaW5jbHVkZSBhIGNpdGF0aW9uIHRvIHRoZSBzb3VyY2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q29weWVkaXQgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQnJvd3NlIFdpa2lwZWRpYSB1bnRpbCB5b3UgZmluZCBhbiBhcnRpY2xlIHRoYXQgeW91IHdvdWxkIGxpa2UgdG8gaW1wcm92ZSwgYW5kIG1ha2Ugc29tZSBlZGl0cyB0byBpbXByb3ZlIHRoZSBsYW5ndWFnZSBvciBmb3JtYXR0aW5nLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgdXBsb2FkaW5nIGFuZCBhZGRpbmcgYSBwaG90byB5b3UgdG9vay48L2xpPlxuICAgICAgICAgICAgICA8L3VsPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+Rm9yIG1vc3QgY291cnNlcywgdGhlIDxlbT5Dcml0aXF1ZSBhbiBhcnRpY2xlPC9lbT4gYW5kIDxlbT5BZGQgdG8gYW4gYXJ0aWNsZTwvZW0+IGV4ZXJjaXNlcyBwcm92aWRlIGEgbmljZSBmb3VuZGF0aW9uIGZvciB0aGUgbWFpbiB3cml0aW5nIHByb2plY3QuIFRoZXNlIGhhdmUgYmVlbiBzZWxlY3RlZCBieSBkZWZhdWx0LjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgIHRpdGxlOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIGZvcm1UaXRsZTogJ0hvdyB3aWxsIHlvdXIgY2xhc3Mgc2VsZWN0IGFydGljbGVzPydcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkNob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlNvbWUgYXJ0aWNsZXMgbWF5IGluaXRpYWxseSBsb29rIGVhc3kgdG8gaW1wcm92ZSwgYnV0IHF1YWxpdHkgcmVmZXJlbmNlcyB0byBleHBhbmQgdGhlbSBtYXkgYmUgZGlmZmljdWx0IHRvIGZpbmQuIEZpbmRpbmcgdG9waWNzIHdpdGggdGhlIHJpZ2h0IGJhbGFuY2UgYmV0d2VlbiBwb29yIFdpa2lwZWRpYSBjb3ZlcmFnZSBhbmQgYXZhaWxhYmxlIGxpdGVyYXR1cmUgZnJvbSB3aGljaCB0byBleHBhbmQgdGhhdCBjb3ZlcmFnZSBjYW4gYmUgdHJpY2t5LiBIZXJlIGFyZSBzb21lIGd1aWRlbGluZXMgdG8ga2VlcCBpbiBtaW5kIHdoZW4gc2VsZWN0aW5nIGFydGljbGVzIGZvciBpbXByb3ZlbWVudC48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0dvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5HcmF2aXRhdGUgdG93YXJkIFxcXCJzdHViXFxcIiBhbmQgXFxcInN0YXJ0XFxcIiBjbGFzcyBhcnRpY2xlcy4gVGhlc2UgYXJ0aWNsZXMgb2Z0ZW4gaGF2ZSBvbmx5IDHigJMyIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gUmVsZXZhbnQgV2lraVByb2plY3QgcGFnZXMgY2FuIHByb3ZpZGUgYSBsaXN0IG9mIHN0dWJzIHRoYXQgbmVlZCBpbXByb3ZlbWVudC48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdOb3Qgc3VjaCBhIGdvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5BcnRpY2xlcyB0aGF0IGFyZSBcIm5vdCBzdWNoIGEgZ29vZCBjaG9pY2VcIiBmb3IgbmV3Y29tZXJzIHVzdWFsbHkgaW52b2x2ZSBhIGxhY2sgb2YgYXBwcm9wcmlhdGUgcmVzZWFyY2ggbWF0ZXJpYWwsIGhpZ2hseSBjb250cm92ZXJzaWFsIHRvcGljcyB0aGF0IG1heSBhbHJlYWR5IGJlIHdlbGwgZGV2ZWxvcGVkLCBicm9hZCBzdWJqZWN0cywgb3IgdG9waWNzIGZvciB3aGljaCBpdCBpcyBkaWZmaWN1bHQgdG8gZGVtb25zdHJhdGUgbm90YWJpbGl0eS48L3A+J1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Zb3Ugc2hvdWxkIHByb2JhYmx5IGF2b2lkIHRyeWluZyB0byBpbXByb3ZlIGFydGljbGVzIG9uIHRvcGljcyB0aGF0IGFyZSBoaWdobHkgY29udHJvdmVyc2lhbCAoZm9yIGV4YW1wbGUsIEdsb2JhbCBXYXJtaW5nLCBBYm9ydGlvbiwgb3IgU2NpZW50b2xvZ3kpLiBZb3UgbWF5IGJlIG1vcmUgc3VjY2Vzc2Z1bCBzdGFydGluZyBhIHN1Yi1hcnRpY2xlIG9uIHRoZSB0b3BpYyBpbnN0ZWFkLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Eb24ndCBzdGFydCBhcnRpY2xlcyB3aXRoIHRpdGxlcyB0aGF0IGltcGx5IGFuIGFyZ3VtZW50IG9yIGVzc2F5LWxpa2UgYXBwcm9hY2ggKGUuZy4sIFRoZSBFZmZlY3RzIFRoYXQgVGhlIFJlY2VudCBTdWItUHJpbWUgTW9ydGdhZ2UgQ3Jpc2lzIGhhcyBoYWQgb24gdGhlIFVTIGFuZCBHbG9iYWwgRWNvbm9taWNzKS4gVGhlc2UgdHlwZSBvZiB0aXRsZXMsIGFuZCBtb3N0IGxpa2VseSB0aGUgY29udGVudCB0b28sIG1heSBub3QgYmUgYXBwcm9wcmlhdGUgZm9yIGFuIGVuY3ljbG9wZWRpYS48L2xpPlxuICAgICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlIGluc3RydWN0b3IsIHlvdSBzaG91bGQgYXBwbHkgeW91ciBvd24gZXhwZXJ0aXNlIHRvIGV4YW1pbmluZyBXaWtpcGVkaWHigJlzIGNvdmVyYWdlIG9mIHlvdXIgZmllbGQuIFlvdSB1bmRlcnN0YW5kIHRoZSBicm9hZGVyIGludGVsbGVjdHVhbCBjb250ZXh0IHdoZXJlIGluZGl2aWR1YWwgdG9waWNzIGZpdCBpbiwgeW91IGNhbiByZWNvZ25pemUgd2hlcmUgV2lraXBlZGlhIGZhbGxzIHNob3J0LCB5b3Uga25vd+KAlG9yIGtub3cgaG93IHRvIGZpbmTigJR0aGUgcmVsZXZhbnQgbGl0ZXJhdHVyZSwgYW5kIHlvdSBrbm93IHdoYXQgdG9waWNzIHlvdXIgc3R1ZGVudHMgc2hvdWxkIGJlIGFibGUgdG8gaGFuZGxlLiBZb3VyIGd1aWRhbmNlIG9uIGFydGljbGUgY2hvaWNlIGFuZCBzb3VyY2luZyBpcyBjcml0aWNhbCBmb3IgYm90aCB5b3VyIHN0dWRlbnRz4oCZIHN1Y2Nlc3MgYW5kIHRoZSBpbXByb3ZlbWVudCBvZiBXaWtpcGVkaWEuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlRoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gSGF2aW5nIHN0dWRlbnRzIGZpbmQgdGhlaXIgb3duIGFydGljbGVzIHByb3ZpZGVzIHRoZW0gd2l0aCBhIHNlbnNlIG9mIG1vdGl2YXRpb24gYW5kIG93bmVyc2hpcCBvdmVyIHRoZSBhc3NpZ25tZW50IGFuZCBleGVyY2lzZXMgdGhlaXIgY3JpdGljYWwgdGhpbmtpbmcgc2tpbGxzIGFzIHRoZXkgaWRlbnRpZnkgY29udGVudCBnYXBzLCBidXQgaXQgbWF5IGFsc28gbGVhZCB0byBjaG9pY2VzIHRoYXQgYXJlIGZ1cnRoZXIgYWZpZWxkIGZyb20gY291cnNlIG1hdGVyaWFsLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJyZXNlYXJjaF9wbGFubmluZ1wiXG4gICAgICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgICBmb3JtVGl0bGU6ICdIb3cgc2hvdWxkIHN0dWRlbnRzIHBsYW4gdGhlaXIgYXJ0aWNsZXM/J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGFibGUgZm9yIFdpa2lwZWRpYS4gVGhhdCdzIHdoeSB3ZSByZWNvbW1lbmQgYXNraW5nIHN0dWRlbnRzIHRvIHB1dCB0b2dldGhlciBhIGJpYmxpb2dyYXBoeSBvZiBtYXRlcmlhbHMgdGhleSB3YW50IHRvIHVzZSBpbiBlZGl0aW5nIHRoZSBhcnRpY2xlLCB3aGljaCBjYW4gdGhlbiBiZSBhc3Nlc3NlZCBieSB5b3UgYW5kIG90aGVyIFdpa2lwZWRpYW5zLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgICAgIHRpdGxlOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3ggcGFnZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIG9mIGVhY2ggYXBwcm9hY2guJ1xuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBzYW5kYm94ZXMnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U2FuZGJveGVzIOKAlCBwYWdlcyBhc3NvY2lhdGVkIHdpdGggYW4gaW5kaXZpZHVhbCBlZGl0b3IgdGhhdCBhcmUgbm90IGNvbnNpZGVyZWQgcGFydCBvZiBXaWtpcGVkaWEgcHJvcGVyIOKAlCBtYWtlIHN0dWRlbnRzIGZlZWwgc2FmZS4gVGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMgb3Igb3RoZXIgV2lraXBlZGlhbnMgYWx0ZXJpbmcgdGhlaXIgd3JpdGluZy4gSG93ZXZlciwgc2FuZGJveCBlZGl0aW5nIGxpbWl0cyBtYW55IG9mIHRoZSB1bmlxdWUgYXNwZWN0cyBvZiBXaWtpcGVkaWEgYXMgYSB0ZWFjaGluZyB0b29sLCBzdWNoIGFzIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBhbmQgaW5jcmVtZW50YWwgZHJhZnRpbmcuIFNwZW5kaW5nIG1vcmUgdGhhbiBhIHdlZWsgb3IgdHdvIGluIHNhbmRib3hlcyBpcyBzdHJvbmdseSBkaXNjb3VyYWdlZC48L3A+XCIgXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBlZGl0aW5nIGxpdmUnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RWRpdGluZyBsaXZlIGlzIGV4Y2l0aW5nIGZvciB0aGUgc3R1ZGVudHMgYmVjYXVzZSB0aGV5IGNhbiBzZWUgdGhlaXIgY2hhbmdlcyB0byB0aGUgYXJ0aWNsZXMgaW1tZWRpYXRlbHkgYW5kIGV4cGVyaWVuY2UgdGhlIGNvbGxhYm9yYXRpdmUgZWRpdGluZyBwcm9jZXNzIHRocm91Z2hvdXQgdGhlIGFzc2lnbm1lbnQuIEhvd2V2ZXIsIGJlY2F1c2UgbmV3IGVkaXRvcnMgb2Z0ZW4gdW5pbnRlbnRpb25hbGx5IGJyZWFrIFdpa2lwZWRpYSBydWxlcywgc29tZXRpbWVzIHN0dWRlbnRz4oCZIGFkZGl0aW9ucyBhcmUgcXVlc3Rpb25lZCBvciByZW1vdmVkLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgICAgIHRpdGxlOiAnUGVlciBmZWVkYmFjaydcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICAgICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkNvbGxhYm9yYXRpb24gaXMgYSBjcml0aWNhbCBlbGVtZW50IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEuXCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5QZWVyIHJldmlld3MgYXJlIGFub3RoZXIgY2hhbmNlIGZvciBzdHVkZW50cyB0byBwcmFjdGljZSBjcml0aWNhbCB0aGlua2luZy4gVXNlZnVsIHJldmlld3MgZm9jdXMgb24gc3BlY2lmaWMgaXNzdWVzIHRoYXQgY2FuIGJlIGltcHJvdmVkLiBTaW5jZSBzdHVkZW50cyBhcmUgdXN1YWxseSBoZXNpdGFudCB0byBjcml0aWNpemUgdGhlaXIgY2xhc3NtYXRlc+KAlGFuZCBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyBtYXkgZ2V0IGFubm95ZWQgd2l0aCBhIHN0cmVhbSBvZiBwcmFpc2UgZnJvbSBzdHVkZW50cyB0aGF0IGdsb3NzZXMgb3ZlciBhbiBhcnRpY2xlJ3Mgc2hvcnRjb21pbmdz4oCUaXQncyBpbXBvcnRhbnQgdG8gZ2l2ZXMgZXhhbXBsZXMgb2YgdGhlIGtpbmRzIG9mIGNvbnN0cnVjdGl2ZWx5IGNyaXRpY2FsIGZlZWRiYWNrIHRoYXQgYXJlIHRoZSBtb3N0IGhlbHBmdWwuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+SG93IG1hbnkgcGVlciByZXZpZXdzIHdpbGwgeW91IGFzayBlYWNoIHN0dWRlbnQgdG8gY29udHJpYnV0ZSBkdXJpbmcgdGhlIGNvdXJzZT88L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICAgICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyAob3B0aW9uYWwpOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkJ5IHRoZSB0aW1lIHN0dWRlbnRzIGhhdmUgbWFkZSBpbXByb3ZlbWVudHMgYmFzZWQgb24gY2xhc3NtYXRlcycgY29tbWVudHPigJRhbmQgaWRlYWxseSBzdWdnZXN0aW9ucyBmcm9tIHlvdSBhcyB3ZWxs4oCUdGhleSBzaG91bGQgaGF2ZSBwcm9kdWNlZCBuZWFybHkgY29tcGxldGUgYXJ0aWNsZXMuIE5vdyBpcyB0aGUgY2hhbmNlIHRvIGVuY291cmFnZSB0aGVtIHRvIHdhZGUgYSBsaXR0bGUgZGVlcGVyIGludG8gV2lraXBlZGlhIGFuZCBpdHMgbm9ybXMgYW5kIGNyaXRlcmlhIHRvIGNyZWF0ZSBncmVhdCBjb250ZW50LlwiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgXCI8cD5Zb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0cyBhbmQgbGltaXRzIG9mIFdpa2lwZWRpYS4gQ29uc2lkZXIgYnJpbmdpbmcgaW4gYSBndWVzdCBzcGVha2VyLCBoYXZpbmcgYSBwYW5lbCBkaXNjdXNzaW9uLCBvciBzaW1wbHkgaGF2aW5nIGFuIG9wZW4gZGlzY3Vzc2lvbiBpbiBjbGFzcyBhYm91dCB3aGF0IHRoZSBzdHVkZW50cyBoYXZlIGRvbmUgc28gZmFyIGFuZCB3aHkgKG9yIHdoZXRoZXIpIGl0IG1hdHRlcnMuPC9wPlwiXG4gICAgICAgICAgICAgXCI8cD5JbiBhZGRpdGlvbiB0byB0aGUgV2lraXBlZGlhIGFydGljbGUgd3JpdGluZyBpdHNlbGYsIHlvdSBtYXkgd2FudCB0byB1c2UgYSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnQuIFRoZXNlIGFzc2lnbm1lbnRzIGNhbiByZWluZm9yY2UgYW5kIGRlZXBlbiB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgYWxzbyBoZWxwIHlvdSB0byB1bmRlcnN0YW5kIGFuZCBldmFsdWF0ZSB0aGUgc3R1ZGVudHMnIHdvcmsgYW5kIGxlYXJuaW5nIG91dGNvbWVzLiBPbiB0aGUgbGVmdCBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuIFNjcm9sbCBvdmVyIGVhY2ggZm9yIG1vcmUgaW5mb3JtYXRpb24sIGFuZCBzZWxlY3QgYW55IHRoYXQgeW91IHdpc2ggdG8gdXNlIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJkeWtcIlxuICAgICAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCB0aGUgPGVtPkRpZCBZb3UgS25vdzwvZW0+IHByb2Nlc3MnXG4gICAgICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5EaWQgWW91IEtub3cgKERZSykgaXMgYSBzZWN0aW9uIG9uIFdpa2lwZWRpYeKAmXMgbWFpbiBwYWdlIGhpZ2hsaWdodGluZyBuZXcgY29udGVudCB0aGF0IGhhcyBiZWVuIGFkZGVkIHRvIFdpa2lwZWRpYSBpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBEWUsgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIDYgaG91cnMgaW4gdGhlIHNwb3RsaWdodC48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXggb3IgbW9yZSkgd2l0aGluIHRoZSBsYXN0IHNldmVuIGRheXMuIFN0dWRlbnRzIHdobyBtZWV0IHRoaXMgY3JpdGVyaWEgbWF5IHdhbnQgdG8gbm9taW5hdGUgdGhlaXIgY29udHJpYnV0aW9ucyBmb3IgRFlLLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZSBzaG9ydCB3aW5kb3cgb2YgZWxpZ2liaWxpdHksIGFuZCB0aGUgc3RyaWN0IHJ1bGVzIG9mIHRoZSBub21pbmF0aW9uIHByb2Nlc3MsIGNhbiBtYWtlIGl0IGNoYWxsZW5naW5nIHRvIGluY29ycG9yYXRlIERZSyBpbnRvIGEgY2xhc3Nyb29tIHByb2plY3QuIFRoZSBEWUsgcHJvY2VzcyBzaG91bGQgbm90IGJlIGEgcmVxdWlyZWQgcGFydCBvZiB5b3VyIGFzc2lnbm1lbnQsIGFzIHRoZSBEWUsgbm9taW5hdGlvbiBwcm9jZXNzIGNhbiBiZSBkaWZmaWN1bHQgZm9yIG5ld2NvbWVycyB0byBuYXZpZ2F0ZS4gSG93ZXZlciwgaXQgbWFrZXMgYSBncmVhdCBzdHJldGNoIGdvYWwgd2hlbiB1c2VkIHNlbGVjdGl2ZWx5LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgRFlLIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj8gSWYgc28sIHRoZSBXaWtpIEVkIHRlYW0gY2FuIGhlbHAgeW91IGFuZCB5b3VyIHN0dWRlbnRzIGR1cmluZyB0aGUgdGVybSB0byBpZGVudGlmeSB3b3JrIHRoYXQgbWF5IGJlIGEgZ29vZCBjYW5kaWRhdGUgZm9yIERZSyBhbmQgYW5zd2VyIHF1ZXN0aW9ucyB5b3UgbWF5IGhhdmUgYWJvdXQgdGhlIG5vbWluYXRpb24gcHJvY2Vzcy48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJnYVwiXG4gICAgICAgIHRpdGxlOiAnR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IHRoZSA8ZW0+R29vZCBBcnRpY2xlPC9lbT4gcHJvY2VzcydcbiAgICAgICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5XZWxsLWRldmVsb3BlZCBhcnRpY2xlcyB0aGF0IGhhdmUgcGFzc2VkIGEgR29vZCBBcnRpY2xlIChHQSkgcmV2aWV3IGFyZSBhIHN1YnN0YW50aWFsIGFjaGlldmVtZW50IGluIHRoZWlyIG93biByaWdodCwgYW5kIGNhbiBhbHNvIHF1YWxpZnkgZm9yIERZSy4gVGhpcyBwZWVyIHJldmlldyBwcm9jZXNzIGludm9sdmVzIGNoZWNraW5nIGEgcG9saXNoZWQgYXJ0aWNsZSBhZ2FpbnN0IFdpa2lwZWRpYSdzIEdBIGNyaXRlcmlhOiBhcnRpY2xlcyBtdXN0IGJlIHdlbGwtd3JpdHRlbiwgdmVyaWZpYWJsZSBhbmQgd2VsbC1zb3VyY2VkIHdpdGggbm8gb3JpZ2luYWwgcmVzZWFyY2gsIGJyb2FkIGluIGNvdmVyYWdlLCBuZXV0cmFsLCBzdGFibGUsIGFuZCBhcHByb3ByaWF0ZWx5IGlsbHVzdHJhdGVkICh3aGVuIHBvc3NpYmxlKS4gUHJhY3RpY2FsbHkgc3BlYWtpbmcsIGEgcG90ZW50aWFsIEdvb2QgQXJ0aWNsZSBzaG91bGQgbG9vayBhbmQgc291bmQgbGlrZSBvdGhlciB3ZWxsLWRldmVsb3BlZCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGFuZCBpdCBzaG91bGQgcHJvdmlkZSBhIHNvbGlkLCB3ZWxsLWJhbGFuY2VkIHRyZWF0bWVudCBvZiBpdHMgc3ViamVjdC48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSB3ZWxsLWRldmVsb3BlZC4gVHlwaWNhbGx5LCByZXZpZXdlcnMgd2lsbCBpZGVudGlmeSBmdXJ0aGVyIHNwZWNpZmljIGFyZWFzIGZvciBpbXByb3ZlbWVudCwgYW5kIHRoZSBhcnRpY2xlIHdpbGwgYmUgcHJvbW90ZWQgdG8gR29vZCBBcnRpY2xlIHN0YXR1cyBpZiBhbGwgdGhlIHJldmlld2VycycgY29uY2VybnMgYXJlIGFkZHJlc3NlZC4gQmVjYXVzZSBvZiB0aGUgdW5jZXJ0YWluIHRpbWVsaW5lIGFuZCB0aGUgZnJlcXVlbnQgbmVlZCB0byBtYWtlIHN1YnN0YW50aWFsIGNoYW5nZXMgdG8gYXJ0aWNsZXMsIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyB1c3VhbGx5IG9ubHkgbWFrZSBzZW5zZSBmb3IgYXJ0aWNsZXMgdGhhdCByZWFjaCBhIG1hdHVyZSBzdGF0ZSBzZXZlcmFsIHdlZWtzIGJlZm9yZSB0aGUgZW5kIG9mIHRlcm0sIGFuZCB0aG9zZSB3cml0dGVuIGJ5IHN0dWRlbnQgZWRpdG9ycyB3aG8gYXJlIGFscmVhZHkgZXhwZXJpZW5jZWQsIHN0cm9uZyB3cml0ZXJzIGFuZCB3aG8gYXJlIHdpbGxpbmcgdG8gY29tZSBiYWNrIHRvIGFkZHJlc3MgcmV2aWV3ZXIgZmVlZGJhY2sgKGV2ZW4gYWZ0ZXIgdGhlIHRlcm0gZW5kcyk8L2VtPi48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gcHJvdmlkZSBhZHZpY2UgYW5kIHN1cHBvcnQgdG8gaGlnaC1hY2hpZXZpbmcgc3R1ZGVudHMgd2hvIGFyZSBpbnRlcmVzdGVkIGluIHRoZSBHb29kIEFydGljbGUgcHJvY2Vzcy48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICBvdXRyb19zdGVwczogW1xuICAgIHtcbiAgICAgIGlkOiBcImdyYWRpbmdcIlxuICAgICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgICBpbnB1dHM6IFtdXG4gICAgfVxuICAgIHtcbiAgICAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzE0JyBzdHlsZT0nd2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjQyLDI0MiwyNDIsMS4wKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjAyLDIwMiwyMDIsMS4wKTtwYWRkaW5nOjEwcHggMTVweDtmb250LXNpemU6IDE2cHg7bGluZS1oZWlnaHQgMjNweDtsZXR0ZXItc3BhY2luZzogMC4yNXB4Oyc+PC90ZXh0YXJlYT48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICAgIGlucHV0czogW11cbiAgICB9XG4gIF1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvbmZpZ1xuXG4iLCJXaXphcmRDb250ZW50ID0gW1xuICB7XG4gICAgaWQ6IFwiaW50cm9cIlxuICAgIHRpdGxlOiAnPGNlbnRlcj5XZWxjb21lIHRvIHRoZTxiciAvPkFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCE8L2NlbnRlcj4nXG4gICAgbG9naW5faW5zdHJ1Y3Rpb25zOiAnQ2xpY2sgTG9naW4gd2l0aCBXaWtpcGVkaWEgdG8gZ2V0IHN0YXJ0ZWQnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnJ1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPlRoaXMgdG9vbCB3aWxsIGhlbHAgeW91IHRvIGVhc2lseSBjcmVhdGUgYSBjdXN0b21pemVkIFdpa2lwZWRpYSBjbGFzc3Jvb20gYXNzaWdubWVudCBhbmQgY3VzdG9taXplZCBzeWxsYWJ1cyBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPldoZW4geW914oCZcmUgZmluaXNoZWQsIHlvdSdsbCBoYXZlIGEgcmVhZHktdG8tdXNlIGxlc3NvbiBwbGFuLCB3aXRoIHdlZWtseSBhc3NpZ25tZW50cywgcHVibGlzaGVkIGRpcmVjdGx5IG9udG8gYSBzYW5kYm94IHBhZ2Ugb24gV2lraXBlZGlhIHdoZXJlIHlvdSBjYW4gY3VzdG9tZWl6ZSBpdCBldmVuIGZ1cnRoZXIuPC9wPlwiICAgICBcbiAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+TGV04oCZcyBzdGFydCBieSBmaWxsaW5nIGluIHNvbWUgYmFzaWNzIGFib3V0IHlvdSBhbmQgeW91ciBjb3Vyc2U6PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImFzc2lnbm1lbnRfc2VsZWN0aW9uXCJcbiAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgdHlwZSBzZWxlY3Rpb24nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgYXNzaWdubWVudCBzZWxlY3Rpb25zJ1xuICAgIGZvcm1UaXRsZTogJ0F2YWlsYWJsZSBhc3NpZ25tZW50czonXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIllvdSBjYW4gdGVhY2ggd2l0aCBXaWtpcGVkaWEgaW4gc2V2ZXJhbCBkaWZmZXJlbnQgd2F5cywgYW5kIGl0J3MgaW1wb3J0YW50IHRvIGRlc2lnbiBhbiBhc3NpZ25tZW50IHRoYXQgaXMgc3VpdGFibGUgZm9yIFdpa2lwZWRpYSA8ZW0+YW5kPC9lbT4gYWNoaWV2ZXMgeW91ciBzdHVkZW50IGxlYXJuaW5nIG9iamVjdGl2ZXMuIFlvdXIgZmlyc3Qgc3RlcCBpcyB0byBjaG9vc2Ugd2hpY2ggYXNzaWdubWVudChzKSB5b3UnbGwgYmUgYXNraW5nIHlvdXIgc3R1ZGVudHMgdG8gY29tcGxldGUgYXMgcGFydCBvZiB0aGUgY291cnNlLlwiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5XZSd2ZSBjcmVhdGVkIHNvbWUgZ3VpZGVsaW5lcyB0byBoZWxwIHlvdSwgYnV0IHlvdSdsbCBuZWVkIHRvIG1ha2Ugc29tZSBrZXkgZGVjaXNpb25zLCBzdWNoIGFzOiB3aGljaCBsZWFybmluZyBvYmplY3RpdmVzIGFyZSB5b3UgdGFyZ2V0aW5nIHdpdGggdGhpcyBhc3NpZ25tZW50PyBXaGF0IHNraWxscyBkbyB5b3VyIHN0dWRlbnRzIGFscmVhZHkgaGF2ZT8gSG93IG11Y2ggdGltZSBjYW4geW91IGRldm90ZSB0byB0aGUgYXNzaWdubWVudD88L3A+XCJcbiAgICAgICAgICBcIjxwPk1vc3QgaW5zdHJ1Y3RvcnMgYXNrIHRoZWlyIHN0dWRlbnRzIHRvIHdyaXRlIG9yIGV4cGFuZCBhbiBhcnRpY2xlLiBTdHVkZW50cyBzdGFydCBieSBsZWFybmluZyB0aGUgYmFzaWNzIG9mIFdpa2lwZWRpYSwgYW5kIHRoZW4gZm9jdXMgb24gdGhlIGNvbnRlbnQuIFRoZXkgcGxhbiwgcmVzZWFyY2gsIGFuZCB3cml0ZSBhIHByZXZpb3VzbHkgbWlzc2luZyBXaWtpcGVkaWEgYXJ0aWNsZSwgb3IgY29udHJpYnV0ZSB0byBhbiBpbmNvbXBsZXRlIGVudHJ5IG9uIGEgY291cnNlLXJlbGF0ZWQgdG9waWMuIFRoaXMgYXNzaWdubWVudCB0eXBpY2FsbHkgcmVwbGFjZXMgYSB0ZXJtIHBhcGVyIG9yIHJlc2VhcmNoIHByb2plY3QsIG9yIGl0IGZvcm1zIHRoZSBsaXRlcmF0dXJlIHJldmlldyBzZWN0aW9uIG9mIGEgbGFyZ2VyIHBhcGVyLiBUaGUgc3R1ZGVudCBsZWFybmluZyBvdXRjb21lIGlzIGhpZ2ggd2l0aCB0aGlzIGFzc2lnbm1lbnQsIGJ1dCBpdCBkb2VzIHRha2UgYSBzaWduaWZpY2FudCBhbW91bnQgb2YgdGltZS4gWW91ciBzdHVkZW50cyBuZWVkIHRvIGxlYXJuIGJvdGggdGhlIHdpa2kgbWFya3VwIGxhbmd1YWdlIGFuZCBrZXkgcG9saWNpZXMgYW5kIGV4cGVjdGF0aW9ucyBvZiB0aGUgV2lraXBlZGlhLWVkaXRpbmcgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgIFwiPHA+SWYgd3JpdGluZyBhbiBhcnRpY2xlIGlzbid0IHJpZ2h0IGZvciB5b3VyIGNsYXNzLCBvdGhlciBhc3NpZ25tZW50IG9wdGlvbnMgb2ZmZXIgc3R1ZGVudHMgdmFsdWFibGUgbGVhcm5pbmcgb3Bwb3J0dW5pdGllcyBhbmQgaGVscCB0byBpbXByb3ZlIFdpa2lwZWRpYS4gU2VsZWN0IGFuIGFzc2lnbm1lbnQgdHlwZSBvbiB0aGUgbGVmdCB0byBsZWFybiBtb3JlLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJsZWFybmluZ19lc3NlbnRpYWxzXCJcbiAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IFdpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuXCJcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+QXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIHVzZXIgYWNjb3VudHMgYW5kIHRoZW4gY29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLjwvcD4nXG4gICAgICAgICAgJzxwPlN0dWRlbnRzIHdobyBjb21wbGV0ZSB0aGlzIHRyYWluaW5nIGFyZSBiZXR0ZXIgcHJlcGFyZWQgdG8gZm9jdXMgb24gbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBzcGVuZCBsZXNzIHRpbWUgZGlzdHJhY3RlZCBieSBjbGVhbmluZyB1cCBhZnRlciBlcnJvcnMuPC9wPidcbiAgICAgICAgICAnPHA+V2lsbCBjb21wbGV0aW9uIG9mIHRoZSBzdHVkZW50IHRyYWluaW5nIGJlIHBhcnQgb2YgeW91ciBzdHVkZW50c1xcJyBncmFkZXM/IChNYWtlIHlvdXIgY2hvaWNlIGF0IHRoZSB0b3AgbGVmdC4pPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lcydcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DcmVhdGUgYSB1c2VyIGFjY291bnQgYW5kIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+Q29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIER1cmluZyB0aGlzIHRyYWluaW5nLCB5b3Ugd2lsbCBtYWtlIGVkaXRzIGluIGEgc2FuZGJveCBhbmQgbGVhcm4gdGhlIGJhc2ljIHJ1bGVzIG9mIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImdldHRpbmdfc3RhcnRlZFwiXG4gICAgdGl0bGU6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGVhcmx5IGVkaXRpbmcgdGFza3MnXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIkl0IGlzIGltcG9ydGFudCBmb3Igc3R1ZGVudHMgdG8gc3RhcnQgZWRpdGluZyBXaWtpcGVkaWEgZWFybHkgb24uIFRoYXQgd2F5LCB0aGV5IGJlY29tZSBmYW1pbGlhciB3aXRoIFdpa2lwZWRpYSdzIG1hcmt1cCAoXFxcIndpa2lzeW50YXhcXFwiLCBcXFwid2lraW1hcmt1cFxcXCIsIG9yIFxcXCJ3aWtpY29kZVxcXCIpIGFuZCB0aGUgbWVjaGFuaWNzIG9mIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gdGhlIHNpdGUuIFdlIHJlY29tbWVuZCBhc3NpZ25pbmcgYSBmZXcgYmFzaWMgV2lraXBlZGlhIHRhc2tzIGVhcmx5IG9uLlwiXG4gICAgZm9ybVRpdGxlOiAnV2hpY2ggYmFzaWMgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gaW5jbHVkZT8nXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPldoaWNoIGludHJvZHVjdG9yeSBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byB1c2UgdG8gYWNjbGltYXRlIHlvdXIgc3R1ZGVudHMgdG8gV2lraXBlZGlhPyBZb3UgY2FuIHNlbGVjdCBub25lLCBvbmUsIG9yIG1vcmUuIFdoaWNoZXZlciB5b3Ugc2VsZWN0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGFzc2lnbm1lbnQgdGltZWxpbmUuPC9wPidcbiAgICAgICAgICAnPHVsPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q3JpdGlxdWUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQ3JpdGljYWxseSBldmFsdWF0ZSBhbiBleGlzdGluZyBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcywgYW5kIGxlYXZlIHN1Z2dlc3Rpb25zIGZvciBpbXByb3ZpbmcgaXQgb24gdGhlIGFydGljbGXigJlzIHRhbGsgcGFnZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkFkZCB0byBhbiBhcnRpY2xlLjwvc3Ryb25nPiBVc2luZyBjb3Vyc2UgcmVhZGluZ3Mgb3Igb3RoZXIgcmVsZXZhbnQgc2Vjb25kYXJ5IHNvdXJjZXMsIGFkZCAx4oCTMiBzZW50ZW5jZXMgb2YgbmV3IGluZm9ybWF0aW9uIHRvIGEgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MuIEJlIHN1cmUgdG8gaW50ZWdyYXRlIGl0IHdlbGwgaW50byB0aGUgZXhpc3RpbmcgYXJ0aWNsZSwgYW5kIGluY2x1ZGUgYSBjaXRhdGlvbiB0byB0aGUgc291cmNlLiA8L2xpPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q29weWVkaXQgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQnJvd3NlIFdpa2lwZWRpYSB1bnRpbCB5b3UgZmluZCBhbiBhcnRpY2xlIHRoYXQgeW91IHdvdWxkIGxpa2UgdG8gaW1wcm92ZSwgYW5kIG1ha2Ugc29tZSBlZGl0cyB0byBpbXByb3ZlIHRoZSBsYW5ndWFnZSBvciBmb3JtYXR0aW5nLiA8L2xpPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+SWxsdXN0cmF0ZSBhbiBhcnRpY2xlLjwvc3Ryb25nPiBGaW5kIGFuIG9wcG9ydHVuaXR5IHRvIGltcHJvdmUgYW4gYXJ0aWNsZSBieSB1cGxvYWRpbmcgYW5kIGFkZGluZyBhIHBob3RvIHlvdSB0b29rLjwvbGk+XG4gICAgICAgICAgPC91bD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Gb3IgbW9zdCBjb3Vyc2VzLCB0aGUgPGVtPkNyaXRpcXVlIGFuIGFydGljbGU8L2VtPiBhbmQgPGVtPkFkZCB0byBhbiBhcnRpY2xlPC9lbT4gZXhlcmNpc2VzIHByb3ZpZGUgYSBuaWNlIGZvdW5kYXRpb24gZm9yIHRoZSBtYWluIHdyaXRpbmcgcHJvamVjdC4gVGhlc2UgaGF2ZSBiZWVuIHNlbGVjdGVkIGJ5IGRlZmF1bHQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICB0aXRsZTogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgIGZvcm1UaXRsZTogJ0hvdyB3aWxsIHlvdXIgY2xhc3Mgc2VsZWN0IGFydGljbGVzPydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBjaG9vc2luZyBhcnRpY2xlcydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+Q2hvb3NpbmcgdGhlIHJpZ2h0IChvciB3cm9uZykgYXJ0aWNsZXMgdG8gd29yayBvbiBjYW4gbWFrZSAob3IgYnJlYWspIGEgV2lraXBlZGlhIHdyaXRpbmcgYXNzaWdubWVudC48L3A+J1xuICAgICAgICAgICc8cD5Tb21lIGFydGljbGVzIG1heSBpbml0aWFsbHkgbG9vayBlYXN5IHRvIGltcHJvdmUsIGJ1dCBxdWFsaXR5IHJlZmVyZW5jZXMgdG8gZXhwYW5kIHRoZW0gbWF5IGJlIGRpZmZpY3VsdCB0byBmaW5kLiBGaW5kaW5nIHRvcGljcyB3aXRoIHRoZSByaWdodCBiYWxhbmNlIGJldHdlZW4gcG9vciBXaWtpcGVkaWEgY292ZXJhZ2UgYW5kIGF2YWlsYWJsZSBsaXRlcmF0dXJlIGZyb20gd2hpY2ggdG8gZXhwYW5kIHRoYXQgY292ZXJhZ2UgY2FuIGJlIHRyaWNreS4gSGVyZSBhcmUgc29tZSBndWlkZWxpbmVzIHRvIGtlZXAgaW4gbWluZCB3aGVuIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgaW1wcm92ZW1lbnQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dvb2QgY2hvaWNlJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPkNob29zZSBhIHdlbGwtZXN0YWJsaXNoZWQgdG9waWMgZm9yIHdoaWNoIGEgbG90IG9mIGxpdGVyYXR1cmUgaXMgYXZhaWxhYmxlIGluIGl0cyBmaWVsZCwgYnV0IHdoaWNoIGlzbid0IGNvdmVyZWQgZXh0ZW5zaXZlbHkgb24gV2lraXBlZGlhLjwvbGk+XG4gICAgICAgICAgICA8bGk+R3Jhdml0YXRlIHRvd2FyZCBcXFwic3R1YlxcXCIgYW5kIFxcXCJzdGFydFxcXCIgY2xhc3MgYXJ0aWNsZXMuIFRoZXNlIGFydGljbGVzIG9mdGVuIGhhdmUgb25seSAx4oCTMiBwYXJhZ3JhcGhzIG9mIGluZm9ybWF0aW9uIGFuZCBhcmUgaW4gbmVlZCBvZiBleHBhbnNpb24uIFJlbGV2YW50IFdpa2lQcm9qZWN0IHBhZ2VzIGNhbiBwcm92aWRlIGEgbGlzdCBvZiBzdHVicyB0aGF0IG5lZWQgaW1wcm92ZW1lbnQuPC9saT5cbiAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnTm90IHN1Y2ggYSBnb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+QXJ0aWNsZXMgdGhhdCBhcmUgXCJub3Qgc3VjaCBhIGdvb2QgY2hvaWNlXCIgZm9yIG5ld2NvbWVycyB1c3VhbGx5IGludm9sdmUgYSBsYWNrIG9mIGFwcHJvcHJpYXRlIHJlc2VhcmNoIG1hdGVyaWFsLCBoaWdobHkgY29udHJvdmVyc2lhbCB0b3BpY3MgdGhhdCBtYXkgYWxyZWFkeSBiZSB3ZWxsIGRldmVsb3BlZCwgYnJvYWQgc3ViamVjdHMsIG9yIHRvcGljcyBmb3Igd2hpY2ggaXQgaXMgZGlmZmljdWx0IHRvIGRlbW9uc3RyYXRlIG5vdGFiaWxpdHkuPC9wPidcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5Zb3UgcHJvYmFibHkgc2hvdWxkbid0IHRyeSB0byBjb21wbGV0ZWx5IG92ZXJoYXVsIGFydGljbGVzIG9uIHZlcnkgYnJvYWQgdG9waWNzIChlLmcuLCBMYXcpLjwvbGk+XG4gICAgICAgICAgICA8bGk+WW91IHNob3VsZCBwcm9iYWJseSBhdm9pZCB0cnlpbmcgdG8gaW1wcm92ZSBhcnRpY2xlcyBvbiB0b3BpY3MgdGhhdCBhcmUgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgKGZvciBleGFtcGxlLCBHbG9iYWwgV2FybWluZywgQWJvcnRpb24sIG9yIFNjaWVudG9sb2d5KS4gWW91IG1heSBiZSBtb3JlIHN1Y2Nlc3NmdWwgc3RhcnRpbmcgYSBzdWItYXJ0aWNsZSBvbiB0aGUgdG9waWMgaW5zdGVhZC48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICA8bGk+QXZvaWQgd29ya2luZyBvbiBzb21ldGhpbmcgd2l0aCBzY2FyY2UgbGl0ZXJhdHVyZS4gV2lraXBlZGlhIGFydGljbGVzIGNpdGUgc2Vjb25kYXJ5IGxpdGVyYXR1cmUgc291cmNlcywgc28gaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSBlbm91Z2ggc291cmNlcyBmb3IgdmVyaWZpY2F0aW9uIGFuZCB0byBwcm92aWRlIGEgbmV1dHJhbCBwb2ludCBvZiB2aWV3LjwvbGk+XG4gICAgICAgICAgICA8bGk+RG9uJ3Qgc3RhcnQgYXJ0aWNsZXMgd2l0aCB0aXRsZXMgdGhhdCBpbXBseSBhbiBhcmd1bWVudCBvciBlc3NheS1saWtlIGFwcHJvYWNoIChlLmcuLCBUaGUgRWZmZWN0cyBUaGF0IFRoZSBSZWNlbnQgU3ViLVByaW1lIE1vcnRnYWdlIENyaXNpcyBoYXMgaGFkIG9uIHRoZSBVUyBhbmQgR2xvYmFsIEVjb25vbWljcykuIFRoZXNlIHR5cGUgb2YgdGl0bGVzLCBhbmQgbW9zdCBsaWtlbHkgdGhlIGNvbnRlbnQgdG9vLCBtYXkgbm90IGJlIGFwcHJvcHJpYXRlIGZvciBhbiBlbmN5Y2xvcGVkaWEuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+QXMgdGhlIGluc3RydWN0b3IsIHlvdSBzaG91bGQgYXBwbHkgeW91ciBvd24gZXhwZXJ0aXNlIHRvIGV4YW1pbmluZyBXaWtpcGVkaWHigJlzIGNvdmVyYWdlIG9mIHlvdXIgZmllbGQuIFlvdSB1bmRlcnN0YW5kIHRoZSBicm9hZGVyIGludGVsbGVjdHVhbCBjb250ZXh0IHdoZXJlIGluZGl2aWR1YWwgdG9waWNzIGZpdCBpbiwgeW91IGNhbiByZWNvZ25pemUgd2hlcmUgV2lraXBlZGlhIGZhbGxzIHNob3J0LCB5b3Uga25vd+KAlG9yIGtub3cgaG93IHRvIGZpbmTigJR0aGUgcmVsZXZhbnQgbGl0ZXJhdHVyZSwgYW5kIHlvdSBrbm93IHdoYXQgdG9waWNzIHlvdXIgc3R1ZGVudHMgc2hvdWxkIGJlIGFibGUgdG8gaGFuZGxlLiBZb3VyIGd1aWRhbmNlIG9uIGFydGljbGUgY2hvaWNlIGFuZCBzb3VyY2luZyBpcyBjcml0aWNhbCBmb3IgYm90aCB5b3VyIHN0dWRlbnRz4oCZIHN1Y2Nlc3MgYW5kIHRoZSBpbXByb3ZlbWVudCBvZiBXaWtpcGVkaWEuPC9wPidcbiAgICAgICAgICAnPHA+VGhlcmUgYXJlIHR3byByZWNvbW1lbmRlZCBvcHRpb25zIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXM6PC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0luc3RydWN0b3IgcHJlcGFyZXMgYSBsaXN0J1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPllvdSAodGhlIGluc3RydWN0b3IpIHByZXBhcmUgYSBsaXN0IG9mIGFwcHJvcHJpYXRlIFxcJ25vbi1leGlzdGVudFxcJywgXFwnc3R1YlxcJyBvciBcXCdzdGFydFxcJyBhcnRpY2xlcyBhaGVhZCBvZiB0aW1lIGZvciB0aGUgc3R1ZGVudHMgdG8gY2hvb3NlIGZyb20uIElmIHBvc3NpYmxlLCB5b3UgbWF5IHdhbnQgdG8gd29yayB3aXRoIGFuIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW4gdG8gY3JlYXRlIHRoZSBsaXN0LiBFYWNoIHN0dWRlbnQgY2hvb3NlcyBhbiBhcnRpY2xlIGZyb20gdGhlIGxpc3QgdG8gd29yayBvbi4gQWx0aG91Z2ggdGhpcyByZXF1aXJlcyBtb3JlIHByZXBhcmF0aW9uLCBpdCBtYXkgaGVscCBzdHVkZW50cyB0byBzdGFydCByZXNlYXJjaGluZyBhbmQgd3JpdGluZyB0aGVpciBhcnRpY2xlcyBzb29uZXIuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+RWFjaCBzdHVkZW50IGV4cGxvcmVzIFdpa2lwZWRpYSBhbmQgbGlzdHMgM+KAkzUgdG9waWNzIG9uIHRoZWlyIFdpa2lwZWRpYSB1c2VyIHBhZ2UgdGhhdCB0aGV5IGFyZSBpbnRlcmVzdGVkIGluIGZvciB0aGVpciBtYWluIHByb2plY3QuIFlvdSAodGhlIGluc3RydWN0b3IpIHNob3VsZCBhcHByb3ZlIGFydGljbGUgY2hvaWNlcyBiZWZvcmUgc3R1ZGVudHMgcHJvY2VlZCB0byB3cml0aW5nLiBIYXZpbmcgc3R1ZGVudHMgZmluZCB0aGVpciBvd24gYXJ0aWNsZXMgcHJvdmlkZXMgdGhlbSB3aXRoIGEgc2Vuc2Ugb2YgbW90aXZhdGlvbiBhbmQgb3duZXJzaGlwIG92ZXIgdGhlIGFzc2lnbm1lbnQgYW5kIGV4ZXJjaXNlcyB0aGVpciBjcml0aWNhbCB0aGlua2luZyBza2lsbHMgYXMgdGhleSBpZGVudGlmeSBjb250ZW50IGdhcHMsIGJ1dCBpdCBtYXkgYWxzbyBsZWFkIHRvIGNob2ljZXMgdGhhdCBhcmUgZnVydGhlciBhZmllbGQgZnJvbSBjb3Vyc2UgbWF0ZXJpYWwuPC9wPidcbiAgICAgICAgXVxuICAgICAgfSBcbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcInJlc2VhcmNoX3BsYW5uaW5nXCJcbiAgICB0aXRsZTogJ1Jlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICBmb3JtVGl0bGU6ICdIb3cgc2hvdWxkIHN0dWRlbnRzIHBsYW4gdGhlaXIgYXJ0aWNsZXM/J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHJlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+U3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGFibGUgZm9yIFdpa2lwZWRpYS4gVGhhdCdzIHdoeSB3ZSByZWNvbW1lbmQgYXNraW5nIHN0dWRlbnRzIHRvIHB1dCB0b2dldGhlciBhIGJpYmxpb2dyYXBoeSBvZiBtYXRlcmlhbHMgdGhleSB3YW50IHRvIHVzZSBpbiBlZGl0aW5nIHRoZSBhcnRpY2xlLCB3aGljaCBjYW4gdGhlbiBiZSBhc3Nlc3NlZCBieSB5b3UgYW5kIG90aGVyIFdpa2lwZWRpYW5zLjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlbiwgc3R1ZGVudHMgc2hvdWxkIHByb3Bvc2Ugb3V0bGluZXMgZm9yIHRoZWlyIGFydGljbGVzLiBUaGlzIGNhbiBiZSBhIHRyYWRpdGlvbmFsIG91dGxpbmUsIGluIHdoaWNoIHN0dWRlbnRzIGlkZW50aWZ5IHdoaWNoIHNlY3Rpb25zIHRoZWlyIGFydGljbGVzIHdpbGwgaGF2ZSBhbmQgd2hpY2ggYXNwZWN0cyBvZiB0aGUgdG9waWMgd2lsbCBiZSBjb3ZlcmVkIGluIGVhY2ggc2VjdGlvbi4gQWx0ZXJuYXRpdmVseSwgc3R1ZGVudHMgY2FuIGRldmVsb3AgZWFjaCBvdXRsaW5lIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbiDigJQgdGhlIHVudGl0bGVkIHNlY3Rpb24gYXQgdGhlIGJlZ2lubmluZyBvZiBhbiBhcnRpY2xlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHByb3ZpZGUgYSBjb25jaXNlIHN1bW1hcnkgb2YgaXRzIGNvbnRlbnQuIFdvdWxkIHlvdSBsaWtlIHlvdXIgc3R1ZGVudHMgdG8gY3JlYXRlIHRyYWRpdGlvbmFsIG91dGxpbmVzLCBvciBjb21wb3NlIG91dGxpbmVzIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhLXN0eWxlIGxlYWQgc2VjdGlvbj88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImRyYWZ0c19tYWluc3BhY2VcIlxuICAgIHRpdGxlOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgZHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3ggcGFnZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIG9mIGVhY2ggYXBwcm9hY2guJ1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBzYW5kYm94ZXMnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPlNhbmRib3hlcyDigJQgcGFnZXMgYXNzb2NpYXRlZCB3aXRoIGFuIGluZGl2aWR1YWwgZWRpdG9yIHRoYXQgYXJlIG5vdCBjb25zaWRlcmVkIHBhcnQgb2YgV2lraXBlZGlhIHByb3BlciDigJQgbWFrZSBzdHVkZW50cyBmZWVsIHNhZmUuIFRoZXkgY2FuIGVkaXQgd2l0aG91dCB0aGUgcHJlc3N1cmUgb2YgdGhlIHdob2xlIHdvcmxkIHJlYWRpbmcgdGhlaXIgZHJhZnRzIG9yIG90aGVyIFdpa2lwZWRpYW5zIGFsdGVyaW5nIHRoZWlyIHdyaXRpbmcuIEhvd2V2ZXIsIHNhbmRib3ggZWRpdGluZyBsaW1pdHMgbWFueSBvZiB0aGUgdW5pcXVlIGFzcGVjdHMgb2YgV2lraXBlZGlhIGFzIGEgdGVhY2hpbmcgdG9vbCwgc3VjaCBhcyBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgYW5kIGluY3JlbWVudGFsIGRyYWZ0aW5nLiBTcGVuZGluZyBtb3JlIHRoYW4gYSB3ZWVrIG9yIHR3byBpbiBzYW5kYm94ZXMgaXMgc3Ryb25nbHkgZGlzY291cmFnZWQuPC9wPlwiIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBlZGl0aW5nIGxpdmUnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkVkaXRpbmcgbGl2ZSBpcyBleGNpdGluZyBmb3IgdGhlIHN0dWRlbnRzIGJlY2F1c2UgdGhleSBjYW4gc2VlIHRoZWlyIGNoYW5nZXMgdG8gdGhlIGFydGljbGVzIGltbWVkaWF0ZWx5IGFuZCBleHBlcmllbmNlIHRoZSBjb2xsYWJvcmF0aXZlIGVkaXRpbmcgcHJvY2VzcyB0aHJvdWdob3V0IHRoZSBhc3NpZ25tZW50LiBIb3dldmVyLCBiZWNhdXNlIG5ldyBlZGl0b3JzIG9mdGVuIHVuaW50ZW50aW9uYWxseSBicmVhayBXaWtpcGVkaWEgcnVsZXMsIHNvbWV0aW1lcyBzdHVkZW50c+KAmSBhZGRpdGlvbnMgYXJlIHF1ZXN0aW9uZWQgb3IgcmVtb3ZlZC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogJ1wiPHA+V2lsbCB5b3UgaGF2ZSB5b3VyIHN0dWRlbnRzIGRyYWZ0IHRoZWlyIGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzLCBvciB3b3JrIGxpdmUgZnJvbSB0aGUgYmVnaW5uaW5nPzwvcD5cIidcbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJwZWVyX2ZlZWRiYWNrXCJcbiAgICB0aXRsZTogJ1BlZXIgZmVlZGJhY2snXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICBmb3JtVGl0bGU6IFwiSG93IG1hbnkgcGVlciByZXZpZXdzIHNob3VsZCBlYWNoIHN0dWRlbnQgY29uZHVjdD9cIlxuICAgIGluc3RydWN0aW9uczogXCJDb2xsYWJvcmF0aW9uIGlzIGEgY3JpdGljYWwgZWxlbWVudCBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhLlwiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkZvciBzb21lIHN0dWRlbnRzLCB0aGlzIHdpbGwgaGFwcGVuIHNwb250YW5lb3VzbHk7IHRoZWlyIGNob2ljZSBvZiB0b3BpY3Mgd2lsbCBhdHRyYWN0IGludGVyZXN0ZWQgV2lraXBlZGlhbnMgd2hvIHdpbGwgcGl0Y2ggaW4gd2l0aCBpZGVhcywgY29weWVkaXRzLCBvciBldmVuIHN1YnN0YW50aWFsIGNvbnRyaWJ1dGlvbnMgdG8gdGhlIHN0dWRlbnRz4oCZIGFydGljbGVzLiBJbiBtYW55IGNhc2VzLCBob3dldmVyLCB0aGVyZSB3aWxsIGJlIGxpdHRsZSBzcG9udGFuZW91cyBlZGl0aW5nIG9mIHN0dWRlbnRz4oCZIGFydGljbGVzIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSB0ZXJtLiBGb3J0dW5hdGVseSwgeW91IGhhdmUgYSBjbGFzc3Jvb20gZnVsbCBvZiBwZWVyIHJldmlld2Vycy4gWW91IGNhbiBtYWtlIHRoZSBtb3N0IG9mIHRoaXMgYnkgYXNzaWduaW5nIHN0dWRlbnRzIHRvIHJldmlldyBlYWNoIG90aGVyc+KAmSBhcnRpY2xlcyBzb29uIGFmdGVyIGZ1bGwtbGVuZ3RoIGRyYWZ0cyBhcmUgcG9zdGVkLiBUaGlzIGdpdmVzIHN0dWRlbnRzIHBsZW50eSBvZiB0aW1lIHRvIGFjdCBvbiB0aGUgYWR2aWNlIG9mIHRoZWlyIHBlZXJzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+UGVlciByZXZpZXdzIGFyZSBhbm90aGVyIGNoYW5jZSBmb3Igc3R1ZGVudHMgdG8gcHJhY3RpY2UgY3JpdGljYWwgdGhpbmtpbmcuIFVzZWZ1bCByZXZpZXdzIGZvY3VzIG9uIHNwZWNpZmljIGlzc3VlcyB0aGF0IGNhbiBiZSBpbXByb3ZlZC4gU2luY2Ugc3R1ZGVudHMgYXJlIHVzdWFsbHkgaGVzaXRhbnQgdG8gY3JpdGljaXplIHRoZWlyIGNsYXNzbWF0ZXPigJRhbmQgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgbWF5IGdldCBhbm5veWVkIHdpdGggYSBzdHJlYW0gb2YgcHJhaXNlIGZyb20gc3R1ZGVudHMgdGhhdCBnbG9zc2VzIG92ZXIgYW4gYXJ0aWNsZSdzIHNob3J0Y29taW5nc+KAlGl0J3MgaW1wb3J0YW50IHRvIGdpdmVzIGV4YW1wbGVzIG9mIHRoZSBraW5kcyBvZiBjb25zdHJ1Y3RpdmVseSBjcml0aWNhbCBmZWVkYmFjayB0aGF0IGFyZSB0aGUgbW9zdCBoZWxwZnVsLjwvcD5cIlxuICAgICAgICAgIFwiPHA+SG93IG1hbnkgcGVlciByZXZpZXdzIHdpbGwgeW91IGFzayBlYWNoIHN0dWRlbnQgdG8gY29udHJpYnV0ZSBkdXJpbmcgdGhlIGNvdXJzZT88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcInN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHNcIlxuICAgIHRpdGxlOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyAob3B0aW9uYWwpOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgIGluc3RydWN0aW9uczogXCJCeSB0aGUgdGltZSBzdHVkZW50cyBoYXZlIG1hZGUgaW1wcm92ZW1lbnRzIGJhc2VkIG9uIGNsYXNzbWF0ZXMnIGNvbW1lbnRz4oCUYW5kIGlkZWFsbHkgc3VnZ2VzdGlvbnMgZnJvbSB5b3UgYXMgd2VsbOKAlHRoZXkgc2hvdWxkIGhhdmUgcHJvZHVjZWQgbmVhcmx5IGNvbXBsZXRlIGFydGljbGVzLiBOb3cgaXMgdGhlIGNoYW5jZSB0byBlbmNvdXJhZ2UgdGhlbSB0byB3YWRlIGEgbGl0dGxlIGRlZXBlciBpbnRvIFdpa2lwZWRpYSBhbmQgaXRzIG5vcm1zIGFuZCBjcml0ZXJpYSB0byBjcmVhdGUgZ3JlYXQgY29udGVudC5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICBcIjxwPllvdeKAmWxsIHByb2JhYmx5IGhhdmUgZGlzY3Vzc2VkIG1hbnkgb2YgdGhlIGNvcmUgcHJpbmNpcGxlcyBvZiBXaWtpcGVkaWHigJRhbmQgcmVsYXRlZCBpc3N1ZXMgeW91IHdhbnQgdG8gZm9jdXMgb27igJRidXQgbm93IHRoYXQgdGhleeKAmXZlIGV4cGVyaWVuY2VkIGZpcnN0LWhhbmQgaG93IFdpa2lwZWRpYSB3b3JrcywgdGhpcyBpcyBhIGdvb2QgdGltZSB0byByZXR1cm4gdG8gdG9waWNzIGxpa2UgbmV1dHJhbGl0eSwgbWVkaWEgZmx1ZW5jeSwgYW5kIHRoZSBpbXBhY3RzIGFuZCBsaW1pdHMgb2YgV2lraXBlZGlhLiBDb25zaWRlciBicmluZ2luZyBpbiBhIGd1ZXN0IHNwZWFrZXIsIGhhdmluZyBhIHBhbmVsIGRpc2N1c3Npb24sIG9yIHNpbXBseSBoYXZpbmcgYW4gb3BlbiBkaXNjdXNzaW9uIGluIGNsYXNzIGFib3V0IHdoYXQgdGhlIHN0dWRlbnRzIGhhdmUgZG9uZSBzbyBmYXIgYW5kIHdoeSAob3Igd2hldGhlcikgaXQgbWF0dGVycy48L3A+XCJcbiAgICAgICAgIFwiPHA+SW4gYWRkaXRpb24gdG8gdGhlIFdpa2lwZWRpYSBhcnRpY2xlIHdyaXRpbmcgaXRzZWxmLCB5b3UgbWF5IHdhbnQgdG8gdXNlIGEgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50LiBUaGVzZSBhc3NpZ25tZW50cyBjYW4gcmVpbmZvcmNlIGFuZCBkZWVwZW4geW91ciBjb3Vyc2UncyBsZWFybmluZyBvdXRjb21lcywgYW5kIGFsc28gaGVscCB5b3UgdG8gdW5kZXJzdGFuZCBhbmQgZXZhbHVhdGUgdGhlIHN0dWRlbnRzJyB3b3JrIGFuZCBsZWFybmluZyBvdXRjb21lcy4gT24gdGhlIGxlZnQgYXJlIHNvbWUgb2YgdGhlIGVmZmVjdGl2ZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzIHRoYXQgaW5zdHJ1Y3RvcnMgb2Z0ZW4gdXNlLiBTY3JvbGwgb3ZlciBlYWNoIGZvciBtb3JlIGluZm9ybWF0aW9uLCBhbmQgc2VsZWN0IGFueSB0aGF0IHlvdSB3aXNoIHRvIHVzZSBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJkeWtcIlxuICAgIHRpdGxlOiAnRFlLIHByb2Nlc3MnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5EaWQgWW91IEtub3c8L2VtPiBwcm9jZXNzJ1xuICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+RGlkIFlvdSBLbm93IChEWUspIGlzIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBoaWdobGlnaHRpbmcgbmV3IGNvbnRlbnQgdGhhdCBoYXMgYmVlbiBhZGRlZCB0byBXaWtpcGVkaWEgaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy4gRFlLIGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICAgICAgICAgXCI8cD5UaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXggb3IgbW9yZSkgd2l0aGluIHRoZSBsYXN0IHNldmVuIGRheXMuIFN0dWRlbnRzIHdobyBtZWV0IHRoaXMgY3JpdGVyaWEgbWF5IHdhbnQgdG8gbm9taW5hdGUgdGhlaXIgY29udHJpYnV0aW9ucyBmb3IgRFlLLjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYXMgdGhlIERZSyBub21pbmF0aW9uIHByb2Nlc3MgY2FuIGJlIGRpZmZpY3VsdCBmb3IgbmV3Y29tZXJzIHRvIG5hdmlnYXRlLiBIb3dldmVyLCBpdCBtYWtlcyBhIGdyZWF0IHN0cmV0Y2ggZ29hbCB3aGVuIHVzZWQgc2VsZWN0aXZlbHkuPC9wPlwiXG4gICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBoZWxwIHlvdSBhbmQgeW91ciBzdHVkZW50cyBkdXJpbmcgdGhlIHRlcm0gdG8gaWRlbnRpZnkgd29yayB0aGF0IG1heSBiZSBhIGdvb2QgY2FuZGlkYXRlIGZvciBEWUsgYW5kIGFuc3dlciBxdWVzdGlvbnMgeW91IG1heSBoYXZlIGFib3V0IHRoZSBub21pbmF0aW9uIHByb2Nlc3MuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJnYVwiXG4gICAgdGl0bGU6ICdHb29kIEFydGljbGUgcHJvY2VzcydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCB0aGUgPGVtPkdvb2QgQXJ0aWNsZTwvZW0+IHByb2Nlc3MnXG4gICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2VsbC1kZXZlbG9wZWQgYXJ0aWNsZXMgdGhhdCBoYXZlIHBhc3NlZCBhIEdvb2QgQXJ0aWNsZSAoR0EpIHJldmlldyBhcmUgYSBzdWJzdGFudGlhbCBhY2hpZXZlbWVudCBpbiB0aGVpciBvd24gcmlnaHQsIGFuZCBjYW4gYWxzbyBxdWFsaWZ5IGZvciBEWUsuIFRoaXMgcGVlciByZXZpZXcgcHJvY2VzcyBpbnZvbHZlcyBjaGVja2luZyBhIHBvbGlzaGVkIGFydGljbGUgYWdhaW5zdCBXaWtpcGVkaWEncyBHQSBjcml0ZXJpYTogYXJ0aWNsZXMgbXVzdCBiZSB3ZWxsLXdyaXR0ZW4sIHZlcmlmaWFibGUgYW5kIHdlbGwtc291cmNlZCB3aXRoIG5vIG9yaWdpbmFsIHJlc2VhcmNoLCBicm9hZCBpbiBjb3ZlcmFnZSwgbmV1dHJhbCwgc3RhYmxlLCBhbmQgYXBwcm9wcmlhdGVseSBpbGx1c3RyYXRlZCAod2hlbiBwb3NzaWJsZSkuIFByYWN0aWNhbGx5IHNwZWFraW5nLCBhIHBvdGVudGlhbCBHb29kIEFydGljbGUgc2hvdWxkIGxvb2sgYW5kIHNvdW5kIGxpa2Ugb3RoZXIgd2VsbC1kZXZlbG9wZWQgV2lraXBlZGlhIGFydGljbGVzLCBhbmQgaXQgc2hvdWxkIHByb3ZpZGUgYSBzb2xpZCwgd2VsbC1iYWxhbmNlZCB0cmVhdG1lbnQgb2YgaXRzIHN1YmplY3QuPC9wPlwiXG4gICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSB3ZWxsLWRldmVsb3BlZC4gVHlwaWNhbGx5LCByZXZpZXdlcnMgd2lsbCBpZGVudGlmeSBmdXJ0aGVyIHNwZWNpZmljIGFyZWFzIGZvciBpbXByb3ZlbWVudCwgYW5kIHRoZSBhcnRpY2xlIHdpbGwgYmUgcHJvbW90ZWQgdG8gR29vZCBBcnRpY2xlIHN0YXR1cyBpZiBhbGwgdGhlIHJldmlld2VycycgY29uY2VybnMgYXJlIGFkZHJlc3NlZC4gQmVjYXVzZSBvZiB0aGUgdW5jZXJ0YWluIHRpbWVsaW5lIGFuZCB0aGUgZnJlcXVlbnQgbmVlZCB0byBtYWtlIHN1YnN0YW50aWFsIGNoYW5nZXMgdG8gYXJ0aWNsZXMsIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyB1c3VhbGx5IG9ubHkgbWFrZSBzZW5zZSBmb3IgYXJ0aWNsZXMgdGhhdCByZWFjaCBhIG1hdHVyZSBzdGF0ZSBzZXZlcmFsIHdlZWtzIGJlZm9yZSB0aGUgZW5kIG9mIHRlcm0sIGFuZCB0aG9zZSB3cml0dGVuIGJ5IHN0dWRlbnQgZWRpdG9ycyB3aG8gYXJlIGFscmVhZHkgZXhwZXJpZW5jZWQsIHN0cm9uZyB3cml0ZXJzIGFuZCB3aG8gYXJlIHdpbGxpbmcgdG8gY29tZSBiYWNrIHRvIGFkZHJlc3MgcmV2aWV3ZXIgZmVlZGJhY2sgKGV2ZW4gYWZ0ZXIgdGhlIHRlcm0gZW5kcyk8L2VtPi48L3A+XCJcbiAgICAgICAgICBcIjxwPldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBwcm92aWRlIGFkdmljZSBhbmQgc3VwcG9ydCB0byBoaWdoLWFjaGlldmluZyBzdHVkZW50cyB3aG8gYXJlIGludGVyZXN0ZWQgaW4gdGhlIEdvb2QgQXJ0aWNsZSBwcm9jZXNzLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ3JhZGluZ1wiXG4gICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICBcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgIGZvcm1UaXRsZTogXCJcIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAgXG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzE0JyBzdHlsZT0nd2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjQyLDI0MiwyNDIsMS4wKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjAyLDIwMiwyMDIsMS4wKTtwYWRkaW5nOjEwcHggMTVweDtmb250LXNpemU6IDE2cHg7bGluZS1oZWlnaHQgMjNweDtsZXR0ZXItc3BhY2luZzogMC4yNXB4Oyc+PC90ZXh0YXJlYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8ZGl2IGNsYXNzPSdzdGVwLWZvcm0tZGF0ZXMnPjwvZGl2PlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjxhIGlkPSdwdWJsaXNoJyBocmVmPScjJyBjbGFzcz0nYnV0dG9uJyBzdHlsZT0nZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Jz5QdWJsaXNoPC9hPjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICBcbl1cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRDb250ZW50XG4iLCJXaXphcmRDb3Vyc2VJbmZvID0gXG5cbiAgIyBSRVNFQVJDSCBBTkQgV1JJVEUgQSBXSUtJUEVESUEgQVJUSUNMRVxuICByZXNlYXJjaHdyaXRlOiBcbiAgICB0aXRsZTogXCJSZXNlYXJjaCBhbmQgd3JpdGUgYSBXaWtpcGVkaWEgYXJ0aWNsZVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiWW91IGd1aWRlIHlvdXIgc3R1ZGVudHMgdG8gc2VsZWN0IGNvdXJzZS1yZWxhdGVkIHRvcGljcyB0aGF0IGFyZSBub3Qgd2VsbC1jb3ZlcmVkIG9uIFdpa2lwZWRpYSwgYW5kIHRoZXkgd29yayBpbmRpdmlkdWFsbHkgb3IgaW4gc21hbGwgdGVhbXMgdG8gZGV2ZWxvcCBjb250ZW50IOKAlCBlaXRoZXIgZXhwYW5kaW5nIGV4aXN0aW5nIGFydGljbGVzIG9yIGNyZWF0aW5nIG5ldyBvbmVzLiBTdHVkZW50cyBhbmFseXplIHRoZSBjdXJyZW50IGdhcHMsIHN0YXJ0IHRoZWlyIHJlc2VhcmNoIHRvIGZpbmQgaGlnaC1xdWFsaXR5IHNlY29uZGFyeSBzb3VyY2VzLCBhbmQgdGhlbiBjb25zaWRlciB0aGUgYmVzdCB3YXkgdG8gb3JnYW5pemUgdGhlIGF2YWlsYWJsZSBpbmZvcm1hdGlvbi4gVGhlbiBpdCdzIHRpbWUgZm9yIHRoZW0gaW4gdHVybiB0bzogcHJvcG9zZSBhbiBvdXRsaW5lOyBkcmFmdCBuZXcgYXJ0aWNsZXMgb3IgbmV3IGNvbnRlbnQgZm9yIGV4aXN0aW5nIG9uZXM7IHByb3ZpZGUgYW5kIHJlc3BvbmQgdG8gcGVlciBmZWVkYmFjazsgYW5kIG1vdmUgdGhlaXIgd29yayBpbnRvIHRoZSBsaXZlIGFydGljbGUgbmFtZXNwYWNlIG9uIFdpa2lwZWRpYS5cIlxuICAgICAgXCJBbG9uZyB0aGUgd2F5LCBzdHVkZW50cyBtYXkgd29yayB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYSBlZGl0b3JzIHdobyBjYW4gb2ZmZXIgY3JpdGljYWwgZmVlZGJhY2sgYW5kIGhlbHAgbWFrZSBzdXJlIGFydGljbGVzIG1lZXQgV2lraXBlZGlhJ3Mgc3RhbmRhcmRzIGFuZCBzdHlsZSBjb252ZW50aW9ucywgYW5kIGl0J3MgaW1wb3J0YW50IHRvIGluY29ycG9yYXRlIHRpbWUgaW50byB0aGUgYXNzaWdubWVudCBmb3IgdGhlIHN0dWRlbnRzIHRvIGludGVncmF0ZSB0aG9zZSBzdWdnZXN0aW9ucy4gU3R1ZGVudHMgd2hvIGRvIGdyZWF0IHdvcmsgbWF5IGhhdmUgdGhlaXIgYXJ0aWNsZXMgaGlnaGxpZ2h0ZWQgb24gV2lraXBlZGlhJ3MgbWFpbiBwYWdlLCBhbmQgaGlnaCBxdWFsaXR5IGFydGljbGVzIHdpbGwgaGVscCBpbmZvcm0gdGhvdXNhbmRzIG9mIGZ1dHVyZSByZWFkZXJzIGFib3V0IHRoZSBzZWxlY3RlZCB0b3BpYy4gXCJcbiAgICAgIFwiT3B0aW9uYWxseSwgeW91IG1heSBhc2sgeW91ciBzdHVkZW50cyB0byB3cml0ZSBhIHJlZmxlY3RpdmUgcGFwZXIgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2UsIHByZXNlbnQgdGhlaXIgY29udHJpYnV0aW9ucyBpbiBjbGFzcywgb3IgZGV2ZWxvcCB0aGVpciBvd24gY29uY2x1c2lvbnMgYW5kIGFyZ3VtZW50cyBpbiBhIHN1cHBsZW1lbnRhcnkgZXNzYXkuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIxMiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWRzIG9yIGdyYWQgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY2xhc3Nlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3Agd3JpdGluZyBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIFNPVVJDRS1DRU5URVJFRCBBRERJVElPTlNcbiAgc291cmNlY2VudGVyZWQ6IFxuICAgIHRpdGxlOiBcIlNvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHJlYWQgV2lraXBlZGlhIGFydGljbGVzIGluIGEgc2VsZi1zZWxlY3RlZCBzdWJqZWN0IGFyZWEgdG8gaWRlbnRpZnkgYXJ0aWNsZXMgaW4gbmVlZCBvZiByZXZpc2lvbiBvciBpbXByb3ZlbWVudCwgc3VjaCBhcyB0aG9zZSB3aXRoIFxcXCJjaXRhdGlvbiBuZWVkZWRcXFwiIHRhZ3MuIFN0dWRlbnRzIHdpbGwgZmluZCByZWxpYWJsZSBzb3VyY2VzIHRvIHVzZSBhcyByZWZlcmVuY2VzIGZvciB1bmNpdGVkIGNvbnRlbnQuIFRoaXMgYXNzaWdubWVudCBpbmNsdWRlcyBhIHBlcnN1YXNpdmUgZXNzYXkgaW4gd2hpY2ggc3R1ZGVudHMgbWFrZSBhIGNhc2UgZm9yIHRoZWlyIHN1Z2dlc3RlZCBjaGFuZ2VzLCB3aHkgdGhleSBiZWxpZXZlIHRoZXkgYXJlIHF1YWxpZmllZCB0byBtYWtlIHRob3NlIGNoYW5nZXMsIGFuZCB3aHkgdGhlaXIgc2VsZWN0ZWQgc291cmNlcyBwcm92aWRlIHN1cHBvcnQuIEFmdGVyIG1ha2luZyB0aGVpciBjb250cmlidXRpb25zLCBzdHVkZW50cyByZWZsZWN0IG9uIHRoZWlyIHdvcmsgd2l0aCBhIGZvcm1hbCBwYXBlciwgYW5kIGRpc2N1c3Mgd2hldGhlciB0aGV5J3ZlIGFjY29tcGxpc2hlZCB0aGVpciBzdGF0ZWQgZ29hbHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYXJnZSBjbGFzc2VzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgRklORCBBTkQgRklYIEVSUk9SU1xuICBmaW5kZml4OiBcbiAgICB0aXRsZTogXCJGaW5kIGFuZCBmaXggZXJyb3JzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gZmluZCBhbiBhcnRpY2xlIGFib3V0IGEgY291cnNlLXJlbGF0ZWQgdG9waWMgd2l0aCB3aGljaCB0aGV5IGFyZSBleHRyZW1lbHkgZmFtaWxpYXIgdGhhdCBoYXMgc29tZSBtaXN0YWtlcy4gU3R1ZGVudHMgdGFrZSB3aGF0IHRoZXkga25vdyBhYm91dCB0aGUgdG9waWMsIGZpbmQgZmFjdHVhbCBlcnJvcnMgYW5kIG90aGVyIHN1YnN0YW50aXZlIG1pc3Rha2VzLCBhbmQgY29ycmVjdCB0aG9zZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIElkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVxuICBwbGFnaWFyaXNtOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHNlYXJjaCB0aHJvdWdoIFdpa2lwZWRpYSBhcnRpY2xlcyB0byBmaW5kIGluc3RhbmNlcyBvZiBjbG9zZSBwYXJhcGhyYXNpbmcgb3IgcGxhZ2lhcmlzbSwgdGhlbiByZXdvcmQgdGhlIGluZm9ybWF0aW9uIGluIHRoZWlyIG93biBsYW5ndWFnZSB0byBiZSBhcHByb3ByaWF0ZSBmb3IgV2lraXBlZGlhLiBJbiB0aGlzIGFzc2lnbm1lbnQsIHN0dWRlbnRzIGdhaW4gYSBkZWVwZXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IHBsYWdpYXJpc20gaXMgYW5kIGhvdyB0byBhdm9pZCBpdC5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjVFJBTlNMQVRFIEFOIEFSVElDTEUgVE8gRU5HTElTSFxuICB0cmFuc2xhdGU6IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiVGhpcyBpcyBhIHByYWN0aWNhbCBhc3NpZ25tZW50IGZvciBsYW5ndWFnZSBpbnN0cnVjdG9ycy4gU3R1ZGVudHMgc2VsZWN0IGEgV2lraXBlZGlhIGFydGljbGUgaW4gdGhlIGxhbmd1YWdlIHRoZXkgYXJlIHN0dWR5aW5nLCBhbmQgdHJhbnNsYXRlIGl0IGludG8gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBTdHVkZW50cyBzaG91bGQgc3RhcnQgd2l0aCBoaWdoLXF1YWxpdHkgYXJ0aWNsZXMgd2hpY2ggYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBUaGlzIGFzc2lnbm1lbnQgcHJvdmlkZXMgcHJhY3RpY2FsIHRyYW5zbGF0aW9uIGFkdmljZSB3aXRoIHRoZSBpbmNlbnRpdmUgb2YgcmVhbCBwdWJsaWMgc2VydmljZSwgYXMgc3R1ZGVudHMgZXhwYW5kIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGN1bHR1cmUgb24gV2lraXBlZGlhLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNisgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhbmd1YWdlIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHRyYW5zbGF0aW5nIDxlbT5mcm9tPC9lbT4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlIHRvIHRoZSBsYW5ndWFnZSB0aGV5J3JlIHN0dWR5aW5nXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjQ09QWSBFRElUSU5HXG4gIGNvcHllZGl0OiBcbiAgICB0aXRsZTogXCJDb3B5ZWRpdFwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGNvcHllZGl0IFdpa2lwZWRpYSBhcnRpY2xlcywgZW5nYWdpbmcgZWRpdG9ycyBpbiBjb252ZXJzYXRpb24gYWJvdXQgdGhlaXIgd3JpdGluZyBhbmQgaW1wcm92aW5nIHRoZSBjbGFyaXR5IG9mIHRoZSBsYW5ndWFnZSBvZiB0aGUgbWF0ZXJpYWwuIFN0dWRlbnRzIGxlYXJuIHRvIHdyaXRlIGluIGRpZmZlcmVudCB2b2ljZXMgZm9yIGRpZmZlcmVudCBhdWRpZW5jZXMuIEluIGxlYXJuaW5nIGFib3V0IHRoZSBzcGVjaWZpYyB2b2ljZSBvbiBXaWtpcGVkaWEsIHRoZXkgbGVhcm4gYWJvdXQgdGhlIOKAnGF1dGhvcml0YXRpdmXigJ0gdm9pY2UgYW5kIGhvdyBpdHMgdG9uZSBjYW4gY29udmluY2UsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgaXMgcXVlc3Rpb25hYmxlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiRW5nbGlzaCBncmFtbWFyIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgc3Ryb25nIHdyaXRpbmcgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjRVZBTFVBVEUgQVJUSUNMRVNcbiAgZXZhbHVhdGU6IFxuICAgIHRpdGxlOiBcIkV2YWx1YXRlIGFydGljbGVzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJGaXJzdCwgc3R1ZGVudHMgd3JpdGUgYSByZXBvcnQgYW5hbHl6aW5nIHRoZSBzdGF0ZSBvZiBXaWtpcGVkaWEgYXJ0aWNsZXMgb24gY291cnNlLXJlbGF0ZWQgdG9waWNzIHdpdGggYW4gZXllIHRvd2FyZCBmdXR1cmUgcmV2aXNpb25zLiBUaGlzIGVuY291cmFnZXMgYSBjcml0aWNhbCByZWFkaW5nIG9mIGJvdGggY29udGVudCBhbmQgZm9ybS4gVGhlbiwgdGhlIHN0dWRlbnRzIGVkaXQgYXJ0aWNsZXMgaW4gc2FuZGJveGVzIHdpdGggZmVlZGJhY2sgZnJvbSB0aGUgcHJvZmVzc29yLCBjYXJlZnVsbHkgc2VsZWN0aW5nIGFuZCBhZGRpbmcgcmVmZXJlbmNlcyB0byBpbXByb3ZlIHRoZSBhcnRpY2xlIGJhc2VkIG9uIHRoZWlyIGNyaXRpY2FsIGVzc2F5cy4gRmluYWxseSwgdGhleSBjb21wb3NlIGEgc2VsZi1hc3Nlc3NtZW50IGV2YWx1YXRpbmcgdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjUgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJDbGFzc2VzIHdpdGggZmV3ZXIgdGhhbiAzMCBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2Ugc3VydmV5IGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgQUREIElNQUdFUyBPUiBNVUxUSU1FRElBXG4gIG11bHRpbWVkaWE6IFxuICAgIHRpdGxlOiBcIiBBZGQgaW1hZ2VzIG9yIG11bHRpbWVkaWFcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIklmIHlvdXIgc3R1ZGVudHMgYXJlIGFkZXB0IGF0IG1lZGlhLCB0aGlzIGNhbiBiZSBhIGdyZWF0IHdheSBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhIGluIGEgbm9uLXRleHR1YWwgd2F5LiBJbiB0aGUgcGFzdCwgc3R1ZGVudHMgaGF2ZSBwaG90b2dyYXBoZWQgbG9jYWwgbW9udW1lbnRzIHRvIGlsbHVzdHJhdGUgYXJ0aWNsZXMsIGRlc2lnbmVkIGluZm9ncmFwaGljcyB0byBpbGx1c3RyYXRlIGNvbmNlcHRzLCBvciBjcmVhdGVkIHZpZGVvcyB0aGF0IGRlbW9uc3RyYXRlZCBhdWRpby12aXN1YWxseSB3aGF0IGFydGljbGVzIGRlc2NyaWJlIGluIHdvcmRzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgc3R1ZHlpbmcgcGhvdG9ncmFwaHksIHZpZGVvZ3JhcGh5LCBvciBncmFwaGljIGRlc2lnblwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBtZWRpYSBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ291cnNlSW5mb1xuIiwiV2l6YXJkU3RlcElucHV0cyA9XG4gIGludHJvOiBcbiAgICB0ZWFjaGVyOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgbmFtZSdcbiAgICAgIGlkOiAndGVhY2hlcidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvdXJzZV9uYW1lOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0NvdXJzZSBuYW1lJ1xuICAgICAgaWQ6ICdjb3Vyc2VfbmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzY2hvb2w6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnVW5pdmVyc2l0eSdcbiAgICAgIGlkOiAnc2Nob29sJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIHN1YmplY3Q6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnU3ViamVjdCdcbiAgICAgIGlkOiAnc3ViamVjdCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdHVkZW50czpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdBcHByb3hpbWF0ZSBudW1iZXIgb2Ygc3R1ZGVudHMnXG4gICAgICBpZDogJ3N0dWRlbnRzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgaW5zdHJ1Y3Rvcl91c2VybmFtZTpcbiAgICAgIGxhYmVsOiAnVXNlcm5hbWUgKHRlbXBvcmFyeSknXG4gICAgICBpZDogJ2luc3RydWN0b3JfdXNlcm5hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuXG4gICAgd2l6YXJkX3N0YXJ0X2RhdGU6XG4gICAgICBpc0RhdGU6IHRydWVcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHdpemFyZF9lbmRfZGF0ZTpcbiAgICAgIGlzRGF0ZTogdHJ1ZVxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICBpbWFnZV9zdHVmZjpcbiAgICB3YW50X2ltYWdlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICd3YW50X2ltYWdlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnWW91IFdhbnQgSW1hZ2U/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgbXVsdGltZWRpYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgY29weWVkaXQ6IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgc29tZXRoaW5nX2Vsc2U6XG4gICAgICB0eXBlOiAnbGluaydcbiAgICAgIGhyZWY6ICdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZydcbiAgICAgIGlkOiAnc29tZXRoaW5nX2Vsc2UnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQSBkaWZmZXJlbnQgYXNzaWdubWVudD8gR2V0IGluIHRvdWNoIGhlcmUuJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogZmFsc2VcbiAgICAgIHRpcEluZm86XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBcIkhhdmUgYW5vdGhlciBpZGVhIGZvciBpbmNvcnBvcmF0aW5nIFdpa2lwZWRpYSBpbnRvIHlvdXIgY2xhc3M/IFdlJ3ZlIGZvdW5kIHRoYXQgdGhlc2UgYXNzaWdubWVudHMgd29yayB3ZWxsLCBidXQgdGhleSBhcmVuJ3QgdGhlIG9ubHkgd2F5IHRvIGRvIGl0LiBHZXQgaW4gdG91Y2gsIGFuZCB3ZSBjYW4gdGFsayB0aGluZ3MgdGhyb3VnaDogPGEgc3R5bGU9J2NvbG9yOiM1MDVhN2Y7JyBocmVmPSdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZyc+Y29udGFjdEB3aWtpZWR1Lm9yZzwvYT4uXCJcblxuXG4gICAgIyBldmFsdWF0ZTpcbiAgICAjICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICMgICBpZDogJ2V2YWx1YXRlJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgbGFiZWw6ICdFdmFsdWF0ZSBhcnRpY2xlcydcbiAgICAjICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICMgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgIyAgIGRpc2FibGVkOiB0cnVlXG5cbiAgICAjIHNvdXJjZWNlbnRlcmVkOlxuICAgICMgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgIyAgIGlkOiAnc291cmNlY2VudGVyZWQnXG4gICAgIyAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICMgICBsYWJlbDogJ1NvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnMnXG4gICAgIyAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAjICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICMgICBkaXNhYmxlZDogdHJ1ZVxuXG4gICAgIyBmaW5kZml4OlxuICAgICMgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgIyAgIGlkOiAnZmluZGZpeCdcbiAgICAjICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgIyAgIGxhYmVsOiAnRmluZCBhbmQgZml4IGVycm9ycydcbiAgICAjICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICMgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgIyAgIGRpc2FibGVkOiB0cnVlXG5cbiAgICBcbiAgICAjIHBsYWdpYXJpc206XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdwbGFnaWFyaXNtJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgbGFiZWw6ICdJZGVudGlmeSBhbmQgZml4IHBsYWdpYXJpc20nXG4gICAgIyAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAjICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICMgICBkaXNhYmxlZDogdHJ1ZVxuICAgXG4gIGxlYXJuaW5nX2Vzc2VudGlhbHM6IFxuICAgIGNyZWF0ZV91c2VyOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NyZWF0ZV91c2VyJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JlYXRlIHVzZXIgYWNjb3VudCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIGVucm9sbDpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdlbnJvbGwnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdFbnJvbGwgdG8gdGhlIGNvdXJzZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdDb21wbGV0ZSBvbmxpbmUgdHJhaW5pbmcnXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGludHJvZHVjZV9hbWJhc3NhZG9yczpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbnRyb2R1Y2VfYW1iYXNzYWRvcnMnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnSW50cm9kdWNlIFdpa2lwZWRpYSBBbWJhc3NhZG9ycyBJbnZvbHZlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgIyBpbmNsdWRlX2NvbXBsZXRpb246XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdpbmNsdWRlX2NvbXBsZXRpb24nXG4gICAgIyAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICMgICBsYWJlbDogJ0luY2x1ZGUgQ29tcGxldGlvbiBvZiB0aGlzIEFzc2lnbm1lbnQgYXMgUGFydCBvZiB0aGUgU3R1ZGVudHNcXCdzIEdyYWRlJ1xuICAgICMgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICB0cmFpbmluZ19ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHRyYWluaW5nX25vdF9ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX25vdF9ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIG5vdCBiZSBncmFkZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgZ2V0dGluZ19zdGFydGVkOiBcbiAgICBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JpdGlxdWUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGFkZF90b19hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdhZGRfdG9fYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0FkZCB0byBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gICAgY29weV9lZGl0X2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHlfZWRpdF9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIGlsbHVzdHJhdGVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gIFxuXG4gIGNob29zaW5nX2FydGljbGVzOiBcbiAgICBwcmVwYXJlX2xpc3Q6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3ByZXBhcmVfbGlzdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIFxuICAgIHN0dWRlbnRzX2V4cGxvcmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3N0dWRlbnRzX2V4cGxvcmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHJlcXVlc3RfaGVscDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVxdWVzdF9oZWxwJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIG9yIGV2YXVsYXRpbmcgYXJ0aWNsZSBjaG9pY2VzPydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgY29uZGl0aW9uYWxfbGFiZWw6IFxuICAgICAgICBwcmVwYXJlX2xpc3Q6IFwiV291bGQgeW91IGxpa2UgaGVscCBzZWxlY3RpbmcgYXJ0aWNsZXM/XCJcbiAgICAgICAgc3R1ZGVudHNfZXhwbG9yZTogXCJXb3VsZCB5b3UgbGlrZSBoZWxwIGV2YWx1YXRpbmcgc3R1ZGVudCBjaG9pY2VzP1wiXG4gICAgICBcblxuXG4gIHJlc2VhcmNoX3BsYW5uaW5nOiBcbiAgICBjcmVhdGVfb3V0bGluZTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY3JlYXRlX291dGxpbmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVHJhZGl0aW9uYWwgb3V0bGluZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiVHJhZGl0aW9uYWwgb3V0bGluZVwiXG4gICAgICAgIGNvbnRlbnQ6IFwiRm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhbiBvdXRsaW5lIHRoYXQgcmVmbGVjdHMgdGhlIGltcHJvdmVtZW50cyB0aGV5IHBsYW4gdG8gbWFrZSwgYW5kIHRoZW4gcG9zdCBpdCB0byB0aGUgYXJ0aWNsZSdzIHRhbGsgcGFnZS4gVGhpcyBpcyBhIHJlbGF0aXZlbHkgZWFzeSB3YXkgdG8gZ2V0IHN0YXJ0ZWQuXCJcbiAgICBcbiAgICB3cml0ZV9sZWFkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3cml0ZV9sZWFkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgbGVhZCBzZWN0aW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIldpa2lwZWRpYSBsZWFkIHNlY3Rpb25cIlxuICAgICAgICBjb250ZW50OlxuICAgICAgICAgIFwiPHA+Rm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhIHdlbGwtYmFsYW5jZWQgc3VtbWFyeSBvZiBpdHMgZnV0dXJlIHN0YXRlIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbi4gVGhlIGlkZWFsIGxlYWQgc2VjdGlvbiBleGVtcGxpZmllcyBXaWtpcGVkaWEncyBzdW1tYXJ5IHN0eWxlIG9mIHdyaXRpbmc6IGl0IGJlZ2lucyB3aXRoIGEgc2luZ2xlIHNlbnRlbmNlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHBsYWNlcyBpdCBpbiBjb250ZXh0LCBhbmQgdGhlbiDigJQgaW4gb25lIHRvIGZvdXIgcGFyYWdyYXBocywgZGVwZW5kaW5nIG9uIHRoZSBhcnRpY2xlJ3Mgc2l6ZSDigJQgaXQgb2ZmZXJzIGEgY29uY2lzZSBzdW1tYXJ5IG9mIHRvcGljLiBBIGdvb2QgbGVhZCBzZWN0aW9uIHNob3VsZCByZWZsZWN0IHRoZSBtYWluIHRvcGljcyBhbmQgYmFsYW5jZSBvZiBjb3ZlcmFnZSBvdmVyIHRoZSB3aG9sZSBhcnRpY2xlLjwvcD5cbiAgICAgICAgICA8cD5PdXRsaW5pbmcgYW4gYXJ0aWNsZSB0aGlzIHdheSBpcyBhIG1vcmUgY2hhbGxlbmdpbmcgYXNzaWdubWVudCDigJQgYW5kIHdpbGwgcmVxdWlyZSBtb3JlIHdvcmsgdG8gZXZhbHVhdGUgYW5kIHByb3ZpZGUgZmVlZGJhY2sgZm9yLiBIb3dldmVyLCBpdCBjYW4gYmUgbW9yZSBlZmZlY3RpdmUgZm9yIHRlYWNoaW5nIHRoZSBwcm9jZXNzIG9mIHJlc2VhcmNoLCB3cml0aW5nLCBhbmQgcmV2aXNpb24uIFN0dWRlbnRzIHdpbGwgcmV0dXJuIHRvIHRoaXMgbGVhZCBzZWN0aW9uIGFzIHRoZXkgZ28sIHRvIGd1aWRlIHRoZWlyIHdyaXRpbmcgYW5kIHRvIHJldmlzZSBpdCB0byByZWZsZWN0IHRoZWlyIGltcHJvdmVkIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHRvcGljIGFzIHRoZWlyIHJlc2VhcmNoIHByb2dyZXNzZXMuIFRoZXkgd2lsbCB0YWNrbGUgV2lraXBlZGlhJ3MgZW5jeWNsb3BlZGljIHN0eWxlIGVhcmx5IG9uLCBhbmQgdGhlaXIgb3V0bGluZSBlZmZvcnRzIHdpbGwgYmUgYW4gaW50ZWdyYWwgcGFydCBvZiB0aGVpciBmaW5hbCB3b3JrLjwvcD5cIlxuICAgICAgICBcblxuXG4gIGRyYWZ0c19tYWluc3BhY2U6IFxuICAgIHdvcmtfbGl2ZTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd29ya19saXZlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvcmsgbGl2ZSBmcm9tIHRoZSBzdGFydCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgIFxuICAgIHNhbmRib3g6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3NhbmRib3gnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRHJhZnQgZWFybHkgd29yayBpbiBzYW5kYm94ZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICBcblxuICBwZWVyX2ZlZWRiYWNrOiBcbiAgICBwZWVyX3Jldmlld3M6XG4gICAgICB0eXBlOiAncmFkaW9Hcm91cCdcbiAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgbGFiZWw6ICcnXG4gICAgICB2YWx1ZTogJ3R3bydcbiAgICAgIHNlbGVjdGVkOiAxXG4gICAgICBvdmVydmlld0xhYmVsOiAnVHdvIHBlZXIgcmV2aWV3J1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDBcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMSdcbiAgICAgICAgICB2YWx1ZTogJ29uZSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnT25lIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMVxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcyJ1xuICAgICAgICAgIHZhbHVlOiAndHdvJ1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ1R3byBwZWVyIHJldmlldydcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDJcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMydcbiAgICAgICAgICB2YWx1ZTogJ3RocmVlJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUaHJlZSBwZWVyIHJldmlldydcblxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogM1xuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICc0J1xuICAgICAgICAgIHZhbHVlOiAnZm91cidcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnRm91ciBwZWVyIHJldmlldydcblxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogNFxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICc1J1xuICAgICAgICAgIHZhbHVlOiAnZml2ZSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnRml2ZSBwZWVyIHJldmlldydcbiAgICAgICAgfVxuICAgICAgXVxuICAgIFxuICBcblxuICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOiBcbiAgICBjbGFzc19ibG9nOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19ibG9nJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ2xhc3MgYmxvZyBvciBkaXNjdXNzaW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiAnQ2xhc3MgYmxvZyBvciBjbGFzcyBkaXNjdXNzaW9uJ1xuICAgICAgICBjb250ZW50OiAnU3R1ZGVudHMga2VlcCBhIHJ1bm5pbmcgYmxvZyBhYm91dCB0aGVpciBleHBlcmllbmNlcy4gR2l2aW5nIHRoZW0gcHJvbXB0cyBldmVyeSB3ZWVrIG9yIHR3bywgc3VjaCBhcyDigJxUbyB3aGF0IGV4dGVudCBhcmUgdGhlIGVkaXRvcnMgb24gV2lraXBlZGlhIGEgc2VsZi1zZWxlY3RpbmcgZ3JvdXAgYW5kIHdoeT/igJ0gd2lsbCBoZWxwIHRoZW0gdGhpbmsgYWJvdXQgdGhlIGxhcmdlciBpc3N1ZXMgc3Vycm91bmRpbmcgdGhpcyBvbmxpbmUgZW5jeWNsb3BlZGlhIGNvbW11bml0eS4gSXQgd2lsbCBhbHNvIGdpdmUgeW91IG1hdGVyaWFsIGJvdGggb24gdGhlIHdpa2kgYW5kIG9mZiB0aGUgd2lraSB0byBncmFkZS4gSWYgeW91IGhhdmUgdGltZSBpbiBjbGFzcywgdGhlc2UgZGlzY3Vzc2lvbnMgY2FuIGJlIHBhcnRpY3VsYXJseSBjb25zdHJ1Y3RpdmUgaW4gcGVyc29uLidcbiAgICAgIFxuICAgIGNsYXNzX3ByZXNlbnRhdGlvbjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdJbi1jbGFzcyBwcmVzZW50YXRpb24gb2YgV2lraXBlZGlhIHdvcmsnXG4gICAgICAgIGNvbnRlbnQ6IFwiRWFjaCBzdHVkZW50IG9yIGdyb3VwIHByZXBhcmVzIGEgc2hvcnQgcHJlc2VudGF0aW9uIGZvciB0aGUgY2xhc3MsIGV4cGxhaW5pbmcgd2hhdCB0aGV5IHdvcmtlZCBvbiwgd2hhdCB3ZW50IHdlbGwgYW5kIHdoYXQgZGlkbid0LCBhbmQgd2hhdCB0aGV5IGxlYXJuZWQuIFRoZXNlIHByZXNlbnRhdGlvbnMgY2FuIG1ha2UgZXhjZWxsZW50IGZvZGRlciBmb3IgY2xhc3MgZGlzY3Vzc2lvbnMgdG8gcmVpbmZvcmNlIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgZ29hbHMuXCJcbiAgICAgIFxuICAgIHJlZmxlY3RpdmVfZXNzYXk6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlZmxlY3RpdmVfZXNzYXknXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgIGNvbnRlbnQ6IFwiQXNrIHN0dWRlbnRzIHRvIHdyaXRlIGEgc2hvcnQgcmVmbGVjdGl2ZSBlc3NheSBvbiB0aGVpciBleHBlcmllbmNlcyB1c2luZyBXaWtpcGVkaWEuIFRoaXMgd29ya3Mgd2VsbCBmb3IgYm90aCBzaG9ydCBhbmQgbG9uZyBXaWtpcGVkaWEgcHJvamVjdHMuIEFuIGludGVyZXN0aW5nIGl0ZXJhdGlvbiBvZiB0aGlzIGlzIHRvIGhhdmUgc3R1ZGVudHMgd3JpdGUgYSBzaG9ydCB2ZXJzaW9uIG9mIHRoZSBlc3NheSBiZWZvcmUgdGhleSBiZWdpbiBlZGl0aW5nIFdpa2lwZWRpYSwgb3V0bGluaW5nIHRoZWlyIGV4cGVjdGF0aW9ucywgYW5kIHRoZW4gaGF2ZSB0aGVtIHJlZmxlY3Qgb24gd2hldGhlciBvciBub3QgdGhleSBtZXQgdGhvc2UgZXhwZWN0YXRpb25zIGR1cmluZyB0aGUgYXNzaWdubWVudC5cIlxuICAgICAgXG4gICAgcG9ydGZvbGlvOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdwb3J0Zm9saW8nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICAgIGNvbnRlbnQ6IFwiU3R1ZGVudHMgb3JnYW5pemUgdGhlaXIgV2lraXBlZGlhIHdvcmsgaW50byBhIHBvcnRmb2xpbywgaW5jbHVkaW5nIGEgbmFycmF0aXZlIG9mIHRoZSBjb250cmlidXRpb25zIHRoZXkgbWFkZSDigJQgYW5kIGhvdyB0aGV5IHdlcmUgcmVjZWl2ZWQsIGFuZCBwb3NzaWJseSBjaGFuZ2VkLCBieSBvdGhlciBXaWtpcGVkaWFucyDigJQgYW5kIGxpbmtzIHRvIHRoZWlyIGtleSBlZGl0cy4gQ29tcG9zaW5nIHRoaXMgcG9ydGZvbGlvIHdpbGwgaGVscCBzdHVkZW50cyB0aGluayBtb3JlIGRlZXBseSBhYm91dCB0aGVpciBXaWtpcGVkaWEgZXhwZXJpZW5jZXMsIGFuZCBhbHNvIHByb3ZpZGVzIGEgbGVucyB0aHJvdWdoIHdoaWNoIHRvIHVuZGVyc3RhbmQg4oCUIGFuZCBncmFkZSDigJQgdGhlaXIgd29yay5cIlxuICAgIFxuICAgIG9yaWdpbmFsX3BhcGVyOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdvcmlnaW5hbF9wYXBlcidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgICAgY29udGVudDogXCJJbiBjb3Vyc2VzIHRoYXQgZW1waGFzaXplIHRyYWRpdGlvbmFsIHJlc2VhcmNoIHNraWxscyBhbmQgdGhlIGRldmVsb3BtZW50IG9mIG9yaWdpbmFsIGlkZWFzIHRocm91Z2ggYSB0ZXJtIHBhcGVyLCBXaWtpcGVkaWEncyBwb2xpY3kgb2YgXFxcIm5vIG9yaWdpbmFsIHJlc2VhcmNoXFxcIiBtYXkgYmUgdG9vIHJlc3RyaWN0aXZlLiBNYW55IGluc3RydWN0b3JzIHBhaXIgV2lraXBlZGlhIHdyaXRpbmcgd2l0aCBhIGNvbXBsZW1lbnRhcnkgYW5hbHl0aWNhbCBwYXBlcjsgc3R1ZGVudHPigJkgV2lraXBlZGlhIGFydGljbGVzIHNlcnZlIGFzIGEgbGl0ZXJhdHVyZSByZXZpZXcsIGFuZCB0aGUgc3R1ZGVudHMgZ28gb24gdG8gZGV2ZWxvcCB0aGVpciBvd24gaWRlYXMgYW5kIGFyZ3VtZW50cyBpbiB0aGUgb2ZmbGluZSBhbmFseXRpY2FsIHBhcGVyLlwiXG4gICAgXG4gIGR5azpcbiAgICBkeWs6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2R5aydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RpZCBZb3UgS25vdz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgZ2E6IFxuICAgIGdhOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdnYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0dvb2QgQXJ0aWNsZSBub21pbmF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIFxuXG4gIGdyYWRpbmc6IFxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgV2lraXBlZGlhIHRyYWluaW5nJ1xuICAgICAgaWQ6ICdjb21wbGV0ZV90cmFpbmluZydcbiAgICAgIHZhbHVlOiA1XG4gICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIF1cblxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdFYXJseSBXaWtpcGVkaWEgZXhlcmNpc2VzJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogMTUgICBcbiAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgIG91dGxpbmVfcXVhbGl0eTpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgaWQ6ICdvdXRsaW5lX3F1YWxpdHknXG4gICAgICBsYWJlbDogJ1F1YWxpdHkgb2YgYmlibGlvZ3JhcGh5IGFuZCBvdXRsaW5lJ1xuICAgICAgdmFsdWU6IDEwICAgXG4gICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICBwZWVyX3Jldmlld3M6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnUGVlciByZXZpZXdzIGFuZCBjb2xsYWJvcmF0aW9uIHdpdGggY2xhc3NtYXRlcydcbiAgICAgIHZhbHVlOiAxMCAgIFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgY29udHJpYnV0aW9uX3F1YWxpdHk6XG4gICAgICB0eXBlOiAncGVyY2VudCcgXG4gICAgICBpZDogJ2NvbnRyaWJ1dGlvbl9xdWFsaXR5J1xuICAgICAgbGFiZWw6ICdRdWFsaXR5IG9mIHlvdXIgbWFpbiBXaWtpcGVkaWEgY29udHJpYnV0aW9ucydcbiAgICAgIHZhbHVlOiA1MFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgIHR5cGU6ICdwZXJjZW50JyBcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAxMFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgICdjbGFzc19ibG9nJ1xuICAgICAgICAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgICAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgICAgJ3BvcnRmb2xpbydcbiAgICAgICAgJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgXVxuXG4gICAgI0ZVTExcblxuICAgICMgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgV2lraXBlZGlhIHRyYWluaW5nJ1xuICAgICMgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICMgICB2YWx1ZTogMVxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICMgcHJhY3RpY2VfY29tbXVuaWNhdGlvbjpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnXCJQcmFjdGljZSBvbi13aWtpIGNvbW11bmljYXRpb25cIiBleGVyY2lzZSdcbiAgICAjICAgaWQ6ICdwcmFjdGljZV9jb21tdW5pY2F0aW9uJ1xuICAgICMgICB2YWx1ZTogMSAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBwcmFjdGljZV9jb21tdW5pY2F0aW9uOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgbGFiZWw6ICdcIlByYWN0aWNlIG9uLXdpa2kgY29tbXVuaWNhdGlvblwiIGV4ZXJjaXNlJ1xuICAgICMgICBpZDogJ3ByYWN0aWNlX2NvbW11bmljYXRpb24nXG4gICAgIyAgIHZhbHVlOiAxICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGNvcHlfZWRpdF9hcnRpY2xlOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgbGFiZWw6ICdcIkNvcHllZGl0IGFuIGFydGljbGVcIiBleGVyY2lzZSdcbiAgICAjICAgaWQ6ICdwcmFjdGljZV9jb21tdW5pY2F0aW9uJ1xuICAgICMgICB2YWx1ZTogMSAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgbGFiZWw6ICdcIkV2YWx1YXRlIGFuIGFydGljbGVcIiBleGVyY2lzZSdcbiAgICAjICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICMgICB2YWx1ZTogMSAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBhZGRfdG9fYXJ0aWNsZTpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnXCJBZGQgdG8gYW4gYXJ0aWNsZVwiIGV4ZXJjaXNlJ1xuICAgICMgICBpZDogJ2FkZF90b19hcnRpY2xlJ1xuICAgICMgICB2YWx1ZTogMSAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBpbGx1c3RyYXRlX2FydGljbGU6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ1wiSWxsdXN0cmF0ZSBhbiBhcnRpY2xlXCIgZXhlcmNpc2UnXG4gICAgIyAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICMgICB2YWx1ZTogMSAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBvdXRsaW5lX3F1YWxpdHk6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBpZDogJ291dGxpbmVfcXVhbGl0eSdcbiAgICAjICAgbGFiZWw6ICdRdWFsaXR5IG9mIGJpYmxpb2dyYXBoeSBhbmQgb3V0bGluZSdcbiAgICAjICAgdmFsdWU6IDIgICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIHBlZXJfcmV2aWV3czpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICMgICBsYWJlbDogJ1BlZXIgcmV2aWV3cyBhbmQgY29sbGFib3JhdGlvbiB3aXRoIGNsYXNzbWF0ZXMnXG4gICAgIyAgIHZhbHVlOiAyICAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBjbGFzc19wYXJ0aWNpcGF0aW9uOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgaWQ6ICdjbGFzc19wYXJ0aWNpcGF0aW9uJ1xuICAgICMgICBsYWJlbDogJ1BhcnRpY2lwYXRpb24gaW4gY2xhc3MgZGlzY3Vzc2lvbnMnXG4gICAgIyAgIHZhbHVlOiAyICAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBjb250cmlidXRpb25fcXVhbGl0eTpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGlkOiAnY29udHJpYnV0aW9uX3F1YWxpdHknXG4gICAgIyAgIGxhYmVsOiAnUXVhbGl0eSBvZiB5b3VyIG1haW4gV2lraXBlZGlhIGNvbnRyaWJ1dGlvbnMnXG4gICAgIyAgIHZhbHVlOiAxMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICMgcmVmbGVjdGl2ZV9lc3NheTpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGlkOiAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAjICAgbGFiZWw6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICMgICB2YWx1ZTogMiAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICMgb3JpZ2luYWxfcGFwZXI6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICMgICBsYWJlbDogJ09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyJ1xuICAgICMgICB2YWx1ZTogMTAgICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGNsYXNzX3ByZXNlbnRhdGlvbjpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGlkOiAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICMgICBsYWJlbDogJ0luLWNsYXNzIHByZXNlbnRhdGlvbiBvZiBjb250cmlidXRpb25zJ1xuICAgICMgICB2YWx1ZTogMiBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICBncmFkaW5nX3NlbGVjdGlvbjpcbiAgICAgIGxhYmVsOiAnR3JhZGluZyBiYXNlZCBvbjonXG4gICAgICBpZDogJ2dyYWRpbmdfc2VsZWN0aW9uJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZW5kZXJJbk91dHB1dDogZmFsc2VcbiAgICAgIG9wdGlvbnM6IFxuICAgICAgICBwZXJjZW50OiBcbiAgICAgICAgICBsYWJlbDogJ1BlcmNlbnRhZ2UnXG4gICAgICAgICAgdmFsdWU6ICdwZXJjZW50J1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIHBvaW50czpcbiAgICAgICAgICBsYWJlbDogJ1BvaW50cydcbiAgICAgICAgICB2YWx1ZTogJ3BvaW50cydcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcblxuXG4gIG92ZXJ2aWV3OiBcbiAgICBsZWFybmluZ19lc3NlbnRpYWxzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgZXNzZW50aWFscydcbiAgICAgIGlkOiAnbGVhcm5pbmdfZXNzZW50aWFscydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIGNob29zaW5nX2FydGljbGVzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICByZXNlYXJjaF9wbGFubmluZzpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuXG4gICAgd2l6YXJkX3N0YXJ0X2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgICBcblxuXG5cblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZFN0ZXBJbnB1dHNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgVmlld0hlbHBlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoICdsaW5rJywgKCB0ZXh0LCB1cmwgKSAtPlxuXG4gIHRleHQgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHRleHQgKVxuICB1cmwgID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB1cmwgKVxuXG4gIHJlc3VsdCA9ICc8YSBocmVmPVwiJyArIHVybCArICdcIj4nICsgdGV4dCArICc8L2E+J1xuXG4gIHJldHVybiBuZXcgSGFuZGxlYmFycy5TYWZlU3RyaW5nKCByZXN1bHQgKVxuKVxuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCgnY291cnNlRGV0YWlscycsICdzdXAyJykiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIC0gQXBwbGljYXRpb24gSW5pdGl0aWFsaXplclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4vYXBwJylcblxuXG4kIC0+XG5cbiAgIyBJbml0aWFsaXplIEFwcGxpY2F0aW9uXG4gIGFwcGxpY2F0aW9uLmluaXRpYWxpemUoKVxuXG4gICMgU3RhcnQgQmFja2JvbmUgcm91dGVyXG4gIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKVxuXG5cbiAgIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5Nb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9zdXBlcnMvTW9kZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBNb2RlbCBleHRlbmRzIE1vZGVsXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBJTkhFUklURUQgLyBPVkVSUklERVNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBFVkVOVCBIQU5ETEVSU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgLSBSb3V0ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBSb3V0ZXNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFxuICByb3V0ZXM6XG4gICAgJycgOiAnaG9tZSdcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEhhbmRsZXJzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBob21lOiAtPlxuICAgIGlmICQoJyNhcHAnKS5sZW5ndGggPiAwXG5cbiAgICAgIEBjdXJyZW50V2lraVVzZXIgPSAkKCAnI2FwcCcgKS5hdHRyKCdkYXRhLXdpa2l1c2VyJylcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snaW50cm8nXVsnaW5zdHJ1Y3Rvcl91c2VybmFtZSddWyd2YWx1ZSddID0gQGN1cnJlbnRXaWtpVXNlclxuXG4gICAgICAkKCAnI2FwcCcgKS5odG1sKGFwcGxpY2F0aW9uLmhvbWVWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwJylcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwJykpXG5cbiAgICAgIGVsc2UgaWYgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcGlkJylcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG9JZCcsIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXBpZCcpKVxuXG5cbiAgICBlbHNlIGlmICQoJyNsb2dpbicpLmxlbmd0aCA+IDBcblxuICAgICAgKCQgJyNsb2dpbicpLmh0bWwoYXBwbGljYXRpb24ubG9naW5WaWV3LnJlbmRlcigpLmVsKVxuXG4gICNcbiAgIyBVdGlsaXRpZXNcbiAgI1xuXG4gIGdldFBhcmFtZXRlckJ5TmFtZTogKG5hbWUpIC0+XG5cbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpXG5cbiAgICByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpXG5cbiAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpXG5cbiAgICAoaWYgbm90IHJlc3VsdHM/IHRoZW4gXCJcIiBlbHNlIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpKVxuXG5cbiIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEhvbWUgUGFnZSBUZW1wbGF0ZVxcbi0tPlxcblxcbjwhLS0gTUFJTiBBUFAgQ09OVEVOVCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXBzIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5jb250ZW50IC0tPlxcblxcblwiO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtX19zdWJ0aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgICAgICAgIDxwIGNsYXNzPVxcXCJsYXJnZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxvZ2luX2luc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubG9naW5faW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblxcblxcbiAgPCEtLSBTVEVQUyBNQUlOIENPTlRBSU5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXBzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcCBzdGVwLS1maXJzdCBzdGVwLS1sb2dpblxcXCI+XFxuICAgIFxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICAgICAgICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgICAgICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubG9naW5faW5zdHJ1Y3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcblxcbiAgICAgICAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuICAgICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlXFxcIiBpZD1cXFwibG9naW5CdXR0b25cXFwiIGhyZWY9XFxcIi9hdXRoL21lZGlhd2lraVxcXCI+XFxuICAgICAgICAgICAgTG9naW4gd2l0aCBXaWtpcGVkaWFcXG4gICAgICAgICAgPC9hPlxcblwiXG4gICAgKyBcIlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1hY3Rpb25zIC0tPlxcblxcblxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJkb3Qgc3RlcC1uYXYtaW5kaWNhdG9yc19faXRlbSBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzQWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaGFzVmlzaXRlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgZGF0YS1uYXYtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcFRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj4qPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJhY3RpdmVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcInZpc2l0ZWRcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImluYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm8tYXJyb3cgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogU3RlcCBOYXZpZ2F0aW9uIFxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBOQVYgRE9UIElORElDQVRPUlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtaW5kaWNhdG9ycyBoaWRkZW5cXFwiPlxcblxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnN0ZXBzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWluZGljYXRvcnMgLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIE5BViBCVVRUT05TIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnNcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9ucy0tbm9ybWFsXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tcHJldiBwcmV2IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucHJldkluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiYXJyb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tcmlnaHQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tbGVmdFxcXCI+PC9kaXY+XFxuICAgICAgPC9zcGFuPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucHJldlRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5wcmV2VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICA8L2E+XFxuXFxuICAgIDxhIGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLW5leHQgbmV4dCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLm5leHRJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzTGFzdFN0ZXAsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm5leHRUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubmV4dFRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiYXJyb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tbGVmdDo1cHg7XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1yaWdodFxcXCI+PC9kaXY+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG5cXG5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnMtLWVkaXRcXFwiPlxcbiAgICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdl9fYnV0dG9uLS1leGl0LWVkaXQgY29uZmlybSBleGl0LWVkaXRcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuYmFja1RvT3ZlcnZpZXdUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuYmFja1RvT3ZlcnZpZXdUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1idXR0b25zIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtX19zdWJ0aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFxcbiAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgXFxuICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zZWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9kaXY+XFxuICAgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuICA8IS0tIElOVFJPIFNURVAgRk9STSBBUkVBIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj5cXG4gICAgPCEtLSBmb3JtIGZpZWxkcyAtLT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taW5uZXIgLS0+XFxuXFxuXFxuICA8IS0tIERBVEVTIE1PRFVMRSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1kYXRlc1xcXCI+XFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWRhdGVzIC0tPlxcblxcbiAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcIm5vLWVkaXQtbW9kZVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWUgaW5hY3RpdmVcXFwiIGlkPVxcXCJiZWdpbkJ1dHRvblxcXCIgaHJlZj1cXFwiXFxcIj5cXG4gICAgICAgIFN0YXJ0IGRlc2lnbmluZyBteSBhc3NpZ25tZW50XFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZWRpdC1tb2RlLW9ubHlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGV4aXQtZWRpdFxcXCIgaHJlZj1cXFwiI1xcXCI+XFxuICAgICAgICBCYWNrXFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFyayBzdGVwLWluZm9fX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5mb1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbmZvVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cCBjbGFzcz1cXFwibGFyZ2Ugc3RlcC1pbmZvX19pbnRyb1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gSEVBREVSIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIENPTlRFTlQgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9fY29udGVudCAtLT5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBzdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXJcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlciAtLT5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYWluIEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIEZPUk0gOiBMZWZ0IFNpZGUgb2YgU3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWxheW91dFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1sYXlvdXRfX2lubmVyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgICBcXG4gICAgICA8IS0tIFNURVAgRk9STSBJTk5FUiBDT05URU5UIC0tPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLWlubmVyXFxcIj5cXG4gICAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICAgIDxhIGNsYXNzPVxcXCJtYWluLWxvZ29cXFwiIGhyZWY9XFxcImh0dHA6Ly93aWtpZWR1Lm9yZ1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIHRpdGxlPVxcXCJ3aWtpZWR1Lm9yZ1xcXCI+V0lLSUVEVS5PUkc8L2E+XFxuXFxuICAgIDwhLS0gU1RFUCBJTkZPIElOTkVSIC0tPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8td3JhcHBlclxcXCI+XFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbmZvVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFxcbiAgICAgIDwhLS0gSU5GTyBTRUNUSU9OUyAtLT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG4gICAgXFxuXFxuXFxuICAgIFxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxwPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9wPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGkgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLWdyaWRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRleHQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRleHQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIDogPHNwYW4gY2xhc3M9XFxcInN0YXJzIHN0YXJzLS1cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8gc3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrIFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkFzc2lnbm1lbnQgdHlwZTogXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGV4dFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZGVzY3JpcHRpb24sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk1pbmltdW0gdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm1pbl90aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubWluX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5SZWNvbW1lbmRlZCB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucmVjX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5yZWNfdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QmVzdCBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5iZXN0X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Ob3QgYXBwcm9wcmlhdGUgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubm90X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5MZWFybmluZyBPYmplY3RpdmVzPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubGVhcm5pbmdfb2JqZWN0aXZlcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5jb250ZW50KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5jb250ZW50OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICBcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kaXNhYmxlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJjaGVjay1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm90LWVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGRhdGEtZXhjbHVzaXZlPVxcXCJ0cnVlXFxcIiBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS10ZXh0X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXBlcmNlbnRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1wZXJjZW50X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWNvbnRhaW5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImljb24gaWNvbi0tcGVyY2VudFxcXCI+PC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImljb24gaWNvbi0tcG9pbnRzXFxcIj5wb2ludHM8L2Rpdj5cXG4gICAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50eXBlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgbWF4bGVuZ3RoPVxcXCIyXFxcIiAvPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1lZGl0IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5cXFwiPlxcbiAgPGEgY2xhc3M9XFxcImVkaXQtYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5bZWRpdF08L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2lubmVyIGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2hlYWRlclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIFxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2NvbnRlbnQgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9fY29udGVudFxcXCI+XFxuICAgIDx1bD5cXG4gICAgICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuYXNzaWdubWVudHMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNywgcHJvZ3JhbTE3LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8L3VsPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxsaT5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApKVxuICAgICsgXCI8L2xpPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tbGlua1xcXCI+XFxuICA8bGFiZWw+PGEgaHJlZj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmhyZWYpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9hPjwvbGFiZWw+XFxuICA8ZGl2IGNsYXNzPVxcXCJpbmZvLWljb25cXFwiPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyX19oZWFkZXJcXFwiPlxcbiAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2gyPlxcbiAgPC9kaXY+XFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjIsIHByb2dyYW0yMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW9cXFwiPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyX19oZWFkZXJcXFwiPlxcbiAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXIgY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyLS1ncm91cFxcXCI+XFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjUsIHByb2dyYW0yNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTI1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW8gY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm5hbWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm5hbWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIvPlxcbiAgICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IElucHV0IEl0ZW0gVGVtcGxhdGVzXFxuICBcXG4tLT5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jaGVja2JveCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0JveCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRleHQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTIsIHByb2dyYW0xMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZXJjZW50KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZWRpdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNiwgcHJvZ3JhbTE2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiXG4gICAgKyBcIlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxpbmspLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTksIHByb2dyYW0xOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpbyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMSwgcHJvZ3JhbTIxLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvR3JvdXApLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjQsIHByb2dyYW0yNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYXJrdXAgZm9yIFN0YXJ0L0VuZCBEYXRlIElucHV0IE1vZHVsZVxcbi0tPlxcblxcblxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2xhYmVsXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19pbm5lciBmcm9tXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS15ZWFyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5ZZWFyPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwieWVhclxcXCIgaWQ9XFxcInllYXJTdGFydFxcXCIgbmFtZT1cXFwieWVhclN0YXJ0XFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9zdGFydF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwieWVhclxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNFxcXCI+MjAxNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNVxcXCI+MjAxNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNlxcXCI+MjAxNjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1tb250aFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+TW9udGg8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJtb250aFxcXCIgaWQ9XFxcIm1vbnRoU3RhcnRcXFwiIG5hbWU9XFxcIm1vbnRoU3RhcnRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX3N0YXJ0X2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJtb250aFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1kYXlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPkRheTwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImRheVxcXCIgaWQ9XFxcImRheVN0YXJ0XFxcIiBuYW1lPVxcXCJkYXlTdGFydFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfc3RhcnRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcImRheVxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTNcXFwiPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNFxcXCI+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE1XFxcIj4xNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTZcXFwiPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxN1xcXCI+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE4XFxcIj4xODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTlcXFwiPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMFxcXCI+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIxXFxcIj4yMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjJcXFwiPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyM1xcXCI+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI0XFxcIj4yNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjVcXFwiPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNlxcXCI+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI3XFxcIj4yNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjhcXFwiPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOVxcXCI+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMwXFxcIj4zMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzFcXFwiPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICBcXG5cXG4gIDwvZGl2PlxcbiAgPHNwYW4gY2xhc3M9XFxcImRhdGVzLXRvXFxcIj5cXG4gICAgdG9cXG4gIDwvc3Bhbj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19faW5uZXIgdG9cXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPlllYXI8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJ5ZWFyXFxcIiBpZD1cXFwieWVhckVuZFxcXCIgbmFtZT1cXFwieWVhckVuZFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfZW5kX2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJ5ZWFyXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE0XFxcIj4yMDE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE1XFxcIj4yMDE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE2XFxcIj4yMDE2PC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1tb250aFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+TW9udGg8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJtb250aFxcXCIgaWQ9XFxcIm1vbnRoRW5kXFxcIiBuYW1lPVxcXCJtb250aEVuZFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfZW5kX2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJtb250aFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1kYXlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPkRheTwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImRheVxcXCIgaWQ9XFxcImRheUVuZFxcXCIgbmFtZT1cXFwiZGF5RW5kXFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9lbmRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcImRheVxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTNcXFwiPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNFxcXCI+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE1XFxcIj4xNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTZcXFwiPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxN1xcXCI+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE4XFxcIj4xODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTlcXFwiPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMFxcXCI+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIxXFxcIj4yMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjJcXFwiPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyM1xcXCI+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI0XFxcIj4yNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjVcXFwiPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNlxcXCI+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI3XFxcIj4yNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjhcXFwiPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOVxcXCI+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMwXFxcIj4zMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzFcXFwiPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICBcXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG92ZXItbGltaXQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcblxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG5cXG4gICAgICAgICAgICA8bGFiZWwgZm9yPVxcXCJwZXJjZW50XFxcIj48c3Bhbj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcblxcbiAgICAgICAgICAgIDxpbnB1dCBuYW1lPVxcXCJncmFkaW5nLXNlbGVjdGlvblxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIC8+XFxuXFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ1xcXCI+XFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zdW1tYXJ5XFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3RvdGFsXFxcIj5cXG5cXG4gICAgICA8aDM+VG90YWw8L2gzPlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3BlcmNlbnQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc092ZXJMaW1pdCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuXFxuICAgICAgPGgzIGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fdG90YWwtbnVtYmVyXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudG90YWxHcmFkZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudG90YWxHcmFkZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8c3BhbiBjbGFzcz1cXFwicGVyY2VudC1zeW1ib2xcXFwiPiU8L3NwYW4+PC9oMz5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG4gIFxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uXFxcIj5cXG5cXG4gICAgPGg1IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb25fX3RpdGxlXFxcIj5HcmFkaW5nIGJhc2VkIG9uOjwvaDU+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvbi1mb3JtXFxcIj5cXG5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtd3JhcHBlclxcXCI+XFxuXFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAub3B0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIDwvZGl2PlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIFxcbiB8IGNvdXJzZV9uYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNvdXJzZV9uYW1lKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW5zdHJ1Y3Rvcl91c2VybmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRlYWNoZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxuIHwgc3ViamVjdCA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdWJqZWN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IHN0YXJ0X2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX3N0YXJ0X2RhdGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxuIHwgZW5kX2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX2VuZF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IGluc3RpdHV0aW9uID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNjaG9vbCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBleHBlY3RlZF9zdHVkZW50cyA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG59fVxcblxcblwiO1xuICBpZiAoc3RhY2syID0gaGVscGVycy5kZXNjcmlwdGlvbikgeyBzdGFjazIgPSBzdGFjazIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazIgPSBkZXB0aDAuZGVzY3JpcHRpb247IHN0YWNrMiA9IHR5cGVvZiBzdGFjazIgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMi5hcHBseShkZXB0aDApIDogc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMilcbiAgICArIFwiXFxuXFxuXCJcbiAgICArIFwie3t0YWJsZSBvZiBjb250ZW50c319XFxuPT1UaW1lbGluZT09XFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9EWUsgPSB5ZXNcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fRFlLID0gbm9cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fR29vZF9BcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0gbm9cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMSwgc3RhY2syO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgcmV0dXJuIHN0YWNrMjsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIlxcbiB8IHdhbnRfaGVscF9maW5kaW5nX2FydGljbGVzID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxLCBzdGFjazI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyByZXR1cm4gc3RhY2syOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxuIHwgd2FudF9oZWxwX2V2YWx1YXRpbmdfYXJ0aWNsZXMgPSB5ZXNcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7Y291cnNlIG9wdGlvbnNcXG4gfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5keWspLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZHlrKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuIHwgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2EpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZ2EpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbn19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5yZW5kZXJJbk91dHB1dCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyByZXR1cm4gc3RhY2sxOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIlXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI9PUdyYWRpbmc9PVxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBncmFkaW5nIFxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5ncmFkaW5nLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPGJyLz59fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29weWVkaXQgYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWRkIHRvIGFuIGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3R9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TZWxlY3QgYXJ0aWNsZSBmcm9tIHN0dWRlbnQgY2hvaWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHJhZnRzX21haW5zcGFjZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zYW5kYm94KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNiwgcHJvZ3JhbTE2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHJhZnRzX21haW5zcGFjZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53b3JrX2xpdmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE4LCBwcm9ncmFtMTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIHwgc2FuZGJveCA9IG5vIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3V0bGluZSBhcyBsZWFkIHNlY3Rpb24gfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gb25lIHBlZXIgcmV2aWV3fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnBlZXJfZmVlZGJhY2spLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVlcl9yZXZpZXdzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9ufX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgQ2xhc3MgcHJlc2VudGF0aW9ucyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgRmluaXNoaW5nIHRvdWNoZXMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luLWNsYXNzIHByZXNlbnRhdGlvbnN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00MChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9SZWZsZWN0aXZlIGVzc2F5fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2lraXBlZGlhIHBvcnRmb2xpb319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQ0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayAxfCAxIHwgV2lraXBlZGlhIGVzc2VudGlhbHMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW50cm8gdG8gV2lraXBlZGlhfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAyIHwgRWRpdGluZyBiYXNpY3MgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSB0aGUgdHJhaW5pbmd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmFjdGljZSBjb21tdW5pY2F0aW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAzIHwgRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDQgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY3JpdGlxdWVfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNvcHlfZWRpdF9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA0IHwgVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvVXNpbmcgc291cmNlcyBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA1fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuYWRkX3RvX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pbGx1c3RyYXRlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTEsIHByb2dyYW0xMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gV2VlayA1fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA1IHwgRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDYgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21waWxlIGEgYmlibGlvZ3JhcGh5fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA2IHwgRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDcgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5yZXNlYXJjaF9wbGFubmluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jcmVhdGVfb3V0bGluZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTUsIHByb2dyYW0xNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5yZXNlYXJjaF9wbGFubmluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53cml0ZV9sZWFkKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDcgfCBNb3ZpbmcgYXJ0aWNsZXMgdG8gdGhlIG1haW4gc3BhY2UgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA4IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01vdmUgdG8gbWFpbiBzcGFjZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjIsIHByb2dyYW0yMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwYW5kIHlvdXIgYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgOCB8IEJ1aWxkaW5nIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tjbGFzcyB3b3Jrc2hvcH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDkgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMjYsIHByb2dyYW0yNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgOSB8IEdldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Hcm91cCBzdWdnZXN0aW9uc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAxMCB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMzAsIHByb2dyYW0zMCwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDI4LCBwcm9ncmFtMjgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDEwIHwgUmVzcG9uZGluZyB0byBmZWVkYmFjayB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDExIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzIsIHByb2dyYW0zMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAxMSB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDM2LCBwcm9ncmFtMzYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgzNCwgcHJvZ3JhbTM0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzOCwgcHJvZ3JhbTM4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZWZsZWN0aXZlX2Vzc2F5KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MCwgcHJvZ3JhbTQwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucG9ydGZvbGlvKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MiwgcHJvZ3JhbTQyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3JpZ2luYWxfcGFwZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQ0LCBwcm9ncmFtNDQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgMTIgfCBEdWUgZGF0ZSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWxsIHN0dWRlbnRzIGZpbmlzaGVkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2VuZCBvZiBjb3Vyc2Ugd2Vla319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNURU1QQUxURVxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdibHVySGFuZGxlcidcblxuICBtOiAnJ1xuICBkOiAnJ1xuICB5OiAnJ1xuICBkYXRlVmFsdWU6ICcnXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICAkKCdib2R5Jykub24gJ2NsaWNrJywgKGUpID0+XG5cbiAgICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBibHVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgZm9jdXNIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgY2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG4gICAgJHRhcmdldCA9ICgkIGUuY3VycmVudFRhcmdldClcblxuICAgIGlkID0gJHRhcmdldC5hdHRyKCdkYXRhLWRhdGUtaWQnKVxuXG4gICAgdHlwZSA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLXR5cGUnKVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdW3R5cGVdID0gdmFsdWVcblxuICAgIEBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgQGQgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWydkYXknXVxuXG4gICAgQHkgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWyd5ZWFyJ11cblxuICAgIEBkYXRlVmFsdWUgPSBcIiN7QHl9LSN7QG19LSN7QGR9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBAZGF0ZVZhbHVlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdkYXRlOmNoYW5nZScsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoYXNWYWx1ZTogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJ3NlbGVjdCcpLnZhbCgpICE9ICcnXG5cblxuICBjbG9zZUlmTm9WYWx1ZTogLT5cblxuICAgIGlmIEBoYXNWYWx1ZSgpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzVmFsaWQ6IC0+XG4gICAgaXNJdCA9IGZhbHNlXG5cbiAgICBpZiBAbSAhPSAnJyBhbmQgQGQgIT0gJycgYW5kIEB5ICE9ICcnXG4gICAgICBpc0l0ID0gdHJ1ZVxuXG4gICAgcmV0dXJuIGlzSXRcblxuXG5cblxuXG5cbiIsIiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5XaWtpR3JhZGluZ01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicycpXG5cblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgR3JhZGluZ0lucHV0VmlldyBleHRlbmRzIFZpZXdcblxuICB0ZW1wbGF0ZTogV2lraUdyYWRpbmdNb2R1bGVcblxuXG4gIGV2ZW50czpcblxuICAgICdjaGFuZ2UgaW5wdXQnIDogJ2lucHV0Q2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBsYWJlbCcgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ2dyYWRlOmNoYW5nZScgOiAnZ3JhZGVDaGFuZ2VIYW5kbGVyJ1xuXG4gIGN1cnJlbnRWYWx1ZXM6IFtdXG5cblxuICB2YWx1ZUxpbWl0OiAxMDBcblxuXG4gIGdyYWRpbmdTZWxlY3Rpb25EYXRhOiBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ11cblxuXG4gIGN1cnJlbnRUb3RhbDogLT5cblxuICAgIHRvdGFsID0gMFxuXG4gICAgXy5lYWNoKEBjdXJyZW50VmFsdWVzLCAodmFsKSA9PlxuXG4gICAgICB0b3RhbCArPSBwYXJzZUludCh2YWwpXG5cbiAgICApXG5cbiAgICByZXR1cm4gdG90YWxcblxuXG5cbiAgZ2V0SW5wdXRWYWx1ZXM6IC0+XG5cbiAgICB2YWx1ZXMgPSBbXVxuXG4gICAgQHBhcmVudFN0ZXBWaWV3LiRlbC5maW5kKCdpbnB1dFt0eXBlPVwicGVyY2VudFwiXScpLmVhY2goLT5cblxuICAgICAgY3VyVmFsID0gKCQgdGhpcykudmFsKClcblxuICAgICAgaWYgY3VyVmFsXG4gICAgICAgIFxuICAgICAgICB2YWx1ZXMucHVzaChjdXJWYWwpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICAoJCB0aGlzKS52YWwoMClcblxuICAgICAgICB2YWx1ZXMucHVzaCgwKVxuXG5cblxuICAgIClcblxuICAgIEBjdXJyZW50VmFsdWVzID0gdmFsdWVzXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBncmFkZUNoYW5nZUhhbmRsZXI6IChpZCwgdmFsdWUpIC0+XG4gICAgXG4gICAgQGdldElucHV0VmFsdWVzKCkucmVuZGVyKClcblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10ub3B0aW9ucywgKG9wdCkgLT5cblxuICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZVxuICAgICAgICBcbiAgICAgIClcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLm9wdGlvbnNbJGlucHV0RWwuYXR0cignaWQnKV0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS52YWx1ZSA9ICRpbnB1dEVsLmF0dHIoJ2lkJylcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIG91dCA9IHtcblxuICAgICAgdG90YWxHcmFkZTogQGN1cnJlbnRUb3RhbCgpXG5cbiAgICAgIGlzT3ZlckxpbWl0OiBAY3VycmVudFRvdGFsKCkgPiBAdmFsdWVMaW1pdFxuXG4gICAgICBvcHRpb25zOiBAZ3JhZGluZ1NlbGVjdGlvbkRhdGEub3B0aW9uc1xuXG4gICAgfVxuXG4gICAgcmV0dXJuIG91dFxuXG5cblxuXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkhvbWVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzJylcblxuT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuXG5TdGVwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvU3RlcE1vZGVsJylcblxuU3RlcE5hdlZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9TdGVwTmF2VmlldycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IEhvbWVUZW1wbGF0ZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSU5JVFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBpbml0aWFsaXplOiAtPlxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBzdGVwc1JlbmRlcmVkID0gZmFsc2VcblxuXG4gIGV2ZW50czogXG5cbiAgICAnY2xpY2sgLmV4aXQtZWRpdCcgOiAnZXhpdEVkaXRDbGlja0hhbmRsZXInXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICdzdGVwOm5leHQnIDogJ25leHRIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6cHJldicgOiAncHJldkhhbmRsZXInXG5cbiAgICAnc3RlcDpnb3RvJyA6ICdnb3RvSGFuZGxlcidcblxuICAgICdzdGVwOmdvdG9JZCcgOiAnZ290b0lkSGFuZGxlcidcblxuICAgICdzdGVwOmVkaXQnIDogJ2VkaXRIYW5kbGVyJ1xuXG4gICAgJ3RpcHM6aGlkZScgOiAnaGlkZUFsbFRpcHMnXG5cbiAgICAnZWRpdDpleGl0JyA6ICdvbkVkaXRFeGl0J1xuXG5cblxuICByZW5kZXI6IC0+XG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkpKVxuXG4gICAgdW5sZXNzIEBzdGVwc1JlbmRlcmVkXG4gICAgXG4gICAgICBAYWZ0ZXJSZW5kZXIoKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG4gICAgI1NVQlZJRVdTXG4gICAgQFN0ZXBOYXYgPSBuZXcgU3RlcE5hdlZpZXcoKVxuXG4gICAgIyBUSEUgRk9MTFdJTkcgQ09VTEQgUFJPQkFCTFkgSEFQUEVOIElOIEEgQ09MTEVUSU9OIFZJRVcgQ0xBU1MgVE8gQ09OVFJPTCBBTEwgU1RFUFNcbiAgICBAJHN0ZXBzQ29udGFpbmVyID0gQCRlbC5maW5kKCcuc3RlcHMnKVxuXG4gICAgQCRpbm5lckNvbnRhaW5lciA9IEAkZWwuZmluZCgnLmNvbnRlbnQnKVxuXG4gICAgIyBTRVRVUCBTVEVQUyBBTkQgUkVUVVJOIEFSUkFZIE9GIFZJRVdTXG4gICAgQHN0ZXBWaWV3cyA9IEBfY3JlYXRlU3RlcFZpZXdzKClcblxuICAgIEBTdGVwTmF2LnN0ZXBWaWV3cyA9IEBzdGVwVmlld3NcblxuICAgIEBTdGVwTmF2LnRvdGFsU3RlcHMgPSBAc3RlcFZpZXdzLmxlbmd0aFxuXG4gICAgQCRpbm5lckNvbnRhaW5lci5hcHBlbmQoQFN0ZXBOYXYuZWwpXG5cbiAgICBpZiBAc3RlcFZpZXdzLmxlbmd0aCA+IDBcblxuICAgICAgQHNob3dDdXJyZW50U3RlcCgpXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG4gIF9jcmVhdGVTdGVwVmlld3M6IC0+XG4gICAgXG4gICAgX3ZpZXdzID0gW11cblxuICAgIGludHJvU3RlcHMgPSBhcHBsaWNhdGlvbi5XaXphcmRDb25maWcuaW50cm9fc3RlcHNcblxuICAgIHBhdGh3YXlzID0gYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLnBhdGh3YXlzXG5cbiAgICBvdXRyb1N0ZXBzID0gYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLm91dHJvX3N0ZXBzXG5cbiAgICBzdGVwTnVtYmVyID0gMFxuXG4gICAgXy5lYWNoKGludHJvU3RlcHMsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBpZiBzdGVwTnVtYmVyIGlzIDBcblxuICAgICAgICBuZXd2aWV3LmlzRmlyc3RTdGVwID0gdHJ1ZVxuXG4gICAgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcblxuICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLS0je3N0ZXAuaWR9XCIpXG5cbiAgICAgIF92aWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG4gICAgXy5lYWNoKHBhdGh3YXlzLm11bHRpbWVkaWEsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcblxuICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLS0je3N0ZXAuaWR9XCIpXG5cbiAgICAgIF92aWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG4gICAgXy5lYWNoKHBhdGh3YXlzLnJlc2VhcmNod3JpdGUsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcblxuICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLS0je3N0ZXAuaWR9XCIpXG5cbiAgICAgIF92aWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG5cbiAgICBfLmVhY2gob3V0cm9TdGVwcywoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAgIF8ubWFwKHN0ZXAsKHZhbHVlLCBrZXksIGxpc3QpIC0+IFxuXG4gICAgICAgIG5ld21vZGVsLnNldChrZXksdmFsdWUpXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldyA9IG5ldyBTdGVwVmlldyhcblxuICAgICAgICBtb2RlbDogbmV3bW9kZWxcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcE51bWJlcicsIHN0ZXBOdW1iZXIgKyAxKVxuXG4gICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4Jywgc3RlcE51bWJlciApXG5cbiAgICAgIGlmIGluZGV4IGlzIG91dHJvU3RlcHMubGVuZ3RoIC0gMVxuXG4gICAgICAgIG5ld3ZpZXcuaXNMYXN0U3RlcCA9IHRydWVcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICBfdmlld3MucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBfdmlld3NcblxuXG5cbiAgICAjIF8uZWFjaChhcHBsaWNhdGlvbi5kYXRhLChzdGVwLCBpbmRleCkgPT5cblxuICAgICMgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgIyAgIF8ubWFwKHN0ZXAsKHZhbHVlLCBrZXksIGxpc3QpIC0+IFxuXG4gICAgIyAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICMgICApXG5cbiAgICAjICAgbmV3dmlldyA9IG5ldyBTdGVwVmlldyhcblxuICAgICMgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgIyAgIClcblxuICAgICMgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcE51bWJlcicsIGluZGV4ICsgMSlcblxuICAgICMgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4JywgaW5kZXggKVxuXG4gICAgIyAgIGlmIGluZGV4IGlzIGFwcGxpY2F0aW9uLmRhdGEubGVuZ3RoIC0gMVxuXG4gICAgIyAgICAgbmV3dmlldy5pc0xhc3RTdGVwID0gdHJ1ZVxuXG4gICAgIyAgIGVsc2UgaWYgaW5kZXggaXMgMFxuXG4gICAgIyAgICAgbmV3dmlldy5pc0ZpcnN0U3RlcCA9IHRydWVcblxuICAgICMgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcblxuICAgICMgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICMgICBfdmlld3MucHVzaChuZXd2aWV3KVxuXG4gICAgIyApXG5cbiAgICAjIHJldHVybiBfdmlld3NcblxuICAgICMgXy5lYWNoKGFwcGxpY2F0aW9uLmRhdGEsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgIyAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAjICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAjICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgIyAgIClcblxuICAgICMgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgIyAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAjICAgKVxuXG4gICAgIyAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgaW5kZXggKyAxKVxuXG4gICAgIyAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBpbmRleCApXG5cbiAgICAjICAgaWYgaW5kZXggaXMgYXBwbGljYXRpb24uZGF0YS5sZW5ndGggLSAxXG5cbiAgICAjICAgICBuZXd2aWV3LmlzTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICAjICAgZWxzZSBpZiBpbmRleCBpcyAwXG5cbiAgICAjICAgICBuZXd2aWV3LmlzRmlyc3RTdGVwID0gdHJ1ZVxuXG4gICAgIyAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgIyAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgIyAgIF92aWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAjIClcblxuICAgICMgcmV0dXJuIF92aWV3c1xuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICByZXR1cm4ge1xuXG4gICAgICBjb250ZW50OiBcIlRoaXMgaXMgc3BlY2lhbCBjb250ZW50XCJcblxuICAgIH1cbiAgICBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQ1VTVE9NIEZVTkNUSU9OU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhZHZhbmNlU3RlcDogLT5cbiAgICBAY3VycmVudFN0ZXArPTFcbiAgICBcbiAgICBpZiBAY3VycmVudFN0ZXAgaXMgQHN0ZXBWaWV3cy5sZW5ndGggXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICBkZWNyZW1lbnRTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwLT0xXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPCAwXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IEBzdGVwVmlld3MubGVuZ3RoIC0gMVxuXG4gICAgQGhpZGVBbGxTdGVwcygpXG5cbiAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuXG5cbiAgdXBkYXRlU3RlcDogKGluZGV4KSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gaW5kZXhcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICB1cGRhdGVTdGVwQnlJZDogKGlkKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBpZiBzdGVwVmlldy5zdGVwSWQoKSBpcyBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKF8uaW5kZXhPZihAc3RlcFZpZXdzLHN0ZXBWaWV3KSlcbiAgICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgXG4gICAgKVxuXG5cblxuICBzaG93Q3VycmVudFN0ZXA6IC0+XG5cbiAgICBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uc2hvdygpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOnVwZGF0ZScsIEBjdXJyZW50U3RlcClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGN1cnJlbnRTdGVwVmlldzogLT5cbiAgICByZXR1cm4gQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdXG5cblxuXG4gIGhpZGVBbGxTdGVwczogLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgc3RlcFZpZXcuaGlkZSgpXG4gICAgICBcbiAgICApXG5cblxuICBoaWRlQWxsVGlwczogKGUpIC0+XG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG5cbiAgICAgIHN0ZXBWaWV3LnRpcFZpc2libGUgPSBmYWxzZVxuICAgICAgXG4gICAgKVxuXG4gICAgJCgnYm9keScpLmFkZENsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dEhhbmRsZXI6IC0+XG5cbiAgICBAYWR2YW5jZVN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG5cbiAgcHJldkhhbmRsZXI6IC0+XG5cbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZWRpdEhhbmRsZXI6IChpZCkgLT5cblxuICAgICQoJ2JvZHknKS5hZGRDbGFzcygnZWRpdC1tb2RlJylcblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLCAodmlldywgaW5kZXgpID0+XG5cbiAgICAgIGlmIHZpZXcubW9kZWwuaWQgPT0gaWRcblxuICAgICAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIClcblxuXG4gIG9uRWRpdEV4aXQ6IC0+XG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2VkaXQtbW9kZScpXG5cblxuICBleGl0RWRpdENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZWRpdDpleGl0JylcblxuXG5cbiAgZ290b0hhbmRsZXI6IChpbmRleCkgLT5cblxuICAgIEB1cGRhdGVTdGVwKGluZGV4KVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGdvdG9JZEhhbmRsZXI6IChpZCkgLT5cblxuICAgIEB1cGRhdGVTdGVwQnlJZChpZClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuICBnZXRTZWxlY3RlZElkczogLT5cblxuICAgIHNlbGVjdGVkSWRzID0gW11cblxuICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzLCAoc3RlcHMpID0+XG5cbiAgICAgIF8uZWFjaChzdGVwcywgKHN0ZXApID0+XG5cbiAgICAgICAgaWYgc3RlcC5zZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgICAgICBpZiBzdGVwLmlkXG5cbiAgICAgICAgICAgIHNlbGVjdGVkSWRzLnB1c2ggc3RlcC5pZFxuXG4gICAgICApXG5cbiAgICApXG5cbiAgICByZXR1cm4gc2VsZWN0ZWRJZHNcblxuXG5cblxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBJbnB1dEl0ZW1WaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuIyBTVVBFUiBWSUVXIENMQVNTXG5JbnB1dFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvSW5wdXRWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIElucHV0SXRlbVZpZXcgZXh0ZW5kcyBJbnB1dFZpZXcgXG5cblxuICAiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBIb21lVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuTG9naW5UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Mb2dpblRlbXBsYXRlLmhicycpXG5cbldpemFyZENvbnRlbnQgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZENvbnRlbnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogTG9naW5UZW1wbGF0ZVxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgXG4gICAgcmV0dXJuIFdpemFyZENvbnRlbnRbMF0iLCJcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuV2lraU91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9XaWtpT3V0cHV0VGVtcGxhdGUuaGJzJylcbkNvdXJzZURldGFpbHNUZW1wYWx0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicycpXG5HcmFkaW5nVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdUZW1wbGF0ZS5oYnMnKVxuQ291cnNlT3B0aW9uc1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzJylcblxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBPdXRwdXRWaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBXaWtpT3V0cHV0VGVtcGxhdGVcblxuXG4gIGRldGFpbHNUZW1wbGF0ZTogQ291cnNlRGV0YWlsc1RlbXBhbHRlXG5cbiAgZ3JhZGluZ1RlbXBsYXRlOiBHcmFkaW5nVGVtcGxhdGVcblxuICBvcHRpb25zVGVtcGxhdGU6IENvdXJzZU9wdGlvbnNUZW1wbGF0ZVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICd3aXphcmQ6cHVibGlzaCcgOiAncHVibGlzaEhhbmRsZXInIFxuXG5cbiAgb3V0cHV0UGxhaW5UZXh0OiAtPlxuXG4gICAgQHJlbmRlcigpXG5cbiAgICByZXR1cm4gQCRlbC50ZXh0KClcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAcG9wdWxhdGVPdXRwdXQoKSApIClcbiAgICBcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cblxuICBwb3B1bGF0ZU91dHB1dDogLT5cblxuICAgIGRldGFpbHNPdXRwdXQgPSBAJGVsLmh0bWwoQGRldGFpbHNUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICByYXdBc3NpZ25tZW50T3V0cHV0ID0gQCRlbC5odG1sKEB0ZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBhc3NpZ25tZW50T3V0cHV0ID0gcmF3QXNzaWdubWVudE91dHB1dC5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHIpL2dtLFwiXCIpXG5cbiAgICBncmFkaW5nT3V0cHV0ID0gQCRlbC5odG1sKEBncmFkaW5nVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgb3B0aW9uc091dHB1dCA9IEAkZWwuaHRtbChAb3B0aW9uc1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIGNvdXJzZU91dCA9IGRldGFpbHNPdXRwdXQgKyBhc3NpZ25tZW50T3V0cHV0ICsgZ3JhZGluZ091dHB1dCArIG9wdGlvbnNPdXRwdXRcbiAgICBcbiAgICByZXR1cm4gY291cnNlT3V0XG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIF8uZXh0ZW5kKFdpemFyZFN0ZXBJbnB1dHMseyBkZXNjcmlwdGlvbjogJCgnI3Nob3J0X2Rlc2NyaXB0aW9uJykudmFsKCksIGxpbmVCcmVhazogJzxici8+J30pXG5cblxuICBleHBvcnREYXRhOiAoZm9ybURhdGEpIC0+XG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcblxuICAgICAgICB3aWtpdGV4dDogZm9ybURhdGFcblxuICAgICAgICBjb3Vyc2VfdGl0bGU6IFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWVcblxuICAgICAgc3VjY2VzczogKHJlc3BvbnNlKSAtPlxuXG4gICAgICAgICQoJyNwdWJsaXNoJykucmVtb3ZlQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAgIGlmIHJlc3BvbnNlLnN1Y2Nlc3NcblxuICAgICAgICAgIG5ld1BhZ2UgPSBcImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvI3tyZXNwb25zZS50aXRsZX1cIlxuXG4gICAgICAgICAgYWxlcnQoXCJDb25ncmF0cyEgWW91IGhhdmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQvZWRpdGVkIGEgV2lraWVkdSBDb3Vyc2UgYXQgI3tuZXdQYWdlfVwiKVxuXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBuZXdQYWdlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgY29uc29sZS5sb2cgcmVzcG9uc2VcblxuICAgICAgICAgIGFsZXJ0KCdIbW0uLi4gc29tZXRoaW5nIHdlbnQgd3JvbmcuIFRyeSBjbGlja2luZyBcIlB1Ymxpc2hcIiBhZ2Fpbi4gSWYgdGhhdCBkb2VzblxcJ3Qgd29yaywgcGxlYXNlIHNlbmQgYSBtZXNzYWdlIHRvIHNhZ2VAd2lraWVkdS5vcmcuJylcblxuXG4gICAgKVxuICAgIFxuXG4gIHB1Ymxpc2hIYW5kbGVyOiAtPlxuXG4gICAgaWYgV2l6YXJkU3RlcElucHV0cy5pbnRyby5jb3Vyc2VfbmFtZS52YWx1ZS5sZW5ndGggPiAwIFxuXG4gICAgICAkKCcjcHVibGlzaCcpLmFkZENsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgIyBAZXhwb3J0RGF0YShAJGVsLmh0bWwoQHBvcHVsYXRlT3V0cHV0KCkpLnRleHQoKSlcblxuICAgICAgQGV4cG9ydERhdGEoQHBvcHVsYXRlT3V0cHV0KCkpXG5cbiAgICBlbHNlXG5cbiAgICAgIGFsZXJ0KCdZb3UgbXVzdCBlbnRlciBhIGNvdXJzZSB0aXRsZSBhcyB0aGlzIHdpbGwgYmVjb21lIHRoZSB0aXRsZSBvZiB5b3VyIGNvdXJzZSBwYWdlLicpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICdpbnRybycpXG5cbiAgICAgIHNldFRpbWVvdXQoPT5cblxuICAgICAgICAkKCcjY291cnNlX25hbWUnKS5mb2N1cygpXG5cbiAgICAgICw1MDApXG5cblxuICAgIFxuXG4gICAgXG5cbiAgICBcbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBOYXZWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5TdGVwTmF2VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTmF2VmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAtbmF2J1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBOYXZUZW1wbGF0ZVxuXG5cbiAgaGFzQmVlblRvTGFzdFN0ZXA6IGZhbHNlXG5cblxuICBpbml0aWFsaXplOiAtPlxuICAgIFxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICdzdGVwOnVwZGF0ZScgOiAndXBkYXRlQ3VycmVudFN0ZXAnXG5cbiAgICAnc3RlcDphbnN3ZXJlZCcgOiAnc3RlcEFuc3dlcmVkJ1xuXG4gICAgJ2VkaXQ6ZXhpdCcgOiAnZWRpdEV4aXRIYW5kbGVyJ1xuXG5cbiAgZXZlbnRzOiAtPlxuICAgICdjbGljayAubmV4dCcgOiAnbmV4dENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAucHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZG90JyAgOiAnZG90Q2xpY2tIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA8IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG4gICAgZWxzZSBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA9PSBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGlkZGVuJylcblxuICAgIEBhZnRlclJlbmRlcigpXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY3VycmVudDogQGN1cnJlbnRTdGVwXG5cbiAgICAgIHRvdGFsOiBAdG90YWxTdGVwc1xuXG4gICAgICBwcmV2SW5hY3RpdmU6IEBpc0luYWN0aXZlKCdwcmV2JylcblxuICAgICAgbmV4dEluYWN0aXZlOiBAaXNJbmFjdGl2ZSgnbmV4dCcpXG5cbiAgICAgIG5leHRUaXRsZTogPT5cblxuICAgICAgICBpZiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgICAgICByZXR1cm4gJydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdOZXh0J1xuXG4gICAgICBwcmV2VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICdCYWNrJ1xuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICByZXR1cm4gJ1ByZXYnXG5cbiAgICAgIGlzTGFzdFN0ZXA6IEBpc0xhc3RTdGVwKClcblxuICAgICAgYmFja1RvT3ZlcnZpZXdUaXRsZTogJ0dvIEJhY2sgdG8gT3ZlcnZpZXcnXG5cbiAgICAgIHN0ZXBzOiA9PlxuXG4gICAgICAgIG91dCA9IFtdXG5cbiAgICAgICAgXy5lYWNoKEBzdGVwVmlld3MsIChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICAgIHN0ZXBEYXRhID0gc3RlcC5tb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgICAgICBpc0FjdGl2ZSA9IEBjdXJyZW50U3RlcCBpcyBpbmRleFxuXG4gICAgICAgICAgd2FzVmlzaXRlZCA9IHN0ZXAuaGFzVXNlclZpc2l0ZWRcblxuICAgICAgICAgIG91dC5wdXNoIHtpZDogaW5kZXgsIGlzQWN0aXZlOiBpc0FjdGl2ZSwgaGFzVmlzaXRlZDogd2FzVmlzaXRlZCwgc3RlcFRpdGxlOiBzdGVwRGF0YS50aXRsZSwgc3RlcElkOiBzdGVwRGF0YS5pZH1cblxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG91dFxuXG4gICAgfVxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIHJldHVybiBAXG5cblxuXG4gIHByZXZDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICdncmFkaW5nJylcblxuICAgIGVsc2VcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpwcmV2JylcblxuXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuXG4gIGRvdENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIGlmIEBoYXNCZWVuVG9MYXN0U3RlcFxuXG4gICAgICBpZiBwYXJzZUludCgkdGFyZ2V0LmF0dHIoJ2RhdGEtbmF2LWlkJykpID09IHBhcnNlSW50KEB0b3RhbFN0ZXBzIC0gMSlcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdlZGl0OmV4aXQnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJHRhcmdldC5kYXRhKCdzdGVwLWlkJykpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsICR0YXJnZXQuZGF0YSgnbmF2LWlkJykpXG5cblxuICBlZGl0RXhpdEhhbmRsZXI6IC0+XG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAbGFzdFN0ZXBJbmRleCgpKVxuXG5cbiAgdXBkYXRlQ3VycmVudFN0ZXA6IChzdGVwKSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gc3RlcFxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBAaGFzQmVlblRvTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICBAcmVuZGVyKClcblxuXG4gIHN0ZXBBbnN3ZXJlZDogKHN0ZXBWaWV3KSAtPlxuXG4gICAgcmV0dXJuIEByZW5kZXIoKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGxhc3RTdGVwSW5kZXg6IC0+XG4gICAgXG4gICAgcmV0dXJuIEB0b3RhbFN0ZXBzLTFcblxuICBpc0xhc3RTdGVwOiAtPlxuXG4gICAgcmV0dXJuIEBjdXJyZW50U3RlcCBpcyBAdG90YWxTdGVwcyAtIDFcblxuICBpc0luYWN0aXZlOiAoaXRlbSkgLT5cblxuICAgIGl0SXMgPSB0cnVlXG5cbiAgICBpZiBpdGVtID09ICdwcmV2J1xuXG4gICAgICBpdElzID0gQGN1cnJlbnRTdGVwIGlzIDBcblxuICAgIGVsc2UgaWYgaXRlbSA9PSAnbmV4dCdcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uaGFzVXNlckFuc3dlcmVkXG5cbiAgICAgICAgaXRJcyA9IGZhbHNlXG5cbiAgICAgIGVsc2UgaWYgQGlzTGFzdFN0ZXAoKVxuICAgICAgICBcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgICAgZWxzZVxuICAgICAgICBpdElzID0gdHJ1ZVxuXG4gICAgcmV0dXJuIGl0SXNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcFZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jU1VCVklFV1NcbklucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuRGF0ZUlucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0RhdGVJbnB1dFZpZXcnKVxuXG5HcmFkaW5nSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvR3JhZGluZ0lucHV0VmlldycpXG5cbiNURU1QTEFURVNcblN0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9TdGVwVGVtcGxhdGUuaGJzJylcblxuSW50cm9TdGVwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzJylcblxuSW5wdXRUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0lucHV0VGlwVGVtcGxhdGUuaGJzJylcblxuQ291cnNlVGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMnKVxuXG5XaWtpRGF0ZXNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzJylcblxuXG4jREFUQVxuQ291cnNlSW5mb0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZENvdXJzZUluZm8nKVxuXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwVmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAnXG5cblxuICB0YWdOYW1lOiAnc2VjdGlvbidcblxuXG4gIHRlbXBsYXRlOiBTdGVwVGVtcGxhdGVcblxuXG4gIGludHJvVGVtcGxhdGU6IEludHJvU3RlcFRlbXBsYXRlXG5cblxuICB0aXBUZW1wbGF0ZTogSW5wdXRUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb1RlbXBsYXRlOiBDb3Vyc2VUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb0RhdGE6IENvdXJzZUluZm9EYXRhXG5cblxuICBkYXRlc01vZHVsZTogV2lraURhdGVzTW9kdWxlXG5cblxuICBoYXNVc2VyQW5zd2VyZWQ6IGZhbHNlXG5cblxuICBoYXNVc2VyVmlzaXRlZDogZmFsc2VcblxuXG4gIGlzTGFzdFN0ZXA6IGZhbHNlXG5cblxuICBpc0ZpcnN0U3RlcDogZmFsc2VcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UUyBBTkQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrICNwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvLXRpcF9fY2xvc2UnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2NsaWNrICNiZWdpbkJ1dHRvbicgOiAnYmVnaW5IYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8gLnN0ZXAtaW5mby1zZWN0aW9uLS1hY2NvcmRpYW4nIDogJ2FjY29yZGlhbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZWRpdC1idXR0b24nIDogJ2VkaXRDbGlja0hhbmRsZXInXG5cbiAgICAjICdjbGljayAuc3RlcC1pbmZvLXRpcCcgOiAnaGlkZVRpcHMnXG5cbiAgc3Vic2NyaXB0aW9uczogXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlVGlwcydcblxuICAgICdkYXRlOmNoYW5nZScgOiAnaXNJbnRyb1ZhbGlkJ1xuXG5cblxuICBlZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIHN0ZXBJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXN0ZXAtaWQnKVxuXG4gICAgaWYgc3RlcElkXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsIHN0ZXBJZClcblxuICBzdGVwSWQ6IC0+XG5cbiAgICByZXR1cm4gQG1vZGVsLmF0dHJpYnV0ZXMuaWRcblxuXG4gIHZhbGlkYXRlRGF0ZXM6IChkYXRlVmlldykgLT5cblxuICAgIHVubGVzcyBAaXNGaXJzdFN0ZXAgb3IgQGlzTGFzdFN0ZXBcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBkYXRlc0FyZVZhbGlkID0gZmFsc2VcblxuICAgIF8uZWFjaChAZGF0ZVZpZXdzLCAoZGF0ZVZpZXcpID0+XG4gICAgICBpZiBkYXRlVmlldy5pc1ZhbGlkKClcbiAgICAgICAgZGF0ZXNBcmVWYWxpZCA9IHRydWVcbiAgICAgIGVsc2UgXG4gICAgICAgIGRhdGVzQXJlVmFsaWQgPSBmYWxzZVxuICAgIClcblxuICAgIHJldHVybiBkYXRlc0FyZVZhbGlkXG5cblxuXG5cblxuICBhY2NvcmRpYW5DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHRhcmdldC50b2dnbGVDbGFzcygnb3BlbicpXG5cblxuICBwdWJsaXNoSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3dpemFyZDpwdWJsaXNoJylcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEB0aXBWaXNpYmxlID0gZmFsc2VcblxuICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdmaXJzdCcpXG5cblxuXG4gICAgZWxzZSBpZiBAaXNMYXN0U3RlcFxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdsYXN0JylcbiAgICAgIFxuICAgIGVsc2VcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnc3RhbmRhcmQnKVxuXG4gICAgQF9yZW5kZXJJbnB1dHNBbmRJbmZvKClcblxuICAgIHJldHVybiBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgX3JlbmRlclN0ZXBUeXBlOiAodHlwZSkgLT5cblxuICAgIGlmIHR5cGUgaXMgJ3N0YW5kYXJkJ1xuXG4gICAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ2ZpcnN0JyBvciB0eXBlIGlzICdsYXN0J1xuXG4gICAgICBpZiB0eXBlIGlzICdmaXJzdCdcblxuICAgICAgICBAJGVsLmFkZENsYXNzKCdzdGVwLS1maXJzdCcpLmh0bWwoIEBpbnRyb1RlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgICAgICBkYXRlVGl0bGUgPSAnQ291cnNlIGRhdGVzJ1xuXG4gICAgICAgIEAkYmVnaW5CdXR0b24gPSBAJGVsLmZpbmQoJ2EjYmVnaW5CdXR0b24nKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tbGFzdCcpLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICAgZGF0ZVRpdGxlID0gJ0Fzc2lnbm1lbnQgdGltZWxpbmUnXG5cbiAgICAgIEBkYXRlVmlld3MgPSBbXVxuXG4gICAgICAkZGF0ZXMgPSAkKEBkYXRlc01vZHVsZSh7dGl0bGU6IGRhdGVUaXRsZX0pKVxuXG4gICAgICAkZGF0ZUlucHV0cyA9ICRkYXRlcy5maW5kKCcuY3VzdG9tLXNlbGVjdCcpXG5cbiAgICAgIHNlbGYgPSBAXG5cbiAgICAgICRkYXRlSW5wdXRzLmVhY2goKGlucHV0RWxlbWVudCkgLT5cblxuICAgICAgICBuZXdEYXRlVmlldyA9IG5ldyBEYXRlSW5wdXRWaWV3KFxuXG4gICAgICAgICAgZWw6ICQodGhpcykgXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld0RhdGVWaWV3LnBhcmVudFN0ZXBWaWV3ID0gc2VsZlxuXG4gICAgICAgIHNlbGYuZGF0ZVZpZXdzLnB1c2gobmV3RGF0ZVZpZXcpXG4gICAgICBcbiAgICAgIClcblxuICAgICAgQCRlbC5maW5kKCcuc3RlcC1mb3JtLWRhdGVzJykuaHRtbCgkZGF0ZXMpXG5cbiAgICByZXR1cm4gQFxuXG4gICAgXG5cbiAgX3JlbmRlcklucHV0c0FuZEluZm86IC0+XG5cbiAgICBAaW5wdXRTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgIEAkdGlwU2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtaW5mby10aXBzJylcblxuICAgIEBpbnB1dERhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXSB8fCBbXVxuXG4gICAgXy5lYWNoKEBpbnB1dERhdGEsIChpbnB1dCwgaW5kZXgpID0+XG5cbiAgICAgIHVubGVzcyBpbnB1dC50eXBlIFxuXG4gICAgICAgIHJldHVyblxuXG4gICAgICBpZiBpbnB1dC5zZWxlY3RlZCAmJiBpbnB1dC5yZXF1aXJlZFxuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuc2VsZWN0ZWQgXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC5yZXF1aXJlZCBpcyBmYWxzZVxuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQudHlwZSBpcyAncGVyY2VudCdcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG5cbiAgICAgIGlucHV0VmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXcgQmFja2JvbmUuTW9kZWwoaW5wdXQpXG5cbiAgICAgIClcblxuICAgICAgaW5wdXRWaWV3LmlucHV0VHlwZSA9IGlucHV0LnR5cGVcblxuICAgICAgaW5wdXRWaWV3Lml0ZW1JbmRleCA9IGluZGV4XG5cbiAgICAgIGlucHV0Vmlldy5wYXJlbnRTdGVwID0gQFxuXG4gICAgICBAaW5wdXRTZWN0aW9uLmFwcGVuZChpbnB1dFZpZXcucmVuZGVyKCkuZWwpXG5cbiAgICAgIGlmIGlucHV0LnRpcEluZm9cblxuICAgICAgICB0aXAgPSBcblxuICAgICAgICAgIGlkOiBpbmRleFxuXG4gICAgICAgICAgdGl0bGU6IGlucHV0LnRpcEluZm8udGl0bGVcblxuICAgICAgICAgIGNvbnRlbnQ6IGlucHV0LnRpcEluZm8uY29udGVudFxuXG4gICAgICAgICR0aXBFbCA9IEB0aXBUZW1wbGF0ZSh0aXApXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgICBlbHNlIGlmIGlucHV0Lmhhc0NvdXJzZUluZm9cblxuICAgICAgICBpbmZvRGF0YSA9IF8uZXh0ZW5kKEBjb3Vyc2VJbmZvRGF0YVtpbnB1dC5pZF0sIHtpZDogaW5kZXh9IClcblxuICAgICAgICAkdGlwRWwgPSBAY291cnNlSW5mb1RlbXBsYXRlKGluZm9EYXRhKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgIClcbiAgICByZXR1cm4gQFxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRpbnB1dENvbnRhaW5lcnMgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIEBncmFkaW5nVmlldyA9IG5ldyBHcmFkaW5nSW5wdXRWaWV3KClcblxuICAgICAgQGdyYWRpbmdWaWV3LnBhcmVudFN0ZXBWaWV3ID0gQFxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tY29udGVudCcpLmFwcGVuZChAZ3JhZGluZ1ZpZXcuZ2V0SW5wdXRWYWx1ZXMoKS5yZW5kZXIoKS5lbClcblxuICAgIHJldHVybiBAXG5cblxuICBoaWRlOiAtPlxuXG4gICAgQCRlbC5oaWRlKClcblxuICAgIHJldHVybiBAXG5cblxuICBzaG93OiAtPlxuXG4gICAgJCgnYm9keSwgaHRtbCcpLmFuaW1hdGUoXG4gICAgICBzY3JvbGxUb3A6IDBcbiAgICAsMSlcblxuICAgIGlmIEBpc0xhc3RTdGVwXG5cbiAgICAgIEByZW5kZXIoKS4kZWwuc2hvdygpXG5cbiAgICBlbHNlIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJ1xuXG4gICAgICBAcmVuZGVyKCkuJGVsLnNob3coKVxuXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuc2hvdygpXG5cbiAgICBAaGFzVXNlclZpc2l0ZWQgPSB0cnVlXG5cblxuICAgIHJldHVybiBAXG5cblxuICBiZWdpbkhhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG5cbiAgdXBkYXRlVXNlckFuc3dlcjogKGlkLCB2YWx1ZSwgdHlwZSkgLT5cblxuICAgIGlucHV0SXRlbXMgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1cblxuICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgaWYgdHlwZSBpcyAncGVyY2VudCdcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgcmV0dXJuIEBcblxuXG4gICAgXy5lYWNoKGlucHV0SXRlbXMsIChpdGVtKSA9PlxuXG4gICAgICBpZiBpdGVtLnR5cGUgaXMgJ2NoZWNrYm94J1xuXG4gICAgICAgIGlmIGl0ZW0ucmVxdWlyZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgaWYgaXRlbS5zZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgIClcblxuICAgIGlmIHJlcXVpcmVkU2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICdyYWRpb0dyb3VwJyBvciB0eXBlIGlzICdyYWRpb0JveCdcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgIGVsc2UgaWYgdHlwZSBpcyAndGV4dCdcblxuICAgICAgaWYgQGlzRmlyc3RTdGVwXG5cbiAgICAgICAgXy5lYWNoKGlucHV0SXRlbXMsIChpdGVtKSA9PlxuXG4gICAgICAgICAgaWYgaXRlbS50eXBlIGlzICd0ZXh0J1xuXG4gICAgICAgICAgICBpZiBpdGVtLnJlcXVpcmVkIGlzIHRydWVcblxuICAgICAgICAgICAgICBpZiBpdGVtLnZhbHVlICE9ICcnXG5cbiAgICAgICAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgICAgICAgIGVsc2UgXG5cbiAgICAgICAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gZmFsc2VcblxuICAgICAgICApXG5cbiAgICAgICAgaWYgcmVxdWlyZWRTZWxlY3RlZFxuXG4gICAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IGZhbHNlXG5cbiAgICAgICAgQGlzSW50cm9WYWxpZCgpXG5cblxuICAgIGVsc2UgXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSBmYWxzZVxuICBcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6YW5zd2VyZWQnLCBAKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgaXNJbnRyb1ZhbGlkOiAtPlxuXG4gICAgdW5sZXNzIEBpc0ZpcnN0U3RlcCBvciBAaXNMYXN0U3RlcFxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICBpZiBAaGFzVXNlckFuc3dlcmVkIGFuZCBAdmFsaWRhdGVEYXRlcygpXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5yZW1vdmVDbGFzcygnaW5hY3RpdmUnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5hZGRDbGFzcygnaW5hY3RpdmUnKVxuXG5cblxuXG4gIHVwZGF0ZVJhZGlvQW5zd2VyOiAoaWQsIGluZGV4LCB2YWx1ZSkgLT5cblxuICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udHlwZSBcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3B0aW9uc1tpbmRleF0uc2VsZWN0ZWQgPSB2YWx1ZVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS52YWx1ZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3B0aW9uc1tpbmRleF0udmFsdWVcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3ZlcnZpZXdMYWJlbCA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3B0aW9uc1tpbmRleF0ub3ZlcnZpZXdMYWJlbFxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IGluZGV4XG5cblxuXG4gIHVwZGF0ZUFuc3dlcjogKGlkLCB2YWx1ZSkgLT5cblxuICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udHlwZSBcblxuICAgIGlzRXhjbHVzaXZlID0gZmFsc2UgfHwgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5leGNsdXNpdmUgXG5cbiAgICBoYXNFeGNsdXNpdmVTaWJsaW5nID0gZmFsc2VcblxuICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF0sIChpbnB1dEl0ZW0pID0+XG5cbiAgICAgIGlmIGlucHV0SXRlbS5leGNsdXNpdmVcblxuICAgICAgICBoYXNFeGNsdXNpdmVTaWJsaW5nID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgb3V0ID0gXG5cbiAgICAgIHR5cGU6IGlucHV0VHlwZVxuXG4gICAgICBpZDogaWRcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cbiAgICBpZiBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94JyB8fCBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICBpZiB2YWx1ZSA9PSAnb24nXG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBpZiBoYXNFeGNsdXNpdmVTaWJsaW5nICYmICFpc0V4Y2x1c2l2ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBlbHNlIGlmIGlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94Jykubm90KCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIGlmIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgJiYgIWlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBhbGxPdGhlcnNEaXNlbmdhZ2VkID0gdHJ1ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpLmVhY2goLT5cblxuICAgICAgICAgICAgaWYgISQodGhpcykuYXR0cignZGF0YS1leGNsdXNpdmUnKSAmJiAkKHRoaXMpLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgICAgICAgICBhbGxPdGhlcnNEaXNlbmdhZ2VkID0gZmFsc2VcblxuICAgICAgICAgIClcblxuICAgICAgICAgIGlmIGFsbE90aGVyc0Rpc2VuZ2FnZWRcblxuICAgICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5yZW1vdmVDbGFzcygnbm90LWVkaXRhYmxlJykuYWRkQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBlbHNlIGlmIGlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94Jykubm90KCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5yZW1vdmVDbGFzcygnbm90LWVkaXRhYmxlJykuYWRkQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgIGVsc2UgaWYgaW5wdXRUeXBlID09ICd0ZXh0JyB8fCBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSB2YWx1ZVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG5cblxuXG4gICAgXG4gICAgXG5cbiBcblxuIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVGltZWxpbmVWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyBcblxuICBlbDogJCgnLmZvcm0tY29udGFpbmVyJylcblxuICBjdXJEYXRlQ29uZmlnOlxuICAgIHRlcm1TdGFydDogJydcbiAgICB0ZXJtRW5kOiAnJ1xuICAgIGNvdXJzZVN0YXJ0OiAnJ1xuICAgIGNvdXJzZUVuZDogJydcbiAgICBjb3Vyc2VTdGFydFdlZWtPZjogJydcbiAgICBjb3Vyc2VFbmRXZWVrT2Y6ICcnXG4gICAgbnVtYmVyV2Vla3M6IDE2XG5cblxuICBkYXlzU2VsZWN0ZWQ6IFtmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV1cblxuICBhbGxEYXRlczogW11cblxuICBkb3dOYW1lczogWydNb25kYXknLCAnVHVlc2RheScsICdXZWRuZXNkYXknLCAnVGh1cnNkYXknLCAnRnJpZGF5JywgJ1NhdHVyZGF5JywgJ1N1bmRheSddXG5cbiAgZG93QWJicnY6IFsnTW9uJywgJ1R1ZXMnLCAnV2VkJywgJ1RodXInLCAnRnJpJywgJ1NhdCcsICdTdW4nXVxuXG4gIHJlbmRlckRheXM6IHRydWVcblxuICBldmVudHM6XG4gICAgJ21vdXNlZG93biAjY0xlbmd0aCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNldXAgI2NMZW5ndGgnICA6ICdjaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSAjY0xlbmd0aCcgOiAnY2hhbmdlSGFuZGxlcidcblxuICAgICdjaGFuZ2UgI3Rlcm1TdGFydERhdGUnIDogJ29uVGVybVN0YXJ0RGF0ZUNoYW5nZSdcblxuICAgICdjaGFuZ2UgI3Rlcm1FbmREYXRlJyA6ICdvblRlcm1FbmREYXRlQ2hhbmdlJ1xuXG4gICAgJ2NoYW5nZSAjY291cnNlU3RhcnREYXRlJyA6ICdvbkNvdXJzZVN0YXJ0RGF0ZUNoYW5nZSdcblxuICAgICdjaGFuZ2UgLmRvd0NoZWNrYm94JyA6ICdvbkRvd1NlbGVjdCdcblxuICBvbkRvd1NlbGVjdDogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBkb3cgPSAkdGFyZ2V0LmF0dHIoJ2lkJylcblxuICAgIGRvd0lkID0gcGFyc2VJbnQoJHRhcmdldC52YWwoKSlcblxuICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgQGRheXNTZWxlY3RlZFtkb3dJZF0gPSB0cnVlXG5cbiAgICBlbHNlXG5cbiAgICAgIEBkYXlzU2VsZWN0ZWRbZG93SWRdID0gZmFsc2VcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgICQoJ2lucHV0W3R5cGU9XCJkYXRlXCJdJykuZGF0ZXBpY2tlcihcblxuICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICBjb25zdHJhaW5JbnB1dDogdHJ1ZVxuXG4gICAgICBmaXJzdERheTogMVxuXG4gICAgKS5wcm9wKCd0eXBlJywndGV4dCcpXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZSA9ICQoJyNzdGFydFdlZWtPZkRhdGUnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUgPSAkKCcjY291cnNlU3RhcnREYXRlJylcblxuICAgIEAkb3V0Q29udGFpbmVyID0gJCgnLm91dHB1dC1jb250YWluZXInKVxuXG4gICAgQCRwcmV2aWV3Q29udGFpbmVyID0gJCgnLnByZXZpZXctY29udGFpbmVyJylcblxuICAgIEBjb3Vyc2VMZW5ndGggPSAkKCcjY0xlbmd0aCcpLnZhbCgpXG5cbiAgICBAY291cnNlRGlmZiA9IDBcblxuICAgIEBkYXRhID0gYXBwbGljYXRpb24udGltZWxpbmVEYXRhQWx0XG5cbiAgICBAdXBkYXRlKClcblxuICByZXNldERhdGVzOiAtPlxuICAgICNUT0RPIC0gTkVFRCBBIFBMQUNFIFRIQVQgUkVTRVRTIEVWRVJZVEhJTkcgLSBFRyBXSEVOIE1BU1RFUiBDT1VSU0UgREFURVMgQ0hBTkdFXG5cblxuICBvblRlcm1TdGFydERhdGVDaGFuZ2U6IChlKSAtPlxuXG4gICAgQGN1ckRhdGVDb25maWcuY291cnNlU3RhcnQgPSAnJ1xuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUudmFsKCcnKVxuXG4gICAgZGF0ZUlucHV0ID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICBuZXdEYXRlID0gbW9tZW50KGRhdGVJbnB1dCkudG9EYXRlKClcblxuICAgIEBjdXJEYXRlQ29uZmlnLnRlcm1TdGFydCA9IG5ld0RhdGVcblxuICAgIEAkY291cnNlU3RhcnREYXRlLmRhdGVwaWNrZXIoJ29wdGlvbicsICdtaW5EYXRlJywgbmV3RGF0ZSlcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgb25UZXJtRW5kRGF0ZUNoYW5nZTogKGUpIC0+XG5cbiAgICBkYXRlSW5wdXQgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgIG5ld0RhdGUgPSBtb21lbnQoZGF0ZUlucHV0KS50b0RhdGUoKVxuXG4gICAgQGN1ckRhdGVDb25maWcudGVybUVuZCA9IG5ld0RhdGVcblxuICAgIEAkY291cnNlU3RhcnREYXRlLmRhdGVwaWNrZXIoJ29wdGlvbicsICdtYXhEYXRlJywgbmV3RGF0ZSlcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgb25Db3Vyc2VTdGFydERhdGVDaGFuZ2U6IChlKSAtPlxuXG4gICAgQHVwZGF0ZVdlZWtseURhdGVzKClcblxuXG4gIHVwZGF0ZVdlZWtseURhdGVzOiAtPlxuXG4gICAgaWYgQCRjb3Vyc2VTdGFydERhdGUudmFsKCkgaXMgJydcblxuICAgICAgQGN1ckRhdGVDb25maWcuY291cnNlU3RhcnQgPSAnJ1xuXG4gICAgICAkKCdzcGFuLmRhdGUnKS5oaWRlKClcblxuICAgICAgcmV0dXJuXG5cbiAgICBAYWxsRGF0ZXMgPSBbXVxuXG4gICAgbmV3U3RhcnREYXRlID0gbmV3IERhdGUoQCRjb3Vyc2VTdGFydERhdGUudmFsKCkpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VTdGFydCA9IG5ld1N0YXJ0RGF0ZVxuXG4gICAgd2Vla09mRGF0ZSA9IEBnZXRXZWVrT2ZEYXRlKG5ld1N0YXJ0RGF0ZSlcblxuICAgIEBjdXJEYXRlQ29uZmlnLmNvdXJzZVN0YXJ0V2Vla09mID0gd2Vla09mRGF0ZVxuXG4gICAgJCgnc3Bhbi5kYXRlJykuZWFjaCgoaW5kZXgsaXRlbSkgPT5cblxuICAgICAgd2Vla0lkID0gcGFyc2VJbnQoJChpdGVtKS5hdHRyKCdkYXRhLXdlZWsnKSlcblxuICAgICAgbmV3RGF0ZSA9IG5ldyBEYXRlKHdlZWtPZkRhdGUpXG5cbiAgICAgIGlmIGluZGV4IGlzIDBcblxuICAgICAgICBAYWxsRGF0ZXMucHVzaChAZ2V0Rm9ybWF0dGVkRGF0ZVN0cmluZyhuZXcgRGF0ZShuZXdEYXRlKSkpXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIG5ld0RhdGUgPSBuZXdEYXRlLnNldERhdGUobmV3RGF0ZS5nZXREYXRlKCkgKyAoNyAqICh3ZWVrSWQtMSkpKVxuXG4gICAgICBAYWxsRGF0ZXMucHVzaChAZ2V0Rm9ybWF0dGVkRGF0ZVN0cmluZyhuZXcgRGF0ZShuZXdEYXRlKSkpXG5cbiAgICAgICQoaXRlbSkuc2hvdygpLnRleHQoQGdldEZvcm1hdHRlZERhdGVTdHJpbmcobmV3IERhdGUobmV3RGF0ZSkpKVxuXG4gICAgKVxuXG4gICAgJCgnc3Bhbi5kYXRlLmRhdGUtMScpLnNob3coKS50ZXh0KEBnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ld1N0YXJ0RGF0ZSkpXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZS52YWwoXCIje0BnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ld1N0YXJ0RGF0ZSl9XCIpXG5cbiAgICAkKCcuZGF0ZXMtcHJldmlldycpLmh0bWwoJycpXG5cbiAgICAkKCcuZGF0ZXMtcHJldmlldycpLmVhY2goKGluZCwgaXRlbSkgPT5cblxuICAgICAgXy5lYWNoKEBkYXlzU2VsZWN0ZWQsIChzZWxlY3RlZCwgc2VsZWN0ZWRJbmRleCkgPT5cblxuICAgICAgICBpZiBzZWxlY3RlZFxuXG4gICAgICAgICAgaWYgaW5kID09IDBcbiAgICAgICAgICAgIHRoZURhdGUgPSBuZXcgRGF0ZSh3ZWVrT2ZEYXRlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhlRGF0ZSA9IG5ldyBEYXRlKEBhbGxEYXRlc1tpbmRdKVxuXG4gICAgICAgICAgdGhlRGF0ZSA9IHRoZURhdGUuc2V0RGF0ZSh0aGVEYXRlLmdldERhdGUoKSArIChzZWxlY3RlZEluZGV4KSlcblxuICAgICAgICAgICQoaXRlbSkuYXBwZW5kKFwiPGRpdiBjbGFzcz0nZG93LWRhdGUgZG93LWRhdGUtLSN7c2VsZWN0ZWRJbmRleH0nID48c3BhbiBjb250ZW50ZWRpdGFibGU+I3tAZG93TmFtZXNbc2VsZWN0ZWRJbmRleF19IHwgPC9zcGFuPjxzcGFuIGNvbnRlbnRlZGl0YWJsZT4je0BnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ldyBEYXRlKHRoZURhdGUpKX08L3NwYW4+PC9kaXY+PGJyLz5cIilcbiAgICAgIClcbiAgICApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIHJldHVyblxuXG4gICAgXG4gIGNoYW5nZUhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGNvdXJzZUxlbmd0aCA9ICQoJyNjTGVuZ3RoJykudmFsKClcblxuICAgIEBjb3Vyc2VEaWZmID0gMTYgLSBAY291cnNlTGVuZ3RoXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VFbmRXZWVrT2YgPSBuZXcgRGF0ZShAYWxsRGF0ZXNbQGNvdXJzZUxlbmd0aC0xXSlcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgdXBkYXRlOiAtPlxuXG4gICAgQG91dCA9IFtdXG5cbiAgICBAdW5pdHNDbG9uZSA9IF8uY2xvbmUoQGRhdGEpXG5cbiAgICBpZiBAY291cnNlRGlmZiA+IDBcblxuICAgICAgQHVuaXRzQ2xvbmUgPSBfLnJlamVjdChAdW5pdHNDbG9uZSwgKGl0ZW0pID0+XG5cbiAgICAgICAgcmV0dXJuIGl0ZW0udHlwZSBpcyAnYnJlYWsnICYmIEBjb3Vyc2VEaWZmID49IGl0ZW0udmFsdWUgJiYgaXRlbS52YWx1ZSAhPSAwXG5cbiAgICAgIClcblxuICAgIG9iaiA9IEB1bml0c0Nsb25lWzBdXG5cbiAgICBfLmVhY2goQHVuaXRzQ2xvbmUsIChpdGVtLCBpbmRleCkgPT5cblxuICAgICAgaWYgaXRlbS50eXBlIGlzICdicmVhaycgfHwgaW5kZXggaXMgQHVuaXRzQ2xvbmUubGVuZ3RoIC0gMVxuXG4gICAgICAgIGlmIGluZGV4IGlzIEB1bml0c0Nsb25lLmxlbmd0aCAtIDFcblxuICAgICAgICAgIEBvdXQucHVzaCBfLmNsb25lKGl0ZW0pXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgQG91dC5wdXNoIF8uY2xvbmUob2JqKVxuXG4gICAgICAgIG9iaiA9IHt9XG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGVsc2UgaWYgaXRlbS50eXBlIGlzICd3ZWVrJ1xuXG4gICAgICAgIG9iaiA9IEBjb21iaW5lKG9iaiwgaXRlbSlcblxuICAgIClcblxuICAgIEByZW5kZXJQcmV2aWV3KClcbiAgICAjQHJlbmRlclJlc3VsdCgpXG5cbiAgICBAdXBkYXRlV2Vla2x5RGF0ZXMoKVxuXG5cbiAgcmVuZGVyUHJldmlldzogLT5cblxuICAgIEAkcHJldmlld0NvbnRhaW5lci5odG1sKCcnKVxuXG4gICAgXy5lYWNoKEBvdXQsIChpdGVtLCBpbmRleCkgPT5cblxuICAgICAgdGhpc1dlZWsgPSBpbmRleCArIDFcbiAgICAgIG5leHRXZWVrID0gaW5kZXggKyAyXG4gICAgICBpc0xhc3RXZWVrID0gaW5kZXggaXMgQG91dC5sZW5ndGggLSAxXG5cbiAgICAgICMgcmVuZGVyVGl0bGVzKClcbiAgICAgIGlmIGl0ZW0udGl0bGUubGVuZ3RoID4gMFxuXG4gICAgICAgIHRpdGxlcyA9IFwiPGRpdj5cIlxuXG4gICAgICAgIHRpdGxlcyArPSBcIjxoNCBkYXRhLXdlZWs9JyN7dGhpc1dlZWt9Jz5XZWVrICN7dGhpc1dlZWt9PHNwYW4gY2xhc3M9J2RhdGUgZGF0ZS0je3RoaXNXZWVrfScgZGF0YS13ZWVrPScje3RoaXNXZWVrfSc+PC9zcGFuPjwvaDQ+XCJcblxuICAgICAgICBfLmVhY2goaXRlbS50aXRsZSwgKHQsIGkpIC0+XG5cbiAgICAgICAgICBpZiBpIGlzIDBcblxuICAgICAgICAgICB0aXRsZXMgKz0gXCI8aDI+I3t0fTwvaDI+XCJcblxuICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgdGl0bGVzICs9IFwiPGgzPiN7dH08L2gzPlwiXG5cbiAgICAgICAgKVxuXG4gICAgICAgIHRpdGxlcyArPSBcIjwvZGl2Pjxici8+XCJcblxuICAgICAgICBAJHByZXZpZXdDb250YWluZXIuYXBwZW5kKHRpdGxlcylcblxuICAgICAgZGF0ZXNPdXQgPSBcIjxkaXYgY2xhc3M9J2RhdGVzLXByZXZpZXcgZGF0ZXMtcHJldmlldy0je3RoaXNXZWVrfScgZGF0YS13ZWVrPScje3RoaXNXZWVrfSc+PC9kaXY+XCJcblxuICAgICAgQCRwcmV2aWV3Q29udGFpbmVyLmFwcGVuZChkYXRlc091dClcblxuICAgICAgIyByZW5kZXJJbkNsYXNzKClcbiAgICAgIGlmIGl0ZW0uaW5fY2xhc3MubGVuZ3RoID4gMFxuXG4gICAgICAgIGluQ2xhc3NPdXQgPSAnPGRpdj4nXG5cbiAgICAgICAgaW5DbGFzc091dCArPSBcIjxoNSBzdHlsZT0nZm9udC13ZWlnaHQ6IGJvbGQ7Jz5JbiBjbGFzczwvaDU+XCJcblxuICAgICAgICBpbkNsYXNzT3V0ICs9ICc8dWw+J1xuXG4gICAgICAgIF8uZWFjaChpdGVtLmluX2NsYXNzLCAoYykgLT5cbiAgICAgICAgICBpbkNsYXNzT3V0ICs9IFwiPGxpPiN7Y308L2xpPlwiXG4gICAgICAgIClcblxuICAgICAgICBpbkNsYXNzT3V0ICs9IFwiPC91bD5cIlxuXG4gICAgICAgIGluQ2xhc3NPdXQgKz0gXCI8L2Rpdj48YnIvPlwiXG5cbiAgICAgICAgQCRwcmV2aWV3Q29udGFpbmVyLmFwcGVuZChpbkNsYXNzT3V0KVxuXG5cbiAgICAgICMgcmVuZGVyQXNzaWdubWVudHMoKVxuICAgICAgaWYgaXRlbS5hc3NpZ25tZW50cy5sZW5ndGggPiAwXG5cbiAgICAgICAgYXNzaWdubWVudHNPdXQgPSBcIjxkaXY+XCJcblxuICAgICAgICBhc3NpZ25tZW50c091dCArPSBcIjxoNSBzdHlsZT0nZm9udC13ZWlnaHQ6IGJvbGQ7Jz5Bc3NpZ25tZW50cyB8IGR1ZSB3ZWVrICN7bmV4dFdlZWt9PC9oNT5cIlxuXG4gICAgICAgIGFzc2lnbm1lbnRzT3V0ICs9ICc8dWw+J1xuXG4gICAgICAgIF8uZWFjaChpdGVtLmFzc2lnbm1lbnRzLCAoYXNzaWduKSAtPlxuICAgICAgICAgIGFzc2lnbm1lbnRzT3V0ICs9IFwiPGxpPiN7YXNzaWdufTwvbGk+XCIgXG4gICAgICAgIClcblxuICAgICAgICBhc3NpZ25tZW50c091dCArPSAnPC91bD4nXG5cbiAgICAgICAgYXNzaWdubWVudHNPdXQgKz0gJzwvZGl2Pjxici8+J1xuXG4gICAgICAgIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQoYXNzaWdubWVudHNPdXQpXG5cblxuICAgICAgIyByZW5kZXJNaWxlc3RvbmVzKClcbiAgICAgIGlmIGl0ZW0ubWlsZXN0b25lcy5sZW5ndGggPiAwXG5cbiAgICAgICAgbWlsZXN0b25lc091dCA9IFwiPGRpdj5cIlxuXG4gICAgICAgIG1pbGVzdG9uZXNPdXQgKz0gXCI8aDUgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+TWlsZXN0b25lczwvaDU+XCJcblxuICAgICAgICBtaWxlc3RvbmVzT3V0ICs9IFwiPHVsPlwiXG5cbiAgICAgICAgXy5lYWNoKGl0ZW0ubWlsZXN0b25lcywgKG1pbGVzdG9uZSkgLT5cbiAgICAgICAgICBtaWxlc3RvbmVzT3V0ICs9IFwiPGxpPiN7bWlsZXN0b25lLnRpdGxlfTwvbGk+XCJcbiAgICAgICAgKVxuXG4gICAgICAgIG1pbGVzdG9uZXNPdXQgKz0gXCI8L3VsPlwiXG5cbiAgICAgICAgbWlsZXN0b25lc091dCArPSBcIjwvZGl2Pjxici8+XCJcblxuICAgICAgICBAJHByZXZpZXdDb250YWluZXIuYXBwZW5kKG1pbGVzdG9uZXNPdXQpXG5cblxuICAgICAgaWYgaXNMYXN0V2Vla1xuXG4gICAgICAgIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQoXCI8aDE+RW5kIG9mIENvdXJzZTwvaDE+XCIpXG5cblxuICAgICAgQCRwcmV2aWV3Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICApXG5cblxuICByZW5kZXJSZXN1bHQ6IC0+XG5cbiAgICBAJG91dENvbnRhaW5lci5odG1sKCcnKS5jc3MoJ3doaXRlLXNwYWNlJywgJ3ByZS13cmFwJylcblxuICAgIF8uZWFjaChAb3V0LCAoaXRlbSwgaW5kZXgpID0+XG5cbiAgICAgIHRoaXNXZWVrID0gaW5kZXggKyAxXG4gICAgICBuZXh0V2VlayA9IGluZGV4ICsgMlxuICAgICAgaXNMYXN0V2VlayA9IGluZGV4IGlzIEBvdXQubGVuZ3RoIC0gMVxuXG5cbiAgICAgIGlmIGl0ZW0udGl0bGUubGVuZ3RoID4gMFxuXG4gICAgICAgIHRpdGxlcyA9IFwiPGRpdj5cIlxuXG4gICAgICAgIHRpdGxlcyArPSBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8ICN7dGhpc1dlZWt9IHwgXCJcblxuICAgICAgICBfLmVhY2goaXRlbS50aXRsZSwgKHQsIGkpIC0+XG5cbiAgICAgICAgICBpZiBpIGlzIDBcblxuICAgICAgICAgICB0aXRsZXMgKz0gXCIje3R9IFwiXG5cbiAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIHRpdGxlcyArPSBcInwgI3t0fSBcIlxuXG4gICAgICAgIClcblxuICAgICAgICB0aXRsZXMgKz0gXCJ9fVwiXG5cbiAgICAgICAgdGl0bGVzICs9IFwiPC9kaXY+XCJcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQodGl0bGVzKVxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICAgIGlmIGl0ZW0uaW5fY2xhc3MubGVuZ3RoID4gMFxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+e3tpbiBjbGFzc319PC9kaXY+XCIpXG5cbiAgICAgICAgXy5lYWNoKGl0ZW0uaW5fY2xhc3MsIChjKSA9PlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj4je2N9PC9kaXY+XCIpXG5cbiAgICAgICAgKVxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXYgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+e3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAje25leHRXZWVrfSB9fTwvZGl2PlwiKVxuXG4gICAgICAgIF8uZWFjaChpdGVtLmFzc2lnbm1lbnRzLCAoYXNzaWduKSA9PlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj4je2Fzc2lnbn08L2Rpdj5cIilcblxuICAgICAgICApXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGJyLz5cIilcblxuICAgICAgaWYgaXRlbS5taWxlc3RvbmVzLmxlbmd0aCA+IDBcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8ZGl2IHN0eWxlPSdmb250LXdlaWdodDogYm9sZDsnPnt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX08L2Rpdj5cIilcblxuICAgICAgICBfLmVhY2goaXRlbS5taWxlc3RvbmVzLCAobSkgPT5cblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXY+I3ttfTwvZGl2PlwiKVxuXG4gICAgICAgIClcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8YnIvPlwiKVxuXG4gICAgICBpZiBpc0xhc3RXZWVrXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3tlbmQgb2YgY291cnNlIHdlZWt9fVwiKVxuXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+PGhyLz5cIilcblxuICAgIClcblxuXG4gIGdldEZvcm1hdHRlZERhdGVTdHJpbmc6IChkYXRlKSAtPlxuICAgIHllYXIgPSBkYXRlLmdldFVUQ0Z1bGxZZWFyKCkudG9TdHJpbmcoKVxuICAgIG1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpKzFcbiAgICBkYXkgPSBkYXRlLmdldFVUQ0RhdGUoKVxuXG4gICAgaWYgbW9udGgudG9TdHJpbmcoKS5sZW5ndGggaXMgMVxuXG4gICAgICBtb250aCA9IFwiMFwiICsgbW9udGgudG9TdHJpbmcoKVxuXG4gICAgZWxzZVxuXG4gICAgICBtb250aCA9IG1vbnRoLnRvU3RyaW5nKClcblxuICAgIGlmIGRheS50b1N0cmluZygpLmxlbmd0aCBpcyAxXG5cbiAgICAgIGRheSA9IFwiMFwiICsgZGF5LnRvU3RyaW5nKClcblxuICAgIGVsc2VcblxuICAgICAgZGF5ID0gZGF5LnRvU3RyaW5nKClcblxuXG4gICAgcmV0dXJuIFwiI3t5ZWFyfS0je21vbnRofS0je2RheX1cIlxuXG5cbiAgZ2V0V2Vla09mRGF0ZTogKGRhdGUpIC0+XG5cbiAgICB5ZWFyID0gZGF0ZS5nZXRVVENGdWxsWWVhcigpLnRvU3RyaW5nKClcblxuICAgIG1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpKzFcblxuICAgIGRheSA9IGRhdGUuZ2V0VVRDRGF5KClcblxuICAgIGRhdGVEYXkgPSBkYXRlLmdldFVUQ0RhdGUoKVxuXG5cbiAgICBpZiBkYXkgaXMgMVxuXG4gICAgICByZXR1cm4gZGF0ZVxuXG4gICAgZWxzZVxuXG4gICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5zZXREYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpLWRhdGUuZ2V0VVRDRGF5KCkpKVxuXG5cbiAgZ2V0V2Vla3NPdXREYXRlOiAoZGF0ZSwgd2Vla3NPdXQpIC0+XG5cbiAgICBuZXdEYXRlID0gbmV3IERhdGUoKVxuXG4gICAgbmV3RGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpKyh3ZWVrc091dCo3KSlcblxuICAgIHJldHVybiBuZXdEYXRlXG5cblxuICBjb21iaW5lOiAob2JqMSwgb2JqMikgLT5cblxuICAgIHRpdGxlID0gXy51bmlvbihvYmoxLnRpdGxlLCBvYmoyLnRpdGxlKVxuXG4gICAgaW5fY2xhc3MgPSBfLnVuaW9uKG9iajEuaW5fY2xhc3MsIG9iajIuaW5fY2xhc3MpXG5cbiAgICBhc3NpZ25tZW50cyA9IF8udW5pb24ob2JqMS5hc3NpZ25tZW50cywgb2JqMi5hc3NpZ25tZW50cylcblxuICAgIG1pbGVzdG9uZXMgPSBfLnVuaW9uKG9iajEubWlsZXN0b25lcywgb2JqMi5taWxlc3RvbmVzKVxuXG4gICAgcmVhZGluZ3MgPSBfLnVuaW9uKG9iajEucmVhZGluZ3MsIG9iajIucmVhZGluZ3MpXG5cbiAgICByZXR1cm4ge3RpdGxlOiB0aXRsZSwgaW5fY2xhc3M6IGluX2NsYXNzLCBhc3NpZ25tZW50czogYXNzaWdubWVudHMsIG1pbGVzdG9uZXM6IG1pbGVzdG9uZXMsIHJlYWRpbmdzOiByZWFkaW5nc31cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4vVmlldycpXG5cblxuI1RFTVBMQVRFU1xuSW5wdXRJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0SXRlbVRlbXBsYXRlLmhicycpXG5cblxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogSW5wdXRJdGVtVGVtcGxhdGVcblxuXG4gIGNsYXNzTmFtZTogJ2N1c3RvbS1pbnB1dC13cmFwcGVyJ1xuXG5cbiAgaG92ZXJUaW1lOiA1MDBcblxuICB0aXBWaXNpYmxlOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwidGV4dFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5pbmZvLWljb24nIDogJ2luZm9JY29uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdmVyIC5jdXN0b20taW5wdXQnIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZWVudGVyIC5jaGVjay1idXR0b24nIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZW91dCcgOiAnbW91c2VvdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0YWJsZSAuY2hlY2stYnV0dG9uJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpb2JveCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0JveENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdmb2N1cyAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkZvY3VzJ1xuXG4gICAgJ2JsdXIgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25CbHVyJ1xuXG5cbiAgaW5mb0ljb25DbGlja0hhbmRsZXI6IC0+XG5cbiAgICB1bmxlc3MgQCRlbC5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuICAgICAgQHNob3dUb29sdGlwKClcbiAgICBlbHNlXG4gICAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcbiAgICAgICAgc2Nyb2xsVG9wOiAwXG4gICAgICAsNTAwKVxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cblxuXG4gIHJhZGlvQm94Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRvdGhlclJhZGlvcyA9IEAkZWwucGFyZW50cygnLnN0ZXAtZm9ybS1pbm5lcicpLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpLmZpbmQoJ2lucHV0JykudmFsKCdvZmYnKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG5cbiAgY2hlY2tCdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpLmxlbmd0aCA+IDBcblxuICAgICAgcmV0dXJuIEByYWRpb0JveENsaWNrSGFuZGxlcihlKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKVxuXG4gICAgICAudG9nZ2xlQ2xhc3MoJ2NoZWNrZWQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29uJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIGZhbHNlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvZmYnKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG5cbiAgaG92ZXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIGNvbnNvbGUubG9nIGUudGFyZ2V0XG5cblxuICBtb3VzZW92ZXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gdHJ1ZVxuICAgICAgXG5cbiAgbW91c2VvdXRIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG4gIHNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8oKSAmJiBAcGFyZW50U3RlcC50aXBWaXNpYmxlID09IGZhbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IHRydWVcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwW2RhdGEtaXRlbS1pbmRleD0nI3tAaXRlbUluZGV4fSddXCIpLmFkZENsYXNzKCd2aXNpYmxlJylcblxuXG4gIGhpZGVUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8oKVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpIFxuXG5cbiAgaGlkZVNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JykuaGFzQ2xhc3MoJ25vdC1lZGl0YWJsZScpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cbiAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgIEBzaG93VG9vbHRpcCgpXG5cblxuICBsYWJlbENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgcmV0dXJuIGZhbHNlXG5cblxuICBpdGVtQ2hhbmdlSGFuZGxlcjogKGUpIC0+XG4gICAgXG4gICAgIyBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdhbnN3ZXI6dXBkYXRlZCcsIGlucHV0SWQsIHZhbHVlKVxuXG4gICAgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Hcm91cCdcblxuICAgICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgICBpbmRleCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ3ZhbHVlJylcblxuICAgICAgcGFyZW50SWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignbmFtZScpXG5cbiAgICAgIGlmICQoZS5jdXJyZW50VGFyZ2V0KS5wcm9wKCdjaGVja2VkJylcblxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVSYWRpb0Fuc3dlcihwYXJlbnRJZCwgaW5kZXgsIHRydWUpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVSYWRpb0Fuc3dlcihwYXJlbnRJZCwgaW5kZXgsIGZhbHNlKVxuXG4gICAgZWxzZVxuXG4gICAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoKVxuXG4gICAgICBpbnB1dElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2lkJylcblxuICAgICAgQHBhcmVudFN0ZXAudXBkYXRlQW5zd2VyKGlucHV0SWQsIHZhbHVlKVxuXG4gICAgICBpZiBAaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICAgIGlmIGlzTmFOKHBhcnNlSW50KHZhbHVlKSlcblxuICAgICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoJycpXG5cbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdncmFkZTpjaGFuZ2UnLCBpbnB1dElkLCB2YWx1ZSlcbiAgICBcbiAgICByZXR1cm4gQHBhcmVudFN0ZXAudXBkYXRlVXNlckFuc3dlcihpbnB1dElkLCB2YWx1ZSwgQGlucHV0VHlwZSlcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFByaXZhdGUgTWV0aG9kc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoQGlucHV0VHlwZSlcblxuICAgIEAkaW5wdXRFbCA9IEAkZWwuZmluZCgnaW5wdXQnKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMudmFsdWUgIT0gJycgJiYgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSA9PSAndGV4dCdcbiAgICAgIFxuICAgICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cbiAgICBAaG92ZXJUaW1lciA9IG51bGxcblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG5cbiAgaGFzSW5mbzogLT5cblxuICAgIHJldHVybiBAJGVsLmhhc0NsYXNzKCdoYXMtaW5mbycpXG5cblxuICBvbkZvY3VzOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgb25CbHVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgaWYgdmFsdWUgPT0gJydcblxuICAgICAgdW5sZXNzICR0YXJnZXQuaXMoJzpmb2N1cycpXG5cbiAgICAgICAgQCRlbC5yZW1vdmVDbGFzcygnb3BlbicpXG5cblxuICBpc0Rpc2FibGVkOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpLmhhc0NsYXNzKCdub3QtZWRpdGFibGUnKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQdWJsaWMgTWV0aG9kc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZW5kZXI6IC0+XG5cbiAgICBzdXBlcigpXG5cblxuICBnZXRJbnB1dFR5cGVPYmplY3Q6IC0+XG5cbiAgICByZXR1cm5EYXRhID0ge31cblxuICAgIHJldHVybkRhdGFbQGlucHV0VHlwZV0gPSB0cnVlXG5cbiAgICByZXR1cm4gcmV0dXJuRGF0YVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgaW5wdXRUeXBlT2JqZWN0ID0gQGdldElucHV0VHlwZU9iamVjdCgpXG5cblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW8nXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICd0ZXh0J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgaWYgQHBhcmVudFN0ZXAubW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZydcblxuICAgICAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5jb250aW5nZW50VXBvbi5sZW5ndGggIT0gMFxuXG4gICAgICAgICAgY3VycmVudFNlbGVjdGVkID0gYXBwbGljYXRpb24uaG9tZVZpZXcuZ2V0U2VsZWN0ZWRJZHMoKVxuXG4gICAgICAgICAgcmVuZGVySW5PdXRwdXQgPSBmYWxzZVxuXG4gICAgICAgICAgXy5lYWNoKEBtb2RlbC5hdHRyaWJ1dGVzLmNvbnRpbmdlbnRVcG9uLCAoaWQpID0+XG5cbiAgICAgICAgICAgIF8uZWFjaChjdXJyZW50U2VsZWN0ZWQsIChzZWxlY3RlZElkKSA9PlxuXG4gICAgICAgICAgICAgIGlmIGlkIGlzIHNlbGVjdGVkSWRcblxuICAgICAgICAgICAgICAgIHJlbmRlckluT3V0cHV0ID0gdHJ1ZVxuXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICB1bmxlc3MgcmVuZGVySW5PdXRwdXRcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG5cblxuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Hcm91cCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2VkaXQnXG5cbiAgICAgIGFsbElucHV0cyA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdXG5cbiAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgXy5lYWNoKGFsbElucHV0cywgKGlucHV0KSA9PlxuXG4gICAgICAgIGlmIGlucHV0LnR5cGVcblxuICAgICAgICAgIGlmIGlucHV0LnR5cGUgaXMgJ2NoZWNrYm94JyB8fCBpbnB1dC50eXBlIGlzICdyYWRpb0JveCdcblxuICAgICAgICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQubGFiZWxcblxuICAgICAgICAgIGVsc2UgaWYgaW5wdXQudHlwZSBpcyAncmFkaW9Hcm91cCdcblxuICAgICAgICAgICAgaWYgaW5wdXQuaWQgaXMgJ3BlZXJfcmV2aWV3cydcblxuICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0Lm92ZXJ2aWV3TGFiZWxcblxuICAgICAgKVxuXG4gICAgICBcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGFzLWNvbnRlbnQnKVxuXG4gICAgICBpZiBzZWxlY3RlZElucHV0cy5sZW5ndGggPT0gMFxuICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIFwiW05vbmUgc2VsZWN0ZWRdXCJcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICBhc3NpZ25tZW50czogc2VsZWN0ZWRJbnB1dHNcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2xpbmsnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG5cbiAgXG4gICAgICBcbiAgICBcbiAgICAgIFxuXG4gICAgXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBCYXNlIFZpZXcgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5yZXF1aXJlKCcuLi8uLi9oZWxwZXJzL1ZpZXdIZWxwZXInKVxuXG5jbGFzcyBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICB0ZW1wbGF0ZTogLT5cbiAgIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG4gIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBpbml0aWFsaXplOiAtPlxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApIClcbiAgICBcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgRVZFTlQgSEFORExFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Il19
