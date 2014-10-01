module.exports = class Step extends Backbone.Model
  defaults:
    text: ''
    done: false
    active: false

  toggleActive: ->
    @set 'active', !@get('active')


