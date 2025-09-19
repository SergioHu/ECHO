Echo App: The Complete Master Prompt (Final VisionCamera Version)
Act as a Lead Product Manager, Senior UI/UX Designer, and a full-stack Systems Architect. Your task is to generate a complete and comprehensive specification document for a new mobile and web application called "Echo."

This document is the single source of truth, detailing the core concept, the advanced real-time privacy protocol, the user experience, the full-stack technology, monetization, and responsive design principles. This is the final blueprint for the development team.

Camera Architecture Update (CRITICAL)

Echo implements a dual-pass privacy system across Mobile and Web to guarantee that every captured image has all faces blurred.

- Mobile live preview: VisionCamera + ML Kit (fast) detects multiple faces in real time and renders blur masks via Skia. Masks are expanded (+35% width, +50% height) for full coverage and tracked across frames.
- Mobile capture guarantee: On shutter, we compute a burst refine union from the last 8 frames to avoid single-frame misses, then immediately run an accurate still-image pass (performanceMode accurate, minFaceSize 0.01) on the captured bitmap. The union of both passes is applied before persisting/uploading. If both fail, a privacy-first fallback blurs large regions.
- Web live preview: A browser detector (MediaPipe Tasks – to be integrated) drives a canvas blur overlay for UX only.
- Web capture guarantee: The original capture is uploaded and blurred server-side using a robust detector (e.g., RetinaFace/SCRFD). Final asset is always blurred.

For full details, see CAMERA_ARCHITECTURE.md.

1. Core Concept & Business Model
App Name: Echo
Core Concept: A real-time, "human search engine" for the physical world. It's a peer-to-peer marketplace where users ("Seekers") pay a micro-bounty to get a live visual report from other users ("Echos") who are physically present at a specific location.
Value Proposition:
For Seekers: Provides immediate, verifiable visual information ("What does it look like right now?") that is rich in context and guaranteed to be privacy-safe.
For Echos: Offers an ultra low-friction way to earn money by completing a simple, single-shot photo task with the confidence that privacy is automatically handled.
Monetization Strategy: The platform takes a commission (e.g., 15-25%) on every successful transaction.
2. The Privacy Protocol: Real-Time On-Device Face Blurring (CRITICAL)
This is the cornerstone of the app's trust and privacy model. We will not use complex UI constraints or multi-shot protocols. Instead, we will use a high-performance, real-time solution.

Technology: The camera feature will be built using the react-native-vision-camera stack, including:
react-native-vision-camera-face-detector: A Frame Processor plugin to detect faces in the live video feed at high FPS.
@shopify/react-native-skia: To draw a blur filter directly onto the detected face contours in real-time.
User Experience (UX):
When the Echo opens the camera, they see a live preview of their surroundings.
Any faces detected by the camera (their own or bystanders') will have a live, real-time blur effect rendered over them directly on the screen.
The Echo simply frames their shot and takes a single picture.
Capture Mechanism: The photo capture will be a snapshot of the rendered view (using a library like react-native-view-shot), saving the camera feed with the blur effects already applied.
Result: The final image file that is saved and uploaded is already anonymized. No raw, unblurred photos with identifiable faces are ever stored on the device or sent to the server. This is true "Privacy by Design."
3. User Experience (UI/UX) & Key Features
Overall Design Philosophy: A modern, premium, light-themed aesthetic. The UI must be clean, intuitive, and trustworthy, with subtle green accents for financial elements.
The "Seeker" Flow (Asking a Question):
Map Interaction: The primary interface is a real, interactive map (Google Maps Platform, styled with a custom, minimalist light theme).
Initiating a Question: The user taps the central "+" (Ask) button in the bottom navigation. This brings them to the map in an "Ask Mode" with a fixed central marker. They move the map to position the marker and tap "Confirm Location."
Question Input: A modal slides up, prompting the Seeker to set a bounty and type their question into a text field.
The "Echo" Flow (Answering a Question):
Discovery: Echos discover "New Opportunities" in a clean, scrollable list view (the "Discover" tab). A segmented control allows switching to a map view.
Single-Shot Capture: Upon accepting a question, the app opens the real-time blurring camera.
Framing & Capture: The Echo frames the scene, seeing the live blur effect, and takes a single photo. The captured image is already privacy-safe.
Answer Input: After the photo is captured, the Echo is prompted to add a text description for context.
User Incentives (Seeker Retention):
Implement a "Frequency Bonus" system (e.g., "Make 5 paid questions, get the 6th free"). This progress must be clearly visualized on the user's Profile screen.
Navigation:
A bottom navigation bar with four clear tabs: Discover, Ask, Messages, Profile.
4. Full-Stack Technical Specification
Frontend (Mobile & Web):
Framework: Expo (React Native) for Android, iOS, and Web.
Camera Stack (CRITICAL): react-native-vision-camera, react-native-vision-camera-face-detector, @shopify/react-native-skia, react-native-reanimated, react-native-worklets-core, and react-native-view-shot.
Mapping: Google Maps Platform.
Architecture: Code will be structured for maintainability (separating UI from data/logic).
Backend (Hybrid Architecture):
Foundation (BaaS): Supabase
Database: PostgreSQL with PostGIS.
Authentication: Supabase Auth.
Storage: Supabase Storage to host the final, already-blurred proof images. No raw photos are ever received.
Custom Logic Layer (IaaS): DigitalOcean Droplet
Stack: A Node.js server with Express.js, managed by PM2.
Role: Acts as a Lightweight Orchestrator. Its responsibilities are simplified as it no longer needs to perform image processing.
Validation: Verifies incoming requests.
Orchestration: Communicates with the Stripe API for payments and the Firebase Cloud Messaging (FCM) API for notifications.
Third-Party Services:
Stripe: For all payment processing and payouts (using Stripe Connect).
Firebase Cloud Messaging (FCM): For push notifications.
5. Responsive Design Strategy
Mobile-First Approach: The primary design is for standard mobile screens.
Layout Engine: Flexbox and react-native-safe-area-context are mandatory.
Adaptive Layouts:
Standard & Tall/Narrow Mobile: The single-column layout is the primary focus.
Web/Desktop (Wide Screens): The UI must adapt to a multi-column layout (left sidebar for navigation, two-column view for content).
Implementation: Use the useWindowDimensions hook and conditional rendering to switch between layouts.
6. Detailed User Flows & Backend Logic
Asking a Question: Unchanged from previous prompt. Seeker selects location, sets bounty, types question, payment is authorized.
Answering a Question:
Echo accepts a question.
The real-time blurring camera opens.
Echo takes a single photo (which is a snapshot of the blurred view).
The already-anonymized image is uploaded to Supabase Storage.
Echo adds a text reply and submits.
Backend Flow:
The backend (DigitalOcean Droplet) is notified of the completed answer submission, receiving the URL of the already-blurred image.
It performs basic validation (e.g., checks if the request is valid).
It instructs Stripe to capture the Seeker's payment and transfer the earnings to the Echo.
It instructs FCM to send completion notifications.
7. Go-to-Market, Scalability, and KPIs
Go-to-Market: Hyper-local launch, focusing on acquiring Echos first.
Scalability: The architecture is highly scalable. The most intensive work (face blurring) is offloaded to the user's device, significantly reducing server load and cost.
KPIs: Answer Rate, Average Response Time, GTV, and user retention remain the key metrics.
This updated specification represents the most elegant and powerful version of the Echo app, providing a superior user experience and a fundamentally more secure approach to privacy.

8. Legal, Compliance, and Trust
This section outlines the necessary legal frameworks and policies to operate Echo responsibly and build user trust, now grounded in the advanced real-time blurring technology.

Privacy Policy & Terms of Service (ToS):
Requirement: Clear, accessible, and easy-to-understand Privacy Policy and ToS must be available within the app and on its website.
Privacy Policy (CRITICAL UPDATE): Must explicitly detail the "Real-Time On-Device Face Blurring" protocol. It should state that the camera preview actively anonymizes faces before a photo is ever taken, and that no raw, unblurred images containing identifiable faces are ever stored or transmitted. This is a powerful statement of "Privacy by Design." It will also cover standard data handling, user rights, and compliance with regulations like GDPR and CCPA.
Terms of Service: Must clearly define the roles of Seekers and Echos, the payment and payout terms, the commission structure, content ownership, and rules for acceptable use.
Financial Regulations:
KYC/AML Compliance: "Know Your Customer" and "Anti-Money Laundering" checks are mandatory for Echos receiving payouts. This process will be managed primarily through Stripe Connect's onboarding flow, which handles identity verification.
Tax Compliance: The platform must provide Echos with the necessary information for their tax obligations (e.g., generating 1099 forms in the US for users who exceed a certain earning threshold).
Content Moderation Policy:
Proactive Measures: While the real-time blurring handles faces, a system must still be in place to flag other forms of inappropriate content (e.g., nudity, illegal activities, hate symbols) in the proof photos or text replies. This can be an integration with a cloud AI content moderation service (e.g., AWS Rekognition for images).
Reactive Measures: A simple, prominent "Report" button must be available for every answer a Seeker receives. User reports will trigger a manual review process. Echos who repeatedly violate the content policy will be suspended or banned.
Data Minimization:
The architecture inherently follows the principle of data minimization. By processing and anonymizing images on the client's device, the backend never receives or stores the most sensitive form of the data, significantly reducing the risk profile.
9. Support and Operations
This section covers the operational plan for maintaining the app and supporting its users.

User Support:
Help Center / FAQ: An in-app, searchable help center to answer common questions for both Seekers and Echos, including how the privacy technology works.
Support Ticketing: A clear way for users to submit support requests (e.g., via an in-app form or a dedicated support email).
Transaction Disputes:
Process: If a Seeker reports an answer as low-quality, irrelevant, or fraudulent, a simple dispute resolution process will be initiated.
Flow:
Seeker reports the answer with a reason.
The transaction is temporarily flagged.
An admin reviews the submitted proof (the final, blurred photo) and the text reply against the original question.
Resolution: The admin can decide to issue a full refund to the Seeker (in the form of app credit), deny the dispute, or issue a warning to the Echo.
System Monitoring:
Backend Health: The DigitalOcean Droplet's health (CPU, memory, uptime) and API performance (response times, error rates) will be monitored using tools like PM2's dashboard and external uptime services.
Error Tracking: Integration with a service like Sentry to proactively track and diagnose crashes and errors in both the frontend and backend.
10. Risk Assessment
A summary of the primary risks and their mitigation strategies, updated for the new technology.

Market Risk: The "Chicken & Egg" Problem
Risk: Failing to attract a critical mass of both Seekers and Echos.
Mitigation: The hyper-local launch strategy combined with targeted onboarding of Echos and initial user incentives remains the core mitigation.
Technical Risk: Device Performance & Compatibility
Risk: The high-performance react-native-vision-camera stack may have compatibility issues or performance bottlenecks on older, lower-end Android or iOS devices.
Mitigation: Thorough testing across a wide range of real devices. Defining a minimum required device spec. Providing graceful degradation (e.g., a message saying "Your device does not support real-time processing") instead of crashing.
Operational Risk: Fraud & Low-Quality Content
Risk: Echos providing consistently low-quality, unhelpful answers.
Mitigation: The user rating system for answers and a prominent reporting feature are the primary mitigations. Echos with consistently low ratings can be deprioritized or suspended.
Legal/Compliance Risk: Imperfect Anonymization
Risk: The real-time face detection model might fail to detect a face at an unusual angle or in poor lighting, leading to an unblurred face in the final photo.
Mitigation:
Primary: The on-device blurring is the first and strongest line of defense.
Secondary (Server-side Audit): Implement a periodic, asynchronous check on the backend. A small percentage of uploaded (already-blurred) images could be run through a server-side AI (like AWS Rekognition) to audit the effectiveness of the on-device blurring and flag any misses for review.
Legal: The Terms of Service should clearly state the user's responsibility not to intentionally capture identifiable individuals.
11. Concluding Vision Statement
Echo is not merely an app; it is a new utility for navigating the physical world with confidence. By creating a seamless marketplace for real-time, verifiable visual information, it empowers users to make better, faster decisions—saving them time, money, and uncertainty.


Our core strength lies in a state-of-the-art "Privacy by Design" approach, using real-time, on-device processing to build unparalleled trust. This is supported by a lean and scalable technical architecture that ensures reliability and a clean, user-centric design that fosters engagement. With a proven monetization model and a strategic go-to-market plan, Echo is positioned to create and dominate a new category of human-powered intelligence, fundamentally changing how people interact with their immediate environment.

12. Development Roadmap & Phasing
This roadmap outlines an iterative approach to building Echo, focusing on delivering a core, value-driven product first (MVP) and then expanding features based on user feedback and strategic goals.

Phase 1: Minimum Viable Product (MVP) - "The Core Loop"
Goal: To launch in a single hyper-local market and validate the fundamental concept: will Seekers pay for real-time visual answers, and will Echos provide them?

Key Features for MVP:

User Onboarding:
Simple email/password registration and login (via Supabase Auth).
Crucial: "Sign in with Google" and "Sign in with Apple" for minimal friction.
Core Seeker Flow:
A functional, styled Google Maps view.
The "Ask" flow: Tap-and-hold on the map to select a location, a modal to set the bounty and type a text question.
A simple interface to add a payment method (via Stripe).
Core Echo Flow:
The "Discover" screen, showing a basic list of nearby questions.
The ability to accept a question.
The Real-Time Blurring Camera: This is a non-negotiable, core feature for the MVP. The react-native-vision-camera stack must be implemented to provide the single-shot, privacy-safe photo capture.
The "Add Text Explanation" screen.
Core Backend Logic (DigitalOcean Droplet):
The essential API endpoints to handle question/answer submission, payment authorization and capture, and basic notifications.
Basic Financials:
A simple "Wallet" view for Echos to see their current balance.
A functional "Cash Out" process (managed via Stripe Connect).
Features Explicitly EXCLUDED from MVP:

The full-blown Loyalty/Frequency Bonus system (can be simulated with manual credits if needed).
The Referral Program.
The full Web/Desktop responsive layout.
Advanced Profile stats and the "Achievements" system.
A formal dispute resolution system (will be handled manually via support emails initially).
Phase 2: V1.1 - "Engagement, Retention & Trust"
Goal: Based on MVP feedback, add features that encourage repeat usage, build a stronger community, and solidify user trust.

Key Features for V1.1:

Seeker Incentives:
Implement the full backend logic for the "Frequency Bonus" system ("5 questions, 1 free").
Build the Referral Program with unique codes and automated credit rewards.
Echo Gamification:
