import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_dashboard/features/knowledge/screens/knowledge_management_screen.dart';

void main() {
  testWidgets(
    'KnowledgeManagementScreen renders sidebar navigation and loading state',
    (tester) async {
      tester.view.physicalSize = const Size(1400, 900);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(
        const MaterialApp(home: KnowledgeManagementScreen()),
      );

      // Verify AdminScaffold sidebar has Knowledge RAG navigation item
      expect(find.text('AI & Knowledge RAG'), findsOneWidget);
      // Initial async network fetch shows loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    },
  );
}
