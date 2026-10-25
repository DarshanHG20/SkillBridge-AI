import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../adaptive/screens/adaptive_home_tab.dart';
import '../../mastery/screens/skill_mastery_tab.dart';
import '../../careers/screens/career_exploration_tab.dart';
import '../../projects/screens/project_catalog_tab.dart';

/// Main student dashboard hosting Adaptive Engine, Skill Taxonomy, Career Intelligence, and Projects.
class StudentDashboardScreen extends StatefulWidget {
  const StudentDashboardScreen({super.key});

  @override
  State<StudentDashboardScreen> createState() => _StudentDashboardScreenState();
}

class _StudentDashboardScreenState extends State<StudentDashboardScreen> {
  final _apiClient = ApiClient();
  int _currentTabIndex = 0;

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  void _handleLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirm Logout'),
        content: const Text(
          'Are you sure you want to sign out of your student account?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              _apiClient.logout();
              Navigator.pushNamedAndRemoveUntil(
                context,
                AppRouter.login,
                (r) => false,
              );
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final titles = [
      'SkillBridge Adaptive AI',
      'Knowledge Taxonomy',
      'Career Intelligence',
      'Hands-On Projects',
    ];

    final tabs = [
      AdaptiveHomeTab(
        onNavigateToSkills: () => setState(() => _currentTabIndex = 1),
        onNavigateToCareers: () => setState(() => _currentTabIndex = 2),
      ),
      const SkillMasteryTab(),
      const CareerExplorationTab(),
      const ProjectCatalogTab(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text(titles[_currentTabIndex]),
        actions: [
          IconButton(
            icon: const Icon(Icons.psychology, color: AppColors.primary),
            tooltip: 'AI Tutor & Chatbot',
            onPressed: () => Navigator.pushNamed(context, AppRouter.aiTutor),
          ),
          IconButton(
            icon: const Icon(Icons.code, color: AppColors.secondary),
            tooltip: 'Coding Practice Sandbox',
            onPressed: () =>
                Navigator.pushNamed(context, AppRouter.codingPractice),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            tooltip: 'More Options',
            onSelected: (val) {
              if (val == 'documents') {
                Navigator.pushNamed(context, AppRouter.documentLibrary);
              } else if (val == 'profile') {
                Navigator.pushNamed(context, AppRouter.profile);
              } else if (val == 'settings') {
                Navigator.pushNamed(context, AppRouter.settings);
              } else if (val == 'logout') {
                _handleLogout();
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'documents',
                child: Row(
                  children: [
                    Icon(Icons.menu_book_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Knowledge Library'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'profile',
                child: Row(
                  children: [
                    Icon(Icons.person_outline, size: 20),
                    SizedBox(width: 12),
                    Text('Student Profile'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings_outlined, size: 20),
                    SizedBox(width: 12),
                    Text('Settings & Diagnostics'),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 20, color: AppColors.error),
                    SizedBox(width: 12),
                    Text('Sign Out', style: TextStyle(color: AppColors.error)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: IndexedStack(index: _currentTabIndex, children: tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentTabIndex,
        onDestinationSelected: (idx) {
          setState(() {
            _currentTabIndex = idx;
          });
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            selectedIcon: Icon(Icons.auto_awesome),
            label: 'Adaptive',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_tree_outlined),
            selectedIcon: Icon(Icons.account_tree),
            label: 'Taxonomy',
          ),
          NavigationDestination(
            icon: Icon(Icons.rocket_launch_outlined),
            selectedIcon: Icon(Icons.rocket_launch),
            label: 'Careers',
          ),
          NavigationDestination(
            icon: Icon(Icons.folder_special_outlined),
            selectedIcon: Icon(Icons.folder_special),
            label: 'Projects',
          ),
        ],
      ),
    );
  }
}
