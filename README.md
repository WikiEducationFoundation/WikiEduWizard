#WIKIEDU Assignment Design Wizard

The Assignment Design Wizard is a tool for helping college and university instructors create custom Wikipedia assignments for their classes. It is meant to be used as part of the [training for educators](https://en.wikipedia.org/wiki/Wikipedia:Training/For_educators), by instructors participating in [Wiki Education Foundation](http://wikiedu.org)'s classroom program. To see the live version, go to [wizard.wikiedu.org](http://wizard.wikiedu.org).

The wizard uses MediaWiki's OAuth system, so that a user grants permission for the wizard to make edits on their behalf using their own account. At the "publish" step, the wizard will post an assignment plan to a user subpage.

##Installation

- Fork this repo, so that you can set it up for a new server.
- Clone the new WikiEduWizard repo and enter that directory.
- Install Ruby 1.9.3 (RVM is recommended)
    - From the WikiEduWizard directory, run the curl script from [rvm.io](https://rvm.io/)
    - Run the install command suggested by the script, something like `rvm install ruby-1.9.3-p550`
- Install Node: [Node.js Installer](http://nodejs.org/)
- Install Gulp globally: `npm install -g gulp`
- Install Ruby dependencies: `bundle install`
- Install Node dependencies: `npm install`
- Change the configuration to include the url of your new repo and the server on which you will run it, and push these changes to your repo.

##OAuth setup

To use the wizard, you must register your instance of it as an MediaWiki OAuth consumer, and then add the tokens to your server environment.

- [Register your OAuth consumer](https://www.mediawiki.org/wiki/Special:OAuthConsumerRegistration/propose)
    - The callback url should take the form [base url of your wizard]/auth/mediawiki
    - Only the 'Edit existing pages' and 'Create, edit, and move pages' are needed.
- Set the environment variables from sample.env with your consumer secret, consumer key, and the api url for the wiki you want to use for OAuth authentication. How you set the environment variables may vary depending on your server setup. On ubuntu with apache, this would typically be done in a file like /etc/apache2/sites-available/wizard.conf

Note that the account that proposes the OAuth consumer will be able to authenticate immediately, but other users cannot authenticate until the consumer gets approved.

##Development Tasks

- Run `gulp` then navigate to `http://localhost:9395`
- Run `gulp build` to just build static assets prior to deploy

##Deployment

For deployment, the Assignment Design Wizard uses [Capistrano](https://en.wikipedia.org/wiki/Capistrano_%28software%29).

- After pushing updates to repo (on Github), run the following command(s)
- Staging: `cap staging deploy`
- Production: `cap production deploy` (This will deploy from remote "production" branch)

##Bower

Bower is used for client-side package management.

- To search for packages
 - `bower search {package name}`
- To install a package
 - `bower install {package name} --save`
