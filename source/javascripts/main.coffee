#########################################################
# Title:  WIKIEDU - Application Inititializer
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require('./app')


$ ->

  # Initialize Application
  application.initialize()

  # Start Backbone router
  Backbone.history.start()


  