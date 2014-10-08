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
    instructions: 'To get started, you\'ll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community. As their first Wikipedia assignment milestone, you can ask the students to create accounts and then complete the online training for students. '
    inputs: [
      {
        type: 'checkbox'
        id: 'create_user'
        selected: true
        label: 'Create User Account'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'enroll'
        selected: true
        label: 'Enroll to the Course'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'complete_training'
        selected: false
        label: 'Complete Online Training'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'introduce_ambassadors'
        selected: false
        label: 'Introduce Wikipedia Ambassadors Involved'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'include_completion'
        selected: false
        label: 'Include Completion of this Assignment as Part of the Students\'s Grade'
        exclusive: false
      }
    ]
    sections: [
      {
        content: [
          'This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and covers some of the ways they can find help as they get started. It takes about an hour and ends with a certification step that you can use to verify that students completed the training'
        ]
      }
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
        title: 'About This Step'
        content: [
          "It is important for students to start editing Wikipedia right away. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on."
          "Which basic assignments would you like to include in your course?"
          "<em>Each of these is an optional assignment, which the instructor can select or unselect. By default, the first two are selected.</em>"
        ]
      }
    ]
  }
  {
    title: 'Choosing Articles'
    done: false
    include: true
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
        title: 'Choosing Articles'
        content: [
          'Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.'
          'Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.'
        ]
      }
      {
        title: 'Not such a good choice'
        content: [
          'Articles that are "not such a good choice" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.'
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
        content: [
          "<ul>
            <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li>
            <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1-2 paragraphs of information and are in need of expansion. Relevant WikiProject pages can provide a list of stubs that need improvement.</li>
            <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li>
          </ul>"
        ]
      }
      {
        title: ''
        content: [
          "Applying your own expertise to Wikipedia’s coverage of your field is the key to a successful assignment. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia."
          "There are two recommended options for selecting articles for Wikipedia assignments:"
          "<ul>
            <li>You (the instructor) prepare a list of appropriate 'non-existent', 'stub' or 'start' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner.</li>
            <li>Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Letting students find their own articles provides them with a sense of motivation and ownership over the assignment, but it may also lead to choices that are further afield from course material.</li>
          </ul>"
        ]
      }
    ]
  }
  {
    title: 'Research & Planning'
    done: false
    include: true
    instructions:  "Students often wait until the last minute to do their research, or choose sources unsuited for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians."
    sections: [
      {
        title: ''
        content: [
          "Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?"
        ]
      }
      {
        title: 'Traditional Outline'
        content: [
          "For each article, the students create an outline that reflects the improvements they plan to make, and then post it to the article's talk page. This is a relatively easy way to get started."
        ]
      }
      {
        title: 'Wikipedia lead section'
        content: [
          "For each article, the students create a well-balanced summary of its future state in the form of a Wikipedia lead section. The ideal lead section exemplifies Wikipedia's summary style of writing: it begins with a single sentence that defines the topic and places it in context, and then — in one to four paragraphs, depending on the article's size — it offers a concise summary of topic. A good lead section should reflect the main topics and balance of coverage over the whole article."
          "Outlining an article this way is a more challenging assignment — and will require more work to evaluate and provide feedback for. However, it can be more effective for teaching the process of research, writing, and revision. Students will return to this lead section as they go, to guide their writing and to revise it to reflect their improved understanding of the topic as their research progresses. They will tackle Wikipedia's encyclopedic style early on, and their outline efforts will be an integral part of their final work."
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
            label: 'Create an Article Outline'
            value: 'create_outline'
            selected: false
          }
          {
            id: 'research_planning'
            label: 'Write the Article Lead Section'
            value: 'write_lead'
            selected: false
          }
        ]
      }
    ]
  }
  {
    title: 'Drafts & Mainspace'
    done: false
    include: true
    instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandboxes. There are pros and cons to each approach.'
    sections: [
      {
        title: ''
        content: [
          '<strong>Pros and cons to sandboxes:</strong> Sandboxes make students feel safe because they can edit without the pressure of the whole world reading their drafts, or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.'
          '<strong>Pros and cons to editing live:</strong> Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed.'
        ]
      }
    ]
    inputs: [
      {
        type: 'radio'
        id: 'draft_mainspace'
        label: ''
        options: [
          {
            id: 'draft_mainspace'
            label: 'Work Live from the Start'
            value: 'work_live'
            selected: false
          }
          {
            id: 'draft_mainspace'
            label: 'Draft Early Work on Sandboxes'
            value: 'sandbox'
            selected: false
          }
        ]

      }
    ]
  }
  {
    title: 'Peer Feedback'
    done: false
    include: true
    instructions: "Collaboration is a critical element of contributing to Wikipedia. For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles."
    sections: [
      {
        title: ''
        content: [
          "Online Ambassadors with an interest in the students' topics can also make great collaborators. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term."
          "Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers."
          "<em>How many peer reviews will you ask each student to contribute during the course?</em>"
        ]
      }
    ]
    inputs: [
      {
        type: 'radio'
        id: 'peer_reviews'
        label: 'How Many Peer Reviews Should Each Student Conduct?'
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
    title: 'Supplementary Assignments'
    done: false
    include: true
    instructions: "By the time students have made improvements based on classmates' review comments — and ideally suggestions from you as well — students should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria for great content. You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impact and limits of Wikipedia. "
    sections: [
      {
        title: ''
        content: [
          "Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion amongst the class about what the students have done so far and why (or whether) it matters."
          "In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' Wikipedia work. Here are some of the effective supplementary assignments that instructors often use."
        ]
      }
      {
        title: 'Class blog or class discussion'
        content: [
          "Many instructors ask students to keep a running blog about their experiences. Giving them prompts every week or every two weeks, such as “To what extent are the editors on Wikipedia a self-selecting group and why?” will help them begin to think about the larger issues surrounding this online encyclopedia community. It will also give you material both on the wiki and off the wiki to grade. If you have time in class, these discussions can be particularly constructive in person."
        ]
      }
      {
        title: 'In-class presentation of Wikipedia work'
        content: [
          "Each student or group prepares a short presentation for the class, explaining what they worked on, what went well and what didn't, and what they learned. These presentations can make excellent fodder for class discussions to reinforce your course's learning goals."
        ]
      }
      {
        title: 'Reflective essay'
        content: [
          "After the assignment is over, ask students to write a short reflective essay on their experiences using Wikipedia. This works well for both short and long Wikipedia projects. An interesting iteration of this is to have students write a short version of the essay before they begin editing Wikipedia, outlining their expectations, and then have them reflect on whether or not those expectations were met after they have completed the assignment."
        ]
      }
      {
        title: 'Wikipedia portfolio'
        content: [
          "Students organize their Wikipedia work into a portfolio, including a narrative of the contributions they made — and how they were received, and possibly changed, by other Wikipedians — and links to their key edits. Composing this portfolio will help students think more deeply about their Wikipedia experiences, and also provides a lens through which to understand — and grade — their work."
        ]
      }
      {
        title: 'Original analytical paper'
        content: [
          "In courses that emphasize traditional research skills and the development of original ideas through a term paper, Wikipedia's policy of \"no original research\" may be too restrictive. Many instructors pair Wikipedia writing with complementary analytical paper; students’ Wikipedia articles as a literature review, and the students go on to develop their own ideas and arguments in the offline analytical paper."
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
      }
      {
        type: 'checkbox'
        id: 'class_presentation'
        selected: false
        label: 'In-Class Presentation'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'essay'
        selected: false
        label: 'Reflective Essay'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'portfolio'
        selected: false
        label: 'Wikipedia Portfolio'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'original_paper'
        selected: false
        label: 'Original Analytical Paper'
        exclusive: false
      }
    ]
  }
  {
    title: 'DYK / GA Submission'
    done: false
    include: true
    sections: [
      {
        title: 'Did You Know (DYK)'
        content: [
          "Advanced students’ articles may qualify for submission to Did You Know (DYK), a section on Wikipedia’s main page featuring new content. The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x) within the last seven days."
          "The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, but can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its ~6 hours in the spotlight."
          "We strongly recommend trying for DYK status yourself beforehand, or working with experienced Wikipedians to help your students navigate the DYK process smoothly. If your students are working on a related set of articles, it can help to combine multiple article nominations into a single hook; this helps keep your students’ work from swamping the process or antagonizing the editors who maintain it."
        ]
      }
      {
        title: 'Good Article (GA)'
        content: [
          "Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject."
          "The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very good. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term."
          "<em>Do either of these processes make sense for students in your class?</em>"
        ]
      }
    ]
    inputs: [
      {
        type: 'checkbox'
        id: 'dyk'
        selected: false
        label: 'Include DYK Submissions as an Extracurricular Task'
        exclusive: false
      }
      {
        type: 'checkbox'
        id: 'ga'
        selected: false
        label: 'Include Good Article Submission as an Extracurricular Task'
        exclusive: false
      }
    ]
  }
  {
    title: 'Grading'
    done: false
    include: true
    instructions: 'Grading Wikipedia assignments can be a challenge. Here are some tips for grading your Wikipedia assignments:'
    sections: [
      {
        title: 'Know all of your students\' Wikipedia usernames.'
        content: [
          "Without knowing the students' usernames, you won't be able to grade them."
          "Make sure all students enroll on the course page. Once all students have signed the list, you can click on \"user contributions\" (in the menu bar on the left hand side of your browser screen) to review that student's activities on Wikipedia. If you have made student training compulsory, you can check the <a href='https://en.wikipedia.org/wiki/Wikipedia:Training/For_students/Training_feedback' target='_blank'>feedback page</a> to see which students have completed it."
        ]
      }
      {
        title: 'Be specific about your expectations.'
        content: [
          "Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing, etc."
        ]
      }
      {
        title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.'
        content: [
          "You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors."
          "Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community."
          "<em>How will students' grades for the Wikipedia assignment be determined?</em>"
        ]
      }
    ]
    inputs: [
      {
        type: 'text'
        label: 'Learning Wiki Essentials'
        id: 'grade_essentials'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Getting Started with Editing'
        id: 'grade_getting_started'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Choosing Articles'
        id: 'grade_choosing_articles'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Research & Planning'
        id: 'grade_research_planning'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Drafts & Mainspace'
        id: 'grade_drafts_mainspace'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Peer Feedback'
        id: 'grade_peer_feedback'
        value: ''
        placeholder: ''
      }
      {
        type: 'text'
        label: 'Supplementary Assignments'
        id: 'grade_supplementary'
        value: ''
        placeholder: ''
      }
    ]
  }
  {
    title: 'Overview & Timeline'
    done: false
    include: true
    sections: [
      {
        title: 'About the Course'
        content: [
          "Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:"
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
          "<textarea rows='8'></textarea>"
        ]
      }
    ]
  }
  
]

module.exports = WizardData