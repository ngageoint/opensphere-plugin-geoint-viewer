goog.provide('plugin.oauth.OAuthPlugin');

goog.require('os.net.Request');
goog.require('os.plugin.AbstractPlugin');
goog.require('os.plugin.PluginManager');
goog.require('plugin.oauth.OAuthHandler');
goog.require('plugin.oauth.PopupManager');



/**
 * Provides map layer support
 * @extends {os.plugin.AbstractPlugin}
 * @constructor
 */
plugin.oauth.OAuthPlugin = function() {
  plugin.oauth.OAuthPlugin.base(this, 'constructor');
  this.id = plugin.oauth.OAuthPlugin.ID;
};
goog.inherits(plugin.oauth.OAuthPlugin, os.plugin.AbstractPlugin);


/**
 * @type {string}
 * @const
 */
plugin.oauth.OAuthPlugin.ID = 'oauth';


/**
 * @inheritDoc
 */
plugin.oauth.OAuthPlugin.prototype.init = function() {
  os.net.RequestHandlerFactory.removeHandler(os.net.ExtDomainHandler);
  os.net.RequestHandlerFactory.addHandler(plugin.oauth.OAuthHandler);
  os.dispatcher.listen(plugin.oauth.EventType.ADD_AUTH_HANDLER, this.handleAdd_);
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
