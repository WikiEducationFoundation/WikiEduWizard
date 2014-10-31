#########################################################
# Title:  HomeView
# Author: kevin@wintr.us @ WINTR
#########################################################

# APP
application = require( '../App' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
HomeTemplate = require('../templates/HomeTemplate.hbs')

OutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs')

#SUBVIEWS
StepView = require('../views/StepView')

StepModel = require('../models/StepModel')

StepNavView = require('../views/StepNavView')

#INPUTS
WizardStepInputs = require('../data/WizardStepInputs')



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

    @stepsRendered = false


  events: 

    'click .exit-edit' : 'exitEditClickHandler'


  subscriptions:

    'step:next' : 'nextHandler'

    'step:prev' : 'prevHandler'

    'step:goto' : 'gotoHandler'

    'step:gotoId' : 'gotoIdHandler'

    'step:edit' : 'editHandler'

    'tips:hide' : 'hideAllTips'

    'edit:exit' : 'onEditExit'



  render: ->
    @$el.html( @template( @getRenderData()))

    unless @stepsRendered
    
      @afterRender()

    return @



  afterRender: ->
    #SUBVIEWS
    @StepNav = new StepNavView()

    # THE FOLLWING COULD PROBABLY HAPPEN IN A COLLETION VIEW CLASS TO CONTROL ALL STEPS
    @$stepsContainer = @$el.find('.steps')

    @$innerContainer = @$el.find('.content')

    # SETUP STEPS AND RETURN ARRAY OF VIEWS
    @stepViews = @_createStepViews()

    @StepNav.stepViews = @stepViews

    @StepNav.totalSteps = @stepViews.length

    @$innerContainer.append(@StepNav.el)

    if @stepViews.length > 0
      @showCurrentStep()

    return @
    


  _createStepViews: ->
    
    _views = []



    _.each(application.data,(step, index) =>

      newmodel = new StepModel()

      _.map(step,(value, key, list) -> 

        newmodel.set(key,value)

      )

      newview = new StepView(

        model: newmodel

      )

      newview.model.set('stepNumber', index + 1)

      newview.model.set('stepIndex', index )

      if index is application.data.length - 1
        newview.isLastStep = true
      else if index is 0
        newview.isFirstStep = true

      @$stepsContainer.append(newview.render().hide().el)

      newview.$el.addClass(step.id)

      _views.push(newview)

    )

    return _views



  getRenderData: ->
    return {

      content: "This is special content"

    }
    

  #--------------------------------------------------------
  # CUSTOM FUNCTIONS
  #--------------------------------------------------------


  advanceStep: ->
    @currentStep+=1
    
    if @currentStep is @stepViews.length 

      @currentStep = 0

    @hideAllSteps()

    @showCurrentStep()


  decrementStep: ->

    @currentStep-=1

    if @currentStep < 0

      @currentStep = @stepViews.length - 1

    @hideAllSteps()

    @showCurrentStep()



  updateStep: (index) ->

    @currentStep = index

    @hideAllSteps()

    @showCurrentStep()


  updateStepById: (id) ->

    _.each(@stepViews,(stepView) =>

      if stepView.stepId() is id

        @updateStep(_.indexOf(@stepViews,stepView))
        
        return
      
    )



  showCurrentStep: ->

    @stepViews[@currentStep].show()

    Backbone.Mediator.publish('step:update', @currentStep)

    return @



  currentStepView: ->
    return @stepViews[@currentStep]



  hideAllSteps: ->

    _.each(@stepViews,(stepView) =>

      stepView.hide()
      
    )


  hideAllTips: (e) ->

    _.each(@stepViews,(stepView) =>

      stepView.tipVisible = false
      
    )

    $('body').addClass('tip-open')

    $('.step-info-tip').removeClass('visible')

    $('.custom-input-wrapper').removeClass('selected')




  #--------------------------------------------------------
  # EVENT HANDLERS
  #--------------------------------------------------------

  nextHandler: ->

    @advanceStep()

    @hideAllTips()



  prevHandler: ->

    @decrementStep()

    @hideAllTips()


  editHandler: (id) ->

    $('body').addClass('edit-mode')

    _.each(@stepViews, (view, index) =>

      if view.model.id == id

        @updateStep(index)

    )


  onEditExit: ->

    $('body').removeClass('edit-mode')


  exitEditClickHandler: (e) ->
    e.preventDefault()
    Backbone.Mediator.publish('edit:exit')



  gotoHandler: (index) ->

    @updateStep(index)

    @hideAllTips()


  gotoIdHandler: (id) ->

    @updateStepById(id)

    @hideAllTips()


  getSelectedIds: ->

    selectedIds = []

    _.each(WizardStepInputs, (steps) =>

      _.each(steps, (step) =>

        if step.selected is true

          if step.id

            selectedIds.push step.id

      )

    )

    return selectedIds





