goog.module('plugin.login.LoginPlugin');

const CredentialsHandler = goog.require('os.net.CredentialsHandler');
const ExtDomainHandler = goog.require('os.net.ExtDomainHandler');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');
const EventType = goog.require('plugin.login.EventType');
const LoginHandler = goog.require('plugin.login.LoginHandler');
const PopupManager = goog.require('plugin.login.PopupManager');


/**
 * Provides map layer support
 */
class LoginPlugin extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = LoginPlugin.ID;
  }

  /**
   * @inheritDoc
   */
  init() {
    os.net.RequestHandlerFactory.removeHandler(ExtDomainHandler);
    os.net.RequestHandlerFactory.removeHandler(CredentialsHandler);
    os.net.RequestHandlerFactory.addHandler(LoginHandler);
    os.dispatcher.listen(EventType.AUTH_INIT, this.handleAdd_);
  }

  /**
   * Handle auth adds
   * @param {plugin.login.Event} evt The event
   */
  handleAdd_(evt) {
    PopupManager.getInstance().add(evt.url);
  }
}


/**
 * @type {string}
 * @const
 */
LoginPlugin.ID = 'login';


// Add the plugin to the plugin manager.
PluginManager.getInstance().addPlugin(new LoginPlugin());


exports = LoginPlugin;
