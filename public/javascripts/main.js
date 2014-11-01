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



},{"./data/WizardContent":7,"./routers/Router":14,"./views/HomeView":31,"./views/InputItemView":32,"./views/LoginView":33,"./views/OutputView":34}],6:[function(require,module,exports){
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
    formTitle: 'Choose one:',
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
      }, {
        content: ['<p>For most courses, the <em>Critique an article</em> and <em>Add to an article</em> exercises provide a nice foundation for the main writing project. These have been selected by default.</p>']
      }
    ]
  }, {
    id: 'choosing_articles',
    title: 'Choosing articles',
    formTitle: 'There are two recommended options for selecting articles:',
    infoTitle: 'About choosing articles',
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.</p>', '<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>']
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
    instructions: "Students often wait until the last minute to do their research, or choose sources unsuitable for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians.",
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
    formTitle: 'Choose supplementary assignments (optional):',
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
        content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
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
      value: 0,
      renderInOutput: true,
      contingentUpon: []
    },
    outline_quality: {
      type: 'percent',
      id: 'outline_quality',
      label: 'Quality of bibliography and outline',
      value: 2,
      renderInOutput: true,
      contingentUpon: []
    },
    peer_reviews: {
      type: 'percent',
      label: 'Peer reviews and collaboration with classmates',
      value: 2,
      renderInOutput: true,
      contingentUpon: []
    },
    contribution_quality: {
      type: 'percent',
      id: 'contribution_quality',
      label: 'Quality of your main Wikipedia contributions',
      value: 10,
      renderInOutput: true,
      contingentUpon: []
    },
    supplementary_assignments: {
      type: 'percent',
      id: 'supplementary_assignments',
      label: 'Supplementary assignments',
      value: 5,
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



},{}],10:[function(require,module,exports){
Handlebars.registerHelper('link', function(text, url) {
  var result;
  text = Handlebars.Utils.escapeExpression(text);
  url = Handlebars.Utils.escapeExpression(url);
  result = '<a href="' + url + '">' + text + '</a>';
  return new Handlebars.SafeString(result);
});

Handlebars.registerPartial('courseDetails', 'sup2');



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
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Home Page Template\n-->\n\n<!-- MAIN APP CONTENT -->\n<div class=\"content\">\n\n\n  <!-- STEPS MAIN CONTAINER -->\n  <div class=\"steps\"></div><!-- end .steps -->\n\n\n</div><!-- end .content -->\n\n";
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
  buffer += " <!-- end .step-form-instructions -->\n\n\n\n\n        <!-- BEGIN BUTTON -->\n        <div class=\"step-form-actions\">\n          <a class=\"button button--blue\" id=\"loginButton\" href=\"/auth/mediawiki\">\n            Login with Wikipedia\n          </a>\n"
    + "\n        </div><!-- end .step-form-actions -->\n\n\n      </div><!-- end .step-form -->\n    </div>\n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],17:[function(require,module,exports){
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
  buffer += "\n  </div>\n   <!-- end .step-form-instructions -->\n\n\n\n  <!-- INTRO STEP FORM AREA -->\n  <div class=\"step-form-inner\">\n    <!-- form fields -->\n  </div><!-- end .step-form-inner -->\n\n\n  <!-- DATES MODULE -->\n  <div class=\"step-form-dates\">\n\n  </div><!-- end .step-form-dates -->\n\n  <!-- BEGIN BUTTON -->\n  <div class=\"step-form-actions\">\n\n    <div class=\"no-edit-mode\">\n      <a class=\"button button--blue inactive\" id=\"beginButton\" href=\"\">\n        Begin Assignment Wizard\n      </a>\n    </div>\n\n    <div class=\"edit-mode-only\">\n      <a class=\"button button--blue exit-edit\" href=\"#\">\n        Back\n      </a>\n    </div>\n  </div><!-- end .step-form-actions -->\n\n\n</div><!-- end .step-form -->\n\n\n";
  return buffer;
  })
},{"handleify":4}],19:[function(require,module,exports){
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
    + "</label>\n    <div class=\"input-container\">\n    <div class=\"icon\">points</div>\n    <input name=\""
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
},{"handleify":4}],23:[function(require,module,exports){
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
  buffer += "\">\n\n      <h3 class=\"custom-input-grading__total-number\">";
  if (stack1 = helpers.totalGrade) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.totalGrade; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</h3>\n\n    </div>\n\n  </div>\n  \n  <div class=\"custom-input-grading-selection\">\n\n    <h5 class=\"custom-input-grading-selection__title\">Grading based on:</h5>\n\n    <div class=\"custom-input-grading-selection-form\">\n\n      <div class=\"custom-input-wrapper\">\n\n        ";
  stack1 = helpers.each.call(depth0, depth0.options, {hash:{},inverse:self.noop,fn:self.program(3, program3, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n\n      </div>\n\n    </div>\n\n  </div>\n\n</div>";
  return buffer;
  })
},{"handleify":4}],25:[function(require,module,exports){
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
    + "\n\n==Timeline==\n\n";
  return buffer;
  })
},{"handleify":4}],26:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, stack2, self=this;

function program1(depth0,data) {
  
  
  return " interested_in_DYK = yes ";
  }

function program3(depth0,data) {
  
  
  return " interested_in_DYK = no ";
  }

function program5(depth0,data) {
  
  
  return " interested_in_Good_Articles = yes ";
  }

function program7(depth0,data) {
  
  
  return " interested_in_Good_Articles = no ";
  }

function program9(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  return buffer;
  }
function program10(depth0,data) {
  
  
  return " | want_help_finding_articles = yes ";
  }

function program12(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  return buffer;
  }
function program13(depth0,data) {
  
  
  return " \n | want_help_evaluating_articles = yes ";
  }

  buffer += "\n"
    + "{{course options \n | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " \n | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.ga),stack1 == null || stack1 === false ? stack1 : stack1.ga)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.prepare_list)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(9, program9, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(12, program12, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " \n}}\n\n";
  return buffer;
  })
},{"handleify":4}],27:[function(require,module,exports){
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

  buffer += "\n"
    + "{{assignment grading \n";
  stack1 = helpers.each.call(depth0, depth0.grading, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "<br/>}}\n";
  return buffer;
  })
},{"handleify":4}],28:[function(require,module,exports){
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
  
  
  return " Finishing Touches ";
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

  buffer += "{{course week | 1 | Wikipedia essentials }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{in class}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n\n"
    + "{{course week | 2 | Editing basics }}\n"
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
    + "{{course week | 3 | Exploring the topic area}}\n"
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
    + "{{course week | 4 | Using sources and choosing articles }}\n"
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
    + "{{course week | 5 | Finalizing topics and starting research }}\n"
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
    + "{{course week | 6 | Drafting starter articles }}\n"
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
    + "{{course week | 7 | Moving articles to the main space }}\n"
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
    + "{{course week | 8 | Building articles }}\n"
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
    + "{{course week | 9 | Getting and giving feedback }}\n"
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
    + "{{course week | 10 | Responding to feedback }}\n"
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
    + "{{course week | 11 | ";
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
    + "{{course week | 12 | Due date }}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{assignment milestones}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}\n"
    + "{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}";
  return buffer;
  })
},{"handleify":4}],29:[function(require,module,exports){
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



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/modules/WikiDatesModule.hbs":23}],30:[function(require,module,exports){
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



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/modules/WikiGradingModule.hbs":24,"../views/supers/View":38}],31:[function(require,module,exports){
var HomeTemplate, HomeView, OutputTemplate, StepModel, StepNavView, StepView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

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
        } else if (index === 0) {
          newview.isFirstStep = true;
        }
        _this.$stepsContainer.append(newview.render().hide().el);
        newview.$el.addClass("step--" + step.id);
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



},{"../App":5,"../data/WizardStepInputs":9,"../models/StepModel":12,"../templates/HomeTemplate.hbs":15,"../templates/steps/output/WikiOutputTemplate.hbs":28,"../views/StepNavView":35,"../views/StepView":36,"../views/supers/View":38}],32:[function(require,module,exports){
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



},{"../views/supers/InputView":37}],33:[function(require,module,exports){
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



},{"../App":5,"../data/WizardContent":7,"../templates/LoginTemplate.hbs":16,"../views/supers/View":38}],34:[function(require,module,exports){
var CourseDetailsTempalte, CourseOptionsTemplate, GradingTemplate, InputItemView, View, WikiOutputTemplate, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs');

CourseDetailsTempalte = require('../templates/steps/output/CourseDetailsTemplate.hbs');

GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs');

CourseOptionsTemplate = require('../templates/steps/output/CourseOptionsTemplate.hbs');

WizardStepInputs = require('../data/WizardStepInputs');

module.exports = InputItemView = (function(_super) {
  __extends(InputItemView, _super);

  function InputItemView() {
    return InputItemView.__super__.constructor.apply(this, arguments);
  }

  InputItemView.prototype.template = WikiOutputTemplate;

  InputItemView.prototype.detailsTemplate = CourseDetailsTempalte;

  InputItemView.prototype.gradingTemplate = GradingTemplate;

  InputItemView.prototype.optionsTemplate = CourseOptionsTemplate;

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
    var assignmentOutput, courseOut, detailsOutput, gradingOutput, optionsOutput, rawAssignmentOutput;
    detailsOutput = this.$el.html(this.detailsTemplate(this.getRenderData())).text();
    rawAssignmentOutput = this.$el.html(this.template(this.getRenderData())).text();
    assignmentOutput = rawAssignmentOutput.replace(/(\r\n|\n|\r)/gm, "");
    gradingOutput = this.$el.html(this.gradingTemplate(this.getRenderData())).text();
    optionsOutput = this.$el.html(this.optionsTemplate(this.getRenderData())).text();
    courseOut = detailsOutput + assignmentOutput + gradingOutput + optionsOutput;
    return courseOut;
  };

  InputItemView.prototype.getRenderData = function() {
    return _.extend(WizardStepInputs, {
      description: $('#short_description').val(),
      lineBreak: '<br/>'
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



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/output/CourseDetailsTemplate.hbs":25,"../templates/steps/output/CourseOptionsTemplate.hbs":26,"../templates/steps/output/GradingTemplate.hbs":27,"../templates/steps/output/WikiOutputTemplate.hbs":28,"../views/supers/View":38}],35:[function(require,module,exports){
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



},{"../App":5,"../templates/StepNavTemplate.hbs":17,"../views/supers/View":38}],36:[function(require,module,exports){
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



},{"../App":5,"../data/WizardAssignmentData":6,"../data/WizardCourseInfo":8,"../data/WizardStepInputs":9,"../templates/steps/IntroStepTemplate.hbs":18,"../templates/steps/StepTemplate.hbs":19,"../templates/steps/info/CourseTipTemplate.hbs":20,"../templates/steps/info/InputTipTemplate.hbs":21,"../templates/steps/modules/WikiDatesModule.hbs":23,"../views/DateInputView":29,"../views/GradingInputView":30,"../views/InputItemView":32,"../views/supers/View":38}],37:[function(require,module,exports){
var AssignmentData, InputItemTemplate, InputItemView, View, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../../App');

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



},{"../../App":5,"../../data/WizardAssignmentData":6,"../../data/WizardStepInputs":9,"../../templates/steps/inputs/InputItemTemplate.hbs":22,"./View":38}],38:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ291cnNlSW5mby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21haW4uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3JvdXRlcnMvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlRGV0YWlsc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvR3JhZGluZ1RlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0RhdGVJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvR3JhZGluZ0lucHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Ib21lVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9JbnB1dEl0ZW1WaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0xvZ2luVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9PdXRwdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBOYXZWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9JbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3Mvc3VwZXJzL1ZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxR0E7QUFDQTtBQUNBO0FBQ0E7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Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDalJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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TyxJQUFQLENBTE07RUFBQSxDQTNCUixDQUFBOztBQUFBLGlCQXFDQSxXQUFBLEdBQWEsU0FBQSxHQUFBLENBckNiLENBQUE7O0FBdUNBO0FBQUE7OztLQXZDQTs7QUEyQ0E7QUFBQTs7O0tBM0NBOztBQStDQTtBQUFBOzs7S0EvQ0E7O2NBQUE7O0dBRmlCLFFBQVEsQ0FBQyxLQUY1QixDQUFBOztBQUFBLE1BdURNLENBQUMsT0FBUCxHQUFpQixJQXZEakIsQ0FBQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBlcW51bGw6IHRydWUgKi9cblxubW9kdWxlLmV4cG9ydHMuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG5cbnZhciBIYW5kbGViYXJzID0ge307XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVkVSU0lPTiA9IFwiMS4wLjBcIjtcbkhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT04gPSA0O1xuXG5IYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVMgPSB7XG4gIDE6ICc8PSAxLjAucmMuMicsIC8vIDEuMC5yYy4yIGlzIGFjdHVhbGx5IHJldjIgYnV0IGRvZXNuJ3QgcmVwb3J0IGl0XG4gIDI6ICc9PSAxLjAuMC1yYy4zJyxcbiAgMzogJz09IDEuMC4wLXJjLjQnLFxuICA0OiAnPj0gMS4wLjAnXG59O1xuXG5IYW5kbGViYXJzLmhlbHBlcnMgID0ge307XG5IYW5kbGViYXJzLnBhcnRpYWxzID0ge307XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZnVuY3Rpb25UeXBlID0gJ1tvYmplY3QgRnVuY3Rpb25dJyxcbiAgICBvYmplY3RUeXBlID0gJ1tvYmplY3QgT2JqZWN0XSc7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIgPSBmdW5jdGlvbihuYW1lLCBmbiwgaW52ZXJzZSkge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIGlmIChpbnZlcnNlIHx8IGZuKSB7IHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbignQXJnIG5vdCBzdXBwb3J0ZWQgd2l0aCBtdWx0aXBsZSBoZWxwZXJzJyk7IH1cbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLmhlbHBlcnMsIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIGlmIChpbnZlcnNlKSB7IGZuLm5vdCA9IGludmVyc2U7IH1cbiAgICB0aGlzLmhlbHBlcnNbbmFtZV0gPSBmbjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlclBhcnRpYWwgPSBmdW5jdGlvbihuYW1lLCBzdHIpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZCh0aGlzLnBhcnRpYWxzLCAgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5wYXJ0aWFsc1tuYW1lXSA9IHN0cjtcbiAgfVxufTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGFyZykge1xuICBpZihhcmd1bWVudHMubGVuZ3RoID09PSAyKSB7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJNaXNzaW5nIGhlbHBlcjogJ1wiICsgYXJnICsgXCInXCIpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignYmxvY2tIZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZSB8fCBmdW5jdGlvbigpIHt9LCBmbiA9IG9wdGlvbnMuZm47XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuXG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoY29udGV4dCA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbih0aGlzKTtcbiAgfSBlbHNlIGlmKGNvbnRleHQgPT09IGZhbHNlIHx8IGNvbnRleHQgPT0gbnVsbCkge1xuICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICB9IGVsc2UgaWYodHlwZSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiKSB7XG4gICAgaWYoY29udGV4dC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzLmVhY2goY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBpbnZlcnNlKHRoaXMpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gZm4oY29udGV4dCk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLksgPSBmdW5jdGlvbigpIHt9O1xuXG5IYW5kbGViYXJzLmNyZWF0ZUZyYW1lID0gT2JqZWN0LmNyZWF0ZSB8fCBmdW5jdGlvbihvYmplY3QpIHtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgdmFyIG9iaiA9IG5ldyBIYW5kbGViYXJzLksoKTtcbiAgSGFuZGxlYmFycy5LLnByb3RvdHlwZSA9IG51bGw7XG4gIHJldHVybiBvYmo7XG59O1xuXG5IYW5kbGViYXJzLmxvZ2dlciA9IHtcbiAgREVCVUc6IDAsIElORk86IDEsIFdBUk46IDIsIEVSUk9SOiAzLCBsZXZlbDogMyxcblxuICBtZXRob2RNYXA6IHswOiAnZGVidWcnLCAxOiAnaW5mbycsIDI6ICd3YXJuJywgMzogJ2Vycm9yJ30sXG5cbiAgLy8gY2FuIGJlIG92ZXJyaWRkZW4gaW4gdGhlIGhvc3QgZW52aXJvbm1lbnRcbiAgbG9nOiBmdW5jdGlvbihsZXZlbCwgb2JqKSB7XG4gICAgaWYgKEhhbmRsZWJhcnMubG9nZ2VyLmxldmVsIDw9IGxldmVsKSB7XG4gICAgICB2YXIgbWV0aG9kID0gSGFuZGxlYmFycy5sb2dnZXIubWV0aG9kTWFwW2xldmVsXTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZSAhPT0gJ3VuZGVmaW5lZCcgJiYgY29uc29sZVttZXRob2RdKSB7XG4gICAgICAgIGNvbnNvbGVbbWV0aG9kXS5jYWxsKGNvbnNvbGUsIG9iaik7XG4gICAgICB9XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLmxvZyA9IGZ1bmN0aW9uKGxldmVsLCBvYmopIHsgSGFuZGxlYmFycy5sb2dnZXIubG9nKGxldmVsLCBvYmopOyB9O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdlYWNoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgZm4gPSBvcHRpb25zLmZuLCBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlO1xuICB2YXIgaSA9IDAsIHJldCA9IFwiXCIsIGRhdGE7XG5cbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmIChvcHRpb25zLmRhdGEpIHtcbiAgICBkYXRhID0gSGFuZGxlYmFycy5jcmVhdGVGcmFtZShvcHRpb25zLmRhdGEpO1xuICB9XG5cbiAgaWYoY29udGV4dCAmJiB0eXBlb2YgY29udGV4dCA9PT0gJ29iamVjdCcpIHtcbiAgICBpZihjb250ZXh0IGluc3RhbmNlb2YgQXJyYXkpe1xuICAgICAgZm9yKHZhciBqID0gY29udGV4dC5sZW5ndGg7IGk8ajsgaSsrKSB7XG4gICAgICAgIGlmIChkYXRhKSB7IGRhdGEuaW5kZXggPSBpOyB9XG4gICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRbaV0sIHsgZGF0YTogZGF0YSB9KTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yKHZhciBrZXkgaW4gY29udGV4dCkge1xuICAgICAgICBpZihjb250ZXh0Lmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgICBpZihkYXRhKSB7IGRhdGEua2V5ID0ga2V5OyB9XG4gICAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtrZXldLCB7ZGF0YTogZGF0YX0pO1xuICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmKGkgPT09IDApe1xuICAgIHJldCA9IGludmVyc2UodGhpcyk7XG4gIH1cblxuICByZXR1cm4gcmV0O1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2lmJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbmRpdGlvbmFsKTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbmRpdGlvbmFsID0gY29uZGl0aW9uYWwuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKCFjb25kaXRpb25hbCB8fCBIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29uZGl0aW9uYWwpKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gb3B0aW9ucy5mbih0aGlzKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3VubGVzcycsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnNbJ2lmJ10uY2FsbCh0aGlzLCBjb25kaXRpb25hbCwge2ZuOiBvcHRpb25zLmludmVyc2UsIGludmVyc2U6IG9wdGlvbnMuZm59KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd3aXRoJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKCFIYW5kbGViYXJzLlV0aWxzLmlzRW1wdHkoY29udGV4dCkpIHJldHVybiBvcHRpb25zLmZuKGNvbnRleHQpO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2xvZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGxldmVsID0gb3B0aW9ucy5kYXRhICYmIG9wdGlvbnMuZGF0YS5sZXZlbCAhPSBudWxsID8gcGFyc2VJbnQob3B0aW9ucy5kYXRhLmxldmVsLCAxMCkgOiAxO1xuICBIYW5kbGViYXJzLmxvZyhsZXZlbCwgY29udGV4dCk7XG59KTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZNID0ge1xuICB0ZW1wbGF0ZTogZnVuY3Rpb24odGVtcGxhdGVTcGVjKSB7XG4gICAgLy8gSnVzdCBhZGQgd2F0ZXJcbiAgICB2YXIgY29udGFpbmVyID0ge1xuICAgICAgZXNjYXBlRXhwcmVzc2lvbjogSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uLFxuICAgICAgaW52b2tlUGFydGlhbDogSGFuZGxlYmFycy5WTS5pbnZva2VQYXJ0aWFsLFxuICAgICAgcHJvZ3JhbXM6IFtdLFxuICAgICAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICAgICAgdmFyIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXTtcbiAgICAgICAgaWYoZGF0YSkge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuLCBkYXRhKTtcbiAgICAgICAgfSBlbHNlIGlmICghcHJvZ3JhbVdyYXBwZXIpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV0gPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9ncmFtV3JhcHBlcjtcbiAgICAgIH0sXG4gICAgICBtZXJnZTogZnVuY3Rpb24ocGFyYW0sIGNvbW1vbikge1xuICAgICAgICB2YXIgcmV0ID0gcGFyYW0gfHwgY29tbW9uO1xuXG4gICAgICAgIGlmIChwYXJhbSAmJiBjb21tb24pIHtcbiAgICAgICAgICByZXQgPSB7fTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIGNvbW1vbik7XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBwYXJhbSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH0sXG4gICAgICBwcm9ncmFtV2l0aERlcHRoOiBIYW5kbGViYXJzLlZNLnByb2dyYW1XaXRoRGVwdGgsXG4gICAgICBub29wOiBIYW5kbGViYXJzLlZNLm5vb3AsXG4gICAgICBjb21waWxlckluZm86IG51bGxcbiAgICB9O1xuXG4gICAgcmV0dXJuIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgICAgdmFyIHJlc3VsdCA9IHRlbXBsYXRlU3BlYy5jYWxsKGNvbnRhaW5lciwgSGFuZGxlYmFycywgY29udGV4dCwgb3B0aW9ucy5oZWxwZXJzLCBvcHRpb25zLnBhcnRpYWxzLCBvcHRpb25zLmRhdGEpO1xuXG4gICAgICB2YXIgY29tcGlsZXJJbmZvID0gY29udGFpbmVyLmNvbXBpbGVySW5mbyB8fCBbXSxcbiAgICAgICAgICBjb21waWxlclJldmlzaW9uID0gY29tcGlsZXJJbmZvWzBdIHx8IDEsXG4gICAgICAgICAgY3VycmVudFJldmlzaW9uID0gSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTjtcblxuICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gIT09IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiA8IGN1cnJlbnRSZXZpc2lvbikge1xuICAgICAgICAgIHZhciBydW50aW1lVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY3VycmVudFJldmlzaW9uXSxcbiAgICAgICAgICAgICAgY29tcGlsZXJWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjb21waWxlclJldmlzaW9uXTtcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGFuIG9sZGVyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHByZWNvbXBpbGVyIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrcnVudGltZVZlcnNpb25zK1wiKSBvciBkb3duZ3JhZGUgeW91ciBydW50aW1lIHRvIGFuIG9sZGVyIHZlcnNpb24gKFwiK2NvbXBpbGVyVmVyc2lvbnMrXCIpLlwiO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIFVzZSB0aGUgZW1iZWRkZWQgdmVyc2lvbiBpbmZvIHNpbmNlIHRoZSBydW50aW1lIGRvZXNuJ3Qga25vdyBhYm91dCB0aGlzIHJldmlzaW9uIHlldFxuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYSBuZXdlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBydW50aW1lIHRvIGEgbmV3ZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJJbmZvWzFdK1wiKS5cIjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG4gIH0sXG5cbiAgcHJvZ3JhbVdpdGhEZXB0aDogZnVuY3Rpb24oaSwgZm4sIGRhdGEgLyosICRkZXB0aCAqLykge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAzKTtcblxuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBbY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGFdLmNvbmNhdChhcmdzKSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSBhcmdzLmxlbmd0aDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgcHJvZ3JhbTogZnVuY3Rpb24oaSwgZm4sIGRhdGEpIHtcbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4oY29udGV4dCwgb3B0aW9ucy5kYXRhIHx8IGRhdGEpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gMDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfSxcbiAgbm9vcDogZnVuY3Rpb24oKSB7IHJldHVybiBcIlwiOyB9LFxuICBpbnZva2VQYXJ0aWFsOiBmdW5jdGlvbihwYXJ0aWFsLCBuYW1lLCBjb250ZXh0LCBoZWxwZXJzLCBwYXJ0aWFscywgZGF0YSkge1xuICAgIHZhciBvcHRpb25zID0geyBoZWxwZXJzOiBoZWxwZXJzLCBwYXJ0aWFsczogcGFydGlhbHMsIGRhdGE6IGRhdGEgfTtcblxuICAgIGlmKHBhcnRpYWwgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGZvdW5kXCIpO1xuICAgIH0gZWxzZSBpZihwYXJ0aWFsIGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcbiAgICAgIHJldHVybiBwYXJ0aWFsKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoIUhhbmRsZWJhcnMuY29tcGlsZSkge1xuICAgICAgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKFwiVGhlIHBhcnRpYWwgXCIgKyBuYW1lICsgXCIgY291bGQgbm90IGJlIGNvbXBpbGVkIHdoZW4gcnVubmluZyBpbiBydW50aW1lLW9ubHkgbW9kZVwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydGlhbHNbbmFtZV0gPSBIYW5kbGViYXJzLmNvbXBpbGUocGFydGlhbCwge2RhdGE6IGRhdGEgIT09IHVuZGVmaW5lZH0pO1xuICAgICAgcmV0dXJuIHBhcnRpYWxzW25hbWVdKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy50ZW1wbGF0ZSA9IEhhbmRsZWJhcnMuVk0udGVtcGxhdGU7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcblxufTtcbiIsImV4cG9ydHMuYXR0YWNoID0gZnVuY3Rpb24oSGFuZGxlYmFycykge1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG52YXIgZXJyb3JQcm9wcyA9IFsnZGVzY3JpcHRpb24nLCAnZmlsZU5hbWUnLCAnbGluZU51bWJlcicsICdtZXNzYWdlJywgJ25hbWUnLCAnbnVtYmVyJywgJ3N0YWNrJ107XG5cbkhhbmRsZWJhcnMuRXhjZXB0aW9uID0gZnVuY3Rpb24obWVzc2FnZSkge1xuICB2YXIgdG1wID0gRXJyb3IucHJvdG90eXBlLmNvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cbiAgLy8gVW5mb3J0dW5hdGVseSBlcnJvcnMgYXJlIG5vdCBlbnVtZXJhYmxlIGluIENocm9tZSAoYXQgbGVhc3QpLCBzbyBgZm9yIHByb3AgaW4gdG1wYCBkb2Vzbid0IHdvcmsuXG4gIGZvciAodmFyIGlkeCA9IDA7IGlkeCA8IGVycm9yUHJvcHMubGVuZ3RoOyBpZHgrKykge1xuICAgIHRoaXNbZXJyb3JQcm9wc1tpZHhdXSA9IHRtcFtlcnJvclByb3BzW2lkeF1dO1xuICB9XG59O1xuSGFuZGxlYmFycy5FeGNlcHRpb24ucHJvdG90eXBlID0gbmV3IEVycm9yKCk7XG5cbi8vIEJ1aWxkIG91dCBvdXIgYmFzaWMgU2FmZVN0cmluZyB0eXBlXG5IYW5kbGViYXJzLlNhZmVTdHJpbmcgPSBmdW5jdGlvbihzdHJpbmcpIHtcbiAgdGhpcy5zdHJpbmcgPSBzdHJpbmc7XG59O1xuSGFuZGxlYmFycy5TYWZlU3RyaW5nLnByb3RvdHlwZS50b1N0cmluZyA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gdGhpcy5zdHJpbmcudG9TdHJpbmcoKTtcbn07XG5cbnZhciBlc2NhcGUgPSB7XG4gIFwiJlwiOiBcIiZhbXA7XCIsXG4gIFwiPFwiOiBcIiZsdDtcIixcbiAgXCI+XCI6IFwiJmd0O1wiLFxuICAnXCInOiBcIiZxdW90O1wiLFxuICBcIidcIjogXCImI3gyNztcIixcbiAgXCJgXCI6IFwiJiN4NjA7XCJcbn07XG5cbnZhciBiYWRDaGFycyA9IC9bJjw+XCInYF0vZztcbnZhciBwb3NzaWJsZSA9IC9bJjw+XCInYF0vO1xuXG52YXIgZXNjYXBlQ2hhciA9IGZ1bmN0aW9uKGNocikge1xuICByZXR1cm4gZXNjYXBlW2Nocl0gfHwgXCImYW1wO1wiO1xufTtcblxuSGFuZGxlYmFycy5VdGlscyA9IHtcbiAgZXh0ZW5kOiBmdW5jdGlvbihvYmosIHZhbHVlKSB7XG4gICAgZm9yKHZhciBrZXkgaW4gdmFsdWUpIHtcbiAgICAgIGlmKHZhbHVlLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgICAgb2JqW2tleV0gPSB2YWx1ZVtrZXldO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBlc2NhcGVFeHByZXNzaW9uOiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAvLyBkb24ndCBlc2NhcGUgU2FmZVN0cmluZ3MsIHNpbmNlIHRoZXkncmUgYWxyZWFkeSBzYWZlXG4gICAgaWYgKHN0cmluZyBpbnN0YW5jZW9mIEhhbmRsZWJhcnMuU2FmZVN0cmluZykge1xuICAgICAgcmV0dXJuIHN0cmluZy50b1N0cmluZygpO1xuICAgIH0gZWxzZSBpZiAoc3RyaW5nID09IG51bGwgfHwgc3RyaW5nID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIFwiXCI7XG4gICAgfVxuXG4gICAgLy8gRm9yY2UgYSBzdHJpbmcgY29udmVyc2lvbiBhcyB0aGlzIHdpbGwgYmUgZG9uZSBieSB0aGUgYXBwZW5kIHJlZ2FyZGxlc3MgYW5kXG4gICAgLy8gdGhlIHJlZ2V4IHRlc3Qgd2lsbCBkbyB0aGlzIHRyYW5zcGFyZW50bHkgYmVoaW5kIHRoZSBzY2VuZXMsIGNhdXNpbmcgaXNzdWVzIGlmXG4gICAgLy8gYW4gb2JqZWN0J3MgdG8gc3RyaW5nIGhhcyBlc2NhcGVkIGNoYXJhY3RlcnMgaW4gaXQuXG4gICAgc3RyaW5nID0gc3RyaW5nLnRvU3RyaW5nKCk7XG5cbiAgICBpZighcG9zc2libGUudGVzdChzdHJpbmcpKSB7IHJldHVybiBzdHJpbmc7IH1cbiAgICByZXR1cm4gc3RyaW5nLnJlcGxhY2UoYmFkQ2hhcnMsIGVzY2FwZUNoYXIpO1xuICB9LFxuXG4gIGlzRW1wdHk6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSAmJiB2YWx1ZSAhPT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIGlmKHRvU3RyaW5nLmNhbGwodmFsdWUpID09PSBcIltvYmplY3QgQXJyYXldXCIgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxufTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvYmFzZS5qcycpLmNyZWF0ZSgpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3V0aWxzLmpzJykuYXR0YWNoKGV4cG9ydHMpXG5yZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL3J1bnRpbWUuanMnKS5hdHRhY2goZXhwb3J0cykiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCBERVNJR04gV0laQVJEXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICAjIEFwcCBEYXRhXG4gICAgQXBwRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb250ZW50JylcblxuICAgIEBkYXRhID0gQXBwRGF0YVxuXG5cbiAgICAjIEltcG9ydCB2aWV3c1xuICAgIEhvbWVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Ib21lVmlldycpXG5cbiAgICBMb2dpblZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0xvZ2luVmlldycpXG5cbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuICAgIElucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG4gICAgT3V0cHV0VmlldyA9IHJlcXVpcmUoJy4vdmlld3MvT3V0cHV0VmlldycpXG5cblxuICAgICMgSW5pdGlhbGl6ZSB2aWV3c1xuICAgIEBob21lVmlldyA9IG5ldyBIb21lVmlldygpXG5cbiAgICBAbG9naW5WaWV3ID0gbmV3IExvZ2luVmlldygpXG5cbiAgICBAaW5wdXRJdGVtVmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KClcblxuICAgIEBvdXRwdXRWaWV3ID0gbmV3IE91dHB1dFZpZXcoKVxuXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXG4gICAgXG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uIiwibW9kdWxlLmV4cG9ydHMgPSBXaXphcmRBc3NpZ25tZW50RGF0YSA9IHtcblxufSIsIldpemFyZENvbnRlbnQgPSBbXG4gIHtcbiAgICBpZDogXCJpbnRyb1wiXG4gICAgdGl0bGU6ICdXZWxjb21lIHRvIHRoZSBBc3NpZ25tZW50IERlc2lnbiBXaXphcmQhJ1xuICAgIGxvZ2luX2luc3RydWN0aW9uczogJ0NsaWNrIExvZ2luIHdpdGggV2lraXBlZGlhIHRvIGdldCBzdGFydGVkJ1xuICAgIGluc3RydWN0aW9uczogJydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5UaGlzIHRvb2wgd2lsbCB3YWxrIHlvdSB0aHJvdWdoIGJlc3QgcHJhY3RpY2VzIGZvciBXaWtpcGVkaWEgY2xhc3Nyb29tIGFzc2lnbm1lbnRzIGFuZCBoZWxwIHlvdSBjcmVhdGUgYSBjdXN0b21pemVkIHN5bGxhYnVzIGZvciB5b3VyIGNvdXJzZSwgYnJva2VuIGludG8gd2Vla2x5IGFzc2lnbm1lbnRzLjwvcD5cIlxuICAgICAgICAgIFwiPHAgY2xhc3M9J2xhcmdlJz5XaGVuIHlvdeKAmXJlIGZpbmlzaGVkLCB5b3UgY2FuIHB1Ymxpc2ggYSByZWFkeS10by11c2UgbGVzc29uIHBsYW4gb250byBhIHdpa2kgcGFnZSwgd2hlcmUgaXQgY2FuIGJlIGN1c3RvbWl6ZWQgZXZlbiBmdXJ0aGVyLjwvcD5cIiAgICAgXG4gICAgICAgICAgXCI8cCBjbGFzcz0nbGFyZ2UnPkxldOKAmXMgc3RhcnQgYnkgZmlsbGluZyBpbiBzb21lIGJhc2ljcyBhYm91dCB5b3UgYW5kIHlvdXIgY291cnNlOjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJhc3NpZ25tZW50X3NlbGVjdGlvblwiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IHR5cGUgc2VsZWN0aW9uJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGFzc2lnbm1lbnQgc2VsZWN0aW9ucydcbiAgICBmb3JtVGl0bGU6ICdBdmFpbGFibGUgYXNzaWdubWVudHM6J1xuICAgIGluc3RydWN0aW9uczogXCJZb3UgY2FuIHRlYWNoIHdpdGggV2lraXBlZGlhIGluIHNldmVyYWwgZGlmZmVyZW50IHdheXMsIGFuZCBpdCdzIGltcG9ydGFudCB0byBkZXNpZ24gYW4gYXNzaWdubWVudCB0aGF0IGZpdHMgb24gV2lraXBlZGlhIGFuZCBhY2hpZXZlcyB5b3VyIHN0dWRlbnQgbGVhcm5pbmcgb2JqZWN0aXZlcy4gWW91ciBmaXJzdCBzdGVwIGlzIHRvIGNob29zZSB3aGljaCBhc3NpZ25tZW50KHMpIHlvdSdsbCBiZSBhc2tpbmcgeW91ciBzdHVkZW50cyB0byBjb21wbGV0ZSBhcyBwYXJ0IG9mIHRoZSBjb3Vyc2UuIFdlJ3ZlIGNyZWF0ZWQgc29tZSBndWlkZWxpbmVzIHRvIGhlbHAgeW91LCBidXQgeW91J2xsIG5lZWQgdG8gbWFrZSBzb21lIGtleSBkZWNpc2lvbnMsIHN1Y2ggYXM6IHdoaWNoIGxlYXJuaW5nIG9iamVjdGl2ZXMgYXJlIHlvdSB0YXJnZXRpbmcgd2l0aCB0aGlzIGFzc2lnbm1lbnQ/IFdoYXQgc2tpbGxzIGRvIHlvdXIgc3R1ZGVudHMgYWxyZWFkeSBoYXZlPyBIb3cgbXVjaCB0aW1lIGNhbiB5b3UgZGV2b3RlIHRvIHRoZSBhc3NpZ25tZW50P1wiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Nb3N0IGluc3RydWN0b3JzIGFzayB0aGVpciBzdHVkZW50cyB0byB3cml0ZSBhbiBhcnRpY2xlLiBTdHVkZW50cyBzdGFydCBieSBsZWFybmluZyB0aGUgYmFzaWNzIG9mIFdpa2lwZWRpYSwgYW5kIHRoZW4gdGhleSBmb2N1cyBvbiB0aGUgY29udGVudC4gVGhleSBwbGFuLCByZXNlYXJjaCwgd3JpdGUsIGFuZCByZXZpc2UgYSBwcmV2aW91c2x5IG1pc3NpbmcgV2lraXBlZGlhIGFydGljbGUgb3IgY29udHJpYnV0ZSB0byBhbiBleGlzdGluZyBlbnRyeSBvbiBhIGNvdXJzZS1yZWxhdGVkIHRvcGljIHRoYXQgaXMgaW5jb21wbGV0ZS4gVGhpcyBhc3NpZ25tZW50IHR5cGljYWxseSByZXBsYWNlcyBhIHRlcm0gcGFwZXIgb3IgcmVzZWFyY2ggcHJvamVjdCwgb3IgaXQgZm9ybXMgdGhlIGxpdGVyYXR1cmUgcmV2aWV3IHNlY3Rpb24gb2YgYSBsYXJnZXIgcGFwZXIuIFRoZSBzdHVkZW50IGxlYXJuaW5nIG91dGNvbWUgaXMgaGlnaCB3aXRoIHRoaXMgYXNzaWdubWVudCwgYnV0IGl0IGRvZXMgdGFrZSBhIHNpZ25pZmljYW50IGFtb3VudCBvZiB0aW1lLiBUbyBsZWFybiBob3cgdG8gY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIHlvdXIgc3R1ZGVudHMgbmVlZCB0byBsZWFybiBib3RoIHRoZSB3aWtpIG1hcmt1cCBsYW5ndWFnZSBhbmQga2V5IHBvbGljaWVzIGFuZCBleHBlY3RhdGlvbnMgb2YgdGhlIFdpa2lwZWRpYS1lZGl0aW5nIGNvbW11bml0eS48L3A+XCJcbiAgICAgICAgICBcIjxwPklmIHdyaXRpbmcgYW4gYXJ0aWNsZSBpc24ndCByaWdodCBmb3IgeW91ciBjbGFzcywgb3RoZXIgYXNzaWdubWVudCBvcHRpb25zIHN0aWxsIGdpdmUgc3R1ZGVudHMgdmFsdWFibGUgbGVhcm5pbmcgb3Bwb3J0dW5pdGllcyBhcyB0aGV5IGltcHJvdmUgV2lraXBlZGlhLiBTZWxlY3QgYW4gYXNzaWdubWVudCB0eXBlIHRvIHRoZSBsZWZ0IHRvIGxlYXJuIG1vcmUgYWJvdXQgZWFjaCBhc3NpZ25tZW50LjwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICB9XG4gIHtcbiAgICBpZDogXCJsZWFybmluZ19lc3NlbnRpYWxzXCJcbiAgICB0aXRsZTogJ1dpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IFdpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuIEFzIHRoZWlyIGZpcnN0IFdpa2lwZWRpYSBhc3NpZ25tZW50IG1pbGVzdG9uZSwgeW91IGNhbiBhc2sgdGhlIHN0dWRlbnRzIHRvIGNyZWF0ZSBhY2NvdW50cyBhbmQgdGhlbiBjb21wbGV0ZSB0aGUgJydvbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzJycuIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLlwiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPlRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgY292ZXJzIHNvbWUgb2YgdGhlIHdheXMgdGhleSBjYW4gZmluZCBoZWxwIGFzIHRoZXkgZ2V0IHN0YXJ0ZWQuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCB0aGF0IHlvdSBjYW4gdXNlIHRvIHZlcmlmeSB0aGF0IHN0dWRlbnRzIGNvbXBsZXRlZCB0aGUgdHJhaW5pbmc8L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQXNzaWdubWVudCBtaWxlc3RvbmVzOidcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPkNyZWF0ZSBhIHVzZXIgYWNjb3VudCBhbmQgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT5Db21wbGV0ZSB0aGUgb25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50cy4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLiA8L2xpPlxuICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgXCI8cD5XaWxsIGNvbXBsZXRpb24gb2YgdGhlIHN0dWRlbnQgdHJhaW5pbmcgYmUgcGFydCBvZiB5b3VyIHN0dWRlbnRzJyBncmFkZXM/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImdldHRpbmdfc3RhcnRlZFwiXG4gICAgdGl0bGU6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGVkaXRpbmcnXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIkl0IGlzIGltcG9ydGFudCBmb3Igc3R1ZGVudHMgdG8gc3RhcnQgZWRpdGluZyBXaWtpcGVkaWEgcmlnaHQgYXdheS4gVGhhdCB3YXksIHRoZXkgYmVjb21lIGZhbWlsaWFyIHdpdGggV2lraXBlZGlhJ3MgbWFya3VwIChcXFwid2lraXN5bnRheFxcXCIsIFxcXCJ3aWtpbWFya3VwXFxcIiwgb3IgXFxcIndpa2ljb2RlXFxcIikgYW5kIHRoZSBtZWNoYW5pY3Mgb2YgZWRpdGluZyBhbmQgY29tbXVuaWNhdGluZyBvbiB0aGUgc2l0ZS4gV2UgcmVjb21tZW5kIGFzc2lnbmluZyBhIGZldyBiYXNpYyBXaWtpcGVkaWEgdGFza3MgZWFybHkgb24uXCJcbiAgICBmb3JtVGl0bGU6ICdXaGljaCBiYXNpYyBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlPydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+V2hpY2ggaW50cm9kdWN0b3J5IGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSB0byBhY2NsaW1hdGUgeW91ciBzdHVkZW50cyB0byBXaWtpcGVkaWE/IFlvdSBjYW4gc2VsZWN0IG5vbmUsIG9uZSwgb3IgbW9yZS4gV2hpY2hldmVyIHlvdSBzZWxlY3Qgd2lsbCBiZSBhZGRlZCB0byB0aGUgY291cnNlIHN5bGxhYnVzLjwvcD4nXG4gICAgICAgICAgJzx1bD5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5BZGQgdG8gYW4gYXJ0aWNsZS48L3N0cm9uZz4gVXNpbmcgY291cnNlIHJlYWRpbmdzIG9yIG90aGVyIHJlbGV2YW50IHNlY29uZGFyeSBzb3VyY2VzLCBhZGQgMeKAkzIgc2VudGVuY2VzIG9mIG5ldyBpbmZvcm1hdGlvbiB0byBhIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLiBCZSBzdXJlIHRvIGludGVncmF0ZSBpdCB3ZWxsIGludG8gdGhlIGV4aXN0aW5nIGFydGljbGUsIGFuZCBpbmNsdWRlIGEgY2l0YXRpb24gdG8gdGhlIHNvdXJjZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNvcHllZGl0IGFuIGFydGljbGUuPC9zdHJvbmc+IEJyb3dzZSBXaWtpcGVkaWEgdW50aWwgeW91IGZpbmQgYW4gYXJ0aWNsZSB0aGF0IHlvdSB3b3VsZCBsaWtlIHRvIGltcHJvdmUsIGFuZCBtYWtlIHNvbWUgZWRpdHMgdG8gaW1wcm92ZSB0aGUgbGFuZ3VhZ2Ugb3IgZm9ybWF0dGluZy4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgY3JlYXRpbmcgYW5kIHVwbG9hZGluZyBhbiBvcmlnaW5hbCBwaG90b2dyYXBoIG9yIHZpZGVvLjwvbGk+XG4gICAgICAgICAgPC91bD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Gb3IgbW9zdCBjb3Vyc2VzLCB0aGUgPGVtPkNyaXRpcXVlIGFuIGFydGljbGU8L2VtPiBhbmQgPGVtPkFkZCB0byBhbiBhcnRpY2xlPC9lbT4gZXhlcmNpc2VzIHByb3ZpZGUgYSBuaWNlIGZvdW5kYXRpb24gZm9yIHRoZSBtYWluIHdyaXRpbmcgcHJvamVjdC4gVGhlc2UgaGF2ZSBiZWVuIHNlbGVjdGVkIGJ5IGRlZmF1bHQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICB0aXRsZTogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgIGZvcm1UaXRsZTogJ1RoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBjaG9vc2luZyBhcnRpY2xlcydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+Q2hvb3NpbmcgdGhlIHJpZ2h0IChvciB3cm9uZykgYXJ0aWNsZXMgdG8gd29yayBvbiBjYW4gbWFrZSAob3IgYnJlYWspIGEgV2lraXBlZGlhIHdyaXRpbmcgYXNzaWdubWVudC48L3A+J1xuICAgICAgICAgICc8cD5Tb21lIGFydGljbGVzIG1heSBpbml0aWFsbHkgbG9vayBlYXN5IHRvIGltcHJvdmUsIGJ1dCBxdWFsaXR5IHJlZmVyZW5jZXMgdG8gZXhwYW5kIHRoZW0gbWF5IGJlIGRpZmZpY3VsdCB0byBmaW5kLiBGaW5kaW5nIHRvcGljcyB3aXRoIHRoZSByaWdodCBiYWxhbmNlIGJldHdlZW4gcG9vciBXaWtpcGVkaWEgY292ZXJhZ2UgYW5kIGF2YWlsYWJsZSBsaXRlcmF0dXJlIGZyb20gd2hpY2ggdG8gZXhwYW5kIHRoYXQgY292ZXJhZ2UgY2FuIGJlIHRyaWNreS4gSGVyZSBhcmUgc29tZSBndWlkZWxpbmVzIHRvIGtlZXAgaW4gbWluZCB3aGVuIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgaW1wcm92ZW1lbnQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFydGljbGVzIHRoYXQgYXJlIFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD4nXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChlLmcuLCBHbG9iYWwgV2FybWluZywgQWJvcnRpb24sIFNjaWVudG9sb2d5LCBldGMuKS4gWW91IG1heSBiZSBtb3JlIHN1Y2Nlc3NmdWwgc3RhcnRpbmcgYSBzdWItYXJ0aWNsZSBvbiB0aGUgdG9waWMgaW5zdGVhZC48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICA8bGk+QXZvaWQgd29ya2luZyBvbiBzb21ldGhpbmcgd2l0aCBzY2FyY2UgbGl0ZXJhdHVyZS4gV2lraXBlZGlhIGFydGljbGVzIGNpdGUgc2Vjb25kYXJ5IGxpdGVyYXR1cmUgc291cmNlcywgc28gaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSBlbm91Z2ggc291cmNlcyBmb3IgdmVyaWZpY2F0aW9uIGFuZCB0byBwcm92aWRlIGEgbmV1dHJhbCBwb2ludCBvZiB2aWV3LjwvbGk+XG4gICAgICAgICAgICA8bGk+RG9uJ3Qgc3RhcnQgYXJ0aWNsZXMgd2l0aCB0aXRsZXMgdGhhdCBpbXBseSBhbiBhcmd1bWVudCBvciBlc3NheS1saWtlIGFwcHJvYWNoIChlLmcuLCBUaGUgRWZmZWN0cyBUaGF0IFRoZSBSZWNlbnQgU3ViLVByaW1lIE1vcnRnYWdlIENyaXNpcyBoYXMgaGFkIG9uIHRoZSBVUyBhbmQgR2xvYmFsIEVjb25vbWljcykuIFRoZXNlIHR5cGUgb2YgdGl0bGVzLCBhbmQgbW9zdCBsaWtlbHkgdGhlIGNvbnRlbnQgdG9vLCBtYXkgbm90IGJlIGFwcHJvcHJpYXRlIGZvciBhbiBlbmN5Y2xvcGVkaWEuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMS0yIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gKlJlbGV2YW50IFdpa2lQcm9qZWN0IHBhZ2VzIGNhbiBwcm92aWRlIGEgbGlzdCBvZiBzdHVicyB0aGF0IG5lZWQgaW1wcm92ZW1lbnQuPC9saT5cbiAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZSBpbnN0cnVjdG9yLCB5b3Ugc2hvdWxkIGFwcGx5IHlvdXIgb3duIGV4cGVydGlzZSB0byBleGFtaW5pbmcgV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkLiBZb3UgdW5kZXJzdGFuZCB0aGUgYnJvYWRlciBpbnRlbGxlY3R1YWwgY29udGV4dCB3aGVyZSBpbmRpdmlkdWFsIHRvcGljcyBmaXQgaW4sIHlvdSBjYW4gcmVjb2duaXplIHdoZXJlIFdpa2lwZWRpYSBmYWxscyBzaG9ydCwgeW91IGtub3figJRvciBrbm93IGhvdyB0byBmaW5k4oCUdGhlIHJlbGV2YW50IGxpdGVyYXR1cmUsIGFuZCB5b3Uga25vdyB3aGF0IHRvcGljcyB5b3VyIHN0dWRlbnRzIHNob3VsZCBiZSBhYmxlIHRvIGhhbmRsZS4gWW91ciBndWlkYW5jZSBvbiBhcnRpY2xlIGNob2ljZSBhbmQgc291cmNpbmcgaXMgY3JpdGljYWwgZm9yIGJvdGggeW91ciBzdHVkZW50c+KAmSBzdWNjZXNzIGFuZCB0aGUgaW1wcm92ZW1lbnQgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdJbnN0cnVjdG9yIHByZXBhcmVzIGEgbGlzdCdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Zb3UgKHRoZSBpbnN0cnVjdG9yKSBwcmVwYXJlIGEgbGlzdCBvZiBhcHByb3ByaWF0ZSBcXCdub24tZXhpc3RlbnRcXCcsIFxcJ3N0dWJcXCcgb3IgXFwnc3RhcnRcXCcgYXJ0aWNsZXMgYWhlYWQgb2YgdGltZSBmb3IgdGhlIHN0dWRlbnRzIHRvIGNob29zZSBmcm9tLiBJZiBwb3NzaWJsZSwgeW91IG1heSB3YW50IHRvIHdvcmsgd2l0aCBhbiBleHBlcmllbmNlZCBXaWtpcGVkaWFuIHRvIGNyZWF0ZSB0aGUgbGlzdC4gRWFjaCBzdHVkZW50IGNob29zZXMgYW4gYXJ0aWNsZSBmcm9tIHRoZSBsaXN0IHRvIHdvcmsgb24uIEFsdGhvdWdoIHRoaXMgcmVxdWlyZXMgbW9yZSBwcmVwYXJhdGlvbiwgaXQgbWF5IGhlbHAgc3R1ZGVudHMgdG8gc3RhcnQgcmVzZWFyY2hpbmcgYW5kIHdyaXRpbmcgdGhlaXIgYXJ0aWNsZXMgc29vbmVyLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdTdHVkZW50cyBmaW5kIGFydGljbGVzJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkVhY2ggc3R1ZGVudCBleHBsb3JlcyBXaWtpcGVkaWEgYW5kIGxpc3RzIDPigJM1IHRvcGljcyBvbiB0aGVpciBXaWtpcGVkaWEgdXNlciBwYWdlIHRoYXQgdGhleSBhcmUgaW50ZXJlc3RlZCBpbiBmb3IgdGhlaXIgbWFpbiBwcm9qZWN0LiBZb3UgKHRoZSBpbnN0cnVjdG9yKSBzaG91bGQgYXBwcm92ZSBhcnRpY2xlIGNob2ljZXMgYmVmb3JlIHN0dWRlbnRzIHByb2NlZWQgdG8gd3JpdGluZy4gTGV0dGluZyBzdHVkZW50cyBmaW5kIHRoZWlyIG93biBhcnRpY2xlcyBwcm92aWRlcyB0aGVtIHdpdGggYSBzZW5zZSBvZiBtb3RpdmF0aW9uIGFuZCBvd25lcnNoaXAgb3ZlciB0aGUgYXNzaWdubWVudCwgYnV0IGl0IG1heSBhbHNvIGxlYWQgdG8gY2hvaWNlcyB0aGF0IGFyZSBmdXJ0aGVyIGFmaWVsZCBmcm9tIGNvdXJzZSBtYXRlcmlhbC48L3A+J1xuICAgICAgICBdXG4gICAgICB9IFxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwicmVzZWFyY2hfcGxhbm5pbmdcIlxuICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgIGZvcm1UaXRsZTogJ0hvdyBzaG91bGQgc3R1ZGVudHMgcGxhbiB0aGVpciBhcnRpY2xlcz8nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgIGluc3RydWN0aW9uczogIFwiU3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGFibGUgZm9yIFdpa2lwZWRpYS4gVGhhdCdzIHdoeSB3ZSByZWNvbW1lbmQgYXNraW5nIHN0dWRlbnRzIHRvIHB1dCB0b2dldGhlciBhIGJpYmxpb2dyYXBoeSBvZiBtYXRlcmlhbHMgdGhleSB3YW50IHRvIHVzZSBpbiBlZGl0aW5nIHRoZSBhcnRpY2xlLCB3aGljaCBjYW4gdGhlbiBiZSBhc3Nlc3NlZCBieSB5b3UgYW5kIG90aGVyIFdpa2lwZWRpYW5zLlwiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPlRoZW4sIHN0dWRlbnRzIHNob3VsZCBwcm9wb3NlIG91dGxpbmVzIGZvciB0aGVpciBhcnRpY2xlcy4gVGhpcyBjYW4gYmUgYSB0cmFkaXRpb25hbCBvdXRsaW5lLCBpbiB3aGljaCBzdHVkZW50cyBpZGVudGlmeSB3aGljaCBzZWN0aW9ucyB0aGVpciBhcnRpY2xlcyB3aWxsIGhhdmUgYW5kIHdoaWNoIGFzcGVjdHMgb2YgdGhlIHRvcGljIHdpbGwgYmUgY292ZXJlZCBpbiBlYWNoIHNlY3Rpb24uIEFsdGVybmF0aXZlbHksIHN0dWRlbnRzIGNhbiBkZXZlbG9wIGVhY2ggb3V0bGluZSBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYSBsZWFkIHNlY3Rpb24g4oCUIHRoZSB1bnRpdGxlZCBzZWN0aW9uIGF0IHRoZSBiZWdpbm5pbmcgb2YgYW4gYXJ0aWNsZSB0aGF0IGRlZmluZXMgdGhlIHRvcGljIGFuZCBwcm92aWRlIGEgY29uY2lzZSBzdW1tYXJ5IG9mIGl0cyBjb250ZW50LiBXb3VsZCB5b3UgbGlrZSB5b3VyIHN0dWRlbnRzIHRvIGNyZWF0ZSB0cmFkaXRpb25hbCBvdXRsaW5lcywgb3IgY29tcG9zZSBvdXRsaW5lcyBpbiB0aGUgZm9ybSBvZiBhIFdpa2lwZWRpYS1zdHlsZSBsZWFkIHNlY3Rpb24/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJkcmFmdHNfbWFpbnNwYWNlXCJcbiAgICB0aXRsZTogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBvbmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGRyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgIGluc3RydWN0aW9uczogJ09uY2Ugc3R1ZGVudHMgaGF2ZSBnb3R0ZW4gYSBncmlwIG9uIHRoZWlyIHRvcGljcyBhbmQgdGhlIHNvdXJjZXMgdGhleSB3aWxsIHVzZSB0byB3cml0ZSBhYm91dCB0aGVtLCBpdOKAmXMgdGltZSB0byBzdGFydCB3cml0aW5nIG9uIFdpa2lwZWRpYS4gWW91IGNhbiBhc2sgdGhlbSB0byBqdW1wIHJpZ2h0IGluIGFuZCBlZGl0IGxpdmUsIG9yIHN0YXJ0IHRoZW0gb2ZmIGluIHRoZWlyIG93biBzYW5kYm94ZXMuIFRoZXJlIGFyZSBwcm9zIGFuZCBjb25zIHRvIGVhY2ggYXBwcm9hY2guJ1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnUHJvcyBhbmQgY29ucyB0byBzYW5kYm94ZXMnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPlNhbmRib3hlcyBtYWtlIHN0dWRlbnRzIGZlZWwgc2FmZSBiZWNhdXNlIHRoZXkgY2FuIGVkaXQgd2l0aG91dCB0aGUgcHJlc3N1cmUgb2YgdGhlIHdob2xlIHdvcmxkIHJlYWRpbmcgdGhlaXIgZHJhZnRzLCBvciBvdGhlciBXaWtpcGVkaWFucyBhbHRlcmluZyB0aGVpciB3cml0aW5nLiBIb3dldmVyLCBzYW5kYm94IGVkaXRpbmcgbGltaXRzIG1hbnkgb2YgdGhlIHVuaXF1ZSBhc3BlY3RzIG9mIFdpa2lwZWRpYSBhcyBhIHRlYWNoaW5nIHRvb2wsIHN1Y2ggYXMgY29sbGFib3JhdGl2ZSB3cml0aW5nIGFuZCBpbmNyZW1lbnRhbCBkcmFmdGluZy4gU3BlbmRpbmcgbW9yZSB0aGFuIGEgd2VlayBvciB0d28gaW4gc2FuZGJveGVzIGlzIHN0cm9uZ2x5IGRpc2NvdXJhZ2VkLjwvcD5cIiBcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ1Byb3MgYW5kIGNvbnMgdG8gZWRpdGluZyBsaXZlJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5FZGl0aW5nIGxpdmUgaXMgZXhjaXRpbmcgZm9yIHRoZSBzdHVkZW50cyBiZWNhdXNlIHRoZXkgY2FuIHNlZSB0aGVpciBjaGFuZ2VzIHRvIHRoZSBhcnRpY2xlcyBpbW1lZGlhdGVseSBhbmQgZXhwZXJpZW5jZSB0aGUgY29sbGFib3JhdGl2ZSBlZGl0aW5nIHByb2Nlc3MgdGhyb3VnaG91dCB0aGUgYXNzaWdubWVudC4gSG93ZXZlciwgYmVjYXVzZSBuZXcgZWRpdG9ycyBvZnRlbiB1bmludGVudGlvbmFsbHkgYnJlYWsgV2lraXBlZGlhIHJ1bGVzLCBzb21ldGltZXMgc3R1ZGVudHPigJkgYWRkaXRpb25zIGFyZSBxdWVzdGlvbmVkIG9yIHJlbW92ZWQuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6ICdcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCInXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwicGVlcl9mZWVkYmFja1wiXG4gICAgdGl0bGU6ICdQZWVyIGZlZWRiYWNrJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IHBlZXIgZmVlZGJhY2snXG4gICAgZm9ybVRpdGxlOiBcIkhvdyBtYW55IHBlZXIgcmV2aWV3cyBzaG91bGQgZWFjaCBzdHVkZW50IGNvbmR1Y3Q/XCJcbiAgICBpbnN0cnVjdGlvbnM6IFwiQ29sbGFib3JhdGlvbiBpcyBhIGNyaXRpY2FsIGVsZW1lbnQgb2YgY29udHJpYnV0aW5nIHRvIFdpa2lwZWRpYS5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Gb3Igc29tZSBzdHVkZW50cywgdGhpcyB3aWxsIGhhcHBlbiBzcG9udGFuZW91c2x5OyB0aGVpciBjaG9pY2Ugb2YgdG9waWNzIHdpbGwgYXR0cmFjdCBpbnRlcmVzdGVkIFdpa2lwZWRpYW5zIHdobyB3aWxsIHBpdGNoIGluIHdpdGggaWRlYXMsIGNvcHllZGl0cywgb3IgZXZlbiBzdWJzdGFudGlhbCBjb250cmlidXRpb25zIHRvIHRoZSBzdHVkZW50c+KAmSBhcnRpY2xlcy4gSW4gbWFueSBjYXNlcywgaG93ZXZlciwgdGhlcmUgd2lsbCBiZSBsaXR0bGUgc3BvbnRhbmVvdXMgZWRpdGluZyBvZiBzdHVkZW50c+KAmSBhcnRpY2xlcyBiZWZvcmUgdGhlIGVuZCBvZiB0aGUgdGVybS4gRm9ydHVuYXRlbHksIHlvdSBoYXZlIGEgY2xhc3Nyb29tIGZ1bGwgb2YgcGVlciByZXZpZXdlcnMuIFlvdSBjYW4gbWFrZSB0aGUgbW9zdCBvZiB0aGlzIGJ5IGFzc2lnbmluZyBzdHVkZW50cyB0byByZXZpZXcgZWFjaCBvdGhlcnPigJkgYXJ0aWNsZXMgc29vbiBhZnRlciBmdWxsLWxlbmd0aCBkcmFmdHMgYXJlIHBvc3RlZC4gVGhpcyBnaXZlcyBzdHVkZW50cyBwbGVudHkgb2YgdGltZSB0byBhY3Qgb24gdGhlIGFkdmljZSBvZiB0aGVpciBwZWVycy48L3A+XCJcbiAgICAgICAgICBcIjxwPkhvdyBtYW55IHBlZXIgcmV2aWV3cyB3aWxsIHlvdSBhc2sgZWFjaCBzdHVkZW50IHRvIGNvbnRyaWJ1dGUgZHVyaW5nIHRoZSBjb3Vyc2U/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzXCJcbiAgICB0aXRsZTogJ1N1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMnXG4gICAgZm9ybVRpdGxlOiAnQ2hvb3NlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgKG9wdGlvbmFsKTonXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICBpbnN0cnVjdGlvbnM6IFwiQnkgdGhlIHRpbWUgc3R1ZGVudHMgaGF2ZSBtYWRlIGltcHJvdmVtZW50cyBiYXNlZCBvbiBjbGFzc21hdGVzJyBjb21tZW50c+KAlGFuZCBpZGVhbGx5IHN1Z2dlc3Rpb25zIGZyb20geW91IGFzIHdlbGzigJR0aGV5IHNob3VsZCBoYXZlIHByb2R1Y2VkIG5lYXJseSBjb21wbGV0ZSBhcnRpY2xlcy4gTm93IGlzIHRoZSBjaGFuY2UgdG8gZW5jb3VyYWdlIHRoZW0gdG8gd2FkZSBhIGxpdHRsZSBkZWVwZXIgaW50byBXaWtpcGVkaWEgYW5kIGl0cyBub3JtcyBhbmQgY3JpdGVyaWEgdG8gY3JlYXRlIGdyZWF0IGNvbnRlbnQuIFlvdeKAmWxsIHByb2JhYmx5IGhhdmUgZGlzY3Vzc2VkIG1hbnkgb2YgdGhlIGNvcmUgcHJpbmNpcGxlcyBvZiBXaWtpcGVkaWHigJRhbmQgcmVsYXRlZCBpc3N1ZXMgeW91IHdhbnQgdG8gZm9jdXMgb27igJRidXQgbm93IHRoYXQgdGhleeKAmXZlIGV4cGVyaWVuY2VkIGZpcnN0LWhhbmQgaG93IFdpa2lwZWRpYSB3b3JrcywgdGhpcyBpcyBhIGdvb2QgdGltZSB0byByZXR1cm4gdG8gdG9waWNzIGxpa2UgbmV1dHJhbGl0eSwgbWVkaWEgZmx1ZW5jeSwgYW5kIHRoZSBpbXBhY3RzIGFuZCBsaW1pdHMgb2YgV2lraXBlZGlhLiBDb25zaWRlciBicmluZ2luZyBpbiBhIGd1ZXN0IHNwZWFrZXIsIGhhdmluZyBhIHBhbmVsIGRpc2N1c3Npb24sIG9yIHNpbXBseSBoYXZpbmcgYW4gb3BlbiBkaXNjdXNzaW9uIGluIGNsYXNzIGFib3V0IHdoYXQgdGhlIHN0dWRlbnRzIGhhdmUgZG9uZSBzbyBmYXIgYW5kIHdoeSAob3Igd2hldGhlcikgaXQgbWF0dGVycy5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICBcIjxwPkluIGFkZGl0aW9uIHRvIHRoZSBXaWtpcGVkaWEgYXJ0aWNsZSB3cml0aW5nIGl0c2VsZiwgeW91IG1heSB3YW50IHRvIHVzZSBhIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudC4gVGhlc2UgYXNzaWdubWVudHMgY2FuIHJlaW5mb3JjZSBhbmQgZGVlcGVuIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgb3V0Y29tZXMsIGFuZCBhbHNvIGhlbHAgeW91IHRvIHVuZGVyc3RhbmQgYW5kIGV2YWx1YXRlIHRoZSBzdHVkZW50cycgd29yayBhbmQgbGVhcm5pbmcgb3V0Y29tZXMuIEhlcmUgYXJlIHNvbWUgb2YgdGhlIGVmZmVjdGl2ZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzIHRoYXQgaW5zdHJ1Y3RvcnMgb2Z0ZW4gdXNlLiBTY3JvbGwgb3ZlciBlYWNoIGZvciBtb3JlIGluZm9ybWF0aW9uLCBhbmQgc2VsZWN0IGFueSB0aGF0IHlvdSB3aXNoIHRvIHVzZSBmb3IgeW91ciBjb3Vyc2UuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gICMge1xuICAjICAgaWQ6IFwiZHlrX2dhXCJcbiAgIyAgIHRpdGxlOiAnRFlLIGFuZCBHb29kIEFydGljbGUnXG4gICMgICBpbmZvVGl0bGU6ICdBYm91dCBEWUsgYW5kIEdvb2QgQXJ0aWNsZSBwcm9jZXNzZXMnXG4gICMgICBmb3JtVGl0bGU6IFwiV291bGQgeW91IGxpa2UgdG8gaW5jbHVkZSB0aGVzZSBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgIyAgIHNlY3Rpb25zOiBbXG4gICMgICAgIHtcbiAgIyAgICAgICB0aXRsZTogJydcbiAgIyAgICAgICBjb250ZW50OiBbXG4gICMgICAgICAgICBcIjxwPkFkdmFuY2VkIHN0dWRlbnRz4oCZIGFydGljbGVzIG1heSBxdWFsaWZ5IGZvciBzdWJtaXNzaW9uIHRvIERpZCBZb3UgS25vdyAoRFlLKSwgYSBzZWN0aW9uIG9uIFdpa2lwZWRpYeKAmXMgbWFpbiBwYWdlIGZlYXR1cmluZyBuZXcgY29udGVudC4gVGhlIGdlbmVyYWwgY3JpdGVyaWEgZm9yIERZSyBlbGlnaWJpbGl0eSBhcmUgdGhhdCBhbiBhcnRpY2xlIGlzIGxhcmdlciB0aGFuIDEsNTAwIGNoYXJhY3RlcnMgb2Ygb3JpZ2luYWwsIHdlbGwtc291cmNlZCBjb250ZW50IChhYm91dCBmb3VyIHBhcmFncmFwaHMpIGFuZCB0aGF0IGl0IGhhcyBiZWVuIGNyZWF0ZWQgb3IgZXhwYW5kZWQgKGJ5IGEgZmFjdG9yIG9mIDV4KSB3aXRoaW4gdGhlIGxhc3Qgc2V2ZW4gZGF5cy48L3A+XCJcbiAgIyAgICAgICAgIFwiPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYnV0IGl0IGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICMgICAgICAgICBcIjxwPldlIHN0cm9uZ2x5IHJlY29tbWVuZCB0cnlpbmcgZm9yIERZSyBzdGF0dXMgeW91cnNlbGYgYmVmb3JlaGFuZCwgb3Igd29ya2luZyB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW5zIHRvIGhlbHAgeW91ciBzdHVkZW50cyBuYXZpZ2F0ZSB0aGUgRFlLIHByb2Nlc3Mgc21vb3RobHkuIElmIHlvdXIgc3R1ZGVudHMgYXJlIHdvcmtpbmcgb24gYSByZWxhdGVkIHNldCBvZiBhcnRpY2xlcywgaXQgY2FuIGhlbHAgdG8gY29tYmluZSBtdWx0aXBsZSBhcnRpY2xlIG5vbWluYXRpb25zIGludG8gYSBzaW5nbGUgaG9vazsgdGhpcyBoZWxwcyBrZWVwIHlvdXIgc3R1ZGVudHPigJkgd29yayBmcm9tIHN3YW1waW5nIHRoZSBwcm9jZXNzIG9yIGFudGFnb25pemluZyB0aGUgZWRpdG9ycyB3aG8gbWFpbnRhaW4gaXQuPC9wPlwiXG4gICMgICAgICAgICBcIjxwPldlbGwtZGV2ZWxvcGVkIGFydGljbGVzIHRoYXQgaGF2ZSBwYXNzZWQgYSBHb29kIEFydGljbGUgKEdBKSByZXZpZXcgYXJlIGEgc3Vic3RhbnRpYWwgYWNoaWV2ZW1lbnQgaW4gdGhlaXIgb3duIHJpZ2h0LCBhbmQgY2FuIGFsc28gcXVhbGlmeSBmb3IgRFlLLiBUaGlzIHBlZXIgcmV2aWV3IHByb2Nlc3MgaW52b2x2ZXMgY2hlY2tpbmcgYSBwb2xpc2hlZCBhcnRpY2xlIGFnYWluc3QgV2lraXBlZGlhJ3MgR0EgY3JpdGVyaWE6IGFydGljbGVzIG11c3QgYmUgd2VsbC13cml0dGVuLCB2ZXJpZmlhYmxlIGFuZCB3ZWxsLXNvdXJjZWQgd2l0aCBubyBvcmlnaW5hbCByZXNlYXJjaCwgYnJvYWQgaW4gY292ZXJhZ2UsIG5ldXRyYWwsIHN0YWJsZSwgYW5kIGFwcHJvcHJpYXRlbHkgaWxsdXN0cmF0ZWQgKHdoZW4gcG9zc2libGUpLiBQcmFjdGljYWxseSBzcGVha2luZywgYSBwb3RlbnRpYWwgR29vZCBBcnRpY2xlIHNob3VsZCBsb29rIGFuZCBzb3VuZCBsaWtlIG90aGVyIHdlbGwtZGV2ZWxvcGVkIFdpa2lwZWRpYSBhcnRpY2xlcywgYW5kIGl0IHNob3VsZCBwcm92aWRlIGEgc29saWQsIHdlbGwtYmFsYW5jZWQgdHJlYXRtZW50IG9mIGl0cyBzdWJqZWN0LjwvcD5cIlxuICAjICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSBnb29kLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMuPC9wPlwiXG4gICMgICAgICAgXVxuICAjICAgICB9XG4gICMgICBdXG4gICMgICBpbnB1dHM6IFtdXG4gICMgfVxuICB7XG4gICAgaWQ6IFwiZHlrXCJcbiAgICB0aXRsZTogJ0RZSyBwcm9jZXNzJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IERZSyBwcm9jZXNzJ1xuICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIERZSyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+QWR2YW5jZWQgc3R1ZGVudHPigJkgYXJ0aWNsZXMgbWF5IHF1YWxpZnkgZm9yIHN1Ym1pc3Npb24gdG8gRGlkIFlvdSBLbm93IChEWUspLCBhIHNlY3Rpb24gb24gV2lraXBlZGlh4oCZcyBtYWluIHBhZ2UgZmVhdHVyaW5nIG5ldyBjb250ZW50LiBUaGUgZ2VuZXJhbCBjcml0ZXJpYSBmb3IgRFlLIGVsaWdpYmlsaXR5IGFyZSB0aGF0IGFuIGFydGljbGUgaXMgbGFyZ2VyIHRoYW4gMSw1MDAgY2hhcmFjdGVycyBvZiBvcmlnaW5hbCwgd2VsbC1zb3VyY2VkIGNvbnRlbnQgKGFib3V0IGZvdXIgcGFyYWdyYXBocykgYW5kIHRoYXQgaXQgaGFzIGJlZW4gY3JlYXRlZCBvciBleHBhbmRlZCAoYnkgYSBmYWN0b3Igb2YgNXgpIHdpdGhpbiB0aGUgbGFzdCBzZXZlbiBkYXlzLjwvcD5cIlxuICAgICAgICAgIFwiPHA+VGhlIHNob3J0IHdpbmRvdyBvZiBlbGlnaWJpbGl0eSwgYW5kIHRoZSBzdHJpY3QgcnVsZXMgb2YgdGhlIG5vbWluYXRpb24gcHJvY2VzcywgY2FuIG1ha2UgaXQgY2hhbGxlbmdpbmcgdG8gaW5jb3Jwb3JhdGUgRFlLIGludG8gYSBjbGFzc3Jvb20gcHJvamVjdC4gVGhlIERZSyBwcm9jZXNzIHNob3VsZCBub3QgYmUgYSByZXF1aXJlZCBwYXJ0IG9mIHlvdXIgYXNzaWdubWVudCwgYnV0IGl0IGNhbiBiZSBhIGdyZWF0IG9wcG9ydHVuaXR5IHRvIGdldCBzdHVkZW50cyBleGNpdGVkIGFib3V0IHRoZWlyIHdvcmsuIEEgdHlwaWNhbCBEWUsgYXJ0aWNsZSB3aWxsIGJlIHZpZXdlZCBodW5kcmVkcyBvciB0aG91c2FuZHMgb2YgdGltZXMgZHVyaW5nIGl0cyA2IGhvdXJzIGluIHRoZSBzcG90bGlnaHQuPC9wPlwiXG4gICAgICAgICAgXCI8cD5XZSBzdHJvbmdseSByZWNvbW1lbmQgdHJ5aW5nIGZvciBEWUsgc3RhdHVzIHlvdXJzZWxmIGJlZm9yZWhhbmQsIG9yIHdvcmtpbmcgd2l0aCBleHBlcmllbmNlZCBXaWtpcGVkaWFucyB0byBoZWxwIHlvdXIgc3R1ZGVudHMgbmF2aWdhdGUgdGhlIERZSyBwcm9jZXNzIHNtb290aGx5LiBJZiB5b3VyIHN0dWRlbnRzIGFyZSB3b3JraW5nIG9uIGEgcmVsYXRlZCBzZXQgb2YgYXJ0aWNsZXMsIGl0IGNhbiBoZWxwIHRvIGNvbWJpbmUgbXVsdGlwbGUgYXJ0aWNsZSBub21pbmF0aW9ucyBpbnRvIGEgc2luZ2xlIGhvb2s7IHRoaXMgaGVscHMga2VlcCB5b3VyIHN0dWRlbnRz4oCZIHdvcmsgZnJvbSBzd2FtcGluZyB0aGUgcHJvY2VzcyBvciBhbnRhZ29uaXppbmcgdGhlIGVkaXRvcnMgd2hvIG1haW50YWluIGl0LjwvcD5cIlxuICAgICAgICAgIFxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZ2FcIlxuICAgIHRpdGxlOiAnR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgR29vZCBBcnRpY2xlIHByb2Nlc3MnXG4gICAgZm9ybVRpdGxlOiBcIldvdWxkIHlvdSBsaWtlIHRvIGluY2x1ZGUgdGhpcyBhcyBhbiB1bmdyYWRlZCBvcHRpb24/XCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+V2VsbC1kZXZlbG9wZWQgYXJ0aWNsZXMgdGhhdCBoYXZlIHBhc3NlZCBhIEdvb2QgQXJ0aWNsZSAoR0EpIHJldmlldyBhcmUgYSBzdWJzdGFudGlhbCBhY2hpZXZlbWVudCBpbiB0aGVpciBvd24gcmlnaHQsIGFuZCBjYW4gYWxzbyBxdWFsaWZ5IGZvciBEWUsuIFRoaXMgcGVlciByZXZpZXcgcHJvY2VzcyBpbnZvbHZlcyBjaGVja2luZyBhIHBvbGlzaGVkIGFydGljbGUgYWdhaW5zdCBXaWtpcGVkaWEncyBHQSBjcml0ZXJpYTogYXJ0aWNsZXMgbXVzdCBiZSB3ZWxsLXdyaXR0ZW4sIHZlcmlmaWFibGUgYW5kIHdlbGwtc291cmNlZCB3aXRoIG5vIG9yaWdpbmFsIHJlc2VhcmNoLCBicm9hZCBpbiBjb3ZlcmFnZSwgbmV1dHJhbCwgc3RhYmxlLCBhbmQgYXBwcm9wcmlhdGVseSBpbGx1c3RyYXRlZCAod2hlbiBwb3NzaWJsZSkuIFByYWN0aWNhbGx5IHNwZWFraW5nLCBhIHBvdGVudGlhbCBHb29kIEFydGljbGUgc2hvdWxkIGxvb2sgYW5kIHNvdW5kIGxpa2Ugb3RoZXIgd2VsbC1kZXZlbG9wZWQgV2lraXBlZGlhIGFydGljbGVzLCBhbmQgaXQgc2hvdWxkIHByb3ZpZGUgYSBzb2xpZCwgd2VsbC1iYWxhbmNlZCB0cmVhdG1lbnQgb2YgaXRzIHN1YmplY3QuPC9wPlwiXG4gICAgICAgICAgXCI8cD5UaGUgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHByb2Nlc3MgZ2VuZXJhbGx5IHRha2VzIHNvbWUgdGltZSDigJQgYmV0d2VlbiBzZXZlcmFsIGRheXMgYW5kIHNldmVyYWwgd2Vla3MsIGRlcGVuZGluZyBvbiB0aGUgaW50ZXJlc3Qgb2YgcmV2aWV3ZXJzIGFuZCB0aGUgc2l6ZSBvZiB0aGUgcmV2aWV3IGJhY2tsb2cgaW4gdGhlIHN1YmplY3QgYXJlYSDigJQgYW5kIHNob3VsZCBvbmx5IGJlIHVuZGVydGFrZW4gZm9yIGFydGljbGVzIHRoYXQgYXJlIGFscmVhZHkgdmVyeSBnb29kLiBUeXBpY2FsbHksIHJldmlld2VycyB3aWxsIGlkZW50aWZ5IGZ1cnRoZXIgc3BlY2lmaWMgYXJlYXMgZm9yIGltcHJvdmVtZW50LCBhbmQgdGhlIGFydGljbGUgd2lsbCBiZSBwcm9tb3RlZCB0byBHb29kIEFydGljbGUgc3RhdHVzIGlmIGFsbCB0aGUgcmV2aWV3ZXJzJyBjb25jZXJucyBhcmUgYWRkcmVzc2VkLiBCZWNhdXNlIG9mIHRoZSB1bmNlcnRhaW4gdGltZWxpbmUgYW5kIHRoZSBmcmVxdWVudCBuZWVkIHRvIG1ha2Ugc3Vic3RhbnRpYWwgY2hhbmdlcyB0byBhcnRpY2xlcywgR29vZCBBcnRpY2xlIG5vbWluYXRpb25zIHVzdWFsbHkgb25seSBtYWtlIHNlbnNlIGZvciBhcnRpY2xlcyB0aGF0IHJlYWNoIGEgbWF0dXJlIHN0YXRlIHNldmVyYWwgd2Vla3MgYmVmb3JlIHRoZSBlbmQgb2YgdGVybSwgYW5kIHRob3NlIHdyaXR0ZW4gYnkgc3R1ZGVudCBlZGl0b3JzIHdobyBhcmUgYWxyZWFkeSBleHBlcmllbmNlZCwgc3Ryb25nIHdyaXRlcnMuPC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJncmFkaW5nXCJcbiAgICB0aXRsZTogJ0dyYWRpbmcnXG4gICAgZm9ybVRpdGxlOiBcIkhvdyB3aWxsIHN0dWRlbnRzJyBncmFkZXMgZm9yIGFzc2lnbm1lbnRzIGJlIGRldGVybWluZWQ/XCJcbiAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcsIGV0Yy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJvdmVydmlld1wiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgIGluZm9UaXRsZTogXCJBYm91dCB0aGUgY291cnNlXCJcbiAgICBmb3JtVGl0bGU6IFwiXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Ob3cgaXQncyB0aW1lIHRvIHdyaXRlIGEgc2hvcnQgZGVzY3JpcHRpb24gb2YgeW91ciBjb3Vyc2UgYW5kIGhvdyB0aGlzIFdpa2lwZWRpYSBhc3NpZ25tZW50IGZpdHMgaW50byBpdC4gVGhpcyB3aWxsIGFsbG93IG90aGVyIFdpa2lwZWRpYSBlZGl0b3JzIHRvIHVuZGVyc3RhbmQgd2hhdCBzdHVkZW50cyB3aWxsIGJlIGRvaW5nLiBCZSBzdXJlIHRvIG1lbnRpb246XCJcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT50b3BpY3MgeW91J3JlIGNvdmVyaW5nIGluIHRoZSBjbGFzczwvbGk+XG4gICAgICAgICAgICA8bGk+d2hhdCBzdHVkZW50cyB3aWxsIGJlIGFza2VkIHRvIGRvIG9uIFdpa2lwZWRpYTwvbGk+XG4gICAgICAgICAgICA8bGk+d2hhdCB0eXBlcyBvZiBhcnRpY2xlcyB5b3VyIGNsYXNzIHdpbGwgYmUgd29ya2luZyBvbjwvbGk+ICBcbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIFxuICAgICAge1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48dGV4dGFyZWEgaWQ9J3Nob3J0X2Rlc2NyaXB0aW9uJyByb3dzPScxNCcgc3R5bGU9J3dpZHRoOjEwMCU7YmFja2dyb3VuZC1jb2xvcjpyZ2JhKDI0MiwyNDIsMjQyLDEuMCk7Ym9yZGVyOjFweCBzb2xpZCByZ2JhKDIwMiwyMDIsMjAyLDEuMCk7cGFkZGluZzoxMHB4IDE1cHg7Zm9udC1zaXplOiAxNnB4O2xpbmUtaGVpZ2h0IDIzcHg7bGV0dGVyLXNwYWNpbmc6IDAuMjVweDsnPjwvdGV4dGFyZWE+PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPGRpdiBjbGFzcz0nc3RlcC1mb3JtLWRhdGVzJz48L2Rpdj5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD48YSBpZD0ncHVibGlzaCcgaHJlZj0nIycgY2xhc3M9J2J1dHRvbicgc3R5bGU9J2Rpc3BsYXk6aW5saW5lLWJsb2NrO3RleHQtYWxpZ246Y2VudGVyOyc+UHVibGlzaDwvYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAgXG5dXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ29udGVudCIsIldpemFyZENvdXJzZUluZm8gPSBcblxuICAjIFJFU0VBUkNIIEFORCBXUklURSBBIFdJS0lQRURJQSBBUlRJQ0xFXG4gIHJlc2VhcmNod3JpdGU6IFxuICAgIHRpdGxlOiBcIlJlc2VhcmNoIGFuZCB3cml0ZSBhIFdpa2lwZWRpYSBhcnRpY2xlXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJXb3JraW5nIGluZGl2aWR1YWxseSBvciBpbiBzbWFsbCB0ZWFtcyB3aXRoIHlvdXIgZ3VpZGFuY2UsIHN0dWRlbnRzIGNob29zZSBjb3Vyc2UtcmVsYXRlZCB0b3BpY3MgdGhhdCBhcmUgbm90IHdlbGwtY292ZXJlZCBvbiBXaWtpcGVkaWEuIEFmdGVyIGFzc2Vzc2luZyBXaWtpcGVkaWEncyBjb3ZlcmFnZSwgc3R1ZGVudHMgcmVzZWFyY2ggdG9waWNzIHRvIGZpbmQgaGlnaC1xdWFsaXR5IHNlY29uZGFyeSBzb3VyY2VzLCB0aGVuIHByb3Bvc2UgYW4gb3V0bGluZSBmb3IgaG93IHRoZSB0b3BpYyBvdWdodCB0byBiZSBjb3ZlcmVkLiBUaGV5IGRyYWZ0IHRoZWlyIGFydGljbGVzLCBnaXZlIGFuZCByZXNwb25kIHRvIHBlZXIgZmVlZGJhY2ssIHRha2UgdGhlaXIgd29yayBsaXZlIG9uIFdpa2lwZWRpYSwgYW5kIGtlZXAgaW1wcm92aW5nIHRoZWlyIGFydGljbGVzIHVudGlsIHRoZSBlbmQgb2YgdGhlIHRlcm0uIEFsb25nIHRoZSB3YXksIHN0dWRlbnRzIG1heSB3b3JrIHdpdGggZXhwZXJpZW5jZWQgV2lraXBlZGlhIGVkaXRvcnMgd2hvIGNhbiBvZmZlciBjcml0aWNhbCBmZWVkYmFjayBhbmQgaGVscCBtYWtlIHN1cmUgYXJ0aWNsZXMgbWVldCBXaWtpcGVkaWEncyBzdGFuZGFyZHMgYW5kIHN0eWxlIGNvbnZlbnRpb25zLiBTdHVkZW50cyB3aG8gZG8gZ3JlYXQgd29yayBtYXkgZXZlbiBoYXZlIHRoZWlyIGFydGljbGVzIGZlYXR1cmVkIG9uIFdpa2lwZWRpYSdzIG1haW4gcGFnZS4gU29saWQgYXJ0aWNsZXMgd2lsbCBoZWxwIGluZm9ybSB0aG91c2FuZHMgb2YgZnV0dXJlIHJlYWRlcnMgYWJvdXQgdGhlIHNlbGVjdGVkIHRvcGljLlwiXG4gICAgICBcIk9wdGlvbmFsbHksIHN0dWRlbnRzIG1heSBiZSBhc2tlZCB0byB3cml0ZSBhIHJlZmxlY3RpdmUgcGFwZXIgYWJvdXQgdGhlaXIgV2lraXBlZGlhIGV4cGVyaWVuY2UsIHByZXNlbnQgdGhlaXIgY29udHJpYnV0aW9ucyBpbiBjbGFzcywgb3IgZGV2ZWxvcCB0aGVpciBvd24gaWRlYXMgYW5kIGFyZ3VtZW50cyBhYm91dCB0aGVpciB0b3BpY3MgaW4gYSBzZXBhcmF0ZSBlc3NheS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjEyIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJHcmFkdWF0ZSBTdHVkZW50c1wiXG4gICAgICBcIkFkdmFuY2VkIHVuZGVyZ3JhZHVhdGVzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyBjb3Vyc2VzXCJcbiAgICAgIFwibGFyZ2Ugc3VydmV5IGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgU09VUkNFLUNFTlRFUkVEIEFERElUSU9OU1xuICBzb3VyY2VjZW50ZXJlZDogXG4gICAgdGl0bGU6IFwiU291cmNlLWNlbnRlcmVkIGFkZGl0aW9uc1wiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgcmVhZCBXaWtpcGVkaWEgYXJ0aWNsZXMgaW4gYSBzZWxmLXNlbGVjdGVkIHN1YmplY3QgYXJlYSB0byBpZGVudGlmeSBhcnRpY2xlcyBpbiBuZWVkIG9mIHJldmlzaW9uIG9yIGltcHJvdmVtZW50LCBzdWNoIGFzIHRob3NlIHdpdGggXFxcImNpdGF0aW9uIG5lZWRlZFxcXCIgdGFncy4gU3R1ZGVudHMgd2lsbCBmaW5kIHJlbGlhYmxlIHNvdXJjZXMgdG8gdXNlIGFzIHJlZmVyZW5jZXMgZm9yIHVuY2l0ZWQgY29udGVudC4gVGhpcyBhc3NpZ25tZW50IGluY2x1ZGVzIGEgcGVyc3Vhc2l2ZSBlc3NheSBpbiB3aGljaCBzdHVkZW50cyBtYWtlIGEgY2FzZSBmb3IgdGhlaXIgc3VnZ2VzdGVkIGNoYW5nZXMsIHdoeSB0aGV5IGJlbGlldmUgdGhleSBhcmUgcXVhbGlmaWVkIHRvIG1ha2UgdGhvc2UgY2hhbmdlcywgYW5kIHdoeSB0aGVpciBzZWxlY3RlZCBzb3VyY2VzIHByb3ZpZGUgc3VwcG9ydC4gQWZ0ZXIgbWFraW5nIHRoZWlyIGNvbnRyaWJ1dGlvbnMsIHN0dWRlbnRzIHJlZmxlY3Qgb24gdGhlaXIgd29yayB3aXRoIGEgZm9ybWFsIHBhcGVyLCBhbmQgZGlzY3VzcyB3aGV0aGVyIHRoZXkndmUgYWNjb21wbGlzaGVkIHRoZWlyIHN0YXRlZCBnb2Fscy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhcmdlIGNsYXNzZXNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWR1YXRlc1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gKDEwMC1sZXZlbCkgY291cnNlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBGSU5EIEFORCBGSVggRVJST1JTXG4gIGZpbmRmaXg6IFxuICAgIHRpdGxlOiBcIkZpbmQgYW5kIGZpeCBlcnJvcnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIGFyZSBhc2tlZCB0byBmaW5kIGFuIGFydGljbGUgYWJvdXQgYSBjb3Vyc2UtcmVsYXRlZCB0b3BpYyB3aXRoIHdoaWNoIHRoZXkgYXJlIGV4dHJlbWVseSBmYW1pbGlhciB0aGF0IGhhcyBzb21lIG1pc3Rha2VzLiBTdHVkZW50cyB0YWtlIHdoYXQgdGhleSBrbm93IGFib3V0IHRoZSB0b3BpYywgZmluZCBmYWN0dWFsIGVycm9ycyBhbmQgb3RoZXIgc3Vic3RhbnRpdmUgbWlzdGFrZXMsIGFuZCBjb3JyZWN0IHRob3NlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI2IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiOCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiR3JhZHVhdGUgc3R1ZGVudHNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXG4gIHBsYWdpYXJpc206IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgc2VhcmNoIHRocm91Z2ggV2lraXBlZGlhIGFydGljbGVzIHRvIGZpbmQgaW5zdGFuY2VzIG9mIGNsb3NlIHBhcmFwaHJhc2luZyBvciBwbGFnaWFyaXNtLCB0aGVuIHJld29yZCB0aGUgaW5mb3JtYXRpb24gaW4gdGhlaXIgb3duIGxhbmd1YWdlIHRvIGJlIGFwcHJvcHJpYXRlIGZvciBXaWtpcGVkaWEuIEluIHRoaXMgYXNzaWdubWVudCwgc3R1ZGVudHMgZ2FpbiBhIGRlZXBlciB1bmRlcnN0YW5kaW5nIG9mIHdoYXQgcGxhZ2lhcmlzbSBpcyBhbmQgaG93IHRvIGF2b2lkIGl0LlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJUQkRcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICNUUkFOU0xBVEUgQU4gQVJUSUNMRSBUTyBFTkdMSVNIXG4gIHRyYW5zbGF0ZTogXG4gICAgdGl0bGU6IFwiSWRlbnRpZnkgYW5kIGZpeCBjbG9zZSBwYXJhcGhyYXNpbmcgLyBwbGFnaWFyaXNtXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJUaGlzIGlzIGEgcHJhY3RpY2FsIGFzc2lnbm1lbnQgZm9yIGxhbmd1YWdlIGluc3RydWN0b3JzLiBTdHVkZW50cyBzZWxlY3QgYSBXaWtpcGVkaWEgYXJ0aWNsZSBpbiB0aGUgbGFuZ3VhZ2UgdGhleSBhcmUgc3R1ZHlpbmcsIGFuZCB0cmFuc2xhdGUgaXQgaW50byB0aGVpciBuYXRpdmUgbGFuZ3VhZ2UuIFN0dWRlbnRzIHNob3VsZCBzdGFydCB3aXRoIGhpZ2gtcXVhbGl0eSBhcnRpY2xlcyB3aGljaCBhcmUgbm90IGF2YWlsYWJsZSBpbiB0aGVpciBuYXRpdmUgbGFuZ3VhZ2UuIFRoaXMgYXNzaWdubWVudCBwcm92aWRlcyBwcmFjdGljYWwgdHJhbnNsYXRpb24gYWR2aWNlIHdpdGggdGhlIGluY2VudGl2ZSBvZiByZWFsIHB1YmxpYyBzZXJ2aWNlLCBhcyBzdHVkZW50cyBleHBhbmQgdGhlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSB0YXJnZXQgY3VsdHVyZSBvbiBXaWtpcGVkaWEuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjQgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI2KyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiTGFuZ3VhZ2UgY291cnNlc1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgdHJhbnNsYXRpbmcgPGVtPmZyb208L2VtPiB0aGVpciBuYXRpdmUgbGFuZ3VhZ2UgdG8gdGhlIGxhbmd1YWdlIHRoZXkncmUgc3R1ZHlpbmdcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICNDT1BZIEVESVRJTkdcbiAgY29weWVkaXQ6IFxuICAgIHRpdGxlOiBcIkNvcHllZGl0XCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gY29weWVkaXQgV2lraXBlZGlhIGFydGljbGVzLCBlbmdhZ2luZyBlZGl0b3JzIGluIGNvbnZlcnNhdGlvbiBhYm91dCB0aGVpciB3cml0aW5nIGFuZCBpbXByb3ZpbmcgdGhlIGNsYXJpdHkgb2YgdGhlIGxhbmd1YWdlIG9mIHRoZSBtYXRlcmlhbC4gU3R1ZGVudHMgbGVhcm4gdG8gd3JpdGUgaW4gZGlmZmVyZW50IHZvaWNlcyBmb3IgZGlmZmVyZW50IGF1ZGllbmNlcy4gSW4gbGVhcm5pbmcgYWJvdXQgdGhlIHNwZWNpZmljIHZvaWNlIG9uIFdpa2lwZWRpYSwgdGhleSBsZWFybiBhYm91dCB0aGUg4oCcYXV0aG9yaXRhdGl2ZeKAnSB2b2ljZSBhbmQgaG93IGl0cyB0b25lIGNhbiBjb252aW5jZSwgZXZlbiBpZiB0aGUgY29udGVudCBpcyBxdWVzdGlvbmFibGUuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjIgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJFbmdsaXNoIGdyYW1tYXIgY291cnNlc1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBzdHJvbmcgd3JpdGluZyBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICNFVkFMVUFURSBBUlRJQ0xFU1xuICBldmFsdWF0ZTogXG4gICAgdGl0bGU6IFwiRXZhbHVhdGUgYXJ0aWNsZXNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIkZpcnN0LCBzdHVkZW50cyB3cml0ZSBhIHJlcG9ydCBhbmFseXppbmcgdGhlIHN0YXRlIG9mIFdpa2lwZWRpYSBhcnRpY2xlcyBvbiBjb3Vyc2UtcmVsYXRlZCB0b3BpY3Mgd2l0aCBhbiBleWUgdG93YXJkIGZ1dHVyZSByZXZpc2lvbnMuIFRoaXMgZW5jb3VyYWdlcyBhIGNyaXRpY2FsIHJlYWRpbmcgb2YgYm90aCBjb250ZW50IGFuZCBmb3JtLiBUaGVuLCB0aGUgc3R1ZGVudHMgZWRpdCBhcnRpY2xlcyBpbiBzYW5kYm94ZXMgd2l0aCBmZWVkYmFjayBmcm9tIHRoZSBwcm9mZXNzb3IsIGNhcmVmdWxseSBzZWxlY3RpbmcgYW5kIGFkZGluZyByZWZlcmVuY2VzIHRvIGltcHJvdmUgdGhlIGFydGljbGUgYmFzZWQgb24gdGhlaXIgY3JpdGljYWwgZXNzYXlzLiBGaW5hbGx5LCB0aGV5IGNvbXBvc2UgYSBzZWxmLWFzc2Vzc21lbnQgZXZhbHVhdGluZyB0aGVpciBvd24gY29udHJpYnV0aW9ucy5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNSB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkNsYXNzZXMgd2l0aCBmZXdlciB0aGFuIDMwIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJMYXJnZSBzdXJ2ZXkgY2xhc3Nlc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDNcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cbiAgIyBBREQgSU1BR0VTIE9SIE1VTFRJTUVESUFcbiAgbXVsdGltZWRpYTogXG4gICAgdGl0bGU6IFwiIEFkZCBpbWFnZXMgb3IgbXVsdGltZWRpYVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiSWYgeW91ciBzdHVkZW50cyBhcmUgYWRlcHQgYXQgbWVkaWEsIHRoaXMgY2FuIGJlIGEgZ3JlYXQgd2F5IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEgaW4gYSBub24tdGV4dHVhbCB3YXkuIEluIHRoZSBwYXN0LCBzdHVkZW50cyBoYXZlIHBob3RvZ3JhcGhlZCBsb2NhbCBtb251bWVudHMgdG8gaWxsdXN0cmF0ZSBhcnRpY2xlcywgZGVzaWduZWQgaW5mb2dyYXBoaWNzIHRvIGlsbHVzdHJhdGUgY29uY2VwdHMsIG9yIGNyZWF0ZWQgdmlkZW9zIHRoYXQgZGVtb25zdHJhdGVkIGF1ZGlvLXZpc3VhbGx5IHdoYXQgYXJ0aWNsZXMgZGVzY3JpYmUgaW4gd29yZHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjIgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIzIHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyBzdHVkeWluZyBwaG90b2dyYXBoeSwgdmlkZW9ncmFwaHksIG9yIGdyYXBoaWMgZGVzaWduXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJTdHVkZW50cyB3aXRob3V0IG1lZGlhIHNraWxsc1wiXG4gICAgXVxuICAgIGxlYXJuaW5nX29iamVjdGl2ZXM6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJNYXN0ZXIgY291cnNlIGNvbnRlbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIldyaXRpbmcgc2tpbGxzIGRldmVsb3BtZW50XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbmNyZWFzZSBtZWRpYSBhbmQgaW5mb3JtYXRpb24gZmx1ZW5jeVwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW1wcm92ZSBjcml0aWNhbCB0aGlua2luZyBhbmQgcmVzZWFyY2ggc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJGb3N0ZXIgY29sbGFib3JhdGlvblwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRGV2ZWxvcCB0ZWNobmljYWwgYW5kIGNvbW11bmljYXRpb24gc2tpbGxzXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICBdXG4gICAgXG5cblxubW9kdWxlLmV4cG9ydHMgPSBXaXphcmRDb3Vyc2VJbmZvIiwiV2l6YXJkU3RlcElucHV0cyA9XG5cblxuICBpbnRybzogXG4gICAgdGVhY2hlcjpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdJbnN0cnVjdG9yIG5hbWUnXG4gICAgICBpZDogJ3RlYWNoZXInXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBjb3Vyc2VfbmFtZTpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdDb3Vyc2UgbmFtZSdcbiAgICAgIGlkOiAnY291cnNlX25hbWUnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc2Nob29sOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICBpZDogJ3NjaG9vbCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBzdWJqZWN0OlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1N1YmplY3QnXG4gICAgICBpZDogJ3N1YmplY3QnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgXG4gICAgc3R1ZGVudHM6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnQXBwcm94aW1hdGUgbnVtYmVyIG9mIHN0dWRlbnRzJ1xuICAgICAgaWQ6ICdzdHVkZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGluc3RydWN0b3JfdXNlcm5hbWU6XG4gICAgICBsYWJlbDogJ1VzZXJuYW1lICh0ZW1wb3JhcnkpJ1xuICAgICAgaWQ6ICdpbnN0cnVjdG9yX3VzZXJuYW1lJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIHdpemFyZF9zdGFydF9kYXRlOlxuICAgICAgaXNEYXRlOiB0cnVlXG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB3aXphcmRfZW5kX2RhdGU6XG4gICAgICBpc0RhdGU6IHRydWVcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBcblxuICAgIGV2YWx1YXRlOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2V2YWx1YXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0V2YWx1YXRlIGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuICAgIFxuICAgIG11bHRpbWVkaWE6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnbXVsdGltZWRpYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBZGQgaW1hZ2VzICYgbXVsdGltZWRpYSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cblxuICAgIHNvdXJjZWNlbnRlcmVkOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3NvdXJjZWNlbnRlcmVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1NvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICBcblxuICAgIGNvcHllZGl0OiBcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cblxuICAgIGZpbmRmaXg6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZmluZGZpeCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdGaW5kIGFuZCBmaXggZXJyb3JzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuICAgIFxuICAgIHBsYWdpYXJpc206XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncGxhZ2lhcmlzbSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJZGVudGlmeSBhbmQgZml4IHBsYWdpYXJpc20nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgXG5cbiAgICBzb21ldGhpbmdfZWxzZTpcbiAgICAgIHR5cGU6ICdsaW5rJ1xuICAgICAgaHJlZjogJ21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJ1xuICAgICAgaWQ6ICdzb21ldGhpbmdfZWxzZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdBIGRpZmZlcmVudCBhc3NpZ25tZW50PyBHZXQgaW4gdG91Y2ggaGVyZS4nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiBmYWxzZVxuICAgICAgdGlwSW5mbzpcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFwiSGF2ZSBhbm90aGVyIGlkZWEgZm9yIGluY29ycG9yYXRpbmcgV2lraXBlZGlhIGludG8geW91ciBjbGFzcz8gV2UndmUgZm91bmQgdGhhdCB0aGVzZSBhc3NpZ25tZW50cyB3b3JrIHdlbGwsIGJ1dCB0aGV5IGFyZW4ndCB0aGUgb25seSB3YXkgdG8gZG8gaXQuIEdldCBpbiB0b3VjaCwgYW5kIHdlIGNhbiB0YWxrIHRoaW5ncyB0aHJvdWdoOiA8YSBzdHlsZT0nY29sb3I6IzUwNWE3ZjsnIGhyZWY9J21haWx0bzpjb250YWN0QHdpa2llZHUub3JnJz5jb250YWN0QHdpa2llZHUub3JnPC9hPlwiXG5cblxuICBsZWFybmluZ19lc3NlbnRpYWxzOiBcbiAgICBjcmVhdGVfdXNlcjpcbiAgICAgICMgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSB1c2VyIGFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBlbnJvbGw6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBjb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgIyB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgb25saW5lIHRyYWluaW5nJ1xuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICBpbnRyb2R1Y2VfYW1iYXNzYWRvcnM6XG4gICAgICAjIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaW50cm9kdWNlX2FtYmFzc2Fkb3JzJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICAgIFxuICAgICMgaW5jbHVkZV9jb21wbGV0aW9uOlxuICAgICMgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgIyAgIGlkOiAnaW5jbHVkZV9jb21wbGV0aW9uJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgbGFiZWw6ICdJbmNsdWRlIENvbXBsZXRpb24gb2YgdGhpcyBBc3NpZ25tZW50IGFzIFBhcnQgb2YgdGhlIFN0dWRlbnRzXFwncyBHcmFkZSdcbiAgICAjICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgdHJhaW5pbmdfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ncmFkZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiB0cmFpbmluZyB3aWxsIGJlIGdyYWRlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICB0cmFpbmluZ19ub3RfZ3JhZGVkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd0cmFpbmluZ19ub3RfZ3JhZGVkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgdHJhaW5pbmcgd2lsbCBub3QgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcblxuXG4gIGdldHRpbmdfc3RhcnRlZDogXG4gICAgY3JpdGlxdWVfYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY3JpdGlxdWVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyaXRpcXVlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuXG5cbiAgICBhZGRfdG9fYXJ0aWNsZTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnYWRkX3RvX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogdHJ1ZVxuICAgICAgbGFiZWw6ICdBZGQgdG8gYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cblxuICAgIGNvcHlfZWRpdF9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5X2VkaXRfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICBcbiAgICBpbGx1c3RyYXRlX2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2lsbHVzdHJhdGVfYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbGx1c3RyYXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICByZXF1aXJlZDogdHJ1ZVxuICBcblxuICBjaG9vc2luZ19hcnRpY2xlczogXG4gICAgcHJlcGFyZV9saXN0OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdwcmVwYXJlX2xpc3QnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBcbiAgICBzdHVkZW50c19leHBsb3JlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG5cbiAgICByZXF1ZXN0X2hlbHA6XG4gICAgICAjdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdyZXF1ZXN0X2hlbHAnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV291bGQgeW91IGxpa2UgaGVscCBzZWxlY3Rpbmcgb3IgZXZhdWxhdGluZyBhcnRpY2xlIGNob2ljZXM/J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBjb25kaXRpb25hbF9sYWJlbDogXG4gICAgICAgIHByZXBhcmVfbGlzdDogXCJXb3VsZCB5b3UgbGlrZSBoZWxwIHNlbGVjdGluZyBhcnRpY2xlcz9cIlxuICAgICAgICBzdHVkZW50c19leHBsb3JlOiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgZXZhbHVhdGluZyBzdHVkZW50IGNob2ljZXM/XCJcbiAgICAgIFxuXG5cbiAgcmVzZWFyY2hfcGxhbm5pbmc6IFxuICAgIGNyZWF0ZV9vdXRsaW5lOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdjcmVhdGVfb3V0bGluZSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdUcmFkaXRpb25hbCBvdXRsaW5lJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgIHRpcEluZm86IFxuICAgICAgICB0aXRsZTogXCJUcmFkaXRpb25hbCBvdXRsaW5lXCJcbiAgICAgICAgY29udGVudDogXCJGb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGFuIG91dGxpbmUgdGhhdCByZWZsZWN0cyB0aGUgaW1wcm92ZW1lbnRzIHRoZXkgcGxhbiB0byBtYWtlLCBhbmQgdGhlbiBwb3N0IGl0IHRvIHRoZSBhcnRpY2xlJ3MgdGFsayBwYWdlLiBUaGlzIGlzIGEgcmVsYXRpdmVseSBlYXN5IHdheSB0byBnZXQgc3RhcnRlZC5cIlxuICAgIFxuICAgIHdyaXRlX2xlYWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3dyaXRlX2xlYWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBsZWFkIHNlY3Rpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiV2lraXBlZGlhIGxlYWQgc2VjdGlvblwiXG4gICAgICAgIGNvbnRlbnQ6XG4gICAgICAgICAgXCI8cD5Gb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGEgd2VsbC1iYWxhbmNlZCBzdW1tYXJ5IG9mIGl0cyBmdXR1cmUgc3RhdGUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uLiBUaGUgaWRlYWwgbGVhZCBzZWN0aW9uIGV4ZW1wbGlmaWVzIFdpa2lwZWRpYSdzIHN1bW1hcnkgc3R5bGUgb2Ygd3JpdGluZzogaXQgYmVnaW5zIHdpdGggYSBzaW5nbGUgc2VudGVuY2UgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcGxhY2VzIGl0IGluIGNvbnRleHQsIGFuZCB0aGVuIOKAlCBpbiBvbmUgdG8gZm91ciBwYXJhZ3JhcGhzLCBkZXBlbmRpbmcgb24gdGhlIGFydGljbGUncyBzaXplIOKAlCBpdCBvZmZlcnMgYSBjb25jaXNlIHN1bW1hcnkgb2YgdG9waWMuIEEgZ29vZCBsZWFkIHNlY3Rpb24gc2hvdWxkIHJlZmxlY3QgdGhlIG1haW4gdG9waWNzIGFuZCBiYWxhbmNlIG9mIGNvdmVyYWdlIG92ZXIgdGhlIHdob2xlIGFydGljbGUuPC9wPlxuICAgICAgICAgIDxwPk91dGxpbmluZyBhbiBhcnRpY2xlIHRoaXMgd2F5IGlzIGEgbW9yZSBjaGFsbGVuZ2luZyBhc3NpZ25tZW50IOKAlCBhbmQgd2lsbCByZXF1aXJlIG1vcmUgd29yayB0byBldmFsdWF0ZSBhbmQgcHJvdmlkZSBmZWVkYmFjayBmb3IuIEhvd2V2ZXIsIGl0IGNhbiBiZSBtb3JlIGVmZmVjdGl2ZSBmb3IgdGVhY2hpbmcgdGhlIHByb2Nlc3Mgb2YgcmVzZWFyY2gsIHdyaXRpbmcsIGFuZCByZXZpc2lvbi4gU3R1ZGVudHMgd2lsbCByZXR1cm4gdG8gdGhpcyBsZWFkIHNlY3Rpb24gYXMgdGhleSBnbywgdG8gZ3VpZGUgdGhlaXIgd3JpdGluZyBhbmQgdG8gcmV2aXNlIGl0IHRvIHJlZmxlY3QgdGhlaXIgaW1wcm92ZWQgdW5kZXJzdGFuZGluZyBvZiB0aGUgdG9waWMgYXMgdGhlaXIgcmVzZWFyY2ggcHJvZ3Jlc3Nlcy4gVGhleSB3aWxsIHRhY2tsZSBXaWtpcGVkaWEncyBlbmN5Y2xvcGVkaWMgc3R5bGUgZWFybHkgb24sIGFuZCB0aGVpciBvdXRsaW5lIGVmZm9ydHMgd2lsbCBiZSBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZWlyIGZpbmFsIHdvcmsuPC9wPlwiXG4gICAgICAgIFxuXG5cbiAgZHJhZnRzX21haW5zcGFjZTogXG4gICAgd29ya19saXZlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBsaXZlIGZyb20gdGhlIHN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IHRydWVcbiAgICAgXG4gICAgc2FuZGJveDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAnc2FuZGJveCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEcmFmdCBlYXJseSB3b3JrIGluIHNhbmRib3hlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiB0cnVlXG4gICAgIFxuXG4gIHBlZXJfZmVlZGJhY2s6IFxuICAgIHBlZXJfcmV2aWV3czpcbiAgICAgIHR5cGU6ICdyYWRpb0dyb3VwJ1xuICAgICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgICBsYWJlbDogJydcbiAgICAgIHZhbHVlOiAndHdvJ1xuICAgICAgc2VsZWN0ZWQ6IDFcbiAgICAgIG92ZXJ2aWV3TGFiZWw6ICdUd28gcGVlciByZXZpZXcnXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMFxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICcxJ1xuICAgICAgICAgIHZhbHVlOiAnb25lJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdPbmUgcGVlciByZXZpZXcnXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAxXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzInXG4gICAgICAgICAgdmFsdWU6ICd0d28nXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgICBvdmVydmlld0xhYmVsOiAnVHdvIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMlxuICAgICAgICAgIG5hbWU6ICdwZWVyX3Jldmlld3MnXG4gICAgICAgICAgbGFiZWw6ICczJ1xuICAgICAgICAgIHZhbHVlOiAndGhyZWUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgICAgb3ZlcnZpZXdMYWJlbDogJ1RocmVlIHBlZXIgcmV2aWV3J1xuXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAzXG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzQnXG4gICAgICAgICAgdmFsdWU6ICdmb3VyJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdGb3VyIHBlZXIgcmV2aWV3J1xuXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiA0XG4gICAgICAgICAgbmFtZTogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzUnXG4gICAgICAgICAgdmFsdWU6ICdmaXZlJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICAgIG92ZXJ2aWV3TGFiZWw6ICdGaXZlIHBlZXIgcmV2aWV3J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgXG4gIFxuXG4gIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6IFxuICAgIGNsYXNzX2Jsb2c6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NsYXNzX2Jsb2cnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDbGFzcyBibG9nIG9yIGRpc2N1c3Npb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdDbGFzcyBibG9nIG9yIGNsYXNzIGRpc2N1c3Npb24nXG4gICAgICAgIGNvbnRlbnQ6ICdTdHVkZW50cyBrZWVwIGEgcnVubmluZyBibG9nIGFib3V0IHRoZWlyIGV4cGVyaWVuY2VzLiBHaXZpbmcgdGhlbSBwcm9tcHRzIGV2ZXJ5IHdlZWsgb3IgdHdvLCBzdWNoIGFzIOKAnFRvIHdoYXQgZXh0ZW50IGFyZSB0aGUgZWRpdG9ycyBvbiBXaWtpcGVkaWEgYSBzZWxmLXNlbGVjdGluZyBncm91cCBhbmQgd2h5P+KAnSB3aWxsIGhlbHAgdGhlbSB0aGluayBhYm91dCB0aGUgbGFyZ2VyIGlzc3VlcyBzdXJyb3VuZGluZyB0aGlzIG9ubGluZSBlbmN5Y2xvcGVkaWEgY29tbXVuaXR5LiBJdCB3aWxsIGFsc28gZ2l2ZSB5b3UgbWF0ZXJpYWwgYm90aCBvbiB0aGUgd2lraSBhbmQgb2ZmIHRoZSB3aWtpIHRvIGdyYWRlLiBJZiB5b3UgaGF2ZSB0aW1lIGluIGNsYXNzLCB0aGVzZSBkaXNjdXNzaW9ucyBjYW4gYmUgcGFydGljdWxhcmx5IGNvbnN0cnVjdGl2ZSBpbiBwZXJzb24uJ1xuICAgICAgXG4gICAgY2xhc3NfcHJlc2VudGF0aW9uOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIHJlcXVpcmVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdJbi1jbGFzcyBwcmVzZW50YXRpb25zJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgdGlwSW5mbzogIFxuICAgICAgICB0aXRsZTogJ0luLWNsYXNzIHByZXNlbnRhdGlvbiBvZiBXaWtpcGVkaWEgd29yaydcbiAgICAgICAgY29udGVudDogXCJFYWNoIHN0dWRlbnQgb3IgZ3JvdXAgcHJlcGFyZXMgYSBzaG9ydCBwcmVzZW50YXRpb24gZm9yIHRoZSBjbGFzcywgZXhwbGFpbmluZyB3aGF0IHRoZXkgd29ya2VkIG9uLCB3aGF0IHdlbnQgd2VsbCBhbmQgd2hhdCBkaWRuJ3QsIGFuZCB3aGF0IHRoZXkgbGVhcm5lZC4gVGhlc2UgcHJlc2VudGF0aW9ucyBjYW4gbWFrZSBleGNlbGxlbnQgZm9kZGVyIGZvciBjbGFzcyBkaXNjdXNzaW9ucyB0byByZWluZm9yY2UgeW91ciBjb3Vyc2UncyBsZWFybmluZyBnb2Fscy5cIlxuICAgICAgXG4gICAgcmVmbGVjdGl2ZV9lc3NheTpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVmbGVjdGl2ZV9lc3NheSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgICAgY29udGVudDogXCJBc2sgc3R1ZGVudHMgdG8gd3JpdGUgYSBzaG9ydCByZWZsZWN0aXZlIGVzc2F5IG9uIHRoZWlyIGV4cGVyaWVuY2VzIHVzaW5nIFdpa2lwZWRpYS4gVGhpcyB3b3JrcyB3ZWxsIGZvciBib3RoIHNob3J0IGFuZCBsb25nIFdpa2lwZWRpYSBwcm9qZWN0cy4gQW4gaW50ZXJlc3RpbmcgaXRlcmF0aW9uIG9mIHRoaXMgaXMgdG8gaGF2ZSBzdHVkZW50cyB3cml0ZSBhIHNob3J0IHZlcnNpb24gb2YgdGhlIGVzc2F5IGJlZm9yZSB0aGV5IGJlZ2luIGVkaXRpbmcgV2lraXBlZGlhLCBvdXRsaW5pbmcgdGhlaXIgZXhwZWN0YXRpb25zLCBhbmQgdGhlbiBoYXZlIHRoZW0gcmVmbGVjdCBvbiB3aGV0aGVyIG9yIG5vdCB0aGV5IG1ldCB0aG9zZSBleHBlY3RhdGlvbnMgZHVyaW5nIHRoZSBhc3NpZ25tZW50LlwiXG4gICAgICBcbiAgICBwb3J0Zm9saW86XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3BvcnRmb2xpbydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgICAgY29udGVudDogXCJTdHVkZW50cyBvcmdhbml6ZSB0aGVpciBXaWtpcGVkaWEgd29yayBpbnRvIGEgcG9ydGZvbGlvLCBpbmNsdWRpbmcgYSBuYXJyYXRpdmUgb2YgdGhlIGNvbnRyaWJ1dGlvbnMgdGhleSBtYWRlIOKAlCBhbmQgaG93IHRoZXkgd2VyZSByZWNlaXZlZCwgYW5kIHBvc3NpYmx5IGNoYW5nZWQsIGJ5IG90aGVyIFdpa2lwZWRpYW5zIOKAlCBhbmQgbGlua3MgdG8gdGhlaXIga2V5IGVkaXRzLiBDb21wb3NpbmcgdGhpcyBwb3J0Zm9saW8gd2lsbCBoZWxwIHN0dWRlbnRzIHRoaW5rIG1vcmUgZGVlcGx5IGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlcywgYW5kIGFsc28gcHJvdmlkZXMgYSBsZW5zIHRocm91Z2ggd2hpY2ggdG8gdW5kZXJzdGFuZCDigJQgYW5kIGdyYWRlIOKAlCB0aGVpciB3b3JrLlwiXG4gICAgXG4gICAgb3JpZ2luYWxfcGFwZXI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICByZXF1aXJlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdPcmlnaW5hbCBhbmFseXRpY2FsIHBhcGVyJ1xuICAgICAgICBjb250ZW50OiBcIkluIGNvdXJzZXMgdGhhdCBlbXBoYXNpemUgdHJhZGl0aW9uYWwgcmVzZWFyY2ggc2tpbGxzIGFuZCB0aGUgZGV2ZWxvcG1lbnQgb2Ygb3JpZ2luYWwgaWRlYXMgdGhyb3VnaCBhIHRlcm0gcGFwZXIsIFdpa2lwZWRpYSdzIHBvbGljeSBvZiBcXFwibm8gb3JpZ2luYWwgcmVzZWFyY2hcXFwiIG1heSBiZSB0b28gcmVzdHJpY3RpdmUuIE1hbnkgaW5zdHJ1Y3RvcnMgcGFpciBXaWtpcGVkaWEgd3JpdGluZyB3aXRoIGNvbXBsZW1lbnRhcnkgYW5hbHl0aWNhbCBwYXBlcjsgc3R1ZGVudHPigJkgV2lraXBlZGlhIGFydGljbGVzIGFzIGEgbGl0ZXJhdHVyZSByZXZpZXcsIGFuZCB0aGUgc3R1ZGVudHMgZ28gb24gdG8gZGV2ZWxvcCB0aGVpciBvd24gaWRlYXMgYW5kIGFyZ3VtZW50cyBpbiB0aGUgb2ZmbGluZSBhbmFseXRpY2FsIHBhcGVyLlwiXG4gICAgICBcbiAgICAjIG5vbmVfb2ZfYWJvdmU6XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdub25lX29mX2Fib3ZlJ1xuICAgICMgICBzZWxlY3RlZDogZmFsc2VcbiAgICAjICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgIyAgIGxhYmVsOiAnTm9uZSBvZiB0aGUgYWJvdmUnXG4gICAgIyAgIGV4Y2x1c2l2ZTogdHJ1ZVxuXG4gIGR5azpcbiAgICBkeWs6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2R5aydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RpZCBZb3UgS25vdz8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgZ2E6IFxuICAgIGdhOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdnYSdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgcmVxdWlyZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0dvb2QgQXJ0aWNsZSBub21pbmF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIFxuXG4gIGdyYWRpbmc6IFxuICAgICMgbGVhcm5pbmdfZXNzZW50aWFsczpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBlc3NlbnRpYWxzJ1xuICAgICMgICBpZDogJ2xlYXJuaW5nX2Vzc2VudGlhbHMnXG4gICAgIyAgIHZhbHVlOiA1XG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgXG4gICAgIyBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ0dldHRpbmcgc3RhcnRlZCB3aXRoIGVkaXRpbmcnXG4gICAgIyAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICMgICB2YWx1ZTogMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgIFxuICAgICMgY2hvb3NpbmdfYXJ0aWNsZXM6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICMgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICMgICB2YWx1ZTogMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgIFxuICAgICMgcmVzZWFyY2hfcGxhbm5pbmc6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ1Jlc2VhcmNoIGFuIHBsYW5uaW5nJ1xuICAgICMgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICMgICB2YWx1ZTogMCAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgXG4gICAgIyBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgbGFiZWw6ICdEcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICAjICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICMgICB2YWx1ZTogMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgIFxuICAgICMgcGVlcl9mZWVkYmFjazpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnUGVlciBmZWVkYmFjaydcbiAgICAjICAgaWQ6ICdwZWVyX2ZlZWRiYWNrJ1xuICAgICMgICB2YWx1ZTogMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgIFxuICAgICMgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAjICAgaWQ6ICdzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzJ1xuICAgICMgICB2YWx1ZTogMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuXG5cbiAgICAjIENPTVBST01JU0VcblxuICAgIGNvbXBsZXRlX3RyYWluaW5nOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0NvbXBsZXRpb24gb2YgV2lraXBlZGlhIHRyYWluaW5nJ1xuICAgICAgaWQ6ICdjb21wbGV0ZV90cmFpbmluZydcbiAgICAgIHZhbHVlOiA1XG4gICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIF1cblxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdFYXJseSBXaWtpcGVkaWEgZXhlcmNpc2VzJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogMCAgIFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgb3V0bGluZV9xdWFsaXR5OlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBpZDogJ291dGxpbmVfcXVhbGl0eSdcbiAgICAgIGxhYmVsOiAnUXVhbGl0eSBvZiBiaWJsaW9ncmFwaHkgYW5kIG91dGxpbmUnXG4gICAgICB2YWx1ZTogMiAgIFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgcGVlcl9yZXZpZXdzOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1BlZXIgcmV2aWV3cyBhbmQgY29sbGFib3JhdGlvbiB3aXRoIGNsYXNzbWF0ZXMnXG4gICAgICB2YWx1ZTogMiAgIFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgY29udHJpYnV0aW9uX3F1YWxpdHk6XG4gICAgICB0eXBlOiAncGVyY2VudCcgXG4gICAgICBpZDogJ2NvbnRyaWJ1dGlvbl9xdWFsaXR5J1xuICAgICAgbGFiZWw6ICdRdWFsaXR5IG9mIHlvdXIgbWFpbiBXaWtpcGVkaWEgY29udHJpYnV0aW9ucydcbiAgICAgIHZhbHVlOiAxMFxuICAgICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgIHR5cGU6ICdwZXJjZW50JyBcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiA1XG4gICAgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICAgY29udGluZ2VudFVwb246IFtcbiAgICAgICAgJ2NsYXNzX2Jsb2cnXG4gICAgICAgICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICAgICdyZWZsZWN0aXZlX2Vzc2F5J1xuICAgICAgICAncG9ydGZvbGlvJ1xuICAgICAgICAnb3JpZ2luYWxfcGFwZXInXG4gICAgICBdXG5cbiAgICAjRlVMTFxuXG4gICAgIyBjb21wbGV0ZV90cmFpbmluZzpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnQ29tcGxldGlvbiBvZiBXaWtpcGVkaWEgdHJhaW5pbmcnXG4gICAgIyAgIGlkOiAnY29tcGxldGVfdHJhaW5pbmcnXG4gICAgIyAgIHZhbHVlOiAxXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBwcmFjdGljZV9jb21tdW5pY2F0aW9uOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgbGFiZWw6ICdcIlByYWN0aWNlIG9uLXdpa2kgY29tbXVuaWNhdGlvblwiIGV4ZXJjaXNlJ1xuICAgICMgICBpZDogJ3ByYWN0aWNlX2NvbW11bmljYXRpb24nXG4gICAgIyAgIHZhbHVlOiAxICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIHByYWN0aWNlX2NvbW11bmljYXRpb246XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ1wiUHJhY3RpY2Ugb24td2lraSBjb21tdW5pY2F0aW9uXCIgZXhlcmNpc2UnXG4gICAgIyAgIGlkOiAncHJhY3RpY2VfY29tbXVuaWNhdGlvbidcbiAgICAjICAgdmFsdWU6IDEgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICMgY29weV9lZGl0X2FydGljbGU6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ1wiQ29weWVkaXQgYW4gYXJ0aWNsZVwiIGV4ZXJjaXNlJ1xuICAgICMgICBpZDogJ3ByYWN0aWNlX2NvbW11bmljYXRpb24nXG4gICAgIyAgIHZhbHVlOiAxICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGNyaXRpcXVlX2FydGljbGU6XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBsYWJlbDogJ1wiRXZhbHVhdGUgYW4gYXJ0aWNsZVwiIGV4ZXJjaXNlJ1xuICAgICMgICBpZDogJ2NyaXRpcXVlX2FydGljbGUnXG4gICAgIyAgIHZhbHVlOiAxICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGFkZF90b19hcnRpY2xlOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgbGFiZWw6ICdcIkFkZCB0byBhbiBhcnRpY2xlXCIgZXhlcmNpc2UnXG4gICAgIyAgIGlkOiAnYWRkX3RvX2FydGljbGUnXG4gICAgIyAgIHZhbHVlOiAxICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGlsbHVzdHJhdGVfYXJ0aWNsZTpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGxhYmVsOiAnXCJJbGx1c3RyYXRlIGFuIGFydGljbGVcIiBleGVyY2lzZSdcbiAgICAjICAgaWQ6ICdpbGx1c3RyYXRlX2FydGljbGUnXG4gICAgIyAgIHZhbHVlOiAxICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIG91dGxpbmVfcXVhbGl0eTpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGlkOiAnb3V0bGluZV9xdWFsaXR5J1xuICAgICMgICBsYWJlbDogJ1F1YWxpdHkgb2YgYmlibGlvZ3JhcGh5IGFuZCBvdXRsaW5lJ1xuICAgICMgICB2YWx1ZTogMiAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICMgcGVlcl9yZXZpZXdzOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgaWQ6ICdwZWVyX3Jldmlld3MnXG4gICAgIyAgIGxhYmVsOiAnUGVlciByZXZpZXdzIGFuZCBjb2xsYWJvcmF0aW9uIHdpdGggY2xhc3NtYXRlcydcbiAgICAjICAgdmFsdWU6IDIgICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGNsYXNzX3BhcnRpY2lwYXRpb246XG4gICAgIyAgIHR5cGU6ICdwZXJjZW50J1xuICAgICMgICBpZDogJ2NsYXNzX3BhcnRpY2lwYXRpb24nXG4gICAgIyAgIGxhYmVsOiAnUGFydGljaXBhdGlvbiBpbiBjbGFzcyBkaXNjdXNzaW9ucydcbiAgICAjICAgdmFsdWU6IDIgICBcbiAgICAjICAgcmVuZGVySW5PdXRwdXQ6IHRydWVcbiAgICAjICAgY29udGluZ2VudFVwb246IFtdXG5cbiAgICAjIGNvbnRyaWJ1dGlvbl9xdWFsaXR5OlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgaWQ6ICdjb250cmlidXRpb25fcXVhbGl0eSdcbiAgICAjICAgbGFiZWw6ICdRdWFsaXR5IG9mIHlvdXIgbWFpbiBXaWtpcGVkaWEgY29udHJpYnV0aW9ucydcbiAgICAjICAgdmFsdWU6IDEwICAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyByZWZsZWN0aXZlX2Vzc2F5OlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgaWQ6ICdyZWZsZWN0aXZlX2Vzc2F5J1xuICAgICMgICBsYWJlbDogJ1JlZmxlY3RpdmUgZXNzYXknXG4gICAgIyAgIHZhbHVlOiAyICAgXG4gICAgIyAgIHJlbmRlckluT3V0cHV0OiB0cnVlXG4gICAgIyAgIGNvbnRpbmdlbnRVcG9uOiBbXVxuXG4gICAgIyBvcmlnaW5hbF9wYXBlcjpcbiAgICAjICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgIyAgIGlkOiAnb3JpZ2luYWxfcGFwZXInXG4gICAgIyAgIGxhYmVsOiAnT3JpZ2luYWwgYXJndW1lbnQgcGFwZXInXG4gICAgIyAgIHZhbHVlOiAxMCAgIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgICMgY2xhc3NfcHJlc2VudGF0aW9uOlxuICAgICMgICB0eXBlOiAncGVyY2VudCdcbiAgICAjICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgIyAgIGxhYmVsOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9uIG9mIGNvbnRyaWJ1dGlvbnMnXG4gICAgIyAgIHZhbHVlOiAyIFxuICAgICMgICByZW5kZXJJbk91dHB1dDogdHJ1ZVxuICAgICMgICBjb250aW5nZW50VXBvbjogW11cblxuICAgIGdyYWRpbmdfc2VsZWN0aW9uOlxuICAgICAgbGFiZWw6ICdHcmFkaW5nIGJhc2VkIG9uOidcbiAgICAgIGlkOiAnZ3JhZGluZ19zZWxlY3Rpb24nXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHJlbmRlckluT3V0cHV0OiBmYWxzZVxuICAgICAgb3B0aW9uczogXG4gICAgICAgIHBlcmNlbnQ6IFxuICAgICAgICAgIGxhYmVsOiAnUGVyY2VudGFnZSdcbiAgICAgICAgICB2YWx1ZTogJ3BlcmNlbnQnXG4gICAgICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgICAgcG9pbnRzOlxuICAgICAgICAgIGxhYmVsOiAnUG9pbnRzJ1xuICAgICAgICAgIHZhbHVlOiAncG9pbnRzJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuXG5cbiAgb3ZlcnZpZXc6IFxuICAgIGxlYXJuaW5nX2Vzc2VudGlhbHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnTGVhcm5pbmcgV2lraSBlc3NlbnRpYWxzJ1xuICAgICAgaWQ6ICdsZWFybmluZ19lc3NlbnRpYWxzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuXG4gICAgY2hvb3NpbmdfYXJ0aWNsZXM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnQ2hvb3NpbmcgYXJ0aWNsZXMnXG4gICAgICBpZDogJ2Nob29zaW5nX2FydGljbGVzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBcblxuICAgIHJlc2VhcmNoX3BsYW5uaW5nOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1Jlc2VhcmNoIGFuZCBwbGFubmluZydcbiAgICAgIGlkOiAncmVzZWFyY2hfcGxhbm5pbmcnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIGRyYWZ0c19tYWluc3BhY2U6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnRHJhZnRzIGFuZCBtYWluc3BhY2UnXG4gICAgICBpZDogJ2RyYWZ0c19tYWluc3BhY2UnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIFxuICAgIFxuICAgIHBlZXJfZmVlZGJhY2s6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnUGVlciBGZWVkYmFjaydcbiAgICAgIGlkOiAncGVlcl9mZWVkYmFjaydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgXG4gICAgXG4gICAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgICAgaWQ6ICdzdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzJ1xuICAgICAgdmFsdWU6ICcnXG5cbiAgICB3aXphcmRfc3RhcnRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICAgIHdpemFyZF9lbmRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcblxuICAgIFxuXG5cblxuXG5cblxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkU3RlcElucHV0cyIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgVmlld0hlbHBlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoICdsaW5rJywgKCB0ZXh0LCB1cmwgKSAtPlxuXG4gIHRleHQgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHRleHQgKVxuICB1cmwgID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB1cmwgKVxuXG4gIHJlc3VsdCA9ICc8YSBocmVmPVwiJyArIHVybCArICdcIj4nICsgdGV4dCArICc8L2E+J1xuXG4gIHJldHVybiBuZXcgSGFuZGxlYmFycy5TYWZlU3RyaW5nKCByZXN1bHQgKVxuKVxuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCgnY291cnNlRGV0YWlscycsICdzdXAyJykiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIC0gQXBwbGljYXRpb24gSW5pdGl0aWFsaXplclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoJy4vQXBwJylcblxuXG4kIC0+XG4gIFxuICAjIEluaXRpYWxpemUgQXBwbGljYXRpb25cbiAgYXBwbGljYXRpb24uaW5pdGlhbGl6ZSgpXG5cbiAgIyBTdGFydCBCYWNrYm9uZSByb3V0ZXJcbiAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCgpXG5cblxuICAiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbk1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL3N1cGVycy9Nb2RlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE1vZGVsIGV4dGVuZHMgTW9kZWxcbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgTW9kZWwgQmFzZSBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIE1vZGVsIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIEVWRU5UIEhBTkRMRVJTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFdJS0lFRFUgQVNTSUdOTUVOVCAtIFJvdXRlclxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBSb3V0ZXIgZXh0ZW5kcyBCYWNrYm9uZS5Sb3V0ZXJcblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFJvdXRlc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgXG4gIHJvdXRlczpcbiAgICAnJyA6ICdob21lJ1xuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSGFuZGxlcnNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGhvbWU6IC0+XG4gICAgaWYgJCgnI2FwcCcpLmxlbmd0aCA+IDBcblxuICAgICAgQGN1cnJlbnRXaWtpVXNlciA9ICQoICcjYXBwJyApLmF0dHIoJ2RhdGEtd2lraXVzZXInKVxuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzWydpbnRybyddWydpbnN0cnVjdG9yX3VzZXJuYW1lJ11bJ3ZhbHVlJ10gPSBAY3VycmVudFdpa2lVc2VyXG5cbiAgICAgICQoICcjYXBwJyApLmh0bWwoYXBwbGljYXRpb24uaG9tZVZpZXcucmVuZGVyKCkuZWwpXG5cbiAgICAgIGlmIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXAnKVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsIEBnZXRQYXJhbWV0ZXJCeU5hbWUoJ3N0ZXAnKSlcblxuICAgICAgZWxzZSBpZiBAZ2V0UGFyYW1ldGVyQnlOYW1lKCdzdGVwaWQnKVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290b0lkJywgQGdldFBhcmFtZXRlckJ5TmFtZSgnc3RlcGlkJykpXG5cblxuICAgIGVsc2UgaWYgJCgnI2xvZ2luJykubGVuZ3RoID4gMFxuXG4gICAgICAoJCAnI2xvZ2luJykuaHRtbChhcHBsaWNhdGlvbi5sb2dpblZpZXcucmVuZGVyKCkuZWwpXG5cbiAgI1xuICAjIFV0aWxpdGllc1xuICAjXG5cbiAgZ2V0UGFyYW1ldGVyQnlOYW1lOiAobmFtZSkgLT5cblxuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIilcblxuICAgIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIilcblxuICAgIHJlc3VsdHMgPSByZWdleC5leGVjKGxvY2F0aW9uLnNlYXJjaClcblxuICAgIChpZiBub3QgcmVzdWx0cz8gdGhlbiBcIlwiIGVsc2UgZGVjb2RlVVJJQ29tcG9uZW50KHJlc3VsdHNbMV0ucmVwbGFjZSgvXFwrL2csIFwiIFwiKSkpXG5cblxuIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgXG5cblxuICByZXR1cm4gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSG9tZSBQYWdlIFRlbXBsYXRlXFxuLS0+XFxuXFxuPCEtLSBNQUlOIEFQUCBDT05URU5UIC0tPlxcbjxkaXYgY2xhc3M9XFxcImNvbnRlbnRcXFwiPlxcblxcblxcbiAgPCEtLSBTVEVQUyBNQUlOIENPTlRBSU5FUiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXBzXFxcIj48L2Rpdj48IS0tIGVuZCAuc3RlcHMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLmNvbnRlbnQgLS0+XFxuXFxuXCI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgICAgICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgICAgICAgPHAgY2xhc3M9XFxcImxhcmdlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubG9naW5faW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sb2dpbl9pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwIHN0ZXAtLWZpcnN0IHN0ZXAtLWxvZ2luXFxcIj5cXG4gICAgXFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtXFxcIj5cXG5cXG4gICAgICAgIDwhLS0gU1RFUCBGT1JNIEhFQURFUiAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcblxcbiAgICAgICAgICA8IS0tIFNURVAgVElUTEUgLS0+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFxcbiAgICAgICAgICA8IS0tIFNURVAgRk9STSBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0taGVhZGVyIC0tPlxcbiAgICAgICAgXFxuICAgICAgICA8IS0tIFNURVAgSU5TVFJVQ1RJT05TIC0tPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5sb2dpbl9pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgPCEtLSBlbmQgLnN0ZXAtZm9ybS1pbnN0cnVjdGlvbnMgLS0+XFxuXFxuXFxuXFxuXFxuICAgICAgICA8IS0tIEJFR0lOIEJVVFRPTiAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1hY3Rpb25zXFxcIj5cXG4gICAgICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWVcXFwiIGlkPVxcXCJsb2dpbkJ1dHRvblxcXCIgaHJlZj1cXFwiL2F1dGgvbWVkaWF3aWtpXFxcIj5cXG4gICAgICAgICAgICBMb2dpbiB3aXRoIFdpa2lwZWRpYVxcbiAgICAgICAgICA8L2E+XFxuXCJcbiAgICArIFwiXFxuICAgICAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWFjdGlvbnMgLS0+XFxuXFxuXFxuICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICA8ZGl2IGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcImRvdCBzdGVwLW5hdi1pbmRpY2F0b3JzX19pdGVtIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNBY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5oYXNWaXNpdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIiBkYXRhLW5hdi1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHRpdGxlPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RlcFRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwSWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBJZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPio8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcImFjdGl2ZVwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwidmlzaXRlZFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiaW5hY3RpdmVcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBuby1hcnJvdyBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBTdGVwIE5hdmlnYXRpb24gXFxuLS0+XFxuXFxuXFxuPCEtLSBTVEVQIE5BViBET1QgSU5ESUNBVE9SUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1pbmRpY2F0b3JzIGhpZGRlblxcXCI+XFxuXFxuICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuc3RlcHMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1uYXYtaW5kaWNhdG9ycyAtLT5cXG5cXG5cXG5cXG48IS0tIFNURVAgTkFWIEJVVFRPTlMgLS0+XFxuPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9uc1xcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zLS1ub3JtYWxcXFwiPlxcbiAgICA8YSBocmVmPVxcXCJcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1wcmV2IHByZXYgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5wcmV2SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJhcnJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1yaWdodDo1cHg7XFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1sZWZ0XFxcIj48L2Rpdj5cXG4gICAgICA8L3NwYW4+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5wcmV2VGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnByZXZUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+XFxuICAgIDwvYT5cXG5cXG4gICAgPGEgaHJlZj1cXFwiXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tbmV4dCBuZXh0IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubmV4dEluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNMYXN0U3RlcCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcXFwiPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJ0ZXh0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubmV4dFRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uZXh0VGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9zcGFuPlxcbiAgICAgIDxzcGFuIGNsYXNzPVxcXCJhcnJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1sZWZ0OjVweDtcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLXJpZ2h0XFxcIj48L2Rpdj5cXG4gICAgICA8L3NwYW4+XFxuICAgIDwvYT5cXG4gIDwvZGl2PlxcblxcblxcblxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYnV0dG9ucy0tZWRpdFxcXCI+XFxuICAgIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2X19idXR0b24tLWV4aXQtZWRpdCBjb25maXJtIGV4aXQtZWRpdFxcXCI+XFxuICAgICAgPHNwYW4gY2xhc3M9XFxcInRleHRcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5iYWNrVG9PdmVydmlld1RpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5iYWNrVG9PdmVydmlld1RpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvc3Bhbj5cXG4gICAgPC9hPlxcbiAgPC9kaXY+XFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtbmF2LWJ1dHRvbnMgLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm1fX3N1YnRpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW02KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogSW5kaXZpZGFsIFN0ZXAgVGVtcGxhdGVcXG4tLT5cXG5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgXFxuICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICBcXG4gIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuXFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5zdHJ1Y3Rpb25zXFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlY3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICA8L2Rpdj5cXG4gICA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG4gIDwhLS0gSU5UUk8gU1RFUCBGT1JNIEFSRUEgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taW5uZXJcXFwiPlxcbiAgICA8IS0tIGZvcm0gZmllbGRzIC0tPlxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1pbm5lciAtLT5cXG5cXG5cXG4gIDwhLS0gREFURVMgTU9EVUxFIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWRhdGVzXFxcIj5cXG5cXG4gIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0tZGF0ZXMgLS0+XFxuXFxuICA8IS0tIEJFR0lOIEJVVFRPTiAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1hY3Rpb25zXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwibm8tZWRpdC1tb2RlXFxcIj5cXG4gICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZSBpbmFjdGl2ZVxcXCIgaWQ9XFxcImJlZ2luQnV0dG9uXFxcIiBocmVmPVxcXCJcXFwiPlxcbiAgICAgICAgQmVnaW4gQXNzaWdubWVudCBXaXphcmRcXG4gICAgICA8L2E+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJlZGl0LW1vZGUtb25seVxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcImJ1dHRvbiBidXR0b24tLWJsdWUgZXhpdC1lZGl0XFxcIiBocmVmPVxcXCIjXFxcIj5cXG4gICAgICAgIEJhY2tcXG4gICAgICA8L2E+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1hY3Rpb25zIC0tPlxcblxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8aDMgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMz5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtLWNvbnRlbnRfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuZm9ybVRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5mb3JtVGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2g0PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrIHN0ZXAtaW5mb19fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbmZvVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluZm9UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwIGNsYXNzPVxcXCJsYXJnZSBzdGVwLWluZm9fX2ludHJvXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuYWNjb3JkaWFuLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgICAgXFxuICAgICAgICA8IS0tIElORk8gU0VDVElPTiBIRUFERVIgLS0+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTIsIHByb2dyYW0xMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIFxcbiAgICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gQ09OVEVOVCAtLT5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19jb250ZW50XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uX19jb250ZW50IC0tPlxcblxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbiAtLT5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHN0ZXAtaW5mby1zZWN0aW9uLS1hY2NvcmRpYW5cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2hlYWRlclxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9faGVhZGVyIC0tPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgICAgXFxuICAgICAgICAgICAgXCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCIgICAgXFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IE1haW4gSW5kaXZpZGFsIFN0ZXAgVGVtcGxhdGVcXG4tLT5cXG5cXG5cXG48IS0tIFNURVAgRk9STSA6IExlZnQgU2lkZSBvZiBTdGVwIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tbGF5b3V0XFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWxheW91dF9faW5uZXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1oZWFkZXJcXFwiPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvZGl2PlxcblxcbiAgICAgIFxcbiAgICAgIDwhLS0gU1RFUCBGT1JNIElOTkVSIENPTlRFTlQgLS0+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWNvbnRlbnRcXFwiPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5mb3JtVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbm5lclxcXCI+PC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG5cXG5cXG5cXG48IS0tIFNURVAgSU5GTyA6IFJpZ2h0IHNpZGUgb2Ygc3RlcCAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm9cXFwiPlxcbiAgPCEtLSBTVEVQIElORk8gVElQIFNFQ1RJT04gLS0+XFxuICA8IS0tIHVzZWQgZm9yIGJvdGggY291cnNlIGluZm8gYW5kIGdlbmVyaWMgaW5mbyAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBzXFxcIj48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLXRpcHMgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8taW5uZXJcXFwiPlxcbiAgICA8IS0tIFdJS0lFRFUgTE9HTyAtLT5cXG4gICAgPGEgY2xhc3M9XFxcIm1haW4tbG9nb1xcXCIgaHJlZj1cXFwiaHR0cDovL3dpa2llZHUub3JnXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgdGl0bGU9XFxcIndpa2llZHUub3JnXFxcIj5XSUtJRURVLk9SRzwvYT5cXG5cXG4gICAgPCEtLSBTVEVQIElORk8gSU5ORVIgLS0+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby13cmFwcGVyXFxcIj5cXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmluZm9UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5zdHJ1Y3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXFxuICAgICAgPCEtLSBJTkZPIFNFQ1RJT05TIC0tPlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zZWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLWlubmVyIC0tPlxcbiAgICBcXG5cXG5cXG4gICAgXFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLWlubmVyIC0tPlxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8gLS0+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPHA+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3A+XFxuICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICAgIDxsaSBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIHN0YWNrMSA9ICh0eXBlb2YgZGVwdGgwID09PSBmdW5jdGlvblR5cGUgPyBkZXB0aDAuYXBwbHkoZGVwdGgwKSA6IGRlcHRoMCk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2xpPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tZ3JpZFxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGV4dCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGV4dDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCIgOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuc3RhcnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0YXJzOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mbyBzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG48YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19pbm5lclxcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2sgXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QXNzaWdubWVudCB0eXBlOiBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190ZXh0XFxcIj5cXG4gICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5kZXNjcmlwdGlvbiwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvZGl2PlxcblxcbiAgICAgIFxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+TWluaW11bSB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubWluX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5taW5fdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlJlY29tbWVuZGVkIHRpbWVsaW5lPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XFxuICAgICAgICAgIFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5yZWNfdGltZWxpbmUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnJlY190aW1lbGluZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5CZXN0IGZvcjwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDx1bD5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmJlc3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk5vdCBhcHByb3ByaWF0ZSBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5ub3RfZm9yLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkxlYXJuaW5nIE9iamVjdGl2ZXM8L2gyPlxcbiAgICAgIDwvZGl2PlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5sZWFybmluZ19vYmplY3RpdmVzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb24sIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oMj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgICAgPHA+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmNvbnRlbnQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmNvbnRlbnQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwXFxcIiBkYXRhLWl0ZW0taW5kZXg9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cXG4gIFxcbiAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWluZm8tdGlwX19pbm5lclxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICBcXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiaW5mby1hcnJvd1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmRpc2FibGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg4LCBwcm9ncmFtOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcImNoZWNrLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY2hlY2tlZCBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBub3QtZWRpdGFibGUgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgZWRpdGFibGUgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgZGF0YS1leGNsdXNpdmU9XFxcInRydWVcXFwiIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJpbmZvLWFycm93XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1jaGVja2JveCBjdXN0b20taW5wdXQtLXJhZGlvYm94IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZXhjbHVzaXZlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDgsIHByb2dyYW04LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj48c3Bhbj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvc3Bhbj48L2xhYmVsPlxcbiAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgIC8+XFxuICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICA8ZGl2IGNsYXNzPVxcXCJpbmZvLWljb25cXFwiPjwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tdGV4dFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXRleHRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGlucHV0IGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50eXBlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHZhbHVlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcGVyY2VudFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXBlcmNlbnRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtY29udGFpbmVyXFxcIj5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaWNvblxcXCI+cG9pbnRzPC9kaXY+XFxuICAgIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG1heGxlbmd0aD1cXFwiMlxcXCIgLz5cXG4gICAgPC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdCBjdXN0b20taW5wdXQtYWNjb3JkaWFuXFxcIj5cXG4gIDxhIGNsYXNzPVxcXCJlZGl0LWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCIgZGF0YS1zdGVwLWlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+W2VkaXRdPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19pbm5lciBjdXN0b20taW5wdXQtYWNjb3JkaWFuX19oZWFkZXJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICBcXG4gIDwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS1lZGl0X19jb250ZW50IGN1c3RvbS1pbnB1dC1hY2NvcmRpYW5fX2NvbnRlbnRcXFwiPlxcbiAgICA8dWw+XFxuICAgICAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmFzc2lnbm1lbnRzLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTcsIHByb2dyYW0xNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgPC91bD5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8bGk+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKSlcbiAgICArIFwiPC9saT5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImluZm8tYXJyb3dcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWxpbmtcXFwiPlxcbiAgPGxhYmVsPjxhIGhyZWY9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5ocmVmKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiID5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvYT48L2xhYmVsPlxcbiAgPGRpdiBjbGFzcz1cXFwiaW5mby1pY29uXFxcIj48L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG4gIDwvZGl2PlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvXFxcIj5cXG4gICAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIi8+XFxuICAgICAgPGxhYmVsIGZvcj1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sYWJlbCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubGFiZWw7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuICAgIDwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTI0KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1yYWRpby1pbm5lcl9faGVhZGVyXFxcIj5cXG4gIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvaDI+XFxuPC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyIGN1c3RvbS1pbnB1dC1yYWRpby1pbm5lci0tZ3JvdXBcXFwiPlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5vcHRpb25zKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI1LCBwcm9ncmFtMjUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuPC9kaXY+XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXJhZGlvIGN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbiAgICAgIDxsYWJlbCBmb3I9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgICAgPGlucHV0IG5hbWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5uYW1lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5uYW1lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaWQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTAsIHByb2dyYW0xMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS50ZXh0KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEyLCBwcm9ncmFtMTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGVyY2VudCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmVkaXQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTYsIHByb2dyYW0xNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIlxuICAgICsgXCJcXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5saW5rKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE5LCBwcm9ncmFtMTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW8pLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjEsIHByb2dyYW0yMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yYWRpb0dyb3VwKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCI8IS0tXFxuICBBdXRob3I6IGtldmluQHdpbnRyLnVzXFxuICBEYXRlOiAxMC8wMi8yMDE0XFxuXFxuICBEZXNjcmlwdGlvbjogTWFya3VwIGZvciBTdGFydC9FbmQgRGF0ZSBJbnB1dCBNb2R1bGVcXG4tLT5cXG5cXG5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19sYWJlbFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19faW5uZXIgZnJvbVxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0teWVhclxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdC1sYWJlbFxcXCI+WWVhcjwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcInllYXJcXFwiIGlkPVxcXCJ5ZWFyU3RhcnRcXFwiIG5hbWU9XFxcInllYXJTdGFydFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfc3RhcnRfZGF0ZVxcXCIgZGF0YS1kYXRlLXR5cGU9XFxcInllYXJcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTRcXFwiPjIwMTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTVcXFwiPjIwMTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIwMTZcXFwiPjIwMTY8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tbW9udGhcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPk1vbnRoPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwibW9udGhcXFwiIGlkPVxcXCJtb250aFN0YXJ0XFxcIiBuYW1lPVxcXCJtb250aFN0YXJ0XFxcIiBkYXRhLWRhdGUtaWQ9XFxcIndpemFyZF9zdGFydF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwibW9udGhcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAxXFxcIj4xPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMlxcXCI+Mjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDNcXFwiPjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA0XFxcIj40PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNVxcXCI+NTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDZcXFwiPjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA3XFxcIj43PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOFxcXCI+ODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDlcXFwiPjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEwXFxcIj4xMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTFcXFwiPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMlxcXCI+MTI8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tZGF5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5EYXk8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJkYXlcXFwiIGlkPVxcXCJkYXlTdGFydFxcXCIgbmFtZT1cXFwiZGF5U3RhcnRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX3N0YXJ0X2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJkYXlcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAxXFxcIj4xPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMlxcXCI+Mjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDNcXFwiPjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA0XFxcIj40PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNVxcXCI+NTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDZcXFwiPjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA3XFxcIj43PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOFxcXCI+ODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDlcXFwiPjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEwXFxcIj4xMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTFcXFwiPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMlxcXCI+MTI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEzXFxcIj4xMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTRcXFwiPjE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNVxcXCI+MTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE2XFxcIj4xNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTdcXFwiPjE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxOFxcXCI+MTg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE5XFxcIj4xOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjBcXFwiPjIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMVxcXCI+MjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIyXFxcIj4yMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjNcXFwiPjIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNFxcXCI+MjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI1XFxcIj4yNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjZcXFwiPjI2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyN1xcXCI+Mjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI4XFxcIj4yODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjlcXFwiPjI5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIzMFxcXCI+MzA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMxXFxcIj4zMTwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgXFxuXFxuICA8L2Rpdj5cXG4gIDxzcGFuIGNsYXNzPVxcXCJkYXRlcy10b1xcXCI+XFxuICAgIHRvXFxuICA8L3NwYW4+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZGF0ZXNfX2lubmVyIHRvXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS15ZWFyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5ZZWFyPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwieWVhclxcXCIgaWQ9XFxcInllYXJFbmRcXFwiIG5hbWU9XFxcInllYXJFbmRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX2VuZF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwieWVhclxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNFxcXCI+MjAxNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNVxcXCI+MjAxNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNlxcXCI+MjAxNjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tbW9udGhcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPk1vbnRoPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwibW9udGhcXFwiIGlkPVxcXCJtb250aEVuZFxcXCIgbmFtZT1cXFwibW9udGhFbmRcXFwiIGRhdGEtZGF0ZS1pZD1cXFwid2l6YXJkX2VuZF9kYXRlXFxcIiBkYXRhLWRhdGUtdHlwZT1cXFwibW9udGhcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAxXFxcIj4xPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMlxcXCI+Mjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDNcXFwiPjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA0XFxcIj40PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNVxcXCI+NTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDZcXFwiPjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA3XFxcIj43PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOFxcXCI+ODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDlcXFwiPjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEwXFxcIj4xMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTFcXFwiPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMlxcXCI+MTI8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tZGF5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5EYXk8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJkYXlcXFwiIGlkPVxcXCJkYXlFbmRcXFwiIG5hbWU9XFxcImRheUVuZFxcXCIgZGF0YS1kYXRlLWlkPVxcXCJ3aXphcmRfZW5kX2RhdGVcXFwiIGRhdGEtZGF0ZS10eXBlPVxcXCJkYXlcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAxXFxcIj4xPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMlxcXCI+Mjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDNcXFwiPjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA0XFxcIj40PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNVxcXCI+NTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDZcXFwiPjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA3XFxcIj43PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOFxcXCI+ODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDlcXFwiPjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEwXFxcIj4xMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTFcXFwiPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMlxcXCI+MTI8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEzXFxcIj4xMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTRcXFwiPjE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNVxcXCI+MTU8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE2XFxcIj4xNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTdcXFwiPjE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxOFxcXCI+MTg8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE5XFxcIj4xOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjBcXFwiPjIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMVxcXCI+MjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIyXFxcIj4yMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjNcXFwiPjIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNFxcXCI+MjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI1XFxcIj4yNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjZcXFwiPjI2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyN1xcXCI+Mjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI4XFxcIj4yODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjlcXFwiPjI5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIzMFxcXCI+MzA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMxXFxcIj4zMTwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgXFxuXFxuICA8L2Rpdj5cXG5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBvdmVyLWxpbWl0IFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW8gY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNCwgcHJvZ3JhbTQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG5cXG4gICAgICAgICAgICA8YSBjbGFzcz1cXFwicmFkaW8tYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj48L2E+XFxuXFxuICAgICAgICAgICAgPGxhYmVsIGZvcj1cXFwicGVyY2VudFxcXCI+PHNwYW4+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG5cXG4gICAgICAgICAgICA8aW5wdXQgbmFtZT1cXFwiZ3JhZGluZy1zZWxlY3Rpb25cXFwiIGlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJyYWRpb1xcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5zZWxlY3RlZCwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQsIHByb2dyYW00LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAvPlxcblxcbiAgICAgICAgICA8L2Rpdj5cXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdcXFwiPlxcblxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc3VtbWFyeVxcXCI+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX190b3RhbFxcXCI+XFxuXFxuICAgICAgPGgzPlRvdGFsPC9oMz5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nX19wZXJjZW50IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaXNPdmVyTGltaXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcblxcbiAgICAgIDxoMyBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmdfX3RvdGFsLW51bWJlclxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRvdGFsR3JhZGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRvdGFsR3JhZGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiPC9oMz5cXG5cXG4gICAgPC9kaXY+XFxuXFxuICA8L2Rpdj5cXG4gIFxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWdyYWRpbmctc2VsZWN0aW9uXFxcIj5cXG5cXG4gICAgPGg1IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtZ3JhZGluZy1zZWxlY3Rpb25fX3RpdGxlXFxcIj5HcmFkaW5nIGJhc2VkIG9uOjwvaDU+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1ncmFkaW5nLXNlbGVjdGlvbi1mb3JtXFxcIj5cXG5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtd3JhcHBlclxcXCI+XFxuXFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAub3B0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgIDwvZGl2PlxcblxcbiAgICA8L2Rpdj5cXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIFxcbiB8IGNvdXJzZV9uYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNvdXJzZV9uYW1lKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IGluc3RydWN0b3JfdXNlcm5hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaW5zdHJ1Y3Rvcl91c2VybmFtZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRlYWNoZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxuIHwgc3ViamVjdCA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdWJqZWN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IHN0YXJ0X2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX3N0YXJ0X2RhdGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgXFxuIHwgZW5kX2RhdGUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud2l6YXJkX2VuZF9kYXRlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIFxcbiB8IGluc3RpdHV0aW9uID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNjaG9vbCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG4gfCBleHBlY3RlZF9zdHVkZW50cyA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiBcXG59fVxcblxcblwiO1xuICBpZiAoc3RhY2syID0gaGVscGVycy5kZXNjcmlwdGlvbikgeyBzdGFjazIgPSBzdGFjazIuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazIgPSBkZXB0aDAuZGVzY3JpcHRpb247IHN0YWNrMiA9IHR5cGVvZiBzdGFjazIgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMi5hcHBseShkZXB0aDApIDogc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMilcbiAgICArIFwiXFxuXFxuPT1UaW1lbGluZT09XFxuXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGludGVyZXN0ZWRfaW5fRFlLID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGludGVyZXN0ZWRfaW5fRFlLID0gbm8gXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIGludGVyZXN0ZWRfaW5fR29vZF9BcnRpY2xlcyA9IG5vIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZXF1ZXN0X2hlbHApKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEwLCBwcm9ncmFtMTAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgfCB3YW50X2hlbHBfZmluZGluZ19hcnRpY2xlcyA9IHllcyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTMsIHByb2dyYW0xMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBcXG4gfCB3YW50X2hlbHBfZXZhbHVhdGluZ19hcnRpY2xlcyA9IHllcyBcIjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7Y291cnNlIG9wdGlvbnMgXFxuIHwgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHlrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmR5aykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcXG4gfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nYSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5nYSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wcmVwYXJlX2xpc3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDksIHByb2dyYW05LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcXG59fVxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgc3RhY2sxO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAucmVuZGVySW5PdXRwdXQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgcmV0dXJuIHN0YWNrMTsgfVxuICBlbHNlIHsgcmV0dXJuICcnOyB9XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgfCBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIiB8IFwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiJVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IGdyYWRpbmcgXFxuXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmdyYWRpbmcsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8YnIvPn19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syLCBzZWxmPXRoaXMsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhbiBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db3B5ZWRpdCBhbiBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BZGQgdG8gYW4gYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTcoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSWxsdXN0cmF0ZSBhbiBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtOShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9MaXN0IGFydGljbGUgY2hvaWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBhcnRpY2xlcyBmcm9tIGEgbGlzdH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTEzKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1NlbGVjdCBhcnRpY2xlIGZyb20gc3R1ZGVudCBjaG9pY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kcmFmdHNfbWFpbnNwYWNlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNhbmRib3gpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kcmFmdHNfbWFpbnNwYWNlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLndvcmtfbGl2ZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTgsIHByb2dyYW0xOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTE2KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29udmVudGlvbmFsIG91dGxpbmUgfCBzYW5kYm94ID0gbm8gfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9PdXRsaW5lIGFzIGxlYWQgc2VjdGlvbiB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EWUsgbm9taW5hdGlvbnN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2Ugb25lIHBlZXIgcmV2aWV3IGFydGljbGV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yOChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EbyBvbmUgcGVlciByZXZpZXd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zNChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBDbGFzcyBwcmVzZW50YXRpb25zIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBGaW5pc2hpbmcgVG91Y2hlcyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1JlZmxlY3RpdmUgZXNzYXl9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00MihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XaWtpcGVkaWEgcG9ydGZvbGlvfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3JpZ2luYWwgYXJndW1lbnQgcGFwZXJ9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwie3tjb3Vyc2Ugd2VlayB8IDEgfCBXaWtpcGVkaWEgZXNzZW50aWFscyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9JbnRybyB0byBXaWtpcGVkaWF9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAyIHwgRWRpdGluZyBiYXNpY3MgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRWRpdGluZyBiYXNpY3MgaW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSB0aGUgdHJhaW5pbmd9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DcmVhdGUgdXNlcnBhZ2UgYW5kIHNpZ24gdXB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9QcmFjdGljZSBjb21tdW5pY2F0aW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGVucm9sbGVkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMyB8IEV4cGxvcmluZyB0aGUgdG9waWMgYXJlYX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGxvcmluZyB0aGUgdG9waWMgYXJlYSBpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA0IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNyaXRpcXVlX2FydGljbGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jb3B5X2VkaXRfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDQgfCBVc2luZyBzb3VyY2VzIGFuZCBjaG9vc2luZyBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Vc2luZyBzb3VyY2VzIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmdldHRpbmdfc3RhcnRlZCksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5hZGRfdG9fYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlsbHVzdHJhdGVfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNywgcHJvZ3JhbTcsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc3R1ZGVudHNfZXhwbG9yZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucHJlcGFyZV9saXN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMSwgcHJvZ3JhbTExLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FdmFsdWF0ZSBhcnRpY2xlIHNlbGVjdGlvbnMgfCBkdWUgPSBXZWVrIDV9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA1IHwgRmluYWxpemluZyB0b3BpY3MgYW5kIHN0YXJ0aW5nIHJlc2VhcmNoIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Rpc2N1c3MgdG9waWNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDYgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21waWxlIGEgYmlibGlvZ3JhcGh5fX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNiB8IERyYWZ0aW5nIHN0YXJ0ZXIgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyBldGlxdWV0dGUgYW5kIHNhbmRib3hlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayA3IH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucmVzZWFyY2hfcGxhbm5pbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY3JlYXRlX291dGxpbmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE1LCBwcm9ncmFtMTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucmVzZWFyY2hfcGxhbm5pbmcpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEud3JpdGVfbGVhZCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjAsIHByb2dyYW0yMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1N0dWRlbnRzIGhhdmUgc3RhcnRlZCBlZGl0aW5nfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNyB8IE1vdmluZyBhcnRpY2xlcyB0byB0aGUgbWFpbiBzcGFjZSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NYWluIHNwYWNlIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDggfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTW92ZSB0byBtYWluIHNwYWNlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5keWspLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZHlrKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMiwgcHJvZ3JhbTIyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FeHBhbmQgeW91ciBhcnRpY2xlfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgOCB8IEJ1aWxkaW5nIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tjbGFzcyB3b3Jrc2hvcH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0J1aWxkaW5nIGFydGljbGVzIGluIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDkgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29tcGxldGUgZmlyc3QgZHJhZnR9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5wZWVyX2ZlZWRiYWNrKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBlZXJfcmV2aWV3cykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazFbMF0pKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLnByb2dyYW0oMjYsIHByb2dyYW0yNiwgZGF0YSksZm46c2VsZi5wcm9ncmFtKDI0LCBwcm9ncmFtMjQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDkgfCBHZXR0aW5nIGFuZCBnaXZpbmcgZmVlZGJhY2sgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvR3JvdXAgc3VnZ2VzdGlvbnN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTAgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAucGVlcl9mZWVkYmFjayksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZWVyX3Jldmlld3MpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxWzBdKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDMwLCBwcm9ncmFtMzAsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgyOCwgcHJvZ3JhbTI4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQXJ0aWNsZXMgaGF2ZSBiZWVuIHJldmlld2VkfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMTAgfCBSZXNwb25kaW5nIHRvIGZlZWRiYWNrIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01lZGlhIGxpdGVyYWN5IGRpc2N1c3Npb259fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTEgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTWFrZSBlZGl0cyBiYXNlZCBvbiBwZWVyIHJldmlld3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMiwgcHJvZ3JhbTMyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxMSB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDM2LCBwcm9ncmFtMzYsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgzNCwgcHJvZ3JhbTM0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2xhc3NfcHJlc2VudGF0aW9uKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzOCwgcHJvZ3JhbTM4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9zcGFjZXN9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgMTIgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRmluYWwgdG91Y2hlcyB0byBhcnRpY2xlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5yZWZsZWN0aXZlX2Vzc2F5KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MCwgcHJvZ3JhbTQwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucG9ydGZvbGlvKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0MiwgcHJvZ3JhbTQyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3JpZ2luYWxfcGFwZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDQ0LCBwcm9ncmFtNDQsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDEyIHwgRHVlIGRhdGUgfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvc3BhY2VzfX1cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FsbCBzdHVkZW50cyBmaW5pc2hlZH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL3NwYWNlc319XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwiXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiNURU1QQUxURVxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnZm9jdXNIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3V0JyA6ICdibHVySGFuZGxlcidcblxuICBtOiAnJ1xuICBkOiAnJ1xuICB5OiAnJ1xuICBkYXRlVmFsdWU6ICcnXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICAkKCdib2R5Jykub24gJ2NsaWNrJywgKGUpID0+XG5cbiAgICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuICBjbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBibHVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG5cbiAgZm9jdXNIYW5kbGVyOiAoZSkgLT5cblxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgY2hhbmdlSGFuZGxlcjogKGUpIC0+XG5cbiAgICBAY2xvc2VJZk5vVmFsdWUoKVxuXG4gICAgJHRhcmdldCA9ICgkIGUuY3VycmVudFRhcmdldClcblxuICAgIGlkID0gJHRhcmdldC5hdHRyKCdkYXRhLWRhdGUtaWQnKVxuXG4gICAgdHlwZSA9ICR0YXJnZXQuYXR0cignZGF0YS1kYXRlLXR5cGUnKVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdW3R5cGVdID0gdmFsdWVcblxuICAgIEBtID0gV2l6YXJkU3RlcElucHV0c1tAcGFyZW50U3RlcFZpZXcuc3RlcElkKCldW2lkXVsnbW9udGgnXVxuXG4gICAgQGQgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWydkYXknXVxuXG4gICAgQHkgPSBXaXphcmRTdGVwSW5wdXRzW0BwYXJlbnRTdGVwVmlldy5zdGVwSWQoKV1baWRdWyd5ZWFyJ11cblxuICAgIEBkYXRlVmFsdWUgPSBcIiN7QHl9LSN7QG19LSN7QGR9XCJcblxuICAgIFdpemFyZFN0ZXBJbnB1dHNbQHBhcmVudFN0ZXBWaWV3LnN0ZXBJZCgpXVtpZF0udmFsdWUgPSBAZGF0ZVZhbHVlXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdkYXRlOmNoYW5nZScsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBoYXNWYWx1ZTogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJ3NlbGVjdCcpLnZhbCgpICE9ICcnXG5cblxuICBjbG9zZUlmTm9WYWx1ZTogLT5cblxuICAgIGlmIEBoYXNWYWx1ZSgpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgZWxzZVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuXG4gIGlzVmFsaWQ6IC0+XG4gICAgaXNJdCA9IGZhbHNlXG5cbiAgICBpZiBAbSAhPSAnJyBhbmQgQGQgIT0gJycgYW5kIEB5ICE9ICcnXG4gICAgICBpc0l0ID0gdHJ1ZVxuXG4gICAgcmV0dXJuIGlzSXRcblxuXG5cblxuXG5cbiIsIiMgQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5XaWtpR3JhZGluZ01vZHVsZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9tb2R1bGVzL1dpa2lHcmFkaW5nTW9kdWxlLmhicycpXG5cblxuI0RhdGFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgR3JhZGluZ0lucHV0VmlldyBleHRlbmRzIFZpZXdcblxuICB0ZW1wbGF0ZTogV2lraUdyYWRpbmdNb2R1bGVcblxuXG4gIGV2ZW50czpcblxuICAgICdjaGFuZ2UgaW5wdXQnIDogJ2lucHV0Q2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCBsYWJlbCcgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ2dyYWRlOmNoYW5nZScgOiAnZ3JhZGVDaGFuZ2VIYW5kbGVyJ1xuXG4gIGN1cnJlbnRWYWx1ZXM6IFtdXG5cblxuICB2YWx1ZUxpbWl0OiAxMDBcblxuXG4gIGdyYWRpbmdTZWxlY3Rpb25EYXRhOiBXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ11cblxuXG4gIGN1cnJlbnRUb3RhbDogLT5cblxuICAgIHRvdGFsID0gMFxuXG4gICAgXy5lYWNoKEBjdXJyZW50VmFsdWVzLCAodmFsKSA9PlxuXG4gICAgICB0b3RhbCArPSBwYXJzZUludCh2YWwpXG5cbiAgICApXG5cbiAgICByZXR1cm4gdG90YWxcblxuXG5cbiAgZ2V0SW5wdXRWYWx1ZXM6IC0+XG5cbiAgICB2YWx1ZXMgPSBbXVxuXG4gICAgQHBhcmVudFN0ZXBWaWV3LiRlbC5maW5kKCdpbnB1dFt0eXBlPVwicGVyY2VudFwiXScpLmVhY2goLT5cblxuICAgICAgY3VyVmFsID0gKCQgdGhpcykudmFsKClcblxuICAgICAgaWYgY3VyVmFsXG4gICAgICAgIFxuICAgICAgICB2YWx1ZXMucHVzaChjdXJWYWwpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICAoJCB0aGlzKS52YWwoMClcblxuICAgICAgICB2YWx1ZXMucHVzaCgwKVxuXG5cblxuICAgIClcblxuICAgIEBjdXJyZW50VmFsdWVzID0gdmFsdWVzXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBncmFkZUNoYW5nZUhhbmRsZXI6IChpZCwgdmFsdWUpIC0+XG4gICAgXG4gICAgQGdldElucHV0VmFsdWVzKCkucmVuZGVyKClcblxuXG4gIHJhZGlvQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgJGJ1dHRvbiA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgJHBhcmVudEVsID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpXG5cbiAgICAkcGFyZW50R3JvdXAgPSAkYnV0dG9uLnBhcmVudHMoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpXG5cbiAgICAkaW5wdXRFbCA9ICRwYXJlbnRFbC5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKVxuXG5cbiAgICBpZiAkcGFyZW50RWwuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGVsc2VcblxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJykubm90KCRwYXJlbnRFbFswXSlcblxuICAgICAgJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJyYWRpb1wiXScpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSkudHJpZ2dlcignY2hhbmdlJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJHBhcmVudEVsLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIF8uZWFjaChXaXphcmRTdGVwSW5wdXRzWydncmFkaW5nJ11bJ2dyYWRpbmdfc2VsZWN0aW9uJ10ub3B0aW9ucywgKG9wdCkgLT5cblxuICAgICAgICBvcHQuc2VsZWN0ZWQgPSBmYWxzZVxuICAgICAgICBcbiAgICAgIClcblxuICAgICAgV2l6YXJkU3RlcElucHV0c1snZ3JhZGluZyddWydncmFkaW5nX3NlbGVjdGlvbiddLm9wdGlvbnNbJGlucHV0RWwuYXR0cignaWQnKV0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2dyYWRpbmcnXVsnZ3JhZGluZ19zZWxlY3Rpb24nXS52YWx1ZSA9ICRpbnB1dEVsLmF0dHIoJ2lkJylcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIG91dCA9IHtcblxuICAgICAgdG90YWxHcmFkZTogQGN1cnJlbnRUb3RhbCgpXG5cbiAgICAgIGlzT3ZlckxpbWl0OiBAY3VycmVudFRvdGFsKCkgPiBAdmFsdWVMaW1pdFxuXG4gICAgICBvcHRpb25zOiBAZ3JhZGluZ1NlbGVjdGlvbkRhdGEub3B0aW9uc1xuXG4gICAgfVxuXG4gICAgcmV0dXJuIG91dFxuXG5cblxuXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkhvbWVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzJylcblxuT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuXG5TdGVwTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvU3RlcE1vZGVsJylcblxuU3RlcE5hdlZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9TdGVwTmF2VmlldycpXG5cbiNJTlBVVFNcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IEhvbWVUZW1wbGF0ZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSU5JVFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBpbml0aWFsaXplOiAtPlxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBzdGVwc1JlbmRlcmVkID0gZmFsc2VcblxuXG4gIGV2ZW50czogXG5cbiAgICAnY2xpY2sgLmV4aXQtZWRpdCcgOiAnZXhpdEVkaXRDbGlja0hhbmRsZXInXG5cblxuICBzdWJzY3JpcHRpb25zOlxuXG4gICAgJ3N0ZXA6bmV4dCcgOiAnbmV4dEhhbmRsZXInXG5cbiAgICAnc3RlcDpwcmV2JyA6ICdwcmV2SGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9IYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6Z290b0lkJyA6ICdnb3RvSWRIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6ZWRpdCcgOiAnZWRpdEhhbmRsZXInXG5cbiAgICAndGlwczpoaWRlJyA6ICdoaWRlQWxsVGlwcydcblxuICAgICdlZGl0OmV4aXQnIDogJ29uRWRpdEV4aXQnXG5cblxuXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSkpXG5cbiAgICB1bmxlc3MgQHN0ZXBzUmVuZGVyZWRcbiAgICBcbiAgICAgIEBhZnRlclJlbmRlcigpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICAjU1VCVklFV1NcbiAgICBAU3RlcE5hdiA9IG5ldyBTdGVwTmF2VmlldygpXG5cbiAgICAjIFRIRSBGT0xMV0lORyBDT1VMRCBQUk9CQUJMWSBIQVBQRU4gSU4gQSBDT0xMRVRJT04gVklFVyBDTEFTUyBUTyBDT05UUk9MIEFMTCBTVEVQU1xuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAJGlubmVyQ29udGFpbmVyID0gQCRlbC5maW5kKCcuY29udGVudCcpXG5cbiAgICAjIFNFVFVQIFNURVBTIEFORCBSRVRVUk4gQVJSQVkgT0YgVklFV1NcbiAgICBAc3RlcFZpZXdzID0gQF9jcmVhdGVTdGVwVmlld3MoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuICAgICAgQHNob3dDdXJyZW50U3RlcCgpXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG5cbiAgX2NyZWF0ZVN0ZXBWaWV3czogLT5cbiAgICBcbiAgICBfdmlld3MgPSBbXVxuXG5cblxuICAgIF8uZWFjaChhcHBsaWNhdGlvbi5kYXRhLChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgbmV3bW9kZWwgPSBuZXcgU3RlcE1vZGVsKClcblxuICAgICAgXy5tYXAoc3RlcCwodmFsdWUsIGtleSwgbGlzdCkgLT4gXG5cbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcblxuICAgICAgKVxuXG4gICAgICBuZXd2aWV3ID0gbmV3IFN0ZXBWaWV3KFxuXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgaW5kZXggKyAxKVxuXG4gICAgICBuZXd2aWV3Lm1vZGVsLnNldCgnc3RlcEluZGV4JywgaW5kZXggKVxuXG4gICAgICBpZiBpbmRleCBpcyBhcHBsaWNhdGlvbi5kYXRhLmxlbmd0aCAtIDFcbiAgICAgICAgbmV3dmlldy5pc0xhc3RTdGVwID0gdHJ1ZVxuICAgICAgZWxzZSBpZiBpbmRleCBpcyAwXG4gICAgICAgIG5ld3ZpZXcuaXNGaXJzdFN0ZXAgPSB0cnVlXG5cbiAgICAgIEAkc3RlcHNDb250YWluZXIuYXBwZW5kKG5ld3ZpZXcucmVuZGVyKCkuaGlkZSgpLmVsKVxuXG4gICAgICBuZXd2aWV3LiRlbC5hZGRDbGFzcyhcInN0ZXAtLSN7c3RlcC5pZH1cIilcblxuICAgICAgX3ZpZXdzLnB1c2gobmV3dmlldylcblxuICAgIClcblxuICAgIHJldHVybiBfdmlld3NcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cbiAgICByZXR1cm4ge1xuXG4gICAgICBjb250ZW50OiBcIlRoaXMgaXMgc3BlY2lhbCBjb250ZW50XCJcblxuICAgIH1cbiAgICBcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiAgYWR2YW5jZVN0ZXA6IC0+XG4gICAgQGN1cnJlbnRTdGVwKz0xXG4gICAgXG4gICAgaWYgQGN1cnJlbnRTdGVwIGlzIEBzdGVwVmlld3MubGVuZ3RoIFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSAwXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgZGVjcmVtZW50U3RlcDogLT5cblxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHVwZGF0ZVN0ZXA6IChpbmRleCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IGluZGV4XG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cbiAgdXBkYXRlU3RlcEJ5SWQ6IChpZCkgLT5cblxuICAgIF8uZWFjaChAc3RlcFZpZXdzLChzdGVwVmlldykgPT5cblxuICAgICAgaWYgc3RlcFZpZXcuc3RlcElkKCkgaXMgaWRcblxuICAgICAgICBAdXBkYXRlU3RlcChfLmluZGV4T2YoQHN0ZXBWaWV3cyxzdGVwVmlldykpXG4gICAgICAgIFxuICAgICAgICByZXR1cm5cbiAgICAgIFxuICAgIClcblxuXG5cbiAgc2hvd0N1cnJlbnRTdGVwOiAtPlxuXG4gICAgQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLnNob3coKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDp1cGRhdGUnLCBAY3VycmVudFN0ZXApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBjdXJyZW50U3RlcFZpZXc6IC0+XG4gICAgcmV0dXJuIEBzdGVwVmlld3NbQGN1cnJlbnRTdGVwXVxuXG5cblxuICBoaWRlQWxsU3RlcHM6IC0+XG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG5cbiAgICAgIHN0ZXBWaWV3LmhpZGUoKVxuICAgICAgXG4gICAgKVxuXG5cbiAgaGlkZUFsbFRpcHM6IChlKSAtPlxuXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuXG4gICAgICBzdGVwVmlldy50aXBWaXNpYmxlID0gZmFsc2VcbiAgICAgIFxuICAgIClcblxuICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG5cblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UIEhBTkRMRVJTXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIG5leHRIYW5kbGVyOiAtPlxuXG4gICAgQGFkdmFuY2VTdGVwKClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG4gIHByZXZIYW5kbGVyOiAtPlxuXG4gICAgQGRlY3JlbWVudFN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG4gIGVkaXRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICAkKCdib2R5JykuYWRkQ2xhc3MoJ2VkaXQtbW9kZScpXG5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywgKHZpZXcsIGluZGV4KSA9PlxuXG4gICAgICBpZiB2aWV3Lm1vZGVsLmlkID09IGlkXG5cbiAgICAgICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG5cbiAgICApXG5cblxuICBvbkVkaXRFeGl0OiAtPlxuXG4gICAgJCgnYm9keScpLnJlbW92ZUNsYXNzKCdlZGl0LW1vZGUnKVxuXG5cbiAgZXhpdEVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2VkaXQ6ZXhpdCcpXG5cblxuXG4gIGdvdG9IYW5kbGVyOiAoaW5kZXgpIC0+XG5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuICBnb3RvSWRIYW5kbGVyOiAoaWQpIC0+XG5cbiAgICBAdXBkYXRlU3RlcEJ5SWQoaWQpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZ2V0U2VsZWN0ZWRJZHM6IC0+XG5cbiAgICBzZWxlY3RlZElkcyA9IFtdXG5cbiAgICBfLmVhY2goV2l6YXJkU3RlcElucHV0cywgKHN0ZXBzKSA9PlxuXG4gICAgICBfLmVhY2goc3RlcHMsIChzdGVwKSA9PlxuXG4gICAgICAgIGlmIHN0ZXAuc2VsZWN0ZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgaWYgc3RlcC5pZFxuXG4gICAgICAgICAgICBzZWxlY3RlZElkcy5wdXNoIHN0ZXAuaWRcblxuICAgICAgKVxuXG4gICAgKVxuXG4gICAgcmV0dXJuIHNlbGVjdGVkSWRzXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL0lucHV0VmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgSW5wdXRWaWV3IFxuXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkxvZ2luVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMnKVxuXG5XaXphcmRDb250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb250ZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IExvZ2luVGVtcGxhdGVcblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIFxuICAgIHJldHVybiBXaXphcmRDb250ZW50WzBdIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbldpa2lPdXRwdXRUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicycpXG5Db3Vyc2VEZXRhaWxzVGVtcGFsdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L0NvdXJzZURldGFpbHNUZW1wbGF0ZS5oYnMnKVxuR3JhZGluZ1RlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9HcmFkaW5nVGVtcGxhdGUuaGJzJylcbkNvdXJzZU9wdGlvbnNUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvQ291cnNlT3B0aW9uc1RlbXBsYXRlLmhicycpXG5cblxuI0NPTkZJRyBEQVRBXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSW5wdXRJdGVtVmlldyBleHRlbmRzIFZpZXcgXG5cblxuICB0ZW1wbGF0ZTogV2lraU91dHB1dFRlbXBsYXRlXG5cblxuICBkZXRhaWxzVGVtcGxhdGU6IENvdXJzZURldGFpbHNUZW1wYWx0ZVxuXG4gIGdyYWRpbmdUZW1wbGF0ZTogR3JhZGluZ1RlbXBsYXRlXG5cbiAgb3B0aW9uc1RlbXBsYXRlOiBDb3Vyc2VPcHRpb25zVGVtcGxhdGVcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnd2l6YXJkOnB1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJyBcblxuXG4gIG91dHB1dFBsYWluVGV4dDogLT5cblxuICAgIEByZW5kZXIoKVxuXG4gICAgcmV0dXJuIEAkZWwudGV4dCgpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQHBvcHVsYXRlT3V0cHV0KCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcG9wdWxhdGVPdXRwdXQ6IC0+XG5cbiAgICBkZXRhaWxzT3V0cHV0ID0gQCRlbC5odG1sKEBkZXRhaWxzVGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgcmF3QXNzaWdubWVudE91dHB1dCA9IEAkZWwuaHRtbChAdGVtcGxhdGUoQGdldFJlbmRlckRhdGEoKSkpLnRleHQoKVxuXG4gICAgYXNzaWdubWVudE91dHB1dCA9IHJhd0Fzc2lnbm1lbnRPdXRwdXQucmVwbGFjZSgvKFxcclxcbnxcXG58XFxyKS9nbSxcIlwiKVxuXG4gICAgZ3JhZGluZ091dHB1dCA9IEAkZWwuaHRtbChAZ3JhZGluZ1RlbXBsYXRlKEBnZXRSZW5kZXJEYXRhKCkpKS50ZXh0KClcblxuICAgIG9wdGlvbnNPdXRwdXQgPSBAJGVsLmh0bWwoQG9wdGlvbnNUZW1wbGF0ZShAZ2V0UmVuZGVyRGF0YSgpKSkudGV4dCgpXG5cbiAgICBjb3Vyc2VPdXQgPSBkZXRhaWxzT3V0cHV0ICsgYXNzaWdubWVudE91dHB1dCArIGdyYWRpbmdPdXRwdXQgKyBvcHRpb25zT3V0cHV0XG4gICAgXG4gICAgcmV0dXJuIGNvdXJzZU91dFxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiBfLmV4dGVuZChXaXphcmRTdGVwSW5wdXRzLHsgZGVzY3JpcHRpb246ICQoJyNzaG9ydF9kZXNjcmlwdGlvbicpLnZhbCgpLCBsaW5lQnJlYWs6ICc8YnIvPid9KVxuXG5cbiAgZXhwb3J0RGF0YTogKGZvcm1EYXRhKSAtPlxuXG4gICAgJC5hamF4KFxuXG4gICAgICB0eXBlOiAnUE9TVCdcblxuICAgICAgdXJsOiAnL3B1Ymxpc2gnXG5cbiAgICAgIGRhdGE6XG5cbiAgICAgICAgd2lraXRleHQ6IGZvcm1EYXRhXG5cbiAgICAgICAgY291cnNlX3RpdGxlOiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlXG5cbiAgICAgIHN1Y2Nlc3M6IChyZXNwb25zZSkgLT5cblxuICAgICAgICAkKCcjcHVibGlzaCcpLnJlbW92ZUNsYXNzKCdwcm9jZXNzaW5nJylcblxuICAgICAgICBpZiByZXNwb25zZS5zdWNjZXNzXG5cbiAgICAgICAgICBuZXdQYWdlID0gXCJodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpLyN7cmVzcG9uc2UudGl0bGV9XCJcblxuICAgICAgICAgIGFsZXJ0KFwiQ29uZ3JhdHMhIFlvdSBoYXZlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkL2VkaXRlZCBhIFdpa2llZHUgQ291cnNlIGF0ICN7bmV3UGFnZX1cIilcblxuICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gbmV3UGFnZVxuXG4gICAgICAgIGVsc2VcblxuICAgICAgICAgIGNvbnNvbGUubG9nIHJlc3BvbnNlXG5cbiAgICAgICAgICBhbGVydCgndGhlcmUgd2FzIGFuIGVycm9yLiBzZWUgY29uc29sZS4nKVxuXG5cbiAgICApXG4gICAgXG5cbiAgcHVibGlzaEhhbmRsZXI6IC0+XG5cbiAgICBpZiBXaXphcmRTdGVwSW5wdXRzLmludHJvLmNvdXJzZV9uYW1lLnZhbHVlLmxlbmd0aCA+IDAgXG5cbiAgICAgICQoJyNwdWJsaXNoJykuYWRkQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAjIEBleHBvcnREYXRhKEAkZWwuaHRtbChAcG9wdWxhdGVPdXRwdXQoKSkudGV4dCgpKVxuXG4gICAgICBAZXhwb3J0RGF0YShAcG9wdWxhdGVPdXRwdXQoKSlcblxuICAgIGVsc2VcblxuICAgICAgYWxlcnQoJ1lvdSBtdXN0IGVudGVyIGEgY291cnNlIHRpdGxlIGFzIHRoaXMgd2lsbCBiZWNvbWUgdGhlIHRpdGxlIG9mIHlvdXIgY291cnNlIHBhZ2UuJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0JywgJ2ludHJvJylcblxuICAgICAgc2V0VGltZW91dCg9PlxuXG4gICAgICAgICQoJyNjb3Vyc2VfbmFtZScpLmZvY3VzKClcblxuICAgICAgLDUwMClcblxuXG4gICAgXG5cbiAgICBcblxuICAgICIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBOYXZWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG5WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL1ZpZXcnKVxuXG5TdGVwTmF2VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvU3RlcE5hdlRlbXBsYXRlLmhicycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTmF2VmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAtbmF2J1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBOYXZUZW1wbGF0ZVxuXG5cbiAgaGFzQmVlblRvTGFzdFN0ZXA6IGZhbHNlXG5cblxuICBpbml0aWFsaXplOiAtPlxuICAgIFxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcblxuICAgICdzdGVwOnVwZGF0ZScgOiAndXBkYXRlQ3VycmVudFN0ZXAnXG5cbiAgICAnc3RlcDphbnN3ZXJlZCcgOiAnc3RlcEFuc3dlcmVkJ1xuXG4gICAgJ2VkaXQ6ZXhpdCcgOiAnZWRpdEV4aXRIYW5kbGVyJ1xuXG5cbiAgZXZlbnRzOiAtPlxuICAgICdjbGljayAubmV4dCcgOiAnbmV4dENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAucHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZG90JyAgOiAnZG90Q2xpY2tIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPiAwICYmIEBjdXJyZW50U3RlcCA8IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG5cbiAgICBlbHNlIGlmIEBjdXJyZW50U3RlcCA+IDAgJiYgQGN1cnJlbnRTdGVwID09IEB0b3RhbFN0ZXBzIC0gMVxuXG4gICAgICBAJGVsLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIHJldHVybiB7XG5cbiAgICAgIGN1cnJlbnQ6IEBjdXJyZW50U3RlcFxuXG4gICAgICB0b3RhbDogQHRvdGFsU3RlcHNcblxuICAgICAgcHJldkluYWN0aXZlOiBAaXNJbmFjdGl2ZSgncHJldicpXG5cbiAgICAgIG5leHRJbmFjdGl2ZTogQGlzSW5hY3RpdmUoJ25leHQnKVxuXG4gICAgICBuZXh0VGl0bGU6ID0+XG5cbiAgICAgICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICAgICAgcmV0dXJuICcnXG5cbiAgICAgICAgZWxzZSBcblxuICAgICAgICAgIHJldHVybiAnTmV4dCdcblxuICAgICAgcHJldlRpdGxlOiA9PlxuXG4gICAgICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgICAgIHJldHVybiAnQmFjaydcblxuICAgICAgICBlbHNlIFxuXG4gICAgICAgICAgcmV0dXJuICdQcmV2J1xuXG4gICAgICBpc0xhc3RTdGVwOiBAaXNMYXN0U3RlcCgpXG5cbiAgICAgIGJhY2tUb092ZXJ2aWV3VGl0bGU6ICdHbyBCYWNrIHRvIE92ZXJ2aWV3J1xuXG4gICAgICBzdGVwczogPT5cblxuICAgICAgICBvdXQgPSBbXVxuXG4gICAgICAgIF8uZWFjaChAc3RlcFZpZXdzLCAoc3RlcCwgaW5kZXgpID0+XG5cbiAgICAgICAgICBzdGVwRGF0YSA9IHN0ZXAubW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICAgICAgaXNBY3RpdmUgPSBAY3VycmVudFN0ZXAgaXMgaW5kZXhcblxuICAgICAgICAgIHdhc1Zpc2l0ZWQgPSBzdGVwLmhhc1VzZXJWaXNpdGVkXG5cbiAgICAgICAgICBvdXQucHVzaCB7aWQ6IGluZGV4LCBpc0FjdGl2ZTogaXNBY3RpdmUsIGhhc1Zpc2l0ZWQ6IHdhc1Zpc2l0ZWQsIHN0ZXBUaXRsZTogc3RlcERhdGEudGl0bGUsIHN0ZXBJZDogc3RlcERhdGEuaWR9XG5cbiAgICAgICAgKVxuXG4gICAgICAgIHJldHVybiBvdXRcblxuICAgIH1cblxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzTGFzdFN0ZXAoKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnZ3JhZGluZycpXG5cbiAgICBlbHNlXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICBkb3RDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICBpZiBAaGFzQmVlblRvTGFzdFN0ZXBcblxuICAgICAgaWYgcGFyc2VJbnQoJHRhcmdldC5hdHRyKCdkYXRhLW5hdi1pZCcpKSA9PSBwYXJzZUludChAdG90YWxTdGVwcyAtIDEpXG5cbiAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZWRpdDpleGl0JylcblxuICAgICAgZWxzZVxuXG4gICAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6ZWRpdCcsICR0YXJnZXQuZGF0YSgnc3RlcC1pZCcpKVxuXG4gICAgZWxzZVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmdvdG8nLCAkdGFyZ2V0LmRhdGEoJ25hdi1pZCcpKVxuXG5cbiAgZWRpdEV4aXRIYW5kbGVyOiAtPlxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpnb3RvJywgQGxhc3RTdGVwSW5kZXgoKSlcblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cblxuICAgIEBjdXJyZW50U3RlcCA9IHN0ZXBcblxuICAgIGlmIEBpc0xhc3RTdGVwKClcblxuICAgICAgQGhhc0JlZW5Ub0xhc3RTdGVwID0gdHJ1ZVxuXG4gICAgQHJlbmRlcigpXG5cblxuICBzdGVwQW5zd2VyZWQ6IChzdGVwVmlldykgLT5cblxuICAgIHJldHVybiBAcmVuZGVyKClcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgSGVscGVyc1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBsYXN0U3RlcEluZGV4OiAtPlxuICAgIFxuICAgIHJldHVybiBAdG90YWxTdGVwcy0xXG5cbiAgaXNMYXN0U3RlcDogLT5cblxuICAgIHJldHVybiBAY3VycmVudFN0ZXAgaXMgQHRvdGFsU3RlcHMgLSAxXG5cbiAgaXNJbmFjdGl2ZTogKGl0ZW0pIC0+XG5cbiAgICBpdElzID0gdHJ1ZVxuXG4gICAgaWYgaXRlbSA9PSAncHJldidcblxuICAgICAgaXRJcyA9IEBjdXJyZW50U3RlcCBpcyAxXG5cbiAgICBlbHNlIGlmIGl0ZW0gPT0gJ25leHQnXG5cbiAgICAgIGlmIGFwcGxpY2F0aW9uLmhvbWVWaWV3LnN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLmhhc1VzZXJBbnN3ZXJlZFxuXG4gICAgICAgIGl0SXMgPSBmYWxzZVxuXG4gICAgICBlbHNlIGlmIEBpc0xhc3RTdGVwKClcbiAgICAgICAgXG4gICAgICAgIGl0SXMgPSB0cnVlXG5cbiAgICAgIGVsc2VcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgIHJldHVybiBpdElzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1NVQlZJRVdTXG5JbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5cbkRhdGVJbnB1dFZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9EYXRlSW5wdXRWaWV3JylcblxuR3JhZGluZ0lucHV0VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL0dyYWRpbmdJbnB1dFZpZXcnKVxuXG4jVEVNUExBVEVTXG5TdGVwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvU3RlcFRlbXBsYXRlLmhicycpXG5cbkludHJvU3RlcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL0ludHJvU3RlcFRlbXBsYXRlLmhicycpXG5cbklucHV0VGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicycpXG5cbkNvdXJzZVRpcFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL2luZm8vQ291cnNlVGlwVGVtcGxhdGUuaGJzJylcblxuV2lraURhdGVzTW9kdWxlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicycpXG5cblxuI0RBVEFcbkNvdXJzZUluZm9EYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb3Vyc2VJbmZvJylcblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcCdcblxuXG4gIHRhZ05hbWU6ICdzZWN0aW9uJ1xuXG5cbiAgdGVtcGxhdGU6IFN0ZXBUZW1wbGF0ZVxuXG5cbiAgaW50cm9UZW1wbGF0ZTogSW50cm9TdGVwVGVtcGxhdGVcblxuXG4gIHRpcFRlbXBsYXRlOiBJbnB1dFRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvVGVtcGxhdGU6IENvdXJzZVRpcFRlbXBsYXRlXG5cblxuICBjb3Vyc2VJbmZvRGF0YTogQ291cnNlSW5mb0RhdGFcblxuXG4gIGRhdGVzTW9kdWxlOiBXaWtpRGF0ZXNNb2R1bGVcblxuXG4gIGhhc1VzZXJBbnN3ZXJlZDogZmFsc2VcblxuXG4gIGhhc1VzZXJWaXNpdGVkOiBmYWxzZVxuXG5cbiAgaXNMYXN0U3RlcDogZmFsc2VcblxuXG4gIGlzRmlyc3RTdGVwOiBmYWxzZVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlRTIEFORCBIQU5ETEVSU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6XG5cbiAgICAnY2xpY2sgI3B1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8tdGlwX19jbG9zZScgOiAnaGlkZVRpcHMnXG5cbiAgICAnY2xpY2sgI2JlZ2luQnV0dG9uJyA6ICdiZWdpbkhhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mbyAuc3RlcC1pbmZvLXNlY3Rpb24tLWFjY29yZGlhbicgOiAnYWNjb3JkaWFuQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5lZGl0LWJ1dHRvbicgOiAnZWRpdENsaWNrSGFuZGxlcidcblxuICAgICMgJ2NsaWNrIC5zdGVwLWluZm8tdGlwJyA6ICdoaWRlVGlwcydcblxuICBzdWJzY3JpcHRpb25zOiBcblxuICAgICd0aXBzOmhpZGUnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2RhdGU6Y2hhbmdlJyA6ICdpc0ludHJvVmFsaWQnXG5cblxuXG4gIGVkaXRDbGlja0hhbmRsZXI6IChlKSAtPlxuXG4gICAgc3RlcElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtc3RlcC1pZCcpXG5cbiAgICBpZiBzdGVwSWRcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0Jywgc3RlcElkKVxuXG4gIHN0ZXBJZDogLT5cblxuICAgIHJldHVybiBAbW9kZWwuYXR0cmlidXRlcy5pZFxuXG5cbiAgdmFsaWRhdGVEYXRlczogKGRhdGVWaWV3KSAtPlxuXG4gICAgdW5sZXNzIEBpc0ZpcnN0U3RlcCBvciBAaXNMYXN0U3RlcFxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGRhdGVzQXJlVmFsaWQgPSBmYWxzZVxuXG4gICAgXy5lYWNoKEBkYXRlVmlld3MsIChkYXRlVmlldykgPT5cbiAgICAgIGlmIGRhdGVWaWV3LmlzVmFsaWQoKVxuICAgICAgICBkYXRlc0FyZVZhbGlkID0gdHJ1ZVxuICAgICAgZWxzZSBcbiAgICAgICAgZGF0ZXNBcmVWYWxpZCA9IGZhbHNlXG4gICAgKVxuXG4gICAgcmV0dXJuIGRhdGVzQXJlVmFsaWRcblxuXG5cblxuXG4gIGFjY29yZGlhbkNsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkdGFyZ2V0LnRvZ2dsZUNsYXNzKCdvcGVuJylcblxuXG4gIHB1Ymxpc2hIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnd2l6YXJkOnB1Ymxpc2gnKVxuXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgQHRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgaWYgQGlzRmlyc3RTdGVwXG5cbiAgICAgIEBfcmVuZGVyU3RlcFR5cGUoJ2ZpcnN0JylcblxuXG5cbiAgICBlbHNlIGlmIEBpc0xhc3RTdGVwXG5cbiAgICAgIEBfcmVuZGVyU3RlcFR5cGUoJ2xhc3QnKVxuICAgICAgXG4gICAgZWxzZVxuXG4gICAgICBAX3JlbmRlclN0ZXBUeXBlKCdzdGFuZGFyZCcpXG5cbiAgICBAX3JlbmRlcklucHV0c0FuZEluZm8oKVxuXG4gICAgcmV0dXJuIEBhZnRlclJlbmRlcigpXG5cblxuICBfcmVuZGVyU3RlcFR5cGU6ICh0eXBlKSAtPlxuXG4gICAgaWYgdHlwZSBpcyAnc3RhbmRhcmQnXG5cbiAgICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgIGVsc2UgaWYgdHlwZSBpcyAnZmlyc3QnIG9yIHR5cGUgaXMgJ2xhc3QnXG5cbiAgICAgIGlmIHR5cGUgaXMgJ2ZpcnN0J1xuXG4gICAgICAgIEAkZWwuYWRkQ2xhc3MoJ3N0ZXAtLWZpcnN0JykuaHRtbCggQGludHJvVGVtcGxhdGUoIEBtb2RlbC5hdHRyaWJ1dGVzICkgKVxuXG4gICAgICAgIGRhdGVUaXRsZSA9ICdDb3Vyc2UgZGF0ZXMnXG5cbiAgICAgICAgQCRiZWdpbkJ1dHRvbiA9IEAkZWwuZmluZCgnYSNiZWdpbkJ1dHRvbicpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAJGVsLmFkZENsYXNzKCdzdGVwLS1sYXN0JykuaHRtbCggQHRlbXBsYXRlKCBAbW9kZWwuYXR0cmlidXRlcyApIClcblxuICAgICAgICBkYXRlVGl0bGUgPSAnQXNzaWdubWVudCB0aW1lbGluZSdcblxuICAgICAgQGRhdGVWaWV3cyA9IFtdXG5cbiAgICAgICRkYXRlcyA9ICQoQGRhdGVzTW9kdWxlKHt0aXRsZTogZGF0ZVRpdGxlfSkpXG5cbiAgICAgICRkYXRlSW5wdXRzID0gJGRhdGVzLmZpbmQoJy5jdXN0b20tc2VsZWN0JylcblxuICAgICAgc2VsZiA9IEBcblxuICAgICAgJGRhdGVJbnB1dHMuZWFjaCgoaW5wdXRFbGVtZW50KSAtPlxuXG4gICAgICAgIG5ld0RhdGVWaWV3ID0gbmV3IERhdGVJbnB1dFZpZXcoXG5cbiAgICAgICAgICBlbDogJCh0aGlzKSBcblxuICAgICAgICApXG5cbiAgICAgICAgbmV3RGF0ZVZpZXcucGFyZW50U3RlcFZpZXcgPSBzZWxmXG5cbiAgICAgICAgc2VsZi5kYXRlVmlld3MucHVzaChuZXdEYXRlVmlldylcbiAgICAgIFxuICAgICAgKVxuXG4gICAgICBAJGVsLmZpbmQoJy5zdGVwLWZvcm0tZGF0ZXMnKS5odG1sKCRkYXRlcylcblxuICAgIHJldHVybiBAXG5cbiAgICBcblxuICBfcmVuZGVySW5wdXRzQW5kSW5mbzogLT5cblxuICAgIEBpbnB1dFNlY3Rpb24gPSBAJGVsLmZpbmQoJy5zdGVwLWZvcm0taW5uZXInKVxuXG4gICAgQCR0aXBTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1pbmZvLXRpcHMnKVxuXG4gICAgQGlucHV0RGF0YSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmF0dHJpYnV0ZXMuaWRdIHx8IFtdXG5cbiAgICBfLmVhY2goQGlucHV0RGF0YSwgKGlucHV0LCBpbmRleCkgPT5cblxuICAgICAgdW5sZXNzIGlucHV0LnR5cGUgXG5cbiAgICAgICAgcmV0dXJuXG5cbiAgICAgIGlmIGlucHV0LnNlbGVjdGVkICYmIGlucHV0LnJlcXVpcmVkXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC5zZWxlY3RlZCBcblxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBlbHNlIGlmIGlucHV0LnJlcXVpcmVkIGlzIGZhbHNlXG5cbiAgICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuICAgICAgZWxzZSBpZiBpbnB1dC50eXBlIGlzICdwZXJjZW50J1xuXG4gICAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cblxuICAgICAgaW5wdXRWaWV3ID0gbmV3IElucHV0SXRlbVZpZXcoXG5cbiAgICAgICAgbW9kZWw6IG5ldyBCYWNrYm9uZS5Nb2RlbChpbnB1dClcblxuICAgICAgKVxuXG4gICAgICBpbnB1dFZpZXcuaW5wdXRUeXBlID0gaW5wdXQudHlwZVxuXG4gICAgICBpbnB1dFZpZXcuaXRlbUluZGV4ID0gaW5kZXhcblxuICAgICAgaW5wdXRWaWV3LnBhcmVudFN0ZXAgPSBAXG5cbiAgICAgIEBpbnB1dFNlY3Rpb24uYXBwZW5kKGlucHV0Vmlldy5yZW5kZXIoKS5lbClcblxuICAgICAgaWYgaW5wdXQudGlwSW5mb1xuXG4gICAgICAgIHRpcCA9IFxuXG4gICAgICAgICAgaWQ6IGluZGV4XG5cbiAgICAgICAgICB0aXRsZTogaW5wdXQudGlwSW5mby50aXRsZVxuXG4gICAgICAgICAgY29udGVudDogaW5wdXQudGlwSW5mby5jb250ZW50XG5cbiAgICAgICAgJHRpcEVsID0gQHRpcFRlbXBsYXRlKHRpcClcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICAgIGVsc2UgaWYgaW5wdXQuaGFzQ291cnNlSW5mb1xuXG4gICAgICAgIGluZm9EYXRhID0gXy5leHRlbmQoQGNvdXJzZUluZm9EYXRhW2lucHV0LmlkXSwge2lkOiBpbmRleH0gKVxuXG4gICAgICAgICR0aXBFbCA9IEBjb3Vyc2VJbmZvVGVtcGxhdGUoaW5mb0RhdGEpXG5cbiAgICAgICAgQCR0aXBTZWN0aW9uLmFwcGVuZCgkdGlwRWwpXG5cbiAgICAgICAgaW5wdXRWaWV3LiRlbC5hZGRDbGFzcygnaGFzLWluZm8nKVxuXG4gICAgKVxuICAgIHJldHVybiBAXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGlucHV0Q29udGFpbmVycyA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpXG5cbiAgICBpZiBAbW9kZWwuYXR0cmlidXRlcy5pZCBpcyAnZ3JhZGluZydcblxuICAgICAgQGdyYWRpbmdWaWV3ID0gbmV3IEdyYWRpbmdJbnB1dFZpZXcoKVxuXG4gICAgICBAZ3JhZGluZ1ZpZXcucGFyZW50U3RlcFZpZXcgPSBAXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtZm9ybS1jb250ZW50JykuYXBwZW5kKEBncmFkaW5nVmlldy5nZXRJbnB1dFZhbHVlcygpLnJlbmRlcigpLmVsKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGU6IC0+XG5cbiAgICBAJGVsLmhpZGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG4gIHNob3c6IC0+XG5cbiAgICAkKCdib2R5LCBodG1sJykuYW5pbWF0ZShcbiAgICAgIHNjcm9sbFRvcDogMFxuICAgICwxKVxuXG4gICAgaWYgQGlzTGFzdFN0ZXBcblxuICAgICAgQHJlbmRlcigpLiRlbC5zaG93KClcblxuICAgIGVsc2UgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgIEByZW5kZXIoKS4kZWwuc2hvdygpXG5cblxuICAgIGVsc2VcblxuICAgICAgQCRlbC5zaG93KClcblxuICAgIEBoYXNVc2VyVmlzaXRlZCA9IHRydWVcblxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGJlZ2luSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOm5leHQnKVxuXG5cblxuICB1cGRhdGVVc2VyQW5zd2VyOiAoaWQsIHZhbHVlLCB0eXBlKSAtPlxuXG4gICAgaW5wdXRJdGVtcyA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVxuXG4gICAgcmVxdWlyZWRTZWxlY3RlZCA9IGZhbHNlXG5cbiAgICBpZiB0eXBlIGlzICdwZXJjZW50J1xuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICByZXR1cm4gQFxuXG5cbiAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgIGlmIGl0ZW0udHlwZSBpcyAnY2hlY2tib3gnXG5cbiAgICAgICAgaWYgaXRlbS5yZXF1aXJlZCBpcyB0cnVlXG5cbiAgICAgICAgICBpZiBpdGVtLnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgcmVxdWlyZWRTZWxlY3RlZCA9IHRydWVcblxuICAgICAgICBlbHNlXG5cbiAgICAgICAgICByZXF1aXJlZFNlbGVjdGVkID0gdHJ1ZVxuXG4gICAgKVxuXG4gICAgaWYgcmVxdWlyZWRTZWxlY3RlZCBpcyB0cnVlXG5cbiAgICAgIEBoYXNVc2VyQW5zd2VyZWQgPSB0cnVlXG5cbiAgICBlbHNlIGlmIHR5cGUgaXMgJ3JhZGlvR3JvdXAnIG9yIHR5cGUgaXMgJ3JhZGlvQm94J1xuXG4gICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgZWxzZSBpZiB0eXBlIGlzICd0ZXh0J1xuXG4gICAgICBpZiBAaXNGaXJzdFN0ZXBcblxuICAgICAgICBfLmVhY2goaW5wdXRJdGVtcywgKGl0ZW0pID0+XG5cbiAgICAgICAgICBpZiBpdGVtLnR5cGUgaXMgJ3RleHQnXG5cbiAgICAgICAgICAgIGlmIGl0ZW0ucmVxdWlyZWQgaXMgdHJ1ZVxuXG4gICAgICAgICAgICAgIGlmIGl0ZW0udmFsdWUgIT0gJydcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgICAgICAgICAgZWxzZSBcblxuICAgICAgICAgICAgICAgIHJlcXVpcmVkU2VsZWN0ZWQgPSBmYWxzZVxuXG4gICAgICAgIClcblxuICAgICAgICBpZiByZXF1aXJlZFNlbGVjdGVkXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICAgIGVsc2UgXG5cbiAgICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gZmFsc2VcblxuICAgICAgICBAaXNJbnRyb1ZhbGlkKClcblxuXG4gICAgZWxzZSBcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IGZhbHNlXG4gIFxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDphbnN3ZXJlZCcsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBpc0ludHJvVmFsaWQ6IC0+XG5cbiAgICB1bmxlc3MgQGlzRmlyc3RTdGVwIG9yIEBpc0xhc3RTdGVwXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgaWYgQGlzRmlyc3RTdGVwXG5cbiAgICAgIGlmIEBoYXNVc2VyQW5zd2VyZWQgYW5kIEB2YWxpZGF0ZURhdGVzKClcblxuICAgICAgICBAJGJlZ2luQnV0dG9uLnJlbW92ZUNsYXNzKCdpbmFjdGl2ZScpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAJGJlZ2luQnV0dG9uLmFkZENsYXNzKCdpbmFjdGl2ZScpXG5cblxuXG5cbiAgdXBkYXRlUmFkaW9BbnN3ZXI6IChpZCwgaW5kZXgsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5zZWxlY3RlZCA9IHZhbHVlXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS52YWx1ZVxuXG4gICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vdmVydmlld0xhYmVsID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5vcHRpb25zW2luZGV4XS5vdmVydmlld0xhYmVsXG5cbiAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gaW5kZXhcblxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlKSAtPlxuXG4gICAgaW5wdXRUeXBlID0gV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS50eXBlIFxuXG4gICAgb3V0ID0gXG5cbiAgICAgIHR5cGU6IGlucHV0VHlwZVxuXG4gICAgICBpZDogaWRcblxuICAgICAgdmFsdWU6IHZhbHVlXG5cbiAgICBpZiBpbnB1dFR5cGUgPT0gJ3JhZGlvQm94JyB8fCBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICBpZiB2YWx1ZSA9PSAnb24nXG5cbiAgICAgICAgV2l6YXJkU3RlcElucHV0c1tAbW9kZWwuaWRdW2lkXS5zZWxlY3RlZCA9IHRydWVcblxuICAgICAgZWxzZVxuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSBmYWxzZVxuXG5cbiAgICBlbHNlIGlmIGlucHV0VHlwZSA9PSAndGV4dCcgfHwgaW5wdXRUeXBlID09ICdwZXJjZW50J1xuXG4gICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnZhbHVlID0gdmFsdWVcblxuXG4gICAgcmV0dXJuIEBcblxuXG4gIGhpZGVUaXBzOiAoZSkgLT5cblxuICAgICQoJy5zdGVwLWluZm8tdGlwJykucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgJCgnLmN1c3RvbS1pbnB1dC13cmFwcGVyJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG5cblxuXG4gICAgXG4gICAgXG5cbiBcblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jQVBQXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi8uLi9BcHAnIClcblxuIyBTVVBFUiBWSUVXIENMQVNTXG5WaWV3ID0gcmVxdWlyZSgnLi9WaWV3JylcblxuXG4jVEVNUExBVEVTXG5JbnB1dEl0ZW1UZW1wbGF0ZSA9IHJlcXVpcmUoJy4uLy4uL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzJylcblxuXG4jT1VUUFVUXG5Bc3NpZ25tZW50RGF0YSA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEnKVxuXG5cbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi8uLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIElucHV0SXRlbVZpZXcgZXh0ZW5kcyBWaWV3IFxuXG5cbiAgdGVtcGxhdGU6IElucHV0SXRlbVRlbXBsYXRlXG5cblxuICBjbGFzc05hbWU6ICdjdXN0b20taW5wdXQtd3JhcHBlcidcblxuXG4gIGhvdmVyVGltZTogNTAwXG5cbiAgdGlwVmlzaWJsZTogZmFsc2VcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEV2ZW50c1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBldmVudHM6IFxuXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInRleHRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2tleXVwIGlucHV0W3R5cGU9XCJwZXJjZW50XCJdJyA6ICdpdGVtQ2hhbmdlSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1jaGVja2JveCBsYWJlbCBzcGFuJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuaW5mby1pY29uJyA6ICdpbmZvSWNvbkNsaWNrSGFuZGxlcidcblxuICAgICdtb3VzZW92ZXInIDogJ21vdXNlb3ZlckhhbmRsZXInXG5cbiAgICAnbW91c2VlbnRlciBsYWJlbCcgOiAnaGlkZVNob3dUb29sdGlwJ1xuXG4gICAgJ21vdXNlb3ZlciAuY3VzdG9tLWlucHV0JyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VlbnRlciAuY2hlY2stYnV0dG9uJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdXQnIDogJ21vdXNlb3V0SGFuZGxlcidcblxuICAgICdjbGljayAuZWRpdGFibGUgLmNoZWNrLWJ1dHRvbicgOiAnY2hlY2tCdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3ggLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9Cb3hDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmN1c3RvbS1pbnB1dC0tcmFkaW8tZ3JvdXAgLnJhZGlvLWJ1dHRvbicgOiAncmFkaW9CdXR0b25DbGlja0hhbmRsZXInXG5cbiAgICAnZm9jdXMgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25Gb2N1cydcblxuICAgICdibHVyIC5jdXN0b20taW5wdXQtLXRleHQgaW5wdXQnIDogJ29uQmx1cidcblxuXG4gIGluZm9JY29uQ2xpY2tIYW5kbGVyOiAtPlxuXG4gICAgdW5sZXNzIEAkZWwuaGFzQ2xhc3MoJ3NlbGVjdGVkJylcbiAgICAgIEBzaG93VG9vbHRpcCgpXG4gICAgZWxzZVxuICAgICAgJCgnYm9keSwgaHRtbCcpLmFuaW1hdGUoXG4gICAgICAgIHNjcm9sbFRvcDogMFxuICAgICAgLDUwMClcblxuICByYWRpb0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICRidXR0b24gPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRFbCA9ICRidXR0b24ucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJHBhcmVudEdyb3VwID0gJGJ1dHRvbi5wYXJlbnRzKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuXG4gICAgaWYgJHBhcmVudEVsLmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgndGlwczpoaWRlJylcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBlbHNlXG5cbiAgICAgICRvdGhlclJhZGlvcyA9ICRwYXJlbnRHcm91cC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpbycpLm5vdCgkcGFyZW50RWxbMF0pXG5cbiAgICAgICRvdGhlclJhZGlvcy5maW5kKCdpbnB1dFt0eXBlPVwicmFkaW9cIl0nKS5wcm9wKCdjaGVja2VkJywgZmFsc2UpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgICRvdGhlclJhZGlvcy5yZW1vdmVDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgICRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG5cblxuICByYWRpb0JveENsaWNrSGFuZGxlcjogKGUpIC0+XG5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcblxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICAkb3RoZXJSYWRpb3MgPSBAJGVsLnBhcmVudHMoJy5zdGVwLWZvcm0taW5uZXInKS5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG5cbiAgICAkb3RoZXJSYWRpb3MucmVtb3ZlQ2xhc3MoJ2NoZWNrZWQnKS5maW5kKCdpbnB1dCcpLnZhbCgnb2ZmJykudHJpZ2dlcignY2hhbmdlJylcblxuICAgICRwYXJlbnQgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JylcblxuICAgICAgLmFkZENsYXNzKCdjaGVja2VkJylcblxuICAgIGlmICRwYXJlbnQuaGFzQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgICBAJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29uJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICBlbHNlXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG5cblxuXG4gIGNoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyOiAoZSkgLT5cblxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgIGlmIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKS5sZW5ndGggPiAwXG5cbiAgICAgIHJldHVybiBAcmFkaW9Cb3hDbGlja0hhbmRsZXIoZSlcblxuICAgICRwYXJlbnQgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLWNoZWNrYm94JylcblxuICAgICAgLnRvZ2dsZUNsYXNzKCdjaGVja2VkJylcbiAgICBcbiAgICBpZiAkcGFyZW50Lmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvbicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgZWxzZVxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG4gIGhvdmVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBjb25zb2xlLmxvZyBlLnRhcmdldFxuXG5cbiAgbW91c2VvdmVySGFuZGxlcjogKGUpIC0+XG5cbiAgICBAaXNIb3ZlcmluZyA9IHRydWVcbiAgICAgIFxuXG4gIG1vdXNlb3V0SGFuZGxlcjogKGUpIC0+XG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuICBzaG93VG9vbHRpcDogLT5cblxuICAgIGlmIEBoYXNJbmZvKCkgJiYgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9PSBmYWxzZVxuXG4gICAgICBAJGVsLmFkZENsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnRpcFZpc2libGUgPSB0cnVlXG5cbiAgICAgICQoJ2JvZHknKS5hZGRDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgICBAcGFyZW50U3RlcC4kZWwuZmluZChcIi5zdGVwLWluZm8tdGlwXCIpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFtkYXRhLWl0ZW0taW5kZXg9JyN7QGl0ZW1JbmRleH0nXVwiKS5hZGRDbGFzcygndmlzaWJsZScpXG5cblxuICBoaWRlVG9vbHRpcDogLT5cblxuICAgIGlmIEBoYXNJbmZvKClcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICAkKCdib2R5JykucmVtb3ZlQ2xhc3MoJ3RpcC1vcGVuJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IGZhbHNlXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKSBcblxuXG4gIGhpZGVTaG93VG9vbHRpcDogLT5cblxuICAgIGlmIEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dCcpLmhhc0NsYXNzKCdub3QtZWRpdGFibGUnKVxuXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICQoJ2JvZHknKS5yZW1vdmVDbGFzcygndGlwLW9wZW4nKVxuXG4gICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICBAc2hvd1Rvb2x0aXAoKVxuXG5cbiAgbGFiZWxDbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIHJldHVybiBmYWxzZVxuXG5cbiAgaXRlbUNoYW5nZUhhbmRsZXI6IChlKSAtPlxuICAgIFxuICAgICMgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnYW5zd2VyOnVwZGF0ZWQnLCBpbnB1dElkLCB2YWx1ZSlcblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICAgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignaWQnKVxuXG4gICAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCd2YWx1ZScpXG5cbiAgICAgIHBhcmVudElkID0gJChlLmN1cnJlbnRUYXJnZXQpLmF0dHIoJ25hbWUnKVxuXG4gICAgICBpZiAkKGUuY3VycmVudFRhcmdldCkucHJvcCgnY2hlY2tlZCcpXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCB0cnVlKVxuXG4gICAgICBlbHNlXG5cbiAgICAgICAgQHBhcmVudFN0ZXAudXBkYXRlUmFkaW9BbnN3ZXIocGFyZW50SWQsIGluZGV4LCBmYWxzZSlcblxuICAgIGVsc2VcblxuICAgICAgdmFsdWUgPSAkKGUuY3VycmVudFRhcmdldCkudmFsKClcblxuICAgICAgaW5wdXRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAgIEBwYXJlbnRTdGVwLnVwZGF0ZUFuc3dlcihpbnB1dElkLCB2YWx1ZSlcblxuICAgICAgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgICBpZiBpc05hTihwYXJzZUludCh2YWx1ZSkpXG5cbiAgICAgICAgICAkKGUuY3VycmVudFRhcmdldCkudmFsKCcnKVxuXG4gICAgICAgICAgcmV0dXJuXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnZ3JhZGU6Y2hhbmdlJywgaW5wdXRJZCwgdmFsdWUpXG4gICAgXG4gICAgcmV0dXJuIEBwYXJlbnRTdGVwLnVwZGF0ZVVzZXJBbnN3ZXIoaW5wdXRJZCwgdmFsdWUsIEBpbnB1dFR5cGUpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKEBpbnB1dFR5cGUpXG5cbiAgICBAJGlucHV0RWwgPSBAJGVsLmZpbmQoJ2lucHV0JylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLnZhbHVlICE9ICcnICYmIEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ3RleHQnXG4gICAgICBcbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgQGhvdmVyVGltZXIgPSBudWxsXG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuXG4gIGhhc0luZm86IC0+XG5cbiAgICByZXR1cm4gQCRlbC5oYXNDbGFzcygnaGFzLWluZm8nKVxuXG5cbiAgb25Gb2N1czogKGUpIC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKCdvcGVuJylcblxuXG4gIG9uQmx1cjogKGUpIC0+XG5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICB2YWx1ZSA9ICR0YXJnZXQudmFsKClcblxuICAgIGlmIHZhbHVlID09ICcnXG5cbiAgICAgIHVubGVzcyAkdGFyZ2V0LmlzKCc6Zm9jdXMnKVxuXG4gICAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG5cbiAgaXNEaXNhYmxlZDogLT5cblxuICAgIHJldHVybiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHVibGljIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmVuZGVyOiAtPlxuXG4gICAgc3VwZXIoKVxuXG5cbiAgZ2V0SW5wdXRUeXBlT2JqZWN0OiAtPlxuXG4gICAgcmV0dXJuRGF0YSA9IHt9XG5cbiAgICByZXR1cm5EYXRhW0BpbnB1dFR5cGVdID0gdHJ1ZVxuXG4gICAgcmV0dXJuIHJldHVybkRhdGFcblxuXG5cbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAgIGlucHV0VHlwZU9iamVjdCA9IEBnZXRJbnB1dFR5cGVPYmplY3QoKVxuXG5cbiAgICBpZiBAaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAndGV4dCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3BlcmNlbnQnXG5cbiAgICAgIGlmIEBwYXJlbnRTdGVwLm1vZGVsLmF0dHJpYnV0ZXMuaWQgaXMgJ2dyYWRpbmcnXG5cbiAgICAgICAgaWYgQG1vZGVsLmF0dHJpYnV0ZXMuY29udGluZ2VudFVwb24ubGVuZ3RoICE9IDBcblxuICAgICAgICAgIGN1cnJlbnRTZWxlY3RlZCA9IGFwcGxpY2F0aW9uLmhvbWVWaWV3LmdldFNlbGVjdGVkSWRzKClcblxuICAgICAgICAgIHJlbmRlckluT3V0cHV0ID0gZmFsc2VcblxuICAgICAgICAgIF8uZWFjaChAbW9kZWwuYXR0cmlidXRlcy5jb250aW5nZW50VXBvbiwgKGlkKSA9PlxuXG4gICAgICAgICAgICBfLmVhY2goY3VycmVudFNlbGVjdGVkLCAoc2VsZWN0ZWRJZCkgPT5cblxuICAgICAgICAgICAgICBpZiBpZCBpcyBzZWxlY3RlZElkXG5cbiAgICAgICAgICAgICAgICByZW5kZXJJbk91dHB1dCA9IHRydWVcblxuICAgICAgICAgICAgKVxuXG4gICAgICAgICAgKVxuXG4gICAgICAgICAgdW5sZXNzIHJlbmRlckluT3V0cHV0XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZVxuXG5cblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdlZGl0J1xuXG4gICAgICBhbGxJbnB1dHMgPSBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXVxuXG4gICAgICBzZWxlY3RlZElucHV0cyA9IFtdXG5cbiAgICAgIF8uZWFjaChhbGxJbnB1dHMsIChpbnB1dCkgPT5cblxuICAgICAgICBpZiBpbnB1dC50eXBlXG5cbiAgICAgICAgICBpZiBpbnB1dC50eXBlIGlzICdjaGVja2JveCcgfHwgaW5wdXQudHlwZSBpcyAncmFkaW9Cb3gnXG5cbiAgICAgICAgICAgIGlmIGlucHV0LnNlbGVjdGVkIGlzIHRydWVcblxuICAgICAgICAgICAgICBzZWxlY3RlZElucHV0cy5wdXNoIGlucHV0LmxhYmVsXG5cbiAgICAgICAgICBlbHNlIGlmIGlucHV0LnR5cGUgaXMgJ3JhZGlvR3JvdXAnXG5cbiAgICAgICAgICAgIGlmIGlucHV0LmlkIGlzICdwZWVyX3Jldmlld3MnXG5cbiAgICAgICAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBpbnB1dC5vdmVydmlld0xhYmVsXG5cbiAgICAgIClcblxuICAgICAgXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hhcy1jb250ZW50JylcblxuICAgICAgaWYgc2VsZWN0ZWRJbnB1dHMubGVuZ3RoID09IDBcbiAgICAgICAgc2VsZWN0ZWRJbnB1dHMucHVzaCBcIltOb25lIHNlbGVjdGVkXVwiXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgYXNzaWdubWVudHM6IHNlbGVjdGVkSW5wdXRzXG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdyYWRpb0JveCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdsaW5rJ1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuXG4gIFxuICAgICAgXG4gICAgXG4gICAgICBcblxuICAgIFxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgQmFzZSBWaWV3IENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cblxucmVxdWlyZSgnLi4vLi4vaGVscGVycy9WaWV3SGVscGVyJylcblxuY2xhc3MgVmlldyBleHRlbmRzIEJhY2tib25lLlZpZXdcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgUFJPUEVSVElFUyAvIENPTlNUQU5UU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgdGVtcGxhdGU6IC0+XG4gICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgZ2V0UmVuZGVyRGF0YTogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBJTkhFUklURUQgLyBPVkVSUklERVNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuICBcbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBAcmVuZGVyID0gXy5iaW5kKCBAcmVuZGVyLCBAIClcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICByZW5kZXI6IC0+XG4gICAgQCRlbC5odG1sKCBAdGVtcGxhdGUoIEBnZXRSZW5kZXJEYXRhKCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGFmdGVyUmVuZGVyOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIEVWRU5UIEhBTkRMRVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQUklWQVRFIEFORCBQUk9URUNURUQgTUVUSE9EU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gVmlldyJdfQ==
