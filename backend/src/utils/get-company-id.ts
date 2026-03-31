import { APIGatewayProxyEvent } from "aws-lambda";

export function getCompanyId(
  event: APIGatewayProxyEvent
): string | undefined {
  return (
    event.requestContext.authorizer?.claims.sub ||
    process.env.DEV_COMPANY_ID
  );
}