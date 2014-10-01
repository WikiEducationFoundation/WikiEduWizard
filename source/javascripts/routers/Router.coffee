###
 * Backbone Primary Router
 * 
 * @langversion CoffeeScript
 * 
 * @author 
 * @since  
 ###

application = require( '../App' )

module.exports = class Router extends Backbone.Router

  ###//--------------------------------------
    //+ Routes
    //--------------------------------------###
    
  routes:
    '' : 'home'

  ###//--------------------------------------
  //+ Route Handlers
  //--------------------------------------###

  home: ->
    $( '#app' ).html( application.homeView.render().el )

