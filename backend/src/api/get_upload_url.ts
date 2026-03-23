/**
 * Generates a presigned S3 URL for uploading a video or image file,
 * assigning a unique key per user and handling basic metadata.
 * 
 * THIS IS UNCHANGED FROM THE USER SIDE
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from 'uuid';

// Initialize S3 client
const s3 = new S3Client({}); 
const BUCKET_NAME = process.env.BUCKET_NAME!;

// Map MIME types to file extensions
const extensions: Record<string, string> = {
    'video/quicktime': 'mov',
    'video/mp4': 'mp4',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    // Authenticated user ID
    const userId = event.requestContext.authorizer?.claims.sub;
    
    if (!userId) {
        return {
            statusCode: 401,
            headers: { "Access-Control-Allow-Origin": "*" }, 
            body: JSON.stringify({ message: "Unauthorized" }),
        };
    }

    try {
        // Get content type from query params (default to mp4)
        const queryParams = event.queryStringParameters || {};
        const clientContentType = queryParams.contentType || 'video/mp4';

        const extension = extensions[clientContentType] || 'bin';
        // Generate unique S3 key
        const fileId = uuidv4();
        const key = `${userId}/${fileId}.${extension}`;

        // Prepare PutObjectCommand with metadata
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: clientContentType,
            // Metadata fields for better iOS compatibility
            Metadata: {
                'original-content-type': clientContentType
            },
            // Set cache control for streaming
            CacheControl: 'max-age=31536000',
        });
        // Generate presigned URL valid for 5 minutes
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
        // Return URL and key to client
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" }, 
            body: JSON.stringify({ uploadUrl, key }),
        }

    } catch (error) {
        console.error("S3 ERROR:", error);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" }, 
            body: JSON.stringify({ error: 'Failed to generate upload URL' }),
        };
    }
}