

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

module.exports = class TimelineView extends Backbone.View 

  el: $('.form-container')

  curDateConfig:
    termStart: ''
    termEnd: ''
    courseStart: ''
    courseEnd: ''
    courseStartWeekOf: ''
    courseEndWeekOf: ''
    numberWeeks: 16


  daysSelected: [false,false,false,false,false,false,false]

  allDates: []

  dowNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  dowAbbrv: ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun']

  renderDays: true

  events:
    'mousedown #cLength' : 'clickHandler'

    'mouseup #cLength'  : 'changeHandler'

    'change #cLength' : 'changeHandler'

    'change #termStartDate' : 'onTermStartDateChange'

    'change #termEndDate' : 'onTermEndDateChange'

    'change #courseStartDate' : 'onCourseStartDateChange'

    'change .dowCheckbox' : 'onDowSelect'

  onDowSelect: (e) ->

    $target = $(e.currentTarget)

    dow = $target.attr('id')

    dowId = parseInt($target.val())

    if $target.is(':checked')

      @daysSelected[dowId] = true

    else

      @daysSelected[dowId] = false

    @update()


  initialize: ->

    $('input[type="date"]').datepicker(

      dateFormat: 'yy-mm-dd'

      constrainInput: true

      firstDay: 1

    ).prop('type','text')

    @$startWeekOfDate = $('#startWeekOfDate')

    @$courseStartDate = $('#courseStartDate')

    @$outContainer = $('.output-container')

    @$previewContainer = $('.preview-container')

    @courseLength = $('#cLength').val()

    @courseDiff = 0

    @data = application.timelineDataAlt

    @update()

  resetDates: ->
    #TODO - NEED A PLACE THAT RESETS EVERYTHING - EG WHEN MASTER COURSE DATES CHANGE


  onTermStartDateChange: (e) ->

    @curDateConfig.courseStart = ''

    @$courseStartDate.val('')

    dateInput = $(e.currentTarget).val()

    newDate = moment(dateInput).toDate()

    @curDateConfig.termStart = newDate

    @$courseStartDate.datepicker('option', 'minDate', newDate)

    @update()


  onTermEndDateChange: (e) ->

    dateInput = $(e.currentTarget).val()

    newDate = moment(dateInput).toDate()

    @curDateConfig.termEnd = newDate

    @$courseStartDate.datepicker('option', 'maxDate', newDate)

    @update()


  onCourseStartDateChange: (e) ->

    @updateWeeklyDates()


  updateWeeklyDates: ->

    if @$courseStartDate.val() is ''

      @curDateConfig.courseStart = ''

      $('span.date').hide()

      return

    @allDates = []

    newStartDate = new Date(@$courseStartDate.val())

    @curDateConfig.courseStart = newStartDate

    weekOfDate = @getWeekOfDate(newStartDate)

    @curDateConfig.courseStartWeekOf = weekOfDate

    $('span.date').each((index,item) =>

      weekId = parseInt($(item).attr('data-week'))

      newDate = new Date(weekOfDate)

      if index is 0

        @allDates.push(@getFormattedDateString(new Date(newDate)))

        return

      newDate = newDate.setDate(newDate.getDate() + (7 * (weekId-1)))

      @allDates.push(@getFormattedDateString(new Date(newDate)))

      $(item).show().text(@getFormattedDateString(new Date(newDate)))

    )

    $('span.date.date-1').show().text(@getFormattedDateString(newStartDate))

    @$startWeekOfDate.val("#{@getFormattedDateString(newStartDate)}")

    $('.dates-preview').html('')

    $('.dates-preview').each((ind, item) =>

      _.each(@daysSelected, (selected, selectedIndex) =>

        if selected

          if ind == 0
            theDate = new Date(weekOfDate)

          else
            theDate = new Date(@allDates[ind])

          theDate = theDate.setDate(theDate.getDate() + (selectedIndex))

          $(item).append("<div class='dow-date dow-date--#{selectedIndex}' ><span contenteditable>#{@dowNames[selectedIndex]} | </span><span contenteditable>#{@getFormattedDateString(new Date(theDate))}</span></div><br/>")
      )
    )

    return @



  clickHandler: (e) ->
    return

    
  changeHandler: (e) ->

    @courseLength = $('#cLength').val()

    @courseDiff = 16 - @courseLength

    @curDateConfig.courseEndWeekOf = new Date(@allDates[@courseLength-1])

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

    @renderPreview()
    #@renderResult()

    @updateWeeklyDates()


  renderPreview: ->

    @$previewContainer.html('')

    _.each(@out, (item, index) =>

      thisWeek = index + 1
      nextWeek = index + 2
      isLastWeek = index is @out.length - 1

      # renderTitles()
      if item.title.length > 0

        titles = "<div>"

        titles += "<h4 data-week='#{thisWeek}'>Week #{thisWeek}<span class='date date-#{thisWeek}' data-week='#{thisWeek}'></span></h4>"

        _.each(item.title, (t, i) ->

          if i is 0

           titles += "<h2>#{t}</h2>"

          else

            titles += "<h3>#{t}</h3>"

        )

        titles += "</div><br/>"

        @$previewContainer.append(titles)

      datesOut = "<div class='dates-preview dates-preview-#{thisWeek}' data-week='#{thisWeek}'></div>"

      @$previewContainer.append(datesOut)

      # renderInClass()
      if item.in_class.length > 0

        inClassOut = '<div>'

        inClassOut += "<h5 style='font-weight: bold;'>In class</h5>"

        inClassOut += '<ul>'

        _.each(item.in_class, (c) ->
          inClassOut += "<li>#{c}</li>"
        )

        inClassOut += "</ul>"

        inClassOut += "</div><br/>"

        @$previewContainer.append(inClassOut)


      # renderAssignments()
      if item.assignments.length > 0

        assignmentsOut = "<div>"

        assignmentsOut += "<h5 style='font-weight: bold;'>Assignments | due week #{nextWeek}</h5>"

        assignmentsOut += '<ul>'

        _.each(item.assignments, (assign) ->
          assignmentsOut += "<li>#{assign}</li>" 
        )

        assignmentsOut += '</ul>'

        assignmentsOut += '</div><br/>'

        @$previewContainer.append(assignmentsOut)


      # renderMilestones()
      if item.milestones.length > 0

        milestonesOut = "<div>"

        milestonesOut += "<h5 style='font-weight: bold;'>Milestones</h5>"

        milestonesOut += "<ul>"

        _.each(item.milestones, (milestone) ->
          milestonesOut += "<li>#{milestone.title}</li>"
        )

        milestonesOut += "</ul>"

        milestonesOut += "</div><br/>"

        @$previewContainer.append(milestonesOut)


      if isLastWeek

        @$previewContainer.append("<h1>End of Course</h1>")


      @$previewContainer.append("<br/>")

    )


  renderResult: ->

    @$outContainer.html('').css('white-space', 'pre-wrap')

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


      @$outContainer.append("<br/><hr/>")

    )


  getFormattedDateString: (date) ->
    year = date.getUTCFullYear().toString()
    month = date.getUTCMonth()+1
    day = date.getUTCDate()

    if month.toString().length is 1

      month = "0" + month.toString()

    else

      month = month.toString()

    if day.toString().length is 1

      day = "0" + day.toString()

    else

      day = day.toString()


    return "#{year}-#{month}-#{day}"


  getWeekOfDate: (date) ->

    year = date.getUTCFullYear().toString()

    month = date.getUTCMonth()+1

    day = date.getUTCDay()

    dateDay = date.getUTCDate()


    if day is 1

      return date

    else

      return new Date(date.setDate(date.getUTCDate()-date.getUTCDay()))


  getWeeksOutDate: (date, weeksOut) ->

    newDate = new Date()

    newDate.setDate(date.getDate()+(weeksOut*7))

    return newDate


  combine: (obj1, obj2) ->

    title = _.union(obj1.title, obj2.title)

    in_class = _.union(obj1.in_class, obj2.in_class)

    assignments = _.union(obj1.assignments, obj2.assignments)

    milestones = _.union(obj1.milestones, obj2.milestones)

    readings = _.union(obj1.readings, obj2.readings)

    return {title: title, in_class: in_class, assignments: assignments, milestones: milestones, readings: readings}



