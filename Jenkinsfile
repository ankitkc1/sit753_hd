pipeline {
    agent any

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipDefaultCheckout(true)
    }

    environment {
        APP_NAME = 'portfolio-blog-cms'
        IMAGE_REPO = 'ankitkc1/sit753-portfolio'
        IMAGE_TAG = "${BUILD_NUMBER}"
        AZURE_HOST = '4.216.185.221'
        AZURE_USER = 'azureuser'
        STAGING_PORT = '3501'
        PROD_PORT = '3500'
    }

    stages {
        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
                sh 'git rev-parse --short HEAD'
            }
        }

        stage('Build') {
            steps {
                echo 'Building Docker image and publishing artefact to Docker Hub...'

                sh 'npm ci'

                sh '''
                    docker build -t $IMAGE_REPO:$IMAGE_TAG -t $IMAGE_REPO:latest .
                '''

                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push $IMAGE_REPO:$IMAGE_TAG
                        docker push $IMAGE_REPO:latest
                    '''
                }
            }
        }

        stage('Test') {
            steps {
                echo 'Running Jest automated tests with coverage...'
                sh 'npm test'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true
                }
            }
        }

        stage('Code Quality') {
            steps {
                echo 'Running ESLint and Sonar analysis...'

                sh 'npm run lint'

                withCredentials([string(credentialsId: 'sit753_hd', variable: 'SONAR_TOKEN')]) {
                    sh 'npx sonar-scanner -Dsonar.token=$SONAR_TOKEN'
                }
            }
        }

        stage('Security') {
        steps {
            echo 'Running npm audit and Trivy security scans...'

            sh 'npm audit --audit-level=high > npm-audit-report.txt'

            sh '''
                docker run --rm -v "$PWD:/project" aquasec/trivy fs \
                --severity HIGH,CRITICAL \
                --format table \
                -o /project/trivy-filesystem-report.txt \
                /project
            '''

            sh '''
                docker run --rm \
                -v /var/run/docker.sock:/var/run/docker.sock \
                -v "$PWD:/project" \
                aquasec/trivy image \
                --severity HIGH,CRITICAL \
                --format table \
                -o /project/trivy-image-report.txt \
                $IMAGE_REPO:$IMAGE_TAG
            '''
        }
        post {
            always {
                archiveArtifacts artifacts: 'npm-audit-report.txt,trivy-*.txt', allowEmptyArchive: true
            }
        }
    }

        stage('Deploy to Staging') {
            steps {
                echo 'Deploying application to local staging container.'

                withCredentials([string(credentialsId: 'staging-session-secret', variable: 'SESSION_SECRET')]) {
                    sh '''
                        docker compose -f docker-compose.staging.yml down || true

                        IMAGE_REPO=$IMAGE_REPO IMAGE_TAG=$IMAGE_TAG SESSION_SECRET=$SESSION_SECRET \
                        docker compose -f docker-compose.staging.yml up -d

                        echo "Waiting for staging app health check..."

                        for i in 1 2 3 4 5 6 7 8 9 10; do
                            if docker exec portfolio-app-staging node -e "require('http').get('http://127.0.0.1:3500/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"; then
                                echo "Staging app is healthy."
                                exit 0
                            fi

                            echo "Staging app not ready yet. Attempt $i/10"
                            docker compose -f docker-compose.staging.yml ps
                            docker logs portfolio-app-staging --tail 30 || true
                            sleep 10
                        done

                        echo "Staging health check failed."
                        docker compose -f docker-compose.staging.yml ps
                        docker logs portfolio-app-staging --tail 100 || true
                        exit 1
                    '''
                }
            }
        }

        stage('Release to Azure Production') {
            steps {
                echo 'Releasing same Docker image to Azure VM production environment...'

                withCredentials([
                    string(credentialsId: 'prod-session-secret', variable: 'PROD_SESSION_SECRET')
                ]) {
                    sshagent(credentials: ['azure-ssh-key']) {
                        sh '''
                            ssh -o StrictHostKeyChecking=no $AZURE_USER@$AZURE_HOST "mkdir -p /opt/sit753-portfolio"

                            scp -o StrictHostKeyChecking=no docker-compose.prod.yml prometheus.yml alert.rules.yml \
                            $AZURE_USER@$AZURE_HOST:/opt/sit753-portfolio/

                            ssh -o StrictHostKeyChecking=no $AZURE_USER@$AZURE_HOST "
                                cd /opt/sit753-portfolio &&
                                IMAGE_REPO=$IMAGE_REPO IMAGE_TAG=$IMAGE_TAG SESSION_SECRET=$PROD_SESSION_SECRET \
                                docker compose -f docker-compose.prod.yml pull &&
                                IMAGE_REPO=$IMAGE_REPO IMAGE_TAG=$IMAGE_TAG SESSION_SECRET=$PROD_SESSION_SECRET \
                                docker compose -f docker-compose.prod.yml up -d
                            "
                        '''
                    }
                }
            }
        }

        stage('Monitoring and Alerting') {
            steps {
                echo 'Verifying production health, metrics and Prometheus availability...'

                sh '''
                    sleep 20

                    curl -f http://$AZURE_HOST:$PROD_PORT/health
                    curl -f http://$AZURE_HOST:$PROD_PORT/metrics
                    curl -f http://$AZURE_HOST:9090/-/healthy
                '''
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: All 7 HD stages completed successfully.'
        }

        failure {
            echo 'FAILED: Check the failed Jenkins stage and console output.'
        }

        always {
            archiveArtifacts artifacts: 'npm-audit-report.txt,trivy-*.txt,coverage/**', allowEmptyArchive: true
        }
    }
}