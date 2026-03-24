# Checkpoint 2 Update - Demo #1
CODE FOR DEMO
current issues to bring up:

- saving videos via profile edit is not running, this is a video API issue saving, probably on our AWS side or more connected to the login functionality we will face in sprint 2
- weird unexpected text node error that will not go away in the profile.tsx
- video thumbnail image not populating in main profile page when added
- URL image addition link for logos is broken at the moment - was working but we CAN upload a picture from local device
- all uploaded images will be PNG and this is enforced with png background clearing api I set up - for long term use on app should just build this functionality in
- contact information not saving to profile - ran out of time here to be honest but it will be simply a routing issue can fix quickly probably <20 min

questions:

- employees will be added by domain name - so this is when we will join tables and create backend requests with our company tables and the user tables that populate this in the profile - currently i want this to look like a bunch of profile pictures in a line like the background colors kind of with the employee picture - role - contact info or this would lead directly to pop up that asks if you would like to connect with them
- brand theme folder is included and updated to latest theme from user side
- may run into npx version issues on merge so want to work with Jonathan to make sure versions are compatible


# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
