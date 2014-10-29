
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


  #--------------------------------------------------------
  # EVENTS AND HANDLERS
  #--------------------------------------------------------

  events:
    # 'click .step-form-inner input' : 'inputHandler'

    'click #publish' : 'publishHandler'

    'click .step-info-tip__close' : 'hideTips'

    'click #beginButton' : 'beginHandler'

    'click .step-info .step-info-section--accordian' : 'accordianClickHandler'

    'click .edit-button' : 'editClickHandler'

    'click .step-info-tip' : 'hideTips'



  editClickHandler: (e) ->

    stepId = $(e.currentTarget).attr('data-step-id')

    if stepId

      Backbone.Mediator.publish('step:edit', stepId)

  stepId: ->

    return @model.attributes.id



  accordianClickHandler: (e) ->

    $target = $(e.currentTarget)

    $target.toggleClass('open')

    # if $target.hasClass('open')

    #   $target.removeClass('open')

    # else if $('.step-info-section--accordian').hasClass('open')

    #   @$el.find('.step-info').find('.step-info-section--accordian').removeClass('open')

    #   setTimeout(=>

    #     $target.addClass('open')

    #   ,500)

    # else

    #   $target.addClass('open')



  publishHandler: ->

    Backbone.Mediator.publish('wizard:publish')


  
  render: ->

    @tipVisible = false

    if @model.get('stepNumber') == 1

      @$el.addClass('step--first').html( @introTemplate( @model.attributes ) )

      #ADD START/END DATES MODULE
      $dates = $(@datesModule({title: 'Course dates'}))

      $dateInputs = $dates.find('.custom-select')

      self = @

      $dateInputs.each(->

        dateView = new DateInputView(

          el: $(this) 

        )

        dateView.parentStepView = self
    
      )

      @$el.find('.step-form-dates').html($dates)

    else if @isLastStep

      @$el.addClass('step--last').html( @template( @model.attributes ) )

      $dates = $(@datesModule({title: 'Assignment timeline'}))

      $dateInputs = $dates.find('.custom-select')

      self = @

      $dateInputs.each(->

        dateView = new DateInputView(

          el: $(this) 

        )

        dateView.parentStepView = self
      
      )

      @$el.find('.step-form-dates').html($dates)
      
    else

      @$el.html( @template( @model.attributes ) )


    @inputSection = @$el.find('.step-form-inner')

    @$tipSection = @$el.find('.step-info-tips')

    @inputData = WizardStepInputs[@model.attributes.id] || []

    _.each(@inputData, (input, index) =>

      unless input.type 

        return

      if input.selected

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

    @afterRender()
    


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


  updateUserAnswer: (id,value) ->

    if value is 'on'

      @hasUserAnswered = true


    Backbone.Mediator.publish('step:answered', @)

    return @

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
    


  # inputHandler: (e) ->

  #   $target = $(e.currentTarget)

  #   $parent = $target.parents('.custom-input')
    
  #   if $parent.data('exclusive')

  #     if $target.is(':checked') 

  #       @$inputContainers.not($parent).addClass('disabled')

  #     else

  #       @$inputContainers.find('input').not($target).prop('checked', false)

  #       @$inputContainers.not($parent).removeClass('disabled')

  #   else

  #     $exclusive = @$el.find('[data-exclusive="true"]')

  #     if $exclusive.length > 0

  #       if $target.is(':checked')

  #         $exclusive.addClass('disabled')

  #       else

  #         $exclusive.removeClass('disabled')



  hideTips: (e) ->
    $('.step-info-tip').removeClass('visible')

    $('.custom-input-wrapper').removeClass('selected')

    $('body').removeClass('tip-open')




    
    

 

