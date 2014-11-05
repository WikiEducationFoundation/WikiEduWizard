set :application, "wikieduwizard-staging"
server "198.89.124.191", :app, :web, :db, :primary => true
set :deploy_to, "/var/www/#{application}"
set :repository, "git@github.com:WINTR/WikiEduWizard.git"
set :scm, :git
set :branch, "master"
