#!/usr/bin/env groovy

this_version = '0.0.0' // reset below
def err = null

node('Linux&&!gpu') {
  def originalHome = sh(script: 'echo $HOME', returnStdout: true).trim();

  def osProjects = [
    'opensphere-plugin-geoint-viewer',
    'opensphere-plugin-overpass',
    'opensphere-plugin-analyze'
  ]

  try {
    this_deploy = 'dev'
    if (env.BRANCH_NAME == 'master') {
      this_deploy = 'prod'
    }
    initEnvironment(this_deploy)
    initGV()

    try {
      beforeCheckout()
    } catch (NoSuchMethodError e) {
    }

    stage('scm') {
      installPlugins('opensphere-yarn-workspace')

      dir('workspace') {
        sh 'rm -rf *'
        dir('opensphere-plugin-geoint-viewer') {
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
          'closure-util',
          'opensphere',
          'opensphere-nga-brand',
          'bits-internal',
          'mist'
        ] + osProjects

        for (def project in projects) {
          dir(project) {
            installPlugins(project)
            useNpmJsVersions()
          }
        }
      }

      def osSources = []
      for (def project in osProjects) {
        osSources << "workspace/${project}/src/**"
        osSources << "workspace/${project}/package.json"
        osSources << "workspace/${project}/package-lock.json"
      }

      stash name: 'geoint-viewer-source', includes: osSources.join(', '), useDefaultExcludes: false
    }

    stage('yarn') {
      // env variables are strings, so need to compare to string 'true'
      if (env.USE_DOCKER_FOR_NODE == 'true') {
        sh 'rm -rf node_modules/opensphere/node_modules/closure-util || true'
        sh '''rm -rf dockertmp
        mkdir dockertmp
        cp workspace/opensphere-plugin-geoint-viewer/Dockerfile_build dockertmp/Dockerfile
        pushd dockertmp
        cp /etc/pki/tls/cert.pem ./cacerts.pem
        docker build -t gv_build .
        popd
        '''
        sh "docker run --rm -i --user \$(id -u):\$(id -g) -v ${env.WORKSPACE}:/build gv_build yarn config list"
        sh 'rm yarn.lock || true'
        sh "docker run --rm -i --user \$(id -u):\$(id -g) -v ${env.WORKSPACE}:/build gv_build yarn install"
      }
      else {
        sh 'npm i -g yarn'
        sh 'yarn config list'
        sh 'rm yarn.lock || true'
        sh "yarn install"
      }
    }

    stage('Build and Scans - SonarQube, Fortify, OWASP Dependency Checker') {
      // note that the ZAP scan is run post-deploy by the deploy jobs
      parallel (
        "build": {
          // env variables are strings, so need to compare to string 'true'
          if (env.USE_DOCKER_FOR_NODE == 'true') {
            sh "docker run --rm -i --user \$(id -u):\$(id -g) -v ${env.WORKSPACE}:/build -w /build/workspace/opensphere gv_build yarn run build"
            sh 'docker rmi gv_build'
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
//                    -Dsonar.projectKey=fade:opensphere \\
//                    -Dsonar.projectName=opensphere \\
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
        "depcheck": {
          if (env.BRANCH_NAME == 'master') {
            // the jenkins tool installation version takes forever to run because it has to download and set up its database
            node {
              dir('scans') {
                sh 'rm -rf *'
                unstash 'geoint-viewer-source'

                for (def project in osProjects) {
                  dir("workspace/${project}") {
                    sh 'npm i'
                  }
                }

                def depCheckHome = tool('owasp_dependency_check')
                withEnv(["PATH+OWASP=${depCheckHome}/bin"]){
                  sh 'dependency-check.sh --project "GV" --scan "./" --format "ALL" --enableExperimental --disableBundleAudit'
                }
                fileExists 'dependency-check-report.xml'
                uploadToThreadfix('dependency-check-report.xml')
              }
            }
          }
        }
      )
    }

    dir('workspace/opensphere') {
      stage('package') {
        dir('dist') {
          sh "zip -q -r opensphere-${this_version}.zip opensphere"
        }

        try {
          // newer Jenkins
          archiveArtifacts 'dist/*.zip'
          archiveArtifacts '.build/opensphere.min.map'
        } catch (NoSuchMethodError e) {
          // older Jenkins
          archive 'dist/*.zip'
          archive '.build/opensphere.min.map'
        }
      }
    }

    sh 'mkdir -p .m2'
    sh "cat ${originalHome}/.m2/settings.xml > .m2/settings.xml"

    withEnv(["HOME=${pwd()}", "_JAVA_OPTIONS=-Duser.home=${pwd()}"]) {
      dir('gv.config') {
        stage('publish') {
          if (!(env.JOB_NAME =~ /meatballgrinder/)) {
            installPlugins('gv.config')
            sh "./publish.sh '${env.NEXUS_URL}/content/repositories/${env.NEXUS_SNAPSHOTS}' ../workspace/opensphere/dist/opensphere-${this_version}.zip ${this_version}"
          }
        }
      }
    }

    if (env.BRANCH_NAME == 'master' && !(env.JOB_NAME =~ /meatballgrinder/)) {
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
