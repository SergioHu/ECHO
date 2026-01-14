# Echo Backend Security Requirements

## Overview

This document outlines the security requirements for the Echo backend implementation. These requirements are **CRITICAL** for production and must be implemented before launch.

---

## 1. Photo Review Access Control

### Context
The Admin Dashboard grants access to view **REPORTED PHOTOS**. This is sensitive content that requires strict access control.

### Current State (Development)
- Access controlled by simple `isAdmin: true/false` flag in front-end
- No backend verification
- **NOT PRODUCTION READY**

### Production Requirements

#### 1.1 Role-Based Access Control (RBAC)

```
User Roles:
├── user (default)
│   └── Cannot access photo review
├── reviewer
│   └── Can view and resolve disputes
│   └── Can approve/reject reported photos
│   └── Cannot manage users
└── admin
    └── Full access to photo review
    └── Can manage users
    └── Can view analytics
```

**Database Schema (example):**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    role ENUM('user', 'reviewer', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviewer_permissions (
    user_id UUID REFERENCES users(id),
    can_view_photos BOOLEAN DEFAULT true,
    can_resolve_disputes BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT NOW()
);
```

#### 1.2 Authentication Requirements

1. **JWT Verification**: All admin/reviewer endpoints must verify JWT token
2. **Role Claim**: Token must include user role
3. **Session Validation**: Re-validate session on each sensitive action
4. **Token Expiry**: Short-lived tokens (15-30 min) for reviewer sessions

**API Middleware (example):**
```javascript
const requireReviewer = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!['reviewer', 'admin'].includes(decoded.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
```

#### 1.3 Audit Logging

All photo review actions MUST be logged:

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    action ENUM('view_photo', 'approve_photo', 'reject_photo', 'view_dispute', 'resolve_dispute'),
    resource_type VARCHAR(50),  -- 'photo', 'dispute'
    resource_id UUID,
    metadata JSONB,  -- Additional context
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Logged Events:**
| Action | Description |
|--------|-------------|
| `view_photo` | Reviewer opened a reported photo |
| `approve_photo` | Reviewer approved a photo |
| `reject_photo` | Reviewer rejected a photo |
| `view_dispute` | Reviewer viewed dispute details |
| `resolve_dispute` | Reviewer resolved a dispute |

---

## 2. API Endpoints Security

### Protected Endpoints (Reviewer/Admin only)

```
POST   /api/admin/disputes            # List disputes (requires: reviewer, admin)
GET    /api/admin/disputes/:id        # Get dispute details (requires: reviewer, admin)
POST   /api/admin/disputes/:id/resolve # Resolve dispute (requires: reviewer, admin)
GET    /api/admin/photos/:id          # Get reported photo (requires: reviewer, admin)
POST   /api/admin/photos/:id/approve  # Approve photo (requires: reviewer, admin)
POST   /api/admin/photos/:id/reject   # Reject photo (requires: reviewer, admin)
```

### Rate Limiting

```javascript
// Stricter rate limits for admin endpoints
const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests from this IP'
});
```

---

## 3. Photo Security

### 3.1 Photo Storage

- Store photos in secure cloud storage (S3, GCS, Azure Blob)
- Use signed URLs with short expiry (5-15 minutes)
- Never expose direct storage URLs to client

### 3.2 Photo Access

```javascript
// Generate signed URL for photo viewing
const getPhotoUrl = async (photoId, userId, userRole) => {
    // Log access
    await auditLog.create({
        userId,
        action: 'view_photo',
        resourceType: 'photo',
        resourceId: photoId
    });

    // Generate short-lived signed URL
    const signedUrl = await storage.getSignedUrl(photoId, {
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        action: 'read'
    });

    return signedUrl;
};
```

### 3.3 Screenshot Protection

- **Mobile App**: Already implemented via `expo-screen-capture`
- **Web Dashboard** (if applicable):
  - Disable right-click context menu
  - CSS to prevent selection/drag
  - Watermark photos with reviewer ID
  - Consider DRM solutions for high-security needs

---

## 4. Implementation Checklist

### Phase 1: Basic Access Control
- [ ] Add `role` field to users table
- [ ] Create JWT middleware with role verification
- [ ] Protect admin endpoints with `requireReviewer` middleware
- [ ] Update mobile app to fetch role from backend

### Phase 2: Audit Logging
- [ ] Create audit_log table
- [ ] Log all photo view events
- [ ] Log all approve/reject actions
- [ ] Create admin dashboard for viewing logs

### Phase 3: Enhanced Security
- [ ] Implement signed URLs for photo access
- [ ] Add rate limiting to admin endpoints
- [ ] Implement session timeout for reviewers
- [ ] Add IP allowlisting for admin access (optional)

### Phase 4: Monitoring
- [ ] Alert on suspicious activity (mass approvals/rejections)
- [ ] Alert on access from new IP/device
- [ ] Weekly audit log review process

---

## 5. Mobile App Changes Required

When backend is ready, update `ProfileScreen.js`:

```javascript
// BEFORE (current - dev only)
const MOCK_USER = {
    isAdmin: true, // Simple flag
};

// AFTER (production)
const ProfileScreen = ({ navigation }) => {
    const { user } = useAuth(); // Get user from auth context

    // Check role from backend
    const canReviewPhotos = user?.role === 'reviewer' || user?.role === 'admin';

    return (
        // ...
        {canReviewPhotos && (
            <AdminDashboardButton />
        )}
    );
};
```

---

## 6. Security Contacts

For security issues related to photo review access:
- **Primary**: [Add security contact email]
- **Escalation**: [Add escalation contact]

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2024-XX-XX | 1.0 | Initial security requirements |

---

**⚠️ IMPORTANT**: Do not deploy to production without implementing at minimum Phase 1 and Phase 2 of this security checklist.
