goog.provide('plugin.oauth.EventType');
goog.provide('plugin.oauth.OAuthHandler');
goog.require('goog.Uri');
goog.require('goog.events.Event');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('os.arraybuf');
goog.require('os.net.ExtDomainHandler');


/**
 * @enum {string}
 */
plugin.oauth.EventType = {
  ADD_AUTH_HANDLER: 'addAuthHandler'
};


/**
 * @extends {os.net.ExtDomainHandler}
 * @constructor
 */
plugin.oauth.OAuthHandler = function() {
  plugin.oauth.OAuthHandler.base(this, 'constructor');
  this.log = plugin.oauth.OAuthHandler.LOGGER_;
  this.score = 20;

  /**
   * @type {?Array}
   * @private
   */
  this.lastArgs_ = null;
};
goog.inherits(plugin.oauth.OAuthHandler, os.net.ExtDomainHandler);


/**
 * Logger
 * @type {goog.log.Logger}
 * @const
 * @private
 */
plugin.oauth.OAuthHandler.LOGGER_ = goog.log.getLogger('plugin.oauth.OAuthHandler');


/**
 * @inheritDoc
 */
plugin.oauth.OAuthHandler.prototype.execute = function(
    method, uri, opt_headers, opt_formatter, opt_nocache, opt_responseType) {
  // store the original arguments so we can potentially run it again
  this.lastArgs_ = Array.prototype.slice.call(arguments);

  plugin.oauth.OAuthHandler.base(this, 'execute', method, uri, opt_headers, opt_formatter,
      opt_nocache, opt_responseType);
};


/**
 * @inheritDoc
 */
plugin.oauth.OAuthHandler.prototype.onXhrComplete = function(opt_evt) {
  // see if we got redirected to something authy
  var resp = this.getResponse();

  // the response could be binary, so check for text first
  if (resp instanceof ArrayBuffer && os.arraybuf.isText(resp)) {
    resp = os.arraybuf.toString(resp);
  }

  if (goog.isString(resp)) {
    var regexSources = /** @type {Array<string>} */ (os.settings.get('plugin.oauth.regexes',
        ['<(html|body)(\\s+|>)', '(sign|log)\\s*in']));

    var isLogin = true;
    for (var i = 0, n = regexSources.length; isLogin && i < n; i++) {
      isLogin = new RegExp(regexSources[i], 'i').test(resp);
    }

    if (isLogin) {
      // see if we are just missing a credentials entry and try again
      if (this.addCrossOrigin()) {
        this.retry();
      } else {
        var evt = new goog.events.Event(plugin.oauth.EventType.ADD_AUTH_HANDLER);
        evt.target = this;
        os.dispatcher.dispatchEvent(evt);
      }
    } else {
      plugin.oauth.OAuthHandler.base(this, 'onXhrComplete', opt_evt);
      this.lastArgs_ = null;
    }
  }
};


/**
 * Retry the request
 */
plugin.oauth.OAuthHandler.prototype.retry = function() {
  var self = this;

  setTimeout(function() {
    if (!self.isDisposed()) {
      // add cache defeater
      self.lastArgs_[4] = true;
      self.execute.apply(self, self.lastArgs_);
    }
  }, 1);
};


/**
 * Adds a cross origin credentials entry for this URL
 * @return {boolean} true if credentials were added, false otherwise
 */
plugin.oauth.OAuthHandler.prototype.addCrossOrigin = function() {
  if (!this.req.getWithCredentials()) {
    var url = this.getLoginUri();

    // this URL is going to require credentials
    var regex = new RegExp('^' + url.getScheme() + '://' + url.getDomain().replace(/\./g, '\\.') + '/');

    // add it for the session
    os.net.registerCrossOrigin(regex, os.net.CrossOrigin.USE_CREDENTIALS);

    // add it for next time
    var userOrigins = os.settings.get('userCrossOrigin', []);

    userOrigins.push({
      'pattern': regex.source,
      'crossOrigin': os.net.CrossOrigin.USE_CREDENTIALS
    });

    os.settings.set('userCrossOrigin', userOrigins);
    return true;
  }

  return false;
};

/**
 * Get the URI for the login frame
 * @return {?goog.Uri} The login URI or null if none
 */
plugin.oauth.OAuthHandler.prototype.getLoginUri = function() {
  if (this.lastArgs_) {
    var val = /** @type {goog.Uri|string} */ (this.lastArgs_[1]);
    return goog.isString(val) ? new goog.Uri(val) : val;
  }

  return null;
};

