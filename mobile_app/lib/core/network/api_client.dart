import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../constants/api_constants.dart';
import '../storage/token_storage.dart';

/// Network exception wrapper providing human-readable error messages and status codes.
class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => message;
}

/// Decoupled HTTP API client handling base URLs, bearer token injection, timeouts, and JSON parsing.
class ApiClient {
  final http.Client _client;
  final String _baseUrl;
  final TokenStorage _tokenStorage;

  ApiClient({http.Client? client, String? baseUrl, TokenStorage? tokenStorage})
    : _client = client ?? http.Client(),
      _baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
      _tokenStorage = tokenStorage ?? TokenStorage();

  Map<String, String> _buildHeaders() {
    final headers = Map<String, String>.from(ApiConstants.defaultHeaders);
    final token = _tokenStorage.accessToken;
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  /// Check backend service health.
  Future<Map<String, dynamic>> checkHealth() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.healthEndpoint}');
    try {
      final response = await _client
          .get(uri, headers: ApiConstants.defaultHeaders)
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Authenticate student credentials and cache tokens.
  Future<Map<String, dynamic>> login(String email, String password) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.authLogin}');
    try {
      final response = await _client
          .post(
            uri,
            headers: ApiConstants.defaultHeaders,
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(AppConfig.timeout);

      final data = _processResponse(response) as Map<String, dynamic>;
      _tokenStorage.saveSession(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
        user: data['user'] as Map<String, dynamic>,
      );
      return data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Register new student account and cache tokens.
  Future<Map<String, dynamic>> register({
    required String email,
    required String password,
    required String fullName,
  }) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.authRegister}');
    try {
      final response = await _client
          .post(
            uri,
            headers: ApiConstants.defaultHeaders,
            body: jsonEncode({
              'email': email,
              'password': password,
              'full_name': fullName,
            }),
          )
          .timeout(AppConfig.timeout);

      final data = _processResponse(response) as Map<String, dynamic>;
      _tokenStorage.saveSession(
        accessToken: data['access_token'] as String,
        refreshToken: data['refresh_token'] as String,
        user: data['user'] as Map<String, dynamic>,
      );
      return data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Request password recovery guidance.
  Future<Map<String, dynamic>> forgotPassword(String email) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.authForgotPassword}');
    try {
      final response = await _client
          .post(
            uri,
            headers: ApiConstants.defaultHeaders,
            body: jsonEncode({'email': email}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Fetch authenticated student's profile.
  Future<Map<String, dynamic>> getProfile() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.userMe}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      final data = _processResponse(response) as Map<String, dynamic>;
      _tokenStorage.updateUser(data);
      return data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Update student profile metadata (headline, bio, target role, etc.).
  Future<Map<String, dynamic>> updateStudentProfile(
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.userProfile}');
    try {
      final response = await _client
          .put(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(AppConfig.timeout);
      final data = _processResponse(response) as Map<String, dynamic>;
      // Refresh user record
      await getProfile();
      return data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Update basic account user information (full name).
  Future<Map<String, dynamic>> updateUserAccount(String fullName) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.userMe}');
    try {
      final response = await _client
          .put(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'full_name': fullName}),
          )
          .timeout(AppConfig.timeout);
      final data = _processResponse(response) as Map<String, dynamic>;
      _tokenStorage.updateUser(data);
      return data;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Log out caller and purge stored session.
  void logout() {
    _tokenStorage.clearSession();
  }

  // --- Part 3: Skills & Taxonomy ---

  Future<List<dynamic>> getSkills({String? category}) async {
    final query = category != null ? '?category=$category' : '';
    final uri = Uri.parse('$_baseUrl${ApiConstants.skills}$query');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getSkillTaxonomyTree() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.skillsTaxonomyTree}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getMyMastery() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.skillsMyMastery}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // --- Part 3: Assessments ---

  Future<List<dynamic>> getAssessments({int? skillId}) async {
    final query = skillId != null ? '?skill_id=$skillId' : '';
    final uri = Uri.parse('$_baseUrl${ApiConstants.assessments}$query');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> startAssessment(int assessmentId) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.assessments}/$assessmentId/start',
    );
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> submitAssessment(
    int attemptId,
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.assessments}/attempts/$attemptId/submit',
    );
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getAttemptResults(int attemptId) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.assessments}/attempts/$attemptId',
    );
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getAssessmentHistory() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.assessmentsHistory}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // --- Part 3: Adaptive Learning Engine ---

  Future<Map<String, dynamic>> getAdaptiveNextActivity() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.adaptiveNextActivity}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getAdaptiveWeakConcepts() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.adaptiveWeakConcepts}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getAdaptiveOverview() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.adaptiveOverview}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // --- Part 3: Career Intelligence ---

  Future<List<dynamic>> getCareers() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.careers}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getCareerGapAnalysis(String slug) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.careers}/$slug/gap-analysis',
    );
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> generateCareerRoadmap(
    String slug,
    String planType,
  ) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.careers}/$slug/generate-roadmap',
    );
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'plan_type': planType}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getMyRoadmaps() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.careersMyRoadmaps}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // --- Part 3: Project-Based Learning ---

  Future<List<dynamic>> getProjects() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.projects}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> updateProjectProgress(
    int projectId,
    Map<String, dynamic> payload,
  ) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.projects}/$projectId/progress',
    );
    try {
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(payload))
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getMyPortfolio() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.projectsMyPortfolio}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Part 4: AI Tutor & Chat methods
  Future<Map<String, dynamic>> getTutorStatus() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.tutorStatus}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> queryTutor(
    String prompt, {
    String? skillContext,
  }) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.tutorQuery}');
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'prompt': prompt, 'skill_context': skillContext}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> listChatConversations() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.chatConversations}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> createChatConversation({
    String? title,
    String? topic,
  }) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.chatConversations}');
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'title': title, 'topic': topic ?? 'general'}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getChatConversation(int conversationId) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.chatConversations}/$conversationId',
    );
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> sendChatMessage(
    int conversationId,
    String content, {
    bool useRag = false,
  }) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.chatConversations}/$conversationId/messages',
    );
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'content': content, 'use_rag': useRag}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> deleteChatConversation(int conversationId) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.chatConversations}/$conversationId',
    );
    try {
      final response = await _client
          .delete(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      _processResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Part 4: RAG Knowledge Document methods
  Future<List<dynamic>> listRagDocuments() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.ragDocuments}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getRagDocumentDetail(int documentId) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.ragDocuments}/$documentId');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> queryRag(String query, {int topK = 3}) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.ragQuery}');
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'query': query, 'top_k': topK}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Part 4: Coding Practice methods
  Future<List<dynamic>> listCodingProblems({
    String? skillSlug,
    String? difficulty,
  }) async {
    final queryParams = <String, String>{};
    if (skillSlug != null) queryParams['skill_slug'] = skillSlug;
    if (difficulty != null) queryParams['difficulty'] = difficulty;

    final uri = Uri.parse('$_baseUrl${ApiConstants.codingProblems}')
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> getCodingProblemDetail(String slug) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.codingProblems}/$slug');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<Map<String, dynamic>> submitCodingSolution(
    int problemId,
    String code,
  ) async {
    final uri = Uri.parse(
      '$_baseUrl${ApiConstants.codingProblems}/$problemId/submit',
    );
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({'submitted_code': code}),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getMyCodingSubmissions({int? problemId}) async {
    final queryParams = <String, String>{};
    if (problemId != null) queryParams['problem_id'] = problemId.toString();

    final uri = Uri.parse('$_baseUrl${ApiConstants.codingSubmissions}')
        .replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<List<dynamic>> getCodingRecommendations() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.codingRecommendations}');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Submit learner feedback, content suggestions, or bug reports.
  Future<Map<String, dynamic>> submitFeedback({
    required String title,
    required String message,
    String category = 'general',
  }) async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.feedback}');
    try {
      final response = await _client
          .post(
            uri,
            headers: _buildHeaders(),
            body: jsonEncode({
              'title': title,
              'message': message,
              'category': category,
            }),
          )
          .timeout(AppConfig.timeout);
      return _processResponse(response) as Map<String, dynamic>;
    } catch (e) {
      throw _handleError(e);
    }
  }

  /// Retrieve caller's feedback submission history.
  Future<List<dynamic>> getMyFeedback() async {
    final uri = Uri.parse('$_baseUrl${ApiConstants.feedback}/my-feedback');
    try {
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConfig.timeout);
      return (_processResponse(response) as List).cast<dynamic>();
    } catch (e) {
      throw _handleError(e);
    }
  }

  dynamic _processResponse(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    } else {
      String errorMessage = 'Request failed with status ${response.statusCode}';
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic> && decoded.containsKey('detail')) {
          final detail = decoded['detail'];
          if (detail is String) {
            errorMessage = detail;
          } else if (detail is List && detail.isNotEmpty) {
            errorMessage = detail
                .map((e) => e['msg'] ?? e.toString())
                .join(', ');
          }
        }
      } catch (_) {}
      throw ApiException(errorMessage, response.statusCode);
    }
  }

  Exception _handleError(dynamic error) {
    if (error is ApiException) return error;
    if (error is TimeoutException) {
      return ApiException(
        'Network request timed out. Please check your connection.',
      );
    }
    return ApiException(
      'Network error: Unable to reach SkillBridge AI server.',
    );
  }

  void dispose() {
    _client.close();
  }
}
