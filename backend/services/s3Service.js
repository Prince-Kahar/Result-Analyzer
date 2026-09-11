import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) return null;

  const config = {
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'auto'
  };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }

  if (process.env.AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT) {
    config.endpoint = process.env.AWS_ENDPOINT_URL || process.env.AWS_ENDPOINT;
  }

  try {
    s3Client = new S3Client(config);
    return s3Client;
  } catch (err) {
    console.warn('S3 client initialization warning:', err.message);
    return null;
  }
}

export async function uploadFileToS3(filePath, originalFilename) {
  const bucket = process.env.AWS_S3_BUCKET;
  const client = getS3Client();

  if (!bucket || !client) {
    return null;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const key = `uploads/${Date.now()}-${path.basename(originalFilename)}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: 'application/pdf'
    });

    await client.send(command);
    console.log(`☁️ Successfully archived ${originalFilename} to S3 bucket ${bucket}/${key}`);
    return { bucket, key };
  } catch (err) {
    console.warn('⚠️ S3 upload notice (non-fatal):', err.message);
    return null;
  }
}
