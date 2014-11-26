
#########################################################
# Title:  WIKIEDU ASSIGNMENT DESIGN WIZARD
# Author: kevin@wintr.us @ WINTR
#########################################################



Application = 

  initialize: ->

    # App Data
    AppData = require('./data/WizardContent')

    TimelineData = require('./data/TimelineData')

    TimelineDataAlt = require('./data/TimelineDataAlt')

    @WizardConfig = require('./data/WizardConfig')

    @data = AppData

    @timelineData = TimelineData

    @timelineDataAlt = TimelineDataAlt

    # Import views
    HomeView = require('./views/HomeView')

    LoginView = require('./views/LoginView')

    Router = require('./routers/Router')


    InputItemView = require('./views/InputItemView')

    OutputView = require('./views/OutputView')

    TimelineView = require('./views/TimelineView')


    # Initialize views
    @homeView = new HomeView()

    @loginView = new LoginView()

    @inputItemView = new InputItemView()

    @outputView = new OutputView()

    @timelineView = new TimelineView()

    @router = new Router()

    
    
module.exports = Application