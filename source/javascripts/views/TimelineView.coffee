

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

module.exports = class TimelineView extends Backbone.View 

  el: $('.form-container')


  events:
    'click .recreate' : 'clickHandler'


  initialize: ->

    @courseLength = $('#cLength').val()

    @courseDiff = 0

    @data = application.timelineData

    @update()

    
  clickHandler: (e) ->
    @courseLength = $('#cLength').val()

    @courseDiff = 16 - @courseLength

    @update()


  update: ->

    @out = []

    @unitsClone = _.clone(@data)

    if @courseDiff > 0

      @unitsClone = _.reject(@unitsClone, (item) =>

        return item.type is 'break' && @courseDiff >= item.value && item.value != 0

      )

    obj = @unitsClone[0]

    _.each(@unitsClone, (item, index) =>

      if item.type is 'break' || index is @unitsClone.length - 1

        if index is @unitsClone.length - 1

          @out.push _.clone(item)

        else

          @out.push _.clone(obj)

        obj = {}

        return

      else if item.type is 'week'

        obj = @combine(obj, item)

    )

    @renderResult()


  renderResult: ->

    $('.output-container').html('')

    _.each(@out, (item, index) ->

      $('.output-container').append("<div>#{index+1}. #{item.title}</div>")

    )


  combine: (obj1, obj2) ->

    title = _.union(obj1.title, obj2.title)

    in_class = _.union(obj1.in_class, obj2.in_class)

    assignments = _.union(obj1.assignments, obj2.assignments)

    milestones = _.union(obj1.milestones, obj2.milestones)
    
    readings = _.union(obj1.readings, obj2.readings)

    return {title: title, in_class: in_class, assignments: assignments, milestones: milestones, readings: readings}
