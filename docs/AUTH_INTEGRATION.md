# CINEFLIX Authentication Integration Guide

This document provides comprehensive instructions for integrating and configuring the authentication system for CINEFLIX.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [OAuth Setup](#oauth-setup)
4. [Security Configuration](#security-configuration)
5. [Route Protection](#route-protection)
6. [Session & Token Handling](#session--token-handling)
7. [Accessibility Checklist](#accessibility-checklist)
8. [Test Cases](#test-cases)

---

## Quick Start

### Running the Development Environment

```bash
# Terminal 1: Start the backend
cd backend
npm install
npm run dev

# Terminal 2: Start the frontend
npm install
npm run dev
```

### Default Endpoints

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Login Page**: http://localhost:5173/login
- **Signup Page**: http://localhost:5173/signup

---

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Create new account | No |
| POST | `/api/auth/login` | Login with email/password | No |
| POST | `/api/auth/logout` | Logout (invalidate session) | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/profile` | Update user profile | Yes |
| PUT | `/api/auth/password` | Change password | Yes |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| POST | `/api/auth/google` | Google OAuth (stub) | No |
| POST | `/api/auth/github` | GitHub OAuth (stub) | No |

### Request/Response Examples

#### Register
```json
// POST /api/auth/register
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

// Response (201)
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
  }
}
```

#### Login
```json
// POST /api/auth/login
// Request
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Response (200)
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
  }
}

// Error Response (401)
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## OAuth Setup

### Google OAuth

1. **Create OAuth Application**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create Credentials → OAuth 2.0 Client IDs
   - Configure OAuth consent screen

2. **Environment Variables**
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

3. **Authorized Redirect URIs**
   - Development: `http://localhost:3001/api/auth/google/callback`
   - Production: `https://your-domain.com/api/auth/google/callback`

### GitHub OAuth

1. **Create OAuth Application**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - New OAuth App
   - Set Authorization callback URL

2. **Environment Variables**
   ```env
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

3. **Authorized Callback URLs**
   - Development: `http://localhost:3001/api/auth/github/callback`
   - Production: `https://your-domain.com/api/auth/github/callback`

### Implementation Notes

The OAuth endpoints are currently stubs. To implement:

1. Install passport and strategy packages:
   ```bash
   npm install passport passport-google-oauth20 passport-github2
   ```

2. Configure passport strategies in `backend/src/config/passport.ts`

3. Update the controller functions in `authController.ts`

---

## Security Configuration

### Password Requirements

The system enforces the following password complexity rules:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (!@#$%^&*(),.?":{}|<>)

Configure in: `src/utils/validation.ts`

### Password Hashing

The backend uses **bcrypt** for password hashing (via Mongoose pre-save hook):

```typescript
// backend/src/models/User.ts
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
```

**Recommendation**: Consider migrating to Argon2id for new deployments.

### JWT Configuration

```typescript
// backend/src/controllers/authController.ts
const JWT_SECRET = process.env.JWT_SECRET || 'cineflix-super-secret-jwt-key-2024';
const JWT_EXPIRE = '30d';
```

⚠️ **Important**: Always set `JWT_SECRET` via environment variable in production!

### Rate Limiting

Implement rate limiting to prevent brute-force attacks:

```typescript
// Add to backend/src/server.ts
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 failed attempts
  message: { success: false, error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

### CSRF Protection

For cookie-based sessions, implement CSRF tokens:

```typescript
import csurf from 'csurf';

const csrfProtection = csurf({ 
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});
```

### Secure Cookie Configuration

For "Remember Me" functionality with cookies:

```typescript
res.cookie('auth_token', token, {
  httpOnly: true,           // Prevents XSS attacks
  secure: true,             // HTTPS only in production
  sameSite: 'strict',       // CSRF protection
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
});
```

---

## Route Protection

### Frontend Protection (React)

The `ProtectedRoute` component handles client-side route protection:

```tsx
// Usage in App.tsx
<Route path="/my-list" element={
  <ProtectedRoute>
    <MyListPage />
  </ProtectedRoute>
} />
```

**Protected Routes:**
- `/my-list` - User's watchlist
- `/account` - User settings
- `/settings` - App preferences (if implemented)
- `/checkout` - Payment flow (if implemented)

### Backend Protection (Express)

The `protect` middleware validates JWT tokens:

```typescript
// Usage in routes
import { protect } from '../middleware/authMiddleware.js';

router.get('/protected-resource', protect, (req, res) => {
  // req.user contains the authenticated user
  res.json({ data: 'protected data' });
});
```

### Optional Authentication

For routes that work with or without auth:

```typescript
import { optionalAuth } from '../middleware/authMiddleware.js';

router.get('/content/:id', optionalAuth, (req, res) => {
  // req.user may or may not be present
  const isAuthenticated = !!req.user;
});
```

---

## Session & Token Handling

### Token Storage

Tokens are stored in localStorage:

```typescript
// src/services/api.ts
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};
```

### Token Refresh (Future Enhancement)

Implement refresh tokens for better security:

1. Short-lived access tokens (15 min)
2. Long-lived refresh tokens (30 days)
3. Automatic token refresh before expiration

### Logout Handling

```typescript
// Frontend logout
const logout = useCallback(async () => {
  try {
    await authApi.logout();
  } finally {
    setAuthToken(null);
    setUser(null);
  }
}, []);
```

---

## Accessibility Checklist

### Form Accessibility

- [x] All inputs have associated `<label>` elements
- [x] Error messages use `role="alert"` for screen readers
- [x] Required fields marked with asterisk and `required` attribute
- [x] `aria-invalid` set on fields with errors
- [x] `aria-describedby` links inputs to error messages

### Keyboard Navigation

- [x] Tab order is logical (top to bottom, left to right)
- [x] All interactive elements are focusable
- [x] Focus indicators visible (2px solid ring)
- [x] Enter key submits forms
- [x] Escape key behavior (close modals)

### Visual Accessibility

- [x] Color contrast ≥ 4.5:1 for text
- [x] Focus states visible against all backgrounds
- [x] Error states not conveyed by color alone (includes icon/text)
- [x] Text remains readable at 200% zoom

### Screen Reader Testing

Test with:
- NVDA (Windows)
- VoiceOver (Mac/iOS)
- JAWS (Windows)

Verify:
- Form labels announced correctly
- Error messages announced on appearance
- Loading states announced
- Success messages announced

---

## Test Cases

### Login Flow

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| L1 | Valid login | Enter valid email/password, click Sign In | Redirect to home/intended page |
| L2 | Invalid email | Enter invalid email format | Inline error: "Please enter a valid email address" |
| L3 | Wrong password | Enter valid email, wrong password | Error: "Invalid credentials" |
| L4 | Empty fields | Leave fields empty, click Sign In | Inline errors on all required fields |
| L5 | Remember me | Check Remember Me, login, close browser, return | User still logged in |
| L6 | Redirect after login | Try to access /my-list, login | Redirect back to /my-list |

### Signup Flow

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| S1 | Valid signup | Enter all valid info, click Sign Up | Account created, redirect to home |
| S2 | Existing email | Enter email already registered | Error: "User with this email already exists" |
| S3 | Weak password | Enter password without uppercase | Inline error + strength meter shows "Weak" |
| S4 | Password mismatch | Enter different passwords | Error: "Passwords do not match" |
| S5 | Password strength | Enter progressively stronger password | Strength meter updates (Weak → Fair → Good → Strong) |

### Protected Routes

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| P1 | Access without auth | Visit /my-list while logged out | Redirect to /login |
| P2 | Access with auth | Login, visit /my-list | Page loads normally |
| P3 | Token expiration | Wait for token to expire, try protected action | Redirect to login |

### Account Page

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| A1 | Update name | Edit profile name, save | Success message, name updated |
| A2 | Change password | Enter current + new password, submit | Success message |
| A3 | Wrong current password | Enter incorrect current password | Error: "Current password is incorrect" |
| A4 | Logout | Click Sign Out | Redirect to home, user menu shows Sign In |

### Responsive Design

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| R1 | Desktop layout | View at 1280px+ | Two-column form layout |
| R2 | Tablet layout | View at 768px | Two-column form layout, slightly narrower |
| R3 | Mobile layout | View at 375px | Single-column layout, full-width card |
| R4 | Touch targets | Test on touch device | All buttons ≥ 44px |

### OAuth (Once Implemented)

| ID | Test Case | Steps | Expected Result |
|----|-----------|-------|-----------------|
| O1 | Google sign-in | Click Continue with Google | Redirect to Google, then back with auth |
| O2 | GitHub sign-in | Click Continue with GitHub | Redirect to GitHub, then back with auth |
| O3 | OAuth cancel | Start OAuth, cancel | Return to login page, no errors |

---

## Troubleshooting

### Common Issues

**"Invalid credentials" on valid password**
- Check if email is case-insensitive (should be)
- Verify password is being hashed correctly on registration

**Token not persisting**
- Check localStorage is available
- Verify token is being set after login response

**CORS errors**
- Ensure backend allows frontend origin
- Check credentials mode in fetch requests

**OAuth not working**
- Verify client ID/secret are correct
- Check callback URL matches exactly
- Ensure OAuth consent screen is configured

---

## Environment Variables Template

```env
# Backend (.env)
PORT=3001
MONGODB_URI=mongodb://localhost:27017/cineflix
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (for password reset, optional)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
