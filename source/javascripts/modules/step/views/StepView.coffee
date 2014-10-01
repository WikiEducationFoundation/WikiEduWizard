module.exports = class StepView extends Backbone.Marionette.ItemView
  template: require './templates/step'
  className: ->
    'list-group-item' + if @model.get('active') then ' active' else ''

  ui:
    check: '.check'
    close: '.close'

  className: 'step'

  events:
    'click @ui.check': 'toggleCheck'
    'click @ui.close': 'removeStep'

  modelEvents:
    'change:done': 'render'
    'change:active': 'stepToggled'

  stepToggled: ->
    @$el.toggleClass('active')
    App.vent.trigger 'new:notification', "Selected/unselected step: " + @model.get('title')

  toggleCheck: ->
    @model.set('done', !@model.get('done'))
    App.vent.trigger 'new:notification', "Toggled step: " + @model.get('title')

  removeStep: ->
    @model.destroy()
    App.vent.trigger 'new:notification', "Removed step: " + @model.get('title')
