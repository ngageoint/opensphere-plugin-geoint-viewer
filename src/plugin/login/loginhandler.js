goog.declareModuleId('plugin.login.LoginHandler');

import Settings from 'opensphere/src/os/config/settings.js';
import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import {getText} from 'opensphere/src/os/file/mime/text.js';
import CrossOrigin from 'opensphere/src/os/net/crossorigin.js';
import ExtDomainHandler from 'opensphere/src/os/net/extdomainhandler.js';
import {saveCrossOrigin} from 'opensphere/src/os/net/net.js';
import {LoginEvent} from './event.js';
import {LoginEventType} from './eventtype.js';

const Uri = goog.require('goog.Uri');
const log = goog.require('goog.log');
const NetEventType = goog.require('goog.net.EventType');

const Logger = goog.requireType('goog.log.Logger');


/**
 * Logger
 * @type {Logger}
 */
const LOGGER = log.getLogger('plugin.login.LoginHandler');

/**
 */
export class LoginHandler extends ExtDomainHandler {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.log = LOGGER;
    this.score = 20;

    /**
     * @type {?Array}
     * @private
     */
    this.lastArgs_ = null;

    /**
     * @type {string}
     * @private
     */
    this.loginUrl_ = '';

    this.loginConfigs_ = this.loadLoginConfigs();
  }

  /**
   * @inheritDoc
   */
  disposeInternal() {
    this.removeLoginListeners();
    super.disposeInternal();
  }

  /**
   * @inheritDoc
   */
  execute(method, uri, opt_headers, opt_formatter, opt_nocache, opt_responseType) {
    // store the original arguments so we can potentially run it again
    this.lastArgs_ = Array.prototype.slice.call(arguments);

    super.execute(method, uri, opt_headers, opt_formatter, opt_nocache, opt_responseType);
  }

  /**
   * @return {Array<{loginUrl: (string|undefined), regexes: Array<!RegExp>, priority: number}>}
   * @protected
   */
  loadLoginConfigs() {
    var configs = [];
    var logins = /** @type {Object<string, *>} */ (Settings.getInstance().get('plugin.login', {}));
    for (var key in logins) {
      configs.push({
        loginUrl: logins[key]['loginUrl'],
        regexes: logins[key]['regexes'].map(function(str) {
          return new RegExp(str, 'i');
        }),
        priority: logins[key]['priority'] || 0
      });
    }

    configs.sort(function(a, b) {
      return b.priority - a.priority;
    });

    return configs;
  }

  /**
   * @inheritDoc
   */
  onXhrComplete(opt_evt) {
    // see if we got redirected to something authy
    var resp = this.getResponse();
    var headers = this.getResponseHeaders();
    var contentType = /** @type {string|undefined} */ (headers['content-type']) || '';

    // If the response is an ArrayBuffer, convert to text if the content type supports that we're dealing with text.
    if (resp instanceof ArrayBuffer && contentType.indexOf('text/') > -1) {
      resp = getText(resp);
    }

    if (typeof resp === 'string') {
      for (var i = 0, n = this.loginConfigs_.length; i < n; i++) {
        var conf = this.loginConfigs_[i];

        var isLogin = !!conf.regexes.length;
        for (var r = 0, rr = conf.regexes.length; isLogin && r < rr; r++) {
          isLogin = conf.regexes[r].test(resp);
        }

        if (isLogin) {
          this.loginUrl_ = conf.loginUrl || this.loginUrl_;
          break;
        }
      }

      if (isLogin) {
        // see if we are just missing a credentials entry and try again
        if (this.addCrossOrigin()) {
          this.retry();
        } else {
          var url = this.getLoginUri();
          if (url) {
            var evt = new LoginEvent(LoginEventType.AUTH_INIT, url);
            evt.target = this;
            this.addLoginListeners();
            dispatcher.getInstance().dispatchEvent(evt);
          }
        }

        return;
      }
    }

    super.onXhrComplete(opt_evt);
    this.lastArgs_ = null;
  }

  /**
   * @protected
   */
  addLoginListeners() {
    dispatcher.getInstance().listen(LoginEventType.AUTH_COMPLETE, this.onAuth, false, this);
    dispatcher.getInstance().listen(LoginEventType.AUTH_CANCEL, this.onAuth, false, this);
  }

  /**
   * @protected
   */
  removeLoginListeners() {
    dispatcher.getInstance().unlisten(LoginEventType.AUTH_COMPLETE, this.onAuth, false, this);
    dispatcher.getInstance().unlisten(LoginEventType.AUTH_CANCEL, this.onAuth, false, this);
  }

  /**
   * @param {Event} evt
   * @protected
   */
  onAuth(evt) {
    this.removeLoginListeners();

    if (evt.url === this.getLoginUri()) {
      if (evt.type === LoginEventType.AUTH_COMPLETE) {
        this.addCrossOrigin();
        this.retry();
      } else {
        this.errors = ['Unauthorized. Login failed or was canceled.'];
        this.dispatchEvent(NetEventType.ERROR);
      }
    }
  }

  /**
   * Retry the request
   */
  retry() {
    var self = this;

    setTimeout(function() {
      if (!self.isDisposed()) {
        // add cache defeater
        self.lastArgs_[4] = true;
        self.execute.apply(self, self.lastArgs_);
      }
    }, 1);
  }

  /**
   * Adds a cross origin credentials entry for this URL
   * @return {boolean} true if credentials were added, false otherwise
   * @protected
   */
  addCrossOrigin() {
    if (!this.req.getWithCredentials()) {
      var url = this.getLoginUri();

      if (url) {
        var uri = new Uri(url);

        // this URL is going to require credentials
        var regex = new RegExp('^' + uri.getScheme() + '://' + uri.getDomain().replace(/\./g, '\\.') + '/');
        saveCrossOrigin(regex.source, CrossOrigin.USE_CREDENTIALS);
        return true;
      }
    }

    return false;
  }

  /**
   * Get the URI for the login frame
   * @return {?string} The login URI or null if none
   * @protected
   */
  getLoginUri() {
    if (this.loginUrl_) {
      return this.loginUrl_;
    }

    if (this.lastArgs_) {
      var val = /** @type {Uri|string} */ (this.lastArgs_[1]);
      return val.toString();
    }

    return null;
  }
}
