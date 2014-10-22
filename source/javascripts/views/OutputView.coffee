

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


  getRenderData: ->
    return {

      course_name: 'Course Name'

      instructor_username: 'User Name'

      instructor_realname: 'Real Name'

      subject: 'Subject'

      start_date: 'Start Date'

      end_date: 'End Date'

      institution: 'Institution'

      expected_students: 'Expeceted Students'

    }




  outputPlainText: ->
    @render()

    return @$el.text()



  getRenderData: ->
    return WizardStepInputs



  render: ->
    @$el.html( @template( @populateOutput() ) )
    
    @afterRender()
    
    return @



  populateOutput: ->
    return @template( @getRenderData() )



  exportData: (exportData) ->
    $('#publish').removeClass('processing')

    $.ajax(

      type: 'POST'

      url: '/publish_test'

      data:
        wikitext: exportData

      success: (returnData) ->
        console.log returnData
        
    )
    


  publishHandler: ->
    # _.each(application.homeView.stepViews, (stepView) =>
    #   stepView.$el.find('.custom-input').find('input').each((index,element) =>
    #     console.log $(element).attr('name'), $(element).val()
   
    #   )
    # )

    finalOutData = []

    $('#publish').addClass('processing')

    # _.each(WizardStepInputs, (step) =>
    #   _.each(step, (item) ->

    #     if item.type == 'checkbox' && 
    #       finalOutData.push(item)
    #     else if item.type == 'text'
    #       finalOutData.push(item)
    #   )
    # )
    setTimeout(=>
      @exportData(@populateOutput())
    , 2000)

    

    

    