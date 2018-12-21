goog.provide('plugin.login.LoginWindowCtrl');
goog.provide('plugin.login.loginDirective');

goog.require('goog.Uri');
goog.require('gv.defines');
goog.require('ol.obj');
goog.require('os.ui.Module');
goog.require('os.ui.window');
goog.require('plugin.login.Event');
goog.require('plugin.login.EventType');


/**
 * The alerts directive
 * @return {angular.Directive}
 */
plugin.login.loginDirective = function() {
  var electron = navigator.userAgent.toLowerCase().indexOf(' electron') > -1;

  return {
    restrict: 'AE',
    replace: true,
    scope: true,
    templateUrl: gv.ROOT + 'views/plugin/login/' + (electron ? 'login' : 'link') + 'window.html',
    controller: plugin.login.LoginWindowCtrl,
    controllerAs: 'ctrl'
  };
};


/**
 * Add the directive to the module
 */
os.ui.Module.directive('login', [plugin.login.loginDirective]);


/**
 * @param {!angular.Scope} $scope The scope
 * @param {!angular.JQLite} $element The element
 * @constructor
 * @ngInject
 */
plugin.login.LoginWindowCtrl = function($scope, $element) {
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
  if (iframe) {
    iframe.on('load', this.onFrameLoad_.bind(this));
    iframe.attr('src', this.scope_['url']);
  }
  this.scope_.$on('$destroy', this.destroy_.bind(this));
  $scope.$emit(os.ui.WindowEventType.READY);
};


/**
 * @type {string}
 * @const
 */
plugin.login.LoginWindowCtrl.WINDOW_ID = 'login-login';


/**
 * clean up
 * @private
 */
plugin.login.LoginWindowCtrl.prototype.destroy_ = function() {
  var type = this.frameLoads_ > 1 ? plugin.login.EventType.AUTH_COMPLETE :
      plugin.login.EventType.AUTH_CANCEL;

  var evt = new plugin.login.Event(type, /** @type {!string} */ (this.scope_['url']));
  evt.target = this;
  os.dispatcher.dispatchEvent(evt);

  this.scope_ = null;
  this.element_ = null;
};


/**
 * Count the frame loads and retry the request
 * @private
 */
plugin.login.LoginWindowCtrl.prototype.onFrameLoad_ = function() {
  this.frameLoads_++;

  if (this.frameLoads_ > 1) {
    os.ui.window.close(this.element_);
  }
};


/**
 * @export
 */
plugin.login.LoginWindowCtrl.prototype.accept = function() {
  this.frameLoads_ = 2;
  os.ui.window.close(this.element_);
};


/**
 * @export
 */
plugin.login.LoginWindowCtrl.prototype.cancel = function() {
  this.frameLoads_ = 0;
  os.ui.window.close(this.element_);
};


/**
 * @param {!string} url
 */
plugin.login.LoginWindowCtrl.launch = function(url) {
  var uri = new goog.Uri(url);
  var options = {
    'id': plugin.login.LoginWindowCtrl.WINDOW_ID,
    'label': 'Login to ' + uri.getDomain(),
    'icon': 'fa fa-sign-in',
    'no-scroll': 'true',
    'x': 'center',
    'y': 'center',
    'show-close': true,
    'width': 400,
    'height': 'auto',
    'min-width': 300,
    'max-width': 1000,
    'min-height': 300,
    'max-height': 1000
  };

  if (navigator.userAgent.toLowerCase().indexOf(' electron') > -1) {
    options = ol.obj.assign(options, {
      'width': 800,
      'height': 600
    });
  }

  os.ui.window.create(options, '<login></login>', undefined, undefined, undefined, {
    'url': url
  });
};
