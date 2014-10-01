#########################################################
# Title:  StepController
# Description: 
# Author: kevin@wintr.us @ WINTR
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