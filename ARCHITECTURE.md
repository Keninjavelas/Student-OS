# Student OS - System Architecture Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Request Flow](#request-flow)
3. [Data Models](#data-models)
4. [Security Architecture](#security-architecture)
5. [Deployment Architecture](#deployment-architecture)
6. [Scaling & Performance](#scaling--performance)
7. [Disaster Recovery](#disaster-recovery)

---

## System Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React SPA (React 18, Redux, React Router, Vite)    │   │
│  │  - Component hierarchy: App → MainLayout → Pages    │   │
│  │  - State management: Redux slices for auth/data     │   │
│  │  - Error boundaries for graceful error handling     │   │
│  │  - Service layer for API calls (apiClient.js)       │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬──────────────────────────────────────┘
                         │ HTTPS (REST JSON)
┌────────────────────────▼──────────────────────────────────────┐
│                   API GATEWAY LAYER                           │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Load Balancer (ALB/LB/LB)                          │    │
│  │  - SSL/TLS termination                              │    │
│  │  - Path-based routing (backend/ai/admin)            │    │
│  │  - Health checks (active/passive)                   │    │
│  │  - DDoS protection                                  │    │
│  └──────────────────────────────────────────────────────┘    │
└────────────────┬──────────────────────────┬────────────────────┘
                 │                          │
                 ▼                          ▼
┌─────────────────────────────┐  ┌───────────────────────────┐
│      APPLICATION LAYER      │  │  AI SERVICE LAYER         │
│  ┌──────────────────────┐   │  │  ┌──────────────────────┐ │
│  │  Express.js Backend  │   │  │  │  FastAPI + uvicorn   │ │
│  │  - Middleware Chain  │   │  │  │  - Request validation│ │
│  │  - Route Handlers    │   │  │  │  - ML Models (sklearn)
│  │  - Business Logic    │   │  │  │  - Structured Logging│ │
│  │  - Error Handling    │   │  │  │  - Health checks     │ │
│  └──────────────────────┘   │  │  └──────────────────────┘ │
└────────────────┬─────────────┘  └────────────┬────────────────┘
                 │                             │
                 └─────────────┬────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    DATA LAYER                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MongoDB Atlas                                       │   │
│  │  - User collection (authentication, profile)        │   │
│  │  - StudentProfile collection (skills, resumes)      │   │
│  │  - Indexes: compound, sparse, text                  │   │
│  │  - Replication: multi-region                        │   │
│  │  - Backups: automated, point-in-time recovery       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Object Storage (S3/Blob/GCS)                       │   │
│  │  - Resume files, profile pictures                   │   │
│  │  - Versioning enabled, lifecycle policies           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Middleware Pipeline (Backend)

Request flows through ordered middleware chain:

```
Client Request
    │
    ▼
[1] Logging Middleware ────────────────────► Trace ID generation, request logging
    │
    ▼
[2] Body Parser ───────────────────────────► JSON/URL-encoded parsing
    │
    ▼
[3] CORS Middleware ───────────────────────► Origin validation
    │
    ▼
[4] Security Headers (Helmet) ─────────────► CSP, HSTS, X-Frame-Options
    │
    ▼
[5] XSS Protection ────────────────────────► Input sanitization
    │
    ▼
[6] Rate Limiting ─────────────────────────► Request throttling per endpoint
    │
    ▼
[7] Cookie Parser ─────────────────────────► Parse JWT from cookies
    │
    ▼
[8] Route Handlers ────────────────────────► Auth validation, business logic
    │
    ├─► authMiddleware (JWT verification)
    ├─► roleMiddleware (RBAC check)
    ├─► validationMiddleware (Zod schemas)
    └─► asyncHandler (promise rejection wrapper)
    │
    ▼
[9] Error Handler ─────────────────────────► Error conversion, response formatting
    │
    ▼
[10] 404 Handler ──────────────────────────► Not found response
    │
    ▼
Client Response
```

---

## Request Flow

### User Registration Flow

```
1. Client sends POST /auth/register
   {
     "email": "user@example.com",
     "password": "SecurePass123!",
     "firstName": "John",
     "lastName": "Doe"
   }

2. Middleware chain:
   - Logging: Generate trace ID
   - Rate limiting: registerLimiter (10/hour by IP)
   - Validation: registerSchema validation
   
3. Route handler (/api/auth/register):
   - Check duplicate email
   - Hash password with bcryptjs (12 rounds)
   - Create User document
   - Create StudentProfile document
   - Generate access + refresh tokens
   - Set HttpOnly refresh cookie
   
4. Response:
   {
     "status": "success",
     "data": {
       "user": { id, email, firstName, lastName, role },
       "accessToken": "eyJ0eXAi...",
       "expiresIn": 900  // 15 minutes
     },
     "message": "Registration successful",
     "traceId": "uuid-string"
   }

5. Client stores:
   - accessToken in memory
   - refreshToken in HttpOnly cookie (automatic)
```

### Authenticated API Call Flow

```
1. Client sends GET /api/students/profile
   Headers: {
     "Authorization": "Bearer eyJ0eXAi...",
     "Cookie": "refreshToken=eyJ0eXAi..."
   }

2. authMiddleware:
   - Extract Bearer token
   - verifyAccessToken (JWT validation)
   - Token version check (logout invalidation)
   - Fetch User from MongoDB
   - Check isActive status
   - Attach req.user and req.auth
   
3. Route handler:
   - req.user available (current user)
   - Fetch StudentProfile for user
   - Apply filters/pagination
   
4. Response:
   {
     "status": "success",
     "data": { StudentProfile object },
     "message": "Profile retrieved",
     "traceId": "uuid-string"
   }
```

### Token Refresh Flow

```
1. Client detects 401 on API request (token expired)

2. Client sends POST /api/auth/refresh-token
   Body: {} (empty)
   Cookie: refreshToken=eyJ0eXAi...
   
3. refreshTokenEndpoint:
   - Extract refreshToken from cookie OR body
   - verifyRefreshToken (JWT validation)
   - Check jti (token ID) - prevent reuse
   - Fetch User from MongoDB
   - Generate new accessToken
   - Generate new refreshToken
   - Set new cookie
   
4. Response:
   {
     "status": "success",
     "data": {
       "accessToken": "new-token",
       "expiresIn": 900
     }
   }

5. Client retries original request with new accessToken
```

---

## Data Models

### User Schema

```javascript
{
  _id: ObjectId,
  
  // Authentication
  email: String (unique, indexed),
  password: String (bcrypted),
  
  // Profile
  firstName: String,
  lastName: String,
  avatar: String (optional),
  bio: String,
  phone: String,
  
  // Role & Status
  role: Enum ['student', 'admin', 'mentor'],
  isActive: Boolean (indexed),
  isEmailVerified: Boolean,
  
  // Email Verification
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  
  // Password Reset
  passwordResetToken: String,
  passwordResetExpires: Date,
  passwordChangedAt: Date,
  
  // Account Security
  loginAttempts: Number,
  lockUntil: Date,
  lastLogin: Date,
  loginHistory: [{
    ipAddress: String,
    userAgent: String,
    timestamp: Date,
    success: Boolean
  }],
  
  // Token Management
  tokenVersion: Number (default 0),
  
  // Preferences
  preferences: {
    emailNotifications: Boolean,
    twoFactorEnabled: Boolean
  },
  
  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { email, isActive } - Fast lookups by active users
- { role, isActive } - Filter by role
- { createdAt: -1 } - Recent users first
```

### StudentProfile Schema

```javascript
{
  _id: ObjectId,
  user: ObjectId (reference to User),
  
  // Academic Info
  academicInfo: {
    department: String (indexed),
    graduationYear: Number (indexed),
    gpa: Number,
    coursework: [String]
  },
  
  // Skill Inventory
  skillInventory: {
    technical: [{
      skillName: String,
      proficiencyLevel: Enum ['beginner', 'intermediate', 'advanced'],
      yearsOfExperience: Number,
      endorsements: Number,
      endorsedBy: [ObjectId],
      verificationStatus: Enum ['unverified', 'pending', 'verified'],
      verifiedAt: Date,
      certifications: [{
        name: String,
        issuer: String,
        issueDate: Date,
        expiryDate: Date,
        credentialUrl: String
      }]
    }],
    soft: [{
      skillName: String,
      proficiencyLevel: Enum ['beginner', 'intermediate', 'advanced'],
      endorsements: Number,
      endorsedBy: [ObjectId],
      verificationStatus: Enum ['unverified', 'pending', 'verified']
    }]
  },
  
  // Resumes
  resumes: [{
    _id: ObjectId,
    title: String,
    version: Number,
    fileUrl: String,
    fileSize: Number,
    uploadedAt: Date,
    isDefault: Boolean,
    sections: {
      personalInfo: { name, email, phone, location },
      summary: String,
      experience: [{
        title: String,
        company: String,
        startDate: Date,
        endDate: Date,
        description: String
      }],
      education: [{
        school: String,
        degree: String,
        field: String,
        graduationDate: Date
      }],
      projects: [{
        name: String,
        description: String,
        url: String,
        technologies: [String]
      }],
      certifications: [{
        name: String,
        issuer: String,
        issueDate: Date
      }]
    },
    aiAnalysis: {
      score: Number (0-100),
      feedback: String,
      suggestions: [String],
      strengths: [String],
      areasForImprovement: [String],
      analyzedAt: Date
    }
  }],
  
  // Mock Interviews
  mockInterviews: [{
    _id: ObjectId,
    title: String,
    type: Enum ['behavioral', 'technical', 'system-design'],
    difficulty: Enum ['easy', 'medium', 'hard'],
    status: Enum ['scheduled', 'in-progress', 'completed', 'cancelled'],
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    duration: Number (minutes),
    questions: [{
      questionText: String,
      questionType: Enum ['behavioral', 'coding', 'design'],
      timeLimit: Number (seconds)
    }],
    responses: [{
      questionId: ObjectId,
      response: String,
      duration: Number (seconds)
    }],
    feedback: {
      overallScore: Number (0-100),
      communicationScore: Number,
      technicalScore: Number,
      analyticalScore: Number,
      timeManagement: String,
      strengths: [String],
      areasForImprovement: [String],
      detailedFeedback: String,
      aiGeneratedAt: Date
    },
    mentorNotes: String,
    mentorId: ObjectId
  }],
  
  // Skill Tests
  skillTests: [{
    _id: ObjectId,
    skillName: String,
    testType: Enum ['quiz', 'coding-challenge', 'practical'],
    status: Enum ['not-started', 'in-progress', 'completed', 'passed', 'failed'],
    attemptNumber: Number,
    totalAttempts: Number,
    completedAt: Date,
    duration: Number (minutes),
    totalQuestions: Number,
    correctAnswers: Number,
    score: Number,
    percentageScore: Number,
    isPassed: Boolean,
    responses: [{
      questionId: ObjectId,
      answer: String,
      isCorrect: Boolean
    }],
    certificateUrl: String,
    certificateIssuedAt: Date
  }],
  
  // Scores & Metrics
  scores: {
    readinessScore: Number (0-100),
    dsaScore: Number,
    communicationScore: Number,
    overallScore: Number,
    lastUpdated: Date
  },
  
  // Placement Readiness
  placementReadiness: {
    status: Enum ['not-ready', 'in-progress', 'ready', 'placed'] (indexed),
    targetCTC: Number,
    preferredRoles: [String],
    preferredLocations: [String],
    availableFrom: Date,
    jobsApplied: Number,
    interviewsScheduled: Number,
    offersReceived: Number
  },
  
  // Badges & Achievements
  badges: [{
    badgeId: ObjectId,
    name: String,
    description: String,
    earnedAt: Date,
    imageUrl: String
  }],
  
  // User Preferences
  preferences: {
    profileVisibility: Enum ['private', 'limited', 'public'],
    allowContactFromCompanies: Boolean
  },
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date
}

Indexes:
- { user, department } - Find students by department
- { graduationYear } - Cohort filtering
- { placementReadiness.status } - Placement analytics
- { scores.readinessScore: -1 } - Rankings
- { createdAt: -1 } - Recent profiles
```

---

## Security Architecture

### Authentication & Authorization

```
Authentication (Who are you?)
├─ Registration
│  ├─ Email validation
│  ├─ Password requirements (8+ chars, bcrypt 12 rounds)
│  └─ Email verification token
│
├─ Login
│  ├─ Email + password verification
│  ├─ Account lockout (5 attempts = 30min lockout)
│  ├─ Login history tracking
│  └─ Generate JWT tokens
│
├─ JWT Tokens
│  ├─ Access Token (15min TTL, in-memory only)
│  ├─ Refresh Token (7day TTL, HttpOnly cookie)
│  └─ Token Version (invalidate on logout)
│
├─ Account Recovery
│  ├─ Password reset tokens (1-hour expiry)
│  ├─ Email verification tokens
│  └─ Security questions (future)
│
└─ Session Management
   ├─ HttpOnly cookies (prevent XSS)
   ├─ SameSite=strict (prevent CSRF)
   └─ Secure flag (HTTPS only)

Authorization (What can you do?)
├─ Role-Based Access Control (RBAC)
│  ├─ student: Read/create own resources
│  ├─ admin: Full access + analytics
│  └─ mentor: View assigned students
│
├─ Resource Ownership
│  ├─ Students can only edit own profile
│  ├─ Admins can edit any profile
│  └─ Owners check on all endpoints
│
└─ Permission Matrix
   ├─ Public: /auth/register, /auth/login
   ├─ Authenticated: /students/*, /profile/*
   ├─ Student: /students/resumes/*, /mock-interviews/*
   └─ Admin: /admin/analytics/*, /users/*
```

### Network & Infrastructure Security

```
Defense in Depth Strategy:

[Internet] 
    │
    ▼
[WAF] ──────────── DDoS protection, rate limiting
    │
    ▼
[CloudFront/CDN] ─ Caching, geo-blocking, bot protection
    │
    ▼
[ALB/LB] ────────── SSL/TLS termination, health checks
    │
    ▼
[Security Groups] ─ Inbound rules (port 443 only)
    │              Outbound rules (MongoDB, AI service only)
    │
    ├─► Backend Service (private subnet)
    ├─► AI Service (private subnet)
    │
    ▼
[Database] ──────── Encryption at rest, in transit
    │              Private subnet, no public IP
    │              IP whitelist from backend only
    │
    ▼
[Secrets Manager] ─ Encrypted key storage
                  Automatic rotation
```

### Data Security

```
Data Lifecycle:

In Transit:
├─ HTTPS/TLS 1.3 for all connections
├─ Certificate pinning (optional)
└─ Mutual TLS for service-to-service

At Rest:
├─ Database encryption (MongoDB)
├─ Encrypted secrets (AWS Secrets Manager)
├─ Object storage encryption (S3 SSE-S3)
└─ Encrypted backups

In Memory:
├─ AccessToken NOT stored (memory only)
├─ RefreshToken in HttpOnly cookie
├─ Passwords hashed with bcrypt
└─ Sensitive data redacted from logs

Data Retention:
├─ Logs: 30 days (configurable)
├─ Backups: 7 days
├─ Audit trail: 90 days
└─ User data: Until account deletion + 30 days
```

---

## Deployment Architecture

### Cloud Deployment (AWS Example)

```
┌────────────────────────────────────────────────────────────┐
│                    AWS ACCOUNT                              │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  VPC (10.0.0.0/16)                                 │   │
│  │  ┌─────────────────┬─────────────────┐             │   │
│  │  │ Public Subnet   │ Private Subnet  │             │   │
│  │  │ (AZ-1)          │ (AZ-1)          │             │   │
│  │  │                 │                 │             │   │
│  │  │ ┌────────────┐  │ ┌────────────┐ │             │   │
│  │  │ │ NAT GW     │  │ │ Backend #1 │ │             │   │
│  │  │ └────────────┘  │ │ (ECS)      │ │             │   │
│  │  │                 │ └────────────┘ │             │   │
│  │  │ ┌────────────┐  │ ┌────────────┐ │             │   │
│  │  │ │ ALB        │  │ │ Backend #2 │ │             │   │
│  │  │ └────────────┘  │ │ (ECS)      │ │             │   │
│  │  │                 │ └────────────┘ │             │   │
│  │  │                 │                 │             │   │
│  │  │                 │ ┌────────────┐ │             │   │
│  │  │                 │ │ AI Service │ │             │   │
│  │  │                 │ │ (ECS)      │ │             │   │
│  │  │                 │ └────────────┘ │             │   │
│  │  └─────────────────┴─────────────────┘             │   │
│  │                                                     │   │
│  │  ┌──────────────────────────────────────────────┐  │   │
│  │  │ Private Subnet (AZ-2)                        │  │   │
│  │  │ ┌─────────────┐  ┌──────────────┐            │  │   │
│  │  │ │ Backend #3  │  │ AI Service#2 │            │  │   │
│  │  │ │ (ECS)       │  │ (ECS)        │            │  │   │
│  │  │ └─────────────┘  └──────────────┘            │  │   │
│  │  └──────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ Database Subnet Group                       │   │   │
│  │  │ ┌──────────────────────────────────────────┐   │   │
│  │  │ │ MongoDB Atlas (Multi-region)             │   │   │
│  │  │ └──────────────────────────────────────────┘   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Storage & CDN Layer                                │   │
│  │ ┌──────────────┐        ┌──────────────────────┐   │   │
│  │ │ S3 Bucket    │───────│ CloudFront (CDN)     │   │   │
│  │ │ (Frontend)   │        │ (Global)             │   │   │
│  │ └──────────────┘        └──────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Management & Monitoring                             │  │
│  │ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │ │ CloudWatch│ │ ECR      │ │ Secrets  │             │  │
│  │ │ (Logs)    │ │ (Images) │ │ Manager  │             │  │
│  │ └──────────┘ └──────────┘ └──────────┘             │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Service Topology

```
Frontend (React SPA)
└─ /app
   ├─ components/
   ├─ pages/
   ├─ services/ (apiClient.js)
   └─ store/ (Redux)

Backend (Node.js/Express)
└─ /api
   ├─ /auth (public endpoints)
   ├─ /students (student endpoints)
   ├─ /profile (student profile)
   ├─ /admin (admin endpoints)
   └─ /health (health checks)

AI Service (Python/FastAPI)
└─ /ai
   ├─ /health (health check)
   ├─ /ready (readiness check)
   ├─ /predict-readiness (POST)
   └─ /analyze-resume (POST)

Health Check Endpoints (for load balancers):
├─ Backend: GET /health → {status: 'ok'} (200)
├─ Backend: GET /ready → {status: 'ready'} (200/503)
├─ AI Service: GET /health → {status: 'ok'} (200)
└─ AI Service: GET /ready → {status: 'ready'} (200/503)
```

---

## Scaling & Performance

### Horizontal Scaling

```
Load Balancer
    │
    ├─► Backend Instance #1 (CPU: 512m, RAM: 1GB)
    ├─► Backend Instance #2 (CPU: 512m, RAM: 1GB)
    ├─► Backend Instance #3 (CPU: 512m, RAM: 1GB)
    └─► Backend Instance #N (dynamic)

Autoscaling Policy:
- Min replicas: 2
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%
- Scale up threshold: 2 min average > 70% CPU
- Scale down threshold: 5 min average < 30% CPU
```

### Database Optimization

```
Query Optimization:
├─ Connection pooling: 100 connections per replica
├─ Query caching: Redis (future enhancement)
├─ Database indexes:
│  ├─ Single field: email, role, createdAt
│  ├─ Compound: {email, isActive}, {graduationYear, placementReadiness.status}
│  └─ Text: student profiles for search
├─ Pagination: 20 items/page default, max 100
└─ Lazy loading: Nested objects fetched on demand

Replication:
├─ MongoDB Atlas: 3-node replica set
├─ Automatic failover: <30 seconds
├─ Backup: Continuous, 7-day retention
└─ Multi-region: Global write capability (future)
```

### Performance Targets

```
API Response Times (Target):
├─ GET /health: < 50ms
├─ GET /ready: < 100ms
├─ POST /auth/login: < 500ms (includes password hashing)
├─ GET /students/profile: < 200ms
├─ POST /mock-interviews: < 300ms
├─ GET /admin/analytics: < 1000ms (complex aggregation)
└─ POST /ai/analyze-resume: < 5000ms (ML processing)

Performance Benchmarks:
├─ p50 latency: < 100ms
├─ p95 latency: < 500ms
├─ p99 latency: < 1000ms
├─ Error rate: < 0.1%
└─ Availability: 99.9% uptime
```

---

## Disaster Recovery

### Backup Strategy

```
Database Backups:
├─ Frequency: Continuous + hourly snapshots
├─ Retention: 7 days (configurable)
├─ Location: Multiple regions
├─ RPO: < 1 hour
├─ RTO: < 15 minutes
└─ Testing: Monthly restore test

Code Backups:
├─ Version control: GitHub (distributed)
├─ Branch protection: main requires PR review
├─ Release tags: Semantic versioning
└─ Release artifacts: Docker images in registries

Configuration Backups:
├─ IaC (Terraform): Version controlled
├─ Secrets: Encrypted, separate from code
├─ Monitoring configs: Exported regularly
└─ DNS records: Multi-provider setup
```

### Failover Procedures

```
Database Failover:
1. Detect primary failure
2. Automatic failover to secondary (MongoDB Atlas)
3. Verify replica synchronization
4. Resume connections (applications auto-reconnect)
5. Post-incident: promote secondary, rebuild primary

Backend Service Failure:
1. Load balancer detects unhealthy instance
2. Remove from rotation
3. Auto-scaling policy triggers new instance
4. New instance becomes healthy, joins rotation
5. Failed instance stopped and investigated

Regional Failure:
1. Traffic re-routes to healthy region
2. Database replicates from backup
3. Services provisioned in failover region
4. DNS updated to point to failover
5. Original region restored and synced
```

### Incident Response

```
Severity Levels:

P1 (Critical): Service down, data loss
├─ Response time: < 5 min
├─ Escalation: On-call engineer, managers
└─ Action: Activate disaster recovery

P2 (High): Degraded performance, partial outage
├─ Response time: < 15 min
├─ Escalation: Team lead, engineering
└─ Action: Investigate and mitigate

P3 (Medium): Minor issues, edge cases
├─ Response time: < 1 hour
└─ Action: Plan fix in sprint

P4 (Low): Documentation, polish
├─ Response time: Best effort
└─ Action: Schedule for future work
```

---

## Monitoring & Observability

### Metrics Collection

```
Application Metrics:
├─ Request rate: Requests/sec by endpoint
├─ Error rate: Errors/sec by status code
├─ Latency: p50, p95, p99 by endpoint
├─ Throughput: MB/sec
└─ Active connections: Current count

Business Metrics:
├─ User registrations: Count/day
├─ Skill completions: Count/day
├─ Mock interviews: Count/month
├─ Resume uploads: Count/month
└─ Placement readiness: Distribution

Infrastructure Metrics:
├─ CPU utilization: Per container
├─ Memory utilization: Per container
├─ Disk usage: Per volume
├─ Network I/O: Ingress/egress
└─ Database connections: Pool utilization
```

### Alerting Rules

```
Alert Thresholds:

High Error Rate:
├─ Condition: > 1% error rate for 5 min
├─ Severity: P1
└─ Action: Page on-call engineer

High Latency:
├─ Condition: p99 > 1000ms for 5 min
├─ Severity: P2
└─ Action: Notify engineering team

Low Availability:
├─ Condition: < 99% uptime over 1 hour
├─ Severity: P1
└─ Action: Page on-call + escalate

Database Issues:
├─ Condition: Connection pool > 90%, replication lag > 30s
├─ Severity: P1
└─ Action: Page DBA + engineering

High Resource Usage:
├─ Condition: CPU > 80%, Memory > 85%
├─ Severity: P2
└─ Action: Trigger auto-scaling, notify team
```

---

## Architecture Decision Records (ADRs)

### ADR-1: Token Storage Strategy

**Decision**: Access tokens in-memory, refresh tokens in HttpOnly cookies

**Rationale**:
- HttpOnly cookies prevent XSS attacks
- Access tokens short-lived (15 min) = low theft risk
- Token version for logout invalidation = no token blacklist needed
- Simpler than Redis token cache

### ADR-2: Database Choice

**Decision**: MongoDB Atlas

**Rationale**:
- Flexible schema for evolving student profiles
- Document-based fits nested structures (skills, resumes)
- Atlas provides enterprise features (backup, replication)
- Indexing supports required query patterns

### ADR-3: Microservices Boundary

**Decision**: Separate AI Service via HTTP, not shared library

**Rationale**:
- Independent scaling (AI heavy, separate resources)
- Language flexibility (Python for ML)
- Fault isolation (AI failures don't crash API)
- Future: Can scale to separate team

### ADR-4: Rate Limiting Implementation

**Decision**: In-memory Map store for development, Redis for production

**Rationale**:
- Development: Simple, no external dependency
- Production: Redis scales across instances
- Same interface allows easy swap
- Future-proof without architectural change

---

## Performance Optimization Checklist

- [ ] Database indexes on all frequently queried fields
- [ ] Connection pooling: MongoDB and HTTP clients
- [ ] Caching: Static assets (CDN), API responses (Redis)
- [ ] Pagination: All list endpoints support limit/offset
- [ ] Lazy loading: Nested objects only when requested
- [ ] Compression: gzip for responses > 1KB
- [ ] Load balancing: Health checks every 30s
- [ ] Monitoring: p95/p99 latency tracked
- [ ] Alerting: Latency thresholds with auto-remediation
- [ ] Profiling: Regular performance testing
