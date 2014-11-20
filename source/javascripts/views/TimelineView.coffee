

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

module.exports = class TimelineView extends Backbone.View 

  el: $('.form-container')


  events:
    'mousedown #cLength' : 'clickHandler'
    'mouseup #cLength' : 'changeHandler'
    'change #cLength' : 'changeHandler'

  clickHandler: ->
    @$outContainer.fadeOut('fast')

  initialize: ->

    @$outContainer = $('.output-container')

    @courseLength = $('#cLength').val()

    @courseDiff = 0

    @data = application.timelineData

    @update()

    
  changeHandler: (e) ->

    @courseLength = $('#cLength').val()

    @courseDiff = 16 - @courseLength

    @update()

    @$outContainer.fadeIn('slow')


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

    @$outContainer.html('')

    _.each(@out, (item, index) =>

      thisWeek = index + 1
      nextWeek = index + 2
      isLastWeek = index is @out.length - 1


      if item.title.length > 0

        titles = "<div>"

        titles += "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week | #{thisWeek} | "

        _.each(item.title, (t, i) ->
          if i is 0
           titles += "#{t} "
          else
            titles += "| #{t} "
        )

        titles += "}}"

        titles += "</div>"

        @$outContainer.append(titles)

        @$outContainer.append("<br/>")

      if item.in_class.length > 0

        @$outContainer.append("<div style='font-weight: bold;'>{{in class}}</div>")

        _.each(item.in_class, (c) =>
          @$outContainer.append("<div>#{c}</div>")
        )

        @$outContainer.append("<br/>")

      if item.assignments.length > 0

        @$outContainer.append("<div style='font-weight: bold;'>{{assignment | due = Week #{nextWeek} }}</div>")

        _.each(item.assignments, (assign) =>

          @$outContainer.append("<div>#{assign}</div>")

        )

        @$outContainer.append("<br/>")

      if item.milestones.length > 0

        @$outContainer.append("<div style='font-weight: bold;'>{{assignment milestones}}</div>")

        _.each(item.milestones, (m) =>

          @$outContainer.append("<div>#{m}</div>")

        )

        @$outContainer.append("<br/>")

      if isLastWeek

        @$outContainer.append("{{end of course week}}")

      else
        @$outContainer.append("{{end of course week #{thisWeek} }}")

      @$outContainer.append("<hr/>")

    )


  combine: (obj1, obj2) ->

    title = _.union(obj1.title, obj2.title)

    in_class = _.union(obj1.in_class, obj2.in_class)

    assignments = _.union(obj1.assignments, obj2.assignments)

    milestones = _.union(obj1.milestones, obj2.milestones)

    readings = _.union(obj1.readings, obj2.readings)

    return {title: title, in_class: in_class, assignments: assignments, milestones: milestones, readings: readings}
