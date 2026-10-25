import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:admin_dashboard/core/theme/admin_colors.dart';
import 'package:admin_dashboard/shared/widgets/stat_card.dart';

void main() {
  testWidgets('StatCard renders title, value, subtitle and icon correctly', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StatCard(
            title: 'Active Learners',
            value: '2,500',
            subtitle: '+12% this week',
            icon: Icons.people,
            iconColor: AdminColors.primary,
          ),
        ),
      ),
    );

    expect(find.text('Active Learners'), findsOneWidget);
    expect(find.text('2,500'), findsOneWidget);
    expect(find.text('+12% this week'), findsOneWidget);
    expect(find.byIcon(Icons.people), findsOneWidget);
  });
}
