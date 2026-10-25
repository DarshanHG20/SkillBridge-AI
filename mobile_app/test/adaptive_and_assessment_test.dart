import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/features/assessments/screens/assessment_result_screen.dart';
import 'package:mobile_app/shared/widgets/status_badge.dart';

void main() {
  testWidgets('AssessmentResultScreen renders score, status, and questions', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final mockResult = {
      'attempt_id': 12,
      'assessment_id': 3,
      'assessment_title': 'Python Syntax Diagnostic',
      'score_achieved': 85.0,
      'is_passed': true,
      'total_points_earned': 17,
      'total_points_possible': 20,
      'adaptive_feedback': 'Excellent work! You mastered core Python syntax.',
      'question_results': [
        {
          'question_id': 1,
          'prompt': 'Which data type is immutable?',
          'options_json': ['List', 'Tuple', 'Set', 'Dict'],
          'learner_response_json': 'Tuple',
          'correct_answer_json': 'Tuple',
          'is_correct': true,
          'explanation': 'Tuples cannot be altered once created.',
          'points_earned': 10,
          'points_possible': 10,
        },
        {
          'question_id': 2,
          'prompt': 'What does range(3) yield?',
          'options_json': ['0, 1, 2', '1, 2, 3'],
          'learner_response_json': '1, 2, 3',
          'correct_answer_json': '0, 1, 2',
          'is_correct': false,
          'explanation': 'range(3) starts at index 0 and ends before 3.',
          'points_earned': 0,
          'points_possible': 10,
        },
      ],
    };

    await tester.pumpWidget(
      MaterialApp(home: AssessmentResultScreen(result: mockResult)),
    );

    // Verify title and score indicator
    expect(find.text('Assessment Results'), findsOneWidget);
    expect(find.text('Python Syntax Diagnostic'), findsOneWidget);
    expect(find.text('85%'), findsOneWidget);
    expect(find.text('PASSED'), findsOneWidget);
    expect(find.text('Milestone Unlocked'), findsOneWidget);

    // Verify questions rendered
    expect(
      find.textContaining('Which data type is immutable?'),
      findsOneWidget,
    );
    expect(find.textContaining('What does range(3) yield?'), findsOneWidget);

    // Verify feedback
    expect(
      find.text('Excellent work! You mastered core Python syntax.'),
      findsOneWidget,
    );
  });

  testWidgets('StatusBadge renders correctly for locked and mastered states', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: Column(
            children: [
              StatusBadge(label: 'LOCKED', status: BadgeStatus.locked),
              StatusBadge(label: 'MASTERED', status: BadgeStatus.mastered),
            ],
          ),
        ),
      ),
    );

    expect(find.text('LOCKED'), findsOneWidget);
    expect(find.text('MASTERED'), findsOneWidget);
    expect(find.byIcon(Icons.lock), findsOneWidget);
    expect(find.byIcon(Icons.verified), findsOneWidget);
  });
}
