import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';

/// Compliance audit log table with action filtering and details preview.
class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key});

  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  final AdminApiClient _apiClient = AdminApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  List<dynamic> _items = [];
  int _total = 0;
  String? _selectedAction;

  @override
  void initState() {
    super.initState();
    _fetchAuditLogs();
  }

  Future<void> _fetchAuditLogs() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.getAuditLogs(action: _selectedAction);
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

  @override
  Widget build(BuildContext context) {
    return AdminScaffold(
      activeRoute: '/audit',
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Compliance Audit Trail',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AdminColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Recorded Actions: $_total. Immutable record of sensitive administrator operations.',
                      style: const TextStyle(
                        fontSize: 14,
                        color: AdminColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  onPressed: _fetchAuditLogs,
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh',
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Filter Chips
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('All Actions'),
                  selected: _selectedAction == null,
                  onSelected: (_) {
                    setState(() => _selectedAction = null);
                    _fetchAuditLogs();
                  },
                ),
                ChoiceChip(
                  label: const Text('User Status'),
                  selected: _selectedAction == 'user_status_changed',
                  onSelected: (val) {
                    setState(
                      () =>
                          _selectedAction = val ? 'user_status_changed' : null,
                    );
                    _fetchAuditLogs();
                  },
                ),
                ChoiceChip(
                  label: const Text('Role Changes'),
                  selected: _selectedAction == 'user_role_changed',
                  onSelected: (val) {
                    setState(
                      () => _selectedAction = val ? 'user_role_changed' : null,
                    );
                    _fetchAuditLogs();
                  },
                ),
                ChoiceChip(
                  label: const Text('Content Updates'),
                  selected: _selectedAction == 'skill_created',
                  onSelected: (val) {
                    setState(
                      () => _selectedAction = val ? 'skill_created' : null,
                    );
                    _fetchAuditLogs();
                  },
                ),
              ],
            ),

            const SizedBox(height: 16),

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
                  ? const Center(child: Text('No audit log entries found.'))
                  : Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                        side: const BorderSide(color: AdminColors.border),
                      ),
                      child: ListView.separated(
                        itemCount: _items.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final item = _items[index] as Map<String, dynamic>;
                          final action = item['action'] as String? ?? 'unknown';
                          final entityType =
                              item['entity_type'] as String? ?? '';
                          final entityId = item['entity_id'] as String? ?? '';
                          final adminEmail =
                              item['admin_email'] as String? ??
                              'Admin #${item['admin_id']}';
                          final createdAt = item['created_at'] as String? ?? '';

                          return ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: AdminColors.surface,
                              child: Icon(
                                Icons.shield_outlined,
                                color: AdminColors.primary,
                                size: 20,
                              ),
                            ),
                            title: Row(
                              children: [
                                Text(
                                  action,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AdminColors.primaryLight,
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    '$entityType #$entityId',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: AdminColors.primary,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            subtitle: Text(
                              'Actor: $adminEmail  |  Timestamp: $createdAt',
                              style: const TextStyle(
                                color: AdminColors.textSecondary,
                                fontSize: 12,
                              ),
                            ),
                            trailing: item['details_json'] != null
                                ? IconButton(
                                    icon: const Icon(
                                      Icons.info_outline,
                                      size: 18,
                                    ),
                                    tooltip: 'View JSON Details',
                                    onPressed: () {
                                      showDialog(
                                        context: context,
                                        builder: (ctx) => AlertDialog(
                                          title: Text(
                                            'Audit Entry #${item['id']} Details',
                                          ),
                                          content: SelectableText(
                                            '${item['details_json']}',
                                            style: const TextStyle(
                                              fontFamily: 'monospace',
                                              fontSize: 12,
                                            ),
                                          ),
                                          actions: [
                                            TextButton(
                                              onPressed: () =>
                                                  Navigator.pop(ctx),
                                              child: const Text('Close'),
                                            ),
                                          ],
                                        ),
                                      );
                                    },
                                  )
                                : null,
                          );
                        },
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
