
#########################################################
# Title:  WIKIEDU ASSIGNMENT DESIGN WIZARD
# Author: kevin@wintr.us @ WINTR
#########################################################

Application = 

  initialize: ->

    # App Data
    AppData = require('./data/WizardContent')

    @data = AppData


    # Import views
    HomeView = require('./views/HomeView')

    LoginView = require('./views/LoginView')

    Router = require('./routers/Router')

    InputItemView = require('./views/InputItemView')

    OutputView = require('./views/OutputView')


    # Initialize views
    @homeView = new HomeView()

    @loginView = new LoginView()

    @inputItemView = new InputItemView()

    @outputView = new OutputView()

    @router = new Router()

    
    
module.exports = Application