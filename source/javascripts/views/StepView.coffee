
#########################################################
# Title:  StepView
# Author: kevin@wintr.us @ WINTR
#########################################################

#########APP#########
application = require( '../app' )

#########VIEW CLASS#########
View = require('../views/supers/View')

#########SUBVIEWS#########
InputItemView = require('../views/InputItemView')


DateInputView = require('../views/DateInputView')


GradingInputView = require('../views/GradingInputView')


OverviewView = require('../views/OverviewView')


#########TEMPLATES###########
StepTemplate = require('../templates/steps/StepTemplate.hbs')


IntroStepTemplate = require('../templates/steps/IntroStepTemplate.hbs')


InputTipTemplate = require('../templates/steps/info/InputTipTemplate.hbs')


CourseTipTemplate = require('../templates/steps/info/CourseTipTemplate.hbs')


WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs')

##########DATA#########
CourseInfoData = require('../data/WizardCourseInfo')

#########INPUTS#########
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


  validateDates: ->

    unless @isFirstStep or @isLastStep

      return false

    datesAreValid = false

    if WizardStepInputs.course_details.start_date != '' and WizardStepInputs.course_details.end_date != ''
      datesAreValid = true

    return datesAreValid


  accordianClickHandler: (e) ->

    $target = $(e.currentTarget)

    $target.toggleClass('open')


  publishHandler: (e) ->

    e.preventDefault()

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


      $dates = $(@datesModule({title: dateTitle}))


      @$el.find('.step-form-dates').html($dates)

    return @


  _renderInputsAndInfo: ->

    @inputSection = @$el.find('.step-form-inner')

    @$tipSection = @$el.find('.step-info-tips')

    if @model.attributes.id is 'grading'

      pathways = application.homeView.selectedPathways

      numberOfPathways = pathways.length

      if numberOfPathways > 1

        distributedValue = Math.floor(100/numberOfPathways)

        @inputData = []

        _.each(pathways, (pathway) =>

          gradingData = WizardStepInputs[@model.attributes.id][pathway]

          _.each(gradingData, (gradeItem) =>

            gradeItem.value = distributedValue

            @inputData.push gradeItem

          )

        )

      else

        @inputData = WizardStepInputs[@model.attributes.id][pathways[0]] || []

    else

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

    if @model.attributes.id is 'grading' || @model.attributes.type is 'grading'

      @gradingView = new GradingInputView()

      @gradingView.parentStepView = @

      @$el.find('.step-form-content').append(@gradingView.getInputValues().render().el)

    if @model.attributes.id is 'overview'

      $innerEl = @$el.find('.step-form-inner')

      $innerEl.html('')

      @overviewView = new OverviewView(
        el: $innerEl
      )

      @overviewView.parentStepView = @

      @overviewView.render()

    return @


  hide: ->

    @$el.hide()

    return @


  show: ->

    $('body, html').animate(
      scrollTop: 0
    ,1)

    if @model.attributes.id is 'overview' || @model.attributes.type is 'overview'

      @render().$el.show()

      application.homeView.timelineView.update()

    else if @model.attributes.id is 'grading' || @model.attributes.type is 'grading'

      @render().$el.show()

    else

      @$el.show()

    @hasUserVisited = true

    return @


  beginHandler: (e) ->
    e.preventDefault()

    Backbone.Mediator.publish('step:next')


  updateUserHasAnswered: (id, value, type) ->


    inputItems = WizardStepInputs[@model.id]

    requiredSelected = false

    if type is 'percent'

      @hasUserAnswered = true

      return @

    _.each(inputItems, (item) =>

      if item.type is 'checkbox'

        if item.ignoreValidation

          requiredSelected = true

          return

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

    WizardStepInputs[@model.id][id].overviewLabel = WizardStepInputs[@model.id][id].options[index].overviewLabel

    WizardStepInputs[@model.id][id].selected = index



  updateAnswer: (id, value, hasPathway, pathway) ->

    if hasPathway

      inputType = WizardStepInputs[@model.id][pathway][id].type 

      isExclusive = false

    else

      inputType = WizardStepInputs[@model.id][id].type 

      isExclusive = false || WizardStepInputs[@model.id][id].exclusive 


    hasExclusiveSibling = false

    _.each(WizardStepInputs[@model.id], (inputItem) =>

      if inputItem.exclusive

        hasExclusiveSibling = true

    )

    out = 

      type: inputType

      id: id

      value: value

    if inputType == 'radioBox' || inputType == 'checkbox'

      if value == 'on'

        if hasPathway

          WizardStepInputs[@model.id][pathway][id].selected = true

        else

          WizardStepInputs[@model.id][id].selected = true

        if hasExclusiveSibling && !isExclusive

          @$el.find('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable')

        else if isExclusive

          @$el.find('.custom-input--checkbox').not('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable')

        if @model.id is 'assignment_selection'
          
          application.homeView.updateSelectedPathway('add', id)

      else

        if hasPathway

          WizardStepInputs[@model.id][pathway][id].selected = false

        else

          WizardStepInputs[@model.id][id].selected = false

        if hasExclusiveSibling && !isExclusive

          allOthersDisengaged = true

          @$el.find('.custom-input--checkbox').each(->

            if !$(this).attr('data-exclusive') && $(this).hasClass('checked')

              allOthersDisengaged = false

          )

          if allOthersDisengaged

            @$el.find('.custom-input--checkbox[data-exclusive="true"]').removeClass('not-editable').addClass('editable')

          else

            @$el.find('.custom-input--checkbox[data-exclusive="true"]').addClass('not-editable').removeClass('editable')

        else if isExclusive

          @$el.find('.custom-input--checkbox').not('.custom-input--checkbox[data-exclusive="true"]').removeClass('not-editable').addClass('editable')

        if @model.id is 'assignment_selection'
          
          application.homeView.updateSelectedPathway('remove', id)

    else if inputType == 'text' || inputType == 'percent'

      if hasPathway

        WizardStepInputs[@model.id][pathway][id].value = value

      else

        WizardStepInputs[@model.id][id].value = value


    return @


  hideTips: (e) ->

    $('.step-info-tip').removeClass('visible')

    $('.custom-input-wrapper').removeClass('selected')

    $('body').removeClass('tip-open')




    
    

 

