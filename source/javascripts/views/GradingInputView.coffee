# APP
application = require( '../App' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

WikiGradingModule = require('../templates/steps/modules/WikiGradingModule.hbs')


#Data
WizardStepInputs = require('../data/WizardStepInputs')


module.exports = class GradingInputView extends View

  template: WikiGradingModule


  events:

    'change input' : 'inputChangeHandler'

    'click .custom-input--radio-group .radio-button' : 'radioButtonClickHandler'

    'click .custom-input--radio-group label' : 'radioButtonClickHandler'


  subscriptions:

    'grade:change' : 'gradeChangeHandler'

  currentValues: []


  valueLimit: 100


  gradingSelectionData: WizardStepInputs['grading']['grading_selection']


  currentTotal: ->

    total = 0

    _.each(@currentValues, (val) =>

      total += parseInt(val)

    )

    return total



  getInputValues: ->

    values = []

    @parentStepView.$el.find('input[type="percent"]').each(->

      curVal = ($ this).val()

      if curVal
        
        values.push(curVal)

      else

        ($ this).val(0)

        values.push(0)



    )

    @currentValues = values

    return @



  gradeChangeHandler: (id, value) ->
    
    @getInputValues().render()


  radioButtonClickHandler: (e) ->

    e.preventDefault()

    $button = $(e.currentTarget)

    $parentEl = $button.parents('.custom-input--radio')

    $parentGroup = $button.parents('.custom-input-wrapper')

    $inputEl = $parentEl.find('input[type="radio"]')


    if $parentEl.hasClass('checked')

      return false

    else

      $otherRadios = $parentGroup.find('.custom-input--radio').not($parentEl[0])

      $otherRadios.find('input[type="radio"]').prop('checked', false).trigger('change')

      $otherRadios.removeClass('checked')

      $parentEl.addClass('checked')

      $inputEl.prop('checked', true)

      $inputEl.trigger('change')

      _.each(WizardStepInputs['grading']['grading_selection'].options, (opt) ->

        opt.selected = false
        
      )

      WizardStepInputs['grading']['grading_selection'].options[$inputEl.attr('id')].selected = true

      WizardStepInputs['grading']['grading_selection'].value = $inputEl.attr('id')



  getRenderData: ->

    out = {

      totalGrade: @currentTotal()

      isOverLimit: @currentTotal() > @valueLimit

      options: @gradingSelectionData.options

    }

    return out









