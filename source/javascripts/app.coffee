
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

    InputItemView = require('./views/InputItemView')

    OutputView = require('./views/OutputView')


    # Initialize views
    @homeView = new HomeView()

    @inputItemView = new InputItemView()

    @outputView = new OutputView()

    @router = new Router()

    
    
module.exports = Application