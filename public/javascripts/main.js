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
    var AppData, HomeView, InputItemView, OutputView, Router;
    AppData = require('./data/WizardContent');
    this.data = AppData;
    HomeView = require('./views/HomeView');
    Router = require('./routers/Router');
    InputItemView = require('./views/InputItemView');
    OutputView = require('./views/OutputView');
    this.homeView = new HomeView();
    this.inputItemView = new InputItemView();
    this.outputView = new OutputView();
    return this.router = new Router();
  }
};

module.exports = Application;



},{"./data/WizardContent":7,"./routers/Router":14,"./views/HomeView":25,"./views/InputItemView":26,"./views/OutputView":27}],6:[function(require,module,exports){
var WizardAssignmentData;

module.exports = WizardAssignmentData = [];



},{}],7:[function(require,module,exports){
var WizardContent;

WizardContent = [
  {
    id: "intro",
    title: 'Welcome to the Wikipedia Assignment Wizard!',
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
        content: ["<p><textarea rows='8' style='width:100%;'></textarea></p>"]
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
  intro: [
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
  assignment_selection: [
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
  learning_essentials: [
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
  getting_started: [
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
  choosing_articles: [
    {
      type: 'radioBox',
      id: 'prepare_list',
      selected: false,
      label: 'Instructor Prepares a List with Appropriate Articles',
      exclusive: false,
      tipInfo: {
        title: "Instructor Prepares a List",
        content: "You (the instructor) prepare a list of appropriate 'non-existent', 'stub' or 'start' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner."
      }
    }, {
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
  ],
  research_planning: [
    {
      type: 'radioBox',
      id: 'create_outline',
      selected: false,
      label: 'Create an Article Outline',
      exclusive: false,
      tipInfo: {
        title: "Traditional Outline",
        content: "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
      }
    }, {
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
  ],
  drafts_mainspace: [
    {
      type: 'radioBox',
      id: 'work_live',
      selected: false,
      label: 'Work Live from the Start',
      exclusive: false,
      tipInfo: {
        title: "Pros and cons to editing live",
        content: "Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed."
      }
    }, {
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
  ],
  peer_feedback: [
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
  ],
  supplementary_assignments: [
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
  ],
  dyk_ga: [
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
  ],
  grading: [
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
  ],
  overview: [
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
var Router, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

module.exports = Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    return Router.__super__.constructor.apply(this, arguments);
  }

  Router.prototype.routes = {
    '': 'home'
  };

  Router.prototype.home = function() {
    return $('#app').html(application.homeView.render().el);
  };

  return Router;

})(Backbone.Router);



},{"../App":5}],15:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Home Page Template\n-->\n\n<!-- MAIN APP CONTENT -->\n<div class=\"content\">\n\n\n  <!-- STEPS MAIN CONTAINER -->\n  <div class=\"steps\"></div><!-- end .steps -->\n\n\n</div><!-- end .content -->";
  })
},{"handleify":4}],16:[function(require,module,exports){
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

function program6(depth0,data) {
  
  
  return "inactive";
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Step Navigation \n-->\n\n\n<!-- STEP NAV DOT INDICATORS -->\n<div class=\"step-nav-indicators hidden\">\n\n  ";
  stack1 = helpers.each.call(depth0, depth0.steps, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</div><!-- end .step-nav-indicators -->\n\n\n\n<!-- STEP NAV BUTTONS -->\n<div class=\"step-nav-buttons\">\n\n  <a href=\"#\" class=\"step-nav__button step-nav--prev prev ";
  stack1 = helpers['if'].call(depth0, depth0.prevInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    <span style=\"margin-right:5px;\">\n      <div class=\"step-nav-arrow step-nav-arrow--left\"></div>\n    </span>\n    Prev\n  </a>\n\n  <a href=\"#\" class=\"step-nav__button step-nav--next next ";
  stack1 = helpers['if'].call(depth0, depth0.nextInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    Next\n    <span style=\"margin-left:5px;\">\n      <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n    </span>\n  </a>\n\n</div><!-- end .step-nav-buttons -->\n";
  return buffer;
  })
},{"handleify":4}],17:[function(require,module,exports){
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
},{"handleify":4}],18:[function(require,module,exports){
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
},{"handleify":4}],19:[function(require,module,exports){
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
},{"handleify":4}],20:[function(require,module,exports){
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
},{"handleify":4}],21:[function(require,module,exports){
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
    + "</label>\n    <input name=\""
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
    + "</label>\n    <a class=\"edit-button\" href=\"#\">edit</a>\n  </div>\n  <div class=\"custom-input--edit__content\">\n    <!-- content -->\n  </div>\n</div>\n";
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
},{"handleify":4}],22:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates\">\n\n  <div class=\"custom-input-dates__inner from\">\n\n    <div class=\"custom-select custom-select--month\">\n    \n      <select class=\"month\" id=\"monthStart\" name=\"monthStart\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <select class=\"day\" id=\"dayStart\" name=\"dayStart\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n        <option>13</option>\n        <option>14</option>\n        <option>15</option>\n        <option>16</option>\n        <option>17</option>\n        <option>18</option>\n        <option>19</option>\n        <option>20</option>\n        <option>21</option>\n        <option>22</option>\n        <option>23</option>\n        <option>24</option>\n        <option>25</option>\n        <option>26</option>\n        <option>27</option>\n        <option>28</option>\n        <option>29</option>\n        <option>30</option>\n        <option>31</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--year\">\n      <select class=\"year\" id=\"yearStart\" name=\"yearStart\">\n        <option></option>\n        <option>2014</option>\n        <option>2015</option>\n        <option>2016</option>\n        <option>2017</option>\n        <option>2018</option>\n        <option>2019</option>\n        <option>2020</option>\n        <option>2021</option>\n        <option>2022</option>\n        <option>2023</option>\n        <option>2024</option>\n        <option>2025</option>\n        <option>2026</option>\n      </select>\n    </div>\n\n  </div>\n  <span class=\"dates-to\">\n    to\n  </span>\n  <div class=\"custom-input-dates__inner to\">\n    \n    <div class=\"custom-select custom-select--month\">\n      <select class=\"month\" id=\"monthEnd\" name=\"monthEnd\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <select class=\"day\" id=\"dayEnd\" name=\"dayEnd\">\n        <option></option>\n        <option>01</option>\n        <option>02</option>\n        <option>03</option>\n        <option>04</option>\n        <option>05</option>\n        <option>06</option>\n        <option>07</option>\n        <option>08</option>\n        <option>09</option>\n        <option>10</option>\n        <option>11</option>\n        <option>12</option>\n        <option>13</option>\n        <option>14</option>\n        <option>15</option>\n        <option>16</option>\n        <option>17</option>\n        <option>18</option>\n        <option>19</option>\n        <option>20</option>\n        <option>21</option>\n        <option>22</option>\n        <option>23</option>\n        <option>24</option>\n        <option>25</option>\n        <option>26</option>\n        <option>27</option>\n        <option>28</option>\n        <option>29</option>\n        <option>30</option>\n        <option>31</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--year\">\n      <select class=\"year\" id=\"yearEnd\" name=\"yearEnd\">\n        <option></option>\n        <option>2014</option>\n        <option>2015</option>\n        <option>2016</option>\n        <option>2017</option>\n        <option>2018</option>\n        <option>2019</option>\n        <option>2020</option>\n        <option>2021</option>\n        <option>2022</option>\n        <option>2023</option>\n        <option>2024</option>\n        <option>2025</option>\n        <option>2026</option>\n      </select>\n    </div>\n\n  </div>\n\n</div>";
  })
},{"handleify":4}],23:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  })
},{"handleify":4}],24:[function(require,module,exports){
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
},{"handleify":4}],25:[function(require,module,exports){
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

  HomeView.prototype.gotoClickHandler = function(index) {
    this.updateStep(index);
    return this.hideAllTips();
  };

  return HomeView;

})(View);



},{"../App":5,"../models/StepModel":12,"../templates/HomeTemplate.hbs":15,"../templates/steps/output/OutputTemplate.hbs":24,"../views/StepNavView":28,"../views/StepView":29,"../views/supers/View":30}],26:[function(require,module,exports){
var AssignmentData, InputItemTemplate, InputItemView, View, WizardStepInputs,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

View = require('../views/supers/View');

InputItemTemplate = require('../templates/steps/inputs/InputItemTemplate.hbs');

AssignmentData = require('../data/WizardAssignmentData');

WizardStepInputs = require('../data/WizardStepInputs');

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
    console.log(value);
    Backbone.Mediator.publish('answer:updated', inputId, value);
    return this.parentStep.updateUserAnswer(true);
  };

  InputItemView.prototype.afterRender = function() {
    this.$inputEl = this.$el.find('input');
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



},{"../data/WizardAssignmentData":6,"../data/WizardStepInputs":9,"../templates/steps/inputs/InputItemTemplate.hbs":21,"../views/supers/View":30}],27:[function(require,module,exports){
var CourseDetailsTemplate, InputItemView, OutputTemplate, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

OutputTemplate = require('../templates/steps/output/OutputTemplate.hbs');

CourseDetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs');

module.exports = InputItemView = (function(_super) {
  __extends(InputItemView, _super);

  function InputItemView() {
    return InputItemView.__super__.constructor.apply(this, arguments);
  }

  InputItemView.prototype.template = OutputTemplate;

  InputItemView.prototype.subscriptions = {
    'wizard:publish': 'publishHandler'
  };

  InputItemView.prototype.getRenderData = function() {
    return {
      course_name: 'Course Name',
      instructor_username: 'User Name',
      instructor_realname: 'Real Name',
      subject: 'Subject',
      start_date: 'Start Date',
      end_date: 'End Date',
      institution: 'Institution',
      expected_students: 'Expeceted Students'
    };
  };

  InputItemView.prototype.outputPlainText = function() {
    this.render();
    return this.$el.text();
  };

  InputItemView.prototype.publishHandler = function() {
    return $.ajax({
      type: 'POST',
      url: '/publish',
      data: {
        text: this.outputPlainText()
      },
      success: function(data) {
        return console.log(data);
      }
    });
  };

  return InputItemView;

})(View);



},{"../App":5,"../templates/steps/output/CourseDetailsTemplate.hbs":23,"../templates/steps/output/OutputTemplate.hbs":24,"../views/supers/View":30}],28:[function(require,module,exports){
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
      'click .dot.visited': 'dotClickHandler'
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



},{"../templates/StepNavTemplate.hbs":16,"../views/supers/View":30}],29:[function(require,module,exports){
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
      return Backbone.Mediator.publish('step:goto', stepId);
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



},{"../App":5,"../data/WizardAssignmentData":6,"../data/WizardCourseInfo":8,"../data/WizardStepInputs":9,"../templates/steps/IntroStepTemplate.hbs":17,"../templates/steps/StepTemplate.hbs":18,"../templates/steps/info/CourseTipTemplate.hbs":19,"../templates/steps/info/InputTipTemplate.hbs":20,"../templates/steps/modules/WikiDatesModule.hbs":22,"../views/InputItemView":26,"../views/supers/View":30}],30:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ291cnNlSW5mby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21haW4uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3JvdXRlcnMvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvT3V0cHV0VGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSG9tZVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSW5wdXRJdGVtVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBOYXZWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9WaWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBOztBQ0lBLElBQUEsV0FBQTs7QUFBQSxXQUFBLEdBRUU7QUFBQSxFQUFBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFHVixRQUFBLG9EQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsT0FBQSxDQUFRLHNCQUFSLENBQVYsQ0FBQTtBQUFBLElBRUEsSUFBQyxDQUFBLElBQUQsR0FBUSxPQUZSLENBQUE7QUFBQSxJQU1BLFFBQUEsR0FBVyxPQUFBLENBQVEsa0JBQVIsQ0FOWCxDQUFBO0FBQUEsSUFRQSxNQUFBLEdBQVMsT0FBQSxDQUFRLGtCQUFSLENBUlQsQ0FBQTtBQUFBLElBVUEsYUFBQSxHQUFnQixPQUFBLENBQVEsdUJBQVIsQ0FWaEIsQ0FBQTtBQUFBLElBWUEsVUFBQSxHQUFhLE9BQUEsQ0FBUSxvQkFBUixDQVpiLENBQUE7QUFBQSxJQWdCQSxJQUFDLENBQUEsUUFBRCxHQUFnQixJQUFBLFFBQUEsQ0FBQSxDQWhCaEIsQ0FBQTtBQUFBLElBa0JBLElBQUMsQ0FBQSxhQUFELEdBQXFCLElBQUEsYUFBQSxDQUFBLENBbEJyQixDQUFBO0FBQUEsSUFvQkEsSUFBQyxDQUFBLFVBQUQsR0FBa0IsSUFBQSxVQUFBLENBQUEsQ0FwQmxCLENBQUE7V0FzQkEsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLE1BQUEsQ0FBQSxFQXpCSjtFQUFBLENBQVo7Q0FGRixDQUFBOztBQUFBLE1BK0JNLENBQUMsT0FBUCxHQUFpQixXQS9CakIsQ0FBQTs7Ozs7QUNOQSxJQUFBLG9CQUFBOztBQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQWlCLG9CQUFBLEdBQXVCLEVBQXhDLENBQUE7Ozs7O0FDQUEsSUFBQSxhQUFBOztBQUFBLGFBQUEsR0FBZ0I7RUFDZDtBQUFBLElBQ0UsRUFBQSxFQUFJLE9BRE47QUFBQSxJQUVFLEtBQUEsRUFBTyw2Q0FGVDtBQUFBLElBR0UsWUFBQSxFQUFjLHVUQUhoQjtBQUFBLElBSUUsTUFBQSxFQUFRO01BQ047QUFBQSxRQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sY0FGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLFNBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQURNLEVBUU47QUFBQSxRQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sWUFGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLFFBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQVJNLEVBZU47QUFBQSxRQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sU0FGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLFNBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQWZNLEVBc0JOO0FBQUEsUUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLGdDQUZUO0FBQUEsUUFHRSxFQUFBLEVBQUksVUFITjtBQUFBLFFBSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxRQUtFLFdBQUEsRUFBYSxFQUxmO09BdEJNO0tBSlY7QUFBQSxJQWtDRSxRQUFBLEVBQVUsRUFsQ1o7R0FEYyxFQXVDZDtBQUFBLElBQ0UsRUFBQSxFQUFJLHNCQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sMkJBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVyw2QkFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLHVCQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsMExBTGhCO0FBQUEsSUFNRSxNQUFBLEVBQVE7TUFDTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxlQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLCtCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsSUFMYjtBQUFBLFFBTUUsYUFBQSxFQUFlLElBTmpCO09BRE0sRUFTTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxVQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLG1CQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLFFBTUUsYUFBQSxFQUFlLElBTmpCO09BVE0sRUFpQk47QUFBQSxRQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsUUFFRSxFQUFBLEVBQUksWUFGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyx5QkFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxRQU1FLGFBQUEsRUFBZSxJQU5qQjtPQWpCTSxFQXlCTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxnQkFGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTywyQkFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxRQU1FLGFBQUEsRUFBZSxJQU5qQjtPQXpCTSxFQWlDTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxVQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLG9CQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLFFBTUUsYUFBQSxFQUFlLElBTmpCO09BakNNLEVBeUNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLFNBRk47QUFBQSxRQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsUUFJRSxLQUFBLEVBQU8scUJBSlQ7QUFBQSxRQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsUUFNRSxhQUFBLEVBQWUsSUFOakI7T0F6Q00sRUFpRE47QUFBQSxRQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsUUFFRSxFQUFBLEVBQUksWUFGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyxrREFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxRQU1FLGFBQUEsRUFBZSxJQU5qQjtPQWpETTtLQU5WO0FBQUEsSUFnRUUsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCxnVkFETyxFQUVQLG9PQUZPLENBRlg7T0FEUTtLQWhFWjtHQXZDYyxFQWlIZDtBQUFBLElBQ0UsRUFBQSxFQUFJLHFCQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sMEJBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVyxxQkFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLHVCQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsb1NBTGhCO0FBQUEsSUFNRSxNQUFBLEVBQVE7TUFDTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxhQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsSUFIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLHFCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtPQURNLEVBUU47QUFBQSxRQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsUUFFRSxFQUFBLEVBQUksUUFGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLElBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyxzQkFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7T0FSTSxFQWVOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLG1CQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLDBCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtPQWZNLEVBc0JOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLHVCQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLDBDQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtPQXRCTSxFQTZCTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxvQkFGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyx3RUFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7T0E3Qk07S0FOVjtBQUFBLElBMkNFLFFBQUEsRUFBVTtNQUNSO0FBQUEsUUFDRSxPQUFBLEVBQVMsQ0FDUCxzWkFETyxDQURYO09BRFEsRUFNUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLHVCQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCw0REFETyxFQUVQLGtKQUZPLEVBR1Asb05BSE8sQ0FGWDtPQU5RO0tBM0NaO0dBakhjLEVBNEtkO0FBQUEsSUFDRSxFQUFBLEVBQUksaUJBRE47QUFBQSxJQUVFLEtBQUEsRUFBTyw4QkFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLGVBSGI7QUFBQSxJQUlFLFlBQUEsRUFBYyx1U0FKaEI7QUFBQSxJQUtFLFNBQUEsRUFBVyxtRUFMYjtBQUFBLElBTUUsTUFBQSxFQUFRO01BQ047QUFBQSxRQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsUUFFRSxFQUFBLEVBQUksa0JBRk47QUFBQSxRQUdFLFFBQUEsRUFBVSxJQUhaO0FBQUEsUUFJRSxLQUFBLEVBQU8scUJBSlQ7QUFBQSxRQUtFLFNBQUEsRUFBVyxLQUxiO09BRE0sRUFRTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxnQkFGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLElBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyxtQkFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7T0FSTSxFQWVOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLG1CQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLHNCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtPQWZNLEVBc0JOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLG9CQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLHVCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtPQXRCTTtLQU5WO0FBQUEsSUFvQ0UsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsRUFGWDtPQURRO0tBcENaO0dBNUtjLEVBd05kO0FBQUEsSUFDRSxFQUFBLEVBQUksbUJBRE47QUFBQSxJQUVFLEtBQUEsRUFBTyxtQkFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLHFGQUhiO0FBQUEsSUFJRSxTQUFBLEVBQVcseUJBSmI7QUFBQSxJQUtFLFlBQUEsRUFBYyx1R0FMaEI7QUFBQSxJQU1FLE1BQUEsRUFBUTtNQUNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sT0FEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLG1CQUZOO0FBQUEsUUFHRSxLQUFBLEVBQU8sRUFIVDtBQUFBLFFBSUUsT0FBQSxFQUFTO1VBQ1A7QUFBQSxZQUNFLEVBQUEsRUFBSSxtQkFETjtBQUFBLFlBRUUsS0FBQSxFQUFPLHNEQUZUO0FBQUEsWUFHRSxLQUFBLEVBQU8sY0FIVDtBQUFBLFlBSUUsUUFBQSxFQUFVLEtBSlo7V0FETyxFQVFQO0FBQUEsWUFDRSxFQUFBLEVBQUksbUJBRE47QUFBQSxZQUVFLEtBQUEsRUFBTyxpREFGVDtBQUFBLFlBR0UsS0FBQSxFQUFPLGtCQUhUO0FBQUEsWUFJRSxRQUFBLEVBQVUsS0FKWjtXQVJPO1NBSlg7T0FETTtLQU5WO0FBQUEsSUE0QkUsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCw2VkFETyxDQUZYO09BRFEsRUFPUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLFNBQUEsRUFBVyxLQUZiO0FBQUEsUUFHRSxPQUFBLEVBQVMsQ0FDUCxrZUFETyxDQUhYO09BUFEsRUFjUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLHdCQURUO0FBQUEsUUFFRSxTQUFBLEVBQVcsSUFGYjtBQUFBLFFBR0UsT0FBQSxFQUFTLENBQ1AsMlFBRE8sRUFFUCw2K0JBRk8sQ0FIWDtPQWRRLEVBNEJSO0FBQUEsUUFDRSxLQUFBLEVBQU8sYUFEVDtBQUFBLFFBRUUsU0FBQSxFQUFXLElBRmI7QUFBQSxRQUdFLE9BQUEsRUFBUyxDQUNQLGdvQkFETyxDQUhYO09BNUJRO0tBNUJaO0dBeE5jLEVBOFJkO0FBQUEsSUFDRSxFQUFBLEVBQUksbUJBRE47QUFBQSxJQUVFLEtBQUEsRUFBTyxxQkFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLGFBSGI7QUFBQSxJQUlFLFNBQUEsRUFBVywyQkFKYjtBQUFBLElBS0UsWUFBQSxFQUFlLGlTQUxqQjtBQUFBLElBTUUsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCw2akJBRE8sQ0FGWDtPQURRO0tBTlo7QUFBQSxJQWNFLE1BQUEsRUFBUTtNQUNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sT0FEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLG1CQUZOO0FBQUEsUUFHRSxLQUFBLEVBQU8sRUFIVDtBQUFBLFFBSUUsT0FBQSxFQUFTO1VBQ1A7QUFBQSxZQUNFLEVBQUEsRUFBSSxtQkFETjtBQUFBLFlBRUUsS0FBQSxFQUFPLDJCQUZUO0FBQUEsWUFHRSxLQUFBLEVBQU8sZ0JBSFQ7QUFBQSxZQUlFLFFBQUEsRUFBVSxLQUpaO1dBRE8sRUFPUDtBQUFBLFlBQ0UsRUFBQSxFQUFJLG1CQUROO0FBQUEsWUFFRSxLQUFBLEVBQU8sZ0NBRlQ7QUFBQSxZQUdFLEtBQUEsRUFBTyxZQUhUO0FBQUEsWUFJRSxRQUFBLEVBQVUsS0FKWjtXQVBPO1NBSlg7T0FETTtLQWRWO0dBOVJjLEVBa1VkO0FBQUEsSUFDRSxFQUFBLEVBQUksa0JBRE47QUFBQSxJQUVFLEtBQUEsRUFBTyxvQkFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLGFBSGI7QUFBQSxJQUlFLFNBQUEsRUFBVywwQkFKYjtBQUFBLElBS0UsWUFBQSxFQUFjLG1SQUxoQjtBQUFBLElBTUUsUUFBQSxFQUFVLEVBTlo7QUFBQSxJQVFFLE1BQUEsRUFBUSxFQVJWO0dBbFVjLEVBNlVkO0FBQUEsSUFDRSxFQUFBLEVBQUksZUFETjtBQUFBLElBRUUsS0FBQSxFQUFPLGVBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVyxxQkFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLG9EQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsdVJBTGhCO0FBQUEsSUFNRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLDBOQURPLEVBRVAsd1FBRk8sQ0FGWDtPQURRO0tBTlo7QUFBQSxJQWdCRSxNQUFBLEVBQVE7TUFDTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFlBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxjQUZOO0FBQUEsUUFHRSxLQUFBLEVBQU8sRUFIVDtBQUFBLFFBSUUsT0FBQSxFQUFTO1VBQ1A7QUFBQSxZQUNFLEVBQUEsRUFBSSxjQUROO0FBQUEsWUFFRSxLQUFBLEVBQU8sR0FGVDtBQUFBLFlBR0UsS0FBQSxFQUFPLEdBSFQ7QUFBQSxZQUlFLFFBQUEsRUFBVSxLQUpaO1dBRE8sRUFPUDtBQUFBLFlBQ0UsRUFBQSxFQUFJLGNBRE47QUFBQSxZQUVFLEtBQUEsRUFBTyxHQUZUO0FBQUEsWUFHRSxLQUFBLEVBQU8sR0FIVDtBQUFBLFlBSUUsUUFBQSxFQUFVLElBSlo7V0FQTyxFQWFQO0FBQUEsWUFDRSxFQUFBLEVBQUksY0FETjtBQUFBLFlBRUUsS0FBQSxFQUFPLEdBRlQ7QUFBQSxZQUdFLEtBQUEsRUFBTyxHQUhUO0FBQUEsWUFJRSxRQUFBLEVBQVUsS0FKWjtXQWJPLEVBbUJQO0FBQUEsWUFDRSxFQUFBLEVBQUksY0FETjtBQUFBLFlBRUUsS0FBQSxFQUFPLEdBRlQ7QUFBQSxZQUdFLEtBQUEsRUFBTyxHQUhUO0FBQUEsWUFJRSxRQUFBLEVBQVUsS0FKWjtXQW5CTyxFQXlCUDtBQUFBLFlBQ0UsRUFBQSxFQUFJLGNBRE47QUFBQSxZQUVFLEtBQUEsRUFBTyxJQUZUO0FBQUEsWUFHRSxLQUFBLEVBQU8sSUFIVDtBQUFBLFlBSUUsUUFBQSxFQUFVLEtBSlo7V0F6Qk87U0FKWDtPQURNO0tBaEJWO0dBN1VjLEVBdVlkO0FBQUEsSUFDRSxFQUFBLEVBQUksMkJBRE47QUFBQSxJQUVFLEtBQUEsRUFBTywyQkFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLHFCQUhiO0FBQUEsSUFJRSxTQUFBLEVBQVcsaUNBSmI7QUFBQSxJQUtFLFlBQUEsRUFBYyxrbEJBTGhCO0FBQUEsSUFNRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLHlNQURPLEVBRVAseVZBRk8sQ0FGWDtPQURRO0tBTlo7QUFBQSxJQWVFLE1BQUEsRUFBUTtNQUNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLFlBRk47QUFBQSxRQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsUUFJRSxLQUFBLEVBQU8sMEJBSlQ7QUFBQSxRQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsUUFNRSxPQUFBLEVBQ0U7QUFBQSxVQUFBLEtBQUEsRUFBTyxnQ0FBUDtBQUFBLFVBQ0EsT0FBQSxFQUFTLGtlQURUO1NBUEo7T0FETSxFQVdOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLG9CQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLHVCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLFFBTUUsT0FBQSxFQUNFO0FBQUEsVUFBQSxLQUFBLEVBQU8seUNBQVA7QUFBQSxVQUNBLE9BQUEsRUFBUywwUUFEVDtTQVBKO09BWE0sRUFxQk47QUFBQSxRQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsUUFFRSxFQUFBLEVBQUksT0FGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyxrQkFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxRQU1FLE9BQUEsRUFDRTtBQUFBLFVBQUEsS0FBQSxFQUFPLGtCQUFQO0FBQUEsVUFDQSxPQUFBLEVBQVMsOGJBRFQ7U0FQSjtPQXJCTSxFQStCTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxRQUVFLEVBQUEsRUFBSSxXQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLHFCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLFFBTUUsT0FBQSxFQUNFO0FBQUEsVUFBQSxLQUFBLEVBQU8scUJBQVA7QUFBQSxVQUNBLE9BQUEsRUFBUyx3WUFEVDtTQVBKO09BL0JNLEVBeUNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLGdCQUZOO0FBQUEsUUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLFFBSUUsS0FBQSxFQUFPLDJCQUpUO0FBQUEsUUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLFFBTUUsT0FBQSxFQUNFO0FBQUEsVUFBQSxLQUFBLEVBQU8sMkJBQVA7QUFBQSxVQUNBLE9BQUEsRUFBUyw2WkFEVDtTQVBKO09BekNNO0tBZlY7R0F2WWMsRUEyY2Q7QUFBQSxJQUNFLEVBQUEsRUFBSSxRQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8scUJBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVyxvQ0FIYjtBQUFBLElBSUUsU0FBQSxFQUFXLHFFQUpiO0FBQUEsSUFLRSxRQUFBLEVBQVUsRUFMWjtBQUFBLElBT0UsTUFBQSxFQUFRO01BQ047QUFBQSxRQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsUUFFRSxFQUFBLEVBQUksS0FGTjtBQUFBLFFBR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxRQUlFLEtBQUEsRUFBTyxvREFKVDtBQUFBLFFBS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxRQU1FLE9BQUEsRUFDRTtBQUFBLFVBQUEsS0FBQSxFQUFPLG9CQUFQO0FBQUEsVUFDQSxPQUFBLEVBQVMseXFDQURUO1NBUEo7T0FETSxFQWFOO0FBQUEsUUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLFFBRUUsRUFBQSxFQUFJLElBRk47QUFBQSxRQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsUUFJRSxLQUFBLEVBQU8sNERBSlQ7QUFBQSxRQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsUUFNRSxPQUFBLEVBQ0U7QUFBQSxVQUFBLEtBQUEsRUFBTyxtQkFBUDtBQUFBLFVBQ0EsT0FBQSxFQUFTLGt3Q0FEVDtTQVBKO09BYk07S0FQVjtHQTNjYyxFQTRlZDtBQUFBLElBQ0UsRUFBQSxFQUFJLFNBRE47QUFBQSxJQUVFLEtBQUEsRUFBTyxTQUZUO0FBQUEsSUFHRSxTQUFBLEVBQVcsdUVBSGI7QUFBQSxJQUlFLFNBQUEsRUFBVyxlQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsOEdBTGhCO0FBQUEsSUFNRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLGtEQURUO0FBQUEsUUFFRSxTQUFBLEVBQVcsSUFGYjtBQUFBLFFBR0UsT0FBQSxFQUFTLENBQ1Asa0ZBRE8sRUFFUCxnZUFGTyxDQUhYO09BRFEsRUFTUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLHNDQURUO0FBQUEsUUFFRSxTQUFBLEVBQVcsSUFGYjtBQUFBLFFBR0UsT0FBQSxFQUFTLENBQ1AsMlJBRE8sQ0FIWDtPQVRRLEVBZ0JSO0FBQUEsUUFDRSxLQUFBLEVBQU8sMkdBRFQ7QUFBQSxRQUVFLFNBQUEsRUFBVyxJQUZiO0FBQUEsUUFHRSxPQUFBLEVBQVMsQ0FDUCx3YUFETyxFQUVQLGdWQUZPLENBSFg7T0FoQlE7S0FOWjtBQUFBLElBZ0NFLE1BQUEsRUFBUTtNQUNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sU0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLDBCQUZUO0FBQUEsUUFHRSxFQUFBLEVBQUksa0JBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQURNLEVBUU47QUFBQSxRQUNFLElBQUEsRUFBTSxTQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sOEJBRlQ7QUFBQSxRQUdFLEVBQUEsRUFBSSx1QkFITjtBQUFBLFFBSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxRQUtFLFdBQUEsRUFBYSxFQUxmO09BUk0sRUFlTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFNBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxtQkFGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLHlCQUhOO0FBQUEsUUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLFFBS0UsV0FBQSxFQUFhLEVBTGY7T0FmTSxFQXNCTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLFNBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxxQkFGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLHlCQUhOO0FBQUEsUUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLFFBS0UsV0FBQSxFQUFhLEVBTGY7T0F0Qk0sRUE2Qk47QUFBQSxRQUNFLElBQUEsRUFBTSxTQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sb0JBRlQ7QUFBQSxRQUdFLEVBQUEsRUFBSSx3QkFITjtBQUFBLFFBSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxRQUtFLFdBQUEsRUFBYSxFQUxmO09BN0JNLEVBb0NOO0FBQUEsUUFDRSxJQUFBLEVBQU0sU0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLGVBRlQ7QUFBQSxRQUdFLEVBQUEsRUFBSSxxQkFITjtBQUFBLFFBSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxRQUtFLFdBQUEsRUFBYSxFQUxmO09BcENNLEVBMkNOO0FBQUEsUUFDRSxJQUFBLEVBQU0sU0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLDJCQUZUO0FBQUEsUUFHRSxFQUFBLEVBQUkscUJBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQTNDTTtLQWhDVjtHQTVlYyxFQWdrQmQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxVQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8scUJBRlQ7QUFBQSxJQUdFLFFBQUEsRUFBVTtNQUNSO0FBQUEsUUFDRSxLQUFBLEVBQU8sa0JBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLHFOQURPLEVBRVAsK0tBRk8sQ0FGWDtPQURRLEVBWVI7QUFBQSxRQUNFLEtBQUEsRUFBTyxtQkFEVDtBQUFBLFFBRUUsT0FBQSxFQUFTLENBQ1AsMkRBRE8sQ0FGWDtPQVpRLEVBa0JSO0FBQUEsUUFDRSxLQUFBLEVBQU8sRUFEVDtBQUFBLFFBRUUsT0FBQSxFQUFTLENBQ1AsNEdBRE8sQ0FGWDtPQWxCUTtLQUhaO0FBQUEsSUE0QkUsTUFBQSxFQUFRO01BQ047QUFBQSxRQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sMEJBRlQ7QUFBQSxRQUdFLEVBQUEsRUFBSSxrQkFITjtBQUFBLFFBSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxRQUtFLFdBQUEsRUFBYSxFQUxmO09BRE0sRUFRTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLE1BRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyw4QkFGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLHVCQUhOO0FBQUEsUUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLFFBS0UsV0FBQSxFQUFhLEVBTGY7T0FSTSxFQWVOO0FBQUEsUUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLG1CQUZUO0FBQUEsUUFHRSxFQUFBLEVBQUkseUJBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQWZNLEVBc0JOO0FBQUEsUUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLHFCQUZUO0FBQUEsUUFHRSxFQUFBLEVBQUkseUJBSE47QUFBQSxRQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsUUFLRSxXQUFBLEVBQWEsRUFMZjtPQXRCTSxFQTZCTjtBQUFBLFFBQ0UsSUFBQSxFQUFNLE1BRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxvQkFGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLHdCQUhOO0FBQUEsUUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLFFBS0UsV0FBQSxFQUFhLEVBTGY7T0E3Qk0sRUFvQ047QUFBQSxRQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sZUFGVDtBQUFBLFFBR0UsRUFBQSxFQUFJLHFCQUhOO0FBQUEsUUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLFFBS0UsV0FBQSxFQUFhLEVBTGY7T0FwQ00sRUEyQ047QUFBQSxRQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sMkJBRlQ7QUFBQSxRQUdFLEVBQUEsRUFBSSxxQkFITjtBQUFBLFFBSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxRQUtFLFdBQUEsRUFBYSxFQUxmO09BM0NNO0tBNUJWO0dBaGtCYztDQUFoQixDQUFBOztBQUFBLE1BbXBCTSxDQUFDLE9BQVAsR0FBaUIsYUFucEJqQixDQUFBOzs7OztBQ0FBLElBQUEsZ0JBQUE7O0FBQUEsZ0JBQUEsR0FHRTtBQUFBLEVBQUEsYUFBQSxFQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sd0NBQVA7QUFBQSxJQUNBLFdBQUEsRUFBYSxDQUNYLGl6QkFEVyxFQUVYLHdOQUZXLENBRGI7QUFBQSxJQUtBLFlBQUEsRUFBYyxTQUxkO0FBQUEsSUFNQSxZQUFBLEVBQWMsVUFOZDtBQUFBLElBT0EsUUFBQSxFQUFVLENBQ1IsbUJBRFEsRUFFUix5QkFGUSxDQVBWO0FBQUEsSUFXQSxPQUFBLEVBQVMsQ0FDUCxlQURPLEVBRVAsc0JBRk8sQ0FYVDtBQUFBLElBZUEsbUJBQUEsRUFBcUI7TUFDbkI7QUFBQSxRQUNFLElBQUEsRUFBTSx1QkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FEbUIsRUFLbkI7QUFBQSxRQUNFLElBQUEsRUFBTSw0QkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FMbUIsRUFTbkI7QUFBQSxRQUNFLElBQUEsRUFBTSx3Q0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FUbUIsRUFhbkI7QUFBQSxRQUNFLElBQUEsRUFBTSwrQ0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FibUIsRUFpQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sc0JBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BakJtQixFQXFCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSw0Q0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FyQm1CO0tBZnJCO0dBREY7QUFBQSxFQTZDQSxjQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTywyQkFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsMmxCQURXLENBRGI7QUFBQSxJQUlBLFlBQUEsRUFBYyxTQUpkO0FBQUEsSUFLQSxZQUFBLEVBQWMsU0FMZDtBQUFBLElBTUEsUUFBQSxFQUFVLENBQ1IsZUFEUSxFQUVSLHlCQUZRLENBTlY7QUFBQSxJQVVBLE9BQUEsRUFBUyxDQUNQLDJCQURPLENBVlQ7QUFBQSxJQWFBLG1CQUFBLEVBQXFCO01BQ25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sdUJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BRG1CLEVBS25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNEJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BTG1CLEVBU25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sd0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BVG1CLEVBYW5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sK0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BYm1CLEVBaUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHNCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWpCbUIsRUFxQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNENBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BckJtQjtLQWJyQjtHQTlDRjtBQUFBLEVBd0ZBLE9BQUEsRUFDRTtBQUFBLElBQUEsS0FBQSxFQUFPLHFCQUFQO0FBQUEsSUFDQSxXQUFBLEVBQWEsQ0FDWCx3UEFEVyxDQURiO0FBQUEsSUFJQSxZQUFBLEVBQWMsU0FKZDtBQUFBLElBS0EsWUFBQSxFQUFjLFNBTGQ7QUFBQSxJQU1BLFFBQUEsRUFBVSxDQUNSLG1CQURRLENBTlY7QUFBQSxJQVNBLE9BQUEsRUFBUyxDQUNQLDJCQURPLENBVFQ7QUFBQSxJQVlBLG1CQUFBLEVBQXFCO01BQ25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sdUJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BRG1CLEVBS25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNEJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BTG1CLEVBU25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sd0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BVG1CLEVBYW5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sK0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BYm1CLEVBaUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHNCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWpCbUIsRUFxQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNENBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BckJtQjtLQVpyQjtHQXpGRjtBQUFBLEVBa0lBLFVBQUEsRUFDRTtBQUFBLElBQUEsS0FBQSxFQUFPLGtEQUFQO0FBQUEsSUFDQSxXQUFBLEVBQWEsQ0FDWCwwUkFEVyxDQURiO0FBQUEsSUFJQSxZQUFBLEVBQWMsU0FKZDtBQUFBLElBS0EsWUFBQSxFQUFjLFNBTGQ7QUFBQSxJQU1BLFFBQUEsRUFBVSxDQUNSLEtBRFEsQ0FOVjtBQUFBLElBU0EsT0FBQSxFQUFTLENBQ1AsS0FETyxDQVRUO0FBQUEsSUFZQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FackI7R0FuSUY7QUFBQSxFQTRLQSxTQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTyxrREFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsNGJBRFcsQ0FEYjtBQUFBLElBSUEsWUFBQSxFQUFjLFNBSmQ7QUFBQSxJQUtBLFlBQUEsRUFBYyxVQUxkO0FBQUEsSUFNQSxRQUFBLEVBQVUsQ0FDUixrQkFEUSxDQU5WO0FBQUEsSUFTQSxPQUFBLEVBQVMsQ0FDUCwyRkFETyxDQVRUO0FBQUEsSUFZQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FackI7R0E3S0Y7QUFBQSxFQXNOQSxRQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTyxVQUFQO0FBQUEsSUFDQSxXQUFBLEVBQWEsQ0FDWCwyWUFEVyxDQURiO0FBQUEsSUFJQSxZQUFBLEVBQWMsU0FKZDtBQUFBLElBS0EsWUFBQSxFQUFjLFNBTGQ7QUFBQSxJQU1BLFFBQUEsRUFBVSxDQUNSLHlCQURRLENBTlY7QUFBQSxJQVNBLE9BQUEsRUFBUyxDQUNQLHdDQURPLENBVFQ7QUFBQSxJQVlBLG1CQUFBLEVBQXFCO01BQ25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sdUJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BRG1CLEVBS25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNEJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BTG1CLEVBU25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sd0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BVG1CLEVBYW5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sK0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BYm1CLEVBaUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHNCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWpCbUIsRUFxQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNENBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BckJtQjtLQVpyQjtHQXZORjtBQUFBLEVBZ1FBLFFBQUEsRUFDRTtBQUFBLElBQUEsS0FBQSxFQUFPLG1CQUFQO0FBQUEsSUFDQSxXQUFBLEVBQWEsQ0FDWCxrY0FEVyxDQURiO0FBQUEsSUFJQSxZQUFBLEVBQWMsU0FKZDtBQUFBLElBS0EsWUFBQSxFQUFjLFNBTGQ7QUFBQSxJQU1BLFFBQUEsRUFBVSxDQUNSLHFDQURRLENBTlY7QUFBQSxJQVNBLE9BQUEsRUFBUyxDQUNQLHNCQURPLENBVFQ7QUFBQSxJQVlBLG1CQUFBLEVBQXFCO01BQ25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sdUJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BRG1CLEVBS25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNEJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BTG1CLEVBU25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sd0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BVG1CLEVBYW5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sK0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BYm1CLEVBaUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHNCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWpCbUIsRUFxQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNENBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BckJtQjtLQVpyQjtHQWpRRjtBQUFBLEVBMFNBLFVBQUEsRUFDRTtBQUFBLElBQUEsS0FBQSxFQUFPLDJCQUFQO0FBQUEsSUFDQSxXQUFBLEVBQWEsQ0FDWCxtVUFEVyxDQURiO0FBQUEsSUFJQSxZQUFBLEVBQWMsU0FKZDtBQUFBLElBS0EsWUFBQSxFQUFjLFNBTGQ7QUFBQSxJQU1BLFFBQUEsRUFBVSxDQUNSLCtEQURRLENBTlY7QUFBQSxJQVNBLE9BQUEsRUFBUyxDQUNQLCtCQURPLENBVFQ7QUFBQSxJQVlBLG1CQUFBLEVBQXFCO01BQ25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sdUJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BRG1CLEVBS25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNEJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BTG1CLEVBU25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sd0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BVG1CLEVBYW5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sK0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BYm1CLEVBaUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHNCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWpCbUIsRUFxQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNENBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BckJtQjtLQVpyQjtHQTNTRjtDQUhGLENBQUE7O0FBQUEsTUF1Vk0sQ0FBQyxPQUFQLEdBQWlCLGdCQXZWakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGdCQUFBOztBQUFBLGdCQUFBLEdBQ0U7QUFBQSxFQUFBLEtBQUEsRUFBTztJQUNMO0FBQUEsTUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLGNBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSxTQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0FESyxFQVFMO0FBQUEsTUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLFlBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSxRQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0FSSyxFQWVMO0FBQUEsTUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLFNBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSxTQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0FmSyxFQXNCTDtBQUFBLE1BQ0UsSUFBQSxFQUFNLE1BRFI7QUFBQSxNQUVFLEtBQUEsRUFBTyxnQ0FGVDtBQUFBLE1BR0UsRUFBQSxFQUFJLFVBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQXRCSztHQUFQO0FBQUEsRUErQkEsb0JBQUEsRUFBc0I7SUFDcEI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksZUFGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTywrQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLElBTGI7QUFBQSxNQU1FLGFBQUEsRUFBZSxJQU5qQjtLQURvQixFQVNwQjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxVQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLG1CQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLE1BTUUsYUFBQSxFQUFlLElBTmpCO0tBVG9CLEVBaUJwQjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxZQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLHlCQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLE1BTUUsYUFBQSxFQUFlLElBTmpCO0tBakJvQixFQXlCcEI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksZ0JBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sMkJBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsTUFNRSxhQUFBLEVBQWUsSUFOakI7S0F6Qm9CLEVBaUNwQjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxVQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLG9CQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLE1BTUUsYUFBQSxFQUFlLElBTmpCO0tBakNvQixFQXlDcEI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksU0FGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTyxxQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLGFBQUEsRUFBZSxJQU5qQjtLQXpDb0IsRUFpRHBCO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLFlBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sa0RBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsTUFNRSxhQUFBLEVBQWUsSUFOakI7S0FqRG9CO0dBL0J0QjtBQUFBLEVBMEZBLG1CQUFBLEVBQXFCO0lBQ25CO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLGFBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxJQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8scUJBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0tBRG1CLEVBUW5CO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLFFBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxJQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sc0JBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0tBUm1CLEVBZW5CO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLG1CQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLDBCQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtLQWZtQixFQXNCbkI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksdUJBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sMENBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0tBdEJtQixFQTZCbkI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksb0JBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sd0VBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0tBN0JtQjtHQTFGckI7QUFBQSxFQWdJQSxlQUFBLEVBQWlCO0lBQ2Y7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksa0JBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxJQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8scUJBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0tBRGUsRUFRZjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxnQkFGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLElBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTyxtQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7S0FSZSxFQWVmO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLG1CQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLHNCQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtLQWZlLEVBc0JmO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLG9CQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLHVCQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtLQXRCZTtHQWhJakI7QUFBQSxFQStKQSxpQkFBQSxFQUFtQjtJQUNqQjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxjQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLHNEQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLE1BTUUsT0FBQSxFQUNFO0FBQUEsUUFBQSxLQUFBLEVBQU8sNEJBQVA7QUFBQSxRQUNBLE9BQUEsRUFBUyxtWkFEVDtPQVBKO0tBRGlCLEVBV2pCO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLGtCQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLGlEQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLE1BTUUsT0FBQSxFQUNFO0FBQUEsUUFBQSxLQUFBLEVBQU8sa0JBQVA7QUFBQSxRQUNBLE9BQUEsRUFBUyxrYUFEVDtPQVBKO0tBWGlCO0dBL0puQjtBQUFBLEVBc0xBLGlCQUFBLEVBQW1CO0lBQ2pCO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLGdCQUZOO0FBQUEsTUFHRSxRQUFBLEVBQVUsS0FIWjtBQUFBLE1BSUUsS0FBQSxFQUFPLDJCQUpUO0FBQUEsTUFLRSxTQUFBLEVBQVcsS0FMYjtBQUFBLE1BTUUsT0FBQSxFQUNFO0FBQUEsUUFBQSxLQUFBLEVBQU8scUJBQVA7QUFBQSxRQUNBLE9BQUEsRUFBUywrTEFEVDtPQVBKO0tBRGlCLEVBV2pCO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLFlBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sZ0NBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsTUFNRSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyx3QkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUNFLDBnQ0FGRjtPQVBKO0tBWGlCO0dBdExuQjtBQUFBLEVBZ05BLGdCQUFBLEVBQWtCO0lBQ2hCO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLFdBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sMEJBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsTUFNRSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTywrQkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUFTLHlUQURUO09BUEo7S0FEZ0IsRUFXaEI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksU0FGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTywrQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLDRCQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsK1hBRFQ7T0FQSjtLQVhnQjtHQWhObEI7QUFBQSxFQXVPQSxhQUFBLEVBQWU7SUFDYjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFlBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxjQUZOO0FBQUEsTUFHRSxLQUFBLEVBQU8sRUFIVDtBQUFBLE1BSUUsT0FBQSxFQUFTO1FBQ1A7QUFBQSxVQUNFLEVBQUEsRUFBSSxjQUROO0FBQUEsVUFFRSxLQUFBLEVBQU8sR0FGVDtBQUFBLFVBR0UsS0FBQSxFQUFPLEdBSFQ7QUFBQSxVQUlFLFFBQUEsRUFBVSxLQUpaO1NBRE8sRUFPUDtBQUFBLFVBQ0UsRUFBQSxFQUFJLGNBRE47QUFBQSxVQUVFLEtBQUEsRUFBTyxHQUZUO0FBQUEsVUFHRSxLQUFBLEVBQU8sR0FIVDtBQUFBLFVBSUUsUUFBQSxFQUFVLElBSlo7U0FQTyxFQWFQO0FBQUEsVUFDRSxFQUFBLEVBQUksY0FETjtBQUFBLFVBRUUsS0FBQSxFQUFPLEdBRlQ7QUFBQSxVQUdFLEtBQUEsRUFBTyxHQUhUO0FBQUEsVUFJRSxRQUFBLEVBQVUsS0FKWjtTQWJPLEVBbUJQO0FBQUEsVUFDRSxFQUFBLEVBQUksY0FETjtBQUFBLFVBRUUsS0FBQSxFQUFPLEdBRlQ7QUFBQSxVQUdFLEtBQUEsRUFBTyxHQUhUO0FBQUEsVUFJRSxRQUFBLEVBQVUsS0FKWjtTQW5CTyxFQXlCUDtBQUFBLFVBQ0UsRUFBQSxFQUFJLGNBRE47QUFBQSxVQUVFLEtBQUEsRUFBTyxJQUZUO0FBQUEsVUFHRSxLQUFBLEVBQU8sSUFIVDtBQUFBLFVBSUUsUUFBQSxFQUFVLEtBSlo7U0F6Qk87T0FKWDtLQURhO0dBdk9mO0FBQUEsRUErUUEseUJBQUEsRUFBMkI7SUFDekI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksWUFGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTywwQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLGdDQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsa2VBRFQ7T0FQSjtLQUR5QixFQVd6QjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxvQkFGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTyx1QkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLHlDQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsMFFBRFQ7T0FQSjtLQVh5QixFQXFCekI7QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksT0FGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTyxrQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLGtCQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsOGJBRFQ7T0FQSjtLQXJCeUIsRUErQnpCO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLFdBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8scUJBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsTUFNRSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyxxQkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUFTLHdZQURUO09BUEo7S0EvQnlCLEVBeUN6QjtBQUFBLE1BQ0UsSUFBQSxFQUFNLFVBRFI7QUFBQSxNQUVFLEVBQUEsRUFBSSxnQkFGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTywyQkFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLDJCQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsNlpBRFQ7T0FQSjtLQXpDeUI7R0EvUTNCO0FBQUEsRUFvVUEsTUFBQSxFQUFRO0lBQ047QUFBQSxNQUNFLElBQUEsRUFBTSxVQURSO0FBQUEsTUFFRSxFQUFBLEVBQUksS0FGTjtBQUFBLE1BR0UsUUFBQSxFQUFVLEtBSFo7QUFBQSxNQUlFLEtBQUEsRUFBTyxvREFKVDtBQUFBLE1BS0UsU0FBQSxFQUFXLEtBTGI7QUFBQSxNQU1FLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLG9CQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMseXFDQURUO09BUEo7S0FETSxFQWFOO0FBQUEsTUFDRSxJQUFBLEVBQU0sVUFEUjtBQUFBLE1BRUUsRUFBQSxFQUFJLElBRk47QUFBQSxNQUdFLFFBQUEsRUFBVSxLQUhaO0FBQUEsTUFJRSxLQUFBLEVBQU8sNERBSlQ7QUFBQSxNQUtFLFNBQUEsRUFBVyxLQUxiO0FBQUEsTUFNRSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyxtQkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUFTLGt3Q0FEVDtPQVBKO0tBYk07R0FwVVI7QUFBQSxFQThWQSxPQUFBLEVBQVM7SUFDUDtBQUFBLE1BQ0UsSUFBQSxFQUFNLFNBRFI7QUFBQSxNQUVFLEtBQUEsRUFBTywwQkFGVDtBQUFBLE1BR0UsRUFBQSxFQUFJLGtCQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0FETyxFQVFQO0FBQUEsTUFDRSxJQUFBLEVBQU0sU0FEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLDhCQUZUO0FBQUEsTUFHRSxFQUFBLEVBQUksdUJBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQVJPLEVBZVA7QUFBQSxNQUNFLElBQUEsRUFBTSxTQURSO0FBQUEsTUFFRSxLQUFBLEVBQU8sbUJBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSx5QkFITjtBQUFBLE1BSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxNQUtFLFdBQUEsRUFBYSxFQUxmO0tBZk8sRUFzQlA7QUFBQSxNQUNFLElBQUEsRUFBTSxTQURSO0FBQUEsTUFFRSxLQUFBLEVBQU8scUJBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSx5QkFITjtBQUFBLE1BSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxNQUtFLFdBQUEsRUFBYSxFQUxmO0tBdEJPLEVBNkJQO0FBQUEsTUFDRSxJQUFBLEVBQU0sU0FEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLG9CQUZUO0FBQUEsTUFHRSxFQUFBLEVBQUksd0JBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQTdCTyxFQW9DUDtBQUFBLE1BQ0UsSUFBQSxFQUFNLFNBRFI7QUFBQSxNQUVFLEtBQUEsRUFBTyxlQUZUO0FBQUEsTUFHRSxFQUFBLEVBQUkscUJBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQXBDTyxFQTJDUDtBQUFBLE1BQ0UsSUFBQSxFQUFNLFNBRFI7QUFBQSxNQUVFLEtBQUEsRUFBTywyQkFGVDtBQUFBLE1BR0UsRUFBQSxFQUFJLHFCQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0EzQ087R0E5VlQ7QUFBQSxFQWtaQSxRQUFBLEVBQVU7SUFDUjtBQUFBLE1BQ0UsSUFBQSxFQUFNLE1BRFI7QUFBQSxNQUVFLEtBQUEsRUFBTywwQkFGVDtBQUFBLE1BR0UsRUFBQSxFQUFJLGtCQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0FEUSxFQVFSO0FBQUEsTUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLDhCQUZUO0FBQUEsTUFHRSxFQUFBLEVBQUksdUJBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQVJRLEVBZVI7QUFBQSxNQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsTUFFRSxLQUFBLEVBQU8sbUJBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSx5QkFITjtBQUFBLE1BSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxNQUtFLFdBQUEsRUFBYSxFQUxmO0tBZlEsRUFzQlI7QUFBQSxNQUNFLElBQUEsRUFBTSxNQURSO0FBQUEsTUFFRSxLQUFBLEVBQU8scUJBRlQ7QUFBQSxNQUdFLEVBQUEsRUFBSSx5QkFITjtBQUFBLE1BSUUsS0FBQSxFQUFPLEVBSlQ7QUFBQSxNQUtFLFdBQUEsRUFBYSxFQUxmO0tBdEJRLEVBNkJSO0FBQUEsTUFDRSxJQUFBLEVBQU0sTUFEUjtBQUFBLE1BRUUsS0FBQSxFQUFPLG9CQUZUO0FBQUEsTUFHRSxFQUFBLEVBQUksd0JBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQTdCUSxFQW9DUjtBQUFBLE1BQ0UsSUFBQSxFQUFNLE1BRFI7QUFBQSxNQUVFLEtBQUEsRUFBTyxlQUZUO0FBQUEsTUFHRSxFQUFBLEVBQUkscUJBSE47QUFBQSxNQUlFLEtBQUEsRUFBTyxFQUpUO0FBQUEsTUFLRSxXQUFBLEVBQWEsRUFMZjtLQXBDUSxFQTJDUjtBQUFBLE1BQ0UsSUFBQSxFQUFNLE1BRFI7QUFBQSxNQUVFLEtBQUEsRUFBTywyQkFGVDtBQUFBLE1BR0UsRUFBQSxFQUFJLHFCQUhOO0FBQUEsTUFJRSxLQUFBLEVBQU8sRUFKVDtBQUFBLE1BS0UsV0FBQSxFQUFhLEVBTGY7S0EzQ1E7R0FsWlY7Q0FERixDQUFBOztBQUFBLE1BMmNNLENBQUMsT0FBUCxHQUFpQixnQkEzY2pCLENBQUE7Ozs7O0FDTUEsVUFBVSxDQUFDLGNBQVgsQ0FBMkIsTUFBM0IsRUFBbUMsU0FBRSxJQUFGLEVBQVEsR0FBUixHQUFBO0FBRWpDLE1BQUEsTUFBQTtBQUFBLEVBQUEsSUFBQSxHQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0JBQWpCLENBQW1DLElBQW5DLENBQVAsQ0FBQTtBQUFBLEVBQ0EsR0FBQSxHQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsZ0JBQWpCLENBQW1DLEdBQW5DLENBRFAsQ0FBQTtBQUFBLEVBR0EsTUFBQSxHQUFTLFdBQUEsR0FBYyxHQUFkLEdBQW9CLElBQXBCLEdBQTJCLElBQTNCLEdBQWtDLE1BSDNDLENBQUE7QUFLQSxTQUFXLElBQUEsVUFBVSxDQUFDLFVBQVgsQ0FBdUIsTUFBdkIsQ0FBWCxDQVBpQztBQUFBLENBQW5DLENBQUEsQ0FBQTs7Ozs7QUNEQSxJQUFBLFdBQUE7O0FBQUEsV0FBQSxHQUFjLE9BQUEsQ0FBUSxPQUFSLENBQWQsQ0FBQTs7QUFBQSxDQUdBLENBQUUsU0FBQSxHQUFBO0FBR0EsRUFBQSxXQUFXLENBQUMsVUFBWixDQUFBLENBQUEsQ0FBQTtTQUdBLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBakIsQ0FBQSxFQU5BO0FBQUEsQ0FBRixDQUhBLENBQUE7Ozs7O0FDQ0EsSUFBQSxnQkFBQTtFQUFBO2lTQUFBOztBQUFBLEtBQUEsR0FBUSxPQUFBLENBQVEsd0JBQVIsQ0FBUixDQUFBOztBQUFBLE1BRU0sQ0FBQyxPQUFQLEdBQXVCO0FBQU4sOEJBQUEsQ0FBQTs7OztHQUFBOzttQkFBQTs7R0FBd0IsTUFGekMsQ0FBQTs7Ozs7QUNBQSxJQUFBLEtBQUE7RUFBQTtpU0FBQTs7QUFBQSxNQUFNLENBQUMsT0FBUCxHQUF1QjtBQUFOLDBCQUFBLENBQUE7Ozs7R0FBQTs7ZUFBQTs7R0FBb0IsUUFBUSxDQUFDLE1BQTlDLENBQUE7Ozs7O0FDQUEsSUFBQSxtQkFBQTtFQUFBO2lTQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVMsUUFBVCxDQUFkLENBQUE7O0FBQUEsTUFFTSxDQUFDLE9BQVAsR0FBdUI7QUFNckIsMkJBQUEsQ0FBQTs7OztHQUFBOztBQUFBLG1CQUFBLE1BQUEsR0FDRTtBQUFBLElBQUEsRUFBQSxFQUFLLE1BQUw7R0FERixDQUFBOztBQUFBLG1CQU9BLElBQUEsR0FBTSxTQUFBLEdBQUE7V0FDSixDQUFBLENBQUcsTUFBSCxDQUFXLENBQUMsSUFBWixDQUFrQixXQUFXLENBQUMsUUFBUSxDQUFDLE1BQXJCLENBQUEsQ0FBNkIsQ0FBQyxFQUFoRCxFQURJO0VBQUEsQ0FQTixDQUFBOztnQkFBQTs7R0FOb0MsUUFBUSxDQUFDLE9BRi9DLENBQUE7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdlZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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LFdBQU8sSUFBUCxDQUxNO0VBQUEsQ0EzQlIsQ0FBQTs7QUFBQSxpQkFxQ0EsV0FBQSxHQUFhLFNBQUEsR0FBQSxDQXJDYixDQUFBOztBQXVDQTtBQUFBOzs7S0F2Q0E7O0FBMkNBO0FBQUE7OztLQTNDQTs7QUErQ0E7QUFBQTs7O0tBL0NBOztjQUFBOztHQUZpQixRQUFRLENBQUMsS0FGNUIsQ0FBQTs7QUFBQSxNQXVETSxDQUFDLE9BQVAsR0FBaUIsSUF2RGpCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2hpbnQgZXFudWxsOiB0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuXG52YXIgSGFuZGxlYmFycyA9IHt9O1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZFUlNJT04gPSBcIjEuMC4wXCI7XG5IYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OID0gNDtcblxuSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcblxuSGFuZGxlYmFycy5oZWxwZXJzICA9IHt9O1xuSGFuZGxlYmFycy5wYXJ0aWFscyA9IHt9O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGZ1bmN0aW9uVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyID0gZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsID0gZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcblxuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm4odGhpcyk7XG4gIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5LID0gZnVuY3Rpb24oKSB7fTtcblxuSGFuZGxlYmFycy5jcmVhdGVGcmFtZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24ob2JqZWN0KSB7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBvYmplY3Q7XG4gIHZhciBvYmogPSBuZXcgSGFuZGxlYmFycy5LKCk7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBudWxsO1xuICByZXR1cm4gb2JqO1xufTtcblxuSGFuZGxlYmFycy5sb2dnZXIgPSB7XG4gIERFQlVHOiAwLCBJTkZPOiAxLCBXQVJOOiAyLCBFUlJPUjogMywgbGV2ZWw6IDMsXG5cbiAgbWV0aG9kTWFwOiB7MDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcid9LFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChIYW5kbGViYXJzLmxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IEhhbmRsZWJhcnMubG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy5sb2cgPSBmdW5jdGlvbihsZXZlbCwgb2JqKSB7IEhhbmRsZWJhcnMubG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgZGF0YSA9IEhhbmRsZWJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgfVxuXG4gIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgaWYoY29udGV4dCBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYoZGF0YSkgeyBkYXRhLmtleSA9IGtleTsgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihpID09PSAwKXtcbiAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb25kaXRpb25hbCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICBpZighY29uZGl0aW9uYWwgfHwgSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZufSk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmICghSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgSGFuZGxlYmFycy5sb2cobGV2ZWwsIGNvbnRleHQpO1xufSk7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WTSA9IHtcbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKHRlbXBsYXRlU3BlYykge1xuICAgIC8vIEp1c3QgYWRkIHdhdGVyXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICAgIGludm9rZVBhcnRpYWw6IEhhbmRsZWJhcnMuVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgICB9LFxuICAgICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgICAgcmV0ID0ge307XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogSGFuZGxlYmFycy5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgICAgbm9vcDogSGFuZGxlYmFycy5WTS5ub29wLFxuICAgICAgY29tcGlsZXJJbmZvOiBudWxsXG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChjb250YWluZXIsIEhhbmRsZWJhcnMsIGNvbnRleHQsIG9wdGlvbnMuaGVscGVycywgb3B0aW9ucy5wYXJ0aWFscywgb3B0aW9ucy5kYXRhKTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyA9IGNvbnRhaW5lci5jb21waWxlckluZm8gfHwgW10sXG4gICAgICAgICAgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IEhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxuXG4gIHByb2dyYW1XaXRoRGVwdGg6IGZ1bmN0aW9uKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IDA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIG5vb3A6IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJcIjsgfSxcbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKCFIYW5kbGViYXJzLmNvbXBpbGUpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gSGFuZGxlYmFycy5jb21waWxlKHBhcnRpYWwsIHtkYXRhOiBkYXRhICE9PSB1bmRlZmluZWR9KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMudGVtcGxhdGUgPSBIYW5kbGViYXJzLlZNLnRlbXBsYXRlO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG5cbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gQkVHSU4oQlJPV1NFUilcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5IYW5kbGViYXJzLkV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufTtcbkhhbmRsZWJhcnMuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuSGFuZGxlYmFycy5TYWZlU3RyaW5nID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufTtcbkhhbmRsZWJhcnMuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5nLnRvU3RyaW5nKCk7XG59O1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxudmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn07XG5cbkhhbmRsZWJhcnMuVXRpbHMgPSB7XG4gIGV4dGVuZDogZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXNjYXBlRXhwcmVzc2lvbjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBIYW5kbGViYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsIHx8IHN0cmluZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9IHN0cmluZy50b1N0cmluZygpO1xuXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZih0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMnKS5jcmVhdGUoKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcycpLmF0dGFjaChleHBvcnRzKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzJykuYXR0YWNoKGV4cG9ydHMpIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgREVTSUdOIFdJWkFSRFxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICAjIEFwcCBEYXRhXG4gICAgQXBwRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb250ZW50JylcblxuICAgIEBkYXRhID0gQXBwRGF0YVxuXG5cbiAgICAjIEltcG9ydCB2aWV3c1xuICAgIEhvbWVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Ib21lVmlldycpXG5cbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuICAgIElucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG4gICAgT3V0cHV0VmlldyA9IHJlcXVpcmUoJy4vdmlld3MvT3V0cHV0VmlldycpXG5cblxuICAgICMgSW5pdGlhbGl6ZSB2aWV3c1xuICAgIEBob21lVmlldyA9IG5ldyBIb21lVmlldygpXG5cbiAgICBAaW5wdXRJdGVtVmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KClcblxuICAgIEBvdXRwdXRWaWV3ID0gbmV3IE91dHB1dFZpZXcoKVxuXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXG4gICAgXG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uIiwibW9kdWxlLmV4cG9ydHMgPSBXaXphcmRBc3NpZ25tZW50RGF0YSA9IFtdIiwiV2l6YXJkQ29udGVudCA9IFtcbiAge1xuICAgIGlkOiBcImludHJvXCJcbiAgICB0aXRsZTogJ1dlbGNvbWUgdG8gdGhlIFdpa2lwZWRpYSBBc3NpZ25tZW50IFdpemFyZCEnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnU2luY2UgV2lraXBlZGlhIGJlZ2FuIGluIDIwMDEsIHByb2Zlc3NvcnMgYXJvdW5kIHRoZSB3b3JsZCBoYXZlIGludGVncmF0ZWQgdGhlIGZyZWUgZW5jeWNsb3BlZGlhIHRoYXQgYW55b25lIGNhbiBlZGl0IGludG8gdGhlaXIgY3VycmljdWx1bS48YnIvPjxici8+VGhpcyBpbnRlcmFjdGl2ZSB3aXphcmQgd2lsbCB0YWtlIHlvdSB0aHJvdWdoIHRoZSByZXF1aXJlZCBzdGVwcyB0byBjcmVhdGUgYSBjdXN0b20gYXNzaWdubWVudCBmb3IgeW91ciBjbGFzcy4gUGxlYXNlIGJlZ2luIGJ5IGZpbGxpbmcgaW4gdGhlIGZvbGxvd2luZyBmaWVsZHM6J1xuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAndGV4dCdcbiAgICAgICAgbGFiZWw6ICdUZWFjaGVyIE5hbWUnXG4gICAgICAgIGlkOiAndGVhY2hlcidcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAndGV4dCdcbiAgICAgICAgbGFiZWw6ICdVbml2ZXJzaXR5J1xuICAgICAgICBpZDogJ3NjaG9vbCdcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAndGV4dCdcbiAgICAgICAgbGFiZWw6ICdTdWJqZWN0J1xuICAgICAgICBpZDogJ3N1YmplY3QnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3RleHQnXG4gICAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgICBpZDogJ3N0dWRlbnRzJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICBcbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImFzc2lnbm1lbnRfc2VsZWN0aW9uXCJcbiAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgdHlwZSBzZWxlY3Rpb24nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgYXNzaWdubWVudCBzZWxlY3Rpb25zJ1xuICAgIGZvcm1UaXRsZTogJ0F2YWlsYWJsZSBhc3NpZ25tZW50cydcbiAgICBpbnN0cnVjdGlvbnM6ICdEZXBlbmRpbmcgb24gdGhlIGxlYXJuaW5nIGdvYWxzIHlvdSBoYXZlIGZvciB5b3VyIGNvdXJzZSBhbmQgaG93IG11Y2ggdGltZSB5b3Ugd2FudCB0byBkZXZvdGUgdG8geW91ciBXaWtpcGVkaWEgcHJvamVjdCwgdGhlcmUgYXJlIG1hbnkgZWZmZWN0aXZlIHdheXMgdG8gdXNlIFdpa2lwZWRpYSBpbiB5b3VyIGNvdXJzZS4gJ1xuICAgIGlucHV0czogW1xuICAgICAgeyBcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuZCB3cml0ZSBhbiBhcnRpY2xlJ1xuICAgICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgfVxuICAgICAgeyBcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2V2YWx1YXRlJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdFdmFsdWF0ZSBhcnRpY2xlcydcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICB9XG4gICAgICB7IFxuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgfVxuICAgICAgeyBcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ3NvdXJjZWNlbnRlcmVkJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIH1cbiAgICAgIHsgXG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnQ29weS9lZGl0IGFydGljbGVzJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIH1cbiAgICAgIHsgXG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdmaW5kZml4J1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdGaW5kIGFuZCBmaXggZXJyb3JzJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIH0gIFxuICAgICAgeyBcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ3BsYWdpYXJpc20nXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0lkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbSdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICB9ICAgICBcbiAgICBdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+RXhwZXJpZW5jZWQgaW5zdHJ1Y3RvcnMgc2F5IGl0IGlzIGNydWNpYWwgZm9yIHN0dWRlbnRzIHdobyBhcmUgZ29pbmcgdG8gYmUgZWRpdGluZyBXaWtpcGVkaWEgdG8gYmVjb21lIGNvbWZvcnRhYmxlIG5vdCBvbmx5IHdpdGggdGhlIG1hcmt1cCwgYnV0IGFsc28gdGhlIGNvbW11bml0eS4gSW50cm9kdWNpbmcgdGhlIFdpa2lwZWRpYSBwcm9qZWN0IGVhcmx5IGluIHRoZSB0ZXJtIGFuZCByZXF1aXJpbmcgbWlsZXN0b25lcyB0aHJvdWdob3V0IHRoZSB0ZXJtIHdpbGwgYWNjbGltYXRlIHN0dWRlbnRzIHRvIHRoZSBzaXRlIGFuZCBoZWFkIG9mZiBwcm9jcmFzdGluYXRpb24uPC9wPidcbiAgICAgICAgICAnPHA+VG8gbWFrZSB0aGUgdGhlIG1vc3Qgb2YgeW91ciBXaWtpcGVkaWEgcHJvamVjdCwgdHJ5IHRvIGludGVncmF0ZSB5b3VyIFdpa2lwZWRpYSBhc3NpZ25tZW50IHdpdGggdGhlIGNvdXJzZSB0aGVtZXMuIEVuZ2FnZSB5b3VyIHN0dWRlbnRzIHdpdGggcXVlc3Rpb25zIG9mIG1lZGlhIGxpdGVyYWN5IGFuZCBrbm93bGVkZ2UgY29uc3RydWN0aW9uIHRocm91Z2hvdXQgeW91ciBjb3Vyc2UuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwibGVhcm5pbmdfZXNzZW50aWFsc1wiXG4gICAgdGl0bGU6ICdMZWFybmluZyBXaWtpIEVzc2VudGlhbHMnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZSBvciBtb3JlOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCB3aWtpIGVzc2VudGlhbHMnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnVG8gZ2V0IHN0YXJ0ZWQsIHlvdVxcJ2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuIEFzIHRoZWlyIGZpcnN0IFdpa2lwZWRpYSBhc3NpZ25tZW50IG1pbGVzdG9uZSwgeW91IGNhbiBhc2sgdGhlIHN0dWRlbnRzIHRvIGNyZWF0ZSBhY2NvdW50cyBhbmQgdGhlbiBjb21wbGV0ZSB0aGUgb25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50cy4gJ1xuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnY3JlYXRlX3VzZXInXG4gICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIGxhYmVsOiAnQ3JlYXRlIFVzZXIgQWNjb3VudCdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICBsYWJlbDogJ0Vucm9sbCB0byB0aGUgQ291cnNlJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdjb21wbGV0ZV90cmFpbmluZydcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnQ29tcGxldGUgT25saW5lIFRyYWluaW5nJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdpbnRyb2R1Y2VfYW1iYXNzYWRvcnMnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2luY2x1ZGVfY29tcGxldGlvbidcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnSW5jbHVkZSBDb21wbGV0aW9uIG9mIHRoaXMgQXNzaWdubWVudCBhcyBQYXJ0IG9mIHRoZSBTdHVkZW50c1xcJ3MgR3JhZGUnXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIH1cbiAgICBdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5UaGlzIHRyYWluaW5nIGludHJvZHVjZXMgdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkgYW5kIGhvdyBpdCB3b3JrcywgZGVtb25zdHJhdGVzIHRoZSBiYXNpY3Mgb2YgZWRpdGluZyBhbmQgd2Fsa3Mgc3R1ZGVudHMgdGhyb3VnaCB0aGVpciBmaXJzdCBlZGl0cywgZ2l2ZXMgYWR2aWNlIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgYW5kIGRyYWZ0aW5nIHJldmlzaW9ucywgYW5kIGNvdmVycyBzb21lIG9mIHRoZSB3YXlzIHRoZXkgY2FuIGZpbmQgaGVscCBhcyB0aGV5IGdldCBzdGFydGVkLiBJdCB0YWtlcyBhYm91dCBhbiBob3VyIGFuZCBlbmRzIHdpdGggYSBjZXJ0aWZpY2F0aW9uIHN0ZXAgdGhhdCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lcydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5DcmVhdGUgYSB1c2VyIGFjY291bnQgYW5kIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2U8L3A+J1xuICAgICAgICAgICc8cD5Db21wbGV0ZSB0aGUgb25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50cy4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgICAgJzxwPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ2V0dGluZ19zdGFydGVkXCJcbiAgICB0aXRsZTogJ0dldHRpbmcgU3RhcnRlZCB3aXRoIEVkaXRpbmcnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgZWRpdGluZydcbiAgICBpbnN0cnVjdGlvbnM6IFwiSXQgaXMgaW1wb3J0YW50IGZvciBzdHVkZW50cyB0byBzdGFydCBlZGl0aW5nIFdpa2lwZWRpYSByaWdodCBhd2F5LiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgIGZvcm1UaXRsZTogJ1doaWNoIGJhc2ljIGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgaW4geW91ciBjb3Vyc2U/J1xuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnY3JpdGlxdWVfYXJ0aWNsZSdcbiAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgbGFiZWw6ICdDcml0aXF1ZSBhbiBBcnRpY2xlJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdhZGRfdG9fYXJ0aWNsZSdcbiAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgbGFiZWw6ICdBZGQgdG8gYW4gQXJ0aWNsZSdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnY29weV9lZGl0X2FydGljbGUnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0NvcHktRWRpdCBhbiBBcnRpY2xlJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdpbGx1c3RyYXRlX2FydGljbGUnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gQXJ0aWNsZSdcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgfVxuICAgIF1cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgIHRpdGxlOiAnQ2hvb3NpbmcgQXJ0aWNsZXMnXG4gICAgZm9ybVRpdGxlOiAnVGhlcmUgYXJlIHR3byByZWNvbW1lbmRlZCBvcHRpb25zIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgZm9yIFdpa2lwZWRpYSBhc3NpZ25tZW50czonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgY2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnQ2hvb3NpbmcgdGhlIHJpZ2h0IChvciB3cm9uZykgYXJ0aWNsZXMgdG8gd29yayBvbiBjYW4gbWFrZSAob3IgYnJlYWspIGEgV2lraXBlZGlhIHdyaXRpbmcgYXNzaWdubWVudC4nXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdyYWRpbydcbiAgICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgICAgbGFiZWw6ICcnXG4gICAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIFByZXBhcmVzIGEgTGlzdCB3aXRoIEFwcHJvcHJpYXRlIEFydGljbGVzJ1xuICAgICAgICAgICAgdmFsdWU6ICdwcmVwYXJlX2xpc3QnXG4gICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcblxuICAgICAgICAgIH1cbiAgICAgICAgICB7XG4gICAgICAgICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgICAgICAgbGFiZWw6ICdTdHVkZW50cyBFeHBsb3JlIGFuZCBQcmVwYXJlIGEgTGlzdCBvZiBBcnRpY2xlcydcbiAgICAgICAgICAgIHZhbHVlOiAnc3R1ZGVudHNfZXhwbG9yZSdcbiAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Tb21lIGFydGljbGVzIG1heSBpbml0aWFsbHkgbG9vayBlYXN5IHRvIGltcHJvdmUsIGJ1dCBxdWFsaXR5IHJlZmVyZW5jZXMgdG8gZXhwYW5kIHRoZW0gbWF5IGJlIGRpZmZpY3VsdCB0byBmaW5kLiBGaW5kaW5nIHRvcGljcyB3aXRoIHRoZSByaWdodCBiYWxhbmNlIGJldHdlZW4gcG9vciBXaWtpcGVkaWEgY292ZXJhZ2UgYW5kIGF2YWlsYWJsZSBsaXRlcmF0dXJlIGZyb20gd2hpY2ggdG8gZXhwYW5kIHRoYXQgY292ZXJhZ2UgY2FuIGJlIHRyaWNreS4gSGVyZSBhcmUgc29tZSBndWlkZWxpbmVzIHRvIGtlZXAgaW4gbWluZCB3aGVuIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgaW1wcm92ZW1lbnQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgYWNjb3JkaWFuOiBmYWxzZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5BcHBseWluZyB5b3VyIG93biBleHBlcnRpc2UgdG8gV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkIGlzIHRoZSBrZXkgdG8gYSBzdWNjZXNzZnVsIGFzc2lnbm1lbnQuIFlvdSB1bmRlcnN0YW5kIHRoZSBicm9hZGVyIGludGVsbGVjdHVhbCBjb250ZXh0IHdoZXJlIGluZGl2aWR1YWwgdG9waWNzIGZpdCBpbiwgeW91IGNhbiByZWNvZ25pemUgd2hlcmUgV2lraXBlZGlhIGZhbGxzIHNob3J0LCB5b3Uga25vd+KAlG9yIGtub3cgaG93IHRvIGZpbmTigJR0aGUgcmVsZXZhbnQgbGl0ZXJhdHVyZSwgYW5kIHlvdSBrbm93IHdoYXQgdG9waWNzIHlvdXIgc3R1ZGVudHMgc2hvdWxkIGJlIGFibGUgdG8gaGFuZGxlLiBZb3VyIGd1aWRhbmNlIG9uIGFydGljbGUgY2hvaWNlIGFuZCBzb3VyY2luZyBpcyBjcml0aWNhbCBmb3IgYm90aCB5b3VyIHN0dWRlbnRz4oCZIHN1Y2Nlc3MgYW5kIHRoZSBpbXByb3ZlbWVudCBvZiBXaWtpcGVkaWEuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdOb3Qgc3VjaCBhIGdvb2QgY2hvaWNlJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+QXJ0aWNsZXMgdGhhdCBhcmUgXFxcIm5vdCBzdWNoIGEgZ29vZCBjaG9pY2VcXFwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD5cIlxuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPllvdSBwcm9iYWJseSBzaG91bGRuJ3QgdHJ5IHRvIGNvbXBsZXRlbHkgb3ZlcmhhdWwgYXJ0aWNsZXMgb24gdmVyeSBicm9hZCB0b3BpY3MgKGUuZy4sIExhdykuPC9saT5cbiAgICAgICAgICAgIDxsaT5Zb3Ugc2hvdWxkIHByb2JhYmx5IGF2b2lkIHRyeWluZyB0byBpbXByb3ZlIGFydGljbGVzIG9uIHRvcGljcyB0aGF0IGFyZSBoaWdobHkgY29udHJvdmVyc2lhbCAoZS5nLiwgR2xvYmFsIFdhcm1pbmcsIEFib3J0aW9uLCBTY2llbnRvbG9neSwgZXRjLikuIFlvdSBtYXkgYmUgbW9yZSBzdWNjZXNzZnVsIHN0YXJ0aW5nIGEgc3ViLWFydGljbGUgb24gdGhlIHRvcGljIGluc3RlYWQuPC9saT5cbiAgICAgICAgICAgIDxsaT5Eb24ndCB3b3JrIG9uIGFuIGFydGljbGUgdGhhdCBpcyBhbHJlYWR5IG9mIGhpZ2ggcXVhbGl0eSBvbiBXaWtpcGVkaWEsIHVubGVzcyB5b3UgZGlzY3VzcyBhIHNwZWNpZmljIHBsYW4gZm9yIGltcHJvdmluZyBpdCB3aXRoIG90aGVyIGVkaXRvcnMgYmVmb3JlaGFuZC48L2xpPlxuICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHN0YXJ0IGFydGljbGVzIHdpdGggdGl0bGVzIHRoYXQgaW1wbHkgYW4gYXJndW1lbnQgb3IgZXNzYXktbGlrZSBhcHByb2FjaCAoZS5nLiwgVGhlIEVmZmVjdHMgVGhhdCBUaGUgUmVjZW50IFN1Yi1QcmltZSBNb3J0Z2FnZSBDcmlzaXMgaGFzIGhhZCBvbiB0aGUgVVMgYW5kIEdsb2JhbCBFY29ub21pY3MpLiBUaGVzZSB0eXBlIG9mIHRpdGxlcywgYW5kIG1vc3QgbGlrZWx5IHRoZSBjb250ZW50IHRvbywgbWF5IG5vdCBiZSBhcHByb3ByaWF0ZSBmb3IgYW4gZW5jeWNsb3BlZGlhLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnR29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+Q2hvb3NlIGEgd2VsbC1lc3RhYmxpc2hlZCB0b3BpYyBmb3Igd2hpY2ggYSBsb3Qgb2YgbGl0ZXJhdHVyZSBpcyBhdmFpbGFibGUgaW4gaXRzIGZpZWxkLCBidXQgd2hpY2ggaXNuJ3QgY292ZXJlZCBleHRlbnNpdmVseSBvbiBXaWtpcGVkaWEuPC9saT5cbiAgICAgICAgICAgIDxsaT5HcmF2aXRhdGUgdG93YXJkIFxcXCJzdHViXFxcIiBhbmQgXFxcInN0YXJ0XFxcIiBjbGFzcyBhcnRpY2xlcy4gVGhlc2UgYXJ0aWNsZXMgb2Z0ZW4gaGF2ZSBvbmx5IDEtMiBwYXJhZ3JhcGhzIG9mIGluZm9ybWF0aW9uIGFuZCBhcmUgaW4gbmVlZCBvZiBleHBhbnNpb24uIFJlbGV2YW50IFdpa2lQcm9qZWN0IHBhZ2VzIGNhbiBwcm92aWRlIGEgbGlzdCBvZiBzdHVicyB0aGF0IG5lZWQgaW1wcm92ZW1lbnQuPC9saT5cbiAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICBcbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcInJlc2VhcmNoX3BsYW5uaW5nXCJcbiAgICB0aXRsZTogJ1Jlc2VhcmNoICYgUGxhbm5pbmcnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcmVzZWFyY2ggJiBwbGFubmluZydcbiAgICBpbnN0cnVjdGlvbnM6ICBcIlN0dWRlbnRzIG9mdGVuIHdhaXQgdW50aWwgdGhlIGxhc3QgbWludXRlIHRvIGRvIHRoZWlyIHJlc2VhcmNoLCBvciBjaG9vc2Ugc291cmNlcyB1bnN1aXRlZCBmb3IgV2lraXBlZGlhLiBUaGF0J3Mgd2h5IHdlIHJlY29tbWVuZCBhc2tpbmcgc3R1ZGVudHMgdG8gcHV0IHRvZ2V0aGVyIGEgYmlibGlvZ3JhcGh5IG9mIG1hdGVyaWFscyB0aGV5IHdhbnQgdG8gdXNlIGluIGVkaXRpbmcgdGhlIGFydGljbGUsIHdoaWNoIGNhbiB0aGVuIGJlIGFzc2Vzc2VkIGJ5IHlvdSBhbmQgb3RoZXIgV2lraXBlZGlhbnMuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+VGhlbiwgc3R1ZGVudHMgc2hvdWxkIHByb3Bvc2Ugb3V0bGluZXMgZm9yIHRoZWlyIGFydGljbGVzLiBUaGlzIGNhbiBiZSBhIHRyYWRpdGlvbmFsIG91dGxpbmUsIGluIHdoaWNoIHN0dWRlbnRzIGlkZW50aWZ5IHdoaWNoIHNlY3Rpb25zIHRoZWlyIGFydGljbGVzIHdpbGwgaGF2ZSBhbmQgd2hpY2ggYXNwZWN0cyBvZiB0aGUgdG9waWMgd2lsbCBiZSBjb3ZlcmVkIGluIGVhY2ggc2VjdGlvbi4gQWx0ZXJuYXRpdmVseSwgc3R1ZGVudHMgY2FuIGRldmVsb3AgZWFjaCBvdXRsaW5lIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbiDigJQgdGhlIHVudGl0bGVkIHNlY3Rpb24gYXQgdGhlIGJlZ2lubmluZyBvZiBhbiBhcnRpY2xlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHByb3ZpZGUgYSBjb25jaXNlIHN1bW1hcnkgb2YgaXRzIGNvbnRlbnQuIFdvdWxkIHlvdSBsaWtlIHlvdXIgc3R1ZGVudHMgdG8gY3JlYXRlIHRyYWRpdGlvbmFsIG91dGxpbmVzLCBvciBjb21wb3NlIG91dGxpbmVzIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhLXN0eWxlIGxlYWQgc2VjdGlvbj88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3JhZGlvJ1xuICAgICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgICBsYWJlbDogJydcbiAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICAgICAgICBsYWJlbDogJ0NyZWF0ZSBhbiBBcnRpY2xlIE91dGxpbmUnXG4gICAgICAgICAgICB2YWx1ZTogJ2NyZWF0ZV9vdXRsaW5lJ1xuICAgICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICAgICAgICBsYWJlbDogJ1dyaXRlIHRoZSBBcnRpY2xlIExlYWQgU2VjdGlvbidcbiAgICAgICAgICAgIHZhbHVlOiAnd3JpdGVfbGVhZCdcbiAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgdGl0bGU6ICdEcmFmdHMgJiBNYWluc3BhY2UnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgZHJhZnRzICYgbWFpbnNwYWNlJ1xuICAgIGluc3RydWN0aW9uczogJ09uY2Ugc3R1ZGVudHMgaGF2ZSBnb3R0ZW4gYSBncmlwIG9uIHRoZWlyIHRvcGljcyBhbmQgdGhlIHNvdXJjZXMgdGhleSB3aWxsIHVzZSB0byB3cml0ZSBhYm91dCB0aGVtLCBpdOKAmXMgdGltZSB0byBzdGFydCB3cml0aW5nIG9uIFdpa2lwZWRpYS4gWW91IGNhbiBhc2sgdGhlbSB0byBqdW1wIHJpZ2h0IGluIGFuZCBlZGl0IGxpdmUsIG9yIHN0YXJ0IHRoZW0gb2ZmIGluIHRoZWlyIG93biBzYW5kYm94ZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIHRvIGVhY2ggYXBwcm9hY2guJ1xuICAgIHNlY3Rpb25zOiBbXG4gICAgXVxuICAgIGlucHV0czogW1xuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgdGl0bGU6ICdQZWVyIEZlZWRiYWNrJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHBlZXIgZmVlZGJhY2snXG4gICAgZm9ybVRpdGxlOiBcIkhvdyBNYW55IFBlZXIgUmV2aWV3cyBTaG91bGQgRWFjaCBTdHVkZW50IENvbmR1Y3Q/XCJcbiAgICBpbnN0cnVjdGlvbnM6IFwiQ29sbGFib3JhdGlvbiBpcyBhIGNyaXRpY2FsIGVsZW1lbnQgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYS4gRm9yIHNvbWUgc3R1ZGVudHMsIHRoaXMgd2lsbCBoYXBwZW4gc3BvbnRhbmVvdXNseTsgdGhlaXIgY2hvaWNlIG9mIHRvcGljcyB3aWxsIGF0dHJhY3QgaW50ZXJlc3RlZCBXaWtpcGVkaWFucyB3aG8gd2lsbCBwaXRjaCBpbiB3aXRoIGlkZWFzLCBjb3B5ZWRpdHMsIG9yIGV2ZW4gc3Vic3RhbnRpYWwgY29udHJpYnV0aW9ucyB0byB0aGUgc3R1ZGVudHPigJkgYXJ0aWNsZXMuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+T25saW5lIEFtYmFzc2Fkb3JzIHdpdGggYW4gaW50ZXJlc3QgaW4gdGhlIHN0dWRlbnRzJyB0b3BpY3MgY2FuIGFsc28gbWFrZSBncmVhdCBjb2xsYWJvcmF0b3JzLiBJbiBtYW55IGNhc2VzLCBob3dldmVyLCB0aGVyZSB3aWxsIGJlIGxpdHRsZSBzcG9udGFuZW91cyBlZGl0aW5nIG9mIHN0dWRlbnRz4oCZIGFydGljbGVzIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSB0ZXJtLjwvcD5cIlxuICAgICAgICAgIFwiPHA+Rm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICBcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3JhZGlvR3JvdXAnXG4gICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICBsYWJlbDogJydcbiAgICAgICAgb3B0aW9uczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgICAgbGFiZWw6ICcxJ1xuICAgICAgICAgICAgdmFsdWU6ICcxJ1xuICAgICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgfVxuICAgICAgICAgIHtcbiAgICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgICAgbGFiZWw6ICcyJ1xuICAgICAgICAgICAgdmFsdWU6ICcyJ1xuICAgICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgICBsYWJlbDogJzMnXG4gICAgICAgICAgICB2YWx1ZTogJzMnXG4gICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgICBsYWJlbDogJzUnXG4gICAgICAgICAgICB2YWx1ZTogJzUnXG4gICAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgICB9XG4gICAgICAgICAge1xuICAgICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgICBsYWJlbDogJzEwJ1xuICAgICAgICAgICAgdmFsdWU6ICcxMCdcbiAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgXVxuICAgICAgICBcbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcInN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHNcIlxuICAgIHRpdGxlOiAnU3VwcGxlbWVudGFyeSBBc3NpZ25tZW50cydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lIG9yIG1vcmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIkJ5IHRoZSB0aW1lIHN0dWRlbnRzIGhhdmUgbWFkZSBpbXByb3ZlbWVudHMgYmFzZWQgb24gY2xhc3NtYXRlcycgcmV2aWV3IGNvbW1lbnRzIOKAlCBhbmQgaWRlYWxseSBzdWdnZXN0aW9ucyBmcm9tIHlvdSBhcyB3ZWxsIOKAlCBzdHVkZW50cyBzaG91bGQgaGF2ZSBwcm9kdWNlZCBuZWFybHkgY29tcGxldGUgYXJ0aWNsZXMuIE5vdyBpcyB0aGUgY2hhbmNlIHRvIGVuY291cmFnZSB0aGVtIHRvIHdhZGUgYSBsaXR0bGUgZGVlcGVyIGludG8gV2lraXBlZGlhIGFuZCBpdHMgbm9ybXMgYW5kIGNyaXRlcmlhIGZvciBncmVhdCBjb250ZW50LiBZb3XigJlsbCBwcm9iYWJseSBoYXZlIGRpc2N1c3NlZCBtYW55IG9mIHRoZSBjb3JlIHByaW5jaXBsZXMgb2YgV2lraXBlZGlh4oCUYW5kIHJlbGF0ZWQgaXNzdWVzIHlvdSB3YW50IHRvIGZvY3VzIG9u4oCUYnV0IG5vdyB0aGF0IHRoZXnigJl2ZSBleHBlcmllbmNlZCBmaXJzdC1oYW5kIGhvdyBXaWtpcGVkaWEgd29ya3MsIHRoaXMgaXMgYSBnb29kIHRpbWUgdG8gcmV0dXJuIHRvIHRvcGljcyBsaWtlIG5ldXRyYWxpdHksIG1lZGlhIGZsdWVuY3ksIGFuZCB0aGUgaW1wYWN0IGFuZCBsaW1pdHMgb2YgV2lraXBlZGlhLiBcIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Db25zaWRlciBicmluZ2luZyBpbiBhIGd1ZXN0IHNwZWFrZXIsIGhhdmluZyBhIHBhbmVsIGRpc2N1c3Npb24sIG9yIHNpbXBseSBoYXZpbmcgYW4gb3BlbiBkaXNjdXNzaW9uIGFtb25nc3QgdGhlIGNsYXNzIGFib3V0IHdoYXQgdGhlIHN0dWRlbnRzIGhhdmUgZG9uZSBzbyBmYXIgYW5kIHdoeSAob3Igd2hldGhlcikgaXQgbWF0dGVycy48L3A+XCJcbiAgICAgICAgICBcIjxwPkluIGFkZGl0aW9uIHRvIHRoZSBXaWtpcGVkaWEgYXJ0aWNsZSB3cml0aW5nIGl0c2VsZiwgeW91IG1heSB3YW50IHRvIHVzZSBhIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudC4gVGhlc2UgYXNzaWdubWVudHMgY2FuIHJlaW5mb3JjZSBhbmQgZGVlcGVuIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBhbHNvIGhlbHAgeW91IHRvIHVuZGVyc3RhbmQgYW5kIGV2YWx1YXRlIHRoZSBzdHVkZW50cycgV2lraXBlZGlhIHdvcmsuIEhlcmUgYXJlIHNvbWUgb2YgdGhlIGVmZmVjdGl2ZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzIHRoYXQgaW5zdHJ1Y3RvcnMgb2Z0ZW4gdXNlLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnY2xhc3NfYmxvZydcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnQ2xhc3MgQmxvZyBvciBEaXNjdXNzaW9uJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIHRpcEluZm86IFxuICAgICAgICAgIHRpdGxlOiAnQ2xhc3MgYmxvZyBvciBjbGFzcyBkaXNjdXNzaW9uJ1xuICAgICAgICAgIGNvbnRlbnQ6ICdNYW55IGluc3RydWN0b3JzIGFzayBzdHVkZW50cyB0byBrZWVwIGEgcnVubmluZyBibG9nIGFib3V0IHRoZWlyIGV4cGVyaWVuY2VzLiBHaXZpbmcgdGhlbSBwcm9tcHRzIGV2ZXJ5IHdlZWsgb3IgZXZlcnkgdHdvIHdlZWtzLCBzdWNoIGFzIOKAnFRvIHdoYXQgZXh0ZW50IGFyZSB0aGUgZWRpdG9ycyBvbiBXaWtpcGVkaWEgYSBzZWxmLXNlbGVjdGluZyBncm91cCBhbmQgd2h5P+KAnSB3aWxsIGhlbHAgdGhlbSBiZWdpbiB0byB0aGluayBhYm91dCB0aGUgbGFyZ2VyIGlzc3VlcyBzdXJyb3VuZGluZyB0aGlzIG9ubGluZSBlbmN5Y2xvcGVkaWEgY29tbXVuaXR5LiBJdCB3aWxsIGFsc28gZ2l2ZSB5b3UgbWF0ZXJpYWwgYm90aCBvbiB0aGUgd2lraSBhbmQgb2ZmIHRoZSB3aWtpIHRvIGdyYWRlLiBJZiB5b3UgaGF2ZSB0aW1lIGluIGNsYXNzLCB0aGVzZSBkaXNjdXNzaW9ucyBjYW4gYmUgcGFydGljdWxhcmx5IGNvbnN0cnVjdGl2ZSBpbiBwZXJzb24uJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdJbi1DbGFzcyBQcmVzZW50YXRpb24nXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgdGlwSW5mbzogIFxuICAgICAgICAgIHRpdGxlOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIFdpa2lwZWRpYSB3b3JrJ1xuICAgICAgICAgIGNvbnRlbnQ6IFwiRWFjaCBzdHVkZW50IG9yIGdyb3VwIHByZXBhcmVzIGEgc2hvcnQgcHJlc2VudGF0aW9uIGZvciB0aGUgY2xhc3MsIGV4cGxhaW5pbmcgd2hhdCB0aGV5IHdvcmtlZCBvbiwgd2hhdCB3ZW50IHdlbGwgYW5kIHdoYXQgZGlkbid0LCBhbmQgd2hhdCB0aGV5IGxlYXJuZWQuIFRoZXNlIHByZXNlbnRhdGlvbnMgY2FuIG1ha2UgZXhjZWxsZW50IGZvZGRlciBmb3IgY2xhc3MgZGlzY3Vzc2lvbnMgdG8gcmVpbmZvcmNlIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgZ29hbHMuXCJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgICBpZDogJ2Vzc2F5J1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdSZWZsZWN0aXZlIEVzc2F5J1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIHRpcEluZm86ICBcbiAgICAgICAgICB0aXRsZTogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgICAgY29udGVudDogXCJBZnRlciB0aGUgYXNzaWdubWVudCBpcyBvdmVyLCBhc2sgc3R1ZGVudHMgdG8gd3JpdGUgYSBzaG9ydCByZWZsZWN0aXZlIGVzc2F5IG9uIHRoZWlyIGV4cGVyaWVuY2VzIHVzaW5nIFdpa2lwZWRpYS4gVGhpcyB3b3JrcyB3ZWxsIGZvciBib3RoIHNob3J0IGFuZCBsb25nIFdpa2lwZWRpYSBwcm9qZWN0cy4gQW4gaW50ZXJlc3RpbmcgaXRlcmF0aW9uIG9mIHRoaXMgaXMgdG8gaGF2ZSBzdHVkZW50cyB3cml0ZSBhIHNob3J0IHZlcnNpb24gb2YgdGhlIGVzc2F5IGJlZm9yZSB0aGV5IGJlZ2luIGVkaXRpbmcgV2lraXBlZGlhLCBvdXRsaW5pbmcgdGhlaXIgZXhwZWN0YXRpb25zLCBhbmQgdGhlbiBoYXZlIHRoZW0gcmVmbGVjdCBvbiB3aGV0aGVyIG9yIG5vdCB0aG9zZSBleHBlY3RhdGlvbnMgd2VyZSBtZXQgYWZ0ZXIgdGhleSBoYXZlIGNvbXBsZXRlZCB0aGUgYXNzaWdubWVudC5cIlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAncG9ydGZvbGlvJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgUG9ydGZvbGlvJ1xuICAgICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICAgIHRpcEluZm86ICBcbiAgICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBQb3J0Zm9saW8nXG4gICAgICAgICAgY29udGVudDogXCJTdHVkZW50cyBvcmdhbml6ZSB0aGVpciBXaWtpcGVkaWEgd29yayBpbnRvIGEgcG9ydGZvbGlvLCBpbmNsdWRpbmcgYSBuYXJyYXRpdmUgb2YgdGhlIGNvbnRyaWJ1dGlvbnMgdGhleSBtYWRlIOKAlCBhbmQgaG93IHRoZXkgd2VyZSByZWNlaXZlZCwgYW5kIHBvc3NpYmx5IGNoYW5nZWQsIGJ5IG90aGVyIFdpa2lwZWRpYW5zIOKAlCBhbmQgbGlua3MgdG8gdGhlaXIga2V5IGVkaXRzLiBDb21wb3NpbmcgdGhpcyBwb3J0Zm9saW8gd2lsbCBoZWxwIHN0dWRlbnRzIHRoaW5rIG1vcmUgZGVlcGx5IGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlcywgYW5kIGFsc28gcHJvdmlkZXMgYSBsZW5zIHRocm91Z2ggd2hpY2ggdG8gdW5kZXJzdGFuZCDigJQgYW5kIGdyYWRlIOKAlCB0aGVpciB3b3JrLlwiXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgICAgaWQ6ICdvcmlnaW5hbF9wYXBlcidcbiAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIGxhYmVsOiAnT3JpZ2luYWwgQW5hbHl0aWNhbCBQYXBlcidcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICB0aXBJbmZvOiAgXG4gICAgICAgICAgdGl0bGU6ICdPcmlnaW5hbCBBbmFseXRpY2FsIFBhcGVyJ1xuICAgICAgICAgIGNvbnRlbnQ6IFwiSW4gY291cnNlcyB0aGF0IGVtcGhhc2l6ZSB0cmFkaXRpb25hbCByZXNlYXJjaCBza2lsbHMgYW5kIHRoZSBkZXZlbG9wbWVudCBvZiBvcmlnaW5hbCBpZGVhcyB0aHJvdWdoIGEgdGVybSBwYXBlciwgV2lraXBlZGlhJ3MgcG9saWN5IG9mIFxcXCJubyBvcmlnaW5hbCByZXNlYXJjaFxcXCIgbWF5IGJlIHRvbyByZXN0cmljdGl2ZS4gTWFueSBpbnN0cnVjdG9ycyBwYWlyIFdpa2lwZWRpYSB3cml0aW5nIHdpdGggY29tcGxlbWVudGFyeSBhbmFseXRpY2FsIHBhcGVyOyBzdHVkZW50c+KAmSBXaWtpcGVkaWEgYXJ0aWNsZXMgYXMgYSBsaXRlcmF0dXJlIHJldmlldywgYW5kIHRoZSBzdHVkZW50cyBnbyBvbiB0byBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGluIHRoZSBvZmZsaW5lIGFuYWx5dGljYWwgcGFwZXIuXCJcbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImR5a19nYVwiXG4gICAgdGl0bGU6ICdEWUsgLyBHQSBTdWJtaXNzaW9uJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IERpZCBZb3UgS25vdyAmIEdvb2QgQXJ0aWNsZXMnXG4gICAgZm9ybVRpdGxlOiBcIkRvIGVpdGhlciBvZiB0aGVzZSBwcm9jZXNzZXMgbWFrZSBzZW5zZSBmb3Igc3R1ZGVudHMgaW4geW91ciBjbGFzcz9cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgXVxuICAgIGlucHV0czogW1xuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnZHlrJ1xuICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgbGFiZWw6ICdJbmNsdWRlIERZSyBTdWJtaXNzaW9ucyBhcyBhbiBFeHRyYWN1cnJpY3VsYXIgVGFzaydcbiAgICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgICB0aXBJbmZvOiBcbiAgICAgICAgICB0aXRsZTogJ0RpZCBZb3UgS25vdyAoRFlLKSdcbiAgICAgICAgICBjb250ZW50OiBcIjxwPkFkdmFuY2VkIHN0dWRlbnRz4oCZIGFydGljbGVzIG1heSBxdWFsaWZ5IGZvciBzdWJtaXNzaW9uIHRvIERpZCBZb3UgS25vdyAoRFlLKSwgYSBzZWN0aW9uIG9uIFdpa2lwZWRpYeKAmXMgbWFpbiBwYWdlIGZlYXR1cmluZyBuZXcgY29udGVudC4gVGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4KSB3aXRoaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy48L3A+XG4gICAgICAgICAgPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYnV0IGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyB+NiBob3VycyBpbiB0aGUgc3BvdGxpZ2h0LjwvcD5cbiAgICAgICAgICA8cD5XZSBzdHJvbmdseSByZWNvbW1lbmQgdHJ5aW5nIGZvciBEWUsgc3RhdHVzIHlvdXJzZWxmIGJlZm9yZWhhbmQsIG9yIHdvcmtpbmcgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWFucyB0byBoZWxwIHlvdXIgc3R1ZGVudHMgbmF2aWdhdGUgdGhlIERZSyBwcm9jZXNzIHNtb290aGx5LiBJZiB5b3VyIHN0dWRlbnRzIGFyZSB3b3JraW5nIG9uIGEgcmVsYXRlZCBzZXQgb2YgYXJ0aWNsZXMsIGl0IGNhbiBoZWxwIHRvIGNvbWJpbmUgbXVsdGlwbGUgYXJ0aWNsZSBub21pbmF0aW9ucyBpbnRvIGEgc2luZ2xlIGhvb2s7IHRoaXMgaGVscHMga2VlcCB5b3VyIHN0dWRlbnRz4oCZIHdvcmsgZnJvbSBzd2FtcGluZyB0aGUgcHJvY2VzcyBvciBhbnRhZ29uaXppbmcgdGhlIGVkaXRvcnMgd2hvIG1haW50YWluIGl0LjwvcD5cIlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICAgIGlkOiAnZ2EnXG4gICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBsYWJlbDogJ0luY2x1ZGUgR29vZCBBcnRpY2xlIFN1Ym1pc3Npb24gYXMgYW4gRXh0cmFjdXJyaWN1bGFyIFRhc2snXG4gICAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgICAgdGlwSW5mbzogXG4gICAgICAgICAgdGl0bGU6ICdHb29kIEFydGljbGUgKEdBKSdcbiAgICAgICAgICBjb250ZW50OiBcIldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cbiAgICAgICAgICA8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSBnb29kLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybS48L3A+XCJcbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImdyYWRpbmdcIlxuICAgIHRpdGxlOiAnR3JhZGluZydcbiAgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgdGhlIFdpa2lwZWRpYSBhc3NpZ25tZW50IGJlIGRldGVybWluZWQ/XCJcbiAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcsIGV0Yy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgRXNzZW50aWFscydcbiAgICAgICAgaWQ6ICdncmFkZV9lc3NlbnRpYWxzJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0dldHRpbmcgU3RhcnRlZCB3aXRoIEVkaXRpbmcnXG4gICAgICAgIGlkOiAnZ3JhZGVfZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ0Nob29zaW5nIEFydGljbGVzJ1xuICAgICAgICBpZDogJ2dyYWRlX2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ1Jlc2VhcmNoICYgUGxhbm5pbmcnXG4gICAgICAgIGlkOiAnZ3JhZGVfcmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnRHJhZnRzICYgTWFpbnNwYWNlJ1xuICAgICAgICBpZDogJ2dyYWRlX2RyYWZ0c19tYWluc3BhY2UnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICAgIGxhYmVsOiAnUGVlciBGZWVkYmFjaydcbiAgICAgICAgaWQ6ICdncmFkZV9wZWVyX2ZlZWRiYWNrJ1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgQXNzaWdubWVudHMnXG4gICAgICAgIGlkOiAnZ3JhZGVfc3VwcGxlbWVudGFyeSdcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgIHRpdGxlOiAnQXNzaWdubWVudCBPdmVydmlldydcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0Fib3V0IHRoZSBDb3Vyc2UnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Nob3J0IERlc2NyaXB0aW9uJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48dGV4dGFyZWEgcm93cz0nOCcgc3R5bGU9J3dpZHRoOjEwMCU7Jz48L3RleHRhcmVhPjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtcbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBFc3NlbnRpYWxzJ1xuICAgICAgICBpZDogJ2dyYWRlX2Vzc2VudGlhbHMnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnR2V0dGluZyBTdGFydGVkIHdpdGggRWRpdGluZydcbiAgICAgICAgaWQ6ICdncmFkZV9nZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnQ2hvb3NpbmcgQXJ0aWNsZXMnXG4gICAgICAgIGlkOiAnZ3JhZGVfY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnUmVzZWFyY2ggJiBQbGFubmluZydcbiAgICAgICAgaWQ6ICdncmFkZV9yZXNlYXJjaF9wbGFubmluZydcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnZWRpdCdcbiAgICAgICAgbGFiZWw6ICdEcmFmdHMgJiBNYWluc3BhY2UnXG4gICAgICAgIGlkOiAnZ3JhZGVfZHJhZnRzX21haW5zcGFjZSdcbiAgICAgICAgdmFsdWU6ICcnXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0eXBlOiAnZWRpdCdcbiAgICAgICAgbGFiZWw6ICdQZWVyIEZlZWRiYWNrJ1xuICAgICAgICBpZDogJ2dyYWRlX3BlZXJfZmVlZGJhY2snXG4gICAgICAgIHZhbHVlOiAnJ1xuICAgICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBBc3NpZ25tZW50cydcbiAgICAgICAgaWQ6ICdncmFkZV9zdXBwbGVtZW50YXJ5J1xuICAgICAgICB2YWx1ZTogJydcbiAgICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgICB9XG4gICAgXVxuICB9XG4gIFxuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvbnRlbnQiLCJXaXphcmRDb3Vyc2VJbmZvID0gXG5cbiAgIyBSRVNFQVJDSCBBTkQgV1JJVEUgQSBXSUtJUEVESUEgQVJUSUNMRVxuICByZXNlYXJjaHdyaXRlOiBcbiAgICB0aXRsZTogXCJSZXNlYXJjaCBhbmQgd3JpdGUgYSBXaWtpcGVkaWEgYXJ0aWNsZVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiV29ya2luZyBpbmRpdmlkdWFsbHkgb3IgaW4gc21hbGwgdGVhbXMgd2l0aCB5b3VyIGd1aWRhbmNlLCBzdHVkZW50cyBjaG9vc2UgY291cnNlLXJlbGF0ZWQgdG9waWNzIHRoYXQgYXJlIG5vdCB3ZWxsLWNvdmVyZWQgb24gV2lraXBlZGlhLiBBZnRlciBhc3Nlc3NpbmcgV2lraXBlZGlhJ3MgY292ZXJhZ2UsIHN0dWRlbnRzIHJlc2VhcmNoIHRvcGljcyB0byBmaW5kIGhpZ2gtcXVhbGl0eSBzZWNvbmRhcnkgc291cmNlcywgdGhlbiBwcm9wb3NlIGFuIG91dGxpbmUgZm9yIGhvdyB0aGUgdG9waWMgb3VnaHQgdG8gYmUgY292ZXJlZC4gVGhleSBkcmFmdCB0aGVpciBhcnRpY2xlcywgZ2l2ZSBhbmQgcmVzcG9uZCB0byBwZWVyIGZlZWRiYWNrLCB0YWtlIHRoZWlyIHdvcmsgbGl2ZSBvbiBXaWtpcGVkaWEsIGFuZCBrZWVwIGltcHJvdmluZyB0aGVpciBhcnRpY2xlcyB1bnRpbCB0aGUgZW5kIG9mIHRoZSB0ZXJtLiBBbG9uZyB0aGUgd2F5LCBzdHVkZW50cyBtYXkgd29yayB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYSBlZGl0b3JzIHdobyBjYW4gb2ZmZXIgY3JpdGljYWwgZmVlZGJhY2sgYW5kIGhlbHAgbWFrZSBzdXJlIGFydGljbGVzIG1lZXQgV2lraXBlZGlhJ3Mgc3RhbmRhcmRzIGFuZCBzdHlsZSBjb252ZW50aW9ucy4gU3R1ZGVudHMgd2hvIGRvIGdyZWF0IHdvcmsgbWF5IGV2ZW4gaGF2ZSB0aGVpciBhcnRpY2xlcyBmZWF0dXJlZCBvbiBXaWtpcGVkaWEncyBtYWluIHBhZ2UuIFNvbGlkIGFydGljbGVzIHdpbGwgaGVscCBpbmZvcm0gdGhvdXNhbmRzIG9mIGZ1dHVyZSByZWFkZXJzIGFib3V0IHRoZSBzZWxlY3RlZCB0b3BpYy5cIlxuICAgICAgXCJPcHRpb25hbGx5LCBzdHVkZW50cyBtYXkgYmUgYXNrZWQgdG8gd3JpdGUgYSByZWZsZWN0aXZlIHBhcGVyIGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlLCBwcmVzZW50IHRoZWlyIGNvbnRyaWJ1dGlvbnMgaW4gY2xhc3MsIG9yIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgYWJvdXQgdGhlaXIgdG9waWNzIGluIGEgc2VwYXJhdGUgZXNzYXkuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIxMiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiR3JhZHVhdGUgU3R1ZGVudHNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWR1YXRlc1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gY291cnNlc1wiXG4gICAgICBcImxhcmdlIHN1cnZleSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIFNPVVJDRS1DRU5URVJFRCBBRERJVElPTlNcbiAgc291cmNlY2VudGVyZWQ6IFxuICAgIHRpdGxlOiBcIlNvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHJlYWQgV2lraXBlZGlhIGFydGljbGVzIGluIGEgc2VsZi1zZWxlY3RlZCBzdWJqZWN0IGFyZWEgdG8gaWRlbnRpZnkgYXJ0aWNsZXMgaW4gbmVlZCBvZiByZXZpc2lvbiBvciBpbXByb3ZlbWVudCwgc3VjaCBhcyB0aG9zZSB3aXRoIFxcXCJjaXRhdGlvbiBuZWVkZWRcXFwiIHRhZ3MuIFN0dWRlbnRzIHdpbGwgZmluZCByZWxpYWJsZSBzb3VyY2VzIHRvIHVzZSBhcyByZWZlcmVuY2VzIGZvciB1bmNpdGVkIGNvbnRlbnQuIFRoaXMgYXNzaWdubWVudCBpbmNsdWRlcyBhIHBlcnN1YXNpdmUgZXNzYXkgaW4gd2hpY2ggc3R1ZGVudHMgbWFrZSBhIGNhc2UgZm9yIHRoZWlyIHN1Z2dlc3RlZCBjaGFuZ2VzLCB3aHkgdGhleSBiZWxpZXZlIHRoZXkgYXJlIHF1YWxpZmllZCB0byBtYWtlIHRob3NlIGNoYW5nZXMsIGFuZCB3aHkgdGhlaXIgc2VsZWN0ZWQgc291cmNlcyBwcm92aWRlIHN1cHBvcnQuIEFmdGVyIG1ha2luZyB0aGVpciBjb250cmlidXRpb25zLCBzdHVkZW50cyByZWZsZWN0IG9uIHRoZWlyIHdvcmsgd2l0aCBhIGZvcm1hbCBwYXBlciwgYW5kIGRpc2N1c3Mgd2hldGhlciB0aGV5J3ZlIGFjY29tcGxpc2hlZCB0aGVpciBzdGF0ZWQgZ29hbHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYXJnZSBjbGFzc2VzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgRklORCBBTkQgRklYIEVSUk9SU1xuICBmaW5kZml4OiBcbiAgICB0aXRsZTogXCJGaW5kIGFuZCBmaXggZXJyb3JzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gZmluZCBhbiBhcnRpY2xlIGFib3V0IGEgY291cnNlLXJlbGF0ZWQgdG9waWMgd2l0aCB3aGljaCB0aGV5IGFyZSBleHRyZW1lbHkgZmFtaWxpYXIgdGhhdCBoYXMgc29tZSBtaXN0YWtlcy4gU3R1ZGVudHMgdGFrZSB3aGF0IHRoZXkga25vdyBhYm91dCB0aGUgdG9waWMsIGZpbmQgZmFjdHVhbCBlcnJvcnMgYW5kIG90aGVyIHN1YnN0YW50aXZlIG1pc3Rha2VzLCBhbmQgY29ycmVjdCB0aG9zZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIElkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVxuICBwbGFnaWFyaXNtOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHNlYXJjaCB0aHJvdWdoIFdpa2lwZWRpYSBhcnRpY2xlcyB0byBmaW5kIGluc3RhbmNlcyBvZiBjbG9zZSBwYXJhcGhyYXNpbmcgb3IgcGxhZ2lhcmlzbSwgdGhlbiByZXdvcmQgdGhlIGluZm9ybWF0aW9uIGluIHRoZWlyIG93biBsYW5ndWFnZSB0byBiZSBhcHByb3ByaWF0ZSBmb3IgV2lraXBlZGlhLiBJbiB0aGlzIGFzc2lnbm1lbnQsIHN0dWRlbnRzIGdhaW4gYSBkZWVwZXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IHBsYWdpYXJpc20gaXMgYW5kIGhvdyB0byBhdm9pZCBpdC5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjVFJBTlNMQVRFIEFOIEFSVElDTEUgVE8gRU5HTElTSFxuICB0cmFuc2xhdGU6IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiVGhpcyBpcyBhIHByYWN0aWNhbCBhc3NpZ25tZW50IGZvciBsYW5ndWFnZSBpbnN0cnVjdG9ycy4gU3R1ZGVudHMgc2VsZWN0IGEgV2lraXBlZGlhIGFydGljbGUgaW4gdGhlIGxhbmd1YWdlIHRoZXkgYXJlIHN0dWR5aW5nLCBhbmQgdHJhbnNsYXRlIGl0IGludG8gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBTdHVkZW50cyBzaG91bGQgc3RhcnQgd2l0aCBoaWdoLXF1YWxpdHkgYXJ0aWNsZXMgd2hpY2ggYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBUaGlzIGFzc2lnbm1lbnQgcHJvdmlkZXMgcHJhY3RpY2FsIHRyYW5zbGF0aW9uIGFkdmljZSB3aXRoIHRoZSBpbmNlbnRpdmUgb2YgcmVhbCBwdWJsaWMgc2VydmljZSwgYXMgc3R1ZGVudHMgZXhwYW5kIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGN1bHR1cmUgb24gV2lraXBlZGlhLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNisgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhbmd1YWdlIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHRyYW5zbGF0aW5nIDxlbT5mcm9tPC9lbT4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlIHRvIHRoZSBsYW5ndWFnZSB0aGV5J3JlIHN0dWR5aW5nXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjQ09QWSBFRElUSU5HXG4gIGNvcHllZGl0OiBcbiAgICB0aXRsZTogXCJDb3B5ZWRpdFwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGNvcHllZGl0IFdpa2lwZWRpYSBhcnRpY2xlcywgZW5nYWdpbmcgZWRpdG9ycyBpbiBjb252ZXJzYXRpb24gYWJvdXQgdGhlaXIgd3JpdGluZyBhbmQgaW1wcm92aW5nIHRoZSBjbGFyaXR5IG9mIHRoZSBsYW5ndWFnZSBvZiB0aGUgbWF0ZXJpYWwuIFN0dWRlbnRzIGxlYXJuIHRvIHdyaXRlIGluIGRpZmZlcmVudCB2b2ljZXMgZm9yIGRpZmZlcmVudCBhdWRpZW5jZXMuIEluIGxlYXJuaW5nIGFib3V0IHRoZSBzcGVjaWZpYyB2b2ljZSBvbiBXaWtpcGVkaWEsIHRoZXkgbGVhcm4gYWJvdXQgdGhlIOKAnGF1dGhvcml0YXRpdmXigJ0gdm9pY2UgYW5kIGhvdyBpdHMgdG9uZSBjYW4gY29udmluY2UsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgaXMgcXVlc3Rpb25hYmxlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiRW5nbGlzaCBncmFtbWFyIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgc3Ryb25nIHdyaXRpbmcgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjRVZBTFVBVEUgQVJUSUNMRVNcbiAgZXZhbHVhdGU6IFxuICAgIHRpdGxlOiBcIkV2YWx1YXRlIGFydGljbGVzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJGaXJzdCwgc3R1ZGVudHMgd3JpdGUgYSByZXBvcnQgYW5hbHl6aW5nIHRoZSBzdGF0ZSBvZiBXaWtpcGVkaWEgYXJ0aWNsZXMgb24gY291cnNlLXJlbGF0ZWQgdG9waWNzIHdpdGggYW4gZXllIHRvd2FyZCBmdXR1cmUgcmV2aXNpb25zLiBUaGlzIGVuY291cmFnZXMgYSBjcml0aWNhbCByZWFkaW5nIG9mIGJvdGggY29udGVudCBhbmQgZm9ybS4gVGhlbiwgdGhlIHN0dWRlbnRzIGVkaXQgYXJ0aWNsZXMgaW4gc2FuZGJveGVzIHdpdGggZmVlZGJhY2sgZnJvbSB0aGUgcHJvZmVzc29yLCBjYXJlZnVsbHkgc2VsZWN0aW5nIGFuZCBhZGRpbmcgcmVmZXJlbmNlcyB0byBpbXByb3ZlIHRoZSBhcnRpY2xlIGJhc2VkIG9uIHRoZWlyIGNyaXRpY2FsIGVzc2F5cy4gRmluYWxseSwgdGhleSBjb21wb3NlIGEgc2VsZi1hc3Nlc3NtZW50IGV2YWx1YXRpbmcgdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjUgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJDbGFzc2VzIHdpdGggZmV3ZXIgdGhhbiAzMCBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2Ugc3VydmV5IGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgQUREIElNQUdFUyBPUiBNVUxUSU1FRElBXG4gIG11bHRpbWVkaWE6IFxuICAgIHRpdGxlOiBcIiBBZGQgaW1hZ2VzIG9yIG11bHRpbWVkaWFcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIklmIHlvdXIgc3R1ZGVudHMgYXJlIGFkZXB0IGF0IG1lZGlhLCB0aGlzIGNhbiBiZSBhIGdyZWF0IHdheSBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhIGluIGEgbm9uLXRleHR1YWwgd2F5LiBJbiB0aGUgcGFzdCwgc3R1ZGVudHMgaGF2ZSBwaG90b2dyYXBoZWQgbG9jYWwgbW9udW1lbnRzIHRvIGlsbHVzdHJhdGUgYXJ0aWNsZXMsIGRlc2lnbmVkIGluZm9ncmFwaGljcyB0byBpbGx1c3RyYXRlIGNvbmNlcHRzLCBvciBjcmVhdGVkIHZpZGVvcyB0aGF0IGRlbW9uc3RyYXRlZCBhdWRpby12aXN1YWxseSB3aGF0IGFydGljbGVzIGRlc2NyaWJlIGluIHdvcmRzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgc3R1ZHlpbmcgcGhvdG9ncmFwaHksIHZpZGVvZ3JhcGh5LCBvciBncmFwaGljIGRlc2lnblwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBtZWRpYSBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ291cnNlSW5mbyIsIldpemFyZFN0ZXBJbnB1dHMgPVxuICBpbnRybzogW1xuICAgIHtcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdUZWFjaGVyIE5hbWUnXG4gICAgICBpZDogJ3RlYWNoZXInXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnVW5pdmVyc2l0eSdcbiAgICAgIGlkOiAnc2Nob29sJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1N1YmplY3QnXG4gICAgICBpZDogJ3N1YmplY3QnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgfVxuICBdXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFtcbiAgICB7IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuZCB3cml0ZSBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiB0cnVlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgfVxuICAgIHsgXG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2V2YWx1YXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0V2YWx1YXRlIGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgIH1cbiAgICB7IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0FkZCBpbWFnZXMgJiBtdWx0aW1lZGlhJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgIH1cbiAgICB7IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdzb3VyY2VjZW50ZXJlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgIH1cbiAgICB7IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5L2VkaXQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgfVxuICAgIHsgXG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2ZpbmRmaXgnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRmluZCBhbmQgZml4IGVycm9ycydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICB9ICBcbiAgICB7IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdwbGFnaWFyaXNtJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICB9XG4gIF1cblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBbXG4gICAge1xuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSBVc2VyIEFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBDb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgT25saW5lIFRyYWluaW5nJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2ludHJvZHVjZV9hbWJhc3NhZG9ycydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbnRyb2R1Y2UgV2lraXBlZGlhIEFtYmFzc2Fkb3JzIEludm9sdmVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2luY2x1ZGVfY29tcGxldGlvbidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICB9XG4gIF1cblxuICBnZXR0aW5nX3N0YXJ0ZWQ6IFtcbiAgICB7XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NyaXRpcXVlX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdDcml0aXF1ZSBhbiBBcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2FkZF90b19hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQWRkIHRvIGFuIEFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY29weV9lZGl0X2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29weS1FZGl0IGFuIEFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gQXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICB9XG4gIF1cblxuICBjaG9vc2luZ19hcnRpY2xlczogW1xuICAgIHtcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAncHJlcGFyZV9saXN0J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgUHJlcGFyZXMgYSBMaXN0IHdpdGggQXBwcm9wcmlhdGUgQXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogXCJJbnN0cnVjdG9yIFByZXBhcmVzIGEgTGlzdFwiXG4gICAgICAgIGNvbnRlbnQ6IFwiWW91ICh0aGUgaW5zdHJ1Y3RvcikgcHJlcGFyZSBhIGxpc3Qgb2YgYXBwcm9wcmlhdGUgJ25vbi1leGlzdGVudCcsICdzdHViJyBvciAnc3RhcnQnIGFydGljbGVzIGFoZWFkIG9mIHRpbWUgZm9yIHRoZSBzdHVkZW50cyB0byBjaG9vc2UgZnJvbS4gSWYgcG9zc2libGUsIHlvdSBtYXkgd2FudCB0byB3b3JrIHdpdGggYW4gZXhwZXJpZW5jZWQgV2lraXBlZGlhbiB0byBjcmVhdGUgdGhlIGxpc3QuIEVhY2ggc3R1ZGVudCBjaG9vc2VzIGFuIGFydGljbGUgZnJvbSB0aGUgbGlzdCB0byB3b3JrIG9uLiBBbHRob3VnaCB0aGlzIHJlcXVpcmVzIG1vcmUgcHJlcGFyYXRpb24sIGl0IG1heSBoZWxwIHN0dWRlbnRzIHRvIHN0YXJ0IHJlc2VhcmNoaW5nIGFuZCB3cml0aW5nIHRoZWlyIGFydGljbGVzIHNvb25lci5cIlxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3N0dWRlbnRzX2V4cGxvcmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU3R1ZGVudHMgRXhwbG9yZSBhbmQgUHJlcGFyZSBhIExpc3Qgb2YgQXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogXCJTdHVkZW50cyBFeHBsb3JlXCJcbiAgICAgICAgY29udGVudDogXCJFYWNoIHN0dWRlbnQgZXhwbG9yZXMgV2lraXBlZGlhIGFuZCBsaXN0cyAz4oCTNSB0b3BpY3Mgb24gdGhlaXIgV2lraXBlZGlhIHVzZXIgcGFnZSB0aGF0IHRoZXkgYXJlIGludGVyZXN0ZWQgaW4gZm9yIHRoZWlyIG1haW4gcHJvamVjdC4gWW91ICh0aGUgaW5zdHJ1Y3Rvcikgc2hvdWxkIGFwcHJvdmUgYXJ0aWNsZSBjaG9pY2VzIGJlZm9yZSBzdHVkZW50cyBwcm9jZWVkIHRvIHdyaXRpbmcuIExldHRpbmcgc3R1ZGVudHMgZmluZCB0aGVpciBvd24gYXJ0aWNsZXMgcHJvdmlkZXMgdGhlbSB3aXRoIGEgc2Vuc2Ugb2YgbW90aXZhdGlvbiBhbmQgb3duZXJzaGlwIG92ZXIgdGhlIGFzc2lnbm1lbnQsIGJ1dCBpdCBtYXkgYWxzbyBsZWFkIHRvIGNob2ljZXMgdGhhdCBhcmUgZnVydGhlciBhZmllbGQgZnJvbSBjb3Vyc2UgbWF0ZXJpYWwuXCJcbiAgICB9XG4gIF1cblxuICByZXNlYXJjaF9wbGFubmluZzogW1xuICAgIHtcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnY3JlYXRlX291dGxpbmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ3JlYXRlIGFuIEFydGljbGUgT3V0bGluZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogXCJUcmFkaXRpb25hbCBPdXRsaW5lXCJcbiAgICAgICAgY29udGVudDogXCJGb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGFuIG91dGxpbmUgdGhhdCByZWZsZWN0cyB0aGUgaW1wcm92ZW1lbnRzIHRoZXkgcGxhbiB0byBtYWtlLCBhbmQgdGhlbiBwb3N0IGl0IHRvIHRoZSBhcnRpY2xlJ3MgdGFsayBwYWdlLiBUaGlzIGlzIGEgcmVsYXRpdmVseSBlYXN5IHdheSB0byBnZXQgc3RhcnRlZC5cIlxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3dyaXRlX2xlYWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV3JpdGUgdGhlIEFydGljbGUgTGVhZCBTZWN0aW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIldpa2lwZWRpYSBsZWFkIHNlY3Rpb25cIlxuICAgICAgICBjb250ZW50OlxuICAgICAgICAgIFwiPHA+Rm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhIHdlbGwtYmFsYW5jZWQgc3VtbWFyeSBvZiBpdHMgZnV0dXJlIHN0YXRlIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbi4gVGhlIGlkZWFsIGxlYWQgc2VjdGlvbiBleGVtcGxpZmllcyBXaWtpcGVkaWEncyBzdW1tYXJ5IHN0eWxlIG9mIHdyaXRpbmc6IGl0IGJlZ2lucyB3aXRoIGEgc2luZ2xlIHNlbnRlbmNlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHBsYWNlcyBpdCBpbiBjb250ZXh0LCBhbmQgdGhlbiDigJQgaW4gb25lIHRvIGZvdXIgcGFyYWdyYXBocywgZGVwZW5kaW5nIG9uIHRoZSBhcnRpY2xlJ3Mgc2l6ZSDigJQgaXQgb2ZmZXJzIGEgY29uY2lzZSBzdW1tYXJ5IG9mIHRvcGljLiBBIGdvb2QgbGVhZCBzZWN0aW9uIHNob3VsZCByZWZsZWN0IHRoZSBtYWluIHRvcGljcyBhbmQgYmFsYW5jZSBvZiBjb3ZlcmFnZSBvdmVyIHRoZSB3aG9sZSBhcnRpY2xlLjwvcD5cbiAgICAgICAgICA8cD5PdXRsaW5pbmcgYW4gYXJ0aWNsZSB0aGlzIHdheSBpcyBhIG1vcmUgY2hhbGxlbmdpbmcgYXNzaWdubWVudCDigJQgYW5kIHdpbGwgcmVxdWlyZSBtb3JlIHdvcmsgdG8gZXZhbHVhdGUgYW5kIHByb3ZpZGUgZmVlZGJhY2sgZm9yLiBIb3dldmVyLCBpdCBjYW4gYmUgbW9yZSBlZmZlY3RpdmUgZm9yIHRlYWNoaW5nIHRoZSBwcm9jZXNzIG9mIHJlc2VhcmNoLCB3cml0aW5nLCBhbmQgcmV2aXNpb24uIFN0dWRlbnRzIHdpbGwgcmV0dXJuIHRvIHRoaXMgbGVhZCBzZWN0aW9uIGFzIHRoZXkgZ28sIHRvIGd1aWRlIHRoZWlyIHdyaXRpbmcgYW5kIHRvIHJldmlzZSBpdCB0byByZWZsZWN0IHRoZWlyIGltcHJvdmVkIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHRvcGljIGFzIHRoZWlyIHJlc2VhcmNoIHByb2dyZXNzZXMuIFRoZXkgd2lsbCB0YWNrbGUgV2lraXBlZGlhJ3MgZW5jeWNsb3BlZGljIHN0eWxlIGVhcmx5IG9uLCBhbmQgdGhlaXIgb3V0bGluZSBlZmZvcnRzIHdpbGwgYmUgYW4gaW50ZWdyYWwgcGFydCBvZiB0aGVpciBmaW5hbCB3b3JrLjwvcD5cIlxuICAgICAgICBcbiAgICB9XG4gIF1cblxuICBkcmFmdHNfbWFpbnNwYWNlOiBbXG4gICAge1xuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBMaXZlIGZyb20gdGhlIFN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzpcbiAgICAgICAgdGl0bGU6IFwiUHJvcyBhbmQgY29ucyB0byBlZGl0aW5nIGxpdmVcIlxuICAgICAgICBjb250ZW50OiBcIkVkaXRpbmcgbGl2ZSBpcyBleGNpdGluZyBmb3IgdGhlIHN0dWRlbnRzIGJlY2F1c2UgdGhleSBjYW4gc2VlIHRoZWlyIGNoYW5nZXMgdG8gdGhlIGFydGljbGVzIGltbWVkaWF0ZWx5IGFuZCBleHBlcmllbmNlIHRoZSBjb2xsYWJvcmF0aXZlIGVkaXRpbmcgcHJvY2VzcyB0aHJvdWdob3V0IHRoZSBhc3NpZ25tZW50LiBIb3dldmVyLCBiZWNhdXNlIG5ldyBlZGl0b3JzIG9mdGVuIHVuaW50ZW50aW9uYWxseSBicmVhayBXaWtpcGVkaWEgcnVsZXMsIHNvbWV0aW1lcyBzdHVkZW50c+KAmSBhZGRpdGlvbnMgYXJlIHF1ZXN0aW9uZWQgb3IgcmVtb3ZlZC5cIlxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3NhbmRib3gnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRHJhZnQgRWFybHkgV29yayBvbiBTYW5kYm94ZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogXCJQcm9zIGFuZCBjb25zIHRvIHNhbmRib3hlc1wiXG4gICAgICAgIGNvbnRlbnQ6IFwiU2FuZGJveGVzIG1ha2Ugc3R1ZGVudHMgZmVlbCBzYWZlIGJlY2F1c2UgdGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMsIG9yIG90aGVyIFdpa2lwZWRpYW5zIGFsdGVyaW5nIHRoZWlyIHdyaXRpbmcuIEhvd2V2ZXIsIHNhbmRib3ggZWRpdGluZyBsaW1pdHMgbWFueSBvZiB0aGUgdW5pcXVlIGFzcGVjdHMgb2YgV2lraXBlZGlhIGFzIGEgdGVhY2hpbmcgdG9vbCwgc3VjaCBhcyBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgYW5kIGluY3JlbWVudGFsIGRyYWZ0aW5nLiBTcGVuZGluZyBtb3JlIHRoYW4gYSB3ZWVrIG9yIHR3byBpbiBzYW5kYm94ZXMgaXMgc3Ryb25nbHkgZGlzY291cmFnZWQuXCJcbiAgICB9XG4gIF1cblxuICBwZWVyX2ZlZWRiYWNrOiBbXG4gICAge1xuICAgICAgdHlwZTogJ3JhZGlvR3JvdXAnXG4gICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgIGxhYmVsOiAnJ1xuICAgICAgb3B0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcxJ1xuICAgICAgICAgIHZhbHVlOiAnMSdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcyJ1xuICAgICAgICAgIHZhbHVlOiAnMidcbiAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzMnXG4gICAgICAgICAgdmFsdWU6ICczJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzUnXG4gICAgICAgICAgdmFsdWU6ICc1J1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzEwJ1xuICAgICAgICAgIHZhbHVlOiAnMTAnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICB9XG4gIF1cblxuICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOiBbXG4gICAge1xuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19ibG9nJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NsYXNzIEJsb2cgb3IgRGlzY3Vzc2lvbidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogJ0NsYXNzIGJsb2cgb3IgY2xhc3MgZGlzY3Vzc2lvbidcbiAgICAgICAgY29udGVudDogJ01hbnkgaW5zdHJ1Y3RvcnMgYXNrIHN0dWRlbnRzIHRvIGtlZXAgYSBydW5uaW5nIGJsb2cgYWJvdXQgdGhlaXIgZXhwZXJpZW5jZXMuIEdpdmluZyB0aGVtIHByb21wdHMgZXZlcnkgd2VlayBvciBldmVyeSB0d28gd2Vla3MsIHN1Y2ggYXMg4oCcVG8gd2hhdCBleHRlbnQgYXJlIHRoZSBlZGl0b3JzIG9uIFdpa2lwZWRpYSBhIHNlbGYtc2VsZWN0aW5nIGdyb3VwIGFuZCB3aHk/4oCdIHdpbGwgaGVscCB0aGVtIGJlZ2luIHRvIHRoaW5rIGFib3V0IHRoZSBsYXJnZXIgaXNzdWVzIHN1cnJvdW5kaW5nIHRoaXMgb25saW5lIGVuY3ljbG9wZWRpYSBjb21tdW5pdHkuIEl0IHdpbGwgYWxzbyBnaXZlIHlvdSBtYXRlcmlhbCBib3RoIG9uIHRoZSB3aWtpIGFuZCBvZmYgdGhlIHdpa2kgdG8gZ3JhZGUuIElmIHlvdSBoYXZlIHRpbWUgaW4gY2xhc3MsIHRoZXNlIGRpc2N1c3Npb25zIGNhbiBiZSBwYXJ0aWN1bGFybHkgY29uc3RydWN0aXZlIGluIHBlcnNvbi4nXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luLUNsYXNzIFByZXNlbnRhdGlvbidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdJbi1jbGFzcyBwcmVzZW50YXRpb24gb2YgV2lraXBlZGlhIHdvcmsnXG4gICAgICAgIGNvbnRlbnQ6IFwiRWFjaCBzdHVkZW50IG9yIGdyb3VwIHByZXBhcmVzIGEgc2hvcnQgcHJlc2VudGF0aW9uIGZvciB0aGUgY2xhc3MsIGV4cGxhaW5pbmcgd2hhdCB0aGV5IHdvcmtlZCBvbiwgd2hhdCB3ZW50IHdlbGwgYW5kIHdoYXQgZGlkbid0LCBhbmQgd2hhdCB0aGV5IGxlYXJuZWQuIFRoZXNlIHByZXNlbnRhdGlvbnMgY2FuIG1ha2UgZXhjZWxsZW50IGZvZGRlciBmb3IgY2xhc3MgZGlzY3Vzc2lvbnMgdG8gcmVpbmZvcmNlIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgZ29hbHMuXCJcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdlc3NheSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdSZWZsZWN0aXZlIEVzc2F5J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICAgIGNvbnRlbnQ6IFwiQWZ0ZXIgdGhlIGFzc2lnbm1lbnQgaXMgb3ZlciwgYXNrIHN0dWRlbnRzIHRvIHdyaXRlIGEgc2hvcnQgcmVmbGVjdGl2ZSBlc3NheSBvbiB0aGVpciBleHBlcmllbmNlcyB1c2luZyBXaWtpcGVkaWEuIFRoaXMgd29ya3Mgd2VsbCBmb3IgYm90aCBzaG9ydCBhbmQgbG9uZyBXaWtpcGVkaWEgcHJvamVjdHMuIEFuIGludGVyZXN0aW5nIGl0ZXJhdGlvbiBvZiB0aGlzIGlzIHRvIGhhdmUgc3R1ZGVudHMgd3JpdGUgYSBzaG9ydCB2ZXJzaW9uIG9mIHRoZSBlc3NheSBiZWZvcmUgdGhleSBiZWdpbiBlZGl0aW5nIFdpa2lwZWRpYSwgb3V0bGluaW5nIHRoZWlyIGV4cGVjdGF0aW9ucywgYW5kIHRoZW4gaGF2ZSB0aGVtIHJlZmxlY3Qgb24gd2hldGhlciBvciBub3QgdGhvc2UgZXhwZWN0YXRpb25zIHdlcmUgbWV0IGFmdGVyIHRoZXkgaGF2ZSBjb21wbGV0ZWQgdGhlIGFzc2lnbm1lbnQuXCJcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdwb3J0Zm9saW8nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV2lraXBlZGlhIFBvcnRmb2xpbydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdXaWtpcGVkaWEgUG9ydGZvbGlvJ1xuICAgICAgICBjb250ZW50OiBcIlN0dWRlbnRzIG9yZ2FuaXplIHRoZWlyIFdpa2lwZWRpYSB3b3JrIGludG8gYSBwb3J0Zm9saW8sIGluY2x1ZGluZyBhIG5hcnJhdGl2ZSBvZiB0aGUgY29udHJpYnV0aW9ucyB0aGV5IG1hZGUg4oCUIGFuZCBob3cgdGhleSB3ZXJlIHJlY2VpdmVkLCBhbmQgcG9zc2libHkgY2hhbmdlZCwgYnkgb3RoZXIgV2lraXBlZGlhbnMg4oCUIGFuZCBsaW5rcyB0byB0aGVpciBrZXkgZWRpdHMuIENvbXBvc2luZyB0aGlzIHBvcnRmb2xpbyB3aWxsIGhlbHAgc3R1ZGVudHMgdGhpbmsgbW9yZSBkZWVwbHkgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2VzLCBhbmQgYWxzbyBwcm92aWRlcyBhIGxlbnMgdGhyb3VnaCB3aGljaCB0byB1bmRlcnN0YW5kIOKAlCBhbmQgZ3JhZGUg4oCUIHRoZWlyIHdvcmsuXCJcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdvcmlnaW5hbF9wYXBlcidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdPcmlnaW5hbCBBbmFseXRpY2FsIFBhcGVyJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ09yaWdpbmFsIEFuYWx5dGljYWwgUGFwZXInXG4gICAgICAgIGNvbnRlbnQ6IFwiSW4gY291cnNlcyB0aGF0IGVtcGhhc2l6ZSB0cmFkaXRpb25hbCByZXNlYXJjaCBza2lsbHMgYW5kIHRoZSBkZXZlbG9wbWVudCBvZiBvcmlnaW5hbCBpZGVhcyB0aHJvdWdoIGEgdGVybSBwYXBlciwgV2lraXBlZGlhJ3MgcG9saWN5IG9mIFxcXCJubyBvcmlnaW5hbCByZXNlYXJjaFxcXCIgbWF5IGJlIHRvbyByZXN0cmljdGl2ZS4gTWFueSBpbnN0cnVjdG9ycyBwYWlyIFdpa2lwZWRpYSB3cml0aW5nIHdpdGggY29tcGxlbWVudGFyeSBhbmFseXRpY2FsIHBhcGVyOyBzdHVkZW50c+KAmSBXaWtpcGVkaWEgYXJ0aWNsZXMgYXMgYSBsaXRlcmF0dXJlIHJldmlldywgYW5kIHRoZSBzdHVkZW50cyBnbyBvbiB0byBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGluIHRoZSBvZmZsaW5lIGFuYWx5dGljYWwgcGFwZXIuXCJcbiAgICB9XG4gIF1cblxuICBkeWtfZ2E6IFtcbiAgICB7XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2R5aydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbmNsdWRlIERZSyBTdWJtaXNzaW9ucyBhcyBhbiBFeHRyYWN1cnJpY3VsYXIgVGFzaydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogJ0RpZCBZb3UgS25vdyAoRFlLKSdcbiAgICAgICAgY29udGVudDogXCI8cD5BZHZhbmNlZCBzdHVkZW50c+KAmSBhcnRpY2xlcyBtYXkgcXVhbGlmeSBmb3Igc3VibWlzc2lvbiB0byBEaWQgWW91IEtub3cgKERZSyksIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBmZWF0dXJpbmcgbmV3IGNvbnRlbnQuIFRoZSBnZW5lcmFsIGNyaXRlcmlhIGZvciBEWUsgZWxpZ2liaWxpdHkgYXJlIHRoYXQgYW4gYXJ0aWNsZSBpcyBsYXJnZXIgdGhhbiAxLDUwMCBjaGFyYWN0ZXJzIG9mIG9yaWdpbmFsLCB3ZWxsLXNvdXJjZWQgY29udGVudCAoYWJvdXQgZm91ciBwYXJhZ3JhcGhzKSBhbmQgdGhhdCBpdCBoYXMgYmVlbiBjcmVhdGVkIG9yIGV4cGFuZGVkIChieSBhIGZhY3RvciBvZiA1eCkgd2l0aGluIHRoZSBsYXN0IHNldmVuIGRheXMuPC9wPlxuICAgICAgICA8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBidXQgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIH42IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlxuICAgICAgICA8cD5XZSBzdHJvbmdseSByZWNvbW1lbmQgdHJ5aW5nIGZvciBEWUsgc3RhdHVzIHlvdXJzZWxmIGJlZm9yZWhhbmQsIG9yIHdvcmtpbmcgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWFucyB0byBoZWxwIHlvdXIgc3R1ZGVudHMgbmF2aWdhdGUgdGhlIERZSyBwcm9jZXNzIHNtb290aGx5LiBJZiB5b3VyIHN0dWRlbnRzIGFyZSB3b3JraW5nIG9uIGEgcmVsYXRlZCBzZXQgb2YgYXJ0aWNsZXMsIGl0IGNhbiBoZWxwIHRvIGNvbWJpbmUgbXVsdGlwbGUgYXJ0aWNsZSBub21pbmF0aW9ucyBpbnRvIGEgc2luZ2xlIGhvb2s7IHRoaXMgaGVscHMga2VlcCB5b3VyIHN0dWRlbnRz4oCZIHdvcmsgZnJvbSBzd2FtcGluZyB0aGUgcHJvY2VzcyBvciBhbnRhZ29uaXppbmcgdGhlIGVkaXRvcnMgd2hvIG1haW50YWluIGl0LjwvcD5cIlxuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2dhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luY2x1ZGUgR29vZCBBcnRpY2xlIFN1Ym1pc3Npb24gYXMgYW4gRXh0cmFjdXJyaWN1bGFyIFRhc2snXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdHb29kIEFydGljbGUgKEdBKSdcbiAgICAgICAgY29udGVudDogXCJXZWxsLWRldmVsb3BlZCBhcnRpY2xlcyB0aGF0IGhhdmUgcGFzc2VkIGEgR29vZCBBcnRpY2xlIChHQSkgcmV2aWV3IGFyZSBhIHN1YnN0YW50aWFsIGFjaGlldmVtZW50IGluIHRoZWlyIG93biByaWdodCwgYW5kIGNhbiBhbHNvIHF1YWxpZnkgZm9yIERZSy4gVGhpcyBwZWVyIHJldmlldyBwcm9jZXNzIGludm9sdmVzIGNoZWNraW5nIGEgcG9saXNoZWQgYXJ0aWNsZSBhZ2FpbnN0IFdpa2lwZWRpYSdzIEdBIGNyaXRlcmlhOiBhcnRpY2xlcyBtdXN0IGJlIHdlbGwtd3JpdHRlbiwgdmVyaWZpYWJsZSBhbmQgd2VsbC1zb3VyY2VkIHdpdGggbm8gb3JpZ2luYWwgcmVzZWFyY2gsIGJyb2FkIGluIGNvdmVyYWdlLCBuZXV0cmFsLCBzdGFibGUsIGFuZCBhcHByb3ByaWF0ZWx5IGlsbHVzdHJhdGVkICh3aGVuIHBvc3NpYmxlKS4gUHJhY3RpY2FsbHkgc3BlYWtpbmcsIGEgcG90ZW50aWFsIEdvb2QgQXJ0aWNsZSBzaG91bGQgbG9vayBhbmQgc291bmQgbGlrZSBvdGhlciB3ZWxsLWRldmVsb3BlZCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGFuZCBpdCBzaG91bGQgcHJvdmlkZSBhIHNvbGlkLCB3ZWxsLWJhbGFuY2VkIHRyZWF0bWVudCBvZiBpdHMgc3ViamVjdC48L3A+XG4gICAgICAgIDxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IGdvb2QuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLjwvcD5cIlxuICAgIH1cbiAgXVxuXG4gIGdyYWRpbmc6IFtcbiAgICB7XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBFc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdncmFkZV9lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0dldHRpbmcgU3RhcnRlZCB3aXRoIEVkaXRpbmcnXG4gICAgICBpZDogJ2dyYWRlX2dldHRpbmdfc3RhcnRlZCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBBcnRpY2xlcydcbiAgICAgIGlkOiAnZ3JhZGVfY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggJiBQbGFubmluZydcbiAgICAgIGlkOiAnZ3JhZGVfcmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzICYgTWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdncmFkZV9kcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ2dyYWRlX3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBBc3NpZ25tZW50cydcbiAgICAgIGlkOiAnZ3JhZGVfc3VwcGxlbWVudGFyeSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgfVxuICBdXG5cbiAgb3ZlcnZpZXc6IFtcbiAgICB7XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBFc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdncmFkZV9lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0dldHRpbmcgU3RhcnRlZCB3aXRoIEVkaXRpbmcnXG4gICAgICBpZDogJ2dyYWRlX2dldHRpbmdfc3RhcnRlZCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgfVxuICAgIHtcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBBcnRpY2xlcydcbiAgICAgIGlkOiAnZ3JhZGVfY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggJiBQbGFubmluZydcbiAgICAgIGlkOiAnZ3JhZGVfcmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzICYgTWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdncmFkZV9kcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICB9XG4gICAge1xuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ2dyYWRlX3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIH1cbiAgICB7XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBBc3NpZ25tZW50cydcbiAgICAgIGlkOiAnZ3JhZGVfc3VwcGxlbWVudGFyeSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgfVxuICBdXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRTdGVwSW5wdXRzIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBWaWV3SGVscGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoICdsaW5rJywgKCB0ZXh0LCB1cmwgKSAtPlxuXG4gIHRleHQgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHRleHQgKVxuICB1cmwgID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB1cmwgKVxuXG4gIHJlc3VsdCA9ICc8YSBocmVmPVwiJyArIHVybCArICdcIj4nICsgdGV4dCArICc8L2E+J1xuXG4gIHJldHVybiBuZXcgSGFuZGxlYmFycy5TYWZlU3RyaW5nKCByZXN1bHQgKVxuKSIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgLSBBcHBsaWNhdGlvbiBJbml0aXRpYWxpemVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi9BcHAnKVxuXG5cbiQgLT5cbiAgXG4gICMgSW5pdGlhbGl6ZSBBcHBsaWNhdGlvblxuICBhcHBsaWNhdGlvbi5pbml0aWFsaXplKClcblxuICAjIFN0YXJ0IEJhY2tib25lIHJvdXRlclxuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KCkiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbk1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL3N1cGVycy9Nb2RlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE1vZGVsIGV4dGVuZHMgTW9kZWxcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEVWRU5UIEhBTkRMRVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCAtIFJvdXRlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFJvdXRlc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgXG4gIHJvdXRlczpcbiAgICAnJyA6ICdob21lJ1xuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSGFuZGxlcnNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGhvbWU6IC0+XG4gICAgJCggJyNhcHAnICkuaHRtbCggYXBwbGljYXRpb24uaG9tZVZpZXcucmVuZGVyKCkuZWwgKVxuXG4iLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBIb21lIFBhZ2UgVGVtcGxhdGVcXG4tLT5cXG5cXG48IS0tIE1BSU4gQVBQIENPTlRFTlQgLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuY29udGVudCAtLT5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJkb3Qgc3RlcC1uYXYtaW5kaWNhdG9yc19faXRlbSBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzQWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaGFzVmlzaXRlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgZGF0YS1uYXYtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcFRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj4qPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJhY3RpdmVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcInZpc2l0ZWRcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImluYWN0aXZlXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogU3RlcCBOYXZpZ2F0aW9uIFxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBOQVYgRE9UIElORElDQVRPUlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtaW5kaWNhdG9ycyBoaWRkZW5cXFwiPlxcblxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnN0ZXBzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWluZGljYXRvcnMgLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIE5BViBCVVRUT05TIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnNcXFwiPlxcblxcbiAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLXByZXYgcHJldiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnByZXZJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgIDxzcGFuIHN0eWxlPVxcXCJtYXJnaW4tcmlnaHQ6NXB4O1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLWxlZnRcXFwiPjwvZGl2PlxcbiAgICA8L3NwYW4+XFxuICAgIFByZXZcXG4gIDwvYT5cXG5cXG4gIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IG5leHQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5uZXh0SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICBOZXh0XFxuICAgIDxzcGFuIHN0eWxlPVxcXCJtYXJnaW4tbGVmdDo1cHg7XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tcmlnaHRcXFwiPjwvZGl2PlxcbiAgICA8L3NwYW4+XFxuICA8L2E+XFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWJ1dHRvbnMgLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgPHAgY2xhc3M9XFxcImxhcmdlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFxcbiAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgXFxuICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuICA8IS0tIElOVFJPIFNURVAgRk9STSBBUkVBIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj5cXG4gICAgPCEtLSBmb3JtIGZpZWxkcyAtLT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taW5uZXIgLS0+XFxuXFxuXFxuICA8IS0tIERBVEVTIE1PRFVMRSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1kYXRlc1xcXCI+XFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWRhdGVzIC0tPlxcblxcbiAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlXFxcIiBpZD1cXFwiYmVnaW5CdXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPlxcbiAgICAgIEJlZ2luIEFzc2lnbm1lbnQgV2l6YXJkXFxuICAgIDwvYT5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluZm9UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5mb1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICBcXG4gICAgICA8IS0tIElORk8gU0VDVElPTiBIRUFERVIgLS0+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gQ09OVEVOVCAtLT5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19jb250ZW50IC0tPlxcblxcbiAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhblwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlclxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXIgLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgICAgXFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFpbiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBGT1JNIDogTGVmdCBTaWRlIG9mIFN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L2Rpdj5cXG5cXG4gIFxcbiAgPCEtLSBTVEVQIEZPUk0gSU5ORVIgQ09OVEVOVCAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIFxcbiAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICA8YSBjbGFzcz1cXFwibWFpbi1sb2dvXFxcIiBocmVmPVxcXCJodHRwOi8vd2lraWVkdS5vcmdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiB0aXRsZT1cXFwid2lraWVkdS5vcmdcXFwiPldJS0lFRFUuT1JHPC9hPlxcblxcbiAgPCEtLSBTVEVQIElORk8gSU5ORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8taW5uZXJcXFwiPlxcblxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluZm9UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICBcXG4gICAgPCEtLSBJTkZPIFNFQ1RJT05TIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuICBcXG5cXG5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8gLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPHA+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3A+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxsaSBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2xpPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tZ3JpZFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGV4dCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGV4dDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mbyBzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG48YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19pbm5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2sgXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QXNzaWdubWVudCB0eXBlOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190ZXh0XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5kZXNjcmlwdGlvbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvZGl2PlxcblxcbiAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TWluaW11bSB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubWluX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5taW5fdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlJlY29tbWVuZGVkIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5yZWNfdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnJlY190aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5CZXN0IGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmJlc3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk5vdCBhcHByb3ByaWF0ZSBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5ub3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkxlYXJuaW5nIE9iamVjdGl2ZXM8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5sZWFybmluZ19vYmplY3RpdmVzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPHA+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmNvbnRlbnQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmNvbnRlbnQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG4gIDxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJjaGVjay1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZCBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBkYXRhLWV4Y2x1c2l2ZT1cXFwidHJ1ZVxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1jaGVja2JveC1ncm91cFxcXCIgZGF0YS1jaGVja2JveC1ncm91cD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWNoZWNrYm94LWdyb3VwX19sYWJlbFxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2Rpdj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgLz5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0dW0taW5wdXQtLXNlbGVjdCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5tdWx0aXBsZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgPHNlbGVjdCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubXVsdGlwbGUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICAgIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNiwgcHJvZ3JhbTE2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9zZWxlY3Q+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjdXN0dW0taW5wdXQtLXNlbGVjdC0tbXVsdGkgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG11bHRpcGxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9vcHRpb24+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tdGV4dFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXRleHRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcGVyY2VudFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXBlcmNlbnRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtY29udGFpbmVyXFxcIj5cXG4gICAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgbWF4bGVuZ3RoPVxcXCIyXFxcIiAvPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGEgY2xhc3M9XFxcImVkaXQtYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj5lZGl0PC9hPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2NvbnRlbnRcXFwiPlxcbiAgICA8IS0tIGNvbnRlbnQgLS0+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRhcmVhXFxcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICA8dGV4dGFyZWEgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcm93cz1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJvd3MpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PC90ZXh0YXJlYT5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI3LCBwcm9ncmFtMjcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvXFxcIj5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI5KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyIGN1c3RvbS1pbnB1dC1yYWRpby1pbm5lci0tZ3JvdXBcXFwiPlxcbiAgXFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzAsIHByb2dyYW0zMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTMwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW8gY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSW5wdXQgSXRlbSBUZW1wbGF0ZXNcXG4gIFxcbi0tPlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNoZWNrYm94KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvQm94KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNoZWNrYm94R3JvdXApLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDExLCBwcm9ncmFtMTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGV4dCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOCwgcHJvZ3JhbTE4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlcmNlbnQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjAsIHByb2dyYW0yMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lZGl0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGV4dGFyZWEpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjQsIHByb2dyYW0yNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpbyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNiwgcHJvZ3JhbTI2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvR3JvdXApLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjksIHByb2dyYW0yOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYXJrdXAgZm9yIFN0YXJ0L0VuZCBEYXRlIElucHV0IE1vZHVsZVxcbi0tPlxcblxcblxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc1xcXCI+XFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2lubmVyIGZyb21cXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgXFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwibW9udGhcXFwiIGlkPVxcXCJtb250aFN0YXJ0XFxcIiBuYW1lPVxcXCJtb250aFN0YXJ0XFxcIj5cXG4gICAgICAgIDxvcHRpb24+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEyPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLWRheVxcXCI+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZGF5XFxcIiBpZD1cXFwiZGF5U3RhcnRcXFwiIG5hbWU9XFxcImRheVN0YXJ0XFxcIj5cXG4gICAgICAgIDxvcHRpb24+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjMwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcInllYXJcXFwiIGlkPVxcXCJ5ZWFyU3RhcnRcXFwiIG5hbWU9XFxcInllYXJTdGFydFxcXCI+XFxuICAgICAgICA8b3B0aW9uPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDI2PC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuICA8c3BhbiBjbGFzcz1cXFwiZGF0ZXMtdG9cXFwiPlxcbiAgICB0b1xcbiAgPC9zcGFuPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19pbm5lciB0b1xcXCI+XFxuICAgIFxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJtb250aFxcXCIgaWQ9XFxcIm1vbnRoRW5kXFxcIiBuYW1lPVxcXCJtb250aEVuZFxcXCI+XFxuICAgICAgICA8b3B0aW9uPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4wOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4xMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4xMjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1kYXlcXFwiPlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImRheVxcXCIgaWQ9XFxcImRheUVuZFxcXCIgbmFtZT1cXFwiZGF5RW5kXFxcIj5cXG4gICAgICAgIDxvcHRpb24+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjAzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjA5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjI5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjMwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcInllYXJcXFwiIGlkPVxcXCJ5ZWFyRW5kXFxcIiBuYW1lPVxcXCJ5ZWFyRW5kXFxcIj5cXG4gICAgICAgIDxvcHRpb24+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAxODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24+MjAyNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbj4yMDI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uPjIwMjY8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG5cXG48L2Rpdj5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIjtcblxuXG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIHwgY291cnNlX25hbWUgPSBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuY291cnNlX25hbWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmNvdXJzZV9uYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdHJ1Y3Rvcl91c2VybmFtZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rvcl91c2VybmFtZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0b3JfcmVhbG5hbWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RydWN0b3JfcmVhbG5hbWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgc3ViamVjdCA9IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdWJqZWN0KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdWJqZWN0OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IHN0YXJ0X2RhdGUgPSBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnRfZGF0ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RhcnRfZGF0ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfCBlbmRfZGF0ZSA9IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5lbmRfZGF0ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZW5kX2RhdGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIHwgaW5zdGl0dXRpb24gPSBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdGl0dXRpb24pIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RpdHV0aW9uOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IGV4cGVjdGVkX3N0dWRlbnRzID0gXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmV4cGVjdGVkX3N0dWRlbnRzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5leHBlY3RlZF9zdHVkZW50czsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgfX1cXG48YnIvPlxcbj09VGltZWxpbmU9PVxcbjxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCAxIHwgV2lraXBlZGlhIGVzc2VudGlhbHMgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW50cm8gdG8gV2lraXBlZGlhfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgMiB8IEVkaXRpbmcgYmFzaWNzIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayAzIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgdGhlIHRyYWluaW5nfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByYWN0aWNlIGNvbW11bmljYXRpbmd9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01pbGVzdG9uZXN9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgMyB8IEV4cGxvcmluZyB0aGUgdG9waWMgYXJlYX19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGxvcmluZyB0aGUgdG9waWMgYXJlYSBpbiBjbGFzc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNCB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFuIGFydGljbGV9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCA0IHwgVXNpbmcgc291cmNlcyB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luIGNsYXNzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Vc2luZyBzb3VyY2VzIGluIGNsYXNzfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Bc3NpZ25tZW50IHwgZHVlID0gV2VlayA1fX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BZGQgdG8gYW4gYXJ0aWNsZX19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXN9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IFdlZWsgNX19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2VlayB8IDUgfCBDaG9vc2luZyBhcnRpY2xlcyB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luIGNsYXNzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNiB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21waWxlIGEgYmlibGlvZ3JhcGh5fX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgNiB8IERyYWZ0aW5nIHN0YXJ0ZXIgYXJ0aWNsZXMgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbiBjbGFzc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBldGlxdWV0dGUgYW5kIHNhbmRib3hlc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNyB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIH19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWlsZXN0b25lc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmd9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dlZWsgfCA3IHwgTW92aW5nIGFydGljbGVzIHRvIHRoZSBtYWluIHNwYWNlIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01haW4gc3BhY2UgaW4gY2xhc3N9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDggfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Nb3ZlIHRvIG1haW4gc3BhY2V9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RZSyBub21pbmF0aW9uc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwYW5kIHlvdXIgYXJ0aWNsZX19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2VlayB8IDggfCBCdWlsZGluZyBhcnRpY2xlcyB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dvcmtzaG9wfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgOSB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgcGVlciByZXZpZXcgYXJ0aWNsZXN8IHBlZXJyZXZpZXdudW1iZXIgPSB0d28gfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgOSB8IEdldHRpbmcgYW5kIGdpdmluZyBmZWVkYmFjayB9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luIGNsYXNzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Hcm91cCBzdWdnZXN0aW9uc319PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTAgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBwZWVyIHJldmlld3MgfCBwZWVycmV2aWV3bnVtYmVyID0gdHdvIH19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWlsZXN0b25lc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgMTAgfCBSZXNwb25kaW5nIHRvIGZlZWRiYWNrIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01lZGlhIGxpdGVyYWN5IGRpc2N1c3Npb259fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDExIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByZXBhcmUgaW4tY2xhc3MgcHJlc2VudGF0aW9ufX08YnIvPlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XZWVrIHwgMTEgfCBDbGFzcyBwcmVzZW50YXRpb25zIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4gY2xhc3N9fTxici8+XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0luLWNsYXNzIHByZXNlbnRhdGlvbnN9fTxici8+XFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDEyIH19PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319PGJyLz5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUmVmbGVjdGl2ZSBlc3NheX19PGJyLz5cXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvV2VlayB8IDEyIHwgRHVlIGRhdGUgfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NaWxlc3RvbmVzfX08YnIvPlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BbGwgc3R1ZGVudHMgZmluaXNoZWR9fTxici8+XFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkhvbWVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzJylcbk91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9PdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBJTklUXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG4gICAgXG5cbiAgc3Vic2NyaXB0aW9uczpcbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6cHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9DbGlja0hhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcblxuICAgIHVubGVzcyBAc3RlcHNSZW5kZXJlZFxuICAgICAgQGFmdGVyUmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuICAgICNTVUJWSUVXU1xuICAgIEBTdGVwTmF2ID0gbmV3IFN0ZXBOYXZWaWV3KClcblxuICAgICMgVEhFIEZPTExXSU5HIENPVUxEIFBST0JBQkxZIEhBUFBFTiBJTiBBIENPTExFVElPTiBWSUVXIENMQVNTIFRPIENPTlRST0wgQUxMIFNURVBTXG4gICAgQCRzdGVwc0NvbnRhaW5lciA9IEAkZWwuZmluZCgnLnN0ZXBzJylcblxuICAgIEAkaW5uZXJDb250YWluZXIgPSBAJGVsLmZpbmQoJy5jb250ZW50JylcblxuICAgICMgU0VUVVAgU1RFUFMgQU5EIFJFVFVSTiBBUlJBWSBPRiBWSUVXU1xuICAgIEBzdGVwVmlld3MgPSBAX2NyZWF0ZVN0ZXBWaWV3cygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG4gICAgaWYgQHN0ZXBWaWV3cy5sZW5ndGggPiAwXG4gICAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuICAgIHJldHVybiBAXG4gICAgXG5cblxuICBfY3JlYXRlU3RlcFZpZXdzOiAtPlxuICAgIFxuICAgIF92aWV3cyA9IFtdXG5cbiAgICBfLmVhY2goYXBwbGljYXRpb24uZGF0YSwoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAgIF8ubWFwKHN0ZXAsKHZhbHVlLCBrZXksIGxpc3QpIC0+IFxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuICAgICAgICBtb2RlbDogbmV3bW9kZWxcbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBpbmRleCArIDEpXG4gICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4JywgaW5kZXggKVxuXG4gICAgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcblxuICAgICAgX3ZpZXdzLnB1c2gobmV3dmlldylcblxuICAgIClcblxuICAgIHJldHVybiBfdmlld3NcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICByZXR1cm4ge1xuXG4gICAgICBjb250ZW50OiBcIlRoaXMgaXMgc3BlY2lhbCBjb250ZW50XCJcblxuICAgIH1cbiAgICBcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiAgYWR2YW5jZVN0ZXA6IC0+XG4gICAgQGN1cnJlbnRTdGVwKz0xXG4gICAgXG4gICAgaWYgQGN1cnJlbnRTdGVwID09IEBzdGVwVmlld3MubGVuZ3RoIFxuICAgICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQGhpZGVBbGxTdGVwcygpXG5cbiAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuXG4gIGRlY3JlbWVudFN0ZXA6IC0+XG4gICAgQGN1cnJlbnRTdGVwLT0xXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPCAwXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHVwZGF0ZVN0ZXA6IChpbmRleCkgLT5cbiAgICBAY3VycmVudFN0ZXAgPSBpbmRleFxuXG4gICAgQGhpZGVBbGxTdGVwcygpXG5cbiAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuXG5cbiAgc2hvd0N1cnJlbnRTdGVwOiAtPlxuICAgIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5zaG93KClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6dXBkYXRlJywgQGN1cnJlbnRTdGVwKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgY3VycmVudFN0ZXBWaWV3OiAtPlxuICAgIHJldHVybiBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF1cblxuXG5cbiAgaGlkZUFsbFN0ZXBzOiAtPlxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cbiAgICAgIHN0ZXBWaWV3LmhpZGUoKVxuICAgIClcblxuXG5cbiAgaGlkZUFsbFRpcHM6IChlKSAtPlxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cbiAgICAgIHN0ZXBWaWV3LnRpcFZpc2libGUgPSBmYWxzZVxuICAgIClcblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBFVkVOVCBIQU5ETEVSU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBuZXh0Q2xpY2tIYW5kbGVyOiAtPlxuICAgIEBhZHZhbmNlU3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAtPlxuICAgIEBkZWNyZW1lbnRTdGVwKClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG4gIGdvdG9DbGlja0hhbmRsZXI6IChpbmRleCkgLT5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuXG4jVEVNUExBVEVTXG5JbnB1dEl0ZW1UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzJylcbiMgSW5wdXRDaGVja2JveFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dENoZWNrYm94VGVtcGxhdGUuaGJzJylcbiMgSW5wdXRFZGl0U3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dEVkaXRTdGVwVGVtcGxhdGUuaGJzJylcbiMgSW5wdXRQZXJjZW50VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0UGVyY2VudFRlbXBsYXRlLmhicycpXG4jIElucHV0UmFkaW9Hcm91cFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dFJhZGlvR3JvdXBUZW1wbGF0ZS5oYnMnKVxuIyBJbnB1dFJhZGlvVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0UmFkaW9UZW1wbGF0ZS5oYnMnKVxuIyBJbnB1dFRleHRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRUZXh0VGVtcGxhdGUuaGJzJylcblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBJbnB1dEl0ZW1UZW1wbGF0ZVxuXG5cbiAgY2xhc3NOYW1lOiAnY3VzdG9tLWlucHV0LXdyYXBwZXInXG5cblxuICBob3ZlclRpbWU6IDUwMFxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInRleHRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsIHNwYW4nIDogJ2hpZGVTaG93VG9vbHRpcCdcblxuICAgICdtb3VzZW91dCcgOiAnbW91c2VvdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jaGVjay1idXR0b24nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvYm94IC5yYWRpby1idXR0b24nIDogJ3JhZGlvQm94Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIC5yYWRpby1idXR0b24nIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2ZvY3VzIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uRm9jdXMnXG5cbiAgICAnYmx1ciAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkJsdXInXG5cblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRHcm91cCA9ICR0YXJnZXQucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRwYXJlbnRFbCA9ICR0YXJnZXQucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcbiAgICAgICRvdGhlclJhZGlvcyA9ICRwYXJlbnRHcm91cC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRvdGhlcklucHV0cyA9ICRvdGhlclJhZGlvcy5maW5kKCdpbnB1dFt0eXBlPVwidGV4dFwiXScpXG5cbiAgICAgICRvdGhlcklucHV0cy5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgICRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICAkcGFyZW50RWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG5cbiAgcmFkaW9Cb3hDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJG90aGVyUmFkaW9zID0gQCRlbC5wYXJlbnRzKCcuc3RlcC1mb3JtLWlubmVyJykuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJykuZmluZCgnaW5wdXQnKS52YWwoJ29mZicpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG5cblxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuICAgIFxuXG4gIGNoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKS5sZW5ndGggPiAwXG4gICAgICByZXR1cm4gQHJhZGlvQm94Q2xpY2tIYW5kbGVyKGUpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpXG4gICAgICAudG9nZ2xlQ2xhc3MoJ2NoZWNrZWQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29uJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIGZhbHNlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvZmYnKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG4gIGhvdmVySGFuZGxlcjogKGUpIC0+XG4gICAgY29uc29sZS5sb2cgZS50YXJnZXRcblxuXG5cbiAgbW91c2VvdmVySGFuZGxlcjogKGUpIC0+XG4gICAgQGlzSG92ZXJpbmcgPSB0cnVlXG4gICAgICBcblxuXG4gIG1vdXNlb3V0SGFuZGxlcjogKGUpIC0+XG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cblxuICBzaG93VG9vbHRpcDogLT5cbiAgICBpZiBAaGFzSW5mbyAmJiBAcGFyZW50U3RlcC50aXBWaXNpYmxlID09IGZhbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IHRydWVcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBbZGF0YS1pdGVtLWluZGV4PScje0BpdGVtSW5kZXh9J11cIikuYWRkQ2xhc3MoJ3Zpc2libGUnKVxuXG5cblxuICBoaWRlVG9vbHRpcDogLT5cbiAgICBpZiBAaGFzSW5mb1xuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJykgXG5cblxuXG4gIGhpZGVTaG93VG9vbHRpcDogLT5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgIEBzaG93VG9vbHRpcCgpXG5cblxuXG4gIGxhYmVsQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm4gZmFsc2VcblxuXG5cbiAgaXRlbUNoYW5nZUhhbmRsZXI6IChlKSAtPlxuICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICBpbnB1dElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2lkJylcblxuICAgIGNvbnNvbGUubG9nIHZhbHVlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdhbnN3ZXI6dXBkYXRlZCcsIGlucHV0SWQsIHZhbHVlKVxuXG4gICAgQHBhcmVudFN0ZXAudXBkYXRlVXNlckFuc3dlcih0cnVlKVxuXG5cbiAgICAjIGlmIEAkZWwuZmluZCgnaW5wdXQnKS5pcygnOmNoZWNrZWQnKVxuXG4gICAgIyAgIEAkZWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgIyBlbHNlXG5cbiAgICAjICAgQCRlbC5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG4gICAgQCRpbnB1dEVsID0gQCRlbC5maW5kKCdpbnB1dCcpXG5cbiAgICBAaG92ZXJUaW1lciA9IG51bGxcblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG5cbiAgaGFzSW5mbzogLT5cbiAgICByZXR1cm4gJGVsLmhhc0NsYXNzKCdoYXMtaW5mbycpXG5cblxuXG4gIG9uRm9jdXM6IChlKSAtPlxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cblxuICBvbkJsdXI6IChlKSAtPlxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgaWYgdmFsdWUgPT0gJydcbiAgICAgIHVubGVzcyAkdGFyZ2V0LmlzKCc6Zm9jdXMnKVxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQdWJsaWMgTWV0aG9kc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZW5kZXI6IC0+XG4gICAgc3VwZXIoKVxuXG5cblxuICBnZXRJbnB1dFR5cGVPYmplY3Q6IC0+XG4gICAgcmV0dXJuRGF0YSA9IHt9XG5cbiAgICByZXR1cm5EYXRhW0BpbnB1dFR5cGVdID0gdHJ1ZVxuXG4gICAgcmV0dXJuIHJldHVybkRhdGFcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICBpbnB1dFR5cGVPYmplY3QgPSBAZ2V0SW5wdXRUeXBlT2JqZWN0KClcblxuXG4gICAgaWYgQGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpbydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3RleHQnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Hcm91cCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2VkaXQnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cblxuICBcbiAgICAgIFxuICAgIFxuICAgICAgXG5cbiAgICBcbiIsIlxuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbk91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9PdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG5Db3Vyc2VEZXRhaWxzVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogT3V0cHV0VGVtcGxhdGVcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG4gICAgJ3dpemFyZDpwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcicgXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIHJldHVybiB7XG5cbiAgICAgIGNvdXJzZV9uYW1lOiAnQ291cnNlIE5hbWUnXG5cbiAgICAgIGluc3RydWN0b3JfdXNlcm5hbWU6ICdVc2VyIE5hbWUnXG5cbiAgICAgIGluc3RydWN0b3JfcmVhbG5hbWU6ICdSZWFsIE5hbWUnXG5cbiAgICAgIHN1YmplY3Q6ICdTdWJqZWN0J1xuXG4gICAgICBzdGFydF9kYXRlOiAnU3RhcnQgRGF0ZSdcblxuICAgICAgZW5kX2RhdGU6ICdFbmQgRGF0ZSdcblxuICAgICAgaW5zdGl0dXRpb246ICdJbnN0aXR1dGlvbidcblxuICAgICAgZXhwZWN0ZWRfc3R1ZGVudHM6ICdFeHBlY2V0ZWQgU3R1ZGVudHMnXG5cbiAgICB9XG5cblxuXG4gIG91dHB1dFBsYWluVGV4dDogLT5cbiAgICBAcmVuZGVyKClcblxuICAgIHJldHVybiBAJGVsLnRleHQoKVxuXG5cblxuICBwdWJsaXNoSGFuZGxlcjogLT5cbiAgICAjIF8uZWFjaChhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwVmlld3MsIChzdGVwVmlldykgPT5cbiAgICAjICAgc3RlcFZpZXcuJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5maW5kKCdpbnB1dCcpLmVhY2goKGluZGV4LGVsZW1lbnQpID0+XG4gICAgIyAgICAgY29uc29sZS5sb2cgJChlbGVtZW50KS5hdHRyKCduYW1lJyksICQoZWxlbWVudCkudmFsKClcbiAgIFxuICAgICMgICApXG4gICAgIyApXG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcbiAgICAgICAgdGV4dDogQG91dHB1dFBsYWluVGV4dCgpXG5cbiAgICAgIHN1Y2Nlc3M6IChkYXRhKSAtPlxuICAgICAgICBjb25zb2xlLmxvZyBkYXRhXG4gICAgICAgIFxuICAgICkiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwTmF2Vmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5TdGVwTmF2VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTmF2VmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAtbmF2J1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBOYXZUZW1wbGF0ZVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuXG5cbiAgc3Vic2NyaXB0aW9uczpcbiAgICAnc3RlcDp1cGRhdGUnIDogJ3VwZGF0ZUN1cnJlbnRTdGVwJ1xuICAgICdzdGVwOmFuc3dlcmVkJyA6ICdzdGVwQW5zd2VyZWQnXG5cblxuICBldmVudHM6IC0+XG4gICAgJ2NsaWNrIC5uZXh0JyA6ICduZXh0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5wcmV2JyA6ICdwcmV2Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5kb3QudmlzaXRlZCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPCBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICBlbHNlIGlmIEBjdXJyZW50U3RlcCA+IDAgJiYgQGN1cnJlbnRTdGVwID09IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdjb250cmFjdGVkJylcblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIHJldHVybiB7XG5cbiAgICAgIGN1cnJlbnQ6IEBjdXJyZW50U3RlcFxuXG4gICAgICB0b3RhbDogQHRvdGFsU3RlcHNcblxuICAgICAgcHJldkluYWN0aXZlOiBAaXNJbmFjdGl2ZSgncHJldicpXG5cbiAgICAgIG5leHRJbmFjdGl2ZTogQGlzSW5hY3RpdmUoJ25leHQnKVxuXG4gICAgICBzdGVwczogPT5cblxuICAgICAgICBvdXQgPSBbXVxuICAgICAgICBfLmVhY2goQHN0ZXBWaWV3cywgKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICAgICAgc3RlcERhdGEgPSBzdGVwLm1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgICAgIGlzQWN0aXZlID0gQGN1cnJlbnRTdGVwIGlzIGluZGV4XG5cbiAgICAgICAgICAjIHdhc1Zpc2l0ZWQgPSBpbmRleCA8IEBjdXJyZW50U3RlcFxuXG4gICAgICAgICAgd2FzVmlzaXRlZCA9IHN0ZXAuaGFzVXNlclZpc2l0ZWRcblxuICAgICAgICAgIG91dC5wdXNoIHtpZDogaW5kZXgsIGlzQWN0aXZlOiBpc0FjdGl2ZSwgaGFzVmlzaXRlZDogd2FzVmlzaXRlZCwgc3RlcFRpdGxlOiBzdGVwRGF0YS50aXRsZSwgc3RlcElkOiBzdGVwRGF0YS5pZH1cblxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG91dFxuXG4gICAgfVxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAtPlxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IC0+XG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG5cbiAgZG90Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsICR0YXJnZXQuZGF0YSgnbmF2LWlkJykpXG5cblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cbiAgICBAY3VycmVudFN0ZXAgPSBzdGVwXG5cbiAgICBAcmVuZGVyKClcblxuXG4gIHN0ZXBBbnN3ZXJlZDogKHN0ZXBWaWV3KSAtPlxuICAgIEByZW5kZXIoKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSGVscGVyc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBpc0luYWN0aXZlOiAoaXRlbSkgLT5cblxuICAgIGl0SXMgPSB0cnVlXG5cbiAgICBpZiBpdGVtID09ICdwcmV2J1xuXG4gICAgICBpdElzID0gQGN1cnJlbnRTdGVwIGlzIDFcblxuICAgIGVsc2UgaWYgaXRlbSA9PSAnbmV4dCdcblxuICAgICAgaXRJcyA9IEBjdXJyZW50U3RlcCBpcyBAdG90YWxTdGVwcyAtIDFcblxuICAgIHJldHVybiBpdElzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1NVQlZJRVdTXG5JbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbiNURU1QTEFURVNcblN0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9TdGVwVGVtcGxhdGUuaGJzJylcblxuSW50cm9TdGVwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzJylcblxuSW5wdXRUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0lucHV0VGlwVGVtcGxhdGUuaGJzJylcblxuQ291cnNlVGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMnKVxuXG5XaWtpRGF0ZXNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzJylcblxuI0RBVEFcbkNvdXJzZUluZm9EYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb3Vyc2VJbmZvJylcblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwVmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAnXG5cblxuICB0YWdOYW1lOiAnc2VjdGlvbidcblxuXG4gIHRlbXBsYXRlOiBTdGVwVGVtcGxhdGVcblxuXG4gIGludHJvVGVtcGxhdGU6IEludHJvU3RlcFRlbXBsYXRlXG5cblxuICB0aXBUZW1wbGF0ZTogSW5wdXRUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb1RlbXBsYXRlOiBDb3Vyc2VUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb0RhdGE6IENvdXJzZUluZm9EYXRhXG5cblxuICBkYXRlc01vZHVsZTogV2lraURhdGVzTW9kdWxlXG5cblxuICBzdGVwSW5wdXREYXRhOiBXaXphcmRTdGVwSW5wdXRzXG5cblxuICBoYXNVc2VyQW5zd2VyZWQ6IGZhbHNlXG5cblxuICBoYXNVc2VyVmlzaXRlZDogZmFsc2VcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UUyBBTkQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayBpbnB1dCcgOiAnaW5wdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrICNwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvLXRpcF9fY2xvc2UnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2NsaWNrICNiZWdpbkJ1dHRvbicgOiAnYmVnaW5IYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8gLnN0ZXAtaW5mby1zZWN0aW9uLS1hY2NvcmRpYW4nIDogJ2FjY29yZGlhbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZWRpdC1idXR0b24nIDogJ2VkaXRDbGlja0hhbmRsZXInXG5cblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIHN0ZXBJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLXN0ZXAtaWQnKVxuXG4gICAgaWYgc3RlcElkXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsIHN0ZXBJZClcblxuXG5cbiAgYWNjb3JkaWFuQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZiAkdGFyZ2V0Lmhhc0NsYXNzKCdvcGVuJylcblxuICAgICAgJHRhcmdldC5yZW1vdmVDbGFzcygnb3BlbicpXG5cbiAgICBlbHNlIGlmICQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWluZm8nKS5maW5kKCcuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicpLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICR0YXJnZXQuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgICAsNTAwKVxuXG4gICAgZWxzZVxuXG4gICAgICAkdGFyZ2V0LmFkZENsYXNzKCdvcGVuJylcblxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnd2l6YXJkOnB1Ymxpc2gnKVxuXG5cbiAgXG4gIHJlbmRlcjogLT5cblxuICAgIEB0aXBWaXNpYmxlID0gZmFsc2VcblxuICAgIGlmIEBtb2RlbC5nZXQoJ3N0ZXBOdW1iZXInKSA9PSAxXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3N0ZXAtLWZpcnN0JykuaHRtbCggQGludHJvVGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG4gICAgICAjQUREIFNUQVJUL0VORCBEQVRFUyBNT0RVTEVcbiAgICAgICRkYXRlcyA9ICQoQGRhdGVzTW9kdWxlKCkpXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1kYXRlcycpLmh0bWwoJGRhdGVzKVxuICAgICAgXG4gICAgZWxzZVxuICAgICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG5cbiAgICBAaW5wdXRTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgIEAkdGlwU2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtaW5mby10aXBzJylcblxuICAgIEBpbnB1dERhdGEgPSBAc3RlcElucHV0RGF0YVtAbW9kZWwuYXR0cmlidXRlcy5pZF0gfHwgW11cblxuXG4gICAgXy5lYWNoKEBpbnB1dERhdGEsIChpbnB1dCwgaW5kZXgpID0+XG5cbiAgICAgIGlucHV0VmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXcgQmFja2JvbmUuTW9kZWwoaW5wdXQpXG5cbiAgICAgIClcblxuICAgICAgaW5wdXRWaWV3LmlucHV0VHlwZSA9IGlucHV0LnR5cGVcblxuICAgICAgaW5wdXRWaWV3Lml0ZW1JbmRleCA9IGluZGV4XG5cbiAgICAgIGlucHV0Vmlldy5wYXJlbnRTdGVwID0gQFxuXG4gICAgICBAaW5wdXRTZWN0aW9uLmFwcGVuZChpbnB1dFZpZXcucmVuZGVyKCkuZWwpXG5cbiAgICAgIGlmIGlucHV0LnRpcEluZm9cblxuICAgICAgICB0aXAgPSBcblxuICAgICAgICAgIGlkOiBpbmRleFxuXG4gICAgICAgICAgdGl0bGU6IGlucHV0LnRpcEluZm8udGl0bGVcblxuICAgICAgICAgIGNvbnRlbnQ6IGlucHV0LnRpcEluZm8uY29udGVudFxuXG4gICAgICAgICR0aXBFbCA9IEB0aXBUZW1wbGF0ZSh0aXApXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgICBlbHNlIGlmIGlucHV0Lmhhc0NvdXJzZUluZm9cblxuICAgICAgICBpbmZvRGF0YSA9IF8uZXh0ZW5kKEBjb3Vyc2VJbmZvRGF0YVtpbnB1dC5pZF0sIHtpZDogaW5kZXh9IClcblxuICAgICAgICAkdGlwRWwgPSBAY291cnNlSW5mb1RlbXBsYXRlKGluZm9EYXRhKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgIClcblxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICBAJGlucHV0Q29udGFpbmVycyA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoaWRlOiAtPlxuICAgIEAkZWwuaGlkZSgpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBzaG93OiAtPlxuICAgIEAkZWwuc2hvdygpXG4gICAgQGhhc1VzZXJWaXNpdGVkID0gdHJ1ZVxuICAgIHJldHVybiBAXG5cblxuXG4gIGJlZ2luSGFuZGxlcjogLT5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICB1cGRhdGVVc2VyQW5zd2VyOiAoYm9vbCkgLT5cbiAgICBAaGFzVXNlckFuc3dlcmVkID0gYm9vbFxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDphbnN3ZXJlZCcsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBpbnB1dEhhbmRsZXI6IChlKSAtPlxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnQgPSAkdGFyZ2V0LnBhcmVudHMoJy5jdXN0b20taW5wdXQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuZGF0YSgnZXhjbHVzaXZlJylcblxuICAgICAgaWYgJHRhcmdldC5pcygnOmNoZWNrZWQnKSBcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEAkaW5wdXRDb250YWluZXJzLmZpbmQoJ2lucHV0Jykubm90KCR0YXJnZXQpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgIGVsc2VcblxuICAgICAgJGV4Y2x1c2l2ZSA9IEAkZWwuZmluZCgnW2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpXG5cbiAgICAgIGlmICRleGNsdXNpdmUubGVuZ3RoID4gMFxuXG4gICAgICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgICAgICRleGNsdXNpdmUuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAkZXhjbHVzaXZlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG5cblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cblxuXG5cbiAgICBcbiAgICBcblxuIFxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBCYXNlIFZpZXcgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5yZXF1aXJlKCcuLi8uLi9oZWxwZXJzL1ZpZXdIZWxwZXInKVxuXG5jbGFzcyBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICB0ZW1wbGF0ZTogLT5cbiAgIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG4gIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBpbml0aWFsaXplOiAtPlxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApIClcbiAgICBcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgRVZFTlQgSEFORExFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Il19
