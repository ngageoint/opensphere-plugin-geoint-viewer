/**
 * @fileoverview Plugins and other source added to the NGA OpenSphere application.
 */
goog.declareModuleId('osngaimports');

/* eslint-disable opensphere/no-unused-vars */

import {GEGDPlugin} from 'opensphere-nga-lib/src/plugin/gegd/gegdplugin.js';
import {ISpyPlugin} from 'opensphere-nga-lib/src/plugin/ispy/ispyplugin.js';
import {AppPlugin} from 'opensphere-nga-lib/src/plugin/osnga/appplugin.js';
import {OverpassPlugin} from 'opensphere-nga-lib/src/plugin/overpass/overpassplugin.js';
import {GeoPackagePlugin} from 'opensphere-plugin-geopackage/src/plugin/geopackage/geopackageplugin.js';

import {BannerPlugin} from './plugin/banner/bannerplugin.js';
import {LoginPlugin} from './plugin/login/loginplugin.js';
import {PiwikPlugin} from './plugin/piwik/piwikplugin.js';
