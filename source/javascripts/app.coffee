Marionette.Behaviors.behaviorsLookup = ->
  window.Behaviors

window.Behaviors = {}
window.Behaviors.Closeable = require './behaviors/Closeable'

ToggleableRegion = require './regions/ToggleableRegion'
AppLayout = require './views/AppLayout'
StepModule = require('./modules/step/StepModule')


class App extends Backbone.Marionette.Application
  initialize: =>
    console.log 'Initializing app...'

    @router = new Backbone.Marionette.AppRouter()

    @addInitializer( (options) =>
      (new AppLayout()).render()
    )

    @addInitializer( (options) =>
      @addRegions({ 
        stepRegion: {
          selector: "#steps"
          regionClass: ToggleableRegion
          module: @submodules.Step
        }
      })
    )

    @addInitializer( (options) =>
      Backbone.history.start()
      console.log Backbone.history
    )


    @module('Step', StepModule)



    @start({})

module.exports = App
