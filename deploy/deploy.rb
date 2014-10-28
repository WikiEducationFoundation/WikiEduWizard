set :application, "wikieduwizard"

server "198.89.124.191", :app, :web, :db, :primary => true
set :address, "198.89.124.191"
set :deploy_to, "/var/www/#{application}"
set :user, "root"
set :use_sudo, false

default_run_options[:pty] = true

set :repository, "git@github.com:WINTR/WikiEduWizard.git"
set :scm, :git
set :branch, "master"

set :deploy_via, :remote_cache
set :copy_strategy, :checkout
set :keep_releases, 5

# Deployment process
before "deploy", "deploy:check_revision"
# after "deploy", "deploy:bundle"

namespace :deploy do
  task :start do ; end
  task :stop do ; end

  # desc "Bundle Install"
  # task :bundle, roles: :app do 
  #   run "bundle install --without development test"
  # end

  desc "Restart server"
  task :restart, :roles => :app, :except => { :no_release => true } do
    run "#{try_sudo} touch #{File.join(current_path,'tmp','restart.txt')}"
  end

  desc "Make sure local git is in sync with remote."
  task :check_revision, roles: :app do
    unless `git rev-parse HEAD` == `git rev-parse origin/master`
      puts "WARNING: HEAD is not the same as origin/master"
      puts "Run `git push` to sync changes."
      exit
    end
  end

end