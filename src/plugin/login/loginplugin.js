goog.declareModuleId('plugin.login.LoginPlugin');

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {LoginEventType} from './eventtype.js';
import {LoginHandler} from './loginhandler.js';
import {PopupManager} from './popupmanager.js';

const CredentialsHandler = goog.require('os.net.CredentialsHandler');
const RequestHandlerFactory = goog.require('os.net.RequestHandlerFactory');
const ExtDomainHandler = goog.require('os.net.ExtDomainHandler');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');


/**
 * Provides map layer support
 */
export class LoginPlugin extends AbstractPlugin {
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
    dispatcher.getInstance().listen(LoginEventType.AUTH_INIT, this.handleAdd_);
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
