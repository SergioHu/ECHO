// Simple global store for jobs and photos
// This persists across screens during the app session

let testJobs = [];
let takenPhotos = [];
let listeners = [];

// Generate unique ID
const generateId = () => Date.now() + Math.random().toString(36).substr(2, 9);

// Subscribe to changes
export const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
        listeners = listeners.filter(l => l !== listener);
    };
};

// Notify all listeners
const notifyListeners = () => {
    listeners.forEach(listener => listener());
};

// ===== JOBS =====

export const addTestJob = (job) => {
    const newJob = {
        id: generateId(),
        ...job,
        createdAt: new Date().toISOString(),
        status: 'active', // active, accepted, completed
    };
    testJobs = [...testJobs, newJob];
    notifyListeners();
    return newJob;
};

export const getTestJobs = () => {
    return testJobs.filter(job => job.status === 'active');
};

export const getAllTestJobs = () => {
    return testJobs;
};

export const updateJobStatus = (jobId, status) => {
    testJobs = testJobs.map(job =>
        job.id === jobId ? { ...job, status } : job
    );
    notifyListeners();
};

export const removeTestJob = (jobId) => {
    testJobs = testJobs.filter(job => job.id !== jobId);
    notifyListeners();
};

export const clearTestJobs = () => {
    testJobs = [];
    notifyListeners();
};

// ===== PHOTOS =====

export const addTakenPhoto = (photo) => {
    const newPhoto = {
        id: generateId(),
        ...photo,
        takenAt: new Date().toISOString(),
        status: 'pending', // pending, approved, rejected
    };
    takenPhotos = [...takenPhotos, newPhoto];
    notifyListeners();
    return newPhoto;
};

export const getTakenPhotos = () => {
    return takenPhotos;
};

export const getPendingPhotos = () => {
    return takenPhotos.filter(photo => photo.status === 'pending');
};

export const updatePhotoStatus = (photoId, status) => {
    takenPhotos = takenPhotos.map(photo =>
        photo.id === photoId ? { ...photo, status } : photo
    );
    notifyListeners();
};

export const getPhotoByJobId = (jobId) => {
    return takenPhotos.find(photo => photo.jobId === jobId);
};

export const clearTakenPhotos = () => {
    takenPhotos = [];
    notifyListeners();
};

// Export for debugging
export const debugStore = () => {
    console.log('=== JOB STORE DEBUG ===');
    console.log('Test Jobs:', testJobs);
    console.log('Taken Photos:', takenPhotos);
};

// Initialize with sample delivered photo for testing
export const initializeSampleData = () => {
    // Only initialize once
    if (testJobs.length > 0 || takenPhotos.length > 0) return;

    // Add a completed job with delivered photo
    const sampleJobId = 'sample-job-001';
    const sampleJob = {
        id: sampleJobId,
        lat: 40.7580,
        lng: -73.9855,
        price: 0.75,
        description: 'Times Square Photo',
        isTestJob: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'completed',
    };
    testJobs = [sampleJob];

    // Add the delivered photo for this job
    const samplePhoto = {
        id: 'sample-photo-001',
        jobId: sampleJobId,
        photoUri: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800',
        takenAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
        status: 'approved',
        price: 0.75,
    };
    takenPhotos = [samplePhoto];

    // Add a pending job (waiting for photo)
    const pendingJob = {
        id: 'sample-job-002',
        lat: 40.7829,
        lng: -73.9654,
        price: 0.50,
        description: 'Central Park View',
        isTestJob: true,
        createdAt: new Date(Date.now() - 600000).toISOString(), // 10 mins ago
        status: 'active',
    };
    testJobs = [...testJobs, pendingJob];

    notifyListeners();
};
