
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
    attribute = $target.data('model')
    console.log $target
    @model.set(attribute, $target.is(':checked'))

    
    

 

