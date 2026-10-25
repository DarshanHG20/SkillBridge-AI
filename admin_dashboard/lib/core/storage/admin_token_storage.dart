/// Token and session manager for the Web Admin Console.
class AdminTokenStorage {
  static final AdminTokenStorage _instance = AdminTokenStorage._internal();
  factory AdminTokenStorage() => _instance;
  AdminTokenStorage._internal();

  String? _accessToken;
  String? _refreshToken;
  Map<String, dynamic>? _currentAdmin;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  Map<String, dynamic>? get currentAdmin => _currentAdmin;

  bool get isAuthenticated =>
      _accessToken != null &&
      _accessToken!.isNotEmpty &&
      (_currentAdmin?['role'] == 'admin' ||
          _currentAdmin?['role'] == 'superadmin');

  void saveSession({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> adminUser,
  }) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _currentAdmin = adminUser;
  }

  void clearSession() {
    _accessToken = null;
    _refreshToken = null;
    _currentAdmin = null;
  }
}
