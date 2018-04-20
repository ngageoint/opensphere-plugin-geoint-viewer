goog.provide('plugin.piwik.PiwikPlugin');

goog.require('os.plugin.AbstractPlugin');
goog.require('os.plugin.PluginManager');


/**
 * @constructor
 * @extends {os.plugin.AbstractPlugin}
 */
plugin.piwik.PiwikPlugin = function() {
  plugin.piwik.PiwikPlugin.base(this, 'constructor');
  this.id = 'piwik';
  this.errorMessage = null;
};
goog.inherits(plugin.piwik.PiwikPlugin, os.plugin.AbstractPlugin);


/**
 * @export
 */
var _paq = _paq || [];
_paq.push(['setDocumentTitle', document.domain + '/' + document.title]);
_paq.push(['setCookieDomain', '*.' + document.domain]);
_paq.push(['setDomains', ['*.' + document.domain]]);
_paq.push(['trackPageView']);
_paq.push(['enableLinkTracking']);

/**
 * @inheritDoc
 */
plugin.piwik.PiwikPlugin.prototype.init = function() {
  var url = /** {?string} */ (os.settings.get('plugin.piwik.url'));
  var siteId = /** {?number} */ (os.settings.get('plugin.piwik.siteId'));

  if (url && siteId) {
    url += /\/$/.test(url) ? '' : '/';

    _paq.push(['setTrackerUrl', url + 'piwik.php']);
    _paq.push(['setSiteId', siteId.toString()]);

    var script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.src = url + 'piwik.js';

    document.body.appendChild(script);
  }
};

(function() {
  os.plugin.PluginManager.getInstance().addPlugin(new plugin.piwik.PiwikPlugin());
})();
