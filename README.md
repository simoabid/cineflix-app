# 🎬 CINEFLIX

### Full-Stack MERN Streaming Platform

Welcome to **CINEFLIX**! This project is a modern, responsive streaming service tailored for a seamless user experience, mimicking the core functionality of major platforms like Netflix.

This guide will walk you through setting up the project from scratch, including creating the necessary accounts (MongoDB, TMDB) and configuring the environment variables.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your computer:
*   **Node.js** (Version 16 or higher): [Download Here](https://nodejs.org/)
*   **Git**: [Download Here](https://git-scm.com/)

---

## 🚀 Installation & Setup Guide

### Phase 1: Backend Setup (Database & Server)

The backend manages user accounts, authentication, and your personal "My List". It uses **MongoDB** as the database.

#### Step 1: Create a MongoDB Account & Cluster
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and sign up for a free account.
2.  Create a **New Project** (name it "CineFlix").
3.  Click **Build a Database** and select the **M0 Free** tier.
4.  Select a provider (AWS/Google) and region close to you, then click **Create**.

#### Step 2: Configure Security & User
1.  **Database User**: Create a database user (e.g., username: `admin`, password: `yourpassword`). **Save this password!**
2.  **Network Access**: Go to "Network Access" in the sidebar -> "Add IP Address" -> Select **"Allow Access from Anywhere" (0.0.0.0/0)**. This ensures you can connect from any network.

#### Step 3: Get Connection String
1.  Go back to "Database" -> Click **Connect**.
2.  Select **Drivers**.
3.  Copy the connection string. It will look like: 
    `mongodb+srv://admin:<password>@cluster0.example.mongodb.net/?retryWrites=true&w=majority`
4.  Replace `<password>` with the password you created in Step 2.

#### Step 4: Configure Backend Environment
1.  Open the `backend` folder in your terminal:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a file named `.env` in the `backend/` folder.
4.  Add the following lines to `.env`:
    ```env
    PORT=3001
    MONGODB_URI=your_mongodb_connection_string_from_step_3
    JWT_SECRET=my_super_secure_secret_key_123
    ```

#### Step 5: Start the Backend
```bash
npm run dev
```
You should see: `✅ Connected to MongoDB`

---

### Phase 2: Frontend Setup (User Interface)

The frontend handles the visuals and movie data. It uses **The Movie Database (TMDB)** API for content.

#### Step 1: Create a TMDB Account & Get API Key
1.  Go to [The Movie Database (TMDB)](https://www.themoviedb.org/signup) and create an account.
2.  Go to **Settings** -> **API** (sidebar).
3.  Click **Create** -> **Developer**.
4.  Accept terms and fill in the basics (Application Name: "CineFlix", URL: "http://localhost:5173", Summary: "Educational project").
5.  Copy your **"API Key (v3 auth)"**.

#### Step 2: Configure Frontend Environment
1.  Open a new terminal window (keep the backend running) and navigate to the project root:
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a file named `.env` in the root folder.
4.  Add your TMDB Key:
    ```env
    VITE_TMDB_API_KEY=your_tmdb_api_key_here
    ```

#### Step 3: Start the Frontend
```bash
npm run dev
```
The terminal will show a Local URL (usually `http://localhost:3000`). Ctrl+Click it to open CINEFLIX!

---

## 🏃‍♂️ How to Run the Project (Daily Usage)

Every time you want to work on the project, you need **two terminal windows**:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
# In the root folder
npm run dev
```

---

## 🛠 Troubleshooting

*   **MongoDB Connection Error**: 
    *   Check if your IP is allowed in MongoDB Atlas "Network Access".
    *   Ensure your `.env` password doesn't have special characters that break the URL (or URL-encode them).
*   **"Movies not loading"**: 
    *   Check the browser console (F12). 
    *   Verify your `VITE_TMDB_API_KEY` in the root `.env` file is correct.
*   **Sign Up/Login Fails**:
    *   Ensure the Backend server is running on `http://localhost:3001`.

---

## 📚 Tech Stack

*   **Frontend**: React, TypeScript, Tailwind CSS, Vite
*   **Backend**: Node.js, Express
*   **Database**: MongoDB
*   **API**: TMDB (The Movie Database)

Enjoy building with CINEFLIX! 🍿