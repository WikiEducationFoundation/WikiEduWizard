## THIS FILES IS USED AS THE MASTER FOR ALL WIKI OUT RELATED TO THE MAIN ASSIGNMENT TYPE ##
## THE BREAK ARE USED TO DETERMINE HOW THE ASSIGNMENT EXPANDS AND CONTRACT BASED ON COURSE LENGTH ##
## THE action VARIABLE IS USED TO DETERMINE WHETHER OR NOT THE CONTENT IS COMBINED WITH ITS PREDECESOR OR WHETHER ITS OMITTED ALL TOGETHER##

TimelineData = [
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    title: ['Wikipedia essentials']
    in_class: [
      {
        text: 'Intro to Wikipedia'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Intro to Wikipedia}}'
      }
    ]
    assignments: []
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 5
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Editing basics']
    in_class: [
      {
        text: 'Editing basics in class'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'
      }
    ]
    assignments: [
      {
        text: 'Complete the training'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete the training}}'
      }
      {
        text: 'Create userpage and sign up'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Create userpage and sign up}}'
      }
      {
        text: 'Practice communicating'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Practice communicating}}'
      }
    ]
    milestones: [
      {
        text: 'Students enrolled'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Students enrolled}}'
      }
    ]
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 8
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Exploring the topic area']
    in_class: [
      {
        text: 'Editing basics in class'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Editing basics in class}}'
      }
    ]
    assignments: [
      {
        text: 'Evaluate an article'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate an article}}'
        condition: 'WizardData.getting_started.critique_article.selected'
      }
      {
        text: 'Copyedit an article'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Copyedit an article}}'
        condition: 'WizardData.getting_started.copy_edit_article.selected'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 0
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Using sources and choosing articles']
    in_class: [
      {
        text: 'Using sources in class'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Using sources in class}}'
      }
    ]
    assignments: [
      {
        text: 'Add to an article'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Add to an article}}'
        condition: 'WizardData.getting_started.add_to_article.selected'
      }
      {
        text: 'Illustrate an article'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Illustrate an article}}'
        condition: 'WizardData.getting_started.illustrate_article.selected'
      }
      {
        text: 'List article choices'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/List article choices}}'
        condition: 'WizardData.choosing_articles.students_explore.selected'
      }
      {
        text: 'Choose articles from a list'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose articles from a list}}'
        condition: 'WizardData.choosing_articles.prepare_list.selected'
      }
      {
        text: 'Evaluate article selections | due = next week'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Evaluate article selections | due = next week }}'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 0
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Finalizing topics and starting research']
    in_class: [
      {
        text: 'Discuss topics'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss topics}}'
      }
    ]
    assignments: [
      {
        text: 'Select article from student choices'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Select article from student choices}}'
        condition: 'WizardData.choosing_articles.students_explore.selected'
      }
      {
        text: 'Compile a bibliography'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Compile a bibliography}}'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 7
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Drafting starter articles']
    in_class: [
      {
        text: 'Discuss etiquette and sandboxes'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss etiquette and sandboxes}}'
      }
    ]
    assignments: [
      {
        text: 'Conventional outline '
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline}}'
        condition: 'WizardData.research_planning.create_outline.selected && WizardData.drafts_mainspace.sandbox.selected'
      }
      {
        text: 'Conventional outline | sandbox = no'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Conventional outline | sandbox = no }}'
        condition: 'WizardData.research_planning.create_outline.selected && WizardData.drafts_mainspace.work_live.selected'
      }
      {
        text: 'Outline as lead section'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Outline as lead section}}'
        condition: 'WizardData.research_planning.write_lead.selected'
      }
    ]
    milestones: [
      {
        text: 'Students have started editing'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Students have started editing}}'
      }
    ]
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 0
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Moving articles to the main space']
    in_class: [
      {
        text: 'Main space in class'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Main space in class}}'
      }
    ]
    assignments: [
      {
        text: 'Move to main space'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Move to main space}}'
      }
      {
        text: 'DYK nominations'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/DYK nominations}}'
        condition: 'WizardData.dyk.dyk.selected'
      }
      {
        text: 'Expand your article'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Expand your article}}'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 0
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Building articles']
    in_class: [
      {
        text: 'Building articles in class'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Building articles in class}}'
      }
    ]
    assignments: [
      {
        text: 'Choose one peer review article'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose one peer review article}}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[0].selected'
      }
      {
        text: 'Choose peer review articles'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = two }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[1].selected'
      }
      {
        text: 'Choose peer review articles'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = three }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[2].selected'
      }
      {
        text: 'Choose peer review articles'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = four }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[3].selected'
      }
      {
        text: 'Choose peer review articles'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Choose peer review articles| peerreviewnumber = five }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[4].selected'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 2
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Creating first draft']
    in_class: [
    ]
    assignments: [
      {
        text: 'Complete first draft' #1DC
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Complete first draft}}'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 6
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Getting and giving feedback']
    in_class: [
      {
        text: 'Group suggestions'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Group suggestions}}'
      }
    ]
    assignments: [
      {
        text: 'Do one peer review'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do one peer review}}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[0].selected'
      }
      {
        text: 'Do peer reviews'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = two }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[1].selected'
      }
      {
        text: 'Do peer reviews'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = three }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[2].selected'
      }
      {
        text: 'Do peer reviews'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = four }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[3].selected'
      }
      {
        text: 'Do peer reviews'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Do peer reviews | peerreviewnumber = five }}'
        condition: 'WizardData.peer_feedback.peer_reviews.options[4].selected'
      }
    ]
    milestones: [
      {
        text: 'Articles have been reviewed'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
      }
    ]
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 0
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Responding to feedback']
    in_class: [
      {
        text: 'Media literacy discussion'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Media literacy discussion}}'
      }
    ]
    assignments: [
      {
        text: 'Make edits based on peer reviews'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Make edits based on peer reviews}}'
      }
    ]
    milestones: [
      {
        text: 'Articles have been reviewed'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
      }
    ]
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 1
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'omit'
    title: ['Continuing to improve articles']
    in_class: [
      {
        text: 'Discuss further article improvements'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
      }
    ]
    assignments: [
      {
        text: 'Continue to improve articles' 
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 3
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'omit'
    title: ['Continuing to improve articles']
    in_class: [
      {
        text: 'Discuss further article improvements'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
      }
    ]
    assignments: [
      {
        text: 'Continue to improve articles' 
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}' 
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 4
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Continuing to improve articles']
    in_class: [
      {
        text: 'Discuss further article improvements'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Discuss further article improvements}}'
      }
    ]
    assignments: [
      {
        text: 'Continue to improve articles'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Continue improving articles}}'
      }
      {
        text: 'Prepare in-class presentation'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Prepare in-class presentation}}'
        condition: 'WizardData.supplementary_assignments.class_presentation.selected'
      }
    ]
    milestones: []
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 9
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Finishing touches']
    in_class: [
      {
        text: 'In-class presentations'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/In-class presentations}}'
        condition: 'WizardData.supplementary_assignments.class_presentation.selected'
      }
    ]
    assignments: [
      {
        text: 'Final touches to articles'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Final touches to articles}}'
      }
      {
        text: 'Reflective essay'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Reflective essay}}'
        condition: 'WizardData.supplementary_assignments.reflective_essay.selected'
      }
      {
        text: 'Wikipedia portfolio'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Wikipedia portfolio}}'
        condition: 'WizardData.supplementary_assignments.portfolio.selected'
      }
      {
        text: 'Original argument paper'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Original argument paper}}'
        condition: 'WizardData.supplementary_assignments.original_paper.selected'
      }
    ]
    milestones: [
      {
        text: 'Articles have been reviewed'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/Articles have been reviewed}}'
      }
    ]
    readings: []
  }
  #--------------------------------------------------------
  # BREAK 
  #--------------------------------------------------------
  {
    type: 'break'
    value: 10
  }
  #--------------------------------------------------------
  #--------------------------------------------------------
  {
    type: 'week'
    action: 'combine'
    title: ['Due date' ]
    in_class: []
    assignments: []
    milestones: [
      {
        text: 'All students finished'
        wikitext: '{{subst:Wikipedia:Education program/Assignment Design Wizard/All students finished}}'
      }
    ]
    readings: []
  }
]

module.exports = TimelineData

