import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';
import 'lesson_detail_screen.dart';

/// Full course overview showing unlocked modules, clickable lessons, completion progress, and linked quiz.
class CourseDetailScreen extends StatefulWidget {
  final int courseId;
  final String? initialTitle;
  final ApiClient? apiClient;

  const CourseDetailScreen({
    super.key,
    required this.courseId,
    this.initialTitle,
    this.apiClient,
  });

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  late final ApiClient _apiClient;
  bool _isLoading = true;
  bool _isEnrolling = false;
  String? _errorMessage;
  Map<String, dynamic>? _course;

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    _loadCourse();
  }

  @override
  void dispose() {
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _loadCourse() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await _apiClient.getCourseDetail(widget.courseId);
      if (!mounted) return;
      setState(() {
        _course = data;
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

  Future<void> _enroll() async {
    if (_isEnrolling) return;
    setState(() => _isEnrolling = true);
    try {
      final updated = await _apiClient.enrollInCourse(widget.courseId);
      if (!mounted) return;
      setState(() {
        _course = updated;
        _isEnrolling = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enrolled in course! Start any lesson below.'),
          backgroundColor: AppColors.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isEnrolling = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Enrollment failed: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  void _openLesson(
    String moduleTitle,
    Map<String, dynamic> lesson,
    List<Map<String, dynamic>> flattenedLessons,
  ) {
    final assessment = _course?['assessment'] as Map<String, dynamic>?;
    final assessmentId =
        (_course?['assessment_id'] ?? assessment?['id']) as int?;
    final assessmentTitle = assessment?['title'] as String?;

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LessonDetailScreen(
          courseId: widget.courseId,
          courseTitle: (_course?['title'] ?? widget.initialTitle ?? 'Course')
              .toString(),
          moduleTitle: moduleTitle,
          lesson: Map<String, dynamic>.from(lesson),
          allCourseLessons: flattenedLessons,
          assessmentId: assessmentId,
          assessmentTitle: assessmentTitle,
          apiClient: widget.apiClient,
        ),
      ),
    ).then((_) => _loadCourse());
  }

  @override
  Widget build(BuildContext context) {
    final title =
        (_course?['title'] ?? widget.initialTitle ?? 'Course Details')
            .toString();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) {
          Navigator.pop(context, true);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => Navigator.pop(context, true),
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _loadCourse,
            ),
          ],
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _course == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null && _course == null) {
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
                onPressed: _loadCourse,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final c = _course!;
    final modules = (c['modules'] as List?) ?? [];
    final isEnrolled = c['is_enrolled'] == true;
    final completionPct = ((c['completion_percentage'] as num?) ?? 0)
        .toDouble()
        .clamp(0.0, 100.0);
    final completedCount = c['completed_lessons_count'] ?? 0;
    final totalCount = c['total_lessons_count'] ?? 0;
    final status = (c['status'] ?? 'unlocked').toString();
    final assessment = c['assessment'] as Map<String, dynamic>?;
    final assessmentId = (c['assessment_id'] ?? assessment?['id']) as int?;

    final flattenedLessons = <Map<String, dynamic>>[];
    for (final rawMod in modules) {
      final mod = rawMod as Map<String, dynamic>;
      final mTitle = (mod['title'] ?? '').toString();
      for (final rawL in (mod['lessons'] as List? ?? [])) {
        final lMap = Map<String, dynamic>.from(rawL as Map);
        lMap['_module_title'] = mTitle;
        flattenedLessons.add(lMap);
      }
    }

    final badgeStatus = completionPct >= 100 || status == 'completed'
        ? BadgeStatus.mastered
        : (isEnrolled ? BadgeStatus.inProgress : BadgeStatus.unlocked);

    return RefreshIndicator(
      onRefresh: _loadCourse,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Course Hero Summary Card
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Chip(
                        label: Text(
                          '${c['category'] ?? 'Course'} • ${(c['difficulty_level'] ?? 'beginner').toString().toUpperCase()}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        visualDensity: VisualDensity.compact,
                      ),
                      const Spacer(),
                      StatusBadge(
                        label: status.toUpperCase().replaceAll('_', ' '),
                        status: badgeStatus,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    (c['title'] ?? '').toString(),
                    style: AppTypography.headlineMedium,
                  ),
                  if ((c['subtitle'] ?? '').toString().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      c['subtitle'].toString(),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(
                    (c['description'] ?? '').toString(),
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Course Progress ($completedCount / $totalCount lessons)',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                      Text(
                        '${completionPct.toInt()}%',
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
                      value: completionPct / 100.0,
                      minHeight: 8,
                      backgroundColor: Colors.grey.withValues(alpha: 0.2),
                      color: completionPct >= 100
                          ? AppColors.success
                          : AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 16),

                  if (!isEnrolled) ...[
                    AppButton(
                      label: 'Enroll & Start Learning',
                      icon: Icons.play_circle_outline,
                      isLoading: _isEnrolling,
                      onPressed: _enroll,
                    ),
                    const SizedBox(height: 10),
                  ] else if (flattenedLessons.isNotEmpty) ...[
                    AppButton(
                      label: completionPct >= 100
                          ? 'Review First Lesson'
                          : 'Continue Next Lesson',
                      icon: Icons.menu_book,
                      onPressed: () {
                        final nextLesson = flattenedLessons.firstWhere(
                          (l) => l['is_completed'] != true,
                          orElse: () => flattenedLessons.first,
                        );
                        _openLesson(
                          (nextLesson['_module_title'] ?? 'Module').toString(),
                          nextLesson,
                          flattenedLessons,
                        );
                      },
                    ),
                    const SizedBox(height: 10),
                  ],

                  if (assessmentId != null)
                    AppButton(
                      label:
                          'Take Course Quiz (${assessment?['question_count'] ?? 5} Questions)',
                      icon: Icons.quiz_outlined,
                      variant: AppButtonVariant.outline,
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => AssessmentQuizScreen(
                              assessmentId: assessmentId,
                              title:
                                  (assessment?['title'] ??
                                          '${c['title']} Quiz')
                                      .toString(),
                            ),
                          ),
                        ).then((_) => _loadCourse());
                      },
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 20),
          Text(
            'Course Curriculum (${modules.length} Modules)',
            style: AppTypography.titleLarge,
          ),
          const SizedBox(height: 10),

          ...modules.map((rawMod) {
            final mod = rawMod as Map<String, dynamic>;
            final mTitle = (mod['title'] ?? '').toString();
            final mDesc = (mod['description'] ?? '').toString();
            final lessons = (mod['lessons'] as List?) ?? [];
            final doneInMod = mod['completed_lessons_count'] ?? 0;

            return Card(
              margin: const EdgeInsets.only(bottom: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              child: ExpansionTile(
                initiallyExpanded: true,
                title: Text(
                  mTitle,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                subtitle: Text(
                  '$doneInMod / ${lessons.length} completed${mDesc.isNotEmpty ? ' • $mDesc' : ''}',
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.lightTextSecondary,
                  ),
                ),
                children: lessons.map((rawLesson) {
                  final lesson = rawLesson as Map<String, dynamic>;
                  final isDone = lesson['is_completed'] == true;
                  return ListTile(
                    leading: CircleAvatar(
                      radius: 16,
                      backgroundColor: isDone
                          ? AppColors.success.withValues(alpha: 0.15)
                          : AppColors.primary.withValues(alpha: 0.12),
                      child: Icon(
                        isDone ? Icons.check : Icons.play_arrow,
                        size: 18,
                        color: isDone ? AppColors.success : AppColors.primary,
                      ),
                    ),
                    title: Text(
                      (lesson['title'] ?? '').toString(),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    subtitle: Text(
                      '${lesson['duration_minutes'] ?? 15} mins • ${isDone ? 'Completed' : 'Unlocked'}',
                      style: const TextStyle(fontSize: 12),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _openLesson(mTitle, lesson, flattenedLessons),
                  );
                }).toList(),
              ),
            );
          }),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

