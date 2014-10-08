WizardData = [
  {
    title: 'Welcome'
    done: true
    include: true
    instructions: 'Depending on the learning goals you have for your course and how much time you want to devote to your Wikipedia project, there are many effective ways to use Wikipedia in your course. The classic Wikipedia writing assignment involves students learning the basics of Wikipedia, then planning, researching, writing, and revising a previously missing or poor quality Wikipedia article, with milestones spread over the whole term. This often takes the place of a traditional term paper or research project. There are also many smaller assignments you can use to help students engage with and think critically about Wikipedia.'
    inputs: [
      {
        type: 'text'
        label: 'Teacher Name'
        id: 'teacher'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'University'
        id: 'school'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Subject'
        id: 'subject'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Approximate number of students'
        id: 'students'
        value: ''
        placeholder: ''
      }
    ]
    sections: [
      {
        content: [
          'Experienced instructors say it is crucial for students who are going to be editing Wikipedia to become comfortable not only with the markup, but also the community. Introducing the Wikipedia project early in the term and requiring milestones throughout the term will acclimate students to the site and head off procrastination.'
          'To make the the most of your Wikipedia project, try to integrate your Wikipedia assignment with the course themes. Engage your students with questions of media literacy and knowledge construction throughout your course.'
        ]
      }
    ]
  }
  {
    title: 'Assignment type selection'
    done: false
    include: true
    inputs: [
      { 
        type: 'checkbox'
        id: 'write'
        selected: false
        label: 'Research and write an article'
        exclusive: true
      }
      { 
        type: 'checkbox'
        id: 'evaluate'
        selected: false
        label: 'Evaluate articles'
        exclusive: false
      }
      { 
        type: 'checkbox'
        id: 'media'
        selected: false
        label: 'Add images & multimedia'
        exclusive: false
      }
      { 
        type: 'checkbox'
        id: 'source'
        selected: false
        label: 'Source-centered additions'
        exclusive: false
      }
      { 
        type: 'checkbox'
        id: 'edit'
        selected: false
        label: 'Copy/edit articles'
        exclusive: false
      }
      { 
        type: 'checkbox'
        id: 'fix'
        selected: false
        label: 'Find and fix errors'
        exclusive: false
      }      
    ]
    sections: [
      
      {
        title: 'Description'
        content: [
          'Working individually or in small teams with your guidance, students choose course-related topics that are not covered well on Wikipedia. After assessing Wikipedia\'s current coverage, the students research their topics to find high-quality secondary sources, then propose an outline for how the topic ought to be covered. They draft their articles, give and respond to peer feedback, take their work live on Wikipedia, and then keep improving their articles until the end of the term. Along the way, students will often work alongside experienced Wikipedia editors who offer critical feedback and help make sure articles meet Wikipedia\'s standards and follow its style conventions. Students who do great work may have the opportunity to have their articles featured on Wikipedia\'s main page. Solid articles will have a long term impact, with thousands of readers in the coming months and years.'
          'Optionally, students may be asked to write a reflective paper about their Wikipedia experience, present their Wikipedia contributions in class, or develop their own ideas and arguments about their topics in a separate essay.'
        ]
      }
      {
        title: 'Requirements'
        content: [
          'Minimum timeline: 6 weeks'
          'Recommended timeline: at least 12 weeks'
          'Not appropriate for large survey courses.'
          'Typically not appropriate for intro courses.'
          'Works best for: graduate students, advanced undergraduates'
        ]
      }
      {
        title: 'Learning objectives'
        content: [
          'Master course content : 4/4 stars'
          'Develop writing skills : 4/4 stars'
          'Increase media and information fluency : 4/4 stars'
          'Improve critical thinking and research skills : 4/4 stars'
          'Foster collaboration : 4/4 stars'
          'Develop technical and communication skills : 4/4 stars'
        ]
      }
    ]
  }
  {
    title: 'Learning Wiki Essentials'
    done: false
    include: true
    instructions: 'To get started, you\'ll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community. As their first Wikipedia assignment milestone, you can ask the students to create accounts and then complete the online training for students. This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and covers some of the ways they can find help as they get started. It takes about an hour and ends with a certification step that you can use to verify that students completed the training'
    sections: [
      {
        title: 'Assignment milestones'
        content: [
          'Create a user account and enroll on the course page'
          'Complete the online training for students. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia.'
          'To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.'
        ]
      }
      {
        content: [
          'Will completion of the student training be part of your students\' grades?'
        ]
      }
    ]
  }
  {
    title: 'Getting Started with Editing'
    done: true
    include: true
  }
  {
    title: 'Choosing Articles'
    done: false
    include: true
  }
  {
    title: 'Research &amp; Planning'
    done: false
    include: true
  }
  {
    title: 'Drafts &amp; Mainspace'
    done: false
    include: true
  }
  {
    title: 'Peer Feedback'
    done: false
    include: true
  }
  {
    title: 'Supplementary Assignments'
    done: false
    include: true
  }
  {
    title: 'DYK / GA Submission'
    done: false
    include: true
  }
  
]

module.exports = WizardData