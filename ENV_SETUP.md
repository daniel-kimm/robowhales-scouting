# Environment Variables Setup

This project requires environment variables to be configured. Create a `.env` file in the root directory with the following variables:

## Required Environment Variables

### Firebase Configuration (Client-side)

```
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Firebase Admin SDK (Server-side)

```
# Do NOT paste raw PEM blocks in your repo or docs.
# Put your private key as a single-line env var with \n escapes, e.g.:
FIREBASE_PRIVATE_KEY=your_private_key_with_escaped_newlines
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
```

### OpenAI Configuration

```
OPENAI_API_KEY=your_openai_api_key
```

### Node Environment

```
NODE_ENV=development
```

## Setup Instructions

1. Copy the example above and create a `.env` file in the root directory
2. Replace all placeholder values with your actual Firebase and OpenAI credentials
3. For Firebase Admin SDK, you'll need to download the service account key from Firebase Console
4. The `.env` file is already added to `.gitignore` to prevent committing sensitive data

## Getting Firebase Credentials

1. Go to Firebase Console (https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > General
4. Scroll down to "Your apps" section
5. Copy the config values from your web app
6. For Admin SDK, go to Project Settings > Service Accounts and generate a new private key
