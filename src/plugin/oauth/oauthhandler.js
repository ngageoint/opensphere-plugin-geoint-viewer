goog.provide('plugin.oauth.OAuthHandler');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('os.net.ExtDomainHandler');


/**
 * @extends {os.net.ExtDomainHandler}
 * @constructor
 */
plugin.oauth.OAuthHandler = function() {
  plugin.oauth.OAuthHandler.base(this, 'constructor');
  this.log = plugin.oauth.OAuthHandler.LOGGER_;
  this.score = 20;
};
goog.inherits(plugin.oauth.OAuthHandler, os.net.ExtDomainHandler);


/**
 * Logger
 * @type {goog.log.Logger}
 * @const
 * @private
 */
plugin.oauth.OAuthHandler.LOGGER_ = goog.log.getLogger('plugin.oauth.OAuthHandler');


/**
 * @param {goog.events.EventLike=} opt_evt The event
 */
plugin.oauth.OAuthHandler.prototype.onXhrComplete = function(opt_evt) {
  // 1. see if we got redirected to something oauthy
  var status = this.req.getStatus();

  if (status === 302) {
    // 2. if so, pop up a directive with an iframe to the oauthy thing
    var resp = this.getResponse();
    var headers = this.getResponseHeaders();
    debugger;
    // 3. wait for that dialog to finish and try again if confirmed, or cancel the request if canceled
  } else {
    plugin.oauth.OAuthHandler.base(this, 'onXhrComplete', opt_evt);
  }
};
