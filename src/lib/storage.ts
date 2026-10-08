import { S3Client } from '@aws-sdk/client-s3';

const required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const;
export function getStorage() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Configure object storage: ${missing.join(', ')}`);
  return {
    bucket: process.env.S3_BUCKET!,
    client: new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! },
    }),
  };
}
