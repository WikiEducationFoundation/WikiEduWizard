#########################################################
# Title:  StepNavView
# Author: kevin@wintr.us @ WINTR
#########################################################

View = require('../views/supers/View')
StepNavTemplate = require('../templates/StepNavTemplate.hbs')

module.exports = class StepNavView extends View

  className: 'step-nav'

  template: StepNavTemplate

  initialize: ->
    @currentStep = 0
    @render = _.bind( @render, @ )


  subscriptions:
    'step:update' : 'updateCurrentStep'


  events: ->
    'click .next' : 'nextClickHandler'
    'click .prev' : 'prevClickHandler'
    'click .dot'  : 'dotClickHandler'


  render: ->
    @$el.html( @template( @getRenderData() ) )
    @afterRender()

  getRenderData: ->
    return {
      current: @currentStep
      total: @totalSteps
      prevInactive: @isInactive('prev')
      nextInactive: @isInactive('next')
      steps: =>
        out = []
        _.each(@stepViews, (step, index) =>
          isActive = @currentStep is index
          out.push {id: index, isActive: isActive}
        )
        return out
    }

  afterRender: ->
    return @

  prevClickHandler: ->
    Backbone.Mediator.publish('step:prev')

  nextClickHandler: ->
    Backbone.Mediator.publish('step:next')

  dotClickHandler: (e) ->
    e.preventDefault()
    $target = $(e.currentTarget)
    Backbone.Mediator.publish('step:goto', $target.data('nav-id'))


  updateCurrentStep: (step) ->
    @currentStep = step
    @render()

  #--------------------------------------------------------
  # Helpers
  #--------------------------------------------------------

  isInactive: (item) ->

    itIs = true

    if item == 'prev'
      itIs = @currentStep is 0
    else if item == 'next'
      itIs = @currentStep is @totalSteps - 1

    return itIs
