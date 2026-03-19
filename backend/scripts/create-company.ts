import {
    CognitoIdentityProvider,
    ListUserPoolsCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import readline from "readline";

const cognito = new CognitoIdentityProvider({
  region: "us-east-2",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const createUser = async () => {
  const username = await askQuestion("Enter username: ");
  const password = await askQuestion("Enter password: ");
  const email = await askQuestion("Enter email: ");
  const phoneNumber = await askQuestion("Enter phone number: ");
  const fullName = await askQuestion("Enter full name: ");

  const poolId = (
    await cognito.send(
      new ListUserPoolsCommand({ NextToken: undefined, MaxResults: 1 }),
    )
  ).UserPools?.[0].Id!;
  const clientId = (
    await cognito.listUserPoolClients({ UserPoolId: poolId, MaxResults: 1 })
  ).UserPoolClients?.[0].ClientId!;

  try {
    const userAttributes = [
      { Name: "email", Value: email },
      { Name: "phone_number", Value: phoneNumber },
      { Name: "custom:full_name", Value: fullName },
    ];

    await cognito.signUp({
      ClientId: clientId,
      Username: username,
      Password: password,
      UserAttributes: userAttributes,
    });

    console.log("User signed up successfully.");

    await cognito.confirmSignUp({
      ClientId: clientId,
      Username: username,
      ConfirmationCode: await askQuestion(
        "Enter confirmation code sent to email: ",
      ),
    });

    console.log("User confirmed successfully.");
  } catch (error) {
    console.error("Error during sign-up or confirmation:", error);
  }
};

const authenticateUser = async () => {
  const username = await askQuestion("Enter username: ");
  const password = await askQuestion("Enter password: ");

  const poolId = (
    await cognito.send(
      new ListUserPoolsCommand({ NextToken: undefined, MaxResults: 1 }),
    )
  ).UserPools?.[0].Id!;
  const clientId = (
    await cognito.listUserPoolClients({ UserPoolId: poolId, MaxResults: 1 })
  ).UserPoolClients?.[0].ClientId!;

  try {
    const authResult = await cognito.initiateAuth({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    });

    console.log(
      "Authentication successful. ID Token:",
      authResult.AuthenticationResult?.IdToken,
    );
  } catch (error) {
    console.error("Error authenticating company:", error);
  }
};

const main = async () => {
  const action = await askQuestion(
    "Do you want to create a company account or authenticate? (create/authenticate): ",
  );

  if (action === "create") {
    await createUser();
    await authenticateUser();
  } else if (action === "authenticate") {
    await authenticateUser();
  } else {
    console.log("Invalid action.");
  }

  rl.close();
};

main().catch((error) => console.error("Error in main:", error));
