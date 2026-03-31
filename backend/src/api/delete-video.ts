/**
 * Generates a presigned S3 URL for uploading a company video.
 * Strictly validates MIME types.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME!;

//  Strict whitelist
const allowedMimeTypes: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const companyId = event.requestContext.authorizer?.claims.sub;

  if (!companyId) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized" }),
    };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const clientContentType = queryParams.contentType;

    if (!clientContentType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing contentType" }),
      };
    }

    //  Reject unsupported MIME types
    const extension = allowedMimeTypes[clientContentType];

    if (!extension) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Unsupported file type",
        }),
      };
    }

    const fileId = uuidv4();

    const key = `companies/${companyId}/videos/${fileId}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: clientContentType,
      CacheControl: "max-age=31536000",
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl, key }),
    };
  } catch (error) {
    console.error("S3 ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to generate upload URL",
      }),
    };
  }
};