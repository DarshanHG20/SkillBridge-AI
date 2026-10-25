import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';
import 'user_detail_screen.dart';

/// User account management screen featuring search, role filter, pagination, and status toggles.
class UserListScreen extends StatefulWidget {
  const UserListScreen({super.key});

  @override
  State<UserListScreen> createState() => _UserListScreenState();
}

class _UserListScreenState extends State<UserListScreen> {
  final _apiClient = AdminApiClient();
  final _searchController = TextEditingController();

  bool _isLoading = false;
  String? _errorMessage;

  List<dynamic> _users = [];
  int _total = 0;
  int _skip = 0;
  final int _limit = 10;

  String? _selectedRole;
  bool? _selectedActive;

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await _apiClient.listUsers(
        search: _searchController.text.trim().isEmpty
            ? null
            : _searchController.text.trim(),
        role: _selectedRole,
        isActive: _selectedActive,
        skip: _skip,
        limit: _limit,
      );

      setState(() {
        _users = (res['items'] as List<dynamic>?) ?? [];
        _total = (res['total'] as int?) ?? 0;
      });
    } on AdminApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Failed to load users from the server.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _toggleStatus(int userId, bool currentStatus) async {
    final newStatus = !currentStatus;
    try {
      await _apiClient.updateUserStatus(userId, newStatus);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'User account #$userId ${newStatus ? "Activated" : "Deactivated"} successfully.',
            ),
            backgroundColor: newStatus
                ? AdminColors.success
                : AdminColors.danger,
          ),
        );
      }
      _fetchUsers();
    } on AdminApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Action failed: ${e.message}'),
            backgroundColor: AdminColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final startIdx = _total == 0 ? 0 : _skip + 1;
    final endIdx = (_skip + _limit) > _total ? _total : (_skip + _limit);

    return AdminScaffold(
      activeRoute: '/users',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Page Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'User & Student Management',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w700,
                        color: AdminColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Search, view student profiles, and manage account activation status.',
                      style: TextStyle(
                        fontSize: 14,
                        color: AdminColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.refresh),
                  tooltip: 'Refresh list',
                  onPressed: _fetchUsers,
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Filter Bar Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Wrap(
                  spacing: 16,
                  runSpacing: 12,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // Search
                    SizedBox(
                      width: 280,
                      child: TextField(
                        controller: _searchController,
                        onSubmitted: (_) {
                          _skip = 0;
                          _fetchUsers();
                        },
                        decoration: InputDecoration(
                          hintText: 'Search by name or email...',
                          prefixIcon: const Icon(Icons.search, size: 20),
                          isDense: true,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                        ),
                      ),
                    ),

                    // Role filter
                    DropdownButton<String?>(
                      value: _selectedRole,
                      hint: const Text('All Roles'),
                      items: const [
                        DropdownMenuItem(value: null, child: Text('All Roles')),
                        DropdownMenuItem(
                          value: 'student',
                          child: Text('Student'),
                        ),
                        DropdownMenuItem(value: 'admin', child: Text('Admin')),
                        DropdownMenuItem(
                          value: 'instructor',
                          child: Text('Instructor'),
                        ),
                      ],
                      onChanged: (v) {
                        setState(() {
                          _selectedRole = v;
                          _skip = 0;
                        });
                        _fetchUsers();
                      },
                    ),

                    // Status filter
                    DropdownButton<bool?>(
                      value: _selectedActive,
                      hint: const Text('All Statuses'),
                      items: const [
                        DropdownMenuItem(
                          value: null,
                          child: Text('All Statuses'),
                        ),
                        DropdownMenuItem(
                          value: true,
                          child: Text('Active Only'),
                        ),
                        DropdownMenuItem(
                          value: false,
                          child: Text('Deactivated Only'),
                        ),
                      ],
                      onChanged: (v) {
                        setState(() {
                          _selectedActive = v;
                          _skip = 0;
                        });
                        _fetchUsers();
                      },
                    ),

                    ElevatedButton.icon(
                      onPressed: () {
                        _skip = 0;
                        _fetchUsers();
                      },
                      icon: const Icon(Icons.filter_list, size: 16),
                      label: const Text('Filter'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AdminColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AdminColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: AdminColors.danger.withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: AdminColors.danger),
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Users Table Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (_isLoading)
                      const Padding(
                        padding: EdgeInsets.all(40),
                        child: Center(child: CircularProgressIndicator()),
                      )
                    else if (_users.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(40),
                        child: Center(
                          child: Text(
                            'No users found matching current filters.',
                            style: TextStyle(color: AdminColors.textSecondary),
                          ),
                        ),
                      )
                    else
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: DataTable(
                          columns: const [
                            DataColumn(label: Text('ID')),
                            DataColumn(label: Text('Name')),
                            DataColumn(label: Text('Email')),
                            DataColumn(label: Text('Role')),
                            DataColumn(label: Text('Status')),
                            DataColumn(label: Text('Actions')),
                          ],
                          rows: _users.map((u) {
                            final userId = u['id'] as int;
                            final isActive = (u['is_active'] as bool?) ?? true;
                            final role = (u['role'] as String?) ?? 'student';

                            return DataRow(
                              cells: [
                                DataCell(Text('#$userId')),
                                DataCell(Text(u['full_name'] ?? '—')),
                                DataCell(Text(u['email'] ?? '—')),
                                DataCell(
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: role == 'admin'
                                          ? AdminColors.primary.withValues(
                                              alpha: 0.1,
                                            )
                                          : AdminColors.info.withValues(
                                              alpha: 0.1,
                                            ),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      role.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: role == 'admin'
                                            ? AdminColors.primary
                                            : AdminColors.info,
                                      ),
                                    ),
                                  ),
                                ),
                                DataCell(
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isActive
                                            ? Icons.check_circle
                                            : Icons.cancel,
                                        size: 14,
                                        color: isActive
                                            ? AdminColors.success
                                            : AdminColors.danger,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isActive ? 'Active' : 'Inactive',
                                        style: TextStyle(
                                          color: isActive
                                              ? AdminColors.success
                                              : AdminColors.danger,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                DataCell(
                                  Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(
                                          Icons.visibility_outlined,
                                          size: 18,
                                        ),
                                        tooltip: 'View Details',
                                        onPressed: () {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => UserDetailScreen(
                                                userId: userId,
                                              ),
                                            ),
                                          ).then((_) => _fetchUsers());
                                        },
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          isActive ? Icons.block : Icons.check,
                                          size: 18,
                                          color: isActive
                                              ? AdminColors.danger
                                              : AdminColors.success,
                                        ),
                                        tooltip: isActive
                                            ? 'Deactivate User'
                                            : 'Activate User',
                                        onPressed: () =>
                                            _toggleStatus(userId, isActive),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
                    const SizedBox(height: 16),

                    // Pagination Controls
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Showing $startIdx to $endIdx of $_total entries',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AdminColors.textSecondary,
                          ),
                        ),
                        Row(
                          children: [
                            OutlinedButton(
                              onPressed: _skip > 0
                                  ? () {
                                      setState(() {
                                        _skip = (_skip - _limit).clamp(
                                          0,
                                          _total,
                                        );
                                      });
                                      _fetchUsers();
                                    }
                                  : null,
                              child: const Text('Previous'),
                            ),
                            const SizedBox(width: 8),
                            OutlinedButton(
                              onPressed: (_skip + _limit) < _total
                                  ? () {
                                      setState(() {
                                        _skip = _skip + _limit;
                                      });
                                      _fetchUsers();
                                    }
                                  : null,
                              child: const Text('Next'),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
