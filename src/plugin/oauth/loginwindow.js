goog.provide('plugin.oauth.LoginWindowCtrl');
goog.provide('plugin.oauth.loginDirective');
goog.require('gv.defines');
goog.require('os.ui.Module');
goog.require('os.ui.window');


/**
 * The alerts directive
 * @return {angular.Directive}
 */
plugin.oauth.loginDirective = function() {
  return {
    restrict: 'AE',
    replace: true,
    scope: true,
    templateUrl: gv.ROOT + 'views/plugin/oauth/loginwindow.html',
    controller: plugin.oauth.LoginWindowCtrl,
    controllerAs: 'ctrl'
  };
};


/**
 * Add the directive to the module
 */
os.ui.Module.directive('login', [plugin.oauth.loginDirective]);


/**
 * @param {!angular.Scope} $scope The scope
 * @param {!angular.JQLite} $element The element
 * @constructor
 * @ngInject
 */
plugin.oauth.LoginWindowCtrl = function($scope, $element) {
  /**
   * @type {?angular.Scope}
   * @private
   */
  this.scope_ = $scope;

  /**
   * @type {?angular.JQLite}
   * @private
   */
  this.element_ = $element;

  /**
   * @type {number}
   * @private
   */
  this.frameLoads_ = 0;

  var iframe = this.element_.find('iframe');
  iframe.on('load', this.onFrameLoad_.bind(this));
  iframe.attr('src', this.scope_['url']);
  this.scope_.$on('$destroy', this.destroy_.bind(this));
};


/**
 * @type {string}
 * @const
 */
plugin.oauth.LoginWindowCtrl.WINDOW_ID = 'oauth-login';


/**
 * clean up
 * @private
 */
plugin.oauth.LoginWindowCtrl.prototype.destroy_ = function() {
  this.scope_ = null;
  this.element_ = null;
};


/**
 * Count the frame loads and retry the request
 * @private
 */
plugin.oauth.LoginWindowCtrl.prototype.onFrameLoad_ = function() {
  this.frameLoads_++;

  if (this.frameLoads_ > 1) {
    /** @type {plugin.oauth.OAuthHandler} */ (this.scope_['handler']).retry();
  }
};


/**
 * @param {plugin.oauth.OAuthHandler} handler The request handler
 */
plugin.oauth.LoginWindowCtrl.launch = function(handler) {
  var url = handler.getLoginUri();
  os.ui.window.create({
    'id': plugin.oauth.LoginWindowCtrl.WINDOW_ID,
    'label': 'Login to ' + url.getDomain(),
    'icon': 'fa fa-sign-in',
    'no-scroll': 'true',
    'x': 'center',
    'y': 'center',
    'width': '800',
    'height': '600',
    'min-width': '300',
    'max-width': '1000',
    'min-height': '300',
    'max-height': '1000',
    'show-close': true
  }, '<login></login>', undefined, undefined, undefined, {
    'url': url.toString(),
    'handler': handler
  });
};
