import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';

/// Admin screen to inspect, categorize, and resolve learner feedback & bug reports.
class FeedbackReviewScreen extends StatefulWidget {
  const FeedbackReviewScreen({super.key});

  @override
  State<FeedbackReviewScreen> createState() => _FeedbackReviewScreenState();
}

class _FeedbackReviewScreenState extends State<FeedbackReviewScreen> {
  final AdminApiClient _apiClient = AdminApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _items = [];
  int _total = 0;
  String? _selectedCategory;
  String? _selectedStatus;

  @override
  void initState() {
    super.initState();
    _fetchFeedback();
  }

  Future<void> _fetchFeedback() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.listFeedback(
        category: _selectedCategory,
        status: _selectedStatus,
      );
      setState(() {
        _items = res['items'] as List<dynamic>? ?? [];
        _total = res['total'] as int? ?? 0;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _showResolutionDialog(Map<String, dynamic> item) async {
    final notesController = TextEditingController(
      text: item['admin_notes'] as String? ?? '',
    );
    String status = item['status'] as String? ?? 'pending';

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Review Feedback #${item['id']}'),
          content: SizedBox(
            width: 480,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['title'] as String? ?? 'No Title',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  item['message'] as String? ?? '',
                  style: const TextStyle(
                    color: AdminColors.textSecondary,
                    fontSize: 13,
                  ),
                ),
                const Divider(height: 24),
                const Text(
                  'Resolution Status',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: status,
                  items: const [
                    DropdownMenuItem(
                      value: 'pending',
                      child: Text('Pending Review'),
                    ),
                    DropdownMenuItem(
                      value: 'reviewed',
                      child: Text('Reviewed / In Progress'),
                    ),
                    DropdownMenuItem(
                      value: 'resolved',
                      child: Text('Resolved'),
                    ),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => status = val);
                  },
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Administrative Notes / Response',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: notesController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: 'Describe fix, release version, or resolution rationale...',
                    border: OutlineInputBorder(),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(ctx);
                try {
                  await _apiClient.updateFeedbackStatus(
                    item['id'] as int,
                    status: status,
                    adminNotes: notesController.text.trim(),
                  );
                  _fetchFeedback();
                  if (mounted) {
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Feedback status updated successfully.'),
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text('Failed to update: $e'),
                        backgroundColor: AdminColors.error,
                      ),
                    );
                  }
                }
              },
              child: const Text('Save Resolution'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      activeRoute: '/feedback',
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Title & Refresh
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Learner Feedback & Issues',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AdminColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Total Reports: $_total',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AdminColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: _fetchFeedback,
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Filters
            Wrap(
              spacing: 12,
              children: [
                ChoiceChip(
                  label: const Text('All Categories'),
                  selected: _selectedCategory == null,
                  onSelected: (_) {
                    setState(() => _selectedCategory = null);
                    _fetchFeedback();
                  },
                ),
                ChoiceChip(
                  label: const Text('Bug Reports'),
                  selected: _selectedCategory == 'bug',
                  onSelected: (_) {
                    setState(() => _selectedCategory = 'bug');
                    _fetchFeedback();
                  },
                ),
                ChoiceChip(
                  label: const Text('Content Suggestions'),
                  selected: _selectedCategory == 'suggestion',
                  onSelected: (_) {
                    setState(() => _selectedCategory = 'suggestion');
                    _fetchFeedback();
                  },
                ),
                ChoiceChip(
                  label: const Text('Pending Only'),
                  selected: _selectedStatus == 'pending',
                  onSelected: (val) {
                    setState(() => _selectedStatus = val ? 'pending' : null);
                    _fetchFeedback();
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Feedback Items List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null
                  ? Center(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(color: AdminColors.error),
                      ),
                    )
                  : _items.isEmpty
                  ? const Center(
                      child: Text('No feedback items match active filters.'),
                    )
                  : ListView.separated(
                      itemCount: _items.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 10),
                      itemBuilder: (context, index) {
                        final item = _items[index] as Map<String, dynamic>;
                        final status = item['status'] as String? ?? 'pending';
                        final category =
                            item['category'] as String? ?? 'general';

                        Color statusColor = AdminColors.warning;
                        if (status == 'resolved')
                          statusColor = AdminColors.success;
                        if (status == 'reviewed')
                          statusColor = AdminColors.secondary;

                        return Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: const BorderSide(color: AdminColors.border),
                          ),
                          child: ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            leading: CircleAvatar(
                              backgroundColor: statusColor.withValues(
                                alpha: 0.15,
                              ),
                              child: Icon(
                                category.contains('bug')
                                    ? Icons.bug_report
                                    : Icons.feedback,
                                color: statusColor,
                                size: 20,
                              ),
                            ),
                            title: Row(
                              children: [
                                Text(
                                  item['title'] as String? ?? 'Feedback',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 8,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.12),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    status.toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: statusColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),

                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['message'] as String? ?? '',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AdminColors.textSecondary,
                                      fontSize: 13,
                                    ),
                                  ),
                                  if (item['admin_notes'] != null &&
                                      (item['admin_notes'] as String)
                                          .isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'Admin Note: ${item['admin_notes']}',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          color: AdminColors.primary,
                                          fontStyle: FontStyle.italic,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            trailing: ElevatedButton.icon(
                              onPressed: () => _showResolutionDialog(item),
                              icon: const Icon(Icons.rate_review, size: 16),
                              label: const Text('Review'),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
