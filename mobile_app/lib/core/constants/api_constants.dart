/// Centralized API endpoint routes and HTTP header keys.
class ApiConstants {
  static const String healthEndpoint = '/health';

  // Authentication
  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String authRefresh = '/auth/refresh';
  static const String authForgotPassword = '/auth/forgot-password';

  // User & Student Profile
  static const String userMe = '/users/me';
  static const String userProfile = '/users/me/profile';

  // Admin User Controls
  static const String adminUsers = '/admin/users';

  // Skills & Taxonomy
  static const String skills = '/skills';
  static const String skillsTaxonomyTree = '/skills/taxonomy/tree';
  static const String skillsMyMastery = '/skills/my-mastery';
  static const String skillsUnlockAll100 = '/skills/unlock-all-100';

  // Courses & Lessons
  static const String courses = '/courses';

  // Assessments
  static const String assessments = '/assessments';
  static const String assessmentsHistory = '/assessments/my-history';

  // Adaptive Engine
  static const String adaptiveNextActivity = '/adaptive/next-activity';
  static const String adaptiveWeakConcepts = '/adaptive/weak-concepts';
  static const String adaptiveOverview = '/adaptive/overview';

  // Careers & Roadmaps
  static const String careers = '/careers';
  static const String careersMyRoadmaps = '/careers/my-roadmaps/all';

  // Projects
  static const String projects = '/projects';
  static const String projectsMyPortfolio = '/projects/my-portfolio';

  // Part 4: AI Tutor & Chat
  static const String tutorStatus = '/tutor/status';
  static const String tutorQuery = '/tutor/query';
  static const String chatConversations = '/chat/conversations';

  // Part 4: RAG Knowledge Documents
  static const String ragDocuments = '/rag/documents';
  static const String ragQuery = '/rag/query';

  // Part 4: Coding Practice
  static const String codingProblems = '/coding/problems';
  static const String codingSubmissions = '/coding/my-submissions';
  static const String codingRecommendations = '/coding/recommendations';

  // Part 5: Student Feedback & Bug Reporting
  static const String feedback = '/feedback';

  // Notifications
  static const String notifications = '/notifications';
  static const String notificationsUnreadCount = '/notifications/unread-count';
  static const String notificationsReadAll = '/notifications/read-all';

  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}
