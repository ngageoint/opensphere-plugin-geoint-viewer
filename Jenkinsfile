#!/usr/bin/env groovy

this_version = '0.0.0' // reset below
def err = null

node('Linux&&!gpu') {
  def originalHome = sh(script: 'echo $HOME', returnStdout: true).trim();

  def depCheckProjects = [
    'opensphere-nga-lib',
    'opensphere-plugin-geoint-viewer',
    'opensphere-plugin-analyze'
  ]

  def project_dir = 'opensphere-plugin-geoint-viewer'

  def user_id = sh(script: 'id -u', returnStdout: true).trim()
  def group_id = sh(script: 'id -g', returnStdout: true).trim()

  def docker_img = "${project_dir}-build"
  def docker_run_args = "--rm -i --userns=host --user ${user_id}:${group_id} -v ${env.WORKSPACE}:/build"

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

          try {
            this_version = sh(script: 'git describe --exact-match HEAD', returnStdout: true).trim()
          } catch (e) {
            this_version = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
          }
          sh "echo Building: ${this_version}"
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
            useNpmJsVersions()
          }
        }
      }

      def osSources = []
      for (def project in depCheckProjects) {
        osSources << "workspace/${project}/src/**"
        osSources << "workspace/${project}/package.json"
        osSources << "workspace/${project}/package-lock.json"
      }

      stash name: 'geoint-viewer-source', includes: osSources.join(', '), useDefaultExcludes: false
    }

    stage('yarn') {
      sh 'npm i -g yarn'
      sh 'yarn config list'
      sh 'rm yarn.lock || true'
      sh "yarn install"
    }

    if (isRelease()) {
      // Set up docker for fortify npm install
      stage('docker') {
        withCredentials([string(credentialsId: 'jenkins-gitlab-registry', variable: 'GITLAB_API_TOKEN')]) {
          sh "docker login -u jenkins-gitlab-registry -p ${GITLAB_API_TOKEN} gitlab-registry.devops.geointservices.io"
        }

        sh """
          rm -rf dockertmp
          mkdir dockertmp
          cp workspace/${project_dir}/Dockerfile_build dockertmp/Dockerfile
          pushd dockertmp
          cp /etc/pki/tls/cert.pem ./cacerts.pem
          docker build -t ${docker_img} .
          popd
        """
      }
    }

    stage('Build and Scans - SonarQube, Fortify, OWASP Dependency Checker') {
      // note that the ZAP scan is run post-deploy by the deploy jobs
      parallel (
        "build": {
          // env variables are strings, so need to compare to string 'true'
          if (env.USE_DOCKER_FOR_NODE == 'true') {
            sh "docker run --rm -i --user \$(id -u):\$(id -g) -v ${env.WORKSPACE}:/build -w /build/workspace/opensphere opensphere_build yarn run build"
            sh 'docker rmi opensphere_build'
          }
          else {
            dir('workspace/opensphere') {
              def jdkHome = tool name: env.JDK_TOOL
              withEnv(["PATH+JDK=${jdkHome}/bin", "JAVA_HOME=${jdkHome}"]) {
                sh 'node -e "console.log(require(\'eslint-plugin-opensphere\'));"'
                sh 'yarn run build'
              }
            }
          }
        },
        "fortify" : {
          if (isRelease()) {
            node {
              // ---------------------------------------------
              // Perform Static Security Scans
              dir('fortify') {
                sh "rm -rf *"
                unstash 'geoint-viewer-source'
                // Fortify Scan
                // Clean up Fortify residue:
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b '${env.JOB_NAME}' -clean"
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b '${env.JOB_NAME}' '.'"
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b '${env.JOB_NAME}' -scan -f fortifyResults-${this_version}.fpr"
                // archive includes: '*.fpr'
                uploadToThreadfix("fortifyResults-${this_version}.fpr")
                // Clean up Fortify residue:
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b '${env.JOB_NAME}' -clean"
              }
            }
          }
        },
        "depcheck": {
          if (isRelease()) {
            // the jenkins tool installation version takes forever to run because it has to download and set up its database
            node {
              dir('depcheck') {
                for (def project in depCheckProjects) {
                  sh "docker run ${docker_run_args} -w /build/depcheck/workspace/${project} ${docker_img} rm -rf node_modules"
                }
                sh 'rm -rf *'
                unstash 'geoint-viewer-source'

                for (def project in depCheckProjects) {
                  sh "docker run ${docker_run_args} -w /build/depcheck/workspace/${project} ${docker_img} npm i"
                }

                def depCheckHome = tool('owasp_dependency_check')
                withEnv(["PATH+OWASP=${depCheckHome}/bin"]){
                  sh 'dependency-check.sh --project "GV" --scan "./" --format "ALL" --enableExperimental --disableBundleAudit --disableOssIndex'
                }
                fileExists 'dependency-check-report.xml'
                uploadToThreadfix('dependency-check-report.xml')
              }
            }
          }
        }
      )
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
          if (!(env.JOB_NAME =~ /meatballgrinder/)) {
            installPlugins('gv.config')
            sh "./publish.sh '${env.NEXUS_URL}/repository/${env.NEXUS_SNAPSHOTS}' ../workspace/opensphere/dist/opensphere-${this_version}.zip ${this_version} opensphere"
          }
        }
      }
    }

    if (isRelease()) {
      stage('cleanup') {
        sh "docker rmi ${docker_img}"
      }
    }

    if (!isRelease() && !(env.JOB_NAME =~ /meatballgrinder/)) {
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

def useNpmJsVersions() {
  if (env.JOB_NAME =~ /meatballgrinder/) {
    sh 'perl -ni -e \'print unless /benum/\' package.json'
  }
}

def uploadToThreadfix(file) {
  fileExists file
  withCredentials([string(credentialsId: 'threadfix-full-url', variable: 'THREADFIX_URL')]) {
    sh "/bin/curl -v -H 'Accept: application/json' -X POST --form file=@${file} ${THREADFIX_URL}"
  }
}
