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
var App, AppView, TodoModule, ToggleableRegion,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Marionette.Behaviors.behaviorsLookup = function() {
  return window.Behaviors;
};

window.Behaviors = {};

window.Behaviors.Closeable = require('./behaviors/Closeable');

ToggleableRegion = require('./regions/ToggleableRegion');

AppView = require('./views/AppView');

TodoModule = require('./modules/todo/TodoModule');

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
        return (new AppView()).render();
      };
    })(this));
    this.addInitializer((function(_this) {
      return function(options) {
        return _this.addRegions({
          todoRegion: {
            selector: "#todos",
            regionClass: ToggleableRegion,
            module: _this.submodules.Todo
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
    this.module('Todo', TodoModule);
    return this.start();
  };

  return App;

})(Backbone.Marionette.Application);

module.exports = App;



},{"./behaviors/Closeable":4,"./modules/todo/TodoModule":7,"./regions/ToggleableRegion":14,"./views/AppView":15}],4:[function(require,module,exports){
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
var App;

App = require('./app');

$(function() {
  return window.App = new App();
});



},{"./app":3}],6:[function(require,module,exports){
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



},{}],7:[function(require,module,exports){
var BaseModule, TodoModule, Todos,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Todos = require('./collections/Todos');

BaseModule = require('../BaseModule');

module.exports = TodoModule = (function(_super) {
  __extends(TodoModule, _super);

  function TodoModule() {
    return TodoModule.__super__.constructor.apply(this, arguments);
  }

  TodoModule.prototype.initialize = function() {
    this.MainView = require('./views/MainView');
    console.log('Initializing TodoModule');
    this.startWithParent = true;
    this.collection = new Todos([
      {
        text: "Wash dishes",
        done: false
      }, {
        text: "Learn Marionette.js",
        done: true
      }
    ]);
    return this.app.router.processAppRoutes(this, {
      'todo/:text': 'showTodo'
    });
  };

  TodoModule.prototype.onStart = function() {
    TodoModule.__super__.onStart.call(this);
    return console.log('Starting TodoModule');
  };

  TodoModule.prototype.onStop = function() {
    return console.log('Stopping TodoModule');
  };

  TodoModule.prototype.showTodo = function(text) {
    return this.collection.showTodo(text);
  };

  return TodoModule;

})(BaseModule);



},{"../BaseModule":6,"./collections/Todos":8,"./views/MainView":10}],8:[function(require,module,exports){
var Todo, Todos,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Todo = require('../models/Todo');

module.exports = Todos = (function(_super) {
  __extends(Todos, _super);

  function Todos() {
    return Todos.__super__.constructor.apply(this, arguments);
  }

  Todos.prototype.model = Todo;

  Todos.prototype.showTodo = function(text) {
    return _.each(this.where({
      text: text
    }), function(todo) {
      return todo.toggleActive();
    });
  };

  return Todos;

})(Backbone.Collection);



},{"../models/Todo":9}],9:[function(require,module,exports){
var Todo,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = Todo = (function(_super) {
  __extends(Todo, _super);

  function Todo() {
    return Todo.__super__.constructor.apply(this, arguments);
  }

  Todo.prototype.defaults = {
    text: '',
    done: false,
    active: false
  };

  Todo.prototype.toggleActive = function() {
    return this.collection.each((function(_this) {
      return function(todo) {
        if (todo !== _this) {
          return todo.set('active', false);
        } else {
          return _this.set('active', !_this.get('active'));
        }
      };
    })(this));
  };

  return Todo;

})(Backbone.Model);



},{}],10:[function(require,module,exports){
var MainView, Todo, Todos,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

Todo = require('../models/Todo');

Todos = require('../collections/Todos');

module.exports = MainView = (function(_super) {
  __extends(MainView, _super);

  function MainView() {
    return MainView.__super__.constructor.apply(this, arguments);
  }

  MainView.prototype.template = require('./templates/main');

  MainView.prototype.childViewContainer = "#todo-list";

  MainView.prototype.childView = require('./TodoView');

  MainView.prototype.behaviors = {
    Closeable: {}
  };

  MainView.prototype.ui = {
    form: 'form#new-todo',
    input: 'form#new-todo input'
  };

  MainView.prototype.events = {
    "submit @ui.form": "addTodo"
  };

  MainView.prototype.addTodo = function(e) {
    var data;
    e.preventDefault();
    data = Backbone.Syphon.serialize(this);
    this.collection.add(new Todo({
      text: data.todo
    }));
    this.render();
    return App.vent.trigger('new:notification', "Added todo: " + data.todo);
  };

  MainView.prototype.onRender = function() {
    return this.ui.input.focus();
  };

  return MainView;

})(Backbone.Marionette.CompositeView);



},{"../collections/Todos":8,"../models/Todo":9,"./TodoView":11,"./templates/main":12}],11:[function(require,module,exports){
var TodoView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

module.exports = TodoView = (function(_super) {
  __extends(TodoView, _super);

  function TodoView() {
    return TodoView.__super__.constructor.apply(this, arguments);
  }

  TodoView.prototype.template = require('./templates/todo');

  TodoView.prototype.className = function() {
    return 'list-group-item' + (this.model.get('active') ? ' active' : '');
  };

  TodoView.prototype.ui = {
    check: '.check',
    close: '.close'
  };

  TodoView.prototype.events = {
    'click @ui.check': 'toggleCheck',
    'click @ui.close': 'removeTodo'
  };

  TodoView.prototype.modelEvents = {
    'change:done': 'render',
    'change:active': 'todoToggled'
  };

  TodoView.prototype.todoToggled = function() {
    this.$el.toggleClass('active');
    return App.vent.trigger('new:notification', "Selected/unselected todo: " + this.model.get('text'));
  };

  TodoView.prototype.toggleCheck = function() {
    this.model.set('done', !this.model.get('done'));
    return App.vent.trigger('new:notification', "Toggled todo: " + this.model.get('text'));
  };

  TodoView.prototype.removeTodo = function() {
    this.model.destroy();
    return App.vent.trigger('new:notification', "Removed todo: " + this.model.get('text'));
  };

  return TodoView;

})(Backbone.Marionette.ItemView);



},{"./templates/todo":13}],12:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),action = locals_.action;
buf.push("<div class=\"panel panel-default\"><div class=\"panel-heading\">Todo list<button class=\"close\">&times;" + (jade.escape(null == (jade.interp = action) ? "" : jade.interp)) + "</button></div><div class=\"panel-body\"><div id=\"todo-list\" class=\"list-group\"></div><form id=\"new-todo\"><input type=\"text\" name=\"todo\" placeholder=\"enter a new todo and press ENTER\" autofocus=\"autofocus\" class=\"form-control\"/></form></div></div>");;return buf.join("");
};
},{"jade/runtime":2}],13:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var locals_ = (locals || {}),done = locals_.done,text = locals_.text;
if ( done)
{
buf.push("<div class=\"check fa fa-check-square-o fa-fw\"></div>");
}
else
{
buf.push("<div class=\"check fa fa-square-o fa-fw\"></div>");
}
buf.push("<a" + (jade.attr("href", '#todo/'+text, true, false)) + (jade.cls(['text',done?' checked':''], [null,true])) + ">" + (jade.escape(null == (jade.interp = text) ? "" : jade.interp)) + "</a><span class=\"close\">&times;</span>");;return buf.join("");
};
},{"jade/runtime":2}],14:[function(require,module,exports){
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



},{"../views/EmptyRegionView":16}],15:[function(require,module,exports){
var AppView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

AppView = (function(_super) {
  __extends(AppView, _super);

  function AppView() {
    return AppView.__super__.constructor.apply(this, arguments);
  }

  AppView.prototype.template = require('./templates/app');

  AppView.prototype.el = "#app";

  return AppView;

})(Marionette.LayoutView);

module.exports = AppView;



},{"./templates/app":17}],16:[function(require,module,exports){
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



},{"./templates/emptyregion":18}],17:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"row\"><div id=\"notifications\"></div></div><div class=\"row\"><div id=\"todos\"></div></div>");;return buf.join("");
};
},{"jade/runtime":2}],18:[function(require,module,exports){
var jade = require("jade/runtime");

module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};

buf.push("<div class=\"module-box\"><div class=\"blank\"><button class=\"region-on btn\">Start module</button></div></div>");;return buf.join("");
};
},{"jade/runtime":2}]},{},[5])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvbm9kZV9tb2R1bGVzL2d1bHAtYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L2xpYi9fZW1wdHkuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L25vZGVfbW9kdWxlcy9qYWRlL3J1bnRpbWUuanMiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9hcHAuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvYmVoYXZpb3JzL0Nsb3NlYWJsZS5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9pbmRleC5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2R1bGVzL0Jhc2VNb2R1bGUuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy90b2RvL1RvZG9Nb2R1bGUuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy90b2RvL2NvbGxlY3Rpb25zL1RvZG9zLmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZHVsZXMvdG9kby9tb2RlbHMvVG9kby5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9tb2R1bGVzL3RvZG8vdmlld3MvTWFpblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy90b2RvL3ZpZXdzL1RvZG9WaWV3LmNvZmZlZSIsIi9Vc2Vycy9rZXZpbmJsZWljaC9Eb2N1bWVudHMvd2ludHIyMDE0L3dpa2llZHUvc291cmNlL2phdmFzY3JpcHRzL21vZHVsZXMvdG9kby92aWV3cy90ZW1wbGF0ZXMvbWFpbi5qYWRlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvbW9kdWxlcy90b2RvL3ZpZXdzL3RlbXBsYXRlcy90b2RvLmphZGUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy9yZWdpb25zL1RvZ2dsZWFibGVSZWdpb24uY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvQXBwVmlldy5jb2ZmZWUiLCIvVXNlcnMva2V2aW5ibGVpY2gvRG9jdW1lbnRzL3dpbnRyMjAxNC93aWtpZWR1L3NvdXJjZS9qYXZhc2NyaXB0cy92aWV3cy9FbXB0eVJlZ2lvblZpZXcuY29mZmVlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvdGVtcGxhdGVzL2FwcC5qYWRlIiwiL1VzZXJzL2tldmluYmxlaWNoL0RvY3VtZW50cy93aW50cjIwMTQvd2lraWVkdS9zb3VyY2UvamF2YXNjcmlwdHMvdmlld3MvdGVtcGxhdGVzL2VtcHR5cmVnaW9uLmphZGUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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LFFBQUEsR0FBVSxPQUFBLENBQVEseUJBQVIsQ0FBVixDQUFBOztBQUFBLDRCQUVBLEVBQUEsR0FDRTtBQUFBLElBQUEsUUFBQSxFQUFVLFlBQVY7R0FIRixDQUFBOztBQUFBLDRCQUtBLFFBQUEsR0FDRTtBQUFBLElBQUEsb0JBQUEsRUFBc0IsV0FBdEI7R0FORixDQUFBOzt5QkFBQTs7R0FENEIsVUFBVSxDQUFDLFNBQXpDLENBQUE7O0FBQUEsTUFTTSxDQUFDLE9BQVAsR0FBaUIsZUFUakIsQ0FBQTs7Ozs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIixudWxsLCIoZnVuY3Rpb24gKGdsb2JhbCl7XG4hZnVuY3Rpb24oZSl7aWYoXCJvYmplY3RcIj09dHlwZW9mIGV4cG9ydHMpbW9kdWxlLmV4cG9ydHM9ZSgpO2Vsc2UgaWYoXCJmdW5jdGlvblwiPT10eXBlb2YgZGVmaW5lJiZkZWZpbmUuYW1kKWRlZmluZShlKTtlbHNle3ZhciBmO1widW5kZWZpbmVkXCIhPXR5cGVvZiB3aW5kb3c/Zj13aW5kb3c6XCJ1bmRlZmluZWRcIiE9dHlwZW9mIGdsb2JhbD9mPWdsb2JhbDpcInVuZGVmaW5lZFwiIT10eXBlb2Ygc2VsZiYmKGY9c2VsZiksZi5qYWRlPWUoKX19KGZ1bmN0aW9uKCl7dmFyIGRlZmluZSxtb2R1bGUsZXhwb3J0cztyZXR1cm4gKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkoezE6W2Z1bmN0aW9uKHJlcXVpcmUsbW9kdWxlLGV4cG9ydHMpe1xuJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIE1lcmdlIHR3byBhdHRyaWJ1dGUgb2JqZWN0cyBnaXZpbmcgcHJlY2VkZW5jZVxuICogdG8gdmFsdWVzIGluIG9iamVjdCBgYmAuIENsYXNzZXMgYXJlIHNwZWNpYWwtY2FzZWRcbiAqIGFsbG93aW5nIGZvciBhcnJheXMgYW5kIG1lcmdpbmcvam9pbmluZyBhcHByb3ByaWF0ZWx5XG4gKiByZXN1bHRpbmcgaW4gYSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGFcbiAqIEBwYXJhbSB7T2JqZWN0fSBiXG4gKiBAcmV0dXJuIHtPYmplY3R9IGFcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmV4cG9ydHMubWVyZ2UgPSBmdW5jdGlvbiBtZXJnZShhLCBiKSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgdmFyIGF0dHJzID0gYVswXTtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGEubGVuZ3RoOyBpKyspIHtcbiAgICAgIGF0dHJzID0gbWVyZ2UoYXR0cnMsIGFbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gYXR0cnM7XG4gIH1cbiAgdmFyIGFjID0gYVsnY2xhc3MnXTtcbiAgdmFyIGJjID0gYlsnY2xhc3MnXTtcblxuICBpZiAoYWMgfHwgYmMpIHtcbiAgICBhYyA9IGFjIHx8IFtdO1xuICAgIGJjID0gYmMgfHwgW107XG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGFjKSkgYWMgPSBbYWNdO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShiYykpIGJjID0gW2JjXTtcbiAgICBhWydjbGFzcyddID0gYWMuY29uY2F0KGJjKS5maWx0ZXIobnVsbHMpO1xuICB9XG5cbiAgZm9yICh2YXIga2V5IGluIGIpIHtcbiAgICBpZiAoa2V5ICE9ICdjbGFzcycpIHtcbiAgICAgIGFba2V5XSA9IGJba2V5XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYTtcbn07XG5cbi8qKlxuICogRmlsdGVyIG51bGwgYHZhbGBzLlxuICpcbiAqIEBwYXJhbSB7Kn0gdmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbnVsbHModmFsKSB7XG4gIHJldHVybiB2YWwgIT0gbnVsbCAmJiB2YWwgIT09ICcnO1xufVxuXG4vKipcbiAqIGpvaW4gYXJyYXkgYXMgY2xhc3Nlcy5cbiAqXG4gKiBAcGFyYW0geyp9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmpvaW5DbGFzc2VzID0gam9pbkNsYXNzZXM7XG5mdW5jdGlvbiBqb2luQ2xhc3Nlcyh2YWwpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkodmFsKSA/IHZhbC5tYXAoam9pbkNsYXNzZXMpLmZpbHRlcihudWxscykuam9pbignICcpIDogdmFsO1xufVxuXG4vKipcbiAqIFJlbmRlciB0aGUgZ2l2ZW4gY2xhc3Nlcy5cbiAqXG4gKiBAcGFyYW0ge0FycmF5fSBjbGFzc2VzXG4gKiBAcGFyYW0ge0FycmF5LjxCb29sZWFuPn0gZXNjYXBlZFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmNscyA9IGZ1bmN0aW9uIGNscyhjbGFzc2VzLCBlc2NhcGVkKSB7XG4gIHZhciBidWYgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjbGFzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGVzY2FwZWQgJiYgZXNjYXBlZFtpXSkge1xuICAgICAgYnVmLnB1c2goZXhwb3J0cy5lc2NhcGUoam9pbkNsYXNzZXMoW2NsYXNzZXNbaV1dKSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBidWYucHVzaChqb2luQ2xhc3NlcyhjbGFzc2VzW2ldKSk7XG4gICAgfVxuICB9XG4gIHZhciB0ZXh0ID0gam9pbkNsYXNzZXMoYnVmKTtcbiAgaWYgKHRleHQubGVuZ3RoKSB7XG4gICAgcmV0dXJuICcgY2xhc3M9XCInICsgdGV4dCArICdcIic7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG4vKipcbiAqIFJlbmRlciB0aGUgZ2l2ZW4gYXR0cmlidXRlLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBrZXlcbiAqIEBwYXJhbSB7U3RyaW5nfSB2YWxcbiAqIEBwYXJhbSB7Qm9vbGVhbn0gZXNjYXBlZFxuICogQHBhcmFtIHtCb29sZWFufSB0ZXJzZVxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmF0dHIgPSBmdW5jdGlvbiBhdHRyKGtleSwgdmFsLCBlc2NhcGVkLCB0ZXJzZSkge1xuICBpZiAoJ2Jvb2xlYW4nID09IHR5cGVvZiB2YWwgfHwgbnVsbCA9PSB2YWwpIHtcbiAgICBpZiAodmFsKSB7XG4gICAgICByZXR1cm4gJyAnICsgKHRlcnNlID8ga2V5IDoga2V5ICsgJz1cIicgKyBrZXkgKyAnXCInKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgfSBlbHNlIGlmICgwID09IGtleS5pbmRleE9mKCdkYXRhJykgJiYgJ3N0cmluZycgIT0gdHlwZW9mIHZhbCkge1xuICAgIHJldHVybiAnICcgKyBrZXkgKyBcIj0nXCIgKyBKU09OLnN0cmluZ2lmeSh2YWwpLnJlcGxhY2UoLycvZywgJyZhcG9zOycpICsgXCInXCI7XG4gIH0gZWxzZSBpZiAoZXNjYXBlZCkge1xuICAgIHJldHVybiAnICcgKyBrZXkgKyAnPVwiJyArIGV4cG9ydHMuZXNjYXBlKHZhbCkgKyAnXCInO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiAnICcgKyBrZXkgKyAnPVwiJyArIHZhbCArICdcIic7XG4gIH1cbn07XG5cbi8qKlxuICogUmVuZGVyIHRoZSBnaXZlbiBhdHRyaWJ1dGVzIG9iamVjdC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcGFyYW0ge09iamVjdH0gZXNjYXBlZFxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5leHBvcnRzLmF0dHJzID0gZnVuY3Rpb24gYXR0cnMob2JqLCB0ZXJzZSl7XG4gIHZhciBidWYgPSBbXTtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKG9iaik7XG5cbiAgaWYgKGtleXMubGVuZ3RoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIga2V5ID0ga2V5c1tpXVxuICAgICAgICAsIHZhbCA9IG9ialtrZXldO1xuXG4gICAgICBpZiAoJ2NsYXNzJyA9PSBrZXkpIHtcbiAgICAgICAgaWYgKHZhbCA9IGpvaW5DbGFzc2VzKHZhbCkpIHtcbiAgICAgICAgICBidWYucHVzaCgnICcgKyBrZXkgKyAnPVwiJyArIHZhbCArICdcIicpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBidWYucHVzaChleHBvcnRzLmF0dHIoa2V5LCB2YWwsIGZhbHNlLCB0ZXJzZSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBidWYuam9pbignJyk7XG59O1xuXG4vKipcbiAqIEVzY2FwZSB0aGUgZ2l2ZW4gc3RyaW5nIG9mIGBodG1sYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gaHRtbFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZXhwb3J0cy5lc2NhcGUgPSBmdW5jdGlvbiBlc2NhcGUoaHRtbCl7XG4gIHZhciByZXN1bHQgPSBTdHJpbmcoaHRtbClcbiAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKTtcbiAgaWYgKHJlc3VsdCA9PT0gJycgKyBodG1sKSByZXR1cm4gaHRtbDtcbiAgZWxzZSByZXR1cm4gcmVzdWx0O1xufTtcblxuLyoqXG4gKiBSZS10aHJvdyB0aGUgZ2l2ZW4gYGVycmAgaW4gY29udGV4dCB0byB0aGVcbiAqIHRoZSBqYWRlIGluIGBmaWxlbmFtZWAgYXQgdGhlIGdpdmVuIGBsaW5lbm9gLlxuICpcbiAqIEBwYXJhbSB7RXJyb3J9IGVyclxuICogQHBhcmFtIHtTdHJpbmd9IGZpbGVuYW1lXG4gKiBAcGFyYW0ge1N0cmluZ30gbGluZW5vXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5leHBvcnRzLnJldGhyb3cgPSBmdW5jdGlvbiByZXRocm93KGVyciwgZmlsZW5hbWUsIGxpbmVubywgc3RyKXtcbiAgaWYgKCEoZXJyIGluc3RhbmNlb2YgRXJyb3IpKSB0aHJvdyBlcnI7XG4gIGlmICgodHlwZW9mIHdpbmRvdyAhPSAndW5kZWZpbmVkJyB8fCAhZmlsZW5hbWUpICYmICFzdHIpIHtcbiAgICBlcnIubWVzc2FnZSArPSAnIG9uIGxpbmUgJyArIGxpbmVubztcbiAgICB0aHJvdyBlcnI7XG4gIH1cbiAgdHJ5IHtcbiAgICBzdHIgPSAgc3RyIHx8IHJlcXVpcmUoJ2ZzJykucmVhZEZpbGVTeW5jKGZpbGVuYW1lLCAndXRmOCcpXG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgcmV0aHJvdyhlcnIsIG51bGwsIGxpbmVubylcbiAgfVxuICB2YXIgY29udGV4dCA9IDNcbiAgICAsIGxpbmVzID0gc3RyLnNwbGl0KCdcXG4nKVxuICAgICwgc3RhcnQgPSBNYXRoLm1heChsaW5lbm8gLSBjb250ZXh0LCAwKVxuICAgICwgZW5kID0gTWF0aC5taW4obGluZXMubGVuZ3RoLCBsaW5lbm8gKyBjb250ZXh0KTtcblxuICAvLyBFcnJvciBjb250ZXh0XG4gIHZhciBjb250ZXh0ID0gbGluZXMuc2xpY2Uoc3RhcnQsIGVuZCkubWFwKGZ1bmN0aW9uKGxpbmUsIGkpe1xuICAgIHZhciBjdXJyID0gaSArIHN0YXJ0ICsgMTtcbiAgICByZXR1cm4gKGN1cnIgPT0gbGluZW5vID8gJyAgPiAnIDogJyAgICAnKVxuICAgICAgKyBjdXJyXG4gICAgICArICd8ICdcbiAgICAgICsgbGluZTtcbiAgfSkuam9pbignXFxuJyk7XG5cbiAgLy8gQWx0ZXIgZXhjZXB0aW9uIG1lc3NhZ2VcbiAgZXJyLnBhdGggPSBmaWxlbmFtZTtcbiAgZXJyLm1lc3NhZ2UgPSAoZmlsZW5hbWUgfHwgJ0phZGUnKSArICc6JyArIGxpbmVub1xuICAgICsgJ1xcbicgKyBjb250ZXh0ICsgJ1xcblxcbicgKyBlcnIubWVzc2FnZTtcbiAgdGhyb3cgZXJyO1xufTtcblxufSx7XCJmc1wiOjJ9XSwyOltmdW5jdGlvbihyZXF1aXJlLG1vZHVsZSxleHBvcnRzKXtcblxufSx7fV19LHt9LFsxXSlcbigxKVxufSk7XG59KS5jYWxsKHRoaXMsdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KSIsIk1hcmlvbmV0dGUuQmVoYXZpb3JzLmJlaGF2aW9yc0xvb2t1cCA9IC0+XG4gIHdpbmRvdy5CZWhhdmlvcnNcblxud2luZG93LkJlaGF2aW9ycyA9IHt9XG53aW5kb3cuQmVoYXZpb3JzLkNsb3NlYWJsZSA9IHJlcXVpcmUgJy4vYmVoYXZpb3JzL0Nsb3NlYWJsZSdcblxuVG9nZ2xlYWJsZVJlZ2lvbiA9IHJlcXVpcmUgJy4vcmVnaW9ucy9Ub2dnbGVhYmxlUmVnaW9uJ1xuQXBwVmlldyA9IHJlcXVpcmUgJy4vdmlld3MvQXBwVmlldydcblRvZG9Nb2R1bGUgPSByZXF1aXJlKCcuL21vZHVsZXMvdG9kby9Ub2RvTW9kdWxlJylcblxuY2xhc3MgQXBwIGV4dGVuZHMgQmFja2JvbmUuTWFyaW9uZXR0ZS5BcHBsaWNhdGlvblxuICBpbml0aWFsaXplOiA9PlxuICAgIGNvbnNvbGUubG9nICdJbml0aWFsaXppbmcgYXBwLi4uJ1xuXG4gICAgQHJvdXRlciA9IG5ldyBCYWNrYm9uZS5NYXJpb25ldHRlLkFwcFJvdXRlcigpXG5cbiAgICBAYWRkSW5pdGlhbGl6ZXIoIChvcHRpb25zKSA9PlxuICAgICAgKG5ldyBBcHBWaWV3KCkpLnJlbmRlcigpXG4gICAgKVxuXG4gICAgQGFkZEluaXRpYWxpemVyKCAob3B0aW9ucykgPT5cbiAgICAgIEBhZGRSZWdpb25zKHsgXG4gICAgICAgIHRvZG9SZWdpb246IHsgXG4gICAgICAgICAgc2VsZWN0b3I6IFwiI3RvZG9zXCJcbiAgICAgICAgICByZWdpb25DbGFzczogVG9nZ2xlYWJsZVJlZ2lvblxuICAgICAgICAgIG1vZHVsZTogQHN1Ym1vZHVsZXMuVG9kb1xuICAgICAgICB9XG4gICAgICB9KVxuICAgIClcblxuICAgIEBhZGRJbml0aWFsaXplciggKG9wdGlvbnMpID0+XG4gICAgICBCYWNrYm9uZS5oaXN0b3J5LnN0YXJ0KClcbiAgICAgIGNvbnNvbGUubG9nIEJhY2tib25lLmhpc3RvcnlcbiAgICApXG5cbiAgICBAbW9kdWxlKCdUb2RvJywgVG9kb01vZHVsZSlcblxuICAgIEBzdGFydCgpXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwXG4iLCJjbGFzcyBDbG9zZWFibGUgZXh0ZW5kcyBNYXJpb25ldHRlLkJlaGF2aW9yXG5cbiAgdWk6XG4gICAgY2xvc2U6ICdidXR0b24uY2xvc2UnXG5cbiAgZXZlbnRzOlxuICAgICdjbGljayBAdWkuY2xvc2UnOiAnY2xvc2VDbGlja2VkJ1xuXG4gIGNsb3NlQ2xpY2tlZDogLT5cbiAgICBAdmlldy50cmlnZ2VyICdyZWdpb246b2ZmJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IENsb3NlYWJsZSIsIkFwcCA9IHJlcXVpcmUoJy4vYXBwJylcblxuJCAtPlxuICB3aW5kb3cuQXBwID0gbmV3IEFwcCgpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNsYXNzIEJhc2VNb2R1bGUgZXh0ZW5kcyBNYXJpb25ldHRlLk1vZHVsZVxuICBvblN0YXJ0OiAtPlxuICAgIEBtYWluVmlldyA9IG5ldyBATWFpblZpZXcoY29sbGVjdGlvbjogQGNvbGxlY3Rpb24pXG4gICAgQHJlZ2lvbi5zaG93KEBtYWluVmlldylcbiIsIlRvZG9zID0gcmVxdWlyZSAnLi9jb2xsZWN0aW9ucy9Ub2RvcydcbkJhc2VNb2R1bGUgPSByZXF1aXJlICcuLi9CYXNlTW9kdWxlJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFRvZG9Nb2R1bGUgZXh0ZW5kcyBCYXNlTW9kdWxlXG4gIGluaXRpYWxpemU6IC0+XG4gICAgQE1haW5WaWV3ID0gcmVxdWlyZSAnLi92aWV3cy9NYWluVmlldydcblxuICAgIGNvbnNvbGUubG9nICdJbml0aWFsaXppbmcgVG9kb01vZHVsZSdcbiAgICBAc3RhcnRXaXRoUGFyZW50ID0gdHJ1ZVxuXG4gICAgQGNvbGxlY3Rpb24gPSBuZXcgVG9kb3MoW1xuICAgICAgeyB0ZXh0OiBcIldhc2ggZGlzaGVzXCIsIGRvbmU6IGZhbHNlIH1cbiAgICAgIHsgdGV4dDogXCJMZWFybiBNYXJpb25ldHRlLmpzXCIsIGRvbmU6IHRydWUgfVxuICAgIF0pXG5cbiAgICBAYXBwLnJvdXRlci5wcm9jZXNzQXBwUm91dGVzIEAsIHtcbiAgICAgICd0b2RvLzp0ZXh0JzogJ3Nob3dUb2RvJ1xuICAgIH1cblxuICBvblN0YXJ0OiAtPlxuICAgIHN1cGVyKClcbiAgICBjb25zb2xlLmxvZyAnU3RhcnRpbmcgVG9kb01vZHVsZSdcblxuICBvblN0b3A6IC0+XG4gICAgY29uc29sZS5sb2cgJ1N0b3BwaW5nIFRvZG9Nb2R1bGUnXG5cbiAgc2hvd1RvZG86ICh0ZXh0KSAtPlxuICAgIEBjb2xsZWN0aW9uLnNob3dUb2RvKHRleHQpXG4iLCJUb2RvID0gcmVxdWlyZSgnLi4vbW9kZWxzL1RvZG8nKVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFRvZG9zIGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvblxuICBtb2RlbDogVG9kb1xuXG4gIHNob3dUb2RvOiAodGV4dCkgLT5cbiAgICBfLmVhY2ggQHdoZXJlKHRleHQ6IHRleHQpLCAodG9kbykgLT5cbiAgICAgIHRvZG8udG9nZ2xlQWN0aXZlKClcbiIsIm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVG9kbyBleHRlbmRzIEJhY2tib25lLk1vZGVsXG4gIGRlZmF1bHRzOlxuICAgIHRleHQ6ICcnXG4gICAgZG9uZTogZmFsc2VcbiAgICBhY3RpdmU6IGZhbHNlXG5cbiAgdG9nZ2xlQWN0aXZlOiAtPlxuICAgIEBjb2xsZWN0aW9uLmVhY2ggKHRvZG8pID0+XG4gICAgICB1bmxlc3MgdG9kbyBpcyBAXG4gICAgICAgIHRvZG8uc2V0ICdhY3RpdmUnLCBmYWxzZVxuICAgICAgZWxzZVxuICAgICAgICBAc2V0ICdhY3RpdmUnLCAhQGdldCgnYWN0aXZlJylcbiIsIlRvZG8gPSByZXF1aXJlKCcuLi9tb2RlbHMvVG9kbycpXG5Ub2RvcyA9IHJlcXVpcmUoJy4uL2NvbGxlY3Rpb25zL1RvZG9zJylcblxubW9kdWxlLmV4cG9ydHMgPSBjbGFzcyBNYWluVmlldyBleHRlbmRzIEJhY2tib25lLk1hcmlvbmV0dGUuQ29tcG9zaXRlVmlld1xuICB0ZW1wbGF0ZTogcmVxdWlyZSAnLi90ZW1wbGF0ZXMvbWFpbidcbiAgY2hpbGRWaWV3Q29udGFpbmVyOiBcIiN0b2RvLWxpc3RcIlxuICBjaGlsZFZpZXc6IHJlcXVpcmUoJy4vVG9kb1ZpZXcnKVxuXG4gIGJlaGF2aW9yczpcbiAgICBDbG9zZWFibGU6IHt9XG5cbiAgdWk6XG4gICAgZm9ybTogJ2Zvcm0jbmV3LXRvZG8nXG4gICAgaW5wdXQ6ICdmb3JtI25ldy10b2RvIGlucHV0J1xuXG4gIGV2ZW50czpcbiAgICBcInN1Ym1pdCBAdWkuZm9ybVwiOiBcImFkZFRvZG9cIlxuXG4gIGFkZFRvZG86IChlKSAtPlxuICAgIGUucHJldmVudERlZmF1bHQoKVxuXG4gICAgZGF0YSA9IEJhY2tib25lLlN5cGhvbi5zZXJpYWxpemUoQClcbiAgICBAY29sbGVjdGlvbi5hZGQobmV3IFRvZG8oeyB0ZXh0OiBkYXRhLnRvZG8gfSkpXG5cbiAgICBAcmVuZGVyKClcbiAgICBBcHAudmVudC50cmlnZ2VyICduZXc6bm90aWZpY2F0aW9uJywgXCJBZGRlZCB0b2RvOiBcIiArIGRhdGEudG9kb1xuXG4gIG9uUmVuZGVyOiAtPlxuICAgIEB1aS5pbnB1dC5mb2N1cygpXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGNsYXNzIFRvZG9WaWV3IGV4dGVuZHMgQmFja2JvbmUuTWFyaW9uZXR0ZS5JdGVtVmlld1xuICB0ZW1wbGF0ZTogcmVxdWlyZSAnLi90ZW1wbGF0ZXMvdG9kbydcbiAgY2xhc3NOYW1lOiAtPlxuICAgICdsaXN0LWdyb3VwLWl0ZW0nICsgaWYgQG1vZGVsLmdldCgnYWN0aXZlJykgdGhlbiAnIGFjdGl2ZScgZWxzZSAnJ1xuXG4gIHVpOlxuICAgIGNoZWNrOiAnLmNoZWNrJ1xuICAgIGNsb3NlOiAnLmNsb3NlJ1xuXG4gIGV2ZW50czpcbiAgICAnY2xpY2sgQHVpLmNoZWNrJzogJ3RvZ2dsZUNoZWNrJ1xuICAgICdjbGljayBAdWkuY2xvc2UnOiAncmVtb3ZlVG9kbydcblxuICBtb2RlbEV2ZW50czpcbiAgICAnY2hhbmdlOmRvbmUnOiAncmVuZGVyJ1xuICAgICdjaGFuZ2U6YWN0aXZlJzogJ3RvZG9Ub2dnbGVkJ1xuXG4gIHRvZG9Ub2dnbGVkOiAtPlxuICAgIEAkZWwudG9nZ2xlQ2xhc3MoJ2FjdGl2ZScpXG4gICAgQXBwLnZlbnQudHJpZ2dlciAnbmV3Om5vdGlmaWNhdGlvbicsIFwiU2VsZWN0ZWQvdW5zZWxlY3RlZCB0b2RvOiBcIiArIEBtb2RlbC5nZXQoJ3RleHQnKVxuXG4gIHRvZ2dsZUNoZWNrOiAtPlxuICAgIEBtb2RlbC5zZXQoJ2RvbmUnLCAhQG1vZGVsLmdldCgnZG9uZScpKVxuICAgIEFwcC52ZW50LnRyaWdnZXIgJ25ldzpub3RpZmljYXRpb24nLCBcIlRvZ2dsZWQgdG9kbzogXCIgKyBAbW9kZWwuZ2V0KCd0ZXh0JylcblxuICByZW1vdmVUb2RvOiAtPlxuICAgIEBtb2RlbC5kZXN0cm95KClcbiAgICBBcHAudmVudC50cmlnZ2VyICduZXc6bm90aWZpY2F0aW9uJywgXCJSZW1vdmVkIHRvZG86IFwiICsgQG1vZGVsLmdldCgndGV4dCcpXG5cbiIsInZhciBqYWRlID0gcmVxdWlyZShcImphZGUvcnVudGltZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0ZW1wbGF0ZShsb2NhbHMpIHtcbnZhciBidWYgPSBbXTtcbnZhciBqYWRlX21peGlucyA9IHt9O1xudmFyIGxvY2Fsc18gPSAobG9jYWxzIHx8IHt9KSxhY3Rpb24gPSBsb2NhbHNfLmFjdGlvbjtcbmJ1Zi5wdXNoKFwiPGRpdiBjbGFzcz1cXFwicGFuZWwgcGFuZWwtZGVmYXVsdFxcXCI+PGRpdiBjbGFzcz1cXFwicGFuZWwtaGVhZGluZ1xcXCI+VG9kbyBsaXN0PGJ1dHRvbiBjbGFzcz1cXFwiY2xvc2VcXFwiPiZ0aW1lcztcIiArIChqYWRlLmVzY2FwZShudWxsID09IChqYWRlLmludGVycCA9IGFjdGlvbikgPyBcIlwiIDogamFkZS5pbnRlcnApKSArIFwiPC9idXR0b24+PC9kaXY+PGRpdiBjbGFzcz1cXFwicGFuZWwtYm9keVxcXCI+PGRpdiBpZD1cXFwidG9kby1saXN0XFxcIiBjbGFzcz1cXFwibGlzdC1ncm91cFxcXCI+PC9kaXY+PGZvcm0gaWQ9XFxcIm5ldy10b2RvXFxcIj48aW5wdXQgdHlwZT1cXFwidGV4dFxcXCIgbmFtZT1cXFwidG9kb1xcXCIgcGxhY2Vob2xkZXI9XFxcImVudGVyIGEgbmV3IHRvZG8gYW5kIHByZXNzIEVOVEVSXFxcIiBhdXRvZm9jdXM9XFxcImF1dG9mb2N1c1xcXCIgY2xhc3M9XFxcImZvcm0tY29udHJvbFxcXCIvPjwvZm9ybT48L2Rpdj48L2Rpdj5cIik7O3JldHVybiBidWYuam9pbihcIlwiKTtcbn07IiwidmFyIGphZGUgPSByZXF1aXJlKFwiamFkZS9ydW50aW1lXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHRlbXBsYXRlKGxvY2Fscykge1xudmFyIGJ1ZiA9IFtdO1xudmFyIGphZGVfbWl4aW5zID0ge307XG52YXIgbG9jYWxzXyA9IChsb2NhbHMgfHwge30pLGRvbmUgPSBsb2NhbHNfLmRvbmUsdGV4dCA9IGxvY2Fsc18udGV4dDtcbmlmICggZG9uZSlcbntcbmJ1Zi5wdXNoKFwiPGRpdiBjbGFzcz1cXFwiY2hlY2sgZmEgZmEtY2hlY2stc3F1YXJlLW8gZmEtZndcXFwiPjwvZGl2PlwiKTtcbn1cbmVsc2VcbntcbmJ1Zi5wdXNoKFwiPGRpdiBjbGFzcz1cXFwiY2hlY2sgZmEgZmEtc3F1YXJlLW8gZmEtZndcXFwiPjwvZGl2PlwiKTtcbn1cbmJ1Zi5wdXNoKFwiPGFcIiArIChqYWRlLmF0dHIoXCJocmVmXCIsICcjdG9kby8nK3RleHQsIHRydWUsIGZhbHNlKSkgKyAoamFkZS5jbHMoWyd0ZXh0Jyxkb25lPycgY2hlY2tlZCc6JyddLCBbbnVsbCx0cnVlXSkpICsgXCI+XCIgKyAoamFkZS5lc2NhcGUobnVsbCA9PSAoamFkZS5pbnRlcnAgPSB0ZXh0KSA/IFwiXCIgOiBqYWRlLmludGVycCkpICsgXCI8L2E+PHNwYW4gY2xhc3M9XFxcImNsb3NlXFxcIj4mdGltZXM7PC9zcGFuPlwiKTs7cmV0dXJuIGJ1Zi5qb2luKFwiXCIpO1xufTsiLCJFbXB0eVJlZ2lvblZpZXcgPSByZXF1aXJlICcuLi92aWV3cy9FbXB0eVJlZ2lvblZpZXcnXG5cbm1vZHVsZS5leHBvcnRzID0gY2xhc3MgVG9nZ2xlYWJsZVJlZ2lvbiBleHRlbmRzIEJhY2tib25lLk1hcmlvbmV0dGUuUmVnaW9uXG4gIGluaXRpYWxpemU6IChvcHRpb25zKSAtPlxuICAgIEBtb2R1bGUgPSBvcHRpb25zLm1vZHVsZVxuICAgIEBtb2R1bGUucmVnaW9uID0gQFxuXG4gICAgQGluaXRTaG93KClcblxuICBpbml0U2hvdzogLT5cbiAgICBAZW1wdHlWaWV3ID0gbmV3IEVtcHR5UmVnaW9uVmlldygpXG4gICAgQHNob3coQGVtcHR5VmlldylcblxuICBvblNob3c6ICh2aWV3KSAtPlxuICAgIEBsaXN0ZW5UbyB2aWV3LCAncmVnaW9uOm9uJywgPT5cbiAgICAgIEBtb2R1bGUuc3RhcnQoKVxuXG4gICAgQGxpc3RlblRvIHZpZXcsICdyZWdpb246b2ZmJywgPT5cbiAgICAgIEBtb2R1bGUuc3RvcCgpXG4gICAgICBAaW5pdFNob3coKSIsImNsYXNzIEFwcFZpZXcgZXh0ZW5kcyBNYXJpb25ldHRlLkxheW91dFZpZXdcbiAgdGVtcGxhdGU6IHJlcXVpcmUgJy4vdGVtcGxhdGVzL2FwcCdcbiAgZWw6IFwiI2FwcFwiXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwVmlldyIsImNsYXNzIEVtcHR5UmVnaW9uVmlldyBleHRlbmRzIE1hcmlvbmV0dGUuSXRlbVZpZXdcbiAgdGVtcGxhdGU6IHJlcXVpcmUgJy4vdGVtcGxhdGVzL2VtcHR5cmVnaW9uJ1xuXG4gIHVpOlxuICAgIHJlZ2lvbk9uOiAnLnJlZ2lvbi1vbidcblxuICB0cmlnZ2VyczpcbiAgICBcImNsaWNrIEB1aS5yZWdpb25PblwiOiAncmVnaW9uOm9uJ1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtcHR5UmVnaW9uVmlldyIsInZhciBqYWRlID0gcmVxdWlyZShcImphZGUvcnVudGltZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0ZW1wbGF0ZShsb2NhbHMpIHtcbnZhciBidWYgPSBbXTtcbnZhciBqYWRlX21peGlucyA9IHt9O1xuXG5idWYucHVzaChcIjxkaXYgY2xhc3M9XFxcInJvd1xcXCI+PGRpdiBpZD1cXFwibm90aWZpY2F0aW9uc1xcXCI+PC9kaXY+PC9kaXY+PGRpdiBjbGFzcz1cXFwicm93XFxcIj48ZGl2IGlkPVxcXCJ0b2Rvc1xcXCI+PC9kaXY+PC9kaXY+XCIpOztyZXR1cm4gYnVmLmpvaW4oXCJcIik7XG59OyIsInZhciBqYWRlID0gcmVxdWlyZShcImphZGUvcnVudGltZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiB0ZW1wbGF0ZShsb2NhbHMpIHtcbnZhciBidWYgPSBbXTtcbnZhciBqYWRlX21peGlucyA9IHt9O1xuXG5idWYucHVzaChcIjxkaXYgY2xhc3M9XFxcIm1vZHVsZS1ib3hcXFwiPjxkaXYgY2xhc3M9XFxcImJsYW5rXFxcIj48YnV0dG9uIGNsYXNzPVxcXCJyZWdpb24tb24gYnRuXFxcIj5TdGFydCBtb2R1bGU8L2J1dHRvbj48L2Rpdj48L2Rpdj5cIik7O3JldHVybiBidWYuam9pbihcIlwiKTtcbn07Il19
