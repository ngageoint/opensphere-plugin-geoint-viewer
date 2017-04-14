goog.provide('plugin.oauth.PopupManager');

goog.require('os.data.CollectionManager');
goog.require('plugin.oauth.loginDirective');



/**
 * @extends {os.data.CollectionManager<!plugin.oauth.OAuthHandler>}
 * @constructor
 */
plugin.oauth.PopupManager = function() {
  plugin.oauth.PopupManager.base(this, 'constructor');
};
goog.inherits(plugin.oauth.PopupManager, os.data.CollectionManager);
goog.addSingletonGetter(plugin.oauth.PopupManager);


/**
 * @type {number}
 */
plugin.oauth.PopupManager.nextId = 0;


/**
 * @inheritDoc
 */
plugin.oauth.PopupManager.prototype.addInternal = function(item) {
  if (!this.getId(item)) {
    item['id'] = '' + plugin.oauth.PopupManager.nextId++;
  }

  var result = plugin.oauth.PopupManager.base(this, 'addInternal', item);

  if (result) {
    this.popup(item);
  }

  return result;
};


/**
 * @inheritDoc
 */
plugin.oauth.PopupManager.prototype.remove = function(idOrItem) {
  var removed = plugin.oauth.PopupManager.base(this, 'remove', idOrItem);

  if (removed) {
    this.close(removed);
  }

  return removed;
};


/**
 * @param {plugin.oauth.OAuthHandler} handler The handler to resolve
 */
plugin.oauth.PopupManager.prototype.resolve = function(handler) {
  handler.addCrossOrigin();
  handler.retry();
  this.remove(handler);

  // do the next one
  var list = this.getAll();
  if (list.length) {
    this.popup(list[0]);
  }
};


/**
 * @param {plugin.oauth.OAuthHandler} handler The request handler awaiting authentication
 */
plugin.oauth.PopupManager.prototype.popup = function(handler) {
  // only open a popup if one is not already open
  if (!os.ui.window.exists(plugin.oauth.LoginWindowCtrl.WINDOW_ID)) {
    plugin.oauth.LoginWindowCtrl.launch(handler);
  }
};


/**
 * @param {plugin.oauth.OAuthHandler} handler The handler to close
 */
plugin.oauth.PopupManager.prototype.close = function(handler) {
  var win = os.ui.window.getById(plugin.oauth.LoginWindowCtrl.WINDOW_ID);
  if (win) {
    var scope = win.find('iframe').scope();
    if (scope && scope['handler'] === handler) {
      os.ui.window.close(win);
    }
  }
};
