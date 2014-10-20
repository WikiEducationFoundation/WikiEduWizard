
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

#TEMPLATES
StepTemplate = require('../templates/steps/StepTemplate.hbs')
IntroStepTemplate = require('../templates/steps/IntroStepTemplate.hbs')
OutroStepTemplate = require('../templates/steps/OutroStepTemplate.hbs')

InputTipTemplate = require('../templates/steps/info/InputTipTemplate.hbs')
CourseTipTemplate = require('../templates/steps/info/CourseTipTemplate.hbs')
WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs')

#DATA
CourseInfoData = require('../data/CourseInfoData')

module.exports = class StepView extends View

  className: 'step'

  tagName: 'section'

  template: StepTemplate

  introTemplate: IntroStepTemplate

  outroTemplate: OutroStepTemplate

  tipTemplate: InputTipTemplate

  courseInfoTemplate: CourseTipTemplate

  courseInfoData: CourseInfoData

  datesModule: WikiDatesModule

  events:
    'click input' : 'inputHandler'
    'click #publish' : 'publishHandler'
    'click .step-info-tip__close' : 'hideTips'
    'click #beginButton' : 'beginHandler'
    'click .step-info .step-info-section--accordian' : 'accordianClickHandler'
    'click .edit-button' : 'editClickHandler'

  editClickHandler: (e) ->
    stepId = $(e.currentTarget).attr('data-step-id')
    if stepId
      Backbone.Mediator.publish('step:goto', stepId)

  accordianClickHandler: (e) ->
    $target = $(e.currentTarget)

    if $target.hasClass('open')
      $target.removeClass('open')

    else if $('.step-info-section--accordian').hasClass('open')
      @$el.find('.step-info').find('.step-info-section--accordian').removeClass('open')

      setTimeout(=>
        $target.addClass('open')
      ,500)

    else
      $target.addClass('open')

  

  publishHandler: ->
    Backbone.Mediator.publish('wizard:publish')
  
  render: ->

    @tipVisible = false

    if @model.get('stepNumber') == 1
      @$el.addClass('step--first').html( @introTemplate( @model.attributes ) )

      #ADD START/END DATES MODULE
      $dates = $(@datesModule())
      @$el.find('.step-form-dates').html($dates)
      
    else
      @$el.html( @template( @model.attributes ) )


    @inputSection = @$el.find('.step-form-inner')
    @$tipSection = @$el.find('.step-info-tips')

    @inputData = @model.attributes.inputs

    if @model.attributes.id
      if @model.attributes.id == "grading"
        console.log "grading section"
      else if @model.attributes.id == "overview"
        console.log "overview section"


    _.each(@inputData, (input, index) =>

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
    return @

  hide: ->
    @$el.hide()

    return @

  show: ->
    @$el.show()

    return @

  beginHandler: ->
    Backbone.Mediator.publish('step:next')

  inputHandler: (e) ->
    $target = $(e.currentTarget)
    $parent = $target.parents('.custom-input')
    
    if $parent.data('exclusive')
      if $target.is(':checked') 
        @$inputContainers.not($parent).addClass('disabled')
      else
        @$inputContainers.find('input').not($target).prop('checked', false)
        @$inputContainers.not($parent).removeClass('disabled')
    else
      $exclusive = @$el.find('[data-exclusive="true"]')

      if $exclusive.length > 0
        if $target.is(':checked')
          $exclusive.addClass('disabled')
        else
          $exclusive.removeClass('disabled')

  hideTips: (e) ->
    $('.step-info-tip').removeClass('visible')
    $('.custom-input-wrapper').removeClass('selected')




    
    

 

