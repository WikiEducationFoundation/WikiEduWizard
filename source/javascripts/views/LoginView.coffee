#########################################################
# Title:  HomeView
# Author: kevin@wintr.us @ WINTR
#########################################################

# APP
application = require( '../App' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
LoginTemplate = require('../templates/LoginTemplate.hbs')

WizardContent = require('../data/WizardContent')

module.exports = class HomeView extends View

  #--------------------------------------------------------
  # SETUP
  #--------------------------------------------------------

  className: 'home-view'

  template: LoginTemplate

  getRenderData: ->
    
    return WizardContent[0]