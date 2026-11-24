import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/admin_config.dart';
import '../storage/admin_token_storage.dart';

class AdminApiException implements Exception {
  final String message;
  final int? statusCode;

  AdminApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

/// HTTP API client tailored for the Flutter Web Admin Console.
class AdminApiClient {
  final http.Client _client;
  final String _baseUrl;
  final AdminTokenStorage _storage;

  AdminApiClient({
    http.Client? client,
    String? baseUrl,
    AdminTokenStorage? storage,
  }) : _client = client ?? http.Client(),
       _baseUrl = baseUrl ?? AdminConfig.apiBaseUrl,
       _storage = storage ?? AdminTokenStorage();

  Map<String, String> _buildHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    final token = _storage.accessToken;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Authenticate administrator account.
  Future<Map<String, dynamic>> login(String email, String password) async {
    final uri = Uri.parse('$_baseUrl/auth/login');
    try {
      final response = await _client
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 15));

      final data = _processResponse(response) as Map<String, dynamic>;
      final user = data['user'] as Map<String, dynamic>;
      final role = user['role'] as String?;

      if (role != 'admin' && role != 'superadmin') {
        throw AdminApiException(
          'Access denied: Caller does not possess administrative privileges.',
        );
      }

      _storage.saveSession(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
        adminUser: user,
      );
      return data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Query paginated users with optional search and filters.
  Future<Map<String, dynamic>> listUsers({
    String? search,
    String? role,
    bool? isActive,
    int skip = 0,
    int limit = 20,
  }) async {
    final queryParams = <String, String>{
      'skip': skip.toString(),
      'limit': limit.toString(),
    };
    if (search != null && search.trim().isNotEmpty) {
      queryParams['search'] = search.trim();
    }
    if (role != null && role.isNotEmpty) {
      queryParams['role'] = role;
    }
    if (isActive != null) {
      queryParams['is_active'] = isActive.toString();
    }

    final uri = Uri.parse('$_baseUrl/admin/users')
        .replace(queryParameters: queryParams);
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Get specific user details.
  Future<Map<String, dynamic>> getUserDetail(int userId) async {
    final uri = Uri.parse('$_baseUrl/admin/users/$userId');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Toggle user account activation status.
  Future<Map<String, dynamic>> updateUserStatus(
    int userId,
    bool isActive,
  ) async {
    final uri = Uri.parse('$_baseUrl/admin/users/$userId/status');
    try {
      final response = await _client
          .patch(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'is_active': isActive}),
          )
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Query all configurable skills across domains.
  Future<List<dynamic>> listSkills() async {
    final uri = Uri.parse('$_baseUrl/skills');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Query assessment and question bank definitions.
  Future<List<dynamic>> listAssessments() async {
    final uri = Uri.parse('$_baseUrl/assessments');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// AI Tutor operational status.
  Future<Map<String, dynamic>> getTutorStatus() async {
    final uri = Uri.parse('$_baseUrl/tutor/status');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Approved educational documents.
  Future<List<dynamic>> listDocuments() async {
    final uri = Uri.parse('$_baseUrl/rag/documents');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete document and index entries.
  Future<void> deleteDocument(int documentId) async {
    final uri = Uri.parse('$_baseUrl/rag/documents/$documentId');
    try {
      final response = await _client
          .delete(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Rebuild persistent vector index.
  Future<void> rebuildVectorIndex() async {
    final uri = Uri.parse('$_baseUrl/rag/rebuild-index');
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 30));
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Test query against RAG index.
  Future<Map<String, dynamic>> queryRag(String query) async {
    final uri = Uri.parse('$_baseUrl/rag/query');
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'query': query, 'top_k': 3}),
          )
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// List coding problems.
  Future<List<dynamic>> listCodingProblems() async {
    final uri = Uri.parse('$_baseUrl/coding/problems');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Fetch aggregated platform learning analytics.
  Future<Map<String, dynamic>> getAnalytics() async {
    final uri = Uri.parse('$_baseUrl/admin/analytics');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Query compliance audit logs with optional filters.
  Future<Map<String, dynamic>> getAuditLogs({
    String? action,
    String? entityType,
    int skip = 0,
    int limit = 50,
  }) async {
    final queryParams = <String, String>{
      'skip': skip.toString(),
      'limit': limit.toString(),
    };
    if (action != null && action.isNotEmpty) {
      queryParams['action'] = action;
    }
    if (entityType != null && entityType.isNotEmpty) {
      queryParams['entity_type'] = entityType;
    }

    final uri = Uri.parse('$_baseUrl/admin/audit-logs')
        .replace(queryParameters: queryParams);
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// List learner feedback and bug reports.
  Future<Map<String, dynamic>> listFeedback({
    String? category,
    String? status,
    int skip = 0,
    int limit = 50,
  }) async {
    final queryParams = <String, String>{
      'skip': skip.toString(),
      'limit': limit.toString(),
    };
    if (category != null && category.isNotEmpty) {
      queryParams['category'] = category;
    }
    if (status != null && status.isNotEmpty) {
      queryParams['status'] = status;
    }

    final uri = Uri.parse('$_baseUrl/admin/feedback')
        .replace(queryParameters: queryParams);
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Update feedback resolution status with administrative notes.
  Future<Map<String, dynamic>> updateFeedbackStatus(
    int feedbackId, {
    required String status,
    String? adminNotes,
  }) async {
    final uri = Uri.parse('$_baseUrl/admin/feedback/$feedbackId/status');
    try {
      final response = await _client
          .patch(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'status': status, 'admin_notes': ?adminNotes}),
          )
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Change user role (student, instructor, admin).
  Future<Map<String, dynamic>> updateUserRole(int userId, String role) async {
    final uri = Uri.parse('$_baseUrl/admin/users/$userId/role');
    try {
      final response = await _client
          .patch(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'role': role}),
          )
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Export CSV...
  /// Check backend service health.
  Future<Map<String, dynamic>> checkHealth() async {
    final uri = Uri.parse('$_baseUrl/health');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 10));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Create a new curriculum skill node.
  Future<Map<String, dynamic>> createSkill(Map<String, dynamic> payload) async {
    final uri = Uri.parse('$_baseUrl/admin/skills');
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete a skill node.
  Future<void> deleteSkill(int skillId) async {
    final uri = Uri.parse('$_baseUrl/admin/skills/$skillId');
    try {
      final response = await _client
          .delete(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Create an assessment.
  Future<Map<String, dynamic>> createAssessment(
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_baseUrl/admin/assessments');
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete an assessment and its questions.
  Future<void> deleteAssessment(int assessmentId) async {
    final uri = Uri.parse('$_baseUrl/admin/assessments/$assessmentId');
    try {
      final response = await _client
          .delete(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Add a question to an assessment.
  Future<Map<String, dynamic>> addQuestion(
    int assessmentId,
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_baseUrl/admin/assessments/$assessmentId/questions');
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// List all career pathways.
  Future<List<dynamic>> listCareers() async {
    final uri = Uri.parse('$_baseUrl/careers');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      final data = _processResponse(response);
      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        return (data['items'] ?? data['careers'] ?? []) as List<dynamic>;
      }
      return [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Create a career pathway.
  Future<Map<String, dynamic>> createCareer(
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_baseUrl/admin/careers');
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete a career pathway.
  Future<void> deleteCareer(int careerId) async {
    final uri = Uri.parse('$_baseUrl/admin/careers/$careerId');
    try {
      final response = await _client
          .delete(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// List all capstone project templates.
  Future<List<dynamic>> listProjects() async {
    final uri = Uri.parse('$_baseUrl/projects');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      final data = _processResponse(response);
      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        return (data['items'] ?? data['projects'] ?? []) as List<dynamic>;
      }
      return [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Create a capstone project template.
  Future<Map<String, dynamic>> createProject(
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_baseUrl/admin/projects');
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Delete a capstone project template.
  Future<void> deleteProject(int projectId) async {
    final uri = Uri.parse('$_baseUrl/admin/projects/$projectId');
    try {
      final response = await _client
          .delete(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// List ALL RAG documents (both approved and pending approval) for admin moderation.
  Future<List<dynamic>> listAllAdminDocuments() async {
    final uri = Uri.parse('$_baseUrl/admin/documents');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 15));
      final data = _processResponse(response);
      if (data is List) return data;
      if (data is Map<String, dynamic>) {
        return (data['items'] ?? data['documents'] ?? []) as List<dynamic>;
      }
      return [];
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Approve or revoke approval on a knowledge base document.
  Future<Map<String, dynamic>> setDocumentApproval(
    int documentId,
    bool isApproved,
  ) async {
    final uri = Uri.parse('$_baseUrl/admin/documents/$documentId/approval');
    try {
      final response = await _client
          .patch(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'is_approved': isApproved}),
          )
          .timeout(const Duration(seconds: 15));
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Download CSV export data (users, assessment-attempts, audit-logs).
  Future<String> exportCsv(String type) async {
    final uri = Uri.parse('$_baseUrl/admin/export/$type.csv');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(const Duration(seconds: 20));
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return response.body;
      }
      throw AdminApiException(
        'Failed to export $type CSV',
        response.statusCode,
      );
    } catch (e) {
      throw _handleError(e);
    }
  }

  void logout() {
    _storage.clearSession();
  }

  dynamic _processResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    } else {
      String errorMessage = 'Error ${response.statusCode}';
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic> && decoded.containsKey('detail')) {
          final detail = decoded['detail'];
          errorMessage = detail is String ? detail : detail.toString();
        }
      } catch (_) {}
      throw AdminApiException(errorMessage, response.statusCode);
    }
  }

  Exception _handleError(dynamic error) {
    if (error is AdminApiException) return error;
    if (error is TimeoutException) {
      return AdminApiException(
        'Request timed out while connecting to API server.',
      );
    }
    return AdminApiException(
      'Network error: Unable to reach SkillBridge AI server.',
    );
  }

  void dispose() {
    _client.close();
  }
}
