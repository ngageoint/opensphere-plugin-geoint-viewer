goog.module('plugin.piwik.PiwikPlugin');

const log = goog.require('goog.log');
const Settings = goog.require('os.config.Settings');
const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');
const {DOWNLOAD_CLASS} = goog.require('osnga.matomo');
const {isElectron} = goog.require('plugin.electron');

/**
 * Logger for imagery PiwikPlugin.
 * @type {log.Logger}
 */
const logger = log.getLogger('plugin.piwik.PiwikPlugin');

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
     * The metrics site ID.
     * @type {number|undefined}
     * @private
     */
    this.siteId_ = undefined;

    /**
     * The tracker script. This will be appended to the base URL.
     * @type {string}
     * @private
     */
    this.trackerScript_ = '';

    /**
     * The base metrics URL.
     * @type {string|undefined}
     * @private
     */
    this.url_ = undefined;

    /**
     * The metrics user ID URL.
     * @type {string}
     * @private
     */
    this.userIdUrl_ = '';
  }

  /**
   * @inheritDoc
   */
  init() {
    const settings = Settings.getInstance();

    this.siteId_ = /** @type {number|undefined} */ (settings.get('plugin.piwik.siteId'));
    // Tracker script defaults to piwik.php for legacy support.
    this.trackerScript_ = /** @type {string} */ (settings.get('plugin.piwik.trackerScript', 'piwik.php'));
    this.url_ = /** @type {string|undefined} */ (settings.get('plugin.piwik.url'));
    this.userIdUrl_ = /** @type {string} */ (settings.get('plugin.piwik.userIdUrl', ''));

    if (this.siteId_ != null && this.url_) {
      this.initPaq();
      this.loadScript();
    } else {
      log.warning(logger, 'Piwik plugin is not configured and will not be initialized.');
    }
  }

  /**
   * Initialize piwik globals.
   */
  initPaq() {
    if (!window._paq) {
      window._paq = [];
    }

    const _paq = window._paq;

    if (isElectron()) {
      // Override the tracked URL so it doesn't expose file system path.
      let customUrl;

      const osIndex = location.href.lastIndexOf('/opensphere/');
      if (osIndex > -1) {
        customUrl = `file://${location.href.substring(osIndex)}`;
      } else {
        customUrl = 'file:///opensphere';
      }

      _paq.push(['setCustomUrl', customUrl]);

      // Include electron in the reported title.
      _paq.push(['setDocumentTitle', 'Electron/' + document.title]);
    } else {
      _paq.push(['setDocumentTitle', document.domain + '/' + document.title]);
      _paq.push(['setCookieDomain', '*.' + document.domain]);
      _paq.push(['setDomains', ['*.' + document.domain]]);
    }

    _paq.push(['enableLinkTracking']);

    // Set the class used to track link clicks for downloads.
    _paq.push(['setDownloadClasses', DOWNLOAD_CLASS]);
  }

  /**
   * Load the piwik.js script to the page.
   */
  loadScript() {
    const userIdUrl = this.userIdUrl_;
    log.fine(logger, 'Using plugin.piwik.userIdUrl: ' + userIdUrl);

    if (userIdUrl != '') {
      fetch(String(userIdUrl), {
        method: 'GET',
        credentials: 'include'
      }).then(
          (response) => {
            if (response.status !== 200) {
              log.fine(logger, 'Status not OK when retrieving user information. Status Code: ' + response.status);
            }
            var user = '';
            var uid = '';

            // Extract the user information from the header
            for (var pair of response.headers.entries()) {
              // log.fine(logger, "'" + pair[0] + "': '" + pair[1] + "'")
              if (pair[0].toLowerCase() == 'x-forwarded-user') {
                user = pair[1];
                var parts = user.split('.');
                log.fine(logger, 'X-Forwarded-User: ' + user);
                if (parts.length > 0) {
                  uid = parts[parts.length - 1];
                  log.fine(logger, 'X-Forwarded-User UID: ' + uid);
                }
                break;
              }
            }
            if (user == '' || uid == '') {
              log.fine(logger, 'Failed to determine user information.');
            }
            this.embedTrackingCode(user, uid);
          })
          .catch((err) => {
            log.fine(logger, 'Failed to retrieve user information. Encountered fetch error:' + err);
            this.embedTrackingCode('unknown', '0');
          });
    } else {
      log.fine(logger, 'Cannot discover user information. Initializing matomo w/o user information.');
      this.embedTrackingCode();
    }
  }

  /**
   * @param {string} user
   * @param {string} uid
   */
  embedTrackingCode(user = '', uid = '') {
    const _paq = window._paq;

    const siteId = this.siteId_;
    let url = this.url_;

    if (url && siteId != null) {
      url += /\/$/.test(url) ? '' : '/';

      if (user != '') {
        _paq.push(['setUserId', user]);
      }
      if (uid != '') {
        _paq.push(['setCustomDimension', 2, String(uid)]);
        _paq.push(['setCustomVariable', 2, 'GxUid', String(uid), 'page']);
      }
      _paq.push(['trackPageView']);

      _paq.push(['setTrackerUrl', url + this.trackerScript_]);
      _paq.push(['setSiteId', String(siteId)]);

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = url + 'piwik.js';

      document.body.appendChild(script);
      log.fine(logger, 'Setting piwik receiver to: ' + url + ', id: ' + siteId);
      log.fine(logger, 'Embedding tracking code, with user: ' + user + ', gxUid: ' + uid);
    }
  }
}


(function() {
  PluginManager.getInstance().addPlugin(new PiwikPlugin());
})();

exports = PiwikPlugin;
