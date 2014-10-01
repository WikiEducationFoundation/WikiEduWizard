Step = require('../models/Step')

module.exports = class Steps extends Backbone.Collection
  model: Step

  showStep: (title) ->
    _.each @where(title: title), (step) ->
      step.toggleActive()
