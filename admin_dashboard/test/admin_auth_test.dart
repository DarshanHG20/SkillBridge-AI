import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_dashboard/core/storage/admin_token_storage.dart';
import 'package:admin_dashboard/features/auth/screens/admin_login_screen.dart';

void main() {
  testWidgets('AdminLoginScreen renders credential inputs and action button', (
    WidgetTester tester,
  ) async {
    tester.view.physicalSize = const Size(1280, 800);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    await tester.pumpWidget(const MaterialApp(home: AdminLoginScreen()));

    expect(find.text('Administrative Console'), findsOneWidget);
    expect(find.text('Admin Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Access Admin Console'), findsOneWidget);
  });

  test('AdminTokenStorage saves and clears admin session correctly', () {
    final storage = AdminTokenStorage();
    expect(storage.isAuthenticated, isFalse);

    storage.saveSession(
      accessToken: 'test_access_token',
      refreshToken: 'test_refresh_token',
      adminUser: {'id': 1, 'email': 'admin@skillbridge.ai', 'role': 'admin'},
    );

    expect(storage.isAuthenticated, isTrue);
    expect(storage.accessToken, equals('test_access_token'));
    expect(storage.currentAdmin?['role'], equals('admin'));

    storage.clearSession();
    expect(storage.isAuthenticated, isFalse);
    expect(storage.accessToken, isNull);
  });
}
