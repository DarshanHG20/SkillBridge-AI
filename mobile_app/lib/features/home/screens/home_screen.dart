import 'package:flutter/material.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';

/// Main mobile home screen displaying learner status and backend connectivity.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiClient _apiClient = ApiClient();
  bool _isChecking = false;
  bool? _isConnected;
  String _serverInfo = 'Checking server connectivity...';

  int _unreadNotifs = 0;

  @override
  void initState() {
    super.initState();
    _checkServer();
  }

  Future<void> _checkServer() async {
    setState(() {
      _isChecking = true;
    });

    try {
      final res = await _apiClient.checkHealth();
      int unread = 0;
      try {
        unread = await _apiClient.getUnreadNotificationCount();
      } catch (_) {}

      if (mounted) {
        setState(() {
          _isConnected = res['status'] == 'healthy';
          _serverInfo =
              'Backend v${res['version']} (${res['environment']}) - DB: ${res['database_connected'] ? "Online" : "Offline"}';
          _unreadNotifs = unread;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isConnected = false;
          _serverInfo = 'Unable to reach backend: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isChecking = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: AppColors.primary,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.auto_awesome,
                size: 18,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 10),
            const Text(AppConfig.appName),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Notifications',
            icon: Badge(
              isLabelVisible: _unreadNotifs > 0,
              label: Text('$_unreadNotifs'),
              child: const Icon(Icons.notifications_outlined),
            ),
            onPressed: () {
              Navigator.pushNamed(context, AppRouter.notifications).then((_) {
                _checkServer();
              });
            },
          ),
          const Padding(
            padding: EdgeInsets.only(right: 12),
            child: Center(
              child: StatusBadge(
                label: AppConfig.environment,
                status: BadgeStatus.unlocked,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _checkServer,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Backend Connectivity Status Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Backend Connection',
                          style: AppTypography.titleLarge,
                        ),
                        StatusBadge(
                          label: _isConnected == true ? 'Online' : 'Offline',
                          status: _isConnected == true
                              ? BadgeStatus.online
                              : BadgeStatus.offline,
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _serverInfo,
                      style: AppTypography.bodyMedium.copyWith(
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppButton(
                      label: 'Ping Health Endpoint',
                      icon: Icons.refresh,
                      isLoading: _isChecking,
                      variant: AppButtonVariant.outline,
                      onPressed: _checkServer,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Personalized Adaptive Learning Card
            Card(
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    colors: [
                      AppColors.primary.withValues(alpha: 0.08),
                      AppColors.secondary.withValues(alpha: 0.04),
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: const [
                        StatusBadge(
                          label: 'AI Recommendation',
                          status: BadgeStatus.inProgress,
                        ),
                        Spacer(),
                        Icon(Icons.psychology, color: AppColors.primary),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Next Diagnostic Assessment',
                      style: AppTypography.headlineMedium,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Assess your Python Async & SQLAlchemy prerequisite mastery before unlocking Advanced Distributed Systems.',
                      style: AppTypography.bodyMedium.copyWith(
                        color: Theme.of(context).textTheme.bodySmall?.color,
                      ),
                    ),
                    const SizedBox(height: 16),
                    AppButton(
                      label: 'Begin Adaptive Assessment',
                      icon: Icons.play_arrow_rounded,
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Assessment Engine activated in Part 4.',
                            ),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Knowledge Graph Mastery Snapshot
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Skill Mastery Overview',
                      style: AppTypography.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    _buildSkillRow(
                      'FastAPI Web Framework',
                      'Mastered',
                      0.92,
                      BadgeStatus.mastered,
                    ),
                    const Divider(height: 20),
                    _buildSkillRow(
                      'Relational Database Modeling',
                      'In Progress',
                      0.65,
                      BadgeStatus.inProgress,
                    ),
                    const Divider(height: 20),
                    _buildSkillRow(
                      'Item Response Scoring (ML)',
                      'Unlocked',
                      0.10,
                      BadgeStatus.unlocked,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSkillRow(
    String skill,
    String statusLabel,
    double progress,
    BadgeStatus status,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              skill,
              style: AppTypography.bodyLarge.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            StatusBadge(label: statusLabel, status: status),
          ],
        ),
        const SizedBox(height: 8),
        LinearProgressIndicator(
          value: progress,
          backgroundColor: AppColors.lightBorder,
          color: status == BadgeStatus.mastered
              ? AppColors.success
              : AppColors.primary,
          minHeight: 6,
          borderRadius: BorderRadius.circular(3),
        ),
      ],
    );
  }
}
