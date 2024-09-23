import re

exclude_patterns = [
    re.compile(r'.*jquery.*', re.IGNORECASE),
]

path_keywords = [
    'contact', 'about', 'help',
    'support', 'welcome'
]
