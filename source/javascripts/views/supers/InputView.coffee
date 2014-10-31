#########################################################
# Title:  InputItemView
# Author: kevin@wintr.us @ WINTR
#########################################################

#APP
application = require( '../../App' )

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

  tipVisible: false


  #--------------------------------------------------------
  # Events
  #--------------------------------------------------------

  events: 

    'change input' : 'itemChangeHandler'

    'keyup input[type="text"]' : 'itemChangeHandler'

    'keyup input[type="percent"]' : 'itemChangeHandler'

    'click .custom-input--checkbox label span' : 'checkButtonClickHandler'

    'click .info-icon' : 'infoIconClickHandler'

    'mouseover' : 'mouseoverHandler'

    'mouseenter label' : 'hideShowTooltip'

    'mouseover .custom-input' : 'hideShowTooltip'

    'mouseenter .check-button' : 'hideShowTooltip'

    'mouseout' : 'mouseoutHandler'

    'click .editable .check-button' : 'checkButtonClickHandler'

    'click .custom-input--radiobox .radio-button' : 'radioBoxClickHandler'

    'click .custom-input--radio-group .radio-button' : 'radioButtonClickHandler'

    'focus .custom-input--text input' : 'onFocus'

    'blur .custom-input--text input' : 'onBlur'


  infoIconClickHandler: ->

    unless @$el.hasClass('selected')
      @showTooltip()
    else
      $('body, html').animate(
        scrollTop: 0
      ,500)

  radioButtonClickHandler: (e) ->
    e.preventDefault()

    if @isDisabled()
      return false

    $button = $(e.currentTarget)

    $parentEl = $button.parents('.custom-input--radio')

    $parentGroup = $button.parents('.custom-input-wrapper')

    $inputEl = $parentEl.find('input[type="radio"]')


    if $parentEl.hasClass('checked')

      Backbone.Mediator.publish('tips:hide')

      return false

    else

      $otherRadios = $parentGroup.find('.custom-input--radio').not($parentEl[0])

      $otherRadios.find('input[type="radio"]').prop('checked', false).trigger('change')

      $otherRadios.removeClass('checked')

      $parentEl.addClass('checked')

      $inputEl.prop('checked', true)

      $inputEl.trigger('change')



  radioBoxClickHandler: (e) ->

    e.preventDefault()

    if @isDisabled()

      return false

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

    if @isDisabled()

      return false

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

    if @hasInfo() && @parentStep.tipVisible == false

      @$el.addClass('selected')

      @parentStep.tipVisible = true

      $('body').addClass('tip-open')

      @parentStep.$el.find(".step-info-tip").removeClass('visible')

      @parentStep.$el.find(".step-info-tip[data-item-index='#{@itemIndex}']").addClass('visible')


  hideTooltip: ->

    if @hasInfo()

      @$el.removeClass('selected')

      $('body').removeClass('tip-open')

      @parentStep.tipVisible = false

      @parentStep.$el.find(".step-info-tip").removeClass('visible') 


  hideShowTooltip: ->

    if @$el.find('.custom-input').hasClass('not-editable')

      return false

    $('.custom-input-wrapper').removeClass('selected')

    @parentStep.tipVisible = false

    $('body').removeClass('tip-open')

    @parentStep.$el.find(".step-info-tip").removeClass('visible')

    @showTooltip()


  labelClickHandler: (e) ->
    return false


  itemChangeHandler: (e) ->
    
    # Backbone.Mediator.publish('answer:updated', inputId, value)

    if @inputType == 'radioGroup'

      $target = $(e.currentTarget)

      index = $(e.currentTarget).attr('id')

      value = $(e.currentTarget).attr('value')

      parentId = $(e.currentTarget).attr('name')

      if $(e.currentTarget).prop('checked')

        @parentStep.updateRadioAnswer(parentId, index, true)

      else

        @parentStep.updateRadioAnswer(parentId, index, false)

    else

      value = $(e.currentTarget).val()

      inputId = $(e.currentTarget).attr('id')

      @parentStep.updateAnswer(inputId, value)

      if @inputType == 'percent'

        if isNaN(parseInt(value))

          $(e.currentTarget).val('')

          return

        else

          Backbone.Mediator.publish('grade:change', inputId, value)
    
    return @parentStep.updateUserAnswer(inputId, value, @inputType)


  #--------------------------------------------------------
  # Private Methods
  #--------------------------------------------------------

  afterRender: ->

    @$el.addClass(@inputType)

    @$inputEl = @$el.find('input')

    if @model.attributes.value != '' && @model.attributes.type == 'text'
      
      @$el.addClass('open')

    @hoverTimer = null

    @isHovering = false



  hasInfo: ->

    return @$el.hasClass('has-info')


  onFocus: (e) ->

    @$el.addClass('open')


  onBlur: (e) ->

    $target = $(e.currentTarget)

    value = $target.val()

    if value == ''

      unless $target.is(':focus')

        @$el.removeClass('open')


  isDisabled: ->

    return @$el.find('.custom-input').hasClass('not-editable')



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

      if @parentStep.model.attributes.id is 'grading'

        if @model.attributes.contingentUpon.length != 0

          currentSelected = application.homeView.getSelectedIds()

          renderInOutput = false

          _.each(@model.attributes.contingentUpon, (id) =>

            _.each(currentSelected, (selectedId) =>

              if id is selectedId

                renderInOutput = true

            )

          )

          unless renderInOutput

            return false



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

      allInputs = WizardStepInputs[@model.attributes.id]

      selectedInputs = []

      _.each(allInputs, (input) =>

        if input.type

          if input.type is 'checkbox' || input.type is 'radioBox'

            if input.selected is true

              selectedInputs.push input.label

          else if input.type is 'radioGroup'

            if input.id is 'peer_reviews'

              selectedInputs.push input.overviewLabel

      )

      

      @$el.addClass('has-content')

      if selectedInputs.length == 0
        selectedInputs.push "[None selected]"

      return {

        assignments: selectedInputs

        type: inputTypeObject

        data: @model.attributes

      }

    else if @inputType == 'radioBox'

      return {

        type: inputTypeObject

        data: @model.attributes

      }
    else if @inputType == 'link'

      return {

        type: inputTypeObject

        data: @model.attributes

      }


  
      
    
      

    
