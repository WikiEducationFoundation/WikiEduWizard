UnitsData = [
  #WEEK1
  {
    type: 'week'
    title: ['Wikipedia essentials']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}'
    ]
    assignments: []
    milestones: []
    readings: []
  }
  #WEEK2
  {
    type: 'week'
    priority: 5
    action: 'combine'
    title: ['Editing basics']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}' #T
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}' #T
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}' #T
    ]
    milestones: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}'
    ]
    readings: []
  }
  #WEEK3
  {
    type: 'week'
    priority: 8
    action: 'combine'
    title: ['Exploring the topic area']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}' # FW getting_started.critique_article.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}' # FW2 getting_started.copy_edit_article.selected
    ]
    milestones: []
    readings: []
  }
  #WEEK4
  {
    type: 'week'
    priority: 10
    action: 'combine'
    title: ['Using sources and choosing articles']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}' # FW3 getting_started.add_to_article.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}' # FW4 getting_started.illustrate_article.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices' # PA choosing_articles.students_explore.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose articles from a list}}' # PA choosing_articles.prepare_list.selected}
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = Week 5}}'
    ]
    milestones: []
    readings: []
  }
  #WEEK5
  {
    type: 'week'
    priority: 8
    action: 'combine'
    title: ['Finalizing topics and starting research']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}' #CA choosing_articles.students_explore.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}' #PB
    ]
    milestones: []
    readings: []
  }
  #WEEK6
  {
    type: 'week'
    priority: 7
    action: 'combine'
    title: ['Drafting starter articles']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline }}' # PO research_planning.create_outline.selected && drafts_mainspace.sandbox.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline | sandbox = no }}' # PO research_planning.create_outline.selected && drafts_mainspace.work_live.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Outline as lead section }}' #PO research_planning.write_lead.selected
    ]
    milestones: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}'
    ]
    readings: []
  }
  #WEEK7
  {
    type: 'week'
    priority: 10
    action: 'combine'
    title: ['Moving articles to the main space']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}' #MMS
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}' #dyk.dyk.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}' 
    ]
    milestones: []
    readings: []
  }
  #WEEK8
  {
    type: 'week'
    priority: 5
    action: 'combine'
    title: ['Building articles']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}' #CPR if peer_feedback.peer_reviews.options.0.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}' # CPR else
    ]
    milestones: []
    readings: []
  }
  #WEEK9
  {
    type: 'week'
    priority: 2
    action: 'combine'
    title: ['Creating first draft']
    in_class: [
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}' #1DC
    ]
    milestones: []
    readings: []
  }
  #WEEK10
  {
    type: 'week'
    priority: 6
    action: 'combine'
    title: ['Getting and giving feedback']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}' #PR1 peer_feedback.peer_reviews.options.0.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = {{peer_feedback.peer_reviews.value}} }}' #else
    ]
    milestones: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
    ]
    readings: []
  }
  #WEEK11
  {
    type: 'week'
    priority: 10
    action: 'combine'
    title: ['Responding to feedback']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}' #RFB 
    ]
    milestones: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
    ]
    readings: []
  }
  #WEEK12
  {
    type: 'week'
    priority: 1
    action: 'omit'
    title: ['Continuing improving articles']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}' 
    ]
    milestones: []
    readings: []
  }
  #WEEK13
  {
    priority: 3
    type: 'week'
    action: 'omit'
    title: ['Continuing improving articles']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}' 
    ]
    milestones: []
    readings: []
  }
  #WEEK14
  {
    priority: 4
    type: 'week'
    action: 'omit'
    title: ['Continuing improving articles']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}' 
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}' #if
    ]
    milestones: []
    readings: []
  }
  #WEEK15
  {
    type: 'week'
    priority: 9
    action: 'combine'
    title: ['Class presentations and finishing touches']
    in_class: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}' #supplementary_assignments.class_presentation.selected
    ]
    assignments: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}' #FA
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}' #supplementary_assignments.reflective_essay.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}' #supplementary_assignments.portfolio.selected
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}' #supplementary_assignments.original_paper.selected
    ]
    milestones: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
    ]
    readings: []
  }
  #WEEK16
  {
    type: 'week'
    priority: 10
    action: 'combine'
    title: ['Due date' ]
    codes: ['DD']
    in_class: []
    assignments: []
    milestones: [
      '{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}'
    ]
    readings: []
  }
]

module.exports = UnitsData
