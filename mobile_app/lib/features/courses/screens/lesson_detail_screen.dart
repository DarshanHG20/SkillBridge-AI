import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';

/// Interactive lesson reader displaying curriculum notes, code examples, and MongoDB completion persistence.
class LessonDetailScreen extends StatefulWidget {
  final int courseId;
  final String courseTitle;
  final String moduleTitle;
  final Map<String, dynamic> lesson;
  final List<Map<String, dynamic>> allCourseLessons;
  final int? assessmentId;
  final String? assessmentTitle;
  final ApiClient? apiClient;

  const LessonDetailScreen({
    super.key,
    required this.courseId,
    required this.courseTitle,
    required this.moduleTitle,
    required this.lesson,
    required this.allCourseLessons,
    this.assessmentId,
    this.assessmentTitle,
    this.apiClient,
  });

  @override
  State<LessonDetailScreen> createState() => _LessonDetailScreenState();
}

class _LessonDetailScreenState extends State<LessonDetailScreen> {
  late final ApiClient _apiClient;
  late bool _isCompleted;
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    _isCompleted = widget.lesson['is_completed'] == true;
  }

  @override
  void dispose() {
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _toggleLessonCompletion() async {
    if (_isSaving) return;
    final lessonId = (widget.lesson['lesson_id'] ?? '').toString();
    if (lessonId.isEmpty) return;

    setState(() => _isSaving = true);
    try {
      final targetState = !_isCompleted;
      final res = await _apiClient.completeLesson(
        widget.courseId,
        lessonId,
        completed: targetState,
      );
      if (!mounted) return;
      setState(() {
        _isCompleted = res['completed'] == true;
        widget.lesson['is_completed'] = _isCompleted;
        _isSaving = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _isCompleted
                ? 'Lesson completed! Course progress: ${res['completion_percentage']}%'
                : 'Lesson marked as incomplete.',
          ),
          backgroundColor:
              _isCompleted ? AppColors.success : AppColors.secondary,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Could not save lesson progress: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  Map<String, dynamic>? _findNextLesson() {
    final curId = widget.lesson['lesson_id']?.toString();
    final idx = widget.allCourseLessons.indexWhere(
      (l) => l['lesson_id']?.toString() == curId,
    );
    if (idx >= 0 && idx + 1 < widget.allCourseLessons.length) {
      return widget.allCourseLessons[idx + 1];
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final title = (widget.lesson['title'] ?? 'Lesson').toString();
    final content = (widget.lesson['content'] ?? '').toString();
    final codeExample = (widget.lesson['code_example'] ?? '').toString();
    final duration = widget.lesson['duration_minutes'] ?? 15;
    final takeaways = (widget.lesson['key_takeaways'] as List?) ?? [];
    final nextLesson = _findNextLesson();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          Navigator.pop(context, true);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.courseTitle),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context, true),
          ),
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      widget.moduleTitle,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  Chip(
                    avatar: const Icon(Icons.schedule, size: 15),
                    label: Text(
                      '$duration min',
                      style: const TextStyle(fontSize: 12),
                    ),
                    visualDensity: VisualDensity.compact,
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(title, style: AppTypography.headlineMedium),
              const SizedBox(height: 16),

              // Lesson Content Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Text(
                    content,
                    style: const TextStyle(fontSize: 15, height: 1.6),
                  ),
                ),
              ),

              if (codeExample.trim().isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Code Example',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3),
                    ),
                  ),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SelectableText(
                      codeExample,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 13,
                        color: Color(0xFFE2E8F0),
                        height: 1.5,
                      ),
                    ),
                  ),
                ),
              ],

              if (takeaways.isNotEmpty) ...[
                const SizedBox(height: 16),
                Card(
                  color: AppColors.secondary.withValues(alpha: 0.06),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(
                      color: AppColors.secondary.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Key Takeaways',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: AppColors.secondary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        ...takeaways.map(
                          (item) => Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(
                                  Icons.check_circle_outline,
                                  size: 16,
                                  color: AppColors.success,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    item.toString(),
                                    style: const TextStyle(
                                      fontSize: 13,
                                      height: 1.4,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],

              const SizedBox(height: 22),
              AppButton(
                label: _isCompleted
                    ? 'Completed (Tap to Undo)'
                    : 'Mark Lesson Completed',
                icon: _isCompleted ? Icons.verified : Icons.check_circle,
                isLoading: _isSaving,
                onPressed: _toggleLessonCompletion,
              ),

              if (nextLesson != null) ...[
                const SizedBox(height: 12),
                AppButton(
                  label: 'Next: ${nextLesson['title']}',
                  icon: Icons.arrow_forward,
                  variant: AppButtonVariant.outline,
                  onPressed: () {
                    Navigator.pushReplacement(
                      context,
                      MaterialPageRoute(
                        builder: (_) => LessonDetailScreen(
                          courseId: widget.courseId,
                          courseTitle: widget.courseTitle,
                          moduleTitle:
                              (nextLesson['_module_title'] ??
                                      widget.moduleTitle)
                                  .toString(),
                          lesson: nextLesson,
                          allCourseLessons: widget.allCourseLessons,
                          assessmentId: widget.assessmentId,
                          assessmentTitle: widget.assessmentTitle,
                          apiClient: widget.apiClient,
                        ),
                      ),
                    );
                  },
                ),
              ] else if (widget.assessmentId != null) ...[
                const SizedBox(height: 12),
                AppButton(
                  label: 'Take Course Quiz',
                  icon: Icons.quiz_outlined,
                  variant: AppButtonVariant.outline,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => AssessmentQuizScreen(
                          assessmentId: widget.assessmentId!,
                          title:
                              widget.assessmentTitle ??
                              '${widget.courseTitle} Quiz',
                        ),
                      ),
                    );
                  },
                ),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

