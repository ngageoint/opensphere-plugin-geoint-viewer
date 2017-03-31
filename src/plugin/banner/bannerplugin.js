goog.provide('plugin.banner.BannerPlugin');

goog.require('goog.events.EventTarget');
goog.require('goog.events.EventType');
goog.require('os.plugin.IPlugin');


/**
 * @constructor
 * @implements {os.plugin.IPlugin}
 * @extends {goog.events.EventTarget}
 */
plugin.banner.BannerPlugin = function() {
  plugin.banner.BannerPlugin.base(this, 'constructor');
  this.id = 'banner';
  this.errorMessage = null;
};
goog.inherits(plugin.banner.BannerPlugin, goog.events.EventTarget);


/**
 * @inheritDoc
 */
plugin.banner.BannerPlugin.prototype.init = function() {
  this.dispatchEvent(goog.events.EventType.LOAD);

  var conf = os.settings.get('banner');
  if (conf && conf['markup']) {
    var targets = ['before', 'after'];
    targets.forEach(function(key, i) {
      if (conf[key]) {
        var target = $(conf[key]);
        if (target.length) {
          var banner = $(conf['markup']);
          if (banner) {
            if (i === 0) {
              target.first().before(banner);
            } else {
              target.last().after(banner);
            }
          }
        }
      }
    });
  }
};

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(new plugin.banner.BannerPlugin());
})();
