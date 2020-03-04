goog.provide('plugin.login.LoginHandler');

goog.require('goog.Uri');
goog.require('goog.events.Event');
goog.require('goog.log');
goog.require('goog.log.Logger');
goog.require('os.arraybuf');
goog.require('os.net');
goog.require('os.net.ExtDomainHandler');
goog.require('plugin.login.Event');
goog.require('plugin.login.EventType');


/**
 * @extends {os.net.ExtDomainHandler}
 * @constructor
 */
plugin.login.LoginHandler = function() {
  plugin.login.LoginHandler.base(this, 'constructor');
  this.log = plugin.login.LoginHandler.LOGGER_;
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
};
goog.inherits(plugin.login.LoginHandler, os.net.ExtDomainHandler);


/**
 * Logger
 * @type {goog.log.Logger}
 * @const
 * @private
 */
plugin.login.LoginHandler.LOGGER_ = goog.log.getLogger('plugin.login.LoginHandler');


/**
 * @inheritDoc
 */
plugin.login.LoginHandler.prototype.disposeInternal = function() {
  this.removeLoginListeners();
  plugin.login.LoginHandler.base(this, 'disposeInternal');
};


/**
 * @inheritDoc
 */
plugin.login.LoginHandler.prototype.execute = function(
    method, uri, opt_headers, opt_formatter, opt_nocache, opt_responseType) {
  // store the original arguments so we can potentially run it again
  this.lastArgs_ = Array.prototype.slice.call(arguments);

  plugin.login.LoginHandler.base(this, 'execute', method, uri, opt_headers, opt_formatter,
      opt_nocache, opt_responseType);
};


/**
 * @return {Array<{loginUrl: (string|undefined), regexes: Array<!RegExp>, priority: number}>}
 * @protected
 */
plugin.login.LoginHandler.prototype.loadLoginConfigs = function() {
  var configs = [];
  var logins = /** @type {Object<string, *>} */ (os.settings.get('plugin.login', {}));
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
};


/**
 * @inheritDoc
 */
plugin.login.LoginHandler.prototype.onXhrComplete = function(opt_evt) {
  // see if we got redirected to something authy
  var resp = this.getResponse();

  // the response could be binary, so check for text first
  if (resp instanceof ArrayBuffer && os.arraybuf.isText(resp)) {
    resp = os.arraybuf.toString(resp);
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
          var evt = new plugin.login.Event(plugin.login.EventType.AUTH_INIT, url);
          evt.target = this;
          this.addLoginListeners();
          os.dispatcher.dispatchEvent(evt);
        }
      }

      return;
    }
  }

  plugin.login.LoginHandler.base(this, 'onXhrComplete', opt_evt);
  this.lastArgs_ = null;
};


/**
 * @protected
 */
plugin.login.LoginHandler.prototype.addLoginListeners = function() {
  os.dispatcher.listen(plugin.login.EventType.AUTH_COMPLETE, this.onAuth, false, this);
  os.dispatcher.listen(plugin.login.EventType.AUTH_CANCEL, this.onAuth, false, this);
};


/**
 * @protected
 */
plugin.login.LoginHandler.prototype.removeLoginListeners = function() {
  os.dispatcher.unlisten(plugin.login.EventType.AUTH_COMPLETE, this.onAuth, false, this);
  os.dispatcher.unlisten(plugin.login.EventType.AUTH_CANCEL, this.onAuth, false, this);
};


/**
 * @param {plugin.login.Event} evt
 * @protected
 */
plugin.login.LoginHandler.prototype.onAuth = function(evt) {
  this.removeLoginListeners();

  if (evt.url === this.getLoginUri()) {
    if (evt.type === plugin.login.EventType.AUTH_COMPLETE) {
      this.addCrossOrigin();
      this.retry();
    } else {
      this.errors = ['Unauthorized. Login failed or was canceled.'];
      this.dispatchEvent(goog.net.EventType.ERROR);
    }
  }
};


/**
 * Retry the request
 */
plugin.login.LoginHandler.prototype.retry = function() {
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
 * @protected
 */
plugin.login.LoginHandler.prototype.addCrossOrigin = function() {
  if (!this.req.getWithCredentials()) {
    var url = this.getLoginUri();

    if (url) {
      var uri = new goog.Uri(url);

      // this URL is going to require credentials
      var regex = new RegExp('^' + uri.getScheme() + '://' + uri.getDomain().replace(/\./g, '\\.') + '/');
      os.net.saveCrossOrigin(regex.source, os.net.CrossOrigin.USE_CREDENTIALS);
      return true;
    }
  }

  return false;
};


/**
 * Get the URI for the login frame
 * @return {?string} The login URI or null if none
 * @protected
 */
plugin.login.LoginHandler.prototype.getLoginUri = function() {
  if (this.loginUrl_) {
    return this.loginUrl_;
  }

  if (this.lastArgs_) {
    var val = /** @type {goog.Uri|string} */ (this.lastArgs_[1]);
    return val.toString();
  }

  return null;
};
