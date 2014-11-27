

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs')
CourseDetailsTempalte = require('../templates/steps/output/CourseDetailsTemplate.hbs')
GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs')
CourseOptionsTemplate = require('../templates/steps/output/CourseOptionsTemplate.hbs')


#CONFIG DATA
WizardStepInputs = require('../data/WizardStepInputs')



module.exports = class OutputView extends View 


  template: WikiOutputTemplate

  currentBuild: ''

  detailsTemplate: CourseDetailsTempalte

  gradingTemplate: GradingTemplate

  optionsTemplate: CourseOptionsTemplate


  subscriptions:

    'wizard:publish' : 'publishHandler'
    'output:update'  : 'updateBuild'

  updateBuild: (build) ->
    @currentBuild = build
    # console.log @currentBuild


  outputPlainText: ->

    @render()

    return @$el.text()


  render: ->

    @$el.html( @template( @populateOutput() ) )
    
    @afterRender()
    
    return @


  populateOutput: ->

    detailsOutput = @$el.html(@detailsTemplate(@getRenderData())).text()

    rawAssignmentOutput = @$el.html(@template(@getRenderData())).text()

    assignmentOutput = rawAssignmentOutput.replace(/(\r\n|\n|\r)/gm,"")

    gradingOutput = @$el.html(@gradingTemplate(@getRenderData())).text()

    optionsOutput = @$el.html(@optionsTemplate(@getRenderData())).text()

    courseOut = detailsOutput + assignmentOutput + gradingOutput + optionsOutput
    
    return courseOut


  getRenderData: ->

    return _.extend(WizardStepInputs,{ description: $('#short_description').val(), lineBreak: '<br/>'})


  exportData: (formData) ->

    $.ajax(

      type: 'POST'

      url: '/publish'

      data:

        wikitext: formData

        course_title: WizardStepInputs.intro.course_name.value

      success: (response) ->

        $('#publish').removeClass('processing')

        if response.success

          newPage = "http://en.wikipedia.org/wiki/#{response.title}"

          alert("Congrats! You have successfully created/edited a Wikiedu Course at #{newPage}")

          window.location.href = newPage

        else

          console.log response

          alert('Hmm... something went wrong. Try clicking "Publish" again. If that doesn\'t work, please send a message to sage@wikiedu.org.')


    )
    

  publishHandler: ->

    if WizardStepInputs.intro.course_name.value.length > 0 

      $('#publish').addClass('processing')

      # @exportData(@$el.html(@populateOutput()).text())

      # @exportData(@populateOutput())

      console.log @currentBuild

      @exportData(@currentBuild)

    else

      alert('You must enter a course title as this will become the title of your course page.')

      Backbone.Mediator.publish('step:edit', 'intro')

      setTimeout(=>

        $('#course_name').focus()

      ,500)


    

    

    
