
require 'ostruct'
require 'omniauth'
require 'omniauth-mediawiki'
require "mediawiki_api"
require 'jbuilder'
require 'rest_client'
require 'oauth'
require 'debugger'

## CLASSES
require './sinatra/utils/Hash'


use Rack::Session::Cookie, :path => '/', :expire_after => 3600, :secret => 'dfgdsfgdfg87d8g79df'

# LOAD CONFIG
$config = Hash.to_ostructs(YAML.load_file(File.join(Dir.pwd, 'config.yml')))



# BUILD OMNIAUTH PROVIDER
use OmniAuth::Builder do
  provider :mediawiki, $config.wiki_creds.development.key, $config.wiki_creds.development.secret
end


# SET USER AGENT
before do
  headers "User-Agent" => $config.wiki_creds.development.user_agent
end


# ROOT URL
get '/' do
  @title = 'Wikiedu Wizard'
  redirect to '/begin'
end

post '/publish' do
  @wizardData = params['text']

  @conn = OAuth::Consumer.new($config.wiki_creds.development.key, $config.wiki_creds.development.secret)
  @access_token = OAuth::AccessToken.new(@conn, session['access_token'], session['access_token_secret'])
  get_token = @access_token.get('https://en.wikipedia.org/w/api.php?action=query&meta=tokens&format=json')
  token_response = JSON.parse(get_token.body)
  csrf_token = token_response['query']['tokens']['csrftoken']
  
  res = @access_token.post('http://en.wikipedia.org/w/api.php', {:action => 'edit', :title => "User:#{session["wiki_username"]}/Course Wizard Test", :text => @wizardData, :format => 'json', :token => csrf_token } )

  return res.body
end


get '/client' do

  @conn = OAuth::Consumer.new($config.wiki_creds.development.key, $config.wiki_creds.development.secret)
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







