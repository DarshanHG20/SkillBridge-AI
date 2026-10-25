import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/features/chat/screens/ai_tutor_chat_screen.dart';
import 'package:mobile_app/features/rag/screens/document_library_screen.dart';
import 'package:mobile_app/features/coding/screens/coding_practice_screen.dart';

void main() {
  testWidgets('AiTutorChatScreen renders initial session loading state', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(
      const MaterialApp(
        home: AiTutorChatScreen(initialTopic: 'Python Fundamentals'),
      ),
    );

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets(
    'DocumentLibraryScreen renders search header and document catalog title',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(const MaterialApp(home: DocumentLibraryScreen()));

      expect(find.text('Knowledge Library & RAG'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    },
  );

  testWidgets(
    'CodingPracticeScreen renders problem selector and code sandbox title',
    (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(() {
        tester.view.resetPhysicalSize();
        tester.view.resetDevicePixelRatio();
      });

      await tester.pumpWidget(const MaterialApp(home: CodingPracticeScreen()));

      expect(find.text('Coding Practice Sandbox'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    },
  );
}
