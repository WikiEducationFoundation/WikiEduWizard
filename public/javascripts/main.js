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
    var AppData, HomeView, Router;
    AppData = require('./data/WizardData');
    this.data = AppData;
    HomeView = require('./views/HomeView');
    Router = require('./routers/Router');
    this.homeView = new HomeView();
    this.router = new Router();
    return typeof Object.freeze === "function" ? Object.freeze(this) : void 0;
  }
};

module.exports = Application;



},{"./data/WizardData":7,"./routers/Router":12,"./views/HomeView":15}],6:[function(require,module,exports){
var StepController, StepModel, StepView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

StepView = require('../views/StepView');

StepModel = require('../models/StepModel');

module.exports = StepController = (function(_super) {
  __extends(StepController, _super);

  function StepController() {
    return StepController.__super__.constructor.apply(this, arguments);
  }

  StepController.prototype.subscriptions = {
    'step:updated': 'stepUpdated'
  };

  StepController.prototype.stepUpdated = function(stepView) {
    return console.log(stepView.model.changed);
  };

  return StepController;

})(View);



},{"../App":5,"../models/StepModel":10,"../views/StepView":16,"../views/supers/View":17}],7:[function(require,module,exports){
var WizardData;

WizardData = [
  {
    title: 'Welcome',
    done: true,
    include: true
  }, {
    title: 'Choose Assignment Type',
    done: false,
    include: true
  }, {
    title: 'Learning Wiki Essentials',
    done: false,
    include: true
  }, {
    title: 'Getting Started with Editing',
    done: true,
    include: true
  }, {
    title: 'Choosing Articles',
    done: false,
    include: true
  }, {
    title: 'Research &amp; Planning',
    done: false,
    include: true
  }, {
    title: 'Drafts &amp; Mainspace',
    done: false,
    include: true
  }, {
    title: 'Peer Feedback',
    done: false,
    include: true
  }, {
    title: 'Supplementary Assignments',
    done: false,
    include: true
  }, {
    title: 'DYK / GA Submission',
    done: false,
    include: true
  }
];

module.exports = WizardData;



},{}],8:[function(require,module,exports){

/*
 * Handlebars Template Helpers
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since
 */

/*//--------------------------------------
//+ PUBLIC PROPERTIES / CONSTANTS
//--------------------------------------
 */

/*//--------------------------------------
//+ PUBLIC METHODS / GETTERS / SETTERS
//--------------------------------------
 */
Handlebars.registerHelper('link', function(text, url) {
  var result;
  text = Handlebars.Utils.escapeExpression(text);
  url = Handlebars.Utils.escapeExpression(url);
  result = '<a href="' + url + '">' + text + '</a>';
  return new Handlebars.SafeString(result);
});



},{}],9:[function(require,module,exports){

/*
 * Application Initializer
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since
 */
var application;

application = require('./App');

$(function() {
  application.initialize();
  return Backbone.history.start();
});



},{"./App":5}],10:[function(require,module,exports){

/*
 * Question and Answer Model (QA)
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since
 */
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



},{"../models/supers/Model":11}],11:[function(require,module,exports){

/*
 * Base Class for all Backbone Models
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since
 */
var Model,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Model = (function(_super) {

  /*//--------------------------------------
  //+ PUBLIC PROPERTIES / CONSTANTS
  //--------------------------------------
   */

  /*//--------------------------------------
  //+ INHERITED / OVERRIDES
  //--------------------------------------
   */

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
  __extends(Model, _super);

  function Model() {
    return Model.__super__.constructor.apply(this, arguments);
  }

  return Model;

})(Backbone.Model);



},{}],12:[function(require,module,exports){

/*
 * Backbone Primary Router
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since
 */
var Router, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

module.exports = Router = (function(_super) {
  __extends(Router, _super);

  function Router() {
    return Router.__super__.constructor.apply(this, arguments);
  }


  /*//--------------------------------------
    //+ Routes
    //--------------------------------------
   */

  Router.prototype.routes = {
    '': 'home'
  };


  /*//--------------------------------------
  //+ Route Handlers
  //--------------------------------------
   */

  Router.prototype.home = function() {
    return $('#app').html(application.homeView.render().el);
  };

  return Router;

})(Backbone.Router);



},{"../App":5}],13:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<!--\n  Author: \n  Date: \n\n  Description: Template Description\n-->\n<div class=\"content\">\n  <div class=\"content-header\">\n    <h1 class=\"content-header__title\">";
  if (stack1 = helpers.content) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.content; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</h1>\n  </div>\n  <div class=\"steps\">\n    \n  </div>\n  <div class=\"step-actions\">\n    <a href=\"#\" class=\"prev\">Prev</a>\n    <a href=\"#\" class=\"next\">Next</a>\n  </div>\n</div>";
  return buffer;
  })
},{"handleify":4}],14:[function(require,module,exports){
module.exports=require("handleify").template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  
  return " checked ";
  }

  buffer += "\n\n<h3>";
  if (stack1 = helpers.stepNumber) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.stepNumber; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + ". ";
  if (stack1 = helpers.title) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "</h3>\n<input type=\"checkbox\" name=\"done\" class=\"done\" data-model=\"done\" ";
  stack1 = helpers['if'].call(depth0, depth0.done, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n<label for=\"done\">Done?</label>\n<input type=\"checkbox\" name=\"include\" class=\"done\" data-model=\"include\" ";
  stack1 = helpers['if'].call(depth0, depth0.include, {hash:{},inverse:self.noop,fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += " />\n<label for=\"include\">Include?</label>";
  return buffer;
  })
},{"handleify":4}],15:[function(require,module,exports){
var HomeTemplate, HomeView, StepController, StepModel, StepView, View, application,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

HomeTemplate = require('../templates/HomeTemplate.hbs');

StepController = require('../controllers/StepController');

StepView = require('../views/StepView');

StepModel = require('../models/StepModel');

module.exports = HomeView = (function(_super) {
  __extends(HomeView, _super);

  function HomeView() {
    return HomeView.__super__.constructor.apply(this, arguments);
  }

  HomeView.prototype.className = 'home-view';

  HomeView.prototype.template = HomeTemplate;

  HomeView.prototype.initialize = function() {
    this.currentStep = 0;
    return this.render = _.bind(this.render, this);
  };

  HomeView.prototype.events = function() {
    return {
      'click .next': 'nextClickHandler',
      'click .prev': 'prevClickHandler'
    };
  };

  HomeView.prototype.render = function() {
    this.$el.html(this.template(this.getRenderData()));
    this.afterRender();
    return this;
  };

  HomeView.prototype.afterRender = function() {
    this.$stepsContainer = this.$el.find('.steps');
    this.stepViews = [];
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
        _this.$stepsContainer.append(newview.render().hide().el);
        return _this.stepViews.push(newview);
      };
    })(this));
    if (this.stepViews.length > 0) {
      this.showCurrentStep();
    }
    return this.StepController = new StepController({
      el: this.$stepsContainer,
      childViews: this.stepViews
    });
  };

  HomeView.prototype.getRenderData = function() {
    return {
      content: "WikiEdu Assignment Design Wizard"
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

  HomeView.prototype.showCurrentStep = function() {
    return this.stepViews[this.currentStep].show();
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

  HomeView.prototype.nextClickHandler = function(e) {
    e.preventDefault();
    return this.advanceStep();
  };

  HomeView.prototype.prevClickHandler = function(e) {
    e.preventDefault();
    return this.decrementStep();
  };

  HomeView.prototype.appLoadedHandler = function(e) {
    return console.log('app loaded');
  };

  return HomeView;

})(View);



},{"../App":5,"../controllers/StepController":6,"../models/StepModel":10,"../templates/HomeTemplate.hbs":13,"../views/StepView":16,"../views/supers/View":17}],16:[function(require,module,exports){
var StepView, View, application, template,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

application = require('../App');

View = require('../views/supers/View');

template = require('../templates/StepTemplate.hbs');

module.exports = StepView = (function(_super) {
  __extends(StepView, _super);

  function StepView() {
    return StepView.__super__.constructor.apply(this, arguments);
  }

  StepView.prototype.className = 'step';

  StepView.prototype.template = template;

  StepView.prototype.events = {
    'click input': 'inputHandler'
  };

  StepView.prototype.render = function() {
    this.$el.html(this.template(this.model.attributes));
    this.afterRender();
    return this;
  };

  StepView.prototype.afterRender = function() {
    this.$doneButton = this.$el.find('input.done').first();
    return this.model.on('change', (function(_this) {
      return function() {
        return Backbone.Mediator.publish('step:updated', _this);
      };
    })(this));
  };

  StepView.prototype.hide = function() {
    this.$el.hide();
    return this;
  };

  StepView.prototype.show = function() {
    this.$el.show();
    return this;
  };

  StepView.prototype.inputHandler = function(e) {
    var $target, attribute;
    $target = $(e.currentTarget);
    attribute = $target.data('model');
    console.log($target);
    return this.model.set(attribute, $target.is(':checked'));
  };

  return StepView;

})(View);



},{"../App":5,"../templates/StepTemplate.hbs":14,"../views/supers/View":17}],17:[function(require,module,exports){

/*
 * View Base Class
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since
 */
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



},{"../../helpers/ViewHelper":8}]},{},[9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvaGFuZGxlaWZ5L25vZGVfbW9kdWxlcy9oYW5kbGViYXJzL2xpYi9oYW5kbGViYXJzL2Jhc2UuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9oYW5kbGVpZnkvbm9kZV9tb2R1bGVzL2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ub2RlX21vZHVsZXMvaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy91dGlscy5qcyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2hhbmRsZWlmeS9ydW50aW1lLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvQXBwLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2NvbnRyb2xsZXJzL1N0ZXBDb250cm9sbGVyLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL2RhdGEvV2l6YXJkRGF0YS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9oZWxwZXJzL1ZpZXdIZWxwZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbWFpbi5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2RlbHMvU3RlcE1vZGVsLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZGVscy9zdXBlcnMvTW9kZWwuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvcm91dGVycy9Sb3V0ZXIuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdGVtcGxhdGVzL0hvbWVUZW1wbGF0ZS5oYnMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy90ZW1wbGF0ZXMvU3RlcFRlbXBsYXRlLmhicyIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0hvbWVWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL1N0ZXBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL3N1cGVycy9WaWV3LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFBQTs7O0tBdENBOztBQTBDQTtBQUFBOzs7S0ExQ0E7O0FBOENBO0FBQUE7OztLQTlDQTs7Y0FBQTs7R0FGaUIsUUFBUSxDQUFDLEtBWDVCLENBQUE7O0FBQUEsTUErRE0sQ0FBQyxPQUFQLEdBQWlCLElBL0RqQixDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qanNoaW50IGVxbnVsbDogdHJ1ZSAqL1xuXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbigpIHtcblxudmFyIEhhbmRsZWJhcnMgPSB7fTtcblxuLy8gQkVHSU4oQlJPV1NFUilcblxuSGFuZGxlYmFycy5WRVJTSU9OID0gXCIxLjAuMFwiO1xuSGFuZGxlYmFycy5DT01QSUxFUl9SRVZJU0lPTiA9IDQ7XG5cbkhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFUyA9IHtcbiAgMTogJzw9IDEuMC5yYy4yJywgLy8gMS4wLnJjLjIgaXMgYWN0dWFsbHkgcmV2MiBidXQgZG9lc24ndCByZXBvcnQgaXRcbiAgMjogJz09IDEuMC4wLXJjLjMnLFxuICAzOiAnPT0gMS4wLjAtcmMuNCcsXG4gIDQ6ICc+PSAxLjAuMCdcbn07XG5cbkhhbmRsZWJhcnMuaGVscGVycyAgPSB7fTtcbkhhbmRsZWJhcnMucGFydGlhbHMgPSB7fTtcblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBmdW5jdGlvblR5cGUgPSAnW29iamVjdCBGdW5jdGlvbl0nLFxuICAgIG9iamVjdFR5cGUgPSAnW29iamVjdCBPYmplY3RdJztcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlciA9IGZ1bmN0aW9uKG5hbWUsIGZuLCBpbnZlcnNlKSB7XG4gIGlmICh0b1N0cmluZy5jYWxsKG5hbWUpID09PSBvYmplY3RUeXBlKSB7XG4gICAgaWYgKGludmVyc2UgfHwgZm4pIHsgdGhyb3cgbmV3IEhhbmRsZWJhcnMuRXhjZXB0aW9uKCdBcmcgbm90IHN1cHBvcnRlZCB3aXRoIG11bHRpcGxlIGhlbHBlcnMnKTsgfVxuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMuaGVscGVycywgbmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgaWYgKGludmVyc2UpIHsgZm4ubm90ID0gaW52ZXJzZTsgfVxuICAgIHRoaXMuaGVscGVyc1tuYW1lXSA9IGZuO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVyUGFydGlhbCA9IGZ1bmN0aW9uKG5hbWUsIHN0cikge1xuICBpZiAodG9TdHJpbmcuY2FsbChuYW1lKSA9PT0gb2JqZWN0VHlwZSkge1xuICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHRoaXMucGFydGlhbHMsICBuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICB0aGlzLnBhcnRpYWxzW25hbWVdID0gc3RyO1xuICB9XG59O1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdoZWxwZXJNaXNzaW5nJywgZnVuY3Rpb24oYXJnKSB7XG4gIGlmKGFyZ3VtZW50cy5sZW5ndGggPT09IDIpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgaGVscGVyOiAnXCIgKyBhcmcgKyBcIidcIik7XG4gIH1cbn0pO1xuXG5IYW5kbGViYXJzLnJlZ2lzdGVySGVscGVyKCdibG9ja0hlbHBlck1pc3NpbmcnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBpbnZlcnNlID0gb3B0aW9ucy5pbnZlcnNlIHx8IGZ1bmN0aW9uKCkge30sIGZuID0gb3B0aW9ucy5mbjtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG5cbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZihjb250ZXh0ID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuKHRoaXMpO1xuICB9IGVsc2UgaWYoY29udGV4dCA9PT0gZmFsc2UgfHwgY29udGV4dCA9PSBudWxsKSB7XG4gICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gIH0gZWxzZSBpZih0eXBlID09PSBcIltvYmplY3QgQXJyYXldXCIpIHtcbiAgICBpZihjb250ZXh0Lmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBIYW5kbGViYXJzLmhlbHBlcnMuZWFjaChjb250ZXh0LCBvcHRpb25zKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGludmVyc2UodGhpcyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBmbihjb250ZXh0KTtcbiAgfVxufSk7XG5cbkhhbmRsZWJhcnMuSyA9IGZ1bmN0aW9uKCkge307XG5cbkhhbmRsZWJhcnMuY3JlYXRlRnJhbWUgPSBPYmplY3QuY3JlYXRlIHx8IGZ1bmN0aW9uKG9iamVjdCkge1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gb2JqZWN0O1xuICB2YXIgb2JqID0gbmV3IEhhbmRsZWJhcnMuSygpO1xuICBIYW5kbGViYXJzLksucHJvdG90eXBlID0gbnVsbDtcbiAgcmV0dXJuIG9iajtcbn07XG5cbkhhbmRsZWJhcnMubG9nZ2VyID0ge1xuICBERUJVRzogMCwgSU5GTzogMSwgV0FSTjogMiwgRVJST1I6IDMsIGxldmVsOiAzLFxuXG4gIG1ldGhvZE1hcDogezA6ICdkZWJ1ZycsIDE6ICdpbmZvJywgMjogJ3dhcm4nLCAzOiAnZXJyb3InfSxcblxuICAvLyBjYW4gYmUgb3ZlcnJpZGRlbiBpbiB0aGUgaG9zdCBlbnZpcm9ubWVudFxuICBsb2c6IGZ1bmN0aW9uKGxldmVsLCBvYmopIHtcbiAgICBpZiAoSGFuZGxlYmFycy5sb2dnZXIubGV2ZWwgPD0gbGV2ZWwpIHtcbiAgICAgIHZhciBtZXRob2QgPSBIYW5kbGViYXJzLmxvZ2dlci5tZXRob2RNYXBbbGV2ZWxdO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlICE9PSAndW5kZWZpbmVkJyAmJiBjb25zb2xlW21ldGhvZF0pIHtcbiAgICAgICAgY29uc29sZVttZXRob2RdLmNhbGwoY29uc29sZSwgb2JqKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn07XG5cbkhhbmRsZWJhcnMubG9nID0gZnVuY3Rpb24obGV2ZWwsIG9iaikgeyBIYW5kbGViYXJzLmxvZ2dlci5sb2cobGV2ZWwsIG9iaik7IH07XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ2VhY2gnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciBmbiA9IG9wdGlvbnMuZm4sIGludmVyc2UgPSBvcHRpb25zLmludmVyc2U7XG4gIHZhciBpID0gMCwgcmV0ID0gXCJcIiwgZGF0YTtcblxuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29udGV4dCk7XG4gIGlmKHR5cGUgPT09IGZ1bmN0aW9uVHlwZSkgeyBjb250ZXh0ID0gY29udGV4dC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYgKG9wdGlvbnMuZGF0YSkge1xuICAgIGRhdGEgPSBIYW5kbGViYXJzLmNyZWF0ZUZyYW1lKG9wdGlvbnMuZGF0YSk7XG4gIH1cblxuICBpZihjb250ZXh0ICYmIHR5cGVvZiBjb250ZXh0ID09PSAnb2JqZWN0Jykge1xuICAgIGlmKGNvbnRleHQgaW5zdGFuY2VvZiBBcnJheSl7XG4gICAgICBmb3IodmFyIGogPSBjb250ZXh0Lmxlbmd0aDsgaTxqOyBpKyspIHtcbiAgICAgICAgaWYgKGRhdGEpIHsgZGF0YS5pbmRleCA9IGk7IH1cbiAgICAgICAgcmV0ID0gcmV0ICsgZm4oY29udGV4dFtpXSwgeyBkYXRhOiBkYXRhIH0pO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IodmFyIGtleSBpbiBjb250ZXh0KSB7XG4gICAgICAgIGlmKGNvbnRleHQuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICAgIGlmKGRhdGEpIHsgZGF0YS5rZXkgPSBrZXk7IH1cbiAgICAgICAgICByZXQgPSByZXQgKyBmbihjb250ZXh0W2tleV0sIHtkYXRhOiBkYXRhfSk7XG4gICAgICAgICAgaSsrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYoaSA9PT0gMCl7XG4gICAgcmV0ID0gaW52ZXJzZSh0aGlzKTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignaWYnLCBmdW5jdGlvbihjb25kaXRpb25hbCwgb3B0aW9ucykge1xuICB2YXIgdHlwZSA9IHRvU3RyaW5nLmNhbGwoY29uZGl0aW9uYWwpO1xuICBpZih0eXBlID09PSBmdW5jdGlvblR5cGUpIHsgY29uZGl0aW9uYWwgPSBjb25kaXRpb25hbC5jYWxsKHRoaXMpOyB9XG5cbiAgaWYoIWNvbmRpdGlvbmFsIHx8IEhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb25kaXRpb25hbCkpIHtcbiAgICByZXR1cm4gb3B0aW9ucy5pbnZlcnNlKHRoaXMpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBvcHRpb25zLmZuKHRoaXMpO1xuICB9XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcigndW5sZXNzJywgZnVuY3Rpb24oY29uZGl0aW9uYWwsIG9wdGlvbnMpIHtcbiAgcmV0dXJuIEhhbmRsZWJhcnMuaGVscGVyc1snaWYnXS5jYWxsKHRoaXMsIGNvbmRpdGlvbmFsLCB7Zm46IG9wdGlvbnMuaW52ZXJzZSwgaW52ZXJzZTogb3B0aW9ucy5mbn0pO1xufSk7XG5cbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoJ3dpdGgnLCBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gIHZhciB0eXBlID0gdG9TdHJpbmcuY2FsbChjb250ZXh0KTtcbiAgaWYodHlwZSA9PT0gZnVuY3Rpb25UeXBlKSB7IGNvbnRleHQgPSBjb250ZXh0LmNhbGwodGhpcyk7IH1cblxuICBpZiAoIUhhbmRsZWJhcnMuVXRpbHMuaXNFbXB0eShjb250ZXh0KSkgcmV0dXJuIG9wdGlvbnMuZm4oY29udGV4dCk7XG59KTtcblxuSGFuZGxlYmFycy5yZWdpc3RlckhlbHBlcignbG9nJywgZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICB2YXIgbGV2ZWwgPSBvcHRpb25zLmRhdGEgJiYgb3B0aW9ucy5kYXRhLmxldmVsICE9IG51bGwgPyBwYXJzZUludChvcHRpb25zLmRhdGEubGV2ZWwsIDEwKSA6IDE7XG4gIEhhbmRsZWJhcnMubG9nKGxldmVsLCBjb250ZXh0KTtcbn0pO1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbkhhbmRsZWJhcnMuVk0gPSB7XG4gIHRlbXBsYXRlOiBmdW5jdGlvbih0ZW1wbGF0ZVNwZWMpIHtcbiAgICAvLyBKdXN0IGFkZCB3YXRlclxuICAgIHZhciBjb250YWluZXIgPSB7XG4gICAgICBlc2NhcGVFeHByZXNzaW9uOiBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24sXG4gICAgICBpbnZva2VQYXJ0aWFsOiBIYW5kbGViYXJzLlZNLmludm9rZVBhcnRpYWwsXG4gICAgICBwcm9ncmFtczogW10sXG4gICAgICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgICAgICB2YXIgcHJvZ3JhbVdyYXBwZXIgPSB0aGlzLnByb2dyYW1zW2ldO1xuICAgICAgICBpZihkYXRhKSB7XG4gICAgICAgICAgcHJvZ3JhbVdyYXBwZXIgPSBIYW5kbGViYXJzLlZNLnByb2dyYW0oaSwgZm4sIGRhdGEpO1xuICAgICAgICB9IGVsc2UgaWYgKCFwcm9ncmFtV3JhcHBlcikge1xuICAgICAgICAgIHByb2dyYW1XcmFwcGVyID0gdGhpcy5wcm9ncmFtc1tpXSA9IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbShpLCBmbik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb2dyYW1XcmFwcGVyO1xuICAgICAgfSxcbiAgICAgIG1lcmdlOiBmdW5jdGlvbihwYXJhbSwgY29tbW9uKSB7XG4gICAgICAgIHZhciByZXQgPSBwYXJhbSB8fCBjb21tb247XG5cbiAgICAgICAgaWYgKHBhcmFtICYmIGNvbW1vbikge1xuICAgICAgICAgIHJldCA9IHt9O1xuICAgICAgICAgIEhhbmRsZWJhcnMuVXRpbHMuZXh0ZW5kKHJldCwgY29tbW9uKTtcbiAgICAgICAgICBIYW5kbGViYXJzLlV0aWxzLmV4dGVuZChyZXQsIHBhcmFtKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfSxcbiAgICAgIHByb2dyYW1XaXRoRGVwdGg6IEhhbmRsZWJhcnMuVk0ucHJvZ3JhbVdpdGhEZXB0aCxcbiAgICAgIG5vb3A6IEhhbmRsZWJhcnMuVk0ubm9vcCxcbiAgICAgIGNvbXBpbGVySW5mbzogbnVsbFxuICAgIH07XG5cbiAgICByZXR1cm4gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgICB2YXIgcmVzdWx0ID0gdGVtcGxhdGVTcGVjLmNhbGwoY29udGFpbmVyLCBIYW5kbGViYXJzLCBjb250ZXh0LCBvcHRpb25zLmhlbHBlcnMsIG9wdGlvbnMucGFydGlhbHMsIG9wdGlvbnMuZGF0YSk7XG5cbiAgICAgIHZhciBjb21waWxlckluZm8gPSBjb250YWluZXIuY29tcGlsZXJJbmZvIHx8IFtdLFxuICAgICAgICAgIGNvbXBpbGVyUmV2aXNpb24gPSBjb21waWxlckluZm9bMF0gfHwgMSxcbiAgICAgICAgICBjdXJyZW50UmV2aXNpb24gPSBIYW5kbGViYXJzLkNPTVBJTEVSX1JFVklTSU9OO1xuXG4gICAgICBpZiAoY29tcGlsZXJSZXZpc2lvbiAhPT0gY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgIGlmIChjb21waWxlclJldmlzaW9uIDwgY3VycmVudFJldmlzaW9uKSB7XG4gICAgICAgICAgdmFyIHJ1bnRpbWVWZXJzaW9ucyA9IEhhbmRsZWJhcnMuUkVWSVNJT05fQ0hBTkdFU1tjdXJyZW50UmV2aXNpb25dLFxuICAgICAgICAgICAgICBjb21waWxlclZlcnNpb25zID0gSGFuZGxlYmFycy5SRVZJU0lPTl9DSEFOR0VTW2NvbXBpbGVyUmV2aXNpb25dO1xuICAgICAgICAgIHRocm93IFwiVGVtcGxhdGUgd2FzIHByZWNvbXBpbGVkIHdpdGggYW4gb2xkZXIgdmVyc2lvbiBvZiBIYW5kbGViYXJzIHRoYW4gdGhlIGN1cnJlbnQgcnVudGltZS4gXCIrXG4gICAgICAgICAgICAgICAgXCJQbGVhc2UgdXBkYXRlIHlvdXIgcHJlY29tcGlsZXIgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitydW50aW1lVmVyc2lvbnMrXCIpIG9yIGRvd25ncmFkZSB5b3VyIHJ1bnRpbWUgdG8gYW4gb2xkZXIgdmVyc2lvbiAoXCIrY29tcGlsZXJWZXJzaW9ucytcIikuXCI7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gVXNlIHRoZSBlbWJlZGRlZCB2ZXJzaW9uIGluZm8gc2luY2UgdGhlIHJ1bnRpbWUgZG9lc24ndCBrbm93IGFib3V0IHRoaXMgcmV2aXNpb24geWV0XG4gICAgICAgICAgdGhyb3cgXCJUZW1wbGF0ZSB3YXMgcHJlY29tcGlsZWQgd2l0aCBhIG5ld2VyIHZlcnNpb24gb2YgSGFuZGxlYmFycyB0aGFuIHRoZSBjdXJyZW50IHJ1bnRpbWUuIFwiK1xuICAgICAgICAgICAgICAgIFwiUGxlYXNlIHVwZGF0ZSB5b3VyIHJ1bnRpbWUgdG8gYSBuZXdlciB2ZXJzaW9uIChcIitjb21waWxlckluZm9bMV0rXCIpLlwiO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfTtcbiAgfSxcblxuICBwcm9ncmFtV2l0aERlcHRoOiBmdW5jdGlvbihpLCBmbiwgZGF0YSAvKiwgJGRlcHRoICovKSB7XG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDMpO1xuXG4gICAgdmFyIHByb2dyYW0gPSBmdW5jdGlvbihjb250ZXh0LCBvcHRpb25zKSB7XG4gICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIFtjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YV0uY29uY2F0KGFyZ3MpKTtcbiAgICB9O1xuICAgIHByb2dyYW0ucHJvZ3JhbSA9IGk7XG4gICAgcHJvZ3JhbS5kZXB0aCA9IGFyZ3MubGVuZ3RoO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBwcm9ncmFtOiBmdW5jdGlvbihpLCBmbiwgZGF0YSkge1xuICAgIHZhciBwcm9ncmFtID0gZnVuY3Rpb24oY29udGV4dCwgb3B0aW9ucykge1xuICAgICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICAgIHJldHVybiBmbihjb250ZXh0LCBvcHRpb25zLmRhdGEgfHwgZGF0YSk7XG4gICAgfTtcbiAgICBwcm9ncmFtLnByb2dyYW0gPSBpO1xuICAgIHByb2dyYW0uZGVwdGggPSAwO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9LFxuICBub29wOiBmdW5jdGlvbigpIHsgcmV0dXJuIFwiXCI7IH0sXG4gIGludm9rZVBhcnRpYWw6IGZ1bmN0aW9uKHBhcnRpYWwsIG5hbWUsIGNvbnRleHQsIGhlbHBlcnMsIHBhcnRpYWxzLCBkYXRhKSB7XG4gICAgdmFyIG9wdGlvbnMgPSB7IGhlbHBlcnM6IGhlbHBlcnMsIHBhcnRpYWxzOiBwYXJ0aWFscywgZGF0YTogZGF0YSB9O1xuXG4gICAgaWYocGFydGlhbCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgZm91bmRcIik7XG4gICAgfSBlbHNlIGlmKHBhcnRpYWwgaW5zdGFuY2VvZiBGdW5jdGlvbikge1xuICAgICAgcmV0dXJuIHBhcnRpYWwoY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfSBlbHNlIGlmICghSGFuZGxlYmFycy5jb21waWxlKSB7XG4gICAgICB0aHJvdyBuZXcgSGFuZGxlYmFycy5FeGNlcHRpb24oXCJUaGUgcGFydGlhbCBcIiArIG5hbWUgKyBcIiBjb3VsZCBub3QgYmUgY29tcGlsZWQgd2hlbiBydW5uaW5nIGluIHJ1bnRpbWUtb25seSBtb2RlXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0aWFsc1tuYW1lXSA9IEhhbmRsZWJhcnMuY29tcGlsZShwYXJ0aWFsLCB7ZGF0YTogZGF0YSAhPT0gdW5kZWZpbmVkfSk7XG4gICAgICByZXR1cm4gcGFydGlhbHNbbmFtZV0oY29udGV4dCwgb3B0aW9ucyk7XG4gICAgfVxuICB9XG59O1xuXG5IYW5kbGViYXJzLnRlbXBsYXRlID0gSGFuZGxlYmFycy5WTS50ZW1wbGF0ZTtcblxuLy8gRU5EKEJST1dTRVIpXG5cbnJldHVybiBIYW5kbGViYXJzO1xuXG59O1xuIiwiZXhwb3J0cy5hdHRhY2ggPSBmdW5jdGlvbihIYW5kbGViYXJzKSB7XG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8vIEJFR0lOKEJST1dTRVIpXG5cbnZhciBlcnJvclByb3BzID0gWydkZXNjcmlwdGlvbicsICdmaWxlTmFtZScsICdsaW5lTnVtYmVyJywgJ21lc3NhZ2UnLCAnbmFtZScsICdudW1iZXInLCAnc3RhY2snXTtcblxuSGFuZGxlYmFycy5FeGNlcHRpb24gPSBmdW5jdGlvbihtZXNzYWdlKSB7XG4gIHZhciB0bXAgPSBFcnJvci5wcm90b3R5cGUuY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblxuICAvLyBVbmZvcnR1bmF0ZWx5IGVycm9ycyBhcmUgbm90IGVudW1lcmFibGUgaW4gQ2hyb21lIChhdCBsZWFzdCksIHNvIGBmb3IgcHJvcCBpbiB0bXBgIGRvZXNuJ3Qgd29yay5cbiAgZm9yICh2YXIgaWR4ID0gMDsgaWR4IDwgZXJyb3JQcm9wcy5sZW5ndGg7IGlkeCsrKSB7XG4gICAgdGhpc1tlcnJvclByb3BzW2lkeF1dID0gdG1wW2Vycm9yUHJvcHNbaWR4XV07XG4gIH1cbn07XG5IYW5kbGViYXJzLkV4Y2VwdGlvbi5wcm90b3R5cGUgPSBuZXcgRXJyb3IoKTtcblxuLy8gQnVpbGQgb3V0IG91ciBiYXNpYyBTYWZlU3RyaW5nIHR5cGVcbkhhbmRsZWJhcnMuU2FmZVN0cmluZyA9IGZ1bmN0aW9uKHN0cmluZykge1xuICB0aGlzLnN0cmluZyA9IHN0cmluZztcbn07XG5IYW5kbGViYXJzLlNhZmVTdHJpbmcucHJvdG90eXBlLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiB0aGlzLnN0cmluZy50b1N0cmluZygpO1xufTtcblxudmFyIGVzY2FwZSA9IHtcbiAgXCImXCI6IFwiJmFtcDtcIixcbiAgXCI8XCI6IFwiJmx0O1wiLFxuICBcIj5cIjogXCImZ3Q7XCIsXG4gICdcIic6IFwiJnF1b3Q7XCIsXG4gIFwiJ1wiOiBcIiYjeDI3O1wiLFxuICBcImBcIjogXCImI3g2MDtcIlxufTtcblxudmFyIGJhZENoYXJzID0gL1smPD5cIidgXS9nO1xudmFyIHBvc3NpYmxlID0gL1smPD5cIidgXS87XG5cbnZhciBlc2NhcGVDaGFyID0gZnVuY3Rpb24oY2hyKSB7XG4gIHJldHVybiBlc2NhcGVbY2hyXSB8fCBcIiZhbXA7XCI7XG59O1xuXG5IYW5kbGViYXJzLlV0aWxzID0ge1xuICBleHRlbmQ6IGZ1bmN0aW9uKG9iaiwgdmFsdWUpIHtcbiAgICBmb3IodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYodmFsdWUuaGFzT3duUHJvcGVydHkoa2V5KSkge1xuICAgICAgICBvYmpba2V5XSA9IHZhbHVlW2tleV07XG4gICAgICB9XG4gICAgfVxuICB9LFxuXG4gIGVzY2FwZUV4cHJlc3Npb246IGZ1bmN0aW9uKHN0cmluZykge1xuICAgIC8vIGRvbid0IGVzY2FwZSBTYWZlU3RyaW5ncywgc2luY2UgdGhleSdyZSBhbHJlYWR5IHNhZmVcbiAgICBpZiAoc3RyaW5nIGluc3RhbmNlb2YgSGFuZGxlYmFycy5TYWZlU3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RyaW5nLnRvU3RyaW5nKCk7XG4gICAgfSBlbHNlIGlmIChzdHJpbmcgPT0gbnVsbCB8fCBzdHJpbmcgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBGb3JjZSBhIHN0cmluZyBjb252ZXJzaW9uIGFzIHRoaXMgd2lsbCBiZSBkb25lIGJ5IHRoZSBhcHBlbmQgcmVnYXJkbGVzcyBhbmRcbiAgICAvLyB0aGUgcmVnZXggdGVzdCB3aWxsIGRvIHRoaXMgdHJhbnNwYXJlbnRseSBiZWhpbmQgdGhlIHNjZW5lcywgY2F1c2luZyBpc3N1ZXMgaWZcbiAgICAvLyBhbiBvYmplY3QncyB0byBzdHJpbmcgaGFzIGVzY2FwZWQgY2hhcmFjdGVycyBpbiBpdC5cbiAgICBzdHJpbmcgPSBzdHJpbmcudG9TdHJpbmcoKTtcblxuICAgIGlmKCFwb3NzaWJsZS50ZXN0KHN0cmluZykpIHsgcmV0dXJuIHN0cmluZzsgfVxuICAgIHJldHVybiBzdHJpbmcucmVwbGFjZShiYWRDaGFycywgZXNjYXBlQ2hhcik7XG4gIH0sXG5cbiAgaXNFbXB0eTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlICYmIHZhbHVlICE9PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2UgaWYodG9TdHJpbmcuY2FsbCh2YWx1ZSkgPT09IFwiW29iamVjdCBBcnJheV1cIiAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59O1xuXG4vLyBFTkQoQlJPV1NFUilcblxucmV0dXJuIEhhbmRsZWJhcnM7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gcmVxdWlyZSgnaGFuZGxlYmFycy9saWIvaGFuZGxlYmFycy9iYXNlLmpzJykuY3JlYXRlKClcbnJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvdXRpbHMuanMnKS5hdHRhY2goZXhwb3J0cylcbnJlcXVpcmUoJ2hhbmRsZWJhcnMvbGliL2hhbmRsZWJhcnMvcnVudGltZS5qcycpLmF0dGFjaChleHBvcnRzKSIsIlxuIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgV0lLSUVEVSBBU1NJR05NRU5UIERFU0lHTiBXSVpBUkRcbiMgQXV0aG9yOiBrZXZpbkB3aW50ci51cyBAIFdJTlRSXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcblxuQXBwbGljYXRpb24gPSBcblxuICBpbml0aWFsaXplOiAtPlxuXG4gICAgIyBBcHAgRGF0YVxuICAgIEFwcERhdGEgPSByZXF1aXJlKCcuL2RhdGEvV2l6YXJkRGF0YScpXG4gICAgQGRhdGEgPSBBcHBEYXRhXG5cblxuICAgICMgSW1wb3J0IHZpZXdzXG4gICAgSG9tZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL0hvbWVWaWV3JylcbiAgICBSb3V0ZXIgPSByZXF1aXJlKCcuL3JvdXRlcnMvUm91dGVyJylcblxuXG4gICAgIyBJbml0aWFsaXplIHZpZXdzXG4gICAgQGhvbWVWaWV3ID0gbmV3IEhvbWVWaWV3KClcbiAgICBAcm91dGVyID0gbmV3IFJvdXRlcigpXG5cblxuICAgIE9iamVjdC5mcmVlemU/IHRoaXNcblxuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uIiwiIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXG4jIFRpdGxlOiAgU3RlcENvbnRyb2xsZXJcbiMgRGVzY3JpcHRpb246IFxuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblZpZXcgPSByZXF1aXJlKCcuLi92aWV3cy9zdXBlcnMvVmlldycpXG5cblN0ZXBWaWV3ID0gcmVxdWlyZSgnLi4vdmlld3MvU3RlcFZpZXcnKVxuU3RlcE1vZGVsID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXBNb2RlbCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcENvbnRyb2xsZXIgZXh0ZW5kcyBWaWV3XG5cbiAgc3Vic2NyaXB0aW9uczpcbiAgICAnc3RlcDp1cGRhdGVkJyA6ICdzdGVwVXBkYXRlZCdcblxuICBzdGVwVXBkYXRlZDogKHN0ZXBWaWV3KSAtPlxuICAgIGNvbnNvbGUubG9nIHN0ZXBWaWV3Lm1vZGVsLmNoYW5nZWQiLCJXaXphcmREYXRhID0gW1xuICB7XG4gICAgdGl0bGU6ICdXZWxjb21lJ1xuICAgIGRvbmU6IHRydWVcbiAgICBpbmNsdWRlOiB0cnVlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnQ2hvb3NlIEFzc2lnbm1lbnQgVHlwZSdcbiAgICBkb25lOiBmYWxzZVxuICAgIGluY2x1ZGU6IHRydWVcbiAgfVxuICB7XG4gICAgdGl0bGU6ICdMZWFybmluZyBXaWtpIEVzc2VudGlhbHMnXG4gICAgZG9uZTogZmFsc2VcbiAgICBpbmNsdWRlOiB0cnVlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnR2V0dGluZyBTdGFydGVkIHdpdGggRWRpdGluZydcbiAgICBkb25lOiB0cnVlXG4gICAgaW5jbHVkZTogdHJ1ZVxuICB9XG4gIHtcbiAgICB0aXRsZTogJ0Nob29zaW5nIEFydGljbGVzJ1xuICAgIGRvbmU6IGZhbHNlXG4gICAgaW5jbHVkZTogdHJ1ZVxuICB9XG4gIHtcbiAgICB0aXRsZTogJ1Jlc2VhcmNoICZhbXA7IFBsYW5uaW5nJ1xuICAgIGRvbmU6IGZhbHNlXG4gICAgaW5jbHVkZTogdHJ1ZVxuICB9XG4gIHtcbiAgICB0aXRsZTogJ0RyYWZ0cyAmYW1wOyBNYWluc3BhY2UnXG4gICAgZG9uZTogZmFsc2VcbiAgICBpbmNsdWRlOiB0cnVlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnUGVlciBGZWVkYmFjaydcbiAgICBkb25lOiBmYWxzZVxuICAgIGluY2x1ZGU6IHRydWVcbiAgfVxuICB7XG4gICAgdGl0bGU6ICdTdXBwbGVtZW50YXJ5IEFzc2lnbm1lbnRzJ1xuICAgIGRvbmU6IGZhbHNlXG4gICAgaW5jbHVkZTogdHJ1ZVxuICB9XG4gIHtcbiAgICB0aXRsZTogJ0RZSyAvIEdBIFN1Ym1pc3Npb24nXG4gICAgZG9uZTogZmFsc2VcbiAgICBpbmNsdWRlOiB0cnVlXG4gIH1cbiAgXG5dXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkRGF0YSIsIiMjI1xuICogSGFuZGxlYmFycyBUZW1wbGF0ZSBIZWxwZXJzXG4gKiBcbiAqIEBsYW5ndmVyc2lvbiBDb2ZmZWVTY3JpcHRcbiAqIFxuICogQGF1dGhvciBcbiAqIEBzaW5jZSAgXG4gIyMjXG5cblxuIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuLy8rIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbi8vKyBQVUJMSUMgTUVUSE9EUyAvIEdFVFRFUlMgLyBTRVRURVJTXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiNcbiMgQHJldHVybiBTdHJpbmdcbiNcbkhhbmRsZWJhcnMucmVnaXN0ZXJIZWxwZXIoICdsaW5rJywgKCB0ZXh0LCB1cmwgKSAtPlxuXG4gIHRleHQgPSBIYW5kbGViYXJzLlV0aWxzLmVzY2FwZUV4cHJlc3Npb24oIHRleHQgKVxuICB1cmwgID0gSGFuZGxlYmFycy5VdGlscy5lc2NhcGVFeHByZXNzaW9uKCB1cmwgKVxuXG4gIHJlc3VsdCA9ICc8YSBocmVmPVwiJyArIHVybCArICdcIj4nICsgdGV4dCArICc8L2E+J1xuXG4gIHJldHVybiBuZXcgSGFuZGxlYmFycy5TYWZlU3RyaW5nKCByZXN1bHQgKVxuKSIsIiMjI1xuICogQXBwbGljYXRpb24gSW5pdGlhbGl6ZXJcbiAqIFxuICogQGxhbmd2ZXJzaW9uIENvZmZlZVNjcmlwdFxuICogXG4gKiBAYXV0aG9yIFxuICogQHNpbmNlICBcbiAjIyNcblxuYXBwbGljYXRpb24gPSByZXF1aXJlKCcuL0FwcCcpXG5cbiQgLT5cbiAgXG4gICMgSW5pdGlhbGl6ZSBBcHBsaWNhdGlvblxuICBhcHBsaWNhdGlvbi5pbml0aWFsaXplKClcblxuICAjIFN0YXJ0IEJhY2tib25lIHJvdXRlclxuICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KCkiLCIjIyNcbiAqIFF1ZXN0aW9uIGFuZCBBbnN3ZXIgTW9kZWwgKFFBKVxuICogXG4gKiBAbGFuZ3ZlcnNpb24gQ29mZmVlU2NyaXB0XG4gKiBcbiAqIEBhdXRob3IgXG4gKiBAc2luY2UgIFxuICMjI1xuXG5Nb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9zdXBlcnMvTW9kZWwnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFN0ZXBNb2RlbCBleHRlbmRzIE1vZGVsXG4iLCIjIyNcbiAqIEJhc2UgQ2xhc3MgZm9yIGFsbCBCYWNrYm9uZSBNb2RlbHNcbiAqIFxuICogQGxhbmd2ZXJzaW9uIENvZmZlZVNjcmlwdFxuICogXG4gKiBAYXV0aG9yIFxuICogQHNpbmNlICBcbiAjIyNcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNb2RlbCBleHRlbmRzIEJhY2tib25lLk1vZGVsXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIFBST1BFUlRJRVMgLyBDT05TVEFOVFNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgRVZFTlQgSEFORExFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyMiLCIjIyNcbiAqIEJhY2tib25lIFByaW1hcnkgUm91dGVyXG4gKiBcbiAqIEBsYW5ndmVyc2lvbiBDb2ZmZWVTY3JpcHRcbiAqIFxuICogQGF1dGhvciBcbiAqIEBzaW5jZSAgXG4gIyMjXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFJvdXRlciBleHRlbmRzIEJhY2tib25lLlJvdXRlclxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLysgUm91dGVzXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuICAgIFxuICByb3V0ZXM6XG4gICAgJycgOiAnaG9tZSdcblxuICAjIyMvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gIC8vKyBSb3V0ZSBIYW5kbGVyc1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgaG9tZTogLT5cbiAgICAkKCAnI2FwcCcgKS5odG1sKCBhcHBsaWNhdGlvbi5ob21lVmlldy5yZW5kZXIoKS5lbCApXG5cbiIsIm1vZHVsZS5leHBvcnRzPXJlcXVpcmUoXCJoYW5kbGVpZnlcIikudGVtcGxhdGUoZnVuY3Rpb24gKEhhbmRsZWJhcnMsZGVwdGgwLGhlbHBlcnMscGFydGlhbHMsZGF0YSkge1xuICB0aGlzLmNvbXBpbGVySW5mbyA9IFs0LCc+PSAxLjAuMCddO1xuaGVscGVycyA9IHRoaXMubWVyZ2UoaGVscGVycywgSGFuZGxlYmFycy5oZWxwZXJzKTsgZGF0YSA9IGRhdGEgfHwge307XG4gIHZhciBidWZmZXIgPSBcIlwiLCBzdGFjazEsIGZ1bmN0aW9uVHlwZT1cImZ1bmN0aW9uXCIsIGVzY2FwZUV4cHJlc3Npb249dGhpcy5lc2NhcGVFeHByZXNzaW9uO1xuXG5cbiAgYnVmZmVyICs9IFwiPCEtLVxcbiAgQXV0aG9yOiBcXG4gIERhdGU6IFxcblxcbiAgRGVzY3JpcHRpb246IFRlbXBsYXRlIERlc2NyaXB0aW9uXFxuLS0+XFxuPGRpdiBjbGFzcz1cXFwiY29udGVudFxcXCI+XFxuICA8ZGl2IGNsYXNzPVxcXCJjb250ZW50LWhlYWRlclxcXCI+XFxuICAgIDxoMSBjbGFzcz1cXFwiY29udGVudC1oZWFkZXJfX3RpdGxlXFxcIj5cIjtcbiAgaWYgKHN0YWNrMSA9IGhlbHBlcnMuY29udGVudCkgeyBzdGFjazEgPSBzdGFjazEuY2FsbChkZXB0aDAsIHtoYXNoOnt9LGRhdGE6ZGF0YX0pOyB9XG4gIGVsc2UgeyBzdGFjazEgPSBkZXB0aDAuY29udGVudDsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgYnVmZmVyICs9IGVzY2FwZUV4cHJlc3Npb24oc3RhY2sxKVxuICAgICsgXCI8L2gxPlxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwc1xcXCI+XFxuICAgIFxcbiAgPC9kaXY+XFxuICA8ZGl2IGNsYXNzPVxcXCJzdGVwLWFjdGlvbnNcXFwiPlxcbiAgICA8YSBocmVmPVxcXCIjXFxcIiBjbGFzcz1cXFwicHJldlxcXCI+UHJldjwvYT5cXG4gICAgPGEgaHJlZj1cXFwiI1xcXCIgY2xhc3M9XFxcIm5leHRcXFwiPk5leHQ8L2E+XFxuICA8L2Rpdj5cXG48L2Rpdj5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCJtb2R1bGUuZXhwb3J0cz1yZXF1aXJlKFwiaGFuZGxlaWZ5XCIpLnRlbXBsYXRlKGZ1bmN0aW9uIChIYW5kbGViYXJzLGRlcHRoMCxoZWxwZXJzLHBhcnRpYWxzLGRhdGEpIHtcbiAgdGhpcy5jb21waWxlckluZm8gPSBbNCwnPj0gMS4wLjAnXTtcbmhlbHBlcnMgPSB0aGlzLm1lcmdlKGhlbHBlcnMsIEhhbmRsZWJhcnMuaGVscGVycyk7IGRhdGEgPSBkYXRhIHx8IHt9O1xuICB2YXIgYnVmZmVyID0gXCJcIiwgc3RhY2sxLCBmdW5jdGlvblR5cGU9XCJmdW5jdGlvblwiLCBlc2NhcGVFeHByZXNzaW9uPXRoaXMuZXNjYXBlRXhwcmVzc2lvbiwgc2VsZj10aGlzO1xuXG5mdW5jdGlvbiBwcm9ncmFtMShkZXB0aDAsZGF0YSkge1xuICBcbiAgXG4gIHJldHVybiBcIiBjaGVja2VkIFwiO1xuICB9XG5cbiAgYnVmZmVyICs9IFwiXFxuXFxuPGgzPlwiO1xuICBpZiAoc3RhY2sxID0gaGVscGVycy5zdGVwTnVtYmVyKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC5zdGVwTnVtYmVyOyBzdGFjazEgPSB0eXBlb2Ygc3RhY2sxID09PSBmdW5jdGlvblR5cGUgPyBzdGFjazEuYXBwbHkoZGVwdGgwKSA6IHN0YWNrMTsgfVxuICBidWZmZXIgKz0gZXNjYXBlRXhwcmVzc2lvbihzdGFjazEpXG4gICAgKyBcIi4gXCI7XG4gIGlmIChzdGFjazEgPSBoZWxwZXJzLnRpdGxlKSB7IHN0YWNrMSA9IHN0YWNrMS5jYWxsKGRlcHRoMCwge2hhc2g6e30sZGF0YTpkYXRhfSk7IH1cbiAgZWxzZSB7IHN0YWNrMSA9IGRlcHRoMC50aXRsZTsgc3RhY2sxID0gdHlwZW9mIHN0YWNrMSA9PT0gZnVuY3Rpb25UeXBlID8gc3RhY2sxLmFwcGx5KGRlcHRoMCkgOiBzdGFjazE7IH1cbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIjwvaDM+XFxuPGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBuYW1lPVxcXCJkb25lXFxcIiBjbGFzcz1cXFwiZG9uZVxcXCIgZGF0YS1tb2RlbD1cXFwiZG9uZVxcXCIgXCI7XG4gIHN0YWNrMSA9IGhlbHBlcnNbJ2lmJ10uY2FsbChkZXB0aDAsIGRlcHRoMC5kb25lLCB7aGFzaDp7fSxpbnZlcnNlOnNlbGYubm9vcCxmbjpzZWxmLnByb2dyYW0oMSwgcHJvZ3JhbTEsIGRhdGEpLGRhdGE6ZGF0YX0pO1xuICBpZihzdGFjazEgfHwgc3RhY2sxID09PSAwKSB7IGJ1ZmZlciArPSBzdGFjazE7IH1cbiAgYnVmZmVyICs9IFwiIC8+XFxuPGxhYmVsIGZvcj1cXFwiZG9uZVxcXCI+RG9uZT88L2xhYmVsPlxcbjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgbmFtZT1cXFwiaW5jbHVkZVxcXCIgY2xhc3M9XFxcImRvbmVcXFwiIGRhdGEtbW9kZWw9XFxcImluY2x1ZGVcXFwiIFwiO1xuICBzdGFjazEgPSBoZWxwZXJzWydpZiddLmNhbGwoZGVwdGgwLCBkZXB0aDAuaW5jbHVkZSwge2hhc2g6e30saW52ZXJzZTpzZWxmLm5vb3AsZm46c2VsZi5wcm9ncmFtKDEsIHByb2dyYW0xLCBkYXRhKSxkYXRhOmRhdGF9KTtcbiAgaWYoc3RhY2sxIHx8IHN0YWNrMSA9PT0gMCkgeyBidWZmZXIgKz0gc3RhY2sxOyB9XG4gIGJ1ZmZlciArPSBcIiAvPlxcbjxsYWJlbCBmb3I9XFxcImluY2x1ZGVcXFwiPkluY2x1ZGU/PC9sYWJlbD5cIjtcbiAgcmV0dXJuIGJ1ZmZlcjtcbiAgfSkiLCIjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBIb21lVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5hcHBsaWNhdGlvbiA9IHJlcXVpcmUoICcuLi9BcHAnIClcblxuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcbkhvbWVUZW1wbGF0ZSA9IHJlcXVpcmUoJy4uL3RlbXBsYXRlcy9Ib21lVGVtcGxhdGUuaGJzJylcblxuU3RlcENvbnRyb2xsZXIgPSByZXF1aXJlKCcuLi9jb250cm9sbGVycy9TdGVwQ29udHJvbGxlcicpXG5TdGVwVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL1N0ZXBWaWV3JylcblN0ZXBNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9TdGVwTW9kZWwnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgSG9tZVZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgU0VUVVBcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgY2xhc3NOYW1lOiAnaG9tZS12aWV3J1xuXG4gIHRlbXBsYXRlOiBIb21lVGVtcGxhdGVcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBJTklUXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQGN1cnJlbnRTdGVwID0gMFxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG4gIGV2ZW50czogLT5cbiAgICAnY2xpY2sgLm5leHQnIDogJ25leHRDbGlja0hhbmRsZXInXG4gICAgJ2NsaWNrIC5wcmV2JyA6ICdwcmV2Q2xpY2tIYW5kbGVyJ1xuXG5cbiAgcmVuZGVyOiAtPlxuICAgIEAkZWwuaHRtbCggQHRlbXBsYXRlKCBAZ2V0UmVuZGVyRGF0YSgpKSlcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuXG4gICAgcmV0dXJuIEBcblxuICBhZnRlclJlbmRlcjogLT5cblxuICAgIEAkc3RlcHNDb250YWluZXIgPSBAJGVsLmZpbmQoJy5zdGVwcycpXG5cbiAgICBAc3RlcFZpZXdzID0gW11cblxuICAgIF8uZWFjaChhcHBsaWNhdGlvbi5kYXRhLChzdGVwLCBpbmRleCkgPT5cbiAgICAgIG5ld21vZGVsID0gbmV3IFN0ZXBNb2RlbCgpXG4gICAgICBfLm1hcChzdGVwLCh2YWx1ZSwga2V5LCBsaXN0KSAtPiBcbiAgICAgICAgbmV3bW9kZWwuc2V0KGtleSx2YWx1ZSlcbiAgICAgIClcbiAgICAgIG5ld3ZpZXcgPSBuZXcgU3RlcFZpZXcoXG4gICAgICAgIG1vZGVsOiBuZXdtb2RlbFxuICAgICAgKVxuICAgICAgbmV3dmlldy5tb2RlbC5zZXQoJ3N0ZXBOdW1iZXInLCBpbmRleCArIDEpXG4gICAgICBAJHN0ZXBzQ29udGFpbmVyLmFwcGVuZChuZXd2aWV3LnJlbmRlcigpLmhpZGUoKS5lbClcbiAgICAgIEBzdGVwVmlld3MucHVzaChuZXd2aWV3KVxuICAgIClcblxuICAgIGlmIEBzdGVwVmlld3MubGVuZ3RoID4gMFxuICAgICAgQHNob3dDdXJyZW50U3RlcCgpXG5cbiAgICBAU3RlcENvbnRyb2xsZXIgPSBuZXcgU3RlcENvbnRyb2xsZXIoXG4gICAgICBlbDogQCRzdGVwc0NvbnRhaW5lclxuICAgICAgY2hpbGRWaWV3czogQHN0ZXBWaWV3c1xuICAgIClcblxuXG4gIGdldFJlbmRlckRhdGE6IC0+XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbnRlbnQ6IFwiV2lraUVkdSBBc3NpZ25tZW50IERlc2lnbiBXaXphcmRcIlxuICAgIH1cbiAgICBcblxuICAjLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgIyBDVVNUT00gRlVOQ1RJT05TXG4gICMtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gIGFkdmFuY2VTdGVwOiAtPlxuICAgIEBjdXJyZW50U3RlcCs9MVxuICAgIFxuICAgIGlmIEBjdXJyZW50U3RlcCA9PSBAc3RlcFZpZXdzLmxlbmd0aCBcbiAgICAgIEBjdXJyZW50U3RlcCA9IDBcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG4gIGRlY3JlbWVudFN0ZXA6IC0+XG4gICAgQGN1cnJlbnRTdGVwLT0xXG5cbiAgICBpZiBAY3VycmVudFN0ZXAgPCAwXG4gICAgICBAY3VycmVudFN0ZXAgPSBAc3RlcFZpZXdzLmxlbmd0aCAtIDFcblxuICAgIEBoaWRlQWxsU3RlcHMoKVxuICAgIEBzaG93Q3VycmVudFN0ZXAoKVxuXG4gIHNob3dDdXJyZW50U3RlcDogLT5cbiAgICBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF0uc2hvdygpXG5cbiAgY3VycmVudFN0ZXBWaWV3OiAtPlxuICAgIHJldHVybiBAc3RlcFZpZXdzW0BjdXJyZW50U3RlcF1cblxuICBoaWRlQWxsU3RlcHM6IC0+XG4gICAgXy5lYWNoKEBzdGVwVmlld3MsKHN0ZXBWaWV3KSA9PlxuICAgICAgc3RlcFZpZXcuaGlkZSgpXG4gICAgKVxuXG5cbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICMgRVZFTlQgSEFORExFUlNcbiAgIy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAgbmV4dENsaWNrSGFuZGxlcjogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgQGFkdmFuY2VTdGVwKClcblxuICBwcmV2Q2xpY2tIYW5kbGVyOiAoZSkgLT5cbiAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICBAZGVjcmVtZW50U3RlcCgpXG5cbiAgYXBwTG9hZGVkSGFuZGxlcjogKGUpIC0+XG4gICAgY29uc29sZS5sb2cgJ2FwcCBsb2FkZWQnXG5cblxuIiwiXG4jIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcbiMgVGl0bGU6ICBTdGVwVmlld1xuIyBBdXRob3I6IGtldmluQHdpbnRyLnVzIEAgV0lOVFJcbiMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI1xuXG5cbmFwcGxpY2F0aW9uID0gcmVxdWlyZSggJy4uL0FwcCcgKVxuVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXdzL3N1cGVycy9WaWV3JylcbnRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL1N0ZXBUZW1wbGF0ZS5oYnMnKVxuXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcFZpZXcgZXh0ZW5kcyBWaWV3XG5cbiAgY2xhc3NOYW1lOiAnc3RlcCdcblxuICB0ZW1wbGF0ZTogdGVtcGxhdGVcblxuICBldmVudHM6XG4gICAgJ2NsaWNrIGlucHV0JyA6ICdpbnB1dEhhbmRsZXInXG5cbiAgXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQG1vZGVsLmF0dHJpYnV0ZXMgKSApXG5cbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIHJldHVybiBAXG5cbiAgYWZ0ZXJSZW5kZXI6IC0+XG4gICAgQCRkb25lQnV0dG9uID0gQCRlbC5maW5kKCdpbnB1dC5kb25lJykuZmlyc3QoKVxuICAgIEBtb2RlbC5vbiAnY2hhbmdlJywgPT5cbiAgICAgIEJhY2tib25lLk1lZGlhdG9yLnB1Ymxpc2goJ3N0ZXA6dXBkYXRlZCcsIEApXG5cbiAgaGlkZTogLT5cbiAgICBAJGVsLmhpZGUoKVxuXG4gICAgcmV0dXJuIEBcblxuICBzaG93OiAtPlxuICAgIEAkZWwuc2hvdygpXG5cbiAgICByZXR1cm4gQFxuXG4gIGlucHV0SGFuZGxlcjogKGUpIC0+XG4gICAgJHRhcmdldCA9ICQoZS5jdXJyZW50VGFyZ2V0KVxuICAgIGF0dHJpYnV0ZSA9ICR0YXJnZXQuZGF0YSgnbW9kZWwnKVxuICAgIGNvbnNvbGUubG9nICR0YXJnZXRcbiAgICBAbW9kZWwuc2V0KGF0dHJpYnV0ZSwgJHRhcmdldC5pcygnOmNoZWNrZWQnKSlcbiAgICBcblxuIFxuXG4iLCIjIyNcbiAqIFZpZXcgQmFzZSBDbGFzc1xuICogXG4gKiBAbGFuZ3ZlcnNpb24gQ29mZmVlU2NyaXB0XG4gKiBcbiAqIEBhdXRob3IgXG4gKiBAc2luY2UgIFxuICMjI1xuXG5yZXF1aXJlKCcuLi8uLi9oZWxwZXJzL1ZpZXdIZWxwZXInKVxuXG5jbGFzcyBWaWV3IGV4dGVuZHMgQmFja2JvbmUuVmlld1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBVQkxJQyBQUk9QRVJUSUVTIC8gQ09OU1RBTlRTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICB0ZW1wbGF0ZTogLT5cbiAgIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBnZXRSZW5kZXJEYXRhOiAtPlxuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIElOSEVSSVRFRCAvIE9WRVJSSURFU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG4gIFxuICAjXG4gICMgQHByaXZhdGVcbiAgI1xuICBpbml0aWFsaXplOiAtPlxuICAgIEByZW5kZXIgPSBfLmJpbmQoIEByZW5kZXIsIEAgKVxuXG4gICNcbiAgIyBAcHJpdmF0ZVxuICAjXG4gIHJlbmRlcjogLT5cbiAgICBAJGVsLmh0bWwoIEB0ZW1wbGF0ZSggQGdldFJlbmRlckRhdGEoKSApIClcbiAgICBAYWZ0ZXJSZW5kZXIoKVxuICAgIFxuICAgIHJldHVybiBAXG5cbiAgI1xuICAjIEBwcml2YXRlXG4gICNcbiAgYWZ0ZXJSZW5kZXI6IC0+XG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgUFVCTElDIE1FVEhPRFMgLyBHRVRURVJTIC8gU0VUVEVSU1xuICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIyMjXG5cbiAgIyMjLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAvLysgRVZFTlQgSEFORExFUlNcbiAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSMjI1xuXG4gICMjIy8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgLy8rIFBSSVZBVEUgQU5EIFBST1RFQ1RFRCBNRVRIT0RTXG4gIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0jIyNcblxubW9kdWxlLmV4cG9ydHMgPSBWaWV3Il19
