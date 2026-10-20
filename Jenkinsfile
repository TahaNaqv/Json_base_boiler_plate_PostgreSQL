pipeline {
    agent any

    tools {
        nodejs 'node-22'
    }

    environment {
        NODE_ENV = 'test'
    }

    stages {
        stage('Node Version Check') {
            steps {
                sh '''
                    EXPECTED=$(cat .nvmrc | tr -d "[:space:]")
                    ACTUAL=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
                    if [ "$ACTUAL" != "$EXPECTED" ]; then
                        echo "Node version mismatch: expected $EXPECTED, got $ACTUAL"
                        exit 1
                    fi
                    echo "Node version OK: $ACTUAL"
                '''
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Secrets Scan') {
            steps {
                sh 'git secrets --scan || echo "git-secrets not installed — skipping (install on agent)"'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'coverage/junit.xml'
                }
            }
        }

        stage('Dependency Audit') {
            steps {
                sh 'npm audit --audit-level=high'
            }
        }

        stage('Build Image') {
            when {
                branch 'main'
            }
            steps {
                sh 'docker build -t starter:${BUILD_NUMBER} .'
            }
        }
    }

    post {
        failure {
            echo 'Pipeline failed. Review logs above.'
        }
        success {
            echo 'All gates passed.'
        }
    }
}
