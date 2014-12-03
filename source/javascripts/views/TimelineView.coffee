

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

DetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs')

GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs')

GradingCustomTemplate = require('../templates/steps/output/GradingAltTemplate.hbs')

OptionsTemplate = require('../templates/steps/output/CourseOptionsTemplate.hbs')

WizardData = require('../data/WizardStepInputs')


module.exports = class TimelineView extends Backbone.View 

  el: $('.form-container')

  wikiSpace: '{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}<br/>'

  wikiNoClass: 'NO CLASS WEEK OF '

  longestCourseLength: 16

  shortestCourseLength: 6

  defaultEndDates: ['06-30', '12-31']

  currentBlackoutDates: []

  length: 16

  actualLength: 0

  weeklyDates: []

  totalBlackoutWeeks: 0

  weeklyStartDates: []

  totalBlackoutWeeks: 0

  curDateConfig:

    termStart: WizardData.course_details.term_start_date

    termEnd: WizardData.course_details.term_end_date

    courseStart: WizardData.course_details.start_date

    courseEnd: WizardData.course_details.end_date

    courseStartWeekOf: WizardData.course_details.start_weekof_date

    courseEndWeekOf: WizardData.course_details.end_weekof_date

    numberWeeks: WizardData.course_details.length_in_weeks

  daysSelected: WizardData.course_details.weekdays_selected

  blackoutDates: WizardData.course_details.blackout_dates

  defaultCourseLength: 16

  allDates: []

  dowNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']


  dowAbbrv: ['Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat', 'Sun']


  dowLetter: ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su']


  renderDays: true

  start_date:
    value: ''

  end_date:
    value: ''

  onDowSelect: (e) ->

    $target = $(e.currentTarget)

    dow = $target.attr('id')

    dowId = parseInt($target.val())

    if $target.is(':checked')

      @daysSelected[dowId] = true

    else

      @daysSelected[dowId] = false

    WizardData.course_details.weekdays_selected = @daysSelected

    @updateTimeline()


  initialize: ->
  
    $('input[type="date"]').datepicker(

      dateFormat: 'yy-mm-dd'

      constrainInput: true

      firstDay: 1

    ).prop('type','text')

    @$blackoutDates = $('#blackoutDates')

    @$blackoutDates.multiDatesPicker(

      dateFormat: 'yy-mm-dd'

      constrainInput: true

      firstDay: 1
    )

    @$startWeekOfDate = $('#startWeekOfDate')

    @$courseStartDate = $('#courseStartDate')

    @$courseEndDate = $('#courseEndDate')

    @$termStartDate = $('#termStartDate')

    @$termEndDate =   $('#termEndDate')

    @$outContainer = $('.output-container')

    @$previewContainer = $('.preview-container')

    @data = []

    @data = application.timelineDataAlt

    @dataAlt = application.timelineData

    $('#termStartDate').on 'change', (e) =>
      @changeTermStart(e)

    $('#termEndDate').on 'change', (e) =>
      @changeTermEnd(e)

    $('#courseStartDate').on 'change', (e) =>
      @changeCourseStart(e)

    $('#courseEndDate').on 'change', (e) =>
      @changeCourseEnd(e)

    $('.dowCheckbox').on 'change', (e) =>
      @onDowSelect(e)

    $('#termStartDate').on 'focus', (e) =>
      $('body,html').animate(
        scrollTop: $('#termStartDate').offset().top - 350
      , 400)

    @update()

  changeCourseStart: (e) ->

    value = $(e.currentTarget).val()

    dateMoment = moment(value)

    date = dateMoment.toDate()

    @start_date = 

      moment: dateMoment

      date: date

      value: value

      week: dateMoment.week()

      weekday: 

        moment: dateMoment.week(dateMoment.week()).weekday(0)

        date: dateMoment.week(dateMoment.week()).weekday(0).toDate()

        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')

    @updateTimeline()


    return false


  changeCourseEnd: (e) ->

    value = $(e.currentTarget).val()

    dateMoment = moment(value)

    date = dateMoment.toDate()

    @end_date = 

      moment: dateMoment

      date: date

      value: value

      week: dateMoment.week()

      weekday: 

        moment: dateMoment.week(dateMoment.week()).weekday(0)

        date: dateMoment.week(dateMoment.week()).weekday(0).toDate()

        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')

    @updateTimeline()

    return false


  updateTimeline: ->

    @currentBlackoutDates = @$blackoutDates.multiDatesPicker('getDates')

    timeline = []

    if @start_date.value != '' && @end_date.value != ''

      #difference in weeks between selected start and end dates
      diff = @getWeeksDiff(@start_date.weekday.moment, @end_date.weekday.moment)

      #actual lenfgth is the actual number of weeks between the start and end date 
      #if less than 6 make it 6 weeks, if more than 16, make it 16 weeks
      @actualLength = 1 + diff 

      if @actualLength < 6

        @length = 6

      else if @actualLength > 16

        @length = 16

      else 

        @length = @actualLength

      #make an array of all the monday week start dates as strings
      @weeklyStartDates = []

      w = 0

      while w < @length

        if w is 0

          newDate = moment(@start_date.weekday.moment).format('YYYY-MM-DD')

        else

          newDate = moment(@start_date.weekday.moment).week(@start_date.week+w).format('YYYY-MM-DD')
        
        @weeklyStartDates.push(newDate)

        w++

      @weeklyDates = []

      @totalBlackoutWeeks = 0


      #make an object that lists out each week with dates and whether or not the week meets and whether or not each day meets
      _.each(@weeklyStartDates, (weekdate, wi) =>

        dMoment = moment(weekdate)

        totalSelected = 0

        totalBlackedOut = 0

        thisWeek =

          weekStart: dMoment.format('YYYY-MM-DD')

          classThisWeek: true

          dates: []

        _.each(@daysSelected, (day, di) =>

          if day 

            isClass = true

            dateString = dMoment.weekday(di).format('YYYY-MM-DD')
            
            totalSelected++


            if _.indexOf(@currentBlackoutDates, dateString) != -1

              totalBlackedOut++

              isClass = false

            thisWeek.dates.push({isClass: isClass, date: dateString})

          else

            thisWeek.dates.push({})
        )

        if totalBlackedOut != 0 and totalSelected is totalBlackedOut

          thisWeek.classThisWeek = false

          @totalBlackoutWeeks++

        @weeklyDates.push(thisWeek)

      )

      if @totalBlackoutWeeks > 0

        newLength = @length - @totalBlackoutWeeks

        if newLength < 6

          alert('You have blackouted out days that will result in a course length that is less than 6 weeks. Please increase the course length.')
          
          return false

        else

          @length = newLength

          newCourse = @getWikiWeekOutput(@length)

    @update()

    return @



  # don't touch this function unless you know what you are doing ;-)
  getWikiWeekOutput: (length) ->

    diff = 16 - length

    out = []

    unitsClone = _.clone(@data)

    if diff > 0

      unitsClone = _.reject(unitsClone, (item) =>

        return item.type is 'break' && diff >= item.value && item.value != 0

      )

    obj = unitsClone[0]

    _.each(unitsClone, (item, index) =>

      if item.type is 'break' || index is unitsClone.length - 1

        if index is unitsClone.length - 1

          out.push _.clone(item)

        else

          out.push _.clone(obj)

        obj = {}

        return

      else if item.type is 'week'

        obj = @combine(obj, item)

    )

    return out

  update: ->

    WizardData.course_details.start_date = @start_date.value || ''
    WizardData.course_details.end_date = @end_date.value || ''


    @out = @getWikiWeekOutput(@length)
    
    @outWiki = @out

    console.log @length, @outWiki

    # @renderPreview()

    @renderResult()

    Backbone.Mediator.publish('output:update', @$outContainer.text())

    Backbone.Mediator.publish('date:change', @)


  renderPreview: ->

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

          inClassOut += "<li>#{c.text}</li>"

        )

        inClassOut += "</ul>"

        inClassOut += "</div>"

        previewDetails += inClassOut

      if item.assignments.length > 0

        assignmentsOut = "<div>"

        assignmentsOut += "<h5 style='font-weight: bold;'>Assignments | due week #{nextWeek}</h5>"

        assignmentsOut += '<ul>'

        _.each(item.assignments, (assign) ->
          assignmentsOut += "<li>#{assign.text}</li>" 
        )

        assignmentsOut += '</ul>'

        assignmentsOut += '</div>'

        previewDetails += assignmentsOut

      if item.milestones.length > 0

        milestonesOut = "<div>"

        milestonesOut += "<h5 style='font-weight: bold;'>Milestones</h5>"

        milestonesOut += "<ul>"

        _.each(item.milestones, (milestone) ->
          milestonesOut += "<li>#{milestone.text}</li>"
        )

        milestonesOut += "</ul>"

        milestonesOut += "</div>"

        previewDetails += milestonesOut


      @$previewContainer.append(previewDetails)


    )


  renderResult: ->

    @$outContainer.html('')

    @$outContainer.append(DetailsTemplate( _.extend(WizardData,{ description: WizardData.course_details.description})))

    if application.homeView.selectedPathways[0] is 'researchwrite'

      addWeeks = 0

      @$outContainer.append("#{@wikiSpace}")

      @$outContainer.append('{{table of contents}}')

      @$outContainer.append("#{@wikiSpace}")

      @$outContainer.append('==Timeline==')

      @$outContainer.append("#{@wikiSpace}")

      curWeekOffset = 0

      _.each(@outWiki, (item, index) =>

        thisWeek = index + 1

        nextWeek = index + 2

        isLastWeek = index is @out.length - 1

        noClassThisWeek = false


        #TODO GET THOSE DATES BACK IN THERE!!


        if item.title.length > 0

          titles = ""

          extra = if thisWeek is 1 then '1' else ''

          titles += "{{subst:Wikipedia:Education program/Assignment Design Wizard/course week #{extra}| #{thisWeek} | "

          _.each(item.title, (t, i) ->

            if i is 0

             titles += "#{t}"

            else

              titles += ", #{t}"

          )


          #TODO GET THOSE DATES BACK IN THERE!!


          titles += "}}"

          @$outContainer.append(titles)

          @$outContainer.append("#{@wikiSpace}")
  
      
        if item.in_class.length > 0

          _.each(item.in_class, (c, ci) =>

            if c.condition && c.condition != ''

              condition = eval(c.condition)

              if condition 

                if ci is 0

                  @$outContainer.append("{{in class}}")

                  @$outContainer.append("#{@wikiSpace}")

                @$outContainer.append("#{c.wikitext}")

                @$outContainer.append("#{@wikiSpace}")

            else

              if ci is 0

                @$outContainer.append("{{in class}}")

                @$outContainer.append("#{@wikiSpace}")

              @$outContainer.append("#{c.wikitext}")

              @$outContainer.append("#{@wikiSpace}")
          )

          @$outContainer.append("#{@wikiSpace}")


        if item.assignments.length > 0

          _.each(item.assignments, (assign, ai) =>

            if assign.condition && assign.condition != ''

              condition = eval(assign.condition)

              if condition 

                if ai is 0

                  @$outContainer.append("{{assignment | due = Week #{nextWeek} }}")

                  @$outContainer.append("#{@wikiSpace}")

                @$outContainer.append("#{assign.wikitext}")

                @$outContainer.append("#{@wikiSpace}")

            else

              if ai is 0

                @$outContainer.append("{{assignment | due = Week #{nextWeek} }}")

                @$outContainer.append("#{@wikiSpace}")

              @$outContainer.append("#{assign.wikitext}")

              @$outContainer.append("#{@wikiSpace}")

          )

          @$outContainer.append("#{@wikiSpace}")

        if item.milestones.length > 0

          console.log 'milestones', item.milestones

          @$outContainer.append("{{assignment milestones}}")

          @$outContainer.append("#{@wikiSpace}")

          _.each(item.milestones, (m) =>

            if m.condition && m.condition != ''

              @$outContainer.append("#{m.wikitext}")

              @$outContainer.append("#{@wikiSpace}")

            else

              @$outContainer.append("#{m.wikitext}")

              @$outContainer.append("#{@wikiSpace}")

          )

          @$outContainer.append("#{@wikiSpace}")

        if isLastWeek

          @$outContainer.append("{{end of course week}}")

          @$outContainer.append("#{@wikiSpace}")

      )
      
      @$outContainer.append(GradingTemplate(WizardData))

    else

      @$outContainer.append("#{@wikiSpace}")

      @$outContainer.append('{{table of contents}}')

      @$outContainer.append("#{@wikiSpace}")

      gradingItems = []

      _.each(application.homeView.selectedPathways, (pathway) =>

        gradingItems.push(WizardData.grading[pathway][pathway])

        _.each(@dataAlt[pathway], (item, ind) =>

          @$outContainer.append("<div>#{item}</div><br/>")

          if ind is 0

            @$outContainer.append("#{@wikiSpace}")

        )
        @$outContainer.append("<br/>")
        @$outContainer.append("#{@wikiSpace}")
        @$outContainer.append("<div></div>")
      )

      @$outContainer.append("<br/>")

      @$outContainer.append(GradingCustomTemplate({gradeItems: gradingItems}))

    @$outContainer.append(OptionsTemplate(WizardData))

    

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

    newDate.setHours(0,0,0,0)

    newDate.setDate(date.getDate()+(weeksOut*7))

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



