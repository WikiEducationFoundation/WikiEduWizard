

#APP
application = require( '../App' )


# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
OutputTemplate = require('../templates/steps/output/OutputTemplate.hbs')
WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs')

CourseDetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs')

WizardStepInputs = require('../data/WizardStepInputs')


module.exports = class InputItemView extends View 


  template: WikiOutputTemplate


  subscriptions:
    'wizard:publish' : 'publishHandler' 



  outputPlainText: ->
    @render()

    return @$el.text()



  getRenderData: ->
    console.log $('#short_description').val()
    return _.extend(WizardStepInputs,{ description: $('#short_description').val()})



  render: ->
    @$el.html( @template( @populateOutput() ) )
    
    @afterRender()
    
    return @



  populateOutput: ->
    return @template( @getRenderData() )



  exportData: (exportData) ->

    $.ajax(

      type: 'POST'

      url: '/publish'

      data:
        wikitext: exportData
        course_title: WizardStepInputs.intro.course_name.value

      success: (returnData) ->
        $('#publish').removeClass('processing')
        console.log returnData        
    )
    


  publishHandler: ->

    $('#publish').addClass('processing')

    @exportData(@populateOutput())


    

    

    