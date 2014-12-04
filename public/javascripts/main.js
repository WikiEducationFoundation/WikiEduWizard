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
    var HomeView, InputItemView, LoginView, OutputView, Router;
    this.WizardConfig = require('./data/WizardConfig');
    this.timelineData = require('./data/TimelineData');
    this.timelineDataAlt = require('./data/TimelineDataAlt');
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



},{"./data/TimelineData":7,"./data/TimelineDataAlt":8,"./data/WizardConfig":9,"./routers/Router":16,"./views/HomeView":35,"./views/InputItemView":36,"./views/LoginView":37,"./views/OutputView":38}],6:[function(require,module,exports){
var LoginContent;

LoginContent = {
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
};

module.exports = LoginContent;



},{}],7:[function(require,module,exports){
var TimelineData;

TimelineData = [
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

module.exports = TimelineData;



},{}],8:[function(require,module,exports){
var TimelineDataAlt;

TimelineDataAlt = {
  multimedia: ["== Illustrating Wikipedia ==", "{{assignment}}", "{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}", "<br/>{{end of course assignment}}"],
  copyedit: ["== Copyedit Wikipedia ==", "{{assignment}}", "{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}", "<br/>{{end of course assignment}}"]
};

module.exports = TimelineDataAlt;



},{}],9:[function(require,module,exports){
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
      required: true,
      ignoreValidation: true,
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
  moment.locale('en', {
    week: {
      dow: 1,
      doy: 4
    }
  });
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

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Individal Step Template for the INTRO FORM SCREEN\n-->\n\n<div class=\"step-form\">\n\n  <!-- STEP FORM HEADER -->\n  <div class=\"step-form-header\">\n\n    <!-- STEP TITLE -->\n    ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  \n    <!-- STEP FORM TITLE -->\n    ";
  stack1 = helpers['if'].call(depth0, depth0.formTitle, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  </div><!-- end .step-form-header -->\n  \n  <!-- STEP INSTRUCTIONS -->\n\n  <div class=\"step-form-instructions\">\n    ";
  stack1 = helpers.each.call(depth0, depth0.sections, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n   <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n  <div class='form-container custom-input'>\n\n    <form id='courseLength' onsubmit='return false'>\n      <div class='overview-input-container'>\n        <label for='termStartDate'>Course begins</label>\n        <input id='termStartDate' name='termStartDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='termEndDate'>Course ends</label>\n        <input id='termEndDate' name='termEndDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='courseStartDate'>Assignment starts</label>\n        <input id='courseStartDate' name='courseStartDate' type='date'>\n      </div>\n      <div class='overview-input-container'>\n        <label for='courseEndDate'>Assignment ends</label>\n        <input id='courseEndDate' name='courseEndDate' type='date'>\n      </div>\n      <div class='overview-input-container' style=\"display:none;\">\n        <label for='courseLength' style=\"vertical-align:middle;\">Course Length</label>\n        <input defaultValue='16' id='cLength' max='16' min='6' name='courseLength' step='1' type='range' value='16' style=\"display:none;\">\n        <output name='out2'></output>\n      </div>\n      <div class='overview-select-container'>\n        <label>Class meets on: </label>\n        <div class=\"overview-select-wrapper overview-select-wrapper--dow\">\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='monday' name='Monday' type='checkbox' value='0'>\n            <label for='monday'>Mondays</label>\n          </div>\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='tuesday' name='Tuesday' type='checkbox' value='1'>\n            <label for='tuesday'>Tuesdays</label>\n          </div>\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='wednesday' name='Wednesday' type='checkbox' value='2'>\n            <label for='wednesday'>Wednesdays</label>\n          </div>\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='thursday' name='Thursday' type='checkbox' value='3'>\n            <label for='thursday'>Thursdays</label>\n          </div>\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='friday' name='Friday' type='checkbox' value='4'>\n            <label for='friday'>Fridays</label>\n          </div>\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='saturday' name='Saturday' type='checkbox' value='5'>\n            <label for='saturday'>Saturdays</label>\n          </div>\n          <div class='overview-select-input-container'>\n            <input class='dowCheckbox' id='sunday' name='Sunday' type='checkbox' value='6'>\n            <label for='sunday'>Sundays</label>\n          </div>\n        </div>\n      </div>\n      <div class='overview-input-container overview-input-container--blackout-dates'>\n        \n        <input id='blackoutDatesField' name='blackoutDatesField' type='hidden'>\n        <div class=\"blackoutDates-wrapper\">\n          <div class=\"blackoutDates-inner\">\n            <div class=\"blackoutDates-label\">Select days where class does not meet (if any):</div>\n            <div id=\"blackoutDates\" class=\"blackoutDates\"></div>\n          </div>\n        </div>\n        \n      </div>\n    </form>\n  </div>\n  <div class=\"output-container\"></div>\n  <div class=\"preview-container\"></div>\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n\n    <div class=\"no-edit-mode\">\n      <a class=\"button button--blue inactive\" id=\"beginButton\" href=\"\">\n        Start designing my assignment\n      </a>\n    </div>\n\n    <div class=\"edit-mode-only\">\n      <a class=\"button button--blue exit-edit\" href=\"#\">\n        Back\n      </a>\n    </div>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
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
    + "</div>\n</div>";
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
    + escapeExpression(((stack1 = ((stack1 = depth0.course_details),stack1 == null || stack1 === false ? stack1 : stack1.start_date)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " <br/>\n | end_date = "
    + escapeExpression(((stack1 = ((stack1 = depth0.course_details),stack1 == null || stack1 === false ? stack1 : stack1.end_date)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
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

  buffer += "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
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
var HomeTemplate, HomeView, StepModel, StepNavView, StepView, TimelineView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

HomeTemplate = require('../templates/HomeTemplate.hbs');

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



},{"../app":5,"../data/WizardStepInputs":11,"../models/StepModel":14,"../templates/HomeTemplate.hbs":17,"../views/StepNavView":40,"../views/StepView":41,"../views/TimelineView":42,"../views/supers/View":44}],36:[function(require,module,exports){
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
var HomeView, LoginContent, LoginTemplate, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

LoginTemplate = require('../templates/LoginTemplate.hbs');

LoginContent = require('../data/LoginContent');

module.exports = HomeView = (function(_super) {
  __extends(HomeView, _super);

  function HomeView() {
    return HomeView.__super__.constructor.apply(this, arguments);
  }

  HomeView.prototype.className = 'home-view';

  HomeView.prototype.template = LoginTemplate;

  HomeView.prototype.getRenderData = function() {
    return LoginContent;
  };

  return HomeView;

})(View);



},{"../app":5,"../data/LoginContent":6,"../templates/LoginTemplate.hbs":18,"../views/supers/View":44}],38:[function(require,module,exports){
var CourseDetailsTempalte, CourseOptionsTemplate, GradingTemplate, OutputView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../app');

View = require('../views/supers/View');

CourseDetailsTempalte = require('../templates/steps/output/CourseDetailsTemplate.hbs');

GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs');

CourseOptionsTemplate = require('../templates/steps/output/CourseOptionsTemplate.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = OutputView = (function(_super) {
  __extends(OutputView, _super);

  function OutputView() {
    return OutputView.__super__.constructor.apply(this, arguments);
  }

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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/output/CourseDetailsTemplate.hbs":29,"../templates/steps/output/CourseOptionsTemplate.hbs":30,"../templates/steps/output/GradingTemplate.hbs":32,"../views/supers/View":44}],39:[function(require,module,exports){
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
    $('<div class="step-form-content__title">Selected assignment(s):</div>').appendTo(this.$el).css({
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
          $('<div class="step-form-content__title">Assignment details: <a class="expand-all" href="#">[expand all]</a></div>').appendTo(_this.$el).css({
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

  StepView.prototype.validateDates = function() {
    var datesAreValid;
    if (!(this.isFirstStep || this.isLastStep)) {
      return false;
    }
    datesAreValid = false;
    if (WizardStepInputs.course_details.start_date !== '' && WizardStepInputs.course_details.end_date !== '') {
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
    var $dates, dateTitle;
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
      $dates = $(this.datesModule({
        title: dateTitle
      }));
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
          if (item.ignoreValidation) {
            requiredSelected = true;
            return;
          }
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



},{"../app":5,"../data/WizardCourseInfo":10,"../data/WizardStepInputs":11,"../templates/steps/IntroStepTemplate.hbs":20,"../templates/steps/StepTemplate.hbs":21,"../templates/steps/info/CourseTipTemplate.hbs":22,"../templates/steps/info/InputTipTemplate.hbs":23,"../templates/steps/modules/WikiDatesModule.hbs":25,"../views/DateInputView":33,"../views/GradingInputView":34,"../views/InputItemView":36,"../views/OverviewView":39,"../views/supers/View":44}],42:[function(require,module,exports){
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

  TimelineView.prototype.longestCourseLength = 16;

  TimelineView.prototype.shortestCourseLength = 6;

  TimelineView.prototype.defaultCourseLength = 16;

  TimelineView.prototype.defaultEndDates = ['06-30', '12-31'];

  TimelineView.prototype.currentBlackoutDates = [];

  TimelineView.prototype.length = 0;

  TimelineView.prototype.actualLength = 0;

  TimelineView.prototype.weeklyDates = [];

  TimelineView.prototype.weeklyStartDates = [];

  TimelineView.prototype.totalBlackoutWeeks = 0;

  TimelineView.prototype.daysSelected = [false, false, false, false, false, false, false];

  TimelineView.prototype.start_date = {
    value: ''
  };

  TimelineView.prototype.end_date = {
    value: ''
  };

  TimelineView.prototype.term_start_date = {
    value: ''
  };

  TimelineView.prototype.term_end_date = {
    value: ''
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
      firstDay: 1,
      altField: '#blackoutDatesField',
      onSelect: (function(_this) {
        return function() {
          _this.currentBlackoutDates = _this.$blackoutDates.multiDatesPicker('getDates');
          return _this.updateTimeline();
        };
      })(this)
    });
    this.$startWeekOfDate = $('#startWeekOfDate');
    this.$courseStartDate = $('#courseStartDate');
    this.$courseEndDate = $('#courseEndDate');
    this.$termStartDate = $('#termStartDate');
    this.$termEndDate = $('#termEndDate');
    this.$outContainer = $('.output-container');
    this.$previewContainer = $('.preview-container');
    this.data = [];
    this.data = application.timelineData;
    this.dataAlt = application.timelineDataAlt;
    $('#termStartDate').on('change', (function(_this) {
      return function(e) {
        return _this.changeTermStart(e);
      };
    })(this));
    $('#termEndDate').on('change', (function(_this) {
      return function(e) {
        return _this.changeTermEnd(e);
      };
    })(this));
    $('#courseStartDate').on('change', (function(_this) {
      return function(e) {
        return _this.changeCourseStart(e);
      };
    })(this));
    $('#courseEndDate').on('change', (function(_this) {
      return function(e) {
        return _this.changeCourseEnd(e);
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
    if (this.start_date.value !== '' && this.end_date.value !== '') {
      if (_.indexOf(this.daysSelected, true) !== -1) {
        $('.blackoutDates-wrapper').addClass('open');
      } else {
        $('.blackoutDates-wrapper').removeClass('open');
      }
    } else {
      $('.blackoutDates-wrapper').removeClass('open');
    }
    return this.updateTimeline();
  };

  TimelineView.prototype.changeTermStart = function(e) {
    var date, dateMoment, defaultEndDate, endDateString, isAfter, isFullWidthCourse, value, yearMod;
    value = $(e.currentTarget).val() || '';
    if (value === '') {
      this.term_end_date = {
        value: ''
      };
      return;
    }
    dateMoment = moment(value);
    date = dateMoment.toDate();
    this.term_start_date = {
      moment: dateMoment,
      date: date,
      value: value,
      week: dateMoment.week(),
      weekday: {
        moment: dateMoment.week(dateMoment.week()).weekday(0),
        date: dateMoment.week(dateMoment.week()).weekday(0).toDate(),
        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')
      }
    };
    yearMod = 0;
    if (this.term_start_date.week === 1) {
      yearMod = 1;
    }
    isAfter = dateMoment.isAfter("" + (dateMoment.year() + yearMod) + "-06-01");
    if (isAfter) {
      endDateString = "" + (dateMoment.year()) + "-" + this.defaultEndDates[1];
    } else {
      endDateString = "" + (dateMoment.year() + yearMod) + "-" + this.defaultEndDates[0];
    }
    if (isAfter) {
      isFullWidthCourse = 53 - this.term_start_date.week > this.defaultCourseLength;
    } else {
      isFullWidthCourse = moment(endDateString).week() - this.term_start_date.week > this.defaultCourseLength;
    }
    this.$termEndDate.val(endDateString).trigger('change');
    this.$courseStartDate.val(value).trigger('change');
    if (isFullWidthCourse) {
      defaultEndDate = moment(value).toDate();
      defaultEndDate.setDate(7 * this.defaultCourseLength);
      this.$courseEndDate.val(moment(defaultEndDate).format('YYYY-MM-DD')).trigger('change');
    } else {
      this.$courseEndDate.val(endDateString).trigger('change');
    }
    this.$blackoutDates.multiDatesPicker('resetDates', 'picked');
  };

  TimelineView.prototype.changeTermEnd = function(e) {
    var date, dateMoment, value;
    value = $(e.currentTarget).val() || '';
    if (value === '') {
      this.term_start_date = {
        value: ''
      };
      return;
    }
    dateMoment = moment(value);
    date = dateMoment.toDate();
    this.term_end_date = {
      moment: dateMoment,
      date: date,
      value: value,
      week: dateMoment.week(),
      weekday: {
        moment: dateMoment.week(dateMoment.week()).weekday(0),
        date: dateMoment.week(dateMoment.week()).weekday(0).toDate(),
        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')
      }
    };
    this.$courseEndDate.val(value).trigger('change');
    this.$blackoutDates.multiDatesPicker('resetDates', 'picked');
  };

  TimelineView.prototype.changeCourseStart = function(e) {
    var date, dateMoment, endDateString, isAfter, value, yearMod;
    value = $(e.currentTarget).val() || '';
    if (value === '') {
      this.start_date = {
        value: ''
      };
      this.$courseEndDate.val('').trigger('change');
      this.updateMultiDatePicker();
      return this.updateTimeline;
    }
    dateMoment = moment(value);
    date = dateMoment.toDate();
    this.start_date = {
      moment: dateMoment,
      date: date,
      value: value,
      week: dateMoment.week(),
      weekday: {
        moment: dateMoment.week(dateMoment.week()).weekday(0),
        date: dateMoment.week(dateMoment.week()).weekday(0).toDate(),
        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')
      }
    };
    yearMod = 0;
    if (this.start_date.week === 1) {
      yearMod = 1;
    }
    isAfter = dateMoment.isAfter("" + (dateMoment.year() + yearMod) + "-06-01");
    if (isAfter) {
      endDateString = "" + (dateMoment.year()) + "-" + this.defaultEndDates[1];
    } else {
      endDateString = "" + (dateMoment.year() + yearMod) + "-" + this.defaultEndDates[0];
    }
    this.$courseEndDate.val(endDateString).trigger('change');
    if (this.term_start_date.value === '') {
      this.$termStartDate.val(value).trigger('change');
    }
    this.updateMultiDatePicker();
    this.updateTimeline();
    return false;
  };

  TimelineView.prototype.changeCourseEnd = function(e) {
    var date, dateMoment, value;
    value = $(e.currentTarget).val() || '';
    if (value === '') {
      this.end_date = {
        value: ''
      };
      this.updateMultiDatePicker();
      this.updateTimeline();
      return this.updateTimeline;
    }
    dateMoment = moment(value);
    date = dateMoment.toDate();
    this.end_date = {
      moment: dateMoment,
      date: date,
      value: value,
      week: dateMoment.week(),
      weekday: {
        moment: dateMoment.week(dateMoment.week()).weekday(0),
        date: dateMoment.week(dateMoment.week()).weekday(0).toDate(),
        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')
      }
    };
    this.updateMultiDatePicker();
    this.updateTimeline();
    return false;
  };

  TimelineView.prototype.updateMultiDatePicker = function() {
    if (this.start_date.value !== '' && this.end_date.value !== '') {
      this.$blackoutDates.multiDatesPicker('destroy');
      this.$blackoutDates.multiDatesPicker({
        dateFormat: 'yy-mm-dd',
        firstDay: 1,
        altField: '#blackoutDatesField',
        defaultDate: this.start_date.weekday.value,
        minDate: this.start_date.weekday.value,
        maxDate: this.end_date.value,
        onSelect: (function(_this) {
          return function() {
            _this.currentBlackoutDates = _this.$blackoutDates.multiDatesPicker('getDates');
            return _this.updateTimeline();
          };
        })(this)
      });
      this.$blackoutDates.multiDatesPicker('resetDates', 'picked');
      if (this.currentBlackoutDates.length > 0) {
        return this.$blackoutDates.multiDatesPicker('addDates', this.currentBlackoutDates);
      }
    } else {
      this.$blackoutDates.multiDatesPicker('destroy');
      this.$blackoutDates.multiDatesPicker({
        dateFormat: 'yy-mm-dd',
        firstDay: 1,
        altField: '#blackoutDatesField',
        onSelect: (function(_this) {
          return function() {
            _this.currentBlackoutDates = _this.$blackoutDates.multiDatesPicker('getDates');
            return _this.updateTimeline();
          };
        })(this)
      });
      return this.$blackoutDates.multiDatesPicker('resetDates', 'picked');
    }
  };

  TimelineView.prototype.updateTimeline = function() {
    var diff, newDate, newLength, w;
    this.weeklyStartDates = [];
    this.weeklyDates = [];
    this.out = [];
    this.outWiki = [];
    if (this.start_date.value !== '' && this.end_date.value !== '') {
      diff = this.getWeeksDiff(this.start_date.weekday.moment, this.end_date.weekday.moment);
      this.actualLength = 1 + diff;
      if (this.actualLength < this.shortestCourseLength) {
        this.length = this.shortestCourseLength;
      } else if (this.actualLength > this.longestCourseLength) {
        this.length = this.longestCourseLength;
      } else {
        this.length = this.actualLength;
      }
      this.weeklyStartDates = [];
      w = 0;
      while (w < this.length) {
        if (w === 0) {
          newDate = moment(this.start_date.weekday.moment).format('YYYY-MM-DD');
        } else {
          newDate = moment(this.start_date.weekday.moment).week(this.start_date.week + w).format('YYYY-MM-DD');
        }
        this.weeklyStartDates.push(newDate);
        w++;
      }
      this.weeklyDates = [];
      this.totalBlackoutWeeks = 0;
      _.each(this.weeklyStartDates, (function(_this) {
        return function(weekdate, wi) {
          var dMoment, thisWeek, totalBlackedOut, totalSelected;
          dMoment = moment(weekdate);
          totalSelected = 0;
          totalBlackedOut = 0;
          thisWeek = {
            weekStart: dMoment.format('YYYY-MM-DD'),
            classThisWeek: true,
            dates: [],
            weekIndex: wi - _this.totalBlackoutWeeks
          };
          _.each(_this.daysSelected, function(day, di) {
            var dateString, isClass;
            if (day) {
              isClass = true;
              dateString = dMoment.weekday(di).format('YYYY-MM-DD');
              totalSelected++;
              if (_.indexOf(_this.currentBlackoutDates, dateString) !== -1) {
                totalBlackedOut++;
                isClass = false;
              }
              return thisWeek.dates.push({
                isClass: isClass,
                date: dateString
              });
            } else {
              return thisWeek.dates.push({});
            }
          });
          if (totalBlackedOut !== 0 && totalSelected === totalBlackedOut) {
            thisWeek.classThisWeek = false;
            thisWeek.weekIndex = '';
            _this.totalBlackoutWeeks++;
          }
          return _this.weeklyDates.push(thisWeek);
        };
      })(this));
      if (this.totalBlackoutWeeks > 0) {
        newLength = this.length - this.totalBlackoutWeeks;
        if (newLength < 6) {
          alert('You have blackouted out days that will result in a course length that is less than 6 weeks. Please increase the course length.');
          return false;
        } else {
          this.length = newLength;
        }
      }
    }
    this.update();
    return this;
  };

  TimelineView.prototype.getWikiWeekOutput = function(length) {
    var diff, obj, out, unitsClone;
    diff = 16 - length;
    out = [];
    unitsClone = _.clone(this.data);
    if (diff > 0) {
      unitsClone = _.reject(unitsClone, (function(_this) {
        return function(item) {
          return item.type === 'break' && diff >= item.value && item.value !== 0;
        };
      })(this));
    }
    obj = unitsClone[0];
    _.each(unitsClone, (function(_this) {
      return function(item, index) {
        if (item.type === 'break' || index === unitsClone.length - 1) {
          if (index === unitsClone.length - 1) {
            out.push(_.clone(item));
          } else {
            out.push(_.clone(obj));
          }
          obj = {};
        } else if (item.type === 'week') {
          return obj = _this.combine(obj, item);
        }
      };
    })(this));
    return out;
  };

  TimelineView.prototype.update = function() {
    WizardData.course_details.start_date = this.start_date.value || '';
    WizardData.course_details.end_date = this.end_date.value || '';
    if (this.length) {
      $('output[name="out2"]').html(this.length + ' weeks');
    } else {
      $('output[name="out2"]').html('');
    }
    this.out = this.getWikiWeekOutput(this.length);
    this.outWiki = this.out;
    this.renderResult();
    Backbone.Mediator.publish('output:update', this.$outContainer.text());
    return Backbone.Mediator.publish('date:change', this);
  };

  TimelineView.prototype.renderResult = function() {
    var curWeekOffset, gradingItems;
    this.$outContainer.html('');
    this.$outContainer.append(DetailsTemplate(_.extend(WizardData, {
      description: WizardData.course_details.description
    })));
    if (application.homeView.selectedPathways[0] === 'researchwrite') {
      this.$outContainer.append("" + this.wikiSpace);
      this.$outContainer.append('{{table of contents}}');
      this.$outContainer.append("" + this.wikiSpace);
      this.$outContainer.append('==Timeline==');
      this.$outContainer.append("" + this.wikiSpace);
      curWeekOffset = 0;
      _.each(this.weeklyDates, (function(_this) {
        return function(week, index) {
          var dayCount, extra, isLastWeek, item, nextWeek, thisWeek, titles;
          if (!week.classThisWeek) {
            _this.$outContainer.append("{{end of course week}}");
            _this.$outContainer.append("" + _this.wikiSpace);
            _this.$outContainer.append("" + _this.wikiSpace);
            _this.$outContainer.append("===" + _this.wikiNoClass + " " + week.weekStart + "===");
            _this.$outContainer.append("" + _this.wikiSpace);
            _this.$outContainer.append("" + _this.wikiSpace);
            return;
          }
          item = _this.outWiki[week.weekIndex];
          thisWeek = week.weekIndex + 1;
          nextWeek = week.weekIndex + 2;
          isLastWeek = week.weekIndex === _this.length - 1;
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
            if (week.weekStart && week.weekStart !== '') {
              titles += "| weekof = " + week.weekStart + " ";
            }
            dayCount = 0;
            _.each(week.dates, function(d, di) {
              if (d.isClass) {
                dayCount++;
                return titles += "| day" + dayCount + " = " + d.date + " ";
              }
            });
            titles += "}}";
            _this.$outContainer.append(titles);
            _this.$outContainer.append("" + _this.wikiSpace);
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



},{"../app":5,"../data/WizardStepInputs":11,"../templates/steps/output/CourseDetailsTemplate.hbs":29,"../templates/steps/output/CourseOptionsTemplate.hbs":30,"../templates/steps/output/GradingAltTemplate.hbs":31,"../templates/steps/output/GradingTemplate.hbs":32,"../views/supers/View":44}],43:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9Mb2dpbkNvbnRlbnQuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1RpbWVsaW5lRGF0YS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvVGltZWxpbmVEYXRhQWx0LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb25maWcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZENvdXJzZUluZm8uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9oZWxwZXJzL1ZpZXdIZWxwZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9tYWluLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9zdXBlcnMvTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9yb3V0ZXJzL1JvdXRlci5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2luZm8vQ291cnNlVGlwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dEl0ZW1UZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEZXRhaWxzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraUdyYWRpbmdNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpU3VtbWFyeU1vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdBbHRUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvRGF0ZUlucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0lucHV0SXRlbVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3ZlcnZpZXdWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvU3RlcE5hdlZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1RpbWVsaW5lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvVmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQSxJQUFBLDZEQUFBO0VBQUE7aVNBQUE7O0FBQUEsV0FBQSxHQUFjLE9B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Ozs7S0FkQTs7QUFBQSxpQkFxQkEsVUFBQSxHQUFZLFNBQUEsR0FBQTtXQUNWLElBQUMsQ0FBQSxNQUFELEdBQVUsQ0FBQyxDQUFDLElBQUYsQ0FBUSxJQUFDLENBQUEsTUFBVCxFQUFpQixJQUFqQixFQURBO0VBQUEsQ0FyQlosQ0FBQTs7QUFBQSxpQkEyQkEsTUFBQSxHQUFRLFNBQUEsR0FBQTtBQUNOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVcsSUFBQyxDQUFBLFFBQUQsQ0FBVyxJQUFDLENBQUEsYUFBRCxDQUFBLENBQVgsQ0FBWCxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxXQUFELENBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTE07RUFBQSxDQTNCUixDQUFBOztBQUFBLGlCQXFDQSxXQUFBLEdBQWEsU0FBQSxHQUFBLENBckNiLENBQUE7O0FBdUNBO0FBQUE7OztLQXZDQTs7QUEyQ0E7QUFBQTs7O0tBM0NBOztBQStDQTtBQUFBOzs7S0EvQ0E7O2NBQUE7O0dBRmlCLFFBQVEsQ0FBQyxLQUY1QixDQUFBOztBQUFBLE1BdURNLENBQUMsT0FBUCxHQUFpQixJQXZEakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcycpLmNyZWF0ZSgpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzJykuYXR0YWNoKGV4cG9ydHMpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMnKS5hdHRhY2goZXhwb3J0cykiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCBERVNJR04gV0laQVJEXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICBAV2l6YXJkQ29uZmlnID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbmZpZycpXG5cbiAgICBAdGltZWxpbmVEYXRhID0gcmVxdWlyZSgnLi9kYXRhL1RpbWVsaW5lRGF0YScpXG5cbiAgICBAdGltZWxpbmVEYXRhQWx0ID0gcmVxdWlyZSgnLi9kYXRhL1RpbWVsaW5lRGF0YUFsdCcpXG5cbiAgICAjIEltcG9ydCB2aWV3c1xuICAgIEhvbWVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Ib21lVmlldycpXG5cbiAgICBMb2dpblZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0xvZ2luVmlldycpXG5cbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuICAgIElucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG4gICAgT3V0cHV0VmlldyA9IHJlcXVpcmUoJy4vdmlld3MvT3V0cHV0VmlldycpXG5cblxuICAgICMgSW5pdGlhbGl6ZSB2aWV3c1xuICAgIEBob21lVmlldyA9IG5ldyBIb21lVmlldygpXG5cbiAgICBAbG9naW5WaWV3ID0gbmV3IExvZ2luVmlldygpXG5cbiAgICBAaW5wdXRJdGVtVmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KClcblxuICAgIEBvdXRwdXRWaWV3ID0gbmV3IE91dHB1dFZpZXcoKVxuXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXG4gICAgXG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uIiwiTG9naW5Db250ZW50ID0gXG4gIGlkOiBcImludHJvXCJcbiAgdGl0bGU6ICc8Y2VudGVyPldlbGNvbWUgdG8gdGhlPGJyIC8+QXNzaWdubWVudCBEZXNpZ24gV2l6YXJkITwvY2VudGVyPidcbiAgbG9naW5faW5zdHJ1Y3Rpb25zOiAnQ2xpY2sgTG9naW4gd2l0aCBXaWtpcGVkaWEgdG8gZ2V0IHN0YXJ0ZWQnXG4gIGluc3RydWN0aW9uczogJydcbiAgaW5wdXRzOiBbXVxuICBzZWN0aW9uczogW1xuICAgIHtcbiAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPlRoaXMgdG9vbCB3aWxsIGhlbHAgeW91IHRvIGVhc2lseSBjcmVhdGUgYSBjdXN0b21pemVkIFdpa2lwZWRpYSBjbGFzc3Jvb20gYXNzaWdubWVudCBhbmQgY3VzdG9taXplZCBzeWxsYWJ1cyBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UnbGwgaGF2ZSBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiwgd2l0aCB3ZWVrbHkgYXNzaWdubWVudHMsIHB1Ymxpc2hlZCBkaXJlY3RseSBvbnRvIGEgc2FuZGJveCBwYWdlIG9uIFdpa2lwZWRpYSB3aGVyZSB5b3UgY2FuIGN1c3RvbWVpemUgaXQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5MZXTigJlzIHN0YXJ0IGJ5IGZpbGxpbmcgaW4gc29tZSBiYXNpY3MgYWJvdXQgeW91IGFuZCB5b3VyIGNvdXJzZTo8L3A+XCJcbiAgICAgIF1cbiAgICB9XG4gIF1cbiAgXG5cblxubW9kdWxlLmV4cG9ydHMgPSBMb2dpbkNvbnRlbnRcbiIsIiMjIFRISVMgRklMRVMgSVMgVVNFRCBBUyBUSEUgTUFTVEVSIEZPUiBBTEwgV0lLSSBPVVQgUkVMQVRFRCBUTyBUSEUgTUFJTiBBU1NJR05NRU5UIFRZUEUgIyNcbiMjIFRIRSBCUkVBSyBBUkUgVVNFRCBUTyBERVRFUk1JTkUgSE9XIFRIRSBBU1NJR05NRU5UIEVYUEFORFMgQU5EIENPTlRSQUNUIEJBU0VEIE9OIENPVVJTRSBMRU5HVEggIyNcbiMjIFRIRSBhY3Rpb24gVkFSSUFCTEUgSVMgVVNFRCBUTyBERVRFUk1JTkUgV0hFVEhFUiBPUiBOT1QgVEhFIENPTlRFTlQgSVMgQ09NQklORUQgV0lUSCBJVFMgUFJFREVDRVNPUiBPUiBXSEVUSEVSIElUUyBPTUlUVEVEIEFMTCBUT0dFVEhFUiMjXG5cblRpbWVsaW5lRGF0YSA9IFtcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgdGl0bGU6IFsnV2lraXBlZGlhIGVzc2VudGlhbHMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdJbnRybyB0byBXaWtpcGVkaWEnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ludHJvIHRvIFdpa2lwZWRpYX19J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW11cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogNVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRWRpdGluZyBiYXNpY3MnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFZGl0aW5nIGJhc2ljcyBpbiBjbGFzcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbXBsZXRlIHRoZSB0cmFpbmluZydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgdGhlIHRyYWluaW5nfX0nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXAnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NyZWF0ZSB1c2VycGFnZSBhbmQgc2lnbiB1cH19J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnUHJhY3RpY2UgY29tbXVuaWNhdGluZydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319J1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdTdHVkZW50cyBlbnJvbGxlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgZW5yb2xsZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA4XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydFeHBsb3JpbmcgdGhlIHRvcGljIGFyZWEnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFZGl0aW5nIGJhc2ljcyBpbiBjbGFzcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0V2YWx1YXRlIGFuIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFuIGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5nZXR0aW5nX3N0YXJ0ZWQuY3JpdGlxdWVfYXJ0aWNsZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5nZXR0aW5nX3N0YXJ0ZWQuY29weV9lZGl0X2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydVc2luZyBzb3VyY2VzIGFuZCBjaG9vc2luZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1VzaW5nIHNvdXJjZXMgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1VzaW5nIHNvdXJjZXMgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FkZCB0byBhbiBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BZGQgdG8gYW4gYXJ0aWNsZX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmdldHRpbmdfc3RhcnRlZC5hZGRfdG9fYXJ0aWNsZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0lsbHVzdHJhdGUgYW4gYXJ0aWNsZSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSWxsdXN0cmF0ZSBhbiBhcnRpY2xlfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZ2V0dGluZ19zdGFydGVkLmlsbHVzdHJhdGVfYXJ0aWNsZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0xpc3QgYXJ0aWNsZSBjaG9pY2VzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9MaXN0IGFydGljbGUgY2hvaWNlc319J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmNob29zaW5nX2FydGljbGVzLnN0dWRlbnRzX2V4cGxvcmUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3QnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBhcnRpY2xlcyBmcm9tIGEgbGlzdH19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmNob29zaW5nX2FydGljbGVzLnByZXBhcmVfbGlzdC5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IG5leHQgd2VlaydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gbmV4dCB3ZWVrIH19J1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRGlzY3VzcyB0b3BpY3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdTZWxlY3QgYXJ0aWNsZSBmcm9tIHN0dWRlbnQgY2hvaWNlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXN9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5jaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ29tcGlsZSBhIGJpYmxpb2dyYXBoeSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGlsZSBhIGJpYmxpb2dyYXBoeX19J1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogN1xuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnZlbnRpb25hbCBvdXRsaW5lICdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5yZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBXaXphcmREYXRhLmRyYWZ0c19tYWluc3BhY2Uuc2FuZGJveC5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnZlbnRpb25hbCBvdXRsaW5lIHwgc2FuZGJveCA9IG5vJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5yZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBXaXphcmREYXRhLmRyYWZ0c19tYWluc3BhY2Uud29ya19saXZlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnT3V0bGluZSBhcyBsZWFkIHNlY3Rpb24nXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL091dGxpbmUgYXMgbGVhZCBzZWN0aW9ufX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucmVzZWFyY2hfcGxhbm5pbmcud3JpdGVfbGVhZC5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmcnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnTW92aW5nIGFydGljbGVzIHRvIHRoZSBtYWluIHNwYWNlJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTWFpbiBzcGFjZSBpbiBjbGFzcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTW92ZSB0byBtYWluIHNwYWNlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Nb3ZlIHRvIG1haW4gc3BhY2V9fSdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0RZSyBub21pbmF0aW9ucydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZHlrLmR5ay5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0V4cGFuZCB5b3VyIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGFuZCB5b3VyIGFydGljbGV9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0J1aWxkaW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQnVpbGRpbmcgYXJ0aWNsZXMgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBvbmUgcGVlciByZXZpZXcgYXJ0aWNsZX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnNbMF0uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fSB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnIVdpemFyZERhdGEucGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9uc1swXS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDJcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0NyZWF0aW5nIGZpcnN0IGRyYWZ0J11cbiAgICBpbl9jbGFzczogW1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ29tcGxldGUgZmlyc3QgZHJhZnQnICMxRENcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDZcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0dldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0dyb3VwIHN1Z2dlc3Rpb25zJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Hcm91cCBzdWdnZXN0aW9uc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRG8gb25lIHBlZXIgcmV2aWV3J1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBvbmUgcGVlciByZXZpZXd9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzBdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnRG8gcGVlciByZXZpZXdzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0ge3twZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy52YWx1ZX19IH19J1xuICAgICAgICBjb25kaXRpb246ICchV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzBdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19J1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ1Jlc3BvbmRpbmcgdG8gZmVlZGJhY2snXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdNZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9uJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdNYWtlIGVkaXRzIGJhc2VkIG9uIHBlZXIgcmV2aWV3cycgI1JGQiBcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3N9fScgI1JGQiBcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAxXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnIFxuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDNcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlcycgXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlc319JyBcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDRcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzfX0nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdQcmVwYXJlIGluLWNsYXNzIHByZXNlbnRhdGlvbidcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDlcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0ZpbmlzaGluZyB0b3VjaGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnSW4tY2xhc3MgcHJlc2VudGF0aW9ucydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMuY2xhc3NfcHJlc2VudGF0aW9uLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUmVmbGVjdGl2ZSBlc3NheX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMucmVmbGVjdGl2ZV9lc3NheS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dpa2lwZWRpYSBwb3J0Zm9saW99fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLnBvcnRmb2xpby5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PcmlnaW5hbCBhcmd1bWVudCBwYXBlcn19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMub3JpZ2luYWxfcGFwZXIuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMTBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0R1ZSBkYXRlJyBdXG4gICAgaW5fY2xhc3M6IFtdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQWxsIHN0dWRlbnRzIGZpbmlzaGVkJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BbGwgc3R1ZGVudHMgZmluaXNoZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lbGluZURhdGFcblxuIiwiIyMgVEhJUyBGSUxFIElOQ0xVREVTIFRIRSBXSUtJIE9VVFBVVCBURU1QTEFURSBDSFVOS1MgVVNFRCBGT1IgRklOQUwgT1VUUFVUIC0gRk9SIEFMVCBBU1NJR05NRU5UIFRZUEVTICMjXG5cblxuVGltZWxpbmVEYXRhQWx0ID0gXG4gIG11bHRpbWVkaWE6IFtcbiAgICBcIj09IElsbHVzdHJhdGluZyBXaWtpcGVkaWEgPT1cIlxuICAgIFwie3thc3NpZ25tZW50fX1cIlxuICAgIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19XCJcbiAgICBcIjxici8+e3tlbmQgb2YgY291cnNlIGFzc2lnbm1lbnR9fVwiXG4gIF1cbiAgY29weWVkaXQ6IFtcbiAgICBcIj09IENvcHllZGl0IFdpa2lwZWRpYSA9PVwiXG4gICAgXCJ7e2Fzc2lnbm1lbnR9fVwiXG4gICAgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29weWVkaXQgYW4gYXJ0aWNsZX19XCJcbiAgICBcIjxici8+e3tlbmQgb2YgY291cnNlIGFzc2lnbm1lbnR9fVwiXG4gIF1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lbGluZURhdGFBbHRcblxuIiwiIyMgVEhJUyBGSUxFIElTIFRIRSBEQVRBIENPTlRFTlQgQU5EIFNURVAgT1JERVIgQ09ORklHUkFUSU9OIEZPUiBUSEUgV0laQVJEIEFTIFdFTEwgQVMgQVNTSUdOTUVOVCBQQVRIV0FZUyAjI1xuIyMgVU5DT01NRU5USU5HIFRIRSBEQVRBIElOU0lERSBUSEUgUEFUSFdBWVMgU0VDVElPTiBXTEwgQUREIE1PUkUgU1RFUFMgSU5UTyBUSE9TRSBBTFRFUk5BVElWRSBQQVRIV0FZUyAjI1xuXG5XaXphcmRDb25maWcgPSB7XG4gIGludHJvX3N0ZXBzOiBbXG4gICAge1xuICAgICAgaWQ6IFwiaW50cm9cIlxuICAgICAgdGl0bGU6ICc8Y2VudGVyPldlbGNvbWUgdG8gdGhlPGJyIC8+QXNzaWdubWVudCBEZXNpZ24gV2l6YXJkITwvY2VudGVyPidcbiAgICAgIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICAgICAgaW5zdHJ1Y3Rpb25zOiAnJ1xuICAgICAgaW5wdXRzOiBbXVxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCBoZWxwIHlvdSB0byBlYXNpbHkgY3JlYXRlIGEgY3VzdG9taXplZCBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnQgYW5kIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPldoZW4geW914oCZcmUgZmluaXNoZWQsIHlvdSdsbCBoYXZlIGEgcmVhZHktdG8tdXNlIGxlc3NvbiBwbGFuLCB3aXRoIHdlZWtseSBhc3NpZ25tZW50cywgcHVibGlzaGVkIGRpcmVjdGx5IG9udG8gYSBzYW5kYm94IHBhZ2Ugb24gV2lraXBlZGlhIHdoZXJlIHlvdSBjYW4gY3VzdG9tZWl6ZSBpdCBldmVuIGZ1cnRoZXIuPC9wPlwiICAgICBcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5MZXTigJlzIHN0YXJ0IGJ5IGZpbGxpbmcgaW4gc29tZSBiYXNpY3MgYWJvdXQgeW91IGFuZCB5b3VyIGNvdXJzZTo8L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gICAge1xuICAgICAgaWQ6IFwiYXNzaWdubWVudF9zZWxlY3Rpb25cIlxuICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgYXNzaWdubWVudCBzZWxlY3Rpb25zJ1xuICAgICAgZm9ybVRpdGxlOiAnQXZhaWxhYmxlIGFzc2lnbm1lbnRzOidcbiAgICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGlzIHN1aXRhYmxlIGZvciBXaWtpcGVkaWEgPGVtPmFuZDwvZW0+IGFjaGlldmVzIHlvdXIgc3R1ZGVudCBsZWFybmluZyBvYmplY3RpdmVzLiBZb3VyIGZpcnN0IHN0ZXAgaXMgdG8gY2hvb3NlIHdoaWNoIGFzc2lnbm1lbnQocykgeW91J2xsIGJlIGFza2luZyB5b3VyIHN0dWRlbnRzIHRvIGNvbXBsZXRlIGFzIHBhcnQgb2YgdGhlIGNvdXJzZS5cIlxuICAgICAgaW5wdXRzOiBbXVxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+V2UndmUgY3JlYXRlZCBzb21lIGd1aWRlbGluZXMgdG8gaGVscCB5b3UsIGJ1dCB5b3UnbGwgbmVlZCB0byBtYWtlIHNvbWUga2V5IGRlY2lzaW9ucywgc3VjaCBhczogd2hpY2ggbGVhcm5pbmcgb2JqZWN0aXZlcyBhcmUgeW91IHRhcmdldGluZyB3aXRoIHRoaXMgYXNzaWdubWVudD8gV2hhdCBza2lsbHMgZG8geW91ciBzdHVkZW50cyBhbHJlYWR5IGhhdmU/IEhvdyBtdWNoIHRpbWUgY2FuIHlvdSBkZXZvdGUgdG8gdGhlIGFzc2lnbm1lbnQ/PC9wPlwiXG4gICAgICAgICAgICBcIjxwPk1vc3QgaW5zdHJ1Y3RvcnMgYXNrIHRoZWlyIHN0dWRlbnRzIHRvIHdyaXRlIG9yIGV4cGFuZCBhbiBhcnRpY2xlLiBTdHVkZW50cyBzdGFydCBieSBsZWFybmluZyB0aGUgYmFzaWNzIG9mIFdpa2lwZWRpYSwgYW5kIHRoZW4gZm9jdXMgb24gdGhlIGNvbnRlbnQuIFRoZXkgcGxhbiwgcmVzZWFyY2gsIGFuZCB3cml0ZSBhIHByZXZpb3VzbHkgbWlzc2luZyBXaWtpcGVkaWEgYXJ0aWNsZSwgb3IgY29udHJpYnV0ZSB0byBhbiBpbmNvbXBsZXRlIGVudHJ5IG9uIGEgY291cnNlLXJlbGF0ZWQgdG9waWMuIFRoaXMgYXNzaWdubWVudCB0eXBpY2FsbHkgcmVwbGFjZXMgYSB0ZXJtIHBhcGVyIG9yIHJlc2VhcmNoIHByb2plY3QsIG9yIGl0IGZvcm1zIHRoZSBsaXRlcmF0dXJlIHJldmlldyBzZWN0aW9uIG9mIGEgbGFyZ2VyIHBhcGVyLiBUaGUgc3R1ZGVudCBsZWFybmluZyBvdXRjb21lIGlzIGhpZ2ggd2l0aCB0aGlzIGFzc2lnbm1lbnQsIGJ1dCBpdCBkb2VzIHRha2UgYSBzaWduaWZpY2FudCBhbW91bnQgb2YgdGltZS4gWW91ciBzdHVkZW50cyBuZWVkIHRvIGxlYXJuIGJvdGggdGhlIHdpa2kgbWFya3VwIGxhbmd1YWdlIGFuZCBrZXkgcG9saWNpZXMgYW5kIGV4cGVjdGF0aW9ucyBvZiB0aGUgV2lraXBlZGlhLWVkaXRpbmcgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5JZiB3cml0aW5nIGFuIGFydGljbGUgaXNuJ3QgcmlnaHQgZm9yIHlvdXIgY2xhc3MsIG90aGVyIGFzc2lnbm1lbnQgb3B0aW9ucyBvZmZlciBzdHVkZW50cyB2YWx1YWJsZSBsZWFybmluZyBvcHBvcnR1bml0aWVzIGFuZCBoZWxwIHRvIGltcHJvdmUgV2lraXBlZGlhLiBTZWxlY3QgYW4gYXNzaWdubWVudCB0eXBlIG9uIHRoZSBsZWZ0IHRvIGxlYXJuIG1vcmUuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICBdXG4gIHBhdGh3YXlzOiB7XG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICByZXNlYXJjaHdyaXRlOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcImxlYXJuaW5nX2Vzc2VudGlhbHNcIlxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuXCJcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIHVzZXIgYWNjb3VudHMgYW5kIHRoZW4gY29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5TdHVkZW50cyB3aG8gY29tcGxldGUgdGhpcyB0cmFpbmluZyBhcmUgYmV0dGVyIHByZXBhcmVkIHRvIGZvY3VzIG9uIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgc3BlbmQgbGVzcyB0aW1lIGRpc3RyYWN0ZWQgYnkgY2xlYW5pbmcgdXAgYWZ0ZXIgZXJyb3JzLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5XaWxsIGNvbXBsZXRpb24gb2YgdGhlIHN0dWRlbnQgdHJhaW5pbmcgYmUgcGFydCBvZiB5b3VyIHN0dWRlbnRzXFwnIGdyYWRlcz8gKE1ha2UgeW91ciBjaG9pY2UgYXQgdGhlIHRvcCBsZWZ0Lik8L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lcydcbiAgICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Db21wbGV0ZSB0aGUgPGVtPm9ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHM8L2VtPi4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgICAgICB0aXRsZTogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGVhcmx5IGVkaXRpbmcgdGFza3MnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIGVhcmx5IG9uLiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgICAgICBmb3JtVGl0bGU6ICdXaGljaCBiYXNpYyBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlPydcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+V2hpY2ggaW50cm9kdWN0b3J5IGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSB0byBhY2NsaW1hdGUgeW91ciBzdHVkZW50cyB0byBXaWtpcGVkaWE/IFlvdSBjYW4gc2VsZWN0IG5vbmUsIG9uZSwgb3IgbW9yZS4gV2hpY2hldmVyIHlvdSBzZWxlY3Qgd2lsbCBiZSBhZGRlZCB0byB0aGUgYXNzaWdubWVudCB0aW1lbGluZS48L3A+J1xuICAgICAgICAgICAgICAnPHVsPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+QWRkIHRvIGFuIGFydGljbGUuPC9zdHJvbmc+IFVzaW5nIGNvdXJzZSByZWFkaW5ncyBvciBvdGhlciByZWxldmFudCBzZWNvbmRhcnkgc291cmNlcywgYWRkIDHigJMyIHNlbnRlbmNlcyBvZiBuZXcgaW5mb3JtYXRpb24gdG8gYSBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcy4gQmUgc3VyZSB0byBpbnRlZ3JhdGUgaXQgd2VsbCBpbnRvIHRoZSBleGlzdGluZyBhcnRpY2xlLCBhbmQgaW5jbHVkZSBhIGNpdGF0aW9uIHRvIHRoZSBzb3VyY2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q29weWVkaXQgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQnJvd3NlIFdpa2lwZWRpYSB1bnRpbCB5b3UgZmluZCBhbiBhcnRpY2xlIHRoYXQgeW91IHdvdWxkIGxpa2UgdG8gaW1wcm92ZSwgYW5kIG1ha2Ugc29tZSBlZGl0cyB0byBpbXByb3ZlIHRoZSBsYW5ndWFnZSBvciBmb3JtYXR0aW5nLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgdXBsb2FkaW5nIGFuZCBhZGRpbmcgYSBwaG90byB5b3UgdG9vay48L2xpPlxuICAgICAgICAgICAgICA8L3VsPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+Rm9yIG1vc3QgY291cnNlcywgdGhlIDxlbT5Dcml0aXF1ZSBhbiBhcnRpY2xlPC9lbT4gYW5kIDxlbT5BZGQgdG8gYW4gYXJ0aWNsZTwvZW0+IGV4ZXJjaXNlcyBwcm92aWRlIGEgbmljZSBmb3VuZGF0aW9uIGZvciB0aGUgbWFpbiB3cml0aW5nIHByb2plY3QuIFRoZXNlIGhhdmUgYmVlbiBzZWxlY3RlZCBieSBkZWZhdWx0LjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgIHRpdGxlOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGZvcm1UaXRsZTogJ0hvdyB3aWxsIHlvdXIgY2xhc3Mgc2VsZWN0IGFydGljbGVzPydcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkNob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlNvbWUgYXJ0aWNsZXMgbWF5IGluaXRpYWxseSBsb29rIGVhc3kgdG8gaW1wcm92ZSwgYnV0IHF1YWxpdHkgcmVmZXJlbmNlcyB0byBleHBhbmQgdGhlbSBtYXkgYmUgZGlmZmljdWx0IHRvIGZpbmQuIEZpbmRpbmcgdG9waWNzIHdpdGggdGhlIHJpZ2h0IGJhbGFuY2UgYmV0d2VlbiBwb29yIFdpa2lwZWRpYSBjb3ZlcmFnZSBhbmQgYXZhaWxhYmxlIGxpdGVyYXR1cmUgZnJvbSB3aGljaCB0byBleHBhbmQgdGhhdCBjb3ZlcmFnZSBjYW4gYmUgdHJpY2t5LiBIZXJlIGFyZSBzb21lIGd1aWRlbGluZXMgdG8ga2VlcCBpbiBtaW5kIHdoZW4gc2VsZWN0aW5nIGFydGljbGVzIGZvciBpbXByb3ZlbWVudC48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0dvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5HcmF2aXRhdGUgdG93YXJkIFxcXCJzdHViXFxcIiBhbmQgXFxcInN0YXJ0XFxcIiBjbGFzcyBhcnRpY2xlcy4gVGhlc2UgYXJ0aWNsZXMgb2Z0ZW4gaGF2ZSBvbmx5IDHigJMyIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gUmVsZXZhbnQgV2lraVByb2plY3QgcGFnZXMgY2FuIHByb3ZpZGUgYSBsaXN0IG9mIHN0dWJzIHRoYXQgbmVlZCBpbXByb3ZlbWVudC48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdOb3Qgc3VjaCBhIGdvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5BcnRpY2xlcyB0aGF0IGFyZSBcIm5vdCBzdWNoIGEgZ29vZCBjaG9pY2VcIiBmb3IgbmV3Y29tZXJzIHVzdWFsbHkgaW52b2x2ZSBhIGxhY2sgb2YgYXBwcm9wcmlhdGUgcmVzZWFyY2ggbWF0ZXJpYWwsIGhpZ2hseSBjb250cm92ZXJzaWFsIHRvcGljcyB0aGF0IG1heSBhbHJlYWR5IGJlIHdlbGwgZGV2ZWxvcGVkLCBicm9hZCBzdWJqZWN0cywgb3IgdG9waWNzIGZvciB3aGljaCBpdCBpcyBkaWZmaWN1bHQgdG8gZGVtb25zdHJhdGUgbm90YWJpbGl0eS48L3A+J1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Zb3Ugc2hvdWxkIHByb2JhYmx5IGF2b2lkIHRyeWluZyB0byBpbXByb3ZlIGFydGljbGVzIG9uIHRvcGljcyB0aGF0IGFyZSBoaWdobHkgY29udHJvdmVyc2lhbCAoZm9yIGV4YW1wbGUsIEdsb2JhbCBXYXJtaW5nLCBBYm9ydGlvbiwgb3IgU2NpZW50b2xvZ3kpLiBZb3UgbWF5IGJlIG1vcmUgc3VjY2Vzc2Z1bCBzdGFydGluZyBhIHN1Yi1hcnRpY2xlIG9uIHRoZSB0b3BpYyBpbnN0ZWFkLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Eb24ndCBzdGFydCBhcnRpY2xlcyB3aXRoIHRpdGxlcyB0aGF0IGltcGx5IGFuIGFyZ3VtZW50IG9yIGVzc2F5LWxpa2UgYXBwcm9hY2ggKGUuZy4sIFRoZSBFZmZlY3RzIFRoYXQgVGhlIFJlY2VudCBTdWItUHJpbWUgTW9ydGdhZ2UgQ3Jpc2lzIGhhcyBoYWQgb24gdGhlIFVTIGFuZCBHbG9iYWwgRWNvbm9taWNzKS4gVGhlc2UgdHlwZSBvZiB0aXRsZXMsIGFuZCBtb3N0IGxpa2VseSB0aGUgY29udGVudCB0b28sIG1heSBub3QgYmUgYXBwcm9wcmlhdGUgZm9yIGFuIGVuY3ljbG9wZWRpYS48L2xpPlxuICAgICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlIGluc3RydWN0b3IsIHlvdSBzaG91bGQgYXBwbHkgeW91ciBvd24gZXhwZXJ0aXNlIHRvIGV4YW1pbmluZyBXaWtpcGVkaWHigJlzIGNvdmVyYWdlIG9mIHlvdXIgZmllbGQuIFlvdSB1bmRlcnN0YW5kIHRoZSBicm9hZGVyIGludGVsbGVjdHVhbCBjb250ZXh0IHdoZXJlIGluZGl2aWR1YWwgdG9waWNzIGZpdCBpbiwgeW91IGNhbiByZWNvZ25pemUgd2hlcmUgV2lraXBlZGlhIGZhbGxzIHNob3J0LCB5b3Uga25vd+KAlG9yIGtub3cgaG93IHRvIGZpbmTigJR0aGUgcmVsZXZhbnQgbGl0ZXJhdHVyZSwgYW5kIHlvdSBrbm93IHdoYXQgdG9waWNzIHlvdXIgc3R1ZGVudHMgc2hvdWxkIGJlIGFibGUgdG8gaGFuZGxlLiBZb3VyIGd1aWRhbmNlIG9uIGFydGljbGUgY2hvaWNlIGFuZCBzb3VyY2luZyBpcyBjcml0aWNhbCBmb3IgYm90aCB5b3VyIHN0dWRlbnRz4oCZIHN1Y2Nlc3MgYW5kIHRoZSBpbXByb3ZlbWVudCBvZiBXaWtpcGVkaWEuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlRoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gSGF2aW5nIHN0dWRlbnRzIGZpbmQgdGhlaXIgb3duIGFydGljbGVzIHByb3ZpZGVzIHRoZW0gd2l0aCBhIHNlbnNlIG9mIG1vdGl2YXRpb24gYW5kIG93bmVyc2hpcCBvdmVyIHRoZSBhc3NpZ25tZW50IGFuZCBleGVyY2lzZXMgdGhlaXIgY3JpdGljYWwgdGhpbmtpbmcgc2tpbGxzIGFzIHRoZXkgaWRlbnRpZnkgY29udGVudCBnYXBzLCBidXQgaXQgbWF5IGFsc28gbGVhZCB0byBjaG9pY2VzIHRoYXQgYXJlIGZ1cnRoZXIgYWZpZWxkIGZyb20gY291cnNlIG1hdGVyaWFsLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJyZXNlYXJjaF9wbGFubmluZ1wiXG4gICAgICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdIb3cgc2hvdWxkIHN0dWRlbnRzIHBsYW4gdGhlaXIgYXJ0aWNsZXM/J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGFibGUgZm9yIFdpa2lwZWRpYS4gVGhhdCdzIHdoeSB3ZSByZWNvbW1lbmQgYXNraW5nIHN0dWRlbnRzIHRvIHB1dCB0b2dldGhlciBhIGJpYmxpb2dyYXBoeSBvZiBtYXRlcmlhbHMgdGhleSB3YW50IHRvIHVzZSBpbiBlZGl0aW5nIHRoZSBhcnRpY2xlLCB3aGljaCBjYW4gdGhlbiBiZSBhc3Nlc3NlZCBieSB5b3UgYW5kIG90aGVyIFdpa2lwZWRpYW5zLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIHRpdGxlOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3ggcGFnZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIG9mIGVhY2ggYXBwcm9hY2guJ1xuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBzYW5kYm94ZXMnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U2FuZGJveGVzIOKAlCBwYWdlcyBhc3NvY2lhdGVkIHdpdGggYW4gaW5kaXZpZHVhbCBlZGl0b3IgdGhhdCBhcmUgbm90IGNvbnNpZGVyZWQgcGFydCBvZiBXaWtpcGVkaWEgcHJvcGVyIOKAlCBtYWtlIHN0dWRlbnRzIGZlZWwgc2FmZS4gVGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMgb3Igb3RoZXIgV2lraXBlZGlhbnMgYWx0ZXJpbmcgdGhlaXIgd3JpdGluZy4gSG93ZXZlciwgc2FuZGJveCBlZGl0aW5nIGxpbWl0cyBtYW55IG9mIHRoZSB1bmlxdWUgYXNwZWN0cyBvZiBXaWtpcGVkaWEgYXMgYSB0ZWFjaGluZyB0b29sLCBzdWNoIGFzIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBhbmQgaW5jcmVtZW50YWwgZHJhZnRpbmcuIFNwZW5kaW5nIG1vcmUgdGhhbiBhIHdlZWsgb3IgdHdvIGluIHNhbmRib3hlcyBpcyBzdHJvbmdseSBkaXNjb3VyYWdlZC48L3A+XCIgXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBlZGl0aW5nIGxpdmUnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RWRpdGluZyBsaXZlIGlzIGV4Y2l0aW5nIGZvciB0aGUgc3R1ZGVudHMgYmVjYXVzZSB0aGV5IGNhbiBzZWUgdGhlaXIgY2hhbmdlcyB0byB0aGUgYXJ0aWNsZXMgaW1tZWRpYXRlbHkgYW5kIGV4cGVyaWVuY2UgdGhlIGNvbGxhYm9yYXRpdmUgZWRpdGluZyBwcm9jZXNzIHRocm91Z2hvdXQgdGhlIGFzc2lnbm1lbnQuIEhvd2V2ZXIsIGJlY2F1c2UgbmV3IGVkaXRvcnMgb2Z0ZW4gdW5pbnRlbnRpb25hbGx5IGJyZWFrIFdpa2lwZWRpYSBydWxlcywgc29tZXRpbWVzIHN0dWRlbnRz4oCZIGFkZGl0aW9ucyBhcmUgcXVlc3Rpb25lZCBvciByZW1vdmVkLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgICAgIHRpdGxlOiAnUGVlciBmZWVkYmFjaydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICAgICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkNvbGxhYm9yYXRpb24gaXMgYSBjcml0aWNhbCBlbGVtZW50IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEuXCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5QZWVyIHJldmlld3MgYXJlIGFub3RoZXIgY2hhbmNlIGZvciBzdHVkZW50cyB0byBwcmFjdGljZSBjcml0aWNhbCB0aGlua2luZy4gVXNlZnVsIHJldmlld3MgZm9jdXMgb24gc3BlY2lmaWMgaXNzdWVzIHRoYXQgY2FuIGJlIGltcHJvdmVkLiBTaW5jZSBzdHVkZW50cyBhcmUgdXN1YWxseSBoZXNpdGFudCB0byBjcml0aWNpemUgdGhlaXIgY2xhc3NtYXRlc+KAlGFuZCBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyBtYXkgZ2V0IGFubm95ZWQgd2l0aCBhIHN0cmVhbSBvZiBwcmFpc2UgZnJvbSBzdHVkZW50cyB0aGF0IGdsb3NzZXMgb3ZlciBhbiBhcnRpY2xlJ3Mgc2hvcnRjb21pbmdz4oCUaXQncyBpbXBvcnRhbnQgdG8gZ2l2ZXMgZXhhbXBsZXMgb2YgdGhlIGtpbmRzIG9mIGNvbnN0cnVjdGl2ZWx5IGNyaXRpY2FsIGZlZWRiYWNrIHRoYXQgYXJlIHRoZSBtb3N0IGhlbHBmdWwuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+SG93IG1hbnkgcGVlciByZXZpZXdzIHdpbGwgeW91IGFzayBlYWNoIHN0dWRlbnQgdG8gY29udHJpYnV0ZSBkdXJpbmcgdGhlIGNvdXJzZT88L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICAgICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyAob3B0aW9uYWwpOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkJ5IHRoZSB0aW1lIHN0dWRlbnRzIGhhdmUgbWFkZSBpbXByb3ZlbWVudHMgYmFzZWQgb24gY2xhc3NtYXRlcycgY29tbWVudHPigJRhbmQgaWRlYWxseSBzdWdnZXN0aW9ucyBmcm9tIHlvdSBhcyB3ZWxs4oCUdGhleSBzaG91bGQgaGF2ZSBwcm9kdWNlZCBuZWFybHkgY29tcGxldGUgYXJ0aWNsZXMuIE5vdyBpcyB0aGUgY2hhbmNlIHRvIGVuY291cmFnZSB0aGVtIHRvIHdhZGUgYSBsaXR0bGUgZGVlcGVyIGludG8gV2lraXBlZGlhIGFuZCBpdHMgbm9ybXMgYW5kIGNyaXRlcmlhIHRvIGNyZWF0ZSBncmVhdCBjb250ZW50LlwiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgXCI8cD5Zb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0cyBhbmQgbGltaXRzIG9mIFdpa2lwZWRpYS4gQ29uc2lkZXIgYnJpbmdpbmcgaW4gYSBndWVzdCBzcGVha2VyLCBoYXZpbmcgYSBwYW5lbCBkaXNjdXNzaW9uLCBvciBzaW1wbHkgaGF2aW5nIGFuIG9wZW4gZGlzY3Vzc2lvbiBpbiBjbGFzcyBhYm91dCB3aGF0IHRoZSBzdHVkZW50cyBoYXZlIGRvbmUgc28gZmFyIGFuZCB3aHkgKG9yIHdoZXRoZXIpIGl0IG1hdHRlcnMuPC9wPlwiXG4gICAgICAgICAgICAgXCI8cD5JbiBhZGRpdGlvbiB0byB0aGUgV2lraXBlZGlhIGFydGljbGUgd3JpdGluZyBpdHNlbGYsIHlvdSBtYXkgd2FudCB0byB1c2UgYSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnQuIFRoZXNlIGFzc2lnbm1lbnRzIGNhbiByZWluZm9yY2UgYW5kIGRlZXBlbiB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgYWxzbyBoZWxwIHlvdSB0byB1bmRlcnN0YW5kIGFuZCBldmFsdWF0ZSB0aGUgc3R1ZGVudHMnIHdvcmsgYW5kIGxlYXJuaW5nIG91dGNvbWVzLiBPbiB0aGUgbGVmdCBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuIFNjcm9sbCBvdmVyIGVhY2ggZm9yIG1vcmUgaW5mb3JtYXRpb24sIGFuZCBzZWxlY3QgYW55IHRoYXQgeW91IHdpc2ggdG8gdXNlIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJkeWtcIlxuICAgICAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5EaWQgWW91IEtub3c8L2VtPiBwcm9jZXNzJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RGlkIFlvdSBLbm93IChEWUspIGlzIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBoaWdobGlnaHRpbmcgbmV3IGNvbnRlbnQgdGhhdCBoYXMgYmVlbiBhZGRlZCB0byBXaWtpcGVkaWEgaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy4gRFlLIGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+VGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4IG9yIG1vcmUpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBTdHVkZW50cyB3aG8gbWVldCB0aGlzIGNyaXRlcmlhIG1heSB3YW50IHRvIG5vbWluYXRlIHRoZWlyIGNvbnRyaWJ1dGlvbnMgZm9yIERZSy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBhcyB0aGUgRFlLIG5vbWluYXRpb24gcHJvY2VzcyBjYW4gYmUgZGlmZmljdWx0IGZvciBuZXdjb21lcnMgdG8gbmF2aWdhdGUuIEhvd2V2ZXIsIGl0IG1ha2VzIGEgZ3JlYXQgc3RyZXRjaCBnb2FsIHdoZW4gdXNlZCBzZWxlY3RpdmVseS48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBoZWxwIHlvdSBhbmQgeW91ciBzdHVkZW50cyBkdXJpbmcgdGhlIHRlcm0gdG8gaWRlbnRpZnkgd29yayB0aGF0IG1heSBiZSBhIGdvb2QgY2FuZGlkYXRlIGZvciBEWUsgYW5kIGFuc3dlciBxdWVzdGlvbnMgeW91IG1heSBoYXZlIGFib3V0IHRoZSBub21pbmF0aW9uIHByb2Nlc3MuPC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZ2FcIlxuICAgICAgICB0aXRsZTogJ0dvb2QgQXJ0aWNsZSBwcm9jZXNzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5Hb29kIEFydGljbGU8L2VtPiBwcm9jZXNzJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGlzIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IHdlbGwtZGV2ZWxvcGVkLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMgYW5kIHdobyBhcmUgd2lsbGluZyB0byBjb21lIGJhY2sgdG8gYWRkcmVzcyByZXZpZXdlciBmZWVkYmFjayAoZXZlbiBhZnRlciB0aGUgdGVybSBlbmRzKTwvZW0+LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBwcm92aWRlIGFkdmljZSBhbmQgc3VwcG9ydCB0byBoaWdoLWFjaGlldmluZyBzdHVkZW50cyB3aG8gYXJlIGludGVyZXN0ZWQgaW4gdGhlIEdvb2QgQXJ0aWNsZSBwcm9jZXNzLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nXCJcbiAgICAgICMgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgICBcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgIyAgICAgICAgIFwiPHVsPlxuICAgICAgIyAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgIyAgICAgICAgIDwvdWw+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgICAgIFxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cCBjbGFzcz0nZGVzY3JpcHRpb24tY29udGFpbmVyJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTowOyc+PC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8ZGl2IGNsYXNzPSdmb3JtLWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICA8Zm9ybSBpZD0nY291cnNlTGVuZ3RoJyBvbmlucHV0PSdvdXQudmFsdWUgPSBwYXJzZUludChjb3Vyc2VMZW5ndGgudmFsdWUpOyBvdXQyLnZhbHVlID0gcGFyc2VJbnQoY291cnNlTGVuZ3RoLnZhbHVlKTsnIG9uc3VibWl0PSdyZXR1cm4gZmFsc2UnPlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1TdGFydERhdGUnPlRlcm0gYmVnaW5zPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3Rlcm1TdGFydERhdGUnIG5hbWU9J3Rlcm1TdGFydERhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT0nZGlzcGxheTogbm9uZTsnPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1FbmREYXRlJz5UZXJtIGVuZHM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0ndGVybUVuZERhdGUnIG5hbWU9J3Rlcm1FbmREYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWRpdi5vdmVydmlldy1pbnB1dC1jb250YWluZXIgLS0+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWxhYmVsezpmb3IgPT4gJ2VuZERhdGUnfSBFbmQgV2VlayBvZiAtLT5cbiAgICAgICMgICAgICAgICAgICAgPCEtLSAlaW5wdXR7OnR5cGUgPT4gJ2RhdGUnLCA6aWQgPT4gJ2VuZERhdGUnLCA6bmFtZSA9PiAnZW5kRGF0ZSd9IC0tPlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J2NvdXJzZVN0YXJ0RGF0ZSc+Q291cnNlIHN0YXJ0cyBvbjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdjb3Vyc2VTdGFydERhdGUnIG5hbWU9J2NvdXJzZVN0YXJ0RGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInIHN0eWxlPSdkaXNwbGF5OiBub25lOyc+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3RhcnRXZWVrT2ZEYXRlJz5TdGFydCB3ZWVrIG9mPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3N0YXJ0V2Vla09mRGF0ZScgbmFtZT0nc3RhcnRXZWVrT2ZEYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcicgc3R5bGU9J2Rpc3BsYXk6IG5vbmU7Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdlbmRXZWVrT2ZEYXRlJz5FbmQgd2VlayBvZjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdlbmRXZWVrT2ZEYXRlJyBuYW1lPSdlbmRXZWVrT2ZEYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlTGVuZ3RoJz5Db3Vyc2UgTGVuZ3RoPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgZGVmYXVsdFZhbHVlPScxNicgaWQ9J2NMZW5ndGgnIG1heD0nMTYnIG1pbj0nNicgbmFtZT0nY291cnNlTGVuZ3RoJyBzdGVwPScxJyB0eXBlPSdyYW5nZScgdmFsdWU9JzE2Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8b3V0cHV0IG5hbWU9J291dDInPjE2PC9vdXRwdXQ+XG4gICAgICAjICAgICAgICAgICAgICAgPHNwYW4+d2Vla3M8L3NwYW4+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdtb25kYXknIG5hbWU9J01vbmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScwJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J21vbmRheSc+TW9uZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndHVlc2RheScgbmFtZT0nVHVlc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScxJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3R1ZXNkYXknPlR1ZXNkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd3ZWRuZXNkYXknIG5hbWU9J1dlZG5lc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3dlZG5lc2RheSc+V2VkbmVzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndGh1cnNkYXknIG5hbWU9J1RodXJzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzMnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGh1cnNkYXknPlRodXJzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nZnJpZGF5JyBuYW1lPSdGcmlkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNCc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdmcmlkYXknPkZyaWRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3NhdHVyZGF5JyBuYW1lPSdTYXR1cmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSc1Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3NhdHVyZGF5Jz5TYXR1cmRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3N1bmRheScgbmFtZT0nU3VuZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzYnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3VuZGF5Jz5TdW5kYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXJlYWRvdXQtaGVhZGVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdyZWFkb3V0Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxvdXRwdXQgZm9yPSdjb3Vyc2VMZW5ndGgnIGlkPSdjb3Vyc2VMZW5ndGhSZWFkb3V0JyBuYW1lPSdvdXQnPjE2PC9vdXRwdXQ+XG4gICAgICAjICAgICAgICAgICAgICAgICA8c3Bhbj53ZWVrczwvc3Bhbj5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAjICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgPGRpdj5cbiAgICAgICMgICAgICAgICAgIDxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyJz48L2Rpdj5cbiAgICAgICMgICAgICAgICA8L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgbXVsdGltZWRpYTogW1xuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwibXVsdGltZWRpYV8xXCJcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIHRpdGxlOiAnTXVsdGltZWRpYSBzdGVwIDEnXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm11bHRpbWVkaWFfMlwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICMgICB0aXRsZTogJ011bHRpbWVkaWEgc3RlcCAyJ1xuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nX211bHRpbWVkaWFcIlxuICAgICAgIyAgIHR5cGU6IFwiZ3JhZGluZ1wiXG4gICAgICAjICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgICAgIyAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgICAgXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJvdmVydmlld1wiXG4gICAgICAjICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgICAgIyAgIHR5cGU6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiXCJcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICMgICAgICAgICBcIjx1bD5cbiAgICAgICMgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICMgICAgICAgICA8L3VsPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICAgICBcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHAgY2xhc3M9J2Rlc2NyaXB0aW9uLWNvbnRhaW5lcic+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnJ1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICBdXG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBjb3B5ZWRpdDogW1xuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiY29weWVkaXRfMVwiXG4gICAgICAjICAgdGl0bGU6ICdDb3B5IEVkaXQgc3RlcCAxJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImNvcHllZGl0XzJcIlxuICAgICAgIyAgIHRpdGxlOiAnQ29weSBFZGl0IHN0ZXAgMidcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nX2NvcHllZGl0XCJcbiAgICAgICMgICB0eXBlOiBcImdyYWRpbmdcIlxuICAgICAgIyAgIHRpdGxlOiAnR3JhZGluZydcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICAgIFxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHR5cGU6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgdGhlIGNvdXJzZVwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIlwiXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAjICAgICAgICAgXCI8dWw+XG4gICAgICAjICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAjICAgICAgICAgPC91bD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAgICAgXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICB9XG4gIG91dHJvX3N0ZXBzOiBbXG4gICAge1xuICAgICAgaWQ6IFwiZ3JhZGluZ1wiXG4gICAgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICBzZWN0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgIFxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgICAgaW5wdXRzOiBbXVxuICAgIH1cbiAgICB7XG4gICAgICBpZDogXCJvdmVydmlld1wiXG4gICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInIHN0eWxlPSdtYXJnaW4tYm90dG9tOjA7Jz48L3A+XCJcbiAgICAgICAgICAgIFwiPGRpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXInPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgIyB7XG4gICAgICAgICMgICBjb250ZW50OiBbXG4gICAgICAgICMgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICAjICAgXVxuICAgICAgICAjIH1cbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgICBpbnB1dHM6IFtdXG4gICAgfVxuICBdXG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ29uZmlnXG5cbiIsIiMjIFRISVMgRklMRSBJUyBUSEUgREFUQSBTT1VSU0UgRk9SIEFTU0lHTk1FTlQgVFlQRSBIT1ZFUiBJTkZPUk1BVElPTiAjI1xuXG5XaXphcmRDb3Vyc2VJbmZvID0gXG5cbiAgIyBSRVNFQVJDSCBBTkQgV1JJVEUgQSBXSUtJUEVESUEgQVJUSUNMRVxuICByZXNlYXJjaHdyaXRlOiBcbiAgICB0aXRsZTogXCJSZXNlYXJjaCBhbmQgd3JpdGUgYSBXaWtpcGVkaWEgYXJ0aWNsZVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiWW91IGd1aWRlIHlvdXIgc3R1ZGVudHMgdG8gc2VsZWN0IGNvdXJzZS1yZWxhdGVkIHRvcGljcyB0aGF0IGFyZSBub3Qgd2VsbC1jb3ZlcmVkIG9uIFdpa2lwZWRpYSwgYW5kIHRoZXkgd29yayBpbmRpdmlkdWFsbHkgb3IgaW4gc21hbGwgdGVhbXMgdG8gZGV2ZWxvcCBjb250ZW50IOKAlCBlaXRoZXIgZXhwYW5kaW5nIGV4aXN0aW5nIGFydGljbGVzIG9yIGNyZWF0aW5nIG5ldyBvbmVzLiBTdHVkZW50cyBhbmFseXplIHRoZSBjdXJyZW50IGdhcHMsIHN0YXJ0IHRoZWlyIHJlc2VhcmNoIHRvIGZpbmQgaGlnaC1xdWFsaXR5IHNlY29uZGFyeSBzb3VyY2VzLCBhbmQgdGhlbiBjb25zaWRlciB0aGUgYmVzdCB3YXkgdG8gb3JnYW5pemUgdGhlIGF2YWlsYWJsZSBpbmZvcm1hdGlvbi4gVGhlbiBpdCdzIHRpbWUgZm9yIHRoZW0gaW4gdHVybiB0bzogcHJvcG9zZSBhbiBvdXRsaW5lOyBkcmFmdCBuZXcgYXJ0aWNsZXMgb3IgbmV3IGNvbnRlbnQgZm9yIGV4aXN0aW5nIG9uZXM7IHByb3ZpZGUgYW5kIHJlc3BvbmQgdG8gcGVlciBmZWVkYmFjazsgYW5kIG1vdmUgdGhlaXIgd29yayBpbnRvIHRoZSBsaXZlIGFydGljbGUgbmFtZXNwYWNlIG9uIFdpa2lwZWRpYS5cIlxuICAgICAgXCJBbG9uZyB0aGUgd2F5LCBzdHVkZW50cyBtYXkgd29yayB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYSBlZGl0b3JzIHdobyBjYW4gb2ZmZXIgY3JpdGljYWwgZmVlZGJhY2sgYW5kIGhlbHAgbWFrZSBzdXJlIGFydGljbGVzIG1lZXQgV2lraXBlZGlhJ3Mgc3RhbmRhcmRzIGFuZCBzdHlsZSBjb252ZW50aW9ucywgYW5kIGl0J3MgaW1wb3J0YW50IHRvIGluY29ycG9yYXRlIHRpbWUgaW50byB0aGUgYXNzaWdubWVudCBmb3IgdGhlIHN0dWRlbnRzIHRvIGludGVncmF0ZSB0aG9zZSBzdWdnZXN0aW9ucy4gU3R1ZGVudHMgd2hvIGRvIGdyZWF0IHdvcmsgbWF5IGhhdmUgdGhlaXIgYXJ0aWNsZXMgaGlnaGxpZ2h0ZWQgb24gV2lraXBlZGlhJ3MgbWFpbiBwYWdlLCBhbmQgaGlnaCBxdWFsaXR5IGFydGljbGVzIHdpbGwgaGVscCBpbmZvcm0gdGhvdXNhbmRzIG9mIGZ1dHVyZSByZWFkZXJzIGFib3V0IHRoZSBzZWxlY3RlZCB0b3BpYy4gXCJcbiAgICAgIFwiT3B0aW9uYWxseSwgeW91IG1heSBhc2sgeW91ciBzdHVkZW50cyB0byB3cml0ZSBhIHJlZmxlY3RpdmUgcGFwZXIgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2UsIHByZXNlbnQgdGhlaXIgY29udHJpYnV0aW9ucyBpbiBjbGFzcywgb3IgZGV2ZWxvcCB0aGVpciBvd24gY29uY2x1c2lvbnMgYW5kIGFyZ3VtZW50cyBpbiBhIHN1cHBsZW1lbnRhcnkgZXNzYXkuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIxMiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWRzIG9yIGdyYWQgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY2xhc3Nlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3Agd3JpdGluZyBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIFNPVVJDRS1DRU5URVJFRCBBRERJVElPTlNcbiAgc291cmNlY2VudGVyZWQ6IFxuICAgIHRpdGxlOiBcIlNvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHJlYWQgV2lraXBlZGlhIGFydGljbGVzIGluIGEgc2VsZi1zZWxlY3RlZCBzdWJqZWN0IGFyZWEgdG8gaWRlbnRpZnkgYXJ0aWNsZXMgaW4gbmVlZCBvZiByZXZpc2lvbiBvciBpbXByb3ZlbWVudCwgc3VjaCBhcyB0aG9zZSB3aXRoIFxcXCJjaXRhdGlvbiBuZWVkZWRcXFwiIHRhZ3MuIFN0dWRlbnRzIHdpbGwgZmluZCByZWxpYWJsZSBzb3VyY2VzIHRvIHVzZSBhcyByZWZlcmVuY2VzIGZvciB1bmNpdGVkIGNvbnRlbnQuIFRoaXMgYXNzaWdubWVudCBpbmNsdWRlcyBhIHBlcnN1YXNpdmUgZXNzYXkgaW4gd2hpY2ggc3R1ZGVudHMgbWFrZSBhIGNhc2UgZm9yIHRoZWlyIHN1Z2dlc3RlZCBjaGFuZ2VzLCB3aHkgdGhleSBiZWxpZXZlIHRoZXkgYXJlIHF1YWxpZmllZCB0byBtYWtlIHRob3NlIGNoYW5nZXMsIGFuZCB3aHkgdGhlaXIgc2VsZWN0ZWQgc291cmNlcyBwcm92aWRlIHN1cHBvcnQuIEFmdGVyIG1ha2luZyB0aGVpciBjb250cmlidXRpb25zLCBzdHVkZW50cyByZWZsZWN0IG9uIHRoZWlyIHdvcmsgd2l0aCBhIGZvcm1hbCBwYXBlciwgYW5kIGRpc2N1c3Mgd2hldGhlciB0aGV5J3ZlIGFjY29tcGxpc2hlZCB0aGVpciBzdGF0ZWQgZ29hbHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYXJnZSBjbGFzc2VzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgRklORCBBTkQgRklYIEVSUk9SU1xuICBmaW5kZml4OiBcbiAgICB0aXRsZTogXCJGaW5kIGFuZCBmaXggZXJyb3JzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gZmluZCBhbiBhcnRpY2xlIGFib3V0IGEgY291cnNlLXJlbGF0ZWQgdG9waWMgd2l0aCB3aGljaCB0aGV5IGFyZSBleHRyZW1lbHkgZmFtaWxpYXIgdGhhdCBoYXMgc29tZSBtaXN0YWtlcy4gU3R1ZGVudHMgdGFrZSB3aGF0IHRoZXkga25vdyBhYm91dCB0aGUgdG9waWMsIGZpbmQgZmFjdHVhbCBlcnJvcnMgYW5kIG90aGVyIHN1YnN0YW50aXZlIG1pc3Rha2VzLCBhbmQgY29ycmVjdCB0aG9zZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIElkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVxuICBwbGFnaWFyaXNtOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHNlYXJjaCB0aHJvdWdoIFdpa2lwZWRpYSBhcnRpY2xlcyB0byBmaW5kIGluc3RhbmNlcyBvZiBjbG9zZSBwYXJhcGhyYXNpbmcgb3IgcGxhZ2lhcmlzbSwgdGhlbiByZXdvcmQgdGhlIGluZm9ybWF0aW9uIGluIHRoZWlyIG93biBsYW5ndWFnZSB0byBiZSBhcHByb3ByaWF0ZSBmb3IgV2lraXBlZGlhLiBJbiB0aGlzIGFzc2lnbm1lbnQsIHN0dWRlbnRzIGdhaW4gYSBkZWVwZXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IHBsYWdpYXJpc20gaXMgYW5kIGhvdyB0byBhdm9pZCBpdC5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjVFJBTlNMQVRFIEFOIEFSVElDTEUgVE8gRU5HTElTSFxuICB0cmFuc2xhdGU6IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiVGhpcyBpcyBhIHByYWN0aWNhbCBhc3NpZ25tZW50IGZvciBsYW5ndWFnZSBpbnN0cnVjdG9ycy4gU3R1ZGVudHMgc2VsZWN0IGEgV2lraXBlZGlhIGFydGljbGUgaW4gdGhlIGxhbmd1YWdlIHRoZXkgYXJlIHN0dWR5aW5nLCBhbmQgdHJhbnNsYXRlIGl0IGludG8gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBTdHVkZW50cyBzaG91bGQgc3RhcnQgd2l0aCBoaWdoLXF1YWxpdHkgYXJ0aWNsZXMgd2hpY2ggYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBUaGlzIGFzc2lnbm1lbnQgcHJvdmlkZXMgcHJhY3RpY2FsIHRyYW5zbGF0aW9uIGFkdmljZSB3aXRoIHRoZSBpbmNlbnRpdmUgb2YgcmVhbCBwdWJsaWMgc2VydmljZSwgYXMgc3R1ZGVudHMgZXhwYW5kIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGN1bHR1cmUgb24gV2lraXBlZGlhLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNisgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhbmd1YWdlIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHRyYW5zbGF0aW5nIDxlbT5mcm9tPC9lbT4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlIHRvIHRoZSBsYW5ndWFnZSB0aGV5J3JlIHN0dWR5aW5nXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjQ09QWSBFRElUSU5HXG4gIGNvcHllZGl0OiBcbiAgICB0aXRsZTogXCJDb3B5ZWRpdFwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGNvcHllZGl0IFdpa2lwZWRpYSBhcnRpY2xlcywgZW5nYWdpbmcgZWRpdG9ycyBpbiBjb252ZXJzYXRpb24gYWJvdXQgdGhlaXIgd3JpdGluZyBhbmQgaW1wcm92aW5nIHRoZSBjbGFyaXR5IG9mIHRoZSBsYW5ndWFnZSBvZiB0aGUgbWF0ZXJpYWwuIFN0dWRlbnRzIGxlYXJuIHRvIHdyaXRlIGluIGRpZmZlcmVudCB2b2ljZXMgZm9yIGRpZmZlcmVudCBhdWRpZW5jZXMuIEluIGxlYXJuaW5nIGFib3V0IHRoZSBzcGVjaWZpYyB2b2ljZSBvbiBXaWtpcGVkaWEsIHRoZXkgbGVhcm4gYWJvdXQgdGhlIOKAnGF1dGhvcml0YXRpdmXigJ0gdm9pY2UgYW5kIGhvdyBpdHMgdG9uZSBjYW4gY29udmluY2UsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgaXMgcXVlc3Rpb25hYmxlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiRW5nbGlzaCBncmFtbWFyIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgc3Ryb25nIHdyaXRpbmcgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjRVZBTFVBVEUgQVJUSUNMRVNcbiAgZXZhbHVhdGU6IFxuICAgIHRpdGxlOiBcIkV2YWx1YXRlIGFydGljbGVzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJGaXJzdCwgc3R1ZGVudHMgd3JpdGUgYSByZXBvcnQgYW5hbHl6aW5nIHRoZSBzdGF0ZSBvZiBXaWtpcGVkaWEgYXJ0aWNsZXMgb24gY291cnNlLXJlbGF0ZWQgdG9waWNzIHdpdGggYW4gZXllIHRvd2FyZCBmdXR1cmUgcmV2aXNpb25zLiBUaGlzIGVuY291cmFnZXMgYSBjcml0aWNhbCByZWFkaW5nIG9mIGJvdGggY29udGVudCBhbmQgZm9ybS4gVGhlbiwgdGhlIHN0dWRlbnRzIGVkaXQgYXJ0aWNsZXMgaW4gc2FuZGJveGVzIHdpdGggZmVlZGJhY2sgZnJvbSB0aGUgcHJvZmVzc29yLCBjYXJlZnVsbHkgc2VsZWN0aW5nIGFuZCBhZGRpbmcgcmVmZXJlbmNlcyB0byBpbXByb3ZlIHRoZSBhcnRpY2xlIGJhc2VkIG9uIHRoZWlyIGNyaXRpY2FsIGVzc2F5cy4gRmluYWxseSwgdGhleSBjb21wb3NlIGEgc2VsZi1hc3Nlc3NtZW50IGV2YWx1YXRpbmcgdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjUgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJDbGFzc2VzIHdpdGggZmV3ZXIgdGhhbiAzMCBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2Ugc3VydmV5IGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgQUREIElNQUdFUyBPUiBNVUxUSU1FRElBXG4gIG11bHRpbWVkaWE6IFxuICAgIHRpdGxlOiBcIiBBZGQgaW1hZ2VzIG9yIG11bHRpbWVkaWFcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIklmIHlvdXIgc3R1ZGVudHMgYXJlIGFkZXB0IGF0IG1lZGlhLCB0aGlzIGNhbiBiZSBhIGdyZWF0IHdheSBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhIGluIGEgbm9uLXRleHR1YWwgd2F5LiBJbiB0aGUgcGFzdCwgc3R1ZGVudHMgaGF2ZSBwaG90b2dyYXBoZWQgbG9jYWwgbW9udW1lbnRzIHRvIGlsbHVzdHJhdGUgYXJ0aWNsZXMsIGRlc2lnbmVkIGluZm9ncmFwaGljcyB0byBpbGx1c3RyYXRlIGNvbmNlcHRzLCBvciBjcmVhdGVkIHZpZGVvcyB0aGF0IGRlbW9uc3RyYXRlZCBhdWRpby12aXN1YWxseSB3aGF0IGFydGljbGVzIGRlc2NyaWJlIGluIHdvcmRzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgc3R1ZHlpbmcgcGhvdG9ncmFwaHksIHZpZGVvZ3JhcGh5LCBvciBncmFwaGljIGRlc2lnblwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBtZWRpYSBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ291cnNlSW5mb1xuIiwiV2l6YXJkU3RlcElucHV0cyA9XG4gIGludHJvOiBcbiAgICB0ZWFjaGVyOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgbmFtZSdcbiAgICAgIGlkOiAndGVhY2hlcidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvdXJzZV9uYW1lOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0NvdXJzZSBuYW1lJ1xuICAgICAgaWQ6ICdjb3Vyc2VfbmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzY2hvb2w6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnVW5pdmVyc2l0eSdcbiAgICAgIGlkOiAnc2Nob29sJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIHN1YmplY3Q6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnU3ViamVjdCdcbiAgICAgIGlkOiAnc3ViamVjdCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdHVkZW50czpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdBcHByb3hpbWF0ZSBudW1iZXIgb2Ygc3R1ZGVudHMnXG4gICAgICBpZDogJ3N0dWRlbnRzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgaW5zdHJ1Y3Rvcl91c2VybmFtZTpcbiAgICAgIGxhYmVsOiAnVXNlcm5hbWUgKHRlbXBvcmFyeSknXG4gICAgICBpZDogJ2luc3RydWN0b3JfdXNlcm5hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIHdpemFyZF9zdGFydF9kYXRlOlxuICAgICAgaXNEYXRlOiB0cnVlXG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBpc0RhdGU6IHRydWVcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIFxuICBtdWx0aW1lZGlhXzE6XG4gICAgbXVsdGltZWRpYV8xXzE6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ211bHRpbWVkaWFfMV8xJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIG11bHRpbWVkaWFfMV8yOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzFfMidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgbXVsdGltZWRpYV8yOlxuICAgIG11bHRpbWVkaWFfMl8xOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzJfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgbXVsdGltZWRpYV8yXzI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ211bHRpbWVkaWFfMl8yJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgY29weWVkaXRfMTpcbiAgICBjb3B5ZWRpdF8xXzE6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzFfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgY29weWVkaXRfMV8yOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8xXzInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDI/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICBjb3B5ZWRpdF8yOlxuICAgIGNvcHllZGl0XzJfMTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY29weWVkaXRfMl8xJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAxPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgICBjb3B5ZWRpdF8yXzI6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzJfMidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICBcblxuICBhc3NpZ25tZW50X3NlbGVjdGlvbjogXG4gICAgcmVzZWFyY2h3cml0ZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgd3JpdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogdHJ1ZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBtdWx0aW1lZGlhOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0FkZCBpbWFnZXMgJiBtdWx0aW1lZGlhJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG5cbiAgICBjb3B5ZWRpdDogXG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHllZGl0J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG5cbiAgICBzb21ldGhpbmdfZWxzZTpcbiAgICAgIHR5cGU6ICdsaW5rJ1xuICAgICAgaHJlZjogJ21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJ1xuICAgICAgaWQ6ICdzb21ldGhpbmdfZWxzZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBIGRpZmZlcmVudCBhc3NpZ25tZW50PyBHZXQgaW4gdG91Y2ggaGVyZS4nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiBmYWxzZVxuICAgICAgdGlwSW5mbzpcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFwiSGF2ZSBhbm90aGVyIGlkZWEgZm9yIGluY29ycG9yYXRpbmcgV2lraXBlZGlhIGludG8geW91ciBjbGFzcz8gV2UndmUgZm91bmQgdGhhdCB0aGVzZSBhc3NpZ25tZW50cyB3b3JrIHdlbGwsIGJ1dCB0aGV5IGFyZW4ndCB0aGUgb25seSB3YXkgdG8gZG8gaXQuIEdldCBpbiB0b3VjaCwgYW5kIHdlIGNhbiB0YWxrIHRoaW5ncyB0aHJvdWdoOiA8YSBzdHlsZT0nY29sb3I6IzUwNWE3ZjsnIGhyZWY9J21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJz5jb250YWN0QHdpa2llZHUub3JnPC9hPi5cIlxuXG4gIGxlYXJuaW5nX2Vzc2VudGlhbHM6IFxuICAgIGNyZWF0ZV91c2VyOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NyZWF0ZV91c2VyJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JlYXRlIHVzZXIgYWNjb3VudCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIGVucm9sbDpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdlbnJvbGwnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdFbnJvbGwgdG8gdGhlIGNvdXJzZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdDb21wbGV0ZSBvbmxpbmUgdHJhaW5pbmcnXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGludHJvZHVjZV9hbWJhc3NhZG9yczpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbnRyb2R1Y2VfYW1iYXNzYWRvcnMnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnSW50cm9kdWNlIFdpa2lwZWRpYSBBbWJhc3NhZG9ycyBJbnZvbHZlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgIyBpbmNsdWRlX2NvbXBsZXRpb246XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdpbmNsdWRlX2NvbXBsZXRpb24nXG4gICAgIyAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICMgICBsYWJlbDogJ0luY2x1ZGUgQ29tcGxldGlvbiBvZiB0aGlzIEFzc2lnbm1lbnQgYXMgUGFydCBvZiB0aGUgU3R1ZGVudHNcXCdzIEdyYWRlJ1xuICAgICMgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICB0cmFpbmluZ19ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHRyYWluaW5nX25vdF9ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX25vdF9ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIG5vdCBiZSBncmFkZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgZ2V0dGluZ19zdGFydGVkOiBcbiAgICBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JpdGlxdWUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGFkZF90b19hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdhZGRfdG9fYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0FkZCB0byBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gICAgY29weV9lZGl0X2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHlfZWRpdF9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIGlsbHVzdHJhdGVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gIFxuXG4gIGNob29zaW5nX2FydGljbGVzOiBcbiAgICBwcmVwYXJlX2xpc3Q6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3ByZXBhcmVfbGlzdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIFxuICAgIHN0dWRlbnRzX2V4cGxvcmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3N0dWRlbnRzX2V4cGxvcmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHJlcXVlc3RfaGVscDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVxdWVzdF9oZWxwJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIG9yIGV2YXVsYXRpbmcgYXJ0aWNsZSBjaG9pY2VzPydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBpZ25vcmVWYWxpZGF0aW9uOiB0cnVlXG4gICAgICBjb25kaXRpb25hbF9sYWJlbDogXG4gICAgICAgIHByZXBhcmVfbGlzdDogXCJXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBhcnRpY2xlcz9cIlxuICAgICAgICBzdHVkZW50c19leHBsb3JlOiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgZXZhbHVhdGluZyBzdHVkZW50IGNob2ljZXM/XCJcbiAgICAgIFxuXG5cbiAgcmVzZWFyY2hfcGxhbm5pbmc6IFxuICAgIGNyZWF0ZV9vdXRsaW5lOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjcmVhdGVfb3V0bGluZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUcmFkaXRpb25hbCBvdXRsaW5lJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogXCJUcmFkaXRpb25hbCBvdXRsaW5lXCJcbiAgICAgICAgY29udGVudDogXCJGb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGFuIG91dGxpbmUgdGhhdCByZWZsZWN0cyB0aGUgaW1wcm92ZW1lbnRzIHRoZXkgcGxhbiB0byBtYWtlLCBhbmQgdGhlbiBwb3N0IGl0IHRvIHRoZSBhcnRpY2xlJ3MgdGFsayBwYWdlLiBUaGlzIGlzIGEgcmVsYXRpdmVseSBlYXN5IHdheSB0byBnZXQgc3RhcnRlZC5cIlxuICAgIFxuICAgIHdyaXRlX2xlYWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3dyaXRlX2xlYWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBsZWFkIHNlY3Rpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiV2lraXBlZGlhIGxlYWQgc2VjdGlvblwiXG4gICAgICAgIGNvbnRlbnQ6XG4gICAgICAgICAgXCI8cD5Gb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGEgd2VsbC1iYWxhbmNlZCBzdW1tYXJ5IG9mIGl0cyBmdXR1cmUgc3RhdGUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uLiBUaGUgaWRlYWwgbGVhZCBzZWN0aW9uIGV4ZW1wbGlmaWVzIFdpa2lwZWRpYSdzIHN1bW1hcnkgc3R5bGUgb2Ygd3JpdGluZzogaXQgYmVnaW5zIHdpdGggYSBzaW5nbGUgc2VudGVuY2UgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcGxhY2VzIGl0IGluIGNvbnRleHQsIGFuZCB0aGVuIOKAlCBpbiBvbmUgdG8gZm91ciBwYXJhZ3JhcGhzLCBkZXBlbmRpbmcgb24gdGhlIGFydGljbGUncyBzaXplIOKAlCBpdCBvZmZlcnMgYSBjb25jaXNlIHN1bW1hcnkgb2YgdG9waWMuIEEgZ29vZCBsZWFkIHNlY3Rpb24gc2hvdWxkIHJlZmxlY3QgdGhlIG1haW4gdG9waWNzIGFuZCBiYWxhbmNlIG9mIGNvdmVyYWdlIG92ZXIgdGhlIHdob2xlIGFydGljbGUuPC9wPlxuICAgICAgICAgIDxwPk91dGxpbmluZyBhbiBhcnRpY2xlIHRoaXMgd2F5IGlzIGEgbW9yZSBjaGFsbGVuZ2luZyBhc3NpZ25tZW50IOKAlCBhbmQgd2lsbCByZXF1aXJlIG1vcmUgd29yayB0byBldmFsdWF0ZSBhbmQgcHJvdmlkZSBmZWVkYmFjayBmb3IuIEhvd2V2ZXIsIGl0IGNhbiBiZSBtb3JlIGVmZmVjdGl2ZSBmb3IgdGVhY2hpbmcgdGhlIHByb2Nlc3Mgb2YgcmVzZWFyY2gsIHdyaXRpbmcsIGFuZCByZXZpc2lvbi4gU3R1ZGVudHMgd2lsbCByZXR1cm4gdG8gdGhpcyBsZWFkIHNlY3Rpb24gYXMgdGhleSBnbywgdG8gZ3VpZGUgdGhlaXIgd3JpdGluZyBhbmQgdG8gcmV2aXNlIGl0IHRvIHJlZmxlY3QgdGhlaXIgaW1wcm92ZWQgdW5kZXJzdGFuZGluZyBvZiB0aGUgdG9waWMgYXMgdGhlaXIgcmVzZWFyY2ggcHJvZ3Jlc3Nlcy4gVGhleSB3aWxsIHRhY2tsZSBXaWtpcGVkaWEncyBlbmN5Y2xvcGVkaWMgc3R5bGUgZWFybHkgb24sIGFuZCB0aGVpciBvdXRsaW5lIGVmZm9ydHMgd2lsbCBiZSBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZWlyIGZpbmFsIHdvcmsuPC9wPlwiXG4gICAgICAgIFxuXG5cbiAgZHJhZnRzX21haW5zcGFjZTogXG4gICAgd29ya19saXZlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBsaXZlIGZyb20gdGhlIHN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgXG4gICAgc2FuZGJveDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnc2FuZGJveCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEcmFmdCBlYXJseSB3b3JrIGluIHNhbmRib3hlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgIFxuXG4gIHBlZXJfZmVlZGJhY2s6IFxuICAgIHBlZXJfcmV2aWV3czpcbiAgICAgIHR5cGU6ICdyYWRpb0dyb3VwJ1xuICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICBsYWJlbDogJydcbiAgICAgIHZhbHVlOiAndHdvJ1xuICAgICAgc2VsZWN0ZWQ6IDFcbiAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUd28gcGVlciByZXZpZXcnXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMFxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcxJ1xuICAgICAgICAgIHZhbHVlOiAnb25lJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdPbmUgcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAxXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzInXG4gICAgICAgICAgdmFsdWU6ICd0d28nXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnVHdvIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMlxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICczJ1xuICAgICAgICAgIHZhbHVlOiAndGhyZWUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ1RocmVlIHBlZXIgcmV2aWV3J1xuXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAzXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzQnXG4gICAgICAgICAgdmFsdWU6ICdmb3VyJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdGb3VyIHBlZXIgcmV2aWV3J1xuXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiA0XG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzUnXG4gICAgICAgICAgdmFsdWU6ICdmaXZlJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdGaXZlIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgXG4gIFxuXG4gIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6IFxuICAgIGNsYXNzX2Jsb2c6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX2Jsb2cnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDbGFzcyBibG9nIG9yIGRpc2N1c3Npb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdDbGFzcyBibG9nIG9yIGNsYXNzIGRpc2N1c3Npb24nXG4gICAgICAgIGNvbnRlbnQ6ICdTdHVkZW50cyBrZWVwIGEgcnVubmluZyBibG9nIGFib3V0IHRoZWlyIGV4cGVyaWVuY2VzLiBHaXZpbmcgdGhlbSBwcm9tcHRzIGV2ZXJ5IHdlZWsgb3IgdHdvLCBzdWNoIGFzIOKAnFRvIHdoYXQgZXh0ZW50IGFyZSB0aGUgZWRpdG9ycyBvbiBXaWtpcGVkaWEgYSBzZWxmLXNlbGVjdGluZyBncm91cCBhbmQgd2h5P+KAnSB3aWxsIGhlbHAgdGhlbSB0aGluayBhYm91dCB0aGUgbGFyZ2VyIGlzc3VlcyBzdXJyb3VuZGluZyB0aGlzIG9ubGluZSBlbmN5Y2xvcGVkaWEgY29tbXVuaXR5LiBJdCB3aWxsIGFsc28gZ2l2ZSB5b3UgbWF0ZXJpYWwgYm90aCBvbiB0aGUgd2lraSBhbmQgb2ZmIHRoZSB3aWtpIHRvIGdyYWRlLiBJZiB5b3UgaGF2ZSB0aW1lIGluIGNsYXNzLCB0aGVzZSBkaXNjdXNzaW9ucyBjYW4gYmUgcGFydGljdWxhcmx5IGNvbnN0cnVjdGl2ZSBpbiBwZXJzb24uJ1xuICAgICAgXG4gICAgY2xhc3NfcHJlc2VudGF0aW9uOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbi1jbGFzcyBwcmVzZW50YXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ0luLWNsYXNzIHByZXNlbnRhdGlvbiBvZiBXaWtpcGVkaWEgd29yaydcbiAgICAgICAgY29udGVudDogXCJFYWNoIHN0dWRlbnQgb3IgZ3JvdXAgcHJlcGFyZXMgYSBzaG9ydCBwcmVzZW50YXRpb24gZm9yIHRoZSBjbGFzcywgZXhwbGFpbmluZyB3aGF0IHRoZXkgd29ya2VkIG9uLCB3aGF0IHdlbnQgd2VsbCBhbmQgd2hhdCBkaWRuJ3QsIGFuZCB3aGF0IHRoZXkgbGVhcm5lZC4gVGhlc2UgcHJlc2VudGF0aW9ucyBjYW4gbWFrZSBleGNlbGxlbnQgZm9kZGVyIGZvciBjbGFzcyBkaXNjdXNzaW9ucyB0byByZWluZm9yY2UgeW91ciBjb3Vyc2UncyBsZWFybmluZyBnb2Fscy5cIlxuICAgICAgXG4gICAgcmVmbGVjdGl2ZV9lc3NheTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgY29udGVudDogXCJBc2sgc3R1ZGVudHMgdG8gd3JpdGUgYSBzaG9ydCByZWZsZWN0aXZlIGVzc2F5IG9uIHRoZWlyIGV4cGVyaWVuY2VzIHVzaW5nIFdpa2lwZWRpYS4gVGhpcyB3b3JrcyB3ZWxsIGZvciBib3RoIHNob3J0IGFuZCBsb25nIFdpa2lwZWRpYSBwcm9qZWN0cy4gQW4gaW50ZXJlc3RpbmcgaXRlcmF0aW9uIG9mIHRoaXMgaXMgdG8gaGF2ZSBzdHVkZW50cyB3cml0ZSBhIHNob3J0IHZlcnNpb24gb2YgdGhlIGVzc2F5IGJlZm9yZSB0aGV5IGJlZ2luIGVkaXRpbmcgV2lraXBlZGlhLCBvdXRsaW5pbmcgdGhlaXIgZXhwZWN0YXRpb25zLCBhbmQgdGhlbiBoYXZlIHRoZW0gcmVmbGVjdCBvbiB3aGV0aGVyIG9yIG5vdCB0aGV5IG1ldCB0aG9zZSBleHBlY3RhdGlvbnMgZHVyaW5nIHRoZSBhc3NpZ25tZW50LlwiXG4gICAgICBcbiAgICBwb3J0Zm9saW86XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3BvcnRmb2xpbydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgICAgY29udGVudDogXCJTdHVkZW50cyBvcmdhbml6ZSB0aGVpciBXaWtpcGVkaWEgd29yayBpbnRvIGEgcG9ydGZvbGlvLCBpbmNsdWRpbmcgYSBuYXJyYXRpdmUgb2YgdGhlIGNvbnRyaWJ1dGlvbnMgdGhleSBtYWRlIOKAlCBhbmQgaG93IHRoZXkgd2VyZSByZWNlaXZlZCwgYW5kIHBvc3NpYmx5IGNoYW5nZWQsIGJ5IG90aGVyIFdpa2lwZWRpYW5zIOKAlCBhbmQgbGlua3MgdG8gdGhlaXIga2V5IGVkaXRzLiBDb21wb3NpbmcgdGhpcyBwb3J0Zm9saW8gd2lsbCBoZWxwIHN0dWRlbnRzIHRoaW5rIG1vcmUgZGVlcGx5IGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlcywgYW5kIGFsc28gcHJvdmlkZXMgYSBsZW5zIHRocm91Z2ggd2hpY2ggdG8gdW5kZXJzdGFuZCDigJQgYW5kIGdyYWRlIOKAlCB0aGVpciB3b3JrLlwiXG4gICAgXG4gICAgb3JpZ2luYWxfcGFwZXI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdPcmlnaW5hbCBhbmFseXRpY2FsIHBhcGVyJ1xuICAgICAgICBjb250ZW50OiBcIkluIGNvdXJzZXMgdGhhdCBlbXBoYXNpemUgdHJhZGl0aW9uYWwgcmVzZWFyY2ggc2tpbGxzIGFuZCB0aGUgZGV2ZWxvcG1lbnQgb2Ygb3JpZ2luYWwgaWRlYXMgdGhyb3VnaCBhIHRlcm0gcGFwZXIsIFdpa2lwZWRpYSdzIHBvbGljeSBvZiBcXFwibm8gb3JpZ2luYWwgcmVzZWFyY2hcXFwiIG1heSBiZSB0b28gcmVzdHJpY3RpdmUuIE1hbnkgaW5zdHJ1Y3RvcnMgcGFpciBXaWtpcGVkaWEgd3JpdGluZyB3aXRoIGEgY29tcGxlbWVudGFyeSBhbmFseXRpY2FsIHBhcGVyOyBzdHVkZW50c+KAmSBXaWtpcGVkaWEgYXJ0aWNsZXMgc2VydmUgYXMgYSBsaXRlcmF0dXJlIHJldmlldywgYW5kIHRoZSBzdHVkZW50cyBnbyBvbiB0byBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGluIHRoZSBvZmZsaW5lIGFuYWx5dGljYWwgcGFwZXIuXCJcbiAgICBcbiAgZHlrOlxuICAgIGR5azpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZHlrJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRGlkIFlvdSBLbm93PydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICBnYTogXG4gICAgZ2E6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2dhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnR29vZCBBcnRpY2xlIG5vbWluYXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgXG5cbiAgIyBncmFkaW5nX211bHRpbWVkaWE6IFxuICAjICAgY29tcGxldGVfbXVsdGltZWRpYTpcbiAgIyAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICMgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICMgICAgIGlkOiAnY29tcGxldGVfbXVsdGltZWRpYSdcbiAgIyAgICAgdmFsdWU6IDUwXG4gICMgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICMgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuICBcbiAgIyBncmFkaW5nX2NvcHllZGl0OiBcbiAgIyAgIGNvbXBsZXRlX2NvcHllZGl0OlxuICAjICAgICB0eXBlOiAncGVyY2VudCdcbiAgIyAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgIyAgICAgaWQ6ICdvbXBsZXRlX2NvcHllZGl0J1xuICAjICAgICB2YWx1ZTogNTBcbiAgIyAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgIyAgICAgY29udGluZ2VudFVwb246IFtdXG5cblxuICBncmFkaW5nOiBcbiAgICByZXNlYXJjaHdyaXRlOlxuICAgICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgV2lraXBlZGlhIHRyYWluaW5nJ1xuICAgICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgICB2YWx1ZTogNVxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICAgICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICAgIF1cblxuICAgICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdFYXJseSBXaWtpcGVkaWEgZXhlcmNpc2VzJ1xuICAgICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgICAgdmFsdWU6IDE1ICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBvdXRsaW5lX3F1YWxpdHk6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBpZDogJ291dGxpbmVfcXVhbGl0eSdcbiAgICAgICAgbGFiZWw6ICdRdWFsaXR5IG9mIGJpYmxpb2dyYXBoeSBhbmQgb3V0bGluZSdcbiAgICAgICAgdmFsdWU6IDEwICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBwZWVyX3Jldmlld3M6XG4gICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdQZWVyIHJldmlld3MgYW5kIGNvbGxhYm9yYXRpb24gd2l0aCBjbGFzc21hdGVzJ1xuICAgICAgICB2YWx1ZTogMTAgICBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAgIGNvbnRyaWJ1dGlvbl9xdWFsaXR5OlxuICAgICAgICB0eXBlOiAncGVyY2VudCcgXG4gICAgICAgIGlkOiAnY29udHJpYnV0aW9uX3F1YWxpdHknXG4gICAgICAgIGxhYmVsOiAnUXVhbGl0eSBvZiB5b3VyIG1haW4gV2lraXBlZGlhIGNvbnRyaWJ1dGlvbnMnXG4gICAgICAgIHZhbHVlOiA1MFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnIFxuICAgICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgdmFsdWU6IDEwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgICAgJ2NsYXNzX2Jsb2cnXG4gICAgICAgICAgJ2NsYXNzX3ByZXNlbnRhdGlvbidcbiAgICAgICAgICAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgICAgICAncG9ydGZvbGlvJ1xuICAgICAgICAgICdvcmlnaW5hbF9wYXBlcidcbiAgICAgICAgXVxuXG4gICAgY29weWVkaXQ6XG4gICAgICBjb3B5ZWRpdDpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnQ29weWVkaXQgYXJ0aWNsZXMnXG4gICAgICAgIGlkOiAnY29weWVkaXQnXG4gICAgICAgIHZhbHVlOiAxMDBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAnY29weWVkaXQnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgIF1cbiAgICBtdWx0aW1lZGlhOlxuICAgICAgbXVsdGltZWRpYTpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgICAgdmFsdWU6IDEwMFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICBdXG5cblxuXG5cbiAgICBncmFkaW5nX3NlbGVjdGlvbjpcbiAgICAgIGxhYmVsOiAnR3JhZGluZyBiYXNlZCBvbjonXG4gICAgICBpZDogJ2dyYWRpbmdfc2VsZWN0aW9uJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZW5kZXJJbk91dHB1dDogZmFsc2VcbiAgICAgIG9wdGlvbnM6IFxuICAgICAgICBwZXJjZW50OiBcbiAgICAgICAgICBsYWJlbDogJ1BlcmNlbnRhZ2UnXG4gICAgICAgICAgdmFsdWU6ICdwZXJjZW50J1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIHBvaW50czpcbiAgICAgICAgICBsYWJlbDogJ1BvaW50cydcbiAgICAgICAgICB2YWx1ZTogJ3BvaW50cydcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcblxuXG4gIG92ZXJ2aWV3OiBcbiAgICBsZWFybmluZ19lc3NlbnRpYWxzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgZXNzZW50aWFscydcbiAgICAgIGlkOiAnbGVhcm5pbmdfZXNzZW50aWFscydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIGNob29zaW5nX2FydGljbGVzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICByZXNlYXJjaF9wbGFubmluZzpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuXG4gICAgd2l6YXJkX3N0YXJ0X2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgY291cnNlX2RldGFpbHM6XG4gICAgZGVzY3JpcHRpb246ICcnXG4gICAgdGVybV9zdGFydF9kYXRlOiAnJ1xuICAgIHRlcm1fZW5kX2RhdGU6ICcnXG4gICAgc3RhcnRfZGF0ZTogJydcbiAgICBzdGFydF93ZWVrb2ZfZGF0ZTogJydcbiAgICBlbmRfd2Vla29mX2RhdGU6ICcnXG4gICAgZW5kX2RhdGU6ICcnXG4gICAgd2Vla2RheXNfc2VsZWN0ZWQ6IFtmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV1cbiAgICBsZW5ndGhfaW5fd2Vla3M6IDE2XG4gICAgYXNzaWdubWVudHM6IFtdXG5cblxuXG4gICAgXG5cblxuXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRTdGVwSW5wdXRzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFZpZXdIZWxwZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCAnbGluaycsICggdGV4dCwgdXJsICkgLT5cblxuICB0ZXh0ID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB0ZXh0IClcbiAgdXJsICA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdXJsIClcblxuICByZXN1bHQgPSAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCI+JyArIHRleHQgKyAnPC9hPidcblxuICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyggcmVzdWx0IClcbilcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2NvdXJzZURldGFpbHMnLCAnc3VwMicpIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSAtIEFwcGxpY2F0aW9uIEluaXRpdGlhbGl6ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCcuL2FwcCcpXG5cblxuJCAtPlxuXG4gIG1vbWVudC5sb2NhbGUoJ2VuJywgeyB3ZWVrIDogeyBkb3cgOiAxLCBkb3k6IDQgfSB9KVxuXG4gICMgSW5pdGlhbGl6ZSBBcHBsaWNhdGlvblxuICBhcHBsaWNhdGlvbi5pbml0aWFsaXplKClcblxuICAjIFN0YXJ0IEJhY2tib25lIHJvdXRlclxuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KClcblxuXG4gICIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvc3VwZXJzL01vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTW9kZWwgZXh0ZW5kcyBNb2RlbFxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgRVZFTlQgSEFORExFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIC0gUm91dGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUm91dGVzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBcbiAgcm91dGVzOlxuICAgICcnIDogJ2hvbWUnXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBIYW5kbGVyc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaG9tZTogLT5cbiAgICBpZiAkKCcjYXBwJykubGVuZ3RoID4gMFxuXG4gICAgICBAY3VycmVudFdpa2lVc2VyID0gJCggJyNhcHAnICkuYXR0cignZGF0YS13aWtpdXNlcicpXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2ludHJvJ11bJ2luc3RydWN0b3JfdXNlcm5hbWUnXVsndmFsdWUnXSA9IEBjdXJyZW50V2lraVVzZXJcblxuICAgICAgJCggJyNhcHAnICkuaHRtbChhcHBsaWNhdGlvbi5ob21lVmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcCcpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcCcpKVxuXG4gICAgICBlbHNlIGlmIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXBpZCcpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvSWQnLCBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwaWQnKSlcblxuXG4gICAgZWxzZSBpZiAkKCcjbG9naW4nKS5sZW5ndGggPiAwXG5cbiAgICAgICgkICcjbG9naW4nKS5odG1sKGFwcGxpY2F0aW9uLmxvZ2luVmlldy5yZW5kZXIoKS5lbClcblxuICAjXG4gICMgVXRpbGl0aWVzXG4gICNcblxuICBnZXRQYXJhbWV0ZXJCeU5hbWU6IChuYW1lKSAtPlxuXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKVxuXG4gICAgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKVxuXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKVxuXG4gICAgKGlmIG5vdCByZXN1bHRzPyB0aGVuIFwiXCIgZWxzZSBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKSlcblxuXG4iLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBIb21lIFBhZ2UgVGVtcGxhdGVcXG4tLT5cXG5cXG48IS0tIE1BSU4gQVBQIENPTlRFTlQgLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuY29udGVudCAtLT5cXG5cXG5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sb2dpbl9pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxvZ2luX2luc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAgc3RlcC0tZmlyc3Qgc3RlcC0tbG9naW5cXFwiPlxcbiAgICBcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgICAgICAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgICAgICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmxvZ2luX2luc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG5cXG4gICAgICAgIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImxvZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIvYXV0aC9tZWRpYXdpa2lcXFwiPlxcbiAgICAgICAgICAgIExvZ2luIHdpdGggV2lraXBlZGlhXFxuICAgICAgICAgIDwvYT5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxkaXYgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwiZG90IHN0ZXAtbmF2LWluZGljYXRvcnNfX2l0ZW0gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0FjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmhhc1Zpc2l0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGRhdGEtbmF2LWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBJZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcElkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+KjwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJ2aXNpdGVkXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbmFjdGl2ZVwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vLWFycm93IFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IFN0ZXAgTmF2aWdhdGlvbiBcXG4tLT5cXG5cXG5cXG48IS0tIFNURVAgTkFWIERPVCBJTkRJQ0FUT1JTIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWluZGljYXRvcnMgaGlkZGVuXFxcIj5cXG5cXG4gIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zdGVwcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1pbmRpY2F0b3JzIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBOQVYgQlVUVE9OUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnMtLW5vcm1hbFxcXCI+XFxuICAgIDxhIGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLXByZXYgcHJldiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnByZXZJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLXJpZ2h0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLWxlZnRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnByZXZUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAucHJldlRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgPC9hPlxcblxcbiAgICA8YSBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IG5leHQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5uZXh0SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0xhc3RTdGVwLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uZXh0VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm5leHRUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLWxlZnQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tcmlnaHRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPC9hPlxcbiAgPC9kaXY+XFxuXFxuXFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zLS1lZGl0XFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXZfX2J1dHRvbi0tZXhpdC1lZGl0IGNvbmZpcm0gZXhpdC1lZGl0XFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmJhY2tUb092ZXJ2aWV3VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmJhY2tUb092ZXJ2aWV3VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtYnV0dG9ucyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZSBmb3IgdGhlIElOVFJPIEZPUk0gU0NSRUVOXFxuLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFxcbiAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgXFxuICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zZWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9kaXY+XFxuICAgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuICA8IS0tIElOVFJPIFNURVAgRk9STSBBUkVBIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj5cXG4gICAgPCEtLSBmb3JtIGZpZWxkcyAtLT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taW5uZXIgLS0+XFxuXFxuXFxuICA8IS0tIERBVEVTIE1PRFVMRSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1kYXRlc1xcXCI+XFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWRhdGVzIC0tPlxcblxcbiAgPGRpdiBjbGFzcz0nZm9ybS1jb250YWluZXIgY3VzdG9tLWlucHV0Jz5cXG5cXG4gICAgPGZvcm0gaWQ9J2NvdXJzZUxlbmd0aCcgb25zdWJtaXQ9J3JldHVybiBmYWxzZSc+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1TdGFydERhdGUnPkNvdXJzZSBiZWdpbnM8L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IGlkPSd0ZXJtU3RhcnREYXRlJyBuYW1lPSd0ZXJtU3RhcnREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0ndGVybUVuZERhdGUnPkNvdXJzZSBlbmRzPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0ndGVybUVuZERhdGUnIG5hbWU9J3Rlcm1FbmREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlU3RhcnREYXRlJz5Bc3NpZ25tZW50IHN0YXJ0czwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgaWQ9J2NvdXJzZVN0YXJ0RGF0ZScgbmFtZT0nY291cnNlU3RhcnREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlRW5kRGF0ZSc+QXNzaWdubWVudCBlbmRzPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0nY291cnNlRW5kRGF0ZScgbmFtZT0nY291cnNlRW5kRGF0ZScgdHlwZT0nZGF0ZSc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT1cXFwiZGlzcGxheTpub25lO1xcXCI+XFxuICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VMZW5ndGgnIHN0eWxlPVxcXCJ2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7XFxcIj5Db3Vyc2UgTGVuZ3RoPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBkZWZhdWx0VmFsdWU9JzE2JyBpZD0nY0xlbmd0aCcgbWF4PScxNicgbWluPSc2JyBuYW1lPSdjb3Vyc2VMZW5ndGgnIHN0ZXA9JzEnIHR5cGU9J3JhbmdlJyB2YWx1ZT0nMTYnIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmU7XFxcIj5cXG4gICAgICAgIDxvdXRwdXQgbmFtZT0nb3V0Mic+PC9vdXRwdXQ+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWw+Q2xhc3MgbWVldHMgb246IDwvbGFiZWw+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJvdmVydmlldy1zZWxlY3Qtd3JhcHBlciBvdmVydmlldy1zZWxlY3Qtd3JhcHBlci0tZG93XFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J21vbmRheScgbmFtZT0nTW9uZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzAnPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J21vbmRheSc+TW9uZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndHVlc2RheScgbmFtZT0nVHVlc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScxJz5cXG4gICAgICAgICAgICA8bGFiZWwgZm9yPSd0dWVzZGF5Jz5UdWVzZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nd2VkbmVzZGF5JyBuYW1lPSdXZWRuZXNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMic+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nd2VkbmVzZGF5Jz5XZWRuZXNkYXlzPC9sYWJlbD5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd0aHVyc2RheScgbmFtZT0nVGh1cnNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMyc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGh1cnNkYXknPlRodXJzZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nZnJpZGF5JyBuYW1lPSdGcmlkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNCc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nZnJpZGF5Jz5GcmlkYXlzPC9sYWJlbD5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdzYXR1cmRheScgbmFtZT0nU2F0dXJkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNSc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nc2F0dXJkYXknPlNhdHVyZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nc3VuZGF5JyBuYW1lPSdTdW5kYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNic+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3VuZGF5Jz5TdW5kYXlzPC9sYWJlbD5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXIgb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyLS1ibGFja291dC1kYXRlcyc+XFxuICAgICAgICBcXG4gICAgICAgIDxpbnB1dCBpZD0nYmxhY2tvdXREYXRlc0ZpZWxkJyBuYW1lPSdibGFja291dERhdGVzRmllbGQnIHR5cGU9J2hpZGRlbic+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJibGFja291dERhdGVzLXdyYXBwZXJcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJibGFja291dERhdGVzLWlubmVyXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJibGFja291dERhdGVzLWxhYmVsXFxcIj5TZWxlY3QgZGF5cyB3aGVyZSBjbGFzcyBkb2VzIG5vdCBtZWV0IChpZiBhbnkpOjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgaWQ9XFxcImJsYWNrb3V0RGF0ZXNcXFwiIGNsYXNzPVxcXCJibGFja291dERhdGVzXFxcIj48L2Rpdj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Zvcm0+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm91dHB1dC1jb250YWluZXJcXFwiPjwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicHJldmlldy1jb250YWluZXJcXFwiPjwvZGl2PlxcblxcbiAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcIm5vLWVkaXQtbW9kZVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWUgaW5hY3RpdmVcXFwiIGlkPVxcXCJiZWdpbkJ1dHRvblxcXCIgaHJlZj1cXFwiXFxcIj5cXG4gICAgICAgIFN0YXJ0IGRlc2lnbmluZyBteSBhc3NpZ25tZW50XFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZWRpdC1tb2RlLW9ubHlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGV4aXQtZWRpdFxcXCIgaHJlZj1cXFwiI1xcXCI+XFxuICAgICAgICBCYWNrXFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFyayBzdGVwLWluZm9fX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5mb1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbmZvVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cCBjbGFzcz1cXFwibGFyZ2Ugc3RlcC1pbmZvX19pbnRyb1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gSEVBREVSIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIENPTlRFTlQgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9fY29udGVudCAtLT5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBzdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXJcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlciAtLT5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYWluIEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIEZPUk0gOiBMZWZ0IFNpZGUgb2YgU3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWxheW91dFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1sYXlvdXRfX2lubmVyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgICBcXG4gICAgICA8IS0tIFNURVAgRk9STSBJTk5FUiBDT05URU5UIC0tPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLWlubmVyXFxcIj5cXG4gICAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICAgIDxhIGNsYXNzPVxcXCJtYWluLWxvZ29cXFwiIGhyZWY9XFxcImh0dHA6Ly93aWtpZWR1Lm9yZ1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIHRpdGxlPVxcXCJ3aWtpZWR1Lm9yZ1xcXCI+V0lLSUVEVS5PUkc8L2E+XFxuXFxuICAgIDwhLS0gU1RFUCBJTkZPIElOTkVSIC0tPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8td3JhcHBlclxcXCI+XFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbmZvVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFxcbiAgICAgIDwhLS0gSU5GTyBTRUNUSU9OUyAtLT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG4gICAgXFxuXFxuXFxuICAgIFxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxwPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9wPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGkgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLWdyaWRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRleHQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRleHQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIDogPHNwYW4gY2xhc3M9XFxcInN0YXJzIHN0YXJzLS1cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8gc3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrIFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkFzc2lnbm1lbnQgdHlwZTogXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGV4dFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZGVzY3JpcHRpb24sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk1pbmltdW0gdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm1pbl90aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubWluX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5SZWNvbW1lbmRlZCB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucmVjX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5yZWNfdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QmVzdCBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5iZXN0X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Ob3QgYXBwcm9wcmlhdGUgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubm90X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5MZWFybmluZyBPYmplY3RpdmVzPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubGVhcm5pbmdfb2JqZWN0aXZlcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5jb250ZW50KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5jb250ZW50OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICBcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kaXNhYmxlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJjaGVjay1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm90LWVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGRhdGEtZXhjbHVzaXZlPVxcXCJ0cnVlXFxcIiBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS10ZXh0X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXBlcmNlbnRcXFwiIGRhdGEtcGF0aHdheS1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBhdGh3YXlJZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tcGVyY2VudF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1jb250YWluZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpY29uIGljb24tLXBlcmNlbnRcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpY29uIGljb24tLXBvaW50c1xcXCI+cG9pbnRzPC9kaXY+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG1heGxlbmd0aD1cXFwiM1xcXCIgLz5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdCBjdXN0b20taW5wdXQtYWNjb3JkaWFuXFxcIj5cXG4gIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+W2VkaXRdPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19pbm5lciBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19oZWFkZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICBcXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2NvbnRlbnRcXFwiPlxcbiAgICA8dWw+XFxuICAgICAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmFzc2lnbm1lbnRzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTcsIHByb2dyYW0xNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC91bD5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8bGk+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKSlcbiAgICArIFwiPC9saT5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWxpbmtcXFwiPlxcbiAgPGxhYmVsPjxhIGhyZWY9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5ocmVmKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiID5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvYT48L2xhYmVsPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvXFxcIj5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyIGN1c3RvbS1pbnB1dC1yYWRpby1pbm5lci0tZ3JvdXBcXFwiPlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI1LCBwcm9ncmFtMjUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uYW1lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVyY2VudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIlxuICAgICsgXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5saW5rKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE5LCBwcm9ncmFtMTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW8pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjEsIHByb2dyYW0yMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0dyb3VwKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFya3VwIGZvciBTdGFydC9FbmQgRGF0ZSBJbnB1dCBNb2R1bGVcXG4tLT5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXMgYXV0by1oZWlnaHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19sYWJlbFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGxpPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCkpXG4gICAgKyBcIjwvbGk+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC13cmFwcGVyIGhhcy1jb250ZW50IGVkaXRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdCBjdXN0b20taW5wdXQtYWNjb3JkaWFuXFxcIj5cXG4gICAgPGEgY2xhc3M9XFxcImVkaXQtYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwSWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBJZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPltlZGl0XTwvYT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19pbm5lciBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19oZWFkZXJcXFwiPlxcbiAgICAgIDxsYWJlbD5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgXFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2NvbnRlbnQgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9fY29udGVudFxcXCI+XFxuICAgICAgPHVsPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmFzc2lnbm1lbnRzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC91bD5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBvdmVyLWxpbWl0IFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW8gY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuXFxuICAgICAgICAgICAgPGxhYmVsIGZvcj1cXFwicGVyY2VudFxcXCI+PHNwYW4+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG5cXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cXFwiZ3JhZGluZy1zZWxlY3Rpb25cXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAvPlxcblxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdcXFwiPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc3VtbWFyeVxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX190b3RhbFxcXCI+XFxuXFxuICAgICAgPGgzPlRvdGFsPC9oMz5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX19wZXJjZW50IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNPdmVyTGltaXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcblxcbiAgICAgIDxoMyBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3RvdGFsLW51bWJlclxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRvdGFsR3JhZGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRvdGFsR3JhZGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPHNwYW4gY2xhc3M9XFxcInBlcmNlbnQtc3ltYm9sXFxcIj4lPC9zcGFuPjwvaDM+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuICBcXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvblxcXCI+XFxuXFxuICAgIDxoNSBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uX190aXRsZVxcXCI+R3JhZGluZyBiYXNlZCBvbjo8L2g1PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb24tZm9ybVxcXCI+XFxuXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXdyYXBwZXJcXFwiPlxcblxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLm9wdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIjtcblxuXG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcInt7Y291cnNlIGRldGFpbHMgPGJyLz5cXG4gfCBjb3Vyc2VfbmFtZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3Vyc2VfbmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW5zdHJ1Y3Rvcl91c2VybmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGluc3RydWN0b3JfcmVhbG5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGVhY2hlcikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IHN1YmplY3QgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3ViamVjdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IHN0YXJ0X2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNvdXJzZV9kZXRhaWxzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0YXJ0X2RhdGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGVuZF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jb3Vyc2VfZGV0YWlscyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lbmRfZGF0ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgaW5zdGl0dXRpb24gPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2Nob29sKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG59fTxici8+XFxuPGJyLz5cXG5cIjtcbiAgaWYgKHN0YWNrMiA9IGhlbHBlcnMuZGVzY3JpcHRpb24pIHsgc3RhY2syID0gc3RhY2syLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2syID0gZGVwdGgwLmRlc2NyaXB0aW9uOyBzdGFjazIgPSB0eXBlb2Ygc3RhY2syID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazIuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazIpXG4gICAgKyBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fRFlLID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0RZSyA9IG5vIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSBub1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxLCBzdGFjazI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyByZXR1cm4gc3RhY2syOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHZcXG4gfCB3YW50X2hlbHBfZmluZGluZ19hcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMSwgc3RhY2syO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgcmV0dXJuIHN0YWNrMjsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiA8YnIvPlxcbiB8IHdhbnRfaGVscF9ldmFsdWF0aW5nX2FydGljbGVzID0geWVzXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSBvcHRpb25zIDxici8+XFxuIHwgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiA8YnIvPlxcbiB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmdhKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wcmVwYXJlX2xpc3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTIsIHByb2dyYW0xMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgPGJyLz5cXG59fSA8YnIvPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucmVuZGVySW5PdXRwdXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgcmV0dXJuIHN0YWNrMTsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiJVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPT1HcmFkaW5nPT0gPGJyLz5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgZ3JhZGluZyA8YnIvPlxcblwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5ncmFkZUl0ZW1zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIH19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMTtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnJlbmRlckluT3V0cHV0LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IHJldHVybiBzdGFjazE7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiVcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIj09R3JhZGluZz09XFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IGdyYWRpbmcgXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZ3JhZGluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZXNlYXJjaHdyaXRlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIjxici8+fX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJcbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuI1RFTVBBTFRFXG5XaWtpRGF0ZXNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzJylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIERhdGVJbnB1dFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cblxuICBldmVudHM6XG5cbiAgICAnY2xpY2sgc2VsZWN0JyA6ICdjbGlja0hhbmRsZXInXG5cbiAgICAnY2hhbmdlIHNlbGVjdCcgOiAnY2hhbmdlSGFuZGxlcidcblxuICAgICdmb2N1cyBzZWxlY3QnIDogJ2ZvY3VzSGFuZGxlcidcblxuICAgICdibHVyIHNlbGVjdCcgOiAnYmx1ckhhbmRsZXInXG5cbiAgICAnbW91c2VvdmVyJyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnbW91c2VvdXQnIDogJ2JsdXJIYW5kbGVyJ1xuXG4gIG06ICcnXG4gIGQ6ICcnXG4gIHk6ICcnXG4gIGRhdGVWYWx1ZTogJydcblxuXG4gIHJlbmRlcjogLT5cblxuICAgICQoJ2JvZHknKS5vbiAnY2xpY2snLCAoZSkgPT5cblxuICAgICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuXG4gIGNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIGJsdXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuICBmb2N1c0hhbmRsZXI6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBjaGFuZ2VIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cbiAgICAkdGFyZ2V0ID0gKCQgZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgaWQgPSAkdGFyZ2V0LmF0dHIoJ2RhdGEtZGF0ZS1pZCcpXG5cbiAgICB0eXBlID0gJHRhcmdldC5hdHRyKCdkYXRhLWRhdGUtdHlwZScpXG5cbiAgICB2YWx1ZSA9ICR0YXJnZXQudmFsKClcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF1bdHlwZV0gPSB2YWx1ZVxuXG4gICAgQG0gPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWydtb250aCddXG5cbiAgICBAZCA9IFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF1bJ2RheSddXG5cbiAgICBAeSA9IFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF1bJ3llYXInXVxuXG4gICAgQGRhdGVWYWx1ZSA9IFwiI3tAeX0tI3tAbX0tI3tAZH1cIlxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXS52YWx1ZSA9IEBkYXRlVmFsdWVcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2RhdGU6Y2hhbmdlJywgQClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGhhc1ZhbHVlOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuZmluZCgnc2VsZWN0JykudmFsKCkgIT0gJydcblxuXG4gIGNsb3NlSWZOb1ZhbHVlOiAtPlxuXG4gICAgaWYgQGhhc1ZhbHVlKClcblxuICAgICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgaXNWYWxpZDogLT5cbiAgICBpc0l0ID0gZmFsc2VcblxuICAgIGlmIEBtICE9ICcnIGFuZCBAZCAhPSAnJyBhbmQgQHkgIT0gJydcbiAgICAgIGlzSXQgPSB0cnVlXG5cbiAgICByZXR1cm4gaXNJdFxuXG5cblxuXG5cblxuIiwiIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbldpa2lHcmFkaW5nTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraUdyYWRpbmdNb2R1bGUuaGJzJylcblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgR3JhZGluZ0lucHV0VmlldyBleHRlbmRzIFZpZXdcblxuICB0ZW1wbGF0ZTogV2lraUdyYWRpbmdNb2R1bGVcblxuXG4gIGV2ZW50czpcblxuICAgICdjaGFuZ2UgaW5wdXQnIDogJ2lucHV0Q2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBsYWJlbCcgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ2dyYWRlOmNoYW5nZScgOiAnZ3JhZGVDaGFuZ2VIYW5kbGVyJ1xuXG4gIGN1cnJlbnRWYWx1ZXM6IFtdXG5cblxuICB2YWx1ZUxpbWl0OiAxMDBcblxuXG4gIGdyYWRpbmdTZWxlY3Rpb25EYXRhOiBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ11cblxuXG4gIGN1cnJlbnRUb3RhbDogLT5cblxuICAgIHRvdGFsID0gMFxuXG4gICAgXy5lYWNoKEBjdXJyZW50VmFsdWVzLCAodmFsKSA9PlxuXG4gICAgICB0b3RhbCArPSBwYXJzZUludCh2YWwpXG5cbiAgICApXG5cbiAgICByZXR1cm4gdG90YWxcblxuXG5cbiAgZ2V0SW5wdXRWYWx1ZXM6IC0+XG5cbiAgICB2YWx1ZXMgPSBbXVxuXG4gICAgQHBhcmVudFN0ZXBWaWV3LiRlbC5maW5kKCdpbnB1dFt0eXBlPVwicGVyY2VudFwiXScpLmVhY2goLT5cblxuICAgICAgY3VyVmFsID0gKCQgdGhpcykudmFsKClcblxuICAgICAgaWYgY3VyVmFsXG4gICAgICAgIFxuICAgICAgICB2YWx1ZXMucHVzaChjdXJWYWwpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICAoJCB0aGlzKS52YWwoMClcblxuICAgICAgICB2YWx1ZXMucHVzaCgwKVxuXG5cblxuICAgIClcblxuICAgIEBjdXJyZW50VmFsdWVzID0gdmFsdWVzXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBncmFkZUNoYW5nZUhhbmRsZXI6IChpZCwgdmFsdWUpIC0+XG4gICAgXG4gICAgQGdldElucHV0VmFsdWVzKCkucmVuZGVyKClcblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10ub3B0aW9ucywgKG9wdCkgLT5cblxuICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZVxuICAgICAgICBcbiAgICAgIClcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLm9wdGlvbnNbJGlucHV0RWwuYXR0cignaWQnKV0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS52YWx1ZSA9ICRpbnB1dEVsLmF0dHIoJ2lkJylcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIG91dCA9IHtcblxuICAgICAgdG90YWxHcmFkZTogQGN1cnJlbnRUb3RhbCgpXG5cbiAgICAgIGlzT3ZlckxpbWl0OiBAY3VycmVudFRvdGFsKCkgPiBAdmFsdWVMaW1pdFxuXG4gICAgICBvcHRpb25zOiBAZ3JhZGluZ1NlbGVjdGlvbkRhdGEub3B0aW9uc1xuXG4gICAgfVxuXG4gICAgcmV0dXJuIG91dFxuXG5cblxuXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkhvbWVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzJylcblxuI1NVQlZJRVdTXG5TdGVwVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBWaWV3JylcblxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5cblN0ZXBOYXZWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcE5hdlZpZXcnKVxuXG5UaW1lbGluZVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9UaW1lbGluZVZpZXcnKVxuXG4jSU5QVVRTXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICBzdGVwRGF0YTogXG5cbiAgICBpbnRybzogYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLmludHJvX3N0ZXBzXG5cbiAgICBwYXRod2F5czogYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLnBhdGh3YXlzXG5cbiAgICBvdXRybzogYXBwbGljYXRpb24uV2l6YXJkQ29uZmlnLm91dHJvX3N0ZXBzXG5cblxuICBwYXRod2F5SWRzOiAtPlxuXG4gICAgcmV0dXJuIF8ua2V5cyhAc3RlcERhdGEucGF0aHdheXMpXG5cbiAgc3RlcFZpZXdzOiBbXVxuXG5cbiAgYWxsU3RlcFZpZXdzOlxuXG4gICAgaW50cm86IFtdXG5cbiAgICBwYXRod2F5OiBbXVxuXG4gICAgb3V0cm86IFtdXG5cblxuICBzZWxlY3RlZFBhdGh3YXlzOiBbXVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSU5JVFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBpbml0aWFsaXplOiAtPlxuXG4gICAgQFN0ZXBOYXYgPSBuZXcgU3RlcE5hdlZpZXcoKVxuXG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG5cbiAgZXZlbnRzOiBcblxuICAgICdjbGljayAuZXhpdC1lZGl0JyA6ICdleGl0RWRpdENsaWNrSGFuZGxlcidcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0SGFuZGxlcidcblxuICAgICdzdGVwOnByZXYnIDogJ3ByZXZIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6Z290bycgOiAnZ290b0hhbmRsZXInXG5cbiAgICAnc3RlcDpnb3RvSWQnIDogJ2dvdG9JZEhhbmRsZXInXG5cbiAgICAnc3RlcDplZGl0JyA6ICdlZGl0SGFuZGxlcidcblxuICAgICd0aXBzOmhpZGUnIDogJ2hpZGVBbGxUaXBzJ1xuXG4gICAgJ2VkaXQ6ZXhpdCcgOiAnb25FZGl0RXhpdCdcblxuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkpKVxuXG4gICAgdW5sZXNzIEBzdGVwc1JlbmRlcmVkXG4gICAgXG4gICAgICBAYWZ0ZXJSZW5kZXIoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRzdGVwc0NvbnRhaW5lciA9IEAkZWwuZmluZCgnLnN0ZXBzJylcblxuICAgIEAkaW5uZXJDb250YWluZXIgPSBAJGVsLmZpbmQoJy5jb250ZW50JylcblxuICAgIEByZW5kZXJJbnRyb1N0ZXBzKClcblxuICAgIEByZW5kZXJTdGVwcygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG4gICAgaWYgQHN0ZXBWaWV3cy5sZW5ndGggPiAwXG5cbiAgICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG4gICAgc2V0VGltZW91dCg9PlxuICAgICAgQHRpbWVsaW5lVmlldyA9IG5ldyBUaW1lbGluZVZpZXcoKVxuICAgICwxMDAwKVxuICAgIFxuXG4gICAgXG4gICAgcmV0dXJuIEBcblxuICByZW5kZXJJbnRyb1N0ZXBzOiAtPlxuXG4gICAgc3RlcE51bWJlciA9IDBcblxuICAgIF8uZWFjaChAc3RlcERhdGEuaW50cm8sKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBpZiBpbmRleCBpcyAwXG5cbiAgICAgICAgbmV3dmlldy5pc0ZpcnN0U3RlcCA9IHRydWVcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICBAc3RlcFZpZXdzLnB1c2gobmV3dmlldylcblxuICAgICAgQGFsbFN0ZXBWaWV3cy5pbnRyby5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuICByZW5kZXJTdGVwczogLT5cblxuICAgIEBhbGxTdGVwVmlld3MucGF0aHdheSA9IFtdXG5cbiAgICBzdGVwTnVtYmVyID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIF8uZWFjaChAc2VsZWN0ZWRQYXRod2F5cywgKHBpZCwgcGluZGV4KSA9PlxuXG4gICAgICBfLmVhY2goQHN0ZXBEYXRhLnBhdGh3YXlzW3BpZF0sKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICAgIGlmIEBzZWxlY3RlZFBhdGh3YXlzLmxlbmd0aCA+IDFcblxuICAgICAgICAgIGlmIHN0ZXAuaWQgaXMgJ2dyYWRpbmcnIHx8IHN0ZXAuaWQgaXMgJ292ZXJ2aWV3JyB8fCBzdGVwLnR5cGUgaXMgJ2dyYWRpbmcnIHx8IHN0ZXAudHlwZSBpcyAnb3ZlcnZpZXcnXG5cbiAgICAgICAgICAgIGlmIHBpbmRleCA8IEBzZWxlY3RlZFBhdGh3YXlzLmxlbmd0aCAtIDFcblxuICAgICAgICAgICAgICByZXR1cm4gXG5cbiAgICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICAgIG5ld21vZGVsLnNldChrZXksdmFsdWUpXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgICBtb2RlbDogbmV3bW9kZWxcblxuICAgICAgICApXG5cbiAgICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4Jywgc3RlcE51bWJlciApXG5cbiAgICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLS0je3N0ZXAuaWR9XCIpXG5cbiAgICAgICAgbmV3dmlldy4kZWwuYWRkQ2xhc3MoXCJzdGVwLXBhdGh3YXkgc3RlcC1wYXRod2F5LS0je3BpZH1cIilcblxuICAgICAgICBAc3RlcFZpZXdzLnB1c2gobmV3dmlldylcblxuICAgICAgICBAYWxsU3RlcFZpZXdzLnBhdGh3YXkucHVzaChuZXd2aWV3KVxuXG4gICAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgICApXG4gICAgXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuICByZW5kZXJPdXRyb1N0ZXBzOiAtPlxuXG4gICAgQGFsbFN0ZXBWaWV3cy5vdXRybyA9IFtdXG5cbiAgICBzdGVwTnVtYmVyID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIF8uZWFjaChAc3RlcERhdGEub3V0cm8sKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBzdGVwTnVtYmVyICsgMSlcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICBpZiBpbmRleCBpcyBAc3RlcERhdGEub3V0cm8ubGVuZ3RoIC0gMVxuXG4gICAgICAgIG5ld3ZpZXcuaXNMYXN0U3RlcCA9IHRydWVcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICBAc3RlcFZpZXdzLnB1c2gobmV3dmlldylcblxuICAgICAgQGFsbFN0ZXBWaWV3cy5vdXRyby5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIHN0ZXBOdW1iZXIrK1xuXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgcmVjcmVhdGVQYXRod2F5OiAtPlxuXG4gICAgY2xvbmUgPSBAc3RlcFZpZXdzXG5cbiAgICBAc3RlcFZpZXdzID0gW2Nsb25lWzBdLCBjbG9uZVsxXV1cblxuICAgIF8uZWFjaChAYWxsU3RlcFZpZXdzLnBhdGh3YXksIChzdGVwKSAtPlxuXG4gICAgICBzdGVwLnJlbW92ZSgpXG5cbiAgICApXG5cbiAgICBfLmVhY2goQGFsbFN0ZXBWaWV3cy5vdXRybywgKHN0ZXApIC0+XG5cbiAgICAgIHN0ZXAucmVtb3ZlKClcblxuICAgIClcblxuICAgIEByZW5kZXJTdGVwcygpXG5cbiAgICBAcmVuZGVyT3V0cm9TdGVwcygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY29udGVudDogXCJUaGlzIGlzIHNwZWNpYWwgY29udGVudFwiXG5cbiAgICB9XG4gICAgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIENVU1RPTSBGVU5DVElPTlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWR2YW5jZVN0ZXA6IC0+XG5cbiAgICBAY3VycmVudFN0ZXArPTFcbiAgICBcbiAgICBpZiBAY3VycmVudFN0ZXAgaXMgQHN0ZXBWaWV3cy5sZW5ndGggXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICBkZWNyZW1lbnRTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwLT0xXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPCAwXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IEBzdGVwVmlld3MubGVuZ3RoIC0gMVxuXG4gICAgQGhpZGVBbGxTdGVwcygpXG5cbiAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuXG5cbiAgdXBkYXRlU3RlcDogKGluZGV4KSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gaW5kZXhcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICB1cGRhdGVTdGVwQnlJZDogKGlkKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBpZiBzdGVwVmlldy5zdGVwSWQoKSBpcyBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKF8uaW5kZXhPZihAc3RlcFZpZXdzLHN0ZXBWaWV3KSlcbiAgICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgXG4gICAgKVxuXG5cbiAgc2hvd0N1cnJlbnRTdGVwOiAtPlxuXG4gICAgQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLnNob3coKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDp1cGRhdGUnLCBAY3VycmVudFN0ZXApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgdXBkYXRlU2VsZWN0ZWRQYXRod2F5OiAoYWN0aW9uLCBwYXRod2F5SWQpIC0+XG5cbiAgICBpZiBhY3Rpb24gaXMgJ2FkZCdcblxuICAgICAgaWYgcGF0aHdheUlkIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICAgIEBzZWxlY3RlZFBhdGh3YXlzID0gW3BhdGh3YXlJZF1cblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBzZWxlY3RlZFBhdGh3YXlzLnB1c2gocGF0aHdheUlkKVxuXG4gICAgZWxzZSBpZiBhY3Rpb24gaXMgJ3JlbW92ZSdcblxuICAgICAgaWYgcGF0aHdheUlkIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICAgIEBzZWxlY3RlZFBhdGh3YXlzID0gW11cblxuICAgICAgZWxzZVxuXG4gICAgICAgIHJlbW92ZUluZGV4ID0gXy5pbmRleE9mKEBzZWxlY3RlZFBhdGh3YXksIHBhdGh3YXlJZClcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cy5zcGxpY2UocmVtb3ZlSW5kZXgpXG5cbiAgICBAcmVjcmVhdGVQYXRod2F5KClcblxuICAgIHJldHVybiBAXG5cblxuICBjdXJyZW50U3RlcFZpZXc6IC0+XG5cbiAgICByZXR1cm4gQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdXG5cblxuICBoaWRlQWxsU3RlcHM6IC0+XG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG5cbiAgICAgIHN0ZXBWaWV3LmhpZGUoKVxuICAgICAgXG4gICAgKVxuXG5cbiAgaGlkZUFsbFRpcHM6IChlKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy50aXBWaXNpYmxlID0gZmFsc2VcbiAgICAgIFxuICAgIClcblxuICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dEhhbmRsZXI6IC0+XG5cbiAgICBAYWR2YW5jZVN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG5cbiAgcHJldkhhbmRsZXI6IC0+XG5cbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZWRpdEhhbmRsZXI6IChpZCkgLT5cblxuICAgIGlmIGlkIGlzICdhc3NpZ25tZW50X3NlbGVjdGlvbidcbiAgICAgIHggPSBjb25maXJtKCdBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gc3RhcnQgdGhlIHByb2Nlc3Mgb3ZlciB3aXRoIGEgbmV3IGFzc2lnbm1lbnQgdHlwZT8nKVxuICAgICAgaWYgIXhcbiAgICAgICAgcmV0dXJuXG5cbiAgICBlbHNlICAgICAgIFxuXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2VkaXQtbW9kZScpXG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywgKHZpZXcsIGluZGV4KSA9PlxuXG4gICAgICBpZiB2aWV3Lm1vZGVsLmlkID09IGlkXG5cbiAgICAgICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICApXG5cblxuICBvbkVkaXRFeGl0OiAtPlxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdlZGl0LW1vZGUnKVxuXG5cbiAgZXhpdEVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2VkaXQ6ZXhpdCcpXG5cblxuXG4gIGdvdG9IYW5kbGVyOiAoaW5kZXgpIC0+XG5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuICBnb3RvSWRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBAdXBkYXRlU3RlcEJ5SWQoaWQpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ2V0U2VsZWN0ZWRJZHM6IC0+XG5cbiAgICBzZWxlY3RlZElkcyA9IFtdXG5cbiAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0cywgKHN0ZXBzKSA9PlxuXG4gICAgICBfLmVhY2goc3RlcHMsIChzdGVwKSA9PlxuXG4gICAgICAgIGlmIHN0ZXAuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgaWYgc3RlcC5pZFxuXG4gICAgICAgICAgICBzZWxlY3RlZElkcy5wdXNoIHN0ZXAuaWRcblxuICAgICAgKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIHNlbGVjdGVkSWRzXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL0lucHV0VmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgSW5wdXRWaWV3IFxuXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkxvZ2luVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMnKVxuXG5Mb2dpbkNvbnRlbnQgPSByZXF1aXJlKCcuLi9kYXRhL0xvZ2luQ29udGVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG4gIHRlbXBsYXRlOiBMb2dpblRlbXBsYXRlXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICBcbiAgICByZXR1cm4gTG9naW5Db250ZW50IiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkNvdXJzZURldGFpbHNUZW1wYWx0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicycpXG5HcmFkaW5nVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdUZW1wbGF0ZS5oYnMnKVxuQ291cnNlT3B0aW9uc1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzJylcblxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBPdXRwdXRWaWV3IGV4dGVuZHMgVmlldyBcblxuICBjdXJyZW50QnVpbGQ6ICcnXG5cbiAgZGV0YWlsc1RlbXBsYXRlOiBDb3Vyc2VEZXRhaWxzVGVtcGFsdGVcblxuICBncmFkaW5nVGVtcGxhdGU6IEdyYWRpbmdUZW1wbGF0ZVxuXG4gIG9wdGlvbnNUZW1wbGF0ZTogQ291cnNlT3B0aW9uc1RlbXBsYXRlXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3dpemFyZDpwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcidcbiAgICAnb3V0cHV0OnVwZGF0ZScgIDogJ3VwZGF0ZUJ1aWxkJ1xuXG4gIHVwZGF0ZUJ1aWxkOiAoYnVpbGQpIC0+XG4gICAgQGN1cnJlbnRCdWlsZCA9IGJ1aWxkXG4gICAgIyBjb25zb2xlLmxvZyBAY3VycmVudEJ1aWxkXG5cblxuICBvdXRwdXRQbGFpblRleHQ6IC0+XG5cbiAgICBAcmVuZGVyKClcblxuICAgIHJldHVybiBAJGVsLnRleHQoKVxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIFxuICAgIHJldHVybiBAXG5cblxuICBwb3B1bGF0ZU91dHB1dDogLT5cblxuICAgIGRldGFpbHNPdXRwdXQgPSBAJGVsLmh0bWwoQGRldGFpbHNUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICByYXdBc3NpZ25tZW50T3V0cHV0ID0gQCRlbC5odG1sKEB0ZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBhc3NpZ25tZW50T3V0cHV0ID0gcmF3QXNzaWdubWVudE91dHB1dC5yZXBsYWNlKC8oXFxyXFxufFxcbnxcXHIpL2dtLFwiXCIpXG5cbiAgICBncmFkaW5nT3V0cHV0ID0gQCRlbC5odG1sKEBncmFkaW5nVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgb3B0aW9uc091dHB1dCA9IEAkZWwuaHRtbChAb3B0aW9uc1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIGNvdXJzZU91dCA9IGRldGFpbHNPdXRwdXQgKyBhc3NpZ25tZW50T3V0cHV0ICsgZ3JhZGluZ091dHB1dCArIG9wdGlvbnNPdXRwdXRcbiAgICBcbiAgICByZXR1cm4gY291cnNlT3V0XG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIF8uZXh0ZW5kKFdpemFyZFN0ZXBJbnB1dHMseyBkZXNjcmlwdGlvbjogJCgnI3Nob3J0X2Rlc2NyaXB0aW9uJykudmFsKCksIGxpbmVCcmVhazogJzxici8+J30pXG5cblxuICBleHBvcnREYXRhOiAoZm9ybURhdGEpIC0+XG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcblxuICAgICAgICB3aWtpdGV4dDogZm9ybURhdGFcblxuICAgICAgICBjb3Vyc2VfdGl0bGU6IFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWVcblxuICAgICAgc3VjY2VzczogKHJlc3BvbnNlKSAtPlxuXG4gICAgICAgICQoJyNwdWJsaXNoJykucmVtb3ZlQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAgIGlmIHJlc3BvbnNlLnN1Y2Nlc3NcblxuICAgICAgICAgIG5ld1BhZ2UgPSBcImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvI3tyZXNwb25zZS50aXRsZX1cIlxuXG4gICAgICAgICAgYWxlcnQoXCJDb25ncmF0cyEgWW91IGhhdmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQvZWRpdGVkIGEgV2lraWVkdSBDb3Vyc2UgYXQgI3tuZXdQYWdlfVwiKVxuXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBuZXdQYWdlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgY29uc29sZS5sb2cgcmVzcG9uc2VcblxuICAgICAgICAgIGFsZXJ0KCdIbW0uLi4gc29tZXRoaW5nIHdlbnQgd3JvbmcuIFRyeSBjbGlja2luZyBcIlB1Ymxpc2hcIiBhZ2Fpbi4gSWYgdGhhdCBkb2VzblxcJ3Qgd29yaywgcGxlYXNlIHNlbmQgYSBtZXNzYWdlIHRvIHNhZ2VAd2lraWVkdS5vcmcuJylcblxuXG4gICAgKVxuICAgIFxuXG4gIHB1Ymxpc2hIYW5kbGVyOiAtPlxuXG4gICAgaWYgV2l6YXJkU3RlcElucHV0cy5pbnRyby5jb3Vyc2VfbmFtZS52YWx1ZS5sZW5ndGggPiAwIFxuXG4gICAgICAkKCcjcHVibGlzaCcpLmFkZENsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgY29uc29sZS5sb2cgQGN1cnJlbnRCdWlsZFxuXG4gICAgICBAZXhwb3J0RGF0YShAY3VycmVudEJ1aWxkKVxuXG4gICAgZWxzZVxuXG4gICAgICBhbGVydCgnWW91IG11c3QgZW50ZXIgYSBjb3Vyc2UgdGl0bGUgYXMgdGhpcyB3aWxsIGJlY29tZSB0aGUgdGl0bGUgb2YgeW91ciBjb3Vyc2UgcGFnZS4nKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnaW50cm8nKVxuXG4gICAgICBzZXRUaW1lb3V0KD0+XG5cbiAgICAgICAgJCgnI2NvdXJzZV9uYW1lJykuZm9jdXMoKVxuXG4gICAgICAsNTAwKVxuXG5cbiAgICBcblxuICAgIFxuXG4gICAgXG4iLCIjIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuV2lraVN1bW1hcnlNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpU3VtbWFyeU1vZHVsZS5oYnMnKVxuV2lraURldGFpbHNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGV0YWlsc01vZHVsZS5oYnMnKVxuXG4jRGF0YVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuVGltZWxpbmVWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvVGltZWxpbmVWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE92ZXJ2aWV3VmlldyBleHRlbmRzIFZpZXdcblxuICBldmVudHM6IFxuICAgICdjbGljayAuZXhwYW5kLWFsbCcgOiAnZXhwYW5kQ29sbGFwc2VBbGwnXG5cbiAgb3ZlcnZpZXdJdGVtVGVtcGxhdGU6IFdpa2lEZXRhaWxzTW9kdWxlXG5cbiAgZXhwYW5kQ29sbGFwc2VBbGw6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHRhcmdldC50b2dnbGVDbGFzcygnb3BlbicpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXIuaGFzLWNvbnRlbnQnKS5maW5kKCcuY3VzdG9tLWlucHV0LWFjY29yZGlhbicpLnRvZ2dsZUNsYXNzKCdhY3RpdmUnKVxuXG4gICAgaWYgJHRhcmdldC5oYXNDbGFzcygnb3BlbicpXG4gICAgICAkdGFyZ2V0LnRleHQoJ1tjb2xsYXBzZSBhbGxdJylcbiAgICBlbHNlXG4gICAgICAkdGFyZ2V0LnRleHQoJ1tleHBhbmQgYWxsXScpXG5cblxuXG4gICAgXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc2VsZWN0ZWRQYXRod2F5cyA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXNcblxuICAgIHNlbGVjdGVkT2JqZWN0cyA9IF8ud2hlcmUoV2l6YXJkU3RlcElucHV0c1snYXNzaWdubWVudF9zZWxlY3Rpb24nXSwge3NlbGVjdGVkOiB0cnVlfSlcblxuICAgICQoJzxkaXYgY2xhc3M9XCJzdGVwLWZvcm0tY29udGVudF9fdGl0bGVcIj5TZWxlY3RlZCBhc3NpZ25tZW50KHMpOjwvZGl2PicpLmFwcGVuZFRvKEAkZWwpLmNzcyhcbiAgICAgIG1hcmdpbkJvdHRvbTogJzhweCdcbiAgICApXG5cbiAgICBfLmVhY2goc2VsZWN0ZWRPYmplY3RzLCAob2JqKSA9PlxuXG4gICAgICBwYXRoVGl0bGUgPSBvYmoubGFiZWxcblxuICAgICAgJG5ld1RpdGxlID0gJChAb3ZlcnZpZXdJdGVtVGVtcGxhdGUoXG5cbiAgICAgICAgbGFiZWw6IHBhdGhUaXRsZVxuXG4gICAgICAgIHN0ZXBJZDogJ2Fzc2lnbm1lbnRfc2VsZWN0aW9uJ1xuXG4gICAgICAgIGFzc2lnbm1lbnRzOiBbXVxuXG4gICAgICApKS5maW5kKCcuY3VzdG9tLWlucHV0JykucmVtb3ZlQ2xhc3MoJ2N1c3RvbS1pbnB1dC0tYWNjb3JkaWFuJylcblxuICAgICAgJG5ld1RpdGxlLmZpbmQoJy5lZGl0LWJ1dHRvbicpXG5cbiAgICAgIEAkZWwuYXBwZW5kKCRuZXdUaXRsZSlcblxuICAgIClcblxuICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgIFxuICAgIFxuICAgIF8uZWFjaChzZWxlY3RlZFBhdGh3YXlzLCAocGlkLCBpKSA9PlxuXG4gICAgICBzdGVwRGF0YSA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnN0ZXBEYXRhLnBhdGh3YXlzW3BpZF1cblxuICAgICAgaW5wdXREYXRhSWRzID0gXy5wbHVjayhzdGVwRGF0YSwgJ2lkJylcblxuICAgICAgc3RlcFRpdGxlcyA9IF8ucGx1Y2soc3RlcERhdGEsICd0aXRsZScpXG5cbiAgICAgIHRvdGFsTGVuZ3RoID0gc3RlcERhdGEubGVuZ3RoXG5cbiAgICAgIGlmIHN0ZXBUaXRsZXMubGVuZ3RoID4gMCAmJiBpIGlzIDBcblxuICAgICAgICAkKCc8ZGl2IGNsYXNzPVwic3RlcC1mb3JtLWNvbnRlbnRfX3RpdGxlXCI+QXNzaWdubWVudCBkZXRhaWxzOiA8YSBjbGFzcz1cImV4cGFuZC1hbGxcIiBocmVmPVwiI1wiPltleHBhbmQgYWxsXTwvYT48L2Rpdj4nKS5hcHBlbmRUbyhAJGVsKS5jc3MoXG4gICAgICAgICAgYm90dG9tOiAnYXV0bydcbiAgICAgICAgICBkaXNwbGF5OiAnYmxvY2snXG4gICAgICAgICAgcG9zaXRpb246ICdyZWxhdGl2ZSdcbiAgICAgICAgICBtYXJnaW5Cb3R0b206ICcwJ1xuICAgICAgICAgIG1hcmdpblRvcDogJzE1cHgnXG4gICAgICAgIClcblxuICAgICAgXy5lYWNoKHN0ZXBUaXRsZXMsICh0aXRsZSwgaW5kZXgpID0+XG5cbiAgICAgICAgdW5sZXNzIHN0ZXBEYXRhW2luZGV4XS5zaG93SW5PdmVydmlld1xuXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgc2VsZWN0ZWRJbnB1dHMgPSBbXVxuXG4gICAgICAgIHN0ZXBJbnB1dEl0ZW1zID0gV2l6YXJkU3RlcElucHV0c1tpbnB1dERhdGFJZHNbaW5kZXhdXVxuXG5cbiAgICAgICAgXy5lYWNoKHN0ZXBJbnB1dEl0ZW1zLCAoaW5wdXQpID0+XG5cbiAgICAgICAgICBpZiBpbnB1dC50eXBlXG5cbiAgICAgICAgICAgIGlmIGlucHV0LnR5cGUgaXMgJ2NoZWNrYm94JyB8fCBpbnB1dC50eXBlIGlzICdyYWRpb0JveCdcblxuICAgICAgICAgICAgICBpZiBpbnB1dC5zZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0LmxhYmVsXG5cbiAgICAgICAgICAgIGVsc2UgaWYgaW5wdXQudHlwZSBpcyAncmFkaW9Hcm91cCdcblxuICAgICAgICAgICAgICBpZiBpbnB1dC5pZCBpcyAncGVlcl9yZXZpZXdzJ1xuXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5vdmVydmlld0xhYmVsXG4gICAgICAgIClcblxuICAgICAgICBpZiBzZWxlY3RlZElucHV0cy5sZW5ndGggPT0gMFxuXG4gICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBcIltOb25lIHNlbGVjdGVkXVwiXG5cbiAgICAgICAgQCRlbC5hcHBlbmQoIEBvdmVydmlld0l0ZW1UZW1wbGF0ZShcblxuICAgICAgICAgIGxhYmVsOiB0aXRsZVxuXG4gICAgICAgICAgc3RlcElkOiBpbnB1dERhdGFJZHNbaW5kZXhdXG5cbiAgICAgICAgICBhc3NpZ25tZW50czogc2VsZWN0ZWRJbnB1dHNcblxuICAgICAgICApKVxuXG4gICAgICApXG4gICAgKVxuXG4gICAgQHJlbmRlckRlc2NyaXB0aW9uKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcmVuZGVyRGVzY3JpcHRpb246IC0+XG5cbiAgICBAVGltZWxpbmVWaWV3ID0gbmV3IFRpbWVsaW5lVmlldygpXG5cbiAgICAkZGVzY0lucHV0ID0gJChcIjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzYnIHN0eWxlPSd3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6cmdiYSgyNDIsMjQyLDI0MiwxLjApO2JvcmRlcjoxcHggc29saWQgcmdiYSgyMDIsMjAyLDIwMiwxLjApO3BhZGRpbmc6MTBweCAxNXB4O2ZvbnQtc2l6ZTogMTZweDtsaW5lLWhlaWdodCAyM3B4O2xldHRlci1zcGFjaW5nOiAwLjI1cHg7Jz48L3RleHRhcmVhPlwiKVxuXG4gICAgJGRlc2NJbnB1dC52YWwoV2l6YXJkU3RlcElucHV0cy5jb3Vyc2VfZGV0YWlscy5kZXNjcmlwdGlvbilcblxuICAgICQoJy5kZXNjcmlwdGlvbi1jb250YWluZXInKS5odG1sKCRkZXNjSW5wdXRbMF0pXG5cbiAgICAkZGVzY0lucHV0Lm9mZiAnY2hhbmdlJ1xuXG4gICAgJGRlc2NJbnB1dC5vbiAnY2hhbmdlJywgKGUpID0+XG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb24gPSAkKGUudGFyZ2V0KS52YWwoKVxuXG4gICAgICBAVGltZWxpbmVWaWV3LnVwZGF0ZSgpXG4gICAgICBhcHBsaWNhdGlvbi5ob21lVmlldy50aW1lbGluZVZpZXcudXBkYXRlKClcblxuICAgIHJldHVybiBAXG5cblxuXG5cbiAgICBcblxuICAiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwTmF2Vmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuU3RlcE5hdlRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE5hdlZpZXcgZXh0ZW5kcyBWaWV3XG5cblxuICBjbGFzc05hbWU6ICdzdGVwLW5hdidcblxuXG4gIHRlbXBsYXRlOiBTdGVwTmF2VGVtcGxhdGVcblxuXG4gIGhhc0JlZW5Ub0xhc3RTdGVwOiBmYWxzZVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBcbiAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDp1cGRhdGUnIDogJ3VwZGF0ZUN1cnJlbnRTdGVwJ1xuXG4gICAgJ3N0ZXA6YW5zd2VyZWQnIDogJ3N0ZXBBbnN3ZXJlZCdcblxuICAgICdlZGl0OmV4aXQnIDogJ2VkaXRFeGl0SGFuZGxlcidcblxuXG4gIGV2ZW50czogLT5cblxuICAgICdjbGljayAubmV4dCcgOiAnbmV4dENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAucHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZG90JyAgOiAnZG90Q2xpY2tIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA8IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG4gICAgZWxzZSBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA9PSBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGlkZGVuJylcblxuICAgIEBhZnRlclJlbmRlcigpXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY3VycmVudDogQGN1cnJlbnRTdGVwXG5cbiAgICAgIHRvdGFsOiBAdG90YWxTdGVwc1xuXG4gICAgICBwcmV2SW5hY3RpdmU6IEBpc0luYWN0aXZlKCdwcmV2JylcblxuICAgICAgbmV4dEluYWN0aXZlOiBAaXNJbmFjdGl2ZSgnbmV4dCcpXG5cbiAgICAgIG5leHRUaXRsZTogPT5cblxuICAgICAgICBpZiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgICAgICByZXR1cm4gJydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdOZXh0J1xuXG4gICAgICBwcmV2VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICdCYWNrJ1xuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICByZXR1cm4gJ1ByZXYnXG5cbiAgICAgIGlzTGFzdFN0ZXA6IEBpc0xhc3RTdGVwKClcblxuICAgICAgYmFja1RvT3ZlcnZpZXdUaXRsZTogJ0dvIEJhY2sgdG8gT3ZlcnZpZXcnXG5cbiAgICAgIHN0ZXBzOiA9PlxuXG4gICAgICAgIG91dCA9IFtdXG5cbiAgICAgICAgXy5lYWNoKEBzdGVwVmlld3MsIChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICAgIHN0ZXBEYXRhID0gc3RlcC5tb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgICAgICBpc0FjdGl2ZSA9IEBjdXJyZW50U3RlcCBpcyBpbmRleFxuXG4gICAgICAgICAgd2FzVmlzaXRlZCA9IHN0ZXAuaGFzVXNlclZpc2l0ZWRcblxuICAgICAgICAgIG91dC5wdXNoIHtpZDogaW5kZXgsIGlzQWN0aXZlOiBpc0FjdGl2ZSwgaGFzVmlzaXRlZDogd2FzVmlzaXRlZCwgc3RlcFRpdGxlOiBzdGVwRGF0YS50aXRsZSwgc3RlcElkOiBzdGVwRGF0YS5pZH1cblxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG91dFxuXG4gICAgfVxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIHJldHVybiBAXG5cblxuXG4gIHByZXZDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICdncmFkaW5nJylcblxuICAgIGVsc2VcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpwcmV2JylcblxuXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuXG4gIGRvdENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIGlmIEBoYXNCZWVuVG9MYXN0U3RlcFxuXG4gICAgICBpZiBwYXJzZUludCgkdGFyZ2V0LmF0dHIoJ2RhdGEtbmF2LWlkJykpID09IHBhcnNlSW50KEB0b3RhbFN0ZXBzIC0gMSlcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdlZGl0OmV4aXQnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJHRhcmdldC5kYXRhKCdzdGVwLWlkJykpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsICR0YXJnZXQuZGF0YSgnbmF2LWlkJykpXG5cblxuICBlZGl0RXhpdEhhbmRsZXI6IC0+XG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAbGFzdFN0ZXBJbmRleCgpKVxuXG5cbiAgdXBkYXRlQ3VycmVudFN0ZXA6IChzdGVwKSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gc3RlcFxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBAaGFzQmVlblRvTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICBAcmVuZGVyKClcblxuXG4gIHN0ZXBBbnN3ZXJlZDogKHN0ZXBWaWV3KSAtPlxuXG4gICAgcmV0dXJuIEByZW5kZXIoKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGxhc3RTdGVwSW5kZXg6IC0+XG4gICAgXG4gICAgcmV0dXJuIEB0b3RhbFN0ZXBzLTFcblxuICBpc0xhc3RTdGVwOiAtPlxuXG4gICAgcmV0dXJuIEBjdXJyZW50U3RlcCBpcyBAdG90YWxTdGVwcyAtIDEgJiYgQGN1cnJlbnRTdGVwID4gMVxuXG4gIGlzSW5hY3RpdmU6IChpdGVtKSAtPlxuXG4gICAgaXRJcyA9IHRydWVcblxuICAgIGlmIGl0ZW0gPT0gJ3ByZXYnXG5cbiAgICAgIGl0SXMgPSBAY3VycmVudFN0ZXAgaXMgMFxuXG4gICAgZWxzZSBpZiBpdGVtID09ICduZXh0J1xuXG4gICAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5oYXNVc2VyQW5zd2VyZWRcblxuICAgICAgICBpdElzID0gZmFsc2VcblxuICAgICAgZWxzZSBpZiBAaXNMYXN0U3RlcCgpXG4gICAgICAgIFxuICAgICAgICBpdElzID0gdHJ1ZVxuXG4gICAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzLmxlbmd0aCA9PSAwXG5cbiAgICAgICAgaXRJcyA9IHRydWUgIFxuXG5cbiAgICByZXR1cm4gaXRJc1xuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIyMjIyMjIyNBUFAjIyMjIyMjIyNcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIyMjIyMjIyNWSUVXIENMQVNTIyMjIyMjIyMjXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jIyMjIyMjIyNTVUJWSUVXUyMjIyMjIyMjI1xuSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG5cbkRhdGVJbnB1dFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9EYXRlSW5wdXRWaWV3JylcblxuXG5HcmFkaW5nSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvR3JhZGluZ0lucHV0VmlldycpXG5cblxuT3ZlcnZpZXdWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvT3ZlcnZpZXdWaWV3JylcblxuXG4jIyMjIyMjIyNURU1QTEFURVMjIyMjIyMjIyMjI1xuU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5cbkludHJvU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicycpXG5cblxuSW5wdXRUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0lucHV0VGlwVGVtcGxhdGUuaGJzJylcblxuXG5Db3Vyc2VUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicycpXG5cblxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiMjIyMjIyMjIyNEQVRBIyMjIyMjIyMjXG5Db3Vyc2VJbmZvRGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkQ291cnNlSW5mbycpXG5cbiMjIyMjIyMjI0lOUFVUUyMjIyMjIyMjI1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcFZpZXcgZXh0ZW5kcyBWaWV3XG5cblxuICBjbGFzc05hbWU6ICdzdGVwJ1xuXG5cbiAgdGFnTmFtZTogJ3NlY3Rpb24nXG5cblxuICB0ZW1wbGF0ZTogU3RlcFRlbXBsYXRlXG5cblxuICBpbnRyb1RlbXBsYXRlOiBJbnRyb1N0ZXBUZW1wbGF0ZVxuXG5cbiAgdGlwVGVtcGxhdGU6IElucHV0VGlwVGVtcGxhdGVcblxuXG4gIGNvdXJzZUluZm9UZW1wbGF0ZTogQ291cnNlVGlwVGVtcGxhdGVcblxuXG4gIGNvdXJzZUluZm9EYXRhOiBDb3Vyc2VJbmZvRGF0YVxuXG5cbiAgZGF0ZXNNb2R1bGU6IFdpa2lEYXRlc01vZHVsZVxuXG5cbiAgaGFzVXNlckFuc3dlcmVkOiBmYWxzZVxuXG5cbiAgaGFzVXNlclZpc2l0ZWQ6IGZhbHNlXG5cblxuICBpc0xhc3RTdGVwOiBmYWxzZVxuXG5cbiAgaXNGaXJzdFN0ZXA6IGZhbHNlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBFVkVOVFMgQU5EIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czpcblxuICAgICdjbGljayAjcHVibGlzaCcgOiAncHVibGlzaEhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mby10aXBfX2Nsb3NlJyA6ICdoaWRlVGlwcydcblxuICAgICdjbGljayAjYmVnaW5CdXR0b24nIDogJ2JlZ2luSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvIC5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJyA6ICdhY2NvcmRpYW5DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmVkaXQtYnV0dG9uJyA6ICdlZGl0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgIyAnY2xpY2sgLnN0ZXAtaW5mby10aXAnIDogJ2hpZGVUaXBzJ1xuXG4gIHN1YnNjcmlwdGlvbnM6IFxuXG4gICAgJ3RpcHM6aGlkZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnZGF0ZTpjaGFuZ2UnIDogJ2lzSW50cm9WYWxpZCdcblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgc3RlcElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc3RlcC1pZCcpXG5cbiAgICBpZiBzdGVwSWRcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0Jywgc3RlcElkKVxuXG4gIHN0ZXBJZDogLT5cblxuICAgIHJldHVybiBAbW9kZWwuYXR0cmlidXRlcy5pZFxuXG5cbiAgdmFsaWRhdGVEYXRlczogLT5cblxuICAgIHVubGVzcyBAaXNGaXJzdFN0ZXAgb3IgQGlzTGFzdFN0ZXBcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBkYXRlc0FyZVZhbGlkID0gZmFsc2VcblxuICAgICMgaWYgJCgnI3Rlcm1TdGFydERhdGUnKS52YWwgIT0gJycgJiYgJCgnI3Rlcm1FbmREYXRlJykudmFsICE9ICcnICYmICQoJyNjb3Vyc2VTdGFydERhdGUnKS52YWwgIT0gJycgJiYgJCgnI2NvdXJzZUVuZERhdGUnKS52YWwgIT0gJydcbiAgICAjICAgZGF0ZXNBcmVWYWxpZCA9IHRydWVcblxuICAgIGlmIFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuc3RhcnRfZGF0ZSAhPSAnJyBhbmQgV2l6YXJkU3RlcElucHV0cy5jb3Vyc2VfZGV0YWlscy5lbmRfZGF0ZSAhPSAnJ1xuICAgICAgZGF0ZXNBcmVWYWxpZCA9IHRydWVcblxuICAgIHJldHVybiBkYXRlc0FyZVZhbGlkXG5cblxuICBhY2NvcmRpYW5DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHRhcmdldC50b2dnbGVDbGFzcygnb3BlbicpXG5cblxuICBwdWJsaXNoSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3dpemFyZDpwdWJsaXNoJylcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEB0aXBWaXNpYmxlID0gZmFsc2VcblxuICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdmaXJzdCcpXG5cbiAgICBlbHNlIGlmIEBpc0xhc3RTdGVwXG5cbiAgICAgIEBfcmVuZGVyU3RlcFR5cGUoJ2xhc3QnKVxuICAgICAgXG4gICAgZWxzZVxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdzdGFuZGFyZCcpXG5cbiAgICBAX3JlbmRlcklucHV0c0FuZEluZm8oKVxuXG4gICAgcmV0dXJuIEBhZnRlclJlbmRlcigpXG5cblxuICBfcmVuZGVyU3RlcFR5cGU6ICh0eXBlKSAtPlxuXG4gICAgaWYgdHlwZSBpcyAnc3RhbmRhcmQnXG5cbiAgICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgIGVsc2UgaWYgdHlwZSBpcyAnZmlyc3QnIG9yIHR5cGUgaXMgJ2xhc3QnXG5cbiAgICAgIGlmIHR5cGUgaXMgJ2ZpcnN0J1xuXG4gICAgICAgIEAkZWwuYWRkQ2xhc3MoJ3N0ZXAtLWZpcnN0JykuaHRtbCggQGludHJvVGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG4gICAgICAgIGRhdGVUaXRsZSA9ICdDb3Vyc2UgZGF0ZXMnXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbiA9IEAkZWwuZmluZCgnYSNiZWdpbkJ1dHRvbicpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAJGVsLmFkZENsYXNzKCdzdGVwLS1sYXN0JykuaHRtbCggQHRlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgICAgICBkYXRlVGl0bGUgPSAnQXNzaWdubWVudCB0aW1lbGluZSdcblxuXG4gICAgICAkZGF0ZXMgPSAkKEBkYXRlc01vZHVsZSh7dGl0bGU6IGRhdGVUaXRsZX0pKVxuXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1kYXRlcycpLmh0bWwoJGRhdGVzKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIF9yZW5kZXJJbnB1dHNBbmRJbmZvOiAtPlxuXG4gICAgQGlucHV0U2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1pbm5lcicpXG5cbiAgICBAJHRpcFNlY3Rpb24gPSBAJGVsLmZpbmQoJy5zdGVwLWluZm8tdGlwcycpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZydcblxuICAgICAgcGF0aHdheXMgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzXG5cbiAgICAgIG51bWJlck9mUGF0aHdheXMgPSBwYXRod2F5cy5sZW5ndGhcblxuICAgICAgaWYgbnVtYmVyT2ZQYXRod2F5cyA+IDFcblxuICAgICAgICBkaXN0cmlidXRlZFZhbHVlID0gTWF0aC5mbG9vcigxMDAvbnVtYmVyT2ZQYXRod2F5cylcblxuICAgICAgICBAaW5wdXREYXRhID0gW11cblxuICAgICAgICBfLmVhY2gocGF0aHdheXMsIChwYXRod2F5KSA9PlxuXG4gICAgICAgICAgZ3JhZGluZ0RhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVtwYXRod2F5XVxuXG4gICAgICAgICAgXy5lYWNoKGdyYWRpbmdEYXRhLCAoZ3JhZGVJdGVtKSA9PlxuXG4gICAgICAgICAgICBncmFkZUl0ZW0udmFsdWUgPSBkaXN0cmlidXRlZFZhbHVlXG5cbiAgICAgICAgICAgIEBpbnB1dERhdGEucHVzaCBncmFkZUl0ZW1cblxuICAgICAgICAgIClcblxuICAgICAgICApXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAaW5wdXREYXRhID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuYXR0cmlidXRlcy5pZF1bcGF0aHdheXNbMF1dIHx8IFtdXG5cbiAgICBlbHNlXG5cbiAgICAgIEBpbnB1dERhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXSB8fCBbXVxuXG5cbiAgICBfLmVhY2goQGlucHV0RGF0YSwgKGlucHV0LCBpbmRleCkgPT5cblxuICAgICAgdW5sZXNzIGlucHV0LnR5cGUgXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIGlucHV0LnNlbGVjdGVkICYmIGlucHV0LnJlcXVpcmVkXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC5zZWxlY3RlZCBcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnJlcXVpcmVkIGlzIGZhbHNlXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC50eXBlIGlzICdwZXJjZW50J1xuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cblxuICAgICAgaW5wdXRWaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ldyBCYWNrYm9uZS5Nb2RlbChpbnB1dClcblxuICAgICAgKVxuXG4gICAgICBpbnB1dFZpZXcuaW5wdXRUeXBlID0gaW5wdXQudHlwZVxuXG4gICAgICBpbnB1dFZpZXcuaXRlbUluZGV4ID0gaW5kZXhcblxuICAgICAgaW5wdXRWaWV3LnBhcmVudFN0ZXAgPSBAXG5cbiAgICAgIEBpbnB1dFNlY3Rpb24uYXBwZW5kKGlucHV0Vmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgaW5wdXQudGlwSW5mb1xuXG4gICAgICAgIHRpcCA9IFxuXG4gICAgICAgICAgaWQ6IGluZGV4XG5cbiAgICAgICAgICB0aXRsZTogaW5wdXQudGlwSW5mby50aXRsZVxuXG4gICAgICAgICAgY29udGVudDogaW5wdXQudGlwSW5mby5jb250ZW50XG5cbiAgICAgICAgJHRpcEVsID0gQHRpcFRlbXBsYXRlKHRpcClcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuaGFzQ291cnNlSW5mb1xuXG4gICAgICAgIGluZm9EYXRhID0gXy5leHRlbmQoQGNvdXJzZUluZm9EYXRhW2lucHV0LmlkXSwge2lkOiBpbmRleH0gKVxuXG4gICAgICAgICR0aXBFbCA9IEBjb3Vyc2VJbmZvVGVtcGxhdGUoaW5mb0RhdGEpXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRpbnB1dENvbnRhaW5lcnMgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnIHx8IEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIEBncmFkaW5nVmlldyA9IG5ldyBHcmFkaW5nSW5wdXRWaWV3KClcblxuICAgICAgQGdyYWRpbmdWaWV3LnBhcmVudFN0ZXBWaWV3ID0gQFxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tY29udGVudCcpLmFwcGVuZChAZ3JhZGluZ1ZpZXcuZ2V0SW5wdXRWYWx1ZXMoKS5yZW5kZXIoKS5lbClcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdvdmVydmlldydcblxuICAgICAgJGlubmVyRWwgPSBAJGVsLmZpbmQoJy5zdGVwLWZvcm0taW5uZXInKVxuXG4gICAgICAkaW5uZXJFbC5odG1sKCcnKVxuXG4gICAgICBAb3ZlcnZpZXdWaWV3ID0gbmV3IE92ZXJ2aWV3VmlldyhcbiAgICAgICAgZWw6ICRpbm5lckVsXG4gICAgICApXG5cbiAgICAgIEBvdmVydmlld1ZpZXcucGFyZW50U3RlcFZpZXcgPSBAXG5cbiAgICAgIEBvdmVydmlld1ZpZXcucmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuICBoaWRlOiAtPlxuXG4gICAgQCRlbC5oaWRlKClcblxuICAgIHJldHVybiBAXG5cblxuICBzaG93OiAtPlxuXG4gICAgJCgnYm9keSwgaHRtbCcpLmFuaW1hdGUoXG4gICAgICBzY3JvbGxUb3A6IDBcbiAgICAsMSlcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdvdmVydmlldycgfHwgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnb3ZlcnZpZXcnXG5cbiAgICAgIEByZW5kZXIoKS4kZWwuc2hvdygpXG5cbiAgICAgIGFwcGxpY2F0aW9uLmhvbWVWaWV3LnRpbWVsaW5lVmlldy51cGRhdGUoKVxuXG4gICAgZWxzZSBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZycgfHwgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnZ3JhZGluZydcblxuICAgICAgQHJlbmRlcigpLiRlbC5zaG93KClcblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5zaG93KClcblxuICAgIEBoYXNVc2VyVmlzaXRlZCA9IHRydWVcblxuICAgIHJldHVybiBAXG5cblxuICBiZWdpbkhhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG4gIHVwZGF0ZVVzZXJIYXNBbnN3ZXJlZDogKGlkLCB2YWx1ZSwgdHlwZSkgLT5cblxuXG4gICAgaW5wdXRJdGVtcyA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVxuXG4gICAgcmVxdWlyZWRTZWxlY3RlZCA9IGZhbHNlXG5cbiAgICBpZiB0eXBlIGlzICdwZXJjZW50J1xuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICByZXR1cm4gQFxuXG4gICAgXy5lYWNoKGlucHV0SXRlbXMsIChpdGVtKSA9PlxuXG4gICAgICBpZiBpdGVtLnR5cGUgaXMgJ2NoZWNrYm94J1xuXG4gICAgICAgIGlmIGl0ZW0uaWdub3JlVmFsaWRhdGlvblxuXG4gICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIGlmIGl0ZW0ucmVxdWlyZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgaWYgaXRlbS5zZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgIClcblxuICAgIGlmIHJlcXVpcmVkU2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICdyYWRpb0dyb3VwJyBvciB0eXBlIGlzICdyYWRpb0JveCdcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgIGVsc2UgaWYgdHlwZSBpcyAndGV4dCdcblxuICAgICAgaWYgQGlzRmlyc3RTdGVwXG5cbiAgICAgICAgXy5lYWNoKGlucHV0SXRlbXMsIChpdGVtKSA9PlxuXG4gICAgICAgICAgaWYgaXRlbS50eXBlIGlzICd0ZXh0J1xuXG4gICAgICAgICAgICBpZiBpdGVtLnJlcXVpcmVkIGlzIHRydWVcblxuICAgICAgICAgICAgICBpZiBpdGVtLnZhbHVlICE9ICcnXG5cbiAgICAgICAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgICAgICAgIGVsc2UgXG5cbiAgICAgICAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gZmFsc2VcblxuICAgICAgICApXG5cbiAgICAgICAgaWYgcmVxdWlyZWRTZWxlY3RlZFxuXG4gICAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IGZhbHNlXG5cbiAgICAgICAgQGlzSW50cm9WYWxpZCgpXG5cbiAgICBlbHNlIFxuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gZmFsc2VcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6YW5zd2VyZWQnLCBAKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGlzSW50cm9WYWxpZDogLT5cblxuICAgIHVubGVzcyBAaXNGaXJzdFN0ZXAgb3IgQGlzTGFzdFN0ZXBcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgaWYgQGhhc1VzZXJBbnN3ZXJlZCBhbmQgQHZhbGlkYXRlRGF0ZXMoKVxuXG4gICAgICAgIEAkYmVnaW5CdXR0b24ucmVtb3ZlQ2xhc3MoJ2luYWN0aXZlJylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEAkYmVnaW5CdXR0b24uYWRkQ2xhc3MoJ2luYWN0aXZlJylcblxuXG4gIHVwZGF0ZVJhZGlvQW5zd2VyOiAoaWQsIGluZGV4LCB2YWx1ZSkgLT5cblxuICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udHlwZSBcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3B0aW9uc1tpbmRleF0uc2VsZWN0ZWQgPSB2YWx1ZVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS52YWx1ZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3B0aW9uc1tpbmRleF0udmFsdWVcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3ZlcnZpZXdMYWJlbCA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0ub3B0aW9uc1tpbmRleF0ub3ZlcnZpZXdMYWJlbFxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IGluZGV4XG5cblxuXG4gIHVwZGF0ZUFuc3dlcjogKGlkLCB2YWx1ZSwgaGFzUGF0aHdheSwgcGF0aHdheSkgLT5cblxuICAgIGlmIGhhc1BhdGh3YXlcblxuICAgICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS50eXBlIFxuXG4gICAgICBpc0V4Y2x1c2l2ZSA9IGZhbHNlXG5cbiAgICBlbHNlXG5cbiAgICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udHlwZSBcblxuICAgICAgaXNFeGNsdXNpdmUgPSBmYWxzZSB8fCBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLmV4Y2x1c2l2ZSBcblxuXG4gICAgaGFzRXhjbHVzaXZlU2libGluZyA9IGZhbHNlXG5cbiAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdLCAoaW5wdXRJdGVtKSA9PlxuXG4gICAgICBpZiBpbnB1dEl0ZW0uZXhjbHVzaXZlXG5cbiAgICAgICAgaGFzRXhjbHVzaXZlU2libGluZyA9IHRydWVcblxuICAgIClcblxuICAgIG91dCA9IFxuXG4gICAgICB0eXBlOiBpbnB1dFR5cGVcblxuICAgICAgaWQ6IGlkXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgaWYgaW5wdXRUeXBlID09ICdyYWRpb0JveCcgfHwgaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgaWYgdmFsdWUgPT0gJ29uJ1xuXG4gICAgICAgIGlmIGhhc1BhdGh3YXlcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtwYXRod2F5XVtpZF0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBpZiBoYXNFeGNsdXNpdmVTaWJsaW5nICYmICFpc0V4Y2x1c2l2ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBlbHNlIGlmIGlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94Jykubm90KCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBpZiBAbW9kZWwuaWQgaXMgJ2Fzc2lnbm1lbnRfc2VsZWN0aW9uJ1xuICAgICAgICAgIFxuICAgICAgICAgIGFwcGxpY2F0aW9uLmhvbWVWaWV3LnVwZGF0ZVNlbGVjdGVkUGF0aHdheSgnYWRkJywgaWQpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBpZiBoYXNQYXRod2F5XG5cbiAgICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnNlbGVjdGVkID0gZmFsc2VcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gZmFsc2VcblxuICAgICAgICBpZiBoYXNFeGNsdXNpdmVTaWJsaW5nICYmICFpc0V4Y2x1c2l2ZVxuXG4gICAgICAgICAgYWxsT3RoZXJzRGlzZW5nYWdlZCA9IHRydWVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKS5lYWNoKC0+XG5cbiAgICAgICAgICAgIGlmICEkKHRoaXMpLmF0dHIoJ2RhdGEtZXhjbHVzaXZlJykgJiYgJCh0aGlzKS5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICAgICAgICAgYWxsT3RoZXJzRGlzZW5nYWdlZCA9IGZhbHNlXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICBpZiBhbGxPdGhlcnNEaXNlbmdhZ2VkXG5cbiAgICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykucmVtb3ZlQ2xhc3MoJ25vdC1lZGl0YWJsZScpLmFkZENsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykuYWRkQ2xhc3MoJ25vdC1lZGl0YWJsZScpLnJlbW92ZUNsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgZWxzZSBpZiBpc0V4Y2x1c2l2ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpLm5vdCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykucmVtb3ZlQ2xhc3MoJ25vdC1lZGl0YWJsZScpLmFkZENsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgaWYgQG1vZGVsLmlkIGlzICdhc3NpZ25tZW50X3NlbGVjdGlvbidcbiAgICAgICAgICBcbiAgICAgICAgICBhcHBsaWNhdGlvbi5ob21lVmlldy51cGRhdGVTZWxlY3RlZFBhdGh3YXkoJ3JlbW92ZScsIGlkKVxuXG4gICAgZWxzZSBpZiBpbnB1dFR5cGUgPT0gJ3RleHQnIHx8IGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtwYXRod2F5XVtpZF0udmFsdWUgPSB2YWx1ZVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS52YWx1ZSA9IHZhbHVlXG5cblxuICAgIHJldHVybiBAXG5cblxuICBoaWRlVGlwczogKGUpIC0+XG5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuXG5cblxuICAgIFxuICAgIFxuXG4gXG5cbiIsIlxuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5EZXRhaWxzVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMnKVxuXG5HcmFkaW5nVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdUZW1wbGF0ZS5oYnMnKVxuXG5HcmFkaW5nQ3VzdG9tVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdBbHRUZW1wbGF0ZS5oYnMnKVxuXG5PcHRpb25zVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZU9wdGlvbnNUZW1wbGF0ZS5oYnMnKVxuXG5XaXphcmREYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFRpbWVsaW5lVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXcgXG5cbiAgZWw6ICQoJy5mb3JtLWNvbnRhaW5lcicpXG5cbiAgd2lraVNwYWNlOiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319PGJyLz4nXG5cbiAgd2lraU5vQ2xhc3M6ICdOTyBDTEFTUyBXRUVLIE9GICdcblxuICBsb25nZXN0Q291cnNlTGVuZ3RoOiAxNlxuXG4gIHNob3J0ZXN0Q291cnNlTGVuZ3RoOiA2XG5cbiAgZGVmYXVsdENvdXJzZUxlbmd0aDogMTZcblxuICBkZWZhdWx0RW5kRGF0ZXM6IFsnMDYtMzAnLCAnMTItMzEnXVxuXG4gIGN1cnJlbnRCbGFja291dERhdGVzOiBbXVxuXG4gIGxlbmd0aDogMFxuXG4gIGFjdHVhbExlbmd0aDogMFxuXG4gIHdlZWtseURhdGVzOiBbXVxuXG4gIHdlZWtseVN0YXJ0RGF0ZXM6IFtdXG5cbiAgdG90YWxCbGFja291dFdlZWtzOiAwXG5cbiAgZGF5c1NlbGVjdGVkOiBbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdXG5cbiAgc3RhcnRfZGF0ZTpcbiAgICB2YWx1ZTogJydcblxuICBlbmRfZGF0ZTpcbiAgICB2YWx1ZTogJydcblxuICB0ZXJtX3N0YXJ0X2RhdGU6XG4gICAgdmFsdWU6ICcnXG5cbiAgdGVybV9lbmRfZGF0ZTpcbiAgICB2YWx1ZTogJydcblxuICBpbml0aWFsaXplOiAtPlxuICBcbiAgICAkKCdpbnB1dFt0eXBlPVwiZGF0ZVwiXScpLmRhdGVwaWNrZXIoXG5cbiAgICAgIGRhdGVGb3JtYXQ6ICd5eS1tbS1kZCdcblxuICAgICAgY29uc3RyYWluSW5wdXQ6IHRydWVcblxuICAgICAgZmlyc3REYXk6IDFcblxuICAgICkucHJvcCgndHlwZScsJ3RleHQnKVxuXG4gICAgQCRibGFja291dERhdGVzID0gJCgnI2JsYWNrb3V0RGF0ZXMnKVxuXG4gICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoXG5cbiAgICAgIGRhdGVGb3JtYXQ6ICd5eS1tbS1kZCdcblxuICAgICAgZmlyc3REYXk6IDFcblxuICAgICAgYWx0RmllbGQ6ICcjYmxhY2tvdXREYXRlc0ZpZWxkJ1xuXG4gICAgICBvblNlbGVjdDogPT5cblxuICAgICAgICBAY3VycmVudEJsYWNrb3V0RGF0ZXMgPSBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcignZ2V0RGF0ZXMnKVxuXG4gICAgICAgIEB1cGRhdGVUaW1lbGluZSgpXG4gICAgKVxuXG4gICAgQCRzdGFydFdlZWtPZkRhdGUgPSAkKCcjc3RhcnRXZWVrT2ZEYXRlJylcblxuICAgIEAkY291cnNlU3RhcnREYXRlID0gJCgnI2NvdXJzZVN0YXJ0RGF0ZScpXG5cbiAgICBAJGNvdXJzZUVuZERhdGUgPSAkKCcjY291cnNlRW5kRGF0ZScpXG5cbiAgICBAJHRlcm1TdGFydERhdGUgPSAkKCcjdGVybVN0YXJ0RGF0ZScpXG5cbiAgICBAJHRlcm1FbmREYXRlID0gICAkKCcjdGVybUVuZERhdGUnKVxuXG4gICAgQCRvdXRDb250YWluZXIgPSAkKCcub3V0cHV0LWNvbnRhaW5lcicpXG5cbiAgICBAJHByZXZpZXdDb250YWluZXIgPSAkKCcucHJldmlldy1jb250YWluZXInKVxuXG4gICAgQGRhdGEgPSBbXVxuXG4gICAgQGRhdGEgPSBhcHBsaWNhdGlvbi50aW1lbGluZURhdGFcblxuICAgIEBkYXRhQWx0ID0gYXBwbGljYXRpb24udGltZWxpbmVEYXRhQWx0XG5cbiAgICAkKCcjdGVybVN0YXJ0RGF0ZScpLm9uICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgIEBjaGFuZ2VUZXJtU3RhcnQoZSlcblxuICAgICQoJyN0ZXJtRW5kRGF0ZScpLm9uICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgIEBjaGFuZ2VUZXJtRW5kKGUpXG5cbiAgICAkKCcjY291cnNlU3RhcnREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZUNvdXJzZVN0YXJ0KGUpXG5cbiAgICAkKCcjY291cnNlRW5kRGF0ZScpLm9uICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgIEBjaGFuZ2VDb3Vyc2VFbmQoZSlcblxuICAgICQoJy5kb3dDaGVja2JveCcpLm9uICdjaGFuZ2UnLCAoZSkgPT5cbiAgICAgIEBvbkRvd1NlbGVjdChlKVxuXG4gICAgJCgnI3Rlcm1TdGFydERhdGUnKS5vbiAnZm9jdXMnLCAoZSkgPT5cbiAgICAgICQoJ2JvZHksaHRtbCcpLmFuaW1hdGUoXG4gICAgICAgIHNjcm9sbFRvcDogJCgnI3Rlcm1TdGFydERhdGUnKS5vZmZzZXQoKS50b3AgLSAzNTBcbiAgICAgICwgNDAwKVxuXG4gICAgQHVwZGF0ZSgpXG5cbiAgb25Eb3dTZWxlY3Q6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgZG93ID0gJHRhcmdldC5hdHRyKCdpZCcpXG5cbiAgICBkb3dJZCA9IHBhcnNlSW50KCR0YXJnZXQudmFsKCkpXG5cbiAgICBpZiAkdGFyZ2V0LmlzKCc6Y2hlY2tlZCcpXG5cbiAgICAgIEBkYXlzU2VsZWN0ZWRbZG93SWRdID0gdHJ1ZVxuXG4gICAgZWxzZVxuXG4gICAgICBAZGF5c1NlbGVjdGVkW2Rvd0lkXSA9IGZhbHNlXG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLndlZWtkYXlzX3NlbGVjdGVkID0gQGRheXNTZWxlY3RlZFxuXG4gICAgaWYgQHN0YXJ0X2RhdGUudmFsdWUgIT0gJycgJiYgQGVuZF9kYXRlLnZhbHVlICE9ICcnXG4gICAgICBpZiBfLmluZGV4T2YoQGRheXNTZWxlY3RlZCwgdHJ1ZSkgIT0gLTFcbiAgICAgICAgJCgnLmJsYWNrb3V0RGF0ZXMtd3JhcHBlcicpLmFkZENsYXNzKCdvcGVuJylcbiAgICAgIGVsc2VcbiAgICAgICAgJCgnLmJsYWNrb3V0RGF0ZXMtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdvcGVuJylcbiAgICBlbHNlXG5cbiAgICAgICQoJy5ibGFja291dERhdGVzLXdyYXBwZXInKS5yZW1vdmVDbGFzcygnb3BlbicpXG5cbiAgICBAdXBkYXRlVGltZWxpbmUoKVxuXG5cbiAgY2hhbmdlVGVybVN0YXJ0OiAoZSkgLT5cblxuICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpIHx8ICcnXG5cbiAgICBpZiB2YWx1ZSBpcyAnJ1xuXG4gICAgICBAdGVybV9lbmRfZGF0ZSA9XG5cbiAgICAgICAgdmFsdWU6ICcnXG5cbiAgICAgIHJldHVybiBcblxuICAgIGRhdGVNb21lbnQgPSBtb21lbnQodmFsdWUpXG5cbiAgICBkYXRlID0gZGF0ZU1vbWVudC50b0RhdGUoKVxuXG4gICAgQHRlcm1fc3RhcnRfZGF0ZSA9IFxuXG4gICAgICBtb21lbnQ6IGRhdGVNb21lbnRcblxuICAgICAgZGF0ZTogZGF0ZVxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuICAgICAgd2VlazogZGF0ZU1vbWVudC53ZWVrKClcblxuICAgICAgd2Vla2RheTogXG5cbiAgICAgICAgbW9tZW50OiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMClcblxuICAgICAgICBkYXRlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkudG9EYXRlKClcblxuICAgICAgICB2YWx1ZTogZGF0ZU1vbWVudC53ZWVrKGRhdGVNb21lbnQud2VlaygpKS53ZWVrZGF5KDApLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICB5ZWFyTW9kID0gMFxuXG4gICAgaWYgQHRlcm1fc3RhcnRfZGF0ZS53ZWVrIGlzIDFcblxuICAgICAgeWVhck1vZCA9IDFcblxuICAgIGlzQWZ0ZXIgPSBkYXRlTW9tZW50LmlzQWZ0ZXIoXCIje2RhdGVNb21lbnQueWVhcigpK3llYXJNb2R9LTA2LTAxXCIpXG5cbiAgICBpZiBpc0FmdGVyXG5cbiAgICAgIGVuZERhdGVTdHJpbmcgPSBcIiN7ZGF0ZU1vbWVudC55ZWFyKCl9LSN7QGRlZmF1bHRFbmREYXRlc1sxXX1cIlxuXG4gICAgZWxzZVxuXG4gICAgICBlbmREYXRlU3RyaW5nID0gXCIje2RhdGVNb21lbnQueWVhcigpK3llYXJNb2R9LSN7QGRlZmF1bHRFbmREYXRlc1swXX1cIlxuXG4gICAgaWYgaXNBZnRlclxuXG4gICAgICBpc0Z1bGxXaWR0aENvdXJzZSA9IDUzIC0gQHRlcm1fc3RhcnRfZGF0ZS53ZWVrID4gQGRlZmF1bHRDb3Vyc2VMZW5ndGhcblxuICAgIGVsc2VcblxuICAgICAgaXNGdWxsV2lkdGhDb3Vyc2UgPSBtb21lbnQoZW5kRGF0ZVN0cmluZykud2VlaygpIC0gQHRlcm1fc3RhcnRfZGF0ZS53ZWVrID4gQGRlZmF1bHRDb3Vyc2VMZW5ndGhcblxuXG4gICAgQCR0ZXJtRW5kRGF0ZS52YWwoZW5kRGF0ZVN0cmluZykudHJpZ2dlcignY2hhbmdlJylcblxuICAgIEAkY291cnNlU3RhcnREYXRlLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGlmIGlzRnVsbFdpZHRoQ291cnNlIFxuXG4gICAgICBkZWZhdWx0RW5kRGF0ZSA9IG1vbWVudCh2YWx1ZSkudG9EYXRlKClcblxuICAgICAgZGVmYXVsdEVuZERhdGUuc2V0RGF0ZSg3KkBkZWZhdWx0Q291cnNlTGVuZ3RoKVxuXG4gICAgICBAJGNvdXJzZUVuZERhdGUudmFsKG1vbWVudChkZWZhdWx0RW5kRGF0ZSkuZm9ybWF0KCdZWVlZLU1NLUREJykpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkY291cnNlRW5kRGF0ZS52YWwoZW5kRGF0ZVN0cmluZykudHJpZ2dlcignY2hhbmdlJylcblxuICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdyZXNldERhdGVzJywgJ3BpY2tlZCcpXG5cbiAgICByZXR1cm5cblxuICBjaGFuZ2VUZXJtRW5kOiAoZSkgLT5cblxuICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpIHx8ICcnXG5cbiAgICBpZiB2YWx1ZSBpcyAnJ1xuXG4gICAgICBAdGVybV9zdGFydF9kYXRlID1cblxuICAgICAgICB2YWx1ZTogJydcblxuICAgICAgcmV0dXJuIFxuXG4gICAgZGF0ZU1vbWVudCA9IG1vbWVudCh2YWx1ZSlcblxuICAgIGRhdGUgPSBkYXRlTW9tZW50LnRvRGF0ZSgpXG5cbiAgICBAdGVybV9lbmRfZGF0ZSA9IFxuXG4gICAgICBtb21lbnQ6IGRhdGVNb21lbnRcblxuICAgICAgZGF0ZTogZGF0ZVxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuICAgICAgd2VlazogZGF0ZU1vbWVudC53ZWVrKClcblxuICAgICAgd2Vla2RheTogXG5cbiAgICAgICAgbW9tZW50OiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMClcblxuICAgICAgICBkYXRlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkudG9EYXRlKClcblxuICAgICAgICB2YWx1ZTogZGF0ZU1vbWVudC53ZWVrKGRhdGVNb21lbnQud2VlaygpKS53ZWVrZGF5KDApLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICBAJGNvdXJzZUVuZERhdGUudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ3Jlc2V0RGF0ZXMnLCAncGlja2VkJylcblxuICAgIHJldHVyblxuXG4gIGNoYW5nZUNvdXJzZVN0YXJ0OiAoZSkgLT5cblxuICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpIHx8ICcnXG5cbiAgICBpZiB2YWx1ZSBpcyAnJ1xuXG4gICAgICBAc3RhcnRfZGF0ZSA9XG5cbiAgICAgICAgdmFsdWU6ICcnXG5cbiAgICAgIEAkY291cnNlRW5kRGF0ZS52YWwoJycpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEB1cGRhdGVNdWx0aURhdGVQaWNrZXIoKVxuXG4gICAgICByZXR1cm4gQHVwZGF0ZVRpbWVsaW5lIFxuXG4gICAgZGF0ZU1vbWVudCA9IG1vbWVudCh2YWx1ZSlcblxuICAgIGRhdGUgPSBkYXRlTW9tZW50LnRvRGF0ZSgpXG5cbiAgICBAc3RhcnRfZGF0ZSA9IFxuXG4gICAgICBtb21lbnQ6IGRhdGVNb21lbnRcblxuICAgICAgZGF0ZTogZGF0ZVxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuICAgICAgd2VlazogZGF0ZU1vbWVudC53ZWVrKClcblxuICAgICAgd2Vla2RheTogXG5cbiAgICAgICAgbW9tZW50OiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMClcblxuICAgICAgICBkYXRlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkudG9EYXRlKClcblxuICAgICAgICB2YWx1ZTogZGF0ZU1vbWVudC53ZWVrKGRhdGVNb21lbnQud2VlaygpKS53ZWVrZGF5KDApLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICB5ZWFyTW9kID0gMFxuXG4gICAgaWYgQHN0YXJ0X2RhdGUud2VlayBpcyAxXG5cbiAgICAgIHllYXJNb2QgPSAxXG5cbiAgICBpc0FmdGVyID0gZGF0ZU1vbWVudC5pc0FmdGVyKFwiI3tkYXRlTW9tZW50LnllYXIoKSt5ZWFyTW9kfS0wNi0wMVwiKVxuXG4gICAgaWYgaXNBZnRlclxuXG4gICAgICBlbmREYXRlU3RyaW5nID0gXCIje2RhdGVNb21lbnQueWVhcigpfS0je0BkZWZhdWx0RW5kRGF0ZXNbMV19XCJcblxuICAgIGVsc2VcblxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKSt5ZWFyTW9kfS0je0BkZWZhdWx0RW5kRGF0ZXNbMF19XCJcblxuICAgIEAkY291cnNlRW5kRGF0ZS52YWwoZW5kRGF0ZVN0cmluZykudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGlmIEB0ZXJtX3N0YXJ0X2RhdGUudmFsdWUgaXMgJydcbiAgICAgIEAkdGVybVN0YXJ0RGF0ZS52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBAdXBkYXRlTXVsdGlEYXRlUGlja2VyKClcblxuICAgIEB1cGRhdGVUaW1lbGluZSgpXG5cbiAgICByZXR1cm4gZmFsc2VcblxuXG4gIGNoYW5nZUNvdXJzZUVuZDogKGUpIC0+XG5cbiAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoKSB8fCAnJ1xuXG4gICAgaWYgdmFsdWUgaXMgJydcbiAgICAgIEBlbmRfZGF0ZSA9XG4gICAgICAgIHZhbHVlOiAnJ1xuXG4gICAgICBAdXBkYXRlTXVsdGlEYXRlUGlja2VyKClcblxuICAgICAgQHVwZGF0ZVRpbWVsaW5lKClcblxuICAgICAgcmV0dXJuIEB1cGRhdGVUaW1lbGluZSBcblxuICAgIGRhdGVNb21lbnQgPSBtb21lbnQodmFsdWUpXG5cbiAgICBkYXRlID0gZGF0ZU1vbWVudC50b0RhdGUoKVxuXG4gICAgQGVuZF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIEB1cGRhdGVNdWx0aURhdGVQaWNrZXIoKVxuXG4gICAgQHVwZGF0ZVRpbWVsaW5lKClcblxuICAgIHJldHVybiBmYWxzZVxuXG4gIHVwZGF0ZU11bHRpRGF0ZVBpY2tlcjogLT5cblxuXG4gICAgaWYgQHN0YXJ0X2RhdGUudmFsdWUgIT0gJycgJiYgQGVuZF9kYXRlLnZhbHVlICE9ICcnXG5cbiAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdkZXN0cm95JylcblxuICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoXG5cbiAgICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICAgIGZpcnN0RGF5OiAxXG5cbiAgICAgICAgYWx0RmllbGQ6ICcjYmxhY2tvdXREYXRlc0ZpZWxkJ1xuXG4gICAgICAgIGRlZmF1bHREYXRlOiBAc3RhcnRfZGF0ZS53ZWVrZGF5LnZhbHVlXG5cbiAgICAgICAgbWluRGF0ZTogQHN0YXJ0X2RhdGUud2Vla2RheS52YWx1ZVxuXG4gICAgICAgIG1heERhdGU6IEBlbmRfZGF0ZS52YWx1ZVxuXG4gICAgICAgIG9uU2VsZWN0OiA9PlxuXG4gICAgICAgICAgQGN1cnJlbnRCbGFja291dERhdGVzID0gQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ2dldERhdGVzJylcblxuICAgICAgICAgIEB1cGRhdGVUaW1lbGluZSgpXG4gICAgICApXG5cbiAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdyZXNldERhdGVzJywgJ3BpY2tlZCcpXG5cbiAgICAgIGlmIEBjdXJyZW50QmxhY2tvdXREYXRlcy5sZW5ndGggPiAwXG5cbiAgICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ2FkZERhdGVzJywgQGN1cnJlbnRCbGFja291dERhdGVzKVxuXG4gICAgZWxzZSBcblxuICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ2Rlc3Ryb3knKVxuXG4gICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcihcblxuICAgICAgICBkYXRlRm9ybWF0OiAneXktbW0tZGQnXG5cbiAgICAgICAgZmlyc3REYXk6IDFcblxuICAgICAgICBhbHRGaWVsZDogJyNibGFja291dERhdGVzRmllbGQnXG5cbiAgICAgICAgb25TZWxlY3Q6ID0+XG5cbiAgICAgICAgICBAY3VycmVudEJsYWNrb3V0RGF0ZXMgPSBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcignZ2V0RGF0ZXMnKVxuXG4gICAgICAgICAgQHVwZGF0ZVRpbWVsaW5lKClcbiAgICAgIClcblxuICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ3Jlc2V0RGF0ZXMnLCAncGlja2VkJylcblxuXG5cblxuICB1cGRhdGVUaW1lbGluZTogLT5cblxuICAgIEB3ZWVrbHlTdGFydERhdGVzID0gW11cblxuICAgIEB3ZWVrbHlEYXRlcyA9IFtdIFxuXG4gICAgQG91dCA9IFtdXG5cbiAgICBAb3V0V2lraSA9IFtdXG5cbiAgICBpZiBAc3RhcnRfZGF0ZS52YWx1ZSAhPSAnJyAmJiBAZW5kX2RhdGUudmFsdWUgIT0gJydcblxuXG4gICAgICAjZGlmZmVyZW5jZSBpbiB3ZWVrcyBiZXR3ZWVuIHNlbGVjdGVkIHN0YXJ0IGFuZCBlbmQgZGF0ZXNcbiAgICAgIGRpZmYgPSBAZ2V0V2Vla3NEaWZmKEBzdGFydF9kYXRlLndlZWtkYXkubW9tZW50LCBAZW5kX2RhdGUud2Vla2RheS5tb21lbnQpXG5cbiAgICAgICNhY3R1YWwgbGVuZmd0aCBpcyB0aGUgYWN0dWFsIG51bWJlciBvZiB3ZWVrcyBiZXR3ZWVuIHRoZSBzdGFydCBhbmQgZW5kIGRhdGUgXG4gICAgICAjaWYgbGVzcyB0aGFuIDYgbWFrZSBpdCA2IHdlZWtzLCBpZiBtb3JlIHRoYW4gMTYsIG1ha2UgaXQgMTYgd2Vla3NcbiAgICAgIEBhY3R1YWxMZW5ndGggPSAxICsgZGlmZiBcblxuICAgICAgaWYgQGFjdHVhbExlbmd0aCA8IEBzaG9ydGVzdENvdXJzZUxlbmd0aFxuXG4gICAgICAgIEBsZW5ndGggPSBAc2hvcnRlc3RDb3Vyc2VMZW5ndGhcblxuICAgICAgZWxzZSBpZiBAYWN0dWFsTGVuZ3RoID4gQGxvbmdlc3RDb3Vyc2VMZW5ndGhcblxuICAgICAgICBAbGVuZ3RoID0gQGxvbmdlc3RDb3Vyc2VMZW5ndGhcblxuICAgICAgZWxzZSBcblxuICAgICAgICBAbGVuZ3RoID0gQGFjdHVhbExlbmd0aFxuXG4gICAgICAjbWFrZSBhbiBhcnJheSBvZiBhbGwgdGhlIG1vbmRheSB3ZWVrIHN0YXJ0IGRhdGVzIGFzIHN0cmluZ3NcbiAgICAgIEB3ZWVrbHlTdGFydERhdGVzID0gW11cblxuICAgICAgdyA9IDBcblxuICAgICAgd2hpbGUgdyA8IEBsZW5ndGhcblxuICAgICAgICBpZiB3IGlzIDBcblxuICAgICAgICAgIG5ld0RhdGUgPSBtb21lbnQoQHN0YXJ0X2RhdGUud2Vla2RheS5tb21lbnQpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgbmV3RGF0ZSA9IG1vbWVudChAc3RhcnRfZGF0ZS53ZWVrZGF5Lm1vbWVudCkud2VlayhAc3RhcnRfZGF0ZS53ZWVrK3cpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gICAgICAgIFxuICAgICAgICBAd2Vla2x5U3RhcnREYXRlcy5wdXNoKG5ld0RhdGUpXG5cbiAgICAgICAgdysrXG5cbiAgICAgIEB3ZWVrbHlEYXRlcyA9IFtdXG5cbiAgICAgIEB0b3RhbEJsYWNrb3V0V2Vla3MgPSAwXG5cblxuICAgICAgI21ha2UgYW4gb2JqZWN0IHRoYXQgbGlzdHMgb3V0IGVhY2ggd2VlayB3aXRoIGRhdGVzIGFuZCB3aGV0aGVyIG9yIG5vdCB0aGUgd2VlayBtZWV0cyBhbmQgd2hldGhlciBvciBub3QgZWFjaCBkYXkgbWVldHNcbiAgICAgIF8uZWFjaChAd2Vla2x5U3RhcnREYXRlcywgKHdlZWtkYXRlLCB3aSkgPT5cblxuICAgICAgICBkTW9tZW50ID0gbW9tZW50KHdlZWtkYXRlKVxuXG4gICAgICAgIHRvdGFsU2VsZWN0ZWQgPSAwXG5cbiAgICAgICAgdG90YWxCbGFja2VkT3V0ID0gMFxuXG4gICAgICAgIHRoaXNXZWVrID1cblxuICAgICAgICAgIHdlZWtTdGFydDogZE1vbWVudC5mb3JtYXQoJ1lZWVktTU0tREQnKVxuXG4gICAgICAgICAgY2xhc3NUaGlzV2VlazogdHJ1ZVxuXG4gICAgICAgICAgZGF0ZXM6IFtdXG5cbiAgICAgICAgICB3ZWVrSW5kZXg6IHdpIC0gQHRvdGFsQmxhY2tvdXRXZWVrc1xuXG5cbiAgICAgICAgXy5lYWNoKEBkYXlzU2VsZWN0ZWQsIChkYXksIGRpKSA9PlxuXG4gICAgICAgICAgaWYgZGF5IFxuXG4gICAgICAgICAgICBpc0NsYXNzID0gdHJ1ZVxuXG4gICAgICAgICAgICBkYXRlU3RyaW5nID0gZE1vbWVudC53ZWVrZGF5KGRpKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICB0b3RhbFNlbGVjdGVkKytcblxuXG4gICAgICAgICAgICBpZiBfLmluZGV4T2YoQGN1cnJlbnRCbGFja291dERhdGVzLCBkYXRlU3RyaW5nKSAhPSAtMVxuXG4gICAgICAgICAgICAgIHRvdGFsQmxhY2tlZE91dCsrXG5cbiAgICAgICAgICAgICAgaXNDbGFzcyA9IGZhbHNlXG5cbiAgICAgICAgICAgIHRoaXNXZWVrLmRhdGVzLnB1c2goe2lzQ2xhc3M6IGlzQ2xhc3MsIGRhdGU6IGRhdGVTdHJpbmd9KVxuXG4gICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICB0aGlzV2Vlay5kYXRlcy5wdXNoKHt9KVxuICAgICAgICApXG5cbiAgICAgICAgaWYgdG90YWxCbGFja2VkT3V0ICE9IDAgYW5kIHRvdGFsU2VsZWN0ZWQgaXMgdG90YWxCbGFja2VkT3V0XG5cbiAgICAgICAgICB0aGlzV2Vlay5jbGFzc1RoaXNXZWVrID0gZmFsc2VcblxuICAgICAgICAgIHRoaXNXZWVrLndlZWtJbmRleCA9ICcnXG5cbiAgICAgICAgICBAdG90YWxCbGFja291dFdlZWtzKytcblxuICAgICAgICBAd2Vla2x5RGF0ZXMucHVzaCh0aGlzV2VlaylcblxuICAgICAgKVxuXG4gICAgICBpZiBAdG90YWxCbGFja291dFdlZWtzID4gMFxuXG4gICAgICAgIG5ld0xlbmd0aCA9IEBsZW5ndGggLSBAdG90YWxCbGFja291dFdlZWtzXG5cbiAgICAgICAgaWYgbmV3TGVuZ3RoIDwgNlxuXG4gICAgICAgICAgYWxlcnQoJ1lvdSBoYXZlIGJsYWNrb3V0ZWQgb3V0IGRheXMgdGhhdCB3aWxsIHJlc3VsdCBpbiBhIGNvdXJzZSBsZW5ndGggdGhhdCBpcyBsZXNzIHRoYW4gNiB3ZWVrcy4gUGxlYXNlIGluY3JlYXNlIHRoZSBjb3Vyc2UgbGVuZ3RoLicpXG4gICAgICAgICAgXG4gICAgICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgQGxlbmd0aCA9IG5ld0xlbmd0aFxuXG5cbiAgICBAdXBkYXRlKClcblxuICAgIHJldHVybiBAXG5cblxuXG4gICMgZG9uJ3QgdG91Y2ggdGhpcyBmdW5jdGlvbiB1bmxlc3MgeW91IGtub3cgd2hhdCB5b3UgYXJlIGRvaW5nIDstKVxuICBnZXRXaWtpV2Vla091dHB1dDogKGxlbmd0aCkgLT5cblxuICAgIGRpZmYgPSAxNiAtIGxlbmd0aFxuXG4gICAgb3V0ID0gW11cblxuICAgIHVuaXRzQ2xvbmUgPSBfLmNsb25lKEBkYXRhKVxuXG4gICAgaWYgZGlmZiA+IDBcblxuICAgICAgdW5pdHNDbG9uZSA9IF8ucmVqZWN0KHVuaXRzQ2xvbmUsIChpdGVtKSA9PlxuXG4gICAgICAgIHJldHVybiBpdGVtLnR5cGUgaXMgJ2JyZWFrJyAmJiBkaWZmID49IGl0ZW0udmFsdWUgJiYgaXRlbS52YWx1ZSAhPSAwXG5cbiAgICAgIClcblxuICAgIG9iaiA9IHVuaXRzQ2xvbmVbMF1cblxuICAgIF8uZWFjaCh1bml0c0Nsb25lLCAoaXRlbSwgaW5kZXgpID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnYnJlYWsnIHx8IGluZGV4IGlzIHVuaXRzQ2xvbmUubGVuZ3RoIC0gMVxuXG4gICAgICAgIGlmIGluZGV4IGlzIHVuaXRzQ2xvbmUubGVuZ3RoIC0gMVxuXG4gICAgICAgICAgb3V0LnB1c2ggXy5jbG9uZShpdGVtKVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIG91dC5wdXNoIF8uY2xvbmUob2JqKVxuXG4gICAgICAgIG9iaiA9IHt9XG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGVsc2UgaWYgaXRlbS50eXBlIGlzICd3ZWVrJ1xuXG4gICAgICAgIG9iaiA9IEBjb21iaW5lKG9iaiwgaXRlbSlcblxuICAgIClcblxuICAgIHJldHVybiBvdXRcblxuICB1cGRhdGU6IC0+XG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLnN0YXJ0X2RhdGUgPSBAc3RhcnRfZGF0ZS52YWx1ZSB8fCAnJ1xuXG4gICAgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5lbmRfZGF0ZSA9IEBlbmRfZGF0ZS52YWx1ZSB8fCAnJ1xuXG4gICAgaWYgQGxlbmd0aFxuXG4gICAgICAkKCdvdXRwdXRbbmFtZT1cIm91dDJcIl0nKS5odG1sKEBsZW5ndGggKyAnIHdlZWtzJylcblxuICAgIGVsc2VcblxuICAgICAgJCgnb3V0cHV0W25hbWU9XCJvdXQyXCJdJykuaHRtbCgnJylcblxuICAgIEBvdXQgPSBAZ2V0V2lraVdlZWtPdXRwdXQoQGxlbmd0aClcbiAgICBcbiAgICBAb3V0V2lraSA9IEBvdXRcblxuICAgIEByZW5kZXJSZXN1bHQoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnb3V0cHV0OnVwZGF0ZScsIEAkb3V0Q29udGFpbmVyLnRleHQoKSlcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2RhdGU6Y2hhbmdlJywgQClcblxuXG4gIHJlbmRlclJlc3VsdDogLT5cblxuICAgIEAkb3V0Q29udGFpbmVyLmh0bWwoJycpXG5cbiAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoRGV0YWlsc1RlbXBsYXRlKCBfLmV4dGVuZChXaXphcmREYXRhLHsgZGVzY3JpcHRpb246IFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb259KSkpXG5cbiAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzWzBdIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZCgne3t0YWJsZSBvZiBjb250ZW50c319JylcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoJz09VGltZWxpbmU9PScpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgY3VyV2Vla09mZnNldCA9IDBcblxuICAgICAgXy5lYWNoKEB3ZWVrbHlEYXRlcywgKHdlZWssIGluZGV4KSA9PlxuXG4gICAgICAgIHVubGVzcyB3ZWVrLmNsYXNzVGhpc1dlZWtcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7ZW5kIG9mIGNvdXJzZSB3ZWVrfX1cIilcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPT09I3tAd2lraU5vQ2xhc3N9ICN7d2Vlay53ZWVrU3RhcnR9PT09XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBpdGVtID0gQG91dFdpa2lbd2Vlay53ZWVrSW5kZXhdXG5cbiAgICAgICAgdGhpc1dlZWsgPSB3ZWVrLndlZWtJbmRleCArIDFcblxuICAgICAgICBuZXh0V2VlayA9IHdlZWsud2Vla0luZGV4ICsgMlxuXG4gICAgICAgIGlzTGFzdFdlZWsgPSB3ZWVrLndlZWtJbmRleCBpcyBAbGVuZ3RoIC0gMVxuXG5cbiAgICAgICAgaWYgaXRlbS50aXRsZS5sZW5ndGggPiAwXG5cbiAgICAgICAgICB0aXRsZXMgPSBcIlwiXG5cbiAgICAgICAgICBleHRyYSA9IGlmIHRoaXNXZWVrIGlzIDEgdGhlbiAnMScgZWxzZSAnJ1xuXG4gICAgICAgICAgdGl0bGVzICs9IFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrICN7ZXh0cmF9fCAje3RoaXNXZWVrfSB8IFwiXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS50aXRsZSwgKHQsIGkpIC0+XG5cbiAgICAgICAgICAgIGlmIGkgaXMgMFxuXG4gICAgICAgICAgICAgdGl0bGVzICs9IFwiI3t0fVwiXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICB0aXRsZXMgKz0gXCIsICN7dH1cIlxuXG4gICAgICAgICAgKVxuXG5cbiAgICAgICAgICBpZiB3ZWVrLndlZWtTdGFydCBhbmQgd2Vlay53ZWVrU3RhcnQgIT0gJydcblxuICAgICAgICAgICAgdGl0bGVzICs9IFwifCB3ZWVrb2YgPSAje3dlZWsud2Vla1N0YXJ0fSBcIlxuXG4gICAgICAgICAgZGF5Q291bnQgPSAwXG5cbiAgICAgICAgICBfLmVhY2god2Vlay5kYXRlcywgKGQsIGRpKSA9PlxuXG4gICAgICAgICAgICBpZiBkLmlzQ2xhc3NcblxuICAgICAgICAgICAgICBkYXlDb3VudCsrXG5cbiAgICAgICAgICAgICAgdGl0bGVzICs9IFwifCBkYXkje2RheUNvdW50fSA9ICN7ZC5kYXRlfSBcIlxuXG4gICAgICAgICAgKVxuXG5cbiAgICAgICAgICB0aXRsZXMgKz0gXCJ9fVwiXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQodGl0bGVzKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICBcbiAgICAgIFxuICAgICAgICBpZiBpdGVtLmluX2NsYXNzLmxlbmd0aCA+IDBcblxuICAgICAgICAgIF8uZWFjaChpdGVtLmluX2NsYXNzLCAoYywgY2kpID0+XG5cbiAgICAgICAgICAgIGlmIGMuY29uZGl0aW9uICYmIGMuY29uZGl0aW9uICE9ICcnXG5cbiAgICAgICAgICAgICAgY29uZGl0aW9uID0gZXZhbChjLmNvbmRpdGlvbilcblxuICAgICAgICAgICAgICBpZiBjb25kaXRpb24gXG5cbiAgICAgICAgICAgICAgICBpZiBjaSBpcyAwXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7aW4gY2xhc3N9fVwiKVxuXG4gICAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje2Mud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICBpZiBjaSBpcyAwXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2luIGNsYXNzfX1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje2Mud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICAgICAgICAgIClcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuXG4gICAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG4gICAgICAgICAgXy5lYWNoKGl0ZW0uYXNzaWdubWVudHMsIChhc3NpZ24sIGFpKSA9PlxuXG4gICAgICAgICAgICBpZiBhc3NpZ24uY29uZGl0aW9uICYmIGFzc2lnbi5jb25kaXRpb24gIT0gJydcblxuICAgICAgICAgICAgICBjb25kaXRpb24gPSBldmFsKGFzc2lnbi5jb25kaXRpb24pXG5cbiAgICAgICAgICAgICAgaWYgY29uZGl0aW9uIFxuXG4gICAgICAgICAgICAgICAgaWYgYWkgaXMgMFxuXG4gICAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrICN7bmV4dFdlZWt9IH19XCIpXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7YXNzaWduLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgICAgaWYgYWkgaXMgMFxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAje25leHRXZWVrfSB9fVwiKVxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7YXNzaWduLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIClcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICBpZiBpdGVtLm1pbGVzdG9uZXMubGVuZ3RoID4gMFxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVwiKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgXy5lYWNoKGl0ZW0ubWlsZXN0b25lcywgKG0pID0+XG5cbiAgICAgICAgICAgIGlmIG0uY29uZGl0aW9uICYmIG0uY29uZGl0aW9uICE9ICcnXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3ttLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7bS53aWtpdGV4dH1cIilcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgaWYgaXNMYXN0V2Vla1xuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3tlbmQgb2YgY291cnNlIHdlZWt9fVwiKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICApXG4gICAgICBcbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChHcmFkaW5nVGVtcGxhdGUoV2l6YXJkRGF0YSkpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKCd7e3RhYmxlIG9mIGNvbnRlbnRzfX0nKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIGdyYWRpbmdJdGVtcyA9IFtdXG5cbiAgICAgIF8uZWFjaChhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzLCAocGF0aHdheSkgPT5cblxuICAgICAgICBncmFkaW5nSXRlbXMucHVzaChXaXphcmREYXRhLmdyYWRpbmdbcGF0aHdheV1bcGF0aHdheV0pXG5cbiAgICAgICAgXy5lYWNoKEBkYXRhQWx0W3BhdGh3YXldLCAoaXRlbSwgaW5kKSA9PlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj4je2l0ZW19PC9kaXY+PGJyLz5cIilcblxuICAgICAgICAgIGlmIGluZCBpcyAwXG5cbiAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICApXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXY+PC9kaXY+XCIpXG5cbiAgICAgIClcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGJyLz5cIilcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKEdyYWRpbmdDdXN0b21UZW1wbGF0ZSh7Z3JhZGVJdGVtczogZ3JhZGluZ0l0ZW1zfSkpXG5cbiAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoT3B0aW9uc1RlbXBsYXRlKFdpemFyZERhdGEpKVxuXG4gICAgXG4gIGdldFdlZWtzRGlmZjogKGEsIGIpIC0+XG5cbiAgICByZXR1cm4gYi5kaWZmKGEsICd3ZWVrcycpXG5cblxuICBjb21iaW5lOiAob2JqMSwgb2JqMikgLT5cblxuICAgIHRpdGxlID0gXy51bmlvbihvYmoxLnRpdGxlLCBvYmoyLnRpdGxlKVxuXG4gICAgaW5fY2xhc3MgPSBfLnVuaW9uKG9iajEuaW5fY2xhc3MsIG9iajIuaW5fY2xhc3MpXG5cbiAgICBhc3NpZ25tZW50cyA9IF8udW5pb24ob2JqMS5hc3NpZ25tZW50cywgb2JqMi5hc3NpZ25tZW50cylcblxuICAgIG1pbGVzdG9uZXMgPSBfLnVuaW9uKG9iajEubWlsZXN0b25lcywgb2JqMi5taWxlc3RvbmVzKVxuXG4gICAgcmVhZGluZ3MgPSBfLnVuaW9uKG9iajEucmVhZGluZ3MsIG9iajIucmVhZGluZ3MpXG5cbiAgICByZXR1cm4ge3RpdGxlOiB0aXRsZSwgaW5fY2xhc3M6IGluX2NsYXNzLCBhc3NpZ25tZW50czogYXNzaWdubWVudHMsIG1pbGVzdG9uZXM6IG1pbGVzdG9uZXMsIHJlYWRpbmdzOiByZWFkaW5nc31cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4vVmlldycpXG5cblxuI1RFTVBMQVRFU1xuSW5wdXRJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0SXRlbVRlbXBsYXRlLmhicycpXG5cblxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogSW5wdXRJdGVtVGVtcGxhdGVcblxuXG4gIGNsYXNzTmFtZTogJ2N1c3RvbS1pbnB1dC13cmFwcGVyJ1xuXG5cbiAgaG92ZXJUaW1lOiA1MDBcblxuICB0aXBWaXNpYmxlOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwidGV4dFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5pbmZvLWljb24nIDogJ2luZm9JY29uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdmVyIC5jdXN0b20taW5wdXQnIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZWVudGVyIC5jaGVjay1idXR0b24nIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZW91dCcgOiAnbW91c2VvdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0YWJsZSAuY2hlY2stYnV0dG9uJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpb2JveCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0JveENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdmb2N1cyAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkZvY3VzJ1xuXG4gICAgJ2JsdXIgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25CbHVyJ1xuXG5cbiAgaW5mb0ljb25DbGlja0hhbmRsZXI6IC0+XG5cbiAgICB1bmxlc3MgQCRlbC5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAc2hvd1Rvb2x0aXAoKVxuXG4gICAgZWxzZVxuXG4gICAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcblxuICAgICAgICBzY3JvbGxUb3A6IDBcblxuICAgICAgLDUwMClcblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cblxuXG4gIHJhZGlvQm94Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRvdGhlclJhZGlvcyA9IEAkZWwucGFyZW50cygnLnN0ZXAtZm9ybS1pbm5lcicpLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpLmZpbmQoJ2lucHV0JykudmFsKCdvZmYnKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuICBjaGVja0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JykubGVuZ3RoID4gMFxuXG4gICAgICByZXR1cm4gQHJhZGlvQm94Q2xpY2tIYW5kbGVyKGUpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpXG5cbiAgICAgIC50b2dnbGVDbGFzcygnY2hlY2tlZCcpXG4gICAgXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cblxuICBob3ZlckhhbmRsZXI6IChlKSAtPlxuICAgIHJldHVybiBlXG5cblxuICBtb3VzZW92ZXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gdHJ1ZVxuICAgICAgXG5cbiAgbW91c2VvdXRIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG4gIHNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8oKSAmJiBAcGFyZW50U3RlcC50aXBWaXNpYmxlID09IGZhbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IHRydWVcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwW2RhdGEtaXRlbS1pbmRleD0nI3tAaXRlbUluZGV4fSddXCIpLmFkZENsYXNzKCd2aXNpYmxlJylcblxuXG4gIGhpZGVUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8oKVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpIFxuXG5cbiAgaGlkZVNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JykuaGFzQ2xhc3MoJ25vdC1lZGl0YWJsZScpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cbiAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgIEBzaG93VG9vbHRpcCgpXG5cblxuICBsYWJlbENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgcmV0dXJuIGZhbHNlXG5cblxuICBpdGVtQ2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICAjIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2Fuc3dlcjp1cGRhdGVkJywgaW5wdXRJZCwgdmFsdWUpXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0dyb3VwJ1xuXG4gICAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAgIGluZGV4ID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2lkJylcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cigndmFsdWUnKVxuXG4gICAgICBwYXJlbnRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCduYW1lJylcblxuICAgICAgaWYgJChlLmN1cnJlbnRUYXJnZXQpLnByb3AoJ2NoZWNrZWQnKVxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVJhZGlvQW5zd2VyKHBhcmVudElkLCBpbmRleCwgdHJ1ZSlcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVJhZGlvQW5zd2VyKHBhcmVudElkLCBpbmRleCwgZmFsc2UpXG5cbiAgICBlbHNlXG5cbiAgICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICAgIGlucHV0SWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICBpZiBAcGFyZW50U3RlcC5tb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJ1xuXG4gICAgICAgIHBhdGh3YXkgPSAkKGUudGFyZ2V0KS5wYXJlbnRzKCcuY3VzdG9tLWlucHV0JykuYXR0cignZGF0YS1wYXRod2F5LWlkJylcblxuICAgICAgICB1bmxlc3MgcGF0aHdheVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSwgdHJ1ZSwgcGF0aHdheSlcblxuICAgICAgZWxzZVxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVBbnN3ZXIoaW5wdXRJZCwgdmFsdWUsIGZhbHNlKVxuXG4gICAgICBpZiBAaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICAgIGlmIGlzTmFOKHBhcnNlSW50KHZhbHVlKSlcblxuICAgICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoJycpXG5cbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdncmFkZTpjaGFuZ2UnLCBpbnB1dElkLCB2YWx1ZSlcbiAgICBcbiAgICByZXR1cm4gQHBhcmVudFN0ZXAudXBkYXRlVXNlckhhc0Fuc3dlcmVkKGlucHV0SWQsIHZhbHVlLCBAaW5wdXRUeXBlKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHJpdmF0ZSBNZXRob2RzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcyhAaW5wdXRUeXBlKVxuXG4gICAgQCRpbnB1dEVsID0gQCRlbC5maW5kKCdpbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy52YWx1ZSAhPSAnJyAmJiBAbW9kZWwuYXR0cmlidXRlcy50eXBlID09ICd0ZXh0J1xuICAgICAgXG4gICAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuICAgIEBob3ZlclRpbWVyID0gbnVsbFxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cblxuICBoYXNJbmZvOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuaGFzQ2xhc3MoJ2hhcy1pbmZvJylcblxuXG4gIG9uRm9jdXM6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBvbkJsdXI6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBpZiB2YWx1ZSA9PSAnJ1xuXG4gICAgICB1bmxlc3MgJHRhcmdldC5pcygnOmZvY3VzJylcblxuICAgICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzRGlzYWJsZWQ6IC0+XG5cbiAgICByZXR1cm4gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JykuaGFzQ2xhc3MoJ25vdC1lZGl0YWJsZScpXG5cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFB1YmxpYyBNZXRob2RzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJlbmRlcjogLT5cblxuICAgIHN1cGVyKClcblxuXG4gIGdldElucHV0VHlwZU9iamVjdDogLT5cblxuICAgIHJldHVybkRhdGEgPSB7fVxuXG4gICAgcmV0dXJuRGF0YVtAaW5wdXRUeXBlXSA9IHRydWVcblxuICAgIHJldHVybiByZXR1cm5EYXRhXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICBpbnB1dFR5cGVPYmplY3QgPSBAZ2V0SW5wdXRUeXBlT2JqZWN0KClcblxuXG4gICAgaWYgQGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpbydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3RleHQnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICBpZiBAcGFyZW50U3RlcC5tb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJyB8fCBAcGFyZW50U3RlcC5tb2RlbC5hdHRyaWJ1dGVzLnR5cGUgaXMgJ2dyYWRpbmcnXG5cbiAgICAgICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuY29udGluZ2VudFVwb24ubGVuZ3RoICE9IDBcblxuICAgICAgICAgIGN1cnJlbnRTZWxlY3RlZCA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LmdldFNlbGVjdGVkSWRzKClcblxuICAgICAgICAgIHJlbmRlckluT3V0cHV0ID0gZmFsc2VcblxuICAgICAgICAgIF8uZWFjaChAbW9kZWwuYXR0cmlidXRlcy5jb250aW5nZW50VXBvbiwgKGlkKSA9PlxuXG4gICAgICAgICAgICBfLmVhY2goY3VycmVudFNlbGVjdGVkLCAoc2VsZWN0ZWRJZCkgPT5cblxuICAgICAgICAgICAgICBpZiBpZCBpcyBzZWxlY3RlZElkXG5cbiAgICAgICAgICAgICAgICByZW5kZXJJbk91dHB1dCA9IHRydWVcblxuICAgICAgICAgICAgKVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgdW5sZXNzIHJlbmRlckluT3V0cHV0XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuXG5cblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdlZGl0J1xuXG4gICAgICBhbGxJbnB1dHMgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVxuXG4gICAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICAgIF8uZWFjaChhbGxJbnB1dHMsIChpbnB1dCkgPT5cblxuICAgICAgICBpZiBpbnB1dC50eXBlXG5cbiAgICAgICAgICBpZiBpbnB1dC50eXBlIGlzICdjaGVja2JveCcgfHwgaW5wdXQudHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgICAgICAgIGlmIGlucHV0LnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0LmxhYmVsXG5cbiAgICAgICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3JhZGlvR3JvdXAnXG5cbiAgICAgICAgICAgIGlmIGlucHV0LmlkIGlzICdwZWVyX3Jldmlld3MnXG5cbiAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5vdmVydmlld0xhYmVsXG5cbiAgICAgIClcblxuICAgICAgXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hhcy1jb250ZW50JylcblxuICAgICAgaWYgc2VsZWN0ZWRJbnB1dHMubGVuZ3RoID09IDBcbiAgICAgICAgXG4gICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggXCJbTm9uZSBzZWxlY3RlZF1cIlxuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIGFzc2lnbm1lbnRzOiBzZWxlY3RlZElucHV0c1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnbGluaydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cblxuICBcbiAgICAgIFxuICAgIFxuICAgICAgXG5cbiAgICBcbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEJhc2UgVmlldyBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbnJlcXVpcmUoJy4uLy4uL2hlbHBlcnMvVmlld0hlbHBlcicpXG5cbmNsYXNzIFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHRlbXBsYXRlOiAtPlxuICAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcbiAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuICAgIFxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBhZnRlclJlbmRlcjogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBFVkVOVCBIQU5ETEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXciXX0=
