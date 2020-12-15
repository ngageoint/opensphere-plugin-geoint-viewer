goog.module('plugin.banner.BannerPlugin');

const AbstractPlugin = goog.require('os.plugin.AbstractPlugin');
const PluginManager = goog.require('os.plugin.PluginManager');


/**
 */
class BannerPlugin extends AbstractPlugin {
  /**
   * Constructor.
   */
  constructor() {
    super();
    this.id = 'banner';
    this.errorMessage = null;
  }

  /**
   * @inheritDoc
   */
  init() {
    var conf = os.settings.get('banner');
    const iconHtmlText = '<i class="fa fa-fw fa-question-circle" title="Warning: This content may not be used as a ' +
    'source of derivative classification. Refer instead to the pertinent classification guide."></i>';
    if (conf && conf['markup']) {
      var targets = ['before', 'after'];
      targets.forEach((key, i) => {
        if (conf[key]) {
          var target = $(conf[key]);
          if (target.length) {
            var banner = $(conf['markup']);
            banner.append($(iconHtmlText));
            if (banner) {
              if (i === 0) {
                target.first().prepend(banner);
              } else {
                target.last().append(banner);
              }
            }
          }
        }
      });
    }
  }
}

PluginManager.getInstance().addPlugin(new BannerPlugin());

exports = BannerPlugin;
