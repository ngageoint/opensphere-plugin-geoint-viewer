goog.module('plugin.piwik.PiwikPlugin');

goog.require('goog.log');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');

/**
 */
class PiwikPlugin extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = 'piwik';
    this.errorMessage = null;

    /**
     * Logger for plugin.piwik.PiwikPlugin
     * @type {goog.log.Logger}
     * @private
     * @const
     */
    this.LOGGER_ = goog.log.getLogger('plugin.piwik.PiwikPlugin');
  }

  /**
   * @inheritDoc
   */
  init() {
    this.initPaq();
    this.loadScript();
  }

  /**
   * Initialize piwik globals.
   */
  initPaq() {
    if (!window._paq) {
      window._paq = [];
    }

    const _paq = window._paq;
    _paq.push(['setDocumentTitle', document.domain + '/' + document.title]);
    _paq.push(['setCookieDomain', '*.' + document.domain]);
    _paq.push(['setDomains', ['*.' + document.domain]]);
    _paq.push(['enableLinkTracking']);
  }

  /**
   * Load the piwik.js script to the page.
   */
  loadScript() {
    const userIdUrl = /** {?string} */ (os.settings.get('plugin.piwik.userIdUrl', 'https://opensphere.gs.mil/'));
    goog.log.fine(this.LOGGER_, 'Using plugin.piwik.userIdUrl: ' + userIdUrl);

    if (userIdUrl != '') {
      fetch(String(userIdUrl), {
        method: 'GET',
        credentials: 'include'
      }).then(
          (response) => {
            if (response.status !== 200) {
              goog.log.fine(this.LOGGER_, 'Status not OK when retrieving user information. Status Code: ' + response.status);
            }
            var user = '';
            var uid = '';

            // Extract the user information from the header
            for (var pair of response.headers.entries()) {
              // goog.log.fine(this.LOGGER_, "'" + pair[0] + "': '" + pair[1] + "'")
              if (pair[0].toLowerCase() == 'x-forwarded-user') {
                user = pair[1];
                var parts = user.split('.');
                goog.log.fine(this.LOGGER_, 'X-Forwarded-User: ', user);
                if (parts.length > 0) {
                  uid = parts[parts.length - 1];
                  goog.log.fine(this.LOGGER_, 'X-Forwarded-User UID: ', uid);
                }
                break;
              }
            }
            if (user == '' || uid == '') {
              goog.log.fine(this.LOGGER_, 'Failed to determine user information.');
            }
            this.embedTrackingCode(user, uid);
          })
          .catch((err) => {
            goog.log.fine(this.LOGGER_, 'Failed to retrieve user information. Encountered fetch error:' + err);
            this.embedTrackingCode('unknown', '0');
          });
    } else {
      goog.log.fine(this.LOGGER_, 'Cannot discover user information. Initializing matomo w/o user information.');
      this.embedTrackingCode();
    }
  }

  /**
   * @param {string} user
   * @param {string} uid
   */
  embedTrackingCode(user = '', uid = '') {
    const _paq = window._paq;

    const siteId = /** {?number} */ (os.settings.get('plugin.piwik.siteId', '195'));
    let url = /** {?string} */ (os.settings.get('plugin.piwik.url', '//gasmetrics.nga.mil/piwik/'));

    if (url && siteId) {
      url += /\/$/.test(url) ? '' : '/';

      if (user != '') {
        _paq.push(['setUserId', user]);
      }
      if (uid != '') {
        _paq.push(['setCustomDimension', 2, String(uid)]);
        _paq.push(['setCustomVariable', 2, 'GxUid', String(uid), 'page']);
      }
      _paq.push(['trackPageView']);

      _paq.push(['setTrackerUrl', url + 'piwik.php']);
      _paq.push(['setSiteId', String(siteId)]);

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = url + 'piwik.js';

      document.body.appendChild(script);
      goog.log.fine(this.LOGGER_, 'Setting piwik receiver to: ' + url + ', id: ' + siteId);
      goog.log.fine(this.LOGGER_, 'Embedding tracking code, with user: ' + user + ', gxUid: ' + uid);
    }
  }
}


(function() {
  PluginManager.getInstance().addPlugin(new PiwikPlugin());
})();

exports = PiwikPlugin;
