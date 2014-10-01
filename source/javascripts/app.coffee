
#########################################################
# Title:  WIKIEDU ASSIGNMENT DESIGN WIZARD
# Author: kevin@wintr.us @ WINTR
#########################################################

Application = 

  initialize: ->

    # App Data
    AppData = require('./data/WizardData')
    @data = AppData


    # Import views
    HomeView = require('./views/HomeView')
    Router = require('./routers/Router')


    # Initialize views
    @homeView = new HomeView()
    @router = new Router()


    Object.freeze? this


module.exports = Application