import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../core/theme/app_colors.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';

/// Student profile view and edit screen communicating with /api/v1/users/me and /profile.
class StudentProfileScreen extends StatefulWidget {
  final ApiClient? apiClient;
  final TokenStorage? tokenStorage;

  const StudentProfileScreen({super.key, this.apiClient, this.tokenStorage});

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  late final ApiClient _apiClient;
  late final TokenStorage _tokenStorage;

  late TextEditingController _nameController;
  late TextEditingController _headlineController;
  late TextEditingController _bioController;
  late TextEditingController _targetRoleController;
  late TextEditingController _hoursController;

  bool _isInitialLoading = true;
  bool _isSaving = false;
  String? _loadError;
  String _learningStyle = 'visual';

  static const List<Map<String, String>> _styleOptions = [
    {'value': 'visual', 'label': 'Visual & Diagrams'},
    {'value': 'interactive', 'label': 'Interactive Code & Quizzes'},
    {'value': 'hands_on', 'label': 'Hands-on Projects & Practice'},
    {'value': 'reading', 'label': 'Documentation & Articles'},
    {'value': 'auditory', 'label': 'Lectures & Discussions'},
  ];

  @override
  void initState() {
    super.initState();
    _apiClient = widget.apiClient ?? ApiClient();
    _tokenStorage = widget.tokenStorage ?? TokenStorage();
    _initializeControllers();
    _loadProfileFromBackend();
  }

  void _initializeControllers() {
    final cached = _tokenStorage.currentUser;
    final profile = cached?['profile'] is Map ? cached!['profile'] as Map<String, dynamic> : null;

    _nameController = TextEditingController(text: cached?['full_name'] as String? ?? '');
    _headlineController = TextEditingController(text: profile?['headline'] as String? ?? '');
    _bioController = TextEditingController(text: profile?['bio'] as String? ?? '');
    _targetRoleController = TextEditingController(
      text: profile?['target_role'] as String? ?? 'Software Engineer',
    );
    _hoursController = TextEditingController(
      text: profile?['target_hours_per_week']?.toString() ?? '10',
    );
    _setSafeLearningStyle(profile?['preferred_learning_style'] as String?);
  }

  void _setSafeLearningStyle(String? rawStyle) {
    if (rawStyle == null) {
      _learningStyle = 'visual';
      return;
    }
    final match = _styleOptions.any((opt) => opt['value'] == rawStyle);
    _learningStyle = match ? rawStyle : 'visual';
  }

  void _populateFromUser(Map<String, dynamic> user) {
    final profile = user['profile'] is Map ? user['profile'] as Map<String, dynamic> : null;
    _nameController.text = user['full_name'] as String? ?? '';
    _headlineController.text = profile?['headline'] as String? ?? '';
    _bioController.text = profile?['bio'] as String? ?? '';
    _targetRoleController.text = profile?['target_role'] as String? ?? 'Software Engineer';
    _hoursController.text = (profile?['target_hours_per_week']?.toString()) ?? '10';
    _setSafeLearningStyle(profile?['preferred_learning_style'] as String?);
  }

  Future<void> _loadProfileFromBackend() async {
    setState(() {
      _isInitialLoading = true;
      _loadError = null;
    });

    try {
      final user = await _apiClient.getProfile();
      if (!mounted) return;
      setState(() {
        _populateFromUser(user);
        _isInitialLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.toString();
        _isInitialLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _headlineController.dispose();
    _bioController.dispose();
    _targetRoleController.dispose();
    _hoursController.dispose();
    if (widget.apiClient == null) {
      _apiClient.dispose();
    }
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (_isSaving) return;
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isSaving = true;
    });

    try {
      // 1. Update full name
      await _apiClient.updateUserAccount(_nameController.text.trim());

      // 2. Update profile
      final hours = int.tryParse(_hoursController.text.trim()) ?? 10;
      await _apiClient.updateStudentProfile({
        'headline': _headlineController.text.trim(),
        'bio': _bioController.text.trim(),
        'target_role': _targetRoleController.text.trim(),
        'target_hours_per_week': hours,
        'preferred_learning_style': _learningStyle,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Profile updated successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context, true);
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: ${e.message}'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update profile. Please try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Student Profile')),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isInitialLoading && _tokenStorage.currentUser == null) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_loadError != null && _tokenStorage.currentUser == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, size: 48, color: AppColors.error),
              const SizedBox(height: 16),
              Text(
                'Unable to load profile:\n$_loadError',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.error),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.refresh),
                label: const Text('Retry'),
                onPressed: _loadProfileFromBackend,
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadProfileFromBackend,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_isInitialLoading)
                const LinearProgressIndicator(minHeight: 2),
              if (_loadError != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.warning),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber, color: AppColors.warning),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Showing offline data. Tap to retry loading latest profile.',
                          style: TextStyle(fontSize: 12, color: Colors.amber.shade900),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.refresh, size: 18),
                        onPressed: _loadProfileFromBackend,
                      ),
                    ],
                  ),
                ),
              AppTextField(
                controller: _nameController,
                label: 'Full Name',
                prefixIcon: Icons.person_outline,
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Name cannot be empty'
                    : null,
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _headlineController,
                label: 'Professional Headline',
                hint: 'e.g. Python Developer & AI Enthusiast',
                prefixIcon: Icons.title,
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _targetRoleController,
                label: 'Target Career Role',
                hint: 'e.g. Backend Engineer, Data Scientist',
                prefixIcon: Icons.work_outline,
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _hoursController,
                label: 'Weekly Study Target (Hours)',
                hint: '10',
                keyboardType: TextInputType.number,
                prefixIcon: Icons.timelapse,
                validator: (v) {
                  final n = int.tryParse(v ?? '');
                  if (n == null || n < 1 || n > 100) {
                    return 'Enter between 1 and 100 hours';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              AppTextField(
                controller: _bioController,
                label: 'Bio / Learning Goals',
                hint: 'Share your background and what you want to achieve...',
                prefixIcon: Icons.notes,
                maxLines: 4,
              ),
              const SizedBox(height: 16),
              const Text(
                'Preferred Learning Style',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: _learningStyle,
                decoration: InputDecoration(
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
                ),
                items: _styleOptions.map((opt) {
                  return DropdownMenuItem<String>(
                    value: opt['value'],
                    child: Text(opt['label']!),
                  );
                }).toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _learningStyle = v);
                },
              ),
              const SizedBox(height: 28),
              AppButton(
                label: 'Save Changes',
                isLoading: _isSaving,
                onPressed: _isSaving ? null : _handleSave,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
