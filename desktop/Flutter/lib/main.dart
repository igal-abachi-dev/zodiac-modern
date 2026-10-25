import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

import 'domain.dart';

const ink = Color(0xff171a18), muted = Color(0xff5d6660);
const line = Color(0xffdce3de), surface = Color(0xfff1f4f2);
const emerald = Color(0xff047857), canvas = Color(0xfff8faf9);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  for (final entry in {
    'Inter': [
      'inter-latin-400-normal.ttf',
      'inter-latin-500-normal.ttf',
      'inter-latin-600-normal.ttf',
    ],
    'Noto Sans Hebrew': ['noto-sans-hebrew-hebrew-400-normal.ttf'],
  }.entries) {
    final loader = FontLoader(entry.key);
    for (final file in entry.value) {
      loader.addFont(rootBundle.load('assets/fonts/$file'));
    }
    await loader.load();
  }
  // Decode the local icons before publishing UI readiness, too.
  for (final name in [
    'orbit',
    'shield-check',
    'lock-keyhole',
    'unlock-keyhole',
  ]) {
    await SvgAssetLoader('assets/icons/$name.svg').loadBytes(null);
  }
  runApp(const BenchApp());
}

class BenchApp extends StatelessWidget {
  const BenchApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'NeutronStar GUI Bench',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      fontFamily: 'Inter',
      fontFamilyFallback: const ['Noto Sans Hebrew', 'Segoe UI Emoji'],
      scaffoldBackgroundColor: canvas,
      colorScheme: ColorScheme.fromSeed(
        seedColor: emerald,
        brightness: Brightness.light,
        primary: emerald,
        surface: Colors.white,
        onSurface: ink,
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: ink,
          side: const BorderSide(color: line),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
        ),
      ),
    ),
    home: const BenchScreen(),
  );
}

Widget icon(String name, [double size = 16]) => ExcludeSemantics(
  child: SvgPicture.asset('assets/icons/$name.svg', width: size, height: size),
);
Widget panel(Widget child) => Container(
  padding: const EdgeInsets.all(16),
  decoration: BoxDecoration(
    color: Colors.white,
    border: Border.all(color: line),
    borderRadius: BorderRadius.circular(8),
  ),
  child: child,
);
Widget label(
  String text, {
  double size = 14,
  Color color = ink,
  FontWeight? weight,
}) => Text(
  text,
  style: TextStyle(fontSize: size, color: color, fontWeight: weight),
);
Widget button(
  String name,
  VoidCallback? action, {
  String? id,
  FocusNode? focus,
  String? hint,
}) => Semantics(
  identifier: id ?? name,
  hint: hint,
  child: OutlinedButton(onPressed: action, focusNode: focus, child: Text(name)),
);

class BenchScreen extends StatefulWidget {
  const BenchScreen({super.key});
  @override
  State<BenchScreen> createState() => _BenchScreenState();
}

class _BenchScreenState extends State<BenchScreen> {
  final flow = Workflow();
  final scroll = ScrollController();
  final aboutFocus = FocusNode(), openFocus = FocusNode();
  final workbenchKey = GlobalKey();
  bool open = false, dialogOpen = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) flow.loaded();
    });
  }

  @override
  void dispose() {
    flow.dispose();
    scroll.dispose();
    aboutFocus.dispose();
    openFocus.dispose();
    super.dispose();
  }

  Future<void> about() async {
    if (dialogOpen) return;
    dialogOpen = true;
    await showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('About this test'),
        content: const Text(
          'Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are involved.',
        ),
        actions: [
          Semantics(
            identifier: 'about-close',
            child: TextButton(
              autofocus: true,
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ),
        ],
      ),
    );
    dialogOpen = false;
    if (mounted) aboutFocus.requestFocus();
  }

  void showWorkbench() {
    setState(() => open = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (workbenchKey.currentContext != null) {
        Scrollable.ensureVisible(
          workbenchKey.currentContext!,
          duration: Duration.zero,
        );
      }
    });
  }

  void back() {
    setState(() => open = false);
    scroll.jumpTo(0);
    openFocus.requestFocus();
  }

  Widget footer(bool narrow) {
    final openButton = button(
      'Open workbench',
      flow.ready && !flow.running ? showWorkbench : null,
      id: 'open-workbench',
      focus: openFocus,
    );
    final privacy = label(
      'Local interface. Synthetic data. Nothing is encrypted or decrypted.',
      size: 11,
    );
    final renderer = label('CONTROLLED RENDERER · LOCAL STATE', size: 9);
    return narrow
        ? Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              openButton,
              const SizedBox(height: 10),
              privacy,
              const SizedBox(height: 10),
              renderer,
            ],
          )
        : Row(
            children: [
              openButton,
              const SizedBox(width: 16),
              Expanded(child: privacy),
              const SizedBox(width: 16),
              SizedBox(width: 130, child: renderer),
            ],
          );
  }

  Widget operation(bool encrypt) {
    final name = encrypt ? 'Encrypt' : 'Decrypt';
    final text = encrypt ? 'Simulate encryption' : 'Simulate decryption';
    final action = flow.ready && !flow.running
        ? () => flow.start(encrypt ? 'encrypt' : 'decrypt')
        : null;
    return panel(
      Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              icon(encrypt ? 'lock-keyhole' : 'unlock-keyhole'),
              const SizedBox(width: 8),
              label(name, size: 16, weight: FontWeight.w600),
            ],
          ),
          const SizedBox(height: 20),
          label('SYNTHETIC INPUT', size: 10, color: muted),
          const SizedBox(height: 9),
          Container(
            constraints: const BoxConstraints(minHeight: 94),
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: surface,
              border: Border.all(color: line),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                label(encrypt ? fixture : 'Synthetic sample: starlight.nsx'),
                if (!encrypt) ...[
                  const SizedBox(height: 5),
                  label('No disk file is opened.', size: 12, color: muted),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),
          Semantics(
            identifier: encrypt ? 'encrypt' : 'decrypt',
            child: SizedBox(
              height: 40,
              child: encrypt
                  ? FilledButton(onPressed: action, child: Text(text))
                  : OutlinedButton(onPressed: action, child: Text(text)),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: ListenableBuilder(
      listenable: flow,
      builder: (context, _) => SingleChildScrollView(
        controller: scroll,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 1100),
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: LayoutBuilder(
                builder: (context, constraints) {
                  final narrow = constraints.maxWidth < 564;
                  final header = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          icon('orbit', 40),
                          const SizedBox(width: 12),
                          Expanded(
                            child: label(
                              'NeutronStar GUI Bench',
                              size: 24,
                              weight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      label(
                        'A UI-only simulation for comparing desktop frontends.',
                        color: muted,
                      ),
                    ],
                  );
                  final aboutButton = button(
                    'About this test',
                    about,
                    id: 'about-trigger',
                    focus: aboutFocus,
                  );
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (narrow) ...[
                        header,
                        const SizedBox(height: 12),
                        Align(
                          alignment: Alignment.centerLeft,
                          child: aboutButton,
                        ),
                      ] else
                        Row(
                          children: [
                            Expanded(child: header),
                            const SizedBox(width: 12),
                            aboutButton,
                          ],
                        ),
                      const SizedBox(height: 20),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 9,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: surface,
                            border: Border.all(color: line),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              icon('shield-check'),
                              const SizedBox(width: 7),
                              Flexible(
                                child: label(
                                  'SIMULATION · NO FILES OR CRYPTOGRAPHY.',
                                  size: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      if (narrow) ...[
                        operation(false),
                        const SizedBox(height: 20),
                        operation(true),
                      ] else
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(child: operation(false)),
                            const SizedBox(width: 20),
                            Expanded(child: operation(true)),
                          ],
                        ),
                      const SizedBox(height: 20),
                      panel(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Wrap(
                              spacing: 12,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                Semantics(
                                  identifier: 'status',
                                  liveRegion: true,
                                  child: label(flow.status),
                                ),
                                if (flow.running) button('Cancel', flow.cancel),
                                button('Reset', flow.ready ? flow.reset : null),
                              ],
                            ),
                            const SizedBox(height: 16),
                            LinearProgressIndicator(
                              value: flow.progress / 100,
                              minHeight: 6,
                              semanticsLabel: 'Simulation progress',
                              semanticsValue: '${flow.progress}%',
                            ),
                            const SizedBox(height: 12),
                            label(
                              'Simulation progress  ${flow.progress}%',
                              size: 11,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      footer(narrow),
                      if (open)
                        Padding(
                          key: workbenchKey,
                          padding: const EdgeInsets.only(top: 24),
                          child: Workbench(onBack: back),
                        ),
                    ],
                  );
                },
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class Workbench extends StatefulWidget {
  const Workbench({super.key, required this.onBack});
  final VoidCallback onBack;
  @override
  State<Workbench> createState() => _WorkbenchState();
}

class _WorkbenchState extends State<Workbench> {
  final model = Workload();
  final query = TextEditingController();
  @override
  void dispose() {
    model.dispose();
    query.dispose();
    super.dispose();
  }

  void replace(int n) {
    query.clear();
    model.replace(n);
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: model,
    builder: (context, _) {
      final rows = model.visible.toList();
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          label('List and filter workbench', size: 20, weight: FontWeight.w600),
          const SizedBox(height: 10),
          label(
            'Deterministic synthetic rows. No files, network, cryptography or native commands.',
            size: 12,
          ),
          const SizedBox(height: 16),
          Align(
            alignment: Alignment.centerLeft,
            child: button('Back to main screen', widget.onBack),
          ),
          const SizedBox(height: 16),
          label('Workbench ready'),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              button('1,000 rows', () => replace(1000)),
              button('10,000 rows', () => replace(10000)),
              button('Reverse', model.reverse),
              button('Splice 10', model.splice),
              button('Update 10%', model.update),
              for (final hz in [10, 30, 60])
                button('$hz Hz / 2 s', () => model.burst(hz)),
              button('Stop', model.stop, hint: model.active ? 'Updates active' : 'Updates stopped'),
              button('Remount workload', () {
                query.clear();
                model.remount();
              }),
            ],
          ),
          const SizedBox(height: 16),
          panel(
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Semantics(
                  identifier: 'workload-query',
                  child: TextField(
                    controller: query,
                    onChanged: model.filter,
                    decoration: const InputDecoration(
                      labelText: 'Filter synthetic rows',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Semantics(
                  identifier: 'workload-summary',
                  child: label('${rows.length} rows; tick ${model.tick}'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Deliberately materialize every row; virtualization is a separate workload.
          Semantics(
            identifier: 'workload-rows',
            container: true,
            label: 'Synthetic rows',
            explicitChildNodes: true,
            child: Column(
              children: [
                for (final row in rows)
                  Container(
                    key: ValueKey(row.id),
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border(bottom: BorderSide(color: line)),
                    ),
                    child: label('${row.label}: ${row.value}'),
                  ),
              ],
            ),
          ),
        ],
      );
    },
  );
}
