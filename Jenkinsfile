#!/usr/bin/env groovy

properties([
  buildDiscarder(logRotator(numToKeepStr: '20'))
])

node {
  def err = null

  def appVersion = '0.0.0'
  def artifactVersion = '0.0.0'
  def archiveName = 'opensphere.zip'

  def project_dir = 'opensphere-plugin-geoint-viewer'
  def workspace_project = 'opensphere-yarn-workspace'
  def workspace_dir = "${workspace_project}/workspace"

  try {
    stage('init') {
      initEnvironment()
    }

    docker.withRegistry(env.DOCKER_REGISTRY, env.DOCKER_CREDENTIAL) {
      def dockerImage = docker.image(env.DOCKER_IMAGE)
      dockerImage.pull()

      //
      // - Disable user namespace for the container so permissions will map properly with the host
      // - Set HOME to the workspace for cache/config directories (npm/yarn, mvn, etc)
      //
      dockerImage.inside("--userns=host -e HOME=${env.WORKSPACE}") {
        stage('scm') {
          sh "rm -rf ${workspace_project}"

          try {
            beforeCheckout()
          } catch (NoSuchMethodError e) {
          }

          cloneProject(workspace_project)

          dir(workspace_dir) {
            def projects = [
              'opensphere',
              'opensphere-nga-brand',
              'opensphere-nga-lib',
              'opensphere-plugin-analyze',
              'bits-internal',
              'mist',
              'gv.config',
              project_dir
            ]

            for (def project in projects) {
              cloneProject(project)
            }

            dir(project_dir) {
              appVersion = version.getAppVersion()
              artifactVersion = version.getArtifactVersion()
              archiveName = "opensphere-${appVersion}.zip"

              echo "App version: ${appVersion}"
              echo "Artifact version: ${artifactVersion}"
            }
          }
        }

        dir(workspace_dir) {
          stage('yarn') {
            sh 'yarn config list'
            sh "rm yarn.lock || true"
            sh "yarn"
          }

          stage('build') {
            dir('opensphere') {
              sh 'yarn build'
            }
          }

          stage('package') {
            dir('opensphere') {
              dir('dist') {
                sh "zip -q -r ${archiveName} opensphere"
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
            if (env.NEXUS_CREDENTIAL && env.NEXUS_REPO && env.NEXUS_URL) {
              withEnv(["HOME=${pwd()}", "_JAVA_OPTIONS=-Duser.home=${pwd()}"]) {
                def mavenSettings = maven.generateMavenSettingsXmlFile(env.NEXUS_CREDENTIAL)
                sh "cat ${mavenSettings}"
                sh "mkdir -p .m2"
                sh "mv ${mavenSettings} .m2/settings.xml"

                dir('gv.config') {
                  def archivePath = "../opensphere/dist/${archiveName}"
                  def nexusUrl = "${env.NEXUS_URL}/repository/${env.NEXUS_REPO}"
                  sh "./publish.sh '${nexusUrl}' '${archivePath}' ${artifactVersion} opensphere"
                }
              }
            } else {
              echo 'Publish not configured, skipping.'
            }
          }
        }
      }
    }

    if (deployEnv.isDev() && env.DEPLOY_JOB) {
      // Deploy the artifact when building on dev.
      build job: "${env.DEPLOY_JOB}",
          parameters: [string(name: 'ARTIFACT_VERSION', value: artifactVersion)],
          quietPeriod: 5,
          wait: false
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
