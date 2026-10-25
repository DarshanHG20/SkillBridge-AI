import 'package:flutter/material.dart';

import '../../../core/network/admin_api_client.dart';
import '../../../core/theme/admin_colors.dart';
import '../../../shared/widgets/admin_scaffold.dart';

/// Detailed view of a specific user account with activation/deactivation controls.
class UserDetailScreen extends StatefulWidget {
  final int userId;

  const UserDetailScreen({super.key, required this.userId});

  @override
  State<UserDetailScreen> createState() => _UserDetailScreenState();
}

class _UserDetailScreenState extends State<UserDetailScreen> {
  final _apiClient = AdminApiClient();
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _fetchDetail();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _fetchDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final data = await _apiClient.getUserDetail(widget.userId);
      setState(() {
        _user = data;
      });
    } on AdminApiException catch (e) {
      setState(() {
        _errorMessage = e.message;
      });
    } catch (_) {
      setState(() {
        _errorMessage = 'Unable to fetch user details.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _toggleAccountStatus() async {
    if (_user == null) return;
    final currentStatus = (_user!['is_active'] as bool?) ?? true;
    final newStatus = !currentStatus;

    try {
      final updated = await _apiClient.updateUserStatus(
        widget.userId,
        newStatus,
      );
      setState(() {
        _user = updated;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Account successfully ${newStatus ? "Activated" : "Deactivated"}.',
            ),
            backgroundColor: newStatus
                ? AdminColors.success
                : AdminColors.danger,
          ),
        );
      }
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
    final fullName = _user?['full_name'] as String? ?? '—';
    final email = _user?['email'] as String? ?? '—';
    final role = _user?['role'] as String? ?? 'student';
    final isActive = (_user?['is_active'] as bool?) ?? true;
    final isVerified = (_user?['is_verified'] as bool?) ?? false;
    final profile = _user?['profile'] as Map<String, dynamic>?;

    return AdminScaffold(
      activeRoute: '/users',
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Breadcrumb / Back button
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.arrow_back),
                  onPressed: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Text(
                  'User #${widget.userId} / $fullName',
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (_isLoading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_errorMessage != null)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AdminColors.danger.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  _errorMessage!,
                  style: const TextStyle(color: AdminColors.danger),
                ),
              )
            else if (_user != null) ...[
              // Account Summary Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: AdminColors.primary,
                                child: Text(
                                  fullName.isNotEmpty
                                      ? fullName[0].toUpperCase()
                                      : 'U',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    fullName,
                                    style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Text(
                                    email,
                                    style: const TextStyle(
                                      color: AdminColors.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          // Status Action Toggle
                          ElevatedButton.icon(
                            onPressed: _toggleAccountStatus,
                            icon: Icon(
                              isActive ? Icons.block : Icons.check_circle,
                              size: 18,
                            ),
                            label: Text(
                              isActive
                                  ? 'Deactivate Account'
                                  : 'Activate Account',
                            ),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isActive
                                  ? AdminColors.danger
                                  : AdminColors.success,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 32),

                      // Metadata Grid
                      Wrap(
                        spacing: 32,
                        runSpacing: 16,
                        children: [
                          _buildDetailItem('Account ID', '#${widget.userId}'),
                          _buildDetailItem('Role', role.toUpperCase()),
                          _buildDetailItem(
                            'Account Status',
                            isActive ? 'Active' : 'Deactivated',
                          ),
                          _buildDetailItem(
                            'Email Verification',
                            isVerified ? 'Verified' : 'Unverified',
                          ),
                          _buildDetailItem(
                            'Created Timestamp',
                            _user?['created_at']?.toString() ?? '—',
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Student Profile Details Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Student Learning Profile',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      if (profile != null) ...[
                        _buildDetailItem(
                          'Headline',
                          profile['headline'] ?? '—',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailItem(
                          'Target Career Role',
                          profile['target_role'] ?? '—',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailItem(
                          'Target Study Hours / Week',
                          '${profile['target_hours_per_week'] ?? 10} hours',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailItem(
                          'Education Level',
                          profile['education_level'] ?? '—',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailItem(
                          'Preferred Learning Style',
                          profile['preferred_learning_style'] ?? 'visual',
                        ),
                        const SizedBox(height: 12),
                        _buildDetailItem(
                          'Biography',
                          profile['bio']?.isEmpty ?? true
                              ? 'No biography provided'
                              : profile['bio'],
                        ),
                      ] else ...[
                        const Text(
                          'No extended student profile registered for this account.',
                          style: TextStyle(color: AdminColors.textSecondary),
                        ),
                      ],
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

  Widget _buildDetailItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AdminColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AdminColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
