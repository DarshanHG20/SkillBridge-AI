import 'package:flutter/material.dart';

import 'admin_colors.dart';

/// Web Admin Console theme.
class AdminTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AdminColors.background,
      colorScheme: const ColorScheme.light(
        primary: AdminColors.primary,
        surface: AdminColors.surface,
        onSurface: AdminColors.textPrimary,
        error: AdminColors.danger,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AdminColors.surface,
        foregroundColor: AdminColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        shape: Border(bottom: BorderSide(color: AdminColors.border, width: 1)),
      ),
      cardTheme: CardThemeData(
        color: AdminColors.surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: AdminColors.border, width: 1),
        ),
      ),
      dataTableTheme: DataTableThemeData(
        headingRowColor: WidgetStateProperty.all(AdminColors.background),
        headingTextStyle: const TextStyle(
          color: AdminColors.textSecondary,
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
        dataTextStyle: const TextStyle(
          color: AdminColors.textPrimary,
          fontSize: 13,
        ),
      ),
    );
  }
}
