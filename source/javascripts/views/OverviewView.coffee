# APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

WikiSummaryModule = require('../templates/steps/modules/WikiSummaryModule.hbs')
WikiDetailsModule = require('../templates/steps/modules/WikiDetailsModule.hbs')

#Data
WizardStepInputs = require('../data/WizardStepInputs')


TimelineView = require('../views/TimelineView')


module.exports = class OverviewView extends View

  events: 
    'click .expand-all' : 'expandCollapseAll'

  overviewItemTemplate: WikiDetailsModule

  expandCollapseAll: (e) ->
    e.preventDefault()

    $target = $(e.currentTarget)

    $target.toggleClass('open')

    $('.custom-input-wrapper.has-content').find('.custom-input-accordian').toggleClass('active')

    if $target.hasClass('open')
      $target.text('[collapse all]')
    else
      $target.text('[expand all]')



    

  render: ->

    selectedPathways = application.homeView.selectedPathways

    selectedObjects = _.where(WizardStepInputs['assignment_selection'], {selected: true})

    $('<div class="step-form-content__title">Selected assignment(s):</div>').appendTo(@$el).css(
      marginBottom: '8px'
    )

    _.each(selectedObjects, (obj) =>

      pathTitle = obj.label

      $newTitle = $(@overviewItemTemplate(

        label: pathTitle

        stepId: 'assignment_selection'

        assignments: []

      )).find('.custom-input').removeClass('custom-input--accordian')

      $newTitle.find('.edit-button')

      @$el.append($newTitle)

    )

    selectedInputs = []

    
    
    _.each(selectedPathways, (pid, i) =>

      stepData = application.homeView.stepData.pathways[pid]

      inputDataIds = _.pluck(stepData, 'id')

      stepTitles = _.pluck(stepData, 'title')

      totalLength = stepData.length

      if stepTitles.length > 0 && i is 0

        $('<div class="step-form-content__title">Assignment details: <a class="expand-all" href="#">[expand all]</a></div>').appendTo(@$el).css(
          bottom: 'auto'
          display: 'block'
          position: 'relative'
          marginBottom: '0'
          marginTop: '15px'
        )

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

    @renderDescription()
    
    return @


  renderDescription: ->

    @TimelineView = new TimelineView()

    $descInput = $("<textarea id='short_description' rows='6' style='width:100%;background-color:rgba(242,242,242,1.0);border:1px solid rgba(202,202,202,1.0);padding:10px 15px;font-size: 16px;line-height 23px;letter-spacing: 0.25px;'></textarea>")

    $descInput.val(WizardStepInputs.course_details.description)

    $('.description-container').html($descInput[0])

    $descInput.off 'change'

    $descInput.on 'change', (e) =>

      WizardStepInputs.course_details.description = $(e.target).val()

      @TimelineView.update()
      application.homeView.timelineView.update()

    return @




    

  