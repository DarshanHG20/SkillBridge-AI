import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/features/settings/screens/settings_screen.dart';

void main() {
  testWidgets(
    'SettingsScreen renders account, network diagnostics, and feedback submission card',
    (tester) async {
      await tester.pumpWidget(const MaterialApp(home: SettingsScreen()));

      expect(find.text('Settings & Configuration'), findsOneWidget);
      expect(find.text('Account Information'), findsOneWidget);
      expect(find.text('Feedback & Bug Reporting'), findsOneWidget);
      expect(find.text('Submit Feedback'), findsOneWidget);
      expect(find.text('Test Server Connectivity'), findsOneWidget);
    },
  );
}
