import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Centralized application runtime and compile-time configuration.
class AppConfig {
  /// Base API URL. Injected via `--dart-define=API_BASE_URL=https://...`
  /// Defaults to Android emulator localhost `http://10.0.2.2:5000/api/v1` or local dev.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api/v1',
  );

  static String? _runtimeOverrideUrl;

  /// Optional runtime override for local physical device LAN testing (e.g. via Settings).
  static void setRuntimeBaseUrl(String? url) {
    final trimmed = url?.trim();
    _runtimeOverrideUrl =
        (trimmed == null || trimmed.isEmpty) ? null : trimmed;
  }

  /// Effective runtime API base URL taking Web, desktop, Android emulator and overrides into account.
  static String get effectiveBaseUrl {
    if (_runtimeOverrideUrl != null && _runtimeOverrideUrl!.isNotEmpty) {
      return _runtimeOverrideUrl!;
    }
    const envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }
    if (kIsWeb ||
        defaultTargetPlatform == TargetPlatform.windows ||
        defaultTargetPlatform == TargetPlatform.linux ||
        defaultTargetPlatform == TargetPlatform.macOS) {
      return 'http://localhost:5000/api/v1';
    }
    return apiBaseUrl;
  }

  /// Application environment identifier (development, staging, production).
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );

  /// Application display name.
  static const String appName = 'SkillBridge AI';

  /// Whether the app is running in production mode.
  static bool get isProduction => environment == 'production';

  /// Default HTTP network timeout duration.
  static const Duration timeout = Duration(seconds: 15);
}
