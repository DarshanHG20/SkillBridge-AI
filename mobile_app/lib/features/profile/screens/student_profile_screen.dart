import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/storage/token_storage.dart';
import '../../../shared/widgets/app_button.dart';
import '../../../shared/widgets/app_text_field.dart';

/// Student profile view and edit screen communicating with /api/v1/users/me and /profile.
class StudentProfileScreen extends StatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  State<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends State<StudentProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _apiClient = ApiClient();
  final _tokenStorage = TokenStorage();

  late TextEditingController _nameController;
  late TextEditingController _headlineController;
  late TextEditingController _bioController;
  late TextEditingController _targetRoleController;
  late TextEditingController _hoursController;

  bool _isLoading = false;
  String _learningStyle = 'visual';

  @override
  void initState() {
    super.initState();
    final user = _tokenStorage.currentUser;
    final profile = user?['profile'] as Map<String, dynamic>?;

    _nameController = TextEditingController(text: user?['full_name'] ?? '');
    _headlineController = TextEditingController(
      text: profile?['headline'] ?? '',
    );
    _bioController = TextEditingController(text: profile?['bio'] ?? '');
    _targetRoleController = TextEditingController(
      text: profile?['target_role'] ?? 'Software Engineer',
    );
    _hoursController = TextEditingController(
      text: profile?['target_hours_per_week']?.toString() ?? '10',
    );
    _learningStyle = profile?['preferred_learning_style'] ?? 'visual';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _headlineController.dispose();
    _bioController.dispose();
    _targetRoleController.dispose();
    _hoursController.dispose();
    _apiClient.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
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
          const SnackBar(content: Text('Profile updated successfully!')),
        );
        Navigator.pop(context);
      }
    } on ApiException catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: ${e.message}')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to update profile.')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Edit Student Profile')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
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
                items: const [
                  DropdownMenuItem(
                    value: 'visual',
                    child: Text('Visual & Diagrams'),
                  ),
                  DropdownMenuItem(
                    value: 'interactive',
                    child: Text('Interactive Code & Quizzes'),
                  ),
                  DropdownMenuItem(
                    value: 'reading',
                    child: Text('Documentation & Articles'),
                  ),
                ],
                onChanged: (v) {
                  if (v != null) setState(() => _learningStyle = v);
                },
              ),
              const SizedBox(height: 28),
              AppButton(
                label: 'Save Changes',
                isLoading: _isLoading,
                onPressed: _handleSave,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
