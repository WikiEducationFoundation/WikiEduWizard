



module.exports = class DateInputView extends Backbone.View


  events:

    'click select' : 'clickHandler'

    'change select' : 'changeHandler'

    'focus select' : 'focusHandler'

    'blur select' : 'blurHandler'


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



  hasValue: ->
    return @$el.find('select').val() != ''

  closeIfNoValue: ->
    if @hasValue()
      @$el.addClass('open')
    else
      @$el.removeClass('open')
