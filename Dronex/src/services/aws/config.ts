export const AWS_CONFIG = {
  region: process.env.REACT_APP_AWS_REGION || 'us-east-1',
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY!,
  bucketName: process.env.REACT_APP_AWS_S3_BUCKET!,
  roleArn: process.env.REACT_APP_AWS_REKOGNITION_ROLE_ARN!,
  snsTopicArn: process.env.REACT_APP_AWS_SNS_TOPIC_ARN!,
};
