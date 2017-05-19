#!/usr/bin/env groovy

ANALYZE = false
THREADFIX_ID = 58
FORTIFY_ENABLED = true
this_version = '0.0.0' // reset below

def err = null

node('sl61') {
  def originalHome = sh(script: 'echo $HOME', returnStdout: true);
  echo "original home is ${originalHome}"

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

    // get main opensphere project
    // do to some errors in some previous checkouts, this needs to be there until it runs on all the slaves
    sh 'rm -rf opensphere'
    dir('opensphere') {
      stage('install opensphere') {
        sh 'if [ -d ".git" ]; then git clean -ffdx; fi'
        sh 'echo $PATH'
        installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/core-ui.git')
        npmInstall()
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

    stash name: 'geoint-viewer-source', includes: sources.join(', '), useDefaultExcludes: false

    stage('Build and Scans - ZAP, SonarQube, Fortify, OWASP Dependecy Checker') {
      parallel (
        "build": {
          dir('opensphere') {
            sh 'npm run build'
            sh 'mv dist/opensphere dist/gv'
          }
        },
        "zap": {
          if (env.BRANCH_NAME == 'master' && ANALYZE) {
            node {
              dir('scans') {
                // Mark the artifact ZAP 'stage'....
                def zapHome = tool name: 'ZAProxy_v2_5_0'
                def dir = pwd()
                for (int i=0; i<10; i++) {
                  def http = sh script: "curl -skL -o /dev/null -w \"%{http_code}\" https://oauth.geointservices.io || true", returnStdout: true
                  echo "got ${http} response"
                  if(http.trim() == '200') {
                    break;
                  }
                  sleep 10
                }
                sh "${zapHome}/zap.sh -cmd -quickout '${dir}/gv-dev-zapreport.xml' -quickurl https://oauth.geointservices.io/"
                sh "cat gv-dev-zapreport.xml"
                uploadToThreadfix('gv-dev-zapreport.xml')
              }
            }
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
                withCredentials([string(credentialsId: 'sonar-push', variable: 'sonar_login')]) {
                  sh """mvn sonar:sonar \\
                    -Dsonar.host.url=https://sonar.geointservices.io \\
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
            node('sl62') {
              // ---------------------------------------------
              // Perform Static Security Scans
              dir('scans') {
                sh "rm -rf *"
                unstash 'geoint-viewer-source'
                // Fortify Scan
                // Clean up Fortify residue:
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} -clean"
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} '.'"
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} -scan -f fortifyResults-${this_version}.fpr"
                // archive includes: '*.fpr'
                uploadToThreadfix("fortifyResults-${this_version}.fpr")
                // Clean up Fortify residue:
                sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} -clean"
              }
            }
          }
        },
        "depcheck": {
          if (env.BRANCH_NAME == 'master' && ANALYZE) {
            // the jenkins tool installation version takes forever to run because it has to download and set up its database
            node('sl62') {
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
    sh 'cat ${originalHome}/.m2/settings.xml > .m2/settings.xml'

    withEnv(["HOME=${pwd()}", "_JAVA_OPTIONS=-Duser.home=${pwd()}"]) {
      dir('gv.config') {
	stage('package networks') {
	  if (env.BRANCH_NAME == 'master') {
	    installPlugins('master', 'git@gitlab.devops.geointservices.io:uncanny-cougar/gv.config.git')
	    sh './package.sh ../opensphere/dist/gv-*.zip'

	    try {
	      // newer Jenkins
	      archiveArtifacts 'dist/*.zip'
	    } catch (NoSuchMethodError e) {
	      // older Jenkins
	      archive 'dist/*.zip'
	    }

	    stage('publish')
	    sh './publish.sh'
	  }
	}
      }
    }

    if (env.BRANCH_NAME == 'master') {
      // kick off deploy build
      build job: "GEOINTServices-BITS/gvweb-io-pcf/Deploy to Test", quietPeriod: 5, wait: false
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
  if(THREADFIX_ID == null) {
    throw new Exception("THREADFIX_ID not set. Cannot upload ${file} to threadfix server")
  }
  withCredentials([string(credentialsId: 'threadfix-api-key-2', variable: 'THREADFIX_KEY')]) {
    sh "/bin/curl -v --insecure -H 'Accept: application/json' -X POST --form file=@${file} https://threadfix.devops.geointservices.io/rest/applications/${THREADFIX_ID}/upload?apiKey=${THREADFIX_KEY}"
  }
}
