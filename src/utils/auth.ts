/**
 * Cognito Auth Utilities
 *
 * Centralizes Amazon Cognito authentication helpers for the app.
 * This module wraps `amazon-cognito-identity-js` APIs into Promise-based functions
 * used by the UI and session/profile bootstrapping flows.
 *
 * Responsibilities:
 * - Sign in / sign up / sign out
 * - Retrieve the current stored session token (ID token)
 * - Trigger + confirm password reset (email/username and custom phone endpoint)
 *
 * Non-goals:
 * - Persisting tokens in app state (handled by SessionProvider / screens)
 * - Backend profile fetching (handled by profile.store / refreshProfile)
 */

import { CognitoUser, AuthenticationDetails, CognitoUserPool, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { aws_config } from '../../constants/aws-config';

/**
 * Cognito User Pool instance used by all auth operations.
 * Reads UserPoolId + ClientId from aws_config.
 */
const userPool = new CognitoUserPool({
    UserPoolId: aws_config.userPoolId!,
    ClientId: aws_config.userPoolClientId!,
});



/**
 * Standardized return shape for auth operations so screens can handle results consistently.
 */
export interface AuthResult {
    success: boolean;
    accessToken?: string;
    idToken?: string;
    refreshToken?: string;
    error?: string;
}

/**
 * Standardized return shape for sign-up flow.
 */
export interface SignUpResult {
    success: boolean;
    userConfirmed?: boolean;
    userSub?: string;
    error?: string;
}

/**
 * Signs in a user using USER_PASSWORD_AUTH and returns Cognito tokens on success.
 * UI typically stores accessToken/idToken in session state and uses them for API calls.
 */
export function signIn(email: string, password: string): Promise<AuthResult> {
    return new Promise((resolve) => {
        const authenticationDetails = new AuthenticationDetails({
            Username: email,
            Password: password,
        });

        const cognitoUser = new CognitoUser({
            Username: email,
            Pool: userPool,
        });
    // Forces password-based auth flow (avoids SRP flow differences).
        cognitoUser.setAuthenticationFlowType('USER_PASSWORD_AUTH');

        cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: (result) => {
                resolve({
                    success: true,
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken(),
                });
            },
            onFailure: (err) => {
                resolve({
                    success: false,
                    error: err.message || 'Authentication failed',
                });
            },
        });
    });
}

/**
 * Signs out the currently stored Cognito user (if present).
 * Clears Cognito's local session; app state clearing is handled elsewhere.
 */
export function signOut(): Promise<void> {
    return new Promise((resolve) => {
        const cognitoUser = userPool.getCurrentUser();
        if (cognitoUser) {
            cognitoUser.signOut();
        }
        resolve();
    });
}

/**
 * Creates a new Cognito user.
 * - Required attributes: email, phone_number
 * - Optional: customAttributes mapped to Cognito custom:* attributes
 * - Optional: validationData passed through to Cognito signUp validation list
 */
export function signUp(
    username: string,
    password: string,
    email: string,
    phoneNumber: string,
    customAttributes?: { [key: string]: string },
    validationData?: { [key: string]: string }
): Promise<SignUpResult> {
    return new Promise((resolve) => {
        const attributeList: CognitoUserAttribute[] = [
            new CognitoUserAttribute({ Name: 'email', Value: email }),
            new CognitoUserAttribute({ Name: 'phone_number', Value: phoneNumber }),
        ];

    // Adds Cognito custom attributes (custom:myKey) when provided.
        if (customAttributes) {
            Object.entries(customAttributes).forEach(([key, value]) => {
                attributeList.push(
                    new CognitoUserAttribute({ Name: `custom:${key}`, Value: value })
                );
            });
        }
    // Optional validation data (rarely used; depends on Cognito triggers / setup).
        const validationList: CognitoUserAttribute[] = [];
        if (validationData) {
            Object.entries(validationData).forEach(([key, value]) => {
                validationList.push(
                    new CognitoUserAttribute({ Name: key, Value: value })
                );
            });
        }

        userPool.signUp(username, password, attributeList, validationList, (err, result) => {
            if (err) {
                resolve({
                    success: false,
                    error: err.message || 'Sign up failed',
                });
                return;
            }

            resolve({
                success: true,
                userConfirmed: result?.userConfirmed,
                userSub: result?.userSub,
            });
        });
    });
}

/**
 * Returns the Cognito user currently cached in local storage (if any).
 * Note: this does NOT guarantee a valid session; use getCurrentSessionToken() for that.
 */
export function getCurrentUser(): CognitoUser | null {
    return userPool.getCurrentUser();
}

/**
 * Retrieves the current valid session token from the cached Cognito user.
 * Returns the ID token JWT (commonly used for authentication with backends).
 * Returns null if no user is cached or the session is invalid.
 */
export function getCurrentSessionToken(): Promise<string | null> {
    return new Promise((resolve) => {
        const cognitoUser = userPool.getCurrentUser();

        if (!cognitoUser) {
            console.log("No current user found in storage.");
            resolve(null);
            return;
        }

        cognitoUser.getSession((err: any, session: any) => {
            if (err) {
                console.error("Failed to retrieve session:", err);
                resolve(null);
                return;
            }

            if (session.isValid()) {
        // ID token is typically used as the "auth token" for API calls.
                resolve(session.getIdToken().getJwtToken());
            } else {
                console.log("Session is invalid.");
                resolve(null);
            }
        });
    });
}

/**
 * Starts the Cognito forgot-password flow (sends a verification code).
 * The UI should collect the code and new password, then call confirmPassword().
 */
export function forgotPassword(email: string): Promise<AuthResult> {
    return new Promise((resolve) => {
        try {
            const cognitoUser = new CognitoUser({
                Username: email,
                Pool: userPool,
            });

            console.log("Calling forgotPassword for:", email);
            cognitoUser.forgotPassword({
                onSuccess: (result: any) => {
                    console.log("forgotPassword onSuccess called");
                    resolve({
                        success: true,
                    });
                },
                onFailure: (err: any) => {
                    console.error("forgotPassword onFailure called:", err);
                    resolve({
                        success: false,
                        error: err.message || 'Failed to send verification code',
                    });
                },
            });
        } catch (error: any) {
            console.error("forgotPassword exception:", error);
            resolve({
                success: false,
                error: error.message || 'Failed to send verification code',
            });
        }
    });
}

/**
 * Starts a password reset flow via a custom backend endpoint using phone number.
 * This exists because Cognito's built-in flow is typically username/email-based
 * depending on pool configuration.
 */
export async function forgotPasswordPhone(phoneNumber: string): Promise<AuthResult> {
  try {
    const res = await fetch(`${aws_config.apiBaseUrl}/forgot-password-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: "Network error" };
  }
}

/**
 * Completes the Cognito forgot-password flow using the verification code + new password.
 * `username` may be email or phone depending on how the user was identified in the flow.
 */
export function confirmPassword(
    username: string, // can be email or phone number
    code: string,
    newPassword: string
): Promise<AuthResult> {
    return new Promise((resolve) => {
        try {
            const cognitoUser = new CognitoUser({
                Username: username,
                Pool: userPool,
            });

            console.log("Calling confirmPassword for:", username);
            cognitoUser.confirmPassword(code, newPassword, {
                onSuccess: (result: any) => {
                    console.log("confirmPassword onSuccess called");
                    resolve({
                        success: true,
                    });
                },
                onFailure: (err: any) => {
                    console.error("confirmPassword onFailure called:", err);
                    resolve({
                        success: false,
                        error: err.message || 'Failed to reset password',
                    });
                },
            });
        } catch (error: any) {
            console.error("confirmPassword exception:", error);
            resolve({
                success: false,
                error: error.message || 'Failed to reset password',
            });
        }
    });
}