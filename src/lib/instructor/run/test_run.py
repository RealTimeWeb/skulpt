from run import run_code
from textwrap import dedent

import sys
import unittest

class TestCode(unittest.TestCase):
    def setUp(self):
        pass
        
    def test_normal_run(self):
        result = run_code('a=0\nprint(a)')
        self.assertIn('a', result.variables)
        self.assertEqual(result.variables['a'], 0)
        self.assertEqual(len(result.output), 1)
        self.assertIn('0', result.output[0])
    
    def test_input(self):
        result = run_code('b = input("Give me something:")\nprint(b)',
                          _inputs=['Hello World!'])
        self.assertIn('b', result.variables)
        self.assertEqual(result.variables['b'], 'Hello World!')
                     
    def test_oo(self):
        # Load the "bank.py" code
        student_code = dedent('''
            class Bank:
                def __init__(self, balance):
                    self.balance = balance
                def save(self, amount):
                    self.balance += amount
                    return self.balance > 0
                def take(self, amount):
                    self.balance -= amount
                    return self.balance > 0''')
        student = run_code(student_code, _as_filename='bank.py')
        # Check that we created the class
        self.assertIn('Bank', student.variables)
        # Now let's try making an instance
        student.run('Bank', 50, _target='bank')
        self.assertIsInstance(student.variables['bank'], student.variables['Bank'])
        # Can we save money?
        student.run('bank.save', 32)
        self.assertTrue(student._)
        # What about extracting money?
        student.variables['bank'].balance += 100
        student.run('bank.take', 100)
        self.assertTrue(student._)

if __name__ == '__main__':
    unittest.main(buffer=False)