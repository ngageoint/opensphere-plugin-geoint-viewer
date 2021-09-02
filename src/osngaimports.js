/**
 * @fileoverview Plugins and other source added to the NGA OpenSphere application.
 */
goog.declareModuleId('osngaimports');

goog.require('plugin.gegd.GEGDPlugin');
goog.require('plugin.geopackage.GeoPackagePlugin');
goog.require('plugin.osnga.AppPlugin');
goog.require('plugin.overpass.OverpassPlugin');

/* eslint-disable opensphere/no-unused-vars */
import {BannerPlugin} from './plugin/banner/bannerplugin.js';
import {LoginPlugin} from './plugin/login/loginplugin.js';
import {PiwikPlugin} from './plugin/piwik/piwikplugin.js';

import {ISpyPlugin} from 'opensphere-nga-lib/src/plugin/ispy/ispyplugin.js';
