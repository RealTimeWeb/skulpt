from pedal.sandbox.sandbox import Sandbox
from pedal.sandbox.messages import EXTENDED_ERROR_EXPLANATION

from pedal.report import MAIN_REPORT, Feedback

def _check_sandbox(report):
    if 'run' not in report['sandbox']:
        report['sandbox']['run'] = Sandbox()
    return report['sandbox']['run']

def run_student(raise_exceptions=False, report=None):
    if report is None:
        report = MAIN_REPORT
    sandbox = _check_sandbox(report)
    source_code = report['source']['code']
    sandbox.run(source_code)
    if raise_exceptions:
        raise_exception(sandbox.exception, report=report)
    return sandbox.exception

def queue_input(*inputs, **kwargs):
    if 'report' not in kwargs:
        report = MAIN_REPORT
    else:
        report = kwargs['report']
    sandbox = _check_sandbox(report)
    sandbox.set_input(inputs)

def reset_output(report=None):
    if report is None:
        report = MAIN_REPORT
    sandbox = _check_sandbox(report)
    sandbox.set_output(None)

def get_output(report=None):
    if report is None:
        report = MAIN_REPORT
    sandbox = _check_sandbox(report)
    return sandbox.output

def get_sandbox(report=None):
    if report is None:
        report = MAIN_REPORT
    sandbox = _check_sandbox(report)
    return sandbox

def raise_exception(exception, report=None):
    if report is None:
        report = MAIN_REPORT
    sandbox = _check_sandbox(report)
    if exception is None:
        return
    extended = EXTENDED_ERROR_EXPLANATION.get(exception.__class__, "")
    message = "<pre>{}</pre>\n{}".format(str(exception), extended)
    # Skulpt compatible name lookup
    name = str(exception.__class__)[8:-2]
    from utility import log, debug
    report.attach(name, category='Runtime', tool='Sandbox',
                  mistakes={'message': message, 'error': exception})
    log(report)
    debug(report)
    log(report.feedback)
    sandbox.exception = exception
