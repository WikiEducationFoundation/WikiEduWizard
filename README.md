WIKIEDU Assignment Design Wizard for Use with [Gulp](http://gulpjs.com/)
================================================================

Includes [CoffeeScript](http://coffeescript.org/), [Browserify](https://github.com/substack/node-browserify) for CommonJS-style module wrapping, [Backbone](http://backbonejs.org/) for structure,
[Stylus](http://learnboost.github.io/stylus/) for CSS pre-processing, sourcemaps for CSS and CoffeeScript,
[Handlebars](http://handlebarsjs.com/) for templating, live-reload for automatic page-refreshes during development and Mocha + PhantomJS for unit testing.

Project Setup
-------------
- Install Node
 - [Node.js Installer](http://nodejs.org/)
- Install Gulp globally
 - `sudo npm install -g gulp`
- Clone and cd into the repo
 - `git clone https://github.com/WINTR/gulp-frontend-scaffold.git && cd gulp-frontend-scaffold`
- Then install Gulp task dependencies
 - `npm install`

Development Tasks
-----------------

- For development: `gulp dev` then navigate to `http://localhost:3000` (or IP address).
- For deploy: `grunt build`

This concatinates and minifies all CoffeeScripts and SASS and moves the project into 'dist' for production deploy.

Bower
-----
Bower is used for client-side package management.  Packages installed via bower are then copied over to `vendor` via `grunt bower` and each time you run `grunt dev`.

- To search for packages
 - `bower search {package name}`
- To install a package
 - `bower install {package name} --save`
 - `gulp bower`
 - Add the path to the new lib into the `concat` task in `gulpfile.coffee` and save



