# MovieFlix - Complete Movie Streaming Platform

A full-featured movie streaming website with OTP authentication, subscription plans, and payment integration.

## Features

### ✅ Core Features
- **Movie Browsing**: Browse trending, popular, and top-rated movies
- **Search**: Real-time search with suggestions
- **Watchlist & Favorites**: Save movies to personal lists
- **Continue Watching**: Track your viewing progress
- **Movie Details**: Comprehensive movie information and cast details

### 🔐 Authentication & Security
- **OTP-based Authentication**: Secure login/signup with email verification
- **JWT Tokens**: Secure session management
- **Password Hashing**: Bcrypt encryption for passwords
- **Rate Limiting**: API protection against abuse

### 💳 Subscription & Payments
- **Subscription Plans**: Monthly (₹299) and Yearly (₹2999) plans
- **Payment Gateway**: Razorpay integration for secure payments
- **Payment History**: Track all transactions
- **Subscription Management**: View current plan and expiry

### 🎯 User Experience
- **Responsive Design**: Works on all devices
- **Profile Management**: Edit profile, view subscription status
- **Watch History**: Track recently viewed content
- **Modern UI**: Netflix-inspired design

📸 Screenshots / Demo

<img width="1883" height="903" alt="image" src="https://github.com/user-attachments/assets/63b28acb-d1d1-4078-a509-e798c3322a4a" />
<img width="1885" height="912" alt="image" src="https://github.com/user-attachments/assets/e86daf39-8b5f-4e17-8615-ab4fc69c933a" />
<img width="1885" height="914" alt="image" src="https://github.com/user-attachments/assets/3b5ed00e-011e-4cd1-b209-bb98f225dd54" />
<img width="1886" height="916" alt="image" src="https://github.com/user-attachments/assets/68b2556e-ac35-4afc-9245-058c122322ab" />
<img width="1885" height="916" alt="image" src="https://github.com/user-attachments/assets/a547d82e-bf64-42e1-b53d-d673a72a8499" />
<img width="1888" height="916" alt="image" src="https://github.com/user-attachments/assets/27a2874b-c6d0-4d95-83ab-3a96a702dddc" />


## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# JWT Secret (change this in production)
JWT_SECRET=your_super_secret_jwt_key_here

# TMDB API Key (you already have this)
TMDB_API_KEY=efa4bba6280252ded1c68c4884f56085

# Email Configuration (for OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Razorpay Configuration (for payments)
# Get these from https://dashboard.razorpay.com/
RAZORPAY_KEY_ID=rzp_test_your_test_key_here
RAZORPAY_KEY_SECRET=your_test_secret_here

# Environment
NODE_ENV=development
```

### 3. Email Setup (for OTP)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password
3. Use the App Password in `EMAIL_PASS`

### 4. Razorpay Setup (for payments)
1. Sign up at [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Get your test API keys
3. Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### 5. Start the Server
```bash
npm start
```

The application will be available at `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to email
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Subscriptions
- `GET /api/subscriptions/plans` - Get available plans
- `GET /api/subscriptions/current` - Get user's current subscription
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/history` - Get payment history

### Movies (TMDB Proxy)
- `GET /api/tmdb/movie/popular` - Popular movies
- `GET /api/tmdb/trending/movie/week` - Trending movies
- `GET /api/tmdb/search/movie` - Search movies
- `GET /api/tmdb/movie/:id` - Movie details

## Database Schema

The application uses SQLite with the following tables:
- `users` - User accounts and profiles
- `otps` - OTP storage with expiry
- `subscriptions` - User subscription details
- `payments` - Payment transaction history

## Security Features

- **OTP Expiry**: OTPs expire after 10 minutes
- **Rate Limiting**: 180 requests per minute per IP
- **JWT Expiry**: Tokens expire after 7 days
- **Password Requirements**: Minimum 6 characters
- **Email Verification**: Required for account creation

## Production Deployment

1. **Change JWT Secret**: Use a strong, unique secret
2. **Use Production Razorpay Keys**: Switch from test to live keys
3. **Configure Email Service**: Use a production email service
4. **Database**: Consider using PostgreSQL for production
5. **HTTPS**: Enable SSL/TLS encryption
6. **Environment Variables**: Set `NODE_ENV=production`

## File Structure

```
movie-project/
├── server.js              # Main Express server
├── package.json           # Dependencies
├── auth.db               # SQLite database
├── movie_website.html    # Main homepage
├── subscription.html     # Subscription page
├── script_movie_front_page.js  # Main frontend logic
├── movie_details.html    # Movie details page
├── signin.html          # Sign-in page
└── README.md            # This file
```

## Troubleshooting

### OTP Not Received
- Check email configuration
- Verify email address is correct
- Check spam folder

### Payment Issues
- Verify Razorpay keys are correct
- Ensure you're using test keys for development
- Check browser console for errors

### Database Issues
- Delete `auth.db` to reset database
- Check file permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes. Please respect the terms of service for TMDB and Razorpay APIs.


