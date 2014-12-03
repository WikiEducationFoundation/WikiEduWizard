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
            console.log(_this.currentBlackoutDates);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9Mb2dpbkNvbnRlbnQuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1RpbWVsaW5lRGF0YS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvVGltZWxpbmVEYXRhQWx0LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb25maWcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZENvdXJzZUluZm8uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9oZWxwZXJzL1ZpZXdIZWxwZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9tYWluLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9zdXBlcnMvTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9yb3V0ZXJzL1JvdXRlci5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2luZm8vQ291cnNlVGlwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dEl0ZW1UZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEZXRhaWxzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraUdyYWRpbmdNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpU3VtbWFyeU1vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdBbHRUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvRGF0ZUlucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0lucHV0SXRlbVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3ZlcnZpZXdWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvU3RlcE5hdlZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1RpbWVsaW5lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvVmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0VBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25SQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQSxJQUFBLDZEQUFBO0VBQUE7aVNBQUE7O0FBQUEsV0FBQSxHQUFjLE9B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QUFBLENBckJaLENBQUE7O0FBQUEsaUJBMkJBLE1BQUEsR0FBUSxTQUFBLEdBQUE7QUFDTixJQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFXLElBQUMsQ0FBQSxRQUFELENBQVcsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFYLENBQVgsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBRkEsQ0FBQTtBQUlBLFdBQU8sSUFBUCxDQUxNO0VBQUEsQ0EzQlIsQ0FBQTs7QUFBQSxpQkFxQ0EsV0FBQSxHQUFhLFNBQUEsR0FBQSxDQXJDYixDQUFBOztBQXVDQTtBQUFBOzs7S0F2Q0E7O0FBMkNBO0FBQUE7OztLQTNDQTs7QUErQ0E7QUFBQTs7O0tBL0NBOztjQUFBOztHQUZpQixRQUFRLENBQUMsS0FGNUIsQ0FBQTs7QUFBQSxNQXVETSxDQUFDLE9BQVAsR0FBaUIsSUF2RGpCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2hpbnQgZXFudWxsOiB0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuXG52YXIgSGFuZGxlYmFycyA9IHt9O1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZFUlNJT04gPSBcIjEuMC4wXCI7XG5IYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OID0gNDtcblxuSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcblxuSGFuZGxlYmFycy5oZWxwZXJzICA9IHt9O1xuSGFuZGxlYmFycy5wYXJ0aWFscyA9IHt9O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGZ1bmN0aW9uVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyID0gZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsID0gZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcblxuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm4odGhpcyk7XG4gIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5LID0gZnVuY3Rpb24oKSB7fTtcblxuSGFuZGxlYmFycy5jcmVhdGVGcmFtZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24ob2JqZWN0KSB7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBvYmplY3Q7XG4gIHZhciBvYmogPSBuZXcgSGFuZGxlYmFycy5LKCk7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBudWxsO1xuICByZXR1cm4gb2JqO1xufTtcblxuSGFuZGxlYmFycy5sb2dnZXIgPSB7XG4gIERFQlVHOiAwLCBJTkZPOiAxLCBXQVJOOiAyLCBFUlJPUjogMywgbGV2ZWw6IDMsXG5cbiAgbWV0aG9kTWFwOiB7MDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcid9LFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChIYW5kbGViYXJzLmxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IEhhbmRsZWJhcnMubG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy5sb2cgPSBmdW5jdGlvbihsZXZlbCwgb2JqKSB7IEhhbmRsZWJhcnMubG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgZGF0YSA9IEhhbmRsZWJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgfVxuXG4gIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgaWYoY29udGV4dCBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYoZGF0YSkgeyBkYXRhLmtleSA9IGtleTsgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihpID09PSAwKXtcbiAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb25kaXRpb25hbCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICBpZighY29uZGl0aW9uYWwgfHwgSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZufSk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmICghSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgSGFuZGxlYmFycy5sb2cobGV2ZWwsIGNvbnRleHQpO1xufSk7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WTSA9IHtcbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKHRlbXBsYXRlU3BlYykge1xuICAgIC8vIEp1c3QgYWRkIHdhdGVyXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICAgIGludm9rZVBhcnRpYWw6IEhhbmRsZWJhcnMuVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgICB9LFxuICAgICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgICAgcmV0ID0ge307XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogSGFuZGxlYmFycy5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgICAgbm9vcDogSGFuZGxlYmFycy5WTS5ub29wLFxuICAgICAgY29tcGlsZXJJbmZvOiBudWxsXG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChjb250YWluZXIsIEhhbmRsZWJhcnMsIGNvbnRleHQsIG9wdGlvbnMuaGVscGVycywgb3B0aW9ucy5wYXJ0aWFscywgb3B0aW9ucy5kYXRhKTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyA9IGNvbnRhaW5lci5jb21waWxlckluZm8gfHwgW10sXG4gICAgICAgICAgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IEhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxuXG4gIHByb2dyYW1XaXRoRGVwdGg6IGZ1bmN0aW9uKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IDA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIG5vb3A6IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJcIjsgfSxcbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKCFIYW5kbGViYXJzLmNvbXBpbGUpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gSGFuZGxlYmFycy5jb21waWxlKHBhcnRpYWwsIHtkYXRhOiBkYXRhICE9PSB1bmRlZmluZWR9KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMudGVtcGxhdGUgPSBIYW5kbGViYXJzLlZNLnRlbXBsYXRlO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG5cbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gQkVHSU4oQlJPV1NFUilcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5IYW5kbGViYXJzLkV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufTtcbkhhbmRsZWJhcnMuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuSGFuZGxlYmFycy5TYWZlU3RyaW5nID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufTtcbkhhbmRsZWJhcnMuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5nLnRvU3RyaW5nKCk7XG59O1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxudmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn07XG5cbkhhbmRsZWJhcnMuVXRpbHMgPSB7XG4gIGV4dGVuZDogZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXNjYXBlRXhwcmVzc2lvbjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBIYW5kbGViYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsIHx8IHN0cmluZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9IHN0cmluZy50b1N0cmluZygpO1xuXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZih0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMnKS5jcmVhdGUoKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcycpLmF0dGFjaChleHBvcnRzKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzJykuYXR0YWNoKGV4cG9ydHMpIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgREVTSUdOIFdJWkFSRFxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cblxuQXBwbGljYXRpb24gPSBcblxuICBpbml0aWFsaXplOiAtPlxuXG4gICAgQFdpemFyZENvbmZpZyA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb25maWcnKVxuXG4gICAgQHRpbWVsaW5lRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGEnKVxuXG4gICAgQHRpbWVsaW5lRGF0YUFsdCA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGFBbHQnKVxuXG4gICAgIyBJbXBvcnQgdmlld3NcbiAgICBIb21lVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvSG9tZVZpZXcnKVxuXG4gICAgTG9naW5WaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Mb2dpblZpZXcnKVxuXG4gICAgUm91dGVyID0gcmVxdWlyZSgnLi9yb3V0ZXJzL1JvdXRlcicpXG5cbiAgICBJbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuICAgIE91dHB1dFZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL091dHB1dFZpZXcnKVxuXG5cbiAgICAjIEluaXRpYWxpemUgdmlld3NcbiAgICBAaG9tZVZpZXcgPSBuZXcgSG9tZVZpZXcoKVxuXG4gICAgQGxvZ2luVmlldyA9IG5ldyBMb2dpblZpZXcoKVxuXG4gICAgQGlucHV0SXRlbVZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldygpXG5cbiAgICBAb3V0cHV0VmlldyA9IG5ldyBPdXRwdXRWaWV3KClcblxuICAgIEByb3V0ZXIgPSBuZXcgUm91dGVyKClcblxuICAgIFxuICAgIFxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvbiIsIkxvZ2luQ29udGVudCA9IFxuICBpZDogXCJpbnRyb1wiXG4gIHRpdGxlOiAnPGNlbnRlcj5XZWxjb21lIHRvIHRoZTxiciAvPkFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCE8L2NlbnRlcj4nXG4gIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICBpbnN0cnVjdGlvbnM6ICcnXG4gIGlucHV0czogW11cbiAgc2VjdGlvbnM6IFtcbiAgICB7XG4gICAgICBjb250ZW50OiBbXG4gICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCBoZWxwIHlvdSB0byBlYXNpbHkgY3JlYXRlIGEgY3VzdG9taXplZCBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnQgYW5kIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+V2hlbiB5b3XigJlyZSBmaW5pc2hlZCwgeW91J2xsIGhhdmUgYSByZWFkeS10by11c2UgbGVzc29uIHBsYW4sIHdpdGggd2Vla2x5IGFzc2lnbm1lbnRzLCBwdWJsaXNoZWQgZGlyZWN0bHkgb250byBhIHNhbmRib3ggcGFnZSBvbiBXaWtpcGVkaWEgd2hlcmUgeW91IGNhbiBjdXN0b21laXplIGl0IGV2ZW4gZnVydGhlci48L3A+XCIgICAgIFxuICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+TGV04oCZcyBzdGFydCBieSBmaWxsaW5nIGluIHNvbWUgYmFzaWNzIGFib3V0IHlvdSBhbmQgeW91ciBjb3Vyc2U6PC9wPlwiXG4gICAgICBdXG4gICAgfVxuICBdXG4gIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gTG9naW5Db250ZW50XG4iLCIjIyBUSElTIEZJTEVTIElTIFVTRUQgQVMgVEhFIE1BU1RFUiBGT1IgQUxMIFdJS0kgT1VUIFJFTEFURUQgVE8gVEhFIE1BSU4gQVNTSUdOTUVOVCBUWVBFICMjXG4jIyBUSEUgQlJFQUsgQVJFIFVTRUQgVE8gREVURVJNSU5FIEhPVyBUSEUgQVNTSUdOTUVOVCBFWFBBTkRTIEFORCBDT05UUkFDVCBCQVNFRCBPTiBDT1VSU0UgTEVOR1RIICMjXG4jIyBUSEUgYWN0aW9uIFZBUklBQkxFIElTIFVTRUQgVE8gREVURVJNSU5FIFdIRVRIRVIgT1IgTk9UIFRIRSBDT05URU5UIElTIENPTUJJTkVEIFdJVEggSVRTIFBSRURFQ0VTT1IgT1IgV0hFVEhFUiBJVFMgT01JVFRFRCBBTEwgVE9HRVRIRVIjI1xuXG5UaW1lbGluZURhdGEgPSBbXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIHRpdGxlOiBbJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnSW50cm8gdG8gV2lraXBlZGlhJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbnRybyB0byBXaWtpcGVkaWF9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDVcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0VkaXRpbmcgYmFzaWNzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRWRpdGluZyBiYXNpY3MgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb21wbGV0ZSB0aGUgdHJhaW5pbmcnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIHRoZSB0cmFpbmluZ319J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fSdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1ByYWN0aWNlIGNvbW11bmljYXRpbmcnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByYWN0aWNlIGNvbW11bmljYXRpbmd9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnU3R1ZGVudHMgZW5yb2xsZWQnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogOFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRWRpdGluZyBiYXNpY3MgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFdmFsdWF0ZSBhbiBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhbiBhcnRpY2xlfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZ2V0dGluZ19zdGFydGVkLmNyaXRpcXVlX2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db3B5ZWRpdCBhbiBhcnRpY2xlfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZ2V0dGluZ19zdGFydGVkLmNvcHlfZWRpdF9hcnRpY2xlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdVc2luZyBzb3VyY2VzIGluIGNsYXNzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Vc2luZyBzb3VyY2VzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWRkIHRvIGFuIGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5nZXR0aW5nX3N0YXJ0ZWQuYWRkX3RvX2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdJbGx1c3RyYXRlIGFuIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmdldHRpbmdfc3RhcnRlZC5pbGx1c3RyYXRlX2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdMaXN0IGFydGljbGUgY2hvaWNlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXN9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5jaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIGFydGljbGVzIGZyb20gYSBsaXN0J1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3R9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5jaG9vc2luZ19hcnRpY2xlcy5wcmVwYXJlX2xpc3Quc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFdmFsdWF0ZSBhcnRpY2xlIHNlbGVjdGlvbnMgfCBkdWUgPSBuZXh0IHdlZWsnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IG5leHQgd2VlayB9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0ZpbmFsaXppbmcgdG9waWNzIGFuZCBzdGFydGluZyByZXNlYXJjaCddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgdG9waWNzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuY2hvb3NpbmdfYXJ0aWNsZXMuc3R1ZGVudHNfZXhwbG9yZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbXBpbGUgYSBiaWJsaW9ncmFwaHknXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBpbGUgYSBiaWJsaW9ncmFwaHl9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDdcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0RyYWZ0aW5nIHN0YXJ0ZXIgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb252ZW50aW9uYWwgb3V0bGluZSAnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucmVzZWFyY2hfcGxhbm5pbmcuY3JlYXRlX291dGxpbmUuc2VsZWN0ZWQgJiYgV2l6YXJkRGF0YS5kcmFmdHNfbWFpbnNwYWNlLnNhbmRib3guc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfCBzYW5kYm94ID0gbm8gfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucmVzZWFyY2hfcGxhbm5pbmcuY3JlYXRlX291dGxpbmUuc2VsZWN0ZWQgJiYgV2l6YXJkRGF0YS5kcmFmdHNfbWFpbnNwYWNlLndvcmtfbGl2ZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ091dGxpbmUgYXMgbGVhZCBzZWN0aW9uJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PdXRsaW5lIGFzIGxlYWQgc2VjdGlvbn19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnJlc2VhcmNoX3BsYW5uaW5nLndyaXRlX2xlYWQuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBoYXZlIHN0YXJ0ZWQgZWRpdGluZ319J1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ01vdmluZyBhcnRpY2xlcyB0byB0aGUgbWFpbiBzcGFjZSddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ01haW4gc3BhY2UgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01haW4gc3BhY2UgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ01vdmUgdG8gbWFpbiBzcGFjZSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTW92ZSB0byBtYWluIHNwYWNlfX0nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEWUsgbm9taW5hdGlvbnMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RZSyBub21pbmF0aW9uc319J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmR5ay5keWsuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFeHBhbmQgeW91ciBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBhbmQgeW91ciBhcnRpY2xlfX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydCdWlsZGluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzBdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSB7e3BlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLnZhbHVlfX0gfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJyFXaXphcmREYXRhLnBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnNbMF0uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAyXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydDcmVhdGluZyBmaXJzdCBkcmFmdCddXG4gICAgaW5fY2xhc3M6IFtcbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbXBsZXRlIGZpcnN0IGRyYWZ0JyAjMURDXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA2XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2snXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdHcm91cCBzdWdnZXN0aW9ucydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0RvIG9uZSBwZWVyIHJldmlldydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gb25lIHBlZXIgcmV2aWV3fX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9uc1swXS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0RvIHBlZXIgcmV2aWV3cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IHt7cGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3MudmFsdWV9fSB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnIVdpemFyZERhdGEucGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9uc1swXS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydSZXNwb25kaW5nIHRvIGZlZWRiYWNrJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbidcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbn19J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3MnICNSRkIgXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX0nICNSRkIgXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ29taXQnXG4gICAgdGl0bGU6IFsnQ29udGludWluZyBpbXByb3ZpbmcgYXJ0aWNsZXMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50c319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzJyBcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAzXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnIFxuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXN9fScgXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA0XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnb21pdCdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlc319J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb24nXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9ufX0nXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA5XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydGaW5pc2hpbmcgdG91Y2hlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0luLWNsYXNzIHByZXNlbnRhdGlvbnMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luLWNsYXNzIHByZXNlbnRhdGlvbnN9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLmNsYXNzX3ByZXNlbnRhdGlvbi5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXN9fSdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1JlZmxlY3RpdmUgZXNzYXl9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLnJlZmxlY3RpdmVfZXNzYXkuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XaWtpcGVkaWEgcG9ydGZvbGlvfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cy5wb3J0Zm9saW8uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdPcmlnaW5hbCBhcmd1bWVudCBwYXBlcidcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3JpZ2luYWwgYXJndW1lbnQgcGFwZXJ9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLm9yaWdpbmFsX3BhcGVyLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19J1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDEwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydEdWUgZGF0ZScgXVxuICAgIGluX2NsYXNzOiBbXVxuICAgIGFzc2lnbm1lbnRzOiBbXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FsbCBzdHVkZW50cyBmaW5pc2hlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWxsIHN0dWRlbnRzIGZpbmlzaGVkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG5dXG5cbm1vZHVsZS5leHBvcnRzID0gVGltZWxpbmVEYXRhXG5cbiIsIiMjIFRISVMgRklMRSBJTkNMVURFUyBUSEUgV0lLSSBPVVRQVVQgVEVNUExBVEUgQ0hVTktTIFVTRUQgRk9SIEZJTkFMIE9VVFBVVCAtIEZPUiBBTFQgQVNTSUdOTUVOVCBUWVBFUyAjI1xuXG5cblRpbWVsaW5lRGF0YUFsdCA9IFxuICBtdWx0aW1lZGlhOiBbXG4gICAgXCI9PSBJbGx1c3RyYXRpbmcgV2lraXBlZGlhID09XCJcbiAgICBcInt7YXNzaWdubWVudH19XCJcbiAgICBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbGx1c3RyYXRlIGFuIGFydGljbGV9fVwiXG4gICAgXCI8YnIvPnt7ZW5kIG9mIGNvdXJzZSBhc3NpZ25tZW50fX1cIlxuICBdXG4gIGNvcHllZGl0OiBbXG4gICAgXCI9PSBDb3B5ZWRpdCBXaWtpcGVkaWEgPT1cIlxuICAgIFwie3thc3NpZ25tZW50fX1cIlxuICAgIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fVwiXG4gICAgXCI8YnIvPnt7ZW5kIG9mIGNvdXJzZSBhc3NpZ25tZW50fX1cIlxuICBdXG5cbm1vZHVsZS5leHBvcnRzID0gVGltZWxpbmVEYXRhQWx0XG5cbiIsIiMjIFRISVMgRklMRSBJUyBUSEUgREFUQSBDT05URU5UIEFORCBTVEVQIE9SREVSIENPTkZJR1JBVElPTiBGT1IgVEhFIFdJWkFSRCBBUyBXRUxMIEFTIEFTU0lHTk1FTlQgUEFUSFdBWVMgIyNcbiMjIFVOQ09NTUVOVElORyBUSEUgREFUQSBJTlNJREUgVEhFIFBBVEhXQVlTIFNFQ1RJT04gV0xMIEFERCBNT1JFIFNURVBTIElOVE8gVEhPU0UgQUxURVJOQVRJVkUgUEFUSFdBWVMgIyNcblxuV2l6YXJkQ29uZmlnID0ge1xuICBpbnRyb19zdGVwczogW1xuICAgIHtcbiAgICAgIGlkOiBcImludHJvXCJcbiAgICAgIHRpdGxlOiAnPGNlbnRlcj5XZWxjb21lIHRvIHRoZTxiciAvPkFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCE8L2NlbnRlcj4nXG4gICAgICBsb2dpbl9pbnN0cnVjdGlvbnM6ICdDbGljayBMb2dpbiB3aXRoIFdpa2lwZWRpYSB0byBnZXQgc3RhcnRlZCdcbiAgICAgIGluc3RydWN0aW9uczogJydcbiAgICAgIGlucHV0czogW11cbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+VGhpcyB0b29sIHdpbGwgaGVscCB5b3UgdG8gZWFzaWx5IGNyZWF0ZSBhIGN1c3RvbWl6ZWQgV2lraXBlZGlhIGNsYXNzcm9vbSBhc3NpZ25tZW50IGFuZCBjdXN0b21pemVkIHN5bGxhYnVzIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UnbGwgaGF2ZSBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiwgd2l0aCB3ZWVrbHkgYXNzaWdubWVudHMsIHB1Ymxpc2hlZCBkaXJlY3RseSBvbnRvIGEgc2FuZGJveCBwYWdlIG9uIFdpa2lwZWRpYSB3aGVyZSB5b3UgY2FuIGN1c3RvbWVpemUgaXQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+TGV04oCZcyBzdGFydCBieSBmaWxsaW5nIGluIHNvbWUgYmFzaWNzIGFib3V0IHlvdSBhbmQgeW91ciBjb3Vyc2U6PC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICAgIHtcbiAgICAgIGlkOiBcImFzc2lnbm1lbnRfc2VsZWN0aW9uXCJcbiAgICAgIHRpdGxlOiAnQXNzaWdubWVudCB0eXBlIHNlbGVjdGlvbidcbiAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGFzc2lnbm1lbnQgc2VsZWN0aW9ucydcbiAgICAgIGZvcm1UaXRsZTogJ0F2YWlsYWJsZSBhc3NpZ25tZW50czonXG4gICAgICBpbnN0cnVjdGlvbnM6IFwiWW91IGNhbiB0ZWFjaCB3aXRoIFdpa2lwZWRpYSBpbiBzZXZlcmFsIGRpZmZlcmVudCB3YXlzLCBhbmQgaXQncyBpbXBvcnRhbnQgdG8gZGVzaWduIGFuIGFzc2lnbm1lbnQgdGhhdCBpcyBzdWl0YWJsZSBmb3IgV2lraXBlZGlhIDxlbT5hbmQ8L2VtPiBhY2hpZXZlcyB5b3VyIHN0dWRlbnQgbGVhcm5pbmcgb2JqZWN0aXZlcy4gWW91ciBmaXJzdCBzdGVwIGlzIHRvIGNob29zZSB3aGljaCBhc3NpZ25tZW50KHMpIHlvdSdsbCBiZSBhc2tpbmcgeW91ciBzdHVkZW50cyB0byBjb21wbGV0ZSBhcyBwYXJ0IG9mIHRoZSBjb3Vyc2UuXCJcbiAgICAgIGlucHV0czogW11cbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPldlJ3ZlIGNyZWF0ZWQgc29tZSBndWlkZWxpbmVzIHRvIGhlbHAgeW91LCBidXQgeW91J2xsIG5lZWQgdG8gbWFrZSBzb21lIGtleSBkZWNpc2lvbnMsIHN1Y2ggYXM6IHdoaWNoIGxlYXJuaW5nIG9iamVjdGl2ZXMgYXJlIHlvdSB0YXJnZXRpbmcgd2l0aCB0aGlzIGFzc2lnbm1lbnQ/IFdoYXQgc2tpbGxzIGRvIHlvdXIgc3R1ZGVudHMgYWxyZWFkeSBoYXZlPyBIb3cgbXVjaCB0aW1lIGNhbiB5b3UgZGV2b3RlIHRvIHRoZSBhc3NpZ25tZW50PzwvcD5cIlxuICAgICAgICAgICAgXCI8cD5Nb3N0IGluc3RydWN0b3JzIGFzayB0aGVpciBzdHVkZW50cyB0byB3cml0ZSBvciBleHBhbmQgYW4gYXJ0aWNsZS4gU3R1ZGVudHMgc3RhcnQgYnkgbGVhcm5pbmcgdGhlIGJhc2ljcyBvZiBXaWtpcGVkaWEsIGFuZCB0aGVuIGZvY3VzIG9uIHRoZSBjb250ZW50LiBUaGV5IHBsYW4sIHJlc2VhcmNoLCBhbmQgd3JpdGUgYSBwcmV2aW91c2x5IG1pc3NpbmcgV2lraXBlZGlhIGFydGljbGUsIG9yIGNvbnRyaWJ1dGUgdG8gYW4gaW5jb21wbGV0ZSBlbnRyeSBvbiBhIGNvdXJzZS1yZWxhdGVkIHRvcGljLiBUaGlzIGFzc2lnbm1lbnQgdHlwaWNhbGx5IHJlcGxhY2VzIGEgdGVybSBwYXBlciBvciByZXNlYXJjaCBwcm9qZWN0LCBvciBpdCBmb3JtcyB0aGUgbGl0ZXJhdHVyZSByZXZpZXcgc2VjdGlvbiBvZiBhIGxhcmdlciBwYXBlci4gVGhlIHN0dWRlbnQgbGVhcm5pbmcgb3V0Y29tZSBpcyBoaWdoIHdpdGggdGhpcyBhc3NpZ25tZW50LCBidXQgaXQgZG9lcyB0YWtlIGEgc2lnbmlmaWNhbnQgYW1vdW50IG9mIHRpbWUuIFlvdXIgc3R1ZGVudHMgbmVlZCB0byBsZWFybiBib3RoIHRoZSB3aWtpIG1hcmt1cCBsYW5ndWFnZSBhbmQga2V5IHBvbGljaWVzIGFuZCBleHBlY3RhdGlvbnMgb2YgdGhlIFdpa2lwZWRpYS1lZGl0aW5nIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgIFwiPHA+SWYgd3JpdGluZyBhbiBhcnRpY2xlIGlzbid0IHJpZ2h0IGZvciB5b3VyIGNsYXNzLCBvdGhlciBhc3NpZ25tZW50IG9wdGlvbnMgb2ZmZXIgc3R1ZGVudHMgdmFsdWFibGUgbGVhcm5pbmcgb3Bwb3J0dW5pdGllcyBhbmQgaGVscCB0byBpbXByb3ZlIFdpa2lwZWRpYS4gU2VsZWN0IGFuIGFzc2lnbm1lbnQgdHlwZSBvbiB0aGUgbGVmdCB0byBsZWFybiBtb3JlLjwvcD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgIH1cbiAgXVxuICBwYXRod2F5czoge1xuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgcmVzZWFyY2h3cml0ZTogW1xuICAgICAge1xuICAgICAgICBpZDogXCJsZWFybmluZ19lc3NlbnRpYWxzXCJcbiAgICAgICAgdGl0bGU6ICdXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IFdpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgICAgICBpbnN0cnVjdGlvbnM6IFwiVG8gZ2V0IHN0YXJ0ZWQsIHlvdSdsbCB3YW50IHRvIGludHJvZHVjZSB5b3VyIHN0dWRlbnRzIHRvIHRoZSBiYXNpYyBydWxlcyBvZiB3cml0aW5nIFdpa2lwZWRpYSBhcnRpY2xlcyBhbmQgd29ya2luZyB3aXRoIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5LlwiXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkFzIHRoZWlyIGZpcnN0IFdpa2lwZWRpYSBhc3NpZ25tZW50IG1pbGVzdG9uZSwgeW91IGNhbiBhc2sgdGhlIHN0dWRlbnRzIHRvIGNyZWF0ZSB1c2VyIGFjY291bnRzIGFuZCB0aGVuIGNvbXBsZXRlIHRoZSA8ZW0+b25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50czwvZW0+LiBUaGlzIHRyYWluaW5nIGludHJvZHVjZXMgdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkgYW5kIGhvdyBpdCB3b3JrcywgZGVtb25zdHJhdGVzIHRoZSBiYXNpY3Mgb2YgZWRpdGluZyBhbmQgd2Fsa3Mgc3R1ZGVudHMgdGhyb3VnaCB0aGVpciBmaXJzdCBlZGl0cywgZ2l2ZXMgYWR2aWNlIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgYW5kIGRyYWZ0aW5nIHJldmlzaW9ucywgYW5kIGV4cGxhaW5zIGZ1cnRoZXIgc291cmNlcyBvZiBzdXBwb3J0IGFzIHRoZXkgY29udGludWUgYWxvbmcuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCwgd2hpY2ggeW91IGNhbiB1c2UgdG8gdmVyaWZ5IHRoYXQgc3R1ZGVudHMgY29tcGxldGVkIHRoZSB0cmFpbmluZy48L3A+J1xuICAgICAgICAgICAgICAnPHA+U3R1ZGVudHMgd2hvIGNvbXBsZXRlIHRoaXMgdHJhaW5pbmcgYXJlIGJldHRlciBwcmVwYXJlZCB0byBmb2N1cyBvbiBsZWFybmluZyBvdXRjb21lcywgYW5kIHNwZW5kIGxlc3MgdGltZSBkaXN0cmFjdGVkIGJ5IGNsZWFuaW5nIHVwIGFmdGVyIGVycm9ycy48L3A+J1xuICAgICAgICAgICAgICAnPHA+V2lsbCBjb21wbGV0aW9uIG9mIHRoZSBzdHVkZW50IHRyYWluaW5nIGJlIHBhcnQgb2YgeW91ciBzdHVkZW50c1xcJyBncmFkZXM/IChNYWtlIHlvdXIgY2hvaWNlIGF0IHRoZSB0b3AgbGVmdC4pPC9wPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IG1pbGVzdG9uZXMnXG4gICAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICAgICAgPGxpPkNyZWF0ZSBhIHVzZXIgYWNjb3VudCBhbmQgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+Q29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIER1cmluZyB0aGlzIHRyYWluaW5nLCB5b3Ugd2lsbCBtYWtlIGVkaXRzIGluIGEgc2FuZGJveCBhbmQgbGVhcm4gdGhlIGJhc2ljIHJ1bGVzIG9mIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5UbyBwcmFjdGljZSBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIFdpa2lwZWRpYSwgaW50cm9kdWNlIHlvdXJzZWxmIHRvIGFueSBXaWtpcGVkaWFucyBoZWxwaW5nIHlvdXIgY2xhc3MgKHN1Y2ggYXMgYSBXaWtpcGVkaWEgQW1iYXNzYWRvciksIGFuZCBsZWF2ZSBhIG1lc3NhZ2UgZm9yIGEgY2xhc3NtYXRlIG9uIHRoZWlyIHVzZXIgdGFsayBwYWdlLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZ2V0dGluZ19zdGFydGVkXCJcbiAgICAgICAgdGl0bGU6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBlYXJseSBlZGl0aW5nIHRhc2tzJ1xuICAgICAgICBpbnN0cnVjdGlvbnM6IFwiSXQgaXMgaW1wb3J0YW50IGZvciBzdHVkZW50cyB0byBzdGFydCBlZGl0aW5nIFdpa2lwZWRpYSBlYXJseSBvbi4gVGhhdCB3YXksIHRoZXkgYmVjb21lIGZhbWlsaWFyIHdpdGggV2lraXBlZGlhJ3MgbWFya3VwIChcXFwid2lraXN5bnRheFxcXCIsIFxcXCJ3aWtpbWFya3VwXFxcIiwgb3IgXFxcIndpa2ljb2RlXFxcIikgYW5kIHRoZSBtZWNoYW5pY3Mgb2YgZWRpdGluZyBhbmQgY29tbXVuaWNhdGluZyBvbiB0aGUgc2l0ZS4gV2UgcmVjb21tZW5kIGFzc2lnbmluZyBhIGZldyBiYXNpYyBXaWtpcGVkaWEgdGFza3MgZWFybHkgb24uXCJcbiAgICAgICAgZm9ybVRpdGxlOiAnV2hpY2ggYmFzaWMgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gaW5jbHVkZT8nXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPldoaWNoIGludHJvZHVjdG9yeSBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byB1c2UgdG8gYWNjbGltYXRlIHlvdXIgc3R1ZGVudHMgdG8gV2lraXBlZGlhPyBZb3UgY2FuIHNlbGVjdCBub25lLCBvbmUsIG9yIG1vcmUuIFdoaWNoZXZlciB5b3Ugc2VsZWN0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGFzc2lnbm1lbnQgdGltZWxpbmUuPC9wPidcbiAgICAgICAgICAgICAgJzx1bD5cbiAgICAgICAgICAgICAgICA8bGk+PHN0cm9uZz5Dcml0aXF1ZSBhbiBhcnRpY2xlLjwvc3Ryb25nPiBDcml0aWNhbGx5IGV2YWx1YXRlIGFuIGV4aXN0aW5nIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLCBhbmQgbGVhdmUgc3VnZ2VzdGlvbnMgZm9yIGltcHJvdmluZyBpdCBvbiB0aGUgYXJ0aWNsZeKAmXMgdGFsayBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPkFkZCB0byBhbiBhcnRpY2xlLjwvc3Ryb25nPiBVc2luZyBjb3Vyc2UgcmVhZGluZ3Mgb3Igb3RoZXIgcmVsZXZhbnQgc2Vjb25kYXJ5IHNvdXJjZXMsIGFkZCAx4oCTMiBzZW50ZW5jZXMgb2YgbmV3IGluZm9ybWF0aW9uIHRvIGEgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MuIEJlIHN1cmUgdG8gaW50ZWdyYXRlIGl0IHdlbGwgaW50byB0aGUgZXhpc3RpbmcgYXJ0aWNsZSwgYW5kIGluY2x1ZGUgYSBjaXRhdGlvbiB0byB0aGUgc291cmNlLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPkNvcHllZGl0IGFuIGFydGljbGUuPC9zdHJvbmc+IEJyb3dzZSBXaWtpcGVkaWEgdW50aWwgeW91IGZpbmQgYW4gYXJ0aWNsZSB0aGF0IHlvdSB3b3VsZCBsaWtlIHRvIGltcHJvdmUsIGFuZCBtYWtlIHNvbWUgZWRpdHMgdG8gaW1wcm92ZSB0aGUgbGFuZ3VhZ2Ugb3IgZm9ybWF0dGluZy4gPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+PHN0cm9uZz5JbGx1c3RyYXRlIGFuIGFydGljbGUuPC9zdHJvbmc+IEZpbmQgYW4gb3Bwb3J0dW5pdHkgdG8gaW1wcm92ZSBhbiBhcnRpY2xlIGJ5IHVwbG9hZGluZyBhbmQgYWRkaW5nIGEgcGhvdG8geW91IHRvb2suPC9saT5cbiAgICAgICAgICAgICAgPC91bD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkZvciBtb3N0IGNvdXJzZXMsIHRoZSA8ZW0+Q3JpdGlxdWUgYW4gYXJ0aWNsZTwvZW0+IGFuZCA8ZW0+QWRkIHRvIGFuIGFydGljbGU8L2VtPiBleGVyY2lzZXMgcHJvdmlkZSBhIG5pY2UgZm91bmRhdGlvbiBmb3IgdGhlIG1haW4gd3JpdGluZyBwcm9qZWN0LiBUaGVzZSBoYXZlIGJlZW4gc2VsZWN0ZWQgYnkgZGVmYXVsdC48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgICB0aXRsZTogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdIb3cgd2lsbCB5b3VyIGNsYXNzIHNlbGVjdCBhcnRpY2xlcz8nXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGNob29zaW5nIGFydGljbGVzJ1xuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5DaG9vc2luZyB0aGUgcmlnaHQgKG9yIHdyb25nKSBhcnRpY2xlcyB0byB3b3JrIG9uIGNhbiBtYWtlIChvciBicmVhaykgYSBXaWtpcGVkaWEgd3JpdGluZyBhc3NpZ25tZW50LjwvcD4nXG4gICAgICAgICAgICAgICc8cD5Tb21lIGFydGljbGVzIG1heSBpbml0aWFsbHkgbG9vayBlYXN5IHRvIGltcHJvdmUsIGJ1dCBxdWFsaXR5IHJlZmVyZW5jZXMgdG8gZXhwYW5kIHRoZW0gbWF5IGJlIGRpZmZpY3VsdCB0byBmaW5kLiBGaW5kaW5nIHRvcGljcyB3aXRoIHRoZSByaWdodCBiYWxhbmNlIGJldHdlZW4gcG9vciBXaWtpcGVkaWEgY292ZXJhZ2UgYW5kIGF2YWlsYWJsZSBsaXRlcmF0dXJlIGZyb20gd2hpY2ggdG8gZXhwYW5kIHRoYXQgY292ZXJhZ2UgY2FuIGJlIHRyaWNreS4gSGVyZSBhcmUgc29tZSBndWlkZWxpbmVzIHRvIGtlZXAgaW4gbWluZCB3aGVuIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgaW1wcm92ZW1lbnQuPC9wPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+Q2hvb3NlIGEgd2VsbC1lc3RhYmxpc2hlZCB0b3BpYyBmb3Igd2hpY2ggYSBsb3Qgb2YgbGl0ZXJhdHVyZSBpcyBhdmFpbGFibGUgaW4gaXRzIGZpZWxkLCBidXQgd2hpY2ggaXNuJ3QgY292ZXJlZCBleHRlbnNpdmVseSBvbiBXaWtpcGVkaWEuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+R3Jhdml0YXRlIHRvd2FyZCBcXFwic3R1YlxcXCIgYW5kIFxcXCJzdGFydFxcXCIgY2xhc3MgYXJ0aWNsZXMuIFRoZXNlIGFydGljbGVzIG9mdGVuIGhhdmUgb25seSAx4oCTMiBwYXJhZ3JhcGhzIG9mIGluZm9ybWF0aW9uIGFuZCBhcmUgaW4gbmVlZCBvZiBleHBhbnNpb24uIFJlbGV2YW50IFdpa2lQcm9qZWN0IHBhZ2VzIGNhbiBwcm92aWRlIGEgbGlzdCBvZiBzdHVicyB0aGF0IG5lZWQgaW1wcm92ZW1lbnQuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+QmVmb3JlIGNyZWF0aW5nIGEgbmV3IGFydGljbGUsIHNlYXJjaCByZWxhdGVkIHRvcGljcyBvbiBXaWtpcGVkaWEgdG8gbWFrZSBzdXJlIHlvdXIgdG9waWMgaXNuJ3QgYWxyZWFkeSBjb3ZlcmVkIGVsc2V3aGVyZS4gT2Z0ZW4sIGFuIGFydGljbGUgbWF5IGV4aXN0IHVuZGVyIGFub3RoZXIgbmFtZSwgb3IgdGhlIHRvcGljIG1heSBiZSBjb3ZlcmVkIGFzIGEgc3Vic2VjdGlvbiBvZiBhIGJyb2FkZXIgYXJ0aWNsZS48L2xpPlxuICAgICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnTm90IHN1Y2ggYSBnb29kIGNob2ljZSdcbiAgICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXJ0aWNsZXMgdGhhdCBhcmUgXCJub3Qgc3VjaCBhIGdvb2QgY2hvaWNlXCIgZm9yIG5ld2NvbWVycyB1c3VhbGx5IGludm9sdmUgYSBsYWNrIG9mIGFwcHJvcHJpYXRlIHJlc2VhcmNoIG1hdGVyaWFsLCBoaWdobHkgY29udHJvdmVyc2lhbCB0b3BpY3MgdGhhdCBtYXkgYWxyZWFkeSBiZSB3ZWxsIGRldmVsb3BlZCwgYnJvYWQgc3ViamVjdHMsIG9yIHRvcGljcyBmb3Igd2hpY2ggaXQgaXMgZGlmZmljdWx0IHRvIGRlbW9uc3RyYXRlIG5vdGFiaWxpdHkuPC9wPidcbiAgICAgICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICAgICAgPGxpPllvdSBwcm9iYWJseSBzaG91bGRuJ3QgdHJ5IHRvIGNvbXBsZXRlbHkgb3ZlcmhhdWwgYXJ0aWNsZXMgb24gdmVyeSBicm9hZCB0b3BpY3MgKGUuZy4sIExhdykuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+WW91IHNob3VsZCBwcm9iYWJseSBhdm9pZCB0cnlpbmcgdG8gaW1wcm92ZSBhcnRpY2xlcyBvbiB0b3BpY3MgdGhhdCBhcmUgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgKGZvciBleGFtcGxlLCBHbG9iYWwgV2FybWluZywgQWJvcnRpb24sIG9yIFNjaWVudG9sb2d5KS4gWW91IG1heSBiZSBtb3JlIHN1Y2Nlc3NmdWwgc3RhcnRpbmcgYSBzdWItYXJ0aWNsZSBvbiB0aGUgdG9waWMgaW5zdGVhZC48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Eb24ndCB3b3JrIG9uIGFuIGFydGljbGUgdGhhdCBpcyBhbHJlYWR5IG9mIGhpZ2ggcXVhbGl0eSBvbiBXaWtpcGVkaWEsIHVubGVzcyB5b3UgZGlzY3VzcyBhIHNwZWNpZmljIHBsYW4gZm9yIGltcHJvdmluZyBpdCB3aXRoIG90aGVyIGVkaXRvcnMgYmVmb3JlaGFuZC48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Bdm9pZCB3b3JraW5nIG9uIHNvbWV0aGluZyB3aXRoIHNjYXJjZSBsaXRlcmF0dXJlLiBXaWtpcGVkaWEgYXJ0aWNsZXMgY2l0ZSBzZWNvbmRhcnkgbGl0ZXJhdHVyZSBzb3VyY2VzLCBzbyBpdCdzIGltcG9ydGFudCB0byBoYXZlIGVub3VnaCBzb3VyY2VzIGZvciB2ZXJpZmljYXRpb24gYW5kIHRvIHByb3ZpZGUgYSBuZXV0cmFsIHBvaW50IG9mIHZpZXcuPC9saT5cbiAgICAgICAgICAgICAgICA8bGk+RG9uJ3Qgc3RhcnQgYXJ0aWNsZXMgd2l0aCB0aXRsZXMgdGhhdCBpbXBseSBhbiBhcmd1bWVudCBvciBlc3NheS1saWtlIGFwcHJvYWNoIChlLmcuLCBUaGUgRWZmZWN0cyBUaGF0IFRoZSBSZWNlbnQgU3ViLVByaW1lIE1vcnRnYWdlIENyaXNpcyBoYXMgaGFkIG9uIHRoZSBVUyBhbmQgR2xvYmFsIEVjb25vbWljcykuIFRoZXNlIHR5cGUgb2YgdGl0bGVzLCBhbmQgbW9zdCBsaWtlbHkgdGhlIGNvbnRlbnQgdG9vLCBtYXkgbm90IGJlIGFwcHJvcHJpYXRlIGZvciBhbiBlbmN5Y2xvcGVkaWEuPC9saT5cbiAgICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkFzIHRoZSBpbnN0cnVjdG9yLCB5b3Ugc2hvdWxkIGFwcGx5IHlvdXIgb3duIGV4cGVydGlzZSB0byBleGFtaW5pbmcgV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkLiBZb3UgdW5kZXJzdGFuZCB0aGUgYnJvYWRlciBpbnRlbGxlY3R1YWwgY29udGV4dCB3aGVyZSBpbmRpdmlkdWFsIHRvcGljcyBmaXQgaW4sIHlvdSBjYW4gcmVjb2duaXplIHdoZXJlIFdpa2lwZWRpYSBmYWxscyBzaG9ydCwgeW91IGtub3figJRvciBrbm93IGhvdyB0byBmaW5k4oCUdGhlIHJlbGV2YW50IGxpdGVyYXR1cmUsIGFuZCB5b3Uga25vdyB3aGF0IHRvcGljcyB5b3VyIHN0dWRlbnRzIHNob3VsZCBiZSBhYmxlIHRvIGhhbmRsZS4gWW91ciBndWlkYW5jZSBvbiBhcnRpY2xlIGNob2ljZSBhbmQgc291cmNpbmcgaXMgY3JpdGljYWwgZm9yIGJvdGggeW91ciBzdHVkZW50c+KAmSBzdWNjZXNzIGFuZCB0aGUgaW1wcm92ZW1lbnQgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5UaGVyZSBhcmUgdHdvIHJlY29tbWVuZGVkIG9wdGlvbnMgZm9yIHNlbGVjdGluZyBhcnRpY2xlczo8L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0luc3RydWN0b3IgcHJlcGFyZXMgYSBsaXN0J1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+WW91ICh0aGUgaW5zdHJ1Y3RvcikgcHJlcGFyZSBhIGxpc3Qgb2YgYXBwcm9wcmlhdGUgXFwnbm9uLWV4aXN0ZW50XFwnLCBcXCdzdHViXFwnIG9yIFxcJ3N0YXJ0XFwnIGFydGljbGVzIGFoZWFkIG9mIHRpbWUgZm9yIHRoZSBzdHVkZW50cyB0byBjaG9vc2UgZnJvbS4gSWYgcG9zc2libGUsIHlvdSBtYXkgd2FudCB0byB3b3JrIHdpdGggYW4gZXhwZXJpZW5jZWQgV2lraXBlZGlhbiB0byBjcmVhdGUgdGhlIGxpc3QuIEVhY2ggc3R1ZGVudCBjaG9vc2VzIGFuIGFydGljbGUgZnJvbSB0aGUgbGlzdCB0byB3b3JrIG9uLiBBbHRob3VnaCB0aGlzIHJlcXVpcmVzIG1vcmUgcHJlcGFyYXRpb24sIGl0IG1heSBoZWxwIHN0dWRlbnRzIHRvIHN0YXJ0IHJlc2VhcmNoaW5nIGFuZCB3cml0aW5nIHRoZWlyIGFydGljbGVzIHNvb25lci48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5FYWNoIHN0dWRlbnQgZXhwbG9yZXMgV2lraXBlZGlhIGFuZCBsaXN0cyAz4oCTNSB0b3BpY3Mgb24gdGhlaXIgV2lraXBlZGlhIHVzZXIgcGFnZSB0aGF0IHRoZXkgYXJlIGludGVyZXN0ZWQgaW4gZm9yIHRoZWlyIG1haW4gcHJvamVjdC4gWW91ICh0aGUgaW5zdHJ1Y3Rvcikgc2hvdWxkIGFwcHJvdmUgYXJ0aWNsZSBjaG9pY2VzIGJlZm9yZSBzdHVkZW50cyBwcm9jZWVkIHRvIHdyaXRpbmcuIEhhdmluZyBzdHVkZW50cyBmaW5kIHRoZWlyIG93biBhcnRpY2xlcyBwcm92aWRlcyB0aGVtIHdpdGggYSBzZW5zZSBvZiBtb3RpdmF0aW9uIGFuZCBvd25lcnNoaXAgb3ZlciB0aGUgYXNzaWdubWVudCBhbmQgZXhlcmNpc2VzIHRoZWlyIGNyaXRpY2FsIHRoaW5raW5nIHNraWxscyBhcyB0aGV5IGlkZW50aWZ5IGNvbnRlbnQgZ2FwcywgYnV0IGl0IG1heSBhbHNvIGxlYWQgdG8gY2hvaWNlcyB0aGF0IGFyZSBmdXJ0aGVyIGFmaWVsZCBmcm9tIGNvdXJzZSBtYXRlcmlhbC48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH0gXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwicmVzZWFyY2hfcGxhbm5pbmdcIlxuICAgICAgICB0aXRsZTogJ1Jlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgZm9ybVRpdGxlOiAnSG93IHNob3VsZCBzdHVkZW50cyBwbGFuIHRoZWlyIGFydGljbGVzPydcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgcmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPlN0dWRlbnRzIG9mdGVuIHdhaXQgdW50aWwgdGhlIGxhc3QgbWludXRlIHRvIGRvIHRoZWlyIHJlc2VhcmNoLCBvciBjaG9vc2Ugc291cmNlcyB1bnN1aXRhYmxlIGZvciBXaWtpcGVkaWEuIFRoYXQncyB3aHkgd2UgcmVjb21tZW5kIGFza2luZyBzdHVkZW50cyB0byBwdXQgdG9nZXRoZXIgYSBiaWJsaW9ncmFwaHkgb2YgbWF0ZXJpYWxzIHRoZXkgd2FudCB0byB1c2UgaW4gZWRpdGluZyB0aGUgYXJ0aWNsZSwgd2hpY2ggY2FuIHRoZW4gYmUgYXNzZXNzZWQgYnkgeW91IGFuZCBvdGhlciBXaWtpcGVkaWFucy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGVuLCBzdHVkZW50cyBzaG91bGQgcHJvcG9zZSBvdXRsaW5lcyBmb3IgdGhlaXIgYXJ0aWNsZXMuIFRoaXMgY2FuIGJlIGEgdHJhZGl0aW9uYWwgb3V0bGluZSwgaW4gd2hpY2ggc3R1ZGVudHMgaWRlbnRpZnkgd2hpY2ggc2VjdGlvbnMgdGhlaXIgYXJ0aWNsZXMgd2lsbCBoYXZlIGFuZCB3aGljaCBhc3BlY3RzIG9mIHRoZSB0b3BpYyB3aWxsIGJlIGNvdmVyZWQgaW4gZWFjaCBzZWN0aW9uLiBBbHRlcm5hdGl2ZWx5LCBzdHVkZW50cyBjYW4gZGV2ZWxvcCBlYWNoIG91dGxpbmUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uIOKAlCB0aGUgdW50aXRsZWQgc2VjdGlvbiBhdCB0aGUgYmVnaW5uaW5nIG9mIGFuIGFydGljbGUgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcHJvdmlkZSBhIGNvbmNpc2Ugc3VtbWFyeSBvZiBpdHMgY29udGVudC4gV291bGQgeW91IGxpa2UgeW91ciBzdHVkZW50cyB0byBjcmVhdGUgdHJhZGl0aW9uYWwgb3V0bGluZXMsIG9yIGNvbXBvc2Ugb3V0bGluZXMgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEtc3R5bGUgbGVhZCBzZWN0aW9uPzwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcImRyYWZ0c19tYWluc3BhY2VcIlxuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICB0aXRsZTogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgZHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICAgIGluc3RydWN0aW9uczogJ09uY2Ugc3R1ZGVudHMgaGF2ZSBnb3R0ZW4gYSBncmlwIG9uIHRoZWlyIHRvcGljcyBhbmQgdGhlIHNvdXJjZXMgdGhleSB3aWxsIHVzZSB0byB3cml0ZSBhYm91dCB0aGVtLCBpdOKAmXMgdGltZSB0byBzdGFydCB3cml0aW5nIG9uIFdpa2lwZWRpYS4gWW91IGNhbiBhc2sgdGhlbSB0byBqdW1wIHJpZ2h0IGluIGFuZCBlZGl0IGxpdmUsIG9yIHN0YXJ0IHRoZW0gb2ZmIGluIHRoZWlyIG93biBzYW5kYm94IHBhZ2VzLiBUaGVyZSBhcmUgcHJvcyBhbmQgY29ucyBvZiBlYWNoIGFwcHJvYWNoLidcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgb2Ygc2FuZGJveGVzJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPlNhbmRib3hlcyDigJQgcGFnZXMgYXNzb2NpYXRlZCB3aXRoIGFuIGluZGl2aWR1YWwgZWRpdG9yIHRoYXQgYXJlIG5vdCBjb25zaWRlcmVkIHBhcnQgb2YgV2lraXBlZGlhIHByb3BlciDigJQgbWFrZSBzdHVkZW50cyBmZWVsIHNhZmUuIFRoZXkgY2FuIGVkaXQgd2l0aG91dCB0aGUgcHJlc3N1cmUgb2YgdGhlIHdob2xlIHdvcmxkIHJlYWRpbmcgdGhlaXIgZHJhZnRzIG9yIG90aGVyIFdpa2lwZWRpYW5zIGFsdGVyaW5nIHRoZWlyIHdyaXRpbmcuIEhvd2V2ZXIsIHNhbmRib3ggZWRpdGluZyBsaW1pdHMgbWFueSBvZiB0aGUgdW5pcXVlIGFzcGVjdHMgb2YgV2lraXBlZGlhIGFzIGEgdGVhY2hpbmcgdG9vbCwgc3VjaCBhcyBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgYW5kIGluY3JlbWVudGFsIGRyYWZ0aW5nLiBTcGVuZGluZyBtb3JlIHRoYW4gYSB3ZWVrIG9yIHR3byBpbiBzYW5kYm94ZXMgaXMgc3Ryb25nbHkgZGlzY291cmFnZWQuPC9wPlwiIFxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgb2YgZWRpdGluZyBsaXZlJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPkVkaXRpbmcgbGl2ZSBpcyBleGNpdGluZyBmb3IgdGhlIHN0dWRlbnRzIGJlY2F1c2UgdGhleSBjYW4gc2VlIHRoZWlyIGNoYW5nZXMgdG8gdGhlIGFydGljbGVzIGltbWVkaWF0ZWx5IGFuZCBleHBlcmllbmNlIHRoZSBjb2xsYWJvcmF0aXZlIGVkaXRpbmcgcHJvY2VzcyB0aHJvdWdob3V0IHRoZSBhc3NpZ25tZW50LiBIb3dldmVyLCBiZWNhdXNlIG5ldyBlZGl0b3JzIG9mdGVuIHVuaW50ZW50aW9uYWxseSBicmVhayBXaWtpcGVkaWEgcnVsZXMsIHNvbWV0aW1lcyBzdHVkZW50c+KAmSBhZGRpdGlvbnMgYXJlIHF1ZXN0aW9uZWQgb3IgcmVtb3ZlZC48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiAnXCI8cD5XaWxsIHlvdSBoYXZlIHlvdXIgc3R1ZGVudHMgZHJhZnQgdGhlaXIgZWFybHkgd29yayBpbiBzYW5kYm94ZXMsIG9yIHdvcmsgbGl2ZSBmcm9tIHRoZSBiZWdpbm5pbmc/PC9wPlwiJ1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcInBlZXJfZmVlZGJhY2tcIlxuICAgICAgICB0aXRsZTogJ1BlZXIgZmVlZGJhY2snXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IHBlZXIgZmVlZGJhY2snXG4gICAgICAgIGZvcm1UaXRsZTogXCJIb3cgbWFueSBwZWVyIHJldmlld3Mgc2hvdWxkIGVhY2ggc3R1ZGVudCBjb25kdWN0P1wiXG4gICAgICAgIGluc3RydWN0aW9uczogXCJDb2xsYWJvcmF0aW9uIGlzIGEgY3JpdGljYWwgZWxlbWVudCBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhLlwiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+Rm9yIHNvbWUgc3R1ZGVudHMsIHRoaXMgd2lsbCBoYXBwZW4gc3BvbnRhbmVvdXNseTsgdGhlaXIgY2hvaWNlIG9mIHRvcGljcyB3aWxsIGF0dHJhY3QgaW50ZXJlc3RlZCBXaWtpcGVkaWFucyB3aG8gd2lsbCBwaXRjaCBpbiB3aXRoIGlkZWFzLCBjb3B5ZWRpdHMsIG9yIGV2ZW4gc3Vic3RhbnRpYWwgY29udHJpYnV0aW9ucyB0byB0aGUgc3R1ZGVudHPigJkgYXJ0aWNsZXMuIEluIG1hbnkgY2FzZXMsIGhvd2V2ZXIsIHRoZXJlIHdpbGwgYmUgbGl0dGxlIHNwb250YW5lb3VzIGVkaXRpbmcgb2Ygc3R1ZGVudHPigJkgYXJ0aWNsZXMgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIHRlcm0uIEZvcnR1bmF0ZWx5LCB5b3UgaGF2ZSBhIGNsYXNzcm9vbSBmdWxsIG9mIHBlZXIgcmV2aWV3ZXJzLiBZb3UgY2FuIG1ha2UgdGhlIG1vc3Qgb2YgdGhpcyBieSBhc3NpZ25pbmcgc3R1ZGVudHMgdG8gcmV2aWV3IGVhY2ggb3RoZXJz4oCZIGFydGljbGVzIHNvb24gYWZ0ZXIgZnVsbC1sZW5ndGggZHJhZnRzIGFyZSBwb3N0ZWQuIFRoaXMgZ2l2ZXMgc3R1ZGVudHMgcGxlbnR5IG9mIHRpbWUgdG8gYWN0IG9uIHRoZSBhZHZpY2Ugb2YgdGhlaXIgcGVlcnMuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+UGVlciByZXZpZXdzIGFyZSBhbm90aGVyIGNoYW5jZSBmb3Igc3R1ZGVudHMgdG8gcHJhY3RpY2UgY3JpdGljYWwgdGhpbmtpbmcuIFVzZWZ1bCByZXZpZXdzIGZvY3VzIG9uIHNwZWNpZmljIGlzc3VlcyB0aGF0IGNhbiBiZSBpbXByb3ZlZC4gU2luY2Ugc3R1ZGVudHMgYXJlIHVzdWFsbHkgaGVzaXRhbnQgdG8gY3JpdGljaXplIHRoZWlyIGNsYXNzbWF0ZXPigJRhbmQgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgbWF5IGdldCBhbm5veWVkIHdpdGggYSBzdHJlYW0gb2YgcHJhaXNlIGZyb20gc3R1ZGVudHMgdGhhdCBnbG9zc2VzIG92ZXIgYW4gYXJ0aWNsZSdzIHNob3J0Y29taW5nc+KAlGl0J3MgaW1wb3J0YW50IHRvIGdpdmVzIGV4YW1wbGVzIG9mIHRoZSBraW5kcyBvZiBjb25zdHJ1Y3RpdmVseSBjcml0aWNhbCBmZWVkYmFjayB0aGF0IGFyZSB0aGUgbW9zdCBoZWxwZnVsLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPkhvdyBtYW55IHBlZXIgcmV2aWV3cyB3aWxsIHlvdSBhc2sgZWFjaCBzdHVkZW50IHRvIGNvbnRyaWJ1dGUgZHVyaW5nIHRoZSBjb3Vyc2U/PC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwic3VwcGxlbWVudGFyeV9hc3NpZ25tZW50c1wiXG4gICAgICAgIHRpdGxlOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgZm9ybVRpdGxlOiAnQ2hvb3NlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgKG9wdGlvbmFsKTonXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJCeSB0aGUgdGltZSBzdHVkZW50cyBoYXZlIG1hZGUgaW1wcm92ZW1lbnRzIGJhc2VkIG9uIGNsYXNzbWF0ZXMnIGNvbW1lbnRz4oCUYW5kIGlkZWFsbHkgc3VnZ2VzdGlvbnMgZnJvbSB5b3UgYXMgd2VsbOKAlHRoZXkgc2hvdWxkIGhhdmUgcHJvZHVjZWQgbmVhcmx5IGNvbXBsZXRlIGFydGljbGVzLiBOb3cgaXMgdGhlIGNoYW5jZSB0byBlbmNvdXJhZ2UgdGhlbSB0byB3YWRlIGEgbGl0dGxlIGRlZXBlciBpbnRvIFdpa2lwZWRpYSBhbmQgaXRzIG5vcm1zIGFuZCBjcml0ZXJpYSB0byBjcmVhdGUgZ3JlYXQgY29udGVudC5cIlxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgIFwiPHA+WW914oCZbGwgcHJvYmFibHkgaGF2ZSBkaXNjdXNzZWQgbWFueSBvZiB0aGUgY29yZSBwcmluY2lwbGVzIG9mIFdpa2lwZWRpYeKAlGFuZCByZWxhdGVkIGlzc3VlcyB5b3Ugd2FudCB0byBmb2N1cyBvbuKAlGJ1dCBub3cgdGhhdCB0aGV54oCZdmUgZXhwZXJpZW5jZWQgZmlyc3QtaGFuZCBob3cgV2lraXBlZGlhIHdvcmtzLCB0aGlzIGlzIGEgZ29vZCB0aW1lIHRvIHJldHVybiB0byB0b3BpY3MgbGlrZSBuZXV0cmFsaXR5LCBtZWRpYSBmbHVlbmN5LCBhbmQgdGhlIGltcGFjdHMgYW5kIGxpbWl0cyBvZiBXaWtpcGVkaWEuIENvbnNpZGVyIGJyaW5naW5nIGluIGEgZ3Vlc3Qgc3BlYWtlciwgaGF2aW5nIGEgcGFuZWwgZGlzY3Vzc2lvbiwgb3Igc2ltcGx5IGhhdmluZyBhbiBvcGVuIGRpc2N1c3Npb24gaW4gY2xhc3MgYWJvdXQgd2hhdCB0aGUgc3R1ZGVudHMgaGF2ZSBkb25lIHNvIGZhciBhbmQgd2h5IChvciB3aGV0aGVyKSBpdCBtYXR0ZXJzLjwvcD5cIlxuICAgICAgICAgICAgIFwiPHA+SW4gYWRkaXRpb24gdG8gdGhlIFdpa2lwZWRpYSBhcnRpY2xlIHdyaXRpbmcgaXRzZWxmLCB5b3UgbWF5IHdhbnQgdG8gdXNlIGEgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50LiBUaGVzZSBhc3NpZ25tZW50cyBjYW4gcmVpbmZvcmNlIGFuZCBkZWVwZW4geW91ciBjb3Vyc2UncyBsZWFybmluZyBvdXRjb21lcywgYW5kIGFsc28gaGVscCB5b3UgdG8gdW5kZXJzdGFuZCBhbmQgZXZhbHVhdGUgdGhlIHN0dWRlbnRzJyB3b3JrIGFuZCBsZWFybmluZyBvdXRjb21lcy4gT24gdGhlIGxlZnQgYXJlIHNvbWUgb2YgdGhlIGVmZmVjdGl2ZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzIHRoYXQgaW5zdHJ1Y3RvcnMgb2Z0ZW4gdXNlLiBTY3JvbGwgb3ZlciBlYWNoIGZvciBtb3JlIGluZm9ybWF0aW9uLCBhbmQgc2VsZWN0IGFueSB0aGF0IHlvdSB3aXNoIHRvIHVzZSBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZHlrXCJcbiAgICAgICAgdGl0bGU6ICdEWUsgcHJvY2VzcydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IHRoZSA8ZW0+RGlkIFlvdSBLbm93PC9lbT4gcHJvY2VzcydcbiAgICAgICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgRFlLIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPkRpZCBZb3UgS25vdyAoRFlLKSBpcyBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgaGlnaGxpZ2h0aW5nIG5ldyBjb250ZW50IHRoYXQgaGFzIGJlZW4gYWRkZWQgdG8gV2lraXBlZGlhIGluIHRoZSBsYXN0IHNldmVuIGRheXMuIERZSyBjYW4gYmUgYSBncmVhdCBvcHBvcnR1bml0eSB0byBnZXQgc3R1ZGVudHMgZXhjaXRlZCBhYm91dCB0aGVpciB3b3JrLiBBIHR5cGljYWwgRFlLIGFydGljbGUgd2lsbCBiZSB2aWV3ZWQgaHVuZHJlZHMgb3IgdGhvdXNhbmRzIG9mIHRpbWVzIGR1cmluZyBpdHMgNiBob3VycyBpbiB0aGUgc3BvdGxpZ2h0LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZSBnZW5lcmFsIGNyaXRlcmlhIGZvciBEWUsgZWxpZ2liaWxpdHkgYXJlIHRoYXQgYW4gYXJ0aWNsZSBpcyBsYXJnZXIgdGhhbiAxLDUwMCBjaGFyYWN0ZXJzIG9mIG9yaWdpbmFsLCB3ZWxsLXNvdXJjZWQgY29udGVudCAoYWJvdXQgZm91ciBwYXJhZ3JhcGhzKSBhbmQgdGhhdCBpdCBoYXMgYmVlbiBjcmVhdGVkIG9yIGV4cGFuZGVkIChieSBhIGZhY3RvciBvZiA1eCBvciBtb3JlKSB3aXRoaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy4gU3R1ZGVudHMgd2hvIG1lZXQgdGhpcyBjcml0ZXJpYSBtYXkgd2FudCB0byBub21pbmF0ZSB0aGVpciBjb250cmlidXRpb25zIGZvciBEWUsuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYXMgdGhlIERZSyBub21pbmF0aW9uIHByb2Nlc3MgY2FuIGJlIGRpZmZpY3VsdCBmb3IgbmV3Y29tZXJzIHRvIG5hdmlnYXRlLiBIb3dldmVyLCBpdCBtYWtlcyBhIGdyZWF0IHN0cmV0Y2ggZ29hbCB3aGVuIHVzZWQgc2VsZWN0aXZlbHkuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+V291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gaGVscCB5b3UgYW5kIHlvdXIgc3R1ZGVudHMgZHVyaW5nIHRoZSB0ZXJtIHRvIGlkZW50aWZ5IHdvcmsgdGhhdCBtYXkgYmUgYSBnb29kIGNhbmRpZGF0ZSBmb3IgRFlLIGFuZCBhbnN3ZXIgcXVlc3Rpb25zIHlvdSBtYXkgaGF2ZSBhYm91dCB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiBcImdhXCJcbiAgICAgICAgdGl0bGU6ICdHb29kIEFydGljbGUgcHJvY2VzcydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IHRoZSA8ZW0+R29vZCBBcnRpY2xlPC9lbT4gcHJvY2VzcydcbiAgICAgICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5XZWxsLWRldmVsb3BlZCBhcnRpY2xlcyB0aGF0IGhhdmUgcGFzc2VkIGEgR29vZCBBcnRpY2xlIChHQSkgcmV2aWV3IGFyZSBhIHN1YnN0YW50aWFsIGFjaGlldmVtZW50IGluIHRoZWlyIG93biByaWdodCwgYW5kIGNhbiBhbHNvIHF1YWxpZnkgZm9yIERZSy4gVGhpcyBwZWVyIHJldmlldyBwcm9jZXNzIGludm9sdmVzIGNoZWNraW5nIGEgcG9saXNoZWQgYXJ0aWNsZSBhZ2FpbnN0IFdpa2lwZWRpYSdzIEdBIGNyaXRlcmlhOiBhcnRpY2xlcyBtdXN0IGJlIHdlbGwtd3JpdHRlbiwgdmVyaWZpYWJsZSBhbmQgd2VsbC1zb3VyY2VkIHdpdGggbm8gb3JpZ2luYWwgcmVzZWFyY2gsIGJyb2FkIGluIGNvdmVyYWdlLCBuZXV0cmFsLCBzdGFibGUsIGFuZCBhcHByb3ByaWF0ZWx5IGlsbHVzdHJhdGVkICh3aGVuIHBvc3NpYmxlKS4gUHJhY3RpY2FsbHkgc3BlYWtpbmcsIGEgcG90ZW50aWFsIEdvb2QgQXJ0aWNsZSBzaG91bGQgbG9vayBhbmQgc291bmQgbGlrZSBvdGhlciB3ZWxsLWRldmVsb3BlZCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGFuZCBpdCBzaG91bGQgcHJvdmlkZSBhIHNvbGlkLCB3ZWxsLWJhbGFuY2VkIHRyZWF0bWVudCBvZiBpdHMgc3ViamVjdC48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSB3ZWxsLWRldmVsb3BlZC4gVHlwaWNhbGx5LCByZXZpZXdlcnMgd2lsbCBpZGVudGlmeSBmdXJ0aGVyIHNwZWNpZmljIGFyZWFzIGZvciBpbXByb3ZlbWVudCwgYW5kIHRoZSBhcnRpY2xlIHdpbGwgYmUgcHJvbW90ZWQgdG8gR29vZCBBcnRpY2xlIHN0YXR1cyBpZiBhbGwgdGhlIHJldmlld2VycycgY29uY2VybnMgYXJlIGFkZHJlc3NlZC4gQmVjYXVzZSBvZiB0aGUgdW5jZXJ0YWluIHRpbWVsaW5lIGFuZCB0aGUgZnJlcXVlbnQgbmVlZCB0byBtYWtlIHN1YnN0YW50aWFsIGNoYW5nZXMgdG8gYXJ0aWNsZXMsIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyB1c3VhbGx5IG9ubHkgbWFrZSBzZW5zZSBmb3IgYXJ0aWNsZXMgdGhhdCByZWFjaCBhIG1hdHVyZSBzdGF0ZSBzZXZlcmFsIHdlZWtzIGJlZm9yZSB0aGUgZW5kIG9mIHRlcm0sIGFuZCB0aG9zZSB3cml0dGVuIGJ5IHN0dWRlbnQgZWRpdG9ycyB3aG8gYXJlIGFscmVhZHkgZXhwZXJpZW5jZWQsIHN0cm9uZyB3cml0ZXJzIGFuZCB3aG8gYXJlIHdpbGxpbmcgdG8gY29tZSBiYWNrIHRvIGFkZHJlc3MgcmV2aWV3ZXIgZmVlZGJhY2sgKGV2ZW4gYWZ0ZXIgdGhlIHRlcm0gZW5kcyk8L2VtPi48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoaXMgYXMgYW4gdW5ncmFkZWQgb3B0aW9uPyBJZiBzbywgdGhlIFdpa2kgRWQgdGVhbSBjYW4gcHJvdmlkZSBhZHZpY2UgYW5kIHN1cHBvcnQgdG8gaGlnaC1hY2hpZXZpbmcgc3R1ZGVudHMgd2hvIGFyZSBpbnRlcmVzdGVkIGluIHRoZSBHb29kIEFydGljbGUgcHJvY2Vzcy48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiZ3JhZGluZ1wiXG4gICAgICAjICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgICAgIyAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgICAgXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJvdmVydmlld1wiXG4gICAgICAjICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiXCJcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICMgICAgICAgICBcIjx1bD5cbiAgICAgICMgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICMgICAgICAgICA8L3VsPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICAgICBcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHAgY2xhc3M9J2Rlc2NyaXB0aW9uLWNvbnRhaW5lcicgc3R5bGU9J21hcmdpbi1ib3R0b206MDsnPjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPGRpdiBjbGFzcz0nZm9ybS1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgPGZvcm0gaWQ9J2NvdXJzZUxlbmd0aCcgb25pbnB1dD0nb3V0LnZhbHVlID0gcGFyc2VJbnQoY291cnNlTGVuZ3RoLnZhbHVlKTsgb3V0Mi52YWx1ZSA9IHBhcnNlSW50KGNvdXJzZUxlbmd0aC52YWx1ZSk7JyBvbnN1Ym1pdD0ncmV0dXJuIGZhbHNlJz5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSd0ZXJtU3RhcnREYXRlJz5UZXJtIGJlZ2luczwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSd0ZXJtU3RhcnREYXRlJyBuYW1lPSd0ZXJtU3RhcnREYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcicgc3R5bGU9J2Rpc3BsYXk6IG5vbmU7Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSd0ZXJtRW5kRGF0ZSc+VGVybSBlbmRzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3Rlcm1FbmREYXRlJyBuYW1lPSd0ZXJtRW5kRGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8IS0tICVkaXYub3ZlcnZpZXctaW5wdXQtY29udGFpbmVyIC0tPlxuICAgICAgIyAgICAgICAgICAgICA8IS0tICVsYWJlbHs6Zm9yID0+ICdlbmREYXRlJ30gRW5kIFdlZWsgb2YgLS0+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWlucHV0ezp0eXBlID0+ICdkYXRlJywgOmlkID0+ICdlbmREYXRlJywgOm5hbWUgPT4gJ2VuZERhdGUnfSAtLT5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VTdGFydERhdGUnPkNvdXJzZSBzdGFydHMgb248L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0nY291cnNlU3RhcnREYXRlJyBuYW1lPSdjb3Vyc2VTdGFydERhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT0nZGlzcGxheTogbm9uZTsnPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3N0YXJ0V2Vla09mRGF0ZSc+U3RhcnQgd2VlayBvZjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdzdGFydFdlZWtPZkRhdGUnIG5hbWU9J3N0YXJ0V2Vla09mRGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInIHN0eWxlPSdkaXNwbGF5OiBub25lOyc+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nZW5kV2Vla09mRGF0ZSc+RW5kIHdlZWsgb2Y8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0nZW5kV2Vla09mRGF0ZScgbmFtZT0nZW5kV2Vla09mRGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J2NvdXJzZUxlbmd0aCc+Q291cnNlIExlbmd0aDwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGRlZmF1bHRWYWx1ZT0nMTYnIGlkPSdjTGVuZ3RoJyBtYXg9JzE2JyBtaW49JzYnIG5hbWU9J2NvdXJzZUxlbmd0aCcgc3RlcD0nMScgdHlwZT0ncmFuZ2UnIHZhbHVlPScxNic+XG4gICAgICAjICAgICAgICAgICAgICAgPG91dHB1dCBuYW1lPSdvdXQyJz4xNjwvb3V0cHV0PlxuICAgICAgIyAgICAgICAgICAgICAgIDxzcGFuPndlZWtzPC9zcGFuPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nbW9uZGF5JyBuYW1lPSdNb25kYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMCc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdtb25kYXknPk1vbmRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3R1ZXNkYXknIG5hbWU9J1R1ZXNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMSc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSd0dWVzZGF5Jz5UdWVzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nd2VkbmVzZGF5JyBuYW1lPSdXZWRuZXNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSd3ZWRuZXNkYXknPldlZG5lc2RheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3RodXJzZGF5JyBuYW1lPSdUaHVyc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSczJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3RodXJzZGF5Jz5UaHVyc2RheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J2ZyaWRheScgbmFtZT0nRnJpZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzQnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nZnJpZGF5Jz5GcmlkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdzYXR1cmRheScgbmFtZT0nU2F0dXJkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNSc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdzYXR1cmRheSc+U2F0dXJkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdzdW5kYXknIG5hbWU9J1N1bmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSc2Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3N1bmRheSc+U3VuZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1yZWFkb3V0LWhlYWRlcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ncmVhZG91dCc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8b3V0cHV0IGZvcj0nY291cnNlTGVuZ3RoJyBpZD0nY291cnNlTGVuZ3RoUmVhZG91dCcgbmFtZT0nb3V0Jz4xNjwvb3V0cHV0PlxuICAgICAgIyAgICAgICAgICAgICAgICAgPHNwYW4+d2Vla3M8L3NwYW4+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgPC9mb3JtPlxuICAgICAgIyAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgIDxkaXY+XG4gICAgICAjICAgICAgICAgICA8ZGl2IGNsYXNzPSdwcmV2aWV3LWNvbnRhaW5lcic+PC9kaXY+XG4gICAgICAjICAgICAgICAgPC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8ZGl2IGNsYXNzPSdzdGVwLWZvcm0tZGF0ZXMnPjwvZGl2PlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICcnXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPjxhIGlkPSdwdWJsaXNoJyBocmVmPScjJyBjbGFzcz0nYnV0dG9uJyBzdHlsZT0nZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Jz5QdWJsaXNoPC9hPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgIF1cbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgIG11bHRpbWVkaWE6IFtcbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm11bHRpbWVkaWFfMVwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICMgICB0aXRsZTogJ011bHRpbWVkaWEgc3RlcCAxJ1xuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJtdWx0aW1lZGlhXzJcIlxuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAjICAgdGl0bGU6ICdNdWx0aW1lZGlhIHN0ZXAgMidcbiAgICAgICMgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICMgICBpbmZvVGl0bGU6ICdJbnN0cnVjdGlvbiBUaXRsZSdcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6IFwiU3RlcCBJbnN0cnVjdGlvbnNcIlxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgIF1cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiZ3JhZGluZ19tdWx0aW1lZGlhXCJcbiAgICAgICMgICB0eXBlOiBcImdyYWRpbmdcIlxuICAgICAgIyAgIHRpdGxlOiAnR3JhZGluZydcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICAgIFxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgICMgICB0eXBlOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgdGhlIGNvdXJzZVwiXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIlwiXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAjICAgICAgICAgXCI8dWw+XG4gICAgICAjICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAjICAgICAgICAgPC91bD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAgICAgXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgY29weWVkaXQ6IFtcbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImNvcHllZGl0XzFcIlxuICAgICAgIyAgIHRpdGxlOiAnQ29weSBFZGl0IHN0ZXAgMSdcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJjb3B5ZWRpdF8yXCJcbiAgICAgICMgICB0aXRsZTogJ0NvcHkgRWRpdCBzdGVwIDInXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICMgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICMgICBpbmZvVGl0bGU6ICdJbnN0cnVjdGlvbiBUaXRsZSdcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6IFwiU3RlcCBJbnN0cnVjdGlvbnNcIlxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgIF1cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiZ3JhZGluZ19jb3B5ZWRpdFwiXG4gICAgICAjICAgdHlwZTogXCJncmFkaW5nXCJcbiAgICAgICMgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgICBcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICB0eXBlOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgIyAgICAgICAgIFwiPHVsPlxuICAgICAgIyAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgIyAgICAgICAgIDwvdWw+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgICAgIFxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cCBjbGFzcz0nZGVzY3JpcHRpb24tY29udGFpbmVyJz48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8ZGl2IGNsYXNzPSdzdGVwLWZvcm0tZGF0ZXMnPjwvZGl2PlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICcnXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPjxhIGlkPSdwdWJsaXNoJyBocmVmPScjJyBjbGFzcz0nYnV0dG9uJyBzdHlsZT0nZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Jz5QdWJsaXNoPC9hPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgIF1cbiAgfVxuICBvdXRyb19zdGVwczogW1xuICAgIHtcbiAgICAgIGlkOiBcImdyYWRpbmdcIlxuICAgICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICBcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICAgIGlucHV0czogW11cbiAgICB9XG4gICAge1xuICAgICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICBpbmZvVGl0bGU6IFwiQWJvdXQgdGhlIGNvdXJzZVwiXG4gICAgICBmb3JtVGl0bGU6IFwiXCJcbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB7XG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cCBjbGFzcz0nZGVzY3JpcHRpb24tY29udGFpbmVyJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTowOyc+PC9wPlwiXG4gICAgICAgICAgICBcIjxkaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyJz48L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgICMge1xuICAgICAgICAjICAgY29udGVudDogW1xuICAgICAgICAjICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICAgIyAgIF1cbiAgICAgICAgIyB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPjxhIGlkPSdwdWJsaXNoJyBocmVmPScjJyBjbGFzcz0nYnV0dG9uJyBzdHlsZT0nZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Jz5QdWJsaXNoPC9hPjwvcD5cIlxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgICAgaW5wdXRzOiBbXVxuICAgIH1cbiAgXVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvbmZpZ1xuXG4iLCIjIyBUSElTIEZJTEUgSVMgVEhFIERBVEEgU09VUlNFIEZPUiBBU1NJR05NRU5UIFRZUEUgSE9WRVIgSU5GT1JNQVRJT04gIyNcblxuV2l6YXJkQ291cnNlSW5mbyA9IFxuXG4gICMgUkVTRUFSQ0ggQU5EIFdSSVRFIEEgV0lLSVBFRElBIEFSVElDTEVcbiAgcmVzZWFyY2h3cml0ZTogXG4gICAgdGl0bGU6IFwiUmVzZWFyY2ggYW5kIHdyaXRlIGEgV2lraXBlZGlhIGFydGljbGVcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIllvdSBndWlkZSB5b3VyIHN0dWRlbnRzIHRvIHNlbGVjdCBjb3Vyc2UtcmVsYXRlZCB0b3BpY3MgdGhhdCBhcmUgbm90IHdlbGwtY292ZXJlZCBvbiBXaWtpcGVkaWEsIGFuZCB0aGV5IHdvcmsgaW5kaXZpZHVhbGx5IG9yIGluIHNtYWxsIHRlYW1zIHRvIGRldmVsb3AgY29udGVudCDigJQgZWl0aGVyIGV4cGFuZGluZyBleGlzdGluZyBhcnRpY2xlcyBvciBjcmVhdGluZyBuZXcgb25lcy4gU3R1ZGVudHMgYW5hbHl6ZSB0aGUgY3VycmVudCBnYXBzLCBzdGFydCB0aGVpciByZXNlYXJjaCB0byBmaW5kIGhpZ2gtcXVhbGl0eSBzZWNvbmRhcnkgc291cmNlcywgYW5kIHRoZW4gY29uc2lkZXIgdGhlIGJlc3Qgd2F5IHRvIG9yZ2FuaXplIHRoZSBhdmFpbGFibGUgaW5mb3JtYXRpb24uIFRoZW4gaXQncyB0aW1lIGZvciB0aGVtIGluIHR1cm4gdG86IHByb3Bvc2UgYW4gb3V0bGluZTsgZHJhZnQgbmV3IGFydGljbGVzIG9yIG5ldyBjb250ZW50IGZvciBleGlzdGluZyBvbmVzOyBwcm92aWRlIGFuZCByZXNwb25kIHRvIHBlZXIgZmVlZGJhY2s7IGFuZCBtb3ZlIHRoZWlyIHdvcmsgaW50byB0aGUgbGl2ZSBhcnRpY2xlIG5hbWVzcGFjZSBvbiBXaWtpcGVkaWEuXCJcbiAgICAgIFwiQWxvbmcgdGhlIHdheSwgc3R1ZGVudHMgbWF5IHdvcmsgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWEgZWRpdG9ycyB3aG8gY2FuIG9mZmVyIGNyaXRpY2FsIGZlZWRiYWNrIGFuZCBoZWxwIG1ha2Ugc3VyZSBhcnRpY2xlcyBtZWV0IFdpa2lwZWRpYSdzIHN0YW5kYXJkcyBhbmQgc3R5bGUgY29udmVudGlvbnMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBpbmNvcnBvcmF0ZSB0aW1lIGludG8gdGhlIGFzc2lnbm1lbnQgZm9yIHRoZSBzdHVkZW50cyB0byBpbnRlZ3JhdGUgdGhvc2Ugc3VnZ2VzdGlvbnMuIFN0dWRlbnRzIHdobyBkbyBncmVhdCB3b3JrIG1heSBoYXZlIHRoZWlyIGFydGljbGVzIGhpZ2hsaWdodGVkIG9uIFdpa2lwZWRpYSdzIG1haW4gcGFnZSwgYW5kIGhpZ2ggcXVhbGl0eSBhcnRpY2xlcyB3aWxsIGhlbHAgaW5mb3JtIHRob3VzYW5kcyBvZiBmdXR1cmUgcmVhZGVycyBhYm91dCB0aGUgc2VsZWN0ZWQgdG9waWMuIFwiXG4gICAgICBcIk9wdGlvbmFsbHksIHlvdSBtYXkgYXNrIHlvdXIgc3R1ZGVudHMgdG8gd3JpdGUgYSByZWZsZWN0aXZlIHBhcGVyIGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlLCBwcmVzZW50IHRoZWlyIGNvbnRyaWJ1dGlvbnMgaW4gY2xhc3MsIG9yIGRldmVsb3AgdGhlaXIgb3duIGNvbmNsdXNpb25zIGFuZCBhcmd1bWVudHMgaW4gYSBzdXBwbGVtZW50YXJ5IGVzc2F5LlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMTIgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkNsYXNzZXMgd2l0aCBmZXdlciB0aGFuIDMwIHN0dWRlbnRzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkcyBvciBncmFkIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJMYXJnZSBzdXJ2ZXkgY2xhc3Nlc1wiXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHdyaXRpbmcgc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBTT1VSQ0UtQ0VOVEVSRUQgQURESVRJT05TXG4gIHNvdXJjZWNlbnRlcmVkOiBcbiAgICB0aXRsZTogXCJTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyByZWFkIFdpa2lwZWRpYSBhcnRpY2xlcyBpbiBhIHNlbGYtc2VsZWN0ZWQgc3ViamVjdCBhcmVhIHRvIGlkZW50aWZ5IGFydGljbGVzIGluIG5lZWQgb2YgcmV2aXNpb24gb3IgaW1wcm92ZW1lbnQsIHN1Y2ggYXMgdGhvc2Ugd2l0aCBcXFwiY2l0YXRpb24gbmVlZGVkXFxcIiB0YWdzLiBTdHVkZW50cyB3aWxsIGZpbmQgcmVsaWFibGUgc291cmNlcyB0byB1c2UgYXMgcmVmZXJlbmNlcyBmb3IgdW5jaXRlZCBjb250ZW50LiBUaGlzIGFzc2lnbm1lbnQgaW5jbHVkZXMgYSBwZXJzdWFzaXZlIGVzc2F5IGluIHdoaWNoIHN0dWRlbnRzIG1ha2UgYSBjYXNlIGZvciB0aGVpciBzdWdnZXN0ZWQgY2hhbmdlcywgd2h5IHRoZXkgYmVsaWV2ZSB0aGV5IGFyZSBxdWFsaWZpZWQgdG8gbWFrZSB0aG9zZSBjaGFuZ2VzLCBhbmQgd2h5IHRoZWlyIHNlbGVjdGVkIHNvdXJjZXMgcHJvdmlkZSBzdXBwb3J0LiBBZnRlciBtYWtpbmcgdGhlaXIgY29udHJpYnV0aW9ucywgc3R1ZGVudHMgcmVmbGVjdCBvbiB0aGVpciB3b3JrIHdpdGggYSBmb3JtYWwgcGFwZXIsIGFuZCBkaXNjdXNzIHdoZXRoZXIgdGhleSd2ZSBhY2NvbXBsaXNoZWQgdGhlaXIgc3RhdGVkIGdvYWxzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2UgY2xhc3Nlc1wiXG4gICAgICBcIkFkdmFuY2VkIHVuZGVyZ3JhZHVhdGVzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEZJTkQgQU5EIEZJWCBFUlJPUlNcbiAgZmluZGZpeDogXG4gICAgdGl0bGU6IFwiRmluZCBhbmQgZml4IGVycm9yc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGZpbmQgYW4gYXJ0aWNsZSBhYm91dCBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHdpdGggd2hpY2ggdGhleSBhcmUgZXh0cmVtZWx5IGZhbWlsaWFyIHRoYXQgaGFzIHNvbWUgbWlzdGFrZXMuIFN0dWRlbnRzIHRha2Ugd2hhdCB0aGV5IGtub3cgYWJvdXQgdGhlIHRvcGljLCBmaW5kIGZhY3R1YWwgZXJyb3JzIGFuZCBvdGhlciBzdWJzdGFudGl2ZSBtaXN0YWtlcywgYW5kIGNvcnJlY3QgdGhvc2UuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJHcmFkdWF0ZSBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cbiAgcGxhZ2lhcmlzbTogXG4gICAgdGl0bGU6IFwiSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBzZWFyY2ggdGhyb3VnaCBXaWtpcGVkaWEgYXJ0aWNsZXMgdG8gZmluZCBpbnN0YW5jZXMgb2YgY2xvc2UgcGFyYXBocmFzaW5nIG9yIHBsYWdpYXJpc20sIHRoZW4gcmV3b3JkIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGVpciBvd24gbGFuZ3VhZ2UgdG8gYmUgYXBwcm9wcmlhdGUgZm9yIFdpa2lwZWRpYS4gSW4gdGhpcyBhc3NpZ25tZW50LCBzdHVkZW50cyBnYWluIGEgZGVlcGVyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBwbGFnaWFyaXNtIGlzIGFuZCBob3cgdG8gYXZvaWQgaXQuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJUQkRcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI1RSQU5TTEFURSBBTiBBUlRJQ0xFIFRPIEVOR0xJU0hcbiAgdHJhbnNsYXRlOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlRoaXMgaXMgYSBwcmFjdGljYWwgYXNzaWdubWVudCBmb3IgbGFuZ3VhZ2UgaW5zdHJ1Y3RvcnMuIFN0dWRlbnRzIHNlbGVjdCBhIFdpa2lwZWRpYSBhcnRpY2xlIGluIHRoZSBsYW5ndWFnZSB0aGV5IGFyZSBzdHVkeWluZywgYW5kIHRyYW5zbGF0ZSBpdCBpbnRvIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gU3R1ZGVudHMgc2hvdWxkIHN0YXJ0IHdpdGggaGlnaC1xdWFsaXR5IGFydGljbGVzIHdoaWNoIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gVGhpcyBhc3NpZ25tZW50IHByb3ZpZGVzIHByYWN0aWNhbCB0cmFuc2xhdGlvbiBhZHZpY2Ugd2l0aCB0aGUgaW5jZW50aXZlIG9mIHJlYWwgcHVibGljIHNlcnZpY2UsIGFzIHN0dWRlbnRzIGV4cGFuZCB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRhcmdldCBjdWx0dXJlIG9uIFdpa2lwZWRpYS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYrIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYW5ndWFnZSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB0cmFuc2xhdGluZyA8ZW0+ZnJvbTwvZW0+IHRoZWlyIG5hdGl2ZSBsYW5ndWFnZSB0byB0aGUgbGFuZ3VhZ2UgdGhleSdyZSBzdHVkeWluZ1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0NPUFkgRURJVElOR1xuICBjb3B5ZWRpdDogXG4gICAgdGl0bGU6IFwiQ29weWVkaXRcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIGFyZSBhc2tlZCB0byBjb3B5ZWRpdCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGVuZ2FnaW5nIGVkaXRvcnMgaW4gY29udmVyc2F0aW9uIGFib3V0IHRoZWlyIHdyaXRpbmcgYW5kIGltcHJvdmluZyB0aGUgY2xhcml0eSBvZiB0aGUgbGFuZ3VhZ2Ugb2YgdGhlIG1hdGVyaWFsLiBTdHVkZW50cyBsZWFybiB0byB3cml0ZSBpbiBkaWZmZXJlbnQgdm9pY2VzIGZvciBkaWZmZXJlbnQgYXVkaWVuY2VzLiBJbiBsZWFybmluZyBhYm91dCB0aGUgc3BlY2lmaWMgdm9pY2Ugb24gV2lraXBlZGlhLCB0aGV5IGxlYXJuIGFib3V0IHRoZSDigJxhdXRob3JpdGF0aXZl4oCdIHZvaWNlIGFuZCBob3cgaXRzIHRvbmUgY2FuIGNvbnZpbmNlLCBldmVuIGlmIHRoZSBjb250ZW50IGlzIHF1ZXN0aW9uYWJsZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkVuZ2xpc2ggZ3JhbW1hciBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB3aXRob3V0IHN0cm9uZyB3cml0aW5nIHNraWxsc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0VWQUxVQVRFIEFSVElDTEVTXG4gIGV2YWx1YXRlOiBcbiAgICB0aXRsZTogXCJFdmFsdWF0ZSBhcnRpY2xlc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiRmlyc3QsIHN0dWRlbnRzIHdyaXRlIGEgcmVwb3J0IGFuYWx5emluZyB0aGUgc3RhdGUgb2YgV2lraXBlZGlhIGFydGljbGVzIG9uIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB3aXRoIGFuIGV5ZSB0b3dhcmQgZnV0dXJlIHJldmlzaW9ucy4gVGhpcyBlbmNvdXJhZ2VzIGEgY3JpdGljYWwgcmVhZGluZyBvZiBib3RoIGNvbnRlbnQgYW5kIGZvcm0uIFRoZW4sIHRoZSBzdHVkZW50cyBlZGl0IGFydGljbGVzIGluIHNhbmRib3hlcyB3aXRoIGZlZWRiYWNrIGZyb20gdGhlIHByb2Zlc3NvciwgY2FyZWZ1bGx5IHNlbGVjdGluZyBhbmQgYWRkaW5nIHJlZmVyZW5jZXMgdG8gaW1wcm92ZSB0aGUgYXJ0aWNsZSBiYXNlZCBvbiB0aGVpciBjcml0aWNhbCBlc3NheXMuIEZpbmFsbHksIHRoZXkgY29tcG9zZSBhIHNlbGYtYXNzZXNzbWVudCBldmFsdWF0aW5nIHRoZWlyIG93biBjb250cmlidXRpb25zLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI1IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEFERCBJTUFHRVMgT1IgTVVMVElNRURJQVxuICBtdWx0aW1lZGlhOiBcbiAgICB0aXRsZTogXCIgQWRkIGltYWdlcyBvciBtdWx0aW1lZGlhXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJJZiB5b3VyIHN0dWRlbnRzIGFyZSBhZGVwdCBhdCBtZWRpYSwgdGhpcyBjYW4gYmUgYSBncmVhdCB3YXkgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYSBpbiBhIG5vbi10ZXh0dWFsIHdheS4gSW4gdGhlIHBhc3QsIHN0dWRlbnRzIGhhdmUgcGhvdG9ncmFwaGVkIGxvY2FsIG1vbnVtZW50cyB0byBpbGx1c3RyYXRlIGFydGljbGVzLCBkZXNpZ25lZCBpbmZvZ3JhcGhpY3MgdG8gaWxsdXN0cmF0ZSBjb25jZXB0cywgb3IgY3JlYXRlZCB2aWRlb3MgdGhhdCBkZW1vbnN0cmF0ZWQgYXVkaW8tdmlzdWFsbHkgd2hhdCBhcnRpY2xlcyBkZXNjcmliZSBpbiB3b3Jkcy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjMgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHN0dWR5aW5nIHBob3RvZ3JhcGh5LCB2aWRlb2dyYXBoeSwgb3IgZ3JhcGhpYyBkZXNpZ25cIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgbWVkaWEgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvdXJzZUluZm9cbiIsIldpemFyZFN0ZXBJbnB1dHMgPVxuICBpbnRybzogXG4gICAgdGVhY2hlcjpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIG5hbWUnXG4gICAgICBpZDogJ3RlYWNoZXInXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBjb3Vyc2VfbmFtZTpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdDb3Vyc2UgbmFtZSdcbiAgICAgIGlkOiAnY291cnNlX25hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc2Nob29sOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICBpZDogJ3NjaG9vbCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdWJqZWN0OlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1N1YmplY3QnXG4gICAgICBpZDogJ3N1YmplY3QnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc3R1ZGVudHM6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGluc3RydWN0b3JfdXNlcm5hbWU6XG4gICAgICBsYWJlbDogJ1VzZXJuYW1lICh0ZW1wb3JhcnkpJ1xuICAgICAgaWQ6ICdpbnN0cnVjdG9yX3VzZXJuYW1lJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIGlzRGF0ZTogdHJ1ZVxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgd2l6YXJkX2VuZF9kYXRlOlxuICAgICAgaXNEYXRlOiB0cnVlXG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBcbiAgbXVsdGltZWRpYV8xOlxuICAgIG11bHRpbWVkaWFfMV8xOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzFfMSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAxPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgICBtdWx0aW1lZGlhXzFfMjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYV8xXzInXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gIG11bHRpbWVkaWFfMjpcbiAgICBtdWx0aW1lZGlhXzJfMTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYV8yXzEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIG11bHRpbWVkaWFfMl8yOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzJfMidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gIGNvcHllZGl0XzE6XG4gICAgY29weWVkaXRfMV8xOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8xXzEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIGNvcHllZGl0XzFfMjpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY29weWVkaXRfMV8yJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgY29weWVkaXRfMjpcbiAgICBjb3B5ZWRpdF8yXzE6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzJfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgY29weWVkaXRfMl8yOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8yXzInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDI/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgbXVsdGltZWRpYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgY29weWVkaXQ6IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuXG4gICAgc29tZXRoaW5nX2Vsc2U6XG4gICAgICB0eXBlOiAnbGluaydcbiAgICAgIGhyZWY6ICdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZydcbiAgICAgIGlkOiAnc29tZXRoaW5nX2Vsc2UnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQSBkaWZmZXJlbnQgYXNzaWdubWVudD8gR2V0IGluIHRvdWNoIGhlcmUuJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogZmFsc2VcbiAgICAgIHRpcEluZm86XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBcIkhhdmUgYW5vdGhlciBpZGVhIGZvciBpbmNvcnBvcmF0aW5nIFdpa2lwZWRpYSBpbnRvIHlvdXIgY2xhc3M/IFdlJ3ZlIGZvdW5kIHRoYXQgdGhlc2UgYXNzaWdubWVudHMgd29yayB3ZWxsLCBidXQgdGhleSBhcmVuJ3QgdGhlIG9ubHkgd2F5IHRvIGRvIGl0LiBHZXQgaW4gdG91Y2gsIGFuZCB3ZSBjYW4gdGFsayB0aGluZ3MgdGhyb3VnaDogPGEgc3R5bGU9J2NvbG9yOiM1MDVhN2Y7JyBocmVmPSdtYWlsdG86Y29udGFjdEB3aWtpZWR1Lm9yZyc+Y29udGFjdEB3aWtpZWR1Lm9yZzwvYT4uXCJcblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBcbiAgICBjcmVhdGVfdXNlcjpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSB1c2VyIGFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBlbnJvbGw6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBjb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgb25saW5lIHRyYWluaW5nJ1xuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBpbnRyb2R1Y2VfYW1iYXNzYWRvcnM6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaW50cm9kdWNlX2FtYmFzc2Fkb3JzJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgICMgaW5jbHVkZV9jb21wbGV0aW9uOlxuICAgICMgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgIyAgIGlkOiAnaW5jbHVkZV9jb21wbGV0aW9uJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAjICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgdHJhaW5pbmdfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIGJlIGdyYWRlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB0cmFpbmluZ19ub3RfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ub3RfZ3JhZGVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgdHJhaW5pbmcgd2lsbCBub3QgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gIGdldHRpbmdfc3RhcnRlZDogXG4gICAgY3JpdGlxdWVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY3JpdGlxdWVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyaXRpcXVlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgICBhZGRfdG9fYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnYWRkX3RvX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGNvcHlfZWRpdF9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5X2VkaXRfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBpbGx1c3RyYXRlX2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2lsbHVzdHJhdGVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbGx1c3RyYXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICBcblxuICBjaG9vc2luZ19hcnRpY2xlczogXG4gICAgcHJlcGFyZV9saXN0OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdwcmVwYXJlX2xpc3QnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBcbiAgICBzdHVkZW50c19leHBsb3JlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICByZXF1ZXN0X2hlbHA6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlcXVlc3RfaGVscCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBvciBldmF1bGF0aW5nIGFydGljbGUgY2hvaWNlcz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgaWdub3JlVmFsaWRhdGlvbjogdHJ1ZVxuICAgICAgY29uZGl0aW9uYWxfbGFiZWw6IFxuICAgICAgICBwcmVwYXJlX2xpc3Q6IFwiV291bGQgeW91IGxpa2UgaGVscCBzZWxlY3RpbmcgYXJ0aWNsZXM/XCJcbiAgICAgICAgc3R1ZGVudHNfZXhwbG9yZTogXCJXb3VsZCB5b3UgbGlrZSBoZWxwIGV2YWx1YXRpbmcgc3R1ZGVudCBjaG9pY2VzP1wiXG4gICAgICBcblxuXG4gIHJlc2VhcmNoX3BsYW5uaW5nOiBcbiAgICBjcmVhdGVfb3V0bGluZTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY3JlYXRlX291dGxpbmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVHJhZGl0aW9uYWwgb3V0bGluZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiVHJhZGl0aW9uYWwgb3V0bGluZVwiXG4gICAgICAgIGNvbnRlbnQ6IFwiRm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhbiBvdXRsaW5lIHRoYXQgcmVmbGVjdHMgdGhlIGltcHJvdmVtZW50cyB0aGV5IHBsYW4gdG8gbWFrZSwgYW5kIHRoZW4gcG9zdCBpdCB0byB0aGUgYXJ0aWNsZSdzIHRhbGsgcGFnZS4gVGhpcyBpcyBhIHJlbGF0aXZlbHkgZWFzeSB3YXkgdG8gZ2V0IHN0YXJ0ZWQuXCJcbiAgICBcbiAgICB3cml0ZV9sZWFkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3cml0ZV9sZWFkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgbGVhZCBzZWN0aW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIldpa2lwZWRpYSBsZWFkIHNlY3Rpb25cIlxuICAgICAgICBjb250ZW50OlxuICAgICAgICAgIFwiPHA+Rm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhIHdlbGwtYmFsYW5jZWQgc3VtbWFyeSBvZiBpdHMgZnV0dXJlIHN0YXRlIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbi4gVGhlIGlkZWFsIGxlYWQgc2VjdGlvbiBleGVtcGxpZmllcyBXaWtpcGVkaWEncyBzdW1tYXJ5IHN0eWxlIG9mIHdyaXRpbmc6IGl0IGJlZ2lucyB3aXRoIGEgc2luZ2xlIHNlbnRlbmNlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHBsYWNlcyBpdCBpbiBjb250ZXh0LCBhbmQgdGhlbiDigJQgaW4gb25lIHRvIGZvdXIgcGFyYWdyYXBocywgZGVwZW5kaW5nIG9uIHRoZSBhcnRpY2xlJ3Mgc2l6ZSDigJQgaXQgb2ZmZXJzIGEgY29uY2lzZSBzdW1tYXJ5IG9mIHRvcGljLiBBIGdvb2QgbGVhZCBzZWN0aW9uIHNob3VsZCByZWZsZWN0IHRoZSBtYWluIHRvcGljcyBhbmQgYmFsYW5jZSBvZiBjb3ZlcmFnZSBvdmVyIHRoZSB3aG9sZSBhcnRpY2xlLjwvcD5cbiAgICAgICAgICA8cD5PdXRsaW5pbmcgYW4gYXJ0aWNsZSB0aGlzIHdheSBpcyBhIG1vcmUgY2hhbGxlbmdpbmcgYXNzaWdubWVudCDigJQgYW5kIHdpbGwgcmVxdWlyZSBtb3JlIHdvcmsgdG8gZXZhbHVhdGUgYW5kIHByb3ZpZGUgZmVlZGJhY2sgZm9yLiBIb3dldmVyLCBpdCBjYW4gYmUgbW9yZSBlZmZlY3RpdmUgZm9yIHRlYWNoaW5nIHRoZSBwcm9jZXNzIG9mIHJlc2VhcmNoLCB3cml0aW5nLCBhbmQgcmV2aXNpb24uIFN0dWRlbnRzIHdpbGwgcmV0dXJuIHRvIHRoaXMgbGVhZCBzZWN0aW9uIGFzIHRoZXkgZ28sIHRvIGd1aWRlIHRoZWlyIHdyaXRpbmcgYW5kIHRvIHJldmlzZSBpdCB0byByZWZsZWN0IHRoZWlyIGltcHJvdmVkIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHRvcGljIGFzIHRoZWlyIHJlc2VhcmNoIHByb2dyZXNzZXMuIFRoZXkgd2lsbCB0YWNrbGUgV2lraXBlZGlhJ3MgZW5jeWNsb3BlZGljIHN0eWxlIGVhcmx5IG9uLCBhbmQgdGhlaXIgb3V0bGluZSBlZmZvcnRzIHdpbGwgYmUgYW4gaW50ZWdyYWwgcGFydCBvZiB0aGVpciBmaW5hbCB3b3JrLjwvcD5cIlxuICAgICAgICBcblxuXG4gIGRyYWZ0c19tYWluc3BhY2U6IFxuICAgIHdvcmtfbGl2ZTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd29ya19saXZlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvcmsgbGl2ZSBmcm9tIHRoZSBzdGFydCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgIFxuICAgIHNhbmRib3g6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3NhbmRib3gnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRHJhZnQgZWFybHkgd29yayBpbiBzYW5kYm94ZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgICBcblxuICBwZWVyX2ZlZWRiYWNrOiBcbiAgICBwZWVyX3Jldmlld3M6XG4gICAgICB0eXBlOiAncmFkaW9Hcm91cCdcbiAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgbGFiZWw6ICcnXG4gICAgICB2YWx1ZTogJ3R3bydcbiAgICAgIHNlbGVjdGVkOiAxXG4gICAgICBvdmVydmlld0xhYmVsOiAnVHdvIHBlZXIgcmV2aWV3J1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDBcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMSdcbiAgICAgICAgICB2YWx1ZTogJ29uZSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnT25lIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMVxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcyJ1xuICAgICAgICAgIHZhbHVlOiAndHdvJ1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ1R3byBwZWVyIHJldmlldydcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDJcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMydcbiAgICAgICAgICB2YWx1ZTogJ3RocmVlJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUaHJlZSBwZWVyIHJldmlldydcblxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogM1xuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICc0J1xuICAgICAgICAgIHZhbHVlOiAnZm91cidcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnRm91ciBwZWVyIHJldmlldydcblxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogNFxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICc1J1xuICAgICAgICAgIHZhbHVlOiAnZml2ZSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnRml2ZSBwZWVyIHJldmlldydcbiAgICAgICAgfVxuICAgICAgXVxuICAgIFxuICBcblxuICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOiBcbiAgICBjbGFzc19ibG9nOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19ibG9nJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ2xhc3MgYmxvZyBvciBkaXNjdXNzaW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiAnQ2xhc3MgYmxvZyBvciBjbGFzcyBkaXNjdXNzaW9uJ1xuICAgICAgICBjb250ZW50OiAnU3R1ZGVudHMga2VlcCBhIHJ1bm5pbmcgYmxvZyBhYm91dCB0aGVpciBleHBlcmllbmNlcy4gR2l2aW5nIHRoZW0gcHJvbXB0cyBldmVyeSB3ZWVrIG9yIHR3bywgc3VjaCBhcyDigJxUbyB3aGF0IGV4dGVudCBhcmUgdGhlIGVkaXRvcnMgb24gV2lraXBlZGlhIGEgc2VsZi1zZWxlY3RpbmcgZ3JvdXAgYW5kIHdoeT/igJ0gd2lsbCBoZWxwIHRoZW0gdGhpbmsgYWJvdXQgdGhlIGxhcmdlciBpc3N1ZXMgc3Vycm91bmRpbmcgdGhpcyBvbmxpbmUgZW5jeWNsb3BlZGlhIGNvbW11bml0eS4gSXQgd2lsbCBhbHNvIGdpdmUgeW91IG1hdGVyaWFsIGJvdGggb24gdGhlIHdpa2kgYW5kIG9mZiB0aGUgd2lraSB0byBncmFkZS4gSWYgeW91IGhhdmUgdGltZSBpbiBjbGFzcywgdGhlc2UgZGlzY3Vzc2lvbnMgY2FuIGJlIHBhcnRpY3VsYXJseSBjb25zdHJ1Y3RpdmUgaW4gcGVyc29uLidcbiAgICAgIFxuICAgIGNsYXNzX3ByZXNlbnRhdGlvbjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdJbi1jbGFzcyBwcmVzZW50YXRpb24gb2YgV2lraXBlZGlhIHdvcmsnXG4gICAgICAgIGNvbnRlbnQ6IFwiRWFjaCBzdHVkZW50IG9yIGdyb3VwIHByZXBhcmVzIGEgc2hvcnQgcHJlc2VudGF0aW9uIGZvciB0aGUgY2xhc3MsIGV4cGxhaW5pbmcgd2hhdCB0aGV5IHdvcmtlZCBvbiwgd2hhdCB3ZW50IHdlbGwgYW5kIHdoYXQgZGlkbid0LCBhbmQgd2hhdCB0aGV5IGxlYXJuZWQuIFRoZXNlIHByZXNlbnRhdGlvbnMgY2FuIG1ha2UgZXhjZWxsZW50IGZvZGRlciBmb3IgY2xhc3MgZGlzY3Vzc2lvbnMgdG8gcmVpbmZvcmNlIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgZ29hbHMuXCJcbiAgICAgIFxuICAgIHJlZmxlY3RpdmVfZXNzYXk6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlZmxlY3RpdmVfZXNzYXknXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgIGNvbnRlbnQ6IFwiQXNrIHN0dWRlbnRzIHRvIHdyaXRlIGEgc2hvcnQgcmVmbGVjdGl2ZSBlc3NheSBvbiB0aGVpciBleHBlcmllbmNlcyB1c2luZyBXaWtpcGVkaWEuIFRoaXMgd29ya3Mgd2VsbCBmb3IgYm90aCBzaG9ydCBhbmQgbG9uZyBXaWtpcGVkaWEgcHJvamVjdHMuIEFuIGludGVyZXN0aW5nIGl0ZXJhdGlvbiBvZiB0aGlzIGlzIHRvIGhhdmUgc3R1ZGVudHMgd3JpdGUgYSBzaG9ydCB2ZXJzaW9uIG9mIHRoZSBlc3NheSBiZWZvcmUgdGhleSBiZWdpbiBlZGl0aW5nIFdpa2lwZWRpYSwgb3V0bGluaW5nIHRoZWlyIGV4cGVjdGF0aW9ucywgYW5kIHRoZW4gaGF2ZSB0aGVtIHJlZmxlY3Qgb24gd2hldGhlciBvciBub3QgdGhleSBtZXQgdGhvc2UgZXhwZWN0YXRpb25zIGR1cmluZyB0aGUgYXNzaWdubWVudC5cIlxuICAgICAgXG4gICAgcG9ydGZvbGlvOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdwb3J0Zm9saW8nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICAgIGNvbnRlbnQ6IFwiU3R1ZGVudHMgb3JnYW5pemUgdGhlaXIgV2lraXBlZGlhIHdvcmsgaW50byBhIHBvcnRmb2xpbywgaW5jbHVkaW5nIGEgbmFycmF0aXZlIG9mIHRoZSBjb250cmlidXRpb25zIHRoZXkgbWFkZSDigJQgYW5kIGhvdyB0aGV5IHdlcmUgcmVjZWl2ZWQsIGFuZCBwb3NzaWJseSBjaGFuZ2VkLCBieSBvdGhlciBXaWtpcGVkaWFucyDigJQgYW5kIGxpbmtzIHRvIHRoZWlyIGtleSBlZGl0cy4gQ29tcG9zaW5nIHRoaXMgcG9ydGZvbGlvIHdpbGwgaGVscCBzdHVkZW50cyB0aGluayBtb3JlIGRlZXBseSBhYm91dCB0aGVpciBXaWtpcGVkaWEgZXhwZXJpZW5jZXMsIGFuZCBhbHNvIHByb3ZpZGVzIGEgbGVucyB0aHJvdWdoIHdoaWNoIHRvIHVuZGVyc3RhbmQg4oCUIGFuZCBncmFkZSDigJQgdGhlaXIgd29yay5cIlxuICAgIFxuICAgIG9yaWdpbmFsX3BhcGVyOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdvcmlnaW5hbF9wYXBlcidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgICAgY29udGVudDogXCJJbiBjb3Vyc2VzIHRoYXQgZW1waGFzaXplIHRyYWRpdGlvbmFsIHJlc2VhcmNoIHNraWxscyBhbmQgdGhlIGRldmVsb3BtZW50IG9mIG9yaWdpbmFsIGlkZWFzIHRocm91Z2ggYSB0ZXJtIHBhcGVyLCBXaWtpcGVkaWEncyBwb2xpY3kgb2YgXFxcIm5vIG9yaWdpbmFsIHJlc2VhcmNoXFxcIiBtYXkgYmUgdG9vIHJlc3RyaWN0aXZlLiBNYW55IGluc3RydWN0b3JzIHBhaXIgV2lraXBlZGlhIHdyaXRpbmcgd2l0aCBhIGNvbXBsZW1lbnRhcnkgYW5hbHl0aWNhbCBwYXBlcjsgc3R1ZGVudHPigJkgV2lraXBlZGlhIGFydGljbGVzIHNlcnZlIGFzIGEgbGl0ZXJhdHVyZSByZXZpZXcsIGFuZCB0aGUgc3R1ZGVudHMgZ28gb24gdG8gZGV2ZWxvcCB0aGVpciBvd24gaWRlYXMgYW5kIGFyZ3VtZW50cyBpbiB0aGUgb2ZmbGluZSBhbmFseXRpY2FsIHBhcGVyLlwiXG4gICAgXG4gIGR5azpcbiAgICBkeWs6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2R5aydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RpZCBZb3UgS25vdz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgZ2E6IFxuICAgIGdhOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdnYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0dvb2QgQXJ0aWNsZSBub21pbmF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIFxuXG4gICMgZ3JhZGluZ19tdWx0aW1lZGlhOiBcbiAgIyAgIGNvbXBsZXRlX211bHRpbWVkaWE6XG4gICMgICAgIHR5cGU6ICdwZXJjZW50J1xuICAjICAgICBsYWJlbDogJ0FkZCBpbWFnZXMgJiBtdWx0aW1lZGlhJ1xuICAjICAgICBpZDogJ2NvbXBsZXRlX211bHRpbWVkaWEnXG4gICMgICAgIHZhbHVlOiA1MFxuICAjICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAjICAgICBjb250aW5nZW50VXBvbjogW11cbiAgXG4gICMgZ3JhZGluZ19jb3B5ZWRpdDogXG4gICMgICBjb21wbGV0ZV9jb3B5ZWRpdDpcbiAgIyAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICMgICAgIGxhYmVsOiAnQ29weWVkaXQgYXJ0aWNsZXMnXG4gICMgICAgIGlkOiAnb21wbGV0ZV9jb3B5ZWRpdCdcbiAgIyAgICAgdmFsdWU6IDUwXG4gICMgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICMgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG5cbiAgZ3JhZGluZzogXG4gICAgcmVzZWFyY2h3cml0ZTpcbiAgICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIFdpa2lwZWRpYSB0cmFpbmluZydcbiAgICAgICAgaWQ6ICdjb21wbGV0ZV90cmFpbmluZydcbiAgICAgICAgdmFsdWU6IDVcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgICAndHJhaW5pbmdfZ3JhZGVkJ1xuICAgICAgICBdXG5cbiAgICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnRWFybHkgV2lraXBlZGlhIGV4ZXJjaXNlcydcbiAgICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICAgIHZhbHVlOiAxNSAgIFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICAgb3V0bGluZV9xdWFsaXR5OlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgaWQ6ICdvdXRsaW5lX3F1YWxpdHknXG4gICAgICAgIGxhYmVsOiAnUXVhbGl0eSBvZiBiaWJsaW9ncmFwaHkgYW5kIG91dGxpbmUnXG4gICAgICAgIHZhbHVlOiAxMCAgIFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICAgcGVlcl9yZXZpZXdzOlxuICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnUGVlciByZXZpZXdzIGFuZCBjb2xsYWJvcmF0aW9uIHdpdGggY2xhc3NtYXRlcydcbiAgICAgICAgdmFsdWU6IDEwICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBjb250cmlidXRpb25fcXVhbGl0eTpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnIFxuICAgICAgICBpZDogJ2NvbnRyaWJ1dGlvbl9xdWFsaXR5J1xuICAgICAgICBsYWJlbDogJ1F1YWxpdHkgb2YgeW91ciBtYWluIFdpa2lwZWRpYSBjb250cmlidXRpb25zJ1xuICAgICAgICB2YWx1ZTogNTBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50JyBcbiAgICAgICAgaWQ6ICdzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzJ1xuICAgICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgICAgIHZhbHVlOiAxMFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICAgICdjbGFzc19ibG9nJ1xuICAgICAgICAgICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICAgICAgJ3JlZmxlY3RpdmVfZXNzYXknXG4gICAgICAgICAgJ3BvcnRmb2xpbydcbiAgICAgICAgICAnb3JpZ2luYWxfcGFwZXInXG4gICAgICAgIF1cblxuICAgIGNvcHllZGl0OlxuICAgICAgY29weWVkaXQ6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAgICAgICBpZDogJ2NvcHllZGl0J1xuICAgICAgICB2YWx1ZTogMTAwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ2NvcHllZGl0J1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICBdXG4gICAgbXVsdGltZWRpYTpcbiAgICAgIG11bHRpbWVkaWE6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0FkZCBpbWFnZXMgJiBtdWx0aW1lZGlhJ1xuICAgICAgICBpZDogJ211bHRpbWVkaWEnXG4gICAgICAgIHZhbHVlOiAxMDBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAnbXVsdGltZWRpYSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgXVxuXG5cblxuXG4gICAgZ3JhZGluZ19zZWxlY3Rpb246XG4gICAgICBsYWJlbDogJ0dyYWRpbmcgYmFzZWQgb246J1xuICAgICAgaWQ6ICdncmFkaW5nX3NlbGVjdGlvbidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVuZGVySW5PdXRwdXQ6IGZhbHNlXG4gICAgICBvcHRpb25zOiBcbiAgICAgICAgcGVyY2VudDogXG4gICAgICAgICAgbGFiZWw6ICdQZXJjZW50YWdlJ1xuICAgICAgICAgIHZhbHVlOiAncGVyY2VudCdcbiAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICBwb2ludHM6XG4gICAgICAgICAgbGFiZWw6ICdQb2ludHMnXG4gICAgICAgICAgdmFsdWU6ICdwb2ludHMnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG5cblxuICBvdmVydmlldzogXG4gICAgbGVhcm5pbmdfZXNzZW50aWFsczpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdMZWFybmluZyBXaWtpIGVzc2VudGlhbHMnXG4gICAgICBpZDogJ2xlYXJuaW5nX2Vzc2VudGlhbHMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuXG4gICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICBjaG9vc2luZ19hcnRpY2xlczpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBhcnRpY2xlcydcbiAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuXG4gICAgcmVzZWFyY2hfcGxhbm5pbmc6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgaWQ6ICdyZXNlYXJjaF9wbGFubmluZydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG4gICAgXG4gICAgZHJhZnRzX21haW5zcGFjZTpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdEcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgIGlkOiAnZHJhZnRzX21haW5zcGFjZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG4gICAgXG4gICAgcGVlcl9mZWVkYmFjazpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdQZWVyIEZlZWRiYWNrJ1xuICAgICAgaWQ6ICdwZWVyX2ZlZWRiYWNrJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICB2YWx1ZTogJydcblxuICAgIHdpemFyZF9zdGFydF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuXG4gICAgd2l6YXJkX2VuZF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuXG4gIGNvdXJzZV9kZXRhaWxzOlxuICAgIGRlc2NyaXB0aW9uOiAnJ1xuICAgIHRlcm1fc3RhcnRfZGF0ZTogJydcbiAgICB0ZXJtX2VuZF9kYXRlOiAnJ1xuICAgIHN0YXJ0X2RhdGU6ICcnXG4gICAgc3RhcnRfd2Vla29mX2RhdGU6ICcnXG4gICAgZW5kX3dlZWtvZl9kYXRlOiAnJ1xuICAgIGVuZF9kYXRlOiAnJ1xuICAgIHdlZWtkYXlzX3NlbGVjdGVkOiBbZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2UsZmFsc2VdXG4gICAgbGVuZ3RoX2luX3dlZWtzOiAxNlxuICAgIGFzc2lnbm1lbnRzOiBbXVxuXG5cblxuICAgIFxuXG5cblxuXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkU3RlcElucHV0c1xuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBWaWV3SGVscGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciggJ2xpbmsnLCAoIHRleHQsIHVybCApIC0+XG5cbiAgdGV4dCA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdGV4dCApXG4gIHVybCAgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHVybCApXG5cbiAgcmVzdWx0ID0gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiPicgKyB0ZXh0ICsgJzwvYT4nXG5cbiAgcmV0dXJuIG5ldyBIYW5kbGViYXJzLlNhZmVTdHJpbmcoIHJlc3VsdCApXG4pXG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsKCdjb3Vyc2VEZXRhaWxzJywgJ3N1cDInKSIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgLSBBcHBsaWNhdGlvbiBJbml0aXRpYWxpemVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi9hcHAnKVxuXG5cbiQgLT5cblxuICBtb21lbnQubG9jYWxlKCdlbicsIHsgd2VlayA6IHsgZG93IDogMSwgZG95OiA0IH0gfSlcblxuICAjIEluaXRpYWxpemUgQXBwbGljYXRpb25cbiAgYXBwbGljYXRpb24uaW5pdGlhbGl6ZSgpXG5cbiAgIyBTdGFydCBCYWNrYm9uZSByb3V0ZXJcbiAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCgpXG5cblxuICAiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbk1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL3N1cGVycy9Nb2RlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE1vZGVsIGV4dGVuZHMgTW9kZWxcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEVWRU5UIEhBTkRMRVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCAtIFJvdXRlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFJvdXRlc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgXG4gIHJvdXRlczpcbiAgICAnJyA6ICdob21lJ1xuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSGFuZGxlcnNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGhvbWU6IC0+XG4gICAgaWYgJCgnI2FwcCcpLmxlbmd0aCA+IDBcblxuICAgICAgQGN1cnJlbnRXaWtpVXNlciA9ICQoICcjYXBwJyApLmF0dHIoJ2RhdGEtd2lraXVzZXInKVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydpbnRybyddWydpbnN0cnVjdG9yX3VzZXJuYW1lJ11bJ3ZhbHVlJ10gPSBAY3VycmVudFdpa2lVc2VyXG5cbiAgICAgICQoICcjYXBwJyApLmh0bWwoYXBwbGljYXRpb24uaG9tZVZpZXcucmVuZGVyKCkuZWwpXG5cbiAgICAgIGlmIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXAnKVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXAnKSlcblxuICAgICAgZWxzZSBpZiBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwaWQnKVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290b0lkJywgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcGlkJykpXG5cblxuICAgIGVsc2UgaWYgJCgnI2xvZ2luJykubGVuZ3RoID4gMFxuXG4gICAgICAoJCAnI2xvZ2luJykuaHRtbChhcHBsaWNhdGlvbi5sb2dpblZpZXcucmVuZGVyKCkuZWwpXG5cbiAgI1xuICAjIFV0aWxpdGllc1xuICAjXG5cbiAgZ2V0UGFyYW1ldGVyQnlOYW1lOiAobmFtZSkgLT5cblxuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIilcblxuICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIilcblxuICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaClcblxuICAgIChpZiBub3QgcmVzdWx0cz8gdGhlbiBcIlwiIGVsc2UgZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSkpXG5cblxuIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSG9tZSBQYWdlIFRlbXBsYXRlXFxuLS0+XFxuXFxuPCEtLSBNQUlOIEFQUCBDT05URU5UIC0tPlxcbjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblxcblxcbiAgPCEtLSBTVEVQUyBNQUlOIENPTlRBSU5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXBzXFxcIj48L2Rpdj48IS0tIGVuZCAuc3RlcHMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLmNvbnRlbnQgLS0+XFxuXFxuXCI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgICAgICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgICAgICAgPHAgY2xhc3M9XFxcImxhcmdlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubG9naW5faW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sb2dpbl9pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwIHN0ZXAtLWZpcnN0IHN0ZXAtLWxvZ2luXFxcIj5cXG4gICAgXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gICAgICAgIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICAgICAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFxcbiAgICAgICAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgICAgICAgXFxuICAgICAgICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5sb2dpbl9pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuXFxuICAgICAgICA8IS0tIEJFR0lOIEJVVFRPTiAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1hY3Rpb25zXFxcIj5cXG4gICAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWVcXFwiIGlkPVxcXCJsb2dpbkJ1dHRvblxcXCIgaHJlZj1cXFwiL2F1dGgvbWVkaWF3aWtpXFxcIj5cXG4gICAgICAgICAgICBMb2dpbiB3aXRoIFdpa2lwZWRpYVxcbiAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWFjdGlvbnMgLS0+XFxuXFxuXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcImRvdCBzdGVwLW5hdi1pbmRpY2F0b3JzX19pdGVtIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNBY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5oYXNWaXNpdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBkYXRhLW5hdi1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHRpdGxlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcFRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwSWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBJZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPio8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImFjdGl2ZVwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwidmlzaXRlZFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW5hY3RpdmVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBuby1hcnJvdyBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBTdGVwIE5hdmlnYXRpb24gXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIE5BViBET1QgSU5ESUNBVE9SUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1pbmRpY2F0b3JzIGhpZGRlblxcXCI+XFxuXFxuICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc3RlcHMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtaW5kaWNhdG9ycyAtLT5cXG5cXG5cXG5cXG48IS0tIFNURVAgTkFWIEJVVFRPTlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9uc1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zLS1ub3JtYWxcXFwiPlxcbiAgICA8YSBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1wcmV2IHByZXYgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5wcmV2SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJhcnJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1yaWdodDo1cHg7XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1sZWZ0XFxcIj48L2Rpdj5cXG4gICAgICA8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5wcmV2VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnByZXZUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgIDwvYT5cXG5cXG4gICAgPGEgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tbmV4dCBuZXh0IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubmV4dEluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNMYXN0U3RlcCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubmV4dFRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uZXh0VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJhcnJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1sZWZ0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLXJpZ2h0XFxcIj48L2Rpdj5cXG4gICAgICA8L3NwYW4+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcblxcblxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9ucy0tZWRpdFxcXCI+XFxuICAgIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2X19idXR0b24tLWV4aXQtZWRpdCBjb25maXJtIGV4aXQtZWRpdFxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5iYWNrVG9PdmVydmlld1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5iYWNrVG9PdmVydmlld1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgPC9hPlxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWJ1dHRvbnMgLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSW5kaXZpZGFsIFN0ZXAgVGVtcGxhdGUgZm9yIHRoZSBJTlRSTyBGT1JNIFNDUkVFTlxcbi0tPlxcblxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICBcXG4gICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gIFxcbiAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIDwvZGl2PlxcbiAgIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcbiAgPCEtLSBJTlRSTyBTVEVQIEZPUk0gQVJFQSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbm5lclxcXCI+XFxuICAgIDwhLS0gZm9ybSBmaWVsZHMgLS0+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWlubmVyIC0tPlxcblxcblxcbiAgPCEtLSBEQVRFUyBNT0RVTEUgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tZGF0ZXNcXFwiPlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1kYXRlcyAtLT5cXG5cXG4gIDxkaXYgY2xhc3M9J2Zvcm0tY29udGFpbmVyIGN1c3RvbS1pbnB1dCc+XFxuXFxuICAgIDxmb3JtIGlkPSdjb3Vyc2VMZW5ndGgnIG9uc3VibWl0PSdyZXR1cm4gZmFsc2UnPlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWwgZm9yPSd0ZXJtU3RhcnREYXRlJz5Db3Vyc2UgYmVnaW5zPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0ndGVybVN0YXJ0RGF0ZScgbmFtZT0ndGVybVN0YXJ0RGF0ZScgdHlwZT0nZGF0ZSc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1FbmREYXRlJz5Db3Vyc2UgZW5kczwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgaWQ9J3Rlcm1FbmREYXRlJyBuYW1lPSd0ZXJtRW5kRGF0ZScgdHlwZT0nZGF0ZSc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgIDxsYWJlbCBmb3I9J2NvdXJzZVN0YXJ0RGF0ZSc+QXNzaWdubWVudCBzdGFydHM8L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IGlkPSdjb3Vyc2VTdGFydERhdGUnIG5hbWU9J2NvdXJzZVN0YXJ0RGF0ZScgdHlwZT0nZGF0ZSc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgIDxsYWJlbCBmb3I9J2NvdXJzZUVuZERhdGUnPkFzc2lnbm1lbnQgZW5kczwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgaWQ9J2NvdXJzZUVuZERhdGUnIG5hbWU9J2NvdXJzZUVuZERhdGUnIHR5cGU9J2RhdGUnPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcicgc3R5bGU9XFxcImRpc3BsYXk6bm9uZTtcXFwiPlxcbiAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlTGVuZ3RoJyBzdHlsZT1cXFwidmVydGljYWwtYWxpZ246bWlkZGxlO1xcXCI+Q291cnNlIExlbmd0aDwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgZGVmYXVsdFZhbHVlPScxNicgaWQ9J2NMZW5ndGgnIG1heD0nMTYnIG1pbj0nNicgbmFtZT0nY291cnNlTGVuZ3RoJyBzdGVwPScxJyB0eXBlPSdyYW5nZScgdmFsdWU9JzE2JyBzdHlsZT1cXFwiZGlzcGxheTpub25lO1xcXCI+XFxuICAgICAgICA8b3V0cHV0IG5hbWU9J291dDInPjwvb3V0cHV0PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsPkNsYXNzIG1lZXRzIG9uOiA8L2xhYmVsPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwib3ZlcnZpZXctc2VsZWN0LXdyYXBwZXIgb3ZlcnZpZXctc2VsZWN0LXdyYXBwZXItLWRvd1xcXCI+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdtb25kYXknIG5hbWU9J01vbmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScwJz5cXG4gICAgICAgICAgICA8bGFiZWwgZm9yPSdtb25kYXknPk1vbmRheXM8L2xhYmVsPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3R1ZXNkYXknIG5hbWU9J1R1ZXNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMSc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0ndHVlc2RheSc+VHVlc2RheXM8L2xhYmVsPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3dlZG5lc2RheScgbmFtZT0nV2VkbmVzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzInPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J3dlZG5lc2RheSc+V2VkbmVzZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndGh1cnNkYXknIG5hbWU9J1RodXJzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzMnPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J3RodXJzZGF5Jz5UaHVyc2RheXM8L2xhYmVsPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J2ZyaWRheScgbmFtZT0nRnJpZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzQnPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J2ZyaWRheSc+RnJpZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nc2F0dXJkYXknIG5hbWU9J1NhdHVyZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzUnPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J3NhdHVyZGF5Jz5TYXR1cmRheXM8L2xhYmVsPlxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3N1bmRheScgbmFtZT0nU3VuZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzYnPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J3N1bmRheSc+U3VuZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyIG92ZXJ2aWV3LWlucHV0LWNvbnRhaW5lci0tYmxhY2tvdXQtZGF0ZXMnPlxcbiAgICAgICAgXFxuICAgICAgICA8aW5wdXQgaWQ9J2JsYWNrb3V0RGF0ZXNGaWVsZCcgbmFtZT0nYmxhY2tvdXREYXRlc0ZpZWxkJyB0eXBlPSdoaWRkZW4nPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmxhY2tvdXREYXRlcy13cmFwcGVyXFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmxhY2tvdXREYXRlcy1pbm5lclxcXCI+XFxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYmxhY2tvdXREYXRlcy1sYWJlbFxcXCI+U2VsZWN0IGRheXMgd2hlcmUgY2xhc3MgZG9lcyBub3QgbWVldCAoaWYgYW55KTo8L2Rpdj5cXG4gICAgICAgICAgICA8ZGl2IGlkPVxcXCJibGFja291dERhdGVzXFxcIiBjbGFzcz1cXFwiYmxhY2tvdXREYXRlc1xcXCI+PC9kaXY+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICBcXG4gICAgICA8L2Rpdj5cXG4gICAgPC9mb3JtPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJvdXRwdXQtY29udGFpbmVyXFxcIj48L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcInByZXZpZXctY29udGFpbmVyXFxcIj48L2Rpdj5cXG5cXG4gIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuby1lZGl0LW1vZGVcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGluYWN0aXZlXFxcIiBpZD1cXFwiYmVnaW5CdXR0b25cXFwiIGhyZWY9XFxcIlxcXCI+XFxuICAgICAgICBTdGFydCBkZXNpZ25pbmcgbXkgYXNzaWdubWVudFxcbiAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImVkaXQtbW9kZS1vbmx5XFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZSBleGl0LWVkaXRcXFwiIGhyZWY9XFxcIiNcXFwiPlxcbiAgICAgICAgQmFja1xcbiAgICAgIDwvYT5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWFjdGlvbnMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm0tY29udGVudF9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmsgc3RlcC1pbmZvX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluZm9UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5mb1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPHAgY2xhc3M9XFxcImxhcmdlIHN0ZXAtaW5mb19faW50cm9cXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb24gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5hY2NvcmRpYW4sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIEhFQURFUiAtLT5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICA8IS0tIElORk8gU0VDVElPTiBDT05URU5UIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2NvbnRlbnRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2NvbnRlbnQgLS0+XFxuXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uIC0tPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhblwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9faGVhZGVyXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXIgLS0+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiAgICBcXG4gICAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAgICBcXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFpbiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBGT1JNIDogTGVmdCBTaWRlIG9mIFN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1sYXlvdXRcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tbGF5b3V0X19pbm5lclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+XFxuXFxuICAgICAgXFxuICAgICAgPCEtLSBTVEVQIEZPUk0gSU5ORVIgQ09OVEVOVCAtLT5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tY29udGVudFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj48L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBJTkZPIDogUmlnaHQgc2lkZSBvZiBzdGVwIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mb1xcXCI+XFxuICA8IS0tIFNURVAgSU5GTyBUSVAgU0VDVElPTiAtLT5cXG4gIDwhLS0gdXNlZCBmb3IgYm90aCBjb3Vyc2UgaW5mbyBhbmQgZ2VuZXJpYyBpbmZvIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tdGlwcyAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1pbm5lclxcXCI+XFxuICAgIDwhLS0gV0lLSUVEVSBMT0dPIC0tPlxcbiAgICA8YSBjbGFzcz1cXFwibWFpbi1sb2dvXFxcIiBocmVmPVxcXCJodHRwOi8vd2lraWVkdS5vcmdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiB0aXRsZT1cXFwid2lraWVkdS5vcmdcXFwiPldJS0lFRFUuT1JHPC9hPlxcblxcbiAgICA8IS0tIFNURVAgSU5GTyBJTk5FUiAtLT5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXdyYXBwZXJcXFwiPlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5mb1RpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcXG4gICAgICA8IS0tIElORk8gU0VDVElPTlMgLS0+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlY3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuICAgIFxcblxcblxcbiAgICBcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mbyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8cD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvcD5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGxpIGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvbGk+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS1ncmlkXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50ZXh0KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50ZXh0OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiA6IDxzcGFuIGNsYXNzPVxcXCJzdGFycyBzdGFycy0tXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGFycykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RhcnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvIHN0ZXAtaW5mby10aXBcXFwiIGRhdGEtaXRlbS1pbmRleD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbjxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jayBcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Bc3NpZ25tZW50IHR5cGU6IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RleHRcXFwiPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmRlc2NyaXB0aW9uLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5NaW5pbXVtIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5taW5fdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm1pbl90aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+UmVjb21tZW5kZWQgdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnJlY190aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAucmVjX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkJlc3QgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuYmVzdF9mb3IsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+Tm90IGFwcHJvcHJpYXRlIGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLm5vdF9mb3IsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TGVhcm5pbmcgT2JqZWN0aXZlczwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmxlYXJuaW5nX29iamVjdGl2ZXMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cD5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuY29udGVudCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuY29udGVudDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBcXFwiIGRhdGEtaXRlbS1pbmRleD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbiAgXFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJpbmZvLWFycm93XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1jaGVja2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZGlzYWJsZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZXhjbHVzaXZlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj48c3Bhbj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcbiAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgIC8+XFxuICA8YSBjbGFzcz1cXFwiY2hlY2stYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJpbmZvLWljb25cXFwiPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vdC1lZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBlZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBkYXRhLWV4Y2x1c2l2ZT1cXFwidHJ1ZVxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IGN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS10ZXh0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tdGV4dF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8aW5wdXQgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnR5cGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiAvPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1wZXJjZW50XFxcIiBkYXRhLXBhdGh3YXktaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wYXRod2F5SWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXBlcmNlbnRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaWNvbiBpY29uLS1wZXJjZW50XFxcIj48L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaWNvbiBpY29uLS1wb2ludHNcXFwiPnBvaW50czwvZGl2PlxcbiAgICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnR5cGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBtYXhsZW5ndGg9XFxcIjNcXFwiIC8+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWVkaXQgY3VzdG9tLWlucHV0LWFjY29yZGlhblxcXCI+XFxuICA8YSBjbGFzcz1cXFwiZWRpdC1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPltlZGl0XTwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXIgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9faGVhZGVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgXFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9fY29udGVudCBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19jb250ZW50XFxcIj5cXG4gICAgPHVsPlxcbiAgICAgIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5hc3NpZ25tZW50cywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE3LCBwcm9ncmFtMTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvdWw+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE3KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGxpPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCkpXG4gICAgKyBcIjwvbGk+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE5KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJpbmZvLWFycm93XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1saW5rXFxcIj5cXG4gIDxsYWJlbD48YSBocmVmPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaHJlZikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiA+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2E+PC9sYWJlbD5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIxKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lclxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJfX2hlYWRlclxcXCI+XFxuICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMjIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpb1xcXCI+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIvPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJfX2hlYWRlclxcXCI+XFxuICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2gyPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lciBjdXN0b20taW5wdXQtcmFkaW8taW5uZXItLWdyb3VwXFxcIj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNSwgcHJvZ3JhbTI1LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMjUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubmFtZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubmFtZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSW5wdXQgSXRlbSBUZW1wbGF0ZXNcXG4gIFxcbi0tPlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNoZWNrYm94KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvQm94KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGV4dCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlcmNlbnQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lZGl0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCJcbiAgICArIFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGluayksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOSwgcHJvZ3JhbTE5LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIxLCBwcm9ncmFtMjEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Hcm91cCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IE1hcmt1cCBmb3IgU3RhcnQvRW5kIERhdGUgSW5wdXQgTW9kdWxlXFxuLS0+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzIGF1dG8taGVpZ2h0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19fbGFiZWxcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxsaT5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApKVxuICAgICsgXCI8L2xpPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtd3JhcHBlciBoYXMtY29udGVudCBlZGl0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWVkaXQgY3VzdG9tLWlucHV0LWFjY29yZGlhblxcXCI+XFxuICAgIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5bZWRpdF08L2E+XFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXIgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9faGVhZGVyXFxcIj5cXG4gICAgICA8bGFiZWw+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2NvbnRlbnRcXFwiPlxcbiAgICAgIDx1bD5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5hc3NpZ25tZW50cywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvdWw+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgb3Zlci1saW1pdCBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuXFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcblxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9XFxcInBlcmNlbnRcXFwiPjxzcGFuPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuXFxuICAgICAgICAgICAgPGlucHV0IG5hbWU9XFxcImdyYWRpbmctc2VsZWN0aW9uXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgLz5cXG5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZCBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nXFxcIj5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXN1bW1hcnlcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fdG90YWxcXFwiPlxcblxcbiAgICAgIDxoMz5Ub3RhbDwvaDM+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fcGVyY2VudCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzT3ZlckxpbWl0LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG5cXG4gICAgICA8aDMgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX190b3RhbC1udW1iZXJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50b3RhbEdyYWRlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50b3RhbEdyYWRlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjxzcGFuIGNsYXNzPVxcXCJwZXJjZW50LXN5bWJvbFxcXCI+JTwvc3Bhbj48L2gzPlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcbiAgXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb25cXFwiPlxcblxcbiAgICA8aDUgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvbl9fdGl0bGVcXFwiPkdyYWRpbmcgYmFzZWQgb246PC9oNT5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uLWZvcm1cXFwiPlxcblxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC13cmFwcGVyXFxcIj5cXG5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5vcHRpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG5cblxuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIDxici8+XFxuIHwgY291cnNlX25hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY291cnNlX25hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBpbnN0cnVjdG9yX3VzZXJuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmluc3RydWN0b3JfdXNlcm5hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRlYWNoZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBzdWJqZWN0ID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN1YmplY3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBzdGFydF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jb3Vyc2VfZGV0YWlscyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdGFydF9kYXRlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG4gfCBlbmRfZGF0ZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY291cnNlX2RldGFpbHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZW5kX2RhdGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGluc3RpdHV0aW9uID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNjaG9vbCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGV4cGVjdGVkX3N0dWRlbnRzID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxufX08YnIvPlxcbjxici8+XFxuXCI7XG4gIGlmIChzdGFjazIgPSBoZWxwZXJzLmRlc2NyaXB0aW9uKSB7IHN0YWNrMiA9IHN0YWNrMi5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMiA9IGRlcHRoMC5kZXNjcmlwdGlvbjsgc3RhY2syID0gdHlwZW9mIHN0YWNrMiA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2syLmFwcGx5KGRlcHRoMCkgOiBzdGFjazI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2syKVxuICAgICsgXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0RZSyA9IHllc1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9EWUsgPSBubyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fR29vZF9BcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0gbm9cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMSwgc3RhY2syO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgcmV0dXJuIHN0YWNrMjsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiB2XFxuIHwgd2FudF9oZWxwX2ZpbmRpbmdfYXJ0aWNsZXMgPSB5ZXNcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazEsIHN0YWNrMjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZXF1ZXN0X2hlbHApKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IHJldHVybiBzdGFjazI7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgPGJyLz5cXG4gfCB3YW50X2hlbHBfZXZhbHVhdGluZ19hcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugb3B0aW9ucyA8YnIvPlxcbiB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmR5ayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5keWspKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgPGJyLz5cXG4gfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nYSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5nYSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucHJlcGFyZV9saXN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIDxici8+XFxufX0gPGJyLz5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMTtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnJlbmRlckluT3V0cHV0LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IHJldHVybiBzdGFjazE7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiVcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIj09R3JhZGluZz09IDxici8+XFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IGdyYWRpbmcgPGJyLz5cXG5cIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZ3JhZGVJdGVtcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5yZW5kZXJJbk91dHB1dCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyByZXR1cm4gc3RhY2sxOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIlXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI9PUdyYWRpbmc9PVxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBncmFkaW5nIFxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmdyYWRpbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVzZWFyY2h3cml0ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI8YnIvPn19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNURU1QQUxURVxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdibHVySGFuZGxlcidcblxuICBtOiAnJ1xuICBkOiAnJ1xuICB5OiAnJ1xuICBkYXRlVmFsdWU6ICcnXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICAkKCdib2R5Jykub24gJ2NsaWNrJywgKGUpID0+XG5cbiAgICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBibHVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgZm9jdXNIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgY2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG4gICAgJHRhcmdldCA9ICgkIGUuY3VycmVudFRhcmdldClcblxuICAgIGlkID0gJHRhcmdldC5hdHRyKCdkYXRhLWRhdGUtaWQnKVxuXG4gICAgdHlwZSA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLXR5cGUnKVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdW3R5cGVdID0gdmFsdWVcblxuICAgIEBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgQGQgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWydkYXknXVxuXG4gICAgQHkgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWyd5ZWFyJ11cblxuICAgIEBkYXRlVmFsdWUgPSBcIiN7QHl9LSN7QG19LSN7QGR9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBAZGF0ZVZhbHVlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdkYXRlOmNoYW5nZScsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoYXNWYWx1ZTogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJ3NlbGVjdCcpLnZhbCgpICE9ICcnXG5cblxuICBjbG9zZUlmTm9WYWx1ZTogLT5cblxuICAgIGlmIEBoYXNWYWx1ZSgpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzVmFsaWQ6IC0+XG4gICAgaXNJdCA9IGZhbHNlXG5cbiAgICBpZiBAbSAhPSAnJyBhbmQgQGQgIT0gJycgYW5kIEB5ICE9ICcnXG4gICAgICBpc0l0ID0gdHJ1ZVxuXG4gICAgcmV0dXJuIGlzSXRcblxuXG5cblxuXG5cbiIsIiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5XaWtpR3JhZGluZ01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicycpXG5cbiNEYXRhXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEdyYWRpbmdJbnB1dFZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgdGVtcGxhdGU6IFdpa2lHcmFkaW5nTW9kdWxlXG5cblxuICBldmVudHM6XG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpbnB1dENoYW5nZUhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgbGFiZWwnIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICdncmFkZTpjaGFuZ2UnIDogJ2dyYWRlQ2hhbmdlSGFuZGxlcidcblxuICBjdXJyZW50VmFsdWVzOiBbXVxuXG5cbiAgdmFsdWVMaW1pdDogMTAwXG5cblxuICBncmFkaW5nU2VsZWN0aW9uRGF0YTogV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddXG5cblxuICBjdXJyZW50VG90YWw6IC0+XG5cbiAgICB0b3RhbCA9IDBcblxuICAgIF8uZWFjaChAY3VycmVudFZhbHVlcywgKHZhbCkgPT5cblxuICAgICAgdG90YWwgKz0gcGFyc2VJbnQodmFsKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIHRvdGFsXG5cblxuXG4gIGdldElucHV0VmFsdWVzOiAtPlxuXG4gICAgdmFsdWVzID0gW11cblxuICAgIEBwYXJlbnRTdGVwVmlldy4kZWwuZmluZCgnaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nKS5lYWNoKC0+XG5cbiAgICAgIGN1clZhbCA9ICgkIHRoaXMpLnZhbCgpXG5cbiAgICAgIGlmIGN1clZhbFxuICAgICAgICBcbiAgICAgICAgdmFsdWVzLnB1c2goY3VyVmFsKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgKCQgdGhpcykudmFsKDApXG5cbiAgICAgICAgdmFsdWVzLnB1c2goMClcblxuXG5cbiAgICApXG5cbiAgICBAY3VycmVudFZhbHVlcyA9IHZhbHVlc1xuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgZ3JhZGVDaGFuZ2VIYW5kbGVyOiAoaWQsIHZhbHVlKSAtPlxuICAgIFxuICAgIEBnZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpXG5cblxuICByYWRpb0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRFbCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJHBhcmVudEdyb3VwID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuXG4gICAgaWYgJHBhcmVudEVsLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBlbHNlXG5cbiAgICAgICRvdGhlclJhZGlvcyA9ICRwYXJlbnRHcm91cC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpLm5vdCgkcGFyZW50RWxbMF0pXG5cbiAgICAgICRvdGhlclJhZGlvcy5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLm9wdGlvbnMsIChvcHQpIC0+XG5cbiAgICAgICAgb3B0LnNlbGVjdGVkID0gZmFsc2VcbiAgICAgICAgXG4gICAgICApXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS5vcHRpb25zWyRpbnB1dEVsLmF0dHIoJ2lkJyldLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10udmFsdWUgPSAkaW5wdXRFbC5hdHRyKCdpZCcpXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICBvdXQgPSB7XG5cbiAgICAgIHRvdGFsR3JhZGU6IEBjdXJyZW50VG90YWwoKVxuXG4gICAgICBpc092ZXJMaW1pdDogQGN1cnJlbnRUb3RhbCgpID4gQHZhbHVlTGltaXRcblxuICAgICAgb3B0aW9uczogQGdyYWRpbmdTZWxlY3Rpb25EYXRhLm9wdGlvbnNcblxuICAgIH1cblxuICAgIHJldHVybiBvdXRcblxuXG5cblxuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Ib21lVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvSG9tZVRlbXBsYXRlLmhicycpXG5cbiNTVUJWSUVXU1xuU3RlcFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9TdGVwVmlldycpXG5cblN0ZXBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9TdGVwTW9kZWwnKVxuXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuVGltZWxpbmVWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvVGltZWxpbmVWaWV3JylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG5cbiAgdGVtcGxhdGU6IEhvbWVUZW1wbGF0ZVxuXG5cbiAgc3RlcERhdGE6IFxuXG4gICAgaW50cm86IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5pbnRyb19zdGVwc1xuXG4gICAgcGF0aHdheXM6IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5wYXRod2F5c1xuXG4gICAgb3V0cm86IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5vdXRyb19zdGVwc1xuXG5cbiAgcGF0aHdheUlkczogLT5cblxuICAgIHJldHVybiBfLmtleXMoQHN0ZXBEYXRhLnBhdGh3YXlzKVxuXG4gIHN0ZXBWaWV3czogW11cblxuXG4gIGFsbFN0ZXBWaWV3czpcblxuICAgIGludHJvOiBbXVxuXG4gICAgcGF0aHdheTogW11cblxuICAgIG91dHJvOiBbXVxuXG5cbiAgc2VsZWN0ZWRQYXRod2F5czogW11cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIElOSVRcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgIEBTdGVwTmF2ID0gbmV3IFN0ZXBOYXZWaWV3KClcblxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBzdGVwc1JlbmRlcmVkID0gZmFsc2VcblxuXG4gIGV2ZW50czogXG5cbiAgICAnY2xpY2sgLmV4aXQtZWRpdCcgOiAnZXhpdEVkaXRDbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6bmV4dCcgOiAnbmV4dEhhbmRsZXInXG5cbiAgICAnc3RlcDpwcmV2JyA6ICdwcmV2SGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9IYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6Z290b0lkJyA6ICdnb3RvSWRIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6ZWRpdCcgOiAnZWRpdEhhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuICAgICdlZGl0OmV4aXQnIDogJ29uRWRpdEV4aXQnXG5cblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcblxuICAgIHVubGVzcyBAc3RlcHNSZW5kZXJlZFxuICAgIFxuICAgICAgQGFmdGVyUmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAJGlubmVyQ29udGFpbmVyID0gQCRlbC5maW5kKCcuY29udGVudCcpXG5cbiAgICBAcmVuZGVySW50cm9TdGVwcygpXG5cbiAgICBAcmVuZGVyU3RlcHMoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuXG4gICAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuICAgIHNldFRpbWVvdXQoPT5cbiAgICAgIEB0aW1lbGluZVZpZXcgPSBuZXcgVGltZWxpbmVWaWV3KClcbiAgICAsMTAwMClcbiAgICBcblxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVySW50cm9TdGVwczogLT5cblxuICAgIHN0ZXBOdW1iZXIgPSAwXG5cbiAgICBfLmVhY2goQHN0ZXBEYXRhLmludHJvLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBzdGVwTnVtYmVyIClcblxuICAgICAgaWYgaW5kZXggaXMgMFxuXG4gICAgICAgIG5ld3ZpZXcuaXNGaXJzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIEBhbGxTdGVwVmlld3MuaW50cm8ucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVyU3RlcHM6IC0+XG5cbiAgICBAYWxsU3RlcFZpZXdzLnBhdGh3YXkgPSBbXVxuXG4gICAgc3RlcE51bWJlciA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBfLmVhY2goQHNlbGVjdGVkUGF0aHdheXMsIChwaWQsIHBpbmRleCkgPT5cblxuICAgICAgXy5lYWNoKEBzdGVwRGF0YS5wYXRod2F5c1twaWRdLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICBpZiBAc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggPiAxXG5cbiAgICAgICAgICBpZiBzdGVwLmlkIGlzICdncmFkaW5nJyB8fCBzdGVwLmlkIGlzICdvdmVydmlldycgfHwgc3RlcC50eXBlIGlzICdncmFkaW5nJyB8fCBzdGVwLnR5cGUgaXMgJ292ZXJ2aWV3J1xuXG4gICAgICAgICAgICBpZiBwaW5kZXggPCBAc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggLSAxXG5cbiAgICAgICAgICAgICAgcmV0dXJuIFxuXG4gICAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICAgIClcblxuICAgICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC1wYXRod2F5IHN0ZXAtcGF0aHdheS0tI3twaWR9XCIpXG5cbiAgICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgICAgQGFsbFN0ZXBWaWV3cy5wYXRod2F5LnB1c2gobmV3dmlldylcblxuICAgICAgICBzdGVwTnVtYmVyKytcblxuICAgICAgKVxuICAgIFxuICAgIClcblxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVyT3V0cm9TdGVwczogLT5cblxuICAgIEBhbGxTdGVwVmlld3Mub3V0cm8gPSBbXVxuXG4gICAgc3RlcE51bWJlciA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBfLmVhY2goQHN0ZXBEYXRhLm91dHJvLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBzdGVwTnVtYmVyIClcblxuICAgICAgaWYgaW5kZXggaXMgQHN0ZXBEYXRhLm91dHJvLmxlbmd0aCAtIDFcblxuICAgICAgICBuZXd2aWV3LmlzTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIEBhbGxTdGVwVmlld3Mub3V0cm8ucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIHJlY3JlYXRlUGF0aHdheTogLT5cblxuICAgIGNsb25lID0gQHN0ZXBWaWV3c1xuXG4gICAgQHN0ZXBWaWV3cyA9IFtjbG9uZVswXSwgY2xvbmVbMV1dXG5cbiAgICBfLmVhY2goQGFsbFN0ZXBWaWV3cy5wYXRod2F5LCAoc3RlcCkgLT5cblxuICAgICAgc3RlcC5yZW1vdmUoKVxuXG4gICAgKVxuXG4gICAgXy5lYWNoKEBhbGxTdGVwVmlld3Mub3V0cm8sIChzdGVwKSAtPlxuXG4gICAgICBzdGVwLnJlbW92ZSgpXG5cbiAgICApXG5cbiAgICBAcmVuZGVyU3RlcHMoKVxuXG4gICAgQHJlbmRlck91dHJvU3RlcHMoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGNvbnRlbnQ6IFwiVGhpcyBpcyBzcGVjaWFsIGNvbnRlbnRcIlxuXG4gICAgfVxuICAgIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwKz0xXG4gICAgXG4gICAgaWYgQGN1cnJlbnRTdGVwIGlzIEBzdGVwVmlld3MubGVuZ3RoIFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgZGVjcmVtZW50U3RlcDogLT5cblxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHVwZGF0ZVN0ZXA6IChpbmRleCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IGluZGV4XG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgdXBkYXRlU3RlcEJ5SWQ6IChpZCkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgaWYgc3RlcFZpZXcuc3RlcElkKCkgaXMgaWRcblxuICAgICAgICBAdXBkYXRlU3RlcChfLmluZGV4T2YoQHN0ZXBWaWV3cyxzdGVwVmlldykpXG4gICAgICAgIFxuICAgICAgICByZXR1cm5cbiAgICAgIFxuICAgIClcblxuXG4gIHNob3dDdXJyZW50U3RlcDogLT5cblxuICAgIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5zaG93KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6dXBkYXRlJywgQGN1cnJlbnRTdGVwKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHVwZGF0ZVNlbGVjdGVkUGF0aHdheTogKGFjdGlvbiwgcGF0aHdheUlkKSAtPlxuXG4gICAgaWYgYWN0aW9uIGlzICdhZGQnXG5cbiAgICAgIGlmIHBhdGh3YXlJZCBpcyAncmVzZWFyY2h3cml0ZSdcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cyA9IFtwYXRod2F5SWRdXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cy5wdXNoKHBhdGh3YXlJZClcblxuICAgIGVsc2UgaWYgYWN0aW9uIGlzICdyZW1vdmUnXG5cbiAgICAgIGlmIHBhdGh3YXlJZCBpcyAncmVzZWFyY2h3cml0ZSdcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cyA9IFtdXG5cbiAgICAgIGVsc2VcblxuICAgICAgICByZW1vdmVJbmRleCA9IF8uaW5kZXhPZihAc2VsZWN0ZWRQYXRod2F5LCBwYXRod2F5SWQpXG5cbiAgICAgICAgQHNlbGVjdGVkUGF0aHdheXMuc3BsaWNlKHJlbW92ZUluZGV4KVxuXG4gICAgQHJlY3JlYXRlUGF0aHdheSgpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgY3VycmVudFN0ZXBWaWV3OiAtPlxuXG4gICAgcmV0dXJuIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXVxuXG5cbiAgaGlkZUFsbFN0ZXBzOiAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy5oaWRlKClcbiAgICAgIFxuICAgIClcblxuXG4gIGhpZGVBbGxUaXBzOiAoZSkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgc3RlcFZpZXcudGlwVmlzaWJsZSA9IGZhbHNlXG4gICAgICBcbiAgICApXG5cbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIG5leHRIYW5kbGVyOiAtPlxuXG4gICAgQGFkdmFuY2VTdGVwKClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG4gIHByZXZIYW5kbGVyOiAtPlxuXG4gICAgQGRlY3JlbWVudFN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGVkaXRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBpZiBpZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICB4ID0gY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHN0YXJ0IHRoZSBwcm9jZXNzIG92ZXIgd2l0aCBhIG5ldyBhc3NpZ25tZW50IHR5cGU/JylcbiAgICAgIGlmICF4XG4gICAgICAgIHJldHVyblxuXG4gICAgZWxzZSAgICAgICBcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdlZGl0LW1vZGUnKVxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsICh2aWV3LCBpbmRleCkgPT5cblxuICAgICAgaWYgdmlldy5tb2RlbC5pZCA9PSBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKGluZGV4KVxuXG4gICAgKVxuXG5cbiAgb25FZGl0RXhpdDogLT5cblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnZWRpdC1tb2RlJylcblxuXG4gIGV4aXRFZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdlZGl0OmV4aXQnKVxuXG5cblxuICBnb3RvSGFuZGxlcjogKGluZGV4KSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ290b0lkSGFuZGxlcjogKGlkKSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXBCeUlkKGlkKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGdldFNlbGVjdGVkSWRzOiAtPlxuXG4gICAgc2VsZWN0ZWRJZHMgPSBbXVxuXG4gICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHMsIChzdGVwcykgPT5cblxuICAgICAgXy5lYWNoKHN0ZXBzLCAoc3RlcCkgPT5cblxuICAgICAgICBpZiBzdGVwLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgIGlmIHN0ZXAuaWRcblxuICAgICAgICAgICAgc2VsZWN0ZWRJZHMucHVzaCBzdGVwLmlkXG5cbiAgICAgIClcblxuICAgIClcblxuICAgIHJldHVybiBzZWxlY3RlZElkc1xuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcbklucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIElucHV0VmlldyBcblxuXG4gICIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Mb2dpblRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzJylcblxuTG9naW5Db250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9Mb2dpbkNvbnRlbnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogTG9naW5UZW1wbGF0ZVxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgXG4gICAgcmV0dXJuIExvZ2luQ29udGVudCIsIlxuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Db3Vyc2VEZXRhaWxzVGVtcGFsdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMnKVxuR3JhZGluZ1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nVGVtcGxhdGUuaGJzJylcbkNvdXJzZU9wdGlvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicycpXG5cblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgT3V0cHV0VmlldyBleHRlbmRzIFZpZXcgXG5cbiAgY3VycmVudEJ1aWxkOiAnJ1xuXG4gIGRldGFpbHNUZW1wbGF0ZTogQ291cnNlRGV0YWlsc1RlbXBhbHRlXG5cbiAgZ3JhZGluZ1RlbXBsYXRlOiBHcmFkaW5nVGVtcGxhdGVcblxuICBvcHRpb25zVGVtcGxhdGU6IENvdXJzZU9wdGlvbnNUZW1wbGF0ZVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICd3aXphcmQ6cHVibGlzaCcgOiAncHVibGlzaEhhbmRsZXInXG4gICAgJ291dHB1dDp1cGRhdGUnICA6ICd1cGRhdGVCdWlsZCdcblxuICB1cGRhdGVCdWlsZDogKGJ1aWxkKSAtPlxuICAgIEBjdXJyZW50QnVpbGQgPSBidWlsZFxuICAgICMgY29uc29sZS5sb2cgQGN1cnJlbnRCdWlsZFxuXG5cbiAgb3V0cHV0UGxhaW5UZXh0OiAtPlxuXG4gICAgQHJlbmRlcigpXG5cbiAgICByZXR1cm4gQCRlbC50ZXh0KClcblxuXG4gIHJlbmRlcjogLT5cbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcG9wdWxhdGVPdXRwdXQ6IC0+XG5cbiAgICBkZXRhaWxzT3V0cHV0ID0gQCRlbC5odG1sKEBkZXRhaWxzVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgcmF3QXNzaWdubWVudE91dHB1dCA9IEAkZWwuaHRtbChAdGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgYXNzaWdubWVudE91dHB1dCA9IHJhd0Fzc2lnbm1lbnRPdXRwdXQucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSxcIlwiKVxuXG4gICAgZ3JhZGluZ091dHB1dCA9IEAkZWwuaHRtbChAZ3JhZGluZ1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIG9wdGlvbnNPdXRwdXQgPSBAJGVsLmh0bWwoQG9wdGlvbnNUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBjb3Vyc2VPdXQgPSBkZXRhaWxzT3V0cHV0ICsgYXNzaWdubWVudE91dHB1dCArIGdyYWRpbmdPdXRwdXQgKyBvcHRpb25zT3V0cHV0XG4gICAgXG4gICAgcmV0dXJuIGNvdXJzZU91dFxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiBfLmV4dGVuZChXaXphcmRTdGVwSW5wdXRzLHsgZGVzY3JpcHRpb246ICQoJyNzaG9ydF9kZXNjcmlwdGlvbicpLnZhbCgpLCBsaW5lQnJlYWs6ICc8YnIvPid9KVxuXG5cbiAgZXhwb3J0RGF0YTogKGZvcm1EYXRhKSAtPlxuXG4gICAgJC5hamF4KFxuXG4gICAgICB0eXBlOiAnUE9TVCdcblxuICAgICAgdXJsOiAnL3B1Ymxpc2gnXG5cbiAgICAgIGRhdGE6XG5cbiAgICAgICAgd2lraXRleHQ6IGZvcm1EYXRhXG5cbiAgICAgICAgY291cnNlX3RpdGxlOiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlXG5cbiAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSkgLT5cblxuICAgICAgICAkKCcjcHVibGlzaCcpLnJlbW92ZUNsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgICBpZiByZXNwb25zZS5zdWNjZXNzXG5cbiAgICAgICAgICBuZXdQYWdlID0gXCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpLyN7cmVzcG9uc2UudGl0bGV9XCJcblxuICAgICAgICAgIGFsZXJ0KFwiQ29uZ3JhdHMhIFlvdSBoYXZlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkL2VkaXRlZCBhIFdpa2llZHUgQ291cnNlIGF0ICN7bmV3UGFnZX1cIilcblxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbmV3UGFnZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIGNvbnNvbGUubG9nIHJlc3BvbnNlXG5cbiAgICAgICAgICBhbGVydCgnSG1tLi4uIHNvbWV0aGluZyB3ZW50IHdyb25nLiBUcnkgY2xpY2tpbmcgXCJQdWJsaXNoXCIgYWdhaW4uIElmIHRoYXQgZG9lc25cXCd0IHdvcmssIHBsZWFzZSBzZW5kIGEgbWVzc2FnZSB0byBzYWdlQHdpa2llZHUub3JnLicpXG5cblxuICAgIClcbiAgICBcblxuICBwdWJsaXNoSGFuZGxlcjogLT5cblxuICAgIGlmIFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWUubGVuZ3RoID4gMCBcblxuICAgICAgJCgnI3B1Ymxpc2gnKS5hZGRDbGFzcygncHJvY2Vzc2luZycpXG5cbiAgICAgIGNvbnNvbGUubG9nIEBjdXJyZW50QnVpbGRcblxuICAgICAgQGV4cG9ydERhdGEoQGN1cnJlbnRCdWlsZClcblxuICAgIGVsc2VcblxuICAgICAgYWxlcnQoJ1lvdSBtdXN0IGVudGVyIGEgY291cnNlIHRpdGxlIGFzIHRoaXMgd2lsbCBiZWNvbWUgdGhlIHRpdGxlIG9mIHlvdXIgY291cnNlIHBhZ2UuJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJ2ludHJvJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICQoJyNjb3Vyc2VfbmFtZScpLmZvY3VzKClcblxuICAgICAgLDUwMClcblxuXG4gICAgXG5cbiAgICBcblxuICAgIFxuIiwiIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbldpa2lTdW1tYXJ5TW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraVN1bW1hcnlNb2R1bGUuaGJzJylcbldpa2lEZXRhaWxzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURldGFpbHNNb2R1bGUuaGJzJylcblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblRpbWVsaW5lVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1RpbWVsaW5lVmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBPdmVydmlld1ZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgZXZlbnRzOiBcbiAgICAnY2xpY2sgLmV4cGFuZC1hbGwnIDogJ2V4cGFuZENvbGxhcHNlQWxsJ1xuXG4gIG92ZXJ2aWV3SXRlbVRlbXBsYXRlOiBXaWtpRGV0YWlsc01vZHVsZVxuXG4gIGV4cGFuZENvbGxhcHNlQWxsOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICR0YXJnZXQudG9nZ2xlQ2xhc3MoJ29wZW4nKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyLmhhcy1jb250ZW50JykuZmluZCgnLmN1c3RvbS1pbnB1dC1hY2NvcmRpYW4nKS50b2dnbGVDbGFzcygnYWN0aXZlJylcblxuICAgIGlmICR0YXJnZXQuaGFzQ2xhc3MoJ29wZW4nKVxuICAgICAgJHRhcmdldC50ZXh0KCdbY29sbGFwc2UgYWxsXScpXG4gICAgZWxzZVxuICAgICAgJHRhcmdldC50ZXh0KCdbZXhwYW5kIGFsbF0nKVxuXG5cblxuICAgIFxuXG4gIHJlbmRlcjogLT5cblxuICAgIHNlbGVjdGVkUGF0aHdheXMgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzXG5cbiAgICBzZWxlY3RlZE9iamVjdHMgPSBfLndoZXJlKFdpemFyZFN0ZXBJbnB1dHNbJ2Fzc2lnbm1lbnRfc2VsZWN0aW9uJ10sIHtzZWxlY3RlZDogdHJ1ZX0pXG5cbiAgICAkKCc8ZGl2IGNsYXNzPVwic3RlcC1mb3JtLWNvbnRlbnRfX3RpdGxlXCI+U2VsZWN0ZWQgYXNzaWdubWVudChzKTo8L2Rpdj4nKS5hcHBlbmRUbyhAJGVsKS5jc3MoXG4gICAgICBtYXJnaW5Cb3R0b206ICc4cHgnXG4gICAgKVxuXG4gICAgXy5lYWNoKHNlbGVjdGVkT2JqZWN0cywgKG9iaikgPT5cblxuICAgICAgcGF0aFRpdGxlID0gb2JqLmxhYmVsXG5cbiAgICAgICRuZXdUaXRsZSA9ICQoQG92ZXJ2aWV3SXRlbVRlbXBsYXRlKFxuXG4gICAgICAgIGxhYmVsOiBwYXRoVGl0bGVcblxuICAgICAgICBzdGVwSWQ6ICdhc3NpZ25tZW50X3NlbGVjdGlvbidcblxuICAgICAgICBhc3NpZ25tZW50czogW11cblxuICAgICAgKSkuZmluZCgnLmN1c3RvbS1pbnB1dCcpLnJlbW92ZUNsYXNzKCdjdXN0b20taW5wdXQtLWFjY29yZGlhbicpXG5cbiAgICAgICRuZXdUaXRsZS5maW5kKCcuZWRpdC1idXR0b24nKVxuXG4gICAgICBAJGVsLmFwcGVuZCgkbmV3VGl0bGUpXG5cbiAgICApXG5cbiAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICBcbiAgICBcbiAgICBfLmVhY2goc2VsZWN0ZWRQYXRod2F5cywgKHBpZCwgaSkgPT5cblxuICAgICAgc3RlcERhdGEgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwRGF0YS5wYXRod2F5c1twaWRdXG5cbiAgICAgIGlucHV0RGF0YUlkcyA9IF8ucGx1Y2soc3RlcERhdGEsICdpZCcpXG5cbiAgICAgIHN0ZXBUaXRsZXMgPSBfLnBsdWNrKHN0ZXBEYXRhLCAndGl0bGUnKVxuXG4gICAgICB0b3RhbExlbmd0aCA9IHN0ZXBEYXRhLmxlbmd0aFxuXG4gICAgICBpZiBzdGVwVGl0bGVzLmxlbmd0aCA+IDAgJiYgaSBpcyAwXG5cbiAgICAgICAgJCgnPGRpdiBjbGFzcz1cInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVwiPkFzc2lnbm1lbnQgZGV0YWlsczogPGEgY2xhc3M9XCJleHBhbmQtYWxsXCIgaHJlZj1cIiNcIj5bZXhwYW5kIGFsbF08L2E+PC9kaXY+JykuYXBwZW5kVG8oQCRlbCkuY3NzKFxuICAgICAgICAgIGJvdHRvbTogJ2F1dG8nXG4gICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnXG4gICAgICAgICAgbWFyZ2luQm90dG9tOiAnMCdcbiAgICAgICAgICBtYXJnaW5Ub3A6ICcxNXB4J1xuICAgICAgICApXG5cbiAgICAgIF8uZWFjaChzdGVwVGl0bGVzLCAodGl0bGUsIGluZGV4KSA9PlxuXG4gICAgICAgIHVubGVzcyBzdGVwRGF0YVtpbmRleF0uc2hvd0luT3ZlcnZpZXdcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgICBzdGVwSW5wdXRJdGVtcyA9IFdpemFyZFN0ZXBJbnB1dHNbaW5wdXREYXRhSWRzW2luZGV4XV1cblxuXG4gICAgICAgIF8uZWFjaChzdGVwSW5wdXRJdGVtcywgKGlucHV0KSA9PlxuXG4gICAgICAgICAgaWYgaW5wdXQudHlwZVxuXG4gICAgICAgICAgICBpZiBpbnB1dC50eXBlIGlzICdjaGVja2JveCcgfHwgaW5wdXQudHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgICAgICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5sYWJlbFxuXG4gICAgICAgICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3JhZGlvR3JvdXAnXG5cbiAgICAgICAgICAgICAgaWYgaW5wdXQuaWQgaXMgJ3BlZXJfcmV2aWV3cydcblxuICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQub3ZlcnZpZXdMYWJlbFxuICAgICAgICApXG5cbiAgICAgICAgaWYgc2VsZWN0ZWRJbnB1dHMubGVuZ3RoID09IDBcblxuICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggXCJbTm9uZSBzZWxlY3RlZF1cIlxuXG4gICAgICAgIEAkZWwuYXBwZW5kKCBAb3ZlcnZpZXdJdGVtVGVtcGxhdGUoXG5cbiAgICAgICAgICBsYWJlbDogdGl0bGVcblxuICAgICAgICAgIHN0ZXBJZDogaW5wdXREYXRhSWRzW2luZGV4XVxuXG4gICAgICAgICAgYXNzaWdubWVudHM6IHNlbGVjdGVkSW5wdXRzXG5cbiAgICAgICAgKSlcblxuICAgICAgKVxuICAgIClcblxuICAgIEByZW5kZXJEZXNjcmlwdGlvbigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuXG4gIHJlbmRlckRlc2NyaXB0aW9uOiAtPlxuXG4gICAgQFRpbWVsaW5lVmlldyA9IG5ldyBUaW1lbGluZVZpZXcoKVxuXG4gICAgJGRlc2NJbnB1dCA9ICQoXCI8dGV4dGFyZWEgaWQ9J3Nob3J0X2Rlc2NyaXB0aW9uJyByb3dzPSc2JyBzdHlsZT0nd2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjQyLDI0MiwyNDIsMS4wKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjAyLDIwMiwyMDIsMS4wKTtwYWRkaW5nOjEwcHggMTVweDtmb250LXNpemU6IDE2cHg7bGluZS1oZWlnaHQgMjNweDtsZXR0ZXItc3BhY2luZzogMC4yNXB4Oyc+PC90ZXh0YXJlYT5cIilcblxuICAgICRkZXNjSW5wdXQudmFsKFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb24pXG5cbiAgICAkKCcuZGVzY3JpcHRpb24tY29udGFpbmVyJykuaHRtbCgkZGVzY0lucHV0WzBdKVxuXG4gICAgJGRlc2NJbnB1dC5vZmYgJ2NoYW5nZSdcblxuICAgICRkZXNjSW5wdXQub24gJ2NoYW5nZScsIChlKSA9PlxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzLmNvdXJzZV9kZXRhaWxzLmRlc2NyaXB0aW9uID0gJChlLnRhcmdldCkudmFsKClcblxuICAgICAgQFRpbWVsaW5lVmlldy51cGRhdGUoKVxuICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudGltZWxpbmVWaWV3LnVwZGF0ZSgpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuXG4gICAgXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE5hdlZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cblN0ZXBOYXZUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBOYXZWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcC1uYXYnXG5cblxuICB0ZW1wbGF0ZTogU3RlcE5hdlRlbXBsYXRlXG5cblxuICBoYXNCZWVuVG9MYXN0U3RlcDogZmFsc2VcblxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgXG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6dXBkYXRlJyA6ICd1cGRhdGVDdXJyZW50U3RlcCdcblxuICAgICdzdGVwOmFuc3dlcmVkJyA6ICdzdGVwQW5zd2VyZWQnXG5cbiAgICAnZWRpdDpleGl0JyA6ICdlZGl0RXhpdEhhbmRsZXInXG5cblxuICBldmVudHM6IC0+XG5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnByZXYnIDogJ3ByZXZDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmRvdCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPCBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgIGVsc2UgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPT0gQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGN1cnJlbnQ6IEBjdXJyZW50U3RlcFxuXG4gICAgICB0b3RhbDogQHRvdGFsU3RlcHNcblxuICAgICAgcHJldkluYWN0aXZlOiBAaXNJbmFjdGl2ZSgncHJldicpXG5cbiAgICAgIG5leHRJbmFjdGl2ZTogQGlzSW5hY3RpdmUoJ25leHQnKVxuXG4gICAgICBuZXh0VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICcnXG5cbiAgICAgICAgZWxzZSBcblxuICAgICAgICAgIHJldHVybiAnTmV4dCdcblxuICAgICAgcHJldlRpdGxlOiA9PlxuXG4gICAgICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgICAgIHJldHVybiAnQmFjaydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdQcmV2J1xuXG4gICAgICBpc0xhc3RTdGVwOiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIGJhY2tUb092ZXJ2aWV3VGl0bGU6ICdHbyBCYWNrIHRvIE92ZXJ2aWV3J1xuXG4gICAgICBzdGVwczogPT5cblxuICAgICAgICBvdXQgPSBbXVxuXG4gICAgICAgIF8uZWFjaChAc3RlcFZpZXdzLCAoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgICAgICBzdGVwRGF0YSA9IHN0ZXAubW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICAgICAgaXNBY3RpdmUgPSBAY3VycmVudFN0ZXAgaXMgaW5kZXhcblxuICAgICAgICAgIHdhc1Zpc2l0ZWQgPSBzdGVwLmhhc1VzZXJWaXNpdGVkXG5cbiAgICAgICAgICBvdXQucHVzaCB7aWQ6IGluZGV4LCBpc0FjdGl2ZTogaXNBY3RpdmUsIGhhc1Zpc2l0ZWQ6IHdhc1Zpc2l0ZWQsIHN0ZXBUaXRsZTogc3RlcERhdGEudGl0bGUsIHN0ZXBJZDogc3RlcERhdGEuaWR9XG5cbiAgICAgICAgKVxuXG4gICAgICAgIHJldHVybiBvdXRcblxuICAgIH1cblxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnZ3JhZGluZycpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICBkb3RDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZiBAaGFzQmVlblRvTGFzdFN0ZXBcblxuICAgICAgaWYgcGFyc2VJbnQoJHRhcmdldC5hdHRyKCdkYXRhLW5hdi1pZCcpKSA9PSBwYXJzZUludChAdG90YWxTdGVwcyAtIDEpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZWRpdDpleGl0JylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICR0YXJnZXQuZGF0YSgnc3RlcC1pZCcpKVxuXG4gICAgZWxzZVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCAkdGFyZ2V0LmRhdGEoJ25hdi1pZCcpKVxuXG5cbiAgZWRpdEV4aXRIYW5kbGVyOiAtPlxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGxhc3RTdGVwSW5kZXgoKSlcblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IHN0ZXBcblxuICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgQGhhc0JlZW5Ub0xhc3RTdGVwID0gdHJ1ZVxuXG4gICAgQHJlbmRlcigpXG5cblxuICBzdGVwQW5zd2VyZWQ6IChzdGVwVmlldykgLT5cblxuICAgIHJldHVybiBAcmVuZGVyKClcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSGVscGVyc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBsYXN0U3RlcEluZGV4OiAtPlxuICAgIFxuICAgIHJldHVybiBAdG90YWxTdGVwcy0xXG5cbiAgaXNMYXN0U3RlcDogLT5cblxuICAgIHJldHVybiBAY3VycmVudFN0ZXAgaXMgQHRvdGFsU3RlcHMgLSAxICYmIEBjdXJyZW50U3RlcCA+IDFcblxuICBpc0luYWN0aXZlOiAoaXRlbSkgLT5cblxuICAgIGl0SXMgPSB0cnVlXG5cbiAgICBpZiBpdGVtID09ICdwcmV2J1xuXG4gICAgICBpdElzID0gQGN1cnJlbnRTdGVwIGlzIDBcblxuICAgIGVsc2UgaWYgaXRlbSA9PSAnbmV4dCdcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uaGFzVXNlckFuc3dlcmVkXG5cbiAgICAgICAgaXRJcyA9IGZhbHNlXG5cbiAgICAgIGVsc2UgaWYgQGlzTGFzdFN0ZXAoKVxuICAgICAgICBcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggPT0gMFxuXG4gICAgICAgIGl0SXMgPSB0cnVlICBcblxuXG4gICAgcmV0dXJuIGl0SXNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcFZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyMjIyMjIyMjQVBQIyMjIyMjIyMjXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyMjIyMjIyMjVklFVyBDTEFTUyMjIyMjIyMjI1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuIyMjIyMjIyMjU1VCVklFV1MjIyMjIyMjIyNcbklucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuXG5EYXRlSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvRGF0ZUlucHV0VmlldycpXG5cblxuR3JhZGluZ0lucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcnKVxuXG5cbk92ZXJ2aWV3VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL092ZXJ2aWV3VmlldycpXG5cblxuIyMjIyMjIyMjVEVNUExBVEVTIyMjIyMjIyMjIyNcblN0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9TdGVwVGVtcGxhdGUuaGJzJylcblxuXG5JbnRyb1N0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9JbnRyb1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5cbklucHV0VGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicycpXG5cblxuQ291cnNlVGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMnKVxuXG5cbldpa2lEYXRlc01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMnKVxuXG4jIyMjIyMjIyMjREFUQSMjIyMjIyMjI1xuQ291cnNlSW5mb0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZENvdXJzZUluZm8nKVxuXG4jIyMjIyMjIyNJTlBVVFMjIyMjIyMjIyNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcCdcblxuXG4gIHRhZ05hbWU6ICdzZWN0aW9uJ1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBUZW1wbGF0ZVxuXG5cbiAgaW50cm9UZW1wbGF0ZTogSW50cm9TdGVwVGVtcGxhdGVcblxuXG4gIHRpcFRlbXBsYXRlOiBJbnB1dFRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvVGVtcGxhdGU6IENvdXJzZVRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvRGF0YTogQ291cnNlSW5mb0RhdGFcblxuXG4gIGRhdGVzTW9kdWxlOiBXaWtpRGF0ZXNNb2R1bGVcblxuXG4gIGhhc1VzZXJBbnN3ZXJlZDogZmFsc2VcblxuXG4gIGhhc1VzZXJWaXNpdGVkOiBmYWxzZVxuXG5cbiAgaXNMYXN0U3RlcDogZmFsc2VcblxuXG4gIGlzRmlyc3RTdGVwOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlRTIEFORCBIQU5ETEVSU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6XG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuICAgICMgJ2NsaWNrIC5zdGVwLWluZm8tdGlwJyA6ICdoaWRlVGlwcydcblxuICBzdWJzY3JpcHRpb25zOiBcblxuICAgICd0aXBzOmhpZGUnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2RhdGU6Y2hhbmdlJyA6ICdpc0ludHJvVmFsaWQnXG5cblxuICBlZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIHN0ZXBJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXN0ZXAtaWQnKVxuXG4gICAgaWYgc3RlcElkXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsIHN0ZXBJZClcblxuICBzdGVwSWQ6IC0+XG5cbiAgICByZXR1cm4gQG1vZGVsLmF0dHJpYnV0ZXMuaWRcblxuXG4gIHZhbGlkYXRlRGF0ZXM6IC0+XG5cbiAgICB1bmxlc3MgQGlzRmlyc3RTdGVwIG9yIEBpc0xhc3RTdGVwXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZGF0ZXNBcmVWYWxpZCA9IGZhbHNlXG5cbiAgICAjIGlmICQoJyN0ZXJtU3RhcnREYXRlJykudmFsICE9ICcnICYmICQoJyN0ZXJtRW5kRGF0ZScpLnZhbCAhPSAnJyAmJiAkKCcjY291cnNlU3RhcnREYXRlJykudmFsICE9ICcnICYmICQoJyNjb3Vyc2VFbmREYXRlJykudmFsICE9ICcnXG4gICAgIyAgIGRhdGVzQXJlVmFsaWQgPSB0cnVlXG5cbiAgICBpZiBXaXphcmRTdGVwSW5wdXRzLmNvdXJzZV9kZXRhaWxzLnN0YXJ0X2RhdGUgIT0gJycgYW5kIFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuZW5kX2RhdGUgIT0gJydcbiAgICAgIGRhdGVzQXJlVmFsaWQgPSB0cnVlXG5cbiAgICByZXR1cm4gZGF0ZXNBcmVWYWxpZFxuXG5cbiAgYWNjb3JkaWFuQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICR0YXJnZXQudG9nZ2xlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd3aXphcmQ6cHVibGlzaCcpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAdGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnZmlyc3QnKVxuXG4gICAgZWxzZSBpZiBAaXNMYXN0U3RlcFxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdsYXN0JylcbiAgICAgIFxuICAgIGVsc2VcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnc3RhbmRhcmQnKVxuXG4gICAgQF9yZW5kZXJJbnB1dHNBbmRJbmZvKClcblxuICAgIHJldHVybiBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgX3JlbmRlclN0ZXBUeXBlOiAodHlwZSkgLT5cblxuICAgIGlmIHR5cGUgaXMgJ3N0YW5kYXJkJ1xuXG4gICAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ2ZpcnN0JyBvciB0eXBlIGlzICdsYXN0J1xuXG4gICAgICBpZiB0eXBlIGlzICdmaXJzdCdcblxuICAgICAgICBAJGVsLmFkZENsYXNzKCdzdGVwLS1maXJzdCcpLmh0bWwoIEBpbnRyb1RlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgICAgICBkYXRlVGl0bGUgPSAnQ291cnNlIGRhdGVzJ1xuXG4gICAgICAgIEAkYmVnaW5CdXR0b24gPSBAJGVsLmZpbmQoJ2EjYmVnaW5CdXR0b24nKVxuXG5cbiAgICAgICRkYXRlcyA9ICQoQGRhdGVzTW9kdWxlKHt0aXRsZTogZGF0ZVRpdGxlfSkpXG5cblxuICAgICAgQCRlbC5maW5kKCcuc3RlcC1mb3JtLWRhdGVzJykuaHRtbCgkZGF0ZXMpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgX3JlbmRlcklucHV0c0FuZEluZm86IC0+XG5cbiAgICBAaW5wdXRTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgIEAkdGlwU2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtaW5mby10aXBzJylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJ1xuXG4gICAgICBwYXRod2F5cyA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXNcblxuICAgICAgbnVtYmVyT2ZQYXRod2F5cyA9IHBhdGh3YXlzLmxlbmd0aFxuXG4gICAgICBpZiBudW1iZXJPZlBhdGh3YXlzID4gMVxuXG4gICAgICAgIGRpc3RyaWJ1dGVkVmFsdWUgPSBNYXRoLmZsb29yKDEwMC9udW1iZXJPZlBhdGh3YXlzKVxuXG4gICAgICAgIEBpbnB1dERhdGEgPSBbXVxuXG4gICAgICAgIF8uZWFjaChwYXRod2F5cywgKHBhdGh3YXkpID0+XG5cbiAgICAgICAgICBncmFkaW5nRGF0YSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdW3BhdGh3YXldXG5cbiAgICAgICAgICBfLmVhY2goZ3JhZGluZ0RhdGEsIChncmFkZUl0ZW0pID0+XG5cbiAgICAgICAgICAgIGdyYWRlSXRlbS52YWx1ZSA9IGRpc3RyaWJ1dGVkVmFsdWVcblxuICAgICAgICAgICAgQGlucHV0RGF0YS5wdXNoIGdyYWRlSXRlbVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgIClcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBpbnB1dERhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVtwYXRod2F5c1swXV0gfHwgW11cblxuICAgIGVsc2VcblxuICAgICAgQGlucHV0RGF0YSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdIHx8IFtdXG5cblxuICAgIF8uZWFjaChAaW5wdXREYXRhLCAoaW5wdXQsIGluZGV4KSA9PlxuXG4gICAgICB1bmxlc3MgaW5wdXQudHlwZSBcblxuICAgICAgICByZXR1cm5cblxuICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgJiYgaW5wdXQucmVxdWlyZWRcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnNlbGVjdGVkIFxuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQucmVxdWlyZWQgaXMgZmFsc2VcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3BlcmNlbnQnXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuXG4gICAgICBpbnB1dFZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldyhcblxuICAgICAgICBtb2RlbDogbmV3IEJhY2tib25lLk1vZGVsKGlucHV0KVxuXG4gICAgICApXG5cbiAgICAgIGlucHV0Vmlldy5pbnB1dFR5cGUgPSBpbnB1dC50eXBlXG5cbiAgICAgIGlucHV0Vmlldy5pdGVtSW5kZXggPSBpbmRleFxuXG4gICAgICBpbnB1dFZpZXcucGFyZW50U3RlcCA9IEBcblxuICAgICAgQGlucHV0U2VjdGlvbi5hcHBlbmQoaW5wdXRWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBpbnB1dC50aXBJbmZvXG5cbiAgICAgICAgdGlwID0gXG5cbiAgICAgICAgICBpZDogaW5kZXhcblxuICAgICAgICAgIHRpdGxlOiBpbnB1dC50aXBJbmZvLnRpdGxlXG5cbiAgICAgICAgICBjb250ZW50OiBpbnB1dC50aXBJbmZvLmNvbnRlbnRcblxuICAgICAgICAkdGlwRWwgPSBAdGlwVGVtcGxhdGUodGlwKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgICAgZWxzZSBpZiBpbnB1dC5oYXNDb3Vyc2VJbmZvXG5cbiAgICAgICAgaW5mb0RhdGEgPSBfLmV4dGVuZChAY291cnNlSW5mb0RhdGFbaW5wdXQuaWRdLCB7aWQ6IGluZGV4fSApXG5cbiAgICAgICAgJHRpcEVsID0gQGNvdXJzZUluZm9UZW1wbGF0ZShpbmZvRGF0YSlcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGlucHV0Q29udGFpbmVycyA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZycgfHwgQG1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnZ3JhZGluZydcblxuICAgICAgQGdyYWRpbmdWaWV3ID0gbmV3IEdyYWRpbmdJbnB1dFZpZXcoKVxuXG4gICAgICBAZ3JhZGluZ1ZpZXcucGFyZW50U3RlcFZpZXcgPSBAXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1jb250ZW50JykuYXBwZW5kKEBncmFkaW5nVmlldy5nZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpLmVsKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ292ZXJ2aWV3J1xuXG4gICAgICAkaW5uZXJFbCA9IEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1pbm5lcicpXG5cbiAgICAgICRpbm5lckVsLmh0bWwoJycpXG5cbiAgICAgIEBvdmVydmlld1ZpZXcgPSBuZXcgT3ZlcnZpZXdWaWV3KFxuICAgICAgICBlbDogJGlubmVyRWxcbiAgICAgIClcblxuICAgICAgQG92ZXJ2aWV3Vmlldy5wYXJlbnRTdGVwVmlldyA9IEBcblxuICAgICAgQG92ZXJ2aWV3Vmlldy5yZW5kZXIoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGU6IC0+XG5cbiAgICBAJGVsLmhpZGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHNob3c6IC0+XG5cbiAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcbiAgICAgIHNjcm9sbFRvcDogMFxuICAgICwxKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ292ZXJ2aWV3JyB8fCBAbW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdvdmVydmlldydcblxuICAgICAgQHJlbmRlcigpLiRlbC5zaG93KClcblxuICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudGltZWxpbmVWaWV3LnVwZGF0ZSgpXG5cbiAgICBlbHNlIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJyB8fCBAbW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdncmFkaW5nJ1xuXG4gICAgICBAcmVuZGVyKCkuJGVsLnNob3coKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnNob3coKVxuXG4gICAgQGhhc1VzZXJWaXNpdGVkID0gdHJ1ZVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGJlZ2luSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cbiAgdXBkYXRlVXNlckhhc0Fuc3dlcmVkOiAoaWQsIHZhbHVlLCB0eXBlKSAtPlxuXG5cbiAgICBpbnB1dEl0ZW1zID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdXG5cbiAgICByZXF1aXJlZFNlbGVjdGVkID0gZmFsc2VcblxuICAgIGlmIHR5cGUgaXMgJ3BlcmNlbnQnXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIHJldHVybiBAXG5cbiAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnY2hlY2tib3gnXG5cbiAgICAgICAgaWYgaXRlbS5pZ25vcmVWYWxpZGF0aW9uXG5cbiAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgaWYgaXRlbS5yZXF1aXJlZCBpcyB0cnVlXG5cbiAgICAgICAgICBpZiBpdGVtLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgaWYgcmVxdWlyZWRTZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ3JhZGlvR3JvdXAnIG9yIHR5cGUgaXMgJ3JhZGlvQm94J1xuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICd0ZXh0J1xuXG4gICAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgICAgICBpZiBpdGVtLnR5cGUgaXMgJ3RleHQnXG5cbiAgICAgICAgICAgIGlmIGl0ZW0ucmVxdWlyZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIGlmIGl0ZW0udmFsdWUgIT0gJydcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgZWxzZSBcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIClcblxuICAgICAgICBpZiByZXF1aXJlZFNlbGVjdGVkXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gZmFsc2VcblxuICAgICAgICBAaXNJbnRyb1ZhbGlkKClcblxuICAgIGVsc2UgXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSBmYWxzZVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDphbnN3ZXJlZCcsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgaXNJbnRyb1ZhbGlkOiAtPlxuXG4gICAgdW5sZXNzIEBpc0ZpcnN0U3RlcCBvciBAaXNMYXN0U3RlcFxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICBpZiBAaGFzVXNlckFuc3dlcmVkIGFuZCBAdmFsaWRhdGVEYXRlcygpXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5yZW1vdmVDbGFzcygnaW5hY3RpdmUnKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbi5hZGRDbGFzcygnaW5hY3RpdmUnKVxuXG5cbiAgdXBkYXRlUmFkaW9BbnN3ZXI6IChpZCwgaW5kZXgsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5zZWxlY3RlZCA9IHZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS52YWx1ZVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vdmVydmlld0xhYmVsID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5vdmVydmlld0xhYmVsXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gaW5kZXhcblxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlLCBoYXNQYXRod2F5LCBwYXRod2F5KSAtPlxuXG4gICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnR5cGUgXG5cbiAgICAgIGlzRXhjbHVzaXZlID0gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgICBpc0V4Y2x1c2l2ZSA9IGZhbHNlIHx8IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uZXhjbHVzaXZlIFxuXG5cbiAgICBoYXNFeGNsdXNpdmVTaWJsaW5nID0gZmFsc2VcblxuICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF0sIChpbnB1dEl0ZW0pID0+XG5cbiAgICAgIGlmIGlucHV0SXRlbS5leGNsdXNpdmVcblxuICAgICAgICBoYXNFeGNsdXNpdmVTaWJsaW5nID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgb3V0ID0gXG5cbiAgICAgIHR5cGU6IGlucHV0VHlwZVxuXG4gICAgICBpZDogaWRcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cbiAgICBpZiBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94JyB8fCBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICBpZiB2YWx1ZSA9PSAnb24nXG5cbiAgICAgICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgIGlmIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgJiYgIWlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLmFkZENsYXNzKCdub3QtZWRpdGFibGUnKS5yZW1vdmVDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGVsc2UgaWYgaXNFeGNsdXNpdmVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKS5ub3QoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLmFkZENsYXNzKCdub3QtZWRpdGFibGUnKS5yZW1vdmVDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGlmIEBtb2RlbC5pZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICAgICAgXG4gICAgICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudXBkYXRlU2VsZWN0ZWRQYXRod2F5KCdhZGQnLCBpZClcblxuICAgICAgZWxzZVxuXG4gICAgICAgIGlmIGhhc1BhdGh3YXlcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtwYXRod2F5XVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIGlmIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgJiYgIWlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBhbGxPdGhlcnNEaXNlbmdhZ2VkID0gdHJ1ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpLmVhY2goLT5cblxuICAgICAgICAgICAgaWYgISQodGhpcykuYXR0cignZGF0YS1leGNsdXNpdmUnKSAmJiAkKHRoaXMpLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgICAgICAgICBhbGxPdGhlcnNEaXNlbmdhZ2VkID0gZmFsc2VcblxuICAgICAgICAgIClcblxuICAgICAgICAgIGlmIGFsbE90aGVyc0Rpc2VuZ2FnZWRcblxuICAgICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5yZW1vdmVDbGFzcygnbm90LWVkaXRhYmxlJykuYWRkQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5hZGRDbGFzcygnbm90LWVkaXRhYmxlJykucmVtb3ZlQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBlbHNlIGlmIGlzRXhjbHVzaXZlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94Jykubm90KCcuY3VzdG9tLWlucHV0LS1jaGVja2JveFtkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKS5yZW1vdmVDbGFzcygnbm90LWVkaXRhYmxlJykuYWRkQ2xhc3MoJ2VkaXRhYmxlJylcblxuICAgICAgICBpZiBAbW9kZWwuaWQgaXMgJ2Fzc2lnbm1lbnRfc2VsZWN0aW9uJ1xuICAgICAgICAgIFxuICAgICAgICAgIGFwcGxpY2F0aW9uLmhvbWVWaWV3LnVwZGF0ZVNlbGVjdGVkUGF0aHdheSgncmVtb3ZlJywgaWQpXG5cbiAgICBlbHNlIGlmIGlucHV0VHlwZSA9PSAndGV4dCcgfHwgaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICBpZiBoYXNQYXRod2F5XG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS52YWx1ZSA9IHZhbHVlXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gdmFsdWVcblxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG5cblxuXG4gICAgXG4gICAgXG5cbiBcblxuIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbkRldGFpbHNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicycpXG5cbkdyYWRpbmdUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicycpXG5cbkdyYWRpbmdDdXN0b21UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ0FsdFRlbXBsYXRlLmhicycpXG5cbk9wdGlvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicycpXG5cbldpemFyZERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVGltZWxpbmVWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlldyBcblxuICBlbDogJCgnLmZvcm0tY29udGFpbmVyJylcblxuICB3aWtpU3BhY2U6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX08YnIvPidcblxuICB3aWtpTm9DbGFzczogJ05PIENMQVNTIFdFRUsgT0YgJ1xuXG4gIGxvbmdlc3RDb3Vyc2VMZW5ndGg6IDE2XG5cbiAgc2hvcnRlc3RDb3Vyc2VMZW5ndGg6IDZcblxuICBkZWZhdWx0Q291cnNlTGVuZ3RoOiAxNlxuXG4gIGRlZmF1bHRFbmREYXRlczogWycwNi0zMCcsICcxMi0zMSddXG5cbiAgY3VycmVudEJsYWNrb3V0RGF0ZXM6IFtdXG5cbiAgbGVuZ3RoOiAwXG5cbiAgYWN0dWFsTGVuZ3RoOiAwXG5cbiAgd2Vla2x5RGF0ZXM6IFtdXG5cbiAgd2Vla2x5U3RhcnREYXRlczogW11cblxuICB0b3RhbEJsYWNrb3V0V2Vla3M6IDBcblxuICBkYXlzU2VsZWN0ZWQ6IFtmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV1cblxuICBzdGFydF9kYXRlOlxuICAgIHZhbHVlOiAnJ1xuXG4gIGVuZF9kYXRlOlxuICAgIHZhbHVlOiAnJ1xuXG4gIHRlcm1fc3RhcnRfZGF0ZTpcbiAgICB2YWx1ZTogJydcblxuICB0ZXJtX2VuZF9kYXRlOlxuICAgIHZhbHVlOiAnJ1xuXG4gIGluaXRpYWxpemU6IC0+XG4gIFxuICAgICQoJ2lucHV0W3R5cGU9XCJkYXRlXCJdJykuZGF0ZXBpY2tlcihcblxuICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICBjb25zdHJhaW5JbnB1dDogdHJ1ZVxuXG4gICAgICBmaXJzdERheTogMVxuXG4gICAgKS5wcm9wKCd0eXBlJywndGV4dCcpXG5cbiAgICBAJGJsYWNrb3V0RGF0ZXMgPSAkKCcjYmxhY2tvdXREYXRlcycpXG5cbiAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcihcblxuICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICBmaXJzdERheTogMVxuXG4gICAgICBhbHRGaWVsZDogJyNibGFja291dERhdGVzRmllbGQnXG5cbiAgICAgIG9uU2VsZWN0OiA9PlxuXG4gICAgICAgIEBjdXJyZW50QmxhY2tvdXREYXRlcyA9IEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdnZXREYXRlcycpXG5cbiAgICAgICAgQHVwZGF0ZVRpbWVsaW5lKClcbiAgICApXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZSA9ICQoJyNzdGFydFdlZWtPZkRhdGUnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUgPSAkKCcjY291cnNlU3RhcnREYXRlJylcblxuICAgIEAkY291cnNlRW5kRGF0ZSA9ICQoJyNjb3Vyc2VFbmREYXRlJylcblxuICAgIEAkdGVybVN0YXJ0RGF0ZSA9ICQoJyN0ZXJtU3RhcnREYXRlJylcblxuICAgIEAkdGVybUVuZERhdGUgPSAgICQoJyN0ZXJtRW5kRGF0ZScpXG5cbiAgICBAJG91dENvbnRhaW5lciA9ICQoJy5vdXRwdXQtY29udGFpbmVyJylcblxuICAgIEAkcHJldmlld0NvbnRhaW5lciA9ICQoJy5wcmV2aWV3LWNvbnRhaW5lcicpXG5cbiAgICBAZGF0YSA9IFtdXG5cbiAgICBAZGF0YSA9IGFwcGxpY2F0aW9uLnRpbWVsaW5lRGF0YVxuXG4gICAgQGRhdGFBbHQgPSBhcHBsaWNhdGlvbi50aW1lbGluZURhdGFBbHRcblxuICAgICQoJyN0ZXJtU3RhcnREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZVRlcm1TdGFydChlKVxuXG4gICAgJCgnI3Rlcm1FbmREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZVRlcm1FbmQoZSlcblxuICAgICQoJyNjb3Vyc2VTdGFydERhdGUnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAY2hhbmdlQ291cnNlU3RhcnQoZSlcblxuICAgICQoJyNjb3Vyc2VFbmREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZUNvdXJzZUVuZChlKVxuXG4gICAgJCgnLmRvd0NoZWNrYm94Jykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQG9uRG93U2VsZWN0KGUpXG5cbiAgICAkKCcjdGVybVN0YXJ0RGF0ZScpLm9uICdmb2N1cycsIChlKSA9PlxuICAgICAgJCgnYm9keSxodG1sJykuYW5pbWF0ZShcbiAgICAgICAgc2Nyb2xsVG9wOiAkKCcjdGVybVN0YXJ0RGF0ZScpLm9mZnNldCgpLnRvcCAtIDM1MFxuICAgICAgLCA0MDApXG5cbiAgICBAdXBkYXRlKClcblxuICBvbkRvd1NlbGVjdDogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBkb3cgPSAkdGFyZ2V0LmF0dHIoJ2lkJylcblxuICAgIGRvd0lkID0gcGFyc2VJbnQoJHRhcmdldC52YWwoKSlcblxuICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgQGRheXNTZWxlY3RlZFtkb3dJZF0gPSB0cnVlXG5cbiAgICBlbHNlXG5cbiAgICAgIEBkYXlzU2VsZWN0ZWRbZG93SWRdID0gZmFsc2VcblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMud2Vla2RheXNfc2VsZWN0ZWQgPSBAZGF5c1NlbGVjdGVkXG5cbiAgICBpZiBAc3RhcnRfZGF0ZS52YWx1ZSAhPSAnJyAmJiBAZW5kX2RhdGUudmFsdWUgIT0gJydcbiAgICAgIGlmIF8uaW5kZXhPZihAZGF5c1NlbGVjdGVkLCB0cnVlKSAhPSAtMVxuICAgICAgICAkKCcuYmxhY2tvdXREYXRlcy13cmFwcGVyJykuYWRkQ2xhc3MoJ29wZW4nKVxuICAgICAgZWxzZVxuICAgICAgICAkKCcuYmxhY2tvdXREYXRlcy13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuICAgIGVsc2VcblxuICAgICAgJCgnLmJsYWNrb3V0RGF0ZXMtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuICAgIEB1cGRhdGVUaW1lbGluZSgpXG5cblxuICBjaGFuZ2VUZXJtU3RhcnQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG5cbiAgICAgIEB0ZXJtX2VuZF9kYXRlID1cblxuICAgICAgICB2YWx1ZTogJydcblxuICAgICAgcmV0dXJuIFxuXG4gICAgZGF0ZU1vbWVudCA9IG1vbWVudCh2YWx1ZSlcblxuICAgIGRhdGUgPSBkYXRlTW9tZW50LnRvRGF0ZSgpXG5cbiAgICBAdGVybV9zdGFydF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIHllYXJNb2QgPSAwXG5cbiAgICBpZiBAdGVybV9zdGFydF9kYXRlLndlZWsgaXMgMVxuXG4gICAgICB5ZWFyTW9kID0gMVxuXG4gICAgaXNBZnRlciA9IGRhdGVNb21lbnQuaXNBZnRlcihcIiN7ZGF0ZU1vbWVudC55ZWFyKCkreWVhck1vZH0tMDYtMDFcIilcblxuICAgIGlmIGlzQWZ0ZXJcblxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKX0tI3tAZGVmYXVsdEVuZERhdGVzWzFdfVwiXG5cbiAgICBlbHNlXG5cbiAgICAgIGVuZERhdGVTdHJpbmcgPSBcIiN7ZGF0ZU1vbWVudC55ZWFyKCkreWVhck1vZH0tI3tAZGVmYXVsdEVuZERhdGVzWzBdfVwiXG5cbiAgICBpZiBpc0FmdGVyXG5cbiAgICAgIGlzRnVsbFdpZHRoQ291cnNlID0gNTMgLSBAdGVybV9zdGFydF9kYXRlLndlZWsgPiBAZGVmYXVsdENvdXJzZUxlbmd0aFxuXG4gICAgZWxzZVxuXG4gICAgICBpc0Z1bGxXaWR0aENvdXJzZSA9IG1vbWVudChlbmREYXRlU3RyaW5nKS53ZWVrKCkgLSBAdGVybV9zdGFydF9kYXRlLndlZWsgPiBAZGVmYXVsdENvdXJzZUxlbmd0aFxuXG5cbiAgICBAJHRlcm1FbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgaWYgaXNGdWxsV2lkdGhDb3Vyc2UgXG5cbiAgICAgIGRlZmF1bHRFbmREYXRlID0gbW9tZW50KHZhbHVlKS50b0RhdGUoKVxuXG4gICAgICBkZWZhdWx0RW5kRGF0ZS5zZXREYXRlKDcqQGRlZmF1bHRDb3Vyc2VMZW5ndGgpXG5cbiAgICAgIEAkY291cnNlRW5kRGF0ZS52YWwobW9tZW50KGRlZmF1bHRFbmREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRjb3Vyc2VFbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ3Jlc2V0RGF0ZXMnLCAncGlja2VkJylcblxuICAgIHJldHVyblxuXG4gIGNoYW5nZVRlcm1FbmQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG5cbiAgICAgIEB0ZXJtX3N0YXJ0X2RhdGUgPVxuXG4gICAgICAgIHZhbHVlOiAnJ1xuXG4gICAgICByZXR1cm4gXG5cbiAgICBkYXRlTW9tZW50ID0gbW9tZW50KHZhbHVlKVxuXG4gICAgZGF0ZSA9IGRhdGVNb21lbnQudG9EYXRlKClcblxuICAgIEB0ZXJtX2VuZF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIEAkY291cnNlRW5kRGF0ZS52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcigncmVzZXREYXRlcycsICdwaWNrZWQnKVxuXG4gICAgcmV0dXJuXG5cbiAgY2hhbmdlQ291cnNlU3RhcnQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG5cbiAgICAgIEBzdGFydF9kYXRlID1cblxuICAgICAgICB2YWx1ZTogJydcblxuICAgICAgQCRjb3Vyc2VFbmREYXRlLnZhbCgnJykudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQHVwZGF0ZU11bHRpRGF0ZVBpY2tlcigpXG5cbiAgICAgIHJldHVybiBAdXBkYXRlVGltZWxpbmUgXG5cbiAgICBkYXRlTW9tZW50ID0gbW9tZW50KHZhbHVlKVxuXG4gICAgZGF0ZSA9IGRhdGVNb21lbnQudG9EYXRlKClcblxuICAgIEBzdGFydF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIHllYXJNb2QgPSAwXG5cbiAgICBpZiBAc3RhcnRfZGF0ZS53ZWVrIGlzIDFcblxuICAgICAgeWVhck1vZCA9IDFcblxuICAgIGlzQWZ0ZXIgPSBkYXRlTW9tZW50LmlzQWZ0ZXIoXCIje2RhdGVNb21lbnQueWVhcigpK3llYXJNb2R9LTA2LTAxXCIpXG5cbiAgICBpZiBpc0FmdGVyXG5cbiAgICAgIGVuZERhdGVTdHJpbmcgPSBcIiN7ZGF0ZU1vbWVudC55ZWFyKCl9LSN7QGRlZmF1bHRFbmREYXRlc1sxXX1cIlxuXG4gICAgZWxzZVxuXG4gICAgICBlbmREYXRlU3RyaW5nID0gXCIje2RhdGVNb21lbnQueWVhcigpK3llYXJNb2R9LSN7QGRlZmF1bHRFbmREYXRlc1swXX1cIlxuXG4gICAgQCRjb3Vyc2VFbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgaWYgQHRlcm1fc3RhcnRfZGF0ZS52YWx1ZSBpcyAnJ1xuICAgICAgQCR0ZXJtU3RhcnREYXRlLnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgIEB1cGRhdGVNdWx0aURhdGVQaWNrZXIoKVxuXG4gICAgQHVwZGF0ZVRpbWVsaW5lKClcblxuICAgIHJldHVybiBmYWxzZVxuXG5cbiAgY2hhbmdlQ291cnNlRW5kOiAoZSkgLT5cblxuICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpIHx8ICcnXG5cbiAgICBpZiB2YWx1ZSBpcyAnJ1xuICAgICAgQGVuZF9kYXRlID1cbiAgICAgICAgdmFsdWU6ICcnXG5cbiAgICAgIEB1cGRhdGVNdWx0aURhdGVQaWNrZXIoKVxuXG4gICAgICBAdXBkYXRlVGltZWxpbmUoKVxuXG4gICAgICByZXR1cm4gQHVwZGF0ZVRpbWVsaW5lIFxuXG4gICAgZGF0ZU1vbWVudCA9IG1vbWVudCh2YWx1ZSlcblxuICAgIGRhdGUgPSBkYXRlTW9tZW50LnRvRGF0ZSgpXG5cbiAgICBAZW5kX2RhdGUgPSBcblxuICAgICAgbW9tZW50OiBkYXRlTW9tZW50XG5cbiAgICAgIGRhdGU6IGRhdGVcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cbiAgICAgIHdlZWs6IGRhdGVNb21lbnQud2VlaygpXG5cbiAgICAgIHdlZWtkYXk6IFxuXG4gICAgICAgIG1vbWVudDogZGF0ZU1vbWVudC53ZWVrKGRhdGVNb21lbnQud2VlaygpKS53ZWVrZGF5KDApXG5cbiAgICAgICAgZGF0ZTogZGF0ZU1vbWVudC53ZWVrKGRhdGVNb21lbnQud2VlaygpKS53ZWVrZGF5KDApLnRvRGF0ZSgpXG5cbiAgICAgICAgdmFsdWU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS5mb3JtYXQoJ1lZWVktTU0tREQnKVxuXG4gICAgQHVwZGF0ZU11bHRpRGF0ZVBpY2tlcigpXG5cbiAgICBAdXBkYXRlVGltZWxpbmUoKVxuXG4gICAgcmV0dXJuIGZhbHNlXG5cbiAgdXBkYXRlTXVsdGlEYXRlUGlja2VyOiAtPlxuXG5cbiAgICBpZiBAc3RhcnRfZGF0ZS52YWx1ZSAhPSAnJyAmJiBAZW5kX2RhdGUudmFsdWUgIT0gJydcblxuICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ2Rlc3Ryb3knKVxuXG4gICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcihcbiAgICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuICAgICAgICBmaXJzdERheTogMVxuICAgICAgICBhbHRGaWVsZDogJyNibGFja291dERhdGVzRmllbGQnXG4gICAgICAgIGRlZmF1bHREYXRlOiBAc3RhcnRfZGF0ZS53ZWVrZGF5LnZhbHVlXG4gICAgICAgIG1pbkRhdGU6IEBzdGFydF9kYXRlLndlZWtkYXkudmFsdWVcbiAgICAgICAgbWF4RGF0ZTogQGVuZF9kYXRlLnZhbHVlXG4gICAgICAgIG9uU2VsZWN0OiA9PlxuICAgICAgICAgIEBjdXJyZW50QmxhY2tvdXREYXRlcyA9IEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdnZXREYXRlcycpXG4gICAgICAgICAgY29uc29sZS5sb2cgQGN1cnJlbnRCbGFja291dERhdGVzXG4gICAgICAgICAgQHVwZGF0ZVRpbWVsaW5lKClcbiAgICAgIClcblxuICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ3Jlc2V0RGF0ZXMnLCAncGlja2VkJylcblxuICAgICAgaWYgQGN1cnJlbnRCbGFja291dERhdGVzLmxlbmd0aCA+IDBcblxuICAgICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcignYWRkRGF0ZXMnLCBAY3VycmVudEJsYWNrb3V0RGF0ZXMpXG5cbiAgICBlbHNlIFxuXG4gICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcignZGVzdHJveScpXG5cbiAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKFxuXG4gICAgICAgIGRhdGVGb3JtYXQ6ICd5eS1tbS1kZCdcblxuICAgICAgICBmaXJzdERheTogMVxuXG4gICAgICAgIGFsdEZpZWxkOiAnI2JsYWNrb3V0RGF0ZXNGaWVsZCdcblxuICAgICAgICBvblNlbGVjdDogPT5cblxuICAgICAgICAgIEBjdXJyZW50QmxhY2tvdXREYXRlcyA9IEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdnZXREYXRlcycpXG5cbiAgICAgICAgICBAdXBkYXRlVGltZWxpbmUoKVxuICAgICAgKVxuXG4gICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcigncmVzZXREYXRlcycsICdwaWNrZWQnKVxuXG5cblxuXG4gIHVwZGF0ZVRpbWVsaW5lOiAtPlxuXG4gICAgQHdlZWtseVN0YXJ0RGF0ZXMgPSBbXVxuXG4gICAgQHdlZWtseURhdGVzID0gW10gXG5cbiAgICBAb3V0ID0gW11cblxuICAgIEBvdXRXaWtpID0gW11cblxuICAgIGlmIEBzdGFydF9kYXRlLnZhbHVlICE9ICcnICYmIEBlbmRfZGF0ZS52YWx1ZSAhPSAnJ1xuXG5cbiAgICAgICNkaWZmZXJlbmNlIGluIHdlZWtzIGJldHdlZW4gc2VsZWN0ZWQgc3RhcnQgYW5kIGVuZCBkYXRlc1xuICAgICAgZGlmZiA9IEBnZXRXZWVrc0RpZmYoQHN0YXJ0X2RhdGUud2Vla2RheS5tb21lbnQsIEBlbmRfZGF0ZS53ZWVrZGF5Lm1vbWVudClcblxuICAgICAgI2FjdHVhbCBsZW5mZ3RoIGlzIHRoZSBhY3R1YWwgbnVtYmVyIG9mIHdlZWtzIGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgZGF0ZSBcbiAgICAgICNpZiBsZXNzIHRoYW4gNiBtYWtlIGl0IDYgd2Vla3MsIGlmIG1vcmUgdGhhbiAxNiwgbWFrZSBpdCAxNiB3ZWVrc1xuICAgICAgQGFjdHVhbExlbmd0aCA9IDEgKyBkaWZmIFxuXG4gICAgICBpZiBAYWN0dWFsTGVuZ3RoIDwgQHNob3J0ZXN0Q291cnNlTGVuZ3RoXG5cbiAgICAgICAgQGxlbmd0aCA9IEBzaG9ydGVzdENvdXJzZUxlbmd0aFxuXG4gICAgICBlbHNlIGlmIEBhY3R1YWxMZW5ndGggPiBAbG9uZ2VzdENvdXJzZUxlbmd0aFxuXG4gICAgICAgIEBsZW5ndGggPSBAbG9uZ2VzdENvdXJzZUxlbmd0aFxuXG4gICAgICBlbHNlIFxuXG4gICAgICAgIEBsZW5ndGggPSBAYWN0dWFsTGVuZ3RoXG5cbiAgICAgICNtYWtlIGFuIGFycmF5IG9mIGFsbCB0aGUgbW9uZGF5IHdlZWsgc3RhcnQgZGF0ZXMgYXMgc3RyaW5nc1xuICAgICAgQHdlZWtseVN0YXJ0RGF0ZXMgPSBbXVxuXG4gICAgICB3ID0gMFxuXG4gICAgICB3aGlsZSB3IDwgQGxlbmd0aFxuXG4gICAgICAgIGlmIHcgaXMgMFxuXG4gICAgICAgICAgbmV3RGF0ZSA9IG1vbWVudChAc3RhcnRfZGF0ZS53ZWVrZGF5Lm1vbWVudCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBuZXdEYXRlID0gbW9tZW50KEBzdGFydF9kYXRlLndlZWtkYXkubW9tZW50KS53ZWVrKEBzdGFydF9kYXRlLndlZWsrdykuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgICAgICAgXG4gICAgICAgIEB3ZWVrbHlTdGFydERhdGVzLnB1c2gobmV3RGF0ZSlcblxuICAgICAgICB3KytcblxuICAgICAgQHdlZWtseURhdGVzID0gW11cblxuICAgICAgQHRvdGFsQmxhY2tvdXRXZWVrcyA9IDBcblxuXG4gICAgICAjbWFrZSBhbiBvYmplY3QgdGhhdCBsaXN0cyBvdXQgZWFjaCB3ZWVrIHdpdGggZGF0ZXMgYW5kIHdoZXRoZXIgb3Igbm90IHRoZSB3ZWVrIG1lZXRzIGFuZCB3aGV0aGVyIG9yIG5vdCBlYWNoIGRheSBtZWV0c1xuICAgICAgXy5lYWNoKEB3ZWVrbHlTdGFydERhdGVzLCAod2Vla2RhdGUsIHdpKSA9PlxuXG4gICAgICAgIGRNb21lbnQgPSBtb21lbnQod2Vla2RhdGUpXG5cbiAgICAgICAgdG90YWxTZWxlY3RlZCA9IDBcblxuICAgICAgICB0b3RhbEJsYWNrZWRPdXQgPSAwXG5cbiAgICAgICAgdGhpc1dlZWsgPVxuXG4gICAgICAgICAgd2Vla1N0YXJ0OiBkTW9tZW50LmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICAgICAgICBjbGFzc1RoaXNXZWVrOiB0cnVlXG5cbiAgICAgICAgICBkYXRlczogW11cblxuICAgICAgICAgIHdlZWtJbmRleDogd2kgLSBAdG90YWxCbGFja291dFdlZWtzXG5cblxuICAgICAgICBfLmVhY2goQGRheXNTZWxlY3RlZCwgKGRheSwgZGkpID0+XG5cbiAgICAgICAgICBpZiBkYXkgXG5cbiAgICAgICAgICAgIGlzQ2xhc3MgPSB0cnVlXG5cbiAgICAgICAgICAgIGRhdGVTdHJpbmcgPSBkTW9tZW50LndlZWtkYXkoZGkpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvdGFsU2VsZWN0ZWQrK1xuXG5cbiAgICAgICAgICAgIGlmIF8uaW5kZXhPZihAY3VycmVudEJsYWNrb3V0RGF0ZXMsIGRhdGVTdHJpbmcpICE9IC0xXG5cbiAgICAgICAgICAgICAgdG90YWxCbGFja2VkT3V0KytcblxuICAgICAgICAgICAgICBpc0NsYXNzID0gZmFsc2VcblxuICAgICAgICAgICAgdGhpc1dlZWsuZGF0ZXMucHVzaCh7aXNDbGFzczogaXNDbGFzcywgZGF0ZTogZGF0ZVN0cmluZ30pXG5cbiAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIHRoaXNXZWVrLmRhdGVzLnB1c2goe30pXG4gICAgICAgIClcblxuICAgICAgICBpZiB0b3RhbEJsYWNrZWRPdXQgIT0gMCBhbmQgdG90YWxTZWxlY3RlZCBpcyB0b3RhbEJsYWNrZWRPdXRcblxuICAgICAgICAgIHRoaXNXZWVrLmNsYXNzVGhpc1dlZWsgPSBmYWxzZVxuXG4gICAgICAgICAgdGhpc1dlZWsud2Vla0luZGV4ID0gJydcblxuICAgICAgICAgIEB0b3RhbEJsYWNrb3V0V2Vla3MrK1xuXG4gICAgICAgIEB3ZWVrbHlEYXRlcy5wdXNoKHRoaXNXZWVrKVxuXG4gICAgICApXG5cbiAgICAgIGlmIEB0b3RhbEJsYWNrb3V0V2Vla3MgPiAwXG5cbiAgICAgICAgbmV3TGVuZ3RoID0gQGxlbmd0aCAtIEB0b3RhbEJsYWNrb3V0V2Vla3NcblxuICAgICAgICBpZiBuZXdMZW5ndGggPCA2XG5cbiAgICAgICAgICBhbGVydCgnWW91IGhhdmUgYmxhY2tvdXRlZCBvdXQgZGF5cyB0aGF0IHdpbGwgcmVzdWx0IGluIGEgY291cnNlIGxlbmd0aCB0aGF0IGlzIGxlc3MgdGhhbiA2IHdlZWtzLiBQbGVhc2UgaW5jcmVhc2UgdGhlIGNvdXJzZSBsZW5ndGguJylcbiAgICAgICAgICBcbiAgICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBAbGVuZ3RoID0gbmV3TGVuZ3RoXG5cblxuICAgIEB1cGRhdGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgIyBkb24ndCB0b3VjaCB0aGlzIGZ1bmN0aW9uIHVubGVzcyB5b3Uga25vdyB3aGF0IHlvdSBhcmUgZG9pbmcgOy0pXG4gIGdldFdpa2lXZWVrT3V0cHV0OiAobGVuZ3RoKSAtPlxuXG4gICAgZGlmZiA9IDE2IC0gbGVuZ3RoXG5cbiAgICBvdXQgPSBbXVxuXG4gICAgdW5pdHNDbG9uZSA9IF8uY2xvbmUoQGRhdGEpXG5cbiAgICBpZiBkaWZmID4gMFxuXG4gICAgICB1bml0c0Nsb25lID0gXy5yZWplY3QodW5pdHNDbG9uZSwgKGl0ZW0pID0+XG5cbiAgICAgICAgcmV0dXJuIGl0ZW0udHlwZSBpcyAnYnJlYWsnICYmIGRpZmYgPj0gaXRlbS52YWx1ZSAmJiBpdGVtLnZhbHVlICE9IDBcblxuICAgICAgKVxuXG4gICAgb2JqID0gdW5pdHNDbG9uZVswXVxuXG4gICAgXy5lYWNoKHVuaXRzQ2xvbmUsIChpdGVtLCBpbmRleCkgPT5cblxuICAgICAgaWYgaXRlbS50eXBlIGlzICdicmVhaycgfHwgaW5kZXggaXMgdW5pdHNDbG9uZS5sZW5ndGggLSAxXG5cbiAgICAgICAgaWYgaW5kZXggaXMgdW5pdHNDbG9uZS5sZW5ndGggLSAxXG5cbiAgICAgICAgICBvdXQucHVzaCBfLmNsb25lKGl0ZW0pXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgb3V0LnB1c2ggXy5jbG9uZShvYmopXG5cbiAgICAgICAgb2JqID0ge31cblxuICAgICAgICByZXR1cm5cblxuICAgICAgZWxzZSBpZiBpdGVtLnR5cGUgaXMgJ3dlZWsnXG5cbiAgICAgICAgb2JqID0gQGNvbWJpbmUob2JqLCBpdGVtKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIG91dFxuXG4gIHVwZGF0ZTogLT5cblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuc3RhcnRfZGF0ZSA9IEBzdGFydF9kYXRlLnZhbHVlIHx8ICcnXG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLmVuZF9kYXRlID0gQGVuZF9kYXRlLnZhbHVlIHx8ICcnXG5cbiAgICBpZiBAbGVuZ3RoXG5cbiAgICAgICQoJ291dHB1dFtuYW1lPVwib3V0MlwiXScpLmh0bWwoQGxlbmd0aCArICcgd2Vla3MnKVxuXG4gICAgZWxzZVxuXG4gICAgICAkKCdvdXRwdXRbbmFtZT1cIm91dDJcIl0nKS5odG1sKCcnKVxuXG4gICAgQG91dCA9IEBnZXRXaWtpV2Vla091dHB1dChAbGVuZ3RoKVxuICAgIFxuICAgIEBvdXRXaWtpID0gQG91dFxuXG4gICAgQHJlbmRlclJlc3VsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdvdXRwdXQ6dXBkYXRlJywgQCRvdXRDb250YWluZXIudGV4dCgpKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZGF0ZTpjaGFuZ2UnLCBAKVxuXG5cbiAgcmVuZGVyUmVzdWx0OiAtPlxuXG4gICAgQCRvdXRDb250YWluZXIuaHRtbCgnJylcblxuICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChEZXRhaWxzVGVtcGxhdGUoIF8uZXh0ZW5kKFdpemFyZERhdGEseyBkZXNjcmlwdGlvbjogV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5kZXNjcmlwdGlvbn0pKSlcblxuICAgIGlmIGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXNbMF0gaXMgJ3Jlc2VhcmNod3JpdGUnXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKCd7e3RhYmxlIG9mIGNvbnRlbnRzfX0nKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZCgnPT1UaW1lbGluZT09JylcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICBjdXJXZWVrT2Zmc2V0ID0gMFxuXG4gICAgICBfLmVhY2goQHdlZWtseURhdGVzLCAod2VlaywgaW5kZXgpID0+XG5cbiAgICAgICAgdW5sZXNzIHdlZWsuY2xhc3NUaGlzV2Vla1xuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3tlbmQgb2YgY291cnNlIHdlZWt9fVwiKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI9PT0je0B3aWtpTm9DbGFzc30gI3t3ZWVrLndlZWtTdGFydH09PT1cIilcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIGl0ZW0gPSBAb3V0V2lraVt3ZWVrLndlZWtJbmRleF1cblxuICAgICAgICB0aGlzV2VlayA9IHdlZWsud2Vla0luZGV4ICsgMVxuXG4gICAgICAgIG5leHRXZWVrID0gd2Vlay53ZWVrSW5kZXggKyAyXG5cbiAgICAgICAgaXNMYXN0V2VlayA9IHdlZWsud2Vla0luZGV4IGlzIEBsZW5ndGggLSAxXG5cblxuICAgICAgICBpZiBpdGVtLnRpdGxlLmxlbmd0aCA+IDBcblxuICAgICAgICAgIHRpdGxlcyA9IFwiXCJcblxuICAgICAgICAgIGV4dHJhID0gaWYgdGhpc1dlZWsgaXMgMSB0aGVuICcxJyBlbHNlICcnXG5cbiAgICAgICAgICB0aXRsZXMgKz0gXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvY291cnNlIHdlZWsgI3tleHRyYX18ICN7dGhpc1dlZWt9IHwgXCJcblxuICAgICAgICAgIF8uZWFjaChpdGVtLnRpdGxlLCAodCwgaSkgLT5cblxuICAgICAgICAgICAgaWYgaSBpcyAwXG5cbiAgICAgICAgICAgICB0aXRsZXMgKz0gXCIje3R9XCJcblxuICAgICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICAgIHRpdGxlcyArPSBcIiwgI3t0fVwiXG5cbiAgICAgICAgICApXG5cblxuICAgICAgICAgIGlmIHdlZWsud2Vla1N0YXJ0IGFuZCB3ZWVrLndlZWtTdGFydCAhPSAnJ1xuXG4gICAgICAgICAgICB0aXRsZXMgKz0gXCJ8IHdlZWtvZiA9ICN7d2Vlay53ZWVrU3RhcnR9IFwiXG5cbiAgICAgICAgICBkYXlDb3VudCA9IDBcblxuICAgICAgICAgIF8uZWFjaCh3ZWVrLmRhdGVzLCAoZCwgZGkpID0+XG5cbiAgICAgICAgICAgIGlmIGQuaXNDbGFzc1xuXG4gICAgICAgICAgICAgIGRheUNvdW50KytcblxuICAgICAgICAgICAgICB0aXRsZXMgKz0gXCJ8IGRheSN7ZGF5Q291bnR9ID0gI3tkLmRhdGV9IFwiXG5cbiAgICAgICAgICApXG5cblxuICAgICAgICAgIHRpdGxlcyArPSBcIn19XCJcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZCh0aXRsZXMpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG4gIFxuICAgICAgXG4gICAgICAgIGlmIGl0ZW0uaW5fY2xhc3MubGVuZ3RoID4gMFxuXG4gICAgICAgICAgXy5lYWNoKGl0ZW0uaW5fY2xhc3MsIChjLCBjaSkgPT5cblxuICAgICAgICAgICAgaWYgYy5jb25kaXRpb24gJiYgYy5jb25kaXRpb24gIT0gJydcblxuICAgICAgICAgICAgICBjb25kaXRpb24gPSBldmFsKGMuY29uZGl0aW9uKVxuXG4gICAgICAgICAgICAgIGlmIGNvbmRpdGlvbiBcblxuICAgICAgICAgICAgICAgIGlmIGNpIGlzIDBcblxuICAgICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3tpbiBjbGFzc319XCIpXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7Yy53aWtpdGV4dH1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICAgIGlmIGNpIGlzIDBcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7aW4gY2xhc3N9fVwiKVxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7Yy53aWtpdGV4dH1cIilcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG5cbiAgICAgICAgaWYgaXRlbS5hc3NpZ25tZW50cy5sZW5ndGggPiAwXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS5hc3NpZ25tZW50cywgKGFzc2lnbiwgYWkpID0+XG5cbiAgICAgICAgICAgIGlmIGFzc2lnbi5jb25kaXRpb24gJiYgYXNzaWduLmNvbmRpdGlvbiAhPSAnJ1xuXG4gICAgICAgICAgICAgIGNvbmRpdGlvbiA9IGV2YWwoYXNzaWduLmNvbmRpdGlvbilcblxuICAgICAgICAgICAgICBpZiBjb25kaXRpb24gXG5cbiAgICAgICAgICAgICAgICBpZiBhaSBpcyAwXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgI3tuZXh0V2Vla30gfX1cIilcblxuICAgICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3thc3NpZ24ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICBpZiBhaSBpcyAwXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrICN7bmV4dFdlZWt9IH19XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3thc3NpZ24ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIGlmIGl0ZW0ubWlsZXN0b25lcy5sZW5ndGggPiAwXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS5taWxlc3RvbmVzLCAobSkgPT5cblxuICAgICAgICAgICAgaWYgbS5jb25kaXRpb24gJiYgbS5jb25kaXRpb24gIT0gJydcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje20ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3ttLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIClcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICBpZiBpc0xhc3RXZWVrXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2VuZCBvZiBjb3Vyc2Ugd2Vla319XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIClcbiAgICAgIFxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKEdyYWRpbmdUZW1wbGF0ZShXaXphcmREYXRhKSlcblxuICAgIGVsc2VcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoJ3t7dGFibGUgb2YgY29udGVudHN9fScpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgZ3JhZGluZ0l0ZW1zID0gW11cblxuICAgICAgXy5lYWNoKGFwcGxpY2F0aW9uLmhvbWVWaWV3LnNlbGVjdGVkUGF0aHdheXMsIChwYXRod2F5KSA9PlxuXG4gICAgICAgIGdyYWRpbmdJdGVtcy5wdXNoKFdpemFyZERhdGEuZ3JhZGluZ1twYXRod2F5XVtwYXRod2F5XSlcblxuICAgICAgICBfLmVhY2goQGRhdGFBbHRbcGF0aHdheV0sIChpdGVtLCBpbmQpID0+XG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8ZGl2PiN7aXRlbX08L2Rpdj48YnIvPlwiKVxuXG4gICAgICAgICAgaWYgaW5kIGlzIDBcblxuICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIClcbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGJyLz5cIilcblxuICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj48L2Rpdj5cIilcblxuICAgICAgKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCI8YnIvPlwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoR3JhZGluZ0N1c3RvbVRlbXBsYXRlKHtncmFkZUl0ZW1zOiBncmFkaW5nSXRlbXN9KSlcblxuICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChPcHRpb25zVGVtcGxhdGUoV2l6YXJkRGF0YSkpXG5cbiAgICBcbiAgZ2V0V2Vla3NEaWZmOiAoYSwgYikgLT5cblxuICAgIHJldHVybiBiLmRpZmYoYSwgJ3dlZWtzJylcblxuXG4gIGNvbWJpbmU6IChvYmoxLCBvYmoyKSAtPlxuXG4gICAgdGl0bGUgPSBfLnVuaW9uKG9iajEudGl0bGUsIG9iajIudGl0bGUpXG5cbiAgICBpbl9jbGFzcyA9IF8udW5pb24ob2JqMS5pbl9jbGFzcywgb2JqMi5pbl9jbGFzcylcblxuICAgIGFzc2lnbm1lbnRzID0gXy51bmlvbihvYmoxLmFzc2lnbm1lbnRzLCBvYmoyLmFzc2lnbm1lbnRzKVxuXG4gICAgbWlsZXN0b25lcyA9IF8udW5pb24ob2JqMS5taWxlc3RvbmVzLCBvYmoyLm1pbGVzdG9uZXMpXG5cbiAgICByZWFkaW5ncyA9IF8udW5pb24ob2JqMS5yZWFkaW5ncywgb2JqMi5yZWFkaW5ncylcblxuICAgIHJldHVybiB7dGl0bGU6IHRpdGxlLCBpbl9jbGFzczogaW5fY2xhc3MsIGFzc2lnbm1lbnRzOiBhc3NpZ25tZW50cywgbWlsZXN0b25lczogbWlsZXN0b25lcywgcmVhZGluZ3M6IHJlYWRpbmdzfVxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi8uLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi9WaWV3JylcblxuXG4jVEVNUExBVEVTXG5JbnB1dEl0ZW1UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uLy4uL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzJylcblxuXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBJbnB1dEl0ZW1UZW1wbGF0ZVxuXG5cbiAgY2xhc3NOYW1lOiAnY3VzdG9tLWlucHV0LXdyYXBwZXInXG5cblxuICBob3ZlclRpbWU6IDUwMFxuXG4gIHRpcFZpc2libGU6IGZhbHNlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBFdmVudHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZXZlbnRzOiBcblxuICAgICdjaGFuZ2UgaW5wdXQnIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2tleXVwIGlucHV0W3R5cGU9XCJ0ZXh0XCJdJyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwicGVyY2VudFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tY2hlY2tib3ggbGFiZWwgc3BhbicgOiAnY2hlY2tCdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmluZm8taWNvbicgOiAnaW5mb0ljb25DbGlja0hhbmRsZXInXG5cbiAgICAnbW91c2VvdmVyJyA6ICdtb3VzZW92ZXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlZW50ZXIgbGFiZWwnIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZW92ZXIgLmN1c3RvbS1pbnB1dCcgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlZW50ZXIgLmNoZWNrLWJ1dHRvbicgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdtb3VzZW91dEhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmVkaXRhYmxlIC5jaGVjay1idXR0b24nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvYm94IC5yYWRpby1idXR0b24nIDogJ3JhZGlvQm94Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIC5yYWRpby1idXR0b24nIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2ZvY3VzIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uRm9jdXMnXG5cbiAgICAnYmx1ciAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkJsdXInXG5cblxuICBpbmZvSWNvbkNsaWNrSGFuZGxlcjogLT5cblxuICAgIHVubGVzcyBAJGVsLmhhc0NsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgIEBzaG93VG9vbHRpcCgpXG5cbiAgICBlbHNlXG5cbiAgICAgICQoJ2JvZHksIGh0bWwnKS5hbmltYXRlKFxuXG4gICAgICAgIHNjcm9sbFRvcDogMFxuXG4gICAgICAsNTAwKVxuXG5cbiAgcmFkaW9CdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkcGFyZW50RWwgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICRwYXJlbnRHcm91cCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRpbnB1dEVsID0gJHBhcmVudEVsLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpXG5cblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICAkb3RoZXJSYWRpb3MgPSAkcGFyZW50R3JvdXAuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKS5ub3QoJHBhcmVudEVsWzBdKVxuXG4gICAgICAkb3RoZXJSYWRpb3MuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkcGFyZW50RWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuXG5cbiAgcmFkaW9Cb3hDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJG90aGVyUmFkaW9zID0gQCRlbC5wYXJlbnRzKCcuc3RlcC1mb3JtLWlubmVyJykuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJykuZmluZCgnaW5wdXQnKS52YWwoJ29mZicpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG5cbiAgICAgIC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICBpZiAkcGFyZW50Lmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvbicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIGZhbHNlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvZmYnKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG4gIGNoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGlmIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKS5sZW5ndGggPiAwXG5cbiAgICAgIHJldHVybiBAcmFkaW9Cb3hDbGlja0hhbmRsZXIoZSlcblxuICAgICRwYXJlbnQgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94JylcblxuICAgICAgLnRvZ2dsZUNsYXNzKCdjaGVja2VkJylcbiAgICBcbiAgICBpZiAkcGFyZW50Lmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvbicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgZWxzZVxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG4gIGhvdmVySGFuZGxlcjogKGUpIC0+XG4gICAgcmV0dXJuIGVcblxuXG4gIG1vdXNlb3ZlckhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGlzSG92ZXJpbmcgPSB0cnVlXG4gICAgICBcblxuICBtb3VzZW91dEhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cbiAgc2hvd1Rvb2x0aXA6IC0+XG5cbiAgICBpZiBAaGFzSW5mbygpICYmIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPT0gZmFsc2VcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gdHJ1ZVxuXG4gICAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBbZGF0YS1pdGVtLWluZGV4PScje0BpdGVtSW5kZXh9J11cIikuYWRkQ2xhc3MoJ3Zpc2libGUnKVxuXG5cbiAgaGlkZVRvb2x0aXA6IC0+XG5cbiAgICBpZiBAaGFzSW5mbygpXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJykgXG5cblxuICBoaWRlU2hvd1Rvb2x0aXA6IC0+XG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgQHNob3dUb29sdGlwKClcblxuXG4gIGxhYmVsQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm4gZmFsc2VcblxuXG4gIGl0ZW1DaGFuZ2VIYW5kbGVyOiAoZSkgLT5cblxuICAgICMgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnYW5zd2VyOnVwZGF0ZWQnLCBpbnB1dElkLCB2YWx1ZSlcblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICAgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCd2YWx1ZScpXG5cbiAgICAgIHBhcmVudElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ25hbWUnKVxuXG4gICAgICBpZiAkKGUuY3VycmVudFRhcmdldCkucHJvcCgnY2hlY2tlZCcpXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCB0cnVlKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCBmYWxzZSlcblxuICAgIGVsc2VcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgICAgaW5wdXRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAgIGlmIEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgICAgcGF0aHdheSA9ICQoZS50YXJnZXQpLnBhcmVudHMoJy5jdXN0b20taW5wdXQnKS5hdHRyKCdkYXRhLXBhdGh3YXktaWQnKVxuXG4gICAgICAgIHVubGVzcyBwYXRod2F5XG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlQW5zd2VyKGlucHV0SWQsIHZhbHVlLCB0cnVlLCBwYXRod2F5KVxuXG4gICAgICBlbHNlXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSwgZmFsc2UpXG5cbiAgICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgICAgaWYgaXNOYU4ocGFyc2VJbnQodmFsdWUpKVxuXG4gICAgICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgnJylcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2dyYWRlOmNoYW5nZScsIGlucHV0SWQsIHZhbHVlKVxuICAgIFxuICAgIHJldHVybiBAcGFyZW50U3RlcC51cGRhdGVVc2VySGFzQW5zd2VyZWQoaW5wdXRJZCwgdmFsdWUsIEBpbnB1dFR5cGUpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKEBpbnB1dFR5cGUpXG5cbiAgICBAJGlucHV0RWwgPSBAJGVsLmZpbmQoJ2lucHV0JylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLnZhbHVlICE9ICcnICYmIEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ3RleHQnXG4gICAgICBcbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgQGhvdmVyVGltZXIgPSBudWxsXG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuXG4gIGhhc0luZm86IC0+XG5cbiAgICByZXR1cm4gQCRlbC5oYXNDbGFzcygnaGFzLWluZm8nKVxuXG5cbiAgb25Gb2N1czogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIG9uQmx1cjogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICB2YWx1ZSA9ICR0YXJnZXQudmFsKClcblxuICAgIGlmIHZhbHVlID09ICcnXG5cbiAgICAgIHVubGVzcyAkdGFyZ2V0LmlzKCc6Zm9jdXMnKVxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgaXNEaXNhYmxlZDogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHVibGljIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc3VwZXIoKVxuXG5cbiAgZ2V0SW5wdXRUeXBlT2JqZWN0OiAtPlxuXG4gICAgcmV0dXJuRGF0YSA9IHt9XG5cbiAgICByZXR1cm5EYXRhW0BpbnB1dFR5cGVdID0gdHJ1ZVxuXG4gICAgcmV0dXJuIHJldHVybkRhdGFcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIGlucHV0VHlwZU9iamVjdCA9IEBnZXRJbnB1dFR5cGVPYmplY3QoKVxuXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAndGV4dCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIGlmIEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnIHx8IEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMudHlwZSBpcyAnZ3JhZGluZydcblxuICAgICAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5jb250aW5nZW50VXBvbi5sZW5ndGggIT0gMFxuXG4gICAgICAgICAgY3VycmVudFNlbGVjdGVkID0gYXBwbGljYXRpb24uaG9tZVZpZXcuZ2V0U2VsZWN0ZWRJZHMoKVxuXG4gICAgICAgICAgcmVuZGVySW5PdXRwdXQgPSBmYWxzZVxuXG4gICAgICAgICAgXy5lYWNoKEBtb2RlbC5hdHRyaWJ1dGVzLmNvbnRpbmdlbnRVcG9uLCAoaWQpID0+XG5cbiAgICAgICAgICAgIF8uZWFjaChjdXJyZW50U2VsZWN0ZWQsIChzZWxlY3RlZElkKSA9PlxuXG4gICAgICAgICAgICAgIGlmIGlkIGlzIHNlbGVjdGVkSWRcblxuICAgICAgICAgICAgICAgIHJlbmRlckluT3V0cHV0ID0gdHJ1ZVxuXG4gICAgICAgICAgICApXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICB1bmxlc3MgcmVuZGVySW5PdXRwdXRcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlXG5cblxuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Hcm91cCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2VkaXQnXG5cbiAgICAgIGFsbElucHV0cyA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdXG5cbiAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgXy5lYWNoKGFsbElucHV0cywgKGlucHV0KSA9PlxuXG4gICAgICAgIGlmIGlucHV0LnR5cGVcblxuICAgICAgICAgIGlmIGlucHV0LnR5cGUgaXMgJ2NoZWNrYm94JyB8fCBpbnB1dC50eXBlIGlzICdyYWRpb0JveCdcblxuICAgICAgICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQubGFiZWxcblxuICAgICAgICAgIGVsc2UgaWYgaW5wdXQudHlwZSBpcyAncmFkaW9Hcm91cCdcblxuICAgICAgICAgICAgaWYgaW5wdXQuaWQgaXMgJ3BlZXJfcmV2aWV3cydcblxuICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0Lm92ZXJ2aWV3TGFiZWxcblxuICAgICAgKVxuXG4gICAgICBcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGFzLWNvbnRlbnQnKVxuXG4gICAgICBpZiBzZWxlY3RlZElucHV0cy5sZW5ndGggPT0gMFxuICAgICAgICBcbiAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBcIltOb25lIHNlbGVjdGVkXVwiXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgYXNzaWdubWVudHM6IHNlbGVjdGVkSW5wdXRzXG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdsaW5rJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuXG4gIFxuICAgICAgXG4gICAgXG4gICAgICBcblxuICAgIFxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgQmFzZSBWaWV3IENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxucmVxdWlyZSgnLi4vLi4vaGVscGVycy9WaWV3SGVscGVyJylcblxuY2xhc3MgVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgdGVtcGxhdGU6IC0+XG4gICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBJTkhFUklURUQgLyBPVkVSUklERVNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICByZW5kZXI6IC0+XG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIEVWRU5UIEhBTkRMRVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gVmlldyJdfQ==
