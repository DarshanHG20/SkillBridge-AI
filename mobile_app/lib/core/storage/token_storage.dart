import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';

/// In-memory and persistent session storage manager for JWT tokens and cached user data.
class TokenStorage {
  static final TokenStorage _instance = TokenStorage._internal();
  factory TokenStorage() => _instance;

  String? _accessToken;
  String? _refreshToken;
  Map<String, dynamic>? _currentUser;

  TokenStorage._internal() {
    _loadFromDisk();
  }

  File? get _sessionFile {
    if (kIsWeb) return null;
    try {
      final dir = Directory.systemTemp;
      return File('${dir.path}/skillbridge_session.json');
    } catch (_) {
      return null;
    }
  }

  void _loadFromDisk() {
    if (kIsWeb) return;
    try {
      final file = _sessionFile;
      if (file != null && file.existsSync()) {
        final content = file.readAsStringSync();
        if (content.isNotEmpty) {
          final data = jsonDecode(content) as Map<String, dynamic>;
          _accessToken = data['access_token'] as String?;
          _refreshToken = data['refresh_token'] as String?;
          if (data['user'] is Map<String, dynamic>) {
            _currentUser = data['user'] as Map<String, dynamic>;
          }
        }
      }
    } catch (_) {}
  }

  void _saveToDisk() {
    if (kIsWeb) return;
    try {
      final file = _sessionFile;
      if (file != null) {
        if (_accessToken != null && _accessToken!.isNotEmpty) {
          final data = {
            'access_token': _accessToken,
            'refresh_token': _refreshToken,
            'user': _currentUser,
          };
          file.writeAsStringSync(jsonEncode(data));
        } else if (file.existsSync()) {
          file.deleteSync();
        }
      }
    } catch (_) {}
  }

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
    _saveToDisk();
  }

  void updateUser(Map<String, dynamic> updatedUser) {
    _currentUser = updatedUser;
    _saveToDisk();
  }

  void clearSession() {
    _accessToken = null;
    _refreshToken = null;
    _currentUser = null;
    _saveToDisk();
  }

  @visibleForTesting
  void resetForTesting() {
    _accessToken = null;
    _refreshToken = null;
    _currentUser = null;
    try {
      final file = _sessionFile;
      if (file != null && file.existsSync()) {
        file.deleteSync();
      }
    } catch (_) {}
  }
}
