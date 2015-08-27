WizardStepInputs =
  intro: 
    teacher:
      type: 'text'
      label: 'Instructor name'
      id: 'teacher'
      value: ''
      required: true

    course_name:
      type: 'text'
      label: 'Course name'
      id: 'course_name'
      value: ''
      required: true
    
    school:
      type: 'text'
      label: 'University'
      id: 'school'
      value: ''
      required: true
    
    subject:
      type: 'text'
      label: 'Subject'
      id: 'subject'
      value: ''
      required: true
    
    students:
      type: 'text'
      label: 'Approximate number of students'
      id: 'students'
      value: ''
      required: true

    instructor_username:
      label: 'Username (temporary)'
      id: 'instructor_username'
      value: ''
      
    wizard_start_date:
      isDate: true
      month: ''
      day: ''
      year: ''
      value: ''
      required: true

    wizard_end_date:
      isDate: true
      month: ''
      day: ''
      year: ''
      value: ''
      required: true

  # Assignment selection options
  assignment_selection: 
    researchwrite:
      type: 'checkbox'
      id: 'researchwrite'
      selected: false
      label: 'Create or expand an article'
      exclusive: true
      hasCourseInfo: true
      required: true

    translation: 
      type: 'checkbox'
      id: 'translation'
      selected: false
      label: 'Translate an article'
      exclusive: false
      hasCourseInfo: true
      disabled: false
    
    multimedia:
      type: 'checkbox'
      id: 'multimedia'
      selected: false
      label: 'Add images & multimedia'
      exclusive: false
      hasCourseInfo: true
      disabled: false

    copyedit: 
      type: 'checkbox'
      id: 'copyedit'
      selected: false
      label: 'Copyedit articles'
      exclusive: false
      hasCourseInfo: true
      disabled: false

    something_else:
      type: 'link'
      href: 'mailto:contact@wikiedu.org'
      id: 'something_else'
      selected: false
      label: 'A different assignment? Get in touch here.'
      exclusive: false
      hasCourseInfo: false
      tipInfo:
        title: ''
        content: "Have another idea for incorporating Wikipedia into your class? We've found that these assignments work well, but they aren't the only way to do it. Get in touch, and we can talk things through: <a style='color:#505a7f;' href='mailto:contact@wikiedu.org'>contact@wikiedu.org</a>."

## Start of input options for the researchwrite path
  
  learning_essentials: 
    
    training_graded:
      type: 'radioBox'
      id: 'training_graded'
      selected: false
      label: 'Completion of training will be graded'
      exclusive: false
      required: true

    training_not_graded:
      type: 'radioBox'
      id: 'training_not_graded'
      selected: false
      label: 'Completion of training will not be graded'
      exclusive: false
      required: true


  getting_started: 
    critique_article:
      type: 'checkbox'
      id: 'critique_article'
      selected: true
      label: 'Critique an article'
      exclusive: false
      required: true


    add_to_article:
      type: 'checkbox'
      id: 'add_to_article'
      selected: true
      label: 'Add to an article'
      exclusive: false
      required: true


    copy_edit_article:
      type: 'checkbox'
      id: 'copy_edit_article'
      selected: false
      label: 'Copyedit an article'
      exclusive: false
      required: true
    
    illustrate_article:
      type: 'checkbox'
      id: 'illustrate_article'
      selected: false
      label: 'Illustrate an article'
      exclusive: false
      required: true
  

  choosing_articles: 
    prepare_list:
      type: 'radioBox'
      id: 'prepare_list'
      selected: false
      label: 'Instructor prepares a list'
      exclusive: false
      hasSubChoice: true
      required: true
      
    students_explore:
      type: 'radioBox'
      id: 'students_explore'
      selected: false
      label: 'Students find articles'
      exclusive: false
      hasSubChoice: true
      required: true

    request_help:
      type: 'checkbox'
      id: 'request_help'
      selected: false
      label: 'Would you like help selecting or evaulating article choices?'
      exclusive: false
      required: true
      ignoreValidation: true
      conditional_label: 
        prepare_list: "Would you like help selecting articles?"
        students_explore: "Would you like help evaluating student choices?"
   

  tricky_topics: 
    yes_definitely:
      type: 'radioBox'
      id: 'yes_definitely'
      selected: false
      label: 'Yes. We will work on medicine or psychology articles.'
      exclusive: false
      required: true
      
    maybe:
      type: 'radioBox'
      id: 'maybe'
      selected: false
      label: 'Maybe. Students might choose a medicine or psychology topic.'
      exclusive: false
      required: true 

    definitely_not:
      type: 'radioBox'
      id: 'definitely_not'
      selected: false
      label: 'No. No one will work on medicine or psychology topics.'
      exclusive: false
      required: true 


  research_planning: 
    create_outline:
      type: 'radioBox'
      id: 'create_outline'
      selected: false
      label: 'Traditional outline'
      exclusive: false
      required: true
      tipInfo: 
        title: "Traditional outline"
        content: "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
    
    write_lead:
      type: 'radioBox'
      id: 'write_lead'
      selected: false
      required: true
      label: 'Wikipedia lead section'
      exclusive: false
      tipInfo: 
        title: "Wikipedia lead section"
        content:
          "<p>For each article, the students create a well-balanced summary of its future state in the form of a Wikipedia lead section. The ideal lead section exemplifies Wikipedia's summary style of writing: it begins with a single sentence that defines the topic and places it in context, and then — in one to four paragraphs, depending on the article's size — it offers a concise summary of topic. A good lead section should reflect the main topics and balance of coverage over the whole article.</p>
          <p>Outlining an article this way is a more challenging assignment — and will require more work to evaluate and provide feedback for. However, it can be more effective for teaching the process of research, writing, and revision. Students will return to this lead section as they go, to guide their writing and to revise it to reflect their improved understanding of the topic as their research progresses. They will tackle Wikipedia's encyclopedic style early on, and their outline efforts will be an integral part of their final work.</p>"
        


  drafts_mainspace: 
    work_live:
      type: 'radioBox'
      id: 'work_live'
      selected: false
      label: 'Work live from the start'
      exclusive: false
      required: true
     
    sandbox:
      type: 'radioBox'
      id: 'sandbox'
      selected: false
      label: 'Draft early work in sandboxes'
      exclusive: false
      required: true
     

  peer_feedback: 
    peer_reviews:
      type: 'radioGroup'
      id: 'peer_reviews'
      label: ''
      value: 'two'
      selected: 1
      overviewLabel: 'Two peer review'
      options: [
        {
          id: 0
          name: 'peer_reviews'
          label: '1'
          value: 'one'
          selected: false
          overviewLabel: 'One peer review'
        }
        {
          id: 1
          name: 'peer_reviews'
          label: '2'
          value: 'two'
          selected: true
          overviewLabel: 'Two peer review'
        }
        {
          id: 2
          name: 'peer_reviews'
          label: '3'
          value: 'three'
          selected: false
          overviewLabel: 'Three peer review'

        }
        {
          id: 3
          name: 'peer_reviews'
          label: '4'
          value: 'four'
          selected: false
          overviewLabel: 'Four peer review'

        }
        {
          id: 4
          name: 'peer_reviews'
          label: '5'
          value: 'five'
          selected: false
          overviewLabel: 'Five peer review'
        }
      ]
    
  

  supplementary_assignments: 
    class_blog:
      type: 'checkbox'
      id: 'class_blog'
      selected: false
      required: false
      label: 'Class blog or discussion'
      exclusive: false
      tipInfo: 
        title: 'Class blog or class discussion'
        content: 'Students keep a running blog about their experiences. Giving them prompts every week or two, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person.'
      
    class_presentation:
      type: 'checkbox'
      id: 'class_presentation'
      selected: false
      required: false
      label: 'In-class presentations'
      exclusive: false
      tipInfo:  
        title: 'In-class presentation of Wikipedia work'
        content: "Each student or group prepares a short presentation for the class, explaining what they worked on, what went well and what didn't, and what they learned. These presentations can make excellent fodder for class discussions to reinforce your course's learning goals."
      
    reflective_essay:
      type: 'checkbox'
      id: 'reflective_essay'
      selected: false
      required: false
      label: 'Reflective essay'
      exclusive: false
      tipInfo:  
        title: 'Reflective essay'
        content: "Ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not they met those expectations during the assignment."
      
    portfolio:
      type: 'checkbox'
      id: 'portfolio'
      selected: false
      required: false
      label: 'Wikipedia portfolio'
      exclusive: false
      tipInfo:  
        title: 'Wikipedia portfolio'
        content: "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
    
    original_paper:
      type: 'checkbox'
      id: 'original_paper'
      selected: false
      required: false
      label: 'Original analytical paper'
      exclusive: false
      tipInfo:  
        title: 'Original analytical paper'
        content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with a complementary analytical paper; students’ Wikipedia articles serve as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
    
  dyk:
    dyk:
      type: 'checkbox'
      id: 'dyk'
      selected: false
      required: false
      label: 'Did You Know?'
      exclusive: false

  ga: 
    ga:
      type: 'checkbox'
      id: 'ga'
      selected: false
      required: false
      label: 'Good Article nominations'
      exclusive: false
      

## Start of input options for the translate path

  translation_essentials:
    translation_training_graded:
      type: 'radioBox'
      id: 'translation_training_graded'
      selected: false
      label: 'Completion of training will be graded'
      exclusive: false
      required: true

    translation_training_not_graded:
      type: 'radioBox'
      id: 'translation_training_not_graded'
      selected: false
      label: 'Completion of training will not be graded'
      exclusive: false
      required: true

  translation_choosing_articles:
    prepare_list:
      type: 'radioBox'
      id: 'prepare_list'
      selected: false
      label: 'Instructor prepares a list'
      exclusive: false
      hasSubChoice: true
      required: true
      
    students_explore:
      type: 'radioBox'
      id: 'students_explore'
      selected: false
      label: 'Students find articles'
      exclusive: false
      hasSubChoice: true
      required: true

    request_help:
      type: 'checkbox'
      id: 'request_help'
      selected: false
      label: 'Would you like help selecting or evaulating article choices?'
      exclusive: false
      required: true
      ignoreValidation: true
      conditional_label: 
        prepare_list: "Would you like help selecting articles?"
        students_explore: "Would you like help evaluating student choices?"
    
  translation_media_literacy:
    fact_checking:
      type: 'checkbox'
      id: 'fact_checking'
      selected: false
      required: false
      label: 'Fact-checking assignment'
      exclusive: false

  # grading_multimedia: 
  #   complete_multimedia:
  #     type: 'percent'
  #     label: 'Add images & multimedia'
  #     id: 'complete_multimedia'
  #     value: 50
  #     renderInOutput: true
  #     contingentUpon: []
  
  # grading_copyedit: 
  #   complete_copyedit:
  #     type: 'percent'
  #     label: 'Copyedit articles'
  #     id: 'omplete_copyedit'
  #     value: 50
  #     renderInOutput: true
  #     contingentUpon: []


## Start of grading configuration

  grading: 
    # Research and write an article grading
    researchwrite:
      complete_training:
        type: 'percent'
        label: 'Completion of Wikipedia training'
        id: 'complete_training'
        value: 5
        renderInOutput: true
        pathwayId: 'researchwrite'
        contingentUpon: [
          'training_graded'
        ]

      getting_started:
        type: 'percent'
        label: 'Early Wikipedia exercises'
        id: 'getting_started'
        value: 15   
        renderInOutput: true
        pathwayId: 'researchwrite'
        contingentUpon: []

      outline_quality:
        type: 'percent'
        id: 'outline_quality'
        label: 'Quality of bibliography and outline'
        value: 10   
        renderInOutput: true
        pathwayId: 'researchwrite'
        contingentUpon: []

      peer_reviews:
        id: 'peer_reviews'
        type: 'percent'
        label: 'Peer reviews and collaboration with classmates'
        value: 10   
        renderInOutput: true
        pathwayId: 'researchwrite'
        contingentUpon: []

      contribution_quality:
        type: 'percent' 
        id: 'contribution_quality'
        label: 'Quality of your main Wikipedia contributions'
        value: 50
        renderInOutput: true
        pathwayId: 'researchwrite'
        contingentUpon: []

      supplementary_assignments:
        type: 'percent' 
        id: 'supplementary_assignments'
        label: 'Supplementary assignments'
        value: 10
        renderInOutput: true
        pathwayId: 'researchwrite'
        contingentUpon: [
          'class_blog'
          'class_presentation'
          'reflective_essay'
          'portfolio'
          'original_paper'
        ]

    # Translation assignment grading
    translation:
      complete_translation_training:
        type: 'percent'
        label: 'Was the training completed?'
        id: 'complete_translation_training'
        value: 5
        renderInOutput: true
        pathwayId: 'translation'
        contingentUpon: [
          'translation_training_graded'
        ]

      translation_accuracy:
        type: 'percent'
        label: 'Is the translation accurate?'
        id: 'translation_accuracy'
        value: 25
        renderInOutput: true
        pathwayId: 'translation'
        contingentUpon: [
        ]

      translation_language:
        type: 'percent'
        label: 'Does the article use natural vocabulary?'
        id: 'translation_language'
        value: 25
        renderInOutput: true
        pathwayId: 'translation'
        contingentUpon: [
        ]

      translation_consistency:
        type: 'percent'
        label: "Is the article's style consistent?"
        id: 'translation_consistency'
        value: 15
        renderInOutput: true
        pathwayId: 'translation'
        contingentUpon: [
        ]

      translation_documentation:
        type: 'percent'
        label: "Are the original article's sources well-documented?"
        id: 'translation_documentation'
        value: 15
        renderInOutput: true
        pathwayId: 'translation'
        contingentUpon: [
          'fact_checking'
        ]

      translation_revisions:
        type: 'percent'
        label: 'Does the article adopt new, quality sources?'
        id: 'translation_revisions'
        value: 15
        renderInOutput: true
        pathwayId: 'translation'
        contingentUpon: [
          'fact_checking'
        ]

    # Copyedit grading
    copyedit:
      copyedit:
        type: 'percent'
        label: 'Copyedit articles'
        id: 'copyedit'
        value: 100
        renderInOutput: true
        pathwayId: 'copyedit'
        contingentUpon: [
        ]

    # Add multimedia grading
    multimedia:
      multimedia:
        type: 'percent'
        label: 'Add images & multimedia'
        id: 'multimedia'
        value: 100
        renderInOutput: true
        pathwayId: 'multimedia'
        contingentUpon: [
        ]

    grading_selection:
      label: 'Grading based on:'
      id: 'grading_selection'
      value: ''
      renderInOutput: false
      options: 
        percent: 
          label: 'Percentage'
          value: 'percent'
          selected: true
        points:
          label: 'Points'
          value: 'points'
          selected: false


  overview: 
    learning_essentials:
      type: 'edit'
      label: 'Learning Wiki essentials'
      id: 'learning_essentials'
      value: ''
      

    getting_started:
      type: 'edit'
      label: 'Getting started with editing'
      id: 'getting_started'
      value: ''
      

    choosing_articles:
      type: 'edit'
      label: 'Choosing articles'
      id: 'choosing_articles'
      value: ''
      

    research_planning:
      type: 'edit'
      label: 'Research and planning'
      id: 'research_planning'
      value: ''
      
    
    drafts_mainspace:
      type: 'edit'
      label: 'Drafts and mainspace'
      id: 'drafts_mainspace'
      value: ''
      
    
    peer_feedback:
      type: 'edit'
      label: 'Peer Feedback'
      id: 'peer_feedback'
      value: ''
      
    
    supplementary_assignments:
      type: 'edit'
      label: 'Supplementary assignments'
      id: 'supplementary_assignments'
      value: ''

    wizard_start_date:
      month: ''
      day: ''
      year: ''

    wizard_end_date:
      month: ''
      day: ''
      year: ''

  course_details:
    description: ''
    term_start_date: ''
    term_end_date: ''
    start_date: ''
    start_weekof_date: ''
    end_weekof_date: ''
    end_date: ''
    weekdays_selected: [false,false,false,false,false,false,false]
    length_in_weeks: 16
    assignments: []



    








module.exports = WizardStepInputs
