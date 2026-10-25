import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';

/// Interactive Coding Practice screen with safe AST static analysis and test case evaluation.
class CodingPracticeScreen extends StatefulWidget {
  final String? initialProblemSlug;

  const CodingPracticeScreen({super.key, this.initialProblemSlug});

  @override
  State<CodingPracticeScreen> createState() => _CodingPracticeScreenState();
}

class _CodingPracticeScreenState extends State<CodingPracticeScreen> {
  final _apiClient = ApiClient();
  final _codeController = TextEditingController();

  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  List<dynamic> _problems = [];
  Map<String, dynamic>? _selectedProblem;
  Map<String, dynamic>? _lastSubmissionResult;
  List<dynamic> _recommendations = [];
  int _revealedHintsCount = 0;

  @override
  void initState() {
    super.initState();
    _loadProblems();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _loadProblems() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final problems = await _apiClient.listCodingProblems();
      final recs = await _apiClient.getCodingRecommendations();

      if (!mounted) return;
      setState(() {
        _problems = problems;
        _recommendations = recs;
      });

      if (problems.isNotEmpty) {
        final targetSlug =
            widget.initialProblemSlug ?? (problems.first['slug'] as String);
        await _selectProblem(targetSlug);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _selectProblem(String slug) async {
    setState(() {
      _isLoading = true;
      _lastSubmissionResult = null;
      _revealedHintsCount = 0;
    });

    try {
      final detail = await _apiClient.getCodingProblemDetail(slug);
      if (!mounted) return;
      setState(() {
        _selectedProblem = detail;
        _codeController.text = detail['starter_code'] as String? ?? '';
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Failed to load problem: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _submitCode() async {
    if (_selectedProblem == null || _isSubmitting) return;

    final code = _codeController.text.trim();
    if (code.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please write code before submitting.')),
      );
      return;
    }

    setState(() {
      _isSubmitting = true;
      _lastSubmissionResult = null;
    });

    try {
      final problemId = _selectedProblem!['id'] as int;
      final result = await _apiClient.submitCodingSolution(problemId, code);

      // Refresh recommendations based on new attempt
      final recs = await _apiClient.getCodingRecommendations();

      if (!mounted) return;
      setState(() {
        _lastSubmissionResult = result;
        _recommendations = recs;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Submission evaluation error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _resetStarterCode() {
    if (_selectedProblem != null) {
      _codeController.text = _selectedProblem!['starter_code'] as String? ?? '';
      setState(() {
        _lastSubmissionResult = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Coding Practice Sandbox'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Reload',
            onPressed: _loadProblems,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 48,
                    color: AppColors.error,
                  ),
                  const SizedBox(height: 16),
                  Text(_errorMessage!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _loadProblems,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _buildProblemSelector(),
                const SizedBox(height: 16),
                if (_selectedProblem != null) ...[
                  _buildProblemDescriptionCard(),
                  const SizedBox(height: 16),
                  _buildHintsAccordion(),
                  const SizedBox(height: 16),
                  _buildCodeEditorCard(),
                  const SizedBox(height: 16),
                  if (_lastSubmissionResult != null)
                    _buildEvaluationResultsCard(),
                ],
                if (_recommendations.isNotEmpty) ...[
                  const SizedBox(height: 24),
                  _buildRecommendationsCard(),
                ],
              ],
            ),
    );
  }

  Widget _buildProblemSelector() {
    return Row(
      children: [
        const Text(
          'Problem:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: DropdownButtonFormField<String>(
            initialValue: _selectedProblem?['slug'] as String?,
            isExpanded: true,
            decoration: const InputDecoration(
              isDense: true,
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              border: OutlineInputBorder(),
            ),
            items: _problems.map((p) {
              return DropdownMenuItem<String>(
                value: p['slug'] as String,
                child: Text(
                  '${p['title']} (${p['difficulty'].toString().toUpperCase()})',
                ),
              );
            }).toList(),
            onChanged: (slug) {
              if (slug != null) _selectProblem(slug);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildProblemDescriptionCard() {
    final diff = _selectedProblem!['difficulty'] as String? ?? 'easy';
    Color diffColor = AppColors.success;
    Color diffBg = const Color(0x1A10B981);
    if (diff == 'medium') {
      diffColor = AppColors.warning;
      diffBg = const Color(0x1AF59E0B);
    }
    if (diff == 'hard') {
      diffColor = AppColors.error;
      diffBg = const Color(0x1AEF4444);
    }

    final publicCases = (_selectedProblem!['public_test_cases'] as List? ?? [])
        .cast<dynamic>();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _selectedProblem!['title'] as String? ?? 'Coding Problem',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Chip(
                  label: Text(
                    diff.toUpperCase(),
                    style: TextStyle(
                      color: diffColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  backgroundColor: diffBg,
                  padding: EdgeInsets.zero,
                ),
              ],
            ),
            const SizedBox(height: 8),
            SelectableText(
              _selectedProblem!['description'] as String? ?? '',
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
            if (publicCases.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'Sample Test Cases:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
              const SizedBox(height: 6),
              for (int i = 0; i < publicCases.length; i++)
                Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Input: ${publicCases[i]['input']} -> Expected: ${publicCases[i]['expected_output']}',
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 12,
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHintsAccordion() {
    final hints = (_selectedProblem!['hints'] as List? ?? []).cast<dynamic>();
    if (hints.isEmpty) return const SizedBox.shrink();

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.lightbulb_outline,
                  color: AppColors.warning,
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Progressive Hints ($_revealedHintsCount/${hints.length} revealed)',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                if (_revealedHintsCount < hints.length)
                  TextButton.icon(
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Next Hint'),
                    onPressed: () {
                      setState(() {
                        _revealedHintsCount++;
                      });
                    },
                  ),
              ],
            ),
            for (int i = 0; i < _revealedHintsCount; i++)
              Container(
                margin: const EdgeInsets.only(top: 6),
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0x14F59E0B),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0x40F59E0B)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check, size: 14, color: AppColors.warning),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        hints[i].toString(),
                        style: const TextStyle(fontSize: 12, height: 1.3),
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

  Widget _buildCodeEditorCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.code, color: AppColors.primary),
                const SizedBox(width: 8),
                const Text(
                  'Solution Code (Python 3)',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const Spacer(),
                TextButton.icon(
                  icon: const Icon(Icons.restore, size: 16),
                  label: const Text('Reset'),
                  onPressed: _resetStarterCode,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF1E1E1E),
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.all(12),
              child: TextField(
                controller: _codeController,
                maxLines: 12,
                style: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                  color: Color(0xFFD4D4D4),
                  height: 1.4,
                ),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: '# Write your Python solution here...',
                  hintStyle: TextStyle(color: Colors.grey),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(
                  Icons.shield_outlined,
                  size: 14,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 4),
                const Expanded(
                  child: Text(
                    'Safe Static AST Evaluation Mode Active (Disallows Host Network/FS/Process Execution)',
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                ElevatedButton.icon(
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.play_arrow, size: 18),
                  label: Text(
                    _isSubmitting ? 'Evaluating...' : 'Submit & Test',
                  ),
                  onPressed: _isSubmitting ? null : _submitCode,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEvaluationResultsCard() {
    final status = _lastSubmissionResult!['status'] as String? ?? 'unknown';
    final passed = status == 'passed';
    final testsPassed = _lastSubmissionResult!['tests_passed'] ?? 0;
    final totalTests = _lastSubmissionResult!['total_tests'] ?? 0;
    final testResults =
        (_lastSubmissionResult!['test_results_json'] as List? ?? [])
            .cast<dynamic>();
    final feedback =
        _lastSubmissionResult!['static_analysis_feedback_json']
            as Map<String, dynamic>? ??
        {};

    Color badgeColor = AppColors.success;
    IconData badgeIcon = Icons.check_circle;
    String statusTitle = 'All Test Cases Passed!';

    if (status == 'security_violation') {
      badgeColor = AppColors.error;
      badgeIcon = Icons.security;
      statusTitle = 'Security Policy Violation Flagged';
    } else if (status == 'syntax_error') {
      badgeColor = AppColors.error;
      badgeIcon = Icons.bug_report;
      statusTitle = 'Syntax Error in Solution';
    } else if (!passed) {
      badgeColor = AppColors.warning;
      badgeIcon = Icons.cancel;
      statusTitle = 'Test Cases Failed ($testsPassed/$totalTests Passed)';
    }

    return Card(
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(badgeIcon, color: badgeColor, size: 24),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    statusTitle,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: badgeColor,
                    ),
                  ),
                ),
                Chip(
                  label: Text(
                    _lastSubmissionResult!['execution_mode'] as String? ??
                        'safe_static_analysis',
                    style: const TextStyle(fontSize: 10),
                  ),
                  backgroundColor: AppColors.background,
                ),
              ],
            ),
            if (feedback['error_message'] != null) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0x14EF4444),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  feedback['error_message'].toString(),
                  style: const TextStyle(
                    color: AppColors.error,
                    fontSize: 12,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
            ],
            if (testResults.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text(
                'Detailed Test Outcomes:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
              const SizedBox(height: 6),
              for (final tr in testResults)
                Container(
                  margin: const EdgeInsets.only(bottom: 6),
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: tr['passed'] == true
                          ? const Color(0x4010B981)
                          : const Color(0x40EF4444),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        tr['passed'] == true
                            ? Icons.check_circle
                            : Icons.cancel,
                        size: 16,
                        color: tr['passed'] == true
                            ? AppColors.success
                            : AppColors.error,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Test #${tr['test_index']}: Input: ${tr['input']} | Expected: ${tr['expected_output']} | Actual: ${tr['actual_output']}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationsCard() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.psychology, color: AppColors.primary),
                SizedBox(width: 8),
                Text(
                  'Personalized Mistake Remediation',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Text(
              'Targeted concepts and recommendations derived from analysis of your recent coding attempts.',
              style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            for (final rec in _recommendations)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0x104F46E5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x334F46E5)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      rec['title'] as String? ?? 'Concept Review',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      rec['reason'] as String? ?? '',
                      style: const TextStyle(fontSize: 12),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Action: ${rec['action']}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
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
