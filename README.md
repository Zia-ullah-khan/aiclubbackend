# AI Club OS Backend

A TypeScript/Express backend service for AI Club OS providing:
- **User Authentication** (JWT-based)
- **VM Management** (Docker container provisioning)
- **File System Access** (Secure user file storage)
- **Admin Dashboard API** (User & system management)
- **WebSocket Terminal** (Real-time container access)

## Prerequisites

1. **Node.js** v18+ 
2. **MongoDB** (local or cloud)
3. **Docker Desktop for Windows** (with daemon running)

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   # Edit .env file with your settings
   cp .env.example .env
   ```

3. **Create storage directory**:
   ```bash
   mkdir -p C:/Projects/aiclub_data/users
   ```

4. **Start MongoDB** (if local):
   ```bash
   mongod
   ```

5. **Create admin user**:
   ```bash
   npm run seed:admin
   ```

6. **Start development server**:
   ```bash
   npm run dev
   ```

---

## API Reference

All API endpoints return JSON. Authenticated routes require `Authorization: Bearer <token>` header.

### Base URL
```
http://localhost:3001
```

---

## Authentication Endpoints

### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "johndoe"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "member",
    "credits": 100
  }
}
```

**Errors:**
- `400` - Missing required fields or password too short
- `409` - Email already registered or username taken

---

### `POST /api/auth/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "member",
    "credits": 100,
    "image": null
  }
}
```

**Errors:**
- `400` - Missing email or password
- `401` - Invalid credentials

---

### `GET /api/auth/me` 🔒
Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "member",
    "credits": 100,
    "image": null,
    "storageUsed": 1048576,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### `PATCH /api/auth/me` 🔒
Update current user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "newusername",
  "image": "https://example.com/avatar.png"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "username": "newusername",
    "role": "member",
    "credits": 100,
    "image": "https://example.com/avatar.png"
  }
}
```

**Errors:**
- `409` - Username already taken

---

### `POST /api/auth/change-password` 🔒
Change the current user's password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newsecurepassword456"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

**Errors:**
- `400` - Missing passwords or new password too short
- `401` - Current password is incorrect

---

## VM Management Endpoints

### `GET /api/vms` 🔒
List all VMs owned by the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "vms": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "my-dev-vm",
      "status": "running",
      "sshPort": 30001,
      "image": "ubuntu:22.04",
      "ipAddress": "172.17.0.2",
      "memoryLimit": 536870912,
      "totalRuntime": 3600,
      "creditsConsumed": 10,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### `POST /api/vms/provision` 🔒
Create and start a new VM (Docker container).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "my-new-vm",
  "image": "ubuntu:22.04",
  "memoryLimit": 536870912
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | VM name (alphanumeric + hyphens only) |
| `image` | string | No | Docker image (default: ubuntu:22.04) |
| `memoryLimit` | number | No | Memory limit in bytes (default: 512MB) |

**Response (201 Created):**
```json
{
  "message": "VM provisioned successfully",
  "vm": {
    "id": "507f1f77bcf86cd799439011",
    "name": "my-new-vm",
    "status": "running",
    "sshPort": 30002,
    "image": "ubuntu:22.04",
    "ipAddress": "172.17.0.3"
  }
}
```

**Errors:**
- `400` - Invalid VM name, max VMs reached, or insufficient credits

---

### `GET /api/vms/:id` 🔒
Get details of a specific VM.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "vm": {
    "id": "507f1f77bcf86cd799439011",
    "name": "my-dev-vm",
    "status": "running",
    "sshPort": 30001,
    "image": "ubuntu:22.04",
    "ipAddress": "172.17.0.2",
    "memoryLimit": 536870912,
    "totalRuntime": 3600,
    "creditsConsumed": 10,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "containerStatus": {
    "running": true,
    "status": "running",
    "startedAt": "2024-01-15T10:30:00.000Z",
    "pid": 12345
  }
}
```

**Errors:**
- `404` - VM not found

---

### `POST /api/vms/:id/start` 🔒
Start a stopped VM.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "VM started",
  "vm": {
    "id": "507f1f77bcf86cd799439011",
    "name": "my-dev-vm",
    "status": "running"
  }
}
```

**Errors:**
- `400` - VM already running, terminated, or insufficient credits
- `404` - VM not found

---

### `POST /api/vms/:id/stop` 🔒
Stop a running VM. Credits are deducted based on runtime.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "VM stopped",
  "vm": {
    "id": "507f1f77bcf86cd799439011",
    "name": "my-dev-vm",
    "status": "stopped",
    "creditsConsumed": 15
  }
}
```

**Errors:**
- `400` - VM is not running
- `404` - VM not found

---

### `DELETE /api/vms/:id` 🔒
Terminate and permanently remove a VM.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "VM terminated"
}
```

**Errors:**
- `404` - VM not found

---

### `POST /api/vms/:id/exec` 🔒
Execute a command inside a running VM.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "command": ["ls", "-la", "/workspace"]
}
```

**Response (200 OK):**
```json
{
  "output": "total 8\ndrwxr-xr-x 2 user user 4096 Jan 15 10:30 .\ndrwxr-xr-x 3 root root 4096 Jan 15 10:30 ..",
  "exitCode": 0
}
```

**Errors:**
- `400` - Missing command array or VM not running
- `404` - VM not found

---

## File System Endpoints

### `GET /api/files` 🔒
List contents of a directory.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | No | Relative path (default: root) |

**Example:** `GET /api/files?path=projects/myapp`

**Response (200 OK):**
```json
{
  "currentPath": "projects/myapp",
  "files": [
    {
      "name": "index.js",
      "path": "projects/myapp/index.js",
      "isDirectory": false,
      "size": 1024,
      "modifiedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-14T08:00:00.000Z"
    },
    {
      "name": "src",
      "path": "projects/myapp/src",
      "isDirectory": true,
      "size": 0,
      "modifiedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-14T08:00:00.000Z"
    }
  ],
  "totalSize": 10240
}
```

---

### `GET /api/files/content` 🔒
Read the contents of a file.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative path to file |

**Example:** `GET /api/files/content?path=projects/myapp/index.js`

**Response (200 OK):**
```json
{
  "content": "console.log('Hello World');",
  "encoding": "utf-8"
}
```

**Errors:**
- `400` - Path is a directory or file too large (>5MB)
- `404` - File not found

---

### `POST /api/files/content` 🔒
Write content to a file (creates if doesn't exist).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "path": "projects/myapp/newfile.js",
  "content": "// New file content\nconsole.log('Hello');"
}
```

**Response (200 OK):**
```json
{
  "message": "File saved",
  "file": {
    "name": "newfile.js",
    "path": "projects/myapp/newfile.js",
    "isDirectory": false,
    "size": 45,
    "modifiedAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### `POST /api/files/directory` 🔒
Create a new directory.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "path": "projects/newproject"
}
```

**Response (201 Created):**
```json
{
  "message": "Directory created",
  "directory": {
    "name": "newproject",
    "path": "projects/newproject",
    "isDirectory": true,
    "size": 0,
    "modifiedAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `400` - Path already exists

---

### `DELETE /api/files` 🔒
Delete a file or directory (recursive).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Relative path to delete |

**Example:** `DELETE /api/files?path=projects/oldproject`

**Response (200 OK):**
```json
{
  "message": "Item deleted"
}
```

---

### `POST /api/files/rename` 🔒
Rename or move a file/directory.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "oldPath": "projects/myapp/old-name.js",
  "newPath": "projects/myapp/new-name.js"
}
```

**Response (200 OK):**
```json
{
  "message": "Item renamed",
  "item": {
    "name": "new-name.js",
    "path": "projects/myapp/new-name.js",
    "isDirectory": false,
    "size": 1024,
    "modifiedAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-14T08:00:00.000Z"
  }
}
```

---

### `POST /api/files/copy` 🔒
Copy a file or directory.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "sourcePath": "projects/myapp/template.js",
  "destPath": "projects/myapp/copy-of-template.js"
}
```

**Response (200 OK):**
```json
{
  "message": "Item copied",
  "item": {
    "name": "copy-of-template.js",
    "path": "projects/myapp/copy-of-template.js",
    "isDirectory": false,
    "size": 1024,
    "modifiedAt": "2024-01-15T10:30:00.000Z",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### `GET /api/files/search` 🔒
Search for files by name.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search term |
| `basePath` | string | No | Base directory to search in |

**Example:** `GET /api/files/search?query=index&basePath=projects`

**Response (200 OK):**
```json
{
  "results": [
    {
      "name": "index.js",
      "path": "projects/myapp/index.js",
      "isDirectory": false,
      "size": 1024,
      "modifiedAt": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-14T08:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/files/storage` 🔒
Get user's storage usage statistics.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "used": 52428800,
  "limit": 1073741824,
  "percentage": 5
}
```

---

## Credits Endpoints

### `GET /api/credits` 🔒
Get current user's credit balance.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "credits": 100,
  "role": "member"
}
```

---

### `GET /api/credits/requests` 🔒
List current user's credit requests.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "requests": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": "507f1f77bcf86cd799439012",
      "amount": 50,
      "reason": "Need more credits for my project",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### `POST /api/credits/request` 🔒
Submit a request for more credits (admin approval required).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 50,
  "reason": "I need more credits for my machine learning project that requires extended VM runtime."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Credits requested (1-1000) |
| `reason` | string | Yes | Reason for request (min 10 chars) |

**Response (201 Created):**
```json
{
  "message": "Credit request submitted",
  "request": {
    "id": "507f1f77bcf86cd799439011",
    "amount": 50,
    "reason": "I need more credits for my machine learning project...",
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
- `400` - Invalid amount, reason too short, or too many pending requests (max 3)

---

### `DELETE /api/credits/requests/:id` 🔒
Cancel a pending credit request.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Credit request cancelled"
}
```

**Errors:**
- `404` - Pending request not found

---

## Admin Endpoints 🔒👑

All admin endpoints require authentication AND admin role.

### `GET /api/admin/users`
List all registered users with pagination.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |

**Response (200 OK):**
```json
{
  "users": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "member",
      "credits": 100,
      "storageUsed": 1048576,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### `GET /api/admin/users/:id`
Get detailed information about a specific user and their VMs.

**Response (200 OK):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "member",
    "credits": 100,
    "storageUsed": 1048576,
    "createdAt": "2024-01-15T10:30:00.000Z"
  },
  "vms": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "dev-vm",
      "status": "running",
      "sshPort": 30001
    }
  ]
}
```

---

### `PATCH /api/admin/users/:id`
Update a user's role or credits.

**Request Body:**
```json
{
  "role": "admin",
  "credits": 500
}
```

**Response (200 OK):**
```json
{
  "message": "User updated",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "role": "admin",
    "credits": 500
  }
}
```

---

### `PATCH /api/admin/users/:id/credits`
Add or remove credits from a user.

**Request Body:**
```json
{
  "amount": 50,
  "operation": "add"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Amount of credits |
| `operation` | string | Yes | "add" or "remove" |

**Response (200 OK):**
```json
{
  "message": "Credits added",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "credits": 150
  }
}
```

---

### `DELETE /api/admin/users/:id`
Delete a user and terminate all their VMs.

**Response (200 OK):**
```json
{
  "message": "User deleted"
}
```

**Errors:**
- `400` - Cannot delete your own account

---

### `GET /api/admin/vms`
List all VMs across all users.

**Response (200 OK):**
```json
{
  "vms": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "ownerId": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "name": "dev-vm",
      "status": "running",
      "sshPort": 30001,
      "image": "ubuntu:22.04"
    }
  ]
}
```

---

### `GET /api/admin/containers`
List all Docker containers on the host machine.

**Response (200 OK):**
```json
{
  "containers": [
    {
      "Id": "abc123def456...",
      "Names": ["/aiclub-user123-myvm-1234567890"],
      "Image": "ubuntu:22.04",
      "State": "running",
      "Status": "Up 2 hours"
    }
  ]
}
```

---

### `POST /api/admin/containers/:id/stop`
Emergency stop a container.

**Response (200 OK):**
```json
{
  "message": "Container stopped"
}
```

---

### `DELETE /api/admin/containers/:id`
Force remove a container.

**Response (200 OK):**
```json
{
  "message": "Container removed"
}
```

---

### `GET /api/admin/credit-requests`
List all credit requests.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status: "pending", "approved", "denied" |

**Response (200 OK):**
```json
{
  "requests": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "userId": {
        "_id": "507f1f77bcf86cd799439012",
        "username": "johndoe",
        "email": "john@example.com"
      },
      "amount": 50,
      "reason": "Need more credits for my project",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/admin/credit-requests/:id`
Approve or deny a credit request.

**Request Body:**
```json
{
  "action": "approve",
  "note": "Approved for educational project"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | "approve" or "deny" |
| `note` | string | No | Admin note |

**Response (200 OK):**
```json
{
  "message": "Credit request approved",
  "request": {
    "_id": "507f1f77bcf86cd799439011",
    "status": "approved",
    "reviewedBy": "507f1f77bcf86cd799439013",
    "reviewedAt": "2024-01-15T11:00:00.000Z",
    "reviewNote": "Approved for educational project"
  }
}
```

---

### `GET /api/admin/docker/info`
Get Docker system information.

**Response (200 OK):**
```json
{
  "info": {
    "Containers": 5,
    "ContainersRunning": 3,
    "ContainersPaused": 0,
    "ContainersStopped": 2,
    "Images": 10,
    "MemTotal": 17179869184,
    "NCPU": 8
  }
}
```

---

### `GET /api/admin/docker/ping`
Check Docker daemon connection status.

**Response (200 OK):**
```json
{
  "connected": true
}
```

---

### `GET /api/admin/stats`
Get system-wide statistics.

**Response (200 OK):**
```json
{
  "stats": {
    "totalUsers": 50,
    "totalVMs": 25,
    "runningVMs": 10,
    "pendingRequests": 3
  }
}
```

---

## WebSocket Endpoints

### `WS /ws/terminal`
Real-time terminal connection to a VM container.

**Connection URL:**
```
ws://localhost:3001/ws/terminal?token=<JWT_TOKEN>&vmId=<VM_ID>
```

**Incoming Messages (from server):**
```json
// Connection established
{ "type": "connected", "message": "Terminal connected to VM" }

// Terminal output
{ "type": "output", "data": "user@container:~$ " }

// Disconnection
{ "type": "disconnect", "message": "Container stream ended" }

// Error
{ "type": "error", "message": "Failed to connect to VM" }

// Pong (heartbeat response)
{ "type": "pong" }
```

**Outgoing Messages (from client):**
```json
// Send keyboard input
{ "type": "input", "data": "ls -la\n" }

// Terminal resize (optional)
{ "type": "resize", "cols": 80, "rows": 24 }

// Ping (heartbeat)
{ "type": "ping" }
```

---

## Health Check

### `GET /health`
Check server and Docker daemon status.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "aiclub-backend",
  "docker": "connected"
}
```

---

## Error Responses

All endpoints may return these error formats:

```json
{
  "error": "Description of what went wrong"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation error, missing fields)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

---

## Security Features

- **Path Traversal Protection**: All file operations validate paths
- **Container Isolation**: VMs run with dropped capabilities
- **Resource Limits**: Memory (512MB) and PID limits (100) on containers
- **Volume Restrictions**: Only user-specific folders mounted
- **JWT Authentication**: Stateless, secure token auth (7-day expiry)
- **Password Hashing**: bcrypt with 12 salt rounds

---

## Default Admin Credentials

After running `npm run seed:admin`:
- **Email**: admin@aiclub.local
- **Password**: admin123

⚠️ **Change immediately in production!**

---

## Scripts

```bash
npm run dev        # Start development server with hot reload
npm run build      # Compile TypeScript to JavaScript
npm run start      # Run compiled JavaScript
npm run seed:admin # Create initial admin user
```

---

## Project Structure

```
src/
├── config/          # Configuration
├── lib/             # Utility libraries
│   ├── database.ts  # MongoDB connection
│   └── security.ts  # Path validation utilities
├── middleware/      # Express middleware
│   └── auth.ts      # JWT authentication
├── models/          # Mongoose schemas
│   ├── User.ts
│   ├── VM.ts
│   └── CreditRequest.ts
├── routes/          # API routes
│   ├── auth.routes.ts
│   ├── vm.routes.ts
│   ├── files.routes.ts
│   ├── credits.routes.ts
│   └── admin.routes.ts
├── services/        # Business logic
│   ├── docker.service.ts
│   └── filesystem.service.ts
├── websocket/       # WebSocket handlers
│   └── terminal.ts
└── index.ts         # Entry point
```

---

## License

ISC
