import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';

/// Primary dashboard tab highlighting next adaptive recommendation, weak concept diagnostics, and progress metrics.
class AdaptiveHomeTab extends StatefulWidget {
  final VoidCallback onNavigateToSkills;
  final VoidCallback onNavigateToCareers;

  const AdaptiveHomeTab({
    super.key,
    required this.onNavigateToSkills,
    required this.onNavigateToCareers,
  });

  @override
  State<AdaptiveHomeTab> createState() => _AdaptiveHomeTabState();
}

class _AdaptiveHomeTabState extends State<AdaptiveHomeTab> {
  final _apiClient = ApiClient();

  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic>? _recommendation;
  Map<String, dynamic>? _overview;
  List<dynamic> _weakConcepts = [];
  List<dynamic> _assessments = [];

  @override
  void initState() {
    super.initState();
    _fetchAdaptiveData();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchAdaptiveData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.getAdaptiveNextActivity(),
        _apiClient.getAdaptiveOverview(),
        _apiClient.getAdaptiveWeakConcepts(),
        _apiClient.getAssessments(),
      ]);

      if (mounted) {
        setState(() {
          _recommendation = results[0] as Map<String, dynamic>;
          _overview = results[1] as Map<String, dynamic>;
          _weakConcepts = results[2] as List<dynamic>;
          _assessments = results[3] as List<dynamic>;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _launchRecommendedActivity() {
    if (_recommendation == null) return;

    final targetSkillId = _recommendation!['target_skill_id'] as int?;
    final targetTitle =
        _recommendation!['target_skill_title'] as String? ?? 'Assessment';

    // Find matching assessment
    final assessment = _assessments.firstWhere(
      (a) => a['skill_id'] == targetSkillId,
      orElse: () => _assessments.isNotEmpty ? _assessments.first : null,
    );

    if (assessment != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AssessmentQuizScreen(
            assessmentId: assessment['id'] as int,
            title: assessment['title'] as String? ?? targetTitle,
          ),
        ),
      ).then((_) => _fetchAdaptiveData());
    } else {
      widget.onNavigateToSkills();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, size: 48, color: AppColors.error),
              const SizedBox(height: 16),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _fetchAdaptiveData,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final reason =
        _recommendation?['reason'] as String? ??
        'Personalized based on recent activity.';
    final recType =
        _recommendation?['recommendation_type'] as String? ?? 'practice';
    final targetTitle =
        _recommendation?['target_skill_title'] as String? ?? 'Core Foundations';
    final difficulty = _recommendation?['difficulty'] as String? ?? 'beginner';

    final totalSkills = _overview?['total_skills'] ?? 0;
    final masteredCount = _overview?['mastered_count'] ?? 0;
    final inProgressCount = _overview?['in_progress_count'] ?? 0;
    final avgMastery =
        (_overview?['average_mastery'] as num?)?.toDouble() ?? 0.0;

    return RefreshIndicator(
      onRefresh: _fetchAdaptiveData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Adaptive Recommendation Card
          Card(
            elevation: 3,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                gradient: LinearGradient(
                  colors: [
                    AppColors.primary.withValues(alpha: 0.12),
                    AppColors.secondary.withValues(alpha: 0.04),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          recType.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      StatusBadge(
                        label: difficulty.toUpperCase(),
                        status: BadgeStatus.inProgress,
                      ),
                      const Spacer(),
                      const Icon(Icons.auto_awesome, color: AppColors.primary),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(targetTitle, style: AppTypography.headlineMedium),
                  const SizedBox(height: 10),
                  // Explainability Card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.8),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.info_outline,
                          size: 18,
                          color: AppColors.primary,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Why this activity was recommended:',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                reason,
                                style: const TextStyle(
                                  fontSize: 13,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  AppButton(
                    label: 'Start Recommended Activity',
                    icon: Icons.play_arrow,
                    onPressed: _launchRecommendedActivity,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Holistic Mastery Metrics
          Row(
            children: [
              _buildMetricCard(
                'Mastered',
                '$masteredCount / $totalSkills',
                Icons.check_circle,
                AppColors.success,
              ),
              const SizedBox(width: 12),
              _buildMetricCard(
                'In Progress',
                '$inProgressCount',
                Icons.trending_up,
                AppColors.accent,
              ),
              const SizedBox(width: 12),
              _buildMetricCard(
                'Avg Mastery',
                '${(avgMastery * 100).toInt()}%',
                Icons.analytics,
                AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Diagnosed Weak Skills Section
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Diagnosed Weak Concepts',
                style: AppTypography.titleLarge,
              ),
              if (_weakConcepts.isNotEmpty)
                TextButton(
                  onPressed: widget.onNavigateToSkills,
                  child: const Text('View Taxonomy'),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (_weakConcepts.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: const [
                    Icon(Icons.verified, color: AppColors.success, size: 28),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'No critical concept weaknesses diagnosed! All practiced concepts are above the 60% proficiency threshold.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.lightTextSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          else
            ..._weakConcepts.map((item) {
              final title = item['skill_title'] as String? ?? '';
              final category = item['category'] as String? ?? '';
              final mastery =
                  (item['mastery_score'] as num?)?.toDouble() ?? 0.0;
              final action =
                  item['recommended_action'] as String? ?? 'Revision';
              final itemReason = item['reason'] as String? ?? '';

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: AppColors.warning.withValues(alpha: 0.3),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                  ),
                                ),
                                Text(
                                  category,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${(mastery * 100).toInt()}% Mastery',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: AppColors.warning,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        itemReason,
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(36),
                          foregroundColor: AppColors.primary,
                        ),
                        icon: const Icon(Icons.refresh, size: 16),
                        label: Text('Action: $action'),
                        onPressed: () {
                          // Jump directly to quiz for this skill
                          final skillId = item['skill_id'] as int?;
                          final match = _assessments.firstWhere(
                            (a) => a['skill_id'] == skillId,
                            orElse: () => null,
                          );
                          if (match != null) {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (_) => AssessmentQuizScreen(
                                  assessmentId: match['id'] as int,
                                  title: match['title'] as String? ?? title,
                                ),
                              ),
                            ).then((_) => _fetchAdaptiveData());
                          } else {
                            widget.onNavigateToSkills();
                          }
                        },
                      ),
                    ],
                  ),
                ),
              );
            }),

          const SizedBox(height: 20),
          // Career Alignment Banner
          Card(
            color: AppColors.secondary.withValues(alpha: 0.08),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  const Icon(
                    Icons.rocket_launch,
                    color: AppColors.secondary,
                    size: 32,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'Target Career Intelligence',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          ),
                        ),
                        SizedBox(height: 4),
                        Text(
                          'Analyze skill gaps against industry benchmarks and generate custom roadmaps.',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: widget.onNavigateToCareers,
                    child: const Text('Explore'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildMetricCard(
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Expanded(
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 6),
              Text(
                value,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  color: AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
