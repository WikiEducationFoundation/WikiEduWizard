#########################################################
# Title:  WIKIEDU - Application Inititializer
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require('./App')


$ ->
  
  # Initialize Application
  application.initialize()

  # Start Backbone router
  Backbone.history.start()