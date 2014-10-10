require 'rubygems'
require 'bundler/setup'
require 'sinatra'
require 'haml'
require 'mediawiki_api'
require './app'


set :views, './sinatra/views'
set :environment, :production
set :run, false
set :raise_errors, true


run Sinatra::Application