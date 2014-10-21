WizardStepInputs =


  intro: 
    teacher:
      type: 'text'
      label: 'Teacher Name'
      id: 'teacher'
      value: ''
      placeholder: ''
    
    school:
      type: 'text'
      label: 'University'
      id: 'school'
      value: ''
      placeholder: ''
    
    subject:
      type: 'text'
      label: 'Subject'
      id: 'subject'
      value: ''
      placeholder: ''
    
    students:
      type: 'text'
      label: 'Approximate number of students'
      id: 'students'
      value: ''
      placeholder: ''
    
  

  assignment_selection: 
    researchwrite:
      type: 'checkbox'
      id: 'researchwrite'
      selected: false
      label: 'Research and write an article'
      exclusive: true
      hasCourseInfo: true

    evaluate:
      type: 'checkbox'
      id: 'evaluate'
      selected: false
      label: 'Evaluate articles'
      exclusive: false
      hasCourseInfo: true
    
    multimedia:
      type: 'checkbox'
      id: 'multimedia'
      selected: false
      label: 'Add images & multimedia'
      exclusive: false
      hasCourseInfo: true

    sourcecentered:
      type: 'checkbox'
      id: 'sourcecentered'
      selected: false
      label: 'Source-centered additions'
      exclusive: false
      hasCourseInfo: true

    copyedit: 
      type: 'checkbox'
      id: 'copyedit'
      selected: false
      label: 'Copy/edit articles'
      exclusive: false
      hasCourseInfo: true

    findfix:
      type: 'checkbox'
      id: 'findfix'
      selected: false
      label: 'Find and fix errors'
      exclusive: false
      hasCourseInfo: true
    
    plagiarism:
      type: 'checkbox'
      id: 'plagiarism'
      selected: false
      label: 'Identify and fix close paraphrasing / plagiarism'
      exclusive: false
      hasCourseInfo: true



  learning_essentials: 
    create_user:
      type: 'checkbox'
      id: 'create_user'
      selected: true
      label: 'Create User Account'
      exclusive: false
    
    enroll:
      type: 'checkbox'
      id: 'enroll'
      selected: true
      label: 'Enroll to the Course'
      exclusive: false

    complete_training:
      type: 'checkbox'
      id: 'complete_training'
      selected: false
      label: 'Complete Online Training'
      exclusive: false

    introduce_ambassadors:
      type: 'checkbox'
      id: 'introduce_ambassadors'
      selected: false
      label: 'Introduce Wikipedia Ambassadors Involved'
      exclusive: false
    
    include_completion:
      type: 'checkbox'
      id: 'include_completion'
      selected: false
      label: 'Include Completion of this Assignment as Part of the Students\'s Grade'
      exclusive: false
    
  

  getting_started: 
    critique_article:
      type: 'checkbox'
      id: 'critique_article'
      selected: true
      label: 'Critique an Article'
      exclusive: false

    add_to_article:
      type: 'checkbox'
      id: 'add_to_article'
      selected: true
      label: 'Add to an Article'
      exclusive: false

    copy_edit_article:
      type: 'checkbox'
      id: 'copy_edit_article'
      selected: false
      label: 'Copy-Edit an Article'
      exclusive: false
    
    illustrate_article:
      type: 'checkbox'
      id: 'illustrate_article'
      selected: false
      label: 'Illustrate an Article'
      exclusive: false
  

  choosing_articles: 
    prepare_list:
      type: 'radioBox'
      id: 'prepare_list'
      selected: false
      label: 'Instructor Prepares a List with Appropriate Articles'
      exclusive: false
      tipInfo:
        title: "Instructor Prepares a List"
        content: "You (the instructor) prepare a list of appropriate 'non-existent', 'stub' or 'start' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner."
    
    students_explore:
      type: 'radioBox'
      id: 'students_explore'
      selected: false
      label: 'Students Explore and Prepare a List of Articles'
      exclusive: false
      tipInfo:
        title: "Students Explore"
        content: "Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Letting students find their own articles provides them with a sense of motivation and ownership over the assignment, but it may also lead to choices that are further afield from course material."



  research_planning: 
    create_outline:
      type: 'radioBox'
      id: 'create_outline'
      selected: false
      label: 'Create an Article Outline'
      exclusive: false
      tipInfo: 
        title: "Traditional Outline"
        content: "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
    
    write_lead:
      type: 'radioBox'
      id: 'write_lead'
      selected: false
      label: 'Write the Article Lead Section'
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
      label: 'Work Live from the Start'
      exclusive: false
      tipInfo:
        title: "Pros and cons to editing live"
        content: "Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed."
    
    sandbox:
      type: 'radioBox'
      id: 'sandbox'
      selected: false
      label: 'Draft Early Work on Sandboxes'
      exclusive: false
      tipInfo:
        title: "Pros and cons to sandboxes"
        content: "Sandboxes make students feel safe because they can edit without the pressure of the whole world reading their drafts, or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged."


  peer_feedback: 
    peer_reviews:
      type: 'radioGroup'
      id: 'peer_reviews'
      label: ''
      options: [
        {
          id: 'peer_reviews'
          label: '1'
          value: '1'
          selected: false
        }
        {
          id: 'peer_reviews'
          label: '2'
          value: '2'
          selected: true
        }
        {
          id: 'peer_reviews'
          label: '3'
          value: '3'
          selected: false
        }
        {
          id: 'peer_reviews'
          label: '5'
          value: '5'
          selected: false
        }
        {
          id: 'peer_reviews'
          label: '10'
          value: '10'
          selected: false
        }
      ]
    
  

  supplementary_assignments: 
    class_blog:
      type: 'checkbox'
      id: 'class_blog'
      selected: false
      label: 'Class Blog or Discussion'
      exclusive: false
      tipInfo: 
        title: 'Class blog or class discussion'
        content: 'Many instructors ask students to keep a running blog about their experiences. Giving them prompts every week or every two weeks, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them begin to think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person.'
    
    class_presentation:
      type: 'checkbox'
      id: 'class_presentation'
      selected: false
      label: 'In-Class Presentation'
      exclusive: false
      tipInfo:  
        title: 'In-class presentation of Wikipedia work'
        content: "Each student or group prepares a short presentation for the class, explaining what they worked on, what went well and what didn't, and what they learned. These presentations can make excellent fodder for class discussions to reinforce your course's learning goals."
    
    reflective_essay:
      type: 'checkbox'
      id: 'reflective_essay'
      selected: false
      label: 'Reflective Essay'
      exclusive: false
      tipInfo:  
        title: 'Reflective essay'
        content: "After the assignment is over, ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not those expectations were met after they have completed the assignment."
    
    portfolio:
      type: 'checkbox'
      id: 'portfolio'
      selected: false
      label: 'Wikipedia Portfolio'
      exclusive: false
      tipInfo:  
        title: 'Wikipedia Portfolio'
        content: "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
    
    original_paper:
      type: 'checkbox'
      id: 'original_paper'
      selected: false
      label: 'Original Analytical Paper'
      exclusive: false
      tipInfo:  
        title: 'Original Analytical Paper'
        content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."


  dyk_ga: 
    dyk:
      type: 'checkbox'
      id: 'dyk'
      selected: false
      label: 'Include DYK Submissions as an Extracurricular Task'
      exclusive: false
      tipInfo: 
        title: 'Did You Know (DYK)'
        content: "<p>Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days.</p>
        <p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its ~6 hours in the spotlight.</p>
        <p>We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it.</p>"
    
    ga:
      type: 'checkbox'
      id: 'ga'
      selected: false
      label: 'Include Good Article Submission as an Extracurricular Task'
      exclusive: false
      tipInfo: 
        title: 'Good Article (GA)'
        content: "Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>
        <p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term.</p>"



  grading: 
    learning_essentials:
      type: 'percent'
      label: 'Learning Wiki Essentials'
      id: 'learning_essentials'
      value: ''
      placeholder: ''
    
    getting_started:
      type: 'percent'
      label: 'Getting Started with Editing'
      id: 'getting_started'
      value: ''
      placeholder: ''
    
    choosing_articles:
      type: 'percent'
      label: 'Choosing Articles'
      id: 'choosing_articles'
      value: ''
      placeholder: ''
    
    research_planning:
      type: 'percent'
      label: 'Research & Planning'
      id: 'research_planning'
      value: ''
      placeholder: ''
    
    drafts_mainspace:
      type: 'percent'
      label: 'Drafts & Mainspace'
      id: 'drafts_mainspace'
      value: ''
      placeholder: ''
    
    peer_feedback:
      type: 'percent'
      label: 'Peer Feedback'
      id: 'peer_feedback'
      value: ''
      placeholder: ''
    
    supplementary_assignments:
      type: 'percent'
      label: 'Supplementary Assignments'
      id: 'supplementary_assignments'
      value: ''
      placeholder: ''



  overview: 
    learning_essentials:
      type: 'edit'
      label: 'Learning Wiki Essentials'
      id: 'learning_essentials'
      value: ''
      placeholder: ''

    getting_started:
      type: 'edit'
      label: 'Getting Started with Editing'
      id: 'getting_started'
      value: ''
      placeholder: ''

    choosing_articles:
      type: 'edit'
      label: 'Choosing Articles'
      id: 'choosing_articles'
      value: ''
      placeholder: ''

    research_planning:
      type: 'edit'
      label: 'Research & Planning'
      id: 'research_planning'
      value: ''
      placeholder: ''
    
    drafts_mainspace:
      type: 'edit'
      label: 'Drafts & Mainspace'
      id: 'drafts_mainspace'
      value: ''
      placeholder: ''
    
    peer_feedback:
      type: 'edit'
      label: 'Peer Feedback'
      id: 'peer_feedback'
      value: ''
      placeholder: ''
    
    supplementary_assignments:
      type: 'edit'
      label: 'Supplementary Assignments'
      id: 'supplementary_assignments'
      value: ''
      placeholder: ''






module.exports = WizardStepInputs