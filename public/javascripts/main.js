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
      content: ["<p class='large'>This tool will help you to easily create a customized Wikipedia classroom assignment and customized syllabus for your course.</p>", "<p class='large'>When you’re finished, you'll have a ready-to-use lesson plan, with weekly assignments, published directly onto a sandbox page on Wikipedia where you can customize it even further.</p>", "<p class='large'>Let’s start by filling in some basics about you and your course:</p>"]
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
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = two }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[1].selected'
      }, {
        text: 'Choose peer review articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = three }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[2].selected'
      }, {
        text: 'Choose peer review articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = four }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[3].selected'
      }, {
        text: 'Choose peer review articles',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = five }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[4].selected'
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
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = two }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[1].selected'
      }, {
        text: 'Do peer reviews',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = three }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[2].selected'
      }, {
        text: 'Do peer reviews',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = four }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[3].selected'
      }, {
        text: 'Do peer reviews',
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = five }}',
        condition: 'WizardData.peer_feedback.peer_reviews.options[4].selected'
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
    action: 'combine',
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
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}',
        condition: 'WizardData.supplementary_assignments.class_presentation.selected'
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
          content: ["<p class='large'>This tool will help you to easily create a customized Wikipedia classroom assignment and customized syllabus for your course.</p>", "<p class='large'>When you’re finished, you'll have a ready-to-use lesson plan, with weekly assignments, published directly onto a sandbox page on Wikipedia where you can customize it even further.</p>", "<p class='large'>Let’s start by filling in some basics about you and your course:</p>"]
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
  
  
  return "\n | want_help_finding_articles = yes";
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
          obj = false;
        } else if (item.type === 'week') {
          if (obj === false) {
            return obj = item;
          } else {
            if (item.action === 'combine') {
              return obj = _this.combine(obj, item);
            } else {

            }
          }
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
                } else {
                  if (ai === 0) {
                    _this.$outContainer.append("{{assignment | due = Week " + nextWeek + " }}");
                    return _this.$outContainer.append("" + _this.wikiSpace);
                  }
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
              _this.$outContainer.append("" + m.wikitext);
              return _this.$outContainer.append("" + _this.wikiSpace);
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
    in_class = _.uniq(_.union(obj1.in_class, obj2.in_class), true);
    assignments = _.uniq(_.union(obj1.assignments, obj2.assignments), true);
    milestones = _.uniq(_.union(obj1.milestones, obj2.milestones), true);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvYXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9Mb2dpbkNvbnRlbnQuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1RpbWVsaW5lRGF0YS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvVGltZWxpbmVEYXRhQWx0LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb25maWcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZENvdXJzZUluZm8uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9oZWxwZXJzL1ZpZXdIZWxwZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9tYWluLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9zdXBlcnMvTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy9yb3V0ZXJzL1JvdXRlci5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2luZm8vQ291cnNlVGlwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dEl0ZW1UZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEZXRhaWxzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraUdyYWRpbmdNb2R1bGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpU3VtbWFyeU1vZHVsZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0dyYWRpbmdBbHRUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvRGF0ZUlucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0lucHV0SXRlbVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3ZlcnZpZXdWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2kvV2lraUVkdVdpemFyZC9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvU3RlcE5hdlZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1RpbWVsaW5lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpL1dpa2lFZHVXaXphcmQvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraS9XaWtpRWR1V2l6YXJkL3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvVmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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S0FKVjtBQUFBLE1BS0EsU0FBQSxFQUFXLEtBTFg7QUFBQSxNQU1BLFFBQUEsRUFBVSxLQU5WO0tBREY7QUFBQSxJQVNBLGNBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxnQkFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywwQkFIUDtBQUFBLE1BSUEsUUFBQSxFQUFVLEtBSlY7QUFBQSxNQUtBLFNBQUEsRUFBVyxLQUxYO0FBQUEsTUFNQSxRQUFBLEVBQVUsS0FOVjtLQVZGO0dBOUVGO0FBQUEsRUFnR0EsVUFBQSxFQUNFO0FBQUEsSUFBQSxZQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksY0FESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywwQkFIUDtBQUFBLE1BSUEsUUFBQSxFQUFVLEtBSlY7QUFBQSxNQUtBLFNBQUEsRUFBVyxLQUxYO0FBQUEsTUFNQSxRQUFBLEVBQVUsS0FOVjtLQURGO0FBQUEsSUFTQSxZQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksY0FESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywwQkFIUDtBQUFBLE1BSUEsUUFBQSxFQUFVLEtBSlY7QUFBQSxNQUtBLFNBQUEsRUFBVyxLQUxYO0FBQUEsTUFNQSxRQUFBLEVBQVUsS0FOVjtLQVZGO0dBakdGO0FBQUEsRUFtSEEsVUFBQSxFQUNFO0FBQUEsSUFBQSxZQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksY0FESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywwQkFIUDtBQUFBLE1BSUEsUUFBQSxFQUFVLEtBSlY7QUFBQSxNQUtBLFNBQUEsRUFBVyxLQUxYO0FBQUEsTUFNQSxR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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkEsSUFBQSw2REFBQTtFQUFBO2lTQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVMsUUFBVCxDQUFkLENBQUE7O0FBQUEsZUFHQSxHQUFrQixPQUFBLENBQVEsZ0RBQVIsQ0FIbEIsQ0FBQTs7QUFBQSxnQkFNQSxHQUFtQixPQUFBLENBQVEsMEJBQVIsQ0FObkIsQ0FBQTs7QUFBQSxNQVVNLENBQUMsT0FBUCxHQUF1QjtBQUdyQixrQ0FBQSxDQUFBOzs7O0dBQUE7O0FBQUEsMEJBQUEsTUFBQSxHQUVFO0FBQUEsSUFBQSxjQUFBLEVBQWlCLGNBQWpCO0FBQUEsSUFFQSxlQUFBLEVBQWtCLGVBRmxCO0FBQUEsSUFJQSxjQUFBLEVBQWlCLGNBSmpCO0FBQUEsSUFNQSxhQUFBLEVBQWdCLGFBTmhCO0FBQUEsSUFRQSxXQUFBLEVBQWMsY0FSZDtBQUFBLElBVUEsVUFBQSxFQUFhLGFBVmI7R0FGRixDQUFBOztBQUFBLDBCQWNBLENBQUEsR0FBRyxFQWRILENBQUE7O0FBQUEsMEJBZUEsQ0FBQSxHQUFHLEVBZkgsQ0FBQTs7QUFBQSwwQkFnQkEsQ0FBQSxHQUFHLEVBaEJILENBQUE7O0FBQUEsMEJBaUJBLFNBQUEsR0FBVyxFQWpCWCxDQUFBOztBQUFBLDBCQW9CQSxNQUFBLEdBQVEsU0FBQSxHQUFBO1dBRU4sQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsR0FBQTtlQUVwQixLQUFDLENBQUEsY0FBRCxDQUFBLEVBRm9CO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdEIsRUFGTTtFQUFBLENBcEJSLENBQUE7O0FBQUEsMEJBMkJBLFlBQUEsR0FBYyxTQUFDLENBQUQsR0FBQTtXQUVaLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLE1BQWQsRUFGWTtFQUFBLENBM0JkLENBQUE7O0FBQUEsMEJBZ0NBLFdBQUEsR0FBYSxTQUFDLENBQUQsR0FBQTtXQUVYLElBQUMsQ0FBQSxjQUFELENBQUEsRUFGVztFQUFBLENBaENiLENBQUE7O0FBQUEsMEJBcUNBLFlBQUEsR0FBYyxTQUFDLENBQUQsR0FBQTtXQUVaLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLE1BQWQsRUFGWTtFQUFBLENBckNkLENBQUE7O0FBQUEsMEJBMENBLGFBQUEsR0FBZSxTQUFDLENBQUQsR0FBQTtBQUViLFFBQUEsd0JBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxjQUFELENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFFQSxPQUFBLEdBQVcsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBRlgsQ0FBQTtBQUFBLElBSUEsRUFBQSxHQUFLLE9BQU8sQ0FBQyxJQUFSLENBQWEsY0FBYixDQUpMLENBQUE7QUFBQSxJQU1BLElBQUEsR0FBTyxPQUFPLENBQUMsSUFBUixDQUFhLGdCQUFiLENBTlAsQ0FBQTtBQUFBLElBUUEsS0FBQSxHQUFRLE9BQU8sQ0FBQyxHQUFSLENBQUEsQ0FSUixDQUFBO0FBQUEsSUFVQSxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsY0FBYyxDQUFDLE1BQWhCLENBQUEsQ0FBQSxDQUEwQixDQUFBLEVBQUEsQ0FBSSxDQUFBLElBQUEsQ0FBL0MsR0FBdUQsS0FWdkQsQ0FBQTtBQUFBLElBWUEsSUFBQyxDQUFBLENBQUQsR0FBSyxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsY0FBYyxDQUFDLE1BQWhCLENBQUEsQ0FBQSxDQUEwQixDQUFBLEVBQUEsQ0FBSSxDQUFBLE9BQUEsQ0FacEQsQ0FBQTtBQUFBLElBY0EsSUFBQyxDQUFBLENBQUQsR0FBSyxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsY0FBYyxDQUFDLE1BQWhCLENBQUEsQ0FBQSxDQUEwQixDQUFBLEVBQUEsQ0FBSSxDQUFBLEtBQUEsQ0FkcEQsQ0FBQTtBQUFBLElBZ0JBLElBQUMsQ0FBQSxDQUFELEdBQUssZ0JBQWlCLENBQUEsSUFBQyxDQUFBLGNBQWMsQ0FBQyxNQUFoQixDQUFBLENBQUEsQ0FBMEIsQ0FBQSxFQUFBLENBQUksQ0FBQSxNQUFBLENBaEJwRCxDQUFBO0FBQUEsSUFrQkEsSUFBQyxDQUFBLFNBQUQsR0FBYSxFQUFBLEdBQUcsSUFBQyxDQUFBLENBQUosR0FBTSxHQUFOLEdBQVMsSUFBQyxDQUFBLENBQVYsR0FBWSxHQUFaLEdBQWUsSUFBQyxDQUFBLENBbEI3QixDQUFBO0FBQUEsSUFvQkEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLGNBQWMsQ0FBQyxNQUFoQixDQUFBLENBQUEsQ0FBMEIsQ0FBQSxFQUFBLENBQUcsQ0FBQyxLQUEvQyxHQUF1RCxJQUFDLENBQUEsU0FwQnhELENBQUE7QUFBQSxJQXNCQSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLGFBQTFCLEVBQXlDLElBQXpDLENBdEJBLENBQUE7QUF3QkEsV0FBTyxJQUFQLENBMUJhO0VBQUEsQ0ExQ2YsQ0FBQTs7QUFBQSwwQkF3RUEsUUFBQSxHQUFVLFNBQUEsR0FBQTtBQUVSLFdBQU8sSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsUUFBVixDQUFtQixDQUFDLEdBQXBCLENBQUEsQ0FBQSxLQUE2QixFQUFwQyxDQUZRO0VBQUEsQ0F4RVYsQ0FBQTs7QUFBQSwwQkE2RUEsY0FBQSxHQUFnQixTQUFBLEdBQUE7QUFFZCxJQUFBLElBQUcsSUFBQyxDQUFBLFFBQUQsQ0FBQSxDQUFIO2FBRUUsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsTUFBZCxFQUZGO0tBQUEsTUFBQTthQU1FLElBQUMsQ0FBQSxHQUFHLENBQUMsV0FBTCxDQUFpQixNQUFqQixFQU5GO0tBRmM7RUFBQSxDQTdFaEIsQ0FBQTs7QUFBQSwwQkF3RkEsT0FBQSxHQUFTLFNBQUEsR0FBQTtBQUNQLFFBQUEsSUFBQTtBQUFBLElBQUEsSUFBQSxHQUFPLEtBQVAsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsQ0FBRCxLQUFNLEVBQU4sSUFBYSxJQUFDLENBQUEsQ0FBRCxLQUFNLEVBQW5CLElBQTBCLElBQUMsQ0FBQSxDQUFELEtBQU0sRUFBbkM7QUFDRSxNQUFBLElBQUEsR0FBTyxJQUFQLENBREY7S0FGQTtBQUtBLFdBQU8sSUFBUCxDQU5PO0VBQUEsQ0F4RlQsQ0FBQTs7dUJBQUE7O0dBSDJDLFFBQVEsQ0FBQyxLQVZ0RCxDQUFBOzs7OztBQ0RBLElBQUEsd0VBQUE7RUFBQTtpU0FBQTs7QUFBQSxXQUFBLEdBQWMsT0FBQSxDQUFTLFFBQVQsQ0FBZCxDQUFBOztBQUFBLElBR0EsR0FBTyxPQUFBLENBQVEsc0JBQVIsQ0FIUCxDQUFBOztBQUFBLGlCQUtBLEdBQW9CLE9BQUEsQ0FBUSxrREFBUixDQUxwQixDQUFBOztBQUFBLGdCQVFBLEdBQW1CLE9BQUEsQ0FBUSwwQkFBUixDQVJuQixDQUFBOztBQUFBLE1BV00sQ0FBQyxPQUFQLEdBQXVCO0FBRXJCLHFDQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSw2QkFBQSxRQUFBLEdBQVUsaUJBQVYsQ0FBQTs7QUFBQSw2QkFHQSxNQUFBLEdBRUU7QUFBQSxJQUFBLGNBQUEsRUFBaUIsb0JBQWpCO0FBQUEsSUFFQSxnREFBQSxFQUFtRCx5QkFGbkQ7QUFBQSxJQUlBLHdDQUFBLEVBQTJDLHlCQUozQztHQUxGLENBQUE7O0FBQUEsNkJBWUEsYUFBQSxHQUVFO0FBQUEsSUFBQSxjQUFBLEVBQWlCLG9CQUFqQjtHQWRGLENBQUE7O0FBQUEsNkJBZ0JBLGFBQUEsR0FBZSxFQWhCZixDQUFBOztBQUFBLDZCQW1CQSxVQUFBLEdBQVksR0FuQlosQ0FBQTs7QUFBQSw2QkFzQkEsb0JBQUEsR0FBc0IsZ0JBQWlCLENBQUEsU0FBQSxDQUFXLENBQUEsbUJBQUEsQ0F0QmxELENBQUE7O0FBQUEsNkJBeUJBLFlBQUEsR0FBYyxTQUFBLEdBQUE7QUFFWixRQUFBLEtBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxDQUFSLENBQUE7QUFBQSxJQUVBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLGFBQVIsRUFBdUIsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsR0FBRCxHQUFBO2VBRXJCLEtBQUEsSUFBUyxRQUFBLENBQVMsR0FBVCxFQUZZO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkIsQ0FGQSxDQUFBO0FBUUEsV0FBTyxLQUFQLENBVlk7RUFBQSxDQXpCZCxDQUFBOztBQUFBLDZCQXVDQSxjQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUVkLFFBQUEsTUFBQTtBQUFBLElBQUEsTUFBQSxHQUFTLEVBQVQsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLGNBQWMsQ0FBQyxHQUFHLENBQUMsSUFBcEIsQ0FBeUIsdUJBQXpCLENBQWlELENBQUMsSUFBbEQsQ0FBdUQsU0FBQSxHQUFBO0FBRXJELFVBQUEsTUFBQTtBQUFBLE1BQUEsTUFBQSxHQUFTLENBQUMsQ0FBQSxDQUFFLElBQUYsQ0FBRCxDQUFRLENBQUMsR0FBVCxDQUFBLENBQVQsQ0FBQTtBQUVBLE1BQUEsSUFBRyxNQUFIO2VBRUUsTUFBTSxDQUFDLElBQVAsQ0FBWSxNQUFaLEVBRkY7T0FBQSxNQUFBO0FBTUUsUUFBQSxDQUFDLENBQUEsQ0FBRSxJQUFGLENBQUQsQ0FBUSxDQUFDLEdBQVQsQ0FBYSxDQUFiLENBQUEsQ0FBQTtlQUVBLE1BQU0sQ0FBQyxJQUFQLENBQVksQ0FBWixFQVJGO09BSnFEO0lBQUEsQ0FBdkQsQ0FGQSxDQUFBO0FBQUEsSUFvQkEsSUFBQyxDQUFBLGFBQUQsR0FBaUIsTUFwQmpCLENBQUE7QUFzQkEsV0FBTyxJQUFQLENBeEJjO0VBQUEsQ0F2Q2hCLENBQUE7O0FBQUEsNkJBbUVBLGtCQUFBLEdBQW9CLFNBQUMsRUFBRCxFQUFLLEtBQUwsR0FBQTtXQUVsQixJQUFDLENBQUEsY0FBRCxDQUFBLENBQWlCLENBQUMsTUFBbEIsQ0FBQSxFQUZrQjtFQUFBLENBbkVwQixDQUFBOztBQUFBLDZCQXdFQSx1QkFBQSxHQUF5QixTQUFDLENBQUQsR0FBQTtBQUV2QixRQUFBLHdEQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsT0FBQSxHQUFVLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUZWLENBQUE7QUFBQSxJQUlBLFNBQUEsR0FBWSxPQUFPLENBQUMsT0FBUixDQUFnQixzQkFBaEIsQ0FKWixDQUFBO0FBQUEsSUFNQSxZQUFBLEdBQWUsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsdUJBQWhCLENBTmYsQ0FBQTtBQUFBLElBUUEsUUFBQSxHQUFXLFNBQVMsQ0FBQyxJQUFWLENBQWUscUJBQWYsQ0FSWCxDQUFBO0FBV0EsSUFBQSxJQUFHLFNBQVMsQ0FBQyxRQUFWLENBQW1CLFNBQW5CLENBQUg7QUFFRSxhQUFPLEtBQVAsQ0FGRjtLQUFBLE1BQUE7QUFNRSxNQUFBLFlBQUEsR0FBZSxZQUFZLENBQUMsSUFBYixDQUFrQixzQkFBbEIsQ0FBeUMsQ0FBQyxHQUExQyxDQUE4QyxTQUFVLENBQUEsQ0FBQSxDQUF4RCxDQUFmLENBQUE7QUFBQSxNQUVBLFlBQVksQ0FBQyxJQUFiLENBQWtCLHFCQUFsQixDQUF3QyxDQUFDLElBQXpDLENBQThDLFNBQTlDLEVBQXlELEtBQXpELENBQStELENBQUMsT0FBaEUsQ0FBd0UsUUFBeEUsQ0FGQSxDQUFBO0FBQUEsTUFJQSxZQUFZLENBQUMsV0FBYixDQUF5QixTQUF6QixDQUpBLENBQUE7QUFBQSxNQU1BLFNBQVMsQ0FBQyxRQUFWLENBQW1CLFNBQW5CLENBTkEsQ0FBQTtBQUFBLE1BUUEsUUFBUSxDQUFDLElBQVQsQ0FBYyxTQUFkLEVBQXlCLElBQXpCLENBUkEsQ0FBQTtBQUFBLE1BVUEsUUFBUSxDQUFDLE9BQVQsQ0FBaUIsUUFBakIsQ0FWQSxDQUFBO0FBQUEsTUFZQSxDQUFDLENBQUMsSUFBRixDQUFPLGdCQUFpQixDQUFBLFNBQUEsQ0FBVyxDQUFBLG1CQUFBLENBQW9CLENBQUMsT0FBeEQsRUFBaUUsU0FBQyxHQUFELEdBQUE7ZUFFL0QsR0FBRyxDQUFDLFFBQUosR0FBZSxNQUZnRDtNQUFBLENBQWpFLENBWkEsQ0FBQTtBQUFBLE1Ba0JBLGdCQUFpQixDQUFBLFNBQUEsQ0FBVyxDQUFBLG1CQUFBLENBQW9CLENBQUMsT0FBUSxDQUFBLFFBQVEsQ0FBQyxJQUFULENBQWMsSUFBZCxDQUFBLENBQW9CLENBQUMsUUFBOUUsR0FBeUYsSUFsQnpGLENBQUE7YUFvQkEsZ0JBQWlCLENBQUEsU0FBQSxDQUFXLENBQUEsbUJBQUEsQ0FBb0IsQ0FBQyxLQUFqRCxHQUF5RCxRQUFRLENBQUMsSUFBVCxDQUFjLElBQWQsRUExQjNEO0tBYnVCO0VBQUEsQ0F4RXpCLENBQUE7O0FBQUEsNkJBbUhBLGFBQUEsR0FBZSxTQUFBLEdBQUE7QUFFYixRQUFBLEdBQUE7QUFBQSxJQUFBLEdBQUEsR0FBTTtBQUFBLE1BRUosVUFBQSxFQUFZLElBQUMsQ0FBQSxZQUFELENBQUEsQ0FGUjtBQUFBLE1BSUosV0FBQSxFQUFhLElBQUMsQ0FBQSxZQUFELENBQUEsQ0FBQSxHQUFrQixJQUFDLENBQUEsVUFKNUI7QUFBQSxNQU1KLE9BQUEsRUFBUyxJQUFDLENBQUEsb0JBQW9CLENBQUMsT0FOM0I7S0FBTixDQUFBO0FBVUEsV0FBTyxHQUFQLENBWmE7RUFBQSxDQW5IZixDQUFBOzswQkFBQTs7R0FGOEMsS0FYaEQsQ0FBQTs7Ozs7QUNLQSxJQUFBLDJHQUFBO0VBQUE7aVNBQUE7O0FBQUEsV0FBQSxHQUFjLE9BQUEsQ0FBUyxRQUFULENBQWQsQ0FBQTs7QUFBQSxJQUdBLEdBQU8sT0FBQSxDQUFRLHNCQUFSLENBSFAsQ0FBQTs7QUFBQSxZQU1BLEdBQWUsT0FBQSxDQUFRLCtCQUFSLENBTmYsQ0FBQTs7QUFBQSxRQVNBLEdBQVcsT0FBQSxDQUFRLG1CQUFSLENBVFgsQ0FBQTs7QUFBQSxTQVdBLEdBQVksT0FBQSxDQUFRLHFCQUFSLENBWFosQ0FBQTs7QUFBQSxXQWFBLEdBQWMsT0FBQSxDQUFRLHNCQUFSLENBYmQsQ0FBQTs7QUFBQSxZQWVBLEdBQWUsT0FBQSxDQUFRLHVCQUFSLENBZmYsQ0FBQTs7QUFBQSxnQkFrQkEsR0FBbUIsT0FBQSxDQUFRLDBCQUFSLENBbEJuQixDQUFBOztBQUFBLE1BdUJNLENBQUMsT0FBUCxHQUF1QjtBQU1yQiw2QkFBQSxDQUFBOzs7O0dBQUE7O0FBQUEscUJBQUEsU0FBQSxHQUFXLFdBQVgsQ0FBQTs7QUFBQSxxQkFHQSxRQUFBLEdBQVUsWUFIVixDQUFBOztBQUFBLHFCQU1BLFFBQUEsR0FFRTtBQUFBLElBQUEsS0FBQSxFQUFPLFdBQVcsQ0FBQyxZQUFZLENBQUMsV0FBaEM7QUFBQSxJQUVBLFFBQUEsRUFBVSxXQUFXLENBQUMsWUFBWSxDQUFDLFFBRm5DO0FBQUEsSUFJQSxLQUFBLEVBQU8sV0FBVyxDQUFDLFlBQVksQ0FBQyxXQUpoQztHQVJGLENBQUE7O0FBQUEscUJBZUEsVUFBQSxHQUFZLFNBQUEsR0FBQTtBQUVWLFdBQU8sQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsUUFBUSxDQUFDLFFBQWpCLENBQVAsQ0FGVTtFQUFBLENBZlosQ0FBQTs7QUFBQSxxQkFtQkEsU0FBQSxHQUFXLEVBbkJYLENBQUE7O0FBQUEscUJBc0JBLFlBQUEsR0FFRTtBQUFBLElBQUEsS0FBQSxFQUFPLEVBQVA7QUFBQSxJQUVBLE9BQUEsRUFBUyxFQUZUO0FBQUEsSUFJQSxLQUFBLEVBQU8sRUFKUDtHQXhCRixDQUFBOztBQUFBLHFCQStCQSxnQkFBQSxHQUFrQixFQS9CbEIsQ0FBQTs7QUFBQSxxQkFzQ0EsVUFBQSxHQUFZLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBQyxDQUFBLE9BQUQsR0FBZSxJQUFBLFdBQUEsQ0FBQSxDQUFmLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxXQUFELEdBQWUsQ0FGZixDQUFBO1dBSUEsSUFBQyxDQUFBLGFBQUQsR0FBaUIsTUFOUDtFQUFBLENBdENaLENBQUE7O0FBQUEscUJBK0NBLE1BQUEsR0FFRTtBQUFBLElBQUEsa0JBQUEsRUFBcUIsc0JBQXJCO0dBakRGLENBQUE7O0FBQUEscUJBb0RBLGFBQUEsR0FFRTtBQUFBLElBQUEsV0FBQSxFQUFjLGFBQWQ7QUFBQSxJQUVBLFdBQUEsRUFBYyxhQUZkO0FBQUEsSUFJQSxXQUFBLEVBQWMsYUFKZDtBQUFBLElBTUEsYUFBQSxFQUFnQixlQU5oQjtBQUFBLElBUUEsV0FBQSxFQUFjLGFBUmQ7QUFBQSxJQVVBLFdBQUEsRUFBYyxhQVZkO0FBQUEsSUFZQSxXQUFBLEVBQWMsWUFaZDtHQXRERixDQUFBOztBQUFBLHFCQXNFQSxNQUFBLEdBQVEsU0FBQSxHQUFBO0FBRU4sSUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVyxJQUFDLENBQUEsUUFBRCxDQUFXLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBWCxDQUFYLENBQUEsQ0FBQTtBQUVBLElBQUEsSUFBQSxDQUFBLElBQVEsQ0FBQSxhQUFSO0FBRUUsTUFBQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBQUEsQ0FGRjtLQUZBO0FBTUEsV0FBTyxJQUFQLENBUk07RUFBQSxDQXRFUixDQUFBOztBQUFBLHFCQWlGQSxXQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVgsSUFBQSxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxRQUFWLENBQW5CLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxlQUFELEdBQW1CLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLFVBQVYsQ0FGbkIsQ0FBQTtBQUFBLElBSUEsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FKQSxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBTkEsQ0FBQTtBQUFBLElBUUEsSUFBQyxDQUFBLE9BQU8sQ0FBQyxTQUFULEdBQXFCLElBQUMsQ0FBQSxTQVJ0QixDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsT0FBTyxDQUFDLFVBQVQsR0FBc0IsSUFBQyxDQUFBLFNBQVMsQ0FBQyxNQVZqQyxDQUFBO0FBQUEsSUFZQSxJQUFDLENBQUEsZUFBZSxDQUFDLE1BQWpCLENBQXdCLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBakMsQ0FaQSxDQUFBO0FBY0EsSUFBQSxJQUFHLElBQUMsQ0FBQSxTQUFTLENBQUMsTUFBWCxHQUFvQixDQUF2QjtBQUVFLE1BQUEsSUFBQyxDQUFBLGVBQUQsQ0FBQSxDQUFBLENBRkY7S0FkQTtBQUFBLElBa0JBLFVBQUEsQ0FBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQSxHQUFBO2VBQ1QsS0FBQyxDQUFBLFlBQUQsR0FBb0IsSUFBQSxZQUFBLENBQUEsRUFEWDtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFFQyxJQUZELENBbEJBLENBQUE7QUF3QkEsV0FBTyxJQUFQLENBMUJXO0VBQUEsQ0FqRmIsQ0FBQTs7QUFBQSxxQkE2R0EsZ0JBQUEsR0FBa0IsU0FBQSxHQUFBO0FBRWhCLFFBQUEsVUFBQTtBQUFBLElBQUEsVUFBQSxHQUFhLENBQWIsQ0FBQTtBQUFBLElBRUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsUUFBUSxDQUFDLEtBQWpCLEVBQXVCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLElBQUQsRUFBTyxLQUFQLEdBQUE7QUFFckIsWUFBQSxpQkFBQTtBQUFBLFFBQUEsUUFBQSxHQUFlLElBQUEsU0FBQSxDQUFBLENBQWYsQ0FBQTtBQUFBLFFBRUEsQ0FBQyxDQUFDLEdBQUYsQ0FBTSxJQUFOLEVBQVcsU0FBQyxLQUFELEVBQVEsR0FBUixFQUFhLElBQWIsR0FBQTtpQkFFVCxRQUFRLENBQUMsR0FBVCxDQUFhLEdBQWIsRUFBaUIsS0FBakIsRUFGUztRQUFBLENBQVgsQ0FGQSxDQUFBO0FBQUEsUUFRQSxPQUFBLEdBQWMsSUFBQSxRQUFBLENBRVo7QUFBQSxVQUFBLEtBQUEsRUFBTyxRQUFQO1NBRlksQ0FSZCxDQUFBO0FBQUEsUUFjQSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQWQsQ0FBa0IsWUFBbEIsRUFBZ0MsVUFBQSxHQUFhLENBQTdDLENBZEEsQ0FBQTtBQUFBLFFBZ0JBLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBZCxDQUFrQixXQUFsQixFQUErQixVQUEvQixDQWhCQSxDQUFBO0FBa0JBLFFBQUEsSUFBRyxLQUFBLEtBQVMsQ0FBWjtBQUVFLFVBQUEsT0FBTyxDQUFDLFdBQVIsR0FBc0IsSUFBdEIsQ0FGRjtTQWxCQTtBQUFBLFFBc0JBLEtBQUMsQ0FBQSxlQUFlLENBQUMsTUFBakIsQ0FBd0IsT0FBTyxDQUFDLE1BQVIsQ0FBQSxDQUFnQixDQUFDLElBQWpCLENBQUEsQ0FBdUIsQ0FBQyxFQUFoRCxDQXRCQSxDQUFBO0FBQUEsUUF3QkEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFaLENBQXNCLFFBQUEsR0FBUSxJQUFJLENBQUMsRUFBbkMsQ0F4QkEsQ0FBQTtBQUFBLFFBMEJBLEtBQUMsQ0FBQSxTQUFTLENBQUMsSUFBWCxDQUFnQixPQUFoQixDQTFCQSxDQUFBO0FBQUEsUUE0QkEsS0FBQyxDQUFBLFlBQVksQ0FBQyxLQUFLLENBQUMsSUFBcEIsQ0FBeUIsT0FBekIsQ0E1QkEsQ0FBQTtlQThCQSxVQUFBLEdBaENxQjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZCLENBRkEsQ0FBQTtBQXNDQSxXQUFPLElBQVAsQ0F4Q2dCO0VBQUEsQ0E3R2xCLENBQUE7O0FBQUEscUJBdUpBLFdBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWCxRQUFBLFVBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxZQUFZLENBQUMsT0FBZCxHQUF3QixFQUF4QixDQUFBO0FBQUEsSUFFQSxVQUFBLEdBQWEsSUFBQyxDQUFBLFNBQVMsQ0FBQyxNQUZ4QixDQUFBO0FBQUEsSUFJQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxnQkFBUixFQUEwQixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxHQUFELEVBQU0sTUFBTixHQUFBO2VBRXhCLENBQUMsQ0FBQyxJQUFGLENBQU8sS0FBQyxDQUFBLFFBQVEsQ0FBQyxRQUFTLENBQUEsR0FBQSxDQUExQixFQUErQixTQUFDLElBQUQsRUFBTyxLQUFQLEdBQUE7QUFFN0IsY0FBQSxpQkFBQTtBQUFBLFVBQUEsSUFBRyxLQUFDLENBQUEsZ0JBQWdCLENBQUMsTUFBbEIsR0FBMkIsQ0FBOUI7QUFFRSxZQUFBLElBQUcsSUFBSSxDQUFDLEVBQUwsS0FBVyxTQUFYLElBQXdCLElBQUksQ0FBQyxFQUFMLEtBQVcsVUFBbkMsSUFBaUQsSUFBSSxDQUFDLElBQUwsS0FBYSxTQUE5RCxJQUEyRSxJQUFJLENBQUMsSUFBTCxLQUFhLFVBQTNGO0FBRUUsY0FBQSxJQUFHLE1BQUEsR0FBUyxLQUFDLENBQUEsZ0JBQWdCLENBQUMsTUFBbEIsR0FBMkIsQ0FBdkM7QUFFRSxzQkFBQSxDQUZGO2VBRkY7YUFGRjtXQUFBO0FBQUEsVUFRQSxRQUFBLEdBQWUsSUFBQSxTQUFBLENBQUEsQ0FSZixDQUFBO0FBQUEsVUFVQSxDQUFDLENBQUMsR0FBRixDQUFNLElBQU4sRUFBVyxTQUFDLEtBQUQsRUFBUSxHQUFSLEVBQWEsSUFBYixHQUFBO21CQUVULFFBQVEsQ0FBQyxHQUFULENBQWEsR0FBYixFQUFpQixLQUFqQixFQUZTO1VBQUEsQ0FBWCxDQVZBLENBQUE7QUFBQSxVQWdCQSxPQUFBLEdBQWMsSUFBQSxRQUFBLENBRVo7QUFBQSxZQUFBLEtBQUEsRUFBTyxRQUFQO1dBRlksQ0FoQmQsQ0FBQTtBQUFBLFVBc0JBLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBZCxDQUFrQixZQUFsQixFQUFnQyxVQUFBLEdBQWEsQ0FBN0MsQ0F0QkEsQ0FBQTtBQUFBLFVBd0JBLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBZCxDQUFrQixXQUFsQixFQUErQixVQUEvQixDQXhCQSxDQUFBO0FBQUEsVUEwQkEsS0FBQyxDQUFBLGVBQWUsQ0FBQyxNQUFqQixDQUF3QixPQUFPLENBQUMsTUFBUixDQUFBLENBQWdCLENBQUMsSUFBakIsQ0FBQSxDQUF1QixDQUFDLEVBQWhELENBMUJBLENBQUE7QUFBQSxVQTRCQSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVosQ0FBc0IsUUFBQSxHQUFRLElBQUksQ0FBQyxFQUFuQyxDQTVCQSxDQUFBO0FBQUEsVUE4QkEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFaLENBQXNCLDZCQUFBLEdBQTZCLEdBQW5ELENBOUJBLENBQUE7QUFBQSxVQWdDQSxLQUFDLENBQUEsU0FBUyxDQUFDLElBQVgsQ0FBZ0IsT0FBaEIsQ0FoQ0EsQ0FBQTtBQUFBLFVBa0NBLEtBQUMsQ0FBQSxZQUFZLENBQUMsT0FBTyxDQUFDLElBQXRCLENBQTJCLE9BQTNCLENBbENBLENBQUE7aUJBb0NBLFVBQUEsR0F0QzZCO1FBQUEsQ0FBL0IsRUFGd0I7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUExQixDQUpBLENBQUE7QUFrREEsV0FBTyxJQUFQLENBcERXO0VBQUEsQ0F2SmIsQ0FBQTs7QUFBQSxxQkE2TUEsZ0JBQUEsR0FBa0IsU0FBQSxHQUFBO0FBRWhCLFFBQUEsVUFBQTtBQUFBLElBQUEsSUFBQyxDQUFBLFlBQVksQ0FBQyxLQUFkLEdBQXNCLEVBQXRCLENBQUE7QUFBQSxJQUVBLFVBQUEsR0FBYSxJQUFDLENBQUEsU0FBUyxDQUFDLE1BRnhCLENBQUE7QUFBQSxJQUlBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFqQixFQUF1QixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxJQUFELEVBQU8sS0FBUCxHQUFBO0FBRXJCLFlBQUEsaUJBQUE7QUFBQSxRQUFBLFFBQUEsR0FBZSxJQUFBLFNBQUEsQ0FBQSxDQUFmLENBQUE7QUFBQSxRQUVBLENBQUMsQ0FBQyxHQUFGLENBQU0sSUFBTixFQUFXLFNBQUMsS0FBRCxFQUFRLEdBQVIsRUFBYSxJQUFiLEdBQUE7aUJBRVQsUUFBUSxDQUFDLEdBQVQsQ0FBYSxHQUFiLEVBQWlCLEtBQWpCLEVBRlM7UUFBQSxDQUFYLENBRkEsQ0FBQTtBQUFBLFFBUUEsT0FBQSxHQUFjLElBQUEsUUFBQSxDQUVaO0FBQUEsVUFBQSxLQUFBLEVBQU8sUUFBUDtTQUZZLENBUmQsQ0FBQTtBQUFBLFFBY0EsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFkLENBQWtCLFlBQWxCLEVBQWdDLFVBQUEsR0FBYSxDQUE3QyxDQWRBLENBQUE7QUFBQSxRQWdCQSxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQWQsQ0FBa0IsV0FBbEIsRUFBK0IsVUFBL0IsQ0FoQkEsQ0FBQTtBQWtCQSxRQUFBLElBQUcsS0FBQSxLQUFTLEtBQUMsQ0FBQSxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQWhCLEdBQXlCLENBQXJDO0FBRUUsVUFBQSxPQUFPLENBQUMsVUFBUixHQUFxQixJQUFyQixDQUZGO1NBbEJBO0FBQUEsUUFzQkEsS0FBQyxDQUFBLGVBQWUsQ0FBQyxNQUFqQixDQUF3QixPQUFPLENBQUMsTUFBUixDQUFBLENBQWdCLENBQUMsSUFBakIsQ0FBQSxDQUF1QixDQUFDLEVBQWhELENBdEJBLENBQUE7QUFBQSxRQXdCQSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVosQ0FBc0IsUUFBQSxHQUFRLElBQUksQ0FBQyxFQUFuQyxDQXhCQSxDQUFBO0FBQUEsUUEwQkEsS0FBQyxDQUFBLFNBQVMsQ0FBQyxJQUFYLENBQWdCLE9BQWhCLENBMUJBLENBQUE7QUFBQSxRQTRCQSxLQUFDLENBQUEsWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFwQixDQUF5QixPQUF6QixDQTVCQSxDQUFBO2VBOEJBLFVBQUEsR0FoQ3FCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBdkIsQ0FKQSxDQUFBO0FBd0NBLFdBQU8sSUFBUCxDQTFDZ0I7RUFBQSxDQTdNbEIsQ0FBQTs7QUFBQSxxQkEyUEEsZUFBQSxHQUFpQixTQUFBLEdBQUE7QUFFZixRQUFBLEtBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxJQUFDLENBQUEsU0FBVCxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsU0FBRCxHQUFhLENBQUMsS0FBTSxDQUFBLENBQUEsQ0FBUCxFQUFXLEtBQU0sQ0FBQSxDQUFBLENBQWpCLENBRmIsQ0FBQTtBQUFBLElBSUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsWUFBWSxDQUFDLE9BQXJCLEVBQThCLFNBQUMsSUFBRCxHQUFBO2FBRTVCLElBQUksQ0FBQyxNQUFMLENBQUEsRUFGNEI7SUFBQSxDQUE5QixDQUpBLENBQUE7QUFBQSxJQVVBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLFlBQVksQ0FBQyxLQUFyQixFQUE0QixTQUFDLElBQUQsR0FBQTthQUUxQixJQUFJLENBQUMsTUFBTCxDQUFBLEVBRjBCO0lBQUEsQ0FBNUIsQ0FWQSxDQUFBO0FBQUEsSUFnQkEsSUFBQyxDQUFBLFdBQUQsQ0FBQSxDQWhCQSxDQUFBO0FBQUEsSUFrQkEsSUFBQyxDQUFBLGdCQUFELENBQUEsQ0FsQkEsQ0FBQTtBQUFBLElBb0JBLElBQUMsQ0FBQSxPQUFPLENBQUMsU0FBVCxHQUFxQixJQUFDLENBQUEsU0FwQnRCLENBQUE7QUFBQSxJQXNCQSxJQUFDLENBQUEsT0FBTyxDQUFDLFVBQVQsR0FBc0IsSUFBQyxDQUFBLFNBQVMsQ0FBQyxNQXRCakMsQ0FBQTtXQXdCQSxJQUFDLENBQUEsZUFBZSxDQUFDLE1BQWpCLENBQXdCLElBQUMsQ0FBQSxPQUFPLENBQUMsRUFBakMsRUExQmU7RUFBQSxDQTNQakIsQ0FBQTs7QUFBQSxxQkF5UkEsYUFBQSxHQUFlLFNBQUEsR0FBQTtBQUViLFdBQU87QUFBQSxNQUVMLE9BQUEsRUFBUyx5QkFGSjtLQUFQLENBRmE7RUFBQSxDQXpSZixDQUFBOztBQUFBLHFCQXFTQSxXQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVgsSUFBQSxJQUFDLENBQUEsV0FBRCxJQUFjLENBQWQsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsV0FBRCxLQUFnQixJQUFDLENBQUEsU0FBUyxDQUFDLE1BQTlCO0FBRUUsTUFBQSxJQUFDLENBQUEsV0FBRCxHQUFlLENBQWYsQ0FGRjtLQUZBO0FBQUEsSUFNQSxJQUFDLENBQUEsWUFBRCxDQUFBLENBTkEsQ0FBQTtXQVFBLElBQUMsQ0FBQSxlQUFELENBQUEsRUFWVztFQUFBLENBclNiLENBQUE7O0FBQUEscUJBa1RBLGFBQUEsR0FBZSxTQUFBLEdBQUE7QUFFYixJQUFBLElBQUMsQ0FBQSxXQUFELElBQWMsQ0FBZCxDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxXQUFELEdBQWUsQ0FBbEI7QUFFRSxNQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLFNBQVMsQ0FBQyxNQUFYLEdBQW9CLENBQW5DLENBRkY7S0FGQTtBQUFBLElBTUEsSUFBQyxDQUFBLFlBQUQsQ0FBQSxDQU5BLENBQUE7V0FRQSxJQUFDLENBQUEsZUFBRCxDQUFBLEVBVmE7RUFBQSxDQWxUZixDQUFBOztBQUFBLHFCQWdVQSxVQUFBLEdBQVksU0FBQyxLQUFELEdBQUE7QUFFVixJQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsS0FBZixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsWUFBRCxDQUFBLENBRkEsQ0FBQTtXQUlBLElBQUMsQ0FBQSxlQUFELENBQUEsRUFOVTtFQUFBLENBaFVaLENBQUE7O0FBQUEscUJBeVVBLGNBQUEsR0FBZ0IsU0FBQyxFQUFELEdBQUE7V0FFZCxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxTQUFSLEVBQWtCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLFFBQUQsR0FBQTtBQUVoQixRQUFBLElBQUcsUUFBUSxDQUFDLE1BQVQsQ0FBQSxDQUFBLEtBQXFCLEVBQXhCO1VBRUUsS0FBQyxDQUFBLFVBQUQsQ0FBWSxDQUFDLENBQUMsT0FBRixDQUFVLEtBQUMsQ0FBQSxTQUFYLEVBQXFCLFFBQXJCLENBQVosRUFGRjtTQUZnQjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWxCLEVBRmM7RUFBQSxDQXpVaEIsQ0FBQTs7QUFBQSxxQkFzVkEsZUFBQSxHQUFpQixTQUFBLEdBQUE7QUFFZixJQUFBLElBQUMsQ0FBQSxTQUFVLENBQUEsSUFBQyxDQUFBLFdBQUQsQ0FBYSxDQUFDLElBQXpCLENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFFQSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLGFBQTFCLEVBQXlDLElBQUMsQ0FBQSxXQUExQyxDQUZBLENBQUE7QUFJQSxXQUFPLElBQVAsQ0FOZTtFQUFBLENBdFZqQixDQUFBOztBQUFBLHFCQStWQSxxQkFBQSxHQUF1QixTQUFDLE1BQUQsRUFBUyxTQUFULEdBQUE7QUFFckIsUUFBQSxXQUFBO0FBQUEsSUFBQSxJQUFHLE1BQUEsS0FBVSxLQUFiO0FBRUUsTUFBQSxJQUFHLFNBQUEsS0FBYSxlQUFoQjtBQUVFLFFBQUEsSUFBQyxDQUFBLGdCQUFELEdBQW9CLENBQUMsU0FBRCxDQUFwQixDQUZGO09BQUEsTUFBQTtBQU1FLFFBQUEsSUFBQyxDQUFBLGdCQUFnQixDQUFDLElBQWxCLENBQXVCLFNBQXZCLENBQUEsQ0FORjtPQUZGO0tBQUEsTUFVSyxJQUFHLE1BQUEsS0FBVSxRQUFiO0FBRUgsTUFBQSxJQUFHLFNBQUEsS0FBYSxlQUFoQjtBQUVFLFFBQUEsSUFBQyxDQUFBLGdCQUFELEdBQW9CLEVBQXBCLENBRkY7T0FBQSxNQUFBO0FBTUUsUUFBQSxXQUFBLEdBQWMsQ0FBQyxDQUFDLE9BQUYsQ0FBVSxJQUFDLENBQUEsZUFBWCxFQUE0QixTQUE1QixDQUFkLENBQUE7QUFBQSxRQUVBLElBQUMsQ0FBQSxnQkFBZ0IsQ0FBQyxNQUFsQixDQUF5QixXQUF6QixDQUZBLENBTkY7T0FGRztLQVZMO0FBQUEsSUFzQkEsSUFBQyxDQUFBLGVBQUQsQ0FBQSxDQXRCQSxDQUFBO0FBd0JBLFdBQU8sSUFBUCxDQTFCcUI7RUFBQSxDQS9WdkIsQ0FBQTs7QUFBQSxxQkE0WEEsZUFBQSxHQUFpQixTQUFBLEdBQUE7QUFFZixXQUFPLElBQUMsQ0FBQSxTQUFVLENBQUEsSUFBQyxDQUFBLFdBQUQsQ0FBbEIsQ0FGZTtFQUFBLENBNVhqQixDQUFBOztBQUFBLHFCQWlZQSxZQUFBLEdBQWMsU0FBQSxHQUFBO1dBRVosQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsU0FBUixFQUFrQixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxRQUFELEdBQUE7ZUFFaEIsUUFBUSxDQUFDLElBQVQsQ0FBQSxFQUZnQjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWxCLEVBRlk7RUFBQSxDQWpZZCxDQUFBOztBQUFBLHFCQTBZQSxXQUFBLEdBQWEsU0FBQyxDQUFELEdBQUE7QUFFWCxJQUFBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLFNBQVIsRUFBa0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsUUFBRCxHQUFBO2VBRWhCLFFBQVEsQ0FBQyxVQUFULEdBQXNCLE1BRk47TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFsQixDQUFBLENBQUE7QUFBQSxJQU1BLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxRQUFWLENBQW1CLFVBQW5CLENBTkEsQ0FBQTtBQUFBLElBUUEsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsV0FBcEIsQ0FBZ0MsU0FBaEMsQ0FSQSxDQUFBO1dBVUEsQ0FBQSxDQUFFLHVCQUFGLENBQTBCLENBQUMsV0FBM0IsQ0FBdUMsVUFBdkMsRUFaVztFQUFBLENBMVliLENBQUE7O0FBQUEscUJBNlpBLFdBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWCxJQUFBLElBQUMsQ0FBQSxXQUFELENBQUEsQ0FBQSxDQUFBO1dBRUEsSUFBQyxDQUFBLFdBQUQsQ0FBQSxFQUpXO0VBQUEsQ0E3WmIsQ0FBQTs7QUFBQSxxQkFxYUEsV0FBQSxHQUFhLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFBLENBQUE7V0FFQSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBSlc7RUFBQSxDQXJhYixDQUFBOztBQUFBLHFCQTRhQSxXQUFBLEdBQWEsU0FBQyxFQUFELEdBQUE7QUFFWCxRQUFBLENBQUE7QUFBQSxJQUFBLElBQUcsRUFBQSxLQUFNLHNCQUFUO0FBQ0UsTUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLDZFQUFSLENBQUosQ0FBQTtBQUNBLE1BQUEsSUFBRyxDQUFBLENBQUg7QUFDRSxjQUFBLENBREY7T0FGRjtLQUFBLE1BQUE7QUFPRSxNQUFBLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxRQUFWLENBQW1CLFdBQW5CLENBQUEsQ0FQRjtLQUFBO1dBU0EsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFDLENBQUEsU0FBUixFQUFtQixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxJQUFELEVBQU8sS0FBUCxHQUFBO0FBRWpCLFFBQUEsSUFBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQVgsS0FBaUIsRUFBcEI7aUJBRUUsS0FBQyxDQUFBLFVBQUQsQ0FBWSxLQUFaLEVBRkY7U0FGaUI7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQixFQVhXO0VBQUEsQ0E1YWIsQ0FBQTs7QUFBQSxxQkFnY0EsVUFBQSxHQUFZLFNBQUEsR0FBQTtXQUVWLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxXQUFWLENBQXNCLFdBQXRCLEVBRlU7RUFBQSxDQWhjWixDQUFBOztBQUFBLHFCQXFjQSxvQkFBQSxHQUFzQixTQUFDLENBQUQsR0FBQTtBQUNwQixJQUFBLENBQUMsQ0FBQyxjQUFGLENBQUEsQ0FBQSxDQUFBO1dBQ0EsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixXQUExQixFQUZvQjtFQUFBLENBcmN0QixDQUFBOztBQUFBLHFCQTJjQSxXQUFBLEdBQWEsU0FBQyxLQUFELEdBQUE7QUFFWCxJQUFBLElBQUMsQ0FBQSxVQUFELENBQVksS0FBWixDQUFBLENBQUE7V0FFQSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBSlc7RUFBQSxDQTNjYixDQUFBOztBQUFBLHFCQWtkQSxhQUFBLEdBQWUsU0FBQyxFQUFELEdBQUE7QUFFYixJQUFBLElBQUMsQ0FBQSxjQUFELENBQWdCLEVBQWhCLENBQUEsQ0FBQTtXQUVBLElBQUMsQ0FBQSxXQUFELENBQUEsRUFKYTtFQUFBLENBbGRmLENBQUE7O0FBQUEscUJBeWRBLGNBQUEsR0FBZ0IsU0FBQSxHQUFBO0FBRWQsUUFBQSxXQUFBO0FBQUEsSUFBQSxXQUFBLEdBQWMsRUFBZCxDQUFBO0FBQUEsSUFFQSxDQUFDLENBQUMsSUFBRixDQUFPLGdCQUFQLEVBQXlCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLEtBQUQsR0FBQTtlQUV2QixDQUFDLENBQUMsSUFBRixDQUFPLEtBQVAsRUFBYyxTQUFDLElBQUQsR0FBQTtBQUVaLFVBQUEsSUFBRyxJQUFJLENBQUMsUUFBTCxLQUFpQixJQUFwQjtBQUVFLFlBQUEsSUFBRyxJQUFJLENBQUMsRUFBUjtxQkFFRSxXQUFXLENBQUMsSUFBWixDQUFpQixJQUFJLENBQUMsRUFBdEIsRUFGRjthQUZGO1dBRlk7UUFBQSxDQUFkLEVBRnVCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBekIsQ0FGQSxDQUFBO0FBZ0JBLFdBQU8sV0FBUCxDQWxCYztFQUFBLENBemRoQixDQUFBOztrQkFBQTs7R0FOc0MsS0F2QnhDLENBQUE7Ozs7O0FDQ0EsSUFBQSx3QkFBQTtFQUFBO2lTQUFBOztBQUFBLFNBQUEsR0FBWSxPQUFBLENBQVEsMkJBQVIsQ0FBWixDQUFBOztBQUFBLE1BR00sQ0FBQyxPQUFQLEdBQXVCO0FBQU4sa0NBQUEsQ0FBQTs7OztHQUFBOzt1QkFBQTs7R0FBNEIsVUFIN0MsQ0FBQTs7Ozs7QUNEQSxJQUFBLHdEQUFBO0VBQUE7aVNBQUE7O0FBQUEsV0FBQSxHQUFjLE9BQUEsQ0FBUyxRQUFULENBQWQsQ0FBQTs7QUFBQSxJQUdBLEdBQU8sT0FBQSxDQUFRLHNCQUFSLENBSFAsQ0FBQTs7QUFBQSxhQU1BLEdBQWdCLE9BQUEsQ0FBUSxnQ0FBUixDQU5oQixDQUFBOztBQUFBLFlBUUEsR0FBZSxPQUFBLENBQVEsc0JBQVIsQ0FSZixDQUFBOztBQUFBLE1BVU0sQ0FBQyxPQUFQLEdBQXVCO0FBTXJCLDZCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSxxQkFBQSxTQUFBLEdBQVcsV0FBWCxDQUFBOztBQUFBLHFCQUVBLFFBQUEsR0FBVSxhQUZWLENBQUE7O0FBQUEscUJBSUEsYUFBQSxHQUFlLFNBQUEsR0FBQTtBQUViLFdBQU8sWUFBUCxDQUZhO0VBQUEsQ0FKZixDQUFBOztrQkFBQTs7R0FOc0MsS0FWeEMsQ0FBQTs7Ozs7QUNIQSxJQUFBLDhHQUFBO0VBQUE7aVNBQUE7O0FBQUEsV0FBQSxHQUFjLE9BQUEsQ0FBUyxRQUFULENBQWQsQ0FBQTs7QUFBQSxJQUdBLEdBQU8sT0FBQSxDQUFRLHNCQUFSLENBSFAsQ0FBQTs7QUFBQSxxQkFNQSxHQUF3QixPQUFBLENBQVEscURBQVIsQ0FOeEIsQ0FBQTs7QUFBQSxlQU9BLEdBQWtCLE9BQUEsQ0FBUSwrQ0FBUixDQVBsQixDQUFBOztBQUFBLHFCQVFBLEdBQXdCLE9BQUEsQ0FBUSxxREFBUixDQVJ4QixDQUFBOztBQUFBLGdCQVlBLEdBQW1CLE9BQUEsQ0FBUSwwQkFBUixDQVpuQixDQUFBOztBQUFBLE1BZ0JNLENBQUMsT0FBUCxHQUF1QjtBQUVyQiwrQkFBQSxDQUFBOzs7O0dBQUE7O0FBQUEsdUJBQUEsWUFBQSxHQUFjLEVBQWQsQ0FBQTs7QUFBQSx1QkFFQSxlQUFBLEdBQWlCLHFCQUZqQixDQUFBOztBQUFBLHVCQUlBLGVBQUEsR0FBaUIsZUFKakIsQ0FBQTs7QUFBQSx1QkFNQSxlQUFBLEdBQWlCLHFCQU5qQixDQUFBOztBQUFBLHVCQVNBLGFBQUEsR0FFRTtBQUFBLElBQUEsZ0JBQUEsRUFBbUIsZ0JBQW5CO0FBQUEsSUFDQSxlQUFBLEVBQW1CLGFBRG5CO0dBWEYsQ0FBQTs7QUFBQSx1QkFjQSxXQUFBLEdBQWEsU0FBQyxLQUFELEdBQUE7V0FDWCxJQUFDLENBQUEsWUFBRCxHQUFnQixNQURMO0VBQUEsQ0FkYixDQUFBOztBQUFBLHVCQW1CQSxlQUFBLEdBQWlCLFNBQUEsR0FBQTtBQUVmLElBQUEsSUFBQyxDQUFBLE1BQUQsQ0FBQSxDQUFBLENBQUE7QUFFQSxXQUFPLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFBLENBQVAsQ0FKZTtFQUFBLENBbkJqQixDQUFBOztBQUFBLHVCQTBCQSxNQUFBLEdBQVEsU0FBQSxHQUFBO0FBRU4sV0FBTyxJQUFQLENBRk07RUFBQSxDQTFCUixDQUFBOztBQUFBLHVCQStCQSxjQUFBLEdBQWdCLFNBQUEsR0FBQTtBQUVkLFFBQUEsNkZBQUE7QUFBQSxJQUFBLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFqQixDQUFWLENBQTZDLENBQUMsSUFBOUMsQ0FBQSxDQUFoQixDQUFBO0FBQUEsSUFFQSxtQkFBQSxHQUFzQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxJQUFDLENBQUEsUUFBRCxDQUFVLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBVixDQUFWLENBQXNDLENBQUMsSUFBdkMsQ0FBQSxDQUZ0QixDQUFBO0FBQUEsSUFJQSxnQkFBQSxHQUFtQixtQkFBbUIsQ0FBQyxPQUFwQixDQUE0QixnQkFBNUIsRUFBNkMsRUFBN0MsQ0FKbkIsQ0FBQTtBQUFBLElBTUEsYUFBQSxHQUFnQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxJQUFDLENBQUEsZUFBRCxDQUFpQixJQUFDLENBQUEsYUFBRCxDQUFBLENBQWpCLENBQVYsQ0FBNkMsQ0FBQyxJQUE5QyxDQUFBLENBTmhCLENBQUE7QUFBQSxJQVFBLGFBQUEsR0FBZ0IsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsSUFBQyxDQUFBLGVBQUQsQ0FBaUIsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFqQixDQUFWLENBQTZDLENBQUMsSUFBOUMsQ0FBQSxDQVJoQixDQUFBO0FBQUEsSUFVQSxTQUFBLEdBQVksYUFBQSxHQUFnQixnQkFBaEIsR0FBbUMsYUFBbkMsR0FBbUQsYUFWL0QsQ0FBQTtBQVlBLFdBQU8sU0FBUCxDQWRjO0VBQUEsQ0EvQmhCLENBQUE7O0FBQUEsdUJBZ0RBLGFBQUEsR0FBZSxTQUFBLEdBQUE7QUFFYixXQUFPLENBQUMsQ0FBQyxNQUFGLENBQVMsZ0JBQVQsRUFBMEI7QUFBQSxNQUFFLFdBQUEsRUFBYSxDQUFBLENBQUUsb0JBQUYsQ0FBdUIsQ0FBQyxHQUF4QixDQUFBLENBQWY7QUFBQSxNQUE4QyxTQUFBLEVBQVcsT0FBekQ7S0FBMUIsQ0FBUCxDQUZhO0VBQUEsQ0FoRGYsQ0FBQTs7QUFBQSx1QkFxREEsVUFBQSxHQUFZLFNBQUMsUUFBRCxHQUFBO1dBRVYsQ0FBQyxDQUFDLElBQUYsQ0FFRTtBQUFBLE1BQUEsSUFBQSxFQUFNLE1BQU47QUFBQSxNQUVBLEdBQUEsRUFBSyxVQUZMO0FBQUEsTUFJQSxJQUFBLEVBRUU7QUFBQSxRQUFBLFFBQUEsRUFBVSxRQUFWO0FBQUEsUUFFQSxZQUFBLEVBQWMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUZqRDtPQU5GO0FBQUEsTUFVQSxPQUFBLEVBQVMsU0FBQyxRQUFELEdBQUE7QUFFUCxZQUFBLE9BQUE7QUFBQSxRQUFBLENBQUEsQ0FBRSxVQUFGLENBQWEsQ0FBQyxXQUFkLENBQTBCLFlBQTFCLENBQUEsQ0FBQTtBQUVBLFFBQUEsSUFBRyxRQUFRLENBQUMsT0FBWjtBQUVFLFVBQUEsT0FBQSxHQUFXLCtCQUFBLEdBQStCLFFBQVEsQ0FBQyxLQUFuRCxDQUFBO0FBQUEsVUFFQSxLQUFBLENBQU8scUVBQUEsR0FBcUUsT0FBNUUsQ0FGQSxDQUFBO2lCQUlBLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBaEIsR0FBdUIsUUFOekI7U0FBQSxNQUFBO0FBVUUsVUFBQSxPQUFPLENBQUMsR0FBUixDQUFZLFFBQVosQ0FBQSxDQUFBO2lCQUVBLEtBQUEsQ0FBTSw4SEFBTixFQVpGO1NBSk87TUFBQSxDQVZUO0tBRkYsRUFGVTtFQUFBLENBckRaLENBQUE7O0FBQUEsdUJBeUZBLGNBQUEsR0FBZ0IsU0FBQSxHQUFBO0FBRWQsSUFBQSxJQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE1BQXpDLEdBQWtELENBQXJEO0FBRUUsTUFBQSxDQUFBLENBQUUsVUFBRixDQUFhLENBQUMsUUFBZCxDQUF1QixZQUF2QixDQUFBLENBQUE7QUFBQSxNQUVBLE9BQU8sQ0FBQyxHQUFSLENBQVksSUFBQyxDQUFBLFlBQWIsQ0FGQSxDQUFBO2FBSUEsSUFBQyxDQUFBLFVBQUQsQ0FBWSxJQUFDLENBQUEsWUFBYixFQU5GO0tBQUEsTUFBQTtBQVVFLE1BQUEsS0FBQSxDQUFNLGtGQUFOLENBQUEsQ0FBQTtBQUFBLE1BRUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixXQUExQixFQUF1QyxPQUF2QyxDQUZBLENBQUE7YUFJQSxVQUFBLENBQVcsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtpQkFFVCxDQUFBLENBQUUsY0FBRixDQUFpQixDQUFDLEtBQWxCLENBQUEsRUFGUztRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQVgsRUFJQyxHQUpELEVBZEY7S0FGYztFQUFBLENBekZoQixDQUFBOztvQkFBQTs7R0FGd0MsS0FoQjFDLENBQUE7Ozs7O0FDRkEsSUFBQSxxR0FBQTtFQUFBO2lTQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVMsUUFBVCxDQUFkLENBQUE7O0FBQUEsSUFHQSxHQUFPLE9BQUEsQ0FBUSxzQkFBUixDQUhQLENBQUE7O0FBQUEsaUJBS0EsR0FBb0IsT0FBQSxDQUFRLGtEQUFSLENBTHBCLENBQUE7O0FBQUEsaUJBTUEsR0FBb0IsT0FBQSxDQUFRLGtEQUFSLENBTnBCLENBQUE7O0FBQUEsZ0JBU0EsR0FBbUIsT0FBQSxDQUFRLDBCQUFSLENBVG5CLENBQUE7O0FBQUEsWUFZQSxHQUFlLE9BQUEsQ0FBUSx1QkFBUixDQVpmLENBQUE7O0FBQUEsTUFlTSxDQUFDLE9BQVAsR0FBdUI7QUFFckIsaUNBQUEsQ0FBQTs7OztHQUFBOztBQUFBLHlCQUFBLE1BQUEsR0FDRTtBQUFBLElBQUEsbUJBQUEsRUFBc0IsbUJBQXRCO0dBREYsQ0FBQTs7QUFBQSx5QkFHQSxvQkFBQSxHQUFzQixpQkFIdEIsQ0FBQTs7QUFBQSx5QkFLQSxpQkFBQSxHQUFtQixTQUFDLENBQUQsR0FBQTtBQUNqQixRQUFBLE9BQUE7QUFBQSxJQUFBLENBQUMsQ0FBQyxjQUFGLENBQUEsQ0FBQSxDQUFBO0FBQUEsSUFFQSxPQUFBLEdBQVUsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBRlYsQ0FBQTtBQUFBLElBSUEsT0FBTyxDQUFDLFdBQVIsQ0FBb0IsTUFBcEIsQ0FKQSxDQUFBO0FBQUEsSUFNQSxDQUFBLENBQUUsbUNBQUYsQ0FBc0MsQ0FBQyxJQUF2QyxDQUE0Qyx5QkFBNUMsQ0FBc0UsQ0FBQyxXQUF2RSxDQUFtRixRQUFuRixDQU5BLENBQUE7QUFRQSxJQUFBLElBQUcsT0FBTyxDQUFDLFFBQVIsQ0FBaUIsTUFBakIsQ0FBSDthQUNFLE9BQU8sQ0FBQyxJQUFSLENBQWEsZ0JBQWIsRUFERjtLQUFBLE1BQUE7YUFHRSxPQUFPLENBQUMsSUFBUixDQUFhLGNBQWIsRUFIRjtLQVRpQjtFQUFBLENBTG5CLENBQUE7O0FBQUEseUJBdUJBLE1BQUEsR0FBUSxTQUFBLEdBQUE7QUFFTixRQUFBLGlEQUFBO0FBQUEsSUFBQSxnQkFBQSxHQUFtQixXQUFXLENBQUMsUUFBUSxDQUFDLGdCQUF4QyxDQUFBO0FBQUEsSUFFQSxlQUFBLEdBQWtCLENBQUMsQ0FBQyxLQUFGLENBQVEsZ0JBQWlCLENBQUEsc0JBQUEsQ0FBekIsRUFBa0Q7QUFBQSxNQUFDLFFBQUEsRUFBVSxJQUFYO0tBQWxELENBRmxCLENBQUE7QUFBQSxJQUlBLENBQUEsQ0FBRSxxRUFBRixDQUF3RSxDQUFDLFFBQXpFLENBQWtGLElBQUMsQ0FBQSxHQUFuRixDQUF1RixDQUFDLEdBQXhGLENBQ0U7QUFBQSxNQUFBLFlBQUEsRUFBYyxLQUFkO0tBREYsQ0FKQSxDQUFBO0FBQUEsSUFRQSxDQUFDLENBQUMsSUFBRixDQUFPLGVBQVAsRUFBd0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsR0FBRCxHQUFBO0FBRXRCLFlBQUEsb0JBQUE7QUFBQSxRQUFBLFNBQUEsR0FBWSxHQUFHLENBQUMsS0FBaEIsQ0FBQTtBQUFBLFFBRUEsU0FBQSxHQUFZLENBQUEsQ0FBRSxLQUFDLENBQUEsb0JBQUQsQ0FFWjtBQUFBLFVBQUEsS0FBQSxFQUFPLFNBQVA7QUFBQSxVQUVBLE1BQUEsRUFBUSxzQkFGUjtBQUFBLFVBSUEsV0FBQSxFQUFhLEVBSmI7U0FGWSxDQUFGLENBUVYsQ0FBQyxJQVJTLENBUUosZUFSSSxDQVFZLENBQUMsV0FSYixDQVF5Qix5QkFSekIsQ0FGWixDQUFBO0FBQUEsUUFZQSxTQUFTLENBQUMsSUFBVixDQUFlLGNBQWYsQ0FaQSxDQUFBO2VBY0EsS0FBQyxDQUFBLEdBQUcsQ0FBQyxNQUFMLENBQVksU0FBWixFQWhCc0I7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF4QixDQVJBLENBQUE7QUFBQSxJQTRCQSxjQUFBLEdBQWlCLEVBNUJqQixDQUFBO0FBQUEsSUFnQ0EsQ0FBQyxDQUFDLElBQUYsQ0FBTyxnQkFBUCxFQUF5QixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxHQUFELEVBQU0sQ0FBTixHQUFBO0FBRXZCLFlBQUEsK0NBQUE7QUFBQSxRQUFBLFFBQUEsR0FBVyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFTLENBQUEsR0FBQSxDQUFsRCxDQUFBO0FBQUEsUUFFQSxZQUFBLEdBQWUsQ0FBQyxDQUFDLEtBQUYsQ0FBUSxRQUFSLEVBQWtCLElBQWxCLENBRmYsQ0FBQTtBQUFBLFFBSUEsVUFBQSxHQUFhLENBQUMsQ0FBQyxLQUFGLENBQVEsUUFBUixFQUFrQixPQUFsQixDQUpiLENBQUE7QUFBQSxRQU1BLFdBQUEsR0FBYyxRQUFRLENBQUMsTUFOdkIsQ0FBQTtBQVFBLFFBQUEsSUFBRyxVQUFVLENBQUMsTUFBWCxHQUFvQixDQUFwQixJQUF5QixDQUFBLEtBQUssQ0FBakM7QUFFRSxVQUFBLENBQUEsQ0FBRSxpSEFBRixDQUFvSCxDQUFDLFFBQXJILENBQThILEtBQUMsQ0FBQSxHQUEvSCxDQUFtSSxDQUFDLEdBQXBJLENBQ0U7QUFBQSxZQUFBLE1BQUEsRUFBUSxNQUFSO0FBQUEsWUFDQSxPQUFBLEVBQVMsT0FEVDtBQUFBLFlBRUEsUUFBQSxFQUFVLFVBRlY7QUFBQSxZQUdBLFlBQUEsRUFBYyxHQUhkO0FBQUEsWUFJQSxTQUFBLEVBQVcsTUFKWDtXQURGLENBQUEsQ0FGRjtTQVJBO2VBa0JBLENBQUMsQ0FBQyxJQUFGLENBQU8sVUFBUCxFQUFtQixTQUFDLEtBQUQsRUFBUSxLQUFSLEdBQUE7QUFFakIsY0FBQSxjQUFBO0FBQUEsVUFBQSxJQUFBLENBQUEsUUFBZ0IsQ0FBQSxLQUFBLENBQU0sQ0FBQyxjQUF2QjtBQUVFLGtCQUFBLENBRkY7V0FBQTtBQUFBLFVBSUEsY0FBQSxHQUFpQixFQUpqQixDQUFBO0FBQUEsVUFNQSxjQUFBLEdBQWlCLGdCQUFpQixDQUFBLFlBQWEsQ0FBQSxLQUFBLENBQWIsQ0FObEMsQ0FBQTtBQUFBLFVBU0EsQ0FBQyxDQUFDLElBQUYsQ0FBTyxjQUFQLEVBQXVCLFNBQUMsS0FBRCxHQUFBO0FBRXJCLFlBQUEsSUFBRyxLQUFLLENBQUMsSUFBVDtBQUVFLGNBQUEsSUFBRyxLQUFLLENBQUMsSUFBTixLQUFjLFVBQWQsSUFBNEIsS0FBSyxDQUFDLElBQU4sS0FBYyxVQUE3QztBQUVFLGdCQUFBLElBQUcsS0FBSyxDQUFDLFFBQU4sS0FBa0IsSUFBckI7eUJBRUUsY0FBYyxDQUFDLElBQWYsQ0FBb0IsS0FBSyxDQUFDLEtBQTFCLEVBRkY7aUJBRkY7ZUFBQSxNQU1LLElBQUcsS0FBSyxDQUFDLElBQU4sS0FBYyxZQUFqQjtBQUVILGdCQUFBLElBQUcsS0FBSyxDQUFDLEVBQU4sS0FBWSxjQUFmO3lCQUVFLGNBQWMsQ0FBQyxJQUFmLENBQW9CLEtBQUssQ0FBQyxhQUExQixFQUZGO2lCQUZHO2VBUlA7YUFGcUI7VUFBQSxDQUF2QixDQVRBLENBQUE7QUEwQkEsVUFBQSxJQUFHLGNBQWMsQ0FBQyxNQUFmLEtBQXlCLENBQTVCO0FBRUUsWUFBQSxjQUFjLENBQUMsSUFBZixDQUFvQixpQkFBcEIsQ0FBQSxDQUZGO1dBMUJBO2lCQThCQSxLQUFDLENBQUEsR0FBRyxDQUFDLE1BQUwsQ0FBYSxLQUFDLENBQUEsb0JBQUQsQ0FFWDtBQUFBLFlBQUEsS0FBQSxFQUFPLEtBQVA7QUFBQSxZQUVBLE1BQUEsRUFBUSxZQUFhLENBQUEsS0FBQSxDQUZyQjtBQUFBLFlBSUEsV0FBQSxFQUFhLGNBSmI7V0FGVyxDQUFiLEVBaENpQjtRQUFBLENBQW5CLEVBcEJ1QjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXpCLENBaENBLENBQUE7QUFBQSxJQWlHQSxJQUFDLENBQUEsaUJBQUQsQ0FBQSxDQWpHQSxDQUFBO0FBbUdBLFdBQU8sSUFBUCxDQXJHTTtFQUFBLENBdkJSLENBQUE7O0FBQUEseUJBK0hBLGlCQUFBLEdBQW1CLFNBQUEsR0FBQTtBQUVqQixRQUFBLFVBQUE7QUFBQSxJQUFBLElBQUMsQ0FBQSxZQUFELEdBQW9CLElBQUEsWUFBQSxDQUFBLENBQXBCLENBQUE7QUFBQSxJQUVBLFVBQUEsR0FBYSxDQUFBLENBQUUsbU9BQUYsQ0FGYixDQUFBO0FBQUEsSUFJQSxVQUFVLENBQUMsR0FBWCxDQUFlLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxXQUEvQyxDQUpBLENBQUE7QUFBQSxJQU1BLENBQUEsQ0FBRSx3QkFBRixDQUEyQixDQUFDLElBQTVCLENBQWlDLFVBQVcsQ0FBQSxDQUFBLENBQTVDLENBTkEsQ0FBQTtBQUFBLElBUUEsVUFBVSxDQUFDLEdBQVgsQ0FBZSxRQUFmLENBUkEsQ0FBQTtBQUFBLElBVUEsVUFBVSxDQUFDLEVBQVgsQ0FBYyxRQUFkLEVBQXdCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsR0FBQTtBQUV0QixRQUFBLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxXQUFoQyxHQUE4QyxDQUFBLENBQUUsQ0FBQyxDQUFDLE1BQUosQ0FBVyxDQUFDLEdBQVosQ0FBQSxDQUE5QyxDQUFBO0FBQUEsUUFFQSxLQUFDLENBQUEsWUFBWSxDQUFDLE1BQWQsQ0FBQSxDQUZBLENBQUE7ZUFHQSxXQUFXLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxNQUFsQyxDQUFBLEVBTHNCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBeEIsQ0FWQSxDQUFBO0FBaUJBLFdBQU8sSUFBUCxDQW5CaUI7RUFBQSxDQS9IbkIsQ0FBQTs7c0JBQUE7O0dBRjBDLEtBZjVDLENBQUE7Ozs7O0FDSUEsSUFBQSwrQ0FBQTtFQUFBO2lTQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVMsUUFBVCxDQUFkLENBQUE7O0FBQUEsSUFFQSxHQUFPLE9BQUEsQ0FBUSxzQkFBUixDQUZQLENBQUE7O0FBQUEsZUFJQSxHQUFrQixPQUFBLENBQVEsa0NBQVIsQ0FKbEIsQ0FBQTs7QUFBQSxNQU9NLENBQUMsT0FBUCxHQUF1QjtBQUdyQixnQ0FBQSxDQUFBOzs7O0dBQUE7O0FBQUEsd0JBQUEsU0FBQSxHQUFXLFVBQVgsQ0FBQTs7QUFBQSx3QkFHQSxRQUFBLEdBQVUsZUFIVixDQUFBOztBQUFBLHdCQU1BLGlCQUFBLEdBQW1CLEtBTm5CLENBQUE7O0FBQUEsd0JBU0EsVUFBQSxHQUFZLFNBQUEsR0FBQTtBQUVWLElBQUEsSUFBQyxDQUFBLFdBQUQsR0FBZSxDQUFmLENBQUE7V0FFQSxJQUFDLENBQUEsTUFBRCxHQUFVLENBQUMsQ0FBQyxJQUFGLENBQVEsSUFBQyxDQUFBLE1BQVQsRUFBaUIsSUFBakIsRUFKQTtFQUFBLENBVFosQ0FBQTs7QUFBQSx3QkFnQkEsYUFBQSxHQUVFO0FBQUEsSUFBQSxhQUFBLEVBQWdCLG1CQUFoQjtBQUFBLElBRUEsZUFBQSxFQUFrQixjQUZsQjtBQUFBLElBSUEsV0FBQSxFQUFjLGlCQUpkO0dBbEJGLENBQUE7O0FBQUEsd0JBeUJBLE1BQUEsR0FBUSxTQUFBLEdBQUE7V0FFTjtBQUFBLE1BQUEsYUFBQSxFQUFnQixrQkFBaEI7QUFBQSxNQUVBLGFBQUEsRUFBZ0Isa0JBRmhCO0FBQUEsTUFJQSxZQUFBLEVBQWdCLGlCQUpoQjtNQUZNO0VBQUEsQ0F6QlIsQ0FBQTs7QUFBQSx3QkFrQ0EsTUFBQSxHQUFRLFNBQUEsR0FBQTtBQUVOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVcsSUFBQyxDQUFBLFFBQUQsQ0FBVyxJQUFDLENBQUEsYUFBRCxDQUFBLENBQVgsQ0FBWCxDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQyxDQUFBLFdBQUQsR0FBZSxDQUFmLElBQW9CLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBQyxDQUFBLFVBQUQsR0FBYyxDQUFwRDtBQUVFLE1BQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxXQUFMLENBQWlCLFFBQWpCLENBQUEsQ0FGRjtLQUFBLE1BSUssSUFBRyxJQUFDLENBQUEsV0FBRCxHQUFlLENBQWYsSUFBb0IsSUFBQyxDQUFBLFdBQUQsS0FBZ0IsSUFBQyxDQUFBLFVBQUQsR0FBYyxDQUFyRDtBQUVILE1BQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxXQUFMLENBQWlCLFFBQWpCLENBQUEsQ0FGRztLQUFBLE1BQUE7QUFNSCxNQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLFFBQWQsQ0FBQSxDQU5HO0tBTkw7V0FjQSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBaEJNO0VBQUEsQ0FsQ1IsQ0FBQTs7QUFBQSx3QkFxREEsYUFBQSxHQUFlLFNBQUEsR0FBQTtBQUViLFdBQU87QUFBQSxNQUVMLE9BQUEsRUFBUyxJQUFDLENBQUEsV0FGTDtBQUFBLE1BSUwsS0FBQSxFQUFPLElBQUMsQ0FBQSxVQUpIO0FBQUEsTUFNTCxZQUFBLEVBQWMsSUFBQyxDQUFBLFVBQUQsQ0FBWSxNQUFaLENBTlQ7QUFBQSxNQVFMLFlBQUEsRUFBYyxJQUFDLENBQUEsVUFBRCxDQUFZLE1BQVosQ0FSVDtBQUFBLE1BVUwsU0FBQSxFQUFXLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFBLEdBQUE7QUFFVCxVQUFBLElBQUcsS0FBQyxDQUFBLFVBQUQsQ0FBQSxDQUFIO0FBRUUsbUJBQU8sRUFBUCxDQUZGO1dBQUEsTUFBQTtBQU1FLG1CQUFPLE1BQVAsQ0FORjtXQUZTO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FWTjtBQUFBLE1Bb0JMLFNBQUEsRUFBVyxDQUFBLFNBQUEsS0FBQSxHQUFBO2VBQUEsU0FBQSxHQUFBO0FBRVQsVUFBQSxJQUFHLEtBQUMsQ0FBQSxVQUFELENBQUEsQ0FBSDtBQUVFLG1CQUFPLE1BQVAsQ0FGRjtXQUFBLE1BQUE7QUFNRSxtQkFBTyxNQUFQLENBTkY7V0FGUztRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBcEJOO0FBQUEsTUE4QkwsVUFBQSxFQUFZLElBQUMsQ0FBQSxVQUFELENBQUEsQ0E5QlA7QUFBQSxNQWdDTCxtQkFBQSxFQUFxQixxQkFoQ2hCO0FBQUEsTUFrQ0wsS0FBQSxFQUFPLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFBLEdBQUE7QUFFTCxjQUFBLEdBQUE7QUFBQSxVQUFBLEdBQUEsR0FBTSxFQUFOLENBQUE7QUFBQSxVQUVBLENBQUMsQ0FBQyxJQUFGLENBQU8sS0FBQyxDQUFBLFNBQVIsRUFBbUIsU0FBQyxJQUFELEVBQU8sS0FBUCxHQUFBO0FBRWpCLGdCQUFBLDhCQUFBO0FBQUEsWUFBQSxRQUFBLEdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUF0QixDQUFBO0FBQUEsWUFFQSxRQUFBLEdBQVcsS0FBQyxDQUFBLFdBQUQsS0FBZ0IsS0FGM0IsQ0FBQTtBQUFBLFlBSUEsVUFBQSxHQUFhLElBQUksQ0FBQyxjQUpsQixDQUFBO21CQU1BLEdBQUcsQ0FBQyxJQUFKLENBQVM7QUFBQSxjQUFDLEVBQUEsRUFBSSxLQUFMO0FBQUEsY0FBWSxRQUFBLEVBQVUsUUFBdEI7QUFBQSxjQUFnQyxVQUFBLEVBQVksVUFBNUM7QUFBQSxjQUF3RCxTQUFBLEVBQVcsUUFBUSxDQUFDLEtBQTVFO0FBQUEsY0FBbUYsTUFBQSxFQUFRLFFBQVEsQ0FBQyxFQUFwRzthQUFULEVBUmlCO1VBQUEsQ0FBbkIsQ0FGQSxDQUFBO0FBY0EsaUJBQU8sR0FBUCxDQWhCSztRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBbENGO0tBQVAsQ0FGYTtFQUFBLENBckRmLENBQUE7O0FBQUEsd0JBK0dBLFdBQUEsR0FBYSxTQUFBLEdBQUE7QUFFWCxXQUFPLElBQVAsQ0FGVztFQUFBLENBL0diLENBQUE7O0FBQUEsd0JBcUhBLGdCQUFBLEdBQWtCLFNBQUMsQ0FBRCxHQUFBO0FBRWhCLElBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQSxDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFIO2FBRUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixXQUExQixFQUF1QyxTQUF2QyxFQUZGO0tBQUEsTUFBQTthQU1FLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBbEIsQ0FBMEIsV0FBMUIsRUFORjtLQUpnQjtFQUFBLENBckhsQixDQUFBOztBQUFBLHdCQW1JQSxnQkFBQSxHQUFrQixTQUFDLENBQUQsR0FBQTtBQUVoQixJQUFBLENBQUMsQ0FBQyxjQUFGLENBQUEsQ0FBQSxDQUFBO1dBRUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixXQUExQixFQUpnQjtFQUFBLENBbklsQixDQUFBOztBQUFBLHdCQTJJQSxlQUFBLEdBQWlCLFNBQUMsQ0FBRCxHQUFBO0FBRWYsUUFBQSxPQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtBQUFBLElBRUEsT0FBQSxHQUFVLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUZWLENBQUE7QUFJQSxJQUFBLElBQUcsSUFBQyxDQUFBLGlCQUFKO0FBRUUsTUFBQSxJQUFHLFFBQUEsQ0FBUyxPQUFPLENBQUMsSUFBUixDQUFhLGFBQWIsQ0FBVCxDQUFBLEtBQXlDLFFBQUEsQ0FBUyxJQUFDLENBQUEsVUFBRCxHQUFjLENBQXZCLENBQTVDO2VBRUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixXQUExQixFQUZGO09BQUEsTUFBQTtlQU1FLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBbEIsQ0FBMEIsV0FBMUIsRUFBdUMsT0FBTyxDQUFDLElBQVIsQ0FBYSxTQUFiLENBQXZDLEVBTkY7T0FGRjtLQUFBLE1BQUE7YUFZRSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLFdBQTFCLEVBQXVDLE9BQU8sQ0FBQyxJQUFSLENBQWEsUUFBYixDQUF2QyxFQVpGO0tBTmU7RUFBQSxDQTNJakIsQ0FBQTs7QUFBQSx3QkFnS0EsZUFBQSxHQUFpQixTQUFBLEdBQUE7V0FFZixRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLFdBQTFCLEVBQXVDLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBdkMsRUFGZTtFQUFBLENBaEtqQixDQUFBOztBQUFBLHdCQXFLQSxpQkFBQSxHQUFtQixTQUFDLElBQUQsR0FBQTtBQUVqQixJQUFBLElBQUMsQ0FBQSxXQUFELEdBQWUsSUFBZixDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxVQUFELENBQUEsQ0FBSDtBQUVFLE1BQUEsSUFBQyxDQUFBLGlCQUFELEdBQXFCLElBQXJCLENBRkY7S0FGQTtXQU1BLElBQUMsQ0FBQSxNQUFELENBQUEsRUFSaUI7RUFBQSxDQXJLbkIsQ0FBQTs7QUFBQSx3QkFnTEEsWUFBQSxHQUFjLFNBQUMsUUFBRCxHQUFBO0FBRVosV0FBTyxJQUFDLENBQUEsTUFBRCxDQUFBLENBQVAsQ0FGWTtFQUFBLENBaExkLENBQUE7O0FBQUEsd0JBMExBLGFBQUEsR0FBZSxTQUFBLEdBQUE7QUFFYixXQUFPLElBQUMsQ0FBQSxVQUFELEdBQVksQ0FBbkIsQ0FGYTtFQUFBLENBMUxmLENBQUE7O0FBQUEsd0JBOExBLFVBQUEsR0FBWSxTQUFBLEdBQUE7QUFFVixXQUFPLElBQUMsQ0FBQSxXQUFELEtBQWdCLElBQUMsQ0FBQSxVQUFELEdBQWMsQ0FBOUIsSUFBbUMsSUFBQyxDQUFBLFdBQUQsR0FBZSxDQUF6RCxDQUZVO0VBQUEsQ0E5TFosQ0FBQTs7QUFBQSx3QkFrTUEsVUFBQSxHQUFZLFNBQUMsSUFBRCxHQUFBO0FBRVYsUUFBQSxJQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sSUFBUCxDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUEsS0FBUSxNQUFYO0FBRUUsTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLFdBQUQsS0FBZ0IsQ0FBdkIsQ0FGRjtLQUFBLE1BSUssSUFBRyxJQUFBLEtBQVEsTUFBWDtBQUVILE1BQUEsSUFBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFNBQVUsQ0FBQSxJQUFDLENBQUEsV0FBRCxDQUFhLENBQUMsZUFBaEQ7QUFFRSxRQUFBLElBQUEsR0FBTyxLQUFQLENBRkY7T0FBQSxNQUlLLElBQUcsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFIO0FBRUgsUUFBQSxJQUFBLEdBQU8sSUFBUCxDQUZHO09BSkw7QUFRQSxNQUFBLElBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUF0QyxLQUFnRCxDQUFuRDtBQUVFLFFBQUEsSUFBQSxHQUFPLElBQVAsQ0FGRjtPQVZHO0tBTkw7QUFxQkEsV0FBTyxJQUFQLENBdkJVO0VBQUEsQ0FsTVosQ0FBQTs7cUJBQUE7O0dBSHlDLEtBUDNDLENBQUE7Ozs7O0FDRUEsSUFBQSxrTkFBQTtFQUFBO2lTQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVMsUUFBVCxDQUFkLENBQUE7O0FBQUEsSUFHQSxHQUFPLE9BQUEsQ0FBUSxzQkFBUixDQUhQLENBQUE7O0FBQUEsYUFNQSxHQUFnQixPQUFBLENBQVEsd0JBQVIsQ0FOaEIsQ0FBQTs7QUFBQSxhQVNBLEdBQWdCLE9BQUEsQ0FBUSx3QkFBUixDQVRoQixDQUFBOztBQUFBLGdCQVlBLEdBQW1CLE9BQUEsQ0FBUSwyQkFBUixDQVpuQixDQUFBOztBQUFBLFlBZUEsR0FBZSxPQUFBLENBQVEsdUJBQVIsQ0FmZixDQUFBOztBQUFBLFlBbUJBLEdBQWUsT0FBQSxDQUFRLHFDQUFSLENBbkJmLENBQUE7O0FBQUEsaUJBc0JBLEdBQW9CLE9BQUEsQ0FBUSwwQ0FBUixDQXRCcEIsQ0FBQTs7QUFBQSxnQkF5QkEsR0FBbUIsT0FBQSxDQUFRLDhDQUFSLENBekJuQixDQUFBOztBQUFBLGlCQTRCQSxHQUFvQixPQUFBLENBQVEsK0NBQVIsQ0E1QnBCLENBQUE7O0FBQUEsZUErQkEsR0FBa0IsT0FBQSxDQUFRLGdEQUFSLENBL0JsQixDQUFBOztBQUFBLGNBa0NBLEdBQWlCLE9BQUEsQ0FBUSwwQkFBUixDQWxDakIsQ0FBQTs7QUFBQSxnQkFxQ0EsR0FBbUIsT0FBQSxDQUFRLDBCQUFSLENBckNuQixDQUFBOztBQUFBLE1BMENNLENBQUMsT0FBUCxHQUF1QjtBQUdyQiw2QkFBQSxDQUFBOzs7O0dBQUE7O0FBQUEscUJBQUEsU0FBQSxHQUFXLE1BQVgsQ0FBQTs7QUFBQSxxQkFHQSxPQUFBLEdBQVMsU0FIVCxDQUFBOztBQUFBLHFCQU1BLFFBQUEsR0FBVSxZQU5WLENBQUE7O0FBQUEscUJBU0EsYUFBQSxHQUFlLGlCQVRmLENBQUE7O0FBQUEscUJBWUEsV0FBQSxHQUFhLGdCQVpiLENBQUE7O0FBQUEscUJBZUEsa0JBQUEsR0FBb0IsaUJBZnBCLENBQUE7O0FBQUEscUJBa0JBLGNBQUEsR0FBZ0IsY0FsQmhCLENBQUE7O0FBQUEscUJBcUJBLFdBQUEsR0FBYSxlQXJCYixDQUFBOztBQUFBLHFCQXdCQSxlQUFBLEdBQWlCLEtBeEJqQixDQUFBOztBQUFBLHFCQTJCQSxjQUFBLEdBQWdCLEtBM0JoQixDQUFBOztBQUFBLHFCQThCQSxVQUFBLEdBQVksS0E5QlosQ0FBQTs7QUFBQSxxQkFpQ0EsV0FBQSxHQUFhLEtBakNiLENBQUE7O0FBQUEscUJBd0NBLE1BQUEsR0FFRTtBQUFBLElBQUEsZ0JBQUEsRUFBbUIsZ0JBQW5CO0FBQUEsSUFFQSw2QkFBQSxFQUFnQyxVQUZoQztBQUFBLElBSUEsb0JBQUEsRUFBdUIsY0FKdkI7QUFBQSxJQU1BLGdEQUFBLEVBQW1ELHVCQU5uRDtBQUFBLElBUUEsb0JBQUEsRUFBdUIsa0JBUnZCO0dBMUNGLENBQUE7O0FBQUEscUJBc0RBLGFBQUEsR0FFRTtBQUFBLElBQUEsV0FBQSxFQUFjLFVBQWQ7QUFBQSxJQUVBLGFBQUEsRUFBZ0IsY0FGaEI7R0F4REYsQ0FBQTs7QUFBQSxxQkE2REEsZ0JBQUEsR0FBa0IsU0FBQyxDQUFELEdBQUE7QUFFaEIsUUFBQSxNQUFBO0FBQUEsSUFBQSxNQUFBLEdBQVMsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQWtCLENBQUMsSUFBbkIsQ0FBd0IsY0FBeEIsQ0FBVCxDQUFBO0FBRUEsSUFBQSxJQUFHLE1BQUg7YUFFRSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLFdBQTFCLEVBQXVDLE1BQXZDLEVBRkY7S0FKZ0I7RUFBQSxDQTdEbEIsQ0FBQTs7QUFBQSxxQkFxRUEsTUFBQSxHQUFRLFNBQUEsR0FBQTtBQUVOLFdBQU8sSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBekIsQ0FGTTtFQUFBLENBckVSLENBQUE7O0FBQUEscUJBMEVBLGFBQUEsR0FBZSxTQUFBLEdBQUE7QUFFYixRQUFBLGFBQUE7QUFBQSxJQUFBLElBQUEsQ0FBQSxDQUFPLElBQUMsQ0FBQSxXQUFELElBQWdCLElBQUMsQ0FBQSxVQUF4QixDQUFBO0FBRUUsYUFBTyxLQUFQLENBRkY7S0FBQTtBQUFBLElBSUEsYUFBQSxHQUFnQixLQUpoQixDQUFBO0FBU0EsSUFBQSxJQUFHLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxVQUFoQyxLQUE4QyxFQUE5QyxJQUFxRCxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsUUFBaEMsS0FBNEMsRUFBcEc7QUFDRSxNQUFBLGFBQUEsR0FBZ0IsSUFBaEIsQ0FERjtLQVRBO0FBWUEsV0FBTyxhQUFQLENBZGE7RUFBQSxDQTFFZixDQUFBOztBQUFBLHFCQTJGQSxxQkFBQSxHQUF1QixTQUFDLENBQUQsR0FBQTtBQUVyQixRQUFBLE9BQUE7QUFBQSxJQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBVixDQUFBO1dBRUEsT0FBTyxDQUFDLFdBQVIsQ0FBb0IsTUFBcEIsRUFKcUI7RUFBQSxDQTNGdkIsQ0FBQTs7QUFBQSxxQkFrR0EsY0FBQSxHQUFnQixTQUFDLENBQUQsR0FBQTtBQUVkLElBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQSxDQUFBLENBQUE7V0FFQSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLGdCQUExQixFQUpjO0VBQUEsQ0FsR2hCLENBQUE7O0FBQUEscUJBeUdBLE1BQUEsR0FBUSxTQUFBLEdBQUE7QUFFTixJQUFBLElBQUMsQ0FBQSxVQUFELEdBQWMsS0FBZCxDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxXQUFKO0FBRUUsTUFBQSxJQUFDLENBQUEsZUFBRCxDQUFpQixPQUFqQixDQUFBLENBRkY7S0FBQSxNQUlLLElBQUcsSUFBQyxDQUFBLFVBQUo7QUFFSCxNQUFBLElBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCLENBQUEsQ0FGRztLQUFBLE1BQUE7QUFNSCxNQUFBLElBQUMsQ0FBQSxlQUFELENBQWlCLFVBQWpCLENBQUEsQ0FORztLQU5MO0FBQUEsSUFjQSxJQUFDLENBQUEsb0JBQUQsQ0FBQSxDQWRBLENBQUE7QUFnQkEsV0FBTyxJQUFDLENBQUEsV0FBRCxDQUFBLENBQVAsQ0FsQk07RUFBQSxDQXpHUixDQUFBOztBQUFBLHFCQThIQSxlQUFBLEdBQWlCLFNBQUMsSUFBRCxHQUFBO0FBRWYsUUFBQSxpQkFBQTtBQUFBLElBQUEsSUFBRyxJQUFBLEtBQVEsVUFBWDtBQUVFLE1BQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVcsSUFBQyxDQUFBLFFBQUQsQ0FBVyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQWxCLENBQVgsQ0FBQSxDQUZGO0tBQUEsTUFJSyxJQUFHLElBQUEsS0FBUSxPQUFSLElBQW1CLElBQUEsS0FBUSxNQUE5QjtBQUVILE1BQUEsSUFBRyxJQUFBLEtBQVEsT0FBWDtBQUVFLFFBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsYUFBZCxDQUE0QixDQUFDLElBQTdCLENBQW1DLElBQUMsQ0FBQSxhQUFELENBQWdCLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBdkIsQ0FBbkMsQ0FBQSxDQUFBO0FBQUEsUUFFQSxTQUFBLEdBQVksY0FGWixDQUFBO0FBQUEsUUFJQSxJQUFDLENBQUEsWUFBRCxHQUFnQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxlQUFWLENBSmhCLENBRkY7T0FBQSxNQUFBO0FBVUUsUUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxZQUFkLENBQTJCLENBQUMsSUFBNUIsQ0FBa0MsSUFBQyxDQUFBLFFBQUQsQ0FBVyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQWxCLENBQWxDLENBQUEsQ0FBQTtBQUFBLFFBRUEsU0FBQSxHQUFZLHFCQUZaLENBVkY7T0FBQTtBQUFBLE1BZUEsTUFBQSxHQUFTLENBQUEsQ0FBRSxJQUFDLENBQUEsV0FBRCxDQUFhO0FBQUEsUUFBQyxLQUFBLEVBQU8sU0FBUjtPQUFiLENBQUYsQ0FmVCxDQUFBO0FBQUEsTUFrQkEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsa0JBQVYsQ0FBNkIsQ0FBQyxJQUE5QixDQUFtQyxNQUFuQyxDQWxCQSxDQUZHO0tBSkw7QUEwQkEsV0FBTyxJQUFQLENBNUJlO0VBQUEsQ0E5SGpCLENBQUE7O0FBQUEscUJBNkpBLG9CQUFBLEdBQXNCLFNBQUEsR0FBQTtBQUVwQixRQUFBLDRDQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsWUFBRCxHQUFnQixJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxrQkFBVixDQUFoQixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsV0FBRCxHQUFlLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGlCQUFWLENBRmYsQ0FBQTtBQUlBLElBQUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFsQixLQUF3QixTQUEzQjtBQUVFLE1BQUEsUUFBQSxHQUFXLFdBQVcsQ0FBQyxRQUFRLENBQUMsZ0JBQWhDLENBQUE7QUFBQSxNQUVBLGdCQUFBLEdBQW1CLFFBQVEsQ0FBQyxNQUY1QixDQUFBO0FBSUEsTUFBQSxJQUFHLGdCQUFBLEdBQW1CLENBQXRCO0FBRUUsUUFBQSxnQkFBQSxHQUFtQixJQUFJLENBQUMsS0FBTCxDQUFXLEdBQUEsR0FBSSxnQkFBZixDQUFuQixDQUFBO0FBQUEsUUFFQSxJQUFDLENBQUEsU0FBRCxHQUFhLEVBRmIsQ0FBQTtBQUFBLFFBSUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxRQUFQLEVBQWlCLENBQUEsU0FBQSxLQUFBLEdBQUE7aUJBQUEsU0FBQyxPQUFELEdBQUE7QUFFZixnQkFBQSxXQUFBO0FBQUEsWUFBQSxXQUFBLEdBQWMsZ0JBQWlCLENBQUEsS0FBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBbEIsQ0FBc0IsQ0FBQSxPQUFBLENBQXJELENBQUE7bUJBRUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxXQUFQLEVBQW9CLFNBQUMsU0FBRCxHQUFBO0FBRWxCLGNBQUEsU0FBUyxDQUFDLEtBQVYsR0FBa0IsZ0JBQWxCLENBQUE7cUJBRUEsS0FBQyxDQUFBLFNBQVMsQ0FBQyxJQUFYLENBQWdCLFNBQWhCLEVBSmtCO1lBQUEsQ0FBcEIsRUFKZTtVQUFBLEVBQUE7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWpCLENBSkEsQ0FGRjtPQUFBLE1BQUE7QUFzQkUsUUFBQSxJQUFDLENBQUEsU0FBRCxHQUFhLGdCQUFpQixDQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQWxCLENBQXNCLENBQUEsUUFBUyxDQUFBLENBQUEsQ0FBVCxDQUF2QyxJQUF1RCxFQUFwRSxDQXRCRjtPQU5GO0tBQUEsTUFBQTtBQWdDRSxNQUFBLElBQUMsQ0FBQSxTQUFELEdBQWEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBbEIsQ0FBakIsSUFBMEMsRUFBdkQsQ0FoQ0Y7S0FKQTtBQUFBLElBdUNBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLFNBQVIsRUFBbUIsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsS0FBRCxFQUFRLEtBQVIsR0FBQTtBQUVqQixZQUFBLGdDQUFBO0FBQUEsUUFBQSxJQUFBLENBQUEsS0FBWSxDQUFDLElBQWI7QUFFRSxnQkFBQSxDQUZGO1NBQUE7QUFJQSxRQUFBLElBQUcsS0FBSyxDQUFDLFFBQU4sSUFBa0IsS0FBSyxDQUFDLFFBQTNCO0FBRUUsVUFBQSxLQUFDLENBQUEsZUFBRCxHQUFtQixJQUFuQixDQUZGO1NBQUEsTUFJSyxJQUFHLEtBQUssQ0FBQyxRQUFUO0FBRUgsVUFBQSxLQUFDLENBQUEsZUFBRCxHQUFtQixJQUFuQixDQUZHO1NBQUEsTUFJQSxJQUFHLEtBQUssQ0FBQyxRQUFOLEtBQWtCLEtBQXJCO0FBRUgsVUFBQSxLQUFDLENBQUEsZUFBRCxHQUFtQixJQUFuQixDQUZHO1NBQUEsTUFJQSxJQUFHLEtBQUssQ0FBQyxJQUFOLEtBQWMsU0FBakI7QUFFSCxVQUFBLEtBQUMsQ0FBQSxlQUFELEdBQW1CLElBQW5CLENBRkc7U0FoQkw7QUFBQSxRQXFCQSxTQUFBLEdBQWdCLElBQUEsYUFBQSxDQUVkO0FBQUEsVUFBQSxLQUFBLEVBQVcsSUFBQSxRQUFRLENBQUMsS0FBVCxDQUFlLEtBQWYsQ0FBWDtTQUZjLENBckJoQixDQUFBO0FBQUEsUUEyQkEsU0FBUyxDQUFDLFNBQVYsR0FBc0IsS0FBSyxDQUFDLElBM0I1QixDQUFBO0FBQUEsUUE2QkEsU0FBUyxDQUFDLFNBQVYsR0FBc0IsS0E3QnRCLENBQUE7QUFBQSxRQStCQSxTQUFTLENBQUMsVUFBVixHQUF1QixLQS9CdkIsQ0FBQTtBQUFBLFFBaUNBLEtBQUMsQ0FBQSxZQUFZLENBQUMsTUFBZCxDQUFxQixTQUFTLENBQUMsTUFBVixDQUFBLENBQWtCLENBQUMsRUFBeEMsQ0FqQ0EsQ0FBQTtBQW1DQSxRQUFBLElBQUcsS0FBSyxDQUFDLE9BQVQ7QUFFRSxVQUFBLEdBQUEsR0FFRTtBQUFBLFlBQUEsRUFBQSxFQUFJLEtBQUo7QUFBQSxZQUVBLEtBQUEsRUFBTyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBRnJCO0FBQUEsWUFJQSxPQUFBLEVBQVMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUp2QjtXQUZGLENBQUE7QUFBQSxVQVFBLE1BQUEsR0FBUyxLQUFDLENBQUEsV0FBRCxDQUFhLEdBQWIsQ0FSVCxDQUFBO0FBQUEsVUFVQSxLQUFDLENBQUEsV0FBVyxDQUFDLE1BQWIsQ0FBb0IsTUFBcEIsQ0FWQSxDQUFBO2lCQVlBLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBZCxDQUF1QixVQUF2QixFQWRGO1NBQUEsTUFnQkssSUFBRyxLQUFLLENBQUMsYUFBVDtBQUVILFVBQUEsUUFBQSxHQUFXLENBQUMsQ0FBQyxNQUFGLENBQVMsS0FBQyxDQUFBLGNBQWUsQ0FBQSxLQUFLLENBQUMsRUFBTixDQUF6QixFQUFvQztBQUFBLFlBQUMsRUFBQSxFQUFJLEtBQUw7V0FBcEMsQ0FBWCxDQUFBO0FBQUEsVUFFQSxNQUFBLEdBQVMsS0FBQyxDQUFBLGtCQUFELENBQW9CLFFBQXBCLENBRlQsQ0FBQTtBQUFBLFVBSUEsS0FBQyxDQUFBLFdBQVcsQ0FBQyxNQUFiLENBQW9CLE1BQXBCLENBSkEsQ0FBQTtpQkFNQSxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQWQsQ0FBdUIsVUFBdkIsRUFSRztTQXJEWTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5CLENBdkNBLENBQUE7QUF3R0EsV0FBTyxJQUFQLENBMUdvQjtFQUFBLENBN0p0QixDQUFBOztBQUFBLHFCQTBRQSxXQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVgsUUFBQSxRQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0IsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsZUFBVixDQUFwQixDQUFBO0FBRUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQWxCLEtBQXdCLFNBQXhCLElBQXFDLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQWxCLEtBQTBCLFNBQWxFO0FBRUUsTUFBQSxJQUFDLENBQUEsV0FBRCxHQUFtQixJQUFBLGdCQUFBLENBQUEsQ0FBbkIsQ0FBQTtBQUFBLE1BRUEsSUFBQyxDQUFBLFdBQVcsQ0FBQyxjQUFiLEdBQThCLElBRjlCLENBQUE7QUFBQSxNQUlBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLG9CQUFWLENBQStCLENBQUMsTUFBaEMsQ0FBdUMsSUFBQyxDQUFBLFdBQVcsQ0FBQyxjQUFiLENBQUEsQ0FBNkIsQ0FBQyxNQUE5QixDQUFBLENBQXNDLENBQUMsRUFBOUUsQ0FKQSxDQUZGO0tBRkE7QUFVQSxJQUFBLElBQUcsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBbEIsS0FBd0IsVUFBM0I7QUFFRSxNQUFBLFFBQUEsR0FBVyxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxrQkFBVixDQUFYLENBQUE7QUFBQSxNQUVBLFFBQVEsQ0FBQyxJQUFULENBQWMsRUFBZCxDQUZBLENBQUE7QUFBQSxNQUlBLElBQUMsQ0FBQSxZQUFELEdBQW9CLElBQUEsWUFBQSxDQUNsQjtBQUFBLFFBQUEsRUFBQSxFQUFJLFFBQUo7T0FEa0IsQ0FKcEIsQ0FBQTtBQUFBLE1BUUEsSUFBQyxDQUFBLFlBQVksQ0FBQyxjQUFkLEdBQStCLElBUi9CLENBQUE7QUFBQSxNQVVBLElBQUMsQ0FBQSxZQUFZLENBQUMsTUFBZCxDQUFBLENBVkEsQ0FGRjtLQVZBO0FBd0JBLFdBQU8sSUFBUCxDQTFCVztFQUFBLENBMVFiLENBQUE7O0FBQUEscUJBdVNBLElBQUEsR0FBTSxTQUFBLEdBQUE7QUFFSixJQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFBLENBQUEsQ0FBQTtBQUVBLFdBQU8sSUFBUCxDQUpJO0VBQUEsQ0F2U04sQ0FBQTs7QUFBQSxxQkE4U0EsSUFBQSxHQUFNLFNBQUEsR0FBQTtBQUVKLElBQUEsQ0FBQSxDQUFFLFlBQUYsQ0FBZSxDQUFDLE9BQWhCLENBQ0U7QUFBQSxNQUFBLFNBQUEsRUFBVyxDQUFYO0tBREYsRUFFQyxDQUZELENBQUEsQ0FBQTtBQUlBLElBQUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFsQixLQUF3QixVQUF4QixJQUFzQyxJQUFDLENBQUEsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFsQixLQUEwQixVQUFuRTtBQUVFLE1BQUEsSUFBQyxDQUFBLE1BQUQsQ0FBQSxDQUFTLENBQUMsR0FBRyxDQUFDLElBQWQsQ0FBQSxDQUFBLENBQUE7QUFBQSxNQUVBLFdBQVcsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLE1BQWxDLENBQUEsQ0FGQSxDQUZGO0tBQUEsTUFNSyxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQWxCLEtBQXdCLFNBQXhCLElBQXFDLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQWxCLEtBQTBCLFNBQWxFO0FBRUgsTUFBQSxJQUFDLENBQUEsTUFBRCxDQUFBLENBQVMsQ0FBQyxHQUFHLENBQUMsSUFBZCxDQUFBLENBQUEsQ0FGRztLQUFBLE1BQUE7QUFNSCxNQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFBLENBQUEsQ0FORztLQVZMO0FBQUEsSUFrQkEsSUFBQyxDQUFBLGNBQUQsR0FBa0IsSUFsQmxCLENBQUE7QUFvQkEsV0FBTyxJQUFQLENBdEJJO0VBQUEsQ0E5U04sQ0FBQTs7QUFBQSxxQkF1VUEsWUFBQSxHQUFjLFNBQUMsQ0FBRCxHQUFBO0FBQ1osSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtXQUVBLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBbEIsQ0FBMEIsV0FBMUIsRUFIWTtFQUFBLENBdlVkLENBQUE7O0FBQUEscUJBNlVBLHFCQUFBLEdBQXVCLFNBQUMsRUFBRCxFQUFLLEtBQUwsRUFBWSxJQUFaLEdBQUE7QUFHckIsUUFBQSw0QkFBQTtBQUFBLElBQUEsVUFBQSxHQUFhLGdCQUFpQixDQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxDQUE5QixDQUFBO0FBQUEsSUFFQSxnQkFBQSxHQUFtQixLQUZuQixDQUFBO0FBSUEsSUFBQSxJQUFHLElBQUEsS0FBUSxTQUFYO0FBRUUsTUFBQSxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFuQixDQUFBO0FBRUEsYUFBTyxJQUFQLENBSkY7S0FKQTtBQUFBLElBVUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxVQUFQLEVBQW1CLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLElBQUQsR0FBQTtBQUVqQixRQUFBLElBQUcsSUFBSSxDQUFDLElBQUwsS0FBYSxVQUFoQjtBQUVFLFVBQUEsSUFBRyxJQUFJLENBQUMsZ0JBQVI7QUFFRSxZQUFBLGdCQUFBLEdBQW1CLElBQW5CLENBQUE7QUFFQSxrQkFBQSxDQUpGO1dBQUE7QUFNQSxVQUFBLElBQUcsSUFBSSxDQUFDLFFBQUwsS0FBaUIsSUFBcEI7QUFFRSxZQUFBLElBQUcsSUFBSSxDQUFDLFFBQUwsS0FBaUIsSUFBcEI7cUJBRUUsZ0JBQUEsR0FBbUIsS0FGckI7YUFGRjtXQUFBLE1BQUE7bUJBUUUsZ0JBQUEsR0FBbUIsS0FSckI7V0FSRjtTQUZpQjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5CLENBVkEsQ0FBQTtBQWdDQSxJQUFBLElBQUcsZ0JBQUEsS0FBb0IsSUFBdkI7QUFFRSxNQUFBLElBQUMsQ0FBQSxlQUFELEdBQW1CLElBQW5CLENBRkY7S0FBQSxNQUlLLElBQUcsSUFBQSxLQUFRLFlBQVIsSUFBd0IsSUFBQSxLQUFRLFVBQW5DO0FBRUgsTUFBQSxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFuQixDQUZHO0tBQUEsTUFJQSxJQUFHLElBQUEsS0FBUSxNQUFYO0FBRUgsTUFBQSxJQUFHLElBQUMsQ0FBQSxXQUFKO0FBRUUsUUFBQSxDQUFDLENBQUMsSUFBRixDQUFPLFVBQVAsRUFBbUIsQ0FBQSxTQUFBLEtBQUEsR0FBQTtpQkFBQSxTQUFDLElBQUQsR0FBQTtBQUVqQixZQUFBLElBQUcsSUFBSSxDQUFDLElBQUwsS0FBYSxNQUFoQjtBQUVFLGNBQUEsSUFBRyxJQUFJLENBQUMsUUFBTCxLQUFpQixJQUFwQjtBQUVFLGdCQUFBLElBQUcsSUFBSSxDQUFDLEtBQUwsS0FBYyxFQUFqQjt5QkFFRSxnQkFBQSxHQUFtQixLQUZyQjtpQkFBQSxNQUFBO3lCQU1FLGdCQUFBLEdBQW1CLE1BTnJCO2lCQUZGO2VBRkY7YUFGaUI7VUFBQSxFQUFBO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFuQixDQUFBLENBQUE7QUFnQkEsUUFBQSxJQUFHLGdCQUFIO0FBRUUsVUFBQSxJQUFDLENBQUEsZUFBRCxHQUFtQixJQUFuQixDQUZGO1NBQUEsTUFBQTtBQU1FLFVBQUEsSUFBQyxDQUFBLGVBQUQsR0FBbUIsS0FBbkIsQ0FORjtTQWhCQTtBQUFBLFFBd0JBLElBQUMsQ0FBQSxZQUFELENBQUEsQ0F4QkEsQ0FGRjtPQUZHO0tBQUEsTUFBQTtBQWdDSCxNQUFBLElBQUMsQ0FBQSxlQUFELEdBQW1CLEtBQW5CLENBaENHO0tBeENMO0FBQUEsSUEwRUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixlQUExQixFQUEyQyxJQUEzQyxDQTFFQSxDQUFBO0FBNEVBLFdBQU8sSUFBUCxDQS9FcUI7RUFBQSxDQTdVdkIsQ0FBQTs7QUFBQSxxQkErWkEsWUFBQSxHQUFjLFNBQUEsR0FBQTtBQUVaLElBQUEsSUFBQSxDQUFBLENBQU8sSUFBQyxDQUFBLFdBQUQsSUFBZ0IsSUFBQyxDQUFBLFVBQXhCLENBQUE7QUFFRSxhQUFPLEtBQVAsQ0FGRjtLQUFBO0FBSUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxXQUFKO0FBRUUsTUFBQSxJQUFHLElBQUMsQ0FBQSxlQUFELElBQXFCLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBeEI7ZUFFRSxJQUFDLENBQUEsWUFBWSxDQUFDLFdBQWQsQ0FBMEIsVUFBMUIsRUFGRjtPQUFBLE1BQUE7ZUFNRSxJQUFDLENBQUEsWUFBWSxDQUFDLFFBQWQsQ0FBdUIsVUFBdkIsRUFORjtPQUZGO0tBTlk7RUFBQSxDQS9aZCxDQUFBOztBQUFBLHFCQWdiQSxpQkFBQSxHQUFtQixTQUFDLEVBQUQsRUFBSyxLQUFMLEVBQVksS0FBWixHQUFBO0FBRWpCLFFBQUEsU0FBQTtBQUFBLElBQUEsU0FBQSxHQUFZLGdCQUFpQixDQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxDQUFXLENBQUEsRUFBQSxDQUFHLENBQUMsSUFBNUMsQ0FBQTtBQUFBLElBRUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxFQUFBLENBQUcsQ0FBQyxPQUFRLENBQUEsS0FBQSxDQUFNLENBQUMsUUFBL0MsR0FBMEQsS0FGMUQsQ0FBQTtBQUFBLElBSUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxFQUFBLENBQUcsQ0FBQyxLQUFoQyxHQUF3QyxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsQ0FBVyxDQUFBLEVBQUEsQ0FBRyxDQUFDLE9BQVEsQ0FBQSxLQUFBLENBQU0sQ0FBQyxLQUp2RixDQUFBO0FBQUEsSUFNQSxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsQ0FBVyxDQUFBLEVBQUEsQ0FBRyxDQUFDLGFBQWhDLEdBQWdELGdCQUFpQixDQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxDQUFXLENBQUEsRUFBQSxDQUFHLENBQUMsT0FBUSxDQUFBLEtBQUEsQ0FBTSxDQUFDLGFBTi9GLENBQUE7V0FRQSxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsQ0FBVyxDQUFBLEVBQUEsQ0FBRyxDQUFDLFFBQWhDLEdBQTJDLE1BVjFCO0VBQUEsQ0FoYm5CLENBQUE7O0FBQUEscUJBOGJBLFlBQUEsR0FBYyxTQUFDLEVBQUQsRUFBSyxLQUFMLEVBQVksVUFBWixFQUF3QixPQUF4QixHQUFBO0FBRVosUUFBQSxxRUFBQTtBQUFBLElBQUEsSUFBRyxVQUFIO0FBRUUsTUFBQSxTQUFBLEdBQVksZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxPQUFBLENBQVMsQ0FBQSxFQUFBLENBQUcsQ0FBQyxJQUFyRCxDQUFBO0FBQUEsTUFFQSxXQUFBLEdBQWMsS0FGZCxDQUZGO0tBQUEsTUFBQTtBQVFFLE1BQUEsU0FBQSxHQUFZLGdCQUFpQixDQUFBLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxDQUFXLENBQUEsRUFBQSxDQUFHLENBQUMsSUFBNUMsQ0FBQTtBQUFBLE1BRUEsV0FBQSxHQUFjLEtBQUEsSUFBUyxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsQ0FBVyxDQUFBLEVBQUEsQ0FBRyxDQUFDLFNBRnZELENBUkY7S0FBQTtBQUFBLElBYUEsbUJBQUEsR0FBc0IsS0FidEIsQ0FBQTtBQUFBLElBZUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxnQkFBaUIsQ0FBQSxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsQ0FBeEIsRUFBb0MsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsU0FBRCxHQUFBO0FBRWxDLFFBQUEsSUFBRyxTQUFTLENBQUMsU0FBYjtpQkFFRSxtQkFBQSxHQUFzQixLQUZ4QjtTQUZrQztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXBDLENBZkEsQ0FBQTtBQUFBLElBdUJBLEdBQUEsR0FFRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFNBQU47QUFBQSxNQUVBLEVBQUEsRUFBSSxFQUZKO0FBQUEsTUFJQSxLQUFBLEVBQU8sS0FKUDtLQXpCRixDQUFBO0FBK0JBLElBQUEsSUFBRyxTQUFBLEtBQWEsVUFBYixJQUEyQixTQUFBLEtBQWEsVUFBM0M7QUFFRSxNQUFBLElBQUcsS0FBQSxLQUFTLElBQVo7QUFFRSxRQUFBLElBQUcsVUFBSDtBQUVFLFVBQUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxPQUFBLENBQVMsQ0FBQSxFQUFBLENBQUcsQ0FBQyxRQUF6QyxHQUFvRCxJQUFwRCxDQUZGO1NBQUEsTUFBQTtBQU1FLFVBQUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxFQUFBLENBQUcsQ0FBQyxRQUFoQyxHQUEyQyxJQUEzQyxDQU5GO1NBQUE7QUFRQSxRQUFBLElBQUcsbUJBQUEsSUFBdUIsQ0FBQSxXQUExQjtBQUVFLFVBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsZ0RBQVYsQ0FBMkQsQ0FBQyxRQUE1RCxDQUFxRSxjQUFyRSxDQUFvRixDQUFDLFdBQXJGLENBQWlHLFVBQWpHLENBQUEsQ0FGRjtTQUFBLE1BSUssSUFBRyxXQUFIO0FBRUgsVUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSx5QkFBVixDQUFvQyxDQUFDLEdBQXJDLENBQXlDLGdEQUF6QyxDQUEwRixDQUFDLFFBQTNGLENBQW9HLGNBQXBHLENBQW1ILENBQUMsV0FBcEgsQ0FBZ0ksVUFBaEksQ0FBQSxDQUZHO1NBWkw7QUFnQkEsUUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsRUFBUCxLQUFhLHNCQUFoQjtBQUVFLFVBQUEsV0FBVyxDQUFDLFFBQVEsQ0FBQyxxQkFBckIsQ0FBMkMsS0FBM0MsRUFBa0QsRUFBbEQsQ0FBQSxDQUZGO1NBbEJGO09BQUEsTUFBQTtBQXdCRSxRQUFBLElBQUcsVUFBSDtBQUVFLFVBQUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxPQUFBLENBQVMsQ0FBQSxFQUFBLENBQUcsQ0FBQyxRQUF6QyxHQUFvRCxLQUFwRCxDQUZGO1NBQUEsTUFBQTtBQU1FLFVBQUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxFQUFBLENBQUcsQ0FBQyxRQUFoQyxHQUEyQyxLQUEzQyxDQU5GO1NBQUE7QUFRQSxRQUFBLElBQUcsbUJBQUEsSUFBdUIsQ0FBQSxXQUExQjtBQUVFLFVBQUEsbUJBQUEsR0FBc0IsSUFBdEIsQ0FBQTtBQUFBLFVBRUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUseUJBQVYsQ0FBb0MsQ0FBQyxJQUFyQyxDQUEwQyxTQUFBLEdBQUE7QUFFeEMsWUFBQSxJQUFHLENBQUEsQ0FBQyxDQUFFLElBQUYsQ0FBTyxDQUFDLElBQVIsQ0FBYSxnQkFBYixDQUFELElBQW1DLENBQUEsQ0FBRSxJQUFGLENBQU8sQ0FBQyxRQUFSLENBQWlCLFNBQWpCLENBQXRDO3FCQUVFLG1CQUFBLEdBQXNCLE1BRnhCO2FBRndDO1VBQUEsQ0FBMUMsQ0FGQSxDQUFBO0FBVUEsVUFBQSxJQUFHLG1CQUFIO0FBRUUsWUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxnREFBVixDQUEyRCxDQUFDLFdBQTVELENBQXdFLGNBQXhFLENBQXVGLENBQUMsUUFBeEYsQ0FBaUcsVUFBakcsQ0FBQSxDQUZGO1dBQUEsTUFBQTtBQU1FLFlBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVUsZ0RBQVYsQ0FBMkQsQ0FBQyxRQUE1RCxDQUFxRSxjQUFyRSxDQUFvRixDQUFDLFdBQXJGLENBQWlHLFVBQWpHLENBQUEsQ0FORjtXQVpGO1NBQUEsTUFvQkssSUFBRyxXQUFIO0FBRUgsVUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSx5QkFBVixDQUFvQyxDQUFDLEdBQXJDLENBQXlDLGdEQUF6QyxDQUEwRixDQUFDLFdBQTNGLENBQXVHLGNBQXZHLENBQXNILENBQUMsUUFBdkgsQ0FBZ0ksVUFBaEksQ0FBQSxDQUZHO1NBNUJMO0FBZ0NBLFFBQUEsSUFBRyxJQUFDLENBQUEsS0FBSyxDQUFDLEVBQVAsS0FBYSxzQkFBaEI7QUFFRSxVQUFBLFdBQVcsQ0FBQyxRQUFRLENBQUMscUJBQXJCLENBQTJDLFFBQTNDLEVBQXFELEVBQXJELENBQUEsQ0FGRjtTQXhERjtPQUZGO0tBQUEsTUE4REssSUFBRyxTQUFBLEtBQWEsTUFBYixJQUF1QixTQUFBLEtBQWEsU0FBdkM7QUFFSCxNQUFBLElBQUcsVUFBSDtBQUVFLFFBQUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxPQUFBLENBQVMsQ0FBQSxFQUFBLENBQUcsQ0FBQyxLQUF6QyxHQUFpRCxLQUFqRCxDQUZGO09BQUEsTUFBQTtBQU1FLFFBQUEsZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxFQUFQLENBQVcsQ0FBQSxFQUFBLENBQUcsQ0FBQyxLQUFoQyxHQUF3QyxLQUF4QyxDQU5GO09BRkc7S0E3Rkw7QUF3R0EsV0FBTyxJQUFQLENBMUdZO0VBQUEsQ0E5YmQsQ0FBQTs7QUFBQSxxQkEyaUJBLFFBQUEsR0FBVSxTQUFDLENBQUQsR0FBQTtBQUVSLElBQUEsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsV0FBcEIsQ0FBZ0MsU0FBaEMsQ0FBQSxDQUFBO0FBQUEsSUFFQSxDQUFBLENBQUUsdUJBQUYsQ0FBMEIsQ0FBQyxXQUEzQixDQUF1QyxVQUF2QyxDQUZBLENBQUE7V0FJQSxDQUFBLENBQUUsTUFBRixDQUFTLENBQUMsV0FBVixDQUFzQixVQUF0QixFQU5RO0VBQUEsQ0EzaUJWLENBQUE7O2tCQUFBOztHQUhzQyxLQTFDeEMsQ0FBQTs7Ozs7QUNKQSxJQUFBLHFIQUFBO0VBQUE7aVNBQUE7O0FBQUEsV0FBQSxHQUFjLE9BQUEsQ0FBUyxRQUFULENBQWQsQ0FBQTs7QUFBQSxJQUdBLEdBQU8sT0FBQSxDQUFRLHNCQUFSLENBSFAsQ0FBQTs7QUFBQSxlQUtBLEdBQWtCLE9BQUEsQ0FBUSxxREFBUixDQUxsQixDQUFBOztBQUFBLGVBT0EsR0FBa0IsT0FBQSxDQUFRLCtDQUFSLENBUGxCLENBQUE7O0FBQUEscUJBU0EsR0FBd0IsT0FBQSxDQUFRLGtEQUFSLENBVHhCLENBQUE7O0FBQUEsZUFXQSxHQUFrQixPQUFBLENBQVEscURBQVIsQ0FYbEIsQ0FBQTs7QUFBQSxVQWFBLEdBQWEsT0FBQSxDQUFRLDBCQUFSLENBYmIsQ0FBQTs7QUFBQSxNQWdCTSxDQUFDLE9BQVAsR0FBdUI7QUFFckIsaUNBQUEsQ0FBQTs7OztHQUFBOztBQUFBLHlCQUFBLEVBQUEsR0FBSSxDQUFBLENBQUUsaUJBQUYsQ0FBSixDQUFBOztBQUFBLHlCQUVBLFNBQUEsR0FBVyw0RUFGWCxDQUFBOztBQUFBLHlCQU1BLFdBQUEsR0FBYSxtQkFOYixDQUFBOztBQUFBLHlCQVFBLG1CQUFBLEdBQXFCLEVBUnJCLENBQUE7O0FBQUEseUJBVUEsb0JBQUEsR0FBc0IsQ0FWdEIsQ0FBQTs7QUFBQSx5QkFZQSxtQkFBQSxHQUFxQixFQVpyQixDQUFBOztBQUFBLHlCQWNBLGVBQUEsR0FBaUIsQ0FBQyxPQUFELEVBQVUsT0FBVixDQWRqQixDQUFBOztBQUFBLHlCQWdCQSxvQkFBQSxHQUFzQixFQWhCdEIsQ0FBQTs7QUFBQSx5QkFrQkEsTUFBQSxHQUFRLENBbEJSLENBQUE7O0FBQUEseUJBb0JBLFlBQUEsR0FBYyxDQXBCZCxDQUFBOztBQUFBLHlCQXNCQSxXQUFBLEdBQWEsRUF0QmIsQ0FBQTs7QUFBQSx5QkF3QkEsZ0JBQUEsR0FBa0IsRUF4QmxCLENBQUE7O0FBQUEseUJBMEJBLGtCQUFBLEdBQW9CLENBMUJwQixDQUFBOztBQUFBLHlCQTRCQSxZQUFBLEdBQWMsQ0FBQyxLQUFELEVBQU8sS0FBUCxFQUFhLEtBQWIsRUFBbUIsS0FBbkIsRUFBeUIsS0FBekIsRUFBK0IsS0FBL0IsRUFBcUMsS0FBckMsQ0E1QmQsQ0FBQTs7QUFBQSx5QkE4QkEsVUFBQSxHQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sRUFBUDtHQS9CRixDQUFBOztBQUFBLHlCQWlDQSxRQUFBLEdBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTyxFQUFQO0dBbENGLENBQUE7O0FBQUEseUJBb0NBLGVBQUEsR0FDRTtBQUFBLElBQUEsS0FBQSxFQUFPLEVBQVA7R0FyQ0YsQ0FBQTs7QUFBQSx5QkF1Q0EsYUFBQSxHQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sRUFBUDtHQXhDRixDQUFBOztBQUFBLHlCQTBDQSxVQUFBLEdBQVksU0FBQSxHQUFBO0FBRVYsSUFBQSxDQUFBLENBQUUsb0JBQUYsQ0FBdUIsQ0FBQyxVQUF4QixDQUVFO0FBQUEsTUFBQSxVQUFBLEVBQVksVUFBWjtBQUFBLE1BRUEsY0FBQSxFQUFnQixJQUZoQjtBQUFBLE1BSUEsUUFBQSxFQUFVLENBSlY7S0FGRixDQVFDLENBQUMsSUFSRixDQVFPLE1BUlAsRUFRYyxNQVJkLENBQUEsQ0FBQTtBQUFBLElBVUEsSUFBQyxDQUFBLGNBQUQsR0FBa0IsQ0FBQSxDQUFFLGdCQUFGLENBVmxCLENBQUE7QUFBQSxJQVlBLElBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBRUU7QUFBQSxNQUFBLFVBQUEsRUFBWSxVQUFaO0FBQUEsTUFFQSxRQUFBLEVBQVUsQ0FGVjtBQUFBLE1BSUEsUUFBQSxFQUFVLHFCQUpWO0FBQUEsTUFNQSxRQUFBLEVBQVUsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUEsR0FBQTtBQUVSLFVBQUEsS0FBQyxDQUFBLG9CQUFELEdBQXdCLEtBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBQWlDLFVBQWpDLENBQXhCLENBQUE7aUJBRUEsS0FBQyxDQUFBLGNBQUQsQ0FBQSxFQUpRO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FOVjtLQUZGLENBWkEsQ0FBQTtBQUFBLElBMkJBLElBQUMsQ0FBQSxnQkFBRCxHQUFvQixDQUFBLENBQUUsa0JBQUYsQ0EzQnBCLENBQUE7QUFBQSxJQTZCQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0IsQ0FBQSxDQUFFLGtCQUFGLENBN0JwQixDQUFBO0FBQUEsSUErQkEsSUFBQyxDQUFBLGNBQUQsR0FBa0IsQ0FBQSxDQUFFLGdCQUFGLENBL0JsQixDQUFBO0FBQUEsSUFpQ0EsSUFBQyxDQUFBLGNBQUQsR0FBa0IsQ0FBQSxDQUFFLGdCQUFGLENBakNsQixDQUFBO0FBQUEsSUFtQ0EsSUFBQyxDQUFBLFlBQUQsR0FBa0IsQ0FBQSxDQUFFLGNBQUYsQ0FuQ2xCLENBQUE7QUFBQSxJQXFDQSxJQUFDLENBQUEsYUFBRCxHQUFpQixDQUFBLENBQUUsbUJBQUYsQ0FyQ2pCLENBQUE7QUFBQSxJQXVDQSxJQUFDLENBQUEsaUJBQUQsR0FBcUIsQ0FBQSxDQUFFLG9CQUFGLENBdkNyQixDQUFBO0FBQUEsSUF5Q0EsSUFBQyxDQUFBLElBQUQsR0FBUSxFQXpDUixDQUFBO0FBQUEsSUEyQ0EsSUFBQyxDQUFBLElBQUQsR0FBUSxXQUFXLENBQUMsWUEzQ3BCLENBQUE7QUFBQSxJQTZDQSxJQUFDLENBQUEsT0FBRCxHQUFXLFdBQVcsQ0FBQyxlQTdDdkIsQ0FBQTtBQUFBLElBK0NBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEVBQXBCLENBQXVCLFFBQXZCLEVBQWlDLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsR0FBQTtlQUMvQixLQUFDLENBQUEsZUFBRCxDQUFpQixDQUFqQixFQUQrQjtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWpDLENBL0NBLENBQUE7QUFBQSxJQWtEQSxDQUFBLENBQUUsY0FBRixDQUFpQixDQUFDLEVBQWxCLENBQXFCLFFBQXJCLEVBQStCLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsR0FBQTtlQUM3QixLQUFDLENBQUEsYUFBRCxDQUFlLENBQWYsRUFENkI7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUEvQixDQWxEQSxDQUFBO0FBQUEsSUFxREEsQ0FBQSxDQUFFLGtCQUFGLENBQXFCLENBQUMsRUFBdEIsQ0FBeUIsUUFBekIsRUFBbUMsQ0FBQSxTQUFBLEtBQUEsR0FBQTthQUFBLFNBQUMsQ0FBRCxHQUFBO2VBQ2pDLEtBQUMsQ0FBQSxpQkFBRCxDQUFtQixDQUFuQixFQURpQztNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5DLENBckRBLENBQUE7QUFBQSxJQXdEQSxDQUFBLENBQUUsZ0JBQUYsQ0FBbUIsQ0FBQyxFQUFwQixDQUF1QixRQUF2QixFQUFpQyxDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxDQUFELEdBQUE7ZUFDL0IsS0FBQyxDQUFBLGVBQUQsQ0FBaUIsQ0FBakIsRUFEK0I7TUFBQSxFQUFBO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFqQyxDQXhEQSxDQUFBO0FBQUEsSUEyREEsQ0FBQSxDQUFFLGNBQUYsQ0FBaUIsQ0FBQyxFQUFsQixDQUFxQixRQUFyQixFQUErQixDQUFBLFNBQUEsS0FBQSxHQUFBO2FBQUEsU0FBQyxDQUFELEdBQUE7ZUFDN0IsS0FBQyxDQUFBLFdBQUQsQ0FBYSxDQUFiLEVBRDZCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0IsQ0EzREEsQ0FBQTtBQUFBLElBOERBLENBQUEsQ0FBRSxnQkFBRixDQUFtQixDQUFDLEVBQXBCLENBQXVCLE9BQXZCLEVBQWdDLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLENBQUQsR0FBQTtlQUM5QixDQUFBLENBQUUsV0FBRixDQUFjLENBQUMsT0FBZixDQUNFO0FBQUEsVUFBQSxTQUFBLEVBQVcsQ0FBQSxDQUFFLGdCQUFGLENBQW1CLENBQUMsTUFBcEIsQ0FBQSxDQUE0QixDQUFDLEdBQTdCLEdBQW1DLEdBQTlDO1NBREYsRUFFRSxHQUZGLEVBRDhCO01BQUEsRUFBQTtJQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEMsQ0E5REEsQ0FBQTtXQW1FQSxJQUFDLENBQUEsTUFBRCxDQUFBLEVBckVVO0VBQUEsQ0ExQ1osQ0FBQTs7QUFBQSx5QkFpSEEsV0FBQSxHQUFhLFNBQUMsQ0FBRCxHQUFBO0FBRVgsUUFBQSxtQkFBQTtBQUFBLElBQUEsT0FBQSxHQUFVLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUFWLENBQUE7QUFBQSxJQUVBLEdBQUEsR0FBTSxPQUFPLENBQUMsSUFBUixDQUFhLElBQWIsQ0FGTixDQUFBO0FBQUEsSUFJQSxLQUFBLEdBQVEsUUFBQSxDQUFTLE9BQU8sQ0FBQyxHQUFSLENBQUEsQ0FBVCxDQUpSLENBQUE7QUFNQSxJQUFBLElBQUcsT0FBTyxDQUFDLEVBQVIsQ0FBVyxVQUFYLENBQUg7QUFFRSxNQUFBLElBQUMsQ0FBQSxZQUFhLENBQUEsS0FBQSxDQUFkLEdBQXVCLElBQXZCLENBRkY7S0FBQSxNQUFBO0FBTUUsTUFBQSxJQUFDLENBQUEsWUFBYSxDQUFBLEtBQUEsQ0FBZCxHQUF1QixLQUF2QixDQU5GO0tBTkE7QUFBQSxJQWNBLFVBQVUsQ0FBQyxjQUFjLENBQUMsaUJBQTFCLEdBQThDLElBQUMsQ0FBQSxZQWQvQyxDQUFBO0FBZ0JBLElBQUEsSUFBRyxJQUFDLENBQUEsVUFBVSxDQUFDLEtBQVosS0FBcUIsRUFBckIsSUFBMkIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEtBQW1CLEVBQWpEO0FBQ0UsTUFBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsSUFBQyxDQUFBLFlBQVgsRUFBeUIsSUFBekIsQ0FBQSxLQUFrQyxDQUFBLENBQXJDO0FBQ0UsUUFBQSxDQUFBLENBQUUsd0JBQUYsQ0FBMkIsQ0FBQyxRQUE1QixDQUFxQyxNQUFyQyxDQUFBLENBREY7T0FBQSxNQUFBO0FBR0UsUUFBQSxDQUFBLENBQUUsd0JBQUYsQ0FBMkIsQ0FBQyxXQUE1QixDQUF3QyxNQUF4QyxDQUFBLENBSEY7T0FERjtLQUFBLE1BQUE7QUFPRSxNQUFBLENBQUEsQ0FBRSx3QkFBRixDQUEyQixDQUFDLFdBQTVCLENBQXdDLE1BQXhDLENBQUEsQ0FQRjtLQWhCQTtXQXlCQSxJQUFDLENBQUEsY0FBRCxDQUFBLEVBM0JXO0VBQUEsQ0FqSGIsQ0FBQTs7QUFBQSx5QkErSUEsZUFBQSxHQUFpQixTQUFDLENBQUQsR0FBQTtBQUVmLFFBQUEsMkZBQUE7QUFBQSxJQUFBLEtBQUEsR0FBUSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxHQUFuQixDQUFBLENBQUEsSUFBNEIsRUFBcEMsQ0FBQTtBQUVBLElBQUEsSUFBRyxLQUFBLEtBQVMsRUFBWjtBQUVFLE1BQUEsSUFBQyxDQUFBLGFBQUQsR0FFRTtBQUFBLFFBQUEsS0FBQSxFQUFPLEVBQVA7T0FGRixDQUFBO0FBSUEsWUFBQSxDQU5GO0tBRkE7QUFBQSxJQVVBLFVBQUEsR0FBYSxNQUFBLENBQU8sS0FBUCxDQVZiLENBQUE7QUFBQSxJQVlBLElBQUEsR0FBTyxVQUFVLENBQUMsTUFBWCxDQUFBLENBWlAsQ0FBQTtBQUFBLElBY0EsSUFBQyxDQUFBLGVBQUQsR0FFRTtBQUFBLE1BQUEsTUFBQSxFQUFRLFVBQVI7QUFBQSxNQUVBLElBQUEsRUFBTSxJQUZOO0FBQUEsTUFJQSxLQUFBLEVBQU8sS0FKUDtBQUFBLE1BTUEsSUFBQSxFQUFNLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FOTjtBQUFBLE1BUUEsT0FBQSxFQUVFO0FBQUEsUUFBQSxNQUFBLEVBQVEsVUFBVSxDQUFDLElBQVgsQ0FBZ0IsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQUFoQixDQUFrQyxDQUFDLE9BQW5DLENBQTJDLENBQTNDLENBQVI7QUFBQSxRQUVBLElBQUEsRUFBTSxVQUFVLENBQUMsSUFBWCxDQUFnQixVQUFVLENBQUMsSUFBWCxDQUFBLENBQWhCLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsQ0FBM0MsQ0FBNkMsQ0FBQyxNQUE5QyxDQUFBLENBRk47QUFBQSxRQUlBLEtBQUEsRUFBTyxVQUFVLENBQUMsSUFBWCxDQUFnQixVQUFVLENBQUMsSUFBWCxDQUFBLENBQWhCLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsQ0FBM0MsQ0FBNkMsQ0FBQyxNQUE5QyxDQUFxRCxZQUFyRCxDQUpQO09BVkY7S0FoQkYsQ0FBQTtBQUFBLElBZ0NBLE9BQUEsR0FBVSxDQWhDVixDQUFBO0FBa0NBLElBQUEsSUFBRyxJQUFDLENBQUEsZUFBZSxDQUFDLElBQWpCLEtBQXlCLENBQTVCO0FBRUUsTUFBQSxPQUFBLEdBQVUsQ0FBVixDQUZGO0tBbENBO0FBQUEsSUFzQ0EsT0FBQSxHQUFVLFVBQVUsQ0FBQyxPQUFYLENBQW1CLEVBQUEsR0FBRSxDQUFDLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FBQSxHQUFrQixPQUFuQixDQUFGLEdBQTZCLFFBQWhELENBdENWLENBQUE7QUF3Q0EsSUFBQSxJQUFHLE9BQUg7QUFFRSxNQUFBLGFBQUEsR0FBZ0IsRUFBQSxHQUFFLENBQUMsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQUFELENBQUYsR0FBcUIsR0FBckIsR0FBd0IsSUFBQyxDQUFBLGVBQWdCLENBQUEsQ0FBQSxDQUF6RCxDQUZGO0tBQUEsTUFBQTtBQU1FLE1BQUEsYUFBQSxHQUFnQixFQUFBLEdBQUUsQ0FBQyxVQUFVLENBQUMsSUFBWCxDQUFBLENBQUEsR0FBa0IsT0FBbkIsQ0FBRixHQUE2QixHQUE3QixHQUFnQyxJQUFDLENBQUEsZUFBZ0IsQ0FBQSxDQUFBLENBQWpFLENBTkY7S0F4Q0E7QUFnREEsSUFBQSxJQUFHLE9BQUg7QUFFRSxNQUFBLGlCQUFBLEdBQW9CLEVBQUEsR0FBSyxJQUFDLENBQUEsZUFBZSxDQUFDLElBQXRCLEdBQTZCLElBQUMsQ0FBQSxtQkFBbEQsQ0FGRjtLQUFBLE1BQUE7QUFNRSxNQUFBLGlCQUFBLEdBQW9CLE1BQUEsQ0FBTyxhQUFQLENBQXFCLENBQUMsSUFBdEIsQ0FBQSxDQUFBLEdBQStCLElBQUMsQ0FBQSxlQUFlLENBQUMsSUFBaEQsR0FBdUQsSUFBQyxDQUFBLG1CQUE1RSxDQU5GO0tBaERBO0FBQUEsSUF5REEsSUFBQyxDQUFBLFlBQVksQ0FBQyxHQUFkLENBQWtCLGFBQWxCLENBQWdDLENBQUMsT0FBakMsQ0FBeUMsUUFBekMsQ0F6REEsQ0FBQTtBQUFBLElBMkRBLElBQUMsQ0FBQSxnQkFBZ0IsQ0FBQyxHQUFsQixDQUFzQixLQUF0QixDQUE0QixDQUFDLE9BQTdCLENBQXFDLFFBQXJDLENBM0RBLENBQUE7QUE2REEsSUFBQSxJQUFHLGlCQUFIO0FBRUUsTUFBQSxjQUFBLEdBQWlCLE1BQUEsQ0FBTyxLQUFQLENBQWEsQ0FBQyxNQUFkLENBQUEsQ0FBakIsQ0FBQTtBQUFBLE1BRUEsY0FBYyxDQUFDLE9BQWYsQ0FBdUIsQ0FBQSxHQUFFLElBQUMsQ0FBQSxtQkFBMUIsQ0FGQSxDQUFBO0FBQUEsTUFJQSxJQUFDLENBQUEsY0FBYyxDQUFDLEdBQWhCLENBQW9CLE1BQUEsQ0FBTyxjQUFQLENBQXNCLENBQUMsTUFBdkIsQ0FBOEIsWUFBOUIsQ0FBcEIsQ0FBZ0UsQ0FBQyxPQUFqRSxDQUF5RSxRQUF6RSxDQUpBLENBRkY7S0FBQSxNQUFBO0FBVUUsTUFBQSxJQUFDLENBQUEsY0FBYyxDQUFDLEdBQWhCLENBQW9CLGFBQXBCLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsUUFBM0MsQ0FBQSxDQVZGO0tBN0RBO0FBQUEsSUF5RUEsSUFBQyxDQUFBLGNBQWMsQ0FBQyxnQkFBaEIsQ0FBaUMsWUFBakMsRUFBK0MsUUFBL0MsQ0F6RUEsQ0FGZTtFQUFBLENBL0lqQixDQUFBOztBQUFBLHlCQThOQSxhQUFBLEdBQWUsU0FBQyxDQUFELEdBQUE7QUFFYixRQUFBLHVCQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQWtCLENBQUMsR0FBbkIsQ0FBQSxDQUFBLElBQTRCLEVBQXBDLENBQUE7QUFFQSxJQUFBLElBQUcsS0FBQSxLQUFTLEVBQVo7QUFFRSxNQUFBLElBQUMsQ0FBQSxlQUFELEdBRUU7QUFBQSxRQUFBLEtBQUEsRUFBTyxFQUFQO09BRkYsQ0FBQTtBQUlBLFlBQUEsQ0FORjtLQUZBO0FBQUEsSUFVQSxVQUFBLEdBQWEsTUFBQSxDQUFPLEtBQVAsQ0FWYixDQUFBO0FBQUEsSUFZQSxJQUFBLEdBQU8sVUFBVSxDQUFDLE1BQVgsQ0FBQSxDQVpQLENBQUE7QUFBQSxJQWNBLElBQUMsQ0FBQSxhQUFELEdBRUU7QUFBQSxNQUFBLE1BQUEsRUFBUSxVQUFSO0FBQUEsTUFFQSxJQUFBLEVBQU0sSUFGTjtBQUFBLE1BSUEsS0FBQSxFQUFPLEtBSlA7QUFBQSxNQU1BLElBQUEsRUFBTSxVQUFVLENBQUMsSUFBWCxDQUFBLENBTk47QUFBQSxNQVFBLE9BQUEsRUFFRTtBQUFBLFFBQUEsTUFBQSxFQUFRLFVBQVUsQ0FBQyxJQUFYLENBQWdCLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FBaEIsQ0FBa0MsQ0FBQyxPQUFuQyxDQUEyQyxDQUEzQyxDQUFSO0FBQUEsUUFFQSxJQUFBLEVBQU0sVUFBVSxDQUFDLElBQVgsQ0FBZ0IsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQUFoQixDQUFrQyxDQUFDLE9BQW5DLENBQTJDLENBQTNDLENBQTZDLENBQUMsTUFBOUMsQ0FBQSxDQUZOO0FBQUEsUUFJQSxLQUFBLEVBQU8sVUFBVSxDQUFDLElBQVgsQ0FBZ0IsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQUFoQixDQUFrQyxDQUFDLE9BQW5DLENBQTJDLENBQTNDLENBQTZDLENBQUMsTUFBOUMsQ0FBcUQsWUFBckQsQ0FKUDtPQVZGO0tBaEJGLENBQUE7QUFBQSxJQWdDQSxJQUFDLENBQUEsY0FBYyxDQUFDLEdBQWhCLENBQW9CLEtBQXBCLENBQTBCLENBQUMsT0FBM0IsQ0FBbUMsUUFBbkMsQ0FoQ0EsQ0FBQTtBQUFBLElBa0NBLElBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBQWlDLFlBQWpDLEVBQStDLFFBQS9DLENBbENBLENBRmE7RUFBQSxDQTlOZixDQUFBOztBQUFBLHlCQXNRQSxpQkFBQSxHQUFtQixTQUFDLENBQUQsR0FBQTtBQUVqQixRQUFBLHdEQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQWtCLENBQUMsR0FBbkIsQ0FBQSxDQUFBLElBQTRCLEVBQXBDLENBQUE7QUFFQSxJQUFBLElBQUcsS0FBQSxLQUFTLEVBQVo7QUFFRSxNQUFBLElBQUMsQ0FBQSxVQUFELEdBRUU7QUFBQSxRQUFBLEtBQUEsRUFBTyxFQUFQO09BRkYsQ0FBQTtBQUFBLE1BSUEsSUFBQyxDQUFBLGNBQWMsQ0FBQyxHQUFoQixDQUFvQixFQUFwQixDQUF1QixDQUFDLE9BQXhCLENBQWdDLFFBQWhDLENBSkEsQ0FBQTtBQUFBLE1BTUEsSUFBQyxDQUFBLHFCQUFELENBQUEsQ0FOQSxDQUFBO0FBUUEsYUFBTyxJQUFDLENBQUEsY0FBUixDQVZGO0tBRkE7QUFBQSxJQWNBLFVBQUEsR0FBYSxNQUFBLENBQU8sS0FBUCxDQWRiLENBQUE7QUFBQSxJQWdCQSxJQUFBLEdBQU8sVUFBVSxDQUFDLE1BQVgsQ0FBQSxDQWhCUCxDQUFBO0FBQUEsSUFrQkEsSUFBQyxDQUFBLFVBQUQsR0FFRTtBQUFBLE1BQUEsTUFBQSxFQUFRLFVBQVI7QUFBQSxNQUVBLElBQUEsRUFBTSxJQUZOO0FBQUEsTUFJQSxLQUFBLEVBQU8sS0FKUDtBQUFBLE1BTUEsSUFBQSxFQUFNLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FOTjtBQUFBLE1BUUEsT0FBQSxFQUVFO0FBQUEsUUFBQSxNQUFBLEVBQVEsVUFBVSxDQUFDLElBQVgsQ0FBZ0IsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQUFoQixDQUFrQyxDQUFDLE9BQW5DLENBQTJDLENBQTNDLENBQVI7QUFBQSxRQUVBLElBQUEsRUFBTSxVQUFVLENBQUMsSUFBWCxDQUFnQixVQUFVLENBQUMsSUFBWCxDQUFBLENBQWhCLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsQ0FBM0MsQ0FBNkMsQ0FBQyxNQUE5QyxDQUFBLENBRk47QUFBQSxRQUlBLEtBQUEsRUFBTyxVQUFVLENBQUMsSUFBWCxDQUFnQixVQUFVLENBQUMsSUFBWCxDQUFBLENBQWhCLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsQ0FBM0MsQ0FBNkMsQ0FBQyxNQUE5QyxDQUFxRCxZQUFyRCxDQUpQO09BVkY7S0FwQkYsQ0FBQTtBQUFBLElBb0NBLE9BQUEsR0FBVSxDQXBDVixDQUFBO0FBc0NBLElBQUEsSUFBRyxJQUFDLENBQUEsVUFBVSxDQUFDLElBQVosS0FBb0IsQ0FBdkI7QUFFRSxNQUFBLE9BQUEsR0FBVSxDQUFWLENBRkY7S0F0Q0E7QUFBQSxJQTBDQSxPQUFBLEdBQVUsVUFBVSxDQUFDLE9BQVgsQ0FBbUIsRUFBQSxHQUFFLENBQUMsVUFBVSxDQUFDLElBQVgsQ0FBQSxDQUFBLEdBQWtCLE9BQW5CLENBQUYsR0FBNkIsUUFBaEQsQ0ExQ1YsQ0FBQTtBQTRDQSxJQUFBLElBQUcsT0FBSDtBQUVFLE1BQUEsYUFBQSxHQUFnQixFQUFBLEdBQUUsQ0FBQyxVQUFVLENBQUMsSUFBWCxDQUFBLENBQUQsQ0FBRixHQUFxQixHQUFyQixHQUF3QixJQUFDLENBQUEsZUFBZ0IsQ0FBQSxDQUFBLENBQXpELENBRkY7S0FBQSxNQUFBO0FBTUUsTUFBQSxhQUFBLEdBQWdCLEVBQUEsR0FBRSxDQUFDLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FBQSxHQUFrQixPQUFuQixDQUFGLEdBQTZCLEdBQTdCLEdBQWdDLElBQUMsQ0FBQSxlQUFnQixDQUFBLENBQUEsQ0FBakUsQ0FORjtLQTVDQTtBQUFBLElBb0RBLElBQUMsQ0FBQSxjQUFjLENBQUMsR0FBaEIsQ0FBb0IsYUFBcEIsQ0FBa0MsQ0FBQyxPQUFuQyxDQUEyQyxRQUEzQyxDQXBEQSxDQUFBO0FBc0RBLElBQUEsSUFBRyxJQUFDLENBQUEsZUFBZSxDQUFDLEtBQWpCLEtBQTBCLEVBQTdCO0FBRUUsTUFBQSxJQUFDLENBQUEsY0FBYyxDQUFDLEdBQWhCLENBQW9CLEtBQXBCLENBQTBCLENBQUMsT0FBM0IsQ0FBbUMsUUFBbkMsQ0FBQSxDQUZGO0tBdERBO0FBQUEsSUEwREEsSUFBQyxDQUFBLHFCQUFELENBQUEsQ0ExREEsQ0FBQTtBQUFBLElBNERBLElBQUMsQ0FBQSxjQUFELENBQUEsQ0E1REEsQ0FBQTtBQThEQSxXQUFPLEtBQVAsQ0FoRWlCO0VBQUEsQ0F0UW5CLENBQUE7O0FBQUEseUJBeVVBLGVBQUEsR0FBaUIsU0FBQyxDQUFELEdBQUE7QUFFZixRQUFBLHVCQUFBO0FBQUEsSUFBQSxLQUFBLEdBQVEsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQWtCLENBQUMsR0FBbkIsQ0FBQSxDQUFBLElBQTRCLEVBQXBDLENBQUE7QUFFQSxJQUFBLElBQUcsS0FBQSxLQUFTLEVBQVo7QUFDRSxNQUFBLElBQUMsQ0FBQSxRQUFELEdBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyxFQUFQO09BREYsQ0FBQTtBQUFBLE1BR0EsSUFBQyxDQUFBLHFCQUFELENBQUEsQ0FIQSxDQUFBO0FBQUEsTUFLQSxJQUFDLENBQUEsY0FBRCxDQUFBLENBTEEsQ0FBQTtBQU9BLGFBQU8sSUFBQyxDQUFBLGNBQVIsQ0FSRjtLQUZBO0FBQUEsSUFZQSxVQUFBLEdBQWEsTUFBQSxDQUFPLEtBQVAsQ0FaYixDQUFBO0FBQUEsSUFjQSxJQUFBLEdBQU8sVUFBVSxDQUFDLE1BQVgsQ0FBQSxDQWRQLENBQUE7QUFBQSxJQWdCQSxJQUFDLENBQUEsUUFBRCxHQUVFO0FBQUEsTUFBQSxNQUFBLEVBQVEsVUFBUjtBQUFBLE1BRUEsSUFBQSxFQUFNLElBRk47QUFBQSxNQUlBLEtBQUEsRUFBTyxLQUpQO0FBQUEsTUFNQSxJQUFBLEVBQU0sVUFBVSxDQUFDLElBQVgsQ0FBQSxDQU5OO0FBQUEsTUFRQSxPQUFBLEVBRUU7QUFBQSxRQUFBLE1BQUEsRUFBUSxVQUFVLENBQUMsSUFBWCxDQUFnQixVQUFVLENBQUMsSUFBWCxDQUFBLENBQWhCLENBQWtDLENBQUMsT0FBbkMsQ0FBMkMsQ0FBM0MsQ0FBUjtBQUFBLFFBRUEsSUFBQSxFQUFNLFVBQVUsQ0FBQyxJQUFYLENBQWdCLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FBaEIsQ0FBa0MsQ0FBQyxPQUFuQyxDQUEyQyxDQUEzQyxDQUE2QyxDQUFDLE1BQTlDLENBQUEsQ0FGTjtBQUFBLFFBSUEsS0FBQSxFQUFPLFVBQVUsQ0FBQyxJQUFYLENBQWdCLFVBQVUsQ0FBQyxJQUFYLENBQUEsQ0FBaEIsQ0FBa0MsQ0FBQyxPQUFuQyxDQUEyQyxDQUEzQyxDQUE2QyxDQUFDLE1BQTlDLENBQXFELFlBQXJELENBSlA7T0FWRjtLQWxCRixDQUFBO0FBQUEsSUFrQ0EsSUFBQyxDQUFBLHFCQUFELENBQUEsQ0FsQ0EsQ0FBQTtBQUFBLElBb0NBLElBQUMsQ0FBQSxjQUFELENBQUEsQ0FwQ0EsQ0FBQTtBQXNDQSxXQUFPLEtBQVAsQ0F4Q2U7RUFBQSxDQXpVakIsQ0FBQTs7QUFBQSx5QkFtWEEscUJBQUEsR0FBdUIsU0FBQSxHQUFBO0FBR3JCLElBQUEsSUFBRyxJQUFDLENBQUEsVUFBVSxDQUFDLEtBQVosS0FBcUIsRUFBckIsSUFBMkIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEtBQW1CLEVBQWpEO0FBRUUsTUFBQSxJQUFDLENBQUEsY0FBYyxDQUFDLGdCQUFoQixDQUFpQyxTQUFqQyxDQUFBLENBQUE7QUFBQSxNQUVBLElBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBRUU7QUFBQSxRQUFBLFVBQUEsRUFBWSxVQUFaO0FBQUEsUUFFQSxRQUFBLEVBQVUsQ0FGVjtBQUFBLFFBSUEsUUFBQSxFQUFVLHFCQUpWO0FBQUEsUUFNQSxXQUFBLEVBQWEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxPQUFPLENBQUMsS0FOakM7QUFBQSxRQVFBLE9BQUEsRUFBUyxJQUFDLENBQUEsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQVI3QjtBQUFBLFFBVUEsT0FBQSxFQUFTLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FWbkI7QUFBQSxRQVlBLFFBQUEsRUFBVSxDQUFBLFNBQUEsS0FBQSxHQUFBO2lCQUFBLFNBQUEsR0FBQTtBQUVSLFlBQUEsS0FBQyxDQUFBLG9CQUFELEdBQXdCLEtBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBQWlDLFVBQWpDLENBQXhCLENBQUE7bUJBRUEsS0FBQyxDQUFBLGNBQUQsQ0FBQSxFQUpRO1VBQUEsRUFBQTtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FaVjtPQUZGLENBRkEsQ0FBQTtBQUFBLE1BdUJBLElBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBQWlDLFlBQWpDLEVBQStDLFFBQS9DLENBdkJBLENBQUE7QUF5QkEsTUFBQSxJQUFHLElBQUMsQ0FBQSxvQkFBb0IsQ0FBQyxNQUF0QixHQUErQixDQUFsQztlQUVFLElBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBQWlDLFVBQWpDLEVBQTZDLElBQUMsQ0FBQSxvQkFBOUMsRUFGRjtPQTNCRjtLQUFBLE1BQUE7QUFpQ0UsTUFBQSxJQUFDLENBQUEsY0FBYyxDQUFDLGdCQUFoQixDQUFpQyxTQUFqQyxDQUFBLENBQUE7QUFBQSxNQUVBLElBQUMsQ0FBQSxjQUFjLENBQUMsZ0JBQWhCLENBRUU7QUFBQSxRQUFBLFVBQUEsRUFBWSxVQUFaO0FBQUEsUUFFQSxRQUFBLEVBQVUsQ0FGVjtBQUFBLFFBSUEsUUFBQSxFQUFVLHFCQUpWO0FBQUEsUUFNQSxRQUFBLEVBQVUsQ0FBQSxTQUFBLEtBQUEsR0FBQTtpQkFBQSxTQUFBLEdBQUE7QUFFUixZQUFBLEtBQUMsQ0FBQSxvQkFBRCxHQUF3QixLQUFDLENBQUEsY0FBYyxDQUFDLGdCQUFoQixDQUFpQyxVQUFqQyxDQUF4QixDQUFBO21CQUVBLEtBQUMsQ0FBQSxjQUFELENBQUEsRUFKUTtVQUFBLEVBQUE7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBTlY7T0FGRixDQUZBLENBQUE7YUFpQkEsSUFBQyxDQUFBLGNBQWMsQ0FBQyxnQkFBaEIsQ0FBaUMsWUFBakMsRUFBK0MsUUFBL0MsRUFsREY7S0FIcUI7RUFBQSxDQW5YdkIsQ0FBQTs7QUFBQSx5QkE2YUEsY0FBQSxHQUFnQixTQUFBLEdBQUE7QUFFZCxRQUFBLDJCQUFBO0FBQUEsSUFBQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0IsRUFBcEIsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLFdBQUQsR0FBZSxFQUZmLENBQUE7QUFBQSxJQUlBLElBQUMsQ0FBQSxHQUFELEdBQU8sRUFKUCxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsT0FBRCxHQUFXLEVBTlgsQ0FBQTtBQVFBLElBQUEsSUFBRyxJQUFDLENBQUEsVUFBVSxDQUFDLEtBQVosS0FBcUIsRUFBckIsSUFBMkIsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLEtBQW1CLEVBQWpEO0FBR0UsTUFBQSxJQUFBLEdBQU8sSUFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFDLENBQUEsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFsQyxFQUEwQyxJQUFDLENBQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUE1RCxDQUFQLENBQUE7QUFBQSxNQUlBLElBQUMsQ0FBQSxZQUFELEdBQWdCLENBQUEsR0FBSSxJQUpwQixDQUFBO0FBTUEsTUFBQSxJQUFHLElBQUMsQ0FBQSxZQUFELEdBQWdCLElBQUMsQ0FBQSxvQkFBcEI7QUFFRSxRQUFBLElBQUMsQ0FBQSxNQUFELEdBQVUsSUFBQyxDQUFBLG9CQUFYLENBRkY7T0FBQSxNQUlLLElBQUcsSUFBQyxDQUFBLFlBQUQsR0FBZ0IsSUFBQyxDQUFBLG1CQUFwQjtBQUVILFFBQUEsSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsbUJBQVgsQ0FGRztPQUFBLE1BQUE7QUFNSCxRQUFBLElBQUMsQ0FBQSxNQUFELEdBQVUsSUFBQyxDQUFBLFlBQVgsQ0FORztPQVZMO0FBQUEsTUFtQkEsSUFBQyxDQUFBLGdCQUFELEdBQW9CLEVBbkJwQixDQUFBO0FBQUEsTUFxQkEsQ0FBQSxHQUFJLENBckJKLENBQUE7QUF1QkEsYUFBTSxDQUFBLEdBQUksSUFBQyxDQUFBLE1BQVgsR0FBQTtBQUVFLFFBQUEsSUFBRyxDQUFBLEtBQUssQ0FBUjtBQUVFLFVBQUEsT0FBQSxHQUFVLE1BQUEsQ0FBTyxJQUFDLENBQUEsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUEzQixDQUFrQyxDQUFDLE1BQW5DLENBQTBDLFlBQTFDLENBQVYsQ0FGRjtTQUFBLE1BQUE7QUFNRSxVQUFBLE9BQUEsR0FBVSxNQUFBLENBQU8sSUFBQyxDQUFBLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBM0IsQ0FBa0MsQ0FBQyxJQUFuQyxDQUF3QyxJQUFDLENBQUEsVUFBVSxDQUFDLElBQVosR0FBaUIsQ0FBekQsQ0FBMkQsQ0FBQyxNQUE1RCxDQUFtRSxZQUFuRSxDQUFWLENBTkY7U0FBQTtBQUFBLFFBUUEsSUFBQyxDQUFBLGdCQUFnQixDQUFDLElBQWxCLENBQXVCLE9BQXZCLENBUkEsQ0FBQTtBQUFBLFFBVUEsQ0FBQSxFQVZBLENBRkY7TUFBQSxDQXZCQTtBQUFBLE1BcUNBLElBQUMsQ0FBQSxXQUFELEdBQWUsRUFyQ2YsQ0FBQTtBQUFBLE1BdUNBLElBQUMsQ0FBQSxrQkFBRCxHQUFzQixDQXZDdEIsQ0FBQTtBQUFBLE1BMkNBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBQyxDQUFBLGdCQUFSLEVBQTBCLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFDLFFBQUQsRUFBVyxFQUFYLEdBQUE7QUFFeEIsY0FBQSxpREFBQTtBQUFBLFVBQUEsT0FBQSxHQUFVLE1BQUEsQ0FBTyxRQUFQLENBQVYsQ0FBQTtBQUFBLFVBRUEsYUFBQSxHQUFnQixDQUZoQixDQUFBO0FBQUEsVUFJQSxlQUFBLEdBQWtCLENBSmxCLENBQUE7QUFBQSxVQU1BLFFBQUEsR0FFRTtBQUFBLFlBQUEsU0FBQSxFQUFXLE9BQU8sQ0FBQyxNQUFSLENBQWUsWUFBZixDQUFYO0FBQUEsWUFFQSxhQUFBLEVBQWUsSUFGZjtBQUFBLFlBSUEsS0FBQSxFQUFPLEVBSlA7QUFBQSxZQU1BLFNBQUEsRUFBVyxFQUFBLEdBQUssS0FBQyxDQUFBLGtCQU5qQjtXQVJGLENBQUE7QUFBQSxVQWlCQSxDQUFDLENBQUMsSUFBRixDQUFPLEtBQUMsQ0FBQSxZQUFSLEVBQXNCLFNBQUMsR0FBRCxFQUFNLEVBQU4sR0FBQTtBQUVwQixnQkFBQSxtQkFBQTtBQUFBLFlBQUEsSUFBRyxHQUFIO0FBRUUsY0FBQSxPQUFBLEdBQVUsSUFBVixDQUFBO0FBQUEsY0FFQSxVQUFBLEdBQWEsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsRUFBaEIsQ0FBbUIsQ0FBQyxNQUFwQixDQUEyQixZQUEzQixDQUZiLENBQUE7QUFBQSxjQUlBLGFBQUEsRUFKQSxDQUFBO0FBT0EsY0FBQSxJQUFHLENBQUMsQ0FBQyxPQUFGLENBQVUsS0FBQyxDQUFBLG9CQUFYLEVBQWlDLFVBQWpDLENBQUEsS0FBZ0QsQ0FBQSxDQUFuRDtBQUVFLGdCQUFBLGVBQUEsRUFBQSxDQUFBO0FBQUEsZ0JBRUEsT0FBQSxHQUFVLEtBRlYsQ0FGRjtlQVBBO3FCQWFBLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBZixDQUFvQjtBQUFBLGdCQUFDLE9BQUEsRUFBUyxPQUFWO0FBQUEsZ0JBQW1CLElBQUEsRUFBTSxVQUF6QjtlQUFwQixFQWZGO2FBQUEsTUFBQTtxQkFtQkUsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFmLENBQW9CLEVBQXBCLEVBbkJGO2FBRm9CO1VBQUEsQ0FBdEIsQ0FqQkEsQ0FBQTtBQXlDQSxVQUFBLElBQUcsZUFBQSxLQUFtQixDQUFuQixJQUF5QixhQUFBLEtBQWlCLGVBQTdDO0FBRUUsWUFBQSxRQUFRLENBQUMsYUFBVCxHQUF5QixLQUF6QixDQUFBO0FBQUEsWUFFQSxRQUFRLENBQUMsU0FBVCxHQUFxQixFQUZyQixDQUFBO0FBQUEsWUFJQSxLQUFDLENBQUEsa0JBQUQsRUFKQSxDQUZGO1dBekNBO2lCQWlEQSxLQUFDLENBQUEsV0FBVyxDQUFDLElBQWIsQ0FBa0IsUUFBbEIsRUFuRHdCO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBMUIsQ0EzQ0EsQ0FBQTtBQWtHQSxNQUFBLElBQUcsSUFBQyxDQUFBLGtCQUFELEdBQXNCLENBQXpCO0FBRUUsUUFBQSxTQUFBLEdBQVksSUFBQyxDQUFBLE1BQUQsR0FBVSxJQUFDLENBQUEsa0JBQXZCLENBQUE7QUFFQSxRQUFBLElBQUcsU0FBQSxHQUFZLENBQWY7QUFFRSxVQUFBLEtBQUEsQ0FBTSxnSUFBTixDQUFBLENBQUE7QUFFQSxpQkFBTyxLQUFQLENBSkY7U0FBQSxNQUFBO0FBUUUsVUFBQSxJQUFDLENBQUEsTUFBRCxHQUFVLFNBQVYsQ0FSRjtTQUpGO09BckdGO0tBUkE7QUFBQSxJQTRIQSxJQUFDLENBQUEsTUFBRCxDQUFBLENBNUhBLENBQUE7QUE4SEEsV0FBTyxJQUFQLENBaEljO0VBQUEsQ0E3YWhCLENBQUE7O0FBQUEseUJBa2pCQSxpQkFBQSxHQUFtQixTQUFDLE1BQUQsR0FBQTtBQUVqQixRQUFBLDBCQUFBO0FBQUEsSUFBQSxJQUFBLEdBQU8sRUFBQSxHQUFLLE1BQVosQ0FBQTtBQUFBLElBRUEsR0FBQSxHQUFNLEVBRk4sQ0FBQTtBQUFBLElBSUEsVUFBQSxHQUFhLENBQUMsQ0FBQyxLQUFGLENBQVEsSUFBQyxDQUFBLElBQVQsQ0FKYixDQUFBO0FBTUEsSUFBQSxJQUFHLElBQUEsR0FBTyxDQUFWO0FBRUUsTUFBQSxVQUFBLEdBQWEsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxVQUFULEVBQXFCLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFDLElBQUQsR0FBQTtBQUVoQyxpQkFBTyxJQUFJLENBQUMsSUFBTCxLQUFhLE9BQWIsSUFBd0IsSUFBQSxJQUFRLElBQUksQ0FBQyxLQUFyQyxJQUE4QyxJQUFJLENBQUMsS0FBTCxLQUFjLENBQW5FLENBRmdDO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckIsQ0FBYixDQUZGO0tBTkE7QUFBQSxJQWNBLEdBQUEsR0FBTSxVQUFXLENBQUEsQ0FBQSxDQWRqQixDQUFBO0FBQUEsSUFnQkEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxVQUFQLEVBQW1CLENBQUEsU0FBQSxLQUFBLEdBQUE7YUFBQSxTQUFDLElBQUQsRUFBTyxLQUFQLEdBQUE7QUFFakIsUUFBQSxJQUFHLElBQUksQ0FBQyxJQUFMLEtBQWEsT0FBYixJQUF3QixLQUFBLEtBQVMsVUFBVSxDQUFDLE1BQVgsR0FBb0IsQ0FBeEQ7QUFFRSxVQUFBLElBQUcsS0FBQSxLQUFTLFVBQVUsQ0FBQyxNQUFYLEdBQW9CLENBQWhDO0FBRUUsWUFBQSxHQUFHLENBQUMsSUFBSixDQUFTLENBQUMsQ0FBQyxLQUFGLENBQVEsSUFBUixDQUFULENBQUEsQ0FGRjtXQUFBLE1BQUE7QUFNRSxZQUFBLEdBQUcsQ0FBQyxJQUFKLENBQVMsQ0FBQyxDQUFDLEtBQUYsQ0FBUSxHQUFSLENBQVQsQ0FBQSxDQU5GO1dBQUE7QUFBQSxVQVFBLEdBQUEsR0FBTSxLQVJOLENBRkY7U0FBQSxNQWNLLElBQUcsSUFBSSxDQUFDLElBQUwsS0FBYSxNQUFoQjtBQUVILFVBQUEsSUFBRyxHQUFBLEtBQU8sS0FBVjttQkFFRSxHQUFBLEdBQU0sS0FGUjtXQUFBLE1BQUE7QUFPRSxZQUFBLElBQUcsSUFBSSxDQUFDLE1BQUwsS0FBZSxTQUFsQjtxQkFFRSxHQUFBLEdBQU0sS0FBQyxDQUFBLE9BQUQsQ0FBUyxHQUFULEVBQWMsSUFBZCxFQUZSO2FBQUEsTUFBQTtBQUFBO2FBUEY7V0FGRztTQWhCWTtNQUFBLEVBQUE7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQW5CLENBaEJBLENBQUE7QUFvREEsV0FBTyxHQUFQLENBdERpQjtFQUFBLENBbGpCbkIsQ0FBQTs7QUFBQSx5QkEwbUJBLE1BQUEsR0FBUSxTQUFBLEdBQUE7QUFFTixJQUFBLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBMUIsR0FBdUMsSUFBQyxDQUFBLFVBQVUsQ0FBQyxLQUFaLElBQXFCLEVBQTVELENBQUE7QUFBQSxJQUVBLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBMUIsR0FBcUMsSUFBQyxDQUFBLFFBQVEsQ0FBQyxLQUFWLElBQW1CLEVBRnhELENBQUE7QUFJQSxJQUFBLElBQUcsSUFBQyxDQUFBLE1BQUo7QUFFRSxNQUFBLENBQUEsQ0FBRSxxQkFBRixDQUF3QixDQUFDLElBQXpCLENBQThCLElBQUMsQ0FBQSxNQUFELEdBQVUsUUFBeEMsQ0FBQSxDQUZGO0tBQUEsTUFBQTtBQU1FLE1BQUEsQ0FBQSxDQUFFLHFCQUFGLENBQXdCLENBQUMsSUFBekIsQ0FBOEIsRUFBOUIsQ0FBQSxDQU5GO0tBSkE7QUFBQSxJQVlBLElBQUMsQ0FBQSxHQUFELEdBQU8sSUFBQyxDQUFBLGlCQUFELENBQW1CLElBQUMsQ0FBQSxNQUFwQixDQVpQLENBQUE7QUFBQSxJQWNBLElBQUMsQ0FBQSxPQUFELEdBQVcsSUFBQyxDQUFBLEdBZFosQ0FBQTtBQUFBLElBZ0JBLElBQUMsQ0FBQSxZQUFELENBQUEsQ0FoQkEsQ0FBQTtBQUFBLElBa0JBLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBbEIsQ0FBMEIsZUFBMUIsRUFBMkMsSUFBQyxDQUFBLGFBQWEsQ0FBQyxJQUFmLENBQUEsQ0FBM0MsQ0FsQkEsQ0FBQTtXQW9CQSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLGFBQTFCLEVBQXlDLElBQXpDLEVBdEJNO0VBQUEsQ0ExbUJSLENBQUE7O0FBQUEseUJBbW9CQSxZQUFBLEdBQWMsU0FBQSxHQUFBO0FBRVosUUFBQSwyQkFBQTtBQUFBLElBQUEsSUFBQyxDQUFBLGFBQWEsQ0FBQyxJQUFmLENBQW9CLEVBQXBCLENBQUEsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLGVBQUEsQ0FBaUIsQ0FBQyxDQUFDLE1BQUYsQ0FBUyxVQUFULEVBQW9CO0FBQUEsTUFBRSxXQUFBLEVBQWEsVUFBVSxDQUFDLGNBQWMsQ0FBQyxXQUF6QztLQUFwQixDQUFqQixDQUF0QixDQUZBLENBQUE7QUFJQSxJQUFBLElBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxnQkFBaUIsQ0FBQSxDQUFBLENBQXRDLEtBQTRDLGVBQS9DO0FBRUUsTUFBQSxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLElBQUMsQ0FBQSxTQUExQixDQUFBLENBQUE7QUFBQSxNQUVBLElBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQix1QkFBdEIsQ0FGQSxDQUFBO0FBQUEsTUFJQSxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLElBQUMsQ0FBQSxTQUExQixDQUpBLENBQUE7QUFBQSxNQU1BLElBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixjQUF0QixDQU5BLENBQUE7QUFBQSxNQVFBLElBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsSUFBQyxDQUFBLFNBQTFCLENBUkEsQ0FBQTtBQUFBLE1BVUEsYUFBQSxHQUFnQixDQVZoQixDQUFBO0FBQUEsTUFZQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxXQUFSLEVBQXFCLENBQUEsU0FBQSxLQUFBLEdBQUE7ZUFBQSxTQUFDLElBQUQsRUFBTyxLQUFQLEdBQUE7QUFFbkIsY0FBQSw2REFBQTtBQUFBLFVBQUEsSUFBQSxDQUFBLElBQVcsQ0FBQyxhQUFaO0FBRUUsWUFBQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0Isd0JBQXRCLENBQUEsQ0FBQTtBQUFBLFlBRUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsQ0FGQSxDQUFBO0FBQUEsWUFJQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLEtBQUMsQ0FBQSxTQUExQixDQUpBLENBQUE7QUFBQSxZQU1BLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUF1QixLQUFBLEdBQUssS0FBQyxDQUFBLFdBQU4sR0FBa0IsR0FBbEIsR0FBcUIsSUFBSSxDQUFDLFNBQTFCLEdBQW9DLEtBQTNELENBTkEsQ0FBQTtBQUFBLFlBUUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsQ0FSQSxDQUFBO0FBQUEsWUFVQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLEtBQUMsQ0FBQSxTQUExQixDQVZBLENBQUE7QUFZQSxrQkFBQSxDQWRGO1dBQUE7QUFBQSxVQWdCQSxJQUFBLEdBQU8sS0FBQyxDQUFBLE9BQVEsQ0FBQSxJQUFJLENBQUMsU0FBTCxDQWhCaEIsQ0FBQTtBQUFBLFVBa0JBLFFBQUEsR0FBVyxJQUFJLENBQUMsU0FBTCxHQUFpQixDQWxCNUIsQ0FBQTtBQUFBLFVBb0JBLFFBQUEsR0FBVyxJQUFJLENBQUMsU0FBTCxHQUFpQixDQXBCNUIsQ0FBQTtBQUFBLFVBc0JBLFVBQUEsR0FBYSxJQUFJLENBQUMsU0FBTCxLQUFrQixLQUFDLENBQUEsTUFBRCxHQUFVLENBdEJ6QyxDQUFBO0FBeUJBLFVBQUEsSUFBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQVgsR0FBb0IsQ0FBdkI7QUFFRSxZQUFBLE1BQUEsR0FBUyxFQUFULENBQUE7QUFBQSxZQUVBLEtBQUEsR0FBVyxRQUFBLEtBQVksQ0FBZixHQUFzQixHQUF0QixHQUErQixFQUZ2QyxDQUFBO0FBQUEsWUFJQSxNQUFBLElBQVcsMkVBQUEsR0FBMkUsS0FBM0UsR0FBaUYsSUFBakYsR0FBcUYsUUFBckYsR0FBOEYsS0FKekcsQ0FBQTtBQUFBLFlBTUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsS0FBWixFQUFtQixTQUFDLENBQUQsRUFBSSxDQUFKLEdBQUE7QUFFakIsY0FBQSxJQUFHLENBQUEsS0FBSyxDQUFSO3VCQUVDLE1BQUEsSUFBVSxFQUFBLEdBQUcsRUFGZDtlQUFBLE1BQUE7dUJBTUUsTUFBQSxJQUFXLElBQUEsR0FBSSxFQU5qQjtlQUZpQjtZQUFBLENBQW5CLENBTkEsQ0FBQTtBQW1CQSxZQUFBLElBQUcsSUFBSSxDQUFDLFNBQUwsSUFBbUIsSUFBSSxDQUFDLFNBQUwsS0FBa0IsRUFBeEM7QUFFRSxjQUFBLE1BQUEsSUFBVyxhQUFBLEdBQWEsSUFBSSxDQUFDLFNBQWxCLEdBQTRCLEdBQXZDLENBRkY7YUFuQkE7QUFBQSxZQXVCQSxRQUFBLEdBQVcsQ0F2QlgsQ0FBQTtBQUFBLFlBeUJBLENBQUMsQ0FBQyxJQUFGLENBQU8sSUFBSSxDQUFDLEtBQVosRUFBbUIsU0FBQyxDQUFELEVBQUksRUFBSixHQUFBO0FBRWpCLGNBQUEsSUFBRyxDQUFDLENBQUMsT0FBTDtBQUVFLGdCQUFBLFFBQUEsRUFBQSxDQUFBO3VCQUVBLE1BQUEsSUFBVyxPQUFBLEdBQU8sUUFBUCxHQUFnQixLQUFoQixHQUFxQixDQUFDLENBQUMsSUFBdkIsR0FBNEIsSUFKekM7ZUFGaUI7WUFBQSxDQUFuQixDQXpCQSxDQUFBO0FBQUEsWUFvQ0EsTUFBQSxJQUFVLElBcENWLENBQUE7QUFBQSxZQXNDQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsTUFBdEIsQ0F0Q0EsQ0FBQTtBQUFBLFlBd0NBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLENBeENBLENBRkY7V0F6QkE7QUFzRUEsVUFBQSxJQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBZCxHQUF1QixDQUExQjtBQUVFLFlBQUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsUUFBWixFQUFzQixTQUFDLENBQUQsRUFBSSxFQUFKLEdBQUE7QUFFcEIsa0JBQUEsU0FBQTtBQUFBLGNBQUEsSUFBRyxDQUFDLENBQUMsU0FBRixJQUFlLENBQUMsQ0FBQyxTQUFGLEtBQWUsRUFBakM7QUFFRSxnQkFBQSxTQUFBLEdBQVksSUFBQSxDQUFLLENBQUMsQ0FBQyxTQUFQLENBQVosQ0FBQTtBQUVBLGdCQUFBLElBQUcsU0FBSDtBQUVFLGtCQUFBLElBQUcsRUFBQSxLQUFNLENBQVQ7QUFFRSxvQkFBQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsY0FBdEIsQ0FBQSxDQUFBO0FBQUEsb0JBRUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsQ0FGQSxDQUZGO21CQUFBO0FBQUEsa0JBTUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxDQUFDLENBQUMsUUFBM0IsQ0FOQSxDQUFBO3lCQVFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLEVBVkY7aUJBSkY7ZUFBQSxNQUFBO0FBa0JFLGdCQUFBLElBQUcsRUFBQSxLQUFNLENBQVQ7QUFFRSxrQkFBQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsY0FBdEIsQ0FBQSxDQUFBO0FBQUEsa0JBRUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsQ0FGQSxDQUZGO2lCQUFBO0FBQUEsZ0JBTUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxDQUFDLENBQUMsUUFBM0IsQ0FOQSxDQUFBO3VCQVFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLEVBMUJGO2VBRm9CO1lBQUEsQ0FBdEIsQ0FBQSxDQUFBO0FBQUEsWUErQkEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsQ0EvQkEsQ0FGRjtXQXRFQTtBQTBHQSxVQUFBLElBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFqQixHQUEwQixDQUE3QjtBQUVFLFlBQUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxJQUFJLENBQUMsV0FBWixFQUF5QixTQUFDLE1BQUQsRUFBUyxFQUFULEdBQUE7QUFFdkIsa0JBQUEsU0FBQTtBQUFBLGNBQUEsSUFBRyxNQUFNLENBQUMsU0FBUCxJQUFvQixNQUFNLENBQUMsU0FBUCxLQUFvQixFQUEzQztBQUVFLGdCQUFBLFNBQUEsR0FBWSxJQUFBLENBQUssTUFBTSxDQUFDLFNBQVosQ0FBWixDQUFBO0FBRUEsZ0JBQUEsSUFBRyxTQUFIO0FBRUUsa0JBQUEsSUFBRyxFQUFBLEtBQU0sQ0FBVDtBQUVFLG9CQUFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUF1Qiw0QkFBQSxHQUE0QixRQUE1QixHQUFxQyxLQUE1RCxDQUFBLENBQUE7QUFBQSxvQkFFQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLEtBQUMsQ0FBQSxTQUExQixDQUZBLENBRkY7bUJBQUE7QUFBQSxrQkFNQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLE1BQU0sQ0FBQyxRQUFoQyxDQU5BLENBQUE7eUJBUUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsRUFWRjtpQkFBQSxNQUFBO0FBY0Usa0JBQUEsSUFBRyxFQUFBLEtBQU0sQ0FBVDtBQUVFLG9CQUFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUF1Qiw0QkFBQSxHQUE0QixRQUE1QixHQUFxQyxLQUE1RCxDQUFBLENBQUE7MkJBRUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsRUFKRjttQkFkRjtpQkFKRjtlQUFBLE1BQUE7QUEwQkUsZ0JBQUEsSUFBRyxFQUFBLEtBQU0sQ0FBVDtBQUVFLGtCQUFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUF1Qiw0QkFBQSxHQUE0QixRQUE1QixHQUFxQyxLQUE1RCxDQUFBLENBQUE7QUFBQSxrQkFFQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLEtBQUMsQ0FBQSxTQUExQixDQUZBLENBRkY7aUJBQUE7QUFBQSxnQkFNQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLE1BQU0sQ0FBQyxRQUFoQyxDQU5BLENBQUE7dUJBUUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsRUFsQ0Y7ZUFGdUI7WUFBQSxDQUF6QixDQUFBLENBQUE7QUFBQSxZQXdDQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLEtBQUMsQ0FBQSxTQUExQixDQXhDQSxDQUZGO1dBMUdBO0FBc0pBLFVBQUEsSUFBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQWhCLEdBQXlCLENBQTVCO0FBRUUsWUFBQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsMkJBQXRCLENBQUEsQ0FBQTtBQUFBLFlBRUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxLQUFDLENBQUEsU0FBMUIsQ0FGQSxDQUFBO0FBQUEsWUFJQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUksQ0FBQyxVQUFaLEVBQXdCLFNBQUMsQ0FBRCxHQUFBO0FBRXRCLGNBQUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLEVBQUEsR0FBRyxDQUFDLENBQUMsUUFBM0IsQ0FBQSxDQUFBO3FCQUVBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLEVBSnNCO1lBQUEsQ0FBeEIsQ0FKQSxDQUFBO0FBQUEsWUFZQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLEtBQUMsQ0FBQSxTQUExQixDQVpBLENBRkY7V0F0SkE7QUFzS0EsVUFBQSxJQUFHLFVBQUg7QUFFRSxZQUFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQix3QkFBdEIsQ0FBQSxDQUFBO21CQUVBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLEVBSkY7V0F4S21CO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBckIsQ0FaQSxDQUFBO0FBQUEsTUE0TEEsSUFBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLGVBQUEsQ0FBZ0IsVUFBaEIsQ0FBdEIsQ0E1TEEsQ0FGRjtLQUFBLE1BQUE7QUFrTUUsTUFBQSxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLElBQUMsQ0FBQSxTQUExQixDQUFBLENBQUE7QUFBQSxNQUVBLElBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQix1QkFBdEIsQ0FGQSxDQUFBO0FBQUEsTUFJQSxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsRUFBQSxHQUFHLElBQUMsQ0FBQSxTQUExQixDQUpBLENBQUE7QUFBQSxNQU1BLFlBQUEsR0FBZSxFQU5mLENBQUE7QUFBQSxNQVFBLENBQUMsQ0FBQyxJQUFGLENBQU8sV0FBVyxDQUFDLFFBQVEsQ0FBQyxnQkFBNUIsRUFBOEMsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUMsT0FBRCxHQUFBO0FBRTVDLFVBQUEsWUFBWSxDQUFDLElBQWIsQ0FBa0IsVUFBVSxDQUFDLE9BQVEsQ0FBQSxPQUFBLENBQVMsQ0FBQSxPQUFBLENBQTlDLENBQUEsQ0FBQTtBQUFBLFVBRUEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxLQUFDLENBQUEsT0FBUSxDQUFBLE9BQUEsQ0FBaEIsRUFBMEIsU0FBQyxJQUFELEVBQU8sR0FBUCxHQUFBO0FBRXhCLFlBQUEsS0FBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXVCLE9BQUEsR0FBTyxJQUFQLEdBQVksYUFBbkMsQ0FBQSxDQUFBO0FBRUEsWUFBQSxJQUFHLEdBQUEsS0FBTyxDQUFWO3FCQUVFLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLEVBRkY7YUFKd0I7VUFBQSxDQUExQixDQUZBLENBQUE7QUFBQSxVQVdBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixPQUF0QixDQVhBLENBQUE7QUFBQSxVQWFBLEtBQUMsQ0FBQSxhQUFhLENBQUMsTUFBZixDQUFzQixFQUFBLEdBQUcsS0FBQyxDQUFBLFNBQTFCLENBYkEsQ0FBQTtpQkFlQSxLQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IsYUFBdEIsRUFqQjRDO1FBQUEsRUFBQTtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBOUMsQ0FSQSxDQUFBO0FBQUEsTUE2QkEsSUFBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLE9BQXRCLENBN0JBLENBQUE7QUFBQSxNQStCQSxJQUFDLENBQUEsYUFBYSxDQUFDLE1BQWYsQ0FBc0IscUJBQUEsQ0FBc0I7QUFBQSxRQUFDLFVBQUEsRUFBWSxZQUFiO09BQXRCLENBQXRCLENBL0JBLENBbE1GO0tBSkE7V0F1T0EsSUFBQyxDQUFBLGFBQWEsQ0FBQyxNQUFmLENBQXNCLGVBQUEsQ0FBZ0IsVUFBaEIsQ0FBdEIsRUF6T1k7RUFBQSxDQW5vQmQsQ0FBQTs7QUFBQSx5QkErMkJBLFlBQUEsR0FBYyxTQUFDLENBQUQsRUFBSSxDQUFKLEdBQUE7QUFFWixXQUFPLENBQUMsQ0FBQyxJQUFGLENBQU8sQ0FBUCxFQUFVLE9BQVYsQ0FBUCxDQUZZO0VBQUEsQ0EvMkJkLENBQUE7O0FBQUEseUJBbzNCQSxPQUFBLEdBQVMsU0FBQyxJQUFELEVBQU8sSUFBUCxHQUFBO0FBRVAsUUFBQSxrREFBQTtBQUFBLElBQUEsS0FBQSxHQUFRLENBQUMsQ0FBQyxLQUFGLENBQVEsSUFBSSxDQUFDLEtBQWIsRUFBb0IsSUFBSSxDQUFDLEtBQXpCLENBQVIsQ0FBQTtBQUFBLElBRUEsUUFBQSxHQUFXLENBQUMsQ0FBQyxJQUFGLENBQU8sQ0FBQyxDQUFDLEtBQUYsQ0FBUSxJQUFJLENBQUMsUUFBYixFQUF1QixJQUFJLENBQUMsUUFBNUIsQ0FBUCxFQUE2QyxJQUE3QyxDQUZYLENBQUE7QUFBQSxJQUlBLFdBQUEsR0FBYyxDQUFDLENBQUMsSUFBRixDQUFPLENBQUMsQ0FBQyxLQUFGLENBQVEsSUFBSSxDQUFDLFdBQWIsRUFBMEIsSUFBSSxDQUFDLFdBQS9CLENBQVAsRUFBbUQsSUFBbkQsQ0FKZCxDQUFBO0FBQUEsSUFNQSxVQUFBLEdBQWEsQ0FBQyxDQUFDLElBQUYsQ0FBTyxDQUFDLENBQUMsS0FBRixDQUFRLElBQUksQ0FBQyxVQUFiLEVBQXlCLElBQUksQ0FBQyxVQUE5QixDQUFQLEVBQWlELElBQWpELENBTmIsQ0FBQTtBQUFBLElBUUEsUUFBQSxHQUFXLENBQUMsQ0FBQyxLQUFGLENBQVEsSUFBSSxDQUFDLFFBQWIsRUFBdUIsSUFBSSxDQUFDLFFBQTVCLENBUlgsQ0FBQTtBQVVBLFdBQU87QUFBQSxNQUFDLEtBQUEsRUFBTyxLQUFSO0FBQUEsTUFBZSxRQUFBLEVBQVUsUUFBekI7QUFBQSxNQUFtQyxXQUFBLEVBQWEsV0FBaEQ7QUFBQSxNQUE2RCxVQUFBLEVBQVksVUFBekU7QUFBQSxNQUFxRixRQUFBLEVBQVUsUUFBL0Y7S0FBUCxDQVpPO0VBQUEsQ0FwM0JULENBQUE7O3NCQUFBOztHQUYwQyxRQUFRLENBQUMsS0FoQnJELENBQUE7Ozs7O0FDR0EsSUFBQSxxRUFBQTtFQUFBO2lTQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVMsV0FBVCxDQUFkLENBQUE7O0FBQUEsSUFHQSxHQUFPLE9BQUEsQ0FBUSxRQUFSLENBSFAsQ0FBQTs7QUFBQSxpQkFPQSxHQUFvQixPQUFBLENBQVEsb0RBQVIsQ0FQcEIsQ0FBQTs7QUFBQSxnQkFVQSxHQUFtQixPQUFBLENBQVEsNkJBQVIsQ0FWbkIsQ0FBQTs7QUFBQSxNQWVNLENBQUMsT0FBUCxHQUF1QjtBQUdyQixrQ0FBQSxDQUFBOzs7O0dBQUE7O0FBQUEsMEJBQUEsUUFBQSxHQUFVLGlCQUFWLENBQUE7O0FBQUEsMEJBR0EsU0FBQSxHQUFXLHNCQUhYLENBQUE7O0FBQUEsMEJBTUEsU0FBQSxHQUFXLEdBTlgsQ0FBQTs7QUFBQSwwQkFRQSxVQUFBLEdBQVksS0FSWixDQUFBOztBQUFBLDBCQWVBLE1BQUEsR0FFRTtBQUFBLElBQUEsY0FBQSxFQUFpQixtQkFBakI7QUFBQSxJQUVBLDBCQUFBLEVBQTZCLG1CQUY3QjtBQUFBLElBSUEsNkJBQUEsRUFBZ0MsbUJBSmhDO0FBQUEsSUFNQSwwQ0FBQSxFQUE2Qyx5QkFON0M7QUFBQSxJQVFBLGtCQUFBLEVBQXFCLHNCQVJyQjtBQUFBLElBVUEsV0FBQSxFQUFjLGtCQVZkO0FBQUEsSUFZQSxrQkFBQSxFQUFxQixpQkFackI7QUFBQSxJQWNBLHlCQUFBLEVBQTRCLGlCQWQ1QjtBQUFBLElBZ0JBLDBCQUFBLEVBQTZCLGlCQWhCN0I7QUFBQSxJQWtCQSxVQUFBLEVBQWEsaUJBbEJiO0FBQUEsSUFvQkEsK0JBQUEsRUFBa0MseUJBcEJsQztBQUFBLElBc0JBLDZDQUFBLEVBQWdELHNCQXRCaEQ7QUFBQSxJQXdCQSxnREFBQSxFQUFtRCx5QkF4Qm5EO0FBQUEsSUEwQkEsaUNBQUEsRUFBb0MsU0ExQnBDO0FBQUEsSUE0QkEsZ0NBQUEsRUFBbUMsUUE1Qm5DO0dBakJGLENBQUE7O0FBQUEsMEJBZ0RBLG9CQUFBLEdBQXNCLFNBQUEsR0FBQTtBQUVwQixJQUFBLElBQUEsQ0FBQSxJQUFRLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxVQUFkLENBQVA7YUFFRSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBRkY7S0FBQSxNQUFBO2FBTUUsQ0FBQSxDQUFFLFlBQUYsQ0FBZSxDQUFDLE9BQWhCLENBRUU7QUFBQSxRQUFBLFNBQUEsRUFBVyxDQUFYO09BRkYsRUFJQyxHQUpELEVBTkY7S0FGb0I7RUFBQSxDQWhEdEIsQ0FBQTs7QUFBQSwwQkErREEsdUJBQUEsR0FBeUIsU0FBQyxDQUFELEdBQUE7QUFDdkIsUUFBQSx3REFBQTtBQUFBLElBQUEsQ0FBQyxDQUFDLGNBQUYsQ0FBQSxDQUFBLENBQUE7QUFFQSxJQUFBLElBQUcsSUFBQyxDQUFBLFVBQUQsQ0FBQSxDQUFIO0FBQ0UsYUFBTyxLQUFQLENBREY7S0FGQTtBQUFBLElBS0EsT0FBQSxHQUFVLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUxWLENBQUE7QUFBQSxJQU9BLFNBQUEsR0FBWSxPQUFPLENBQUMsT0FBUixDQUFnQixzQkFBaEIsQ0FQWixDQUFBO0FBQUEsSUFTQSxZQUFBLEdBQWUsT0FBTyxDQUFDLE9BQVIsQ0FBZ0IsdUJBQWhCLENBVGYsQ0FBQTtBQUFBLElBV0EsUUFBQSxHQUFXLFNBQVMsQ0FBQyxJQUFWLENBQWUscUJBQWYsQ0FYWCxDQUFBO0FBY0EsSUFBQSxJQUFHLFNBQVMsQ0FBQyxRQUFWLENBQW1CLFNBQW5CLENBQUg7QUFFRSxNQUFBLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBbEIsQ0FBMEIsV0FBMUIsQ0FBQSxDQUFBO0FBRUEsYUFBTyxLQUFQLENBSkY7S0FBQSxNQUFBO0FBUUUsTUFBQSxZQUFBLEdBQWUsWUFBWSxDQUFDLElBQWIsQ0FBa0Isc0JBQWxCLENBQXlDLENBQUMsR0FBMUMsQ0FBOEMsU0FBVSxDQUFBLENBQUEsQ0FBeEQsQ0FBZixDQUFBO0FBQUEsTUFFQSxZQUFZLENBQUMsSUFBYixDQUFrQixxQkFBbEIsQ0FBd0MsQ0FBQyxJQUF6QyxDQUE4QyxTQUE5QyxFQUF5RCxLQUF6RCxDQUErRCxDQUFDLE9BQWhFLENBQXdFLFFBQXhFLENBRkEsQ0FBQTtBQUFBLE1BSUEsWUFBWSxDQUFDLFdBQWIsQ0FBeUIsU0FBekIsQ0FKQSxDQUFBO0FBQUEsTUFNQSxTQUFTLENBQUMsUUFBVixDQUFtQixTQUFuQixDQU5BLENBQUE7QUFBQSxNQVFBLFFBQVEsQ0FBQyxJQUFULENBQWMsU0FBZCxFQUF5QixJQUF6QixDQVJBLENBQUE7YUFVQSxRQUFRLENBQUMsT0FBVCxDQUFpQixRQUFqQixFQWxCRjtLQWZ1QjtFQUFBLENBL0R6QixDQUFBOztBQUFBLDBCQW9HQSxvQkFBQSxHQUFzQixTQUFDLENBQUQsR0FBQTtBQUVwQixRQUFBLHFCQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsVUFBRCxDQUFBLENBQUg7QUFFRSxhQUFPLEtBQVAsQ0FGRjtLQUZBO0FBQUEsSUFNQSxZQUFBLEdBQWUsSUFBQyxDQUFBLEdBQUcsQ0FBQyxPQUFMLENBQWEsa0JBQWIsQ0FBZ0MsQ0FBQyxJQUFqQyxDQUFzQyx5QkFBdEMsQ0FOZixDQUFBO0FBQUEsSUFRQSxZQUFZLENBQUMsV0FBYixDQUF5QixTQUF6QixDQUFtQyxDQUFDLElBQXBDLENBQXlDLE9BQXpDLENBQWlELENBQUMsR0FBbEQsQ0FBc0QsS0FBdEQsQ0FBNEQsQ0FBQyxPQUE3RCxDQUFxRSxRQUFyRSxDQVJBLENBQUE7QUFBQSxJQVVBLE9BQUEsR0FBVSxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSx5QkFBVixDQUVSLENBQUMsUUFGTyxDQUVFLFNBRkYsQ0FWVixDQUFBO0FBY0EsSUFBQSxJQUFHLE9BQU8sQ0FBQyxRQUFSLENBQWlCLFNBQWpCLENBQUg7QUFFRSxNQUFBLElBQUMsQ0FBQSxRQUFRLENBQUMsSUFBVixDQUFlLFNBQWYsRUFBMEIsSUFBMUIsQ0FBQSxDQUFBO0FBQUEsTUFFQSxJQUFDLENBQUEsUUFBUSxDQUFDLEdBQVYsQ0FBYyxJQUFkLENBRkEsQ0FBQTthQUlBLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixDQUFrQixRQUFsQixFQU5GO0tBQUEsTUFBQTtBQVVFLE1BQUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxJQUFWLENBQWUsU0FBZixFQUEwQixLQUExQixDQUFBLENBQUE7QUFBQSxNQUVBLElBQUMsQ0FBQSxRQUFRLENBQUMsR0FBVixDQUFjLEtBQWQsQ0FGQSxDQUFBO0FBQUEsTUFJQSxJQUFDLENBQUEsUUFBUSxDQUFDLE9BQVYsQ0FBa0IsUUFBbEIsQ0FKQSxDQUFBO2FBTUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixXQUExQixFQWhCRjtLQWhCb0I7RUFBQSxDQXBHdEIsQ0FBQTs7QUFBQSwwQkF1SUEsdUJBQUEsR0FBeUIsU0FBQyxDQUFELEdBQUE7QUFFdkIsUUFBQSxPQUFBO0FBQUEsSUFBQSxDQUFDLENBQUMsY0FBRixDQUFBLENBQUEsQ0FBQTtBQUVBLElBQUEsSUFBRyxJQUFDLENBQUEsVUFBRCxDQUFBLENBQUg7QUFFRSxhQUFPLEtBQVAsQ0FGRjtLQUZBO0FBTUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHlCQUFWLENBQW9DLENBQUMsTUFBckMsR0FBOEMsQ0FBakQ7QUFFRSxhQUFPLElBQUMsQ0FBQSxvQkFBRCxDQUFzQixDQUF0QixDQUFQLENBRkY7S0FOQTtBQUFBLElBVUEsT0FBQSxHQUFVLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLHlCQUFWLENBRVIsQ0FBQyxXQUZPLENBRUssU0FGTCxDQVZWLENBQUE7QUFjQSxJQUFBLElBQUcsT0FBTyxDQUFDLFFBQVIsQ0FBaUIsU0FBakIsQ0FBSDtBQUVFLE1BQUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxJQUFWLENBQWUsU0FBZixFQUEwQixJQUExQixDQUFBLENBQUE7QUFBQSxNQUVBLElBQUMsQ0FBQSxRQUFRLENBQUMsR0FBVixDQUFjLElBQWQsQ0FGQSxDQUFBO2FBSUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxPQUFWLENBQWtCLFFBQWxCLEVBTkY7S0FBQSxNQUFBO0FBU0UsTUFBQSxJQUFDLENBQUEsUUFBUSxDQUFDLElBQVYsQ0FBZSxTQUFmLEVBQTBCLEtBQTFCLENBQUEsQ0FBQTtBQUFBLE1BRUEsSUFBQyxDQUFBLFFBQVEsQ0FBQyxHQUFWLENBQWMsS0FBZCxDQUZBLENBQUE7QUFBQSxNQUlBLElBQUMsQ0FBQSxRQUFRLENBQUMsT0FBVixDQUFrQixRQUFsQixDQUpBLENBQUE7YUFNQSxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLFdBQTFCLEVBZkY7S0FoQnVCO0VBQUEsQ0F2SXpCLENBQUE7O0FBQUEsMEJBMEtBLFlBQUEsR0FBYyxTQUFDLENBQUQsR0FBQTtBQUNaLFdBQU8sQ0FBUCxDQURZO0VBQUEsQ0ExS2QsQ0FBQTs7QUFBQSwwQkE4S0EsZ0JBQUEsR0FBa0IsU0FBQyxDQUFELEdBQUE7V0FFaEIsSUFBQyxDQUFBLFVBQUQsR0FBYyxLQUZFO0VBQUEsQ0E5S2xCLENBQUE7O0FBQUEsMEJBbUxBLGVBQUEsR0FBaUIsU0FBQyxDQUFELEdBQUE7V0FFZixJQUFDLENBQUEsVUFBRCxHQUFjLE1BRkM7RUFBQSxDQW5MakIsQ0FBQTs7QUFBQSwwQkF3TEEsV0FBQSxHQUFhLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBRyxJQUFDLENBQUEsT0FBRCxDQUFBLENBQUEsSUFBYyxJQUFDLENBQUEsVUFBVSxDQUFDLFVBQVosS0FBMEIsS0FBM0M7QUFFRSxNQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLFVBQWQsQ0FBQSxDQUFBO0FBQUEsTUFFQSxJQUFDLENBQUEsVUFBVSxDQUFDLFVBQVosR0FBeUIsSUFGekIsQ0FBQTtBQUFBLE1BSUEsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLFFBQVYsQ0FBbUIsVUFBbkIsQ0FKQSxDQUFBO0FBQUEsTUFNQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFoQixDQUFxQixnQkFBckIsQ0FBc0MsQ0FBQyxXQUF2QyxDQUFtRCxTQUFuRCxDQU5BLENBQUE7YUFRQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFoQixDQUFzQixrQ0FBQSxHQUFrQyxJQUFDLENBQUEsU0FBbkMsR0FBNkMsSUFBbkUsQ0FBdUUsQ0FBQyxRQUF4RSxDQUFpRixTQUFqRixFQVZGO0tBRlc7RUFBQSxDQXhMYixDQUFBOztBQUFBLDBCQXVNQSxXQUFBLEdBQWEsU0FBQSxHQUFBO0FBRVgsSUFBQSxJQUFHLElBQUMsQ0FBQSxPQUFELENBQUEsQ0FBSDtBQUVFLE1BQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxXQUFMLENBQWlCLFVBQWpCLENBQUEsQ0FBQTtBQUFBLE1BRUEsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLFdBQVYsQ0FBc0IsVUFBdEIsQ0FGQSxDQUFBO0FBQUEsTUFJQSxJQUFDLENBQUEsVUFBVSxDQUFDLFVBQVosR0FBeUIsS0FKekIsQ0FBQTthQU1BLElBQUMsQ0FBQSxVQUFVLENBQUMsR0FBRyxDQUFDLElBQWhCLENBQXFCLGdCQUFyQixDQUFzQyxDQUFDLFdBQXZDLENBQW1ELFNBQW5ELEVBUkY7S0FGVztFQUFBLENBdk1iLENBQUE7O0FBQUEsMEJBb05BLGVBQUEsR0FBaUIsU0FBQSxHQUFBO0FBRWYsSUFBQSxJQUFHLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLGVBQVYsQ0FBMEIsQ0FBQyxRQUEzQixDQUFvQyxjQUFwQyxDQUFIO0FBRUUsYUFBTyxLQUFQLENBRkY7S0FBQTtBQUFBLElBSUEsQ0FBQSxDQUFFLHVCQUFGLENBQTBCLENBQUMsV0FBM0IsQ0FBdUMsVUFBdkMsQ0FKQSxDQUFBO0FBQUEsSUFNQSxJQUFDLENBQUEsVUFBVSxDQUFDLFVBQVosR0FBeUIsS0FOekIsQ0FBQTtBQUFBLElBUUEsQ0FBQSxDQUFFLE1BQUYsQ0FBUyxDQUFDLFdBQVYsQ0FBc0IsVUFBdEIsQ0FSQSxDQUFBO0FBQUEsSUFVQSxJQUFDLENBQUEsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFoQixDQUFxQixnQkFBckIsQ0FBc0MsQ0FBQyxXQUF2QyxDQUFtRCxTQUFuRCxDQVZBLENBQUE7V0FZQSxJQUFDLENBQUEsV0FBRCxDQUFBLEVBZGU7RUFBQSxDQXBOakIsQ0FBQTs7QUFBQSwwQkFxT0EsaUJBQUEsR0FBbUIsU0FBQyxDQUFELEdBQUE7QUFDakIsV0FBTyxLQUFQLENBRGlCO0VBQUEsQ0FyT25CLENBQUE7O0FBQUEsMEJBeU9BLGlCQUFBLEdBQW1CLFNBQUMsQ0FBRCxHQUFBO0FBSWpCLFFBQUEsaURBQUE7QUFBQSxJQUFBLElBQUcsSUFBQyxDQUFBLFNBQUQsS0FBYyxZQUFqQjtBQUVFLE1BQUEsT0FBQSxHQUFVLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUFWLENBQUE7QUFBQSxNQUVBLEtBQUEsR0FBUSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxJQUFuQixDQUF3QixJQUF4QixDQUZSLENBQUE7QUFBQSxNQUlBLEtBQUEsR0FBUSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxJQUFuQixDQUF3QixPQUF4QixDQUpSLENBQUE7QUFBQSxNQU1BLFFBQUEsR0FBVyxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxJQUFuQixDQUF3QixNQUF4QixDQU5YLENBQUE7QUFRQSxNQUFBLElBQUcsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQWtCLENBQUMsSUFBbkIsQ0FBd0IsU0FBeEIsQ0FBSDtBQUVFLFFBQUEsSUFBQyxDQUFBLFVBQVUsQ0FBQyxpQkFBWixDQUE4QixRQUE5QixFQUF3QyxLQUF4QyxFQUErQyxJQUEvQyxDQUFBLENBRkY7T0FBQSxNQUFBO0FBTUUsUUFBQSxJQUFDLENBQUEsVUFBVSxDQUFDLGlCQUFaLENBQThCLFFBQTlCLEVBQXdDLEtBQXhDLEVBQStDLEtBQS9DLENBQUEsQ0FORjtPQVZGO0tBQUEsTUFBQTtBQW9CRSxNQUFBLEtBQUEsR0FBUSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxHQUFuQixDQUFBLENBQVIsQ0FBQTtBQUFBLE1BRUEsT0FBQSxHQUFVLENBQUEsQ0FBRSxDQUFDLENBQUMsYUFBSixDQUFrQixDQUFDLElBQW5CLENBQXdCLElBQXhCLENBRlYsQ0FBQTtBQUlBLE1BQUEsSUFBRyxJQUFDLENBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBN0IsS0FBbUMsU0FBdEM7QUFFRSxRQUFBLE9BQUEsR0FBVSxDQUFBLENBQUUsQ0FBQyxDQUFDLE1BQUosQ0FBVyxDQUFDLE9BQVosQ0FBb0IsZUFBcEIsQ0FBb0MsQ0FBQyxJQUFyQyxDQUEwQyxpQkFBMUMsQ0FBVixDQUFBO0FBRUEsUUFBQSxJQUFBLENBQUEsT0FBQTtBQUNFLGdCQUFBLENBREY7U0FGQTtBQUFBLFFBS0EsSUFBQyxDQUFBLFVBQVUsQ0FBQyxZQUFaLENBQXlCLE9BQXpCLEVBQWtDLEtBQWxDLEVBQXlDLElBQXpDLEVBQStDLE9BQS9DLENBTEEsQ0FGRjtPQUFBLE1BQUE7QUFVRSxRQUFBLElBQUMsQ0FBQSxVQUFVLENBQUMsWUFBWixDQUF5QixPQUF6QixFQUFrQyxLQUFsQyxFQUF5QyxLQUF6QyxDQUFBLENBVkY7T0FKQTtBQWdCQSxNQUFBLElBQUcsSUFBQyxDQUFBLFNBQUQsS0FBYyxTQUFqQjtBQUVFLFFBQUEsSUFBRyxLQUFBLENBQU0sUUFBQSxDQUFTLEtBQVQsQ0FBTixDQUFIO0FBRUUsVUFBQSxDQUFBLENBQUUsQ0FBQyxDQUFDLGFBQUosQ0FBa0IsQ0FBQyxHQUFuQixDQUF1QixFQUF2QixDQUFBLENBQUE7QUFFQSxnQkFBQSxDQUpGO1NBQUEsTUFBQTtBQVFFLFVBQUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFsQixDQUEwQixjQUExQixFQUEwQyxPQUExQyxFQUFtRCxLQUFuRCxDQUFBLENBUkY7U0FGRjtPQXBDRjtLQUFBO0FBZ0RBLFdBQU8sSUFBQyxDQUFBLFVBQVUsQ0FBQyxxQkFBWixDQUFrQyxPQUFsQyxFQUEyQyxLQUEzQyxFQUFrRCxJQUFDLENBQUEsU0FBbkQsQ0FBUCxDQXBEaUI7RUFBQSxDQXpPbkIsQ0FBQTs7QUFBQSwwQkFvU0EsV0FBQSxHQUFhLFNBQUEsR0FBQTtBQUVYLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsSUFBQyxDQUFBLFNBQWYsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsUUFBRCxHQUFZLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFVLE9BQVYsQ0FGWixDQUFBO0FBSUEsSUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQWxCLEtBQTJCLEVBQTNCLElBQWlDLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLElBQWxCLEtBQTBCLE1BQTlEO0FBRUUsTUFBQSxJQUFDLENBQUEsR0FBRyxDQUFDLFFBQUwsQ0FBYyxNQUFkLENBQUEsQ0FGRjtLQUpBO0FBQUEsSUFRQSxJQUFDLENBQUEsVUFBRCxHQUFjLElBUmQsQ0FBQTtXQVVBLElBQUMsQ0FBQSxVQUFELEdBQWMsTUFaSDtFQUFBLENBcFNiLENBQUE7O0FBQUEsMEJBb1RBLE9BQUEsR0FBUyxTQUFBLEdBQUE7QUFFUCxXQUFPLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLFVBQWQsQ0FBUCxDQUZPO0VBQUEsQ0FwVFQsQ0FBQTs7QUFBQSwwQkF5VEEsT0FBQSxHQUFTLFNBQUMsQ0FBRCxHQUFBO1dBRVAsSUFBQyxDQUFBLEdBQUcsQ0FBQyxRQUFMLENBQWMsTUFBZCxFQUZPO0VBQUEsQ0F6VFQsQ0FBQTs7QUFBQSwwQkE4VEEsTUFBQSxHQUFRLFNBQUMsQ0FBRCxHQUFBO0FBRU4sUUFBQSxjQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsQ0FBQSxDQUFFLENBQUMsQ0FBQyxhQUFKLENBQVYsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFRLE9BQU8sQ0FBQyxHQUFSLENBQUEsQ0FGUixDQUFBO0FBSUEsSUFBQSxJQUFHLEtBQUEsS0FBUyxFQUFaO0FBRUUsTUFBQSxJQUFBLENBQUEsT0FBYyxDQUFDLEVBQVIsQ0FBVyxRQUFYLENBQVA7ZUFFRSxJQUFDLENBQUEsR0FBRyxDQUFDLFdBQUwsQ0FBaUIsTUFBakIsRUFGRjtPQUZGO0tBTk07RUFBQSxDQTlUUixDQUFBOztBQUFBLDBCQTJVQSxVQUFBLEdBQVksU0FBQSxHQUFBO0FBRVYsV0FBTyxJQUFDLENBQUEsR0FBRyxDQUFDLElBQUwsQ0FBVSxlQUFWLENBQTBCLENBQUMsUUFBM0IsQ0FBb0MsY0FBcEMsQ0FBUCxDQUZVO0VBQUEsQ0EzVVosQ0FBQTs7QUFBQSwwQkFxVkEsTUFBQSxHQUFRLFNBQUEsR0FBQTtXQUVOLHdDQUFBLEVBRk07RUFBQSxDQXJWUixDQUFBOztBQUFBLDBCQTBWQSxrQkFBQSxHQUFvQixTQUFBLEdBQUE7QUFFbEIsUUFBQSxVQUFBO0FBQUEsSUFBQSxVQUFBLEdBQWEsRUFBYixDQUFBO0FBQUEsSUFFQSxVQUFXLENBQUEsSUFBQyxDQUFBLFNBQUQsQ0FBWCxHQUF5QixJQUZ6QixDQUFBO0FBSUEsV0FBTyxVQUFQLENBTmtCO0VBQUEsQ0ExVnBCLENBQUE7O0FBQUEsMEJBb1dBLGFBQUEsR0FBZSxTQUFBLEdBQUE7QUFFYixRQUFBLDJFQUFBO0FBQUEsSUFBQSxlQUFBLEdBQWtCLElBQUMsQ0FBQSxrQkFBRCxDQUFBLENBQWxCLENBQUE7QUFHQSxJQUFBLElBQUcsSUFBQyxDQUFBLFNBQUQsS0FBYyxVQUFqQjtBQUVFLGFBQU87QUFBQSxRQUVMLElBQUEsRUFBTSxlQUZEO0FBQUEsUUFJTCxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUpSO09BQVAsQ0FGRjtLQUFBLE1BVUssSUFBRyxJQUFDLENBQUEsU0FBRCxLQUFjLE9BQWpCO0FBRUgsYUFBTztBQUFBLFFBRUwsSUFBQSxFQUFNLGVBRkQ7QUFBQSxRQUlMLElBQUEsRUFBTSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBSlI7T0FBUCxDQUZHO0tBQUEsTUFVQSxJQUFHLElBQUMsQ0FBQSxTQUFELEtBQWMsTUFBakI7QUFFSCxhQUFPO0FBQUEsUUFFTCxJQUFBLEVBQU0sZUFGRDtBQUFBLFFBSUwsSUFBQSxFQUFNLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFKUjtPQUFQLENBRkc7S0FBQSxNQVVBLElBQUcsSUFBQyxDQUFBLFNBQUQsS0FBYyxTQUFqQjtBQUVILE1BQUEsSUFBRyxJQUFDLENBQUEsVUFBVSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBN0IsS0FBbUMsU0FBbkMsSUFBZ0QsSUFBQyxDQUFBLFVBQVUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQTdCLEtBQXFDLFNBQXhGO0FBRUUsUUFBQSxJQUFHLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFqQyxLQUEyQyxDQUE5QztBQUVFLFVBQUEsZUFBQSxHQUFrQixXQUFXLENBQUMsUUFBUSxDQUFDLGNBQXJCLENBQUEsQ0FBbEIsQ0FBQTtBQUFBLFVBRUEsY0FBQSxHQUFpQixLQUZqQixDQUFBO0FBQUEsVUFJQSxDQUFDLENBQUMsSUFBRixDQUFPLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFBVSxDQUFDLGNBQXpCLEVBQXlDLENBQUEsU0FBQSxLQUFBLEdBQUE7bUJBQUEsU0FBQyxFQUFELEdBQUE7cUJBRXZDLENBQUMsQ0FBQyxJQUFGLENBQU8sZUFBUCxFQUF3QixTQUFDLFVBQUQsR0FBQTtBQUV0QixnQkFBQSxJQUFHLEVBQUEsS0FBTSxVQUFUO3lCQUVFLGNBQUEsR0FBaUIsS0FGbkI7aUJBRnNCO2NBQUEsQ0FBeEIsRUFGdUM7WUFBQSxFQUFBO1VBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF6QyxDQUpBLENBQUE7QUFnQkEsVUFBQSxJQUFBLENBQUEsY0FBQTtBQUVFLG1CQUFPLEtBQVAsQ0FGRjtXQWxCRjtTQUZGO09BQUE7QUEwQkEsYUFBTztBQUFBLFFBRUwsSUFBQSxFQUFNLGVBRkQ7QUFBQSxRQUlMLElBQUEsRUFBTSxJQUFDLENBQUEsS0FBSyxDQUFDLFVBSlI7T0FBUCxDQTVCRztLQUFBLE1Bb0NBLElBQUcsSUFBQyxDQUFBLFNBQUQsS0FBYyxZQUFqQjtBQUVILGFBQU87QUFBQSxRQUVMLElBQUEsRUFBTSxlQUZEO0FBQUEsUUFJTCxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUpSO09BQVAsQ0FGRztLQUFBLE1BVUEsSUFBRyxJQUFDLENBQUEsU0FBRCxLQUFjLE1BQWpCO0FBRUgsTUFBQSxTQUFBLEdBQVksZ0JBQWlCLENBQUEsSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBbEIsQ0FBN0IsQ0FBQTtBQUFBLE1BRUEsY0FBQSxHQUFpQixFQUZqQixDQUFBO0FBQUEsTUFJQSxDQUFDLENBQUMsSUFBRixDQUFPLFNBQVAsRUFBa0IsQ0FBQSxTQUFBLEtBQUEsR0FBQTtlQUFBLFNBQUMsS0FBRCxHQUFBO0FBRWhCLFVBQUEsSUFBRyxLQUFLLENBQUMsSUFBVDtBQUVFLFlBQUEsSUFBRyxLQUFLLENBQUMsSUFBTixLQUFjLFVBQWQsSUFBNEIsS0FBSyxDQUFDLElBQU4sS0FBYyxVQUE3QztBQUVFLGNBQUEsSUFBRyxLQUFLLENBQUMsUUFBTixLQUFrQixJQUFyQjt1QkFFRSxjQUFjLENBQUMsSUFBZixDQUFvQixLQUFLLENBQUMsS0FBMUIsRUFGRjtlQUZGO2FBQUEsTUFNSyxJQUFHLEtBQUssQ0FBQyxJQUFOLEtBQWMsWUFBakI7QUFFSCxjQUFBLElBQUcsS0FBSyxDQUFDLEVBQU4sS0FBWSxjQUFmO3VCQUVFLGNBQWMsQ0FBQyxJQUFmLENBQW9CLEtBQUssQ0FBQyxhQUExQixFQUZGO2VBRkc7YUFSUDtXQUZnQjtRQUFBLEVBQUE7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQWxCLENBSkEsQ0FBQTtBQUFBLE1Bd0JBLElBQUMsQ0FBQSxHQUFHLENBQUMsUUFBTCxDQUFjLGFBQWQsQ0F4QkEsQ0FBQTtBQTBCQSxNQUFBLElBQUcsY0FBYyxDQUFDLE1BQWYsS0FBeUIsQ0FBNUI7QUFFRSxRQUFBLGNBQWMsQ0FBQyxJQUFmLENBQW9CLGlCQUFwQixDQUFBLENBRkY7T0ExQkE7QUE4QkEsYUFBTztBQUFBLFFBRUwsV0FBQSxFQUFhLGNBRlI7QUFBQSxRQUlMLElBQUEsRUFBTSxlQUpEO0FBQUEsUUFNTCxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxVQU5SO09BQVAsQ0FoQ0c7S0FBQSxNQTBDQSxJQUFHLElBQUMsQ0FBQSxTQUFELEtBQWMsVUFBakI7QUFFSCxhQUFPO0FBQUEsUUFFTCxJQUFBLEVBQU0sZUFGRDtBQUFBLFFBSUwsSUFBQSxFQUFNLElBQUMsQ0FBQSxLQUFLLENBQUMsVUFKUjtPQUFQLENBRkc7S0FBQSxNQVNBLElBQUcsSUFBQyxDQUFBLFNBQUQsS0FBYyxNQUFqQjtBQUVILGFBQU87QUFBQSxRQUVMLElBQUEsRUFBTSxlQUZEO0FBQUEsUUFJTCxJQUFBLEVBQU0sSUFBQyxDQUFBLEtBQUssQ0FBQyxVQUpSO09BQVAsQ0FGRztLQXBJUTtFQUFBLENBcFdmLENBQUE7O3VCQUFBOztHQUgyQyxLQWY3QyxDQUFBOzs7OztBQ0FBLElBQUEsSUFBQTtFQUFBO2lTQUFBOztBQUFBLE9BQUEsQ0FBUSwwQkFBUixDQUFBLENBQUE7O0FBQUE7QUFJRSx5QkFBQSxDQUFBOzs7O0dBQUE7O0FBQUE7QUFBQTs7O0tBQUE7O0FBQUEsaUJBT0EsUUFBQSxHQUFVLFNBQUEsR0FBQSxDQVBWLENBQUE7O0FBQUEsaUJBWUEsYUFBQSxHQUFlLFNBQUEsR0FBQSxDQVpmLENBQUE7O0FBY0E7QUFBQTs7O0tBZEE7O0FBQUEsaUJBcUJBLFVBQUEsR0FBWSxTQUFBLEdBQUE7V0FDVixJQUFDLENBQUEsTUFBRCxHQUFVLENBQUMsQ0FBQyxJQUFGLENBQVEsSUFBQyxDQUFBLE1BQVQsRUFBaUIsSUFBakIsRUFEQTtFQUFBLENBckJaLENBQUE7O0FBQUEsaUJBMkJBLE1BQUEsR0FBUSxTQUFBLEdBQUE7QUFDTixJQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFXLElBQUMsQ0FBQSxRQUFELENBQVcsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFYLENBQVgsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBRkEsQ0FBQTtBQUlBLFdBQU8sSUFBUCxDQUxNO0VBQUEsQ0EzQlIsQ0FBQTs7QUFBQSxpQkFxQ0EsV0FBQSxHQUFhLFNBQUEsR0FBQSxDQXJDYixDQUFBOztBQXVDQTtBQUFBOzs7S0F2Q0E7O0FBMkNBO0FBQUE7OztLQTNDQTs7QUErQ0E7QUFBQTs7O0tBL0NBOztjQUFBOztHQUZpQixRQUFRLENBQUMsS0FGNUIsQ0FBQTs7QUFBQSxNQXVETSxDQUFDLE9BQVAsR0FBaUIsSUF2RGpCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2hpbnQgZXFudWxsOiB0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuXG52YXIgSGFuZGxlYmFycyA9IHt9O1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZFUlNJT04gPSBcIjEuMC4wXCI7XG5IYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OID0gNDtcblxuSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcblxuSGFuZGxlYmFycy5oZWxwZXJzICA9IHt9O1xuSGFuZGxlYmFycy5wYXJ0aWFscyA9IHt9O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGZ1bmN0aW9uVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyID0gZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsID0gZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcblxuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm4odGhpcyk7XG4gIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5LID0gZnVuY3Rpb24oKSB7fTtcblxuSGFuZGxlYmFycy5jcmVhdGVGcmFtZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24ob2JqZWN0KSB7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBvYmplY3Q7XG4gIHZhciBvYmogPSBuZXcgSGFuZGxlYmFycy5LKCk7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBudWxsO1xuICByZXR1cm4gb2JqO1xufTtcblxuSGFuZGxlYmFycy5sb2dnZXIgPSB7XG4gIERFQlVHOiAwLCBJTkZPOiAxLCBXQVJOOiAyLCBFUlJPUjogMywgbGV2ZWw6IDMsXG5cbiAgbWV0aG9kTWFwOiB7MDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcid9LFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChIYW5kbGViYXJzLmxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IEhhbmRsZWJhcnMubG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy5sb2cgPSBmdW5jdGlvbihsZXZlbCwgb2JqKSB7IEhhbmRsZWJhcnMubG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgZGF0YSA9IEhhbmRsZWJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgfVxuXG4gIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgaWYoY29udGV4dCBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYoZGF0YSkgeyBkYXRhLmtleSA9IGtleTsgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihpID09PSAwKXtcbiAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb25kaXRpb25hbCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICBpZighY29uZGl0aW9uYWwgfHwgSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZufSk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmICghSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgSGFuZGxlYmFycy5sb2cobGV2ZWwsIGNvbnRleHQpO1xufSk7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WTSA9IHtcbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKHRlbXBsYXRlU3BlYykge1xuICAgIC8vIEp1c3QgYWRkIHdhdGVyXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICAgIGludm9rZVBhcnRpYWw6IEhhbmRsZWJhcnMuVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgICB9LFxuICAgICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgICAgcmV0ID0ge307XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogSGFuZGxlYmFycy5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgICAgbm9vcDogSGFuZGxlYmFycy5WTS5ub29wLFxuICAgICAgY29tcGlsZXJJbmZvOiBudWxsXG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChjb250YWluZXIsIEhhbmRsZWJhcnMsIGNvbnRleHQsIG9wdGlvbnMuaGVscGVycywgb3B0aW9ucy5wYXJ0aWFscywgb3B0aW9ucy5kYXRhKTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyA9IGNvbnRhaW5lci5jb21waWxlckluZm8gfHwgW10sXG4gICAgICAgICAgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IEhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxuXG4gIHByb2dyYW1XaXRoRGVwdGg6IGZ1bmN0aW9uKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IDA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIG5vb3A6IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJcIjsgfSxcbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKCFIYW5kbGViYXJzLmNvbXBpbGUpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gSGFuZGxlYmFycy5jb21waWxlKHBhcnRpYWwsIHtkYXRhOiBkYXRhICE9PSB1bmRlZmluZWR9KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMudGVtcGxhdGUgPSBIYW5kbGViYXJzLlZNLnRlbXBsYXRlO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG5cbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gQkVHSU4oQlJPV1NFUilcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5IYW5kbGViYXJzLkV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufTtcbkhhbmRsZWJhcnMuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuSGFuZGxlYmFycy5TYWZlU3RyaW5nID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufTtcbkhhbmRsZWJhcnMuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5nLnRvU3RyaW5nKCk7XG59O1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxudmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn07XG5cbkhhbmRsZWJhcnMuVXRpbHMgPSB7XG4gIGV4dGVuZDogZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXNjYXBlRXhwcmVzc2lvbjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBIYW5kbGViYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsIHx8IHN0cmluZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9IHN0cmluZy50b1N0cmluZygpO1xuXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZih0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMnKS5jcmVhdGUoKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcycpLmF0dGFjaChleHBvcnRzKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzJykuYXR0YWNoKGV4cG9ydHMpIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgREVTSUdOIFdJWkFSRFxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cblxuQXBwbGljYXRpb24gPSBcblxuICBpbml0aWFsaXplOiAtPlxuXG4gICAgQFdpemFyZENvbmZpZyA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb25maWcnKVxuXG4gICAgQHRpbWVsaW5lRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGEnKVxuXG4gICAgQHRpbWVsaW5lRGF0YUFsdCA9IHJlcXVpcmUoJy4vZGF0YS9UaW1lbGluZURhdGFBbHQnKVxuXG4gICAgIyBJbXBvcnQgdmlld3NcbiAgICBIb21lVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvSG9tZVZpZXcnKVxuXG4gICAgTG9naW5WaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Mb2dpblZpZXcnKVxuXG4gICAgUm91dGVyID0gcmVxdWlyZSgnLi9yb3V0ZXJzL1JvdXRlcicpXG5cbiAgICBJbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuICAgIE91dHB1dFZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL091dHB1dFZpZXcnKVxuXG5cbiAgICAjIEluaXRpYWxpemUgdmlld3NcbiAgICBAaG9tZVZpZXcgPSBuZXcgSG9tZVZpZXcoKVxuXG4gICAgQGxvZ2luVmlldyA9IG5ldyBMb2dpblZpZXcoKVxuXG4gICAgQGlucHV0SXRlbVZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldygpXG5cbiAgICBAb3V0cHV0VmlldyA9IG5ldyBPdXRwdXRWaWV3KClcblxuICAgIEByb3V0ZXIgPSBuZXcgUm91dGVyKClcblxuICAgIFxuICAgIFxubW9kdWxlLmV4cG9ydHMgPSBBcHBsaWNhdGlvbiIsIkxvZ2luQ29udGVudCA9IFxuICBpZDogXCJpbnRyb1wiXG4gIHRpdGxlOiAnPGNlbnRlcj5XZWxjb21lIHRvIHRoZTxiciAvPkFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCE8L2NlbnRlcj4nXG4gIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICBpbnN0cnVjdGlvbnM6ICcnXG4gIGlucHV0czogW11cbiAgc2VjdGlvbnM6IFtcbiAgICB7XG4gICAgICBjb250ZW50OiBbXG4gICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCBoZWxwIHlvdSB0byBlYXNpbHkgY3JlYXRlIGEgY3VzdG9taXplZCBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnQgYW5kIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLjwvcD5cIlxuICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+V2hlbiB5b3XigJlyZSBmaW5pc2hlZCwgeW91J2xsIGhhdmUgYSByZWFkeS10by11c2UgbGVzc29uIHBsYW4sIHdpdGggd2Vla2x5IGFzc2lnbm1lbnRzLCBwdWJsaXNoZWQgZGlyZWN0bHkgb250byBhIHNhbmRib3ggcGFnZSBvbiBXaWtpcGVkaWEgd2hlcmUgeW91IGNhbiBjdXN0b21pemUgaXQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5MZXTigJlzIHN0YXJ0IGJ5IGZpbGxpbmcgaW4gc29tZSBiYXNpY3MgYWJvdXQgeW91IGFuZCB5b3VyIGNvdXJzZTo8L3A+XCJcbiAgICAgIF1cbiAgICB9XG4gIF1cbiAgXG5cblxubW9kdWxlLmV4cG9ydHMgPSBMb2dpbkNvbnRlbnRcbiIsIiMjIFRISVMgRklMRVMgSVMgVVNFRCBBUyBUSEUgTUFTVEVSIEZPUiBBTEwgV0lLSSBPVVQgUkVMQVRFRCBUTyBUSEUgTUFJTiBBU1NJR05NRU5UIFRZUEUgIyNcbiMjIFRIRSBCUkVBSyBBUkUgVVNFRCBUTyBERVRFUk1JTkUgSE9XIFRIRSBBU1NJR05NRU5UIEVYUEFORFMgQU5EIENPTlRSQUNUIEJBU0VEIE9OIENPVVJTRSBMRU5HVEggIyNcbiMjIFRIRSBhY3Rpb24gVkFSSUFCTEUgSVMgVVNFRCBUTyBERVRFUk1JTkUgV0hFVEhFUiBPUiBOT1QgVEhFIENPTlRFTlQgSVMgQ09NQklORUQgV0lUSCBJVFMgUFJFREVDRVNPUiBPUiBXSEVUSEVSIElUUyBPTUlUVEVEIEFMTCBUT0dFVEhFUiMjXG5cblRpbWVsaW5lRGF0YSA9IFtcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgdGl0bGU6IFsnV2lraXBlZGlhIGVzc2VudGlhbHMnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdJbnRybyB0byBXaWtpcGVkaWEnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ludHJvIHRvIFdpa2lwZWRpYX19J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW11cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogNVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRWRpdGluZyBiYXNpY3MnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFZGl0aW5nIGJhc2ljcyBpbiBjbGFzcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbXBsZXRlIHRoZSB0cmFpbmluZydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgdGhlIHRyYWluaW5nfX0nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXAnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NyZWF0ZSB1c2VycGFnZSBhbmQgc2lnbiB1cH19J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnUHJhY3RpY2UgY29tbXVuaWNhdGluZydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319J1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdTdHVkZW50cyBlbnJvbGxlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgZW5yb2xsZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiA4XG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydFeHBsb3JpbmcgdGhlIHRvcGljIGFyZWEnXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdFZGl0aW5nIGJhc2ljcyBpbiBjbGFzcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0V2YWx1YXRlIGFuIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFuIGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5nZXR0aW5nX3N0YXJ0ZWQuY3JpdGlxdWVfYXJ0aWNsZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5nZXR0aW5nX3N0YXJ0ZWQuY29weV9lZGl0X2FydGljbGUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAwXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydVc2luZyBzb3VyY2VzIGFuZCBjaG9vc2luZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1VzaW5nIHNvdXJjZXMgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1VzaW5nIHNvdXJjZXMgaW4gY2xhc3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FkZCB0byBhbiBhcnRpY2xlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BZGQgdG8gYW4gYXJ0aWNsZX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmdldHRpbmdfc3RhcnRlZC5hZGRfdG9fYXJ0aWNsZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0lsbHVzdHJhdGUgYW4gYXJ0aWNsZSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSWxsdXN0cmF0ZSBhbiBhcnRpY2xlfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZ2V0dGluZ19zdGFydGVkLmlsbHVzdHJhdGVfYXJ0aWNsZS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0xpc3QgYXJ0aWNsZSBjaG9pY2VzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9MaXN0IGFydGljbGUgY2hvaWNlc319J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmNob29zaW5nX2FydGljbGVzLnN0dWRlbnRzX2V4cGxvcmUuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3QnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBhcnRpY2xlcyBmcm9tIGEgbGlzdH19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLmNob29zaW5nX2FydGljbGVzLnByZXBhcmVfbGlzdC5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IG5leHQgd2VlaydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gbmV4dCB3ZWVrIH19J1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRGlzY3VzcyB0b3BpY3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdTZWxlY3QgYXJ0aWNsZSBmcm9tIHN0dWRlbnQgY2hvaWNlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXN9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5jaG9vc2luZ19hcnRpY2xlcy5zdHVkZW50c19leHBsb3JlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ29tcGlsZSBhIGJpYmxpb2dyYXBoeSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGlsZSBhIGJpYmxpb2dyYXBoeX19J1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogN1xuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnZlbnRpb25hbCBvdXRsaW5lICdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmV9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5yZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBXaXphcmREYXRhLmRyYWZ0c19tYWluc3BhY2Uuc2FuZGJveC5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnZlbnRpb25hbCBvdXRsaW5lIHwgc2FuZGJveCA9IG5vJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5yZXNlYXJjaF9wbGFubmluZy5jcmVhdGVfb3V0bGluZS5zZWxlY3RlZCAmJiBXaXphcmREYXRhLmRyYWZ0c19tYWluc3BhY2Uud29ya19saXZlLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnT3V0bGluZSBhcyBsZWFkIHNlY3Rpb24nXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL091dGxpbmUgYXMgbGVhZCBzZWN0aW9ufX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucmVzZWFyY2hfcGxhbm5pbmcud3JpdGVfbGVhZC5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmcnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMFxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICd3ZWVrJ1xuICAgIGFjdGlvbjogJ2NvbWJpbmUnXG4gICAgdGl0bGU6IFsnTW92aW5nIGFydGljbGVzIHRvIHRoZSBtYWluIHNwYWNlJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTWFpbiBzcGFjZSBpbiBjbGFzcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnTW92ZSB0byBtYWluIHNwYWNlJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Nb3ZlIHRvIG1haW4gc3BhY2V9fSdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0RZSyBub21pbmF0aW9ucydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEuZHlrLmR5ay5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0V4cGFuZCB5b3VyIGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGFuZCB5b3VyIGFydGljbGV9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0J1aWxkaW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQnVpbGRpbmcgYXJ0aWNsZXMgaW4gY2xhc3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGUnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBvbmUgcGVlciByZXZpZXcgYXJ0aWNsZX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnNbMF0uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IHR3byB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzFdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSB0aHJlZSB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzJdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSBmb3VyIH19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnNbM10uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXMnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IGZpdmUgfX0nXG4gICAgICAgIGNvbmRpdGlvbjogJ1dpemFyZERhdGEucGVlcl9mZWVkYmFjay5wZWVyX3Jldmlld3Mub3B0aW9uc1s0XS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDJcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0NyZWF0aW5nIGZpcnN0IGRyYWZ0J11cbiAgICBpbl9jbGFzczogW1xuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQ29tcGxldGUgZmlyc3QgZHJhZnQnICMxRENcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDZcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0dldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0dyb3VwIHN1Z2dlc3Rpb25zJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Hcm91cCBzdWdnZXN0aW9uc319J1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRG8gb25lIHBlZXIgcmV2aWV3J1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBvbmUgcGVlciByZXZpZXd9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzBdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnRG8gcGVlciByZXZpZXdzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0gdHdvIH19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnBlZXJfZmVlZGJhY2sucGVlcl9yZXZpZXdzLm9wdGlvbnNbMV0uc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdEbyBwZWVyIHJldmlld3MnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSB0aHJlZSB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzJdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnRG8gcGVlciByZXZpZXdzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0gZm91ciB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzNdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnRG8gcGVlciByZXZpZXdzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0gZml2ZSB9fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5wZWVyX2ZlZWRiYWNrLnBlZXJfcmV2aWV3cy5vcHRpb25zWzRdLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBtaWxlc3RvbmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdBcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWQnXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19J1xuICAgICAgfVxuICAgIF1cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ1Jlc3BvbmRpbmcgdG8gZmVlZGJhY2snXVxuICAgIGluX2NsYXNzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdNZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9uJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdNYWtlIGVkaXRzIGJhc2VkIG9uIHBlZXIgcmV2aWV3cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3N9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQlJFQUsgXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ2JyZWFrJ1xuICAgIHZhbHVlOiAxXG4gIH1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICB7XG4gICAgdHlwZTogJ3dlZWsnXG4gICAgYWN0aW9uOiAnY29tYmluZSdcbiAgICB0aXRsZTogWydDb250aW51aW5nIGltcHJvdmluZyBhcnRpY2xlcyddXG4gICAgaW5fY2xhc3M6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0Rpc2N1c3MgZnVydGhlciBhcnRpY2xlIGltcHJvdmVtZW50cydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzfX0nXG4gICAgICB9XG4gICAgXVxuICAgIGFzc2lnbm1lbnRzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdDb250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXMnIFxuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db250aW51ZSBpbXByb3ZpbmcgYXJ0aWNsZXN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDNcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlcycgXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlc319JyBcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDRcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdvbWl0J1xuICAgIHRpdGxlOiBbJ0NvbnRpbnVpbmcgaW1wcm92aW5nIGFydGljbGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRGlzY3VzcyBmdXJ0aGVyIGFydGljbGUgaW1wcm92ZW1lbnRzJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGZ1cnRoZXIgYXJ0aWNsZSBpbXByb3ZlbWVudHN9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgYXNzaWdubWVudHM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0NvbnRpbnVlIGltcHJvdmluZyBhcnRpY2xlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udGludWUgaW1wcm92aW5nIGFydGljbGVzfX0nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6ICdQcmVwYXJlIGluLWNsYXNzIHByZXNlbnRhdGlvbidcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLmNsYXNzX3ByZXNlbnRhdGlvbi5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICBdXG4gICAgbWlsZXN0b25lczogW11cbiAgICByZWFkaW5nczogW11cbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBCUkVBSyBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnYnJlYWsnXG4gICAgdmFsdWU6IDlcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0ZpbmlzaGluZyB0b3VjaGVzJ11cbiAgICBpbl9jbGFzczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnSW4tY2xhc3MgcHJlc2VudGF0aW9ucydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMuY2xhc3NfcHJlc2VudGF0aW9uLnNlbGVjdGVkJ1xuICAgICAgfVxuICAgIF1cbiAgICBhc3NpZ25tZW50czogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlcydcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319J1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUmVmbGVjdGl2ZSBlc3NheX19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMucmVmbGVjdGl2ZV9lc3NheS5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICAgIHdpa2l0ZXh0OiAne3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dpa2lwZWRpYSBwb3J0Zm9saW99fSdcbiAgICAgICAgY29uZGl0aW9uOiAnV2l6YXJkRGF0YS5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzLnBvcnRmb2xpby5zZWxlY3RlZCdcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PcmlnaW5hbCBhcmd1bWVudCBwYXBlcn19J1xuICAgICAgICBjb25kaXRpb246ICdXaXphcmREYXRhLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMub3JpZ2luYWxfcGFwZXIuc2VsZWN0ZWQnXG4gICAgICB9XG4gICAgXVxuICAgIG1pbGVzdG9uZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZCdcbiAgICAgICAgd2lraXRleHQ6ICd7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX0nXG4gICAgICB9XG4gICAgXVxuICAgIHJlYWRpbmdzOiBbXVxuICB9XG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEJSRUFLIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAge1xuICAgIHR5cGU6ICdicmVhaydcbiAgICB2YWx1ZTogMTBcbiAgfVxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIHtcbiAgICB0eXBlOiAnd2VlaydcbiAgICBhY3Rpb246ICdjb21iaW5lJ1xuICAgIHRpdGxlOiBbJ0R1ZSBkYXRlJyBdXG4gICAgaW5fY2xhc3M6IFtdXG4gICAgYXNzaWdubWVudHM6IFtdXG4gICAgbWlsZXN0b25lczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiAnQWxsIHN0dWRlbnRzIGZpbmlzaGVkJ1xuICAgICAgICB3aWtpdGV4dDogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BbGwgc3R1ZGVudHMgZmluaXNoZWR9fSdcbiAgICAgIH1cbiAgICBdXG4gICAgcmVhZGluZ3M6IFtdXG4gIH1cbl1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lbGluZURhdGFcblxuIiwiIyMgVEhJUyBGSUxFIElOQ0xVREVTIFRIRSBXSUtJIE9VVFBVVCBURU1QTEFURSBDSFVOS1MgVVNFRCBGT1IgRklOQUwgT1VUUFVUIC0gRk9SIEFMVCBBU1NJR05NRU5UIFRZUEVTICMjXG5cblxuVGltZWxpbmVEYXRhQWx0ID0gXG4gIG11bHRpbWVkaWE6IFtcbiAgICBcIj09IElsbHVzdHJhdGluZyBXaWtpcGVkaWEgPT1cIlxuICAgIFwie3thc3NpZ25tZW50fX1cIlxuICAgIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19XCJcbiAgICBcIjxici8+e3tlbmQgb2YgY291cnNlIGFzc2lnbm1lbnR9fVwiXG4gIF1cbiAgY29weWVkaXQ6IFtcbiAgICBcIj09IENvcHllZGl0IFdpa2lwZWRpYSA9PVwiXG4gICAgXCJ7e2Fzc2lnbm1lbnR9fVwiXG4gICAgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29weWVkaXQgYW4gYXJ0aWNsZX19XCJcbiAgICBcIjxici8+e3tlbmQgb2YgY291cnNlIGFzc2lnbm1lbnR9fVwiXG4gIF1cblxubW9kdWxlLmV4cG9ydHMgPSBUaW1lbGluZURhdGFBbHRcbiIsIiMjIFRISVMgRklMRSBJUyBUSEUgREFUQSBDT05URU5UIEFORCBTVEVQIE9SREVSIENPTkZJR1JBVElPTiBGT1IgVEhFIFdJWkFSRCBBUyBXRUxMIEFTIEFTU0lHTk1FTlQgUEFUSFdBWVMgIyNcbiMjIFVOQ09NTUVOVElORyBUSEUgREFUQSBJTlNJREUgVEhFIFBBVEhXQVlTIFNFQ1RJT04gV0xMIEFERCBNT1JFIFNURVBTIElOVE8gVEhPU0UgQUxURVJOQVRJVkUgUEFUSFdBWVMgIyNcblxuV2l6YXJkQ29uZmlnID0ge1xuICBpbnRyb19zdGVwczogW1xuICAgIHtcbiAgICAgIGlkOiBcImludHJvXCJcbiAgICAgIHRpdGxlOiAnPGNlbnRlcj5XZWxjb21lIHRvIHRoZTxiciAvPkFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCE8L2NlbnRlcj4nXG4gICAgICBsb2dpbl9pbnN0cnVjdGlvbnM6ICdDbGljayBMb2dpbiB3aXRoIFdpa2lwZWRpYSB0byBnZXQgc3RhcnRlZCdcbiAgICAgIGluc3RydWN0aW9uczogJydcbiAgICAgIGlucHV0czogW11cbiAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+VGhpcyB0b29sIHdpbGwgaGVscCB5b3UgdG8gZWFzaWx5IGNyZWF0ZSBhIGN1c3RvbWl6ZWQgV2lraXBlZGlhIGNsYXNzcm9vbSBhc3NpZ25tZW50IGFuZCBjdXN0b21pemVkIHN5bGxhYnVzIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UnbGwgaGF2ZSBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiwgd2l0aCB3ZWVrbHkgYXNzaWdubWVudHMsIHB1Ymxpc2hlZCBkaXJlY3RseSBvbnRvIGEgc2FuZGJveCBwYWdlIG9uIFdpa2lwZWRpYSB3aGVyZSB5b3UgY2FuIGN1c3RvbWl6ZSBpdCBldmVuIGZ1cnRoZXIuPC9wPlwiICAgICBcbiAgICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5MZXTigJlzIHN0YXJ0IGJ5IGZpbGxpbmcgaW4gc29tZSBiYXNpY3MgYWJvdXQgeW91IGFuZCB5b3VyIGNvdXJzZTo8L3A+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gICAge1xuICAgICAgaWQ6IFwiYXNzaWdubWVudF9zZWxlY3Rpb25cIlxuICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgYXNzaWdubWVudCBzZWxlY3Rpb25zJ1xuICAgICAgZm9ybVRpdGxlOiAnQXZhaWxhYmxlIGFzc2lnbm1lbnRzOidcbiAgICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGlzIHN1aXRhYmxlIGZvciBXaWtpcGVkaWEgPGVtPmFuZDwvZW0+IGFjaGlldmVzIHlvdXIgc3R1ZGVudCBsZWFybmluZyBvYmplY3RpdmVzLiBZb3VyIGZpcnN0IHN0ZXAgaXMgdG8gY2hvb3NlIHdoaWNoIGFzc2lnbm1lbnQocykgeW91J2xsIGJlIGFza2luZyB5b3VyIHN0dWRlbnRzIHRvIGNvbXBsZXRlIGFzIHBhcnQgb2YgdGhlIGNvdXJzZS5cIlxuICAgICAgaW5wdXRzOiBbXVxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+V2UndmUgY3JlYXRlZCBzb21lIGd1aWRlbGluZXMgdG8gaGVscCB5b3UsIGJ1dCB5b3UnbGwgbmVlZCB0byBtYWtlIHNvbWUga2V5IGRlY2lzaW9ucywgc3VjaCBhczogd2hpY2ggbGVhcm5pbmcgb2JqZWN0aXZlcyBhcmUgeW91IHRhcmdldGluZyB3aXRoIHRoaXMgYXNzaWdubWVudD8gV2hhdCBza2lsbHMgZG8geW91ciBzdHVkZW50cyBhbHJlYWR5IGhhdmU/IEhvdyBtdWNoIHRpbWUgY2FuIHlvdSBkZXZvdGUgdG8gdGhlIGFzc2lnbm1lbnQ/PC9wPlwiXG4gICAgICAgICAgICBcIjxwPk1vc3QgaW5zdHJ1Y3RvcnMgYXNrIHRoZWlyIHN0dWRlbnRzIHRvIHdyaXRlIG9yIGV4cGFuZCBhbiBhcnRpY2xlLiBTdHVkZW50cyBzdGFydCBieSBsZWFybmluZyB0aGUgYmFzaWNzIG9mIFdpa2lwZWRpYSwgYW5kIHRoZW4gZm9jdXMgb24gdGhlIGNvbnRlbnQuIFRoZXkgcGxhbiwgcmVzZWFyY2gsIGFuZCB3cml0ZSBhIHByZXZpb3VzbHkgbWlzc2luZyBXaWtpcGVkaWEgYXJ0aWNsZSwgb3IgY29udHJpYnV0ZSB0byBhbiBpbmNvbXBsZXRlIGVudHJ5IG9uIGEgY291cnNlLXJlbGF0ZWQgdG9waWMuIFRoaXMgYXNzaWdubWVudCB0eXBpY2FsbHkgcmVwbGFjZXMgYSB0ZXJtIHBhcGVyIG9yIHJlc2VhcmNoIHByb2plY3QsIG9yIGl0IGZvcm1zIHRoZSBsaXRlcmF0dXJlIHJldmlldyBzZWN0aW9uIG9mIGEgbGFyZ2VyIHBhcGVyLiBUaGUgc3R1ZGVudCBsZWFybmluZyBvdXRjb21lIGlzIGhpZ2ggd2l0aCB0aGlzIGFzc2lnbm1lbnQsIGJ1dCBpdCBkb2VzIHRha2UgYSBzaWduaWZpY2FudCBhbW91bnQgb2YgdGltZS4gWW91ciBzdHVkZW50cyBuZWVkIHRvIGxlYXJuIGJvdGggdGhlIHdpa2kgbWFya3VwIGxhbmd1YWdlIGFuZCBrZXkgcG9saWNpZXMgYW5kIGV4cGVjdGF0aW9ucyBvZiB0aGUgV2lraXBlZGlhLWVkaXRpbmcgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5JZiB3cml0aW5nIGFuIGFydGljbGUgaXNuJ3QgcmlnaHQgZm9yIHlvdXIgY2xhc3MsIG90aGVyIGFzc2lnbm1lbnQgb3B0aW9ucyBvZmZlciBzdHVkZW50cyB2YWx1YWJsZSBsZWFybmluZyBvcHBvcnR1bml0aWVzIGFuZCBoZWxwIHRvIGltcHJvdmUgV2lraXBlZGlhLiBTZWxlY3QgYW4gYXNzaWdubWVudCB0eXBlIG9uIHRoZSBsZWZ0IHRvIGxlYXJuIG1vcmUuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfVxuICBdXG4gIHBhdGh3YXlzOiB7XG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICByZXNlYXJjaHdyaXRlOiBbXG4gICAgICB7XG4gICAgICAgIGlkOiBcImxlYXJuaW5nX2Vzc2VudGlhbHNcIlxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuXCJcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIHVzZXIgYWNjb3VudHMgYW5kIHRoZW4gY29tcGxldGUgdGhlIDxlbT5vbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzPC9lbT4uIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5TdHVkZW50cyB3aG8gY29tcGxldGUgdGhpcyB0cmFpbmluZyBhcmUgYmV0dGVyIHByZXBhcmVkIHRvIGZvY3VzIG9uIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgc3BlbmQgbGVzcyB0aW1lIGRpc3RyYWN0ZWQgYnkgY2xlYW5pbmcgdXAgYWZ0ZXIgZXJyb3JzLjwvcD4nXG4gICAgICAgICAgICAgICc8cD5XaWxsIGNvbXBsZXRpb24gb2YgdGhlIHN0dWRlbnQgdHJhaW5pbmcgYmUgcGFydCBvZiB5b3VyIHN0dWRlbnRzXFwnIGdyYWRlcz8gKE1ha2UgeW91ciBjaG9pY2UgYXQgdGhlIHRvcCBsZWZ0Lik8L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lcydcbiAgICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Db21wbGV0ZSB0aGUgPGVtPm9ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHM8L2VtPi4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICAgICAgPC91bD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgICAgICB0aXRsZTogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGluZm9UaXRsZTogJ0Fib3V0IGVhcmx5IGVkaXRpbmcgdGFza3MnXG4gICAgICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIGVhcmx5IG9uLiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgICAgICBmb3JtVGl0bGU6ICdXaGljaCBiYXNpYyBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlPydcbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+V2hpY2ggaW50cm9kdWN0b3J5IGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSB0byBhY2NsaW1hdGUgeW91ciBzdHVkZW50cyB0byBXaWtpcGVkaWE/IFlvdSBjYW4gc2VsZWN0IG5vbmUsIG9uZSwgb3IgbW9yZS4gV2hpY2hldmVyIHlvdSBzZWxlY3Qgd2lsbCBiZSBhZGRlZCB0byB0aGUgYXNzaWdubWVudCB0aW1lbGluZS48L3A+J1xuICAgICAgICAgICAgICAnPHVsPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+QWRkIHRvIGFuIGFydGljbGUuPC9zdHJvbmc+IFVzaW5nIGNvdXJzZSByZWFkaW5ncyBvciBvdGhlciByZWxldmFudCBzZWNvbmRhcnkgc291cmNlcywgYWRkIDHigJMyIHNlbnRlbmNlcyBvZiBuZXcgaW5mb3JtYXRpb24gdG8gYSBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcy4gQmUgc3VyZSB0byBpbnRlZ3JhdGUgaXQgd2VsbCBpbnRvIHRoZSBleGlzdGluZyBhcnRpY2xlLCBhbmQgaW5jbHVkZSBhIGNpdGF0aW9uIHRvIHRoZSBzb3VyY2UuIDwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q29weWVkaXQgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQnJvd3NlIFdpa2lwZWRpYSB1bnRpbCB5b3UgZmluZCBhbiBhcnRpY2xlIHRoYXQgeW91IHdvdWxkIGxpa2UgdG8gaW1wcm92ZSwgYW5kIG1ha2Ugc29tZSBlZGl0cyB0byBpbXByb3ZlIHRoZSBsYW5ndWFnZSBvciBmb3JtYXR0aW5nLiA8L2xpPlxuICAgICAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgdXBsb2FkaW5nIGFuZCBhZGRpbmcgYSBwaG90byB5b3UgdG9vay48L2xpPlxuICAgICAgICAgICAgICA8L3VsPidcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+Rm9yIG1vc3QgY291cnNlcywgdGhlIDxlbT5Dcml0aXF1ZSBhbiBhcnRpY2xlPC9lbT4gYW5kIDxlbT5BZGQgdG8gYW4gYXJ0aWNsZTwvZW0+IGV4ZXJjaXNlcyBwcm92aWRlIGEgbmljZSBmb3VuZGF0aW9uIGZvciB0aGUgbWFpbiB3cml0aW5nIHByb2plY3QuIFRoZXNlIGhhdmUgYmVlbiBzZWxlY3RlZCBieSBkZWZhdWx0LjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgIHRpdGxlOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIGZvcm1UaXRsZTogJ0hvdyB3aWxsIHlvdXIgY2xhc3Mgc2VsZWN0IGFydGljbGVzPydcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICAgIGlucHV0czogW11cbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkNob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlNvbWUgYXJ0aWNsZXMgbWF5IGluaXRpYWxseSBsb29rIGVhc3kgdG8gaW1wcm92ZSwgYnV0IHF1YWxpdHkgcmVmZXJlbmNlcyB0byBleHBhbmQgdGhlbSBtYXkgYmUgZGlmZmljdWx0IHRvIGZpbmQuIEZpbmRpbmcgdG9waWNzIHdpdGggdGhlIHJpZ2h0IGJhbGFuY2UgYmV0d2VlbiBwb29yIFdpa2lwZWRpYSBjb3ZlcmFnZSBhbmQgYXZhaWxhYmxlIGxpdGVyYXR1cmUgZnJvbSB3aGljaCB0byBleHBhbmQgdGhhdCBjb3ZlcmFnZSBjYW4gYmUgdHJpY2t5LiBIZXJlIGFyZSBzb21lIGd1aWRlbGluZXMgdG8ga2VlcCBpbiBtaW5kIHdoZW4gc2VsZWN0aW5nIGFydGljbGVzIGZvciBpbXByb3ZlbWVudC48L3A+J1xuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJ0dvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5HcmF2aXRhdGUgdG93YXJkIFxcXCJzdHViXFxcIiBhbmQgXFxcInN0YXJ0XFxcIiBjbGFzcyBhcnRpY2xlcy4gVGhlc2UgYXJ0aWNsZXMgb2Z0ZW4gaGF2ZSBvbmx5IDHigJMyIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gUmVsZXZhbnQgV2lraVByb2plY3QgcGFnZXMgY2FuIHByb3ZpZGUgYSBsaXN0IG9mIHN0dWJzIHRoYXQgbmVlZCBpbXByb3ZlbWVudC48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICdOb3Qgc3VjaCBhIGdvb2QgY2hvaWNlJ1xuICAgICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5BcnRpY2xlcyB0aGF0IGFyZSBcIm5vdCBzdWNoIGEgZ29vZCBjaG9pY2VcIiBmb3IgbmV3Y29tZXJzIHVzdWFsbHkgaW52b2x2ZSBhIGxhY2sgb2YgYXBwcm9wcmlhdGUgcmVzZWFyY2ggbWF0ZXJpYWwsIGhpZ2hseSBjb250cm92ZXJzaWFsIHRvcGljcyB0aGF0IG1heSBhbHJlYWR5IGJlIHdlbGwgZGV2ZWxvcGVkLCBicm9hZCBzdWJqZWN0cywgb3IgdG9waWNzIGZvciB3aGljaCBpdCBpcyBkaWZmaWN1bHQgdG8gZGVtb25zdHJhdGUgbm90YWJpbGl0eS48L3A+J1xuICAgICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Zb3Ugc2hvdWxkIHByb2JhYmx5IGF2b2lkIHRyeWluZyB0byBpbXByb3ZlIGFydGljbGVzIG9uIHRvcGljcyB0aGF0IGFyZSBoaWdobHkgY29udHJvdmVyc2lhbCAoZm9yIGV4YW1wbGUsIEdsb2JhbCBXYXJtaW5nLCBBYm9ydGlvbiwgb3IgU2NpZW50b2xvZ3kpLiBZb3UgbWF5IGJlIG1vcmUgc3VjY2Vzc2Z1bCBzdGFydGluZyBhIHN1Yi1hcnRpY2xlIG9uIHRoZSB0b3BpYyBpbnN0ZWFkLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgICAgIDxsaT5Eb24ndCBzdGFydCBhcnRpY2xlcyB3aXRoIHRpdGxlcyB0aGF0IGltcGx5IGFuIGFyZ3VtZW50IG9yIGVzc2F5LWxpa2UgYXBwcm9hY2ggKGUuZy4sIFRoZSBFZmZlY3RzIFRoYXQgVGhlIFJlY2VudCBTdWItUHJpbWUgTW9ydGdhZ2UgQ3Jpc2lzIGhhcyBoYWQgb24gdGhlIFVTIGFuZCBHbG9iYWwgRWNvbm9taWNzKS4gVGhlc2UgdHlwZSBvZiB0aXRsZXMsIGFuZCBtb3N0IGxpa2VseSB0aGUgY29udGVudCB0b28sIG1heSBub3QgYmUgYXBwcm9wcmlhdGUgZm9yIGFuIGVuY3ljbG9wZWRpYS48L2xpPlxuICAgICAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICAnPHA+QXMgdGhlIGluc3RydWN0b3IsIHlvdSBzaG91bGQgYXBwbHkgeW91ciBvd24gZXhwZXJ0aXNlIHRvIGV4YW1pbmluZyBXaWtpcGVkaWHigJlzIGNvdmVyYWdlIG9mIHlvdXIgZmllbGQuIFlvdSB1bmRlcnN0YW5kIHRoZSBicm9hZGVyIGludGVsbGVjdHVhbCBjb250ZXh0IHdoZXJlIGluZGl2aWR1YWwgdG9waWNzIGZpdCBpbiwgeW91IGNhbiByZWNvZ25pemUgd2hlcmUgV2lraXBlZGlhIGZhbGxzIHNob3J0LCB5b3Uga25vd+KAlG9yIGtub3cgaG93IHRvIGZpbmTigJR0aGUgcmVsZXZhbnQgbGl0ZXJhdHVyZSwgYW5kIHlvdSBrbm93IHdoYXQgdG9waWNzIHlvdXIgc3R1ZGVudHMgc2hvdWxkIGJlIGFibGUgdG8gaGFuZGxlLiBZb3VyIGd1aWRhbmNlIG9uIGFydGljbGUgY2hvaWNlIGFuZCBzb3VyY2luZyBpcyBjcml0aWNhbCBmb3IgYm90aCB5b3VyIHN0dWRlbnRz4oCZIHN1Y2Nlc3MgYW5kIHRoZSBpbXByb3ZlbWVudCBvZiBXaWtpcGVkaWEuPC9wPidcbiAgICAgICAgICAgICAgJzxwPlRoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gSGF2aW5nIHN0dWRlbnRzIGZpbmQgdGhlaXIgb3duIGFydGljbGVzIHByb3ZpZGVzIHRoZW0gd2l0aCBhIHNlbnNlIG9mIG1vdGl2YXRpb24gYW5kIG93bmVyc2hpcCBvdmVyIHRoZSBhc3NpZ25tZW50IGFuZCBleGVyY2lzZXMgdGhlaXIgY3JpdGljYWwgdGhpbmtpbmcgc2tpbGxzIGFzIHRoZXkgaWRlbnRpZnkgY29udGVudCBnYXBzLCBidXQgaXQgbWF5IGFsc28gbGVhZCB0byBjaG9pY2VzIHRoYXQgYXJlIGZ1cnRoZXIgYWZpZWxkIGZyb20gY291cnNlIG1hdGVyaWFsLjwvcD4nXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfSBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJyZXNlYXJjaF9wbGFubmluZ1wiXG4gICAgICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdIb3cgc2hvdWxkIHN0dWRlbnRzIHBsYW4gdGhlaXIgYXJ0aWNsZXM/J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGFibGUgZm9yIFdpa2lwZWRpYS4gVGhhdCdzIHdoeSB3ZSByZWNvbW1lbmQgYXNraW5nIHN0dWRlbnRzIHRvIHB1dCB0b2dldGhlciBhIGJpYmxpb2dyYXBoeSBvZiBtYXRlcmlhbHMgdGhleSB3YW50IHRvIHVzZSBpbiBlZGl0aW5nIHRoZSBhcnRpY2xlLCB3aGljaCBjYW4gdGhlbiBiZSBhc3Nlc3NlZCBieSB5b3UgYW5kIG90aGVyIFdpa2lwZWRpYW5zLjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgICAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAgIHRpdGxlOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3ggcGFnZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIG9mIGVhY2ggYXBwcm9hY2guJ1xuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBzYW5kYm94ZXMnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+U2FuZGJveGVzIOKAlCBwYWdlcyBhc3NvY2lhdGVkIHdpdGggYW4gaW5kaXZpZHVhbCBlZGl0b3IgdGhhdCBhcmUgbm90IGNvbnNpZGVyZWQgcGFydCBvZiBXaWtpcGVkaWEgcHJvcGVyIOKAlCBtYWtlIHN0dWRlbnRzIGZlZWwgc2FmZS4gVGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMgb3Igb3RoZXIgV2lraXBlZGlhbnMgYWx0ZXJpbmcgdGhlaXIgd3JpdGluZy4gSG93ZXZlciwgc2FuZGJveCBlZGl0aW5nIGxpbWl0cyBtYW55IG9mIHRoZSB1bmlxdWUgYXNwZWN0cyBvZiBXaWtpcGVkaWEgYXMgYSB0ZWFjaGluZyB0b29sLCBzdWNoIGFzIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBhbmQgaW5jcmVtZW50YWwgZHJhZnRpbmcuIFNwZW5kaW5nIG1vcmUgdGhhbiBhIHdlZWsgb3IgdHdvIGluIHNhbmRib3hlcyBpcyBzdHJvbmdseSBkaXNjb3VyYWdlZC48L3A+XCIgXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyBvZiBlZGl0aW5nIGxpdmUnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RWRpdGluZyBsaXZlIGlzIGV4Y2l0aW5nIGZvciB0aGUgc3R1ZGVudHMgYmVjYXVzZSB0aGV5IGNhbiBzZWUgdGhlaXIgY2hhbmdlcyB0byB0aGUgYXJ0aWNsZXMgaW1tZWRpYXRlbHkgYW5kIGV4cGVyaWVuY2UgdGhlIGNvbGxhYm9yYXRpdmUgZWRpdGluZyBwcm9jZXNzIHRocm91Z2hvdXQgdGhlIGFzc2lnbm1lbnQuIEhvd2V2ZXIsIGJlY2F1c2UgbmV3IGVkaXRvcnMgb2Z0ZW4gdW5pbnRlbnRpb25hbGx5IGJyZWFrIFdpa2lwZWRpYSBydWxlcywgc29tZXRpbWVzIHN0dWRlbnRz4oCZIGFkZGl0aW9ucyBhcmUgcXVlc3Rpb25lZCBvciByZW1vdmVkLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgICAgIHRpdGxlOiAnUGVlciBmZWVkYmFjaydcbiAgICAgICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICAgICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkNvbGxhYm9yYXRpb24gaXMgYSBjcml0aWNhbCBlbGVtZW50IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEuXCJcbiAgICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0aXRsZTogJydcbiAgICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5QZWVyIHJldmlld3MgYXJlIGFub3RoZXIgY2hhbmNlIGZvciBzdHVkZW50cyB0byBwcmFjdGljZSBjcml0aWNhbCB0aGlua2luZy4gVXNlZnVsIHJldmlld3MgZm9jdXMgb24gc3BlY2lmaWMgaXNzdWVzIHRoYXQgY2FuIGJlIGltcHJvdmVkLiBTaW5jZSBzdHVkZW50cyBhcmUgdXN1YWxseSBoZXNpdGFudCB0byBjcml0aWNpemUgdGhlaXIgY2xhc3NtYXRlc+KAlGFuZCBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyBtYXkgZ2V0IGFubm95ZWQgd2l0aCBhIHN0cmVhbSBvZiBwcmFpc2UgZnJvbSBzdHVkZW50cyB0aGF0IGdsb3NzZXMgb3ZlciBhbiBhcnRpY2xlJ3Mgc2hvcnRjb21pbmdz4oCUaXQncyBpbXBvcnRhbnQgdG8gZ2l2ZXMgZXhhbXBsZXMgb2YgdGhlIGtpbmRzIG9mIGNvbnN0cnVjdGl2ZWx5IGNyaXRpY2FsIGZlZWRiYWNrIHRoYXQgYXJlIHRoZSBtb3N0IGhlbHBmdWwuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+SG93IG1hbnkgcGVlciByZXZpZXdzIHdpbGwgeW91IGFzayBlYWNoIHN0dWRlbnQgdG8gY29udHJpYnV0ZSBkdXJpbmcgdGhlIGNvdXJzZT88L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICAgICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cyAob3B0aW9uYWwpOidcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgaW5zdHJ1Y3Rpb25zOiBcIkJ5IHRoZSB0aW1lIHN0dWRlbnRzIGhhdmUgbWFkZSBpbXByb3ZlbWVudHMgYmFzZWQgb24gY2xhc3NtYXRlcycgY29tbWVudHPigJRhbmQgaWRlYWxseSBzdWdnZXN0aW9ucyBmcm9tIHlvdSBhcyB3ZWxs4oCUdGhleSBzaG91bGQgaGF2ZSBwcm9kdWNlZCBuZWFybHkgY29tcGxldGUgYXJ0aWNsZXMuIE5vdyBpcyB0aGUgY2hhbmNlIHRvIGVuY291cmFnZSB0aGVtIHRvIHdhZGUgYSBsaXR0bGUgZGVlcGVyIGludG8gV2lraXBlZGlhIGFuZCBpdHMgbm9ybXMgYW5kIGNyaXRlcmlhIHRvIGNyZWF0ZSBncmVhdCBjb250ZW50LlwiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgXCI8cD5Zb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0cyBhbmQgbGltaXRzIG9mIFdpa2lwZWRpYS4gQ29uc2lkZXIgYnJpbmdpbmcgaW4gYSBndWVzdCBzcGVha2VyLCBoYXZpbmcgYSBwYW5lbCBkaXNjdXNzaW9uLCBvciBzaW1wbHkgaGF2aW5nIGFuIG9wZW4gZGlzY3Vzc2lvbiBpbiBjbGFzcyBhYm91dCB3aGF0IHRoZSBzdHVkZW50cyBoYXZlIGRvbmUgc28gZmFyIGFuZCB3aHkgKG9yIHdoZXRoZXIpIGl0IG1hdHRlcnMuPC9wPlwiXG4gICAgICAgICAgICAgXCI8cD5JbiBhZGRpdGlvbiB0byB0aGUgV2lraXBlZGlhIGFydGljbGUgd3JpdGluZyBpdHNlbGYsIHlvdSBtYXkgd2FudCB0byB1c2UgYSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnQuIFRoZXNlIGFzc2lnbm1lbnRzIGNhbiByZWluZm9yY2UgYW5kIGRlZXBlbiB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIG91dGNvbWVzLCBhbmQgYWxzbyBoZWxwIHlvdSB0byB1bmRlcnN0YW5kIGFuZCBldmFsdWF0ZSB0aGUgc3R1ZGVudHMnIHdvcmsgYW5kIGxlYXJuaW5nIG91dGNvbWVzLiBPbiB0aGUgbGVmdCBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuIFNjcm9sbCBvdmVyIGVhY2ggZm9yIG1vcmUgaW5mb3JtYXRpb24sIGFuZCBzZWxlY3QgYW55IHRoYXQgeW91IHdpc2ggdG8gdXNlIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9XG4gICAgICAgIF1cbiAgICAgICAgaW5wdXRzOiBbXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBpZDogXCJkeWtcIlxuICAgICAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5EaWQgWW91IEtub3c8L2VtPiBwcm9jZXNzJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBEWUsgYXMgYW4gdW5ncmFkZWQgb3B0aW9uP1wiXG4gICAgICAgIHNlY3Rpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICAgIFwiPHA+RGlkIFlvdSBLbm93IChEWUspIGlzIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBoaWdobGlnaHRpbmcgbmV3IGNvbnRlbnQgdGhhdCBoYXMgYmVlbiBhZGRlZCB0byBXaWtpcGVkaWEgaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy4gRFlLIGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICAgICAgICAgICAgIFwiPHA+VGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4IG9yIG1vcmUpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLiBTdHVkZW50cyB3aG8gbWVldCB0aGlzIGNyaXRlcmlhIG1heSB3YW50IHRvIG5vbWluYXRlIHRoZWlyIGNvbnRyaWJ1dGlvbnMgZm9yIERZSy48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBhcyB0aGUgRFlLIG5vbWluYXRpb24gcHJvY2VzcyBjYW4gYmUgZGlmZmljdWx0IGZvciBuZXdjb21lcnMgdG8gbmF2aWdhdGUuIEhvd2V2ZXIsIGl0IG1ha2VzIGEgZ3JlYXQgc3RyZXRjaCBnb2FsIHdoZW4gdXNlZCBzZWxlY3RpdmVseS48L3A+XCJcbiAgICAgICAgICAgICAgXCI8cD5Xb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBoZWxwIHlvdSBhbmQgeW91ciBzdHVkZW50cyBkdXJpbmcgdGhlIHRlcm0gdG8gaWRlbnRpZnkgd29yayB0aGF0IG1heSBiZSBhIGdvb2QgY2FuZGlkYXRlIGZvciBEWUsgYW5kIGFuc3dlciBxdWVzdGlvbnMgeW91IG1heSBoYXZlIGFib3V0IHRoZSBub21pbmF0aW9uIHByb2Nlc3MuPC9wPlwiXG4gICAgICAgICAgICBdXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICAgIGlucHV0czogW11cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgaWQ6IFwiZ2FcIlxuICAgICAgICB0aXRsZTogJ0dvb2QgQXJ0aWNsZSBwcm9jZXNzJ1xuICAgICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICAgaW5mb1RpdGxlOiAnQWJvdXQgdGhlIDxlbT5Hb29kIEFydGljbGU8L2VtPiBwcm9jZXNzJ1xuICAgICAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGlzIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAgICAgICBzZWN0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IHdlbGwtZGV2ZWxvcGVkLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMgYW5kIHdobyBhcmUgd2lsbGluZyB0byBjb21lIGJhY2sgdG8gYWRkcmVzcyByZXZpZXdlciBmZWVkYmFjayAoZXZlbiBhZnRlciB0aGUgdGVybSBlbmRzKTwvZW0+LjwvcD5cIlxuICAgICAgICAgICAgICBcIjxwPldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/IElmIHNvLCB0aGUgV2lraSBFZCB0ZWFtIGNhbiBwcm92aWRlIGFkdmljZSBhbmQgc3VwcG9ydCB0byBoaWdoLWFjaGlldmluZyBzdHVkZW50cyB3aG8gYXJlIGludGVyZXN0ZWQgaW4gdGhlIEdvb2QgQXJ0aWNsZSBwcm9jZXNzLjwvcD5cIlxuICAgICAgICAgICAgXVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgICBpbnB1dHM6IFtdXG4gICAgICB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nXCJcbiAgICAgICMgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgICAgICBcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm92ZXJ2aWV3XCJcbiAgICAgICMgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IHRoZSBjb3Vyc2VcIlxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgIyAgICAgICAgIFwiPHVsPlxuICAgICAgIyAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICMgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgIyAgICAgICAgIDwvdWw+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgICAgIFxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cCBjbGFzcz0nZGVzY3JpcHRpb24tY29udGFpbmVyJyBzdHlsZT0nbWFyZ2luLWJvdHRvbTowOyc+PC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8ZGl2IGNsYXNzPSdmb3JtLWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICA8Zm9ybSBpZD0nY291cnNlTGVuZ3RoJyBvbmlucHV0PSdvdXQudmFsdWUgPSBwYXJzZUludChjb3Vyc2VMZW5ndGgudmFsdWUpOyBvdXQyLnZhbHVlID0gcGFyc2VJbnQoY291cnNlTGVuZ3RoLnZhbHVlKTsnIG9uc3VibWl0PSdyZXR1cm4gZmFsc2UnPlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1TdGFydERhdGUnPlRlcm0gYmVnaW5zPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3Rlcm1TdGFydERhdGUnIG5hbWU9J3Rlcm1TdGFydERhdGUnIHR5cGU9J2RhdGUnPlxuICAgICAgIyAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT0nZGlzcGxheTogbm9uZTsnPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1FbmREYXRlJz5UZXJtIGVuZHM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDxpbnB1dCBpZD0ndGVybUVuZERhdGUnIG5hbWU9J3Rlcm1FbmREYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWRpdi5vdmVydmlldy1pbnB1dC1jb250YWluZXIgLS0+XG4gICAgICAjICAgICAgICAgICAgIDwhLS0gJWxhYmVsezpmb3IgPT4gJ2VuZERhdGUnfSBFbmQgV2VlayBvZiAtLT5cbiAgICAgICMgICAgICAgICAgICAgPCEtLSAlaW5wdXR7OnR5cGUgPT4gJ2RhdGUnLCA6aWQgPT4gJ2VuZERhdGUnLCA6bmFtZSA9PiAnZW5kRGF0ZSd9IC0tPlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J2NvdXJzZVN0YXJ0RGF0ZSc+Q291cnNlIHN0YXJ0cyBvbjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdjb3Vyc2VTdGFydERhdGUnIG5hbWU9J2NvdXJzZVN0YXJ0RGF0ZScgdHlwZT0nZGF0ZSc+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInIHN0eWxlPSdkaXNwbGF5OiBub25lOyc+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3RhcnRXZWVrT2ZEYXRlJz5TdGFydCB3ZWVrIG9mPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgaWQ9J3N0YXJ0V2Vla09mRGF0ZScgbmFtZT0nc3RhcnRXZWVrT2ZEYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcicgc3R5bGU9J2Rpc3BsYXk6IG5vbmU7Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdlbmRXZWVrT2ZEYXRlJz5FbmQgd2VlayBvZjwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPGlucHV0IGlkPSdlbmRXZWVrT2ZEYXRlJyBuYW1lPSdlbmRXZWVrT2ZEYXRlJyB0eXBlPSdkYXRlJz5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlTGVuZ3RoJz5Db3Vyc2UgTGVuZ3RoPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8aW5wdXQgZGVmYXVsdFZhbHVlPScxNicgaWQ9J2NMZW5ndGgnIG1heD0nMTYnIG1pbj0nNicgbmFtZT0nY291cnNlTGVuZ3RoJyBzdGVwPScxJyB0eXBlPSdyYW5nZScgdmFsdWU9JzE2Jz5cbiAgICAgICMgICAgICAgICAgICAgICA8b3V0cHV0IG5hbWU9J291dDInPjE2PC9vdXRwdXQ+XG4gICAgICAjICAgICAgICAgICAgICAgPHNwYW4+d2Vla3M8L3NwYW4+XG4gICAgICAjICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdtb25kYXknIG5hbWU9J01vbmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScwJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J21vbmRheSc+TW9uZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndHVlc2RheScgbmFtZT0nVHVlc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScxJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3R1ZXNkYXknPlR1ZXNkYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd3ZWRuZXNkYXknIG5hbWU9J1dlZG5lc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScyJz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3dlZG5lc2RheSc+V2VkbmVzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndGh1cnNkYXknIG5hbWU9J1RodXJzZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzMnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGh1cnNkYXknPlRodXJzZGF5czwvbGFiZWw+XG4gICAgICAjICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XG4gICAgICAjICAgICAgICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nZnJpZGF5JyBuYW1lPSdGcmlkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNCc+XG4gICAgICAjICAgICAgICAgICAgICAgICA8bGFiZWwgZm9yPSdmcmlkYXknPkZyaWRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3NhdHVyZGF5JyBuYW1lPSdTYXR1cmRheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPSc1Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxsYWJlbCBmb3I9J3NhdHVyZGF5Jz5TYXR1cmRheXM8L2xhYmVsPlxuICAgICAgIyAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgIyAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J3N1bmRheScgbmFtZT0nU3VuZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzYnPlxuICAgICAgIyAgICAgICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3VuZGF5Jz5TdW5kYXlzPC9sYWJlbD5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXJlYWRvdXQtaGVhZGVyJz5cbiAgICAgICMgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPSdyZWFkb3V0Jz5cbiAgICAgICMgICAgICAgICAgICAgICAgIDxvdXRwdXQgZm9yPSdjb3Vyc2VMZW5ndGgnIGlkPSdjb3Vyc2VMZW5ndGhSZWFkb3V0JyBuYW1lPSdvdXQnPjE2PC9vdXRwdXQ+XG4gICAgICAjICAgICAgICAgICAgICAgICA8c3Bhbj53ZWVrczwvc3Bhbj5cbiAgICAgICMgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICMgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgICA8L2Zvcm0+XG4gICAgICAjICAgICAgICAgPC9kaXY+XG4gICAgICAjICAgICAgICAgPGRpdj5cbiAgICAgICMgICAgICAgICAgIDxkaXYgY2xhc3M9J3ByZXZpZXctY29udGFpbmVyJz48L2Rpdj5cbiAgICAgICMgICAgICAgICA8L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgbXVsdGltZWRpYTogW1xuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwibXVsdGltZWRpYV8xXCJcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIHRpdGxlOiAnTXVsdGltZWRpYSBzdGVwIDEnXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcIm11bHRpbWVkaWFfMlwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IHRydWVcbiAgICAgICMgICB0aXRsZTogJ011bHRpbWVkaWEgc3RlcCAyJ1xuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nX211bHRpbWVkaWFcIlxuICAgICAgIyAgIHR5cGU6IFwiZ3JhZGluZ1wiXG4gICAgICAjICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICAjICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgICAgIyAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAjICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICMgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgICAgXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJvdmVydmlld1wiXG4gICAgICAjICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgICAgIyAgIHR5cGU6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiBmYWxzZVxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiXCJcbiAgICAgICMgICBzZWN0aW9uczogW1xuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICMgICAgICAgICBcIjx1bD5cbiAgICAgICMgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAjICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICMgICAgICAgICA8L3VsPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICAgICBcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHAgY2xhc3M9J2Rlc2NyaXB0aW9uLWNvbnRhaW5lcic+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnJ1xuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgIF1cbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjIH1cbiAgICBdXG4gICAgIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiAgICBjb3B5ZWRpdDogW1xuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwiY29weWVkaXRfMVwiXG4gICAgICAjICAgdGl0bGU6ICdDb3B5IEVkaXQgc3RlcCAxJ1xuICAgICAgIyAgIHNob3dJbk92ZXJ2aWV3OiB0cnVlXG4gICAgICAjICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgICAjICAgaW5mb1RpdGxlOiAnSW5zdHJ1Y3Rpb24gVGl0bGUnXG4gICAgICAjICAgaW5zdHJ1Y3Rpb25zOiBcIlN0ZXAgSW5zdHJ1Y3Rpb25zXCJcbiAgICAgICMgICBpbnB1dHM6IFtdXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICBdXG4gICAgICAjIH1cbiAgICAgICMge1xuICAgICAgIyAgIGlkOiBcImNvcHllZGl0XzJcIlxuICAgICAgIyAgIHRpdGxlOiAnQ29weSBFZGl0IHN0ZXAgMidcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogdHJ1ZVxuICAgICAgIyAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgICAgIyAgIGluZm9UaXRsZTogJ0luc3RydWN0aW9uIFRpdGxlJ1xuICAgICAgIyAgIGluc3RydWN0aW9uczogXCJTdGVwIEluc3RydWN0aW9uc1wiXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyAgIHNlY3Rpb25zOiBbXG4gICAgICAjICAgXVxuICAgICAgIyB9XG4gICAgICAjIHtcbiAgICAgICMgICBpZDogXCJncmFkaW5nX2NvcHllZGl0XCJcbiAgICAgICMgICB0eXBlOiBcImdyYWRpbmdcIlxuICAgICAgIyAgIHRpdGxlOiAnR3JhZGluZydcbiAgICAgICMgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgICMgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgYXNzaWdubWVudHMgYmUgZGV0ZXJtaW5lZD9cIlxuICAgICAgIyAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICAgICMgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgIyAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgIyAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZy48L3A+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAjICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgIyAgICAgICBjb250ZW50OiBbXG4gICAgICAjICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICMgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgICAgIFxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgXVxuICAgICAgIyAgIGlucHV0czogW11cbiAgICAgICMgfVxuICAgICAgIyB7XG4gICAgICAjICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHR5cGU6IFwib3ZlcnZpZXdcIlxuICAgICAgIyAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICAgICMgICBpbmZvVGl0bGU6IFwiQWJvdXQgdGhlIGNvdXJzZVwiXG4gICAgICAjICAgc2hvd0luT3ZlcnZpZXc6IGZhbHNlXG4gICAgICAjICAgZm9ybVRpdGxlOiBcIlwiXG4gICAgICAjICAgc2VjdGlvbnM6IFtcbiAgICAgICMgICAgIHtcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAjICAgICAgICAgXCI8dWw+XG4gICAgICAjICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgIyAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAjICAgICAgICAgPC91bD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAgICAgXG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInPjwvcD5cIlxuICAgICAgIyAgICAgICBdXG4gICAgICAjICAgICB9XG4gICAgICAjICAgICB7XG4gICAgICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICMgICAgICAgICBcIjxkaXYgY2xhc3M9J3N0ZXAtZm9ybS1kYXRlcyc+PC9kaXY+XCJcbiAgICAgICMgICAgICAgXVxuICAgICAgIyAgICAgfVxuICAgICAgIyAgICAge1xuICAgICAgIyAgICAgICB0aXRsZTogJydcbiAgICAgICMgICAgICAgY29udGVudDogW1xuICAgICAgIyAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAjICAgICAgIF1cbiAgICAgICMgICAgIH1cbiAgICAgICMgICBdXG4gICAgICAjICAgaW5wdXRzOiBbXVxuICAgICAgIyB9XG4gICAgXVxuICB9XG4gIG91dHJvX3N0ZXBzOiBbXG4gICAge1xuICAgICAgaWQ6IFwiZ3JhZGluZ1wiXG4gICAgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciBhc3NpZ25tZW50cyBiZSBkZXRlcm1pbmVkP1wiXG4gICAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgICBzZWN0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcuPC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICAgIFxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgXVxuICAgICAgaW5wdXRzOiBbXVxuICAgIH1cbiAgICB7XG4gICAgICBpZDogXCJvdmVydmlld1wiXG4gICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgb3ZlcnZpZXcnXG4gICAgICBzaG93SW5PdmVydmlldzogZmFsc2VcbiAgICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICAgIGZvcm1UaXRsZTogXCJcIlxuICAgICAgc2VjdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHtcbiAgICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgICBcIjxwIGNsYXNzPSdkZXNjcmlwdGlvbi1jb250YWluZXInIHN0eWxlPSdtYXJnaW4tYm90dG9tOjA7Jz48L3A+XCJcbiAgICAgICAgICAgIFwiPGRpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzcz0ncHJldmlldy1jb250YWluZXInPjwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XCJcbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgICAgIyB7XG4gICAgICAgICMgICBjb250ZW50OiBbXG4gICAgICAgICMgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICAjICAgXVxuICAgICAgICAjIH1cbiAgICAgICAge1xuICAgICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgICBpbnB1dHM6IFtdXG4gICAgfVxuICBdXG59XG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ29uZmlnXG5cbiIsIiMjIFRISVMgRklMRSBJUyBUSEUgREFUQSBTT1VSU0UgRk9SIEFTU0lHTk1FTlQgVFlQRSBIT1ZFUiBJTkZPUk1BVElPTiAjI1xuXG5XaXphcmRDb3Vyc2VJbmZvID0gXG5cbiAgIyBSRVNFQVJDSCBBTkQgV1JJVEUgQSBXSUtJUEVESUEgQVJUSUNMRVxuICByZXNlYXJjaHdyaXRlOiBcbiAgICB0aXRsZTogXCJSZXNlYXJjaCBhbmQgd3JpdGUgYSBXaWtpcGVkaWEgYXJ0aWNsZVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiWW91IGd1aWRlIHlvdXIgc3R1ZGVudHMgdG8gc2VsZWN0IGNvdXJzZS1yZWxhdGVkIHRvcGljcyB0aGF0IGFyZSBub3Qgd2VsbC1jb3ZlcmVkIG9uIFdpa2lwZWRpYSwgYW5kIHRoZXkgd29yayBpbmRpdmlkdWFsbHkgb3IgaW4gc21hbGwgdGVhbXMgdG8gZGV2ZWxvcCBjb250ZW50IOKAlCBlaXRoZXIgZXhwYW5kaW5nIGV4aXN0aW5nIGFydGljbGVzIG9yIGNyZWF0aW5nIG5ldyBvbmVzLiBTdHVkZW50cyBhbmFseXplIHRoZSBjdXJyZW50IGdhcHMsIHN0YXJ0IHRoZWlyIHJlc2VhcmNoIHRvIGZpbmQgaGlnaC1xdWFsaXR5IHNlY29uZGFyeSBzb3VyY2VzLCBhbmQgdGhlbiBjb25zaWRlciB0aGUgYmVzdCB3YXkgdG8gb3JnYW5pemUgdGhlIGF2YWlsYWJsZSBpbmZvcm1hdGlvbi4gVGhlbiBpdCdzIHRpbWUgZm9yIHRoZW0gaW4gdHVybiB0bzogcHJvcG9zZSBhbiBvdXRsaW5lOyBkcmFmdCBuZXcgYXJ0aWNsZXMgb3IgbmV3IGNvbnRlbnQgZm9yIGV4aXN0aW5nIG9uZXM7IHByb3ZpZGUgYW5kIHJlc3BvbmQgdG8gcGVlciBmZWVkYmFjazsgYW5kIG1vdmUgdGhlaXIgd29yayBpbnRvIHRoZSBsaXZlIGFydGljbGUgbmFtZXNwYWNlIG9uIFdpa2lwZWRpYS5cIlxuICAgICAgXCJBbG9uZyB0aGUgd2F5LCBzdHVkZW50cyBtYXkgd29yayB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYSBlZGl0b3JzIHdobyBjYW4gb2ZmZXIgY3JpdGljYWwgZmVlZGJhY2sgYW5kIGhlbHAgbWFrZSBzdXJlIGFydGljbGVzIG1lZXQgV2lraXBlZGlhJ3Mgc3RhbmRhcmRzIGFuZCBzdHlsZSBjb252ZW50aW9ucywgYW5kIGl0J3MgaW1wb3J0YW50IHRvIGluY29ycG9yYXRlIHRpbWUgaW50byB0aGUgYXNzaWdubWVudCBmb3IgdGhlIHN0dWRlbnRzIHRvIGludGVncmF0ZSB0aG9zZSBzdWdnZXN0aW9ucy4gU3R1ZGVudHMgd2hvIGRvIGdyZWF0IHdvcmsgbWF5IGhhdmUgdGhlaXIgYXJ0aWNsZXMgaGlnaGxpZ2h0ZWQgb24gV2lraXBlZGlhJ3MgbWFpbiBwYWdlLCBhbmQgaGlnaCBxdWFsaXR5IGFydGljbGVzIHdpbGwgaGVscCBpbmZvcm0gdGhvdXNhbmRzIG9mIGZ1dHVyZSByZWFkZXJzIGFib3V0IHRoZSBzZWxlY3RlZCB0b3BpYy4gXCJcbiAgICAgIFwiT3B0aW9uYWxseSwgeW91IG1heSBhc2sgeW91ciBzdHVkZW50cyB0byB3cml0ZSBhIHJlZmxlY3RpdmUgcGFwZXIgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2UsIHByZXNlbnQgdGhlaXIgY29udHJpYnV0aW9ucyBpbiBjbGFzcywgb3IgZGV2ZWxvcCB0aGVpciBvd24gY29uY2x1c2lvbnMgYW5kIGFyZ3VtZW50cyBpbiBhIHN1cHBsZW1lbnRhcnkgZXNzYXkuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIxMiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWRzIG9yIGdyYWQgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY2xhc3Nlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3Agd3JpdGluZyBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIFNPVVJDRS1DRU5URVJFRCBBRERJVElPTlNcbiAgc291cmNlY2VudGVyZWQ6IFxuICAgIHRpdGxlOiBcIlNvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHJlYWQgV2lraXBlZGlhIGFydGljbGVzIGluIGEgc2VsZi1zZWxlY3RlZCBzdWJqZWN0IGFyZWEgdG8gaWRlbnRpZnkgYXJ0aWNsZXMgaW4gbmVlZCBvZiByZXZpc2lvbiBvciBpbXByb3ZlbWVudCwgc3VjaCBhcyB0aG9zZSB3aXRoIFxcXCJjaXRhdGlvbiBuZWVkZWRcXFwiIHRhZ3MuIFN0dWRlbnRzIHdpbGwgZmluZCByZWxpYWJsZSBzb3VyY2VzIHRvIHVzZSBhcyByZWZlcmVuY2VzIGZvciB1bmNpdGVkIGNvbnRlbnQuIFRoaXMgYXNzaWdubWVudCBpbmNsdWRlcyBhIHBlcnN1YXNpdmUgZXNzYXkgaW4gd2hpY2ggc3R1ZGVudHMgbWFrZSBhIGNhc2UgZm9yIHRoZWlyIHN1Z2dlc3RlZCBjaGFuZ2VzLCB3aHkgdGhleSBiZWxpZXZlIHRoZXkgYXJlIHF1YWxpZmllZCB0byBtYWtlIHRob3NlIGNoYW5nZXMsIGFuZCB3aHkgdGhlaXIgc2VsZWN0ZWQgc291cmNlcyBwcm92aWRlIHN1cHBvcnQuIEFmdGVyIG1ha2luZyB0aGVpciBjb250cmlidXRpb25zLCBzdHVkZW50cyByZWZsZWN0IG9uIHRoZWlyIHdvcmsgd2l0aCBhIGZvcm1hbCBwYXBlciwgYW5kIGRpc2N1c3Mgd2hldGhlciB0aGV5J3ZlIGFjY29tcGxpc2hlZCB0aGVpciBzdGF0ZWQgZ29hbHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYXJnZSBjbGFzc2VzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgRklORCBBTkQgRklYIEVSUk9SU1xuICBmaW5kZml4OiBcbiAgICB0aXRsZTogXCJGaW5kIGFuZCBmaXggZXJyb3JzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gZmluZCBhbiBhcnRpY2xlIGFib3V0IGEgY291cnNlLXJlbGF0ZWQgdG9waWMgd2l0aCB3aGljaCB0aGV5IGFyZSBleHRyZW1lbHkgZmFtaWxpYXIgdGhhdCBoYXMgc29tZSBtaXN0YWtlcy4gU3R1ZGVudHMgdGFrZSB3aGF0IHRoZXkga25vdyBhYm91dCB0aGUgdG9waWMsIGZpbmQgZmFjdHVhbCBlcnJvcnMgYW5kIG90aGVyIHN1YnN0YW50aXZlIG1pc3Rha2VzLCBhbmQgY29ycmVjdCB0aG9zZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIElkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVxuICBwbGFnaWFyaXNtOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHNlYXJjaCB0aHJvdWdoIFdpa2lwZWRpYSBhcnRpY2xlcyB0byBmaW5kIGluc3RhbmNlcyBvZiBjbG9zZSBwYXJhcGhyYXNpbmcgb3IgcGxhZ2lhcmlzbSwgdGhlbiByZXdvcmQgdGhlIGluZm9ybWF0aW9uIGluIHRoZWlyIG93biBsYW5ndWFnZSB0byBiZSBhcHByb3ByaWF0ZSBmb3IgV2lraXBlZGlhLiBJbiB0aGlzIGFzc2lnbm1lbnQsIHN0dWRlbnRzIGdhaW4gYSBkZWVwZXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IHBsYWdpYXJpc20gaXMgYW5kIGhvdyB0byBhdm9pZCBpdC5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjVFJBTlNMQVRFIEFOIEFSVElDTEUgVE8gRU5HTElTSFxuICB0cmFuc2xhdGU6IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiVGhpcyBpcyBhIHByYWN0aWNhbCBhc3NpZ25tZW50IGZvciBsYW5ndWFnZSBpbnN0cnVjdG9ycy4gU3R1ZGVudHMgc2VsZWN0IGEgV2lraXBlZGlhIGFydGljbGUgaW4gdGhlIGxhbmd1YWdlIHRoZXkgYXJlIHN0dWR5aW5nLCBhbmQgdHJhbnNsYXRlIGl0IGludG8gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBTdHVkZW50cyBzaG91bGQgc3RhcnQgd2l0aCBoaWdoLXF1YWxpdHkgYXJ0aWNsZXMgd2hpY2ggYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBUaGlzIGFzc2lnbm1lbnQgcHJvdmlkZXMgcHJhY3RpY2FsIHRyYW5zbGF0aW9uIGFkdmljZSB3aXRoIHRoZSBpbmNlbnRpdmUgb2YgcmVhbCBwdWJsaWMgc2VydmljZSwgYXMgc3R1ZGVudHMgZXhwYW5kIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGN1bHR1cmUgb24gV2lraXBlZGlhLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNisgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhbmd1YWdlIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHRyYW5zbGF0aW5nIDxlbT5mcm9tPC9lbT4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlIHRvIHRoZSBsYW5ndWFnZSB0aGV5J3JlIHN0dWR5aW5nXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjQ09QWSBFRElUSU5HXG4gIGNvcHllZGl0OiBcbiAgICB0aXRsZTogXCJDb3B5ZWRpdFwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGNvcHllZGl0IFdpa2lwZWRpYSBhcnRpY2xlcywgZW5nYWdpbmcgZWRpdG9ycyBpbiBjb252ZXJzYXRpb24gYWJvdXQgdGhlaXIgd3JpdGluZyBhbmQgaW1wcm92aW5nIHRoZSBjbGFyaXR5IG9mIHRoZSBsYW5ndWFnZSBvZiB0aGUgbWF0ZXJpYWwuIFN0dWRlbnRzIGxlYXJuIHRvIHdyaXRlIGluIGRpZmZlcmVudCB2b2ljZXMgZm9yIGRpZmZlcmVudCBhdWRpZW5jZXMuIEluIGxlYXJuaW5nIGFib3V0IHRoZSBzcGVjaWZpYyB2b2ljZSBvbiBXaWtpcGVkaWEsIHRoZXkgbGVhcm4gYWJvdXQgdGhlIOKAnGF1dGhvcml0YXRpdmXigJ0gdm9pY2UgYW5kIGhvdyBpdHMgdG9uZSBjYW4gY29udmluY2UsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgaXMgcXVlc3Rpb25hYmxlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiRW5nbGlzaCBncmFtbWFyIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgc3Ryb25nIHdyaXRpbmcgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjRVZBTFVBVEUgQVJUSUNMRVNcbiAgZXZhbHVhdGU6IFxuICAgIHRpdGxlOiBcIkV2YWx1YXRlIGFydGljbGVzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJGaXJzdCwgc3R1ZGVudHMgd3JpdGUgYSByZXBvcnQgYW5hbHl6aW5nIHRoZSBzdGF0ZSBvZiBXaWtpcGVkaWEgYXJ0aWNsZXMgb24gY291cnNlLXJlbGF0ZWQgdG9waWNzIHdpdGggYW4gZXllIHRvd2FyZCBmdXR1cmUgcmV2aXNpb25zLiBUaGlzIGVuY291cmFnZXMgYSBjcml0aWNhbCByZWFkaW5nIG9mIGJvdGggY29udGVudCBhbmQgZm9ybS4gVGhlbiwgdGhlIHN0dWRlbnRzIGVkaXQgYXJ0aWNsZXMgaW4gc2FuZGJveGVzIHdpdGggZmVlZGJhY2sgZnJvbSB0aGUgcHJvZmVzc29yLCBjYXJlZnVsbHkgc2VsZWN0aW5nIGFuZCBhZGRpbmcgcmVmZXJlbmNlcyB0byBpbXByb3ZlIHRoZSBhcnRpY2xlIGJhc2VkIG9uIHRoZWlyIGNyaXRpY2FsIGVzc2F5cy4gRmluYWxseSwgdGhleSBjb21wb3NlIGEgc2VsZi1hc3Nlc3NtZW50IGV2YWx1YXRpbmcgdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjUgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJDbGFzc2VzIHdpdGggZmV3ZXIgdGhhbiAzMCBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2Ugc3VydmV5IGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgQUREIElNQUdFUyBPUiBNVUxUSU1FRElBXG4gIG11bHRpbWVkaWE6IFxuICAgIHRpdGxlOiBcIiBBZGQgaW1hZ2VzIG9yIG11bHRpbWVkaWFcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIklmIHlvdXIgc3R1ZGVudHMgYXJlIGFkZXB0IGF0IG1lZGlhLCB0aGlzIGNhbiBiZSBhIGdyZWF0IHdheSBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhIGluIGEgbm9uLXRleHR1YWwgd2F5LiBJbiB0aGUgcGFzdCwgc3R1ZGVudHMgaGF2ZSBwaG90b2dyYXBoZWQgbG9jYWwgbW9udW1lbnRzIHRvIGlsbHVzdHJhdGUgYXJ0aWNsZXMsIGRlc2lnbmVkIGluZm9ncmFwaGljcyB0byBpbGx1c3RyYXRlIGNvbmNlcHRzLCBvciBjcmVhdGVkIHZpZGVvcyB0aGF0IGRlbW9uc3RyYXRlZCBhdWRpby12aXN1YWxseSB3aGF0IGFydGljbGVzIGRlc2NyaWJlIGluIHdvcmRzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgc3R1ZHlpbmcgcGhvdG9ncmFwaHksIHZpZGVvZ3JhcGh5LCBvciBncmFwaGljIGRlc2lnblwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBtZWRpYSBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ291cnNlSW5mb1xuIiwiV2l6YXJkU3RlcElucHV0cyA9XG4gIGludHJvOiBcbiAgICB0ZWFjaGVyOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgbmFtZSdcbiAgICAgIGlkOiAndGVhY2hlcidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvdXJzZV9uYW1lOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0NvdXJzZSBuYW1lJ1xuICAgICAgaWQ6ICdjb3Vyc2VfbmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzY2hvb2w6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnVW5pdmVyc2l0eSdcbiAgICAgIGlkOiAnc2Nob29sJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIHN1YmplY3Q6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnU3ViamVjdCdcbiAgICAgIGlkOiAnc3ViamVjdCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdHVkZW50czpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdBcHByb3hpbWF0ZSBudW1iZXIgb2Ygc3R1ZGVudHMnXG4gICAgICBpZDogJ3N0dWRlbnRzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgaW5zdHJ1Y3Rvcl91c2VybmFtZTpcbiAgICAgIGxhYmVsOiAnVXNlcm5hbWUgKHRlbXBvcmFyeSknXG4gICAgICBpZDogJ2luc3RydWN0b3JfdXNlcm5hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIHdpemFyZF9zdGFydF9kYXRlOlxuICAgICAgaXNEYXRlOiB0cnVlXG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBpc0RhdGU6IHRydWVcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIFxuICBtdWx0aW1lZGlhXzE6XG4gICAgbXVsdGltZWRpYV8xXzE6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ211bHRpbWVkaWFfMV8xJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDE/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICAgIG11bHRpbWVkaWFfMV8yOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzFfMidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgbXVsdGltZWRpYV8yOlxuICAgIG11bHRpbWVkaWFfMl8xOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhXzJfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgbXVsdGltZWRpYV8yXzI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ211bHRpbWVkaWFfMl8yJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAyPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgY29weWVkaXRfMTpcbiAgICBjb3B5ZWRpdF8xXzE6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzFfMSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMT8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuXG4gICAgY29weWVkaXRfMV8yOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdF8xXzInXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnVGV4dCBmb3IgdGhlIHF1ZXN0aW9uIDI/J1xuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcblxuICBjb3B5ZWRpdF8yOlxuICAgIGNvcHllZGl0XzJfMTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY29weWVkaXRfMl8xJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RleHQgZm9yIHRoZSBxdWVzdGlvbiAxPydcbiAgICAgIGRpc2FibGVkOiBmYWxzZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG5cbiAgICBjb3B5ZWRpdF8yXzI6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NvcHllZGl0XzJfMidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUZXh0IGZvciB0aGUgcXVlc3Rpb24gMj8nXG4gICAgICBkaXNhYmxlZDogZmFsc2VcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICBcblxuICBhc3NpZ25tZW50X3NlbGVjdGlvbjogXG4gICAgcmVzZWFyY2h3cml0ZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgd3JpdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogdHJ1ZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBtdWx0aW1lZGlhOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0FkZCBpbWFnZXMgJiBtdWx0aW1lZGlhJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG5cbiAgICBjb3B5ZWRpdDogXG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHllZGl0J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IGZhbHNlXG5cbiAgICBzb21ldGhpbmdfZWxzZTpcbiAgICAgIHR5cGU6ICdsaW5rJ1xuICAgICAgaHJlZjogJ21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJ1xuICAgICAgaWQ6ICdzb21ldGhpbmdfZWxzZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBIGRpZmZlcmVudCBhc3NpZ25tZW50PyBHZXQgaW4gdG91Y2ggaGVyZS4nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiBmYWxzZVxuICAgICAgdGlwSW5mbzpcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFwiSGF2ZSBhbm90aGVyIGlkZWEgZm9yIGluY29ycG9yYXRpbmcgV2lraXBlZGlhIGludG8geW91ciBjbGFzcz8gV2UndmUgZm91bmQgdGhhdCB0aGVzZSBhc3NpZ25tZW50cyB3b3JrIHdlbGwsIGJ1dCB0aGV5IGFyZW4ndCB0aGUgb25seSB3YXkgdG8gZG8gaXQuIEdldCBpbiB0b3VjaCwgYW5kIHdlIGNhbiB0YWxrIHRoaW5ncyB0aHJvdWdoOiA8YSBzdHlsZT0nY29sb3I6IzUwNWE3ZjsnIGhyZWY9J21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJz5jb250YWN0QHdpa2llZHUub3JnPC9hPi5cIlxuXG4gIGxlYXJuaW5nX2Vzc2VudGlhbHM6IFxuICAgIGNyZWF0ZV91c2VyOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NyZWF0ZV91c2VyJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JlYXRlIHVzZXIgYWNjb3VudCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIGVucm9sbDpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdlbnJvbGwnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdFbnJvbGwgdG8gdGhlIGNvdXJzZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG4gICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdDb21wbGV0ZSBvbmxpbmUgdHJhaW5pbmcnXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGludHJvZHVjZV9hbWJhc3NhZG9yczpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbnRyb2R1Y2VfYW1iYXNzYWRvcnMnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnSW50cm9kdWNlIFdpa2lwZWRpYSBBbWJhc3NhZG9ycyBJbnZvbHZlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgIyBpbmNsdWRlX2NvbXBsZXRpb246XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdpbmNsdWRlX2NvbXBsZXRpb24nXG4gICAgIyAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICMgICBsYWJlbDogJ0luY2x1ZGUgQ29tcGxldGlvbiBvZiB0aGlzIEFzc2lnbm1lbnQgYXMgUGFydCBvZiB0aGUgU3R1ZGVudHNcXCdzIEdyYWRlJ1xuICAgICMgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICB0cmFpbmluZ19ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHRyYWluaW5nX25vdF9ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX25vdF9ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIG5vdCBiZSBncmFkZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgZ2V0dGluZ19zdGFydGVkOiBcbiAgICBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JpdGlxdWUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGFkZF90b19hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdhZGRfdG9fYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0FkZCB0byBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gICAgY29weV9lZGl0X2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHlfZWRpdF9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgIGlsbHVzdHJhdGVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gIFxuXG4gIGNob29zaW5nX2FydGljbGVzOiBcbiAgICBwcmVwYXJlX2xpc3Q6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3ByZXBhcmVfbGlzdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIFxuICAgIHN0dWRlbnRzX2V4cGxvcmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3N0dWRlbnRzX2V4cGxvcmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIHJlcXVlc3RfaGVscDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVxdWVzdF9oZWxwJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIG9yIGV2YXVsYXRpbmcgYXJ0aWNsZSBjaG9pY2VzPydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBpZ25vcmVWYWxpZGF0aW9uOiB0cnVlXG4gICAgICBjb25kaXRpb25hbF9sYWJlbDogXG4gICAgICAgIHByZXBhcmVfbGlzdDogXCJXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBhcnRpY2xlcz9cIlxuICAgICAgICBzdHVkZW50c19leHBsb3JlOiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgZXZhbHVhdGluZyBzdHVkZW50IGNob2ljZXM/XCJcbiAgICAgIFxuXG5cbiAgcmVzZWFyY2hfcGxhbm5pbmc6IFxuICAgIGNyZWF0ZV9vdXRsaW5lOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjcmVhdGVfb3V0bGluZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUcmFkaXRpb25hbCBvdXRsaW5lJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogXCJUcmFkaXRpb25hbCBvdXRsaW5lXCJcbiAgICAgICAgY29udGVudDogXCJGb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGFuIG91dGxpbmUgdGhhdCByZWZsZWN0cyB0aGUgaW1wcm92ZW1lbnRzIHRoZXkgcGxhbiB0byBtYWtlLCBhbmQgdGhlbiBwb3N0IGl0IHRvIHRoZSBhcnRpY2xlJ3MgdGFsayBwYWdlLiBUaGlzIGlzIGEgcmVsYXRpdmVseSBlYXN5IHdheSB0byBnZXQgc3RhcnRlZC5cIlxuICAgIFxuICAgIHdyaXRlX2xlYWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3dyaXRlX2xlYWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBsZWFkIHNlY3Rpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiV2lraXBlZGlhIGxlYWQgc2VjdGlvblwiXG4gICAgICAgIGNvbnRlbnQ6XG4gICAgICAgICAgXCI8cD5Gb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGEgd2VsbC1iYWxhbmNlZCBzdW1tYXJ5IG9mIGl0cyBmdXR1cmUgc3RhdGUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uLiBUaGUgaWRlYWwgbGVhZCBzZWN0aW9uIGV4ZW1wbGlmaWVzIFdpa2lwZWRpYSdzIHN1bW1hcnkgc3R5bGUgb2Ygd3JpdGluZzogaXQgYmVnaW5zIHdpdGggYSBzaW5nbGUgc2VudGVuY2UgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcGxhY2VzIGl0IGluIGNvbnRleHQsIGFuZCB0aGVuIOKAlCBpbiBvbmUgdG8gZm91ciBwYXJhZ3JhcGhzLCBkZXBlbmRpbmcgb24gdGhlIGFydGljbGUncyBzaXplIOKAlCBpdCBvZmZlcnMgYSBjb25jaXNlIHN1bW1hcnkgb2YgdG9waWMuIEEgZ29vZCBsZWFkIHNlY3Rpb24gc2hvdWxkIHJlZmxlY3QgdGhlIG1haW4gdG9waWNzIGFuZCBiYWxhbmNlIG9mIGNvdmVyYWdlIG92ZXIgdGhlIHdob2xlIGFydGljbGUuPC9wPlxuICAgICAgICAgIDxwPk91dGxpbmluZyBhbiBhcnRpY2xlIHRoaXMgd2F5IGlzIGEgbW9yZSBjaGFsbGVuZ2luZyBhc3NpZ25tZW50IOKAlCBhbmQgd2lsbCByZXF1aXJlIG1vcmUgd29yayB0byBldmFsdWF0ZSBhbmQgcHJvdmlkZSBmZWVkYmFjayBmb3IuIEhvd2V2ZXIsIGl0IGNhbiBiZSBtb3JlIGVmZmVjdGl2ZSBmb3IgdGVhY2hpbmcgdGhlIHByb2Nlc3Mgb2YgcmVzZWFyY2gsIHdyaXRpbmcsIGFuZCByZXZpc2lvbi4gU3R1ZGVudHMgd2lsbCByZXR1cm4gdG8gdGhpcyBsZWFkIHNlY3Rpb24gYXMgdGhleSBnbywgdG8gZ3VpZGUgdGhlaXIgd3JpdGluZyBhbmQgdG8gcmV2aXNlIGl0IHRvIHJlZmxlY3QgdGhlaXIgaW1wcm92ZWQgdW5kZXJzdGFuZGluZyBvZiB0aGUgdG9waWMgYXMgdGhlaXIgcmVzZWFyY2ggcHJvZ3Jlc3Nlcy4gVGhleSB3aWxsIHRhY2tsZSBXaWtpcGVkaWEncyBlbmN5Y2xvcGVkaWMgc3R5bGUgZWFybHkgb24sIGFuZCB0aGVpciBvdXRsaW5lIGVmZm9ydHMgd2lsbCBiZSBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZWlyIGZpbmFsIHdvcmsuPC9wPlwiXG4gICAgICAgIFxuXG5cbiAgZHJhZnRzX21haW5zcGFjZTogXG4gICAgd29ya19saXZlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBsaXZlIGZyb20gdGhlIHN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgXG4gICAgc2FuZGJveDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnc2FuZGJveCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEcmFmdCBlYXJseSB3b3JrIGluIHNhbmRib3hlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgIFxuXG4gIHBlZXJfZmVlZGJhY2s6IFxuICAgIHBlZXJfcmV2aWV3czpcbiAgICAgIHR5cGU6ICdyYWRpb0dyb3VwJ1xuICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICBsYWJlbDogJydcbiAgICAgIHZhbHVlOiAndHdvJ1xuICAgICAgc2VsZWN0ZWQ6IDFcbiAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUd28gcGVlciByZXZpZXcnXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMFxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcxJ1xuICAgICAgICAgIHZhbHVlOiAnb25lJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdPbmUgcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAxXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzInXG4gICAgICAgICAgdmFsdWU6ICd0d28nXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnVHdvIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMlxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICczJ1xuICAgICAgICAgIHZhbHVlOiAndGhyZWUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ1RocmVlIHBlZXIgcmV2aWV3J1xuXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAzXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzQnXG4gICAgICAgICAgdmFsdWU6ICdmb3VyJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdGb3VyIHBlZXIgcmV2aWV3J1xuXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiA0XG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzUnXG4gICAgICAgICAgdmFsdWU6ICdmaXZlJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdGaXZlIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgXG4gIFxuXG4gIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6IFxuICAgIGNsYXNzX2Jsb2c6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX2Jsb2cnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDbGFzcyBibG9nIG9yIGRpc2N1c3Npb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdDbGFzcyBibG9nIG9yIGNsYXNzIGRpc2N1c3Npb24nXG4gICAgICAgIGNvbnRlbnQ6ICdTdHVkZW50cyBrZWVwIGEgcnVubmluZyBibG9nIGFib3V0IHRoZWlyIGV4cGVyaWVuY2VzLiBHaXZpbmcgdGhlbSBwcm9tcHRzIGV2ZXJ5IHdlZWsgb3IgdHdvLCBzdWNoIGFzIOKAnFRvIHdoYXQgZXh0ZW50IGFyZSB0aGUgZWRpdG9ycyBvbiBXaWtpcGVkaWEgYSBzZWxmLXNlbGVjdGluZyBncm91cCBhbmQgd2h5P+KAnSB3aWxsIGhlbHAgdGhlbSB0aGluayBhYm91dCB0aGUgbGFyZ2VyIGlzc3VlcyBzdXJyb3VuZGluZyB0aGlzIG9ubGluZSBlbmN5Y2xvcGVkaWEgY29tbXVuaXR5LiBJdCB3aWxsIGFsc28gZ2l2ZSB5b3UgbWF0ZXJpYWwgYm90aCBvbiB0aGUgd2lraSBhbmQgb2ZmIHRoZSB3aWtpIHRvIGdyYWRlLiBJZiB5b3UgaGF2ZSB0aW1lIGluIGNsYXNzLCB0aGVzZSBkaXNjdXNzaW9ucyBjYW4gYmUgcGFydGljdWxhcmx5IGNvbnN0cnVjdGl2ZSBpbiBwZXJzb24uJ1xuICAgICAgXG4gICAgY2xhc3NfcHJlc2VudGF0aW9uOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbi1jbGFzcyBwcmVzZW50YXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ0luLWNsYXNzIHByZXNlbnRhdGlvbiBvZiBXaWtpcGVkaWEgd29yaydcbiAgICAgICAgY29udGVudDogXCJFYWNoIHN0dWRlbnQgb3IgZ3JvdXAgcHJlcGFyZXMgYSBzaG9ydCBwcmVzZW50YXRpb24gZm9yIHRoZSBjbGFzcywgZXhwbGFpbmluZyB3aGF0IHRoZXkgd29ya2VkIG9uLCB3aGF0IHdlbnQgd2VsbCBhbmQgd2hhdCBkaWRuJ3QsIGFuZCB3aGF0IHRoZXkgbGVhcm5lZC4gVGhlc2UgcHJlc2VudGF0aW9ucyBjYW4gbWFrZSBleGNlbGxlbnQgZm9kZGVyIGZvciBjbGFzcyBkaXNjdXNzaW9ucyB0byByZWluZm9yY2UgeW91ciBjb3Vyc2UncyBsZWFybmluZyBnb2Fscy5cIlxuICAgICAgXG4gICAgcmVmbGVjdGl2ZV9lc3NheTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgY29udGVudDogXCJBc2sgc3R1ZGVudHMgdG8gd3JpdGUgYSBzaG9ydCByZWZsZWN0aXZlIGVzc2F5IG9uIHRoZWlyIGV4cGVyaWVuY2VzIHVzaW5nIFdpa2lwZWRpYS4gVGhpcyB3b3JrcyB3ZWxsIGZvciBib3RoIHNob3J0IGFuZCBsb25nIFdpa2lwZWRpYSBwcm9qZWN0cy4gQW4gaW50ZXJlc3RpbmcgaXRlcmF0aW9uIG9mIHRoaXMgaXMgdG8gaGF2ZSBzdHVkZW50cyB3cml0ZSBhIHNob3J0IHZlcnNpb24gb2YgdGhlIGVzc2F5IGJlZm9yZSB0aGV5IGJlZ2luIGVkaXRpbmcgV2lraXBlZGlhLCBvdXRsaW5pbmcgdGhlaXIgZXhwZWN0YXRpb25zLCBhbmQgdGhlbiBoYXZlIHRoZW0gcmVmbGVjdCBvbiB3aGV0aGVyIG9yIG5vdCB0aGV5IG1ldCB0aG9zZSBleHBlY3RhdGlvbnMgZHVyaW5nIHRoZSBhc3NpZ25tZW50LlwiXG4gICAgICBcbiAgICBwb3J0Zm9saW86XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3BvcnRmb2xpbydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgICAgY29udGVudDogXCJTdHVkZW50cyBvcmdhbml6ZSB0aGVpciBXaWtpcGVkaWEgd29yayBpbnRvIGEgcG9ydGZvbGlvLCBpbmNsdWRpbmcgYSBuYXJyYXRpdmUgb2YgdGhlIGNvbnRyaWJ1dGlvbnMgdGhleSBtYWRlIOKAlCBhbmQgaG93IHRoZXkgd2VyZSByZWNlaXZlZCwgYW5kIHBvc3NpYmx5IGNoYW5nZWQsIGJ5IG90aGVyIFdpa2lwZWRpYW5zIOKAlCBhbmQgbGlua3MgdG8gdGhlaXIga2V5IGVkaXRzLiBDb21wb3NpbmcgdGhpcyBwb3J0Zm9saW8gd2lsbCBoZWxwIHN0dWRlbnRzIHRoaW5rIG1vcmUgZGVlcGx5IGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlcywgYW5kIGFsc28gcHJvdmlkZXMgYSBsZW5zIHRocm91Z2ggd2hpY2ggdG8gdW5kZXJzdGFuZCDigJQgYW5kIGdyYWRlIOKAlCB0aGVpciB3b3JrLlwiXG4gICAgXG4gICAgb3JpZ2luYWxfcGFwZXI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdPcmlnaW5hbCBhbmFseXRpY2FsIHBhcGVyJ1xuICAgICAgICBjb250ZW50OiBcIkluIGNvdXJzZXMgdGhhdCBlbXBoYXNpemUgdHJhZGl0aW9uYWwgcmVzZWFyY2ggc2tpbGxzIGFuZCB0aGUgZGV2ZWxvcG1lbnQgb2Ygb3JpZ2luYWwgaWRlYXMgdGhyb3VnaCBhIHRlcm0gcGFwZXIsIFdpa2lwZWRpYSdzIHBvbGljeSBvZiBcXFwibm8gb3JpZ2luYWwgcmVzZWFyY2hcXFwiIG1heSBiZSB0b28gcmVzdHJpY3RpdmUuIE1hbnkgaW5zdHJ1Y3RvcnMgcGFpciBXaWtpcGVkaWEgd3JpdGluZyB3aXRoIGEgY29tcGxlbWVudGFyeSBhbmFseXRpY2FsIHBhcGVyOyBzdHVkZW50c+KAmSBXaWtpcGVkaWEgYXJ0aWNsZXMgc2VydmUgYXMgYSBsaXRlcmF0dXJlIHJldmlldywgYW5kIHRoZSBzdHVkZW50cyBnbyBvbiB0byBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGluIHRoZSBvZmZsaW5lIGFuYWx5dGljYWwgcGFwZXIuXCJcbiAgICBcbiAgZHlrOlxuICAgIGR5azpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZHlrJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRGlkIFlvdSBLbm93PydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICBnYTogXG4gICAgZ2E6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2dhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnR29vZCBBcnRpY2xlIG5vbWluYXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgXG5cbiAgIyBncmFkaW5nX211bHRpbWVkaWE6IFxuICAjICAgY29tcGxldGVfbXVsdGltZWRpYTpcbiAgIyAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICMgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICMgICAgIGlkOiAnY29tcGxldGVfbXVsdGltZWRpYSdcbiAgIyAgICAgdmFsdWU6IDUwXG4gICMgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICMgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuICBcbiAgIyBncmFkaW5nX2NvcHllZGl0OiBcbiAgIyAgIGNvbXBsZXRlX2NvcHllZGl0OlxuICAjICAgICB0eXBlOiAncGVyY2VudCdcbiAgIyAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgIyAgICAgaWQ6ICdvbXBsZXRlX2NvcHllZGl0J1xuICAjICAgICB2YWx1ZTogNTBcbiAgIyAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgIyAgICAgY29udGluZ2VudFVwb246IFtdXG5cblxuICBncmFkaW5nOiBcbiAgICByZXNlYXJjaHdyaXRlOlxuICAgICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgV2lraXBlZGlhIHRyYWluaW5nJ1xuICAgICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgICB2YWx1ZTogNVxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICAgICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICAgIF1cblxuICAgICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdFYXJseSBXaWtpcGVkaWEgZXhlcmNpc2VzJ1xuICAgICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgICAgdmFsdWU6IDE1ICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBvdXRsaW5lX3F1YWxpdHk6XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBpZDogJ291dGxpbmVfcXVhbGl0eSdcbiAgICAgICAgbGFiZWw6ICdRdWFsaXR5IG9mIGJpYmxpb2dyYXBoeSBhbmQgb3V0bGluZSdcbiAgICAgICAgdmFsdWU6IDEwICAgXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgICBwZWVyX3Jldmlld3M6XG4gICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdQZWVyIHJldmlld3MgYW5kIGNvbGxhYm9yYXRpb24gd2l0aCBjbGFzc21hdGVzJ1xuICAgICAgICB2YWx1ZTogMTAgICBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAgIGNvbnRyaWJ1dGlvbl9xdWFsaXR5OlxuICAgICAgICB0eXBlOiAncGVyY2VudCcgXG4gICAgICAgIGlkOiAnY29udHJpYnV0aW9uX3F1YWxpdHknXG4gICAgICAgIGxhYmVsOiAnUXVhbGl0eSBvZiB5b3VyIG1haW4gV2lraXBlZGlhIGNvbnRyaWJ1dGlvbnMnXG4gICAgICAgIHZhbHVlOiA1MFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnIFxuICAgICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgICAgdmFsdWU6IDEwXG4gICAgICAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgICAgIHBhdGh3YXlJZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgICAgJ2NsYXNzX2Jsb2cnXG4gICAgICAgICAgJ2NsYXNzX3ByZXNlbnRhdGlvbidcbiAgICAgICAgICAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgICAgICAncG9ydGZvbGlvJ1xuICAgICAgICAgICdvcmlnaW5hbF9wYXBlcidcbiAgICAgICAgXVxuXG4gICAgY29weWVkaXQ6XG4gICAgICBjb3B5ZWRpdDpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnQ29weWVkaXQgYXJ0aWNsZXMnXG4gICAgICAgIGlkOiAnY29weWVkaXQnXG4gICAgICAgIHZhbHVlOiAxMDBcbiAgICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgICAgcGF0aHdheUlkOiAnY29weWVkaXQnXG4gICAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXG4gICAgICAgIF1cbiAgICBtdWx0aW1lZGlhOlxuICAgICAgbXVsdGltZWRpYTpcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgICAgdmFsdWU6IDEwMFxuICAgICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgICBwYXRod2F5SWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgICBjb250aW5nZW50VXBvbjogW1xuICAgICAgICBdXG5cblxuXG5cbiAgICBncmFkaW5nX3NlbGVjdGlvbjpcbiAgICAgIGxhYmVsOiAnR3JhZGluZyBiYXNlZCBvbjonXG4gICAgICBpZDogJ2dyYWRpbmdfc2VsZWN0aW9uJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICByZW5kZXJJbk91dHB1dDogZmFsc2VcbiAgICAgIG9wdGlvbnM6IFxuICAgICAgICBwZXJjZW50OiBcbiAgICAgICAgICBsYWJlbDogJ1BlcmNlbnRhZ2UnXG4gICAgICAgICAgdmFsdWU6ICdwZXJjZW50J1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIHBvaW50czpcbiAgICAgICAgICBsYWJlbDogJ1BvaW50cydcbiAgICAgICAgICB2YWx1ZTogJ3BvaW50cydcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcblxuXG4gIG92ZXJ2aWV3OiBcbiAgICBsZWFybmluZ19lc3NlbnRpYWxzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgZXNzZW50aWFscydcbiAgICAgIGlkOiAnbGVhcm5pbmdfZXNzZW50aWFscydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIGNob29zaW5nX2FydGljbGVzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG5cbiAgICByZXNlYXJjaF9wbGFubmluZzpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuXG4gICAgd2l6YXJkX3N0YXJ0X2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgY291cnNlX2RldGFpbHM6XG4gICAgZGVzY3JpcHRpb246ICcnXG4gICAgdGVybV9zdGFydF9kYXRlOiAnJ1xuICAgIHRlcm1fZW5kX2RhdGU6ICcnXG4gICAgc3RhcnRfZGF0ZTogJydcbiAgICBzdGFydF93ZWVrb2ZfZGF0ZTogJydcbiAgICBlbmRfd2Vla29mX2RhdGU6ICcnXG4gICAgZW5kX2RhdGU6ICcnXG4gICAgd2Vla2RheXNfc2VsZWN0ZWQ6IFtmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV1cbiAgICBsZW5ndGhfaW5fd2Vla3M6IDE2XG4gICAgYXNzaWdubWVudHM6IFtdXG5cblxuXG4gICAgXG5cblxuXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRTdGVwSW5wdXRzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFZpZXdIZWxwZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCAnbGluaycsICggdGV4dCwgdXJsICkgLT5cblxuICB0ZXh0ID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB0ZXh0IClcbiAgdXJsICA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdXJsIClcblxuICByZXN1bHQgPSAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCI+JyArIHRleHQgKyAnPC9hPidcblxuICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyggcmVzdWx0IClcbilcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwoJ2NvdXJzZURldGFpbHMnLCAnc3VwMicpIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSAtIEFwcGxpY2F0aW9uIEluaXRpdGlhbGl6ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCcuL2FwcCcpXG5cblxuJCAtPlxuXG4gIG1vbWVudC5sb2NhbGUoJ2VuJywgeyB3ZWVrIDogeyBkb3cgOiAxLCBkb3k6IDQgfSB9KVxuXG4gICMgSW5pdGlhbGl6ZSBBcHBsaWNhdGlvblxuICBhcHBsaWNhdGlvbi5pbml0aWFsaXplKClcblxuICAjIFN0YXJ0IEJhY2tib25lIHJvdXRlclxuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KClcblxuXG4gICIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvc3VwZXJzL01vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTW9kZWwgZXh0ZW5kcyBNb2RlbFxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgRVZFTlQgSEFORExFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIC0gUm91dGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUm91dGVzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBcbiAgcm91dGVzOlxuICAgICcnIDogJ2hvbWUnXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBIYW5kbGVyc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaG9tZTogLT5cbiAgICBpZiAkKCcjYXBwJykubGVuZ3RoID4gMFxuXG4gICAgICBAY3VycmVudFdpa2lVc2VyID0gJCggJyNhcHAnICkuYXR0cignZGF0YS13aWtpdXNlcicpXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2ludHJvJ11bJ2luc3RydWN0b3JfdXNlcm5hbWUnXVsndmFsdWUnXSA9IEBjdXJyZW50V2lraVVzZXJcblxuICAgICAgJCggJyNhcHAnICkuaHRtbChhcHBsaWNhdGlvbi5ob21lVmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcCcpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcCcpKVxuXG4gICAgICBlbHNlIGlmIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXBpZCcpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvSWQnLCBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwaWQnKSlcblxuXG4gICAgZWxzZSBpZiAkKCcjbG9naW4nKS5sZW5ndGggPiAwXG5cbiAgICAgICgkICcjbG9naW4nKS5odG1sKGFwcGxpY2F0aW9uLmxvZ2luVmlldy5yZW5kZXIoKS5lbClcblxuICAjXG4gICMgVXRpbGl0aWVzXG4gICNcblxuICBnZXRQYXJhbWV0ZXJCeU5hbWU6IChuYW1lKSAtPlxuXG4gICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvW1xcW10vLCBcIlxcXFxbXCIpLnJlcGxhY2UoL1tcXF1dLywgXCJcXFxcXVwiKVxuXG4gICAgcmVnZXggPSBuZXcgUmVnRXhwKFwiW1xcXFw/Jl1cIiArIG5hbWUgKyBcIj0oW14mI10qKVwiKVxuXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKVxuXG4gICAgKGlmIG5vdCByZXN1bHRzPyB0aGVuIFwiXCIgZWxzZSBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKSlcblxuXG4iLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBIb21lIFBhZ2UgVGVtcGxhdGVcXG4tLT5cXG5cXG48IS0tIE1BSU4gQVBQIENPTlRFTlQgLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuY29udGVudCAtLT5cXG5cXG5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sb2dpbl9pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxvZ2luX2luc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAgc3RlcC0tZmlyc3Qgc3RlcC0tbG9naW5cXFwiPlxcbiAgICBcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgICAgICAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgICAgICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmxvZ2luX2luc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG5cXG4gICAgICAgIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImxvZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIvYXV0aC9tZWRpYXdpa2lcXFwiPlxcbiAgICAgICAgICAgIExvZ2luIHdpdGggV2lraXBlZGlhXFxuICAgICAgICAgIDwvYT5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxkaXYgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwiZG90IHN0ZXAtbmF2LWluZGljYXRvcnNfX2l0ZW0gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0FjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmhhc1Zpc2l0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGRhdGEtbmF2LWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBJZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcElkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+KjwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJ2aXNpdGVkXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbmFjdGl2ZVwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vLWFycm93IFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IFN0ZXAgTmF2aWdhdGlvbiBcXG4tLT5cXG5cXG5cXG48IS0tIFNURVAgTkFWIERPVCBJTkRJQ0FUT1JTIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWluZGljYXRvcnMgaGlkZGVuXFxcIj5cXG5cXG4gIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zdGVwcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1pbmRpY2F0b3JzIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBOQVYgQlVUVE9OUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnMtLW5vcm1hbFxcXCI+XFxuICAgIDxhIGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLXByZXYgcHJldiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnByZXZJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLXJpZ2h0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLWxlZnRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnByZXZUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAucHJldlRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgPC9hPlxcblxcbiAgICA8YSBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IG5leHQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5uZXh0SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0xhc3RTdGVwLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uZXh0VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm5leHRUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLWxlZnQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tcmlnaHRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPC9hPlxcbiAgPC9kaXY+XFxuXFxuXFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zLS1lZGl0XFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXZfX2J1dHRvbi0tZXhpdC1lZGl0IGNvbmZpcm0gZXhpdC1lZGl0XFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmJhY2tUb092ZXJ2aWV3VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmJhY2tUb092ZXJ2aWV3VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtYnV0dG9ucyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZSBmb3IgdGhlIElOVFJPIEZPUk0gU0NSRUVOXFxuLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFxcbiAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgXFxuICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zZWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9kaXY+XFxuICAgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuICA8IS0tIElOVFJPIFNURVAgRk9STSBBUkVBIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj5cXG4gICAgPCEtLSBmb3JtIGZpZWxkcyAtLT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taW5uZXIgLS0+XFxuXFxuXFxuICA8IS0tIERBVEVTIE1PRFVMRSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1kYXRlc1xcXCI+XFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWRhdGVzIC0tPlxcblxcbiAgPGRpdiBjbGFzcz0nZm9ybS1jb250YWluZXIgY3VzdG9tLWlucHV0Jz5cXG5cXG4gICAgPGZvcm0gaWQ9J2NvdXJzZUxlbmd0aCcgb25zdWJtaXQ9J3JldHVybiBmYWxzZSc+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgIDxsYWJlbCBmb3I9J3Rlcm1TdGFydERhdGUnPkNvdXJzZSBiZWdpbnM8L2xhYmVsPlxcbiAgICAgICAgPGlucHV0IGlkPSd0ZXJtU3RhcnREYXRlJyBuYW1lPSd0ZXJtU3RhcnREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0ndGVybUVuZERhdGUnPkNvdXJzZSBlbmRzPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0ndGVybUVuZERhdGUnIG5hbWU9J3Rlcm1FbmREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlU3RhcnREYXRlJz5Bc3NpZ25tZW50IHN0YXJ0czwvbGFiZWw+XFxuICAgICAgICA8aW5wdXQgaWQ9J2NvdXJzZVN0YXJ0RGF0ZScgbmFtZT0nY291cnNlU3RhcnREYXRlJyB0eXBlPSdkYXRlJz5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgPGxhYmVsIGZvcj0nY291cnNlRW5kRGF0ZSc+QXNzaWdubWVudCBlbmRzPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBpZD0nY291cnNlRW5kRGF0ZScgbmFtZT0nY291cnNlRW5kRGF0ZScgdHlwZT0nZGF0ZSc+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyJyBzdHlsZT1cXFwiZGlzcGxheTpub25lO1xcXCI+XFxuICAgICAgICA8bGFiZWwgZm9yPSdjb3Vyc2VMZW5ndGgnIHN0eWxlPVxcXCJ2ZXJ0aWNhbC1hbGlnbjptaWRkbGU7XFxcIj5Db3Vyc2UgTGVuZ3RoPC9sYWJlbD5cXG4gICAgICAgIDxpbnB1dCBkZWZhdWx0VmFsdWU9JzE2JyBpZD0nY0xlbmd0aCcgbWF4PScxNicgbWluPSc2JyBuYW1lPSdjb3Vyc2VMZW5ndGgnIHN0ZXA9JzEnIHR5cGU9J3JhbmdlJyB2YWx1ZT0nMTYnIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmU7XFxcIj5cXG4gICAgICAgIDxvdXRwdXQgbmFtZT0nb3V0Mic+PC9vdXRwdXQ+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWNvbnRhaW5lcic+XFxuICAgICAgICA8bGFiZWw+Q2xhc3MgbWVldHMgb246IDwvbGFiZWw+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJvdmVydmlldy1zZWxlY3Qtd3JhcHBlciBvdmVydmlldy1zZWxlY3Qtd3JhcHBlci0tZG93XFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz0nb3ZlcnZpZXctc2VsZWN0LWlucHV0LWNvbnRhaW5lcic+XFxuICAgICAgICAgICAgPGlucHV0IGNsYXNzPSdkb3dDaGVja2JveCcgaWQ9J21vbmRheScgbmFtZT0nTW9uZGF5JyB0eXBlPSdjaGVja2JveCcgdmFsdWU9JzAnPlxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9J21vbmRheSc+TW9uZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0ndHVlc2RheScgbmFtZT0nVHVlc2RheScgdHlwZT0nY2hlY2tib3gnIHZhbHVlPScxJz5cXG4gICAgICAgICAgICA8bGFiZWwgZm9yPSd0dWVzZGF5Jz5UdWVzZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nd2VkbmVzZGF5JyBuYW1lPSdXZWRuZXNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMic+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nd2VkbmVzZGF5Jz5XZWRuZXNkYXlzPC9sYWJlbD5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSd0aHVyc2RheScgbmFtZT0nVGh1cnNkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nMyc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0ndGh1cnNkYXknPlRodXJzZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nZnJpZGF5JyBuYW1lPSdGcmlkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNCc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nZnJpZGF5Jz5GcmlkYXlzPC9sYWJlbD5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9J292ZXJ2aWV3LXNlbGVjdC1pbnB1dC1jb250YWluZXInPlxcbiAgICAgICAgICAgIDxpbnB1dCBjbGFzcz0nZG93Q2hlY2tib3gnIGlkPSdzYXR1cmRheScgbmFtZT0nU2F0dXJkYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNSc+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nc2F0dXJkYXknPlNhdHVyZGF5czwvbGFiZWw+XFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1zZWxlY3QtaW5wdXQtY29udGFpbmVyJz5cXG4gICAgICAgICAgICA8aW5wdXQgY2xhc3M9J2Rvd0NoZWNrYm94JyBpZD0nc3VuZGF5JyBuYW1lPSdTdW5kYXknIHR5cGU9J2NoZWNrYm94JyB2YWx1ZT0nNic+XFxuICAgICAgICAgICAgPGxhYmVsIGZvcj0nc3VuZGF5Jz5TdW5kYXlzPC9sYWJlbD5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPSdvdmVydmlldy1pbnB1dC1jb250YWluZXIgb3ZlcnZpZXctaW5wdXQtY29udGFpbmVyLS1ibGFja291dC1kYXRlcyc+XFxuICAgICAgICBcXG4gICAgICAgIDxpbnB1dCBpZD0nYmxhY2tvdXREYXRlc0ZpZWxkJyBuYW1lPSdibGFja291dERhdGVzRmllbGQnIHR5cGU9J2hpZGRlbic+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJibGFja291dERhdGVzLXdyYXBwZXJcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJibGFja291dERhdGVzLWlubmVyXFxcIj5cXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJibGFja291dERhdGVzLWxhYmVsXFxcIj5TZWxlY3QgZGF5cyB3aGVyZSBjbGFzcyBkb2VzIG5vdCBtZWV0IChpZiBhbnkpOjwvZGl2PlxcbiAgICAgICAgICAgIDxkaXYgaWQ9XFxcImJsYWNrb3V0RGF0ZXNcXFwiIGNsYXNzPVxcXCJibGFja291dERhdGVzXFxcIj48L2Rpdj5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Zvcm0+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcIm91dHB1dC1jb250YWluZXJcXFwiPjwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwicHJldmlldy1jb250YWluZXJcXFwiPjwvZGl2PlxcblxcbiAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcIm5vLWVkaXQtbW9kZVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWUgaW5hY3RpdmVcXFwiIGlkPVxcXCJiZWdpbkJ1dHRvblxcXCIgaHJlZj1cXFwiXFxcIj5cXG4gICAgICAgIFN0YXJ0IGRlc2lnbmluZyBteSBhc3NpZ25tZW50XFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZWRpdC1tb2RlLW9ubHlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGV4aXQtZWRpdFxcXCIgaHJlZj1cXFwiI1xcXCI+XFxuICAgICAgICBCYWNrXFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFyayBzdGVwLWluZm9fX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5mb1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbmZvVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cCBjbGFzcz1cXFwibGFyZ2Ugc3RlcC1pbmZvX19pbnRyb1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gSEVBREVSIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIENPTlRFTlQgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9fY29udGVudCAtLT5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBzdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXJcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlciAtLT5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYWluIEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIEZPUk0gOiBMZWZ0IFNpZGUgb2YgU3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWxheW91dFxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1sYXlvdXRfX2lubmVyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgICBcXG4gICAgICA8IS0tIFNURVAgRk9STSBJTk5FUiBDT05URU5UIC0tPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLWlubmVyXFxcIj5cXG4gICAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICAgIDxhIGNsYXNzPVxcXCJtYWluLWxvZ29cXFwiIGhyZWY9XFxcImh0dHA6Ly93aWtpZWR1Lm9yZ1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIHRpdGxlPVxcXCJ3aWtpZWR1Lm9yZ1xcXCI+V0lLSUVEVS5PUkc8L2E+XFxuXFxuICAgIDwhLS0gU1RFUCBJTkZPIElOTkVSIC0tPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8td3JhcHBlclxcXCI+XFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbmZvVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFxcbiAgICAgIDwhLS0gSU5GTyBTRUNUSU9OUyAtLT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG4gICAgXFxuXFxuXFxuICAgIFxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxwPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9wPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGkgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLWdyaWRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRleHQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRleHQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIDogPHNwYW4gY2xhc3M9XFxcInN0YXJzIHN0YXJzLS1cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8gc3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrIFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkFzc2lnbm1lbnQgdHlwZTogXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGV4dFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZGVzY3JpcHRpb24sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk1pbmltdW0gdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm1pbl90aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubWluX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5SZWNvbW1lbmRlZCB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucmVjX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5yZWNfdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QmVzdCBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5iZXN0X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Ob3QgYXBwcm9wcmlhdGUgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubm90X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5MZWFybmluZyBPYmplY3RpdmVzPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubGVhcm5pbmdfb2JqZWN0aXZlcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5jb250ZW50KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5jb250ZW50OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICBcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kaXNhYmxlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJjaGVjay1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcImluZm8taWNvblxcXCI+PC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm90LWVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGRhdGEtZXhjbHVzaXZlPVxcXCJ0cnVlXFxcIiBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS10ZXh0X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXBlcmNlbnRcXFwiIGRhdGEtcGF0aHdheS1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBhdGh3YXlJZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tcGVyY2VudF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1jb250YWluZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpY29uIGljb24tLXBlcmNlbnRcXFwiPjwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpY29uIGljb24tLXBvaW50c1xcXCI+cG9pbnRzPC9kaXY+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG1heGxlbmd0aD1cXFwiM1xcXCIgLz5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdCBjdXN0b20taW5wdXQtYWNjb3JkaWFuXFxcIj5cXG4gIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+W2VkaXRdPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19pbm5lciBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19oZWFkZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICBcXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2NvbnRlbnRcXFwiPlxcbiAgICA8dWw+XFxuICAgICAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmFzc2lnbm1lbnRzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTcsIHByb2dyYW0xNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC91bD5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8bGk+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKSlcbiAgICArIFwiPC9saT5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWxpbmtcXFwiPlxcbiAgPGxhYmVsPjxhIGhyZWY9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5ocmVmKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiID5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvYT48L2xhYmVsPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvXFxcIj5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyIGN1c3RvbS1pbnB1dC1yYWRpby1pbm5lci0tZ3JvdXBcXFwiPlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI1LCBwcm9ncmFtMjUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uYW1lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVyY2VudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIlxuICAgICsgXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5saW5rKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE5LCBwcm9ncmFtMTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW8pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjEsIHByb2dyYW0yMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0dyb3VwKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFya3VwIGZvciBTdGFydC9FbmQgRGF0ZSBJbnB1dCBNb2R1bGVcXG4tLT5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXMgYXV0by1oZWlnaHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19sYWJlbFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGxpPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCkpXG4gICAgKyBcIjwvbGk+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC13cmFwcGVyIGhhcy1jb250ZW50IGVkaXRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdCBjdXN0b20taW5wdXQtYWNjb3JkaWFuXFxcIj5cXG4gICAgPGEgY2xhc3M9XFxcImVkaXQtYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwSWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBJZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPltlZGl0XTwvYT5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19pbm5lciBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19oZWFkZXJcXFwiPlxcbiAgICAgIDxsYWJlbD5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgXFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2NvbnRlbnQgY3VzdG9tLWlucHV0LWFjY29yZGlhbl9fY29udGVudFxcXCI+XFxuICAgICAgPHVsPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmFzc2lnbm1lbnRzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC91bD5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBvdmVyLWxpbWl0IFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW8gY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuXFxuICAgICAgICAgICAgPGxhYmVsIGZvcj1cXFwicGVyY2VudFxcXCI+PHNwYW4+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG5cXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cXFwiZ3JhZGluZy1zZWxlY3Rpb25cXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAvPlxcblxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdcXFwiPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc3VtbWFyeVxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX190b3RhbFxcXCI+XFxuXFxuICAgICAgPGgzPlRvdGFsPC9oMz5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX19wZXJjZW50IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNPdmVyTGltaXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcblxcbiAgICAgIDxoMyBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3RvdGFsLW51bWJlclxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRvdGFsR3JhZGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRvdGFsR3JhZGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPHNwYW4gY2xhc3M9XFxcInBlcmNlbnQtc3ltYm9sXFxcIj4lPC9zcGFuPjwvaDM+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuICBcXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvblxcXCI+XFxuXFxuICAgIDxoNSBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uX190aXRsZVxcXCI+R3JhZGluZyBiYXNlZCBvbjo8L2g1PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb24tZm9ybVxcXCI+XFxuXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXdyYXBwZXJcXFwiPlxcblxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLm9wdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIjtcblxuXG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcInt7Y291cnNlIGRldGFpbHMgPGJyLz5cXG4gfCBjb3Vyc2VfbmFtZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3Vyc2VfbmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW5zdHJ1Y3Rvcl91c2VybmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGluc3RydWN0b3JfcmVhbG5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGVhY2hlcikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IHN1YmplY3QgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3ViamVjdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IHN0YXJ0X2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNvdXJzZV9kZXRhaWxzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0YXJ0X2RhdGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiA8YnIvPlxcbiB8IGVuZF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jb3Vyc2VfZGV0YWlscyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lbmRfZGF0ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgaW5zdGl0dXRpb24gPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2Nob29sKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIDxici8+XFxuIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgPGJyLz5cXG59fTxici8+XFxuPGJyLz5cXG5cIjtcbiAgaWYgKHN0YWNrMiA9IGhlbHBlcnMuZGVzY3JpcHRpb24pIHsgc3RhY2syID0gc3RhY2syLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2syID0gZGVwdGgwLmRlc2NyaXB0aW9uOyBzdGFjazIgPSB0eXBlb2Ygc3RhY2syID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazIuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazIpXG4gICAgKyBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImludGVyZXN0ZWRfaW5fRFlLID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0RZSyA9IG5vIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0geWVzXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSBub1wiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxLCBzdGFjazI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyByZXR1cm4gc3RhY2syOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiXFxuIHwgd2FudF9oZWxwX2ZpbmRpbmdfYXJ0aWNsZXMgPSB5ZXNcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazEsIHN0YWNrMjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZXF1ZXN0X2hlbHApKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IHJldHVybiBzdGFjazI7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgPGJyLz5cXG4gfCB3YW50X2hlbHBfZXZhbHVhdGluZ19hcnRpY2xlcyA9IHllc1wiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugb3B0aW9ucyA8YnIvPlxcbiB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmR5ayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5keWspKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgPGJyLz5cXG4gfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nYSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5nYSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucHJlcGFyZV9saXN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIDxici8+XFxufX0gPGJyLz5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIHN0YWNrMTtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnJlbmRlckluT3V0cHV0LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IHJldHVybiBzdGFjazE7IH1cbiAgZWxzZSB7IHJldHVybiAnJzsgfVxuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiVcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIj09R3JhZGluZz09IDxici8+XFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IGdyYWRpbmcgPGJyLz5cXG5cIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZ3JhZGVJdGVtcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBzdGFjazE7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5yZW5kZXJJbk91dHB1dCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyByZXR1cm4gc3RhY2sxOyB9XG4gIGVsc2UgeyByZXR1cm4gJyc7IH1cbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIlXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI9PUdyYWRpbmc9PVxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBncmFkaW5nIFxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmdyYWRpbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVzZWFyY2h3cml0ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI8YnIvPn19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiNURU1QQUxURVxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdibHVySGFuZGxlcidcblxuICBtOiAnJ1xuICBkOiAnJ1xuICB5OiAnJ1xuICBkYXRlVmFsdWU6ICcnXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICAkKCdib2R5Jykub24gJ2NsaWNrJywgKGUpID0+XG5cbiAgICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBibHVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgZm9jdXNIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgY2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG4gICAgJHRhcmdldCA9ICgkIGUuY3VycmVudFRhcmdldClcblxuICAgIGlkID0gJHRhcmdldC5hdHRyKCdkYXRhLWRhdGUtaWQnKVxuXG4gICAgdHlwZSA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLXR5cGUnKVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdW3R5cGVdID0gdmFsdWVcblxuICAgIEBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgQGQgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWydkYXknXVxuXG4gICAgQHkgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWyd5ZWFyJ11cblxuICAgIEBkYXRlVmFsdWUgPSBcIiN7QHl9LSN7QG19LSN7QGR9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBAZGF0ZVZhbHVlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdkYXRlOmNoYW5nZScsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoYXNWYWx1ZTogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJ3NlbGVjdCcpLnZhbCgpICE9ICcnXG5cblxuICBjbG9zZUlmTm9WYWx1ZTogLT5cblxuICAgIGlmIEBoYXNWYWx1ZSgpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzVmFsaWQ6IC0+XG4gICAgaXNJdCA9IGZhbHNlXG5cbiAgICBpZiBAbSAhPSAnJyBhbmQgQGQgIT0gJycgYW5kIEB5ICE9ICcnXG4gICAgICBpc0l0ID0gdHJ1ZVxuXG4gICAgcmV0dXJuIGlzSXRcblxuXG5cblxuXG5cbiIsIiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5XaWtpR3JhZGluZ01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicycpXG5cbiNEYXRhXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEdyYWRpbmdJbnB1dFZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgdGVtcGxhdGU6IFdpa2lHcmFkaW5nTW9kdWxlXG5cblxuICBldmVudHM6XG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpbnB1dENoYW5nZUhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgbGFiZWwnIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICdncmFkZTpjaGFuZ2UnIDogJ2dyYWRlQ2hhbmdlSGFuZGxlcidcblxuICBjdXJyZW50VmFsdWVzOiBbXVxuXG5cbiAgdmFsdWVMaW1pdDogMTAwXG5cblxuICBncmFkaW5nU2VsZWN0aW9uRGF0YTogV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddXG5cblxuICBjdXJyZW50VG90YWw6IC0+XG5cbiAgICB0b3RhbCA9IDBcblxuICAgIF8uZWFjaChAY3VycmVudFZhbHVlcywgKHZhbCkgPT5cblxuICAgICAgdG90YWwgKz0gcGFyc2VJbnQodmFsKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIHRvdGFsXG5cblxuXG4gIGdldElucHV0VmFsdWVzOiAtPlxuXG4gICAgdmFsdWVzID0gW11cblxuICAgIEBwYXJlbnRTdGVwVmlldy4kZWwuZmluZCgnaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nKS5lYWNoKC0+XG5cbiAgICAgIGN1clZhbCA9ICgkIHRoaXMpLnZhbCgpXG5cbiAgICAgIGlmIGN1clZhbFxuICAgICAgICBcbiAgICAgICAgdmFsdWVzLnB1c2goY3VyVmFsKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgKCQgdGhpcykudmFsKDApXG5cbiAgICAgICAgdmFsdWVzLnB1c2goMClcblxuXG5cbiAgICApXG5cbiAgICBAY3VycmVudFZhbHVlcyA9IHZhbHVlc1xuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgZ3JhZGVDaGFuZ2VIYW5kbGVyOiAoaWQsIHZhbHVlKSAtPlxuICAgIFxuICAgIEBnZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpXG5cblxuICByYWRpb0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRFbCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJHBhcmVudEdyb3VwID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuXG4gICAgaWYgJHBhcmVudEVsLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBlbHNlXG5cbiAgICAgICRvdGhlclJhZGlvcyA9ICRwYXJlbnRHcm91cC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpLm5vdCgkcGFyZW50RWxbMF0pXG5cbiAgICAgICRvdGhlclJhZGlvcy5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLm9wdGlvbnMsIChvcHQpIC0+XG5cbiAgICAgICAgb3B0LnNlbGVjdGVkID0gZmFsc2VcbiAgICAgICAgXG4gICAgICApXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS5vcHRpb25zWyRpbnB1dEVsLmF0dHIoJ2lkJyldLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10udmFsdWUgPSAkaW5wdXRFbC5hdHRyKCdpZCcpXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICBvdXQgPSB7XG5cbiAgICAgIHRvdGFsR3JhZGU6IEBjdXJyZW50VG90YWwoKVxuXG4gICAgICBpc092ZXJMaW1pdDogQGN1cnJlbnRUb3RhbCgpID4gQHZhbHVlTGltaXRcblxuICAgICAgb3B0aW9uczogQGdyYWRpbmdTZWxlY3Rpb25EYXRhLm9wdGlvbnNcblxuICAgIH1cblxuICAgIHJldHVybiBvdXRcblxuXG5cblxuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Ib21lVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvSG9tZVRlbXBsYXRlLmhicycpXG5cbiNTVUJWSUVXU1xuU3RlcFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9TdGVwVmlldycpXG5cblN0ZXBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9TdGVwTW9kZWwnKVxuXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuVGltZWxpbmVWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvVGltZWxpbmVWaWV3JylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG5cbiAgdGVtcGxhdGU6IEhvbWVUZW1wbGF0ZVxuXG5cbiAgc3RlcERhdGE6IFxuXG4gICAgaW50cm86IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5pbnRyb19zdGVwc1xuXG4gICAgcGF0aHdheXM6IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5wYXRod2F5c1xuXG4gICAgb3V0cm86IGFwcGxpY2F0aW9uLldpemFyZENvbmZpZy5vdXRyb19zdGVwc1xuXG5cbiAgcGF0aHdheUlkczogLT5cblxuICAgIHJldHVybiBfLmtleXMoQHN0ZXBEYXRhLnBhdGh3YXlzKVxuXG4gIHN0ZXBWaWV3czogW11cblxuXG4gIGFsbFN0ZXBWaWV3czpcblxuICAgIGludHJvOiBbXVxuXG4gICAgcGF0aHdheTogW11cblxuICAgIG91dHJvOiBbXVxuXG5cbiAgc2VsZWN0ZWRQYXRod2F5czogW11cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIElOSVRcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgIEBTdGVwTmF2ID0gbmV3IFN0ZXBOYXZWaWV3KClcblxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBzdGVwc1JlbmRlcmVkID0gZmFsc2VcblxuXG4gIGV2ZW50czogXG5cbiAgICAnY2xpY2sgLmV4aXQtZWRpdCcgOiAnZXhpdEVkaXRDbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6bmV4dCcgOiAnbmV4dEhhbmRsZXInXG5cbiAgICAnc3RlcDpwcmV2JyA6ICdwcmV2SGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9IYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6Z290b0lkJyA6ICdnb3RvSWRIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6ZWRpdCcgOiAnZWRpdEhhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuICAgICdlZGl0OmV4aXQnIDogJ29uRWRpdEV4aXQnXG5cblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcblxuICAgIHVubGVzcyBAc3RlcHNSZW5kZXJlZFxuICAgIFxuICAgICAgQGFmdGVyUmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAJGlubmVyQ29udGFpbmVyID0gQCRlbC5maW5kKCcuY29udGVudCcpXG5cbiAgICBAcmVuZGVySW50cm9TdGVwcygpXG5cbiAgICBAcmVuZGVyU3RlcHMoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuXG4gICAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuICAgIHNldFRpbWVvdXQoPT5cbiAgICAgIEB0aW1lbGluZVZpZXcgPSBuZXcgVGltZWxpbmVWaWV3KClcbiAgICAsMTAwMClcbiAgICBcblxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVySW50cm9TdGVwczogLT5cblxuICAgIHN0ZXBOdW1iZXIgPSAwXG5cbiAgICBfLmVhY2goQHN0ZXBEYXRhLmludHJvLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBzdGVwTnVtYmVyIClcblxuICAgICAgaWYgaW5kZXggaXMgMFxuXG4gICAgICAgIG5ld3ZpZXcuaXNGaXJzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIEBhbGxTdGVwVmlld3MuaW50cm8ucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVyU3RlcHM6IC0+XG5cbiAgICBAYWxsU3RlcFZpZXdzLnBhdGh3YXkgPSBbXVxuXG4gICAgc3RlcE51bWJlciA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBfLmVhY2goQHNlbGVjdGVkUGF0aHdheXMsIChwaWQsIHBpbmRleCkgPT5cblxuICAgICAgXy5lYWNoKEBzdGVwRGF0YS5wYXRod2F5c1twaWRdLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICBpZiBAc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggPiAxXG5cbiAgICAgICAgICBpZiBzdGVwLmlkIGlzICdncmFkaW5nJyB8fCBzdGVwLmlkIGlzICdvdmVydmlldycgfHwgc3RlcC50eXBlIGlzICdncmFkaW5nJyB8fCBzdGVwLnR5cGUgaXMgJ292ZXJ2aWV3J1xuXG4gICAgICAgICAgICBpZiBwaW5kZXggPCBAc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggLSAxXG5cbiAgICAgICAgICAgICAgcmV0dXJuIFxuXG4gICAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICAgIClcblxuICAgICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgICAgKVxuXG4gICAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIHN0ZXBOdW1iZXIgKVxuXG4gICAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC0tI3tzdGVwLmlkfVwiKVxuXG4gICAgICAgIG5ld3ZpZXcuJGVsLmFkZENsYXNzKFwic3RlcC1wYXRod2F5IHN0ZXAtcGF0aHdheS0tI3twaWR9XCIpXG5cbiAgICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgICAgQGFsbFN0ZXBWaWV3cy5wYXRod2F5LnB1c2gobmV3dmlldylcblxuICAgICAgICBzdGVwTnVtYmVyKytcblxuICAgICAgKVxuICAgIFxuICAgIClcblxuICAgIHJldHVybiBAXG5cbiAgcmVuZGVyT3V0cm9TdGVwczogLT5cblxuICAgIEBhbGxTdGVwVmlld3Mub3V0cm8gPSBbXVxuXG4gICAgc3RlcE51bWJlciA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBfLmVhY2goQHN0ZXBEYXRhLm91dHJvLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgc3RlcE51bWJlciArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBzdGVwTnVtYmVyIClcblxuICAgICAgaWYgaW5kZXggaXMgQHN0ZXBEYXRhLm91dHJvLmxlbmd0aCAtIDFcblxuICAgICAgICBuZXd2aWV3LmlzTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgQHN0ZXBWaWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICAgIEBhbGxTdGVwVmlld3Mub3V0cm8ucHVzaChuZXd2aWV3KVxuXG4gICAgICBzdGVwTnVtYmVyKytcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIHJlY3JlYXRlUGF0aHdheTogLT5cblxuICAgIGNsb25lID0gQHN0ZXBWaWV3c1xuXG4gICAgQHN0ZXBWaWV3cyA9IFtjbG9uZVswXSwgY2xvbmVbMV1dXG5cbiAgICBfLmVhY2goQGFsbFN0ZXBWaWV3cy5wYXRod2F5LCAoc3RlcCkgLT5cblxuICAgICAgc3RlcC5yZW1vdmUoKVxuXG4gICAgKVxuXG4gICAgXy5lYWNoKEBhbGxTdGVwVmlld3Mub3V0cm8sIChzdGVwKSAtPlxuXG4gICAgICBzdGVwLnJlbW92ZSgpXG5cbiAgICApXG5cbiAgICBAcmVuZGVyU3RlcHMoKVxuXG4gICAgQHJlbmRlck91dHJvU3RlcHMoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGNvbnRlbnQ6IFwiVGhpcyBpcyBzcGVjaWFsIGNvbnRlbnRcIlxuXG4gICAgfVxuICAgIFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwKz0xXG4gICAgXG4gICAgaWYgQGN1cnJlbnRTdGVwIGlzIEBzdGVwVmlld3MubGVuZ3RoIFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgZGVjcmVtZW50U3RlcDogLT5cblxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHVwZGF0ZVN0ZXA6IChpbmRleCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IGluZGV4XG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgdXBkYXRlU3RlcEJ5SWQ6IChpZCkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgaWYgc3RlcFZpZXcuc3RlcElkKCkgaXMgaWRcblxuICAgICAgICBAdXBkYXRlU3RlcChfLmluZGV4T2YoQHN0ZXBWaWV3cyxzdGVwVmlldykpXG4gICAgICAgIFxuICAgICAgICByZXR1cm5cbiAgICAgIFxuICAgIClcblxuXG4gIHNob3dDdXJyZW50U3RlcDogLT5cblxuICAgIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5zaG93KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6dXBkYXRlJywgQGN1cnJlbnRTdGVwKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHVwZGF0ZVNlbGVjdGVkUGF0aHdheTogKGFjdGlvbiwgcGF0aHdheUlkKSAtPlxuXG4gICAgaWYgYWN0aW9uIGlzICdhZGQnXG5cbiAgICAgIGlmIHBhdGh3YXlJZCBpcyAncmVzZWFyY2h3cml0ZSdcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cyA9IFtwYXRod2F5SWRdXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cy5wdXNoKHBhdGh3YXlJZClcblxuICAgIGVsc2UgaWYgYWN0aW9uIGlzICdyZW1vdmUnXG5cbiAgICAgIGlmIHBhdGh3YXlJZCBpcyAncmVzZWFyY2h3cml0ZSdcblxuICAgICAgICBAc2VsZWN0ZWRQYXRod2F5cyA9IFtdXG5cbiAgICAgIGVsc2VcblxuICAgICAgICByZW1vdmVJbmRleCA9IF8uaW5kZXhPZihAc2VsZWN0ZWRQYXRod2F5LCBwYXRod2F5SWQpXG5cbiAgICAgICAgQHNlbGVjdGVkUGF0aHdheXMuc3BsaWNlKHJlbW92ZUluZGV4KVxuXG4gICAgQHJlY3JlYXRlUGF0aHdheSgpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgY3VycmVudFN0ZXBWaWV3OiAtPlxuXG4gICAgcmV0dXJuIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXVxuXG5cbiAgaGlkZUFsbFN0ZXBzOiAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy5oaWRlKClcbiAgICAgIFxuICAgIClcblxuXG4gIGhpZGVBbGxUaXBzOiAoZSkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgc3RlcFZpZXcudGlwVmlzaWJsZSA9IGZhbHNlXG4gICAgICBcbiAgICApXG5cbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIG5leHRIYW5kbGVyOiAtPlxuXG4gICAgQGFkdmFuY2VTdGVwKClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG4gIHByZXZIYW5kbGVyOiAtPlxuXG4gICAgQGRlY3JlbWVudFN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGVkaXRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBpZiBpZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICB4ID0gY29uZmlybSgnQXJlIHlvdSBzdXJlIHlvdSB3YW50IHRvIHN0YXJ0IHRoZSBwcm9jZXNzIG92ZXIgd2l0aCBhIG5ldyBhc3NpZ25tZW50IHR5cGU/JylcbiAgICAgIGlmICF4XG4gICAgICAgIHJldHVyblxuXG4gICAgZWxzZSAgICAgICBcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCdlZGl0LW1vZGUnKVxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsICh2aWV3LCBpbmRleCkgPT5cblxuICAgICAgaWYgdmlldy5tb2RlbC5pZCA9PSBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKGluZGV4KVxuXG4gICAgKVxuXG5cbiAgb25FZGl0RXhpdDogLT5cblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygnZWRpdC1tb2RlJylcblxuXG4gIGV4aXRFZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdlZGl0OmV4aXQnKVxuXG5cblxuICBnb3RvSGFuZGxlcjogKGluZGV4KSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ290b0lkSGFuZGxlcjogKGlkKSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXBCeUlkKGlkKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGdldFNlbGVjdGVkSWRzOiAtPlxuXG4gICAgc2VsZWN0ZWRJZHMgPSBbXVxuXG4gICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHMsIChzdGVwcykgPT5cblxuICAgICAgXy5lYWNoKHN0ZXBzLCAoc3RlcCkgPT5cblxuICAgICAgICBpZiBzdGVwLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgIGlmIHN0ZXAuaWRcblxuICAgICAgICAgICAgc2VsZWN0ZWRJZHMucHVzaCBzdGVwLmlkXG5cbiAgICAgIClcblxuICAgIClcblxuICAgIHJldHVybiBzZWxlY3RlZElkc1xuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcbklucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIElucHV0VmlldyBcblxuXG4gICIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Mb2dpblRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzJylcblxuTG9naW5Db250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9Mb2dpbkNvbnRlbnQnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogTG9naW5UZW1wbGF0ZVxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgXG4gICAgcmV0dXJuIExvZ2luQ29udGVudCIsIlxuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Db3Vyc2VEZXRhaWxzVGVtcGFsdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMnKVxuR3JhZGluZ1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nVGVtcGxhdGUuaGJzJylcbkNvdXJzZU9wdGlvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicycpXG5cblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgT3V0cHV0VmlldyBleHRlbmRzIFZpZXcgXG5cbiAgY3VycmVudEJ1aWxkOiAnJ1xuXG4gIGRldGFpbHNUZW1wbGF0ZTogQ291cnNlRGV0YWlsc1RlbXBhbHRlXG5cbiAgZ3JhZGluZ1RlbXBsYXRlOiBHcmFkaW5nVGVtcGxhdGVcblxuICBvcHRpb25zVGVtcGxhdGU6IENvdXJzZU9wdGlvbnNUZW1wbGF0ZVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICd3aXphcmQ6cHVibGlzaCcgOiAncHVibGlzaEhhbmRsZXInXG4gICAgJ291dHB1dDp1cGRhdGUnICA6ICd1cGRhdGVCdWlsZCdcblxuICB1cGRhdGVCdWlsZDogKGJ1aWxkKSAtPlxuICAgIEBjdXJyZW50QnVpbGQgPSBidWlsZFxuICAgICMgY29uc29sZS5sb2cgQGN1cnJlbnRCdWlsZFxuXG5cbiAgb3V0cHV0UGxhaW5UZXh0OiAtPlxuXG4gICAgQHJlbmRlcigpXG5cbiAgICByZXR1cm4gQCRlbC50ZXh0KClcblxuXG4gIHJlbmRlcjogLT5cbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcG9wdWxhdGVPdXRwdXQ6IC0+XG5cbiAgICBkZXRhaWxzT3V0cHV0ID0gQCRlbC5odG1sKEBkZXRhaWxzVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgcmF3QXNzaWdubWVudE91dHB1dCA9IEAkZWwuaHRtbChAdGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgYXNzaWdubWVudE91dHB1dCA9IHJhd0Fzc2lnbm1lbnRPdXRwdXQucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSxcIlwiKVxuXG4gICAgZ3JhZGluZ091dHB1dCA9IEAkZWwuaHRtbChAZ3JhZGluZ1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIG9wdGlvbnNPdXRwdXQgPSBAJGVsLmh0bWwoQG9wdGlvbnNUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBjb3Vyc2VPdXQgPSBkZXRhaWxzT3V0cHV0ICsgYXNzaWdubWVudE91dHB1dCArIGdyYWRpbmdPdXRwdXQgKyBvcHRpb25zT3V0cHV0XG4gICAgXG4gICAgcmV0dXJuIGNvdXJzZU91dFxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiBfLmV4dGVuZChXaXphcmRTdGVwSW5wdXRzLHsgZGVzY3JpcHRpb246ICQoJyNzaG9ydF9kZXNjcmlwdGlvbicpLnZhbCgpLCBsaW5lQnJlYWs6ICc8YnIvPid9KVxuXG5cbiAgZXhwb3J0RGF0YTogKGZvcm1EYXRhKSAtPlxuXG4gICAgJC5hamF4KFxuXG4gICAgICB0eXBlOiAnUE9TVCdcblxuICAgICAgdXJsOiAnL3B1Ymxpc2gnXG5cbiAgICAgIGRhdGE6XG5cbiAgICAgICAgd2lraXRleHQ6IGZvcm1EYXRhXG5cbiAgICAgICAgY291cnNlX3RpdGxlOiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlXG5cbiAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSkgLT5cblxuICAgICAgICAkKCcjcHVibGlzaCcpLnJlbW92ZUNsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgICBpZiByZXNwb25zZS5zdWNjZXNzXG5cbiAgICAgICAgICBuZXdQYWdlID0gXCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpLyN7cmVzcG9uc2UudGl0bGV9XCJcblxuICAgICAgICAgIGFsZXJ0KFwiQ29uZ3JhdHMhIFlvdSBoYXZlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkL2VkaXRlZCBhIFdpa2llZHUgQ291cnNlIGF0ICN7bmV3UGFnZX1cIilcblxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbmV3UGFnZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIGNvbnNvbGUubG9nIHJlc3BvbnNlXG5cbiAgICAgICAgICBhbGVydCgnSG1tLi4uIHNvbWV0aGluZyB3ZW50IHdyb25nLiBUcnkgY2xpY2tpbmcgXCJQdWJsaXNoXCIgYWdhaW4uIElmIHRoYXQgZG9lc25cXCd0IHdvcmssIHBsZWFzZSBzZW5kIGEgbWVzc2FnZSB0byBzYWdlQHdpa2llZHUub3JnLicpXG5cblxuICAgIClcbiAgICBcblxuICBwdWJsaXNoSGFuZGxlcjogLT5cblxuICAgIGlmIFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWUubGVuZ3RoID4gMCBcblxuICAgICAgJCgnI3B1Ymxpc2gnKS5hZGRDbGFzcygncHJvY2Vzc2luZycpXG5cbiAgICAgIGNvbnNvbGUubG9nIEBjdXJyZW50QnVpbGRcblxuICAgICAgQGV4cG9ydERhdGEoQGN1cnJlbnRCdWlsZClcblxuICAgIGVsc2VcblxuICAgICAgYWxlcnQoJ1lvdSBtdXN0IGVudGVyIGEgY291cnNlIHRpdGxlIGFzIHRoaXMgd2lsbCBiZWNvbWUgdGhlIHRpdGxlIG9mIHlvdXIgY291cnNlIHBhZ2UuJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJ2ludHJvJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICQoJyNjb3Vyc2VfbmFtZScpLmZvY3VzKClcblxuICAgICAgLDUwMClcblxuXG4gICAgXG5cbiAgICBcblxuICAgIFxuIiwiIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL2FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbldpa2lTdW1tYXJ5TW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraVN1bW1hcnlNb2R1bGUuaGJzJylcbldpa2lEZXRhaWxzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURldGFpbHNNb2R1bGUuaGJzJylcblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblRpbWVsaW5lVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1RpbWVsaW5lVmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBPdmVydmlld1ZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgZXZlbnRzOiBcbiAgICAnY2xpY2sgLmV4cGFuZC1hbGwnIDogJ2V4cGFuZENvbGxhcHNlQWxsJ1xuXG4gIG92ZXJ2aWV3SXRlbVRlbXBsYXRlOiBXaWtpRGV0YWlsc01vZHVsZVxuXG4gIGV4cGFuZENvbGxhcHNlQWxsOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICR0YXJnZXQudG9nZ2xlQ2xhc3MoJ29wZW4nKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyLmhhcy1jb250ZW50JykuZmluZCgnLmN1c3RvbS1pbnB1dC1hY2NvcmRpYW4nKS50b2dnbGVDbGFzcygnYWN0aXZlJylcblxuICAgIGlmICR0YXJnZXQuaGFzQ2xhc3MoJ29wZW4nKVxuICAgICAgJHRhcmdldC50ZXh0KCdbY29sbGFwc2UgYWxsXScpXG4gICAgZWxzZVxuICAgICAgJHRhcmdldC50ZXh0KCdbZXhwYW5kIGFsbF0nKVxuXG5cblxuICAgIFxuXG4gIHJlbmRlcjogLT5cblxuICAgIHNlbGVjdGVkUGF0aHdheXMgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzXG5cbiAgICBzZWxlY3RlZE9iamVjdHMgPSBfLndoZXJlKFdpemFyZFN0ZXBJbnB1dHNbJ2Fzc2lnbm1lbnRfc2VsZWN0aW9uJ10sIHtzZWxlY3RlZDogdHJ1ZX0pXG5cbiAgICAkKCc8ZGl2IGNsYXNzPVwic3RlcC1mb3JtLWNvbnRlbnRfX3RpdGxlXCI+U2VsZWN0ZWQgYXNzaWdubWVudChzKTo8L2Rpdj4nKS5hcHBlbmRUbyhAJGVsKS5jc3MoXG4gICAgICBtYXJnaW5Cb3R0b206ICc4cHgnXG4gICAgKVxuXG4gICAgXy5lYWNoKHNlbGVjdGVkT2JqZWN0cywgKG9iaikgPT5cblxuICAgICAgcGF0aFRpdGxlID0gb2JqLmxhYmVsXG5cbiAgICAgICRuZXdUaXRsZSA9ICQoQG92ZXJ2aWV3SXRlbVRlbXBsYXRlKFxuXG4gICAgICAgIGxhYmVsOiBwYXRoVGl0bGVcblxuICAgICAgICBzdGVwSWQ6ICdhc3NpZ25tZW50X3NlbGVjdGlvbidcblxuICAgICAgICBhc3NpZ25tZW50czogW11cblxuICAgICAgKSkuZmluZCgnLmN1c3RvbS1pbnB1dCcpLnJlbW92ZUNsYXNzKCdjdXN0b20taW5wdXQtLWFjY29yZGlhbicpXG5cbiAgICAgICRuZXdUaXRsZS5maW5kKCcuZWRpdC1idXR0b24nKVxuXG4gICAgICBAJGVsLmFwcGVuZCgkbmV3VGl0bGUpXG5cbiAgICApXG5cbiAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICBcbiAgICBcbiAgICBfLmVhY2goc2VsZWN0ZWRQYXRod2F5cywgKHBpZCwgaSkgPT5cblxuICAgICAgc3RlcERhdGEgPSBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwRGF0YS5wYXRod2F5c1twaWRdXG5cbiAgICAgIGlucHV0RGF0YUlkcyA9IF8ucGx1Y2soc3RlcERhdGEsICdpZCcpXG5cbiAgICAgIHN0ZXBUaXRsZXMgPSBfLnBsdWNrKHN0ZXBEYXRhLCAndGl0bGUnKVxuXG4gICAgICB0b3RhbExlbmd0aCA9IHN0ZXBEYXRhLmxlbmd0aFxuXG4gICAgICBpZiBzdGVwVGl0bGVzLmxlbmd0aCA+IDAgJiYgaSBpcyAwXG5cbiAgICAgICAgJCgnPGRpdiBjbGFzcz1cInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVwiPkFzc2lnbm1lbnQgZGV0YWlsczogPGEgY2xhc3M9XCJleHBhbmQtYWxsXCIgaHJlZj1cIiNcIj5bZXhwYW5kIGFsbF08L2E+PC9kaXY+JykuYXBwZW5kVG8oQCRlbCkuY3NzKFxuICAgICAgICAgIGJvdHRvbTogJ2F1dG8nXG4gICAgICAgICAgZGlzcGxheTogJ2Jsb2NrJ1xuICAgICAgICAgIHBvc2l0aW9uOiAncmVsYXRpdmUnXG4gICAgICAgICAgbWFyZ2luQm90dG9tOiAnMCdcbiAgICAgICAgICBtYXJnaW5Ub3A6ICcxNXB4J1xuICAgICAgICApXG5cbiAgICAgIF8uZWFjaChzdGVwVGl0bGVzLCAodGl0bGUsIGluZGV4KSA9PlxuXG4gICAgICAgIHVubGVzcyBzdGVwRGF0YVtpbmRleF0uc2hvd0luT3ZlcnZpZXdcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIHNlbGVjdGVkSW5wdXRzID0gW11cblxuICAgICAgICBzdGVwSW5wdXRJdGVtcyA9IFdpemFyZFN0ZXBJbnB1dHNbaW5wdXREYXRhSWRzW2luZGV4XV1cblxuXG4gICAgICAgIF8uZWFjaChzdGVwSW5wdXRJdGVtcywgKGlucHV0KSA9PlxuXG4gICAgICAgICAgaWYgaW5wdXQudHlwZVxuXG4gICAgICAgICAgICBpZiBpbnB1dC50eXBlIGlzICdjaGVja2JveCcgfHwgaW5wdXQudHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgICAgICAgICAgaWYgaW5wdXQuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5sYWJlbFxuXG4gICAgICAgICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3JhZGlvR3JvdXAnXG5cbiAgICAgICAgICAgICAgaWYgaW5wdXQuaWQgaXMgJ3BlZXJfcmV2aWV3cydcblxuICAgICAgICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggaW5wdXQub3ZlcnZpZXdMYWJlbFxuICAgICAgICApXG5cbiAgICAgICAgaWYgc2VsZWN0ZWRJbnB1dHMubGVuZ3RoID09IDBcblxuICAgICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggXCJbTm9uZSBzZWxlY3RlZF1cIlxuXG4gICAgICAgIEAkZWwuYXBwZW5kKCBAb3ZlcnZpZXdJdGVtVGVtcGxhdGUoXG5cbiAgICAgICAgICBsYWJlbDogdGl0bGVcblxuICAgICAgICAgIHN0ZXBJZDogaW5wdXREYXRhSWRzW2luZGV4XVxuXG4gICAgICAgICAgYXNzaWdubWVudHM6IHNlbGVjdGVkSW5wdXRzXG5cbiAgICAgICAgKSlcblxuICAgICAgKVxuICAgIClcblxuICAgIEByZW5kZXJEZXNjcmlwdGlvbigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuXG4gIHJlbmRlckRlc2NyaXB0aW9uOiAtPlxuXG4gICAgQFRpbWVsaW5lVmlldyA9IG5ldyBUaW1lbGluZVZpZXcoKVxuXG4gICAgJGRlc2NJbnB1dCA9ICQoXCI8dGV4dGFyZWEgaWQ9J3Nob3J0X2Rlc2NyaXB0aW9uJyByb3dzPSc2JyBzdHlsZT0nd2lkdGg6MTAwJTtiYWNrZ3JvdW5kLWNvbG9yOnJnYmEoMjQyLDI0MiwyNDIsMS4wKTtib3JkZXI6MXB4IHNvbGlkIHJnYmEoMjAyLDIwMiwyMDIsMS4wKTtwYWRkaW5nOjEwcHggMTVweDtmb250LXNpemU6IDE2cHg7bGluZS1oZWlnaHQgMjNweDtsZXR0ZXItc3BhY2luZzogMC4yNXB4Oyc+PC90ZXh0YXJlYT5cIilcblxuICAgICRkZXNjSW5wdXQudmFsKFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb24pXG5cbiAgICAkKCcuZGVzY3JpcHRpb24tY29udGFpbmVyJykuaHRtbCgkZGVzY0lucHV0WzBdKVxuXG4gICAgJGRlc2NJbnB1dC5vZmYgJ2NoYW5nZSdcblxuICAgICRkZXNjSW5wdXQub24gJ2NoYW5nZScsIChlKSA9PlxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzLmNvdXJzZV9kZXRhaWxzLmRlc2NyaXB0aW9uID0gJChlLnRhcmdldCkudmFsKClcblxuICAgICAgQFRpbWVsaW5lVmlldy51cGRhdGUoKVxuICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudGltZWxpbmVWaWV3LnVwZGF0ZSgpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuXG4gICAgXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE5hdlZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cblN0ZXBOYXZUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBOYXZWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcC1uYXYnXG5cblxuICB0ZW1wbGF0ZTogU3RlcE5hdlRlbXBsYXRlXG5cblxuICBoYXNCZWVuVG9MYXN0U3RlcDogZmFsc2VcblxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgXG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6dXBkYXRlJyA6ICd1cGRhdGVDdXJyZW50U3RlcCdcblxuICAgICdzdGVwOmFuc3dlcmVkJyA6ICdzdGVwQW5zd2VyZWQnXG5cbiAgICAnZWRpdDpleGl0JyA6ICdlZGl0RXhpdEhhbmRsZXInXG5cblxuICBldmVudHM6IC0+XG5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnByZXYnIDogJ3ByZXZDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmRvdCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuXG4gIHJlbmRlcjogLT5cblxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPCBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgIGVsc2UgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPT0gQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGN1cnJlbnQ6IEBjdXJyZW50U3RlcFxuXG4gICAgICB0b3RhbDogQHRvdGFsU3RlcHNcblxuICAgICAgcHJldkluYWN0aXZlOiBAaXNJbmFjdGl2ZSgncHJldicpXG5cbiAgICAgIG5leHRJbmFjdGl2ZTogQGlzSW5hY3RpdmUoJ25leHQnKVxuXG4gICAgICBuZXh0VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICcnXG5cbiAgICAgICAgZWxzZSBcblxuICAgICAgICAgIHJldHVybiAnTmV4dCdcblxuICAgICAgcHJldlRpdGxlOiA9PlxuXG4gICAgICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgICAgIHJldHVybiAnQmFjaydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdQcmV2J1xuXG4gICAgICBpc0xhc3RTdGVwOiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIGJhY2tUb092ZXJ2aWV3VGl0bGU6ICdHbyBCYWNrIHRvIE92ZXJ2aWV3J1xuXG4gICAgICBzdGVwczogPT5cblxuICAgICAgICBvdXQgPSBbXVxuXG4gICAgICAgIF8uZWFjaChAc3RlcFZpZXdzLCAoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgICAgICBzdGVwRGF0YSA9IHN0ZXAubW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICAgICAgaXNBY3RpdmUgPSBAY3VycmVudFN0ZXAgaXMgaW5kZXhcblxuICAgICAgICAgIHdhc1Zpc2l0ZWQgPSBzdGVwLmhhc1VzZXJWaXNpdGVkXG5cbiAgICAgICAgICBvdXQucHVzaCB7aWQ6IGluZGV4LCBpc0FjdGl2ZTogaXNBY3RpdmUsIGhhc1Zpc2l0ZWQ6IHdhc1Zpc2l0ZWQsIHN0ZXBUaXRsZTogc3RlcERhdGEudGl0bGUsIHN0ZXBJZDogc3RlcERhdGEuaWR9XG5cbiAgICAgICAgKVxuXG4gICAgICAgIHJldHVybiBvdXRcblxuICAgIH1cblxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnZ3JhZGluZycpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICBkb3RDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZiBAaGFzQmVlblRvTGFzdFN0ZXBcblxuICAgICAgaWYgcGFyc2VJbnQoJHRhcmdldC5hdHRyKCdkYXRhLW5hdi1pZCcpKSA9PSBwYXJzZUludChAdG90YWxTdGVwcyAtIDEpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZWRpdDpleGl0JylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICR0YXJnZXQuZGF0YSgnc3RlcC1pZCcpKVxuXG4gICAgZWxzZVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCAkdGFyZ2V0LmRhdGEoJ25hdi1pZCcpKVxuXG5cbiAgZWRpdEV4aXRIYW5kbGVyOiAtPlxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGxhc3RTdGVwSW5kZXgoKSlcblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IHN0ZXBcblxuICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgQGhhc0JlZW5Ub0xhc3RTdGVwID0gdHJ1ZVxuXG4gICAgQHJlbmRlcigpXG5cblxuICBzdGVwQW5zd2VyZWQ6IChzdGVwVmlldykgLT5cblxuICAgIHJldHVybiBAcmVuZGVyKClcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSGVscGVyc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBsYXN0U3RlcEluZGV4OiAtPlxuICAgIFxuICAgIHJldHVybiBAdG90YWxTdGVwcy0xXG5cbiAgaXNMYXN0U3RlcDogLT5cblxuICAgIHJldHVybiBAY3VycmVudFN0ZXAgaXMgQHRvdGFsU3RlcHMgLSAxICYmIEBjdXJyZW50U3RlcCA+IDFcblxuICBpc0luYWN0aXZlOiAoaXRlbSkgLT5cblxuICAgIGl0SXMgPSB0cnVlXG5cbiAgICBpZiBpdGVtID09ICdwcmV2J1xuXG4gICAgICBpdElzID0gQGN1cnJlbnRTdGVwIGlzIDBcblxuICAgIGVsc2UgaWYgaXRlbSA9PSAnbmV4dCdcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uaGFzVXNlckFuc3dlcmVkXG5cbiAgICAgICAgaXRJcyA9IGZhbHNlXG5cbiAgICAgIGVsc2UgaWYgQGlzTGFzdFN0ZXAoKVxuICAgICAgICBcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgICAgaWYgYXBwbGljYXRpb24uaG9tZVZpZXcuc2VsZWN0ZWRQYXRod2F5cy5sZW5ndGggPT0gMFxuXG4gICAgICAgIGl0SXMgPSB0cnVlICBcblxuXG4gICAgcmV0dXJuIGl0SXNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcFZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyMjIyMjIyMjQVBQIyMjIyMjIyMjXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9hcHAnIClcblxuIyMjIyMjIyMjVklFVyBDTEFTUyMjIyMjIyMjI1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuIyMjIyMjIyMjU1VCVklFV1MjIyMjIyMjIyNcbklucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuXG5EYXRlSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvRGF0ZUlucHV0VmlldycpXG5cblxuR3JhZGluZ0lucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcnKVxuXG5cbk92ZXJ2aWV3VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL092ZXJ2aWV3VmlldycpXG5cblxuIyMjIyMjIyMjVEVNUExBVEVTIyMjIyMjIyMjIyNcblN0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9TdGVwVGVtcGxhdGUuaGJzJylcblxuXG5JbnRyb1N0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9JbnRyb1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5cbklucHV0VGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicycpXG5cblxuQ291cnNlVGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMnKVxuXG5cbldpa2lEYXRlc01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMnKVxuXG4jIyMjIyMjIyMjREFUQSMjIyMjIyMjI1xuQ291cnNlSW5mb0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZENvdXJzZUluZm8nKVxuXG4jIyMjIyMjIyNJTlBVVFMjIyMjIyMjIyNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcCdcblxuXG4gIHRhZ05hbWU6ICdzZWN0aW9uJ1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBUZW1wbGF0ZVxuXG5cbiAgaW50cm9UZW1wbGF0ZTogSW50cm9TdGVwVGVtcGxhdGVcblxuXG4gIHRpcFRlbXBsYXRlOiBJbnB1dFRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvVGVtcGxhdGU6IENvdXJzZVRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvRGF0YTogQ291cnNlSW5mb0RhdGFcblxuXG4gIGRhdGVzTW9kdWxlOiBXaWtpRGF0ZXNNb2R1bGVcblxuXG4gIGhhc1VzZXJBbnN3ZXJlZDogZmFsc2VcblxuXG4gIGhhc1VzZXJWaXNpdGVkOiBmYWxzZVxuXG5cbiAgaXNMYXN0U3RlcDogZmFsc2VcblxuXG4gIGlzRmlyc3RTdGVwOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlRTIEFORCBIQU5ETEVSU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6XG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuICAgICMgJ2NsaWNrIC5zdGVwLWluZm8tdGlwJyA6ICdoaWRlVGlwcydcblxuICBzdWJzY3JpcHRpb25zOiBcblxuICAgICd0aXBzOmhpZGUnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2RhdGU6Y2hhbmdlJyA6ICdpc0ludHJvVmFsaWQnXG5cblxuICBlZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIHN0ZXBJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXN0ZXAtaWQnKVxuXG4gICAgaWYgc3RlcElkXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsIHN0ZXBJZClcblxuICBzdGVwSWQ6IC0+XG5cbiAgICByZXR1cm4gQG1vZGVsLmF0dHJpYnV0ZXMuaWRcblxuXG4gIHZhbGlkYXRlRGF0ZXM6IC0+XG5cbiAgICB1bmxlc3MgQGlzRmlyc3RTdGVwIG9yIEBpc0xhc3RTdGVwXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZGF0ZXNBcmVWYWxpZCA9IGZhbHNlXG5cbiAgICAjIGlmICQoJyN0ZXJtU3RhcnREYXRlJykudmFsICE9ICcnICYmICQoJyN0ZXJtRW5kRGF0ZScpLnZhbCAhPSAnJyAmJiAkKCcjY291cnNlU3RhcnREYXRlJykudmFsICE9ICcnICYmICQoJyNjb3Vyc2VFbmREYXRlJykudmFsICE9ICcnXG4gICAgIyAgIGRhdGVzQXJlVmFsaWQgPSB0cnVlXG5cbiAgICBpZiBXaXphcmRTdGVwSW5wdXRzLmNvdXJzZV9kZXRhaWxzLnN0YXJ0X2RhdGUgIT0gJycgYW5kIFdpemFyZFN0ZXBJbnB1dHMuY291cnNlX2RldGFpbHMuZW5kX2RhdGUgIT0gJydcbiAgICAgIGRhdGVzQXJlVmFsaWQgPSB0cnVlXG5cbiAgICByZXR1cm4gZGF0ZXNBcmVWYWxpZFxuXG5cbiAgYWNjb3JkaWFuQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICR0YXJnZXQudG9nZ2xlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd3aXphcmQ6cHVibGlzaCcpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAdGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnZmlyc3QnKVxuXG4gICAgZWxzZSBpZiBAaXNMYXN0U3RlcFxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdsYXN0JylcbiAgICAgIFxuICAgIGVsc2VcblxuICAgICAgQF9yZW5kZXJTdGVwVHlwZSgnc3RhbmRhcmQnKVxuXG4gICAgQF9yZW5kZXJJbnB1dHNBbmRJbmZvKClcblxuICAgIHJldHVybiBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgX3JlbmRlclN0ZXBUeXBlOiAodHlwZSkgLT5cblxuICAgIGlmIHR5cGUgaXMgJ3N0YW5kYXJkJ1xuXG4gICAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ2ZpcnN0JyBvciB0eXBlIGlzICdsYXN0J1xuXG4gICAgICBpZiB0eXBlIGlzICdmaXJzdCdcblxuICAgICAgICBAJGVsLmFkZENsYXNzKCdzdGVwLS1maXJzdCcpLmh0bWwoIEBpbnRyb1RlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgICAgICBkYXRlVGl0bGUgPSAnQ291cnNlIGRhdGVzJ1xuXG4gICAgICAgIEAkYmVnaW5CdXR0b24gPSBAJGVsLmZpbmQoJ2EjYmVnaW5CdXR0b24nKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tbGFzdCcpLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICAgZGF0ZVRpdGxlID0gJ0Fzc2lnbm1lbnQgdGltZWxpbmUnXG5cblxuICAgICAgJGRhdGVzID0gJChAZGF0ZXNNb2R1bGUoe3RpdGxlOiBkYXRlVGl0bGV9KSlcblxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tZGF0ZXMnKS5odG1sKCRkYXRlcylcblxuICAgIHJldHVybiBAXG5cblxuICBfcmVuZGVySW5wdXRzQW5kSW5mbzogLT5cblxuICAgIEBpbnB1dFNlY3Rpb24gPSBAJGVsLmZpbmQoJy5zdGVwLWZvcm0taW5uZXInKVxuXG4gICAgQCR0aXBTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1pbmZvLXRpcHMnKVxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIHBhdGh3YXlzID0gYXBwbGljYXRpb24uaG9tZVZpZXcuc2VsZWN0ZWRQYXRod2F5c1xuXG4gICAgICBudW1iZXJPZlBhdGh3YXlzID0gcGF0aHdheXMubGVuZ3RoXG5cbiAgICAgIGlmIG51bWJlck9mUGF0aHdheXMgPiAxXG5cbiAgICAgICAgZGlzdHJpYnV0ZWRWYWx1ZSA9IE1hdGguZmxvb3IoMTAwL251bWJlck9mUGF0aHdheXMpXG5cbiAgICAgICAgQGlucHV0RGF0YSA9IFtdXG5cbiAgICAgICAgXy5lYWNoKHBhdGh3YXlzLCAocGF0aHdheSkgPT5cblxuICAgICAgICAgIGdyYWRpbmdEYXRhID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuYXR0cmlidXRlcy5pZF1bcGF0aHdheV1cblxuICAgICAgICAgIF8uZWFjaChncmFkaW5nRGF0YSwgKGdyYWRlSXRlbSkgPT5cblxuICAgICAgICAgICAgZ3JhZGVJdGVtLnZhbHVlID0gZGlzdHJpYnV0ZWRWYWx1ZVxuXG4gICAgICAgICAgICBAaW5wdXREYXRhLnB1c2ggZ3JhZGVJdGVtXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQGlucHV0RGF0YSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdW3BhdGh3YXlzWzBdXSB8fCBbXVxuXG4gICAgZWxzZVxuXG4gICAgICBAaW5wdXREYXRhID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuYXR0cmlidXRlcy5pZF0gfHwgW11cblxuXG4gICAgXy5lYWNoKEBpbnB1dERhdGEsIChpbnB1dCwgaW5kZXgpID0+XG5cbiAgICAgIHVubGVzcyBpbnB1dC50eXBlIFxuXG4gICAgICAgIHJldHVyblxuXG4gICAgICBpZiBpbnB1dC5zZWxlY3RlZCAmJiBpbnB1dC5yZXF1aXJlZFxuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuc2VsZWN0ZWQgXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC5yZXF1aXJlZCBpcyBmYWxzZVxuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQudHlwZSBpcyAncGVyY2VudCdcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG5cbiAgICAgIGlucHV0VmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXcgQmFja2JvbmUuTW9kZWwoaW5wdXQpXG5cbiAgICAgIClcblxuICAgICAgaW5wdXRWaWV3LmlucHV0VHlwZSA9IGlucHV0LnR5cGVcblxuICAgICAgaW5wdXRWaWV3Lml0ZW1JbmRleCA9IGluZGV4XG5cbiAgICAgIGlucHV0Vmlldy5wYXJlbnRTdGVwID0gQFxuXG4gICAgICBAaW5wdXRTZWN0aW9uLmFwcGVuZChpbnB1dFZpZXcucmVuZGVyKCkuZWwpXG5cbiAgICAgIGlmIGlucHV0LnRpcEluZm9cblxuICAgICAgICB0aXAgPSBcblxuICAgICAgICAgIGlkOiBpbmRleFxuXG4gICAgICAgICAgdGl0bGU6IGlucHV0LnRpcEluZm8udGl0bGVcblxuICAgICAgICAgIGNvbnRlbnQ6IGlucHV0LnRpcEluZm8uY29udGVudFxuXG4gICAgICAgICR0aXBFbCA9IEB0aXBUZW1wbGF0ZSh0aXApXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgICBlbHNlIGlmIGlucHV0Lmhhc0NvdXJzZUluZm9cblxuICAgICAgICBpbmZvRGF0YSA9IF8uZXh0ZW5kKEBjb3Vyc2VJbmZvRGF0YVtpbnB1dC5pZF0sIHtpZDogaW5kZXh9IClcblxuICAgICAgICAkdGlwRWwgPSBAY291cnNlSW5mb1RlbXBsYXRlKGluZm9EYXRhKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgIClcblxuICAgIHJldHVybiBAXG5cblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkaW5wdXRDb250YWluZXJzID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJyB8fCBAbW9kZWwuYXR0cmlidXRlcy50eXBlIGlzICdncmFkaW5nJ1xuXG4gICAgICBAZ3JhZGluZ1ZpZXcgPSBuZXcgR3JhZGluZ0lucHV0VmlldygpXG5cbiAgICAgIEBncmFkaW5nVmlldy5wYXJlbnRTdGVwVmlldyA9IEBcblxuICAgICAgQCRlbC5maW5kKCcuc3RlcC1mb3JtLWNvbnRlbnQnKS5hcHBlbmQoQGdyYWRpbmdWaWV3LmdldElucHV0VmFsdWVzKCkucmVuZGVyKCkuZWwpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnb3ZlcnZpZXcnXG5cbiAgICAgICRpbm5lckVsID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgICAgJGlubmVyRWwuaHRtbCgnJylcblxuICAgICAgQG92ZXJ2aWV3VmlldyA9IG5ldyBPdmVydmlld1ZpZXcoXG4gICAgICAgIGVsOiAkaW5uZXJFbFxuICAgICAgKVxuXG4gICAgICBAb3ZlcnZpZXdWaWV3LnBhcmVudFN0ZXBWaWV3ID0gQFxuXG4gICAgICBAb3ZlcnZpZXdWaWV3LnJlbmRlcigpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgaGlkZTogLT5cblxuICAgIEAkZWwuaGlkZSgpXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgc2hvdzogLT5cblxuICAgICQoJ2JvZHksIGh0bWwnKS5hbmltYXRlKFxuICAgICAgc2Nyb2xsVG9wOiAwXG4gICAgLDEpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnb3ZlcnZpZXcnIHx8IEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgaXMgJ292ZXJ2aWV3J1xuXG4gICAgICBAcmVuZGVyKCkuJGVsLnNob3coKVxuXG4gICAgICBhcHBsaWNhdGlvbi5ob21lVmlldy50aW1lbGluZVZpZXcudXBkYXRlKClcblxuICAgIGVsc2UgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnIHx8IEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIEByZW5kZXIoKS4kZWwuc2hvdygpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuc2hvdygpXG5cbiAgICBAaGFzVXNlclZpc2l0ZWQgPSB0cnVlXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgYmVnaW5IYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuICB1cGRhdGVVc2VySGFzQW5zd2VyZWQ6IChpZCwgdmFsdWUsIHR5cGUpIC0+XG5cblxuICAgIGlucHV0SXRlbXMgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1cblxuICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgaWYgdHlwZSBpcyAncGVyY2VudCdcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgcmV0dXJuIEBcblxuICAgIF8uZWFjaChpbnB1dEl0ZW1zLCAoaXRlbSkgPT5cblxuICAgICAgaWYgaXRlbS50eXBlIGlzICdjaGVja2JveCdcblxuICAgICAgICBpZiBpdGVtLmlnbm9yZVZhbGlkYXRpb25cblxuICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBpZiBpdGVtLnJlcXVpcmVkIGlzIHRydWVcblxuICAgICAgICAgIGlmIGl0ZW0uc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICApXG5cbiAgICBpZiByZXF1aXJlZFNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgIGVsc2UgaWYgdHlwZSBpcyAncmFkaW9Hcm91cCcgb3IgdHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ3RleHQnXG5cbiAgICAgIGlmIEBpc0ZpcnN0U3RlcFxuXG4gICAgICAgIF8uZWFjaChpbnB1dEl0ZW1zLCAoaXRlbSkgPT5cblxuICAgICAgICAgIGlmIGl0ZW0udHlwZSBpcyAndGV4dCdcblxuICAgICAgICAgICAgaWYgaXRlbS5yZXF1aXJlZCBpcyB0cnVlXG5cbiAgICAgICAgICAgICAgaWYgaXRlbS52YWx1ZSAhPSAnJ1xuXG4gICAgICAgICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgICAgICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IGZhbHNlXG5cbiAgICAgICAgKVxuXG4gICAgICAgIGlmIHJlcXVpcmVkU2VsZWN0ZWRcblxuICAgICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICAgICAgZWxzZSBcblxuICAgICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSBmYWxzZVxuXG4gICAgICAgIEBpc0ludHJvVmFsaWQoKVxuXG4gICAgZWxzZSBcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IGZhbHNlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmFuc3dlcmVkJywgQClcblxuICAgIHJldHVybiBAXG5cblxuICBpc0ludHJvVmFsaWQ6IC0+XG5cbiAgICB1bmxlc3MgQGlzRmlyc3RTdGVwIG9yIEBpc0xhc3RTdGVwXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgaWYgQGlzRmlyc3RTdGVwXG5cbiAgICAgIGlmIEBoYXNVc2VyQW5zd2VyZWQgYW5kIEB2YWxpZGF0ZURhdGVzKClcblxuICAgICAgICBAJGJlZ2luQnV0dG9uLnJlbW92ZUNsYXNzKCdpbmFjdGl2ZScpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAJGJlZ2luQnV0dG9uLmFkZENsYXNzKCdpbmFjdGl2ZScpXG5cblxuICB1cGRhdGVSYWRpb0Fuc3dlcjogKGlkLCBpbmRleCwgdmFsdWUpIC0+XG5cbiAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnR5cGUgXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLnNlbGVjdGVkID0gdmFsdWVcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLnZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm92ZXJ2aWV3TGFiZWwgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLm92ZXJ2aWV3TGFiZWxcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSBpbmRleFxuXG5cblxuICB1cGRhdGVBbnN3ZXI6IChpZCwgdmFsdWUsIGhhc1BhdGh3YXksIHBhdGh3YXkpIC0+XG5cbiAgICBpZiBoYXNQYXRod2F5XG5cbiAgICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtwYXRod2F5XVtpZF0udHlwZSBcblxuICAgICAgaXNFeGNsdXNpdmUgPSBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnR5cGUgXG5cbiAgICAgIGlzRXhjbHVzaXZlID0gZmFsc2UgfHwgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5leGNsdXNpdmUgXG5cblxuICAgIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgPSBmYWxzZVxuXG4gICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXSwgKGlucHV0SXRlbSkgPT5cblxuICAgICAgaWYgaW5wdXRJdGVtLmV4Y2x1c2l2ZVxuXG4gICAgICAgIGhhc0V4Y2x1c2l2ZVNpYmxpbmcgPSB0cnVlXG5cbiAgICApXG5cbiAgICBvdXQgPSBcblxuICAgICAgdHlwZTogaW5wdXRUeXBlXG5cbiAgICAgIGlkOiBpZFxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuICAgIGlmIGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnIHx8IGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIGlmIHZhbHVlID09ICdvbidcblxuICAgICAgICBpZiBoYXNQYXRod2F5XG5cbiAgICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgaWYgaGFzRXhjbHVzaXZlU2libGluZyAmJiAhaXNFeGNsdXNpdmVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykuYWRkQ2xhc3MoJ25vdC1lZGl0YWJsZScpLnJlbW92ZUNsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgZWxzZSBpZiBpc0V4Y2x1c2l2ZVxuXG4gICAgICAgICAgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpLm5vdCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3hbZGF0YS1leGNsdXNpdmU9XCJ0cnVlXCJdJykuYWRkQ2xhc3MoJ25vdC1lZGl0YWJsZScpLnJlbW92ZUNsYXNzKCdlZGl0YWJsZScpXG5cbiAgICAgICAgaWYgQG1vZGVsLmlkIGlzICdhc3NpZ25tZW50X3NlbGVjdGlvbidcbiAgICAgICAgICBcbiAgICAgICAgICBhcHBsaWNhdGlvbi5ob21lVmlldy51cGRhdGVTZWxlY3RlZFBhdGh3YXkoJ2FkZCcsIGlkKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgaWYgaGFzUGF0aHdheVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW3BhdGh3YXldW2lkXS5zZWxlY3RlZCA9IGZhbHNlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IGZhbHNlXG5cbiAgICAgICAgaWYgaGFzRXhjbHVzaXZlU2libGluZyAmJiAhaXNFeGNsdXNpdmVcblxuICAgICAgICAgIGFsbE90aGVyc0Rpc2VuZ2FnZWQgPSB0cnVlXG5cbiAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94JykuZWFjaCgtPlxuXG4gICAgICAgICAgICBpZiAhJCh0aGlzKS5hdHRyKCdkYXRhLWV4Y2x1c2l2ZScpICYmICQodGhpcykuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAgICAgICAgIGFsbE90aGVyc0Rpc2VuZ2FnZWQgPSBmYWxzZVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgaWYgYWxsT3RoZXJzRGlzZW5nYWdlZFxuXG4gICAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLnJlbW92ZUNsYXNzKCdub3QtZWRpdGFibGUnKS5hZGRDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgICAgZWxzZVxuXG4gICAgICAgICAgICBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLmFkZENsYXNzKCdub3QtZWRpdGFibGUnKS5yZW1vdmVDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGVsc2UgaWYgaXNFeGNsdXNpdmVcblxuICAgICAgICAgIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKS5ub3QoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94W2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpLnJlbW92ZUNsYXNzKCdub3QtZWRpdGFibGUnKS5hZGRDbGFzcygnZWRpdGFibGUnKVxuXG4gICAgICAgIGlmIEBtb2RlbC5pZCBpcyAnYXNzaWdubWVudF9zZWxlY3Rpb24nXG4gICAgICAgICAgXG4gICAgICAgICAgYXBwbGljYXRpb24uaG9tZVZpZXcudXBkYXRlU2VsZWN0ZWRQYXRod2F5KCdyZW1vdmUnLCBpZClcblxuICAgIGVsc2UgaWYgaW5wdXRUeXBlID09ICd0ZXh0JyB8fCBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIGlmIGhhc1BhdGh3YXlcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1bcGF0aHdheV1baWRdLnZhbHVlID0gdmFsdWVcblxuICAgICAgZWxzZVxuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSB2YWx1ZVxuXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgaGlkZVRpcHM6IChlKSAtPlxuXG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cblxuXG5cbiAgICBcbiAgICBcblxuIFxuXG4iLCJcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuRGV0YWlsc1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VEZXRhaWxzVGVtcGxhdGUuaGJzJylcblxuR3JhZGluZ1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nVGVtcGxhdGUuaGJzJylcblxuR3JhZGluZ0N1c3RvbVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nQWx0VGVtcGxhdGUuaGJzJylcblxuT3B0aW9uc1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9Db3Vyc2VPcHRpb25zVGVtcGxhdGUuaGJzJylcblxuV2l6YXJkRGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBUaW1lbGluZVZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3IFxuXG4gIGVsOiAkKCcuZm9ybS1jb250YWluZXInKVxuXG4gIHdpa2lTcGFjZTogJ3t7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fTxici8+J1xuXG4gICN3aWtpU3BhY2U6ICc8L2JyLz48YnIvPidcblxuICB3aWtpTm9DbGFzczogJ05PIENMQVNTIFdFRUsgT0YgJ1xuXG4gIGxvbmdlc3RDb3Vyc2VMZW5ndGg6IDE2XG5cbiAgc2hvcnRlc3RDb3Vyc2VMZW5ndGg6IDZcblxuICBkZWZhdWx0Q291cnNlTGVuZ3RoOiAxNlxuXG4gIGRlZmF1bHRFbmREYXRlczogWycwNi0zMCcsICcxMi0zMSddXG5cbiAgY3VycmVudEJsYWNrb3V0RGF0ZXM6IFtdXG5cbiAgbGVuZ3RoOiAwXG5cbiAgYWN0dWFsTGVuZ3RoOiAwXG5cbiAgd2Vla2x5RGF0ZXM6IFtdXG5cbiAgd2Vla2x5U3RhcnREYXRlczogW11cblxuICB0b3RhbEJsYWNrb3V0V2Vla3M6IDBcblxuICBkYXlzU2VsZWN0ZWQ6IFtmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZSxmYWxzZV1cblxuICBzdGFydF9kYXRlOlxuICAgIHZhbHVlOiAnJ1xuXG4gIGVuZF9kYXRlOlxuICAgIHZhbHVlOiAnJ1xuXG4gIHRlcm1fc3RhcnRfZGF0ZTpcbiAgICB2YWx1ZTogJydcblxuICB0ZXJtX2VuZF9kYXRlOlxuICAgIHZhbHVlOiAnJ1xuXG4gIGluaXRpYWxpemU6IC0+XG4gIFxuICAgICQoJ2lucHV0W3R5cGU9XCJkYXRlXCJdJykuZGF0ZXBpY2tlcihcblxuICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICBjb25zdHJhaW5JbnB1dDogdHJ1ZVxuXG4gICAgICBmaXJzdERheTogMVxuXG4gICAgKS5wcm9wKCd0eXBlJywndGV4dCcpXG5cbiAgICBAJGJsYWNrb3V0RGF0ZXMgPSAkKCcjYmxhY2tvdXREYXRlcycpXG5cbiAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcihcblxuICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICBmaXJzdERheTogMVxuXG4gICAgICBhbHRGaWVsZDogJyNibGFja291dERhdGVzRmllbGQnXG5cbiAgICAgIG9uU2VsZWN0OiA9PlxuXG4gICAgICAgIEBjdXJyZW50QmxhY2tvdXREYXRlcyA9IEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdnZXREYXRlcycpXG5cbiAgICAgICAgQHVwZGF0ZVRpbWVsaW5lKClcbiAgICApXG5cbiAgICBAJHN0YXJ0V2Vla09mRGF0ZSA9ICQoJyNzdGFydFdlZWtPZkRhdGUnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUgPSAkKCcjY291cnNlU3RhcnREYXRlJylcblxuICAgIEAkY291cnNlRW5kRGF0ZSA9ICQoJyNjb3Vyc2VFbmREYXRlJylcblxuICAgIEAkdGVybVN0YXJ0RGF0ZSA9ICQoJyN0ZXJtU3RhcnREYXRlJylcblxuICAgIEAkdGVybUVuZERhdGUgPSAgICQoJyN0ZXJtRW5kRGF0ZScpXG5cbiAgICBAJG91dENvbnRhaW5lciA9ICQoJy5vdXRwdXQtY29udGFpbmVyJylcblxuICAgIEAkcHJldmlld0NvbnRhaW5lciA9ICQoJy5wcmV2aWV3LWNvbnRhaW5lcicpXG5cbiAgICBAZGF0YSA9IFtdXG5cbiAgICBAZGF0YSA9IGFwcGxpY2F0aW9uLnRpbWVsaW5lRGF0YVxuXG4gICAgQGRhdGFBbHQgPSBhcHBsaWNhdGlvbi50aW1lbGluZURhdGFBbHRcblxuICAgICQoJyN0ZXJtU3RhcnREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZVRlcm1TdGFydChlKVxuXG4gICAgJCgnI3Rlcm1FbmREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZVRlcm1FbmQoZSlcblxuICAgICQoJyNjb3Vyc2VTdGFydERhdGUnKS5vbiAnY2hhbmdlJywgKGUpID0+XG4gICAgICBAY2hhbmdlQ291cnNlU3RhcnQoZSlcblxuICAgICQoJyNjb3Vyc2VFbmREYXRlJykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQGNoYW5nZUNvdXJzZUVuZChlKVxuXG4gICAgJCgnLmRvd0NoZWNrYm94Jykub24gJ2NoYW5nZScsIChlKSA9PlxuICAgICAgQG9uRG93U2VsZWN0KGUpXG5cbiAgICAkKCcjdGVybVN0YXJ0RGF0ZScpLm9uICdmb2N1cycsIChlKSA9PlxuICAgICAgJCgnYm9keSxodG1sJykuYW5pbWF0ZShcbiAgICAgICAgc2Nyb2xsVG9wOiAkKCcjdGVybVN0YXJ0RGF0ZScpLm9mZnNldCgpLnRvcCAtIDM1MFxuICAgICAgLCA0MDApXG5cbiAgICBAdXBkYXRlKClcblxuICBvbkRvd1NlbGVjdDogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBkb3cgPSAkdGFyZ2V0LmF0dHIoJ2lkJylcblxuICAgIGRvd0lkID0gcGFyc2VJbnQoJHRhcmdldC52YWwoKSlcblxuICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgQGRheXNTZWxlY3RlZFtkb3dJZF0gPSB0cnVlXG5cbiAgICBlbHNlXG5cbiAgICAgIEBkYXlzU2VsZWN0ZWRbZG93SWRdID0gZmFsc2VcblxuICAgIFdpemFyZERhdGEuY291cnNlX2RldGFpbHMud2Vla2RheXNfc2VsZWN0ZWQgPSBAZGF5c1NlbGVjdGVkXG5cbiAgICBpZiBAc3RhcnRfZGF0ZS52YWx1ZSAhPSAnJyAmJiBAZW5kX2RhdGUudmFsdWUgIT0gJydcbiAgICAgIGlmIF8uaW5kZXhPZihAZGF5c1NlbGVjdGVkLCB0cnVlKSAhPSAtMVxuICAgICAgICAkKCcuYmxhY2tvdXREYXRlcy13cmFwcGVyJykuYWRkQ2xhc3MoJ29wZW4nKVxuICAgICAgZWxzZVxuICAgICAgICAkKCcuYmxhY2tvdXREYXRlcy13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuICAgIGVsc2VcblxuICAgICAgJCgnLmJsYWNrb3V0RGF0ZXMtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuICAgIEB1cGRhdGVUaW1lbGluZSgpXG5cblxuICBjaGFuZ2VUZXJtU3RhcnQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG5cbiAgICAgIEB0ZXJtX2VuZF9kYXRlID1cblxuICAgICAgICB2YWx1ZTogJydcblxuICAgICAgcmV0dXJuIFxuXG4gICAgZGF0ZU1vbWVudCA9IG1vbWVudCh2YWx1ZSlcblxuICAgIGRhdGUgPSBkYXRlTW9tZW50LnRvRGF0ZSgpXG5cbiAgICBAdGVybV9zdGFydF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIHllYXJNb2QgPSAwXG5cbiAgICBpZiBAdGVybV9zdGFydF9kYXRlLndlZWsgaXMgMVxuXG4gICAgICB5ZWFyTW9kID0gMVxuXG4gICAgaXNBZnRlciA9IGRhdGVNb21lbnQuaXNBZnRlcihcIiN7ZGF0ZU1vbWVudC55ZWFyKCkreWVhck1vZH0tMDYtMDFcIilcblxuICAgIGlmIGlzQWZ0ZXJcblxuICAgICAgZW5kRGF0ZVN0cmluZyA9IFwiI3tkYXRlTW9tZW50LnllYXIoKX0tI3tAZGVmYXVsdEVuZERhdGVzWzFdfVwiXG5cbiAgICBlbHNlXG5cbiAgICAgIGVuZERhdGVTdHJpbmcgPSBcIiN7ZGF0ZU1vbWVudC55ZWFyKCkreWVhck1vZH0tI3tAZGVmYXVsdEVuZERhdGVzWzBdfVwiXG5cbiAgICBpZiBpc0FmdGVyXG5cbiAgICAgIGlzRnVsbFdpZHRoQ291cnNlID0gNTMgLSBAdGVybV9zdGFydF9kYXRlLndlZWsgPiBAZGVmYXVsdENvdXJzZUxlbmd0aFxuXG4gICAgZWxzZVxuXG4gICAgICBpc0Z1bGxXaWR0aENvdXJzZSA9IG1vbWVudChlbmREYXRlU3RyaW5nKS53ZWVrKCkgLSBAdGVybV9zdGFydF9kYXRlLndlZWsgPiBAZGVmYXVsdENvdXJzZUxlbmd0aFxuXG5cbiAgICBAJHRlcm1FbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQCRjb3Vyc2VTdGFydERhdGUudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgaWYgaXNGdWxsV2lkdGhDb3Vyc2UgXG5cbiAgICAgIGRlZmF1bHRFbmREYXRlID0gbW9tZW50KHZhbHVlKS50b0RhdGUoKVxuXG4gICAgICBkZWZhdWx0RW5kRGF0ZS5zZXREYXRlKDcqQGRlZmF1bHRDb3Vyc2VMZW5ndGgpXG5cbiAgICAgIEAkY291cnNlRW5kRGF0ZS52YWwobW9tZW50KGRlZmF1bHRFbmREYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRjb3Vyc2VFbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ3Jlc2V0RGF0ZXMnLCAncGlja2VkJylcblxuICAgIHJldHVyblxuXG4gIGNoYW5nZVRlcm1FbmQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG5cbiAgICAgIEB0ZXJtX3N0YXJ0X2RhdGUgPVxuXG4gICAgICAgIHZhbHVlOiAnJ1xuXG4gICAgICByZXR1cm4gXG5cbiAgICBkYXRlTW9tZW50ID0gbW9tZW50KHZhbHVlKVxuXG4gICAgZGF0ZSA9IGRhdGVNb21lbnQudG9EYXRlKClcblxuICAgIEB0ZXJtX2VuZF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIEAkY291cnNlRW5kRGF0ZS52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcigncmVzZXREYXRlcycsICdwaWNrZWQnKVxuXG4gICAgcmV0dXJuXG5cbiAgY2hhbmdlQ291cnNlU3RhcnQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG5cbiAgICAgIEBzdGFydF9kYXRlID1cblxuICAgICAgICB2YWx1ZTogJydcblxuICAgICAgQCRjb3Vyc2VFbmREYXRlLnZhbCgnJykudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQHVwZGF0ZU11bHRpRGF0ZVBpY2tlcigpXG5cbiAgICAgIHJldHVybiBAdXBkYXRlVGltZWxpbmUgXG5cbiAgICBkYXRlTW9tZW50ID0gbW9tZW50KHZhbHVlKVxuXG4gICAgZGF0ZSA9IGRhdGVNb21lbnQudG9EYXRlKClcblxuICAgIEBzdGFydF9kYXRlID0gXG5cbiAgICAgIG1vbWVudDogZGF0ZU1vbWVudFxuXG4gICAgICBkYXRlOiBkYXRlXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG4gICAgICB3ZWVrOiBkYXRlTW9tZW50LndlZWsoKVxuXG4gICAgICB3ZWVrZGF5OiBcblxuICAgICAgICBtb21lbnQ6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKVxuXG4gICAgICAgIGRhdGU6IGRhdGVNb21lbnQud2VlayhkYXRlTW9tZW50LndlZWsoKSkud2Vla2RheSgwKS50b0RhdGUoKVxuXG4gICAgICAgIHZhbHVlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgIHllYXJNb2QgPSAwXG5cbiAgICBpZiBAc3RhcnRfZGF0ZS53ZWVrIGlzIDFcblxuICAgICAgeWVhck1vZCA9IDFcblxuICAgIGlzQWZ0ZXIgPSBkYXRlTW9tZW50LmlzQWZ0ZXIoXCIje2RhdGVNb21lbnQueWVhcigpK3llYXJNb2R9LTA2LTAxXCIpXG5cbiAgICBpZiBpc0FmdGVyXG5cbiAgICAgIGVuZERhdGVTdHJpbmcgPSBcIiN7ZGF0ZU1vbWVudC55ZWFyKCl9LSN7QGRlZmF1bHRFbmREYXRlc1sxXX1cIlxuXG4gICAgZWxzZVxuXG4gICAgICBlbmREYXRlU3RyaW5nID0gXCIje2RhdGVNb21lbnQueWVhcigpK3llYXJNb2R9LSN7QGRlZmF1bHRFbmREYXRlc1swXX1cIlxuXG4gICAgQCRjb3Vyc2VFbmREYXRlLnZhbChlbmREYXRlU3RyaW5nKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgaWYgQHRlcm1fc3RhcnRfZGF0ZS52YWx1ZSBpcyAnJ1xuXG4gICAgICBAJHRlcm1TdGFydERhdGUudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQHVwZGF0ZU11bHRpRGF0ZVBpY2tlcigpXG5cbiAgICBAdXBkYXRlVGltZWxpbmUoKVxuXG4gICAgcmV0dXJuIGZhbHNlXG5cblxuICBjaGFuZ2VDb3Vyc2VFbmQ6IChlKSAtPlxuXG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKCkgfHwgJydcblxuICAgIGlmIHZhbHVlIGlzICcnXG4gICAgICBAZW5kX2RhdGUgPVxuICAgICAgICB2YWx1ZTogJydcblxuICAgICAgQHVwZGF0ZU11bHRpRGF0ZVBpY2tlcigpXG5cbiAgICAgIEB1cGRhdGVUaW1lbGluZSgpXG5cbiAgICAgIHJldHVybiBAdXBkYXRlVGltZWxpbmUgXG5cbiAgICBkYXRlTW9tZW50ID0gbW9tZW50KHZhbHVlKVxuXG4gICAgZGF0ZSA9IGRhdGVNb21lbnQudG9EYXRlKClcblxuICAgIEBlbmRfZGF0ZSA9IFxuXG4gICAgICBtb21lbnQ6IGRhdGVNb21lbnRcblxuICAgICAgZGF0ZTogZGF0ZVxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuICAgICAgd2VlazogZGF0ZU1vbWVudC53ZWVrKClcblxuICAgICAgd2Vla2RheTogXG5cbiAgICAgICAgbW9tZW50OiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMClcblxuICAgICAgICBkYXRlOiBkYXRlTW9tZW50LndlZWsoZGF0ZU1vbWVudC53ZWVrKCkpLndlZWtkYXkoMCkudG9EYXRlKClcblxuICAgICAgICB2YWx1ZTogZGF0ZU1vbWVudC53ZWVrKGRhdGVNb21lbnQud2VlaygpKS53ZWVrZGF5KDApLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICBAdXBkYXRlTXVsdGlEYXRlUGlja2VyKClcblxuICAgIEB1cGRhdGVUaW1lbGluZSgpXG5cbiAgICByZXR1cm4gZmFsc2VcblxuICB1cGRhdGVNdWx0aURhdGVQaWNrZXI6IC0+XG5cblxuICAgIGlmIEBzdGFydF9kYXRlLnZhbHVlICE9ICcnICYmIEBlbmRfZGF0ZS52YWx1ZSAhPSAnJ1xuXG4gICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcignZGVzdHJveScpXG5cbiAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKFxuXG4gICAgICAgIGRhdGVGb3JtYXQ6ICd5eS1tbS1kZCdcblxuICAgICAgICBmaXJzdERheTogMVxuXG4gICAgICAgIGFsdEZpZWxkOiAnI2JsYWNrb3V0RGF0ZXNGaWVsZCdcblxuICAgICAgICBkZWZhdWx0RGF0ZTogQHN0YXJ0X2RhdGUud2Vla2RheS52YWx1ZVxuXG4gICAgICAgIG1pbkRhdGU6IEBzdGFydF9kYXRlLndlZWtkYXkudmFsdWVcblxuICAgICAgICBtYXhEYXRlOiBAZW5kX2RhdGUudmFsdWVcblxuICAgICAgICBvblNlbGVjdDogPT5cblxuICAgICAgICAgIEBjdXJyZW50QmxhY2tvdXREYXRlcyA9IEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdnZXREYXRlcycpXG5cbiAgICAgICAgICBAdXBkYXRlVGltZWxpbmUoKVxuICAgICAgKVxuXG4gICAgICBAJGJsYWNrb3V0RGF0ZXMubXVsdGlEYXRlc1BpY2tlcigncmVzZXREYXRlcycsICdwaWNrZWQnKVxuXG4gICAgICBpZiBAY3VycmVudEJsYWNrb3V0RGF0ZXMubGVuZ3RoID4gMFxuXG4gICAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdhZGREYXRlcycsIEBjdXJyZW50QmxhY2tvdXREYXRlcylcblxuICAgIGVsc2UgXG5cbiAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdkZXN0cm95JylcblxuICAgICAgQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoXG5cbiAgICAgICAgZGF0ZUZvcm1hdDogJ3l5LW1tLWRkJ1xuXG4gICAgICAgIGZpcnN0RGF5OiAxXG5cbiAgICAgICAgYWx0RmllbGQ6ICcjYmxhY2tvdXREYXRlc0ZpZWxkJ1xuXG4gICAgICAgIG9uU2VsZWN0OiA9PlxuXG4gICAgICAgICAgQGN1cnJlbnRCbGFja291dERhdGVzID0gQCRibGFja291dERhdGVzLm11bHRpRGF0ZXNQaWNrZXIoJ2dldERhdGVzJylcblxuICAgICAgICAgIEB1cGRhdGVUaW1lbGluZSgpXG4gICAgICApXG5cbiAgICAgIEAkYmxhY2tvdXREYXRlcy5tdWx0aURhdGVzUGlja2VyKCdyZXNldERhdGVzJywgJ3BpY2tlZCcpXG5cblxuXG5cbiAgdXBkYXRlVGltZWxpbmU6IC0+XG5cbiAgICBAd2Vla2x5U3RhcnREYXRlcyA9IFtdXG5cbiAgICBAd2Vla2x5RGF0ZXMgPSBbXSBcblxuICAgIEBvdXQgPSBbXVxuXG4gICAgQG91dFdpa2kgPSBbXVxuXG4gICAgaWYgQHN0YXJ0X2RhdGUudmFsdWUgIT0gJycgJiYgQGVuZF9kYXRlLnZhbHVlICE9ICcnXG5cbiAgICAgICNkaWZmZXJlbmNlIGluIHdlZWtzIGJldHdlZW4gc2VsZWN0ZWQgc3RhcnQgYW5kIGVuZCBkYXRlc1xuICAgICAgZGlmZiA9IEBnZXRXZWVrc0RpZmYoQHN0YXJ0X2RhdGUud2Vla2RheS5tb21lbnQsIEBlbmRfZGF0ZS53ZWVrZGF5Lm1vbWVudClcblxuICAgICAgI2FjdHVhbCBsZW5mZ3RoIGlzIHRoZSBhY3R1YWwgbnVtYmVyIG9mIHdlZWtzIGJldHdlZW4gdGhlIHN0YXJ0IGFuZCBlbmQgZGF0ZSBcbiAgICAgICNpZiBsZXNzIHRoYW4gNiBtYWtlIGl0IDYgd2Vla3MsIGlmIG1vcmUgdGhhbiAxNiwgbWFrZSBpdCAxNiB3ZWVrc1xuICAgICAgQGFjdHVhbExlbmd0aCA9IDEgKyBkaWZmIFxuXG4gICAgICBpZiBAYWN0dWFsTGVuZ3RoIDwgQHNob3J0ZXN0Q291cnNlTGVuZ3RoXG5cbiAgICAgICAgQGxlbmd0aCA9IEBzaG9ydGVzdENvdXJzZUxlbmd0aFxuXG4gICAgICBlbHNlIGlmIEBhY3R1YWxMZW5ndGggPiBAbG9uZ2VzdENvdXJzZUxlbmd0aFxuXG4gICAgICAgIEBsZW5ndGggPSBAbG9uZ2VzdENvdXJzZUxlbmd0aFxuXG4gICAgICBlbHNlIFxuXG4gICAgICAgIEBsZW5ndGggPSBAYWN0dWFsTGVuZ3RoXG5cbiAgICAgICNtYWtlIGFuIGFycmF5IG9mIGFsbCB0aGUgbW9uZGF5IHdlZWsgc3RhcnQgZGF0ZXMgYXMgc3RyaW5nc1xuICAgICAgQHdlZWtseVN0YXJ0RGF0ZXMgPSBbXVxuXG4gICAgICB3ID0gMFxuXG4gICAgICB3aGlsZSB3IDwgQGxlbmd0aFxuXG4gICAgICAgIGlmIHcgaXMgMFxuXG4gICAgICAgICAgbmV3RGF0ZSA9IG1vbWVudChAc3RhcnRfZGF0ZS53ZWVrZGF5Lm1vbWVudCkuZm9ybWF0KCdZWVlZLU1NLUREJylcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBuZXdEYXRlID0gbW9tZW50KEBzdGFydF9kYXRlLndlZWtkYXkubW9tZW50KS53ZWVrKEBzdGFydF9kYXRlLndlZWsrdykuZm9ybWF0KCdZWVlZLU1NLUREJylcbiAgICAgICAgXG4gICAgICAgIEB3ZWVrbHlTdGFydERhdGVzLnB1c2gobmV3RGF0ZSlcblxuICAgICAgICB3KytcblxuICAgICAgQHdlZWtseURhdGVzID0gW11cblxuICAgICAgQHRvdGFsQmxhY2tvdXRXZWVrcyA9IDBcblxuXG4gICAgICAjbWFrZSBhbiBvYmplY3QgdGhhdCBsaXN0cyBvdXQgZWFjaCB3ZWVrIHdpdGggZGF0ZXMgYW5kIHdoZXRoZXIgb3Igbm90IHRoZSB3ZWVrIG1lZXRzIGFuZCB3aGV0aGVyIG9yIG5vdCBlYWNoIGRheSBtZWV0c1xuICAgICAgXy5lYWNoKEB3ZWVrbHlTdGFydERhdGVzLCAod2Vla2RhdGUsIHdpKSA9PlxuXG4gICAgICAgIGRNb21lbnQgPSBtb21lbnQod2Vla2RhdGUpXG5cbiAgICAgICAgdG90YWxTZWxlY3RlZCA9IDBcblxuICAgICAgICB0b3RhbEJsYWNrZWRPdXQgPSAwXG5cbiAgICAgICAgdGhpc1dlZWsgPVxuXG4gICAgICAgICAgd2Vla1N0YXJ0OiBkTW9tZW50LmZvcm1hdCgnWVlZWS1NTS1ERCcpXG5cbiAgICAgICAgICBjbGFzc1RoaXNXZWVrOiB0cnVlXG5cbiAgICAgICAgICBkYXRlczogW11cblxuICAgICAgICAgIHdlZWtJbmRleDogd2kgLSBAdG90YWxCbGFja291dFdlZWtzXG5cblxuICAgICAgICBfLmVhY2goQGRheXNTZWxlY3RlZCwgKGRheSwgZGkpID0+XG5cbiAgICAgICAgICBpZiBkYXkgXG5cbiAgICAgICAgICAgIGlzQ2xhc3MgPSB0cnVlXG5cbiAgICAgICAgICAgIGRhdGVTdHJpbmcgPSBkTW9tZW50LndlZWtkYXkoZGkpLmZvcm1hdCgnWVlZWS1NTS1ERCcpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRvdGFsU2VsZWN0ZWQrK1xuXG5cbiAgICAgICAgICAgIGlmIF8uaW5kZXhPZihAY3VycmVudEJsYWNrb3V0RGF0ZXMsIGRhdGVTdHJpbmcpICE9IC0xXG5cbiAgICAgICAgICAgICAgdG90YWxCbGFja2VkT3V0KytcblxuICAgICAgICAgICAgICBpc0NsYXNzID0gZmFsc2VcblxuICAgICAgICAgICAgdGhpc1dlZWsuZGF0ZXMucHVzaCh7aXNDbGFzczogaXNDbGFzcywgZGF0ZTogZGF0ZVN0cmluZ30pXG5cbiAgICAgICAgICBlbHNlXG5cbiAgICAgICAgICAgIHRoaXNXZWVrLmRhdGVzLnB1c2goe30pXG4gICAgICAgIClcblxuICAgICAgICBpZiB0b3RhbEJsYWNrZWRPdXQgIT0gMCBhbmQgdG90YWxTZWxlY3RlZCBpcyB0b3RhbEJsYWNrZWRPdXRcblxuICAgICAgICAgIHRoaXNXZWVrLmNsYXNzVGhpc1dlZWsgPSBmYWxzZVxuXG4gICAgICAgICAgdGhpc1dlZWsud2Vla0luZGV4ID0gJydcblxuICAgICAgICAgIEB0b3RhbEJsYWNrb3V0V2Vla3MrK1xuXG4gICAgICAgIEB3ZWVrbHlEYXRlcy5wdXNoKHRoaXNXZWVrKVxuXG4gICAgICApXG5cbiAgICAgIGlmIEB0b3RhbEJsYWNrb3V0V2Vla3MgPiAwXG5cbiAgICAgICAgbmV3TGVuZ3RoID0gQGxlbmd0aCAtIEB0b3RhbEJsYWNrb3V0V2Vla3NcblxuICAgICAgICBpZiBuZXdMZW5ndGggPCA2XG5cbiAgICAgICAgICBhbGVydCgnWW91IGhhdmUgYmxhY2tvdXRlZCBvdXQgZGF5cyB0aGF0IHdpbGwgcmVzdWx0IGluIGEgY291cnNlIGxlbmd0aCB0aGF0IGlzIGxlc3MgdGhhbiA2IHdlZWtzLiBQbGVhc2UgaW5jcmVhc2UgdGhlIGNvdXJzZSBsZW5ndGguJylcbiAgICAgICAgICBcbiAgICAgICAgICByZXR1cm4gZmFsc2VcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBAbGVuZ3RoID0gbmV3TGVuZ3RoXG5cblxuICAgIEB1cGRhdGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgIyBkb24ndCB0b3VjaCB0aGlzIGZ1bmN0aW9uIHVubGVzcyB5b3Uga25vdyB3aGF0IHlvdSBhcmUgZG9pbmcgOy0pXG4gIGdldFdpa2lXZWVrT3V0cHV0OiAobGVuZ3RoKSAtPlxuXG4gICAgZGlmZiA9IDE2IC0gbGVuZ3RoXG5cbiAgICBvdXQgPSBbXVxuXG4gICAgdW5pdHNDbG9uZSA9IF8uY2xvbmUoQGRhdGEpXG5cbiAgICBpZiBkaWZmID4gMFxuXG4gICAgICB1bml0c0Nsb25lID0gXy5yZWplY3QodW5pdHNDbG9uZSwgKGl0ZW0pID0+XG5cbiAgICAgICAgcmV0dXJuIGl0ZW0udHlwZSBpcyAnYnJlYWsnICYmIGRpZmYgPj0gaXRlbS52YWx1ZSAmJiBpdGVtLnZhbHVlICE9IDBcblxuICAgICAgKVxuXG4gICAgb2JqID0gdW5pdHNDbG9uZVswXVxuICAgIFxuICAgIF8uZWFjaCh1bml0c0Nsb25lLCAoaXRlbSwgaW5kZXgpID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnYnJlYWsnIHx8IGluZGV4IGlzIHVuaXRzQ2xvbmUubGVuZ3RoIC0gMVxuXG4gICAgICAgIGlmIGluZGV4IGlzIHVuaXRzQ2xvbmUubGVuZ3RoIC0gMVxuXG4gICAgICAgICAgb3V0LnB1c2ggXy5jbG9uZShpdGVtKVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIG91dC5wdXNoIF8uY2xvbmUob2JqKVxuXG4gICAgICAgIG9iaiA9IGZhbHNlXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGVsc2UgaWYgaXRlbS50eXBlIGlzICd3ZWVrJ1xuICAgICAgICBcbiAgICAgICAgaWYgb2JqIGlzIGZhbHNlICNpZiB0aGlzIGlzIHRoZSBmaXJzdCB3ZWVrIGFmdGVyIGEgYnJlYWsgLSBhIGNsZWFuIGJyZWFrXG5cbiAgICAgICAgICBvYmogPSBpdGVtICMgbWFrZSB0aGUgY3VycmVudCB3b3JraW5nIG9iamVjdCB0aGlzIG5ldyB3ZWVrXG5cbiAgICAgICAgZWxzZSAjIGlmIHdlIGFyZSB3b3JraW5nIG9uIGFuIG9iamVjdCB0aGF0IGFscmVhZHkgaGFzIGRhdGEgdGhlbiAuLi5cblxuICAgICAgICAgICMgY2hlY2sgdG8gc2VlIHdoYXQgaXRzIGFjdGlvbiBpcyB3aGVuIGNvbmZyb250ZWQgd2l0aCBhIGNvbWJvIHNpdHVhdGlvblxuICAgICAgICAgIGlmIGl0ZW0uYWN0aW9uIGlzICdjb21iaW5lJyAjIGlmIGFjdGlvbiBpcyBjb21iaW5lIC0gbWVyZ2UgdGhpcyB3ZWVrIHdpdGggdGhlIHdvcmtpbmcgb2JqZWN0IChpLmUuIHByZXZpb3VzIHdlZWsocykpXG5cbiAgICAgICAgICAgIG9iaiA9IEBjb21iaW5lKG9iaiwgaXRlbSlcblxuICAgICAgICAgIGVsc2UgIyBpZiBpdHMgYW55dGhpbmcgZWxzZSBhdCB0aGlzIHBvaW50IC0ganVzdCByZXR1cm4gKGkuZS4gb21pdCBpdClcblxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIFxuXG4gICAgKVxuICAgIFxuICAgIHJldHVybiBvdXRcblxuICB1cGRhdGU6IC0+XG5cbiAgICBXaXphcmREYXRhLmNvdXJzZV9kZXRhaWxzLnN0YXJ0X2RhdGUgPSBAc3RhcnRfZGF0ZS52YWx1ZSB8fCAnJ1xuXG4gICAgV2l6YXJkRGF0YS5jb3Vyc2VfZGV0YWlscy5lbmRfZGF0ZSA9IEBlbmRfZGF0ZS52YWx1ZSB8fCAnJ1xuXG4gICAgaWYgQGxlbmd0aFxuXG4gICAgICAkKCdvdXRwdXRbbmFtZT1cIm91dDJcIl0nKS5odG1sKEBsZW5ndGggKyAnIHdlZWtzJylcblxuICAgIGVsc2VcblxuICAgICAgJCgnb3V0cHV0W25hbWU9XCJvdXQyXCJdJykuaHRtbCgnJylcblxuICAgIEBvdXQgPSBAZ2V0V2lraVdlZWtPdXRwdXQoQGxlbmd0aClcbiAgICBcbiAgICBAb3V0V2lraSA9IEBvdXRcblxuICAgIEByZW5kZXJSZXN1bHQoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnb3V0cHV0OnVwZGF0ZScsIEAkb3V0Q29udGFpbmVyLnRleHQoKSlcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2RhdGU6Y2hhbmdlJywgQClcblxuXG4gIHJlbmRlclJlc3VsdDogLT5cblxuICAgIEAkb3V0Q29udGFpbmVyLmh0bWwoJycpXG5cbiAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoRGV0YWlsc1RlbXBsYXRlKCBfLmV4dGVuZChXaXphcmREYXRhLHsgZGVzY3JpcHRpb246IFdpemFyZERhdGEuY291cnNlX2RldGFpbHMuZGVzY3JpcHRpb259KSkpXG5cbiAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzWzBdIGlzICdyZXNlYXJjaHdyaXRlJ1xuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZCgne3t0YWJsZSBvZiBjb250ZW50c319JylcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoJz09VGltZWxpbmU9PScpXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgY3VyV2Vla09mZnNldCA9IDBcblxuICAgICAgXy5lYWNoKEB3ZWVrbHlEYXRlcywgKHdlZWssIGluZGV4KSA9PlxuXG4gICAgICAgIHVubGVzcyB3ZWVrLmNsYXNzVGhpc1dlZWtcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7ZW5kIG9mIGNvdXJzZSB3ZWVrfX1cIilcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPT09I3tAd2lraU5vQ2xhc3N9ICN7d2Vlay53ZWVrU3RhcnR9PT09XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBpdGVtID0gQG91dFdpa2lbd2Vlay53ZWVrSW5kZXhdXG5cbiAgICAgICAgdGhpc1dlZWsgPSB3ZWVrLndlZWtJbmRleCArIDFcblxuICAgICAgICBuZXh0V2VlayA9IHdlZWsud2Vla0luZGV4ICsgMlxuXG4gICAgICAgIGlzTGFzdFdlZWsgPSB3ZWVrLndlZWtJbmRleCBpcyBAbGVuZ3RoIC0gMVxuXG5cbiAgICAgICAgaWYgaXRlbS50aXRsZS5sZW5ndGggPiAwXG5cbiAgICAgICAgICB0aXRsZXMgPSBcIlwiXG5cbiAgICAgICAgICBleHRyYSA9IGlmIHRoaXNXZWVrIGlzIDEgdGhlbiAnMScgZWxzZSAnJ1xuXG4gICAgICAgICAgdGl0bGVzICs9IFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL2NvdXJzZSB3ZWVrICN7ZXh0cmF9fCAje3RoaXNXZWVrfSB8IFwiXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS50aXRsZSwgKHQsIGkpIC0+XG5cbiAgICAgICAgICAgIGlmIGkgaXMgMFxuXG4gICAgICAgICAgICAgdGl0bGVzICs9IFwiI3t0fVwiXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICB0aXRsZXMgKz0gXCIsICN7dH1cIlxuXG4gICAgICAgICAgKVxuXG5cbiAgICAgICAgICBpZiB3ZWVrLndlZWtTdGFydCBhbmQgd2Vlay53ZWVrU3RhcnQgIT0gJydcblxuICAgICAgICAgICAgdGl0bGVzICs9IFwifCB3ZWVrb2YgPSAje3dlZWsud2Vla1N0YXJ0fSBcIlxuXG4gICAgICAgICAgZGF5Q291bnQgPSAwXG5cbiAgICAgICAgICBfLmVhY2god2Vlay5kYXRlcywgKGQsIGRpKSA9PlxuXG4gICAgICAgICAgICBpZiBkLmlzQ2xhc3NcblxuICAgICAgICAgICAgICBkYXlDb3VudCsrXG5cbiAgICAgICAgICAgICAgdGl0bGVzICs9IFwifCBkYXkje2RheUNvdW50fSA9ICN7ZC5kYXRlfSBcIlxuXG4gICAgICAgICAgKVxuXG5cbiAgICAgICAgICB0aXRsZXMgKz0gXCJ9fVwiXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQodGl0bGVzKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICBcbiAgICAgIFxuICAgICAgICBpZiBpdGVtLmluX2NsYXNzLmxlbmd0aCA+IDBcblxuICAgICAgICAgIF8uZWFjaChpdGVtLmluX2NsYXNzLCAoYywgY2kpID0+XG5cbiAgICAgICAgICAgIGlmIGMuY29uZGl0aW9uICYmIGMuY29uZGl0aW9uICE9ICcnXG5cbiAgICAgICAgICAgICAgY29uZGl0aW9uID0gZXZhbChjLmNvbmRpdGlvbilcblxuICAgICAgICAgICAgICBpZiBjb25kaXRpb24gXG5cbiAgICAgICAgICAgICAgICBpZiBjaSBpcyAwXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcInt7aW4gY2xhc3N9fVwiKVxuXG4gICAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje2Mud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICBpZiBjaSBpcyAwXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2luIGNsYXNzfX1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje2Mud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuICAgICAgICAgIClcblxuICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuXG4gICAgICAgIGlmIGl0ZW0uYXNzaWdubWVudHMubGVuZ3RoID4gMFxuXG4gICAgICAgICAgXy5lYWNoKGl0ZW0uYXNzaWdubWVudHMsIChhc3NpZ24sIGFpKSA9PlxuXG4gICAgICAgICAgICBpZiBhc3NpZ24uY29uZGl0aW9uICYmIGFzc2lnbi5jb25kaXRpb24gIT0gJydcblxuICAgICAgICAgICAgICBjb25kaXRpb24gPSBldmFsKGFzc2lnbi5jb25kaXRpb24pXG5cbiAgICAgICAgICAgICAgaWYgY29uZGl0aW9uIFxuXG4gICAgICAgICAgICAgICAgaWYgYWkgaXMgMFxuXG4gICAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrICN7bmV4dFdlZWt9IH19XCIpXG5cbiAgICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7YXNzaWduLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICAgIGlmIGFpIGlzIDBcblxuICAgICAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAje25leHRXZWVrfSB9fVwiKVxuXG4gICAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgIGVsc2VcblxuICAgICAgICAgICAgICBpZiBhaSBpcyAwXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrICN7bmV4dFdlZWt9IH19XCIpXG5cbiAgICAgICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3thc3NpZ24ud2lraXRleHR9XCIpXG5cbiAgICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIGlmIGl0ZW0ubWlsZXN0b25lcy5sZW5ndGggPiAwXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XCIpXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICBfLmVhY2goaXRlbS5taWxlc3RvbmVzLCAobSkgPT5cblxuICAgICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3ttLndpa2l0ZXh0fVwiKVxuXG4gICAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgICApXG5cbiAgICAgICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgICAgaWYgaXNMYXN0V2Vla1xuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwie3tlbmQgb2YgY291cnNlIHdlZWt9fVwiKVxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICApXG4gICAgICBcbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChHcmFkaW5nVGVtcGxhdGUoV2l6YXJkRGF0YSkpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKCd7e3RhYmxlIG9mIGNvbnRlbnRzfX0nKVxuXG4gICAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoXCIje0B3aWtpU3BhY2V9XCIpXG5cbiAgICAgIGdyYWRpbmdJdGVtcyA9IFtdXG5cbiAgICAgIF8uZWFjaChhcHBsaWNhdGlvbi5ob21lVmlldy5zZWxlY3RlZFBhdGh3YXlzLCAocGF0aHdheSkgPT5cblxuICAgICAgICBncmFkaW5nSXRlbXMucHVzaChXaXphcmREYXRhLmdyYWRpbmdbcGF0aHdheV1bcGF0aHdheV0pXG5cbiAgICAgICAgXy5lYWNoKEBkYXRhQWx0W3BhdGh3YXldLCAoaXRlbSwgaW5kKSA9PlxuXG4gICAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGRpdj4je2l0ZW19PC9kaXY+PGJyLz5cIilcblxuICAgICAgICAgIGlmIGluZCBpcyAwXG5cbiAgICAgICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIiN7QHdpa2lTcGFjZX1cIilcblxuICAgICAgICApXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxici8+XCIpXG5cbiAgICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiI3tAd2lraVNwYWNlfVwiKVxuXG4gICAgICAgIEAkb3V0Q29udGFpbmVyLmFwcGVuZChcIjxkaXY+PC9kaXY+XCIpXG5cbiAgICAgIClcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKFwiPGJyLz5cIilcblxuICAgICAgQCRvdXRDb250YWluZXIuYXBwZW5kKEdyYWRpbmdDdXN0b21UZW1wbGF0ZSh7Z3JhZGVJdGVtczogZ3JhZGluZ0l0ZW1zfSkpXG5cbiAgICBAJG91dENvbnRhaW5lci5hcHBlbmQoT3B0aW9uc1RlbXBsYXRlKFdpemFyZERhdGEpKVxuXG4gICAgXG4gIGdldFdlZWtzRGlmZjogKGEsIGIpIC0+XG5cbiAgICByZXR1cm4gYi5kaWZmKGEsICd3ZWVrcycpXG5cblxuICBjb21iaW5lOiAob2JqMSwgb2JqMikgLT5cblxuICAgIHRpdGxlID0gXy51bmlvbihvYmoxLnRpdGxlLCBvYmoyLnRpdGxlKVxuXG4gICAgaW5fY2xhc3MgPSBfLnVuaXEoXy51bmlvbihvYmoxLmluX2NsYXNzLCBvYmoyLmluX2NsYXNzKSx0cnVlKVxuXG4gICAgYXNzaWdubWVudHMgPSBfLnVuaXEoXy51bmlvbihvYmoxLmFzc2lnbm1lbnRzLCBvYmoyLmFzc2lnbm1lbnRzKSx0cnVlKVxuXG4gICAgbWlsZXN0b25lcyA9IF8udW5pcShfLnVuaW9uKG9iajEubWlsZXN0b25lcywgb2JqMi5taWxlc3RvbmVzKSx0cnVlKVxuXG4gICAgcmVhZGluZ3MgPSBfLnVuaW9uKG9iajEucmVhZGluZ3MsIG9iajIucmVhZGluZ3MpXG5cbiAgICByZXR1cm4ge3RpdGxlOiB0aXRsZSwgaW5fY2xhc3M6IGluX2NsYXNzLCBhc3NpZ25tZW50czogYXNzaWdubWVudHMsIG1pbGVzdG9uZXM6IG1pbGVzdG9uZXMsIHJlYWRpbmdzOiByZWFkaW5nc31cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vLi4vYXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4vVmlldycpXG5cblxuI1RFTVBMQVRFU1xuSW5wdXRJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0SXRlbVRlbXBsYXRlLmhicycpXG5cblxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogSW5wdXRJdGVtVGVtcGxhdGVcblxuXG4gIGNsYXNzTmFtZTogJ2N1c3RvbS1pbnB1dC13cmFwcGVyJ1xuXG5cbiAgaG92ZXJUaW1lOiA1MDBcblxuICB0aXBWaXNpYmxlOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwidGV4dFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5pbmZvLWljb24nIDogJ2luZm9JY29uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdmVyIC5jdXN0b20taW5wdXQnIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZWVudGVyIC5jaGVjay1idXR0b24nIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZW91dCcgOiAnbW91c2VvdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0YWJsZSAuY2hlY2stYnV0dG9uJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpb2JveCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0JveENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdmb2N1cyAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkZvY3VzJ1xuXG4gICAgJ2JsdXIgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25CbHVyJ1xuXG5cbiAgaW5mb0ljb25DbGlja0hhbmRsZXI6IC0+XG5cbiAgICB1bmxlc3MgQCRlbC5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAc2hvd1Rvb2x0aXAoKVxuXG4gICAgZWxzZVxuXG4gICAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcblxuICAgICAgICBzY3JvbGxUb3A6IDBcblxuICAgICAgLDUwMClcblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cblxuXG4gIHJhZGlvQm94Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRvdGhlclJhZGlvcyA9IEAkZWwucGFyZW50cygnLnN0ZXAtZm9ybS1pbm5lcicpLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpLmZpbmQoJ2lucHV0JykudmFsKCdvZmYnKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuICBjaGVja0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JykubGVuZ3RoID4gMFxuXG4gICAgICByZXR1cm4gQHJhZGlvQm94Q2xpY2tIYW5kbGVyKGUpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpXG5cbiAgICAgIC50b2dnbGVDbGFzcygnY2hlY2tlZCcpXG4gICAgXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cblxuICBob3ZlckhhbmRsZXI6IChlKSAtPlxuICAgIHJldHVybiBlXG5cblxuICBtb3VzZW92ZXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gdHJ1ZVxuICAgICAgXG5cbiAgbW91c2VvdXRIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG4gIHNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8oKSAmJiBAcGFyZW50U3RlcC50aXBWaXNpYmxlID09IGZhbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IHRydWVcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwW2RhdGEtaXRlbS1pbmRleD0nI3tAaXRlbUluZGV4fSddXCIpLmFkZENsYXNzKCd2aXNpYmxlJylcblxuXG4gIGhpZGVUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8oKVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpIFxuXG5cbiAgaGlkZVNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JykuaGFzQ2xhc3MoJ25vdC1lZGl0YWJsZScpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cbiAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgIEBzaG93VG9vbHRpcCgpXG5cblxuICBsYWJlbENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgcmV0dXJuIGZhbHNlXG5cblxuICBpdGVtQ2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICAjIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2Fuc3dlcjp1cGRhdGVkJywgaW5wdXRJZCwgdmFsdWUpXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0dyb3VwJ1xuXG4gICAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAgIGluZGV4ID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2lkJylcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cigndmFsdWUnKVxuXG4gICAgICBwYXJlbnRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCduYW1lJylcblxuICAgICAgaWYgJChlLmN1cnJlbnRUYXJnZXQpLnByb3AoJ2NoZWNrZWQnKVxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVJhZGlvQW5zd2VyKHBhcmVudElkLCBpbmRleCwgdHJ1ZSlcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVJhZGlvQW5zd2VyKHBhcmVudElkLCBpbmRleCwgZmFsc2UpXG5cbiAgICBlbHNlXG5cbiAgICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICAgIGlucHV0SWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICBpZiBAcGFyZW50U3RlcC5tb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJ1xuXG4gICAgICAgIHBhdGh3YXkgPSAkKGUudGFyZ2V0KS5wYXJlbnRzKCcuY3VzdG9tLWlucHV0JykuYXR0cignZGF0YS1wYXRod2F5LWlkJylcblxuICAgICAgICB1bmxlc3MgcGF0aHdheVxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSwgdHJ1ZSwgcGF0aHdheSlcblxuICAgICAgZWxzZVxuICAgICAgICBAcGFyZW50U3RlcC51cGRhdGVBbnN3ZXIoaW5wdXRJZCwgdmFsdWUsIGZhbHNlKVxuXG4gICAgICBpZiBAaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICAgIGlmIGlzTmFOKHBhcnNlSW50KHZhbHVlKSlcblxuICAgICAgICAgICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoJycpXG5cbiAgICAgICAgICByZXR1cm5cblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdncmFkZTpjaGFuZ2UnLCBpbnB1dElkLCB2YWx1ZSlcbiAgICBcbiAgICByZXR1cm4gQHBhcmVudFN0ZXAudXBkYXRlVXNlckhhc0Fuc3dlcmVkKGlucHV0SWQsIHZhbHVlLCBAaW5wdXRUeXBlKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHJpdmF0ZSBNZXRob2RzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcyhAaW5wdXRUeXBlKVxuXG4gICAgQCRpbnB1dEVsID0gQCRlbC5maW5kKCdpbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy52YWx1ZSAhPSAnJyAmJiBAbW9kZWwuYXR0cmlidXRlcy50eXBlID09ICd0ZXh0J1xuICAgICAgXG4gICAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuICAgIEBob3ZlclRpbWVyID0gbnVsbFxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cblxuICBoYXNJbmZvOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuaGFzQ2xhc3MoJ2hhcy1pbmZvJylcblxuXG4gIG9uRm9jdXM6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBvbkJsdXI6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBpZiB2YWx1ZSA9PSAnJ1xuXG4gICAgICB1bmxlc3MgJHRhcmdldC5pcygnOmZvY3VzJylcblxuICAgICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzRGlzYWJsZWQ6IC0+XG5cbiAgICByZXR1cm4gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JykuaGFzQ2xhc3MoJ25vdC1lZGl0YWJsZScpXG5cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFB1YmxpYyBNZXRob2RzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJlbmRlcjogLT5cblxuICAgIHN1cGVyKClcblxuXG4gIGdldElucHV0VHlwZU9iamVjdDogLT5cblxuICAgIHJldHVybkRhdGEgPSB7fVxuXG4gICAgcmV0dXJuRGF0YVtAaW5wdXRUeXBlXSA9IHRydWVcblxuICAgIHJldHVybiByZXR1cm5EYXRhXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICBpbnB1dFR5cGVPYmplY3QgPSBAZ2V0SW5wdXRUeXBlT2JqZWN0KClcblxuXG4gICAgaWYgQGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpbydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3RleHQnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICBpZiBAcGFyZW50U3RlcC5tb2RlbC5hdHRyaWJ1dGVzLmlkIGlzICdncmFkaW5nJyB8fCBAcGFyZW50U3RlcC5tb2RlbC5hdHRyaWJ1dGVzLnR5cGUgaXMgJ2dyYWRpbmcnXG5cbiAgICAgICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuY29udGluZ2VudFVwb24ubGVuZ3RoICE9IDBcblxuICAgICAgICAgIGN1cnJlbnRTZWxlY3RlZCA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LmdldFNlbGVjdGVkSWRzKClcblxuICAgICAgICAgIHJlbmRlckluT3V0cHV0ID0gZmFsc2VcblxuICAgICAgICAgIF8uZWFjaChAbW9kZWwuYXR0cmlidXRlcy5jb250aW5nZW50VXBvbiwgKGlkKSA9PlxuXG4gICAgICAgICAgICBfLmVhY2goY3VycmVudFNlbGVjdGVkLCAoc2VsZWN0ZWRJZCkgPT5cblxuICAgICAgICAgICAgICBpZiBpZCBpcyBzZWxlY3RlZElkXG5cbiAgICAgICAgICAgICAgICByZW5kZXJJbk91dHB1dCA9IHRydWVcblxuICAgICAgICAgICAgKVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgdW5sZXNzIHJlbmRlckluT3V0cHV0XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuXG5cblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdlZGl0J1xuXG4gICAgICBhbGxJbnB1dHMgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVxuXG4gICAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICAgIF8uZWFjaChhbGxJbnB1dHMsIChpbnB1dCkgPT5cblxuICAgICAgICBpZiBpbnB1dC50eXBlXG5cbiAgICAgICAgICBpZiBpbnB1dC50eXBlIGlzICdjaGVja2JveCcgfHwgaW5wdXQudHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgICAgICAgIGlmIGlucHV0LnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0LmxhYmVsXG5cbiAgICAgICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3JhZGlvR3JvdXAnXG5cbiAgICAgICAgICAgIGlmIGlucHV0LmlkIGlzICdwZWVyX3Jldmlld3MnXG5cbiAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5vdmVydmlld0xhYmVsXG5cbiAgICAgIClcblxuICAgICAgXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hhcy1jb250ZW50JylcblxuICAgICAgaWYgc2VsZWN0ZWRJbnB1dHMubGVuZ3RoID09IDBcbiAgICAgICAgXG4gICAgICAgIHNlbGVjdGVkSW5wdXRzLnB1c2ggXCJbTm9uZSBzZWxlY3RlZF1cIlxuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIGFzc2lnbm1lbnRzOiBzZWxlY3RlZElucHV0c1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnbGluaydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cblxuICBcbiAgICAgIFxuICAgIFxuICAgICAgXG5cbiAgICBcbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEJhc2UgVmlldyBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbnJlcXVpcmUoJy4uLy4uL2hlbHBlcnMvVmlld0hlbHBlcicpXG5cbmNsYXNzIFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHRlbXBsYXRlOiAtPlxuICAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcbiAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuICAgIFxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBhZnRlclJlbmRlcjogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBFVkVOVCBIQU5ETEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXciXX0=
