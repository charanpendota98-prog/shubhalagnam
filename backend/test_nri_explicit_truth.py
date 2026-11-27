"""Fictional isolated NRI read classification, no live stores or calls."""
import os,sys,pathlib,unittest
from unittest.mock import patch
os.environ['APP_ENV']='test';os.environ['ENV']='test'
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from test_storage import isolate_test_stores
isolate_test_stores('nri-explicit-truth')
import hardening,main,quality,enterprise_sql,channels_config
import json
class NriTruth(unittest.TestCase):
 def test_parser_matches_write_true_values(self):
  for value in [True,1,'true',' TRUE ','yes','on','Y','1']:
   with self.subTest(value=value):self.assertTrue(hardening.is_explicit_true(value));self.assertTrue(hardening.req_bool_strict(value,'is_nri'))
 def test_false_invalid_never_select_stored_flag(self):
  for value in [False,0,'false','no','off','N','0','',None,2,{},[],['yes'],'<img src=x onerror=alert(1)>']:
   with self.subTest(value=value),patch.object(main.MP,'detect_nri',return_value={'is_nri':False}):
    self.assertFalse(hardening.is_explicit_true(value));self.assertFalse(main._is_nri({'is_nri':value,'country':'India'}))
 def test_positive_and_country_inference_preserved(self):
  for value in [True,1,'yes','ON','y','true']:
   with self.subTest(value=value),patch.object(main.MP,'detect_nri',return_value={'is_nri':False}):self.assertTrue(main._is_nri({'is_nri':value}))
  for value in [False,'false','no',None]:
   with self.subTest(value=value),patch.object(main.MP,'detect_nri',return_value={'is_nri':True}):self.assertTrue(main._is_nri({'is_nri':value,'country':'USA'}))
 def test_every_stored_flag_reader_agrees(self):
  values=[True,False,1,0,1.0,2,None,{},[],['yes'],'true',' TRUE ','yes','on','Y','1','false','no','off','N','0','', '\ufefftrue\ufeff','\x85true\x85','\x1ctrue\x1c','ＴＲＵＥ','<img src=x onerror=alert(1)>']
  for value in values:
   expected=hardening.is_explicit_true(value)
   with self.subTest(value=value),patch.object(main.MP,'detect_nri',return_value={'is_nri':False}),patch.object(quality,'detect_nri',return_value={'is_nri':False}),patch.object(channels_config,'is_public_channel',return_value=True),patch.object(channels_config,'channel_chat_id',return_value='@fictional_test'):
    user={'tsap_id':'FICTIONAL-NRI','status':'approved','age':29,'state':'TS','country':'India','is_nri':value}
    self.assertEqual(main._is_nri(user),expected)
    self.assertEqual(quality.matches_filters(user,{'nri_only':True}),expected)
    enterprise_sql.rebuild_search_projection([user],lambda _: (0,0))
    conn=enterprise_sql.IDENTITY_REPO._connect()
    try:self.assertEqual(bool(conn.execute('SELECT is_nri FROM search_projection').fetchone()[0]),expected)
    finally:conn.close()
    self.assertEqual('nri_global' in channels_config.route_profile(user,max_posts=100)['keys'],expected)
 def test_float_boundary_and_unicode(self):
  self.assertFalse(hardening.is_explicit_true(1.0))
  with self.assertRaises(Exception):hardening.req_bool_strict(1.0,'is_nri')
  self.assertFalse(hardening.is_explicit_true('\ufefftrue\ufeff'))
  for char in ['\x85','\x1c','\x1d','\x1e','\x1f']:
   self.assertTrue(hardening.is_explicit_true(char+'true'+char))
if __name__=='__main__':unittest.main()
