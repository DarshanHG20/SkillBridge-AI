import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

enum BadgeStatus { unlocked, inProgress, mastered, locked, online, offline }

/// Reusable status badge with icon and calibrated colors for mastery & connectivity.
class StatusBadge extends StatelessWidget {
  final String label;
  final BadgeStatus status;

  const StatusBadge({super.key, required this.label, required this.status});

  @override
  Widget build(BuildContext context) {
    final (Color bg, Color fg, IconData icon) = switch (status) {
      BadgeStatus.mastered => (
        AppColors.success.withValues(alpha: 0.15),
        AppColors.success,
        Icons.verified,
      ),
      BadgeStatus.inProgress => (
        AppColors.warning.withValues(alpha: 0.15),
        AppColors.warning,
        Icons.trending_up,
      ),
      BadgeStatus.unlocked => (
        AppColors.info.withValues(alpha: 0.15),
        AppColors.info,
        Icons.lock_open,
      ),
      BadgeStatus.locked => (
        AppColors.masteryLocked.withValues(alpha: 0.15),
        AppColors.masteryLocked,
        Icons.lock,
      ),
      BadgeStatus.online => (
        AppColors.success.withValues(alpha: 0.15),
        AppColors.success,
        Icons.wifi,
      ),
      BadgeStatus.offline => (
        AppColors.error.withValues(alpha: 0.15),
        AppColors.error,
        Icons.wifi_off,
      ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              color: fg,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
