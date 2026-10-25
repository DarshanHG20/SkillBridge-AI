import 'package:flutter/material.dart';

import 'core/config/admin_config.dart';
import 'core/routing/admin_router.dart';
import 'core/theme/admin_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SkillBridgeAdminApp());
}

/// Root widget of the SkillBridge AI Admin Console Web App.
class SkillBridgeAdminApp extends StatelessWidget {
  const SkillBridgeAdminApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: AdminConfig.appTitle,
      debugShowCheckedModeBanner: false,
      theme: AdminTheme.lightTheme,
      initialRoute: AdminRouter.dashboard,
      onGenerateRoute: AdminRouter.onGenerateRoute,
    );
  }
}
