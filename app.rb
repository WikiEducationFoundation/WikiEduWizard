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


#--------------------------------------------------------
# ENV Config
#--------------------------------------------------------

# Dotenv.load


#--------------------------------------------------------
# Rack Middleware
#--------------------------------------------------------

use Rack::Session::Cookie, :path => '/', :expire_after => 3600, :secret => 'sdfdsfdsf'

# BUILD OMNIAUTH PROVIDER
use OmniAuth::Builder do
  provider :mediawiki, 'b4e468c3e7e78483ee080942ca60774a', '1fcf0b56648ec7cd165208ff6987f04064481d18'
end


#--------------------------------------------------------
# Routes
#--------------------------------------------------------

# SET USER AGENT
before do
  headers "User-Agent" => 'WikiEduWizard/1.0 (http://wikiedu.org/WikiEduWizard/; kevin@wintr.us) WikiEduWizard/1.0'
end

# ROOT URL
get '/' do
  @title = 'Wikiedu Wizard'
  redirect to '/begin'
end

post '/publish' do
  @wizardData = params['text']

  # PROBABLY SHOULD BE BROKEN OUT INTO A SEPERATE FUNCTION
  @conn = OAuth::Consumer.new('b4e468c3e7e78483ee080942ca60774a', '1fcf0b56648ec7cd165208ff6987f04064481d18')
  @access_token = OAuth::AccessToken.new(@conn, session['access_token'], session['access_token_secret'])
  get_token = @access_token.get('https://en.wikipedia.org/w/api.php?action=query&meta=tokens&format=json')
  token_response = JSON.parse(get_token.body)
  csrf_token = token_response['query']['tokens']['csrftoken']
  
  res = @access_token.post('http://en.wikipedia.org/w/api.php', {:action => 'edit', :title => "User:#{session["wiki_username"]}/Course Wizard Test", :text => @wizardData, :format => 'json', :token => csrf_token } )

  return res.body
end


get '/client' do

  # PROBABLY SHOULD BE BROKEN OUT INTO A SEPERATE FUNCTION
  @conn = OAuth::Consumer.new('b4e468c3e7e78483ee080942ca60774a', '1fcf0b56648ec7cd165208ff6987f04064481d18')
  @access_token = OAuth::AccessToken.new(@conn, session['access_token'], session['access_token_secret'])
  get_token = @access_token.get('https://en.wikipedia.org/w/api.php?action=query&meta=tokens&format=json')
  token_response = JSON.parse(get_token.body)
  csrf_token = token_response['query']['tokens']['csrftoken']
  
  res = @access_token.post('http://en.wikipedia.org/w/api.php', {:action => 'query', :meta => 'userinfo', :format => 'json' } )
  
  userdata = JSON.parse(res.body)

  session['wiki_username'] = userdata['query']['userinfo']['name']

  redirect to '/welcome'
  
end

get '/welcome' do
  unless session['wiki_username']
    redirect to '/auth/mediawiki'
  end
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