import json, tempfile, unittest
from pathlib import Path
from analyze import analyze, dist

class AnalysisTests(unittest.TestCase):
 def test_nearest_rank_p95(self):
  self.assertEqual(dist(list(range(1,21)))['p95'],19)
 def test_pairing_and_rejections(self):
  with tempfile.TemporaryDirectory() as temporary:
   root=Path(temporary)
   for tag,app,value,status in [('measured-03-cpp-direct-fresh','cpp',100,'passed'),('measured-03-rust-direct-fresh','rust',120,'passed'),('measured-04-rust-direct-fresh','rust',999,'failed')]:
    out=root/'runs'/tag;out.mkdir(parents=True)
    result={'status':status,'error':'rejected','config':{'app':app,'launch':'direct','scenario':'startup','output':str(out)},'launchToReadyMs':value,'hostToReadyMs':value,'hostToWindowMs':10,'stableCompleteObservedMs':value+1000,'launchRequestedMs':0}
    (out/'result.json').write_text(json.dumps(result));(out/'frames.json').write_text('[]')
   report=analyze(root);row=next(x for x in report['startup'] if x['app']=='rust')
   self.assertEqual(row['pairedMedianDeltaVsCppMs'],20);self.assertEqual(row['launchToReadyMs']['n'],1);self.assertEqual(len(report['failed']),1)
 def test_idle_replication_unit_is_lifetime(self):
  with tempfile.TemporaryDirectory() as temporary:
   root=Path(temporary)
   for index,value in enumerate([100,120]):
    out=root/'runs'/f'resources-{index}-cpp';out.mkdir(parents=True)
    config={'app':'cpp','output':str(out),'scenario':'idle','idleOrder':['visible'],'idleSeconds':3}
    (out/'result.json').write_text(json.dumps({'config':config,'status':'passed'}))
    rows=[{'state':'visible','complete':True,'atMs':i*1000,'privateWorkingSetBytes':value*2**20,'privateBytes':200*2**20,'processes':[{'pid':1,'startUtc':'same','cpuSeconds':i*.01}]} for i in range(3)]
    (out/'resources.json').write_text(json.dumps(rows))
   row=analyze(root)['idle'][0]
   self.assertEqual(row['privateResidentMiB']['n'],2);self.assertEqual(row['privateResidentMiB']['median'],110)
if __name__=='__main__':unittest.main()
