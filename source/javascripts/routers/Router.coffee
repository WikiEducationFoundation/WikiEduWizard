
#########################################################
# Title:  WIKIEDU ASSIGNMENT - Router
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require( '../App' )

module.exports = class Router extends Backbone.Router

#--------------------------------------------------------
# Routes
#--------------------------------------------------------
    
  routes:
    '' : 'home'

#--------------------------------------------------------
# Handlers
#--------------------------------------------------------

  home: ->
    $( '#app' ).html( application.homeView.render().el )

