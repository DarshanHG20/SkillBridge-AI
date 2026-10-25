import 'package:flutter/material.dart';

enum AppButtonVariant { primary, secondary, outline }

/// Reusable interactive button supporting loading spinners, variants, and icons.
class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final AppButtonVariant variant;
  final IconData? icon;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isLoading = false,
    this.variant = AppButtonVariant.primary,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return SizedBox(
        height: 48,
        child: Center(
          child: SizedBox(
            height: 24,
            width: 24,
            child: CircularProgressIndicator(
              strokeWidth: 2.5,
              color: variant == AppButtonVariant.outline
                  ? Theme.of(context).colorScheme.primary
                  : Colors.white,
            ),
          ),
        ),
      );
    }

    final child = icon != null
        ? Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 20),
              const SizedBox(width: 8),
              Text(label),
            ],
          )
        : Text(label);

    switch (variant) {
      case AppButtonVariant.primary:
        return ElevatedButton(onPressed: onPressed, child: child);
      case AppButtonVariant.secondary:
        return FilledButton.tonal(
          onPressed: onPressed,
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: child,
        );
      case AppButtonVariant.outline:
        return OutlinedButton(onPressed: onPressed, child: child);
    }
  }
}
