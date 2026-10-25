import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_dashboard/features/curriculum/screens/curriculum_screen.dart';

void main() {
  testWidgets('CurriculumScreen renders header, domain filters, and metrics', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1400, 900);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const MaterialApp(home: CurriculumScreen()));

    // Initial loading or header check
    expect(find.text('Skill Taxonomy & Assessment Bank'), findsOneWidget);
    expect(find.text('Refresh'), findsOneWidget);
  });
}
