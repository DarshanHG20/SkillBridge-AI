import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';

/// Career Intelligence tab providing weighted gap analysis, 30/60/90-day roadmaps, and disclaimer.
class CareerExplorationTab extends StatefulWidget {
  const CareerExplorationTab({super.key});

  @override
  State<CareerExplorationTab> createState() => _CareerExplorationTabState();
}

class _CareerExplorationTabState extends State<CareerExplorationTab> {
  final _apiClient = ApiClient();

  bool _isLoading = true;
  bool _isGeneratingRoadmap = false;
  String? _errorMessage;

  List<dynamic> _careers = [];
  String? _selectedCareerSlug;
  Map<String, dynamic>? _gapAnalysis;
  Map<String, dynamic>? _currentRoadmap;
  String _selectedPlanType = '90_day';

  @override
  void initState() {
    super.initState();
    _fetchCareers();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchCareers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final careers = await _apiClient.getCareers();
      if (mounted) {
        setState(() {
          _careers = careers;
          if (_careers.isNotEmpty) {
            _selectedCareerSlug = _careers.first['slug'] as String?;
          }
          _isLoading = false;
        });
        if (_selectedCareerSlug != null) {
          _fetchGapAnalysis(_selectedCareerSlug!);
        }
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

  Future<void> _fetchGapAnalysis(String slug) async {
    try {
      final analysis = await _apiClient.getCareerGapAnalysis(slug);
      if (mounted) {
        setState(() {
          _gapAnalysis = analysis;
        });
      }
    } catch (e) {
      // Handled gracefully in UI
    }
  }

  Future<void> _generateRoadmap() async {
    if (_selectedCareerSlug == null) return;

    setState(() {
      _isGeneratingRoadmap = true;
    });

    try {
      final roadmap = await _apiClient.generateCareerRoadmap(
        _selectedCareerSlug!,
        _selectedPlanType,
      );
      if (mounted) {
        setState(() {
          _currentRoadmap = roadmap;
          _isGeneratingRoadmap = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Personalized roadmap synthesized successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isGeneratingRoadmap = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate roadmap: $e'),
            backgroundColor: AppColors.error,
          ),
        );
      }
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
                onPressed: _fetchCareers,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final selectedCareer = _careers.firstWhere(
      (c) => c['slug'] == _selectedCareerSlug,
      orElse: () => _careers.first,
    );

    final readiness =
        (_gapAnalysis?['overall_readiness_percentage'] as num?)?.toDouble() ??
        0.0;
    final topGaps = (_gapAnalysis?['top_skill_gaps'] as List?) ?? [];
    final strengths = (_gapAnalysis?['strengths'] as List?) ?? [];
    final disclaimer =
        _gapAnalysis?['disclaimer'] as String? ??
        'SkillBridge AI career readiness estimates do not guarantee employment or salary outcomes.';

    return RefreshIndicator(
      onRefresh: () async {
        if (_selectedCareerSlug != null) {
          await _fetchGapAnalysis(_selectedCareerSlug!);
        }
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Career Selector Dropdown
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedCareerSlug,
                  items: _careers.map((c) {
                    return DropdownMenuItem<String>(
                      value: c['slug'] as String,
                      child: Text(
                        c['title'] as String? ?? '',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    );
                  }).toList(),
                  onChanged: (newSlug) {
                    if (newSlug != null && newSlug != _selectedCareerSlug) {
                      setState(() {
                        _selectedCareerSlug = newSlug;
                        _currentRoadmap = null;
                      });
                      _fetchGapAnalysis(newSlug);
                    }
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Career Target Header Card
          Card(
            elevation: 2,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          selectedCareer['title'] as String? ?? '',
                          style: AppTypography.titleLarge,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.secondary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          selectedCareer['industry'] as String? ?? 'Tech',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: AppColors.secondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    selectedCareer['description'] as String? ?? '',
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(
                        Icons.payments_outlined,
                        size: 18,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Market Range: ${selectedCareer['average_salary_range'] ?? 'Competitive'}',
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Readiness Gauge & Gap Summary
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  Text(
                    'Career Readiness Score',
                    style: AppTypography.titleMedium,
                  ),
                  const SizedBox(height: 16),
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 100,
                        height: 100,
                        child: CircularProgressIndicator(
                          value: readiness / 100.0,
                          strokeWidth: 9,
                          backgroundColor: AppColors.primary.withValues(
                            alpha: 0.15,
                          ),
                          color: readiness >= 75
                              ? AppColors.success
                              : AppColors.primary,
                        ),
                      ),
                      Text(
                        '${readiness.toInt()}%',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: readiness >= 75
                              ? AppColors.success
                              : AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  Text(
                    '${strengths.length} of ${(_gapAnalysis?['skills_analyzed_count'] ?? 0)} target skills met at benchmark level',
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Top Skill Gaps
          const Text('Prioritized Skill Gaps', style: AppTypography.titleLarge),
          const SizedBox(height: 8),
          if (topGaps.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'No competency gaps remaining for this pathway! You meet all benchmark targets.',
                ),
              ),
            )
          else
            ...topGaps.map((gap) {
              final title = gap['skill_title'] as String? ?? '';
              final minMastery =
                  (gap['minimum_mastery_level'] as num?)?.toDouble() ?? 0.8;
              final curMastery =
                  (gap['current_mastery'] as num?)?.toDouble() ?? 0.0;
              final gapAmount = (gap['gap'] as num?)?.toDouble() ?? 0.0;

              return Card(
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            title,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.error.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'Gap: -${(gapAmount * 100).toInt()}%',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: AppColors.error,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: LinearProgressIndicator(
                              value: curMastery / minMastery,
                              minHeight: 6,
                              backgroundColor: Colors.grey.withValues(
                                alpha: 0.2,
                              ),
                              color: AppColors.warning,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Text(
                            '${(curMastery * 100).toInt()}% / ${(minMastery * 100).toInt()}%',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            }),

          const SizedBox(height: 20),

          // 30/60/90-Day Roadmap Section
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Personalized Learning Roadmap',
                    style: AppTypography.titleLarge,
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Generate an actionable sequence tailored to close your specific gaps.',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      _buildPlanChip('30 Days', '30_day'),
                      const SizedBox(width: 8),
                      _buildPlanChip('60 Days', '60_day'),
                      const SizedBox(width: 8),
                      _buildPlanChip('90 Days', '90_day'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  AppButton(
                    label: _isGeneratingRoadmap
                        ? 'Synthesizing Roadmap...'
                        : 'Generate Personalized Roadmap',
                    icon: Icons.alt_route,
                    isLoading: _isGeneratingRoadmap,
                    onPressed: _generateRoadmap,
                  ),
                ],
              ),
            ),
          ),

          // Display Generated Roadmap Milestones
          if (_currentRoadmap != null) ...[
            const SizedBox(height: 16),
            ...((_currentRoadmap!['milestones'] as List?) ?? []).map((m) {
              final period = m['period'] as String? ?? '';
              final focus = m['focus_area'] as String? ?? '';
              final actions = (m['action_items'] as List?) ?? [];
              final targetSkills = (m['target_skills'] as List?) ?? [];

              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: AppColors.primary.withValues(alpha: 0.2),
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            period,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                          const Icon(
                            Icons.flag_outlined,
                            size: 18,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        focus,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (targetSkills.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 6,
                          children: targetSkills.map((s) {
                            return Chip(
                              label: Text(
                                s.toString(),
                                style: const TextStyle(fontSize: 10),
                              ),
                              backgroundColor: AppColors.primary.withValues(
                                alpha: 0.08,
                              ),
                              padding: EdgeInsets.zero,
                              visualDensity: VisualDensity.compact,
                            );
                          }).toList(),
                        ),
                      ],
                      const Divider(height: 16),
                      ...actions.map(
                        (act) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '• ',
                                style: TextStyle(fontWeight: FontWeight.bold),
                              ),
                              Expanded(
                                child: Text(
                                  act.toString(),
                                  style: const TextStyle(
                                    fontSize: 12,
                                    height: 1.3,
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
              );
            }),
          ],

          const SizedBox(height: 20),

          // Transparent Legal Disclaimer Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.grey.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.shield_outlined, size: 18, color: Colors.grey),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    disclaimer,
                    style: const TextStyle(
                      fontSize: 11,
                      color: Colors.grey,
                      height: 1.3,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildPlanChip(String label, String type) {
    final isSelected = _selectedPlanType == type;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.primary,
      labelStyle: TextStyle(
        color: isSelected ? Colors.white : AppColors.lightTextPrimary,
        fontSize: 12,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (selected) {
        if (selected) {
          setState(() {
            _selectedPlanType = type;
          });
        }
      },
    );
  }
}
