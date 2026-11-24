import 'package:flutter/material.dart';

import '../../../core/routing/app_router.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';

/// Assessment results screen displaying server-side grade, pass/fail status, and diagnostic explanations.
class AssessmentResultScreen extends StatelessWidget {
  final Map<String, dynamic> result;

  const AssessmentResultScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final title = result['assessment_title'] as String? ?? 'Assessment Results';
    final score =
        ((result['score_achieved'] ?? result['score']) as num?)?.toDouble() ??
        0.0;
    final isPassed =
        (result['is_passed'] ?? result['passed']) as bool? ?? false;
    final earned = result['total_points_earned'] ?? 0;
    final possible = result['total_points_possible'] ?? 0;
    final feedback =
        (result['adaptive_feedback'] ?? result['feedback']) as String? ??
        'Assessment completed.';
    final questionResults =
        ((result['question_results'] ?? result['questions_breakdown'])
            as List?) ??
        [];
    final computedCorrect = questionResults
        .where((q) => (q as Map<String, dynamic>)['is_correct'] == true)
        .length;
    final correctCount = (result['correct_count'] as int?) ?? computedCorrect;
    final totalQuestions =
        (result['total_questions'] as int?) ?? questionResults.length;
    final incorrectCount =
        (result['incorrect_count'] as int?) ??
        (totalQuestions - correctCount).clamp(0, totalQuestions);

    final themeColor = isPassed ? AppColors.success : AppColors.warning;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Assessment Results'),
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Score Summary Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 24,
                ),
                child: Column(
                  children: [
                    Text(
                      title,
                      style: AppTypography.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 120,
                          height: 120,
                          child: CircularProgressIndicator(
                            value: score / 100.0,
                            strokeWidth: 10,
                            backgroundColor: themeColor.withValues(alpha: 0.15),
                            color: themeColor,
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${score.toInt()}%',
                              style: TextStyle(
                                fontSize: 30,
                                fontWeight: FontWeight.bold,
                                color: themeColor,
                              ),
                            ),
                            Text(
                              isPassed ? 'PASSED' : 'RETRY NEEDED',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.8,
                                color: themeColor,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Earned $earned of $possible total points',
                      style: AppTypography.bodyMedium.copyWith(
                        color: AppColors.lightTextSecondary,
                      ),
                    ),
                    if (totalQuestions > 0) ...[
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 10,
                        alignment: WrapAlignment.center,
                        children: [
                          Chip(
                            avatar: const Icon(
                              Icons.check_circle,
                              size: 16,
                              color: AppColors.success,
                            ),
                            label: Text('Correct: $correctCount'),
                            backgroundColor: AppColors.success.withValues(
                              alpha: 0.1,
                            ),
                          ),
                          Chip(
                            avatar: const Icon(
                              Icons.cancel,
                              size: 16,
                              color: AppColors.error,
                            ),
                            label: Text('Incorrect: $incorrectCount'),
                            backgroundColor: AppColors.error.withValues(
                              alpha: 0.1,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    StatusBadge(
                      label: isPassed
                          ? 'Milestone Unlocked'
                          : 'Reinforcement Recommended',
                      status: isPassed
                          ? BadgeStatus.mastered
                          : BadgeStatus.inProgress,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Adaptive Feedback Card
            Card(
              color: AppColors.primary.withValues(alpha: 0.05),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(
                  color: AppColors.primary.withValues(alpha: 0.2),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(
                      Icons.psychology,
                      color: AppColors.primary,
                      size: 28,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Adaptive Feedback',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            feedback,
                            style: const TextStyle(
                              height: 1.4,
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Detailed Question Review
            const Text(
              'Question Explanations & Review',
              style: AppTypography.titleLarge,
            ),
            const SizedBox(height: 8),
            ...questionResults.asMap().entries.map((entry) {
              final index = entry.key;
              final q = entry.value as Map<String, dynamic>;
              final isCorrect = q['is_correct'] as bool? ?? false;
              final prompt = q['prompt'] as String? ?? '';
              final learnerAns =
                  (q['learner_response_json'] ?? q['selected_option'])
                      ?.toString() ??
                  'No answer';
              final correctAns =
                  (q['correct_answer_json'] ?? q['correct_answer'])
                      ?.toString() ??
                  '';
              final explanation =
                  q['explanation'] as String? ?? 'No explanation available.';

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: ExpansionTile(
                  leading: CircleAvatar(
                    radius: 14,
                    backgroundColor: isCorrect
                        ? AppColors.success.withValues(alpha: 0.15)
                        : AppColors.error.withValues(alpha: 0.15),
                    child: Icon(
                      isCorrect ? Icons.check : Icons.close,
                      color: isCorrect ? AppColors.success : AppColors.error,
                      size: 16,
                    ),
                  ),
                  title: Text(
                    'Q${index + 1}: $prompt',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  subtitle: Text(
                    isCorrect
                        ? 'Correct (+${q['points_earned'] ?? 10} pts)'
                        : 'Incorrect (0 pts)',
                    style: TextStyle(
                      fontSize: 12,
                      color: isCorrect ? AppColors.success : AppColors.error,
                    ),
                  ),
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Your Answer: $learnerAns',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: isCorrect
                                  ? AppColors.success
                                  : AppColors.error,
                            ),
                          ),
                          if (!isCorrect) ...[
                            const SizedBox(height: 4),
                            Text(
                              'Correct Answer: $correctAns',
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                          const Divider(height: 20),
                          const Text(
                            'Conceptual Explanation:',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            explanation,
                            style: const TextStyle(fontSize: 13, height: 1.4),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),

            const SizedBox(height: 24),
            AppButton(
              label: 'Return to Dashboard',
              icon: Icons.dashboard,
              onPressed: () {
                if (Navigator.canPop(context)) {
                  Navigator.pop(context, true);
                } else {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    AppRouter.dashboard,
                    (r) => false,
                  );
                }
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
