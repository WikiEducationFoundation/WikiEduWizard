# APP
application = require( '../App' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

WikiGradingModule = require('../templates/steps/modules/WikiGradingModule.hbs')


module.exports = class GradingInputView extends View

  template: WikiGradingModule

  events:

    'click .custom-input--radio-group .radio-button' : 'radioButtonClickHandler'

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
