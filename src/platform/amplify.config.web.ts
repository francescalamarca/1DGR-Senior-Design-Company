import { Amplify } from "aws-amplify";
import { aws_config } from "@/constants/aws-config";

const amplifyWebConfig = {
  Auth: {
    Cognito: {
      userPoolId: aws_config.userPoolId,
      userPoolClientId: aws_config.userPoolClientId,
    },
  },
} as const;

let hasConfiguredAmplify = false;

export function configureAmplify() {
  if (hasConfiguredAmplify) return;
  Amplify.configure(amplifyWebConfig);
  hasConfiguredAmplify = true;
}

export { amplifyWebConfig };

