import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';

/// Admin Web Console screen for inspecting skills taxonomy and assessment catalog.
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

  @override
  Widget build(BuildContext context) {
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
                        'Curriculum nodes across 9 technical domains, difficulty ratings, and active question sets.',
                        style: TextStyle(
                          fontSize: 14,
                          color: AdminColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
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
                    '${_categories.length - 1}',
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
                children: _categories.map((cat) {
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
                          1: FlexColumnWidth(1.5),
                          2: FlexColumnWidth(1),
                          3: FlexColumnWidth(3),
                        },
                        children: [
                          TableRow(
                            decoration: const BoxDecoration(
                              color: AdminColors.background,
                            ),
                            children: const [
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
                            ],
                          ),
                          ...filteredSkills.map((s) {
                            return TableRow(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(
                                    s['title'] ?? '',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(10),
                                  child: Text(s['category'] ?? ''),
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
                                    s['description'] ?? '',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AdminColors.textSecondary,
                                    ),
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
