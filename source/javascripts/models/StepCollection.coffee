
#########################################################
# Title:  StepCollection
# Author: kevin@wintr.us @ WINTR
#########################################################

Collection = require('../models/supers/Collection')
StepModel = require('../models/StepModel')

module.exports = class StepCollection extends Collection
  model: StepModel