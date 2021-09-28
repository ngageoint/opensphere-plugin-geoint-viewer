goog.declareModuleId('plugin.login.LoginPlugin');

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import CredentialsHandler from 'opensphere/src/os/net/credentialshandler.js';
import ExtDomainHandler from 'opensphere/src/os/net/extdomainhandler.js';
import * as RequestHandlerFactory from 'opensphere/src/os/net/requesthandlerfactory.js';
import AbstractPlugin from 'opensphere/src/os/plugin/abstractplugin.js';
import PluginManager from 'opensphere/src/os/plugin/pluginmanager.js';
import {LoginEventType} from './eventtype.js';
import {LoginHandler} from './loginhandler.js';
import {PopupManager} from './popupmanager.js';


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
