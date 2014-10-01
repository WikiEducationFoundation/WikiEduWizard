#########################################################
# Title:  HomeView
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require( '../App' )

View = require('../views/supers/View')
HomeTemplate = require('../templates/HomeTemplate.hbs')

StepController = require('../controllers/StepController')
StepView = require('../views/StepView')
StepModel = require('../models/StepModel')


module.exports = class HomeView extends View

  #--------------------------------------------------------
  # SETUP
  #--------------------------------------------------------

  className: 'home-view'

  template: HomeTemplate

  #--------------------------------------------------------
  # INIT
  #--------------------------------------------------------

  initialize: ->
    @currentStep = 0
    @render = _.bind( @render, @ )

  events: ->
    'click .next' : 'nextClickHandler'
    'click .prev' : 'prevClickHandler'


  render: ->
    @$el.html( @template( @getRenderData()))
    @afterRender()

    return @

  afterRender: ->

    @$stepsContainer = @$el.find('.steps')

    @stepViews = []

    _.each(application.data,(step, index) =>
      newmodel = new StepModel()
      _.map(step,(value, key, list) -> 
        newmodel.set(key,value)
      )
      newview = new StepView(
        model: newmodel
      )
      newview.model.set('stepNumber', index + 1)
      @$stepsContainer.append(newview.render().hide().el)
      @stepViews.push(newview)
    )

    if @stepViews.length > 0
      @showCurrentStep()

    @StepController = new StepController(
      el: @$stepsContainer
      childViews: @stepViews
    )


  getRenderData: ->
    return {
      content: "WikiEdu Assignment Design Wizard"
    }
    

  #--------------------------------------------------------
  # CUSTOM FUNCTIONS
  #--------------------------------------------------------

  advanceStep: ->
    @currentStep+=1
    
    if @currentStep == @stepViews.length 
      @currentStep = 0

    @hideAllSteps()
    @showCurrentStep()

  decrementStep: ->
    @currentStep-=1

    if @currentStep < 0
      @currentStep = @stepViews.length - 1

    @hideAllSteps()
    @showCurrentStep()

  showCurrentStep: ->
    @stepViews[@currentStep].show()

  currentStepView: ->
    return @stepViews[@currentStep]

  hideAllSteps: ->
    _.each(@stepViews,(stepView) =>
      stepView.hide()
    )


  #--------------------------------------------------------
  # EVENT HANDLERS
  #--------------------------------------------------------

  nextClickHandler: (e) ->
    e.preventDefault()
    @advanceStep()

  prevClickHandler: (e) ->
    e.preventDefault()
    @decrementStep()

  appLoadedHandler: (e) ->
    console.log 'app loaded'


