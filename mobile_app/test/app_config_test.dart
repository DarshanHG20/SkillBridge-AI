import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/core/config/app_config.dart';

void main() {
  group('AppConfig Unit Tests', () {
    test('AppConfig has sensible defaults for development', () {
      expect(AppConfig.appName, equals('SkillBridge AI'));
      expect(AppConfig.environment, isNotEmpty);
      expect(AppConfig.apiBaseUrl, isNotEmpty);
      expect(AppConfig.timeout.inSeconds, equals(15));
    });
  });
}
