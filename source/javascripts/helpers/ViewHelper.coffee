
#########################################################
# Title:  ViewHelper
# Author: kevin@wintr.us @ WINTR
#########################################################


Handlebars.registerHelper( 'link', ( text, url ) ->

  text = Handlebars.Utils.escapeExpression( text )
  url  = Handlebars.Utils.escapeExpression( url )

  result = '<a href="' + url + '">' + text + '</a>'

  return new Handlebars.SafeString( result )
)

Handlebars.registerPartial('courseDetails', 'sup2')