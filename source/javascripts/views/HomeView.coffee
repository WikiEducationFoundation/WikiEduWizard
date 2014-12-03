#########################################################
# Title:  HomeView
# Author: kevin@wintr.us @ WINTR
#########################################################

# APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
HomeTemplate = require('../templates/HomeTemplate.hbs')

OutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs')

#SUBVIEWS
StepView = require('../views/StepView')

StepModel = require('../models/StepModel')

StepNavView = require('../views/StepNavView')

TimelineView = require('../views/TimelineView')

#INPUTS
WizardStepInputs = require('../data/WizardStepInputs')




module.exports = class HomeView extends View

  #--------------------------------------------------------
  # SETUP
  #--------------------------------------------------------

  className: 'home-view'


  template: HomeTemplate


  stepData: 

    intro: application.WizardConfig.intro_steps

    pathways: application.WizardConfig.pathways

    outro: application.WizardConfig.outro_steps


  pathwayIds: ->

    return _.keys(@stepData.pathways)

  stepViews: []


  allStepViews:

    intro: []

    pathway: []

    outro: []


  selectedPathways: []


  #--------------------------------------------------------
  # INIT
  #--------------------------------------------------------

  initialize: ->

    @StepNav = new StepNavView()

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

    @$stepsContainer = @$el.find('.steps')

    @$innerContainer = @$el.find('.content')

    @renderIntroSteps()

    @renderSteps()

    @StepNav.stepViews = @stepViews

    @StepNav.totalSteps = @stepViews.length

    @$innerContainer.append(@StepNav.el)

    if @stepViews.length > 0

      @showCurrentStep()

    setTimeout(=>
      @timelineView = new TimelineView()
    ,1000)
    

    
    return @

  renderIntroSteps: ->

    stepNumber = 0

    _.each(@stepData.intro,(step, index) =>

      newmodel = new StepModel()

      _.map(step,(value, key, list) -> 

        newmodel.set(key,value)

      )

      newview = new StepView(

        model: newmodel

      )

      newview.model.set('stepNumber', stepNumber + 1)

      newview.model.set('stepIndex', stepNumber )

      if index is 0

        newview.isFirstStep = true

      @$stepsContainer.append(newview.render().hide().el)

      newview.$el.addClass("step--#{step.id}")

      @stepViews.push(newview)

      @allStepViews.intro.push(newview)

      stepNumber++

    )

    return @

  renderSteps: ->

    @allStepViews.pathway = []

    stepNumber = @stepViews.length

    _.each(@selectedPathways, (pid, pindex) =>

      _.each(@stepData.pathways[pid],(step, index) =>

        if @selectedPathways.length > 1

          if step.id is 'grading' || step.id is 'overview' || step.type is 'grading' || step.type is 'overview'

            if pindex < @selectedPathways.length - 1

              return 

        newmodel = new StepModel()

        _.map(step,(value, key, list) -> 

          newmodel.set(key,value)

        )

        newview = new StepView(

          model: newmodel

        )

        newview.model.set('stepNumber', stepNumber + 1)

        newview.model.set('stepIndex', stepNumber )

        @$stepsContainer.append(newview.render().hide().el)

        newview.$el.addClass("step--#{step.id}")

        newview.$el.addClass("step-pathway step-pathway--#{pid}")

        @stepViews.push(newview)

        @allStepViews.pathway.push(newview)

        stepNumber++

      )
    
    )

    return @

  renderOutroSteps: ->

    @allStepViews.outro = []

    stepNumber = @stepViews.length

    _.each(@stepData.outro,(step, index) =>

      newmodel = new StepModel()

      _.map(step,(value, key, list) -> 

        newmodel.set(key,value)

      )

      newview = new StepView(

        model: newmodel

      )

      newview.model.set('stepNumber', stepNumber + 1)

      newview.model.set('stepIndex', stepNumber )

      if index is @stepData.outro.length - 1

        newview.isLastStep = true

      @$stepsContainer.append(newview.render().hide().el)

      newview.$el.addClass("step--#{step.id}")

      @stepViews.push(newview)

      @allStepViews.outro.push(newview)

      stepNumber++

    )

    return @



  recreatePathway: ->

    clone = @stepViews

    @stepViews = [clone[0], clone[1]]

    _.each(@allStepViews.pathway, (step) ->

      step.remove()

    )

    _.each(@allStepViews.outro, (step) ->

      step.remove()

    )

    @renderSteps()

    @renderOutroSteps()

    @StepNav.stepViews = @stepViews

    @StepNav.totalSteps = @stepViews.length

    @$innerContainer.append(@StepNav.el)



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


  updateSelectedPathway: (action, pathwayId) ->

    if action is 'add'

      if pathwayId is 'researchwrite'

        @selectedPathways = [pathwayId]

      else

        @selectedPathways.push(pathwayId)

    else if action is 'remove'

      if pathwayId is 'researchwrite'

        @selectedPathways = []

      else

        removeIndex = _.indexOf(@selectedPathway, pathwayId)

        @selectedPathways.splice(removeIndex)

    @recreatePathway()

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

    if id is 'assignment_selection'
      x = confirm('Are you sure you want to start the process over with a new assignment type?')
      if !x
        return

    else       

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





