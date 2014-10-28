
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

      $( '#app' ).html(application.homeView.render().el)

      if @getParameterByName('step')

        Backbone.Mediator.publish('step:goto', @getParameterByName('step'))

      else if @getParameterByName('stepid')

        Backbone.Mediator.publish('step:gotoId', @getParameterByName('stepid'))


    else if $('#login').length > 0

      ($ '#login').html(application.loginView.render().el)

  #
  # Utilities
  #

  getParameterByName: (name) ->

    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]")

    regex = new RegExp("[\\?&]" + name + "=([^&#]*)")

    results = regex.exec(location.search)

    (if not results? then "" else decodeURIComponent(results[1].replace(/\+/g, " ")))


