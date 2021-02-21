pipeline {
    agent { 
        label 'develop'
    }
    
    environment {
        CI = 'true'
    }

    stages {
        // deliver for development (branch name: develop)
        stage('Deliver for development') {
            when {
                branch 'develop'
            }

            steps {
                sh ' chmod 777 ./jenkins/scripts/deliver-for-development.sh'
                sh './jenkins/scripts/deliver-for-development.sh'
                // sh 'newman run https://www.getpostman.com/collections/001a23d047dedc9f5e19'
            }
        }
    }
}
