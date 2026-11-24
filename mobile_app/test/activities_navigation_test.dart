import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/routing/app_router.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/features/activities/screens/activities_screen.dart';

void main() {
  setUp(() {
    TokenStorage().resetForTesting();
  });

  tearDown(() {
    TokenStorage().resetForTesting();
  });

  group('ActivitiesScreen - Rendering, Empty/Loading States & Navigation', () {
    testWidgets('Renders recommended activity and completed assessments', (
      WidgetTester tester,
    ) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });
      final mockNextActivity = {
        'target_skill_title': 'Python Async IO',
        'target_skill_id': 1,
        'recommendation_type': 'assessment',
        'reason': 'Build concurrency foundational mastery.',
      };

      final mockHistory = [
        {
          'id': 10,
          'assessment_id': 1,
          'title': 'Core Python Diagnostic',
          'assessment_type': 'diagnostic',
          'score_achieved': 90.0,
          'is_passed': true,
        },
        {
          'id': 11,
          'assessment_id': 2,
          'title': 'SQL Querying Formative',
          'assessment_type': 'formative',
          'score_achieved': 55.0,
          'is_passed': false,
        },
      ];

      final mockCoding = [
        {
          'id': 5,
          'problem_title': 'Two Sum Algorithm',
          'passed_test_cases': 3,
          'total_test_cases': 3,
          'status': 'all_passed',
        },
      ];

      final client = MockClient((request) async {
        if (request.url.path.endsWith('/adaptive/next-activity')) {
          return http.Response(jsonEncode(mockNextActivity), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path.endsWith('/assessments/my-history')) {
          return http.Response(jsonEncode(mockHistory), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path.endsWith('/coding/my-submissions')) {
          return http.Response(jsonEncode(mockCoding), 200, headers: {'content-type': 'application/json'});
        }
        if (request.url.path.endsWith('/assessments')) {
          return http.Response(jsonEncode([]), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response('Not Found', 404);
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: ActivitiesScreen(apiClient: apiClient),
        ),
      );

      // Loading state
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle();

      // Recommended activity
      expect(find.text('Python Async IO'), findsOneWidget);
      expect(find.text('Start Recommended Assessment'), findsOneWidget);

      // Assessments
      expect(find.text('Core Python Diagnostic'), findsOneWidget);
      expect(find.text('PASSED • 90%'), findsOneWidget);
      expect(find.text('SQL Querying Formative'), findsOneWidget);
      expect(find.text('NEEDS REVISION • 55%'), findsOneWidget);

      // Coding Submissions
      expect(find.text('Two Sum Algorithm'), findsOneWidget);
      expect(find.text('Passed'), findsOneWidget);
    });

    testWidgets('Renders empty state when learner has no history', (
      WidgetTester tester,
    ) async {
      final client = MockClient((request) async {
        if (request.url.path.endsWith('/adaptive/next-activity')) {
          return http.Response(jsonEncode({}), 200, headers: {'content-type': 'application/json'});
        }
        return http.Response(jsonEncode([]), 200, headers: {'content-type': 'application/json'});
      });

      final apiClient = ApiClient(client: client, baseUrl: 'http://test.local/api/v1');

      await tester.pumpWidget(
        MaterialApp(
          home: ActivitiesScreen(apiClient: apiClient),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No Learning Activities Yet'), findsOneWidget);
      expect(
        find.text('Complete your first diagnostic assessment or practice problem to populate your activity log.'),
        findsOneWidget,
      );
    });

    testWidgets('AppRouter generates valid route for AppRouter.activities', (
      WidgetTester tester,
    ) async {
      final route = AppRouter.onGenerateRoute(
        const RouteSettings(name: AppRouter.activities),
      ) as MaterialPageRoute;

      await tester.pumpWidget(
        MaterialApp(
          home: Builder(builder: (context) => route.builder(context)),
        ),
      );

      expect(find.text('Learning Activities'), findsOneWidget);
    });
  });
}
