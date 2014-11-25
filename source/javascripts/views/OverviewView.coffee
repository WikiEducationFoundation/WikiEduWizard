# APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

WikiSummaryModule = require('../templates/steps/modules/WikiSummaryModule.hbs')
WikiDetailsModule = require('../templates/steps/modules/WikiDetailsModule.hbs')

#Data
WizardStepInputs = require('../data/WizardStepInputs')


module.exports = class OverviewView extends View

  overviewItemTemplate: WikiDetailsModule

  render: ->

    selectedPathways = application.homeView.selectedPathways

    selectedInputs = []
    
    _.each(selectedPathways, (pid) =>

      stepData = application.homeView.stepData.pathways[pid]

      inputDataIds = _.pluck(stepData, 'id')

      stepTitles = _.pluck(stepData, 'title')

      totalLength = stepData.length

      _.each(stepTitles, (title, index) =>

        unless stepData[index].showInOverview

          return

        selectedInputs = []

        stepInputItems = WizardStepInputs[inputDataIds[index]]

        _.each(stepInputItems, (input) =>

          if input.type

            if input.type is 'checkbox' || input.type is 'radioBox'

              if input.selected is true

                selectedInputs.push input.label

            else if input.type is 'radioGroup'

              if input.id is 'peer_reviews'

                selectedInputs.push input.overviewLabel
        )

        if selectedInputs.length == 0

          selectedInputs.push "[None selected]"

        @$el.append( @overviewItemTemplate(

          label: title

          stepId: inputDataIds[index]

          assignments: selectedInputs

        ))

      )
    )



    

  