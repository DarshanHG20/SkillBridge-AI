import 'package:flutter/material.dart';

import '../../features/auth/screens/forgot_password_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/register_screen.dart';
import '../../features/dashboard/screens/student_dashboard_screen.dart';
import '../../features/profile/screens/student_profile_screen.dart';
import '../../features/settings/screens/settings_screen.dart';
import '../../features/splash/screens/splash_screen.dart';

import '../../features/assessments/screens/assessment_quiz_screen.dart';
import '../../features/assessments/screens/assessment_result_screen.dart';
import '../../features/chat/screens/ai_tutor_chat_screen.dart';
import '../../features/rag/screens/document_library_screen.dart';
import '../../features/coding/screens/coding_practice_screen.dart';
import '../../features/activities/screens/activities_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';

/// Centralized route definitions and generator for mobile application navigation.
class AppRouter {
  static const String splash = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String forgotPassword = '/forgot-password';
  static const String dashboard = '/dashboard';
  static const String profile = '/profile';
  static const String settings = '/settings';
  static const String activities = '/activities';
  static const String notifications = '/notifications';
  static const String assessmentQuiz = '/assessment-quiz';
  static const String assessmentResult = '/assessment-result';
  static const String aiTutor = '/ai-tutor';
  static const String documentLibrary = '/document-library';
  static const String codingPractice = '/coding-practice';

  static Route<dynamic> onGenerateRoute(RouteSettings routeSettings) {
    switch (routeSettings.name) {
      case splash:
        return MaterialPageRoute(
          builder: (_) => const SplashScreen(),
          settings: routeSettings,
        );
      case login:
        return MaterialPageRoute(
          builder: (_) => const LoginScreen(),
          settings: routeSettings,
        );
      case register:
        return MaterialPageRoute(
          builder: (_) => const RegisterScreen(),
          settings: routeSettings,
        );
      case forgotPassword:
        return MaterialPageRoute(
          builder: (_) => const ForgotPasswordScreen(),
          settings: routeSettings,
        );
      case dashboard:
        return MaterialPageRoute(
          builder: (_) => const StudentDashboardScreen(),
          settings: routeSettings,
        );
      case profile:
        return MaterialPageRoute(
          builder: (_) => const StudentProfileScreen(),
          settings: routeSettings,
        );
      case settings:
        return MaterialPageRoute(
          builder: (_) => const SettingsScreen(),
          settings: routeSettings,
        );
      case activities:
        return MaterialPageRoute(
          builder: (_) => const ActivitiesScreen(),
          settings: routeSettings,
        );
      case notifications:
        return MaterialPageRoute(
          builder: (_) => const NotificationsScreen(),
          settings: routeSettings,
        );
      case assessmentQuiz:
        final args = routeSettings.arguments as Map<String, dynamic>? ?? {};
        return MaterialPageRoute(
          builder: (_) => AssessmentQuizScreen(
            assessmentId: args['assessment_id'] as int? ?? 1,
            title: args['title'] as String? ?? 'Skill Assessment',
          ),
          settings: routeSettings,
        );
      case assessmentResult:
        final args = routeSettings.arguments as Map<String, dynamic>? ?? {};
        return MaterialPageRoute(
          builder: (_) => AssessmentResultScreen(result: args),
          settings: routeSettings,
        );
      case aiTutor:
        final args = routeSettings.arguments as Map<String, dynamic>? ?? {};
        return MaterialPageRoute(
          builder: (_) => AiTutorChatScreen(
            initialTopic: args['topic'] as String?,
            initialPrompt: args['prompt'] as String?,
          ),
          settings: routeSettings,
        );
      case documentLibrary:
        return MaterialPageRoute(
          builder: (_) => const DocumentLibraryScreen(),
          settings: routeSettings,
        );
      case codingPractice:
        final args = routeSettings.arguments as Map<String, dynamic>? ?? {};
        return MaterialPageRoute(
          builder: (_) =>
              CodingPracticeScreen(initialProblemSlug: args['slug'] as String?),
          settings: routeSettings,
        );
      default:
        return MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(title: const Text('Page Not Found')),
            body: Center(
              child: Text('No route defined for ${routeSettings.name}'),
            ),
          ),
          settings: routeSettings,
        );
    }
  }
}
