WizardContent = [
  {
    id: "intro"
    title: 'Welcome to the Wikipedia Assignment Wizard!'
    login_instructions: 'Click Login with WikiMedia to get started'
    instructions: 'This tool will walk you through best practices for Wikipedia classroom assignments and help you create a customized syllabus for your course, broken into weekly assignments.<br/><br/>When you’re finished, you can publish a ready-to-use lesson plan onto a wiki page, where it can be customized even further.<br/><br/>Let’s start by filling in some basics about you and your course:'
    inputs: [
      {
        type: 'text'
        label: 'Instructor name'
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
      
    ]
  }
  {
    id: "assignment_selection"
    title: 'Assignment type selection'
    infoTitle: 'About assignment selections'
    formTitle: 'Available assignments'
    instructions: "You can teach with Wikipedia in several different ways, and it's important to design an assignment that fits on Wikipedia and achieves your student learning objectives. Your first step is to choose which assignment(s) you'll be asking your students to complete as part of the course. We've created some guidelines to help you, but you'll need to make some key decisions, such as: which learning objectives are you targeting with this assignment? What skills do your students already have? How much time can you devote to the assignment?"
    inputs: [
      { 
        type: 'checkbox'
        id: 'researchwrite'
        selected: false
        label: 'Research and write an article'
        exclusive: true
        hasCourseInfo: true
      }
      { 
        type: 'checkbox'
        id: 'evaluate'
        selected: false
        label: 'Evaluate articles'
        exclusive: false
        hasCourseInfo: true
      }
      { 
        type: 'checkbox'
        id: 'multimedia'
        selected: false
        label: 'Add images & multimedia'
        exclusive: false
        hasCourseInfo: true
      }
      { 
        type: 'checkbox'
        id: 'sourcecentered'
        selected: false
        label: 'Source-centered additions'
        exclusive: false
        hasCourseInfo: true
      }
      { 
        type: 'checkbox'
        id: 'copyedit'
        selected: false
        label: 'Copy/edit articles'
        exclusive: false
        hasCourseInfo: true
      }
      { 
        type: 'checkbox'
        id: 'findfix'
        selected: false
        label: 'Find and fix errors'
        exclusive: false
        hasCourseInfo: true
      }  
      { 
        type: 'checkbox'
        id: 'plagiarism'
        selected: false
        label: 'Identify and fix close paraphrasing / plagiarism'
        exclusive: false
        hasCourseInfo: true
      }     
    ]
    sections: [
      {
        title: ''
        content: [
          "<p>Most instructors ask their students to write an article. Students start by learning the basics of Wikipedia, and then they focus on the content. They plan, research, write, and revise a previously missing Wikipedia article or contribute to an existing entry on a course-related topic that is incomplete. This assignment typically replaces a term paper or research project, or it forms the literature review section of a larger paper. The student learning outcome is high with this assignment, but it does take a significant amount of time. To learn how to contribute to Wikipedia, your students need to learn both the wiki markup language and key policies and expectations of the Wikipedia-editing community.</p>"
          "<p>If writing an article isn't right for your class, other assignment options still give students valuable learning opportunities as they improve Wikipedia. Select an assignment type to the left to learn more about each assignment.</p>"
        ]
      }
    ]
  }
  {
    id: "learning_essentials"
    title: 'Learning the Wikipedia essentials'
    formTitle: 'Choose one or more:'
    infoTitle: 'About Wikipedia essentials'
    instructions: 'To get started, you\'ll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community. As their first Wikipedia assignment milestone, you can ask the students to create accounts and then complete the online training for students. '
    inputs: [
      {
        type: 'checkbox'
        id: 'create_user'
        selected: true
        label: 'Create user account'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'enroll'
        selected: true
        label: 'Enroll to the course'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'complete_training'
        selected: false
        label: 'Complete online training'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'introduce_ambassadors'
        selected: false
        label: 'Introduce Wikipedia ambassadors involved'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'include_completion'
        selected: false
        label: 'Include completion of this assignment as part of the students\'s grade'
        exclusive: false
      }
    ]
    sections: [
      {
        content: [
          '<p>This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and covers some of the ways they can find help as they get started. It takes about an hour and ends with a certification step that you can use to verify that students completed the training</p>'
        ]
      }
      {
        title: 'Assignment milestones'
        content: [
          '<p>Create a user account and enroll on the course page</p>'
          '<p>Complete the online training for students. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia.</p>'
          '<p>To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.</p>'
        ]
      }
    ]
  }
  {
    id: "getting_started"
    title: 'Getting started with editing'
    infoTitle: 'About editing'
    instructions: "It is important for students to start editing Wikipedia right away. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on."
    formTitle: 'Which basic assignments would you like to include in your course?'
    inputs: [
      {
        type: 'checkbox'
        id: 'critique_article'
        selected: true
        label: 'Critique an Article'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'add_to_article'
        selected: true
        label: 'Add to an Article'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'copy_edit_article'
        selected: false
        label: 'Copy-Edit an Article'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'illustrate_article'
        selected: false
        label: 'Illustrate an Article'
        exclusive: false
      }
    ]
    sections: [
      {
        title: ''
        content: [
        ]
      }
    ]
  }
  {
    id: 'choosing_articles'
    title: 'Choosing Articles'
    formTitle: 'There are two recommended options for selecting articles for Wikipedia assignments:'
    infoTitle: 'About choosing articles'
    instructions: 'Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.'
    inputs: [
      {
        type: 'radio'
        id: 'choosing_articles'
        label: ''
        options: [
          {
            id: 'choosing_articles'
            label: 'Instructor Prepares a List with Appropriate Articles'
            value: 'prepare_list'
            selected: false

          }
          {
            id: 'choosing_articles'
            label: 'Students Explore and Prepare a List of Articles'
            value: 'students_explore'
            selected: false
          }
        ]
      }
    ]
    sections: [
      {
        title: ''
        content: [
          '<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>'
        ]
      }
      {
        title: ''
        accordian: false
        content: [
          "<p>Applying your own expertise to Wikipedia’s coverage of your field is the key to a successful assignment. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia.</p>"
        ]
      }
      {
        title: 'Not such a good choice'
        accordian: true
        content: [
          "<p>Articles that are \"not such a good choice\" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.</p>"
          "<ul>
            <li>You probably shouldn't try to completely overhaul articles on very broad topics (e.g., Law).</li>
            <li>You should probably avoid trying to improve articles on topics that are highly controversial (e.g., Global Warming, Abortion, Scientology, etc.). You may be more successful starting a sub-article on the topic instead.</li>
            <li>Don't work on an article that is already of high quality on Wikipedia, unless you discuss a specific plan for improving it with other editors beforehand.</li>
            <li>Avoid working on something with scarce literature. Wikipedia articles cite secondary literature sources, so it's important to have enough sources for verification and to provide a neutral point of view.</li>
            <li>Don't start articles with titles that imply an argument or essay-like approach (e.g., The Effects That The Recent Sub-Prime Mortgage Crisis has had on the US and Global Economics). These type of titles, and most likely the content too, may not be appropriate for an encyclopedia.</li>
          </ul>"
        ]
      }
      {
        title: 'Good choice'
        accordian: true
        content: [
          "<ul>
            <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li>
            <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1-2 paragraphs of information and are in need of expansion. Relevant WikiProject pages can provide a list of stubs that need improvement.</li>
            <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li>
          </ul>"
        ]
      }
      
    ]
  }
  {
    id: "research_planning"
    title: 'Research and planning'
    formTitle: 'How should students plan their articles?'
    infoTitle: 'About research and planning'
    instructions:  "Students often wait until the last minute to do their research, or choose sources unsuited for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians."
    sections: [
      {
        title: ''
        content: [
          "<p>Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?</p>"
        ]
      }
    ]
    inputs: [
      {
        type: 'radio'
        id: 'research_planning'
        label: ''
        options: [
          {
            id: 'research_planning'
            label: 'Traditional outline'
            value: 'create_outline'
            selected: false
          }
          {
            id: 'research_planning'
            label: 'Wikipedia lead section'
            value: 'write_lead'
            selected: false
          }
        ]
      }
    ]
  }
  {
    id: "drafts_mainspace"
    title: 'Drafts and mainspace'
    formTitle: 'Choose one:'
    infoTitle: 'About drafts and mainspace'
    instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandboxes. There are pros and cons to each approach.'
    sections: [
      {
        title: ''
        content: [
          "<p>Pros and cons to sandboxes: Sandboxes make students feel safe because they can edit without the pressure of the whole world reading their drafts, or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.</p>"
          "<p>Pros and cons to editing live: Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed.</p>"
          "<p>Will you have your students draft their early work in sandboxes, or work live from the beginning?</p>"
        ]
      }
    ]
    inputs: [
    ]
  }
  {
    id: "peer_feedback"
    title: 'Peer Feedback'
    infoTitle: 'About peer feedback'
    formTitle: "How Many Peer Reviews Should Each Student Conduct?"
    instructions: "Collaboration is a critical element of contributing to Wikipedia. For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles."
    sections: [
      {
        title: ''
        content: [
          "<p>Online Ambassadors with an interest in the students' topics can also make great collaborators. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term.</p>"
          "<p>Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers.</p>"
          
        ]
      }
    ]
    inputs: [
      {
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
        
      }
    ]
  }
  {
    id: "supplementary_assignments"
    title: 'Supplementary Assignments'
    formTitle: 'Choose one or more:'
    infoTitle: 'About supplementary assignments'
    instructions: "By the time students have made improvements based on classmates' review comments — and ideally suggestions from you as well — students should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria for great content. You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impact and limits of Wikipedia. "
    sections: [
      {
        title: ''
        content: [
          "<p>Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion amongst the class about what the students have done so far and why (or whether) it matters.</p>"
          "<p>In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' Wikipedia work. Here are some of the effective supplementary assignments that instructors often use.</p>"
        ]
      }
    ]
    inputs: [
      {
        type: 'checkbox'
        id: 'class_blog'
        selected: false
        label: 'Class Blog or Discussion'
        exclusive: false
        tipInfo: 
          title: 'Class blog or class discussion'
          content: 'Many instructors ask students to keep a running blog about their experiences. Giving them prompts every week or every two weeks, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them begin to think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person.'
      }
      {
        type: 'checkbox'
        id: 'class_presentation'
        selected: false
        label: 'In-Class Presentation'
        exclusive: false
        tipInfo:  
          title: 'In-class presentation of Wikipedia work'
          content: "Each student or group prepares a short presentation for the class, explaining what they worked on, what went well and what didn't, and what they learned. These presentations can make excellent fodder for class discussions to reinforce your course's learning goals."
      }
      {
        type: 'checkbox'
        id: 'essay'
        selected: false
        label: 'Reflective Essay'
        exclusive: false
        tipInfo:  
          title: 'Reflective essay'
          content: "After the assignment is over, ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not those expectations were met after they have completed the assignment."
      }
      {
        type: 'checkbox'
        id: 'portfolio'
        selected: false
        label: 'Wikipedia Portfolio'
        exclusive: false
        tipInfo:  
          title: 'Wikipedia Portfolio'
          content: "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
      }
      {
        type: 'checkbox'
        id: 'original_paper'
        selected: false
        label: 'Original Analytical Paper'
        exclusive: false
        tipInfo:  
          title: 'Original Analytical Paper'
          content: "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
      }
    ]
  }
  {
    id: "dyk_ga"
    title: 'DYK and Good Article processes'
    infoTitle: 'About DYK and Good Article processes'
    formTitle: "Would you like to include these as an ungraded option for your students?"
    sections: [
      {
        title: ''
        content: [
          "<p>Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days.</p>"
          "<p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but it can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its 6 hours in the spotlight.</p>"
          "<p>We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it.</p>"
          "<p>Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>"
          "<p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term, and those written by student editors who are already experienced, strong writers.</p>"
        ]
      }
    ]
    inputs: [
      
    ]
  }
  {
    id: "grading"
    title: 'Grading'
    formTitle: "How will students' grades for the Wikipedia assignment be determined?"
    infoTitle: "About grading"
    instructions: 'Grading Wikipedia assignments can be a challenge. Here are some tips for grading your Wikipedia assignments:'
    sections: [
      {
        title: 'Know all of your students\' Wikipedia usernames.'
        accordian: true
        content: [
          "<p>Without knowing the students' usernames, you won't be able to grade them.</p>"
          "<p>Make sure all students enroll on the course page. Once all students have signed the list, you can click on \"user contributions\" (in the menu bar on the left hand side of your browser screen) to review that student's activities on Wikipedia. If you have made student training compulsory, you can check the <a href='https://en.wikipedia.org/wiki/Wikipedia:Training/For_students/Training_feedback' target='_blank'>feedback page</a> to see which students have completed it.</p>"
        ]
      }
      {
        title: 'Be specific about your expectations.'
        accordian: true
        content: [
          "<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing, etc.</p>"
        ]
      }
      {
        title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.'
        accordian: true
        content: [
          "<p>You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors.</p>"
          "<p>Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community.</p>"
          
        ]
      }
    ]
    inputs: [
      {
        type: 'percent'
        label: 'Learning Wiki Essentials'
        id: 'grade_essentials'
        value: ''
        placeholder: ''
      }
      {
        type: 'percent'
        label: 'Getting Started with Editing'
        id: 'grade_getting_started'
        value: ''
        placeholder: ''
      }
      {
        type: 'percent'
        label: 'Choosing Articles'
        id: 'grade_choosing_articles'
        value: ''
        placeholder: ''
      }
      {
        type: 'percent'
        label: 'Research and planning'
        id: 'grade_research_planning'
        value: ''
        placeholder: ''
      }
      {
        type: 'percent'
        label: 'Drafts & Mainspace'
        id: 'grade_drafts_mainspace'
        value: ''
        placeholder: ''
      }
      {
        type: 'percent'
        label: 'Peer Feedback'
        id: 'grade_peer_feedback'
        value: ''
        placeholder: ''
      }
      {
        type: 'percent'
        label: 'Supplementary Assignments'
        id: 'grade_supplementary'
        value: ''
        placeholder: ''
      }
    ]
  }
  {
    id: "overview"
    title: 'Assignment Overview'
    sections: [
      {
        title: 'About the Course'
        content: [
          "<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:"
          "<ul>
            <li>topics you're covering in the class</li>
            <li>what students will be asked to do on Wikipedia</li>
            <li>what types of articles your class will be working on</li>  
          </ul>"
        ]
      }
      {
        title: 'Short Description'
        content: [
          "<p><textarea id='short_description' rows='8' style='width:100%;'></textarea></p>"
        ]
      }
      {
        title: ''
        content: [
          "<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"
        ]
      }
    ]
    inputs: [
      {
        type: 'edit'
        label: 'Learning Wiki Essentials'
        id: 'grade_essentials'
        value: ''
        placeholder: ''
      }
      {
        type: 'edit'
        label: 'Getting Started with Editing'
        id: 'grade_getting_started'
        value: ''
        placeholder: ''
      }
      {
        type: 'edit'
        label: 'Choosing Articles'
        id: 'grade_choosing_articles'
        value: ''
        placeholder: ''
      }
      {
        type: 'edit'
        label: 'Research and planning'
        id: 'grade_research_planning'
        value: ''
        placeholder: ''
      }
      {
        type: 'edit'
        label: 'Drafts & Mainspace'
        id: 'grade_drafts_mainspace'
        value: ''
        placeholder: ''
      }
      {
        type: 'edit'
        label: 'Peer Feedback'
        id: 'grade_peer_feedback'
        value: ''
        placeholder: ''
      }
      {
        type: 'edit'
        label: 'Supplementary Assignments'
        id: 'grade_supplementary'
        value: ''
        placeholder: ''
      }
    ]
  }
  
]

module.exports = WizardContent