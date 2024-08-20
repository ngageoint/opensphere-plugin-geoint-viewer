goog.declareModuleId('plugin.piwik.PiwikPlugin');

import {getAppVersion} from 'opensphere/src/os/config/config.js';
import Settings from 'opensphere/src/os/config/settings.js';
import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import AbstractPlugin from 'opensphere/src/os/plugin/abstractplugin.js';
import PluginManager from 'opensphere/src/os/plugin/pluginmanager.js';
import {isElectron} from 'opensphere/src/plugin/electron/electron.js';
import {MATOMO_DOWNLOAD_CLASS, MatomoEventType} from 'opensphere-nga-lib/src/osnga/matomo/index.js';

const log = goog.require('goog.log');

const Logger = goog.requireType('goog.log.Logger');


/**
 * Logger for imagery PiwikPlugin.
 * @type {Logger}
 */
const logger = log.getLogger('plugin.piwik.PiwikPlugin');

/**
 */
export class PiwikPlugin extends AbstractPlugin {
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
  disposeInternal() {
    super.disposeInternal();

    dispatcher.getInstance().unlisten(MatomoEventType.LINKS_CHANGED, this.onLinksChanged, false, this);
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
    const appVersion = getAppVersion();

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

      // Identify this is the desktop app in the reported title and a custom variable.
      _paq.push(['setDocumentTitle', 'Desktop/' + document.title]);
      _paq.push(['setCustomDimension', 1, `Desktop/${appVersion}`]);
    } else {
      // Include the domain in the page title to differentiate between stage/prod/etc.
      _paq.push(['setDocumentTitle', document.domain + '/' + document.title]);
      // Identify this is the web app in a custom variable.
      _paq.push(['setCustomDimension', 1, `Web/${appVersion}`]);

      // Track clicks to sub-domains instead of treating them as an outlink.
      _paq.push(['setCookieDomain', '*.' + document.domain]);
      _paq.push(['setDomains', ['*.' + document.domain]]);
    }

    // Set the class used to track link clicks for downloads.
    _paq.push(['setDownloadClasses', MATOMO_DOWNLOAD_CLASS]);
    _paq.push(['enableLinkTracking']);

    dispatcher.getInstance().listen(MatomoEventType.LINKS_CHANGED, this.onLinksChanged, false, this);
  }

  /**
   * Handle links changed event.
   * @protected
   */
  onLinksChanged() {
    const _paq = window._paq;
    if (_paq) {
      // Enable link tracking so click handlers will be added to new links on the page.
      _paq.push(['enableLinkTracking']);
    }
  }

  /**
   * Load the piwik.js script to the page.
   */
  loadScript() {
    const userIdUrl = this.userIdUrl_;
    log.info(logger, 'Log Check; Using plugin.piwik.userIdUrl: ' + userIdUrl);

    if (userIdUrl !== '') {
      fetch(String(userIdUrl), {
        method: 'GET',
        credentials: 'include'
      }).then(
          (response) => {
            if (response.status !== 200) {
              log.info(logger, 'Status not OK when retrieving user information. Status Code: ' + response.status);
            }
            return response.json();
          }).then(responseObject => {
            log.info(logger, 'Matomo response: ' + JSON.stringify(responseObject));
            // Extract the user email from the body
            
            var email = responseObject.email || 'unknown';
            
            if (email == 'unknown') {
              log.info(logger, 'Failed to determine user information.');
            }
            this.embedTrackingCode(email);
          })
          .catch((err) => {
            log.info(logger, 'Failed to retrieve user information. Encountered fetch error:' + err);
            this.embedTrackingCode('unknown');
          });
    } else {
      log.info(logger, 'Cannot discover user information. Initializing matomo w/o user information.');
      this.embedTrackingCode();
    }
  }

  /**
   * @param {string} email
   */
  embedTrackingCode(email = '') {
    const _paq = window._paq;

    const siteId = this.siteId_;
    let url = this.url_;

    if (url && siteId != null) {
      url += /\/$/.test(url) ? '' : '/';

      if (email != '') {
        _paq.push(['setUserId', email]);
      }
      // if (uid != '') {
      //   _paq.push(['setCustomDimension', 2, String(uid)]);
      //   _paq.push(['setCustomVariable', 2, 'GxUid', String(uid), 'page']);
      // }
      _paq.push(['trackPageView']);

      _paq.push(['setTrackerUrl', url + this.trackerScript_]);
      _paq.push(['setSiteId', String(siteId)]);

      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = url + 'piwik.js';

      document.body.appendChild(script);
      log.info(logger, 'Setting piwik receiver to: ' + url + ', id: ' + siteId);
      log.info(logger, 'Embedding tracking code, with user: ' + email);
    }
  }
}

PluginManager.getInstance().addPlugin(new PiwikPlugin());
