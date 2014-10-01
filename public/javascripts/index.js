(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
!function(e){if("object"==typeof exports)module.exports=e();else if("function"==typeof define&&define.amd)define(e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.jade=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str =  str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

},{"fs":2}],2:[function(require,module,exports){

},{}]},{},[1])
(1)
});
}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"fs":1}],3:[function(require,module,exports){
var App, AppLayout, StepModule, ToggleableRegion,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Marionette.Behaviors.behaviorsLookup = function() {
  return window.Behaviors;
};

window.Behaviors = {};

window.Behaviors.Closeable = require('./behaviors/Closeable');

ToggleableRegion = require('./regions/ToggleableRegion');

AppLayout = require('./views/AppLayout');

StepModule = require('./modules/step/StepModule');

App = (function(_super) {
  __extends(App, _super);

  function App() {
    this.initialize = __bind(this.initialize, this);
    return App.__super__.constructor.apply(this, arguments);
  }

  App.prototype.initialize = function() {
    console.log('Initializing app...');
    this.router = new Backbone.Marionette.AppRouter();
    this.addInitializer((function(_this) {
      return function(options) {
        return (new AppLayout()).render();
      };
    })(this));
    this.addInitializer((function(_this) {
      return function(options) {
        return _this.addRegions({
          stepRegion: {
            selector: "#steps",
            regionClass: ToggleableRegion,
            module: _this.submodules.Step
          }
        });
      };
    })(this));
    this.addInitializer((function(_this) {
      return function(options) {
        Backbone.history.start();
        return console.log(Backbone.history);
      };
    })(this));
    this.module('Step', StepModule);
    return this.start({});
  };

  return App;

})(Backbone.Marionette.Application);

module.exports = App;



},{"./behaviors/Closeable":4,"./modules/step/StepModule":8,"./regions/ToggleableRegion":15,"./views/AppLayout":16}],4:[function(require,module,exports){
var Closeable,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Closeable = (function(_super) {
  __extends(Closeable, _super);

  function Closeable() {
    return Closeable.__super__.constructor.apply(this, arguments);
  }

  Closeable.prototype.ui = {
    close: 'button.close'
  };

  Closeable.prototype.events = {
    'click @ui.close': 'closeClicked'
  };

  Closeable.prototype.closeClicked = function() {
    return this.view.trigger('region:off');
  };

  return Closeable;

})(Marionette.Behavior);

module.exports = Closeable;



},{}],5:[function(require,module,exports){
var WizardData;

WizardData = [
  {
    title: 'Welcome',
    done: false
  }, {
    title: 'Choose Assignment Type',
    done: false
  }, {
    title: 'Learning Wiki Essentials',
    done: false
  }, {
    title: 'Getting Started with Editing',
    done: false
  }, {
    title: 'Choosing Articles',
    done: false
  }, {
    title: 'Research &amp; Planning',
    done: false
  }, {
    title: 'Drafts &amp; Mainspace',
    done: false
  }, {
    title: 'Peer Feedback',
    done: false
  }, {
    title: 'Supplementary Assignments',
    done: false
  }, {
    title: 'DYK / GA Submission',
    done: false
  }
];

module.exports = WizardData;



},{}],6:[function(require,module,exports){
var App;

App = require('./App');

$(function() {
  return window.App = new App();
});



},{"./App":3}],7:[function(require,module,exports){
var BaseModule,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = BaseModule = (function(_super) {
  __extends(BaseModule, _super);

  function BaseModule() {
    return BaseModule.__super__.constructor.apply(this, arguments);
  }

  BaseModule.prototype.onStart = function() {
    this.mainView = new this.MainView({
      collection: this.collection
    });
    return this.region.show(this.mainView);
  };

  return BaseModule;

})(Marionette.Module);



},{}],8:[function(require,module,exports){
var BaseModule, StepModule, Steps, WizardData,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Steps = require('./collections/Steps');

BaseModule = require('../BaseModule');

WizardData = require('../../data/WizardData');

module.exports = StepModule = (function(_super) {
  __extends(StepModule, _super);

  function StepModule() {
    return StepModule.__super__.constructor.apply(this, arguments);
  }

  StepModule.prototype.initialize = function() {
    this.MainView = require('./views/StepsComposite');
    console.log('Initializing StepModule');
    this.startWithParent = true;
    this.collection = new Steps(WizardData);
    return this.app.router.processAppRoutes(this, {
      'step/:title': 'showStep'
    });
  };

  StepModule.prototype.onStart = function() {
    StepModule.__super__.onStart.call(this);
    return console.log('Starting StepModule');
  };

  StepModule.prototype.onStop = function() {
    return console.log('Stopping StepModule');
  };

  StepModule.prototype.showStep = function(text) {
    return this.collection.showStep(text);
  };

  return StepModule;

})(BaseModule);



},{"../../data/WizardData":5,"../BaseModule":7,"./collections/Steps":9,"./views/StepsComposite":12}],9:[function(require,module,exports){
var Step, Steps,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Step = require('../models/Step');

module.exports = Steps = (function(_super) {
  __extends(Steps, _super);

  function Steps() {
    return Steps.__super__.constructor.apply(this, arguments);
  }

  Steps.prototype.model = Step;

  Steps.prototype.showStep = function(title) {
    return _.each(this.where({
      title: title
    }), function(step) {
      return step.toggleActive();
    });
  };

  return Steps;

})(Backbone.Collection);



},{"../models/Step":10}],10:[function(require,module,exports){
var Step,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Step = (function(_super) {
  __extends(Step, _super);

  function Step() {
    return Step.__super__.constructor.apply(this, arguments);
  }

  Step.prototype.defaults = {
    text: '',
    done: false,
    active: false
  };

  Step.prototype.toggleActive = function() {
    return this.set('active', !this.get('active'));
  };

  return Step;

})(Backbone.Model);



},{}],11:[function(require,module,exports){
var StepView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = StepView = (function(_super) {
  __extends(StepView, _super);

  function StepView() {
    return StepView.__super__.constructor.apply(this, arguments);
  }

  StepView.prototype.template = require('./templates/step');

  StepView.prototype.className = function() {
    return 'list-group-item' + (this.model.get('active') ? ' active' : '');
  };

  StepView.prototype.ui = {
    check: '.check',
    close: '.close'
  };

  StepView.prototype.className = 'step';

  StepView.prototype.events = {
    'click @ui.check': 'toggleCheck',
    'click @ui.close': 'removeStep'
  };

  StepView.prototype.modelEvents = {
    'change:done': 'render',
    'change:active': 'stepToggled'
  };

  StepView.prototype.stepToggled = function() {
    this.$el.toggleClass('active');
    return App.vent.trigger('new:notification', "Selected/unselected step: " + this.model.get('title'));
  };

  StepView.prototype.toggleCheck = function() {
    this.model.set('done', !this.model.get('done'));
    return App.vent.trigger('new:notification', "Toggled step: " + this.model.get('title'));
  };

  StepView.prototype.removeStep = function() {
    this.model.destroy();
    return App.vent.trigger('new:notification', "Removed step: " + this.model.get('title'));
  };

  return StepView;

})(Backbone.Marionette.ItemView);



},{"./templates/step":14}],12:[function(require,module,exports){
var Step, Steps, StepsComposite,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Step = require('../models/Step');

Steps = require('../collections/Steps');

module.exports = StepsComposite = (function(_super) {
  __extends(StepsComposite, _super);

  function StepsComposite() {
    return StepsComposite.__super__.constructor.apply(this, arguments);
  }

  StepsComposite.prototype.template = require('./templates/main');

  StepsComposite.prototype.childViewContainer = "#step-list";

  StepsComposite.prototype.childView = require('./StepView');

  StepsComposite.prototype.behaviors = {
    Closeable: {}
  };

  StepsComposite.prototype.ui = {
    next: '.next'
  };

  StepsComposite.prototype.events = {
    "click @ui.next": "nextStep"
  };

  StepsComposite.prototype.nextStep = function(e) {
    e.preventDefault();
    console.log('go to next step');
    return App.vent.trigger('wizard:next');
  };

  StepsComposite.prototype.onRender = function() {
    return this.ui.next.focus();
  };

  return StepsComposite;

})(Backbone.Marionette.CompositeView);



},{"../collections/Steps":9,"../models/Step":10,"./StepView":11,"./templates/main":13}],13:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div id=\"step-list\"></div><a href=\"\" class=\"next\">Next</a>");;return buf.join("");
};
},{"jade/runtime":2}],14:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),title = locals_.title;
buf.push("<h2>" + (jade.escape(null == (jade.interp = title) ? "" : jade.interp)) + "</h2>");;return buf.join("");
};
},{"jade/runtime":2}],15:[function(require,module,exports){
var EmptyRegionView, ToggleableRegion,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

EmptyRegionView = require('../views/EmptyRegionView');

module.exports = ToggleableRegion = (function(_super) {
  __extends(ToggleableRegion, _super);

  function ToggleableRegion() {
    return ToggleableRegion.__super__.constructor.apply(this, arguments);
  }

  ToggleableRegion.prototype.initialize = function(options) {
    this.module = options.module;
    this.module.region = this;
    return this.initShow();
  };

  ToggleableRegion.prototype.initShow = function() {
    this.emptyView = new EmptyRegionView();
    return this.show(this.emptyView);
  };

  ToggleableRegion.prototype.onShow = function(view) {
    this.listenTo(view, 'region:on', (function(_this) {
      return function() {
        return _this.module.start();
      };
    })(this));
    return this.listenTo(view, 'region:off', (function(_this) {
      return function() {
        _this.module.stop();
        return _this.initShow();
      };
    })(this));
  };

  return ToggleableRegion;

})(Backbone.Marionette.Region);



},{"../views/EmptyRegionView":17}],16:[function(require,module,exports){
var AppLayout,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AppLayout = (function(_super) {
  __extends(AppLayout, _super);

  function AppLayout() {
    return AppLayout.__super__.constructor.apply(this, arguments);
  }

  AppLayout.prototype.template = require('./templates/app');

  AppLayout.prototype.el = "#app";

  return AppLayout;

})(Marionette.LayoutView);

module.exports = AppLayout;



},{"./templates/app":18}],17:[function(require,module,exports){
var EmptyRegionView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

EmptyRegionView = (function(_super) {
  __extends(EmptyRegionView, _super);

  function EmptyRegionView() {
    return EmptyRegionView.__super__.constructor.apply(this, arguments);
  }

  EmptyRegionView.prototype.template = require('./templates/emptyregion');

  EmptyRegionView.prototype.ui = {
    regionOn: '.region-on'
  };

  EmptyRegionView.prototype.triggers = {
    "click @ui.regionOn": 'region:on'
  };

  return EmptyRegionView;

})(Marionette.ItemView);

module.exports = EmptyRegionView;



},{"./templates/emptyregion":19}],18:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div><div id=\"steps\"></div></div>");;return buf.join("");
};
},{"jade/runtime":2}],19:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"module-box\"><div class=\"blank\"><button class=\"region-on btn\">Start module</button></div></div>");;return buf.join("");
};
},{"jade/runtime":2}]},{},[6])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9qYWRlL3J1bnRpbWUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9BcHAuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvYmVoYXZpb3JzL0Nsb3NlYWJsZS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9kYXRhL1dpemFyZERhdGEuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvaW5kZXguY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy9CYXNlTW9kdWxlLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZHVsZXMvc3RlcC9TdGVwTW9kdWxlLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZHVsZXMvc3RlcC9jb2xsZWN0aW9ucy9TdGVwcy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2R1bGVzL3N0ZXAvbW9kZWxzL1N0ZXAuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy9zdGVwL3ZpZXdzL1N0ZXBWaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZHVsZXMvc3RlcC92aWV3cy9TdGVwc0NvbXBvc2l0ZS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2R1bGVzL3N0ZXAvdmlld3MvdGVtcGxhdGVzL21haW4uamFkZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZHVsZXMvc3RlcC92aWV3cy90ZW1wbGF0ZXMvc3RlcC5qYWRlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvcmVnaW9ucy9Ub2dnbGVhYmxlUmVnaW9uLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL3ZpZXdzL0FwcExheW91dC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9FbXB0eVJlZ2lvblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvdGVtcGxhdGVzL2FwcC5qYWRlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvdGVtcGxhdGVzL2VtcHR5cmVnaW9uLmphZGUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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O0FBQ0UsOEJBQUEsQ0FBQTs7OztHQUFBOztBQUFBLHNCQUFBLFFBQUEsR0FBVSxPQUFBLENBQVEsaUJBQVIsQ0FBVixDQUFBOztBQUFBLHNCQUNBLEVBQUEsR0FBSSxNQURKLENBQUE7O21CQUFBOztHQURzQixVQUFVLENBQUMsV0FBbkMsQ0FBQTs7QUFBQSxNQUlNLENBQUMsT0FBUCxHQUFpQixTQUpqQixDQUFBOzs7OztBQ0FBLElBQUEsZUFBQTtFQUFBO2lTQUFBOztBQUFBO0FBQ0Usb0NBQUEsQ0FBQTs7OztHQUFBOztBQUFBLDRCQUFBLFFBQUEsR0FBVSxPQUFBLENBQVEseUJBQVIsQ0FBVixDQUFBOztBQUFBLDRCQUVBLEVBQUEsR0FDRTtBQUFBLElBQUEsUUFBQSxFQUFVLFlBQVY7R0FIRixDQUFBOztBQUFBLDRCQUtBLFFBQUEsR0FDRTtBQUFBLElBQUEsb0JBQUEsRUFBc0IsV0FBdEI7R0FORixDQUFBOzt5QkFBQTs7R0FENEIsVUFBVSxDQUFDLFNBQXpDLENBQUE7O0FBQUEsTUFTTSxDQUFDLE9BQVAsR0FBaUIsZUFUakIsQ0FBQTs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIixudWxsLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4hZnVuY3Rpb24oZSl7aWYoXCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMpbW9kdWxlLmV4cG9ydHM9ZSgpO2Vsc2UgaWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kKWRlZmluZShlKTtlbHNle3ZhciBmO1widW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/Zj13aW5kb3c6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9mPWdsb2JhbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZiYmKGY9c2VsZiksZi5qYWRlPWUoKX19KGZ1bmN0aW9uKCl7dmFyIGRlZmluZSxtb2R1bGUsZXhwb3J0cztyZXR1cm4gKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE1lcmdlIHR3byBhdHRyaWJ1dGUgb2JqZWN0cyBnaXZpbmcgcHJlY2VkZW5jZVxuICogdG8gdmFsdWVzIGluIG9iamVjdCBgYmAuIENsYXNzZXMgYXJlIHNwZWNpYWwtY2FzZWRcbiAqIGFsbG93aW5nIGZvciBhcnJheXMgYW5kIG1lcmdpbmcvam9pbmluZyBhcHByb3ByaWF0ZWx5XG4gKiByZXN1bHRpbmcgaW4gYSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGFcbiAqIEBwYXJhbSB7T2JqZWN0fSBiXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZShhLCBiKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgdmFyIGF0dHJzID0gYVswXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGF0dHJzID0gbWVyZ2UoYXR0cnMsIGFbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gYXR0cnM7XG4gIH1cbiAgdmFyIGFjID0gYVsnY2xhc3MnXTtcbiAgdmFyIGJjID0gYlsnY2xhc3MnXTtcblxuICBpZiAoYWMgfHwgYmMpIHtcbiAgICBhYyA9IGFjIHx8IFtdO1xuICAgIGJjID0gYmMgfHwgW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFjKSkgYWMgPSBbYWNdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShiYykpIGJjID0gW2JjXTtcbiAgICBhWydjbGFzcyddID0gYWMuY29uY2F0KGJjKS5maWx0ZXIobnVsbHMpO1xuICB9XG5cbiAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICBpZiAoa2V5ICE9ICdjbGFzcycpIHtcbiAgICAgIGFba2V5XSA9IGJba2V5XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYTtcbn07XG5cbi8qKlxuICogRmlsdGVyIG51bGwgYHZhbGBzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbnVsbHModmFsKSB7XG4gIHJldHVybiB2YWwgIT0gbnVsbCAmJiB2YWwgIT09ICcnO1xufVxuXG4vKipcbiAqIGpvaW4gYXJyYXkgYXMgY2xhc3Nlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmpvaW5DbGFzc2VzID0gam9pbkNsYXNzZXM7XG5mdW5jdGlvbiBqb2luQ2xhc3Nlcyh2YWwpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsKSA/IHZhbC5tYXAoam9pbkNsYXNzZXMpLmZpbHRlcihudWxscykuam9pbignICcpIDogdmFsO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgZ2l2ZW4gY2xhc3Nlcy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBjbGFzc2VzXG4gKiBAcGFyYW0ge0FycmF5LjxCb29sZWFuPn0gZXNjYXBlZFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmNscyA9IGZ1bmN0aW9uIGNscyhjbGFzc2VzLCBlc2NhcGVkKSB7XG4gIHZhciBidWYgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGFzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGVzY2FwZWQgJiYgZXNjYXBlZFtpXSkge1xuICAgICAgYnVmLnB1c2goZXhwb3J0cy5lc2NhcGUoam9pbkNsYXNzZXMoW2NsYXNzZXNbaV1dKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBidWYucHVzaChqb2luQ2xhc3NlcyhjbGFzc2VzW2ldKSk7XG4gICAgfVxuICB9XG4gIHZhciB0ZXh0ID0gam9pbkNsYXNzZXMoYnVmKTtcbiAgaWYgKHRleHQubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcgY2xhc3M9XCInICsgdGV4dCArICdcIic7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciB0aGUgZ2l2ZW4gYXR0cmlidXRlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZXNjYXBlZFxuICogQHBhcmFtIHtCb29sZWFufSB0ZXJzZVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmF0dHIgPSBmdW5jdGlvbiBhdHRyKGtleSwgdmFsLCBlc2NhcGVkLCB0ZXJzZSkge1xuICBpZiAoJ2Jvb2xlYW4nID09IHR5cGVvZiB2YWwgfHwgbnVsbCA9PSB2YWwpIHtcbiAgICBpZiAodmFsKSB7XG4gICAgICByZXR1cm4gJyAnICsgKHRlcnNlID8ga2V5IDoga2V5ICsgJz1cIicgKyBrZXkgKyAnXCInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfSBlbHNlIGlmICgwID09IGtleS5pbmRleE9mKCdkYXRhJykgJiYgJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkge1xuICAgIHJldHVybiAnICcgKyBrZXkgKyBcIj0nXCIgKyBKU09OLnN0cmluZ2lmeSh2YWwpLnJlcGxhY2UoLycvZywgJyZhcG9zOycpICsgXCInXCI7XG4gIH0gZWxzZSBpZiAoZXNjYXBlZCkge1xuICAgIHJldHVybiAnICcgKyBrZXkgKyAnPVwiJyArIGV4cG9ydHMuZXNjYXBlKHZhbCkgKyAnXCInO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnICcgKyBrZXkgKyAnPVwiJyArIHZhbCArICdcIic7XG4gIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIHRoZSBnaXZlbiBhdHRyaWJ1dGVzIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge09iamVjdH0gZXNjYXBlZFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmF0dHJzID0gZnVuY3Rpb24gYXR0cnMob2JqLCB0ZXJzZSl7XG4gIHZhciBidWYgPSBbXTtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG5cbiAgaWYgKGtleXMubGVuZ3RoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXVxuICAgICAgICAsIHZhbCA9IG9ialtrZXldO1xuXG4gICAgICBpZiAoJ2NsYXNzJyA9PSBrZXkpIHtcbiAgICAgICAgaWYgKHZhbCA9IGpvaW5DbGFzc2VzKHZhbCkpIHtcbiAgICAgICAgICBidWYucHVzaCgnICcgKyBrZXkgKyAnPVwiJyArIHZhbCArICdcIicpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidWYucHVzaChleHBvcnRzLmF0dHIoa2V5LCB2YWwsIGZhbHNlLCB0ZXJzZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYuam9pbignJyk7XG59O1xuXG4vKipcbiAqIEVzY2FwZSB0aGUgZ2l2ZW4gc3RyaW5nIG9mIGBodG1sYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5lc2NhcGUgPSBmdW5jdGlvbiBlc2NhcGUoaHRtbCl7XG4gIHZhciByZXN1bHQgPSBTdHJpbmcoaHRtbClcbiAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgaWYgKHJlc3VsdCA9PT0gJycgKyBodG1sKSByZXR1cm4gaHRtbDtcbiAgZWxzZSByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBSZS10aHJvdyB0aGUgZ2l2ZW4gYGVycmAgaW4gY29udGV4dCB0byB0aGVcbiAqIHRoZSBqYWRlIGluIGBmaWxlbmFtZWAgYXQgdGhlIGdpdmVuIGBsaW5lbm9gLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtTdHJpbmd9IGZpbGVuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gbGluZW5vXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnJldGhyb3cgPSBmdW5jdGlvbiByZXRocm93KGVyciwgZmlsZW5hbWUsIGxpbmVubywgc3RyKXtcbiAgaWYgKCEoZXJyIGluc3RhbmNlb2YgRXJyb3IpKSB0aHJvdyBlcnI7XG4gIGlmICgodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyB8fCAhZmlsZW5hbWUpICYmICFzdHIpIHtcbiAgICBlcnIubWVzc2FnZSArPSAnIG9uIGxpbmUgJyArIGxpbmVubztcbiAgICB0aHJvdyBlcnI7XG4gIH1cbiAgdHJ5IHtcbiAgICBzdHIgPSAgc3RyIHx8IHJlcXVpcmUoJ2ZzJykucmVhZEZpbGVTeW5jKGZpbGVuYW1lLCAndXRmOCcpXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0aHJvdyhlcnIsIG51bGwsIGxpbmVubylcbiAgfVxuICB2YXIgY29udGV4dCA9IDNcbiAgICAsIGxpbmVzID0gc3RyLnNwbGl0KCdcXG4nKVxuICAgICwgc3RhcnQgPSBNYXRoLm1heChsaW5lbm8gLSBjb250ZXh0LCAwKVxuICAgICwgZW5kID0gTWF0aC5taW4obGluZXMubGVuZ3RoLCBsaW5lbm8gKyBjb250ZXh0KTtcblxuICAvLyBFcnJvciBjb250ZXh0XG4gIHZhciBjb250ZXh0ID0gbGluZXMuc2xpY2Uoc3RhcnQsIGVuZCkubWFwKGZ1bmN0aW9uKGxpbmUsIGkpe1xuICAgIHZhciBjdXJyID0gaSArIHN0YXJ0ICsgMTtcbiAgICByZXR1cm4gKGN1cnIgPT0gbGluZW5vID8gJyAgPiAnIDogJyAgICAnKVxuICAgICAgKyBjdXJyXG4gICAgICArICd8ICdcbiAgICAgICsgbGluZTtcbiAgfSkuam9pbignXFxuJyk7XG5cbiAgLy8gQWx0ZXIgZXhjZXB0aW9uIG1lc3NhZ2VcbiAgZXJyLnBhdGggPSBmaWxlbmFtZTtcbiAgZXJyLm1lc3NhZ2UgPSAoZmlsZW5hbWUgfHwgJ0phZGUnKSArICc6JyArIGxpbmVub1xuICAgICsgJ1xcbicgKyBjb250ZXh0ICsgJ1xcblxcbicgKyBlcnIubWVzc2FnZTtcbiAgdGhyb3cgZXJyO1xufTtcblxufSx7XCJmc1wiOjJ9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblxufSx7fV19LHt9LFsxXSlcbigxKVxufSk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIk1hcmlvbmV0dGUuQmVoYXZpb3JzLmJlaGF2aW9yc0xvb2t1cCA9IC0+XG4gIHdpbmRvdy5CZWhhdmlvcnNcblxud2luZG93LkJlaGF2aW9ycyA9IHt9XG53aW5kb3cuQmVoYXZpb3JzLkNsb3NlYWJsZSA9IHJlcXVpcmUgJy4vYmVoYXZpb3JzL0Nsb3NlYWJsZSdcblxuVG9nZ2xlYWJsZVJlZ2lvbiA9IHJlcXVpcmUgJy4vcmVnaW9ucy9Ub2dnbGVhYmxlUmVnaW9uJ1xuQXBwTGF5b3V0ID0gcmVxdWlyZSAnLi92aWV3cy9BcHBMYXlvdXQnXG5TdGVwTW9kdWxlID0gcmVxdWlyZSgnLi9tb2R1bGVzL3N0ZXAvU3RlcE1vZHVsZScpXG5cblxuY2xhc3MgQXBwIGV4dGVuZHMgQmFja2JvbmUuTWFyaW9uZXR0ZS5BcHBsaWNhdGlvblxuICBpbml0aWFsaXplOiA9PlxuICAgIGNvbnNvbGUubG9nICdJbml0aWFsaXppbmcgYXBwLi4uJ1xuXG4gICAgQHJvdXRlciA9IG5ldyBCYWNrYm9uZS5NYXJpb25ldHRlLkFwcFJvdXRlcigpXG5cbiAgICBAYWRkSW5pdGlhbGl6ZXIoIChvcHRpb25zKSA9PlxuICAgICAgKG5ldyBBcHBMYXlvdXQoKSkucmVuZGVyKClcbiAgICApXG5cbiAgICBAYWRkSW5pdGlhbGl6ZXIoIChvcHRpb25zKSA9PlxuICAgICAgQGFkZFJlZ2lvbnMoeyBcbiAgICAgICAgc3RlcFJlZ2lvbjoge1xuICAgICAgICAgIHNlbGVjdG9yOiBcIiNzdGVwc1wiXG4gICAgICAgICAgcmVnaW9uQ2xhc3M6IFRvZ2dsZWFibGVSZWdpb25cbiAgICAgICAgICBtb2R1bGU6IEBzdWJtb2R1bGVzLlN0ZXBcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApXG5cbiAgICBAYWRkSW5pdGlhbGl6ZXIoIChvcHRpb25zKSA9PlxuICAgICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCgpXG4gICAgICBjb25zb2xlLmxvZyBCYWNrYm9uZS5oaXN0b3J5XG4gICAgKVxuXG5cbiAgICBAbW9kdWxlKCdTdGVwJywgU3RlcE1vZHVsZSlcblxuXG5cbiAgICBAc3RhcnQoe30pXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwXG4iLCJjbGFzcyBDbG9zZWFibGUgZXh0ZW5kcyBNYXJpb25ldHRlLkJlaGF2aW9yXG5cbiAgdWk6XG4gICAgY2xvc2U6ICdidXR0b24uY2xvc2UnXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayBAdWkuY2xvc2UnOiAnY2xvc2VDbGlja2VkJ1xuXG4gIGNsb3NlQ2xpY2tlZDogLT5cbiAgICBAdmlldy50cmlnZ2VyICdyZWdpb246b2ZmJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3NlYWJsZSIsIldpemFyZERhdGEgPSBbXG4gIHtcbiAgICB0aXRsZTogJ1dlbGNvbWUnXG4gICAgZG9uZTogZmFsc2VcbiAgfVxuICB7XG4gICAgdGl0bGU6ICdDaG9vc2UgQXNzaWdubWVudCBUeXBlJ1xuICAgIGRvbmU6IGZhbHNlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnTGVhcm5pbmcgV2lraSBFc3NlbnRpYWxzJ1xuICAgIGRvbmU6IGZhbHNlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnR2V0dGluZyBTdGFydGVkIHdpdGggRWRpdGluZydcbiAgICBkb25lOiBmYWxzZVxuICB9XG4gIHtcbiAgICB0aXRsZTogJ0Nob29zaW5nIEFydGljbGVzJ1xuICAgIGRvbmU6IGZhbHNlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnUmVzZWFyY2ggJmFtcDsgUGxhbm5pbmcnXG4gICAgZG9uZTogZmFsc2VcbiAgfVxuICB7XG4gICAgdGl0bGU6ICdEcmFmdHMgJmFtcDsgTWFpbnNwYWNlJ1xuICAgIGRvbmU6IGZhbHNlXG4gIH1cbiAge1xuICAgIHRpdGxlOiAnUGVlciBGZWVkYmFjaydcbiAgICBkb25lOiBmYWxzZVxuICB9XG4gIHtcbiAgICB0aXRsZTogJ1N1cHBsZW1lbnRhcnkgQXNzaWdubWVudHMnXG4gICAgZG9uZTogZmFsc2VcbiAgfVxuICB7XG4gICAgdGl0bGU6ICdEWUsgLyBHQSBTdWJtaXNzaW9uJ1xuICAgIGRvbmU6IGZhbHNlXG4gIH1cbiAgXG5dXG5cbm1vZHVsZS5leHBvcnRzID0gV2l6YXJkRGF0YSIsIkFwcCA9IHJlcXVpcmUoJy4vQXBwJylcblxuJCAtPlxuICB3aW5kb3cuQXBwID0gbmV3IEFwcCgpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEJhc2VNb2R1bGUgZXh0ZW5kcyBNYXJpb25ldHRlLk1vZHVsZVxuICBvblN0YXJ0OiAtPlxuICAgIEBtYWluVmlldyA9IG5ldyBATWFpblZpZXcoY29sbGVjdGlvbjogQGNvbGxlY3Rpb24pXG4gICAgQHJlZ2lvbi5zaG93KEBtYWluVmlldylcbiIsIlN0ZXBzID0gcmVxdWlyZSAnLi9jb2xsZWN0aW9ucy9TdGVwcydcbkJhc2VNb2R1bGUgPSByZXF1aXJlICcuLi9CYXNlTW9kdWxlJ1xuV2l6YXJkRGF0YSA9IHJlcXVpcmUoJy4uLy4uL2RhdGEvV2l6YXJkRGF0YScpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcE1vZHVsZSBleHRlbmRzIEJhc2VNb2R1bGVcbiAgaW5pdGlhbGl6ZTogLT5cbiAgICBATWFpblZpZXcgPSByZXF1aXJlICcuL3ZpZXdzL1N0ZXBzQ29tcG9zaXRlJ1xuXG4gICAgY29uc29sZS5sb2cgJ0luaXRpYWxpemluZyBTdGVwTW9kdWxlJ1xuICAgIEBzdGFydFdpdGhQYXJlbnQgPSB0cnVlXG5cbiAgICBAY29sbGVjdGlvbiA9IG5ldyBTdGVwcyhXaXphcmREYXRhKVxuXG4gICAgQGFwcC5yb3V0ZXIucHJvY2Vzc0FwcFJvdXRlcyBALCB7XG4gICAgICAnc3RlcC86dGl0bGUnOiAnc2hvd1N0ZXAnXG4gICAgfVxuXG4gIG9uU3RhcnQ6IC0+XG4gICAgc3VwZXIoKVxuICAgIGNvbnNvbGUubG9nICdTdGFydGluZyBTdGVwTW9kdWxlJ1xuXG4gIG9uU3RvcDogLT5cbiAgICBjb25zb2xlLmxvZyAnU3RvcHBpbmcgU3RlcE1vZHVsZSdcblxuICBzaG93U3RlcDogKHRleHQpIC0+XG4gICAgQGNvbGxlY3Rpb24uc2hvd1N0ZXAodGV4dClcbiIsIlN0ZXAgPSByZXF1aXJlKCcuLi9tb2RlbHMvU3RlcCcpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcHMgZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uXG4gIG1vZGVsOiBTdGVwXG5cbiAgc2hvd1N0ZXA6ICh0aXRsZSkgLT5cbiAgICBfLmVhY2ggQHdoZXJlKHRpdGxlOiB0aXRsZSksIChzdGVwKSAtPlxuICAgICAgc3RlcC50b2dnbGVBY3RpdmUoKVxuIiwibW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwIGV4dGVuZHMgQmFja2JvbmUuTW9kZWxcbiAgZGVmYXVsdHM6XG4gICAgdGV4dDogJydcbiAgICBkb25lOiBmYWxzZVxuICAgIGFjdGl2ZTogZmFsc2VcblxuICB0b2dnbGVBY3RpdmU6IC0+XG4gICAgQHNldCAnYWN0aXZlJywgIUBnZXQoJ2FjdGl2ZScpXG5cblxuIiwibW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBTdGVwVmlldyBleHRlbmRzIEJhY2tib25lLk1hcmlvbmV0dGUuSXRlbVZpZXdcbiAgdGVtcGxhdGU6IHJlcXVpcmUgJy4vdGVtcGxhdGVzL3N0ZXAnXG4gIGNsYXNzTmFtZTogLT5cbiAgICAnbGlzdC1ncm91cC1pdGVtJyArIGlmIEBtb2RlbC5nZXQoJ2FjdGl2ZScpIHRoZW4gJyBhY3RpdmUnIGVsc2UgJydcblxuICB1aTpcbiAgICBjaGVjazogJy5jaGVjaydcbiAgICBjbG9zZTogJy5jbG9zZSdcblxuICBjbGFzc05hbWU6ICdzdGVwJ1xuXG4gIGV2ZW50czpcbiAgICAnY2xpY2sgQHVpLmNoZWNrJzogJ3RvZ2dsZUNoZWNrJ1xuICAgICdjbGljayBAdWkuY2xvc2UnOiAncmVtb3ZlU3RlcCdcblxuICBtb2RlbEV2ZW50czpcbiAgICAnY2hhbmdlOmRvbmUnOiAncmVuZGVyJ1xuICAgICdjaGFuZ2U6YWN0aXZlJzogJ3N0ZXBUb2dnbGVkJ1xuXG4gIHN0ZXBUb2dnbGVkOiAtPlxuICAgIEAkZWwudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgQXBwLnZlbnQudHJpZ2dlciAnbmV3Om5vdGlmaWNhdGlvbicsIFwiU2VsZWN0ZWQvdW5zZWxlY3RlZCBzdGVwOiBcIiArIEBtb2RlbC5nZXQoJ3RpdGxlJylcblxuICB0b2dnbGVDaGVjazogLT5cbiAgICBAbW9kZWwuc2V0KCdkb25lJywgIUBtb2RlbC5nZXQoJ2RvbmUnKSlcbiAgICBBcHAudmVudC50cmlnZ2VyICduZXc6bm90aWZpY2F0aW9uJywgXCJUb2dnbGVkIHN0ZXA6IFwiICsgQG1vZGVsLmdldCgndGl0bGUnKVxuXG4gIHJlbW92ZVN0ZXA6IC0+XG4gICAgQG1vZGVsLmRlc3Ryb3koKVxuICAgIEFwcC52ZW50LnRyaWdnZXIgJ25ldzpub3RpZmljYXRpb24nLCBcIlJlbW92ZWQgc3RlcDogXCIgKyBAbW9kZWwuZ2V0KCd0aXRsZScpXG4iLCJTdGVwID0gcmVxdWlyZSgnLi4vbW9kZWxzL1N0ZXAnKVxuU3RlcHMgPSByZXF1aXJlKCcuLi9jb2xsZWN0aW9ucy9TdGVwcycpXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgU3RlcHNDb21wb3NpdGUgZXh0ZW5kcyBCYWNrYm9uZS5NYXJpb25ldHRlLkNvbXBvc2l0ZVZpZXdcbiAgdGVtcGxhdGU6IHJlcXVpcmUgJy4vdGVtcGxhdGVzL21haW4nXG4gIGNoaWxkVmlld0NvbnRhaW5lcjogXCIjc3RlcC1saXN0XCJcbiAgY2hpbGRWaWV3OiByZXF1aXJlKCcuL1N0ZXBWaWV3JylcblxuICBiZWhhdmlvcnM6XG4gICAgQ2xvc2VhYmxlOiB7fVxuXG4gIHVpOlxuICAgIG5leHQ6ICcubmV4dCdcblxuICBldmVudHM6XG4gICAgXCJjbGljayBAdWkubmV4dFwiOiBcIm5leHRTdGVwXCJcblxuICBuZXh0U3RlcDogKGUpIC0+XG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgY29uc29sZS5sb2cgJ2dvIHRvIG5leHQgc3RlcCdcbiAgICBBcHAudmVudC50cmlnZ2VyICd3aXphcmQ6bmV4dCdcblxuICBvblJlbmRlcjogLT5cbiAgICBAdWkubmV4dC5mb2N1cygpXG4iLCJ2YXIgamFkZSA9IHJlcXVpcmUoXCJqYWRlL3J1bnRpbWVcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGVtcGxhdGUobG9jYWxzKSB7XG52YXIgYnVmID0gW107XG52YXIgamFkZV9taXhpbnMgPSB7fTtcblxuYnVmLnB1c2goXCI8ZGl2IGlkPVxcXCJzdGVwLWxpc3RcXFwiPjwvZGl2PjxhIGhyZWY9XFxcIlxcXCIgY2xhc3M9XFxcIm5leHRcXFwiPk5leHQ8L2E+XCIpOztyZXR1cm4gYnVmLmpvaW4oXCJcIik7XG59OyIsInZhciBqYWRlID0gcmVxdWlyZShcImphZGUvcnVudGltZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0ZW1wbGF0ZShsb2NhbHMpIHtcbnZhciBidWYgPSBbXTtcbnZhciBqYWRlX21peGlucyA9IHt9O1xudmFyIGxvY2Fsc18gPSAobG9jYWxzIHx8IHt9KSx0aXRsZSA9IGxvY2Fsc18udGl0bGU7XG5idWYucHVzaChcIjxoMj5cIiArIChqYWRlLmVzY2FwZShudWxsID09IChqYWRlLmludGVycCA9IHRpdGxlKSA/IFwiXCIgOiBqYWRlLmludGVycCkpICsgXCI8L2gyPlwiKTs7cmV0dXJuIGJ1Zi5qb2luKFwiXCIpO1xufTsiLCJFbXB0eVJlZ2lvblZpZXcgPSByZXF1aXJlICcuLi92aWV3cy9FbXB0eVJlZ2lvblZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVG9nZ2xlYWJsZVJlZ2lvbiBleHRlbmRzIEJhY2tib25lLk1hcmlvbmV0dGUuUmVnaW9uXG4gIGluaXRpYWxpemU6IChvcHRpb25zKSAtPlxuICAgIEBtb2R1bGUgPSBvcHRpb25zLm1vZHVsZVxuICAgIEBtb2R1bGUucmVnaW9uID0gQFxuXG4gICAgQGluaXRTaG93KClcblxuICBpbml0U2hvdzogLT5cbiAgICBAZW1wdHlWaWV3ID0gbmV3IEVtcHR5UmVnaW9uVmlldygpXG4gICAgQHNob3coQGVtcHR5VmlldylcblxuICBvblNob3c6ICh2aWV3KSAtPlxuICAgIEBsaXN0ZW5UbyB2aWV3LCAncmVnaW9uOm9uJywgPT5cbiAgICAgIEBtb2R1bGUuc3RhcnQoKVxuXG4gICAgQGxpc3RlblRvIHZpZXcsICdyZWdpb246b2ZmJywgPT5cbiAgICAgIEBtb2R1bGUuc3RvcCgpXG4gICAgICBAaW5pdFNob3coKSIsImNsYXNzIEFwcExheW91dCBleHRlbmRzIE1hcmlvbmV0dGUuTGF5b3V0Vmlld1xuICB0ZW1wbGF0ZTogcmVxdWlyZSAnLi90ZW1wbGF0ZXMvYXBwJ1xuICBlbDogXCIjYXBwXCJcblxubW9kdWxlLmV4cG9ydHMgPSBBcHBMYXlvdXQiLCJjbGFzcyBFbXB0eVJlZ2lvblZpZXcgZXh0ZW5kcyBNYXJpb25ldHRlLkl0ZW1WaWV3XG4gIHRlbXBsYXRlOiByZXF1aXJlICcuL3RlbXBsYXRlcy9lbXB0eXJlZ2lvbidcblxuICB1aTpcbiAgICByZWdpb25PbjogJy5yZWdpb24tb24nXG5cbiAgdHJpZ2dlcnM6XG4gICAgXCJjbGljayBAdWkucmVnaW9uT25cIjogJ3JlZ2lvbjpvbidcblxubW9kdWxlLmV4cG9ydHMgPSBFbXB0eVJlZ2lvblZpZXciLCJ2YXIgamFkZSA9IHJlcXVpcmUoXCJqYWRlL3J1bnRpbWVcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gdGVtcGxhdGUobG9jYWxzKSB7XG52YXIgYnVmID0gW107XG52YXIgamFkZV9taXhpbnMgPSB7fTtcblxuYnVmLnB1c2goXCI8ZGl2PjxkaXYgaWQ9XFxcInN0ZXBzXFxcIj48L2Rpdj48L2Rpdj5cIik7O3JldHVybiBidWYuam9pbihcIlwiKTtcbn07IiwidmFyIGphZGUgPSByZXF1aXJlKFwiamFkZS9ydW50aW1lXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRlbXBsYXRlKGxvY2Fscykge1xudmFyIGJ1ZiA9IFtdO1xudmFyIGphZGVfbWl4aW5zID0ge307XG5cbmJ1Zi5wdXNoKFwiPGRpdiBjbGFzcz1cXFwibW9kdWxlLWJveFxcXCI+PGRpdiBjbGFzcz1cXFwiYmxhbmtcXFwiPjxidXR0b24gY2xhc3M9XFxcInJlZ2lvbi1vbiBidG5cXFwiPlN0YXJ0IG1vZHVsZTwvYnV0dG9uPjwvZGl2PjwvZGl2PlwiKTs7cmV0dXJuIGJ1Zi5qb2luKFwiXCIpO1xufTsiXX0=
