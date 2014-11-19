

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

module.exports = class TimelineView extends Backbone.View 


  initialize: ->

    @courseLength = 16
    @courseDiff = 0

    @data = application.timelineData

    @units = _.where(@data, {type: "week"})
    @breaks = _.where(@data, {type: "break"})

    $('.whatever').on 'click', (e) =>
      e.preventDefault()
      @clickHandler(e)

    
    @update()
    
  clickHandler: (e) ->
    @courseLength = $('#cLength').val()
    @courseDiff = @units.length - @courseLength
    @update()

  update: ->
    @weeklyOutput = []

    out = []

    prevObj = {}

    @unitsClone = _.clone(@data)

    if @courseDiff > 0

      @unitsClone = _.reject(@unitsClone, (item) =>
        return item.type is 'break' && @courseDiff >= item.value && item.value != 0
      )





    obj = @unitsClone[0]

    _.each(@unitsClone, (item, index) =>
      if item.type is 'break' || index is @unitsClone.length - 1
        if index is @unitsClone.length - 1
          out.push _.clone(item)
        else
          out.push _.clone(obj)
        obj = {}
        return
      else if item.type is 'week'
        obj = @combine(obj, item)
    )

    $('.output-container').html('')

    console.log "#{out.length} week course"
    _.each(out, (item, index) ->
      console.log item.title
      $('.output-container').append("<div>#{index+1}. #{item.title}</div>")
    )




    # _.each(@data, (item, index) =>
      
    #   if item.type is 'break'
    #     if item.value is 16

    #   else if item.type is 'week'
    #     clone = _.clone(item)
    #     @data[index-1]
    #     out.push(clone)
    #     prevObj = clone
    # )



    # @unitsClone = _.clone(@units)


    # prev = @unitsClone[0]

    # if @courseDiff is 0
    #   console.log @courseLength, @unitsClone.length
    #   return

    #remove units that should just be ommited altogether
    # @unitsClone = _.reject(@unitsClone, (item) =>
    #   return item.action is 'omit' && item.priority && item.priority <= @courseDiff
    # )

    #look for those units that should be combined with the previous unit
    # _.each(@unitsClone, (item, index) =>
    #   if @courseDiff != 0 && item.priority <= @courseDiff
    #     if item.action is 'combine'
    #       @unitsClone[index-1] = @combine(@unitsClone[index-1], item)
    #       item.omit = true
    # )

    #remove the units that were combined with their previous unit
    # @unitsClone = _.reject(@unitsClone, (item) =>
    #   return item.omit is true
    # )



    # _.each(@unitsClone, (item, index) =>
    #   console.log item.title
    # )

    # i = 0
    # while i < @courseLength
    #   newObj = 
    #     title: []
    #     in_class: []
    #     assignments: []
    #     milestones: []
    #     readings: []
    #   @weeklyOutput.push newObj
    #   i++

    # _.each(@weeklyOutput, (item, index) =>
    #   if index is 0
    #     _.extend(item, @units[0])
    #     return
    #   else if index is @courseLength-1
    #     _.extend(item, @units[@units.length - 1])
    #     return
    #   else
    #     return
    # )

    


    

  combine: (obj1, obj2) ->

    title = _.union(obj1.title, obj2.title)
    in_class = _.union(obj1.in_class, obj2.in_class)
    assignments = _.union(obj1.assignments, obj2.assignments)
    milestones = _.union(obj1.milestones, obj2.milestones)
    readings = _.union(obj1.readings, obj2.readings)

    return {title: title, in_class: in_class, assignments: assignments, milestones: milestones, readings: readings}
