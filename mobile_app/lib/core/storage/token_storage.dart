/// In-memory and session storage manager for JWT tokens and cached user data.
class TokenStorage {
  static final TokenStorage _instance = TokenStorage._internal();
  factory TokenStorage() => _instance;
  TokenStorage._internal();

  String? _accessToken;
  String? _refreshToken;
  Map<String, dynamic>? _currentUser;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  Map<String, dynamic>? get currentUser => _currentUser;

  bool get isAuthenticated => _accessToken != null && _accessToken!.isNotEmpty;

  void saveSession({
    required String accessToken,
    required String refreshToken,
    required Map<String, dynamic> user,
  }) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _currentUser = user;
  }

  void updateUser(Map<String, dynamic> updatedUser) {
    _currentUser = updatedUser;
  }

  void clearSession() {
    _accessToken = null;
    _refreshToken = null;
    _currentUser = null;
  }
}
