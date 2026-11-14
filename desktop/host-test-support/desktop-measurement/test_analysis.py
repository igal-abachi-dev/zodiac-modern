import json, tempfile, unittest
from pathlib import Path
import analyze

def make(folder, tag, **fields):
    d = Path(folder) / 'runs' / tag; d.mkdir(parents=True); (d / 'result.json').write_text(json.dumps(fields))

class AnalysisTests(unittest.TestCase):
    def test_distribution_nearest_rank(self):
        d = analyze.dist(list(range(1, 21)))
        self.assertEqual((d['n'], d['median'], d['p95'], d['min'], d['max']), (20, 10.5, 19, 1, 20))
    def test_failures_are_retained_not_summarized(self):
        with tempfile.TemporaryDirectory() as t:
            make(t, 'measured-00-tauri-retained', status='passed', visualReadyMs=100, windowVisibleMs=10)
            make(t, 'measured-01-tauri-retained', status='failed', error='boom')
            r = analyze.analyze(t)
            self.assertEqual(r['totalAttempts'], 2); self.assertEqual(len(r['failed']), 1)
            self.assertEqual(r['startup'][0]['n'], 1)
    def test_paired_delta_matches_round_index(self):
        with tempfile.TemporaryDirectory() as t:
            for i in range(3):
                make(t, f'measured-{i:02d}-tauri-retained', status='passed', visualReadyMs=100 + i)
                make(t, f'measured-{i:02d}-qt-default', status='passed', visualReadyMs=300 + i)
            qt = [e for e in analyze.analyze(t)['startup'] if e['variant'] == 'qt'][0]
            self.assertEqual(qt['visualReadyPairedDeltaVsTauriMs']['median'], 200)
    def test_missing_metric_is_not_zero(self):
        self.assertEqual(analyze.dist([None, None]), {'n': 0})
if __name__ == '__main__': unittest.main()
