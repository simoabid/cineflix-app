# 📝 Step-by-Step Implementation Guide

This document explains **exactly** what we'll create and **why** each file is needed.

---

## 🎯 Overview: What We're Building

We're creating a **backend server** that will:
1. Store data in MongoDB (instead of browser localStorage)
2. Provide API endpoints for the frontend to call
3. Handle all data operations (add, remove, update, search)

---

## 📦 Phase 1: Project Setup

### Step 1.1: Create Backend Folder
**What**: Create a new folder called `backend/` in your project
**Why**: Keep backend code separate from frontend code
**Location**: `New Cascade CineFlix project/backend/`

### Step 1.2: Create `backend/package.json`
**What**: A file that lists all the tools (packages) we need
**Why**: Like a shopping list - tells npm what to install
**Contains**:
- Project name and version
- List of dependencies (Express, MongoDB, etc.)
- Scripts to run the server

**Example**:
```json
{
  "name": "cineflix-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "mongodb": "^6.0.0",
    "mongoose": "^7.0.0"
  },
  "scripts": {
    "dev": "nodemon src/server.ts",
    "start": "node dist/server.js"
  }
}
```

### Step 1.3: Create `backend/tsconfig.json`
**What**: TypeScript configuration file
**Why**: Tells TypeScript how to compile our code
**Contains**: Compiler options, file paths, etc.

### Step 1.4: Create `backend/.env`
**What**: Environment variables file (secrets and configuration)
**Why**: Stores sensitive data like database connection string
**Contains**:
```
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cineflix
```

**Important**: This file should NEVER be committed to Git (contains passwords!)

---

## 🔌 Phase 2: Database Connection

### Step 2.1: Create `backend/src/config/database.ts`
**What**: File that connects to MongoDB
**Why**: We need to establish connection before we can use the database
**Does**:
- Connects to MongoDB Atlas (cloud database)
- Handles connection errors
- Exports connection function

**Code Structure**:
```typescript
// Import mongoose (MongoDB tool)
import mongoose from 'mongoose';

// Function to connect to database
export const connectDB = async () => {
  try {
    // Connect using connection string from .env
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
};
```

### Step 2.2: Test Connection
**What**: Verify we can connect to MongoDB
**Why**: Make sure everything works before building features
**How**: Run the server and check for connection message

---

## 📊 Phase 3: Data Models

### Step 3.1: Create `backend/src/models/User.ts`
**What**: Defines what a User looks like in the database
**Why**: MongoDB needs to know the structure of our data
**Contains**:
- User fields: email, name, createdAt, etc.
- Validation rules (email must be valid, etc.)

**Example**:
```typescript
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', userSchema);
```

### Step 3.2: Create `backend/src/models/MyList.ts`
**What**: Defines what a MyList item looks like
**Why**: Structure for storing movies/TV shows in user's list
**Contains**:
- Fields: contentId, contentType, content, status, progress, etc.
- Links to User (userId)

**Example**:
```typescript
const myListSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentId: { type: Number, required: true },
  contentType: { type: String, enum: ['movie', 'tv'], required: true },
  content: { type: Object, required: true }, // Full movie/TV data
  status: { type: String, default: 'notStarted' },
  progress: { type: Number, default: 0 },
  dateAdded: { type: Date, default: Date.now },
  isLiked: { type: Boolean, default: false }
});
```

### Step 3.3: Create `backend/src/models/Collection.ts`
**What**: Defines custom collections structure
**Why**: For user-created collections (like "Action Movies")
**Contains**: name, description, items array, etc.

---

## 🛣️ Phase 4: API Routes

### Step 4.1: Create `backend/src/routes/myListRoutes.ts`
**What**: Defines all the API endpoints (URLs) for MyList
**Why**: Frontend needs specific URLs to call
**Contains**: Route definitions

**Example Routes**:
```typescript
import express from 'express';
const router = express.Router();

// GET /api/my-list - Get all items
router.get('/', getMyList);

// POST /api/my-list/add - Add item
router.post('/add', addToList);

// DELETE /api/my-list/:id - Remove item
router.delete('/:id', removeFromList);

// PUT /api/my-list/:id - Update item
router.put('/:id', updateItem);

export default router;
```

### Step 4.2: Create `backend/src/controllers/myListController.ts`
**What**: Contains the actual logic for each route
**Why**: Separates route definitions from business logic
**Contains**: Functions that handle each request

**Example Function**:
```typescript
export const addToList = async (req: Request, res: Response) => {
  try {
    // 1. Get data from request
    const { content, contentType } = req.body;
    
    // 2. Create new MyList item
    const newItem = await MyList.create({
      userId: req.user.id, // From authentication (later)
      contentId: content.id,
      contentType,
      content,
      dateAdded: new Date()
    });
    
    // 3. Send success response
    res.status(201).json({
      success: true,
      item: newItem
    });
  } catch (error) {
    // 4. Handle errors
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
```

---

## 🚀 Phase 5: Main Server File

### Step 5.1: Create `backend/src/server.ts`
**What**: The main file that starts the server
**Why**: This is the entry point - everything starts here
**Does**:
- Imports Express
- Connects to database
- Sets up middleware (CORS, JSON parser)
- Registers routes
- Starts listening on port 3000

**Structure**:
```typescript
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/database';
import myListRoutes from './routes/myListRoutes';

// Create Express app
const app = express();

// Middleware
app.use(cors()); // Allow frontend to connect
app.use(express.json()); // Parse JSON requests

// Routes
app.use('/api/my-list', myListRoutes);

// Connect to database and start server
connectDB().then(() => {
  app.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
  });
});
```

---

## 🔄 Phase 6: Update Frontend

### Step 6.1: Create `src/services/api.ts`
**What**: Helper functions to call backend API
**Why**: Makes it easy to call backend from anywhere in frontend
**Contains**: Functions like `getMyList()`, `addToList()`, etc.

**Example**:
```typescript
const API_BASE_URL = 'http://localhost:3000/api';

export const api = {
  // Get user's list
  getMyList: async () => {
    const response = await fetch(`${API_BASE_URL}/my-list`);
    return response.json();
  },
  
  // Add to list
  addToList: async (content: Movie | TVShow, contentType: 'movie' | 'tv') => {
    const response = await fetch(`${API_BASE_URL}/my-list/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, contentType })
    });
    return response.json();
  }
};
```

### Step 6.2: Update `src/services/myListService.ts`
**What**: Modify existing service to use API instead of localStorage
**Why**: Replace browser storage with backend storage
**Changes**:
- Remove localStorage code
- Add API calls using `api.ts`
- Keep same function names (so components don't break)

**Before** (localStorage):
```typescript
getMyList(): MyListItem[] {
  const data = localStorage.getItem('myList');
  return JSON.parse(data || '[]');
}
```

**After** (API):
```typescript
async getMyList(): Promise<MyListItem[]> {
  const response = await api.getMyList();
  return response.data;
}
```

### Step 6.3: Update Components
**What**: Make components handle async operations
**Why**: API calls are asynchronous (take time)
**Changes**: Add `async/await` and loading states

**Example**:
```typescript
const handleAddToList = async () => {
  setLoading(true);
  try {
    await myListService.addToList(movie, 'movie');
    setSuccess('Added to list!');
  } catch (error) {
    setError('Failed to add to list');
  } finally {
    setLoading(false);
  }
};
```

---

## 📋 Phase 7: Environment Setup

### Step 7.1: Install Dependencies
**Commands to run**:
```bash
# Navigate to backend folder
cd backend

# Install all packages listed in package.json
npm install
```

**What this does**: Downloads all the tools we need (Express, MongoDB, etc.)

### Step 7.2: Set Up MongoDB Atlas
**Steps**:
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a free cluster (takes 3-5 minutes)
4. Get connection string
5. Add to `.env` file

### Step 7.3: Create `.env` File
**What**: Stores environment variables
**Why**: Keeps secrets out of code
**Contains**:
```
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cineflix?retryWrites=true&w=majority
NODE_ENV=development
```

---

## 🧪 Phase 8: Testing

### Step 8.1: Test Backend
**How**: Use Postman or browser to test endpoints
**Tests**:
- ✅ GET /api/my-list (should return empty array initially)
- ✅ POST /api/my-list/add (should add item)
- ✅ GET /api/my-list (should return the added item)
- ✅ DELETE /api/my-list/:id (should remove item)

### Step 8.2: Test Frontend Integration
**How**: Use the app and verify data persists
**Tests**:
- ✅ Add movie to list
- ✅ Refresh page (data should still be there)
- ✅ Remove from list
- ✅ Update status/progress

---

## 📚 File Summary

| File | Purpose | Phase |
|------|---------|-------|
| `backend/package.json` | Lists dependencies | 1 |
| `backend/tsconfig.json` | TypeScript config | 1 |
| `backend/.env` | Environment variables | 1 |
| `backend/src/config/database.ts` | Database connection | 2 |
| `backend/src/models/User.ts` | User data structure | 3 |
| `backend/src/models/MyList.ts` | MyList data structure | 3 |
| `backend/src/models/Collection.ts` | Collection data structure | 3 |
| `backend/src/routes/myListRoutes.ts` | API endpoint definitions | 4 |
| `backend/src/controllers/myListController.ts` | Business logic | 4 |
| `backend/src/server.ts` | Main server file | 5 |
| `src/services/api.ts` | Frontend API helper | 6 |
| Updated `src/services/myListService.ts` | Use API instead of localStorage | 6 |

---

## 🎓 Key Concepts

### 1. **Models** = Data Structure
- Like a blueprint for a house
- Defines what fields data has
- MongoDB uses this to store data correctly

### 2. **Routes** = API Endpoints
- Like URLs in a website
- Each route has a purpose (GET, POST, etc.)
- Frontend calls these URLs

### 3. **Controllers** = Business Logic
- The actual work happens here
- Processes requests, talks to database
- Sends responses back

### 4. **Middleware** = Helpers
- CORS: Allows frontend-backend communication
- JSON Parser: Converts JSON strings to objects
- Runs before routes

### 5. **Async/Await** = Handling Time
- API calls take time
- `async/await` waits for response
- Prevents code from breaking

---

## ⚠️ Common Mistakes to Avoid

1. **Forgetting to start backend server**
   - Frontend won't work if backend isn't running
   - Always run `npm run dev` in backend folder

2. **Wrong MongoDB connection string**
   - Must include username, password, cluster name
   - Check `.env` file

3. **CORS errors**
   - Backend must allow frontend origin
   - Use `cors()` middleware

4. **Forgetting async/await**
   - API calls are asynchronous
   - Must use `async/await` or `.then()`

5. **Not handling errors**
   - Always use try/catch
   - Show user-friendly error messages

---

## 🎯 Success Criteria

You'll know it's working when:
- ✅ Backend server starts without errors
- ✅ Can connect to MongoDB
- ✅ Frontend can call backend API
- ✅ Data persists after page refresh
- ✅ Can add/remove/update items
- ✅ No localStorage errors in console

---

## 🚀 Ready to Start?

Once you understand:
1. ✅ What a backend is
2. ✅ What MongoDB is
3. ✅ How they work together
4. ✅ What files we'll create

**We can start implementing!** 

Let me know if you have any questions, or if you're ready to begin coding! 🎉

