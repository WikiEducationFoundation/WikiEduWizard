#########################################################
# Title:  HomeView
# Author: kevin@wintr.us @ WINTR
#########################################################





MainView = 
  initialize: ->
    ItemView = require('../views/supers/marionette/ItemView')
    CompositeView = require('../views/supers/marionette/CompositeView')
    View = require('../views/supers/View')

    c = new CompositeView
    console.log c


module.exports = MainView

