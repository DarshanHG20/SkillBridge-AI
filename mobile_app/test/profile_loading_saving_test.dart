import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/features/profile/screens/student_profile_screen.dart';

void main() {
  setUp(() {
    TokenStorage().resetForTesting();
  });

  tearDown(() {
    TokenStorage().resetForTesting();
  });

  group('StudentProfileScreen - Data Loading, Saving & Null Safety', () {
    testWidgets('Loads latest profile from backend and populates all fields', (
      WidgetTester tester,
    ) async {
      final mockData = {
        'id': 101,
        'email': 'student@skillbridge.ai',
        'full_name': 'Alex Johnson',
        'role': 'student',
        'profile': {
          'headline': 'AI Engineer Enthusiast',
          'bio': 'Passionate about deep learning & algorithms.',
          'target_role': 'Machine Learning Specialist',
          'target_hours_per_week': 25,
          'preferred_learning_style': 'interactive',
        },
      };

      final client = MockClient((request) async {
        if (request.url.path.endsWith('/users/me')) {
          return http.Response(jsonEncode(mockData), 200, headers: {
            'content-type': 'application/json',
          });
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: StudentProfileScreen(apiClient: apiClient),
        ),
      );

      // Initial loading
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();

      // Check populated fields
      expect(find.text('Alex Johnson'), findsOneWidget);
      expect(find.text('AI Engineer Enthusiast'), findsOneWidget);
      expect(find.text('Machine Learning Specialist'), findsOneWidget);
      expect(find.text('25'), findsOneWidget);
      expect(find.text('Passionate about deep learning & algorithms.'), findsOneWidget);
      expect(find.text('Interactive Code & Quizzes'), findsOneWidget);
    });

    testWidgets('Handles hands_on and unknown learning styles without crashing', (
      WidgetTester tester,
    ) async {
      // 'hands_on' is in the database seed, testing here ensures zero dropdown assertion crash
      final mockData = {
        'id': 102,
        'email': 'handson@skillbridge.ai',
        'full_name': 'Hands-On Learner',
        'profile': {
          'headline': 'Full Stack Developer',
          'bio': 'Learning by building real applications.',
          'target_role': 'Software Engineer',
          'target_hours_per_week': 15,
          'preferred_learning_style': 'hands_on',
        },
      };

      final client = MockClient((request) async {
        return http.Response(jsonEncode(mockData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: StudentProfileScreen(apiClient: apiClient),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Hands-on Projects & Practice'), findsOneWidget);
    });

    testWidgets('Handles null and missing profile fields safely without crashing', (
      WidgetTester tester,
    ) async {
      final mockData = {
        'id': 103,
        'email': 'minimal@skillbridge.ai',
        'full_name': 'Minimal User',
        'profile': null, // Missing profile object entirely
      };

      final client = MockClient((request) async {
        return http.Response(jsonEncode(mockData), 200, headers: {
          'content-type': 'application/json',
        });
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: StudentProfileScreen(apiClient: apiClient),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Minimal User'), findsOneWidget);
      expect(find.text('Edit Student Profile'), findsOneWidget);
      expect(find.text('Visual & Diagrams'), findsOneWidget); // Default fallback
    });

    testWidgets('Shows error state with retry button when backend fails', (
      WidgetTester tester,
    ) async {
      var callCount = 0;
      final client = MockClient((request) async {
        callCount++;
        if (callCount == 1) {
          return http.Response('Internal Server Error', 500);
        }
        return http.Response(
          jsonEncode({
            'full_name': 'Retried User',
            'profile': {
              'headline': 'Recovered Profile',
              'target_role': 'DevOps Engineer',
              'target_hours_per_week': 10,
              'preferred_learning_style': 'visual',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: StudentProfileScreen(apiClient: apiClient),
        ),
      );

      await tester.pumpAndSettle();

      // Error state displayed
      expect(find.textContaining('Unable to load profile'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      // Tap Retry
      await tester.tap(find.text('Retry'));
      await tester.pumpAndSettle();

      // Profile recovered
      expect(find.text('Retried User'), findsOneWidget);
      expect(find.text('Recovered Profile'), findsOneWidget);
    });

    testWidgets('Saves updated profile data successfully and prevents duplicate submission', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      var putAccountCalls = 0;
      var putProfileCalls = 0;

      final client = MockClient((request) async {
        if (request.method == 'GET' && request.url.path.endsWith('/users/me')) {
          return http.Response(
            jsonEncode({
              'full_name': 'Original Name',
              'profile': {
                'headline': 'Original Headline',
                'target_role': 'Frontend Developer',
                'target_hours_per_week': 12,
                'preferred_learning_style': 'reading',
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.method == 'PUT' && request.url.path.endsWith('/users/me')) {
          putAccountCalls++;
          return http.Response(
            jsonEncode({'full_name': 'Updated Name'}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.method == 'PUT' && request.url.path.endsWith('/users/me/profile')) {
          putProfileCalls++;
          return http.Response(
            jsonEncode({
              'headline': 'Updated Headline',
              'target_role': 'Frontend Developer',
              'target_hours_per_week': 12,
              'preferred_learning_style': 'reading',
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: StudentProfileScreen(apiClient: apiClient),
        ),
      );

      await tester.pumpAndSettle();

      // Change name
      final nameField = find.widgetWithText(TextFormField, 'Original Name');
      await tester.enterText(nameField, 'Updated Name');

      // Click Save Changes
      final saveBtn = find.text('Save Changes');
      await tester.ensureVisible(saveBtn);
      await tester.tap(saveBtn);
      await tester.pump();

      // Rapidly tap again to test duplicate submission prevention
      await tester.tap(saveBtn, warnIfMissed: false);
      await tester.pumpAndSettle();

      expect(putAccountCalls, equals(1));
      expect(putProfileCalls, equals(1));
    });
  });
}
