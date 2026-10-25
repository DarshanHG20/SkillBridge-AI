import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import 'assessment_result_screen.dart';

/// Interactive assessment taker with timer, question navigation, option selection, and server-side submission.
class AssessmentQuizScreen extends StatefulWidget {
  final int assessmentId;
  final String title;

  const AssessmentQuizScreen({
    super.key,
    required this.assessmentId,
    required this.title,
  });

  @override
  State<AssessmentQuizScreen> createState() => _AssessmentQuizScreenState();
}

class _AssessmentQuizScreenState extends State<AssessmentQuizScreen> {
  final _apiClient = ApiClient();

  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _errorMessage;

  int? _attemptId;
  List<dynamic> _questions = [];
  int _currentIndex = 0;
  final Map<int, dynamic> _selectedAnswers = {};
  final Map<int, int> _timeSpentPerQuestion = {};

  Timer? _timer;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    _startQuizSession();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _startQuizSession() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await _apiClient.startAssessment(widget.assessmentId);
      if (mounted) {
        setState(() {
          _attemptId = data['attempt_id'] as int?;
          _questions = (data['questions'] as List?) ?? [];
          _isLoading = false;
        });
        _startTimer();
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

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      setState(() {
        _elapsedSeconds++;
        if (_questions.isNotEmpty) {
          final qId = _questions[_currentIndex]['id'] as int;
          _timeSpentPerQuestion[qId] = (_timeSpentPerQuestion[qId] ?? 0) + 1;
        }
      });
    });
  }

  String _formatDuration(int totalSeconds) {
    final minutes = totalSeconds ~/ 60;
    final seconds = totalSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  void _selectOption(int questionId, dynamic option) {
    setState(() {
      _selectedAnswers[questionId] = option;
    });
  }

  Future<void> _confirmAndSubmit() async {
    final unansweredCount = _questions.length - _selectedAnswers.length;

    final shouldSubmit = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Submit Assessment?'),
        content: Text(
          unansweredCount > 0
              ? 'You have $unansweredCount unanswered question(s). Are you sure you want to finish and grade this assessment?'
              : 'Are you sure you want to finalize your submission? Answers cannot be changed after grading.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Review Answers'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Submit & Grade'),
          ),
        ],
      ),
    );

    if (shouldSubmit == true) {
      _executeSubmit();
    }
  }

  Future<void> _executeSubmit() async {
    if (_attemptId == null) return;

    _timer?.cancel();
    setState(() {
      _isSubmitting = true;
    });

    try {
      final responses = _questions.map((q) {
        final qId = q['id'] as int;
        return {
          'question_id': qId,
          'learner_response_json': _selectedAnswers[qId],
          'time_spent_seconds': _timeSpentPerQuestion[qId] ?? 0,
        };
      }).toList();

      final result = await _apiClient.submitAssessment(_attemptId!, {
        'responses': responses,
      });

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => AssessmentResultScreen(result: result),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Initializing secure assessment session...'),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(
                  Icons.error_outline,
                  size: 48,
                  color: AppColors.error,
                ),
                const SizedBox(height: 16),
                Text(_errorMessage!, textAlign: TextAlign.center),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _startQuizSession,
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.title)),
        body: const Center(
          child: Text('No questions available in this assessment.'),
        ),
      );
    }

    final currentQuestion = _questions[_currentIndex];
    final qId = currentQuestion['id'] as int;
    final prompt = currentQuestion['prompt'] as String? ?? '';
    final options = (currentQuestion['options_json'] as List?) ?? [];
    final selected = _selectedAnswers[qId];

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.timer_outlined,
                  size: 16,
                  color: AppColors.primary,
                ),
                const SizedBox(width: 4),
                Text(
                  _formatDuration(_elapsedSeconds),
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: _isSubmitting
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Scoring answers and calibrating concept mastery...'),
                ],
              ),
            )
          : SafeArea(
              child: Column(
                children: [
                  // Progress indicator
                  LinearProgressIndicator(
                    value: (_currentIndex + 1) / _questions.length,
                    backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                    color: AppColors.primary,
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Question ${_currentIndex + 1} of ${_questions.length}',
                          style: AppTypography.titleMedium.copyWith(
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        Text(
                          '${currentQuestion['points'] ?? 10} pts',
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.accent,
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Question and Options
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      children: [
                        Card(
                          elevation: 0,
                          color: AppColors.primary.withValues(alpha: 0.04),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(
                              color: AppColors.primary.withValues(alpha: 0.15),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Text(
                              prompt,
                              style: AppTypography.titleLarge.copyWith(
                                height: 1.4,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Text(
                          'Select your answer:',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.lightTextSecondary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        ...options.map((opt) {
                          final isSelected = selected == opt;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 12),
                            child: InkWell(
                              onTap: () => _selectOption(qId, opt),
                              borderRadius: BorderRadius.circular(12),
                              child: Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppColors.primary.withValues(
                                          alpha: 0.08,
                                        )
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected
                                        ? AppColors.primary
                                        : Colors.grey.withValues(alpha: 0.3),
                                    width: isSelected ? 2.0 : 1.0,
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      isSelected
                                          ? Icons.radio_button_checked
                                          : Icons.radio_button_off,
                                      color: isSelected
                                          ? AppColors.primary
                                          : Colors.grey,
                                      size: 22,
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Text(
                                        opt.toString(),
                                        style: TextStyle(
                                          fontSize: 15,
                                          fontWeight: isSelected
                                              ? FontWeight.w600
                                              : FontWeight.normal,
                                          color: isSelected
                                              ? AppColors.primary
                                              : null,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),

                  // Navigation Bar
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        if (_currentIndex > 0)
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {
                                setState(() {
                                  _currentIndex--;
                                });
                              },
                              child: const Text('Previous'),
                            ),
                          ),
                        if (_currentIndex > 0) const SizedBox(width: 12),
                        Expanded(
                          child: _currentIndex == _questions.length - 1
                              ? AppButton(
                                  label: 'Submit Assessment',
                                  icon: Icons.check_circle_outline,
                                  onPressed: _confirmAndSubmit,
                                )
                              : AppButton(
                                  label: 'Next Question',
                                  icon: Icons.arrow_forward,
                                  onPressed: () {
                                    setState(() {
                                      _currentIndex++;
                                    });
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
