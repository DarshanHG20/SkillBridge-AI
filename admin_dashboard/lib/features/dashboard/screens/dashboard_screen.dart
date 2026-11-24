import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/routing/admin_router.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';
import '../../../shared/widgets/stat_card.dart';

/// Main web dashboard page for administrators and curriculum managers.
class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _apiClient = AdminApiClient();

  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _analytics;
  Map<String, dynamic>? _health;
  List<dynamic> _auditLogs = [];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.getAnalytics(),
        _apiClient.getAuditLogs(limit: 10),
        _apiClient.checkHealth().catchError((_) => <String, dynamic>{}),
      ]);

      if (!mounted) return;
      final logsResp = results[1];
      setState(() {
        _analytics = results[0];
        _auditLogs =
            (logsResp['items'] as List?) ??
            (logsResp['audit_logs'] as List?) ??
            [];
        _health = results[2];
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final userMetrics =
        (_analytics?['user_metrics'] as Map<String, dynamic>?) ?? {};
    final skillMetrics =
        (_analytics?['skill_metrics'] as Map<String, dynamic>?) ?? {};
    final assessmentMetrics =
        (_analytics?['assessment_metrics'] as Map<String, dynamic>?) ?? {};

    final totalLearners =
        _analytics?['total_users'] ?? userMetrics['total_users'] ?? 0;
    final activeLearners =
        _analytics?['active_users'] ?? userMetrics['active_users'] ?? 0;
    final totalSkills =
        _analytics?['total_skills'] ?? skillMetrics['total_skills'] ?? 0;
    final totalPrereqs =
        skillMetrics['total_prerequisites'] ??
        _analytics?['total_prerequisites'] ??
        0;
    final totalAssessments =
        _analytics?['total_assessments_taken'] ??
        assessmentMetrics['total_attempts'] ??
        0;
    final passRateRaw =
        (_analytics?['pass_rate'] ?? assessmentMetrics['pass_rate']) as num?;
    final passRateLabel = passRateRaw != null
        ? '${passRateRaw.toStringAsFixed(1)}% Pass Rate'
        : 'Awaiting attempts';

    final dbOk = _health?['database_connected'] == true;
    final engineLabel = _health == null || _health!.isEmpty
        ? 'Checking...'
        : (dbOk ? 'Online' : 'Memory Fallback');
    final engineSubtitle = dbOk
        ? 'Node.js + MongoDB (${_health?['status'] ?? 'healthy'})'
        : 'Express + MongoMemoryServer';

    return AdminScaffold(
      activeRoute: '/dashboard',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Overview & Platform Analytics',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AdminColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Real-time telemetry from student mobile apps, web portal, skill graphs, and adaptive diagnostics.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AdminColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Refresh Telemetry',
                      onPressed: _loadDashboardData,
                      icon: const Icon(Icons.refresh),
                    ),
                    const SizedBox(width: 4),
                    OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pushNamed(context, AdminRouter.users);
                      },
                      icon: const Icon(Icons.people_outline, size: 18),
                      label: const Text('Manage Users'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AdminColors.primary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 12,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pushNamed(context, AdminRouter.skills);
                      },
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Manage Curriculum'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AdminColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 20),

            if (_errorMessage != null) ...[
              Card(
                color: AdminColors.error.withValues(alpha: 0.06),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: AdminColors.error),
                      const SizedBox(width: 10),
                      Expanded(child: Text(_errorMessage!)),
                      TextButton(
                        onPressed: _loadDashboardData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],

            if (_isLoading && _analytics == null)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              // Stat Cards Grid
              LayoutBuilder(
                builder: (context, constraints) {
                  final crossAxisCount = constraints.maxWidth > 1100
                      ? 4
                      : constraints.maxWidth > 700
                      ? 2
                      : 1;

                  return GridView.count(
                    crossAxisCount: crossAxisCount,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: crossAxisCount == 4 ? 1.6 : 2.2,
                    children: [
                      StatCard(
                        title: 'Total Learners',
                        value: '$totalLearners',
                        subtitle: '$activeLearners active accounts',
                        icon: Icons.people_alt_outlined,
                        iconColor: AdminColors.primary,
                      ),
                      StatCard(
                        title: 'Skill Graph Nodes',
                        value: '$totalSkills',
                        subtitle: '$totalPrereqs prerequisite edges',
                        icon: Icons.account_tree_outlined,
                        iconColor: AdminColors.info,
                      ),
                      StatCard(
                        title: 'Assessments Taken',
                        value: '$totalAssessments',
                        subtitle: passRateLabel,
                        icon: Icons.quiz_outlined,
                        iconColor: AdminColors.success,
                      ),
                      StatCard(
                        title: 'Engine Health',
                        value: engineLabel,
                        subtitle: engineSubtitle,
                        icon: Icons.health_and_safety_outlined,
                        iconColor: AdminColors.warning,
                      ),
                    ],
                  );
                },
              ),

              const SizedBox(height: 24),

              // Recent Audit Logs & System Activity Table
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Recent System & Audit Events',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AdminColors.textPrimary,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pushNamed(context, AdminRouter.audit);
                            },
                            child: const Text('View Full Stream'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (_auditLogs.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: Center(
                            child: Text(
                              'No administrative audit events recorded yet.',
                              style: TextStyle(
                                color: AdminColors.textSecondary,
                              ),
                            ),
                          ),
                        )
                      else
                        SizedBox(
                          width: double.infinity,
                          child: DataTable(
                            columns: const [
                              DataColumn(label: Text('Timestamp')),
                              DataColumn(label: Text('Actor')),
                              DataColumn(label: Text('Action')),
                              DataColumn(label: Text('Entity Type')),
                              DataColumn(label: Text('Status')),
                            ],
                            rows: _auditLogs.map((raw) {
                              final log = raw as Map<String, dynamic>;
                              final created =
                                  (log['created_at'] ?? '').toString();
                              final shortTime = created.length >= 16
                                  ? created.substring(0, 16).replaceFirst('T', ' ')
                                  : created;
                              final actor =
                                  (log['admin_email'] ??
                                          (log['admin_id'] != null
                                              ? 'Admin #${log['admin_id']}'
                                              : 'System'))
                                      .toString();
                              final action = (log['action'] ?? '').toString();
                              final entityType =
                                  (log['entity_type'] ?? 'platform')
                                      .toString();

                              return DataRow(
                                cells: [
                                  DataCell(Text(shortTime)),
                                  DataCell(Text(actor)),
                                  DataCell(Text(action)),
                                  DataCell(Text(entityType)),
                                  const DataCell(
                                    Text(
                                      'Recorded',
                                      style: TextStyle(
                                        color: AdminColors.success,
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
