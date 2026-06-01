# 🚀 CineFlix Deployment Guide: MERN Stack on Vercel

This guide explains how to deploy the CineFlix full-stack application (React frontend and Node.js/Express backend) to Vercel using Serverless Functions. It covers the architectural changes, configuration files, and troubleshooting steps required to get a MERN app running on a serverless platform.

## 🏗️ Architecture Overview

Unlike traditional "always-on" hosting (like Render or Heroku), Vercel uses **Serverless Functions**. This means:
- The **Frontend** is served as static files.
- The **Backend** is treated as individual functions that "wake up" when an API request is made.
- We use a **Monorepo structure**: The Frontend is in the root, and the Backend is in a `/backend` subfolder.

---

## 🛠️ Step 1: Backend Refactoring

To make Express work with Vercel, we had to stop the server from manually calling `app.listen()` in production and instead export the `app` instance.

1.  **Modify `backend/src/server.ts`**:
    ```typescript
    // Excerpt: Only listen if NOT in production
    if (process.env.NODE_ENV !== 'production') {
        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    }
    
    export default app; // Crucial for Vercel
    ```

2.  **The "Bridge" File**: Create an `api/index.ts` file in the root directory. This acts as the entry point for Vercel.
    ```typescript
    import app from '../backend/dist/server.js';
    export default app;
    ```

---

## ⚙️ Step 2: Vercel Configuration (`vercel.json`)

Create a `vercel.json` in the root folder. This file tells Vercel how to route traffic.
- `/api/*` requests go to our backend function.
- All other requests serve the frontend (enabling React Router to work).

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/index.ts"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 📦 Step 3: Build Scripts (The Monorepo Fix)

Because the backend is in a subfolder, we must ensure Vercel compiles the TypeScript backend *before* trying to run the function.

Update the **root `package.json`**:
```json
"scripts": {
  "build": "npm run backend-build && vite build",
  "backend-build": "cd backend && npm install && npm run build"
}
```

---

## 🔐 Step 4: Environment Variables & Database

### **Vercel Settings**
Go to your **Vercel Dashboard > Settings > Environment Variables** and add:
- `MONGODB_URI`: Your full MongoDB Atlas connection string.
- `JWT_SECRET`: A secret string for authentication.
- `VITE_TMDB_API_KEY`: Your movie database API key.
- `NODE_ENV`: Set to `production`.

### **MongoDB Atlas Network Access**
Vercel uses dynamic IP addresses. To ensure your database doesn't block the connection:
1. Go to **Network Access** in MongoDB Atlas.
2. Click **Add IP Address**.
3. Select **Allow Access From Anywhere (0.0.0.0/0)**.

---

## ⚠️ Troubleshooting & Common Pitfalls

### **1. The ".js" Extension Requirement (ESM)**
Modern Node.js on Vercel (ESM) requires strict pathing. Even if your file is `User.ts`, you must import it with the `.js` extension in your code:
`import User from '../models/User.js';`

### **2. "Unexpected token A" Error**
If you see this in the browser console, it means your backend crashed and sent a text-based "Internal Server Error" instead of JSON. Check your **Vercel Runtime Logs** to see the actual error message.

### **3. CORS Issues**
We automated the CORS configuration in `server.ts` to allow requests from your Vercel URL. Ensure `credentials: true` is set for authentication.

---

## 💻 Local Development

You can still develop locally without changing a single line of production code.

1.  **Run everything at once**:
    `npm run dev`
    *(I've configured this to use `concurrently` to start both frontend and backend).*

2.  **API Proxying**:
    The `vite.config.ts` is configured with a proxy so that local requests to `/api` are automatically forwarded to `localhost:3000`.

---

## 🚀 Portability
This setup is "Hybrid." If you ever want to move to a paid server (VPS/DigitalOcean):
- The `package.json` scripts will still work.
- The backend will detect it's not on Vercel and automatically start its own listener (`app.listen`).
