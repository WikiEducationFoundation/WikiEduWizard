#########################################################
# Title:  StepNavView
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require( '../App' )

View = require('../views/supers/View')

StepNavTemplate = require('../templates/StepNavTemplate.hbs')


module.exports = class StepNavView extends View


  className: 'step-nav'


  template: StepNavTemplate


  hasBeenToLastStep: false


  initialize: ->
    
    @currentStep = 0

    @render = _.bind( @render, @ )


  subscriptions:

    'step:update' : 'updateCurrentStep'

    'step:answered' : 'stepAnswered'



  events: ->
    'click .next' : 'nextClickHandler'

    'click .prev' : 'prevClickHandler'

    'click .dot'  : 'dotClickHandler'

    # 'click .cancel'  : 'cancelClickHandler'

    # 'click .confirm'  : 'confirmClickHandler'



  render: ->
    @$el.html( @template( @getRenderData() ) )

    if @currentStep > 0 && @currentStep < @totalSteps - 1

      @$el.removeClass('hidden')

      # @$el.removeClass('contracted')

    else if @currentStep > 0 && @currentStep == @totalSteps - 1

      @$el.removeClass('hidden')

      # @$el.addClass('contracted')

    else

      # @$el.removeClass('contracted')

      @$el.addClass('hidden')

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

          stepData = step.model.attributes

          isActive = @currentStep is index

          wasVisited = step.hasUserVisited

          out.push {id: index, isActive: isActive, hasVisited: wasVisited, stepTitle: stepData.title, stepId: stepData.id}

        )

        return out

    }



  afterRender: ->
    return @



  prevClickHandler: ->

    if @isLastStep()

      Backbone.Mediator.publish('step:edit', 'grading')

    else

      Backbone.Mediator.publish('step:prev')



  nextClickHandler: ->

    Backbone.Mediator.publish('step:next')



  dotClickHandler: (e) ->
    e.preventDefault()

    $target = $(e.currentTarget)

    if @hasBeenToLastStep

      Backbone.Mediator.publish('step:edit', $target.data('step-id'))

    else

      Backbone.Mediator.publish('step:goto', $target.data('nav-id'))


  # confirmClickHandler: (e) ->
  #   e.preventDefault()

  #   $target = $(e.currentTarget)

  #   Backbone.Mediator.publish('step:goto', @totalSteps - 1)


  # cancelClickHandler: (e) ->
  #   e.preventDefault()

  #   $target = $(e.currentTarget)

  #   Backbone.Mediator.publish('step:goto', @totalSteps - 1)


  updateCurrentStep: (step) ->

    @currentStep = step

    if @isLastStep()
      
      @hasBeenToLastStep = true

    @render()



  stepAnswered: (stepView) ->

    @render()



  #--------------------------------------------------------
  # Helpers
  #--------------------------------------------------------

  isLastStep: ->

    return @currentStep is @totalSteps - 1

  isInactive: (item) ->

    itIs = true

    if item == 'prev'

      itIs = @currentStep is 1

    else if item == 'next'

      if application.homeView.stepViews[@currentStep].hasUserAnswered

        itIs = false

      else if @isLastStep()
        
        itIs = true

      else
        itIs = true

    return itIs
