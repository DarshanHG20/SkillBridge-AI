import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/status_badge.dart';
import '../../assessments/screens/assessment_quiz_screen.dart';

/// Skill mastery dashboard supporting the 9 technical domains with fast 100% unlock controls.
class SkillMasteryTab extends StatefulWidget {
  const SkillMasteryTab({super.key});

  @override
  State<SkillMasteryTab> createState() => _SkillMasteryTabState();
}

class _SkillMasteryTabState extends State<SkillMasteryTab> {
  final _apiClient = ApiClient();

  bool _isLoading = true;
  bool _isUnlockingAll = false;
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
                  'All skills and courses unlocked and filled to 100%!',
            ),
            backgroundColor: AppColors.success,
          ),
        );
        await _fetchTaxonomy();
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

  void _startSkillAssessment(Map<String, dynamic> skillNode) {
    final skillId = skillNode['id'] as int;
    final skillTitle = skillNode['title'] as String? ?? 'Skill Diagnostic';

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
                            'Instantly set all skills & courses to 100% Mastered',
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
                          ((node['current_mastery'] ?? node['mastery_score'])
                                  as num?)
                              ?.toDouble() ??
                          0.0;
                      final status = node['status'] as String? ?? 'unlocked';
                      final prereqs =
                          (node['prerequisite_slugs'] as List?) ?? [];

                      final isMastered = status == 'mastered' || mastery >= 1.0;

                      BadgeStatus badgeStatus = BadgeStatus.unlocked;
                      String badgeLabel = 'UNLOCKED';
                      if (isMastered) {
                        badgeStatus = BadgeStatus.mastered;
                        badgeLabel = 'MASTERED';
                      } else if (status == 'in_progress' || mastery > 0) {
                        badgeStatus = BadgeStatus.inProgress;
                        badgeLabel = 'IN PROGRESS';
                      }

                      return Card(
                        margin: const EdgeInsets.only(bottom: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                          side: BorderSide(
                            color: isMastered
                                ? AppColors.success.withValues(alpha: 0.4)
                                : AppColors.primary.withValues(alpha: 0.2),
                          ),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child: InkWell(
                          onTap: () => _startSkillAssessment(node),
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
                                      backgroundColor: isMastered
                                          ? AppColors.success.withValues(
                                              alpha: 0.1,
                                            )
                                          : AppColors.primary.withValues(
                                              alpha: 0.1,
                                            ),
                                      child: Icon(
                                        isMastered
                                            ? Icons.verified
                                            : Icons.code,
                                        color: isMastered
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
                                            style: AppTypography.titleMedium,
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            '$category • ${difficulty.toUpperCase()}',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              color:
                                                  AppColors.lightTextSecondary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    StatusBadge(
                                      label: badgeLabel,
                                      status: badgeStatus,
                                    ),
                                  ],
                                ),
                                if (description.isNotEmpty) ...[
                                  const SizedBox(height: 10),
                                  Text(
                                    description,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppColors.lightTextSecondary,
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
                                          value: mastery > 1.0 ? 1.0 : mastery,
                                          minHeight: 8,
                                          backgroundColor: Colors.grey
                                              .withValues(alpha: 0.15),
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
                                    crossAxisAlignment:
                                        WrapCrossAlignment.center,
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
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    style: TextButton.styleFrom(
                                      foregroundColor: isMastered
                                          ? AppColors.success
                                          : AppColors.primary,
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                    ),
                                    icon: Icon(
                                      isMastered
                                          ? Icons.verified
                                          : Icons.quiz_outlined,
                                      size: 16,
                                    ),
                                    label: Text(
                                      isMastered
                                          ? 'Retake Quiz'
                                          : 'Practice Quiz',
                                    ),
                                    onPressed: () =>
                                        _startSkillAssessment(node),
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
