"""Fictional isolated NRI read classification, no live stores or calls."""
import os,sys,pathlib,unittest
from unittest.mock import patch
os.environ['APP_ENV']='test';os.environ['ENV']='test'
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from test_storage import isolate_test_stores
isolate_test_stores('nri-explicit-truth')
import hardening,main
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
if __name__=='__main__':unittest.main()
