#!/usr/bin/env groovy

this_version = '0.0.0' // reset below
def err = null

node('Linux&&!gpu') {
  def originalHome = sh(script: 'echo $HOME', returnStdout: true).trim();

  try {
    isMeatballGrinderDeployment = env.JOB_NAME =~ /meatballgrinder/

    initEnvironment()
    initGV()

    try {
      beforeCheckout()
    } catch (NoSuchMethodError e) {
    }

    stage('scm') {
      installPlugins('master', 'opensphere-yarn-workspace')

      dir('workspace') {
        dir('opensphere-plugin-geoint-viewer') {
          sh "echo 'checking out scm'"
          checkout scm

          GIT_COMMIT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

          try {
            this_version = sh(script: 'git describe --exact-match HEAD', returnStdout: true).trim()
          } catch (e) {
            this_version = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
          }
        }

        def projects = [
          'closure-util',
          'opensphere',
          'opensphere-plugin-analyze',
          'opensphere-plugin-gbdx',
          'opensphere-plugin-pixia',
          'opensphere-plugin-overpass',
          'bits-internal',
          'mist']

        for (def project in projects) {
          dir(project) {
            installPlugins('master', project)
            useNpmJsVersions()
          }
        }
      }

      def sources = [
        'workspace/opensphere-plugin-geoint-viewer/src/**',
        'workspace/opensphere-plugin-geoint-viewer/package.json',
        'workspace/opensphere-plugin-pixia/src/**',
        'workspace/opensphere-plugin-pixia/package.json',
        'workspace/opensphere-plugin-overpass/src/**',
        'workspace/opensphere-plugin-overpass/package.json',
        'workspace/opensphere-plugin-gbdx/src/**',
        'workspace/opensphere-plugin-gbdx/package.json',
        'workspace/opensphere-plugin-analyze/src/**',
        'workspace/opensphere-plugin-analyze/package.json'
      ]

      stash name: 'geoint-viewer-source', includes: sources.join(', '), useDefaultExcludes: false
    }

    stage('yarn') {
      sh 'rm -rf node_modules/opensphere/node_modules/closure-util || true'
      sh 'npm i -g yarn'
      // someone went and set nexus.gs.mil as the global default registry. ugh.
      sh 'npm config set registry https://registry.npmjs.org/'
      sh 'yarn config list'
      sh 'rm yarn.lock || true'
      sh 'yarn install'
    }

    stage('Build and Scans - SonarQube, Fortify, OWASP Dependecy Checker') {
      // note that the ZAP scan is run post-deploy by the deploy jobs
      parallel (
        "build": {
          dir('workspace/opensphere') {
            sh 'yarn run build'
            sh 'mv dist/opensphere dist/gv'
          }
        },
//        "sonarqube" : {
//          if (env.BRANCH_NAME == 'master') {
//            node {
//              dir('scans') {
//                sh "rm -rf *"
//                unstash 'geoint-viewer-source'
//                //sh "pwd && ls -al *"
//                sh """#!/bin/bash
//                if [[ ! -e pom.xml ]] ; then
//                cat > pom.xml <<'EOF'
//<project>
//<modelVersion>4.0.0</modelVersion>
//<groupId>groupId</groupId>
//<artifactId>GV</artifactId>
//<version>${this_version}</version>
//</project>
//EOF
//ls -lrt
//                fi
//                """
//                withCredentials([string(credentialsId: "${env.SONAR_CREDENTIAL}", variable: 'sonar_login')]) {
//                  sh """mvn sonar:sonar \\
//                    -Dsonar.host.url=${env.SONAR_URL} \\
//                    -Dsonar.login=${sonar_login} \\
//                    -Dsonar.projectBaseDir=. \\
//                    -Dsonar.projectKey=fade:gv \\
//                    -Dsonar.projectName=gv \\
//                    -Dsonar.projectVersion=${this_version}\\
//                    -Dsonar.sources=.\\
//                    -Dsonar.tests=''\\
//                    -Dsonar.exclusions=node_modules/**/*\\
//                    -Dsonar.test.exclusions=node_modules/**/*\\
//                    -Dsonar.sourceEncoding=UTF-8\\
//                    """
//                }
//              }
//            }
//          }
//        },
        "fortify" : {
          if (env.BRANCH_NAME == 'master') {
            node {
              // ---------------------------------------------
              // Perform Static Security Scans
              dir('scans') {
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
// TODO: this was disabled due to an error it was producing while trying to update the CVE database
//        "depcheck": {
//          if (env.BRANCH_NAME == 'master') {
//            // the jenkins tool installation version takes forever to run because it has to download and set up its database
//            node {
//              dir('scans') {
//                sh 'rm -rf *'
//                unstash 'geoint-viewer-source'
//                sh '/jslave/dependency-check/dependency-check/bin/dependency-check.sh --project "GV" --scan "./" --format "ALL" --enableExperimental --disableBundleAudit'
//                fileExists 'dependency-check-report.xml'
//                uploadToThreadfix('dependency-check-report.xml')
//              }
//            }
//          }
//        }
      )
    }

    dir('workspace/opensphere') {
      stage('package') {
        dir('dist') {
          sh "zip -q -r gv-${this_version}.zip gv"
        }

        if (env.BRANCH_NAME == 'master') {
          try {
            // newer Jenkins
            archiveArtifacts 'dist/*.zip'
          } catch (NoSuchMethodError e) {
            // older Jenkins
            archive 'dist/*.zip'
          }
        }
      }
    }

    sh 'mkdir -p .m2'
    sh "cat ${originalHome}/.m2/settings.xml > .m2/settings.xml"

    withEnv(["HOME=${pwd()}", "_JAVA_OPTIONS=-Duser.home=${pwd()}"]) {
      dir('gv.config') {
        stage('publish') {
	  if (env.BRANCH_NAME == 'master') {
	    installPlugins('master', 'gv.config')
            sh "./publish.sh '${env.NEXUS_URL}/content/repositories/${env.NEXUS_SNAPSHOTS}' ../workspace/opensphere/dist/gv-${this_version}.zip ${this_version}"
	  }
	}
      }
    }

    if (env.BRANCH_NAME == 'master') {
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
  // clean up things that aren't on npmjs.org
  sh 'perl -ni -e \'print unless /opensphere-state/\' package.json'
  sh 'perl -ni -e \'print unless /bits-protractor/\' package.json'

  if (isMeatballGrinderDeployment) {
    sh 'perl -ni -e \'print unless /benum/\' package.json'
  }
}

def uploadToThreadfix(file) {
  fileExists file
  withCredentials([string(credentialsId: 'threadfix-full-url', variable: 'THREADFIX_URL')]) {
    sh "/bin/curl -v -H 'Accept: application/json' -X POST --form file=@${file} ${THREADFIX_URL}"
  }
}
