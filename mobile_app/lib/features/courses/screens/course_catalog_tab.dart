import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/status_badge.dart';
import 'course_detail_screen.dart';

/// Displays all available learning courses (all unlocked by default) with progress tracking and navigation.
class CourseCatalogTab extends StatefulWidget {
  final VoidCallback? onProgressChanged;
  final ApiClient? apiClient;

  const CourseCatalogTab({
    super.key,
    this.onProgressChanged,
    this.apiClient,
  });

  @override
  State<CourseCatalogTab> createState() => _CourseCatalogTabState();
}

class _CourseCatalogTabState extends State<CourseCatalogTab> {
  late final ApiClient _apiClient;

  bool _isLoading = true;
  bool _isUnlockingAll = false;
  String? _errorMessage;
  List<dynamic> _courses = [];
  String _selectedCategory = 'All';

  List<String> get _categories {
    final cats = <String>{'All'};
    for (final raw in _courses) {
      final cat = ((raw as Map<String, dynamic>)['category'] ?? '')
          .toString()
          .trim();
      if (cat.isNotEmpty) cats.add(cat);
    }
    return cats.toList();
  }

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    _fetchCourses();
  }

  @override
  void dispose() {
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchCourses() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await _apiClient.getCourses();
      if (!mounted) return;
      setState(() {
        _courses = data;
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

  Future<void> _handleUnlockAll100() async {
    setState(() {
      _isUnlockingAll = true;
    });
    try {
      final res = await _apiClient.unlockAndMasterAll100();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              res['message'] as String? ??
                  'All courses and skills unlocked & completed at 100%!',
            ),
            backgroundColor: AppColors.success,
          ),
        );
        await _fetchCourses();
        widget.onProgressChanged?.call();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to unlock: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isUnlockingAll = false;
        });
      }
    }
  }

  void _openCourse(Map<String, dynamic> course) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => CourseDetailScreen(
          courseId: course['id'] as int,
          initialTitle: course['title'] as String?,
          apiClient: widget.apiClient,
        ),
      ),
    ).then((_) {
      _fetchCourses();
      widget.onProgressChanged?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _courses.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null && _courses.isEmpty) {
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
                onPressed: _fetchCourses,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final categories = _categories;
    final filtered = _selectedCategory == 'All'
        ? _courses
        : _courses
              .where((c) => (c as Map<String, dynamic>)['category'] == _selectedCategory)
              .toList();

    return Column(
      children: [
        // Fast Unlock All & Fill 100% Action Banner
        Container(
          margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF4F46E5), Color(0xFF7C3AED)],
            ),
            borderRadius: BorderRadius.circular(14),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF4F46E5).withValues(alpha: 0.3),
                blurRadius: 8,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: _isUnlockingAll ? null : _handleUnlockAll100,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                child: Row(
                  children: [
                    const Icon(Icons.bolt, color: Colors.amber, size: 26),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            'Fast Unlock All & Fill 100%',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          SizedBox(height: 2),
                          Text(
                            'Instantly complete 100% of all courses and lessons',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_isUnlockingAll)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    else
                      const Icon(
                        Icons.arrow_forward_ios,
                        color: Colors.white,
                        size: 14,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),

        // Category Filter Chips
        SizedBox(
          height: 50,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            itemCount: categories.length,
            itemBuilder: (context, idx) {
              final cat = categories[idx];
              final isSelected = cat == _selectedCategory;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  selectedColor: AppColors.primary,
                  labelStyle: TextStyle(
                    color: isSelected
                        ? Colors.white
                        : AppColors.lightTextPrimary,
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() => _selectedCategory = cat);
                    }
                  },
                ),
              );
            },
          ),
        ),

        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchCourses,
            child: filtered.isEmpty
                ? const Center(
                    child: Text('No courses available in this category yet.'),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) {
                      final c = filtered[index] as Map<String, dynamic>;
                      final title = (c['title'] ?? '').toString();
                      final subtitle = (c['subtitle'] ?? '').toString();
                      final category = (c['category'] ?? '').toString();
                      final difficulty =
                          (c['difficulty_level'] ?? 'beginner').toString();
                      final modulesCount = c['modules_count'] ?? 0;
                      final lessonsCount = c['total_lessons_count'] ?? 0;
                      final completedLessons = c['completed_lessons_count'] ?? 0;
                      final completionPct =
                          ((c['completion_percentage'] as num?) ?? 0)
                              .toDouble()
                              .clamp(0.0, 100.0);
                      final isEnrolled = c['is_enrolled'] == true;
                      final status = (c['status'] ?? 'unlocked').toString();

                      final badgeStatus =
                          completionPct >= 100 || status == 'completed'
                          ? BadgeStatus.mastered
                          : (isEnrolled
                                ? BadgeStatus.inProgress
                                : BadgeStatus.unlocked);

                      return Card(
                        margin: const EdgeInsets.only(bottom: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: completionPct >= 100
                                ? AppColors.success.withValues(alpha: 0.4)
                                : AppColors.primary.withValues(alpha: 0.2),
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => _openCourse(c),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withValues(
                                          alpha: 0.1,
                                        ),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        '$category • ${difficulty.toUpperCase()}',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    StatusBadge(
                                      label: completionPct >= 100
                                          ? 'COMPLETED'
                                          : (isEnrolled
                                                ? 'IN PROGRESS'
                                                : 'UNLOCKED'),
                                      status: badgeStatus,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Text(title, style: AppTypography.titleLarge),
                                if (subtitle.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    subtitle,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                                const SizedBox(height: 12),
                                Wrap(
                                  spacing: 12,
                                  runSpacing: 4,
                                  children: [
                                    Text(
                                      '$modulesCount Modules • $lessonsCount Lessons',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    if ((c['quiz_question_count'] ?? 0) > 0)
                                      Text(
                                        'Quiz: ${c['quiz_question_count']} Qs',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AppColors.secondary,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  children: [
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(5),
                                        child: LinearProgressIndicator(
                                          value: completionPct / 100.0,
                                          minHeight: 7,
                                          backgroundColor: Colors.grey.withValues(
                                            alpha: 0.16,
                                          ),
                                          color: completionPct >= 100
                                              ? AppColors.success
                                              : AppColors.primary,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      '${completionPct.toInt()}% ($completedLessons/$lessonsCount)',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    onPressed: () => _openCourse(c),
                                    icon: const Icon(
                                      Icons.arrow_forward,
                                      size: 16,
                                    ),
                                    label: Text(
                                      isEnrolled
                                          ? (completionPct >= 100
                                                ? 'Review Course'
                                                : 'Continue Learning')
                                          : 'Open Course',
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }
}
