import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/routing/app_router.dart';
import 'package:mobile_app/core/storage/token_storage.dart';

void main() {
  setUp(() {
    TokenStorage().resetForTesting();
  });

  tearDown(() {
    TokenStorage().resetForTesting();
  });

  group('Authentication, Token Storage & Router Diagnostics', () {
    test('TokenStorage saves, persists, updates, and clears session correctly', () {
      final storage = TokenStorage();

      expect(storage.isAuthenticated, isFalse);
      expect(storage.accessToken, isNull);

      storage.saveSession(
        accessToken: 'mock_access_token_123',
        refreshToken: 'mock_refresh_token_456',
        user: {
          'id': 1,
          'email': 'test@skillbridge.ai',
          'full_name': 'Test User',
        },
      );

      expect(storage.isAuthenticated, isTrue);
      expect(storage.accessToken, equals('mock_access_token_123'));
      expect(storage.currentUser?['full_name'], equals('Test User'));

      // Update user
      storage.updateUser({
        'id': 1,
        'email': 'test@skillbridge.ai',
        'full_name': 'Updated User Name',
      });
      expect(storage.currentUser?['full_name'], equals('Updated User Name'));

      // Clear session
      storage.clearSession();
      expect(storage.isAuthenticated, isFalse);
      expect(storage.accessToken, isNull);
      expect(storage.currentUser, isNull);
    });

    test('ApiClient.login saves session on success', () async {
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({
            'access_token': 'jwt_access_abc',
            'refresh_token': 'jwt_refresh_xyz',
            'user': {'id': 5, 'email': 'student@skillbridge.ai', 'full_name': 'Student'},
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');
      await apiClient.login('student@skillbridge.ai', 'Password123');

      final storage = TokenStorage();
      expect(storage.isAuthenticated, isTrue);
      expect(storage.accessToken, equals('jwt_access_abc'));
      expect(storage.currentUser?['email'], equals('student@skillbridge.ai'));
    });

    test('ApiClient throws ApiException on login failure and does not save token', () async {
      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({'detail': 'Invalid email or password.'}),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      expect(
        () async => await apiClient.login('bad@skillbridge.ai', 'wrong'),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Invalid email or password.')),
      );

      final storage = TokenStorage();
      expect(storage.isAuthenticated, isFalse);
    });

    test('ApiClient clears session on 401 Unauthorized API response', () async {
      final storage = TokenStorage();
      storage.saveSession(
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        user: {'id': 2, 'email': 'user@example.com'},
      );
      expect(storage.isAuthenticated, isTrue);

      final client = MockClient((request) async {
        return http.Response(
          jsonEncode({'detail': 'Authentication token has expired. Please log in again.'}),
          401,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      try {
        await apiClient.getProfile();
      } catch (_) {}

      // Session must be cleared on 401
      expect(storage.isAuthenticated, isFalse);
      expect(storage.accessToken, isNull);
    });

    testWidgets('AppRouter renders Page Not Found for unknown routes', (
      WidgetTester tester,
    ) async {
      final route = AppRouter.onGenerateRoute(
        const RouteSettings(name: '/some-non-existent-route'),
      ) as MaterialPageRoute;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(builder: (context) => route.builder(context)),
        ),
      );

      expect(find.text('Page Not Found'), findsOneWidget);
      expect(find.text('No route defined for /some-non-existent-route'), findsOneWidget);
    });
  });
}
