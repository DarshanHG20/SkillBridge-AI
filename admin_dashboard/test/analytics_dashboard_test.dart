import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_dashboard/features/analytics/screens/analytics_dashboard_screen.dart';
import 'package:admin_dashboard/features/feedback/screens/feedback_review_screen.dart';

void main() {
  testWidgets(
    'AnalyticsDashboardScreen renders scaffold and loading indicator',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const MaterialApp(home: AnalyticsDashboardScreen()),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    },
  );

  testWidgets('FeedbackReviewScreen renders header and filter chips', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const MaterialApp(home: FeedbackReviewScreen()));

    expect(find.text('Learner Feedback & Issues'), findsOneWidget);
    expect(find.text('All Categories'), findsOneWidget);
    expect(find.text('Bug Reports'), findsOneWidget);
  });
}
