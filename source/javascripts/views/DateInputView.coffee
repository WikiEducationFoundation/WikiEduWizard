
# APP
application = require( '../App' )

#TEMPALTE
WikiDatesModule = require('../templates/steps/modules/WikiDatesModule.hbs')

#INPUTS
WizardStepInputs = require('../data/WizardStepInputs')



module.exports = class DateInputView extends Backbone.View


  events:

    'click select' : 'clickHandler'

    'change select' : 'changeHandler'

    'focus select' : 'focusHandler'

    'blur select' : 'blurHandler'

    'mouseover' : 'focusHandler'

    'mouseout' : 'blurHandler'

  m: ''
  d: ''
  y: ''
  dateValue: ''


  render: ->

    $('body').on 'click', (e) =>

      @closeIfNoValue()


  clickHandler: (e) ->

    @$el.addClass('open')


  blurHandler: (e) ->

    @closeIfNoValue()


  focusHandler: (e) ->

    @$el.addClass('open')


  changeHandler: (e) ->

    @closeIfNoValue()

    $target = ($ e.currentTarget)

    id = $target.attr('data-date-id')

    type = $target.attr('data-date-type')

    value = $target.val()

    WizardStepInputs[@parentStepView.stepId()][id][type] = value

    @m = WizardStepInputs[@parentStepView.stepId()][id]['month']

    @d = WizardStepInputs[@parentStepView.stepId()][id]['day']

    @y = WizardStepInputs[@parentStepView.stepId()][id]['year']

    @dateValue = "#{@y}-#{@m}-#{@d}"

    WizardStepInputs[@parentStepView.stepId()][id].value = @dateValue

    Backbone.Mediator.publish('date:change', @)

    return @



  hasValue: ->

    return @$el.find('select').val() != ''


  closeIfNoValue: ->

    if @hasValue()

      @$el.addClass('open')

    else

      @$el.removeClass('open')


  isValid: ->
    isIt = false

    if @m != '' and @d != '' and @y != ''
      isIt = true

    return isIt






