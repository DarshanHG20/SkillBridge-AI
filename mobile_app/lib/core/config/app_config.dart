/// Centralized application runtime and compile-time configuration.
class AppConfig {
  /// Base API URL. Injected via `--dart-define=API_BASE_URL=https://...`
  /// Defaults to Android emulator localhost `http://10.0.2.2:8000/api/v1` or local dev.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.38.24.182:8000/api/v1',
  );

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
