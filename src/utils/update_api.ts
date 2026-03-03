import { aws_config } from '../../constants/aws-config';

export const updateUserProfile = async (profileData: any, token: string) => {
  try {

    if (!token) {
      throw new Error('No valid session found');
    }

    const response = await fetch(`${aws_config.apiBaseUrl}/update-profile`, {
      method: 'PUT',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("SERVER ERROR:", response.status, errorBody);
      throw new Error(`Server Failed: ${response.status} ${errorBody}`);
    }

    return await response.json();
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
};