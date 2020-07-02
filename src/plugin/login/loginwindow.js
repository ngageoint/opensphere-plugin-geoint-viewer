goog.module('plugin.login.LoginWindowUI');

const Uri = goog.require('goog.Uri');
const obj = goog.require('ol.obj');
const Module = goog.require('os.ui.Module');
const WindowEventType = goog.require('os.ui.WindowEventType');
const {close: closeWindow, create: createWindow} = goog.require('os.ui.window');
const Event = goog.require('plugin.login.Event');
const EventType = goog.require('plugin.login.EventType');
const {ROOT: gvROOT} = goog.require('gv');


/**
 * Login window ID.
 * @type {string}
 */
const WINDOW_ID = 'login-login';


/**
 * The alerts directive
 * @return {angular.Directive}
 */
const directive = () => {
  var electron = navigator.userAgent.toLowerCase().indexOf(' electron') > -1;

  return {
    restrict: 'AE',
    replace: true,
    scope: true,
    templateUrl: gvROOT + 'views/plugin/login/' + (electron ? 'login' : 'link') + 'window.html',
    controller: Controller,
    controllerAs: 'ctrl'
  };
};


/**
 * Add the directive to the module
 */
Module.directive('login', [directive]);


/**
 * @unrestricted
 */
class Controller {
  /**
   * Constructor.
   * @param {!angular.Scope} $scope The scope
   * @param {!angular.JQLite} $element The element
   * @ngInject
   */
  constructor($scope, $element) {
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
    $scope.$emit(WindowEventType.READY);
  }

  /**
   * clean up
   * @private
   */
  destroy_() {
    var type = this.frameLoads_ > 1 ? EventType.AUTH_COMPLETE : EventType.AUTH_CANCEL;

    var evt = new Event(type, /** @type {!string} */ (this.scope_['url']));
    evt.target = this;
    os.dispatcher.dispatchEvent(evt);

    this.scope_ = null;
    this.element_ = null;
  }

  /**
   * Count the frame loads and retry the request
   * @private
   */
  onFrameLoad_() {
    this.frameLoads_++;

    if (this.frameLoads_ > 1) {
      closeWindow(this.element_);
    }
  }

  /**
   * @export
   */
  accept() {
    this.frameLoads_ = 2;
    closeWindow(this.element_);
  }

  /**
   * @export
   */
  cancel() {
    this.frameLoads_ = 0;
    closeWindow(this.element_);
  }

  /**
   * @param {!string} url
   */
  static launch(url) {
    var uri = new Uri(url);
    var options = {
      'id': WINDOW_ID,
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
      options = obj.assign(options, {
        'width': 800,
        'height': 600
      });
    }

    createWindow(options, '<login></login>', undefined, undefined, undefined, {
      'url': url
    });
  }
}


exports = {
  Controller,
  directive
};
