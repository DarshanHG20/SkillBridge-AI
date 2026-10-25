import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';

/// Project-based learning tab for hands-on project catalog, milestone tracking, and evidence submission.
class ProjectCatalogTab extends StatefulWidget {
  const ProjectCatalogTab({super.key});

  @override
  State<ProjectCatalogTab> createState() => _ProjectCatalogTabState();
}

class _ProjectCatalogTabState extends State<ProjectCatalogTab> {
  final _apiClient = ApiClient();

  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _projects = [];
  List<dynamic> _portfolio = [];
  bool _showPortfolioOnly = false;

  @override
  void initState() {
    super.initState();
    _fetchProjectData();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchProjectData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.getProjects(),
        _apiClient.getMyPortfolio(),
      ]);

      if (mounted) {
        setState(() {
          _projects = results[0];
          _portfolio = results[1];
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

  void _openProgressModal(Map<String, dynamic> project) {
    double progressVal =
        (project['current_completion'] as num?)?.toDouble() ?? 0.0;
    String status = project['current_status'] as String? ?? 'in_progress';
    final notesController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            project['title'] as String? ?? 'Update Project',
                            style: AppTypography.titleLarge,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Completion Progress: ${progressVal.toInt()}%',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    Slider(
                      value: progressVal,
                      min: 0,
                      max: 100,
                      divisions: 20,
                      label: '${progressVal.toInt()}%',
                      onChanged: (val) {
                        setModalState(() {
                          progressVal = val;
                          if (val >= 100) {
                            status = 'submitted';
                          } else {
                            status = 'in_progress';
                          }
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: const [
                        DropdownMenuItem(
                          value: 'in_progress',
                          child: Text('In Progress'),
                        ),
                        DropdownMenuItem(
                          value: 'submitted',
                          child: Text('Submitted for Review'),
                        ),
                        DropdownMenuItem(
                          value: 'completed',
                          child: Text('Completed'),
                        ),
                      ],
                      onChanged: (val) {
                        if (val != null) {
                          setModalState(() {
                            status = val;
                          });
                        }
                      },
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: notesController,
                      decoration: const InputDecoration(
                        labelText:
                            'Evidence / Notes (e.g. GitHub URL, demo link)',
                        hintText: 'https://github.com/my-username/project-repo',
                      ),
                      maxLines: 2,
                    ),
                    const SizedBox(height: 20),
                    AppButton(
                      label: 'Save Project Progress',
                      icon: Icons.save,
                      onPressed: () async {
                        Navigator.pop(ctx);
                        try {
                          await _apiClient.updateProjectProgress(
                            project['id'] as int,
                            {
                              'status': status,
                              'completion_percentage': progressVal,
                              'evidence_notes':
                                  notesController.text.trim().isNotEmpty
                                  ? notesController.text.trim()
                                  : null,
                            },
                          );
                          _fetchProjectData();
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Project progress recorded!'),
                                backgroundColor: AppColors.success,
                              ),
                            );
                          }
                        } catch (e) {
                          if (mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Error: $e'),
                                backgroundColor: AppColors.error,
                              ),
                            );
                          }
                        }
                      },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
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
                onPressed: _fetchProjectData,
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    final displayedProjects = _showPortfolioOnly
        ? _projects.where((p) => (p['is_enrolled'] as bool? ?? false)).toList()
        : _projects;

    return Column(
      children: [
        // Filter Switcher
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              ChoiceChip(
                label: const Text('All Projects'),
                selected: !_showPortfolioOnly,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: !_showPortfolioOnly
                      ? Colors.white
                      : AppColors.lightTextPrimary,
                  fontWeight: !_showPortfolioOnly
                      ? FontWeight.bold
                      : FontWeight.normal,
                ),
                onSelected: (selected) {
                  if (selected) setState(() => _showPortfolioOnly = false);
                },
              ),
              const SizedBox(width: 8),
              ChoiceChip(
                label: Text('My Active Portfolio (${_portfolio.length})'),
                selected: _showPortfolioOnly,
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(
                  color: _showPortfolioOnly
                      ? Colors.white
                      : AppColors.lightTextPrimary,
                  fontWeight: _showPortfolioOnly
                      ? FontWeight.bold
                      : FontWeight.normal,
                ),
                onSelected: (selected) {
                  if (selected) setState(() => _showPortfolioOnly = true);
                },
              ),
            ],
          ),
        ),

        // Project Cards
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchProjectData,
            child: displayedProjects.isEmpty
                ? const Center(
                    child: Text(
                      'No active projects enrolled yet. Pick a project from the catalog!',
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: displayedProjects.length,
                    itemBuilder: (context, index) {
                      final p =
                          displayedProjects[index] as Map<String, dynamic>;
                      final title = p['title'] as String? ?? '';
                      final description = p['description'] as String? ?? '';
                      final difficulty =
                          p['difficulty'] as String? ?? 'intermediate';
                      final milestones = (p['milestones_json'] as List?) ?? [];
                      final rubric =
                          p['rubric_json'] as Map<String, dynamic>? ?? {};
                      final isEnrolled = p['is_enrolled'] as bool? ?? false;
                      final completion =
                          (p['current_completion'] as num?)?.toDouble() ?? 0.0;
                      final status = p['current_status'] as String? ?? '';

                      return Card(
                        margin: const EdgeInsets.only(bottom: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(
                            color: isEnrolled
                                ? AppColors.primary.withValues(alpha: 0.3)
                                : Colors.grey.withValues(alpha: 0.15),
                          ),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(18),
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
                                      difficulty.toUpperCase(),
                                      style: const TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                  const Spacer(),
                                  if (isEnrolled)
                                    StatusBadge(
                                      label: status.toUpperCase().replaceAll(
                                        '_',
                                        ' ',
                                      ),
                                      status: status == 'completed'
                                          ? BadgeStatus.mastered
                                          : BadgeStatus.inProgress,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Text(title, style: AppTypography.titleLarge),
                              const SizedBox(height: 6),
                              Text(
                                description,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.lightTextSecondary,
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 14),

                              // Progress bar if enrolled
                              if (isEnrolled) ...[
                                Row(
                                  children: [
                                    Expanded(
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(4),
                                        child: LinearProgressIndicator(
                                          value: completion / 100.0,
                                          minHeight: 6,
                                          backgroundColor: Colors.grey
                                              .withValues(alpha: 0.2),
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    Text(
                                      '${completion.toInt()}%',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 14),
                              ],

                              // Expandable Milestones & Rubrics
                              ExpansionTile(
                                tilePadding: EdgeInsets.zero,
                                title: Text(
                                  '${milestones.length} Deliverable Milestones',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                children: [
                                  ...milestones.map((m) {
                                    final step = m['step'] ?? '';
                                    final mTitle = m['title'] ?? '';
                                    final mDesc = m['description'] ?? '';
                                    return Padding(
                                      padding: const EdgeInsets.only(bottom: 8),
                                      child: Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          CircleAvatar(
                                            radius: 10,
                                            backgroundColor: AppColors.primary
                                                .withValues(alpha: 0.1),
                                            child: Text(
                                              '$step',
                                              style: const TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.primary,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  mTitle,
                                                  style: const TextStyle(
                                                    fontSize: 12,
                                                    fontWeight: FontWeight.bold,
                                                  ),
                                                ),
                                                if (mDesc.isNotEmpty)
                                                  Text(
                                                    mDesc,
                                                    style: const TextStyle(
                                                      fontSize: 11,
                                                      color: AppColors
                                                          .lightTextSecondary,
                                                    ),
                                                  ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                  if (rubric.isNotEmpty) ...[
                                    const Divider(height: 16),
                                    const Align(
                                      alignment: Alignment.centerLeft,
                                      child: Text(
                                        'Evaluation Rubric Criteria:',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.grey,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    ...rubric.entries.map(
                                      (e) => Padding(
                                        padding: const EdgeInsets.only(
                                          bottom: 4,
                                        ),
                                        child: Row(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '• ${e.key}: ',
                                              style: const TextStyle(
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                              ),
                                            ),
                                            Expanded(
                                              child: Text(
                                                e.value.toString(),
                                                style: const TextStyle(
                                                  fontSize: 11,
                                                  color: AppColors
                                                      .lightTextSecondary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ],
                                ],
                              ),

                              const SizedBox(height: 12),
                              AppButton(
                                label: isEnrolled
                                    ? 'Update Progress & Evidence'
                                    : 'Enroll in Project',
                                icon: isEnrolled
                                    ? Icons.edit
                                    : Icons.assignment_turned_in,
                                onPressed: () => _openProgressModal(p),
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
