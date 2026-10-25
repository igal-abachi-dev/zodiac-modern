import 'package:flutter_test/flutter_test.dart';
import 'package:neutronstar_flutter/domain.dart';

void main() {
  test('workflow elapsed progress, cancellation and stale generations', () {
    final flow = Workflow();
    flow.start('encrypt');
    expect(flow.running, false);
    flow.loaded();
    flow.start('encrypt');
    final generation = flow.generation;
    flow.advance(generation, 500);
    expect(flow.progress, 25);
    flow.advance(generation, 200);
    expect(flow.progress, 25);
    flow.cancel();
    flow.advance(generation, 2000);
    expect(flow.phase, 'canceled');
    flow.reset();
    expect(flow.progress, 0);
    flow.start('decrypt');
    flow.advance(flow.generation, 2000);
    expect(flow.status, 'Simulation complete. No file was changed.');
    flow.dispose();
  });
  test('keyed deterministic list contract and remount', () {
    final list = Workload();
    expect(list.rows.length, 1000);
    expect(list.rows.first.id, 0);
    list.replace(10000);
    expect(list.rows.first.id, 1000);
    list.replace(1000);
    list.reverse();
    expect(list.rows.first.id, 11999);
    list.splice();
    expect(list.rows.first.id, 12000);
    list.update();
    expect(list.rows.first.value, 1);
    expect(list.tick, 1);
    list.filter('row-12000 ');
    expect(list.visible.length, 1);
    list.filter('ROW-');
    expect(list.visible, isEmpty);
    list.remount();
    expect(list.next, 1000);
    expect(list.tick, 0);
    expect(list.query, '');
    expect(() => list.replace(10001), throwsRangeError);
    list.dispose();
  });
  testWidgets('timer stops on reset and dispose', (tester) async {
    final flow = Workflow()
      ..loaded()
      ..start('encrypt');
    await tester.pump(const Duration(milliseconds: 100));
    flow.reset();
    await tester.pump(const Duration(seconds: 3));
    expect(flow.status, 'Ready');
    expect(flow.progress, 0);
    flow.dispose();
    final list = Workload()..burst(60);
    expect(list.active, true);
    await tester.pump(const Duration(milliseconds: 100));
    final tick = list.tick;
    expect(tick, greaterThan(0));
    list.stop();
    expect(list.active, false);
    await tester.pump(const Duration(seconds: 3));
    expect(list.tick, tick);
    list.dispose();
  });
}
