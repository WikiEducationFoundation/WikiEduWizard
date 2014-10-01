###
 * Application Initializer
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since  
 ###

application = require('./App')

$ ->
  
  # Initialize Application
  application.initialize()

  # Start Backbone router
  Backbone.history.start()