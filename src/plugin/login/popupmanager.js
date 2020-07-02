goog.module('plugin.login.PopupManager');

const EventType = goog.require('plugin.login.EventType');
const {Controller} = goog.require('plugin.login.LoginWindowUI');


/**
 */
class PopupManager {
  /**
   * Constructor.
   */
  constructor() {
    /**
     * @type {Object<string, boolean>}
     * @protected
     */
    this.windowsByUrl = {};

    os.dispatcher.listen(EventType.AUTH_COMPLETE, this.onAuth, false, this);
    os.dispatcher.listen(EventType.AUTH_CANCEL, this.onAuth, false, this);
  }

  /**
   * @param {!string} url The login URL
   */
  add(url) {
    if (!this.windowsByUrl[url]) {
      this.windowsByUrl[url] = true;
      Controller.launch(url);
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

exports = PopupManager;
