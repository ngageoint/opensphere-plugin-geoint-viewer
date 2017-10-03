#!/usr/bin/env groovy


ANALYZE = false
THREADFIX_ID = 58
FORTIFY_ENABLED = true
this_version = '0.0.0' // reset below
NEXUS_URL = 'https://nexus.devops.geointservices.io/content/repositories/FADE-Snapshots/'
SONAR_URL = 'https://sonar.geointservices.io'
SONAR_CRED = 'sonar-push'
DEPLOY_JOB_NAME = 'GEOINTServices-BITS/gvweb-io-pcf/Deploy to Test'

// change values for .mil build
if (env.JOB_URL =~ /^https:\/\/jenkins.gs.mil\//) {
  ANALYZE = true
  NEXUS_URL = 'https://nexus.gs.mil/content/repositories/FADE_Capabilities-snapshot/'
  SONAR_CRED = 'sonar-prod-publish-token'
  SONAR_URL = 'https://sonar.gs.mil'
  DEPLOY_JOB_NAME = 'FADE_Capabilities/GEOINT Viewer Web/gv-deploy-uc-dev'
}

def err = null

node('Linux') {
  def originalHome = sh(script: 'echo $HOME', returnStdout: true).trim();

  try {
    try {
      beforeCheckout()
    } catch (NoSuchMethodError e) {
    }

    dir('opensphere-plugin-geoint-viewer') {
      stage('scm') {
        sh "echo 'checking out scm'"

        // don't do this on first run
        sh 'if [ -d ".git" ]; then git clean -ffdx; fi'
        checkout scm

        try {
          // eh... no?
          //sh "echo 'after checkout'"
          //afterCheckout()
        } catch (NoSuchMethodError e) {
        }

        GIT_COMMIT = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()

        try {
          this_version = sh(script: 'git describe --exact-match HEAD', returnStdout: true).trim()
        } catch (e) {
          this_version = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
        }
      }
    }

    def sources = []

    // closure-util can go pound sand
    sh 'rm -rf */node_modules/closure-util'
    dir('closure-util') {
      sh 'rm -rf *'
      sh 'echo \'{"version":"1.18.0","name":"closure-util","bin":{"closure-util":"no.js"}}\' > package.json'
      sh 'touch no.js'
    }

    // get main opensphere project
    dir('opensphere') {
      stage('install opensphere') {
        sh 'if [ -d ".git" ]; then git clean -ffdx; fi'
        sh 'echo $PATH'
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/core-ui.git')
        sh 'npm link ../closure-util'
        try {
          npmInstall()
        } catch (e) {
          sh 'cat npm-debug.log'
          throw e
        }
      }
    }

    dir('opensphere-plugin-geoint-viewer') {
      // gotta run npm to run tests and docs
      stage('npm') {
        sources = sources.plus([
          'opensphere-plugin-geoint-viewer/src/**',
          'opensphere-plugin-geoint-viewer/package.json'
        ])
        // except that there are currently no tests because GV is just a branding wrapper
        //sh 'mkdir -p node_modules'
        //sh 'ln -s ../../opensphere node_modules/opensphere'
        //npmInstall()

        // run tests

        // gen docs
        /*stage('docs')
        sh 'npm run compile:dossier'

        try {
          deployDocs()
        } catch (NoSuchMethodError e) {
        }*/
      }
    }

    // Add Planet Labs plugin
    dir('opensphere-plugin-planetlabs') {
      stage('install planetlabs') {
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/gv-plugin-planetlabs.git')
        sources = sources.plus([
          'opensphere-plugin-planetlabs/src/**',
          'opensphere-plugin-planetlabs/package.json'
        ])
        // Technically you should generically call npmInstall after installPlugins but this one has no dependencies
        //sh 'mkdir -p node_modules'
        //sh 'ln -s ../../opensphere node_modules/opensphere'
        //npmInstall(true)
      }
    }

    // Add Overpass plugin
    dir('opensphere-plugin-overpass') {
      stage('install overpass') {
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/gv-plugin-overpass.git')
        sources = sources.plus([
          'opensphere-plugin-overpass/src/**',
          'opensphere-plugin-overpass/package.json'
        ])
        // Technically you should generically call npmInstall after installPlugins but this one has no dependencies
        //sh 'mkdir -p node_modules'
        //sh 'ln -s ../../opensphere node_modules/opensphere'
        //npmInstall(true);
      }
    }

    // add gbdx plugin
    dir('opensphere-plugin-gbdx') {
      stage('install gbdx') {
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/opensphere-plugin-gbdx.git')
        sources = sources.plus([
          'opensphere-plugin-gbdx/src/**',
          'opensphere-plugin-gbdx/package.json'
        ])
      }
    }

    // add analyze plugin
    stage('install analyze') {
      dir('opensphere-plugin-analyze') {
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/opensphere-plugin-analyze.git')
      }

      // these two are dependencies for analyze that must be cloned as siblings
      dir('bits-internal') {
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/bits-internal.git')

        sh 'mkdir -p node_modules'
        sh 'ln -fs ../../opensphere node_modules/opensphere'
        sh 'npm link ../closure-util'
        npmInstall(true, false);
      }

      dir('mist') {
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/mist.git')

        sh 'mkdir -p node_modules'
        sh 'ln -fs ../../opensphere node_modules/opensphere'
        sh 'ln -fs ../../bits-internal node_modules/bits-internal'
        sh 'npm link ../closure-util'
        npmInstall(true, false);
      }
    }

    stash name: 'geoint-viewer-source', includes: sources.join(', '), useDefaultExcludes: false

    stage('Build and Scans - SonarQube, Fortify, OWASP Dependecy Checker') {
      // note that the ZAP scan is run post-deploy by the deploy jobs
      parallel (
        "build": {
          dir('opensphere') {
            sh 'npm run build'
            sh 'mv dist/opensphere dist/gv'
          }
        },
        "sonarqube" : {
          if (env.BRANCH_NAME == 'master' && ANALYZE) {
            node {
              dir('scans') {
                sh "rm -rf *"
                unstash 'geoint-viewer-source'
                //sh "pwd && ls -al *"
                sh """#!/bin/bash
                if [[ ! -e pom.xml ]] ; then
                cat > pom.xml <<'EOF'
<project>
<modelVersion>4.0.0</modelVersion>
<groupId>groupId</groupId>
<artifactId>GV</artifactId>
<version>${this_version}</version>
</project>
EOF
ls -lrt
                fi
                """
                withCredentials([string(credentialsId: "${SONAR_CRED}", variable: 'sonar_login')]) {
                  sh """mvn sonar:sonar \\
                    -Dsonar.host.url=${SONAR_URL} \\
                    -Dsonar.login=${sonar_login} \\
                    -Dsonar.projectBaseDir=. \\
                    -Dsonar.projectKey=fade:gv \\
                    -Dsonar.projectName=gv \\
                    -Dsonar.projectVersion=${this_version}\\
                    -Dsonar.sources=.\\
                    -Dsonar.tests=''\\
                    -Dsonar.exclusions=node_modules/**/*\\
                    -Dsonar.test.exclusions=node_modules/**/*\\
                    -Dsonar.sourceEncoding=UTF-8\\
                    """
                }
              }
            }
          }
        },
        "fortify" : {
          if (env.BRANCH_NAME == 'master' && ANALYZE && FORTIFY_ENABLED) {
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
        "depcheck": {
          if (env.BRANCH_NAME == 'master' && ANALYZE) {
            // the jenkins tool installation version takes forever to run because it has to download and set up its database
            node {
              dir('scans') {
                sh 'rm -rf *'
                unstash 'geoint-viewer-source'
                sh '/jslave/dependency-check/dependency-check/bin/dependency-check.sh --project "GV" --scan "./" --format "ALL" --enableExperimental --disableBundleAudit'
                fileExists 'dependency-check-report.xml'
                uploadToThreadfix('dependency-check-report.xml')
              }
            }
          }
        }
      )
    }

    dir('opensphere') {
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
	    installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/gv.config.git')
            sh "./publish.sh '${NEXUS_URL}' ../opensphere/dist"
	  }
	}
      }
    }

    if (env.BRANCH_NAME == 'master') {
      // kick off deploy build
      build job: "${DEPLOY_JOB_NAME}", quietPeriod: 5, wait: false
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

def uploadToThreadfix(file) {
  fileExists file
  withCredentials([string(credentialsId: 'threadfix-full-url', variable: 'THREADFIX_URL')]) {
    sh "/bin/curl -v -H 'Accept: application/json' -X POST --form file=@${file} ${THREADFIX_URL}"
  }
}
