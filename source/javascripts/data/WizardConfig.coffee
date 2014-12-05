## THIS FILE IS THE DATA CONTENT AND STEP ORDER CONFIGRATION FOR THE WIZARD AS WELL AS ASSIGNMENT PATHWAYS ##
## UNCOMMENTING THE DATA INSIDE THE PATHWAYS SECTION WLL ADD MORE STEPS INTO THOSE ALTERNATIVE PATHWAYS ##

WizardConfig = {
  intro_steps: [
    {
      id: "intro"
      title: '<center>Welcome to the<br />Assignment Design Wizard!</center>'
      login_instructions: 'Click Login with Wikipedia to get started'
      instructions: ''
      inputs: []
      sections: [
        {
          content: [
            "<p class='large'>This tool will help you to easily create a customized Wikipedia classroom assignment and customized syllabus for your course.</p>"
            "<p class='large'>When you’re finished, you'll have a ready-to-use lesson plan, with weekly assignments, published directly onto a sandbox page on Wikipedia where you can customize it even further.</p>"     
            "<p class='large'>Let’s start by filling in some basics about you and your course:</p>"
          ]
        }
      ]
    }
    {
      id: "assignment_selection"
      title: 'Assignment type selection'
      infoTitle: 'About assignment selections'
      formTitle: 'Available assignments:'
      instructions: "You can teach with Wikipedia in several different ways, and it's important to design an assignment that is suitable for Wikipedia <em>and</em> achieves your student learning objectives. Your first step is to choose which assignment(s) you'll be asking your students to complete as part of the course."
      inputs: []
      sections: [
        {
          title: ''
          content: [
            "<p>We've created some guidelines to help you, but you'll need to make some key decisions, such as: which learning objectives are you targeting with this assignment? What skills do your students already have? How much time can you devote to the assignment?</p>"
            "<p>Most instructors ask their students to write or expand an article. Students start by learning the basics of Wikipedia, and then focus on the content. They plan, research, and write a previously missing Wikipedia article, or contribute to an incomplete entry on a course-related topic. This assignment typically replaces a term paper or research project, or it forms the literature review section of a larger paper. The student learning outcome is high with this assignment, but it does take a significant amount of time. Your students need to learn both the wiki markup language and key policies and expectations of the Wikipedia-editing community.</p>"
            "<p>If writing an article isn't right for your class, other assignment options offer students valuable learning opportunities and help to improve Wikipedia. Select an assignment type on the left to learn more.</p>"
          ]
        }
      ]
    }
  ]
  pathways: {
    ###################################
    researchwrite: [
      {
        id: "learning_essentials"
        title: 'Wikipedia essentials'
        showInOverview: true
        formTitle: 'Choose one:'
        infoTitle: 'About Wikipedia essentials'
        instructions: "To get started, you'll want to introduce your students to the basic rules of writing Wikipedia articles and working with the Wikipedia community."
        inputs: []
        sections: [
          {
            title: ''
            content: [
              '<p>As their first Wikipedia assignment milestone, you can ask the students to create user accounts and then complete the <em>online training for students</em>. This training introduces the Wikipedia community and how it works, demonstrates the basics of editing and walks students through their first edits, gives advice for selecting articles and drafting revisions, and explains further sources of support as they continue along. It takes about an hour and ends with a certification step, which you can use to verify that students completed the training.</p>'
              '<p>Students who complete this training are better prepared to focus on learning outcomes, and spend less time distracted by cleaning up after errors.</p>'
              '<p>Will completion of the student training be part of your students\' grades? (Make your choice at the top left.)</p>'
            ]
          }
          {
            title: 'Assignment milestones'
            accordian: true
            content: [
              "<ul>
                <li>Create a user account and enroll on the course page. </li>
                <li>Complete the <em>online training for students</em>. During this training, you will make edits in a sandbox and learn the basic rules of Wikipedia.</li>
                <li>To practice editing and communicating on Wikipedia, introduce yourself to any Wikipedians helping your class (such as a Wikipedia Ambassador), and leave a message for a classmate on their user talk page.</li>
              </ul>"
            ]
          }
        ]
      }
      {
        id: "getting_started"
        title: 'Getting started with editing'
        showInOverview: true
        infoTitle: 'About early editing tasks'
        instructions: "It is important for students to start editing Wikipedia early on. That way, they become familiar with Wikipedia's markup (\"wikisyntax\", \"wikimarkup\", or \"wikicode\") and the mechanics of editing and communicating on the site. We recommend assigning a few basic Wikipedia tasks early on."
        formTitle: 'Which basic assignments would you like to include?'
        inputs: []
        sections: [
          {
            title: ''
            content: [
              '<p>Which introductory assignments would you like to use to acclimate your students to Wikipedia? You can select none, one, or more. Whichever you select will be added to the assignment timeline.</p>'
              '<ul>
                <li><strong>Critique an article.</strong> Critically evaluate an existing Wikipedia article related to the class, and leave suggestions for improving it on the article’s talk page. </li>
                <li><strong>Add to an article.</strong> Using course readings or other relevant secondary sources, add 1–2 sentences of new information to a Wikipedia article related to the class. Be sure to integrate it well into the existing article, and include a citation to the source. </li>
                <li><strong>Copyedit an article.</strong> Browse Wikipedia until you find an article that you would like to improve, and make some edits to improve the language or formatting. </li>
                <li><strong>Illustrate an article.</strong> Find an opportunity to improve an article by uploading and adding a photo you took.</li>
              </ul>'
            ]
          }
          {
            content: [
              '<p>For most courses, the <em>Critique an article</em> and <em>Add to an article</em> exercises provide a nice foundation for the main writing project. These have been selected by default.</p>'
            ]
          }
        ]
      }
      {
        id: 'choosing_articles'
        title: 'Choosing articles'
        showInOverview: true
        formTitle: 'How will your class select articles?'
        infoTitle: 'About choosing articles'
        inputs: []
        sections: [
          {
            title: ''
            content: [
              '<p>Choosing the right (or wrong) articles to work on can make (or break) a Wikipedia writing assignment.</p>'
              '<p>Some articles may initially look easy to improve, but quality references to expand them may be difficult to find. Finding topics with the right balance between poor Wikipedia coverage and available literature from which to expand that coverage can be tricky. Here are some guidelines to keep in mind when selecting articles for improvement.</p>'
            ]
          }
          {
            title: 'Good choice'
            accordian: true
            content: [
              "<ul>
                <li>Choose a well-established topic for which a lot of literature is available in its field, but which isn't covered extensively on Wikipedia.</li>
                <li>Gravitate toward \"stub\" and \"start\" class articles. These articles often have only 1–2 paragraphs of information and are in need of expansion. Relevant WikiProject pages can provide a list of stubs that need improvement.</li>
                <li>Before creating a new article, search related topics on Wikipedia to make sure your topic isn't already covered elsewhere. Often, an article may exist under another name, or the topic may be covered as a subsection of a broader article.</li>
              </ul>"
            ]
          }
          {
            title: 'Not such a good choice'
            accordian: true
            content: [
              '<p>Articles that are "not such a good choice" for newcomers usually involve a lack of appropriate research material, highly controversial topics that may already be well developed, broad subjects, or topics for which it is difficult to demonstrate notability.</p>'
              "<ul>
                <li>You probably shouldn't try to completely overhaul articles on very broad topics (e.g., Law).</li>
                <li>You should probably avoid trying to improve articles on topics that are highly controversial (for example, Global Warming, Abortion, or Scientology). You may be more successful starting a sub-article on the topic instead.</li>
                <li>Don't work on an article that is already of high quality on Wikipedia, unless you discuss a specific plan for improving it with other editors beforehand.</li>
                <li>Avoid working on something with scarce literature. Wikipedia articles cite secondary literature sources, so it's important to have enough sources for verification and to provide a neutral point of view.</li>
                <li>Don't start articles with titles that imply an argument or essay-like approach (e.g., The Effects That The Recent Sub-Prime Mortgage Crisis has had on the US and Global Economics). These type of titles, and most likely the content too, may not be appropriate for an encyclopedia.</li>
              </ul>"
            ]
          }
          {
            title: ''
            content: [
              '<p>As the instructor, you should apply your own expertise to examining Wikipedia’s coverage of your field. You understand the broader intellectual context where individual topics fit in, you can recognize where Wikipedia falls short, you know—or know how to find—the relevant literature, and you know what topics your students should be able to handle. Your guidance on article choice and sourcing is critical for both your students’ success and the improvement of Wikipedia.</p>'
              '<p>There are two recommended options for selecting articles:</p>'
            ]
          }
          {
            title: 'Instructor prepares a list'
            content: [
              '<p>You (the instructor) prepare a list of appropriate \'non-existent\', \'stub\' or \'start\' articles ahead of time for the students to choose from. If possible, you may want to work with an experienced Wikipedian to create the list. Each student chooses an article from the list to work on. Although this requires more preparation, it may help students to start researching and writing their articles sooner.</p>'
            ]
          }
          {
            title: 'Students find articles'
            content: [
              '<p>Each student explores Wikipedia and lists 3–5 topics on their Wikipedia user page that they are interested in for their main project. You (the instructor) should approve article choices before students proceed to writing. Having students find their own articles provides them with a sense of motivation and ownership over the assignment and exercises their critical thinking skills as they identify content gaps, but it may also lead to choices that are further afield from course material.</p>'
            ]
          } 
        ]
      }
      {
        id: "tricky_topics"
        title: 'Tricky topic areas'
        showInOverview: true
        formTitle: 'Will any students work in these areas?'
        infoTitle: 'Medicine and other tricky topics'
        sections: [
          {
            title: ''
            content: [
              "<p>Writing about medicine is especially tricky and has some extra rules for sourcing. If you expect any of your students to work on medicine-related topics — including psychology — you'll need to familiarize yourself, and those students, with the special sourcing rules for medical topics. Wiki Education Foundation can also send you subject-specific brochures with advice for writing psychology and/or medicine articles.</p>"
            ]
          }
        ]
        inputs: []
      }
      {
        id: "research_planning"
        title: 'Research and planning'
        showInOverview: true
        formTitle: 'How should students plan their articles?'
        infoTitle: 'About research and planning'
        sections: [
          {
            title: ''
            content: [
              "<p>Students often wait until the last minute to do their research, or choose sources unsuitable for Wikipedia. That's why we recommend asking students to put together a bibliography of materials they want to use in editing the article, which can then be assessed by you and other Wikipedians.</p>"
              "<p>Then, students should propose outlines for their articles. This can be a traditional outline, in which students identify which sections their articles will have and which aspects of the topic will be covered in each section. Alternatively, students can develop each outline in the form of a Wikipedia lead section — the untitled section at the beginning of an article that defines the topic and provide a concise summary of its content. Would you like your students to create traditional outlines, or compose outlines in the form of a Wikipedia-style lead section?</p>"
            ]
          }
        ]
        inputs: []
      }
      {
        id: "drafts_mainspace"
        showInOverview: true
        title: 'Drafts and mainspace'
        formTitle: 'Choose one:'
        infoTitle: 'About drafts and mainspace'
        instructions: 'Once students have gotten a grip on their topics and the sources they will use to write about them, it’s time to start writing on Wikipedia. You can ask them to jump right in and edit live, or start them off in their own sandbox pages. There are pros and cons of each approach.'
        sections: [
          {
            title: 'Pros and cons of sandboxes'
            content: [
              "<p>Sandboxes — pages associated with an individual editor that are not considered part of Wikipedia proper — make students feel safe. They can edit without the pressure of the whole world reading their drafts or other Wikipedians altering their writing. However, sandbox editing limits many of the unique aspects of Wikipedia as a teaching tool, such as collaborative writing and incremental drafting. Spending more than a week or two in sandboxes is strongly discouraged.</p>" 
            ]
          }
          {
            title: 'Pros and cons of editing live'
            content: [
              "<p>Editing live is exciting for the students because they can see their changes to the articles immediately and experience the collaborative editing process throughout the assignment. However, because new editors often unintentionally break Wikipedia rules, sometimes students’ additions are questioned or removed.</p>"
            ]
          }
          {
            title: ''
            content: '"<p>Will you have your students draft their early work in sandboxes, or work live from the beginning?</p>"'
          }
        ]
        inputs: []
      }
      {
        id: "peer_feedback"
        title: 'Peer feedback'
        showInOverview: true
        infoTitle: 'About peer feedback'
        formTitle: "How many peer reviews should each student conduct?"
        instructions: "Collaboration is a critical element of contributing to Wikipedia."
        sections: [
          {
            title: ''
            content: [
              "<p>For some students, this will happen spontaneously; their choice of topics will attract interested Wikipedians who will pitch in with ideas, copyedits, or even substantial contributions to the students’ articles. In many cases, however, there will be little spontaneous editing of students’ articles before the end of the term. Fortunately, you have a classroom full of peer reviewers. You can make the most of this by assigning students to review each others’ articles soon after full-length drafts are posted. This gives students plenty of time to act on the advice of their peers.</p>"
              "<p>Peer reviews are another chance for students to practice critical thinking. Useful reviews focus on specific issues that can be improved. Since students are usually hesitant to criticize their classmates—and other Wikipedia editors may get annoyed with a stream of praise from students that glosses over an article's shortcomings—it's important to gives examples of the kinds of constructively critical feedback that are the most helpful.</p>"
              "<p>How many peer reviews will you ask each student to contribute during the course?</p>"
            ]
          }
        ]
        inputs: []
      }
      {
        id: "supplementary_assignments"
        title: 'Supplementary assignments'
        showInOverview: true
        formTitle: 'Choose supplementary assignments (optional):'
        infoTitle: 'About supplementary assignments'
        instructions: "By the time students have made improvements based on classmates' comments—and ideally suggestions from you as well—they should have produced nearly complete articles. Now is the chance to encourage them to wade a little deeper into Wikipedia and its norms and criteria to create great content."
        sections: [
          {
            title: ''
            content: [
             "<p>You’ll probably have discussed many of the core principles of Wikipedia—and related issues you want to focus on—but now that they’ve experienced first-hand how Wikipedia works, this is a good time to return to topics like neutrality, media fluency, and the impacts and limits of Wikipedia. Consider bringing in a guest speaker, having a panel discussion, or simply having an open discussion in class about what the students have done so far and why (or whether) it matters.</p>"
             "<p>In addition to the Wikipedia article writing itself, you may want to use a supplementary assignment. These assignments can reinforce and deepen your course's learning outcomes, and also help you to understand and evaluate the students' work and learning outcomes. On the left are some of the effective supplementary assignments that instructors often use. Scroll over each for more information, and select any that you wish to use for your course.</p>"
            ]
          }
        ]
        inputs: []
      }
      {
        id: "dyk"
        title: 'DYK process'
        showInOverview: false
        infoTitle: 'About the <em>Did You Know</em> process'
        formTitle: "Would you like to include DYK as an ungraded option?"
        sections: [
          {
            title: ''
            content: [
              "<p>Did You Know (DYK) is a section on Wikipedia’s main page highlighting new content that has been added to Wikipedia in the last seven days. DYK can be a great opportunity to get students excited about their work. A typical DYK article will be viewed hundreds or thousands of times during its 6 hours in the spotlight.</p>"
              "<p>The general criteria for DYK eligibility are that an article is larger than 1,500 characters of original, well-sourced content (about four paragraphs) and that it has been created or expanded (by a factor of 5x or more) within the last seven days. Students who meet this criteria may want to nominate their contributions for DYK.</p>"
              "<p>The short window of eligibility, and the strict rules of the nomination process, can make it challenging to incorporate DYK into a classroom project. The DYK process should not be a required part of your assignment, as the DYK nomination process can be difficult for newcomers to navigate. However, it makes a great stretch goal when used selectively.</p>"
              "<p>Would you like to include DYK as an ungraded option? If so, the Wiki Ed team can help you and your students during the term to identify work that may be a good candidate for DYK and answer questions you may have about the nomination process.</p>"
            ]
          }
        ]
        inputs: []
      }
      {
        id: "ga"
        title: 'Good Article process'
        showInOverview: false
        infoTitle: 'About the <em>Good Article</em> process'
        formTitle: "Would you like to include this as an ungraded option?"
        sections: [
          {
            title: ''
            content: [
              "<p>Well-developed articles that have passed a Good Article (GA) review are a substantial achievement in their own right, and can also qualify for DYK. This peer review process involves checking a polished article against Wikipedia's GA criteria: articles must be well-written, verifiable and well-sourced with no original research, broad in coverage, neutral, stable, and appropriately illustrated (when possible). Practically speaking, a potential Good Article should look and sound like other well-developed Wikipedia articles, and it should provide a solid, well-balanced treatment of its subject.</p>"
              "<p>The Good Article nominations process generally takes some time — between several days and several weeks, depending on the interest of reviewers and the size of the review backlog in the subject area — and should only be undertaken for articles that are already very well-developed. Typically, reviewers will identify further specific areas for improvement, and the article will be promoted to Good Article status if all the reviewers' concerns are addressed. Because of the uncertain timeline and the frequent need to make substantial changes to articles, Good Article nominations usually only make sense for articles that reach a mature state several weeks before the end of term, and those written by student editors who are already experienced, strong writers and who are willing to come back to address reviewer feedback (even after the term ends)</em>.</p>"
              "<p>Would you like to include this as an ungraded option? If so, the Wiki Ed team can provide advice and support to high-achieving students who are interested in the Good Article process.</p>"
            ]
          }
        ]
        inputs: []
      }
      # {
      #   id: "overview"
      #   title: 'Assignment overview'
      #   showInOverview: false
      #   infoTitle: "About the course"
      #   formTitle: ""
      #   sections: [
      #     {
      #       content: [
      #         "<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:"
      #         "<ul>
      #           <li>topics you're covering in the class</li>
      #           <li>what students will be asked to do on Wikipedia</li>
      #           <li>what types of articles your class will be working on</li>  
      #         </ul>"
      #       ]
      #     }
          
      #     {
      #       content: [
      #         "<p class='description-container' style='margin-bottom:0;'></p>"
      #         "<div class='form-container'>
      #           <form id='courseLength' oninput='out.value = parseInt(courseLength.value); out2.value = parseInt(courseLength.value);' onsubmit='return false'>
      #             <div class='overview-input-container'>
      #               <label for='termStartDate'>Term begins</label>
      #               <input id='termStartDate' name='termStartDate' type='date'>
      #             </div>
      #             <div class='overview-input-container' style='display: none;'>
      #               <label for='termEndDate'>Term ends</label>
      #               <input id='termEndDate' name='termEndDate' type='date'>
      #             </div>
      #             <!-- %div.overview-input-container -->
      #             <!-- %label{:for => 'endDate'} End Week of -->
      #             <!-- %input{:type => 'date', :id => 'endDate', :name => 'endDate'} -->
      #             <div class='overview-input-container'>
      #               <label for='courseStartDate'>Course starts on</label>
      #               <input id='courseStartDate' name='courseStartDate' type='date'>
      #             </div>
      #             <div class='overview-input-container' style='display: none;'>
      #               <label for='startWeekOfDate'>Start week of</label>
      #               <input id='startWeekOfDate' name='startWeekOfDate' type='date'>
      #             </div>
      #             <div class='overview-input-container' style='display: none;'>
      #               <label for='endWeekOfDate'>End week of</label>
      #               <input id='endWeekOfDate' name='endWeekOfDate' type='date'>
      #             </div>
      #             <div class='overview-input-container'>
      #               <label for='courseLength'>Course Length</label>
      #               <input defaultValue='16' id='cLength' max='16' min='6' name='courseLength' step='1' type='range' value='16'>
      #               <output name='out2'>16</output>
      #               <span>weeks</span>
      #             </div>
      #             <div class='overview-select-container'>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='monday' name='Monday' type='checkbox' value='0'>
      #                 <label for='monday'>Mondays</label>
      #               </div>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='tuesday' name='Tuesday' type='checkbox' value='1'>
      #                 <label for='tuesday'>Tuesdays</label>
      #               </div>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='wednesday' name='Wednesday' type='checkbox' value='2'>
      #                 <label for='wednesday'>Wednesdays</label>
      #               </div>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='thursday' name='Thursday' type='checkbox' value='3'>
      #                 <label for='thursday'>Thursdays</label>
      #               </div>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='friday' name='Friday' type='checkbox' value='4'>
      #                 <label for='friday'>Fridays</label>
      #               </div>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='saturday' name='Saturday' type='checkbox' value='5'>
      #                 <label for='saturday'>Saturdays</label>
      #               </div>
      #               <div class='overview-select-input-container'>
      #                 <input class='dowCheckbox' id='sunday' name='Sunday' type='checkbox' value='6'>
      #                 <label for='sunday'>Sundays</label>
      #               </div>
      #             </div>
      #             <div class='overview-readout-header'>
      #               <div class='readout'>
      #                 <output for='courseLength' id='courseLengthReadout' name='out'>16</output>
      #                 <span>weeks</span>
      #               </div>
      #             </div>
      #           </form>
      #         </div>
      #         <div>
      #           <div class='preview-container'></div>
      #         </div>"
      #       ]
      #     }
      #     {
      #       content: [
      #         "<div class='step-form-dates'></div>"
      #       ]
      #     }
      #     {
      #       title: ''
      #       content: [
      #         "<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"
      #       ]
      #     }
      #   ]
      #   inputs: []
      # }
    ]
    ###################################
    multimedia: [
      # {
      #   id: "multimedia_1"
      #   showInOverview: true
      #   title: 'Multimedia step 1'
      #   formTitle: 'Choose one:'
      #   infoTitle: 'Instruction Title'
      #   instructions: "Step Instructions"
      #   inputs: []
      #   sections: [
      #   ]
      # }
      # {
      #   id: "multimedia_2"
      #   showInOverview: true
      #   title: 'Multimedia step 2'
      #   formTitle: 'Choose one:'
      #   infoTitle: 'Instruction Title'
      #   instructions: "Step Instructions"
      #   inputs: []
      #   sections: [
      #   ]
      # }
      # {
      #   id: "grading_multimedia"
      #   type: "grading"
      #   title: 'Grading'
      #   showInOverview: false
      #   formTitle: "How will students' grades for assignments be determined?"
      #   infoTitle: "About grading"
      #   instructions: 'Grading Wikipedia assignments can be a challenge. Here are some tips for grading your Wikipedia assignments:'
      #   sections: [
      #     {
      #       title: 'Know all of your students\' Wikipedia usernames.'
      #       accordian: true
      #       content: [
      #         "<p>Without knowing the students' usernames, you won't be able to grade them.</p>"
      #         "<p>Make sure all students enroll on the course page. Once all students have signed the list, you can click on \"user contributions\" (in the menu bar on the left hand side of your browser screen) to review that student's activities on Wikipedia. If you have made student training compulsory, you can check the <a href='https://en.wikipedia.org/wiki/Wikipedia:Training/For_students/Training_feedback' target='_blank'>feedback page</a> to see which students have completed it.</p>"
      #       ]
      #     }
      #     {
      #       title: 'Be specific about your expectations.'
      #       accordian: true
      #       content: [
      #         "<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing.</p>"
      #       ]
      #     }
      #     {
      #       title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.'
      #       accordian: true
      #       content: [
      #         "<p>You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors.</p>"
      #         "<p>Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community.</p>"
              
      #       ]
      #     }
      #   ]
      #   inputs: []
      # }
      # {
      #   id: "overview"
      #   title: 'Assignment overview'
      #   type: "overview"
      #   showInOverview: false
      #   infoTitle: "About the course"
      #   formTitle: ""
      #   sections: [
      #     {
      #       content: [
      #         "<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:"
      #         "<ul>
      #           <li>topics you're covering in the class</li>
      #           <li>what students will be asked to do on Wikipedia</li>
      #           <li>what types of articles your class will be working on</li>  
      #         </ul>"
      #       ]
      #     }
          
      #     {
      #       content: [
      #         "<p class='description-container'></p>"
      #       ]
      #     }
      #     {
      #       content: [
      #         "<div class='step-form-dates'></div>"
      #       ]
      #     }
      #     {
      #       title: ''
      #       content: [
      #         "<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"
      #       ]
      #     }
      #   ]
      #   inputs: []
      # }
    ]
    ###################################
    copyedit: [
      # {
      #   id: "copyedit_1"
      #   title: 'Copy Edit step 1'
      #   showInOverview: true
      #   formTitle: 'Choose one:'
      #   infoTitle: 'Instruction Title'
      #   instructions: "Step Instructions"
      #   inputs: []
      #   sections: [
      #   ]
      # }
      # {
      #   id: "copyedit_2"
      #   title: 'Copy Edit step 2'
      #   showInOverview: true
      #   formTitle: 'Choose one:'
      #   infoTitle: 'Instruction Title'
      #   instructions: "Step Instructions"
      #   inputs: []
      #   sections: [
      #   ]
      # }
      # {
      #   id: "grading_copyedit"
      #   type: "grading"
      #   title: 'Grading'
      #   showInOverview: false
      #   formTitle: "How will students' grades for assignments be determined?"
      #   infoTitle: "About grading"
      #   instructions: 'Grading Wikipedia assignments can be a challenge. Here are some tips for grading your Wikipedia assignments:'
      #   sections: [
      #     {
      #       title: 'Know all of your students\' Wikipedia usernames.'
      #       accordian: true
      #       content: [
      #         "<p>Without knowing the students' usernames, you won't be able to grade them.</p>"
      #         "<p>Make sure all students enroll on the course page. Once all students have signed the list, you can click on \"user contributions\" (in the menu bar on the left hand side of your browser screen) to review that student's activities on Wikipedia. If you have made student training compulsory, you can check the <a href='https://en.wikipedia.org/wiki/Wikipedia:Training/For_students/Training_feedback' target='_blank'>feedback page</a> to see which students have completed it.</p>"
      #       ]
      #     }
      #     {
      #       title: 'Be specific about your expectations.'
      #       accordian: true
      #       content: [
      #         "<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing.</p>"
      #       ]
      #     }
      #     {
      #       title: 'Grade based on what students contribute to Wikipedia, not what remains on Wikipedia at the course\'s end.'
      #       accordian: true
      #       content: [
      #         "<p>You can see a student's contributions in the article history, even if some writing was removed by the community (or the student). A student’s content could be edited for many reasons, and can even be evidence of a student reflecting critically on their own contributions. Furthermore, if students feel they must defend control of an article for the sake of their grade, this can lead to conflict with other editors.</p>"
      #         "<p>Wikipedia is a collaborative writing environment driven by verifiability, noteworthiness and neutral point of view – all of which have created challenges for students familiar with a persuasive writing format in classrooms. Encourage students to reflect on edits to improve their understanding of the process and the community.</p>"
              
      #       ]
      #     }
      #   ]
      #   inputs: []
      # }
      # {
      #   id: "overview"
      #   type: "overview"
      #   title: 'Assignment overview'
      #   infoTitle: "About the course"
      #   showInOverview: false
      #   formTitle: ""
      #   sections: [
      #     {
      #       content: [
      #         "<p>Now it's time to write a short description of your course and how this Wikipedia assignment fits into it. This will allow other Wikipedia editors to understand what students will be doing. Be sure to mention:"
      #         "<ul>
      #           <li>topics you're covering in the class</li>
      #           <li>what students will be asked to do on Wikipedia</li>
      #           <li>what types of articles your class will be working on</li>  
      #         </ul>"
      #       ]
      #     }
          
      #     {
      #       content: [
      #         "<p class='description-container'></p>"
      #       ]
      #     }
      #     {
      #       content: [
      #         "<div class='step-form-dates'></div>"
      #       ]
      #     }
      #     {
      #       title: ''
      #       content: [
      #         "<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"
      #       ]
      #     }
      #   ]
      #   inputs: []
      # }
    ]
  }
  outro_steps: [
    {
      id: "grading"
      title: 'Grading'
      showInOverview: false
      formTitle: "How will students' grades for assignments be determined?"
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
            "<p>Being specific about what you expect your students to do is crucial for grading. For example, students could be asked to add a minimum of three sections to an existing article, or a minimum of eight references to an existing article that lacks the appropriate sourcing.</p>"
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
      inputs: []
    }
    {
      id: "overview"
      title: 'Assignment overview'
      showInOverview: false
      infoTitle: "About the course"
      formTitle: ""
      sections: [
        {
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
          content: [
            "<p class='description-container' style='margin-bottom:0;'></p>"
            "<div>
              <div class='preview-container'></div>
            </div>"
          ]
        }
        # {
        #   content: [
        #     "<div class='step-form-dates'></div>"
        #   ]
        # }
        {
          title: ''
          content: [
            "<p><a id='publish' href='#' class='button' style='display:inline-block;text-align:center;'>Publish</a></p>"
          ]
        }
      ]
      inputs: []
    }
  ]
}

module.exports = WizardConfig

