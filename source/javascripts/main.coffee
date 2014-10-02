###
 * Application Initializer
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since  
 ###

application = require('./App')
mainView = require('./views/MainView')

$ ->
  
  # Initialize Application
  application.initialize()

  # mainView.initialize()

  # Start Backbone router
  Backbone.history.start()