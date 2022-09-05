import {
  AWSConfig as globalAWSConfig,
  S3Client as globalS3Client,
  SecretsManagerClient as globalSecretsManagerClient,
  KMSClient as globalKMSClient,
} from '../lib/aws/0.5.0/aws.js'
import { AWSConfig as s3AWSConfig, S3Client as s3S3Client } from '../lib/aws/0.5.0/s3.js'
import {
  AWSConfig as smAWSConfig,
  SecretsManagerClient as smSecretsManagerClient,
} from '../lib/aws/0.5.0/secrets-manager.js'
import { AWSConfig as kmsAWSConfig, KMSClient as kmsKMSClient } from '../lib/aws/0.5.0/kms.js'

function testAWS() {
  // We can't really test the underlying AWS implementation
  // here without proper access to AWS itself. So let's just
  // verify that everything is properly imported, and that
  // the expected public symbols exist.
  let awsConfig = new globalAWSConfig({
    region: 'us-east-1',
    accessKeyId: 'aws_access_key_id',
    secretAccessKey: 'aws_secret_access_key',
  })
  let s3 = new globalS3Client(awsConfig)
  let secretsManager = new globalSecretsManagerClient(awsConfig)
  let kms = new globalKMSClient(awsConfig)

  // Here we test that the s3.js exposed API corresponds
  // to our expectations.
  awsConfig = new s3AWSConfig({
    region: 'us-east-1',
    accessKeyId: 'aws_access_key_id',
    secretAccessKey: 'aws_secret_access_key',
  })
  s3 = new s3S3Client(awsConfig)

  // Here we test that the secrets-manager.js exposed API corresponds
  // to our expectations.
  awsConfig = new smAWSConfig({
    region: 'us-east-1',
    accessKeyId: 'aws_access_key_id',
    secretAccessKey: 'aws_secret_access_key',
  })
  secretsManager = new smSecretsManagerClient(awsConfig)

  // Here we test that the secrets-manager.js exposed API corresponds
  // to our expectations.
  awsConfig = new kmsAWSConfig({
    region: 'us-east-1',
    accessKeyId: 'aws_access_key_id',
    secretAccessKey: 'aws_secret_access_key',
  })
  kms = new kmsKMSClient(awsConfig)
}

export { testAWS }
