import 'package:flutter/material.dart';

import '../../core/config/admin_config.dart';
import '../../core/network/admin_api_client.dart';
import '../../core/routing/admin_router.dart';
import '../../core/storage/admin_token_storage.dart';
import '../../core/theme/admin_colors.dart';

/// Responsive administrative layout scaffold featuring sidebar navigation and top bar.
class AdminScaffold extends StatelessWidget {
  final Widget body;
  final String activeRoute;

  const AdminScaffold({
    super.key,
    required this.body,
    this.activeRoute = '/dashboard',
  });

  @override
  Widget build(BuildContext context) {
    final isDesktop = MediaQuery.of(context).size.width >= 900;
    final adminUser = AdminTokenStorage().currentAdmin;
    final adminEmail = adminUser?['email'] as String? ?? 'Administrator';

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AdminColors.primary,
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(
                Icons.hub_outlined,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            const Text(
              'SkillBridge AI',
              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: AdminColors.primaryLight,
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'Admin Console',
                style: TextStyle(
                  color: AdminColors.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Center(
              child: Text(
                adminEmail,
                style: const TextStyle(
                  fontSize: 13,
                  color: AdminColors.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            tooltip: 'Sign Out',
            onPressed: () {
              AdminApiClient().logout();
              Navigator.pushNamedAndRemoveUntil(
                context,
                AdminRouter.login,
                (r) => false,
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      drawer: isDesktop ? null : _buildDrawer(context),
      body: Row(
        children: [
          if (isDesktop)
            Container(
              width: 240,
              decoration: const BoxDecoration(
                color: AdminColors.sidebarBackground,
                border: Border(
                  right: BorderSide(color: AdminColors.border, width: 1),
                ),
              ),
              child: _buildNavigationList(context),
            ),
          Expanded(child: body),
        ],
      ),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      backgroundColor: AdminColors.sidebarBackground,
      child: _buildNavigationList(context),
    );
  }

  Widget _buildNavigationList(BuildContext context) {
    return Column(
      children: [
        const SizedBox(height: 16),
        _navItem(
          context,
          Icons.dashboard_outlined,
          'Overview',
          AdminRouter.dashboard,
          activeRoute == '/dashboard' || activeRoute == '/',
        ),
        _navItem(
          context,
          Icons.people_outline,
          'User Accounts',
          AdminRouter.users,
          activeRoute == '/users',
        ),
        _navItem(
          context,
          Icons.insights_outlined,
          'Learning Analytics',
          AdminRouter.analytics,
          activeRoute == '/analytics',
        ),
        _navItem(
          context,
          Icons.account_tree_outlined,
          'Curriculum & Skills',
          AdminRouter.skills,
          activeRoute == '/skills' || activeRoute == '/assessments',
        ),
        _navItem(
          context,
          Icons.auto_stories_outlined,
          'AI & Knowledge RAG',
          AdminRouter.knowledge,
          activeRoute == '/knowledge',
        ),
        _navItem(
          context,
          Icons.rate_review_outlined,
          'Student Feedback',
          AdminRouter.feedback,
          activeRoute == '/feedback',
        ),
        _navItem(
          context,
          Icons.history_edu_outlined,
          'Audit Logs',
          AdminRouter.audit,
          activeRoute == '/audit',
        ),
        const Spacer(),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          child: Material(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(8),
            child: ListTile(
              leading: const Icon(
                Icons.settings_outlined,
                color: AdminColors.sidebarText,
                size: 20,
              ),
              title: const Text(
                'Settings',
                style: TextStyle(
                  color: AdminColors.sidebarText,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              onTap: () => _showSettingsDialog(context),
            ),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  void _showSettingsDialog(BuildContext context) {
    final adminUser = AdminTokenStorage().currentAdmin;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Admin Console Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('API Base URL: ${AdminConfig.apiBaseUrl}'),
            const SizedBox(height: 8),
            Text('Environment: ${AdminConfig.environment}'),
            const SizedBox(height: 8),
            Text('Signed-In User: ${adminUser?['email'] ?? 'Not signed in'}'),
            const SizedBox(height: 8),
            Text('Role: ${adminUser?['role'] ?? 'unknown'}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _navItem(
    BuildContext context,
    IconData icon,
    String title,
    String route,
    bool isActive,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: Material(
        color: isActive
            ? AdminColors.sidebarActiveBackground
            : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        child: ListTile(
          leading: Icon(
            icon,
            color: isActive
                ? AdminColors.primaryLight
                : AdminColors.sidebarText,
            size: 20,
          ),
          title: Text(
            title,
            style: TextStyle(
              color: isActive
                  ? AdminColors.sidebarActive
                  : AdminColors.sidebarText,
              fontSize: 14,
              fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
            ),
          ),
          onTap: () {
            if (!isActive) {
              Navigator.pushNamed(context, route);
            }
          },
        ),
      ),
    );
  }
}
