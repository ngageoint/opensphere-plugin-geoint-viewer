goog.declareModuleId('plugin.login.LoginWindowUI');

import * as dispatcher from 'opensphere/src/os/dispatcher.js';
import Module from 'opensphere/src/os/module.js';
import {ROOT} from '../../gv.js';
import {LoginEvent} from './event.js';
import {LoginEventType} from './eventtype.js';

const Uri = goog.require('goog.Uri');
const WindowEventType = goog.require('os.ui.WindowEventType');
const {close: closeWindow, create: createWindow} = goog.require('os.ui.window');


/**
 * Login window ID.
 * @type {string}
 */
const WINDOW_ID = 'login-login';

/**
 * The alerts directive
 * @return {angular.Directive}
 */
export const directive = () => {
  var electron = navigator.userAgent.toLowerCase().indexOf(' electron') > -1;

  return {
    restrict: 'AE',
    replace: true,
    scope: true,
    templateUrl: ROOT + 'views/plugin/login/' + (electron ? 'login' : 'link') + 'window.html',
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
    var type = this.frameLoads_ > 1 ? LoginEventType.AUTH_COMPLETE : LoginEventType.AUTH_CANCEL;

    var evt = new LoginEvent(type, /** @type {!string} */ (this.scope_['url']));
    evt.target = this;
    dispatcher.getInstance().dispatchEvent(evt);

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
}

/**
 * @param {!string} url
 */
export const launchLoginWindow = (url) => {
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
    options = Object.assign(options, {
      'width': 800,
      'height': 600
    });
  }

  createWindow(options, '<login></login>', undefined, undefined, undefined, {
    'url': url
  });
};

export {Controller};
