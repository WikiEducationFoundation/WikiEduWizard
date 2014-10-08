
#########################################################
# Title:  StepView
# Author: kevin@wintr.us @ WINTR
#########################################################


application = require( '../App' )
View = require('../views/supers/View')
InputItemView = require('../views/InputItemView')
template = require('../templates/StepTemplate.hbs')


module.exports = class StepView extends View

  className: 'step'

  tagName: 'section'

  template: template

  events:
    'click input' : 'inputHandler'

  
  render: ->
    @$el.html( @template( @model.attributes ) )

    @inputSection = @$el.find('.step-form-inner')
    @inputData = @model.attributes.inputs


    _.each(@inputData, (input) =>
      inputView = new InputItemView(
        model: input
      )
      inputView.inputType = input.type
      @inputSection.append(inputView.render().el)
    )

    @afterRender()
    

  afterRender: ->
    @$inputContainers = @$el.find('.custom-input')
    # @$doneButton = @$el.find('input.done').first()
    # @model.on 'change', =>
    #   Backbone.Mediator.publish('step:updated', @)
    return @

  hide: ->
    @$el.hide()

    return @

  show: ->
    @$el.show()

    return @

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



    # attribute = $target.data('model')
    # console.log $target
    # @model.set(attribute, $target.is(':checked'))

    
    

 

