# GEOINT Viewer Plugin for OpenSphere

## Electron Builds

To create an Electron build of GEOINT Viewer:

* Clone the [opensphere-electron](git@github.com:ngageoint/opensphere-electron.git) and [opensphere-config-electron](git@github.com:ngageoint/opensphere-config-electron.git) projects to your workspace.
* Build GEOINT Viewer.
* From `opensphere-electron`, create installers with `--config ../opensphere-plugin-geoint-viewer/electron-builder.yml` added to the command line.

Example:

```
yarn run create-installer:mac --config ../opensphere-plugin-geoint-viewer/electron-builder.yml
```

The configuration file changes the name, icons, and Electron main process configuration from the default OpenSphere config.
