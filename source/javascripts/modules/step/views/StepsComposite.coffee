Step = require('../models/Step')
Steps = require('../collections/Steps')

module.exports = class StepsComposite extends Backbone.Marionette.CompositeView
  template: require './templates/main'
  childViewContainer: "#step-list"
  childView: require('./StepView')

  behaviors:
    Closeable: {}

  ui:
    next: '.next'

  events:
    "click @ui.next": "nextStep"

  nextStep: (e) ->
    e.preventDefault()
    console.log 'go to next step'
    App.vent.trigger 'wizard:next'

  onRender: ->
    @ui.next.focus()
