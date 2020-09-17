/**
 * @fileoverview Plugins and other source added to the NGA OpenSphere application.
 */
goog.module('osngaimports');

goog.require('coreui.search.detailedSearchBoxDirective');
goog.require('mist.ui.search.searchPageFlyoutDirective');
goog.require('plugin.banner.BannerPlugin');
goog.require('plugin.geopackage.GeoPackagePlugin');
goog.require('plugin.ispy.ISpyPlugin');
goog.require('plugin.login.LoginPlugin');
goog.require('plugin.overpass.OverpassPlugin');
goog.require('plugin.piwik.PiwikPlugin');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');


/**
 */
class MainPlugin extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = 'osnga';
  }

  /**
   * @inheritDoc
   */
  init() {
    // replace the searchbox
    os.ui.list.remove(os.ui.nav.Location.TOP_RIGHT, os.ui.navbaroptions.searchbox);
    os.ui.navbaroptions.searchbox = '<detail-search-box show-clear="true"></detail-search-box>';
    os.ui.list.add(os.ui.nav.Location.TOP_RIGHT, os.ui.navbaroptions.searchbox, 900);

    // replace the search results
    os.ui.navbaroptions.searchresults = 'search-page-flyout';
  }
}

(function() {
  if (os.isMainWindow()) {
    PluginManager.getInstance().addPlugin(new MainPlugin());
  }
}());
