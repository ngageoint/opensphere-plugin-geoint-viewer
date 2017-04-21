goog.provide('plugin.oauth.OAuthPlugin');

goog.require('goog.events.Event');
goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('os.net.Request');
goog.require('os.plugin.IPlugin');
goog.require('os.plugin.PluginManager');
goog.require('plugin.oauth.OAuthHandler');
goog.require('plugin.oauth.PopupManager');



/**
 * Provides map layer support
 * @implements {os.plugin.IPlugin}
 * @extends {goog.events.EventTarget}
 * @constructor
 */
plugin.oauth.OAuthPlugin = function() {
  plugin.oauth.OAuthPlugin.base(this, 'constructor');
};
goog.inherits(plugin.oauth.OAuthPlugin, goog.events.EventTarget);


/**
 * @type {string}
 * @const
 */
plugin.oauth.OAuthPlugin.ID = 'oauth';


/**
 * @inheritDoc
 */
plugin.oauth.OAuthPlugin.prototype.id = plugin.oauth.OAuthPlugin.ID;


/**
 * @inheritDoc
 */
plugin.oauth.OAuthPlugin.prototype.errorMessage = null;


/**
 * @inheritDoc
 */
plugin.oauth.OAuthPlugin.prototype.init = function() {
  os.net.RequestHandlerFactory.removeHandler(os.net.ExtDomainHandler);
  os.net.RequestHandlerFactory.addHandler(plugin.oauth.OAuthHandler);
  os.dispatcher.listen(plugin.oauth.EventType.ADD_AUTH_HANDLER, this.handleAdd_);


  // all done
  this.dispatchEvent(new goog.events.Event(goog.events.EventType.LOAD));
};


/**
 * Handle auth adds
 * @param {goog.events.Event} evt The event
 */
plugin.oauth.OAuthPlugin.prototype.handleAdd_ = function(evt) {
  var handler = /** @type {!plugin.oauth.OAuthHandler} */ (evt.target);
  plugin.oauth.PopupManager.getInstance().add(handler);
};


(function() {
  os.plugin.PluginManager.getInstance().addPlugin(new plugin.oauth.OAuthPlugin());
})();
