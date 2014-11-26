

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

WizardStepInputs = require('../data/WizardStepInputs')

module.exports = class TimelineView extends Backbone.View 

  el: $('.form-container')

  curDateConfig:

    termStart: WizardStepInputs.course_details.term_start_date

    termEnd: WizardStepInputs.course_details.term_end_date

    courseStart: WizardStepInputs.course_details.start_date

    courseEnd: WizardStepInputs.course_details.end_date

    courseStartWeekOf: WizardStepInputs.course_details.start_weekof_date

    courseEndWeekOf: WizardStepInputs.course_details.end_weekof_date

    numberWeeks: WizardStepInputs.course_details.length_in_weeks


  daysSelected: WizardStepInputs.course_details.weekdays_selected


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

    'change #courseEndDate' : 'onCourseEndDateChange'

    'change .dowCheckbox' : 'onDowSelect'

  onDowSelect: (e) ->

    $target = $(e.currentTarget)

    dow = $target.attr('id')

    dowId = parseInt($target.val())

    if $target.is(':checked')

      @daysSelected[dowId] = true



    else

      @daysSelected[dowId] = false

    WizardStepInputs.course_details.weekdays_selected = @daysSelected
    
    @update()


  initialize: ->

    $('input[type="date"]').datepicker(

      dateFormat: 'yy-mm-dd'

      constrainInput: true

      firstDay: 1

    ).prop('type','text')

    @$startWeekOfDate = $('#startWeekOfDate')

    @$courseStartDate = $('#courseStartDate')

    @$courseEndDate = $('#courseEndDate')

    @$termStartDate = $('#termStartDate')

    @$termEndDate =   $('#termEndDate')

    @$outContainer = $('.output-container')

    @$previewContainer = $('.preview-container')

    @$courseLengthInput = $('#cLength')

    @courseLength = @$courseLengthInput.val()

    @courseDiff = 0

    @data = []

    
    @data = application.timelineDataAlt

    $('#cLength').on 'change', (e) =>
      @changeHandler(e)

    $('#cLength').on 'mousedown', (e) =>
      @changeHandler(e)

    $('#cLength').on 'mouseup', (e) =>
      @changeHandler(e)

    $('#termStartDate').on 'change', (e) =>
      @onTermStartDateChange(e)

    $('#termEndDate').on 'change', (e) =>
      @onTermEndDateChange(e)

    $('#courseStartDate').on 'change', (e) =>
      @onCourseStartDateChange(e)

    $('#courseEndDate').on 'change', (e) =>
      @onCourseEndDateChange(e)

    $('.dowCheckbox').on 'change', (e) =>
      @onDowSelect(e)

    @update()

  onTermStartDateChange: (e) ->

    dateInput = $(e.currentTarget).val()

    newDate = moment(dateInput).toDate()

    @curDateConfig.termStart = newDate

    WizardStepInputs.course_details.term_start_date = @toString(newDate)

    @$courseStartDate.datepicker('option', 'minDate', newDate)

    @$termEndDate.datepicker('option', 'minDate', @getWeeksOutDate(@getWeekOfDate(newDate),6))

    @curDateConfig.courseStart = newDate

    WizardStepInputs.course_details.start_date = @toString(newDate)

    @$courseStartDate.val(dateInput)

    @$courseStartDate.trigger('change')

    @update()


  onTermEndDateChange: (e) ->

    dateInput = $(e.currentTarget).val()

    newDate = moment(dateInput).toDate()

    @curDateConfig.termEnd = newDate

    WizardStepInputs.course_details.term_end_date = @toString(newDate)

    @$courseStartDate.datepicker('option', 'maxDate', newDate)

    @curDateConfig.courseEnd = newDate

    WizardStepInputs.course_details.end_date = @toString(newDate)

    @$courseEndDate.val(dateInput)

    @$courseEndDate.trigger('change')

    @update()


  onCourseStartDateChange: (e) ->

    @$courseEndDate.val('')

    @courseLength = 16

    @courseDiff = 16 - @courseLength

    WizardStepInputs.course_details.length_in_weeks = parseInt(@courseLength)

    @curDateConfig.courseEndWeekOf = new Date(@allDates[@courseLength-1])

    WizardStepInputs.course_details.end_weekof_date = @toString(@curDateConfig.courseEndWeekOf)

    @update()
    

  onCourseEndDateChange: (e) ->

    if @$courseStartDate.val() is ''
      return

    dStart = @$courseStartDate.val()

    dEnd = $(e.currentTarget).val()

    newStart = moment(dStart)

    newEnd = moment(dEnd)

    newLength = @getWeeksDiff(newStart,newEnd)

    if newLength < 6 or newLength > 16
      alert('Please pick a date between 6 and 16 weeks of the assignemnt start date')
      return false

    @courseLength = newLength
    
    @courseDiff = 16 - @courseLength

    WizardStepInputs.course_details.length_in_weeks = parseInt(@courseLength)

    @curDateConfig.courseEndWeekOf = new Date(@allDates[@courseLength-1])

    WizardStepInputs.course_details.end_weekof_date = @toString(@curDateConfig.courseEndWeekOf)

    $('output[name="out2"]').html(@courseLength)

    @update()


  updateWeeklyDates: ->

    # console.log WizardStepInputs.course_details

    if @$courseStartDate.val() is ''

      @curDateConfig.courseStart = ''

      WizardStepInputs.course_details.start_date = ''

      $('span.date').hide()

      return

    if @$courseEndDate.val() is ''

      @curDateConfig.courseEnd = ''

      WizardStepInputs.course_details.end_date = ''

      $('span.date').hide()

      return

    @allDates = []

    newStartDate = new Date(@$courseStartDate.val())

    @curDateConfig.courseStart = newStartDate

    WizardStepInputs.course_details.start_date = @toString(newStartDate)

    weekOfDate = @getWeekOfDate(newStartDate)

    @curDateConfig.courseStartWeekOf = weekOfDate

    WizardStepInputs.course_details.start_weekof_date = @toString(weekOfDate)


    newEndDate = new Date(@$courseEndDate.val())

    @curDateConfig.courseEnd = newEndDate

    WizardStepInputs.course_details.end_date = @toString(newEndDate)

    courseEndWeekOf = @getWeekOfDate(newEndDate)

    @curDateConfig.courseEndWeekOf = courseEndWeekOf

    WizardStepInputs.course_details.end_weekof_date = @toString(courseEndWeekOf)

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

          $(item).append("<div class='dow-date dow-date--#{selectedIndex}' ><span contenteditable>#{@dowNames[selectedIndex]} | </span><span contenteditable>#{@getFormattedDateString(new Date(theDate))}</span></div>")
      )
    )

    return @



  clickHandler: (e) ->
    return

    
  changeHandler: (e) ->

    @courseLength = $('#cLength').val()

    @courseDiff = 16 - @courseLength

    WizardStepInputs.course_details.length_in_weeks = parseInt(@courseLength)

    @curDateConfig.courseEndWeekOf = new Date(@allDates[@courseLength-1])

    WizardStepInputs.course_details.end_weekof_date = @toString(@curDateConfig.courseEndWeekOf)

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
    @renderResult()

    @updateWeeklyDates()


  renderPreview: ->
    console.log 'here', @out
    @$previewContainer.html('')

    _.each(@out, (item, index) =>

      thisWeek = index + 1
      nextWeek = index + 2
      isLastWeek = index is @out.length - 1

      # renderTitles()
      if item.title.length > 0

        titles = "<div class='preview-container-header'>"

        titles += "<h4 data-week='#{thisWeek}'>Week #{thisWeek}<span class='date date-#{thisWeek}' data-week='#{thisWeek}'></span></h4>"

        _.each(item.title, (t, i) ->

          if i is 0

           titles += "<h2 class='preview-container-weekly-title'>#{t}</h2>"

          else

            titles += "<h3 class='preview-container-weekly-title preview-container-weekly-title--smaller'>#{t}</h3>"

        )

        titles += "</div>"

        @$previewContainer.append(titles)

      datesOut = "<div class='preview-container-dates dates-preview dates-preview-#{thisWeek}' data-week='#{thisWeek}'></div>"

      @$previewContainer.append(datesOut)

      previewDetails = "<div class='preview-container-details'>"

      # renderInClass()
      if item.in_class.length > 0

        inClassOut = '<div>'

        inClassOut += "<h5 style='font-weight: bold;'>In class</h5>"

        inClassOut += '<ul>'

        _.each(item.in_class, (c) ->
          inClassOut += "<li>#{c}</li>"
        )

        inClassOut += "</ul>"

        inClassOut += "</div>"

        previewDetails += inClassOut

        # @$previewContainer.append(inClassOut)


      # renderAssignments()
      if item.assignments.length > 0

        assignmentsOut = "<div>"

        assignmentsOut += "<h5 style='font-weight: bold;'>Assignments | due week #{nextWeek}</h5>"

        assignmentsOut += '<ul>'

        _.each(item.assignments, (assign) ->
          assignmentsOut += "<li>#{assign}</li>" 
        )

        assignmentsOut += '</ul>'

        assignmentsOut += '</div>'

        previewDetails += assignmentsOut

        # @$previewContainer.append(assignmentsOut)


      # renderMilestones()
      if item.milestones.length > 0

        milestonesOut = "<div>"

        milestonesOut += "<h5 style='font-weight: bold;'>Milestones</h5>"

        milestonesOut += "<ul>"

        _.each(item.milestones, (milestone) ->
          milestonesOut += "<li>#{milestone.title}</li>"
        )

        milestonesOut += "</ul>"

        milestonesOut += "</div>"

        previewDetails += milestonesOut

        # @$previewContainer.append(milestonesOut)

      @$previewContainer.append(previewDetails)

      # if isLastWeek

      #   @$previewContainer.append("<h1>End of Course</h1>")

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

  toString: (date) ->

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

    newDate.setDate(date.getDate()+(weeksOut*7)+1)

    return newDate

  getWeeksDiff: (a, b) ->
    return b.diff(a, 'weeks')


  combine: (obj1, obj2) ->

    title = _.union(obj1.title, obj2.title)

    in_class = _.union(obj1.in_class, obj2.in_class)

    assignments = _.union(obj1.assignments, obj2.assignments)

    milestones = _.union(obj1.milestones, obj2.milestones)

    readings = _.union(obj1.readings, obj2.readings)

    return {title: title, in_class: in_class, assignments: assignments, milestones: milestones, readings: readings}



