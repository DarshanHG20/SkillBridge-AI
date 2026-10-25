import 'package:flutter/material.dart';

import '../../features/auth/screens/admin_login_screen.dart';
import '../../features/curriculum/screens/curriculum_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/users/screens/user_list_screen.dart';
import '../../features/knowledge/screens/knowledge_management_screen.dart';
import '../../features/analytics/screens/analytics_dashboard_screen.dart';
import '../../features/feedback/screens/feedback_review_screen.dart';
import '../../features/audit/screens/audit_log_screen.dart';
import '../storage/admin_token_storage.dart';

/// Centralized route handling and authentication guard for the Admin Web application.
class AdminRouter {
  static const String login = '/login';
  static const String dashboard = '/';
  static const String users = '/users';
  static const String skills = '/skills';
  static const String knowledge = '/knowledge';
  static const String analytics = '/analytics';
  static const String feedback = '/feedback';
  static const String audit = '/audit';

  static Route<dynamic> onGenerateRoute(RouteSettings settings) {
    final isAuthenticated = AdminTokenStorage().isAuthenticated;

    // Route Guard: Unauthenticated callers must be redirected to Admin Login
    if (!isAuthenticated && settings.name != login) {
      return MaterialPageRoute(
        builder: (_) => const AdminLoginScreen(),
        settings: settings,
      );
    }

    switch (settings.name) {
      case login:
        return MaterialPageRoute(
          builder: (_) => const AdminLoginScreen(),
          settings: settings,
        );
      case dashboard:
      case '/dashboard':
        return MaterialPageRoute(
          builder: (_) => const DashboardScreen(),
          settings: settings,
        );
      case users:
        return MaterialPageRoute(
          builder: (_) => const UserListScreen(),
          settings: settings,
        );
      case skills:
      case '/assessments':
        return MaterialPageRoute(
          builder: (_) => const CurriculumScreen(),
          settings: settings,
        );
      case knowledge:
        return MaterialPageRoute(
          builder: (_) => const KnowledgeManagementScreen(),
          settings: settings,
        );
      case analytics:
        return MaterialPageRoute(
          builder: (_) => const AnalyticsDashboardScreen(),
          settings: settings,
        );
      case feedback:
        return MaterialPageRoute(
          builder: (_) => const FeedbackReviewScreen(),
          settings: settings,
        );
      case audit:
        return MaterialPageRoute(
          builder: (_) => const AuditLogScreen(),
          settings: settings,
        );
      default:
        return MaterialPageRoute(
          builder: (_) => const DashboardScreen(),
          settings: settings,
        );
    }
  }
}
