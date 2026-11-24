import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile_app/core/network/api_client.dart';
import 'package:mobile_app/core/storage/token_storage.dart';
import 'package:mobile_app/features/adaptive/screens/adaptive_home_tab.dart';
import 'package:mobile_app/features/assessments/screens/assessment_quiz_screen.dart';
import 'package:mobile_app/features/courses/screens/course_catalog_tab.dart';

void main() {
  setUp(() {
    TokenStorage().saveSession(
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      user: {
        'id': 2,
        'email': 'learner@skillbridge.ai',
        'full_name': 'Test Learner',
        'role': 'student',
      },
    );
  });

  tearDown(() {
    TokenStorage().clearSession();
  });

  testWidgets(
    'AssessmentQuizScreen displays options from backend options key, tracks selection, and submits to AssessmentResultScreen',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      int submitCount = 0;
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/assessments/1/start')) {
          return http.Response(
            jsonEncode({
              'attempt_id': 99,
              'assessment_id': 1,
              'title': 'Python Syntax Diagnostic',
              'questions': [
                {
                  'id': 1,
                  'prompt': 'Which keyword defines a function in Python?',
                  'options': ['func', 'def', 'function', 'fn'],
                  'difficulty': 'easy',
                  'points': 10,
                },
              ],
            }),
            200,
          );
        }
        if (request.url.path.endsWith('/assessments/attempts/99/submit')) {
          submitCount++;
          return http.Response(
            jsonEncode({
              'attempt_id': 99,
              'assessment_id': 1,
              'assessment_title': 'Python Syntax Diagnostic',
              'score_achieved': 100.0,
              'is_passed': true,
              'correct_count': 1,
              'incorrect_count': 0,
              'total_questions': 1,
              'total_points_earned': 10,
              'total_points_possible': 10,
              'adaptive_feedback': 'Great job!',
              'question_results': [
                {
                  'question_id': 1,
                  'prompt': 'Which keyword defines a function in Python?',
                  'learner_response_json': 'def',
                  'correct_answer_json': 'def',
                  'is_correct': true,
                  'explanation': 'Python uses def.',
                  'points_earned': 10,
                },
              ],
            }),
            200,
          );
        }
        return http.Response('{}', 200);
      });

      final client = ApiClient(
        client: mockHttp,
        baseUrl: 'http://test.local/api/v1',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: AssessmentQuizScreen(
            assessmentId: 1,
            title: 'Python Syntax Diagnostic',
            apiClient: client,
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify all 4 options are rendered clearly
      expect(find.text('Which keyword defines a function in Python?'), findsOneWidget);
      expect(find.text('func'), findsOneWidget);
      expect(find.text('def'), findsOneWidget);
      expect(find.text('function'), findsOneWidget);
      expect(find.text('fn'), findsOneWidget);

      // Select 'def' and verify selected indicator
      await tester.tap(find.text('def'));
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      expect(find.textContaining('1 answered'), findsOneWidget);

      // Submit quiz & verify result screen displays score & counts
      await tester.tap(find.text('Submit Assessment'));
      await tester.pumpAndSettle();
      expect(find.text('Submit & Grade'), findsOneWidget);

      await tester.tap(find.text('Submit & Grade'));
      await tester.pumpAndSettle();

      expect(submitCount, equals(1));
      expect(find.text('Assessment Results'), findsOneWidget);
      expect(find.text('100%'), findsOneWidget);
      expect(find.text('Correct: 1'), findsOneWidget);
      expect(find.text('Incorrect: 0'), findsOneWidget);
    },
  );

  testWidgets(
    'CourseCatalogTab shows unlocked courses, navigates to CourseDetailScreen & LessonDetailScreen and completes lesson',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      bool lessonDone = false;
      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/courses')) {
          return http.Response(
            jsonEncode([
              {
                'id': 1,
                'slug': 'python-programming',
                'title': 'Python Programming',
                'subtitle': 'Syntax and functions',
                'category': 'Python',
                'difficulty_level': 'beginner',
                'modules_count': 1,
                'total_lessons_count': 2,
                'completed_lessons_count': lessonDone ? 1 : 0,
                'completion_percentage': lessonDone ? 50 : 0,
                'quiz_question_count': 5,
                'is_unlocked': true,
                'is_locked': false,
                'is_enrolled': true,
                'status': lessonDone ? 'in_progress' : 'unlocked',
              },
            ]),
            200,
          );
        }
        if (request.url.path.endsWith('/courses/1')) {
          return http.Response(
            jsonEncode({
              'id': 1,
              'slug': 'python-programming',
              'title': 'Python Programming',
              'subtitle': 'Syntax and functions',
              'description': 'Full Python guide.',
              'category': 'Python',
              'difficulty_level': 'beginner',
              'is_unlocked': true,
              'is_locked': false,
              'is_enrolled': true,
              'status': 'in_progress',
              'completion_percentage': lessonDone ? 50 : 0,
              'completed_lessons_count': lessonDone ? 1 : 0,
              'total_lessons_count': 2,
              'assessment_id': 1,
              'assessment': {'id': 1, 'title': 'Python Quiz', 'question_count': 5},
              'modules': [
                {
                  'module_id': 'py-mod-1',
                  'title': 'Module 1: Core Syntax',
                  'lessons_count': 2,
                  'completed_lessons_count': lessonDone ? 1 : 0,
                  'lessons': [
                    {
                      'lesson_id': 'py-l1',
                      'title': 'Functions & Scope',
                      'duration_minutes': 15,
                      'content': 'Functions use the def keyword.',
                      'code_example': 'def hi(): return 1',
                      'key_takeaways': ['Use def'],
                      'is_completed': lessonDone,
                    },
                  ],
                },
              ],
            }),
            200,
          );
        }
        if (request.url.path.endsWith('/courses/1/lessons/py-l1/complete')) {
          lessonDone = true;
          return http.Response(
            jsonEncode({
              'course_id': 1,
              'lesson_id': 'py-l1',
              'completed': true,
              'completion_percentage': 50,
            }),
            200,
          );
        }
        return http.Response('{}', 200);
      });

      final client = ApiClient(
        client: mockHttp,
        baseUrl: 'http://test.local/api/v1',
      );

      await tester.pumpWidget(
        MaterialApp(home: Scaffold(body: CourseCatalogTab(apiClient: client))),
      );
      await tester.pumpAndSettle();

      // Verify course visible and not locked
      expect(find.text('Python Programming'), findsOneWidget);
      expect(find.text('LOCKED'), findsNothing);

      // Tap course card -> CourseDetailScreen
      await tester.tap(find.text('Python Programming'));
      await tester.pumpAndSettle();
      expect(find.text('Module 1: Core Syntax'), findsOneWidget);
      expect(find.text('Functions & Scope'), findsOneWidget);

      // Tap lesson -> LessonDetailScreen
      await tester.tap(find.text('Functions & Scope'));
      await tester.pumpAndSettle();
      expect(find.text('Functions use the def keyword.'), findsOneWidget);

      // Complete lesson
      await tester.tap(find.text('Mark Lesson Completed'));
      await tester.pumpAndSettle();
      expect(lessonDone, isTrue);
      expect(find.text('Completed (Tap to Undo)'), findsOneWidget);
    },
  );

  testWidgets(
    'AdaptiveHomeTab displays course, quiz, streak & activity dashboard metrics and handles empty states',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2200);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      final mockHttp = MockClient((request) async {
        if (request.url.path.endsWith('/adaptive/overview')) {
          return http.Response(
            jsonEncode({
              'total_skills': 27,
              'mastered_count': 2,
              'in_progress_count': 1,
              'weak_concepts_count': 0,
              'average_mastery': 0.72,
              'total_courses': 5,
              'available_courses': 5,
              'enrolled_courses_count': 2,
              'completed_courses_count': 1,
              'in_progress_courses_count': 1,
              'overall_learning_progress': 75,
              'total_quizzes_attempted': 3,
              'average_quiz_score': 82.5,
              'learning_streak_days': 4,
              'mastered_skills': [
                {'skill_id': 1, 'title': 'Python Basics', 'mastery_score': 0.9},
              ],
              'course_progress_summary': [
                {
                  'course_id': 1,
                  'title': 'Python Programming',
                  'category': 'Python',
                  'completion_percentage': 50,
                  'completed_lessons_count': 2,
                  'total_lessons_count': 4,
                },
              ],
              'recent_quiz_results': [
                {
                  'attempt_id': 11,
                  'assessment_id': 1,
                  'title': 'Python Syntax Diagnostic',
                  'score_achieved': 80,
                  'is_passed': true,
                },
              ],
              'recent_activities': [
                {
                  'activity_type': 'lesson_completed',
                  'metadata_json': {'lesson_title': 'Functions & Scope'},
                },
              ],
            }),
            200,
          );
        }
        if (request.url.path.endsWith('/adaptive/next-activity')) {
          return http.Response(
            jsonEncode({
              'recommendation_type': 'new_skill',
              'target_entity_id': 2,
              'title': 'Java Programming & OOP',
              'rationale': 'Ready for Java OOP foundations.',
              'difficulty': 'beginner',
            }),
            200,
          );
        }
        if (request.url.path.endsWith('/adaptive/weak-concepts') ||
            request.url.path.endsWith('/assessments')) {
          return http.Response('[]', 200);
        }
        return http.Response('{}', 200);
      });

      final client = ApiClient(
        client: mockHttp,
        baseUrl: 'http://test.local/api/v1',
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: AdaptiveHomeTab(
              onNavigateToCourses: () {},
              onNavigateToSkills: () {},
              onNavigateToCareers: () {},
              apiClient: client,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Welcome back, Test Learner'), findsOneWidget);
      expect(find.text('4 days'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('2 / 5'), findsOneWidget);
      expect(find.text('82.5%'), findsOneWidget);
      expect(find.text('Python Programming'), findsOneWidget);
      expect(find.text('Python Syntax Diagnostic'), findsOneWidget);
      expect(find.text('Functions & Scope'), findsOneWidget);
    },
  );
}

