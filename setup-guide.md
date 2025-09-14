# 🚀 Quick Setup Guide for OTP & Subscription Features

## Why You Can't See the Features

The OTP and subscription systems are **fully implemented** but need proper configuration to work. Here's how to get them running:

## Step 1: Create Environment File

Create a file named `.env` in your project folder with this content:

```env
# JWT Secret (you can use any random string)
JWT_SECRET=my_super_secret_key_12345

# Email Configuration (for OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Razorpay Configuration (for payments)
RAZORPAY_KEY_ID=rzp_test_your_test_key_here
RAZORPAY_KEY_SECRET=your_test_secret_here

# Environment
NODE_ENV=development
```

## Step 2: Setup Email for OTP

### Option A: Use Gmail (Recommended for testing)
1. Go to your Gmail account settings
2. Enable 2-factor authentication
3. Generate an "App Password"
4. Use that password in `EMAIL_PASS`

### Option B: Use a Test Email Service
For testing, you can use services like:
- **Mailtrap.io** (free)
- **Ethereal Email** (free)

## Step 3: Setup Razorpay (for payments)

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Sign up for a free account
3. Get your test API keys from the dashboard
4. Update the `.env` file with your keys

## Step 4: Start the Server

```bash
npm start
```

## Step 5: Test the Features

### Method 1: Use the Test Page
1. Go to `http://localhost:5000/test-features.html`
2. Click "Test All APIs" to check if everything is working
3. Try sending an OTP to your email
4. Test the subscription plans

### Method 2: Use the Main Website
1. Go to `http://localhost:5000`
2. Click "Sign In" - you'll see the OTP system
3. Click "Subscribe" in the footer to see subscription plans

### Method 3: Direct Access
- **Subscription Page**: `http://localhost:5000/subscription.html`
- **Sign In Page**: `http://localhost:5000/signin.html`

## 🔍 How to See the OTP System

### On the Main Website:
1. Click "Sign In" in the navigation
2. Enter your email and password
3. The system will automatically send an OTP to your email
4. Enter the 6-digit OTP code
5. You'll be signed in!

### On the Test Page:
1. Go to `http://localhost:5000/test-features.html`
2. Enter your email in the "OTP Authentication Test" section
3. Click "Send OTP"
4. Check your email for the 6-digit code
5. Enter the code and click "Verify OTP"

## 💳 How to See the Subscription System

### On the Main Website:
1. Click "Subscribe" in the footer
2. You'll see the subscription plans page
3. Choose a plan and click "Subscribe Now"
4. The payment gateway will open

### On the Test Page:
1. Go to `http://localhost:5000/test-features.html`
2. Click "Get Subscription Plans" to see available plans
3. Click "Open Subscription Page" to see the full subscription page

## 🛠️ Troubleshooting

### "OTP not received"
- Check your email configuration in `.env`
- Make sure you're using an App Password (not your regular password)
- Check your spam folder

### "Payment not working"
- Make sure you have valid Razorpay test keys
- Use test card numbers: 4111 1111 1111 1111 (success) or 4000 0000 0000 0002 (failure)

### "Server not starting"
- Make sure all dependencies are installed: `npm install`
- Check that the `.env` file is in the correct location
- Look for error messages in the terminal

## 📱 Quick Test Without Email Setup

If you don't want to set up email right now, you can still test the OTP system:

1. The OTP will be shown in the server console
2. Or it will be returned in the API response (in development mode)
3. You can copy the OTP from there and use it

## 🎯 What You Should See

### OTP System:
- Email input field
- "Send OTP" button
- 6-digit OTP input fields
- "Verify OTP" button
- Success/error messages

### Subscription System:
- Monthly plan (₹299)
- Yearly plan (₹2999)
- Plan features and benefits
- "Subscribe Now" buttons
- Payment gateway integration

## 🔗 Quick Links

- **Test Page**: `http://localhost:5000/test-features.html`
- **Subscription Page**: `http://localhost:5000/subscription.html`
- **Main Website**: `http://localhost:5000`

The features are there - you just need to configure them properly! 🚀

