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
    const conf = os.settings.get('banner');
    if (conf && conf['markup']) {
      const targets = ['before', 'after'];
      targets.forEach((key, i) => {
        if (conf[key]) {
          const target = $(conf[key]);
          if (target.length) {
            const banner = $(conf['markup']);
            if (conf['tooltip']) {
              const tooltip = /** @type {string} */ (conf['tooltip']);
              const iconEl = $(`<i class="fa fa-fw fa-question-circle ml-1" title="${tooltip}"></i>`);
              banner.append(iconEl);
              iconEl.tooltip();
            }
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
