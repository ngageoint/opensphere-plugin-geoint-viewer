goog.declareModuleId('plugin.login.PopupManager');

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {LoginEventType} from './eventtype.js';
import {launchLoginWindow} from './loginwindow.js';


/**
 */
export class PopupManager {
  /**
   * Constructor.
   */
  constructor() {
    /**
     * @type {Object<string, boolean>}
     * @protected
     */
    this.windowsByUrl = {};

    dispatcher.getInstance().listen(LoginEventType.AUTH_COMPLETE, this.onAuth, false, this);
    dispatcher.getInstance().listen(LoginEventType.AUTH_CANCEL, this.onAuth, false, this);
  }

  /**
   * @param {!string} url The login URL
   */
  add(url) {
    if (!this.windowsByUrl[url]) {
      this.windowsByUrl[url] = true;
      launchLoginWindow(url);
    }
  }

  /**
   * @param {plugin.login.Event} evt
   * @protected
   */
  onAuth(evt) {
    if (evt.url in this.windowsByUrl) {
      delete this.windowsByUrl[evt.url];
    }
  }

  /**
   * Get the global instance.
   * @return {!PopupManager}
   */
  static getInstance() {
    if (!instance) {
      instance = new PopupManager();
    }

    return instance;
  }
}

/**
 * Global PopupManager instance.
 * @type {PopupManager|undefined}
 */
let instance;
