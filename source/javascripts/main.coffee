#########################################################
# Title:  WIKIEDU - Application Inititializer
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require('./App')
mainView = require('./views/MainView')

$ ->
  
  # Initialize Application
  application.initialize()

  # Start Backbone router
  Backbone.history.start()