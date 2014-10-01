Steps = require './collections/Steps'
BaseModule = require '../BaseModule'
WizardData = require('../../data/WizardData')

module.exports = class StepModule extends BaseModule
  initialize: ->
    @MainView = require './views/StepsComposite'

    console.log 'Initializing StepModule'
    @startWithParent = true

    @collection = new Steps(WizardData)

    @app.router.processAppRoutes @, {
      'step/:title': 'showStep'
    }

  onStart: ->
    super()
    console.log 'Starting StepModule'

  onStop: ->
    console.log 'Stopping StepModule'

  showStep: (text) ->
    @collection.showStep(text)
