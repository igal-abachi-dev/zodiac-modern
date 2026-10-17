import unittest
from analyze import distribution, paired_interval, visual_summary, validate_idle

class AnalysisTests(unittest.TestCase):
    def test_nearest_rank_and_small_groups(self):
        result=distribution(list(range(1,21)))
        self.assertEqual(result['median'],10.5)
        self.assertEqual(result['p95'],19)
        self.assertIsNone(distribution([])['median'])
        self.assertIsNone(distribution([4])['stdev'])

    def test_paired_constant_difference(self):
        self.assertEqual(paired_interval([7]*20),[7,7])
        self.assertIsNone(paired_interval([7]))

    def test_visual_gaps_and_regressions(self):
        def frame(i,kind): return {'index':i,'startMs':i*100,'capturedMs':i*100+10,'classification':kind}
        result=visual_summary([frame(0,'near-white'),frame(1,'near-white'),frame(2,'accent-content'),
                               {'index':3,'skipped':'not-foreground'},frame(4,'near-black'),frame(5,'accent-content')])
        self.assertEqual(result['nearUniformIntervals'][0]['observedSpanMs'],100)
        self.assertEqual(result['nearUniformIntervals'][1]['observedSpanMs'],0)
        self.assertEqual(result['nearUniformAfterAccentCount'],1)
        self.assertEqual(result['firstAccentObservedMs'],210)

    def test_idle_cannot_pass_with_an_exited_or_reused_host(self):
        result={'hostPid':10,'hostStartUtc':'root-time','config':{'idleSeconds':1}}
        samples=[{'state':state,'atMs':i,'processes':[{'pid':10,'startUtc':'root-time'}]} for i,state in enumerate(['visible','unfocused','occluded','minimized','restored'])]
        self.assertEqual(validate_idle(result,samples),[])
        samples[-1]['processes']=[]
        self.assertIn('live host identity missing',validate_idle(result,samples)[0])
        samples[-1]['processes']=[{'pid':10,'startUtc':'reused-pid'}]
        self.assertIn('live host identity missing',validate_idle(result,samples)[0])

if __name__=='__main__': unittest.main()
