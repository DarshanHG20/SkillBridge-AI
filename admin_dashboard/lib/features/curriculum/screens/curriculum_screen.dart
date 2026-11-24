import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';

/// Admin Web Console screen for managing skills taxonomy and assessment bank.
class CurriculumScreen extends StatefulWidget {
  const CurriculumScreen({super.key});

  @override
  State<CurriculumScreen> createState() => _CurriculumScreenState();
}

class _CurriculumScreenState extends State<CurriculumScreen> {
  final _apiClient = AdminApiClient();

  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _skills = [];
  List<dynamic> _assessments = [];
  String _selectedCategory = 'All';

  List<String> get _categories {
    final cats = <String>{};
    for (final s in _skills) {
      final cat = (s['category'] ?? '').toString().trim();
      if (cat.isNotEmpty) cats.add(cat);
    }
    return ['All', ...cats];
  }

  @override
  void initState() {
    super.initState();
    _fetchCurriculum();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchCurriculum() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final results = await Future.wait([
        _apiClient.listSkills(),
        _apiClient.listAssessments(),
      ]);

      if (mounted) {
        setState(() {
          _skills = results[0];
          _assessments = results[1];
          if (_selectedCategory != 'All' &&
              !_categories.contains(_selectedCategory)) {
            _selectedCategory = 'All';
          }
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

  Future<void> _openCreateSkillDialog() async {
    final titleCtrl = TextEditingController();
    final slugCtrl = TextEditingController();
    final categoryCtrl = TextEditingController(text: 'programming');
    final descCtrl = TextEditingController();
    String difficulty = 'intermediate';

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text('Add Curriculum Skill'),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Skill Title',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  onChanged: (val) {
                    slugCtrl.text = val
                        .toLowerCase()
                        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
                        .replaceAll(RegExp(r'^-|-$'), '');
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: slugCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Slug',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: categoryCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Category',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: difficulty,
                  decoration: const InputDecoration(
                    labelText: 'Difficulty Level',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: const [
                    DropdownMenuItem(value: 'beginner', child: Text('Beginner')),
                    DropdownMenuItem(
                      value: 'intermediate',
                      child: Text('Intermediate'),
                    ),
                    DropdownMenuItem(value: 'advanced', child: Text('Advanced')),
                    DropdownMenuItem(value: 'expert', child: Text('Expert')),
                  ],
                  onChanged: (v) {
                    if (v != null) setDlgState(() => difficulty = v);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleCtrl.text.trim().isEmpty ||
                    slugCtrl.text.trim().isEmpty) {
                  return;
                }
                try {
                  await _apiClient.createSkill({
                    'title': titleCtrl.text.trim(),
                    'slug': slugCtrl.text.trim(),
                    'category': categoryCtrl.text.trim().isEmpty
                        ? 'programming'
                        : categoryCtrl.text.trim(),
                    'difficulty_level': difficulty,
                    'description': descCtrl.text.trim(),
                  });
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(content: Text('Create skill failed: $e')),
                    );
                  }
                }
              },
              child: const Text('Create Skill'),
            ),
          ],
        ),
      ),
    );

    if (created == true) {
      _fetchCurriculum();
    }
  }

  Future<void> _openCreateAssessmentDialog() async {
    if (_skills.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Create at least one skill before adding an assessment.'),
        ),
      );
      return;
    }
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    int selectedSkillId = _skills.first['id'] as int;

    final created = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlgState) => AlertDialog(
          title: const Text('Add Assessment'),
          content: SizedBox(
            width: 420,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  initialValue: selectedSkillId,
                  decoration: const InputDecoration(
                    labelText: 'Associated Skill',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                  items: _skills
                      .map(
                        (s) => DropdownMenuItem<int>(
                          value: s['id'] as int,
                          child: Text(s['title']?.toString() ?? ''),
                        ),
                      )
                      .toList(),
                  onChanged: (val) {
                    if (val != null) setDlgState(() => selectedSkillId = val);
                  },
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Assessment Title',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: descCtrl,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    labelText: 'Description',
                    border: OutlineInputBorder(),
                    isDense: true,
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (titleCtrl.text.trim().isEmpty) return;
                try {
                  await _apiClient.createAssessment({
                    'title': titleCtrl.text.trim(),
                    'skill_id': selectedSkillId,
                    'description': descCtrl.text.trim(),
                    'pass_percentage': 70,
                  });
                  if (ctx.mounted) Navigator.pop(ctx, true);
                } catch (e) {
                  if (ctx.mounted) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(content: Text('Create assessment failed: $e')),
                    );
                  }
                }
              },
              child: const Text('Create Assessment'),
            ),
          ],
        ),
      ),
    );

    if (created == true) {
      _fetchCurriculum();
    }
  }

  Future<void> _deleteSkill(int skillId) async {
    try {
      await _apiClient.deleteSkill(skillId);
      if (!mounted) return;
      _fetchCurriculum();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delete skill failed: $e')),
      );
    }
  }

  Future<void> _deleteAssessment(int assessmentId) async {
    try {
      await _apiClient.deleteAssessment(assessmentId);
      if (!mounted) return;
      _fetchCurriculum();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Delete assessment failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final categories = _categories;
    final filteredSkills = _selectedCategory == 'All'
        ? _skills
        : _skills.where((s) => s['category'] == _selectedCategory).toList();

    return AdminScaffold(
      activeRoute: '/skills',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      Text(
                        'Skill Taxonomy & Assessment Bank',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AdminColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Manage curriculum nodes, technical domains, difficulty ratings, and active assessments.',
                        style: TextStyle(
                          fontSize: 14,
                          color: AdminColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _openCreateSkillDialog,
                      icon: const Icon(Icons.add, size: 18),
                      label: const Text('Add Skill'),
                    ),
                    OutlinedButton.icon(
                      onPressed: _openCreateAssessmentDialog,
                      icon: const Icon(Icons.playlist_add, size: 18),
                      label: const Text('Add Assessment'),
                    ),
                    ElevatedButton.icon(
                      onPressed: _fetchCurriculum,
                      icon: const Icon(Icons.refresh, size: 18),
                      label: const Text('Refresh'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AdminColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 20),

            if (_isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_errorMessage != null)
              Card(
                color: Colors.red.withValues(alpha: 0.05),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: AdminColors.danger,
                      ),
                      const SizedBox(width: 12),
                      Expanded(child: Text(_errorMessage!)),
                      ElevatedButton(
                        onPressed: _fetchCurriculum,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              )
            else ...[
              // Summary Metrics Row
              Row(
                children: [
                  _buildStatCard(
                    'Total Configured Skills',
                    '${_skills.length}',
                    Icons.account_tree,
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    'Technical Domains',
                    '${categories.length > 1 ? categories.length - 1 : 0}',
                    Icons.category,
                  ),
                  const SizedBox(width: 16),
                  _buildStatCard(
                    'Active Assessments',
                    '${_assessments.length}',
                    Icons.quiz,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Domain Category Filter
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: categories.map((cat) {
                  final isSelected = cat == _selectedCategory;
                  return ChoiceChip(
                    label: Text(cat),
                    selected: isSelected,
                    selectedColor: AdminColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected
                          ? Colors.white
                          : AdminColors.textPrimary,
                      fontWeight: isSelected
                          ? FontWeight.bold
                          : FontWeight.normal,
                    ),
                    onSelected: (selected) {
                      if (selected) setState(() => _selectedCategory = cat);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),

              // Skills Data Table Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AdminColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Skills in $_selectedCategory (${filteredSkills.length})',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Table(
                        columnWidths: const {
                          0: FlexColumnWidth(2),
                          1: FlexColumnWidth(1.4),
                          2: FlexColumnWidth(1),
                          3: FlexColumnWidth(2.6),
                          4: FlexColumnWidth(0.8),
                        },
                        children: [
                          const TableRow(
                            decoration: BoxDecoration(
                              color: AdminColors.background,
                            ),
                            children: [
                              Padding(
                                padding: EdgeInsets.all(10),
                                child: Text(
                                  'Skill Title',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.all(10),
                                child: Text(
                                  'Domain',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.all(10),
                                child: Text(
                                  'Difficulty',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.all(10),
                                child: Text(
                                  'Description',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                              Padding(
                                padding: EdgeInsets.all(10),
                                child: Text(
                                  'Action',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          ...filteredSkills.map((s) {
                            return TableRow(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(
                                    (s['title'] ?? '').toString(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text((s['category'] ?? '').toString()),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(
                                    (s['difficulty_level'] ?? '')
                                        .toString()
                                        .toUpperCase(),
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(
                                    (s['description'] ?? '').toString(),
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AdminColors.textSecondary,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(4),
                                  child: IconButton(
                                    icon: const Icon(
                                      Icons.delete_outline,
                                      size: 18,
                                      color: AdminColors.error,
                                    ),
                                    tooltip: 'Delete Skill',
                                    onPressed: () =>
                                        _deleteSkill(s['id'] as int),
                                  ),
                                ),
                              ],
                            );
                          }),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // Assessments Bank Card
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: AdminColors.border),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Assessments Bank (${_assessments.length})',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (_assessments.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(16),
                          child: Text('No assessments configured yet.'),
                        )
                      else
                        ..._assessments.map((a) {
                          return ListTile(
                            title: Text((a['title'] ?? '').toString()),
                            subtitle: Text(
                              'Type: ${a['assessment_type'] ?? 'diagnostic'} • Pass: ${a['pass_percentage'] ?? 70}%',
                            ),
                            trailing: IconButton(
                              icon: const Icon(
                                Icons.delete_outline,
                                color: AdminColors.error,
                              ),
                              tooltip: 'Delete Assessment',
                              onPressed: () =>
                                  _deleteAssessment(a['id'] as int),
                            ),
                          );
                        }),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon) {
    return Expanded(
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AdminColors.border),
        ),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            children: [
              CircleAvatar(
                radius: 22,
                backgroundColor: AdminColors.primaryLight,
                child: Icon(icon, color: AdminColors.primary, size: 22),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    value,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AdminColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
