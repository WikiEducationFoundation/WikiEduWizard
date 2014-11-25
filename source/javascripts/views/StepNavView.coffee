#########################################################
# Title:  StepNavView
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require( '../app' )

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

    'edit:exit' : 'editExitHandler'


  events: ->
    'click .next' : 'nextClickHandler'

    'click .prev' : 'prevClickHandler'

    'click .dot'  : 'dotClickHandler'


  render: ->

    @$el.html( @template( @getRenderData() ) )

    if @currentStep > 0 && @currentStep < @totalSteps - 1

      @$el.removeClass('hidden')

    else if @currentStep > 0 && @currentStep == @totalSteps - 1

      @$el.removeClass('hidden')

    else

      @$el.addClass('hidden')

    @afterRender()


  getRenderData: ->

    return {

      current: @currentStep

      total: @totalSteps

      prevInactive: @isInactive('prev')

      nextInactive: @isInactive('next')

      nextTitle: =>

        if @isLastStep()

          return ''

        else 

          return 'Next'

      prevTitle: =>

        if @isLastStep()

          return 'Back'

        else 

          return 'Prev'

      isLastStep: @isLastStep()

      backToOverviewTitle: 'Go Back to Overview'

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



  prevClickHandler: (e) ->

    e.preventDefault()

    if @isLastStep()

      Backbone.Mediator.publish('step:edit', 'grading')

    else

      Backbone.Mediator.publish('step:prev')



  nextClickHandler: (e) ->

    e.preventDefault()

    Backbone.Mediator.publish('step:next')



  dotClickHandler: (e) ->

    e.preventDefault()

    $target = $(e.currentTarget)

    if @hasBeenToLastStep

      if parseInt($target.attr('data-nav-id')) == parseInt(@totalSteps - 1)

        Backbone.Mediator.publish('edit:exit')

      else

        Backbone.Mediator.publish('step:edit', $target.data('step-id'))

    else

      Backbone.Mediator.publish('step:goto', $target.data('nav-id'))


  editExitHandler: ->

    Backbone.Mediator.publish('step:goto', @lastStepIndex())


  updateCurrentStep: (step) ->

    @currentStep = step

    if @isLastStep()

      @hasBeenToLastStep = true

    @render()


  stepAnswered: (stepView) ->

    return @render()



  #--------------------------------------------------------
  # Helpers
  #--------------------------------------------------------

  lastStepIndex: ->
    
    return @totalSteps-1

  isLastStep: ->

    return @currentStep is @totalSteps - 1 && @currentStep > 1

  isInactive: (item) ->

    itIs = true

    if item == 'prev'

      itIs = @currentStep is 0

    else if item == 'next'

      if application.homeView.stepViews[@currentStep].hasUserAnswered

        itIs = false

      else if @isLastStep()
        
        itIs = true

      if application.homeView.selectedPathways.length == 0

        itIs = true  


    return itIs
