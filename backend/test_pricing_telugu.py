"""Public Telugu catalogue wording must not change credit or pricing rules."""
import ast
from pathlib import Path
import re
import unittest


def catalogue():
    tree = ast.parse(Path(__file__).with_name('interest.py').read_text())
    return {node.target.id: ast.literal_eval(node.value) for node in tree.body
            if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name)
            and node.target.id in {'PLANS', 'ADDONS', 'RENEWALS'}}


class PricingTeluguTests(unittest.TestCase):
    def test_prices_counts_and_expiry_are_unchanged(self):
        plans = catalogue()['PLANS']
        for code, expected in {'FREE': (0, 3, 365), 'S_99': (99, 5, 30),
                               'S_199': (199, 12, 45), 'S_299': (299, 25, 60),
                               'S_499': (499, 50, 90), 'BUREAU_999': (999, 25, 30),
                               'BUREAU_2999': (2999, 100, 30)}.items():
            with self.subTest(code=code):
                plan = plans[code]
                self.assertEqual(tuple(plan[k] for k in ('price', 'profiles', 'validity_days')), expected)
                self.assertIn(str(expected[1]), plan['telugu'])

    def test_telugu_descriptions_have_no_english_sentences(self):
        for group in catalogue().values():
            for code, item in group.items():
                for text in [item['telugu'], *item.get('perksTe', [])]:
                    with self.subTest(code=code, text=text):
                        self.assertIsNone(re.search('[A-Za-z]', text))

    def test_contact_requires_acceptance_and_refund_terms_remain(self):
        plans = catalogue()['PLANS']
        for code in ('S_99', 'S_199', 'S_299', 'S_499'):
            text = ' '.join(plans[code]['perksTe'])
            self.assertIn('అంగీకరించాక', text)
            self.assertIn('అంగీకరించిన అభ్యర్థన వద్ద', text)
            self.assertIn('వాపసు నిబంధనలు', text)
        self.assertIn('హామీ లేదు', catalogue()['ADDONS']['VERIFY_199']['telugu'])

    def test_addon_and_renewal_rules_are_unchanged(self):
        data = catalogue()
        self.assertEqual([(x['price'], x['days']) for x in data['ADDONS'].values()], [(49, 1), (49, 30), (199, 0)])
        renewal = data['RENEWALS']['RENEW_99']
        self.assertEqual((renewal['price'], renewal['profiles'], renewal['validity_days']), (99, 8, 30))
        self.assertIn('అభ్యర్థనలు', renewal['telugu'])


if __name__ == '__main__':
    unittest.main()
