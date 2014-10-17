
application = require( '../App' )
View = require('../views/supers/View')
OutputTemplate = require('../templates/OutputTemplate.hbs')

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

    _.each(application.homeView.stepViews, (stepView) =>
      stepView.$el.find('.custom-input').find('input').each((index,element) =>
        console.log $(element).attr('name')
        console.log $(element).val()
      )
    )
    # $.ajax(
    #   type: 'POST'
    #   url: '/publish'
    #   data:
    #     text: @outputPlainText()
    #   success: (data) ->
    #     console.log data
    # )