
#########################################################
# Title:  StepView
# Author: kevin@wintr.us @ WINTR
#########################################################


application = require( '../App' )
View = require('../views/supers/View')
InputItemView = require('../views/InputItemView')
StepTemplate = require('../templates/StepTemplate.hbs')
InputTipTemplate = require('../templates/InputTipTemplate.hbs')
CourseInfoTemplate = require('../templates/CourseInfoTemplate.hbs')

module.exports = class StepView extends View

  className: 'step'

  tagName: 'section'

  template: StepTemplate

  tipTemplate: InputTipTemplate

  courseInfoTemplate: CourseInfoTemplate

  events:
    'click input' : 'inputHandler'
    'click #publish' : 'publishHandler'

  publishHandler: ->
    Backbone.Mediator.publish('wizard:publish')
  
  render: ->
    @$el.html( @template( @model.attributes ) )


    @inputSection = @$el.find('.step-form-inner')
    @$tipSection = @$el.find('.step-info-tips')

    @inputData = @model.attributes.inputs


    _.each(@inputData, (input, index) =>

      inputView = new InputItemView(
        model: new Backbone.Model(input)
      )

      inputView.inputType = input.type

      inputView.itemIndex = index

      @inputSection.append(inputView.render().el)

      if input.tipInfo
        tip = 
          id: index
          title: input.tipInfo.title
          content: input.tipInfo.content

        $tipEl = @tipTemplate(tip)

        @$tipSection.append($tipEl)


      else if input.courseInfo
        _.extend(input.courseInfo, {id: index} )

        $tipEl = @courseInfoTemplate(input.courseInfo)

        @$tipSection.append($tipEl)

    )

    @afterRender()
    

  afterRender: ->
    @$inputContainers = @$el.find('.custom-input')
    return @

  hide: ->
    @$el.hide()

    return @

  show: ->
    @$el.show()

    return @

  inputHandler: (e) ->
    $target = $(e.currentTarget)
    $parent = $target.parents('.custom-input')
    
    if $parent.data('exclusive')
      if $target.is(':checked') 
        @$inputContainers.not($parent).addClass('disabled')
      else
        @$inputContainers.find('input').not($target).prop('checked', false)
        @$inputContainers.not($parent).removeClass('disabled')
    else
      $exclusive = @$el.find('[data-exclusive="true"]')

      if $exclusive.length > 0
        if $target.is(':checked')
          $exclusive.addClass('disabled')
        else
          $exclusive.removeClass('disabled')



    # attribute = $target.data('model')
    # console.log $target
    # @model.set(attribute, $target.is(':checked'))

    
    

 

