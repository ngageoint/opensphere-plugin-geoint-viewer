#!/usr/bin/env groovy

ANALYZE = true
THREADFIX_ID = 58
FORTIFY_ENABLED = false
this_version = '0.0.0' // reset below

def err = null

node('sl62') {
  try {
    dir('opensphere-plugin-geoint-viewer') {
      stage('scm')
      try {
        beforeCheckout()
      } catch (NoSuchMethodError e) {
      }

      sh "echo 'checking out scm'"

      // don't do this on first run
      sh 'if [ -d ".git" ]; then git clean -ffdx; fi'
      checkout scm

      sh "echo 'after checkout'"
      try {
        // eh... no?
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

    def sources = []

    // get main opensphere project
    dir('opensphere') {
      stage('install opensphere') {
        try{
          installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/core-ui.git')
          sources = sources.plus([
            'opensphere/src',
            'opensphere/package.json'
          ])
          npmInstall()
        } catch (NoSuchMethodError) {
          error 'Error installing extra plugins'
        }
      }
    }

    dir('opensphere-plugin-geoint-viewer') {
      // gotta run npm to run tests and docs
      stage('npm')
      sources = sources.plus([
        'opensphere-plugin-geoint-viewer/src',
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

    // Add Planet Labs plugin
    dir('opensphere-plugin-planetlabs') {
      stage('install planetlabs') {
        installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/gv-plugin-planetlabs.git')
        sources = sources.plus([
          'opensphere-plugin-planetlabs/src',
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
        installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/gv-plugin-overpass.git')
        sources = sources.plus([
          'opensphere-plugin-overpass/src',
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
        installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/opensphere-plugin-gbdx.git')
        sources = sources.plus([
          'opensphere-plugin-gbdx/src',
          'opensphere-plugin-gbdx/package.json'
        ])
      }
    }

    stash name: 'geoint-viewer-source', include: sources.join(', '), useDefaultExcludes: false

    // build it
    dir('opensphere') {
      stage('build')
      sh 'npm run build'
      sh 'mv dist/opensphere dist/gv'

      // Mark the artifact ZAP 'stage'....
      stage('ZAP Scan') {
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
        sh "${zapHome}/zap.sh -cmd -quickout '${dir}/dist/gv-dev-zapreport.xml' -quickurl https://oauth.geointservices.io/"
        sh "cat dist/gv-dev-zapreport.xml"
        uploadToThreadfix('dist/gv-dev-zapreport.xml')
      }
    }

    stage('Static Code Analysis - SonarQube, Fortify, OWASP Dependecy Checker') {
      if (env.BRANCH_NAME == 'master' && ANALYZE) {
        // ---------------------------------------------
        parallel (
          "sonarqube" : {
            node {
              dir('scans') {
                step([$class: 'WsCleanup', cleanWhenFailure: false, notFailBuild: true])
                unstash 'geoint-viewer-source'
                sh "pwd && ls -al *"
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
  //              sh 'ls -altr'
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
          },
          "stream 2" : {
            node('sl62') {
              // ---------------------------------------------
              // Perform Static Security Scans
              step([$class: 'WsCleanup', cleanWhenFailure: false, notFailBuild: true])
              unstash 'geoint-viewer-source'
              dir('scans') {
                parallel(
                  // Fortify
                  fortify: {
                    if (FORTIFY_ENABLED) {
                      sh 'ls -altr'
                      echo "scanning"
                      // Fortify Scan
                      // Clean up Fortify residue:
                      sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} -clean"
                      sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} '.'"
                      sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} -scan -f fortifyResults-${this_version}.fpr"
                      // archive includes: '*.fpr'
                      uploadToThreadfix("fortifyResults-${this_version}.fpr")
                      // Clean up Fortify residue:
                      sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${env.JOB_NAME} -clean"
                    } else {
                      echo 'Fortify is disabled'
                    }
                  },
                  // OWASP Dependency Check
                  depcheck: {
                    echo "dependency-check"
                    // Dependency-Check Scan
                    sh "pwd && ls -al"
                    sh '/jslave/dependency-check/dependency-check/bin/dependency-check.sh --project "GV" --scan "./" --format "ALL" --enableExperimental --disableBundleAudit'
                    fileExists 'dependency-check-report.xml'
                    uploadToThreadfix('dependency-check-report.xml')
                  }
                )
              }
            }
          }
        )
      }
    }

    dir('opensphere') {
      stage('package') {
        dir('dist') {
          sh "zip -q -r gv-${this_version}.zip gv"
          sh "ls -l gv-${this_version}.zip"
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

    dir('gv.config') {
      stage('package networks') {
        if (env.BRANCH_NAME == 'master') {
          installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/gv.config.git')
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
