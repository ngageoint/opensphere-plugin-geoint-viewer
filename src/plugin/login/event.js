goog.provide('plugin.login.Event');

goog.require('goog.events.Event');


/**
 * @param {plugin.login.EventType} type The event type
 * @param {!string} url The login URL
 * @extends {goog.events.Event}
 * @constructor
 */
plugin.login.Event = function(type, url) {
  plugin.login.Event.base(this, 'constructor', type);

  /**
   * @type {string}
   */
  this.url = url;
};
goog.inherits(plugin.login.Event, goog.events.Event);
