goog.module('plugin.login.LoginPlugin');

const os = goog.require('os');
const CredentialsHandler = goog.require('os.net.CredentialsHandler');
const RequestHandlerFactory = goog.require('os.net.RequestHandlerFactory');
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
    RequestHandlerFactory.removeHandler(ExtDomainHandler);
    RequestHandlerFactory.removeHandler(CredentialsHandler);
    RequestHandlerFactory.addHandler(LoginHandler);
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
