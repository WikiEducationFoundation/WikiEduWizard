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



},{"./data/WizardContent":7,"./routers/Router":14,"./views/HomeView":28,"./views/InputItemView":29,"./views/LoginView":30,"./views/OutputView":31}],6:[function(require,module,exports){
var WizardAssignmentData;

module.exports = WizardAssignmentData = {};



},{}],7:[function(require,module,exports){
var WizardContent;

WizardContent = [
  {
    id: "intro",
    title: 'Welcome to the Assignment Design Wizard!',
    login_instructions: 'Click Login with Wikipedia to get started',
    instructions: '',
    inputs: [],
    sections: [
      {
        content: ["<p class='large'>This tool will walk you through best practices for Wikipedia classroom assignments and help you create a customized syllabus for your course, broken into weekly assignments.</p>", "<p class='large'>When you’re finished, you can publish a ready-to-use lesson plan onto a wiki page, where it can be customized even further.</p>", "<p class='large'>Let’s start by filling in some basics about you and your course:</p>"]
      }
    ]
  }, {
    id: "assignment_selection",
    title: 'Assignment type selection',
    infoTitle: 'About assignment selections',
    formTitle: 'Available assignments:',
    instructions: "You can teach with Wikipedia in several different ways, and it's important to design an assignment that fits on Wikipedia and achieves your student learning objectives. Your first step is to choose which assignment(s) you'll be asking your students to complete as part of the course. We've created some guidelines to help you, but you'll need to make some key decisions, such as: which learning objectives are you targeting with this assignment? What skills do your students already have? How much time can you devote to the assignment?",
    inputs: [],
    sections: [
      {
        title: '',
        content: ["<p>Most instructors ask their students to write an article. Students start by learning the basics of Wikipedia, and then they focus on the content. They plan, research, write, and revise a previously missing Wikipedia article or contribute to an existing entry on a course-related topic that is incomplete. This assignment typically replaces a term paper or research project, or it forms the literature review section of a larger paper. The student learning outcome is high with this assignment, but it does take a significant amount of time. To learn how to contribute to Wikipedia, your students need to learn both the wiki markup language and key policies and expectations of the Wikipedia-editing community.</p>", "<p>If writing an article isn't right for your class, other assignment options still give students valuable learning opportunities as they improve Wikipedia. Select an assignment type to the left to learn more about each assignment.</p>"]
      }
    ]
  }, {
    id: "learning_essentials",
    title: 'Wikipedia essentials',
    formTitle: 'Choose one or more:',
    infoTitle: 'About Wikipedia essentials',
    instructions: "To get started, you'll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community. As their first Wikipedia assignment milestone, you can ask the students to create accounts and then complete the ''online training for students''. This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and explains further sources of support as they continue along. It takes about an hour and ends with a certification step, which you can use to verify that students completed the training.",
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and covers some of the ways they can find help as they get started. It takes about an hour and ends with a certification step that you can use to verify that students completed the training</p>']
      }, {
        title: 'Assignment milestones:',
        content: ["<ul> <li>Create a user account and enroll on the course page. </li> <li>Complete the online training for students. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia. </li> <li>To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.</li> </ul>", "<p>Will completion of the student training be part of your students' grades?</p>"]
      }
    ]
  }, {
    id: "getting_started",
    title: 'Getting started with editing',
    infoTitle: 'About editing',
    instructions: "It is important for students to start editing Wikipedia right away. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on.",
    formTitle: 'Which basic assignments would you like to include?',
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>Which introductory assignments would you like to use to acclimate your students to Wikipedia? You can select none, one, or more. Whichever you select will be added to the course syllabus.</p>', '<ul> <li><strong>Critique an article.</strong> Critically evaluate an existing Wikipedia article related to the class, and leave suggestions for improving it on the article’s talk page. </li> <li><strong>Add to an article.</strong> Using course readings or other relevant secondary sources, add 1–2 sentences of new information to a Wikipedia article related to the class. Be sure to integrate it well into the existing article, and include a citation to the source. </li> <li><strong>Copyedit an article.</strong> Browse Wikipedia until you find an article that you would like to improve, and make some edits to improve the language or formatting. </li> <li><strong>Illustrate an article.</strong> Find an opportunity to improve an article by creating and uploading an original photograph or video.</li> </ul>']
      }
    ]
  }, {
    id: 'choosing_articles',
    title: 'Choosing articles',
    formTitle: 'There are two recommended options for selecting articles:',
    infoTitle: 'About choosing articles',
    instructions: 'Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.',
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>']
      }, {
        title: 'Not such a good choice',
        accordian: true,
        content: ['<p>Articles that are "not such a good choice" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.</p>', "<ul> <li>You probably shouldn't try to completely overhaul articles on very broad topics (e.g., Law).</li> <li>You should probably avoid trying to improve articles on topics that are highly controversial (e.g., Global Warming, Abortion, Scientology, etc.). You may be more successful starting a sub-article on the topic instead.</li> <li>Don't work on an article that is already of high quality on Wikipedia, unless you discuss a specific plan for improving it with other editors beforehand.</li> <li>Avoid working on something with scarce literature. Wikipedia articles cite secondary literature sources, so it's important to have enough sources for verification and to provide a neutral point of view.</li> <li>Don't start articles with titles that imply an argument or essay-like approach (e.g., The Effects That The Recent Sub-Prime Mortgage Crisis has had on the US and Global Economics). These type of titles, and most likely the content too, may not be appropriate for an encyclopedia.</li> </ul>"]
      }, {
        title: 'Good choice',
        accordian: true,
        content: ["<ul> <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li> <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1-2 paragraphs of information and are in need of expansion. *Relevant WikiProject pages can provide a list of stubs that need improvement.</li> <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li> </ul>"]
      }, {
        title: '',
        content: ['<p>As the instructor, you should apply your own expertise to examining Wikipedia’s coverage of your field. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia.</p>']
      }, {
        title: 'Instructor prepares a list',
        content: ['<p>You (the instructor) prepare a list of appropriate \'non-existent\', \'stub\' or \'start\' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner.</p>']
      }, {
        title: 'Students find articles',
        content: ['<p>Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Letting students find their own articles provides them with a sense of motivation and ownership over the assignment, but it may also lead to choices that are further afield from course material.</p>']
      }
    ]
  }, {
    id: "research_planning",
    title: 'Research and planning',
    formTitle: 'How should students plan their articles?',
    infoTitle: 'About research and planning',
    instructions: "Students often wait until the last minute to do their research, or choose sources unsuited for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians.",
    sections: [
      {
        title: '',
        content: ["<p>Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?</p>"]
      }
    ],
    inputs: []
  }, {
    id: "drafts_mainspace",
    title: 'Drafts and mainspace',
    formTitle: 'Choose one:',
    infoTitle: 'About drafts and mainspace',
    instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandboxes. There are pros and cons to each approach.',
    sections: [
      {
        title: 'Pros and cons to sandboxes',
        content: ["<p>Sandboxes make students feel safe because they can edit without the pressure of the whole world reading their drafts, or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.</p>"]
      }, {
        title: 'Pros and cons to editing live',
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
        content: ["<p>For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term. Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers.</p>", "<p>How many peer reviews will you ask each student to contribute during the course?</p>"]
      }
    ],
    inputs: []
  }, {
    id: "supplementary_assignments",
    title: 'Supplementary assignments',
    formTitle: 'Choose supplementary assignments:',
    infoTitle: 'About supplementary assignments',
    instructions: "By the time students have made improvements based on classmates' comments—and ideally suggestions from you as well—they should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria to create great content. You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impacts and limits of Wikipedia. Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion in class about what the students have done so far and why (or whether) it matters.",
    sections: [
      {
        title: '',
        content: ["<p>In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' work and learning outcomes. Here are some of the effective supplementary assignments that instructors often use. Scroll over each for more information, and select any that you wish to use for your course.</p>"]
      }
    ],
    inputs: []
  }, {
    id: "dyk",
    title: 'DYK process',
    infoTitle: 'About DYK process',
    formTitle: "Would you like to include DYK as an ungraded option?",
    sections: [
      {
        title: '',
        content: ["<p>Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days.</p>", "<p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but it can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its 6 hours in the spotlight.</p>", "<p>We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it.</p>"]
      }
    ],
    inputs: []
  }, {
    id: "ga",
    title: 'Good Article process',
    infoTitle: 'About Good Article process',
    formTitle: "Would you like to include this as an ungraded option?",
    sections: [
      {
        title: '',
        content: ["<p>Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>", "<p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term, and those written by student editors who are already experienced, strong writers.</p>"]
      }
    ],
    inputs: []
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
    inputs: []
  }, {
    id: "overview",
    title: 'Assignment overview',
    sections: [
      {
        title: 'About the course',
        content: ["<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:", "<ul> <li>topics you're covering in the class</li> <li>what students will be asked to do on Wikipedia</li> <li>what types of articles your class will be working on</li> </ul>"]
      }, {
        content: ["<p><textarea id='short_description' rows='8' style='width:100%;'></textarea></p>"]
      }, {
        title: '',
        content: ["<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"]
      }
    ],
    inputs: []
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
      label: 'Instructor name',
      id: 'teacher',
      value: '',
      placeholder: ''
    },
    course_name: {
      type: 'text',
      label: 'Course name',
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
    wizard_start_date: {
      month: '',
      day: '',
      year: '',
      value: ''
    },
    wizard_end_date: {
      month: '',
      day: '',
      year: '',
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
      id: 'evaluate',
      selected: false,
      label: 'Evaluate articles',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    multimedia: {
      id: 'multimedia',
      selected: false,
      label: 'Add images & multimedia',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    sourcecentered: {
      id: 'sourcecentered',
      selected: false,
      label: 'Source-centered additions',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    copyedit: {
      id: 'copyedit',
      selected: false,
      label: 'Copyedit articles',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    findfix: {
      id: 'findfix',
      selected: false,
      label: 'Find and fix errors',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    plagiarism: {
      id: 'plagiarism',
      selected: false,
      label: 'Identify and fix plagiarism',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
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
        content: "Have another idea for incorporating Wikipedia into your class? We've found that these assignments work well, but they aren't the only way to do it. Get in touch, and we can talk things through: <a style='color:#505a7f;' href='mailto:contact@wikiedu.org'>contact@wikiedu.org</a>"
      }
    }
  },
  learning_essentials: {
    create_user: {
      id: 'create_user',
      selected: true,
      label: 'Create user account',
      exclusive: false,
      disabled: true
    },
    enroll: {
      id: 'enroll',
      selected: true,
      label: 'Enroll to the course',
      exclusive: false,
      disabled: true
    },
    complete_training: {
      id: 'complete_training',
      selected: true,
      label: 'Complete online training',
      disabled: true,
      exclusive: false
    },
    introduce_ambassadors: {
      id: 'introduce_ambassadors',
      selected: true,
      disabled: true,
      label: 'Introduce Wikipedia Ambassadors Involved',
      exclusive: false
    },
    training_graded: {
      type: 'radioBox',
      id: 'training_graded',
      selected: false,
      label: 'Completion of training will be graded',
      exclusive: false
    },
    training_not_graded: {
      type: 'radioBox',
      id: 'training_not_graded',
      selected: false,
      label: 'Completion of training will not be graded',
      exclusive: false
    }
  },
  getting_started: {
    critique_article: {
      type: 'checkbox',
      id: 'critique_article',
      selected: true,
      label: 'Critique an article',
      exclusive: false
    },
    add_to_article: {
      type: 'checkbox',
      id: 'add_to_article',
      selected: true,
      label: 'Add to an article',
      exclusive: false
    },
    copy_edit_article: {
      type: 'checkbox',
      id: 'copy_edit_article',
      selected: false,
      label: 'Copyedit an article',
      exclusive: false
    },
    illustrate_article: {
      type: 'checkbox',
      id: 'illustrate_article',
      selected: false,
      label: 'Illustrate an article',
      exclusive: false
    }
  },
  choosing_articles: {
    prepare_list: {
      type: 'radioBox',
      id: 'prepare_list',
      selected: false,
      label: 'Instructor prepares a lists',
      exclusive: false,
      hasSubChoice: true
    },
    students_explore: {
      type: 'radioBox',
      id: 'students_explore',
      selected: false,
      label: 'Students find articles',
      exclusive: false,
      hasSubChoice: true
    },
    request_help: {
      type: 'checkbox',
      id: 'request_help',
      selected: false,
      label: 'Would you like help selecting or evaulating article choices?',
      exclusive: false,
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
      tipInfo: {
        title: "Traditional outline",
        content: "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
      }
    },
    write_lead: {
      type: 'radioBox',
      id: 'write_lead',
      selected: false,
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
      exclusive: false
    },
    sandbox: {
      type: 'radioBox',
      id: 'sandbox',
      selected: false,
      label: 'Draft early work in sandboxes',
      exclusive: false
    }
  },
  peer_feedback: {
    peer_reviews: {
      type: 'radioGroup',
      id: 'peer_reviews',
      label: '',
      value: '2',
      selected: 1,
      options: [
        {
          id: 0,
          name: 'peer_reviews',
          label: '1',
          value: '1',
          selected: false
        }, {
          id: 1,
          name: 'peer_reviews',
          label: '2',
          value: '2',
          selected: true
        }, {
          id: 2,
          name: 'peer_reviews',
          label: '3',
          value: '3',
          selected: false
        }, {
          id: 3,
          name: 'peer_reviews',
          label: '4',
          value: '4',
          selected: false
        }, {
          id: 4,
          name: 'peer_reviews',
          label: '5',
          value: '5',
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
      label: 'Original analytical paper',
      exclusive: false,
      tipInfo: {
        title: 'Original analytical paper',
        content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
      }
    },
    none_of_above: {
      type: 'checkbox',
      id: 'none_of_above',
      selected: false,
      label: 'None of the above',
      exclusive: true
    }
  },
  dyk: {
    dyk: {
      type: 'checkbox',
      id: 'dyk',
      selected: false,
      label: 'Did You Know?',
      exclusive: false
    }
  },
  ga: {
    ga: {
      type: 'checkbox',
      id: 'ga',
      selected: false,
      label: 'Good Article nominations',
      exclusive: false
    }
  },
  grading: {
    learning_essentials: {
      type: 'percent',
      label: 'Learning Wiki essentials',
      id: 'learning_essentials',
      value: 5,
      placeholder: '',
      assignments: []
    },
    getting_started: {
      type: 'percent',
      label: 'Getting started with editing',
      id: 'getting_started',
      value: 0,
      placeholder: ''
    },
    choosing_articles: {
      type: 'percent',
      label: 'Choosing articles',
      id: 'choosing_articles',
      value: 0,
      placeholder: ''
    },
    research_planning: {
      type: 'percent',
      label: 'Research an planning',
      id: 'research_planning',
      value: 0,
      placeholder: ''
    },
    drafts_mainspace: {
      type: 'percent',
      label: 'Drafts and mainspace',
      id: 'drafts_mainspace',
      value: 0,
      placeholder: ''
    },
    peer_feedback: {
      type: 'percent',
      label: 'Peer Feedback',
      id: 'peer_feedback',
      value: 0,
      placeholder: ''
    },
    supplementary_assignments: {
      type: 'percent',
      label: 'Supplementary assignments',
      id: 'supplementary_assignments',
      value: 0,
      placeholder: ''
    },
    grading_selection: {
      label: 'Grading based on:',
      id: 'grading_selection',
      value: '',
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
      value: '',
      placeholder: ''
    },
    getting_started: {
      type: 'edit',
      label: 'Getting started with editing',
      id: 'getting_started',
      value: '',
      placeholder: ''
    },
    choosing_articles: {
      type: 'edit',
      label: 'Choosing articles',
      id: 'choosing_articles',
      value: '',
      placeholder: ''
    },
    research_planning: {
      type: 'edit',
      label: 'Research and planning',
      id: 'research_planning',
      value: '',
      placeholder: ''
    },
    drafts_mainspace: {
      type: 'edit',
      label: 'Drafts and mainspace',
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
      label: 'Supplementary assignments',
      id: 'supplementary_assignments',
      value: '',
      placeholder: ''
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
  buffer += " <!-- end .step-form-instructions -->\n\n\n\n\n        <!-- BEGIN BUTTON -->\n        <div class=\"step-form-actions\">\n          <a class=\"button button--blue\" id=\"loginButton\" href=\"/auth/mediawiki\">\n            Login with Wikipedia\n          </a>\n          <a class=\"font-blue\" href=\"/welcome\" id=\"skipLoginButton\">\n            <em>or skip it for now and just see the current build</em>\n          </a>\n        </div><!-- end .step-form-actions -->\n\n\n      </div><!-- end .step-form -->\n    </div>\n  </div>\n</div>";
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

function program6(depth0,data) {
  
  
  return "inactive";
  }

  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Step Navigation \n-->\n\n\n<!-- STEP NAV DOT INDICATORS -->\n<div class=\"step-nav-indicators hidden\">\n\n  ";
  stack1 = helpers.each.call(depth0, depth0.steps, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n</div><!-- end .step-nav-indicators -->\n\n\n\n<!-- STEP NAV BUTTONS -->\n<div class=\"step-nav-buttons\">\n  <div class=\"step-nav-buttons--normal\">\n    <a href=\"#\" class=\"step-nav__button step-nav--prev prev ";
  stack1 = helpers['if'].call(depth0, depth0.prevInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <span class=\"arrow\" style=\"margin-right:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--left\"></div>\n      </span>\n      <span class=\"text\">Prev</span>\n    </a>\n\n    <a href=\"#\" class=\"step-nav__button step-nav--next next ";
  stack1 = helpers['if'].call(depth0, depth0.nextInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <span class=\"text\">Next</span>\n      <span class=\"arrow\" style=\"margin-left:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n      </span>\n    </a>\n  </div>\n\n  <div class=\"step-nav-buttons--edit\">\n    <a href=\"#\" class=\"step-nav__button step-nav--prev prev ";
  stack1 = helpers['if'].call(depth0, depth0.prevInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <span class=\"arrow\" style=\"margin-right:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--left\"></div>\n      </span>\n      <span class=\"text\">Back</span>\n    </a>\n\n    <a href=\"#\" class=\"step-nav__button step-nav--next next ";
  stack1 = helpers['if'].call(depth0, depth0.nextInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n      <span class=\"text\">Done</span>\n      <span class=\"arrow\" style=\"margin-left:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n      </span>\n    </a>\n\n  </div>\n\n</div><!-- end .step-nav-buttons -->\n";
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
  buffer += "\n  </div>\n   <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n\n    <div class=\"no-edit-mode\">\n      <a class=\"button button--blue\" id=\"beginButton\" href=\"#\">\n        Begin Assignment Wizard\n      </a>\n    </div>\n\n    <div class=\"edit-mode-only\">\n      <a class=\"button button--blue exit-edit\" href=\"#\">\n        Back\n      </a>\n    </div>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
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
    + "\">\n  \n    <div class=\"step-info-tip__inner\">\n      <a class=\"step-info-tip__close\">Close Info</a>\n      ";
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
  buffer += "  />\n  <a class=\"check-button\" href=\"#\"></a>\n</div>\n";
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
  buffer += "  />\n  <a class=\"radio-button\" href=\"#\"></a>\n</div>\n";
  return buffer;
  }

function program12(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-checkbox-group\" data-checkbox-group=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <div class=\"custom-input-checkbox-group__label\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program13(depth0,data) {
  
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

function program15(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custum-input--select ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.multiple), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\">\n  <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n  <select name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.multiple), {hash:{},inverse:self.noop,fn:self.program(18, program18, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += ">\n    ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  </select>\n</div>\n";
  return buffer;
  }
function program16(depth0,data) {
  
  
  return " custum-input--select--multi ";
  }

function program18(depth0,data) {
  
  
  return " multiple ";
  }

function program20(depth0,data) {
  
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

function program22(depth0,data) {
  
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

function program24(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--percent\">\n  <div class=\"custom-input--percent__inner\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    <div class=\"input-container\">\n    <input name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" id=\""
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

function program26(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--edit\">\n  <div class=\"custom-input--edit__inner\">\n    <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n    <a class=\"edit-button\" href=\"#\" data-step-id=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">[edit]</a>\n  </div>\n  <div class=\"custom-input--edit__content\">\n    <!-- content -->\n  </div>\n</div>\n";
  return buffer;
  }

function program28(depth0,data) {
  
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

function program30(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--link\">\n  <label><a href=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.href)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" >"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</a></label>\n</div>\n";
  return buffer;
  }

function program32(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner\">\n  <div class=\"custom-input-radio-inner__header\">\n    <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n  </div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(33, program33, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program33(depth0,data) {
  
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

function program35(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner__header\">\n  <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n</div>\n<div class=\"custom-input-radio-inner custom-input-radio-inner--group\">\n  \n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(36, program36, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program36(depth0,data) {
  
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
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.checkboxGroup), {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.select), {hash:{},inverse:self.noop,fn:self.program(15, program15, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.text), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.percent), {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.edit), {hash:{},inverse:self.noop,fn:self.program(26, program26, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.textarea), {hash:{},inverse:self.noop,fn:self.program(28, program28, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.link), {hash:{},inverse:self.noop,fn:self.program(30, program30, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radio), {hash:{},inverse:self.noop,fn:self.program(32, program32, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioGroup), {hash:{},inverse:self.noop,fn:self.program(35, program35, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],23:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates\">\n  <div class=\"custom-input-dates__label\">Course dates</div>\n  <div class=\"custom-input-dates__inner from\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearStart\" name=\"yearStart\" data-date-id=\"wizard_start_date\" data-date-type=\"year\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n        <option value=\"2017\">2017</option>\n        <option value=\"2018\">2018</option>\n        <option value=\"2019\">2019</option>\n        <option value=\"2020\">2020</option>\n        <option value=\"2021\">2021</option>\n        <option value=\"2022\">2022</option>\n        <option value=\"2023\">2023</option>\n        <option value=\"2024\">2024</option>\n        <option value=\"2025\">2025</option>\n        <option value=\"2026\">2026</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthStart\" name=\"monthStart\" data-date-id=\"wizard_start_date\" data-date-type=\"month\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayStart\" name=\"dayStart\" data-date-id=\"wizard_start_date\" data-date-type=\"day\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n  <span class=\"dates-to\">\n    to\n  </span>\n  <div class=\"custom-input-dates__inner to\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearEnd\" name=\"yearEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"year\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n        <option value=\"2017\">2017</option>\n        <option value=\"2018\">2018</option>\n        <option value=\"2019\">2019</option>\n        <option value=\"2020\">2020</option>\n        <option value=\"2021\">2021</option>\n        <option value=\"2022\">2022</option>\n        <option value=\"2023\">2023</option>\n        <option value=\"2024\">2024</option>\n        <option value=\"2025\">2025</option>\n        <option value=\"2026\">2026</option>\n      </select>\n    </div>\n    \n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthEnd\" name=\"monthEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"month\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayEnd\" name=\"dayEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"day\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n\n</div>";
  })
},{"handleify":4}],24:[function(require,module,exports){
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
  buffer += "\">\n\n      <h3>";
  if (stack1 = helpers.totalGrade) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.totalGrade; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "%</h3>\n\n    </div>\n\n  </div>\n  \n  <div class=\"custom-input-grading-selection\">\n\n    <h5 class=\"custom-input-grading-selection__title\">Grading based on:</h5>\n\n    <div class=\"custom-input-grading-selection-form\">\n\n      <div class=\"custom-input-wrapper\">\n\n        ";
  stack1 = helpers.each.call(depth0, depth0.options, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      </div>\n\n    </div>\n\n  </div>\n\n</div>";
  return buffer;
  })
},{"handleify":4}],25:[function(require,module,exports){
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
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}\n";
  return buffer;
  }

function program26(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " }}\n";
  return buffer;
  }

function program28(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}\n";
  return buffer;
  }

function program30(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " }}\n";
  return buffer;
  }

function program32(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}\n";
  return buffer;
  }

function program34(depth0,data) {
  
  
  return " Class presentations ";
  }

function program36(depth0,data) {
  
  
  return " Finishing Touches ";
  }

function program38(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}\n";
  return buffer;
  }

function program40(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}\n";
  return buffer;
  }

function program42(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}\n";
  return buffer;
  }

function program44(depth0,data) {
  
  var buffer = "";
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}\n";
  return buffer;
  }

function program46(depth0,data) {
  
  
  return " interested_in_DYK = yes ";
  }

function program48(depth0,data) {
  
  
  return " interested_in_DYK = no ";
  }

function program50(depth0,data) {
  
  
  return " interested_in_Good_Articles = yes ";
  }

function program52(depth0,data) {
  
  
  return " interested_in_Good_Articles = no ";
  }

function program54(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(55, program55, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  return buffer;
  }
function program55(depth0,data) {
  
  
  return " | want_help_finding_articles = yes ";
  }

function program57(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(58, program58, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  return buffer;
  }
function program58(depth0,data) {
  
  
  return " | want_help_evaluating_articles = yes ";
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
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.wizard_start_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + " | end_date = "
    + escapeExpression(((stack1 = ((stack1 = ((stack1 = depth0.intro),stack1 == null || stack1 === false ? stack1 : stack1.wizard_end_date)),stack1 == null || stack1 === false ? stack1 : stack1.value)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
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
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}\n\n"
    + "{{course week | 8 | Building articles }}\n"
    + "{{class workshop}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}\n\n"
    + "{{assignment | due = Week 9 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.options)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(26, program26, data),fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{course week | 9 | Getting and giving feedback }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}\n\n"
    + "{{assignment | due = Week 10 }}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = ((stack1 = ((stack1 = depth0.peer_feedback),stack1 == null || stack1 === false ? stack1 : stack1.peer_reviews)),stack1 == null || stack1 === false ? stack1 : stack1.options)),stack1 == null || stack1 === false ? stack1 : stack1[0])),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(30, program30, data),fn:self.program(28, program28, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}\n\n"
    + "{{course week | 10 | Responding to feedback }}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}\n\n"
    + "{{assignment | due = Week 11 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(32, program32, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{course week | 11 | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(36, program36, data),fn:self.program(34, program34, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " }}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.class_presentation)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(38, program38, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{assignment | due = Week 12 }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.reflective_essay)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(40, program40, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.portfolio)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(42, program42, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.supplementary_assignments),stack1 == null || stack1 === false ? stack1 : stack1.original_paper)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(44, program44, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n"
    + "{{course week | 12 | Due date }}\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}\n\n"
    + "{{assignment grading | Completion of Wikipedia training | 1 point | \"Practice on-wiki communication\" exercise | 1 point | \"Copyedit an article\" exercise | 1 point | \"Evaluate an article\" exercise\" | 1 point | \"Add to an article\" exercise | 1 point | \"Illustrate an article\" exercise | 1 point | Quality of bibliography and outline | 2 points | Peer reviews and collaboration with classmates | 2 points | Participation in class discussions | 2 points | Quality of your main Wikipedia contributions | 10 points | Reflective essay | 2 points | Original argument paper | 10 points | In-class presentation of contributions | 2 points}}\n\n"
    + "{{course options | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(48, program48, data),fn:self.program(46, program46, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.ga),stack1 == null || stack1 === false ? stack1 : stack1.ga)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(52, program52, data),fn:self.program(50, program50, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.prepare_list)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(54, program54, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(57, program57, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " }}\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],26:[function(require,module,exports){
var DateInputView, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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
    'blur select': 'blurHandler'
  };

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
    var $target, d, dateValue, id, m, type, value, y;
    this.closeIfNoValue();
    $target = $(e.currentTarget);
    id = $target.attr('data-date-id');
    type = $target.attr('data-date-type');
    value = $target.val();
    WizardStepInputs[this.parentStepView.stepId()][id][type] = value;
    m = WizardStepInputs[this.parentStepView.stepId()][id]['month'];
    d = WizardStepInputs[this.parentStepView.stepId()][id]['day'];
    y = WizardStepInputs[this.parentStepView.stepId()][id]['year'];
    dateValue = "" + y + "-" + m + "-" + d;
    WizardStepInputs[this.parentStepView.stepId()][id].value = dateValue;
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

  return DateInputView;

})(Backbone.View);



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/modules/WikiDatesModule.hbs":23}],27:[function(require,module,exports){
var GradingInputView, View, WikiGradingModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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
    'input change': 'inputChangeHandler',
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
      return values.push(($(this)).val());
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



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/modules/WikiGradingModule.hbs":24,"../views/supers/View":35}],28:[function(require,module,exports){
var HomeTemplate, HomeView, OutputTemplate, StepModel, StepNavView, StepView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

HomeTemplate = require('../templates/HomeTemplate.hbs');

OutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

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

  HomeView.prototype.events = {
    'click .exit-edit': 'exitEditClickHandler'
  };

  HomeView.prototype.subscriptions = {
    'step:next': 'nextClickHandler',
    'step:prev': 'prevClickHandler',
    'step:goto': 'gotoClickHandler',
    'step:gotoId': 'gotoIdClickHandler',
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

  HomeView.prototype.nextClickHandler = function() {
    this.advanceStep();
    return this.hideAllTips();
  };

  HomeView.prototype.prevClickHandler = function() {
    this.decrementStep();
    return this.hideAllTips();
  };

  HomeView.prototype.editClickHandler = function(id) {
    $('body').addClass('edit-mode');
    return _.each(this.stepViews, (function(_this) {
      return function(view, index) {
        if (view.model.id === id) {
          return _this.updateStep(index);
        }
      };
    })(this));
  };

  HomeView.prototype.exitEditClickHandler = function() {
    $('body').removeClass('edit-mode');
    return this.updateStep(this.StepNav.totalSteps - 1);
  };

  HomeView.prototype.gotoClickHandler = function(index) {
    this.updateStep(index);
    return this.hideAllTips();
  };

  HomeView.prototype.gotoIdClickHandler = function(id) {
    this.updateStepById(id);
    return this.hideAllTips();
  };

  return HomeView;

})(View);



},{"../App":5,"../models/StepModel":12,"../templates/HomeTemplate.hbs":15,"../templates/steps/output/WikiOutputTemplate.hbs":25,"../views/StepNavView":32,"../views/StepView":33,"../views/supers/View":35}],29:[function(require,module,exports){
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



},{"../views/supers/InputView":34}],30:[function(require,module,exports){
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



},{"../App":5,"../data/WizardContent":7,"../templates/LoginTemplate.hbs":16,"../views/supers/View":35}],31:[function(require,module,exports){
var InputItemView, View, WikiOutputTemplate, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

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



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/output/WikiOutputTemplate.hbs":25,"../views/supers/View":35}],32:[function(require,module,exports){
var StepNavTemplate, StepNavView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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
      if (this.currentStep === this.totalSteps - 1 || application.homeView.stepViews[this.currentStep].hasUserAnswered) {
        itIs = false;
      } else {
        itIs = true;
      }
    }
    return itIs;
  };

  return StepNavView;

})(View);



},{"../App":5,"../templates/StepNavTemplate.hbs":17,"../views/supers/View":35}],33:[function(require,module,exports){
var AssignmentData, CourseInfoData, CourseTipTemplate, DateInputView, GradingInputView, InputItemView, InputTipTemplate, IntroStepTemplate, StepTemplate, StepView, View, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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

  StepView.prototype.hasUserAnswered = false;

  StepView.prototype.hasUserVisited = false;

  StepView.prototype.events = {
    'click .step-form-inner input': 'inputHandler',
    'click #publish': 'publishHandler',
    'click .step-info-tip__close': 'hideTips',
    'click #beginButton': 'beginHandler',
    'click .step-info .step-info-section--accordian': 'accordianClickHandler',
    'click .edit-button': 'editClickHandler',
    'click .step-info-tip': 'hideTips'
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

  StepView.prototype.accordianClickHandler = function(e) {
    var $target;
    $target = $(e.currentTarget);
    return $target.toggleClass('open');
  };

  StepView.prototype.publishHandler = function() {
    return Backbone.Mediator.publish('wizard:publish');
  };

  StepView.prototype.render = function() {
    var $dateInputs, $dates, self;
    this.tipVisible = false;
    if (this.model.get('stepNumber') === 1) {
      this.$el.addClass('step--first').html(this.introTemplate(this.model.attributes));
      $dates = $(this.datesModule());
      $dateInputs = $dates.find('.custom-select');
      self = this;
      $dateInputs.each(function() {
        var dateView;
        dateView = new DateInputView({
          el: $(this)
        });
        return dateView.parentStepView = self;
      });
      this.$el.find('.step-form-dates').html($dates);
    } else {
      this.$el.html(this.template(this.model.attributes));
    }
    this.inputSection = this.$el.find('.step-form-inner');
    this.$tipSection = this.$el.find('.step-info-tips');
    this.inputData = WizardStepInputs[this.model.attributes.id] || [];
    _.each(this.inputData, (function(_this) {
      return function(input, index) {
        var $tipEl, infoData, inputView, tip;
        if (!input.type) {
          return;
        }
        if (input.selected) {
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
    return this.afterRender();
  };

  StepView.prototype.afterRender = function() {
    this.$inputContainers = this.$el.find('.custom-input');
    if (this.model.attributes.id === 'grading') {
      this.gradingView = new GradingInputView();
      this.gradingView.parentStepView = this;
      this.$el.find('.step-form-content').append(this.gradingView.getInputValues().render().el);
      console.log(this.gradingView.currentTotal());
    }
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

  StepView.prototype.updateUserAnswer = function(id, value) {
    if (value === 'on') {
      this.hasUserAnswered = true;
    }
    Backbone.Mediator.publish('step:answered', this);
    return this;
  };

  StepView.prototype.updateRadioAnswer = function(id, index, value) {
    var inputType;
    inputType = WizardStepInputs[this.model.id][id].type;
    WizardStepInputs[this.model.id][id].options[index].selected = value;
    WizardStepInputs[this.model.id][id].value = WizardStepInputs[this.model.id][id].options[index].value;
    return WizardStepInputs[this.model.id][id].selected = index;
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
    } else if (inputType === 'text' || inputType === 'percent') {
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
    $('.custom-input-wrapper').removeClass('selected');
    return $('body').removeClass('tip-open');
  };

  return StepView;

})(View);



},{"../App":5,"../data/WizardAssignmentData":6,"../data/WizardCourseInfo":8,"../data/WizardStepInputs":9,"../templates/steps/IntroStepTemplate.hbs":18,"../templates/steps/StepTemplate.hbs":19,"../templates/steps/info/CourseTipTemplate.hbs":20,"../templates/steps/info/InputTipTemplate.hbs":21,"../templates/steps/modules/WikiDatesModule.hbs":23,"../views/DateInputView":26,"../views/GradingInputView":27,"../views/InputItemView":29,"../views/supers/View":35}],34:[function(require,module,exports){
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
    'keyup input[type="percent"]': 'itemChangeHandler',
    'click .custom-input--checkbox label span': 'checkButtonClickHandler',
    'mouseover': 'mouseoverHandler',
    'mouseenter label': 'hideShowTooltip',
    'mouseenter .check-button': 'hideShowTooltip',
    'mouseout': 'mouseoutHandler',
    'click .editable .check-button': 'checkButtonClickHandler',
    'click .custom-input--radiobox .radio-button': 'radioBoxClickHandler',
    'click .custom-input--radio-group .radio-button': 'radioButtonClickHandler',
    'focus .custom-input--text input': 'onFocus',
    'blur .custom-input--text input': 'onBlur'
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
    if (this.hasInfo && this.parentStep.tipVisible === false) {
      this.$el.addClass('selected');
      this.parentStep.tipVisible = true;
      $('body').addClass('tip-open');
      this.parentStep.$el.find(".step-info-tip").removeClass('visible');
      return this.parentStep.$el.find(".step-info-tip[data-item-index='" + this.itemIndex + "']").addClass('visible');
    }
  };

  InputItemView.prototype.hideTooltip = function() {
    if (this.hasInfo) {
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
    return this.parentStep.updateUserAnswer(inputId, value);
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
    } else if (this.inputType === 'link') {
      return {
        type: inputTypeObject,
        data: this.model.attributes
      };
    }
  };

  return InputItemView;

})(View);



},{"../../data/WizardAssignmentData":6,"../../data/WizardStepInputs":9,"../../templates/steps/inputs/InputItemTemplate.hbs":22,"./View":35}],35:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ291cnNlSW5mby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21haW4uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3JvdXRlcnMvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0RhdGVJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvR3JhZGluZ0lucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9JbnB1dEl0ZW1WaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0xvZ2luVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBOYXZWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3Mvc3VwZXJzL1ZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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LENBQUE7Ozs7O0FDREEsSUFBQSxJQUFBO0VBQUE7aVNBQUE7O0FBQUEsT0FBQSxDQUFRLDBCQUFSLENBQUEsQ0FBQTs7QUFBQTtBQUlFLHlCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQTtBQUFBOzs7S0FBQTs7QUFBQSxpQkFPQSxRQUFBLEdBQVUsU0FBQSxHQUFBLENBUFYsQ0FBQTs7QUFBQSxpQkFZQSxhQUFBLEdBQWUsU0FBQSxHQUFBLENBWmYsQ0FBQTs7QUFjQTtBQUFBOzs7S0FkQTs7QUFBQSxpQkFxQkEsVUFBQSxHQUFZLFNBQUEsR0FBQTtXQUNWLElBQUMsQ0FBQSxNQUFELEdBQVUsQ0FBQyxDQUFDLElBQUYsQ0FBUSxJQUFDLENBQUEsTUFBVCxFQUFpQixJQUFqQixFQURBO0VBQUEsQ0FyQlosQ0FBQTs7QUFBQSxpQkEyQkEsTUFBQSxHQUFRLFNBQUEsR0FBQTtBQUNOLElBQUEsSUFBQyxDQUFBLEdBQUcsQ0FBQyxJQUFMLENBQVcsSUFBQyxDQUFBLFFBQUQsQ0FBVyxJQUFDLENBQUEsYUFBRCxDQUFBLENBQVgsQ0FBWCxDQUFBLENBQUE7QUFBQSxJQUVBLElBQUMsQ0FBQSxXQUFELENBQUEsQ0FGQSxDQUFBO0FBSUEsV0FBTyxJQUFQLENBTE07RUFBQSxDQTNCUixDQUFBOztBQUFBLGlCQXFDQSxXQUFBLEdBQWEsU0FBQSxHQUFBLENBckNiLENBQUE7O0FBdUNBO0FBQUE7OztLQXZDQTs7QUEyQ0E7QUFBQTs7O0tBM0NBOztBQStDQTtBQUFBOzs7S0EvQ0E7O2NBQUE7O0dBRmlCLFFBQVEsQ0FBQyxLQUY1QixDQUFBOztBQUFBLE1BdURNLENBQUMsT0FBUCxHQUFpQixJQXZEakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcycpLmNyZWF0ZSgpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzJykuYXR0YWNoKGV4cG9ydHMpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMnKS5hdHRhY2goZXhwb3J0cykiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCBERVNJR04gV0laQVJEXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbkFwcGxpY2F0aW9uID0gXG5cbiAgaW5pdGlhbGl6ZTogLT5cblxuICAgICMgQXBwIERhdGFcbiAgICBBcHBEYXRhID0gcmVxdWlyZSgnLi9kYXRhL1dpemFyZENvbnRlbnQnKVxuXG4gICAgQGRhdGEgPSBBcHBEYXRhXG5cblxuICAgICMgSW1wb3J0IHZpZXdzXG4gICAgSG9tZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0hvbWVWaWV3JylcblxuICAgIExvZ2luVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvTG9naW5WaWV3JylcblxuICAgIFJvdXRlciA9IHJlcXVpcmUoJy4vcm91dGVycy9Sb3V0ZXInKVxuXG4gICAgSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbiAgICBPdXRwdXRWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9PdXRwdXRWaWV3JylcblxuXG4gICAgIyBJbml0aWFsaXplIHZpZXdzXG4gICAgQGhvbWVWaWV3ID0gbmV3IEhvbWVWaWV3KClcblxuICAgIEBsb2dpblZpZXcgPSBuZXcgTG9naW5WaWV3KClcblxuICAgIEBpbnB1dEl0ZW1WaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoKVxuXG4gICAgQG91dHB1dFZpZXcgPSBuZXcgT3V0cHV0VmlldygpXG5cbiAgICBAcm91dGVyID0gbmV3IFJvdXRlcigpXG5cbiAgICBcbiAgICBcbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb24iLCJtb2R1bGUuZXhwb3J0cyA9IFdpemFyZEFzc2lnbm1lbnREYXRhID0ge1xuXG59IiwiV2l6YXJkQ29udGVudCA9IFtcbiAge1xuICAgIGlkOiBcImludHJvXCJcbiAgICB0aXRsZTogJ1dlbGNvbWUgdG8gdGhlIEFzc2lnbm1lbnQgRGVzaWduIFdpemFyZCEnXG4gICAgbG9naW5faW5zdHJ1Y3Rpb25zOiAnQ2xpY2sgTG9naW4gd2l0aCBXaWtpcGVkaWEgdG8gZ2V0IHN0YXJ0ZWQnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnJ1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPlRoaXMgdG9vbCB3aWxsIHdhbGsgeW91IHRocm91Z2ggYmVzdCBwcmFjdGljZXMgZm9yIFdpa2lwZWRpYSBjbGFzc3Jvb20gYXNzaWdubWVudHMgYW5kIGhlbHAgeW91IGNyZWF0ZSBhIGN1c3RvbWl6ZWQgc3lsbGFidXMgZm9yIHlvdXIgY291cnNlLCBicm9rZW4gaW50byB3ZWVrbHkgYXNzaWdubWVudHMuPC9wPlwiXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPldoZW4geW914oCZcmUgZmluaXNoZWQsIHlvdSBjYW4gcHVibGlzaCBhIHJlYWR5LXRvLXVzZSBsZXNzb24gcGxhbiBvbnRvIGEgd2lraSBwYWdlLCB3aGVyZSBpdCBjYW4gYmUgY3VzdG9taXplZCBldmVuIGZ1cnRoZXIuPC9wPlwiICAgICBcbiAgICAgICAgICBcIjxwIGNsYXNzPSdsYXJnZSc+TGV04oCZcyBzdGFydCBieSBmaWxsaW5nIGluIHNvbWUgYmFzaWNzIGFib3V0IHlvdSBhbmQgeW91ciBjb3Vyc2U6PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImFzc2lnbm1lbnRfc2VsZWN0aW9uXCJcbiAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgdHlwZSBzZWxlY3Rpb24nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgYXNzaWdubWVudCBzZWxlY3Rpb25zJ1xuICAgIGZvcm1UaXRsZTogJ0F2YWlsYWJsZSBhc3NpZ25tZW50czonXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIllvdSBjYW4gdGVhY2ggd2l0aCBXaWtpcGVkaWEgaW4gc2V2ZXJhbCBkaWZmZXJlbnQgd2F5cywgYW5kIGl0J3MgaW1wb3J0YW50IHRvIGRlc2lnbiBhbiBhc3NpZ25tZW50IHRoYXQgZml0cyBvbiBXaWtpcGVkaWEgYW5kIGFjaGlldmVzIHlvdXIgc3R1ZGVudCBsZWFybmluZyBvYmplY3RpdmVzLiBZb3VyIGZpcnN0IHN0ZXAgaXMgdG8gY2hvb3NlIHdoaWNoIGFzc2lnbm1lbnQocykgeW91J2xsIGJlIGFza2luZyB5b3VyIHN0dWRlbnRzIHRvIGNvbXBsZXRlIGFzIHBhcnQgb2YgdGhlIGNvdXJzZS4gV2UndmUgY3JlYXRlZCBzb21lIGd1aWRlbGluZXMgdG8gaGVscCB5b3UsIGJ1dCB5b3UnbGwgbmVlZCB0byBtYWtlIHNvbWUga2V5IGRlY2lzaW9ucywgc3VjaCBhczogd2hpY2ggbGVhcm5pbmcgb2JqZWN0aXZlcyBhcmUgeW91IHRhcmdldGluZyB3aXRoIHRoaXMgYXNzaWdubWVudD8gV2hhdCBza2lsbHMgZG8geW91ciBzdHVkZW50cyBhbHJlYWR5IGhhdmU/IEhvdyBtdWNoIHRpbWUgY2FuIHlvdSBkZXZvdGUgdG8gdGhlIGFzc2lnbm1lbnQ/XCJcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPk1vc3QgaW5zdHJ1Y3RvcnMgYXNrIHRoZWlyIHN0dWRlbnRzIHRvIHdyaXRlIGFuIGFydGljbGUuIFN0dWRlbnRzIHN0YXJ0IGJ5IGxlYXJuaW5nIHRoZSBiYXNpY3Mgb2YgV2lraXBlZGlhLCBhbmQgdGhlbiB0aGV5IGZvY3VzIG9uIHRoZSBjb250ZW50LiBUaGV5IHBsYW4sIHJlc2VhcmNoLCB3cml0ZSwgYW5kIHJldmlzZSBhIHByZXZpb3VzbHkgbWlzc2luZyBXaWtpcGVkaWEgYXJ0aWNsZSBvciBjb250cmlidXRlIHRvIGFuIGV4aXN0aW5nIGVudHJ5IG9uIGEgY291cnNlLXJlbGF0ZWQgdG9waWMgdGhhdCBpcyBpbmNvbXBsZXRlLiBUaGlzIGFzc2lnbm1lbnQgdHlwaWNhbGx5IHJlcGxhY2VzIGEgdGVybSBwYXBlciBvciByZXNlYXJjaCBwcm9qZWN0LCBvciBpdCBmb3JtcyB0aGUgbGl0ZXJhdHVyZSByZXZpZXcgc2VjdGlvbiBvZiBhIGxhcmdlciBwYXBlci4gVGhlIHN0dWRlbnQgbGVhcm5pbmcgb3V0Y29tZSBpcyBoaWdoIHdpdGggdGhpcyBhc3NpZ25tZW50LCBidXQgaXQgZG9lcyB0YWtlIGEgc2lnbmlmaWNhbnQgYW1vdW50IG9mIHRpbWUuIFRvIGxlYXJuIGhvdyB0byBjb250cmlidXRlIHRvIFdpa2lwZWRpYSwgeW91ciBzdHVkZW50cyBuZWVkIHRvIGxlYXJuIGJvdGggdGhlIHdpa2kgbWFya3VwIGxhbmd1YWdlIGFuZCBrZXkgcG9saWNpZXMgYW5kIGV4cGVjdGF0aW9ucyBvZiB0aGUgV2lraXBlZGlhLWVkaXRpbmcgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgIFwiPHA+SWYgd3JpdGluZyBhbiBhcnRpY2xlIGlzbid0IHJpZ2h0IGZvciB5b3VyIGNsYXNzLCBvdGhlciBhc3NpZ25tZW50IG9wdGlvbnMgc3RpbGwgZ2l2ZSBzdHVkZW50cyB2YWx1YWJsZSBsZWFybmluZyBvcHBvcnR1bml0aWVzIGFzIHRoZXkgaW1wcm92ZSBXaWtpcGVkaWEuIFNlbGVjdCBhbiBhc3NpZ25tZW50IHR5cGUgdG8gdGhlIGxlZnQgdG8gbGVhcm4gbW9yZSBhYm91dCBlYWNoIGFzc2lnbm1lbnQuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImxlYXJuaW5nX2Vzc2VudGlhbHNcIlxuICAgIHRpdGxlOiAnV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZSBvciBtb3JlOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICBpbnN0cnVjdGlvbnM6IFwiVG8gZ2V0IHN0YXJ0ZWQsIHlvdSdsbCB3YW50IHRvIGludHJvZHVjZSB5b3VyIHN0dWRlbnRzIHRvIHRoZSBiYXNpYyBydWxlcyBvZiB3cml0aW5nIFdpa2lwZWRpYSBhcnRpY2xlcyBhbmQgd29ya2luZyB3aXRoIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5LiBBcyB0aGVpciBmaXJzdCBXaWtpcGVkaWEgYXNzaWdubWVudCBtaWxlc3RvbmUsIHlvdSBjYW4gYXNrIHRoZSBzdHVkZW50cyB0byBjcmVhdGUgYWNjb3VudHMgYW5kIHRoZW4gY29tcGxldGUgdGhlICcnb25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50cycnLiBUaGlzIHRyYWluaW5nIGludHJvZHVjZXMgdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkgYW5kIGhvdyBpdCB3b3JrcywgZGVtb25zdHJhdGVzIHRoZSBiYXNpY3Mgb2YgZWRpdGluZyBhbmQgd2Fsa3Mgc3R1ZGVudHMgdGhyb3VnaCB0aGVpciBmaXJzdCBlZGl0cywgZ2l2ZXMgYWR2aWNlIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgYW5kIGRyYWZ0aW5nIHJldmlzaW9ucywgYW5kIGV4cGxhaW5zIGZ1cnRoZXIgc291cmNlcyBvZiBzdXBwb3J0IGFzIHRoZXkgY29udGludWUgYWxvbmcuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCwgd2hpY2ggeW91IGNhbiB1c2UgdG8gdmVyaWZ5IHRoYXQgc3R1ZGVudHMgY29tcGxldGVkIHRoZSB0cmFpbmluZy5cIlxuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5UaGlzIHRyYWluaW5nIGludHJvZHVjZXMgdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkgYW5kIGhvdyBpdCB3b3JrcywgZGVtb25zdHJhdGVzIHRoZSBiYXNpY3Mgb2YgZWRpdGluZyBhbmQgd2Fsa3Mgc3R1ZGVudHMgdGhyb3VnaCB0aGVpciBmaXJzdCBlZGl0cywgZ2l2ZXMgYWR2aWNlIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXMgYW5kIGRyYWZ0aW5nIHJldmlzaW9ucywgYW5kIGNvdmVycyBzb21lIG9mIHRoZSB3YXlzIHRoZXkgY2FuIGZpbmQgaGVscCBhcyB0aGV5IGdldCBzdGFydGVkLiBJdCB0YWtlcyBhYm91dCBhbiBob3VyIGFuZCBlbmRzIHdpdGggYSBjZXJ0aWZpY2F0aW9uIHN0ZXAgdGhhdCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0Fzc2lnbm1lbnQgbWlsZXN0b25lczonXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DcmVhdGUgYSB1c2VyIGFjY291bnQgYW5kIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+Q29tcGxldGUgdGhlIG9ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHMuIER1cmluZyB0aGlzIHRyYWluaW5nLCB5b3Ugd2lsbCBtYWtlIGVkaXRzIGluIGEgc2FuZGJveCBhbmQgbGVhcm4gdGhlIGJhc2ljIHJ1bGVzIG9mIFdpa2lwZWRpYS4gPC9saT5cbiAgICAgICAgICAgIDxsaT5UbyBwcmFjdGljZSBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIFdpa2lwZWRpYSwgaW50cm9kdWNlIHlvdXJzZWxmIHRvIGFueSBXaWtpcGVkaWFucyBoZWxwaW5nIHlvdXIgY2xhc3MgKHN1Y2ggYXMgYSBXaWtpcGVkaWEgQW1iYXNzYWRvciksIGFuZCBsZWF2ZSBhIG1lc3NhZ2UgZm9yIGEgY2xhc3NtYXRlIG9uIHRoZWlyIHVzZXIgdGFsayBwYWdlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICAgIFwiPHA+V2lsbCBjb21wbGV0aW9uIG9mIHRoZSBzdHVkZW50IHRyYWluaW5nIGJlIHBhcnQgb2YgeW91ciBzdHVkZW50cycgZ3JhZGVzPzwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJnZXR0aW5nX3N0YXJ0ZWRcIlxuICAgIHRpdGxlOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBlZGl0aW5nJ1xuICAgIGluc3RydWN0aW9uczogXCJJdCBpcyBpbXBvcnRhbnQgZm9yIHN0dWRlbnRzIHRvIHN0YXJ0IGVkaXRpbmcgV2lraXBlZGlhIHJpZ2h0IGF3YXkuIFRoYXQgd2F5LCB0aGV5IGJlY29tZSBmYW1pbGlhciB3aXRoIFdpa2lwZWRpYSdzIG1hcmt1cCAoXFxcIndpa2lzeW50YXhcXFwiLCBcXFwid2lraW1hcmt1cFxcXCIsIG9yIFxcXCJ3aWtpY29kZVxcXCIpIGFuZCB0aGUgbWVjaGFuaWNzIG9mIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gdGhlIHNpdGUuIFdlIHJlY29tbWVuZCBhc3NpZ25pbmcgYSBmZXcgYmFzaWMgV2lraXBlZGlhIHRhc2tzIGVhcmx5IG9uLlwiXG4gICAgZm9ybVRpdGxlOiAnV2hpY2ggYmFzaWMgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gaW5jbHVkZT8nXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPldoaWNoIGludHJvZHVjdG9yeSBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byB1c2UgdG8gYWNjbGltYXRlIHlvdXIgc3R1ZGVudHMgdG8gV2lraXBlZGlhPyBZb3UgY2FuIHNlbGVjdCBub25lLCBvbmUsIG9yIG1vcmUuIFdoaWNoZXZlciB5b3Ugc2VsZWN0IHdpbGwgYmUgYWRkZWQgdG8gdGhlIGNvdXJzZSBzeWxsYWJ1cy48L3A+J1xuICAgICAgICAgICc8dWw+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5Dcml0aXF1ZSBhbiBhcnRpY2xlLjwvc3Ryb25nPiBDcml0aWNhbGx5IGV2YWx1YXRlIGFuIGV4aXN0aW5nIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLCBhbmQgbGVhdmUgc3VnZ2VzdGlvbnMgZm9yIGltcHJvdmluZyBpdCBvbiB0aGUgYXJ0aWNsZeKAmXMgdGFsayBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+QWRkIHRvIGFuIGFydGljbGUuPC9zdHJvbmc+IFVzaW5nIGNvdXJzZSByZWFkaW5ncyBvciBvdGhlciByZWxldmFudCBzZWNvbmRhcnkgc291cmNlcywgYWRkIDHigJMyIHNlbnRlbmNlcyBvZiBuZXcgaW5mb3JtYXRpb24gdG8gYSBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcy4gQmUgc3VyZSB0byBpbnRlZ3JhdGUgaXQgd2VsbCBpbnRvIHRoZSBleGlzdGluZyBhcnRpY2xlLCBhbmQgaW5jbHVkZSBhIGNpdGF0aW9uIHRvIHRoZSBzb3VyY2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5Db3B5ZWRpdCBhbiBhcnRpY2xlLjwvc3Ryb25nPiBCcm93c2UgV2lraXBlZGlhIHVudGlsIHlvdSBmaW5kIGFuIGFydGljbGUgdGhhdCB5b3Ugd291bGQgbGlrZSB0byBpbXByb3ZlLCBhbmQgbWFrZSBzb21lIGVkaXRzIHRvIGltcHJvdmUgdGhlIGxhbmd1YWdlIG9yIGZvcm1hdHRpbmcuIDwvbGk+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5JbGx1c3RyYXRlIGFuIGFydGljbGUuPC9zdHJvbmc+IEZpbmQgYW4gb3Bwb3J0dW5pdHkgdG8gaW1wcm92ZSBhbiBhcnRpY2xlIGJ5IGNyZWF0aW5nIGFuZCB1cGxvYWRpbmcgYW4gb3JpZ2luYWwgcGhvdG9ncmFwaCBvciB2aWRlby48L2xpPlxuICAgICAgICAgIDwvdWw+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgIHRpdGxlOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgZm9ybVRpdGxlOiAnVGhlcmUgYXJlIHR3byByZWNvbW1lbmRlZCBvcHRpb25zIGZvciBzZWxlY3RpbmcgYXJ0aWNsZXM6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGNob29zaW5nIGFydGljbGVzJ1xuICAgIGluc3RydWN0aW9uczogJ0Nob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuJ1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Tb21lIGFydGljbGVzIG1heSBpbml0aWFsbHkgbG9vayBlYXN5IHRvIGltcHJvdmUsIGJ1dCBxdWFsaXR5IHJlZmVyZW5jZXMgdG8gZXhwYW5kIHRoZW0gbWF5IGJlIGRpZmZpY3VsdCB0byBmaW5kLiBGaW5kaW5nIHRvcGljcyB3aXRoIHRoZSByaWdodCBiYWxhbmNlIGJldHdlZW4gcG9vciBXaWtpcGVkaWEgY292ZXJhZ2UgYW5kIGF2YWlsYWJsZSBsaXRlcmF0dXJlIGZyb20gd2hpY2ggdG8gZXhwYW5kIHRoYXQgY292ZXJhZ2UgY2FuIGJlIHRyaWNreS4gSGVyZSBhcmUgc29tZSBndWlkZWxpbmVzIHRvIGtlZXAgaW4gbWluZCB3aGVuIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgaW1wcm92ZW1lbnQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFydGljbGVzIHRoYXQgYXJlIFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD4nXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChlLmcuLCBHbG9iYWwgV2FybWluZywgQWJvcnRpb24sIFNjaWVudG9sb2d5LCBldGMuKS4gWW91IG1heSBiZSBtb3JlIHN1Y2Nlc3NmdWwgc3RhcnRpbmcgYSBzdWItYXJ0aWNsZSBvbiB0aGUgdG9waWMgaW5zdGVhZC48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICA8bGk+QXZvaWQgd29ya2luZyBvbiBzb21ldGhpbmcgd2l0aCBzY2FyY2UgbGl0ZXJhdHVyZS4gV2lraXBlZGlhIGFydGljbGVzIGNpdGUgc2Vjb25kYXJ5IGxpdGVyYXR1cmUgc291cmNlcywgc28gaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSBlbm91Z2ggc291cmNlcyBmb3IgdmVyaWZpY2F0aW9uIGFuZCB0byBwcm92aWRlIGEgbmV1dHJhbCBwb2ludCBvZiB2aWV3LjwvbGk+XG4gICAgICAgICAgICA8bGk+RG9uJ3Qgc3RhcnQgYXJ0aWNsZXMgd2l0aCB0aXRsZXMgdGhhdCBpbXBseSBhbiBhcmd1bWVudCBvciBlc3NheS1saWtlIGFwcHJvYWNoIChlLmcuLCBUaGUgRWZmZWN0cyBUaGF0IFRoZSBSZWNlbnQgU3ViLVByaW1lIE1vcnRnYWdlIENyaXNpcyBoYXMgaGFkIG9uIHRoZSBVUyBhbmQgR2xvYmFsIEVjb25vbWljcykuIFRoZXNlIHR5cGUgb2YgdGl0bGVzLCBhbmQgbW9zdCBsaWtlbHkgdGhlIGNvbnRlbnQgdG9vLCBtYXkgbm90IGJlIGFwcHJvcHJpYXRlIGZvciBhbiBlbmN5Y2xvcGVkaWEuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMS0yIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gKlJlbGV2YW50IFdpa2lQcm9qZWN0IHBhZ2VzIGNhbiBwcm92aWRlIGEgbGlzdCBvZiBzdHVicyB0aGF0IG5lZWQgaW1wcm92ZW1lbnQuPC9saT5cbiAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZSBpbnN0cnVjdG9yLCB5b3Ugc2hvdWxkIGFwcGx5IHlvdXIgb3duIGV4cGVydGlzZSB0byBleGFtaW5pbmcgV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkLiBZb3UgdW5kZXJzdGFuZCB0aGUgYnJvYWRlciBpbnRlbGxlY3R1YWwgY29udGV4dCB3aGVyZSBpbmRpdmlkdWFsIHRvcGljcyBmaXQgaW4sIHlvdSBjYW4gcmVjb2duaXplIHdoZXJlIFdpa2lwZWRpYSBmYWxscyBzaG9ydCwgeW91IGtub3figJRvciBrbm93IGhvdyB0byBmaW5k4oCUdGhlIHJlbGV2YW50IGxpdGVyYXR1cmUsIGFuZCB5b3Uga25vdyB3aGF0IHRvcGljcyB5b3VyIHN0dWRlbnRzIHNob3VsZCBiZSBhYmxlIHRvIGhhbmRsZS4gWW91ciBndWlkYW5jZSBvbiBhcnRpY2xlIGNob2ljZSBhbmQgc291cmNpbmcgaXMgY3JpdGljYWwgZm9yIGJvdGggeW91ciBzdHVkZW50c+KAmSBzdWNjZXNzIGFuZCB0aGUgaW1wcm92ZW1lbnQgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdTdHVkZW50cyBmaW5kIGFydGljbGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gTGV0dGluZyBzdHVkZW50cyBmaW5kIHRoZWlyIG93biBhcnRpY2xlcyBwcm92aWRlcyB0aGVtIHdpdGggYSBzZW5zZSBvZiBtb3RpdmF0aW9uIGFuZCBvd25lcnNoaXAgb3ZlciB0aGUgYXNzaWdubWVudCwgYnV0IGl0IG1heSBhbHNvIGxlYWQgdG8gY2hvaWNlcyB0aGF0IGFyZSBmdXJ0aGVyIGFmaWVsZCBmcm9tIGNvdXJzZSBtYXRlcmlhbC48L3A+J1xuICAgICAgICBdXG4gICAgICB9IFxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwicmVzZWFyY2hfcGxhbm5pbmdcIlxuICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgIGZvcm1UaXRsZTogJ0hvdyBzaG91bGQgc3R1ZGVudHMgcGxhbiB0aGVpciBhcnRpY2xlcz8nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgIGluc3RydWN0aW9uczogIFwiU3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGVkIGZvciBXaWtpcGVkaWEuIFRoYXQncyB3aHkgd2UgcmVjb21tZW5kIGFza2luZyBzdHVkZW50cyB0byBwdXQgdG9nZXRoZXIgYSBiaWJsaW9ncmFwaHkgb2YgbWF0ZXJpYWxzIHRoZXkgd2FudCB0byB1c2UgaW4gZWRpdGluZyB0aGUgYXJ0aWNsZSwgd2hpY2ggY2FuIHRoZW4gYmUgYXNzZXNzZWQgYnkgeW91IGFuZCBvdGhlciBXaWtpcGVkaWFucy5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5UaGVuLCBzdHVkZW50cyBzaG91bGQgcHJvcG9zZSBvdXRsaW5lcyBmb3IgdGhlaXIgYXJ0aWNsZXMuIFRoaXMgY2FuIGJlIGEgdHJhZGl0aW9uYWwgb3V0bGluZSwgaW4gd2hpY2ggc3R1ZGVudHMgaWRlbnRpZnkgd2hpY2ggc2VjdGlvbnMgdGhlaXIgYXJ0aWNsZXMgd2lsbCBoYXZlIGFuZCB3aGljaCBhc3BlY3RzIG9mIHRoZSB0b3BpYyB3aWxsIGJlIGNvdmVyZWQgaW4gZWFjaCBzZWN0aW9uLiBBbHRlcm5hdGl2ZWx5LCBzdHVkZW50cyBjYW4gZGV2ZWxvcCBlYWNoIG91dGxpbmUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uIOKAlCB0aGUgdW50aXRsZWQgc2VjdGlvbiBhdCB0aGUgYmVnaW5uaW5nIG9mIGFuIGFydGljbGUgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcHJvdmlkZSBhIGNvbmNpc2Ugc3VtbWFyeSBvZiBpdHMgY29udGVudC4gV291bGQgeW91IGxpa2UgeW91ciBzdHVkZW50cyB0byBjcmVhdGUgdHJhZGl0aW9uYWwgb3V0bGluZXMsIG9yIGNvbXBvc2Ugb3V0bGluZXMgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEtc3R5bGUgbGVhZCBzZWN0aW9uPzwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgdGl0bGU6ICdEcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICBpbnN0cnVjdGlvbnM6ICdPbmNlIHN0dWRlbnRzIGhhdmUgZ290dGVuIGEgZ3JpcCBvbiB0aGVpciB0b3BpY3MgYW5kIHRoZSBzb3VyY2VzIHRoZXkgd2lsbCB1c2UgdG8gd3JpdGUgYWJvdXQgdGhlbSwgaXTigJlzIHRpbWUgdG8gc3RhcnQgd3JpdGluZyBvbiBXaWtpcGVkaWEuIFlvdSBjYW4gYXNrIHRoZW0gdG8ganVtcCByaWdodCBpbiBhbmQgZWRpdCBsaXZlLCBvciBzdGFydCB0aGVtIG9mZiBpbiB0aGVpciBvd24gc2FuZGJveGVzLiBUaGVyZSBhcmUgcHJvcyBhbmQgY29ucyB0byBlYWNoIGFwcHJvYWNoLidcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgdG8gc2FuZGJveGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5TYW5kYm94ZXMgbWFrZSBzdHVkZW50cyBmZWVsIHNhZmUgYmVjYXVzZSB0aGV5IGNhbiBlZGl0IHdpdGhvdXQgdGhlIHByZXNzdXJlIG9mIHRoZSB3aG9sZSB3b3JsZCByZWFkaW5nIHRoZWlyIGRyYWZ0cywgb3Igb3RoZXIgV2lraXBlZGlhbnMgYWx0ZXJpbmcgdGhlaXIgd3JpdGluZy4gSG93ZXZlciwgc2FuZGJveCBlZGl0aW5nIGxpbWl0cyBtYW55IG9mIHRoZSB1bmlxdWUgYXNwZWN0cyBvZiBXaWtpcGVkaWEgYXMgYSB0ZWFjaGluZyB0b29sLCBzdWNoIGFzIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBhbmQgaW5jcmVtZW50YWwgZHJhZnRpbmcuIFNwZW5kaW5nIG1vcmUgdGhhbiBhIHdlZWsgb3IgdHdvIGluIHNhbmRib3hlcyBpcyBzdHJvbmdseSBkaXNjb3VyYWdlZC48L3A+XCIgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdQcm9zIGFuZCBjb25zIHRvIGVkaXRpbmcgbGl2ZSdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+RWRpdGluZyBsaXZlIGlzIGV4Y2l0aW5nIGZvciB0aGUgc3R1ZGVudHMgYmVjYXVzZSB0aGV5IGNhbiBzZWUgdGhlaXIgY2hhbmdlcyB0byB0aGUgYXJ0aWNsZXMgaW1tZWRpYXRlbHkgYW5kIGV4cGVyaWVuY2UgdGhlIGNvbGxhYm9yYXRpdmUgZWRpdGluZyBwcm9jZXNzIHRocm91Z2hvdXQgdGhlIGFzc2lnbm1lbnQuIEhvd2V2ZXIsIGJlY2F1c2UgbmV3IGVkaXRvcnMgb2Z0ZW4gdW5pbnRlbnRpb25hbGx5IGJyZWFrIFdpa2lwZWRpYSBydWxlcywgc29tZXRpbWVzIHN0dWRlbnRz4oCZIGFkZGl0aW9ucyBhcmUgcXVlc3Rpb25lZCBvciByZW1vdmVkLjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiAnXCI8cD5XaWxsIHlvdSBoYXZlIHlvdXIgc3R1ZGVudHMgZHJhZnQgdGhlaXIgZWFybHkgd29yayBpbiBzYW5kYm94ZXMsIG9yIHdvcmsgbGl2ZSBmcm9tIHRoZSBiZWdpbm5pbmc/PC9wPlwiJ1xuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcInBlZXJfZmVlZGJhY2tcIlxuICAgIHRpdGxlOiAnUGVlciBmZWVkYmFjaydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBwZWVyIGZlZWRiYWNrJ1xuICAgIGZvcm1UaXRsZTogXCJIb3cgbWFueSBwZWVyIHJldmlld3Mgc2hvdWxkIGVhY2ggc3R1ZGVudCBjb25kdWN0P1wiXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIkNvbGxhYm9yYXRpb24gaXMgYSBjcml0aWNhbCBlbGVtZW50IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+Rm9yIHNvbWUgc3R1ZGVudHMsIHRoaXMgd2lsbCBoYXBwZW4gc3BvbnRhbmVvdXNseTsgdGhlaXIgY2hvaWNlIG9mIHRvcGljcyB3aWxsIGF0dHJhY3QgaW50ZXJlc3RlZCBXaWtpcGVkaWFucyB3aG8gd2lsbCBwaXRjaCBpbiB3aXRoIGlkZWFzLCBjb3B5ZWRpdHMsIG9yIGV2ZW4gc3Vic3RhbnRpYWwgY29udHJpYnV0aW9ucyB0byB0aGUgc3R1ZGVudHPigJkgYXJ0aWNsZXMuIEluIG1hbnkgY2FzZXMsIGhvd2V2ZXIsIHRoZXJlIHdpbGwgYmUgbGl0dGxlIHNwb250YW5lb3VzIGVkaXRpbmcgb2Ygc3R1ZGVudHPigJkgYXJ0aWNsZXMgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIHRlcm0uIEZvcnR1bmF0ZWx5LCB5b3UgaGF2ZSBhIGNsYXNzcm9vbSBmdWxsIG9mIHBlZXIgcmV2aWV3ZXJzLiBZb3UgY2FuIG1ha2UgdGhlIG1vc3Qgb2YgdGhpcyBieSBhc3NpZ25pbmcgc3R1ZGVudHMgdG8gcmV2aWV3IGVhY2ggb3RoZXJz4oCZIGFydGljbGVzIHNvb24gYWZ0ZXIgZnVsbC1sZW5ndGggZHJhZnRzIGFyZSBwb3N0ZWQuIFRoaXMgZ2l2ZXMgc3R1ZGVudHMgcGxlbnR5IG9mIHRpbWUgdG8gYWN0IG9uIHRoZSBhZHZpY2Ugb2YgdGhlaXIgcGVlcnMuPC9wPlwiXG4gICAgICAgICAgXCI8cD5Ib3cgbWFueSBwZWVyIHJldmlld3Mgd2lsbCB5b3UgYXNrIGVhY2ggc3R1ZGVudCB0byBjb250cmlidXRlIGR1cmluZyB0aGUgY291cnNlPzwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwic3VwcGxlbWVudGFyeV9hc3NpZ25tZW50c1wiXG4gICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgIGluc3RydWN0aW9uczogXCJCeSB0aGUgdGltZSBzdHVkZW50cyBoYXZlIG1hZGUgaW1wcm92ZW1lbnRzIGJhc2VkIG9uIGNsYXNzbWF0ZXMnIGNvbW1lbnRz4oCUYW5kIGlkZWFsbHkgc3VnZ2VzdGlvbnMgZnJvbSB5b3UgYXMgd2VsbOKAlHRoZXkgc2hvdWxkIGhhdmUgcHJvZHVjZWQgbmVhcmx5IGNvbXBsZXRlIGFydGljbGVzLiBOb3cgaXMgdGhlIGNoYW5jZSB0byBlbmNvdXJhZ2UgdGhlbSB0byB3YWRlIGEgbGl0dGxlIGRlZXBlciBpbnRvIFdpa2lwZWRpYSBhbmQgaXRzIG5vcm1zIGFuZCBjcml0ZXJpYSB0byBjcmVhdGUgZ3JlYXQgY29udGVudC4gWW914oCZbGwgcHJvYmFibHkgaGF2ZSBkaXNjdXNzZWQgbWFueSBvZiB0aGUgY29yZSBwcmluY2lwbGVzIG9mIFdpa2lwZWRpYeKAlGFuZCByZWxhdGVkIGlzc3VlcyB5b3Ugd2FudCB0byBmb2N1cyBvbuKAlGJ1dCBub3cgdGhhdCB0aGV54oCZdmUgZXhwZXJpZW5jZWQgZmlyc3QtaGFuZCBob3cgV2lraXBlZGlhIHdvcmtzLCB0aGlzIGlzIGEgZ29vZCB0aW1lIHRvIHJldHVybiB0byB0b3BpY3MgbGlrZSBuZXV0cmFsaXR5LCBtZWRpYSBmbHVlbmN5LCBhbmQgdGhlIGltcGFjdHMgYW5kIGxpbWl0cyBvZiBXaWtpcGVkaWEuIENvbnNpZGVyIGJyaW5naW5nIGluIGEgZ3Vlc3Qgc3BlYWtlciwgaGF2aW5nIGEgcGFuZWwgZGlzY3Vzc2lvbiwgb3Igc2ltcGx5IGhhdmluZyBhbiBvcGVuIGRpc2N1c3Npb24gaW4gY2xhc3MgYWJvdXQgd2hhdCB0aGUgc3R1ZGVudHMgaGF2ZSBkb25lIHNvIGZhciBhbmQgd2h5IChvciB3aGV0aGVyKSBpdCBtYXR0ZXJzLlwiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgIFwiPHA+SW4gYWRkaXRpb24gdG8gdGhlIFdpa2lwZWRpYSBhcnRpY2xlIHdyaXRpbmcgaXRzZWxmLCB5b3UgbWF5IHdhbnQgdG8gdXNlIGEgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50LiBUaGVzZSBhc3NpZ25tZW50cyBjYW4gcmVpbmZvcmNlIGFuZCBkZWVwZW4geW91ciBjb3Vyc2UncyBsZWFybmluZyBvdXRjb21lcywgYW5kIGFsc28gaGVscCB5b3UgdG8gdW5kZXJzdGFuZCBhbmQgZXZhbHVhdGUgdGhlIHN0dWRlbnRzJyB3b3JrIGFuZCBsZWFybmluZyBvdXRjb21lcy4gSGVyZSBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuIFNjcm9sbCBvdmVyIGVhY2ggZm9yIG1vcmUgaW5mb3JtYXRpb24sIGFuZCBzZWxlY3QgYW55IHRoYXQgeW91IHdpc2ggdG8gdXNlIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAgIyB7XG4gICMgICBpZDogXCJkeWtfZ2FcIlxuICAjICAgdGl0bGU6ICdEWUsgYW5kIEdvb2QgQXJ0aWNsZSdcbiAgIyAgIGluZm9UaXRsZTogJ0Fib3V0IERZSyBhbmQgR29vZCBBcnRpY2xlIHByb2Nlc3NlcydcbiAgIyAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoZXNlIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAjICAgc2VjdGlvbnM6IFtcbiAgIyAgICAge1xuICAjICAgICAgIHRpdGxlOiAnJ1xuICAjICAgICAgIGNvbnRlbnQ6IFtcbiAgIyAgICAgICAgIFwiPHA+QWR2YW5jZWQgc3R1ZGVudHPigJkgYXJ0aWNsZXMgbWF5IHF1YWxpZnkgZm9yIHN1Ym1pc3Npb24gdG8gRGlkIFlvdSBLbm93IChEWUspLCBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgZmVhdHVyaW5nIG5ldyBjb250ZW50LiBUaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXgpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLjwvcD5cIlxuICAjICAgICAgICAgXCI8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBidXQgaXQgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIDYgaG91cnMgaW4gdGhlIHNwb3RsaWdodC48L3A+XCJcbiAgIyAgICAgICAgIFwiPHA+V2Ugc3Ryb25nbHkgcmVjb21tZW5kIHRyeWluZyBmb3IgRFlLIHN0YXR1cyB5b3Vyc2VsZiBiZWZvcmVoYW5kLCBvciB3b3JraW5nIHdpdGggZXhwZXJpZW5jZWQgV2lraXBlZGlhbnMgdG8gaGVscCB5b3VyIHN0dWRlbnRzIG5hdmlnYXRlIHRoZSBEWUsgcHJvY2VzcyBzbW9vdGhseS4gSWYgeW91ciBzdHVkZW50cyBhcmUgd29ya2luZyBvbiBhIHJlbGF0ZWQgc2V0IG9mIGFydGljbGVzLCBpdCBjYW4gaGVscCB0byBjb21iaW5lIG11bHRpcGxlIGFydGljbGUgbm9taW5hdGlvbnMgaW50byBhIHNpbmdsZSBob29rOyB0aGlzIGhlbHBzIGtlZXAgeW91ciBzdHVkZW50c+KAmSB3b3JrIGZyb20gc3dhbXBpbmcgdGhlIHByb2Nlc3Mgb3IgYW50YWdvbml6aW5nIHRoZSBlZGl0b3JzIHdobyBtYWludGFpbiBpdC48L3A+XCJcbiAgIyAgICAgICAgIFwiPHA+V2VsbC1kZXZlbG9wZWQgYXJ0aWNsZXMgdGhhdCBoYXZlIHBhc3NlZCBhIEdvb2QgQXJ0aWNsZSAoR0EpIHJldmlldyBhcmUgYSBzdWJzdGFudGlhbCBhY2hpZXZlbWVudCBpbiB0aGVpciBvd24gcmlnaHQsIGFuZCBjYW4gYWxzbyBxdWFsaWZ5IGZvciBEWUsuIFRoaXMgcGVlciByZXZpZXcgcHJvY2VzcyBpbnZvbHZlcyBjaGVja2luZyBhIHBvbGlzaGVkIGFydGljbGUgYWdhaW5zdCBXaWtpcGVkaWEncyBHQSBjcml0ZXJpYTogYXJ0aWNsZXMgbXVzdCBiZSB3ZWxsLXdyaXR0ZW4sIHZlcmlmaWFibGUgYW5kIHdlbGwtc291cmNlZCB3aXRoIG5vIG9yaWdpbmFsIHJlc2VhcmNoLCBicm9hZCBpbiBjb3ZlcmFnZSwgbmV1dHJhbCwgc3RhYmxlLCBhbmQgYXBwcm9wcmlhdGVseSBpbGx1c3RyYXRlZCAod2hlbiBwb3NzaWJsZSkuIFByYWN0aWNhbGx5IHNwZWFraW5nLCBhIHBvdGVudGlhbCBHb29kIEFydGljbGUgc2hvdWxkIGxvb2sgYW5kIHNvdW5kIGxpa2Ugb3RoZXIgd2VsbC1kZXZlbG9wZWQgV2lraXBlZGlhIGFydGljbGVzLCBhbmQgaXQgc2hvdWxkIHByb3ZpZGUgYSBzb2xpZCwgd2VsbC1iYWxhbmNlZCB0cmVhdG1lbnQgb2YgaXRzIHN1YmplY3QuPC9wPlwiXG4gICMgICAgICAgICBcIjxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IGdvb2QuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLCBhbmQgdGhvc2Ugd3JpdHRlbiBieSBzdHVkZW50IGVkaXRvcnMgd2hvIGFyZSBhbHJlYWR5IGV4cGVyaWVuY2VkLCBzdHJvbmcgd3JpdGVycy48L3A+XCJcbiAgIyAgICAgICBdXG4gICMgICAgIH1cbiAgIyAgIF1cbiAgIyAgIGlucHV0czogW11cbiAgIyB9XG4gIHtcbiAgICBpZDogXCJkeWtcIlxuICAgIHRpdGxlOiAnRFlLIHByb2Nlc3MnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgRFlLIHByb2Nlc3MnXG4gICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgRFlLIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5BZHZhbmNlZCBzdHVkZW50c+KAmSBhcnRpY2xlcyBtYXkgcXVhbGlmeSBmb3Igc3VibWlzc2lvbiB0byBEaWQgWW91IEtub3cgKERZSyksIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBmZWF0dXJpbmcgbmV3IGNvbnRlbnQuIFRoZSBnZW5lcmFsIGNyaXRlcmlhIGZvciBEWUsgZWxpZ2liaWxpdHkgYXJlIHRoYXQgYW4gYXJ0aWNsZSBpcyBsYXJnZXIgdGhhbiAxLDUwMCBjaGFyYWN0ZXJzIG9mIG9yaWdpbmFsLCB3ZWxsLXNvdXJjZWQgY29udGVudCAoYWJvdXQgZm91ciBwYXJhZ3JhcGhzKSBhbmQgdGhhdCBpdCBoYXMgYmVlbiBjcmVhdGVkIG9yIGV4cGFuZGVkIChieSBhIGZhY3RvciBvZiA1eCkgd2l0aGluIHRoZSBsYXN0IHNldmVuIGRheXMuPC9wPlwiXG4gICAgICAgICAgXCI8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBidXQgaXQgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIDYgaG91cnMgaW4gdGhlIHNwb3RsaWdodC48L3A+XCJcbiAgICAgICAgICBcIjxwPldlIHN0cm9uZ2x5IHJlY29tbWVuZCB0cnlpbmcgZm9yIERZSyBzdGF0dXMgeW91cnNlbGYgYmVmb3JlaGFuZCwgb3Igd29ya2luZyB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW5zIHRvIGhlbHAgeW91ciBzdHVkZW50cyBuYXZpZ2F0ZSB0aGUgRFlLIHByb2Nlc3Mgc21vb3RobHkuIElmIHlvdXIgc3R1ZGVudHMgYXJlIHdvcmtpbmcgb24gYSByZWxhdGVkIHNldCBvZiBhcnRpY2xlcywgaXQgY2FuIGhlbHAgdG8gY29tYmluZSBtdWx0aXBsZSBhcnRpY2xlIG5vbWluYXRpb25zIGludG8gYSBzaW5nbGUgaG9vazsgdGhpcyBoZWxwcyBrZWVwIHlvdXIgc3R1ZGVudHPigJkgd29yayBmcm9tIHN3YW1waW5nIHRoZSBwcm9jZXNzIG9yIGFudGFnb25pemluZyB0aGUgZWRpdG9ycyB3aG8gbWFpbnRhaW4gaXQuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJnYVwiXG4gICAgdGl0bGU6ICdHb29kIEFydGljbGUgcHJvY2VzcydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBHb29kIEFydGljbGUgcHJvY2VzcydcbiAgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGlzIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbj9cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5XZWxsLWRldmVsb3BlZCBhcnRpY2xlcyB0aGF0IGhhdmUgcGFzc2VkIGEgR29vZCBBcnRpY2xlIChHQSkgcmV2aWV3IGFyZSBhIHN1YnN0YW50aWFsIGFjaGlldmVtZW50IGluIHRoZWlyIG93biByaWdodCwgYW5kIGNhbiBhbHNvIHF1YWxpZnkgZm9yIERZSy4gVGhpcyBwZWVyIHJldmlldyBwcm9jZXNzIGludm9sdmVzIGNoZWNraW5nIGEgcG9saXNoZWQgYXJ0aWNsZSBhZ2FpbnN0IFdpa2lwZWRpYSdzIEdBIGNyaXRlcmlhOiBhcnRpY2xlcyBtdXN0IGJlIHdlbGwtd3JpdHRlbiwgdmVyaWZpYWJsZSBhbmQgd2VsbC1zb3VyY2VkIHdpdGggbm8gb3JpZ2luYWwgcmVzZWFyY2gsIGJyb2FkIGluIGNvdmVyYWdlLCBuZXV0cmFsLCBzdGFibGUsIGFuZCBhcHByb3ByaWF0ZWx5IGlsbHVzdHJhdGVkICh3aGVuIHBvc3NpYmxlKS4gUHJhY3RpY2FsbHkgc3BlYWtpbmcsIGEgcG90ZW50aWFsIEdvb2QgQXJ0aWNsZSBzaG91bGQgbG9vayBhbmQgc291bmQgbGlrZSBvdGhlciB3ZWxsLWRldmVsb3BlZCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGFuZCBpdCBzaG91bGQgcHJvdmlkZSBhIHNvbGlkLCB3ZWxsLWJhbGFuY2VkIHRyZWF0bWVudCBvZiBpdHMgc3ViamVjdC48L3A+XCJcbiAgICAgICAgICBcIjxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IGdvb2QuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLCBhbmQgdGhvc2Ugd3JpdHRlbiBieSBzdHVkZW50IGVkaXRvcnMgd2hvIGFyZSBhbHJlYWR5IGV4cGVyaWVuY2VkLCBzdHJvbmcgd3JpdGVycy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImdyYWRpbmdcIlxuICAgIHRpdGxlOiAnR3JhZGluZydcbiAgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgdGhlIFdpa2lwZWRpYSBhc3NpZ25tZW50IGJlIGRldGVybWluZWQ/XCJcbiAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcsIGV0Yy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJvdmVydmlld1wiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQWJvdXQgdGhlIGNvdXJzZSdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzgnIHN0eWxlPSd3aWR0aDoxMDAlOyc+PC90ZXh0YXJlYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIFxuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvbnRlbnQiLCJXaXphcmRDb3Vyc2VJbmZvID0gXG5cbiAgIyBSRVNFQVJDSCBBTkQgV1JJVEUgQSBXSUtJUEVESUEgQVJUSUNMRVxuICByZXNlYXJjaHdyaXRlOiBcbiAgICB0aXRsZTogXCJSZXNlYXJjaCBhbmQgd3JpdGUgYSBXaWtpcGVkaWEgYXJ0aWNsZVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiV29ya2luZyBpbmRpdmlkdWFsbHkgb3IgaW4gc21hbGwgdGVhbXMgd2l0aCB5b3VyIGd1aWRhbmNlLCBzdHVkZW50cyBjaG9vc2UgY291cnNlLXJlbGF0ZWQgdG9waWNzIHRoYXQgYXJlIG5vdCB3ZWxsLWNvdmVyZWQgb24gV2lraXBlZGlhLiBBZnRlciBhc3Nlc3NpbmcgV2lraXBlZGlhJ3MgY292ZXJhZ2UsIHN0dWRlbnRzIHJlc2VhcmNoIHRvcGljcyB0byBmaW5kIGhpZ2gtcXVhbGl0eSBzZWNvbmRhcnkgc291cmNlcywgdGhlbiBwcm9wb3NlIGFuIG91dGxpbmUgZm9yIGhvdyB0aGUgdG9waWMgb3VnaHQgdG8gYmUgY292ZXJlZC4gVGhleSBkcmFmdCB0aGVpciBhcnRpY2xlcywgZ2l2ZSBhbmQgcmVzcG9uZCB0byBwZWVyIGZlZWRiYWNrLCB0YWtlIHRoZWlyIHdvcmsgbGl2ZSBvbiBXaWtpcGVkaWEsIGFuZCBrZWVwIGltcHJvdmluZyB0aGVpciBhcnRpY2xlcyB1bnRpbCB0aGUgZW5kIG9mIHRoZSB0ZXJtLiBBbG9uZyB0aGUgd2F5LCBzdHVkZW50cyBtYXkgd29yayB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYSBlZGl0b3JzIHdobyBjYW4gb2ZmZXIgY3JpdGljYWwgZmVlZGJhY2sgYW5kIGhlbHAgbWFrZSBzdXJlIGFydGljbGVzIG1lZXQgV2lraXBlZGlhJ3Mgc3RhbmRhcmRzIGFuZCBzdHlsZSBjb252ZW50aW9ucy4gU3R1ZGVudHMgd2hvIGRvIGdyZWF0IHdvcmsgbWF5IGV2ZW4gaGF2ZSB0aGVpciBhcnRpY2xlcyBmZWF0dXJlZCBvbiBXaWtpcGVkaWEncyBtYWluIHBhZ2UuIFNvbGlkIGFydGljbGVzIHdpbGwgaGVscCBpbmZvcm0gdGhvdXNhbmRzIG9mIGZ1dHVyZSByZWFkZXJzIGFib3V0IHRoZSBzZWxlY3RlZCB0b3BpYy5cIlxuICAgICAgXCJPcHRpb25hbGx5LCBzdHVkZW50cyBtYXkgYmUgYXNrZWQgdG8gd3JpdGUgYSByZWZsZWN0aXZlIHBhcGVyIGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlLCBwcmVzZW50IHRoZWlyIGNvbnRyaWJ1dGlvbnMgaW4gY2xhc3MsIG9yIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgYWJvdXQgdGhlaXIgdG9waWNzIGluIGEgc2VwYXJhdGUgZXNzYXkuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIxMiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiR3JhZHVhdGUgU3R1ZGVudHNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWR1YXRlc1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gY291cnNlc1wiXG4gICAgICBcImxhcmdlIHN1cnZleSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIFNPVVJDRS1DRU5URVJFRCBBRERJVElPTlNcbiAgc291cmNlY2VudGVyZWQ6IFxuICAgIHRpdGxlOiBcIlNvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHJlYWQgV2lraXBlZGlhIGFydGljbGVzIGluIGEgc2VsZi1zZWxlY3RlZCBzdWJqZWN0IGFyZWEgdG8gaWRlbnRpZnkgYXJ0aWNsZXMgaW4gbmVlZCBvZiByZXZpc2lvbiBvciBpbXByb3ZlbWVudCwgc3VjaCBhcyB0aG9zZSB3aXRoIFxcXCJjaXRhdGlvbiBuZWVkZWRcXFwiIHRhZ3MuIFN0dWRlbnRzIHdpbGwgZmluZCByZWxpYWJsZSBzb3VyY2VzIHRvIHVzZSBhcyByZWZlcmVuY2VzIGZvciB1bmNpdGVkIGNvbnRlbnQuIFRoaXMgYXNzaWdubWVudCBpbmNsdWRlcyBhIHBlcnN1YXNpdmUgZXNzYXkgaW4gd2hpY2ggc3R1ZGVudHMgbWFrZSBhIGNhc2UgZm9yIHRoZWlyIHN1Z2dlc3RlZCBjaGFuZ2VzLCB3aHkgdGhleSBiZWxpZXZlIHRoZXkgYXJlIHF1YWxpZmllZCB0byBtYWtlIHRob3NlIGNoYW5nZXMsIGFuZCB3aHkgdGhlaXIgc2VsZWN0ZWQgc291cmNlcyBwcm92aWRlIHN1cHBvcnQuIEFmdGVyIG1ha2luZyB0aGVpciBjb250cmlidXRpb25zLCBzdHVkZW50cyByZWZsZWN0IG9uIHRoZWlyIHdvcmsgd2l0aCBhIGZvcm1hbCBwYXBlciwgYW5kIGRpc2N1c3Mgd2hldGhlciB0aGV5J3ZlIGFjY29tcGxpc2hlZCB0aGVpciBzdGF0ZWQgZ29hbHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYXJnZSBjbGFzc2VzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgRklORCBBTkQgRklYIEVSUk9SU1xuICBmaW5kZml4OiBcbiAgICB0aXRsZTogXCJGaW5kIGFuZCBmaXggZXJyb3JzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gZmluZCBhbiBhcnRpY2xlIGFib3V0IGEgY291cnNlLXJlbGF0ZWQgdG9waWMgd2l0aCB3aGljaCB0aGV5IGFyZSBleHRyZW1lbHkgZmFtaWxpYXIgdGhhdCBoYXMgc29tZSBtaXN0YWtlcy4gU3R1ZGVudHMgdGFrZSB3aGF0IHRoZXkga25vdyBhYm91dCB0aGUgdG9waWMsIGZpbmQgZmFjdHVhbCBlcnJvcnMgYW5kIG90aGVyIHN1YnN0YW50aXZlIG1pc3Rha2VzLCBhbmQgY29ycmVjdCB0aG9zZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIElkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVxuICBwbGFnaWFyaXNtOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHNlYXJjaCB0aHJvdWdoIFdpa2lwZWRpYSBhcnRpY2xlcyB0byBmaW5kIGluc3RhbmNlcyBvZiBjbG9zZSBwYXJhcGhyYXNpbmcgb3IgcGxhZ2lhcmlzbSwgdGhlbiByZXdvcmQgdGhlIGluZm9ybWF0aW9uIGluIHRoZWlyIG93biBsYW5ndWFnZSB0byBiZSBhcHByb3ByaWF0ZSBmb3IgV2lraXBlZGlhLiBJbiB0aGlzIGFzc2lnbm1lbnQsIHN0dWRlbnRzIGdhaW4gYSBkZWVwZXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IHBsYWdpYXJpc20gaXMgYW5kIGhvdyB0byBhdm9pZCBpdC5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjVFJBTlNMQVRFIEFOIEFSVElDTEUgVE8gRU5HTElTSFxuICB0cmFuc2xhdGU6IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiVGhpcyBpcyBhIHByYWN0aWNhbCBhc3NpZ25tZW50IGZvciBsYW5ndWFnZSBpbnN0cnVjdG9ycy4gU3R1ZGVudHMgc2VsZWN0IGEgV2lraXBlZGlhIGFydGljbGUgaW4gdGhlIGxhbmd1YWdlIHRoZXkgYXJlIHN0dWR5aW5nLCBhbmQgdHJhbnNsYXRlIGl0IGludG8gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBTdHVkZW50cyBzaG91bGQgc3RhcnQgd2l0aCBoaWdoLXF1YWxpdHkgYXJ0aWNsZXMgd2hpY2ggYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBUaGlzIGFzc2lnbm1lbnQgcHJvdmlkZXMgcHJhY3RpY2FsIHRyYW5zbGF0aW9uIGFkdmljZSB3aXRoIHRoZSBpbmNlbnRpdmUgb2YgcmVhbCBwdWJsaWMgc2VydmljZSwgYXMgc3R1ZGVudHMgZXhwYW5kIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGN1bHR1cmUgb24gV2lraXBlZGlhLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNisgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhbmd1YWdlIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHRyYW5zbGF0aW5nIDxlbT5mcm9tPC9lbT4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlIHRvIHRoZSBsYW5ndWFnZSB0aGV5J3JlIHN0dWR5aW5nXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjQ09QWSBFRElUSU5HXG4gIGNvcHllZGl0OiBcbiAgICB0aXRsZTogXCJDb3B5ZWRpdFwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGNvcHllZGl0IFdpa2lwZWRpYSBhcnRpY2xlcywgZW5nYWdpbmcgZWRpdG9ycyBpbiBjb252ZXJzYXRpb24gYWJvdXQgdGhlaXIgd3JpdGluZyBhbmQgaW1wcm92aW5nIHRoZSBjbGFyaXR5IG9mIHRoZSBsYW5ndWFnZSBvZiB0aGUgbWF0ZXJpYWwuIFN0dWRlbnRzIGxlYXJuIHRvIHdyaXRlIGluIGRpZmZlcmVudCB2b2ljZXMgZm9yIGRpZmZlcmVudCBhdWRpZW5jZXMuIEluIGxlYXJuaW5nIGFib3V0IHRoZSBzcGVjaWZpYyB2b2ljZSBvbiBXaWtpcGVkaWEsIHRoZXkgbGVhcm4gYWJvdXQgdGhlIOKAnGF1dGhvcml0YXRpdmXigJ0gdm9pY2UgYW5kIGhvdyBpdHMgdG9uZSBjYW4gY29udmluY2UsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgaXMgcXVlc3Rpb25hYmxlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiRW5nbGlzaCBncmFtbWFyIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgc3Ryb25nIHdyaXRpbmcgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjRVZBTFVBVEUgQVJUSUNMRVNcbiAgZXZhbHVhdGU6IFxuICAgIHRpdGxlOiBcIkV2YWx1YXRlIGFydGljbGVzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJGaXJzdCwgc3R1ZGVudHMgd3JpdGUgYSByZXBvcnQgYW5hbHl6aW5nIHRoZSBzdGF0ZSBvZiBXaWtpcGVkaWEgYXJ0aWNsZXMgb24gY291cnNlLXJlbGF0ZWQgdG9waWNzIHdpdGggYW4gZXllIHRvd2FyZCBmdXR1cmUgcmV2aXNpb25zLiBUaGlzIGVuY291cmFnZXMgYSBjcml0aWNhbCByZWFkaW5nIG9mIGJvdGggY29udGVudCBhbmQgZm9ybS4gVGhlbiwgdGhlIHN0dWRlbnRzIGVkaXQgYXJ0aWNsZXMgaW4gc2FuZGJveGVzIHdpdGggZmVlZGJhY2sgZnJvbSB0aGUgcHJvZmVzc29yLCBjYXJlZnVsbHkgc2VsZWN0aW5nIGFuZCBhZGRpbmcgcmVmZXJlbmNlcyB0byBpbXByb3ZlIHRoZSBhcnRpY2xlIGJhc2VkIG9uIHRoZWlyIGNyaXRpY2FsIGVzc2F5cy4gRmluYWxseSwgdGhleSBjb21wb3NlIGEgc2VsZi1hc3Nlc3NtZW50IGV2YWx1YXRpbmcgdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjUgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJDbGFzc2VzIHdpdGggZmV3ZXIgdGhhbiAzMCBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2Ugc3VydmV5IGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgQUREIElNQUdFUyBPUiBNVUxUSU1FRElBXG4gIG11bHRpbWVkaWE6IFxuICAgIHRpdGxlOiBcIiBBZGQgaW1hZ2VzIG9yIG11bHRpbWVkaWFcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIklmIHlvdXIgc3R1ZGVudHMgYXJlIGFkZXB0IGF0IG1lZGlhLCB0aGlzIGNhbiBiZSBhIGdyZWF0IHdheSBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhIGluIGEgbm9uLXRleHR1YWwgd2F5LiBJbiB0aGUgcGFzdCwgc3R1ZGVudHMgaGF2ZSBwaG90b2dyYXBoZWQgbG9jYWwgbW9udW1lbnRzIHRvIGlsbHVzdHJhdGUgYXJ0aWNsZXMsIGRlc2lnbmVkIGluZm9ncmFwaGljcyB0byBpbGx1c3RyYXRlIGNvbmNlcHRzLCBvciBjcmVhdGVkIHZpZGVvcyB0aGF0IGRlbW9uc3RyYXRlZCBhdWRpby12aXN1YWxseSB3aGF0IGFydGljbGVzIGRlc2NyaWJlIGluIHdvcmRzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgc3R1ZHlpbmcgcGhvdG9ncmFwaHksIHZpZGVvZ3JhcGh5LCBvciBncmFwaGljIGRlc2lnblwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBtZWRpYSBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ291cnNlSW5mbyIsIldpemFyZFN0ZXBJbnB1dHMgPVxuXG5cbiAgaW50cm86IFxuICAgIHRlYWNoZXI6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBuYW1lJ1xuICAgICAgaWQ6ICd0ZWFjaGVyJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIGNvdXJzZV9uYW1lOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0NvdXJzZSBuYW1lJ1xuICAgICAgaWQ6ICdjb3Vyc2VfbmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgc2Nob29sOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICBpZDogJ3NjaG9vbCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgc3ViamVjdDpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdTdWJqZWN0J1xuICAgICAgaWQ6ICdzdWJqZWN0J1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBzdHVkZW50czpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdBcHByb3hpbWF0ZSBudW1iZXIgb2Ygc3R1ZGVudHMnXG4gICAgICBpZDogJ3N0dWRlbnRzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIGluc3RydWN0b3JfdXNlcm5hbWU6XG4gICAgICBsYWJlbDogJ1VzZXJuYW1lICh0ZW1wb3JhcnkpJ1xuICAgICAgaWQ6ICdpbnN0cnVjdG9yX3VzZXJuYW1lJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIHdpemFyZF9zdGFydF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuICAgICAgdmFsdWU6ICcnXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICBcbiAgXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIFxuXG4gICAgZXZhbHVhdGU6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZXZhbHVhdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRXZhbHVhdGUgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuXG4gICAgXG4gICAgbXVsdGltZWRpYTpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdtdWx0aW1lZGlhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0FkZCBpbWFnZXMgJiBtdWx0aW1lZGlhJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuXG4gICAgc291cmNlY2VudGVyZWQ6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnc291cmNlY2VudGVyZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU291cmNlLWNlbnRlcmVkIGFkZGl0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gIFxuXG4gICAgY29weWVkaXQ6IFxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHllZGl0J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuXG4gICAgZmluZGZpeDpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdmaW5kZml4J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0ZpbmQgYW5kIGZpeCBlcnJvcnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuXG4gICAgXG4gICAgcGxhZ2lhcmlzbTpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdwbGFnaWFyaXNtJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lkZW50aWZ5IGFuZCBmaXggcGxhZ2lhcmlzbSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICBcblxuICAgIHNvbWV0aGluZ19lbHNlOlxuICAgICAgdHlwZTogJ2xpbmsnXG4gICAgICBocmVmOiAnbWFpbHRvOmNvbnRhY3RAd2lraWVkdS5vcmcnXG4gICAgICBpZDogJ3NvbWV0aGluZ19lbHNlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0EgZGlmZmVyZW50IGFzc2lnbm1lbnQ/IEdldCBpbiB0b3VjaCBoZXJlLidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogXCJIYXZlIGFub3RoZXIgaWRlYSBmb3IgaW5jb3Jwb3JhdGluZyBXaWtpcGVkaWEgaW50byB5b3VyIGNsYXNzPyBXZSd2ZSBmb3VuZCB0aGF0IHRoZXNlIGFzc2lnbm1lbnRzIHdvcmsgd2VsbCwgYnV0IHRoZXkgYXJlbid0IHRoZSBvbmx5IHdheSB0byBkbyBpdC4gR2V0IGluIHRvdWNoLCBhbmQgd2UgY2FuIHRhbGsgdGhpbmdzIHRocm91Z2g6IDxhIHN0eWxlPSdjb2xvcjojNTA1YTdmOycgaHJlZj0nbWFpbHRvOmNvbnRhY3RAd2lraWVkdS5vcmcnPmNvbnRhY3RAd2lraWVkdS5vcmc8L2E+XCJcblxuXG4gIGxlYXJuaW5nX2Vzc2VudGlhbHM6IFxuICAgIGNyZWF0ZV91c2VyOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NyZWF0ZV91c2VyJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JlYXRlIHVzZXIgYWNjb3VudCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgXG4gICAgZW5yb2xsOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2Vucm9sbCdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0Vucm9sbCB0byB0aGUgY291cnNlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgb25saW5lIHRyYWluaW5nJ1xuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICAgIGludHJvZHVjZV9hbWJhc3NhZG9yczpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbnRyb2R1Y2VfYW1iYXNzYWRvcnMnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnSW50cm9kdWNlIFdpa2lwZWRpYSBBbWJhc3NhZG9ycyBJbnZvbHZlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICBcbiAgICAjIGluY2x1ZGVfY29tcGxldGlvbjpcbiAgICAjICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICMgICBpZDogJ2luY2x1ZGVfY29tcGxldGlvbidcbiAgICAjICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgIyAgIGxhYmVsOiAnSW5jbHVkZSBDb21wbGV0aW9uIG9mIHRoaXMgQXNzaWdubWVudCBhcyBQYXJ0IG9mIHRoZSBTdHVkZW50c1xcJ3MgR3JhZGUnXG4gICAgIyAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICAgIHRyYWluaW5nX2dyYWRlZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAndHJhaW5pbmdfZ3JhZGVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgdHJhaW5pbmcgd2lsbCBiZSBncmFkZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICB0cmFpbmluZ19ub3RfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ub3RfZ3JhZGVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgdHJhaW5pbmcgd2lsbCBub3QgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIFxuICBcblxuICBnZXR0aW5nX3N0YXJ0ZWQ6IFxuICAgIGNyaXRpcXVlX2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NyaXRpcXVlX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdDcml0aXF1ZSBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG5cbiAgICBhZGRfdG9fYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnYWRkX3RvX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuXG4gICAgY29weV9lZGl0X2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHlfZWRpdF9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgXG4gICAgaWxsdXN0cmF0ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbGx1c3RyYXRlX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSWxsdXN0cmF0ZSBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICBcblxuICBjaG9vc2luZ19hcnRpY2xlczogXG4gICAgcHJlcGFyZV9saXN0OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdwcmVwYXJlX2xpc3QnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3RzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzU3ViQ2hvaWNlOiB0cnVlXG4gICAgICBcbiAgICBzdHVkZW50c19leHBsb3JlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcblxuICAgIHJlcXVlc3RfaGVscDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVxdWVzdF9oZWxwJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIG9yIGV2YXVsYXRpbmcgYXJ0aWNsZSBjaG9pY2VzPydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGNvbmRpdGlvbmFsX2xhYmVsOiBcbiAgICAgICAgcHJlcGFyZV9saXN0OiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIGFydGljbGVzP1wiXG4gICAgICAgIHN0dWRlbnRzX2V4cGxvcmU6IFwiV291bGQgeW91IGxpa2UgaGVscCBldmFsdWF0aW5nIHN0dWRlbnQgY2hvaWNlcz9cIlxuICAgICAgXG5cblxuICByZXNlYXJjaF9wbGFubmluZzogXG4gICAgY3JlYXRlX291dGxpbmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NyZWF0ZV9vdXRsaW5lJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RyYWRpdGlvbmFsIG91dGxpbmUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiVHJhZGl0aW9uYWwgb3V0bGluZVwiXG4gICAgICAgIGNvbnRlbnQ6IFwiRm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhbiBvdXRsaW5lIHRoYXQgcmVmbGVjdHMgdGhlIGltcHJvdmVtZW50cyB0aGV5IHBsYW4gdG8gbWFrZSwgYW5kIHRoZW4gcG9zdCBpdCB0byB0aGUgYXJ0aWNsZSdzIHRhbGsgcGFnZS4gVGhpcyBpcyBhIHJlbGF0aXZlbHkgZWFzeSB3YXkgdG8gZ2V0IHN0YXJ0ZWQuXCJcbiAgICBcbiAgICB3cml0ZV9sZWFkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3cml0ZV9sZWFkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBsZWFkIHNlY3Rpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiV2lraXBlZGlhIGxlYWQgc2VjdGlvblwiXG4gICAgICAgIGNvbnRlbnQ6XG4gICAgICAgICAgXCI8cD5Gb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGEgd2VsbC1iYWxhbmNlZCBzdW1tYXJ5IG9mIGl0cyBmdXR1cmUgc3RhdGUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uLiBUaGUgaWRlYWwgbGVhZCBzZWN0aW9uIGV4ZW1wbGlmaWVzIFdpa2lwZWRpYSdzIHN1bW1hcnkgc3R5bGUgb2Ygd3JpdGluZzogaXQgYmVnaW5zIHdpdGggYSBzaW5nbGUgc2VudGVuY2UgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcGxhY2VzIGl0IGluIGNvbnRleHQsIGFuZCB0aGVuIOKAlCBpbiBvbmUgdG8gZm91ciBwYXJhZ3JhcGhzLCBkZXBlbmRpbmcgb24gdGhlIGFydGljbGUncyBzaXplIOKAlCBpdCBvZmZlcnMgYSBjb25jaXNlIHN1bW1hcnkgb2YgdG9waWMuIEEgZ29vZCBsZWFkIHNlY3Rpb24gc2hvdWxkIHJlZmxlY3QgdGhlIG1haW4gdG9waWNzIGFuZCBiYWxhbmNlIG9mIGNvdmVyYWdlIG92ZXIgdGhlIHdob2xlIGFydGljbGUuPC9wPlxuICAgICAgICAgIDxwPk91dGxpbmluZyBhbiBhcnRpY2xlIHRoaXMgd2F5IGlzIGEgbW9yZSBjaGFsbGVuZ2luZyBhc3NpZ25tZW50IOKAlCBhbmQgd2lsbCByZXF1aXJlIG1vcmUgd29yayB0byBldmFsdWF0ZSBhbmQgcHJvdmlkZSBmZWVkYmFjayBmb3IuIEhvd2V2ZXIsIGl0IGNhbiBiZSBtb3JlIGVmZmVjdGl2ZSBmb3IgdGVhY2hpbmcgdGhlIHByb2Nlc3Mgb2YgcmVzZWFyY2gsIHdyaXRpbmcsIGFuZCByZXZpc2lvbi4gU3R1ZGVudHMgd2lsbCByZXR1cm4gdG8gdGhpcyBsZWFkIHNlY3Rpb24gYXMgdGhleSBnbywgdG8gZ3VpZGUgdGhlaXIgd3JpdGluZyBhbmQgdG8gcmV2aXNlIGl0IHRvIHJlZmxlY3QgdGhlaXIgaW1wcm92ZWQgdW5kZXJzdGFuZGluZyBvZiB0aGUgdG9waWMgYXMgdGhlaXIgcmVzZWFyY2ggcHJvZ3Jlc3Nlcy4gVGhleSB3aWxsIHRhY2tsZSBXaWtpcGVkaWEncyBlbmN5Y2xvcGVkaWMgc3R5bGUgZWFybHkgb24sIGFuZCB0aGVpciBvdXRsaW5lIGVmZm9ydHMgd2lsbCBiZSBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZWlyIGZpbmFsIHdvcmsuPC9wPlwiXG4gICAgICAgIFxuXG5cbiAgZHJhZnRzX21haW5zcGFjZTogXG4gICAgd29ya19saXZlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBsaXZlIGZyb20gdGhlIHN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICBcbiAgICBzYW5kYm94OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzYW5kYm94J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RyYWZ0IGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICBcblxuICBwZWVyX2ZlZWRiYWNrOiBcbiAgICBwZWVyX3Jldmlld3M6XG4gICAgICB0eXBlOiAncmFkaW9Hcm91cCdcbiAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgbGFiZWw6ICcnXG4gICAgICB2YWx1ZTogJzInXG4gICAgICBzZWxlY3RlZDogMVxuICAgICAgb3B0aW9uczogW1xuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDBcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMSdcbiAgICAgICAgICB2YWx1ZTogJzEnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAxXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzInXG4gICAgICAgICAgdmFsdWU6ICcyJ1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAyXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzMnXG4gICAgICAgICAgdmFsdWU6ICczJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogM1xuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICc0J1xuICAgICAgICAgIHZhbHVlOiAnNCdcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDRcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNSdcbiAgICAgICAgICB2YWx1ZTogJzUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICBcbiAgXG5cbiAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czogXG4gICAgY2xhc3NfYmxvZzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfYmxvZydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDbGFzcyBibG9nIG9yIGRpc2N1c3Npb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdDbGFzcyBibG9nIG9yIGNsYXNzIGRpc2N1c3Npb24nXG4gICAgICAgIGNvbnRlbnQ6ICdTdHVkZW50cyBrZWVwIGEgcnVubmluZyBibG9nIGFib3V0IHRoZWlyIGV4cGVyaWVuY2VzLiBHaXZpbmcgdGhlbSBwcm9tcHRzIGV2ZXJ5IHdlZWsgb3IgdHdvLCBzdWNoIGFzIOKAnFRvIHdoYXQgZXh0ZW50IGFyZSB0aGUgZWRpdG9ycyBvbiBXaWtpcGVkaWEgYSBzZWxmLXNlbGVjdGluZyBncm91cCBhbmQgd2h5P+KAnSB3aWxsIGhlbHAgdGhlbSB0aGluayBhYm91dCB0aGUgbGFyZ2VyIGlzc3VlcyBzdXJyb3VuZGluZyB0aGlzIG9ubGluZSBlbmN5Y2xvcGVkaWEgY29tbXVuaXR5LiBJdCB3aWxsIGFsc28gZ2l2ZSB5b3UgbWF0ZXJpYWwgYm90aCBvbiB0aGUgd2lraSBhbmQgb2ZmIHRoZSB3aWtpIHRvIGdyYWRlLiBJZiB5b3UgaGF2ZSB0aW1lIGluIGNsYXNzLCB0aGVzZSBkaXNjdXNzaW9ucyBjYW4gYmUgcGFydGljdWxhcmx5IGNvbnN0cnVjdGl2ZSBpbiBwZXJzb24uJ1xuICAgICAgXG4gICAgY2xhc3NfcHJlc2VudGF0aW9uOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdJbi1jbGFzcyBwcmVzZW50YXRpb24gb2YgV2lraXBlZGlhIHdvcmsnXG4gICAgICAgIGNvbnRlbnQ6IFwiRWFjaCBzdHVkZW50IG9yIGdyb3VwIHByZXBhcmVzIGEgc2hvcnQgcHJlc2VudGF0aW9uIGZvciB0aGUgY2xhc3MsIGV4cGxhaW5pbmcgd2hhdCB0aGV5IHdvcmtlZCBvbiwgd2hhdCB3ZW50IHdlbGwgYW5kIHdoYXQgZGlkbid0LCBhbmQgd2hhdCB0aGV5IGxlYXJuZWQuIFRoZXNlIHByZXNlbnRhdGlvbnMgY2FuIG1ha2UgZXhjZWxsZW50IGZvZGRlciBmb3IgY2xhc3MgZGlzY3Vzc2lvbnMgdG8gcmVpbmZvcmNlIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgZ29hbHMuXCJcbiAgICAgIFxuICAgIHJlZmxlY3RpdmVfZXNzYXk6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlZmxlY3RpdmVfZXNzYXknXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICAgICBjb250ZW50OiBcIkFzayBzdHVkZW50cyB0byB3cml0ZSBhIHNob3J0IHJlZmxlY3RpdmUgZXNzYXkgb24gdGhlaXIgZXhwZXJpZW5jZXMgdXNpbmcgV2lraXBlZGlhLiBUaGlzIHdvcmtzIHdlbGwgZm9yIGJvdGggc2hvcnQgYW5kIGxvbmcgV2lraXBlZGlhIHByb2plY3RzLiBBbiBpbnRlcmVzdGluZyBpdGVyYXRpb24gb2YgdGhpcyBpcyB0byBoYXZlIHN0dWRlbnRzIHdyaXRlIGEgc2hvcnQgdmVyc2lvbiBvZiB0aGUgZXNzYXkgYmVmb3JlIHRoZXkgYmVnaW4gZWRpdGluZyBXaWtpcGVkaWEsIG91dGxpbmluZyB0aGVpciBleHBlY3RhdGlvbnMsIGFuZCB0aGVuIGhhdmUgdGhlbSByZWZsZWN0IG9uIHdoZXRoZXIgb3Igbm90IHRoZXkgbWV0IHRob3NlIGV4cGVjdGF0aW9ucyBkdXJpbmcgdGhlIGFzc2lnbm1lbnQuXCJcbiAgICAgIFxuICAgIHBvcnRmb2xpbzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncG9ydGZvbGlvJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgICAgY29udGVudDogXCJTdHVkZW50cyBvcmdhbml6ZSB0aGVpciBXaWtpcGVkaWEgd29yayBpbnRvIGEgcG9ydGZvbGlvLCBpbmNsdWRpbmcgYSBuYXJyYXRpdmUgb2YgdGhlIGNvbnRyaWJ1dGlvbnMgdGhleSBtYWRlIOKAlCBhbmQgaG93IHRoZXkgd2VyZSByZWNlaXZlZCwgYW5kIHBvc3NpYmx5IGNoYW5nZWQsIGJ5IG90aGVyIFdpa2lwZWRpYW5zIOKAlCBhbmQgbGlua3MgdG8gdGhlaXIga2V5IGVkaXRzLiBDb21wb3NpbmcgdGhpcyBwb3J0Zm9saW8gd2lsbCBoZWxwIHN0dWRlbnRzIHRoaW5rIG1vcmUgZGVlcGx5IGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlcywgYW5kIGFsc28gcHJvdmlkZXMgYSBsZW5zIHRocm91Z2ggd2hpY2ggdG8gdW5kZXJzdGFuZCDigJQgYW5kIGdyYWRlIOKAlCB0aGVpciB3b3JrLlwiXG4gICAgXG4gICAgb3JpZ2luYWxfcGFwZXI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgICAgY29udGVudDogXCJJbiBjb3Vyc2VzIHRoYXQgZW1waGFzaXplIHRyYWRpdGlvbmFsIHJlc2VhcmNoIHNraWxscyBhbmQgdGhlIGRldmVsb3BtZW50IG9mIG9yaWdpbmFsIGlkZWFzIHRocm91Z2ggYSB0ZXJtIHBhcGVyLCBXaWtpcGVkaWEncyBwb2xpY3kgb2YgXFxcIm5vIG9yaWdpbmFsIHJlc2VhcmNoXFxcIiBtYXkgYmUgdG9vIHJlc3RyaWN0aXZlLiBNYW55IGluc3RydWN0b3JzIHBhaXIgV2lraXBlZGlhIHdyaXRpbmcgd2l0aCBjb21wbGVtZW50YXJ5IGFuYWx5dGljYWwgcGFwZXI7IHN0dWRlbnRz4oCZIFdpa2lwZWRpYSBhcnRpY2xlcyBhcyBhIGxpdGVyYXR1cmUgcmV2aWV3LCBhbmQgdGhlIHN0dWRlbnRzIGdvIG9uIHRvIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgaW4gdGhlIG9mZmxpbmUgYW5hbHl0aWNhbCBwYXBlci5cIlxuICAgICAgXG4gICAgbm9uZV9vZl9hYm92ZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbm9uZV9vZl9hYm92ZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdOb25lIG9mIHRoZSBhYm92ZSdcbiAgICAgIGV4Y2x1c2l2ZTogdHJ1ZVxuXG4gIGR5azpcbiAgICBkeWs6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2R5aydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEaWQgWW91IEtub3c/J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gIGdhOiBcbiAgICBnYTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZ2EnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnR29vZCBBcnRpY2xlIG5vbWluYXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gIGdyYWRpbmc6IFxuICAgIGxlYXJuaW5nX2Vzc2VudGlhbHM6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBlc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdsZWFybmluZ19lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6IDVcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgICAgYXNzaWdubWVudHM6IFtdXG4gICAgXG4gICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgIHZhbHVlOiAwXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBjaG9vc2luZ19hcnRpY2xlczpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBhcnRpY2xlcydcbiAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogMFxuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgcmVzZWFyY2hfcGxhbm5pbmc6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW4gcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6IDBcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIGRyYWZ0c19tYWluc3BhY2U6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICBpZDogJ2RyYWZ0c19tYWluc3BhY2UnXG4gICAgICB2YWx1ZTogMFxuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgcGVlcl9mZWVkYmFjazpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdQZWVyIEZlZWRiYWNrJ1xuICAgICAgaWQ6ICdwZWVyX2ZlZWRiYWNrJ1xuICAgICAgdmFsdWU6IDBcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAwIFxuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBncmFkaW5nX3NlbGVjdGlvbjpcbiAgICAgIGxhYmVsOiAnR3JhZGluZyBiYXNlZCBvbjonXG4gICAgICBpZDogJ2dyYWRpbmdfc2VsZWN0aW9uJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBvcHRpb25zOiBcbiAgICAgICAgcGVyY2VudDogXG4gICAgICAgICAgbGFiZWw6ICdQZXJjZW50YWdlJ1xuICAgICAgICAgIHZhbHVlOiAncGVyY2VudCdcbiAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICBwb2ludHM6XG4gICAgICAgICAgbGFiZWw6ICdQb2ludHMnXG4gICAgICAgICAgdmFsdWU6ICdwb2ludHMnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIFxuICAgICAgXG5cblxuXG4gIG92ZXJ2aWV3OiBcbiAgICBsZWFybmluZ19lc3NlbnRpYWxzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgZXNzZW50aWFscydcbiAgICAgIGlkOiAnbGVhcm5pbmdfZXNzZW50aWFscydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIGNob29zaW5nX2FydGljbGVzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICByZXNlYXJjaF9wbGFubmluZzpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cblxuICAgIHdpemFyZF9zdGFydF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuXG4gICAgd2l6YXJkX2VuZF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuXG4gICAgXG5cblxuXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRTdGVwSW5wdXRzIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBWaWV3SGVscGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoICdsaW5rJywgKCB0ZXh0LCB1cmwgKSAtPlxuXG4gIHRleHQgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHRleHQgKVxuICB1cmwgID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB1cmwgKVxuXG4gIHJlc3VsdCA9ICc8YSBocmVmPVwiJyArIHVybCArICdcIj4nICsgdGV4dCArICc8L2E+J1xuXG4gIHJldHVybiBuZXcgSGFuZGxlYmFycy5TYWZlU3RyaW5nKCByZXN1bHQgKVxuKSIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgLSBBcHBsaWNhdGlvbiBJbml0aXRpYWxpemVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSgnLi9BcHAnKVxuXG5cbiQgLT5cbiAgXG4gICMgSW5pdGlhbGl6ZSBBcHBsaWNhdGlvblxuICBhcHBsaWNhdGlvbi5pbml0aWFsaXplKClcblxuICAjIFN0YXJ0IEJhY2tib25lIHJvdXRlclxuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KClcblxuICAiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbk1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL3N1cGVycy9Nb2RlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE1vZGVsIGV4dGVuZHMgTW9kZWxcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEVWRU5UIEhBTkRMRVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCAtIFJvdXRlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFJvdXRlc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgXG4gIHJvdXRlczpcbiAgICAnJyA6ICdob21lJ1xuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSGFuZGxlcnNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGhvbWU6IC0+XG4gICAgaWYgJCgnI2FwcCcpLmxlbmd0aCA+IDBcblxuICAgICAgQGN1cnJlbnRXaWtpVXNlciA9ICQoICcjYXBwJyApLmF0dHIoJ2RhdGEtd2lraXVzZXInKVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydpbnRybyddWydpbnN0cnVjdG9yX3VzZXJuYW1lJ11bJ3ZhbHVlJ10gPSBAY3VycmVudFdpa2lVc2VyXG5cbiAgICAgICQoICcjYXBwJyApLmh0bWwoYXBwbGljYXRpb24uaG9tZVZpZXcucmVuZGVyKCkuZWwpXG5cbiAgICAgIGlmIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXAnKVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXAnKSlcblxuICAgICAgZWxzZSBpZiBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwaWQnKVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290b0lkJywgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcGlkJykpXG5cblxuICAgIGVsc2UgaWYgJCgnI2xvZ2luJykubGVuZ3RoID4gMFxuXG4gICAgICAoJCAnI2xvZ2luJykuaHRtbChhcHBsaWNhdGlvbi5sb2dpblZpZXcucmVuZGVyKCkuZWwpXG5cbiAgI1xuICAjIFV0aWxpdGllc1xuICAjXG5cbiAgZ2V0UGFyYW1ldGVyQnlOYW1lOiAobmFtZSkgLT5cblxuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIilcblxuICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIilcblxuICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaClcblxuICAgIChpZiBub3QgcmVzdWx0cz8gdGhlbiBcIlwiIGVsc2UgZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSkpXG5cblxuIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSG9tZSBQYWdlIFRlbXBsYXRlXFxuLS0+XFxuXFxuPCEtLSBNQUlOIEFQUCBDT05URU5UIC0tPlxcbjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblxcblxcbiAgPCEtLSBTVEVQUyBNQUlOIENPTlRBSU5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXBzXFxcIj48L2Rpdj48IS0tIGVuZCAuc3RlcHMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLmNvbnRlbnQgLS0+XCI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgICAgICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgICAgICAgPHAgY2xhc3M9XFxcImxhcmdlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubG9naW5faW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sb2dpbl9pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwIHN0ZXAtLWZpcnN0IHN0ZXAtLWxvZ2luXFxcIj5cXG4gICAgXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gICAgICAgIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICAgICAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFxcbiAgICAgICAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgICAgICAgXFxuICAgICAgICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5sb2dpbl9pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuXFxuICAgICAgICA8IS0tIEJFR0lOIEJVVFRPTiAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1hY3Rpb25zXFxcIj5cXG4gICAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWVcXFwiIGlkPVxcXCJsb2dpbkJ1dHRvblxcXCIgaHJlZj1cXFwiL2F1dGgvbWVkaWF3aWtpXFxcIj5cXG4gICAgICAgICAgICBMb2dpbiB3aXRoIFdpa2lwZWRpYVxcbiAgICAgICAgICA8L2E+XFxuICAgICAgICAgIDxhIGNsYXNzPVxcXCJmb250LWJsdWVcXFwiIGhyZWY9XFxcIi93ZWxjb21lXFxcIiBpZD1cXFwic2tpcExvZ2luQnV0dG9uXFxcIj5cXG4gICAgICAgICAgICA8ZW0+b3Igc2tpcCBpdCBmb3Igbm93IGFuZCBqdXN0IHNlZSB0aGUgY3VycmVudCBidWlsZDwvZW0+XFxuICAgICAgICAgIDwvYT5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxkaXYgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcImRvdCBzdGVwLW5hdi1pbmRpY2F0b3JzX19pdGVtIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNBY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5oYXNWaXNpdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBkYXRhLW5hdi1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHRpdGxlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcFRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwSWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBJZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPio8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImFjdGl2ZVwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwidmlzaXRlZFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW5hY3RpdmVcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBTdGVwIE5hdmlnYXRpb24gXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIE5BViBET1QgSU5ESUNBVE9SUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1pbmRpY2F0b3JzIGhpZGRlblxcXCI+XFxuXFxuICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc3RlcHMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtaW5kaWNhdG9ycyAtLT5cXG5cXG5cXG5cXG48IS0tIFNURVAgTkFWIEJVVFRPTlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9uc1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zLS1ub3JtYWxcXFwiPlxcbiAgICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tcHJldiBwcmV2IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucHJldkluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiYXJyb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tcmlnaHQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tbGVmdFxcXCI+PC9kaXY+XFxuICAgICAgPC9zcGFuPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5QcmV2PC9zcGFuPlxcbiAgICA8L2E+XFxuXFxuICAgIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IG5leHQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5uZXh0SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5OZXh0PC9zcGFuPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJhcnJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1sZWZ0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLXJpZ2h0XFxcIj48L2Rpdj5cXG4gICAgICA8L3NwYW4+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9ucy0tZWRpdFxcXCI+XFxuICAgIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1wcmV2IHByZXYgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5wcmV2SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJhcnJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1yaWdodDo1cHg7XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1sZWZ0XFxcIj48L2Rpdj5cXG4gICAgICA8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPkJhY2s8L3NwYW4+XFxuICAgIDwvYT5cXG5cXG4gICAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLW5leHQgbmV4dCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLm5leHRJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPkRvbmU8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLWxlZnQ6NXB4O1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1hcnJvdyBzdGVwLW5hdi1hcnJvdy0tcmlnaHRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgPC9hPlxcblxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWJ1dHRvbnMgLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSW5kaXZpZGFsIFN0ZXAgVGVtcGxhdGVcXG4tLT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgXFxuICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICBcXG4gIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlY3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L2Rpdj5cXG4gICA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG4gIDwhLS0gSU5UUk8gU1RFUCBGT1JNIEFSRUEgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPlxcbiAgICA8IS0tIGZvcm0gZmllbGRzIC0tPlxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1pbm5lciAtLT5cXG5cXG5cXG4gIDwhLS0gREFURVMgTU9EVUxFIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWRhdGVzXFxcIj5cXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tZGF0ZXMgLS0+XFxuXFxuICA8IS0tIEJFR0lOIEJVVFRPTiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1hY3Rpb25zXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwibm8tZWRpdC1tb2RlXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImJlZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj5cXG4gICAgICAgIEJlZ2luIEFzc2lnbm1lbnQgV2l6YXJkXFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiZWRpdC1tb2RlLW9ubHlcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlIGV4aXQtZWRpdFxcXCIgaHJlZj1cXFwiI1xcXCI+XFxuICAgICAgICBCYWNrXFxuICAgICAgPC9hPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tYWN0aW9ucyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50X190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluZm9UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5mb1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmFjY29yZGlhbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICBcXG4gICAgICA8IS0tIElORk8gU0VDVElPTiBIRUFERVIgLS0+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gQ09OVEVOVCAtLT5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9fY29udGVudFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE0LCBwcm9ncmFtMTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19jb250ZW50IC0tPlxcblxcbiAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb24gLS0+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhblwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlclxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXIgLS0+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgICAgXFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFpbiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBGT1JNIDogTGVmdCBTaWRlIG9mIFN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L2Rpdj5cXG5cXG4gIFxcbiAgPCEtLSBTVEVQIEZPUk0gSU5ORVIgQ09OVEVOVCAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1jb250ZW50XFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWlubmVyXFxcIj48L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIElORk8gOiBSaWdodCBzaWRlIG9mIHN0ZXAgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvXFxcIj5cXG4gIFxcbiAgPCEtLSBXSUtJRURVIExPR08gLS0+XFxuICA8YSBjbGFzcz1cXFwibWFpbi1sb2dvXFxcIiBocmVmPVxcXCJodHRwOi8vd2lraWVkdS5vcmdcXFwiIHRhcmdldD1cXFwiX2JsYW5rXFxcIiB0aXRsZT1cXFwid2lraWVkdS5vcmdcXFwiPldJS0lFRFUuT1JHPC9hPlxcblxcbiAgPCEtLSBTVEVQIElORk8gSU5ORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8taW5uZXJcXFwiPlxcblxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluZm9UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICBcXG4gICAgPCEtLSBJTkZPIFNFQ1RJT05TIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8taW5uZXIgLS0+XFxuICBcXG5cXG5cXG4gIDwhLS0gU1RFUCBJTkZPIFRJUCBTRUNUSU9OIC0tPlxcbiAgPCEtLSB1c2VkIGZvciBib3RoIGNvdXJzZSBpbmZvIGFuZCBnZW5lcmljIGluZm8gLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby10aXBzIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8gLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPHA+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3A+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxsaSBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2xpPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tZ3JpZFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGV4dCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGV4dDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mbyBzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG48YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19pbm5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2sgXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QXNzaWdubWVudCB0eXBlOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190ZXh0XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5kZXNjcmlwdGlvbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvZGl2PlxcblxcbiAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TWluaW11bSB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubWluX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5taW5fdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlJlY29tbWVuZGVkIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5yZWNfdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnJlY190aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5CZXN0IGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmJlc3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk5vdCBhcHByb3ByaWF0ZSBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5ub3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkxlYXJuaW5nIE9iamVjdGl2ZXM8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5sZWFybmluZ19vYmplY3RpdmVzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPHA+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmNvbnRlbnQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmNvbnRlbnQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG4gIFxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19pbm5lclxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmRpc2FibGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcImNoZWNrLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vdC1lZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBlZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBkYXRhLWV4Y2x1c2l2ZT1cXFwidHJ1ZVxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IGN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5leGNsdXNpdmUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjxzcGFuPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuICA8aW5wdXQgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiAgLz5cXG4gIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWNoZWNrYm94LWdyb3VwXFxcIiBkYXRhLWNoZWNrYm94LWdyb3VwPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtY2hlY2tib3gtZ3JvdXBfX2xhYmVsXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1jaGVja2JveCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAvPlxcbiAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3R1bS1pbnB1dC0tc2VsZWN0IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm11bHRpcGxlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICA8c2VsZWN0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5tdWx0aXBsZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOCwgcHJvZ3JhbTE4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIj5cXG4gICAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIwLCBwcm9ncmFtMjAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L3NlbGVjdD5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGN1c3R1bS1pbnB1dC0tc2VsZWN0LS1tdWx0aSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbXVsdGlwbGUgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L29wdGlvbj5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS10ZXh0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tdGV4dF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8aW5wdXQgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnR5cGUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBsYWNlaG9sZGVyKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIC8+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXBlcmNlbnRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1wZXJjZW50X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWNvbnRhaW5lclxcXCI+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgbWF4bGVuZ3RoPVxcXCIyXFxcIiAvPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGEgY2xhc3M9XFxcImVkaXQtYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5bZWRpdF08L2E+XFxuICA8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9fY29udGVudFxcXCI+XFxuICAgIDwhLS0gY29udGVudCAtLT5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tdGV4dGFyZWFcXFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gIDx0ZXh0YXJlYSBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcGxhY2Vob2xkZXI9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wbGFjZWhvbGRlcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiByb3dzPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucm93cykpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj48L3RleHRhcmVhPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tbGlua1xcXCI+XFxuICA8bGFiZWw+PGEgaHJlZj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmhyZWYpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9hPjwvbGFiZWw+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lclxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJfX2hlYWRlclxcXCI+XFxuICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMywgcHJvZ3JhbTMzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMzMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpb1xcXCI+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIvPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJfX2hlYWRlclxcXCI+XFxuICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2gyPlxcbjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lciBjdXN0b20taW5wdXQtcmFkaW8taW5uZXItLWdyb3VwXFxcIj5cXG4gIFxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDM2LCBwcm9ncmFtMzYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0zNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uYW1lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jaGVja2JveEdyb3VwKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE1LCBwcm9ncmFtMTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGV4dCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlcmNlbnQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjQsIHByb2dyYW0yNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lZGl0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI2LCBwcm9ncmFtMjYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGV4dGFyZWEpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjgsIHByb2dyYW0yOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5saW5rKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMwLCBwcm9ncmFtMzAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW8pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzIsIHByb2dyYW0zMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0dyb3VwKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDM1LCBwcm9ncmFtMzUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFya3VwIGZvciBTdGFydC9FbmQgRGF0ZSBJbnB1dCBNb2R1bGVcXG4tLT5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19sYWJlbFxcXCI+Q291cnNlIGRhdGVzPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2lubmVyIGZyb21cXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPlllYXI8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJ5ZWFyXFxcIiBpZD1cXFwieWVhclN0YXJ0XFxcIiBuYW1lPVxcXCJ5ZWFyU3RhcnRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX3N0YXJ0X2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJ5ZWFyXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE0XFxcIj4yMDE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE1XFxcIj4yMDE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE2XFxcIj4yMDE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE3XFxcIj4yMDE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE4XFxcIj4yMDE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE5XFxcIj4yMDE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIwXFxcIj4yMDIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIxXFxcIj4yMDIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIyXFxcIj4yMDIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIzXFxcIj4yMDIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI0XFxcIj4yMDI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI1XFxcIj4yMDI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI2XFxcIj4yMDI2PC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5Nb250aDwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcIm1vbnRoXFxcIiBpZD1cXFwibW9udGhTdGFydFxcXCIgbmFtZT1cXFwibW9udGhTdGFydFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfc3RhcnRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcIm1vbnRoXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLWRheVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+RGF5PC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZGF5XFxcIiBpZD1cXFwiZGF5U3RhcnRcXFwiIG5hbWU9XFxcImRheVN0YXJ0XFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9zdGFydF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwiZGF5XFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxM1xcXCI+MTM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE0XFxcIj4xNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTVcXFwiPjE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNlxcXCI+MTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE3XFxcIj4xNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMThcXFwiPjE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxOVxcXCI+MTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwXFxcIj4yMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjFcXFwiPjIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMlxcXCI+MjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIzXFxcIj4yMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjRcXFwiPjI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNVxcXCI+MjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI2XFxcIj4yNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjdcXFwiPjI3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOFxcXCI+Mjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI5XFxcIj4yOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzBcXFwiPjMwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIzMVxcXCI+MzE8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIFxcblxcbiAgPC9kaXY+XFxuICA8c3BhbiBjbGFzcz1cXFwiZGF0ZXMtdG9cXFwiPlxcbiAgICB0b1xcbiAgPC9zcGFuPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19pbm5lciB0b1xcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0teWVhclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+WWVhcjwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcInllYXJcXFwiIGlkPVxcXCJ5ZWFyRW5kXFxcIiBuYW1lPVxcXCJ5ZWFyRW5kXFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9lbmRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcInllYXJcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTRcXFwiPjIwMTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTVcXFwiPjIwMTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTZcXFwiPjIwMTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTdcXFwiPjIwMTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMThcXFwiPjIwMTg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTlcXFwiPjIwMTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjBcXFwiPjIwMjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjFcXFwiPjIwMjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjJcXFwiPjIwMjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjNcXFwiPjIwMjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjRcXFwiPjIwMjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjVcXFwiPjIwMjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMjZcXFwiPjIwMjY8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuICAgIFxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5Nb250aDwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcIm1vbnRoXFxcIiBpZD1cXFwibW9udGhFbmRcXFwiIG5hbWU9XFxcIm1vbnRoRW5kXFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9lbmRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcIm1vbnRoXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLWRheVxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+RGF5PC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiZGF5XFxcIiBpZD1cXFwiZGF5RW5kXFxcIiBuYW1lPVxcXCJkYXlFbmRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX2VuZF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwiZGF5XFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMVxcXCI+MTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDJcXFwiPjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAzXFxcIj4zPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNFxcXCI+NDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDVcXFwiPjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA2XFxcIj42PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwN1xcXCI+Nzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDhcXFwiPjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA5XFxcIj45PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMFxcXCI+MTA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjExXFxcIj4xMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTJcXFwiPjEyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxM1xcXCI+MTM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE0XFxcIj4xNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTVcXFwiPjE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNlxcXCI+MTY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE3XFxcIj4xNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMThcXFwiPjE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxOVxcXCI+MTk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwXFxcIj4yMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjFcXFwiPjIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMlxcXCI+MjI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIzXFxcIj4yMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjRcXFwiPjI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNVxcXCI+MjU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI2XFxcIj4yNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjdcXFwiPjI3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOFxcXCI+Mjg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI5XFxcIj4yOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzBcXFwiPjMwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIzMVxcXCI+MzE8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIFxcblxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+XCI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgb3Zlci1saW1pdCBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuXFxuICAgICAgICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcblxcbiAgICAgICAgICAgIDxsYWJlbCBmb3I9XFxcInBlcmNlbnRcXFwiPjxzcGFuPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPjwvbGFiZWw+XFxuXFxuICAgICAgICAgICAgPGlucHV0IG5hbWU9XFxcImdyYWRpbmctc2VsZWN0aW9uXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgLz5cXG5cXG4gICAgICAgICAgPC9kaXY+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZCBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nXFxcIj5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXN1bW1hcnlcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fdG90YWxcXFwiPlxcblxcbiAgICAgIDxoMz5Ub3RhbDwvaDM+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ19fcGVyY2VudCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzT3ZlckxpbWl0LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG5cXG4gICAgICA8aDM+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRvdGFsR3JhZGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRvdGFsR3JhZGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiJTwvaDM+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuICBcXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvblxcXCI+XFxuXFxuICAgIDxoNSBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uX190aXRsZVxcXCI+R3JhZGluZyBiYXNlZCBvbjo8L2g1PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb24tZm9ybVxcXCI+XFxuXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXdyYXBwZXJcXFwiPlxcblxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLm9wdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvcHllZGl0IGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FkZCB0byBhbiBhcnRpY2xlfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbGx1c3RyYXRlIGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0xpc3QgYXJ0aWNsZSBjaG9pY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIGFydGljbGVzIGZyb20gYSBsaXN0fX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU2VsZWN0IGFydGljbGUgZnJvbSBzdHVkZW50IGNob2ljZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRyYWZ0c19tYWluc3BhY2UpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2FuZGJveCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRyYWZ0c19tYWluc3BhY2UpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud29ya19saXZlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxOCwgcHJvZ3JhbTE4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfX1cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB8IHNhbmRib3ggPSBubyB9fVxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL091dGxpbmUgYXMgbGVhZCBzZWN0aW9uIH19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTIyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RZSyBub21pbmF0aW9uc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBvbmUgcGVlciByZXZpZXcgYXJ0aWNsZX19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ2hvb3NlIHBlZXIgcmV2aWV3IGFydGljbGVzfCBwZWVycmV2aWV3bnVtYmVyID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnBlZXJfZmVlZGJhY2spLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVlcl9yZXZpZXdzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIH19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIG9uZSBwZWVyIHJldmlld319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRG8gcGVlciByZXZpZXdzIHwgcGVlcnJldmlld251bWJlciA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmVwYXJlIGluLWNsYXNzIHByZXNlbnRhdGlvbn19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIENsYXNzIHByZXNlbnRhdGlvbnMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIEZpbmlzaGluZyBUb3VjaGVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Jbi1jbGFzcyBwcmVzZW50YXRpb25zfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUmVmbGVjdGl2ZSBlc3NheX19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1dpa2lwZWRpYSBwb3J0Zm9saW99fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00NChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PcmlnaW5hbCBhcmd1bWVudCBwYXBlcn19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQ2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGludGVyZXN0ZWRfaW5fRFlLID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00OChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBpbnRlcmVzdGVkX2luX0RZSyA9IG5vIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01MChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSB5ZXMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGludGVyZXN0ZWRfaW5fR29vZF9BcnRpY2xlcyA9IG5vIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01NChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1NSwgcHJvZ3JhbTU1LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTU1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHwgd2FudF9oZWxwX2ZpbmRpbmdfYXJ0aWNsZXMgPSB5ZXMgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTU3KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZXF1ZXN0X2hlbHApKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDU4LCBwcm9ncmFtNTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtNTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgfCB3YW50X2hlbHBfZXZhbHVhdGluZ19hcnRpY2xlcyA9IHllcyBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcInt7Y291cnNlIGRldGFpbHMgfCBjb3Vyc2VfbmFtZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3Vyc2VfbmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW5zdHJ1Y3Rvcl91c2VybmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGluc3RydWN0b3JfcmVhbG5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudGVhY2hlcikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IHN1YmplY3QgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3ViamVjdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IHN0YXJ0X2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX3N0YXJ0X2RhdGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBlbmRfZGF0ZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53aXphcmRfZW5kX2RhdGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBpbnN0aXR1dGlvbiA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zY2hvb2wpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBleHBlY3RlZF9zdHVkZW50cyA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB9fVxcblxcblwiO1xuICBpZiAoc3RhY2syID0gaGVscGVycy5kZXNjcmlwdGlvbikgeyBzdGFjazIgPSBzdGFjazIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazIgPSBkZXB0aDAuZGVzY3JpcHRpb247IHN0YWNrMiA9IHR5cGVvZiBzdGFjazIgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMi5hcHBseShkZXB0aDApIDogc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMilcbiAgICArIFwiXFxuXFxuPT1UaW1lbGluZT09XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDEgfCBXaWtpcGVkaWEgZXNzZW50aWFscyB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbnRybyB0byBXaWtpcGVkaWF9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAyIHwgRWRpdGluZyBiYXNpY3MgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSB0aGUgdHJhaW5pbmd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmFjdGljZSBjb21tdW5pY2F0aW5nfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMyB8IEV4cGxvcmluZyB0aGUgdG9waWMgYXJlYX19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGxvcmluZyB0aGUgdG9waWMgYXJlYSBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA0IH19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNyaXRpcXVlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3B5X2VkaXRfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDQgfCBVc2luZyBzb3VyY2VzIGFuZCBjaG9vc2luZyBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Vc2luZyBzb3VyY2VzIGluIGNsYXNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDV9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5hZGRfdG9fYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlsbHVzdHJhdGVfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucHJlcGFyZV9saXN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMSwgcHJvZ3JhbTExLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhcnRpY2xlIHNlbGVjdGlvbnMgfCBkdWUgPSBXZWVrIDV9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA1IHwgRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDYgfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21waWxlIGEgYmlibGlvZ3JhcGh5fX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNiB8IERyYWZ0aW5nIHN0YXJ0ZXIgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBldGlxdWV0dGUgYW5kIHNhbmRib3hlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA3IH19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucmVzZWFyY2hfcGxhbm5pbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY3JlYXRlX291dGxpbmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE1LCBwcm9ncmFtMTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucmVzZWFyY2hfcGxhbm5pbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud3JpdGVfbGVhZCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjAsIHByb2dyYW0yMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNyB8IE1vdmluZyBhcnRpY2xlcyB0byB0aGUgbWFpbiBzcGFjZSB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NYWluIHNwYWNlIGluIGNsYXNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDggfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTW92ZSB0byBtYWluIHNwYWNlfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5keWspLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZHlrKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBhbmQgeW91ciBhcnRpY2xlfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgOCB8IEJ1aWxkaW5nIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tjbGFzcyB3b3Jrc2hvcH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDkgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMjYsIHByb2dyYW0yNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDkgfCBHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2sgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTAgfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWzBdKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMwLCBwcm9ncmFtMzAsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyOCwgcHJvZ3JhbTI4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMTAgfCBSZXNwb25kaW5nIHRvIGZlZWRiYWNrIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01lZGlhIGxpdGVyYWN5IGRpc2N1c3Npb259fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTEgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3N9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMiwgcHJvZ3JhbTMyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxMSB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDM2LCBwcm9ncmFtMzYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgzNCwgcHJvZ3JhbTM0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzOCwgcHJvZ3JhbTM4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZWZsZWN0aXZlX2Vzc2F5KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MCwgcHJvZ3JhbTQwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucG9ydGZvbGlvKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MiwgcHJvZ3JhbTQyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3JpZ2luYWxfcGFwZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQ0LCBwcm9ncmFtNDQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDEyIHwgRHVlIGRhdGUgfX1cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FsbCBzdHVkZW50cyBmaW5pc2hlZH19XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IGdyYWRpbmcgfCBDb21wbGV0aW9uIG9mIFdpa2lwZWRpYSB0cmFpbmluZyB8IDEgcG9pbnQgfCBcXFwiUHJhY3RpY2Ugb24td2lraSBjb21tdW5pY2F0aW9uXFxcIiBleGVyY2lzZSB8IDEgcG9pbnQgfCBcXFwiQ29weWVkaXQgYW4gYXJ0aWNsZVxcXCIgZXhlcmNpc2UgfCAxIHBvaW50IHwgXFxcIkV2YWx1YXRlIGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlXFxcIiB8IDEgcG9pbnQgfCBcXFwiQWRkIHRvIGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlIHwgMSBwb2ludCB8IFxcXCJJbGx1c3RyYXRlIGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlIHwgMSBwb2ludCB8IFF1YWxpdHkgb2YgYmlibGlvZ3JhcGh5IGFuZCBvdXRsaW5lIHwgMiBwb2ludHMgfCBQZWVyIHJldmlld3MgYW5kIGNvbGxhYm9yYXRpb24gd2l0aCBjbGFzc21hdGVzIHwgMiBwb2ludHMgfCBQYXJ0aWNpcGF0aW9uIGluIGNsYXNzIGRpc2N1c3Npb25zIHwgMiBwb2ludHMgfCBRdWFsaXR5IG9mIHlvdXIgbWFpbiBXaWtpcGVkaWEgY29udHJpYnV0aW9ucyB8IDEwIHBvaW50cyB8IFJlZmxlY3RpdmUgZXNzYXkgfCAyIHBvaW50cyB8IE9yaWdpbmFsIGFyZ3VtZW50IHBhcGVyIHwgMTAgcG9pbnRzIHwgSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIGNvbnRyaWJ1dGlvbnMgfCAyIHBvaW50c319XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugb3B0aW9ucyB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmR5ayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5keWspKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNDgsIHByb2dyYW00OCwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDQ2LCBwcm9ncmFtNDYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIHwgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2EpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZ2EpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNTIsIHByb2dyYW01MiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDUwLCBwcm9ncmFtNTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNTQsIHByb2dyYW01NCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNTcsIHByb2dyYW01NywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgfX1cXG5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJcbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuI1RFTVBBTFRFXG5XaWtpRGF0ZXNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzJylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgRGF0ZUlucHV0VmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuXG4gIGV2ZW50czpcblxuICAgICdjbGljayBzZWxlY3QnIDogJ2NsaWNrSGFuZGxlcidcblxuICAgICdjaGFuZ2Ugc2VsZWN0JyA6ICdjaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2ZvY3VzIHNlbGVjdCcgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ2JsdXIgc2VsZWN0JyA6ICdibHVySGFuZGxlcidcblxuXG4gIHJlbmRlcjogLT5cbiAgICAkKCdib2R5Jykub24gJ2NsaWNrJywgKGUpID0+XG4gICAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgYmx1ckhhbmRsZXI6IChlKSAtPlxuICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cbiAgZm9jdXNIYW5kbGVyOiAoZSkgLT5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIGNoYW5nZUhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuICAgICR0YXJnZXQgPSAoJCBlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZCA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLWlkJylcblxuICAgIHR5cGUgPSAkdGFyZ2V0LmF0dHIoJ2RhdGEtZGF0ZS10eXBlJylcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVt0eXBlXSA9IHZhbHVlXG5cbiAgICBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgZCA9IFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF1bJ2RheSddXG5cbiAgICB5ID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsneWVhciddXG5cbiAgICBkYXRlVmFsdWUgPSBcIiN7eX0tI3ttfS0je2R9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBkYXRlVmFsdWVcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGhhc1ZhbHVlOiAtPlxuICAgIHJldHVybiBAJGVsLmZpbmQoJ3NlbGVjdCcpLnZhbCgpICE9ICcnXG5cbiAgY2xvc2VJZk5vVmFsdWU6IC0+XG4gICAgaWYgQGhhc1ZhbHVlKClcbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuICAgIGVsc2VcbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cbiIsIiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5XaWtpR3JhZGluZ01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicycpXG5cblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgR3JhZGluZ0lucHV0VmlldyBleHRlbmRzIFZpZXdcblxuICB0ZW1wbGF0ZTogV2lraUdyYWRpbmdNb2R1bGVcblxuXG4gIGV2ZW50czpcblxuICAgICdpbnB1dCBjaGFuZ2UnIDogJ2lucHV0Q2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBsYWJlbCcgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ2dyYWRlOmNoYW5nZScgOiAnZ3JhZGVDaGFuZ2VIYW5kbGVyJ1xuXG4gIGN1cnJlbnRWYWx1ZXM6IFtdXG5cblxuICB2YWx1ZUxpbWl0OiAxMDBcblxuXG4gIGdyYWRpbmdTZWxlY3Rpb25EYXRhOiBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ11cblxuXG4gIGN1cnJlbnRUb3RhbDogLT5cblxuICAgIHRvdGFsID0gMFxuXG4gICAgXy5lYWNoKEBjdXJyZW50VmFsdWVzLCAodmFsKSA9PlxuXG4gICAgICB0b3RhbCArPSBwYXJzZUludCh2YWwpXG5cbiAgICApXG5cbiAgICByZXR1cm4gdG90YWxcblxuXG5cbiAgZ2V0SW5wdXRWYWx1ZXM6IC0+XG5cbiAgICB2YWx1ZXMgPSBbXVxuXG4gICAgQHBhcmVudFN0ZXBWaWV3LiRlbC5maW5kKCdpbnB1dFt0eXBlPVwicGVyY2VudFwiXScpLmVhY2goLT5cblxuICAgICAgdmFsdWVzLnB1c2goKCQgdGhpcykudmFsKCkpXG5cbiAgICApXG5cbiAgICBAY3VycmVudFZhbHVlcyA9IHZhbHVlc1xuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgZ3JhZGVDaGFuZ2VIYW5kbGVyOiAoaWQsIHZhbHVlKSAtPlxuICAgIFxuICAgIEBnZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpXG5cblxuXG5cbiAgcmFkaW9CdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkcGFyZW50RWwgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICRwYXJlbnRHcm91cCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRpbnB1dEVsID0gJHBhcmVudEVsLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpXG5cblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICAkb3RoZXJSYWRpb3MgPSAkcGFyZW50R3JvdXAuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKS5ub3QoJHBhcmVudEVsWzBdKVxuXG4gICAgICAkb3RoZXJSYWRpb3MuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkcGFyZW50RWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS5vcHRpb25zLCAob3B0KSAtPlxuXG4gICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlXG4gICAgICAgIFxuICAgICAgKVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10ub3B0aW9uc1skaW5wdXRFbC5hdHRyKCdpZCcpXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLnZhbHVlID0gJGlucHV0RWwuYXR0cignaWQnKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgb3V0ID0ge1xuXG4gICAgICB0b3RhbEdyYWRlOiBAY3VycmVudFRvdGFsKClcblxuICAgICAgaXNPdmVyTGltaXQ6IEBjdXJyZW50VG90YWwoKSA+IEB2YWx1ZUxpbWl0XG5cbiAgICAgIG9wdGlvbnM6IEBncmFkaW5nU2VsZWN0aW9uRGF0YS5vcHRpb25zXG5cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0XG5cblxuXG5cblxuXG5cblxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBIb21lVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuSG9tZVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0hvbWVUZW1wbGF0ZS5oYnMnKVxuT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBJTklUXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG5cbiAgZXZlbnRzOiBcblxuICAgICdjbGljayAuZXhpdC1lZGl0JyA6ICdleGl0RWRpdENsaWNrSGFuZGxlcidcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6cHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9DbGlja0hhbmRsZXInXG5cbiAgICAnc3RlcDpnb3RvSWQnIDogJ2dvdG9JZENsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmVkaXQnIDogJ2VkaXRDbGlja0hhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcblxuICAgIHVubGVzcyBAc3RlcHNSZW5kZXJlZFxuICAgIFxuICAgICAgQGFmdGVyUmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuICAgICNTVUJWSUVXU1xuICAgIEBTdGVwTmF2ID0gbmV3IFN0ZXBOYXZWaWV3KClcblxuICAgICMgVEhFIEZPTExXSU5HIENPVUxEIFBST0JBQkxZIEhBUFBFTiBJTiBBIENPTExFVElPTiBWSUVXIENMQVNTIFRPIENPTlRST0wgQUxMIFNURVBTXG4gICAgQCRzdGVwc0NvbnRhaW5lciA9IEAkZWwuZmluZCgnLnN0ZXBzJylcblxuICAgIEAkaW5uZXJDb250YWluZXIgPSBAJGVsLmZpbmQoJy5jb250ZW50JylcblxuICAgICMgU0VUVVAgU1RFUFMgQU5EIFJFVFVSTiBBUlJBWSBPRiBWSUVXU1xuICAgIEBzdGVwVmlld3MgPSBAX2NyZWF0ZVN0ZXBWaWV3cygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG4gICAgaWYgQHN0ZXBWaWV3cy5sZW5ndGggPiAwXG4gICAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuICAgIHJldHVybiBAXG4gICAgXG5cblxuICBfY3JlYXRlU3RlcFZpZXdzOiAtPlxuICAgIFxuICAgIF92aWV3cyA9IFtdXG5cbiAgICBfLmVhY2goYXBwbGljYXRpb24uZGF0YSwoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG5cbiAgICAgIF8ubWFwKHN0ZXAsKHZhbHVlLCBrZXksIGxpc3QpIC0+IFxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuICAgICAgICBtb2RlbDogbmV3bW9kZWxcbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBpbmRleCArIDEpXG4gICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4JywgaW5kZXggKVxuXG4gICAgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcblxuICAgICAgX3ZpZXdzLnB1c2gobmV3dmlldylcblxuICAgIClcblxuICAgIHJldHVybiBfdmlld3NcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICByZXR1cm4ge1xuXG4gICAgICBjb250ZW50OiBcIlRoaXMgaXMgc3BlY2lhbCBjb250ZW50XCJcblxuICAgIH1cbiAgICBcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiAgYWR2YW5jZVN0ZXA6IC0+XG4gICAgQGN1cnJlbnRTdGVwKz0xXG4gICAgXG4gICAgaWYgQGN1cnJlbnRTdGVwIGlzIEBzdGVwVmlld3MubGVuZ3RoIFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgZGVjcmVtZW50U3RlcDogLT5cblxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHVwZGF0ZVN0ZXA6IChpbmRleCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IGluZGV4XG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgdXBkYXRlU3RlcEJ5SWQ6IChpZCkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgaWYgc3RlcFZpZXcuc3RlcElkKCkgaXMgaWRcblxuICAgICAgICBAdXBkYXRlU3RlcChfLmluZGV4T2YoQHN0ZXBWaWV3cyxzdGVwVmlldykpXG4gICAgICAgIFxuICAgICAgICByZXR1cm5cbiAgICAgIFxuICAgIClcblxuXG5cbiAgc2hvd0N1cnJlbnRTdGVwOiAtPlxuXG4gICAgQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLnNob3coKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDp1cGRhdGUnLCBAY3VycmVudFN0ZXApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBjdXJyZW50U3RlcFZpZXc6IC0+XG4gICAgcmV0dXJuIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXVxuXG5cblxuICBoaWRlQWxsU3RlcHM6IC0+XG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuICAgICAgc3RlcFZpZXcuaGlkZSgpXG4gICAgKVxuXG5cbiAgaGlkZUFsbFRpcHM6IChlKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy50aXBWaXNpYmxlID0gZmFsc2VcbiAgICAgIFxuICAgIClcblxuICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG5cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIG5leHRDbGlja0hhbmRsZXI6IC0+XG4gICAgQGFkdmFuY2VTdGVwKClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG4gIHByZXZDbGlja0hhbmRsZXI6IC0+XG4gICAgQGRlY3JlbWVudFN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChpZCkgLT5cbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2VkaXQtbW9kZScpXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsICh2aWV3LCBpbmRleCkgPT5cbiAgICAgIGlmIHZpZXcubW9kZWwuaWQgPT0gaWRcbiAgICAgICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG4gICAgKVxuXG4gIGV4aXRFZGl0Q2xpY2tIYW5kbGVyOiAtPlxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdlZGl0LW1vZGUnKVxuXG4gICAgQHVwZGF0ZVN0ZXAoQFN0ZXBOYXYudG90YWxTdGVwcy0xKVxuXG5cbiAgZ290b0NsaWNrSGFuZGxlcjogKGluZGV4KSAtPlxuXG4gICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ290b0lkQ2xpY2tIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBAdXBkYXRlU3RlcEJ5SWQoaWQpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cblxuXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcbklucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIElucHV0VmlldyBcblxuXG4gICIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEhvbWVWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG4jVEVNUExBVEVTXG5Mb2dpblRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzJylcblxuV2l6YXJkQ29udGVudCA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkQ29udGVudCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG4gIHRlbXBsYXRlOiBMb2dpblRlbXBsYXRlXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICByZXR1cm4gV2l6YXJkQ29udGVudFswXSIsIlxuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbldpa2lPdXRwdXRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicycpXG5cblxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogV2lraU91dHB1dFRlbXBsYXRlXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3dpemFyZDpwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcicgXG5cblxuICBvdXRwdXRQbGFpblRleHQ6IC0+XG5cbiAgICBAcmVuZGVyKClcblxuICAgIHJldHVybiBAJGVsLnRleHQoKVxuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBwb3B1bGF0ZU91dHB1dCgpICkgKVxuICAgIFxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuXG4gIHBvcHVsYXRlT3V0cHV0OiAtPlxuXG4gICAgcmV0dXJuIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIF8uZXh0ZW5kKFdpemFyZFN0ZXBJbnB1dHMseyBkZXNjcmlwdGlvbjogJCgnI3Nob3J0X2Rlc2NyaXB0aW9uJykudmFsKCl9KVxuXG5cbiAgZXhwb3J0RGF0YTogKGZvcm1EYXRhKSAtPlxuXG4gICAgJC5hamF4KFxuXG4gICAgICB0eXBlOiAnUE9TVCdcblxuICAgICAgdXJsOiAnL3B1Ymxpc2gnXG5cbiAgICAgIGRhdGE6XG5cbiAgICAgICAgd2lraXRleHQ6IGZvcm1EYXRhXG5cbiAgICAgICAgY291cnNlX3RpdGxlOiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlXG5cbiAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSkgLT5cblxuICAgICAgICAkKCcjcHVibGlzaCcpLnJlbW92ZUNsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgICBpZiByZXNwb25zZS5zdWNjZXNzXG5cbiAgICAgICAgICBuZXdQYWdlID0gXCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpLyN7cmVzcG9uc2UudGl0bGV9XCJcblxuICAgICAgICAgIGFsZXJ0KFwiQ29uZ3JhdHMhIFlvdSBoYXZlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkL2VkaXRlZCBhIFdpa2llZHUgQ291cnNlIGF0ICN7bmV3UGFnZX1cIilcblxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbmV3UGFnZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIGNvbnNvbGUubG9nIHJlc3BvbnNlXG5cbiAgICAgICAgICBhbGVydCgndGhlcmUgd2FzIGFuIGVycm9yLiBzZWUgY29uc29sZS4nKVxuXG5cbiAgICApXG4gICAgXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG5cbiAgICBpZiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlLmxlbmd0aCA+IDAgXG5cbiAgICAgICQoJyNwdWJsaXNoJykuYWRkQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICBAZXhwb3J0RGF0YShAcG9wdWxhdGVPdXRwdXQoKSlcblxuICAgIGVsc2VcblxuICAgICAgYWxlcnQoJ1lvdSBtdXN0IGVudGVyIGEgY291cnNlIHRpdGxlIGFzIHRoaXMgd2lsbCBiZWNvbWUgdGhlIHRpdGxlIG9mIHlvdXIgY291cnNlIHBhZ2UuJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJ2ludHJvJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICQoJyNjb3Vyc2VfbmFtZScpLmZvY3VzKClcblxuICAgICAgLDUwMClcblxuXG4gICAgXG5cbiAgICBcblxuICAgICIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBOYXZWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5TdGVwTmF2VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTmF2VmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAtbmF2J1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBOYXZUZW1wbGF0ZVxuXG5cbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBcbiAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDp1cGRhdGUnIDogJ3VwZGF0ZUN1cnJlbnRTdGVwJ1xuXG4gICAgJ3N0ZXA6YW5zd2VyZWQnIDogJ3N0ZXBBbnN3ZXJlZCdcblxuXG4gIGV2ZW50czogLT5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnByZXYnIDogJ3ByZXZDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmRvdCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPCBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgICAgIyBAJGVsLnJlbW92ZUNsYXNzKCdjb250cmFjdGVkJylcblxuICAgIGVsc2UgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPT0gQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICAgICMgQCRlbC5hZGRDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICBlbHNlXG5cbiAgICAgICMgQCRlbC5yZW1vdmVDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY3VycmVudDogQGN1cnJlbnRTdGVwXG5cbiAgICAgIHRvdGFsOiBAdG90YWxTdGVwc1xuXG4gICAgICBwcmV2SW5hY3RpdmU6IEBpc0luYWN0aXZlKCdwcmV2JylcblxuICAgICAgbmV4dEluYWN0aXZlOiBAaXNJbmFjdGl2ZSgnbmV4dCcpXG5cbiAgICAgIHN0ZXBzOiA9PlxuXG4gICAgICAgIG91dCA9IFtdXG5cbiAgICAgICAgXy5lYWNoKEBzdGVwVmlld3MsIChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICAgIHN0ZXBEYXRhID0gc3RlcC5tb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgICAgICBpc0FjdGl2ZSA9IEBjdXJyZW50U3RlcCBpcyBpbmRleFxuXG4gICAgICAgICAgd2FzVmlzaXRlZCA9IHN0ZXAuaGFzVXNlclZpc2l0ZWRcblxuICAgICAgICAgIG91dC5wdXNoIHtpZDogaW5kZXgsIGlzQWN0aXZlOiBpc0FjdGl2ZSwgaGFzVmlzaXRlZDogd2FzVmlzaXRlZCwgc3RlcFRpdGxlOiBzdGVwRGF0YS50aXRsZSwgc3RlcElkOiBzdGVwRGF0YS5pZH1cblxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG91dFxuXG4gICAgfVxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAtPlxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IC0+XG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG5cbiAgZG90Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsICR0YXJnZXQuZGF0YSgnbmF2LWlkJykpXG5cblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cbiAgICBAY3VycmVudFN0ZXAgPSBzdGVwXG5cbiAgICBAcmVuZGVyKClcblxuXG4gIHN0ZXBBbnN3ZXJlZDogKHN0ZXBWaWV3KSAtPlxuICAgIEByZW5kZXIoKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGlzSW5hY3RpdmU6IChpdGVtKSAtPlxuXG4gICAgaXRJcyA9IHRydWVcblxuICAgIGlmIGl0ZW0gPT0gJ3ByZXYnXG5cbiAgICAgIGl0SXMgPSBAY3VycmVudFN0ZXAgaXMgMVxuXG4gICAgZWxzZSBpZiBpdGVtID09ICduZXh0J1xuXG4gICAgICBpZiBAY3VycmVudFN0ZXAgaXMgQHRvdGFsU3RlcHMgLSAxIHx8IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLmhhc1VzZXJBbnN3ZXJlZFxuXG4gICAgICAgIGl0SXMgPSBmYWxzZVxuICAgICAgICBcbiAgICAgIGVsc2VcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgIHJldHVybiBpdElzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1NVQlZJRVdTXG5JbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbkRhdGVJbnB1dFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9EYXRlSW5wdXRWaWV3JylcblxuR3JhZGluZ0lucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcnKVxuXG4jVEVNUExBVEVTXG5TdGVwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvU3RlcFRlbXBsYXRlLmhicycpXG5cbkludHJvU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicycpXG5cbklucHV0VGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicycpXG5cbkNvdXJzZVRpcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2luZm8vQ291cnNlVGlwVGVtcGxhdGUuaGJzJylcblxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cblxuI0RBVEFcbkNvdXJzZUluZm9EYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb3Vyc2VJbmZvJylcblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwVmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAnXG5cblxuICB0YWdOYW1lOiAnc2VjdGlvbidcblxuXG4gIHRlbXBsYXRlOiBTdGVwVGVtcGxhdGVcblxuXG4gIGludHJvVGVtcGxhdGU6IEludHJvU3RlcFRlbXBsYXRlXG5cblxuICB0aXBUZW1wbGF0ZTogSW5wdXRUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb1RlbXBsYXRlOiBDb3Vyc2VUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb0RhdGE6IENvdXJzZUluZm9EYXRhXG5cblxuICBkYXRlc01vZHVsZTogV2lraURhdGVzTW9kdWxlXG5cblxuICBoYXNVc2VyQW5zd2VyZWQ6IGZhbHNlXG5cblxuICBoYXNVc2VyVmlzaXRlZDogZmFsc2VcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UUyBBTkQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayAuc3RlcC1mb3JtLWlubmVyIGlucHV0JyA6ICdpbnB1dEhhbmRsZXInXG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvLXRpcCcgOiAnaGlkZVRpcHMnXG5cblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgc3RlcElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc3RlcC1pZCcpXG5cbiAgICBpZiBzdGVwSWRcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0Jywgc3RlcElkKVxuXG4gIHN0ZXBJZDogLT5cblxuICAgIHJldHVybiBAbW9kZWwuYXR0cmlidXRlcy5pZFxuXG5cblxuICBhY2NvcmRpYW5DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHRhcmdldC50b2dnbGVDbGFzcygnb3BlbicpXG5cbiAgICAjIGlmICR0YXJnZXQuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgICR0YXJnZXQucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyBlbHNlIGlmICQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgIEAkZWwuZmluZCgnLnN0ZXAtaW5mbycpLmZpbmQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgIHNldFRpbWVvdXQoPT5cblxuICAgICMgICAgICR0YXJnZXQuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgICw1MDApXG5cbiAgICAjIGVsc2VcblxuICAgICMgICAkdGFyZ2V0LmFkZENsYXNzKCdvcGVuJylcblxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd3aXphcmQ6cHVibGlzaCcpXG5cblxuICBcbiAgcmVuZGVyOiAtPlxuXG4gICAgQHRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgaWYgQG1vZGVsLmdldCgnc3RlcE51bWJlcicpID09IDFcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tZmlyc3QnKS5odG1sKCBAaW50cm9UZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICNBREQgU1RBUlQvRU5EIERBVEVTIE1PRFVMRVxuICAgICAgJGRhdGVzID0gJChAZGF0ZXNNb2R1bGUoKSlcblxuICAgICAgJGRhdGVJbnB1dHMgPSAkZGF0ZXMuZmluZCgnLmN1c3RvbS1zZWxlY3QnKVxuXG4gICAgICBzZWxmID0gQFxuXG4gICAgICAkZGF0ZUlucHV0cy5lYWNoKC0+XG4gICAgICAgIGRhdGVWaWV3ID0gbmV3IERhdGVJbnB1dFZpZXcoXG4gICAgICAgICAgZWw6ICQodGhpcykgXG4gICAgICAgIClcbiAgICAgICAgZGF0ZVZpZXcucGFyZW50U3RlcFZpZXcgPSBzZWxmXG4gICAgXG4gICAgICApXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1kYXRlcycpLmh0bWwoJGRhdGVzKVxuICAgICAgXG4gICAgZWxzZVxuICAgICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG5cbiAgICBAaW5wdXRTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1mb3JtLWlubmVyJylcblxuICAgIEAkdGlwU2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtaW5mby10aXBzJylcblxuICAgIEBpbnB1dERhdGEgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXSB8fCBbXVxuXG5cbiAgICBfLmVhY2goQGlucHV0RGF0YSwgKGlucHV0LCBpbmRleCkgPT5cblxuICAgICAgdW5sZXNzIGlucHV0LnR5cGUgXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIGlucHV0LnNlbGVjdGVkXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgaW5wdXRWaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ldyBCYWNrYm9uZS5Nb2RlbChpbnB1dClcblxuICAgICAgKVxuXG4gICAgICBpbnB1dFZpZXcuaW5wdXRUeXBlID0gaW5wdXQudHlwZVxuXG4gICAgICBpbnB1dFZpZXcuaXRlbUluZGV4ID0gaW5kZXhcblxuICAgICAgaW5wdXRWaWV3LnBhcmVudFN0ZXAgPSBAXG5cbiAgICAgIEBpbnB1dFNlY3Rpb24uYXBwZW5kKGlucHV0Vmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgaW5wdXQudGlwSW5mb1xuXG4gICAgICAgIHRpcCA9IFxuXG4gICAgICAgICAgaWQ6IGluZGV4XG5cbiAgICAgICAgICB0aXRsZTogaW5wdXQudGlwSW5mby50aXRsZVxuXG4gICAgICAgICAgY29udGVudDogaW5wdXQudGlwSW5mby5jb250ZW50XG5cbiAgICAgICAgJHRpcEVsID0gQHRpcFRlbXBsYXRlKHRpcClcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuaGFzQ291cnNlSW5mb1xuXG4gICAgICAgIGluZm9EYXRhID0gXy5leHRlbmQoQGNvdXJzZUluZm9EYXRhW2lucHV0LmlkXSwge2lkOiBpbmRleH0gKVxuXG4gICAgICAgICR0aXBFbCA9IEBjb3Vyc2VJbmZvVGVtcGxhdGUoaW5mb0RhdGEpXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgKVxuXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRpbnB1dENvbnRhaW5lcnMgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKVxuXG4gICAgIyBjb25zb2xlLmxvZyAnc3RlcHZpZXcnLCBAbW9kZWwuYXR0cmlidXRlcy5pZFxuXG4gICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIEBncmFkaW5nVmlldyA9IG5ldyBHcmFkaW5nSW5wdXRWaWV3KClcblxuICAgICAgQGdyYWRpbmdWaWV3LnBhcmVudFN0ZXBWaWV3ID0gQFxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tY29udGVudCcpLmFwcGVuZChAZ3JhZGluZ1ZpZXcuZ2V0SW5wdXRWYWx1ZXMoKS5yZW5kZXIoKS5lbClcblxuICAgICAgY29uc29sZS5sb2cgQGdyYWRpbmdWaWV3LmN1cnJlbnRUb3RhbCgpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoaWRlOiAtPlxuXG4gICAgQCRlbC5oaWRlKClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIHNob3c6IC0+XG5cbiAgICBAJGVsLnNob3coKVxuXG4gICAgQGhhc1VzZXJWaXNpdGVkID0gdHJ1ZVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGJlZ2luSGFuZGxlcjogLT5cblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuICB1cGRhdGVVc2VyQW5zd2VyOiAoaWQsdmFsdWUpIC0+XG5cbiAgICBpZiB2YWx1ZSBpcyAnb24nXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6YW5zd2VyZWQnLCBAKVxuXG4gICAgcmV0dXJuIEBcblxuICB1cGRhdGVSYWRpb0Fuc3dlcjogKGlkLCBpbmRleCwgdmFsdWUpIC0+XG5cbiAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnR5cGUgXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLnNlbGVjdGVkID0gdmFsdWVcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLnZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gaW5kZXhcblxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgb3V0ID0gXG5cbiAgICAgIHR5cGU6IGlucHV0VHlwZVxuXG4gICAgICBpZDogaWRcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cblxuICAgIGlmIGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnIHx8IGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIGlmIHZhbHVlID09ICdvbidcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IGZhbHNlXG5cblxuICAgIGVsc2UgaWYgaW5wdXRUeXBlID09ICd0ZXh0JyB8fCBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSB2YWx1ZVxuXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG5cbiAgaW5wdXRIYW5kbGVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnQgPSAkdGFyZ2V0LnBhcmVudHMoJy5jdXN0b20taW5wdXQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuZGF0YSgnZXhjbHVzaXZlJylcblxuICAgICAgaWYgJHRhcmdldC5pcygnOmNoZWNrZWQnKSBcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEAkaW5wdXRDb250YWluZXJzLmZpbmQoJ2lucHV0Jykubm90KCR0YXJnZXQpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgIGVsc2VcblxuICAgICAgJGV4Y2x1c2l2ZSA9IEAkZWwuZmluZCgnW2RhdGEtZXhjbHVzaXZlPVwidHJ1ZVwiXScpXG5cbiAgICAgIGlmICRleGNsdXNpdmUubGVuZ3RoID4gMFxuXG4gICAgICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJylcblxuICAgICAgICAgICRleGNsdXNpdmUuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICAkZXhjbHVzaXZlLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG5cblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuXG5cblxuICAgIFxuICAgIFxuXG4gXG5cbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIElucHV0SXRlbVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuL1ZpZXcnKVxuXG5cbiNURU1QTEFURVNcbklucHV0SXRlbVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vLi4vdGVtcGxhdGVzL3N0ZXBzL2lucHV0cy9JbnB1dEl0ZW1UZW1wbGF0ZS5oYnMnKVxuXG5cbiNPVVRQVVRcbkFzc2lnbm1lbnREYXRhID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9XaXphcmRBc3NpZ25tZW50RGF0YScpXG5cblxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogSW5wdXRJdGVtVGVtcGxhdGVcblxuXG4gIGNsYXNzTmFtZTogJ2N1c3RvbS1pbnB1dC13cmFwcGVyJ1xuXG5cbiAgaG92ZXJUaW1lOiA1MDBcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEV2ZW50c1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6IFxuXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInRleHRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2tleXVwIGlucHV0W3R5cGU9XCJwZXJjZW50XCJdJyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1jaGVja2JveCBsYWJlbCBzcGFuJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdtb3VzZW92ZXInIDogJ21vdXNlb3ZlckhhbmRsZXInXG5cbiAgICAnbW91c2VlbnRlciBsYWJlbCcgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlZW50ZXIgLmNoZWNrLWJ1dHRvbicgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdtb3VzZW91dEhhbmRsZXInXG5cbiAgICAnY2xpY2sgLmVkaXRhYmxlIC5jaGVjay1idXR0b24nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvYm94IC5yYWRpby1idXR0b24nIDogJ3JhZGlvQm94Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIC5yYWRpby1idXR0b24nIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2ZvY3VzIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uRm9jdXMnXG5cbiAgICAnYmx1ciAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkJsdXInXG5cblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cblxuXG4gIHJhZGlvQm94Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRvdGhlclJhZGlvcyA9IEAkZWwucGFyZW50cygnLnN0ZXAtZm9ybS1pbm5lcicpLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpLmZpbmQoJ2lucHV0JykudmFsKCdvZmYnKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG5cbiAgY2hlY2tCdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgaWYgQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpLmxlbmd0aCA+IDBcblxuICAgICAgcmV0dXJuIEByYWRpb0JveENsaWNrSGFuZGxlcihlKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKVxuXG4gICAgICAudG9nZ2xlQ2xhc3MoJ2NoZWNrZWQnKVxuICAgIFxuICAgIGlmICRwYXJlbnQuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29uJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIGZhbHNlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvZmYnKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG5cbiAgaG92ZXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIGNvbnNvbGUubG9nIGUudGFyZ2V0XG5cblxuICBtb3VzZW92ZXJIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gdHJ1ZVxuICAgICAgXG5cbiAgbW91c2VvdXRIYW5kbGVyOiAoZSkgLT5cblxuICAgIEBpc0hvdmVyaW5nID0gZmFsc2VcblxuXG4gIHNob3dUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm8gJiYgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9PSBmYWxzZVxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSB0cnVlXG5cbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFtkYXRhLWl0ZW0taW5kZXg9JyN7QGl0ZW1JbmRleH0nXVwiKS5hZGRDbGFzcygndmlzaWJsZScpXG5cblxuICBoaWRlVG9vbHRpcDogLT5cblxuICAgIGlmIEBoYXNJbmZvXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJykgXG5cblxuICBoaWRlU2hvd1Rvb2x0aXA6IC0+XG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgQHNob3dUb29sdGlwKClcblxuXG4gIGxhYmVsQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm4gZmFsc2VcblxuXG4gIGl0ZW1DaGFuZ2VIYW5kbGVyOiAoZSkgLT5cbiAgICBcbiAgICAjIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2Fuc3dlcjp1cGRhdGVkJywgaW5wdXRJZCwgdmFsdWUpXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0dyb3VwJ1xuXG4gICAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAgIGluZGV4ID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2lkJylcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cigndmFsdWUnKVxuXG4gICAgICBwYXJlbnRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCduYW1lJylcblxuICAgICAgaWYgJChlLmN1cnJlbnRUYXJnZXQpLnByb3AoJ2NoZWNrZWQnKVxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVJhZGlvQW5zd2VyKHBhcmVudElkLCBpbmRleCwgdHJ1ZSlcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVJhZGlvQW5zd2VyKHBhcmVudElkLCBpbmRleCwgZmFsc2UpXG5cbiAgICBlbHNlXG5cbiAgICAgIHZhbHVlID0gJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgpXG5cbiAgICAgIGlucHV0SWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICBAcGFyZW50U3RlcC51cGRhdGVBbnN3ZXIoaW5wdXRJZCwgdmFsdWUpXG5cbiAgICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgICAgaWYgaXNOYU4ocGFyc2VJbnQodmFsdWUpKVxuXG4gICAgICAgICAgJChlLmN1cnJlbnRUYXJnZXQpLnZhbCgnJylcblxuICAgICAgICAgIHJldHVyblxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2dyYWRlOmNoYW5nZScsIGlucHV0SWQsIHZhbHVlKVxuICAgIFxuICAgIHJldHVybiBAcGFyZW50U3RlcC51cGRhdGVVc2VyQW5zd2VyKGlucHV0SWQsIHZhbHVlKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHJpdmF0ZSBNZXRob2RzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcyhAaW5wdXRUeXBlKVxuXG4gICAgQCRpbnB1dEVsID0gQCRlbC5maW5kKCdpbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy52YWx1ZSAhPSAnJyAmJiBAbW9kZWwuYXR0cmlidXRlcy50eXBlID09ICd0ZXh0J1xuICAgICAgXG4gICAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuICAgIEBob3ZlclRpbWVyID0gbnVsbFxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cblxuICBoYXNJbmZvOiAtPlxuXG4gICAgcmV0dXJuICRlbC5oYXNDbGFzcygnaGFzLWluZm8nKVxuXG5cbiAgb25Gb2N1czogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIG9uQmx1cjogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICB2YWx1ZSA9ICR0YXJnZXQudmFsKClcblxuICAgIGlmIHZhbHVlID09ICcnXG5cbiAgICAgIHVubGVzcyAkdGFyZ2V0LmlzKCc6Zm9jdXMnKVxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgaXNEaXNhYmxlZDogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHVibGljIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc3VwZXIoKVxuXG5cbiAgZ2V0SW5wdXRUeXBlT2JqZWN0OiAtPlxuXG4gICAgcmV0dXJuRGF0YSA9IHt9XG5cbiAgICByZXR1cm5EYXRhW0BpbnB1dFR5cGVdID0gdHJ1ZVxuXG4gICAgcmV0dXJuIHJldHVybkRhdGFcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIGlucHV0VHlwZU9iamVjdCA9IEBnZXRJbnB1dFR5cGVPYmplY3QoKVxuXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAndGV4dCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0dyb3VwJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnZWRpdCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ2xpbmsnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG5cbiAgXG4gICAgICBcbiAgICBcbiAgICAgIFxuXG4gICAgXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBCYXNlIFZpZXcgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuXG5yZXF1aXJlKCcuLi8uLi9oZWxwZXJzL1ZpZXdIZWxwZXInKVxuXG5jbGFzcyBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICB0ZW1wbGF0ZTogLT5cbiAgIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG4gIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBpbml0aWFsaXplOiAtPlxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApIClcbiAgICBcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgRVZFTlQgSEFORExFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Il19
