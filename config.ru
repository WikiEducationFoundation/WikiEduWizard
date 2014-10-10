require 'rubygems'
require 'bundler/setup'
require 'sinatra'
require 'haml'
require 'yaml'
require 'mediawiki_api'
require './app'


set :views, './sinatra/views'
set :environment, :development
set :run, false
set :raise_errors, true


run Sinatra::Application