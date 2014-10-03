#########################################################
# Title:  StepNavView
# Author: kevin@wintr.us @ WINTR
#########################################################

View = require('../views/supers/View')
StepNavTemplate = require('../templates/StepNavTemplate.hbs')

module.exports = class StepNavView extends View
  template: StepNavTemplate

  events: ->
    'click .next' : 'nextClickHandler'
    'click .prev' : 'prevClickHandler'

  prevClickHandler: ->
    Backbone.Mediator.publish('step:prev')

  nextClickHandler: ->
    Backbone.Mediator.publish('step:next')