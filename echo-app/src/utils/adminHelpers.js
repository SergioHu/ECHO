// Admin authentication and helper functions

const ADMIN_USERS = [
    { email: 'sergio@echo.app', id: 'admin_001' },
    { email: 'admin@echo.app', id: 'admin_002' },
];

export const isUserAdmin = (user) => {
    if (!user) return false;
    return ADMIN_USERS.some(
        admin => admin.email === user.email || admin.id === user.id
    );
};

// For development/testing, always return true
export const isDevAdmin = () => {
    return true; // Set to false in production
};

// Mock data for admin dashboard
export const getMockStats = () => ({
    pending: 5,
    disputes: 2,
    users: 127,
    jobs: 342,
    earnings: 1247.50,
    photos: 891,
});

// Mock disputes data
export const getMockDisputes = () => [
    {
        id: 47,
        jobId: 101,
        price: 0.50,
        requester: { id: 'user_789', name: 'user_789' },
        photographer: { id: 'user_123', name: 'user_123', rating: 4.9, jobs: 23 },
        reason: 'Wrong location',
        time: '5 min ago',
        status: 'pending',
        photoUri: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
        locationRequested: { lat: 38.7387, lng: -9.2115 },
        locationTaken: { lat: 38.7387, lng: -9.2115 },
        distance: 7,
    },
    {
        id: 46,
        jobId: 98,
        price: 1.00,
        requester: { id: 'user_222', name: 'user_222' },
        photographer: { id: 'user_333', name: 'user_333', rating: 4.2, jobs: 15 },
        reason: 'Photo is blurry',
        time: '1 hour ago',
        status: 'pending',
        photoUri: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
        locationRequested: { lat: 38.7400, lng: -9.2100 },
        locationTaken: { lat: 38.7402, lng: -9.2098 },
        distance: 5,
    },
];

// Mock users data
export const getMockUsers = () => [
    {
        id: 'user_123',
        email: 'user123@email.com',
        name: 'user_123',
        joined: '15 Nov 2024',
        lastActive: '2 hours ago',
        photos: 23,
        jobsRequested: 5,
        rating: 4.9,
        strikes: 0,
        balance: 12.50,
        status: 'active',
    },
    {
        id: 'user_456',
        email: 'user456@email.com',
        name: 'user_456',
        joined: '20 Nov 2024',
        lastActive: '30 min ago',
        photos: 5,
        jobsRequested: 12,
        rating: 3.2,
        strikes: 2,
        balance: 1.20,
        status: 'warning',
    },
    {
        id: 'user_789',
        email: 'user789@email.com',
        name: 'user_789',
        joined: '1 Dec 2024',
        lastActive: '1 day ago',
        photos: 45,
        jobsRequested: 3,
        rating: 4.8,
        strikes: 0,
        balance: 56.20,
        status: 'active',
    },
];

// Mock photos for review
export const getMockPhotosForReview = () => [
    {
        id: 1,
        jobId: 101,
        price: 0.50,
        takenAt: '2 min ago',
        status: 'pending',
        photoUri: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
    {
        id: 2,
        jobId: 99,
        price: 1.20,
        takenAt: '15 min ago',
        status: 'disputed',
        photoUri: 'https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=800',
    },
];

// Analytics mock data
export const getMockAnalytics = () => ({
    revenue: {
        total: 1247.50,
        change: 15,
        period: 'This Week',
    },
    jobs: {
        created: 156,
        completed: 142,
        disputed: 8,
        expired: 6,
    },
    users: {
        new: 23,
        active: 89,
        banned: 1,
    },
    topPhotographers: [
        { id: 'user_123', name: 'user_123', jobs: 45, earnings: 56.20 },
        { id: 'user_456', name: 'user_456', jobs: 38, earnings: 41.00 },
        { id: 'user_789', name: 'user_789', jobs: 31, earnings: 35.50 },
    ],
});
