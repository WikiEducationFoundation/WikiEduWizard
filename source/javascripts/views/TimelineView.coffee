

#APP
application = require( '../app' )

# SUPER VIEW CLASS
View = require('../views/supers/View')

DetailsTemplate = require('../templates/steps/output/CourseDetailsTemplate.hbs')

GradingTemplate = require('../templates/steps/output/GradingTemplate.hbs')
GradingTemplateTranslation = require('../templates/steps/output/GradingTemplateTranslation.hbs')
GradingCustomTemplate = require('../templates/steps/output/GradingAltTemplate.hbs')

WizardData = require('../data/WizardStepInputs')


module.exports = class TimelineView extends Backbone.View 

  el: $('.form-container')

  wikiSpace: '{{subst:Wikipedia:Education program/Assignment Design Wizard/spaces}}<br/>'

  #wikiSpace: '</br/><br/>'

  wikiNoClass: 'NO CLASS WEEK OF '

  longestCourseLength: 16

  shortestCourseLength: 6

  defaultCourseLength: 16

  defaultEndDates: ['06-30', '12-31']

  currentBlackoutDates: []

  length: 0

  actualLength: 0

  weeklyDates: []

  weeklyStartDates: []

  totalBlackoutWeeks: 0

  daysSelected: [false,false,false,false,false,false,false]

  start_date:
    value: ''

  end_date:
    value: ''

  term_start_date:
    value: ''

  term_end_date:
    value: ''

  initialize: ->
  
    $('input[type="date"]').datepicker(
      dateFormat: 'yy-mm-dd'
      constrainInput: true
      firstDay: 1
    ).prop('type','text')

    @$blackoutDates = $('#blackoutDates')

    @$blackoutDates.multiDatesPicker(
      dateFormat: 'yy-mm-dd'
      firstDay: 1
      altField: '#blackoutDatesField'

      onSelect: =>
        @currentBlackoutDates = @$blackoutDates.multiDatesPicker('getDates')
        @updateTimeline()
    )

    @$startWeekOfDate = $('#startWeekOfDate')
    @$courseStartDate = $('#courseStartDate')
    @$courseEndDate = $('#courseEndDate')
    @$termStartDate = $('#termStartDate')
    @$termEndDate =   $('#termEndDate')

    @$outContainer = $('.output-container')

    @$previewContainer = $('.preview-container')

    @data = []
    @data = application.timelineData

    @dataAlt = application.timelineDataAlt

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

  onDowSelect: (e) ->

    $target = $(e.currentTarget)

    dow = $target.attr('id')

    dowId = parseInt($target.val())

    if $target.is(':checked')
      @daysSelected[dowId] = true

    else
      @daysSelected[dowId] = false

    WizardData.course_details.weekdays_selected = @daysSelected

    if @start_date.value != '' && @end_date.value != ''
      if _.indexOf(@daysSelected, true) != -1
        $('.blackoutDates-wrapper').addClass('open')
      else
        $('.blackoutDates-wrapper').removeClass('open')
    else

      $('.blackoutDates-wrapper').removeClass('open')

    @updateTimeline()


  changeTermStart: (e) ->

    value = $(e.currentTarget).val() || ''

    if value is ''
      @term_end_date =
        value: ''
      return 

    dateMoment = moment(value)
    date = dateMoment.toDate()

    @term_start_date = 
      moment: dateMoment
      date: date
      value: value
      week: dateMoment.week()
      weekday: 
        moment: dateMoment.week(dateMoment.week()).weekday(0)
        date: dateMoment.week(dateMoment.week()).weekday(0).toDate()
        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')

    yearMod = 0

    if @term_start_date.week is 1
      yearMod = 1

    isAfter = dateMoment.isAfter("#{dateMoment.year()+yearMod}-06-01")

    if isAfter
      endDateString = "#{dateMoment.year()}-#{@defaultEndDates[1]}"
    else
      endDateString = "#{dateMoment.year()+yearMod}-#{@defaultEndDates[0]}"

    if isAfter
      isFullWidthCourse = 53 - @term_start_date.week > @defaultCourseLength
    else
      isFullWidthCourse = moment(endDateString).week() - @term_start_date.week > @defaultCourseLength

    @$termEndDate.val(endDateString).trigger('change')
    @$courseStartDate.val(value).trigger('change')

    if isFullWidthCourse 
      defaultEndDate = moment(value).toDate()
      defaultEndDate.setDate(7*@defaultCourseLength)
      @$courseEndDate.val(moment(defaultEndDate).format('YYYY-MM-DD')).trigger('change')
    else
      @$courseEndDate.val(endDateString).trigger('change')

    @$blackoutDates.multiDatesPicker('resetDates', 'picked')

    return

  changeTermEnd: (e) ->

    value = $(e.currentTarget).val() || ''

    if value is ''
      @term_start_date =
        value: ''
      return 

    dateMoment = moment(value)
    date = dateMoment.toDate()

    @term_end_date = 
      moment: dateMoment
      date: date
      value: value
      week: dateMoment.week()
      weekday: 
        moment: dateMoment.week(dateMoment.week()).weekday(0)
        date: dateMoment.week(dateMoment.week()).weekday(0).toDate()
        value: dateMoment.week(dateMoment.week()).weekday(0).format('YYYY-MM-DD')

    @$courseEndDate.val(value).trigger('change')
    @$blackoutDates.multiDatesPicker('resetDates', 'picked')

    return

  changeCourseStart: (e) ->

    value = $(e.currentTarget).val() || ''

    if value is ''
      @start_date =
        value: ''
      @$courseEndDate.val('').trigger('change')
      @updateMultiDatePicker()
      return @updateTimeline 

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

    yearMod = 0

    if @start_date.week is 1
      yearMod = 1

    isAfter = dateMoment.isAfter("#{dateMoment.year()+yearMod}-06-01")

    if isAfter
      endDateString = "#{dateMoment.year()}-#{@defaultEndDates[1]}"
    else
      endDateString = "#{dateMoment.year()+yearMod}-#{@defaultEndDates[0]}"

    @$courseEndDate.val(endDateString).trigger('change')

    if @term_start_date.value is ''
      @$termStartDate.val(value).trigger('change')

    @updateMultiDatePicker()
    @updateTimeline()

    return false


  changeCourseEnd: (e) ->

    value = $(e.currentTarget).val() || ''

    if value is ''
      @end_date =
        value: ''

      @updateMultiDatePicker()
      @updateTimeline()

      return @updateTimeline 

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

    @updateMultiDatePicker()
    @updateTimeline()

    return false

  updateMultiDatePicker: ->


    if @start_date.value != '' && @end_date.value != ''
      @$blackoutDates.multiDatesPicker('destroy')

      @$blackoutDates.multiDatesPicker(
        dateFormat: 'yy-mm-dd'
        firstDay: 1
        altField: '#blackoutDatesField'
        defaultDate: @start_date.weekday.value
        minDate: @start_date.weekday.value
        maxDate: @end_date.value

        onSelect: =>
          @currentBlackoutDates = @$blackoutDates.multiDatesPicker('getDates')
          @updateTimeline()
      )

      @$blackoutDates.multiDatesPicker('resetDates', 'picked')

      if @currentBlackoutDates.length > 0
        @$blackoutDates.multiDatesPicker('addDates', @currentBlackoutDates)

    else 
      @$blackoutDates.multiDatesPicker('destroy')

      @$blackoutDates.multiDatesPicker(
        dateFormat: 'yy-mm-dd'
        firstDay: 1
        altField: '#blackoutDatesField'

        onSelect: =>
          @currentBlackoutDates = @$blackoutDates.multiDatesPicker('getDates')
          @updateTimeline()
      )

      @$blackoutDates.multiDatesPicker('resetDates', 'picked')


  updateTimeline: ->
    @weeklyStartDates = []
    @weeklyDates = [] 
    @out = []
    @outWiki = []

    if @start_date.value != '' && @end_date.value != ''

      #difference in weeks between selected start and end dates
      diff = @getWeeksDiff(@start_date.weekday.moment, @end_date.weekday.moment)

      #actual lenfgth is the actual number of weeks between the start and end date 
      #if less than 6 make it 6 weeks, if more than 16, make it 16 weeks
      @actualLength = 1 + diff 

      if @actualLength < @shortestCourseLength
        @length = @shortestCourseLength
      else if @actualLength > @longestCourseLength
        @length = @longestCourseLength
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
          weekIndex: wi - @totalBlackoutWeeks

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
          thisWeek.weekIndex = ''
          @totalBlackoutWeeks++

        @weeklyDates.push(thisWeek)
      )

      if @totalBlackoutWeeks > 0
        newLength = @length - @totalBlackoutWeeks

        if newLength < 6
          alert('You have blacked out days that will result in a course length that is less than 6 weeks. Please increase the course length.')        
          return false

        else
          @length = newLength

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

        obj = false

        return

      else if item.type is 'week'
        
        if obj is false #if this is the first week after a break - a clean break

          obj = item # make the current working object this new week

        else # if we are working on an object that already has data then ...

          # check to see what its action is when confronted with a combo situation
          if item.action is 'combine' # if action is combine - merge this week with the working object (i.e. previous week(s))

            obj = @combine(obj, item)

          else # if its anything else at this point - just return (i.e. omit it)

            return
        

    )
    
    return out

  update: ->

    WizardData.course_details.start_date = @start_date.value || ''
    WizardData.course_details.end_date = @end_date.value || ''

    if @length
      $('output[name="out2"]').html(@length + ' weeks')
    else
      $('output[name="out2"]').html('')

    @out = @getWikiWeekOutput(@length)
    @outWiki = @out
    @renderResult()

    Backbone.Mediator.publish('output:update', @$outContainer.text())
    Backbone.Mediator.publish('date:change', @)

  renderResult: ->

    @$outContainer.html('')

    # First add the {{course details}} template and course description.
    @$outContainer.append(DetailsTemplate( _.extend(WizardData,{ description: WizardData.course_details.description})))

    # Then add table of contents.
    @$outContainer.append("#{@wikiSpace}")
    @$outContainer.append('{{table of contents}}')
    @$outContainer.append("#{@wikiSpace}")

    # The remainder of the output depends of which assignment type is selected.
    # There are branches for 'researchwrite', 'translation', and the mix-and-match
    # other options.

    # This is the logic for composing the timeline for a 'researchwrite' assignment.
    # It uses TimelineData.coffee and the getWikiWeekOutput function to create the timeline.
    if application.homeView.selectedPathways[0] is 'researchwrite'

      @$outContainer.append('==Timeline==')
      @$outContainer.append("#{@wikiSpace}")

      curWeekOffset = 0

      _.each(@weeklyDates, (week, index) =>

        unless week.classThisWeek
          @$outContainer.append("{{end of course week}}")
          @$outContainer.append("#{@wikiSpace}")
          @$outContainer.append("#{@wikiSpace}")
          @$outContainer.append("===#{@wikiNoClass} #{week.weekStart}===")
          @$outContainer.append("#{@wikiSpace}")
          @$outContainer.append("#{@wikiSpace}")
          return

        item = @outWiki[week.weekIndex]
        thisWeek = week.weekIndex + 1
        nextWeek = week.weekIndex + 2
        isLastWeek = week.weekIndex is @length - 1

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

          if week.weekStart and week.weekStart != ''
            titles += "| weekof = #{week.weekStart} "

          dayCount = 0

          _.each(week.dates, (d, di) =>

            if d.isClass
              dayCount++
              titles += "| day#{dayCount} = #{d.date} "
          )

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

              if condition is true
                if ai is 0
                  @$outContainer.append("{{assignment | due = Week #{nextWeek} }}")
                  @$outContainer.append("#{@wikiSpace}")

                @$outContainer.append("#{assign.wikitext}")
                @$outContainer.append("#{@wikiSpace}")

              else
                if ai is 0
                  @$outContainer.append("{{assignment | due = Week #{nextWeek} }}")
                  @$outContainer.append("#{@wikiSpace}")

            else

              assignmentOutput = ''

              if ai is 0
                @$outContainer.append("{{assignment | due = Week #{nextWeek} }}")
                @$outContainer.append("#{@wikiSpace}")

              if assign.hasVariables
                temp = _.template(assign.wikitext)
                assignmentOutput = "#{temp(WizardData)}"

              else
               assignmentOutput = "#{assign.wikitext}"

              @$outContainer.append(assignmentOutput)
              @$outContainer.append("#{@wikiSpace}")

          )

          @$outContainer.append("#{@wikiSpace}")

        if item.milestones.length > 0
          @$outContainer.append("{{assignment milestones}}")
          @$outContainer.append("#{@wikiSpace}")
          _.each(item.milestones, (m) =>

            @$outContainer.append("#{m.wikitext}")
            @$outContainer.append("#{@wikiSpace}")
          )

          @$outContainer.append("#{@wikiSpace}")

        if isLastWeek
          @$outContainer.append("{{end of course week}}")
          @$outContainer.append("#{@wikiSpace}")

      )
      
      @$outContainer.append(GradingTemplate(WizardData))

    # This is the logic for composing the timeline for translation assignments.
    else if application.homeView.selectedPathways[0] is 'translation'

      # Translation week 1
      @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation essentials}}")
      @$outContainer.append("#{@wikiSpace}")

      # Translation week 2
      if WizardData.translation_choosing_articles.prepare_list.selected
        @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation choose articles from list}}")
      else
        @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation students explore}}")
      @$outContainer.append("#{@wikiSpace}")
      if WizardData.translation_media_literacy.fact_checking.selected
        @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation choose articles fact check end}}")
      else
        @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation choose articles end}}")
        
      # Translation week 3
      if WizardData.translation_media_literacy.fact_checking.selected
        @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation translate and fact check}}")
      else
        @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation translate}}")
      @$outContainer.append("#{@wikiSpace}")

      # Translation weeks 4 & 5
      @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation publish}}")
      @$outContainer.append("#{@wikiSpace}")
      @$outContainer.append("{{subst:Wikipedia:Education program/Assignment Design Wizard/Translation review and revise}}")
      @$outContainer.append("#{@wikiSpace}")

      # Grading
      @$outContainer.append(GradingTemplateTranslation(WizardData))


    # This is the logic for composing the timeline for any other assignment types
    # besides 'researchwrite' and 'translation'.
    # It uses TimelineDataAlt.coffee for the components of the timeline.
    else

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

  getWeeksDiff: (a, b) ->
    return b.diff(a, 'weeks')

  combine: (obj1, obj2) ->
    title = _.union(obj1.title, obj2.title)
    in_class = _.uniq(_.union(obj1.in_class, obj2.in_class),true)
    assignments = _.uniq(_.union(obj1.assignments, obj2.assignments),true)
    milestones = _.uniq(_.union(obj1.milestones, obj2.milestones),true)
    readings = _.union(obj1.readings, obj2.readings)

    return {title: title, in_class: in_class, assignments: assignments, milestones: milestones, readings: readings}

