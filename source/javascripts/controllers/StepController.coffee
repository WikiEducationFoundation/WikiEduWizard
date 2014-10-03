#########################################################
# Title:  StepController
# Description: 
# Author: kevin@wintr.us @ WINTR
# NOTE: NOT YET IMPLEMNETED - 10/3
#########################################################

application = require( '../App' )
View = require('../views/supers/View')

StepView = require('../views/StepView')
StepModel = require('../models/StepModel')

module.exports = class StepController extends View

  subscriptions:
    'step:updated' : 'stepUpdated'

  stepUpdated: (stepView) ->
    console.log stepView.model.changed