import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_typography.dart';

/// Notifications history screen displaying unread count badges, read/unread filters, and actions.
class NotificationsScreen extends StatefulWidget {
  final ApiClient? apiClient;

  const NotificationsScreen({super.key, this.apiClient});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  late final ApiClient _apiClient;

  bool _isLoading = true;
  String? _errorMessage;

  List<dynamic> _items = [];
  int _unreadCount = 0;

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    _fetchNotifications();
  }

  @override
  void dispose() {
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _fetchNotifications() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.getNotifications();
      if (!mounted) return;
      setState(() {
        _items = (res['items'] as List?) ?? [];
        _unreadCount = (res['unread_count'] as num?)?.toInt() ?? 0;
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

  Future<void> _handleMarkRead(int notifId) async {
    try {
      await _apiClient.markNotificationAsRead(notifId);
      await _fetchNotifications();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to mark read: $e')),
      );
    }
  }

  Future<void> _handleMarkAllRead() async {
    try {
      await _apiClient.markAllNotificationsAsRead();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('All notifications marked as read!'),
          backgroundColor: AppColors.success,
        ),
      );
      await _fetchNotifications();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
    }
  }

  Future<void> _handleDelete(int notifId) async {
    try {
      await _apiClient.deleteNotification(notifId);
      await _fetchNotifications();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to delete: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (_unreadCount > 0)
            TextButton.icon(
              style: TextButton.styleFrom(foregroundColor: AppColors.primary),
              icon: const Icon(Icons.done_all, size: 18),
              label: const Text('Mark All Read'),
              onPressed: _handleMarkAllRead,
            ),
        ],
      ),
      body: SafeArea(
        child: _isLoading && _items.isEmpty
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null && _items.isEmpty
                ? Center(
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
                            onPressed: _fetchNotifications,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _fetchNotifications,
                    child: _items.isEmpty
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.all(24),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.notifications_none, size: 56, color: Colors.grey),
                                  SizedBox(height: 16),
                                  Text(
                                    'No Notifications Yet',
                                    style: AppTypography.titleLarge,
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Notifications about course completions, quiz results, and skill mastery will appear here.',
                                    style: TextStyle(color: AppColors.lightTextSecondary),
                                    textAlign: TextAlign.center,
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _items.length,
                            itemBuilder: (context, index) {
                              final item = _items[index] as Map<String, dynamic>;
                              final id = (item['id'] as num).toInt();
                              final title = (item['title'] ?? '').toString();
                              final message = (item['message'] ?? '').toString();
                              final isRead = item['is_read'] == true;
                              final type = (item['type'] ?? 'general').toString();
                              final createdAt = (item['created_at'] ?? '').toString();

                              IconData iconData = Icons.notifications;
                              Color iconColor = AppColors.primary;

                              if (type == 'course_completed') {
                                iconData = Icons.emoji_events;
                                iconColor = Colors.amber;
                              } else if (type == 'lesson_completed') {
                                iconData = Icons.menu_book;
                                iconColor = AppColors.success;
                              } else if (type == 'quiz_result') {
                                iconData = Icons.assignment_turned_in;
                                iconColor = AppColors.secondary;
                              } else if (type == 'achievement') {
                                iconData = Icons.bolt;
                                iconColor = Colors.purple;
                              }

                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  side: BorderSide(
                                    color: isRead
                                        ? Colors.grey.withValues(alpha: 0.15)
                                        : AppColors.primary.withValues(alpha: 0.4),
                                    width: isRead ? 1 : 1.5,
                                  ),
                                ),
                                color: isRead
                                    ? null
                                    : AppColors.primary.withValues(alpha: 0.05),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      CircleAvatar(
                                        radius: 18,
                                        backgroundColor: iconColor.withValues(alpha: 0.1),
                                        child: Icon(iconData, color: iconColor, size: 18),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Expanded(
                                                  child: Text(
                                                    title,
                                                    style: AppTypography.titleMedium.copyWith(
                                                      fontWeight: isRead
                                                          ? FontWeight.normal
                                                          : FontWeight.bold,
                                                    ),
                                                  ),
                                                ),
                                                if (!isRead)
                                                  Container(
                                                    width: 8,
                                                    height: 8,
                                                    decoration: const BoxDecoration(
                                                      color: AppColors.primary,
                                                      shape: BoxShape.circle,
                                                    ),
                                                  ),
                                              ],
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              message,
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: isRead
                                                    ? AppColors.lightTextSecondary
                                                    : AppColors.lightTextPrimary,
                                              ),
                                            ),
                                            if (createdAt.isNotEmpty) ...[
                                              const SizedBox(height: 6),
                                              Text(
                                                createdAt.length > 10
                                                    ? createdAt.substring(0, 10)
                                                    : createdAt,
                                                style: const TextStyle(
                                                  fontSize: 10,
                                                  color: Colors.grey,
                                                ),
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      PopupMenuButton<String>(
                                        icon: const Icon(Icons.more_vert, size: 18),
                                        onSelected: (val) {
                                          if (val == 'read') {
                                            _handleMarkRead(id);
                                          } else if (val == 'delete') {
                                            _handleDelete(id);
                                          }
                                        },
                                        itemBuilder: (context) => [
                                          if (!isRead)
                                            const PopupMenuItem(
                                              value: 'read',
                                              child: Text('Mark as read'),
                                            ),
                                          const PopupMenuItem(
                                            value: 'delete',
                                            child: Text('Delete'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
      ),
    );
  }
}
