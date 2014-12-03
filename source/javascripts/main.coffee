#########################################################
# Title:  WIKIEDU - Application Inititializer
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require('./app')


$ ->

  moment.locale('en', { week : { dow : 1, doy: 4 } })

  # Initialize Application
  application.initialize()

  # Start Backbone router
  Backbone.history.start()


  