goog.provide('plugin.login.PopupManager');

goog.require('plugin.login.EventType');
goog.require('plugin.login.loginDirective');



/**
 * @constructor
 */
plugin.login.PopupManager = function() {
  /**
   * @type {Object<string, boolean>}
   * @protected
   */
  this.windowsByUrl = {};

  os.dispatcher.listen(plugin.login.EventType.AUTH_COMPLETE, this.onAuth, false, this);
  os.dispatcher.listen(plugin.login.EventType.AUTH_CANCEL, this.onAuth, false, this);
};
goog.addSingletonGetter(plugin.login.PopupManager);


/**
 * @param {!string} url The login URL
 */
plugin.login.PopupManager.prototype.add = function(url) {
  if (!this.windowsByUrl[url]) {
    this.windowsByUrl[url] = true;
    plugin.login.LoginWindowCtrl.launch(url);
  }
};


/**
 * @param {plugin.login.Event} evt
 * @protected
 */
plugin.login.PopupManager.prototype.onAuth = function(evt) {
  if (evt.url in this.windowsByUrl) {
    delete this.windowsByUrl[evt.url];
  }
};
