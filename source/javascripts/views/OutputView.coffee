

#APP
application = require( '../App' )


# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
OutputTemplate = require('../templates/steps/output/OutputTemplate.hbs')

CourseDetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs')


module.exports = class InputItemView extends View 


  template: OutputTemplate


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



  publishHandler: ->
    # _.each(application.homeView.stepViews, (stepView) =>
    #   stepView.$el.find('.custom-input').find('input').each((index,element) =>
    #     console.log $(element).attr('name'), $(element).val()
   
    #   )
    # )

    $.ajax(

      type: 'POST'

      url: '/publish'

      data:
        text: @outputPlainText()

      success: (data) ->
        console.log data
        
    )