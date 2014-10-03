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

StepNavView = require('../views/StepNavView')


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


  subscriptions:
    'step:next' : 'nextClickHandler'
    'step:prev' : 'prevClickHandler'


  render: ->
    @$el.html( @template( @getRenderData()))
    @afterRender()

    return @

  afterRender: ->

    #SUBVIEWS
    @StepNav = new StepNavView()

    # THE FOLLWING COULD PROBABLY HAPPEN IN A COLLETION VIEW CLASS TO CONTROL ALL STEPS
    @$stepsContainer = @$el.find('.steps')
    @$innerContainer = @$el.find('.content')

    @$innerContainer.append(@StepNav.render().el)

    @stepViews = @setupSteps()

    if @stepViews.length > 0
      @showCurrentStep()
    

  setupSteps: ->
    
    views = []

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

      views.push(newview)
    )

    return views


    
    
    



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

  nextClickHandler: ->
    @advanceStep()

  prevClickHandler: ->
    @decrementStep()



