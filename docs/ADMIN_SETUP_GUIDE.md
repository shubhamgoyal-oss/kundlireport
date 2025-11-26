# Admin Authentication Setup Guide

This guide explains how to configure Google OAuth and grant admin access to users.

## Overview

The admin area (`/admin/analytics` and `/admin/experiments`) is protected by:
1. **Google OAuth authentication** - Users must sign in with Google
2. **Role-based access control** - Only users with the `admin` role can access admin pages

## Step 1: Configure Google OAuth

You need to set up Google OAuth credentials to enable Google sign-in.

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" → "Credentials"

### 1.2 Configure OAuth Consent Screen

1. Go to "OAuth consent screen"
2. Select "External" user type
3. Fill in the required information:
   - App name
   - User support email
   - Developer contact email
4. Under "Authorized domains", add: `supabase.co`
5. Configure the following scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
6. Save and continue

### 1.3 Create OAuth Client ID

1. Go to "Credentials" → "Create Credentials" → "OAuth Client ID"
2. Choose "Web application"
3. Add authorized JavaScript origins:
   - Your Lovable preview URL (e.g., `https://your-project.lovableproject.com`)
   - Your deployed URL (if you have one)
4. Add authorized redirect URIs:
   - Get your Supabase callback URL from Lovable Cloud (see next step)
5. Save and note down your **Client ID** and **Client Secret**

### 1.4 Configure Google OAuth in Lovable Cloud

1. Click the button below to open your backend:

   **[View Backend]** (Click the "View Backend" button in Lovable)

2. Navigate to: **Users** → **Auth Settings** → **Google Settings**
3. Enter your Google OAuth credentials:
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
4. Copy the **Redirect URL** shown in Lovable Cloud
5. Go back to Google Cloud Console and add this URL to "Authorized redirect URIs"

### 1.5 Configure Site URL and Redirect URLs

In Lovable Cloud → Users → Auth Settings:
1. Set **Site URL** to your app's URL (preview or deployed)
2. Add all URLs where users might access the app to **Redirect URLs**

## Step 2: Grant Admin Access to Users

After a user signs in with Google for the first time, they will have a regular `user` role by default. To grant admin access:

### Method 1: Using the Edge Function (Recommended)

1. Open your browser's developer console (F12)
2. Navigate to `/admin/login` page
3. Sign in with Google
4. After signing in, run this in the console:

```javascript
await fetch('https://your-project-ref.supabase.co/functions/v1/grant-admin-role', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY'
  },
  body: JSON.stringify({
    userEmail: 'user@example.com'  // Replace with the email to grant admin access
  })
});
```

Replace:
- `your-project-ref` with your Supabase project reference
- `YOUR_ANON_KEY` with your Supabase anon key
- `user@example.com` with the email address to grant admin access

### Method 2: Direct Database Insert

1. Open Lovable Cloud → Database → Tables
2. Navigate to the `user_roles` table
3. Insert a new row:
   - `user_id`: The UUID of the user (get from `profiles` table or `auth.users`)
   - `role`: `admin`

### Method 3: Using SQL (Cloud → Database)

```sql
-- Find user ID by email
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Grant admin role (replace USER_ID with the actual UUID)
INSERT INTO user_roles (user_id, role)
VALUES ('USER_ID', 'admin');
```

## Step 3: Test Admin Access

1. Sign out if you're already signed in
2. Navigate to `/admin/login`
3. Click "Continue with Google"
4. After signing in, you should be redirected to `/admin/analytics`
5. You should see the analytics dashboard with a "Sign Out" button
6. Test accessing `/admin/experiments` - both pages should work

## Security Notes

- **Never store admin credentials in code** - all admin checks use server-side database queries
- **RLS policies protect the `user_roles` table** - only admins can modify roles
- **Admin status is verified on every request** - cannot be bypassed by client-side manipulation
- **Only users with emails from authorized domains should be granted admin access**

## Troubleshooting

### "Access Denied" after signing in

- Check that the user has an `admin` role in the `user_roles` table
- Verify the `user_id` in `user_roles` matches the user's ID in `auth.users`

### "Requested path is invalid" error

- Check that Site URL and Redirect URLs are configured correctly in Auth Settings
- Ensure the Google OAuth redirect URI matches exactly what's configured in Google Cloud Console

### Google OAuth not working

- Verify Client ID and Client Secret are correct
- Check that OAuth consent screen is published (not in testing mode)
- Ensure authorized domains and redirect URIs are configured correctly

### Can't update experiments

- Ensure the signed-in user has `admin` role in the `user_roles` table
- Check RLS policies are enabled on the `experiments` table

## Managing Multiple Admins

To grant admin access to multiple users:

1. Have each user sign in with Google first (this creates their user account)
2. Use one of the methods above to grant them the `admin` role
3. They can now access admin pages immediately (may need to refresh)

## Revoking Admin Access

To remove admin access from a user:

```sql
DELETE FROM user_roles 
WHERE user_id = 'USER_ID' 
AND role = 'admin';
```

The user will lose admin access immediately (may need to refresh their session).
