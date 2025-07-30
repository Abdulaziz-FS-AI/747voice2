# Google OAuth Setup for Voice Matrix

This guide explains how to configure Google OAuth authentication for your Voice Matrix application.

## Step 1: Configure Google OAuth in Supabase Dashboard

1. **Navigate to your Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Select your Voice Matrix project

2. **Access Authentication Settings**
   - Click on "Authentication" in the left sidebar
   - Click on "Providers" tab
   - Find "Google" in the list of providers

3. **Enable Google Provider**
   - Toggle the "Enable Google" switch to ON
   - You'll need to configure the following fields:
     - `Client ID (for OAuth)`
     - `Client Secret (for OAuth)`

## Step 2: Create Google OAuth Application

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com](https://console.cloud.google.com)
   - Select your project or create a new one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application" as the application type

4. **Configure OAuth Settings**
   - **Name**: Voice Matrix OAuth
   - **Authorized JavaScript origins**: 
     ```
     https://your-project-ref.supabase.co
     ```
   - **Authorized redirect URIs**:
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```

5. **Copy Credentials**
   - Copy the `Client ID` and `Client Secret`
   - You'll need these for the Supabase configuration

## Step 3: Configure Supabase with Google Credentials

1. **Return to Supabase Dashboard**
   - Go back to Authentication > Providers > Google

2. **Enter Google Credentials**
   - Paste your Google `Client ID` in the "Client ID (for OAuth)" field
   - Paste your Google `Client Secret` in the "Client Secret (for OAuth)" field

3. **Save Configuration**
   - Click "Save" to apply the changes

## Step 4: Update Redirect URLs for Development

For local development, you'll also need to add your local URLs:

1. **In Google Cloud Console**
   - Add to Authorized JavaScript origins:
     ```
     http://localhost:3000
     ```
   - Add to Authorized redirect URIs:
     ```
     https://your-project-ref.supabase.co/auth/v1/callback
     ```

2. **In Supabase Dashboard**
   - Go to Authentication > URL Configuration
   - Add your site URL and redirect URLs:
     ```
     Site URL: http://localhost:3000 (for development)
     Site URL: https://your-domain.com (for production)
     
     Redirect URLs:
     http://localhost:3000/dashboard
     https://your-domain.com/dashboard
     ```

## Step 5: Test the Integration

1. **Start your development server**
   ```bash
   npm run dev
   ```

2. **Navigate to login page**
   - Go to `http://localhost:3000/login`
   - You should see the "Continue with Google" button

3. **Test Google Login**
   - Click the Google login button
   - Complete the OAuth flow
   - You should be redirected to the dashboard upon success

## Features Included

✅ **Revolutionary Design**: Google login button matches Voice Matrix branding  
✅ **Error Handling**: Proper error messages for failed authentication  
✅ **Loading States**: Visual feedback during authentication process  
✅ **Redirect Handling**: Automatic redirect to dashboard after successful login  
✅ **Responsive Design**: Works on all screen sizes  
✅ **Professional UI**: Consistent with Voice Matrix design system  
✅ **Auth Callback Page**: Dedicated `/auth/callback` page for proper OAuth handling  
✅ **Suspense Boundaries**: Proper loading states and error boundaries  

## Security Notes

- Keep your Google Client Secret secure and never expose it in client-side code
- Use HTTPS in production for security
- Regularly rotate your OAuth credentials
- Monitor authentication logs in both Google Cloud Console and Supabase

## Troubleshooting

**Common Issues:**

1. **"redirect_uri_mismatch" error**
   - Ensure your redirect URIs in Google Cloud Console match exactly
   - Check for trailing slashes and protocol (http vs https)

2. **"invalid_client" error**
   - Verify your Client ID and Client Secret are correct
   - Make sure the OAuth consent screen is configured

3. **Login button not working**
   - Check browser console for JavaScript errors
   - Verify Supabase configuration is saved properly

4. **Redirect not working**
   - Ensure redirect URLs are configured in Supabase
   - Check that your domain is added to Site URL configuration

5. **Works for some emails but not others**
   - **OAuth Consent Screen in Testing Mode**: Only allows specific test users
   - **Solution**: Add users to test user list OR publish the app
   - **Steps**: Go to Google Cloud Console > OAuth consent screen > Test users > Add users
   - **Alternative**: Change publishing status to "In production" (requires verification)

6. **"access_blocked" error for certain users**
   - User's Google account has restricted third-party app access
   - Ask user to enable "Less secure app access" or use a different account
   - Check if user's organization has G Suite restrictions