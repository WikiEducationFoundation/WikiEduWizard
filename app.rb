#--------------------------------------------------------
# Requirements
#--------------------------------------------------------

require 'rubygems'
require 'bundler/setup'
require 'dotenv'
require 'sinatra'
require 'haml'
require 'mediawiki_api'
require 'oauth'
require 'omniauth'
require 'omniauth-mediawiki'
require 'json'
require 'jbuilder'
require 'rest_client'
require './sinatra/utils/Hash'

if settings.environment == :development
  require 'debugger'
end


#--------------------------------------------------------
# Sinatra Config
#--------------------------------------------------------

set :views, './sinatra/views'

set :raise_errors, true

set :show_exceptions, true

set :dump_errors, true


#--------------------------------------------------------
# ENV Config
#--------------------------------------------------------

Dotenv.load


#--------------------------------------------------------
# Rack Middleware
#--------------------------------------------------------

use Rack::Session::Cookie, :path => '/', :expire_after => 3600, :secret => ENV['SESSION_SECRET']

# BUILD OMNIAUTH PROVIDER
use OmniAuth::Builder do

  provider :mediawiki, ENV["WIKI_KEY"], ENV["WIKI_SECRET"], :client_options => {:site => 'https://en.wikipedia.org'}

end


#--------------------------------------------------------
# Routes
#--------------------------------------------------------

# SET USER AGENT
before do

  headers "User-Agent" => ENV["WIKI_USER_AGENT"]

end


# ROOT URL
get '/' do

  @title = 'Wikiedu Wizard'

  haml :login

end



post '/publish_test' do

  return params['wikitext']

end



post '/publish' do

  content_type :json

  @wizardData = params['wikitext']

  @conn = OAuth::Consumer.new(ENV["WIKI_KEY"], ENV["WIKI_SECRET"])

  @access_token = OAuth::AccessToken.new(@conn, session['access_token'], session['access_token_secret'])

  get_token = @access_token.get('https://en.wikipedia.org/w/api.php?action=query&meta=tokens&format=json')

  token_response = JSON.parse(get_token.body)

  csrf_token = token_response['query']['tokens']['csrftoken']

  apiAction = 'edit'

  req = @access_token.post('https://en.wikipedia.org/w/api.php', {:action => 'edit', :title => "User:#{session['wiki_username']}/#{params['course_title']}", :text => @wizardData, :format => 'json', :token => csrf_token } )

  response = JSON.parse(req.body)


  if response['edit']

    return { :success => true, :title => response['edit']['title'], :pageid =>  response['edit']['pageid'] , :result => response['edit']['result']}.to_json

  else

    return { :success => false, :result => response }.to_json
    
  end

end



get '/client' do

  @conn = OAuth::Consumer.new(ENV["WIKI_KEY"], ENV["WIKI_SECRET"])

  @access_token = OAuth::AccessToken.new(@conn, session['access_token'], session['access_token_secret'])

  get_token = @access_token.get('https://en.wikipedia.org/w/api.php?action=query&meta=tokens&format=json')

  token_response = JSON.parse(get_token.body)

  csrf_token = token_response['query']['tokens']['csrftoken']
  
  res = @access_token.post('https://en.wikipedia.org/w/api.php', {:action => 'query', :meta => 'userinfo', :format => 'json' } )
  
  userdata = JSON.parse(res.body)

  session['wiki_username'] = userdata['query']['userinfo']['name']

  redirect to '/welcome'
  
end



get '/welcome' do

  # unless session['wiki_username'] && session['access_token']
  
  #   redirect to '/'
  
  # end

  @wikiuser = session['wiki_username']

  haml :app

end



# WIZARD STEP ONE
get '/begin' do

  if session['session_id']

    redirect to '/welcome'

  else

    redirect to '/auth/mediawiki'

  end

end



# MEDIAWIKI API OAUTH CALLBACK
get '/auth/:provider/callback' do

  @title = 'Wikiedu Wizard - OAuth'

  @auth = request.env['omniauth.auth']

  @access_token = request.env["omniauth.auth"]["extra"]["access_token"]

  session['access_token'] = @access_token.token

  session['access_token_secret'] = @access_token.secret
  
  redirect to '/client'

end