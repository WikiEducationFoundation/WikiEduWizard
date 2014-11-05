#WIKIEDU Assignment Design Wizard

##Project Setup

- Install Ruby 1.9.3 (RVM is recommended)
- Install Node: [Node.js Installer](http://nodejs.org/)
- Install Gulp globally: `npm install -g gulp`
- Clone and cd into the repo
- Install Ruby dependencies: `bundle install`
- Install Node dependencies: `npm install`

##Development Tasks

- Run `gulp` then navigate to `http://localhost:9395`

##Deployment

- After pushing updates to repo (on Github), run the following command(s)
- Staging: `cap staging deploy`
- Production: `cap production deploy` (This will deploy from remote "production" branch)

##Bower

Bower is used for client-side package management.

- To search for packages
 - `bower search {package name}`
- To install a package
 - `bower install {package name} --save`
