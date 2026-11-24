import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;
import 'package:flutter/material.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/api_client.dart';
import '../../../core/routing/app_router.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/status_badge.dart';

/// Application settings, diagnostics, and session termination screen.
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _apiClient = ApiClient();
  final _tokenStorage = TokenStorage();
  final _serverUrlController = TextEditingController(
    text: AppConfig.effectiveBaseUrl,
  );

  bool _isPinging = false;
  String? _pingResult;

  @override
  void dispose() {
    _serverUrlController.dispose();
    _apiClient.dispose();
    super.dispose();
  }

  void _applyServerUrl() {
    final val = _serverUrlController.text.trim();
    AppConfig.setRuntimeBaseUrl(val);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('API endpoint updated to ${AppConfig.effectiveBaseUrl}'),
      ),
    );
    _testConnection();
  }

  String get _platformName {
    if (kIsWeb) return 'Web Browser';
    if (defaultTargetPlatform == TargetPlatform.android) return 'Android Device / Emulator';
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'iOS Device';
    if (defaultTargetPlatform == TargetPlatform.windows) return 'Windows Desktop';
    return defaultTargetPlatform.name;
  }

  Future<void> _testConnection() async {
    setState(() {
      _isPinging = true;
      _pingResult = null;
    });

    final stopwatch = Stopwatch()..start();
    try {
      final res = await _apiClient.checkHealth();
      stopwatch.stop();
      final ms = stopwatch.elapsedMilliseconds;
      final dbConnected = res['database_connected'] == true;
      setState(() {
        _pingResult =
            '✅ Connection OK (${ms}ms)\nServer: ${res['project_name']} v${res['version'] ?? '1.0'}\nDatabase: ${dbConnected ? "MongoDB Connected" : "MongoDB Offline"}';
      });
    } catch (e) {
      stopwatch.stop();
      setState(() {
        _pingResult =
            '❌ Connection Failed (${stopwatch.elapsedMilliseconds}ms)\n$e\n\nTroubleshooting:\n1. Verify backend is running (`cd backend-node; npm start`)\n2. On physical Android phone, use computer LAN IP in override field above.';
      });
    } finally {
      if (mounted) {
        setState(() {
          _isPinging = false;
        });
      }
    }
  }

  void _handleLogout() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text(
          'Are you sure you want to end your current learning session?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () {
              Navigator.pop(ctx);
              _apiClient.logout();
              Navigator.pushNamedAndRemoveUntil(
                context,
                AppRouter.login,
                (r) => false,
              );
            },
            child: const Text('Confirm Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = _tokenStorage.currentUser;

    return Scaffold(
      appBar: AppBar(title: const Text('Settings & Configuration')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Account Info Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Account Information',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  _buildSettingRow(
                    'User Email',
                    user?['email'] ?? 'Not logged in',
                  ),
                  const Divider(height: 16),
                  _buildSettingRow('Full Name', user?['full_name'] ?? 'Guest'),
                  const Divider(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Role',
                        style: TextStyle(color: AppColors.lightTextSecondary),
                      ),
                      StatusBadge(
                        label: user?['role'] ?? 'Student',
                        status: BadgeStatus.mastered,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Environment & API Diagnostics
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Backend Network Configuration',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 12),
                  _buildSettingRow('Target Platform', _platformName),
                  const Divider(height: 16),
                  _buildSettingRow('Environment', AppConfig.environment),
                  const Divider(height: 16),
                  _buildSettingRow('Active API URL', AppConfig.effectiveBaseUrl),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _serverUrlController,
                    decoration: InputDecoration(
                      labelText: 'Override API Base URL (e.g. LAN IP for device)',
                      border: const OutlineInputBorder(),
                      isDense: true,
                      suffixIcon: IconButton(
                        tooltip: 'Apply & Test',
                        icon: const Icon(Icons.check_circle_outline),
                        onPressed: _applyServerUrl,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (_pingResult != null) ...[
                    Text(
                      _pingResult!,
                      style: TextStyle(
                        fontSize: 12,
                        color: _pingResult!.startsWith('Connection OK')
                            ? AppColors.success
                            : AppColors.error,
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                  AppButton(
                    label: 'Test Server Connectivity',
                    icon: Icons.network_check,
                    isLoading: _isPinging,
                    variant: AppButtonVariant.outline,
                    onPressed: _testConnection,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Learner Feedback Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Feedback & Bug Reporting',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Encountered an issue or have a curriculum suggestion? Let the instructors and administrators know.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  AppButton(
                    label: 'Submit Feedback',
                    icon: Icons.feedback_outlined,
                    variant: AppButtonVariant.outline,
                    onPressed: _openFeedbackDialog,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Logout Action
          AppButton(
            label: 'Sign Out',
            icon: Icons.logout,
            onPressed: _handleLogout,
          ),
        ],
      ),
    );
  }

  void _openFeedbackDialog() {
    final titleController = TextEditingController();
    final messageController = TextEditingController();
    String category = 'bug_report';

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Send Learner Feedback'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Category',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  initialValue: category,
                  items: const [
                    DropdownMenuItem(
                      value: 'bug_report',
                      child: Text('Bug Report'),
                    ),
                    DropdownMenuItem(
                      value: 'suggestion',
                      child: Text('Feature / Content Suggestion'),
                    ),
                    DropdownMenuItem(
                      value: 'general',
                      child: Text('General Feedback'),
                    ),
                  ],
                  onChanged: (val) {
                    if (val != null) setDialogState(() => category = val);
                  },
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Title',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: titleController,
                  decoration: const InputDecoration(
                    hintText: 'Brief summary of issue or suggestion',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Details',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: messageController,
                  maxLines: 4,
                  decoration: const InputDecoration(
                    hintText:
                        'Describe what happened or your idea in detail...',
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
                final title = titleController.text.trim();
                final msg = messageController.text.trim();
                if (title.length < 3 || msg.length < 10) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Please provide at least 3 chars for title and 10 chars for details.',
                      ),
                    ),
                  );
                  return;
                }

                final messenger = ScaffoldMessenger.of(context);
                Navigator.pop(ctx);
                try {
                  await _apiClient.submitFeedback(
                    title: title,
                    message: msg,
                    category: category,
                  );
                  messenger.showSnackBar(
                    const SnackBar(
                      content: Text(
                        'Thank you! Your feedback has been submitted to the platform team.',
                      ),
                    ),
                  );
                } catch (e) {
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text('Failed to submit: $e'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              },
              child: const Text('Submit'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.lightTextSecondary),
        ),
        Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
      ],
    );
  }
}
