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
    var AppData, HomeView, InputItemView, LoginView, OutputView, Router, TimelineData, TimelineDataAlt;
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
    this.homeView = new HomeView();
    this.loginView = new LoginView();
    this.inputItemView = new InputItemView();
    this.outputView = new OutputView();
    return this.router = new Router();
  }
};

module.exports = Application;



},{"./data/TimelineData":6,"./data/TimelineDataAlt":7,"./data/WizardConfig":8,"./data/WizardContent":9,"./routers/Router":16,"./views/HomeView":36,"./views/InputItemView":37,"./views/LoginView":38,"./views/OutputView":39}],6:[function(require,module,exports){
var TimelineData;

TimelineData = {
  multimedia: ["== Illustrating Wikipedia ==", "{{assignment}}", "{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}", "<br/>{{end of course assignment}}"],
  copyedit: ["== Copyedit Wikipedia ==", "{{assignment}}", "{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}", "<br/>{{end of course assignment}}"]
};

module.exports = TimelineData;



},{}],7:[function(require,module,exports){
var TimelineDataAlt;

TimelineDataAlt = [
  {
    type: 'week',
    title: ['Wikipedia essentials'],
    in_class: [
      {
        text: 'Intro to Wikipedia',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}'
      }
    ],
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
    in_class: [
      {
        text: 'Editing basics in class',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'
      }
    ],
    assignments: [
      {
        text: 'Complete the training',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}'
      }, {
        text: 'Create userpage and sign up',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}'
      }, {
        text: 'Practice communicating',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}'
      }
    ],
    milestones: [
      {
        text: 'Students enrolled',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}'
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
    in_class: [
      {
        text: 'Editing basics in class',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'
      }
    ],
    assignments: [
      {
        text: 'Evaluate an article',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}',
        condition: 'WizardData.getting_started.critique_article.selected'
      }, {
        text: 'Copyedit an article',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}',
        condition: 'WizardData.getting_started.copy_edit_article.selected'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Using sources and choosing articles'],
    in_class: [
      {
        text: 'Using sources in class',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}'
      }
    ],
    assignments: [
      {
        text: 'Add to an article',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}',
        condition: 'WizardData.getting_started.add_to_article.selected'
      }, {
        text: 'Illustrate an article',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}',
        condition: 'WizardData.getting_started.illustrate_article.selected'
      }, {
        text: 'List article choices',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices}}',
        condition: 'WizardData.choosing_articles.students_explore.selected'
      }, {
        text: 'Choose articles from a list',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose articles from a list}}',
        condition: 'WizardData.choosing_articles.prepare_list.selected'
      }, {
        text: 'Evaluate article selections | due = next week',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = next week }}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Finalizing topics and starting research'],
    in_class: [
      {
        text: 'Discuss topics',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}'
      }
    ],
    assignments: [
      {
        text: 'Select article from student choices',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}',
        condition: 'WizardData.choosing_articles.students_explore.selected'
      }, {
        text: 'Compile a bibliography',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 7
  }, {
    type: 'week',
    action: 'combine',
    title: ['Drafting starter articles'],
    in_class: [
      {
        text: 'Discuss etiquette and sandboxes',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}'
      }
    ],
    assignments: [
      {
        text: 'Conventional outline ',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline}}',
        condition: 'WizardData.research_planning.create_outline.selected && WizardData.drafts_mainspace.sandbox.selected'
      }, {
        text: 'Conventional outline | sandbox = no',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline | sandbox = no }}',
        condition: 'WizardData.research_planning.create_outline.selected && WizardData.drafts_mainspace.work_live.selected'
      }, {
        text: 'Outline as lead section',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Outline as lead section}}',
        condition: 'WizardData.research_planning.write_lead.selected'
      }
    ],
    milestones: [
      {
        text: 'Students have started editing',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}'
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
    in_class: [
      {
        text: 'Main space in class',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}'
      }
    ],
    assignments: [
      {
        text: 'Move to main space',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}'
      }, {
        text: 'DYK nominations',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}',
        condition: 'WizardData.dyk.dyk.selected'
      }, {
        text: 'Expand your article',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 0
  }, {
    type: 'week',
    action: 'combine',
    title: ['Building articles'],
    in_class: [
      {
        text: 'Building articles in class',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}'
      }
    ],
    assignments: [
      {
        text: 'Choose one peer review article',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[0].selected'
      }, {
        text: 'Choose peer review articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}',
        condition: '!WizardData.peer_feedback.peer_reviews.options[0].selected'
      }
    ],
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
    assignments: [
      {
        text: 'Complete first draft',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 6
  }, {
    type: 'week',
    action: 'combine',
    title: ['Getting and giving feedback'],
    in_class: [
      {
        text: 'Group suggestions',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}'
      }
    ],
    assignments: [
      {
        text: 'Do one peer review',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[0].selected'
      }, {
        text: 'Do peer reviews',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}',
        condition: '!WizardData.peer_feedback.peer_reviews.options[0].selected'
      }
    ],
    milestones: [
      {
        text: 'Articles have been reviewed',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
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
    in_class: [
      {
        text: 'Media literacy discussion',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}'
      }
    ],
    assignments: [
      {
        text: 'Make edits based on peer reviews',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}'
      }
    ],
    milestones: [
      {
        text: 'Articles have been reviewed',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
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
    in_class: [
      {
        text: 'Discuss further article improvements',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
      }
    ],
    assignments: [
      {
        text: 'Continue improving articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 3
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: [
      {
        text: 'Discuss further article improvements',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
      }
    ],
    assignments: [
      {
        text: 'Continue improving articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 4
  }, {
    type: 'week',
    action: 'omit',
    title: ['Continuing improving articles'],
    in_class: [
      {
        text: 'Discuss further article improvements',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
      }
    ],
    assignments: [
      {
        text: 'Continue improving articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'
      }, {
        text: 'Prepare in-class presentation',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}'
      }
    ],
    milestones: [],
    readings: []
  }, {
    type: 'break',
    value: 9
  }, {
    type: 'week',
    action: 'combine',
    title: ['Finishing touches'],
    in_class: [
      {
        text: 'In-class presentations',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}',
        condition: 'WizardData.supplementary_assignments.class_presentation.selected'
      }
    ],
    assignments: [
      {
        text: 'Final touches to articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}'
      }, {
        text: 'Reflective essay',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}',
        condition: 'WizardData.supplementary_assignments.reflective_essay.selected'
      }, {
        text: 'Wikipedia portfolio',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}',
        condition: 'WizardData.supplementary_assignments.portfolio.selected'
      }, {
        text: 'Original argument paper',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}',
        condition: 'WizardData.supplementary_assignments.original_paper.selected'
      }
    ],
    milestones: [
      {
        text: 'Articles have been reviewed',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
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
        text: 'All students finished',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}'
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
      copyedit: {
        type: 'percent',
        label: 'Copyedit articles',
        id: 'copyedit',
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
    start_date: '',
    start_weekof_date: '',
    end_weekof_date: '',
    end_date: '',
    weekdays_selected: [false, false, false, false, false, false, false],
    length_in_weeks: 16,
    assignments: []
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
  buffer += " <!-- end .step-form-instructions -->\n\n\n\n\n        <!-- BEGIN BUTTON -->\n        <div class=\"step-form-actions\">\n          <a class=\"button button--blue\" id=\"loginButton\" href=\"/auth/mediawiki\">\n            Login with Wikipedia\n          </a>\n        </div><!-- end .step-form-actions -->\n\n\n      </div><!-- end .step-form -->\n    </div>\n  </div>\n</div>";
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
  buffer += "\n  </div>\n   <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n  <div class='form-container custom-input'>\n\n    <form id='courseLength' oninput='out.value = parseInt(courseLength.value); out2.value = parseInt(courseLength.value);' onsubmit='return false'>\n      <div class='overview-input-container'>\n        <label for='termStartDate'>Course begins</label>\n        <input id='termStartDate' name='termStartDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='termEndDate'>Course ends</label>\n        <input id='termEndDate' name='termEndDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='courseStartDate'>Assignment starts</label>\n        <input id='courseStartDate' name='courseStartDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='courseEndDate'>Assignment ends</label>\n        <input id='courseEndDate' name='courseEndDate' type='date'>\n      </div>\n      <div class='overview-input-container overview-input-container--blackout-dates'>\n        <label for='blackoutDates'>No class meeting on</label>\n        <input id='blackoutDates' name='blackoutDates' type='text'>\n      </div>\n      <div class='overview-input-container' style=\"display:none;\">\n        <label for='startWeekOfDate'>Start week of</label>\n        <input id='startWeekOfDate' name='startWeekOfDate' type='date'>\n      </div>\n      <div class='overview-input-container' style=\"display:none;\">\n        <label for='endWeekOfDate'>End week of</label>\n        <input id='endWeekOfDate' name='endWeekOfDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='courseLength' style=\"vertical-align:middle;\">Course Length</label>\n        <input defaultValue='16' id='cLength' max='16' min='6' name='courseLength' step='1' type='range' value='16' style=\"display:none;\">\n        <output name='out2'>16 weeks</output>\n      </div>\n      <div class='overview-select-container'>\n        <label>Class meets on: </label><br/><br/>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='monday' name='Monday' type='checkbox' value='0'>\n          <label for='monday'>Mondays</label>\n        </div>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='tuesday' name='Tuesday' type='checkbox' value='1'>\n          <label for='tuesday'>Tuesdays</label>\n        </div>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='wednesday' name='Wednesday' type='checkbox' value='2'>\n          <label for='wednesday'>Wednesdays</label>\n        </div>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='thursday' name='Thursday' type='checkbox' value='3'>\n          <label for='thursday'>Thursdays</label>\n        </div>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='friday' name='Friday' type='checkbox' value='4'>\n          <label for='friday'>Fridays</label>\n        </div>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='saturday' name='Saturday' type='checkbox' value='5'>\n          <label for='saturday'>Saturdays</label>\n        </div>\n        <div class='overview-select-input-container'>\n          <input class='dowCheckbox' id='sunday' name='Sunday' type='checkbox' value='6'>\n          <label for='sunday'>Sundays</label>\n        </div>\n      </div>\n      <div class='overview-readout-header'>\n        <div class='readout'>\n          <output for='courseLength' id='courseLengthReadout' name='out'>16 weeks</output>\n        </div>\n      </div>\n    </form>\n  </div>\n  <div class=\"output-container\"></div>\n  <div class=\"preview-container\"></div>\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n\n    <div class=\"no-edit-mode\">\n      <a class=\"button button--blue inactive\" id=\"beginButton\" href=\"\">\n        Start designing my assignment\n      </a>\n    </div>\n\n    <div class=\"edit-mode-only\">\n      <a class=\"button button--blue exit-edit\" href=\"#\">\n        Back\n      </a>\n    </div>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
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


  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates auto-height\">\n  <div class=\"custom-input-dates__label\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>\n "
    + "\n\n</div>";
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
    + "\">[edit]</a>\n    <div class=\"custom-input--edit__inner custom-input-accordian__header\">\n      <label>";
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


  buffer += "{{course details <br/>\n | course_name = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.course_name)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | instructor_username = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.instructor_username)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | instructor_realname = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.teacher)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | subject = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.subject)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | start_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.wizard_start_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | end_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.wizard_end_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | institution = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.school)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | expected_students = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.students)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n}}<br/>\n<br/>\n";
  if (stack2 = helpers.description) { stack2 = stack2.call(depth0, {hash:{},data:data}); }
  else { stack2 = depth0.description; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }
  buffer += escapeExpression(stack2)
    + "\n";
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
  
  
  return "interested_in_DYK = no ";
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
  
  
  return " v\n | want_help_finding_articles = yes";
  }

function program12(depth0,data) {
  
  var stack1, stack2;
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { return stack2; }
  else { return ''; }
  }
function program13(depth0,data) {
  
  
  return " <br/>\n | want_help_evaluating_articles = yes";
  }

  buffer += "<br/>\n"
    + "{{course options <br/>\n | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " <br/>\n | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.ga),stack1 == null || stack1 === false ? stack1 : stack1.ga)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.prepare_list)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " <br/>\n}} <br/>\n";
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

  buffer += "==Grading== <br/>\n"
    + "{{assignment grading <br/>\n";
  stack1 = helpers.each.call(depth0, depth0.gradeItems, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " }}\n";
  return buffer;
  })
},{"handleify":4}],32:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, functionType="function", escapeExpression=this.escapeExpression, self=this;

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
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.grading),stack1 == null || stack1 === false ? stack1 : stack1.researchwrite), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "<br/>}}\n";
  return buffer;
  })
},{"handleify":4}],33:[function(require,module,exports){
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
},{"handleify":4}],34:[function(require,module,exports){
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiDatesModule.hbs":25}],35:[function(require,module,exports){
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiGradingModule.hbs":27,"../views/supers/View":45}],36:[function(require,module,exports){
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
    })(this), 1000);
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



},{"../app":5,"../data/WizardStepInputs":11,"../models/StepModel":14,"../templates/HomeTemplate.hbs":17,"../templates/steps/output/WikiOutputTemplate.hbs":33,"../views/StepNavView":41,"../views/StepView":42,"../views/TimelineView":43,"../views/supers/View":45}],37:[function(require,module,exports){
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



},{"../views/supers/InputView":44}],38:[function(require,module,exports){
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



},{"../app":5,"../data/WizardContent":9,"../templates/LoginTemplate.hbs":18,"../views/supers/View":45}],39:[function(require,module,exports){
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

  OutputView.prototype.currentBuild = '';

  OutputView.prototype.detailsTemplate = CourseDetailsTempalte;

  OutputView.prototype.gradingTemplate = GradingTemplate;

  OutputView.prototype.optionsTemplate = CourseOptionsTemplate;

  OutputView.prototype.subscriptions = {
    'wizard:publish': 'publishHandler',
    'output:update': 'updateBuild'
  };

  OutputView.prototype.updateBuild = function(build) {
    return this.currentBuild = build;
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
      console.log(this.currentBuild);
      return this.exportData(this.currentBuild);
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/output/CourseDetailsTemplate.hbs":29,"../templates/steps/output/CourseOptionsTemplate.hbs":30,"../templates/steps/output/GradingTemplate.hbs":32,"../templates/steps/output/WikiOutputTemplate.hbs":33,"../views/supers/View":45}],40:[function(require,module,exports){
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

  OverviewView.prototype.events = {
    'click .expand-all': 'expandCollapseAll'
  };

  OverviewView.prototype.overviewItemTemplate = WikiDetailsModule;

  OverviewView.prototype.expandCollapseAll = function(e) {
    var $target;
    e.preventDefault();
    $target = $(e.currentTarget);
    $target.toggleClass('open');
    $('.custom-input-wrapper.has-content').find('.custom-input-accordian').toggleClass('active');
    if ($target.hasClass('open')) {
      return $target.text('[collapse all]');
    } else {
      return $target.text('[expand all]');
    }
  };

  OverviewView.prototype.render = function() {
    var selectedInputs, selectedObjects, selectedPathways;
    selectedPathways = application.homeView.selectedPathways;
    selectedObjects = _.where(WizardStepInputs['assignment_selection'], {
      selected: true
    });
    $('<div class="step-form-content__title">Selected assignment(s): <a class="expand-all" href="#">[expand all]</a></div>').appendTo(this.$el).css({
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
    this.TimelineView = new TimelineView();
    $descInput = $("<textarea id='short_description' rows='6' style='width:100%;background-color:rgba(242,242,242,1.0);border:1px solid rgba(202,202,202,1.0);padding:10px 15px;font-size: 16px;line-height 23px;letter-spacing: 0.25px;'></textarea>");
    $descInput.val(WizardStepInputs.course_details.description);
    $('.description-container').html($descInput[0]);
    $descInput.off('change');
    $descInput.on('change', (function(_this) {
      return function(e) {
        WizardStepInputs.course_details.description = $(e.target).val();
        _this.TimelineView.update();
        return application.homeView.timelineView.update();
      };
    })(this));
    return this;
  };

  return OverviewView;

})(View);



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/modules/WikiDetailsModule.hbs":26,"../templates/steps/modules/WikiSummaryModule.hbs":28,"../views/TimelineView":43,"../views/supers/View":45}],41:[function(require,module,exports){
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



},{"../app":5,"../templates/StepNavTemplate.hbs":19,"../views/supers/View":45}],42:[function(require,module,exports){
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

  StepView.prototype.validateDates = function() {
    var datesAreValid;
    if (!(this.isFirstStep || this.isLastStep)) {
      return false;
    }
    datesAreValid = false;
    if ($('#termStartDate').val !== '' && $('#termEndDate').val !== '' && $('#courseStartDate').val !== '' && $('#courseEndDate').val !== '') {
      datesAreValid = true;
    }
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
      application.homeView.timelineView.update();
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
    return this;
  };

  StepView.prototype.hideTips = function(e) {
    $('.step-info-tip').removeClass('visible');
    $('.custom-input-wrapper').removeClass('selected');
    return $('body').removeClass('tip-open');
  };

  return StepView;

})(View);



},{"../app":5,"../data/WizardCourseInfo":10,"../data/WizardStepInputs":11,"../templates/steps/IntroStepTemplate.hbs":20,"../templates/steps/StepTemplate.hbs":21,"../templates/steps/info/CourseTipTemplate.hbs":22,"../templates/steps/info/InputTipTemplate.hbs":23,"../templates/steps/modules/WikiDatesModule.hbs":25,"../views/DateInputView":34,"../views/GradingInputView":35,"../views/InputItemView":37,"../views/OverviewView":40,"../views/supers/View":45}],43:[function(require,module,exports){
var DetailsTemplate, GradingCustomTemplate, GradingTemplate, OptionsTemplate, TimelineView, View, WizardData, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

DetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs');

GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs');

GradingCustomTemplate = require('../templates/steps/output/GradingAltTemplate.hbs');

OptionsTemplate = require('../templates/steps/output/CourseOptionsTemplate.hbs');

WizardData = require('../data/WizardStepInputs');

module.exports = TimelineView = (function(_super) {
  __extends(TimelineView, _super);

  function TimelineView() {
    return TimelineView.__super__.constructor.apply(this, arguments);
  }

  TimelineView.prototype.el = $('.form-container');

  TimelineView.prototype.wikiSpace = '{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}<br/>';

  TimelineView.prototype.wikiNoClass = 'NO CLASS WEEK OF ';

  TimelineView.prototype.curDateConfig = {
    termStart: WizardData.course_details.term_start_date,
    termEnd: WizardData.course_details.term_end_date,
    courseStart: WizardData.course_details.start_date,
    courseEnd: WizardData.course_details.end_date,
    courseStartWeekOf: WizardData.course_details.start_weekof_date,
    courseEndWeekOf: WizardData.course_details.end_weekof_date,
    numberWeeks: WizardData.course_details.length_in_weeks
  };

  TimelineView.prototype.daysSelected = WizardData.course_details.weekdays_selected;

  TimelineView.prototype.blackoutDates = WizardData.course_details.blackout_dates;

  TimelineView.prototype.defaultCourseLength = 16;

  TimelineView.prototype.defaultEndDates = ['06-30', '12-31'];

  TimelineView.prototype.allDates = [];

  TimelineView.prototype.dowNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  TimelineView.prototype.dowAbbrv = ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun'];

  TimelineView.prototype.dowLetter = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

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
    WizardData.course_details.weekdays_selected = this.daysSelected;
    return this.update();
  };

  TimelineView.prototype.initialize = function() {
    $('input[type="date"]').datepicker({
      dateFormat: 'yy-mm-dd',
      constrainInput: true,
      firstDay: 1
    }).prop('type', 'text');
    this.$blackoutDates = $('#blackoutDates');
    this.$blackoutDates.multiDatesPicker({
      dateFormat: 'yy-mm-dd',
      constrainInput: true,
      firstDay: 1
    });
    this.$startWeekOfDate = $('#startWeekOfDate');
    this.$courseStartDate = $('#courseStartDate');
    this.$courseEndDate = $('#courseEndDate');
    this.$termStartDate = $('#termStartDate');
    this.$termEndDate = $('#termEndDate');
    this.$outContainer = $('.output-container');
    this.$previewContainer = $('.preview-container');
    this.$courseLengthInput = $('#cLength');
    this.courseLength = this.$courseLengthInput.val();
    this.courseDiff = 0;
    this.data = [];
    this.data = application.timelineDataAlt;
    this.dataAlt = application.timelineData;
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
    $('#termStartDate').on('focus', (function(_this) {
      return function(e) {
        return $('body,html').animate({
          scrollTop: $('#termStartDate').offset().top - 350
        }, 400);
      };
    })(this));
    return this.update();
  };

  TimelineView.prototype.onTermStartDateChange = function(e) {
    var dateInputVal, dateMoment, dateObject, endDateString, isAfter;
    dateInputVal = $(e.currentTarget).val();
    dateMoment = moment(dateInputVal);
    dateObject = dateMoment.toDate();
    this.curDateConfig.termStart = dateObject;
    isAfter = dateMoment.isAfter("" + (dateMoment.year()) + "-06-01");
    if (isAfter) {
      endDateString = "" + (dateMoment.year()) + "-" + this.defaultEndDates[1];
    } else {
      endDateString = "" + (dateMoment.year()) + "-" + this.defaultEndDates[0];
    }
    this.$courseStartDate.val(this.toString(dateObject)).trigger('change');
    this.$termEndDate.val(endDateString);
    return this.update();
  };

  TimelineView.prototype.onTermEndDateChange = function(e) {
    var dateInput, newDate;
    dateInput = $(e.currentTarget).val();
    newDate = moment(dateInput).toDate();
    this.curDateConfig.termEnd = newDate;
    WizardData.course_details.term_end_date = this.toString(newDate);
    this.curDateConfig.courseEnd = newDate;
    WizardData.course_details.end_date = this.toString(newDate);
    this.$courseEndDate.val(dateInput).trigger('change');
    return this.update();
  };

  TimelineView.prototype.onCourseStartDateChange = function(e) {
    var dateInput, dateMoment, endDateString, isAfter, newDate;
    dateInput = $(e.currentTarget).val();
    dateMoment = moment(dateInput);
    newDate = dateMoment.toDate();
    WizardData.intro.wizard_start_date.value = dateInput;
    WizardData.course_details.start_date = dateInput;
    isAfter = dateMoment.isAfter("" + (dateMoment.year()) + "-06-01");
    if (isAfter) {
      endDateString = "" + (dateMoment.year()) + "-" + this.defaultEndDates[1];
    } else {
      endDateString = "" + (dateMoment.year()) + "-" + this.defaultEndDates[0];
    }
    this.curDateConfig.courseStart = newDate;
    this.update();
    return this.$courseEndDate.val(endDateString).trigger('change');
  };

  TimelineView.prototype.onCourseEndDateChange = function(e) {
    var dEnd, dStart, newEnd, newLength, newStart;
    if (this.$courseStartDate.val() === '') {
      return;
    }
    dStart = this.$courseStartDate.val();
    dEnd = this.$courseEndDate.val();
    WizardData.intro.wizard_end_date.value = dEnd;
    newStart = moment(dStart);
    newEnd = moment(dEnd);
    newLength = this.getWeeksDiff(newStart, newEnd);
    if (newLength < 6) {
      newLength = 6;
    } else if (newLength > 16) {
      newLength = 16;
    }
    this.courseLength = newLength;
    this.courseDiff = 16 - this.courseLength;
    WizardData.course_details.length_in_weeks = parseInt(this.courseLength);
    this.curDateConfig.courseEndWeekOf = new Date(this.allDates[this.courseLength - 1]);
    WizardData.course_details.end_weekof_date = this.toString(this.curDateConfig.courseEndWeekOf);
    if (this.courseLength) {
      $('output[name="out2"]').html(this.courseLength + ' weeks');
    } else {
      $('output[name="out2"]').html('');
    }
    return this.update();
  };

  TimelineView.prototype.updateWeeklyDates = function() {
    var courseEndWeekOf, d, newDate, newEndDate, newStartDate, weekOfDate;
    if (this.$courseStartDate.val() === '') {
      this.curDateConfig.courseStart = '';
      WizardData.course_details.start_date = '';
      $('span.date').hide();
      return;
    }
    if (this.$courseEndDate.val() === '') {
      this.curDateConfig.courseEnd = '';
      WizardData.course_details.end_date = '';
      $('span.date').hide();
      return;
    }
    this.allDates = [];
    newStartDate = new Date(this.$courseStartDate.val());
    this.curDateConfig.courseStart = newStartDate;
    WizardData.course_details.start_date = this.toString(newStartDate);
    weekOfDate = this.getWeekOfDate(newStartDate);
    this.curDateConfig.courseStartWeekOf = weekOfDate;
    WizardData.course_details.start_weekof_date = this.toString(weekOfDate);
    newEndDate = new Date(this.$courseEndDate.val());
    this.curDateConfig.courseEnd = newEndDate;
    WizardData.course_details.end_date = this.toString(newEndDate);
    courseEndWeekOf = this.getWeekOfDate(newEndDate);
    this.curDateConfig.courseEndWeekOf = courseEndWeekOf;
    WizardData.course_details.end_weekof_date = this.toString(courseEndWeekOf);
    d = 0;
    while (d < 20) {
      newDate = new Date(weekOfDate);
      if (d === 0) {
        this.allDates.push(this.getFormattedDateString(new Date(newDate)));
      } else {
        newDate = newDate.setDate(newDate.getDate() + (7 * d));
        this.allDates.push(this.getFormattedDateString(new Date(newDate)));
      }
      d++;
    }
    $('span.date').each((function(_this) {
      return function(index, item) {
        newDate = _this.allDates[index];
        return $(item).show().text(newDate);
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
    WizardData.course_details.length_in_weeks = parseInt(this.courseLength);
    this.curDateConfig.courseEndWeekOf = new Date(this.allDates[this.courseLength - 1]);
    WizardData.course_details.end_weekof_date = this.toString(this.curDateConfig.courseEndWeekOf);
    return this.update();
  };

  TimelineView.prototype.update = function() {
    var obj, unitsClone;
    this.out = [];
    this.outWiki = [];
    unitsClone = _.clone(this.data);
    if (this.courseDiff > 0) {
      unitsClone = _.reject(unitsClone, (function(_this) {
        return function(item) {
          return item.type === 'break' && _this.courseDiff >= item.value && item.value !== 0;
        };
      })(this));
    }
    obj = unitsClone[0];
    _.each(unitsClone, (function(_this) {
      return function(item, index) {
        if (item.type === 'break' || index === unitsClone.length - 1) {
          if (index === unitsClone.length - 1) {
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
    this.outWiki = this.out;
    this.renderPreview();
    this.renderResult();
    this.updateWeeklyDates();
    Backbone.Mediator.publish('output:update', this.$outContainer.text());
    return Backbone.Mediator.publish('date:change', this);
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
            return inClassOut += "<li>" + c.text + "</li>";
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
            return assignmentsOut += "<li>" + assign.text + "</li>";
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
            return milestonesOut += "<li>" + milestone.text + "</li>";
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
    var addWeeks, curWeekOffset, currentBlackoutDates, gradingItems;
    currentBlackoutDates = this.$blackoutDates.multiDatesPicker('getDates');
    this.$outContainer.html('');
    this.$outContainer.append(DetailsTemplate(_.extend(WizardData, {
      description: WizardData.course_details.description
    })));
    if (application.homeView.selectedPathways[0] === 'researchwrite') {
      addWeeks = 0;
      this.$outContainer.append("" + this.wikiSpace);
      this.$outContainer.append('{{table of contents}}');
      this.$outContainer.append("" + this.wikiSpace);
      this.$outContainer.append('==Timeline==');
      this.$outContainer.append("" + this.wikiSpace);
      curWeekOffset = 0;
      _.each(this.outWiki, (function(_this) {
        return function(item, index) {
          var dowDateStrings, extra, isLastWeek, nextWeek, noClassDates, noClassThisWeek, thisWeek, thisWeeksDates, titles;
          thisWeek = index + 1;
          nextWeek = index + 2;
          isLastWeek = index === _this.out.length - 1;
          noClassThisWeek = false;
          dowDateStrings = [];
          if (_this.allDates.length > 0) {
            thisWeeksDates = [];
            noClassDates = [];
            _.each(_this.daysSelected, function(day, dayIndex) {
              var dateString, dowLetter, fullDateString, theDate;
              if (day) {
                dowLetter = _this.dowAbbrv[dayIndex];
                theDate = new Date(_this.allDates[index + curWeekOffset]);
                theDate = theDate.setDate(theDate.getDate() + dayIndex);
                dateString = _this.toString(new Date(theDate));
                thisWeeksDates.push(dateString);
                if (_.indexOf(currentBlackoutDates, dateString) !== -1) {
                  fullDateString = "NO CLASS: " + dowLetter + " " + dateString;
                  noClassDates.push(dateString);
                } else {
                  fullDateString = "" + dowLetter + " " + dateString;
                }
                return dowDateStrings.push(fullDateString);
              }
            });
            if (noClassDates.length > 0 && thisWeeksDates.length > 0) {
              if (noClassDates.length === thisWeeksDates.length) {
                noClassThisWeek = true;
                curWeekOffset += 1;
                dowDateStrings = [];
                thisWeeksDates = [];
                noClassDates = [];
                _.each(_this.daysSelected, function(day, dayIndex) {
                  var dateString, dowLetter, fullDateString, theDate;
                  if (day) {
                    dowLetter = _this.dowAbbrv[dayIndex];
                    theDate = new Date(_this.allDates[index + 1]);
                    theDate = theDate.setDate(theDate.getDate() + dayIndex);
                    dateString = _this.toString(new Date(theDate));
                    thisWeeksDates.push(dateString);
                    if (_.indexOf(currentBlackoutDates, dateString) !== -1) {
                      fullDateString = "NO CLASS: " + dowLetter + " " + dateString;
                      noClassDates.push(dateString);
                    } else {
                      fullDateString = "" + dowLetter + " " + dateString;
                    }
                    return dowDateStrings.push(fullDateString);
                  }
                });
              }
            }
          }
          if (noClassThisWeek) {
            _this.$outContainer.append("{{end of course week}}");
            _this.$outContainer.append("" + _this.wikiSpace);
            _this.$outContainer.append("" + _this.wikiSpace);
            _this.$outContainer.append("===" + _this.wikiNoClass + " " + _this.allDates[index + curWeekOffset - 1] + "===");
            _this.$outContainer.append("" + _this.wikiSpace);
            _this.$outContainer.append("" + _this.wikiSpace);
          }
          if (item.title.length > 0) {
            titles = "";
            extra = thisWeek === 1 ? '1' : '';
            titles += "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week " + extra + "| " + thisWeek + " | ";
            _.each(item.title, function(t, i) {
              if (i === 0) {
                return titles += "" + t;
              } else {
                return titles += ", " + t;
              }
            });
            if (_this.allDates.length > 0) {
              titles += " - Week of " + _this.allDates[index + curWeekOffset] + " | weekof = " + _this.allDates[index + curWeekOffset] + " ";
            }
            titles += "}}";
            _this.$outContainer.append(titles);
            _this.$outContainer.append("" + _this.wikiSpace);
            if (dowDateStrings.length > 0) {
              _this.$outContainer.append("'''Class meetings:'''");
              _this.$outContainer.append("" + _this.wikiSpace);
              _.each(dowDateStrings, function(dow, dowIndex) {
                _this.$outContainer.append("" + _this.wikiSpace);
                _this.$outContainer.append("" + dow);
                return _this.$outContainer.append("" + _this.wikiSpace);
              });
              _this.$outContainer.append("" + _this.wikiSpace);
            }
          }
          if (item.in_class.length > 0) {
            _.each(item.in_class, function(c, ci) {
              var condition;
              if (c.condition && c.condition !== '') {
                condition = eval(c.condition);
                if (condition) {
                  if (ci === 0) {
                    _this.$outContainer.append("{{in class}}");
                    _this.$outContainer.append("" + _this.wikiSpace);
                  }
                  _this.$outContainer.append("" + c.wikitext);
                  return _this.$outContainer.append("" + _this.wikiSpace);
                }
              } else {
                if (ci === 0) {
                  _this.$outContainer.append("{{in class}}");
                  _this.$outContainer.append("" + _this.wikiSpace);
                }
                _this.$outContainer.append("" + c.wikitext);
                return _this.$outContainer.append("" + _this.wikiSpace);
              }
            });
            _this.$outContainer.append("" + _this.wikiSpace);
          }
          if (item.assignments.length > 0) {
            _.each(item.assignments, function(assign, ai) {
              var condition;
              if (assign.condition && assign.condition !== '') {
                condition = eval(assign.condition);
                if (condition) {
                  if (ai === 0) {
                    _this.$outContainer.append("{{assignment | due = Week " + nextWeek + " }}");
                    _this.$outContainer.append("" + _this.wikiSpace);
                  }
                  _this.$outContainer.append("" + assign.wikitext);
                  return _this.$outContainer.append("" + _this.wikiSpace);
                }
              } else {
                if (ai === 0) {
                  _this.$outContainer.append("{{assignment | due = Week " + nextWeek + " }}");
                  _this.$outContainer.append("" + _this.wikiSpace);
                }
                _this.$outContainer.append("" + assign.wikitext);
                return _this.$outContainer.append("" + _this.wikiSpace);
              }
            });
            _this.$outContainer.append("" + _this.wikiSpace);
          }
          if (item.milestones.length > 0) {
            _this.$outContainer.append("{{assignment milestones}}");
            _this.$outContainer.append("" + _this.wikiSpace);
            _.each(item.milestones, function(m) {
              if (m.condition && m.condition !== '') {
                _this.$outContainer.append("" + m.wikitext);
                return _this.$outContainer.append("" + _this.wikiSpace);
              } else {
                _this.$outContainer.append("" + m.wikitext);
                return _this.$outContainer.append("" + _this.wikiSpace);
              }
            });
            _this.$outContainer.append("" + _this.wikiSpace);
          }
          if (isLastWeek) {
            _this.$outContainer.append("{{end of course week}}");
            return _this.$outContainer.append("" + _this.wikiSpace);
          }
        };
      })(this));
      this.$outContainer.append(GradingTemplate(WizardData));
    } else {
      this.$outContainer.append("" + this.wikiSpace);
      this.$outContainer.append('{{table of contents}}');
      this.$outContainer.append("" + this.wikiSpace);
      gradingItems = [];
      _.each(application.homeView.selectedPathways, (function(_this) {
        return function(pathway) {
          gradingItems.push(WizardData.grading[pathway][pathway]);
          _.each(_this.dataAlt[pathway], function(item, ind) {
            _this.$outContainer.append("<div>" + item + "</div><br/>");
            if (ind === 0) {
              return _this.$outContainer.append("" + _this.wikiSpace);
            }
          });
          _this.$outContainer.append("<br/>");
          _this.$outContainer.append("" + _this.wikiSpace);
          return _this.$outContainer.append("<div></div>");
        };
      })(this));
      this.$outContainer.append("<br/>");
      this.$outContainer.append(GradingCustomTemplate({
        gradeItems: gradingItems
      }));
    }
    return this.$outContainer.append(OptionsTemplate(WizardData));
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

  TimelineView.prototype.toString = function(date) {
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
    newDate.setHours(0, 0, 0, 0);
    newDate.setDate(date.getDate() + (weeksOut * 7));
    return newDate;
  };

  TimelineView.prototype.getWeeksDiff = function(a, b) {
    return b.diff(a, 'weeks');
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/output/CourseDetailsTemplate.hbs":29,"../templates/steps/output/CourseOptionsTemplate.hbs":30,"../templates/steps/output/GradingAltTemplate.hbs":31,"../templates/steps/output/GradingTemplate.hbs":32,"../views/supers/View":45}],44:[function(require,module,exports){
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
    return e;
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



},{"../../app":5,"../../data/WizardStepInputs":11,"../../templates/steps/inputs/InputItemTemplate.hbs":24,"./View":45}],45:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9UaW1lbGluZURhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1RpbWVsaW5lRGF0YUFsdC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ29uZmlnLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb3Vyc2VJbmZvLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRTdGVwSW5wdXRzLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvbWFpbi5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9TdGVwTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvcm91dGVycy9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvSG9tZVRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2luZm8vSW5wdXRUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGV0YWlsc01vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraVN1bW1hcnlNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nQWx0VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvRGF0ZUlucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0lucHV0SXRlbVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3ZlcnZpZXdWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvU3RlcE5hdlZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1RpbWVsaW5lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvVmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkZBO0FBQ0E7QUFDQTs7QUNNQSxJQUFBLFdBQUE7O0FBQUEsV0FBQSxHQUVFO0FBQUEsRUFBQSxVQUFBLEVBQVksU0FBQSxHQUFBO0FBR1YsUUFBQSw4RkFBQTtBQUFBLElBQUEsT0FBQSxHQUFVLE9BQUEsQ0FBUSxzQkFBUixDQUFWLENBQUE7QUFBQSxJQUVBLFlBQUEsR0FBZSxPQUFBLENBQVEscUJBQVIsQ0FGZixD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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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UixDQUFBOztBQUFBLGlCQXFDQSxXQUFBLEdBQWEsU0FBQSxHQUFBLENBckNiLENBQUE7O0FBdUNBO0FBQUE7OztLQXZDQTs7QUEyQ0E7QUFBQTs7O0tBM0NBOztBQStDQTtBQUFBOzs7S0EvQ0E7O2NBQUE7O0dBRmlCLFFBQVEsQ0FBQyxLQUY1QixDQUFBOztBQUFBLE1BdURNLENBQUMsT0FBUCxHQUFpQixJQXZEakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcycpLmNyZWF0ZSgpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzJykuYXR0YWNoKGV4cG9ydHMpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMnKS5hdHRhY2goZXhwb3J0cykiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCBERVNJR04gV0laQVJEXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICAjIEFwcCBEYXRhXG4gICAgQXBwRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb250ZW50JylcblxuICAgIFRpbWVsaW5lRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGEnKVxuXG4gICAgVGltZWxpbmVEYXRhQWx0ID0gcmVxdWlyZSgnLi9kYXRhL1RpbWVsaW5lRGF0YUFsdCcpXG5cbiAgICBAV2l6YXJkQ29uZmlnID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbmZpZycpXG5cbiAgICBAZGF0YSA9IEFwcERhdGFcblxuICAgIEB0aW1lbGluZURhdGEgPSBUaW1lbGluZURhdGFcblxuICAgIEB0aW1lbGluZURhdGFBbHQgPSBUaW1lbGluZURhdGFBbHRcblxuICAgICMgSW1wb3J0IHZpZXdzXG4gICAgSG9tZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0hvbWVWaWV3JylcblxuICAgIExvZ2luVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvTG9naW5WaWV3JylcblxuICAgIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVycy9Sb3V0ZXInKVxuXG4gICAgSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbiAgICBPdXRwdXRWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9PdXRwdXRWaWV3JylcblxuXG4gICAgIyBJbml0aWFsaXplIHZpZXdzXG4gICAgQGhvbWVWaWV3ID0gbmV3IEhvbWVWaWV3KClcblxuICAgIEBsb2dpblZpZXcgPSBuZXcgTG9naW5WaWV3KClcblxuICAgIEBpbnB1dEl0ZW1WaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoKVxuXG4gICAgQG91dHB1dFZpZXcgPSBuZXcgT3V0cHV0VmlldygpXG5cbiAgICBAcm91dGVyID0gbmV3IFJvdXRlcigpXG5cbiAgICBcbiAgICBcbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb24iLCJUaW1lbGluZURhdGEgPSBcbiAgbXVsdGltZWRpYTogW1xuICAgIFwiPT0gSWxsdXN0cmF0aW5nIFdpa2lwZWRpYSA9PVwiXG4gICAgXCJ7e2Fzc2lnbm1lbnR9fVwiXG4gICAgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSWxsdXN0cmF0ZSBhbiBhcnRpY2xlfX1cIlxuICAgIFwiPGJyLz57e2VuZCBvZiBjb3Vyc2UgYXNzaWdubWVudH19XCJcbiAgXVxuICBjb3B5ZWRpdDogW1xuICAgIFwiPT0gQ29weWVkaXQgV2lraXBlZGlhID09XCJcbiAgICBcInt7YXNzaWdubWVudH19XCJcbiAgICBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db3B5ZWRpdCBhbiBhcnRpY2xlfX1cIlxuICAgIFwiPGJyLz57e2VuZCBvZiBjb3Vyc2UgYXNzaWdubWVudH19XCJcbiAgXVxuXG5tb2R1bGUuZXhwb3J0cyA9IFRpbWVsaW5lRGF0YVxuXG4iLCJUaW1lbGluZURhdGFBbHQgPSBbXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIHRpdGxlOiBbJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnSW50cm8gdG8gV2lraXBlZGlhJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbnRybyB0byBXaWtpcGVkaWF9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDVcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0VkaXRpbmcgYmFzaWNzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRWRpdGluZyBiYXNpY3MgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb21wbGV0ZSB0aGUgdHJhaW5pbmcnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIHRoZSB0cmFpbmluZ319J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fSdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1ByYWN0aWNlIGNvbW11bmljYXRpbmcnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByYWN0aWNlIGNvbW11bmljYXRpbmd9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnU3R1ZGVudHMgZW5yb2xsZWQnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogOFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRWRpdGluZyBiYXNpY3MgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFdmFsdWF0ZSBhbiBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhbiBhcnRpY2xlfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZ2V0dGluZ19zdGFydGVkLmNyaXRpcXVlX2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db3B5ZWRpdCBhbiBhcnRpY2xlfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZ2V0dGluZ19zdGFydGVkLmNvcHlfZWRpdF9hcnRpY2xlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdVc2luZyBzb3VyY2VzIGluIGNsYXNzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Vc2luZyBzb3VyY2VzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWRkIHRvIGFuIGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5nZXR0aW5nX3N0YXJ0ZWQuYWRkX3RvX2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdJbGx1c3RyYXRlIGFuIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmdldHRpbmdfc3RhcnRlZC5pbGx1c3RyYXRlX2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdMaXN0IGFydGljbGUgY2hvaWNlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXN9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5jaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIGFydGljbGVzIGZyb20gYSBsaXN0J1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3R9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5jaG9vc2luZ19hcnRpY2xlcy5wcmVwYXJlX2xpc3Quc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFdmFsdWF0ZSBhcnRpY2xlIHNlbGVjdGlvbnMgfCBkdWUgPSBuZXh0IHdlZWsnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IG5leHQgd2VlayB9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0ZpbmFsaXppbmcgdG9waWNzIGFuZCBzdGFydGluZyByZXNlYXJjaCddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgdG9waWNzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuY2hvb3NpbmdfYXJ0aWNsZXMuc3R1ZGVudHNfZXhwbG9yZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbXBpbGUgYSBiaWJsaW9ncmFwaHknXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBpbGUgYSBiaWJsaW9ncmFwaHl9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDdcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0RyYWZ0aW5nIHN0YXJ0ZXIgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb252ZW50aW9uYWwgb3V0bGluZSAnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucmVzZWFyY2hfcGxhbm5pbmcuY3JlYXRlX291dGxpbmUuc2VsZWN0ZWQgJiYgV2l6YXJkRGF0YS5kcmFmdHNfbWFpbnNwYWNlLnNhbmRib3guc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfCBzYW5kYm94ID0gbm8gfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucmVzZWFyY2hfcGxhbm5pbmcuY3JlYXRlX291dGxpbmUuc2VsZWN0ZWQgJiYgV2l6YXJkRGF0YS5kcmFmdHNfbWFpbnNwYWNlLndvcmtfbGl2ZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ091dGxpbmUgYXMgbGVhZCBzZWN0aW9uJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PdXRsaW5lIGFzIGxlYWQgc2VjdGlvbn19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnJlc2VhcmNoX3BsYW5uaW5nLndyaXRlX2xlYWQuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBoYXZlIHN0YXJ0ZWQgZWRpdGluZ319J1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ01vdmluZyBhcnRpY2xlcyB0byB0aGUgbWFpbiBzcGFjZSddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ01haW4gc3BhY2UgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01haW4gc3BhY2UgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ01vdmUgdG8gbWFpbiBzcGFjZSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTW92ZSB0byBtYWluIHNwYWNlfX0nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEWUsgbm9taW5hdGlvbnMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RZSyBub21pbmF0aW9uc319J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmR5ay5keWsuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFeHBhbmQgeW91ciBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBhbmQgeW91ciBhcnRpY2xlfX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydCdWlsZGluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzBdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSB7e3BlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLnZhbHVlfX0gfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJyFXaXphcmREYXRhLnBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnNbMF0uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAyXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydDcmVhdGluZyBmaXJzdCBkcmFmdCddXG4gICAgaW5fY2xhc3M6IFtcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbXBsZXRlIGZpcnN0IGRyYWZ0JyAjMURDXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA2XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2snXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdHcm91cCBzdWdnZXN0aW9ucydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0RvIG9uZSBwZWVyIHJldmlldydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gb25lIHBlZXIgcmV2aWV3fX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9uc1swXS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0RvIHBlZXIgcmV2aWV3cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fSB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnIVdpemFyZERhdGEucGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9uc1swXS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydSZXNwb25kaW5nIHRvIGZlZWRiYWNrJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbidcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbn19J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3MnICNSRkIgXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX0nICNSRkIgXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ29taXQnXG4gICAgdGl0bGU6IFsnQ29udGludWluZyBpbXByb3ZpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50c319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzJyBcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAzXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnIFxuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXN9fScgXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA0XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlc319J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb24nXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9ufX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA5XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydGaW5pc2hpbmcgdG91Y2hlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0luLWNsYXNzIHByZXNlbnRhdGlvbnMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luLWNsYXNzIHByZXNlbnRhdGlvbnN9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLmNsYXNzX3ByZXNlbnRhdGlvbi5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXN9fSdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1JlZmxlY3RpdmUgZXNzYXl9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLnJlZmxlY3RpdmVfZXNzYXkuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XaWtpcGVkaWEgcG9ydGZvbGlvfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5wb3J0Zm9saW8uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdPcmlnaW5hbCBhcmd1bWVudCBwYXBlcidcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3JpZ2luYWwgYXJndW1lbnQgcGFwZXJ9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLm9yaWdpbmFsX3BhcGVyLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19J1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDEwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydEdWUgZGF0ZScgXVxuICAgIGluX2NsYXNzOiBbXVxuICAgIGFzc2lnbm1lbnRzOiBbXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FsbCBzdHVkZW50cyBmaW5pc2hlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWxsIHN0dWRlbnRzIGZpbmlzaGVkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG5dXG5cbm1vZHVsZS5leHBvcnRzID0gVGltZWxpbmVEYXRhQWx0XG5cbiIsIldpemFyZENvbmZpZyA9IHtcbiAgaW50cm9fc3RlcHM6IFtcbiAgICB7XG4gICAgICBpZDogXCJpbnRyb1wiXG4gICAgICB0aXRsZTogJzxjZW50ZXI+V2VsY29tZSB0byB0aGU8YnIgLz5Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQhPC9jZW50ZXI+J1xuICAgICAgbG9naW5faW5zdHJ1Y3Rpb25zOiAnQ2xpY2sgTG9naW4gd2l0aCBXaWtpcGVkaWEgdG8gZ2V0IHN0YXJ0ZWQnXG4gICAgICBpbnN0cnVjdGlvbnM6ICcnXG4gICAgICBpbnB1dHM6IFtdXG4gICAgICBzZWN0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPlRoaXMgdG9vbCB3aWxsIGhlbHAgeW91IHRvIGVhc2lseSBjcmVhdGUgYSBjdXN0b21pemVkIFdpa2lwZWRpYSBjbGFzc3Jvb20gYXNzaWdubWVudCBhbmQgY3VzdG9taXplZCBzeWxsYWJ1cyBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+V2hlbiB5b3XigJlyZSBmaW5pc2hlZCwgeW91J2xsIGhhdmUgYSByZWFkeS10by11c2UgbGVzc29uIHBsYW4sIHdpdGggd2Vla2x5IGFzc2lnbm1lbnRzLCBwdWJsaXNoZWQgZGlyZWN0bHkgb250byBhIHNhbmRib3ggcGFnZSBvbiBXaWtpcGVkaWEgd2hlcmUgeW91IGNhbiBjdXN0b21laXplIGl0IGV2ZW4gZnVydGhlci48L3A+XCIgICAgIFxuICAgICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPkxldOKAmXMgc3RhcnQgYnkgZmlsbGluZyBpbiBzb21lIGJhc2ljcyBhYm91dCB5b3UgYW5kIHlvdXIgY291cnNlOjwvcD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgICB7XG4gICAgICBpZDogXCJhc3NpZ25tZW50X3NlbGVjdGlvblwiXG4gICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgdHlwZSBzZWxlY3Rpb24nXG4gICAgICBpbmZvVGl0bGU6ICdBYm91dCBhc3NpZ25tZW50IHNlbGVjdGlvbnMnXG4gICAgICBmb3JtVGl0bGU6ICdBdmFpbGFibGUgYXNzaWdubWVudHM6J1xuICAgICAgaW5zdHJ1Y3Rpb25zOiBcIllvdSBjYW4gdGVhY2ggd2l0aCBXaWtpcGVkaWEgaW4gc2V2ZXJhbCBkaWZmZXJlbnQgd2F5cywgYW5kIGl0J3MgaW1wb3J0YW50IHRvIGRlc2lnbiBhbiBhc3NpZ25tZW50IHRoYXQgaXMgc3VpdGFibGUgZm9yIFdpa2lwZWRpYSA8ZW0+YW5kPC9lbT4gYWNoaWV2ZXMgeW91ciBzdHVkZW50IGxlYXJuaW5nIG9iamVjdGl2ZXMuIFlvdXIgZmlyc3Qgc3RlcCBpcyB0byBjaG9vc2Ugd2hpY2ggYXNzaWdubWVudChzKSB5b3UnbGwgYmUgYXNraW5nIHlvdXIgc3R1ZGVudHMgdG8gY29tcGxldGUgYXMgcGFydCBvZiB0aGUgY291cnNlLlwiXG4gICAgICBpbnB1dHM6IFtdXG4gICAgICBzZWN0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5XZSd2ZSBjcmVhdGVkIHNvbWUgZ3VpZGVsaW5lcyB0byBoZWxwIHlvdSwgYnV0IHlvdSdsbCBuZWVkIHRvIG1ha2Ugc29tZSBrZXkgZGVjaXNpb25zLCBzdWNoIGFzOiB3aGljaCBsZWFybmluZyBvYmplY3RpdmVzIGFyZSB5b3UgdGFyZ2V0aW5nIHdpdGggdGhpcyBhc3NpZ25tZW50PyBXaGF0IHNraWxscyBkbyB5b3VyIHN0dWRlbnRzIGFscmVhZHkgaGF2ZT8gSG93IG11Y2ggdGltZSBjYW4geW91IGRldm90ZSB0byB0aGUgYXNzaWdubWVudD88L3A+XCJcbiAgICAgICAgICAgIFwiPHA+TW9zdCBpbnN0cnVjdG9ycyBhc2sgdGhlaXIgc3R1ZGVudHMgdG8gd3JpdGUgb3IgZXhwYW5kIGFuIGFydGljbGUuIFN0dWRlbnRzIHN0YXJ0IGJ5IGxlYXJuaW5nIHRoZSBiYXNpY3Mgb2YgV2lraXBlZGlhLCBhbmQgdGhlbiBmb2N1cyBvbiB0aGUgY29udGVudC4gVGhleSBwbGFuLCByZXNlYXJjaCwgYW5kIHdyaXRlIGEgcHJldmlvdXNseSBtaXNzaW5nIFdpa2lwZWRpYSBhcnRpY2xlLCBvciBjb250cmlidXRlIHRvIGFuIGluY29tcGxldGUgZW50cnkgb24gYSBjb3Vyc2UtcmVsYXRlZCB0b3BpYy4gVGhpcyBhc3NpZ25tZW50IHR5cGljYWxseSByZXBsYWNlcyBhIHRlcm0gcGFwZXIgb3IgcmVzZWFyY2ggcHJvamVjdCwgb3IgaXQgZm9ybXMgdGhlIGxpdGVyYXR1cmUgcmV2aWV3IHNlY3Rpb24gb2YgYSBsYXJnZXIgcGFwZXIuIFRoZSBzdHVkZW50IGxlYXJuaW5nIG91dGNvbWUgaXMgaGlnaCB3aXRoIHRoaXMgYXNzaWdubWVudCwgYnV0IGl0IGRvZXMgdGFrZSBhIHNpZ25pZmljYW50IGFtb3VudCBvZiB0aW1lLiBZb3VyIHN0dWRlbnRzIG5lZWQgdG8gbGVhcm4gYm90aCB0aGUgd2lraSBtYXJrdXAgbGFuZ3VhZ2UgYW5kIGtleSBwb2xpY2llcyBhbmQgZXhwZWN0YXRpb25zIG9mIHRoZSBXaWtpcGVkaWEtZWRpdGluZyBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICBcIjxwPklmIHdyaXRpbmcgYW4gYXJ0aWNsZSBpc24ndCByaWdodCBmb3IgeW91ciBjbGFzcywgb3RoZXIgYXNzaWdubWVudCBvcHRpb25zIG9mZmVyIHN0dWRlbnRzIHZhbHVhYmxlIGxlYXJuaW5nIG9wcG9ydHVuaXRpZXMgYW5kIGhlbHAgdG8gaW1wcm92ZSBXaWtpcGVkaWEuIFNlbGVjdCBhbiBhc3NpZ25tZW50IHR5cGUgb24gdGhlIGxlZnQgdG8gbGVhcm4gbW9yZS48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gIF1cbiAgcGF0aHdheXM6IHtcbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgIHJlc2VhcmNod3JpdGU6IFtcbiAgICAgIHtcbiAgICAgICAgaWQ6IFwibGVhcm5pbmdfZXNzZW50aWFsc1wiXG4gICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIlRvIGdldCBzdGFydGVkLCB5b3UnbGwgd2FudCB0byBpbnRyb2R1Y2UgeW91ciBzdHVkZW50cyB0byB0aGUgYmFzaWMgcnVsZXMgb2Ygd3JpdGluZyBXaWtpcGVkaWEgYXJ0aWNsZXMgYW5kIHdvcmtpbmcgd2l0aCB0aGUgV2lraXBlZGlhIGNvbW11bml0eS5cIlxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5BcyB0aGVpciBmaXJzdCBXaWtpcGVkaWEgYXNzaWdubWVudCBtaWxlc3RvbmUsIHlvdSBjYW4gYXNrIHRoZSBzdHVkZW50cyB0byBjcmVhdGUgdXNlciBhY2NvdW50cyBhbmQgdGhlbiBjb21wbGV0ZSB0aGUgPGVtPm9ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHM8L2VtPi4gVGhpcyB0cmFpbmluZyBpbnRyb2R1Y2VzIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5IGFuZCBob3cgaXQgd29ya3MsIGRlbW9uc3RyYXRlcyB0aGUgYmFzaWNzIG9mIGVkaXRpbmcgYW5kIHdhbGtzIHN0dWRlbnRzIHRocm91Z2ggdGhlaXIgZmlyc3QgZWRpdHMsIGdpdmVzIGFkdmljZSBmb3Igc2VsZWN0aW5nIGFydGljbGVzIGFuZCBkcmFmdGluZyByZXZpc2lvbnMsIGFuZCBleHBsYWlucyBmdXJ0aGVyIHNvdXJjZXMgb2Ygc3VwcG9ydCBhcyB0aGV5IGNvbnRpbnVlIGFsb25nLiBJdCB0YWtlcyBhYm91dCBhbiBob3VyIGFuZCBlbmRzIHdpdGggYSBjZXJ0aWZpY2F0aW9uIHN0ZXAsIHdoaWNoIHlvdSBjYW4gdXNlIHRvIHZlcmlmeSB0aGF0IHN0dWRlbnRzIGNvbXBsZXRlZCB0aGUgdHJhaW5pbmcuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlN0dWRlbnRzIHdobyBjb21wbGV0ZSB0aGlzIHRyYWluaW5nIGFyZSBiZXR0ZXIgcHJlcGFyZWQgdG8gZm9jdXMgb24gbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBzcGVuZCBsZXNzIHRpbWUgZGlzdHJhY3RlZCBieSBjbGVhbmluZyB1cCBhZnRlciBlcnJvcnMuPC9wPidcbiAgICAgICAgICAgICAgJzxwPldpbGwgY29tcGxldGlvbiBvZiB0aGUgc3R1ZGVudCB0cmFpbmluZyBiZSBwYXJ0IG9mIHlvdXIgc3R1ZGVudHNcXCcgZ3JhZGVzPyAoTWFrZSB5b3VyIGNob2ljZSBhdCB0aGUgdG9wIGxlZnQuKTwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnQXNzaWdubWVudCBtaWxlc3RvbmVzJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICAgIDxsaT5DcmVhdGUgYSB1c2VyIGFjY291bnQgYW5kIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkNvbXBsZXRlIHRoZSA8ZW0+b25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50czwvZW0+LiBEdXJpbmcgdGhpcyB0cmFpbmluZywgeW91IHdpbGwgbWFrZSBlZGl0cyBpbiBhIHNhbmRib3ggYW5kIGxlYXJuIHRoZSBiYXNpYyBydWxlcyBvZiBXaWtpcGVkaWEuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+VG8gcHJhY3RpY2UgZWRpdGluZyBhbmQgY29tbXVuaWNhdGluZyBvbiBXaWtpcGVkaWEsIGludHJvZHVjZSB5b3Vyc2VsZiB0byBhbnkgV2lraXBlZGlhbnMgaGVscGluZyB5b3VyIGNsYXNzIChzdWNoIGFzIGEgV2lraXBlZGlhIEFtYmFzc2Fkb3IpLCBhbmQgbGVhdmUgYSBtZXNzYWdlIGZvciBhIGNsYXNzbWF0ZSBvbiB0aGVpciB1c2VyIHRhbGsgcGFnZS48L2xpPlxuICAgICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcImdldHRpbmdfc3RhcnRlZFwiXG4gICAgICAgIHRpdGxlOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgZWFybHkgZWRpdGluZyB0YXNrcydcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkl0IGlzIGltcG9ydGFudCBmb3Igc3R1ZGVudHMgdG8gc3RhcnQgZWRpdGluZyBXaWtpcGVkaWEgZWFybHkgb24uIFRoYXQgd2F5LCB0aGV5IGJlY29tZSBmYW1pbGlhciB3aXRoIFdpa2lwZWRpYSdzIG1hcmt1cCAoXFxcIndpa2lzeW50YXhcXFwiLCBcXFwid2lraW1hcmt1cFxcXCIsIG9yIFxcXCJ3aWtpY29kZVxcXCIpIGFuZCB0aGUgbWVjaGFuaWNzIG9mIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gdGhlIHNpdGUuIFdlIHJlY29tbWVuZCBhc3NpZ25pbmcgYSBmZXcgYmFzaWMgV2lraXBlZGlhIHRhc2tzIGVhcmx5IG9uLlwiXG4gICAgICAgIGZvcm1UaXRsZTogJ1doaWNoIGJhc2ljIGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGU/J1xuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5XaGljaCBpbnRyb2R1Y3RvcnkgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gdXNlIHRvIGFjY2xpbWF0ZSB5b3VyIHN0dWRlbnRzIHRvIFdpa2lwZWRpYT8gWW91IGNhbiBzZWxlY3Qgbm9uZSwgb25lLCBvciBtb3JlLiBXaGljaGV2ZXIgeW91IHNlbGVjdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBhc3NpZ25tZW50IHRpbWVsaW5lLjwvcD4nXG4gICAgICAgICAgICAgICc8dWw+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q3JpdGlxdWUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQ3JpdGljYWxseSBldmFsdWF0ZSBhbiBleGlzdGluZyBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcywgYW5kIGxlYXZlIHN1Z2dlc3Rpb25zIGZvciBpbXByb3ZpbmcgaXQgb24gdGhlIGFydGljbGXigJlzIHRhbGsgcGFnZS4gPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+PHN0cm9uZz5BZGQgdG8gYW4gYXJ0aWNsZS48L3N0cm9uZz4gVXNpbmcgY291cnNlIHJlYWRpbmdzIG9yIG90aGVyIHJlbGV2YW50IHNlY29uZGFyeSBzb3VyY2VzLCBhZGQgMeKAkzIgc2VudGVuY2VzIG9mIG5ldyBpbmZvcm1hdGlvbiB0byBhIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLiBCZSBzdXJlIHRvIGludGVncmF0ZSBpdCB3ZWxsIGludG8gdGhlIGV4aXN0aW5nIGFydGljbGUsIGFuZCBpbmNsdWRlIGEgY2l0YXRpb24gdG8gdGhlIHNvdXJjZS4gPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+PHN0cm9uZz5Db3B5ZWRpdCBhbiBhcnRpY2xlLjwvc3Ryb25nPiBCcm93c2UgV2lraXBlZGlhIHVudGlsIHlvdSBmaW5kIGFuIGFydGljbGUgdGhhdCB5b3Ugd291bGQgbGlrZSB0byBpbXByb3ZlLCBhbmQgbWFrZSBzb21lIGVkaXRzIHRvIGltcHJvdmUgdGhlIGxhbmd1YWdlIG9yIGZvcm1hdHRpbmcuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+SWxsdXN0cmF0ZSBhbiBhcnRpY2xlLjwvc3Ryb25nPiBGaW5kIGFuIG9wcG9ydHVuaXR5IHRvIGltcHJvdmUgYW4gYXJ0aWNsZSBieSB1cGxvYWRpbmcgYW5kIGFkZGluZyBhIHBob3RvIHlvdSB0b29rLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5Gb3IgbW9zdCBjb3Vyc2VzLCB0aGUgPGVtPkNyaXRpcXVlIGFuIGFydGljbGU8L2VtPiBhbmQgPGVtPkFkZCB0byBhbiBhcnRpY2xlPC9lbT4gZXhlcmNpc2VzIHByb3ZpZGUgYSBuaWNlIGZvdW5kYXRpb24gZm9yIHRoZSBtYWluIHdyaXRpbmcgcHJvamVjdC4gVGhlc2UgaGF2ZSBiZWVuIHNlbGVjdGVkIGJ5IGRlZmF1bHQuPC9wPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgICAgdGl0bGU6ICdDaG9vc2luZyBhcnRpY2xlcydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgZm9ybVRpdGxlOiAnSG93IHdpbGwgeW91ciBjbGFzcyBzZWxlY3QgYXJ0aWNsZXM/J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBjaG9vc2luZyBhcnRpY2xlcydcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+Q2hvb3NpbmcgdGhlIHJpZ2h0IChvciB3cm9uZykgYXJ0aWNsZXMgdG8gd29yayBvbiBjYW4gbWFrZSAob3IgYnJlYWspIGEgV2lraXBlZGlhIHdyaXRpbmcgYXNzaWdubWVudC48L3A+J1xuICAgICAgICAgICAgICAnPHA+U29tZSBhcnRpY2xlcyBtYXkgaW5pdGlhbGx5IGxvb2sgZWFzeSB0byBpbXByb3ZlLCBidXQgcXVhbGl0eSByZWZlcmVuY2VzIHRvIGV4cGFuZCB0aGVtIG1heSBiZSBkaWZmaWN1bHQgdG8gZmluZC4gRmluZGluZyB0b3BpY3Mgd2l0aCB0aGUgcmlnaHQgYmFsYW5jZSBiZXR3ZWVuIHBvb3IgV2lraXBlZGlhIGNvdmVyYWdlIGFuZCBhdmFpbGFibGUgbGl0ZXJhdHVyZSBmcm9tIHdoaWNoIHRvIGV4cGFuZCB0aGF0IGNvdmVyYWdlIGNhbiBiZSB0cmlja3kuIEhlcmUgYXJlIHNvbWUgZ3VpZGVsaW5lcyB0byBrZWVwIGluIG1pbmQgd2hlbiBzZWxlY3RpbmcgYXJ0aWNsZXMgZm9yIGltcHJvdmVtZW50LjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnR29vZCBjaG9pY2UnXG4gICAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICAgICAgPGxpPkNob29zZSBhIHdlbGwtZXN0YWJsaXNoZWQgdG9waWMgZm9yIHdoaWNoIGEgbG90IG9mIGxpdGVyYXR1cmUgaXMgYXZhaWxhYmxlIGluIGl0cyBmaWVsZCwgYnV0IHdoaWNoIGlzbid0IGNvdmVyZWQgZXh0ZW5zaXZlbHkgb24gV2lraXBlZGlhLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMeKAkzIgcGFyYWdyYXBocyBvZiBpbmZvcm1hdGlvbiBhbmQgYXJlIGluIG5lZWQgb2YgZXhwYW5zaW9uLiBSZWxldmFudCBXaWtpUHJvamVjdCBwYWdlcyBjYW4gcHJvdmlkZSBhIGxpc3Qgb2Ygc3R1YnMgdGhhdCBuZWVkIGltcHJvdmVtZW50LjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkJlZm9yZSBjcmVhdGluZyBhIG5ldyBhcnRpY2xlLCBzZWFyY2ggcmVsYXRlZCB0b3BpY3Mgb24gV2lraXBlZGlhIHRvIG1ha2Ugc3VyZSB5b3VyIHRvcGljIGlzbid0IGFscmVhZHkgY292ZXJlZCBlbHNld2hlcmUuIE9mdGVuLCBhbiBhcnRpY2xlIG1heSBleGlzdCB1bmRlciBhbm90aGVyIG5hbWUsIG9yIHRoZSB0b3BpYyBtYXkgYmUgY292ZXJlZCBhcyBhIHN1YnNlY3Rpb24gb2YgYSBicm9hZGVyIGFydGljbGUuPC9saT5cbiAgICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkFydGljbGVzIHRoYXQgYXJlIFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD4nXG4gICAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICAgIDxsaT5Zb3UgcHJvYmFibHkgc2hvdWxkbid0IHRyeSB0byBjb21wbGV0ZWx5IG92ZXJoYXVsIGFydGljbGVzIG9uIHZlcnkgYnJvYWQgdG9waWNzIChlLmcuLCBMYXcpLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChmb3IgZXhhbXBsZSwgR2xvYmFsIFdhcm1pbmcsIEFib3J0aW9uLCBvciBTY2llbnRvbG9neSkuIFlvdSBtYXkgYmUgbW9yZSBzdWNjZXNzZnVsIHN0YXJ0aW5nIGEgc3ViLWFydGljbGUgb24gdGhlIHRvcGljIGluc3RlYWQuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+RG9uJ3Qgd29yayBvbiBhbiBhcnRpY2xlIHRoYXQgaXMgYWxyZWFkeSBvZiBoaWdoIHF1YWxpdHkgb24gV2lraXBlZGlhLCB1bmxlc3MgeW91IGRpc2N1c3MgYSBzcGVjaWZpYyBwbGFuIGZvciBpbXByb3ZpbmcgaXQgd2l0aCBvdGhlciBlZGl0b3JzIGJlZm9yZWhhbmQuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+QXZvaWQgd29ya2luZyBvbiBzb21ldGhpbmcgd2l0aCBzY2FyY2UgbGl0ZXJhdHVyZS4gV2lraXBlZGlhIGFydGljbGVzIGNpdGUgc2Vjb25kYXJ5IGxpdGVyYXR1cmUgc291cmNlcywgc28gaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSBlbm91Z2ggc291cmNlcyBmb3IgdmVyaWZpY2F0aW9uIGFuZCB0byBwcm92aWRlIGEgbmV1dHJhbCBwb2ludCBvZiB2aWV3LjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkRvbid0IHN0YXJ0IGFydGljbGVzIHdpdGggdGl0bGVzIHRoYXQgaW1wbHkgYW4gYXJndW1lbnQgb3IgZXNzYXktbGlrZSBhcHByb2FjaCAoZS5nLiwgVGhlIEVmZmVjdHMgVGhhdCBUaGUgUmVjZW50IFN1Yi1QcmltZSBNb3J0Z2FnZSBDcmlzaXMgaGFzIGhhZCBvbiB0aGUgVVMgYW5kIEdsb2JhbCBFY29ub21pY3MpLiBUaGVzZSB0eXBlIG9mIHRpdGxlcywgYW5kIG1vc3QgbGlrZWx5IHRoZSBjb250ZW50IHRvbywgbWF5IG5vdCBiZSBhcHByb3ByaWF0ZSBmb3IgYW4gZW5jeWNsb3BlZGlhLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5BcyB0aGUgaW5zdHJ1Y3RvciwgeW91IHNob3VsZCBhcHBseSB5b3VyIG93biBleHBlcnRpc2UgdG8gZXhhbWluaW5nIFdpa2lwZWRpYeKAmXMgY292ZXJhZ2Ugb2YgeW91ciBmaWVsZC4gWW91IHVuZGVyc3RhbmQgdGhlIGJyb2FkZXIgaW50ZWxsZWN0dWFsIGNvbnRleHQgd2hlcmUgaW5kaXZpZHVhbCB0b3BpY3MgZml0IGluLCB5b3UgY2FuIHJlY29nbml6ZSB3aGVyZSBXaWtpcGVkaWEgZmFsbHMgc2hvcnQsIHlvdSBrbm934oCUb3Iga25vdyBob3cgdG8gZmluZOKAlHRoZSByZWxldmFudCBsaXRlcmF0dXJlLCBhbmQgeW91IGtub3cgd2hhdCB0b3BpY3MgeW91ciBzdHVkZW50cyBzaG91bGQgYmUgYWJsZSB0byBoYW5kbGUuIFlvdXIgZ3VpZGFuY2Ugb24gYXJ0aWNsZSBjaG9pY2UgYW5kIHNvdXJjaW5nIGlzIGNyaXRpY2FsIGZvciBib3RoIHlvdXIgc3R1ZGVudHPigJkgc3VjY2VzcyBhbmQgdGhlIGltcHJvdmVtZW50IG9mIFdpa2lwZWRpYS48L3A+J1xuICAgICAgICAgICAgICAnPHA+VGhlcmUgYXJlIHR3byByZWNvbW1lbmRlZCBvcHRpb25zIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXM6PC9wPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPllvdSAodGhlIGluc3RydWN0b3IpIHByZXBhcmUgYSBsaXN0IG9mIGFwcHJvcHJpYXRlIFxcJ25vbi1leGlzdGVudFxcJywgXFwnc3R1YlxcJyBvciBcXCdzdGFydFxcJyBhcnRpY2xlcyBhaGVhZCBvZiB0aW1lIGZvciB0aGUgc3R1ZGVudHMgdG8gY2hvb3NlIGZyb20uIElmIHBvc3NpYmxlLCB5b3UgbWF5IHdhbnQgdG8gd29yayB3aXRoIGFuIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW4gdG8gY3JlYXRlIHRoZSBsaXN0LiBFYWNoIHN0dWRlbnQgY2hvb3NlcyBhbiBhcnRpY2xlIGZyb20gdGhlIGxpc3QgdG8gd29yayBvbi4gQWx0aG91Z2ggdGhpcyByZXF1aXJlcyBtb3JlIHByZXBhcmF0aW9uLCBpdCBtYXkgaGVscCBzdHVkZW50cyB0byBzdGFydCByZXNlYXJjaGluZyBhbmQgd3JpdGluZyB0aGVpciBhcnRpY2xlcyBzb29uZXIuPC9wPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdTdHVkZW50cyBmaW5kIGFydGljbGVzJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+RWFjaCBzdHVkZW50IGV4cGxvcmVzIFdpa2lwZWRpYSBhbmQgbGlzdHMgM+KAkzUgdG9waWNzIG9uIHRoZWlyIFdpa2lwZWRpYSB1c2VyIHBhZ2UgdGhhdCB0aGV5IGFyZSBpbnRlcmVzdGVkIGluIGZvciB0aGVpciBtYWluIHByb2plY3QuIFlvdSAodGhlIGluc3RydWN0b3IpIHNob3VsZCBhcHByb3ZlIGFydGljbGUgY2hvaWNlcyBiZWZvcmUgc3R1ZGVudHMgcHJvY2VlZCB0byB3cml0aW5nLiBIYXZpbmcgc3R1ZGVudHMgZmluZCB0aGVpciBvd24gYXJ0aWNsZXMgcHJvdmlkZXMgdGhlbSB3aXRoIGEgc2Vuc2Ugb2YgbW90aXZhdGlvbiBhbmQgb3duZXJzaGlwIG92ZXIgdGhlIGFzc2lnbm1lbnQgYW5kIGV4ZXJjaXNlcyB0aGVpciBjcml0aWNhbCB0aGlua2luZyBza2lsbHMgYXMgdGhleSBpZGVudGlmeSBjb250ZW50IGdhcHMsIGJ1dCBpdCBtYXkgYWxzbyBsZWFkIHRvIGNob2ljZXMgdGhhdCBhcmUgZnVydGhlciBhZmllbGQgZnJvbSBjb3Vyc2UgbWF0ZXJpYWwuPC9wPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9IFxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcInJlc2VhcmNoX3BsYW5uaW5nXCJcbiAgICAgICAgdGl0bGU6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGZvcm1UaXRsZTogJ0hvdyBzaG91bGQgc3R1ZGVudHMgcGxhbiB0aGVpciBhcnRpY2xlcz8nXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IHJlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5TdHVkZW50cyBvZnRlbiB3YWl0IHVudGlsIHRoZSBsYXN0IG1pbnV0ZSB0byBkbyB0aGVpciByZXNlYXJjaCwgb3IgY2hvb3NlIHNvdXJjZXMgdW5zdWl0YWJsZSBmb3IgV2lraXBlZGlhLiBUaGF0J3Mgd2h5IHdlIHJlY29tbWVuZCBhc2tpbmcgc3R1ZGVudHMgdG8gcHV0IHRvZ2V0aGVyIGEgYmlibGlvZ3JhcGh5IG9mIG1hdGVyaWFscyB0aGV5IHdhbnQgdG8gdXNlIGluIGVkaXRpbmcgdGhlIGFydGljbGUsIHdoaWNoIGNhbiB0aGVuIGJlIGFzc2Vzc2VkIGJ5IHlvdSBhbmQgb3RoZXIgV2lraXBlZGlhbnMuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+VGhlbiwgc3R1ZGVudHMgc2hvdWxkIHByb3Bvc2Ugb3V0bGluZXMgZm9yIHRoZWlyIGFydGljbGVzLiBUaGlzIGNhbiBiZSBhIHRyYWRpdGlvbmFsIG91dGxpbmUsIGluIHdoaWNoIHN0dWRlbnRzIGlkZW50aWZ5IHdoaWNoIHNlY3Rpb25zIHRoZWlyIGFydGljbGVzIHdpbGwgaGF2ZSBhbmQgd2hpY2ggYXNwZWN0cyBvZiB0aGUgdG9waWMgd2lsbCBiZSBjb3ZlcmVkIGluIGVhY2ggc2VjdGlvbi4gQWx0ZXJuYXRpdmVseSwgc3R1ZGVudHMgY2FuIGRldmVsb3AgZWFjaCBvdXRsaW5lIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbiDigJQgdGhlIHVudGl0bGVkIHNlY3Rpb24gYXQgdGhlIGJlZ2lubmluZyBvZiBhbiBhcnRpY2xlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHByb3ZpZGUgYSBjb25jaXNlIHN1bW1hcnkgb2YgaXRzIGNvbnRlbnQuIFdvdWxkIHlvdSBsaWtlIHlvdXIgc3R1ZGVudHMgdG8gY3JlYXRlIHRyYWRpdGlvbmFsIG91dGxpbmVzLCBvciBjb21wb3NlIG91dGxpbmVzIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhLXN0eWxlIGxlYWQgc2VjdGlvbj88L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJkcmFmdHNfbWFpbnNwYWNlXCJcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgdGl0bGU6ICdEcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGRyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgICBpbnN0cnVjdGlvbnM6ICdPbmNlIHN0dWRlbnRzIGhhdmUgZ290dGVuIGEgZ3JpcCBvbiB0aGVpciB0b3BpY3MgYW5kIHRoZSBzb3VyY2VzIHRoZXkgd2lsbCB1c2UgdG8gd3JpdGUgYWJvdXQgdGhlbSwgaXTigJlzIHRpbWUgdG8gc3RhcnQgd3JpdGluZyBvbiBXaWtpcGVkaWEuIFlvdSBjYW4gYXNrIHRoZW0gdG8ganVtcCByaWdodCBpbiBhbmQgZWRpdCBsaXZlLCBvciBzdGFydCB0aGVtIG9mZiBpbiB0aGVpciBvd24gc2FuZGJveCBwYWdlcy4gVGhlcmUgYXJlIHByb3MgYW5kIGNvbnMgb2YgZWFjaCBhcHByb2FjaC4nXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdQcm9zIGFuZCBjb25zIG9mIHNhbmRib3hlcydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5TYW5kYm94ZXMg4oCUIHBhZ2VzIGFzc29jaWF0ZWQgd2l0aCBhbiBpbmRpdmlkdWFsIGVkaXRvciB0aGF0IGFyZSBub3QgY29uc2lkZXJlZCBwYXJ0IG9mIFdpa2lwZWRpYSBwcm9wZXIg4oCUIG1ha2Ugc3R1ZGVudHMgZmVlbCBzYWZlLiBUaGV5IGNhbiBlZGl0IHdpdGhvdXQgdGhlIHByZXNzdXJlIG9mIHRoZSB3aG9sZSB3b3JsZCByZWFkaW5nIHRoZWlyIGRyYWZ0cyBvciBvdGhlciBXaWtpcGVkaWFucyBhbHRlcmluZyB0aGVpciB3cml0aW5nLiBIb3dldmVyLCBzYW5kYm94IGVkaXRpbmcgbGltaXRzIG1hbnkgb2YgdGhlIHVuaXF1ZSBhc3BlY3RzIG9mIFdpa2lwZWRpYSBhcyBhIHRlYWNoaW5nIHRvb2wsIHN1Y2ggYXMgY29sbGFib3JhdGl2ZSB3cml0aW5nIGFuZCBpbmNyZW1lbnRhbCBkcmFmdGluZy4gU3BlbmRpbmcgbW9yZSB0aGFuIGEgd2VlayBvciB0d28gaW4gc2FuZGJveGVzIGlzIHN0cm9uZ2x5IGRpc2NvdXJhZ2VkLjwvcD5cIiBcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdQcm9zIGFuZCBjb25zIG9mIGVkaXRpbmcgbGl2ZSdcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5FZGl0aW5nIGxpdmUgaXMgZXhjaXRpbmcgZm9yIHRoZSBzdHVkZW50cyBiZWNhdXNlIHRoZXkgY2FuIHNlZSB0aGVpciBjaGFuZ2VzIHRvIHRoZSBhcnRpY2xlcyBpbW1lZGlhdGVseSBhbmQgZXhwZXJpZW5jZSB0aGUgY29sbGFib3JhdGl2ZSBlZGl0aW5nIHByb2Nlc3MgdGhyb3VnaG91dCB0aGUgYXNzaWdubWVudC4gSG93ZXZlciwgYmVjYXVzZSBuZXcgZWRpdG9ycyBvZnRlbiB1bmludGVudGlvbmFsbHkgYnJlYWsgV2lraXBlZGlhIHJ1bGVzLCBzb21ldGltZXMgc3R1ZGVudHPigJkgYWRkaXRpb25zIGFyZSBxdWVzdGlvbmVkIG9yIHJlbW92ZWQuPC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogJ1wiPHA+V2lsbCB5b3UgaGF2ZSB5b3VyIHN0dWRlbnRzIGRyYWZ0IHRoZWlyIGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzLCBvciB3b3JrIGxpdmUgZnJvbSB0aGUgYmVnaW5uaW5nPzwvcD5cIidcbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJwZWVyX2ZlZWRiYWNrXCJcbiAgICAgICAgdGl0bGU6ICdQZWVyIGZlZWRiYWNrJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBwZWVyIGZlZWRiYWNrJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiSG93IG1hbnkgcGVlciByZXZpZXdzIHNob3VsZCBlYWNoIHN0dWRlbnQgY29uZHVjdD9cIlxuICAgICAgICBpbnN0cnVjdGlvbnM6IFwiQ29sbGFib3JhdGlvbiBpcyBhIGNyaXRpY2FsIGVsZW1lbnQgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYS5cIlxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPkZvciBzb21lIHN0dWRlbnRzLCB0aGlzIHdpbGwgaGFwcGVuIHNwb250YW5lb3VzbHk7IHRoZWlyIGNob2ljZSBvZiB0b3BpY3Mgd2lsbCBhdHRyYWN0IGludGVyZXN0ZWQgV2lraXBlZGlhbnMgd2hvIHdpbGwgcGl0Y2ggaW4gd2l0aCBpZGVhcywgY29weWVkaXRzLCBvciBldmVuIHN1YnN0YW50aWFsIGNvbnRyaWJ1dGlvbnMgdG8gdGhlIHN0dWRlbnRz4oCZIGFydGljbGVzLiBJbiBtYW55IGNhc2VzLCBob3dldmVyLCB0aGVyZSB3aWxsIGJlIGxpdHRsZSBzcG9udGFuZW91cyBlZGl0aW5nIG9mIHN0dWRlbnRz4oCZIGFydGljbGVzIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSB0ZXJtLiBGb3J0dW5hdGVseSwgeW91IGhhdmUgYSBjbGFzc3Jvb20gZnVsbCBvZiBwZWVyIHJldmlld2Vycy4gWW91IGNhbiBtYWtlIHRoZSBtb3N0IG9mIHRoaXMgYnkgYXNzaWduaW5nIHN0dWRlbnRzIHRvIHJldmlldyBlYWNoIG90aGVyc+KAmSBhcnRpY2xlcyBzb29uIGFmdGVyIGZ1bGwtbGVuZ3RoIGRyYWZ0cyBhcmUgcG9zdGVkLiBUaGlzIGdpdmVzIHN0dWRlbnRzIHBsZW50eSBvZiB0aW1lIHRvIGFjdCBvbiB0aGUgYWR2aWNlIG9mIHRoZWlyIHBlZXJzLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlBlZXIgcmV2aWV3cyBhcmUgYW5vdGhlciBjaGFuY2UgZm9yIHN0dWRlbnRzIHRvIHByYWN0aWNlIGNyaXRpY2FsIHRoaW5raW5nLiBVc2VmdWwgcmV2aWV3cyBmb2N1cyBvbiBzcGVjaWZpYyBpc3N1ZXMgdGhhdCBjYW4gYmUgaW1wcm92ZWQuIFNpbmNlIHN0dWRlbnRzIGFyZSB1c3VhbGx5IGhlc2l0YW50IHRvIGNyaXRpY2l6ZSB0aGVpciBjbGFzc21hdGVz4oCUYW5kIG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIG1heSBnZXQgYW5ub3llZCB3aXRoIGEgc3RyZWFtIG9mIHByYWlzZSBmcm9tIHN0dWRlbnRzIHRoYXQgZ2xvc3NlcyBvdmVyIGFuIGFydGljbGUncyBzaG9ydGNvbWluZ3PigJRpdCdzIGltcG9ydGFudCB0byBnaXZlcyBleGFtcGxlcyBvZiB0aGUga2luZHMgb2YgY29uc3RydWN0aXZlbHkgY3JpdGljYWwgZmVlZGJhY2sgdGhhdCBhcmUgdGhlIG1vc3QgaGVscGZ1bC48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5Ib3cgbWFueSBwZWVyIHJldmlld3Mgd2lsbCB5b3UgYXNrIGVhY2ggc3R1ZGVudCB0byBjb250cmlidXRlIGR1cmluZyB0aGUgY291cnNlPzwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcInN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHNcIlxuICAgICAgICB0aXRsZTogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGZvcm1UaXRsZTogJ0Nob29zZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzIChvcHRpb25hbCk6J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgICBpbnN0cnVjdGlvbnM6IFwiQnkgdGhlIHRpbWUgc3R1ZGVudHMgaGF2ZSBtYWRlIGltcHJvdmVtZW50cyBiYXNlZCBvbiBjbGFzc21hdGVzJyBjb21tZW50c+KAlGFuZCBpZGVhbGx5IHN1Z2dlc3Rpb25zIGZyb20geW91IGFzIHdlbGzigJR0aGV5IHNob3VsZCBoYXZlIHByb2R1Y2VkIG5lYXJseSBjb21wbGV0ZSBhcnRpY2xlcy4gTm93IGlzIHRoZSBjaGFuY2UgdG8gZW5jb3VyYWdlIHRoZW0gdG8gd2FkZSBhIGxpdHRsZSBkZWVwZXIgaW50byBXaWtpcGVkaWEgYW5kIGl0cyBub3JtcyBhbmQgY3JpdGVyaWEgdG8gY3JlYXRlIGdyZWF0IGNvbnRlbnQuXCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICBcIjxwPllvdeKAmWxsIHByb2JhYmx5IGhhdmUgZGlzY3Vzc2VkIG1hbnkgb2YgdGhlIGNvcmUgcHJpbmNpcGxlcyBvZiBXaWtpcGVkaWHigJRhbmQgcmVsYXRlZCBpc3N1ZXMgeW91IHdhbnQgdG8gZm9jdXMgb27igJRidXQgbm93IHRoYXQgdGhleeKAmXZlIGV4cGVyaWVuY2VkIGZpcnN0LWhhbmQgaG93IFdpa2lwZWRpYSB3b3JrcywgdGhpcyBpcyBhIGdvb2QgdGltZSB0byByZXR1cm4gdG8gdG9waWNzIGxpa2UgbmV1dHJhbGl0eSwgbWVkaWEgZmx1ZW5jeSwgYW5kIHRoZSBpbXBhY3RzIGFuZCBsaW1pdHMgb2YgV2lraXBlZGlhLiBDb25zaWRlciBicmluZ2luZyBpbiBhIGd1ZXN0IHNwZWFrZXIsIGhhdmluZyBhIHBhbmVsIGRpc2N1c3Npb24sIG9yIHNpbXBseSBoYXZpbmcgYW4gb3BlbiBkaXNjdXNzaW9uIGluIGNsYXNzIGFib3V0IHdoYXQgdGhlIHN0dWRlbnRzIGhhdmUgZG9uZSBzbyBmYXIgYW5kIHdoeSAob3Igd2hldGhlcikgaXQgbWF0dGVycy48L3A+XCJcbiAgICAgICAgICAgICBcIjxwPkluIGFkZGl0aW9uIHRvIHRoZSBXaWtpcGVkaWEgYXJ0aWNsZSB3cml0aW5nIGl0c2VsZiwgeW91IG1heSB3YW50IHRvIHVzZSBhIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudC4gVGhlc2UgYXNzaWdubWVudHMgY2FuIHJlaW5mb3JjZSBhbmQgZGVlcGVuIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBhbHNvIGhlbHAgeW91IHRvIHVuZGVyc3RhbmQgYW5kIGV2YWx1YXRlIHRoZSBzdHVkZW50cycgd29yayBhbmQgbGVhcm5pbmcgb3V0Y29tZXMuIE9uIHRoZSBsZWZ0IGFyZSBzb21lIG9mIHRoZSBlZmZlY3RpdmUgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyB0aGF0IGluc3RydWN0b3JzIG9mdGVuIHVzZS4gU2Nyb2xsIG92ZXIgZWFjaCBmb3IgbW9yZSBpbmZvcm1hdGlvbiwgYW5kIHNlbGVjdCBhbnkgdGhhdCB5b3Ugd2lzaCB0byB1c2UgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcImR5a1wiXG4gICAgICAgIHRpdGxlOiAnRFlLIHByb2Nlc3MnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCB0aGUgPGVtPkRpZCBZb3UgS25vdzwvZW0+IHByb2Nlc3MnXG4gICAgICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5EaWQgWW91IEtub3cgKERZSykgaXMgYSBzZWN0aW9uIG9uIFdpa2lwZWRpYeKAmXMgbWFpbiBwYWdlIGhpZ2hsaWdodGluZyBuZXcgY29udGVudCB0aGF0IGhhcyBiZWVuIGFkZGVkIHRvIFdpa2lwZWRpYSBpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBEWUsgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIDYgaG91cnMgaW4gdGhlIHNwb3RsaWdodC48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXggb3IgbW9yZSkgd2l0aGluIHRoZSBsYXN0IHNldmVuIGRheXMuIFN0dWRlbnRzIHdobyBtZWV0IHRoaXMgY3JpdGVyaWEgbWF5IHdhbnQgdG8gbm9taW5hdGUgdGhlaXIgY29udHJpYnV0aW9ucyBmb3IgRFlLLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZSBzaG9ydCB3aW5kb3cgb2YgZWxpZ2liaWxpdHksIGFuZCB0aGUgc3RyaWN0IHJ1bGVzIG9mIHRoZSBub21pbmF0aW9uIHByb2Nlc3MsIGNhbiBtYWtlIGl0IGNoYWxsZW5naW5nIHRvIGluY29ycG9yYXRlIERZSyBpbnRvIGEgY2xhc3Nyb29tIHByb2plY3QuIFRoZSBEWUsgcHJvY2VzcyBzaG91bGQgbm90IGJlIGEgcmVxdWlyZWQgcGFydCBvZiB5b3VyIGFzc2lnbm1lbnQsIGFzIHRoZSBEWUsgbm9taW5hdGlvbiBwcm9jZXNzIGNhbiBiZSBkaWZmaWN1bHQgZm9yIG5ld2NvbWVycyB0byBuYXZpZ2F0ZS4gSG93ZXZlciwgaXQgbWFrZXMgYSBncmVhdCBzdHJldGNoIGdvYWwgd2hlbiB1c2VkIHNlbGVjdGl2ZWx5LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgRFlLIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj8gSWYgc28sIHRoZSBXaWtpIEVkIHRlYW0gY2FuIGhlbHAgeW91IGFuZCB5b3VyIHN0dWRlbnRzIGR1cmluZyB0aGUgdGVybSB0byBpZGVudGlmeSB3b3JrIHRoYXQgbWF5IGJlIGEgZ29vZCBjYW5kaWRhdGUgZm9yIERZSyBhbmQgYW5zd2VyIHF1ZXN0aW9ucyB5b3UgbWF5IGhhdmUgYWJvdXQgdGhlIG5vbWluYXRpb24gcHJvY2Vzcy48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJnYVwiXG4gICAgICAgIHRpdGxlOiAnR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCB0aGUgPGVtPkdvb2QgQXJ0aWNsZTwvZW0+IHByb2Nlc3MnXG4gICAgICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+V2VsbC1kZXZlbG9wZWQgYXJ0aWNsZXMgdGhhdCBoYXZlIHBhc3NlZCBhIEdvb2QgQXJ0aWNsZSAoR0EpIHJldmlldyBhcmUgYSBzdWJzdGFudGlhbCBhY2hpZXZlbWVudCBpbiB0aGVpciBvd24gcmlnaHQsIGFuZCBjYW4gYWxzbyBxdWFsaWZ5IGZvciBEWUsuIFRoaXMgcGVlciByZXZpZXcgcHJvY2VzcyBpbnZvbHZlcyBjaGVja2luZyBhIHBvbGlzaGVkIGFydGljbGUgYWdhaW5zdCBXaWtpcGVkaWEncyBHQSBjcml0ZXJpYTogYXJ0aWNsZXMgbXVzdCBiZSB3ZWxsLXdyaXR0ZW4sIHZlcmlmaWFibGUgYW5kIHdlbGwtc291cmNlZCB3aXRoIG5vIG9yaWdpbmFsIHJlc2VhcmNoLCBicm9hZCBpbiBjb3ZlcmFnZSwgbmV1dHJhbCwgc3RhYmxlLCBhbmQgYXBwcm9wcmlhdGVseSBpbGx1c3RyYXRlZCAod2hlbiBwb3NzaWJsZSkuIFByYWN0aWNhbGx5IHNwZWFraW5nLCBhIHBvdGVudGlhbCBHb29kIEFydGljbGUgc2hvdWxkIGxvb2sgYW5kIHNvdW5kIGxpa2Ugb3RoZXIgd2VsbC1kZXZlbG9wZWQgV2lraXBlZGlhIGFydGljbGVzLCBhbmQgaXQgc2hvdWxkIHByb3ZpZGUgYSBzb2xpZCwgd2VsbC1iYWxhbmNlZCB0cmVhdG1lbnQgb2YgaXRzIHN1YmplY3QuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+VGhlIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyBwcm9jZXNzIGdlbmVyYWxseSB0YWtlcyBzb21lIHRpbWUg4oCUIGJldHdlZW4gc2V2ZXJhbCBkYXlzIGFuZCBzZXZlcmFsIHdlZWtzLCBkZXBlbmRpbmcgb24gdGhlIGludGVyZXN0IG9mIHJldmlld2VycyBhbmQgdGhlIHNpemUgb2YgdGhlIHJldmlldyBiYWNrbG9nIGluIHRoZSBzdWJqZWN0IGFyZWEg4oCUIGFuZCBzaG91bGQgb25seSBiZSB1bmRlcnRha2VuIGZvciBhcnRpY2xlcyB0aGF0IGFyZSBhbHJlYWR5IHZlcnkgd2VsbC1kZXZlbG9wZWQuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLCBhbmQgdGhvc2Ugd3JpdHRlbiBieSBzdHVkZW50IGVkaXRvcnMgd2hvIGFyZSBhbHJlYWR5IGV4cGVyaWVuY2VkLCBzdHJvbmcgd3JpdGVycyBhbmQgd2hvIGFyZSB3aWxsaW5nIHRvIGNvbWUgYmFjayB0byBhZGRyZXNzIHJldmlld2VyIGZlZWRiYWNrIChldmVuIGFmdGVyIHRoZSB0ZXJtIGVuZHMpPC9lbT4uPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+V291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGlzIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj8gSWYgc28sIHRoZSBXaWtpIEVkIHRlYW0gY2FuIHByb3ZpZGUgYWR2aWNlIGFuZCBzdXBwb3J0IHRvIGhpZ2gtYWNoaWV2aW5nIHN0dWRlbnRzIHdobyBhcmUgaW50ZXJlc3RlZCBpbiB0aGUgR29vZCBBcnRpY2xlIHByb2Nlc3MuPC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImdyYWRpbmdcIlxuICAgICAgIyAgIHRpdGxlOiAnR3JhZGluZydcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICAgIFxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgdGhlIGNvdXJzZVwiXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIlwiXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAjICAgICAgICAgXCI8dWw+XG4gICAgICAjICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAjICAgICAgICAgPC91bD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAgICAgXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInIHN0eWxlPSdtYXJnaW4tYm90dG9tOjA7Jz48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J2Zvcm0tY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgIDxmb3JtIGlkPSdjb3Vyc2VMZW5ndGgnIG9uaW5wdXQ9J291dC52YWx1ZSA9IHBhcnNlSW50KGNvdXJzZUxlbmd0aC52YWx1ZSk7IG91dDIudmFsdWUgPSBwYXJzZUludChjb3Vyc2VMZW5ndGgudmFsdWUpOycgb25zdWJtaXQ9J3JldHVybiBmYWxzZSc+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGVybVN0YXJ0RGF0ZSc+VGVybSBiZWdpbnM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0ndGVybVN0YXJ0RGF0ZScgbmFtZT0ndGVybVN0YXJ0RGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInIHN0eWxlPSdkaXNwbGF5OiBub25lOyc+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGVybUVuZERhdGUnPlRlcm0gZW5kczwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSd0ZXJtRW5kRGF0ZScgbmFtZT0ndGVybUVuZERhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPCEtLSAlZGl2Lm92ZXJ2aWV3LWlucHV0LWNvbnRhaW5lciAtLT5cbiAgICAgICMgICAgICAgICAgICAgPCEtLSAlbGFiZWx7OmZvciA9PiAnZW5kRGF0ZSd9IEVuZCBXZWVrIG9mIC0tPlxuICAgICAgIyAgICAgICAgICAgICA8IS0tICVpbnB1dHs6dHlwZSA9PiAnZGF0ZScsIDppZCA9PiAnZW5kRGF0ZScsIDpuYW1lID0+ICdlbmREYXRlJ30gLS0+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlU3RhcnREYXRlJz5Db3Vyc2Ugc3RhcnRzIG9uPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J2NvdXJzZVN0YXJ0RGF0ZScgbmFtZT0nY291cnNlU3RhcnREYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcicgc3R5bGU9J2Rpc3BsYXk6IG5vbmU7Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdzdGFydFdlZWtPZkRhdGUnPlN0YXJ0IHdlZWsgb2Y8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0nc3RhcnRXZWVrT2ZEYXRlJyBuYW1lPSdzdGFydFdlZWtPZkRhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT0nZGlzcGxheTogbm9uZTsnPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J2VuZFdlZWtPZkRhdGUnPkVuZCB3ZWVrIG9mPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J2VuZFdlZWtPZkRhdGUnIG5hbWU9J2VuZFdlZWtPZkRhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VMZW5ndGgnPkNvdXJzZSBMZW5ndGg8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBkZWZhdWx0VmFsdWU9JzE2JyBpZD0nY0xlbmd0aCcgbWF4PScxNicgbWluPSc2JyBuYW1lPSdjb3Vyc2VMZW5ndGgnIHN0ZXA9JzEnIHR5cGU9J3JhbmdlJyB2YWx1ZT0nMTYnPlxuICAgICAgIyAgICAgICAgICAgICAgIDxvdXRwdXQgbmFtZT0nb3V0Mic+MTY8L291dHB1dD5cbiAgICAgICMgICAgICAgICAgICAgICA8c3Bhbj53ZWVrczwvc3Bhbj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J21vbmRheScgbmFtZT0nTW9uZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzAnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nbW9uZGF5Jz5Nb25kYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd0dWVzZGF5JyBuYW1lPSdUdWVzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzEnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0ndHVlc2RheSc+VHVlc2RheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3dlZG5lc2RheScgbmFtZT0nV2VkbmVzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nd2VkbmVzZGF5Jz5XZWRuZXNkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd0aHVyc2RheScgbmFtZT0nVGh1cnNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMyc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSd0aHVyc2RheSc+VGh1cnNkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdmcmlkYXknIG5hbWU9J0ZyaWRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSc0Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J2ZyaWRheSc+RnJpZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nc2F0dXJkYXknIG5hbWU9J1NhdHVyZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzUnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc2F0dXJkYXknPlNhdHVyZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nc3VuZGF5JyBuYW1lPSdTdW5kYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdzdW5kYXknPlN1bmRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctcmVhZG91dC1oZWFkZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J3JlYWRvdXQnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPG91dHB1dCBmb3I9J2NvdXJzZUxlbmd0aCcgaWQ9J2NvdXJzZUxlbmd0aFJlYWRvdXQnIG5hbWU9J291dCc+MTY8L291dHB1dD5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxzcGFuPndlZWtzPC9zcGFuPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgIDwvZm9ybT5cbiAgICAgICMgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICA8ZGl2PlxuICAgICAgIyAgICAgICAgICAgPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXInPjwvZGl2PlxuICAgICAgIyAgICAgICAgIDwvZGl2PlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnJ1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICBdXG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBtdWx0aW1lZGlhOiBbXG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJtdWx0aW1lZGlhXzFcIlxuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAjICAgdGl0bGU6ICdNdWx0aW1lZGlhIHN0ZXAgMSdcbiAgICAgICMgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICMgICBpbmZvVGl0bGU6ICdJbnN0cnVjdGlvbiBUaXRsZSdcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6IFwiU3RlcCBJbnN0cnVjdGlvbnNcIlxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgIF1cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwibXVsdGltZWRpYV8yXCJcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIHRpdGxlOiAnTXVsdGltZWRpYSBzdGVwIDInXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImdyYWRpbmdfbXVsdGltZWRpYVwiXG4gICAgICAjICAgdHlwZTogXCJncmFkaW5nXCJcbiAgICAgICMgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgICBcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICAjICAgdHlwZTogXCJvdmVydmlld1wiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgIyAgICAgICAgIFwiPHVsPlxuICAgICAgIyAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgIyAgICAgICAgIDwvdWw+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgICAgIFxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cCBjbGFzcz0nZGVzY3JpcHRpb24tY29udGFpbmVyJz48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8ZGl2IGNsYXNzPSdzdGVwLWZvcm0tZGF0ZXMnPjwvZGl2PlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICcnXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPjxhIGlkPSdwdWJsaXNoJyBocmVmPScjJyBjbGFzcz0nYnV0dG9uJyBzdHlsZT0nZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Jz5QdWJsaXNoPC9hPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgIF1cbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgIGNvcHllZGl0OiBbXG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJjb3B5ZWRpdF8xXCJcbiAgICAgICMgICB0aXRsZTogJ0NvcHkgRWRpdCBzdGVwIDEnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICMgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICMgICBpbmZvVGl0bGU6ICdJbnN0cnVjdGlvbiBUaXRsZSdcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6IFwiU3RlcCBJbnN0cnVjdGlvbnNcIlxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgIF1cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiY29weWVkaXRfMlwiXG4gICAgICAjICAgdGl0bGU6ICdDb3B5IEVkaXQgc3RlcCAyJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImdyYWRpbmdfY29weWVkaXRcIlxuICAgICAgIyAgIHR5cGU6IFwiZ3JhZGluZ1wiXG4gICAgICAjICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgICAgIyAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgICAgXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJvdmVydmlld1wiXG4gICAgICAjICAgdHlwZTogXCJvdmVydmlld1wiXG4gICAgICAjICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiXCJcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICMgICAgICAgICBcIjx1bD5cbiAgICAgICMgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICMgICAgICAgICA8L3VsPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICAgICBcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHAgY2xhc3M9J2Rlc2NyaXB0aW9uLWNvbnRhaW5lcic+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnJ1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICBdXG4gIH1cbiAgb3V0cm9fc3RlcHM6IFtcbiAgICB7XG4gICAgICBpZDogXCJncmFkaW5nXCJcbiAgICAgIHRpdGxlOiAnR3JhZGluZydcbiAgICAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgICBpbnB1dHM6IFtdXG4gICAgfVxuICAgIHtcbiAgICAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgICAgZm9ybVRpdGxlOiBcIlwiXG4gICAgICBzZWN0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2Rlc2NyaXB0aW9uLWNvbnRhaW5lcicgc3R5bGU9J21hcmdpbi1ib3R0b206MDsnPjwvcD5cIlxuICAgICAgICAgICAgXCI8ZGl2PlxuICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdwcmV2aWV3LWNvbnRhaW5lcic+PC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICAjIHtcbiAgICAgICAgIyAgIGNvbnRlbnQ6IFtcbiAgICAgICAgIyAgICAgXCI8ZGl2IGNsYXNzPSdzdGVwLWZvcm0tZGF0ZXMnPjwvZGl2PlwiXG4gICAgICAgICMgICBdXG4gICAgICAgICMgfVxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICAgIGlucHV0czogW11cbiAgICB9XG4gIF1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRDb25maWdcblxuIiwiV2l6YXJkQ29udGVudCA9IFtcbiAge1xuICAgIGlkOiBcImludHJvXCJcbiAgICB0aXRsZTogJzxjZW50ZXI+V2VsY29tZSB0byB0aGU8YnIgLz5Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQhPC9jZW50ZXI+J1xuICAgIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICAgIGluc3RydWN0aW9uczogJydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCBoZWxwIHlvdSB0byBlYXNpbHkgY3JlYXRlIGEgY3VzdG9taXplZCBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnQgYW5kIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UnbGwgaGF2ZSBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiwgd2l0aCB3ZWVrbHkgYXNzaWdubWVudHMsIHB1Ymxpc2hlZCBkaXJlY3RseSBvbnRvIGEgc2FuZGJveCBwYWdlIG9uIFdpa2lwZWRpYSB3aGVyZSB5b3UgY2FuIGN1c3RvbWVpemUgaXQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPkxldOKAmXMgc3RhcnQgYnkgZmlsbGluZyBpbiBzb21lIGJhc2ljcyBhYm91dCB5b3UgYW5kIHlvdXIgY291cnNlOjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJhc3NpZ25tZW50X3NlbGVjdGlvblwiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGFzc2lnbm1lbnQgc2VsZWN0aW9ucydcbiAgICBmb3JtVGl0bGU6ICdBdmFpbGFibGUgYXNzaWdubWVudHM6J1xuICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGlzIHN1aXRhYmxlIGZvciBXaWtpcGVkaWEgPGVtPmFuZDwvZW0+IGFjaGlldmVzIHlvdXIgc3R1ZGVudCBsZWFybmluZyBvYmplY3RpdmVzLiBZb3VyIGZpcnN0IHN0ZXAgaXMgdG8gY2hvb3NlIHdoaWNoIGFzc2lnbm1lbnQocykgeW91J2xsIGJlIGFza2luZyB5b3VyIHN0dWRlbnRzIHRvIGNvbXBsZXRlIGFzIHBhcnQgb2YgdGhlIGNvdXJzZS5cIlxuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2UndmUgY3JlYXRlZCBzb21lIGd1aWRlbGluZXMgdG8gaGVscCB5b3UsIGJ1dCB5b3UnbGwgbmVlZCB0byBtYWtlIHNvbWUga2V5IGRlY2lzaW9ucywgc3VjaCBhczogd2hpY2ggbGVhcm5pbmcgb2JqZWN0aXZlcyBhcmUgeW91IHRhcmdldGluZyB3aXRoIHRoaXMgYXNzaWdubWVudD8gV2hhdCBza2lsbHMgZG8geW91ciBzdHVkZW50cyBhbHJlYWR5IGhhdmU/IEhvdyBtdWNoIHRpbWUgY2FuIHlvdSBkZXZvdGUgdG8gdGhlIGFzc2lnbm1lbnQ/PC9wPlwiXG4gICAgICAgICAgXCI8cD5Nb3N0IGluc3RydWN0b3JzIGFzayB0aGVpciBzdHVkZW50cyB0byB3cml0ZSBvciBleHBhbmQgYW4gYXJ0aWNsZS4gU3R1ZGVudHMgc3RhcnQgYnkgbGVhcm5pbmcgdGhlIGJhc2ljcyBvZiBXaWtpcGVkaWEsIGFuZCB0aGVuIGZvY3VzIG9uIHRoZSBjb250ZW50LiBUaGV5IHBsYW4sIHJlc2VhcmNoLCBhbmQgd3JpdGUgYSBwcmV2aW91c2x5IG1pc3NpbmcgV2lraXBlZGlhIGFydGljbGUsIG9yIGNvbnRyaWJ1dGUgdG8gYW4gaW5jb21wbGV0ZSBlbnRyeSBvbiBhIGNvdXJzZS1yZWxhdGVkIHRvcGljLiBUaGlzIGFzc2lnbm1lbnQgdHlwaWNhbGx5IHJlcGxhY2VzIGEgdGVybSBwYXBlciBvciByZXNlYXJjaCBwcm9qZWN0LCBvciBpdCBmb3JtcyB0aGUgbGl0ZXJhdHVyZSByZXZpZXcgc2VjdGlvbiBvZiBhIGxhcmdlciBwYXBlci4gVGhlIHN0dWRlbnQgbGVhcm5pbmcgb3V0Y29tZSBpcyBoaWdoIHdpdGggdGhpcyBhc3NpZ25tZW50LCBidXQgaXQgZG9lcyB0YWtlIGEgc2lnbmlmaWNhbnQgYW1vdW50IG9mIHRpbWUuIFlvdXIgc3R1ZGVudHMgbmVlZCB0byBsZWFybiBib3RoIHRoZSB3aWtpIG1hcmt1cCBsYW5ndWFnZSBhbmQga2V5IHBvbGljaWVzIGFuZCBleHBlY3RhdGlvbnMgb2YgdGhlIFdpa2lwZWRpYS1lZGl0aW5nIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICBcIjxwPklmIHdyaXRpbmcgYW4gYXJ0aWNsZSBpc24ndCByaWdodCBmb3IgeW91ciBjbGFzcywgb3RoZXIgYXNzaWdubWVudCBvcHRpb25zIG9mZmVyIHN0dWRlbnRzIHZhbHVhYmxlIGxlYXJuaW5nIG9wcG9ydHVuaXRpZXMgYW5kIGhlbHAgdG8gaW1wcm92ZSBXaWtpcGVkaWEuIFNlbGVjdCBhbiBhc3NpZ25tZW50IHR5cGUgb24gdGhlIGxlZnQgdG8gbGVhcm4gbW9yZS48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwibGVhcm5pbmdfZXNzZW50aWFsc1wiXG4gICAgdGl0bGU6ICdXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICBpbnN0cnVjdGlvbnM6IFwiVG8gZ2V0IHN0YXJ0ZWQsIHlvdSdsbCB3YW50IHRvIGludHJvZHVjZSB5b3VyIHN0dWRlbnRzIHRvIHRoZSBiYXNpYyBydWxlcyBvZiB3cml0aW5nIFdpa2lwZWRpYSBhcnRpY2xlcyBhbmQgd29ya2luZyB3aXRoIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5LlwiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZWlyIGZpcnN0IFdpa2lwZWRpYSBhc3NpZ25tZW50IG1pbGVzdG9uZSwgeW91IGNhbiBhc2sgdGhlIHN0dWRlbnRzIHRvIGNyZWF0ZSB1c2VyIGFjY291bnRzIGFuZCB0aGVuIGNvbXBsZXRlIHRoZSA8ZW0+b25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50czwvZW0+LiBUaGlzIHRyYWluaW5nIGludHJvZHVjZXMgdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkgYW5kIGhvdyBpdCB3b3JrcywgZGVtb25zdHJhdGVzIHRoZSBiYXNpY3Mgb2YgZWRpdGluZyBhbmQgd2Fsa3Mgc3R1ZGVudHMgdGhyb3VnaCB0aGVpciBmaXJzdCBlZGl0cywgZ2l2ZXMgYWR2aWNlIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgYW5kIGRyYWZ0aW5nIHJldmlzaW9ucywgYW5kIGV4cGxhaW5zIGZ1cnRoZXIgc291cmNlcyBvZiBzdXBwb3J0IGFzIHRoZXkgY29udGludWUgYWxvbmcuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCwgd2hpY2ggeW91IGNhbiB1c2UgdG8gdmVyaWZ5IHRoYXQgc3R1ZGVudHMgY29tcGxldGVkIHRoZSB0cmFpbmluZy48L3A+J1xuICAgICAgICAgICc8cD5TdHVkZW50cyB3aG8gY29tcGxldGUgdGhpcyB0cmFpbmluZyBhcmUgYmV0dGVyIHByZXBhcmVkIHRvIGZvY3VzIG9uIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgc3BlbmQgbGVzcyB0aW1lIGRpc3RyYWN0ZWQgYnkgY2xlYW5pbmcgdXAgYWZ0ZXIgZXJyb3JzLjwvcD4nXG4gICAgICAgICAgJzxwPldpbGwgY29tcGxldGlvbiBvZiB0aGUgc3R1ZGVudCB0cmFpbmluZyBiZSBwYXJ0IG9mIHlvdXIgc3R1ZGVudHNcXCcgZ3JhZGVzPyAoTWFrZSB5b3VyIGNob2ljZSBhdCB0aGUgdG9wIGxlZnQuKTwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IG1pbGVzdG9uZXMnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgPGxpPkNvbXBsZXRlIHRoZSA8ZW0+b25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50czwvZW0+LiBEdXJpbmcgdGhpcyB0cmFpbmluZywgeW91IHdpbGwgbWFrZSBlZGl0cyBpbiBhIHNhbmRib3ggYW5kIGxlYXJuIHRoZSBiYXNpYyBydWxlcyBvZiBXaWtpcGVkaWEuPC9saT5cbiAgICAgICAgICAgIDxsaT5UbyBwcmFjdGljZSBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIFdpa2lwZWRpYSwgaW50cm9kdWNlIHlvdXJzZWxmIHRvIGFueSBXaWtpcGVkaWFucyBoZWxwaW5nIHlvdXIgY2xhc3MgKHN1Y2ggYXMgYSBXaWtpcGVkaWEgQW1iYXNzYWRvciksIGFuZCBsZWF2ZSBhIG1lc3NhZ2UgZm9yIGEgY2xhc3NtYXRlIG9uIHRoZWlyIHVzZXIgdGFsayBwYWdlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgIHRpdGxlOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBlYXJseSBlZGl0aW5nIHRhc2tzJ1xuICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIGVhcmx5IG9uLiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgIGZvcm1UaXRsZTogJ1doaWNoIGJhc2ljIGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGU/J1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5XaGljaCBpbnRyb2R1Y3RvcnkgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gdXNlIHRvIGFjY2xpbWF0ZSB5b3VyIHN0dWRlbnRzIHRvIFdpa2lwZWRpYT8gWW91IGNhbiBzZWxlY3Qgbm9uZSwgb25lLCBvciBtb3JlLiBXaGljaGV2ZXIgeW91IHNlbGVjdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBhc3NpZ25tZW50IHRpbWVsaW5lLjwvcD4nXG4gICAgICAgICAgJzx1bD5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5BZGQgdG8gYW4gYXJ0aWNsZS48L3N0cm9uZz4gVXNpbmcgY291cnNlIHJlYWRpbmdzIG9yIG90aGVyIHJlbGV2YW50IHNlY29uZGFyeSBzb3VyY2VzLCBhZGQgMeKAkzIgc2VudGVuY2VzIG9mIG5ldyBpbmZvcm1hdGlvbiB0byBhIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLiBCZSBzdXJlIHRvIGludGVncmF0ZSBpdCB3ZWxsIGludG8gdGhlIGV4aXN0aW5nIGFydGljbGUsIGFuZCBpbmNsdWRlIGEgY2l0YXRpb24gdG8gdGhlIHNvdXJjZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNvcHllZGl0IGFuIGFydGljbGUuPC9zdHJvbmc+IEJyb3dzZSBXaWtpcGVkaWEgdW50aWwgeW91IGZpbmQgYW4gYXJ0aWNsZSB0aGF0IHlvdSB3b3VsZCBsaWtlIHRvIGltcHJvdmUsIGFuZCBtYWtlIHNvbWUgZWRpdHMgdG8gaW1wcm92ZSB0aGUgbGFuZ3VhZ2Ugb3IgZm9ybWF0dGluZy4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgdXBsb2FkaW5nIGFuZCBhZGRpbmcgYSBwaG90byB5b3UgdG9vay48L2xpPlxuICAgICAgICAgIDwvdWw+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+Rm9yIG1vc3QgY291cnNlcywgdGhlIDxlbT5Dcml0aXF1ZSBhbiBhcnRpY2xlPC9lbT4gYW5kIDxlbT5BZGQgdG8gYW4gYXJ0aWNsZTwvZW0+IGV4ZXJjaXNlcyBwcm92aWRlIGEgbmljZSBmb3VuZGF0aW9uIGZvciB0aGUgbWFpbiB3cml0aW5nIHByb2plY3QuIFRoZXNlIGhhdmUgYmVlbiBzZWxlY3RlZCBieSBkZWZhdWx0LjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgdGl0bGU6ICdDaG9vc2luZyBhcnRpY2xlcydcbiAgICBmb3JtVGl0bGU6ICdIb3cgd2lsbCB5b3VyIGNsYXNzIHNlbGVjdCBhcnRpY2xlcz8nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkNob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuPC9wPidcbiAgICAgICAgICAnPHA+U29tZSBhcnRpY2xlcyBtYXkgaW5pdGlhbGx5IGxvb2sgZWFzeSB0byBpbXByb3ZlLCBidXQgcXVhbGl0eSByZWZlcmVuY2VzIHRvIGV4cGFuZCB0aGVtIG1heSBiZSBkaWZmaWN1bHQgdG8gZmluZC4gRmluZGluZyB0b3BpY3Mgd2l0aCB0aGUgcmlnaHQgYmFsYW5jZSBiZXR3ZWVuIHBvb3IgV2lraXBlZGlhIGNvdmVyYWdlIGFuZCBhdmFpbGFibGUgbGl0ZXJhdHVyZSBmcm9tIHdoaWNoIHRvIGV4cGFuZCB0aGF0IGNvdmVyYWdlIGNhbiBiZSB0cmlja3kuIEhlcmUgYXJlIHNvbWUgZ3VpZGVsaW5lcyB0byBrZWVwIGluIG1pbmQgd2hlbiBzZWxlY3RpbmcgYXJ0aWNsZXMgZm9yIGltcHJvdmVtZW50LjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMeKAkzIgcGFyYWdyYXBocyBvZiBpbmZvcm1hdGlvbiBhbmQgYXJlIGluIG5lZWQgb2YgZXhwYW5zaW9uLiBSZWxldmFudCBXaWtpUHJvamVjdCBwYWdlcyBjYW4gcHJvdmlkZSBhIGxpc3Qgb2Ygc3R1YnMgdGhhdCBuZWVkIGltcHJvdmVtZW50LjwvbGk+XG4gICAgICAgICAgICA8bGk+QmVmb3JlIGNyZWF0aW5nIGEgbmV3IGFydGljbGUsIHNlYXJjaCByZWxhdGVkIHRvcGljcyBvbiBXaWtpcGVkaWEgdG8gbWFrZSBzdXJlIHlvdXIgdG9waWMgaXNuJ3QgYWxyZWFkeSBjb3ZlcmVkIGVsc2V3aGVyZS4gT2Z0ZW4sIGFuIGFydGljbGUgbWF5IGV4aXN0IHVuZGVyIGFub3RoZXIgbmFtZSwgb3IgdGhlIHRvcGljIG1heSBiZSBjb3ZlcmVkIGFzIGEgc3Vic2VjdGlvbiBvZiBhIGJyb2FkZXIgYXJ0aWNsZS48L2xpPlxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFydGljbGVzIHRoYXQgYXJlIFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD4nXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChmb3IgZXhhbXBsZSwgR2xvYmFsIFdhcm1pbmcsIEFib3J0aW9uLCBvciBTY2llbnRvbG9neSkuIFlvdSBtYXkgYmUgbW9yZSBzdWNjZXNzZnVsIHN0YXJ0aW5nIGEgc3ViLWFydGljbGUgb24gdGhlIHRvcGljIGluc3RlYWQuPC9saT5cbiAgICAgICAgICAgIDxsaT5Eb24ndCB3b3JrIG9uIGFuIGFydGljbGUgdGhhdCBpcyBhbHJlYWR5IG9mIGhpZ2ggcXVhbGl0eSBvbiBXaWtpcGVkaWEsIHVubGVzcyB5b3UgZGlzY3VzcyBhIHNwZWNpZmljIHBsYW4gZm9yIGltcHJvdmluZyBpdCB3aXRoIG90aGVyIGVkaXRvcnMgYmVmb3JlaGFuZC48L2xpPlxuICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHN0YXJ0IGFydGljbGVzIHdpdGggdGl0bGVzIHRoYXQgaW1wbHkgYW4gYXJndW1lbnQgb3IgZXNzYXktbGlrZSBhcHByb2FjaCAoZS5nLiwgVGhlIEVmZmVjdHMgVGhhdCBUaGUgUmVjZW50IFN1Yi1QcmltZSBNb3J0Z2FnZSBDcmlzaXMgaGFzIGhhZCBvbiB0aGUgVVMgYW5kIEdsb2JhbCBFY29ub21pY3MpLiBUaGVzZSB0eXBlIG9mIHRpdGxlcywgYW5kIG1vc3QgbGlrZWx5IHRoZSBjb250ZW50IHRvbywgbWF5IG5vdCBiZSBhcHByb3ByaWF0ZSBmb3IgYW4gZW5jeWNsb3BlZGlhLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZSBpbnN0cnVjdG9yLCB5b3Ugc2hvdWxkIGFwcGx5IHlvdXIgb3duIGV4cGVydGlzZSB0byBleGFtaW5pbmcgV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkLiBZb3UgdW5kZXJzdGFuZCB0aGUgYnJvYWRlciBpbnRlbGxlY3R1YWwgY29udGV4dCB3aGVyZSBpbmRpdmlkdWFsIHRvcGljcyBmaXQgaW4sIHlvdSBjYW4gcmVjb2duaXplIHdoZXJlIFdpa2lwZWRpYSBmYWxscyBzaG9ydCwgeW91IGtub3figJRvciBrbm93IGhvdyB0byBmaW5k4oCUdGhlIHJlbGV2YW50IGxpdGVyYXR1cmUsIGFuZCB5b3Uga25vdyB3aGF0IHRvcGljcyB5b3VyIHN0dWRlbnRzIHNob3VsZCBiZSBhYmxlIHRvIGhhbmRsZS4gWW91ciBndWlkYW5jZSBvbiBhcnRpY2xlIGNob2ljZSBhbmQgc291cmNpbmcgaXMgY3JpdGljYWwgZm9yIGJvdGggeW91ciBzdHVkZW50c+KAmSBzdWNjZXNzIGFuZCB0aGUgaW1wcm92ZW1lbnQgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgICAgJzxwPlRoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdTdHVkZW50cyBmaW5kIGFydGljbGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gSGF2aW5nIHN0dWRlbnRzIGZpbmQgdGhlaXIgb3duIGFydGljbGVzIHByb3ZpZGVzIHRoZW0gd2l0aCBhIHNlbnNlIG9mIG1vdGl2YXRpb24gYW5kIG93bmVyc2hpcCBvdmVyIHRoZSBhc3NpZ25tZW50IGFuZCBleGVyY2lzZXMgdGhlaXIgY3JpdGljYWwgdGhpbmtpbmcgc2tpbGxzIGFzIHRoZXkgaWRlbnRpZnkgY29udGVudCBnYXBzLCBidXQgaXQgbWF5IGFsc28gbGVhZCB0byBjaG9pY2VzIHRoYXQgYXJlIGZ1cnRoZXIgYWZpZWxkIGZyb20gY291cnNlIG1hdGVyaWFsLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH0gXG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJyZXNlYXJjaF9wbGFubmluZ1wiXG4gICAgdGl0bGU6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgZm9ybVRpdGxlOiAnSG93IHNob3VsZCBzdHVkZW50cyBwbGFuIHRoZWlyIGFydGljbGVzPydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPlN0dWRlbnRzIG9mdGVuIHdhaXQgdW50aWwgdGhlIGxhc3QgbWludXRlIHRvIGRvIHRoZWlyIHJlc2VhcmNoLCBvciBjaG9vc2Ugc291cmNlcyB1bnN1aXRhYmxlIGZvciBXaWtpcGVkaWEuIFRoYXQncyB3aHkgd2UgcmVjb21tZW5kIGFza2luZyBzdHVkZW50cyB0byBwdXQgdG9nZXRoZXIgYSBiaWJsaW9ncmFwaHkgb2YgbWF0ZXJpYWxzIHRoZXkgd2FudCB0byB1c2UgaW4gZWRpdGluZyB0aGUgYXJ0aWNsZSwgd2hpY2ggY2FuIHRoZW4gYmUgYXNzZXNzZWQgYnkgeW91IGFuZCBvdGhlciBXaWtpcGVkaWFucy48L3A+XCJcbiAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJkcmFmdHNfbWFpbnNwYWNlXCJcbiAgICB0aXRsZTogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGRyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgIGluc3RydWN0aW9uczogJ09uY2Ugc3R1ZGVudHMgaGF2ZSBnb3R0ZW4gYSBncmlwIG9uIHRoZWlyIHRvcGljcyBhbmQgdGhlIHNvdXJjZXMgdGhleSB3aWxsIHVzZSB0byB3cml0ZSBhYm91dCB0aGVtLCBpdOKAmXMgdGltZSB0byBzdGFydCB3cml0aW5nIG9uIFdpa2lwZWRpYS4gWW91IGNhbiBhc2sgdGhlbSB0byBqdW1wIHJpZ2h0IGluIGFuZCBlZGl0IGxpdmUsIG9yIHN0YXJ0IHRoZW0gb2ZmIGluIHRoZWlyIG93biBzYW5kYm94IHBhZ2VzLiBUaGVyZSBhcmUgcHJvcyBhbmQgY29ucyBvZiBlYWNoIGFwcHJvYWNoLidcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgb2Ygc2FuZGJveGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5TYW5kYm94ZXMg4oCUIHBhZ2VzIGFzc29jaWF0ZWQgd2l0aCBhbiBpbmRpdmlkdWFsIGVkaXRvciB0aGF0IGFyZSBub3QgY29uc2lkZXJlZCBwYXJ0IG9mIFdpa2lwZWRpYSBwcm9wZXIg4oCUIG1ha2Ugc3R1ZGVudHMgZmVlbCBzYWZlLiBUaGV5IGNhbiBlZGl0IHdpdGhvdXQgdGhlIHByZXNzdXJlIG9mIHRoZSB3aG9sZSB3b3JsZCByZWFkaW5nIHRoZWlyIGRyYWZ0cyBvciBvdGhlciBXaWtpcGVkaWFucyBhbHRlcmluZyB0aGVpciB3cml0aW5nLiBIb3dldmVyLCBzYW5kYm94IGVkaXRpbmcgbGltaXRzIG1hbnkgb2YgdGhlIHVuaXF1ZSBhc3BlY3RzIG9mIFdpa2lwZWRpYSBhcyBhIHRlYWNoaW5nIHRvb2wsIHN1Y2ggYXMgY29sbGFib3JhdGl2ZSB3cml0aW5nIGFuZCBpbmNyZW1lbnRhbCBkcmFmdGluZy4gU3BlbmRpbmcgbW9yZSB0aGFuIGEgd2VlayBvciB0d28gaW4gc2FuZGJveGVzIGlzIHN0cm9uZ2x5IGRpc2NvdXJhZ2VkLjwvcD5cIiBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgb2YgZWRpdGluZyBsaXZlJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5FZGl0aW5nIGxpdmUgaXMgZXhjaXRpbmcgZm9yIHRoZSBzdHVkZW50cyBiZWNhdXNlIHRoZXkgY2FuIHNlZSB0aGVpciBjaGFuZ2VzIHRvIHRoZSBhcnRpY2xlcyBpbW1lZGlhdGVseSBhbmQgZXhwZXJpZW5jZSB0aGUgY29sbGFib3JhdGl2ZSBlZGl0aW5nIHByb2Nlc3MgdGhyb3VnaG91dCB0aGUgYXNzaWdubWVudC4gSG93ZXZlciwgYmVjYXVzZSBuZXcgZWRpdG9ycyBvZnRlbiB1bmludGVudGlvbmFsbHkgYnJlYWsgV2lraXBlZGlhIHJ1bGVzLCBzb21ldGltZXMgc3R1ZGVudHPigJkgYWRkaXRpb25zIGFyZSBxdWVzdGlvbmVkIG9yIHJlbW92ZWQuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgdGl0bGU6ICdQZWVyIGZlZWRiYWNrJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHBlZXIgZmVlZGJhY2snXG4gICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICBpbnN0cnVjdGlvbnM6IFwiQ29sbGFib3JhdGlvbiBpcyBhIGNyaXRpY2FsIGVsZW1lbnQgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYS5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICBcIjxwPlBlZXIgcmV2aWV3cyBhcmUgYW5vdGhlciBjaGFuY2UgZm9yIHN0dWRlbnRzIHRvIHByYWN0aWNlIGNyaXRpY2FsIHRoaW5raW5nLiBVc2VmdWwgcmV2aWV3cyBmb2N1cyBvbiBzcGVjaWZpYyBpc3N1ZXMgdGhhdCBjYW4gYmUgaW1wcm92ZWQuIFNpbmNlIHN0dWRlbnRzIGFyZSB1c3VhbGx5IGhlc2l0YW50IHRvIGNyaXRpY2l6ZSB0aGVpciBjbGFzc21hdGVz4oCUYW5kIG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIG1heSBnZXQgYW5ub3llZCB3aXRoIGEgc3RyZWFtIG9mIHByYWlzZSBmcm9tIHN0dWRlbnRzIHRoYXQgZ2xvc3NlcyBvdmVyIGFuIGFydGljbGUncyBzaG9ydGNvbWluZ3PigJRpdCdzIGltcG9ydGFudCB0byBnaXZlcyBleGFtcGxlcyBvZiB0aGUga2luZHMgb2YgY29uc3RydWN0aXZlbHkgY3JpdGljYWwgZmVlZGJhY2sgdGhhdCBhcmUgdGhlIG1vc3QgaGVscGZ1bC48L3A+XCJcbiAgICAgICAgICBcIjxwPkhvdyBtYW55IHBlZXIgcmV2aWV3cyB3aWxsIHlvdSBhc2sgZWFjaCBzdHVkZW50IHRvIGNvbnRyaWJ1dGUgZHVyaW5nIHRoZSBjb3Vyc2U/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICB0aXRsZTogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgKG9wdGlvbmFsKTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBpbnN0cnVjdGlvbnM6IFwiQnkgdGhlIHRpbWUgc3R1ZGVudHMgaGF2ZSBtYWRlIGltcHJvdmVtZW50cyBiYXNlZCBvbiBjbGFzc21hdGVzJyBjb21tZW50c+KAlGFuZCBpZGVhbGx5IHN1Z2dlc3Rpb25zIGZyb20geW91IGFzIHdlbGzigJR0aGV5IHNob3VsZCBoYXZlIHByb2R1Y2VkIG5lYXJseSBjb21wbGV0ZSBhcnRpY2xlcy4gTm93IGlzIHRoZSBjaGFuY2UgdG8gZW5jb3VyYWdlIHRoZW0gdG8gd2FkZSBhIGxpdHRsZSBkZWVwZXIgaW50byBXaWtpcGVkaWEgYW5kIGl0cyBub3JtcyBhbmQgY3JpdGVyaWEgdG8gY3JlYXRlIGdyZWF0IGNvbnRlbnQuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgXCI8cD5Zb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0cyBhbmQgbGltaXRzIG9mIFdpa2lwZWRpYS4gQ29uc2lkZXIgYnJpbmdpbmcgaW4gYSBndWVzdCBzcGVha2VyLCBoYXZpbmcgYSBwYW5lbCBkaXNjdXNzaW9uLCBvciBzaW1wbHkgaGF2aW5nIGFuIG9wZW4gZGlzY3Vzc2lvbiBpbiBjbGFzcyBhYm91dCB3aGF0IHRoZSBzdHVkZW50cyBoYXZlIGRvbmUgc28gZmFyIGFuZCB3aHkgKG9yIHdoZXRoZXIpIGl0IG1hdHRlcnMuPC9wPlwiXG4gICAgICAgICBcIjxwPkluIGFkZGl0aW9uIHRvIHRoZSBXaWtpcGVkaWEgYXJ0aWNsZSB3cml0aW5nIGl0c2VsZiwgeW91IG1heSB3YW50IHRvIHVzZSBhIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudC4gVGhlc2UgYXNzaWdubWVudHMgY2FuIHJlaW5mb3JjZSBhbmQgZGVlcGVuIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBhbHNvIGhlbHAgeW91IHRvIHVuZGVyc3RhbmQgYW5kIGV2YWx1YXRlIHRoZSBzdHVkZW50cycgd29yayBhbmQgbGVhcm5pbmcgb3V0Y29tZXMuIE9uIHRoZSBsZWZ0IGFyZSBzb21lIG9mIHRoZSBlZmZlY3RpdmUgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyB0aGF0IGluc3RydWN0b3JzIG9mdGVuIHVzZS4gU2Nyb2xsIG92ZXIgZWFjaCBmb3IgbW9yZSBpbmZvcm1hdGlvbiwgYW5kIHNlbGVjdCBhbnkgdGhhdCB5b3Ugd2lzaCB0byB1c2UgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZHlrXCJcbiAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHRoZSA8ZW0+RGlkIFlvdSBLbm93PC9lbT4gcHJvY2VzcydcbiAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkRpZCBZb3UgS25vdyAoRFlLKSBpcyBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgaGlnaGxpZ2h0aW5nIG5ldyBjb250ZW50IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gV2lraXBlZGlhIGluIHRoZSBsYXN0IHNldmVuIGRheXMuIERZSyBjYW4gYmUgYSBncmVhdCBvcHBvcnR1bml0eSB0byBnZXQgc3R1ZGVudHMgZXhjaXRlZCBhYm91dCB0aGVpciB3b3JrLiBBIHR5cGljYWwgRFlLIGFydGljbGUgd2lsbCBiZSB2aWV3ZWQgaHVuZHJlZHMgb3IgdGhvdXNhbmRzIG9mIHRpbWVzIGR1cmluZyBpdHMgNiBob3VycyBpbiB0aGUgc3BvdGxpZ2h0LjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4IG9yIG1vcmUpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBTdHVkZW50cyB3aG8gbWVldCB0aGlzIGNyaXRlcmlhIG1heSB3YW50IHRvIG5vbWluYXRlIHRoZWlyIGNvbnRyaWJ1dGlvbnMgZm9yIERZSy48L3A+XCJcbiAgICAgICAgICBcIjxwPlRoZSBzaG9ydCB3aW5kb3cgb2YgZWxpZ2liaWxpdHksIGFuZCB0aGUgc3RyaWN0IHJ1bGVzIG9mIHRoZSBub21pbmF0aW9uIHByb2Nlc3MsIGNhbiBtYWtlIGl0IGNoYWxsZW5naW5nIHRvIGluY29ycG9yYXRlIERZSyBpbnRvIGEgY2xhc3Nyb29tIHByb2plY3QuIFRoZSBEWUsgcHJvY2VzcyBzaG91bGQgbm90IGJlIGEgcmVxdWlyZWQgcGFydCBvZiB5b3VyIGFzc2lnbm1lbnQsIGFzIHRoZSBEWUsgbm9taW5hdGlvbiBwcm9jZXNzIGNhbiBiZSBkaWZmaWN1bHQgZm9yIG5ld2NvbWVycyB0byBuYXZpZ2F0ZS4gSG93ZXZlciwgaXQgbWFrZXMgYSBncmVhdCBzdHJldGNoIGdvYWwgd2hlbiB1c2VkIHNlbGVjdGl2ZWx5LjwvcD5cIlxuICAgICAgICAgIFwiPHA+V291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gaGVscCB5b3UgYW5kIHlvdXIgc3R1ZGVudHMgZHVyaW5nIHRoZSB0ZXJtIHRvIGlkZW50aWZ5IHdvcmsgdGhhdCBtYXkgYmUgYSBnb29kIGNhbmRpZGF0ZSBmb3IgRFlLIGFuZCBhbnN3ZXIgcXVlc3Rpb25zIHlvdSBtYXkgaGF2ZSBhYm91dCB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ2FcIlxuICAgIHRpdGxlOiAnR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5Hb29kIEFydGljbGU8L2VtPiBwcm9jZXNzJ1xuICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyBwcm9jZXNzIGdlbmVyYWxseSB0YWtlcyBzb21lIHRpbWUg4oCUIGJldHdlZW4gc2V2ZXJhbCBkYXlzIGFuZCBzZXZlcmFsIHdlZWtzLCBkZXBlbmRpbmcgb24gdGhlIGludGVyZXN0IG9mIHJldmlld2VycyBhbmQgdGhlIHNpemUgb2YgdGhlIHJldmlldyBiYWNrbG9nIGluIHRoZSBzdWJqZWN0IGFyZWEg4oCUIGFuZCBzaG91bGQgb25seSBiZSB1bmRlcnRha2VuIGZvciBhcnRpY2xlcyB0aGF0IGFyZSBhbHJlYWR5IHZlcnkgd2VsbC1kZXZlbG9wZWQuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLCBhbmQgdGhvc2Ugd3JpdHRlbiBieSBzdHVkZW50IGVkaXRvcnMgd2hvIGFyZSBhbHJlYWR5IGV4cGVyaWVuY2VkLCBzdHJvbmcgd3JpdGVycyBhbmQgd2hvIGFyZSB3aWxsaW5nIHRvIGNvbWUgYmFjayB0byBhZGRyZXNzIHJldmlld2VyIGZlZWRiYWNrIChldmVuIGFmdGVyIHRoZSB0ZXJtIGVuZHMpPC9lbT4uPC9wPlwiXG4gICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gcHJvdmlkZSBhZHZpY2UgYW5kIHN1cHBvcnQgdG8gaGlnaC1hY2hpZXZpbmcgc3R1ZGVudHMgd2hvIGFyZSBpbnRlcmVzdGVkIGluIHRoZSBHb29kIEFydGljbGUgcHJvY2Vzcy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImdyYWRpbmdcIlxuICAgIHRpdGxlOiAnR3JhZGluZydcbiAgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJvdmVydmlld1wiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICBmb3JtVGl0bGU6IFwiXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIFxuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48dGV4dGFyZWEgaWQ9J3Nob3J0X2Rlc2NyaXB0aW9uJyByb3dzPScxNCcgc3R5bGU9J3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI0MiwyNDIsMjQyLDEuMCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDIwMiwyMDIsMjAyLDEuMCk7cGFkZGluZzoxMHB4IDE1cHg7Zm9udC1zaXplOiAxNnB4O2xpbmUtaGVpZ2h0IDIzcHg7bGV0dGVyLXNwYWNpbmc6IDAuMjVweDsnPjwvdGV4dGFyZWE+PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAgXG5dXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ29udGVudFxuIiwiV2l6YXJkQ291cnNlSW5mbyA9IFxuXG4gICMgUkVTRUFSQ0ggQU5EIFdSSVRFIEEgV0lLSVBFRElBIEFSVElDTEVcbiAgcmVzZWFyY2h3cml0ZTogXG4gICAgdGl0bGU6IFwiUmVzZWFyY2ggYW5kIHdyaXRlIGEgV2lraXBlZGlhIGFydGljbGVcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIllvdSBndWlkZSB5b3VyIHN0dWRlbnRzIHRvIHNlbGVjdCBjb3Vyc2UtcmVsYXRlZCB0b3BpY3MgdGhhdCBhcmUgbm90IHdlbGwtY292ZXJlZCBvbiBXaWtpcGVkaWEsIGFuZCB0aGV5IHdvcmsgaW5kaXZpZHVhbGx5IG9yIGluIHNtYWxsIHRlYW1zIHRvIGRldmVsb3AgY29udGVudCDigJQgZWl0aGVyIGV4cGFuZGluZyBleGlzdGluZyBhcnRpY2xlcyBvciBjcmVhdGluZyBuZXcgb25lcy4gU3R1ZGVudHMgYW5hbHl6ZSB0aGUgY3VycmVudCBnYXBzLCBzdGFydCB0aGVpciByZXNlYXJjaCB0byBmaW5kIGhpZ2gtcXVhbGl0eSBzZWNvbmRhcnkgc291cmNlcywgYW5kIHRoZW4gY29uc2lkZXIgdGhlIGJlc3Qgd2F5IHRvIG9yZ2FuaXplIHRoZSBhdmFpbGFibGUgaW5mb3JtYXRpb24uIFRoZW4gaXQncyB0aW1lIGZvciB0aGVtIGluIHR1cm4gdG86IHByb3Bvc2UgYW4gb3V0bGluZTsgZHJhZnQgbmV3IGFydGljbGVzIG9yIG5ldyBjb250ZW50IGZvciBleGlzdGluZyBvbmVzOyBwcm92aWRlIGFuZCByZXNwb25kIHRvIHBlZXIgZmVlZGJhY2s7IGFuZCBtb3ZlIHRoZWlyIHdvcmsgaW50byB0aGUgbGl2ZSBhcnRpY2xlIG5hbWVzcGFjZSBvbiBXaWtpcGVkaWEuXCJcbiAgICAgIFwiQWxvbmcgdGhlIHdheSwgc3R1ZGVudHMgbWF5IHdvcmsgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWEgZWRpdG9ycyB3aG8gY2FuIG9mZmVyIGNyaXRpY2FsIGZlZWRiYWNrIGFuZCBoZWxwIG1ha2Ugc3VyZSBhcnRpY2xlcyBtZWV0IFdpa2lwZWRpYSdzIHN0YW5kYXJkcyBhbmQgc3R5bGUgY29udmVudGlvbnMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBpbmNvcnBvcmF0ZSB0aW1lIGludG8gdGhlIGFzc2lnbm1lbnQgZm9yIHRoZSBzdHVkZW50cyB0byBpbnRlZ3JhdGUgdGhvc2Ugc3VnZ2VzdGlvbnMuIFN0dWRlbnRzIHdobyBkbyBncmVhdCB3b3JrIG1heSBoYXZlIHRoZWlyIGFydGljbGVzIGhpZ2hsaWdodGVkIG9uIFdpa2lwZWRpYSdzIG1haW4gcGFnZSwgYW5kIGhpZ2ggcXVhbGl0eSBhcnRpY2xlcyB3aWxsIGhlbHAgaW5mb3JtIHRob3VzYW5kcyBvZiBmdXR1cmUgcmVhZGVycyBhYm91dCB0aGUgc2VsZWN0ZWQgdG9waWMuIFwiXG4gICAgICBcIk9wdGlvbmFsbHksIHlvdSBtYXkgYXNrIHlvdXIgc3R1ZGVudHMgdG8gd3JpdGUgYSByZWZsZWN0aXZlIHBhcGVyIGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlLCBwcmVzZW50IHRoZWlyIGNvbnRyaWJ1dGlvbnMgaW4gY2xhc3MsIG9yIGRldmVsb3AgdGhlaXIgb3duIGNvbmNsdXNpb25zIGFuZCBhcmd1bWVudHMgaW4gYSBzdXBwbGVtZW50YXJ5IGVzc2F5LlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMTIgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkNsYXNzZXMgd2l0aCBmZXdlciB0aGFuIDMwIHN0dWRlbnRzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkcyBvciBncmFkIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJMYXJnZSBzdXJ2ZXkgY2xhc3Nlc1wiXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHdyaXRpbmcgc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBTT1VSQ0UtQ0VOVEVSRUQgQURESVRJT05TXG4gIHNvdXJjZWNlbnRlcmVkOiBcbiAgICB0aXRsZTogXCJTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyByZWFkIFdpa2lwZWRpYSBhcnRpY2xlcyBpbiBhIHNlbGYtc2VsZWN0ZWQgc3ViamVjdCBhcmVhIHRvIGlkZW50aWZ5IGFydGljbGVzIGluIG5lZWQgb2YgcmV2aXNpb24gb3IgaW1wcm92ZW1lbnQsIHN1Y2ggYXMgdGhvc2Ugd2l0aCBcXFwiY2l0YXRpb24gbmVlZGVkXFxcIiB0YWdzLiBTdHVkZW50cyB3aWxsIGZpbmQgcmVsaWFibGUgc291cmNlcyB0byB1c2UgYXMgcmVmZXJlbmNlcyBmb3IgdW5jaXRlZCBjb250ZW50LiBUaGlzIGFzc2lnbm1lbnQgaW5jbHVkZXMgYSBwZXJzdWFzaXZlIGVzc2F5IGluIHdoaWNoIHN0dWRlbnRzIG1ha2UgYSBjYXNlIGZvciB0aGVpciBzdWdnZXN0ZWQgY2hhbmdlcywgd2h5IHRoZXkgYmVsaWV2ZSB0aGV5IGFyZSBxdWFsaWZpZWQgdG8gbWFrZSB0aG9zZSBjaGFuZ2VzLCBhbmQgd2h5IHRoZWlyIHNlbGVjdGVkIHNvdXJjZXMgcHJvdmlkZSBzdXBwb3J0LiBBZnRlciBtYWtpbmcgdGhlaXIgY29udHJpYnV0aW9ucywgc3R1ZGVudHMgcmVmbGVjdCBvbiB0aGVpciB3b3JrIHdpdGggYSBmb3JtYWwgcGFwZXIsIGFuZCBkaXNjdXNzIHdoZXRoZXIgdGhleSd2ZSBhY2NvbXBsaXNoZWQgdGhlaXIgc3RhdGVkIGdvYWxzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2UgY2xhc3Nlc1wiXG4gICAgICBcIkFkdmFuY2VkIHVuZGVyZ3JhZHVhdGVzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEZJTkQgQU5EIEZJWCBFUlJPUlNcbiAgZmluZGZpeDogXG4gICAgdGl0bGU6IFwiRmluZCBhbmQgZml4IGVycm9yc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGZpbmQgYW4gYXJ0aWNsZSBhYm91dCBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHdpdGggd2hpY2ggdGhleSBhcmUgZXh0cmVtZWx5IGZhbWlsaWFyIHRoYXQgaGFzIHNvbWUgbWlzdGFrZXMuIFN0dWRlbnRzIHRha2Ugd2hhdCB0aGV5IGtub3cgYWJvdXQgdGhlIHRvcGljLCBmaW5kIGZhY3R1YWwgZXJyb3JzIGFuZCBvdGhlciBzdWJzdGFudGl2ZSBtaXN0YWtlcywgYW5kIGNvcnJlY3QgdGhvc2UuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJHcmFkdWF0ZSBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cbiAgcGxhZ2lhcmlzbTogXG4gICAgdGl0bGU6IFwiSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBzZWFyY2ggdGhyb3VnaCBXaWtpcGVkaWEgYXJ0aWNsZXMgdG8gZmluZCBpbnN0YW5jZXMgb2YgY2xvc2UgcGFyYXBocmFzaW5nIG9yIHBsYWdpYXJpc20sIHRoZW4gcmV3b3JkIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGVpciBvd24gbGFuZ3VhZ2UgdG8gYmUgYXBwcm9wcmlhdGUgZm9yIFdpa2lwZWRpYS4gSW4gdGhpcyBhc3NpZ25tZW50LCBzdHVkZW50cyBnYWluIGEgZGVlcGVyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBwbGFnaWFyaXNtIGlzIGFuZCBob3cgdG8gYXZvaWQgaXQuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJUQkRcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI1RSQU5TTEFURSBBTiBBUlRJQ0xFIFRPIEVOR0xJU0hcbiAgdHJhbnNsYXRlOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlRoaXMgaXMgYSBwcmFjdGljYWwgYXNzaWdubWVudCBmb3IgbGFuZ3VhZ2UgaW5zdHJ1Y3RvcnMuIFN0dWRlbnRzIHNlbGVjdCBhIFdpa2lwZWRpYSBhcnRpY2xlIGluIHRoZSBsYW5ndWFnZSB0aGV5IGFyZSBzdHVkeWluZywgYW5kIHRyYW5zbGF0ZSBpdCBpbnRvIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gU3R1ZGVudHMgc2hvdWxkIHN0YXJ0IHdpdGggaGlnaC1xdWFsaXR5IGFydGljbGVzIHdoaWNoIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gVGhpcyBhc3NpZ25tZW50IHByb3ZpZGVzIHByYWN0aWNhbCB0cmFuc2xhdGlvbiBhZHZpY2Ugd2l0aCB0aGUgaW5jZW50aXZlIG9mIHJlYWwgcHVibGljIHNlcnZpY2UsIGFzIHN0dWRlbnRzIGV4cGFuZCB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRhcmdldCBjdWx0dXJlIG9uIFdpa2lwZWRpYS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYrIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYW5ndWFnZSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB0cmFuc2xhdGluZyA8ZW0+ZnJvbTwvZW0+IHRoZWlyIG5hdGl2ZSBsYW5ndWFnZSB0byB0aGUgbGFuZ3VhZ2UgdGhleSdyZSBzdHVkeWluZ1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0NPUFkgRURJVElOR1xuICBjb3B5ZWRpdDogXG4gICAgdGl0bGU6IFwiQ29weWVkaXRcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIGFyZSBhc2tlZCB0byBjb3B5ZWRpdCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGVuZ2FnaW5nIGVkaXRvcnMgaW4gY29udmVyc2F0aW9uIGFib3V0IHRoZWlyIHdyaXRpbmcgYW5kIGltcHJvdmluZyB0aGUgY2xhcml0eSBvZiB0aGUgbGFuZ3VhZ2Ugb2YgdGhlIG1hdGVyaWFsLiBTdHVkZW50cyBsZWFybiB0byB3cml0ZSBpbiBkaWZmZXJlbnQgdm9pY2VzIGZvciBkaWZmZXJlbnQgYXVkaWVuY2VzLiBJbiBsZWFybmluZyBhYm91dCB0aGUgc3BlY2lmaWMgdm9pY2Ugb24gV2lraXBlZGlhLCB0aGV5IGxlYXJuIGFib3V0IHRoZSDigJxhdXRob3JpdGF0aXZl4oCdIHZvaWNlIGFuZCBob3cgaXRzIHRvbmUgY2FuIGNvbnZpbmNlLCBldmVuIGlmIHRoZSBjb250ZW50IGlzIHF1ZXN0aW9uYWJsZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkVuZ2xpc2ggZ3JhbW1hciBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB3aXRob3V0IHN0cm9uZyB3cml0aW5nIHNraWxsc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0VWQUxVQVRFIEFSVElDTEVTXG4gIGV2YWx1YXRlOiBcbiAgICB0aXRsZTogXCJFdmFsdWF0ZSBhcnRpY2xlc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiRmlyc3QsIHN0dWRlbnRzIHdyaXRlIGEgcmVwb3J0IGFuYWx5emluZyB0aGUgc3RhdGUgb2YgV2lraXBlZGlhIGFydGljbGVzIG9uIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB3aXRoIGFuIGV5ZSB0b3dhcmQgZnV0dXJlIHJldmlzaW9ucy4gVGhpcyBlbmNvdXJhZ2VzIGEgY3JpdGljYWwgcmVhZGluZyBvZiBib3RoIGNvbnRlbnQgYW5kIGZvcm0uIFRoZW4sIHRoZSBzdHVkZW50cyBlZGl0IGFydGljbGVzIGluIHNhbmRib3hlcyB3aXRoIGZlZWRiYWNrIGZyb20gdGhlIHByb2Zlc3NvciwgY2FyZWZ1bGx5IHNlbGVjdGluZyBhbmQgYWRkaW5nIHJlZmVyZW5jZXMgdG8gaW1wcm92ZSB0aGUgYXJ0aWNsZSBiYXNlZCBvbiB0aGVpciBjcml0aWNhbCBlc3NheXMuIEZpbmFsbHksIHRoZXkgY29tcG9zZSBhIHNlbGYtYXNzZXNzbWVudCBldmFsdWF0aW5nIHRoZWlyIG93biBjb250cmlidXRpb25zLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI1IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEFERCBJTUFHRVMgT1IgTVVMVElNRURJQVxuICBtdWx0aW1lZGlhOiBcbiAgICB0aXRsZTogXCIgQWRkIGltYWdlcyBvciBtdWx0aW1lZGlhXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJJZiB5b3VyIHN0dWRlbnRzIGFyZSBhZGVwdCBhdCBtZWRpYSwgdGhpcyBjYW4gYmUgYSBncmVhdCB3YXkgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYSBpbiBhIG5vbi10ZXh0dWFsIHdheS4gSW4gdGhlIHBhc3QsIHN0dWRlbnRzIGhhdmUgcGhvdG9ncmFwaGVkIGxvY2FsIG1vbnVtZW50cyB0byBpbGx1c3RyYXRlIGFydGljbGVzLCBkZXNpZ25lZCBpbmZvZ3JhcGhpY3MgdG8gaWxsdXN0cmF0ZSBjb25jZXB0cywgb3IgY3JlYXRlZCB2aWRlb3MgdGhhdCBkZW1vbnN0cmF0ZWQgYXVkaW8tdmlzdWFsbHkgd2hhdCBhcnRpY2xlcyBkZXNjcmliZSBpbiB3b3Jkcy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjMgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHN0dWR5aW5nIHBob3RvZ3JhcGh5LCB2aWRlb2dyYXBoeSwgb3IgZ3JhcGhpYyBkZXNpZ25cIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgbWVkaWEgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvdXJzZUluZm9cbiIsIldpemFyZFN0ZXBJbnB1dHMgPVxuICBpbnRybzogXG4gICAgdGVhY2hlcjpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIG5hbWUnXG4gICAgICBpZDogJ3RlYWNoZXInXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBjb3Vyc2VfbmFtZTpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdDb3Vyc2UgbmFtZSdcbiAgICAgIGlkOiAnY291cnNlX25hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc2Nob29sOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICBpZDogJ3NjaG9vbCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdWJqZWN0OlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1N1YmplY3QnXG4gICAgICBpZDogJ3N1YmplY3QnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc3R1ZGVudHM6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGluc3RydWN0b3JfdXNlcm5hbWU6XG4gICAgICBsYWJlbDogJ1VzZXJuYW1lICh0ZW1wb3JhcnkpJ1xuICAgICAgaWQ6ICdpbnN0cnVjdG9yX3VzZXJuYW1lJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIGlzRGF0ZTogdHJ1ZVxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgd2l6YXJkX2VuZF9kYXRlOlxuICAgICAgaXNEYXRlOiB0cnVlXG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBcbiAgbXVsdGltZWRpYV8xOlxuICAgIG11bHRpbWVkaWFfMV8xOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzFfMSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAxPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgICBtdWx0aW1lZGlhXzFfMjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYV8xXzInXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gIG11bHRpbWVkaWFfMjpcbiAgICBtdWx0aW1lZGlhXzJfMTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYV8yXzEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIG11bHRpbWVkaWFfMl8yOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzJfMidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gIGNvcHllZGl0XzE6XG4gICAgY29weWVkaXRfMV8xOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8xXzEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIGNvcHllZGl0XzFfMjpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY29weWVkaXRfMV8yJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgY29weWVkaXRfMjpcbiAgICBjb3B5ZWRpdF8yXzE6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzJfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgY29weWVkaXRfMl8yOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8yXzInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDI/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgbXVsdGltZWRpYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgY29weWVkaXQ6IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgc29tZXRoaW5nX2Vsc2U6XG4gICAgICB0eXBlOiAnbGluaydcbiAgICAgIGhyZWY6ICdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZydcbiAgICAgIGlkOiAnc29tZXRoaW5nX2Vsc2UnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQSBkaWZmZXJlbnQgYXNzaWdubWVudD8gR2V0IGluIHRvdWNoIGhlcmUuJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogZmFsc2VcbiAgICAgIHRpcEluZm86XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBcIkhhdmUgYW5vdGhlciBpZGVhIGZvciBpbmNvcnBvcmF0aW5nIFdpa2lwZWRpYSBpbnRvIHlvdXIgY2xhc3M/IFdlJ3ZlIGZvdW5kIHRoYXQgdGhlc2UgYXNzaWdubWVudHMgd29yayB3ZWxsLCBidXQgdGhleSBhcmVuJ3QgdGhlIG9ubHkgd2F5IHRvIGRvIGl0LiBHZXQgaW4gdG91Y2gsIGFuZCB3ZSBjYW4gdGFsayB0aGluZ3MgdGhyb3VnaDogPGEgc3R5bGU9J2NvbG9yOiM1MDVhN2Y7JyBocmVmPSdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZyc+Y29udGFjdEB3aWtpZWR1Lm9yZzwvYT4uXCJcblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBcbiAgICBjcmVhdGVfdXNlcjpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSB1c2VyIGFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBlbnJvbGw6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBjb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgb25saW5lIHRyYWluaW5nJ1xuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBpbnRyb2R1Y2VfYW1iYXNzYWRvcnM6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaW50cm9kdWNlX2FtYmFzc2Fkb3JzJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgICMgaW5jbHVkZV9jb21wbGV0aW9uOlxuICAgICMgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgIyAgIGlkOiAnaW5jbHVkZV9jb21wbGV0aW9uJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAjICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgdHJhaW5pbmdfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIGJlIGdyYWRlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB0cmFpbmluZ19ub3RfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ub3RfZ3JhZGVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgdHJhaW5pbmcgd2lsbCBub3QgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gIGdldHRpbmdfc3RhcnRlZDogXG4gICAgY3JpdGlxdWVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY3JpdGlxdWVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyaXRpcXVlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgICBhZGRfdG9fYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnYWRkX3RvX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGNvcHlfZWRpdF9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5X2VkaXRfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBpbGx1c3RyYXRlX2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2lsbHVzdHJhdGVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbGx1c3RyYXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICBcblxuICBjaG9vc2luZ19hcnRpY2xlczogXG4gICAgcHJlcGFyZV9saXN0OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdwcmVwYXJlX2xpc3QnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBcbiAgICBzdHVkZW50c19leHBsb3JlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICByZXF1ZXN0X2hlbHA6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlcXVlc3RfaGVscCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBvciBldmF1bGF0aW5nIGFydGljbGUgY2hvaWNlcz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGNvbmRpdGlvbmFsX2xhYmVsOiBcbiAgICAgICAgcHJlcGFyZV9saXN0OiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIGFydGljbGVzP1wiXG4gICAgICAgIHN0dWRlbnRzX2V4cGxvcmU6IFwiV291bGQgeW91IGxpa2UgaGVscCBldmFsdWF0aW5nIHN0dWRlbnQgY2hvaWNlcz9cIlxuICAgICAgXG5cblxuICByZXNlYXJjaF9wbGFubmluZzogXG4gICAgY3JlYXRlX291dGxpbmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NyZWF0ZV9vdXRsaW5lJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RyYWRpdGlvbmFsIG91dGxpbmUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIlRyYWRpdGlvbmFsIG91dGxpbmVcIlxuICAgICAgICBjb250ZW50OiBcIkZvciBlYWNoIGFydGljbGUsIHRoZSBzdHVkZW50cyBjcmVhdGUgYW4gb3V0bGluZSB0aGF0IHJlZmxlY3RzIHRoZSBpbXByb3ZlbWVudHMgdGhleSBwbGFuIHRvIG1ha2UsIGFuZCB0aGVuIHBvc3QgaXQgdG8gdGhlIGFydGljbGUncyB0YWxrIHBhZ2UuIFRoaXMgaXMgYSByZWxhdGl2ZWx5IGVhc3kgd2F5IHRvIGdldCBzdGFydGVkLlwiXG4gICAgXG4gICAgd3JpdGVfbGVhZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd3JpdGVfbGVhZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnV2lraXBlZGlhIGxlYWQgc2VjdGlvbidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogXCJXaWtpcGVkaWEgbGVhZCBzZWN0aW9uXCJcbiAgICAgICAgY29udGVudDpcbiAgICAgICAgICBcIjxwPkZvciBlYWNoIGFydGljbGUsIHRoZSBzdHVkZW50cyBjcmVhdGUgYSB3ZWxsLWJhbGFuY2VkIHN1bW1hcnkgb2YgaXRzIGZ1dHVyZSBzdGF0ZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24uIFRoZSBpZGVhbCBsZWFkIHNlY3Rpb24gZXhlbXBsaWZpZXMgV2lraXBlZGlhJ3Mgc3VtbWFyeSBzdHlsZSBvZiB3cml0aW5nOiBpdCBiZWdpbnMgd2l0aCBhIHNpbmdsZSBzZW50ZW5jZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwbGFjZXMgaXQgaW4gY29udGV4dCwgYW5kIHRoZW4g4oCUIGluIG9uZSB0byBmb3VyIHBhcmFncmFwaHMsIGRlcGVuZGluZyBvbiB0aGUgYXJ0aWNsZSdzIHNpemUg4oCUIGl0IG9mZmVycyBhIGNvbmNpc2Ugc3VtbWFyeSBvZiB0b3BpYy4gQSBnb29kIGxlYWQgc2VjdGlvbiBzaG91bGQgcmVmbGVjdCB0aGUgbWFpbiB0b3BpY3MgYW5kIGJhbGFuY2Ugb2YgY292ZXJhZ2Ugb3ZlciB0aGUgd2hvbGUgYXJ0aWNsZS48L3A+XG4gICAgICAgICAgPHA+T3V0bGluaW5nIGFuIGFydGljbGUgdGhpcyB3YXkgaXMgYSBtb3JlIGNoYWxsZW5naW5nIGFzc2lnbm1lbnQg4oCUIGFuZCB3aWxsIHJlcXVpcmUgbW9yZSB3b3JrIHRvIGV2YWx1YXRlIGFuZCBwcm92aWRlIGZlZWRiYWNrIGZvci4gSG93ZXZlciwgaXQgY2FuIGJlIG1vcmUgZWZmZWN0aXZlIGZvciB0ZWFjaGluZyB0aGUgcHJvY2VzcyBvZiByZXNlYXJjaCwgd3JpdGluZywgYW5kIHJldmlzaW9uLiBTdHVkZW50cyB3aWxsIHJldHVybiB0byB0aGlzIGxlYWQgc2VjdGlvbiBhcyB0aGV5IGdvLCB0byBndWlkZSB0aGVpciB3cml0aW5nIGFuZCB0byByZXZpc2UgaXQgdG8gcmVmbGVjdCB0aGVpciBpbXByb3ZlZCB1bmRlcnN0YW5kaW5nIG9mIHRoZSB0b3BpYyBhcyB0aGVpciByZXNlYXJjaCBwcm9ncmVzc2VzLiBUaGV5IHdpbGwgdGFja2xlIFdpa2lwZWRpYSdzIGVuY3ljbG9wZWRpYyBzdHlsZSBlYXJseSBvbiwgYW5kIHRoZWlyIG91dGxpbmUgZWZmb3J0cyB3aWxsIGJlIGFuIGludGVncmFsIHBhcnQgb2YgdGhlaXIgZmluYWwgd29yay48L3A+XCJcbiAgICAgICAgXG5cblxuICBkcmFmdHNfbWFpbnNwYWNlOiBcbiAgICB3b3JrX2xpdmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3dvcmtfbGl2ZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXb3JrIGxpdmUgZnJvbSB0aGUgc3RhcnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICBcbiAgICBzYW5kYm94OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzYW5kYm94J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RyYWZ0IGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgXG5cbiAgcGVlcl9mZWVkYmFjazogXG4gICAgcGVlcl9yZXZpZXdzOlxuICAgICAgdHlwZTogJ3JhZGlvR3JvdXAnXG4gICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgIGxhYmVsOiAnJ1xuICAgICAgdmFsdWU6ICd0d28nXG4gICAgICBzZWxlY3RlZDogMVxuICAgICAgb3ZlcnZpZXdMYWJlbDogJ1R3byBwZWVyIHJldmlldydcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAwXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzEnXG4gICAgICAgICAgdmFsdWU6ICdvbmUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ09uZSBwZWVyIHJldmlldydcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDFcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMidcbiAgICAgICAgICB2YWx1ZTogJ3R3bydcbiAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUd28gcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAyXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzMnXG4gICAgICAgICAgdmFsdWU6ICd0aHJlZSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnVGhyZWUgcGVlciByZXZpZXcnXG5cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDNcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNCdcbiAgICAgICAgICB2YWx1ZTogJ2ZvdXInXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ0ZvdXIgcGVlciByZXZpZXcnXG5cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDRcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNSdcbiAgICAgICAgICB2YWx1ZTogJ2ZpdmUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ0ZpdmUgcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICBcbiAgXG5cbiAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czogXG4gICAgY2xhc3NfYmxvZzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfYmxvZydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NsYXNzIGJsb2cgb3IgZGlzY3Vzc2lvbidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogJ0NsYXNzIGJsb2cgb3IgY2xhc3MgZGlzY3Vzc2lvbidcbiAgICAgICAgY29udGVudDogJ1N0dWRlbnRzIGtlZXAgYSBydW5uaW5nIGJsb2cgYWJvdXQgdGhlaXIgZXhwZXJpZW5jZXMuIEdpdmluZyB0aGVtIHByb21wdHMgZXZlcnkgd2VlayBvciB0d28sIHN1Y2ggYXMg4oCcVG8gd2hhdCBleHRlbnQgYXJlIHRoZSBlZGl0b3JzIG9uIFdpa2lwZWRpYSBhIHNlbGYtc2VsZWN0aW5nIGdyb3VwIGFuZCB3aHk/4oCdIHdpbGwgaGVscCB0aGVtIHRoaW5rIGFib3V0IHRoZSBsYXJnZXIgaXNzdWVzIHN1cnJvdW5kaW5nIHRoaXMgb25saW5lIGVuY3ljbG9wZWRpYSBjb21tdW5pdHkuIEl0IHdpbGwgYWxzbyBnaXZlIHlvdSBtYXRlcmlhbCBib3RoIG9uIHRoZSB3aWtpIGFuZCBvZmYgdGhlIHdpa2kgdG8gZ3JhZGUuIElmIHlvdSBoYXZlIHRpbWUgaW4gY2xhc3MsIHRoZXNlIGRpc2N1c3Npb25zIGNhbiBiZSBwYXJ0aWN1bGFybHkgY29uc3RydWN0aXZlIGluIHBlcnNvbi4nXG4gICAgICBcbiAgICBjbGFzc19wcmVzZW50YXRpb246XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX3ByZXNlbnRhdGlvbidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luLWNsYXNzIHByZXNlbnRhdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIFdpa2lwZWRpYSB3b3JrJ1xuICAgICAgICBjb250ZW50OiBcIkVhY2ggc3R1ZGVudCBvciBncm91cCBwcmVwYXJlcyBhIHNob3J0IHByZXNlbnRhdGlvbiBmb3IgdGhlIGNsYXNzLCBleHBsYWluaW5nIHdoYXQgdGhleSB3b3JrZWQgb24sIHdoYXQgd2VudCB3ZWxsIGFuZCB3aGF0IGRpZG4ndCwgYW5kIHdoYXQgdGhleSBsZWFybmVkLiBUaGVzZSBwcmVzZW50YXRpb25zIGNhbiBtYWtlIGV4Y2VsbGVudCBmb2RkZXIgZm9yIGNsYXNzIGRpc2N1c3Npb25zIHRvIHJlaW5mb3JjZSB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIGdvYWxzLlwiXG4gICAgICBcbiAgICByZWZsZWN0aXZlX2Vzc2F5OlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdyZWZsZWN0aXZlX2Vzc2F5J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICAgICBjb250ZW50OiBcIkFzayBzdHVkZW50cyB0byB3cml0ZSBhIHNob3J0IHJlZmxlY3RpdmUgZXNzYXkgb24gdGhlaXIgZXhwZXJpZW5jZXMgdXNpbmcgV2lraXBlZGlhLiBUaGlzIHdvcmtzIHdlbGwgZm9yIGJvdGggc2hvcnQgYW5kIGxvbmcgV2lraXBlZGlhIHByb2plY3RzLiBBbiBpbnRlcmVzdGluZyBpdGVyYXRpb24gb2YgdGhpcyBpcyB0byBoYXZlIHN0dWRlbnRzIHdyaXRlIGEgc2hvcnQgdmVyc2lvbiBvZiB0aGUgZXNzYXkgYmVmb3JlIHRoZXkgYmVnaW4gZWRpdGluZyBXaWtpcGVkaWEsIG91dGxpbmluZyB0aGVpciBleHBlY3RhdGlvbnMsIGFuZCB0aGVuIGhhdmUgdGhlbSByZWZsZWN0IG9uIHdoZXRoZXIgb3Igbm90IHRoZXkgbWV0IHRob3NlIGV4cGVjdGF0aW9ucyBkdXJpbmcgdGhlIGFzc2lnbm1lbnQuXCJcbiAgICAgIFxuICAgIHBvcnRmb2xpbzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncG9ydGZvbGlvJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgICBjb250ZW50OiBcIlN0dWRlbnRzIG9yZ2FuaXplIHRoZWlyIFdpa2lwZWRpYSB3b3JrIGludG8gYSBwb3J0Zm9saW8sIGluY2x1ZGluZyBhIG5hcnJhdGl2ZSBvZiB0aGUgY29udHJpYnV0aW9ucyB0aGV5IG1hZGUg4oCUIGFuZCBob3cgdGhleSB3ZXJlIHJlY2VpdmVkLCBhbmQgcG9zc2libHkgY2hhbmdlZCwgYnkgb3RoZXIgV2lraXBlZGlhbnMg4oCUIGFuZCBsaW5rcyB0byB0aGVpciBrZXkgZWRpdHMuIENvbXBvc2luZyB0aGlzIHBvcnRmb2xpbyB3aWxsIGhlbHAgc3R1ZGVudHMgdGhpbmsgbW9yZSBkZWVwbHkgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2VzLCBhbmQgYWxzbyBwcm92aWRlcyBhIGxlbnMgdGhyb3VnaCB3aGljaCB0byB1bmRlcnN0YW5kIOKAlCBhbmQgZ3JhZGUg4oCUIHRoZWlyIHdvcmsuXCJcbiAgICBcbiAgICBvcmlnaW5hbF9wYXBlcjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnb3JpZ2luYWxfcGFwZXInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdPcmlnaW5hbCBhbmFseXRpY2FsIHBhcGVyJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICAgIGNvbnRlbnQ6IFwiSW4gY291cnNlcyB0aGF0IGVtcGhhc2l6ZSB0cmFkaXRpb25hbCByZXNlYXJjaCBza2lsbHMgYW5kIHRoZSBkZXZlbG9wbWVudCBvZiBvcmlnaW5hbCBpZGVhcyB0aHJvdWdoIGEgdGVybSBwYXBlciwgV2lraXBlZGlhJ3MgcG9saWN5IG9mIFxcXCJubyBvcmlnaW5hbCByZXNlYXJjaFxcXCIgbWF5IGJlIHRvbyByZXN0cmljdGl2ZS4gTWFueSBpbnN0cnVjdG9ycyBwYWlyIFdpa2lwZWRpYSB3cml0aW5nIHdpdGggYSBjb21wbGVtZW50YXJ5IGFuYWx5dGljYWwgcGFwZXI7IHN0dWRlbnRz4oCZIFdpa2lwZWRpYSBhcnRpY2xlcyBzZXJ2ZSBhcyBhIGxpdGVyYXR1cmUgcmV2aWV3LCBhbmQgdGhlIHN0dWRlbnRzIGdvIG9uIHRvIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgaW4gdGhlIG9mZmxpbmUgYW5hbHl0aWNhbCBwYXBlci5cIlxuICAgIFxuICBkeWs6XG4gICAgZHlrOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdkeWsnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEaWQgWW91IEtub3c/J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gIGdhOiBcbiAgICBnYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZ2EnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdHb29kIEFydGljbGUgbm9taW5hdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBcblxuICAjIGdyYWRpbmdfbXVsdGltZWRpYTogXG4gICMgICBjb21wbGV0ZV9tdWx0aW1lZGlhOlxuICAjICAgICB0eXBlOiAncGVyY2VudCdcbiAgIyAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgIyAgICAgaWQ6ICdjb21wbGV0ZV9tdWx0aW1lZGlhJ1xuICAjICAgICB2YWx1ZTogNTBcbiAgIyAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgIyAgICAgY29udGluZ2VudFVwb246IFtdXG4gIFxuICAjIGdyYWRpbmdfY29weWVkaXQ6IFxuICAjICAgY29tcGxldGVfY29weWVkaXQ6XG4gICMgICAgIHR5cGU6ICdwZXJjZW50J1xuICAjICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAjICAgICBpZDogJ29tcGxldGVfY29weWVkaXQnXG4gICMgICAgIHZhbHVlOiA1MFxuICAjICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAjICAgICBjb250aW5nZW50VXBvbjogW11cblxuXG4gIGdyYWRpbmc6IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICBjb21wbGV0ZV90cmFpbmluZzpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiBXaWtpcGVkaWEgdHJhaW5pbmcnXG4gICAgICAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgICAgIHZhbHVlOiA1XG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgICAgJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgICAgXVxuXG4gICAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0Vhcmx5IFdpa2lwZWRpYSBleGVyY2lzZXMnXG4gICAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgICB2YWx1ZTogMTUgICBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAgIG91dGxpbmVfcXVhbGl0eTpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGlkOiAnb3V0bGluZV9xdWFsaXR5J1xuICAgICAgICBsYWJlbDogJ1F1YWxpdHkgb2YgYmlibGlvZ3JhcGh5IGFuZCBvdXRsaW5lJ1xuICAgICAgICB2YWx1ZTogMTAgICBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAgIHBlZXJfcmV2aWV3czpcbiAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ1BlZXIgcmV2aWV3cyBhbmQgY29sbGFib3JhdGlvbiB3aXRoIGNsYXNzbWF0ZXMnXG4gICAgICAgIHZhbHVlOiAxMCAgIFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICAgY29udHJpYnV0aW9uX3F1YWxpdHk6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50JyBcbiAgICAgICAgaWQ6ICdjb250cmlidXRpb25fcXVhbGl0eSdcbiAgICAgICAgbGFiZWw6ICdRdWFsaXR5IG9mIHlvdXIgbWFpbiBXaWtpcGVkaWEgY29udHJpYnV0aW9ucydcbiAgICAgICAgdmFsdWU6IDUwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOlxuICAgICAgICB0eXBlOiAncGVyY2VudCcgXG4gICAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgICAgbGFiZWw6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgICB2YWx1ZTogMTBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgICAnY2xhc3NfYmxvZydcbiAgICAgICAgICAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgICAgICdyZWZsZWN0aXZlX2Vzc2F5J1xuICAgICAgICAgICdwb3J0Zm9saW8nXG4gICAgICAgICAgJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgICBdXG5cbiAgICBjb3B5ZWRpdDpcbiAgICAgIGNvcHllZGl0OlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgICAgdmFsdWU6IDEwMFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdjb3B5ZWRpdCdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgXVxuICAgIG11bHRpbWVkaWE6XG4gICAgICBtdWx0aW1lZGlhOlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgICB2YWx1ZTogMTAwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ211bHRpbWVkaWEnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgIF1cblxuXG5cblxuICAgIGdyYWRpbmdfc2VsZWN0aW9uOlxuICAgICAgbGFiZWw6ICdHcmFkaW5nIGJhc2VkIG9uOidcbiAgICAgIGlkOiAnZ3JhZGluZ19zZWxlY3Rpb24nXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlbmRlckluT3V0cHV0OiBmYWxzZVxuICAgICAgb3B0aW9uczogXG4gICAgICAgIHBlcmNlbnQ6IFxuICAgICAgICAgIGxhYmVsOiAnUGVyY2VudGFnZSdcbiAgICAgICAgICB2YWx1ZTogJ3BlcmNlbnQnXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgcG9pbnRzOlxuICAgICAgICAgIGxhYmVsOiAnUG9pbnRzJ1xuICAgICAgICAgIHZhbHVlOiAncG9pbnRzJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuXG5cbiAgb3ZlcnZpZXc6IFxuICAgIGxlYXJuaW5nX2Vzc2VudGlhbHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBlc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdsZWFybmluZ19lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuXG4gICAgY2hvb3NpbmdfYXJ0aWNsZXM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIHJlc2VhcmNoX3BsYW5uaW5nOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIGRyYWZ0c19tYWluc3BhY2U6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICBpZDogJ2RyYWZ0c19tYWluc3BhY2UnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIHBlZXJfZmVlZGJhY2s6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUGVlciBGZWVkYmFjaydcbiAgICAgIGlkOiAncGVlcl9mZWVkYmFjaydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG4gICAgXG4gICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgaWQ6ICdzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzJ1xuICAgICAgdmFsdWU6ICcnXG5cbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICAgIHdpemFyZF9lbmRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICBjb3Vyc2VfZGV0YWlsczpcbiAgICBkZXNjcmlwdGlvbjogJydcbiAgICB0ZXJtX3N0YXJ0X2RhdGU6ICcnXG4gICAgdGVybV9lbmRfZGF0ZTogJydcbiAgICBzdGFydF9kYXRlOiAnJ1xuICAgIHN0YXJ0X3dlZWtvZl9kYXRlOiAnJ1xuICAgIGVuZF93ZWVrb2ZfZGF0ZTogJydcbiAgICBlbmRfZGF0ZTogJydcbiAgICB3ZWVrZGF5c19zZWxlY3RlZDogW2ZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlLGZhbHNlXVxuICAgIGxlbmd0aF9pbl93ZWVrczogMTZcbiAgICBhc3NpZ25tZW50czogW11cblxuXG5cbiAgICBcblxuXG5cblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZFN0ZXBJbnB1dHNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgVmlld0hlbHBlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoICdsaW5rJywgKCB0ZXh0LCB1cmwgKSAtPlxuXG4gIHRleHQgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHRleHQgKVxuICB1cmwgID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB1cmwgKVxuXG4gIHJlc3VsdCA9ICc8YSBocmVmPVwiJyArIHVybCArICdcIj4nICsgdGV4dCArICc8L2E+J1xuXG4gIHJldHVybiBuZXcgSGFuZGxlYmFycy5TYWZlU3RyaW5nKCByZXN1bHQgKVxuKVxuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCgnY291cnNlRGV0YWlscycsICdzdXAyJykiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIC0gQXBwbGljYXRpb24gSW5pdGl0aWFsaXplclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4vYXBwJylcblxuXG4kIC0+XG5cbiAgIyBJbml0aWFsaXplIEFwcGxpY2F0aW9uXG4gIGFwcGxpY2F0aW9uLmluaXRpYWxpemUoKVxuXG4gICMgU3RhcnQgQmFja2JvbmUgcm91dGVyXG4gIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKVxuXG5cbiAgIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5Nb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9zdXBlcnMvTW9kZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBNb2RlbCBleHRlbmRzIE1vZGVsXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBJTkhFUklURUQgLyBPVkVSUklERVNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBFVkVOVCBIQU5ETEVSU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgLSBSb3V0ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBSb3V0ZXNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFxuICByb3V0ZXM6XG4gICAgJycgOiAnaG9tZSdcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEhhbmRsZXJzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBob21lOiAtPlxuICAgIGlmICQoJyNhcHAnKS5sZW5ndGggPiAwXG5cbiAgICAgIEBjdXJyZW50V2lraVVzZXIgPSAkKCAnI2FwcCcgKS5hdHRyKCdkYXRhLXdpa2l1c2VyJylcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snaW50cm8nXVsnaW5zdHJ1Y3Rvcl91c2VybmFtZSddWyd2YWx1ZSddID0gQGN1cnJlbnRXaWtpVXNlclxuXG4gICAgICAkKCAnI2FwcCcgKS5odG1sKGFwcGxpY2F0aW9uLmhvbWVWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwJylcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwJykpXG5cbiAgICAgIGVsc2UgaWYgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcGlkJylcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG9JZCcsIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXBpZCcpKVxuXG5cbiAgICBlbHNlIGlmICQoJyNsb2dpbicpLmxlbmd0aCA+IDBcblxuICAgICAgKCQgJyNsb2dpbicpLmh0bWwoYXBwbGljYXRpb24ubG9naW5WaWV3LnJlbmRlcigpLmVsKVxuXG4gICNcbiAgIyBVdGlsaXRpZXNcbiAgI1xuXG4gIGdldFBhcmFtZXRlckJ5TmFtZTogKG5hbWUpIC0+XG5cbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpXG5cbiAgICByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpXG5cbiAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpXG5cbiAgICAoaWYgbm90IHJlc3VsdHM/IHRoZW4gXCJcIiBlbHNlIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpKVxuXG5cbiIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEhvbWUgUGFnZSBUZW1wbGF0ZVxcbi0tPlxcblxcbjwhLS0gTUFJTiBBUFAgQ09OVEVOVCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXBzIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5jb250ZW50IC0tPlxcblxcblwiO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtX19zdWJ0aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgICAgICAgIDxwIGNsYXNzPVxcXCJsYXJnZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxvZ2luX2luc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubG9naW5faW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblxcblxcbiAgPCEtLSBTVEVQUyBNQUlOIENPTlRBSU5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXBzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcCBzdGVwLS1maXJzdCBzdGVwLS1sb2dpblxcXCI+XFxuICAgIFxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICAgICAgICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgICAgICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubG9naW5faW5zdHJ1Y3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcblxcbiAgICAgICAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuICAgICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlXFxcIiBpZD1cXFwibG9naW5CdXR0b25cXFwiIGhyZWY9XFxcIi9hdXRoL21lZGlhd2lraVxcXCI+XFxuICAgICAgICAgICAgTG9naW4gd2l0aCBXaWtpcGVkaWFcXG4gICAgICAgICAgPC9hPlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1hY3Rpb25zIC0tPlxcblxcblxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJkb3Qgc3RlcC1uYXYtaW5kaWNhdG9yc19faXRlbSBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzQWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaGFzVmlzaXRlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgZGF0YS1uYXYtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcFRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj4qPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJhY3RpdmVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcInZpc2l0ZWRcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImluYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm8tYXJyb3cgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogU3RlcCBOYXZpZ2F0aW9uIFxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBOQVYgRE9UIElORElDQVRPUlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtaW5kaWNhdG9ycyBoaWRkZW5cXFwiPlxcblxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnN0ZXBzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWluZGljYXRvcnMgLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIE5BViBCVVRUT05TIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnNcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9ucy0tbm9ybWFsXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tcHJldiBwcmV2IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucHJldkluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiYXJyb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tcmlnaHQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tbGVmdFxcXCI+PC9kaXY+XFxuICAgICAgPC9zcGFuPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucHJldlRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5wcmV2VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICA8L2E+XFxuXFxuICAgIDxhIGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLW5leHQgbmV4dCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLm5leHRJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzTGFzdFN0ZXAsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm5leHRUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubmV4dFRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiYXJyb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tbGVmdDo1cHg7XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1yaWdodFxcXCI+PC9kaXY+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG5cXG5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnMtLWVkaXRcXFwiPlxcbiAgICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdl9fYnV0dG9uLS1leGl0LWVkaXQgY29uZmlybSBleGl0LWVkaXRcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuYmFja1RvT3ZlcnZpZXdUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuYmFja1RvT3ZlcnZpZXdUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1idXR0b25zIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtX19zdWJ0aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFxcbiAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgXFxuICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zZWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9kaXY+XFxuICAgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuICA8IS0tIElOVFJPIFNURVAgRk9STSBBUkVBIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj5cXG4gICAgPCEtLSBmb3JtIGZpZWxkcyAtLT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taW5uZXIgLS0+XFxuXFxuXFxuICA8IS0tIERBVEVTIE1PRFVMRSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1kYXRlc1xcXCI+XFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWRhdGVzIC0tPlxcblxcbiAgPGRpdiBjbGFzcz0nZm9ybS1jb250YWluZXIgY3VzdG9tLWlucHV0Jz5cXG5cXG4gICAgPGZvcm0gaWQ9J2NvdXJzZUxlbmd0aCcgb25pbnB1dD0nb3V0LnZhbHVlID0gcGFyc2VJbnQoY291cnNlTGVuZ3RoLnZhbHVlKTsgb3V0Mi52YWx1ZSA9IHBhcnNlSW50KGNvdXJzZUxlbmd0aC52YWx1ZSk7JyBvbnN1Ym1pdD0ncmV0dXJuIGZhbHNlJz5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0ndGVybVN0YXJ0RGF0ZSc+Q291cnNlIGJlZ2luczwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgaWQ9J3Rlcm1TdGFydERhdGUnIG5hbWU9J3Rlcm1TdGFydERhdGUnIHR5cGU9J2RhdGUnPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWwgZm9yPSd0ZXJtRW5kRGF0ZSc+Q291cnNlIGVuZHM8L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IGlkPSd0ZXJtRW5kRGF0ZScgbmFtZT0ndGVybUVuZERhdGUnIHR5cGU9J2RhdGUnPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VTdGFydERhdGUnPkFzc2lnbm1lbnQgc3RhcnRzPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0nY291cnNlU3RhcnREYXRlJyBuYW1lPSdjb3Vyc2VTdGFydERhdGUnIHR5cGU9J2RhdGUnPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VFbmREYXRlJz5Bc3NpZ25tZW50IGVuZHM8L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IGlkPSdjb3Vyc2VFbmREYXRlJyBuYW1lPSdjb3Vyc2VFbmREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXIgb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyLS1ibGFja291dC1kYXRlcyc+XFxuICAgICAgICA8bGFiZWwgZm9yPSdibGFja291dERhdGVzJz5ObyBjbGFzcyBtZWV0aW5nIG9uPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0nYmxhY2tvdXREYXRlcycgbmFtZT0nYmxhY2tvdXREYXRlcycgdHlwZT0ndGV4dCc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT1cXFwiZGlzcGxheTpub25lO1xcXCI+XFxuICAgICAgICA8bGFiZWwgZm9yPSdzdGFydFdlZWtPZkRhdGUnPlN0YXJ0IHdlZWsgb2Y8L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IGlkPSdzdGFydFdlZWtPZkRhdGUnIG5hbWU9J3N0YXJ0V2Vla09mRGF0ZScgdHlwZT0nZGF0ZSc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT1cXFwiZGlzcGxheTpub25lO1xcXCI+XFxuICAgICAgICA8bGFiZWwgZm9yPSdlbmRXZWVrT2ZEYXRlJz5FbmQgd2VlayBvZjwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgaWQ9J2VuZFdlZWtPZkRhdGUnIG5hbWU9J2VuZFdlZWtPZkRhdGUnIHR5cGU9J2RhdGUnPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VMZW5ndGgnIHN0eWxlPVxcXCJ2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7XFxcIj5Db3Vyc2UgTGVuZ3RoPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBkZWZhdWx0VmFsdWU9JzE2JyBpZD0nY0xlbmd0aCcgbWF4PScxNicgbWluPSc2JyBuYW1lPSdjb3Vyc2VMZW5ndGgnIHN0ZXA9JzEnIHR5cGU9J3JhbmdlJyB2YWx1ZT0nMTYnIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmU7XFxcIj5cXG4gICAgICAgIDxvdXRwdXQgbmFtZT0nb3V0Mic+MTYgd2Vla3M8L291dHB1dD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtY29udGFpbmVyJz5cXG4gICAgICAgIDxsYWJlbD5DbGFzcyBtZWV0cyBvbjogPC9sYWJlbD48YnIvPjxici8+XFxuICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J21vbmRheScgbmFtZT0nTW9uZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzAnPlxcbiAgICAgICAgICA8bGFiZWwgZm9yPSdtb25kYXknPk1vbmRheXM8L2xhYmVsPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3R1ZXNkYXknIG5hbWU9J1R1ZXNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMSc+XFxuICAgICAgICAgIDxsYWJlbCBmb3I9J3R1ZXNkYXknPlR1ZXNkYXlzPC9sYWJlbD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd3ZWRuZXNkYXknIG5hbWU9J1dlZG5lc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScyJz5cXG4gICAgICAgICAgPGxhYmVsIGZvcj0nd2VkbmVzZGF5Jz5XZWRuZXNkYXlzPC9sYWJlbD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd0aHVyc2RheScgbmFtZT0nVGh1cnNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMyc+XFxuICAgICAgICAgIDxsYWJlbCBmb3I9J3RodXJzZGF5Jz5UaHVyc2RheXM8L2xhYmVsPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J2ZyaWRheScgbmFtZT0nRnJpZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzQnPlxcbiAgICAgICAgICA8bGFiZWwgZm9yPSdmcmlkYXknPkZyaWRheXM8L2xhYmVsPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3NhdHVyZGF5JyBuYW1lPSdTYXR1cmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSc1Jz5cXG4gICAgICAgICAgPGxhYmVsIGZvcj0nc2F0dXJkYXknPlNhdHVyZGF5czwvbGFiZWw+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nc3VuZGF5JyBuYW1lPSdTdW5kYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNic+XFxuICAgICAgICAgIDxsYWJlbCBmb3I9J3N1bmRheSc+U3VuZGF5czwvbGFiZWw+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1yZWFkb3V0LWhlYWRlcic+XFxuICAgICAgICA8ZGl2IGNsYXNzPSdyZWFkb3V0Jz5cXG4gICAgICAgICAgPG91dHB1dCBmb3I9J2NvdXJzZUxlbmd0aCcgaWQ9J2NvdXJzZUxlbmd0aFJlYWRvdXQnIG5hbWU9J291dCc+MTYgd2Vla3M8L291dHB1dD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Zvcm0+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm91dHB1dC1jb250YWluZXJcXFwiPjwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicHJldmlldy1jb250YWluZXJcXFwiPjwvZGl2PlxcblxcbiAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcIm5vLWVkaXQtbW9kZVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWUgaW5hY3RpdmVcXFwiIGlkPVxcXCJiZWdpbkJ1dHRvblxcXCIgaHJlZj1cXFwiXFxcIj5cXG4gICAgICAgIFN0YXJ0IGRlc2lnbmluZyBteSBhc3NpZ25tZW50XFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZWRpdC1tb2RlLW9ubHlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGV4aXQtZWRpdFxcXCIgaHJlZj1cXFwiI1xcXCI+XFxuICAgICAgICBCYWNrXFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFyayBzdGVwLWluZm9fX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5mb1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbmZvVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cCBjbGFzcz1cXFwibGFyZ2Ugc3RlcC1pbmZvX19pbnRyb1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gSEVBREVSIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIENPTlRFTlQgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9fY29udGVudCAtLT5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBzdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXJcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlciAtLT5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYWluIEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIEZPUk0gOiBMZWZ0IFNpZGUgb2YgU3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWxheW91dFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1sYXlvdXRfX2lubmVyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgICBcXG4gICAgICA8IS0tIFNURVAgRk9STSBJTk5FUiBDT05URU5UIC0tPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLWlubmVyXFxcIj5cXG4gICAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICAgIDxhIGNsYXNzPVxcXCJtYWluLWxvZ29cXFwiIGhyZWY9XFxcImh0dHA6Ly93aWtpZWR1Lm9yZ1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIHRpdGxlPVxcXCJ3aWtpZWR1Lm9yZ1xcXCI+V0lLSUVEVS5PUkc8L2E+XFxuXFxuICAgIDwhLS0gU1RFUCBJTkZPIElOTkVSIC0tPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8td3JhcHBlclxcXCI+XFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbmZvVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFxcbiAgICAgIDwhLS0gSU5GTyBTRUNUSU9OUyAtLT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG4gICAgXFxuXFxuXFxuICAgIFxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxwPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9wPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGkgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLWdyaWRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRleHQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRleHQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIDogPHNwYW4gY2xhc3M9XFxcInN0YXJzIHN0YXJzLS1cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8gc3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrIFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkFzc2lnbm1lbnQgdHlwZTogXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGV4dFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZGVzY3JpcHRpb24sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk1pbmltdW0gdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm1pbl90aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubWluX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5SZWNvbW1lbmRlZCB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucmVjX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5yZWNfdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QmVzdCBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5iZXN0X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Ob3QgYXBwcm9wcmlhdGUgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubm90X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5MZWFybmluZyBPYmplY3RpdmVzPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubGVhcm5pbmdfb2JqZWN0aXZlcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5jb250ZW50KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5jb250ZW50OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICBcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kaXNhYmxlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJjaGVjay1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm90LWVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGRhdGEtZXhjbHVzaXZlPVxcXCJ0cnVlXFxcIiBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS10ZXh0X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXBlcmNlbnRcXFwiIGRhdGEtcGF0aHdheS1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBhdGh3YXlJZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tcGVyY2VudF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1jb250YWluZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpY29uIGljb24tLXBlcmNlbnRcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpY29uIGljb24tLXBvaW50c1xcXCI+cG9pbnRzPC9kaXY+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG1heGxlbmd0aD1cXFwiM1xcXCIgLz5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdCBjdXN0b20taW5wdXQtYWNjb3JkaWFuXFxcIj5cXG4gIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+W2VkaXRdPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19pbm5lciBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19oZWFkZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICBcXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2NvbnRlbnRcXFwiPlxcbiAgICA8dWw+XFxuICAgICAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmFzc2lnbm1lbnRzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTcsIHByb2dyYW0xNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC91bD5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8bGk+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKSlcbiAgICArIFwiPC9saT5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWxpbmtcXFwiPlxcbiAgPGxhYmVsPjxhIGhyZWY9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5ocmVmKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiID5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvYT48L2xhYmVsPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvXFxcIj5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyIGN1c3RvbS1pbnB1dC1yYWRpby1pbm5lci0tZ3JvdXBcXFwiPlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI1LCBwcm9ncmFtMjUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uYW1lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVyY2VudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIlxuICAgICsgXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5saW5rKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE5LCBwcm9ncmFtMTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW8pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjEsIHByb2dyYW0yMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0dyb3VwKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFya3VwIGZvciBTdGFydC9FbmQgRGF0ZSBJbnB1dCBNb2R1bGVcXG4tLT5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXMgYXV0by1oZWlnaHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19sYWJlbFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gXCJcbiAgICArIFwiXFxuXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxsaT5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApKVxuICAgICsgXCI8L2xpPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtd3JhcHBlciBoYXMtY29udGVudCBlZGl0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWVkaXQgY3VzdG9tLWlucHV0LWFjY29yZGlhblxcXCI+XFxuICAgIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5bZWRpdF08L2E+XFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXIgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9faGVhZGVyXFxcIj5cXG4gICAgICA8bGFiZWw+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2NvbnRlbnRcXFwiPlxcbiAgICAgIDx1bD5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5hc3NpZ25tZW50cywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvdWw+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgb3Zlci1saW1pdCBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuXFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcblxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9XFxcInBlcmNlbnRcXFwiPjxzcGFuPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuXFxuICAgICAgICAgICAgPGlucHV0IG5hbWU9XFxcImdyYWRpbmctc2VsZWN0aW9uXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgLz5cXG5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZCBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nXFxcIj5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXN1bW1hcnlcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fdG90YWxcXFwiPlxcblxcbiAgICAgIDxoMz5Ub3RhbDwvaDM+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fcGVyY2VudCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzT3ZlckxpbWl0LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG5cXG4gICAgICA8aDMgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX190b3RhbC1udW1iZXJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50b3RhbEdyYWRlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50b3RhbEdyYWRlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjxzcGFuIGNsYXNzPVxcXCJwZXJjZW50LXN5bWJvbFxcXCI+JTwvc3Bhbj48L2gzPlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcbiAgXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb25cXFwiPlxcblxcbiAgICA8aDUgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvbl9fdGl0bGVcXFwiPkdyYWRpbmcgYmFzZWQgb246PC9oNT5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uLWZvcm1cXFwiPlxcblxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC13cmFwcGVyXFxcIj5cXG5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5vcHRpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG5cblxuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIDxici8+XFxuIHwgY291cnNlX25hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY291cnNlX25hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBpbnN0cnVjdG9yX3VzZXJuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmluc3RydWN0b3JfdXNlcm5hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRlYWNoZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBzdWJqZWN0ID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN1YmplY3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBzdGFydF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndpemFyZF9zdGFydF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgZW5kX2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX2VuZF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgaW5zdGl0dXRpb24gPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2Nob29sKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG59fTxici8+XFxuPGJyLz5cXG5cIjtcbiAgaWYgKHN0YWNrMiA9IGhlbHBlcnMuZGVzY3JpcHRpb24pIHsgc3RhY2syID0gc3RhY2syLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2syID0gZGVwdGgwLmRlc2NyaXB0aW9uOyBzdGFjazIgPSB0eXBlb2Ygc3RhY2syID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazIuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazIpXG4gICAgKyBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fRFlLID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0RZSyA9IG5vIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSBub1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxLCBzdGFjazI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyByZXR1cm4gc3RhY2syOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHZcXG4gfCB3YW50X2hlbHBfZmluZGluZ19hcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMSwgc3RhY2syO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgcmV0dXJuIHN0YWNrMjsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiA8YnIvPlxcbiB8IHdhbnRfaGVscF9ldmFsdWF0aW5nX2FydGljbGVzID0geWVzXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8YnIvPlxcblwiXG4gICAgKyBcInt7Y291cnNlIG9wdGlvbnMgPGJyLz5cXG4gfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5keWspLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZHlrKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIDxici8+XFxuIHwgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2EpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZ2EpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiA8YnIvPlxcbn19IDxici8+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5yZW5kZXJJbk91dHB1dCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyByZXR1cm4gc3RhY2sxOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIlXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI9PUdyYWRpbmc9PSA8YnIvPlxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBncmFkaW5nIDxici8+XFxuXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmdyYWRlSXRlbXMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucmVuZGVySW5PdXRwdXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgcmV0dXJuIHN0YWNrMTsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiJVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPT1HcmFkaW5nPT1cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgZ3JhZGluZyBcXG5cIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5ncmFkaW5nKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlc2VhcmNod3JpdGUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPGJyLz59fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29weWVkaXQgYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWRkIHRvIGFuIGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3R9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TZWxlY3QgYXJ0aWNsZSBmcm9tIHN0dWRlbnQgY2hvaWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHJhZnRzX21haW5zcGFjZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zYW5kYm94KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNiwgcHJvZ3JhbTE2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHJhZnRzX21haW5zcGFjZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53b3JrX2xpdmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE4LCBwcm9ncmFtMTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIHwgc2FuZGJveCA9IG5vIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3V0bGluZSBhcyBsZWFkIHNlY3Rpb24gfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gb25lIHBlZXIgcmV2aWV3fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnBlZXJfZmVlZGJhY2spLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVlcl9yZXZpZXdzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9ufX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgQ2xhc3MgcHJlc2VudGF0aW9ucyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgRmluaXNoaW5nIHRvdWNoZXMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luLWNsYXNzIHByZXNlbnRhdGlvbnN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00MChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9SZWZsZWN0aXZlIGVzc2F5fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2lraXBlZGlhIHBvcnRmb2xpb319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQ0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayAxfCAxIHwgV2lraXBlZGlhIGVzc2VudGlhbHMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW50cm8gdG8gV2lraXBlZGlhfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAyIHwgRWRpdGluZyBiYXNpY3MgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSB0aGUgdHJhaW5pbmd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmFjdGljZSBjb21tdW5pY2F0aW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAzIHwgRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDQgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY3JpdGlxdWVfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNvcHlfZWRpdF9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA0IHwgVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvVXNpbmcgc291cmNlcyBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA1fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuYWRkX3RvX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pbGx1c3RyYXRlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTEsIHByb2dyYW0xMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gV2VlayA1fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA1IHwgRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDYgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21waWxlIGEgYmlibGlvZ3JhcGh5fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCA2IHwgRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDcgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5yZXNlYXJjaF9wbGFubmluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jcmVhdGVfb3V0bGluZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTUsIHByb2dyYW0xNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5yZXNlYXJjaF9wbGFubmluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53cml0ZV9sZWFkKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDcgfCBNb3ZpbmcgYXJ0aWNsZXMgdG8gdGhlIG1haW4gc3BhY2UgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA4IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01vdmUgdG8gbWFpbiBzcGFjZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjIsIHByb2dyYW0yMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwYW5kIHlvdXIgYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgOCB8IEJ1aWxkaW5nIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tjbGFzcyB3b3Jrc2hvcH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDkgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMjYsIHByb2dyYW0yNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgOSB8IEdldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Hcm91cCBzdWdnZXN0aW9uc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAxMCB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMzAsIHByb2dyYW0zMCwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDI4LCBwcm9ncmFtMjgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9jb3Vyc2Ugd2VlayB8IDEwIHwgUmVzcG9uZGluZyB0byBmZWVkYmFjayB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDExIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzIsIHByb2dyYW0zMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgfCAxMSB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDM2LCBwcm9ncmFtMzYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgzNCwgcHJvZ3JhbTM0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzOCwgcHJvZ3JhbTM4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZWZsZWN0aXZlX2Vzc2F5KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MCwgcHJvZ3JhbTQwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucG9ydGZvbGlvKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MiwgcHJvZ3JhbTQyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3JpZ2luYWxfcGFwZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQ0LCBwcm9ncmFtNDQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrIHwgMTIgfCBEdWUgZGF0ZSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWxsIHN0dWRlbnRzIGZpbmlzaGVkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2VuZCBvZiBjb3Vyc2Ugd2Vla319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNURU1QQUxURVxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdibHVySGFuZGxlcidcblxuICBtOiAnJ1xuICBkOiAnJ1xuICB5OiAnJ1xuICBkYXRlVmFsdWU6ICcnXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICAkKCdib2R5Jykub24gJ2NsaWNrJywgKGUpID0+XG5cbiAgICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBibHVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgZm9jdXNIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgY2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG4gICAgJHRhcmdldCA9ICgkIGUuY3VycmVudFRhcmdldClcblxuICAgIGlkID0gJHRhcmdldC5hdHRyKCdkYXRhLWRhdGUtaWQnKVxuXG4gICAgdHlwZSA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLXR5cGUnKVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdW3R5cGVdID0gdmFsdWVcblxuICAgIEBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgQGQgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWydkYXknXVxuXG4gICAgQHkgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWyd5ZWFyJ11cblxuICAgIEBkYXRlVmFsdWUgPSBcIiN7QHl9LSN7QG19LSN7QGR9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBAZGF0ZVZhbHVlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdkYXRlOmNoYW5nZScsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoYXNWYWx1ZTogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJ3NlbGVjdCcpLnZhbCgpICE9ICcnXG5cblxuICBjbG9zZUlmTm9WYWx1ZTogLT5cblxuICAgIGlmIEBoYXNWYWx1ZSgpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzVmFsaWQ6IC0+XG4gICAgaXNJdCA9IGZhbHNlXG5cbiAgICBpZiBAbSAhPSAnJyBhbmQgQGQgIT0gJycgYW5kIEB5ICE9ICcnXG4gICAgICBpc0l0ID0gdHJ1ZVxuXG4gICAgcmV0dXJuIGlzSXRcblxuXG5cblxuXG5cbiIsIiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5XaWtpR3JhZGluZ01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicycpXG5cbiNEYXRhXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEdyYWRpbmdJbnB1dFZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgdGVtcGxhdGU6IFdpa2lHcmFkaW5nTW9kdWxlXG5cblxuICBldmVudHM6XG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpbnB1dENoYW5nZUhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgbGFiZWwnIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICdncmFkZTpjaGFuZ2UnIDogJ2dyYWRlQ2hhbmdlSGFuZGxlcidcblxuICBjdXJyZW50VmFsdWVzOiBbXVxuXG5cbiAgdmFsdWVMaW1pdDogMTAwXG5cblxuICBncmFkaW5nU2VsZWN0aW9uRGF0YTogV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddXG5cblxuICBjdXJyZW50VG90YWw6IC0+XG5cbiAgICB0b3RhbCA9IDBcblxuICAgIF8uZWFjaChAY3VycmVudFZhbHVlcywgKHZhbCkgPT5cblxuICAgICAgdG90YWwgKz0gcGFyc2VJbnQodmFsKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIHRvdGFsXG5cblxuXG4gIGdldElucHV0VmFsdWVzOiAtPlxuXG4gICAgdmFsdWVzID0gW11cblxuICAgIEBwYXJlbnRTdGVwVmlldy4kZWwuZmluZCgnaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nKS5lYWNoKC0+XG5cbiAgICAgIGN1clZhbCA9ICgkIHRoaXMpLnZhbCgpXG5cbiAgICAgIGlmIGN1clZhbFxuICAgICAgICBcbiAgICAgICAgdmFsdWVzLnB1c2goY3VyVmFsKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgKCQgdGhpcykudmFsKDApXG5cbiAgICAgICAgdmFsdWVzLnB1c2goMClcblxuXG5cbiAgICApXG5cbiAgICBAY3VycmVudFZhbHVlcyA9IHZhbHVlc1xuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgZ3JhZGVDaGFuZ2VIYW5kbGVyOiAoaWQsIHZhbHVlKSAtPlxuICAgIFxuICAgIEBnZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpXG5cblxuICByYWRpb0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRFbCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJHBhcmVudEdyb3VwID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuXG4gICAgaWYgJHBhcmVudEVsLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBlbHNlXG5cbiAgICAgICRvdGhlclJhZGlvcyA9ICRwYXJlbnRHcm91cC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpLm5vdCgkcGFyZW50RWxbMF0pXG5cbiAgICAgICRvdGhlclJhZGlvcy5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLm9wdGlvbnMsIChvcHQpIC0+XG5cbiAgICAgICAgb3B0LnNlbGVjdGVkID0gZmFsc2VcbiAgICAgICAgXG4gICAgICApXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS5vcHRpb25zWyRpbnB1dEVsLmF0dHIoJ2lkJyldLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10udmFsdWUgPSAkaW5wdXRFbC5hdHRyKCdpZCcpXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICBvdXQgPSB7XG5cbiAgICAgIHRvdGFsR3JhZGU6IEBjdXJyZW50VG90YWwoKVxuXG4gICAgICBpc092ZXJMaW1pdDogQGN1cnJlbnRUb3RhbCgpID4gQHZhbHVlTGltaXRcblxuICAgICAgb3B0aW9uczogQGdyYWRpbmdTZWxlY3Rpb25EYXRhLm9wdGlvbnNcblxuICAgIH1cblxuICAgIHJldHVybiBvdXRcblxuXG5cblxuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Ib21lVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvSG9tZVRlbXBsYXRlLmhicycpXG5cbk91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9XaWtpT3V0cHV0VGVtcGxhdGUuaGJzJylcblxuI1NVQlZJRVdTXG5TdGVwVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBWaWV3JylcblxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5cblN0ZXBOYXZWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcE5hdlZpZXcnKVxuXG5UaW1lbGluZVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9UaW1lbGluZVZpZXcnKVxuXG4jSU5QVVRTXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICBzdGVwRGF0YTogXG5cbiAgICBpbnRybzogYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLmludHJvX3N0ZXBzXG5cbiAgICBwYXRod2F5czogYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLnBhdGh3YXlzXG5cbiAgICBvdXRybzogYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLm91dHJvX3N0ZXBzXG5cblxuICBwYXRod2F5SWRzOiAtPlxuXG4gICAgcmV0dXJuIF8ua2V5cyhAc3RlcERhdGEucGF0aHdheXMpXG5cbiAgc3RlcFZpZXdzOiBbXVxuXG5cbiAgYWxsU3RlcFZpZXdzOlxuXG4gICAgaW50cm86IFtdXG5cbiAgICBwYXRod2F5OiBbXVxuXG4gICAgb3V0cm86IFtdXG5cblxuICBzZWxlY3RlZFBhdGh3YXlzOiBbXVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSU5JVFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBpbml0aWFsaXplOiAtPlxuXG4gICAgQFN0ZXBOYXYgPSBuZXcgU3RlcE5hdlZpZXcoKVxuXG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG5cbiAgZXZlbnRzOiBcblxuICAgICdjbGljayAuZXhpdC1lZGl0JyA6ICdleGl0RWRpdENsaWNrSGFuZGxlcidcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0SGFuZGxlcidcblxuICAgICdzdGVwOnByZXYnIDogJ3ByZXZIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6Z290bycgOiAnZ290b0hhbmRsZXInXG5cbiAgICAnc3RlcDpnb3RvSWQnIDogJ2dvdG9JZEhhbmRsZXInXG5cbiAgICAnc3RlcDplZGl0JyA6ICdlZGl0SGFuZGxlcidcblxuICAgICd0aXBzOmhpZGUnIDogJ2hpZGVBbGxUaXBzJ1xuXG4gICAgJ2VkaXQ6ZXhpdCcgOiAnb25FZGl0RXhpdCdcblxuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkpKVxuXG4gICAgdW5sZXNzIEBzdGVwc1JlbmRlcmVkXG4gICAgXG4gICAgICBAYWZ0ZXJSZW5kZXIoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRzdGVwc0NvbnRhaW5lciA9IEAkZWwuZmluZCgnLnN0ZXBzJylcblxuICAgIEAkaW5uZXJDb250YWluZXIgPSBAJGVsLmZpbmQoJy5jb250ZW50JylcblxuICAgIEByZW5kZXJJbnRyb1N0ZXBzKClcblxuICAgIEByZW5kZXJTdGVwcygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG4gICAgaWYgQHN0ZXBWaWV3cy5sZW5ndGggPiAwXG5cbiAgICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG4gICAgc2V0VGltZW91dCg9PlxuICAgICAgQHRpbWVsaW5lVmlldyA9IG5ldyBUaW1lbGluZVZpZXcoKVxuICAgICwxMDAwKVxuICAgIFxuXG4gICAgXG4gICAgcmV0dXJuIEBcblxuICByZW5kZXJJbnRyb1N0ZXBzOiAtPlxuXG4gICAgc3RlcE51bWJlciA9IDBcblxuICAgIF8uZWFjaChAc3RlcERhdGEuaW50cm8sKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBpZiBpbmRleCBpcyAwXG5cbiAgICAgICAgbmV3dmlldy5pc0ZpcnN0U3RlcCA9IHRydWVcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICBAc3RlcFZpZXdzLnB1c2gobmV3dmlldylcblxuICAgICAgQGFsbFN0ZXBWaWV3cy5pbnRyby5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuICByZW5kZXJTdGVwczogLT5cblxuICAgIEBhbGxTdGVwVmlld3MucGF0aHdheSA9IFtdXG5cbiAgICBzdGVwTnVtYmVyID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIF8uZWFjaChAc2VsZWN0ZWRQYXRod2F5cywgKHBpZCwgcGluZGV4KSA9PlxuXG4gICAgICBfLmVhY2goQHN0ZXBEYXRhLnBhdGh3YXlzW3BpZF0sKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICAgIGlmIEBzZWxlY3RlZFBhdGh3YXlzLmxlbmd0aCA+IDFcblxuICAgICAgICAgIGlmIHN0ZXAuaWQgaXMgJ2dyYWRpbmcnIHx8IHN0ZXAuaWQgaXMgJ292ZXJ2aWV3JyB8fCBzdGVwLnR5cGUgaXMgJ2dyYWRpbmcnIHx8IHN0ZXAudHlwZSBpcyAnb3ZlcnZpZXcnXG5cbiAgICAgICAgICAgIGlmIHBpbmRleCA8IEBzZWxlY3RlZFBhdGh3YXlzLmxlbmd0aCAtIDFcblxuICAgICAgICAgICAgICByZXR1cm4gXG5cbiAgICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICAgIG5ld21vZGVsLnNldChrZXksdmFsdWUpXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgICBtb2RlbDogbmV3bW9kZWxcblxuICAgICAgICApXG5cbiAgICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4Jywgc3RlcE51bWJlciApXG5cbiAgICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLS0je3N0ZXAuaWR9XCIpXG5cbiAgICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLXBhdGh3YXkgc3RlcC1wYXRod2F5LS0je3BpZH1cIilcblxuICAgICAgICBAc3RlcFZpZXdzLnB1c2gobmV3dmlldylcblxuICAgICAgICBAYWxsU3RlcFZpZXdzLnBhdGh3YXkucHVzaChuZXd2aWV3KVxuXG4gICAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgICApXG4gICAgXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuICByZW5kZXJPdXRyb1N0ZXBzOiAtPlxuXG4gICAgQGFsbFN0ZXBWaWV3cy5vdXRybyA9IFtdXG5cbiAgICBzdGVwTnVtYmVyID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIF8uZWFjaChAc3RlcERhdGEub3V0cm8sKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBpZiBpbmRleCBpcyBAc3RlcERhdGEub3V0cm8ubGVuZ3RoIC0gMVxuXG4gICAgICAgIG5ld3ZpZXcuaXNMYXN0U3RlcCA9IHRydWVcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICBAc3RlcFZpZXdzLnB1c2gobmV3dmlldylcblxuICAgICAgQGFsbFN0ZXBWaWV3cy5vdXRyby5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgcmVjcmVhdGVQYXRod2F5OiAtPlxuXG4gICAgY2xvbmUgPSBAc3RlcFZpZXdzXG5cbiAgICBAc3RlcFZpZXdzID0gW2Nsb25lWzBdLCBjbG9uZVsxXV1cblxuICAgIF8uZWFjaChAYWxsU3RlcFZpZXdzLnBhdGh3YXksIChzdGVwKSAtPlxuXG4gICAgICBzdGVwLnJlbW92ZSgpXG5cbiAgICApXG5cbiAgICBfLmVhY2goQGFsbFN0ZXBWaWV3cy5vdXRybywgKHN0ZXApIC0+XG5cbiAgICAgIHN0ZXAucmVtb3ZlKClcblxuICAgIClcblxuICAgIEByZW5kZXJTdGVwcygpXG5cbiAgICBAcmVuZGVyT3V0cm9TdGVwcygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY29udGVudDogXCJUaGlzIGlzIHNwZWNpYWwgY29udGVudFwiXG5cbiAgICB9XG4gICAgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIENVU1RPTSBGVU5DVElPTlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWR2YW5jZVN0ZXA6IC0+XG5cbiAgICBAY3VycmVudFN0ZXArPTFcbiAgICBcbiAgICBpZiBAY3VycmVudFN0ZXAgaXMgQHN0ZXBWaWV3cy5sZW5ndGggXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICBkZWNyZW1lbnRTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwLT0xXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPCAwXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IEBzdGVwVmlld3MubGVuZ3RoIC0gMVxuXG4gICAgQGhpZGVBbGxTdGVwcygpXG5cbiAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuXG5cbiAgdXBkYXRlU3RlcDogKGluZGV4KSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gaW5kZXhcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICB1cGRhdGVTdGVwQnlJZDogKGlkKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBpZiBzdGVwVmlldy5zdGVwSWQoKSBpcyBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKF8uaW5kZXhPZihAc3RlcFZpZXdzLHN0ZXBWaWV3KSlcbiAgICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgXG4gICAgKVxuXG5cbiAgc2hvd0N1cnJlbnRTdGVwOiAtPlxuXG4gICAgQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLnNob3coKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDp1cGRhdGUnLCBAY3VycmVudFN0ZXApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgdXBkYXRlU2VsZWN0ZWRQYXRod2F5OiAoYWN0aW9uLCBwYXRod2F5SWQpIC0+XG5cbiAgICBpZiBhY3Rpb24gaXMgJ2FkZCdcblxuICAgICAgaWYgcGF0aHdheUlkIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICAgIEBzZWxlY3RlZFBhdGh3YXlzID0gW3BhdGh3YXlJZF1cblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBzZWxlY3RlZFBhdGh3YXlzLnB1c2gocGF0aHdheUlkKVxuXG4gICAgZWxzZSBpZiBhY3Rpb24gaXMgJ3JlbW92ZSdcblxuICAgICAgaWYgcGF0aHdheUlkIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICAgIEBzZWxlY3RlZFBhdGh3YXlzID0gW11cblxuICAgICAgZWxzZVxuXG4gICAgICAgIHJlbW92ZUluZGV4ID0gXy5pbmRleE9mKEBzZWxlY3RlZFBhdGh3YXksIHBhdGh3YXlJZClcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cy5zcGxpY2UocmVtb3ZlSW5kZXgpXG5cbiAgICBAcmVjcmVhdGVQYXRod2F5KClcblxuICAgIHJldHVybiBAXG5cblxuICBjdXJyZW50U3RlcFZpZXc6IC0+XG5cbiAgICByZXR1cm4gQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdXG5cblxuICBoaWRlQWxsU3RlcHM6IC0+XG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG5cbiAgICAgIHN0ZXBWaWV3LmhpZGUoKVxuICAgICAgXG4gICAgKVxuXG5cbiAgaGlkZUFsbFRpcHM6IChlKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy50aXBWaXNpYmxlID0gZmFsc2VcbiAgICAgIFxuICAgIClcblxuICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dEhhbmRsZXI6IC0+XG5cbiAgICBAYWR2YW5jZVN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG5cbiAgcHJldkhhbmRsZXI6IC0+XG5cbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZWRpdEhhbmRsZXI6IChpZCkgLT5cblxuICAgIGlmIGlkIGlzICdhc3NpZ25tZW50X3NlbGVjdGlvbidcbiAgICAgIHggPSBjb25maXJtKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc3RhcnQgdGhlIHByb2Nlc3Mgb3ZlciB3aXRoIGEgbmV3IGFzc2lnbm1lbnQgdHlwZT8nKVxuICAgICAgaWYgIXhcbiAgICAgICAgcmV0dXJuXG5cbiAgICBlbHNlICAgICAgIFxuXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2VkaXQtbW9kZScpXG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywgKHZpZXcsIGluZGV4KSA9PlxuXG4gICAgICBpZiB2aWV3Lm1vZGVsLmlkID09IGlkXG5cbiAgICAgICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICApXG5cblxuICBvbkVkaXRFeGl0OiAtPlxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdlZGl0LW1vZGUnKVxuXG5cbiAgZXhpdEVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2VkaXQ6ZXhpdCcpXG5cblxuXG4gIGdvdG9IYW5kbGVyOiAoaW5kZXgpIC0+XG5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuICBnb3RvSWRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBAdXBkYXRlU3RlcEJ5SWQoaWQpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ2V0U2VsZWN0ZWRJZHM6IC0+XG5cbiAgICBzZWxlY3RlZElkcyA9IFtdXG5cbiAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0cywgKHN0ZXBzKSA9PlxuXG4gICAgICBfLmVhY2goc3RlcHMsIChzdGVwKSA9PlxuXG4gICAgICAgIGlmIHN0ZXAuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgaWYgc3RlcC5pZFxuXG4gICAgICAgICAgICBzZWxlY3RlZElkcy5wdXNoIHN0ZXAuaWRcblxuICAgICAgKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIHNlbGVjdGVkSWRzXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL0lucHV0VmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgSW5wdXRWaWV3IFxuXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkxvZ2luVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMnKVxuXG5XaXphcmRDb250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb250ZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IExvZ2luVGVtcGxhdGVcblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIFxuICAgIHJldHVybiBXaXphcmRDb250ZW50WzBdIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbldpa2lPdXRwdXRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicycpXG5Db3Vyc2VEZXRhaWxzVGVtcGFsdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMnKVxuR3JhZGluZ1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nVGVtcGxhdGUuaGJzJylcbkNvdXJzZU9wdGlvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicycpXG5cblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgT3V0cHV0VmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogV2lraU91dHB1dFRlbXBsYXRlXG5cbiAgY3VycmVudEJ1aWxkOiAnJ1xuXG4gIGRldGFpbHNUZW1wbGF0ZTogQ291cnNlRGV0YWlsc1RlbXBhbHRlXG5cbiAgZ3JhZGluZ1RlbXBsYXRlOiBHcmFkaW5nVGVtcGxhdGVcblxuICBvcHRpb25zVGVtcGxhdGU6IENvdXJzZU9wdGlvbnNUZW1wbGF0ZVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICd3aXphcmQ6cHVibGlzaCcgOiAncHVibGlzaEhhbmRsZXInXG4gICAgJ291dHB1dDp1cGRhdGUnICA6ICd1cGRhdGVCdWlsZCdcblxuICB1cGRhdGVCdWlsZDogKGJ1aWxkKSAtPlxuICAgIEBjdXJyZW50QnVpbGQgPSBidWlsZFxuICAgICMgY29uc29sZS5sb2cgQGN1cnJlbnRCdWlsZFxuXG5cbiAgb3V0cHV0UGxhaW5UZXh0OiAtPlxuXG4gICAgQHJlbmRlcigpXG5cbiAgICByZXR1cm4gQCRlbC50ZXh0KClcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAcG9wdWxhdGVPdXRwdXQoKSApIClcbiAgICBcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cblxuICBwb3B1bGF0ZU91dHB1dDogLT5cblxuICAgIGRldGFpbHNPdXRwdXQgPSBAJGVsLmh0bWwoQGRldGFpbHNUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICByYXdBc3NpZ25tZW50T3V0cHV0ID0gQCRlbC5odG1sKEB0ZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBhc3NpZ25tZW50T3V0cHV0ID0gcmF3QXNzaWdubWVudE91dHB1dC5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHIpL2dtLFwiXCIpXG5cbiAgICBncmFkaW5nT3V0cHV0ID0gQCRlbC5odG1sKEBncmFkaW5nVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgb3B0aW9uc091dHB1dCA9IEAkZWwuaHRtbChAb3B0aW9uc1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIGNvdXJzZU91dCA9IGRldGFpbHNPdXRwdXQgKyBhc3NpZ25tZW50T3V0cHV0ICsgZ3JhZGluZ091dHB1dCArIG9wdGlvbnNPdXRwdXRcbiAgICBcbiAgICByZXR1cm4gY291cnNlT3V0XG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIF8uZXh0ZW5kKFdpemFyZFN0ZXBJbnB1dHMseyBkZXNjcmlwdGlvbjogJCgnI3Nob3J0X2Rlc2NyaXB0aW9uJykudmFsKCksIGxpbmVCcmVhazogJzxici8+J30pXG5cblxuICBleHBvcnREYXRhOiAoZm9ybURhdGEpIC0+XG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcblxuICAgICAgICB3aWtpdGV4dDogZm9ybURhdGFcblxuICAgICAgICBjb3Vyc2VfdGl0bGU6IFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWVcblxuICAgICAgc3VjY2VzczogKHJlc3BvbnNlKSAtPlxuXG4gICAgICAgICQoJyNwdWJsaXNoJykucmVtb3ZlQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAgIGlmIHJlc3BvbnNlLnN1Y2Nlc3NcblxuICAgICAgICAgIG5ld1BhZ2UgPSBcImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvI3tyZXNwb25zZS50aXRsZX1cIlxuXG4gICAgICAgICAgYWxlcnQoXCJDb25ncmF0cyEgWW91IGhhdmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQvZWRpdGVkIGEgV2lraWVkdSBDb3Vyc2UgYXQgI3tuZXdQYWdlfVwiKVxuXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBuZXdQYWdlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgY29uc29sZS5sb2cgcmVzcG9uc2VcblxuICAgICAgICAgIGFsZXJ0KCdIbW0uLi4gc29tZXRoaW5nIHdlbnQgd3JvbmcuIFRyeSBjbGlja2luZyBcIlB1Ymxpc2hcIiBhZ2Fpbi4gSWYgdGhhdCBkb2VzblxcJ3Qgd29yaywgcGxlYXNlIHNlbmQgYSBtZXNzYWdlIHRvIHNhZ2VAd2lraWVkdS5vcmcuJylcblxuXG4gICAgKVxuICAgIFxuXG4gIHB1Ymxpc2hIYW5kbGVyOiAtPlxuXG4gICAgaWYgV2l6YXJkU3RlcElucHV0cy5pbnRyby5jb3Vyc2VfbmFtZS52YWx1ZS5sZW5ndGggPiAwIFxuXG4gICAgICAkKCcjcHVibGlzaCcpLmFkZENsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgIyBAZXhwb3J0RGF0YShAJGVsLmh0bWwoQHBvcHVsYXRlT3V0cHV0KCkpLnRleHQoKSlcblxuICAgICAgIyBAZXhwb3J0RGF0YShAcG9wdWxhdGVPdXRwdXQoKSlcblxuICAgICAgY29uc29sZS5sb2cgQGN1cnJlbnRCdWlsZFxuXG4gICAgICBAZXhwb3J0RGF0YShAY3VycmVudEJ1aWxkKVxuXG4gICAgZWxzZVxuXG4gICAgICBhbGVydCgnWW91IG11c3QgZW50ZXIgYSBjb3Vyc2UgdGl0bGUgYXMgdGhpcyB3aWxsIGJlY29tZSB0aGUgdGl0bGUgb2YgeW91ciBjb3Vyc2UgcGFnZS4nKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnaW50cm8nKVxuXG4gICAgICBzZXRUaW1lb3V0KD0+XG5cbiAgICAgICAgJCgnI2NvdXJzZV9uYW1lJykuZm9jdXMoKVxuXG4gICAgICAsNTAwKVxuXG5cbiAgICBcblxuICAgIFxuXG4gICAgXG4iLCIjIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuV2lraVN1bW1hcnlNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpU3VtbWFyeU1vZHVsZS5oYnMnKVxuV2lraURldGFpbHNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGV0YWlsc01vZHVsZS5oYnMnKVxuXG4jRGF0YVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuVGltZWxpbmVWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvVGltZWxpbmVWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE92ZXJ2aWV3VmlldyBleHRlbmRzIFZpZXdcblxuICBldmVudHM6IFxuICAgICdjbGljayAuZXhwYW5kLWFsbCcgOiAnZXhwYW5kQ29sbGFwc2VBbGwnXG5cbiAgb3ZlcnZpZXdJdGVtVGVtcGxhdGU6IFdpa2lEZXRhaWxzTW9kdWxlXG5cbiAgZXhwYW5kQ29sbGFwc2VBbGw6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHRhcmdldC50b2dnbGVDbGFzcygnb3BlbicpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXIuaGFzLWNvbnRlbnQnKS5maW5kKCcuY3VzdG9tLWlucHV0LWFjY29yZGlhbicpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKVxuXG4gICAgaWYgJHRhcmdldC5oYXNDbGFzcygnb3BlbicpXG4gICAgICAkdGFyZ2V0LnRleHQoJ1tjb2xsYXBzZSBhbGxdJylcbiAgICBlbHNlXG4gICAgICAkdGFyZ2V0LnRleHQoJ1tleHBhbmQgYWxsXScpXG5cblxuXG4gICAgXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc2VsZWN0ZWRQYXRod2F5cyA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXNcblxuICAgIHNlbGVjdGVkT2JqZWN0cyA9IF8ud2hlcmUoV2l6YXJkU3RlcElucHV0c1snYXNzaWdubWVudF9zZWxlY3Rpb24nXSwge3NlbGVjdGVkOiB0cnVlfSlcblxuICAgICQoJzxkaXYgY2xhc3M9XCJzdGVwLWZvcm0tY29udGVudF9fdGl0bGVcIj5TZWxlY3RlZCBhc3NpZ25tZW50KHMpOiA8YSBjbGFzcz1cImV4cGFuZC1hbGxcIiBocmVmPVwiI1wiPltleHBhbmQgYWxsXTwvYT48L2Rpdj4nKS5hcHBlbmRUbyhAJGVsKS5jc3MoXG4gICAgICBtYXJnaW5Cb3R0b206ICc4cHgnXG4gICAgKVxuXG4gICAgXy5lYWNoKHNlbGVjdGVkT2JqZWN0cywgKG9iaikgPT5cblxuICAgICAgcGF0aFRpdGxlID0gb2JqLmxhYmVsXG5cbiAgICAgICRuZXdUaXRsZSA9ICQoQG92ZXJ2aWV3SXRlbVRlbXBsYXRlKFxuXG4gICAgICAgIGxhYmVsOiBwYXRoVGl0bGVcblxuICAgICAgICBzdGVwSWQ6ICdhc3NpZ25tZW50X3NlbGVjdGlvbidcblxuICAgICAgICBhc3NpZ25tZW50czogW11cblxuICAgICAgKSkuZmluZCgnLmN1c3RvbS1pbnB1dCcpLnJlbW92ZUNsYXNzKCdjdXN0b20taW5wdXQtLWFjY29yZGlhbicpXG5cbiAgICAgICRuZXdUaXRsZS5maW5kKCcuZWRpdC1idXR0b24nKVxuXG4gICAgICBAJGVsLmFwcGVuZCgkbmV3VGl0bGUpXG5cbiAgICApXG5cbiAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICBcbiAgICBcbiAgICBfLmVhY2goc2VsZWN0ZWRQYXRod2F5cywgKHBpZCwgaSkgPT5cblxuICAgICAgc3RlcERhdGEgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwRGF0YS5wYXRod2F5c1twaWRdXG5cbiAgICAgIGlucHV0RGF0YUlkcyA9IF8ucGx1Y2soc3RlcERhdGEsICdpZCcpXG5cbiAgICAgIHN0ZXBUaXRsZXMgPSBfLnBsdWNrKHN0ZXBEYXRhLCAndGl0bGUnKVxuXG4gICAgICB0b3RhbExlbmd0aCA9IHN0ZXBEYXRhLmxlbmd0aFxuXG4gICAgICBpZiBzdGVwVGl0bGVzLmxlbmd0aCA+IDAgJiYgaSBpcyAwXG5cbiAgICAgICAgJCgnPGRpdiBjbGFzcz1cInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVwiPkFzc2lnbm1lbnQgZGV0YWlsczogPC9kaXY+JykuYXBwZW5kVG8oQCRlbCkuY3NzKFxuICAgICAgICAgIGJvdHRvbTogJ2F1dG8nXG4gICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnXG4gICAgICAgICAgbWFyZ2luQm90dG9tOiAnMCdcbiAgICAgICAgICBtYXJnaW5Ub3A6ICcxNXB4J1xuICAgICAgICApXG5cbiAgICAgIF8uZWFjaChzdGVwVGl0bGVzLCAodGl0bGUsIGluZGV4KSA9PlxuXG4gICAgICAgIHVubGVzcyBzdGVwRGF0YVtpbmRleF0uc2hvd0luT3ZlcnZpZXdcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgICBzdGVwSW5wdXRJdGVtcyA9IFdpemFyZFN0ZXBJbnB1dHNbaW5wdXREYXRhSWRzW2luZGV4XV1cblxuXG4gICAgICAgIF8uZWFjaChzdGVwSW5wdXRJdGVtcywgKGlucHV0KSA9PlxuXG4gICAgICAgICAgaWYgaW5wdXQudHlwZVxuXG4gICAgICAgICAgICBpZiBpbnB1dC50eXBlIGlzICdjaGVja2JveCcgfHwgaW5wdXQudHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgICAgICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5sYWJlbFxuXG4gICAgICAgICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3JhZGlvR3JvdXAnXG5cbiAgICAgICAgICAgICAgaWYgaW5wdXQuaWQgaXMgJ3BlZXJfcmV2aWV3cydcblxuICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQub3ZlcnZpZXdMYWJlbFxuICAgICAgICApXG5cbiAgICAgICAgaWYgc2VsZWN0ZWRJbnB1dHMubGVuZ3RoID09IDBcblxuICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggXCJbTm9uZSBzZWxlY3RlZF1cIlxuXG4gICAgICAgIEAkZWwuYXBwZW5kKCBAb3ZlcnZpZXdJdGVtVGVtcGxhdGUoXG5cbiAgICAgICAgICBsYWJlbDogdGl0bGVcblxuICAgICAgICAgIHN0ZXBJZDogaW5wdXREYXRhSWRzW2luZGV4XVxuXG4gICAgICAgICAgYXNzaWdubWVudHM6IHNlbGVjdGVkSW5wdXRzXG5cbiAgICAgICAgKSlcblxuICAgICAgKVxuICAgIClcblxuICAgIEByZW5kZXJEZXNjcmlwdGlvbigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuXG4gIHJlbmRlckRlc2NyaXB0aW9uOiAtPlxuXG4gICAgQFRpbWVsaW5lVmlldyA9IG5ldyBUaW1lbGluZVZpZXcoKVxuXG4gICAgJGRlc2NJbnB1dCA9ICQoXCI8dGV4dGFyZWEgaWQ9J3Nob3J0X2Rlc2NyaXB0aW9uJyByb3dzPSc2JyBzdHlsZT0nd2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjQyLDI0MiwyNDIsMS4wKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjAyLDIwMiwyMDIsMS4wKTtwYWRkaW5nOjEwcHggMTVweDtmb250LXNpemU6IDE2cHg7bGluZS1oZWlnaHQgMjNweDtsZXR0ZXItc3BhY2luZzogMC4yNXB4Oyc+PC90ZXh0YXJlYT5cIilcblxuICAgICRkZXNjSW5wdXQudmFsKFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb24pXG5cbiAgICAkKCcuZGVzY3JpcHRpb24tY29udGFpbmVyJykuaHRtbCgkZGVzY0lucHV0WzBdKVxuXG4gICAgJGRlc2NJbnB1dC5vZmYgJ2NoYW5nZSdcblxuICAgICRkZXNjSW5wdXQub24gJ2NoYW5nZScsIChlKSA9PlxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzLmNvdXJzZV9kZXRhaWxzLmRlc2NyaXB0aW9uID0gJChlLnRhcmdldCkudmFsKClcblxuICAgICAgQFRpbWVsaW5lVmlldy51cGRhdGUoKVxuICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudGltZWxpbmVWaWV3LnVwZGF0ZSgpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuXG4gICAgXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE5hdlZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cblN0ZXBOYXZUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBOYXZWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcC1uYXYnXG5cblxuICB0ZW1wbGF0ZTogU3RlcE5hdlRlbXBsYXRlXG5cblxuICBoYXNCZWVuVG9MYXN0U3RlcDogZmFsc2VcblxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgXG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6dXBkYXRlJyA6ICd1cGRhdGVDdXJyZW50U3RlcCdcblxuICAgICdzdGVwOmFuc3dlcmVkJyA6ICdzdGVwQW5zd2VyZWQnXG5cbiAgICAnZWRpdDpleGl0JyA6ICdlZGl0RXhpdEhhbmRsZXInXG5cblxuICBldmVudHM6IC0+XG5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnByZXYnIDogJ3ByZXZDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmRvdCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPCBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgIGVsc2UgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPT0gQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGN1cnJlbnQ6IEBjdXJyZW50U3RlcFxuXG4gICAgICB0b3RhbDogQHRvdGFsU3RlcHNcblxuICAgICAgcHJldkluYWN0aXZlOiBAaXNJbmFjdGl2ZSgncHJldicpXG5cbiAgICAgIG5leHRJbmFjdGl2ZTogQGlzSW5hY3RpdmUoJ25leHQnKVxuXG4gICAgICBuZXh0VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICcnXG5cbiAgICAgICAgZWxzZSBcblxuICAgICAgICAgIHJldHVybiAnTmV4dCdcblxuICAgICAgcHJldlRpdGxlOiA9PlxuXG4gICAgICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgICAgIHJldHVybiAnQmFjaydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdQcmV2J1xuXG4gICAgICBpc0xhc3RTdGVwOiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIGJhY2tUb092ZXJ2aWV3VGl0bGU6ICdHbyBCYWNrIHRvIE92ZXJ2aWV3J1xuXG4gICAgICBzdGVwczogPT5cblxuICAgICAgICBvdXQgPSBbXVxuXG4gICAgICAgIF8uZWFjaChAc3RlcFZpZXdzLCAoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgICAgICBzdGVwRGF0YSA9IHN0ZXAubW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICAgICAgaXNBY3RpdmUgPSBAY3VycmVudFN0ZXAgaXMgaW5kZXhcblxuICAgICAgICAgIHdhc1Zpc2l0ZWQgPSBzdGVwLmhhc1VzZXJWaXNpdGVkXG5cbiAgICAgICAgICBvdXQucHVzaCB7aWQ6IGluZGV4LCBpc0FjdGl2ZTogaXNBY3RpdmUsIGhhc1Zpc2l0ZWQ6IHdhc1Zpc2l0ZWQsIHN0ZXBUaXRsZTogc3RlcERhdGEudGl0bGUsIHN0ZXBJZDogc3RlcERhdGEuaWR9XG5cbiAgICAgICAgKVxuXG4gICAgICAgIHJldHVybiBvdXRcblxuICAgIH1cblxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnZ3JhZGluZycpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICBkb3RDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZiBAaGFzQmVlblRvTGFzdFN0ZXBcblxuICAgICAgaWYgcGFyc2VJbnQoJHRhcmdldC5hdHRyKCdkYXRhLW5hdi1pZCcpKSA9PSBwYXJzZUludChAdG90YWxTdGVwcyAtIDEpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZWRpdDpleGl0JylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICR0YXJnZXQuZGF0YSgnc3RlcC1pZCcpKVxuXG4gICAgZWxzZVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCAkdGFyZ2V0LmRhdGEoJ25hdi1pZCcpKVxuXG5cbiAgZWRpdEV4aXRIYW5kbGVyOiAtPlxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGxhc3RTdGVwSW5kZXgoKSlcblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IHN0ZXBcblxuICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgQGhhc0JlZW5Ub0xhc3RTdGVwID0gdHJ1ZVxuXG4gICAgQHJlbmRlcigpXG5cblxuICBzdGVwQW5zd2VyZWQ6IChzdGVwVmlldykgLT5cblxuICAgIHJldHVybiBAcmVuZGVyKClcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSGVscGVyc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBsYXN0U3RlcEluZGV4OiAtPlxuICAgIFxuICAgIHJldHVybiBAdG90YWxTdGVwcy0xXG5cbiAgaXNMYXN0U3RlcDogLT5cblxuICAgIHJldHVybiBAY3VycmVudFN0ZXAgaXMgQHRvdGFsU3RlcHMgLSAxICYmIEBjdXJyZW50U3RlcCA+IDFcblxuICBpc0luYWN0aXZlOiAoaXRlbSkgLT5cblxuICAgIGl0SXMgPSB0cnVlXG5cbiAgICBpZiBpdGVtID09ICdwcmV2J1xuXG4gICAgICBpdElzID0gQGN1cnJlbnRTdGVwIGlzIDBcblxuICAgIGVsc2UgaWYgaXRlbSA9PSAnbmV4dCdcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uaGFzVXNlckFuc3dlcmVkXG5cbiAgICAgICAgaXRJcyA9IGZhbHNlXG5cbiAgICAgIGVsc2UgaWYgQGlzTGFzdFN0ZXAoKVxuICAgICAgICBcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggPT0gMFxuXG4gICAgICAgIGl0SXMgPSB0cnVlICBcblxuXG4gICAgcmV0dXJuIGl0SXNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcFZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyMjIyMjIyMjQVBQIyMjIyMjIyMjXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyMjIyMjIyMjVklFVyBDTEFTUyMjIyMjIyMjI1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuIyMjIyMjIyMjU1VCVklFV1MjIyMjIyMjIyNcbklucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuXG5EYXRlSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvRGF0ZUlucHV0VmlldycpXG5cblxuR3JhZGluZ0lucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcnKVxuXG5cbk92ZXJ2aWV3VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL092ZXJ2aWV3VmlldycpXG5cblxuIyMjIyMjIyMjVEVNUExBVEVTIyMjIyMjIyMjIyNcblN0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9TdGVwVGVtcGxhdGUuaGJzJylcblxuXG5JbnRyb1N0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9JbnRyb1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5cbklucHV0VGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicycpXG5cblxuQ291cnNlVGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMnKVxuXG5cbldpa2lEYXRlc01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMnKVxuXG4jIyMjIyMjIyMjREFUQSMjIyMjIyMjI1xuQ291cnNlSW5mb0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZENvdXJzZUluZm8nKVxuXG4jIyMjIyMjIyNJTlBVVFMjIyMjIyMjIyNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcCdcblxuXG4gIHRhZ05hbWU6ICdzZWN0aW9uJ1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBUZW1wbGF0ZVxuXG5cbiAgaW50cm9UZW1wbGF0ZTogSW50cm9TdGVwVGVtcGxhdGVcblxuXG4gIHRpcFRlbXBsYXRlOiBJbnB1dFRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvVGVtcGxhdGU6IENvdXJzZVRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvRGF0YTogQ291cnNlSW5mb0RhdGFcblxuXG4gIGRhdGVzTW9kdWxlOiBXaWtpRGF0ZXNNb2R1bGVcblxuXG4gIGhhc1VzZXJBbnN3ZXJlZDogZmFsc2VcblxuXG4gIGhhc1VzZXJWaXNpdGVkOiBmYWxzZVxuXG5cbiAgaXNMYXN0U3RlcDogZmFsc2VcblxuXG4gIGlzRmlyc3RTdGVwOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlRTIEFORCBIQU5ETEVSU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6XG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuICAgICMgJ2NsaWNrIC5zdGVwLWluZm8tdGlwJyA6ICdoaWRlVGlwcydcblxuICBzdWJzY3JpcHRpb25zOiBcblxuICAgICd0aXBzOmhpZGUnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2RhdGU6Y2hhbmdlJyA6ICdpc0ludHJvVmFsaWQnXG5cblxuICBlZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIHN0ZXBJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXN0ZXAtaWQnKVxuXG4gICAgaWYgc3RlcElkXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsIHN0ZXBJZClcblxuICBzdGVwSWQ6IC0+XG5cbiAgICByZXR1cm4gQG1vZGVsLmF0dHJpYnV0ZXMuaWRcblxuXG4gIHZhbGlkYXRlRGF0ZXM6IC0+XG5cbiAgICB1bmxlc3MgQGlzRmlyc3RTdGVwIG9yIEBpc0xhc3RTdGVwXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZGF0ZXNBcmVWYWxpZCA9IGZhbHNlXG5cbiAgICBpZiAkKCcjdGVybVN0YXJ0RGF0ZScpLnZhbCAhPSAnJyAmJiAkKCcjdGVybUVuZERhdGUnKS52YWwgIT0gJycgJiYgJCgnI2NvdXJzZVN0YXJ0RGF0ZScpLnZhbCAhPSAnJyAmJiAkKCcjY291cnNlRW5kRGF0ZScpLnZhbCAhPSAnJ1xuICAgICAgZGF0ZXNBcmVWYWxpZCA9IHRydWVcbiAgICAjIF8uZWFjaChAZGF0ZVZpZXdzLCAoZGF0ZVZpZXcpID0+XG4gICAgIyAgIGlmIGRhdGVWaWV3LmlzVmFsaWQoKVxuICAgICMgICAgIGRhdGVzQXJlVmFsaWQgPSB0cnVlXG4gICAgIyAgIGVsc2UgXG4gICAgIyAgICAgZGF0ZXNBcmVWYWxpZCA9IGZhbHNlXG4gICAgIyApXG5cbiAgICByZXR1cm4gZGF0ZXNBcmVWYWxpZFxuXG5cbiAgYWNjb3JkaWFuQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICR0YXJnZXQudG9nZ2xlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd3aXphcmQ6cHVibGlzaCcpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAdGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnZmlyc3QnKVxuXG4gICAgZWxzZSBpZiBAaXNMYXN0U3RlcFxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdsYXN0JylcbiAgICAgIFxuICAgIGVsc2VcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnc3RhbmRhcmQnKVxuXG4gICAgQF9yZW5kZXJJbnB1dHNBbmRJbmZvKClcblxuICAgIHJldHVybiBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgX3JlbmRlclN0ZXBUeXBlOiAodHlwZSkgLT5cblxuICAgIGlmIHR5cGUgaXMgJ3N0YW5kYXJkJ1xuXG4gICAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ2ZpcnN0JyBvciB0eXBlIGlzICdsYXN0J1xuXG4gICAgICBpZiB0eXBlIGlzICdmaXJzdCdcblxuICAgICAgICBAJGVsLmFkZENsYXNzKCdzdGVwLS1maXJzdCcpLmh0bWwoIEBpbnRyb1RlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgICAgICBkYXRlVGl0bGUgPSAnQ291cnNlIGRhdGVzJ1xuXG4gICAgICAgIEAkYmVnaW5CdXR0b24gPSBAJGVsLmZpbmQoJ2EjYmVnaW5CdXR0b24nKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tbGFzdCcpLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICAgZGF0ZVRpdGxlID0gJ0Fzc2lnbm1lbnQgdGltZWxpbmUnXG5cbiAgICAgIEBkYXRlVmlld3MgPSBbXVxuXG4gICAgICAkZGF0ZXMgPSAkKEBkYXRlc01vZHVsZSh7dGl0bGU6IGRhdGVUaXRsZX0pKVxuXG4gICAgICAkZGF0ZUlucHV0cyA9ICRkYXRlcy5maW5kKCcuY3VzdG9tLXNlbGVjdCcpXG5cbiAgICAgIHNlbGYgPSBAXG5cbiAgICAgICRkYXRlSW5wdXRzLmVhY2goKGlucHV0RWxlbWVudCkgLT5cblxuICAgICAgICBuZXdEYXRlVmlldyA9IG5ldyBEYXRlSW5wdXRWaWV3KFxuXG4gICAgICAgICAgZWw6ICQodGhpcykgXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld0RhdGVWaWV3LnBhcmVudFN0ZXBWaWV3ID0gc2VsZlxuXG4gICAgICAgIHNlbGYuZGF0ZVZpZXdzLnB1c2gobmV3RGF0ZVZpZXcpXG4gICAgICBcbiAgICAgIClcblxuICAgICAgQCRlbC5maW5kKCcuc3RlcC1mb3JtLWRhdGVzJykuaHRtbCgkZGF0ZXMpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgX3JlbmRlcklucHV0c0FuZEluZm86IC0+XG5cbiAgICBAaW5wdXRTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgIEAkdGlwU2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtaW5mby10aXBzJylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJ1xuXG4gICAgICBwYXRod2F5cyA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXNcblxuICAgICAgbnVtYmVyT2ZQYXRod2F5cyA9IHBhdGh3YXlzLmxlbmd0aFxuXG4gICAgICBpZiBudW1iZXJPZlBhdGh3YXlzID4gMVxuXG4gICAgICAgIGRpc3RyaWJ1dGVkVmFsdWUgPSBNYXRoLmZsb29yKDEwMC9udW1iZXJPZlBhdGh3YXlzKVxuXG4gICAgICAgIEBpbnB1dERhdGEgPSBbXVxuXG4gICAgICAgIF8uZWFjaChwYXRod2F5cywgKHBhdGh3YXkpID0+XG5cbiAgICAgICAgICBncmFkaW5nRGF0YSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdW3BhdGh3YXldXG5cbiAgICAgICAgICBfLmVhY2goZ3JhZGluZ0RhdGEsIChncmFkZUl0ZW0pID0+XG5cbiAgICAgICAgICAgIGdyYWRlSXRlbS52YWx1ZSA9IGRpc3RyaWJ1dGVkVmFsdWVcblxuICAgICAgICAgICAgQGlucHV0RGF0YS5wdXNoIGdyYWRlSXRlbVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgIClcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBpbnB1dERhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVtwYXRod2F5c1swXV0gfHwgW11cblxuICAgIGVsc2VcblxuICAgICAgQGlucHV0RGF0YSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdIHx8IFtdXG5cblxuICAgIF8uZWFjaChAaW5wdXREYXRhLCAoaW5wdXQsIGluZGV4KSA9PlxuXG4gICAgICB1bmxlc3MgaW5wdXQudHlwZSBcblxuICAgICAgICByZXR1cm5cblxuICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgJiYgaW5wdXQucmVxdWlyZWRcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnNlbGVjdGVkIFxuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQucmVxdWlyZWQgaXMgZmFsc2VcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3BlcmNlbnQnXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuXG4gICAgICBpbnB1dFZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldyhcblxuICAgICAgICBtb2RlbDogbmV3IEJhY2tib25lLk1vZGVsKGlucHV0KVxuXG4gICAgICApXG5cbiAgICAgIGlucHV0Vmlldy5pbnB1dFR5cGUgPSBpbnB1dC50eXBlXG5cbiAgICAgIGlucHV0Vmlldy5pdGVtSW5kZXggPSBpbmRleFxuXG4gICAgICBpbnB1dFZpZXcucGFyZW50U3RlcCA9IEBcblxuICAgICAgQGlucHV0U2VjdGlvbi5hcHBlbmQoaW5wdXRWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBpbnB1dC50aXBJbmZvXG5cbiAgICAgICAgdGlwID0gXG5cbiAgICAgICAgICBpZDogaW5kZXhcblxuICAgICAgICAgIHRpdGxlOiBpbnB1dC50aXBJbmZvLnRpdGxlXG5cbiAgICAgICAgICBjb250ZW50OiBpbnB1dC50aXBJbmZvLmNvbnRlbnRcblxuICAgICAgICAkdGlwRWwgPSBAdGlwVGVtcGxhdGUodGlwKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgICAgZWxzZSBpZiBpbnB1dC5oYXNDb3Vyc2VJbmZvXG5cbiAgICAgICAgaW5mb0RhdGEgPSBfLmV4dGVuZChAY291cnNlSW5mb0RhdGFbaW5wdXQuaWRdLCB7aWQ6IGluZGV4fSApXG5cbiAgICAgICAgJHRpcEVsID0gQGNvdXJzZUluZm9UZW1wbGF0ZShpbmZvRGF0YSlcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGlucHV0Q29udGFpbmVycyA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZycgfHwgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnZ3JhZGluZydcblxuICAgICAgQGdyYWRpbmdWaWV3ID0gbmV3IEdyYWRpbmdJbnB1dFZpZXcoKVxuXG4gICAgICBAZ3JhZGluZ1ZpZXcucGFyZW50U3RlcFZpZXcgPSBAXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1jb250ZW50JykuYXBwZW5kKEBncmFkaW5nVmlldy5nZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpLmVsKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ292ZXJ2aWV3J1xuXG4gICAgICAkaW5uZXJFbCA9IEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1pbm5lcicpXG5cbiAgICAgICRpbm5lckVsLmh0bWwoJycpXG5cbiAgICAgIEBvdmVydmlld1ZpZXcgPSBuZXcgT3ZlcnZpZXdWaWV3KFxuICAgICAgICBlbDogJGlubmVyRWxcbiAgICAgIClcblxuICAgICAgQG92ZXJ2aWV3Vmlldy5wYXJlbnRTdGVwVmlldyA9IEBcblxuICAgICAgQG92ZXJ2aWV3Vmlldy5yZW5kZXIoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGU6IC0+XG5cbiAgICBAJGVsLmhpZGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHNob3c6IC0+XG5cbiAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcbiAgICAgIHNjcm9sbFRvcDogMFxuICAgICwxKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ292ZXJ2aWV3JyB8fCBAbW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdvdmVydmlldydcblxuICAgICAgQHJlbmRlcigpLiRlbC5zaG93KClcblxuICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudGltZWxpbmVWaWV3LnVwZGF0ZSgpXG5cbiAgICBlbHNlIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJyB8fCBAbW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdncmFkaW5nJ1xuXG4gICAgICBAcmVuZGVyKCkuJGVsLnNob3coKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnNob3coKVxuXG4gICAgQGhhc1VzZXJWaXNpdGVkID0gdHJ1ZVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGJlZ2luSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cbiAgdXBkYXRlVXNlckhhc0Fuc3dlcmVkOiAoaWQsIHZhbHVlLCB0eXBlKSAtPlxuXG5cbiAgICBpbnB1dEl0ZW1zID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdXG5cbiAgICByZXF1aXJlZFNlbGVjdGVkID0gZmFsc2VcblxuICAgIGlmIHR5cGUgaXMgJ3BlcmNlbnQnXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIHJldHVybiBAXG5cbiAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnY2hlY2tib3gnXG5cbiAgICAgICAgaWYgaXRlbS5yZXF1aXJlZCBpcyB0cnVlXG5cbiAgICAgICAgICBpZiBpdGVtLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgaWYgcmVxdWlyZWRTZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ3JhZGlvR3JvdXAnIG9yIHR5cGUgaXMgJ3JhZGlvQm94J1xuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICd0ZXh0J1xuXG4gICAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgICAgICBpZiBpdGVtLnR5cGUgaXMgJ3RleHQnXG5cbiAgICAgICAgICAgIGlmIGl0ZW0ucmVxdWlyZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIGlmIGl0ZW0udmFsdWUgIT0gJydcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgZWxzZSBcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIClcblxuICAgICAgICBpZiByZXF1aXJlZFNlbGVjdGVkXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gZmFsc2VcblxuICAgICAgICBAaXNJbnRyb1ZhbGlkKClcblxuICAgIGVsc2UgXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSBmYWxzZVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDphbnN3ZXJlZCcsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgaXNJbnRyb1ZhbGlkOiAtPlxuXG4gICAgdW5sZXNzIEBpc0ZpcnN0U3RlcCBvciBAaXNMYXN0U3RlcFxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICBpZiBAaGFzVXNlckFuc3dlcmVkIGFuZCBAdmFsaWRhdGVEYXRlcygpXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5yZW1vdmVDbGFzcygnaW5hY3RpdmUnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5hZGRDbGFzcygnaW5hY3RpdmUnKVxuXG5cbiAgdXBkYXRlUmFkaW9BbnN3ZXI6IChpZCwgaW5kZXgsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5zZWxlY3RlZCA9IHZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS52YWx1ZVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vdmVydmlld0xhYmVsID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5vdmVydmlld0xhYmVsXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gaW5kZXhcblxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlLCBoYXNQYXRod2F5LCBwYXRod2F5KSAtPlxuXG4gICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnR5cGUgXG5cbiAgICAgIGlzRXhjbHVzaXZlID0gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgICBpc0V4Y2x1c2l2ZSA9IGZhbHNlIHx8IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uZXhjbHVzaXZlIFxuXG5cbiAgICBoYXNFeGNsdXNpdmVTaWJsaW5nID0gZmFsc2VcblxuICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF0sIChpbnB1dEl0ZW0pID0+XG5cbiAgICAgIGlmIGlucHV0SXRlbS5leGNsdXNpdmVcblxuICAgICAgICBoYXNFeGNsdXNpdmVTaWJsaW5nID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgb3V0ID0gXG5cbiAgICAgIHR5cGU6IGlucHV0VHlwZVxuXG4gICAgICBpZDogaWRcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cbiAgICBpZiBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94JyB8fCBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICBpZiB2YWx1ZSA9PSAnb24nXG5cbiAgICAgICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgIGlmIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgJiYgIWlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLmFkZENsYXNzKCdub3QtZWRpdGFibGUnKS5yZW1vdmVDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGVsc2UgaWYgaXNFeGNsdXNpdmVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKS5ub3QoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLmFkZENsYXNzKCdub3QtZWRpdGFibGUnKS5yZW1vdmVDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGlmIEBtb2RlbC5pZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICAgICAgXG4gICAgICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudXBkYXRlU2VsZWN0ZWRQYXRod2F5KCdhZGQnLCBpZClcblxuICAgICAgZWxzZVxuXG4gICAgICAgIGlmIGhhc1BhdGh3YXlcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtwYXRod2F5XVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIGlmIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgJiYgIWlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBhbGxPdGhlcnNEaXNlbmdhZ2VkID0gdHJ1ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpLmVhY2goLT5cblxuICAgICAgICAgICAgaWYgISQodGhpcykuYXR0cignZGF0YS1leGNsdXNpdmUnKSAmJiAkKHRoaXMpLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgICAgICAgICBhbGxPdGhlcnNEaXNlbmdhZ2VkID0gZmFsc2VcblxuICAgICAgICAgIClcblxuICAgICAgICAgIGlmIGFsbE90aGVyc0Rpc2VuZ2FnZWRcblxuICAgICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5yZW1vdmVDbGFzcygnbm90LWVkaXRhYmxlJykuYWRkQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBlbHNlIGlmIGlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94Jykubm90KCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5yZW1vdmVDbGFzcygnbm90LWVkaXRhYmxlJykuYWRkQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBpZiBAbW9kZWwuaWQgaXMgJ2Fzc2lnbm1lbnRfc2VsZWN0aW9uJ1xuICAgICAgICAgIFxuICAgICAgICAgIGFwcGxpY2F0aW9uLmhvbWVWaWV3LnVwZGF0ZVNlbGVjdGVkUGF0aHdheSgncmVtb3ZlJywgaWQpXG5cbiAgICBlbHNlIGlmIGlucHV0VHlwZSA9PSAndGV4dCcgfHwgaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICBpZiBoYXNQYXRod2F5XG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS52YWx1ZSA9IHZhbHVlXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gdmFsdWVcblxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG5cblxuXG4gICAgXG4gICAgXG5cbiBcblxuIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbkRldGFpbHNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicycpXG5cbkdyYWRpbmdUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicycpXG5cbkdyYWRpbmdDdXN0b21UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ0FsdFRlbXBsYXRlLmhicycpXG5cbk9wdGlvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicycpXG5cbldpemFyZERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVGltZWxpbmVWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyBcblxuICBlbDogJCgnLmZvcm0tY29udGFpbmVyJylcblxuICB3aWtpU3BhY2U6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX08YnIvPidcblxuICB3aWtpTm9DbGFzczogJ05PIENMQVNTIFdFRUsgT0YgJ1xuXG4gIGN1ckRhdGVDb25maWc6XG5cbiAgICB0ZXJtU3RhcnQ6IFdpemFyZERhdGEuY291cnNlX2RldGFpbHMudGVybV9zdGFydF9kYXRlXG5cbiAgICB0ZXJtRW5kOiBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLnRlcm1fZW5kX2RhdGVcblxuICAgIGNvdXJzZVN0YXJ0OiBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLnN0YXJ0X2RhdGVcblxuICAgIGNvdXJzZUVuZDogV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5lbmRfZGF0ZVxuXG4gICAgY291cnNlU3RhcnRXZWVrT2Y6IFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuc3RhcnRfd2Vla29mX2RhdGVcblxuICAgIGNvdXJzZUVuZFdlZWtPZjogV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5lbmRfd2Vla29mX2RhdGVcblxuICAgIG51bWJlcldlZWtzOiBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLmxlbmd0aF9pbl93ZWVrc1xuXG5cbiAgZGF5c1NlbGVjdGVkOiBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLndlZWtkYXlzX3NlbGVjdGVkXG5cblxuICBibGFja291dERhdGVzOiBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLmJsYWNrb3V0X2RhdGVzXG5cbiAgZGVmYXVsdENvdXJzZUxlbmd0aDogMTZcblxuICBkZWZhdWx0RW5kRGF0ZXM6IFsnMDYtMzAnLCAnMTItMzEnXVxuXG4gIGFsbERhdGVzOiBbXVxuXG5cbiAgZG93TmFtZXM6IFsnTW9uZGF5JywgJ1R1ZXNkYXknLCAnV2VkbmVzZGF5JywgJ1RodXJzZGF5JywgJ0ZyaWRheScsICdTYXR1cmRheScsICdTdW5kYXknXVxuXG5cbiAgZG93QWJicnY6IFsnTW9uJywgJ1R1ZXMnLCAnV2VkJywgJ1RodXInLCAnRnJpJywgJ1NhdCcsICdTdW4nXVxuXG5cbiAgZG93TGV0dGVyOiBbJ00nLCAnVCcsICdXJywgJ1RoJywgJ0YnLCAnU2EnLCAnU3UnXVxuXG5cbiAgcmVuZGVyRGF5czogdHJ1ZVxuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ21vdXNlZG93biAjY0xlbmd0aCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNldXAgI2NMZW5ndGgnICA6ICdjaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSAjY0xlbmd0aCcgOiAnY2hhbmdlSGFuZGxlcidcblxuICAgICdjaGFuZ2UgI3Rlcm1TdGFydERhdGUnIDogJ29uVGVybVN0YXJ0RGF0ZUNoYW5nZSdcblxuICAgICdjaGFuZ2UgI3Rlcm1FbmREYXRlJyA6ICdvblRlcm1FbmREYXRlQ2hhbmdlJ1xuXG4gICAgJ2NoYW5nZSAjY291cnNlU3RhcnREYXRlJyA6ICdvbkNvdXJzZVN0YXJ0RGF0ZUNoYW5nZSdcblxuICAgICdjaGFuZ2UgI2NvdXJzZUVuZERhdGUnIDogJ29uQ291cnNlRW5kRGF0ZUNoYW5nZSdcblxuICAgICdjaGFuZ2UgLmRvd0NoZWNrYm94JyA6ICdvbkRvd1NlbGVjdCdcblxuICBvbkRvd1NlbGVjdDogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBkb3cgPSAkdGFyZ2V0LmF0dHIoJ2lkJylcblxuICAgIGRvd0lkID0gcGFyc2VJbnQoJHRhcmdldC52YWwoKSlcblxuICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgQGRheXNTZWxlY3RlZFtkb3dJZF0gPSB0cnVlXG5cblxuXG4gICAgZWxzZVxuXG4gICAgICBAZGF5c1NlbGVjdGVkW2Rvd0lkXSA9IGZhbHNlXG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLndlZWtkYXlzX3NlbGVjdGVkID0gQGRheXNTZWxlY3RlZFxuICAgIFxuICAgIEB1cGRhdGUoKVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgXG4gICAgJCgnaW5wdXRbdHlwZT1cImRhdGVcIl0nKS5kYXRlcGlja2VyKFxuXG4gICAgICBkYXRlRm9ybWF0OiAneXktbW0tZGQnXG5cbiAgICAgIGNvbnN0cmFpbklucHV0OiB0cnVlXG5cbiAgICAgIGZpcnN0RGF5OiAxXG5cbiAgICApLnByb3AoJ3R5cGUnLCd0ZXh0JylcblxuXG4gICAgQCRibGFja291dERhdGVzID0gJCgnI2JsYWNrb3V0RGF0ZXMnKVxuXG4gICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoXG5cbiAgICAgIGRhdGVGb3JtYXQ6ICd5eS1tbS1kZCdcblxuICAgICAgY29uc3RyYWluSW5wdXQ6IHRydWVcblxuICAgICAgZmlyc3REYXk6IDFcbiAgICApXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZSA9ICQoJyNzdGFydFdlZWtPZkRhdGUnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUgPSAkKCcjY291cnNlU3RhcnREYXRlJylcblxuICAgIEAkY291cnNlRW5kRGF0ZSA9ICQoJyNjb3Vyc2VFbmREYXRlJylcblxuICAgIEAkdGVybVN0YXJ0RGF0ZSA9ICQoJyN0ZXJtU3RhcnREYXRlJylcblxuICAgIEAkdGVybUVuZERhdGUgPSAgICQoJyN0ZXJtRW5kRGF0ZScpXG5cbiAgICBAJG91dENvbnRhaW5lciA9ICQoJy5vdXRwdXQtY29udGFpbmVyJylcblxuICAgIEAkcHJldmlld0NvbnRhaW5lciA9ICQoJy5wcmV2aWV3LWNvbnRhaW5lcicpXG5cbiAgICBAJGNvdXJzZUxlbmd0aElucHV0ID0gJCgnI2NMZW5ndGgnKVxuXG4gICAgQGNvdXJzZUxlbmd0aCA9IEAkY291cnNlTGVuZ3RoSW5wdXQudmFsKClcblxuICAgIEBjb3Vyc2VEaWZmID0gMFxuXG4gICAgQGRhdGEgPSBbXVxuXG4gICAgQGRhdGEgPSBhcHBsaWNhdGlvbi50aW1lbGluZURhdGFBbHRcblxuICAgIEBkYXRhQWx0ID0gYXBwbGljYXRpb24udGltZWxpbmVEYXRhXG5cbiAgICAkKCcjY0xlbmd0aCcpLm9uICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgIEBjaGFuZ2VIYW5kbGVyKGUpXG5cbiAgICAkKCcjY0xlbmd0aCcpLm9uICdtb3VzZWRvd24nLCAoZSkgPT5cbiAgICAgIEBjaGFuZ2VIYW5kbGVyKGUpXG5cbiAgICAkKCcjY0xlbmd0aCcpLm9uICdtb3VzZXVwJywgKGUpID0+XG4gICAgICBAY2hhbmdlSGFuZGxlcihlKVxuXG4gICAgJCgnI3Rlcm1TdGFydERhdGUnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAb25UZXJtU3RhcnREYXRlQ2hhbmdlKGUpXG5cbiAgICAkKCcjdGVybUVuZERhdGUnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAb25UZXJtRW5kRGF0ZUNoYW5nZShlKVxuXG4gICAgJCgnI2NvdXJzZVN0YXJ0RGF0ZScpLm9uICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgIEBvbkNvdXJzZVN0YXJ0RGF0ZUNoYW5nZShlKVxuXG4gICAgJCgnI2NvdXJzZUVuZERhdGUnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAb25Db3Vyc2VFbmREYXRlQ2hhbmdlKGUpXG5cbiAgICAkKCcuZG93Q2hlY2tib3gnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAb25Eb3dTZWxlY3QoZSlcblxuICAgICQoJyN0ZXJtU3RhcnREYXRlJykub24gJ2ZvY3VzJywgKGUpID0+XG4gICAgICAkKCdib2R5LGh0bWwnKS5hbmltYXRlKFxuICAgICAgICBzY3JvbGxUb3A6ICQoJyN0ZXJtU3RhcnREYXRlJykub2Zmc2V0KCkudG9wIC0gMzUwXG4gICAgICAsIDQwMClcblxuICAgIEB1cGRhdGUoKVxuXG4gIG9uVGVybVN0YXJ0RGF0ZUNoYW5nZTogKGUpIC0+XG5cbiAgICBkYXRlSW5wdXRWYWwgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgIGRhdGVNb21lbnQgPSBtb21lbnQoZGF0ZUlucHV0VmFsKVxuXG4gICAgZGF0ZU9iamVjdCA9IGRhdGVNb21lbnQudG9EYXRlKClcblxuICAgIEBjdXJEYXRlQ29uZmlnLnRlcm1TdGFydCA9IGRhdGVPYmplY3RcblxuICAgIGlzQWZ0ZXIgPSBkYXRlTW9tZW50LmlzQWZ0ZXIoXCIje2RhdGVNb21lbnQueWVhcigpfS0wNi0wMVwiKVxuXG4gICAgaWYgaXNBZnRlclxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKX0tI3tAZGVmYXVsdEVuZERhdGVzWzFdfVwiXG4gICAgZWxzZVxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKX0tI3tAZGVmYXVsdEVuZERhdGVzWzBdfVwiXG5cblxuICAgIEAkY291cnNlU3RhcnREYXRlLnZhbChAdG9TdHJpbmcoZGF0ZU9iamVjdCkpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBAJHRlcm1FbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKVxuXG4gICAgQHVwZGF0ZSgpXG5cblxuICBvblRlcm1FbmREYXRlQ2hhbmdlOiAoZSkgLT5cblxuICAgIGRhdGVJbnB1dCA9ICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoKVxuXG4gICAgbmV3RGF0ZSA9IG1vbWVudChkYXRlSW5wdXQpLnRvRGF0ZSgpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy50ZXJtRW5kID0gbmV3RGF0ZVxuXG4gICAgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy50ZXJtX2VuZF9kYXRlID0gQHRvU3RyaW5nKG5ld0RhdGUpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VFbmQgPSBuZXdEYXRlXG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLmVuZF9kYXRlID0gQHRvU3RyaW5nKG5ld0RhdGUpXG5cbiAgICBAJGNvdXJzZUVuZERhdGUudmFsKGRhdGVJbnB1dCkudHJpZ2dlcignY2hhbmdlJylcblxuICAgIEB1cGRhdGUoKVxuXG5cbiAgb25Db3Vyc2VTdGFydERhdGVDaGFuZ2U6IChlKSAtPlxuXG4gICAgZGF0ZUlucHV0ID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICBkYXRlTW9tZW50ID0gbW9tZW50KGRhdGVJbnB1dClcblxuICAgIG5ld0RhdGUgPSBkYXRlTW9tZW50LnRvRGF0ZSgpXG5cbiAgICBXaXphcmREYXRhLmludHJvLndpemFyZF9zdGFydF9kYXRlLnZhbHVlID0gZGF0ZUlucHV0XG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLnN0YXJ0X2RhdGUgPSBkYXRlSW5wdXRcblxuICAgIGlzQWZ0ZXIgPSBkYXRlTW9tZW50LmlzQWZ0ZXIoXCIje2RhdGVNb21lbnQueWVhcigpfS0wNi0wMVwiKVxuXG4gICAgaWYgaXNBZnRlclxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKX0tI3tAZGVmYXVsdEVuZERhdGVzWzFdfVwiXG4gICAgZWxzZVxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKX0tI3tAZGVmYXVsdEVuZERhdGVzWzBdfVwiXG5cbiAgICAjIEBjb3Vyc2VMZW5ndGggPSBAZGVmYXVsdENvdXJzZUxlbmd0aFxuXG4gICAgIyBAY291cnNlRGlmZiA9IDBcblxuICAgICMgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5sZW5ndGhfaW5fd2Vla3MgPSBwYXJzZUludChAY291cnNlTGVuZ3RoKVxuXG4gICAgIyBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VFbmRXZWVrT2YgPSBuZXcgRGF0ZShAYWxsRGF0ZXNbQGNvdXJzZUxlbmd0aC0xXSlcblxuICAgICMgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5lbmRfd2Vla29mX2RhdGUgPSBAdG9TdHJpbmcoQGN1ckRhdGVDb25maWcuY291cnNlRW5kV2Vla09mKVxuXG4gICAgQGN1ckRhdGVDb25maWcuY291cnNlU3RhcnQgPSBuZXdEYXRlXG5cbiAgICBAdXBkYXRlKClcblxuICAgIEAkY291cnNlRW5kRGF0ZS52YWwoZW5kRGF0ZVN0cmluZykudHJpZ2dlcignY2hhbmdlJylcblxuICAgIFxuXG4gIG9uQ291cnNlRW5kRGF0ZUNoYW5nZTogKGUpIC0+XG5cbiAgICBpZiBAJGNvdXJzZVN0YXJ0RGF0ZS52YWwoKSBpcyAnJ1xuICAgICAgcmV0dXJuXG5cbiAgICBkU3RhcnQgPSBAJGNvdXJzZVN0YXJ0RGF0ZS52YWwoKVxuXG4gICAgZEVuZCA9IEAkY291cnNlRW5kRGF0ZS52YWwoKVxuXG4gICAgV2l6YXJkRGF0YS5pbnRyby53aXphcmRfZW5kX2RhdGUudmFsdWUgPSBkRW5kXG5cbiAgICBuZXdTdGFydCA9IG1vbWVudChkU3RhcnQpXG5cbiAgICBuZXdFbmQgPSBtb21lbnQoZEVuZClcblxuICAgIG5ld0xlbmd0aCA9IEBnZXRXZWVrc0RpZmYobmV3U3RhcnQsbmV3RW5kKVxuXG4gICAgaWYgbmV3TGVuZ3RoIDwgNiBcbiAgICAgIG5ld0xlbmd0aCA9IDZcbiAgICBlbHNlIGlmIG5ld0xlbmd0aCA+IDE2XG4gICAgICBuZXdMZW5ndGggPSAxNlxuXG4gICAgQGNvdXJzZUxlbmd0aCA9IG5ld0xlbmd0aFxuICAgIFxuICAgIEBjb3Vyc2VEaWZmID0gMTYgLSBAY291cnNlTGVuZ3RoXG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLmxlbmd0aF9pbl93ZWVrcyA9IHBhcnNlSW50KEBjb3Vyc2VMZW5ndGgpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VFbmRXZWVrT2YgPSBuZXcgRGF0ZShAYWxsRGF0ZXNbQGNvdXJzZUxlbmd0aC0xXSlcblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZW5kX3dlZWtvZl9kYXRlID0gQHRvU3RyaW5nKEBjdXJEYXRlQ29uZmlnLmNvdXJzZUVuZFdlZWtPZilcbiAgICBcbiAgICBpZiBAY291cnNlTGVuZ3RoXG4gICAgICAkKCdvdXRwdXRbbmFtZT1cIm91dDJcIl0nKS5odG1sKEBjb3Vyc2VMZW5ndGggKyAnIHdlZWtzJylcbiAgICBlbHNlXG4gICAgICAkKCdvdXRwdXRbbmFtZT1cIm91dDJcIl0nKS5odG1sKCcnKVxuXG4gICAgQHVwZGF0ZSgpXG5cblxuICB1cGRhdGVXZWVrbHlEYXRlczogLT5cblxuICAgIGlmIEAkY291cnNlU3RhcnREYXRlLnZhbCgpIGlzICcnXG5cbiAgICAgIEBjdXJEYXRlQ29uZmlnLmNvdXJzZVN0YXJ0ID0gJydcblxuICAgICAgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5zdGFydF9kYXRlID0gJydcblxuICAgICAgJCgnc3Bhbi5kYXRlJykuaGlkZSgpXG5cbiAgICAgIHJldHVyblxuXG4gICAgaWYgQCRjb3Vyc2VFbmREYXRlLnZhbCgpIGlzICcnXG5cbiAgICAgIEBjdXJEYXRlQ29uZmlnLmNvdXJzZUVuZCA9ICcnXG5cbiAgICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZW5kX2RhdGUgPSAnJ1xuXG4gICAgICAkKCdzcGFuLmRhdGUnKS5oaWRlKClcblxuICAgICAgcmV0dXJuXG5cbiAgICBAYWxsRGF0ZXMgPSBbXVxuXG4gICAgbmV3U3RhcnREYXRlID0gbmV3IERhdGUoQCRjb3Vyc2VTdGFydERhdGUudmFsKCkpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VTdGFydCA9IG5ld1N0YXJ0RGF0ZVxuXG4gICAgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5zdGFydF9kYXRlID0gQHRvU3RyaW5nKG5ld1N0YXJ0RGF0ZSlcblxuICAgIHdlZWtPZkRhdGUgPSBAZ2V0V2Vla09mRGF0ZShuZXdTdGFydERhdGUpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VTdGFydFdlZWtPZiA9IHdlZWtPZkRhdGVcblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuc3RhcnRfd2Vla29mX2RhdGUgPSBAdG9TdHJpbmcod2Vla09mRGF0ZSlcblxuXG4gICAgbmV3RW5kRGF0ZSA9IG5ldyBEYXRlKEAkY291cnNlRW5kRGF0ZS52YWwoKSlcblxuICAgIEBjdXJEYXRlQ29uZmlnLmNvdXJzZUVuZCA9IG5ld0VuZERhdGVcblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZW5kX2RhdGUgPSBAdG9TdHJpbmcobmV3RW5kRGF0ZSlcblxuICAgIGNvdXJzZUVuZFdlZWtPZiA9IEBnZXRXZWVrT2ZEYXRlKG5ld0VuZERhdGUpXG5cbiAgICBAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VFbmRXZWVrT2YgPSBjb3Vyc2VFbmRXZWVrT2ZcblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZW5kX3dlZWtvZl9kYXRlID0gQHRvU3RyaW5nKGNvdXJzZUVuZFdlZWtPZilcblxuICAgIGQgPSAwIFxuXG4gICAgd2hpbGUgZCA8IDIwXG5cbiAgICAgIG5ld0RhdGUgPSBuZXcgRGF0ZSh3ZWVrT2ZEYXRlKVxuXG4gICAgICBpZiBkIGlzIDBcblxuICAgICAgICBAYWxsRGF0ZXMucHVzaChAZ2V0Rm9ybWF0dGVkRGF0ZVN0cmluZyhuZXcgRGF0ZShuZXdEYXRlKSkpXG5cbiAgICAgIGVsc2UgXG5cbiAgICAgICAgbmV3RGF0ZSA9IG5ld0RhdGUuc2V0RGF0ZShuZXdEYXRlLmdldERhdGUoKSArICg3ICogKGQpKSlcblxuICAgICAgICBAYWxsRGF0ZXMucHVzaChAZ2V0Rm9ybWF0dGVkRGF0ZVN0cmluZyhuZXcgRGF0ZShuZXdEYXRlKSkpXG5cbiAgICAgIGQrK1xuXG4gICAgJCgnc3Bhbi5kYXRlJykuZWFjaCgoaW5kZXgsaXRlbSkgPT5cblxuXG4gICAgICBuZXdEYXRlID0gQGFsbERhdGVzW2luZGV4XVxuXG4gICAgICAjIGlmIGluZGV4IGlzIDBcblxuICAgICAgIyAgIEBhbGxEYXRlcy5wdXNoKEBnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ldyBEYXRlKG5ld0RhdGUpKSlcblxuICAgICAgIyAgIHJldHVyblxuXG4gICAgICAjIG5ld0RhdGUgPSBuZXdEYXRlLnNldERhdGUobmV3RGF0ZS5nZXREYXRlKCkgKyAoNyAqICh3ZWVrSWQtMSkpKVxuXG4gICAgICAjIEBhbGxEYXRlcy5wdXNoKEBnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ldyBEYXRlKG5ld0RhdGUpKSlcblxuICAgICAgJChpdGVtKS5zaG93KCkudGV4dChuZXdEYXRlKVxuXG4gICAgKVxuXG4gICAgJCgnc3Bhbi5kYXRlLmRhdGUtMScpLnNob3coKS50ZXh0KEBnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ld1N0YXJ0RGF0ZSkpXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZS52YWwoXCIje0BnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ld1N0YXJ0RGF0ZSl9XCIpXG5cbiAgICAkKCcuZGF0ZXMtcHJldmlldycpLmh0bWwoJycpXG5cbiAgICAkKCcuZGF0ZXMtcHJldmlldycpLmVhY2goKGluZCwgaXRlbSkgPT5cblxuICAgICAgXy5lYWNoKEBkYXlzU2VsZWN0ZWQsIChzZWxlY3RlZCwgc2VsZWN0ZWRJbmRleCkgPT5cblxuICAgICAgICBpZiBzZWxlY3RlZFxuXG4gICAgICAgICAgaWYgaW5kID09IDBcbiAgICAgICAgICAgIHRoZURhdGUgPSBuZXcgRGF0ZSh3ZWVrT2ZEYXRlKVxuXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdGhlRGF0ZSA9IG5ldyBEYXRlKEBhbGxEYXRlc1tpbmRdKVxuXG4gICAgICAgICAgdGhlRGF0ZSA9IHRoZURhdGUuc2V0RGF0ZSh0aGVEYXRlLmdldERhdGUoKSArIChzZWxlY3RlZEluZGV4KSlcblxuICAgICAgICAgICQoaXRlbSkuYXBwZW5kKFwiPGRpdiBjbGFzcz0nZG93LWRhdGUgZG93LWRhdGUtLSN7c2VsZWN0ZWRJbmRleH0nID48c3BhbiBjb250ZW50ZWRpdGFibGU+I3tAZG93TmFtZXNbc2VsZWN0ZWRJbmRleF19IHwgPC9zcGFuPjxzcGFuIGNvbnRlbnRlZGl0YWJsZT4je0BnZXRGb3JtYXR0ZWREYXRlU3RyaW5nKG5ldyBEYXRlKHRoZURhdGUpKX08L3NwYW4+PC9kaXY+XCIpXG4gICAgICApXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgY2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm5cblxuICAgIFxuICBjaGFuZ2VIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBjb3Vyc2VMZW5ndGggPSAkKCcjY0xlbmd0aCcpLnZhbCgpXG5cbiAgICBAY291cnNlRGlmZiA9IDE2IC0gQGNvdXJzZUxlbmd0aFxuXG4gICAgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5sZW5ndGhfaW5fd2Vla3MgPSBwYXJzZUludChAY291cnNlTGVuZ3RoKVxuXG4gICAgQGN1ckRhdGVDb25maWcuY291cnNlRW5kV2Vla09mID0gbmV3IERhdGUoQGFsbERhdGVzW0Bjb3Vyc2VMZW5ndGgtMV0pXG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLmVuZF93ZWVrb2ZfZGF0ZSA9IEB0b1N0cmluZyhAY3VyRGF0ZUNvbmZpZy5jb3Vyc2VFbmRXZWVrT2YpXG5cbiAgICBAdXBkYXRlKClcblxuXG4gIHVwZGF0ZTogLT5cblxuICAgIEBvdXQgPSBbXVxuXG4gICAgQG91dFdpa2kgPSBbXVxuXG4gICAgdW5pdHNDbG9uZSA9IF8uY2xvbmUoQGRhdGEpXG5cbiAgICBpZiBAY291cnNlRGlmZiA+IDBcblxuICAgICAgdW5pdHNDbG9uZSA9IF8ucmVqZWN0KHVuaXRzQ2xvbmUsIChpdGVtKSA9PlxuXG4gICAgICAgIHJldHVybiBpdGVtLnR5cGUgaXMgJ2JyZWFrJyAmJiBAY291cnNlRGlmZiA+PSBpdGVtLnZhbHVlICYmIGl0ZW0udmFsdWUgIT0gMFxuXG4gICAgICApXG5cbiAgICBvYmogPSB1bml0c0Nsb25lWzBdXG5cbiAgICBfLmVhY2godW5pdHNDbG9uZSwgKGl0ZW0sIGluZGV4KSA9PlxuXG4gICAgICBpZiBpdGVtLnR5cGUgaXMgJ2JyZWFrJyB8fCBpbmRleCBpcyB1bml0c0Nsb25lLmxlbmd0aCAtIDFcblxuICAgICAgICBpZiBpbmRleCBpcyB1bml0c0Nsb25lLmxlbmd0aCAtIDFcblxuICAgICAgICAgIEBvdXQucHVzaCBfLmNsb25lKGl0ZW0pXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgQG91dC5wdXNoIF8uY2xvbmUob2JqKVxuXG4gICAgICAgIG9iaiA9IHt9XG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGVsc2UgaWYgaXRlbS50eXBlIGlzICd3ZWVrJ1xuXG4gICAgICAgIG9iaiA9IEBjb21iaW5lKG9iaiwgaXRlbSlcblxuICAgIClcblxuICAgIEBvdXRXaWtpID0gQG91dFxuXG4gICAgQHJlbmRlclByZXZpZXcoKVxuXG4gICAgQHJlbmRlclJlc3VsdCgpXG5cbiAgICBAdXBkYXRlV2Vla2x5RGF0ZXMoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnb3V0cHV0OnVwZGF0ZScsIEAkb3V0Q29udGFpbmVyLnRleHQoKSlcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2RhdGU6Y2hhbmdlJywgQClcblxuXG4gIHJlbmRlclByZXZpZXc6IC0+XG5cbiAgICBAJHByZXZpZXdDb250YWluZXIuaHRtbCgnJylcblxuICAgIF8uZWFjaChAb3V0LCAoaXRlbSwgaW5kZXgpID0+XG5cbiAgICAgIHRoaXNXZWVrID0gaW5kZXggKyAxXG4gICAgICBuZXh0V2VlayA9IGluZGV4ICsgMlxuICAgICAgaXNMYXN0V2VlayA9IGluZGV4IGlzIEBvdXQubGVuZ3RoIC0gMVxuXG4gICAgICAjIHJlbmRlclRpdGxlcygpXG4gICAgICBpZiBpdGVtLnRpdGxlLmxlbmd0aCA+IDBcblxuICAgICAgICB0aXRsZXMgPSBcIjxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyLWhlYWRlcic+XCJcblxuICAgICAgICB0aXRsZXMgKz0gXCI8aDQgZGF0YS13ZWVrPScje3RoaXNXZWVrfSc+V2VlayAje3RoaXNXZWVrfTxzcGFuIGNsYXNzPSdkYXRlIGRhdGUtI3t0aGlzV2Vla30nIGRhdGEtd2Vlaz0nI3t0aGlzV2Vla30nPjwvc3Bhbj48L2g0PlwiXG5cbiAgICAgICAgXy5lYWNoKGl0ZW0udGl0bGUsICh0LCBpKSAtPlxuXG4gICAgICAgICAgaWYgaSBpcyAwXG5cbiAgICAgICAgICAgdGl0bGVzICs9IFwiPGgyIGNsYXNzPSdwcmV2aWV3LWNvbnRhaW5lci13ZWVrbHktdGl0bGUnPiN7dH08L2gyPlwiXG5cbiAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIHRpdGxlcyArPSBcIjxoMyBjbGFzcz0ncHJldmlldy1jb250YWluZXItd2Vla2x5LXRpdGxlIHByZXZpZXctY29udGFpbmVyLXdlZWtseS10aXRsZS0tc21hbGxlcic+I3t0fTwvaDM+XCJcblxuICAgICAgICApXG5cbiAgICAgICAgdGl0bGVzICs9IFwiPC9kaXY+XCJcblxuICAgICAgICBAJHByZXZpZXdDb250YWluZXIuYXBwZW5kKHRpdGxlcylcblxuICAgICAgZGF0ZXNPdXQgPSBcIjxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyLWRhdGVzIGRhdGVzLXByZXZpZXcgZGF0ZXMtcHJldmlldy0je3RoaXNXZWVrfScgZGF0YS13ZWVrPScje3RoaXNXZWVrfSc+PC9kaXY+XCJcblxuICAgICAgQCRwcmV2aWV3Q29udGFpbmVyLmFwcGVuZChkYXRlc091dClcblxuICAgICAgcHJldmlld0RldGFpbHMgPSBcIjxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyLWRldGFpbHMnPlwiXG5cbiAgICAgICMgcmVuZGVySW5DbGFzcygpXG4gICAgICBpZiBpdGVtLmluX2NsYXNzLmxlbmd0aCA+IDBcblxuICAgICAgICBpbkNsYXNzT3V0ID0gJzxkaXY+J1xuXG4gICAgICAgIGluQ2xhc3NPdXQgKz0gXCI8aDUgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+SW4gY2xhc3M8L2g1PlwiXG5cbiAgICAgICAgaW5DbGFzc091dCArPSAnPHVsPidcblxuICAgICAgICBfLmVhY2goaXRlbS5pbl9jbGFzcywgKGMpIC0+XG5cbiAgICAgICAgICBpbkNsYXNzT3V0ICs9IFwiPGxpPiN7Yy50ZXh0fTwvbGk+XCJcblxuICAgICAgICApXG5cbiAgICAgICAgaW5DbGFzc091dCArPSBcIjwvdWw+XCJcblxuICAgICAgICBpbkNsYXNzT3V0ICs9IFwiPC9kaXY+XCJcblxuICAgICAgICBwcmV2aWV3RGV0YWlscyArPSBpbkNsYXNzT3V0XG5cbiAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG4gICAgICAgIGFzc2lnbm1lbnRzT3V0ID0gXCI8ZGl2PlwiXG5cbiAgICAgICAgYXNzaWdubWVudHNPdXQgKz0gXCI8aDUgc3R5bGU9J2ZvbnQtd2VpZ2h0OiBib2xkOyc+QXNzaWdubWVudHMgfCBkdWUgd2VlayAje25leHRXZWVrfTwvaDU+XCJcblxuICAgICAgICBhc3NpZ25tZW50c091dCArPSAnPHVsPidcblxuICAgICAgICBfLmVhY2goaXRlbS5hc3NpZ25tZW50cywgKGFzc2lnbikgLT5cbiAgICAgICAgICBhc3NpZ25tZW50c091dCArPSBcIjxsaT4je2Fzc2lnbi50ZXh0fTwvbGk+XCIgXG4gICAgICAgIClcblxuICAgICAgICBhc3NpZ25tZW50c091dCArPSAnPC91bD4nXG5cbiAgICAgICAgYXNzaWdubWVudHNPdXQgKz0gJzwvZGl2PidcblxuICAgICAgICBwcmV2aWV3RGV0YWlscyArPSBhc3NpZ25tZW50c091dFxuXG4gICAgICBpZiBpdGVtLm1pbGVzdG9uZXMubGVuZ3RoID4gMFxuXG4gICAgICAgIG1pbGVzdG9uZXNPdXQgPSBcIjxkaXY+XCJcblxuICAgICAgICBtaWxlc3RvbmVzT3V0ICs9IFwiPGg1IHN0eWxlPSdmb250LXdlaWdodDogYm9sZDsnPk1pbGVzdG9uZXM8L2g1PlwiXG5cbiAgICAgICAgbWlsZXN0b25lc091dCArPSBcIjx1bD5cIlxuXG4gICAgICAgIF8uZWFjaChpdGVtLm1pbGVzdG9uZXMsIChtaWxlc3RvbmUpIC0+XG4gICAgICAgICAgbWlsZXN0b25lc091dCArPSBcIjxsaT4je21pbGVzdG9uZS50ZXh0fTwvbGk+XCJcbiAgICAgICAgKVxuXG4gICAgICAgIG1pbGVzdG9uZXNPdXQgKz0gXCI8L3VsPlwiXG5cbiAgICAgICAgbWlsZXN0b25lc091dCArPSBcIjwvZGl2PlwiXG5cbiAgICAgICAgcHJldmlld0RldGFpbHMgKz0gbWlsZXN0b25lc091dFxuXG5cbiAgICAgIEAkcHJldmlld0NvbnRhaW5lci5hcHBlbmQocHJldmlld0RldGFpbHMpXG5cblxuICAgIClcblxuXG4gIHJlbmRlclJlc3VsdDogLT5cblxuICAgIGN1cnJlbnRCbGFja291dERhdGVzID0gQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ2dldERhdGVzJylcblxuICAgIEAkb3V0Q29udGFpbmVyLmh0bWwoJycpXG5cbiAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoRGV0YWlsc1RlbXBsYXRlKCBfLmV4dGVuZChXaXphcmREYXRhLHsgZGVzY3JpcHRpb246IFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb259KSkpXG5cbiAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzWzBdIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICBhZGRXZWVrcyA9IDBcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoJ3t7dGFibGUgb2YgY29udGVudHN9fScpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKCc9PVRpbWVsaW5lPT0nKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIGN1cldlZWtPZmZzZXQgPSAwXG5cbiAgICAgIF8uZWFjaChAb3V0V2lraSwgKGl0ZW0sIGluZGV4KSA9PlxuXG4gICAgICAgIHRoaXNXZWVrID0gaW5kZXggKyAxXG5cbiAgICAgICAgbmV4dFdlZWsgPSBpbmRleCArIDJcblxuICAgICAgICBpc0xhc3RXZWVrID0gaW5kZXggaXMgQG91dC5sZW5ndGggLSAxXG5cbiAgICAgICAgbm9DbGFzc1RoaXNXZWVrID0gZmFsc2VcblxuICAgICAgICBkb3dEYXRlU3RyaW5ncyA9IFtdXG5cbiAgICAgICAgaWYgQGFsbERhdGVzLmxlbmd0aCA+IDBcblxuICAgICAgICAgIHRoaXNXZWVrc0RhdGVzID0gW11cblxuICAgICAgICAgIG5vQ2xhc3NEYXRlcyA9IFtdXG5cbiAgICAgICAgICBfLmVhY2goQGRheXNTZWxlY3RlZCwgKGRheSxkYXlJbmRleCkgPT5cblxuICAgICAgICAgICAgaWYgZGF5IFxuXG4gICAgICAgICAgICAgIGRvd0xldHRlciA9IEBkb3dBYmJydltkYXlJbmRleF1cblxuICAgICAgICAgICAgICB0aGVEYXRlID0gbmV3IERhdGUoQGFsbERhdGVzW2luZGV4K2N1cldlZWtPZmZzZXRdKVxuXG4gICAgICAgICAgICAgIHRoZURhdGUgPSB0aGVEYXRlLnNldERhdGUodGhlRGF0ZS5nZXREYXRlKCkgKyAoZGF5SW5kZXgpKVxuXG4gICAgICAgICAgICAgIGRhdGVTdHJpbmcgPSBAdG9TdHJpbmcobmV3IERhdGUodGhlRGF0ZSkpXG5cbiAgICAgICAgICAgICAgdGhpc1dlZWtzRGF0ZXMucHVzaChkYXRlU3RyaW5nKVxuXG4gICAgICAgICAgICAgIGlmIF8uaW5kZXhPZihjdXJyZW50QmxhY2tvdXREYXRlcywgZGF0ZVN0cmluZykgIT0gLTFcblxuICAgICAgICAgICAgICAgIGZ1bGxEYXRlU3RyaW5nID0gXCJOTyBDTEFTUzogI3tkb3dMZXR0ZXJ9ICN7ZGF0ZVN0cmluZ31cIlxuXG4gICAgICAgICAgICAgICAgbm9DbGFzc0RhdGVzLnB1c2goZGF0ZVN0cmluZylcblxuICAgICAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgICAgICBmdWxsRGF0ZVN0cmluZyA9IFwiI3tkb3dMZXR0ZXJ9ICN7ZGF0ZVN0cmluZ31cIlxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgZG93RGF0ZVN0cmluZ3MucHVzaChmdWxsRGF0ZVN0cmluZylcblxuICAgICAgICAgIClcblxuICAgICAgICAgIGlmIG5vQ2xhc3NEYXRlcy5sZW5ndGggPiAwICYmIHRoaXNXZWVrc0RhdGVzLmxlbmd0aCA+IDBcblxuICAgICAgICAgICAgaWYgbm9DbGFzc0RhdGVzLmxlbmd0aCA9PSB0aGlzV2Vla3NEYXRlcy5sZW5ndGhcblxuICAgICAgICAgICAgICBub0NsYXNzVGhpc1dlZWsgPSB0cnVlXG5cbiAgICAgICAgICAgICAgY3VyV2Vla09mZnNldCArPSAxXG5cbiAgICAgICAgICAgICAgZG93RGF0ZVN0cmluZ3MgPSBbXVxuXG4gICAgICAgICAgICAgIHRoaXNXZWVrc0RhdGVzID0gW11cblxuICAgICAgICAgICAgICBub0NsYXNzRGF0ZXMgPSBbXVxuXG4gICAgICAgICAgICAgIF8uZWFjaChAZGF5c1NlbGVjdGVkLCAoZGF5LGRheUluZGV4KSA9PlxuXG4gICAgICAgICAgICAgICAgaWYgZGF5IFxuXG4gICAgICAgICAgICAgICAgICBkb3dMZXR0ZXIgPSBAZG93QWJicnZbZGF5SW5kZXhdXG5cbiAgICAgICAgICAgICAgICAgIHRoZURhdGUgPSBuZXcgRGF0ZShAYWxsRGF0ZXNbaW5kZXgrMV0pXG5cbiAgICAgICAgICAgICAgICAgIHRoZURhdGUgPSB0aGVEYXRlLnNldERhdGUodGhlRGF0ZS5nZXREYXRlKCkgKyAoZGF5SW5kZXgpKVxuXG4gICAgICAgICAgICAgICAgICBkYXRlU3RyaW5nID0gQHRvU3RyaW5nKG5ldyBEYXRlKHRoZURhdGUpKVxuXG4gICAgICAgICAgICAgICAgICB0aGlzV2Vla3NEYXRlcy5wdXNoKGRhdGVTdHJpbmcpXG5cbiAgICAgICAgICAgICAgICAgIGlmIF8uaW5kZXhPZihjdXJyZW50QmxhY2tvdXREYXRlcywgZGF0ZVN0cmluZykgIT0gLTFcblxuICAgICAgICAgICAgICAgICAgICBmdWxsRGF0ZVN0cmluZyA9IFwiTk8gQ0xBU1M6ICN7ZG93TGV0dGVyfSAje2RhdGVTdHJpbmd9XCJcblxuICAgICAgICAgICAgICAgICAgICBub0NsYXNzRGF0ZXMucHVzaChkYXRlU3RyaW5nKVxuXG4gICAgICAgICAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgICAgICAgICAgZnVsbERhdGVTdHJpbmcgPSBcIiN7ZG93TGV0dGVyfSAje2RhdGVTdHJpbmd9XCJcbiAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgZG93RGF0ZVN0cmluZ3MucHVzaChmdWxsRGF0ZVN0cmluZylcblxuICAgICAgICAgICAgICApXG5cbiAgICAgICAgaWYgbm9DbGFzc1RoaXNXZWVrXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2VuZCBvZiBjb3Vyc2Ugd2Vla319XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG4gICAgICAgICAgXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPT09I3tAd2lraU5vQ2xhc3N9ICN7QGFsbERhdGVzW2luZGV4K2N1cldlZWtPZmZzZXQtMV19PT09XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cblxuICAgICAgICBpZiBpdGVtLnRpdGxlLmxlbmd0aCA+IDBcblxuICAgICAgICAgIHRpdGxlcyA9IFwiXCJcblxuICAgICAgICAgIGV4dHJhID0gaWYgdGhpc1dlZWsgaXMgMSB0aGVuICcxJyBlbHNlICcnXG5cbiAgICAgICAgICB0aXRsZXMgKz0gXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgI3tleHRyYX18ICN7dGhpc1dlZWt9IHwgXCJcblxuICAgICAgICAgIF8uZWFjaChpdGVtLnRpdGxlLCAodCwgaSkgLT5cblxuICAgICAgICAgICAgaWYgaSBpcyAwXG5cbiAgICAgICAgICAgICB0aXRsZXMgKz0gXCIje3R9XCJcblxuICAgICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICAgIHRpdGxlcyArPSBcIiwgI3t0fVwiXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICBpZiBAYWxsRGF0ZXMubGVuZ3RoID4gMFxuXG4gICAgICAgICAgICB0aXRsZXMgKz0gXCIgLSBXZWVrIG9mICN7QGFsbERhdGVzW2luZGV4K2N1cldlZWtPZmZzZXRdfSB8IHdlZWtvZiA9ICN7QGFsbERhdGVzW2luZGV4K2N1cldlZWtPZmZzZXRdfSBcIlxuXG4gICAgICAgICAgdGl0bGVzICs9IFwifX1cIlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKHRpdGxlcylcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcbiAgICBcbiAgICAgICAgICBpZiBkb3dEYXRlU3RyaW5ncy5sZW5ndGggPiAwXG5cbiAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIicnJ0NsYXNzIG1lZXRpbmdzOicnJ1wiKVxuXG4gICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIF8uZWFjaChkb3dEYXRlU3RyaW5ncywgKGRvdywgZG93SW5kZXgpID0+XG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7ZG93fVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIClcblxuICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIFxuICAgICAgICBpZiBpdGVtLmluX2NsYXNzLmxlbmd0aCA+IDBcblxuICAgICAgICAgIF8uZWFjaChpdGVtLmluX2NsYXNzLCAoYywgY2kpID0+XG5cbiAgICAgICAgICAgIGlmIGMuY29uZGl0aW9uICYmIGMuY29uZGl0aW9uICE9ICcnXG5cbiAgICAgICAgICAgICAgY29uZGl0aW9uID0gZXZhbChjLmNvbmRpdGlvbilcblxuICAgICAgICAgICAgICBpZiBjb25kaXRpb24gXG5cbiAgICAgICAgICAgICAgICBpZiBjaSBpcyAwXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7aW4gY2xhc3N9fVwiKVxuXG4gICAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje2Mud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICBpZiBjaSBpcyAwXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2luIGNsYXNzfX1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje2Mud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICAgICAgICAgIClcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuXG4gICAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS5hc3NpZ25tZW50cywgKGFzc2lnbiwgYWkpID0+XG5cbiAgICAgICAgICAgIGlmIGFzc2lnbi5jb25kaXRpb24gJiYgYXNzaWduLmNvbmRpdGlvbiAhPSAnJ1xuXG4gICAgICAgICAgICAgIGNvbmRpdGlvbiA9IGV2YWwoYXNzaWduLmNvbmRpdGlvbilcblxuICAgICAgICAgICAgICBpZiBjb25kaXRpb24gXG5cbiAgICAgICAgICAgICAgICBpZiBhaSBpcyAwXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgI3tuZXh0V2Vla30gfX1cIilcblxuICAgICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3thc3NpZ24ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICBpZiBhaSBpcyAwXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrICN7bmV4dFdlZWt9IH19XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3thc3NpZ24ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIGlmIGl0ZW0ubWlsZXN0b25lcy5sZW5ndGggPiAwXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS5taWxlc3RvbmVzLCAobSkgPT5cblxuICAgICAgICAgICAgaWYgbS5jb25kaXRpb24gJiYgbS5jb25kaXRpb24gIT0gJydcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje20ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3ttLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIClcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICBpZiBpc0xhc3RXZWVrXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2VuZCBvZiBjb3Vyc2Ugd2Vla319XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIClcbiAgICAgIFxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKEdyYWRpbmdUZW1wbGF0ZShXaXphcmREYXRhKSlcblxuICAgIGVsc2VcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoJ3t7dGFibGUgb2YgY29udGVudHN9fScpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgZ3JhZGluZ0l0ZW1zID0gW11cblxuICAgICAgXy5lYWNoKGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXMsIChwYXRod2F5KSA9PlxuXG4gICAgICAgIGdyYWRpbmdJdGVtcy5wdXNoKFdpemFyZERhdGEuZ3JhZGluZ1twYXRod2F5XVtwYXRod2F5XSlcblxuICAgICAgICBfLmVhY2goQGRhdGFBbHRbcGF0aHdheV0sIChpdGVtLCBpbmQpID0+XG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8ZGl2PiN7aXRlbX08L2Rpdj48YnIvPlwiKVxuXG4gICAgICAgICAgaWYgaW5kIGlzIDBcblxuICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIClcbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGJyLz5cIilcbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8ZGl2PjwvZGl2PlwiKVxuICAgICAgKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8YnIvPlwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoR3JhZGluZ0N1c3RvbVRlbXBsYXRlKHtncmFkZUl0ZW1zOiBncmFkaW5nSXRlbXN9KSlcblxuICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChPcHRpb25zVGVtcGxhdGUoV2l6YXJkRGF0YSkpXG5cbiAgICBcblxuICBnZXRGb3JtYXR0ZWREYXRlU3RyaW5nOiAoZGF0ZSkgLT5cblxuICAgIHllYXIgPSBkYXRlLmdldFVUQ0Z1bGxZZWFyKCkudG9TdHJpbmcoKVxuXG4gICAgbW9udGggPSBkYXRlLmdldFVUQ01vbnRoKCkrMVxuXG4gICAgZGF5ID0gZGF0ZS5nZXRVVENEYXRlKClcblxuICAgIGlmIG1vbnRoLnRvU3RyaW5nKCkubGVuZ3RoIGlzIDFcblxuICAgICAgbW9udGggPSBcIjBcIiArIG1vbnRoLnRvU3RyaW5nKClcblxuICAgIGVsc2VcblxuICAgICAgbW9udGggPSBtb250aC50b1N0cmluZygpXG5cbiAgICBpZiBkYXkudG9TdHJpbmcoKS5sZW5ndGggaXMgMVxuXG4gICAgICBkYXkgPSBcIjBcIiArIGRheS50b1N0cmluZygpXG5cbiAgICBlbHNlXG5cbiAgICAgIGRheSA9IGRheS50b1N0cmluZygpXG5cblxuICAgIHJldHVybiBcIiN7eWVhcn0tI3ttb250aH0tI3tkYXl9XCJcblxuICB0b1N0cmluZzogKGRhdGUpIC0+XG5cbiAgICB5ZWFyID0gZGF0ZS5nZXRVVENGdWxsWWVhcigpLnRvU3RyaW5nKClcblxuICAgIG1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpKzFcblxuICAgIGRheSA9IGRhdGUuZ2V0VVRDRGF0ZSgpXG5cbiAgICBpZiBtb250aC50b1N0cmluZygpLmxlbmd0aCBpcyAxXG5cbiAgICAgIG1vbnRoID0gXCIwXCIgKyBtb250aC50b1N0cmluZygpXG5cbiAgICBlbHNlXG5cbiAgICAgIG1vbnRoID0gbW9udGgudG9TdHJpbmcoKVxuXG4gICAgaWYgZGF5LnRvU3RyaW5nKCkubGVuZ3RoIGlzIDFcblxuICAgICAgZGF5ID0gXCIwXCIgKyBkYXkudG9TdHJpbmcoKVxuXG4gICAgZWxzZVxuXG4gICAgICBkYXkgPSBkYXkudG9TdHJpbmcoKVxuXG4gICAgcmV0dXJuIFwiI3t5ZWFyfS0je21vbnRofS0je2RheX1cIlxuXG5cbiAgZ2V0V2Vla09mRGF0ZTogKGRhdGUpIC0+XG5cbiAgICB5ZWFyID0gZGF0ZS5nZXRVVENGdWxsWWVhcigpLnRvU3RyaW5nKClcblxuICAgIG1vbnRoID0gZGF0ZS5nZXRVVENNb250aCgpKzFcblxuICAgIGRheSA9IGRhdGUuZ2V0VVRDRGF5KClcblxuICAgIGRhdGVEYXkgPSBkYXRlLmdldFVUQ0RhdGUoKVxuXG5cbiAgICBpZiBkYXkgaXMgMVxuXG4gICAgICByZXR1cm4gZGF0ZVxuXG4gICAgZWxzZVxuXG4gICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZS5zZXREYXRlKGRhdGUuZ2V0VVRDRGF0ZSgpLWRhdGUuZ2V0VVRDRGF5KCkpKVxuXG5cbiAgZ2V0V2Vla3NPdXREYXRlOiAoZGF0ZSwgd2Vla3NPdXQpIC0+XG5cbiAgICBuZXdEYXRlID0gbmV3IERhdGUoKVxuXG4gICAgbmV3RGF0ZS5zZXRIb3VycygwLDAsMCwwKVxuXG4gICAgbmV3RGF0ZS5zZXREYXRlKGRhdGUuZ2V0RGF0ZSgpKyh3ZWVrc091dCo3KSlcblxuICAgIHJldHVybiBuZXdEYXRlXG5cblxuICBnZXRXZWVrc0RpZmY6IChhLCBiKSAtPlxuXG4gICAgcmV0dXJuIGIuZGlmZihhLCAnd2Vla3MnKVxuXG5cbiAgY29tYmluZTogKG9iajEsIG9iajIpIC0+XG5cbiAgICB0aXRsZSA9IF8udW5pb24ob2JqMS50aXRsZSwgb2JqMi50aXRsZSlcblxuICAgIGluX2NsYXNzID0gXy51bmlvbihvYmoxLmluX2NsYXNzLCBvYmoyLmluX2NsYXNzKVxuXG4gICAgYXNzaWdubWVudHMgPSBfLnVuaW9uKG9iajEuYXNzaWdubWVudHMsIG9iajIuYXNzaWdubWVudHMpXG5cbiAgICBtaWxlc3RvbmVzID0gXy51bmlvbihvYmoxLm1pbGVzdG9uZXMsIG9iajIubWlsZXN0b25lcylcblxuICAgIHJlYWRpbmdzID0gXy51bmlvbihvYmoxLnJlYWRpbmdzLCBvYmoyLnJlYWRpbmdzKVxuXG4gICAgcmV0dXJuIHt0aXRsZTogdGl0bGUsIGluX2NsYXNzOiBpbl9jbGFzcywgYXNzaWdubWVudHM6IGFzc2lnbm1lbnRzLCBtaWxlc3RvbmVzOiBtaWxlc3RvbmVzLCByZWFkaW5nczogcmVhZGluZ3N9XG5cblxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBJbnB1dEl0ZW1WaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uLy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuL1ZpZXcnKVxuXG5cbiNURU1QTEFURVNcbklucHV0SXRlbVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dEl0ZW1UZW1wbGF0ZS5oYnMnKVxuXG5cbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIElucHV0SXRlbVZpZXcgZXh0ZW5kcyBWaWV3IFxuXG5cbiAgdGVtcGxhdGU6IElucHV0SXRlbVRlbXBsYXRlXG5cblxuICBjbGFzc05hbWU6ICdjdXN0b20taW5wdXQtd3JhcHBlcidcblxuXG4gIGhvdmVyVGltZTogNTAwXG5cbiAgdGlwVmlzaWJsZTogZmFsc2VcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEV2ZW50c1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6IFxuXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInRleHRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2tleXVwIGlucHV0W3R5cGU9XCJwZXJjZW50XCJdJyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1jaGVja2JveCBsYWJlbCBzcGFuJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuaW5mby1pY29uJyA6ICdpbmZvSWNvbkNsaWNrSGFuZGxlcidcblxuICAgICdtb3VzZW92ZXInIDogJ21vdXNlb3ZlckhhbmRsZXInXG5cbiAgICAnbW91c2VlbnRlciBsYWJlbCcgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlb3ZlciAuY3VzdG9tLWlucHV0JyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VlbnRlciAuY2hlY2stYnV0dG9uJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdXQnIDogJ21vdXNlb3V0SGFuZGxlcidcblxuICAgICdjbGljayAuZWRpdGFibGUgLmNoZWNrLWJ1dHRvbicgOiAnY2hlY2tCdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9Cb3hDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnZm9jdXMgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25Gb2N1cydcblxuICAgICdibHVyIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uQmx1cidcblxuXG4gIGluZm9JY29uQ2xpY2tIYW5kbGVyOiAtPlxuXG4gICAgdW5sZXNzIEAkZWwuaGFzQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHNob3dUb29sdGlwKClcblxuICAgIGVsc2VcblxuICAgICAgJCgnYm9keSwgaHRtbCcpLmFuaW1hdGUoXG5cbiAgICAgICAgc2Nyb2xsVG9wOiAwXG5cbiAgICAgICw1MDApXG5cblxuICByYWRpb0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRFbCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJHBhcmVudEdyb3VwID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuXG4gICAgaWYgJHBhcmVudEVsLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBlbHNlXG5cbiAgICAgICRvdGhlclJhZGlvcyA9ICRwYXJlbnRHcm91cC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpLm5vdCgkcGFyZW50RWxbMF0pXG5cbiAgICAgICRvdGhlclJhZGlvcy5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG5cblxuICByYWRpb0JveENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkb3RoZXJSYWRpb3MgPSBAJGVsLnBhcmVudHMoJy5zdGVwLWZvcm0taW5uZXInKS5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG5cbiAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKS5maW5kKCdpbnB1dCcpLnZhbCgnb2ZmJykudHJpZ2dlcignY2hhbmdlJylcblxuICAgICRwYXJlbnQgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICAgLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgIGlmICRwYXJlbnQuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29uJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cbiAgY2hlY2tCdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpLmxlbmd0aCA+IDBcblxuICAgICAgcmV0dXJuIEByYWRpb0JveENsaWNrSGFuZGxlcihlKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKVxuXG4gICAgICAudG9nZ2xlQ2xhc3MoJ2NoZWNrZWQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29uJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIGZhbHNlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvZmYnKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG5cbiAgaG92ZXJIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm4gZVxuXG5cbiAgbW91c2VvdmVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAaXNIb3ZlcmluZyA9IHRydWVcbiAgICAgIFxuXG4gIG1vdXNlb3V0SGFuZGxlcjogKGUpIC0+XG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuICBzaG93VG9vbHRpcDogLT5cblxuICAgIGlmIEBoYXNJbmZvKCkgJiYgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9PSBmYWxzZVxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSB0cnVlXG5cbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFtkYXRhLWl0ZW0taW5kZXg9JyN7QGl0ZW1JbmRleH0nXVwiKS5hZGRDbGFzcygndmlzaWJsZScpXG5cblxuICBoaWRlVG9vbHRpcDogLT5cblxuICAgIGlmIEBoYXNJbmZvKClcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKSBcblxuXG4gIGhpZGVTaG93VG9vbHRpcDogLT5cblxuICAgIGlmIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpLmhhc0NsYXNzKCdub3QtZWRpdGFibGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICBAc2hvd1Rvb2x0aXAoKVxuXG5cbiAgbGFiZWxDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIHJldHVybiBmYWxzZVxuXG5cbiAgaXRlbUNoYW5nZUhhbmRsZXI6IChlKSAtPlxuXG4gICAgIyBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdhbnN3ZXI6dXBkYXRlZCcsIGlucHV0SWQsIHZhbHVlKVxuXG4gICAgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Hcm91cCdcblxuICAgICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgICBpbmRleCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ3ZhbHVlJylcblxuICAgICAgcGFyZW50SWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignbmFtZScpXG5cbiAgICAgIGlmICQoZS5jdXJyZW50VGFyZ2V0KS5wcm9wKCdjaGVja2VkJylcblxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVSYWRpb0Fuc3dlcihwYXJlbnRJZCwgaW5kZXgsIHRydWUpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVSYWRpb0Fuc3dlcihwYXJlbnRJZCwgaW5kZXgsIGZhbHNlKVxuXG4gICAgZWxzZVxuXG4gICAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoKVxuXG4gICAgICBpbnB1dElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2lkJylcblxuICAgICAgaWYgQHBhcmVudFN0ZXAubW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZydcblxuICAgICAgICBwYXRod2F5ID0gJChlLnRhcmdldCkucGFyZW50cygnLmN1c3RvbS1pbnB1dCcpLmF0dHIoJ2RhdGEtcGF0aHdheS1pZCcpXG5cbiAgICAgICAgdW5sZXNzIHBhdGh3YXlcbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVBbnN3ZXIoaW5wdXRJZCwgdmFsdWUsIHRydWUsIHBhdGh3YXkpXG5cbiAgICAgIGVsc2VcbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlQW5zd2VyKGlucHV0SWQsIHZhbHVlLCBmYWxzZSlcblxuICAgICAgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgICBpZiBpc05hTihwYXJzZUludCh2YWx1ZSkpXG5cbiAgICAgICAgICAkKGUuY3VycmVudFRhcmdldCkudmFsKCcnKVxuXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZ3JhZGU6Y2hhbmdlJywgaW5wdXRJZCwgdmFsdWUpXG4gICAgXG4gICAgcmV0dXJuIEBwYXJlbnRTdGVwLnVwZGF0ZVVzZXJIYXNBbnN3ZXJlZChpbnB1dElkLCB2YWx1ZSwgQGlucHV0VHlwZSlcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFByaXZhdGUgTWV0aG9kc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoQGlucHV0VHlwZSlcblxuICAgIEAkaW5wdXRFbCA9IEAkZWwuZmluZCgnaW5wdXQnKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMudmFsdWUgIT0gJycgJiYgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSA9PSAndGV4dCdcbiAgICAgIFxuICAgICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cbiAgICBAaG92ZXJUaW1lciA9IG51bGxcblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG5cbiAgaGFzSW5mbzogLT5cblxuICAgIHJldHVybiBAJGVsLmhhc0NsYXNzKCdoYXMtaW5mbycpXG5cblxuICBvbkZvY3VzOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgb25CbHVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgaWYgdmFsdWUgPT0gJydcblxuICAgICAgdW5sZXNzICR0YXJnZXQuaXMoJzpmb2N1cycpXG5cbiAgICAgICAgQCRlbC5yZW1vdmVDbGFzcygnb3BlbicpXG5cblxuICBpc0Rpc2FibGVkOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpLmhhc0NsYXNzKCdub3QtZWRpdGFibGUnKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQdWJsaWMgTWV0aG9kc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZW5kZXI6IC0+XG5cbiAgICBzdXBlcigpXG5cblxuICBnZXRJbnB1dFR5cGVPYmplY3Q6IC0+XG5cbiAgICByZXR1cm5EYXRhID0ge31cblxuICAgIHJldHVybkRhdGFbQGlucHV0VHlwZV0gPSB0cnVlXG5cbiAgICByZXR1cm4gcmV0dXJuRGF0YVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgaW5wdXRUeXBlT2JqZWN0ID0gQGdldElucHV0VHlwZU9iamVjdCgpXG5cblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW8nXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICd0ZXh0J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgaWYgQHBhcmVudFN0ZXAubW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZycgfHwgQHBhcmVudFN0ZXAubW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdncmFkaW5nJ1xuXG4gICAgICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmNvbnRpbmdlbnRVcG9uLmxlbmd0aCAhPSAwXG5cbiAgICAgICAgICBjdXJyZW50U2VsZWN0ZWQgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5nZXRTZWxlY3RlZElkcygpXG5cbiAgICAgICAgICByZW5kZXJJbk91dHB1dCA9IGZhbHNlXG5cbiAgICAgICAgICBfLmVhY2goQG1vZGVsLmF0dHJpYnV0ZXMuY29udGluZ2VudFVwb24sIChpZCkgPT5cblxuICAgICAgICAgICAgXy5lYWNoKGN1cnJlbnRTZWxlY3RlZCwgKHNlbGVjdGVkSWQpID0+XG5cbiAgICAgICAgICAgICAgaWYgaWQgaXMgc2VsZWN0ZWRJZFxuXG4gICAgICAgICAgICAgICAgcmVuZGVySW5PdXRwdXQgPSB0cnVlXG5cbiAgICAgICAgICAgIClcblxuICAgICAgICAgIClcblxuICAgICAgICAgIHVubGVzcyByZW5kZXJJbk91dHB1dFxuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2VcblxuXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0dyb3VwJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnZWRpdCdcblxuICAgICAgYWxsSW5wdXRzID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuYXR0cmlidXRlcy5pZF1cblxuICAgICAgc2VsZWN0ZWRJbnB1dHMgPSBbXVxuXG4gICAgICBfLmVhY2goYWxsSW5wdXRzLCAoaW5wdXQpID0+XG5cbiAgICAgICAgaWYgaW5wdXQudHlwZVxuXG4gICAgICAgICAgaWYgaW5wdXQudHlwZSBpcyAnY2hlY2tib3gnIHx8IGlucHV0LnR5cGUgaXMgJ3JhZGlvQm94J1xuXG4gICAgICAgICAgICBpZiBpbnB1dC5zZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5sYWJlbFxuXG4gICAgICAgICAgZWxzZSBpZiBpbnB1dC50eXBlIGlzICdyYWRpb0dyb3VwJ1xuXG4gICAgICAgICAgICBpZiBpbnB1dC5pZCBpcyAncGVlcl9yZXZpZXdzJ1xuXG4gICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQub3ZlcnZpZXdMYWJlbFxuXG4gICAgICApXG5cbiAgICAgIFxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdoYXMtY29udGVudCcpXG5cbiAgICAgIGlmIHNlbGVjdGVkSW5wdXRzLmxlbmd0aCA9PSAwXG4gICAgICAgIFxuICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIFwiW05vbmUgc2VsZWN0ZWRdXCJcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICBhc3NpZ25tZW50czogc2VsZWN0ZWRJbnB1dHNcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2xpbmsnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG5cbiAgXG4gICAgICBcbiAgICBcbiAgICAgIFxuXG4gICAgXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBCYXNlIFZpZXcgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5yZXF1aXJlKCcuLi8uLi9oZWxwZXJzL1ZpZXdIZWxwZXInKVxuXG5jbGFzcyBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICB0ZW1wbGF0ZTogLT5cbiAgIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG4gIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBpbml0aWFsaXplOiAtPlxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApIClcbiAgICBcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgRVZFTlQgSEFORExFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Il19
