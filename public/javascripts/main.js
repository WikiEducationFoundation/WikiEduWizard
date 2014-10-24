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



},{"./data/WizardContent":7,"./routers/Router":14,"./views/HomeView":26,"./views/InputItemView":27,"./views/LoginView":28,"./views/OutputView":29}],6:[function(require,module,exports){
var WizardAssignmentData;

module.exports = WizardAssignmentData = [];



},{}],7:[function(require,module,exports){
var WizardContent;

WizardContent = [
  {
    id: "intro",
    title: 'Welcome to the Wikipedia Assignment Wizard!',
    login_instructions: 'Click Login with Wikipedia to get started',
    instructions: 'This tool will walk you through best practices for Wikipedia classroom assignments and help you create a customized syllabus for your course, broken into weekly assignments.<br/><br/>When you’re finished, you can publish a ready-to-use lesson plan onto a wiki page, where it can be customized even further.<br/><br/>Let’s start by filling in some basics about you and your course:',
    inputs: [],
    sections: []
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
    formTitle: 'Which basic assignments would you like to include in your course?',
    inputs: [],
    sections: [
      {
        title: '',
        content: ['<p>Which introductory assignments would you like to use to acclimate your students to Wikipedia? You can select none, one, or more. Whichever you select will be added to the course syllabus.</p>', '<ul> <li><strong>Critique an article.</strong> Critically evaluate an existing Wikipedia article related to the class, and leave suggestions for improving it on the article’s talk page. </li> <li><strong>Add to an article.</strong> Using course readings or other relevant secondary sources, add 1–2 sentences of new information to a Wikipedia article related to the class. Be sure to integrate it well into the existing article, and include a citation to the source. </li> <li><strong>Copyedit an article.</strong> Browse Wikipedia until you find an article that you would like to improve, and make some edits to improve the language or formatting. </li> <li><strong>Illustrate an article.</strong> Find an opportunity to improve an article by creating and uploading an original photograph or video.</li> </ul']
      }
    ]
  }, {
    id: 'choosing_articles',
    title: 'Choosing articles',
    formTitle: 'There are two recommended options for selecting articles for Wikipedia assignments:',
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
        title: '',
        content: ["<p>Pros and cons to sandboxes: Sandboxes make students feel safe because they can edit without the pressure of the whole world reading their drafts, or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.</p>", "<p>Pros and cons to editing live: Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed.</p>", "<p>Will you have your students draft their early work in sandboxes, or work live from the beginning?</p>"]
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
    id: "dyk_ga",
    title: 'DYK and Good Article processes',
    infoTitle: 'About DYK and Good Article processes',
    formTitle: "Would you like to include these as an ungraded option for your students?",
    sections: [
      {
        title: '',
        content: ["<p>Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days.</p>", "<p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but it can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its 6 hours in the spotlight.</p>", "<p>We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it.</p>", "<p>Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>", "<p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term, and those written by student editors who are already experienced, strong writers.</p>"]
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
        title: 'Short description',
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
    start_date: {
      month: '',
      day: '',
      year: ''
    },
    end_date: {
      month: '',
      day: '',
      year: ''
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
      hasCourseInfo: true,
      disabled: true
    },
    multimedia: {
      type: 'checkbox',
      id: 'multimedia',
      selected: false,
      label: 'Add images & multimedia',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    sourcecentered: {
      type: 'checkbox',
      id: 'sourcecentered',
      selected: false,
      label: 'Source-centered additions',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    copyedit: {
      type: 'checkbox',
      id: 'copyedit',
      selected: false,
      label: 'Copyedit articles',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    findfix: {
      type: 'checkbox',
      id: 'findfix',
      selected: false,
      label: 'Find and fix errors',
      exclusive: false,
      hasCourseInfo: true,
      disabled: true
    },
    plagiarism: {
      type: 'checkbox',
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
      type: 'checkbox',
      id: 'create_user',
      selected: true,
      label: 'Create user account',
      exclusive: false,
      disabled: true
    },
    enroll: {
      type: 'checkbox',
      id: 'enroll',
      selected: true,
      label: 'Enroll to the course',
      exclusive: false,
      disabled: true
    },
    complete_training: {
      type: 'checkbox',
      id: 'complete_training',
      selected: true,
      label: 'Complete online training',
      disabled: true,
      exclusive: false
    },
    introduce_ambassadors: {
      type: 'checkbox',
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
      label: 'Instructor prepares a list ',
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
          label: '4',
          value: '4',
          selected: false
        }, {
          id: 'peer_reviews',
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
    }
  },
  dyk_ga: {
    dyk: {
      type: 'checkbox',
      id: 'dyk',
      selected: false,
      label: 'Did You Know?',
      exclusive: false
    },
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
      value: '',
      placeholder: ''
    },
    getting_started: {
      type: 'percent',
      label: 'Getting started with editing',
      id: 'getting_started',
      value: '',
      placeholder: ''
    },
    choosing_articles: {
      type: 'percent',
      label: 'Choosing articles',
      id: 'choosing_articles',
      value: '',
      placeholder: ''
    },
    research_planning: {
      type: 'percent',
      label: 'Research an planning',
      id: 'research_planning',
      value: '',
      placeholder: ''
    },
    drafts_mainspace: {
      type: 'percent',
      label: 'Drafts and mainspace',
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
      label: 'Supplementary assignments',
      id: 'supplementary_assignments',
      value: '',
      placeholder: ''
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
    start_date: {
      month: '',
      day: '',
      year: ''
    },
    end_date: {
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
  buffer += "\n\n</div><!-- end .step-nav-indicators -->\n\n\n\n<!-- STEP NAV BUTTONS -->\n<div class=\"step-nav-buttons\">\n\n  <a href=\"#\" class=\"step-nav__button step-nav--prev prev ";
  stack1 = helpers['if'].call(depth0, depth0.prevInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    <span style=\"margin-right:5px;\">\n      <div class=\"step-nav-arrow step-nav-arrow--left\"></div>\n    </span>\n    Prev\n  </a>\n\n  <a href=\"#\" class=\"step-nav__button step-nav--next next ";
  stack1 = helpers['if'].call(depth0, depth0.nextInactive, {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\">\n    Next\n    <span style=\"margin-left:5px;\">\n      <div class=\"step-nav-arrow step-nav-arrow--right\"></div>\n    </span>\n  </a>\n\n</div><!-- end .step-nav-buttons -->\n";
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
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.disabled), {hash:{},inverse:self.noop,fn:self.program(4, program4, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.exclusive), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
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
  
  
  return " data-exclusive=\"true\" ";
  }

function program8(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custom-input--checkbox custom-input--radiobox ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(2, program2, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.exclusive), {hash:{},inverse:self.noop,fn:self.program(6, program6, data),data:data});
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

function program10(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-checkbox-group\" data-checkbox-group=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">\n  <div class=\"custom-input-checkbox-group__label\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(11, program11, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program11(depth0,data) {
  
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

function program13(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input custum-input--select ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.multiple), {hash:{},inverse:self.noop,fn:self.program(14, program14, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\">\n  <label for=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</label>\n  <select name=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.id)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" ";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.multiple), {hash:{},inverse:self.noop,fn:self.program(16, program16, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += ">\n    ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(18, program18, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n  </select>\n</div>\n";
  return buffer;
  }
function program14(depth0,data) {
  
  
  return " custum-input--select--multi ";
  }

function program16(depth0,data) {
  
  
  return " multiple ";
  }

function program18(depth0,data) {
  
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

function program20(depth0,data) {
  
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

function program22(depth0,data) {
  
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

function program24(depth0,data) {
  
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

function program26(depth0,data) {
  
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

function program28(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n<div class=\"custom-input custom-input--link\">\n  <label><a href=\""
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.href)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "\" >"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</a></label>\n</div>\n";
  return buffer;
  }

function program30(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner\">\n  <div class=\"custom-input-radio-inner__header\">\n    <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n  </div>\n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(31, program31, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program31(depth0,data) {
  
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

function program33(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += "\n<div class=\"custom-input-radio-inner__header\">\n  <h2 class=\"font-blue--dark\">"
    + escapeExpression(((stack1 = ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.label)),typeof stack1 === functionType ? stack1.apply(depth0) : stack1))
    + "</h2>\n</div>\n<div class=\"custom-input-radio-inner custom-input-radio-inner--group\">\n  \n  ";
  stack2 = helpers.each.call(depth0, ((stack1 = depth0.data),stack1 == null || stack1 === false ? stack1 : stack1.options), {hash:{},inverse:self.noop,fn:self.program(34, program34, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n</div>\n";
  return buffer;
  }
function program34(depth0,data) {
  
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
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioBox), {hash:{},inverse:self.noop,fn:self.program(8, program8, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.checkboxGroup), {hash:{},inverse:self.noop,fn:self.program(10, program10, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.select), {hash:{},inverse:self.noop,fn:self.program(13, program13, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.text), {hash:{},inverse:self.noop,fn:self.program(20, program20, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.percent), {hash:{},inverse:self.noop,fn:self.program(22, program22, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.edit), {hash:{},inverse:self.noop,fn:self.program(24, program24, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.textarea), {hash:{},inverse:self.noop,fn:self.program(26, program26, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.link), {hash:{},inverse:self.noop,fn:self.program(28, program28, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radio), {hash:{},inverse:self.noop,fn:self.program(30, program30, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n"
    + "\n";
  stack2 = helpers['if'].call(depth0, ((stack1 = depth0.type),stack1 == null || stack1 === false ? stack1 : stack1.radioGroup), {hash:{},inverse:self.noop,fn:self.program(33, program33, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += "\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],23:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<!--\n  Author: kevin@wintr.us\n  Date: 10/02/2014\n\n  Description: Markup for Start/End Date Input Module\n-->\n\n\n<div class=\"custom-input-dates\">\n  <div class=\"custom-input-dates__label\">Course dates</div>\n  <div class=\"custom-input-dates__inner from\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearStart\" name=\"yearStart\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n        <option value=\"2017\">2017</option>\n        <option value=\"2018\">2018</option>\n        <option value=\"2019\">2019</option>\n        <option value=\"2020\">2020</option>\n        <option value=\"2021\">2021</option>\n        <option value=\"2022\">2022</option>\n        <option value=\"2023\">2023</option>\n        <option value=\"2024\">2024</option>\n        <option value=\"2025\">2025</option>\n        <option value=\"2026\">2026</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthStart\" name=\"monthStart\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayStart\" name=\"dayStart\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n  <span class=\"dates-to\">\n    to\n  </span>\n  <div class=\"custom-input-dates__inner to\">\n\n    <div class=\"custom-select custom-select--year\">\n      <div class=\"custom-select-label\">Year</div>\n      <select class=\"year\" id=\"yearEnd\" name=\"yearEnd\">\n        <option value=\"\"></option>\n        <option value=\"2014\">2014</option>\n        <option value=\"2015\">2015</option>\n        <option value=\"2016\">2016</option>\n        <option value=\"2017\">2017</option>\n        <option value=\"2018\">2018</option>\n        <option value=\"2019\">2019</option>\n        <option value=\"2020\">2020</option>\n        <option value=\"2021\">2021</option>\n        <option value=\"2022\">2022</option>\n        <option value=\"2023\">2023</option>\n        <option value=\"2024\">2024</option>\n        <option value=\"2025\">2025</option>\n        <option value=\"2026\">2026</option>\n      </select>\n    </div>\n    \n    <div class=\"custom-select custom-select--month\">\n      <div class=\"custom-select-label\">Month</div>\n      <select class=\"month\" id=\"monthEnd\" name=\"monthEnd\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n      </select>\n    </div>\n\n    <div class=\"custom-select custom-select--day\">\n      <div class=\"custom-select-label\">Day</div>\n      <select class=\"day\" id=\"dayEnd\" name=\"dayEnd\">\n        <option value=\"\"></option>\n        <option value=\"01\">1</option>\n        <option value=\"02\">2</option>\n        <option value=\"03\">3</option>\n        <option value=\"04\">4</option>\n        <option value=\"05\">5</option>\n        <option value=\"06\">6</option>\n        <option value=\"07\">7</option>\n        <option value=\"08\">8</option>\n        <option value=\"09\">9</option>\n        <option value=\"10\">10</option>\n        <option value=\"11\">11</option>\n        <option value=\"12\">12</option>\n        <option value=\"13\">13</option>\n        <option value=\"14\">14</option>\n        <option value=\"15\">15</option>\n        <option value=\"16\">16</option>\n        <option value=\"17\">17</option>\n        <option value=\"18\">18</option>\n        <option value=\"19\">19</option>\n        <option value=\"20\">20</option>\n        <option value=\"21\">21</option>\n        <option value=\"22\">22</option>\n        <option value=\"23\">23</option>\n        <option value=\"24\">24</option>\n        <option value=\"25\">25</option>\n        <option value=\"26\">26</option>\n        <option value=\"27\">27</option>\n        <option value=\"28\">28</option>\n        <option value=\"29\">29</option>\n        <option value=\"30\">30</option>\n        <option value=\"31\">31</option>\n      </select>\n    </div>\n\n    \n\n  </div>\n\n</div>";
  })
},{"handleify":4}],24:[function(require,module,exports){
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

function program38(depth0,data) {
  
  
  return " interested_in_DYK = yes ";
  }

function program40(depth0,data) {
  
  
  return " interested_in_DYK = no ";
  }

function program42(depth0,data) {
  
  
  return " interested_in_Good_Articles = yes ";
  }

function program44(depth0,data) {
  
  
  return " interested_in_Good_Articles = no ";
  }

function program46(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(47, program47, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  return buffer;
  }
function program47(depth0,data) {
  
  
  return " | want_help_finding_articles = yes ";
  }

function program49(depth0,data) {
  
  var buffer = "", stack1, stack2;
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.request_help)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(50, program50, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  return buffer;
  }
function program50(depth0,data) {
  
  
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
    + "{{assignment grading | Completion of Wikipedia training | 1 point | \"Practice on-wiki communication\" exercise | 1 point | \"Copyedit an article\" exercise | 1 point | \"Evaluate an article\" exercise\" | 1 point | \"Add to an article\" exercise | 1 point | \"Illustrate an article\" exercise | 1 point | Quality of bibliography and outline | 2 points | Peer reviews and collaboration with classmates | 2 points | Participation in class discussions | 2 points | Quality of your main Wikipedia contributions | 10 points | Reflective essay | 2 points | Original argument paper | 10 points | In-class presentation of contributions | 2 points}}\n\n"
    + "{{course options | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk_ga),stack1 == null || stack1 === false ? stack1 : stack1.dyk)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(40, program40, data),fn:self.program(38, program38, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " | ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.dyk_ga),stack1 == null || stack1 === false ? stack1 : stack1.ga)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.program(44, program44, data),fn:self.program(42, program42, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.prepare_list)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(46, program46, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " ";
  stack2 = helpers['if'].call(depth0, ((stack1 = ((stack1 = depth0.choosing_articles),stack1 == null || stack1 === false ? stack1 : stack1.students_explore)),stack1 == null || stack1 === false ? stack1 : stack1.selected), {hash:{},inverse:self.noop,fn:self.program(49, program49, data),data:data});
  if(stack2 || stack2 === 0) { buffer += stack2; }
  buffer += " }}\n\n\n\n";
  return buffer;
  })
},{"handleify":4}],25:[function(require,module,exports){
var DateInputView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

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
    return this.closeIfNoValue();
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



},{}],26:[function(require,module,exports){
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



},{"../App":5,"../models/StepModel":12,"../templates/HomeTemplate.hbs":15,"../templates/steps/output/WikiOutputTemplate.hbs":24,"../views/StepNavView":30,"../views/StepView":31,"../views/supers/View":33}],27:[function(require,module,exports){
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



},{"../views/supers/InputView":32}],28:[function(require,module,exports){
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



},{"../App":5,"../data/WizardContent":7,"../templates/LoginTemplate.hbs":16,"../views/supers/View":33}],29:[function(require,module,exports){
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



},{"../App":5,"../data/WizardStepInputs":9,"../templates/steps/output/WikiOutputTemplate.hbs":24,"../views/supers/View":33}],30:[function(require,module,exports){
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
      console.log(application.homeView.stepViews[this.currentStep].hasUserAnswered);
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



},{"../App":5,"../templates/StepNavTemplate.hbs":17,"../views/supers/View":33}],31:[function(require,module,exports){
var AssignmentData, CourseInfoData, CourseTipTemplate, DateInputView, InputItemView, InputTipTemplate, IntroStepTemplate, StepTemplate, StepView, View, WikiDatesModule, WizardStepInputs, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

InputItemView = require('../views/InputItemView');

DateInputView = require('../views/DateInputView');

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
    var $dateInputs, $dates;
    this.tipVisible = false;
    if (this.model.get('stepNumber') === 1) {
      this.$el.addClass('step--first').html(this.introTemplate(this.model.attributes));
      $dates = $(this.datesModule());
      $dateInputs = $dates.find('.custom-select');
      $dateInputs.each(function() {
        var dateView;
        return dateView = new DateInputView({
          el: $(this)
        });
      });
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
    console.log(value);
    if (value === 'on') {
      this.hasUserAnswered = true;
    }
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



},{"../App":5,"../data/WizardAssignmentData":6,"../data/WizardCourseInfo":8,"../data/WizardStepInputs":9,"../templates/steps/IntroStepTemplate.hbs":18,"../templates/steps/StepTemplate.hbs":19,"../templates/steps/info/CourseTipTemplate.hbs":20,"../templates/steps/info/InputTipTemplate.hbs":21,"../templates/steps/modules/WikiDatesModule.hbs":23,"../views/DateInputView":25,"../views/InputItemView":27,"../views/supers/View":33}],32:[function(require,module,exports){
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
    'mouseenter label': 'hideShowTooltip',
    'mouseenter .check-button': 'hideShowTooltip',
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
    if (this.isDisabled()) {
      return false;
    }
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
      return $parentEl.addClass('checked');
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
      return this.$inputEl.trigger('change');
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
      return this.$inputEl.trigger('change');
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



},{"../../data/WizardAssignmentData":6,"../../data/WizardStepInputs":9,"../../templates/steps/inputs/InputItemTemplate.hbs":22,"./View":33}],33:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQXNzaWdubWVudERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvZGF0YS9XaXphcmRDb250ZW50LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkQ291cnNlSW5mby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZFN0ZXBJbnB1dHMuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaGVscGVycy9WaWV3SGVscGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21haW4uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kZWxzL1N0ZXBNb2RlbC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvc3VwZXJzL01vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3JvdXRlcnMvUm91dGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0xvZ2luVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL1N0ZXBOYXZUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL1N0ZXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvc3RlcHMvaW5mby9JbnB1dFRpcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9pbnB1dHMvSW5wdXRJdGVtVGVtcGxhdGUuaGJzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL3N0ZXBzL21vZHVsZXMvV2lraURhdGVzTW9kdWxlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3RlbXBsYXRlcy9zdGVwcy9vdXRwdXQvV2lraU91dHB1dFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0RhdGVJbnB1dFZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSG9tZVZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvSW5wdXRJdGVtVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9Mb2dpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvT3V0cHV0Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwTmF2Vmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9TdGVwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9zdXBlcnMvSW5wdXRWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9WaWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuRkE7QUFDQTtBQUNBOztBQ0lBLElBQUEsV0FBQTs7QUFBQSxXQUFBLEdBRUU7QUFBQSxFQUFBLFVBQUEsRUFBWSxTQUFBLEdBQUE7QUFHVixRQUFBLCtEQUFBO0FBQUEsSUFBQSxPQUFBLEdBQVUsT0FBQSxDQUFRLHNCQUFSLENBQVYsQ0FBQTtBQUFBLElBRUEsSUFBQyxD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O0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDblhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtB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Q0FBQSxDQUFYLENBQVgsQ0FBQSxDQUFBO0FBQUEsSUFFQSxJQUFDLENBQUEsV0FBRCxDQUFBLENBRkEsQ0FBQTtBQUlBLFdBQU8sSUFBUCxDQUxNO0VBQUEsQ0EzQlIsQ0FBQTs7QUFBQSxpQkFxQ0EsV0FBQSxHQUFhLFNBQUEsR0FBQSxDQXJDYixDQUFBOztBQXVDQTtBQUFBOzs7S0F2Q0E7O0FBMkNBO0FBQUE7OztLQTNDQTs7QUErQ0E7QUFBQTs7O0tBL0NBOztjQUFBOztHQUZpQixRQUFRLENBQUMsS0FGNUIsQ0FBQTs7QUFBQSxNQXVETSxDQUFDLE9BQVAsR0FBaUIsSUF2RGpCLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2hpbnQgZXFudWxsOiB0cnVlICovXG5cbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuXG52YXIgSGFuZGxlYmFycyA9IHt9O1xuXG4vLyBCRUdJTihCUk9XU0VSKVxuXG5IYW5kbGViYXJzLlZFUlNJT04gPSBcIjEuMC4wXCI7XG5IYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OID0gNDtcblxuSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTID0ge1xuICAxOiAnPD0gMS4wLnJjLjInLCAvLyAxLjAucmMuMiBpcyBhY3R1YWxseSByZXYyIGJ1dCBkb2Vzbid0IHJlcG9ydCBpdFxuICAyOiAnPT0gMS4wLjAtcmMuMycsXG4gIDM6ICc9PSAxLjAuMC1yYy40JyxcbiAgNDogJz49IDEuMC4wJ1xufTtcblxuSGFuZGxlYmFycy5oZWxwZXJzICA9IHt9O1xuSGFuZGxlYmFycy5wYXJ0aWFscyA9IHt9O1xuXG52YXIgdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGZ1bmN0aW9uVHlwZSA9ICdbb2JqZWN0IEZ1bmN0aW9uXScsXG4gICAgb2JqZWN0VHlwZSA9ICdbb2JqZWN0IE9iamVjdF0nO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyID0gZnVuY3Rpb24obmFtZSwgZm4sIGludmVyc2UpIHtcbiAgaWYgKHRvU3RyaW5nLmNhbGwobmFtZSkgPT09IG9iamVjdFR5cGUpIHtcbiAgICBpZiAoaW52ZXJzZSB8fCBmbikgeyB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oJ0FyZyBub3Qgc3VwcG9ydGVkIHdpdGggbXVsdGlwbGUgaGVscGVycycpOyB9XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5oZWxwZXJzLCBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICBpZiAoaW52ZXJzZSkgeyBmbi5ub3QgPSBpbnZlcnNlOyB9XG4gICAgdGhpcy5oZWxwZXJzW25hbWVdID0gZm47XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJQYXJ0aWFsID0gZnVuY3Rpb24obmFtZSwgc3RyKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQodGhpcy5wYXJ0aWFscywgIG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHRoaXMucGFydGlhbHNbbmFtZV0gPSBzdHI7XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihhcmcpIHtcbiAgaWYoYXJndW1lbnRzLmxlbmd0aCA9PT0gMikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBoZWxwZXI6ICdcIiArIGFyZyArIFwiJ1wiKTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2Jsb2NrSGVscGVyTWlzc2luZycsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGludmVyc2UgPSBvcHRpb25zLmludmVyc2UgfHwgZnVuY3Rpb24oKSB7fSwgZm4gPSBvcHRpb25zLmZuO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcblxuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmKGNvbnRleHQgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZm4odGhpcyk7XG4gIH0gZWxzZSBpZihjb250ZXh0ID09PSBmYWxzZSB8fCBjb250ZXh0ID09IG51bGwpIHtcbiAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgfSBlbHNlIGlmKHR5cGUgPT09IFwiW29iamVjdCBBcnJheV1cIikge1xuICAgIGlmKGNvbnRleHQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVycy5lYWNoKGNvbnRleHQsIG9wdGlvbnMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gaW52ZXJzZSh0aGlzKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGZuKGNvbnRleHQpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5LID0gZnVuY3Rpb24oKSB7fTtcblxuSGFuZGxlYmFycy5jcmVhdGVGcmFtZSA9IE9iamVjdC5jcmVhdGUgfHwgZnVuY3Rpb24ob2JqZWN0KSB7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBvYmplY3Q7XG4gIHZhciBvYmogPSBuZXcgSGFuZGxlYmFycy5LKCk7XG4gIEhhbmRsZWJhcnMuSy5wcm90b3R5cGUgPSBudWxsO1xuICByZXR1cm4gb2JqO1xufTtcblxuSGFuZGxlYmFycy5sb2dnZXIgPSB7XG4gIERFQlVHOiAwLCBJTkZPOiAxLCBXQVJOOiAyLCBFUlJPUjogMywgbGV2ZWw6IDMsXG5cbiAgbWV0aG9kTWFwOiB7MDogJ2RlYnVnJywgMTogJ2luZm8nLCAyOiAnd2FybicsIDM6ICdlcnJvcid9LFxuXG4gIC8vIGNhbiBiZSBvdmVycmlkZGVuIGluIHRoZSBob3N0IGVudmlyb25tZW50XG4gIGxvZzogZnVuY3Rpb24obGV2ZWwsIG9iaikge1xuICAgIGlmIChIYW5kbGViYXJzLmxvZ2dlci5sZXZlbCA8PSBsZXZlbCkge1xuICAgICAgdmFyIG1ldGhvZCA9IEhhbmRsZWJhcnMubG9nZ2VyLm1ldGhvZE1hcFtsZXZlbF07XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGVbbWV0aG9kXSkge1xuICAgICAgICBjb25zb2xlW21ldGhvZF0uY2FsbChjb25zb2xlLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuSGFuZGxlYmFycy5sb2cgPSBmdW5jdGlvbihsZXZlbCwgb2JqKSB7IEhhbmRsZWJhcnMubG9nZ2VyLmxvZyhsZXZlbCwgb2JqKTsgfTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignZWFjaCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIGZuID0gb3B0aW9ucy5mbiwgaW52ZXJzZSA9IG9wdGlvbnMuaW52ZXJzZTtcbiAgdmFyIGkgPSAwLCByZXQgPSBcIlwiLCBkYXRhO1xuXG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAob3B0aW9ucy5kYXRhKSB7XG4gICAgZGF0YSA9IEhhbmRsZWJhcnMuY3JlYXRlRnJhbWUob3B0aW9ucy5kYXRhKTtcbiAgfVxuXG4gIGlmKGNvbnRleHQgJiYgdHlwZW9mIGNvbnRleHQgPT09ICdvYmplY3QnKSB7XG4gICAgaWYoY29udGV4dCBpbnN0YW5jZW9mIEFycmF5KXtcbiAgICAgIGZvcih2YXIgaiA9IGNvbnRleHQubGVuZ3RoOyBpPGo7IGkrKykge1xuICAgICAgICBpZiAoZGF0YSkgeyBkYXRhLmluZGV4ID0gaTsgfVxuICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2ldLCB7IGRhdGE6IGRhdGEgfSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvcih2YXIga2V5IGluIGNvbnRleHQpIHtcbiAgICAgICAgaWYoY29udGV4dC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgICAgaWYoZGF0YSkgeyBkYXRhLmtleSA9IGtleTsgfVxuICAgICAgICAgIHJldCA9IHJldCArIGZuKGNvbnRleHRba2V5XSwge2RhdGE6IGRhdGF9KTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZihpID09PSAwKXtcbiAgICByZXQgPSBpbnZlcnNlKHRoaXMpO1xuICB9XG5cbiAgcmV0dXJuIHJldDtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdpZicsIGZ1bmN0aW9uKGNvbmRpdGlvbmFsLCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb25kaXRpb25hbCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb25kaXRpb25hbCA9IGNvbmRpdGlvbmFsLmNhbGwodGhpcyk7IH1cblxuICBpZighY29uZGl0aW9uYWwgfHwgSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbmRpdGlvbmFsKSkge1xuICAgIHJldHVybiBvcHRpb25zLmludmVyc2UodGhpcyk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuZm4odGhpcyk7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCd1bmxlc3MnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICByZXR1cm4gSGFuZGxlYmFycy5oZWxwZXJzWydpZiddLmNhbGwodGhpcywgY29uZGl0aW9uYWwsIHtmbjogb3B0aW9ucy5pbnZlcnNlLCBpbnZlcnNlOiBvcHRpb25zLmZufSk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignd2l0aCcsIGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgdmFyIHR5cGUgPSB0b1N0cmluZy5jYWxsKGNvbnRleHQpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29udGV4dCA9IGNvbnRleHQuY2FsbCh0aGlzKTsgfVxuXG4gIGlmICghSGFuZGxlYmFycy5VdGlscy5pc0VtcHR5KGNvbnRleHQpKSByZXR1cm4gb3B0aW9ucy5mbihjb250ZXh0KTtcbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdsb2cnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBsZXZlbCA9IG9wdGlvbnMuZGF0YSAmJiBvcHRpb25zLmRhdGEubGV2ZWwgIT0gbnVsbCA/IHBhcnNlSW50KG9wdGlvbnMuZGF0YS5sZXZlbCwgMTApIDogMTtcbiAgSGFuZGxlYmFycy5sb2cobGV2ZWwsIGNvbnRleHQpO1xufSk7XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WTSA9IHtcbiAgdGVtcGxhdGU6IGZ1bmN0aW9uKHRlbXBsYXRlU3BlYykge1xuICAgIC8vIEp1c3QgYWRkIHdhdGVyXG4gICAgdmFyIGNvbnRhaW5lciA9IHtcbiAgICAgIGVzY2FwZUV4cHJlc3Npb246IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbixcbiAgICAgIGludm9rZVBhcnRpYWw6IEhhbmRsZWJhcnMuVk0uaW52b2tlUGFydGlhbCxcbiAgICAgIHByb2dyYW1zOiBbXSxcbiAgICAgIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgICAgIHZhciBwcm9ncmFtV3JhcHBlciA9IHRoaXMucHJvZ3JhbXNbaV07XG4gICAgICAgIGlmKGRhdGEpIHtcbiAgICAgICAgICBwcm9ncmFtV3JhcHBlciA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbiwgZGF0YSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXByb2dyYW1XcmFwcGVyKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldID0gSGFuZGxlYmFycy5WTS5wcm9ncmFtKGksIGZuKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvZ3JhbVdyYXBwZXI7XG4gICAgICB9LFxuICAgICAgbWVyZ2U6IGZ1bmN0aW9uKHBhcmFtLCBjb21tb24pIHtcbiAgICAgICAgdmFyIHJldCA9IHBhcmFtIHx8IGNvbW1vbjtcblxuICAgICAgICBpZiAocGFyYW0gJiYgY29tbW9uKSB7XG4gICAgICAgICAgcmV0ID0ge307XG4gICAgICAgICAgSGFuZGxlYmFycy5VdGlscy5leHRlbmQocmV0LCBjb21tb24pO1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgcGFyYW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgcHJvZ3JhbVdpdGhEZXB0aDogSGFuZGxlYmFycy5WTS5wcm9ncmFtV2l0aERlcHRoLFxuICAgICAgbm9vcDogSGFuZGxlYmFycy5WTS5ub29wLFxuICAgICAgY29tcGlsZXJJbmZvOiBudWxsXG4gICAgfTtcblxuICAgIHJldHVybiBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICAgIHZhciByZXN1bHQgPSB0ZW1wbGF0ZVNwZWMuY2FsbChjb250YWluZXIsIEhhbmRsZWJhcnMsIGNvbnRleHQsIG9wdGlvbnMuaGVscGVycywgb3B0aW9ucy5wYXJ0aWFscywgb3B0aW9ucy5kYXRhKTtcblxuICAgICAgdmFyIGNvbXBpbGVySW5mbyA9IGNvbnRhaW5lci5jb21waWxlckluZm8gfHwgW10sXG4gICAgICAgICAgY29tcGlsZXJSZXZpc2lvbiA9IGNvbXBpbGVySW5mb1swXSB8fCAxLFxuICAgICAgICAgIGN1cnJlbnRSZXZpc2lvbiA9IEhhbmRsZWJhcnMuQ09NUElMRVJfUkVWSVNJT047XG5cbiAgICAgIGlmIChjb21waWxlclJldmlzaW9uICE9PSBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgaWYgKGNvbXBpbGVyUmV2aXNpb24gPCBjdXJyZW50UmV2aXNpb24pIHtcbiAgICAgICAgICB2YXIgcnVudGltZVZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2N1cnJlbnRSZXZpc2lvbl0sXG4gICAgICAgICAgICAgIGNvbXBpbGVyVmVyc2lvbnMgPSBIYW5kbGViYXJzLlJFVklTSU9OX0NIQU5HRVNbY29tcGlsZXJSZXZpc2lvbl07XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhbiBvbGRlciB2ZXJzaW9uIG9mIEhhbmRsZWJhcnMgdGhhbiB0aGUgY3VycmVudCBydW50aW1lLiBcIitcbiAgICAgICAgICAgICAgICBcIlBsZWFzZSB1cGRhdGUgeW91ciBwcmVjb21waWxlciB0byBhIG5ld2VyIHZlcnNpb24gKFwiK3J1bnRpbWVWZXJzaW9ucytcIikgb3IgZG93bmdyYWRlIHlvdXIgcnVudGltZSB0byBhbiBvbGRlciB2ZXJzaW9uIChcIitjb21waWxlclZlcnNpb25zK1wiKS5cIjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBVc2UgdGhlIGVtYmVkZGVkIHZlcnNpb24gaW5mbyBzaW5jZSB0aGUgcnVudGltZSBkb2Vzbid0IGtub3cgYWJvdXQgdGhpcyByZXZpc2lvbiB5ZXRcbiAgICAgICAgICB0aHJvdyBcIlRlbXBsYXRlIHdhcyBwcmVjb21waWxlZCB3aXRoIGEgbmV3ZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcnVudGltZSB0byBhIG5ld2VyIHZlcnNpb24gKFwiK2NvbXBpbGVySW5mb1sxXStcIikuXCI7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuICB9LFxuXG4gIHByb2dyYW1XaXRoRGVwdGg6IGZ1bmN0aW9uKGksIGZuLCBkYXRhIC8qLCAkZGVwdGggKi8pIHtcbiAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMyk7XG5cbiAgICB2YXIgcHJvZ3JhbSA9IGZ1bmN0aW9uKGNvbnRleHQsIG9wdGlvbnMpIHtcbiAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG4gICAgICByZXR1cm4gZm4uYXBwbHkodGhpcywgW2NvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhXS5jb25jYXQoYXJncykpO1xuICAgIH07XG4gICAgcHJvZ3JhbS5wcm9ncmFtID0gaTtcbiAgICBwcm9ncmFtLmRlcHRoID0gYXJncy5sZW5ndGg7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIHByb2dyYW06IGZ1bmN0aW9uKGksIGZuLCBkYXRhKSB7XG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuKGNvbnRleHQsIG9wdGlvbnMuZGF0YSB8fCBkYXRhKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IDA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH0sXG4gIG5vb3A6IGZ1bmN0aW9uKCkgeyByZXR1cm4gXCJcIjsgfSxcbiAgaW52b2tlUGFydGlhbDogZnVuY3Rpb24ocGFydGlhbCwgbmFtZSwgY29udGV4dCwgaGVscGVycywgcGFydGlhbHMsIGRhdGEpIHtcbiAgICB2YXIgb3B0aW9ucyA9IHsgaGVscGVyczogaGVscGVycywgcGFydGlhbHM6IHBhcnRpYWxzLCBkYXRhOiBkYXRhIH07XG5cbiAgICBpZihwYXJ0aWFsID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBmb3VuZFwiKTtcbiAgICB9IGVsc2UgaWYocGFydGlhbCBpbnN0YW5jZW9mIEZ1bmN0aW9uKSB7XG4gICAgICByZXR1cm4gcGFydGlhbChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKCFIYW5kbGViYXJzLmNvbXBpbGUpIHtcbiAgICAgIHRocm93IG5ldyBIYW5kbGViYXJzLkV4Y2VwdGlvbihcIlRoZSBwYXJ0aWFsIFwiICsgbmFtZSArIFwiIGNvdWxkIG5vdCBiZSBjb21waWxlZCB3aGVuIHJ1bm5pbmcgaW4gcnVudGltZS1vbmx5IG1vZGVcIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRpYWxzW25hbWVdID0gSGFuZGxlYmFycy5jb21waWxlKHBhcnRpYWwsIHtkYXRhOiBkYXRhICE9PSB1bmRlZmluZWR9KTtcbiAgICAgIHJldHVybiBwYXJ0aWFsc1tuYW1lXShjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMudGVtcGxhdGUgPSBIYW5kbGViYXJzLlZNLnRlbXBsYXRlO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG5cbn07XG4iLCJleHBvcnRzLmF0dGFjaCA9IGZ1bmN0aW9uKEhhbmRsZWJhcnMpIHtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLy8gQkVHSU4oQlJPV1NFUilcblxudmFyIGVycm9yUHJvcHMgPSBbJ2Rlc2NyaXB0aW9uJywgJ2ZpbGVOYW1lJywgJ2xpbmVOdW1iZXInLCAnbWVzc2FnZScsICduYW1lJywgJ251bWJlcicsICdzdGFjayddO1xuXG5IYW5kbGViYXJzLkV4Y2VwdGlvbiA9IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgdmFyIHRtcCA9IEVycm9yLnByb3RvdHlwZS5jb25zdHJ1Y3Rvci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuXG4gIC8vIFVuZm9ydHVuYXRlbHkgZXJyb3JzIGFyZSBub3QgZW51bWVyYWJsZSBpbiBDaHJvbWUgKGF0IGxlYXN0KSwgc28gYGZvciBwcm9wIGluIHRtcGAgZG9lc24ndCB3b3JrLlxuICBmb3IgKHZhciBpZHggPSAwOyBpZHggPCBlcnJvclByb3BzLmxlbmd0aDsgaWR4KyspIHtcbiAgICB0aGlzW2Vycm9yUHJvcHNbaWR4XV0gPSB0bXBbZXJyb3JQcm9wc1tpZHhdXTtcbiAgfVxufTtcbkhhbmRsZWJhcnMuRXhjZXB0aW9uLnByb3RvdHlwZSA9IG5ldyBFcnJvcigpO1xuXG4vLyBCdWlsZCBvdXQgb3VyIGJhc2ljIFNhZmVTdHJpbmcgdHlwZVxuSGFuZGxlYmFycy5TYWZlU3RyaW5nID0gZnVuY3Rpb24oc3RyaW5nKSB7XG4gIHRoaXMuc3RyaW5nID0gc3RyaW5nO1xufTtcbkhhbmRsZWJhcnMuU2FmZVN0cmluZy5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIHRoaXMuc3RyaW5nLnRvU3RyaW5nKCk7XG59O1xuXG52YXIgZXNjYXBlID0ge1xuICBcIiZcIjogXCImYW1wO1wiLFxuICBcIjxcIjogXCImbHQ7XCIsXG4gIFwiPlwiOiBcIiZndDtcIixcbiAgJ1wiJzogXCImcXVvdDtcIixcbiAgXCInXCI6IFwiJiN4Mjc7XCIsXG4gIFwiYFwiOiBcIiYjeDYwO1wiXG59O1xuXG52YXIgYmFkQ2hhcnMgPSAvWyY8PlwiJ2BdL2c7XG52YXIgcG9zc2libGUgPSAvWyY8PlwiJ2BdLztcblxudmFyIGVzY2FwZUNoYXIgPSBmdW5jdGlvbihjaHIpIHtcbiAgcmV0dXJuIGVzY2FwZVtjaHJdIHx8IFwiJmFtcDtcIjtcbn07XG5cbkhhbmRsZWJhcnMuVXRpbHMgPSB7XG4gIGV4dGVuZDogZnVuY3Rpb24ob2JqLCB2YWx1ZSkge1xuICAgIGZvcih2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICBpZih2YWx1ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICAgIG9ialtrZXldID0gdmFsdWVba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG5cbiAgZXNjYXBlRXhwcmVzc2lvbjogZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgLy8gZG9uJ3QgZXNjYXBlIFNhZmVTdHJpbmdzLCBzaW5jZSB0aGV5J3JlIGFscmVhZHkgc2FmZVxuICAgIGlmIChzdHJpbmcgaW5zdGFuY2VvZiBIYW5kbGViYXJzLlNhZmVTdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdHJpbmcudG9TdHJpbmcoKTtcbiAgICB9IGVsc2UgaWYgKHN0cmluZyA9PSBudWxsIHx8IHN0cmluZyA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBcIlwiO1xuICAgIH1cblxuICAgIC8vIEZvcmNlIGEgc3RyaW5nIGNvbnZlcnNpb24gYXMgdGhpcyB3aWxsIGJlIGRvbmUgYnkgdGhlIGFwcGVuZCByZWdhcmRsZXNzIGFuZFxuICAgIC8vIHRoZSByZWdleCB0ZXN0IHdpbGwgZG8gdGhpcyB0cmFuc3BhcmVudGx5IGJlaGluZCB0aGUgc2NlbmVzLCBjYXVzaW5nIGlzc3VlcyBpZlxuICAgIC8vIGFuIG9iamVjdCdzIHRvIHN0cmluZyBoYXMgZXNjYXBlZCBjaGFyYWN0ZXJzIGluIGl0LlxuICAgIHN0cmluZyA9IHN0cmluZy50b1N0cmluZygpO1xuXG4gICAgaWYoIXBvc3NpYmxlLnRlc3Qoc3RyaW5nKSkgeyByZXR1cm4gc3RyaW5nOyB9XG4gICAgcmV0dXJuIHN0cmluZy5yZXBsYWNlKGJhZENoYXJzLCBlc2NhcGVDaGFyKTtcbiAgfSxcblxuICBpc0VtcHR5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUgJiYgdmFsdWUgIT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSBpZih0b1N0cmluZy5jYWxsKHZhbHVlKSA9PT0gXCJbb2JqZWN0IEFycmF5XVwiICYmIHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIEVORChCUk9XU0VSKVxuXG5yZXR1cm4gSGFuZGxlYmFycztcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCdoYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMnKS5jcmVhdGUoKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcycpLmF0dGFjaChleHBvcnRzKVxucmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9ydW50aW1lLmpzJykuYXR0YWNoKGV4cG9ydHMpIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBXSUtJRURVIEFTU0lHTk1FTlQgREVTSUdOIFdJWkFSRFxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5BcHBsaWNhdGlvbiA9IFxuXG4gIGluaXRpYWxpemU6IC0+XG5cbiAgICAjIEFwcCBEYXRhXG4gICAgQXBwRGF0YSA9IHJlcXVpcmUoJy4vZGF0YS9XaXphcmRDb250ZW50JylcblxuICAgIEBkYXRhID0gQXBwRGF0YVxuXG5cbiAgICAjIEltcG9ydCB2aWV3c1xuICAgIEhvbWVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9Ib21lVmlldycpXG5cbiAgICBMb2dpblZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0xvZ2luVmlldycpXG5cbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuICAgIElucHV0SXRlbVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0lucHV0SXRlbVZpZXcnKVxuXG4gICAgT3V0cHV0VmlldyA9IHJlcXVpcmUoJy4vdmlld3MvT3V0cHV0VmlldycpXG5cblxuICAgICMgSW5pdGlhbGl6ZSB2aWV3c1xuICAgIEBob21lVmlldyA9IG5ldyBIb21lVmlldygpXG5cbiAgICBAbG9naW5WaWV3ID0gbmV3IExvZ2luVmlldygpXG5cbiAgICBAaW5wdXRJdGVtVmlldyA9IG5ldyBJbnB1dEl0ZW1WaWV3KClcblxuICAgIEBvdXRwdXRWaWV3ID0gbmV3IE91dHB1dFZpZXcoKVxuXG4gICAgQHJvdXRlciA9IG5ldyBSb3V0ZXIoKVxuXG4gICAgXG4gICAgXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uIiwibW9kdWxlLmV4cG9ydHMgPSBXaXphcmRBc3NpZ25tZW50RGF0YSA9IFtdIiwiV2l6YXJkQ29udGVudCA9IFtcbiAge1xuICAgIGlkOiBcImludHJvXCJcbiAgICB0aXRsZTogJ1dlbGNvbWUgdG8gdGhlIFdpa2lwZWRpYSBBc3NpZ25tZW50IFdpemFyZCEnXG4gICAgbG9naW5faW5zdHJ1Y3Rpb25zOiAnQ2xpY2sgTG9naW4gd2l0aCBXaWtpcGVkaWEgdG8gZ2V0IHN0YXJ0ZWQnXG4gICAgaW5zdHJ1Y3Rpb25zOiAnVGhpcyB0b29sIHdpbGwgd2FsayB5b3UgdGhyb3VnaCBiZXN0IHByYWN0aWNlcyBmb3IgV2lraXBlZGlhIGNsYXNzcm9vbSBhc3NpZ25tZW50cyBhbmQgaGVscCB5b3UgY3JlYXRlIGEgY3VzdG9taXplZCBzeWxsYWJ1cyBmb3IgeW91ciBjb3Vyc2UsIGJyb2tlbiBpbnRvIHdlZWtseSBhc3NpZ25tZW50cy48YnIvPjxici8+V2hlbiB5b3XigJlyZSBmaW5pc2hlZCwgeW91IGNhbiBwdWJsaXNoIGEgcmVhZHktdG8tdXNlIGxlc3NvbiBwbGFuIG9udG8gYSB3aWtpIHBhZ2UsIHdoZXJlIGl0IGNhbiBiZSBjdXN0b21pemVkIGV2ZW4gZnVydGhlci48YnIvPjxici8+TGV04oCZcyBzdGFydCBieSBmaWxsaW5nIGluIHNvbWUgYmFzaWNzIGFib3V0IHlvdSBhbmQgeW91ciBjb3Vyc2U6J1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiYXNzaWdubWVudF9zZWxlY3Rpb25cIlxuICAgIHRpdGxlOiAnQXNzaWdubWVudCB0eXBlIHNlbGVjdGlvbidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBhc3NpZ25tZW50IHNlbGVjdGlvbnMnXG4gICAgZm9ybVRpdGxlOiAnQXZhaWxhYmxlIGFzc2lnbm1lbnRzOidcbiAgICBpbnN0cnVjdGlvbnM6IFwiWW91IGNhbiB0ZWFjaCB3aXRoIFdpa2lwZWRpYSBpbiBzZXZlcmFsIGRpZmZlcmVudCB3YXlzLCBhbmQgaXQncyBpbXBvcnRhbnQgdG8gZGVzaWduIGFuIGFzc2lnbm1lbnQgdGhhdCBmaXRzIG9uIFdpa2lwZWRpYSBhbmQgYWNoaWV2ZXMgeW91ciBzdHVkZW50IGxlYXJuaW5nIG9iamVjdGl2ZXMuIFlvdXIgZmlyc3Qgc3RlcCBpcyB0byBjaG9vc2Ugd2hpY2ggYXNzaWdubWVudChzKSB5b3UnbGwgYmUgYXNraW5nIHlvdXIgc3R1ZGVudHMgdG8gY29tcGxldGUgYXMgcGFydCBvZiB0aGUgY291cnNlLiBXZSd2ZSBjcmVhdGVkIHNvbWUgZ3VpZGVsaW5lcyB0byBoZWxwIHlvdSwgYnV0IHlvdSdsbCBuZWVkIHRvIG1ha2Ugc29tZSBrZXkgZGVjaXNpb25zLCBzdWNoIGFzOiB3aGljaCBsZWFybmluZyBvYmplY3RpdmVzIGFyZSB5b3UgdGFyZ2V0aW5nIHdpdGggdGhpcyBhc3NpZ25tZW50PyBXaGF0IHNraWxscyBkbyB5b3VyIHN0dWRlbnRzIGFscmVhZHkgaGF2ZT8gSG93IG11Y2ggdGltZSBjYW4geW91IGRldm90ZSB0byB0aGUgYXNzaWdubWVudD9cIlxuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+TW9zdCBpbnN0cnVjdG9ycyBhc2sgdGhlaXIgc3R1ZGVudHMgdG8gd3JpdGUgYW4gYXJ0aWNsZS4gU3R1ZGVudHMgc3RhcnQgYnkgbGVhcm5pbmcgdGhlIGJhc2ljcyBvZiBXaWtpcGVkaWEsIGFuZCB0aGVuIHRoZXkgZm9jdXMgb24gdGhlIGNvbnRlbnQuIFRoZXkgcGxhbiwgcmVzZWFyY2gsIHdyaXRlLCBhbmQgcmV2aXNlIGEgcHJldmlvdXNseSBtaXNzaW5nIFdpa2lwZWRpYSBhcnRpY2xlIG9yIGNvbnRyaWJ1dGUgdG8gYW4gZXhpc3RpbmcgZW50cnkgb24gYSBjb3Vyc2UtcmVsYXRlZCB0b3BpYyB0aGF0IGlzIGluY29tcGxldGUuIFRoaXMgYXNzaWdubWVudCB0eXBpY2FsbHkgcmVwbGFjZXMgYSB0ZXJtIHBhcGVyIG9yIHJlc2VhcmNoIHByb2plY3QsIG9yIGl0IGZvcm1zIHRoZSBsaXRlcmF0dXJlIHJldmlldyBzZWN0aW9uIG9mIGEgbGFyZ2VyIHBhcGVyLiBUaGUgc3R1ZGVudCBsZWFybmluZyBvdXRjb21lIGlzIGhpZ2ggd2l0aCB0aGlzIGFzc2lnbm1lbnQsIGJ1dCBpdCBkb2VzIHRha2UgYSBzaWduaWZpY2FudCBhbW91bnQgb2YgdGltZS4gVG8gbGVhcm4gaG93IHRvIGNvbnRyaWJ1dGUgdG8gV2lraXBlZGlhLCB5b3VyIHN0dWRlbnRzIG5lZWQgdG8gbGVhcm4gYm90aCB0aGUgd2lraSBtYXJrdXAgbGFuZ3VhZ2UgYW5kIGtleSBwb2xpY2llcyBhbmQgZXhwZWN0YXRpb25zIG9mIHRoZSBXaWtpcGVkaWEtZWRpdGluZyBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXCI8cD5JZiB3cml0aW5nIGFuIGFydGljbGUgaXNuJ3QgcmlnaHQgZm9yIHlvdXIgY2xhc3MsIG90aGVyIGFzc2lnbm1lbnQgb3B0aW9ucyBzdGlsbCBnaXZlIHN0dWRlbnRzIHZhbHVhYmxlIGxlYXJuaW5nIG9wcG9ydHVuaXRpZXMgYXMgdGhleSBpbXByb3ZlIFdpa2lwZWRpYS4gU2VsZWN0IGFuIGFzc2lnbm1lbnQgdHlwZSB0byB0aGUgbGVmdCB0byBsZWFybiBtb3JlIGFib3V0IGVhY2ggYXNzaWdubWVudC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwibGVhcm5pbmdfZXNzZW50aWFsc1wiXG4gICAgdGl0bGU6ICdXaWtpcGVkaWEgZXNzZW50aWFscydcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lIG9yIG1vcmU6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IFdpa2lwZWRpYSBlc3NlbnRpYWxzJ1xuICAgIGluc3RydWN0aW9uczogXCJUbyBnZXQgc3RhcnRlZCwgeW91J2xsIHdhbnQgdG8gaW50cm9kdWNlIHlvdXIgc3R1ZGVudHMgdG8gdGhlIGJhc2ljIHJ1bGVzIG9mIHdyaXRpbmcgV2lraXBlZGlhIGFydGljbGVzIGFuZCB3b3JraW5nIHdpdGggdGhlIFdpa2lwZWRpYSBjb21tdW5pdHkuIEFzIHRoZWlyIGZpcnN0IFdpa2lwZWRpYSBhc3NpZ25tZW50IG1pbGVzdG9uZSwgeW91IGNhbiBhc2sgdGhlIHN0dWRlbnRzIHRvIGNyZWF0ZSBhY2NvdW50cyBhbmQgdGhlbiBjb21wbGV0ZSB0aGUgJydvbmxpbmUgdHJhaW5pbmcgZm9yIHN0dWRlbnRzJycuIFRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgZXhwbGFpbnMgZnVydGhlciBzb3VyY2VzIG9mIHN1cHBvcnQgYXMgdGhleSBjb250aW51ZSBhbG9uZy4gSXQgdGFrZXMgYWJvdXQgYW4gaG91ciBhbmQgZW5kcyB3aXRoIGEgY2VydGlmaWNhdGlvbiBzdGVwLCB3aGljaCB5b3UgY2FuIHVzZSB0byB2ZXJpZnkgdGhhdCBzdHVkZW50cyBjb21wbGV0ZWQgdGhlIHRyYWluaW5nLlwiXG4gICAgaW5wdXRzOiBbXVxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPlRoaXMgdHJhaW5pbmcgaW50cm9kdWNlcyB0aGUgV2lraXBlZGlhIGNvbW11bml0eSBhbmQgaG93IGl0IHdvcmtzLCBkZW1vbnN0cmF0ZXMgdGhlIGJhc2ljcyBvZiBlZGl0aW5nIGFuZCB3YWxrcyBzdHVkZW50cyB0aHJvdWdoIHRoZWlyIGZpcnN0IGVkaXRzLCBnaXZlcyBhZHZpY2UgZm9yIHNlbGVjdGluZyBhcnRpY2xlcyBhbmQgZHJhZnRpbmcgcmV2aXNpb25zLCBhbmQgY292ZXJzIHNvbWUgb2YgdGhlIHdheXMgdGhleSBjYW4gZmluZCBoZWxwIGFzIHRoZXkgZ2V0IHN0YXJ0ZWQuIEl0IHRha2VzIGFib3V0IGFuIGhvdXIgYW5kIGVuZHMgd2l0aCBhIGNlcnRpZmljYXRpb24gc3RlcCB0aGF0IHlvdSBjYW4gdXNlIHRvIHZlcmlmeSB0aGF0IHN0dWRlbnRzIGNvbXBsZXRlZCB0aGUgdHJhaW5pbmc8L3A+J1xuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQXNzaWdubWVudCBtaWxlc3RvbmVzOidcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHVsPlxuICAgICAgICAgICAgPGxpPkNyZWF0ZSBhIHVzZXIgYWNjb3VudCBhbmQgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT5Db21wbGV0ZSB0aGUgb25saW5lIHRyYWluaW5nIGZvciBzdHVkZW50cy4gRHVyaW5nIHRoaXMgdHJhaW5pbmcsIHlvdSB3aWxsIG1ha2UgZWRpdHMgaW4gYSBzYW5kYm94IGFuZCBsZWFybiB0aGUgYmFzaWMgcnVsZXMgb2YgV2lraXBlZGlhLiA8L2xpPlxuICAgICAgICAgICAgPGxpPlRvIHByYWN0aWNlIGVkaXRpbmcgYW5kIGNvbW11bmljYXRpbmcgb24gV2lraXBlZGlhLCBpbnRyb2R1Y2UgeW91cnNlbGYgdG8gYW55IFdpa2lwZWRpYW5zIGhlbHBpbmcgeW91ciBjbGFzcyAoc3VjaCBhcyBhIFdpa2lwZWRpYSBBbWJhc3NhZG9yKSwgYW5kIGxlYXZlIGEgbWVzc2FnZSBmb3IgYSBjbGFzc21hdGUgb24gdGhlaXIgdXNlciB0YWxrIHBhZ2UuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgICAgXCI8cD5XaWxsIGNvbXBsZXRpb24gb2YgdGhlIHN0dWRlbnQgdHJhaW5pbmcgYmUgcGFydCBvZiB5b3VyIHN0dWRlbnRzJyBncmFkZXM/PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gIH1cbiAge1xuICAgIGlkOiBcImdldHRpbmdfc3RhcnRlZFwiXG4gICAgdGl0bGU6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGVkaXRpbmcnXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIkl0IGlzIGltcG9ydGFudCBmb3Igc3R1ZGVudHMgdG8gc3RhcnQgZWRpdGluZyBXaWtpcGVkaWEgcmlnaHQgYXdheS4gVGhhdCB3YXksIHRoZXkgYmVjb21lIGZhbWlsaWFyIHdpdGggV2lraXBlZGlhJ3MgbWFya3VwIChcXFwid2lraXN5bnRheFxcXCIsIFxcXCJ3aWtpbWFya3VwXFxcIiwgb3IgXFxcIndpa2ljb2RlXFxcIikgYW5kIHRoZSBtZWNoYW5pY3Mgb2YgZWRpdGluZyBhbmQgY29tbXVuaWNhdGluZyBvbiB0aGUgc2l0ZS4gV2UgcmVjb21tZW5kIGFzc2lnbmluZyBhIGZldyBiYXNpYyBXaWtpcGVkaWEgdGFza3MgZWFybHkgb24uXCJcbiAgICBmb3JtVGl0bGU6ICdXaGljaCBiYXNpYyBhc3NpZ25tZW50cyB3b3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIGluIHlvdXIgY291cnNlPydcbiAgICBpbnB1dHM6IFtdXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICAnPHA+V2hpY2ggaW50cm9kdWN0b3J5IGFzc2lnbm1lbnRzIHdvdWxkIHlvdSBsaWtlIHRvIHVzZSB0byBhY2NsaW1hdGUgeW91ciBzdHVkZW50cyB0byBXaWtpcGVkaWE/IFlvdSBjYW4gc2VsZWN0IG5vbmUsIG9uZSwgb3IgbW9yZS4gV2hpY2hldmVyIHlvdSBzZWxlY3Qgd2lsbCBiZSBhZGRlZCB0byB0aGUgY291cnNlIHN5bGxhYnVzLjwvcD4nXG4gICAgICAgICAgJzx1bD5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNyaXRpcXVlIGFuIGFydGljbGUuPC9zdHJvbmc+IENyaXRpY2FsbHkgZXZhbHVhdGUgYW4gZXhpc3RpbmcgV2lraXBlZGlhIGFydGljbGUgcmVsYXRlZCB0byB0aGUgY2xhc3MsIGFuZCBsZWF2ZSBzdWdnZXN0aW9ucyBmb3IgaW1wcm92aW5nIGl0IG9uIHRoZSBhcnRpY2xl4oCZcyB0YWxrIHBhZ2UuIDwvbGk+XG4gICAgICAgICAgICA8bGk+PHN0cm9uZz5BZGQgdG8gYW4gYXJ0aWNsZS48L3N0cm9uZz4gVXNpbmcgY291cnNlIHJlYWRpbmdzIG9yIG90aGVyIHJlbGV2YW50IHNlY29uZGFyeSBzb3VyY2VzLCBhZGQgMeKAkzIgc2VudGVuY2VzIG9mIG5ldyBpbmZvcm1hdGlvbiB0byBhIFdpa2lwZWRpYSBhcnRpY2xlIHJlbGF0ZWQgdG8gdGhlIGNsYXNzLiBCZSBzdXJlIHRvIGludGVncmF0ZSBpdCB3ZWxsIGludG8gdGhlIGV4aXN0aW5nIGFydGljbGUsIGFuZCBpbmNsdWRlIGEgY2l0YXRpb24gdG8gdGhlIHNvdXJjZS4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPkNvcHllZGl0IGFuIGFydGljbGUuPC9zdHJvbmc+IEJyb3dzZSBXaWtpcGVkaWEgdW50aWwgeW91IGZpbmQgYW4gYXJ0aWNsZSB0aGF0IHlvdSB3b3VsZCBsaWtlIHRvIGltcHJvdmUsIGFuZCBtYWtlIHNvbWUgZWRpdHMgdG8gaW1wcm92ZSB0aGUgbGFuZ3VhZ2Ugb3IgZm9ybWF0dGluZy4gPC9saT5cbiAgICAgICAgICAgIDxsaT48c3Ryb25nPklsbHVzdHJhdGUgYW4gYXJ0aWNsZS48L3N0cm9uZz4gRmluZCBhbiBvcHBvcnR1bml0eSB0byBpbXByb3ZlIGFuIGFydGljbGUgYnkgY3JlYXRpbmcgYW5kIHVwbG9hZGluZyBhbiBvcmlnaW5hbCBwaG90b2dyYXBoIG9yIHZpZGVvLjwvbGk+XG4gICAgICAgICAgPC91bCdcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICB0aXRsZTogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgIGZvcm1UaXRsZTogJ1RoZXJlIGFyZSB0d28gcmVjb21tZW5kZWQgb3B0aW9ucyBmb3Igc2VsZWN0aW5nIGFydGljbGVzIGZvciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgIGluZm9UaXRsZTogJ0Fib3V0IGNob29zaW5nIGFydGljbGVzJ1xuICAgIGluc3RydWN0aW9uczogJ0Nob29zaW5nIHRoZSByaWdodCAob3Igd3JvbmcpIGFydGljbGVzIHRvIHdvcmsgb24gY2FuIG1ha2UgKG9yIGJyZWFrKSBhIFdpa2lwZWRpYSB3cml0aW5nIGFzc2lnbm1lbnQuJ1xuICAgIGlucHV0czogW11cbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgICc8cD5Tb21lIGFydGljbGVzIG1heSBpbml0aWFsbHkgbG9vayBlYXN5IHRvIGltcHJvdmUsIGJ1dCBxdWFsaXR5IHJlZmVyZW5jZXMgdG8gZXhwYW5kIHRoZW0gbWF5IGJlIGRpZmZpY3VsdCB0byBmaW5kLiBGaW5kaW5nIHRvcGljcyB3aXRoIHRoZSByaWdodCBiYWxhbmNlIGJldHdlZW4gcG9vciBXaWtpcGVkaWEgY292ZXJhZ2UgYW5kIGF2YWlsYWJsZSBsaXRlcmF0dXJlIGZyb20gd2hpY2ggdG8gZXhwYW5kIHRoYXQgY292ZXJhZ2UgY2FuIGJlIHRyaWNreS4gSGVyZSBhcmUgc29tZSBndWlkZWxpbmVzIHRvIGtlZXAgaW4gbWluZCB3aGVuIHNlbGVjdGluZyBhcnRpY2xlcyBmb3IgaW1wcm92ZW1lbnQuPC9wPidcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ05vdCBzdWNoIGEgZ29vZCBjaG9pY2UnXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFydGljbGVzIHRoYXQgYXJlIFwibm90IHN1Y2ggYSBnb29kIGNob2ljZVwiIGZvciBuZXdjb21lcnMgdXN1YWxseSBpbnZvbHZlIGEgbGFjayBvZiBhcHByb3ByaWF0ZSByZXNlYXJjaCBtYXRlcmlhbCwgaGlnaGx5IGNvbnRyb3ZlcnNpYWwgdG9waWNzIHRoYXQgbWF5IGFscmVhZHkgYmUgd2VsbCBkZXZlbG9wZWQsIGJyb2FkIHN1YmplY3RzLCBvciB0b3BpY3MgZm9yIHdoaWNoIGl0IGlzIGRpZmZpY3VsdCB0byBkZW1vbnN0cmF0ZSBub3RhYmlsaXR5LjwvcD4nXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+WW91IHByb2JhYmx5IHNob3VsZG4ndCB0cnkgdG8gY29tcGxldGVseSBvdmVyaGF1bCBhcnRpY2xlcyBvbiB2ZXJ5IGJyb2FkIHRvcGljcyAoZS5nLiwgTGF3KS48L2xpPlxuICAgICAgICAgICAgPGxpPllvdSBzaG91bGQgcHJvYmFibHkgYXZvaWQgdHJ5aW5nIHRvIGltcHJvdmUgYXJ0aWNsZXMgb24gdG9waWNzIHRoYXQgYXJlIGhpZ2hseSBjb250cm92ZXJzaWFsIChlLmcuLCBHbG9iYWwgV2FybWluZywgQWJvcnRpb24sIFNjaWVudG9sb2d5LCBldGMuKS4gWW91IG1heSBiZSBtb3JlIHN1Y2Nlc3NmdWwgc3RhcnRpbmcgYSBzdWItYXJ0aWNsZSBvbiB0aGUgdG9waWMgaW5zdGVhZC48L2xpPlxuICAgICAgICAgICAgPGxpPkRvbid0IHdvcmsgb24gYW4gYXJ0aWNsZSB0aGF0IGlzIGFscmVhZHkgb2YgaGlnaCBxdWFsaXR5IG9uIFdpa2lwZWRpYSwgdW5sZXNzIHlvdSBkaXNjdXNzIGEgc3BlY2lmaWMgcGxhbiBmb3IgaW1wcm92aW5nIGl0IHdpdGggb3RoZXIgZWRpdG9ycyBiZWZvcmVoYW5kLjwvbGk+XG4gICAgICAgICAgICA8bGk+QXZvaWQgd29ya2luZyBvbiBzb21ldGhpbmcgd2l0aCBzY2FyY2UgbGl0ZXJhdHVyZS4gV2lraXBlZGlhIGFydGljbGVzIGNpdGUgc2Vjb25kYXJ5IGxpdGVyYXR1cmUgc291cmNlcywgc28gaXQncyBpbXBvcnRhbnQgdG8gaGF2ZSBlbm91Z2ggc291cmNlcyBmb3IgdmVyaWZpY2F0aW9uIGFuZCB0byBwcm92aWRlIGEgbmV1dHJhbCBwb2ludCBvZiB2aWV3LjwvbGk+XG4gICAgICAgICAgICA8bGk+RG9uJ3Qgc3RhcnQgYXJ0aWNsZXMgd2l0aCB0aXRsZXMgdGhhdCBpbXBseSBhbiBhcmd1bWVudCBvciBlc3NheS1saWtlIGFwcHJvYWNoIChlLmcuLCBUaGUgRWZmZWN0cyBUaGF0IFRoZSBSZWNlbnQgU3ViLVByaW1lIE1vcnRnYWdlIENyaXNpcyBoYXMgaGFkIG9uIHRoZSBVUyBhbmQgR2xvYmFsIEVjb25vbWljcykuIFRoZXNlIHR5cGUgb2YgdGl0bGVzLCBhbmQgbW9zdCBsaWtlbHkgdGhlIGNvbnRlbnQgdG9vLCBtYXkgbm90IGJlIGFwcHJvcHJpYXRlIGZvciBhbiBlbmN5Y2xvcGVkaWEuPC9saT5cbiAgICAgICAgICA8L3VsPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICdHb29kIGNob2ljZSdcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjx1bD5cbiAgICAgICAgICAgIDxsaT5DaG9vc2UgYSB3ZWxsLWVzdGFibGlzaGVkIHRvcGljIGZvciB3aGljaCBhIGxvdCBvZiBsaXRlcmF0dXJlIGlzIGF2YWlsYWJsZSBpbiBpdHMgZmllbGQsIGJ1dCB3aGljaCBpc24ndCBjb3ZlcmVkIGV4dGVuc2l2ZWx5IG9uIFdpa2lwZWRpYS48L2xpPlxuICAgICAgICAgICAgPGxpPkdyYXZpdGF0ZSB0b3dhcmQgXFxcInN0dWJcXFwiIGFuZCBcXFwic3RhcnRcXFwiIGNsYXNzIGFydGljbGVzLiBUaGVzZSBhcnRpY2xlcyBvZnRlbiBoYXZlIG9ubHkgMS0yIHBhcmFncmFwaHMgb2YgaW5mb3JtYXRpb24gYW5kIGFyZSBpbiBuZWVkIG9mIGV4cGFuc2lvbi4gKlJlbGV2YW50IFdpa2lQcm9qZWN0IHBhZ2VzIGNhbiBwcm92aWRlIGEgbGlzdCBvZiBzdHVicyB0aGF0IG5lZWQgaW1wcm92ZW1lbnQuPC9saT5cbiAgICAgICAgICAgIDxsaT5CZWZvcmUgY3JlYXRpbmcgYSBuZXcgYXJ0aWNsZSwgc2VhcmNoIHJlbGF0ZWQgdG9waWNzIG9uIFdpa2lwZWRpYSB0byBtYWtlIHN1cmUgeW91ciB0b3BpYyBpc24ndCBhbHJlYWR5IGNvdmVyZWQgZWxzZXdoZXJlLiBPZnRlbiwgYW4gYXJ0aWNsZSBtYXkgZXhpc3QgdW5kZXIgYW5vdGhlciBuYW1lLCBvciB0aGUgdG9waWMgbWF5IGJlIGNvdmVyZWQgYXMgYSBzdWJzZWN0aW9uIG9mIGEgYnJvYWRlciBhcnRpY2xlLjwvbGk+XG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgJzxwPkFzIHRoZSBpbnN0cnVjdG9yLCB5b3Ugc2hvdWxkIGFwcGx5IHlvdXIgb3duIGV4cGVydGlzZSB0byBleGFtaW5pbmcgV2lraXBlZGlh4oCZcyBjb3ZlcmFnZSBvZiB5b3VyIGZpZWxkLiBZb3UgdW5kZXJzdGFuZCB0aGUgYnJvYWRlciBpbnRlbGxlY3R1YWwgY29udGV4dCB3aGVyZSBpbmRpdmlkdWFsIHRvcGljcyBmaXQgaW4sIHlvdSBjYW4gcmVjb2duaXplIHdoZXJlIFdpa2lwZWRpYSBmYWxscyBzaG9ydCwgeW91IGtub3figJRvciBrbm93IGhvdyB0byBmaW5k4oCUdGhlIHJlbGV2YW50IGxpdGVyYXR1cmUsIGFuZCB5b3Uga25vdyB3aGF0IHRvcGljcyB5b3VyIHN0dWRlbnRzIHNob3VsZCBiZSBhYmxlIHRvIGhhbmRsZS4gWW91ciBndWlkYW5jZSBvbiBhcnRpY2xlIGNob2ljZSBhbmQgc291cmNpbmcgaXMgY3JpdGljYWwgZm9yIGJvdGggeW91ciBzdHVkZW50c+KAmSBzdWNjZXNzIGFuZCB0aGUgaW1wcm92ZW1lbnQgb2YgV2lraXBlZGlhLjwvcD4nXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICAgIFxuICAgIF1cbiAgfVxuICB7XG4gICAgaWQ6IFwicmVzZWFyY2hfcGxhbm5pbmdcIlxuICAgIHRpdGxlOiAnUmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgIGZvcm1UaXRsZTogJ0hvdyBzaG91bGQgc3R1ZGVudHMgcGxhbiB0aGVpciBhcnRpY2xlcz8nXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgcmVzZWFyY2ggYW5kIHBsYW5uaW5nJ1xuICAgIGluc3RydWN0aW9uczogIFwiU3R1ZGVudHMgb2Z0ZW4gd2FpdCB1bnRpbCB0aGUgbGFzdCBtaW51dGUgdG8gZG8gdGhlaXIgcmVzZWFyY2gsIG9yIGNob29zZSBzb3VyY2VzIHVuc3VpdGVkIGZvciBXaWtpcGVkaWEuIFRoYXQncyB3aHkgd2UgcmVjb21tZW5kIGFza2luZyBzdHVkZW50cyB0byBwdXQgdG9nZXRoZXIgYSBiaWJsaW9ncmFwaHkgb2YgbWF0ZXJpYWxzIHRoZXkgd2FudCB0byB1c2UgaW4gZWRpdGluZyB0aGUgYXJ0aWNsZSwgd2hpY2ggY2FuIHRoZW4gYmUgYXNzZXNzZWQgYnkgeW91IGFuZCBvdGhlciBXaWtpcGVkaWFucy5cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5UaGVuLCBzdHVkZW50cyBzaG91bGQgcHJvcG9zZSBvdXRsaW5lcyBmb3IgdGhlaXIgYXJ0aWNsZXMuIFRoaXMgY2FuIGJlIGEgdHJhZGl0aW9uYWwgb3V0bGluZSwgaW4gd2hpY2ggc3R1ZGVudHMgaWRlbnRpZnkgd2hpY2ggc2VjdGlvbnMgdGhlaXIgYXJ0aWNsZXMgd2lsbCBoYXZlIGFuZCB3aGljaCBhc3BlY3RzIG9mIHRoZSB0b3BpYyB3aWxsIGJlIGNvdmVyZWQgaW4gZWFjaCBzZWN0aW9uLiBBbHRlcm5hdGl2ZWx5LCBzdHVkZW50cyBjYW4gZGV2ZWxvcCBlYWNoIG91dGxpbmUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uIOKAlCB0aGUgdW50aXRsZWQgc2VjdGlvbiBhdCB0aGUgYmVnaW5uaW5nIG9mIGFuIGFydGljbGUgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcHJvdmlkZSBhIGNvbmNpc2Ugc3VtbWFyeSBvZiBpdHMgY29udGVudC4gV291bGQgeW91IGxpa2UgeW91ciBzdHVkZW50cyB0byBjcmVhdGUgdHJhZGl0aW9uYWwgb3V0bGluZXMsIG9yIGNvbXBvc2Ugb3V0bGluZXMgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEtc3R5bGUgbGVhZCBzZWN0aW9uPzwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwiZHJhZnRzX21haW5zcGFjZVwiXG4gICAgdGl0bGU6ICdEcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICBmb3JtVGl0bGU6ICdDaG9vc2Ugb25lOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBkcmFmdHMgYW5kIG1haW5zcGFjZSdcbiAgICBpbnN0cnVjdGlvbnM6ICdPbmNlIHN0dWRlbnRzIGhhdmUgZ290dGVuIGEgZ3JpcCBvbiB0aGVpciB0b3BpY3MgYW5kIHRoZSBzb3VyY2VzIHRoZXkgd2lsbCB1c2UgdG8gd3JpdGUgYWJvdXQgdGhlbSwgaXTigJlzIHRpbWUgdG8gc3RhcnQgd3JpdGluZyBvbiBXaWtpcGVkaWEuIFlvdSBjYW4gYXNrIHRoZW0gdG8ganVtcCByaWdodCBpbiBhbmQgZWRpdCBsaXZlLCBvciBzdGFydCB0aGVtIG9mZiBpbiB0aGVpciBvd24gc2FuZGJveGVzLiBUaGVyZSBhcmUgcHJvcyBhbmQgY29ucyB0byBlYWNoIGFwcHJvYWNoLidcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+UHJvcyBhbmQgY29ucyB0byBzYW5kYm94ZXM6IFNhbmRib3hlcyBtYWtlIHN0dWRlbnRzIGZlZWwgc2FmZSBiZWNhdXNlIHRoZXkgY2FuIGVkaXQgd2l0aG91dCB0aGUgcHJlc3N1cmUgb2YgdGhlIHdob2xlIHdvcmxkIHJlYWRpbmcgdGhlaXIgZHJhZnRzLCBvciBvdGhlciBXaWtpcGVkaWFucyBhbHRlcmluZyB0aGVpciB3cml0aW5nLiBIb3dldmVyLCBzYW5kYm94IGVkaXRpbmcgbGltaXRzIG1hbnkgb2YgdGhlIHVuaXF1ZSBhc3BlY3RzIG9mIFdpa2lwZWRpYSBhcyBhIHRlYWNoaW5nIHRvb2wsIHN1Y2ggYXMgY29sbGFib3JhdGl2ZSB3cml0aW5nIGFuZCBpbmNyZW1lbnRhbCBkcmFmdGluZy4gU3BlbmRpbmcgbW9yZSB0aGFuIGEgd2VlayBvciB0d28gaW4gc2FuZGJveGVzIGlzIHN0cm9uZ2x5IGRpc2NvdXJhZ2VkLjwvcD5cIlxuICAgICAgICAgIFwiPHA+UHJvcyBhbmQgY29ucyB0byBlZGl0aW5nIGxpdmU6IEVkaXRpbmcgbGl2ZSBpcyBleGNpdGluZyBmb3IgdGhlIHN0dWRlbnRzIGJlY2F1c2UgdGhleSBjYW4gc2VlIHRoZWlyIGNoYW5nZXMgdG8gdGhlIGFydGljbGVzIGltbWVkaWF0ZWx5IGFuZCBleHBlcmllbmNlIHRoZSBjb2xsYWJvcmF0aXZlIGVkaXRpbmcgcHJvY2VzcyB0aHJvdWdob3V0IHRoZSBhc3NpZ25tZW50LiBIb3dldmVyLCBiZWNhdXNlIG5ldyBlZGl0b3JzIG9mdGVuIHVuaW50ZW50aW9uYWxseSBicmVhayBXaWtpcGVkaWEgcnVsZXMsIHNvbWV0aW1lcyBzdHVkZW50c+KAmSBhZGRpdGlvbnMgYXJlIHF1ZXN0aW9uZWQgb3IgcmVtb3ZlZC48L3A+XCJcbiAgICAgICAgICBcIjxwPldpbGwgeW91IGhhdmUgeW91ciBzdHVkZW50cyBkcmFmdCB0aGVpciBlYXJseSB3b3JrIGluIHNhbmRib3hlcywgb3Igd29yayBsaXZlIGZyb20gdGhlIGJlZ2lubmluZz88L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcInBlZXJfZmVlZGJhY2tcIlxuICAgIHRpdGxlOiAnUGVlciBmZWVkYmFjaydcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBwZWVyIGZlZWRiYWNrJ1xuICAgIGZvcm1UaXRsZTogXCJIb3cgbWFueSBwZWVyIHJldmlld3Mgc2hvdWxkIGVhY2ggc3R1ZGVudCBjb25kdWN0P1wiXG4gICAgaW5zdHJ1Y3Rpb25zOiBcIkNvbGxhYm9yYXRpb24gaXMgYSBjcml0aWNhbCBlbGVtZW50IG9mIGNvbnRyaWJ1dGluZyB0byBXaWtpcGVkaWEuXCJcbiAgICBzZWN0aW9uczogW1xuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+Rm9yIHNvbWUgc3R1ZGVudHMsIHRoaXMgd2lsbCBoYXBwZW4gc3BvbnRhbmVvdXNseTsgdGhlaXIgY2hvaWNlIG9mIHRvcGljcyB3aWxsIGF0dHJhY3QgaW50ZXJlc3RlZCBXaWtpcGVkaWFucyB3aG8gd2lsbCBwaXRjaCBpbiB3aXRoIGlkZWFzLCBjb3B5ZWRpdHMsIG9yIGV2ZW4gc3Vic3RhbnRpYWwgY29udHJpYnV0aW9ucyB0byB0aGUgc3R1ZGVudHPigJkgYXJ0aWNsZXMuIEluIG1hbnkgY2FzZXMsIGhvd2V2ZXIsIHRoZXJlIHdpbGwgYmUgbGl0dGxlIHNwb250YW5lb3VzIGVkaXRpbmcgb2Ygc3R1ZGVudHPigJkgYXJ0aWNsZXMgYmVmb3JlIHRoZSBlbmQgb2YgdGhlIHRlcm0uIEZvcnR1bmF0ZWx5LCB5b3UgaGF2ZSBhIGNsYXNzcm9vbSBmdWxsIG9mIHBlZXIgcmV2aWV3ZXJzLiBZb3UgY2FuIG1ha2UgdGhlIG1vc3Qgb2YgdGhpcyBieSBhc3NpZ25pbmcgc3R1ZGVudHMgdG8gcmV2aWV3IGVhY2ggb3RoZXJz4oCZIGFydGljbGVzIHNvb24gYWZ0ZXIgZnVsbC1sZW5ndGggZHJhZnRzIGFyZSBwb3N0ZWQuIFRoaXMgZ2l2ZXMgc3R1ZGVudHMgcGxlbnR5IG9mIHRpbWUgdG8gYWN0IG9uIHRoZSBhZHZpY2Ugb2YgdGhlaXIgcGVlcnMuPC9wPlwiXG4gICAgICAgICAgXCI8cD5Ib3cgbWFueSBwZWVyIHJldmlld3Mgd2lsbCB5b3UgYXNrIGVhY2ggc3R1ZGVudCB0byBjb250cmlidXRlIGR1cmluZyB0aGUgY291cnNlPzwvcD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgXVxuICAgIGlucHV0czogW11cbiAgfVxuICB7XG4gICAgaWQ6IFwic3VwcGxlbWVudGFyeV9hc3NpZ25tZW50c1wiXG4gICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgIGZvcm1UaXRsZTogJ0Nob29zZSBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzOidcbiAgICBpbmZvVGl0bGU6ICdBYm91dCBzdXBwbGVtZW50YXJ5IGFzc2lnbm1lbnRzJ1xuICAgIGluc3RydWN0aW9uczogXCJCeSB0aGUgdGltZSBzdHVkZW50cyBoYXZlIG1hZGUgaW1wcm92ZW1lbnRzIGJhc2VkIG9uIGNsYXNzbWF0ZXMnIGNvbW1lbnRz4oCUYW5kIGlkZWFsbHkgc3VnZ2VzdGlvbnMgZnJvbSB5b3UgYXMgd2VsbOKAlHRoZXkgc2hvdWxkIGhhdmUgcHJvZHVjZWQgbmVhcmx5IGNvbXBsZXRlIGFydGljbGVzLiBOb3cgaXMgdGhlIGNoYW5jZSB0byBlbmNvdXJhZ2UgdGhlbSB0byB3YWRlIGEgbGl0dGxlIGRlZXBlciBpbnRvIFdpa2lwZWRpYSBhbmQgaXRzIG5vcm1zIGFuZCBjcml0ZXJpYSB0byBjcmVhdGUgZ3JlYXQgY29udGVudC4gWW914oCZbGwgcHJvYmFibHkgaGF2ZSBkaXNjdXNzZWQgbWFueSBvZiB0aGUgY29yZSBwcmluY2lwbGVzIG9mIFdpa2lwZWRpYeKAlGFuZCByZWxhdGVkIGlzc3VlcyB5b3Ugd2FudCB0byBmb2N1cyBvbuKAlGJ1dCBub3cgdGhhdCB0aGV54oCZdmUgZXhwZXJpZW5jZWQgZmlyc3QtaGFuZCBob3cgV2lraXBlZGlhIHdvcmtzLCB0aGlzIGlzIGEgZ29vZCB0aW1lIHRvIHJldHVybiB0byB0b3BpY3MgbGlrZSBuZXV0cmFsaXR5LCBtZWRpYSBmbHVlbmN5LCBhbmQgdGhlIGltcGFjdHMgYW5kIGxpbWl0cyBvZiBXaWtpcGVkaWEuIENvbnNpZGVyIGJyaW5naW5nIGluIGEgZ3Vlc3Qgc3BlYWtlciwgaGF2aW5nIGEgcGFuZWwgZGlzY3Vzc2lvbiwgb3Igc2ltcGx5IGhhdmluZyBhbiBvcGVuIGRpc2N1c3Npb24gaW4gY2xhc3MgYWJvdXQgd2hhdCB0aGUgc3R1ZGVudHMgaGF2ZSBkb25lIHNvIGZhciBhbmQgd2h5IChvciB3aGV0aGVyKSBpdCBtYXR0ZXJzLlwiXG4gICAgc2VjdGlvbnM6IFtcbiAgICAgIHtcbiAgICAgICAgdGl0bGU6ICcnXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgIFwiPHA+SW4gYWRkaXRpb24gdG8gdGhlIFdpa2lwZWRpYSBhcnRpY2xlIHdyaXRpbmcgaXRzZWxmLCB5b3UgbWF5IHdhbnQgdG8gdXNlIGEgc3VwcGxlbWVudGFyeSBhc3NpZ25tZW50LiBUaGVzZSBhc3NpZ25tZW50cyBjYW4gcmVpbmZvcmNlIGFuZCBkZWVwZW4geW91ciBjb3Vyc2UncyBsZWFybmluZyBvdXRjb21lcywgYW5kIGFsc28gaGVscCB5b3UgdG8gdW5kZXJzdGFuZCBhbmQgZXZhbHVhdGUgdGhlIHN0dWRlbnRzJyB3b3JrIGFuZCBsZWFybmluZyBvdXRjb21lcy4gSGVyZSBhcmUgc29tZSBvZiB0aGUgZWZmZWN0aXZlIHN1cHBsZW1lbnRhcnkgYXNzaWdubWVudHMgdGhhdCBpbnN0cnVjdG9ycyBvZnRlbiB1c2UuIFNjcm9sbCBvdmVyIGVhY2ggZm9yIG1vcmUgaW5mb3JtYXRpb24sIGFuZCBzZWxlY3QgYW55IHRoYXQgeW91IHdpc2ggdG8gdXNlIGZvciB5b3VyIGNvdXJzZS48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImR5a19nYVwiXG4gICAgdGl0bGU6ICdEWUsgYW5kIEdvb2QgQXJ0aWNsZSBwcm9jZXNzZXMnXG4gICAgaW5mb1RpdGxlOiAnQWJvdXQgRFlLIGFuZCBHb29kIEFydGljbGUgcHJvY2Vzc2VzJ1xuICAgIGZvcm1UaXRsZTogXCJXb3VsZCB5b3UgbGlrZSB0byBpbmNsdWRlIHRoZXNlIGFzIGFuIHVuZ3JhZGVkIG9wdGlvbiBmb3IgeW91ciBzdHVkZW50cz9cIlxuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnJ1xuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5BZHZhbmNlZCBzdHVkZW50c+KAmSBhcnRpY2xlcyBtYXkgcXVhbGlmeSBmb3Igc3VibWlzc2lvbiB0byBEaWQgWW91IEtub3cgKERZSyksIGEgc2VjdGlvbiBvbiBXaWtpcGVkaWHigJlzIG1haW4gcGFnZSBmZWF0dXJpbmcgbmV3IGNvbnRlbnQuIFRoZSBnZW5lcmFsIGNyaXRlcmlhIGZvciBEWUsgZWxpZ2liaWxpdHkgYXJlIHRoYXQgYW4gYXJ0aWNsZSBpcyBsYXJnZXIgdGhhbiAxLDUwMCBjaGFyYWN0ZXJzIG9mIG9yaWdpbmFsLCB3ZWxsLXNvdXJjZWQgY29udGVudCAoYWJvdXQgZm91ciBwYXJhZ3JhcGhzKSBhbmQgdGhhdCBpdCBoYXMgYmVlbiBjcmVhdGVkIG9yIGV4cGFuZGVkIChieSBhIGZhY3RvciBvZiA1eCkgd2l0aGluIHRoZSBsYXN0IHNldmVuIGRheXMuPC9wPlwiXG4gICAgICAgICAgXCI8cD5UaGUgc2hvcnQgd2luZG93IG9mIGVsaWdpYmlsaXR5LCBhbmQgdGhlIHN0cmljdCBydWxlcyBvZiB0aGUgbm9taW5hdGlvbiBwcm9jZXNzLCBjYW4gbWFrZSBpdCBjaGFsbGVuZ2luZyB0byBpbmNvcnBvcmF0ZSBEWUsgaW50byBhIGNsYXNzcm9vbSBwcm9qZWN0LiBUaGUgRFlLIHByb2Nlc3Mgc2hvdWxkIG5vdCBiZSBhIHJlcXVpcmVkIHBhcnQgb2YgeW91ciBhc3NpZ25tZW50LCBidXQgaXQgY2FuIGJlIGEgZ3JlYXQgb3Bwb3J0dW5pdHkgdG8gZ2V0IHN0dWRlbnRzIGV4Y2l0ZWQgYWJvdXQgdGhlaXIgd29yay4gQSB0eXBpY2FsIERZSyBhcnRpY2xlIHdpbGwgYmUgdmlld2VkIGh1bmRyZWRzIG9yIHRob3VzYW5kcyBvZiB0aW1lcyBkdXJpbmcgaXRzIDYgaG91cnMgaW4gdGhlIHNwb3RsaWdodC48L3A+XCJcbiAgICAgICAgICBcIjxwPldlIHN0cm9uZ2x5IHJlY29tbWVuZCB0cnlpbmcgZm9yIERZSyBzdGF0dXMgeW91cnNlbGYgYmVmb3JlaGFuZCwgb3Igd29ya2luZyB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYW5zIHRvIGhlbHAgeW91ciBzdHVkZW50cyBuYXZpZ2F0ZSB0aGUgRFlLIHByb2Nlc3Mgc21vb3RobHkuIElmIHlvdXIgc3R1ZGVudHMgYXJlIHdvcmtpbmcgb24gYSByZWxhdGVkIHNldCBvZiBhcnRpY2xlcywgaXQgY2FuIGhlbHAgdG8gY29tYmluZSBtdWx0aXBsZSBhcnRpY2xlIG5vbWluYXRpb25zIGludG8gYSBzaW5nbGUgaG9vazsgdGhpcyBoZWxwcyBrZWVwIHlvdXIgc3R1ZGVudHPigJkgd29yayBmcm9tIHN3YW1waW5nIHRoZSBwcm9jZXNzIG9yIGFudGFnb25pemluZyB0aGUgZWRpdG9ycyB3aG8gbWFpbnRhaW4gaXQuPC9wPlwiXG4gICAgICAgICAgXCI8cD5XZWxsLWRldmVsb3BlZCBhcnRpY2xlcyB0aGF0IGhhdmUgcGFzc2VkIGEgR29vZCBBcnRpY2xlIChHQSkgcmV2aWV3IGFyZSBhIHN1YnN0YW50aWFsIGFjaGlldmVtZW50IGluIHRoZWlyIG93biByaWdodCwgYW5kIGNhbiBhbHNvIHF1YWxpZnkgZm9yIERZSy4gVGhpcyBwZWVyIHJldmlldyBwcm9jZXNzIGludm9sdmVzIGNoZWNraW5nIGEgcG9saXNoZWQgYXJ0aWNsZSBhZ2FpbnN0IFdpa2lwZWRpYSdzIEdBIGNyaXRlcmlhOiBhcnRpY2xlcyBtdXN0IGJlIHdlbGwtd3JpdHRlbiwgdmVyaWZpYWJsZSBhbmQgd2VsbC1zb3VyY2VkIHdpdGggbm8gb3JpZ2luYWwgcmVzZWFyY2gsIGJyb2FkIGluIGNvdmVyYWdlLCBuZXV0cmFsLCBzdGFibGUsIGFuZCBhcHByb3ByaWF0ZWx5IGlsbHVzdHJhdGVkICh3aGVuIHBvc3NpYmxlKS4gUHJhY3RpY2FsbHkgc3BlYWtpbmcsIGEgcG90ZW50aWFsIEdvb2QgQXJ0aWNsZSBzaG91bGQgbG9vayBhbmQgc291bmQgbGlrZSBvdGhlciB3ZWxsLWRldmVsb3BlZCBXaWtpcGVkaWEgYXJ0aWNsZXMsIGFuZCBpdCBzaG91bGQgcHJvdmlkZSBhIHNvbGlkLCB3ZWxsLWJhbGFuY2VkIHRyZWF0bWVudCBvZiBpdHMgc3ViamVjdC48L3A+XCJcbiAgICAgICAgICBcIjxwPlRoZSBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgcHJvY2VzcyBnZW5lcmFsbHkgdGFrZXMgc29tZSB0aW1lIOKAlCBiZXR3ZWVuIHNldmVyYWwgZGF5cyBhbmQgc2V2ZXJhbCB3ZWVrcywgZGVwZW5kaW5nIG9uIHRoZSBpbnRlcmVzdCBvZiByZXZpZXdlcnMgYW5kIHRoZSBzaXplIG9mIHRoZSByZXZpZXcgYmFja2xvZyBpbiB0aGUgc3ViamVjdCBhcmVhIOKAlCBhbmQgc2hvdWxkIG9ubHkgYmUgdW5kZXJ0YWtlbiBmb3IgYXJ0aWNsZXMgdGhhdCBhcmUgYWxyZWFkeSB2ZXJ5IGdvb2QuIFR5cGljYWxseSwgcmV2aWV3ZXJzIHdpbGwgaWRlbnRpZnkgZnVydGhlciBzcGVjaWZpYyBhcmVhcyBmb3IgaW1wcm92ZW1lbnQsIGFuZCB0aGUgYXJ0aWNsZSB3aWxsIGJlIHByb21vdGVkIHRvIEdvb2QgQXJ0aWNsZSBzdGF0dXMgaWYgYWxsIHRoZSByZXZpZXdlcnMnIGNvbmNlcm5zIGFyZSBhZGRyZXNzZWQuIEJlY2F1c2Ugb2YgdGhlIHVuY2VydGFpbiB0aW1lbGluZSBhbmQgdGhlIGZyZXF1ZW50IG5lZWQgdG8gbWFrZSBzdWJzdGFudGlhbCBjaGFuZ2VzIHRvIGFydGljbGVzLCBHb29kIEFydGljbGUgbm9taW5hdGlvbnMgdXN1YWxseSBvbmx5IG1ha2Ugc2Vuc2UgZm9yIGFydGljbGVzIHRoYXQgcmVhY2ggYSBtYXR1cmUgc3RhdGUgc2V2ZXJhbCB3ZWVrcyBiZWZvcmUgdGhlIGVuZCBvZiB0ZXJtLCBhbmQgdGhvc2Ugd3JpdHRlbiBieSBzdHVkZW50IGVkaXRvcnMgd2hvIGFyZSBhbHJlYWR5IGV4cGVyaWVuY2VkLCBzdHJvbmcgd3JpdGVycy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgIF1cbiAgICBpbnB1dHM6IFtdXG4gIH1cbiAge1xuICAgIGlkOiBcImdyYWRpbmdcIlxuICAgIHRpdGxlOiAnR3JhZGluZydcbiAgICBmb3JtVGl0bGU6IFwiSG93IHdpbGwgc3R1ZGVudHMnIGdyYWRlcyBmb3IgdGhlIFdpa2lwZWRpYSBhc3NpZ25tZW50IGJlIGRldGVybWluZWQ/XCJcbiAgICBpbmZvVGl0bGU6IFwiQWJvdXQgZ3JhZGluZ1wiXG4gICAgaW5zdHJ1Y3Rpb25zOiAnR3JhZGluZyBXaWtpcGVkaWEgYXNzaWdubWVudHMgY2FuIGJlIGEgY2hhbGxlbmdlLiBIZXJlIGFyZSBzb21lIHRpcHMgZm9yIGdyYWRpbmcgeW91ciBXaWtpcGVkaWEgYXNzaWdubWVudHM6J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnS25vdyBhbGwgb2YgeW91ciBzdHVkZW50c1xcJyBXaWtpcGVkaWEgdXNlcm5hbWVzLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPldpdGhvdXQga25vd2luZyB0aGUgc3R1ZGVudHMnIHVzZXJuYW1lcywgeW91IHdvbid0IGJlIGFibGUgdG8gZ3JhZGUgdGhlbS48L3A+XCJcbiAgICAgICAgICBcIjxwPk1ha2Ugc3VyZSBhbGwgc3R1ZGVudHMgZW5yb2xsIG9uIHRoZSBjb3Vyc2UgcGFnZS4gT25jZSBhbGwgc3R1ZGVudHMgaGF2ZSBzaWduZWQgdGhlIGxpc3QsIHlvdSBjYW4gY2xpY2sgb24gXFxcInVzZXIgY29udHJpYnV0aW9uc1xcXCIgKGluIHRoZSBtZW51IGJhciBvbiB0aGUgbGVmdCBoYW5kIHNpZGUgb2YgeW91ciBicm93c2VyIHNjcmVlbikgdG8gcmV2aWV3IHRoYXQgc3R1ZGVudCdzIGFjdGl2aXRpZXMgb24gV2lraXBlZGlhLiBJZiB5b3UgaGF2ZSBtYWRlIHN0dWRlbnQgdHJhaW5pbmcgY29tcHVsc29yeSwgeW91IGNhbiBjaGVjayB0aGUgPGEgaHJlZj0naHR0cHM6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvV2lraXBlZGlhOlRyYWluaW5nL0Zvcl9zdHVkZW50cy9UcmFpbmluZ19mZWVkYmFjaycgdGFyZ2V0PSdfYmxhbmsnPmZlZWRiYWNrIHBhZ2U8L2E+IHRvIHNlZSB3aGljaCBzdHVkZW50cyBoYXZlIGNvbXBsZXRlZCBpdC48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0JlIHNwZWNpZmljIGFib3V0IHlvdXIgZXhwZWN0YXRpb25zLidcbiAgICAgICAgYWNjb3JkaWFuOiB0cnVlXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPkJlaW5nIHNwZWNpZmljIGFib3V0IHdoYXQgeW91IGV4cGVjdCB5b3VyIHN0dWRlbnRzIHRvIGRvIGlzIGNydWNpYWwgZm9yIGdyYWRpbmcuIEZvciBleGFtcGxlLCBzdHVkZW50cyBjb3VsZCBiZSBhc2tlZCB0byBhZGQgYSBtaW5pbXVtIG9mIHRocmVlIHNlY3Rpb25zIHRvIGFuIGV4aXN0aW5nIGFydGljbGUsIG9yIGEgbWluaW11bSBvZiBlaWdodCByZWZlcmVuY2VzIHRvIGFuIGV4aXN0aW5nIGFydGljbGUgdGhhdCBsYWNrcyB0aGUgYXBwcm9wcmlhdGUgc291cmNpbmcsIGV0Yy48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJ0dyYWRlIGJhc2VkIG9uIHdoYXQgc3R1ZGVudHMgY29udHJpYnV0ZSB0byBXaWtpcGVkaWEsIG5vdCB3aGF0IHJlbWFpbnMgb24gV2lraXBlZGlhIGF0IHRoZSBjb3Vyc2VcXCdzIGVuZC4nXG4gICAgICAgIGFjY29yZGlhbjogdHJ1ZVxuICAgICAgICBjb250ZW50OiBbXG4gICAgICAgICAgXCI8cD5Zb3UgY2FuIHNlZSBhIHN0dWRlbnQncyBjb250cmlidXRpb25zIGluIHRoZSBhcnRpY2xlIGhpc3RvcnksIGV2ZW4gaWYgc29tZSB3cml0aW5nIHdhcyByZW1vdmVkIGJ5IHRoZSBjb21tdW5pdHkgKG9yIHRoZSBzdHVkZW50KS4gQSBzdHVkZW504oCZcyBjb250ZW50IGNvdWxkIGJlIGVkaXRlZCBmb3IgbWFueSByZWFzb25zLCBhbmQgY2FuIGV2ZW4gYmUgZXZpZGVuY2Ugb2YgYSBzdHVkZW50IHJlZmxlY3RpbmcgY3JpdGljYWxseSBvbiB0aGVpciBvd24gY29udHJpYnV0aW9ucy4gRnVydGhlcm1vcmUsIGlmIHN0dWRlbnRzIGZlZWwgdGhleSBtdXN0IGRlZmVuZCBjb250cm9sIG9mIGFuIGFydGljbGUgZm9yIHRoZSBzYWtlIG9mIHRoZWlyIGdyYWRlLCB0aGlzIGNhbiBsZWFkIHRvIGNvbmZsaWN0IHdpdGggb3RoZXIgZWRpdG9ycy48L3A+XCJcbiAgICAgICAgICBcIjxwPldpa2lwZWRpYSBpcyBhIGNvbGxhYm9yYXRpdmUgd3JpdGluZyBlbnZpcm9ubWVudCBkcml2ZW4gYnkgdmVyaWZpYWJpbGl0eSwgbm90ZXdvcnRoaW5lc3MgYW5kIG5ldXRyYWwgcG9pbnQgb2YgdmlldyDigJMgYWxsIG9mIHdoaWNoIGhhdmUgY3JlYXRlZCBjaGFsbGVuZ2VzIGZvciBzdHVkZW50cyBmYW1pbGlhciB3aXRoIGEgcGVyc3Vhc2l2ZSB3cml0aW5nIGZvcm1hdCBpbiBjbGFzc3Jvb21zLiBFbmNvdXJhZ2Ugc3R1ZGVudHMgdG8gcmVmbGVjdCBvbiBlZGl0cyB0byBpbXByb3ZlIHRoZWlyIHVuZGVyc3RhbmRpbmcgb2YgdGhlIHByb2Nlc3MgYW5kIHRoZSBjb21tdW5pdHkuPC9wPlwiXG4gICAgICAgICAgXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIHtcbiAgICBpZDogXCJvdmVydmlld1wiXG4gICAgdGl0bGU6ICdBc3NpZ25tZW50IG92ZXJ2aWV3J1xuICAgIHNlY3Rpb25zOiBbXG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnQWJvdXQgdGhlIGNvdXJzZSdcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+Tm93IGl0J3MgdGltZSB0byB3cml0ZSBhIHNob3J0IGRlc2NyaXB0aW9uIG9mIHlvdXIgY291cnNlIGFuZCBob3cgdGhpcyBXaWtpcGVkaWEgYXNzaWdubWVudCBmaXRzIGludG8gaXQuIFRoaXMgd2lsbCBhbGxvdyBvdGhlciBXaWtpcGVkaWEgZWRpdG9ycyB0byB1bmRlcnN0YW5kIHdoYXQgc3R1ZGVudHMgd2lsbCBiZSBkb2luZy4gQmUgc3VyZSB0byBtZW50aW9uOlwiXG4gICAgICAgICAgXCI8dWw+XG4gICAgICAgICAgICA8bGk+dG9waWNzIHlvdSdyZSBjb3ZlcmluZyBpbiB0aGUgY2xhc3M8L2xpPlxuICAgICAgICAgICAgPGxpPndoYXQgc3R1ZGVudHMgd2lsbCBiZSBhc2tlZCB0byBkbyBvbiBXaWtpcGVkaWE8L2xpPlxuICAgICAgICAgICAgPGxpPndoYXQgdHlwZXMgb2YgYXJ0aWNsZXMgeW91ciBjbGFzcyB3aWxsIGJlIHdvcmtpbmcgb248L2xpPiAgXG4gICAgICAgICAgPC91bD5cIlxuICAgICAgICBdXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRpdGxlOiAnU2hvcnQgZGVzY3JpcHRpb24nXG4gICAgICAgIGNvbnRlbnQ6IFtcbiAgICAgICAgICBcIjxwPjx0ZXh0YXJlYSBpZD0nc2hvcnRfZGVzY3JpcHRpb24nIHJvd3M9JzgnIHN0eWxlPSd3aWR0aDoxMDAlOyc+PC90ZXh0YXJlYT48L3A+XCJcbiAgICAgICAgXVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogW1xuICAgICAgICAgIFwiPHA+PGEgaWQ9J3B1Ymxpc2gnIGhyZWY9JyMnIGNsYXNzPSdidXR0b24nIHN0eWxlPSdkaXNwbGF5OmlubGluZS1ibG9jazt0ZXh0LWFsaWduOmNlbnRlcjsnPlB1Ymxpc2g8L2E+PC9wPlwiXG4gICAgICAgIF1cbiAgICAgIH1cbiAgICBdXG4gICAgaW5wdXRzOiBbXVxuICB9XG4gIFxuXVxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZENvbnRlbnQiLCJXaXphcmRDb3Vyc2VJbmZvID0gXG5cbiAgIyBSRVNFQVJDSCBBTkQgV1JJVEUgQSBXSUtJUEVESUEgQVJUSUNMRVxuICByZXNlYXJjaHdyaXRlOiBcbiAgICB0aXRsZTogXCJSZXNlYXJjaCBhbmQgd3JpdGUgYSBXaWtpcGVkaWEgYXJ0aWNsZVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiV29ya2luZyBpbmRpdmlkdWFsbHkgb3IgaW4gc21hbGwgdGVhbXMgd2l0aCB5b3VyIGd1aWRhbmNlLCBzdHVkZW50cyBjaG9vc2UgY291cnNlLXJlbGF0ZWQgdG9waWNzIHRoYXQgYXJlIG5vdCB3ZWxsLWNvdmVyZWQgb24gV2lraXBlZGlhLiBBZnRlciBhc3Nlc3NpbmcgV2lraXBlZGlhJ3MgY292ZXJhZ2UsIHN0dWRlbnRzIHJlc2VhcmNoIHRvcGljcyB0byBmaW5kIGhpZ2gtcXVhbGl0eSBzZWNvbmRhcnkgc291cmNlcywgdGhlbiBwcm9wb3NlIGFuIG91dGxpbmUgZm9yIGhvdyB0aGUgdG9waWMgb3VnaHQgdG8gYmUgY292ZXJlZC4gVGhleSBkcmFmdCB0aGVpciBhcnRpY2xlcywgZ2l2ZSBhbmQgcmVzcG9uZCB0byBwZWVyIGZlZWRiYWNrLCB0YWtlIHRoZWlyIHdvcmsgbGl2ZSBvbiBXaWtpcGVkaWEsIGFuZCBrZWVwIGltcHJvdmluZyB0aGVpciBhcnRpY2xlcyB1bnRpbCB0aGUgZW5kIG9mIHRoZSB0ZXJtLiBBbG9uZyB0aGUgd2F5LCBzdHVkZW50cyBtYXkgd29yayB3aXRoIGV4cGVyaWVuY2VkIFdpa2lwZWRpYSBlZGl0b3JzIHdobyBjYW4gb2ZmZXIgY3JpdGljYWwgZmVlZGJhY2sgYW5kIGhlbHAgbWFrZSBzdXJlIGFydGljbGVzIG1lZXQgV2lraXBlZGlhJ3Mgc3RhbmRhcmRzIGFuZCBzdHlsZSBjb252ZW50aW9ucy4gU3R1ZGVudHMgd2hvIGRvIGdyZWF0IHdvcmsgbWF5IGV2ZW4gaGF2ZSB0aGVpciBhcnRpY2xlcyBmZWF0dXJlZCBvbiBXaWtpcGVkaWEncyBtYWluIHBhZ2UuIFNvbGlkIGFydGljbGVzIHdpbGwgaGVscCBpbmZvcm0gdGhvdXNhbmRzIG9mIGZ1dHVyZSByZWFkZXJzIGFib3V0IHRoZSBzZWxlY3RlZCB0b3BpYy5cIlxuICAgICAgXCJPcHRpb25hbGx5LCBzdHVkZW50cyBtYXkgYmUgYXNrZWQgdG8gd3JpdGUgYSByZWZsZWN0aXZlIHBhcGVyIGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlLCBwcmVzZW50IHRoZWlyIGNvbnRyaWJ1dGlvbnMgaW4gY2xhc3MsIG9yIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgYWJvdXQgdGhlaXIgdG9waWNzIGluIGEgc2VwYXJhdGUgZXNzYXkuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCIxMiB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiR3JhZHVhdGUgU3R1ZGVudHNcIlxuICAgICAgXCJBZHZhbmNlZCB1bmRlcmdyYWR1YXRlc1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiSW50cm8gY291cnNlc1wiXG4gICAgICBcImxhcmdlIHN1cnZleSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIFNPVVJDRS1DRU5URVJFRCBBRERJVElPTlNcbiAgc291cmNlY2VudGVyZWQ6IFxuICAgIHRpdGxlOiBcIlNvdXJjZS1jZW50ZXJlZCBhZGRpdGlvbnNcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHJlYWQgV2lraXBlZGlhIGFydGljbGVzIGluIGEgc2VsZi1zZWxlY3RlZCBzdWJqZWN0IGFyZWEgdG8gaWRlbnRpZnkgYXJ0aWNsZXMgaW4gbmVlZCBvZiByZXZpc2lvbiBvciBpbXByb3ZlbWVudCwgc3VjaCBhcyB0aG9zZSB3aXRoIFxcXCJjaXRhdGlvbiBuZWVkZWRcXFwiIHRhZ3MuIFN0dWRlbnRzIHdpbGwgZmluZCByZWxpYWJsZSBzb3VyY2VzIHRvIHVzZSBhcyByZWZlcmVuY2VzIGZvciB1bmNpdGVkIGNvbnRlbnQuIFRoaXMgYXNzaWdubWVudCBpbmNsdWRlcyBhIHBlcnN1YXNpdmUgZXNzYXkgaW4gd2hpY2ggc3R1ZGVudHMgbWFrZSBhIGNhc2UgZm9yIHRoZWlyIHN1Z2dlc3RlZCBjaGFuZ2VzLCB3aHkgdGhleSBiZWxpZXZlIHRoZXkgYXJlIHF1YWxpZmllZCB0byBtYWtlIHRob3NlIGNoYW5nZXMsIGFuZCB3aHkgdGhlaXIgc2VsZWN0ZWQgc291cmNlcyBwcm92aWRlIHN1cHBvcnQuIEFmdGVyIG1ha2luZyB0aGVpciBjb250cmlidXRpb25zLCBzdHVkZW50cyByZWZsZWN0IG9uIHRoZWlyIHdvcmsgd2l0aCBhIGZvcm1hbCBwYXBlciwgYW5kIGRpc2N1c3Mgd2hldGhlciB0aGV5J3ZlIGFjY29tcGxpc2hlZCB0aGVpciBzdGF0ZWQgZ29hbHMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJMYXJnZSBjbGFzc2VzXCJcbiAgICAgIFwiQWR2YW5jZWQgdW5kZXJncmFkdWF0ZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIkludHJvICgxMDAtbGV2ZWwpIGNvdXJzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgRklORCBBTkQgRklYIEVSUk9SU1xuICBmaW5kZml4OiBcbiAgICB0aXRsZTogXCJGaW5kIGFuZCBmaXggZXJyb3JzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJTdHVkZW50cyBhcmUgYXNrZWQgdG8gZmluZCBhbiBhcnRpY2xlIGFib3V0IGEgY291cnNlLXJlbGF0ZWQgdG9waWMgd2l0aCB3aGljaCB0aGV5IGFyZSBleHRyZW1lbHkgZmFtaWxpYXIgdGhhdCBoYXMgc29tZSBtaXN0YWtlcy4gU3R1ZGVudHMgdGFrZSB3aGF0IHRoZXkga25vdyBhYm91dCB0aGUgdG9waWMsIGZpbmQgZmFjdHVhbCBlcnJvcnMgYW5kIG90aGVyIHN1YnN0YW50aXZlIG1pc3Rha2VzLCBhbmQgY29ycmVjdCB0aG9zZS5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNiB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjggd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkdyYWR1YXRlIHN0dWRlbnRzXCJcbiAgICBdXG4gICAgbm90X2ZvcjogW1xuICAgICAgXCJJbnRybyAoMTAwLWxldmVsKSBjb3Vyc2VzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjIElkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVxuICBwbGFnaWFyaXNtOiBcbiAgICB0aXRsZTogXCJJZGVudGlmeSBhbmQgZml4IGNsb3NlIHBhcmFwaHJhc2luZyAvIHBsYWdpYXJpc21cIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIlN0dWRlbnRzIHNlYXJjaCB0aHJvdWdoIFdpa2lwZWRpYSBhcnRpY2xlcyB0byBmaW5kIGluc3RhbmNlcyBvZiBjbG9zZSBwYXJhcGhyYXNpbmcgb3IgcGxhZ2lhcmlzbSwgdGhlbiByZXdvcmQgdGhlIGluZm9ybWF0aW9uIGluIHRoZWlyIG93biBsYW5ndWFnZSB0byBiZSBhcHByb3ByaWF0ZSBmb3IgV2lraXBlZGlhLiBJbiB0aGlzIGFzc2lnbm1lbnQsIHN0dWRlbnRzIGdhaW4gYSBkZWVwZXIgdW5kZXJzdGFuZGluZyBvZiB3aGF0IHBsYWdpYXJpc20gaXMgYW5kIGhvdyB0byBhdm9pZCBpdC5cIlxuICAgIF1cbiAgICBtaW5fdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgcmVjX3RpbWVsaW5lOiBcIjYgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIlRCRFwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiVEJEXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjVFJBTlNMQVRFIEFOIEFSVElDTEUgVE8gRU5HTElTSFxuICB0cmFuc2xhdGU6IFxuICAgIHRpdGxlOiBcIklkZW50aWZ5IGFuZCBmaXggY2xvc2UgcGFyYXBocmFzaW5nIC8gcGxhZ2lhcmlzbVwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiVGhpcyBpcyBhIHByYWN0aWNhbCBhc3NpZ25tZW50IGZvciBsYW5ndWFnZSBpbnN0cnVjdG9ycy4gU3R1ZGVudHMgc2VsZWN0IGEgV2lraXBlZGlhIGFydGljbGUgaW4gdGhlIGxhbmd1YWdlIHRoZXkgYXJlIHN0dWR5aW5nLCBhbmQgdHJhbnNsYXRlIGl0IGludG8gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBTdHVkZW50cyBzaG91bGQgc3RhcnQgd2l0aCBoaWdoLXF1YWxpdHkgYXJ0aWNsZXMgd2hpY2ggYXJlIG5vdCBhdmFpbGFibGUgaW4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlLiBUaGlzIGFzc2lnbm1lbnQgcHJvdmlkZXMgcHJhY3RpY2FsIHRyYW5zbGF0aW9uIGFkdmljZSB3aXRoIHRoZSBpbmNlbnRpdmUgb2YgcmVhbCBwdWJsaWMgc2VydmljZSwgYXMgc3R1ZGVudHMgZXhwYW5kIHRoZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgdGFyZ2V0IGN1bHR1cmUgb24gV2lraXBlZGlhLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCI0IHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNisgd2Vla3NcIlxuICAgIGJlc3RfZm9yOiBbXG4gICAgICBcIkxhbmd1YWdlIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHRyYW5zbGF0aW5nIDxlbT5mcm9tPC9lbT4gdGhlaXIgbmF0aXZlIGxhbmd1YWdlIHRvIHRoZSBsYW5ndWFnZSB0aGV5J3JlIHN0dWR5aW5nXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDFcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjQ09QWSBFRElUSU5HXG4gIGNvcHllZGl0OiBcbiAgICB0aXRsZTogXCJDb3B5ZWRpdFwiXG4gICAgZGVzY3JpcHRpb246IFtcbiAgICAgIFwiU3R1ZGVudHMgYXJlIGFza2VkIHRvIGNvcHllZGl0IFdpa2lwZWRpYSBhcnRpY2xlcywgZW5nYWdpbmcgZWRpdG9ycyBpbiBjb252ZXJzYXRpb24gYWJvdXQgdGhlaXIgd3JpdGluZyBhbmQgaW1wcm92aW5nIHRoZSBjbGFyaXR5IG9mIHRoZSBsYW5ndWFnZSBvZiB0aGUgbWF0ZXJpYWwuIFN0dWRlbnRzIGxlYXJuIHRvIHdyaXRlIGluIGRpZmZlcmVudCB2b2ljZXMgZm9yIGRpZmZlcmVudCBhdWRpZW5jZXMuIEluIGxlYXJuaW5nIGFib3V0IHRoZSBzcGVjaWZpYyB2b2ljZSBvbiBXaWtpcGVkaWEsIHRoZXkgbGVhcm4gYWJvdXQgdGhlIOKAnGF1dGhvcml0YXRpdmXigJ0gdm9pY2UgYW5kIGhvdyBpdHMgdG9uZSBjYW4gY29udmluY2UsIGV2ZW4gaWYgdGhlIGNvbnRlbnQgaXMgcXVlc3Rpb25hYmxlLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiNCB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiRW5nbGlzaCBncmFtbWFyIGNvdXJzZXNcIlxuICAgIF1cbiAgICBub3RfZm9yOiBbXG4gICAgICBcIlN0dWRlbnRzIHdpdGhvdXQgc3Ryb25nIHdyaXRpbmcgc2tpbGxzXCJcbiAgICBdXG4gICAgbGVhcm5pbmdfb2JqZWN0aXZlczogW1xuICAgICAge1xuICAgICAgICB0ZXh0OiBcIk1hc3RlciBjb3Vyc2UgY29udGVudFwiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiV3JpdGluZyBza2lsbHMgZGV2ZWxvcG1lbnRcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkluY3JlYXNlIG1lZGlhIGFuZCBpbmZvcm1hdGlvbiBmbHVlbmN5XCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJJbXByb3ZlIGNyaXRpY2FsIHRoaW5raW5nIGFuZCByZXNlYXJjaCBza2lsbHNcIlxuICAgICAgICBzdGFyczogMlxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkZvc3RlciBjb2xsYWJvcmF0aW9uXCJcbiAgICAgICAgc3RhcnM6IDJcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJEZXZlbG9wIHRlY2huaWNhbCBhbmQgY29tbXVuaWNhdGlvbiBza2lsbHNcIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgIF1cbiAgICBcblxuICAjRVZBTFVBVEUgQVJUSUNMRVNcbiAgZXZhbHVhdGU6IFxuICAgIHRpdGxlOiBcIkV2YWx1YXRlIGFydGljbGVzXCJcbiAgICBkZXNjcmlwdGlvbjogW1xuICAgICAgXCJGaXJzdCwgc3R1ZGVudHMgd3JpdGUgYSByZXBvcnQgYW5hbHl6aW5nIHRoZSBzdGF0ZSBvZiBXaWtpcGVkaWEgYXJ0aWNsZXMgb24gY291cnNlLXJlbGF0ZWQgdG9waWNzIHdpdGggYW4gZXllIHRvd2FyZCBmdXR1cmUgcmV2aXNpb25zLiBUaGlzIGVuY291cmFnZXMgYSBjcml0aWNhbCByZWFkaW5nIG9mIGJvdGggY29udGVudCBhbmQgZm9ybS4gVGhlbiwgdGhlIHN0dWRlbnRzIGVkaXQgYXJ0aWNsZXMgaW4gc2FuZGJveGVzIHdpdGggZmVlZGJhY2sgZnJvbSB0aGUgcHJvZmVzc29yLCBjYXJlZnVsbHkgc2VsZWN0aW5nIGFuZCBhZGRpbmcgcmVmZXJlbmNlcyB0byBpbXByb3ZlIHRoZSBhcnRpY2xlIGJhc2VkIG9uIHRoZWlyIGNyaXRpY2FsIGVzc2F5cy4gRmluYWxseSwgdGhleSBjb21wb3NlIGEgc2VsZi1hc3Nlc3NtZW50IGV2YWx1YXRpbmcgdGhlaXIgb3duIGNvbnRyaWJ1dGlvbnMuXCJcbiAgICBdXG4gICAgbWluX3RpbWVsaW5lOiBcIjUgd2Vla3NcIlxuICAgIHJlY190aW1lbGluZTogXCI4IHdlZWtzXCJcbiAgICBiZXN0X2ZvcjogW1xuICAgICAgXCJDbGFzc2VzIHdpdGggZmV3ZXIgdGhhbiAzMCBzdHVkZW50c1wiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiTGFyZ2Ugc3VydmV5IGNsYXNzZXNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAzXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogMVxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG4gICMgQUREIElNQUdFUyBPUiBNVUxUSU1FRElBXG4gIG11bHRpbWVkaWE6IFxuICAgIHRpdGxlOiBcIiBBZGQgaW1hZ2VzIG9yIG11bHRpbWVkaWFcIlxuICAgIGRlc2NyaXB0aW9uOiBbXG4gICAgICBcIklmIHlvdXIgc3R1ZGVudHMgYXJlIGFkZXB0IGF0IG1lZGlhLCB0aGlzIGNhbiBiZSBhIGdyZWF0IHdheSBvZiBjb250cmlidXRpbmcgdG8gV2lraXBlZGlhIGluIGEgbm9uLXRleHR1YWwgd2F5LiBJbiB0aGUgcGFzdCwgc3R1ZGVudHMgaGF2ZSBwaG90b2dyYXBoZWQgbG9jYWwgbW9udW1lbnRzIHRvIGlsbHVzdHJhdGUgYXJ0aWNsZXMsIGRlc2lnbmVkIGluZm9ncmFwaGljcyB0byBpbGx1c3RyYXRlIGNvbmNlcHRzLCBvciBjcmVhdGVkIHZpZGVvcyB0aGF0IGRlbW9uc3RyYXRlZCBhdWRpby12aXN1YWxseSB3aGF0IGFydGljbGVzIGRlc2NyaWJlIGluIHdvcmRzLlwiXG4gICAgXVxuICAgIG1pbl90aW1lbGluZTogXCIyIHdlZWtzXCJcbiAgICByZWNfdGltZWxpbmU6IFwiMyB3ZWVrc1wiXG4gICAgYmVzdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgc3R1ZHlpbmcgcGhvdG9ncmFwaHksIHZpZGVvZ3JhcGh5LCBvciBncmFwaGljIGRlc2lnblwiXG4gICAgXVxuICAgIG5vdF9mb3I6IFtcbiAgICAgIFwiU3R1ZGVudHMgd2l0aG91dCBtZWRpYSBza2lsbHNcIlxuICAgIF1cbiAgICBsZWFybmluZ19vYmplY3RpdmVzOiBbXG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiTWFzdGVyIGNvdXJzZSBjb250ZW50XCJcbiAgICAgICAgc3RhcnM6IDRcbiAgICAgIH1cbiAgICAgIHtcbiAgICAgICAgdGV4dDogXCJXcml0aW5nIHNraWxscyBkZXZlbG9wbWVudFwiXG4gICAgICAgIHN0YXJzOiAxXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiSW5jcmVhc2UgbWVkaWEgYW5kIGluZm9ybWF0aW9uIGZsdWVuY3lcIlxuICAgICAgICBzdGFyczogNFxuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkltcHJvdmUgY3JpdGljYWwgdGhpbmtpbmcgYW5kIHJlc2VhcmNoIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiAyXG4gICAgICB9XG4gICAgICB7XG4gICAgICAgIHRleHQ6IFwiRm9zdGVyIGNvbGxhYm9yYXRpb25cIlxuICAgICAgICBzdGFyczogM1xuICAgICAgfVxuICAgICAge1xuICAgICAgICB0ZXh0OiBcIkRldmVsb3AgdGVjaG5pY2FsIGFuZCBjb21tdW5pY2F0aW9uIHNraWxsc1wiXG4gICAgICAgIHN0YXJzOiA0XG4gICAgICB9XG4gICAgXVxuICAgIFxuXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkQ291cnNlSW5mbyIsIldpemFyZFN0ZXBJbnB1dHMgPVxuXG5cbiAgaW50cm86IFxuICAgIHRlYWNoZXI6XG4gICAgICB0eXBlOiAndGV4dCdcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBuYW1lJ1xuICAgICAgaWQ6ICd0ZWFjaGVyJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIGNvdXJzZV9uYW1lOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ0NvdXJzZSBuYW1lJ1xuICAgICAgaWQ6ICdjb3Vyc2VfbmFtZSdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgc2Nob29sOlxuICAgICAgdHlwZTogJ3RleHQnXG4gICAgICBsYWJlbDogJ1VuaXZlcnNpdHknXG4gICAgICBpZDogJ3NjaG9vbCdcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgc3ViamVjdDpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdTdWJqZWN0J1xuICAgICAgaWQ6ICdzdWJqZWN0J1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBzdHVkZW50czpcbiAgICAgIHR5cGU6ICd0ZXh0J1xuICAgICAgbGFiZWw6ICdBcHByb3hpbWF0ZSBudW1iZXIgb2Ygc3R1ZGVudHMnXG4gICAgICBpZDogJ3N0dWRlbnRzJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIGluc3RydWN0b3JfdXNlcm5hbWU6XG4gICAgICBsYWJlbDogJ1VzZXJuYW1lICh0ZW1wb3JhcnkpJ1xuICAgICAgaWQ6ICdpbnN0cnVjdG9yX3VzZXJuYW1lJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIHN0YXJ0X2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cbiAgICBlbmRfZGF0ZTpcbiAgICAgIG1vbnRoOiAnJ1xuICAgICAgZGF5OiAnJ1xuICAgICAgeWVhcjogJydcbiAgICBcbiAgXG5cbiAgYXNzaWdubWVudF9zZWxlY3Rpb246IFxuICAgIHJlc2VhcmNod3JpdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3Jlc2VhcmNod3JpdGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW5kIHdyaXRlIGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IHRydWVcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIFxuXG4gICAgZXZhbHVhdGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2V2YWx1YXRlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0V2YWx1YXRlIGFydGljbGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzQ291cnNlSW5mbzogdHJ1ZVxuICAgICAgZGlzYWJsZWQ6IHRydWVcblxuICAgIFxuICAgIG11bHRpbWVkaWE6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ211bHRpbWVkaWEnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnQWRkIGltYWdlcyAmIG11bHRpbWVkaWEnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNDb3Vyc2VJbmZvOiB0cnVlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuXG5cbiAgICBzb3VyY2VjZW50ZXJlZDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnc291cmNlY2VudGVyZWQnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnU291cmNlLWNlbnRlcmVkIGFkZGl0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gIFxuXG4gICAgY29weWVkaXQ6IFxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjb3B5ZWRpdCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb3B5ZWRpdCBhcnRpY2xlcydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cblxuICAgIGZpbmRmaXg6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2ZpbmRmaXgnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnRmluZCBhbmQgZml4IGVycm9ycydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG5cbiAgICBcbiAgICBwbGFnaWFyaXNtOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdwbGFnaWFyaXNtJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0lkZW50aWZ5IGFuZCBmaXggcGxhZ2lhcmlzbSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICBcblxuICAgIHNvbWV0aGluZ19lbHNlOlxuICAgICAgdHlwZTogJ2xpbmsnXG4gICAgICBocmVmOiAnbWFpbHRvOmNvbnRhY3RAd2lraWVkdS5vcmcnXG4gICAgICBpZDogJ3NvbWV0aGluZ19lbHNlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0EgZGlmZmVyZW50IGFzc2lnbm1lbnQ/IEdldCBpbiB0b3VjaCBoZXJlLidcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGhhc0NvdXJzZUluZm86IGZhbHNlXG4gICAgICB0aXBJbmZvOlxuICAgICAgICB0aXRsZTogJydcbiAgICAgICAgY29udGVudDogXCJIYXZlIGFub3RoZXIgaWRlYSBmb3IgaW5jb3Jwb3JhdGluZyBXaWtpcGVkaWEgaW50byB5b3VyIGNsYXNzPyBXZSd2ZSBmb3VuZCB0aGF0IHRoZXNlIGFzc2lnbm1lbnRzIHdvcmsgd2VsbCwgYnV0IHRoZXkgYXJlbid0IHRoZSBvbmx5IHdheSB0byBkbyBpdC4gR2V0IGluIHRvdWNoLCBhbmQgd2UgY2FuIHRhbGsgdGhpbmdzIHRocm91Z2g6IDxhIHN0eWxlPSdjb2xvcjojNTA1YTdmOycgaHJlZj0nbWFpbHRvOmNvbnRhY3RAd2lraWVkdS5vcmcnPmNvbnRhY3RAd2lraWVkdS5vcmc8L2E+XCJcblxuXG4gIGxlYXJuaW5nX2Vzc2VudGlhbHM6IFxuICAgIGNyZWF0ZV91c2VyOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcmVhdGVfdXNlcidcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0NyZWF0ZSB1c2VyIGFjY291bnQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgIFxuICAgIGVucm9sbDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnZW5yb2xsJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnRW5yb2xsIHRvIHRoZSBjb3Vyc2UnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBkaXNhYmxlZDogdHJ1ZVxuXG4gICAgY29tcGxldGVfdHJhaW5pbmc6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvbXBsZXRlX3RyYWluaW5nJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ29tcGxldGUgb25saW5lIHRyYWluaW5nJ1xuICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICAgIGludHJvZHVjZV9hbWJhc3NhZG9yczpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnaW50cm9kdWNlX2FtYmFzc2Fkb3JzJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0ludHJvZHVjZSBXaWtpcGVkaWEgQW1iYXNzYWRvcnMgSW52b2x2ZWQnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgXG4gICAgIyBpbmNsdWRlX2NvbXBsZXRpb246XG4gICAgIyAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAjICAgaWQ6ICdpbmNsdWRlX2NvbXBsZXRpb24nXG4gICAgIyAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICMgICBsYWJlbDogJ0luY2x1ZGUgQ29tcGxldGlvbiBvZiB0aGlzIEFzc2lnbm1lbnQgYXMgUGFydCBvZiB0aGUgU3R1ZGVudHNcXCdzIEdyYWRlJ1xuICAgICMgICBleGNsdXNpdmU6IGZhbHNlXG5cbiAgICB0cmFpbmluZ19ncmFkZWQ6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ3RyYWluaW5nX2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgYmUgZ3JhZGVkJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgdHJhaW5pbmdfbm90X2dyYWRlZDpcbiAgICAgIHR5cGU6ICdyYWRpb0JveCdcbiAgICAgIGlkOiAndHJhaW5pbmdfbm90X2dyYWRlZCdcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDb21wbGV0aW9uIG9mIHRyYWluaW5nIHdpbGwgbm90IGJlIGdyYWRlZCdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICBcbiAgXG5cbiAgZ2V0dGluZ19zdGFydGVkOiBcbiAgICBjcml0aXF1ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjcml0aXF1ZV9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IHRydWVcbiAgICAgIGxhYmVsOiAnQ3JpdGlxdWUgYW4gYXJ0aWNsZSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuICAgIGFkZF90b19hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdhZGRfdG9fYXJ0aWNsZSdcbiAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICBsYWJlbDogJ0FkZCB0byBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgY29weV9lZGl0X2FydGljbGU6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2NvcHlfZWRpdF9hcnRpY2xlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0NvcHllZGl0IGFuIGFydGljbGUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgXG4gICAgaWxsdXN0cmF0ZV9hcnRpY2xlOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdpbGx1c3RyYXRlX2FydGljbGUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSWxsdXN0cmF0ZSBhbiBhcnRpY2xlJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICBcblxuICBjaG9vc2luZ19hcnRpY2xlczogXG4gICAgcHJlcGFyZV9saXN0OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdwcmVwYXJlX2xpc3QnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW5zdHJ1Y3RvciBwcmVwYXJlcyBhIGxpc3QgJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICAgaGFzU3ViQ2hvaWNlOiB0cnVlXG4gICAgICBcbiAgICBzdHVkZW50c19leHBsb3JlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzdHVkZW50c19leHBsb3JlJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1N0dWRlbnRzIGZpbmQgYXJ0aWNsZXMnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICBoYXNTdWJDaG9pY2U6IHRydWVcblxuICAgIHJlcXVlc3RfaGVscDpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncmVxdWVzdF9oZWxwJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIG9yIGV2YXVsYXRpbmcgYXJ0aWNsZSBjaG9pY2VzPydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIGNvbmRpdGlvbmFsX2xhYmVsOiBcbiAgICAgICAgcHJlcGFyZV9saXN0OiBcIldvdWxkIHlvdSBsaWtlIGhlbHAgc2VsZWN0aW5nIGFydGljbGVzP1wiXG4gICAgICAgIHN0dWRlbnRzX2V4cGxvcmU6IFwiV291bGQgeW91IGxpa2UgaGVscCBldmFsdWF0aW5nIHN0dWRlbnQgY2hvaWNlcz9cIlxuICAgICAgXG5cblxuICByZXNlYXJjaF9wbGFubmluZzogXG4gICAgY3JlYXRlX291dGxpbmU6XG4gICAgICB0eXBlOiAncmFkaW9Cb3gnXG4gICAgICBpZDogJ2NyZWF0ZV9vdXRsaW5lJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1RyYWRpdGlvbmFsIG91dGxpbmUnXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiVHJhZGl0aW9uYWwgb3V0bGluZVwiXG4gICAgICAgIGNvbnRlbnQ6IFwiRm9yIGVhY2ggYXJ0aWNsZSwgdGhlIHN0dWRlbnRzIGNyZWF0ZSBhbiBvdXRsaW5lIHRoYXQgcmVmbGVjdHMgdGhlIGltcHJvdmVtZW50cyB0aGV5IHBsYW4gdG8gbWFrZSwgYW5kIHRoZW4gcG9zdCBpdCB0byB0aGUgYXJ0aWNsZSdzIHRhbGsgcGFnZS4gVGhpcyBpcyBhIHJlbGF0aXZlbHkgZWFzeSB3YXkgdG8gZ2V0IHN0YXJ0ZWQuXCJcbiAgICBcbiAgICB3cml0ZV9sZWFkOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3cml0ZV9sZWFkJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBsZWFkIHNlY3Rpb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6IFwiV2lraXBlZGlhIGxlYWQgc2VjdGlvblwiXG4gICAgICAgIGNvbnRlbnQ6XG4gICAgICAgICAgXCI8cD5Gb3IgZWFjaCBhcnRpY2xlLCB0aGUgc3R1ZGVudHMgY3JlYXRlIGEgd2VsbC1iYWxhbmNlZCBzdW1tYXJ5IG9mIGl0cyBmdXR1cmUgc3RhdGUgaW4gdGhlIGZvcm0gb2YgYSBXaWtpcGVkaWEgbGVhZCBzZWN0aW9uLiBUaGUgaWRlYWwgbGVhZCBzZWN0aW9uIGV4ZW1wbGlmaWVzIFdpa2lwZWRpYSdzIHN1bW1hcnkgc3R5bGUgb2Ygd3JpdGluZzogaXQgYmVnaW5zIHdpdGggYSBzaW5nbGUgc2VudGVuY2UgdGhhdCBkZWZpbmVzIHRoZSB0b3BpYyBhbmQgcGxhY2VzIGl0IGluIGNvbnRleHQsIGFuZCB0aGVuIOKAlCBpbiBvbmUgdG8gZm91ciBwYXJhZ3JhcGhzLCBkZXBlbmRpbmcgb24gdGhlIGFydGljbGUncyBzaXplIOKAlCBpdCBvZmZlcnMgYSBjb25jaXNlIHN1bW1hcnkgb2YgdG9waWMuIEEgZ29vZCBsZWFkIHNlY3Rpb24gc2hvdWxkIHJlZmxlY3QgdGhlIG1haW4gdG9waWNzIGFuZCBiYWxhbmNlIG9mIGNvdmVyYWdlIG92ZXIgdGhlIHdob2xlIGFydGljbGUuPC9wPlxuICAgICAgICAgIDxwPk91dGxpbmluZyBhbiBhcnRpY2xlIHRoaXMgd2F5IGlzIGEgbW9yZSBjaGFsbGVuZ2luZyBhc3NpZ25tZW50IOKAlCBhbmQgd2lsbCByZXF1aXJlIG1vcmUgd29yayB0byBldmFsdWF0ZSBhbmQgcHJvdmlkZSBmZWVkYmFjayBmb3IuIEhvd2V2ZXIsIGl0IGNhbiBiZSBtb3JlIGVmZmVjdGl2ZSBmb3IgdGVhY2hpbmcgdGhlIHByb2Nlc3Mgb2YgcmVzZWFyY2gsIHdyaXRpbmcsIGFuZCByZXZpc2lvbi4gU3R1ZGVudHMgd2lsbCByZXR1cm4gdG8gdGhpcyBsZWFkIHNlY3Rpb24gYXMgdGhleSBnbywgdG8gZ3VpZGUgdGhlaXIgd3JpdGluZyBhbmQgdG8gcmV2aXNlIGl0IHRvIHJlZmxlY3QgdGhlaXIgaW1wcm92ZWQgdW5kZXJzdGFuZGluZyBvZiB0aGUgdG9waWMgYXMgdGhlaXIgcmVzZWFyY2ggcHJvZ3Jlc3Nlcy4gVGhleSB3aWxsIHRhY2tsZSBXaWtpcGVkaWEncyBlbmN5Y2xvcGVkaWMgc3R5bGUgZWFybHkgb24sIGFuZCB0aGVpciBvdXRsaW5lIGVmZm9ydHMgd2lsbCBiZSBhbiBpbnRlZ3JhbCBwYXJ0IG9mIHRoZWlyIGZpbmFsIHdvcmsuPC9wPlwiXG4gICAgICAgIFxuXG5cbiAgZHJhZnRzX21haW5zcGFjZTogXG4gICAgd29ya19saXZlOlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICd3b3JrX2xpdmUnXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnV29yayBsaXZlIGZyb20gdGhlIHN0YXJ0J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICBcbiAgICBzYW5kYm94OlxuICAgICAgdHlwZTogJ3JhZGlvQm94J1xuICAgICAgaWQ6ICdzYW5kYm94J1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0RyYWZ0IGVhcmx5IHdvcmsgaW4gc2FuZGJveGVzJ1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuICAgICBcblxuICBwZWVyX2ZlZWRiYWNrOiBcbiAgICBwZWVyX3Jldmlld3M6XG4gICAgICB0eXBlOiAncmFkaW9Hcm91cCdcbiAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgbGFiZWw6ICcnXG4gICAgICBvcHRpb25zOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzEnXG4gICAgICAgICAgdmFsdWU6ICcxJ1xuICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgICB9XG4gICAgICAgIHtcbiAgICAgICAgICBpZDogJ3BlZXJfcmV2aWV3cydcbiAgICAgICAgICBsYWJlbDogJzInXG4gICAgICAgICAgdmFsdWU6ICcyJ1xuICAgICAgICAgIHNlbGVjdGVkOiB0cnVlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnMydcbiAgICAgICAgICB2YWx1ZTogJzMnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNCdcbiAgICAgICAgICB2YWx1ZTogJzQnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgICAge1xuICAgICAgICAgIGlkOiAncGVlcl9yZXZpZXdzJ1xuICAgICAgICAgIGxhYmVsOiAnNSdcbiAgICAgICAgICB2YWx1ZTogJzUnXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICAgIH1cbiAgICAgIF1cbiAgICBcbiAgXG5cbiAgc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50czogXG4gICAgY2xhc3NfYmxvZzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAnY2xhc3NfYmxvZydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdDbGFzcyBibG9nIG9yIGRpc2N1c3Npb24nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiBcbiAgICAgICAgdGl0bGU6ICdDbGFzcyBibG9nIG9yIGNsYXNzIGRpc2N1c3Npb24nXG4gICAgICAgIGNvbnRlbnQ6ICdTdHVkZW50cyBrZWVwIGEgcnVubmluZyBibG9nIGFib3V0IHRoZWlyIGV4cGVyaWVuY2VzLiBHaXZpbmcgdGhlbSBwcm9tcHRzIGV2ZXJ5IHdlZWsgb3IgdHdvLCBzdWNoIGFzIOKAnFRvIHdoYXQgZXh0ZW50IGFyZSB0aGUgZWRpdG9ycyBvbiBXaWtpcGVkaWEgYSBzZWxmLXNlbGVjdGluZyBncm91cCBhbmQgd2h5P+KAnSB3aWxsIGhlbHAgdGhlbSB0aGluayBhYm91dCB0aGUgbGFyZ2VyIGlzc3VlcyBzdXJyb3VuZGluZyB0aGlzIG9ubGluZSBlbmN5Y2xvcGVkaWEgY29tbXVuaXR5LiBJdCB3aWxsIGFsc28gZ2l2ZSB5b3UgbWF0ZXJpYWwgYm90aCBvbiB0aGUgd2lraSBhbmQgb2ZmIHRoZSB3aWtpIHRvIGdyYWRlLiBJZiB5b3UgaGF2ZSB0aW1lIGluIGNsYXNzLCB0aGVzZSBkaXNjdXNzaW9ucyBjYW4gYmUgcGFydGljdWxhcmx5IGNvbnN0cnVjdGl2ZSBpbiBwZXJzb24uJ1xuICAgICAgXG4gICAgY2xhc3NfcHJlc2VudGF0aW9uOlxuICAgICAgdHlwZTogJ2NoZWNrYm94J1xuICAgICAgaWQ6ICdjbGFzc19wcmVzZW50YXRpb24nXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnSW4tY2xhc3MgcHJlc2VudGF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdJbi1jbGFzcyBwcmVzZW50YXRpb24gb2YgV2lraXBlZGlhIHdvcmsnXG4gICAgICAgIGNvbnRlbnQ6IFwiRWFjaCBzdHVkZW50IG9yIGdyb3VwIHByZXBhcmVzIGEgc2hvcnQgcHJlc2VudGF0aW9uIGZvciB0aGUgY2xhc3MsIGV4cGxhaW5pbmcgd2hhdCB0aGV5IHdvcmtlZCBvbiwgd2hhdCB3ZW50IHdlbGwgYW5kIHdoYXQgZGlkbid0LCBhbmQgd2hhdCB0aGV5IGxlYXJuZWQuIFRoZXNlIHByZXNlbnRhdGlvbnMgY2FuIG1ha2UgZXhjZWxsZW50IGZvZGRlciBmb3IgY2xhc3MgZGlzY3Vzc2lvbnMgdG8gcmVpbmZvcmNlIHlvdXIgY291cnNlJ3MgbGVhcm5pbmcgZ29hbHMuXCJcbiAgICAgIFxuICAgIHJlZmxlY3RpdmVfZXNzYXk6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ3JlZmxlY3RpdmVfZXNzYXknXG4gICAgICBzZWxlY3RlZDogZmFsc2VcbiAgICAgIGxhYmVsOiAnUmVmbGVjdGl2ZSBlc3NheSdcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcbiAgICAgIHRpcEluZm86ICBcbiAgICAgICAgdGl0bGU6ICdSZWZsZWN0aXZlIGVzc2F5J1xuICAgICAgICBjb250ZW50OiBcIkFzayBzdHVkZW50cyB0byB3cml0ZSBhIHNob3J0IHJlZmxlY3RpdmUgZXNzYXkgb24gdGhlaXIgZXhwZXJpZW5jZXMgdXNpbmcgV2lraXBlZGlhLiBUaGlzIHdvcmtzIHdlbGwgZm9yIGJvdGggc2hvcnQgYW5kIGxvbmcgV2lraXBlZGlhIHByb2plY3RzLiBBbiBpbnRlcmVzdGluZyBpdGVyYXRpb24gb2YgdGhpcyBpcyB0byBoYXZlIHN0dWRlbnRzIHdyaXRlIGEgc2hvcnQgdmVyc2lvbiBvZiB0aGUgZXNzYXkgYmVmb3JlIHRoZXkgYmVnaW4gZWRpdGluZyBXaWtpcGVkaWEsIG91dGxpbmluZyB0aGVpciBleHBlY3RhdGlvbnMsIGFuZCB0aGVuIGhhdmUgdGhlbSByZWZsZWN0IG9uIHdoZXRoZXIgb3Igbm90IHRoZXkgbWV0IHRob3NlIGV4cGVjdGF0aW9ucyBkdXJpbmcgdGhlIGFzc2lnbm1lbnQuXCJcbiAgICAgIFxuICAgIHBvcnRmb2xpbzpcbiAgICAgIHR5cGU6ICdjaGVja2JveCdcbiAgICAgIGlkOiAncG9ydGZvbGlvJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ1dpa2lwZWRpYSBwb3J0Zm9saW8nXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnV2lraXBlZGlhIHBvcnRmb2xpbydcbiAgICAgICAgY29udGVudDogXCJTdHVkZW50cyBvcmdhbml6ZSB0aGVpciBXaWtpcGVkaWEgd29yayBpbnRvIGEgcG9ydGZvbGlvLCBpbmNsdWRpbmcgYSBuYXJyYXRpdmUgb2YgdGhlIGNvbnRyaWJ1dGlvbnMgdGhleSBtYWRlIOKAlCBhbmQgaG93IHRoZXkgd2VyZSByZWNlaXZlZCwgYW5kIHBvc3NpYmx5IGNoYW5nZWQsIGJ5IG90aGVyIFdpa2lwZWRpYW5zIOKAlCBhbmQgbGlua3MgdG8gdGhlaXIga2V5IGVkaXRzLiBDb21wb3NpbmcgdGhpcyBwb3J0Zm9saW8gd2lsbCBoZWxwIHN0dWRlbnRzIHRoaW5rIG1vcmUgZGVlcGx5IGFib3V0IHRoZWlyIFdpa2lwZWRpYSBleHBlcmllbmNlcywgYW5kIGFsc28gcHJvdmlkZXMgYSBsZW5zIHRocm91Z2ggd2hpY2ggdG8gdW5kZXJzdGFuZCDigJQgYW5kIGdyYWRlIOKAlCB0aGVpciB3b3JrLlwiXG4gICAgXG4gICAgb3JpZ2luYWxfcGFwZXI6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ29yaWdpbmFsX3BhcGVyJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ09yaWdpbmFsIGFuYWx5dGljYWwgcGFwZXInXG4gICAgICBleGNsdXNpdmU6IGZhbHNlXG4gICAgICB0aXBJbmZvOiAgXG4gICAgICAgIHRpdGxlOiAnT3JpZ2luYWwgYW5hbHl0aWNhbCBwYXBlcidcbiAgICAgICAgY29udGVudDogXCJJbiBjb3Vyc2VzIHRoYXQgZW1waGFzaXplIHRyYWRpdGlvbmFsIHJlc2VhcmNoIHNraWxscyBhbmQgdGhlIGRldmVsb3BtZW50IG9mIG9yaWdpbmFsIGlkZWFzIHRocm91Z2ggYSB0ZXJtIHBhcGVyLCBXaWtpcGVkaWEncyBwb2xpY3kgb2YgXFxcIm5vIG9yaWdpbmFsIHJlc2VhcmNoXFxcIiBtYXkgYmUgdG9vIHJlc3RyaWN0aXZlLiBNYW55IGluc3RydWN0b3JzIHBhaXIgV2lraXBlZGlhIHdyaXRpbmcgd2l0aCBjb21wbGVtZW50YXJ5IGFuYWx5dGljYWwgcGFwZXI7IHN0dWRlbnRz4oCZIFdpa2lwZWRpYSBhcnRpY2xlcyBhcyBhIGxpdGVyYXR1cmUgcmV2aWV3LCBhbmQgdGhlIHN0dWRlbnRzIGdvIG9uIHRvIGRldmVsb3AgdGhlaXIgb3duIGlkZWFzIGFuZCBhcmd1bWVudHMgaW4gdGhlIG9mZmxpbmUgYW5hbHl0aWNhbCBwYXBlci5cIlxuICAgICAgXG5cbiAgZHlrX2dhOiBcbiAgICBkeWs6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2R5aydcbiAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgbGFiZWw6ICdEaWQgWW91IEtub3c/J1xuICAgICAgZXhjbHVzaXZlOiBmYWxzZVxuXG4gICAgZ2E6XG4gICAgICB0eXBlOiAnY2hlY2tib3gnXG4gICAgICBpZDogJ2dhJ1xuICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICBsYWJlbDogJ0dvb2QgQXJ0aWNsZSBub21pbmF0aW9ucydcbiAgICAgIGV4Y2x1c2l2ZTogZmFsc2VcblxuXG5cbiAgZ3JhZGluZzogXG4gICAgbGVhcm5pbmdfZXNzZW50aWFsczpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdMZWFybmluZyBXaWtpIGVzc2VudGlhbHMnXG4gICAgICBpZDogJ2xlYXJuaW5nX2Vzc2VudGlhbHMnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIGdldHRpbmdfc3RhcnRlZDpcbiAgICAgIHR5cGU6ICdwZXJjZW50J1xuICAgICAgbGFiZWw6ICdHZXR0aW5nIHN0YXJ0ZWQgd2l0aCBlZGl0aW5nJ1xuICAgICAgaWQ6ICdnZXR0aW5nX3N0YXJ0ZWQnXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIGNob29zaW5nX2FydGljbGVzOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG4gICAgXG4gICAgcmVzZWFyY2hfcGxhbm5pbmc6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnUmVzZWFyY2ggYW4gcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ3BlcmNlbnQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAncGVyY2VudCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cblxuXG4gIG92ZXJ2aWV3OiBcbiAgICBsZWFybmluZ19lc3NlbnRpYWxzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0xlYXJuaW5nIFdpa2kgZXNzZW50aWFscydcbiAgICAgIGlkOiAnbGVhcm5pbmdfZXNzZW50aWFscydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBnZXR0aW5nX3N0YXJ0ZWQ6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnR2V0dGluZyBzdGFydGVkIHdpdGggZWRpdGluZydcbiAgICAgIGlkOiAnZ2V0dGluZ19zdGFydGVkJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcblxuICAgIGNob29zaW5nX2FydGljbGVzOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0Nob29zaW5nIGFydGljbGVzJ1xuICAgICAgaWQ6ICdjaG9vc2luZ19hcnRpY2xlcydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICByZXNlYXJjaF9wbGFubmluZzpcbiAgICAgIHR5cGU6ICdlZGl0J1xuICAgICAgbGFiZWw6ICdSZXNlYXJjaCBhbmQgcGxhbm5pbmcnXG4gICAgICBpZDogJ3Jlc2VhcmNoX3BsYW5uaW5nJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBkcmFmdHNfbWFpbnNwYWNlOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ0RyYWZ0cyBhbmQgbWFpbnNwYWNlJ1xuICAgICAgaWQ6ICdkcmFmdHNfbWFpbnNwYWNlJ1xuICAgICAgdmFsdWU6ICcnXG4gICAgICBwbGFjZWhvbGRlcjogJydcbiAgICBcbiAgICBwZWVyX2ZlZWRiYWNrOlxuICAgICAgdHlwZTogJ2VkaXQnXG4gICAgICBsYWJlbDogJ1BlZXIgRmVlZGJhY2snXG4gICAgICBpZDogJ3BlZXJfZmVlZGJhY2snXG4gICAgICB2YWx1ZTogJydcbiAgICAgIHBsYWNlaG9sZGVyOiAnJ1xuICAgIFxuICAgIHN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHM6XG4gICAgICB0eXBlOiAnZWRpdCdcbiAgICAgIGxhYmVsOiAnU3VwcGxlbWVudGFyeSBhc3NpZ25tZW50cydcbiAgICAgIGlkOiAnc3VwcGxlbWVudGFyeV9hc3NpZ25tZW50cydcbiAgICAgIHZhbHVlOiAnJ1xuICAgICAgcGxhY2Vob2xkZXI6ICcnXG5cbiAgICBzdGFydF9kYXRlOlxuICAgICAgbW9udGg6ICcnXG4gICAgICBkYXk6ICcnXG4gICAgICB5ZWFyOiAnJ1xuXG4gICAgZW5kX2RhdGU6XG4gICAgICBtb250aDogJydcbiAgICAgIGRheTogJydcbiAgICAgIHllYXI6ICcnXG5cblxuXG5cblxuXG5tb2R1bGUuZXhwb3J0cyA9IFdpemFyZFN0ZXBJbnB1dHMiLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFZpZXdIZWxwZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciggJ2xpbmsnLCAoIHRleHQsIHVybCApIC0+XG5cbiAgdGV4dCA9IEhhbmRsZWJhcnMuVXRpbHMuZXNjYXBlRXhwcmVzc2lvbiggdGV4dCApXG4gIHVybCAgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHVybCApXG5cbiAgcmVzdWx0ID0gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiPicgKyB0ZXh0ICsgJzwvYT4nXG5cbiAgcmV0dXJuIG5ldyBIYW5kbGViYXJzLlNhZmVTdHJpbmcoIHJlc3VsdCApXG4pIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSAtIEFwcGxpY2F0aW9uIEluaXRpdGlhbGl6ZXJcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCcuL0FwcCcpXG5cblxuJCAtPlxuICBcbiAgIyBJbml0aWFsaXplIEFwcGxpY2F0aW9uXG4gIGFwcGxpY2F0aW9uLmluaXRpYWxpemUoKVxuXG4gICMgU3RhcnQgQmFja2JvbmUgcm91dGVyXG4gIEJhY2tib25lLmhpc3Rvcnkuc3RhcnQoKVxuXG4gICIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE1vZGVsIEJhc2UgQ2xhc3NcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvc3VwZXJzL01vZGVsJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwTW9kZWwgZXh0ZW5kcyBNb2RlbFxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBNb2RlbCBCYXNlIENsYXNzXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgTW9kZWwgZXh0ZW5kcyBCYWNrYm9uZS5Nb2RlbFxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4jIFBVQkxJQyBNRVRIT0RTIC8gR0VUVEVSUyAvIFNFVFRFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgRVZFTlQgSEFORExFUlNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5cbiIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIC0gUm91dGVyXG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jQ09ORklHIERBVEFcbldpemFyZFN0ZXBJbnB1dHMgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZFN0ZXBJbnB1dHMnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiMgUm91dGVzXG4jLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICBcbiAgcm91dGVzOlxuICAgICcnIDogJ2hvbWUnXG5cbiMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuIyBIYW5kbGVyc1xuIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgaG9tZTogLT5cbiAgICBpZiAkKCcjYXBwJykubGVuZ3RoID4gMFxuXG4gICAgICBAY3VycmVudFdpa2lVc2VyID0gJCggJyNhcHAnICkuYXR0cignZGF0YS13aWtpdXNlcicpXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbJ2ludHJvJ11bJ2luc3RydWN0b3JfdXNlcm5hbWUnXVsndmFsdWUnXSA9IEBjdXJyZW50V2lraVVzZXJcblxuICAgICAgY29uc29sZS5sb2cgV2l6YXJkU3RlcElucHV0c1xuXG4gICAgICAkKCAnI2FwcCcgKS5odG1sKCBhcHBsaWNhdGlvbi5ob21lVmlldy5yZW5kZXIoKS5lbCApXG5cbiAgICBlbHNlIGlmICQoJyNsb2dpbicpLmxlbmd0aCA+IDBcbiAgICAgICQoICcjbG9naW4nICkuaHRtbCggYXBwbGljYXRpb24ubG9naW5WaWV3LnJlbmRlcigpLmVsIClcblxuXG4iLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICBcblxuXG4gIHJldHVybiBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBIb21lIFBhZ2UgVGVtcGxhdGVcXG4tLT5cXG5cXG48IS0tIE1BSU4gQVBQIENPTlRFTlQgLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuXFxuXFxuICA8IS0tIFNURVBTIE1BSU4gQ09OVEFJTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuY29udGVudCAtLT5cIjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgICAgICAgIDxoMyBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlcl9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gzPlxcbiAgICAgICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiIFxcbiAgICAgICAgICA8aDQgY2xhc3M9XFxcInN0ZXAtZm9ybV9fc3VidGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbnN0cnVjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8cCBjbGFzcz1cXFwibGFyZ2VcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5sb2dpbl9pbnN0cnVjdGlvbnMpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxvZ2luX2luc3RydWN0aW9uczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvcD5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuICBidWZmZXIgKz0gXCI8ZGl2IGNsYXNzPVxcXCJjb250ZW50XFxcIj5cXG5cXG5cXG4gIDwhLS0gU1RFUFMgTUFJTiBDT05UQUlORVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAgc3RlcC0tZmlyc3Qgc3RlcC0tbG9naW5cXFwiPlxcbiAgICBcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm1cXFwiPlxcblxcbiAgICAgICAgPCEtLSBTVEVQIEZPUk0gSEVBREVSIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWhlYWRlclxcXCI+XFxuXFxuICAgICAgICAgIDwhLS0gU1RFUCBUSVRMRSAtLT5cXG4gICAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgXFxuICAgICAgICAgIDwhLS0gU1RFUCBGT1JNIFRJVExFIC0tPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmZvcm1UaXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1oZWFkZXIgLS0+XFxuICAgICAgICBcXG4gICAgICAgIDwhLS0gU1RFUCBJTlNUUlVDVElPTlMgLS0+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmxvZ2luX2luc3RydWN0aW9ucywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiA8IS0tIGVuZCAuc3RlcC1mb3JtLWluc3RydWN0aW9ucyAtLT5cXG5cXG5cXG5cXG5cXG4gICAgICAgIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcbiAgICAgICAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImxvZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIvYXV0aC9tZWRpYXdpa2lcXFwiPlxcbiAgICAgICAgICAgIExvZ2luIHdpdGggV2lraXBlZGlhXFxuICAgICAgICAgIDwvYT5cXG4gICAgICAgICAgPGEgY2xhc3M9XFxcImZvbnQtYmx1ZVxcXCIgaHJlZj1cXFwiL3dlbGNvbWVcXFwiIGlkPVxcXCJza2lwTG9naW5CdXR0b25cXFwiPlxcbiAgICAgICAgICAgIDxlbT5vciBza2lwIGl0IGZvciBub3cgYW5kIGp1c3Qgc2VlIHRoZSBjdXJyZW50IGJ1aWxkPC9lbT5cXG4gICAgICAgICAgPC9hPlxcbiAgICAgICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1hY3Rpb25zIC0tPlxcblxcblxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWZvcm0gLS0+XFxuICAgIDwvZGl2PlxcbiAgPC9kaXY+XFxuPC9kaXY+XCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH0pIiwibW9kdWxlLmV4cG9ydHM9cmVxdWlyZShcImhhbmRsZWlmeVwiKS50ZW1wbGF0ZShmdW5jdGlvbiAoSGFuZGxlYmFycyxkZXB0aDAsaGVscGVycyxwYXJ0aWFscyxkYXRhKSB7XG4gIHRoaXMuY29tcGlsZXJJbmZvID0gWzQsJz49IDEuMC4wJ107XG5oZWxwZXJzID0gdGhpcy5tZXJnZShoZWxwZXJzLCBIYW5kbGViYXJzLmhlbHBlcnMpOyBkYXRhID0gZGF0YSB8fCB7fTtcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwiZG90IHN0ZXAtbmF2LWluZGljYXRvcnNfX2l0ZW0gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pc0FjdGl2ZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLmhhc1Zpc2l0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiIGRhdGEtbmF2LWlkPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgdGl0bGU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnN0ZXBUaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIGRhdGEtc3RlcC1pZD1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0ZXBJZCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuc3RlcElkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+KjwvZGl2PlxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0yKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiYWN0aXZlXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJ2aXNpdGVkXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCJpbmFjdGl2ZVwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IFN0ZXAgTmF2aWdhdGlvbiBcXG4tLT5cXG5cXG5cXG48IS0tIFNURVAgTkFWIERPVCBJTkRJQ0FUT1JTIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWluZGljYXRvcnMgaGlkZGVuXFxcIj5cXG5cXG4gIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5zdGVwcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1pbmRpY2F0b3JzIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBOQVYgQlVUVE9OUyAtLT5cXG48ZGl2IGNsYXNzPVxcXCJzdGVwLW5hdi1idXR0b25zXFxcIj5cXG5cXG4gIDxhIGhyZWY9XFxcIiNcXFwiIGNsYXNzPVxcXCJzdGVwLW5hdl9fYnV0dG9uIHN0ZXAtbmF2LS1wcmV2IHByZXYgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5wcmV2SW5hY3RpdmUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICA8c3BhbiBzdHlsZT1cXFwibWFyZ2luLXJpZ2h0OjVweDtcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtbmF2LWFycm93IHN0ZXAtbmF2LWFycm93LS1sZWZ0XFxcIj48L2Rpdj5cXG4gICAgPC9zcGFuPlxcbiAgICBQcmV2XFxuICA8L2E+XFxuXFxuICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwic3RlcC1uYXZfX2J1dHRvbiBzdGVwLW5hdi0tbmV4dCBuZXh0IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAubmV4dEluYWN0aXZlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNiwgcHJvZ3JhbTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxcIj5cXG4gICAgTmV4dFxcbiAgICA8c3BhbiBzdHlsZT1cXFwibWFyZ2luLWxlZnQ6NXB4O1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1uYXYtYXJyb3cgc3RlcC1uYXYtYXJyb3ctLXJpZ2h0XFxcIj48L2Rpdj5cXG4gICAgPC9zcGFuPlxcbiAgPC9hPlxcblxcbjwvZGl2PjwhLS0gZW5kIC5zdGVwLW5hdi1idXR0b25zIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIHNlbGY9dGhpcztcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIiBcXG4gICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCIgXFxuICAgIDxoNCBjbGFzcz1cXFwic3RlcC1mb3JtX19zdWJ0aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmZvcm1UaXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuZm9ybVRpdGxlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9oND5cXG4gICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWluc3RydWN0aW9uc1xcXCI+XFxuICAgIDxwIGNsYXNzPVxcXCJsYXJnZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmluc3RydWN0aW9ucykgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuaW5zdHJ1Y3Rpb25zOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbmRpdmlkYWwgU3RlcCBUZW1wbGF0ZVxcbi0tPlxcblxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuXFxuICA8IS0tIFNURVAgRk9STSBIRUFERVIgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG5cXG4gICAgPCEtLSBTVEVQIFRJVExFIC0tPlxcbiAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICBcXG4gICAgPCEtLSBTVEVQIEZPUk0gVElUTEUgLS0+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWhlYWRlciAtLT5cXG4gIFxcbiAgPCEtLSBTVEVQIElOU1RSVUNUSU9OUyAtLT5cXG4gIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5zdHJ1Y3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNSwgcHJvZ3JhbTUsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIDwhLS0gZW5kIC5zdGVwLWZvcm0taW5zdHJ1Y3Rpb25zIC0tPlxcblxcblxcblxcbiAgPCEtLSBJTlRSTyBTVEVQIEZPUk0gQVJFQSAtLT5cXG4gIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbm5lclxcXCI+XFxuICAgIDwhLS0gZm9ybSBmaWVsZHMgLS0+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWlubmVyIC0tPlxcblxcblxcbiAgPCEtLSBEQVRFUyBNT0RVTEUgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tZGF0ZXNcXFwiPlxcblxcbiAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybS1kYXRlcyAtLT5cXG5cXG4gIDwhLS0gQkVHSU4gQlVUVE9OIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1mb3JtLWFjdGlvbnNcXFwiPlxcbiAgICA8YSBjbGFzcz1cXFwiYnV0dG9uIGJ1dHRvbi0tYmx1ZVxcXCIgaWQ9XFxcImJlZ2luQnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIj5cXG4gICAgICBCZWdpbiBBc3NpZ25tZW50IFdpemFyZFxcbiAgICA8L2E+XFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtLWFjdGlvbnMgLS0+XFxuXFxuXFxuPC9kaXY+PCEtLSBlbmQgLnN0ZXAtZm9ybSAtLT5cXG5cXG5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGgzIGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyX190aXRsZVxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGg0IGNsYXNzPVxcXCJzdGVwLWZvcm0tY29udGVudF9fdGl0bGVcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5mb3JtVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmZvcm1UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDQ+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW01KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5pbmZvVGl0bGUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmluZm9UaXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPHAgY2xhc3M9XFxcImxhcmdlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaW5zdHJ1Y3Rpb25zKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pbnN0cnVjdGlvbnM7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L3A+XFxuICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW05KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb24gXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5hY2NvcmRpYW4sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcXCI+XFxuICAgICAgXFxuICAgICAgPCEtLSBJTkZPIFNFQ1RJT04gSEVBREVSIC0tPlxcbiAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAudGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMiwgcHJvZ3JhbTEyLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIFxcbiAgICAgIDwhLS0gSU5GTyBTRUNUSU9OIENPTlRFTlQgLS0+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXNlY3Rpb25fX2NvbnRlbnRcXFwiPlxcbiAgICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLmNvbnRlbnQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNCwgcHJvZ3JhbTE0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9fY29udGVudCAtLT5cXG5cXG4gICAgPC9kaXY+PCEtLSBlbmQgLnN0ZXAtaW5mby1zZWN0aW9uIC0tPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTEwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHN0ZXAtaW5mby1zZWN0aW9uLS1hY2NvcmRpYW5cIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby1zZWN0aW9uX19oZWFkZXJcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy50aXRsZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudGl0bGU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCI8L2gyPlxcbiAgICAgIDwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tc2VjdGlvbl9faGVhZGVyIC0tPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiICAgIFxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAgICBcXG4gICAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IE1haW4gSW5kaXZpZGFsIFN0ZXAgVGVtcGxhdGVcXG4tLT5cXG5cXG5cXG48IS0tIFNURVAgRk9STSA6IExlZnQgU2lkZSBvZiBTdGVwIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybVxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0taGVhZGVyXFxcIj5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC50aXRsZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgPC9kaXY+XFxuXFxuICBcXG4gIDwhLS0gU1RFUCBGT1JNIElOTkVSIENPTlRFTlQgLS0+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWZvcm0tY29udGVudFxcXCI+XFxuICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuZm9ybVRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtZm9ybS1pbm5lclxcXCI+PC9kaXY+XFxuICA8L2Rpdj5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1mb3JtIC0tPlxcblxcblxcblxcbjwhLS0gU1RFUCBJTkZPIDogUmlnaHQgc2lkZSBvZiBzdGVwIC0tPlxcbjxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mb1xcXCI+XFxuICBcXG4gIDwhLS0gV0lLSUVEVSBMT0dPIC0tPlxcbiAgPGEgY2xhc3M9XFxcIm1haW4tbG9nb1xcXCIgaHJlZj1cXFwiaHR0cDovL3dpa2llZHUub3JnXFxcIiB0YXJnZXQ9XFxcIl9ibGFua1xcXCIgdGl0bGU9XFxcIndpa2llZHUub3JnXFxcIj5XSUtJRURVLk9SRzwvYT5cXG5cXG4gIDwhLS0gU1RFUCBJTkZPIElOTkVSIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLWlubmVyXFxcIj5cXG5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbmZvVGl0bGUsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5pbnN0cnVjdGlvbnMsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG4gICAgXFxuICAgIDwhLS0gSU5GTyBTRUNUSU9OUyAtLT5cXG4gICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnMuZWFjaC5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlY3Rpb25zLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOSwgcHJvZ3JhbTksIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICA8L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvLWlubmVyIC0tPlxcbiAgXFxuXFxuXFxuICA8IS0tIFNURVAgSU5GTyBUSVAgU0VDVElPTiAtLT5cXG4gIDwhLS0gdXNlZCBmb3IgYm90aCBjb3Vyc2UgaW5mbyBhbmQgZ2VuZXJpYyBpbmZvIC0tPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcHNcXFwiPjwvZGl2PjwhLS0gZW5kIC5zdGVwLWluZm8tdGlwcyAtLT5cXG5cXG5cXG48L2Rpdj48IS0tIGVuZCAuc3RlcC1pbmZvIC0tPlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDxwPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gKHR5cGVvZiBkZXB0aDAgPT09IGZ1bmN0aW9uVHlwZSA/IGRlcHRoMC5hcHBseShkZXB0aDApIDogZGVwdGgwKTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC9wPlxcbiAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgICA8bGkgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlwiO1xuICBzdGFjazEgPSAodHlwZW9mIGRlcHRoMCA9PT0gZnVuY3Rpb25UeXBlID8gZGVwdGgwLmFwcGx5KGRlcHRoMCkgOiBkZXB0aDApO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9saT5cXG4gICAgICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLWdyaWRcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fc3RhdFxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRleHQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnRleHQ7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiIDogXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnN0YXJzKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGFyczsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8gc3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuPGEgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2Nsb3NlXFxcIj5DbG9zZSBJbmZvPC9hPlxcbiAgPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9faW5uZXJcXFwiPlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrIFxcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPkFzc2lnbm1lbnQgdHlwZTogXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgPC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGV4dFxcXCI+XFxuICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAuZGVzY3JpcHRpb24sIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxLCBwcm9ncmFtMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICA8L2Rpdj5cXG5cXG4gICAgICBcXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2stLXR3by1jb2x1bW5zXFxcIj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgICAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPk1pbmltdW0gdGltZWxpbmU8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX19zdGF0XFxcIj5cXG4gICAgICAgICAgXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLm1pbl90aW1lbGluZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAubWluX3RpbWVsaW5lOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5SZWNvbW1lbmRlZCB0aW1lbGluZTwvaDI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3N0YXRcXFwiPlxcbiAgICAgICAgICBcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMucmVjX3RpbWVsaW5lKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5yZWNfdGltZWxpbmU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja1xcXCI+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9jay0tdHdvLWNvbHVtbnNcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtaW5mby1ibG9ja19fdGl0bGVcXFwiPlxcbiAgICAgICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+QmVzdCBmb3I8L2gyPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8dWw+XFxuICAgICAgICAgIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsIGRlcHRoMC5iZXN0X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrLS10d28tY29sdW1uc1xcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJpbnB1dC1pbmZvLWJsb2NrX190aXRsZVxcXCI+XFxuICAgICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5Ob3QgYXBwcm9wcmlhdGUgZm9yPC9oMj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPHVsPlxcbiAgICAgICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubm90X2Zvciwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMsIHByb2dyYW0zLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cXG4gICAgPC9kaXY+XFxuICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImlucHV0LWluZm8tYmxvY2tfX3RpdGxlXFxcIj5cXG4gICAgICAgIDxoMiBjbGFzcz1cXFwiZm9udC1ibHVlLS1kYXJrXFxcIj5MZWFybmluZyBPYmplY3RpdmVzPC9oMj5cXG4gICAgICA8L2Rpdj5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCBkZXB0aDAubGVhcm5pbmdfb2JqZWN0aXZlcywge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDUsIHByb2dyYW01LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uLCBzZWxmPXRoaXM7XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDI+XFxuICAgICAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxwPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5jb250ZW50KSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5jb250ZW50OyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiPC9wPlxcbiAgICAgIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiPGRpdiBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcFxcXCIgZGF0YS1pdGVtLWluZGV4PVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XFxuICA8YSBjbGFzcz1cXFwic3RlcC1pbmZvLXRpcF9fY2xvc2VcXFwiPkNsb3NlIEluZm88L2E+XFxuICAgIDxkaXYgY2xhc3M9XFxcInN0ZXAtaW5mby10aXBfX2lubmVyXFxcIj5cXG5cXG4gICAgICBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnRpdGxlLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuICAgICAgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5jb250ZW50LCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMywgcHJvZ3JhbTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiXFxuICAgICAgXFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazIsIHNlbGY9dGhpcywgZnVuY3Rpb25UeXBlPVwiZnVuY3Rpb25cIiwgZXNjYXBlRXhwcmVzc2lvbj10aGlzLmVzY2FwZUV4cHJlc3Npb247XG5cbmZ1bmN0aW9uIHByb2dyYW0xKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIsIHByb2dyYW0yLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5kaXNhYmxlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0LCBwcm9ncmFtNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcImNoZWNrLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00KGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIG5vdC1lZGl0YWJsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBkYXRhLWV4Y2x1c2l2ZT1cXFwidHJ1ZVxcXCIgXCI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tY2hlY2tib3ggY3VzdG9tLWlucHV0LS1yYWRpb2JveCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmV4Y2x1c2l2ZSksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg2LCBwcm9ncmFtNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCI+XFxuICA8bGFiZWwgZm9yPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PHNwYW4+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L3NwYW4+PC9sYWJlbD5cXG4gIDxpbnB1dCBuYW1lPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgdHlwZT1cXFwicmFkaW9cXFwiIGlkPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWQpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiICAvPlxcbiAgPGEgY2xhc3M9XFxcInJhZGlvLWJ1dHRvblxcXCIgaHJlZj1cXFwiI1xcXCI+PC9hPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtY2hlY2tib3gtZ3JvdXBcXFwiIGRhdGEtY2hlY2tib3gtZ3JvdXA9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1jaGVja2JveC1ncm91cF9fbGFiZWxcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9kaXY+XFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTEsIHByb2dyYW0xMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTExKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWNoZWNrYm94IFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICA8aW5wdXQgbmFtZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmlkKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5pZDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcImNoZWNrYm94XFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIC8+XFxuICA8L2Rpdj5cXG4gIFwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdHVtLWlucHV0LS1zZWxlY3QgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubXVsdGlwbGUpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTQsIHByb2dyYW0xNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gIDxzZWxlY3QgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm11bHRpcGxlKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE2LCBwcm9ncmFtMTYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiPlxcbiAgICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTgsIHByb2dyYW0xOCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG4gIDwvc2VsZWN0PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMTQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgY3VzdHVtLWlucHV0LS1zZWxlY3QtLW11bHRpIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBtdWx0aXBsZSBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMTgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMubGFiZWwpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmxhYmVsOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIjwvb3B0aW9uPlxcbiAgICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LS10ZXh0X19pbm5lclxcXCI+XFxuICAgIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICAgIDxpbnB1dCBpZD1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgLz5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yMihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcGVyY2VudFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLXBlcmNlbnRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGRpdiBjbGFzcz1cXFwiaW5wdXQtY29udGFpbmVyXFxcIj5cXG4gICAgPGlucHV0IG5hbWU9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB0eXBlPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudHlwZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgbWF4bGVuZ3RoPVxcXCIyXFxcIiAvPlxcbiAgICA8L2Rpdj5cXG4gIDwvZGl2PlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMTtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tZWRpdFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2lubmVyXFxcIj5cXG4gICAgPGxhYmVsIGZvcj1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9sYWJlbD5cXG4gICAgPGEgY2xhc3M9XFxcImVkaXQtYnV0dG9uXFxcIiBocmVmPVxcXCIjXFxcIiBkYXRhLXN0ZXAtaWQ9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5lZGl0PC9hPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtLWVkaXRfX2NvbnRlbnRcXFwiPlxcbiAgICA8IS0tIGNvbnRlbnQgLS0+XFxuICA8L2Rpdj5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLXRleHRhcmVhXFxcIj5cXG4gIDxsYWJlbCBmb3I9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5pZCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiXFxcIj5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvbGFiZWw+XFxuICA8dGV4dGFyZWEgbmFtZT1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmlkKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiIHBsYWNlaG9sZGVyPVxcXCJcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucGxhY2Vob2xkZXIpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCIgcm93cz1cXFwiXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJvd3MpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIlxcXCI+PC90ZXh0YXJlYT5cXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjgoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbjxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dCBjdXN0b20taW5wdXQtLWxpbmtcXFwiPlxcbiAgPGxhYmVsPjxhIGhyZWY9XFxcIlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5ocmVmKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCJcXFwiID5cIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGFiZWwpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIjwvYT48L2xhYmVsPlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zMChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCJcXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXJcXFwiPlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyX19oZWFkZXJcXFwiPlxcbiAgICA8aDIgY2xhc3M9XFxcImZvbnQtYmx1ZS0tZGFya1xcXCI+XCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmxhYmVsKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCI8L2gyPlxcbiAgPC9kaXY+XFxuICBcIjtcbiAgc3RhY2syID0gaGVscGVycy5lYWNoLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC5kYXRhKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9wdGlvbnMpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzEsIHByb2dyYW0zMSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG48L2Rpdj5cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTMxKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxO1xuICBidWZmZXIgKz0gXCJcXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0IGN1c3RvbS1pbnB1dC0tcmFkaW9cXFwiPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyX19oZWFkZXJcXFwiPlxcbiAgPGgyIGNsYXNzPVxcXCJmb250LWJsdWUtLWRhcmtcXFwiPlwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZGF0YSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5sYWJlbCkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiPC9oMj5cXG48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQtcmFkaW8taW5uZXIgY3VzdG9tLWlucHV0LXJhZGlvLWlubmVyLS1ncm91cFxcXCI+XFxuICBcXG4gIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzLmVhY2guY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLmRhdGEpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEub3B0aW9ucyksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzNCwgcHJvZ3JhbTM0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbjwvZGl2PlxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5mdW5jdGlvbiBwcm9ncmFtMzQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazE7XG4gIGJ1ZmZlciArPSBcIlxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20taW5wdXQgY3VzdG9tLWlucHV0LS1yYWRpbyBjdXN0b20taW5wdXQtLXJhZGlvLWdyb3VwIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuc2VsZWN0ZWQsIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyLCBwcm9ncmFtMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMSB8fCBzdGFjazEgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gXCJcXFwiPlxcbiAgICAgIDxhIGNsYXNzPVxcXCJyYWRpby1idXR0b25cXFwiIGhyZWY9XFxcIiNcXFwiPjwvYT5cXG4gICAgICA8bGFiZWwgZm9yPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMudmFsdWUpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLnZhbHVlOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCI+XCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLmxhYmVsKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5sYWJlbDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2xhYmVsPlxcbiAgICAgIDxpbnB1dCBuYW1lPVxcXCJcIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuaWQpIHsgc3RhY2sxID0gc3RhY2sxLmNhbGwoZGVwdGgwLCB7aGFzaDp7fSxkYXRhOmRhdGF9KTsgfVxuICBlbHNlIHsgc3RhY2sxID0gZGVwdGgwLmlkOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIlxcXCIgaWQ9XFxcIlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy52YWx1ZSkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAudmFsdWU7IHN0YWNrMSA9IHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBlc2NhcGVFeHByZXNzaW9uKHN0YWNrMSlcbiAgICArIFwiXFxcIiB2YWx1ZT1cXFwiXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnZhbHVlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC52YWx1ZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCJcXFwiIHR5cGU9XFxcInJhZGlvXFxcIiBcIjtcbiAgc3RhY2sxID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgZGVwdGgwLnNlbGVjdGVkLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMiwgcHJvZ3JhbTIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiLz5cXG4gICAgPC9kaXY+XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG4gIGJ1ZmZlciArPSBcIjwhLS1cXG4gIEF1dGhvcjoga2V2aW5Ad2ludHIudXNcXG4gIERhdGU6IDEwLzAyLzIwMTRcXG5cXG4gIERlc2NyaXB0aW9uOiBJbnB1dCBJdGVtIFRlbXBsYXRlc1xcbiAgXFxuLS0+XFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Cb3gpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oOCwgcHJvZ3JhbTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY2hlY2tib3hHcm91cCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMCwgcHJvZ3JhbTEwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxMywgcHJvZ3JhbTEzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRleHQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjAsIHByb2dyYW0yMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cXG5cXG5cIlxuICAgICsgXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSBkZXB0aDAudHlwZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wZXJjZW50KSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZWRpdCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyNCwgcHJvZ3JhbTI0LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRleHRhcmVhKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDI2LCBwcm9ncmFtMjYsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEubGluayksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyOCwgcHJvZ3JhbTI4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiXG4gICAgKyBcIlxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9IGRlcHRoMC50eXBlKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJhZGlvKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDMwLCBwcm9ncmFtMzAsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXFxuXFxuXCJcbiAgICArIFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gZGVwdGgwLnR5cGUpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmFkaW9Hcm91cCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzMywgcHJvZ3JhbTMzLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIFxuXG5cbiAgcmV0dXJuIFwiPCEtLVxcbiAgQXV0aG9yOiBrZXZpbkB3aW50ci51c1xcbiAgRGF0ZTogMTAvMDIvMjAxNFxcblxcbiAgRGVzY3JpcHRpb246IE1hcmt1cCBmb3IgU3RhcnQvRW5kIERhdGUgSW5wdXQgTW9kdWxlXFxuLS0+XFxuXFxuXFxuPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzXFxcIj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19fbGFiZWxcXFwiPkNvdXJzZSBkYXRlczwvZGl2PlxcbiAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLWlucHV0LWRhdGVzX19pbm5lciBmcm9tXFxcIj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS15ZWFyXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5ZZWFyPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwieWVhclxcXCIgaWQ9XFxcInllYXJTdGFydFxcXCIgbmFtZT1cXFwieWVhclN0YXJ0XFxcIj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIlxcXCI+PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE0XFxcIj4yMDE0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE1XFxcIj4yMDE1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE2XFxcIj4yMDE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE3XFxcIj4yMDE3PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE4XFxcIj4yMDE4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDE5XFxcIj4yMDE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIwXFxcIj4yMDIwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIxXFxcIj4yMDIxPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIyXFxcIj4yMDIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDIzXFxcIj4yMDIzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI0XFxcIj4yMDI0PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI1XFxcIj4yMDI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMDI2XFxcIj4yMDI2PC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLW1vbnRoXFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5Nb250aDwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcIm1vbnRoXFxcIiBpZD1cXFwibW9udGhTdGFydFxcXCIgbmFtZT1cXFwibW9udGhTdGFydFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG5cXG4gICAgPGRpdiBjbGFzcz1cXFwiY3VzdG9tLXNlbGVjdCBjdXN0b20tc2VsZWN0LS1kYXlcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPkRheTwvZGl2PlxcbiAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImRheVxcXCIgaWQ9XFxcImRheVN0YXJ0XFxcIiBuYW1lPVxcXCJkYXlTdGFydFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTNcXFwiPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNFxcXCI+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE1XFxcIj4xNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTZcXFwiPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxN1xcXCI+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE4XFxcIj4xODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTlcXFwiPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMFxcXCI+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIxXFxcIj4yMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjJcXFwiPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyM1xcXCI+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI0XFxcIj4yNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjVcXFwiPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNlxcXCI+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI3XFxcIj4yNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjhcXFwiPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOVxcXCI+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMwXFxcIj4zMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzFcXFwiPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICBcXG5cXG4gIDwvZGl2PlxcbiAgPHNwYW4gY2xhc3M9XFxcImRhdGVzLXRvXFxcIj5cXG4gICAgdG9cXG4gIDwvc3Bhbj5cXG4gIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1pbnB1dC1kYXRlc19faW5uZXIgdG9cXFwiPlxcblxcbiAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0IGN1c3RvbS1zZWxlY3QtLXllYXJcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPlllYXI8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJ5ZWFyXFxcIiBpZD1cXFwieWVhckVuZFxcXCIgbmFtZT1cXFwieWVhckVuZFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNFxcXCI+MjAxNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNVxcXCI+MjAxNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxNlxcXCI+MjAxNjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxN1xcXCI+MjAxNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxOFxcXCI+MjAxODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAxOVxcXCI+MjAxOTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyMFxcXCI+MjAyMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyMVxcXCI+MjAyMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyMlxcXCI+MjAyMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyM1xcXCI+MjAyMzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyNFxcXCI+MjAyNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyNVxcXCI+MjAyNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjAyNlxcXCI+MjAyNjwvb3B0aW9uPlxcbiAgICAgIDwvc2VsZWN0PlxcbiAgICA8L2Rpdj5cXG4gICAgXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tbW9udGhcXFwiPlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QtbGFiZWxcXFwiPk1vbnRoPC9kaXY+XFxuICAgICAgPHNlbGVjdCBjbGFzcz1cXFwibW9udGhcXFwiIGlkPVxcXCJtb250aEVuZFxcXCIgbmFtZT1cXFwibW9udGhFbmRcXFwiPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiXFxcIj48L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAxXFxcIj4xPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwMlxcXCI+Mjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDNcXFwiPjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA0XFxcIj40PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNVxcXCI+NTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDZcXFwiPjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA3XFxcIj43PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOFxcXCI+ODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDlcXFwiPjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEwXFxcIj4xMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTFcXFwiPjExPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMlxcXCI+MTI8L29wdGlvbj5cXG4gICAgICA8L3NlbGVjdD5cXG4gICAgPC9kaXY+XFxuXFxuICAgIDxkaXYgY2xhc3M9XFxcImN1c3RvbS1zZWxlY3QgY3VzdG9tLXNlbGVjdC0tZGF5XFxcIj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJjdXN0b20tc2VsZWN0LWxhYmVsXFxcIj5EYXk8L2Rpdj5cXG4gICAgICA8c2VsZWN0IGNsYXNzPVxcXCJkYXlcXFwiIGlkPVxcXCJkYXlFbmRcXFwiIG5hbWU9XFxcImRheUVuZFxcXCI+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJcXFwiPjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDFcXFwiPjE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjAyXFxcIj4yPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwM1xcXCI+Mzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDRcXFwiPjQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA1XFxcIj41PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwNlxcXCI+Njwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMDdcXFwiPjc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjA4XFxcIj44PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIwOVxcXCI+OTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTBcXFwiPjEwPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxMVxcXCI+MTE8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjEyXFxcIj4xMjwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTNcXFwiPjEzPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxNFxcXCI+MTQ8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE1XFxcIj4xNTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTZcXFwiPjE2PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIxN1xcXCI+MTc8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjE4XFxcIj4xODwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMTlcXFwiPjE5PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyMFxcXCI+MjA8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjIxXFxcIj4yMTwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjJcXFwiPjIyPC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyM1xcXCI+MjM8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI0XFxcIj4yNDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjVcXFwiPjI1PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyNlxcXCI+MjY8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjI3XFxcIj4yNzwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMjhcXFwiPjI4PC9vcHRpb24+XFxuICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCIyOVxcXCI+Mjk8L29wdGlvbj5cXG4gICAgICAgIDxvcHRpb24gdmFsdWU9XFxcIjMwXFxcIj4zMDwvb3B0aW9uPlxcbiAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiMzFcXFwiPjMxPC9vcHRpb24+XFxuICAgICAgPC9zZWxlY3Q+XFxuICAgIDwvZGl2PlxcblxcbiAgICBcXG5cXG4gIDwvZGl2PlxcblxcbjwvZGl2PlwiO1xuICB9KSIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMiwgc2VsZj10aGlzLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbjtcblxuZnVuY3Rpb24gcHJvZ3JhbTEoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXZhbHVhdGUgYW4gYXJ0aWNsZX19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQ29weWVkaXQgYW4gYXJ0aWNsZX19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTUoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQWRkIHRvIGFuIGFydGljbGV9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW03KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0lsbHVzdHJhdGUgYW4gYXJ0aWNsZX19XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTkoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvTGlzdCBhcnRpY2xlIGNob2ljZXN9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9DaG9vc2UgYXJ0aWNsZXMgZnJvbSBhIGxpc3R9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0xMyhkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9TZWxlY3QgYXJ0aWNsZSBmcm9tIHN0dWRlbnQgY2hvaWNlc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE1KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBzdGFjazI7XG4gIGJ1ZmZlciArPSBcIlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHJhZnRzX21haW5zcGFjZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zYW5kYm94KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgxNiwgcHJvZ3JhbTE2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcbiAgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZHJhZnRzX21haW5zcGFjZSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53b3JrX2xpdmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDE4LCBwcm9ncmFtMTgsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW0xNihkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db252ZW50aW9uYWwgb3V0bGluZSB9fVxcbiAgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTE4KGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbnZlbnRpb25hbCBvdXRsaW5lIHwgc2FuZGJveCA9IG5vIH19XFxuICBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3V0bGluZSBhcyBsZWFkIHNlY3Rpb24gfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRFlLIG5vbWluYXRpb25zfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMjQoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvUHJlcGFyZSBpbi1jbGFzcyBwcmVzZW50YXRpb259fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yNihkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBDbGFzcyBwcmVzZW50YXRpb25zIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0yOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBGaW5pc2hpbmcgVG91Y2hlcyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvSW4tY2xhc3MgcHJlc2VudGF0aW9uc319XFxuXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cblxuZnVuY3Rpb24gcHJvZ3JhbTMyKGRlcHRoMCxkYXRhKSB7XG4gIFxuICB2YXIgYnVmZmVyID0gXCJcIjtcbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1JlZmxlY3RpdmUgZXNzYXl9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zNChkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCI7XG4gIGJ1ZmZlciArPSBcIlxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9XaWtpcGVkaWEgcG9ydGZvbGlvfX1cXG5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtMzYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiO1xuICBidWZmZXIgKz0gXCJcXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvT3JpZ2luYWwgYXJndW1lbnQgcGFwZXJ9fVxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW0zOChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBpbnRlcmVzdGVkX2luX0RZSyA9IHllcyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDAoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgaW50ZXJlc3RlZF9pbl9EWUsgPSBubyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDIoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIFxuICByZXR1cm4gXCIgaW50ZXJlc3RlZF9pbl9Hb29kX0FydGljbGVzID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00NChkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBpbnRlcmVzdGVkX2luX0dvb2RfQXJ0aWNsZXMgPSBubyBcIjtcbiAgfVxuXG5mdW5jdGlvbiBwcm9ncmFtNDYoZGVwdGgwLGRhdGEpIHtcbiAgXG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIHN0YWNrMjtcbiAgYnVmZmVyICs9IFwiIFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnJlcXVlc3RfaGVscCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oNDcsIHByb2dyYW00NywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHJldHVybiBidWZmZXI7XG4gIH1cbmZ1bmN0aW9uIHByb2dyYW00NyhkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiB8IHdhbnRfaGVscF9maW5kaW5nX2FydGljbGVzID0geWVzIFwiO1xuICB9XG5cbmZ1bmN0aW9uIHByb2dyYW00OShkZXB0aDAsZGF0YSkge1xuICBcbiAgdmFyIGJ1ZmZlciA9IFwiXCIsIHN0YWNrMSwgc3RhY2syO1xuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVxdWVzdF9oZWxwKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1MCwgcHJvZ3JhbTUwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfVxuZnVuY3Rpb24gcHJvZ3JhbTUwKGRlcHRoMCxkYXRhKSB7XG4gIFxuICBcbiAgcmV0dXJuIFwiIHwgd2FudF9oZWxwX2V2YWx1YXRpbmdfYXJ0aWNsZXMgPSB5ZXMgXCI7XG4gIH1cblxuICBidWZmZXIgKz0gXCJ7e2NvdXJzZSBkZXRhaWxzIHwgY291cnNlX25hbWUgPSBcIlxuICAgICsgZXNjYXBlRXhwcmVzc2lvbigoKHN0YWNrMSA9ICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuaW50cm8pLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY291cnNlX25hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBpbnN0cnVjdG9yX3VzZXJuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmluc3RydWN0b3JfdXNlcm5hbWUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBpbnN0cnVjdG9yX3JlYWxuYW1lID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnRlYWNoZXIpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBzdWJqZWN0ID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN1YmplY3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBzdGFydF9kYXRlID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0YXJ0X2RhdGUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnZhbHVlKSksdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazEpKVxuICAgICsgXCIgfCBlbmRfZGF0ZSA9IFwiXG4gICAgKyBlc2NhcGVFeHByZXNzaW9uKCgoc3RhY2sxID0gKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5pbnRybyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5lbmRfZGF0ZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGluc3RpdHV0aW9uID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNjaG9vbCkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEudmFsdWUpKSx0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMSkpXG4gICAgKyBcIiB8IGV4cGVjdGVkX3N0dWRlbnRzID0gXCJcbiAgICArIGVzY2FwZUV4cHJlc3Npb24oKChzdGFjazEgPSAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmludHJvKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS52YWx1ZSkpLHR5cGVvZiBzdGFjazEgPT09IGZ1bmN0aW9uVHlwZSA/IHN0YWNrMS5hcHBseShkZXB0aDApIDogc3RhY2sxKSlcbiAgICArIFwiIH19XFxuXFxuXCI7XG4gIGlmIChzdGFjazIgPSBoZWxwZXJzLmRlc2NyaXB0aW9uKSB7IHN0YWNrMiA9IHN0YWNrMi5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMiA9IGRlcHRoMC5kZXNjcmlwdGlvbjsgc3RhY2syID0gdHlwZW9mIHN0YWNrMiA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2syLmFwcGx5KGRlcHRoMCkgOiBzdGFjazI7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2syKVxuICAgICsgXCJcXG5cXG49PVRpbWVsaW5lPT1cXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMSB8IFdpa2lwZWRpYSBlc3NlbnRpYWxzIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ludHJvIHRvIFdpa2lwZWRpYX19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDIgfCBFZGl0aW5nIGJhc2ljcyB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9FZGl0aW5nIGJhc2ljcyBpbiBjbGFzc319XFxuXFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IHwgZHVlID0gV2VlayAzIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBsZXRlIHRoZSB0cmFpbmluZ319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NyZWF0ZSB1c2VycGFnZSBhbmQgc2lnbiB1cH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1ByYWN0aWNlIGNvbW11bmljYXRpbmd9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgZW5yb2xsZWR9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAzIHwgRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRXhwbG9yaW5nIHRoZSB0b3BpYyBhcmVhIGluIGNsYXNzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDQgfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuY3JpdGlxdWVfYXJ0aWNsZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNvcHlfZWRpdF9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzLCBwcm9ncmFtMywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgNCB8IFVzaW5nIHNvdXJjZXMgYW5kIGNob29zaW5nIGFydGljbGVzIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL1VzaW5nIHNvdXJjZXMgaW4gY2xhc3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNX19XFxuXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuZ2V0dGluZ19zdGFydGVkKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmFkZF90b19hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg1LCBwcm9ncmFtNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5nZXR0aW5nX3N0YXJ0ZWQpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuaWxsdXN0cmF0ZV9hcnRpY2xlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg3LCBwcm9ncmFtNywgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg5LCBwcm9ncmFtOSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5wcmVwYXJlX2xpc3QpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDExLCBwcm9ncmFtMTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V2YWx1YXRlIGFydGljbGUgc2VsZWN0aW9ucyB8IGR1ZSA9IFdlZWsgNX19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDUgfCBGaW5hbGl6aW5nIHRvcGljcyBhbmQgc3RhcnRpbmcgcmVzZWFyY2ggfX1cXG5cIlxuICAgICsgXCJ7e2luIGNsYXNzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvRGlzY3VzcyB0b3BpY3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgNiB9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmNob29zaW5nX2FydGljbGVzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnN0dWRlbnRzX2V4cGxvcmUpKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEzLCBwcm9ncmFtMTMsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0NvbXBpbGUgYSBiaWJsaW9ncmFwaHl9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA2IHwgRHJhZnRpbmcgc3RhcnRlciBhcnRpY2xlcyB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9EaXNjdXNzIGV0aXF1ZXR0ZSBhbmQgc2FuZGJveGVzfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDcgfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5yZXNlYXJjaF9wbGFubmluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5jcmVhdGVfb3V0bGluZSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMTUsIHByb2dyYW0xNSwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5yZXNlYXJjaF9wbGFubmluZyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS53cml0ZV9sZWFkKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgyMCwgcHJvZ3JhbTIwLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBtaWxlc3RvbmVzfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvU3R1ZGVudHMgaGF2ZSBzdGFydGVkIGVkaXRpbmd9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA3IHwgTW92aW5nIGFydGljbGVzIHRvIHRoZSBtYWluIHNwYWNlIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01haW4gc3BhY2UgaW4gY2xhc3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgOCB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Nb3ZlIHRvIG1haW4gc3BhY2V9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmR5a19nYSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5keWspKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnNlbGVjdGVkKSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDIyLCBwcm9ncmFtMjIsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazIgfHwgc3RhY2syID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazI7IH1cbiAgYnVmZmVyICs9IFwiXFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0V4cGFuZCB5b3VyIGFydGljbGV9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA4IHwgQnVpbGRpbmcgYXJ0aWNsZXMgfX1cXG5cIlxuICAgICsgXCJ7e2NsYXNzIHdvcmtzaG9wfX1cXG5cIlxuICAgICsgXCJ7e3N1YnN0Oldpa2lwZWRpYTpFZHVjYXRpb24gcHJvZ3JhbS9Bc3NpZ25tZW50IERlc2lnbiBXaXphcmQvQnVpbGRpbmcgYXJ0aWNsZXMgaW4gY2xhc3N9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCB8IGR1ZSA9IFdlZWsgOSB9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9Db21wbGV0ZSBmaXJzdCBkcmFmdH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBvbmUgcGVlciByZXZpZXcgYXJ0aWNsZX19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0Nob29zZSBwZWVyIHJldmlldyBhcnRpY2xlc3wgcGVlcnJldmlld251bWJlciA9IHR3byB9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCA5IHwgR2V0dGluZyBhbmQgZ2l2aW5nIGZlZWRiYWNrIH19XFxuXCJcbiAgICArIFwie3tpbiBjbGFzc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0dyb3VwIHN1Z2dlc3Rpb25zfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDEwIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIG9uZSBwZWVyIHJldmlld319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0RvIHBlZXIgcmV2aWV3cyB8IHBlZXJyZXZpZXdudW1iZXIgPSB0d28gfX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgbWlsZXN0b25lc319XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0FydGljbGVzIGhhdmUgYmVlbiByZXZpZXdlZH19XFxuXFxuXCJcbiAgICArIFwie3tjb3Vyc2Ugd2VlayB8IDEwIHwgUmVzcG9uZGluZyB0byBmZWVkYmFjayB9fVxcblwiXG4gICAgKyBcInt7aW4gY2xhc3N9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9NZWRpYSBsaXRlcmFjeSBkaXNjdXNzaW9ufX1cXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDExIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL01ha2UgZWRpdHMgYmFzZWQgb24gcGVlciByZXZpZXdzfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMjQsIHByb2dyYW0yNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2NvdXJzZSB3ZWVrIHwgMTEgfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSgyOCwgcHJvZ3JhbTI4LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oMjYsIHByb2dyYW0yNiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgfX1cXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLmNsYXNzX3ByZXNlbnRhdGlvbikpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzAsIHByb2dyYW0zMCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cXG5cIlxuICAgICsgXCJ7e2Fzc2lnbm1lbnQgfCBkdWUgPSBXZWVrIDEyIH19XFxuXCJcbiAgICArIFwie3tzdWJzdDpXaWtpcGVkaWE6RWR1Y2F0aW9uIHByb2dyYW0vQXNzaWdubWVudCBEZXNpZ24gV2l6YXJkL0ZpbmFsIHRvdWNoZXMgdG8gYXJ0aWNsZXN9fVxcblwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLnN1cHBsZW1lbnRhcnlfYXNzaWdubWVudHMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucmVmbGVjdGl2ZV9lc3NheSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzIsIHByb2dyYW0zMiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLnBvcnRmb2xpbykpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMzQsIHByb2dyYW0zNCwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCJcXG5cIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5zdXBwbGVtZW50YXJ5X2Fzc2lnbm1lbnRzKSxzdGFjazEgPT0gbnVsbCB8fCBzdGFjazEgPT09IGZhbHNlID8gc3RhY2sxIDogc3RhY2sxLm9yaWdpbmFsX3BhcGVyKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSgzNiwgcHJvZ3JhbTM2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIlxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIHdlZWsgfCAxMiB8IER1ZSBkYXRlIH19XFxuXCJcbiAgICArIFwie3thc3NpZ25tZW50IG1pbGVzdG9uZXN9fVxcblwiXG4gICAgKyBcInt7c3Vic3Q6V2lraXBlZGlhOkVkdWNhdGlvbiBwcm9ncmFtL0Fzc2lnbm1lbnQgRGVzaWduIFdpemFyZC9BbGwgc3R1ZGVudHMgZmluaXNoZWR9fVxcblxcblwiXG4gICAgKyBcInt7YXNzaWdubWVudCBncmFkaW5nIHwgQ29tcGxldGlvbiBvZiBXaWtpcGVkaWEgdHJhaW5pbmcgfCAxIHBvaW50IHwgXFxcIlByYWN0aWNlIG9uLXdpa2kgY29tbXVuaWNhdGlvblxcXCIgZXhlcmNpc2UgfCAxIHBvaW50IHwgXFxcIkNvcHllZGl0IGFuIGFydGljbGVcXFwiIGV4ZXJjaXNlIHwgMSBwb2ludCB8IFxcXCJFdmFsdWF0ZSBhbiBhcnRpY2xlXFxcIiBleGVyY2lzZVxcXCIgfCAxIHBvaW50IHwgXFxcIkFkZCB0byBhbiBhcnRpY2xlXFxcIiBleGVyY2lzZSB8IDEgcG9pbnQgfCBcXFwiSWxsdXN0cmF0ZSBhbiBhcnRpY2xlXFxcIiBleGVyY2lzZSB8IDEgcG9pbnQgfCBRdWFsaXR5IG9mIGJpYmxpb2dyYXBoeSBhbmQgb3V0bGluZSB8IDIgcG9pbnRzIHwgUGVlciByZXZpZXdzIGFuZCBjb2xsYWJvcmF0aW9uIHdpdGggY2xhc3NtYXRlcyB8IDIgcG9pbnRzIHwgUGFydGljaXBhdGlvbiBpbiBjbGFzcyBkaXNjdXNzaW9ucyB8IDIgcG9pbnRzIHwgUXVhbGl0eSBvZiB5b3VyIG1haW4gV2lraXBlZGlhIGNvbnRyaWJ1dGlvbnMgfCAxMCBwb2ludHMgfCBSZWZsZWN0aXZlIGVzc2F5IHwgMiBwb2ludHMgfCBPcmlnaW5hbCBhcmd1bWVudCBwYXBlciB8IDEwIHBvaW50cyB8IEluLWNsYXNzIHByZXNlbnRhdGlvbiBvZiBjb250cmlidXRpb25zIHwgMiBwb2ludHN9fVxcblxcblwiXG4gICAgKyBcInt7Y291cnNlIG9wdGlvbnMgfCBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5keWtfZ2EpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuZHlrKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5wcm9ncmFtKDQwLCBwcm9ncmFtNDAsIGRhdGEpLGZuOnNlbGYucHJvZ3JhbSgzOCwgcHJvZ3JhbTM4LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB8IFwiO1xuICBzdGFjazIgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCAoKHN0YWNrMSA9ICgoc3RhY2sxID0gZGVwdGgwLmR5a19nYSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5nYSkpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEuc2VsZWN0ZWQpLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYucHJvZ3JhbSg0NCwgcHJvZ3JhbTQ0LCBkYXRhKSxmbjpzZWxmLnByb2dyYW0oNDIsIHByb2dyYW00MiwgZGF0YSksZGF0YTpkYXRhfSk7XG4gIGlmKHN0YWNrMiB8fCBzdGFjazIgPT09IDApIHsgYnVmZmVyICs9IHN0YWNrMjsgfVxuICBidWZmZXIgKz0gXCIgXCI7XG4gIHN0YWNrMiA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsICgoc3RhY2sxID0gKChzdGFjazEgPSBkZXB0aDAuY2hvb3NpbmdfYXJ0aWNsZXMpLHN0YWNrMSA9PSBudWxsIHx8IHN0YWNrMSA9PT0gZmFsc2UgPyBzdGFjazEgOiBzdGFjazEucHJlcGFyZV9saXN0KSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0NiwgcHJvZ3JhbTQ2LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiBcIjtcbiAgc3RhY2syID0gaGVscGVyc1snaWYnXS5jYWxsKGRlcHRoMCwgKChzdGFjazEgPSAoKHN0YWNrMSA9IGRlcHRoMC5jaG9vc2luZ19hcnRpY2xlcyksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zdHVkZW50c19leHBsb3JlKSksc3RhY2sxID09IG51bGwgfHwgc3RhY2sxID09PSBmYWxzZSA/IHN0YWNrMSA6IHN0YWNrMS5zZWxlY3RlZCksIHtoYXNoOnt9LGludmVyc2U6c2VsZi5ub29wLGZuOnNlbGYucHJvZ3JhbSg0OSwgcHJvZ3JhbTQ5LCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2syIHx8IHN0YWNrMiA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2syOyB9XG4gIGJ1ZmZlciArPSBcIiB9fVxcblxcblxcblxcblwiO1xuICByZXR1cm4gYnVmZmVyO1xuICB9KSIsIlxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBEYXRlSW5wdXRWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG5cbiAgZXZlbnRzOlxuXG4gICAgJ2NsaWNrIHNlbGVjdCcgOiAnY2xpY2tIYW5kbGVyJ1xuXG4gICAgJ2NoYW5nZSBzZWxlY3QnIDogJ2NoYW5nZUhhbmRsZXInXG5cbiAgICAnZm9jdXMgc2VsZWN0JyA6ICdmb2N1c0hhbmRsZXInXG5cbiAgICAnYmx1ciBzZWxlY3QnIDogJ2JsdXJIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuICAgICQoJ2JvZHknKS5vbiAnY2xpY2snLCAoZSkgPT5cbiAgICAgIEBjbG9zZUlmTm9WYWx1ZSgpXG5cblxuXG4gIGNsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuICBibHVySGFuZGxlcjogKGUpIC0+XG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuICBmb2N1c0hhbmRsZXI6IChlKSAtPlxuICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cbiAgY2hhbmdlSGFuZGxlcjogKGUpIC0+XG4gICAgQGNsb3NlSWZOb1ZhbHVlKClcblxuXG5cbiAgaGFzVmFsdWU6IC0+XG4gICAgcmV0dXJuIEAkZWwuZmluZCgnc2VsZWN0JykudmFsKCkgIT0gJydcblxuICBjbG9zZUlmTm9WYWx1ZTogLT5cbiAgICBpZiBAaGFzVmFsdWUoKVxuICAgICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG4gICAgZWxzZVxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnb3BlbicpXG4iLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBIb21lVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG4jIEFQUFxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuSG9tZVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL0hvbWVUZW1wbGF0ZS5oYnMnKVxuT3V0cHV0VGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvb3V0cHV0L1dpa2lPdXRwdXRUZW1wbGF0ZS5oYnMnKVxuXG4jU1VCVklFV1NcblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5TdGVwTmF2VmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBOYXZWaWV3JylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEhvbWVWaWV3IGV4dGVuZHMgVmlld1xuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIFNFVFVQXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGNsYXNzTmFtZTogJ2hvbWUtdmlldydcblxuICB0ZW1wbGF0ZTogSG9tZVRlbXBsYXRlXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBJTklUXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuXG4gICAgQHN0ZXBzUmVuZGVyZWQgPSBmYWxzZVxuXG5cbiAgc3Vic2NyaXB0aW9uczpcbiAgICAnc3RlcDpuZXh0JyA6ICduZXh0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3N0ZXA6cHJldicgOiAncHJldkNsaWNrSGFuZGxlcidcblxuICAgICdzdGVwOmdvdG8nIDogJ2dvdG9DbGlja0hhbmRsZXInXG5cbiAgICAnc3RlcDplZGl0JyA6ICdlZGl0Q2xpY2tIYW5kbGVyJ1xuXG4gICAgJ3RpcHM6aGlkZScgOiAnaGlkZUFsbFRpcHMnXG5cblxuXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSkpXG5cbiAgICB1bmxlc3MgQHN0ZXBzUmVuZGVyZWRcbiAgICBcbiAgICAgIEBhZnRlclJlbmRlcigpXG5cbiAgICByZXR1cm4gQFxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICAjU1VCVklFV1NcbiAgICBAU3RlcE5hdiA9IG5ldyBTdGVwTmF2VmlldygpXG5cbiAgICAjIFRIRSBGT0xMV0lORyBDT1VMRCBQUk9CQUJMWSBIQVBQRU4gSU4gQSBDT0xMRVRJT04gVklFVyBDTEFTUyBUTyBDT05UUk9MIEFMTCBTVEVQU1xuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAJGlubmVyQ29udGFpbmVyID0gQCRlbC5maW5kKCcuY29udGVudCcpXG5cbiAgICAjIFNFVFVQIFNURVBTIEFORCBSRVRVUk4gQVJSQVkgT0YgVklFV1NcbiAgICBAc3RlcFZpZXdzID0gQF9jcmVhdGVTdGVwVmlld3MoKVxuXG4gICAgQFN0ZXBOYXYuc3RlcFZpZXdzID0gQHN0ZXBWaWV3c1xuXG4gICAgQFN0ZXBOYXYudG90YWxTdGVwcyA9IEBzdGVwVmlld3MubGVuZ3RoXG5cbiAgICBAJGlubmVyQ29udGFpbmVyLmFwcGVuZChAU3RlcE5hdi5lbClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuICAgICAgQHNob3dDdXJyZW50U3RlcCgpXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG5cbiAgX2NyZWF0ZVN0ZXBWaWV3czogLT5cbiAgICBcbiAgICBfdmlld3MgPSBbXVxuXG4gICAgXy5lYWNoKGFwcGxpY2F0aW9uLmRhdGEsKHN0ZXAsIGluZGV4KSA9PlxuXG4gICAgICBuZXdtb2RlbCA9IG5ldyBTdGVwTW9kZWwoKVxuXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcbiAgICAgIClcblxuICAgICAgbmV3dmlldyA9IG5ldyBTdGVwVmlldyhcbiAgICAgICAgbW9kZWw6IG5ld21vZGVsXG4gICAgICApXG5cbiAgICAgIG5ld3ZpZXcubW9kZWwuc2V0KCdzdGVwTnVtYmVyJywgaW5kZXggKyAxKVxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBJbmRleCcsIGluZGV4IClcblxuICAgICAgQCRzdGVwc0NvbnRhaW5lci5hcHBlbmQobmV3dmlldy5yZW5kZXIoKS5oaWRlKCkuZWwpXG5cbiAgICAgIF92aWV3cy5wdXNoKG5ld3ZpZXcpXG5cbiAgICApXG5cbiAgICByZXR1cm4gX3ZpZXdzXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgcmV0dXJuIHtcblxuICAgICAgY29udGVudDogXCJUaGlzIGlzIHNwZWNpYWwgY29udGVudFwiXG5cbiAgICB9XG4gICAgXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgQ1VTVE9NIEZVTkNUSU9OU1xuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuXG4gIGFkdmFuY2VTdGVwOiAtPlxuICAgIEBjdXJyZW50U3RlcCs9MVxuICAgIFxuICAgIGlmIEBjdXJyZW50U3RlcCA9PSBAc3RlcFZpZXdzLmxlbmd0aCBcbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuICBkZWNyZW1lbnRTdGVwOiAtPlxuICAgIEBjdXJyZW50U3RlcC09MVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwIDwgMFxuICAgICAgQGN1cnJlbnRTdGVwID0gQHN0ZXBWaWV3cy5sZW5ndGggLSAxXG5cbiAgICBAaGlkZUFsbFN0ZXBzKClcblxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG5cblxuICB1cGRhdGVTdGVwOiAoaW5kZXgpIC0+XG4gICAgQGN1cnJlbnRTdGVwID0gaW5kZXhcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuXG4gICAgQHNob3dDdXJyZW50U3RlcCgpXG5cblxuXG4gIHNob3dDdXJyZW50U3RlcDogLT5cbiAgICBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uc2hvdygpXG5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOnVwZGF0ZScsIEBjdXJyZW50U3RlcClcblxuICAgIHJldHVybiBAXG5cblxuXG4gIGN1cnJlbnRTdGVwVmlldzogLT5cbiAgICByZXR1cm4gQHN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdXG5cblxuXG4gIGhpZGVBbGxTdGVwczogLT5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG4gICAgICBzdGVwVmlldy5oaWRlKClcbiAgICApXG5cblxuXG4gIGhpZGVBbGxUaXBzOiAoZSkgLT5cbiAgICBfLmVhY2goQHN0ZXBWaWV3cywoc3RlcFZpZXcpID0+XG4gICAgICBzdGVwVmlldy50aXBWaXNpYmxlID0gZmFsc2VcbiAgICApXG5cbiAgICAkKCcuc3RlcC1pbmZvLXRpcCcpLnJlbW92ZUNsYXNzKCd2aXNpYmxlJylcblxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogLT5cbiAgICBAYWR2YW5jZVN0ZXAoKVxuXG4gICAgQGhpZGVBbGxUaXBzKClcblxuXG5cbiAgcHJldkNsaWNrSGFuZGxlcjogLT5cbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgICBAaGlkZUFsbFRpcHMoKVxuXG5cbiAgZWRpdENsaWNrSGFuZGxlcjogKGlkKSAtPlxuICAgIGNvbnNvbGUubG9nIGlkXG4gICAgXy5lYWNoKEBzdGVwVmlld3MsICh2aWV3LCBpbmRleCkgPT5cbiAgICAgIGlmIHZpZXcubW9kZWwuaWQgPT0gaWRcbiAgICAgICAgQHVwZGF0ZVN0ZXAoaW5kZXgpXG4gICAgKVxuXG4gIGdvdG9DbGlja0hhbmRsZXI6IChpbmRleCkgLT5cbiAgICBAdXBkYXRlU3RlcChpbmRleClcblxuICAgIEBoaWRlQWxsVGlwcygpXG5cblxuXG5cblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3Mvc3VwZXJzL0lucHV0VmlldycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgSW5wdXRWaWV3IFxuXG5cbiAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSG9tZVZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuIyBBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jIFNVUEVSIFZJRVcgQ0xBU1NcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cbiNURU1QTEFURVNcbkxvZ2luVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvTG9naW5UZW1wbGF0ZS5oYnMnKVxuXG5XaXphcmRDb250ZW50ID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb250ZW50JylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBIb21lVmlldyBleHRlbmRzIFZpZXdcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBTRVRVUFxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuICBjbGFzc05hbWU6ICdob21lLXZpZXcnXG5cbiAgdGVtcGxhdGU6IExvZ2luVGVtcGxhdGVcblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuICAgIHJldHVybiBXaXphcmRDb250ZW50WzBdIiwiXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1RFTVBMQVRFU1xuV2lraU91dHB1dFRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL3N0ZXBzL291dHB1dC9XaWtpT3V0cHV0VGVtcGxhdGUuaGJzJylcblxuXG5cbiNDT05GSUcgREFUQVxuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBXaWtpT3V0cHV0VGVtcGxhdGVcblxuXG4gIHN1YnNjcmlwdGlvbnM6XG5cbiAgICAnd2l6YXJkOnB1Ymxpc2gnIDogJ3B1Ymxpc2hIYW5kbGVyJyBcblxuXG4gIG91dHB1dFBsYWluVGV4dDogLT5cblxuICAgIEByZW5kZXIoKVxuXG4gICAgcmV0dXJuIEAkZWwudGV4dCgpXG5cblxuICByZW5kZXI6IC0+XG5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQHBvcHVsYXRlT3V0cHV0KCkgKSApXG4gICAgXG4gICAgQGFmdGVyUmVuZGVyKClcbiAgICBcbiAgICByZXR1cm4gQFxuXG5cbiAgcG9wdWxhdGVPdXRwdXQ6IC0+XG5cbiAgICByZXR1cm4gQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpIClcblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgICByZXR1cm4gXy5leHRlbmQoV2l6YXJkU3RlcElucHV0cyx7IGRlc2NyaXB0aW9uOiAkKCcjc2hvcnRfZGVzY3JpcHRpb24nKS52YWwoKX0pXG5cblxuICBleHBvcnREYXRhOiAoZm9ybURhdGEpIC0+XG5cbiAgICAkLmFqYXgoXG5cbiAgICAgIHR5cGU6ICdQT1NUJ1xuXG4gICAgICB1cmw6ICcvcHVibGlzaCdcblxuICAgICAgZGF0YTpcblxuICAgICAgICB3aWtpdGV4dDogZm9ybURhdGFcblxuICAgICAgICBjb3Vyc2VfdGl0bGU6IFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWVcblxuICAgICAgc3VjY2VzczogKHJlc3BvbnNlKSAtPlxuXG4gICAgICAgICQoJyNwdWJsaXNoJykucmVtb3ZlQ2xhc3MoJ3Byb2Nlc3NpbmcnKVxuXG4gICAgICAgIGlmIHJlc3BvbnNlLnN1Y2Nlc3NcblxuICAgICAgICAgIG5ld1BhZ2UgPSBcImh0dHA6Ly9lbi53aWtpcGVkaWEub3JnL3dpa2kvI3tyZXNwb25zZS50aXRsZX1cIlxuXG4gICAgICAgICAgYWxlcnQoXCJDb25ncmF0cyEgWW91IGhhdmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQvZWRpdGVkIGEgV2lraWVkdSBDb3Vyc2UgYXQgI3tuZXdQYWdlfVwiKVxuXG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBuZXdQYWdlXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgY29uc29sZS5sb2cgcmVzcG9uc2VcblxuICAgICAgICAgIGFsZXJ0KCd0aGVyZSB3YXMgYW4gZXJyb3IuIHNlZSBjb25zb2xlLicpXG5cblxuICAgIClcbiAgICBcblxuICBwdWJsaXNoSGFuZGxlcjogLT5cblxuICAgIGlmIFdpemFyZFN0ZXBJbnB1dHMuaW50cm8uY291cnNlX25hbWUudmFsdWUubGVuZ3RoID4gMCBcblxuICAgICAgJCgnI3B1Ymxpc2gnKS5hZGRDbGFzcygncHJvY2Vzc2luZycpXG5cbiAgICAgIEBleHBvcnREYXRhKEBwb3B1bGF0ZU91dHB1dCgpKVxuXG4gICAgZWxzZVxuXG4gICAgICBhbGVydCgnWW91IG11c3QgZW50ZXIgYSBjb3Vyc2UgdGl0bGUgYXMgdGhpcyB3aWxsIGJlY29tZSB0aGUgdGl0bGUgb2YgeW91ciBjb3Vyc2UgcGFnZS4nKVxuXG4gICAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCdzdGVwOmVkaXQnLCAnaW50cm8nKVxuXG4gICAgICBzZXRUaW1lb3V0KD0+XG5cbiAgICAgICAgJCgnI2NvdXJzZV9uYW1lJykuZm9jdXMoKVxuXG4gICAgICAsNTAwKVxuXG5cbiAgICBcblxuICAgIFxuXG4gICAgIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcE5hdlZpZXdcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCAnLi4vQXBwJyApXG5cblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cblN0ZXBOYXZUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9TdGVwTmF2VGVtcGxhdGUuaGJzJylcblxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBOYXZWaWV3IGV4dGVuZHMgVmlld1xuXG5cbiAgY2xhc3NOYW1lOiAnc3RlcC1uYXYnXG5cblxuICB0ZW1wbGF0ZTogU3RlcE5hdlRlbXBsYXRlXG5cblxuICBpbml0aWFsaXplOiAtPlxuICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG5cblxuICBzdWJzY3JpcHRpb25zOlxuICAgICdzdGVwOnVwZGF0ZScgOiAndXBkYXRlQ3VycmVudFN0ZXAnXG4gICAgJ3N0ZXA6YW5zd2VyZWQnIDogJ3N0ZXBBbnN3ZXJlZCdcblxuXG4gIGV2ZW50czogLT5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnByZXYnIDogJ3ByZXZDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLmRvdCcgIDogJ2RvdENsaWNrSGFuZGxlcidcblxuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuXG4gICAgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPCBAdG90YWxTdGVwcyAtIDFcblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnaGlkZGVuJylcblxuICAgICAgIyBAJGVsLnJlbW92ZUNsYXNzKCdjb250cmFjdGVkJylcblxuICAgIGVsc2UgaWYgQGN1cnJlbnRTdGVwID4gMCAmJiBAY3VycmVudFN0ZXAgPT0gQHRvdGFsU3RlcHMgLSAxXG5cbiAgICAgIEAkZWwucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICAgICMgQCRlbC5hZGRDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICBlbHNlXG5cbiAgICAgICMgQCRlbC5yZW1vdmVDbGFzcygnY29udHJhY3RlZCcpXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ2hpZGRlbicpXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG5cblxuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICAgcmV0dXJuIHtcblxuICAgICAgY3VycmVudDogQGN1cnJlbnRTdGVwXG5cbiAgICAgIHRvdGFsOiBAdG90YWxTdGVwc1xuXG4gICAgICBwcmV2SW5hY3RpdmU6IEBpc0luYWN0aXZlKCdwcmV2JylcblxuICAgICAgbmV4dEluYWN0aXZlOiBAaXNJbmFjdGl2ZSgnbmV4dCcpXG5cbiAgICAgIHN0ZXBzOiA9PlxuXG4gICAgICAgIG91dCA9IFtdXG5cbiAgICAgICAgXy5lYWNoKEBzdGVwVmlld3MsIChzdGVwLCBpbmRleCkgPT5cblxuICAgICAgICAgIHN0ZXBEYXRhID0gc3RlcC5tb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgICAgICBpc0FjdGl2ZSA9IEBjdXJyZW50U3RlcCBpcyBpbmRleFxuXG4gICAgICAgICAgd2FzVmlzaXRlZCA9IHN0ZXAuaGFzVXNlclZpc2l0ZWRcblxuICAgICAgICAgIG91dC5wdXNoIHtpZDogaW5kZXgsIGlzQWN0aXZlOiBpc0FjdGl2ZSwgaGFzVmlzaXRlZDogd2FzVmlzaXRlZCwgc3RlcFRpdGxlOiBzdGVwRGF0YS50aXRsZSwgc3RlcElkOiBzdGVwRGF0YS5pZH1cblxuICAgICAgICApXG5cbiAgICAgICAgcmV0dXJuIG91dFxuXG4gICAgfVxuXG5cblxuICBhZnRlclJlbmRlcjogLT5cbiAgICByZXR1cm4gQFxuXG5cblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAtPlxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6cHJldicpXG5cblxuXG4gIG5leHRDbGlja0hhbmRsZXI6IC0+XG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG5cbiAgZG90Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6Z290bycsICR0YXJnZXQuZGF0YSgnbmF2LWlkJykpXG5cblxuXG4gIHVwZGF0ZUN1cnJlbnRTdGVwOiAoc3RlcCkgLT5cbiAgICBAY3VycmVudFN0ZXAgPSBzdGVwXG5cbiAgICBAcmVuZGVyKClcblxuXG4gIHN0ZXBBbnN3ZXJlZDogKHN0ZXBWaWV3KSAtPlxuICAgIEByZW5kZXIoKVxuXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBIZWxwZXJzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGlzSW5hY3RpdmU6IChpdGVtKSAtPlxuXG4gICAgaXRJcyA9IHRydWVcblxuICAgIGlmIGl0ZW0gPT0gJ3ByZXYnXG5cbiAgICAgIGl0SXMgPSBAY3VycmVudFN0ZXAgaXMgMVxuXG4gICAgZWxzZSBpZiBpdGVtID09ICduZXh0J1xuICAgICAgY29uc29sZS5sb2cgYXBwbGljYXRpb24uaG9tZVZpZXcuc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uaGFzVXNlckFuc3dlcmVkXG4gICAgICBpZiBAY3VycmVudFN0ZXAgaXMgQHRvdGFsU3RlcHMgLSAxIHx8IGFwcGxpY2F0aW9uLmhvbWVWaWV3LnN0ZXBWaWV3c1tAY3VycmVudFN0ZXBdLmhhc1VzZXJBbnN3ZXJlZFxuICAgICAgICBpdElzID0gZmFsc2VcbiAgICAgIGVsc2VcbiAgICAgICAgaXRJcyA9IHRydWVcblxuICAgIHJldHVybiBpdElzXG4iLCJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIFN0ZXBWaWV3XG4jIEF1dGhvcjoga2V2aW5Ad2ludHIudXMgQCBXSU5UUlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG5cbiNBUFBcbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG4jVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcblxuI1NVQlZJRVdTXG5JbnB1dEl0ZW1WaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvSW5wdXRJdGVtVmlldycpXG5EYXRlSW5wdXRWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvRGF0ZUlucHV0VmlldycpXG5cbiNURU1QTEFURVNcblN0ZXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9TdGVwVGVtcGxhdGUuaGJzJylcblxuSW50cm9TdGVwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvSW50cm9TdGVwVGVtcGxhdGUuaGJzJylcblxuSW5wdXRUaXBUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9zdGVwcy9pbmZvL0lucHV0VGlwVGVtcGxhdGUuaGJzJylcblxuQ291cnNlVGlwVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvaW5mby9Db3Vyc2VUaXBUZW1wbGF0ZS5oYnMnKVxuXG5XaWtpRGF0ZXNNb2R1bGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvc3RlcHMvbW9kdWxlcy9XaWtpRGF0ZXNNb2R1bGUuaGJzJylcblxuI0RBVEFcbkNvdXJzZUluZm9EYXRhID0gcmVxdWlyZSgnLi4vZGF0YS9XaXphcmRDb3Vyc2VJbmZvJylcblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuI0lOUFVUU1xuV2l6YXJkU3RlcElucHV0cyA9IHJlcXVpcmUoJy4uL2RhdGEvV2l6YXJkU3RlcElucHV0cycpXG5cblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwVmlldyBleHRlbmRzIFZpZXdcblxuXG4gIGNsYXNzTmFtZTogJ3N0ZXAnXG5cblxuICB0YWdOYW1lOiAnc2VjdGlvbidcblxuXG4gIHRlbXBsYXRlOiBTdGVwVGVtcGxhdGVcblxuXG4gIGludHJvVGVtcGxhdGU6IEludHJvU3RlcFRlbXBsYXRlXG5cblxuICB0aXBUZW1wbGF0ZTogSW5wdXRUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb1RlbXBsYXRlOiBDb3Vyc2VUaXBUZW1wbGF0ZVxuXG5cbiAgY291cnNlSW5mb0RhdGE6IENvdXJzZUluZm9EYXRhXG5cblxuICBkYXRlc01vZHVsZTogV2lraURhdGVzTW9kdWxlXG5cblxuICBzdGVwSW5wdXREYXRhOiBXaXphcmRTdGVwSW5wdXRzXG5cblxuICBoYXNVc2VyQW5zd2VyZWQ6IGZhbHNlXG5cblxuICBoYXNVc2VyVmlzaXRlZDogZmFsc2VcblxuXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAjIEVWRU5UUyBBTkQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayBpbnB1dCcgOiAnaW5wdXRIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrICNwdWJsaXNoJyA6ICdwdWJsaXNoSGFuZGxlcidcblxuICAgICdjbGljayAuc3RlcC1pbmZvLXRpcF9fY2xvc2UnIDogJ2hpZGVUaXBzJ1xuXG4gICAgJ2NsaWNrICNiZWdpbkJ1dHRvbicgOiAnYmVnaW5IYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5zdGVwLWluZm8gLnN0ZXAtaW5mby1zZWN0aW9uLS1hY2NvcmRpYW4nIDogJ2FjY29yZGlhbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuZWRpdC1idXR0b24nIDogJ2VkaXRDbGlja0hhbmRsZXInXG5cbiAgICAnY2xpY2sgLnN0ZXAtaW5mby10aXAnIDogJ2hpZGVUaXBzJ1xuXG5cblxuICBlZGl0Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBzdGVwSWQgPSAkKGUuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS1zdGVwLWlkJylcblxuICAgIGlmIHN0ZXBJZFxuICAgICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDplZGl0Jywgc3RlcElkKVxuXG5cblxuICBhY2NvcmRpYW5DbGlja0hhbmRsZXI6IChlKSAtPlxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgIGlmICR0YXJnZXQuaGFzQ2xhc3MoJ29wZW4nKVxuXG4gICAgICAkdGFyZ2V0LnJlbW92ZUNsYXNzKCdvcGVuJylcblxuICAgIGVsc2UgaWYgJCgnLnN0ZXAtaW5mby1zZWN0aW9uLS1hY2NvcmRpYW4nKS5oYXNDbGFzcygnb3BlbicpXG5cbiAgICAgIEAkZWwuZmluZCgnLnN0ZXAtaW5mbycpLmZpbmQoJy5zdGVwLWluZm8tc2VjdGlvbi0tYWNjb3JkaWFuJykucmVtb3ZlQ2xhc3MoJ29wZW4nKVxuXG4gICAgICBzZXRUaW1lb3V0KD0+XG5cbiAgICAgICAgJHRhcmdldC5hZGRDbGFzcygnb3BlbicpXG5cbiAgICAgICw1MDApXG5cbiAgICBlbHNlXG5cbiAgICAgICR0YXJnZXQuYWRkQ2xhc3MoJ29wZW4nKVxuXG5cblxuICBwdWJsaXNoSGFuZGxlcjogLT5cbiAgICBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd3aXphcmQ6cHVibGlzaCcpXG5cblxuICBcbiAgcmVuZGVyOiAtPlxuXG4gICAgQHRpcFZpc2libGUgPSBmYWxzZVxuXG4gICAgaWYgQG1vZGVsLmdldCgnc3RlcE51bWJlcicpID09IDFcblxuICAgICAgQCRlbC5hZGRDbGFzcygnc3RlcC0tZmlyc3QnKS5odG1sKCBAaW50cm9UZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICAgICNBREQgU1RBUlQvRU5EIERBVEVTIE1PRFVMRVxuICAgICAgJGRhdGVzID0gJChAZGF0ZXNNb2R1bGUoKSlcblxuICAgICAgJGRhdGVJbnB1dHMgPSAkZGF0ZXMuZmluZCgnLmN1c3RvbS1zZWxlY3QnKVxuXG4gICAgICAkZGF0ZUlucHV0cy5lYWNoKC0+XG4gICAgICAgIGRhdGVWaWV3ID0gbmV3IERhdGVJbnB1dFZpZXcoXG4gICAgICAgICAgZWw6ICQodGhpcykgXG4gICAgICAgIClcbiAgICBcbiAgICAgIClcblxuICAgICAgQCRlbC5maW5kKCcuc3RlcC1mb3JtLWRhdGVzJykuaHRtbCgkZGF0ZXMpXG4gICAgICBcbiAgICBlbHNlXG4gICAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cblxuICAgIEBpbnB1dFNlY3Rpb24gPSBAJGVsLmZpbmQoJy5zdGVwLWZvcm0taW5uZXInKVxuXG4gICAgQCR0aXBTZWN0aW9uID0gQCRlbC5maW5kKCcuc3RlcC1pbmZvLXRpcHMnKVxuXG4gICAgQGlucHV0RGF0YSA9IEBzdGVwSW5wdXREYXRhW0Btb2RlbC5hdHRyaWJ1dGVzLmlkXSB8fCBbXVxuXG5cbiAgICBfLmVhY2goQGlucHV0RGF0YSwgKGlucHV0LCBpbmRleCkgPT5cblxuICAgICAgdW5sZXNzIGlucHV0LnR5cGUgXG4gICAgICAgIHJldHVyblxuXG4gICAgICBpZiBpbnB1dC5zZWxlY3RlZFxuICAgICAgICBAaGFzVXNlckFuc3dlcmVkID0gdHJ1ZVxuXG4gICAgICBpbnB1dFZpZXcgPSBuZXcgSW5wdXRJdGVtVmlldyhcblxuICAgICAgICBtb2RlbDogbmV3IEJhY2tib25lLk1vZGVsKGlucHV0KVxuXG4gICAgICApXG5cbiAgICAgIGlucHV0Vmlldy5pbnB1dFR5cGUgPSBpbnB1dC50eXBlXG5cbiAgICAgIGlucHV0Vmlldy5pdGVtSW5kZXggPSBpbmRleFxuXG4gICAgICBpbnB1dFZpZXcucGFyZW50U3RlcCA9IEBcblxuICAgICAgQGlucHV0U2VjdGlvbi5hcHBlbmQoaW5wdXRWaWV3LnJlbmRlcigpLmVsKVxuXG4gICAgICBpZiBpbnB1dC50aXBJbmZvXG5cbiAgICAgICAgdGlwID0gXG5cbiAgICAgICAgICBpZDogaW5kZXhcblxuICAgICAgICAgIHRpdGxlOiBpbnB1dC50aXBJbmZvLnRpdGxlXG5cbiAgICAgICAgICBjb250ZW50OiBpbnB1dC50aXBJbmZvLmNvbnRlbnRcblxuICAgICAgICAkdGlwRWwgPSBAdGlwVGVtcGxhdGUodGlwKVxuXG4gICAgICAgIEAkdGlwU2VjdGlvbi5hcHBlbmQoJHRpcEVsKVxuXG4gICAgICAgIGlucHV0Vmlldy4kZWwuYWRkQ2xhc3MoJ2hhcy1pbmZvJylcblxuICAgICAgZWxzZSBpZiBpbnB1dC5oYXNDb3Vyc2VJbmZvXG5cbiAgICAgICAgaW5mb0RhdGEgPSBfLmV4dGVuZChAY291cnNlSW5mb0RhdGFbaW5wdXQuaWRdLCB7aWQ6IGluZGV4fSApXG5cbiAgICAgICAgJHRpcEVsID0gQGNvdXJzZUluZm9UZW1wbGF0ZShpbmZvRGF0YSlcblxuICAgICAgICBAJHRpcFNlY3Rpb24uYXBwZW5kKCR0aXBFbClcblxuICAgICAgICBpbnB1dFZpZXcuJGVsLmFkZENsYXNzKCdoYXMtaW5mbycpXG5cbiAgICApXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG4gICAgQCRpbnB1dENvbnRhaW5lcnMgPSBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgaGlkZTogLT5cbiAgICBAJGVsLmhpZGUoKVxuXG4gICAgcmV0dXJuIEBcblxuXG5cbiAgc2hvdzogLT5cbiAgICBAJGVsLnNob3coKVxuICAgIEBoYXNVc2VyVmlzaXRlZCA9IHRydWVcbiAgICByZXR1cm4gQFxuXG5cbiAgYmVnaW5IYW5kbGVyOiAtPlxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDpuZXh0JylcblxuXG4gIHVwZGF0ZVVzZXJBbnN3ZXI6IChpZCx2YWx1ZSkgLT5cbiAgICBjb25zb2xlLmxvZyB2YWx1ZVxuICAgIGlmIHZhbHVlIGlzICdvbidcblxuICAgICAgQGhhc1VzZXJBbnN3ZXJlZCA9IHRydWVcblxuXG4gICAgQmFja2JvbmUuTWVkaWF0b3IucHVibGlzaCgnc3RlcDphbnN3ZXJlZCcsIEApXG5cbiAgICByZXR1cm4gQFxuXG5cbiAgdXBkYXRlQW5zd2VyOiAoaWQsIHZhbHVlKSAtPlxuICAgIFxuICAgIGlucHV0VHlwZSA9IFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udHlwZSBcblxuICAgIG91dCA9IFxuICAgICAgdHlwZTogaW5wdXRUeXBlXG5cbiAgICAgIGlkOiBpZFxuXG4gICAgICB2YWx1ZTogdmFsdWVcblxuXG4gICAgaWYgaW5wdXRUeXBlID09ICdyYWRpb0JveCcgfHwgaW5wdXRUeXBlID09ICdjaGVja2JveCdcblxuICAgICAgaWYgdmFsdWUgPT0gJ29uJ1xuXG4gICAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0uc2VsZWN0ZWQgPSB0cnVlXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBXaXphcmRTdGVwSW5wdXRzW0Btb2RlbC5pZF1baWRdLnNlbGVjdGVkID0gZmFsc2VcblxuXG4gICAgZWxzZSBpZiBpbnB1dFR5cGUgPT0gJ3RleHQnXG5cbiAgICAgIFdpemFyZFN0ZXBJbnB1dHNbQG1vZGVsLmlkXVtpZF0udmFsdWUgPSB2YWx1ZVxuXG5cbiAgICByZXR1cm4gQFxuICAgIFxuXG5cbiAgaW5wdXRIYW5kbGVyOiAoZSkgLT5cbiAgICAkdGFyZ2V0ID0gJChlLmN1cnJlbnRUYXJnZXQpXG5cbiAgICAkcGFyZW50ID0gJHRhcmdldC5wYXJlbnRzKCcuY3VzdG9tLWlucHV0JylcbiAgICBcbiAgICBpZiAkcGFyZW50LmRhdGEoJ2V4Y2x1c2l2ZScpXG5cbiAgICAgIGlmICR0YXJnZXQuaXMoJzpjaGVja2VkJykgXG5cbiAgICAgICAgQCRpbnB1dENvbnRhaW5lcnMubm90KCRwYXJlbnQpLmFkZENsYXNzKCdkaXNhYmxlZCcpXG5cbiAgICAgIGVsc2VcblxuICAgICAgICBAJGlucHV0Q29udGFpbmVycy5maW5kKCdpbnB1dCcpLm5vdCgkdGFyZ2V0KS5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgICAgQCRpbnB1dENvbnRhaW5lcnMubm90KCRwYXJlbnQpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpXG5cbiAgICBlbHNlXG5cbiAgICAgICRleGNsdXNpdmUgPSBAJGVsLmZpbmQoJ1tkYXRhLWV4Y2x1c2l2ZT1cInRydWVcIl0nKVxuXG4gICAgICBpZiAkZXhjbHVzaXZlLmxlbmd0aCA+IDBcblxuICAgICAgICBpZiAkdGFyZ2V0LmlzKCc6Y2hlY2tlZCcpXG5cbiAgICAgICAgICAkZXhjbHVzaXZlLmFkZENsYXNzKCdkaXNhYmxlZCcpXG5cbiAgICAgICAgZWxzZVxuXG4gICAgICAgICAgJGV4Y2x1c2l2ZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKVxuXG5cblxuICBoaWRlVGlwczogKGUpIC0+XG4gICAgJCgnLnN0ZXAtaW5mby10aXAnKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAkKCcuY3VzdG9tLWlucHV0LXdyYXBwZXInKS5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG5cblxuXG4gICAgXG4gICAgXG5cbiBcblxuIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgSW5wdXRJdGVtVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbiMgU1VQRVIgVklFVyBDTEFTU1xuVmlldyA9IHJlcXVpcmUoJy4vVmlldycpXG5cblxuI1RFTVBMQVRFU1xuSW5wdXRJdGVtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi8uLi90ZW1wbGF0ZXMvc3RlcHMvaW5wdXRzL0lucHV0SXRlbVRlbXBsYXRlLmhicycpXG5cblxuI09VVFBVVFxuQXNzaWdubWVudERhdGEgPSByZXF1aXJlKCcuLi8uLi9kYXRhL1dpemFyZEFzc2lnbm1lbnREYXRhJylcblxuXG5XaXphcmRTdGVwSW5wdXRzID0gcmVxdWlyZSgnLi4vLi4vZGF0YS9XaXphcmRTdGVwSW5wdXRzJylcblxuXG5cblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBJbnB1dEl0ZW1WaWV3IGV4dGVuZHMgVmlldyBcblxuXG4gIHRlbXBsYXRlOiBJbnB1dEl0ZW1UZW1wbGF0ZVxuXG5cbiAgY2xhc3NOYW1lOiAnY3VzdG9tLWlucHV0LXdyYXBwZXInXG5cblxuICBob3ZlclRpbWU6IDUwMFxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRXZlbnRzXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGV2ZW50czogXG4gICAgJ2NoYW5nZSBpbnB1dCcgOiAnaXRlbUNoYW5nZUhhbmRsZXInXG5cbiAgICAna2V5dXAgaW5wdXRbdHlwZT1cInRleHRcIl0nIDogJ2l0ZW1DaGFuZ2VIYW5kbGVyJ1xuXG4gICAgJ2NsaWNrIC5jdXN0b20taW5wdXQtLWNoZWNrYm94IGxhYmVsIHNwYW4nIDogJ2NoZWNrQnV0dG9uQ2xpY2tIYW5kbGVyJ1xuXG4gICAgJ21vdXNlb3ZlcicgOiAnbW91c2VvdmVySGFuZGxlcidcblxuICAgICdtb3VzZWVudGVyIGxhYmVsJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VlbnRlciAuY2hlY2stYnV0dG9uJyA6ICdoaWRlU2hvd1Rvb2x0aXAnXG5cbiAgICAnbW91c2VvdXQnIDogJ21vdXNlb3V0SGFuZGxlcidcblxuICAgICdjbGljayAuY2hlY2stYnV0dG9uJyA6ICdjaGVja0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpb2JveCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0JveENsaWNrSGFuZGxlcidcblxuICAgICdjbGljayAuY3VzdG9tLWlucHV0LS1yYWRpby1ncm91cCAucmFkaW8tYnV0dG9uJyA6ICdyYWRpb0J1dHRvbkNsaWNrSGFuZGxlcidcblxuICAgICdmb2N1cyAuY3VzdG9tLWlucHV0LS10ZXh0IGlucHV0JyA6ICdvbkZvY3VzJ1xuXG4gICAgJ2JsdXIgLmN1c3RvbS1pbnB1dC0tdGV4dCBpbnB1dCcgOiAnb25CbHVyJ1xuXG5cblxuICByYWRpb0J1dHRvbkNsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG5cbiAgICBpZiBAaXNEaXNhYmxlZCgpXG4gICAgICByZXR1cm4gZmFsc2VcblxuICAgICR0YXJnZXQgPSAkKGUuY3VycmVudFRhcmdldClcblxuICAgICRwYXJlbnRHcm91cCA9ICR0YXJnZXQucGFyZW50cygnLmN1c3RvbS1pbnB1dC13cmFwcGVyJylcblxuICAgICRwYXJlbnRFbCA9ICR0YXJnZXQucGFyZW50cygnLmN1c3RvbS1pbnB1dC0tcmFkaW8nKVxuXG4gICAgJGlucHV0RWwgPSAkcGFyZW50RWwuZmluZCgnaW5wdXRbdHlwZT1cInJhZGlvXCJdJylcblxuICAgIGlmICRwYXJlbnRFbC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgZWxzZVxuICAgICAgJG90aGVyUmFkaW9zID0gJHBhcmVudEdyb3VwLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvJylcblxuICAgICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJylcblxuICAgICAgJG90aGVySW5wdXRzID0gJG90aGVyUmFkaW9zLmZpbmQoJ2lucHV0W3R5cGU9XCJ0ZXh0XCJdJylcblxuICAgICAgJG90aGVySW5wdXRzLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgJGlucHV0RWwucHJvcCgnY2hlY2tlZCcsIHRydWUpXG5cbiAgICAgICRwYXJlbnRFbC5hZGRDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAjIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG4gIHJhZGlvQm94Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcblxuICAgIGlmIEBpc0Rpc2FibGVkKClcbiAgICAgIHJldHVybiBmYWxzZVxuXG4gICAgJG90aGVyUmFkaW9zID0gQCRlbC5wYXJlbnRzKCcuc3RlcC1mb3JtLWlubmVyJykuZmluZCgnLmN1c3RvbS1pbnB1dC0tcmFkaW9ib3gnKVxuXG4gICAgJG90aGVyUmFkaW9zLnJlbW92ZUNsYXNzKCdjaGVja2VkJykuZmluZCgnaW5wdXQnKS52YWwoJ29mZicpLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAkcGFyZW50ID0gQCRlbC5maW5kKCcuY3VzdG9tLWlucHV0LS1yYWRpb2JveCcpXG4gICAgICAuYWRkQ2xhc3MoJ2NoZWNrZWQnKVxuXG4gICAgaWYgJHBhcmVudC5oYXNDbGFzcygnY2hlY2tlZCcpXG5cbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgdHJ1ZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb24nKVxuXG4gICAgICBAJGlucHV0RWwudHJpZ2dlcignY2hhbmdlJylcblxuICAgIGVsc2VcbiAgICAgIEAkaW5wdXRFbC5wcm9wKCdjaGVja2VkJywgZmFsc2UpXG5cbiAgICAgIEAkaW5wdXRFbC52YWwoJ29mZicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgIyBCYWNrYm9uZS5NZWRpYXRvci5wdWJsaXNoKCd0aXBzOmhpZGUnKVxuXG4gICAgXG5cbiAgY2hlY2tCdXR0b25DbGlja0hhbmRsZXI6IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgaWYgQGlzRGlzYWJsZWQoKVxuICAgICAgcmV0dXJuIGZhbHNlXG5cbiAgICBpZiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQtLXJhZGlvYm94JykubGVuZ3RoID4gMFxuICAgICAgcmV0dXJuIEByYWRpb0JveENsaWNrSGFuZGxlcihlKVxuXG4gICAgJHBhcmVudCA9IEAkZWwuZmluZCgnLmN1c3RvbS1pbnB1dC0tY2hlY2tib3gnKVxuICAgICAgLnRvZ2dsZUNsYXNzKCdjaGVja2VkJylcbiAgICBcbiAgICBpZiAkcGFyZW50Lmhhc0NsYXNzKCdjaGVja2VkJylcblxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCB0cnVlKVxuXG4gICAgICBAJGlucHV0RWwudmFsKCdvbicpXG5cbiAgICAgIEAkaW5wdXRFbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXG4gICAgZWxzZVxuICAgICAgQCRpbnB1dEVsLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSlcblxuICAgICAgQCRpbnB1dEVsLnZhbCgnb2ZmJylcblxuICAgICAgQCRpbnB1dEVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cbiAgICAjIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3RpcHM6aGlkZScpXG5cblxuXG4gIGhvdmVySGFuZGxlcjogKGUpIC0+XG4gICAgY29uc29sZS5sb2cgZS50YXJnZXRcblxuXG4gIG1vdXNlb3ZlckhhbmRsZXI6IChlKSAtPlxuICAgIEBpc0hvdmVyaW5nID0gdHJ1ZVxuICAgICAgXG5cbiAgbW91c2VvdXRIYW5kbGVyOiAoZSkgLT5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuICBzaG93VG9vbHRpcDogLT5cbiAgICBpZiBAaGFzSW5mbyAmJiBAcGFyZW50U3RlcC50aXBWaXNpYmxlID09IGZhbHNlXG5cbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgQHBhcmVudFN0ZXAudGlwVmlzaWJsZSA9IHRydWVcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpXG5cbiAgICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBbZGF0YS1pdGVtLWluZGV4PScje0BpdGVtSW5kZXh9J11cIikuYWRkQ2xhc3MoJ3Zpc2libGUnKVxuXG5cbiAgaGlkZVRvb2x0aXA6IC0+XG4gICAgaWYgQGhhc0luZm9cblxuICAgICAgQCRlbC5yZW1vdmVDbGFzcygnc2VsZWN0ZWQnKVxuXG4gICAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgICAgQHBhcmVudFN0ZXAuJGVsLmZpbmQoXCIuc3RlcC1pbmZvLXRpcFwiKS5yZW1vdmVDbGFzcygndmlzaWJsZScpIFxuXG5cbiAgaGlkZVNob3dUb29sdGlwOiAtPlxuICAgICQoJy5jdXN0b20taW5wdXQtd3JhcHBlcicpLnJlbW92ZUNsYXNzKCdzZWxlY3RlZCcpXG5cbiAgICBAcGFyZW50U3RlcC50aXBWaXNpYmxlID0gZmFsc2VcblxuICAgIEBwYXJlbnRTdGVwLiRlbC5maW5kKFwiLnN0ZXAtaW5mby10aXBcIikucmVtb3ZlQ2xhc3MoJ3Zpc2libGUnKVxuXG4gICAgQHNob3dUb29sdGlwKClcblxuXG4gIGxhYmVsQ2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICByZXR1cm4gZmFsc2VcblxuXG4gIGl0ZW1DaGFuZ2VIYW5kbGVyOiAoZSkgLT5cbiAgICB2YWx1ZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS52YWwoKVxuXG4gICAgaW5wdXRJZCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5hdHRyKCdpZCcpXG5cbiAgICAjIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ2Fuc3dlcjp1cGRhdGVkJywgaW5wdXRJZCwgdmFsdWUpXG4gICAgQHBhcmVudFN0ZXAudXBkYXRlQW5zd2VyKGlucHV0SWQsIHZhbHVlKVxuICAgIFxuICAgIEBwYXJlbnRTdGVwLnVwZGF0ZVVzZXJBbnN3ZXIoaW5wdXRJZCwgdmFsdWUpXG5cblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBQcml2YXRlIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgICBAJGVsLmFkZENsYXNzKEBpbnB1dFR5cGUpXG5cbiAgICBAJGlucHV0RWwgPSBAJGVsLmZpbmQoJ2lucHV0JylcblxuICAgIGlmIEBtb2RlbC5hdHRyaWJ1dGVzLnZhbHVlICE9ICcnICYmIEBtb2RlbC5hdHRyaWJ1dGVzLnR5cGUgPT0gJ3RleHQnXG4gICAgICBcbiAgICAgIEAkZWwuYWRkQ2xhc3MoJ29wZW4nKVxuXG4gICAgQGhvdmVyVGltZXIgPSBudWxsXG5cbiAgICBAaXNIb3ZlcmluZyA9IGZhbHNlXG5cblxuXG4gIGhhc0luZm86IC0+XG5cbiAgICByZXR1cm4gJGVsLmhhc0NsYXNzKCdoYXMtaW5mbycpXG5cblxuXG4gIG9uRm9jdXM6IChlKSAtPlxuXG4gICAgQCRlbC5hZGRDbGFzcygnb3BlbicpXG5cblxuXG4gIG9uQmx1cjogKGUpIC0+XG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuXG4gICAgdmFsdWUgPSAkdGFyZ2V0LnZhbCgpXG5cbiAgICBpZiB2YWx1ZSA9PSAnJ1xuXG4gICAgICB1bmxlc3MgJHRhcmdldC5pcygnOmZvY3VzJylcblxuICAgICAgICBAJGVsLnJlbW92ZUNsYXNzKCdvcGVuJylcblxuICBpc0Rpc2FibGVkOiAtPlxuICAgIHJldHVybiBAJGVsLmZpbmQoJy5jdXN0b20taW5wdXQnKS5oYXNDbGFzcygnbm90LWVkaXRhYmxlJylcblxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgUHVibGljIE1ldGhvZHNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgcmVuZGVyOiAtPlxuICAgIHN1cGVyKClcblxuXG5cbiAgZ2V0SW5wdXRUeXBlT2JqZWN0OiAtPlxuICAgIHJldHVybkRhdGEgPSB7fVxuXG4gICAgcmV0dXJuRGF0YVtAaW5wdXRUeXBlXSA9IHRydWVcblxuICAgIHJldHVybiByZXR1cm5EYXRhXG5cblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgaW5wdXRUeXBlT2JqZWN0ID0gQGdldElucHV0VHlwZU9iamVjdCgpXG5cblxuICAgIGlmIEBpbnB1dFR5cGUgPT0gJ2NoZWNrYm94J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW8nXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICd0ZXh0J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncGVyY2VudCdcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cbiAgICBlbHNlIGlmIEBpbnB1dFR5cGUgPT0gJ3JhZGlvR3JvdXAnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuXG4gICAgZWxzZSBpZiBAaW5wdXRUeXBlID09ICdlZGl0J1xuXG4gICAgICByZXR1cm4ge1xuXG4gICAgICAgIHR5cGU6IGlucHV0VHlwZU9iamVjdFxuXG4gICAgICAgIGRhdGE6IEBtb2RlbC5hdHRyaWJ1dGVzXG5cbiAgICAgIH1cblxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAncmFkaW9Cb3gnXG5cbiAgICAgIHJldHVybiB7XG5cbiAgICAgICAgdHlwZTogaW5wdXRUeXBlT2JqZWN0XG5cbiAgICAgICAgZGF0YTogQG1vZGVsLmF0dHJpYnV0ZXNcblxuICAgICAgfVxuICAgIGVsc2UgaWYgQGlucHV0VHlwZSA9PSAnbGluaydcblxuICAgICAgcmV0dXJuIHtcblxuICAgICAgICB0eXBlOiBpbnB1dFR5cGVPYmplY3RcblxuICAgICAgICBkYXRhOiBAbW9kZWwuYXR0cmlidXRlc1xuXG4gICAgICB9XG5cblxuICBcbiAgICAgIFxuICAgIFxuICAgICAgXG5cbiAgICBcbiIsIiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuIyBUaXRsZTogIEJhc2UgVmlldyBDbGFzc1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbnJlcXVpcmUoJy4uLy4uL2hlbHBlcnMvVmlld0hlbHBlcicpXG5cbmNsYXNzIFZpZXcgZXh0ZW5kcyBCYWNrYm9uZS5WaWV3XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHRlbXBsYXRlOiAtPlxuICAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGdldFJlbmRlckRhdGE6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgSU5IRVJJVEVEIC8gT1ZFUlJJREVTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcbiAgXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQHJlbmRlciA9IF8uYmluZCggQHJlbmRlciwgQCApXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpICkgKVxuICAgIFxuICAgIEBhZnRlclJlbmRlcigpXG4gICAgXG4gICAgcmV0dXJuIEBcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBhZnRlclJlbmRlcjogLT5cblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBFVkVOVCBIQU5ETEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFJJVkFURSBBTkQgUFJPVEVDVEVEIE1FVEhPRFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZpZXciXX0=
