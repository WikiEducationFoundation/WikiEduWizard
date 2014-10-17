#########################################################
# Title:  InputItemView
# Author: kevin@wintr.us @ WINTR
#########################################################



View = require('../views/supers/View')
InputItemTemplate = require('../templates/InputItemTemplate.hbs')

module.exports = class InputItemView extends View 

  template: InputItemTemplate

  className: 'custom-input-wrapper'

  hoverTime: 500

  events: 
    'change input' : 'itemChangeHandler'
    'keyup input[type="text"]' : 'itemChangeHandler'
    'label click' : 'labelClickHandler'
    'mouseover' : 'mouseoverHandler'
    'mouseenter label' : 'hideShowTooltip'
    'click' : 'hideShowTooltip'
    'mouseout' : 'mouseoutHandler'
    'click .check-button' : 'checkButtonClickHandler'
    'focus .custom-input--text input' : 'onFocus'
    'blur .custom-input--text input' : 'onBlur'


  #--------------------------------------------------------
  # Event Handlers
  #--------------------------------------------------------

  checkButtonClickHandler: ->
    # $inputItem = @$el.find('input')
    @$el.toggleClass('checked')
    
    if @$el.hasClass('checked')
      console.log 'yup'
      @$inputEl.prop('checked', true)
      console.log @$inputEl.prop('checked')
      console.log @$inputEl.is(':checked')
      @$inputEl.val('on')
      @$inputEl.trigger('change')

      # $inputItem.trigger('change')
    else
      console.log 'nope'
      @$inputEl.prop('checked', false)
      @$inputEl.val('off')
      console.log @$inputEl.prop('checked') 
      console.log @$inputEl.is(':checked')
      @$inputEl.trigger('change')
      # $inputItem.trigger('change')
    # if $inputItem.is(':checked')
    #   @$el.removeClass('checked')
    #   $inputItem.prop('checked', false)
    #   $inputItem.trigger('change')
    # else 
    #   @$el.addClass('checked')
    #   $inputItem.prop('checked', true)
    #   $inputItem.trigger('change')

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
    console.log value
    if @$el.find('input').is(':checked')
      @$el.addClass('checked')
    else
      @$el.removeClass('checked')

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

  getInputTypeObject: ->
    returnData = {}
    returnData[@inputType] = true
    return returnData



  ## THE FOLLOWING IS MEANT TO ILLUSTRATE THE DIFFERENT DATA SCHEMA FOR THE VARIOUS INPUT TEMPLATES
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

    # else if @inputType == 'checkboxGroup'
    #   return {
    #     type: inputTypeObject
    #     data: {
    #       id: 'checkgroup1'
    #       label: 'CHECKBOX GROUP'
    #       options: [
    #         {
    #           id: 'item1'
    #           label: 'Item 1'
    #           selected: true
    #         }
    #         {
    #           id: 'item2'
    #           label: 'Item 2'
    #           selected: false
    #         }
    #         {
    #           id: 'item3'
    #           label: 'Item 3'
    #           selected: false
    #         }
    #         {
    #           id: 'item4'
    #           label: 'Item 4'
    #           selected: true
    #         }
    #         {
    #           id: 'item5'
    #           label: 'Item 5'
    #           selected: false
    #         }

    #       ]
    #     }
    #   }
    # else if @inputType == 'select'
    #   return {
    #     type: inputTypeObject
    #     data: {
    #       id: 'Select1'
    #       multiple: true
    #       label: 'SELECT GROUP 1'
    #       options: [
    #         {
    #           label: 'Item 1'
    #           value: 'item1'
    #         }
    #         {
    #           label: 'Item 2'
    #           value: 'item2'
    #         }
    #         {
    #           label: 'Item 3'
    #           value: 'item3'
    #         }
    #         {
    #           label: 'Item 4'
    #           value: 'item4'
    #         }
    #         {
    #           label: 'Item 5'
    #           value: 'item5'
    #         }
    #         {
    #           label: 'Item 6'
    #           value: 'item6'
    #         }
    #       ]
    #     } 
    #   }
    
    # else if @inputType == 'textarea'
    #   return {
    #     type: inputTypeObject
    #     data: {
    #       id: 'textarea1'
    #       rows: '5'
    #       label: 'This is the Label'
    #       placeholder: 'placeholder'
    #     }
    #   }

  
      
    
      

    
