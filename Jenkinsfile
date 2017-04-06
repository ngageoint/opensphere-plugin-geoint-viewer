#!/usr/bin/env groovy

THREADFIX_ID = 58
this_version = '0.0.0' // reset by getVersion(), below

def err = null

node('linux') {
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
        this_version = sh(script: 'git describe HEAD', returnStdout: true).trim()
      } catch (e) {
        this_version = GIT_COMMIT
      }
    }

    // get main opensphere project
    dir('opensphere') {
      stage('install opensphere') {
        try{
          installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/core-ui.git')
          npmInstall()
        } catch (NoSuchMethodError) {
          error 'Error installing extra plugins'
        }
      }
    }

    dir('opensphere-plugin-geoint-viewer') {
      // gotta run npm to run tests and docs
      stage('npm')
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
        // Technically you should generically call npmInstall after installPlugins but this one has no dependencies
        //sh 'mkdir -p node_modules'
        //sh 'ln -s ../../opensphere node_modules/opensphere'
        //npmInstall(true);
      }
    }

    // build it
    dir('opensphere') {
      stage('build')
      sh 'npm run build'
      sh 'mv dist/opensphere dist/gv'

      dir('dist') {
        stash name: 'code', exclude: '.bundle/,.librarian/,modules/,tmp/,vendor/,spec/fixtures', useDefaultExcludes: false
      }

      // Mark the artifact ZAP 'stage'....
      stage('ZAP Scan') {
        def zapHome = tool name: 'ZAProxy_v2_5_0'
        def workspace = pwd()
        for (int i=0; i<10; i++) {
          def http = sh script: "curl -skL -o /dev/null -w \"%{http_code}\" https://oauth.geointservices.io || true", returnStdout: true
          echo "got ${http} response"
          if(http.trim() == '200') {
            break;
          }
          sleep 10
        }
        sh "${zapHome}/zap.sh -cmd -quickout '${workspace}/dist/gv-dev-zapreport.xml' -quickurl https://oauth.geointservices.io/"
        sh "cat dist/gv-dev-zapreport.xml"
        uploadToThreadfix('opensphere/dist/gv-dev-zapreport.xml')
      }

      stage('Static Code Analysis - SonarQube, Fortify, OWASP Dependecy Checker') {
        // ---------------------------------------------
        parallel (
          "sonarqube" : {
            node {
              step([$class: 'WsCleanup', cleanWhenFailure: false, notFailBuild: true])
              unstash 'code'
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
              withCredentials([string(credentialsId: 'sonar-publish-token', variable: 'sonar_login')]) {
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
          },
          "stream 2" : {
            node {
              // ---------------------------------------------
              // Perform Static Security Scans
              step([$class: 'WsCleanup', cleanWhenFailure: false, notFailBuild: true])
              unstash 'code'
              parallel(
                // Fortify
                fortify: {
                  sh 'ls -altr'
                  echo "scanning"
                  // Fortify Scan
                  sh "/opt/hp_fortify_sca/bin/sourceanalyzer -b gv-${this_version} **/*.js"
                  sh "/opt/hp_fortify_sca/bin/sourceanalyzer -b gv-${this_version} -scan -f fortifyResults-${this_version}.fpr"
                  // archive includes: '*.fpr'
                  uploadToThreadfix("fortifyResults-${this_version}.fpr")
                  // Clean up Fortify residue:
                  sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${this_version} -clean"
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
        )
      }

      stage('package')
      dir('dist') {
        sh "zip -q -r gv-${this_version}.zip gv"
        sh "ls -l gv-${this_version}.zip"
      }

      try {
        // newer Jenkins
        archiveArtifacts 'dist/*.zip'
      } catch (NoSuchMethodError e) {
        // older Jenkins
        archive 'dist/*.zip'
      }
    }

    dir('gv.config') {
      stage('package networks')
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
