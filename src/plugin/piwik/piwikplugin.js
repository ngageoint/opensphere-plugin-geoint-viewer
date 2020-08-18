goog.module('plugin.piwik.PiwikPlugin');

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
    console.log('Using plugin.piwik.userIdUrl: ' + userIdUrl);

    if (userIdUrl != '') {
      fetch(String(userIdUrl), {
        method: 'GET',
        credentials: 'include'
      }).then(
          (response) => {
            if (response.status !== 200) {
              console.log('Status not OK when retrieving user information. Status Code: ' + response.status);
            }
            var user = '';
            var uid = '';

            // Extract the user information from the header
            for (var pair of response.headers.entries()) {
              // console.log("'" + pair[0] + "': '" + pair[1] + "'")
              if (pair[0].toLowerCase() == 'x-forwarded-user') {
                user = pair[1];
                var parts = user.split('.');
                console.log('X-Forwarded-User: ', user);
                if (parts.length > 0) {
                  uid = parts[parts.length - 1];
                  console.log('X-Forwarded-User UID: ', uid);
                }
                break;
              }
            }
            if (user == '' || uid == '') {
              console.log('Failed to determine user information.');
            }
            this.embedTrackingCode(user, uid);
          })
          .catch((err) => {
            console.log('Failed to retrieve user information. Encountered fetch error:' + err);
            this.embedTrackingCode('unknown', '0');
          });
    } else {
      console.log('Cannot discover user information. Initializing matomo w/o user information.');
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
      console.log('Setting piwik receiver to: ' + url + ', id: ' + siteId);
      console.log('Embedding tracking code, with user: ' + user + ', gxUid: ' + uid);
    }
  }
}


(function() {
  PluginManager.getInstance().addPlugin(new PiwikPlugin());
})();

exports = PiwikPlugin;
