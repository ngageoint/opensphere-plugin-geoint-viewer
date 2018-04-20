goog.provide('plugin.login.LoginPlugin');

goog.require('os.net.Request');
goog.require('os.plugin.AbstractPlugin');
goog.require('os.plugin.PluginManager');
goog.require('plugin.login.LoginHandler');
goog.require('plugin.login.PopupManager');



/**
 * Provides map layer support
 * @extends {os.plugin.AbstractPlugin}
 * @constructor
 */
plugin.login.LoginPlugin = function() {
  plugin.login.LoginPlugin.base(this, 'constructor');
  this.id = plugin.login.LoginPlugin.ID;
};
goog.inherits(plugin.login.LoginPlugin, os.plugin.AbstractPlugin);


/**
 * @type {string}
 * @const
 */
plugin.login.LoginPlugin.ID = 'login';


/**
 * @inheritDoc
 */
plugin.login.LoginPlugin.prototype.init = function() {
  os.net.RequestHandlerFactory.removeHandler(os.net.ExtDomainHandler);
  os.net.RequestHandlerFactory.addHandler(plugin.login.LoginHandler);
  os.dispatcher.listen(plugin.login.EventType.AUTH_INIT, this.handleAdd_);
};


/**
 * Handle auth adds
 * @param {plugin.login.Event} evt The event
 */
plugin.login.LoginPlugin.prototype.handleAdd_ = function(evt) {
  plugin.login.PopupManager.getInstance().add(evt.url);
};


(function() {
  os.plugin.PluginManager.getInstance().addPlugin(new plugin.login.LoginPlugin());
})();
