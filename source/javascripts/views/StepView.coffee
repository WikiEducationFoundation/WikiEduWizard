
#########################################################
# Title:  StepView
# Author: kevin@wintr.us @ WINTR
#########################################################


application = require( '../App' )
View = require('../views/supers/View')
InputItemView = require('../views/InputItemView')
StepTemplate = require('../templates/StepTemplate.hbs')
IntroStepTemplate = require('../templates/IntroStepTemplate.hbs')
InputTipTemplate = require('../templates/InputTipTemplate.hbs')
CourseInfoTemplate = require('../templates/CourseInfoTemplate.hbs')
CourseInfoData = require('../data/CourseInfoData')

module.exports = class StepView extends View

  className: 'step'

  tagName: 'section'

  template: StepTemplate

  introTemplate: IntroStepTemplate

  tipTemplate: InputTipTemplate

  courseInfoTemplate: CourseInfoTemplate

  courseInfoData: CourseInfoData

  events:
    'click input' : 'inputHandler'
    'click #publish' : 'publishHandler'
    'click .step-info-tip__close' : 'hideTips'
    'click #beginButton' : 'beginHandler'
    'click .step-info .step-info-section--accordian' : 'accordianClickHandler'

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
    console.log 'render'
    @tipVisible = false
    if @model.get('stepNumber') == 1
      @$el.addClass('step--first').html( @introTemplate( @model.attributes ) )
    else
      @$el.html( @template( @model.attributes ) )


    @inputSection = @$el.find('.step-form-inner')
    @$tipSection = @$el.find('.step-info-tips')

    @inputData = @model.attributes.inputs


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



    # attribute = $target.data('model')
    # console.log $target
    # @model.set(attribute, $target.is(':checked'))

    
    

 

