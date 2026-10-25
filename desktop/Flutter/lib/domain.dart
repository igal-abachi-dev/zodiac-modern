import 'dart:async';

import 'package:flutter/foundation.dart';

const fixture = 'Zodiac GUI benchmark — שלום — 🌠';

/// UI-only elapsed-time simulation. No files or native commands.
class Workflow extends ChangeNotifier {
  bool ready = false;
  String phase = 'ready';
  String? operation;
  int progress = 0;
  Timer? _timer;
  int _generation = 0;
  final Stopwatch _clock = Stopwatch();
  String get status => !ready
      ? 'Loading local interface…'
      : switch (phase) {
          'running' =>
            'Simulating ${operation == 'encrypt' ? 'encryption' : 'decryption'}…',
          'success' => 'Simulation complete. No file was changed.',
          'canceled' => 'Simulation canceled.',
          _ => 'Ready',
        };
  bool get running => phase == 'running';
  void loaded() {
    ready = true;
    notifyListeners();
  }

  void start(String op) {
    if (!ready || running) return;
    stop();
    operation = op;
    phase = 'running';
    progress = 0;
    final generation = _generation;
    _clock
      ..reset()
      ..start();
    _timer = Timer.periodic(const Duration(milliseconds: 100), (_) {
      advance(generation, _clock.elapsedMilliseconds);
    });
    notifyListeners();
  }

  @visibleForTesting
  void advance(int generation, int elapsed) {
    if (generation != _generation || !running) return;
    progress = (elapsed ~/ 20).clamp(progress, 100);
    if (elapsed >= 2000) {
      phase = 'success';
      stop();
    }
    notifyListeners();
  }

  @visibleForTesting
  int get generation => _generation;
  void stop() {
    _generation++;
    _timer?.cancel();
    _timer = null;
    _clock.stop();
  }

  void cancel() {
    if (!running) return;
    stop();
    phase = 'canceled';
    notifyListeners();
  }

  void reset() {
    stop();
    phase = 'ready';
    operation = null;
    progress = 0;
    notifyListeners();
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}

@immutable
class BenchRow {
  const BenchRow(this.id, [this.value = 0]);
  final int id;
  final int value;
  String get label => 'row-$id שלום';
}

class Workload extends ChangeNotifier {
  bool active = false;
  List<BenchRow> rows = const [];
  int next = 0, tick = 0;
  String query = '';
  Timer? _timer;
  int _generation = 0;
  final Stopwatch _clock = Stopwatch();
  Workload() {
    replace(1000);
  }
  Iterable<BenchRow> get visible => rows.where((r) => r.label.contains(query));
  void replace(int count) {
    if (count < 0 || count > 10000) throw RangeError.range(count, 0, 10000);
    _stop();
    rows = List.generate(count, (i) => BenchRow(next + i));
    next += count;
    tick = 0;
    query = '';
    notifyListeners();
  }

  void reverse() {
    rows = rows.reversed.toList();
    notifyListeners();
  }

  void splice() {
    rows = [...List.generate(10, (i) => BenchRow(next + i)), ...rows.skip(10)];
    next += 10;
    notifyListeners();
  }

  void update() {
    rows = [
      for (int i = 0; i < rows.length; i++)
        i % 10 == 0 ? BenchRow(rows[i].id, rows[i].value + 1) : rows[i],
    ];
    tick++;
    notifyListeners();
  }

  void filter(String value) {
    query = value;
    notifyListeners();
  }

  void burst(int hz) {
    if (![10, 30, 60].contains(hz)) throw ArgumentError.value(hz);
    _stop();
    active = true;
    notifyListeners();
    final generation = _generation;
    _clock
      ..reset()
      ..start();
    _timer = Timer.periodic(Duration(microseconds: (1000000 / hz).round()), (
      _,
    ) {
      if (generation != _generation) return;
      if (_clock.elapsedMilliseconds >= 2000) {
        stop();
        return;
      }
      update();
    });
  }

  void _stop() {
    active = false;
    _generation++;
    _timer?.cancel();
    _timer = null;
    _clock.stop();
  }

  void remount() {
    next = 0;
    replace(1000);
  }

  @override
  void dispose() {
    _stop();
    super.dispose();
  }
  void stop() {
    final wasActive = active;
    _stop();
    if (wasActive) notifyListeners();
  }
}
