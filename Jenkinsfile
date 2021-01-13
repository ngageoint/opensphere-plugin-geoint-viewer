#!/usr/bin/env groovy

this_version = '0.0.0' // reset below
def err = null

node('Linux&&Standard') {
  def project_dir = 'opensphere-plugin-geoint-viewer'

  try {
    initEnvironment()
    initGV()

    try {
      beforeCheckout()
    } catch (NoSuchMethodError e) {
    }

    stage('scm') {
      installPlugins('opensphere-yarn-workspace')

      dir('workspace') {
        sh 'rm -rf *'
        dir(project_dir) {
          sh "echo 'checking out scm'"
          checkout scm

          GIT_COMMIT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

          this_version = getAppVersion()
          echo "Building: ${this_version}"
        }

        def projects = [
          'opensphere',
          'opensphere-nga-brand',
          'opensphere-nga-lib',
          'opensphere-plugin-analyze',
          'bits-internal',
          'mist'
        ]

        for (def project in projects) {
          dir(project) {
            installPlugins(project)
          }
        }
      }
    }

    stage('yarn') {
      sh 'npm i -g yarn'
      sh 'yarn config list'
      sh 'rm yarn.lock || true'
      sh "yarn install"
    }

    stage('build') {
      dir('workspace/opensphere') {
        def jdkHome = tool name: env.JDK_TOOL
        withEnv(["PATH+JDK=${jdkHome}/bin", "JAVA_HOME=${jdkHome}"]) {
          sh 'yarn run build'
        }
      }
    }

    stage('package') {
      dir('workspace/opensphere') {
        dir('dist') {
          sh "zip -q -r opensphere-${this_version}.zip opensphere"
        }

        try {
          // newer Jenkins
          archiveArtifacts 'dist/*.zip'
          archiveArtifacts '.build/opensphere.min.js.map'
        } catch (NoSuchMethodError e) {
          // older Jenkins
          archive 'dist/*.zip'
          archive '.build/opensphere.min.js.map'
        }
      }
    }

    stage('publish') {
      def mavenSettings = maven.generateMavenSettingsXmlFile(env.NEXUS_CREDENTIAL)
      sh "cat ${mavenSettings}"
      sh "mkdir -p .m2"
      sh "mv ${mavenSettings} .m2/settings.xml"

      withEnv(["HOME=${pwd()}", "_JAVA_OPTIONS=-Duser.home=${pwd()}"]) {
        dir('gv.config') {
          installPlugins('gv.config')
          sh "./publish.sh '${env.NEXUS_URL}/repository/${env.NEXUS_SNAPSHOTS}' ../workspace/opensphere/dist/opensphere-${this_version}.zip ${this_version} opensphere"
        }
      }
    }

    if (!isRelease()) {
      // kick off deploy build
      build job: "${env.DEPLOY_JOB}", quietPeriod: 5, wait: false
    }
  } catch (e) {
    currentBuild.result = 'FAILURE'
    err = e
  } finally {
    try {
      notifyBuild()
    } catch (NoSuchMethodError e) {
      error 'Please define "notifyBuild()" through a shared pipeline library for this network'
    }

    if (err) {
      throw err
    }
  }
}
