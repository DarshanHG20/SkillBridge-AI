import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';
import '../../assessments/screens/assessment_result_screen.dart';
import '../../coding/screens/coding_practice_screen.dart';

/// Screen displaying the student's learning activities, completed assessments, coding submissions,
/// and adaptive recommendations.
class ActivitiesScreen extends StatefulWidget {
  final ApiClient? apiClient;

  const ActivitiesScreen({super.key, this.apiClient});

  @override
  State<ActivitiesScreen> createState() => _ActivitiesScreenState();
}

class _ActivitiesScreenState extends State<ActivitiesScreen> {
  late final ApiClient _apiClient;

  bool _isLoading = true;
  String? _errorMessage;

  Map<String, dynamic>? _nextActivity;
  List<dynamic> _assessmentHistory = [];
  List<dynamic> _codingSubmissions = [];
  List<dynamic> _assessments = [];

  String _filter = 'all'; // 'all', 'assessments', 'coding'

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    _fetchActivities();
  }

  @override
  void dispose() {
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchActivities() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.getAdaptiveNextActivity().catchError((_) => <String, dynamic>{}),
        _apiClient.getAssessmentHistory().catchError((_) => <dynamic>[]),
        _apiClient.getMyCodingSubmissions().catchError((_) => <dynamic>[]),
        _apiClient.getAssessments().catchError((_) => <dynamic>[]),
      ]);

      if (!mounted) return;
      final recResult = results[0];
      final Map<String, dynamic>? nextAct =
          (recResult is Map<String, dynamic> && recResult.isNotEmpty)
              ? recResult
              : null;

      setState(() {
        _nextActivity = nextAct;
        _assessmentHistory = results[1] as List<dynamic>;
        _codingSubmissions = results[2] as List<dynamic>;
        _assessments = results[3] as List<dynamic>;
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

  void _launchRecommendedActivity() {
    if (_nextActivity == null) return;

    final targetSkillId = _nextActivity!['target_skill_id'] as int?;
    final targetTitle =
        _nextActivity!['target_skill_title'] as String? ?? 'Skill Assessment';

    final match = _assessments.firstWhere(
      (a) => a['skill_id'] == targetSkillId,
      orElse: () => _assessments.isNotEmpty ? _assessments.first : null,
    );

    if (match != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AssessmentQuizScreen(
            assessmentId: match['id'] as int,
            title: match['title'] as String? ?? targetTitle,
          ),
        ),
      ).then((_) => _fetchActivities());
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No matching assessment available for this skill.')),
      );
    }
  }

  Future<void> _reviewAttempt(int attemptId) async {
    try {
      final details = await _apiClient.getAttemptResults(attemptId);
      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AssessmentResultScreen(result: details),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to load attempt details: $e')),
      );
    }
  }

  void _retakeAssessment(int assessmentId, String title) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => AssessmentQuizScreen(
          assessmentId: assessmentId,
          title: title,
        ),
      ),
    ).then((_) => _fetchActivities());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Learning Activities'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh Activities',
            onPressed: _fetchActivities,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
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
              Text(
                'Failed to load activities:\n$_errorMessage',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.error),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                onPressed: _fetchActivities,
              ),
            ],
          ),
        ),
      );
    }

    final hasAssessments = _assessmentHistory.isNotEmpty;
    final hasCoding = _codingSubmissions.isNotEmpty;
    final hasAnyHistory = hasAssessments || hasCoding;

    return RefreshIndicator(
      onRefresh: _fetchActivities,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Next Recommended Activity Section
          if (_nextActivity != null &&
              (_nextActivity!.containsKey('target_skill_title') ||
                  _nextActivity!.containsKey('title'))) ...[
            _buildRecommendedCard(),
            const SizedBox(height: 20),
          ],

          // Filter Chips
          Row(
            children: [
              ChoiceChip(
                label: const Text('All Activities'),
                selected: _filter == 'all',
                onSelected: (val) => setState(() => _filter = 'all'),
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: Text('Quizzes (${_assessmentHistory.length})'),
                selected: _filter == 'assessments',
                onSelected: (val) => setState(() => _filter = 'assessments'),
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: Text('Coding (${_codingSubmissions.length})'),
                selected: _filter == 'coding',
                onSelected: (val) => setState(() => _filter = 'coding'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Activity History List
          if (!hasAnyHistory)
            _buildEmptyState()
          else ...[
            if (_filter == 'all' || _filter == 'assessments') ...[
              if (_filter == 'all')
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('Completed Assessments', style: AppTypography.titleLarge),
                ),
              if (_assessmentHistory.isEmpty && _filter == 'assessments')
                _buildEmptyCategory('No quizzes completed yet.')
              else
                ..._assessmentHistory.map((item) => _buildAssessmentTile(item as Map<String, dynamic>)),
            ],
            if (_filter == 'all' || _filter == 'coding') ...[
              if (_filter == 'all' && _codingSubmissions.isNotEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 16, bottom: 8),
                  child: Text('Coding Practice Submissions', style: AppTypography.titleLarge),
                ),
              if (_codingSubmissions.isEmpty && _filter == 'coding')
                _buildEmptyCategory('No code solutions submitted yet.')
              else
                ..._codingSubmissions.map((item) => _buildCodingTile(item as Map<String, dynamic>)),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildRecommendedCard() {
    final title =
        (_nextActivity?['target_skill_title'] ??
                _nextActivity?['title'] ??
                'Next Topic')
            as String;
    final recType = (_nextActivity?['recommendation_type'] as String? ?? 'practice').toUpperCase();
    final reason =
        (_nextActivity?['reason'] ??
                _nextActivity?['recommendation'] ??
                'Adaptive next step to build concept mastery.')
            as String;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: LinearGradient(
            colors: [
              AppColors.primary.withValues(alpha: 0.12),
              AppColors.secondary.withValues(alpha: 0.05),
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
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    recType,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const Spacer(),
                const Icon(Icons.auto_awesome, color: AppColors.primary, size: 20),
              ],
            ),
            const SizedBox(height: 10),
            Text(title, style: AppTypography.headlineMedium),
            const SizedBox(height: 6),
            Text(
              reason,
              style: const TextStyle(fontSize: 13, color: AppColors.lightTextSecondary),
            ),
            const SizedBox(height: 14),
            AppButton(
              label: 'Start Recommended Assessment',
              icon: Icons.play_arrow,
              onPressed: _launchRecommendedActivity,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssessmentTile(Map<String, dynamic> item) {
    final title = item['title'] as String? ?? 'Skill Quiz';
    final score = (item['score_achieved'] as num?)?.toDouble() ?? 0.0;
    final isPassed = item['is_passed'] as bool? ?? false;
    final assessmentType = item['assessment_type'] as String? ?? 'formative';
    final attemptId = item['id'] as int?;
    final assessmentId = item['assessment_id'] as int?;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                StatusBadge(
                  label: isPassed ? 'PASSED • ${score.toInt()}%' : 'NEEDS REVISION • ${score.toInt()}%',
                  status: isPassed ? BadgeStatus.mastered : BadgeStatus.inProgress,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Type: ${assessmentType.toUpperCase()}',
              style: const TextStyle(fontSize: 12, color: AppColors.lightTextSecondary),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (attemptId != null)
                  OutlinedButton.icon(
                    icon: const Icon(Icons.analytics_outlined, size: 16),
                    label: const Text('Review Answers'),
                    onPressed: () => _reviewAttempt(attemptId),
                  ),
                const Spacer(),
                if (assessmentId != null)
                  TextButton.icon(
                    icon: const Icon(Icons.replay, size: 16),
                    label: const Text('Retake'),
                    onPressed: () => _retakeAssessment(assessmentId, title),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCodingTile(Map<String, dynamic> item) {
    final problemTitle = item['problem_title'] as String? ?? 'Problem #${item['problem_id'] ?? ''}';
    final passedCases = item['passed_test_cases'] ?? 0;
    final totalCases = item['total_test_cases'] ?? 0;
    final status = item['status'] as String? ?? 'completed';
    final isAllPassed = status == 'all_passed' || (totalCases > 0 && passedCases == totalCases);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Icon(
          Icons.code,
          color: isAllPassed ? AppColors.success : AppColors.secondary,
        ),
        title: Text(
          problemTitle,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text('Tests Passed: $passedCases / $totalCases • Status: $status'),
        trailing: StatusBadge(
          label: isAllPassed ? 'Passed' : 'Partial',
          status: isAllPassed ? BadgeStatus.mastered : BadgeStatus.inProgress,
        ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const CodingPracticeScreen(),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          children: [
            const Icon(Icons.assignment_outlined, size: 56, color: AppColors.primary),
            const SizedBox(height: 16),
            const Text(
              'No Learning Activities Yet',
              style: AppTypography.headlineMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'Complete your first diagnostic assessment or practice problem to populate your activity log.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
            ),
            const SizedBox(height: 20),
            if (_nextActivity != null)
              AppButton(
                label: 'Start First Activity',
                icon: Icons.play_arrow,
                onPressed: _launchRecommendedActivity,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCategory(String msg) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 20),
      child: Center(
        child: Text(
          msg,
          style: const TextStyle(color: AppColors.lightTextSecondary, fontSize: 13),
        ),
      ),
    );
  }
}
