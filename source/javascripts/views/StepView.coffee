
#########################################################
# Title:  StepView
# Author: kevin@wintr.us @ WINTR
#########################################################


application = require( '../App' )
View = require('../views/supers/View')
template = require('../templates/StepTemplate.hbs')


module.exports = class StepView extends View

  className: 'step'

  template: template

  events:
    'click input' : 'inputHandler'

  
  render: ->
    @$el.html( @template( @model.attributes ) )

    @afterRender()
    return @

  afterRender: ->
    @$doneButton = @$el.find('input.done').first()
    @model.on 'change', =>
      Backbone.Mediator.publish('step:updated', @)

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
    

 

