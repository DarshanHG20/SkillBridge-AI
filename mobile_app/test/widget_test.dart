import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/shared/widgets/app_button.dart';
import 'package:mobile_app/shared/widgets/status_badge.dart';

void main() {
  testWidgets('AppButton renders label and responds to tap', (
    WidgetTester tester,
  ) async {
    bool tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppButton(
            label: 'Test Button',
            onPressed: () {
              tapped = true;
            },
          ),
        ),
      ),
    );

    expect(find.text('Test Button'), findsOneWidget);
    await tester.tap(find.text('Test Button'));
    expect(tapped, isTrue);
  });

  testWidgets('StatusBadge renders correct label and icon', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StatusBadge(label: 'Mastered', status: BadgeStatus.mastered),
        ),
      ),
    );

    expect(find.text('Mastered'), findsOneWidget);
    expect(find.byIcon(Icons.verified), findsOneWidget);
  });
}
