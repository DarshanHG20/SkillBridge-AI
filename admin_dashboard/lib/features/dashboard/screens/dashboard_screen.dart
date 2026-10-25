import 'package:flutter/material.dart';

import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';
import '../../../shared/widgets/stat_card.dart';

/// Main web dashboard page for administrators and curriculum managers.
class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                      'Real-time telemetry from student mobile apps, skill graphs, and adaptive diagnostic tests.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AdminColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Row(
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pushNamed(context, '/users');
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
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Taxonomy Editor opens in Part 3.'),
                          ),
                        );
                      },
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add Skill Node'),
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

            const SizedBox(height: 24),

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
                  children: const [
                    StatCard(
                      title: 'Total Learners',
                      value: '1,420',
                      subtitle: '+18.4% from last week',
                      icon: Icons.people_alt_outlined,
                      iconColor: AdminColors.primary,
                    ),
                    StatCard(
                      title: 'Skill Graph Nodes',
                      value: '148',
                      subtitle: '312 Prerequisite Edges',
                      icon: Icons.account_tree_outlined,
                      iconColor: AdminColors.info,
                    ),
                    StatCard(
                      title: 'Assessments Taken',
                      value: '8,950',
                      subtitle: '78.2% Pass Rate',
                      icon: Icons.quiz_outlined,
                      iconColor: AdminColors.success,
                    ),
                    StatCard(
                      title: 'Engine Health',
                      value: '99.9%',
                      subtitle: 'FastAPI + MySQL 9.7',
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
                      children: const [
                        Text(
                          'Recent System & Audit Events',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AdminColors.textPrimary,
                          ),
                        ),
                        Text(
                          'Auto-refreshing (30s)',
                          style: TextStyle(
                            fontSize: 12,
                            color: AdminColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
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
                        rows: const [
                          DataRow(
                            cells: [
                              DataCell(Text('Today, 13:20')),
                              DataCell(Text('system_worker')),
                              DataCell(Text('skill_graph_recomputed')),
                              DataCell(Text('DAG Topology')),
                              DataCell(
                                Text(
                                  'Success',
                                  style: TextStyle(color: AdminColors.success),
                                ),
                              ),
                            ],
                          ),
                          DataRow(
                            cells: [
                              DataCell(Text('Today, 12:45')),
                              DataCell(Text('admin@skillbridge.ai')),
                              DataCell(Text('prerequisite_edge_added')),
                              DataCell(Text('Python Async -> FastApi')),
                              DataCell(
                                Text(
                                  'Success',
                                  style: TextStyle(color: AdminColors.success),
                                ),
                              ),
                            ],
                          ),
                          DataRow(
                            cells: [
                              DataCell(Text('Today, 11:15')),
                              DataCell(Text('student_telemetry')),
                              DataCell(Text('mastery_threshold_reached')),
                              DataCell(Text('Skill: SQL Indexing')),
                              DataCell(
                                Text(
                                  'Mastered',
                                  style: TextStyle(color: AdminColors.info),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
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
}
