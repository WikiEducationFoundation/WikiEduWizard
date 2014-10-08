#########################################################
# Title:  InputItemView
# Author: kevin@wintr.us @ WINTR
#########################################################



View = require('../views/supers/View')
template = require('../templates/InputItemTemplate.hbs')

module.exports = class InputItemView extends View 
  template: template

  className: 'custom-input-wrapper'

  events: 
    'change input' : 'itemChangeHandler'
    'keyup input[type="text"]' : 'itemChangeHandler'
    'label click' : 'labelClickHandler'
    'mouseover' : 'hoverHandler'

  #--------------------------------------------------------
  # Event Handlers
  #--------------------------------------------------------

  hoverHandlers: (e) ->
    console.log e.target

  labelClickHandler: (e) ->
    return false

  itemChangeHandler: (e) ->
    
    value = $(e.currentTarget).val()

    if value.length > 0
      @$el.addClass('open')
    else
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
        data: @model
      }
    else if @inputType == 'radio'
      return {
        type: inputTypeObject
        data: @model
      }
    else if @inputType == 'text'
      return {
        type: inputTypeObject
        data: @model
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

  
      
    
      

    
