require 'rubygems'
require 'bundler/setup'
require 'sinatra'
require 'haml'
require 'mediawiki_api'
require './app'


set :environment, :development
set :run, false
set :raise_errors, true





run Sinatra::Application