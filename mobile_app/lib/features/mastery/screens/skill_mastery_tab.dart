import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';

/// Skill mastery dashboard supporting the 9 technical domains with DAG prerequisites and lock indicators.
class SkillMasteryTab extends StatefulWidget {
  const SkillMasteryTab({super.key});

  @override
  State<SkillMasteryTab> createState() => _SkillMasteryTabState();
}

class _SkillMasteryTabState extends State<SkillMasteryTab> {
  final _apiClient = ApiClient();

  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _taxonomyNodes = [];
  List<dynamic> _assessments = [];
  String _selectedCategory = 'All';

  final List<String> _categories = [
    'All',
    'Python',
    'Java',
    'SQL',
    'DSA',
    'Web Development',
    'Data Science',
    'AI/ML',
    'Networking',
    'Cybersecurity',
  ];

  @override
  void initState() {
    super.initState();
    _fetchTaxonomy();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchTaxonomy() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.getSkillTaxonomyTree(),
        _apiClient.getAssessments(),
      ]);

      if (mounted) {
        setState(() {
          _taxonomyNodes = results[0];
          _assessments = results[1];
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

  void _startSkillAssessment(Map<String, dynamic> skillNode) {
    final skillId = skillNode['id'] as int;
    final skillTitle = skillNode['title'] as String? ?? 'Skill Diagnostic';

    // Find assessment linked to this skill
    final assessment = _assessments.firstWhere(
      (a) => a['skill_id'] == skillId,
      orElse: () => null,
    );

    if (assessment != null) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => AssessmentQuizScreen(
            assessmentId: assessment['id'] as int,
            title: assessment['title'] as String? ?? skillTitle,
          ),
        ),
      ).then((_) => _fetchTaxonomy());
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'No diagnostic assessment configured for $skillTitle yet.',
          ),
        ),
      );
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
                onPressed: _fetchTaxonomy,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final filteredNodes = _selectedCategory == 'All'
        ? _taxonomyNodes
        : _taxonomyNodes
              .where((node) => node['category'] == _selectedCategory)
              .toList();

    return Column(
      children: [
        // Category Filter Chips
        SizedBox(
          height: 48,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            itemCount: _categories.length,
            itemBuilder: (context, index) {
              final cat = _categories[index];
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
                    fontWeight: isSelected
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                  onSelected: (selected) {
                    if (selected) {
                      setState(() {
                        _selectedCategory = cat;
                      });
                    }
                  },
                ),
              );
            },
          ),
        ),

        // Skill Nodes List
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchTaxonomy,
            child: filteredNodes.isEmpty
                ? const Center(child: Text('No skills found in this domain.'))
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: filteredNodes.length,
                    itemBuilder: (context, index) {
                      final node = filteredNodes[index] as Map<String, dynamic>;
                      final title = node['title'] as String? ?? '';
                      final category = node['category'] as String? ?? '';
                      final description = node['description'] as String? ?? '';
                      final difficulty =
                          node['difficulty_level'] as String? ?? 'beginner';
                      final mastery =
                          (node['current_mastery'] as num?)?.toDouble() ?? 0.0;
                      final status = node['status'] as String? ?? 'unlocked';
                      final prereqs =
                          (node['prerequisite_slugs'] as List?) ?? [];

                      final isLocked = status == 'locked';
                      final isMastered = status == 'mastered';

                      BadgeStatus badgeStatus = BadgeStatus.unlocked;
                      if (isLocked) {
                        badgeStatus = BadgeStatus.locked;
                      } else if (isMastered) {
                        badgeStatus = BadgeStatus.mastered;
                      } else if (status == 'in_progress') {
                        badgeStatus = BadgeStatus.inProgress;
                      }

                      return Card(
                        margin: const EdgeInsets.only(bottom: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(
                            color: isLocked
                                ? Colors.grey.withValues(alpha: 0.2)
                                : isMastered
                                ? AppColors.success.withValues(alpha: 0.4)
                                : AppColors.primary.withValues(alpha: 0.2),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 20,
                                    backgroundColor: isLocked
                                        ? Colors.grey.withValues(alpha: 0.2)
                                        : AppColors.primary.withValues(
                                            alpha: 0.1,
                                          ),
                                    child: Icon(
                                      isLocked
                                          ? Icons.lock
                                          : isMastered
                                          ? Icons.verified
                                          : Icons.code,
                                      color: isLocked
                                          ? Colors.grey
                                          : isMastered
                                          ? AppColors.success
                                          : AppColors.primary,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          title,
                                          style: AppTypography.titleMedium
                                              .copyWith(
                                                color: isLocked
                                                    ? Colors.grey
                                                    : null,
                                              ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '$category • ${difficulty.toUpperCase()}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            color: AppColors.lightTextSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusBadge(
                                    label: status.toUpperCase().replaceAll(
                                      '_',
                                      ' ',
                                    ),
                                    status: badgeStatus,
                                  ),
                                ],
                              ),
                              if (description.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Text(
                                  description,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: isLocked
                                        ? Colors.grey
                                        : AppColors.lightTextSecondary,
                                    height: 1.3,
                                  ),
                                ),
                              ],
                              const SizedBox(height: 14),

                              // Mastery Progress Bar
                              Row(
                                children: [
                                  Expanded(
                                    child: ClipRRect(
                                      borderRadius: BorderRadius.circular(4),
                                      child: LinearProgressIndicator(
                                        value: mastery,
                                        minHeight: 8,
                                        backgroundColor: Colors.grey.withValues(
                                          alpha: 0.15,
                                        ),
                                        color: isMastered
                                            ? AppColors.success
                                            : mastery < 0.60 && mastery > 0
                                            ? AppColors.warning
                                            : AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                    '${(mastery * 100).toInt()}%',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: isMastered
                                          ? AppColors.success
                                          : null,
                                    ),
                                  ),
                                ],
                              ),

                              if (prereqs.isNotEmpty) ...[
                                const SizedBox(height: 10),
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 4,
                                  crossAxisAlignment: WrapCrossAlignment.center,
                                  children: [
                                    const Text(
                                      'Requires:',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey,
                                      ),
                                    ),
                                    ...prereqs.map(
                                      (p) => Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 6,
                                          vertical: 2,
                                        ),
                                        decoration: BoxDecoration(
                                          color: Colors.grey.withValues(
                                            alpha: 0.1,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            4,
                                          ),
                                        ),
                                        child: Text(
                                          p.toString(),
                                          style: const TextStyle(
                                            fontSize: 10,
                                            fontFamily: 'monospace',
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],

                              const SizedBox(height: 12),
                              if (!isLocked)
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    style: TextButton.styleFrom(
                                      foregroundColor: AppColors.primary,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                    ),
                                    icon: const Icon(
                                      Icons.quiz_outlined,
                                      size: 16,
                                    ),
                                    label: Text(
                                      isMastered
                                          ? 'Retake Quiz'
                                          : 'Diagnostic Check',
                                    ),
                                    onPressed: () =>
                                        _startSkillAssessment(node),
                                  ),
                                )
                              else
                                const Align(
                                  alignment: Alignment.centerRight,
                                  child: Padding(
                                    padding: EdgeInsets.symmetric(vertical: 4),
                                    child: Text(
                                      'Complete prerequisites to unlock',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontStyle: FontStyle.italic,
                                        color: Colors.grey,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
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
