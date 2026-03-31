import { aws_config } from "@/constants/aws-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Amplify } from "aws-amplify";
import { cognitoUserPoolsTokenProvider } from "aws-amplify/auth/cognito";

const amplifyNativeConfig = {
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

  Amplify.configure(amplifyNativeConfig);

  
  cognitoUserPoolsTokenProvider.setKeyValueStorage(AsyncStorage);

  hasConfiguredAmplify = true;
}

export { amplifyNativeConfig };
