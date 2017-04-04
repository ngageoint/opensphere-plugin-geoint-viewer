#!/usr/bin/env groovy

THREADFIX_ID = 58
PCF_ORG = 'fade'
PCF_SPACE = 'keystone-dev'
PCF_APP = 'gv-test'
jq_tool = 'jq1_5'
this_version = '0.0.0' // reset by getVersion(), below

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

    def commitid = sh returnStdout: true, script: 'git rev-parse --short HEAD'
    GIT_COMMIT = commitid.trim()
    stash name: 'code', exclude: '.bundle/,.librarian/,modules/,tmp/,vendor/,spec/fixtures', useDefaultExcludes: false
    sh "pwd"
    sh "ls -al"
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
    sh "pwd"
    sh "ls -al"
  }

  dir('opensphere-plugin-geoint-viewer') {
    // gotta run npm to run tests
    stage('npm')
    sh 'mkdir -p node_modules'
    sh 'ln -s ../../opensphere node_modules/opensphere'
    npmInstall()

    // run tests
    stage('unit test')
    try {
      test()
    } catch (NoSuchMethodError) {
    }

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
    stage('install plugins') {
      try{
        installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/gv-plugin-planetlabs.git')
        sh 'mkdir -p node_modules'
        sh 'ln -s ../../opensphere node_modules/opensphere'
        npmInstall(true)
      } catch (NoSuchMethodError){
        error 'Error installing extra plugins'
      }
    }
    sh "pwd"
    sh "ls -al"
  }

  // Add Overpass plugin
  dir('opensphere-plugin-overpass') {
    stage('install plugins') {
      try{
        installPlugins('master', 'https://gitlab.devops.geointservices.io/uncanny-cougar/gv-plugin-overpass.git')
        sh 'mkdir -p node_modules'
        sh 'ln -s ../../opensphere node_modules/opensphere'
        npmInstall(true);
      } catch (NoSuchMethodError) {
        error 'Error installing extra plugins'
      }
    }
    sh "pwd"
    sh "ls -al"
  }

  // build it
  dir('opensphere') {
    stage('build')
    sh 'npm run build'
    sh 'mv dist/opensphere dist/gv'

    /*
    stage('e2e test')
    try {
      def url = deployTest()
    } catch (NoSuchMethodError e) {
      error 'Please define "deployTest()" through a shared pipeline library for this network"
    }
    */

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
      sh "${zapHome}/zap.sh -cmd -quickout '${workspace}/gv-dev-zapreport.xml' -quickurl https://oauth.geointservices.io/"
      sh "cat gv-dev-zapreport.xml"
      uploadToThreadfix('gv-dev-zapreport.xml')
    }

    stage('Static Code Analysis - SonarQube, Fortify, OWASP Dependecy Checker') {
      // ---------------------------------------------
      parallel (
        "sonarqube" : {
          node {
            step([$class: 'WsCleanup', cleanWhenFailure: false, notFailBuild: true])
            unstash 'code'
            def jq_path = tool(jq_tool)
            withEnv(["PATH+=${jq_path}"]) {
              this_version = getVersion()
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
              withCredentials([string(credentialsId: 'sonar-token-42', variable: 'sonar_login')]) {
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
          node {
            // ---------------------------------------------
            // Perform Static Security Scans
            step([$class: 'WsCleanup', cleanWhenFailure: false, notFailBuild: true])
            unstash 'code'
            parallel(
              // Fortify
              fortify: {
                def jq_path = tool(jq_tool)
                withEnv(["PATH+=${jq_path}"]) {
                  this_version = getVersion()
                  sh 'ls -altr'
                  echo "scanning"
                  // Fortify Scan
                  sh "/opt/hp_fortify_sca/bin/sourceanalyzer -b gv-${this_version} **/*.js"
                  sh "/opt/hp_fortify_sca/bin/sourceanalyzer -b gv-${this_version} -scan -f fortifyResults-${this_version}.fpr"
                  // archive includes: '*.fpr'
                  uploadToThreadfix("fortifyResults-${this_version}.fpr")
                  // Clean up Fortify residue:
                  sh "/opt/hp_fortify_sca/bin/sourceanalyzer -64 -b ${this_version} -clean"
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
      )
    }

    try {
      // newer
      archiveArtifacts 'dist/*.zip'
    } catch (NoSuchMethodError e) {
      // older
      archive 'dist/*.zip'
    }

    stage('package')
    def jq_path = tool(jq_tool)
    withEnv(["PATH+=${jq_path}"]) {
      this_version = getVersion()
      dir('dist') {
        echo "copying nginx.conf.io to nginx.io"
        sh "echo thisdir"
        sh "ls -al"
        sh "echo updir"
        sh "ls -al ../"
        sh 'cp ../nginx.conf.ucprod gv/nginx.conf'
        sh "zip -q -r ../gv-dist-${this_version}.zip gv"
        sh "ls -l ../gv-dist-${this_version}.zip"
      }
    }

    stage('deploy')
    try {
      deploy('gv')
    } catch (NoSuchMethodError e) {
      error 'Please define "deploy" through a shared pipeline library for this network'
    }

    stage('publish')
    withEnv(["PATH+=${jq_path}"]) {
      this_version = getVersion()
      def fileName = "gv-dist-${this_version}.zip"
      echo "fileName is ${fileName}"
      multibranch = true
      try {
          echo "BRANCH_NAME = ${BRANCH_NAME}"
      } catch(e) {
          echo "Caught {${e}}."
          BRANCH_NAME = 'master'
          multibranch = false
      }
      echo "BRANCH_NAME = ${BRANCH_NAME}"
      if (env.BRANCH_NAME == 'release') {
        try {
          // Push files to Nexus
          sh "pwd"
          withEnv(["fileName=${fileName}", "version=${this_version}"]) {
            sh '''echo Sending build artifacts to nexus
             nexusUrl="http://nexus.devops.geointservices.io" ;
             repoUrl="content/repositories/DevOps";

             mvn -q deploy:deploy-file \\
                 -Dfile="$fileName" \\
                 -DrepositoryId=nexus \\
                 -Durl="$nexusUrl/$repoUrl" \\
                 -DgroupId=gv \\
                 -DartifactId=gv-gv-uc-dev \\
                 -Dversion="$version" \\
                 -DgeneratePom=true \\
                 -Dpackaging=zip'''
           }
        } catch (NoSuchMethodError e) {
          error 'Please define "npmPublish" through a shared pipeline library for this network'
        }
      }
    }
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

def do_cf_push() {
  ws() {
    deleteDir()
    unstash 'code'
    // sh '''cat /dev/urandom | tr -cd 'a-f0-9' | head -c 128 '''
    // sh '''cat /dev/urandom | env LC_CTYPE=C tr -cd 'a-f0-9' | head -c 128 '''
    sh '''#!/bin/bash
    # set -x
    x=$(cat /dev/urandom | env LC_CTYPE=C tr -cd 'a-f0-9' | head -c 128 )
    echo -n $x | wc | egrep ' 128$' || exit 1
    echo "COOKIE_SECRET=$x" > .env
    # wc .env
    # wc .env | egrep ' 143 \\.env'
    wc .env | egrep ' 143 \\.env$' || exit 1
    # cat .env
    '''
    sh """#!/bin/bash
      if [[ -e manifest.yml ]] ; then
        cat > manifest.yml <<'EOF'
---
applications:
- name: ${PCF_APP}
  memory: 1024MB
  disk_quota: 1024MB
  host: lpt
  domain: dev.geointservices.io
  command: node keystone.js
  buildpack: nodejs_buildpack
  env:
    FORCE_HTTPS: true
  services:
    - landing-mongo
EOF
      fi ;
    """

    //when calling `cf login`, the CF_HOME variable tells where to put the config.json that is generated
    // you DONT want this in ~jslave! anyone else could then login to PCF as you!
    withEnv(["CF_HOME=${pwd()}"]) {
      withCredentials([[$class: 'UsernamePasswordMultiBinding', credentialsId: 'pcf-user-1', passwordVariable: 'PCF_PASS', usernameVariable: 'PCF_USER'],
      ]) {
        sh "cf login -a ${DEV_PCF} -u ${PCF_USER} -p ${PCF_PASS} -o ${PCF_ORG} -s ${PCF_SPACE}"
        sh 'cat manifest.yml'
        sh "cf delete -f ${PCF_APP}"
        CF_TRACE = false
        if ( DEBUG > 2 ) {
          CF_TRACE = true
        }
        echo "CF_TRACE ${CF_TRACE}"
        echo ""
        sh "CF_TRACE=${CF_TRACE} cf push -f manifest.yml"
        sleep 10 //wait for app to actually be ready
      }

    }
  }
}

def getVersion() {
  return sh(script: '''cat package.json | jq -r '.version' ''', returnStdout: true).trim()
}

def do_nsp() {
          // Node Security Platform Scan (Commented out in .io)
          //sh "npm install nsp --local"
          //sh "npm install --local nsp nsp-formatter-checkstyle"
          //sh "node_modules/nsp/bin/nsp check --output checkstyle 2>&1 | tee -i ./nsp-checkstyle-${env.BUILD_NUMBER}.xml"
          //uploadToThreadfix("nsp-checkstyle-${env.BUILD_NUMBER}.xml")
}
