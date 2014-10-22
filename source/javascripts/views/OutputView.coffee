

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
    return _.extend(WizardStepInputs,{ description: $('#short_description').val()})



  render: ->
    @$el.html( @template( @populateOutput() ) )
    
    @afterRender()
    
    return @



  populateOutput: ->
    return @template( @getRenderData() )



  exportData: (formData) ->

    $.ajax(

      type: 'POST'

      url: '/publish'

      data:
        wikitext: formData
        course_title: WizardStepInputs.intro.course_name.value

      success: (returnData) ->
        $('#publish').removeClass('processing')
        console.log returnData        
    )
    


  publishHandler: ->

    

    if WizardStepInputs.intro.course_name.value.length > 0 

      $('#publish').addClass('processing')

      @exportData(@populateOutput())

    else

      alert('You must enter a course title as this will become the title of your course page.')

      Backbone.Mediator.publish('step:edit', 'intro')

      setTimeout(=>
        $('#course_name').focus()
      ,500)


    

    

    