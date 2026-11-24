import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';
import '../../assessments/screens/assessment_result_screen.dart';
import '../../courses/screens/course_detail_screen.dart';

/// Complete learner dashboard showing courses, quiz metrics, streak, progress, activities & adaptive recommendations.
class AdaptiveHomeTab extends StatefulWidget {
  final VoidCallback? onNavigateToCourses;
  final VoidCallback onNavigateToSkills;
  final VoidCallback onNavigateToCareers;
  final ValueListenable<int>? refreshTrigger;
  final ApiClient? apiClient;

  const AdaptiveHomeTab({
    super.key,
    this.onNavigateToCourses,
    required this.onNavigateToSkills,
    required this.onNavigateToCareers,
    this.refreshTrigger,
    this.apiClient,
  });

  @override
  State<AdaptiveHomeTab> createState() => _AdaptiveHomeTabState();
}

class _AdaptiveHomeTabState extends State<AdaptiveHomeTab> {
  late final ApiClient _apiClient;

  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic>? _recommendation;
  Map<String, dynamic>? _overview;
  List<dynamic> _weakConcepts = [];
  List<dynamic> _assessments = [];

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    widget.refreshTrigger?.addListener(_onExternalRefresh);
    _fetchAdaptiveData();
  }

  void _onExternalRefresh() {
    if (mounted) {
      _fetchAdaptiveData();
    }
  }

  @override
  void didUpdateWidget(covariant AdaptiveHomeTab oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.refreshTrigger != widget.refreshTrigger) {
      oldWidget.refreshTrigger?.removeListener(_onExternalRefresh);
      widget.refreshTrigger?.addListener(_onExternalRefresh);
    }
  }

  @override
  void dispose() {
    widget.refreshTrigger?.removeListener(_onExternalRefresh);
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchAdaptiveData() async {
    if (_overview == null) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

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
          _errorMessage = null;
        });
      }
    } catch (e) {
      if (mounted) {
        if (e is ApiException && e.statusCode == 401) {
          TokenStorage().clearSession();
          Navigator.pushReplacementNamed(context, AppRouter.login);
          return;
        }
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _launchRecommendedActivity() {
    if (_recommendation == null) return;

    final targetSkillId =
        (_recommendation!['target_skill_id'] ??
                _recommendation!['target_entity_id'])
            as int?;
    final targetTitle =
        (_recommendation!['target_skill_title'] ??
                _recommendation!['title'] ??
                'Assessment')
            as String;

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
    } else if (widget.onNavigateToCourses != null) {
      widget.onNavigateToCourses!();
    } else {
      widget.onNavigateToSkills();
    }
  }

  Future<void> _openAttemptDetail(int attemptId) async {
    try {
      final detail = await _apiClient.getAttemptResults(attemptId);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AssessmentResultScreen(result: detail),
        ),
      ).then((_) => _fetchAdaptiveData());
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open quiz result: $e')),
      );
    }
  }

  void _openCourseDetail(int courseId, String title) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CourseDetailScreen(
          courseId: courseId,
          initialTitle: title,
          apiClient: widget.apiClient,
        ),
      ),
    ).then((_) => _fetchAdaptiveData());
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _overview == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null && _overview == null) {
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
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                    onPressed: _fetchAdaptiveData,
                    child: const Text('Retry'),
                  ),
                  const SizedBox(width: 12),
                  OutlinedButton(
                    onPressed: () {
                      TokenStorage().clearSession();
                      Navigator.pushReplacementNamed(context, AppRouter.login);
                    },
                    child: const Text('Log In'),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    final currentUser = TokenStorage().currentUser;
    final userName =
        (currentUser?['full_name'] ?? 'Learner').toString().trim();

    final enrolledCourses = _overview?['enrolled_courses_count'] ?? 0;
    final availableCourses = _overview?['available_courses'] ?? 0;
    final completedCourses = _overview?['completed_courses_count'] ?? 0;
    final inProgressCourses = _overview?['in_progress_courses_count'] ?? 0;
    final totalQuizzes = _overview?['total_quizzes_attempted'] ?? 0;
    final avgQuizScore =
        ((_overview?['average_quiz_score'] as num?) ?? 0).toDouble();
    final overallProgress =
        ((_overview?['overall_learning_progress'] as num?) ?? 0)
            .toDouble()
            .clamp(0.0, 100.0);
    final streakDays = _overview?['learning_streak_days'] ?? 0;

    final courseSummaries =
        (_overview?['course_progress_summary'] as List?) ?? [];
    final recentQuizzes = (_overview?['recent_quiz_results'] as List?) ?? [];
    final recentActivities = (_overview?['recent_activities'] as List?) ?? [];
    final masteredSkillsList = (_overview?['mastered_skills'] as List?) ?? [];

    final reason =
        (_recommendation?['reason'] ??
                _recommendation?['recommendation'] ??
                'Personalized based on recent activity.')
            as String;
    final recType =
        _recommendation?['recommendation_type'] as String? ?? 'practice';
    final targetTitle =
        (_recommendation?['target_skill_title'] ??
                _recommendation?['title'] ??
                'Core Foundations')
            as String;
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
          // Welcome & Learning Streak Header
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Welcome back, $userName',
                          style: AppTypography.titleLarge,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          enrolledCourses > 0
                              ? '$enrolledCourses active course(s) • ${overallProgress.toInt()}% overall progress'
                              : 'All $availableCourses courses unlocked — start learning today!',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: streakDays > 0
                          ? AppColors.warning.withValues(alpha: 0.14)
                          : Colors.grey.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          Icons.local_fire_department,
                          size: 16,
                          color:
                              streakDays > 0 ? AppColors.warning : Colors.grey,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '$streakDays day${streakDays == 1 ? '' : 's'}',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: streakDays > 0
                                ? AppColors.warning
                                : Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Overall Learning Progress Bar Card
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Overall Learning Progress',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      Text(
                        '${overallProgress.toInt()}%',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: LinearProgressIndicator(
                      value: overallProgress / 100.0,
                      minHeight: 9,
                      backgroundColor: Colors.grey.withValues(alpha: 0.18),
                      color: overallProgress >= 100
                          ? AppColors.success
                          : AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Course & Quiz KPI Cards (2x2 Grid)
          Row(
            children: [
              _buildMetricCard(
                'Enrolled',
                '$enrolledCourses / $availableCourses',
                Icons.menu_book,
                AppColors.primary,
              ),
              const SizedBox(width: 10),
              _buildMetricCard(
                'Completed',
                '$completedCourses ($inProgressCourses active)',
                Icons.workspace_premium,
                AppColors.success,
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _buildMetricCard(
                'Quizzes Taken',
                '$totalQuizzes',
                Icons.quiz,
                AppColors.secondary,
              ),
              const SizedBox(width: 10),
              _buildMetricCard(
                'Avg Quiz Score',
                '${avgQuizScore.toStringAsFixed(1)}%',
                Icons.grade,
                AppColors.accent,
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Enrolled Courses Progress
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Course Progress', style: AppTypography.titleLarge),
              if (widget.onNavigateToCourses != null)
                TextButton(
                  onPressed: widget.onNavigateToCourses,
                  child: const Text('All Courses'),
                ),
            ],
          ),
          const SizedBox(height: 6),
          if (courseSummaries.isEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'You have not started any courses yet.',
                      style: TextStyle(fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'All $availableCourses courses (Python, Java, JS & MERN, SQL, Data Science & ML) are unlocked and ready.',
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.lightTextSecondary,
                      ),
                    ),
                    if (widget.onNavigateToCourses != null) ...[
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: widget.onNavigateToCourses,
                        icon: const Icon(Icons.explore, size: 16),
                        label: const Text('Browse Courses'),
                      ),
                    ],
                  ],
                ),
              ),
            )
          else
            ...courseSummaries.map((raw) {
              final cp = raw as Map<String, dynamic>;
              final cId = cp['course_id'] as int;
              final title = (cp['title'] ?? '').toString();
              final pct = ((cp['completion_percentage'] as num?) ?? 0)
                  .toDouble()
                  .clamp(0.0, 100.0);
              final doneLessons = cp['completed_lessons_count'] ?? 0;
              final totalLessons = cp['total_lessons_count'] ?? 0;

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                clipBehavior: Clip.antiAlias,
                child: InkWell(
                  onTap: () => _openCourseDetail(cId, title),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                title,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            Text(
                              '${pct.toInt()}%',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: pct >= 100
                                    ? AppColors.success
                                    : AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${cp['category'] ?? ''} • $doneLessons / $totalLessons lessons completed',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: pct / 100.0,
                            minHeight: 6,
                            backgroundColor: Colors.grey.withValues(alpha: 0.16),
                            color: pct >= 100
                                ? AppColors.success
                                : AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          const SizedBox(height: 18),

          // Adaptive Next Recommendation Card
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
              padding: const EdgeInsets.all(18),
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
                  const SizedBox(height: 12),
                  Text(targetTitle, style: AppTypography.headlineMedium),
                  const SizedBox(height: 8),
                  Text(
                    reason,
                    style: const TextStyle(fontSize: 13, height: 1.35),
                  ),
                  const SizedBox(height: 14),
                  AppButton(
                    label: 'Start Recommended Activity',
                    icon: Icons.play_arrow,
                    onPressed: _launchRecommendedActivity,
                  ),
                  const SizedBox(height: 8),
                  AppButton(
                    label: 'View Learning Activities',
                    icon: Icons.history_edu,
                    variant: AppButtonVariant.outline,
                    onPressed: () =>
                        Navigator.pushNamed(context, AppRouter.activities)
                            .then((_) => _fetchAdaptiveData()),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Skill Mastery Summary Row
          Row(
            children: [
              _buildMetricCard(
                'Mastered Skills',
                '$masteredCount / $totalSkills',
                Icons.check_circle,
                AppColors.success,
              ),
              const SizedBox(width: 10),
              _buildMetricCard(
                'In Progress',
                '$inProgressCount',
                Icons.trending_up,
                AppColors.accent,
              ),
              const SizedBox(width: 10),
              _buildMetricCard(
                'Skill Mastery',
                '${(avgMastery * 100).toInt()}%',
                Icons.analytics,
                AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Mastered Skills Chips
          if (masteredSkillsList.isNotEmpty) ...[
            const Text('Skills Mastered', style: AppTypography.titleLarge),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: masteredSkillsList.map((raw) {
                final s = raw as Map<String, dynamic>;
                final pct =
                    (((s['mastery_score'] as num?) ?? 0) * 100).toInt();
                return Chip(
                  avatar: const Icon(
                    Icons.verified,
                    size: 16,
                    color: AppColors.success,
                  ),
                  label: Text('${s['title']} ($pct%)'),
                  backgroundColor: AppColors.success.withValues(alpha: 0.1),
                );
              }).toList(),
            ),
            const SizedBox(height: 18),
          ],

          // Skills Requiring Improvement
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Skills Requiring Improvement',
                style: AppTypography.titleLarge,
              ),
              if (_weakConcepts.isNotEmpty)
                TextButton(
                  onPressed: widget.onNavigateToSkills,
                  child: const Text('All Skills'),
                ),
            ],
          ),
          const SizedBox(height: 8),
          if (_weakConcepts.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(14),
                child: Row(
                  children: [
                    Icon(Icons.verified, color: AppColors.success, size: 24),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'No weak concept alerts right now! Take quizzes or study courses to keep sharpening skills.',
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
              final itemReason =
                  (item['reason'] ?? item['rationale'] ?? '') as String;

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

          const SizedBox(height: 18),

          // Recent Quiz Results Section
          const Text('Recent Quiz Results', style: AppTypography.titleLarge),
          const SizedBox(height: 8),
          if (recentQuizzes.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(14),
                child: Text(
                  'No quizzes attempted yet. Open any course or skill to take your first diagnostic quiz!',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
              ),
            )
          else
            ...recentQuizzes.map((raw) {
              final q = raw as Map<String, dynamic>;
              final isPassed = q['is_passed'] == true;
              final score = ((q['score_achieved'] as num?) ?? 0).toDouble();
              final attemptId = q['attempt_id'] as int?;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isPassed
                        ? AppColors.success.withValues(alpha: 0.14)
                        : AppColors.warning.withValues(alpha: 0.14),
                    child: Icon(
                      isPassed ? Icons.check_circle : Icons.quiz,
                      color: isPassed ? AppColors.success : AppColors.warning,
                    ),
                  ),
                  title: Text(
                    (q['title'] ?? 'Quiz').toString(),
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  subtitle: Text(
                    'Score: ${score.toInt()}% • ${isPassed ? 'Passed' : 'Review Recommended'}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: attemptId != null
                      ? () => _openAttemptDetail(attemptId)
                      : null,
                ),
              );
            }),

          const SizedBox(height: 18),

          // Recent Learning Activity Section
          const Text(
            'Recent Learning Activity',
            style: AppTypography.titleLarge,
          ),
          const SizedBox(height: 8),
          if (recentActivities.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(14),
                child: Text(
                  'Your completed lessons, course enrollments, and assessments will appear here.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
              ),
            )
          else
            ...recentActivities.map((raw) {
              final act = raw as Map<String, dynamic>;
              final actType = (act['activity_type'] ?? 'learning').toString();
              final meta =
                  (act['metadata_json'] as Map<String, dynamic>?) ?? {};
              final subtitle =
                  (meta['lesson_title'] ??
                          meta['course_title'] ??
                          meta['assessment_title'] ??
                          actType.replaceAll('_', ' '))
                      .toString();
              final label = actType.replaceAll('_', ' ').toUpperCase();

              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(
                    Icons.bolt_outlined,
                    color: AppColors.primary,
                  ),
                  title: Text(
                    subtitle,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(label, style: const TextStyle(fontSize: 11)),
                ),
              );
            }),

          const SizedBox(height: 16),

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
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
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
