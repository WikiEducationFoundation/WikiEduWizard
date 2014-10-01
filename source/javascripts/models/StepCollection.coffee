###
 * Question and Answer Model (QA)
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since  
 ###

Collection = require('../models/supers/Collection')
StepModel = require('../models/StepModel')

module.exports = class StepCollection extends Collection
  model: StepModel