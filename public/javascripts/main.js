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
        content: ["<p><textarea id='short_description' rows='8' style='width:100%;background-color:rgba(242,242,242,1.0);border:1px solid rgba(202,202,202,1.0);'></textarea></p>"]
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
      label: 'Peer feedback',
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
  buffer += "\">\n      <span class=\"text\">Next</span>\n      <span class=\"arrow\" style=\"margin-left:5px;\">\n        <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n      </span>\n    </a>\n  </div>\n\n  <div class=\"step-nav-buttons--edit\">\n    <a href=\"#\" class=\"step-nav__button step-nav--prev cancel exit-edit\">\n      <span class=\"text\">Cancel</span>\n    </a>\n\n    <a href=\"#\" class=\"step-nav__button step-nav--next confirm exit-edit\">\n      <span class=\"text\">Confirm Edit</span>\n    </a>\n\n  </div>\n\n</div><!-- end .step-nav-buttons -->\n";
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
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates\">\n  <div class=\"custom-input-dates__label\">";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>\n  <div class=\"custom-input-dates__inner from\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearStart\" name=\"yearStart\" data-date-id=\"wizard_start_date\" data-date-type=\"year\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n        <option value=\"2017\">2017</option>\n        <option value=\"2018\">2018</option>\n        <option value=\"2019\">2019</option>\n        <option value=\"2020\">2020</option>\n        <option value=\"2021\">2021</option>\n        <option value=\"2022\">2022</option>\n        <option value=\"2023\">2023</option>\n        <option value=\"2024\">2024</option>\n        <option value=\"2025\">2025</option>\n        <option value=\"2026\">2026</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthStart\" name=\"monthStart\" data-date-id=\"wizard_start_date\" data-date-type=\"month\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayStart\" name=\"dayStart\" data-date-id=\"wizard_start_date\" data-date-type=\"day\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n  <span class=\"dates-to\">\n    to\n  </span>\n  <div class=\"custom-input-dates__inner to\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearEnd\" name=\"yearEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"year\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n        <option value=\"2017\">2017</option>\n        <option value=\"2018\">2018</option>\n        <option value=\"2019\">2019</option>\n        <option value=\"2020\">2020</option>\n        <option value=\"2021\">2021</option>\n        <option value=\"2022\">2022</option>\n        <option value=\"2023\">2023</option>\n        <option value=\"2024\">2024</option>\n        <option value=\"2025\">2025</option>\n        <option value=\"2026\">2026</option>\n      </select>\n    </div>\n    \n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthEnd\" name=\"monthEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"month\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayEnd\" name=\"dayEnd\" data-date-id=\"wizard_end_date\" data-date-type=\"day\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n\n</div>";
  return buffer;
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
        if (index === application.data.length - 1) {
          newview.isLastStep = true;
        }
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

  StepNavView.prototype.hasBeenToLastStep = false;

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
    if (this.isLastStep()) {
      return Backbone.Mediator.publish('step:edit', 'grading');
    } else {
      return Backbone.Mediator.publish('step:prev');
    }
  };

  StepNavView.prototype.nextClickHandler = function() {
    return Backbone.Mediator.publish('step:next');
  };

  StepNavView.prototype.dotClickHandler = function(e) {
    var $target;
    e.preventDefault();
    $target = $(e.currentTarget);
    if (this.hasBeenToLastStep) {
      return Backbone.Mediator.publish('step:edit', $target.data('step-id'));
    } else {
      return Backbone.Mediator.publish('step:goto', $target.data('nav-id'));
    }
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

  StepNavView.prototype.isLastStep = function() {
    return this.currentStep === this.totalSteps - 1;
  };

  StepNavView.prototype.isInactive = function(item) {
    var itIs;
    itIs = true;
    if (item === 'prev') {
      itIs = this.currentStep === 1;
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

  StepView.prototype.isLastStep = false;

  StepView.prototype.events = {
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
      $dates = $(this.datesModule({
        title: 'Course dates'
      }));
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
    } else if (this.isLastStep) {
      this.$el.addClass('step--last').html(this.template(this.model.attributes));
      $dates = $(this.datesModule({
        title: 'Assignment timeline'
      }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ291cnNlSW5mby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21haW4uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3JvdXRlcnMvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0RhdGVJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvR3JhZGluZ0lucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9JbnB1dEl0ZW1WaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0xvZ2luVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBOYXZWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3Mvc3VwZXJzL1ZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25GQTtBQUNBO0FBQ0E7O0FDSUEsSUFBQSxXQUFBOztBQUFBLFdBQUEsR0FFRTtBQUFBLEVBQUEsVUFBQSxFQUFZLFNBQUEsR0FBQTtBQUdWLFFBQUEsK0RBQUE7QUFBQSxJQUFBLE9BQUEsR0FBVSxPQUFBLENBQVEsc0JBQVIsQ0FBVixDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsSUFBRCxHQUFRLE9BRlIsQ0FBQTtBQUFBLElBTUEsUUFBQSxHQUFXLE9BQUEsQ0FBUSxrQkFBUixDQU5YLENBQUE7QUFBQSxJQVFBLFNBQUEsR0FBWSxPQUFBLENBQVEsbUJBQVIsQ0FSWixDQUFBO0FBQUEsSUFVQSxNQUFBLEdBQVMsT0FBQSxDQUFRLGtCQUFSLENBVlQsQ0FBQTtBQUFBLElBWUEsYUFBQSxHQUFnQixPQUFBLENBQVEsdUJBQVIsQ0FaaEIsQ0FBQTtBQUFBLElBY0EsVUFBQSxHQUFhLE9BQUEsQ0FBUSxvQkFBUixDQWRiLENBQUE7QUFBQSxJQWtCQSxJQUFDLENBQUEsUUFBRCxHQUFnQixJQUFBLFFBQUEsQ0FBQSxDQWxCaEIsQ0FBQTtBQUFBLElBb0JBLElBQUMsQ0FBQSxTQUFELEdBQWlCLElBQUEsU0FBQSxDQUFBLENBcEJqQixDQUFBO0FBQUEsSUFzQkEsSUFBQyxDQUFBLGFBQUQsR0FBcUIsSUFBQSxhQUFBLENBQUEsQ0F0QnJCLENBQUE7QUFBQSxJQXdCQSxJQUFDLENBQUEsVUFBRCxHQUFrQixJQUFBLFVBQUEsQ0FBQSxDQXhCbEIsQ0FBQTtXQTBCQSxJQUFDLENBQUEsTUFBRCxHQUFjLElBQUEsTUFBQSxDQUFBLEVBN0JKO0VBQUEsQ0FBWjtDQUZGLENBQUE7O0FBQUEsTUFtQ00sQ0FBQyxPQUFQLEdBQWlCLFdBbkNqQixDQUFBOzs7OztBQ05BLElBQUEsb0JBQUE7O0FBQUEsTUFBTSxDQUFDLE9BQVAsR0FBaUIsb0JBQUEsR0FBdUIsRUFBeEMsQ0FBQTs7Ozs7QUNBQSxJQUFBLGFBQUE7O0FBQUEsYUFBQSxHQUFnQjtFQUNkO0FBQUEsSUFDRSxFQUFBLEVBQUksT0FETjtBQUFBLElBRUUsS0FBQSxFQUFPLDBDQUZUO0FBQUEsSUFHRSxrQkFBQSxFQUFvQiwyQ0FIdEI7QUFBQSxJQUlFLFlBQUEsRUFBYyxFQUpoQjtBQUFBLElBS0UsTUFBQSxFQUFRLEVBTFY7QUFBQSxJQU1FLFFBQUEsRUFBVTtNQUNSO0FBQUEsUUFDRSxPQUFBLEVBQVMsQ0FDUCxvTUFETyxFQUVQLGtKQUZPLEVBR1AsdUZBSE8sQ0FEWDtPQURRO0tBTlo7R0FEYyxFQWlCZDtBQUFBLElBQ0UsRUFBQSxFQUFJLHNCQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sMkJBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVyw2QkFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLHdCQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsMGhCQUxoQjtBQUFBLElBTUUsTUFBQSxFQUFRLEVBTlY7QUFBQSxJQU9FLFFBQUEsRUFBVTtNQUNSO0FBQUEsUUFDRSxLQUFBLEVBQU8sRUFEVDtBQUFBLFFBRUUsT0FBQSxFQUFTLENBQ1AsNnNCQURPLEVBRVAsNk9BRk8sQ0FGWDtPQURRO0tBUFo7R0FqQmMsRUFrQ2Q7QUFBQSxJQUNFLEVBQUEsRUFBSSxxQkFETjtBQUFBLElBRUUsS0FBQSxFQUFPLHNCQUZUO0FBQUEsSUFHRSxTQUFBLEVBQVcscUJBSGI7QUFBQSxJQUlFLFNBQUEsRUFBVyw0QkFKYjtBQUFBLElBS0UsWUFBQSxFQUFjLG1yQkFMaEI7QUFBQSxJQU1FLE1BQUEsRUFBUSxFQU5WO0FBQUEsSUFPRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLHNaQURPLENBRlg7T0FEUSxFQU9SO0FBQUEsUUFDRSxLQUFBLEVBQU8sd0JBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLG9iQURPLEVBTVAsa0ZBTk8sQ0FGWDtPQVBRO0tBUFo7R0FsQ2MsRUE2RGQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxpQkFETjtBQUFBLElBRUUsS0FBQSxFQUFPLDhCQUZUO0FBQUEsSUFHRSxTQUFBLEVBQVcsZUFIYjtBQUFBLElBSUUsWUFBQSxFQUFjLHVTQUpoQjtBQUFBLElBS0UsU0FBQSxFQUFXLG9EQUxiO0FBQUEsSUFNRSxNQUFBLEVBQVEsRUFOVjtBQUFBLElBT0UsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCxvTUFETyxFQUVQLDR5QkFGTyxDQUZYO09BRFE7S0FQWjtHQTdEYyxFQW1GZDtBQUFBLElBQ0UsRUFBQSxFQUFJLG1CQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sbUJBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVywyREFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLHlCQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsdUdBTGhCO0FBQUEsSUFNRSxNQUFBLEVBQVEsRUFOVjtBQUFBLElBT0UsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCw2VkFETyxDQUZYO09BRFEsRUFPUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLHdCQURUO0FBQUEsUUFFRSxTQUFBLEVBQVcsSUFGYjtBQUFBLFFBR0UsT0FBQSxFQUFTLENBQ1AseVFBRE8sRUFFUCw2K0JBRk8sQ0FIWDtPQVBRLEVBcUJSO0FBQUEsUUFDRSxLQUFBLEVBQU8sYUFEVDtBQUFBLFFBRUUsU0FBQSxFQUFXLElBRmI7QUFBQSxRQUdFLE9BQUEsRUFBUyxDQUNQLGlvQkFETyxDQUhYO09BckJRLEVBZ0NSO0FBQUEsUUFDRSxLQUFBLEVBQU8sRUFEVDtBQUFBLFFBRUUsT0FBQSxFQUFTLENBQ1AsaWVBRE8sQ0FGWDtPQWhDUSxFQXNDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLDRCQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCxnYUFETyxDQUZYO09BdENRLEVBNENSO0FBQUEsUUFDRSxLQUFBLEVBQU8sd0JBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLHlhQURPLENBRlg7T0E1Q1E7S0FQWjtHQW5GYyxFQThJZDtBQUFBLElBQ0UsRUFBQSxFQUFJLG1CQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sdUJBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVywwQ0FIYjtBQUFBLElBSUUsU0FBQSxFQUFXLDZCQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWUsaVNBTGpCO0FBQUEsSUFNRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLDZqQkFETyxDQUZYO09BRFE7S0FOWjtBQUFBLElBY0UsTUFBQSxFQUFRLEVBZFY7R0E5SWMsRUE4SmQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxrQkFETjtBQUFBLElBRUUsS0FBQSxFQUFPLHNCQUZUO0FBQUEsSUFHRSxTQUFBLEVBQVcsYUFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLDRCQUpiO0FBQUEsSUFLRSxZQUFBLEVBQWMsbVJBTGhCO0FBQUEsSUFNRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLDRCQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCxzWUFETyxDQUZYO09BRFEsRUFPUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLCtCQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCxnVUFETyxDQUZYO09BUFEsRUFhUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyw0R0FGWDtPQWJRO0tBTlo7QUFBQSxJQXdCRSxNQUFBLEVBQVEsRUF4QlY7R0E5SmMsRUF3TGQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxlQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sZUFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLHFCQUhiO0FBQUEsSUFJRSxTQUFBLEVBQVcsb0RBSmI7QUFBQSxJQUtFLFlBQUEsRUFBYyxtRUFMaEI7QUFBQSxJQU1FLFFBQUEsRUFBVTtNQUNSO0FBQUEsUUFDRSxLQUFBLEVBQU8sRUFEVDtBQUFBLFFBRUUsT0FBQSxFQUFTLENBQ1AsK2tCQURPLEVBRVAseUZBRk8sQ0FGWDtPQURRO0tBTlo7QUFBQSxJQWVFLE1BQUEsRUFBUSxFQWZWO0dBeExjLEVBeU1kO0FBQUEsSUFDRSxFQUFBLEVBQUksMkJBRE47QUFBQSxJQUVFLEtBQUEsRUFBTywyQkFGVDtBQUFBLElBR0UsU0FBQSxFQUFXLG1DQUhiO0FBQUEsSUFJRSxTQUFBLEVBQVcsaUNBSmI7QUFBQSxJQUtFLFlBQUEsRUFBYyxpd0JBTGhCO0FBQUEsSUFNRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNSLGljQURRLENBRlg7T0FEUTtLQU5aO0FBQUEsSUFjRSxNQUFBLEVBQVEsRUFkVjtHQXpNYyxFQTRPZDtBQUFBLElBQ0UsRUFBQSxFQUFJLEtBRE47QUFBQSxJQUVFLEtBQUEsRUFBTyxhQUZUO0FBQUEsSUFHRSxTQUFBLEVBQVcsbUJBSGI7QUFBQSxJQUlFLFNBQUEsRUFBVyxzREFKYjtBQUFBLElBS0UsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxFQURUO0FBQUEsUUFFRSxPQUFBLEVBQVMsQ0FDUCxnWUFETyxFQUVQLHFaQUZPLEVBR1Asd1pBSE8sQ0FGWDtPQURRO0tBTFo7QUFBQSxJQWdCRSxNQUFBLEVBQVEsRUFoQlY7R0E1T2MsRUE4UGQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxJQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sc0JBRlQ7QUFBQSxJQUdFLFNBQUEsRUFBVyw0QkFIYjtBQUFBLElBSUUsU0FBQSxFQUFXLHVEQUpiO0FBQUEsSUFLRSxRQUFBLEVBQVU7TUFDUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLDhsQkFETyxFQUVQLDB2QkFGTyxDQUZYO09BRFE7S0FMWjtBQUFBLElBY0UsTUFBQSxFQUFRLEVBZFY7R0E5UGMsRUE4UWQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxTQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8sU0FGVDtBQUFBLElBR0UsU0FBQSxFQUFXLHVFQUhiO0FBQUEsSUFJRSxTQUFBLEVBQVcsZUFKYjtBQUFBLElBS0UsWUFBQSxFQUFjLDhHQUxoQjtBQUFBLElBTUUsUUFBQSxFQUFVO01BQ1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxrREFEVDtBQUFBLFFBRUUsU0FBQSxFQUFXLElBRmI7QUFBQSxRQUdFLE9BQUEsRUFBUyxDQUNQLGtGQURPLEVBRVAsZ2VBRk8sQ0FIWDtPQURRLEVBU1I7QUFBQSxRQUNFLEtBQUEsRUFBTyxzQ0FEVDtBQUFBLFFBRUUsU0FBQSxFQUFXLElBRmI7QUFBQSxRQUdFLE9BQUEsRUFBUyxDQUNQLDJSQURPLENBSFg7T0FUUSxFQWdCUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLDJHQURUO0FBQUEsUUFFRSxTQUFBLEVBQVcsSUFGYjtBQUFBLFFBR0UsT0FBQSxFQUFTLENBQ1Asd2FBRE8sRUFFUCxnVkFGTyxDQUhYO09BaEJRO0tBTlo7QUFBQSxJQWdDRSxNQUFBLEVBQVEsRUFoQ1Y7R0E5UWMsRUFnVGQ7QUFBQSxJQUNFLEVBQUEsRUFBSSxVQUROO0FBQUEsSUFFRSxLQUFBLEVBQU8scUJBRlQ7QUFBQSxJQUdFLFFBQUEsRUFBVTtNQUNSO0FBQUEsUUFDRSxLQUFBLEVBQU8sa0JBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLHFOQURPLEVBRVAsK0tBRk8sQ0FGWDtPQURRLEVBYVI7QUFBQSxRQUNFLE9BQUEsRUFBUyxDQUNQLGdLQURPLENBRFg7T0FiUSxFQWtCUjtBQUFBLFFBQ0UsT0FBQSxFQUFTLENBQ1AscUNBRE8sQ0FEWDtPQWxCUSxFQXVCUjtBQUFBLFFBQ0UsS0FBQSxFQUFPLEVBRFQ7QUFBQSxRQUVFLE9BQUEsRUFBUyxDQUNQLDRHQURPLENBRlg7T0F2QlE7S0FIWjtBQUFBLElBaUNFLE1BQUEsRUFBUSxFQWpDVjtHQWhUYztDQUFoQixDQUFBOztBQUFBLE1Bc1ZNLENBQUMsT0FBUCxHQUFpQixhQXRWakIsQ0FBQTs7Ozs7QUNBQSxJQUFBLGdCQUFBOztBQUFBLGdCQUFBLEdBR0U7QUFBQSxFQUFBLGFBQUEsRUFDRTtBQUFBLElBQUEsS0FBQSxFQUFPLHdDQUFQO0FBQUEsSUFDQSxXQUFBLEVBQWEsQ0FDWCxpekJBRFcsRUFFWCx3TkFGVyxDQURiO0FBQUEsSUFLQSxZQUFBLEVBQWMsU0FMZDtBQUFBLElBTUEsWUFBQSxFQUFjLFVBTmQ7QUFBQSxJQU9BLFFBQUEsRUFBVSxDQUNSLG1CQURRLEVBRVIseUJBRlEsQ0FQVjtBQUFBLElBV0EsT0FBQSxFQUFTLENBQ1AsZUFETyxFQUVQLHNCQUZPLENBWFQ7QUFBQSxJQWVBLG1CQUFBLEVBQXFCO01BQ25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sdUJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BRG1CLEVBS25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNEJBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BTG1CLEVBU25CO0FBQUEsUUFDRSxJQUFBLEVBQU0sd0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BVG1CLEVBYW5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sK0NBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BYm1CLEVBaUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHNCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWpCbUIsRUFxQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sNENBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BckJtQjtLQWZyQjtHQURGO0FBQUEsRUE2Q0EsY0FBQSxFQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sMkJBQVA7QUFBQSxJQUNBLFdBQUEsRUFBYSxDQUNYLDJsQkFEVyxDQURiO0FBQUEsSUFJQSxZQUFBLEVBQWMsU0FKZDtBQUFBLElBS0EsWUFBQSxFQUFjLFNBTGQ7QUFBQSxJQU1BLFFBQUEsRUFBVSxDQUNSLGVBRFEsRUFFUix5QkFGUSxDQU5WO0FBQUEsSUFVQSxPQUFBLEVBQVMsQ0FDUCwyQkFETyxDQVZUO0FBQUEsSUFhQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FickI7R0E5Q0Y7QUFBQSxFQXdGQSxPQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTyxxQkFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsd1BBRFcsQ0FEYjtBQUFBLElBSUEsWUFBQSxFQUFjLFNBSmQ7QUFBQSxJQUtBLFlBQUEsRUFBYyxTQUxkO0FBQUEsSUFNQSxRQUFBLEVBQVUsQ0FDUixtQkFEUSxDQU5WO0FBQUEsSUFTQSxPQUFBLEVBQVMsQ0FDUCwyQkFETyxDQVRUO0FBQUEsSUFZQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FackI7R0F6RkY7QUFBQSxFQWtJQSxVQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTyxrREFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsMFJBRFcsQ0FEYjtBQUFBLElBSUEsWUFBQSxFQUFjLFNBSmQ7QUFBQSxJQUtBLFlBQUEsRUFBYyxTQUxkO0FBQUEsSUFNQSxRQUFBLEVBQVUsQ0FDUixLQURRLENBTlY7QUFBQSxJQVNBLE9BQUEsRUFBUyxDQUNQLEtBRE8sQ0FUVDtBQUFBLElBWUEsbUJBQUEsRUFBcUI7TUFDbkI7QUFBQSxRQUNFLElBQUEsRUFBTSx1QkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FEbUIsRUFLbkI7QUFBQSxRQUNFLElBQUEsRUFBTSw0QkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FMbUIsRUFTbkI7QUFBQSxRQUNFLElBQUEsRUFBTSx3Q0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FUbUIsRUFhbkI7QUFBQSxRQUNFLElBQUEsRUFBTSwrQ0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FibUIsRUFpQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sc0JBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BakJtQixFQXFCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSw0Q0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FyQm1CO0tBWnJCO0dBbklGO0FBQUEsRUE0S0EsU0FBQSxFQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sa0RBQVA7QUFBQSxJQUNBLFdBQUEsRUFBYSxDQUNYLDRiQURXLENBRGI7QUFBQSxJQUlBLFlBQUEsRUFBYyxTQUpkO0FBQUEsSUFLQSxZQUFBLEVBQWMsVUFMZDtBQUFBLElBTUEsUUFBQSxFQUFVLENBQ1Isa0JBRFEsQ0FOVjtBQUFBLElBU0EsT0FBQSxFQUFTLENBQ1AsMkZBRE8sQ0FUVDtBQUFBLElBWUEsbUJBQUEsRUFBcUI7TUFDbkI7QUFBQSxRQUNFLElBQUEsRUFBTSx1QkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FEbUIsRUFLbkI7QUFBQSxRQUNFLElBQUEsRUFBTSw0QkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FMbUIsRUFTbkI7QUFBQSxRQUNFLElBQUEsRUFBTSx3Q0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FUbUIsRUFhbkI7QUFBQSxRQUNFLElBQUEsRUFBTSwrQ0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FibUIsRUFpQm5CO0FBQUEsUUFDRSxJQUFBLEVBQU0sc0JBRFI7QUFBQSxRQUVFLEtBQUEsRUFBTyxDQUZUO09BakJtQixFQXFCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSw0Q0FEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FyQm1CO0tBWnJCO0dBN0tGO0FBQUEsRUFzTkEsUUFBQSxFQUNFO0FBQUEsSUFBQSxLQUFBLEVBQU8sVUFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsMllBRFcsQ0FEYjtBQUFBLElBSUEsWUFBQSxFQUFjLFNBSmQ7QUFBQSxJQUtBLFlBQUEsRUFBYyxTQUxkO0FBQUEsSUFNQSxRQUFBLEVBQVUsQ0FDUix5QkFEUSxDQU5WO0FBQUEsSUFTQSxPQUFBLEVBQVMsQ0FDUCx3Q0FETyxDQVRUO0FBQUEsSUFZQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FackI7R0F2TkY7QUFBQSxFQWdRQSxRQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTyxtQkFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsa2NBRFcsQ0FEYjtBQUFBLElBSUEsWUFBQSxFQUFjLFNBSmQ7QUFBQSxJQUtBLFlBQUEsRUFBYyxTQUxkO0FBQUEsSUFNQSxRQUFBLEVBQVUsQ0FDUixxQ0FEUSxDQU5WO0FBQUEsSUFTQSxPQUFBLEVBQVMsQ0FDUCxzQkFETyxDQVRUO0FBQUEsSUFZQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FackI7R0FqUUY7QUFBQSxFQTBTQSxVQUFBLEVBQ0U7QUFBQSxJQUFBLEtBQUEsRUFBTywyQkFBUDtBQUFBLElBQ0EsV0FBQSxFQUFhLENBQ1gsbVVBRFcsQ0FEYjtBQUFBLElBSUEsWUFBQSxFQUFjLFNBSmQ7QUFBQSxJQUtBLFlBQUEsRUFBYyxTQUxkO0FBQUEsSUFNQSxRQUFBLEVBQVUsQ0FDUiwrREFEUSxDQU5WO0FBQUEsSUFTQSxPQUFBLEVBQVMsQ0FDUCwrQkFETyxDQVRUO0FBQUEsSUFZQSxtQkFBQSxFQUFxQjtNQUNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHVCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQURtQixFQUtuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRCQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQUxtQixFQVNuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLHdDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQVRtQixFQWFuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLCtDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQWJtQixFQWlCbkI7QUFBQSxRQUNFLElBQUEsRUFBTSxzQkFEUjtBQUFBLFFBRUUsS0FBQSxFQUFPLENBRlQ7T0FqQm1CLEVBcUJuQjtBQUFBLFFBQ0UsSUFBQSxFQUFNLDRDQURSO0FBQUEsUUFFRSxLQUFBLEVBQU8sQ0FGVDtPQXJCbUI7S0FackI7R0EzU0Y7Q0FIRixDQUFBOztBQUFBLE1BdVZNLENBQUMsT0FBUCxHQUFpQixnQkF2VmpCLENBQUE7Ozs7O0FDQUEsSUFBQSxnQkFBQTs7QUFBQSxnQkFBQSxHQUdFO0FBQUEsRUFBQSxLQUFBLEVBQ0U7QUFBQSxJQUFBLE9BQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLE1BQU47QUFBQSxNQUNBLEtBQUEsRUFBTyxpQkFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLFNBRko7QUFBQSxNQUdBLEtBQUEsRUFBTyxFQUhQO0FBQUEsTUFJQSxXQUFBLEVBQWEsRUFKYjtLQURGO0FBQUEsSUFPQSxXQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sYUFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLGFBRko7QUFBQSxNQUdBLEtBQUEsRUFBTyxFQUhQO0FBQUEsTUFJQSxXQUFBLEVBQWEsRUFKYjtLQVJGO0FBQUEsSUFjQSxNQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sWUFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLFFBRko7QUFBQSxNQUdBLEtBQUEsRUFBTyxFQUhQO0FBQUEsTUFJQSxXQUFBLEVBQWEsRUFKYjtLQWZGO0FBQUEsSUFxQkEsT0FBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sTUFBTjtBQUFBLE1BQ0EsS0FBQSxFQUFPLFNBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxTQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sRUFIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0F0QkY7QUFBQSxJQTRCQSxRQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sZ0NBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxVQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sRUFIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0E3QkY7QUFBQSxJQW1DQSxtQkFBQSxFQUNFO0FBQUEsTUFBQSxLQUFBLEVBQU8sc0JBQVA7QUFBQSxNQUNBLEVBQUEsRUFBSSxxQkFESjtBQUFBLE1BRUEsS0FBQSxFQUFPLEVBRlA7QUFBQSxNQUdBLFdBQUEsRUFBYSxFQUhiO0tBcENGO0FBQUEsSUF5Q0EsaUJBQUEsRUFDRTtBQUFBLE1BQUEsS0FBQSxFQUFPLEVBQVA7QUFBQSxNQUNBLEdBQUEsRUFBSyxFQURMO0FBQUEsTUFFQSxJQUFBLEVBQU0sRUFGTjtBQUFBLE1BR0EsS0FBQSxFQUFPLEVBSFA7S0ExQ0Y7QUFBQSxJQStDQSxlQUFBLEVBQ0U7QUFBQSxNQUFBLEtBQUEsRUFBTyxFQUFQO0FBQUEsTUFDQSxHQUFBLEVBQUssRUFETDtBQUFBLE1BRUEsSUFBQSxFQUFNLEVBRk47QUFBQSxNQUdBLEtBQUEsRUFBTyxFQUhQO0tBaERGO0dBREY7QUFBQSxFQXdEQSxvQkFBQSxFQUNFO0FBQUEsSUFBQSxhQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksZUFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywrQkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLElBSlg7QUFBQSxNQUtBLGFBQUEsRUFBZSxJQUxmO0tBREY7QUFBQSxJQVNBLFFBQUEsRUFFRTtBQUFBLE1BQUEsRUFBQSxFQUFJLFVBQUo7QUFBQSxNQUNBLFFBQUEsRUFBVSxLQURWO0FBQUEsTUFFQSxLQUFBLEVBQU8sbUJBRlA7QUFBQSxNQUdBLFNBQUEsRUFBVyxLQUhYO0FBQUEsTUFJQSxhQUFBLEVBQWUsSUFKZjtBQUFBLE1BS0EsUUFBQSxFQUFVLElBTFY7S0FYRjtBQUFBLElBbUJBLFVBQUEsRUFFRTtBQUFBLE1BQUEsRUFBQSxFQUFJLFlBQUo7QUFBQSxNQUNBLFFBQUEsRUFBVSxLQURWO0FBQUEsTUFFQSxLQUFBLEVBQU8seUJBRlA7QUFBQSxNQUdBLFNBQUEsRUFBVyxLQUhYO0FBQUEsTUFJQSxhQUFBLEVBQWUsSUFKZjtBQUFBLE1BS0EsUUFBQSxFQUFVLElBTFY7S0FyQkY7QUFBQSxJQTZCQSxjQUFBLEVBRUU7QUFBQSxNQUFBLEVBQUEsRUFBSSxnQkFBSjtBQUFBLE1BQ0EsUUFBQSxFQUFVLEtBRFY7QUFBQSxNQUVBLEtBQUEsRUFBTywyQkFGUDtBQUFBLE1BR0EsU0FBQSxFQUFXLEtBSFg7QUFBQSxNQUlBLGFBQUEsRUFBZSxJQUpmO0FBQUEsTUFLQSxRQUFBLEVBQVUsSUFMVjtLQS9CRjtBQUFBLElBdUNBLFFBQUEsRUFFRTtBQUFBLE1BQUEsRUFBQSxFQUFJLFVBQUo7QUFBQSxNQUNBLFFBQUEsRUFBVSxLQURWO0FBQUEsTUFFQSxLQUFBLEVBQU8sbUJBRlA7QUFBQSxNQUdBLFNBQUEsRUFBVyxLQUhYO0FBQUEsTUFJQSxhQUFBLEVBQWUsSUFKZjtBQUFBLE1BS0EsUUFBQSxFQUFVLElBTFY7S0F6Q0Y7QUFBQSxJQWlEQSxPQUFBLEVBRUU7QUFBQSxNQUFBLEVBQUEsRUFBSSxTQUFKO0FBQUEsTUFDQSxRQUFBLEVBQVUsS0FEVjtBQUFBLE1BRUEsS0FBQSxFQUFPLHFCQUZQO0FBQUEsTUFHQSxTQUFBLEVBQVcsS0FIWDtBQUFBLE1BSUEsYUFBQSxFQUFlLElBSmY7QUFBQSxNQUtBLFFBQUEsRUFBVSxJQUxWO0tBbkRGO0FBQUEsSUEyREEsVUFBQSxFQUVFO0FBQUEsTUFBQSxFQUFBLEVBQUksWUFBSjtBQUFBLE1BQ0EsUUFBQSxFQUFVLEtBRFY7QUFBQSxNQUVBLEtBQUEsRUFBTyw2QkFGUDtBQUFBLE1BR0EsU0FBQSxFQUFXLEtBSFg7QUFBQSxNQUlBLGFBQUEsRUFBZSxJQUpmO0FBQUEsTUFLQSxRQUFBLEVBQVUsSUFMVjtLQTdERjtBQUFBLElBcUVBLGNBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLE1BQU47QUFBQSxNQUNBLElBQUEsRUFBTSw0QkFETjtBQUFBLE1BRUEsRUFBQSxFQUFJLGdCQUZKO0FBQUEsTUFHQSxRQUFBLEVBQVUsS0FIVjtBQUFBLE1BSUEsS0FBQSxFQUFPLDRDQUpQO0FBQUEsTUFLQSxTQUFBLEVBQVcsS0FMWDtBQUFBLE1BTUEsYUFBQSxFQUFlLEtBTmY7QUFBQSxNQU9BLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLEVBQVA7QUFBQSxRQUNBLE9BQUEsRUFBUyx1UkFEVDtPQVJGO0tBdEVGO0dBekRGO0FBQUEsRUEySUEsbUJBQUEsRUFDRTtBQUFBLElBQUEsV0FBQSxFQUVFO0FBQUEsTUFBQSxFQUFBLEVBQUksYUFBSjtBQUFBLE1BQ0EsUUFBQSxFQUFVLElBRFY7QUFBQSxNQUVBLEtBQUEsRUFBTyxxQkFGUDtBQUFBLE1BR0EsU0FBQSxFQUFXLEtBSFg7QUFBQSxNQUlBLFFBQUEsRUFBVSxJQUpWO0tBRkY7QUFBQSxJQVFBLE1BQUEsRUFFRTtBQUFBLE1BQUEsRUFBQSxFQUFJLFFBQUo7QUFBQSxNQUNBLFFBQUEsRUFBVSxJQURWO0FBQUEsTUFFQSxLQUFBLEVBQU8sc0JBRlA7QUFBQSxNQUdBLFNBQUEsRUFBVyxLQUhYO0FBQUEsTUFJQSxRQUFBLEVBQVUsSUFKVjtLQVZGO0FBQUEsSUFnQkEsaUJBQUEsRUFFRTtBQUFBLE1BQUEsRUFBQSxFQUFJLG1CQUFKO0FBQUEsTUFDQSxRQUFBLEVBQVUsSUFEVjtBQUFBLE1BRUEsS0FBQSxFQUFPLDBCQUZQO0FBQUEsTUFHQSxRQUFBLEVBQVUsSUFIVjtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7S0FsQkY7QUFBQSxJQXdCQSxxQkFBQSxFQUVFO0FBQUEsTUFBQSxFQUFBLEVBQUksdUJBQUo7QUFBQSxNQUNBLFFBQUEsRUFBVSxJQURWO0FBQUEsTUFFQSxRQUFBLEVBQVUsSUFGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLDBDQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsS0FKWDtLQTFCRjtBQUFBLElBdUNBLGVBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxpQkFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTyx1Q0FIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7S0F4Q0Y7QUFBQSxJQThDQSxtQkFBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLHFCQURKO0FBQUEsTUFFQSxRQUFBLEVBQVUsS0FGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLDJDQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsS0FKWDtLQS9DRjtHQTVJRjtBQUFBLEVBbU1BLGVBQUEsRUFDRTtBQUFBLElBQUEsZ0JBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxrQkFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLElBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTyxxQkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7S0FERjtBQUFBLElBUUEsY0FBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLGdCQURKO0FBQUEsTUFFQSxRQUFBLEVBQVUsSUFGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLG1CQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsS0FKWDtLQVRGO0FBQUEsSUFnQkEsaUJBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxtQkFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTyxxQkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7S0FqQkY7QUFBQSxJQXVCQSxrQkFBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLG9CQURKO0FBQUEsTUFFQSxRQUFBLEVBQVUsS0FGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLHVCQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsS0FKWDtLQXhCRjtHQXBNRjtBQUFBLEVBbU9BLGlCQUFBLEVBQ0U7QUFBQSxJQUFBLFlBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxjQURKO0FBQUEsTUFFQSxRQUFBLEVBQVUsS0FGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLDZCQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsS0FKWDtBQUFBLE1BS0EsWUFBQSxFQUFjLElBTGQ7S0FERjtBQUFBLElBUUEsZ0JBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxrQkFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTyx3QkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7QUFBQSxNQUtBLFlBQUEsRUFBYyxJQUxkO0tBVEY7QUFBQSxJQWdCQSxZQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksY0FESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTyw4REFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7QUFBQSxNQUtBLGlCQUFBLEVBQ0U7QUFBQSxRQUFBLFlBQUEsRUFBYyx5Q0FBZDtBQUFBLFFBQ0EsZ0JBQUEsRUFBa0IsaURBRGxCO09BTkY7S0FqQkY7R0FwT0Y7QUFBQSxFQWdRQSxpQkFBQSxFQUNFO0FBQUEsSUFBQSxjQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksZ0JBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8scUJBSFA7QUFBQSxNQUlBLFNBQUEsRUFBVyxLQUpYO0FBQUEsTUFLQSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyxxQkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUFTLCtMQURUO09BTkY7S0FERjtBQUFBLElBVUEsVUFBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLFlBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8sd0JBSFA7QUFBQSxNQUlBLFNBQUEsRUFBVyxLQUpYO0FBQUEsTUFLQSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyx3QkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUNFLDBnQ0FGRjtPQU5GO0tBWEY7R0FqUUY7QUFBQSxFQXlSQSxnQkFBQSxFQUNFO0FBQUEsSUFBQSxTQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksV0FESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywwQkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7S0FERjtBQUFBLElBT0EsT0FBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLFNBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8sK0JBSFA7QUFBQSxNQUlBLFNBQUEsRUFBVyxLQUpYO0tBUkY7R0ExUkY7QUFBQSxFQXlTQSxhQUFBLEVBQ0U7QUFBQSxJQUFBLFlBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFlBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxjQURKO0FBQUEsTUFFQSxLQUFBLEVBQU8sRUFGUDtBQUFBLE1BR0EsS0FBQSxFQUFPLEdBSFA7QUFBQSxNQUlBLFFBQUEsRUFBVSxDQUpWO0FBQUEsTUFLQSxPQUFBLEVBQVM7UUFDUDtBQUFBLFVBQ0UsRUFBQSxFQUFJLENBRE47QUFBQSxVQUVFLElBQUEsRUFBTSxjQUZSO0FBQUEsVUFHRSxLQUFBLEVBQU8sR0FIVDtBQUFBLFVBSUUsS0FBQSxFQUFPLEdBSlQ7QUFBQSxVQUtFLFFBQUEsRUFBVSxLQUxaO1NBRE8sRUFRUDtBQUFBLFVBQ0UsRUFBQSxFQUFJLENBRE47QUFBQSxVQUVFLElBQUEsRUFBTSxjQUZSO0FBQUEsVUFHRSxLQUFBLEVBQU8sR0FIVDtBQUFBLFVBSUUsS0FBQSxFQUFPLEdBSlQ7QUFBQSxVQUtFLFFBQUEsRUFBVSxJQUxaO1NBUk8sRUFlUDtBQUFBLFVBQ0UsRUFBQSxFQUFJLENBRE47QUFBQSxVQUVFLElBQUEsRUFBTSxjQUZSO0FBQUEsVUFHRSxLQUFBLEVBQU8sR0FIVDtBQUFBLFVBSUUsS0FBQSxFQUFPLEdBSlQ7QUFBQSxVQUtFLFFBQUEsRUFBVSxLQUxaO1NBZk8sRUFzQlA7QUFBQSxVQUNFLEVBQUEsRUFBSSxDQUROO0FBQUEsVUFFRSxJQUFBLEVBQU0sY0FGUjtBQUFBLFVBR0UsS0FBQSxFQUFPLEdBSFQ7QUFBQSxVQUlFLEtBQUEsRUFBTyxHQUpUO0FBQUEsVUFLRSxRQUFBLEVBQVUsS0FMWjtTQXRCTyxFQTZCUDtBQUFBLFVBQ0UsRUFBQSxFQUFJLENBRE47QUFBQSxVQUVFLElBQUEsRUFBTSxjQUZSO0FBQUEsVUFHRSxLQUFBLEVBQU8sR0FIVDtBQUFBLFVBSUUsS0FBQSxFQUFPLEdBSlQ7QUFBQSxVQUtFLFFBQUEsRUFBVSxLQUxaO1NBN0JPO09BTFQ7S0FERjtHQTFTRjtBQUFBLEVBd1ZBLHlCQUFBLEVBQ0U7QUFBQSxJQUFBLFVBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxZQURKO0FBQUEsTUFFQSxRQUFBLEVBQVUsS0FGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLDBCQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsS0FKWDtBQUFBLE1BS0EsT0FBQSxFQUNFO0FBQUEsUUFBQSxLQUFBLEVBQU8sZ0NBQVA7QUFBQSxRQUNBLE9BQUEsRUFBUyxxYkFEVDtPQU5GO0tBREY7QUFBQSxJQVVBLGtCQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksb0JBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8sd0JBSFA7QUFBQSxNQUlBLFNBQUEsRUFBVyxLQUpYO0FBQUEsTUFLQSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyx5Q0FBUDtBQUFBLFFBQ0EsT0FBQSxFQUFTLDBRQURUO09BTkY7S0FYRjtBQUFBLElBb0JBLGdCQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksa0JBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8sa0JBSFA7QUFBQSxNQUlBLFNBQUEsRUFBVyxLQUpYO0FBQUEsTUFLQSxPQUFBLEVBQ0U7QUFBQSxRQUFBLEtBQUEsRUFBTyxrQkFBUDtBQUFBLFFBQ0EsT0FBQSxFQUFTLDZZQURUO09BTkY7S0FyQkY7QUFBQSxJQThCQSxTQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxVQUFOO0FBQUEsTUFDQSxFQUFBLEVBQUksV0FESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTyxxQkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7QUFBQSxNQUtBLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLHFCQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsd1lBRFQ7T0FORjtLQS9CRjtBQUFBLElBd0NBLGNBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxnQkFESjtBQUFBLE1BRUEsUUFBQSxFQUFVLEtBRlY7QUFBQSxNQUdBLEtBQUEsRUFBTywyQkFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7QUFBQSxNQUtBLE9BQUEsRUFDRTtBQUFBLFFBQUEsS0FBQSxFQUFPLDJCQUFQO0FBQUEsUUFDQSxPQUFBLEVBQVMsNlpBRFQ7T0FORjtLQXpDRjtBQUFBLElBa0RBLGFBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFVBQU47QUFBQSxNQUNBLEVBQUEsRUFBSSxlQURKO0FBQUEsTUFFQSxRQUFBLEVBQVUsS0FGVjtBQUFBLE1BR0EsS0FBQSxFQUFPLG1CQUhQO0FBQUEsTUFJQSxTQUFBLEVBQVcsSUFKWDtLQW5ERjtHQXpWRjtBQUFBLEVBa1pBLEdBQUEsRUFDRTtBQUFBLElBQUEsR0FBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLEtBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8sZUFIUDtBQUFBLE1BSUEsU0FBQSxFQUFXLEtBSlg7S0FERjtHQW5aRjtBQUFBLEVBMFpBLEVBQUEsRUFDRTtBQUFBLElBQUEsRUFBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sVUFBTjtBQUFBLE1BQ0EsRUFBQSxFQUFJLElBREo7QUFBQSxNQUVBLFFBQUEsRUFBVSxLQUZWO0FBQUEsTUFHQSxLQUFBLEVBQU8sMEJBSFA7QUFBQSxNQUlBLFNBQUEsRUFBVyxLQUpYO0tBREY7R0EzWkY7QUFBQSxFQWthQSxPQUFBLEVBQ0U7QUFBQSxJQUFBLG1CQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxTQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sMEJBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxxQkFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLENBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0FBQUEsTUFLQSxXQUFBLEVBQWEsRUFMYjtLQURGO0FBQUEsSUFRQSxlQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxTQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sOEJBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxpQkFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLENBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0tBVEY7QUFBQSxJQWVBLGlCQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxTQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sbUJBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxtQkFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLENBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0tBaEJGO0FBQUEsSUFzQkEsaUJBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFNBQU47QUFBQSxNQUNBLEtBQUEsRUFBTyxzQkFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLG1CQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sQ0FIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0F2QkY7QUFBQSxJQTZCQSxnQkFBQSxFQUNFO0FBQUEsTUFBQSxJQUFBLEVBQU0sU0FBTjtBQUFBLE1BQ0EsS0FBQSxFQUFPLHNCQURQO0FBQUEsTUFFQSxFQUFBLEVBQUksa0JBRko7QUFBQSxNQUdBLEtBQUEsRUFBTyxDQUhQO0FBQUEsTUFJQSxXQUFBLEVBQWEsRUFKYjtLQTlCRjtBQUFBLElBb0NBLGFBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFNBQU47QUFBQSxNQUNBLEtBQUEsRUFBTyxlQURQO0FBQUEsTUFFQSxFQUFBLEVBQUksZUFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLENBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0tBckNGO0FBQUEsSUEyQ0EseUJBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLFNBQU47QUFBQSxNQUNBLEtBQUEsRUFBTywyQkFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLDJCQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sQ0FIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0E1Q0Y7QUFBQSxJQWtEQSxpQkFBQSxFQUNFO0FBQUEsTUFBQSxLQUFBLEVBQU8sbUJBQVA7QUFBQSxNQUNBLEVBQUEsRUFBSSxtQkFESjtBQUFBLE1BRUEsS0FBQSxFQUFPLEVBRlA7QUFBQSxNQUdBLE9BQUEsRUFDRTtBQUFBLFFBQUEsT0FBQSxFQUNFO0FBQUEsVUFBQSxLQUFBLEVBQU8sWUFBUDtBQUFBLFVBQ0EsS0FBQSxFQUFPLFNBRFA7QUFBQSxVQUVBLFFBQUEsRUFBVSxJQUZWO1NBREY7QUFBQSxRQUlBLE1BQUEsRUFDRTtBQUFBLFVBQUEsS0FBQSxFQUFPLFFBQVA7QUFBQSxVQUNBLEtBQUEsRUFBTyxRQURQO0FBQUEsVUFFQSxRQUFBLEVBQVUsS0FGVjtTQUxGO09BSkY7S0FuREY7R0FuYUY7QUFBQSxFQXVlQSxRQUFBLEVBQ0U7QUFBQSxJQUFBLG1CQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sMEJBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxxQkFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLEVBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0tBREY7QUFBQSxJQU9BLGVBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLE1BQU47QUFBQSxNQUNBLEtBQUEsRUFBTyw4QkFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLGlCQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sRUFIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0FSRjtBQUFBLElBY0EsaUJBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLE1BQU47QUFBQSxNQUNBLEtBQUEsRUFBTyxtQkFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLG1CQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sRUFIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0FmRjtBQUFBLElBcUJBLGlCQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sdUJBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSxtQkFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLEVBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0tBdEJGO0FBQUEsSUE0QkEsZ0JBQUEsRUFDRTtBQUFBLE1BQUEsSUFBQSxFQUFNLE1BQU47QUFBQSxNQUNBLEtBQUEsRUFBTyxzQkFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLGtCQUZKO0FBQUEsTUFHQSxLQUFBLEVBQU8sRUFIUDtBQUFBLE1BSUEsV0FBQSxFQUFhLEVBSmI7S0E3QkY7QUFBQSxJQW1DQSxhQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sZUFEUDtBQUFBLE1BRUEsRUFBQSxFQUFJLGVBRko7QUFBQSxNQUdBLEtBQUEsRUFBTyxFQUhQO0FBQUEsTUFJQSxXQUFBLEVBQWEsRUFKYjtLQXBDRjtBQUFBLElBMENBLHlCQUFBLEVBQ0U7QUFBQSxNQUFBLElBQUEsRUFBTSxNQUFOO0FBQUEsTUFDQSxLQUFBLEVBQU8sMkJBRFA7QUFBQSxNQUVBLEVBQUEsRUFBSSwyQkFGSjtBQUFBLE1BR0EsS0FBQSxFQUFPLEVBSFA7QUFBQSxNQUlBLFdBQUEsRUFBYSxFQUpiO0tBM0NGO0FBQUEsSUFrREEsaUJBQUEsRUFDRTtBQUFBLE1BQUEsS0FBQSxFQUFPLEVBQVA7QUFBQSxNQUNBLEdBQUEsRUFBSyxFQURMO0FBQUEsTUFFQSxJQUFBLEVBQU0sRUFGTjtLQW5ERjtBQUFBLElBdURBLGVBQUEsRUFDRTtBQUFBLE1BQUEsS0FBQSxFQUFPLEVBQVA7QUFBQSxNQUNBLEdBQUEsRUFBSyxFQURMO0FBQUEsTUFFQSxJQUFBLEVBQU0sRUFGTjtLQXhERjtHQXhlRjtDQUhGLENBQUE7O0FBQUEsTUFnakJNLENBQUMsT0FBUCxHQUFpQixnQkFoakJqQixDQUFBOzs7OztBQ01BLFVBQVUsQ0FBQyxjQUFYLENBQTJCLE1BQTNCLEVBQW1DLFNBQUUsSUFBRixFQUFRLEdBQVIsR0FBQTtBQUVqQyxNQUFBLE1BQUE7QUFBQSxFQUFBLElBQUEsR0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLGdCQUFqQixDQUFtQyxJQUFuQyxDQUFQLENBQUE7QUFBQSxFQUNBLEdBQUEsR0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLGdCQUFqQixDQUFtQyxHQUFuQyxDQURQLENBQUE7QUFBQSxFQUdBLE1BQUEsR0FBUyxXQUFBLEdBQWMsR0FBZCxHQUFvQixJQUFwQixHQUEyQixJQUEzQixHQUFrQyxNQUgzQyxDQUFBO0FBS0EsU0FBVyxJQUFBLFVBQVUsQ0FBQyxVQUFYLENBQXVCLE1BQXZCLENBQVgsQ0FQaUM7QUFBQSxDQUFuQyxDQUFBLENBQUE7Ozs7O0FDREEsSUFBQSxXQUFBOztBQUFBLFdBQUEsR0FBYyxPQUFBLENBQVEsT0FBUixDQUFkLENBQUE7O0FBQUEsQ0FHQSxDQUFFLFNBQUEsR0FBQTtBQUdBLEVBQUEsV0FBVyxDQUFDLFVBQVosQ0FBQSxDQUFBLENBQUE7U0FHQSxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQWpCLENBQUEsRUFOQTtBQUFBLENBQUYsQ0FIQSxDQUFBOzs7OztBQ0NBLElBQUEsZ0JBQUE7RUFBQTtpU0FBQTs7QUFBQSxLQUFBLEdBQVEsT0FBQSxDQUFRLHdCQUFSLENBQVIsQ0FBQTs7QUFBQSxNQUVNLENBQUMsT0FBUCxHQUF1QjtBQUFOLDhCQUFBLENBQUE7Ozs7R0FBQTs7bUJBQUE7O0dBQXdCLE1BRnpDLENBQUE7Ozs7O0FDQUEsSUFBQSxLQUFBO0VBQUE7aVNBQUE7O0FBQUEsTUFBTSxDQUFDLE9BQVAsR0FBdUI7QUFBTiwwQkFBQSxDQUFBOzs7O0dBQUE7O2VBQUE7O0dBQW9CLFFBQVEsQ0FBQyxNQUE5QyxDQUFBOzs7OztBQ0FBLElBQUEscUNBQUE7RUFBQTtpU0FBQTs7QUFBQSxXQUFBLEdBQWMsT0FBQSxDQUFTLFFBQVQsQ0FBZCxDQUFBOztBQUFBLGdCQUdBLEdBQW1CLE9BQUEsQ0FBUSwwQkFBUixDQUhuQixDQUFBOztBQUFBLE1BS00sQ0FBQyxPQUFQLEdBQXVCO0FBTXJCLDJCQUFBLENBQUE7Ozs7R0FBQTs7QUFBQSxtQkFBQSxNQUFBLEdBQ0U7QUFBQSxJQUFBLEVBQUEsRUFBSyxNQUFMO0dBREYsQ0FBQTs7QUFBQSxtQkFPQSxJQUFBLEdBQU0sU0FBQSxHQUFBO0FBQ0osSUFBQSxJQUFHLENBQUEsQ0FBRSxNQUFGLENBQVMsQ0FBQyxNQUFWLEdBQW1CLENBQXRCO0FBRUUsTUFBQSxJQUFDLENBQUEsZUFBRCxHQUFtQixDQUFBLENBQUcsTUFBSCxDQUFXLENBQUMsSUFBWixDQUFpQixlQUFqQixDQUFuQixDQUFBO0FBQUEsTUFFQSxnQkFBaUIsQ0FBQSxPQUFBLENBQVMsQ0FBQSxxQkFBQSxDQUF1QixDQUFBLE9BQUEsQ0FBakQsR0FBNEQsSUFBQyxDQUFBLGVBRjdELENBQUE7QUFBQSxNQUlBLENBQUEsQ0FBRyxNQUFILENBQVcsQ0FBQyxJQUFaLENBQWlCLFdBQVcsQ0FBQyxRQUFRLENBQUMsTUFBckIsQ0FBQSxDQUE2QixDQUFDLEVBQS9DLENBSkEsQ0FBQTtBQU1BLE1BQUEsSUFBRyxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsTUFBcEIsQ0FBSDtlQUVFLFFBQVEsQ0FBQyxRQUFRLENBQUMsT0FBbEIsQ0FBMEIsV0FBMUIsRUFBdUMsSUFBQyxDQUFBLGtCQUFELENBQW9CLE1BQXBCLENBQXZDLEVBRkY7T0FBQSxNQUlLLElBQUcsSUFBQyxDQUFBLGtCQUFELENBQW9CLFFBQXBCLENBQUg7ZUFFSCxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQWxCLENBQTBCLGFBQTFCLEVBQXlDLElBQUMsQ0FBQSxrQkFBRCxDQUFvQixRQUFwQixDQUF6QyxFQUZHO09BWlA7S0FBQSxNQWlCSyxJQUFHLENBQUEsQ0FBRSxRQUFGLENBQVcsQ0FBQyxNQUFaLEdBQXFCLENBQXhCO2FBRUgsQ0FBQyxDQUFBLENBQUUsUUFBRixDQUFELENBQVksQ0FBQyxJQUFiLENBQWtCLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBdEIsQ0FBQSxDQUE4QixDQUFDLEVBQWpELEVBRkc7S0FsQkQ7RUFBQSxDQVBOLENBQUE7O0FBQUEsbUJBaUNBLGtCQUFBLEdBQW9CLFNBQUMsSUFBRCxHQUFBO0FBRWxCLFFBQUEsY0FBQTtBQUFBLElBQUEsSUFBQSxHQUFPLElBQUksQ0FBQyxPQUFMLENBQWEsTUFBYixFQUFxQixLQUFyQixDQUEyQixDQUFDLE9BQTVCLENBQW9DLE1BQXBDLEVBQTRDLEtBQTVDLENBQVAsQ0FBQTtBQUFBLElBRUEsS0FBQSxHQUFZLElBQUEsTUFBQSxDQUFPLFFBQUEsR0FBVyxJQUFYLEdBQWtCLFdBQXpCLENBRlosQ0FBQTtBQUFBLElBSUEsT0FBQSxHQUFVLEtBQUssQ0FBQyxJQUFOLENBQVcsUUFBUSxDQUFDLE1BQXBCLENBSlYsQ0FBQTtBQU1DLElBQUEsSUFBTyxlQUFQO2FBQXFCLEdBQXJCO0tBQUEsTUFBQTthQUE2QixrQkFBQSxDQUFtQixPQUFRLENBQUEsQ0FBQSxDQUFFLENBQUMsT0FBWCxDQUFtQixLQUFuQixFQUEwQixHQUExQixDQUFuQixFQUE3QjtLQVJpQjtFQUFBLENBakNwQixDQUFBOztnQkFBQTs7R0FOb0MsUUFBUSxDQUFDLE9BTC9DLENBQUE7Ozs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFBLE1BQVQsRUFBaUIsSUFBakIsRUFEQTtFQUFBLENBckJaLENBQUE7O0FBQUEsaUJBMkJBLE1BQUEsR0FBUSxTQUFBLEdBQUE7QUFDTixJQUFBLElBQUMsQ0FBQSxHQUFHLENBQUMsSUFBTCxDQUFXLElBQUMsQ0FBQSxRQUFELENBQVcsSUFBQyxDQUFBLGFBQUQsQ0FBQSxDQUFYLENBQVgsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBRkEsQ0FBQTtBQUlBLFdBQU8sSUFBUCxDQUxNO0VBQUEsQ0EzQlIsQ0FBQTs7QUFBQSxpQkFxQ0EsV0FBQSxHQUFhLFNBQUEsR0FBQSxDQXJDYixDQUFBOztBQXVDQTtBQUFBOzs7S0F2Q0E7O0FBMkNBO0FBQUE7OztLQTNDQTs7QUErQ0E7QUFBQTs7O0tBL0NBOztjQUFBOztHQUZpQixRQUFRLENBQUMsS0FGNUIsQ0FBQTs7QUFBQSxNQXVETSxDQUFDLE9BQVAsR0FBaUIsSUF2RGpCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2hpbnQgZXFudWxsOiB0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuXG52YXIgSGFuZGxlYmFycyA9IHt9O1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZFUlNJT04gPSBcIjEuMC4wXCI7XG5IYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OID0gNDtcblxuSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcblxuSGFuZGxlYmFycy5oZWxwZXJzICA9IHt9O1xuSGFuZGxlYmFycy5wYXJ0aWFscyA9IHt9O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGZ1bmN0aW9uVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyID0gZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsID0gZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcblxuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm4odGhpcyk7XG4gIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5LID0gZnVuY3Rpb24oKSB7fTtcblxuSGFuZGxlYmFycy5jcmVhdGVGcmFtZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24ob2JqZWN0KSB7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBvYmplY3Q7XG4gIHZhciBvYmogPSBuZXcgSGFuZGxlYmFycy5LKCk7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBudWxsO1xuICByZXR1cm4gb2JqO1xufTtcblxuSGFuZGxlYmFycy5sb2dnZXIgPSB7XG4gIERFQlVHOiAwLCBJTkZPOiAxLCBXQVJOOiAyLCBFUlJPUjogMywgbGV2ZWw6IDMsXG5cbiAgbWV0aG9kTWFwOiB7MDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcid9LFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChIYW5kbGViYXJzLmxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IEhhbmRsZWJhcnMubG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy5sb2cgPSBmdW5jdGlvbihsZXZlbCwgb2JqKSB7IEhhbmRsZWJhcnMubG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgZGF0YSA9IEhhbmRsZWJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgfVxuXG4gIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgaWYoY29udGV4dCBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYoZGF0YSkgeyBkYXRhLmtleSA9IGtleTsgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihpID09PSAwKXtcbiAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb25kaXRpb25hbCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICBpZighY29uZGl0aW9uYWwgfHwgSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZufSk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmICghSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgSGFuZGxlYmFycy5sb2cobGV2ZWwsIGNvbnRleHQpO1xufSk7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WTSA9IHtcbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKHRlbXBsYXRlU3BlYykge1xuICAgIC8vIEp1c3QgYWRkIHdhdGVyXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICAgIGludm9rZVBhcnRpYWw6IEhhbmRsZWJhcnMuVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgICB9LFxuICAgICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgICAgcmV0ID0ge307XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogSGFuZGxlYmFycy5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgICAgbm9vcDogSGFuZGxlYmFycy5WTS5ub29wLFxuICAgICAgY29tcGlsZXJJbmZvOiBudWxsXG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChjb250YWluZXIsIEhhbmRsZWJhcnMsIGNvbnRleHQsIG9wdGlvbnMuaGVscGVycywgb3B0aW9ucy5wYXJ0aWFscywgb3B0aW9ucy5kYXRhKTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyA9IGNvbnRhaW5lci5jb21waWxlckluZm8gfHwgW10sXG4gICAgICAgICAgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IEhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxuXG4gIHByb2dyYW1XaXRoRGVwdGg6IGZ1bmN0aW9uKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IDA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIG5vb3A6IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJcIjsgfSxcbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKCFIYW5kbGViYXJzLmNvbXBpbGUpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gSGFuZGxlYmFycy5jb21waWxlKHBhcnRpYWwsIHtkYXRhOiBkYXRhICE9PSB1bmRlZmluZWR9KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMudGVtcGxhdGUgPSBIYW5kbGViYXJzLlZNLnRlbXBsYXRlO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG5cbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gQkVHSU4oQlJPV1NFUilcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5IYW5kbGViYXJzLkV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufTtcbkhhbmRsZWJhcnMuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuSGFuZGxlYmFycy5TYWZlU3RyaW5nID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufTtcbkhhbmRsZWJhcnMuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5nLnRvU3RyaW5nKCk7XG59O1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxudmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn07XG5cbkhhbmRsZWJhcnMuVXRpbHMgPSB7XG4gIGV4dGVuZDogZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXNjYXBlRXhwcmVzc2lvbjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBIYW5kbGViYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsIHx8IHN0cmluZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9IHN0cmluZy50b1N0cmluZygpO1xuXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZih0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMnKS5jcmVhdGUoKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcycpLmF0dGFjaChleHBvcnRzKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzJykuYXR0YWNoKGV4cG9ydHMpIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgREVTSUdOIFdJWkFSRFxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICAjIEFwcCBEYXRhXG4gICAgQXBwRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb250ZW50JylcblxuICAgIEBkYXRhID0gQXBwRGF0YVxuXG5cbiAgICAjIEltcG9ydCB2aWV3c1xuICAgIEhvbWVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Ib21lVmlldycpXG5cbiAgICBMb2dpblZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0xvZ2luVmlldycpXG5cbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuICAgIElucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG4gICAgT3V0cHV0VmlldyA9IHJlcXVpcmUoJy4vdmlld3MvT3V0cHV0VmlldycpXG5cblxuICAgICMgSW5pdGlhbGl6ZSB2aWV3c1xuICAgIEBob21lVmlldyA9IG5ldyBIb21lVmlldygpXG5cbiAgICBAbG9naW5WaWV3ID0gbmV3IExvZ2luVmlldygpXG5cbiAgICBAaW5wdXRJdGVtVmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KClcblxuICAgIEBvdXRwdXRWaWV3ID0gbmV3IE91dHB1dFZpZXcoKVxuXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXG4gICAgXG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uIiwibW9kdWxlLmV4cG9ydHMgPSBXaXphcmRBc3NpZ25tZW50RGF0YSA9IHtcblxufSIsIldpemFyZENvbnRlbnQgPSBbXG4gIHtcbiAgICBpZDogXCJpbnRyb1wiXG4gICAgdGl0bGU6ICdXZWxjb21lIHRvIHRoZSBBc3NpZ25tZW50IERlc2lnbiBXaXphcmQhJ1xuICAgIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICAgIGluc3RydWN0aW9uczogJydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCB3YWxrIHlvdSB0aHJvdWdoIGJlc3QgcHJhY3RpY2VzIGZvciBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnRzIGFuZCBoZWxwIHlvdSBjcmVhdGUgYSBjdXN0b21pemVkIHN5bGxhYnVzIGZvciB5b3VyIGNvdXJzZSwgYnJva2VuIGludG8gd2Vla2x5IGFzc2lnbm1lbnRzLjwvcD5cIlxuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UgY2FuIHB1Ymxpc2ggYSByZWFkeS10by11c2UgbGVzc29uIHBsYW4gb250byBhIHdpa2kgcGFnZSwgd2hlcmUgaXQgY2FuIGJlIGN1c3RvbWl6ZWQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPkxldOKAmXMgc3RhcnQgYnkgZmlsbGluZyBpbiBzb21lIGJhc2ljcyBhYm91dCB5b3UgYW5kIHlvdXIgY291cnNlOjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJhc3NpZ25tZW50X3NlbGVjdGlvblwiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGFzc2lnbm1lbnQgc2VsZWN0aW9ucydcbiAgICBmb3JtVGl0bGU6ICdBdmFpbGFibGUgYXNzaWdubWVudHM6J1xuICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGZpdHMgb24gV2lraXBlZGlhIGFuZCBhY2hpZXZlcyB5b3VyIHN0dWRlbnQgbGVhcm5pbmcgb2JqZWN0aXZlcy4gWW91ciBmaXJzdCBzdGVwIGlzIHRvIGNob29zZSB3aGljaCBhc3NpZ25tZW50KHMpIHlvdSdsbCBiZSBhc2tpbmcgeW91ciBzdHVkZW50cyB0byBjb21wbGV0ZSBhcyBwYXJ0IG9mIHRoZSBjb3Vyc2UuIFdlJ3ZlIGNyZWF0ZWQgc29tZSBndWlkZWxpbmVzIHRvIGhlbHAgeW91LCBidXQgeW91J2xsIG5lZWQgdG8gbWFrZSBzb21lIGtleSBkZWNpc2lvbnMsIHN1Y2ggYXM6IHdoaWNoIGxlYXJuaW5nIG9iamVjdGl2ZXMgYXJlIHlvdSB0YXJnZXRpbmcgd2l0aCB0aGlzIGFzc2lnbm1lbnQ/IFdoYXQgc2tpbGxzIGRvIHlvdXIgc3R1ZGVudHMgYWxyZWFkeSBoYXZlPyBIb3cgbXVjaCB0aW1lIGNhbiB5b3UgZGV2b3RlIHRvIHRoZSBhc3NpZ25tZW50P1wiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Nb3N0IGluc3RydWN0b3JzIGFzayB0aGVpciBzdHVkZW50cyB0byB3cml0ZSBhbiBhcnRpY2xlLiBTdHVkZW50cyBzdGFydCBieSBsZWFybmluZyB0aGUgYmFzaWNzIG9mIFdpa2lwZWRpYSwgYW5kIHRoZW4gdGhleSBmb2N1cyBvbiB0aGUgY29udGVudC4gVGhleSBwbGFuLCByZXNlYXJjaCwgd3JpdGUsIGFuZCByZXZpc2UgYSBwcmV2aW91c2x5IG1pc3NpbmcgV2lraXBlZGlhIGFydGljbGUgb3IgY29udHJpYnV0ZSB0byBhbiBleGlzdGluZyBlbnRyeSBvbiBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHRoYXQgaXMgaW5jb21wbGV0ZS4gVGhpcyBhc3NpZ25tZW50IHR5cGljYWxseSByZXBsYWNlcyBhIHRlcm0gcGFwZXIgb3IgcmVzZWFyY2ggcHJvamVjdCwgb3IgaXQgZm9ybXMgdGhlIGxpdGVyYXR1cmUgcmV2aWV3IHNlY3Rpb24gb2YgYSBsYXJnZXIgcGFwZXIuIFRoZSBzdHVkZW50IGxlYXJuaW5nIG91dGNvbWUgaXMgaGlnaCB3aXRoIHRoaXMgYXNzaWdubWVudCwgYnV0IGl0IGRvZXMgdGFrZSBhIHNpZ25pZmljYW50IGFtb3VudCBvZiB0aW1lLiBUbyBsZWFybiBob3cgdG8gY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIHlvdXIgc3R1ZGVudHMgbmVlZCB0byBsZWFybiBib3RoIHRoZSB3aWtpIG1hcmt1cCBsYW5ndWFnZSBhbmQga2V5IHBvbGljaWVzIGFuZCBleHBlY3RhdGlvbnMgb2YgdGhlIFdpa2lwZWRpYS1lZGl0aW5nIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICBcIjxwPklmIHdyaXRpbmcgYW4gYXJ0aWNsZSBpc24ndCByaWdodCBmb3IgeW91ciBjbGFzcywgb3RoZXIgYXNzaWdubWVudCBvcHRpb25zIHN0aWxsIGdpdmUgc3R1ZGVudHMgdmFsdWFibGUgbGVhcm5pbmcgb3Bwb3J0dW5pdGllcyBhcyB0aGV5IGltcHJvdmUgV2lraXBlZGlhLiBTZWxlY3QgYW4gYXNzaWdubWVudCB0eXBlIHRvIHRoZSBsZWZ0IHRvIGxlYXJuIG1vcmUgYWJvdXQgZWFjaCBhc3NpZ25tZW50LjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJsZWFybmluZ19lc3NlbnRpYWxzXCJcbiAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmUgb3IgbW9yZTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgV2lraXBlZGlhIGVzc2VudGlhbHMnXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIlRvIGdldCBzdGFydGVkLCB5b3UnbGwgd2FudCB0byBpbnRyb2R1Y2UgeW91ciBzdHVkZW50cyB0byB0aGUgYmFzaWMgcnVsZXMgb2Ygd3JpdGluZyBXaWtpcGVkaWEgYXJ0aWNsZXMgYW5kIHdvcmtpbmcgd2l0aCB0aGUgV2lraXBlZGlhIGNvbW11bml0eS4gQXMgdGhlaXIgZmlyc3QgV2lraXBlZGlhIGFzc2lnbm1lbnQgbWlsZXN0b25lLCB5b3UgY2FuIGFzayB0aGUgc3R1ZGVudHMgdG8gY3JlYXRlIGFjY291bnRzIGFuZCB0aGVuIGNvbXBsZXRlIHRoZSAnJ29ubGluZSB0cmFpbmluZyBmb3Igc3R1ZGVudHMnJy4gVGhpcyB0cmFpbmluZyBpbnRyb2R1Y2VzIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5IGFuZCBob3cgaXQgd29ya3MsIGRlbW9uc3RyYXRlcyB0aGUgYmFzaWNzIG9mIGVkaXRpbmcgYW5kIHdhbGtzIHN0dWRlbnRzIHRocm91Z2ggdGhlaXIgZmlyc3QgZWRpdHMsIGdpdmVzIGFkdmljZSBmb3Igc2VsZWN0aW5nIGFydGljbGVzIGFuZCBkcmFmdGluZyByZXZpc2lvbnMsIGFuZCBleHBsYWlucyBmdXJ0aGVyIHNvdXJjZXMgb2Ygc3VwcG9ydCBhcyB0aGV5IGNvbnRpbnVlIGFsb25nLiBJdCB0YWtlcyBhYm91dCBhbiBob3VyIGFuZCBlbmRzIHdpdGggYSBjZXJ0aWZpY2F0aW9uIHN0ZXAsIHdoaWNoIHlvdSBjYW4gdXNlIHRvIHZlcmlmeSB0aGF0IHN0dWRlbnRzIGNvbXBsZXRlZCB0aGUgdHJhaW5pbmcuXCJcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+VGhpcyB0cmFpbmluZyBpbnRyb2R1Y2VzIHRoZSBXaWtpcGVkaWEgY29tbXVuaXR5IGFuZCBob3cgaXQgd29ya3MsIGRlbW9uc3RyYXRlcyB0aGUgYmFzaWNzIG9mIGVkaXRpbmcgYW5kIHdhbGtzIHN0dWRlbnRzIHRocm91Z2ggdGhlaXIgZmlyc3QgZWRpdHMsIGdpdmVzIGFkdmljZSBmb3Igc2VsZWN0aW5nIGFydGljbGVzIGFuZCBkcmFmdGluZyByZXZpc2lvbnMsIGFuZCBjb3ZlcnMgc29tZSBvZiB0aGUgd2F5cyB0aGV5IGNhbiBmaW5kIGhlbHAgYXMgdGhleSBnZXQgc3RhcnRlZC4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwIHRoYXQgeW91IGNhbiB1c2UgdG8gdmVyaWZ5IHRoYXQgc3R1ZGVudHMgY29tcGxldGVkIHRoZSB0cmFpbmluZzwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdBc3NpZ25tZW50IG1pbGVzdG9uZXM6J1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+Q3JlYXRlIGEgdXNlciBhY2NvdW50IGFuZCBlbnJvbGwgb24gdGhlIGNvdXJzZSBwYWdlLiA8L2xpPlxuICAgICAgICAgICAgPGxpPkNvbXBsZXRlIHRoZSBvbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzLiBEdXJpbmcgdGhpcyB0cmFpbmluZywgeW91IHdpbGwgbWFrZSBlZGl0cyBpbiBhIHNhbmRib3ggYW5kIGxlYXJuIHRoZSBiYXNpYyBydWxlcyBvZiBXaWtpcGVkaWEuIDwvbGk+XG4gICAgICAgICAgICA8bGk+VG8gcHJhY3RpY2UgZWRpdGluZyBhbmQgY29tbXVuaWNhdGluZyBvbiBXaWtpcGVkaWEsIGludHJvZHVjZSB5b3Vyc2VsZiB0byBhbnkgV2lraXBlZGlhbnMgaGVscGluZyB5b3VyIGNsYXNzIChzdWNoIGFzIGEgV2lraXBlZGlhIEFtYmFzc2Fkb3IpLCBhbmQgbGVhdmUgYSBtZXNzYWdlIGZvciBhIGNsYXNzbWF0ZSBvbiB0aGVpciB1c2VyIHRhbGsgcGFnZS48L2xpPlxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgICBcIjxwPldpbGwgY29tcGxldGlvbiBvZiB0aGUgc3R1ZGVudCB0cmFpbmluZyBiZSBwYXJ0IG9mIHlvdXIgc3R1ZGVudHMnIGdyYWRlcz88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ2V0dGluZ19zdGFydGVkXCJcbiAgICB0aXRsZTogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgZWRpdGluZydcbiAgICBpbnN0cnVjdGlvbnM6IFwiSXQgaXMgaW1wb3J0YW50IGZvciBzdHVkZW50cyB0byBzdGFydCBlZGl0aW5nIFdpa2lwZWRpYSByaWdodCBhd2F5LiBUaGF0IHdheSwgdGhleSBiZWNvbWUgZmFtaWxpYXIgd2l0aCBXaWtpcGVkaWEncyBtYXJrdXAgKFxcXCJ3aWtpc3ludGF4XFxcIiwgXFxcIndpa2ltYXJrdXBcXFwiLCBvciBcXFwid2lraWNvZGVcXFwiKSBhbmQgdGhlIG1lY2hhbmljcyBvZiBlZGl0aW5nIGFuZCBjb21tdW5pY2F0aW5nIG9uIHRoZSBzaXRlLiBXZSByZWNvbW1lbmQgYXNzaWduaW5nIGEgZmV3IGJhc2ljIFdpa2lwZWRpYSB0YXNrcyBlYXJseSBvbi5cIlxuICAgIGZvcm1UaXRsZTogJ1doaWNoIGJhc2ljIGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGU/J1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5XaGljaCBpbnRyb2R1Y3RvcnkgYXNzaWdubWVudHMgd291bGQgeW91IGxpa2UgdG8gdXNlIHRvIGFjY2xpbWF0ZSB5b3VyIHN0dWRlbnRzIHRvIFdpa2lwZWRpYT8gWW91IGNhbiBzZWxlY3Qgbm9uZSwgb25lLCBvciBtb3JlLiBXaGljaGV2ZXIgeW91IHNlbGVjdCB3aWxsIGJlIGFkZGVkIHRvIHRoZSBjb3Vyc2Ugc3lsbGFidXMuPC9wPidcbiAgICAgICAgICAnPHVsPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q3JpdGlxdWUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQ3JpdGljYWxseSBldmFsdWF0ZSBhbiBleGlzdGluZyBXaWtpcGVkaWEgYXJ0aWNsZSByZWxhdGVkIHRvIHRoZSBjbGFzcywgYW5kIGxlYXZlIHN1Z2dlc3Rpb25zIGZvciBpbXByb3ZpbmcgaXQgb24gdGhlIGFydGljbGXigJlzIHRhbGsgcGFnZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkFkZCB0byBhbiBhcnRpY2xlLjwvc3Ryb25nPiBVc2luZyBjb3Vyc2UgcmVhZGluZ3Mgb3Igb3RoZXIgcmVsZXZhbnQgc2Vjb25kYXJ5IHNvdXJjZXMsIGFkZCAx4oCTMiBzZW50ZW5jZXMgb2YgbmV3IGluZm9ybWF0aW9uIHRvIGEgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MuIEJlIHN1cmUgdG8gaW50ZWdyYXRlIGl0IHdlbGwgaW50byB0aGUgZXhpc3RpbmcgYXJ0aWNsZSwgYW5kIGluY2x1ZGUgYSBjaXRhdGlvbiB0byB0aGUgc291cmNlLiA8L2xpPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+Q29weWVkaXQgYW4gYXJ0aWNsZS48L3N0cm9uZz4gQnJvd3NlIFdpa2lwZWRpYSB1bnRpbCB5b3UgZmluZCBhbiBhcnRpY2xlIHRoYXQgeW91IHdvdWxkIGxpa2UgdG8gaW1wcm92ZSwgYW5kIG1ha2Ugc29tZSBlZGl0cyB0byBpbXByb3ZlIHRoZSBsYW5ndWFnZSBvciBmb3JtYXR0aW5nLiA8L2xpPlxuICAgICAgICAgICAgPGxpPjxzdHJvbmc+SWxsdXN0cmF0ZSBhbiBhcnRpY2xlLjwvc3Ryb25nPiBGaW5kIGFuIG9wcG9ydHVuaXR5IHRvIGltcHJvdmUgYW4gYXJ0aWNsZSBieSBjcmVhdGluZyBhbmQgdXBsb2FkaW5nIGFuIG9yaWdpbmFsIHBob3RvZ3JhcGggb3IgdmlkZW8uPC9saT5cbiAgICAgICAgICA8L3VsPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICB0aXRsZTogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgIGZvcm1UaXRsZTogJ1RoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBjaG9vc2luZyBhcnRpY2xlcydcbiAgICBpbnN0cnVjdGlvbnM6ICdDaG9vc2luZyB0aGUgcmlnaHQgKG9yIHdyb25nKSBhcnRpY2xlcyB0byB3b3JrIG9uIGNhbiBtYWtlIChvciBicmVhaykgYSBXaWtpcGVkaWEgd3JpdGluZyBhc3NpZ25tZW50LidcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+U29tZSBhcnRpY2xlcyBtYXkgaW5pdGlhbGx5IGxvb2sgZWFzeSB0byBpbXByb3ZlLCBidXQgcXVhbGl0eSByZWZlcmVuY2VzIHRvIGV4cGFuZCB0aGVtIG1heSBiZSBkaWZmaWN1bHQgdG8gZmluZC4gRmluZGluZyB0b3BpY3Mgd2l0aCB0aGUgcmlnaHQgYmFsYW5jZSBiZXR3ZWVuIHBvb3IgV2lraXBlZGlhIGNvdmVyYWdlIGFuZCBhdmFpbGFibGUgbGl0ZXJhdHVyZSBmcm9tIHdoaWNoIHRvIGV4cGFuZCB0aGF0IGNvdmVyYWdlIGNhbiBiZSB0cmlja3kuIEhlcmUgYXJlIHNvbWUgZ3VpZGVsaW5lcyB0byBrZWVwIGluIG1pbmQgd2hlbiBzZWxlY3RpbmcgYXJ0aWNsZXMgZm9yIGltcHJvdmVtZW50LjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdOb3Qgc3VjaCBhIGdvb2QgY2hvaWNlJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5BcnRpY2xlcyB0aGF0IGFyZSBcIm5vdCBzdWNoIGEgZ29vZCBjaG9pY2VcIiBmb3IgbmV3Y29tZXJzIHVzdWFsbHkgaW52b2x2ZSBhIGxhY2sgb2YgYXBwcm9wcmlhdGUgcmVzZWFyY2ggbWF0ZXJpYWwsIGhpZ2hseSBjb250cm92ZXJzaWFsIHRvcGljcyB0aGF0IG1heSBhbHJlYWR5IGJlIHdlbGwgZGV2ZWxvcGVkLCBicm9hZCBzdWJqZWN0cywgb3IgdG9waWNzIGZvciB3aGljaCBpdCBpcyBkaWZmaWN1bHQgdG8gZGVtb25zdHJhdGUgbm90YWJpbGl0eS48L3A+J1xuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPllvdSBwcm9iYWJseSBzaG91bGRuJ3QgdHJ5IHRvIGNvbXBsZXRlbHkgb3ZlcmhhdWwgYXJ0aWNsZXMgb24gdmVyeSBicm9hZCB0b3BpY3MgKGUuZy4sIExhdykuPC9saT5cbiAgICAgICAgICAgIDxsaT5Zb3Ugc2hvdWxkIHByb2JhYmx5IGF2b2lkIHRyeWluZyB0byBpbXByb3ZlIGFydGljbGVzIG9uIHRvcGljcyB0aGF0IGFyZSBoaWdobHkgY29udHJvdmVyc2lhbCAoZS5nLiwgR2xvYmFsIFdhcm1pbmcsIEFib3J0aW9uLCBTY2llbnRvbG9neSwgZXRjLikuIFlvdSBtYXkgYmUgbW9yZSBzdWNjZXNzZnVsIHN0YXJ0aW5nIGEgc3ViLWFydGljbGUgb24gdGhlIHRvcGljIGluc3RlYWQuPC9saT5cbiAgICAgICAgICAgIDxsaT5Eb24ndCB3b3JrIG9uIGFuIGFydGljbGUgdGhhdCBpcyBhbHJlYWR5IG9mIGhpZ2ggcXVhbGl0eSBvbiBXaWtpcGVkaWEsIHVubGVzcyB5b3UgZGlzY3VzcyBhIHNwZWNpZmljIHBsYW4gZm9yIGltcHJvdmluZyBpdCB3aXRoIG90aGVyIGVkaXRvcnMgYmVmb3JlaGFuZC48L2xpPlxuICAgICAgICAgICAgPGxpPkF2b2lkIHdvcmtpbmcgb24gc29tZXRoaW5nIHdpdGggc2NhcmNlIGxpdGVyYXR1cmUuIFdpa2lwZWRpYSBhcnRpY2xlcyBjaXRlIHNlY29uZGFyeSBsaXRlcmF0dXJlIHNvdXJjZXMsIHNvIGl0J3MgaW1wb3J0YW50IHRvIGhhdmUgZW5vdWdoIHNvdXJjZXMgZm9yIHZlcmlmaWNhdGlvbiBhbmQgdG8gcHJvdmlkZSBhIG5ldXRyYWwgcG9pbnQgb2Ygdmlldy48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHN0YXJ0IGFydGljbGVzIHdpdGggdGl0bGVzIHRoYXQgaW1wbHkgYW4gYXJndW1lbnQgb3IgZXNzYXktbGlrZSBhcHByb2FjaCAoZS5nLiwgVGhlIEVmZmVjdHMgVGhhdCBUaGUgUmVjZW50IFN1Yi1QcmltZSBNb3J0Z2FnZSBDcmlzaXMgaGFzIGhhZCBvbiB0aGUgVVMgYW5kIEdsb2JhbCBFY29ub21pY3MpLiBUaGVzZSB0eXBlIG9mIHRpdGxlcywgYW5kIG1vc3QgbGlrZWx5IHRoZSBjb250ZW50IHRvbywgbWF5IG5vdCBiZSBhcHByb3ByaWF0ZSBmb3IgYW4gZW5jeWNsb3BlZGlhLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnR29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+Q2hvb3NlIGEgd2VsbC1lc3RhYmxpc2hlZCB0b3BpYyBmb3Igd2hpY2ggYSBsb3Qgb2YgbGl0ZXJhdHVyZSBpcyBhdmFpbGFibGUgaW4gaXRzIGZpZWxkLCBidXQgd2hpY2ggaXNuJ3QgY292ZXJlZCBleHRlbnNpdmVseSBvbiBXaWtpcGVkaWEuPC9saT5cbiAgICAgICAgICAgIDxsaT5HcmF2aXRhdGUgdG93YXJkIFxcXCJzdHViXFxcIiBhbmQgXFxcInN0YXJ0XFxcIiBjbGFzcyBhcnRpY2xlcy4gVGhlc2UgYXJ0aWNsZXMgb2Z0ZW4gaGF2ZSBvbmx5IDEtMiBwYXJhZ3JhcGhzIG9mIGluZm9ybWF0aW9uIGFuZCBhcmUgaW4gbmVlZCBvZiBleHBhbnNpb24uICpSZWxldmFudCBXaWtpUHJvamVjdCBwYWdlcyBjYW4gcHJvdmlkZSBhIGxpc3Qgb2Ygc3R1YnMgdGhhdCBuZWVkIGltcHJvdmVtZW50LjwvbGk+XG4gICAgICAgICAgICA8bGk+QmVmb3JlIGNyZWF0aW5nIGEgbmV3IGFydGljbGUsIHNlYXJjaCByZWxhdGVkIHRvcGljcyBvbiBXaWtpcGVkaWEgdG8gbWFrZSBzdXJlIHlvdXIgdG9waWMgaXNuJ3QgYWxyZWFkeSBjb3ZlcmVkIGVsc2V3aGVyZS4gT2Z0ZW4sIGFuIGFydGljbGUgbWF5IGV4aXN0IHVuZGVyIGFub3RoZXIgbmFtZSwgb3IgdGhlIHRvcGljIG1heSBiZSBjb3ZlcmVkIGFzIGEgc3Vic2VjdGlvbiBvZiBhIGJyb2FkZXIgYXJ0aWNsZS48L2xpPlxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5BcyB0aGUgaW5zdHJ1Y3RvciwgeW91IHNob3VsZCBhcHBseSB5b3VyIG93biBleHBlcnRpc2UgdG8gZXhhbWluaW5nIFdpa2lwZWRpYeKAmXMgY292ZXJhZ2Ugb2YgeW91ciBmaWVsZC4gWW91IHVuZGVyc3RhbmQgdGhlIGJyb2FkZXIgaW50ZWxsZWN0dWFsIGNvbnRleHQgd2hlcmUgaW5kaXZpZHVhbCB0b3BpY3MgZml0IGluLCB5b3UgY2FuIHJlY29nbml6ZSB3aGVyZSBXaWtpcGVkaWEgZmFsbHMgc2hvcnQsIHlvdSBrbm934oCUb3Iga25vdyBob3cgdG8gZmluZOKAlHRoZSByZWxldmFudCBsaXRlcmF0dXJlLCBhbmQgeW91IGtub3cgd2hhdCB0b3BpY3MgeW91ciBzdHVkZW50cyBzaG91bGQgYmUgYWJsZSB0byBoYW5kbGUuIFlvdXIgZ3VpZGFuY2Ugb24gYXJ0aWNsZSBjaG9pY2UgYW5kIHNvdXJjaW5nIGlzIGNyaXRpY2FsIGZvciBib3RoIHlvdXIgc3R1ZGVudHPigJkgc3VjY2VzcyBhbmQgdGhlIGltcHJvdmVtZW50IG9mIFdpa2lwZWRpYS48L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+WW91ICh0aGUgaW5zdHJ1Y3RvcikgcHJlcGFyZSBhIGxpc3Qgb2YgYXBwcm9wcmlhdGUgXFwnbm9uLWV4aXN0ZW50XFwnLCBcXCdzdHViXFwnIG9yIFxcJ3N0YXJ0XFwnIGFydGljbGVzIGFoZWFkIG9mIHRpbWUgZm9yIHRoZSBzdHVkZW50cyB0byBjaG9vc2UgZnJvbS4gSWYgcG9zc2libGUsIHlvdSBtYXkgd2FudCB0byB3b3JrIHdpdGggYW4gZXhwZXJpZW5jZWQgV2lraXBlZGlhbiB0byBjcmVhdGUgdGhlIGxpc3QuIEVhY2ggc3R1ZGVudCBjaG9vc2VzIGFuIGFydGljbGUgZnJvbSB0aGUgbGlzdCB0byB3b3JrIG9uLiBBbHRob3VnaCB0aGlzIHJlcXVpcmVzIG1vcmUgcHJlcGFyYXRpb24sIGl0IG1heSBoZWxwIHN0dWRlbnRzIHRvIHN0YXJ0IHJlc2VhcmNoaW5nIGFuZCB3cml0aW5nIHRoZWlyIGFydGljbGVzIHNvb25lci48L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnU3R1ZGVudHMgZmluZCBhcnRpY2xlcydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5FYWNoIHN0dWRlbnQgZXhwbG9yZXMgV2lraXBlZGlhIGFuZCBsaXN0cyAz4oCTNSB0b3BpY3Mgb24gdGhlaXIgV2lraXBlZGlhIHVzZXIgcGFnZSB0aGF0IHRoZXkgYXJlIGludGVyZXN0ZWQgaW4gZm9yIHRoZWlyIG1haW4gcHJvamVjdC4gWW91ICh0aGUgaW5zdHJ1Y3Rvcikgc2hvdWxkIGFwcHJvdmUgYXJ0aWNsZSBjaG9pY2VzIGJlZm9yZSBzdHVkZW50cyBwcm9jZWVkIHRvIHdyaXRpbmcuIExldHRpbmcgc3R1ZGVudHMgZmluZCB0aGVpciBvd24gYXJ0aWNsZXMgcHJvdmlkZXMgdGhlbSB3aXRoIGEgc2Vuc2Ugb2YgbW90aXZhdGlvbiBhbmQgb3duZXJzaGlwIG92ZXIgdGhlIGFzc2lnbm1lbnQsIGJ1dCBpdCBtYXkgYWxzbyBsZWFkIHRvIGNob2ljZXMgdGhhdCBhcmUgZnVydGhlciBhZmllbGQgZnJvbSBjb3Vyc2UgbWF0ZXJpYWwuPC9wPidcbiAgICAgICAgXVxuICAgICAgfSBcbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcInJlc2VhcmNoX3BsYW5uaW5nXCJcbiAgICB0aXRsZTogJ1Jlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICBmb3JtVGl0bGU6ICdIb3cgc2hvdWxkIHN0dWRlbnRzIHBsYW4gdGhlaXIgYXJ0aWNsZXM/J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHJlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICBpbnN0cnVjdGlvbnM6ICBcIlN0dWRlbnRzIG9mdGVuIHdhaXQgdW50aWwgdGhlIGxhc3QgbWludXRlIHRvIGRvIHRoZWlyIHJlc2VhcmNoLCBvciBjaG9vc2Ugc291cmNlcyB1bnN1aXRlZCBmb3IgV2lraXBlZGlhLiBUaGF0J3Mgd2h5IHdlIHJlY29tbWVuZCBhc2tpbmcgc3R1ZGVudHMgdG8gcHV0IHRvZ2V0aGVyIGEgYmlibGlvZ3JhcGh5IG9mIG1hdGVyaWFscyB0aGV5IHdhbnQgdG8gdXNlIGluIGVkaXRpbmcgdGhlIGFydGljbGUsIHdoaWNoIGNhbiB0aGVuIGJlIGFzc2Vzc2VkIGJ5IHlvdSBhbmQgb3RoZXIgV2lraXBlZGlhbnMuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+VGhlbiwgc3R1ZGVudHMgc2hvdWxkIHByb3Bvc2Ugb3V0bGluZXMgZm9yIHRoZWlyIGFydGljbGVzLiBUaGlzIGNhbiBiZSBhIHRyYWRpdGlvbmFsIG91dGxpbmUsIGluIHdoaWNoIHN0dWRlbnRzIGlkZW50aWZ5IHdoaWNoIHNlY3Rpb25zIHRoZWlyIGFydGljbGVzIHdpbGwgaGF2ZSBhbmQgd2hpY2ggYXNwZWN0cyBvZiB0aGUgdG9waWMgd2lsbCBiZSBjb3ZlcmVkIGluIGVhY2ggc2VjdGlvbi4gQWx0ZXJuYXRpdmVseSwgc3R1ZGVudHMgY2FuIGRldmVsb3AgZWFjaCBvdXRsaW5lIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbiDigJQgdGhlIHVudGl0bGVkIHNlY3Rpb24gYXQgdGhlIGJlZ2lubmluZyBvZiBhbiBhcnRpY2xlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHByb3ZpZGUgYSBjb25jaXNlIHN1bW1hcnkgb2YgaXRzIGNvbnRlbnQuIFdvdWxkIHlvdSBsaWtlIHlvdXIgc3R1ZGVudHMgdG8gY3JlYXRlIHRyYWRpdGlvbmFsIG91dGxpbmVzLCBvciBjb21wb3NlIG91dGxpbmVzIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhLXN0eWxlIGxlYWQgc2VjdGlvbj88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImRyYWZ0c19tYWluc3BhY2VcIlxuICAgIHRpdGxlOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIG9uZTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgZHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnT25jZSBzdHVkZW50cyBoYXZlIGdvdHRlbiBhIGdyaXAgb24gdGhlaXIgdG9waWNzIGFuZCB0aGUgc291cmNlcyB0aGV5IHdpbGwgdXNlIHRvIHdyaXRlIGFib3V0IHRoZW0sIGl04oCZcyB0aW1lIHRvIHN0YXJ0IHdyaXRpbmcgb24gV2lraXBlZGlhLiBZb3UgY2FuIGFzayB0aGVtIHRvIGp1bXAgcmlnaHQgaW4gYW5kIGVkaXQgbGl2ZSwgb3Igc3RhcnQgdGhlbSBvZmYgaW4gdGhlaXIgb3duIHNhbmRib3hlcy4gVGhlcmUgYXJlIHByb3MgYW5kIGNvbnMgdG8gZWFjaCBhcHByb2FjaC4nXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdQcm9zIGFuZCBjb25zIHRvIHNhbmRib3hlcydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+U2FuZGJveGVzIG1ha2Ugc3R1ZGVudHMgZmVlbCBzYWZlIGJlY2F1c2UgdGhleSBjYW4gZWRpdCB3aXRob3V0IHRoZSBwcmVzc3VyZSBvZiB0aGUgd2hvbGUgd29ybGQgcmVhZGluZyB0aGVpciBkcmFmdHMsIG9yIG90aGVyIFdpa2lwZWRpYW5zIGFsdGVyaW5nIHRoZWlyIHdyaXRpbmcuIEhvd2V2ZXIsIHNhbmRib3ggZWRpdGluZyBsaW1pdHMgbWFueSBvZiB0aGUgdW5pcXVlIGFzcGVjdHMgb2YgV2lraXBlZGlhIGFzIGEgdGVhY2hpbmcgdG9vbCwgc3VjaCBhcyBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgYW5kIGluY3JlbWVudGFsIGRyYWZ0aW5nLiBTcGVuZGluZyBtb3JlIHRoYW4gYSB3ZWVrIG9yIHR3byBpbiBzYW5kYm94ZXMgaXMgc3Ryb25nbHkgZGlzY291cmFnZWQuPC9wPlwiIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyB0byBlZGl0aW5nIGxpdmUnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkVkaXRpbmcgbGl2ZSBpcyBleGNpdGluZyBmb3IgdGhlIHN0dWRlbnRzIGJlY2F1c2UgdGhleSBjYW4gc2VlIHRoZWlyIGNoYW5nZXMgdG8gdGhlIGFydGljbGVzIGltbWVkaWF0ZWx5IGFuZCBleHBlcmllbmNlIHRoZSBjb2xsYWJvcmF0aXZlIGVkaXRpbmcgcHJvY2VzcyB0aHJvdWdob3V0IHRoZSBhc3NpZ25tZW50LiBIb3dldmVyLCBiZWNhdXNlIG5ldyBlZGl0b3JzIG9mdGVuIHVuaW50ZW50aW9uYWxseSBicmVhayBXaWtpcGVkaWEgcnVsZXMsIHNvbWV0aW1lcyBzdHVkZW50c+KAmSBhZGRpdGlvbnMgYXJlIHF1ZXN0aW9uZWQgb3IgcmVtb3ZlZC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogJ1wiPHA+V2lsbCB5b3UgaGF2ZSB5b3VyIHN0dWRlbnRzIGRyYWZ0IHRoZWlyIGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzLCBvciB3b3JrIGxpdmUgZnJvbSB0aGUgYmVnaW5uaW5nPzwvcD5cIidcbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJwZWVyX2ZlZWRiYWNrXCJcbiAgICB0aXRsZTogJ1BlZXIgZmVlZGJhY2snXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcGVlciBmZWVkYmFjaydcbiAgICBmb3JtVGl0bGU6IFwiSG93IG1hbnkgcGVlciByZXZpZXdzIHNob3VsZCBlYWNoIHN0dWRlbnQgY29uZHVjdD9cIlxuICAgIGluc3RydWN0aW9uczogXCJDb2xsYWJvcmF0aW9uIGlzIGEgY3JpdGljYWwgZWxlbWVudCBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhLlwiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkZvciBzb21lIHN0dWRlbnRzLCB0aGlzIHdpbGwgaGFwcGVuIHNwb250YW5lb3VzbHk7IHRoZWlyIGNob2ljZSBvZiB0b3BpY3Mgd2lsbCBhdHRyYWN0IGludGVyZXN0ZWQgV2lraXBlZGlhbnMgd2hvIHdpbGwgcGl0Y2ggaW4gd2l0aCBpZGVhcywgY29weWVkaXRzLCBvciBldmVuIHN1YnN0YW50aWFsIGNvbnRyaWJ1dGlvbnMgdG8gdGhlIHN0dWRlbnRz4oCZIGFydGljbGVzLiBJbiBtYW55IGNhc2VzLCBob3dldmVyLCB0aGVyZSB3aWxsIGJlIGxpdHRsZSBzcG9udGFuZW91cyBlZGl0aW5nIG9mIHN0dWRlbnRz4oCZIGFydGljbGVzIGJlZm9yZSB0aGUgZW5kIG9mIHRoZSB0ZXJtLiBGb3J0dW5hdGVseSwgeW91IGhhdmUgYSBjbGFzc3Jvb20gZnVsbCBvZiBwZWVyIHJldmlld2Vycy4gWW91IGNhbiBtYWtlIHRoZSBtb3N0IG9mIHRoaXMgYnkgYXNzaWduaW5nIHN0dWRlbnRzIHRvIHJldmlldyBlYWNoIG90aGVyc+KAmSBhcnRpY2xlcyBzb29uIGFmdGVyIGZ1bGwtbGVuZ3RoIGRyYWZ0cyBhcmUgcG9zdGVkLiBUaGlzIGdpdmVzIHN0dWRlbnRzIHBsZW50eSBvZiB0aW1lIHRvIGFjdCBvbiB0aGUgYWR2aWNlIG9mIHRoZWlyIHBlZXJzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+SG93IG1hbnkgcGVlciByZXZpZXdzIHdpbGwgeW91IGFzayBlYWNoIHN0dWRlbnQgdG8gY29udHJpYnV0ZSBkdXJpbmcgdGhlIGNvdXJzZT88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcInN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHNcIlxuICAgIHRpdGxlOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50czonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBpbnN0cnVjdGlvbnM6IFwiQnkgdGhlIHRpbWUgc3R1ZGVudHMgaGF2ZSBtYWRlIGltcHJvdmVtZW50cyBiYXNlZCBvbiBjbGFzc21hdGVzJyBjb21tZW50c+KAlGFuZCBpZGVhbGx5IHN1Z2dlc3Rpb25zIGZyb20geW91IGFzIHdlbGzigJR0aGV5IHNob3VsZCBoYXZlIHByb2R1Y2VkIG5lYXJseSBjb21wbGV0ZSBhcnRpY2xlcy4gTm93IGlzIHRoZSBjaGFuY2UgdG8gZW5jb3VyYWdlIHRoZW0gdG8gd2FkZSBhIGxpdHRsZSBkZWVwZXIgaW50byBXaWtpcGVkaWEgYW5kIGl0cyBub3JtcyBhbmQgY3JpdGVyaWEgdG8gY3JlYXRlIGdyZWF0IGNvbnRlbnQuIFlvdeKAmWxsIHByb2JhYmx5IGhhdmUgZGlzY3Vzc2VkIG1hbnkgb2YgdGhlIGNvcmUgcHJpbmNpcGxlcyBvZiBXaWtpcGVkaWHigJRhbmQgcmVsYXRlZCBpc3N1ZXMgeW91IHdhbnQgdG8gZm9jdXMgb27igJRidXQgbm93IHRoYXQgdGhleeKAmXZlIGV4cGVyaWVuY2VkIGZpcnN0LWhhbmQgaG93IFdpa2lwZWRpYSB3b3JrcywgdGhpcyBpcyBhIGdvb2QgdGltZSB0byByZXR1cm4gdG8gdG9waWNzIGxpa2UgbmV1dHJhbGl0eSwgbWVkaWEgZmx1ZW5jeSwgYW5kIHRoZSBpbXBhY3RzIGFuZCBsaW1pdHMgb2YgV2lraXBlZGlhLiBDb25zaWRlciBicmluZ2luZyBpbiBhIGd1ZXN0IHNwZWFrZXIsIGhhdmluZyBhIHBhbmVsIGRpc2N1c3Npb24sIG9yIHNpbXBseSBoYXZpbmcgYW4gb3BlbiBkaXNjdXNzaW9uIGluIGNsYXNzIGFib3V0IHdoYXQgdGhlIHN0dWRlbnRzIGhhdmUgZG9uZSBzbyBmYXIgYW5kIHdoeSAob3Igd2hldGhlcikgaXQgbWF0dGVycy5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICBcIjxwPkluIGFkZGl0aW9uIHRvIHRoZSBXaWtpcGVkaWEgYXJ0aWNsZSB3cml0aW5nIGl0c2VsZiwgeW91IG1heSB3YW50IHRvIHVzZSBhIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudC4gVGhlc2UgYXNzaWdubWVudHMgY2FuIHJlaW5mb3JjZSBhbmQgZGVlcGVuIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBhbHNvIGhlbHAgeW91IHRvIHVuZGVyc3RhbmQgYW5kIGV2YWx1YXRlIHRoZSBzdHVkZW50cycgd29yayBhbmQgbGVhcm5pbmcgb3V0Y29tZXMuIEhlcmUgYXJlIHNvbWUgb2YgdGhlIGVmZmVjdGl2ZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzIHRoYXQgaW5zdHJ1Y3RvcnMgb2Z0ZW4gdXNlLiBTY3JvbGwgb3ZlciBlYWNoIGZvciBtb3JlIGluZm9ybWF0aW9uLCBhbmQgc2VsZWN0IGFueSB0aGF0IHlvdSB3aXNoIHRvIHVzZSBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gICMge1xuICAjICAgaWQ6IFwiZHlrX2dhXCJcbiAgIyAgIHRpdGxlOiAnRFlLIGFuZCBHb29kIEFydGljbGUnXG4gICMgICBpbmZvVGl0bGU6ICdBYm91dCBEWUsgYW5kIEdvb2QgQXJ0aWNsZSBwcm9jZXNzZXMnXG4gICMgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGVzZSBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgIyAgIHNlY3Rpb25zOiBbXG4gICMgICAgIHtcbiAgIyAgICAgICB0aXRsZTogJydcbiAgIyAgICAgICBjb250ZW50OiBbXG4gICMgICAgICAgICBcIjxwPkFkdmFuY2VkIHN0dWRlbnRz4oCZIGFydGljbGVzIG1heSBxdWFsaWZ5IGZvciBzdWJtaXNzaW9uIHRvIERpZCBZb3UgS25vdyAoRFlLKSwgYSBzZWN0aW9uIG9uIFdpa2lwZWRpYeKAmXMgbWFpbiBwYWdlIGZlYXR1cmluZyBuZXcgY29udGVudC4gVGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4KSB3aXRoaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy48L3A+XCJcbiAgIyAgICAgICAgIFwiPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYnV0IGl0IGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICMgICAgICAgICBcIjxwPldlIHN0cm9uZ2x5IHJlY29tbWVuZCB0cnlpbmcgZm9yIERZSyBzdGF0dXMgeW91cnNlbGYgYmVmb3JlaGFuZCwgb3Igd29ya2luZyB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW5zIHRvIGhlbHAgeW91ciBzdHVkZW50cyBuYXZpZ2F0ZSB0aGUgRFlLIHByb2Nlc3Mgc21vb3RobHkuIElmIHlvdXIgc3R1ZGVudHMgYXJlIHdvcmtpbmcgb24gYSByZWxhdGVkIHNldCBvZiBhcnRpY2xlcywgaXQgY2FuIGhlbHAgdG8gY29tYmluZSBtdWx0aXBsZSBhcnRpY2xlIG5vbWluYXRpb25zIGludG8gYSBzaW5nbGUgaG9vazsgdGhpcyBoZWxwcyBrZWVwIHlvdXIgc3R1ZGVudHPigJkgd29yayBmcm9tIHN3YW1waW5nIHRoZSBwcm9jZXNzIG9yIGFudGFnb25pemluZyB0aGUgZWRpdG9ycyB3aG8gbWFpbnRhaW4gaXQuPC9wPlwiXG4gICMgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAjICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSBnb29kLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMuPC9wPlwiXG4gICMgICAgICAgXVxuICAjICAgICB9XG4gICMgICBdXG4gICMgICBpbnB1dHM6IFtdXG4gICMgfVxuICB7XG4gICAgaWQ6IFwiZHlrXCJcbiAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IERZSyBwcm9jZXNzJ1xuICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+QWR2YW5jZWQgc3R1ZGVudHPigJkgYXJ0aWNsZXMgbWF5IHF1YWxpZnkgZm9yIHN1Ym1pc3Npb24gdG8gRGlkIFlvdSBLbm93IChEWUspLCBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgZmVhdHVyaW5nIG5ldyBjb250ZW50LiBUaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXgpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYnV0IGl0IGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICAgICAgICAgXCI8cD5XZSBzdHJvbmdseSByZWNvbW1lbmQgdHJ5aW5nIGZvciBEWUsgc3RhdHVzIHlvdXJzZWxmIGJlZm9yZWhhbmQsIG9yIHdvcmtpbmcgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWFucyB0byBoZWxwIHlvdXIgc3R1ZGVudHMgbmF2aWdhdGUgdGhlIERZSyBwcm9jZXNzIHNtb290aGx5LiBJZiB5b3VyIHN0dWRlbnRzIGFyZSB3b3JraW5nIG9uIGEgcmVsYXRlZCBzZXQgb2YgYXJ0aWNsZXMsIGl0IGNhbiBoZWxwIHRvIGNvbWJpbmUgbXVsdGlwbGUgYXJ0aWNsZSBub21pbmF0aW9ucyBpbnRvIGEgc2luZ2xlIGhvb2s7IHRoaXMgaGVscHMga2VlcCB5b3VyIHN0dWRlbnRz4oCZIHdvcmsgZnJvbSBzd2FtcGluZyB0aGUgcHJvY2VzcyBvciBhbnRhZ29uaXppbmcgdGhlIGVkaXRvcnMgd2hvIG1haW50YWluIGl0LjwvcD5cIlxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ2FcIlxuICAgIHRpdGxlOiAnR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2VsbC1kZXZlbG9wZWQgYXJ0aWNsZXMgdGhhdCBoYXZlIHBhc3NlZCBhIEdvb2QgQXJ0aWNsZSAoR0EpIHJldmlldyBhcmUgYSBzdWJzdGFudGlhbCBhY2hpZXZlbWVudCBpbiB0aGVpciBvd24gcmlnaHQsIGFuZCBjYW4gYWxzbyBxdWFsaWZ5IGZvciBEWUsuIFRoaXMgcGVlciByZXZpZXcgcHJvY2VzcyBpbnZvbHZlcyBjaGVja2luZyBhIHBvbGlzaGVkIGFydGljbGUgYWdhaW5zdCBXaWtpcGVkaWEncyBHQSBjcml0ZXJpYTogYXJ0aWNsZXMgbXVzdCBiZSB3ZWxsLXdyaXR0ZW4sIHZlcmlmaWFibGUgYW5kIHdlbGwtc291cmNlZCB3aXRoIG5vIG9yaWdpbmFsIHJlc2VhcmNoLCBicm9hZCBpbiBjb3ZlcmFnZSwgbmV1dHJhbCwgc3RhYmxlLCBhbmQgYXBwcm9wcmlhdGVseSBpbGx1c3RyYXRlZCAod2hlbiBwb3NzaWJsZSkuIFByYWN0aWNhbGx5IHNwZWFraW5nLCBhIHBvdGVudGlhbCBHb29kIEFydGljbGUgc2hvdWxkIGxvb2sgYW5kIHNvdW5kIGxpa2Ugb3RoZXIgd2VsbC1kZXZlbG9wZWQgV2lraXBlZGlhIGFydGljbGVzLCBhbmQgaXQgc2hvdWxkIHByb3ZpZGUgYSBzb2xpZCwgd2VsbC1iYWxhbmNlZCB0cmVhdG1lbnQgb2YgaXRzIHN1YmplY3QuPC9wPlwiXG4gICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSBnb29kLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJncmFkaW5nXCJcbiAgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIHRoZSBXaWtpcGVkaWEgYXNzaWdubWVudCBiZSBkZXRlcm1pbmVkP1wiXG4gICAgaW5mb1RpdGxlOiBcIkFib3V0IGdyYWRpbmdcIlxuICAgIGluc3RydWN0aW9uczogJ0dyYWRpbmcgV2lraXBlZGlhIGFzc2lnbm1lbnRzIGNhbiBiZSBhIGNoYWxsZW5nZS4gSGVyZSBhcmUgc29tZSB0aXBzIGZvciBncmFkaW5nIHlvdXIgV2lraXBlZGlhIGFzc2lnbm1lbnRzOidcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0tub3cgYWxsIG9mIHlvdXIgc3R1ZGVudHNcXCcgV2lraXBlZGlhIHVzZXJuYW1lcy4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5XaXRob3V0IGtub3dpbmcgdGhlIHN0dWRlbnRzJyB1c2VybmFtZXMsIHlvdSB3b24ndCBiZSBhYmxlIHRvIGdyYWRlIHRoZW0uPC9wPlwiXG4gICAgICAgICAgXCI8cD5NYWtlIHN1cmUgYWxsIHN0dWRlbnRzIGVucm9sbCBvbiB0aGUgY291cnNlIHBhZ2UuIE9uY2UgYWxsIHN0dWRlbnRzIGhhdmUgc2lnbmVkIHRoZSBsaXN0LCB5b3UgY2FuIGNsaWNrIG9uIFxcXCJ1c2VyIGNvbnRyaWJ1dGlvbnNcXFwiIChpbiB0aGUgbWVudSBiYXIgb24gdGhlIGxlZnQgaGFuZCBzaWRlIG9mIHlvdXIgYnJvd3NlciBzY3JlZW4pIHRvIHJldmlldyB0aGF0IHN0dWRlbnQncyBhY3Rpdml0aWVzIG9uIFdpa2lwZWRpYS4gSWYgeW91IGhhdmUgbWFkZSBzdHVkZW50IHRyYWluaW5nIGNvbXB1bHNvcnksIHlvdSBjYW4gY2hlY2sgdGhlIDxhIGhyZWY9J2h0dHBzOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL1dpa2lwZWRpYTpUcmFpbmluZy9Gb3Jfc3R1ZGVudHMvVHJhaW5pbmdfZmVlZGJhY2snIHRhcmdldD0nX2JsYW5rJz5mZWVkYmFjayBwYWdlPC9hPiB0byBzZWUgd2hpY2ggc3R1ZGVudHMgaGF2ZSBjb21wbGV0ZWQgaXQuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdCZSBzcGVjaWZpYyBhYm91dCB5b3VyIGV4cGVjdGF0aW9ucy4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5CZWluZyBzcGVjaWZpYyBhYm91dCB3aGF0IHlvdSBleHBlY3QgeW91ciBzdHVkZW50cyB0byBkbyBpcyBjcnVjaWFsIGZvciBncmFkaW5nLiBGb3IgZXhhbXBsZSwgc3R1ZGVudHMgY291bGQgYmUgYXNrZWQgdG8gYWRkIGEgbWluaW11bSBvZiB0aHJlZSBzZWN0aW9ucyB0byBhbiBleGlzdGluZyBhcnRpY2xlLCBvciBhIG1pbmltdW0gb2YgZWlnaHQgcmVmZXJlbmNlcyB0byBhbiBleGlzdGluZyBhcnRpY2xlIHRoYXQgbGFja3MgdGhlIGFwcHJvcHJpYXRlIHNvdXJjaW5nLCBldGMuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHcmFkZSBiYXNlZCBvbiB3aGF0IHN0dWRlbnRzIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCBub3Qgd2hhdCByZW1haW5zIG9uIFdpa2lwZWRpYSBhdCB0aGUgY291cnNlXFwncyBlbmQuJ1xuICAgICAgICBhY2NvcmRpYW46IHRydWVcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+WW91IGNhbiBzZWUgYSBzdHVkZW50J3MgY29udHJpYnV0aW9ucyBpbiB0aGUgYXJ0aWNsZSBoaXN0b3J5LCBldmVuIGlmIHNvbWUgd3JpdGluZyB3YXMgcmVtb3ZlZCBieSB0aGUgY29tbXVuaXR5IChvciB0aGUgc3R1ZGVudCkuIEEgc3R1ZGVudOKAmXMgY29udGVudCBjb3VsZCBiZSBlZGl0ZWQgZm9yIG1hbnkgcmVhc29ucywgYW5kIGNhbiBldmVuIGJlIGV2aWRlbmNlIG9mIGEgc3R1ZGVudCByZWZsZWN0aW5nIGNyaXRpY2FsbHkgb24gdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuIEZ1cnRoZXJtb3JlLCBpZiBzdHVkZW50cyBmZWVsIHRoZXkgbXVzdCBkZWZlbmQgY29udHJvbCBvZiBhbiBhcnRpY2xlIGZvciB0aGUgc2FrZSBvZiB0aGVpciBncmFkZSwgdGhpcyBjYW4gbGVhZCB0byBjb25mbGljdCB3aXRoIG90aGVyIGVkaXRvcnMuPC9wPlwiXG4gICAgICAgICAgXCI8cD5XaWtpcGVkaWEgaXMgYSBjb2xsYWJvcmF0aXZlIHdyaXRpbmcgZW52aXJvbm1lbnQgZHJpdmVuIGJ5IHZlcmlmaWFiaWxpdHksIG5vdGV3b3J0aGluZXNzIGFuZCBuZXV0cmFsIHBvaW50IG9mIHZpZXcg4oCTIGFsbCBvZiB3aGljaCBoYXZlIGNyZWF0ZWQgY2hhbGxlbmdlcyBmb3Igc3R1ZGVudHMgZmFtaWxpYXIgd2l0aCBhIHBlcnN1YXNpdmUgd3JpdGluZyBmb3JtYXQgaW4gY2xhc3Nyb29tcy4gRW5jb3VyYWdlIHN0dWRlbnRzIHRvIHJlZmxlY3Qgb24gZWRpdHMgdG8gaW1wcm92ZSB0aGVpciB1bmRlcnN0YW5kaW5nIG9mIHRoZSBwcm9jZXNzIGFuZCB0aGUgY29tbXVuaXR5LjwvcD5cIlxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwib3ZlcnZpZXdcIlxuICAgIHRpdGxlOiAnQXNzaWdubWVudCBvdmVydmlldydcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJ0Fib3V0IHRoZSBjb3Vyc2UnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPk5vdyBpdCdzIHRpbWUgdG8gd3JpdGUgYSBzaG9ydCBkZXNjcmlwdGlvbiBvZiB5b3VyIGNvdXJzZSBhbmQgaG93IHRoaXMgV2lraXBlZGlhIGFzc2lnbm1lbnQgZml0cyBpbnRvIGl0LiBUaGlzIHdpbGwgYWxsb3cgb3RoZXIgV2lraXBlZGlhIGVkaXRvcnMgdG8gdW5kZXJzdGFuZCB3aGF0IHN0dWRlbnRzIHdpbGwgYmUgZG9pbmcuIEJlIHN1cmUgdG8gbWVudGlvbjpcIlxuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPnRvcGljcyB5b3UncmUgY292ZXJpbmcgaW4gdGhlIGNsYXNzPC9saT5cbiAgICAgICAgICAgIDxsaT53aGF0IHN0dWRlbnRzIHdpbGwgYmUgYXNrZWQgdG8gZG8gb24gV2lraXBlZGlhPC9saT5cbiAgICAgICAgICAgIDxsaT53aGF0IHR5cGVzIG9mIGFydGljbGVzIHlvdXIgY2xhc3Mgd2lsbCBiZSB3b3JraW5nIG9uPC9saT4gIFxuICAgICAgICAgIDwvdWw+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAgXG4gICAgICB7XG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzgnIHN0eWxlPSd3aWR0aDoxMDAlO2JhY2tncm91bmQtY29sb3I6cmdiYSgyNDIsMjQyLDI0MiwxLjApO2JvcmRlcjoxcHggc29saWQgcmdiYSgyMDIsMjAyLDIwMiwxLjApOyc+PC90ZXh0YXJlYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8ZGl2IGNsYXNzPSdzdGVwLWZvcm0tZGF0ZXMnPjwvZGl2PlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjxhIGlkPSdwdWJsaXNoJyBocmVmPScjJyBjbGFzcz0nYnV0dG9uJyBzdHlsZT0nZGlzcGxheTppbmxpbmUtYmxvY2s7dGV4dC1hbGlnbjpjZW50ZXI7Jz5QdWJsaXNoPC9hPjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICBcbl1cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRDb250ZW50IiwiV2l6YXJkQ291cnNlSW5mbyA9IFxuXG4gICMgUkVTRUFSQ0ggQU5EIFdSSVRFIEEgV0lLSVBFRElBIEFSVElDTEVcbiAgcmVzZWFyY2h3cml0ZTogXG4gICAgdGl0bGU6IFwiUmVzZWFyY2ggYW5kIHdyaXRlIGEgV2lraXBlZGlhIGFydGljbGVcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIldvcmtpbmcgaW5kaXZpZHVhbGx5IG9yIGluIHNtYWxsIHRlYW1zIHdpdGggeW91ciBndWlkYW5jZSwgc3R1ZGVudHMgY2hvb3NlIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB0aGF0IGFyZSBub3Qgd2VsbC1jb3ZlcmVkIG9uIFdpa2lwZWRpYS4gQWZ0ZXIgYXNzZXNzaW5nIFdpa2lwZWRpYSdzIGNvdmVyYWdlLCBzdHVkZW50cyByZXNlYXJjaCB0b3BpY3MgdG8gZmluZCBoaWdoLXF1YWxpdHkgc2Vjb25kYXJ5IHNvdXJjZXMsIHRoZW4gcHJvcG9zZSBhbiBvdXRsaW5lIGZvciBob3cgdGhlIHRvcGljIG91Z2h0IHRvIGJlIGNvdmVyZWQuIFRoZXkgZHJhZnQgdGhlaXIgYXJ0aWNsZXMsIGdpdmUgYW5kIHJlc3BvbmQgdG8gcGVlciBmZWVkYmFjaywgdGFrZSB0aGVpciB3b3JrIGxpdmUgb24gV2lraXBlZGlhLCBhbmQga2VlcCBpbXByb3ZpbmcgdGhlaXIgYXJ0aWNsZXMgdW50aWwgdGhlIGVuZCBvZiB0aGUgdGVybS4gQWxvbmcgdGhlIHdheSwgc3R1ZGVudHMgbWF5IHdvcmsgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWEgZWRpdG9ycyB3aG8gY2FuIG9mZmVyIGNyaXRpY2FsIGZlZWRiYWNrIGFuZCBoZWxwIG1ha2Ugc3VyZSBhcnRpY2xlcyBtZWV0IFdpa2lwZWRpYSdzIHN0YW5kYXJkcyBhbmQgc3R5bGUgY29udmVudGlvbnMuIFN0dWRlbnRzIHdobyBkbyBncmVhdCB3b3JrIG1heSBldmVuIGhhdmUgdGhlaXIgYXJ0aWNsZXMgZmVhdHVyZWQgb24gV2lraXBlZGlhJ3MgbWFpbiBwYWdlLiBTb2xpZCBhcnRpY2xlcyB3aWxsIGhlbHAgaW5mb3JtIHRob3VzYW5kcyBvZiBmdXR1cmUgcmVhZGVycyBhYm91dCB0aGUgc2VsZWN0ZWQgdG9waWMuXCJcbiAgICAgIFwiT3B0aW9uYWxseSwgc3R1ZGVudHMgbWF5IGJlIGFza2VkIHRvIHdyaXRlIGEgcmVmbGVjdGl2ZSBwYXBlciBhYm91dCB0aGVpciBXaWtpcGVkaWEgZXhwZXJpZW5jZSwgcHJlc2VudCB0aGVpciBjb250cmlidXRpb25zIGluIGNsYXNzLCBvciBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGFib3V0IHRoZWlyIHRvcGljcyBpbiBhIHNlcGFyYXRlIGVzc2F5LlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMTIgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIFN0dWRlbnRzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvIGNvdXJzZXNcIlxuICAgICAgXCJsYXJnZSBzdXJ2ZXkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBTT1VSQ0UtQ0VOVEVSRUQgQURESVRJT05TXG4gIHNvdXJjZWNlbnRlcmVkOiBcbiAgICB0aXRsZTogXCJTb3VyY2UtY2VudGVyZWQgYWRkaXRpb25zXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyByZWFkIFdpa2lwZWRpYSBhcnRpY2xlcyBpbiBhIHNlbGYtc2VsZWN0ZWQgc3ViamVjdCBhcmVhIHRvIGlkZW50aWZ5IGFydGljbGVzIGluIG5lZWQgb2YgcmV2aXNpb24gb3IgaW1wcm92ZW1lbnQsIHN1Y2ggYXMgdGhvc2Ugd2l0aCBcXFwiY2l0YXRpb24gbmVlZGVkXFxcIiB0YWdzLiBTdHVkZW50cyB3aWxsIGZpbmQgcmVsaWFibGUgc291cmNlcyB0byB1c2UgYXMgcmVmZXJlbmNlcyBmb3IgdW5jaXRlZCBjb250ZW50LiBUaGlzIGFzc2lnbm1lbnQgaW5jbHVkZXMgYSBwZXJzdWFzaXZlIGVzc2F5IGluIHdoaWNoIHN0dWRlbnRzIG1ha2UgYSBjYXNlIGZvciB0aGVpciBzdWdnZXN0ZWQgY2hhbmdlcywgd2h5IHRoZXkgYmVsaWV2ZSB0aGV5IGFyZSBxdWFsaWZpZWQgdG8gbWFrZSB0aG9zZSBjaGFuZ2VzLCBhbmQgd2h5IHRoZWlyIHNlbGVjdGVkIHNvdXJjZXMgcHJvdmlkZSBzdXBwb3J0LiBBZnRlciBtYWtpbmcgdGhlaXIgY29udHJpYnV0aW9ucywgc3R1ZGVudHMgcmVmbGVjdCBvbiB0aGVpciB3b3JrIHdpdGggYSBmb3JtYWwgcGFwZXIsIGFuZCBkaXNjdXNzIHdoZXRoZXIgdGhleSd2ZSBhY2NvbXBsaXNoZWQgdGhlaXIgc3RhdGVkIGdvYWxzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2UgY2xhc3Nlc1wiXG4gICAgICBcIkFkdmFuY2VkIHVuZGVyZ3JhZHVhdGVzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEZJTkQgQU5EIEZJWCBFUlJPUlNcbiAgZmluZGZpeDogXG4gICAgdGl0bGU6IFwiRmluZCBhbmQgZml4IGVycm9yc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGZpbmQgYW4gYXJ0aWNsZSBhYm91dCBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHdpdGggd2hpY2ggdGhleSBhcmUgZXh0cmVtZWx5IGZhbWlsaWFyIHRoYXQgaGFzIHNvbWUgbWlzdGFrZXMuIFN0dWRlbnRzIHRha2Ugd2hhdCB0aGV5IGtub3cgYWJvdXQgdGhlIHRvcGljLCBmaW5kIGZhY3R1YWwgZXJyb3JzIGFuZCBvdGhlciBzdWJzdGFudGl2ZSBtaXN0YWtlcywgYW5kIGNvcnJlY3QgdGhvc2UuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJHcmFkdWF0ZSBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cbiAgcGxhZ2lhcmlzbTogXG4gICAgdGl0bGU6IFwiSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBzZWFyY2ggdGhyb3VnaCBXaWtpcGVkaWEgYXJ0aWNsZXMgdG8gZmluZCBpbnN0YW5jZXMgb2YgY2xvc2UgcGFyYXBocmFzaW5nIG9yIHBsYWdpYXJpc20sIHRoZW4gcmV3b3JkIHRoZSBpbmZvcm1hdGlvbiBpbiB0aGVpciBvd24gbGFuZ3VhZ2UgdG8gYmUgYXBwcm9wcmlhdGUgZm9yIFdpa2lwZWRpYS4gSW4gdGhpcyBhc3NpZ25tZW50LCBzdHVkZW50cyBnYWluIGEgZGVlcGVyIHVuZGVyc3RhbmRpbmcgb2Ygd2hhdCBwbGFnaWFyaXNtIGlzIGFuZCBob3cgdG8gYXZvaWQgaXQuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJUQkRcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI1RSQU5TTEFURSBBTiBBUlRJQ0xFIFRPIEVOR0xJU0hcbiAgdHJhbnNsYXRlOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlRoaXMgaXMgYSBwcmFjdGljYWwgYXNzaWdubWVudCBmb3IgbGFuZ3VhZ2UgaW5zdHJ1Y3RvcnMuIFN0dWRlbnRzIHNlbGVjdCBhIFdpa2lwZWRpYSBhcnRpY2xlIGluIHRoZSBsYW5ndWFnZSB0aGV5IGFyZSBzdHVkeWluZywgYW5kIHRyYW5zbGF0ZSBpdCBpbnRvIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gU3R1ZGVudHMgc2hvdWxkIHN0YXJ0IHdpdGggaGlnaC1xdWFsaXR5IGFydGljbGVzIHdoaWNoIGFyZSBub3QgYXZhaWxhYmxlIGluIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZS4gVGhpcyBhc3NpZ25tZW50IHByb3ZpZGVzIHByYWN0aWNhbCB0cmFuc2xhdGlvbiBhZHZpY2Ugd2l0aCB0aGUgaW5jZW50aXZlIG9mIHJlYWwgcHVibGljIHNlcnZpY2UsIGFzIHN0dWRlbnRzIGV4cGFuZCB0aGUgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRhcmdldCBjdWx0dXJlIG9uIFdpa2lwZWRpYS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYrIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYW5ndWFnZSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB0cmFuc2xhdGluZyA8ZW0+ZnJvbTwvZW0+IHRoZWlyIG5hdGl2ZSBsYW5ndWFnZSB0byB0aGUgbGFuZ3VhZ2UgdGhleSdyZSBzdHVkeWluZ1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0NPUFkgRURJVElOR1xuICBjb3B5ZWRpdDogXG4gICAgdGl0bGU6IFwiQ29weWVkaXRcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIGFyZSBhc2tlZCB0byBjb3B5ZWRpdCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGVuZ2FnaW5nIGVkaXRvcnMgaW4gY29udmVyc2F0aW9uIGFib3V0IHRoZWlyIHdyaXRpbmcgYW5kIGltcHJvdmluZyB0aGUgY2xhcml0eSBvZiB0aGUgbGFuZ3VhZ2Ugb2YgdGhlIG1hdGVyaWFsLiBTdHVkZW50cyBsZWFybiB0byB3cml0ZSBpbiBkaWZmZXJlbnQgdm9pY2VzIGZvciBkaWZmZXJlbnQgYXVkaWVuY2VzLiBJbiBsZWFybmluZyBhYm91dCB0aGUgc3BlY2lmaWMgdm9pY2Ugb24gV2lraXBlZGlhLCB0aGV5IGxlYXJuIGFib3V0IHRoZSDigJxhdXRob3JpdGF0aXZl4oCdIHZvaWNlIGFuZCBob3cgaXRzIHRvbmUgY2FuIGNvbnZpbmNlLCBldmVuIGlmIHRoZSBjb250ZW50IGlzIHF1ZXN0aW9uYWJsZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkVuZ2xpc2ggZ3JhbW1hciBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB3aXRob3V0IHN0cm9uZyB3cml0aW5nIHNraWxsc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgI0VWQUxVQVRFIEFSVElDTEVTXG4gIGV2YWx1YXRlOiBcbiAgICB0aXRsZTogXCJFdmFsdWF0ZSBhcnRpY2xlc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiRmlyc3QsIHN0dWRlbnRzIHdyaXRlIGEgcmVwb3J0IGFuYWx5emluZyB0aGUgc3RhdGUgb2YgV2lraXBlZGlhIGFydGljbGVzIG9uIGNvdXJzZS1yZWxhdGVkIHRvcGljcyB3aXRoIGFuIGV5ZSB0b3dhcmQgZnV0dXJlIHJldmlzaW9ucy4gVGhpcyBlbmNvdXJhZ2VzIGEgY3JpdGljYWwgcmVhZGluZyBvZiBib3RoIGNvbnRlbnQgYW5kIGZvcm0uIFRoZW4sIHRoZSBzdHVkZW50cyBlZGl0IGFydGljbGVzIGluIHNhbmRib3hlcyB3aXRoIGZlZWRiYWNrIGZyb20gdGhlIHByb2Zlc3NvciwgY2FyZWZ1bGx5IHNlbGVjdGluZyBhbmQgYWRkaW5nIHJlZmVyZW5jZXMgdG8gaW1wcm92ZSB0aGUgYXJ0aWNsZSBiYXNlZCBvbiB0aGVpciBjcml0aWNhbCBlc3NheXMuIEZpbmFsbHksIHRoZXkgY29tcG9zZSBhIHNlbGYtYXNzZXNzbWVudCBldmFsdWF0aW5nIHRoZWlyIG93biBjb250cmlidXRpb25zLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI1IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiQ2xhc3NlcyB3aXRoIGZld2VyIHRoYW4gMzAgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIHN1cnZleSBjbGFzc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIEFERCBJTUFHRVMgT1IgTVVMVElNRURJQVxuICBtdWx0aW1lZGlhOiBcbiAgICB0aXRsZTogXCIgQWRkIGltYWdlcyBvciBtdWx0aW1lZGlhXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJJZiB5b3VyIHN0dWRlbnRzIGFyZSBhZGVwdCBhdCBtZWRpYSwgdGhpcyBjYW4gYmUgYSBncmVhdCB3YXkgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYSBpbiBhIG5vbi10ZXh0dWFsIHdheS4gSW4gdGhlIHBhc3QsIHN0dWRlbnRzIGhhdmUgcGhvdG9ncmFwaGVkIGxvY2FsIG1vbnVtZW50cyB0byBpbGx1c3RyYXRlIGFydGljbGVzLCBkZXNpZ25lZCBpbmZvZ3JhcGhpY3MgdG8gaWxsdXN0cmF0ZSBjb25jZXB0cywgb3IgY3JlYXRlZCB2aWRlb3MgdGhhdCBkZW1vbnN0cmF0ZWQgYXVkaW8tdmlzdWFsbHkgd2hhdCBhcnRpY2xlcyBkZXNjcmliZSBpbiB3b3Jkcy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiMiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjMgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHN0dWR5aW5nIHBob3RvZ3JhcGh5LCB2aWRlb2dyYXBoeSwgb3IgZ3JhcGhpYyBkZXNpZ25cIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgbWVkaWEgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvdXJzZUluZm8iLCJXaXphcmRTdGVwSW5wdXRzID1cblxuXG4gIGludHJvOiBcbiAgICB0ZWFjaGVyOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgbmFtZSdcbiAgICAgIGlkOiAndGVhY2hlcidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBjb3Vyc2VfbmFtZTpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdDb3Vyc2UgbmFtZSdcbiAgICAgIGlkOiAnY291cnNlX25hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHNjaG9vbDpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdVbml2ZXJzaXR5J1xuICAgICAgaWQ6ICdzY2hvb2wnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1YmplY3Q6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnU3ViamVjdCdcbiAgICAgIGlkOiAnc3ViamVjdCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgc3R1ZGVudHM6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBpbnN0cnVjdG9yX3VzZXJuYW1lOlxuICAgICAgbGFiZWw6ICdVc2VybmFtZSAodGVtcG9yYXJ5KSdcbiAgICAgIGlkOiAnaW5zdHJ1Y3Rvcl91c2VybmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcbiAgICAgIHZhbHVlOiAnJ1xuXG4gICAgd2l6YXJkX2VuZF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgXG4gIFxuXG4gIGFzc2lnbm1lbnRfc2VsZWN0aW9uOiBcbiAgICByZXNlYXJjaHdyaXRlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdyZXNlYXJjaHdyaXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuZCB3cml0ZSBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiB0cnVlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBcblxuICAgIGV2YWx1YXRlOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2V2YWx1YXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0V2YWx1YXRlIGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuICAgIFxuICAgIG11bHRpbWVkaWE6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cblxuICAgIHNvdXJjZWNlbnRlcmVkOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3NvdXJjZWNlbnRlcmVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1NvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICBcblxuICAgIGNvcHllZGl0OiBcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cblxuICAgIGZpbmRmaXg6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZmluZGZpeCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdGaW5kIGFuZCBmaXggZXJyb3JzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuICAgIFxuICAgIHBsYWdpYXJpc206XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncGxhZ2lhcmlzbSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJZGVudGlmeSBhbmQgZml4IHBsYWdpYXJpc20nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgXG5cbiAgICBzb21ldGhpbmdfZWxzZTpcbiAgICAgIHR5cGU6ICdsaW5rJ1xuICAgICAgaHJlZjogJ21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJ1xuICAgICAgaWQ6ICdzb21ldGhpbmdfZWxzZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBIGRpZmZlcmVudCBhc3NpZ25tZW50PyBHZXQgaW4gdG91Y2ggaGVyZS4nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiBmYWxzZVxuICAgICAgdGlwSW5mbzpcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFwiSGF2ZSBhbm90aGVyIGlkZWEgZm9yIGluY29ycG9yYXRpbmcgV2lraXBlZGlhIGludG8geW91ciBjbGFzcz8gV2UndmUgZm91bmQgdGhhdCB0aGVzZSBhc3NpZ25tZW50cyB3b3JrIHdlbGwsIGJ1dCB0aGV5IGFyZW4ndCB0aGUgb25seSB3YXkgdG8gZG8gaXQuIEdldCBpbiB0b3VjaCwgYW5kIHdlIGNhbiB0YWxrIHRoaW5ncyB0aHJvdWdoOiA8YSBzdHlsZT0nY29sb3I6IzUwNWE3ZjsnIGhyZWY9J21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJz5jb250YWN0QHdpa2llZHUub3JnPC9hPlwiXG5cblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBcbiAgICBjcmVhdGVfdXNlcjpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSB1c2VyIGFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgIFxuICAgIGVucm9sbDpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdlbnJvbGwnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdFbnJvbGwgdG8gdGhlIGNvdXJzZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cbiAgICBjb21wbGV0ZV90cmFpbmluZzpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb21wbGV0ZV90cmFpbmluZydcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRlIG9ubGluZSB0cmFpbmluZydcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICBpbnRyb2R1Y2VfYW1iYXNzYWRvcnM6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaW50cm9kdWNlX2FtYmFzc2Fkb3JzJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgXG4gICAgIyBpbmNsdWRlX2NvbXBsZXRpb246XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdpbmNsdWRlX2NvbXBsZXRpb24nXG4gICAgIyAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICMgICBsYWJlbDogJ0luY2x1ZGUgQ29tcGxldGlvbiBvZiB0aGlzIEFzc2lnbm1lbnQgYXMgUGFydCBvZiB0aGUgU3R1ZGVudHNcXCdzIEdyYWRlJ1xuICAgICMgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICB0cmFpbmluZ19ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgdHJhaW5pbmdfbm90X2dyYWRlZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAndHJhaW5pbmdfbm90X2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgbm90IGJlIGdyYWRlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICBcbiAgXG5cbiAgZ2V0dGluZ19zdGFydGVkOiBcbiAgICBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JpdGlxdWUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuXG4gICAgYWRkX3RvX2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2FkZF90b19hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQWRkIHRvIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cblxuICAgIGNvcHlfZWRpdF9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5X2VkaXRfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgIFxuICAgIGlsbHVzdHJhdGVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaWxsdXN0cmF0ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lsbHVzdHJhdGUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgXG5cbiAgY2hvb3NpbmdfYXJ0aWNsZXM6IFxuICAgIHByZXBhcmVfbGlzdDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAncHJlcGFyZV9saXN0J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luc3RydWN0b3IgcHJlcGFyZXMgYSBsaXN0cydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc1N1YkNob2ljZTogdHJ1ZVxuICAgICAgXG4gICAgc3R1ZGVudHNfZXhwbG9yZTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnc3R1ZGVudHNfZXhwbG9yZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdTdHVkZW50cyBmaW5kIGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzU3ViQ2hvaWNlOiB0cnVlXG5cbiAgICByZXF1ZXN0X2hlbHA6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlcXVlc3RfaGVscCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBvciBldmF1bGF0aW5nIGFydGljbGUgY2hvaWNlcz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBjb25kaXRpb25hbF9sYWJlbDogXG4gICAgICAgIHByZXBhcmVfbGlzdDogXCJXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBhcnRpY2xlcz9cIlxuICAgICAgICBzdHVkZW50c19leHBsb3JlOiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgZXZhbHVhdGluZyBzdHVkZW50IGNob2ljZXM/XCJcbiAgICAgIFxuXG5cbiAgcmVzZWFyY2hfcGxhbm5pbmc6IFxuICAgIGNyZWF0ZV9vdXRsaW5lOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjcmVhdGVfb3V0bGluZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUcmFkaXRpb25hbCBvdXRsaW5lJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIlRyYWRpdGlvbmFsIG91dGxpbmVcIlxuICAgICAgICBjb250ZW50OiBcIkZvciBlYWNoIGFydGljbGUsIHRoZSBzdHVkZW50cyBjcmVhdGUgYW4gb3V0bGluZSB0aGF0IHJlZmxlY3RzIHRoZSBpbXByb3ZlbWVudHMgdGhleSBwbGFuIHRvIG1ha2UsIGFuZCB0aGVuIHBvc3QgaXQgdG8gdGhlIGFydGljbGUncyB0YWxrIHBhZ2UuIFRoaXMgaXMgYSByZWxhdGl2ZWx5IGVhc3kgd2F5IHRvIGdldCBzdGFydGVkLlwiXG4gICAgXG4gICAgd3JpdGVfbGVhZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd3JpdGVfbGVhZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgbGVhZCBzZWN0aW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiBcIldpa2lwZWRpYSBsZWFkIHNlY3Rpb25cIlxuICAgICAgICBjb250ZW50OlxuICAgICAgICAgIFwiPHA+Rm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhIHdlbGwtYmFsYW5jZWQgc3VtbWFyeSBvZiBpdHMgZnV0dXJlIHN0YXRlIGluIHRoZSBmb3JtIG9mIGEgV2lraXBlZGlhIGxlYWQgc2VjdGlvbi4gVGhlIGlkZWFsIGxlYWQgc2VjdGlvbiBleGVtcGxpZmllcyBXaWtpcGVkaWEncyBzdW1tYXJ5IHN0eWxlIG9mIHdyaXRpbmc6IGl0IGJlZ2lucyB3aXRoIGEgc2luZ2xlIHNlbnRlbmNlIHRoYXQgZGVmaW5lcyB0aGUgdG9waWMgYW5kIHBsYWNlcyBpdCBpbiBjb250ZXh0LCBhbmQgdGhlbiDigJQgaW4gb25lIHRvIGZvdXIgcGFyYWdyYXBocywgZGVwZW5kaW5nIG9uIHRoZSBhcnRpY2xlJ3Mgc2l6ZSDigJQgaXQgb2ZmZXJzIGEgY29uY2lzZSBzdW1tYXJ5IG9mIHRvcGljLiBBIGdvb2QgbGVhZCBzZWN0aW9uIHNob3VsZCByZWZsZWN0IHRoZSBtYWluIHRvcGljcyBhbmQgYmFsYW5jZSBvZiBjb3ZlcmFnZSBvdmVyIHRoZSB3aG9sZSBhcnRpY2xlLjwvcD5cbiAgICAgICAgICA8cD5PdXRsaW5pbmcgYW4gYXJ0aWNsZSB0aGlzIHdheSBpcyBhIG1vcmUgY2hhbGxlbmdpbmcgYXNzaWdubWVudCDigJQgYW5kIHdpbGwgcmVxdWlyZSBtb3JlIHdvcmsgdG8gZXZhbHVhdGUgYW5kIHByb3ZpZGUgZmVlZGJhY2sgZm9yLiBIb3dldmVyLCBpdCBjYW4gYmUgbW9yZSBlZmZlY3RpdmUgZm9yIHRlYWNoaW5nIHRoZSBwcm9jZXNzIG9mIHJlc2VhcmNoLCB3cml0aW5nLCBhbmQgcmV2aXNpb24uIFN0dWRlbnRzIHdpbGwgcmV0dXJuIHRvIHRoaXMgbGVhZCBzZWN0aW9uIGFzIHRoZXkgZ28sIHRvIGd1aWRlIHRoZWlyIHdyaXRpbmcgYW5kIHRvIHJldmlzZSBpdCB0byByZWZsZWN0IHRoZWlyIGltcHJvdmVkIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHRvcGljIGFzIHRoZWlyIHJlc2VhcmNoIHByb2dyZXNzZXMuIFRoZXkgd2lsbCB0YWNrbGUgV2lraXBlZGlhJ3MgZW5jeWNsb3BlZGljIHN0eWxlIGVhcmx5IG9uLCBhbmQgdGhlaXIgb3V0bGluZSBlZmZvcnRzIHdpbGwgYmUgYW4gaW50ZWdyYWwgcGFydCBvZiB0aGVpciBmaW5hbCB3b3JrLjwvcD5cIlxuICAgICAgICBcblxuXG4gIGRyYWZ0c19tYWluc3BhY2U6IFxuICAgIHdvcmtfbGl2ZTpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnd29ya19saXZlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvcmsgbGl2ZSBmcm9tIHRoZSBzdGFydCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgXG4gICAgc2FuZGJveDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnc2FuZGJveCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEcmFmdCBlYXJseSB3b3JrIGluIHNhbmRib3hlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgXG5cbiAgcGVlcl9mZWVkYmFjazogXG4gICAgcGVlcl9yZXZpZXdzOlxuICAgICAgdHlwZTogJ3JhZGlvR3JvdXAnXG4gICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgIGxhYmVsOiAnJ1xuICAgICAgdmFsdWU6ICcyJ1xuICAgICAgc2VsZWN0ZWQ6IDFcbiAgICAgIG9wdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAwXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzEnXG4gICAgICAgICAgdmFsdWU6ICcxJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMVxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcyJ1xuICAgICAgICAgIHZhbHVlOiAnMidcbiAgICAgICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMlxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICczJ1xuICAgICAgICAgIHZhbHVlOiAnMydcbiAgICAgICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgICAgfVxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDNcbiAgICAgICAgICBuYW1lOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNCdcbiAgICAgICAgICB2YWx1ZTogJzQnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiA0XG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzUnXG4gICAgICAgICAgdmFsdWU6ICc1J1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICBdXG4gICAgXG4gIFxuXG4gIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6IFxuICAgIGNsYXNzX2Jsb2c6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX2Jsb2cnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ2xhc3MgYmxvZyBvciBkaXNjdXNzaW9uJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogXG4gICAgICAgIHRpdGxlOiAnQ2xhc3MgYmxvZyBvciBjbGFzcyBkaXNjdXNzaW9uJ1xuICAgICAgICBjb250ZW50OiAnU3R1ZGVudHMga2VlcCBhIHJ1bm5pbmcgYmxvZyBhYm91dCB0aGVpciBleHBlcmllbmNlcy4gR2l2aW5nIHRoZW0gcHJvbXB0cyBldmVyeSB3ZWVrIG9yIHR3bywgc3VjaCBhcyDigJxUbyB3aGF0IGV4dGVudCBhcmUgdGhlIGVkaXRvcnMgb24gV2lraXBlZGlhIGEgc2VsZi1zZWxlY3RpbmcgZ3JvdXAgYW5kIHdoeT/igJ0gd2lsbCBoZWxwIHRoZW0gdGhpbmsgYWJvdXQgdGhlIGxhcmdlciBpc3N1ZXMgc3Vycm91bmRpbmcgdGhpcyBvbmxpbmUgZW5jeWNsb3BlZGlhIGNvbW11bml0eS4gSXQgd2lsbCBhbHNvIGdpdmUgeW91IG1hdGVyaWFsIGJvdGggb24gdGhlIHdpa2kgYW5kIG9mZiB0aGUgd2lraSB0byBncmFkZS4gSWYgeW91IGhhdmUgdGltZSBpbiBjbGFzcywgdGhlc2UgZGlzY3Vzc2lvbnMgY2FuIGJlIHBhcnRpY3VsYXJseSBjb25zdHJ1Y3RpdmUgaW4gcGVyc29uLidcbiAgICAgIFxuICAgIGNsYXNzX3ByZXNlbnRhdGlvbjpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfcHJlc2VudGF0aW9uJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0luLWNsYXNzIHByZXNlbnRhdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIFdpa2lwZWRpYSB3b3JrJ1xuICAgICAgICBjb250ZW50OiBcIkVhY2ggc3R1ZGVudCBvciBncm91cCBwcmVwYXJlcyBhIHNob3J0IHByZXNlbnRhdGlvbiBmb3IgdGhlIGNsYXNzLCBleHBsYWluaW5nIHdoYXQgdGhleSB3b3JrZWQgb24sIHdoYXQgd2VudCB3ZWxsIGFuZCB3aGF0IGRpZG4ndCwgYW5kIHdoYXQgdGhleSBsZWFybmVkLiBUaGVzZSBwcmVzZW50YXRpb25zIGNhbiBtYWtlIGV4Y2VsbGVudCBmb2RkZXIgZm9yIGNsYXNzIGRpc2N1c3Npb25zIHRvIHJlaW5mb3JjZSB5b3VyIGNvdXJzZSdzIGxlYXJuaW5nIGdvYWxzLlwiXG4gICAgICBcbiAgICByZWZsZWN0aXZlX2Vzc2F5OlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdyZWZsZWN0aXZlX2Vzc2F5J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgY29udGVudDogXCJBc2sgc3R1ZGVudHMgdG8gd3JpdGUgYSBzaG9ydCByZWZsZWN0aXZlIGVzc2F5IG9uIHRoZWlyIGV4cGVyaWVuY2VzIHVzaW5nIFdpa2lwZWRpYS4gVGhpcyB3b3JrcyB3ZWxsIGZvciBib3RoIHNob3J0IGFuZCBsb25nIFdpa2lwZWRpYSBwcm9qZWN0cy4gQW4gaW50ZXJlc3RpbmcgaXRlcmF0aW9uIG9mIHRoaXMgaXMgdG8gaGF2ZSBzdHVkZW50cyB3cml0ZSBhIHNob3J0IHZlcnNpb24gb2YgdGhlIGVzc2F5IGJlZm9yZSB0aGV5IGJlZ2luIGVkaXRpbmcgV2lraXBlZGlhLCBvdXRsaW5pbmcgdGhlaXIgZXhwZWN0YXRpb25zLCBhbmQgdGhlbiBoYXZlIHRoZW0gcmVmbGVjdCBvbiB3aGV0aGVyIG9yIG5vdCB0aGV5IG1ldCB0aG9zZSBleHBlY3RhdGlvbnMgZHVyaW5nIHRoZSBhc3NpZ25tZW50LlwiXG4gICAgICBcbiAgICBwb3J0Zm9saW86XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3BvcnRmb2xpbydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdXaWtpcGVkaWEgcG9ydGZvbGlvJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICAgIGNvbnRlbnQ6IFwiU3R1ZGVudHMgb3JnYW5pemUgdGhlaXIgV2lraXBlZGlhIHdvcmsgaW50byBhIHBvcnRmb2xpbywgaW5jbHVkaW5nIGEgbmFycmF0aXZlIG9mIHRoZSBjb250cmlidXRpb25zIHRoZXkgbWFkZSDigJQgYW5kIGhvdyB0aGV5IHdlcmUgcmVjZWl2ZWQsIGFuZCBwb3NzaWJseSBjaGFuZ2VkLCBieSBvdGhlciBXaWtpcGVkaWFucyDigJQgYW5kIGxpbmtzIHRvIHRoZWlyIGtleSBlZGl0cy4gQ29tcG9zaW5nIHRoaXMgcG9ydGZvbGlvIHdpbGwgaGVscCBzdHVkZW50cyB0aGluayBtb3JlIGRlZXBseSBhYm91dCB0aGVpciBXaWtpcGVkaWEgZXhwZXJpZW5jZXMsIGFuZCBhbHNvIHByb3ZpZGVzIGEgbGVucyB0aHJvdWdoIHdoaWNoIHRvIHVuZGVyc3RhbmQg4oCUIGFuZCBncmFkZSDigJQgdGhlaXIgd29yay5cIlxuICAgIFxuICAgIG9yaWdpbmFsX3BhcGVyOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdvcmlnaW5hbF9wYXBlcidcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdPcmlnaW5hbCBhbmFseXRpY2FsIHBhcGVyJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICAgIGNvbnRlbnQ6IFwiSW4gY291cnNlcyB0aGF0IGVtcGhhc2l6ZSB0cmFkaXRpb25hbCByZXNlYXJjaCBza2lsbHMgYW5kIHRoZSBkZXZlbG9wbWVudCBvZiBvcmlnaW5hbCBpZGVhcyB0aHJvdWdoIGEgdGVybSBwYXBlciwgV2lraXBlZGlhJ3MgcG9saWN5IG9mIFxcXCJubyBvcmlnaW5hbCByZXNlYXJjaFxcXCIgbWF5IGJlIHRvbyByZXN0cmljdGl2ZS4gTWFueSBpbnN0cnVjdG9ycyBwYWlyIFdpa2lwZWRpYSB3cml0aW5nIHdpdGggY29tcGxlbWVudGFyeSBhbmFseXRpY2FsIHBhcGVyOyBzdHVkZW50c+KAmSBXaWtpcGVkaWEgYXJ0aWNsZXMgYXMgYSBsaXRlcmF0dXJlIHJldmlldywgYW5kIHRoZSBzdHVkZW50cyBnbyBvbiB0byBkZXZlbG9wIHRoZWlyIG93biBpZGVhcyBhbmQgYXJndW1lbnRzIGluIHRoZSBvZmZsaW5lIGFuYWx5dGljYWwgcGFwZXIuXCJcbiAgICAgIFxuICAgIG5vbmVfb2ZfYWJvdmU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ25vbmVfb2ZfYWJvdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnTm9uZSBvZiB0aGUgYWJvdmUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcblxuICBkeWs6XG4gICAgZHlrOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdkeWsnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRGlkIFlvdSBLbm93PydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICBnYTogXG4gICAgZ2E6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2dhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0dvb2QgQXJ0aWNsZSBub21pbmF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICBncmFkaW5nOiBcbiAgICBsZWFybmluZ19lc3NlbnRpYWxzOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgZXNzZW50aWFscydcbiAgICAgIGlkOiAnbGVhcm5pbmdfZXNzZW50aWFscydcbiAgICAgIHZhbHVlOiA1XG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICAgIGFzc2lnbm1lbnRzOiBbXVxuICAgIFxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogMFxuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgY2hvb3NpbmdfYXJ0aWNsZXM6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgdmFsdWU6IDBcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHJlc2VhcmNoX3BsYW5uaW5nOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuIHBsYW5uaW5nJ1xuICAgICAgaWQ6ICdyZXNlYXJjaF9wbGFubmluZydcbiAgICAgIHZhbHVlOiAwXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6IDBcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHBlZXJfZmVlZGJhY2s6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnUGVlciBmZWVkYmFjaydcbiAgICAgIGlkOiAncGVlcl9mZWVkYmFjaydcbiAgICAgIHZhbHVlOiAwXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICB2YWx1ZTogMCBcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG4gICAgZ3JhZGluZ19zZWxlY3Rpb246XG4gICAgICBsYWJlbDogJ0dyYWRpbmcgYmFzZWQgb246J1xuICAgICAgaWQ6ICdncmFkaW5nX3NlbGVjdGlvbidcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgb3B0aW9uczogXG4gICAgICAgIHBlcmNlbnQ6IFxuICAgICAgICAgIGxhYmVsOiAnUGVyY2VudGFnZSdcbiAgICAgICAgICB2YWx1ZTogJ3BlcmNlbnQnXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgcG9pbnRzOlxuICAgICAgICAgIGxhYmVsOiAnUG9pbnRzJ1xuICAgICAgICAgIHZhbHVlOiAncG9pbnRzJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICBcbiAgICAgIFxuXG5cblxuICBvdmVydmlldzogXG4gICAgbGVhcm5pbmdfZXNzZW50aWFsczpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdMZWFybmluZyBXaWtpIGVzc2VudGlhbHMnXG4gICAgICBpZDogJ2xlYXJuaW5nX2Vzc2VudGlhbHMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG4gICAgZ2V0dGluZ19zdGFydGVkOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgICBpZDogJ2dldHRpbmdfc3RhcnRlZCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBjaG9vc2luZ19hcnRpY2xlczpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdDaG9vc2luZyBhcnRpY2xlcydcbiAgICAgIGlkOiAnY2hvb3NpbmdfYXJ0aWNsZXMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG4gICAgcmVzZWFyY2hfcGxhbm5pbmc6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgICAgaWQ6ICdyZXNlYXJjaF9wbGFubmluZydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgZHJhZnRzX21haW5zcGFjZTpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdEcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAgIGlkOiAnZHJhZnRzX21haW5zcGFjZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgcGVlcl9mZWVkYmFjazpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdQZWVyIEZlZWRiYWNrJ1xuICAgICAgaWQ6ICdwZWVyX2ZlZWRiYWNrJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgICBpZDogJ3N1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuXG5cbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICAgIHdpemFyZF9lbmRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICAgIFxuXG5cblxuXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkU3RlcElucHV0cyIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgVmlld0hlbHBlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCAnbGluaycsICggdGV4dCwgdXJsICkgLT5cblxuICB0ZXh0ID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB0ZXh0IClcbiAgdXJsICA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdXJsIClcblxuICByZXN1bHQgPSAnPGEgaHJlZj1cIicgKyB1cmwgKyAnXCI+JyArIHRleHQgKyAnPC9hPidcblxuICByZXR1cm4gbmV3IEhhbmRsZWJhcnMuU2FmZVN0cmluZyggcmVzdWx0IClcbikiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIC0gQXBwbGljYXRpb24gSW5pdGl0aWFsaXplclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4vQXBwJylcblxuXG4kIC0+XG4gIFxuICAjIEluaXRpYWxpemUgQXBwbGljYXRpb25cbiAgYXBwbGljYXRpb24uaW5pdGlhbGl6ZSgpXG5cbiAgIyBTdGFydCBCYWNrYm9uZSByb3V0ZXJcbiAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCgpXG5cbiAgIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5Nb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9zdXBlcnMvTW9kZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBNb2RlbCBleHRlbmRzIE1vZGVsXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBJTkhFUklURUQgLyBPVkVSUklERVNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBFVkVOVCBIQU5ETEVSU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgLSBSb3V0ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgUm91dGVyIGV4dGVuZHMgQmFja2JvbmUuUm91dGVyXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBSb3V0ZXNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIFxuICByb3V0ZXM6XG4gICAgJycgOiAnaG9tZSdcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEhhbmRsZXJzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBob21lOiAtPlxuICAgIGlmICQoJyNhcHAnKS5sZW5ndGggPiAwXG5cbiAgICAgIEBjdXJyZW50V2lraVVzZXIgPSAkKCAnI2FwcCcgKS5hdHRyKCdkYXRhLXdpa2l1c2VyJylcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snaW50cm8nXVsnaW5zdHJ1Y3Rvcl91c2VybmFtZSddWyd2YWx1ZSddID0gQGN1cnJlbnRXaWtpVXNlclxuXG4gICAgICAkKCAnI2FwcCcgKS5odG1sKGFwcGxpY2F0aW9uLmhvbWVWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwJylcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwJykpXG5cbiAgICAgIGVsc2UgaWYgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcGlkJylcblxuICAgICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG9JZCcsIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXBpZCcpKVxuXG5cbiAgICBlbHNlIGlmICQoJyNsb2dpbicpLmxlbmd0aCA+IDBcblxuICAgICAgKCQgJyNsb2dpbicpLmh0bWwoYXBwbGljYXRpb24ubG9naW5WaWV3LnJlbmRlcigpLmVsKVxuXG4gICNcbiAgIyBVdGlsaXRpZXNcbiAgI1xuXG4gIGdldFBhcmFtZXRlckJ5TmFtZTogKG5hbWUpIC0+XG5cbiAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9bXFxbXS8sIFwiXFxcXFtcIikucmVwbGFjZSgvW1xcXV0vLCBcIlxcXFxdXCIpXG5cbiAgICByZWdleCA9IG5ldyBSZWdFeHAoXCJbXFxcXD8mXVwiICsgbmFtZSArIFwiPShbXiYjXSopXCIpXG5cbiAgICByZXN1bHRzID0gcmVnZXguZXhlYyhsb2NhdGlvbi5zZWFyY2gpXG5cbiAgICAoaWYgbm90IHJlc3VsdHM/IHRoZW4gXCJcIiBlbHNlIGRlY29kZVVSSUNvbXBvbmVudChyZXN1bHRzWzFdLnJlcGxhY2UoL1xcKy9nLCBcIiBcIikpKVxuXG5cbiIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IEhvbWUgUGFnZSBUZW1wbGF0ZVxcbi0tPlxcblxcbjwhLS0gTUFJTiBBUFAgQ09OVEVOVCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+PC9kaXY+PCEtLSBlbmQgLnN0ZXBzIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5jb250ZW50IC0tPlwiO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgICAgICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtX19zdWJ0aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgICAgICAgIDxwIGNsYXNzPVxcXCJsYXJnZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxvZ2luX2luc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubG9naW5faW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblxcblxcbiAgPCEtLSBTVEVQUyBNQUlOIENPTlRBSU5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXBzXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcCBzdGVwLS1maXJzdCBzdGVwLS1sb2dpblxcXCI+XFxuICAgIFxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICAgICAgICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgICAgICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICBcXG4gICAgICAgICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubG9naW5faW5zdHJ1Y3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcblxcbiAgICAgICAgPCEtLSBCRUdJTiBCVVRUT04gLS0+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tYWN0aW9uc1xcXCI+XFxuICAgICAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlXFxcIiBpZD1cXFwibG9naW5CdXR0b25cXFwiIGhyZWY9XFxcIi9hdXRoL21lZGlhd2lraVxcXCI+XFxuICAgICAgICAgICAgTG9naW4gd2l0aCBXaWtpcGVkaWFcXG4gICAgICAgICAgPC9hPlxcbiAgICAgICAgICA8YSBjbGFzcz1cXFwiZm9udC1ibHVlXFxcIiBocmVmPVxcXCIvd2VsY29tZVxcXCIgaWQ9XFxcInNraXBMb2dpbkJ1dHRvblxcXCI+XFxuICAgICAgICAgICAgPGVtPm9yIHNraXAgaXQgZm9yIG5vdyBhbmQganVzdCBzZWUgdGhlIGN1cnJlbnQgYnVpbGQ8L2VtPlxcbiAgICAgICAgICA8L2E+XFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWFjdGlvbnMgLS0+XFxuXFxuXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJkb3Qgc3RlcC1uYXYtaW5kaWNhdG9yc19faXRlbSBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmlzQWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaGFzVmlzaXRlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgZGF0YS1uYXYtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0aXRsZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBUaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcFRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcElkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwSWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj4qPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJhY3RpdmVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcInZpc2l0ZWRcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImluYWN0aXZlXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogU3RlcCBOYXZpZ2F0aW9uIFxcbi0tPlxcblxcblxcbjwhLS0gU1RFUCBOQVYgRE9UIElORElDQVRPUlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtaW5kaWNhdG9ycyBoaWRkZW5cXFwiPlxcblxcbiAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnN0ZXBzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWluZGljYXRvcnMgLS0+XFxuXFxuXFxuXFxuPCEtLSBTVEVQIE5BViBCVVRUT05TIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnNcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9ucy0tbm9ybWFsXFxcIj5cXG4gICAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcInN0ZXAtbmF2X19idXR0b24gc3RlcC1uYXYtLXByZXYgcHJldiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnByZXZJbmFjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcImFycm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLXJpZ2h0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLWxlZnRcXFwiPjwvZGl2PlxcbiAgICAgIDwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+UHJldjwvc3Bhbj5cXG4gICAgPC9hPlxcblxcbiAgICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tbmV4dCBuZXh0IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubmV4dEluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+TmV4dDwvc3Bhbj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwiYXJyb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tbGVmdDo1cHg7XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1yaWdodFxcXCI+PC9kaXY+XFxuICAgICAgPC9zcGFuPlxcbiAgICA8L2E+XFxuICA8L2Rpdj5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWJ1dHRvbnMtLWVkaXRcXFwiPlxcbiAgICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tcHJldiBjYW5jZWwgZXhpdC1lZGl0XFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+Q2FuY2VsPC9zcGFuPlxcbiAgICA8L2E+XFxuXFxuICAgIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1uZXh0IGNvbmZpcm0gZXhpdC1lZGl0XFxcIj5cXG4gICAgICA8c3BhbiBjbGFzcz1cXFwidGV4dFxcXCI+Q29uZmlybSBFZGl0PC9zcGFuPlxcbiAgICA8L2E+XFxuXFxuICA8L2Rpdj5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtYnV0dG9ucyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDYsIHByb2dyYW02LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICBcXG4gICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gIFxcbiAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIDwvZGl2PlxcbiAgIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcbiAgPCEtLSBJTlRSTyBTVEVQIEZPUk0gQVJFQSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbm5lclxcXCI+XFxuICAgIDwhLS0gZm9ybSBmaWVsZHMgLS0+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWlubmVyIC0tPlxcblxcblxcbiAgPCEtLSBEQVRFUyBNT0RVTEUgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tZGF0ZXNcXFwiPlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1kYXRlcyAtLT5cXG5cXG4gIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJuby1lZGl0LW1vZGVcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJidXR0b24gYnV0dG9uLS1ibHVlXFxcIiBpZD1cXFwiYmVnaW5CdXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPlxcbiAgICAgICAgQmVnaW4gQXNzaWdubWVudCBXaXphcmRcXG4gICAgICA8L2E+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJlZGl0LW1vZGUtb25seVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWUgZXhpdC1lZGl0XFxcIiBocmVmPVxcXCIjXFxcIj5cXG4gICAgICAgIEJhY2tcXG4gICAgICA8L2E+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1hY3Rpb25zIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtLWNvbnRlbnRfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5mb1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbmZvVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxwIGNsYXNzPVxcXCJsYXJnZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuYWNjb3JkaWFuLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIFxcbiAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIEhFQURFUiAtLT5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTIsIHByb2dyYW0xMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcXG4gICAgICA8IS0tIElORk8gU0VDVElPTiBDT05URU5UIC0tPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19jb250ZW50XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2NvbnRlbnQgLS0+XFxuXFxuICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbiAtLT5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBzdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tc2VjdGlvbl9faGVhZGVyXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlciAtLT5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiAgICBcXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgICAgXFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYWluIEluZGl2aWRhbCBTdGVwIFRlbXBsYXRlXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIEZPUk0gOiBMZWZ0IFNpZGUgb2YgU3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gIDwvZGl2PlxcblxcbiAgXFxuICA8IS0tIFNURVAgRk9STSBJTk5FUiBDT05URU5UIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWNvbnRlbnRcXFwiPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPjwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG5cXG5cXG5cXG48IS0tIFNURVAgSU5GTyA6IFJpZ2h0IHNpZGUgb2Ygc3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm9cXFwiPlxcbiAgXFxuICA8IS0tIFdJS0lFRFUgTE9HTyAtLT5cXG4gIDxhIGNsYXNzPVxcXCJtYWluLWxvZ29cXFwiIGhyZWY9XFxcImh0dHA6Ly93aWtpZWR1Lm9yZ1xcXCIgdGFyZ2V0PVxcXCJfYmxhbmtcXFwiIHRpdGxlPVxcXCJ3aWtpZWR1Lm9yZ1xcXCI+V0lLSUVEVS5PUkc8L2E+XFxuXFxuICA8IS0tIFNURVAgSU5GTyBJTk5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1pbm5lclxcXCI+XFxuXFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5mb1RpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5zdHJ1Y3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgIFxcbiAgICA8IS0tIElORk8gU0VDVElPTlMgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zZWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1pbm5lciAtLT5cXG4gIFxcblxcblxcbiAgPCEtLSBTVEVQIElORk8gVElQIFNFQ1RJT04gLS0+XFxuICA8IS0tIHVzZWQgZm9yIGJvdGggY291cnNlIGluZm8gYW5kIGdlbmVyaWMgaW5mbyAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBzXFxcIj48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXRpcHMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mbyAtLT5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8cD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvcD5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGxpIGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvbGk+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS1ncmlkXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50ZXh0KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50ZXh0OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiA6IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGFycykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RhcnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvIHN0ZXAtaW5mby10aXBcXFwiIGRhdGEtaXRlbS1pbmRleD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbjxhIGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19jbG9zZVxcXCI+Q2xvc2UgSW5mbzwvYT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jayBcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Bc3NpZ25tZW50IHR5cGU6IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RleHRcXFwiPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmRlc2NyaXB0aW9uLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPC9kaXY+XFxuXFxuICAgICAgXFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5NaW5pbXVtIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5taW5fdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm1pbl90aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+UmVjb21tZW5kZWQgdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnJlY190aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAucmVjX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkJlc3QgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuYmVzdF9mb3IsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+Tm90IGFwcHJvcHJpYXRlIGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLm5vdF9mb3IsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvdWw+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TGVhcm5pbmcgT2JqZWN0aXZlczwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmxlYXJuaW5nX29iamVjdGl2ZXMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8cD5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuY29udGVudCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuY29udGVudDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBcXFwiIGRhdGEtaXRlbS1pbmRleD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlxcbiAgXFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuY29udGVudCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJpbmZvLWFycm93XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1jaGVja2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZGlzYWJsZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZXhjbHVzaXZlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj48c3Bhbj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcbiAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJjaGVja2JveFxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgIC8+XFxuICA8YSBjbGFzcz1cXFwiY2hlY2stYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgbm90LWVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGVkaXRhYmxlIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW04KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGRhdGEtZXhjbHVzaXZlPVxcXCJ0cnVlXFxcIiBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtY2hlY2tib3gtZ3JvdXBcXFwiIGRhdGEtY2hlY2tib3gtZ3JvdXA9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1jaGVja2JveC1ncm91cF9fbGFiZWxcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9kaXY+XFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIC8+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdHVtLWlucHV0LS1zZWxlY3QgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubXVsdGlwbGUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gIDxzZWxlY3QgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm11bHRpcGxlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE4LCBwcm9ncmFtMTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjAsIHByb2dyYW0yMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gIDwvc2VsZWN0PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY3VzdHVtLWlucHV0LS1zZWxlY3QtLW11bHRpIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBtdWx0aXBsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvb3B0aW9uPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS10ZXh0X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcGVyY2VudFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXBlcmNlbnRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtY29udGFpbmVyXFxcIj5cXG4gICAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50eXBlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcGxhY2Vob2xkZXI9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wbGFjZWhvbGRlcikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBtYXhsZW5ndGg9XFxcIjJcXFwiIC8+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1lZGl0XFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC0tZWRpdF9faW5uZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8YSBjbGFzcz1cXFwiZWRpdC1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPltlZGl0XTwvYT5cXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50XFxcIj5cXG4gICAgPCEtLSBjb250ZW50IC0tPlxcbiAgPC9kaXY+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS10ZXh0YXJlYVxcXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgPHRleHRhcmVhIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBwbGFjZWhvbGRlcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBsYWNlaG9sZGVyKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHJvd3M9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yb3dzKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPjwvdGV4dGFyZWE+XFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1saW5rXFxcIj5cXG4gIDxsYWJlbD48YSBocmVmPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaHJlZikpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiA+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2E+PC9sYWJlbD5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMzLCBwcm9ncmFtMzMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0zMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvXFxcIj5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTM1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyIGN1c3RvbS1pbnB1dC1yYWRpby1pbm5lci0tZ3JvdXBcXFwiPlxcbiAgXFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzYsIHByb2dyYW0zNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTM2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW8gY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm5hbWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLm5hbWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBpZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIvPlxcbiAgICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IElucHV0IEl0ZW0gVGVtcGxhdGVzXFxuICBcXG4tLT5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jaGVja2JveCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0JveCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNoZWNrYm94R3JvdXApLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTIsIHByb2dyYW0xMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3QpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTUsIHByb2dyYW0xNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVyY2VudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjYsIHByb2dyYW0yNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0YXJlYSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyOCwgcHJvZ3JhbTI4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxpbmspLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzAsIHByb2dyYW0zMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpbyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMiwgcHJvZ3JhbTMyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvR3JvdXApLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzUsIHByb2dyYW0zNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBNYXJrdXAgZm9yIFN0YXJ0L0VuZCBEYXRlIElucHV0IE1vZHVsZVxcbi0tPlxcblxcblxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2xhYmVsXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19pbm5lciBmcm9tXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS15ZWFyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5ZZWFyPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwieWVhclxcXCIgaWQ9XFxcInllYXJTdGFydFxcXCIgbmFtZT1cXFwieWVhclN0YXJ0XFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9zdGFydF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwieWVhclxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNFxcXCI+MjAxNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNVxcXCI+MjAxNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNlxcXCI+MjAxNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxN1xcXCI+MjAxNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxOFxcXCI+MjAxODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxOVxcXCI+MjAxOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyMFxcXCI+MjAyMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyMVxcXCI+MjAyMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyMlxcXCI+MjAyMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyM1xcXCI+MjAyMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyNFxcXCI+MjAyNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyNVxcXCI+MjAyNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyNlxcXCI+MjAyNjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1tb250aFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+TW9udGg8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJtb250aFxcXCIgaWQ9XFxcIm1vbnRoU3RhcnRcXFwiIG5hbWU9XFxcIm1vbnRoU3RhcnRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX3N0YXJ0X2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJtb250aFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1kYXlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPkRheTwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImRheVxcXCIgaWQ9XFxcImRheVN0YXJ0XFxcIiBuYW1lPVxcXCJkYXlTdGFydFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfc3RhcnRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcImRheVxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTNcXFwiPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNFxcXCI+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE1XFxcIj4xNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTZcXFwiPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxN1xcXCI+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE4XFxcIj4xODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTlcXFwiPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMFxcXCI+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIxXFxcIj4yMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjJcXFwiPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyM1xcXCI+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI0XFxcIj4yNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjVcXFwiPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNlxcXCI+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI3XFxcIj4yNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjhcXFwiPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOVxcXCI+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMwXFxcIj4zMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzFcXFwiPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICBcXG5cXG4gIDwvZGl2PlxcbiAgPHNwYW4gY2xhc3M9XFxcImRhdGVzLXRvXFxcIj5cXG4gICAgdG9cXG4gIDwvc3Bhbj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19faW5uZXIgdG9cXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPlllYXI8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJ5ZWFyXFxcIiBpZD1cXFwieWVhckVuZFxcXCIgbmFtZT1cXFwieWVhckVuZFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfZW5kX2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJ5ZWFyXFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE0XFxcIj4yMDE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE1XFxcIj4yMDE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE2XFxcIj4yMDE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE3XFxcIj4yMDE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE4XFxcIj4yMDE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE5XFxcIj4yMDE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIwXFxcIj4yMDIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIxXFxcIj4yMDIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIyXFxcIj4yMDIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIzXFxcIj4yMDIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI0XFxcIj4yMDI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI1XFxcIj4yMDI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI2XFxcIj4yMDI2PC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcbiAgICBcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1tb250aFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+TW9udGg8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJtb250aFxcXCIgaWQ9XFxcIm1vbnRoRW5kXFxcIiBuYW1lPVxcXCJtb250aEVuZFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfZW5kX2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJtb250aFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1kYXlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPkRheTwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImRheVxcXCIgaWQ9XFxcImRheUVuZFxcXCIgbmFtZT1cXFwiZGF5RW5kXFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9lbmRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcImRheVxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTNcXFwiPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNFxcXCI+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE1XFxcIj4xNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTZcXFwiPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxN1xcXCI+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE4XFxcIj4xODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTlcXFwiPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMFxcXCI+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIxXFxcIj4yMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjJcXFwiPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyM1xcXCI+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI0XFxcIj4yNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjVcXFwiPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNlxcXCI+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI3XFxcIj4yNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjhcXFwiPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOVxcXCI+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMwXFxcIj4zMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzFcXFwiPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICBcXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG92ZXItbGltaXQgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcblxcbiAgICAgICAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG5cXG4gICAgICAgICAgICA8bGFiZWwgZm9yPVxcXCJwZXJjZW50XFxcIj48c3Bhbj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcblxcbiAgICAgICAgICAgIDxpbnB1dCBuYW1lPVxcXCJncmFkaW5nLXNlbGVjdGlvblxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIC8+XFxuXFxuICAgICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGNoZWNrZWQgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZ1xcXCI+XFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zdW1tYXJ5XFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3RvdGFsXFxcIj5cXG5cXG4gICAgICA8aDM+VG90YWw8L2gzPlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3BlcmNlbnQgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc092ZXJMaW1pdCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuXFxuICAgICAgPGgzPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50b3RhbEdyYWRlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50b3RhbEdyYWRlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiU8L2gzPlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcbiAgXFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb25cXFwiPlxcblxcbiAgICA8aDUgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvbl9fdGl0bGVcXFwiPkdyYWRpbmcgYmFzZWQgb246PC9oNT5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uLWZvcm1cXFwiPlxcblxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC13cmFwcGVyXFxcIj5cXG5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5vcHRpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgPC9kaXY+XFxuXFxuICAgIDwvZGl2PlxcblxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhbiBhcnRpY2xlfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db3B5ZWRpdCBhbiBhcnRpY2xlfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BZGQgdG8gYW4gYXJ0aWNsZX19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSWxsdXN0cmF0ZSBhbiBhcnRpY2xlfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9MaXN0IGFydGljbGUgY2hvaWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBhcnRpY2xlcyBmcm9tIGEgbGlzdH19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kcmFmdHNfbWFpbnNwYWNlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNhbmRib3gpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kcmFmdHNfbWFpbnNwYWNlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndvcmtfbGl2ZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTgsIHByb2dyYW0xOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIH19XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfCBzYW5kYm94ID0gbm8gfX1cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PdXRsaW5lIGFzIGxlYWQgc2VjdGlvbiB9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EWUsgbm9taW5hdGlvbnN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBvbmUgcGVlciByZXZpZXd9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBDbGFzcyBwcmVzZW50YXRpb25zIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBGaW5pc2hpbmcgVG91Y2hlcyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1JlZmxlY3RpdmUgZXNzYXl9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00MihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XaWtpcGVkaWEgcG9ydGZvbGlvfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3JpZ2luYWwgYXJndW1lbnQgcGFwZXJ9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00NihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBpbnRlcmVzdGVkX2luX0RZSyA9IHllcyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgaW50ZXJlc3RlZF9pbl9EWUsgPSBubyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01MihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSBubyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNTUsIHByb2dyYW01NSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW01NShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiB8IHdhbnRfaGVscF9maW5kaW5nX2FydGljbGVzID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01NyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1OCwgcHJvZ3JhbTU4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTU4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHwgd2FudF9oZWxwX2V2YWx1YXRpbmdfYXJ0aWNsZXMgPSB5ZXMgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIHwgY291cnNlX25hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY291cnNlX25hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBpbnN0cnVjdG9yX3VzZXJuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmluc3RydWN0b3JfdXNlcm5hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRlYWNoZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBzdWJqZWN0ID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN1YmplY3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBzdGFydF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndpemFyZF9zdGFydF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIHwgZW5kX2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX2VuZF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIHwgaW5zdGl0dXRpb24gPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2Nob29sKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIHwgZXhwZWN0ZWRfc3R1ZGVudHMgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfX1cXG5cXG5cIjtcbiAgaWYgKHN0YWNrMiA9IGhlbHBlcnMuZGVzY3JpcHRpb24pIHsgc3RhY2syID0gc3RhY2syLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2syID0gZGVwdGgwLmRlc2NyaXB0aW9uOyBzdGFjazIgPSB0eXBlb2Ygc3RhY2syID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazIuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazIpXG4gICAgKyBcIlxcblxcbj09VGltZWxpbmU9PVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxIHwgV2lraXBlZGlhIGVzc2VudGlhbHMgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW50cm8gdG8gV2lraXBlZGlhfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMiB8IEVkaXRpbmcgYmFzaWNzIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0VkaXRpbmcgYmFzaWNzIGluIGNsYXNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgdGhlIHRyYWluaW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ3JlYXRlIHVzZXJwYWdlIGFuZCBzaWduIHVwfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJhY3RpY2UgY29tbXVuaWNhdGluZ319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBlbnJvbGxlZH19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDMgfCBFeHBsb3JpbmcgdGhlIHRvcGljIGFyZWF9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBsb3JpbmcgdGhlIHRvcGljIGFyZWEgaW4gY2xhc3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNCB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jcml0aXF1ZV9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY29weV9lZGl0X2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA0IHwgVXNpbmcgc291cmNlcyBhbmQgY2hvb3NpbmcgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvVXNpbmcgc291cmNlcyBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA1fX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuYWRkX3RvX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pbGx1c3RyYXRlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDcsIHByb2dyYW03LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnByZXBhcmVfbGlzdCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTEsIHByb2dyYW0xMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYXJ0aWNsZSBzZWxlY3Rpb25zIHwgZHVlID0gV2VlayA1fX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNSB8IEZpbmFsaXppbmcgdG9waWNzIGFuZCBzdGFydGluZyByZXNlYXJjaCB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIHRvcGljc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA2IH19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGlsZSBhIGJpYmxpb2dyYXBoeX19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDYgfCBEcmFmdGluZyBzdGFydGVyIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgZXRpcXVldHRlIGFuZCBzYW5kYm94ZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNyB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnJlc2VhcmNoX3BsYW5uaW5nKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNyZWF0ZV9vdXRsaW5lKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNSwgcHJvZ3JhbTE1LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnJlc2VhcmNoX3BsYW5uaW5nKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndyaXRlX2xlYWQpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIwLCBwcm9ncmFtMjAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TdHVkZW50cyBoYXZlIHN0YXJ0ZWQgZWRpdGluZ319XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDcgfCBNb3ZpbmcgYXJ0aWNsZXMgdG8gdGhlIG1haW4gc3BhY2UgfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFpbiBzcGFjZSBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA4IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01vdmUgdG8gbWFpbiBzcGFjZX19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjIsIHByb2dyYW0yMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwYW5kIHlvdXIgYXJ0aWNsZX19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDggfCBCdWlsZGluZyBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7Y2xhc3Mgd29ya3Nob3B9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9CdWlsZGluZyBhcnRpY2xlcyBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA5IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIGZpcnN0IGRyYWZ0fX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWzBdKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDI2LCBwcm9ncmFtMjYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA5IHwgR2V0dGluZyBhbmQgZ2l2aW5nIGZlZWRiYWNrIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0dyb3VwIHN1Z2dlc3Rpb25zfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDEwIH19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnBlZXJfZmVlZGJhY2spLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVlcl9yZXZpZXdzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMVswXSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzMCwgcHJvZ3JhbTMwLCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMjgsIHByb2dyYW0yOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDEwIHwgUmVzcG9uZGluZyB0byBmZWVkYmFjayB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDExIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzIsIHByb2dyYW0zMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMTEgfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzNiwgcHJvZ3JhbTM2LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMzQsIHByb2dyYW0zNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzgsIHByb2dyYW0zOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDEyIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVmbGVjdGl2ZV9lc3NheSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNDAsIHByb2dyYW00MCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBvcnRmb2xpbykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNDIsIHByb2dyYW00MiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9yaWdpbmFsX3BhcGVyKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0NCwgcHJvZ3JhbTQ0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxMiB8IER1ZSBkYXRlIH19XFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BbGwgc3R1ZGVudHMgZmluaXNoZWR9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBncmFkaW5nIHwgQ29tcGxldGlvbiBvZiBXaWtpcGVkaWEgdHJhaW5pbmcgfCAxIHBvaW50IHwgXFxcIlByYWN0aWNlIG9uLXdpa2kgY29tbXVuaWNhdGlvblxcXCIgZXhlcmNpc2UgfCAxIHBvaW50IHwgXFxcIkNvcHllZGl0IGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlIHwgMSBwb2ludCB8IFxcXCJFdmFsdWF0ZSBhbiBhcnRpY2xlXFxcIiBleGVyY2lzZVxcXCIgfCAxIHBvaW50IHwgXFxcIkFkZCB0byBhbiBhcnRpY2xlXFxcIiBleGVyY2lzZSB8IDEgcG9pbnQgfCBcXFwiSWxsdXN0cmF0ZSBhbiBhcnRpY2xlXFxcIiBleGVyY2lzZSB8IDEgcG9pbnQgfCBRdWFsaXR5IG9mIGJpYmxpb2dyYXBoeSBhbmQgb3V0bGluZSB8IDIgcG9pbnRzIHwgUGVlciByZXZpZXdzIGFuZCBjb2xsYWJvcmF0aW9uIHdpdGggY2xhc3NtYXRlcyB8IDIgcG9pbnRzIHwgUGFydGljaXBhdGlvbiBpbiBjbGFzcyBkaXNjdXNzaW9ucyB8IDIgcG9pbnRzIHwgUXVhbGl0eSBvZiB5b3VyIG1haW4gV2lraXBlZGlhIGNvbnRyaWJ1dGlvbnMgfCAxMCBwb2ludHMgfCBSZWZsZWN0aXZlIGVzc2F5IHwgMiBwb2ludHMgfCBPcmlnaW5hbCBhcmd1bWVudCBwYXBlciB8IDEwIHBvaW50cyB8IEluLWNsYXNzIHByZXNlbnRhdGlvbiBvZiBjb250cmlidXRpb25zIHwgMiBwb2ludHN9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIG9wdGlvbnMgfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5keWspLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZHlrKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDQ4LCBwcm9ncmFtNDgsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg0NiwgcHJvZ3JhbTQ2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmdhKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDUyLCBwcm9ncmFtNTIsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg1MCwgcHJvZ3JhbTUwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wcmVwYXJlX2xpc3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDU0LCBwcm9ncmFtNTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDU3LCBwcm9ncmFtNTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIH19XFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiNURU1QQUxURVxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgJCgnYm9keScpLm9uICdjbGljaycsIChlKSA9PlxuXG4gICAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgY2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgYmx1ckhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuXG4gIGZvY3VzSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIGNoYW5nZUhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuICAgICR0YXJnZXQgPSAoJCBlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZCA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLWlkJylcblxuICAgIHR5cGUgPSAkdGFyZ2V0LmF0dHIoJ2RhdGEtZGF0ZS10eXBlJylcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVt0eXBlXSA9IHZhbHVlXG5cbiAgICBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgZCA9IFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF1bJ2RheSddXG5cbiAgICB5ID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsneWVhciddXG5cbiAgICBkYXRlVmFsdWUgPSBcIiN7eX0tI3ttfS0je2R9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBkYXRlVmFsdWVcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGhhc1ZhbHVlOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuZmluZCgnc2VsZWN0JykudmFsKCkgIT0gJydcblxuXG4gIGNsb3NlSWZOb1ZhbHVlOiAtPlxuXG4gICAgaWYgQGhhc1ZhbHVlKClcblxuICAgICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cblxuXG5cblxuIiwiIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbldpa2lHcmFkaW5nTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraUdyYWRpbmdNb2R1bGUuaGJzJylcblxuXG4jRGF0YVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBHcmFkaW5nSW5wdXRWaWV3IGV4dGVuZHMgVmlld1xuXG4gIHRlbXBsYXRlOiBXaWtpR3JhZGluZ01vZHVsZVxuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaW5wdXRDaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIC5yYWRpby1idXR0b24nIDogJ3JhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIGxhYmVsJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnZ3JhZGU6Y2hhbmdlJyA6ICdncmFkZUNoYW5nZUhhbmRsZXInXG5cbiAgY3VycmVudFZhbHVlczogW11cblxuXG4gIHZhbHVlTGltaXQ6IDEwMFxuXG5cbiAgZ3JhZGluZ1NlbGVjdGlvbkRhdGE6IFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXVxuXG5cbiAgY3VycmVudFRvdGFsOiAtPlxuXG4gICAgdG90YWwgPSAwXG5cbiAgICBfLmVhY2goQGN1cnJlbnRWYWx1ZXMsICh2YWwpID0+XG5cbiAgICAgIHRvdGFsICs9IHBhcnNlSW50KHZhbClcblxuICAgIClcblxuICAgIHJldHVybiB0b3RhbFxuXG5cblxuICBnZXRJbnB1dFZhbHVlczogLT5cblxuICAgIHZhbHVlcyA9IFtdXG5cbiAgICBAcGFyZW50U3RlcFZpZXcuJGVsLmZpbmQoJ2lucHV0W3R5cGU9XCJwZXJjZW50XCJdJykuZWFjaCgtPlxuXG4gICAgICBjdXJWYWwgPSAoJCB0aGlzKS52YWwoKVxuXG4gICAgICBpZiBjdXJWYWxcbiAgICAgICAgXG4gICAgICAgIHZhbHVlcy5wdXNoKGN1clZhbClcblxuICAgICAgZWxzZVxuXG4gICAgICAgICgkIHRoaXMpLnZhbCgwKVxuXG4gICAgICAgIHZhbHVlcy5wdXNoKDApXG5cblxuXG4gICAgKVxuXG4gICAgQGN1cnJlbnRWYWx1ZXMgPSB2YWx1ZXNcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGdyYWRlQ2hhbmdlSGFuZGxlcjogKGlkLCB2YWx1ZSkgLT5cbiAgICBcbiAgICBAZ2V0SW5wdXRWYWx1ZXMoKS5yZW5kZXIoKVxuXG5cbiAgcmFkaW9CdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkcGFyZW50RWwgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICRwYXJlbnRHcm91cCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRpbnB1dEVsID0gJHBhcmVudEVsLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpXG5cblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICAkb3RoZXJSYWRpb3MgPSAkcGFyZW50R3JvdXAuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKS5ub3QoJHBhcmVudEVsWzBdKVxuXG4gICAgICAkb3RoZXJSYWRpb3MuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkcGFyZW50RWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgXy5lYWNoKFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS5vcHRpb25zLCAob3B0KSAtPlxuXG4gICAgICAgIG9wdC5zZWxlY3RlZCA9IGZhbHNlXG4gICAgICAgIFxuICAgICAgKVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10ub3B0aW9uc1skaW5wdXRFbC5hdHRyKCdpZCcpXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLnZhbHVlID0gJGlucHV0RWwuYXR0cignaWQnKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgb3V0ID0ge1xuXG4gICAgICB0b3RhbEdyYWRlOiBAY3VycmVudFRvdGFsKClcblxuICAgICAgaXNPdmVyTGltaXQ6IEBjdXJyZW50VG90YWwoKSA+IEB2YWx1ZUxpbWl0XG5cbiAgICAgIG9wdGlvbnM6IEBncmFkaW5nU2VsZWN0aW9uRGF0YS5vcHRpb25zXG5cbiAgICB9XG5cbiAgICByZXR1cm4gb3V0XG5cblxuXG5cblxuXG5cblxuXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBIb21lVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuSG9tZVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0hvbWVUZW1wbGF0ZS5oYnMnKVxuT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBJTklUXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG5cbiAgZXZlbnRzOiBcblxuICAgICdjbGljayAuZXhpdC1lZGl0JyA6ICdleGl0RWRpdENsaWNrSGFuZGxlcidcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6cHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9DbGlja0hhbmRsZXInXG5cbiAgICAnc3RlcDpnb3RvSWQnIDogJ2dvdG9JZENsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmVkaXQnIDogJ2VkaXRDbGlja0hhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcblxuICAgIHVubGVzcyBAc3RlcHNSZW5kZXJlZFxuICAgIFxuICAgICAgQGFmdGVyUmVuZGVyKClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGFmdGVyUmVuZGVyOiAtPlxuICAgICNTVUJWSUVXU1xuICAgIEBTdGVwTmF2ID0gbmV3IFN0ZXBOYXZWaWV3KClcblxuICAgICMgVEhFIEZPTExXSU5HIENPVUxEIFBST0JBQkxZIEhBUFBFTiBJTiBBIENPTExFVElPTiBWSUVXIENMQVNTIFRPIENPTlRST0wgQUxMIFNURVBTXG4gICAgQCRzdGVwc0NvbnRhaW5lciA9IEAkZWwuZmluZCgnLnN0ZXBzJylcblxuICAgIEAkaW5uZXJDb250YWluZXIgPSBAJGVsLmZpbmQoJy5jb250ZW50JylcblxuICAgICMgU0VUVVAgU1RFUFMgQU5EIFJFVFVSTiBBUlJBWSBPRiBWSUVXU1xuICAgIEBzdGVwVmlld3MgPSBAX2NyZWF0ZVN0ZXBWaWV3cygpXG5cbiAgICBAU3RlcE5hdi5zdGVwVmlld3MgPSBAc3RlcFZpZXdzXG5cbiAgICBAU3RlcE5hdi50b3RhbFN0ZXBzID0gQHN0ZXBWaWV3cy5sZW5ndGhcblxuICAgIEAkaW5uZXJDb250YWluZXIuYXBwZW5kKEBTdGVwTmF2LmVsKVxuXG4gICAgaWYgQHN0ZXBWaWV3cy5sZW5ndGggPiAwXG4gICAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuICAgIHJldHVybiBAXG4gICAgXG5cblxuICBfY3JlYXRlU3RlcFZpZXdzOiAtPlxuICAgIFxuICAgIF92aWV3cyA9IFtdXG5cblxuXG4gICAgXy5lYWNoKGFwcGxpY2F0aW9uLmRhdGEsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcblxuICAgICAgICBuZXdtb2RlbC5zZXQoa2V5LHZhbHVlKVxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG5cbiAgICAgIClcblxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBpbmRleCArIDEpXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwSW5kZXgnLCBpbmRleCApXG5cbiAgICAgIGlmIGluZGV4IGlzIGFwcGxpY2F0aW9uLmRhdGEubGVuZ3RoIC0gMVxuICAgICAgICBuZXd2aWV3LmlzTGFzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBfdmlld3MucHVzaChuZXd2aWV3KVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIF92aWV3c1xuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIHJldHVybiB7XG5cbiAgICAgIGNvbnRlbnQ6IFwiVGhpcyBpcyBzcGVjaWFsIGNvbnRlbnRcIlxuXG4gICAgfVxuICAgIFxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIENVU1RPTSBGVU5DVElPTlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cblxuICBhZHZhbmNlU3RlcDogLT5cbiAgICBAY3VycmVudFN0ZXArPTFcbiAgICBcbiAgICBpZiBAY3VycmVudFN0ZXAgaXMgQHN0ZXBWaWV3cy5sZW5ndGggXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICBkZWNyZW1lbnRTdGVwOiAtPlxuXG4gICAgQGN1cnJlbnRTdGVwLT0xXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPCAwXG5cbiAgICAgIEBjdXJyZW50U3RlcCA9IEBzdGVwVmlld3MubGVuZ3RoIC0gMVxuXG4gICAgQGhpZGVBbGxTdGVwcygpXG5cbiAgICBAc2hvd0N1cnJlbnRTdGVwKClcblxuXG5cbiAgdXBkYXRlU3RlcDogKGluZGV4KSAtPlxuXG4gICAgQGN1cnJlbnRTdGVwID0gaW5kZXhcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICB1cGRhdGVTdGVwQnlJZDogKGlkKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBpZiBzdGVwVmlldy5zdGVwSWQoKSBpcyBpZFxuXG4gICAgICAgIEB1cGRhdGVTdGVwKF8uaW5kZXhPZihAc3RlcFZpZXdzLHN0ZXBWaWV3KSlcbiAgICAgICAgXG4gICAgICAgIHJldHVyblxuICAgICAgXG4gICAgKVxuXG5cblxuICBzaG93Q3VycmVudFN0ZXA6IC0+XG5cbiAgICBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uc2hvdygpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOnVwZGF0ZScsIEBjdXJyZW50U3RlcClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGN1cnJlbnRTdGVwVmlldzogLT5cbiAgICByZXR1cm4gQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdXG5cblxuXG4gIGhpZGVBbGxTdGVwczogLT5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG4gICAgICBzdGVwVmlldy5oaWRlKClcbiAgICApXG5cblxuICBoaWRlQWxsVGlwczogKGUpIC0+XG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG5cbiAgICAgIHN0ZXBWaWV3LnRpcFZpc2libGUgPSBmYWxzZVxuICAgICAgXG4gICAgKVxuXG4gICAgJCgnYm9keScpLmFkZENsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogLT5cbiAgICBAYWR2YW5jZVN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG5cbiAgcHJldkNsaWNrSGFuZGxlcjogLT5cbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZWRpdENsaWNrSGFuZGxlcjogKGlkKSAtPlxuICAgICQoJ2JvZHknKS5hZGRDbGFzcygnZWRpdC1tb2RlJylcbiAgICBfLmVhY2goQHN0ZXBWaWV3cywgKHZpZXcsIGluZGV4KSA9PlxuICAgICAgaWYgdmlldy5tb2RlbC5pZCA9PSBpZFxuICAgICAgICBAdXBkYXRlU3RlcChpbmRleClcbiAgICApXG5cbiAgZXhpdEVkaXRDbGlja0hhbmRsZXI6IC0+XG5cbiAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ2VkaXQtbW9kZScpXG5cbiAgICBAdXBkYXRlU3RlcChAU3RlcE5hdi50b3RhbFN0ZXBzLTEpXG5cblxuICBnb3RvQ2xpY2tIYW5kbGVyOiAoaW5kZXgpIC0+XG5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuICBnb3RvSWRDbGlja0hhbmRsZXI6IChpZCkgLT5cblxuICAgIEB1cGRhdGVTdGVwQnlJZChpZClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL0lucHV0VmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgSW5wdXRWaWV3IFxuXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkxvZ2luVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMnKVxuXG5XaXphcmRDb250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb250ZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IExvZ2luVGVtcGxhdGVcblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIHJldHVybiBXaXphcmRDb250ZW50WzBdIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuV2lraU91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9XaWtpT3V0cHV0VGVtcGxhdGUuaGJzJylcblxuXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBXaWtpT3V0cHV0VGVtcGxhdGVcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnd2l6YXJkOnB1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJyBcblxuXG4gIG91dHB1dFBsYWluVGV4dDogLT5cblxuICAgIEByZW5kZXIoKVxuXG4gICAgcmV0dXJuIEAkZWwudGV4dCgpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQHBvcHVsYXRlT3V0cHV0KCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcG9wdWxhdGVPdXRwdXQ6IC0+XG5cbiAgICByZXR1cm4gQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpIClcblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICByZXR1cm4gXy5leHRlbmQoV2l6YXJkU3RlcElucHV0cyx7IGRlc2NyaXB0aW9uOiAkKCcjc2hvcnRfZGVzY3JpcHRpb24nKS52YWwoKX0pXG5cblxuICBleHBvcnREYXRhOiAoZm9ybURhdGEpIC0+XG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcblxuICAgICAgICB3aWtpdGV4dDogZm9ybURhdGFcblxuICAgICAgICBjb3Vyc2VfdGl0bGU6IFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWVcblxuICAgICAgc3VjY2VzczogKHJlc3BvbnNlKSAtPlxuXG4gICAgICAgICQoJyNwdWJsaXNoJykucmVtb3ZlQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAgIGlmIHJlc3BvbnNlLnN1Y2Nlc3NcblxuICAgICAgICAgIG5ld1BhZ2UgPSBcImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvI3tyZXNwb25zZS50aXRsZX1cIlxuXG4gICAgICAgICAgYWxlcnQoXCJDb25ncmF0cyEgWW91IGhhdmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQvZWRpdGVkIGEgV2lraWVkdSBDb3Vyc2UgYXQgI3tuZXdQYWdlfVwiKVxuXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBuZXdQYWdlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgY29uc29sZS5sb2cgcmVzcG9uc2VcblxuICAgICAgICAgIGFsZXJ0KCd0aGVyZSB3YXMgYW4gZXJyb3IuIHNlZSBjb25zb2xlLicpXG5cblxuICAgIClcbiAgICBcblxuICBwdWJsaXNoSGFuZGxlcjogLT5cblxuICAgIGlmIFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWUubGVuZ3RoID4gMCBcblxuICAgICAgJCgnI3B1Ymxpc2gnKS5hZGRDbGFzcygncHJvY2Vzc2luZycpXG5cbiAgICAgIEBleHBvcnREYXRhKEBwb3B1bGF0ZU91dHB1dCgpKVxuXG4gICAgZWxzZVxuXG4gICAgICBhbGVydCgnWW91IG11c3QgZW50ZXIgYSBjb3Vyc2UgdGl0bGUgYXMgdGhpcyB3aWxsIGJlY29tZSB0aGUgdGl0bGUgb2YgeW91ciBjb3Vyc2UgcGFnZS4nKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnaW50cm8nKVxuXG4gICAgICBzZXRUaW1lb3V0KD0+XG5cbiAgICAgICAgJCgnI2NvdXJzZV9uYW1lJykuZm9jdXMoKVxuXG4gICAgICAsNTAwKVxuXG5cbiAgICBcblxuICAgIFxuXG4gICAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE5hdlZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cblN0ZXBOYXZUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBOYXZWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcC1uYXYnXG5cblxuICB0ZW1wbGF0ZTogU3RlcE5hdlRlbXBsYXRlXG5cblxuICBoYXNCZWVuVG9MYXN0U3RlcDogZmFsc2VcblxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgXG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6dXBkYXRlJyA6ICd1cGRhdGVDdXJyZW50U3RlcCdcblxuICAgICdzdGVwOmFuc3dlcmVkJyA6ICdzdGVwQW5zd2VyZWQnXG5cblxuXG4gIGV2ZW50czogLT5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnByZXYnIDogJ3ByZXZDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmRvdCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuICAgICMgJ2NsaWNrIC5jYW5jZWwnICA6ICdjYW5jZWxDbGlja0hhbmRsZXInXG5cbiAgICAjICdjbGljayAuY29uZmlybScgIDogJ2NvbmZpcm1DbGlja0hhbmRsZXInXG5cblxuXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApIClcblxuICAgIGlmIEBjdXJyZW50U3RlcCA+IDAgJiYgQGN1cnJlbnRTdGVwIDwgQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICAgICMgQCRlbC5yZW1vdmVDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICBlbHNlIGlmIEBjdXJyZW50U3RlcCA+IDAgJiYgQGN1cnJlbnRTdGVwID09IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG4gICAgICAjIEAkZWwuYWRkQ2xhc3MoJ2NvbnRyYWN0ZWQnKVxuXG4gICAgZWxzZVxuXG4gICAgICAjIEAkZWwucmVtb3ZlQ2xhc3MoJ2NvbnRyYWN0ZWQnKVxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdoaWRkZW4nKVxuXG4gICAgQGFmdGVyUmVuZGVyKClcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGN1cnJlbnQ6IEBjdXJyZW50U3RlcFxuXG4gICAgICB0b3RhbDogQHRvdGFsU3RlcHNcblxuICAgICAgcHJldkluYWN0aXZlOiBAaXNJbmFjdGl2ZSgncHJldicpXG5cbiAgICAgIG5leHRJbmFjdGl2ZTogQGlzSW5hY3RpdmUoJ25leHQnKVxuXG4gICAgICBzdGVwczogPT5cblxuICAgICAgICBvdXQgPSBbXVxuXG4gICAgICAgIF8uZWFjaChAc3RlcFZpZXdzLCAoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgICAgICBzdGVwRGF0YSA9IHN0ZXAubW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICAgICAgaXNBY3RpdmUgPSBAY3VycmVudFN0ZXAgaXMgaW5kZXhcblxuICAgICAgICAgIHdhc1Zpc2l0ZWQgPSBzdGVwLmhhc1VzZXJWaXNpdGVkXG5cbiAgICAgICAgICBvdXQucHVzaCB7aWQ6IGluZGV4LCBpc0FjdGl2ZTogaXNBY3RpdmUsIGhhc1Zpc2l0ZWQ6IHdhc1Zpc2l0ZWQsIHN0ZXBUaXRsZTogc3RlcERhdGEudGl0bGUsIHN0ZXBJZDogc3RlcERhdGEuaWR9XG5cbiAgICAgICAgKVxuXG4gICAgICAgIHJldHVybiBvdXRcblxuICAgIH1cblxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG4gICAgcmV0dXJuIEBcblxuXG5cbiAgcHJldkNsaWNrSGFuZGxlcjogLT5cblxuICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJ2dyYWRpbmcnKVxuXG4gICAgZWxzZVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOnByZXYnKVxuXG5cblxuICBuZXh0Q2xpY2tIYW5kbGVyOiAtPlxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG5cbiAgZG90Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIGlmIEBoYXNCZWVuVG9MYXN0U3RlcFxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAkdGFyZ2V0LmRhdGEoJ3N0ZXAtaWQnKSlcblxuICAgIGVsc2VcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgJHRhcmdldC5kYXRhKCduYXYtaWQnKSlcblxuXG4gICMgY29uZmlybUNsaWNrSGFuZGxlcjogKGUpIC0+XG4gICMgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAjICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICMgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAdG90YWxTdGVwcyAtIDEpXG5cblxuICAjIGNhbmNlbENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICMgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAjICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICMgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCBAdG90YWxTdGVwcyAtIDEpXG5cblxuICB1cGRhdGVDdXJyZW50U3RlcDogKHN0ZXApIC0+XG5cbiAgICBAY3VycmVudFN0ZXAgPSBzdGVwXG5cbiAgICBpZiBAaXNMYXN0U3RlcCgpXG4gICAgICBcbiAgICAgIEBoYXNCZWVuVG9MYXN0U3RlcCA9IHRydWVcblxuICAgIEByZW5kZXIoKVxuXG5cblxuICBzdGVwQW5zd2VyZWQ6IChzdGVwVmlldykgLT5cblxuICAgIEByZW5kZXIoKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGlzTGFzdFN0ZXA6IC0+XG5cbiAgICByZXR1cm4gQGN1cnJlbnRTdGVwIGlzIEB0b3RhbFN0ZXBzIC0gMVxuXG4gIGlzSW5hY3RpdmU6IChpdGVtKSAtPlxuXG4gICAgaXRJcyA9IHRydWVcblxuICAgIGlmIGl0ZW0gPT0gJ3ByZXYnXG5cbiAgICAgIGl0SXMgPSBAY3VycmVudFN0ZXAgaXMgMVxuXG4gICAgZWxzZSBpZiBpdGVtID09ICduZXh0J1xuXG4gICAgICBpZiBhcHBsaWNhdGlvbi5ob21lVmlldy5zdGVwVmlld3NbQGN1cnJlbnRTdGVwXS5oYXNVc2VyQW5zd2VyZWRcblxuICAgICAgICBpdElzID0gZmFsc2VcblxuICAgICAgZWxzZSBpZiBAaXNMYXN0U3RlcCgpXG4gICAgICAgIFxuICAgICAgICBpdElzID0gdHJ1ZVxuXG4gICAgICBlbHNlXG4gICAgICAgIGl0SXMgPSB0cnVlXG5cbiAgICByZXR1cm4gaXRJc1xuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuI1ZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNTVUJWSUVXU1xuSW5wdXRJdGVtVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG5EYXRlSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvRGF0ZUlucHV0VmlldycpXG5cbkdyYWRpbmdJbnB1dFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9HcmFkaW5nSW5wdXRWaWV3JylcblxuI1RFTVBMQVRFU1xuU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5JbnRyb1N0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9JbnRyb1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5JbnB1dFRpcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2luZm8vSW5wdXRUaXBUZW1wbGF0ZS5oYnMnKVxuXG5Db3Vyc2VUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0NvdXJzZVRpcFRlbXBsYXRlLmhicycpXG5cbldpa2lEYXRlc01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lEYXRlc01vZHVsZS5oYnMnKVxuXG5cbiNEQVRBXG5Db3Vyc2VJbmZvRGF0YSA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkQ291cnNlSW5mbycpXG5cbiNPVVRQVVRcbkFzc2lnbm1lbnREYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRBc3NpZ25tZW50RGF0YScpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwVmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAnXG5cblxuICB0YWdOYW1lOiAnc2VjdGlvbidcblxuXG4gIHRlbXBsYXRlOiBTdGVwVGVtcGxhdGVcblxuXG4gIGludHJvVGVtcGxhdGU6IEludHJvU3RlcFRlbXBsYXRlXG5cblxuICB0aXBUZW1wbGF0ZTogSW5wdXRUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb1RlbXBsYXRlOiBDb3Vyc2VUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb0RhdGE6IENvdXJzZUluZm9EYXRhXG5cblxuICBkYXRlc01vZHVsZTogV2lraURhdGVzTW9kdWxlXG5cblxuICBoYXNVc2VyQW5zd2VyZWQ6IGZhbHNlXG5cblxuICBoYXNVc2VyVmlzaXRlZDogZmFsc2VcblxuXG4gIGlzTGFzdFN0ZXA6IGZhbHNlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBFVkVOVFMgQU5EIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czpcbiAgICAjICdjbGljayAuc3RlcC1mb3JtLWlubmVyIGlucHV0JyA6ICdpbnB1dEhhbmRsZXInXG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvLXRpcCcgOiAnaGlkZVRpcHMnXG5cblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgc3RlcElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc3RlcC1pZCcpXG5cbiAgICBpZiBzdGVwSWRcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0Jywgc3RlcElkKVxuXG4gIHN0ZXBJZDogLT5cblxuICAgIHJldHVybiBAbW9kZWwuYXR0cmlidXRlcy5pZFxuXG5cblxuICBhY2NvcmRpYW5DbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHRhcmdldC50b2dnbGVDbGFzcygnb3BlbicpXG5cbiAgICAjIGlmICR0YXJnZXQuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgICR0YXJnZXQucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyBlbHNlIGlmICQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgIEAkZWwuZmluZCgnLnN0ZXAtaW5mbycpLmZpbmQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgIHNldFRpbWVvdXQoPT5cblxuICAgICMgICAgICR0YXJnZXQuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgIyAgICw1MDApXG5cbiAgICAjIGVsc2VcblxuICAgICMgICAkdGFyZ2V0LmFkZENsYXNzKCdvcGVuJylcblxuXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd3aXphcmQ6cHVibGlzaCcpXG5cblxuICBcbiAgcmVuZGVyOiAtPlxuXG4gICAgQHRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgaWYgQG1vZGVsLmdldCgnc3RlcE51bWJlcicpID09IDFcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tZmlyc3QnKS5odG1sKCBAaW50cm9UZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICNBREQgU1RBUlQvRU5EIERBVEVTIE1PRFVMRVxuICAgICAgJGRhdGVzID0gJChAZGF0ZXNNb2R1bGUoe3RpdGxlOiAnQ291cnNlIGRhdGVzJ30pKVxuXG4gICAgICAkZGF0ZUlucHV0cyA9ICRkYXRlcy5maW5kKCcuY3VzdG9tLXNlbGVjdCcpXG5cbiAgICAgIHNlbGYgPSBAXG5cbiAgICAgICRkYXRlSW5wdXRzLmVhY2goLT5cblxuICAgICAgICBkYXRlVmlldyA9IG5ldyBEYXRlSW5wdXRWaWV3KFxuXG4gICAgICAgICAgZWw6ICQodGhpcykgXG5cbiAgICAgICAgKVxuXG4gICAgICAgIGRhdGVWaWV3LnBhcmVudFN0ZXBWaWV3ID0gc2VsZlxuICAgIFxuICAgICAgKVxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tZGF0ZXMnKS5odG1sKCRkYXRlcylcblxuICAgIGVsc2UgaWYgQGlzTGFzdFN0ZXBcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tbGFzdCcpLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICRkYXRlcyA9ICQoQGRhdGVzTW9kdWxlKHt0aXRsZTogJ0Fzc2lnbm1lbnQgdGltZWxpbmUnfSkpXG5cbiAgICAgICRkYXRlSW5wdXRzID0gJGRhdGVzLmZpbmQoJy5jdXN0b20tc2VsZWN0JylcblxuICAgICAgc2VsZiA9IEBcblxuICAgICAgJGRhdGVJbnB1dHMuZWFjaCgtPlxuXG4gICAgICAgIGRhdGVWaWV3ID0gbmV3IERhdGVJbnB1dFZpZXcoXG5cbiAgICAgICAgICBlbDogJCh0aGlzKSBcblxuICAgICAgICApXG5cbiAgICAgICAgZGF0ZVZpZXcucGFyZW50U3RlcFZpZXcgPSBzZWxmXG4gICAgICBcbiAgICAgIClcblxuICAgICAgQCRlbC5maW5kKCcuc3RlcC1mb3JtLWRhdGVzJykuaHRtbCgkZGF0ZXMpXG4gICAgICBcbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuXG4gICAgQGlucHV0U2VjdGlvbiA9IEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1pbm5lcicpXG5cbiAgICBAJHRpcFNlY3Rpb24gPSBAJGVsLmZpbmQoJy5zdGVwLWluZm8tdGlwcycpXG5cbiAgICBAaW5wdXREYXRhID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuYXR0cmlidXRlcy5pZF0gfHwgW11cblxuICAgIF8uZWFjaChAaW5wdXREYXRhLCAoaW5wdXQsIGluZGV4KSA9PlxuXG4gICAgICB1bmxlc3MgaW5wdXQudHlwZSBcblxuICAgICAgICByZXR1cm5cblxuICAgICAgaWYgaW5wdXQuc2VsZWN0ZWRcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBpbnB1dFZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldyhcblxuICAgICAgICBtb2RlbDogbmV3IEJhY2tib25lLk1vZGVsKGlucHV0KVxuXG4gICAgICApXG5cbiAgICAgIGlucHV0Vmlldy5pbnB1dFR5cGUgPSBpbnB1dC50eXBlXG5cbiAgICAgIGlucHV0Vmlldy5pdGVtSW5kZXggPSBpbmRleFxuXG4gICAgICBpbnB1dFZpZXcucGFyZW50U3RlcCA9IEBcblxuICAgICAgQGlucHV0U2VjdGlvbi5hcHBlbmQoaW5wdXRWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBpbnB1dC50aXBJbmZvXG5cbiAgICAgICAgdGlwID0gXG5cbiAgICAgICAgICBpZDogaW5kZXhcblxuICAgICAgICAgIHRpdGxlOiBpbnB1dC50aXBJbmZvLnRpdGxlXG5cbiAgICAgICAgICBjb250ZW50OiBpbnB1dC50aXBJbmZvLmNvbnRlbnRcblxuICAgICAgICAkdGlwRWwgPSBAdGlwVGVtcGxhdGUodGlwKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgICAgZWxzZSBpZiBpbnB1dC5oYXNDb3Vyc2VJbmZvXG5cbiAgICAgICAgaW5mb0RhdGEgPSBfLmV4dGVuZChAY291cnNlSW5mb0RhdGFbaW5wdXQuaWRdLCB7aWQ6IGluZGV4fSApXG5cbiAgICAgICAgJHRpcEVsID0gQGNvdXJzZUluZm9UZW1wbGF0ZShpbmZvRGF0YSlcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICApXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGlucHV0Q29udGFpbmVycyA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZydcblxuICAgICAgQGdyYWRpbmdWaWV3ID0gbmV3IEdyYWRpbmdJbnB1dFZpZXcoKVxuXG4gICAgICBAZ3JhZGluZ1ZpZXcucGFyZW50U3RlcFZpZXcgPSBAXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1jb250ZW50JykuYXBwZW5kKEBncmFkaW5nVmlldy5nZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpLmVsKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGU6IC0+XG5cbiAgICBAJGVsLmhpZGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHNob3c6IC0+XG5cbiAgICBAJGVsLnNob3coKVxuXG4gICAgQGhhc1VzZXJWaXNpdGVkID0gdHJ1ZVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGJlZ2luSGFuZGxlcjogLT5cblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6bmV4dCcpXG5cblxuICB1cGRhdGVVc2VyQW5zd2VyOiAoaWQsdmFsdWUpIC0+XG5cbiAgICBpZiB2YWx1ZSBpcyAnb24nXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6YW5zd2VyZWQnLCBAKVxuXG4gICAgcmV0dXJuIEBcblxuICB1cGRhdGVSYWRpb0Fuc3dlcjogKGlkLCBpbmRleCwgdmFsdWUpIC0+XG5cbiAgICBpbnB1dFR5cGUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnR5cGUgXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLnNlbGVjdGVkID0gdmFsdWVcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLm9wdGlvbnNbaW5kZXhdLnZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gaW5kZXhcblxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgb3V0ID0gXG5cbiAgICAgIHR5cGU6IGlucHV0VHlwZVxuXG4gICAgICBpZDogaWRcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cblxuICAgIGlmIGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnIHx8IGlucHV0VHlwZSA9PSAnY2hlY2tib3gnXG5cbiAgICAgIGlmIHZhbHVlID09ICdvbidcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IGZhbHNlXG5cblxuICAgIGVsc2UgaWYgaW5wdXRUeXBlID09ICd0ZXh0JyB8fCBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSB2YWx1ZVxuXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG5cbiAgIyBpbnB1dEhhbmRsZXI6IChlKSAtPlxuXG4gICMgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgIyAgICRwYXJlbnQgPSAkdGFyZ2V0LnBhcmVudHMoJy5jdXN0b20taW5wdXQnKVxuICAgIFxuICAjICAgaWYgJHBhcmVudC5kYXRhKCdleGNsdXNpdmUnKVxuXG4gICMgICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJykgXG5cbiAgIyAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkuYWRkQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAjICAgICBlbHNlXG5cbiAgIyAgICAgICBAJGlucHV0Q29udGFpbmVycy5maW5kKCdpbnB1dCcpLm5vdCgkdGFyZ2V0KS5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgIyAgICAgICBAJGlucHV0Q29udGFpbmVycy5ub3QoJHBhcmVudCkucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcblxuICAjICAgZWxzZVxuXG4gICMgICAgICRleGNsdXNpdmUgPSBAJGVsLmZpbmQoJ1tkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKVxuXG4gICMgICAgIGlmICRleGNsdXNpdmUubGVuZ3RoID4gMFxuXG4gICMgICAgICAgaWYgJHRhcmdldC5pcygnOmNoZWNrZWQnKVxuXG4gICMgICAgICAgICAkZXhjbHVzaXZlLmFkZENsYXNzKCdkaXNhYmxlZCcpXG5cbiAgIyAgICAgICBlbHNlXG5cbiAgIyAgICAgICAgICRleGNsdXNpdmUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJylcblxuXG5cbiAgaGlkZVRpcHM6IChlKSAtPlxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG5cblxuXG4gICAgXG4gICAgXG5cbiBcblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4vVmlldycpXG5cblxuI1RFTVBMQVRFU1xuSW5wdXRJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0SXRlbVRlbXBsYXRlLmhicycpXG5cblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi8uLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBJbnB1dEl0ZW1UZW1wbGF0ZVxuXG5cbiAgY2xhc3NOYW1lOiAnY3VzdG9tLWlucHV0LXdyYXBwZXInXG5cblxuICBob3ZlclRpbWU6IDUwMFxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG5cbiAgICAnY2hhbmdlIGlucHV0JyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdrZXl1cCBpbnB1dFt0eXBlPVwidGV4dFwiXScgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInBlcmNlbnRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VlbnRlciAuY2hlY2stYnV0dG9uJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdXQnIDogJ21vdXNlb3V0SGFuZGxlcidcblxuICAgICdjbGljayAuZWRpdGFibGUgLmNoZWNrLWJ1dHRvbicgOiAnY2hlY2tCdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9Cb3hDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnZm9jdXMgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25Gb2N1cydcblxuICAgICdibHVyIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uQmx1cidcblxuXG5cbiAgcmFkaW9CdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkYnV0dG9uID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkcGFyZW50RWwgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICRwYXJlbnRHcm91cCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRpbnB1dEVsID0gJHBhcmVudEVsLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpXG5cblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuXG4gICAgICAkb3RoZXJSYWRpb3MgPSAkcGFyZW50R3JvdXAuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKS5ub3QoJHBhcmVudEVsWzBdKVxuXG4gICAgICAkb3RoZXJSYWRpb3MuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJykucHJvcCgnY2hlY2tlZCcsIGZhbHNlKS50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkcGFyZW50RWwuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuXG5cbiAgcmFkaW9Cb3hDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJG90aGVyUmFkaW9zID0gQCRlbC5wYXJlbnRzKCcuc3RlcC1mb3JtLWlubmVyJykuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJykuZmluZCgnaW5wdXQnKS52YWwoJ29mZicpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG5cbiAgICAgIC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICBpZiAkcGFyZW50Lmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvbicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIGZhbHNlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvZmYnKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuXG5cblxuICBjaGVja0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JykubGVuZ3RoID4gMFxuXG4gICAgICByZXR1cm4gQHJhZGlvQm94Q2xpY2tIYW5kbGVyKGUpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1jaGVja2JveCcpXG5cbiAgICAgIC50b2dnbGVDbGFzcygnY2hlY2tlZCcpXG4gICAgXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cblxuICBob3ZlckhhbmRsZXI6IChlKSAtPlxuXG4gICAgY29uc29sZS5sb2cgZS50YXJnZXRcblxuXG4gIG1vdXNlb3ZlckhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGlzSG92ZXJpbmcgPSB0cnVlXG4gICAgICBcblxuICBtb3VzZW91dEhhbmRsZXI6IChlKSAtPlxuXG4gICAgQGlzSG92ZXJpbmcgPSBmYWxzZVxuXG5cbiAgc2hvd1Rvb2x0aXA6IC0+XG5cbiAgICBpZiBAaGFzSW5mbyAmJiBAcGFyZW50U3RlcC50aXBWaXNpYmxlID09IGZhbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IHRydWVcblxuICAgICAgJCgnYm9keScpLmFkZENsYXNzKCd0aXAtb3BlbicpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwW2RhdGEtaXRlbS1pbmRleD0nI3tAaXRlbUluZGV4fSddXCIpLmFkZENsYXNzKCd2aXNpYmxlJylcblxuXG4gIGhpZGVUb29sdGlwOiAtPlxuXG4gICAgaWYgQGhhc0luZm9cblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKSBcblxuXG4gIGhpZGVTaG93VG9vbHRpcDogLT5cblxuICAgIGlmIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpLmhhc0NsYXNzKCdub3QtZWRpdGFibGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICBAc2hvd1Rvb2x0aXAoKVxuXG5cbiAgbGFiZWxDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIHJldHVybiBmYWxzZVxuXG5cbiAgaXRlbUNoYW5nZUhhbmRsZXI6IChlKSAtPlxuICAgIFxuICAgICMgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnYW5zd2VyOnVwZGF0ZWQnLCBpbnB1dElkLCB2YWx1ZSlcblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICAgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCd2YWx1ZScpXG5cbiAgICAgIHBhcmVudElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ25hbWUnKVxuXG4gICAgICBpZiAkKGUuY3VycmVudFRhcmdldCkucHJvcCgnY2hlY2tlZCcpXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCB0cnVlKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCBmYWxzZSlcblxuICAgIGVsc2VcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgICAgaW5wdXRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSlcblxuICAgICAgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgICBpZiBpc05hTihwYXJzZUludCh2YWx1ZSkpXG5cbiAgICAgICAgICAkKGUuY3VycmVudFRhcmdldCkudmFsKCcnKVxuXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZ3JhZGU6Y2hhbmdlJywgaW5wdXRJZCwgdmFsdWUpXG4gICAgXG4gICAgcmV0dXJuIEBwYXJlbnRTdGVwLnVwZGF0ZVVzZXJBbnN3ZXIoaW5wdXRJZCwgdmFsdWUpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKEBpbnB1dFR5cGUpXG5cbiAgICBAJGlucHV0RWwgPSBAJGVsLmZpbmQoJ2lucHV0JylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLnZhbHVlICE9ICcnICYmIEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ3RleHQnXG4gICAgICBcbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgQGhvdmVyVGltZXIgPSBudWxsXG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuXG4gIGhhc0luZm86IC0+XG5cbiAgICByZXR1cm4gJGVsLmhhc0NsYXNzKCdoYXMtaW5mbycpXG5cblxuICBvbkZvY3VzOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgb25CbHVyOiAoZSkgLT5cblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIHZhbHVlID0gJHRhcmdldC52YWwoKVxuXG4gICAgaWYgdmFsdWUgPT0gJydcblxuICAgICAgdW5sZXNzICR0YXJnZXQuaXMoJzpmb2N1cycpXG5cbiAgICAgICAgQCRlbC5yZW1vdmVDbGFzcygnb3BlbicpXG5cblxuICBpc0Rpc2FibGVkOiAtPlxuXG4gICAgcmV0dXJuIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpLmhhc0NsYXNzKCdub3QtZWRpdGFibGUnKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQdWJsaWMgTWV0aG9kc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICByZW5kZXI6IC0+XG5cbiAgICBzdXBlcigpXG5cblxuICBnZXRJbnB1dFR5cGVPYmplY3Q6IC0+XG5cbiAgICByZXR1cm5EYXRhID0ge31cblxuICAgIHJldHVybkRhdGFbQGlucHV0VHlwZV0gPSB0cnVlXG5cbiAgICByZXR1cm4gcmV0dXJuRGF0YVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgaW5wdXRUeXBlT2JqZWN0ID0gQGdldElucHV0VHlwZU9iamVjdCgpXG5cblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW8nXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICd0ZXh0J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdlZGl0J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnbGluaydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cblxuICBcbiAgICAgIFxuICAgIFxuICAgICAgXG5cbiAgICBcbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEJhc2UgVmlldyBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbnJlcXVpcmUoJy4uLy4uL2hlbHBlcnMvVmlld0hlbHBlcicpXG5cbmNsYXNzIFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHRlbXBsYXRlOiAtPlxuICAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcbiAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuICAgIFxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBhZnRlclJlbmRlcjogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBFVkVOVCBIQU5ETEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXciXX0=
