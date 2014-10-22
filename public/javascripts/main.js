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
    var AppData, HomeView, InputItemView, LoginView, OutputView, Router;
    AppData = require('./data/WizardContent');
    this.data = AppData;
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



},{"./data/WizardContent":7,"./routers/Router":14,"./views/HomeView":27,"./views/InputItemView":28,"./views/LoginView":29,"./views/OutputView":30}],6:[function(require,module,exports){
var WizardAssignmentData;

module.exports = WizardAssignmentData = [];



},{}],7:[function(require,module,exports){
var WizardContent;

WizardContent = [
  {
    id: "intro",
    title: 'Welcome to the Wikipedia Assignment Wizard!',
    login_instructions: 'Click Login with WikiMedia to get started',
    instructions: 'Since Wikipedia began in 2001, professors around the world have integrated the free encyclopedia that anyone can edit into their curriculum.<br/><br/>This interactive wizard will take you through the required steps to create a custom assignment for your class. Please begin by filling in the following fields:',
    inputs: [
      {
        type: 'text',
        label: 'Teacher Name',
        id: 'teacher',
        value: '',
        placeholder: ''
      }, {
        type: 'text',
        label: 'University',
        id: 'school',
        value: '',
        placeholder: ''
      }, {
        type: 'text',
        label: 'Subject',
        id: 'subject',
        value: '',
        placeholder: ''
      }, {
        type: 'text',
        label: 'Approximate number of students',
        id: 'students',
        value: '',
        placeholder: ''
      }
    ],
    sections: []
  }, {
    id: "assignment_selection",
    title: 'Assignment type selection',
    infoTitle: 'About assignment selections',
    formTitle: 'Available assignments',
    instructions: 'Depending on the learning goals you have for your course and how much time you want to devote to your Wikipedia project, there are many effective ways to use Wikipedia in your course. ',
    inputs: [
      {
        type: 'checkbox',
        id: 'researchwrite',
        selected: false,
        label: 'Research and write an article',
        exclusive: true,
        hasCourseInfo: true
      }, {
        type: 'checkbox',
        id: 'evaluate',
        selected: false,
        label: 'Evaluate articles',
        exclusive: false,
        hasCourseInfo: true
      }, {
        type: 'checkbox',
        id: 'multimedia',
        selected: false,
        label: 'Add images & multimedia',
        exclusive: false,
        hasCourseInfo: true
      }, {
        type: 'checkbox',
        id: 'sourcecentered',
        selected: false,
        label: 'Source-centered additions',
        exclusive: false,
        hasCourseInfo: true
      }, {
        type: 'checkbox',
        id: 'copyedit',
        selected: false,
        label: 'Copy/edit articles',
        exclusive: false,
        hasCourseInfo: true
      }, {
        type: 'checkbox',
        id: 'findfix',
        selected: false,
        label: 'Find and fix errors',
        exclusive: false,
        hasCourseInfo: true
      }, {
        type: 'checkbox',
        id: 'plagiarism',
        selected: false,
        label: 'Identify and fix close paraphrasing / plagiarism',
        exclusive: false,
        hasCourseInfo: true
      }
    ],
    sections: [
      {
        title: '',
        content: ['<p>Experienced instructors say it is crucial for students who are going to be editing Wikipedia to become comfortable not only with the markup, but also the community. Introducing the Wikipedia project early in the term and requiring milestones throughout the term will acclimate students to the site and head off procrastination.</p>', '<p>To make the the most of your Wikipedia project, try to integrate your Wikipedia assignment with the course themes. Engage your students with questions of media literacy and knowledge construction throughout your course.</p>']
      }
    ]
  }, {
    id: "learning_essentials",
    title: 'Learning Wiki Essentials',
    formTitle: 'Choose one or more:',
    infoTitle: 'About wiki essentials',
    instructions: 'To get started, you\'ll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community. As their first Wikipedia assignment milestone, you can ask the students to create accounts and then complete the online training for students. ',
    inputs: [
      {
        type: 'checkbox',
        id: 'create_user',
        selected: true,
        label: 'Create User Account',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'enroll',
        selected: true,
        label: 'Enroll to the Course',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'complete_training',
        selected: false,
        label: 'Complete Online Training',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'introduce_ambassadors',
        selected: false,
        label: 'Introduce Wikipedia Ambassadors Involved',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'include_completion',
        selected: false,
        label: 'Include Completion of this Assignment as Part of the Students\'s Grade',
        exclusive: false
      }
    ],
    sections: [
      {
        content: ['<p>This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and covers some of the ways they can find help as they get started. It takes about an hour and ends with a certification step that you can use to verify that students completed the training</p>']
      }, {
        title: 'Assignment milestones',
        content: ['<p>Create a user account and enroll on the course page</p>', '<p>Complete the online training for students. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia.</p>', '<p>To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.</p>']
      }
    ]
  }, {
    id: "getting_started",
    title: 'Getting Started with Editing',
    infoTitle: 'About editing',
    instructions: "It is important for students to start editing Wikipedia right away. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on.",
    formTitle: 'Which basic assignments would you like to include in your course?',
    inputs: [
      {
        type: 'checkbox',
        id: 'critique_article',
        selected: true,
        label: 'Critique an Article',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'add_to_article',
        selected: true,
        label: 'Add to an Article',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'copy_edit_article',
        selected: false,
        label: 'Copy-Edit an Article',
        exclusive: false
      }, {
        type: 'checkbox',
        id: 'illustrate_article',
        selected: false,
        label: 'Illustrate an Article',
        exclusive: false
      }
    ],
    sections: [
      {
        title: '',
        content: []
      }
    ]
  }, {
    id: 'choosing_articles',
    title: 'Choosing Articles',
    formTitle: 'There are two recommended options for selecting articles for Wikipedia assignments:',
    infoTitle: 'About choosing articles',
    instructions: 'Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.',
    inputs: [
      {
        type: 'radio',
        id: 'choosing_articles',
        label: '',
        options: [
          {
            id: 'choosing_articles',
            label: 'Instructor Prepares a List with Appropriate Articles',
            value: 'prepare_list',
            selected: false
          }, {
            id: 'choosing_articles',
            label: 'Students Explore and Prepare a List of Articles',
            value: 'students_explore',
            selected: false
          }
        ]
      }
    ],
    sections: [
      {
        title: '',
        content: ['<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>']
      }, {
        title: '',
        accordian: false,
        content: ["<p>Applying your own expertise to Wikipedia’s coverage of your field is the key to a successful assignment. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia.</p>"]
      }, {
        title: 'Not such a good choice',
        accordian: true,
        content: ["<p>Articles that are \"not such a good choice\" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.</p>", "<ul> <li>You probably shouldn't try to completely overhaul articles on very broad topics (e.g., Law).</li> <li>You should probably avoid trying to improve articles on topics that are highly controversial (e.g., Global Warming, Abortion, Scientology, etc.). You may be more successful starting a sub-article on the topic instead.</li> <li>Don't work on an article that is already of high quality on Wikipedia, unless you discuss a specific plan for improving it with other editors beforehand.</li> <li>Avoid working on something with scarce literature. Wikipedia articles cite secondary literature sources, so it's important to have enough sources for verification and to provide a neutral point of view.</li> <li>Don't start articles with titles that imply an argument or essay-like approach (e.g., The Effects That The Recent Sub-Prime Mortgage Crisis has had on the US and Global Economics). These type of titles, and most likely the content too, may not be appropriate for an encyclopedia.</li> </ul>"]
      }, {
        title: 'Good choice',
        accordian: true,
        content: ["<ul> <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li> <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1-2 paragraphs of information and are in need of expansion. Relevant WikiProject pages can provide a list of stubs that need improvement.</li> <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li> </ul>"]
      }
    ]
  }, {
    id: "research_planning",
    title: 'Research & Planning',
    formTitle: 'Choose one:',
    infoTitle: 'About research & planning',
    instructions: "Students often wait until the last minute to do their research, or choose sources unsuited for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians.",
    sections: [
      {
        title: '',
        content: ["<p>Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?</p>"]
      }
    ],
    inputs: [
      {
        type: 'radio',
        id: 'research_planning',
        label: '',
        options: [
          {
            id: 'research_planning',
            label: 'Create an Article Outline',
            value: 'create_outline',
            selected: false
          }, {
            id: 'research_planning',
            label: 'Write the Article Lead Section',
            value: 'write_lead',
            selected: false
          }
        ]
      }
    ]
  }, {
    id: "drafts_mainspace",
    title: 'Drafts & Mainspace',
    formTitle: 'Choose one:',
    infoTitle: 'About drafts & mainspace',
    instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandboxes. There are pros and cons to each approach.',
    sections: [],
    inputs: []
  }, {
    id: "peer_feedback",
    title: 'Peer Feedback',
    infoTitle: 'About peer feedback',
    formTitle: "How Many Peer Reviews Should Each Student Conduct?",
    instructions: "Collaboration is a critical element of contributing to Wikipedia. For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles.",
    sections: [
      {
        title: '',
        content: ["<p>Online Ambassadors with an interest in the students' topics can also make great collaborators. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term.</p>", "<p>Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers.</p>"]
      }
    ],
    inputs: [
      {
        type: 'radioGroup',
        id: 'peer_reviews',
        label: '',
        options: [
          {
            id: 'peer_reviews',
            label: '1',
            value: '1',
            selected: false
          }, {
            id: 'peer_reviews',
            label: '2',
            value: '2',
            selected: true
          }, {
            id: 'peer_reviews',
            label: '3',
            value: '3',
            selected: false
          }, {
            id: 'peer_reviews',
            label: '5',
            value: '5',
            selected: false
          }, {
            id: 'peer_reviews',
            label: '10',
            value: '10',
            selected: false
          }
        ]
      }
    ]
  }, {
    id: "supplementary_assignments",
    title: 'Supplementary Assignments',
    formTitle: 'Choose one or more:',
    infoTitle: 'About supplementary assignments',
    instructions: "By the time students have made improvements based on classmates' review comments — and ideally suggestions from you as well — students should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria for great content. You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impact and limits of Wikipedia. ",
    sections: [
      {
        title: '',
        content: ["<p>Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion amongst the class about what the students have done so far and why (or whether) it matters.</p>", "<p>In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' Wikipedia work. Here are some of the effective supplementary assignments that instructors often use.</p>"]
      }
    ],
    inputs: [
      {
        type: 'checkbox',
        id: 'class_blog',
        selected: false,
        label: 'Class Blog or Discussion',
        exclusive: false,
        tipInfo: {
          title: 'Class blog or class discussion',
          content: 'Many instructors ask students to keep a running blog about their experiences. Giving them prompts every week or every two weeks, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them begin to think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person.'
        }
      }, {
        type: 'checkbox',
        id: 'class_presentation',
        selected: false,
        label: 'In-Class Presentation',
        exclusive: false,
        tipInfo: {
          title: 'In-class presentation of Wikipedia work',
          content: "Each student or group prepares a short presentation for the class, explaining what they worked on, what went well and what didn't, and what they learned. These presentations can make excellent fodder for class discussions to reinforce your course's learning goals."
        }
      }, {
        type: 'checkbox',
        id: 'essay',
        selected: false,
        label: 'Reflective Essay',
        exclusive: false,
        tipInfo: {
          title: 'Reflective essay',
          content: "After the assignment is over, ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not those expectations were met after they have completed the assignment."
        }
      }, {
        type: 'checkbox',
        id: 'portfolio',
        selected: false,
        label: 'Wikipedia Portfolio',
        exclusive: false,
        tipInfo: {
          title: 'Wikipedia Portfolio',
          content: "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
        }
      }, {
        type: 'checkbox',
        id: 'original_paper',
        selected: false,
        label: 'Original Analytical Paper',
        exclusive: false,
        tipInfo: {
          title: 'Original Analytical Paper',
          content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
        }
      }
    ]
  }, {
    id: "dyk_ga",
    title: 'DYK / GA Submission',
    infoTitle: 'About Did You Know & Good Articles',
    formTitle: "Do either of these processes make sense for students in your class?",
    sections: [],
    inputs: [
      {
        type: 'checkbox',
        id: 'dyk',
        selected: false,
        label: 'Include DYK Submissions as an Extracurricular Task',
        exclusive: false,
        tipInfo: {
          title: 'Did You Know (DYK)',
          content: "<p>Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days.</p> <p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its ~6 hours in the spotlight.</p> <p>We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it.</p>"
        }
      }, {
        type: 'checkbox',
        id: 'ga',
        selected: false,
        label: 'Include Good Article Submission as an Extracurricular Task',
        exclusive: false,
        tipInfo: {
          title: 'Good Article (GA)',
          content: "Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p> <p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term.</p>"
        }
      }
    ]
  }, {
    id: "grading",
    title: 'Grading',
    formTitle: "How will students' grades for the Wikipedia assignment be determined?",
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
        content: ["<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing, etc.</p>"]
      }, {
        title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.',
        accordian: true,
        content: ["<p>You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors.</p>", "<p>Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community.</p>"]
      }
    ],
    inputs: [
      {
        type: 'percent',
        label: 'Learning Wiki Essentials',
        id: 'grade_essentials',
        value: '',
        placeholder: ''
      }, {
        type: 'percent',
        label: 'Getting Started with Editing',
        id: 'grade_getting_started',
        value: '',
        placeholder: ''
      }, {
        type: 'percent',
        label: 'Choosing Articles',
        id: 'grade_choosing_articles',
        value: '',
        placeholder: ''
      }, {
        type: 'percent',
        label: 'Research & Planning',
        id: 'grade_research_planning',
        value: '',
        placeholder: ''
      }, {
        type: 'percent',
        label: 'Drafts & Mainspace',
        id: 'grade_drafts_mainspace',
        value: '',
        placeholder: ''
      }, {
        type: 'percent',
        label: 'Peer Feedback',
        id: 'grade_peer_feedback',
        value: '',
        placeholder: ''
      }, {
        type: 'percent',
        label: 'Supplementary Assignments',
        id: 'grade_supplementary',
        value: '',
        placeholder: ''
      }
    ]
  }, {
    id: "overview",
    title: 'Assignment Overview',
    sections: [
      {
        title: 'About the Course',
        content: ["<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:", "<ul> <li>topics you're covering in the class</li> <li>what students will be asked to do on Wikipedia</li> <li>what types of articles your class will be working on</li> </ul>"]
      }, {
        title: 'Short Description',
        content: ["<p><textarea id='short_description' rows='8' style='width:100%;'></textarea></p>"]
      }, {
        title: '',
        content: ["<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"]
      }
    ],
    inputs: [
      {
        type: 'edit',
        label: 'Learning Wiki Essentials',
        id: 'grade_essentials',
        value: '',
        placeholder: ''
      }, {
        type: 'edit',
        label: 'Getting Started with Editing',
        id: 'grade_getting_started',
        value: '',
        placeholder: ''
      }, {
        type: 'edit',
        label: 'Choosing Articles',
        id: 'grade_choosing_articles',
        value: '',
        placeholder: ''
      }, {
        type: 'edit',
        label: 'Research & Planning',
        id: 'grade_research_planning',
        value: '',
        placeholder: ''
      }, {
        type: 'edit',
        label: 'Drafts & Mainspace',
        id: 'grade_drafts_mainspace',
        value: '',
        placeholder: ''
      }, {
        type: 'edit',
        label: 'Peer Feedback',
        id: 'grade_peer_feedback',
        value: '',
        placeholder: ''
      }, {
        type: 'edit',
        label: 'Supplementary Assignments',
        id: 'grade_supplementary',
        value: '',
        placeholder: ''
      }
    ]
  }
];

module.exports = WizardContent;



},{}],8:[function(require,module,exports){
var WizardCourseInfo;

WizardCourseInfo = {
  researchwrite: {
    title: "Research and write a Wikipedia article",
    description: ["Working individually or in small teams with your guidance, students choose course-related topics that are not well-covered on Wikipedia. After assessing Wikipedia's coverage, students research topics to find high-quality secondary sources, then propose an outline for how the topic ought to be covered. They draft their articles, give and respond to peer feedback, take their work live on Wikipedia, and keep improving their articles until the end of the term. Along the way, students may work with experienced Wikipedia editors who can offer critical feedback and help make sure articles meet Wikipedia's standards and style conventions. Students who do great work may even have their articles featured on Wikipedia's main page. Solid articles will help inform thousands of future readers about the selected topic.", "Optionally, students may be asked to write a reflective paper about their Wikipedia experience, present their contributions in class, or develop their own ideas and arguments about their topics in a separate essay."],
    min_timeline: "6 weeks",
    rec_timeline: "12 weeks",
    best_for: ["Graduate Students", "Advanced undergraduates"],
    not_for: ["Intro courses", "large survey courses"],
    learning_objectives: [
      {
        text: "Master course content",
        stars: 4
      }, {
        text: "Writing skills development",
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



},{}],9:[function(require,module,exports){
var WizardStepInputs;

WizardStepInputs = {
  intro: {
    teacher: {
      type: 'text',
      label: 'Teacher Name',
      id: 'teacher',
      value: '',
      placeholder: ''
    },
    course_name: {
      type: 'text',
      label: 'Course Name',
      id: 'course_name',
      value: '',
      placeholder: ''
    },
    school: {
      type: 'text',
      label: 'University',
      id: 'school',
      value: '',
      placeholder: ''
    },
    subject: {
      type: 'text',
      label: 'Subject',
      id: 'subject',
      value: '',
      placeholder: ''
    },
    students: {
      type: 'text',
      label: 'Approximate number of students',
      id: 'students',
      value: '',
      placeholder: ''
    },
    instructor_username: {
      label: 'Username (temporary)',
      id: 'instructor_username',
      value: '',
      placeholder: ''
    },
    start_date: {
      value: ''
    },
    end_date: {
      value: ''
    }
  },
  assignment_selection: {
    researchwrite: {
      type: 'checkbox',
      id: 'researchwrite',
      selected: false,
      label: 'Research and write an article',
      exclusive: true,
      hasCourseInfo: true
    },
    evaluate: {
      type: 'checkbox',
      id: 'evaluate',
      selected: false,
      label: 'Evaluate articles',
      exclusive: false,
      hasCourseInfo: true
    },
    multimedia: {
      type: 'checkbox',
      id: 'multimedia',
      selected: false,
      label: 'Add images & multimedia',
      exclusive: false,
      hasCourseInfo: true
    },
    sourcecentered: {
      type: 'checkbox',
      id: 'sourcecentered',
      selected: false,
      label: 'Source-centered additions',
      exclusive: false,
      hasCourseInfo: true
    },
    copyedit: {
      type: 'checkbox',
      id: 'copyedit',
      selected: false,
      label: 'Copy/edit articles',
      exclusive: false,
      hasCourseInfo: true
    },
    findfix: {
      type: 'checkbox',
      id: 'findfix',
      selected: false,
      label: 'Find and fix errors',
      exclusive: false,
      hasCourseInfo: true
    },
    plagiarism: {
      type: 'checkbox',
      id: 'plagiarism',
      selected: false,
      label: 'Identify and fix close paraphrasing / plagiarism',
      exclusive: false,
      hasCourseInfo: true
    }
  },
  learning_essentials: {
    create_user: {
      type: 'checkbox',
      id: 'create_user',
      selected: true,
      label: 'Create User Account',
      exclusive: false
    },
    enroll: {
      type: 'checkbox',
      id: 'enroll',
      selected: true,
      label: 'Enroll to the Course',
      exclusive: false
    },
    complete_training: {
      type: 'checkbox',
      id: 'complete_training',
      selected: false,
      label: 'Complete Online Training',
      exclusive: false
    },
    introduce_ambassadors: {
      type: 'checkbox',
      id: 'introduce_ambassadors',
      selected: false,
      label: 'Introduce Wikipedia Ambassadors Involved',
      exclusive: false
    },
    include_completion: {
      type: 'checkbox',
      id: 'include_completion',
      selected: false,
      label: 'Include Completion of this Assignment as Part of the Students\'s Grade',
      exclusive: false
    }
  },
  getting_started: {
    critique_article: {
      type: 'checkbox',
      id: 'critique_article',
      selected: true,
      label: 'Critique an Article',
      exclusive: false
    },
    add_to_article: {
      type: 'checkbox',
      id: 'add_to_article',
      selected: true,
      label: 'Add to an Article',
      exclusive: false
    },
    copy_edit_article: {
      type: 'checkbox',
      id: 'copy_edit_article',
      selected: false,
      label: 'Copy-Edit an Article',
      exclusive: false
    },
    illustrate_article: {
      type: 'checkbox',
      id: 'illustrate_article',
      selected: false,
      label: 'Illustrate an Article',
      exclusive: false
    }
  },
  choosing_articles: {
    prepare_list: {
      type: 'radioBox',
      id: 'prepare_list',
      selected: false,
      label: 'Instructor Prepares a List with Appropriate Articles',
      exclusive: false,
      tipInfo: {
        title: "Instructor Prepares a List",
        content: "You (the instructor) prepare a list of appropriate 'non-existent', 'stub' or 'start' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner."
      }
    },
    students_explore: {
      type: 'radioBox',
      id: 'students_explore',
      selected: false,
      label: 'Students Explore and Prepare a List of Articles',
      exclusive: false,
      tipInfo: {
        title: "Students Explore",
        content: "Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Letting students find their own articles provides them with a sense of motivation and ownership over the assignment, but it may also lead to choices that are further afield from course material."
      }
    }
  },
  research_planning: {
    create_outline: {
      type: 'radioBox',
      id: 'create_outline',
      selected: false,
      label: 'Create an Article Outline',
      exclusive: false,
      tipInfo: {
        title: "Traditional Outline",
        content: "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
      }
    },
    write_lead: {
      type: 'radioBox',
      id: 'write_lead',
      selected: false,
      label: 'Write the Article Lead Section',
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
      label: 'Work Live from the Start',
      exclusive: false,
      tipInfo: {
        title: "Pros and cons to editing live",
        content: "Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed."
      }
    },
    sandbox: {
      type: 'radioBox',
      id: 'sandbox',
      selected: false,
      label: 'Draft Early Work on Sandboxes',
      exclusive: false,
      tipInfo: {
        title: "Pros and cons to sandboxes",
        content: "Sandboxes make students feel safe because they can edit without the pressure of the whole world reading their drafts, or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged."
      }
    }
  },
  peer_feedback: {
    peer_reviews: {
      type: 'radioGroup',
      id: 'peer_reviews',
      label: '',
      options: [
        {
          id: 'peer_reviews',
          label: '1',
          value: '1',
          selected: false
        }, {
          id: 'peer_reviews',
          label: '2',
          value: '2',
          selected: true
        }, {
          id: 'peer_reviews',
          label: '3',
          value: '3',
          selected: false
        }, {
          id: 'peer_reviews',
          label: '5',
          value: '5',
          selected: false
        }, {
          id: 'peer_reviews',
          label: '10',
          value: '10',
          selected: false
        }
      ]
    }
  },
  supplementary_assignments: {
    class_blog: {
      type: 'checkbox',
      id: 'class_blog',
      selected: false,
      label: 'Class Blog or Discussion',
      exclusive: false,
      tipInfo: {
        title: 'Class blog or class discussion',
        content: 'Many instructors ask students to keep a running blog about their experiences. Giving them prompts every week or every two weeks, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them begin to think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person.'
      }
    },
    class_presentation: {
      type: 'checkbox',
      id: 'class_presentation',
      selected: false,
      label: 'In-Class Presentation',
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
      label: 'Reflective Essay',
      exclusive: false,
      tipInfo: {
        title: 'Reflective essay',
        content: "After the assignment is over, ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not those expectations were met after they have completed the assignment."
      }
    },
    portfolio: {
      type: 'checkbox',
      id: 'portfolio',
      selected: false,
      label: 'Wikipedia Portfolio',
      exclusive: false,
      tipInfo: {
        title: 'Wikipedia Portfolio',
        content: "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
      }
    },
    original_paper: {
      type: 'checkbox',
      id: 'original_paper',
      selected: false,
      label: 'Original Analytical Paper',
      exclusive: false,
      tipInfo: {
        title: 'Original Analytical Paper',
        content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
      }
    }
  },
  dyk_ga: {
    dyk: {
      type: 'checkbox',
      id: 'dyk',
      selected: false,
      label: 'Include DYK Submissions as an Extracurricular Task',
      exclusive: false,
      tipInfo: {
        title: 'Did You Know (DYK)',
        content: "<p>Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days.</p> <p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its ~6 hours in the spotlight.</p> <p>We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it.</p>"
      }
    },
    ga: {
      type: 'checkbox',
      id: 'ga',
      selected: false,
      label: 'Include Good Article Submission as an Extracurricular Task',
      exclusive: false,
      tipInfo: {
        title: 'Good Article (GA)',
        content: "Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p> <p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term.</p>"
      }
    }
  },
  grading: {
    learning_essentials: {
      type: 'percent',
      label: 'Learning Wiki Essentials',
      id: 'learning_essentials',
      value: '',
      placeholder: ''
    },
    getting_started: {
      type: 'percent',
      label: 'Getting Started with Editing',
      id: 'getting_started',
      value: '',
      placeholder: ''
    },
    choosing_articles: {
      type: 'percent',
      label: 'Choosing Articles',
      id: 'choosing_articles',
      value: '',
      placeholder: ''
    },
    research_planning: {
      type: 'percent',
      label: 'Research & Planning',
      id: 'research_planning',
      value: '',
      placeholder: ''
    },
    drafts_mainspace: {
      type: 'percent',
      label: 'Drafts & Mainspace',
      id: 'drafts_mainspace',
      value: '',
      placeholder: ''
    },
    peer_feedback: {
      type: 'percent',
      label: 'Peer Feedback',
      id: 'peer_feedback',
      value: '',
      placeholder: ''
    },
    supplementary_assignments: {
      type: 'percent',
      label: 'Supplementary Assignments',
      id: 'supplementary_assignments',
      value: '',
      placeholder: ''
    }
  },
  overview: {
    learning_essentials: {
      type: 'edit',
      label: 'Learning Wiki Essentials',
      id: 'learning_essentials',
      value: '',
      placeholder: ''
    },
    getting_started: {
      type: 'edit',
      label: 'Getting Started with Editing',
      id: 'getting_started',
      value: '',
      placeholder: ''
    },
    choosing_articles: {
      type: 'edit',
      label: 'Choosing Articles',
      id: 'choosing_articles',
      value: '',
      placeholder: ''
    },
    research_planning: {
      type: 'edit',
      label: 'Research & Planning',
      id: 'research_planning',
      value: '',
      placeholder: ''
    },
    drafts_mainspace: {
      type: 'edit',
      label: 'Drafts & Mainspace',
      id: 'drafts_mainspace',
      value: '',
      placeholder: ''
    },
    peer_feedback: {
      type: 'edit',
      label: 'Peer Feedback',
      id: 'peer_feedback',
      value: '',
      placeholder: ''
    },
    supplementary_assignments: {
      type: 'edit',
      label: 'Supplementary Assignments',
      id: 'supplementary_assignments',
      value: '',
      placeholder: ''
    }
  }
};

module.exports = WizardStepInputs;



},{}],10:[function(require,module,exports){
Handlebars.registerHelper('link', function(text, url) {
  var result;
  text = Handlebars.Utils.escapeExpression(text);
  url = Handlebars.Utils.escapeExpression(url);
  result = '<a href="' + url + '">' + text + '</a>';
  return new Handlebars.SafeString(result);
});



},{}],11:[function(require,module,exports){
var application;

application = require('./App');

$(function() {
  application.initialize();
  return Backbone.history.start();
});



},{"./App":5}],12:[function(require,module,exports){
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



},{"../models/supers/Model":13}],13:[function(require,module,exports){
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



},{}],14:[function(require,module,exports){
var Router, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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
      console.log(WizardStepInputs);
      return $('#app').html(application.homeView.render().el);
    } else if ($('#login').length > 0) {
      return $('#login').html(application.loginView.render().el);
    }
  };

  return Router;

})(Backbone.Router);



},{"../App":5,"../data/WizardStepInputs":9}],15:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Home Page Template\n-->\n\n<!-- MAIN APP CONTENT -->\n<div class=\"content\">\n\n\n  <!-- STEPS MAIN CONTAINER -->\n  <div class=\"steps\"></div><!-- end .steps -->\n\n\n</div><!-- end .content -->";
  })
},{"handleify":4}],16:[function(require,module,exports){
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
  buffer += " <!-- end .step-form-instructions -->\n\n\n\n\n        <!-- BEGIN BUTTON -->\n        <div class=\"step-form-actions\">\n          <a class=\"button button--blue\" id=\"loginButton\" href=\"/auth/mediawiki\">\n            Login with WikiMedia\n          </a>\n          <a class=\"font-blue\" href=\"/welcome\" id=\"skipLoginButton\">\n            <em>or skip it for now and just see the current build</em>\n          </a>\n        </div><!-- end .step-form-actions -->\n\n\n      </div><!-- end .step-form -->\n    </div>\n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],17:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div href=\"#\" class=\"dot step-nav-indicators__item ";
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

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Step Navigation \n-->\n\n\n<!-- STEP NAV DOT INDICATORS -->\n<div class=\"step-nav-indicators hidden\">\n\n  ";
  stack1 = helpers.each.call(depth0, depth0.steps, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</div><!-- end .step-nav-indicators -->\n\n\n\n<!-- STEP NAV BUTTONS -->\n<div class=\"step-nav-buttons\">\n\n  <a href=\"#\" class=\"step-nav__button step-nav--prev prev\">\n    <span style=\"margin-right:5px;\">\n      <div class=\"step-nav-arrow step-nav-arrow--left\"></div>\n    </span>\n    Prev\n  </a>\n\n  <a href=\"#\" class=\"step-nav__button step-nav--next next\">\n    Next\n    <span style=\"margin-left:5px;\">\n      <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n    </span>\n  </a>\n\n</div><!-- end .step-nav-buttons -->\n";
  return buffer;
  })
},{"handleify":4}],18:[function(require,module,exports){
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
  buffer += "\n  <div class=\"step-form-instructions\">\n    <p class=\"large\">";
  if (stack1 = helpers.instructions) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.instructions; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n  </div>\n  ";
  return buffer;
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Individal Step Template\n-->\n\n<div class=\"step-form\">\n\n  <!-- STEP FORM HEADER -->\n  <div class=\"step-form-header\">\n\n    <!-- STEP TITLE -->\n    ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  \n    <!-- STEP FORM TITLE -->\n    ";
  stack1 = helpers['if'].call(depth0, depth0.formTitle, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  </div><!-- end .step-form-header -->\n  \n  <!-- STEP INSTRUCTIONS -->\n  ";
  stack1 = helpers['if'].call(depth0, depth0.instructions, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n    <a class=\"button button--blue\" id=\"beginButton\" href=\"#\">\n      Begin Assignment Wizard\n    </a>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
  return buffer;
  })
},{"handleify":4}],19:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h3 class=\"step-form-header__title\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\n    ";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h4 class=\"step-form-content__title\">";
  if (stack1 = helpers.formTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.formTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h4>\n    ";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h2 class=\"font-blue--dark\">";
  if (stack1 = helpers.infoTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.infoTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n    ";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <p class=\"large\">";
  if (stack1 = helpers.instructions) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.instructions; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</p>\n    ";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <div class=\"step-info-section ";
  stack1 = helpers['if'].call(depth0, depth0.accordian, {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      \n      <!-- INFO SECTION HEADER -->\n      ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      \n      <!-- INFO SECTION CONTENT -->\n      <div class=\"step-info-section__content\">\n        ";
  stack1 = helpers.each.call(depth0, depth0.content, {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      </div><!-- end .step-info-section__content -->\n\n    </div><!-- end .step-info-section -->\n    ";
  return buffer;
  }
function program10(depth0,data) {
  
  
  return " step-info-section--accordian";
  }

function program12(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <div class=\"step-info-section__header\">\n        <h2 class=\"font-blue--dark\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h2>\n      </div><!-- end .step-info-section__header -->\n      ";
  return buffer;
  }

function program14(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "    \n          ";
  stack1 = (typeof depth0 === functionType ? depth0.apply(depth0) : depth0);
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "    \n        ";
  return buffer;
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Main Individal Step Template\n-->\n\n\n<!-- STEP FORM : Left Side of Step -->\n<div class=\"step-form\">\n  <div class=\"step-form-header\">\n    ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n  </div>\n\n  \n  <!-- STEP FORM INNER CONTENT -->\n  <div class=\"step-form-content\">\n    ";
  stack1 = helpers['if'].call(depth0, depth0.formTitle, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    <div class=\"step-form-inner\"></div>\n  </div>\n</div><!-- end .step-form -->\n\n\n\n<!-- STEP INFO : Right side of step -->\n<div class=\"step-info\">\n  \n  <!-- WIKIEDU LOGO -->\n  <a class=\"main-logo\" href=\"http://wikiedu.org\" target=\"_blank\" title=\"wikiedu.org\">WIKIEDU.ORG</a>\n\n  <!-- STEP INFO INNER -->\n  <div class=\"step-info-inner\">\n\n    ";
  stack1 = helpers['if'].call(depth0, depth0.infoTitle, {hash:{},inverse:self.noop,fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    ";
  stack1 = helpers['if'].call(depth0, depth0.instructions, {hash:{},inverse:self.noop,fn:self.program(7, program7, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n    \n    <!-- INFO SECTIONS -->\n    ";
  stack1 = helpers.each.call(depth0, depth0.sections, {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n  </div><!-- end .step-info-inner -->\n  \n\n\n  <!-- STEP INFO TIP SECTION -->\n  <!-- used for both course info and generic info -->\n  <div class=\"step-info-tips\"></div><!-- end .step-info-tips -->\n\n\n</div><!-- end .step-info -->\n";
  return buffer;
  })
},{"handleify":4}],20:[function(require,module,exports){
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
    + " : ";
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
  buffer += "\n      </div>\n\n      \n    </div>\n    <div class=\"input-info-block\">\n      <div class=\"input-info-block--two-columns\">\n        <div class=\"input-info-block__title\">\n          <h2 class=\"font-blue--dark\">Minimum timeline</h2>\n        </div>\n        <div class=\"input-info-block__stat\">\n          ";
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
},{"handleify":4}],21:[function(require,module,exports){
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
    + "\">\n  <a class=\"step-info-tip__close\">Close Info</a>\n    <div class=\"step-info-tip__inner\">\n\n      ";
  stack1 = helpers['if'].call(depth0, depth0.title, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      ";
  stack1 = helpers['if'].call(depth0, depth0.content, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n      \n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],22:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custom-input--checkbox ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.exclusive), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
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
  buffer += "  />\n  <a class=\"check-button\" href=\"#\"></a>\n</div>\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return " checked ";
  }

function program4(depth0,data) {
  
  
  return " data-exclusive=\"true\" ";
  }

function program6(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custom-input--checkbox custom-input--radiobox ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.exclusive), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
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
  buffer += "  />\n  <a class=\"radio-button\" href=\"#\"></a>\n</div>\n";
  return buffer;
  }

function program8(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-checkbox-group\" data-checkbox-group=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <div class=\"custom-input-checkbox-group__label\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program9(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <div class=\"custom-input custom-input--checkbox ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    <label for=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</label>\n    <input name=\"";
  if (stack1 = helpers.id) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.id; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" type=\"checkbox\" ";
  stack1 = helpers['if'].call(depth0, depth0.selected, {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n  </div>\n  ";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custum-input--select ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.multiple), {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\">\n  <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n  <select name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.multiple), {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += ">\n    ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  </select>\n</div>\n";
  return buffer;
  }
function program12(depth0,data) {
  
  
  return " custum-input--select--multi ";
  }

function program14(depth0,data) {
  
  
  return " multiple ";
  }

function program16(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n      <option value=\"";
  if (stack1 = helpers.value) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.value; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\">";
  if (stack1 = helpers.label) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</option>\n    ";
  return buffer;
  }

function program18(depth0,data) {
  
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
    + "\" placeholder=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.placeholder)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" />\n  </div>\n</div>\n";
  return buffer;
  }

function program20(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--percent\">\n  <div class=\"custom-input--percent__inner\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    <div class=\"input-container\">\n    <input name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" type=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.type)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" value=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" placeholder=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.placeholder)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" maxlength=\"2\" />\n    </div>\n  </div>\n</div>\n";
  return buffer;
  }

function program22(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--edit\">\n  <div class=\"custom-input--edit__inner\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    <a class=\"edit-button\" href=\"#\" data-step-id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">edit</a>\n  </div>\n  <div class=\"custom-input--edit__content\">\n    <!-- content -->\n  </div>\n</div>\n";
  return buffer;
  }

function program24(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--textarea\">\n  <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n  <textarea name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" placeholder=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.placeholder)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" rows=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.rows)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\"></textarea>\n</div>\n";
  return buffer;
  }

function program26(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner\">\n  <div class=\"custom-input-radio-inner__header\">\n    <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n  </div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(27, program27, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program27(depth0,data) {
  
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

function program29(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner__header\">\n  <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n</div>\n<div class=\"custom-input-radio-inner custom-input-radio-inner--group\">\n  \n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(30, program30, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program30(depth0,data) {
  
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
  buffer += "/>\n    </div>\n  ";
  return buffer;
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Input Item Templates\n  \n-->\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.checkbox), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioBox), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.checkboxGroup), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.select), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.text), {hash:{},inverse:self.noop,fn:self.program(18, program18, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.percent), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.edit), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.textarea), {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radio), {hash:{},inverse:self.noop,fn:self.program(26, program26, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioGroup), {hash:{},inverse:self.noop,fn:self.program(29, program29, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],23:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates\">\n\n  <div class=\"custom-input-dates__inner from\">\n\n    <div class=\"custom-select custom-select--month\">\n    \n      <select class=\"month\" id=\"monthStart\" name=\"monthStart\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <select class=\"day\" id=\"dayStart\" name=\"dayStart\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n        <option>13</option>\n        <option>14</option>\n        <option>15</option>\n        <option>16</option>\n        <option>17</option>\n        <option>18</option>\n        <option>19</option>\n        <option>20</option>\n        <option>21</option>\n        <option>22</option>\n        <option>23</option>\n        <option>24</option>\n        <option>25</option>\n        <option>26</option>\n        <option>27</option>\n        <option>28</option>\n        <option>29</option>\n        <option>30</option>\n        <option>31</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--year\">\n      <select class=\"year\" id=\"yearStart\" name=\"yearStart\">\n        <option></option>\n        <option>2014</option>\n        <option>2015</option>\n        <option>2016</option>\n        <option>2017</option>\n        <option>2018</option>\n        <option>2019</option>\n        <option>2020</option>\n        <option>2021</option>\n        <option>2022</option>\n        <option>2023</option>\n        <option>2024</option>\n        <option>2025</option>\n        <option>2026</option>\n      </select>\n    </div>\n\n  </div>\n  <span class=\"dates-to\">\n    to\n  </span>\n  <div class=\"custom-input-dates__inner to\">\n    \n    <div class=\"custom-select custom-select--month\">\n      <select class=\"month\" id=\"monthEnd\" name=\"monthEnd\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <select class=\"day\" id=\"dayEnd\" name=\"dayEnd\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n        <option>13</option>\n        <option>14</option>\n        <option>15</option>\n        <option>16</option>\n        <option>17</option>\n        <option>18</option>\n        <option>19</option>\n        <option>20</option>\n        <option>21</option>\n        <option>22</option>\n        <option>23</option>\n        <option>24</option>\n        <option>25</option>\n        <option>26</option>\n        <option>27</option>\n        <option>28</option>\n        <option>29</option>\n        <option>30</option>\n        <option>31</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--year\">\n      <select class=\"year\" id=\"yearEnd\" name=\"yearEnd\">\n        <option></option>\n        <option>2014</option>\n        <option>2015</option>\n        <option>2016</option>\n        <option>2017</option>\n        <option>2018</option>\n        <option>2019</option>\n        <option>2020</option>\n        <option>2021</option>\n        <option>2022</option>\n        <option>2023</option>\n        <option>2024</option>\n        <option>2025</option>\n        <option>2026</option>\n      </select>\n    </div>\n\n  </div>\n\n</div>";
  })
},{"handleify":4}],24:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  })
},{"handleify":4}],25:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "{{course details | course_name = ";
  if (stack1 = helpers.course_name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.course_name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | instructor_username = ";
  if (stack1 = helpers.instructor_username) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.instructor_username; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | instructor_realname = ";
  if (stack1 = helpers.instructor_realname) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.instructor_realname; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | subject = ";
  if (stack1 = helpers.subject) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.subject; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | start_date = ";
  if (stack1 = helpers.start_date) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.start_date; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | end_date = ";
  if (stack1 = helpers.end_date) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.end_date; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | institution = ";
  if (stack1 = helpers.institution) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.institution; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " | expected_students = ";
  if (stack1 = helpers.expected_students) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.expected_students; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " }}\n<br/>\n==Timeline==\n<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 1 | Wikipedia essentials }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 2 | Editing basics }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 3 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Milestones}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 3 | Exploring the topic area}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Exploring the topic area in class}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 4 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 4 | Using sources }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 5}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = Week 5}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 5 | Choosing articles }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 6 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 6 | Drafting starter articles }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 7 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline }}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Milestones}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 7 | Moving articles to the main space }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 8 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 8 | Building articles }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Workshop}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 9 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = two }}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 9 | Getting and giving feedback }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 10 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = two }}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Milestones}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 10 | Responding to feedback }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 11 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 11 | Class presentations }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In class}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Assignment | due = Week 12 }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}<br/>\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Week | 12 | Due date }}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Milestones}}<br/>\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}<br/>\n\n\n";
  return buffer;
  })
},{"handleify":4}],26:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, self=this, functionType="function", escapeExpression=this.escapeExpression;

function program1(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}\n";
  return buffer;
  }

function program3(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}\n";
  return buffer;
  }

function program5(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}\n";
  return buffer;
  }

function program7(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}\n";
  return buffer;
  }

function program9(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices}}\n";
  return buffer;
  }

function program11(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose articles from a list}}\n";
  return buffer;
  }

function program13(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}\n";
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
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline }}\n  ";
  return buffer;
  }

function program18(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline | sandbox = no }}\n  ";
  return buffer;
  }

function program20(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Outline as lead section }}\n";
  return buffer;
  }

function program22(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}\n";
  return buffer;
  }

function program24(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}\n";
  return buffer;
  }

function program26(depth0,data) {
  
  
  return " Class presentations ";
  }

function program28(depth0,data) {
  
  
  return " Finishing Touches ";
  }

function program30(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}\n";
  return buffer;
  }

function program32(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}\n";
  return buffer;
  }

function program34(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}\n";
  return buffer;
  }

function program36(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}\n";
  return buffer;
  }

  buffer += "{{course details | course_name = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.course_name)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | instructor_username = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.instructor_username)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | instructor_realname = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.teacher)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | subject = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.subject)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | start_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.start_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | end_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.end_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | institution = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.school)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | expected_students = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.students)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " }}\n\n";
  if (stack2 = helpers.description) { stack2 = stack2.call(depth0, {hash:{},data:data}); }
  else { stack2 = depth0.description; stack2 = typeof stack2 === functionType ? stack2.apply(depth0) : stack2; }
  buffer += escapeExpression(stack2)
    + "\n\n==Timeline==\n\n"
    + "{{course week | 1 | Wikipedia essentials }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}\n\n"
    + "{{course week | 2 | Editing basics }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}\n\n"
    + "{{assignment | due = Week 3 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}\n\n"
    + "{{course week | 3 | Exploring the topic area}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Exploring the topic area in class}}\n\n"
    + "{{assignment | due = Week 4 }}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.getting_started),stack1 == null || stack1 === false ? stack1 : stack1.critique_article)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.getting_started),stack1 == null || stack1 === false ? stack1 : stack1.copy_edit_article)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{course week | 4 | Using sources and choosing articles }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}\n\n"
    + "{{assignment | due = Week 5}}\n";
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
  buffer += "\n\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = Week 5}}\n\n"
    + "{{course week | 5 | Finalizing topics and starting research }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}\n\n"
    + "{{assignment | due = Week 6 }}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}\n\n"
    + "{{course week | 6 | Drafting starter articles }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}\n\n"
    + "{{assignment | due = Week 7 }}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.research_planning),stack1 == null || stack1 === false ? stack1 : stack1.create_outline)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(15, program15, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.research_planning),stack1 == null || stack1 === false ? stack1 : stack1.write_lead)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}\n\n"
    + "{{course week | 7 | Moving articles to the main space }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}\n\n"
    + "{{assignment | due = Week 8 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk_ga),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}\n\n"
    + "{{course week | 8 | Building articles }}\n"
    + "{{class workshop}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}\n\n"
    + "{{assignment | due = Week 9 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = two }}\n\n"
    + "{{course week | 9 | Getting and giving feedback }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}\n\n"
    + "{{assignment | due = Week 10 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = two }}\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}\n\n"
    + "{{course week | 10 | Responding to feedback }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}\n\n"
    + "{{assignment | due = Week 11 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{course week | 11 | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(28, program28, data),fn:self.program(26, program26, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " }}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(30, program30, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{assignment | due = Week 12 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.reflective_essay)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(32, program32, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.portfolio)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(34, program34, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.original_paper)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(36, program36, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{course week | 12 | Due date }}\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}\n\n"
    + "{{assignment grading | Completion of Wikipedia training | 1 point | \"Practice on-wiki communication\" exercise | 1 point | \"Copyedit an article\" exercise | 1 point | \"Evaluate an article\" exercise\" | 1 point | \"Add to an article\" exercise | 1 point | \"Illustrate an article\" exercise | 1 point | Quality of bibliography and outline | 2 points | Peer reviews and collaboration with classmates | 2 points | Participation in class discussions | 2 points | Quality of your main Wikipedia contributions | 10 points | Reflective essay | 2 points | Original argument paper | 10 points | In-class presentation of contributions | 2 points}}\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],27:[function(require,module,exports){
var HomeTemplate, HomeView, OutputTemplate, StepModel, StepNavView, StepView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

HomeTemplate = require('../templates/HomeTemplate.hbs');

OutputTemplate = require('../templates/steps/output/OutputTemplate.hbs');

StepView = require('../views/StepView');

StepModel = require('../models/StepModel');

StepNavView = require('../views/StepNavView');

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

  HomeView.prototype.subscriptions = {
    'step:next': 'nextClickHandler',
    'step:prev': 'prevClickHandler',
    'step:goto': 'gotoClickHandler',
    'step:edit': 'editClickHandler',
    'tips:hide': 'hideAllTips'
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
    var _views;
    _views = [];
    _.each(application.data, (function(_this) {
      return function(step, index) {
        var newmodel, newview;
        newmodel = new StepModel();
        _.map(step, function(value, key, list) {
          return newmodel.set(key, value);
        });
        newview = new StepView({
          model: newmodel
        });
        newview.model.set('stepNumber', index + 1);
        newview.model.set('stepIndex', index);
        _this.$stepsContainer.append(newview.render().hide().el);
        return _views.push(newview);
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
    $('.step-info-tip').removeClass('visible');
    return $('.custom-input-wrapper').removeClass('selected');
  };

  HomeView.prototype.nextClickHandler = function() {
    this.advanceStep();
    return this.hideAllTips();
  };

  HomeView.prototype.prevClickHandler = function() {
    this.decrementStep();
    return this.hideAllTips();
  };

  HomeView.prototype.editClickHandler = function(id) {
    console.log(id);
    return _.each(this.stepViews, (function(_this) {
      return function(view, index) {
        if (view.model.id === id) {
          return _this.updateStep(index);
        }
      };
    })(this));
  };

  HomeView.prototype.gotoClickHandler = function(index) {
    this.updateStep(index);
    return this.hideAllTips();
  };

  return HomeView;

})(View);



},{"../App":5,"../models/StepModel":12,"../templates/HomeTemplate.hbs":15,"../templates/steps/output/OutputTemplate.hbs":25,"../views/StepNavView":31,"../views/StepView":32,"../views/supers/View":34}],28:[function(require,module,exports){
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



},{"../views/supers/InputView":33}],29:[function(require,module,exports){
var HomeView, LoginTemplate, View, WizardContent, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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



},{"../App":5,"../data/WizardContent":7,"../templates/LoginTemplate.hbs":16,"../views/supers/View":34}],30:[function(require,module,exports){
var CourseDetailsTemplate, InputItemView, OutputTemplate, View, WikiOutputTemplate, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

OutputTemplate = require('../templates/steps/output/OutputTemplate.hbs');

WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

CourseDetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = InputItemView = (function(_super) {
  __extends(InputItemView, _super);

  function InputItemView() {
    return InputItemView.__super__.constructor.apply(this, arguments);
  }

  InputItemView.prototype.template = WikiOutputTemplate;

  InputItemView.prototype.subscriptions = {
    'wizard:publish': 'publishHandler'
  };

  InputItemView.prototype.outputPlainText = function() {
    this.render();
    return this.$el.text();
  };

  InputItemView.prototype.render = function() {
    this.$el.html(this.template(this.populateOutput()));
    this.afterRender();
    return this;
  };

  InputItemView.prototype.populateOutput = function() {
    return this.template(this.getRenderData());
  };

  InputItemView.prototype.getRenderData = function() {
    return _.extend(WizardStepInputs, {
      description: $('#short_description').val()
    });
  };

  InputItemView.prototype.exportData = function(formData) {
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
          return alert('there was an error. see console.');
        }
      }
    });
  };

  InputItemView.prototype.publishHandler = function() {
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

  return InputItemView;

})(View);



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/output/CourseDetailsTemplate.hbs":24,"../templates/steps/output/OutputTemplate.hbs":25,"../templates/steps/output/WikiOutputTemplate.hbs":26,"../views/supers/View":34}],31:[function(require,module,exports){
var StepNavTemplate, StepNavView, View,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('../views/supers/View');

StepNavTemplate = require('../templates/StepNavTemplate.hbs');

module.exports = StepNavView = (function(_super) {
  __extends(StepNavView, _super);

  function StepNavView() {
    return StepNavView.__super__.constructor.apply(this, arguments);
  }

  StepNavView.prototype.className = 'step-nav';

  StepNavView.prototype.template = StepNavTemplate;

  StepNavView.prototype.initialize = function() {
    this.currentStep = 0;
    return this.render = _.bind(this.render, this);
  };

  StepNavView.prototype.subscriptions = {
    'step:update': 'updateCurrentStep',
    'step:answered': 'stepAnswered'
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
      this.$el.removeClass('contracted');
    } else if (this.currentStep > 0 && this.currentStep === this.totalSteps - 1) {
      this.$el.removeClass('hidden');
      this.$el.addClass('contracted');
    } else {
      this.$el.removeClass('contracted');
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

  StepNavView.prototype.prevClickHandler = function() {
    return Backbone.Mediator.publish('step:prev');
  };

  StepNavView.prototype.nextClickHandler = function() {
    return Backbone.Mediator.publish('step:next');
  };

  StepNavView.prototype.dotClickHandler = function(e) {
    var $target;
    e.preventDefault();
    $target = $(e.currentTarget);
    return Backbone.Mediator.publish('step:goto', $target.data('nav-id'));
  };

  StepNavView.prototype.updateCurrentStep = function(step) {
    this.currentStep = step;
    return this.render();
  };

  StepNavView.prototype.stepAnswered = function(stepView) {
    return this.render();
  };

  StepNavView.prototype.isInactive = function(item) {
    var itIs;
    itIs = true;
    if (item === 'prev') {
      itIs = this.currentStep === 1;
    } else if (item === 'next') {
      itIs = this.currentStep === this.totalSteps - 1;
    }
    return itIs;
  };

  return StepNavView;

})(View);



},{"../templates/StepNavTemplate.hbs":17,"../views/supers/View":34}],32:[function(require,module,exports){
var AssignmentData, CourseInfoData, CourseTipTemplate, InputItemView, InputTipTemplate, IntroStepTemplate, StepTemplate, StepView, View, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

InputItemView = require('../views/InputItemView');

StepTemplate = require('../templates/steps/StepTemplate.hbs');

IntroStepTemplate = require('../templates/steps/IntroStepTemplate.hbs');

InputTipTemplate = require('../templates/steps/info/InputTipTemplate.hbs');

CourseTipTemplate = require('../templates/steps/info/CourseTipTemplate.hbs');

WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs');

CourseInfoData = require('../data/WizardCourseInfo');

AssignmentData = require('../data/WizardAssignmentData');

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

  StepView.prototype.stepInputData = WizardStepInputs;

  StepView.prototype.hasUserAnswered = false;

  StepView.prototype.hasUserVisited = false;

  StepView.prototype.events = {
    'click input': 'inputHandler',
    'click #publish': 'publishHandler',
    'click .step-info-tip__close': 'hideTips',
    'click #beginButton': 'beginHandler',
    'click .step-info .step-info-section--accordian': 'accordianClickHandler',
    'click .edit-button': 'editClickHandler'
  };

  StepView.prototype.editClickHandler = function(e) {
    var stepId;
    stepId = $(e.currentTarget).attr('data-step-id');
    if (stepId) {
      return Backbone.Mediator.publish('step:edit', stepId);
    }
  };

  StepView.prototype.accordianClickHandler = function(e) {
    var $target;
    $target = $(e.currentTarget);
    if ($target.hasClass('open')) {
      return $target.removeClass('open');
    } else if ($('.step-info-section--accordian').hasClass('open')) {
      this.$el.find('.step-info').find('.step-info-section--accordian').removeClass('open');
      return setTimeout((function(_this) {
        return function() {
          return $target.addClass('open');
        };
      })(this), 500);
    } else {
      return $target.addClass('open');
    }
  };

  StepView.prototype.publishHandler = function() {
    return Backbone.Mediator.publish('wizard:publish');
  };

  StepView.prototype.render = function() {
    var $dates;
    this.tipVisible = false;
    if (this.model.get('stepNumber') === 1) {
      this.$el.addClass('step--first').html(this.introTemplate(this.model.attributes));
      $dates = $(this.datesModule());
      this.$el.find('.step-form-dates').html($dates);
    } else {
      this.$el.html(this.template(this.model.attributes));
    }
    this.inputSection = this.$el.find('.step-form-inner');
    this.$tipSection = this.$el.find('.step-info-tips');
    this.inputData = this.stepInputData[this.model.attributes.id] || [];
    _.each(this.inputData, (function(_this) {
      return function(input, index) {
        var $tipEl, infoData, inputView, tip;
        if (!input.type) {
          return;
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
    return this.afterRender();
  };

  StepView.prototype.afterRender = function() {
    this.$inputContainers = this.$el.find('.custom-input');
    return this;
  };

  StepView.prototype.hide = function() {
    this.$el.hide();
    return this;
  };

  StepView.prototype.show = function() {
    this.$el.show();
    this.hasUserVisited = true;
    return this;
  };

  StepView.prototype.beginHandler = function() {
    return Backbone.Mediator.publish('step:next');
  };

  StepView.prototype.updateUserAnswer = function(bool) {
    this.hasUserAnswered = bool;
    Backbone.Mediator.publish('step:answered', this);
    return this;
  };

  StepView.prototype.updateAnswer = function(id, value) {
    var inputType, out;
    inputType = WizardStepInputs[this.model.id][id].type;
    out = {
      type: inputType,
      id: id,
      value: value
    };
    if (inputType === 'radioBox' || inputType === 'checkbox') {
      if (value === 'on') {
        WizardStepInputs[this.model.id][id].selected = true;
      } else {
        WizardStepInputs[this.model.id][id].selected = false;
      }
    } else if (inputType === 'text') {
      WizardStepInputs[this.model.id][id].value = value;
    }
    return this;
  };

  StepView.prototype.inputHandler = function(e) {
    var $exclusive, $parent, $target;
    $target = $(e.currentTarget);
    $parent = $target.parents('.custom-input');
    if ($parent.data('exclusive')) {
      if ($target.is(':checked')) {
        return this.$inputContainers.not($parent).addClass('disabled');
      } else {
        this.$inputContainers.find('input').not($target).prop('checked', false);
        return this.$inputContainers.not($parent).removeClass('disabled');
      }
    } else {
      $exclusive = this.$el.find('[data-exclusive="true"]');
      if ($exclusive.length > 0) {
        if ($target.is(':checked')) {
          return $exclusive.addClass('disabled');
        } else {
          return $exclusive.removeClass('disabled');
        }
      }
    }
  };

  StepView.prototype.hideTips = function(e) {
    $('.step-info-tip').removeClass('visible');
    return $('.custom-input-wrapper').removeClass('selected');
  };

  return StepView;

})(View);



},{"../App":5,"../data/WizardAssignmentData":6,"../data/WizardCourseInfo":8,"../data/WizardStepInputs":9,"../templates/steps/IntroStepTemplate.hbs":18,"../templates/steps/StepTemplate.hbs":19,"../templates/steps/info/CourseTipTemplate.hbs":20,"../templates/steps/info/InputTipTemplate.hbs":21,"../templates/steps/modules/WikiDatesModule.hbs":23,"../views/InputItemView":28,"../views/supers/View":34}],33:[function(require,module,exports){
var AssignmentData, InputItemTemplate, InputItemView, View, WizardStepInputs,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('./View');

InputItemTemplate = require('../../templates/steps/inputs/InputItemTemplate.hbs');

AssignmentData = require('../../data/WizardAssignmentData');

WizardStepInputs = require('../../data/WizardStepInputs');

module.exports = InputItemView = (function(_super) {
  __extends(InputItemView, _super);

  function InputItemView() {
    return InputItemView.__super__.constructor.apply(this, arguments);
  }

  InputItemView.prototype.template = InputItemTemplate;

  InputItemView.prototype.className = 'custom-input-wrapper';

  InputItemView.prototype.hoverTime = 500;

  InputItemView.prototype.events = {
    'change input': 'itemChangeHandler',
    'keyup input[type="text"]': 'itemChangeHandler',
    'click .custom-input--checkbox label span': 'checkButtonClickHandler',
    'mouseover': 'mouseoverHandler',
    'mouseenter label span': 'hideShowTooltip',
    'mouseout': 'mouseoutHandler',
    'click .check-button': 'checkButtonClickHandler',
    'click .custom-input--radiobox .radio-button': 'radioBoxClickHandler',
    'click .custom-input--radio-group .radio-button': 'radioButtonClickHandler',
    'focus .custom-input--text input': 'onFocus',
    'blur .custom-input--text input': 'onBlur'
  };

  InputItemView.prototype.radioButtonClickHandler = function(e) {
    var $inputEl, $otherInputs, $otherRadios, $parentEl, $parentGroup, $target;
    e.preventDefault();
    $target = $(e.currentTarget);
    $parentGroup = $target.parents('.custom-input-wrapper');
    $parentEl = $target.parents('.custom-input--radio');
    $inputEl = $parentEl.find('input[type="radio"]');
    if ($parentEl.hasClass('checked')) {
      return false;
    } else {
      $otherRadios = $parentGroup.find('.custom-input--radio');
      $otherRadios.removeClass('checked');
      $otherInputs = $otherRadios.find('input[type="text"]');
      $otherInputs.prop('checked', false);
      $inputEl.prop('checked', true);
      $parentEl.addClass('checked');
    }
    return Backbone.Mediator.publish('tips:hide');
  };

  InputItemView.prototype.radioBoxClickHandler = function(e) {
    var $otherRadios, $parent;
    e.preventDefault();
    $otherRadios = this.$el.parents('.step-form-inner').find('.custom-input--radiobox');
    $otherRadios.removeClass('checked').find('input').val('off').trigger('change');
    $parent = this.$el.find('.custom-input--radiobox').addClass('checked');
    if ($parent.hasClass('checked')) {
      this.$inputEl.prop('checked', true);
      this.$inputEl.val('on');
      this.$inputEl.trigger('change');
    } else {
      this.$inputEl.prop('checked', false);
      this.$inputEl.val('off');
      this.$inputEl.trigger('change');
    }
    return Backbone.Mediator.publish('tips:hide');
  };

  InputItemView.prototype.checkButtonClickHandler = function(e) {
    var $parent;
    e.preventDefault();
    if (this.$el.find('.custom-input--radiobox').length > 0) {
      return this.radioBoxClickHandler(e);
    }
    $parent = this.$el.find('.custom-input--checkbox').toggleClass('checked');
    if ($parent.hasClass('checked')) {
      this.$inputEl.prop('checked', true);
      this.$inputEl.val('on');
      this.$inputEl.trigger('change');
    } else {
      this.$inputEl.prop('checked', false);
      this.$inputEl.val('off');
      this.$inputEl.trigger('change');
    }
    return Backbone.Mediator.publish('tips:hide');
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
    if (this.hasInfo && this.parentStep.tipVisible === false) {
      this.$el.addClass('selected');
      this.parentStep.tipVisible = true;
      this.parentStep.$el.find(".step-info-tip").removeClass('visible');
      return this.parentStep.$el.find(".step-info-tip[data-item-index='" + this.itemIndex + "']").addClass('visible');
    }
  };

  InputItemView.prototype.hideTooltip = function() {
    if (this.hasInfo) {
      this.$el.removeClass('selected');
      this.parentStep.tipVisible = false;
      return this.parentStep.$el.find(".step-info-tip").removeClass('visible');
    }
  };

  InputItemView.prototype.hideShowTooltip = function() {
    $('.custom-input-wrapper').removeClass('selected');
    this.parentStep.tipVisible = false;
    this.parentStep.$el.find(".step-info-tip").removeClass('visible');
    return this.showTooltip();
  };

  InputItemView.prototype.labelClickHandler = function(e) {
    return false;
  };

  InputItemView.prototype.itemChangeHandler = function(e) {
    var inputId, value;
    value = $(e.currentTarget).val();
    inputId = $(e.currentTarget).attr('id');
    this.parentStep.updateAnswer(inputId, value);
    return this.parentStep.updateUserAnswer(true);
  };

  InputItemView.prototype.afterRender = function() {
    this.$inputEl = this.$el.find('input');
    if (this.model.attributes.value !== '' && this.model.attributes.type === 'text') {
      this.$el.addClass('open');
    }
    this.hoverTimer = null;
    return this.isHovering = false;
  };

  InputItemView.prototype.hasInfo = function() {
    return $el.hasClass('has-info');
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
    var inputTypeObject;
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
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    } else if (this.inputType === 'radioBox') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    }
  };

  return InputItemView;

})(View);



},{"../../data/WizardAssignmentData":6,"../../data/WizardStepInputs":9,"../../templates/steps/inputs/InputItemTemplate.hbs":22,"./View":34}],34:[function(require,module,exports){
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



},{"../../helpers/ViewHelper":10}]},{},[11])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ291cnNlSW5mby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21haW4uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3JvdXRlcnMvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvT3V0cHV0VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9XaWtpT3V0cHV0VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSG9tZVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSW5wdXRJdGVtVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3V0cHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwTmF2Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvSW5wdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9WaWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBOztBQ0lBLElB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QUE7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUFBQTtBQUlFLHlCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQTtBQUFBOzs7S0FBQTs7QUFBQSxpQkFPQSxRQUFBLEdBQVUsU0FBQSxHQUFBLENBUFYsQ0FBQTs7QUFBQSxpQkFZQSxhQUFBLEdBQWUsU0FBQSxHQUFBLENBWmYsQ0FBQTs7QUFjQTtBQUFBOzs7S0FkQTs7QUFBQSxpQkFxQkEsVUFBQSxHQUFZLFNBQUEsR0FBQTtXQUNWLElBQUMsQ0FBQSxNQUFELEdBQVUsQ0FBQyxDQUFDLElBQUYsQ0FBUSxJQUFDLENBQUEsTUFBVCxFQUFpQixJQUFqQixFQURBO0VBQUEsQ0FyQlosQ0FBQTs7QUFBQSxpQkEyQkEsTUFBQSxHQUFRLFNBQUEsR0FBQTtBQUNOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVcsSUFBQyxDQUFBLFFBQUQsQ0FBVyxJQUFDLENBQUEsYUFBRCxDQUFBLENBQVgsQ0FBWCxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxXQUFELENBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTE07RUFBQSxDQTNCUixDQUFBOztBQUFBLGlCQXFDQSxXQUFBLEdBQWEsU0FBQSxHQUFBLENBckNiLENBQUE7O0FBdUNBO0FBQUE7OztLQXZDQTs7QUEyQ0E7QUFBQTs7O0tBM0NBOztBQStDQTtBQUFBOzs7S0EvQ0E7O2NBQUE7O0dBRmlCLFFBQVEsQ0FBQyxLQUY1QixDQUFBOztBQUFBLE1BdURNLENBQUMsT0FBUCxHQUFpQixJQXZEakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcycpLmNyZWF0ZSgpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzJykuYXR0YWNoKGV4cG9ydHMpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMnKS5hdHRhY2goZXhwb3J0cykiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCBERVNJR04gV0laQVJEXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbkFwcGxpY2F0aW9uID0gXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgICMgQXBwIERhdGFcbiAgICBBcHBEYXRhID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbnRlbnQnKVxuXG4gICAgQGRhdGEgPSBBcHBEYXRhXG5cblxuICAgICMgSW1wb3J0IHZpZXdzXG4gICAgSG9tZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0hvbWVWaWV3JylcblxuICAgIExvZ2luVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvTG9naW5WaWV3JylcblxuICAgIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVycy9Sb3V0ZXInKVxuXG4gICAgSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbiAgICBPdXRwdXRWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9PdXRwdXRWaWV3JylcblxuXG4gICAgIyBJbml0aWFsaXplIHZpZXdzXG4gICAgQGhvbWVWaWV3ID0gbmV3IEhvbWVWaWV3KClcblxuICAgIEBsb2dpblZpZXcgPSBuZXcgTG9naW5WaWV3KClcblxuICAgIEBpbnB1dEl0ZW1WaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoKVxuXG4gICAgQG91dHB1dFZpZXcgPSBuZXcgT3V0cHV0VmlldygpXG5cbiAgICBAcm91dGVyID0gbmV3IFJvdXRlcigpXG5cbiAgICBcbiAgICBcbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb24iLCJtb2R1bGUuZXhwb3J0cyA9IFdpemFyZEFzc2lnbm1lbnREYXRhID0gW10iLCJXaXphcmRDb250ZW50ID0gW1xuICB7XG4gICAgaWQ6IFwiaW50cm9cIlxuICAgIHRpdGxlOiAnV2VsY29tZSB0byB0aGUgV2lraXBlZGlhIEFzc2lnbm1lbnQgV2l6YXJkISdcbiAgICBsb2dpbl9pbnN0cnVjdGlvbnM6ICdDbGljayBMb2dpbiB3aXRoIFdpa2lNZWRpYSB0byBnZXQgc3RhcnRlZCdcbiAgICBpbnN0cnVjdGlvbnM6ICdTaW5jZSBXaWtpcGVkaWEgYmVnYW4gaW4gMjAwMSwgcHJvZmVzc29ycyBhcm91bmQgdGhlIHdvcmxkIGhhdmUgaW50ZWdyYXRlZCB0aGUgZnJlZSBlbmN5Y2xvcGVkaWEgdGhhdCBhbnlvbmUgY2FuIGVkaXQgaW50byB0aGVpciBjdXJyaWN1bHVtLjxici8+PGJyLz5UaGlzIGludGVyYWN0aXZlIHdpemFyZCB3aWxsIHRha2UgeW91IHRocm91Z2ggdGhlIHJlcXVpcmVkIHN0ZXBzIHRvIGNyZWF0ZSBhIGN1c3RvbSBhc3NpZ25tZW50IGZvciB5b3VyIGNsYXNzLiBQbGVhc2UgYmVnaW4gYnkgZmlsbGluZyBpbiB0aGUgZm9sbG93aW5nIGZpZWxkczonXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgICBsYWJlbDogJ1RlYWNoZXIgTmFtZSdcbiAgICAgICAgaWQ6ICd0ZWFjaGVyJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICAgIGlkOiAnc2Nob29sJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgICBsYWJlbDogJ1N1YmplY3QnXG4gICAgICAgIGlkOiAnc3ViamVjdCdcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAndGV4dCdcbiAgICAgICAgbGFiZWw6ICdBcHByb3hpbWF0ZSBudW1iZXIgb2Ygc3R1ZGVudHMnXG4gICAgICAgIGlkOiAnc3R1ZGVudHMnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICBdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIFxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwiYXNzaWdubWVudF9zZWxlY3Rpb25cIlxuICAgIHRpdGxlOiAnQXNzaWdubWVudCB0eXBlIHNlbGVjdGlvbidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBhc3NpZ25tZW50IHNlbGVjdGlvbnMnXG4gICAgZm9ybVRpdGxlOiAnQXZhaWxhYmxlIGFzc2lnbm1lbnRzJ1xuICAgIGluc3RydWN0aW9uczogJ0RlcGVuZGluZyBvbiB0aGUgbGVhcm5pbmcgZ29hbHMgeW91IGhhdmUgZm9yIHlvdXIgY291cnNlIGFuZCBob3cgbXVjaCB0aW1lIHlvdSB3YW50IHRvIGRldm90ZSB0byB5b3VyIFdpa2lwZWRpYSBwcm9qZWN0LCB0aGVyZSBhcmUgbWFueSBlZmZlY3RpdmUgd2F5cyB0byB1c2UgV2lraXBlZGlhIGluIHlvdXIgY291cnNlLiAnXG4gICAgaW5wdXRzOiBbXG4gICAgICB7IFxuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICAgIGV4Y2x1c2l2ZTogdHJ1ZVxuICAgICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICB9XG4gICAgICB7IFxuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnZXZhbHVhdGUnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0V2YWx1YXRlIGFydGljbGVzJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIH1cbiAgICAgIHsgXG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICB9XG4gICAgICB7IFxuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnc291cmNlY2VudGVyZWQnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ1NvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnMnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgfVxuICAgICAgeyBcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2NvcHllZGl0J1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdDb3B5L2VkaXQgYXJ0aWNsZXMnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgfVxuICAgICAgeyBcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2ZpbmRmaXgnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0ZpbmQgYW5kIGZpeCBlcnJvcnMnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgfSAgXG4gICAgICB7IFxuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAncGxhZ2lhcmlzbSdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIH0gICAgIFxuICAgIF1cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5FeHBlcmllbmNlZCBpbnN0cnVjdG9ycyBzYXkgaXQgaXMgY3J1Y2lhbCBmb3Igc3R1ZGVudHMgd2hvIGFyZSBnb2luZyB0byBiZSBlZGl0aW5nIFdpa2lwZWRpYSB0byBiZWNvbWUgY29tZm9ydGFibGUgbm90IG9ubHkgd2l0aCB0aGUgbWFya3VwLCBidXQgYWxzbyB0aGUgY29tbXVuaXR5LiBJbnRyb2R1Y2luZyB0aGUgV2lraXBlZGlhIHByb2plY3QgZWFybHkgaW4gdGhlIHRlcm0gYW5kIHJlcXVpcmluZyBtaWxlc3RvbmVzIHRocm91Z2hvdXQgdGhlIHRlcm0gd2lsbCBhY2NsaW1hdGUgc3R1ZGVudHMgdG8gdGhlIHNpdGUgYW5kIGhlYWQgb2ZmIHByb2NyYXN0aW5hdGlvbi48L3A+J1xuICAgICAgICAgICc8cD5UbyBtYWtlIHRoZSB0aGUgbW9zdCBvZiB5b3VyIFdpa2lwZWRpYSBwcm9qZWN0LCB0cnkgdG8gaW50ZWdyYXRlIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnQgd2l0aCB0aGUgY291cnNlIHRoZW1lcy4gRW5nYWdlIHlvdXIgc3R1ZGVudHMgd2l0aCBxdWVzdGlvbnMgb2YgbWVkaWEgbGl0ZXJhY3kgYW5kIGtub3dsZWRnZSBjb25zdHJ1Y3Rpb24gdGhyb3VnaG91dCB5b3VyIGNvdXJzZS48L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJsZWFybmluZ19lc3NlbnRpYWxzXCJcbiAgICB0aXRsZTogJ0xlYXJuaW5nIFdpa2kgRXNzZW50aWFscydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lIG9yIG1vcmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHdpa2kgZXNzZW50aWFscydcbiAgICBpbnN0cnVjdGlvbnM6ICdUbyBnZXQgc3RhcnRlZCwgeW91XFwnbGwgd2FudCB0byBpbnRyb2R1Y2UgeW91ciBzdHVkZW50cyB0byB0aGUgYmFzaWMgcnVsZXMgb2Ygd3JpdGluZyBXaWtpcGVkaWEgYXJ0aWNsZXMgYW5kIHdvcmtpbmcgd2l0aCB0aGUgV2lraXBlZGlhIGNvbW11bml0eS4gQXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIGFjY291bnRzIGFuZCB0aGVuIGNvbXBsZXRlIHRoZSBvbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzLiAnXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgbGFiZWw6ICdDcmVhdGUgVXNlciBBY2NvdW50J1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdlbnJvbGwnXG4gICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBDb3Vyc2UnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdDb21wbGV0ZSBPbmxpbmUgVHJhaW5pbmcnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2ludHJvZHVjZV9hbWJhc3NhZG9ycydcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnSW50cm9kdWNlIFdpa2lwZWRpYSBBbWJhc3NhZG9ycyBJbnZvbHZlZCdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnaW5jbHVkZV9jb21wbGV0aW9uJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgfVxuICAgIF1cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPlRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgY292ZXJzIHNvbWUgb2YgdGhlIHdheXMgdGhleSBjYW4gZmluZCBoZWxwIGFzIHRoZXkgZ2V0IHN0YXJ0ZWQuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCB0aGF0IHlvdSBjYW4gdXNlIHRvIHZlcmlmeSB0aGF0IHN0dWRlbnRzIGNvbXBsZXRlZCB0aGUgdHJhaW5pbmc8L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQXNzaWdubWVudCBtaWxlc3RvbmVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkNyZWF0ZSBhIHVzZXIgYWNjb3VudCBhbmQgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZTwvcD4nXG4gICAgICAgICAgJzxwPkNvbXBsZXRlIHRoZSBvbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzLiBEdXJpbmcgdGhpcyB0cmFpbmluZywgeW91IHdpbGwgbWFrZSBlZGl0cyBpbiBhIHNhbmRib3ggYW5kIGxlYXJuIHRoZSBiYXNpYyBydWxlcyBvZiBXaWtpcGVkaWEuPC9wPidcbiAgICAgICAgICAnPHA+VG8gcHJhY3RpY2UgZWRpdGluZyBhbmQgY29tbXVuaWNhdGluZyBvbiBXaWtpcGVkaWEsIGludHJvZHVjZSB5b3Vyc2VsZiB0byBhbnkgV2lraXBlZGlhbnMgaGVscGluZyB5b3VyIGNsYXNzIChzdWNoIGFzIGEgV2lraXBlZGlhIEFtYmFzc2Fkb3IpLCBhbmQgbGVhdmUgYSBtZXNzYWdlIGZvciBhIGNsYXNzbWF0ZSBvbiB0aGVpciB1c2VyIHRhbGsgcGFnZS48L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgIHRpdGxlOiAnR2V0dGluZyBTdGFydGVkIHdpdGggRWRpdGluZydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBlZGl0aW5nJ1xuICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIHJpZ2h0IGF3YXkuIFRoYXQgd2F5LCB0aGV5IGJlY29tZSBmYW1pbGlhciB3aXRoIFdpa2lwZWRpYSdzIG1hcmt1cCAoXFxcIndpa2lzeW50YXhcXFwiLCBcXFwid2lraW1hcmt1cFxcXCIsIG9yIFxcXCJ3aWtpY29kZVxcXCIpIGFuZCB0aGUgbWVjaGFuaWNzIG9mIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gdGhlIHNpdGUuIFdlIHJlY29tbWVuZCBhc3NpZ25pbmcgYSBmZXcgYmFzaWMgV2lraXBlZGlhIHRhc2tzIGVhcmx5IG9uLlwiXG4gICAgZm9ybVRpdGxlOiAnV2hpY2ggYmFzaWMgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSBpbiB5b3VyIGNvdXJzZT8nXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICBsYWJlbDogJ0NyaXRpcXVlIGFuIEFydGljbGUnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2FkZF90b19hcnRpY2xlJ1xuICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICBsYWJlbDogJ0FkZCB0byBhbiBBcnRpY2xlJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjb3B5X2VkaXRfYXJ0aWNsZSdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnQ29weS1FZGl0IGFuIEFydGljbGUnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2lsbHVzdHJhdGVfYXJ0aWNsZSdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnSWxsdXN0cmF0ZSBhbiBBcnRpY2xlJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgdGl0bGU6ICdDaG9vc2luZyBBcnRpY2xlcydcbiAgICBmb3JtVGl0bGU6ICdUaGVyZSBhcmUgdHdvIHJlY29tbWVuZGVkIG9wdGlvbnMgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBjaG9vc2luZyBhcnRpY2xlcydcbiAgICBpbnN0cnVjdGlvbnM6ICdDaG9vc2luZyB0aGUgcmlnaHQgKG9yIHdyb25nKSBhcnRpY2xlcyB0byB3b3JrIG9uIGNhbiBtYWtlIChvciBicmVhaykgYSBXaWtpcGVkaWEgd3JpdGluZyBhc3NpZ25tZW50LidcbiAgICBpbnB1dHM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3JhZGlvJ1xuICAgICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgICBsYWJlbDogJydcbiAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgICAgICBsYWJlbDogJ0luc3RydWN0b3IgUHJlcGFyZXMgYSBMaXN0IHdpdGggQXBwcm9wcmlhdGUgQXJ0aWNsZXMnXG4gICAgICAgICAgICB2YWx1ZTogJ3ByZXBhcmVfbGlzdCdcbiAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgICAgICBsYWJlbDogJ1N0dWRlbnRzIEV4cGxvcmUgYW5kIFByZXBhcmUgYSBMaXN0IG9mIEFydGljbGVzJ1xuICAgICAgICAgICAgdmFsdWU6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPlNvbWUgYXJ0aWNsZXMgbWF5IGluaXRpYWxseSBsb29rIGVhc3kgdG8gaW1wcm92ZSwgYnV0IHF1YWxpdHkgcmVmZXJlbmNlcyB0byBleHBhbmQgdGhlbSBtYXkgYmUgZGlmZmljdWx0IHRvIGZpbmQuIEZpbmRpbmcgdG9waWNzIHdpdGggdGhlIHJpZ2h0IGJhbGFuY2UgYmV0d2VlbiBwb29yIFdpa2lwZWRpYSBjb3ZlcmFnZSBhbmQgYXZhaWxhYmxlIGxpdGVyYXR1cmUgZnJvbSB3aGljaCB0byBleHBhbmQgdGhhdCBjb3ZlcmFnZSBjYW4gYmUgdHJpY2t5LiBIZXJlIGFyZSBzb21lIGd1aWRlbGluZXMgdG8ga2VlcCBpbiBtaW5kIHdoZW4gc2VsZWN0aW5nIGFydGljbGVzIGZvciBpbXByb3ZlbWVudC48L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBhY2NvcmRpYW46IGZhbHNlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkFwcGx5aW5nIHlvdXIgb3duIGV4cGVydGlzZSB0byBXaWtpcGVkaWHigJlzIGNvdmVyYWdlIG9mIHlvdXIgZmllbGQgaXMgdGhlIGtleSB0byBhIHN1Y2Nlc3NmdWwgYXNzaWdubWVudC4gWW91IHVuZGVyc3RhbmQgdGhlIGJyb2FkZXIgaW50ZWxsZWN0dWFsIGNvbnRleHQgd2hlcmUgaW5kaXZpZHVhbCB0b3BpY3MgZml0IGluLCB5b3UgY2FuIHJlY29nbml6ZSB3aGVyZSBXaWtpcGVkaWEgZmFsbHMgc2hvcnQsIHlvdSBrbm934oCUb3Iga25vdyBob3cgdG8gZmluZOKAlHRoZSByZWxldmFudCBsaXRlcmF0dXJlLCBhbmQgeW91IGtub3cgd2hhdCB0b3BpY3MgeW91ciBzdHVkZW50cyBzaG91bGQgYmUgYWJsZSB0byBoYW5kbGUuIFlvdXIgZ3VpZGFuY2Ugb24gYXJ0aWNsZSBjaG9pY2UgYW5kIHNvdXJjaW5nIGlzIGNyaXRpY2FsIGZvciBib3RoIHlvdXIgc3R1ZGVudHPigJkgc3VjY2VzcyBhbmQgdGhlIGltcHJvdmVtZW50IG9mIFdpa2lwZWRpYS48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5BcnRpY2xlcyB0aGF0IGFyZSBcXFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVxcXCIgZm9yIG5ld2NvbWVycyB1c3VhbGx5IGludm9sdmUgYSBsYWNrIG9mIGFwcHJvcHJpYXRlIHJlc2VhcmNoIG1hdGVyaWFsLCBoaWdobHkgY29udHJvdmVyc2lhbCB0b3BpY3MgdGhhdCBtYXkgYWxyZWFkeSBiZSB3ZWxsIGRldmVsb3BlZCwgYnJvYWQgc3ViamVjdHMsIG9yIHRvcGljcyBmb3Igd2hpY2ggaXQgaXMgZGlmZmljdWx0IHRvIGRlbW9uc3RyYXRlIG5vdGFiaWxpdHkuPC9wPlwiXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChlLmcuLCBHbG9iYWwgV2FybWluZywgQWJvcnRpb24sIFNjaWVudG9sb2d5LCBldGMuKS4gWW91IG1heSBiZSBtb3JlIHN1Y2Nlc3NmdWwgc3RhcnRpbmcgYSBzdWItYXJ0aWNsZSBvbiB0aGUgdG9waWMgaW5zdGVhZC48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICA8bGk+QXZvaWQgd29ya2luZyBvbiBzb21ldGhpbmcgd2l0aCBzY2FyY2UgbGl0ZXJhdHVyZS4gV2lraXBlZGlhIGFydGljbGVzIGNpdGUgc2Vjb25kYXJ5IGxpdGVyYXR1cmUgc291cmNlcywgc28gaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSBlbm91Z2ggc291cmNlcyBmb3IgdmVyaWZpY2F0aW9uIGFuZCB0byBwcm92aWRlIGEgbmV1dHJhbCBwb2ludCBvZiB2aWV3LjwvbGk+XG4gICAgICAgICAgICA8bGk+RG9uJ3Qgc3RhcnQgYXJ0aWNsZXMgd2l0aCB0aXRsZXMgdGhhdCBpbXBseSBhbiBhcmd1bWVudCBvciBlc3NheS1saWtlIGFwcHJvYWNoIChlLmcuLCBUaGUgRWZmZWN0cyBUaGF0IFRoZSBSZWNlbnQgU3ViLVByaW1lIE1vcnRnYWdlIENyaXNpcyBoYXMgaGFkIG9uIHRoZSBVUyBhbmQgR2xvYmFsIEVjb25vbWljcykuIFRoZXNlIHR5cGUgb2YgdGl0bGVzLCBhbmQgbW9zdCBsaWtlbHkgdGhlIGNvbnRlbnQgdG9vLCBtYXkgbm90IGJlIGFwcHJvcHJpYXRlIGZvciBhbiBlbmN5Y2xvcGVkaWEuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMS0yIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gUmVsZXZhbnQgV2lraVByb2plY3QgcGFnZXMgY2FuIHByb3ZpZGUgYSBsaXN0IG9mIHN0dWJzIHRoYXQgbmVlZCBpbXByb3ZlbWVudC48L2xpPlxuICAgICAgICAgICAgPGxpPkJlZm9yZSBjcmVhdGluZyBhIG5ldyBhcnRpY2xlLCBzZWFyY2ggcmVsYXRlZCB0b3BpY3Mgb24gV2lraXBlZGlhIHRvIG1ha2Ugc3VyZSB5b3VyIHRvcGljIGlzbid0IGFscmVhZHkgY292ZXJlZCBlbHNld2hlcmUuIE9mdGVuLCBhbiBhcnRpY2xlIG1heSBleGlzdCB1bmRlciBhbm90aGVyIG5hbWUsIG9yIHRoZSB0b3BpYyBtYXkgYmUgY292ZXJlZCBhcyBhIHN1YnNlY3Rpb24gb2YgYSBicm9hZGVyIGFydGljbGUuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIFxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwicmVzZWFyY2hfcGxhbm5pbmdcIlxuICAgIHRpdGxlOiAnUmVzZWFyY2ggJiBQbGFubmluZydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCByZXNlYXJjaCAmIHBsYW5uaW5nJ1xuICAgIGluc3RydWN0aW9uczogIFwiU3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGVkIGZvciBXaWtpcGVkaWEuIFRoYXQncyB3aHkgd2UgcmVjb21tZW5kIGFza2luZyBzdHVkZW50cyB0byBwdXQgdG9nZXRoZXIgYSBiaWJsaW9ncmFwaHkgb2YgbWF0ZXJpYWxzIHRoZXkgd2FudCB0byB1c2UgaW4gZWRpdGluZyB0aGUgYXJ0aWNsZSwgd2hpY2ggY2FuIHRoZW4gYmUgYXNzZXNzZWQgYnkgeW91IGFuZCBvdGhlciBXaWtpcGVkaWFucy5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5UaGVuLCBzdHVkZW50cyBzaG91bGQgcHJvcG9zZSBvdXRsaW5lcyBmb3IgdGhlaXIgYXJ0aWNsZXMuIFRoaXMgY2FuIGJlIGEgdHJhZGl0aW9uYWwgb3V0bGluZSwgaW4gd2hpY2ggc3R1ZGVudHMgaWRlbnRpZnkgd2hpY2ggc2VjdGlvbnMgdGhlaXIgYXJ0aWNsZXMgd2lsbCBoYXZlIGFuZCB3aGljaCBhc3BlY3RzIG9mIHRoZSB0b3BpYyB3aWxsIGJlIGNvdmVyZWQgaW4gZWFjaCBzZWN0aW9uLiBBbHRlcm5hdGl2ZWx5LCBzdHVkZW50cyBjYW4gZGV2ZWxvcCBlYWNoIG91dGxpbmUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uIOKAlCB0aGUgdW50aXRsZWQgc2VjdGlvbiBhdCB0aGUgYmVnaW5uaW5nIG9mIGFuIGFydGljbGUgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcHJvdmlkZSBhIGNvbmNpc2Ugc3VtbWFyeSBvZiBpdHMgY29udGVudC4gV291bGQgeW91IGxpa2UgeW91ciBzdHVkZW50cyB0byBjcmVhdGUgdHJhZGl0aW9uYWwgb3V0bGluZXMsIG9yIGNvbXBvc2Ugb3V0bGluZXMgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEtc3R5bGUgbGVhZCBzZWN0aW9uPzwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAncmFkaW8nXG4gICAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICAgIGxhYmVsOiAnJ1xuICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdyZXNlYXJjaF9wbGFubmluZydcbiAgICAgICAgICAgIGxhYmVsOiAnQ3JlYXRlIGFuIEFydGljbGUgT3V0bGluZSdcbiAgICAgICAgICAgIHZhbHVlOiAnY3JlYXRlX291dGxpbmUnXG4gICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdyZXNlYXJjaF9wbGFubmluZydcbiAgICAgICAgICAgIGxhYmVsOiAnV3JpdGUgdGhlIEFydGljbGUgTGVhZCBTZWN0aW9uJ1xuICAgICAgICAgICAgdmFsdWU6ICd3cml0ZV9sZWFkJ1xuICAgICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJkcmFmdHNfbWFpbnNwYWNlXCJcbiAgICB0aXRsZTogJ0RyYWZ0cyAmIE1haW5zcGFjZSdcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgJiBtYWluc3BhY2UnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3hlcy4gVGhlcmUgYXJlIHByb3MgYW5kIGNvbnMgdG8gZWFjaCBhcHByb2FjaC4nXG4gICAgc2VjdGlvbnM6IFtcbiAgICBdXG4gICAgaW5wdXRzOiBbXG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJwZWVyX2ZlZWRiYWNrXCJcbiAgICB0aXRsZTogJ1BlZXIgRmVlZGJhY2snXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICBmb3JtVGl0bGU6IFwiSG93IE1hbnkgUGVlciBSZXZpZXdzIFNob3VsZCBFYWNoIFN0dWRlbnQgQ29uZHVjdD9cIlxuICAgIGluc3RydWN0aW9uczogXCJDb2xsYWJvcmF0aW9uIGlzIGEgY3JpdGljYWwgZWxlbWVudCBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhLiBGb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5PbmxpbmUgQW1iYXNzYWRvcnMgd2l0aCBhbiBpbnRlcmVzdCBpbiB0aGUgc3R1ZGVudHMnIHRvcGljcyBjYW4gYWxzbyBtYWtlIGdyZWF0IGNvbGxhYm9yYXRvcnMuIEluIG1hbnkgY2FzZXMsIGhvd2V2ZXIsIHRoZXJlIHdpbGwgYmUgbGl0dGxlIHNwb250YW5lb3VzIGVkaXRpbmcgb2Ygc3R1ZGVudHPigJkgYXJ0aWNsZXMgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIHRlcm0uPC9wPlwiXG4gICAgICAgICAgXCI8cD5Gb3J0dW5hdGVseSwgeW91IGhhdmUgYSBjbGFzc3Jvb20gZnVsbCBvZiBwZWVyIHJldmlld2Vycy4gWW91IGNhbiBtYWtlIHRoZSBtb3N0IG9mIHRoaXMgYnkgYXNzaWduaW5nIHN0dWRlbnRzIHRvIHJldmlldyBlYWNoIG90aGVyc+KAmSBhcnRpY2xlcyBzb29uIGFmdGVyIGZ1bGwtbGVuZ3RoIGRyYWZ0cyBhcmUgcG9zdGVkLiBUaGlzIGdpdmVzIHN0dWRlbnRzIHBsZW50eSBvZiB0aW1lIHRvIGFjdCBvbiB0aGUgYWR2aWNlIG9mIHRoZWlyIHBlZXJzLjwvcD5cIlxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAncmFkaW9Hcm91cCdcbiAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgIGxhYmVsOiAnJ1xuICAgICAgICBvcHRpb25zOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgICBsYWJlbDogJzEnXG4gICAgICAgICAgICB2YWx1ZTogJzEnXG4gICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgICBsYWJlbDogJzInXG4gICAgICAgICAgICB2YWx1ZTogJzInXG4gICAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICAgIGxhYmVsOiAnMydcbiAgICAgICAgICAgIHZhbHVlOiAnMydcbiAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICAgIGxhYmVsOiAnNSdcbiAgICAgICAgICAgIHZhbHVlOiAnNSdcbiAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICAgIGxhYmVsOiAnMTAnXG4gICAgICAgICAgICB2YWx1ZTogJzEwJ1xuICAgICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICAgIFxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwic3VwcGxlbWVudGFyeV9hc3NpZ25tZW50c1wiXG4gICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IEFzc2lnbm1lbnRzJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmUgb3IgbW9yZTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBpbnN0cnVjdGlvbnM6IFwiQnkgdGhlIHRpbWUgc3R1ZGVudHMgaGF2ZSBtYWRlIGltcHJvdmVtZW50cyBiYXNlZCBvbiBjbGFzc21hdGVzJyByZXZpZXcgY29tbWVudHMg4oCUIGFuZCBpZGVhbGx5IHN1Z2dlc3Rpb25zIGZyb20geW91IGFzIHdlbGwg4oCUIHN0dWRlbnRzIHNob3VsZCBoYXZlIHByb2R1Y2VkIG5lYXJseSBjb21wbGV0ZSBhcnRpY2xlcy4gTm93IGlzIHRoZSBjaGFuY2UgdG8gZW5jb3VyYWdlIHRoZW0gdG8gd2FkZSBhIGxpdHRsZSBkZWVwZXIgaW50byBXaWtpcGVkaWEgYW5kIGl0cyBub3JtcyBhbmQgY3JpdGVyaWEgZm9yIGdyZWF0IGNvbnRlbnQuIFlvdeKAmWxsIHByb2JhYmx5IGhhdmUgZGlzY3Vzc2VkIG1hbnkgb2YgdGhlIGNvcmUgcHJpbmNpcGxlcyBvZiBXaWtpcGVkaWHigJRhbmQgcmVsYXRlZCBpc3N1ZXMgeW91IHdhbnQgdG8gZm9jdXMgb27igJRidXQgbm93IHRoYXQgdGhleeKAmXZlIGV4cGVyaWVuY2VkIGZpcnN0LWhhbmQgaG93IFdpa2lwZWRpYSB3b3JrcywgdGhpcyBpcyBhIGdvb2QgdGltZSB0byByZXR1cm4gdG8gdG9waWNzIGxpa2UgbmV1dHJhbGl0eSwgbWVkaWEgZmx1ZW5jeSwgYW5kIHRoZSBpbXBhY3QgYW5kIGxpbWl0cyBvZiBXaWtpcGVkaWEuIFwiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkNvbnNpZGVyIGJyaW5naW5nIGluIGEgZ3Vlc3Qgc3BlYWtlciwgaGF2aW5nIGEgcGFuZWwgZGlzY3Vzc2lvbiwgb3Igc2ltcGx5IGhhdmluZyBhbiBvcGVuIGRpc2N1c3Npb24gYW1vbmdzdCB0aGUgY2xhc3MgYWJvdXQgd2hhdCB0aGUgc3R1ZGVudHMgaGF2ZSBkb25lIHNvIGZhciBhbmQgd2h5IChvciB3aGV0aGVyKSBpdCBtYXR0ZXJzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+SW4gYWRkaXRpb24gdG8gdGhlIFdpa2lwZWRpYSBhcnRpY2xlIHdyaXRpbmcgaXRzZWxmLCB5b3UgbWF5IHdhbnQgdG8gdXNlIGEgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50LiBUaGVzZSBhc3NpZ25tZW50cyBjYW4gcmVpbmZvcmNlIGFuZCBkZWVwZW4geW91ciBjb3Vyc2UncyBsZWFybmluZyBvdXRjb21lcywgYW5kIGFsc28gaGVscCB5b3UgdG8gdW5kZXJzdGFuZCBhbmQgZXZhbHVhdGUgdGhlIHN0dWRlbnRzJyBXaWtpcGVkaWEgd29yay4gSGVyZSBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjbGFzc19ibG9nJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdDbGFzcyBCbG9nIG9yIERpc2N1c3Npb24nXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgdGlwSW5mbzogXG4gICAgICAgICAgdGl0bGU6ICdDbGFzcyBibG9nIG9yIGNsYXNzIGRpc2N1c3Npb24nXG4gICAgICAgICAgY29udGVudDogJ01hbnkgaW5zdHJ1Y3RvcnMgYXNrIHN0dWRlbnRzIHRvIGtlZXAgYSBydW5uaW5nIGJsb2cgYWJvdXQgdGhlaXIgZXhwZXJpZW5jZXMuIEdpdmluZyB0aGVtIHByb21wdHMgZXZlcnkgd2VlayBvciBldmVyeSB0d28gd2Vla3MsIHN1Y2ggYXMg4oCcVG8gd2hhdCBleHRlbnQgYXJlIHRoZSBlZGl0b3JzIG9uIFdpa2lwZWRpYSBhIHNlbGYtc2VsZWN0aW5nIGdyb3VwIGFuZCB3aHk/4oCdIHdpbGwgaGVscCB0aGVtIGJlZ2luIHRvIHRoaW5rIGFib3V0IHRoZSBsYXJnZXIgaXNzdWVzIHN1cnJvdW5kaW5nIHRoaXMgb25saW5lIGVuY3ljbG9wZWRpYSBjb21tdW5pdHkuIEl0IHdpbGwgYWxzbyBnaXZlIHlvdSBtYXRlcmlhbCBib3RoIG9uIHRoZSB3aWtpIGFuZCBvZmYgdGhlIHdpa2kgdG8gZ3JhZGUuIElmIHlvdSBoYXZlIHRpbWUgaW4gY2xhc3MsIHRoZXNlIGRpc2N1c3Npb25zIGNhbiBiZSBwYXJ0aWN1bGFybHkgY29uc3RydWN0aXZlIGluIHBlcnNvbi4nXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0luLUNsYXNzIFByZXNlbnRhdGlvbidcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICB0aXBJbmZvOiAgXG4gICAgICAgICAgdGl0bGU6ICdJbi1jbGFzcyBwcmVzZW50YXRpb24gb2YgV2lraXBlZGlhIHdvcmsnXG4gICAgICAgICAgY29udGVudDogXCJFYWNoIHN0dWRlbnQgb3IgZ3JvdXAgcHJlcGFyZXMgYSBzaG9ydCBwcmVzZW50YXRpb24gZm9yIHRoZSBjbGFzcywgZXhwbGFpbmluZyB3aGF0IHRoZXkgd29ya2VkIG9uLCB3aGF0IHdlbnQgd2VsbCBhbmQgd2hhdCBkaWRuJ3QsIGFuZCB3aGF0IHRoZXkgbGVhcm5lZC4gVGhlc2UgcHJlc2VudGF0aW9ucyBjYW4gbWFrZSBleGNlbGxlbnQgZm9kZGVyIGZvciBjbGFzcyBkaXNjdXNzaW9ucyB0byByZWluZm9yY2UgeW91ciBjb3Vyc2UncyBsZWFybmluZyBnb2Fscy5cIlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnZXNzYXknXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ1JlZmxlY3RpdmUgRXNzYXknXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgdGlwSW5mbzogIFxuICAgICAgICAgIHRpdGxlOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgICBjb250ZW50OiBcIkFmdGVyIHRoZSBhc3NpZ25tZW50IGlzIG92ZXIsIGFzayBzdHVkZW50cyB0byB3cml0ZSBhIHNob3J0IHJlZmxlY3RpdmUgZXNzYXkgb24gdGhlaXIgZXhwZXJpZW5jZXMgdXNpbmcgV2lraXBlZGlhLiBUaGlzIHdvcmtzIHdlbGwgZm9yIGJvdGggc2hvcnQgYW5kIGxvbmcgV2lraXBlZGlhIHByb2plY3RzLiBBbiBpbnRlcmVzdGluZyBpdGVyYXRpb24gb2YgdGhpcyBpcyB0byBoYXZlIHN0dWRlbnRzIHdyaXRlIGEgc2hvcnQgdmVyc2lvbiBvZiB0aGUgZXNzYXkgYmVmb3JlIHRoZXkgYmVnaW4gZWRpdGluZyBXaWtpcGVkaWEsIG91dGxpbmluZyB0aGVpciBleHBlY3RhdGlvbnMsIGFuZCB0aGVuIGhhdmUgdGhlbSByZWZsZWN0IG9uIHdoZXRoZXIgb3Igbm90IHRob3NlIGV4cGVjdGF0aW9ucyB3ZXJlIG1ldCBhZnRlciB0aGV5IGhhdmUgY29tcGxldGVkIHRoZSBhc3NpZ25tZW50LlwiXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdwb3J0Zm9saW8nXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ1dpa2lwZWRpYSBQb3J0Zm9saW8nXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgdGlwSW5mbzogIFxuICAgICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIFBvcnRmb2xpbydcbiAgICAgICAgICBjb250ZW50OiBcIlN0dWRlbnRzIG9yZ2FuaXplIHRoZWlyIFdpa2lwZWRpYSB3b3JrIGludG8gYSBwb3J0Zm9saW8sIGluY2x1ZGluZyBhIG5hcnJhdGl2ZSBvZiB0aGUgY29udHJpYnV0aW9ucyB0aGV5IG1hZGUg4oCUIGFuZCBob3cgdGhleSB3ZXJlIHJlY2VpdmVkLCBhbmQgcG9zc2libHkgY2hhbmdlZCwgYnkgb3RoZXIgV2lraXBlZGlhbnMg4oCUIGFuZCBsaW5rcyB0byB0aGVpciBrZXkgZWRpdHMuIENvbXBvc2luZyB0aGlzIHBvcnRmb2xpbyB3aWxsIGhlbHAgc3R1ZGVudHMgdGhpbmsgbW9yZSBkZWVwbHkgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2VzLCBhbmQgYWxzbyBwcm92aWRlcyBhIGxlbnMgdGhyb3VnaCB3aGljaCB0byB1bmRlcnN0YW5kIOKAlCBhbmQgZ3JhZGUg4oCUIHRoZWlyIHdvcmsuXCJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdPcmlnaW5hbCBBbmFseXRpY2FsIFBhcGVyJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIHRpcEluZm86ICBcbiAgICAgICAgICB0aXRsZTogJ09yaWdpbmFsIEFuYWx5dGljYWwgUGFwZXInXG4gICAgICAgICAgY29udGVudDogXCJJbiBjb3Vyc2VzIHRoYXQgZW1waGFzaXplIHRyYWRpdGlvbmFsIHJlc2VhcmNoIHNraWxscyBhbmQgdGhlIGRldmVsb3BtZW50IG9mIG9yaWdpbmFsIGlkZWFzIHRocm91Z2ggYSB0ZXJtIHBhcGVyLCBXaWtpcGVkaWEncyBwb2xpY3kgb2YgXFxcIm5vIG9yaWdpbmFsIHJlc2VhcmNoXFxcIiBtYXkgYmUgdG9vIHJlc3RyaWN0aXZlLiBNYW55IGluc3RydWN0b3JzIHBhaXIgV2lraXBlZGlhIHdyaXRpbmcgd2l0aCBjb21wbGVtZW50YXJ5IGFuYWx5dGljYWwgcGFwZXI7IHN0dWRlbnRz4oCZIFdpa2lwZWRpYSBhcnRpY2xlcyBhcyBhIGxpdGVyYXR1cmUgcmV2aWV3LCBhbmQgdGhlIHN0dWRlbnRzIGdvIG9uIHRvIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgaW4gdGhlIG9mZmxpbmUgYW5hbHl0aWNhbCBwYXBlci5cIlxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwiZHlrX2dhXCJcbiAgICB0aXRsZTogJ0RZSyAvIEdBIFN1Ym1pc3Npb24nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgRGlkIFlvdSBLbm93ICYgR29vZCBBcnRpY2xlcydcbiAgICBmb3JtVGl0bGU6IFwiRG8gZWl0aGVyIG9mIHRoZXNlIHByb2Nlc3NlcyBtYWtlIHNlbnNlIGZvciBzdHVkZW50cyBpbiB5b3VyIGNsYXNzP1wiXG4gICAgc2VjdGlvbnM6IFtcbiAgICBdXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdkeWsnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0luY2x1ZGUgRFlLIFN1Ym1pc3Npb25zIGFzIGFuIEV4dHJhY3VycmljdWxhciBUYXNrJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIHRpcEluZm86IFxuICAgICAgICAgIHRpdGxlOiAnRGlkIFlvdSBLbm93IChEWUspJ1xuICAgICAgICAgIGNvbnRlbnQ6IFwiPHA+QWR2YW5jZWQgc3R1ZGVudHPigJkgYXJ0aWNsZXMgbWF5IHF1YWxpZnkgZm9yIHN1Ym1pc3Npb24gdG8gRGlkIFlvdSBLbm93IChEWUspLCBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgZmVhdHVyaW5nIG5ldyBjb250ZW50LiBUaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXgpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLjwvcD5cbiAgICAgICAgICA8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBidXQgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIH42IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlxuICAgICAgICAgIDxwPldlIHN0cm9uZ2x5IHJlY29tbWVuZCB0cnlpbmcgZm9yIERZSyBzdGF0dXMgeW91cnNlbGYgYmVmb3JlaGFuZCwgb3Igd29ya2luZyB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW5zIHRvIGhlbHAgeW91ciBzdHVkZW50cyBuYXZpZ2F0ZSB0aGUgRFlLIHByb2Nlc3Mgc21vb3RobHkuIElmIHlvdXIgc3R1ZGVudHMgYXJlIHdvcmtpbmcgb24gYSByZWxhdGVkIHNldCBvZiBhcnRpY2xlcywgaXQgY2FuIGhlbHAgdG8gY29tYmluZSBtdWx0aXBsZSBhcnRpY2xlIG5vbWluYXRpb25zIGludG8gYSBzaW5nbGUgaG9vazsgdGhpcyBoZWxwcyBrZWVwIHlvdXIgc3R1ZGVudHPigJkgd29yayBmcm9tIHN3YW1waW5nIHRoZSBwcm9jZXNzIG9yIGFudGFnb25pemluZyB0aGUgZWRpdG9ycyB3aG8gbWFpbnRhaW4gaXQuPC9wPlwiXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdnYSdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnSW5jbHVkZSBHb29kIEFydGljbGUgU3VibWlzc2lvbiBhcyBhbiBFeHRyYWN1cnJpY3VsYXIgVGFzaydcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICB0aXBJbmZvOiBcbiAgICAgICAgICB0aXRsZTogJ0dvb2QgQXJ0aWNsZSAoR0EpJ1xuICAgICAgICAgIGNvbnRlbnQ6IFwiV2VsbC1kZXZlbG9wZWQgYXJ0aWNsZXMgdGhhdCBoYXZlIHBhc3NlZCBhIEdvb2QgQXJ0aWNsZSAoR0EpIHJldmlldyBhcmUgYSBzdWJzdGFudGlhbCBhY2hpZXZlbWVudCBpbiB0aGVpciBvd24gcmlnaHQsIGFuZCBjYW4gYWxzbyBxdWFsaWZ5IGZvciBEWUsuIFRoaXMgcGVlciByZXZpZXcgcHJvY2VzcyBpbnZvbHZlcyBjaGVja2luZyBhIHBvbGlzaGVkIGFydGljbGUgYWdhaW5zdCBXaWtpcGVkaWEncyBHQSBjcml0ZXJpYTogYXJ0aWNsZXMgbXVzdCBiZSB3ZWxsLXdyaXR0ZW4sIHZlcmlmaWFibGUgYW5kIHdlbGwtc291cmNlZCB3aXRoIG5vIG9yaWdpbmFsIHJlc2VhcmNoLCBicm9hZCBpbiBjb3ZlcmFnZSwgbmV1dHJhbCwgc3RhYmxlLCBhbmQgYXBwcm9wcmlhdGVseSBpbGx1c3RyYXRlZCAod2hlbiBwb3NzaWJsZSkuIFByYWN0aWNhbGx5IHNwZWFraW5nLCBhIHBvdGVudGlhbCBHb29kIEFydGljbGUgc2hvdWxkIGxvb2sgYW5kIHNvdW5kIGxpa2Ugb3RoZXIgd2VsbC1kZXZlbG9wZWQgV2lraXBlZGlhIGFydGljbGVzLCBhbmQgaXQgc2hvdWxkIHByb3ZpZGUgYSBzb2xpZCwgd2VsbC1iYWxhbmNlZCB0cmVhdG1lbnQgb2YgaXRzIHN1YmplY3QuPC9wPlxuICAgICAgICAgIDxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IGdvb2QuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLjwvcD5cIlxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ3JhZGluZ1wiXG4gICAgdGl0bGU6ICdHcmFkaW5nJ1xuICAgIGZvcm1UaXRsZTogXCJIb3cgd2lsbCBzdHVkZW50cycgZ3JhZGVzIGZvciB0aGUgV2lraXBlZGlhIGFzc2lnbm1lbnQgYmUgZGV0ZXJtaW5lZD9cIlxuICAgIGluZm9UaXRsZTogXCJBYm91dCBncmFkaW5nXCJcbiAgICBpbnN0cnVjdGlvbnM6ICdHcmFkaW5nIFdpa2lwZWRpYSBhc3NpZ25tZW50cyBjYW4gYmUgYSBjaGFsbGVuZ2UuIEhlcmUgYXJlIHNvbWUgdGlwcyBmb3IgZ3JhZGluZyB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdLbm93IGFsbCBvZiB5b3VyIHN0dWRlbnRzXFwnIFdpa2lwZWRpYSB1c2VybmFtZXMuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2l0aG91dCBrbm93aW5nIHRoZSBzdHVkZW50cycgdXNlcm5hbWVzLCB5b3Ugd29uJ3QgYmUgYWJsZSB0byBncmFkZSB0aGVtLjwvcD5cIlxuICAgICAgICAgIFwiPHA+TWFrZSBzdXJlIGFsbCBzdHVkZW50cyBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiBPbmNlIGFsbCBzdHVkZW50cyBoYXZlIHNpZ25lZCB0aGUgbGlzdCwgeW91IGNhbiBjbGljayBvbiBcXFwidXNlciBjb250cmlidXRpb25zXFxcIiAoaW4gdGhlIG1lbnUgYmFyIG9uIHRoZSBsZWZ0IGhhbmQgc2lkZSBvZiB5b3VyIGJyb3dzZXIgc2NyZWVuKSB0byByZXZpZXcgdGhhdCBzdHVkZW50J3MgYWN0aXZpdGllcyBvbiBXaWtpcGVkaWEuIElmIHlvdSBoYXZlIG1hZGUgc3R1ZGVudCB0cmFpbmluZyBjb21wdWxzb3J5LCB5b3UgY2FuIGNoZWNrIHRoZSA8YSBocmVmPSdodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9XaWtpcGVkaWE6VHJhaW5pbmcvRm9yX3N0dWRlbnRzL1RyYWluaW5nX2ZlZWRiYWNrJyB0YXJnZXQ9J19ibGFuayc+ZmVlZGJhY2sgcGFnZTwvYT4gdG8gc2VlIHdoaWNoIHN0dWRlbnRzIGhhdmUgY29tcGxldGVkIGl0LjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQmUgc3BlY2lmaWMgYWJvdXQgeW91ciBleHBlY3RhdGlvbnMuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+QmVpbmcgc3BlY2lmaWMgYWJvdXQgd2hhdCB5b3UgZXhwZWN0IHlvdXIgc3R1ZGVudHMgdG8gZG8gaXMgY3J1Y2lhbCBmb3IgZ3JhZGluZy4gRm9yIGV4YW1wbGUsIHN0dWRlbnRzIGNvdWxkIGJlIGFza2VkIHRvIGFkZCBhIG1pbmltdW0gb2YgdGhyZWUgc2VjdGlvbnMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSwgb3IgYSBtaW5pbXVtIG9mIGVpZ2h0IHJlZmVyZW5jZXMgdG8gYW4gZXhpc3RpbmcgYXJ0aWNsZSB0aGF0IGxhY2tzIHRoZSBhcHByb3ByaWF0ZSBzb3VyY2luZywgZXRjLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnR3JhZGUgYmFzZWQgb24gd2hhdCBzdHVkZW50cyBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgbm90IHdoYXQgcmVtYWlucyBvbiBXaWtpcGVkaWEgYXQgdGhlIGNvdXJzZVxcJ3MgZW5kLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPllvdSBjYW4gc2VlIGEgc3R1ZGVudCdzIGNvbnRyaWJ1dGlvbnMgaW4gdGhlIGFydGljbGUgaGlzdG9yeSwgZXZlbiBpZiBzb21lIHdyaXRpbmcgd2FzIHJlbW92ZWQgYnkgdGhlIGNvbW11bml0eSAob3IgdGhlIHN0dWRlbnQpLiBBIHN0dWRlbnTigJlzIGNvbnRlbnQgY291bGQgYmUgZWRpdGVkIGZvciBtYW55IHJlYXNvbnMsIGFuZCBjYW4gZXZlbiBiZSBldmlkZW5jZSBvZiBhIHN0dWRlbnQgcmVmbGVjdGluZyBjcml0aWNhbGx5IG9uIHRoZWlyIG93biBjb250cmlidXRpb25zLiBGdXJ0aGVybW9yZSwgaWYgc3R1ZGVudHMgZmVlbCB0aGV5IG11c3QgZGVmZW5kIGNvbnRyb2wgb2YgYW4gYXJ0aWNsZSBmb3IgdGhlIHNha2Ugb2YgdGhlaXIgZ3JhZGUsIHRoaXMgY2FuIGxlYWQgdG8gY29uZmxpY3Qgd2l0aCBvdGhlciBlZGl0b3JzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+V2lraXBlZGlhIGlzIGEgY29sbGFib3JhdGl2ZSB3cml0aW5nIGVudmlyb25tZW50IGRyaXZlbiBieSB2ZXJpZmlhYmlsaXR5LCBub3Rld29ydGhpbmVzcyBhbmQgbmV1dHJhbCBwb2ludCBvZiB2aWV3IOKAkyBhbGwgb2Ygd2hpY2ggaGF2ZSBjcmVhdGVkIGNoYWxsZW5nZXMgZm9yIHN0dWRlbnRzIGZhbWlsaWFyIHdpdGggYSBwZXJzdWFzaXZlIHdyaXRpbmcgZm9ybWF0IGluIGNsYXNzcm9vbXMuIEVuY291cmFnZSBzdHVkZW50cyB0byByZWZsZWN0IG9uIGVkaXRzIHRvIGltcHJvdmUgdGhlaXIgdW5kZXJzdGFuZGluZyBvZiB0aGUgcHJvY2VzcyBhbmQgdGhlIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICBcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBFc3NlbnRpYWxzJ1xuICAgICAgICBpZDogJ2dyYWRlX2Vzc2VudGlhbHMnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnR2V0dGluZyBTdGFydGVkIHdpdGggRWRpdGluZydcbiAgICAgICAgaWQ6ICdncmFkZV9nZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnQ2hvb3NpbmcgQXJ0aWNsZXMnXG4gICAgICAgIGlkOiAnZ3JhZGVfY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnUmVzZWFyY2ggJiBQbGFubmluZydcbiAgICAgICAgaWQ6ICdncmFkZV9yZXNlYXJjaF9wbGFubmluZydcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdEcmFmdHMgJiBNYWluc3BhY2UnXG4gICAgICAgIGlkOiAnZ3JhZGVfZHJhZnRzX21haW5zcGFjZSdcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgICAgbGFiZWw6ICdQZWVyIEZlZWRiYWNrJ1xuICAgICAgICBpZDogJ2dyYWRlX3BlZXJfZmVlZGJhY2snXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBBc3NpZ25tZW50cydcbiAgICAgICAgaWQ6ICdncmFkZV9zdXBwbGVtZW50YXJ5J1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJvdmVydmlld1wiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IE92ZXJ2aWV3J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQWJvdXQgdGhlIENvdXJzZSdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnU2hvcnQgRGVzY3JpcHRpb24nXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzgnIHN0eWxlPSd3aWR0aDoxMDAlOyc+PC90ZXh0YXJlYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgRXNzZW50aWFscydcbiAgICAgICAgaWQ6ICdncmFkZV9lc3NlbnRpYWxzJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgICBsYWJlbDogJ0dldHRpbmcgU3RhcnRlZCB3aXRoIEVkaXRpbmcnXG4gICAgICAgIGlkOiAnZ3JhZGVfZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgICBsYWJlbDogJ0Nob29zaW5nIEFydGljbGVzJ1xuICAgICAgICBpZDogJ2dyYWRlX2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgICBsYWJlbDogJ1Jlc2VhcmNoICYgUGxhbm5pbmcnXG4gICAgICAgIGlkOiAnZ3JhZGVfcmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnRHJhZnRzICYgTWFpbnNwYWNlJ1xuICAgICAgICBpZDogJ2dyYWRlX2RyYWZ0c19tYWluc3BhY2UnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnUGVlciBGZWVkYmFjaydcbiAgICAgICAgaWQ6ICdncmFkZV9wZWVyX2ZlZWRiYWNrJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgQXNzaWdubWVudHMnXG4gICAgICAgIGlkOiAnZ3JhZGVfc3VwcGxlbWVudGFyeSdcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuICBcbl1cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRDb250ZW50IiwiV2l6YXJkQ291cnNlSW5mbyA9IFxuXG4gICMgUkVTRUFSQ0ggQU5EIFdSSVRFIEEgV0lLSVBFRElBIEFSVElDTEVcbiAgcmVzZWFyY2h3cml0ZTogXG4gICAgdGl0bGU6IFwiUmVzZWFyY2ggYW5kIHdyaXRlIGEgV2lraXBlZGlhIGFydGljbGVcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIldvcmtpbmcgaW5kaXZpZHVhbGx5IG9yIGluIHNtYWxsIHRlYW1zIHdpdGggeW91ciBndWlkYW5jZSwgc3R1ZGVudHMgY2hvb3NlIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB0aGF0IGFyZSBub3Qgd2VsbC1jb3ZlcmVkIG9uIFdpa2lwZWRpYS4gQWZ0ZXIgYXNzZXNzaW5nIFdpa2lwZWRpYSdzIGNvdmVyYWdlLCBzdHVkZW50cyByZXNlYXJjaCB0b3BpY3MgdG8gZmluZCBoaWdoLXF1YWxpdHkgc2Vjb25kYXJ5IHNvdXJjZXMsIHRoZW4gcHJvcG9zZSBhbiBvdXRsaW5lIGZvciBob3cgdGhlIHRvcGljIG91Z2h0IHRvIGJlIGNvdmVyZWQuIFRoZXkgZHJhZnQgdGhlaXIgYXJ0aWNsZXMsIGdpdmUgYW5kIHJlc3BvbmQgdG8gcGVlciBmZWVkYmFjaywgdGFrZSB0aGVpciB3b3JrIGxpdmUgb24gV2lraXBlZGlhLCBhbmQga2VlcCBpbXByb3ZpbmcgdGhlaXIgYXJ0aWNsZXMgdW50aWwgdGhlIGVuZCBvZiB0aGUgdGVybS4gQWxvbmcgdGhlIHdheSwgc3R1ZGVudHMgbWF5IHdvcmsgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWEgZWRpdG9ycyB3aG8gY2FuIG9mZmVyIGNyaXRpY2FsIGZlZWRiYWNrIGFuZCBoZWxwIG1ha2Ugc3VyZSBhcnRpY2xlcyBtZWV0IFdpa2lwZWRpYSdzIHN0YW5kYXJkcyBhbmQgc3R5bGUgY29udmVudGlvbnMuIFN0dWRlbnRzIHdobyBkbyBncmVhdCB3b3JrIG1heSBldmVuIGhhdmUgdGhlaXIgYXJ0aWNsZXMgZmVhdHVyZWQgb24gV2lraXBlZGlhJ3MgbWFpbiBwYWdlLiBTb2xpZCBhcnRpY2xlcyB3aWxsIGhlbHAgaW5mb3JtIHRob3VzYW5kcyBvZiBmdXR1cmUgcmVhZGVycyBhYm91dCB0aGUgc2VsZWN0ZWQgdG9waWMuXCJcbiAgICAgIFwiT3B0aW9uYWxseSwgc3R1ZGVudHMgbWF5IGJlIGFza2VkIHRvIHdyaXRlIGEgcmVmbGVjdGl2ZSBwYXBlciBhYm91dCB0aGVpciBXaWtpcGVkaWEgZXhwZXJpZW5jZSwgcHJlc2VudCB0aGVpciBjb250cmlidXRpb25zIGluIGNsYXNzLCBvciBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGFib3V0IHRoZWlyIHRvcGljcyBpbiBhIHNlcGFyYXRlIGVzc2F5LlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMTIgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIFN0dWRlbnRzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvIGNvdXJzZXNcIlxuICAgICAgXCJsYXJnZSBzdXJ2ZXkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBTT1VSQ0UtQ0VOVEVSRUQgQURESVRJT05TXG4gIHNvdXJjZWNlbnRlcmVkOiBcbiAgICB0aXRsZTogXCJTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyByZWFkIFdpa2lwZWRpYSBhcnRpY2xlcyBpbiBhIHNlbGYtc2VsZWN0ZWQgc3ViamVjdCBhcmVhIHRvIGlkZW50aWZ5IGFydGljbGVzIGluIG5lZWQgb2YgcmV2aXNpb24gb3IgaW1wcm92ZW1lbnQsIHN1Y2ggYXMgdGhvc2Ugd2l0aCBcXFwiY2l0YXRpb24gbmVlZGVkXFxcIiB0YWdzLiBTdHVkZW50cyB3aWxsIGZpbmQgcmVsaWFibGUgc291cmNlcyB0byB1c2UgYXMgcmVmZXJlbmNlcyBmb3IgdW5jaXRlZCBjb250ZW50LiBUaGlzIGFzc2lnbm1lbnQgaW5jbHVkZXMgYSBwZXJzdWFzaXZlIGVzc2F5IGluIHdoaWNoIHN0dWRlbnRzIG1ha2UgYSBjYXNlIGZvciB0aGVpciBzdWdnZXN0ZWQgY2hhbmdlcywgd2h5IHRoZXkgYmVsaWV2ZSB0aGV5IGFyZSBxdWFsaWZpZWQgdG8gbWFrZSB0aG9zZSBjaGFuZ2VzLCBhbmQgd2h5IHRoZWlyIHNlbGVjdGVkIHNvdXJjZXMgcHJvdmlkZSBzdXBwb3J0LiBBZnRlciBtYWtpbmcgdGhlaXIgY29udHJpYnV0aW9ucywgc3R1ZGVudHMgcmVmbGVjdCBvbiB0aGVpciB3b3JrIHdpdGggYSBmb3JtYWwgcGFwZXIsIGFuZCBkaXNjdXNzIHdoZXRoZXIgdGhleSd2ZSBhY2NvbXBsaXNoZWQgdGhlaXIgc3RhdGVkIGdvYWxzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2UgY2xhc3Nlc1wiXG4gICAgICBcIkFkdmFuY2VkIHVuZGVyZ3JhZHVhdGVzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEZJTkQgQU5EIEZJWCBFUlJPUlNcbiAgZmluZGZpeDogXG4gICAgdGl0bGU6IFwiRmluZCBhbmQgZml4IGVycm9yc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGZpbmQgYW4gYXJ0aWNsZSBhYm91dCBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHdpdGggd2hpY2ggdGhleSBhcmUgZXh0cmVtZWx5IGZhbWlsaWFyIHRoYXQgaGFzIHNvbWUgbWlzdGFrZXMuIFN0dWRlbnRzIHRha2Ugd2hhdCB0aGV5IGtub3cgYWJvdXQgdGhlIHRvcGljLCBmaW5kIGZhY3R1YWwgZXJyb3JzIGFuZCBvdGhlciBzdWJzdGFudGl2ZSBtaXN0YWtlcywgYW5kIGNvcnJlY3QgdGhvc2UuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJHcmFkdWF0ZSBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cbiAgcGxhZ2lhcmlzbTogXG4gICAgdGl0bGU6IFwiSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBzZWFyY2ggdGhyb3VnaCBXaWtpcGVkaWEgYXJ0aWNsZXMgdG8gZmluZCBpbnN0YW5jZXMgb2YgY2xvc2UgcGFyYXBocmFzaW5nIG9yIHBsYWdpYXJpc20sIHRoZW4gcmV3b3JkIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGVpciBvd24gbGFuZ3VhZ2UgdG8gYmUgYXBwcm9wcmlhdGUgZm9yIFdpa2lwZWRpYS4gSW4gdGhpcyBhc3NpZ25tZW50LCBzdHVkZW50cyBnYWluIGEgZGVlcGVyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBwbGFnaWFyaXNtIGlzIGFuZCBob3cgdG8gYXZvaWQgaXQuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJUQkRcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI1RSQU5TTEFURSBBTiBBUlRJQ0xFIFRPIEVOR0xJU0hcbiAgdHJhbnNsYXRlOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlRoaXMgaXMgYSBwcmFjdGljYWwgYXNzaWdubWVudCBmb3IgbGFuZ3VhZ2UgaW5zdHJ1Y3RvcnMuIFN0dWRlbnRzIHNlbGVjdCBhIFdpa2lwZWRpYSBhcnRpY2xlIGluIHRoZSBsYW5ndWFnZSB0aGV5IGFyZSBzdHVkeWluZywgYW5kIHRyYW5zbGF0ZSBpdCBpbnRvIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gU3R1ZGVudHMgc2hvdWxkIHN0YXJ0IHdpdGggaGlnaC1xdWFsaXR5IGFydGljbGVzIHdoaWNoIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gVGhpcyBhc3NpZ25tZW50IHByb3ZpZGVzIHByYWN0aWNhbCB0cmFuc2xhdGlvbiBhZHZpY2Ugd2l0aCB0aGUgaW5jZW50aXZlIG9mIHJlYWwgcHVibGljIHNlcnZpY2UsIGFzIHN0dWRlbnRzIGV4cGFuZCB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRhcmdldCBjdWx0dXJlIG9uIFdpa2lwZWRpYS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYrIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYW5ndWFnZSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB0cmFuc2xhdGluZyA8ZW0+ZnJvbTwvZW0+IHRoZWlyIG5hdGl2ZSBsYW5ndWFnZSB0byB0aGUgbGFuZ3VhZ2UgdGhleSdyZSBzdHVkeWluZ1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0NPUFkgRURJVElOR1xuICBjb3B5ZWRpdDogXG4gICAgdGl0bGU6IFwiQ29weWVkaXRcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIGFyZSBhc2tlZCB0byBjb3B5ZWRpdCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGVuZ2FnaW5nIGVkaXRvcnMgaW4gY29udmVyc2F0aW9uIGFib3V0IHRoZWlyIHdyaXRpbmcgYW5kIGltcHJvdmluZyB0aGUgY2xhcml0eSBvZiB0aGUgbGFuZ3VhZ2Ugb2YgdGhlIG1hdGVyaWFsLiBTdHVkZW50cyBsZWFybiB0byB3cml0ZSBpbiBkaWZmZXJlbnQgdm9pY2VzIGZvciBkaWZmZXJlbnQgYXVkaWVuY2VzLiBJbiBsZWFybmluZyBhYm91dCB0aGUgc3BlY2lmaWMgdm9pY2Ugb24gV2lraXBlZGlhLCB0aGV5IGxlYXJuIGFib3V0IHRoZSDigJxhdXRob3JpdGF0aXZl4oCdIHZvaWNlIGFuZCBob3cgaXRzIHRvbmUgY2FuIGNvbnZpbmNlLCBldmVuIGlmIHRoZSBjb250ZW50IGlzIHF1ZXN0aW9uYWJsZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkVuZ2xpc2ggZ3JhbW1hciBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB3aXRob3V0IHN0cm9uZyB3cml0aW5nIHNraWxsc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0VWQUxVQVRFIEFSVElDTEVTXG4gIGV2YWx1YXRlOiBcbiAgICB0aXRsZTogXCJFdmFsdWF0ZSBhcnRpY2xlc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiRmlyc3QsIHN0dWRlbnRzIHdyaXRlIGEgcmVwb3J0IGFuYWx5emluZyB0aGUgc3RhdGUgb2YgV2lraXBlZGlhIGFydGljbGVzIG9uIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB3aXRoIGFuIGV5ZSB0b3dhcmQgZnV0dXJlIHJldmlzaW9ucy4gVGhpcyBlbmNvdXJhZ2VzIGEgY3JpdGljYWwgcmVhZGluZyBvZiBib3RoIGNvbnRlbnQgYW5kIGZvcm0uIFRoZW4sIHRoZSBzdHVkZW50cyBlZGl0IGFydGljbGVzIGluIHNhbmRib3hlcyB3aXRoIGZlZWRiYWNrIGZyb20gdGhlIHByb2Zlc3NvciwgY2FyZWZ1bGx5IHNlbGVjdGluZyBhbmQgYWRkaW5nIHJlZmVyZW5jZXMgdG8gaW1wcm92ZSB0aGUgYXJ0aWNsZSBiYXNlZCBvbiB0aGVpciBjcml0aWNhbCBlc3NheXMuIEZpbmFsbHksIHRoZXkgY29tcG9zZSBhIHNlbGYtYXNzZXNzbWVudCBldmFsdWF0aW5nIHRoZWlyIG93biBjb250cmlidXRpb25zLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI1IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEFERCBJTUFHRVMgT1IgTVVMVElNRURJQVxuICBtdWx0aW1lZGlhOiBcbiAgICB0aXRsZTogXCIgQWRkIGltYWdlcyBvciBtdWx0aW1lZGlhXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJJZiB5b3VyIHN0dWRlbnRzIGFyZSBhZGVwdCBhdCBtZWRpYSwgdGhpcyBjYW4gYmUgYSBncmVhdCB3YXkgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYSBpbiBhIG5vbi10ZXh0dWFsIHdheS4gSW4gdGhlIHBhc3QsIHN0dWRlbnRzIGhhdmUgcGhvdG9ncmFwaGVkIGxvY2FsIG1vbnVtZW50cyB0byBpbGx1c3RyYXRlIGFydGljbGVzLCBkZXNpZ25lZCBpbmZvZ3JhcGhpY3MgdG8gaWxsdXN0cmF0ZSBjb25jZXB0cywgb3IgY3JlYXRlZCB2aWRlb3MgdGhhdCBkZW1vbnN0cmF0ZWQgYXVkaW8tdmlzdWFsbHkgd2hhdCBhcnRpY2xlcyBkZXNjcmliZSBpbiB3b3Jkcy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjMgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHN0dWR5aW5nIHBob3RvZ3JhcGh5LCB2aWRlb2dyYXBoeSwgb3IgZ3JhcGhpYyBkZXNpZ25cIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgbWVkaWEgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvdXJzZUluZm8iLCJXaXphcmRTdGVwSW5wdXRzID1cblxuXG4gIGludHJvOiBcbiAgICB0ZWFjaGVyOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1RlYWNoZXIgTmFtZSdcbiAgICAgIGlkOiAndGVhY2hlcidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBjb3Vyc2VfbmFtZTpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdDb3Vyc2UgTmFtZSdcbiAgICAgIGlkOiAnY291cnNlX25hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHNjaG9vbDpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdVbml2ZXJzaXR5J1xuICAgICAgaWQ6ICdzY2hvb2wnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1YmplY3Q6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnU3ViamVjdCdcbiAgICAgIGlkOiAnc3ViamVjdCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgc3R1ZGVudHM6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBpbnN0cnVjdG9yX3VzZXJuYW1lOlxuICAgICAgbGFiZWw6ICdVc2VybmFtZSAodGVtcG9yYXJ5KSdcbiAgICAgIGlkOiAnaW5zdHJ1Y3Rvcl91c2VybmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBzdGFydF9kYXRlOlxuICAgICAgdmFsdWU6ICcnXG5cbiAgICBlbmRfZGF0ZTpcbiAgICAgIHZhbHVlOiAnJ1xuICAgIFxuICBcblxuICBhc3NpZ25tZW50X3NlbGVjdGlvbjogXG4gICAgcmVzZWFyY2h3cml0ZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVzZWFyY2h3cml0ZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgd3JpdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogdHJ1ZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuXG4gICAgZXZhbHVhdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2V2YWx1YXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0V2YWx1YXRlIGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgIFxuICAgIG11bHRpbWVkaWE6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ211bHRpbWVkaWEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG5cbiAgICBzb3VyY2VjZW50ZXJlZDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnc291cmNlY2VudGVyZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU291cmNlLWNlbnRlcmVkIGFkZGl0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcblxuICAgIGNvcHllZGl0OiBcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29weWVkaXQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29weS9lZGl0IGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuXG4gICAgZmluZGZpeDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZmluZGZpeCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdGaW5kIGFuZCBmaXggZXJyb3JzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgIFxuICAgIHBsYWdpYXJpc206XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3BsYWdpYXJpc20nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuXG5cblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBcbiAgICBjcmVhdGVfdXNlcjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY3JlYXRlX3VzZXInXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdDcmVhdGUgVXNlciBBY2NvdW50J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIFxuICAgIGVucm9sbDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBDb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICBjb21wbGV0ZV90cmFpbmluZzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgT25saW5lIFRyYWluaW5nJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgaW50cm9kdWNlX2FtYmFzc2Fkb3JzOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbnRyb2R1Y2VfYW1iYXNzYWRvcnMnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW50cm9kdWNlIFdpa2lwZWRpYSBBbWJhc3NhZG9ycyBJbnZvbHZlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICBcbiAgICBpbmNsdWRlX2NvbXBsZXRpb246XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2luY2x1ZGVfY29tcGxldGlvbidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICBcbiAgXG5cbiAgZ2V0dGluZ19zdGFydGVkOiBcbiAgICBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JpdGlxdWUgYW4gQXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICAgIGFkZF90b19hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdhZGRfdG9fYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0FkZCB0byBhbiBBcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgY29weV9lZGl0X2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHlfZWRpdF9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHktRWRpdCBhbiBBcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIFxuICAgIGlsbHVzdHJhdGVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gQXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgXG5cbiAgY2hvb3NpbmdfYXJ0aWNsZXM6IFxuICAgIHByZXBhcmVfbGlzdDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAncHJlcGFyZV9saXN0J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgUHJlcGFyZXMgYSBMaXN0IHdpdGggQXBwcm9wcmlhdGUgQXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogXCJJbnN0cnVjdG9yIFByZXBhcmVzIGEgTGlzdFwiXG4gICAgICAgIGNvbnRlbnQ6IFwiWW91ICh0aGUgaW5zdHJ1Y3RvcikgcHJlcGFyZSBhIGxpc3Qgb2YgYXBwcm9wcmlhdGUgJ25vbi1leGlzdGVudCcsICdzdHViJyBvciAnc3RhcnQnIGFydGljbGVzIGFoZWFkIG9mIHRpbWUgZm9yIHRoZSBzdHVkZW50cyB0byBjaG9vc2UgZnJvbS4gSWYgcG9zc2libGUsIHlvdSBtYXkgd2FudCB0byB3b3JrIHdpdGggYW4gZXhwZXJpZW5jZWQgV2lraXBlZGlhbiB0byBjcmVhdGUgdGhlIGxpc3QuIEVhY2ggc3R1ZGVudCBjaG9vc2VzIGFuIGFydGljbGUgZnJvbSB0aGUgbGlzdCB0byB3b3JrIG9uLiBBbHRob3VnaCB0aGlzIHJlcXVpcmVzIG1vcmUgcHJlcGFyYXRpb24sIGl0IG1heSBoZWxwIHN0dWRlbnRzIHRvIHN0YXJ0IHJlc2VhcmNoaW5nIGFuZCB3cml0aW5nIHRoZWlyIGFydGljbGVzIHNvb25lci5cIlxuICAgIFxuICAgIHN0dWRlbnRzX2V4cGxvcmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3N0dWRlbnRzX2V4cGxvcmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU3R1ZGVudHMgRXhwbG9yZSBhbmQgUHJlcGFyZSBhIExpc3Qgb2YgQXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogXCJTdHVkZW50cyBFeHBsb3JlXCJcbiAgICAgICAgY29udGVudDogXCJFYWNoIHN0dWRlbnQgZXhwbG9yZXMgV2lraXBlZGlhIGFuZCBsaXN0cyAz4oCTNSB0b3BpY3Mgb24gdGhlaXIgV2lraXBlZGlhIHVzZXIgcGFnZSB0aGF0IHRoZXkgYXJlIGludGVyZXN0ZWQgaW4gZm9yIHRoZWlyIG1haW4gcHJvamVjdC4gWW91ICh0aGUgaW5zdHJ1Y3Rvcikgc2hvdWxkIGFwcHJvdmUgYXJ0aWNsZSBjaG9pY2VzIGJlZm9yZSBzdHVkZW50cyBwcm9jZWVkIHRvIHdyaXRpbmcuIExldHRpbmcgc3R1ZGVudHMgZmluZCB0aGVpciBvd24gYXJ0aWNsZXMgcHJvdmlkZXMgdGhlbSB3aXRoIGEgc2Vuc2Ugb2YgbW90aXZhdGlvbiBhbmQgb3duZXJzaGlwIG92ZXIgdGhlIGFzc2lnbm1lbnQsIGJ1dCBpdCBtYXkgYWxzbyBsZWFkIHRvIGNob2ljZXMgdGhhdCBhcmUgZnVydGhlciBhZmllbGQgZnJvbSBjb3Vyc2UgbWF0ZXJpYWwuXCJcblxuXG5cbiAgcmVzZWFyY2hfcGxhbm5pbmc6IFxuICAgIGNyZWF0ZV9vdXRsaW5lOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjcmVhdGVfb3V0bGluZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDcmVhdGUgYW4gQXJ0aWNsZSBPdXRsaW5lJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIlRyYWRpdGlvbmFsIE91dGxpbmVcIlxuICAgICAgICBjb250ZW50OiBcIkZvciBlYWNoIGFydGljbGUsIHRoZSBzdHVkZW50cyBjcmVhdGUgYW4gb3V0bGluZSB0aGF0IHJlZmxlY3RzIHRoZSBpbXByb3ZlbWVudHMgdGhleSBwbGFuIHRvIG1ha2UsIGFuZCB0aGVuIHBvc3QgaXQgdG8gdGhlIGFydGljbGUncyB0YWxrIHBhZ2UuIFRoaXMgaXMgYSByZWxhdGl2ZWx5IGVhc3kgd2F5IHRvIGdldCBzdGFydGVkLlwiXG4gICAgXG4gICAgd3JpdGVfbGVhZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd3JpdGVfbGVhZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXcml0ZSB0aGUgQXJ0aWNsZSBMZWFkIFNlY3Rpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiV2lraXBlZGlhIGxlYWQgc2VjdGlvblwiXG4gICAgICAgIGNvbnRlbnQ6XG4gICAgICAgICAgXCI8cD5Gb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGEgd2VsbC1iYWxhbmNlZCBzdW1tYXJ5IG9mIGl0cyBmdXR1cmUgc3RhdGUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uLiBUaGUgaWRlYWwgbGVhZCBzZWN0aW9uIGV4ZW1wbGlmaWVzIFdpa2lwZWRpYSdzIHN1bW1hcnkgc3R5bGUgb2Ygd3JpdGluZzogaXQgYmVnaW5zIHdpdGggYSBzaW5nbGUgc2VudGVuY2UgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcGxhY2VzIGl0IGluIGNvbnRleHQsIGFuZCB0aGVuIOKAlCBpbiBvbmUgdG8gZm91ciBwYXJhZ3JhcGhzLCBkZXBlbmRpbmcgb24gdGhlIGFydGljbGUncyBzaXplIOKAlCBpdCBvZmZlcnMgYSBjb25jaXNlIHN1bW1hcnkgb2YgdG9waWMuIEEgZ29vZCBsZWFkIHNlY3Rpb24gc2hvdWxkIHJlZmxlY3QgdGhlIG1haW4gdG9waWNzIGFuZCBiYWxhbmNlIG9mIGNvdmVyYWdlIG92ZXIgdGhlIHdob2xlIGFydGljbGUuPC9wPlxuICAgICAgICAgIDxwPk91dGxpbmluZyBhbiBhcnRpY2xlIHRoaXMgd2F5IGlzIGEgbW9yZSBjaGFsbGVuZ2luZyBhc3NpZ25tZW50IOKAlCBhbmQgd2lsbCByZXF1aXJlIG1vcmUgd29yayB0byBldmFsdWF0ZSBhbmQgcHJvdmlkZSBmZWVkYmFjayBmb3IuIEhvd2V2ZXIsIGl0IGNhbiBiZSBtb3JlIGVmZmVjdGl2ZSBmb3IgdGVhY2hpbmcgdGhlIHByb2Nlc3Mgb2YgcmVzZWFyY2gsIHdyaXRpbmcsIGFuZCByZXZpc2lvbi4gU3R1ZGVudHMgd2lsbCByZXR1cm4gdG8gdGhpcyBsZWFkIHNlY3Rpb24gYXMgdGhleSBnbywgdG8gZ3VpZGUgdGhlaXIgd3JpdGluZyBhbmQgdG8gcmV2aXNlIGl0IHRvIHJlZmxlY3QgdGhlaXIgaW1wcm92ZWQgdW5kZXJzdGFuZGluZyBvZiB0aGUgdG9waWMgYXMgdGhlaXIgcmVzZWFyY2ggcHJvZ3Jlc3Nlcy4gVGhleSB3aWxsIHRhY2tsZSBXaWtpcGVkaWEncyBlbmN5Y2xvcGVkaWMgc3R5bGUgZWFybHkgb24sIGFuZCB0aGVpciBvdXRsaW5lIGVmZm9ydHMgd2lsbCBiZSBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZWlyIGZpbmFsIHdvcmsuPC9wPlwiXG4gICAgICAgIFxuXG5cbiAgZHJhZnRzX21haW5zcGFjZTogXG4gICAgd29ya19saXZlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBMaXZlIGZyb20gdGhlIFN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzpcbiAgICAgICAgdGl0bGU6IFwiUHJvcyBhbmQgY29ucyB0byBlZGl0aW5nIGxpdmVcIlxuICAgICAgICBjb250ZW50OiBcIkVkaXRpbmcgbGl2ZSBpcyBleGNpdGluZyBmb3IgdGhlIHN0dWRlbnRzIGJlY2F1c2UgdGhleSBjYW4gc2VlIHRoZWlyIGNoYW5nZXMgdG8gdGhlIGFydGljbGVzIGltbWVkaWF0ZWx5IGFuZCBleHBlcmllbmNlIHRoZSBjb2xsYWJvcmF0aXZlIGVkaXRpbmcgcHJvY2VzcyB0aHJvdWdob3V0IHRoZSBhc3NpZ25tZW50LiBIb3dldmVyLCBiZWNhdXNlIG5ldyBlZGl0b3JzIG9mdGVuIHVuaW50ZW50aW9uYWxseSBicmVhayBXaWtpcGVkaWEgcnVsZXMsIHNvbWV0aW1lcyBzdHVkZW50c+KAmSBhZGRpdGlvbnMgYXJlIHF1ZXN0aW9uZWQgb3IgcmVtb3ZlZC5cIlxuICAgIFxuICAgIHNhbmRib3g6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3NhbmRib3gnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRHJhZnQgRWFybHkgV29yayBvbiBTYW5kYm94ZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogXCJQcm9zIGFuZCBjb25zIHRvIHNhbmRib3hlc1wiXG4gICAgICAgIGNvbnRlbnQ6IFwiU2FuZGJveGVzIG1ha2Ugc3R1ZGVudHMgZmVlbCBzYWZlIGJlY2F1c2UgdGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMsIG9yIG90aGVyIFdpa2lwZWRpYW5zIGFsdGVyaW5nIHRoZWlyIHdyaXRpbmcuIEhvd2V2ZXIsIHNhbmRib3ggZWRpdGluZyBsaW1pdHMgbWFueSBvZiB0aGUgdW5pcXVlIGFzcGVjdHMgb2YgV2lraXBlZGlhIGFzIGEgdGVhY2hpbmcgdG9vbCwgc3VjaCBhcyBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgYW5kIGluY3JlbWVudGFsIGRyYWZ0aW5nLiBTcGVuZGluZyBtb3JlIHRoYW4gYSB3ZWVrIG9yIHR3byBpbiBzYW5kYm94ZXMgaXMgc3Ryb25nbHkgZGlzY291cmFnZWQuXCJcblxuXG4gIHBlZXJfZmVlZGJhY2s6IFxuICAgIHBlZXJfcmV2aWV3czpcbiAgICAgIHR5cGU6ICdyYWRpb0dyb3VwJ1xuICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICBsYWJlbDogJydcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMSdcbiAgICAgICAgICB2YWx1ZTogJzEnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMidcbiAgICAgICAgICB2YWx1ZTogJzInXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICczJ1xuICAgICAgICAgIHZhbHVlOiAnMydcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICc1J1xuICAgICAgICAgIHZhbHVlOiAnNSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcxMCdcbiAgICAgICAgICB2YWx1ZTogJzEwJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICBdXG4gICAgXG4gIFxuXG4gIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6IFxuICAgIGNsYXNzX2Jsb2c6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX2Jsb2cnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ2xhc3MgQmxvZyBvciBEaXNjdXNzaW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiAnQ2xhc3MgYmxvZyBvciBjbGFzcyBkaXNjdXNzaW9uJ1xuICAgICAgICBjb250ZW50OiAnTWFueSBpbnN0cnVjdG9ycyBhc2sgc3R1ZGVudHMgdG8ga2VlcCBhIHJ1bm5pbmcgYmxvZyBhYm91dCB0aGVpciBleHBlcmllbmNlcy4gR2l2aW5nIHRoZW0gcHJvbXB0cyBldmVyeSB3ZWVrIG9yIGV2ZXJ5IHR3byB3ZWVrcywgc3VjaCBhcyDigJxUbyB3aGF0IGV4dGVudCBhcmUgdGhlIGVkaXRvcnMgb24gV2lraXBlZGlhIGEgc2VsZi1zZWxlY3RpbmcgZ3JvdXAgYW5kIHdoeT/igJ0gd2lsbCBoZWxwIHRoZW0gYmVnaW4gdG8gdGhpbmsgYWJvdXQgdGhlIGxhcmdlciBpc3N1ZXMgc3Vycm91bmRpbmcgdGhpcyBvbmxpbmUgZW5jeWNsb3BlZGlhIGNvbW11bml0eS4gSXQgd2lsbCBhbHNvIGdpdmUgeW91IG1hdGVyaWFsIGJvdGggb24gdGhlIHdpa2kgYW5kIG9mZiB0aGUgd2lraSB0byBncmFkZS4gSWYgeW91IGhhdmUgdGltZSBpbiBjbGFzcywgdGhlc2UgZGlzY3Vzc2lvbnMgY2FuIGJlIHBhcnRpY3VsYXJseSBjb25zdHJ1Y3RpdmUgaW4gcGVyc29uLidcbiAgICBcbiAgICBjbGFzc19wcmVzZW50YXRpb246XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX3ByZXNlbnRhdGlvbidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbi1DbGFzcyBQcmVzZW50YXRpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIFdpa2lwZWRpYSB3b3JrJ1xuICAgICAgICBjb250ZW50OiBcIkVhY2ggc3R1ZGVudCBvciBncm91cCBwcmVwYXJlcyBhIHNob3J0IHByZXNlbnRhdGlvbiBmb3IgdGhlIGNsYXNzLCBleHBsYWluaW5nIHdoYXQgdGhleSB3b3JrZWQgb24sIHdoYXQgd2VudCB3ZWxsIGFuZCB3aGF0IGRpZG4ndCwgYW5kIHdoYXQgdGhleSBsZWFybmVkLiBUaGVzZSBwcmVzZW50YXRpb25zIGNhbiBtYWtlIGV4Y2VsbGVudCBmb2RkZXIgZm9yIGNsYXNzIGRpc2N1c3Npb25zIHRvIHJlaW5mb3JjZSB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIGdvYWxzLlwiXG4gICAgXG4gICAgcmVmbGVjdGl2ZV9lc3NheTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZWZsZWN0aXZlIEVzc2F5J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgIGNvbnRlbnQ6IFwiQWZ0ZXIgdGhlIGFzc2lnbm1lbnQgaXMgb3ZlciwgYXNrIHN0dWRlbnRzIHRvIHdyaXRlIGEgc2hvcnQgcmVmbGVjdGl2ZSBlc3NheSBvbiB0aGVpciBleHBlcmllbmNlcyB1c2luZyBXaWtpcGVkaWEuIFRoaXMgd29ya3Mgd2VsbCBmb3IgYm90aCBzaG9ydCBhbmQgbG9uZyBXaWtpcGVkaWEgcHJvamVjdHMuIEFuIGludGVyZXN0aW5nIGl0ZXJhdGlvbiBvZiB0aGlzIGlzIHRvIGhhdmUgc3R1ZGVudHMgd3JpdGUgYSBzaG9ydCB2ZXJzaW9uIG9mIHRoZSBlc3NheSBiZWZvcmUgdGhleSBiZWdpbiBlZGl0aW5nIFdpa2lwZWRpYSwgb3V0bGluaW5nIHRoZWlyIGV4cGVjdGF0aW9ucywgYW5kIHRoZW4gaGF2ZSB0aGVtIHJlZmxlY3Qgb24gd2hldGhlciBvciBub3QgdGhvc2UgZXhwZWN0YXRpb25zIHdlcmUgbWV0IGFmdGVyIHRoZXkgaGF2ZSBjb21wbGV0ZWQgdGhlIGFzc2lnbm1lbnQuXCJcbiAgICBcbiAgICBwb3J0Zm9saW86XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3BvcnRmb2xpbydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgUG9ydGZvbGlvJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBQb3J0Zm9saW8nXG4gICAgICAgIGNvbnRlbnQ6IFwiU3R1ZGVudHMgb3JnYW5pemUgdGhlaXIgV2lraXBlZGlhIHdvcmsgaW50byBhIHBvcnRmb2xpbywgaW5jbHVkaW5nIGEgbmFycmF0aXZlIG9mIHRoZSBjb250cmlidXRpb25zIHRoZXkgbWFkZSDigJQgYW5kIGhvdyB0aGV5IHdlcmUgcmVjZWl2ZWQsIGFuZCBwb3NzaWJseSBjaGFuZ2VkLCBieSBvdGhlciBXaWtpcGVkaWFucyDigJQgYW5kIGxpbmtzIHRvIHRoZWlyIGtleSBlZGl0cy4gQ29tcG9zaW5nIHRoaXMgcG9ydGZvbGlvIHdpbGwgaGVscCBzdHVkZW50cyB0aGluayBtb3JlIGRlZXBseSBhYm91dCB0aGVpciBXaWtpcGVkaWEgZXhwZXJpZW5jZXMsIGFuZCBhbHNvIHByb3ZpZGVzIGEgbGVucyB0aHJvdWdoIHdoaWNoIHRvIHVuZGVyc3RhbmQg4oCUIGFuZCBncmFkZSDigJQgdGhlaXIgd29yay5cIlxuICAgIFxuICAgIG9yaWdpbmFsX3BhcGVyOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdvcmlnaW5hbF9wYXBlcidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdPcmlnaW5hbCBBbmFseXRpY2FsIFBhcGVyJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ09yaWdpbmFsIEFuYWx5dGljYWwgUGFwZXInXG4gICAgICAgIGNvbnRlbnQ6IFwiSW4gY291cnNlcyB0aGF0IGVtcGhhc2l6ZSB0cmFkaXRpb25hbCByZXNlYXJjaCBza2lsbHMgYW5kIHRoZSBkZXZlbG9wbWVudCBvZiBvcmlnaW5hbCBpZGVhcyB0aHJvdWdoIGEgdGVybSBwYXBlciwgV2lraXBlZGlhJ3MgcG9saWN5IG9mIFxcXCJubyBvcmlnaW5hbCByZXNlYXJjaFxcXCIgbWF5IGJlIHRvbyByZXN0cmljdGl2ZS4gTWFueSBpbnN0cnVjdG9ycyBwYWlyIFdpa2lwZWRpYSB3cml0aW5nIHdpdGggY29tcGxlbWVudGFyeSBhbmFseXRpY2FsIHBhcGVyOyBzdHVkZW50c+KAmSBXaWtpcGVkaWEgYXJ0aWNsZXMgYXMgYSBsaXRlcmF0dXJlIHJldmlldywgYW5kIHRoZSBzdHVkZW50cyBnbyBvbiB0byBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGluIHRoZSBvZmZsaW5lIGFuYWx5dGljYWwgcGFwZXIuXCJcblxuXG4gIGR5a19nYTogXG4gICAgZHlrOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdkeWsnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5jbHVkZSBEWUsgU3VibWlzc2lvbnMgYXMgYW4gRXh0cmFjdXJyaWN1bGFyIFRhc2snXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdEaWQgWW91IEtub3cgKERZSyknXG4gICAgICAgIGNvbnRlbnQ6IFwiPHA+QWR2YW5jZWQgc3R1ZGVudHPigJkgYXJ0aWNsZXMgbWF5IHF1YWxpZnkgZm9yIHN1Ym1pc3Npb24gdG8gRGlkIFlvdSBLbm93IChEWUspLCBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgZmVhdHVyaW5nIG5ldyBjb250ZW50LiBUaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXgpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLjwvcD5cbiAgICAgICAgPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYnV0IGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyB+NiBob3VycyBpbiB0aGUgc3BvdGxpZ2h0LjwvcD5cbiAgICAgICAgPHA+V2Ugc3Ryb25nbHkgcmVjb21tZW5kIHRyeWluZyBmb3IgRFlLIHN0YXR1cyB5b3Vyc2VsZiBiZWZvcmVoYW5kLCBvciB3b3JraW5nIHdpdGggZXhwZXJpZW5jZWQgV2lraXBlZGlhbnMgdG8gaGVscCB5b3VyIHN0dWRlbnRzIG5hdmlnYXRlIHRoZSBEWUsgcHJvY2VzcyBzbW9vdGhseS4gSWYgeW91ciBzdHVkZW50cyBhcmUgd29ya2luZyBvbiBhIHJlbGF0ZWQgc2V0IG9mIGFydGljbGVzLCBpdCBjYW4gaGVscCB0byBjb21iaW5lIG11bHRpcGxlIGFydGljbGUgbm9taW5hdGlvbnMgaW50byBhIHNpbmdsZSBob29rOyB0aGlzIGhlbHBzIGtlZXAgeW91ciBzdHVkZW50c+KAmSB3b3JrIGZyb20gc3dhbXBpbmcgdGhlIHByb2Nlc3Mgb3IgYW50YWdvbml6aW5nIHRoZSBlZGl0b3JzIHdobyBtYWludGFpbiBpdC48L3A+XCJcbiAgICBcbiAgICBnYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZ2EnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5jbHVkZSBHb29kIEFydGljbGUgU3VibWlzc2lvbiBhcyBhbiBFeHRyYWN1cnJpY3VsYXIgVGFzaydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogJ0dvb2QgQXJ0aWNsZSAoR0EpJ1xuICAgICAgICBjb250ZW50OiBcIldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cbiAgICAgICAgPHA+VGhlIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyBwcm9jZXNzIGdlbmVyYWxseSB0YWtlcyBzb21lIHRpbWUg4oCUIGJldHdlZW4gc2V2ZXJhbCBkYXlzIGFuZCBzZXZlcmFsIHdlZWtzLCBkZXBlbmRpbmcgb24gdGhlIGludGVyZXN0IG9mIHJldmlld2VycyBhbmQgdGhlIHNpemUgb2YgdGhlIHJldmlldyBiYWNrbG9nIGluIHRoZSBzdWJqZWN0IGFyZWEg4oCUIGFuZCBzaG91bGQgb25seSBiZSB1bmRlcnRha2VuIGZvciBhcnRpY2xlcyB0aGF0IGFyZSBhbHJlYWR5IHZlcnkgZ29vZC4gVHlwaWNhbGx5LCByZXZpZXdlcnMgd2lsbCBpZGVudGlmeSBmdXJ0aGVyIHNwZWNpZmljIGFyZWFzIGZvciBpbXByb3ZlbWVudCwgYW5kIHRoZSBhcnRpY2xlIHdpbGwgYmUgcHJvbW90ZWQgdG8gR29vZCBBcnRpY2xlIHN0YXR1cyBpZiBhbGwgdGhlIHJldmlld2VycycgY29uY2VybnMgYXJlIGFkZHJlc3NlZC4gQmVjYXVzZSBvZiB0aGUgdW5jZXJ0YWluIHRpbWVsaW5lIGFuZCB0aGUgZnJlcXVlbnQgbmVlZCB0byBtYWtlIHN1YnN0YW50aWFsIGNoYW5nZXMgdG8gYXJ0aWNsZXMsIEdvb2QgQXJ0aWNsZSBub21pbmF0aW9ucyB1c3VhbGx5IG9ubHkgbWFrZSBzZW5zZSBmb3IgYXJ0aWNsZXMgdGhhdCByZWFjaCBhIG1hdHVyZSBzdGF0ZSBzZXZlcmFsIHdlZWtzIGJlZm9yZSB0aGUgZW5kIG9mIHRlcm0uPC9wPlwiXG5cblxuXG4gIGdyYWRpbmc6IFxuICAgIGxlYXJuaW5nX2Vzc2VudGlhbHM6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBFc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdsZWFybmluZ19lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnR2V0dGluZyBTdGFydGVkIHdpdGggRWRpdGluZydcbiAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBjaG9vc2luZ19hcnRpY2xlczpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBBcnRpY2xlcydcbiAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHJlc2VhcmNoX3BsYW5uaW5nOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoICYgUGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyAmIE1haW5zcGFjZSdcbiAgICAgIGlkOiAnZHJhZnRzX21haW5zcGFjZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgcGVlcl9mZWVkYmFjazpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdQZWVyIEZlZWRiYWNrJ1xuICAgICAgaWQ6ICdwZWVyX2ZlZWRiYWNrJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgQXNzaWdubWVudHMnXG4gICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG5cblxuICBvdmVydmlldzogXG4gICAgbGVhcm5pbmdfZXNzZW50aWFsczpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdMZWFybmluZyBXaWtpIEVzc2VudGlhbHMnXG4gICAgICBpZDogJ2xlYXJuaW5nX2Vzc2VudGlhbHMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG4gICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0dldHRpbmcgU3RhcnRlZCB3aXRoIEVkaXRpbmcnXG4gICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBjaG9vc2luZ19hcnRpY2xlczpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBBcnRpY2xlcydcbiAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG4gICAgcmVzZWFyY2hfcGxhbm5pbmc6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggJiBQbGFubmluZydcbiAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIGRyYWZ0c19tYWluc3BhY2U6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzICYgTWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBBc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZFN0ZXBJbnB1dHMiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFZpZXdIZWxwZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciggJ2xpbmsnLCAoIHRleHQsIHVybCApIC0+XG5cbiAgdGV4dCA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdGV4dCApXG4gIHVybCAgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHVybCApXG5cbiAgcmVzdWx0ID0gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiPicgKyB0ZXh0ICsgJzwvYT4nXG5cbiAgcmV0dXJuIG5ldyBIYW5kbGViYXJzLlNhZmVTdHJpbmcoIHJlc3VsdCApXG4pIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSAtIEFwcGxpY2F0aW9uIEluaXRpdGlhbGl6ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCcuL0FwcCcpXG5cblxuJCAtPlxuICBcbiAgIyBJbml0aWFsaXplIEFwcGxpY2F0aW9uXG4gIGFwcGxpY2F0aW9uLmluaXRpYWxpemUoKVxuXG4gICMgU3RhcnQgQmFja2JvbmUgcm91dGVyXG4gIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKVxuXG4gICIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvc3VwZXJzL01vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTW9kZWwgZXh0ZW5kcyBNb2RlbFxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgRVZFTlQgSEFORExFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIC0gUm91dGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUm91dGVzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBcbiAgcm91dGVzOlxuICAgICcnIDogJ2hvbWUnXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBIYW5kbGVyc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaG9tZTogLT5cbiAgICBpZiAkKCcjYXBwJykubGVuZ3RoID4gMFxuXG4gICAgICBAY3VycmVudFdpa2lVc2VyID0gJCggJyNhcHAnICkuYXR0cignZGF0YS13aWtpdXNlcicpXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2ludHJvJ11bJ2luc3RydWN0b3JfdXNlcm5hbWUnXVsndmFsdWUnXSA9IEBjdXJyZW50V2lraVVzZXJcblxuICAgICAgY29uc29sZS5sb2cgV2l6YXJkU3RlcElucHV0c1xuXG4gICAgICAkKCAnI2FwcCcgKS5odG1sKCBhcHBsaWNhdGlvbi5ob21lVmlldy5yZW5kZXIoKS5lbCApXG5cbiAgICBlbHNlIGlmICQoJyNsb2dpbicpLmxlbmd0aCA+IDBcbiAgICAgICQoICcjbG9naW4nICkuaHRtbCggYXBwbGljYXRpb24ubG9naW5WaWV3LnJlbmRlcigpLmVsIClcblxuXG4iLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBIb21lIFBhZ2UgVGVtcGxhdGVcXG4tLT5cXG5cXG48IS0tIE1BSU4gQVBQIENPTlRFTlQgLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuY29udGVudCAtLT5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sb2dpbl9pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxvZ2luX2luc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAgc3RlcC0tZmlyc3Qgc3RlcC0tbG9naW5cXFwiPlxcbiAgICBcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgICAgICAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgICAgICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmxvZ2luX2luc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG5cXG4gICAgICAgIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImxvZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIvYXV0aC9tZWRpYXdpa2lcXFwiPlxcbiAgICAgICAgICAgIExvZ2luIHdpdGggV2lraU1lZGlhXFxuICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgPGEgY2xhc3M9XFxcImZvbnQtYmx1ZVxcXCIgaHJlZj1cXFwiL3dlbGNvbWVcXFwiIGlkPVxcXCJza2lwTG9naW5CdXR0b25cXFwiPlxcbiAgICAgICAgICAgIDxlbT5vciBza2lwIGl0IGZvciBub3cgYW5kIGp1c3Qgc2VlIHRoZSBjdXJyZW50IGJ1aWxkPC9lbT5cXG4gICAgICAgICAgPC9hPlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1hY3Rpb25zIC0tPlxcblxcblxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwiZG90IHN0ZXAtbmF2LWluZGljYXRvcnNfX2l0ZW0gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0FjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmhhc1Zpc2l0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGRhdGEtbmF2LWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBJZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcElkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+KjwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJ2aXNpdGVkXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogU3RlcCBOYXZpZ2F0aW9uIFxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBOQVYgRE9UIElORElDQVRPUlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtaW5kaWNhdG9ycyBoaWRkZW5cXFwiPlxcblxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnN0ZXBzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWluZGljYXRvcnMgLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIE5BViBCVVRUT05TIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnNcXFwiPlxcblxcbiAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLXByZXYgcHJldlxcXCI+XFxuICAgIDxzcGFuIHN0eWxlPVxcXCJtYXJnaW4tcmlnaHQ6NXB4O1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLWxlZnRcXFwiPjwvZGl2PlxcbiAgICA8L3NwYW4+XFxuICAgIFByZXZcXG4gIDwvYT5cXG5cXG4gIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IG5leHRcXFwiPlxcbiAgICBOZXh0XFxuICAgIDxzcGFuIHN0eWxlPVxcXCJtYXJnaW4tbGVmdDo1cHg7XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tcmlnaHRcXFwiPjwvZGl2PlxcbiAgICA8L3NwYW4+XFxuICA8L2E+XFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWJ1dHRvbnMgLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgPHAgY2xhc3M9XFxcImxhcmdlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFxcbiAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgXFxuICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuICA8IS0tIElOVFJPIFNURVAgRk9STSBBUkVBIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj5cXG4gICAgPCEtLSBmb3JtIGZpZWxkcyAtLT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taW5uZXIgLS0+XFxuXFxuXFxuICA8IS0tIERBVEVTIE1PRFVMRSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1kYXRlc1xcXCI+XFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWRhdGVzIC0tPlxcblxcbiAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlXFxcIiBpZD1cXFwiYmVnaW5CdXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPlxcbiAgICAgIEJlZ2luIEFzc2lnbm1lbnQgV2l6YXJkXFxuICAgIDwvYT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluZm9UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5mb1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICBcXG4gICAgICA8IS0tIElORk8gU0VDVElPTiBIRUFERVIgLS0+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gQ09OVEVOVCAtLT5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19jb250ZW50IC0tPlxcblxcbiAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhblwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlclxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXIgLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgICAgXFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFpbiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBGT1JNIDogTGVmdCBTaWRlIG9mIFN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L2Rpdj5cXG5cXG4gIFxcbiAgPCEtLSBTVEVQIEZPUk0gSU5ORVIgQ09OVEVOVCAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIFxcbiAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICA8YSBjbGFzcz1cXFwibWFpbi1sb2dvXFxcIiBocmVmPVxcXCJodHRwOi8vd2lraWVkdS5vcmdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiB0aXRsZT1cXFwid2lraWVkdS5vcmdcXFwiPldJS0lFRFUuT1JHPC9hPlxcblxcbiAgPCEtLSBTVEVQIElORk8gSU5ORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8taW5uZXJcXFwiPlxcblxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluZm9UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICBcXG4gICAgPCEtLSBJTkZPIFNFQ1RJT05TIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuICBcXG5cXG5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8gLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPHA+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3A+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxsaSBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2xpPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tZ3JpZFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGV4dCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGV4dDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mbyBzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG48YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19pbm5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2sgXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QXNzaWdubWVudCB0eXBlOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190ZXh0XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5kZXNjcmlwdGlvbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvZGl2PlxcblxcbiAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TWluaW11bSB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubWluX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5taW5fdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlJlY29tbWVuZGVkIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5yZWNfdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnJlY190aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5CZXN0IGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmJlc3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk5vdCBhcHByb3ByaWF0ZSBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5ub3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkxlYXJuaW5nIE9iamVjdGl2ZXM8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5sZWFybmluZ19vYmplY3RpdmVzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPHA+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmNvbnRlbnQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmNvbnRlbnQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG4gIDxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJjaGVjay1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZCBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBkYXRhLWV4Y2x1c2l2ZT1cXFwidHJ1ZVxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1jaGVja2JveC1ncm91cFxcXCIgZGF0YS1jaGVja2JveC1ncm91cD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWNoZWNrYm94LWdyb3VwX19sYWJlbFxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2Rpdj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgLz5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0dW0taW5wdXQtLXNlbGVjdCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5tdWx0aXBsZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgPHNlbGVjdCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubXVsdGlwbGUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICAgIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNiwgcHJvZ3JhbTE2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9zZWxlY3Q+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjdXN0dW0taW5wdXQtLXNlbGVjdC0tbXVsdGkgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG11bHRpcGxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9vcHRpb24+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tdGV4dFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXRleHRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGlucHV0IGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50eXBlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcGxhY2Vob2xkZXI9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wbGFjZWhvbGRlcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiAvPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1wZXJjZW50XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tcGVyY2VudF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1jb250YWluZXJcXFwiPlxcbiAgICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50eXBlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcGxhY2Vob2xkZXI9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wbGFjZWhvbGRlcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBtYXhsZW5ndGg9XFxcIjJcXFwiIC8+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1lZGl0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8YSBjbGFzcz1cXFwiZWRpdC1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPmVkaXQ8L2E+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9fY29udGVudFxcXCI+XFxuICAgIDwhLS0gY29udGVudCAtLT5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tdGV4dGFyZWFcXFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gIDx0ZXh0YXJlYSBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcGxhY2Vob2xkZXI9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wbGFjZWhvbGRlcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiByb3dzPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucm93cykpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj48L3RleHRhcmVhPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyX19oZWFkZXJcXFwiPlxcbiAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2gyPlxcbiAgPC9kaXY+XFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjcsIHByb2dyYW0yNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTI3KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW9cXFwiPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyX19oZWFkZXJcXFwiPlxcbiAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXIgY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyLS1ncm91cFxcXCI+XFxuICBcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMCwgcHJvZ3JhbTMwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMzAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3hHcm91cCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3QpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTEsIHByb2dyYW0xMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE4LCBwcm9ncmFtMTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVyY2VudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjIsIHByb2dyYW0yMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0YXJlYSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI2LCBwcm9ncmFtMjYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Hcm91cCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyOSwgcHJvZ3JhbTI5LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IE1hcmt1cCBmb3IgU3RhcnQvRW5kIERhdGUgSW5wdXQgTW9kdWxlXFxuLS0+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzXFxcIj5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19faW5uZXIgZnJvbVxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tbW9udGhcXFwiPlxcbiAgICBcXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJtb250aFxcXCIgaWQ9XFxcIm1vbnRoU3RhcnRcXFwiIG5hbWU9XFxcIm1vbnRoU3RhcnRcXFwiPlxcbiAgICAgICAgPG9wdGlvbj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTI8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tZGF5XFxcIj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJkYXlcXFwiIGlkPVxcXCJkYXlTdGFydFxcXCIgbmFtZT1cXFwiZGF5U3RhcnRcXFwiPlxcbiAgICAgICAgPG9wdGlvbj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+Mjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+Mjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MzA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MzE8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0teWVhclxcXCI+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwieWVhclxcXCIgaWQ9XFxcInllYXJTdGFydFxcXCIgbmFtZT1cXFwieWVhclN0YXJ0XFxcIj5cXG4gICAgICAgIDxvcHRpb24+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjY8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG4gIDxzcGFuIGNsYXNzPVxcXCJkYXRlcy10b1xcXCI+XFxuICAgIHRvXFxuICA8L3NwYW4+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2lubmVyIHRvXFxcIj5cXG4gICAgXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tbW9udGhcXFwiPlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcIm1vbnRoXFxcIiBpZD1cXFwibW9udGhFbmRcXFwiIG5hbWU9XFxcIm1vbnRoRW5kXFxcIj5cXG4gICAgICAgIDxvcHRpb24+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEyPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLWRheVxcXCI+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZGF5XFxcIiBpZD1cXFwiZGF5RW5kXFxcIiBuYW1lPVxcXCJkYXlFbmRcXFwiPlxcbiAgICAgICAgPG9wdGlvbj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MDk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+Mjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+Mjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MzA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MzE8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0teWVhclxcXCI+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwieWVhclxcXCIgaWQ9XFxcInllYXJFbmRcXFwiIG5hbWU9XFxcInllYXJFbmRcXFwiPlxcbiAgICAgICAgPG9wdGlvbj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyNjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiO1xuXG5cbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcInt7Y291cnNlIGRldGFpbHMgfCBjb3Vyc2VfbmFtZSA9IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5jb3Vyc2VfbmFtZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuY291cnNlX25hbWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgaW5zdHJ1Y3Rvcl91c2VybmFtZSA9IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0cnVjdG9yX3VzZXJuYW1lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbnN0cnVjdG9yX3VzZXJuYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IGluc3RydWN0b3JfcmVhbG5hbWUgPSBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdHJ1Y3Rvcl9yZWFsbmFtZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rvcl9yZWFsbmFtZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBzdWJqZWN0ID0gXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN1YmplY3QpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN1YmplY3Q7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgc3RhcnRfZGF0ZSA9IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGFydF9kYXRlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFydF9kYXRlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IGVuZF9kYXRlID0gXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmVuZF9kYXRlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5lbmRfZGF0ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBpbnN0aXR1dGlvbiA9IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0aXR1dGlvbikgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdGl0dXRpb247IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZXhwZWN0ZWRfc3R1ZGVudHMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmV4cGVjdGVkX3N0dWRlbnRzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB9fVxcbjxici8+XFxuPT1UaW1lbGluZT09XFxuPGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2VlayB8IDEgfCBXaWtpcGVkaWEgZXNzZW50aWFscyB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luIGNsYXNzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbnRybyB0byBXaWtpcGVkaWF9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCAyIHwgRWRpdGluZyBiYXNpY3MgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDMgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSB0aGUgdHJhaW5pbmd9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NyZWF0ZSB1c2VycGFnZSBhbmQgc2lnbiB1cH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWlsZXN0b25lc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgZW5yb2xsZWR9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCAzIHwgRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhIGluIGNsYXNzfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayA0IH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYW4gYXJ0aWNsZX19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2VlayB8IDQgfCBVc2luZyBzb3VyY2VzIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1VzaW5nIHNvdXJjZXMgaW4gY2xhc3N9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDV9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FkZCB0byBhbiBhcnRpY2xlfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9MaXN0IGFydGljbGUgY2hvaWNlc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gV2VlayA1fX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgNSB8IENob29zaW5nIGFydGljbGVzIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayA2IH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXN9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBpbGUgYSBiaWJsaW9ncmFwaHl9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCA2IHwgRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luIGNsYXNzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayA3IH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NaWxlc3RvbmVzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBoYXZlIHN0YXJ0ZWQgZWRpdGluZ319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2VlayB8IDcgfCBNb3ZpbmcgYXJ0aWNsZXMgdG8gdGhlIG1haW4gc3BhY2UgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgOCB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01vdmUgdG8gbWFpbiBzcGFjZX19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBhbmQgeW91ciBhcnRpY2xlfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgOCB8IEJ1aWxkaW5nIGFydGljbGVzIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV29ya3Nob3B9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayA5IH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IHR3byB9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCA5IHwgR2V0dGluZyBhbmQgZ2l2aW5nIGZlZWRiYWNrIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0dyb3VwIHN1Z2dlc3Rpb25zfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayAxMCB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSB0d28gfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NaWxlc3RvbmVzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BcnRpY2xlcyBoYXZlIGJlZW4gcmV2aWV3ZWR9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCAxMCB8IFJlc3BvbmRpbmcgdG8gZmVlZGJhY2sgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWVkaWEgbGl0ZXJhY3kgZGlzY3Vzc2lvbn19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTEgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NYWtlIGVkaXRzIGJhc2VkIG9uIHBlZXIgcmV2aWV3c319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCAxMSB8IENsYXNzIHByZXNlbnRhdGlvbnMgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTIgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9GaW5hbCB0b3VjaGVzIHRvIGFydGljbGVzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9SZWZsZWN0aXZlIGVzc2F5fX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgMTIgfCBEdWUgZGF0ZSB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01pbGVzdG9uZXN9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FsbCBzdHVkZW50cyBmaW5pc2hlZH19PGJyLz5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FkZCB0byBhbiBhcnRpY2xlfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbGx1c3RyYXRlIGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0xpc3QgYXJ0aWNsZSBjaG9pY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIGFydGljbGVzIGZyb20gYSBsaXN0fX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRyYWZ0c19tYWluc3BhY2UpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2FuZGJveCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRyYWZ0c19tYWluc3BhY2UpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud29ya19saXZlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOCwgcHJvZ3JhbTE4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfX1cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyB9fVxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL091dGxpbmUgYXMgbGVhZCBzZWN0aW9uIH19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RZSyBub21pbmF0aW9uc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9ufX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgQ2xhc3MgcHJlc2VudGF0aW9ucyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgRmluaXNoaW5nIFRvdWNoZXMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luLWNsYXNzIHByZXNlbnRhdGlvbnN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9SZWZsZWN0aXZlIGVzc2F5fX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2lraXBlZGlhIHBvcnRmb2xpb319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL09yaWdpbmFsIGFyZ3VtZW50IHBhcGVyfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcInt7Y291cnNlIGRldGFpbHMgfCBjb3Vyc2VfbmFtZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3Vyc2VfbmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW5zdHJ1Y3Rvcl91c2VybmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGluc3RydWN0b3JfcmVhbG5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGVhY2hlcikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IHN1YmplY3QgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3ViamVjdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IHN0YXJ0X2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3RhcnRfZGF0ZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGVuZF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVuZF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIHwgaW5zdGl0dXRpb24gPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2Nob29sKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfX1cXG5cXG5cIjtcbiAgaWYgKHN0YWNrMiA9IGhlbHBlcnMuZGVzY3JpcHRpb24pIHsgc3RhY2syID0gc3RhY2syLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2syID0gZGVwdGgwLmRlc2NyaXB0aW9uOyBzdGFjazIgPSB0eXBlb2Ygc3RhY2syID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazIuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazIpXG4gICAgKyBcIlxcblxcbj09VGltZWxpbmU9PVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxIHwgV2lraXBlZGlhIGVzc2VudGlhbHMgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW50cm8gdG8gV2lraXBlZGlhfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMiB8IEVkaXRpbmcgYmFzaWNzIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgdGhlIHRyYWluaW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBlbnJvbGxlZH19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDMgfCBFeHBsb3JpbmcgdGhlIHRvcGljIGFyZWF9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBsb3JpbmcgdGhlIHRvcGljIGFyZWEgaW4gY2xhc3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNCB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jcml0aXF1ZV9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY29weV9lZGl0X2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA0IHwgVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvVXNpbmcgc291cmNlcyBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA1fX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuYWRkX3RvX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pbGx1c3RyYXRlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTEsIHByb2dyYW0xMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gV2VlayA1fX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNSB8IEZpbmFsaXppbmcgdG9waWNzIGFuZCBzdGFydGluZyByZXNlYXJjaCB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA2IH19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGlsZSBhIGJpYmxpb2dyYXBoeX19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDYgfCBEcmFmdGluZyBzdGFydGVyIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNyB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnJlc2VhcmNoX3BsYW5uaW5nKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNyZWF0ZV9vdXRsaW5lKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNSwgcHJvZ3JhbTE1LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnJlc2VhcmNoX3BsYW5uaW5nKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndyaXRlX2xlYWQpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIwLCBwcm9ncmFtMjAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBoYXZlIHN0YXJ0ZWQgZWRpdGluZ319XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDcgfCBNb3ZpbmcgYXJ0aWNsZXMgdG8gdGhlIG1haW4gc3BhY2UgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA4IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01vdmUgdG8gbWFpbiBzcGFjZX19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrX2dhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjIsIHByb2dyYW0yMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwYW5kIHlvdXIgYXJ0aWNsZX19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDggfCBCdWlsZGluZyBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7Y2xhc3Mgd29ya3Nob3B9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA5IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIG9uZSBwZWVyIHJldmlldyBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzfCBwZWVycmV2aWV3bnVtYmVyID0gdHdvIH19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDkgfCBHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2sgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTAgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gb25lIHBlZXIgcmV2aWV3fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IHR3byB9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMTAgfCBSZXNwb25kaW5nIHRvIGZlZWRiYWNrIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01lZGlhIGxpdGVyYWN5IGRpc2N1c3Npb259fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTEgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3N9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxMSB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDI4LCBwcm9ncmFtMjgsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyNiwgcHJvZ3JhbTI2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMCwgcHJvZ3JhbTMwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZWZsZWN0aXZlX2Vzc2F5KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMiwgcHJvZ3JhbTMyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucG9ydGZvbGlvKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzNCwgcHJvZ3JhbTM0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3JpZ2luYWxfcGFwZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDM2LCBwcm9ncmFtMzYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDEyIHwgRHVlIGRhdGUgfX1cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FsbCBzdHVkZW50cyBmaW5pc2hlZH19XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IGdyYWRpbmcgfCBDb21wbGV0aW9uIG9mIFdpa2lwZWRpYSB0cmFpbmluZyB8IDEgcG9pbnQgfCBcXFwiUHJhY3RpY2Ugb24td2lraSBjb21tdW5pY2F0aW9uXFxcIiBleGVyY2lzZSB8IDEgcG9pbnQgfCBcXFwiQ29weWVkaXQgYW4gYXJ0aWNsZVxcXCIgZXhlcmNpc2UgfCAxIHBvaW50IHwgXFxcIkV2YWx1YXRlIGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlXFxcIiB8IDEgcG9pbnQgfCBcXFwiQWRkIHRvIGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlIHwgMSBwb2ludCB8IFxcXCJJbGx1c3RyYXRlIGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlIHwgMSBwb2ludCB8IFF1YWxpdHkgb2YgYmlibGlvZ3JhcGh5IGFuZCBvdXRsaW5lIHwgMiBwb2ludHMgfCBQZWVyIHJldmlld3MgYW5kIGNvbGxhYm9yYXRpb24gd2l0aCBjbGFzc21hdGVzIHwgMiBwb2ludHMgfCBQYXJ0aWNpcGF0aW9uIGluIGNsYXNzIGRpc2N1c3Npb25zIHwgMiBwb2ludHMgfCBRdWFsaXR5IG9mIHlvdXIgbWFpbiBXaWtpcGVkaWEgY29udHJpYnV0aW9ucyB8IDEwIHBvaW50cyB8IFJlZmxlY3RpdmUgZXNzYXkgfCAyIHBvaW50cyB8IE9yaWdpbmFsIGFyZ3VtZW50IHBhcGVyIHwgMTAgcG9pbnRzIHwgSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIGNvbnRyaWJ1dGlvbnMgfCAyIHBvaW50c319XFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkhvbWVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzJylcbk91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9PdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBJTklUXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6cHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9DbGlja0hhbmRsZXInXG5cbiAgICAnc3RlcDplZGl0JyA6ICdlZGl0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3RpcHM6aGlkZScgOiAnaGlkZUFsbFRpcHMnXG5cblxuXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSkpXG5cbiAgICB1bmxlc3MgQHN0ZXBzUmVuZGVyZWRcbiAgICBcbiAgICAgIEBhZnRlclJlbmRlcigpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICAjU1VCVklFV1NcbiAgICBAU3RlcE5hdiA9IG5ldyBTdGVwTmF2VmlldygpXG5cbiAgICAjIFRIRSBGT0xMV0lORyBDT1VMRCBQUk9CQUJMWSBIQVBQRU4gSU4gQSBDT0xMRVRJT04gVklFVyBDTEFTUyBUTyBDT05UUk9MIEFMTCBTVEVQU1xuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAJGlubmVyQ29udGFpbmVyID0gQCRlbC5maW5kKCcuY29udGVudCcpXG5cbiAgICAjIFNFVFVQIFNURVBTIEFORCBSRVRVUk4gQVJSQVkgT0YgVklFV1NcbiAgICBAc3RlcFZpZXdzID0gQF9jcmVhdGVTdGVwVmlld3MoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuICAgICAgQHNob3dDdXJyZW50U3RlcCgpXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG5cbiAgX2NyZWF0ZVN0ZXBWaWV3czogLT5cbiAgICBcbiAgICBfdmlld3MgPSBbXVxuXG4gICAgXy5lYWNoKGFwcGxpY2F0aW9uLmRhdGEsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcbiAgICAgIClcblxuICAgICAgbmV3dmlldyA9IG5ldyBTdGVwVmlldyhcbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgaW5kZXggKyAxKVxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIGluZGV4IClcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIF92aWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICApXG5cbiAgICByZXR1cm4gX3ZpZXdzXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgcmV0dXJuIHtcblxuICAgICAgY29udGVudDogXCJUaGlzIGlzIHNwZWNpYWwgY29udGVudFwiXG5cbiAgICB9XG4gICAgXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQ1VTVE9NIEZVTkNUSU9OU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4gIGFkdmFuY2VTdGVwOiAtPlxuICAgIEBjdXJyZW50U3RlcCs9MVxuICAgIFxuICAgIGlmIEBjdXJyZW50U3RlcCA9PSBAc3RlcFZpZXdzLmxlbmd0aCBcbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICBkZWNyZW1lbnRTdGVwOiAtPlxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuICAgICAgQGN1cnJlbnRTdGVwID0gQHN0ZXBWaWV3cy5sZW5ndGggLSAxXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cblxuICB1cGRhdGVTdGVwOiAoaW5kZXgpIC0+XG4gICAgQGN1cnJlbnRTdGVwID0gaW5kZXhcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHNob3dDdXJyZW50U3RlcDogLT5cbiAgICBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uc2hvdygpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOnVwZGF0ZScsIEBjdXJyZW50U3RlcClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGN1cnJlbnRTdGVwVmlldzogLT5cbiAgICByZXR1cm4gQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdXG5cblxuXG4gIGhpZGVBbGxTdGVwczogLT5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG4gICAgICBzdGVwVmlldy5oaWRlKClcbiAgICApXG5cblxuXG4gIGhpZGVBbGxUaXBzOiAoZSkgLT5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG4gICAgICBzdGVwVmlldy50aXBWaXNpYmxlID0gZmFsc2VcbiAgICApXG5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogLT5cbiAgICBAYWR2YW5jZVN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG5cbiAgcHJldkNsaWNrSGFuZGxlcjogLT5cbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZWRpdENsaWNrSGFuZGxlcjogKGlkKSAtPlxuICAgIGNvbnNvbGUubG9nIGlkXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsICh2aWV3LCBpbmRleCkgPT5cbiAgICAgIGlmIHZpZXcubW9kZWwuaWQgPT0gaWRcbiAgICAgICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG4gICAgKVxuXG4gIGdvdG9DbGlja0hhbmRsZXI6IChpbmRleCkgLT5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL0lucHV0VmlldycpXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgSW5wdXRWaWV3IFxuXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkxvZ2luVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMnKVxuXG5XaXphcmRDb250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb250ZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IExvZ2luVGVtcGxhdGVcblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIHJldHVybiBXaXphcmRDb250ZW50WzBdIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L091dHB1dFRlbXBsYXRlLmhicycpXG5cbldpa2lPdXRwdXRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicycpXG5cbkNvdXJzZURldGFpbHNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicycpXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBXaWtpT3V0cHV0VGVtcGxhdGVcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnd2l6YXJkOnB1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJyBcblxuXG4gIG91dHB1dFBsYWluVGV4dDogLT5cblxuICAgIEByZW5kZXIoKVxuXG4gICAgcmV0dXJuIEAkZWwudGV4dCgpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQHBvcHVsYXRlT3V0cHV0KCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcG9wdWxhdGVPdXRwdXQ6IC0+XG5cbiAgICByZXR1cm4gQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpIClcblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICByZXR1cm4gXy5leHRlbmQoV2l6YXJkU3RlcElucHV0cyx7IGRlc2NyaXB0aW9uOiAkKCcjc2hvcnRfZGVzY3JpcHRpb24nKS52YWwoKX0pXG5cblxuICBleHBvcnREYXRhOiAoZm9ybURhdGEpIC0+XG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcblxuICAgICAgICB3aWtpdGV4dDogZm9ybURhdGFcblxuICAgICAgICBjb3Vyc2VfdGl0bGU6IFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWVcblxuICAgICAgc3VjY2VzczogKHJlc3BvbnNlKSAtPlxuXG4gICAgICAgICQoJyNwdWJsaXNoJykucmVtb3ZlQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAgIGlmIHJlc3BvbnNlLnN1Y2Nlc3NcblxuICAgICAgICAgIG5ld1BhZ2UgPSBcImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvI3tyZXNwb25zZS50aXRsZX1cIlxuXG4gICAgICAgICAgYWxlcnQoXCJDb25ncmF0cyEgWW91IGhhdmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQvZWRpdGVkIGEgV2lraWVkdSBDb3Vyc2UgYXQgI3tuZXdQYWdlfVwiKVxuXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBuZXdQYWdlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgY29uc29sZS5sb2cgcmVzcG9uc2VcblxuICAgICAgICAgIGFsZXJ0KCd0aGVyZSB3YXMgYW4gZXJyb3IuIHNlZSBjb25zb2xlLicpXG5cblxuICAgIClcbiAgICBcblxuICBwdWJsaXNoSGFuZGxlcjogLT5cblxuICAgIGlmIFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWUubGVuZ3RoID4gMCBcblxuICAgICAgJCgnI3B1Ymxpc2gnKS5hZGRDbGFzcygncHJvY2Vzc2luZycpXG5cbiAgICAgIEBleHBvcnREYXRhKEBwb3B1bGF0ZU91dHB1dCgpKVxuXG4gICAgZWxzZVxuXG4gICAgICBhbGVydCgnWW91IG11c3QgZW50ZXIgYSBjb3Vyc2UgdGl0bGUgYXMgdGhpcyB3aWxsIGJlY29tZSB0aGUgdGl0bGUgb2YgeW91ciBjb3Vyc2UgcGFnZS4nKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnaW50cm8nKVxuXG4gICAgICBzZXRUaW1lb3V0KD0+XG5cbiAgICAgICAgJCgnI2NvdXJzZV9uYW1lJykuZm9jdXMoKVxuXG4gICAgICAsNTAwKVxuXG5cbiAgICBcblxuICAgIFxuXG4gICAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE5hdlZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuU3RlcE5hdlRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE5hdlZpZXcgZXh0ZW5kcyBWaWV3XG5cblxuICBjbGFzc05hbWU6ICdzdGVwLW5hdidcblxuXG4gIHRlbXBsYXRlOiBTdGVwTmF2VGVtcGxhdGVcblxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cblxuXG4gIHN1YnNjcmlwdGlvbnM6XG4gICAgJ3N0ZXA6dXBkYXRlJyA6ICd1cGRhdGVDdXJyZW50U3RlcCdcbiAgICAnc3RlcDphbnN3ZXJlZCcgOiAnc3RlcEFuc3dlcmVkJ1xuXG5cbiAgZXZlbnRzOiAtPlxuICAgICdjbGljayAubmV4dCcgOiAnbmV4dENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAucHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZG90JyAgOiAnZG90Q2xpY2tIYW5kbGVyJ1xuXG5cblxuICByZW5kZXI6IC0+XG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA8IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdjb250cmFjdGVkJylcblxuICAgIGVsc2UgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPT0gQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2NvbnRyYWN0ZWQnKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdjb250cmFjdGVkJylcblxuICAgICAgQCRlbC5hZGRDbGFzcygnaGlkZGVuJylcblxuICAgIEBhZnRlclJlbmRlcigpXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgcmV0dXJuIHtcblxuICAgICAgY3VycmVudDogQGN1cnJlbnRTdGVwXG5cbiAgICAgIHRvdGFsOiBAdG90YWxTdGVwc1xuXG4gICAgICBwcmV2SW5hY3RpdmU6IEBpc0luYWN0aXZlKCdwcmV2JylcblxuICAgICAgbmV4dEluYWN0aXZlOiBAaXNJbmFjdGl2ZSgnbmV4dCcpXG5cbiAgICAgIHN0ZXBzOiA9PlxuXG4gICAgICAgIG91dCA9IFtdXG4gICAgICAgIF8uZWFjaChAc3RlcFZpZXdzLCAoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgICAgICBzdGVwRGF0YSA9IHN0ZXAubW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICAgICAgaXNBY3RpdmUgPSBAY3VycmVudFN0ZXAgaXMgaW5kZXhcblxuICAgICAgICAgICMgd2FzVmlzaXRlZCA9IGluZGV4IDwgQGN1cnJlbnRTdGVwXG5cbiAgICAgICAgICB3YXNWaXNpdGVkID0gc3RlcC5oYXNVc2VyVmlzaXRlZFxuXG4gICAgICAgICAgb3V0LnB1c2gge2lkOiBpbmRleCwgaXNBY3RpdmU6IGlzQWN0aXZlLCBoYXNWaXNpdGVkOiB3YXNWaXNpdGVkLCBzdGVwVGl0bGU6IHN0ZXBEYXRhLnRpdGxlLCBzdGVwSWQ6IHN0ZXBEYXRhLmlkfVxuXG4gICAgICAgIClcblxuICAgICAgICByZXR1cm4gb3V0XG5cbiAgICB9XG5cblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuICAgIHJldHVybiBAXG5cblxuXG4gIHByZXZDbGlja0hhbmRsZXI6IC0+XG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpwcmV2JylcblxuXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogLT5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICBkb3RDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgJHRhcmdldC5kYXRhKCduYXYtaWQnKSlcblxuXG5cbiAgdXBkYXRlQ3VycmVudFN0ZXA6IChzdGVwKSAtPlxuICAgIEBjdXJyZW50U3RlcCA9IHN0ZXBcblxuICAgIEByZW5kZXIoKVxuXG5cbiAgc3RlcEFuc3dlcmVkOiAoc3RlcFZpZXcpIC0+XG4gICAgQHJlbmRlcigpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGlzSW5hY3RpdmU6IChpdGVtKSAtPlxuXG4gICAgaXRJcyA9IHRydWVcblxuICAgIGlmIGl0ZW0gPT0gJ3ByZXYnXG5cbiAgICAgIGl0SXMgPSBAY3VycmVudFN0ZXAgaXMgMVxuXG4gICAgZWxzZSBpZiBpdGVtID09ICduZXh0J1xuXG4gICAgICBpdElzID0gQGN1cnJlbnRTdGVwIGlzIEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgcmV0dXJuIGl0SXNcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcFZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuI0FQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiNWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jU1VCVklFV1NcbklucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9JbnB1dEl0ZW1WaWV3JylcblxuI1RFTVBMQVRFU1xuU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5JbnRyb1N0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9JbnRyb1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5JbnB1dFRpcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2luZm8vSW5wdXRUaXBUZW1wbGF0ZS5oYnMnKVxuXG5Db3Vyc2VUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicycpXG5cbldpa2lEYXRlc01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMnKVxuXG4jREFUQVxuQ291cnNlSW5mb0RhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZENvdXJzZUluZm8nKVxuXG4jT1VUUFVUXG5Bc3NpZ25tZW50RGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEnKVxuXG4jSU5QVVRTXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcCdcblxuXG4gIHRhZ05hbWU6ICdzZWN0aW9uJ1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBUZW1wbGF0ZVxuXG5cbiAgaW50cm9UZW1wbGF0ZTogSW50cm9TdGVwVGVtcGxhdGVcblxuXG4gIHRpcFRlbXBsYXRlOiBJbnB1dFRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvVGVtcGxhdGU6IENvdXJzZVRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvRGF0YTogQ291cnNlSW5mb0RhdGFcblxuXG4gIGRhdGVzTW9kdWxlOiBXaWtpRGF0ZXNNb2R1bGVcblxuXG4gIHN0ZXBJbnB1dERhdGE6IFdpemFyZFN0ZXBJbnB1dHNcblxuXG4gIGhhc1VzZXJBbnN3ZXJlZDogZmFsc2VcblxuXG4gIGhhc1VzZXJWaXNpdGVkOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlRTIEFORCBIQU5ETEVSU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6XG4gICAgJ2NsaWNrIGlucHV0JyA6ICdpbnB1dEhhbmRsZXInXG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuXG5cbiAgZWRpdENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgc3RlcElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc3RlcC1pZCcpXG5cbiAgICBpZiBzdGVwSWRcbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsIHN0ZXBJZClcblxuXG5cbiAgYWNjb3JkaWFuQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZiAkdGFyZ2V0Lmhhc0NsYXNzKCdvcGVuJylcblxuICAgICAgJHRhcmdldC5yZW1vdmVDbGFzcygnb3BlbicpXG5cbiAgICBlbHNlIGlmICQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWluZm8nKS5maW5kKCcuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicpLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICR0YXJnZXQuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgICAsNTAwKVxuXG4gICAgZWxzZVxuXG4gICAgICAkdGFyZ2V0LmFkZENsYXNzKCdvcGVuJylcblxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnd2l6YXJkOnB1Ymxpc2gnKVxuXG5cbiAgXG4gIHJlbmRlcjogLT5cblxuICAgIEB0aXBWaXNpYmxlID0gZmFsc2VcblxuICAgIGlmIEBtb2RlbC5nZXQoJ3N0ZXBOdW1iZXInKSA9PSAxXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3N0ZXAtLWZpcnN0JykuaHRtbCggQGludHJvVGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG4gICAgICAjQUREIFNUQVJUL0VORCBEQVRFUyBNT0RVTEVcbiAgICAgICRkYXRlcyA9ICQoQGRhdGVzTW9kdWxlKCkpXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1kYXRlcycpLmh0bWwoJGRhdGVzKVxuICAgICAgXG4gICAgZWxzZVxuICAgICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG5cbiAgICBAaW5wdXRTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgIEAkdGlwU2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtaW5mby10aXBzJylcblxuICAgIEBpbnB1dERhdGEgPSBAc3RlcElucHV0RGF0YVtAbW9kZWwuYXR0cmlidXRlcy5pZF0gfHwgW11cblxuXG4gICAgXy5lYWNoKEBpbnB1dERhdGEsIChpbnB1dCwgaW5kZXgpID0+XG5cbiAgICAgIHVubGVzcyBpbnB1dC50eXBlIFxuICAgICAgICByZXR1cm5cblxuICAgICAgaW5wdXRWaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ldyBCYWNrYm9uZS5Nb2RlbChpbnB1dClcblxuICAgICAgKVxuXG4gICAgICBpbnB1dFZpZXcuaW5wdXRUeXBlID0gaW5wdXQudHlwZVxuXG4gICAgICBpbnB1dFZpZXcuaXRlbUluZGV4ID0gaW5kZXhcblxuICAgICAgaW5wdXRWaWV3LnBhcmVudFN0ZXAgPSBAXG5cbiAgICAgIEBpbnB1dFNlY3Rpb24uYXBwZW5kKGlucHV0Vmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgaW5wdXQudGlwSW5mb1xuXG4gICAgICAgIHRpcCA9IFxuXG4gICAgICAgICAgaWQ6IGluZGV4XG5cbiAgICAgICAgICB0aXRsZTogaW5wdXQudGlwSW5mby50aXRsZVxuXG4gICAgICAgICAgY29udGVudDogaW5wdXQudGlwSW5mby5jb250ZW50XG5cbiAgICAgICAgJHRpcEVsID0gQHRpcFRlbXBsYXRlKHRpcClcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuaGFzQ291cnNlSW5mb1xuXG4gICAgICAgIGluZm9EYXRhID0gXy5leHRlbmQoQGNvdXJzZUluZm9EYXRhW2lucHV0LmlkXSwge2lkOiBpbmRleH0gKVxuXG4gICAgICAgICR0aXBFbCA9IEBjb3Vyc2VJbmZvVGVtcGxhdGUoaW5mb0RhdGEpXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgKVxuXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuICAgIEAkaW5wdXRDb250YWluZXJzID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0JylcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGhpZGU6IC0+XG4gICAgQCRlbC5oaWRlKClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIHNob3c6IC0+XG4gICAgQCRlbC5zaG93KClcbiAgICBAaGFzVXNlclZpc2l0ZWQgPSB0cnVlXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgYmVnaW5IYW5kbGVyOiAtPlxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuXG4gIHVwZGF0ZVVzZXJBbnN3ZXI6IChib29sKSAtPlxuICAgIEBoYXNVc2VyQW5zd2VyZWQgPSBib29sXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmFuc3dlcmVkJywgQClcblxuICAgIHJldHVybiBAXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlKSAtPlxuICAgIFxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgb3V0ID0gXG4gICAgICB0eXBlOiBpbnB1dFR5cGVcblxuICAgICAgaWQ6IGlkXG5cbiAgICAgIHZhbHVlOiB2YWx1ZVxuXG5cbiAgICBpZiBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94JyB8fCBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICBpZiB2YWx1ZSA9PSAnb24nXG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgZWxzZVxuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG5cbiAgICBlbHNlIGlmIGlucHV0VHlwZSA9PSAndGV4dCdcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS52YWx1ZSA9IHZhbHVlXG5cblxuICAgIHJldHVybiBAXG4gICAgXG5cblxuICBpbnB1dEhhbmRsZXI6IChlKSAtPlxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnQgPSAkdGFyZ2V0LnBhcmVudHMoJy5jdXN0b20taW5wdXQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuZGF0YSgnZXhjbHVzaXZlJylcblxuICAgICAgaWYgJHRhcmdldC5pcygnOmNoZWNrZWQnKSBcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEAkaW5wdXRDb250YWluZXJzLmZpbmQoJ2lucHV0Jykubm90KCR0YXJnZXQpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgIGVsc2VcblxuICAgICAgJGV4Y2x1c2l2ZSA9IEAkZWwuZmluZCgnW2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpXG5cbiAgICAgIGlmICRleGNsdXNpdmUubGVuZ3RoID4gMFxuXG4gICAgICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgICAgICRleGNsdXNpdmUuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAkZXhjbHVzaXZlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG5cblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cblxuXG5cbiAgICBcbiAgICBcblxuIFxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBJbnB1dEl0ZW1WaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi9WaWV3JylcblxuXG4jVEVNUExBVEVTXG5JbnB1dEl0ZW1UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uLy4uL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzJylcblxuXG4jT1VUUFVUXG5Bc3NpZ25tZW50RGF0YSA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEnKVxuXG5cbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIElucHV0SXRlbVZpZXcgZXh0ZW5kcyBWaWV3IFxuXG5cbiAgdGVtcGxhdGU6IElucHV0SXRlbVRlbXBsYXRlXG5cblxuICBjbGFzc05hbWU6ICdjdXN0b20taW5wdXQtd3JhcHBlcidcblxuXG4gIGhvdmVyVGltZTogNTAwXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBFdmVudHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZXZlbnRzOiBcbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwidGV4dFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tY2hlY2tib3ggbGFiZWwgc3BhbicgOiAnY2hlY2tCdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnbW91c2VvdmVyJyA6ICdtb3VzZW92ZXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlZW50ZXIgbGFiZWwgc3BhbicgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdtb3VzZW91dEhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmNoZWNrLWJ1dHRvbicgOiAnY2hlY2tCdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9Cb3hDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnZm9jdXMgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25Gb2N1cydcblxuICAgICdibHVyIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uQmx1cidcblxuXG5cbiAgcmFkaW9CdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEdyb3VwID0gJHRhcmdldC5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKVxuXG4gICAgJHBhcmVudEVsID0gJHRhcmdldC5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG4gICAgaWYgJHBhcmVudEVsLmhhc0NsYXNzKCdjaGVja2VkJylcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJG90aGVySW5wdXRzID0gJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdJylcblxuICAgICAgJG90aGVySW5wdXRzLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cblxuICByYWRpb0JveENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkb3RoZXJSYWRpb3MgPSBAJGVsLnBhcmVudHMoJy5zdGVwLWZvcm0taW5uZXInKS5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG5cbiAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKS5maW5kKCdpbnB1dCcpLnZhbCgnb2ZmJykudHJpZ2dlcignY2hhbmdlJylcblxuICAgICRwYXJlbnQgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcbiAgICAgIC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICBpZiAkcGFyZW50Lmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvbicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgZWxzZVxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgXG5cbiAgY2hlY2tCdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpLmxlbmd0aCA+IDBcbiAgICAgIHJldHVybiBAcmFkaW9Cb3hDbGlja0hhbmRsZXIoZSlcblxuICAgICRwYXJlbnQgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94JylcbiAgICAgIC50b2dnbGVDbGFzcygnY2hlY2tlZCcpXG4gICAgXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG5cbiAgaG92ZXJIYW5kbGVyOiAoZSkgLT5cbiAgICBjb25zb2xlLmxvZyBlLnRhcmdldFxuXG5cblxuICBtb3VzZW92ZXJIYW5kbGVyOiAoZSkgLT5cbiAgICBAaXNIb3ZlcmluZyA9IHRydWVcbiAgICAgIFxuXG5cbiAgbW91c2VvdXRIYW5kbGVyOiAoZSkgLT5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuXG4gIHNob3dUb29sdGlwOiAtPlxuICAgIGlmIEBoYXNJbmZvICYmIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPT0gZmFsc2VcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gdHJ1ZVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFtkYXRhLWl0ZW0taW5kZXg9JyN7QGl0ZW1JbmRleH0nXVwiKS5hZGRDbGFzcygndmlzaWJsZScpXG5cblxuXG4gIGhpZGVUb29sdGlwOiAtPlxuICAgIGlmIEBoYXNJbmZvXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKSBcblxuXG5cbiAgaGlkZVNob3dUb29sdGlwOiAtPlxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgQHNob3dUb29sdGlwKClcblxuXG5cbiAgbGFiZWxDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIHJldHVybiBmYWxzZVxuXG5cblxuICBpdGVtQ2hhbmdlSGFuZGxlcjogKGUpIC0+XG4gICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgIGlucHV0SWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgIyBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdhbnN3ZXI6dXBkYXRlZCcsIGlucHV0SWQsIHZhbHVlKVxuICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSlcbiAgICBcbiAgICBAcGFyZW50U3RlcC51cGRhdGVVc2VyQW5zd2VyKHRydWUpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG4gICAgQCRpbnB1dEVsID0gQCRlbC5maW5kKCdpbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy52YWx1ZSAhPSAnJyAmJiBAbW9kZWwuYXR0cmlidXRlcy50eXBlID09ICd0ZXh0J1xuICAgICAgXG4gICAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuICAgIEBob3ZlclRpbWVyID0gbnVsbFxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cblxuICBoYXNJbmZvOiAtPlxuICAgIHJldHVybiAkZWwuaGFzQ2xhc3MoJ2hhcy1pbmZvJylcblxuXG5cbiAgb25Gb2N1czogKGUpIC0+XG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuXG4gIG9uQmx1cjogKGUpIC0+XG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBpZiB2YWx1ZSA9PSAnJ1xuICAgICAgdW5sZXNzICR0YXJnZXQuaXMoJzpmb2N1cycpXG5cbiAgICAgICAgQCRlbC5yZW1vdmVDbGFzcygnb3BlbicpXG5cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFB1YmxpYyBNZXRob2RzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIHJlbmRlcjogLT5cbiAgICBzdXBlcigpXG5cblxuXG4gIGdldElucHV0VHlwZU9iamVjdDogLT5cbiAgICByZXR1cm5EYXRhID0ge31cblxuICAgIHJldHVybkRhdGFbQGlucHV0VHlwZV0gPSB0cnVlXG5cbiAgICByZXR1cm4gcmV0dXJuRGF0YVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIGlucHV0VHlwZU9iamVjdCA9IEBnZXRJbnB1dFR5cGVPYmplY3QoKVxuXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAndGV4dCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0dyb3VwJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnZWRpdCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuXG4gIFxuICAgICAgXG4gICAgXG4gICAgICBcblxuICAgIFxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgQmFzZSBWaWV3IENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxucmVxdWlyZSgnLi4vLi4vaGVscGVycy9WaWV3SGVscGVyJylcblxuY2xhc3MgVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgdGVtcGxhdGU6IC0+XG4gICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBJTkhFUklURUQgLyBPVkVSUklERVNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICByZW5kZXI6IC0+XG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIEVWRU5UIEhBTkRMRVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gVmlldyJdfQ==
