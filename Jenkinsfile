#!/usr/bin/env groovy

this_version = '0.0.0' // reset below
def err = null

node {
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
      // - Set HOME to the workspace for .yarn and .cache cache directories
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
              project_dir
            ]

            for (def project in projects) {
              cloneProject(project)
            }

            dir(project_dir) {
              GIT_COMMIT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

              this_version = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
              echo "Building: ${this_version}"
            }
          }
        }

        stage('yarn') {
          dir(workspace_project) {
            sh 'yarn config list'
            sh "rm yarn.lock || true"
            sh "yarn"
          }
        }

        stage('build') {
          dir("${workspace_dir}/opensphere") {
            sh 'yarn build'
          }
        }

        stage('package') {
          dir("${workspace_dir}/opensphere") {
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
          if (env.NEXUS_CREDENTIAL && env.NEXUS_SNAPSHOTS && env.NEXUS_URL) {
            withEnv(["HOME=${pwd()}", "_JAVA_OPTIONS=-Duser.home=${pwd()}"]) {
              def mavenSettings = maven.generateMavenSettingsXmlFile(env.NEXUS_CREDENTIAL)
              sh "cat ${mavenSettings}"
              sh "mkdir -p .m2"
              sh "mv ${mavenSettings} .m2/settings.xml"

              cloneProject('gv.config')
              dir('gv.config') {
                sh "./publish.sh '${env.NEXUS_URL}/repository/${env.NEXUS_SNAPSHOTS}' ../${workspace_dir}/opensphere/dist/opensphere-${this_version}.zip ${this_version} opensphere"
              }
            }
          } else {
            echo 'Publish not configured, skipping.'
          }
        }
      }
    }

    if (!isRelease() && env.DEPLOY_JOB) {
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
