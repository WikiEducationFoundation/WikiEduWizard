
#########################################################
# Title:  WIKIEDU ASSIGNMENT - Router
# Author: kevin@wintr.us @ WINTR
#########################################################

application = require( '../App' )

#CONFIG DATA
WizardStepInputs = require('../data/WizardStepInputs')

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
    if $('#app').length > 0

      @currentWikiUser = $( '#app' ).attr('data-wikiuser')

      WizardStepInputs['intro']['instructor_username']['value'] = @currentWikiUser

      console.log WizardStepInputs

      $( '#app' ).html( application.homeView.render().el )

    else if $('#login').length > 0
      $( '#login' ).html( application.loginView.render().el )


