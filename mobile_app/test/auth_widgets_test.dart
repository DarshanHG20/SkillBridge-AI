import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_app/features/auth/screens/login_screen.dart';
import 'package:mobile_app/features/auth/screens/register_screen.dart';
import 'package:mobile_app/shared/widgets/app_text_field.dart';

void main() {
  testWidgets('AppTextField renders label, hint and toggles obscure text', (
    WidgetTester tester,
  ) async {
    final controller = TextEditingController();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: AppTextField(
            controller: controller,
            label: 'Test Password',
            hint: 'Enter secret',
            isPassword: true,
          ),
        ),
      ),
    );

    expect(find.text('Test Password'), findsOneWidget);
    expect(find.text('Enter secret'), findsOneWidget);
    expect(find.byIcon(Icons.visibility_off), findsOneWidget);

    // Tap visibility toggle
    await tester.tap(find.byIcon(Icons.visibility_off));
    await tester.pump();
    expect(find.byIcon(Icons.visibility), findsOneWidget);
  });

  testWidgets(
    'LoginScreen renders email and password fields and submit button',
    (WidgetTester tester) async {
      await tester.pumpWidget(const MaterialApp(home: LoginScreen()));

      expect(find.text('Welcome Back'), findsOneWidget);
      expect(find.text('Email Address'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
      expect(find.text('Forgot Password?'), findsOneWidget);
    },
  );

  testWidgets('RegisterScreen renders all student registration fields', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: RegisterScreen()));

    expect(find.text('Create Student Account'), findsOneWidget);
    expect(find.text('Full Name'), findsOneWidget);
    expect(find.text('Email Address'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Confirm Password'), findsOneWidget);
    expect(find.text('Create Account'), findsOneWidget);
  });
}
