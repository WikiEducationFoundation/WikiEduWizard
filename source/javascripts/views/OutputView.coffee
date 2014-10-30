

#APP
application = require( '../App' )


# SUPER VIEW CLASS
View = require('../views/supers/View')

#TEMPLATES
WikiOutputTemplate = require('../templates/steps/output/WikiOutputTemplate.hbs')



#CONFIG DATA
WizardStepInputs = require('../data/WizardStepInputs')


module.exports = class InputItemView extends View 


  template: WikiOutputTemplate


  subscriptions:

    'wizard:publish' : 'publishHandler' 


  outputPlainText: ->

    @render()

    return @$el.text()


  render: ->

    @$el.html( @template( @populateOutput() ) )
    
    @afterRender()
    
    return @


  populateOutput: ->

    return @template( @getRenderData() )


  getRenderData: ->

    return _.extend(WizardStepInputs,{ description: $('#short_description').val()})


  exportData: (formData) ->

    outData = formData.replace(/(\r\n|\n|\r)/gm,"")
  

    $.ajax(

      type: 'POST'

      url: '/publish'

      data:

        wikitext: outData

        course_title: WizardStepInputs.intro.course_name.value

      success: (response) ->

        $('#publish').removeClass('processing')

        if response.success

          newPage = "http://en.wikipedia.org/wiki/#{response.title}"

          alert("Congrats! You have successfully created/edited a Wikiedu Course at #{newPage}")

          window.location.href = newPage

        else

          console.log response

          alert('there was an error. see console.')


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


    

    

    