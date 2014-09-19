require 'data_mapper'
require 'dm-core'
require 'dm-migrations'
require 'dm-sqlite-adapter'
require 'dm-timestamps'
require 'ostruct'
require 'omniauth'
require 'omniauth-mediawiki'
require "mediawiki_api"
require 'jbuilder'
require 'debugger'

class Hash
  def self.to_ostructs(obj, memo={})
    return obj unless obj.is_a? Hash
    os = memo[obj] = OpenStruct.new
    obj.each { |k,v| os.send("#{k}=", memo[v] || to_ostructs(v, memo)) }
    os
  end
end

$config = Hash.to_ostructs(YAML.load_file(File.join(Dir.pwd, 'config.yml')))


client = MediawikiApi::Client.new $config.wiki_creds.development.url

use Rack::Session::Cookie

use OmniAuth::Builder do
 provider :mediawiki, $config.wiki_creds.development.key, $config.wiki_creds.development.secret
end

before do
  headers "User-Agent" => $config.wiki_creds.development.user_agent
end


get '/' do
  @title = 'Wikiedu Wizard'
  haml :login
end

get '/test' do
  $config.wiki_creds.development.key
end

get '/auth/:provider/callback' do
  @title = 'Wikiedu Wizard'
  @auth = request.env['omniauth.auth']
  haml :index
end



