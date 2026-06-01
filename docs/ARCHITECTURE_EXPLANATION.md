# 🏗️ CineFlix Architecture Explained (For Beginners)

## 📊 Visual Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              FRONTEND (React Application)                │   │
│  │                                                           │   │
│  │  • HomePage.tsx                                          │   │
│  │  • MyListPage.tsx                                        │   │
│  │  • DetailPage.tsx                                        │   │
│  │  • Components (buttons, cards, etc.)                     │   │
│  │                                                           │   │
│  │  Runs on: http://localhost:5173                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↕ HTTP Requests                       │
│                            (API Calls)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER (Node.js)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Express.js Server                            │   │
│  │                                                           │   │
│  │  API Routes:                                              │   │
│  │  • GET    /api/my-list          → Get user's list         │   │
│  │  • POST   /api/my-list/add      → Add movie to list       │   │
│  │  • DELETE /api/my-list/:id     → Remove from list        │   │
│  │  • PUT    /api/my-list/:id     → Update item             │   │
│  │                                                           │   │
│  │  Runs on: http://localhost:3000                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            ↕ Database Queries                    │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB Atlas)                     │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              MongoDB Cloud Database                       │   │
│  │                                                           │   │
│  │  Collections (like tables):                              │   │
│  │  • users        → User accounts                          │   │
│  │  • myList       → User's saved movies/TV shows           │   │
│  │  • collections  → Custom collections                      │   │
│  │                                                           │   │
│  │  Stored in: MongoDB Cloud (Atlas)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Request Flow Example

### Scenario: User wants to add "Fight Club" to their list

#### Step 1: User Interaction
```
User clicks "Add to My List" button on the movie page
```

#### Step 2: Frontend Action
```javascript
// In React component
const handleAddToList = async () => {
  // Call the API service
  await myListService.addToList(movie, 'movie');
}
```

#### Step 3: API Service (Frontend)
```javascript
// In src/services/myListService.ts
async addToList(content, contentType) {
  // Send HTTP POST request to backend
  const response = await fetch('http://localhost:3000/api/my-list/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, contentType })
  });
  return response.json();
}
```

#### Step 4: Backend Receives Request
```javascript
// In backend/src/routes/myListRoutes.ts
router.post('/add', async (req, res) => {
  // Extract data from request
  const { content, contentType } = req.body;
  
  // Save to database
  const newItem = await MyList.create({
    userId: req.user.id,
    contentId: content.id,
    contentType: contentType,
    content: content,
    dateAdded: new Date()
  });
  
  // Send response back
  res.json({ success: true, item: newItem });
});
```

#### Step 5: Database Operation
```javascript
// MongoDB saves the document
{
  _id: "507f1f77bcf86cd799439011",
  userId: "user123",
  contentId: 550,
  contentType: "movie",
  content: { id: 550, title: "Fight Club", ... },
  dateAdded: "2024-01-15T10:30:00Z",
  status: "notStarted",
  progress: 0
}
```

#### Step 6: Response Back to Frontend
```json
{
  "success": true,
  "item": {
    "id": "507f1f77bcf86cd799439011",
    "contentId": 550,
    "contentType": "movie",
    ...
  }
}
```

#### Step 7: Frontend Updates UI
```javascript
// React component receives response
setMyList([...myList, response.item]);
// UI shows: "✓ Added to My List"
```

---

## 📁 File Structure Explained

### Frontend Files (Already Exists)
```
src/
├── services/
│   └── myListService.ts    ← Currently uses localStorage
│                          ← Will change to API calls
├── pages/
│   └── MyListPage.tsx     ← Uses myListService
└── components/
    └── AddToListButton.tsx ← Calls myListService
```

### Backend Files (We'll Create)
```
backend/
├── src/
│   ├── server.ts          ← Main entry point (starts server)
│   │
│   ├── config/
│   │   └── database.ts    ← Connects to MongoDB
│   │
│   ├── models/
│   │   ├── User.ts        ← User data structure
│   │   ├── MyList.ts      ← MyList data structure
│   │   └── Collection.ts  ← Collection data structure
│   │
│   ├── routes/
│   │   └── myListRoutes.ts ← API endpoints for MyList
│   │
│   └── controllers/
│       └── myListController.ts ← Business logic
│
├── package.json           ← Backend dependencies
├── tsconfig.json          ← TypeScript config
└── .env                   ← Environment variables (DB connection)
```

---

## 🔌 How Frontend and Backend Communicate

### HTTP Methods Explained

| Method | Purpose | Example |
|--------|---------|---------|
| **GET** | Retrieve data | Get user's list |
| **POST** | Create new data | Add movie to list |
| **PUT** | Update existing data | Update movie status |
| **DELETE** | Remove data | Remove movie from list |

### API Endpoints We'll Create

```
Base URL: http://localhost:3000/api

GET    /my-list              → Get all items in user's list
POST   /my-list/add          → Add new item to list
GET    /my-list/:id          → Get specific item
PUT    /my-list/:id          → Update item (status, progress, etc.)
DELETE /my-list/:id          → Remove item from list
POST   /my-list/toggle-like  → Like/unlike content
GET    /my-list/stats        → Get list statistics
GET    /my-list/search       → Search items in list
```

### Example API Call

**Frontend Code:**
```javascript
// Get user's list
const response = await fetch('http://localhost:3000/api/my-list');
const myList = await response.json();
```

**Backend Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "contentId": 550,
      "contentType": "movie",
      "content": {
        "id": 550,
        "title": "Fight Club",
        "poster_path": "/path/to/poster.jpg"
      },
      "status": "inProgress",
      "progress": 45
    }
  ]
}
```

---

## 🗄️ Database Structure (MongoDB Collections)

### Collection: `users`
```javascript
{
  _id: ObjectId("..."),
  email: "user@example.com",
  name: "John Doe",
  createdAt: "2024-01-15T10:00:00Z"
}
```

### Collection: `mylist`
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),  // Links to user
  contentId: 550,
  contentType: "movie",
  content: {
    id: 550,
    title: "Fight Club",
    poster_path: "/path/to/poster.jpg",
    // ... full movie data
  },
  status: "inProgress",
  progress: 45,
  dateAdded: "2024-01-15T10:00:00Z",
  isLiked: true,
  customTags: ["action", "thriller"]
}
```

### Collection: `collections`
```javascript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  name: "Action Movies",
  description: "My favorite action films",
  items: [ObjectId("..."), ObjectId("...")], // References to myList items
  createdAt: "2024-01-15T10:00:00Z"
}
```

---

## 🔐 Data Flow Security (Simple Version)

### Current (No Security - For Learning)
```
Frontend → Backend → Database
(No authentication, anyone can access)
```

### Future (With Authentication)
```
Frontend → [Login] → Backend → [Verify User] → Database
(Each user only sees their own data)
```

For now, we'll keep it simple. Later we can add:
- User registration/login
- JWT tokens (secure sessions)
- Password hashing
- User-specific data filtering

---

## 🎯 Key Concepts to Remember

### 1. **Separation of Concerns**
- **Frontend**: Handles UI and user interaction
- **Backend**: Handles business logic and data processing
- **Database**: Stores data permanently

### 2. **API (Application Programming Interface)**
- Think of it as a menu at a restaurant
- Frontend orders from the menu (API endpoints)
- Backend prepares the order (processes request)
- Database serves the ingredients (provides data)

### 3. **RESTful API**
- Standard way to structure API endpoints
- Uses HTTP methods (GET, POST, PUT, DELETE)
- Each endpoint has a specific purpose

### 4. **Asynchronous Operations**
- Frontend sends request and waits for response
- Backend processes request and sends response
- Uses `async/await` or Promises in JavaScript

---

## 🚦 Status Codes (HTTP Responses)

When backend responds, it includes a status code:

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Item retrieved successfully |
| 201 | Created | New item created |
| 400 | Bad Request | Invalid data sent |
| 404 | Not Found | Item doesn't exist |
| 500 | Server Error | Something went wrong on server |

---

## 💡 Why This Architecture?

### Benefits:
1. **Scalability**: Can handle many users
2. **Maintainability**: Easy to update and fix
3. **Security**: Can add authentication later
4. **Performance**: Backend can cache and optimize
5. **Flexibility**: Easy to add new features

### Trade-offs:
- More complex than localStorage
- Need to run two servers (frontend + backend)
- Requires database setup
- More code to maintain

**But the benefits far outweigh the complexity!**

---

## 🎓 Next Steps

1. **Understand the flow**: Frontend → Backend → Database
2. **Know the purpose**: Each part has a specific job
3. **Be patient**: It's a lot to learn, but we'll go step by step

**Ready to start coding?** Let me know when you're ready, and we'll begin with Phase 1!

