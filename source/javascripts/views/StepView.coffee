
#########################################################
# Title:  StepView
# Author: kevin@wintr.us @ WINTR
#########################################################

#APP
application = require( '../App' )

#VIEW CLASS
View = require('../views/supers/View')

#SUBVIEWS
InputItemView = require('../views/InputItemView')

DateInputView = require('../views/DateInputView')

GradingInputView = require('../views/GradingInputView')

#TEMPLATES
StepTemplate = require('../templates/steps/StepTemplate.hbs')

IntroStepTemplate = require('../templates/steps/IntroStepTemplate.hbs')

InputTipTemplate = require('../templates/steps/info/InputTipTemplate.hbs')

CourseTipTemplate = require('../templates/steps/info/CourseTipTemplate.hbs')

WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs')


#DATA
CourseInfoData = require('../data/WizardCourseInfo')

#OUTPUT
AssignmentData = require('../data/WizardAssignmentData')

#INPUTS
WizardStepInputs = require('../data/WizardStepInputs')



module.exports = class StepView extends View


  className: 'step'


  tagName: 'section'


  template: StepTemplate


  introTemplate: IntroStepTemplate


  tipTemplate: InputTipTemplate


  courseInfoTemplate: CourseTipTemplate


  courseInfoData: CourseInfoData


  datesModule: WikiDatesModule


  hasUserAnswered: false


  hasUserVisited: false


  isLastStep: false


  isFirstStep: false


  #--------------------------------------------------------
  # EVENTS AND HANDLERS
  #--------------------------------------------------------

  events:

    'click #publish' : 'publishHandler'

    'click .step-info-tip__close' : 'hideTips'

    'click #beginButton' : 'beginHandler'

    'click .step-info .step-info-section--accordian' : 'accordianClickHandler'

    'click .edit-button' : 'editClickHandler'

    # 'click .step-info-tip' : 'hideTips'

  subscriptions: 

    'tips:hide' : 'hideTips'

    'date:change' : 'isIntroValid'



  editClickHandler: (e) ->

    stepId = $(e.currentTarget).attr('data-step-id')

    if stepId

      Backbone.Mediator.publish('step:edit', stepId)

  stepId: ->

    return @model.attributes.id


  validateDates: (dateView) ->

    unless @isFirstStep or @isLastStep

      return false

    datesAreValid = false

    _.each(@dateViews, (dateView) =>
      if dateView.isValid()
        datesAreValid = true
      else 
        datesAreValid = false
    )

    return datesAreValid





  accordianClickHandler: (e) ->

    $target = $(e.currentTarget)

    $target.toggleClass('open')


  publishHandler: ->

    Backbone.Mediator.publish('wizard:publish')


  render: ->

    @tipVisible = false

    if @isFirstStep

      @_renderStepType('first')



    else if @isLastStep

      @_renderStepType('last')
      
    else

      @_renderStepType('standard')

    @_renderInputsAndInfo()

    return @afterRender()


  _renderStepType: (type) ->

    if type is 'standard'

      @$el.html( @template( @model.attributes ) )

    else if type is 'first' or type is 'last'

      if type is 'first'

        @$el.addClass('step--first').html( @introTemplate( @model.attributes ) )

        dateTitle = 'Course dates'

        @$beginButton = @$el.find('a#beginButton')

      else

        @$el.addClass('step--last').html( @template( @model.attributes ) )

        dateTitle = 'Assignment timeline'

      @dateViews = []

      $dates = $(@datesModule({title: 'Course dates'}))

      $dateInputs = $dates.find('.custom-select')

      self = @

      $dateInputs.each((inputElement) ->

        newDateView = new DateInputView(

          el: $(this) 

        )

        newDateView.parentStepView = self

        self.dateViews.push(newDateView)
      
      )

      @$el.find('.step-form-dates').html($dates)

    return @

    

  _renderInputsAndInfo: ->

    @inputSection = @$el.find('.step-form-inner')

    @$tipSection = @$el.find('.step-info-tips')

    @inputData = WizardStepInputs[@model.attributes.id] || []

    _.each(@inputData, (input, index) =>

      unless input.type 

        return

      if input.selected && input.required

        @hasUserAnswered = true

      else if input.selected 

        @hasUserAnswered = true

      else if input.required is false

        @hasUserAnswered = true

      else if input.type is 'percent'

        @hasUserAnswered = true



      inputView = new InputItemView(

        model: new Backbone.Model(input)

      )

      inputView.inputType = input.type

      inputView.itemIndex = index

      inputView.parentStep = @

      @inputSection.append(inputView.render().el)

      if input.tipInfo

        tip = 

          id: index

          title: input.tipInfo.title

          content: input.tipInfo.content

        $tipEl = @tipTemplate(tip)

        @$tipSection.append($tipEl)

        inputView.$el.addClass('has-info')

      else if input.hasCourseInfo

        infoData = _.extend(@courseInfoData[input.id], {id: index} )

        $tipEl = @courseInfoTemplate(infoData)

        @$tipSection.append($tipEl)

        inputView.$el.addClass('has-info')

    )
    return @

  afterRender: ->

    @$inputContainers = @$el.find('.custom-input')

    if @model.attributes.id is 'grading'

      @gradingView = new GradingInputView()

      @gradingView.parentStepView = @

      @$el.find('.step-form-content').append(@gradingView.getInputValues().render().el)

    return @


  hide: ->

    @$el.hide()

    return @


  show: ->

    @$el.show()

    @hasUserVisited = true

    return @


  beginHandler: ->

    Backbone.Mediator.publish('step:next')


  updateUserAnswer: (id, value, type) ->

    inputItems = WizardStepInputs[@model.id]

    requiredSelected = false



    if type is 'percent'

      @hasUserAnswered = true

      return @


    _.each(inputItems, (item) =>

      if item.type is 'checkbox'

        if item.required is true

          if item.selected is true

            requiredSelected = true

        else

          requiredSelected = true

    )

    if requiredSelected is true

      @hasUserAnswered = true

    else if type is 'radioGroup' or type is 'radioBox'

      @hasUserAnswered = true

    else if type is 'text'

      if @isFirstStep

        _.each(inputItems, (item) =>

          if item.type is 'text'

            if item.required is true

              if item.value != ''

                requiredSelected = true

              else 

                requiredSelected = false

        )

        if requiredSelected

          @hasUserAnswered = true

        else 

          @hasUserAnswered = false

        @isIntroValid()


    else 

      @hasUserAnswered = false
  

    Backbone.Mediator.publish('step:answered', @)

    return @



  isIntroValid: ->

    unless @isFirstStep or @isLastStep

      return false

    if @isFirstStep

      if @hasUserAnswered and @validateDates()

        @$beginButton.removeClass('inactive')

      else

        @$beginButton.addClass('inactive')




  updateRadioAnswer: (id, index, value) ->

    inputType = WizardStepInputs[@model.id][id].type 

    WizardStepInputs[@model.id][id].options[index].selected = value

    WizardStepInputs[@model.id][id].value = WizardStepInputs[@model.id][id].options[index].value

    WizardStepInputs[@model.id][id].selected = index



  updateAnswer: (id, value) ->

    inputType = WizardStepInputs[@model.id][id].type 

    out = 

      type: inputType

      id: id

      value: value

    if inputType == 'radioBox' || inputType == 'checkbox'

      if value == 'on'

        WizardStepInputs[@model.id][id].selected = true

      else

        WizardStepInputs[@model.id][id].selected = false


    else if inputType == 'text' || inputType == 'percent'

      WizardStepInputs[@model.id][id].value = value


    return @


  hideTips: (e) ->

    $('.step-info-tip').removeClass('visible')

    $('.custom-input-wrapper').removeClass('selected')

    $('body').removeClass('tip-open')




    
    

 

