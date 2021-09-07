goog.declareModuleId('plugin.login.Event');

const GoogEvent = goog.require('goog.events.Event');

const {LoginEventType} = goog.requireType('plugin.login.EventType');


/**
 */
export class LoginEvent extends GoogEvent {
  /**
   * Constructor.
   * @param {LoginEventType} type The event type
   * @param {!string} url The login URL
   */
  constructor(type, url) {
    super(type);

    /**
     * @type {string}
     */
    this.url = url;
  }
}
