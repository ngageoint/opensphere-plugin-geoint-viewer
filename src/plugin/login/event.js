goog.module('plugin.login.Event');

const GoogEvent = goog.require('goog.events.Event');


/**
 */
class Event extends GoogEvent {
  /**
   * Constructor.
   * @param {plugin.login.EventType} type The event type
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

exports = Event;
