/// Configuration settings for the Flutter Web Admin Console.
class AdminConfig {
  /// Base API URL for administrative endpoints.
  /// Defaults to `http://localhost:8000/api/v1` for local web development.
  static const String apiBaseUrl = String.fromEnvironment(
    'ADMIN_API_BASE_URL',
    defaultValue: 'http://localhost:8000/api/v1',
  );

  /// Web console title.
  static const String appTitle = 'SkillBridge AI - Admin Console';

  /// Environment tag.
  static const String environment = String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  );
}
