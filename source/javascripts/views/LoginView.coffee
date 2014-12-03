#########################################################
# Title:  HomeView
# Author: kevin@wintr.us @ WINTR
#########################################################

# APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
LoginTemplate = require('../templates/LoginTemplate.hbs')

LoginContent = require('../data/LoginContent')

module.exports = class HomeView extends View

  #--------------------------------------------------------
  # SETUP
  #--------------------------------------------------------

  className: 'home-view'

  template: LoginTemplate

  getRenderData: ->
    
    return LoginContent