import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';
import '../../../shared/widgets/stat_card.dart';

/// Real-time learning analytics, telemetry, and CSV report export interface.
class AnalyticsDashboardScreen extends StatefulWidget {
  const AnalyticsDashboardScreen({super.key});

  @override
  State<AnalyticsDashboardScreen> createState() =>
      _AnalyticsDashboardScreenState();
}

class _AnalyticsDashboardScreenState extends State<AnalyticsDashboardScreen> {
  final AdminApiClient _apiClient = AdminApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _analytics;
  bool _isExporting = false;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await _apiClient.getAnalytics();
      setState(() {
        _analytics = data;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _triggerCsvExport(String type, String title) async {
    setState(() => _isExporting = true);
    try {
      final csv = await _apiClient.exportCsv(type);
      if (!mounted) return;

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Row(
            children: [
              const Icon(Icons.file_download_done, color: AdminColors.success),
              const SizedBox(width: 8),
              Text('Export $title'),
            ],
          ),
          content: SizedBox(
            width: 500,
            height: 250,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CSV report generated successfully. Preview of data rows:',
                  style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AdminColors.surface,
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: AdminColors.border),
                    ),
                    child: SingleChildScrollView(
                      child: Text(
                        csv.length > 500
                            ? '${csv.substring(0, 500)}...\n[Truncated]'
                            : csv,
                        style: const TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Export failed: $e'),
            backgroundColor: AdminColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isExporting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      activeRoute: '/analytics',
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
          ? _buildErrorView()
          : _buildDashboardContent(),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 48, color: AdminColors.error),
          const SizedBox(height: 16),
          Text(
            _errorMessage!,
            style: const TextStyle(color: AdminColors.textPrimary),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _loadAnalytics,
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardContent() {
    final users = _analytics?['user_metrics'] as Map<String, dynamic>? ?? {};
    final assess =
        _analytics?['assessment_metrics'] as Map<String, dynamic>? ?? {};
    final skills = _analytics?['skill_metrics'] as Map<String, dynamic>? ?? {};
    final careers =
        _analytics?['career_metrics'] as Map<String, dynamic>? ?? {};
    final content =
        _analytics?['content_metrics'] as Map<String, dynamic>? ?? {};
    final activity =
        _analytics?['activity_metrics'] as Map<String, dynamic>? ?? {};
    final ai = _analytics?['ai_metrics'] as Map<String, dynamic>? ?? {};

    final isAssessInsufficient = assess['is_insufficient_data'] == true;
    final isSkillInsufficient = skills['is_insufficient_data'] == true;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header & CSV Export Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: const [
                  Text(
                    'Platform Learning Analytics',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w700,
                      color: AdminColors.textPrimary,
                      letterSpacing: -0.5,
                    ),
                  ),
                  SizedBox(height: 4),
                  Text(
                    'Verified platform metrics. Insufficient sample sizes are explicitly marked.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AdminColors.textSecondary,
                    ),
                  ),
                ],
              ),
              Wrap(
                spacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: _isExporting
                        ? null
                        : () => _triggerCsvExport('users', 'Users Directory'),
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Export Users'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _isExporting
                        ? null
                        : () => _triggerCsvExport(
                            'assessment-attempts',
                            'Assessment Results',
                          ),
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Export Attempts'),
                  ),
                  OutlinedButton.icon(
                    onPressed: _isExporting
                        ? null
                        : () => _triggerCsvExport(
                            'audit-logs',
                            'Compliance Audit Logs',
                          ),
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Export Audit Logs'),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 24),

          // User Metrics Grid
          const Text(
            'User Engagement & Role Distribution',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Total Users',
                  value: '${users['total_users'] ?? 0}',
                  icon: Icons.people,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Active Accounts',
                  value: '${users['active_users'] ?? 0}',
                  icon: Icons.check_circle,
                  iconColor: AdminColors.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Students',
                  value: '${users['students_count'] ?? 0}',
                  icon: Icons.school,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Instructors',
                  value: '${users['instructors_count'] ?? 0}',
                  icon: Icons.co_present,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Assessment Metrics & Insufficient Data Warning
          const Text(
            'Assessment Mastery & Completion',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
          ),
          const SizedBox(height: 12),
          if (isAssessInsufficient)
            Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AdminColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AdminColors.warning.withValues(alpha: 0.4),
                ),
              ),
              child: const Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: AdminColors.warning,
                    size: 20,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Notice: Fewer than 3 completed assessment attempts recorded. Pass rates and averages are provisional.',
                      style: TextStyle(
                        fontSize: 13,
                        color: AdminColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Total Attempts',
                  value: '${assess['total_attempts'] ?? 0}',
                  icon: Icons.quiz,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Pass Rate',
                  value: '${assess['pass_rate_percentage'] ?? 0}%',
                  icon: Icons.trending_up,
                  iconColor: AdminColors.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Avg Score',
                  value: '${assess['average_score'] ?? 0}%',
                  icon: Icons.assessment,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Roadmaps Built',
                  value: '${careers['total_roadmaps_generated'] ?? 0}',
                  icon: Icons.map,
                  iconColor: AdminColors.secondary,
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),

          // Skill Mastery & Telemetry
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Skill Mastery
              Expanded(
                flex: 2,
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AdminColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Skill Taxonomy & Mastery Records',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 8),
                        if (isSkillInsufficient)
                          const Text(
                            'Insufficient student mastery records (<3). Trends will populate as learners progress.',
                            style: TextStyle(
                              fontSize: 12,
                              color: AdminColors.textSecondary,
                            ),
                          ),
                        const SizedBox(height: 12),
                        ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.category,
                            color: AdminColors.primary,
                          ),
                          title: const Text('Registered Skills in Taxonomy'),
                          trailing: Text(
                            '${skills['total_skills'] ?? 0}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.grade,
                            color: AdminColors.success,
                          ),
                          title: const Text('Total Mastery Records'),
                          trailing: Text(
                            '${skills['total_mastery_records'] ?? 0}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.bolt,
                            color: AdminColors.warning,
                          ),
                          title: const Text('Logged Telemetry Events'),
                          trailing: Text(
                            '${activity['total_learner_activities'] ?? 0}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              // AI & Infrastructure Telemetry
              Expanded(
                flex: 2,
                child: Card(
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: const BorderSide(color: AdminColors.border),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'AI Engine & Content Status',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                          ),
                        ),
                        const SizedBox(height: 12),
                        ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.psychology,
                            color: AdminColors.primary,
                          ),
                          title: const Text('Configured AI Provider'),
                          trailing: Chip(
                            label: Text(
                              '${ai['ai_provider'] ?? "none"}',
                              style: const TextStyle(fontSize: 11),
                            ),
                            backgroundColor: ai['is_live_llm'] == true
                                ? AdminColors.successLight
                                : AdminColors.surface,
                          ),
                        ),
                        ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.menu_book,
                            color: AdminColors.secondary,
                          ),
                          title: const Text('Approved RAG Documents'),
                          trailing: Text(
                            '${content['approved_documents'] ?? 0}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        ListTile(
                          dense: true,
                          leading: const Icon(
                            Icons.code,
                            color: AdminColors.warning,
                          ),
                          title: const Text('Coding Problems Available'),
                          trailing: Text(
                            '${content['coding_problems'] ?? 0}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
