#########################################################
# Title:  InputItemView
# Author: kevin@wintr.us @ WINTR
#########################################################


# SUPER VIEW CLASS
View = require('./View')


#TEMPLATES
InputItemTemplate = require('../../templates/steps/inputs/InputItemTemplate.hbs')


#OUTPUT
AssignmentData = require('../../data/WizardAssignmentData')


WizardStepInputs = require('../../data/WizardStepInputs')




module.exports = class InputItemView extends View 


  template: InputItemTemplate


  className: 'custom-input-wrapper'


  hoverTime: 500


  #--------------------------------------------------------
  # Events
  #--------------------------------------------------------

  events: 
    'change input' : 'itemChangeHandler'

    'keyup input[type="text"]' : 'itemChangeHandler'

    'click .custom-input--checkbox label span' : 'checkButtonClickHandler'

    'mouseover' : 'mouseoverHandler'

    'mouseenter label span' : 'hideShowTooltip'

    'mouseout' : 'mouseoutHandler'

    'click .check-button' : 'checkButtonClickHandler'

    'click .custom-input--radiobox .radio-button' : 'radioBoxClickHandler'

    'click .custom-input--radio-group .radio-button' : 'radioButtonClickHandler'

    'focus .custom-input--text input' : 'onFocus'

    'blur .custom-input--text input' : 'onBlur'



  radioButtonClickHandler: (e) ->
    e.preventDefault()

    $target = $(e.currentTarget)

    $parentGroup = $target.parents('.custom-input-wrapper')

    $parentEl = $target.parents('.custom-input--radio')

    $inputEl = $parentEl.find('input[type="radio"]')

    if $parentEl.hasClass('checked')
      return false

    else
      $otherRadios = $parentGroup.find('.custom-input--radio')

      $otherRadios.removeClass('checked')

      $otherInputs = $otherRadios.find('input[type="text"]')

      $otherInputs.prop('checked', false)

      $inputEl.prop('checked', true)

      $parentEl.addClass('checked')

    Backbone.Mediator.publish('tips:hide')



  radioBoxClickHandler: (e) ->
    e.preventDefault()

    $otherRadios = @$el.parents('.step-form-inner').find('.custom-input--radiobox')

    $otherRadios.removeClass('checked').find('input').val('off').trigger('change')

    $parent = @$el.find('.custom-input--radiobox')
      .addClass('checked')

    if $parent.hasClass('checked')

      @$inputEl.prop('checked', true)

      @$inputEl.val('on')

      @$inputEl.trigger('change')

    else
      @$inputEl.prop('checked', false)

      @$inputEl.val('off')

      @$inputEl.trigger('change')




    Backbone.Mediator.publish('tips:hide')

    

  checkButtonClickHandler: (e) ->
    e.preventDefault()

    if @$el.find('.custom-input--radiobox').length > 0
      return @radioBoxClickHandler(e)

    $parent = @$el.find('.custom-input--checkbox')
      .toggleClass('checked')
    
    if $parent.hasClass('checked')

      @$inputEl.prop('checked', true)

      @$inputEl.val('on')

      @$inputEl.trigger('change')

    else
      @$inputEl.prop('checked', false)

      @$inputEl.val('off')

      @$inputEl.trigger('change')

    Backbone.Mediator.publish('tips:hide')



  hoverHandler: (e) ->
    console.log e.target



  mouseoverHandler: (e) ->
    @isHovering = true
      


  mouseoutHandler: (e) ->
    @isHovering = false



  showTooltip: ->
    if @hasInfo && @parentStep.tipVisible == false

      @$el.addClass('selected')

      @parentStep.tipVisible = true

      @parentStep.$el.find(".step-info-tip").removeClass('visible')

      @parentStep.$el.find(".step-info-tip[data-item-index='#{@itemIndex}']").addClass('visible')



  hideTooltip: ->
    if @hasInfo

      @$el.removeClass('selected')

      @parentStep.tipVisible = false

      @parentStep.$el.find(".step-info-tip").removeClass('visible') 



  hideShowTooltip: ->
    $('.custom-input-wrapper').removeClass('selected')

    @parentStep.tipVisible = false

    @parentStep.$el.find(".step-info-tip").removeClass('visible')

    @showTooltip()



  labelClickHandler: (e) ->
    return false



  itemChangeHandler: (e) ->
    value = $(e.currentTarget).val()

    inputId = $(e.currentTarget).attr('id')

    console.log value

    Backbone.Mediator.publish('answer:updated', inputId, value)

    @parentStep.updateUserAnswer(true)


    # if @$el.find('input').is(':checked')

    #   @$el.addClass('checked')

    # else

    #   @$el.removeClass('checked')


  #--------------------------------------------------------
  # Private Methods
  #--------------------------------------------------------

  afterRender: ->
    @$inputEl = @$el.find('input')

    @hoverTimer = null

    @isHovering = false



  hasInfo: ->
    return $el.hasClass('has-info')



  onFocus: (e) ->
    @$el.addClass('open')



  onBlur: (e) ->
    $target = $(e.currentTarget)

    value = $target.val()

    if value == ''
      unless $target.is(':focus')

        @$el.removeClass('open')



  #--------------------------------------------------------
  # Public Methods
  #--------------------------------------------------------

  render: ->
    super()



  getInputTypeObject: ->
    returnData = {}

    returnData[@inputType] = true

    return returnData



  getRenderData: ->
    inputTypeObject = @getInputTypeObject()


    if @inputType == 'checkbox'

      return {

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'radio'

      return {

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'text'

      return {

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'percent'

      return {

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'radioGroup'

      return {

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'edit'

      return {

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'radioBox'

      return {

        type: inputTypeObject

        data: @model.attributes

      }


  
      
    
      

    
